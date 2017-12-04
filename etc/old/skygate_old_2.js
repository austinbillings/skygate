const zaq = require('zaq');
const chalk = require('chalk');
const _ = require('underscore');
const uid = require('uuid');
const moment = require('moment');
const crypto = require('crypto');
const jawn = require('node-jawn');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const Lex = require('./lex.js');

const skygate = function (config = {}) {
  app.fail = (req, res, info, ...loggables) => {
    let ip = app.getIpAddress(req);
    info = _.defaults(info, {
      message: Lex.GenericError,
      success: false,
      warnings: req.warnings && req.warnings.length ? req.warnings : [],
      code: 400
    });
    app.updateToken();
    res.status(info.code).send(info);
    zaq.err(info.message, `IP: ${ip}`);
    if (loggables) _.each(loggables, zaq.obj);
  };
  //-===========================================================================
  // Middleware

  //-===========================================================================

  app.attemptAuthentication = (input) => {
    return new Promise(function (resolve, reject) {
      let { id, pass, email } = input;

      if (!_.isObject(input)) reject(Lex.NoInput);

      var match;
      switch (config.mode) {
        case 'id':
          if (!_.isString(id)) reject(Lex.NoUserId);
          id = id.toLowerCase();
          match = { id };
          break;
        case 'email':
          if (!_.isString(email)) reject(Lex.NoEmail);
          email = email.toLowerCase();
          match = { email };
          break;
      }

      if (!_.isString(pass)) reject(Lex.NoPass);

      let user = _.findWhere(app.users, match);
      if (!_.isObject(user)) reject(Lex.BadUserOrPass);

      if (!app.checkUserPassword(pass, user)) reject(Lex.BadUserOrPass);

      resolve(user);
    });
  };

  app.checkUserPassword = (candidatePass, user) => {
    let { salt, pass } = user;
    let hash = crypto.createHash(config.algo)
      .update(candidatePass)
      .update(salt)
      .digest('hex');
    return hash === pass;
  };

  app.generateSalt = () => {
    return crypto.randomBytes(16).toString('hex');
  };

  //-===========================================================================

  app.login = (req, res) => {
    if (app.isLoggedIn(req)) {
      let message = Lex.AlreadyLoggedIn;
      let code = 409;
      return app.fail(req, res, { message, code });
    }
    if (req.authAttempts >= config.maxAttempts) {
      let message = Lex.MaxAttemptsReached;
      let code = 429;
      return app.fail(req, res, { message, code });
    }
    return app.attemptAuthentication(req.body).then(
      user => app.newSession(req, res, user),
      err => app.fail(req, res, { message: err })
    );
  };

  app.logout = (req, res) => {
    app.killSession(app.getToken(req));
    app.updateToken();
    app.echoStatus(req, res);
  };

  //-===========================================================================

  app.mount = (endpoint = '/') => {
    let router = new express.Router();
    let secret = crypto.randomBytes(32).toString('hex');

    router.use(cookieParser(secret));
    router.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
    router.use(bodyParser.json({ limit: '50mb' }));

    router.get(endpoint, (req, res) => app.echoStatus(req, res));
    router.post(endpoint, (req, res) => app.login(req, res));
    router.delete(endpoint, (req, res) => app.logout(req, res));

    return router;
  };

  return app;
};

module.exports = skygate;
