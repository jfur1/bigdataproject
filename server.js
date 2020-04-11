const express = require('express');
const pgp = require('pg-promise')();
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const expressLayouts = require('express-ejs-layouts');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const { ensureAuthenticated, forwardAuthenticated } = require('./resources/auth');

const app = express();

// Passport Config
passport.use(
    new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
        console.log('Made it to auth!');

        // Match User
        db.tx(t => {
            return t.oneOrNone('SELECT * FROM users WHERE \'' + email + '\' = user_email;');
        })
        .then((user) => {
            if (!user) {
            console.log('Wrong email!');
            return done(null, false, { message: 'That email is not registered' });
            }

            //Check if user has verified their account via email
            // if(!user.verified){
            //     console.log("Confirm Email to Login"); // User has not verified email
            //     return done(null, false, { message: 'That email is not verified' });
            // }

            // Match Password
            bcrypt.compare(password, user.user_password, (err, isMatch) => {
                if (err) {
                    throw err;
                }

                if (isMatch) {
                    console.log('Made it past username and password checks!');
                    return done(null, user);
                } else {
                    console.log('Wrong password!');
                    return done(null, false, { message: 'Password incorrect' });
                }
            });
        })
        .catch((error) => {
            console.log(error);
        });
    
}));

// Passport Serialize/Deserialize
passport.serializeUser((user, done) => {
    done(null, user.user_id);
});

passport.deserializeUser((id, done) => {
    db.tx(t => {
        return t.one('SELECT * FROM users WHERE \'' + id + '\' = user_id;');
    })
    .then((res) => {
        done(null, res);
    })
    .catch((err) => {
        console.log(err);
    });
});

// Connect to database
const db_init = {
    host: 'big-data-project.cyxo9dxpukfl.us-east-2.rds.amazonaws.com',
    port: 5432,
    database: 'postgres',
    user: 'bigdatamaster',
    password: 'BigData1'
};
const db = pgp(db_init);

// EJS
app.set('view engine', 'ejs');
app.use(expressLayouts);

// Body-parser
app.use(express.urlencoded({ extended: false}));

// Express session
app.use(
    session({
      secret: 'secret',
      resave: true,
      saveUninitialized: true
    })
  );
  
  // Passport middleware
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Connect flash
  app.use(flash());
  
  // Global variables
  app.use(function(req, res, next) {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
  });

// Routes //

// Splash Page
app.get('/', (req, res) => {
    res.render(('pages/home'), {
        my_title: 'Splash Page'
    });
});

// Home Page
app.get('/home', (req, res) => {
    res.render(('pages/home'), {
        my_title: 'Home Page'
    });
});

// Registration Page
app.get('/registration', (req, res) => {
    res.render(('pages/registration'), {
        my_title: 'Registration Page'
    });
});

// Registration Handler
app.post('/registration', (req, res) => {
    const {
        first_name,
        last_name,
        email,
        password,
        password2
    } = req.body;

    let errors = [];

    // Check required fields
    if(!first_name || !last_name || !email || !password || !password2){
        errors.push({msg: 'Please fill in all fields.'});
    }
    // Check passwords match
    if(password !== password2){
        errors.push({msg: 'Passwords do not match.'});
    }
    // Check password length
    if(password.length < 6){
        errors.push({msg:'Password should be at least 6 characters.'});
    }
    if(errors.length > 0){
        res.render('pages/registration', {
            errors,
            first_name,
            last_name,
            email,
            password,
            password2
        });
    } else{
        // Check if user exists in database
        db.tx(t => {
            return t.oneOrNone('SELECT * FROM users WHERE \'' + email + '\' = user_email;');
        })
        .then((data) => {
            if (data !== null) {
                console.log('Email already taken.')
                errors.push({ msg: 'Email already taken!' });
                return res.render('pages/registration', {
                    errors,
                    first_name,
                    last_name,
                    email,
                    password,
                    password2
                });
            } else {
                // Store new user
                db.tx(t => {
                    return t.one('SELECT MAX(user_id) FROM users;');
                }).then((data) =>{
                    let new_user_id = data.max;
                    new_user_id++;
                    // Hash Password
                    bcrypt.genSalt(12, (err, salt) => {
                        bcrypt.hash(password, salt, (err, hash) => {
                            if (err) throw err;
                            // Set password to hashed version
                            let hashedPassword = hash;
                            console.log('Generated hashed password: ');
                            console.log(hashedPassword);
                            db.tx(user => {
                                console.log('Storing hashed password: ');
                                console.log(hashedPassword);
                                return user.none('INSERT INTO users(user_id, user_first_name, user_last_name, user_email, user_password, verified) VALUES($1, $2, $3, $4, $5, $6)',
                                [
                                    new_user_id,
                                    first_name,
                                    last_name,
                                    email,
                                    hashedPassword,
                                    false
                                ])
                                .then(t => {
                                    console.log('User stored in the database.');
                                    req.flash(
                                        'success_msg',
                                        'You are now registered and can log in!'
                                    );
                                    return res.redirect('/login');
                                }).catch((err) => {console.log(err)});
                            }).catch((err) => {console.log(err)});
                        });
                    })
                }).catch((err) => {console.log(err)});
            }        
        }).catch((err) => {console.log(err)});
    }
});

// Login Page
app.get('/login', (req, res) => {
    res.render('pages/login', {
        my_title: 'Login Page'
    });
});

// Login Handler
app.post('/login', (req, res, next) => {
    const { email } = req.body;
    let errors = [];
    db.tx(t => {
        return t.oneOrNone('SELECT * FROM users WHERE \'' + email + '\' = user_email;');
    })
    .then((data) => {
         if (data == null) {
                errors.push({msg: 'Email is not registered.'});
                res.render('pages/login', {
                    errors
                });
        } else {
            passport.authenticate('local', {
                successRedirect: '/dashboard',
                failureRedirect: '/login',
                failureFlash: true
            })(req, res, next);
        }
    })
    .catch(err => {
      console.log(err);
    });
});

// Logout
app.get('/logout', (req, res) => {
    req.logout();
    req.flash('success_msg', 'You are logged out');
    res.redirect('/login');
});

// User Dashboard -- Protected Access via Passport-Sessions()
app.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.render('pages/dashboard', {
        name: req.user.user_first_name
    });
});

app.get('/reset', (req, res) => {
    res.render('pages/reset');
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, console.log('Server started on port ' + PORT));
