const express = require('express');
const pgp = require('pg-promise')();
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const expressLayouts = require('express-ejs-layouts');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
var cov = require( 'compute-covariance' );
var unirest = require("unirest");
const math = require('mathjs');

const { ensureAuthenticated, forwardAuthenticated } = require('./resources/auth');
const {optimize, periodicReturns, htmlDateToUnixTimestamp, normalizeVectorLength, periodicPrices} = require('./resources/optimizer');
var Portfolio = require('./resources/optimizer');


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
                successRedirect: '/profile',
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

function renderChart(data, labels) {
    var ctx = document.getElementById("myChart").getContext('2d');
    var myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Efficient Frontier',
                data: data,
            }]
        },
    });
}

// User Dashboard -- Protected Access via Passport-Sessions()
app.get('/dashboard', ensureAuthenticated, (req, res) => {
    res.render('pages/dashboard', {
        name: req.user.user_first_name
    });
});

app.get('/profile', ensureAuthenticated, (req, res) => {
    res.render('pages/profile', {
        name: req.user.user_first_name
    });
});

app.get('/reset', (req, res) => {
    res.render('pages/reset');
});

// Optimization
app.get('/optimization', (req, res) => {
    res.render('pages/optimization');
});

app.get('/calculator', ensureAuthenticated, (req, res)=>{
    res.redirect('/optimization');
})

app.post('/calculator', ensureAuthenticated, (req, res, next) => {
    
    //strings, has no error for whether not it is an acceptable stock
    var stock1 = req.body.stock1;
    var stock2 = req.body.stock2;
    var stock3 = req.body.stock3;

    var startString = req.body.start;
    //unix timestamps
    var start = htmlDateToUnixTimestamp(req.body.start); 
    var end = htmlDateToUnixTimestamp(req.body.end);
    //html select element - string
    var period = req.body.period;
    //return turned from whole number between 0-100 into real percent
    var req_return_unformatted = req.body.req_return;
    var req_return = req_return_unformatted/100;
    //budget shouldnt need to be changed. no option for cents or anything yet but im looking into it
    var budget = req.body.budget;
    // Initialize return vectors
    var stock1_returns;
    var stock2_returns;
    var stock3_returns;
    var r_1, r_2, r_3, r;
    var p1, p2, p3;
    
    unirest("GET", "https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v2/get-historical-data")
        .headers({
            "x-rapidapi-host": "apidojo-yahoo-finance-v1.p.rapidapi.com",
            "x-rapidapi-key": "3a6c5f19f5msh7f6a6a8ab33137dp1ff5c3jsnedbc4cb3b72b"
        })
        .query({
            "frequency": period,
            "filter": "history",
            "period1": start,
            "period2": end,
            "symbol": stock1
        }).end(function (res1) {
            if (res1.error) throw new Error(res1.error);
            //console.log(res.body);
            //console.log(res1.body.prices[0])
            stock1_returns = res1.body.prices;
            unirest("GET", "https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v2/get-historical-data")
                .headers({
                    "x-rapidapi-host": "apidojo-yahoo-finance-v1.p.rapidapi.com",
                    "x-rapidapi-key": "3a6c5f19f5msh7f6a6a8ab33137dp1ff5c3jsnedbc4cb3b72b"
                })
                .query({
                    "frequency": period,
                    "filter": "history",
                    "period1": start,
                    "period2": end,
                    "symbol": stock2
                }).end(function (res2) {
                    if (res2.error) throw new Error(res2.error);
                    //console.log(res.body);
                    //console.log(res2.body.prices[0])
                    stock2_returns = res2.body.prices;
                    unirest("GET", "https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v2/get-historical-data")
                        .headers({
                            "x-rapidapi-host": "apidojo-yahoo-finance-v1.p.rapidapi.com",
                            "x-rapidapi-key": "3a6c5f19f5msh7f6a6a8ab33137dp1ff5c3jsnedbc4cb3b72b"
                        })
                        .query({
                            "frequency": period,
                            "filter": "history",
                            "period1": start,
                            "period2": end,
                            "symbol": stock3
                        }).end(function (res3) {
                            if (res3.error) throw new Error(res3.error);

                            stock3_returns = res3.body.prices;
                            
                            // Calculate expected returns vectors
                            r_1 = periodicReturns(stock1_returns);
                            r_2 = periodicReturns(stock2_returns);
                            r_3 = periodicReturns(stock3_returns);

                            // Get periodic prices
                            p1 = periodicPrices(stock1_returns);
                            p2 = periodicPrices(stock2_returns);
                            p3 = periodicPrices(stock3_returns);

                            // Make sure vectors are same length for covariance calculation
                            var r1r2 = normalizeVectorLength(r_1, r_2);
                            var r1r3 = normalizeVectorLength(r_1, r_3);
                            r_1 = r1r2[0];
                            r_2 = r1r2[1];
                            r_3 = r1r3[1];

                            // Calculate r_tilda -- the mean returns for each stock
                            r = math.mean([r_1, r_2, r_3], 1);
                            r = r.map(function(x) {return x * 100});
                            console.log("Mean Expected Return Vector (r): ", math.round(r,2), "%");
                            
                            // console.log("R1 Length: ", r_1.length);
                            // console.log("R2 Length: ", r_2.length);
                            // console.log("R3 Length: ", r_3.length);
                            var mat = cov(r_1, r_2, r_3);
                            //console.log("Covariance Matrix: ", mat);
                            
                            // Solve for optimal asset allocation distribution
                            var ans = optimize(mat, r, req_return);
                            ans = ans.map(function(x) {return x * 100});
                            console.log("Final Recommended Distribution: ", math.round(ans,2), "%");

                            // Return = return_i * allocation_i
                            var ret = math.dot(r, ans)
                            console.log("Expected Return: ", math.round(ret,2), "%");

                            // Standard Deviation '=' Risk
                            var risk = math.multiply(math.transpose(ans), mat, ans);
                            risk = risk**2;
                            console.log("Expected Risk: ", math.round(risk,2), "%");

                            //var std_dev = math.sqrt(math.diag(mat));

                            res.render('pages/dashboard', 
                                {name: req.user.user_first_name,
                                    name1: stock1, name2: stock2, name3: stock3,
                                    volatility: math.round(risk,2),
                                    exp_ret: math.round(ret,2),
                                    x1 : math.round(ans[0], 0),
                                    x2: math.round(ans[1], 0),
                                    x3: math.round(ans[2], 0),
                                    prices1: p1, prices2: p2, prices3: p3,
                                    start_date: startString, end_date: end, frequency: period
                                });
                        }); 
                });
        });
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, console.log('Server started on port ' + PORT));
