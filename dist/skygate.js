'use strict';

var express = require('express');
var zaq = require('zaq');
var lex = require('./app/lex.js');

var users = require('./config/users.json');
var skygate = require('./app/skygate.js')({ users: users, cookieName: '_SkyGateAuthToken' });

var app = express();
var port = 1919;
var live = __dirname + '/demo';

app.use('/session', skygate.mount());
app.use('/', express.static(live));
app.listen(port);

zaq.win(lex.ServerOk);
zaq.info('Running on ' + port);
'use strict';

module.exports = {
  ServerOk: 'SkyGate Server Initialized',
  ServerFail: 'SkyGate Server Failed to Start',

  GenericError: 'An unknown error occurred.',
  Unauthorized: 'You need to be logged in to do that.',
  AlreadyLoggedIn: 'You are already logged in.',
  MaxAttemptsReached: 'Too many invalid login attempts.',

  NoInput: 'No input provided.',
  NoUserId: 'No user ID provided.',
  NoName: 'No name provided.',
  NoPass: 'No password provided.',
  BadUserOrPass: 'Incorrect username or password given.'
};
'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var zaq = require('zaq');
var chalk = require('chalk');
var _ = require('underscore');
var uid = require('node-uuid');
var moment = require('moment');
var crypto = require('crypto');
var jawn = require('node-jawn');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

var Lex = require('./lex.js');

