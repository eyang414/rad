'use strict'; // eslint-disable-line semi

const app = require('APP');
const {env} = app;
const debug = require('debug')(`${app.name}:auth`);
const passport = require('passport');

const User = require('APP/db/models/user');
const OAuth = require('APP/db/models/oauth');
const Order = require('APP/db/models/order');
const auth = require('express').Router(); // eslint-disable-line new-cap


/*************************
 * Auth strategies
 *
 * The OAuth model knows how to configure Passport middleware.
 * To enable an auth strategy, ensure that the appropriate
 * environment variables are set.
 *
 * You can do it on the command line:
 *
 *   FACEBOOK_CLIENT_ID=abcd FACEBOOK_CLIENT_SECRET=1234 npm start
 *
 * Or, better, you can create a ~/.$your_app_name.env.json file in
 * your home directory, and set them in there:
 *
 * {
 *   FACEBOOK_CLIENT_ID: 'abcd',
 *   FACEBOOK_CLIENT_SECRET: '1234',
 * }
 *
 * Concentrating your secrets this way will make it less likely that you
 * accidentally push them to Github, for example.
 *
 * When you deploy to production, you'll need to set up these environment
 * variables with your hosting provider.
 **/

// Facebook needs the FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET
// environment variables.
OAuth.setupStrategy({
  provider: 'facebook',
  strategy: require('passport-facebook').Strategy,
  config: {
    clientID: env.FACEBOOK_CLIENT_ID,
    clientSecret: env.FACEBOOK_CLIENT_SECRET,
    callbackURL: `${app.baseUrl}/api/auth/login/facebook`,
  },
  passport
});

// Google needs the GOOGLE_CLIENT_SECRET AND GOOGLE_CLIENT_ID
// environment variables.
OAuth.setupStrategy({
  provider: 'google',
  strategy: require('passport-google-oauth').OAuth2Strategy,
  config: {
    clientID: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${app.baseUrl}/api/auth/login/google`,
  },
  passport
});

// Github needs the GITHUB_CLIENT_ID AND GITHUB_CLIENT_SECRET
// environment variables.
OAuth.setupStrategy({
  provider: 'github',
  strategy: require('passport-github2').Strategy,
  config: {
    clientID: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
    callbackURL: `${app.baseUrl}/api/auth/login/github`,
  },
  passport
});

// Other passport configuration:
// Passport review in the Week 6 Concept Review:
// https://docs.google.com/document/d/1MHS7DzzXKZvR6MkL8VWdCxohFJHGgdms71XNLIET52Q/edit?usp=sharing
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(
  (id, done) => {
    debug('will deserialize user.id=%d', id);
    User.findById(id)
      .then(user => {
        if (!user) debug('deserialize retrieved null user for id=%d', id);
        else debug('deserialize did ok user.id=%d', id);
        done(null, user);
      })
      .catch(err => {
        debug('deserialize did fail err=%s', err);
        done(err);
      });
  }
);

// require.('passport-local').Strategy => a function we can use as a constructor, that takes in a callback
passport.use(new (require('passport-local').Strategy)(
  (email, password, done) => {
    debug('will authenticate user(email: "%s")', email);
    User.findOne({where: {email}})
      .then(user => {
        if (!user) {
          debug('authenticate user(email: "%s") did fail: no such user', email);
          return done(null, false, { message: 'Login incorrect' });
        }
        return user.authenticate(password)
          .then(ok => {
            if (!ok) {
              debug('authenticate user(email: "%s") did fail: bad password');
              return done(null, false, { message: 'Login incorrect' });
            }
            debug('authenticate user(email: "%s") did ok: user.id=%d', email, user.id);
            done(null, user);
          });
      })
      .catch(done);
  }
));

//On login eager load user data such as cart, orders.
auth.get('/whoami', (req, res, next) => {

  //get cart
  if (req.user) { // for logged in user
    console.log('get cart for user');
    return Order.scope('cartItems').findOne({ where: { status: 'processing', buyer_id: req.user.id }})
    .then(order => {
      res.status(200).send({user: req.user, cart: order});
    })
    .catch(next);
  } else { // for guest
    console.log('get guest cart', req.session.cart);
    res.send({cart: { order_items: req.session.cart }});
  }

});


// POST requests for local login:
auth.post('/login/local', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login'}), (req, res, next) => {
  console.log('login');
});

// GET requests for OAuth login:
// Register this route as a callback URL with OAuth provider
auth.get('/login/:strategy', (req, res, next) =>
  passport.authenticate(req.params.strategy, {
    scope: 'email',
    successRedirect: '/',
    // Specify other config here, such as "scope"
  })(req, res, next)
);

auth.post('/logout', (req, res, next) => {
  req.logout();
  res.redirect('/api/auth/whoami');
});

module.exports = auth;

