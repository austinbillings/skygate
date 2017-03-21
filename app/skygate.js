const zaq = require('zaq');
const _ = require('underscore');
const uid = require('node-uuid');
const crypto = require('crypto');
const jawn = require('node-jawn');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const Lex = require('./lex.js');

const skygate = function (config) {
  config = _.defaults(config, {
    users: null,
    mode: 'id',    
    algo: 'sha256',
    cookieName: '_AuthToken',
    maxAttempts: 10,
    maxAge: 3 * 60 * 60 * 1000,
    exposableUserKeys: ['id', 'email'],
    tests: {
      id: /^[a-zA-Z0-9_-]{3,40}$/,
      name: /^[a-zA-Z ]{1,40}$/,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      pass: /^[a-zA-Z0-9!@#`~%^&?_-]{10,36}$/
    }
  });
  
  let app = {
    users: config.users,
    live: {
      sessions: [],
      attempts: {}
    }
  }
  
  //-===========================================================================
  
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
  }
  
  app.warn = (req, warning) => {
    if (!req.warnings || !req.warnings.length) req.warnings = [];
    req.warnings.push(warning);
  }
  
  //-===========================================================================
  // Getters
  
  app.getIpAddress = (req) => {
    return req ? req.headers['x-forwarded-for'] || req.connection.remoteAddress : null;
  }
  
  app.getToken = (req) => {
    return req && req.cookies && req.cookies[config.cookieName] ? req.cookies[config.cookieName] : false;
  }
  
  app.getSession = (token) => {
    return _.findWhere(app.live.sessions, { token })
  }
  
  app.getUserById = (id) => {
    return _.findWhere(app.users, { id });
  }
  
  app.getUserByToken = (token) => {
    let session = app.getSession(token);
    return (session && session.user && session.user.id) ? app.getUserById(session.user.id) : null;
  }
  
  app.getUser = (req) => {
    if (!app.isLoggedIn(req)) return null;
    return app.getUserByToken(app.getToken(req));
  }
  
  app.vetUser = (user) => {
    return _.pick(user, ...config.exposableUserKeys);
  }
  
  //-===========================================================================
  // Status
  
  app.isLoggedIn = (req) => {
    let token = app.getToken(req);
    let session = app.getSession(token);
    return (token && session ? true : false);
  }
  
  app.echoStatus = (req, res) => {
    res.send({
      loggedIn: app.isLoggedIn(req),
      user: app.vetUser(app.getUser(req))
    });
  }
  
  //-===========================================================================
  // Middleware
  
  app.requireLoggedIn = (req, res, next) => {
    let code = 401;
    let token = app.getToken(req);
    let message = Lex.Unauthorized;
    return app.isLoggedIn(req) ? next() : app.fail(req, res, { code, token, message });
  }
  
  app.registerAuthAttempt = (req, res, next) => {
    let ip = app.getIpAddress(req);
    let count = _.has(app.live.attempts, ip) ? app.live.attempts[ip] : (app.isLoggedIn(req) ? -1 : 0);
    
    req.authAttempts = app.live.attempts[ip] = count + 1;
    next();
  }
  
  app.updateToken = (req, res, next) => {
    let maxAge = config.maxAge;
    let token = app.getToken(req);
    if (!token) return;
    
    let session = app.getSession(token);
    if (!session) maxAge = 1;
    
    res.cookie(config.cookieName, token, { maxAge });
    next && next();
  }
  
  app.newSession = (req, res, rawUser) => {
    let token = uid.v4();
    let success = true;
    let maxAge = config.maxAge;
    let ip = app.getIpAddress(req);
    let user = app.vetUser(rawUser);
    
    let payload = { user, ip, success };
    let session = { user, ip, token };
    
    app.live.sessions.push(session);
    zaq.win('Session started', token);
    zaq.info('Current sessions', app.live.sessions);
    res.cookie(config.cookieName, token, { maxAge });
    res.send(payload);
  }
  
  app.killSession = (token) => {
    app.live.sessions = _.reject(app.live.sessions, { token });
  }
  
  //-===========================================================================
  
  app.attemptAuthentication = (input) => {
    return new Promise(function (resolve, reject) {
      let { id, pass, email } = input;
      
      if (!_.isObject(input)) reject(Lex.NoInput);
      
      var match;
      switch (config.mode) {
        case 'id': 
          if (!_.isString(id)) reject(Lex.NoUserId);
          match = { id };
          break;
        case 'email':
          if (!_.isString(email)) reject(Lex.NoEmail);
          match = { email };
          break;
      }
      
      if (!_.isString(pass)) reject(Lex.NoPass);
      
      let user = _.findWhere(app.users, match);
      if (!user) reject(Lex.BadUserOrPass);
      if (!app.checkUserPassword(pass, user)) reject(Lex.BadUserOrPass);
      
      resolve(user);
    });
  }
  
  app.checkUserPassword = (candidatePass, user) => {
    let { salt, pass } = user;
    
    let hash = crypto.createHash(config.algo)
      .update(candidatePass)
      .update(salt)
      .digest('hex');
      
    return hash === pass;
  }
  
  app.generateSalt = () => {
    return crypto.randomBytes(16).toString('hex');
  }
  
  //-===========================================================================
  
  app.login = (req, res) => {
    if (app.isLoggedIn(req)) {
      let message = Lex.AlreadyLoggedIn;
      let code = 409;
      app.fail(req, res, { message, code });
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
  }
  
  app.logout = (req, res) => {
    app.killSession(app.getToken(req));
    app.updateToken();
    app.echoStatus(req, res);
  }
  
  //-===========================================================================
  
  app.mount = (endpoint = '/') => {
    let router = new express.Router();
    
    router.use(cookieParser());
    router.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
    router.use(bodyParser.json({ limit: '50mb' }));
    
    router.get(endpoint, (req, res) => app.echoStatus(req, res));
    router.post(endpoint, (req, res) => app.login(req, res));
    router.delete(endpoint, (req, res) => app.logout(req, res));
    
    return router;
  }
  
  return app;
}

module.exports = skygate;