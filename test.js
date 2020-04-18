//var unirest = require('unirest');
var cov = require( 'compute-covariance' );


// var req = unirest("GET", 
// "https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v2/get-historical-data");

// req.query({
// "frequency": "1d",
// "filter": "history",
// "period1": "1546448400",
// "period2": "1562086800",
// "symbol": "amrn"
// });

// req.headers({
// "x-rapidapi-host": "apidojo-yahoo-finance-v1.p.rapidapi.com",
// "x-rapidapi-key": "3a6c5f19f5msh7f6a6a8ab33137dp1ff5c3jsnedbc4cb3b72b"
// });


// req.end(function (res) {
// if (res.error) throw new Error(res.error);

// // console.log(res.body.prices[0]);
// // console.log(res.body.prices[103]);


// });