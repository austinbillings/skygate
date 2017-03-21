'use strict';

var express = require('express');
var zaq = require('zaq');
var lex = require('./app/lex.js');
var cookieParser = require('cookie-parser');

var skygate = require('./app/skygate.js')({
  users: require('./config/users.json'),
  cookieName: '_SkyGateAuthToken'
});

var app = express();
var port = 1919;
var live = __dirname + '/demo';

app.use(cookieParser());
app.use('/session', skygate.toEndpoint());
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
  MaxAttemptsReached: 'Too many invalid login attempts.',

  NoInput: 'No input provided.',
  NoName: 'No name provided.',
  NoPass: 'No password provided.'
};
'use strict';

var zaq = require('zaq');
var _ = require('underscore');
var uid = require('node-uuid');
var jawn = require('node-jawn');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

var Lex = require('./lex.js');

var skygate = function skygate(config) {
  config = _.defaults(config, {
    users: null,
    cookieName: '_AuthToken',
    maxAttempts: 10,
    maxAge: 3 * 60 * 60 * 1000
  });

  var app = {
    users: config.users,
    live: {
      sessions: [],
      attempts: {}
    }
  };

  app.fail = function (req, res, info) {
    for (var _len = arguments.length, loggables = Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++) {
      loggables[_key - 3] = arguments[_key];
    }

    info = _.defaults(info, {
      message: Lex.GenericError,
      success: false,
      warnings: req.warnings && req.warnings.length ? req.warnings : [],
      code: 400
    });
    res.status(info.code).send(info);
    zaq.err(info.message, info);
    if (loggables) _.each(loggables, zaq.obj);
  };

  app.warn = function (req, warning) {
    if (!req.warnings || !req.warnings.length) req.warnings = [];
    req.warnings.push(warning);
  };

  app.getIpAddress = function (req) {
    return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  };

  app.getToken = function (req) {
    return req && req.cookies && req.cookies[config.cookieName];
  };

  app.isLoggedIn = function (req) {
    var token = app.getToken(req);
    return token && _.contains(app.sessions, token);
  };

  app.requireLoggedIn = function (req, res, next) {
    var info = {
      code: 401,
      token: app.getToken(req),
      message: Lex.Unauthorized
    };

    return app.isLoggedIn(req) ? next() : app.fail(req, res, info);
  };

  app.registerAuthAttempt = function (req, res, next) {
    var ip = app.getIpAddress(req);
    var count = _.has(app.live.attempts, ip) ? app.live.attempts[ip] : app.isLoggedIn(req) ? -1 : 0;

    req.authAttempts = app.live.attempts[ip] = count + 1;
    next();
  };

  app.validateToken = function (req, res, next) {
    var token = app.getToken(req);

    if (!token) return;
    if (!_.contains(app.live.sessions, token)) res.cookie(config.cookieName, token, { maxAge: 1 });
    next && next();
  };

  app.newSession = function (req, res, user) {
    var token = uid.v4();
    var cookieProps = {
      maxAge: config.maxAge
    };
    var payload = {
      token: token,
      success: true
    };
    var session = {
      token: token,
      uid: user.id
    };

    app.live.sessions.push(session);
    zaq.win('Session started', token);
    zaq.info('Current sessions', app.live.sessions);
    res.cookie(config.cookieName, token, cookieProps);
    res.send(payload);
  };

  app.getStatus = function (req, res) {
    var status;
    if (app.isLoggedIn(req)) {
      status = {
        success: true,
        loggedIn: true
      };
    } else {
      status = {
        success: true,
        loggedIn: false
      };
    }
    return res.send(status);
  };

  app.check = function (input) {
    return new Promise(function (resolve, reject) {
      if (!_.keys(input).length) reject(Lex.NoInput);
      if (!_.isString(input.name)) reject(Lex.NoName);
      if (!_.isString(input.pass)) reject(Lex.NoPass);
      resolve({ name: "steve brewer", id: 'poop' });
    });
  };

  app.login = function (req, res) {
    if (app.isLoggedIn(req)) return app.getStatus(req, res);
    if (req.authAttempts >= config.maxAttempts) {
      var message = Lex.MaxAttemptsReached;
      return app.fail(req, res, { message: message });
    }
    return app.check(req.body).then(function (user) {
      return app.newSession(req, res, user);
    }, function (err) {
      return app.fail(req, res, { message: err });
    });
  };

  app.logout = function (req, res) {
    if (app.isLoggedIn(req)) app.live.sessions = _.without(app.live.sessions, app.getToken(req));
    app.validateToken();
    return app.getStatus(req, res);
  };

  app.toEndpoint = function () {
    var endpoint = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '/';

    var router = new express.Router();
    router.use(cookieParser());
    router.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
    router.use(bodyParser.json({ limit: '50mb' }));
    router.get(endpoint, function (req, res) {
      return app.getStatus(req, res);
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