'use latest';

import express from 'express';
import { fromExpress } from 'webtask-tools';
import bodyParser from 'body-parser';
import stripe from 'stripe';

bodyParser.urlencoded();

var app = express();
app.use(bodyParser.urlencoded());

app.post('/payment', (req,res) => {
  var ctx = req.webtaskContext;
  var STRIPE_SECRET_KEY = ctx.secrets.STRIPE_SECRET_KEY;

  stripe(STRIPE_SECRET_KEY).charges.create({
    amount: req.query.amount,
    currency: req.query.currency,
    source: req.body.stripeToken, 
    description: req.query.description
  }, (err, charge) => {
    const status = err ? 400: 200;
    const message = err ? err.message: 'Payment done!';
    res.writeHead(status, { 'Content-Type': 'text/html' });
    return res.end(renderBody('<h1>' + message + '</h1>' + showBack()));
  });
});

// comment this to disable the test form
app.get('/', (req, res) => {
  var ctx = req.webtaskContext; 
  res.send(renderInputForm(ctx));
});

app.get('/button', (req, res) => {
  var ctx = req.webtaskContext; 
  res.send(renderPaymentButton(req, ctx));
});

function renderBody(body) {
  return `
    <html>
      <head>
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
        <style type="text/css">
          form input, form textarea {
            margin-bottom: 20px;
          }
          .container {
            text-align: center;
            margin-top: 50px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${body}
        </div>
    </hmll>
  `;
}

function renderInputForm(ctx) {
  return renderBody(`
          <h3>Paymeint Information:</h3>
          <form name="info" action="/stripe-payment/button" method="GET">
            <div class="form-group row justify-content-md-center">
              <div class="col-md-4 col-offset-4">
                <textarea class="form-control" name="description" placeholder="Payment description" required rows="3" cols="19"></textarea>
                  <div class="row">
                    <div class="col">
                      <div class="input-group mb-3">
                        <div class="input-group-prepend">
                          <span class="input-group-text">$</span>
                        </div>
                        <input type="number" name="amount" min="1" class="form-control" aria-label="Amount (to the nearest dollar)">
                        <div class="input-group-append">
                          <span class="input-group-text">.00</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
            <div class="row">
              <div class="col">
                <input id="submit" type="submit" value="Continue" class="btn btn-primary">
              </div>
            </div>
          </form>
  `);
}

function showBack() {
  return `<a href="/stripe-payment">Back to Payment Information</a>`;
}

function renderPaymentButton(req, ctx) {
  //change /webtaskio below to your task name
  return renderBody(`
      <h3>Proceed with Stripe</h3>
      <form action="/stripe-payment/payment?currency=USD&amount=${req.query.amount * 100}&description=${req.query.description}" method="POST">
        <script
          src="https://checkout.stripe.com/checkout.js" class="stripe-button"
          data-key="${ctx.secrets.STRIPE_PUBLISHABLE_KEY}"
          data-amount="${req.query.amount * 100}"
          data-name="Stripe.com"
          data-description="${req.query.description}"
          data-locale="auto">
        </script>
      </form>
      ${showBack()}
  `);
}

module.exports = fromExpress(app);  