var skygate = function skygate(config) {
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

  var app = {
    users: config.users,
    live: {
      sessions: [],
      attempts: {}
    }
  };

  //-===========================================================================

  app.fail = function (req, res, info) {
    for (var _len = arguments.length, loggables = Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
      loggables[_key - 3] = arguments[_key];
    }

    var ip = app.getIpAddress(req);
    info = _.defaults(info, {
      message: Lex.GenericError,
      success: false,
      warnings: req.warnings && req.warnings.length ? req.warnings : [],
      code: 400
    });
    app.updateToken();
    res.status(info.code).send(info);
    zaq.err(info.message, 'IP: ' + ip);
    if (loggables) _.each(loggables, zaq.obj);
  };

  app.warn = function (req, warning) {
    if (!req.warnings || !req.warnings.length) req.warnings = [];
    req.warnings.push(warning);
  };

  //-===========================================================================
  // Getters

  app.getIpAddress = function (req) {
    return req ? req.headers['x-forwarded-for'] || req.connection.remoteAddress : null;
  };

  app.getToken = function (req) {
    return req && req.signedCookies && req.signedCookies[config.cookieName] ? req.signedCookies[config.cookieName] : false;
  };

  app.getSession = function (token) {
    return _.findWhere(app.live.sessions, { token: token });
  };

  app.getUserById = function (id) {
    return _.findWhere(app.users, { id: id });
  };

  app.getUserByToken = function (token) {
    var session = app.getSession(token);
    return session && session.user && session.user.id ? app.getUserById(session.user.id) : null;
  };

  app.getUser = function (req) {
    if (!app.isLoggedIn(req)) return null;
    return app.getUserByToken(app.getToken(req));
  };

  app.vetUser = function (user) {
    return _.pick.apply(_, [user].concat(_toConsumableArray(config.exposableUserKeys)));
  };

  //-===========================================================================
  // Status

  app.isLoggedIn = function (req) {
    var token = app.getToken(req);
    zaq.info('isLoggedIn: got token ' + token);
    var session = app.getSession(token);
    return token && session ? true : false;
  };

  app.echoStatus = function (req, res) {
    res.send({
      loggedIn: app.isLoggedIn(req),
      user: app.vetUser(app.getUser(req))
    });
  };

  //-===========================================================================
  // Middleware

  app.requireLoggedIn = function (req, res, next) {
    var code = 401;
    var token = app.getToken(req);
    var message = Lex.Unauthorized;
    return app.isLoggedIn(req) ? next() : app.fail(req, res, { code: code, token: token, message: message });
  };

  app.registerAuthAttempt = function (req, res, next) {
    var ip = app.getIpAddress(req);
    var count = _.has(app.live.attempts, ip) ? app.live.attempts[ip] : app.isLoggedIn(req) ? -1 : 0;

    req.authAttempts = app.live.attempts[ip] = count + 1;
    next();
  };

  app.updateToken = function (req, res, next) {
    var maxAge = config.maxAge;
    var token = app.getToken(req);
    if (!token) return;

    var session = app.getSession(token);
    if (!session) maxAge = 1;

    res.cookie(config.cookieName, token, { maxAge: maxAge, signed: true });
    if (next) next();
  };

  app.logSessionList = function () {
    var sessions = app.live.sessions;
    var prefix = chalk.dim.blue(' → :::::  ');
    var table = _.map(sessions, function (s) {
      var token = s.token.substr(0, 8) + '...';
      var time = moment(s.start).format('h:mm:ss');
      return '' + prefix + chalk.dim.cyan(time) + ' ' + chalk.blue.bold(s.user.id) + ' ' + chalk.dim('from') + ' ' + chalk.yellow(s.ip) + ' ' + chalk.dim('with') + ' ' + chalk.dim.green.bold(token);
    });

    zaq.info('Current Sessions (' + app.live.sessions.length + ')');
    zaq.log(table.join('\n'));
  };

  app.newSession = function (req, res, rawUser) {
    var token = uid.v4();
    var success = true;
    var maxAge = config.maxAge;
    var ip = app.getIpAddress(req);
    var user = app.vetUser(rawUser);
    var start = new Date().getTime();

    var payload = { user: user, ip: ip, start: start, success: success };
    var session = { user: user, ip: ip, start: start, token: token };

    app.live.sessions.push(session);
    zaq.win('Session started: ' + chalk.dim(token));
    app.logSessionList();
    res.cookie(config.cookieName, token, { maxAge: maxAge, signed: true });
    res.send(payload);
  };

  app.killSession = function (token) {
    zaq.win('Session killed: ' + chalk.dim(token));
    app.logSessionList();
    app.live.sessions = _.reject(app.live.sessions, { token: token });
  };

  //-===========================================================================

  app.attemptAuthentication = function (input) {
    return new Promise(function (resolve, reject) {
      var id = input.id,
          pass = input.pass,
          email = input.email;


      if (!_.isObject(input)) reject(Lex.NoInput);

      var match;
      switch (config.mode) {
        case 'id':
          if (!_.isString(id)) reject(Lex.NoUserId);
          id = id.toLowerCase();
          match = { id: id };
          break;
        case 'email':
          if (!_.isString(email)) reject(Lex.NoEmail);
          email = email.toLowerCase();
          match = { email: email };
          break;
      }

      if (!_.isString(pass)) reject(Lex.NoPass);

      var user = _.findWhere(app.users, match);
      if (!_.isObject(user)) reject(Lex.BadUserOrPass);

      if (!app.checkUserPassword(pass, user)) reject(Lex.BadUserOrPass);

      resolve(user);
    });
  };

  app.checkUserPassword = function (candidatePass, user) {
    var salt = user.salt,
        pass = user.pass;

    var hash = crypto.createHash(config.algo).update(candidatePass).update(salt).digest('hex');
    return hash === pass;
  };

  app.generateSalt = function () {
    return crypto.randomBytes(16).toString('hex');
  };

  //-===========================================================================

  app.login = function (req, res) {
    if (app.isLoggedIn(req)) {
      var message = Lex.AlreadyLoggedIn;
      var code = 409;
      return app.fail(req, res, { message: message, code: code });
    }
    if (req.authAttempts >= config.maxAttempts) {
      var _message = Lex.MaxAttemptsReached;
      var _code = 429;
      return app.fail(req, res, { message: _message, code: _code });
    }
    return app.attemptAuthentication(req.body).then(function (user) {
      return app.newSession(req, res, user);
    }, function (err) {
      return app.fail(req, res, { message: err });
    });
  };

  app.logout = function (req, res) {
    app.killSession(app.getToken(req));
    app.updateToken();
    app.echoStatus(req, res);
  };

  //-===========================================================================

  app.mount = function () {
    var endpoint = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '/';

    var router = new express.Router();
    var secret = crypto.randomBytes(32).toString('hex');

    router.use(cookieParser(secret));
    router.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
    router.use(bodyParser.json({ limit: '50mb' }));

    router.get(endpoint, function (req, res) {
      return app.echoStatus(req, res);
    });
    router.post(endpoint, function (req, res) {
      return app.login(req, res);
    });
    router.delete(endpoint, function (req, res) {
      return app.logout(req, res);
    });

    return router;
  };

  return app;
};

module.exports = skygate;