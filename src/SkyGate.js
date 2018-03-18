const zaq = require('zaq').as('SkyGate');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment');
const crypto = require('crypto');
const express = require('express');
const trolley = require('trolley');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const Trolley = trolley();
const Lex = require('./Lex');
const Utils = require('./Utils');
const Config = require('./Config');
const Defaults = require('./Defaults');
const UserDB = require('./UserDB');
const Sessions = require('./Sessions');
const Request = require('./RequestFactory')(Sessions);
const { makeMessage, appendMeta } = Utils;

const handleCrash = (payload) => {
  const { message, code } = payload;
  zaq.err(message + chalk.dim(` (${code})`));
};

const handleDelivery = (payload) => {
  const { message, code } = payload;
  zaq.ok(message + chalk.dim(` (${code})`));
};

const notImplemented = (req, res) => {
  return Trolley.crash(res, { code: 501, message: Lex.NotImplemented });
};

const SkyGate = {
  init (config = {}) {
    const { appName } = config.appName ? config : Defaults;
    zaq.flag(makeMessage('Initializing', { appName }));

    Config.use(config);
    SkyGate.Users = new UserDB(Config);
    SkyGate.connect();
    Trolley.onCrash(Config.verbose ? handleCrash : null);
    Trolley.onDeliver(Config.verbose ? handleDelivery : null);
    zaq.use(new trolley().logger, { timestamps: true, stripColors: true });
    return SkyGate;
  },

  connect () {
    const { dbUri } = Config;
    const cleanUri = Utils.sanitizeConnectionUri(dbUri);
    mongoose.Promise = global.Promise;

    mongoose.connect(dbUri)
      .then(() => zaq.ok(makeMessage('MongoOk', { uri: chalk.reset.dim(cleanUri) })))
      .catch(err => zaq.err(makeMessage('MongoFail', { uri: cleanUri }), err));
  },

  register (req, res) {
    const requester = new Request(req);

    if (requester.isLoggedIn()) {
      let message = requester.appendMeta(Lex.AlreadyLoggedIn);
      let code = 403;
      return Trolley.crash(res, { message, code });
    }

    return SkyGate.Users.validateRegistration(req.body)
      .then(SkyGate.Users.registerUser)
      .then(SkyGate.Users.sendActivationEmail)
      .then((user) => {
        Trolley.deliver(res, {
          code: 201,
          message: `Registered ${user.email}`,
          registered: true,
          activated: false
        });
      })
      .catch(err => {
        const { message } = err.message ? err : { message: err };
        Trolley.crash(res, { message })
      });
  },

  activate (req, res) {
    const requester = new Request(req);
    return SkyGate.Users.attemptActivation(req.query)
      .then(({ email }) => {
        const { activationLanding } = Config;
        res.set('location', activationLanding)
          .status(303)
          .end();
      })
      .catch(message => Trolley.crash(res, { message }));
  },

  login (req, res) {
    const requester = new Request(req);
    const ip = requester.getIp();

    if (requester.isLoggedIn()) {
      let message = requester.appendMeta(Lex.AlreadyLoggedIn);
      return Trolley.deliver(res, { message, ip });
    }
    if (!requester.canAttemptLogin()) {
      requester.lockout();
      let message = requester.appendMeta(Lex.MaxAttemptsReached);
      let code = 429;
      return Trolley.crash(res, { message, code, ip });
    }
    requester.registerLoginAttempt();
    return SkyGate.Users.attemptLogin(req.body, Sessions.active)
      .then(user => Sessions.create(req, res, user))
      .catch(message => Trolley.crash(res, { message, ip }));
  },

  logout (req, res) {
    const requester = new Request(req);
    const token = requester.getToken();

    Sessions.destroy(token)
    requester.refreshToken(res);
    return SkyGate.echoStatus(req, res);
  },

  echoStatus (req, res) {
    const requester = new Request(req);
    const loggedIn = requester.isLoggedIn();
    const user = requester.getUser();
    res.send({ loggedIn, user });
  },

  /* - = - = - = - = - = - =  Middleware - = - = - = - = - = - = - = - = - = */

  requireClearance (req, res, next) {
    const requester = new Request(req);
    const token = requester.getToken();

    if (!requester.isLoggedIn()) return Trolley.crash(res, {
      message: requester.appendMeta(Lex.Unauthorized),
      obj: token,
      code: 401
    });

    if (next) return next();

    else return Trolley.crash(res, {
      code: 502,
      message: requester.appendMeta(Lex.BadGateway),
      obj: token
    });
  },

  mount () {
    const { getRoot, verbose, secret, appName, paths } = Config;
    const url = (_path = '') => getRoot() + _path;
    const router = new express.Router();
    const echo = verbose
      ? (...args) => zaq.info(makeMessage(...args))
      : () => null;

    router.use(cookieParser(secret));
    router.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
    router.use(bodyParser.json({ limit: '10mb' }));

    const endpoints = [
      {
        uri: paths.session,
        handler: SkyGate.echoStatus,
        announce: 'AnnounceStatus'
      },
      {
        method: 'post',
        uri: paths.session,
        handler: SkyGate.login,
        announce: 'AnnounceLogin'
      },
      {
        method: 'delete',
        uri: paths.session,
        handler: SkyGate.logout,
        announce: 'AnnounceLogout'
      },
      {
        method: 'post',
        uri: paths.register,
        handler: SkyGate.register,
        announce: 'AnnounceRegister'
      },
      {
        method: 'post',
        uri: paths.reset,
        handler: notImplemented,
        announce: 'AnnounceReset'
      },
      {
        uri: paths.activate,
        handler: SkyGate.activate,
        announce: 'AnnounceActivate'
      },
    ];

    endpoints.forEach(({ uri, handler, announce, method = 'get' }) => {
      if (!['get','put','post','delete'].includes(method)) return;
      router[method](uri, (req, res) => handler(req, res));
      if (announce) echo(announce, { url: url(uri) });
    });

    zaq.ok(makeMessage('ServiceMounted', { url: url() }));
    return router;
  }
};

module.exports = SkyGate.init;
