const express = require('express');
const pgp = require('pg-promise')();

const app = express();

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
app.use(express.static('public'));

// Body-parser
app.use(express.urlencoded({ extended: false}));



// Routes //

// Splash Page
app.get('/', (req, res) => {
    res.render(('pages/splash'), {
        my_title: 'Splash Page'
    });
});

// Home Page
app.get('/home', (req, res) => {
    res.render(('pages/home'), {
        my_title: 'Home Page'
    });
});

// Login Page
app.get('/login', (req, res) => {
    res.render('pages/login', {
        my_title: 'Login Page'
    });
});

// Need to fix this login method and get flash to work
app.post('/login', (req, res, next) => {
    const { email } = req.body;

    db.tx(t => {
        return t.oneOrNone('SELECT user_first_name FROM users WHERE \'' + email + '\' = user_email;');
    })
    .then((data) => {
         if (data == null) {
                console.log('Could not find a matching email.')
                res.render('pages/home');
        } else {
            console.log('Email verified via AWS instance. User Name: ', data.user_first_name);
            return res.redirect('/calculator');
        }
    })
    .catch(err => {
      console.log(err);
    });
});

app.get('/calculator', (req, res) => {
    res.render('pages/calculator', {
        my_title: 'Calculator'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, console.log('Server started on port ' + PORT));
