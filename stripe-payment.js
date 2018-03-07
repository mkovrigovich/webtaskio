'use latest';

import express from 'express';
import { fromExpress } from 'webtask-tools';
import bodyParser from 'body-parser';
import stripe from 'stripe';
//const express = require('express');
//const bodyParser = require('body-parser');
//const stripe = require('stripe');
bodyParser.urlencoded();

var app = express();
app.use(bodyParser.urlencoded());

app.post('/payment', (req,res) => {
  var ctx = req.webtaskContext;
  const monthly = req.query.monthly;
  var STRIPE_SECRET_KEY = ctx.secrets.STRIPE_SECRET_KEY;

  if (monthly === "1") {
    let resolvedPlan, resolvedCustomer;

    const error = message => res.end(renderBody(`<h1 class="alert alert-danger" role="alert">${message}</h1>` + showBack()));

    const plan = stripe(STRIPE_SECRET_KEY).plans.create({
      product: {name: `${req.query.description}`},
      currency: 'usd',
      interval: 'month',
      nickname: `${req.query.description}_${Date.now()}`,
      amount: req.query.amount,
    }, function(err, plan) {
      if (err) return error('Step #1 Plan' + err)
      //resolvedPlan = plan;
      stripe(STRIPE_SECRET_KEY).customers.create({
        email: req.query.email,
      }, function(err, customer) {
        if (err) return error('Step #2 Customer' + err)
        stripe(STRIPE_SECRET_KEY).subscriptions.create({
          source: req.body.stripeToken,
          customer: customer.id,
          items: [{plan: plan.id}],
        }, function(err, subscription) {
          if (err) return error('Step #3 Subscription' + err);
          return res.end(renderBody('<h1 class="alert alert-success" role="alert">Success</h1>' + showBack()));
        });
      });

    })

  } else {
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
  }
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
          <h3>Payment Information:</h3>
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
                        <input type="number" name="amount" min="1" class="form-control" aria-label="Amount (to the nearest dollar)" required placeholder="Amount">
                        <div class="input-group-append">
                          <span class="input-group-text">.00</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <input type="email" name="email" class="form-control" aria-label="Email" placeholder="Email" required>
                </div>
            </div>
            <div class="row">
              <div class="col">
                <input id="submit" type="submit" name="payonce" value="Continue One Time" class="btn btn-primary">
                <input id="submit-monthly" type="submit" name="paymonthly" value="Monthly Subscription" class="btn btn-success">
              </div>
            </div>
          </form>
  `);
}

function showBack() {
  return `<a href="/stripe-payment">Back to Payment Information</a>`;
}

function renderPaymentButton(req, ctx) {
  //change /stripe-payment below to your task name
  const isSubscription = req.query.paymonthly !== undefined;
  const description = (isSubscription ? 'Monthly - ' : '') + req.query.description;
  return renderBody(`
      <h3>Proceed with Stripe</h3>
      <form action="/stripe-payment/payment?currency=USD&amount=${req.query.amount * 100}&description=${description}${isSubscription ? '&monthly=1' : ''}&email=${req.query.email}" method="POST">
        <script
          src="https://checkout.stripe.com/checkout.js" class="stripe-button"
          data-key="${ctx.secrets.STRIPE_PUBLISHABLE_KEY}"
          data-amount="${req.query.amount * 100}"
          data-name="Stripe.com"
          data-email="${req.query.email}"
          data-description="${description}"
          data-locale="auto">
        </script>
      </form>
      ${showBack()}
  `);
}

module.exports = fromExpress(app);
//module.exports = app;
