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
const UserDB = require('./UserDB');
const Sessions = require('./Sessions');
const Request = require('./RequestFactory')(Sessions);
const { message } = Utils;

const handleCrash = (payload) => {
  const { message, code } = payload;
  zaq.err(message + chalk.dim(` (${code})`));
};

const handleDelivery = (payload) => {
  const { message, code } = payload;
  zaq.win(message + chalk.dim(` (${code})`));
};

const SkyGate = {
  init (config = {}) {
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
      .then(() => zaq.win(message('MongoOk', { uri: chalk.reset.dim(cleanUri) })))
      .catch(err => zaq.err(message('MongoFail', { uri: cleanUri }), err));
  },

  register (req, res) {
    const requester = new Request(req);

    if (requester.isLoggedIn()) {
      let message = Lex.AlreadyLoggedIn;
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
        Trolley.deliver(res, {
          message: `Activated ${email}`,
          registered: true,
          activated: true
        });
      })
      .catch(message => Trolley.crash(res, { message }));
  },

  login (req, res) {
    const requester = new Request(req);
    const ip = requester.getIp();

    if (requester.isLoggedIn()) {
      let message = Lex.AlreadyLoggedIn;
      return Trolley.deliver(res, { message, ip });
    }
    if (!requester.canAttemptLogin()) {
      requester.lockout();
      let message = Lex.MaxAttemptsReached;
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
      message: Lex.Unauthorized,
      obj: token,
      code: 401
    });

    if (next) return next();

    else return Trolley.crash(res, {
      code: 502,
      message: Lex.BadGateway,
      obj: token
    });
  },

  mount () {
    const { endpoint, getRoot, verbose, secret } = Config;
    const url = (_path = '') => getRoot() + _path;
    const router = new express.Router();
    const echo = verbose
      ? (...args) => zaq.info(message(...args))
      : () => null;

    router.use(cookieParser(secret));
    router.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
    router.use(bodyParser.json({ limit: '10mb' }));

    router.get(endpoint, (req, res) => SkyGate.echoStatus(req, res));
    echo('AnnounceStatus', { url: url() });

    router.post(endpoint, (req, res) => SkyGate.login(req, res));
    echo('AnnounceLogin', { url: url() });

    router.delete(endpoint, (req, res) => SkyGate.logout(req, res));
    echo('AnnounceLogout', { url: url() });

    const RegisterPath = '/register';
    const RegisterUrl = path.join(endpoint, RegisterPath);
    router.post(RegisterUrl, (req, res) => SkyGate.register(req, res));
    echo('AnnounceRegister', { url: url(RegisterPath) });

    const ResetPath = '/reset';
    const ResetUrl = path.join(endpoint, ResetPath);
    router.post(ResetUrl, (req, res) => SkyGate.register(req, res));
    echo('AnnounceReset', { url: url(ResetPath) });

    const ActivatePath = '/activate';
    const ActivateUrl = path.join(endpoint, ActivatePath);
    router.get(ActivateUrl, (req, res) => SkyGate.activate(req, res));
    echo('AnnounceActivate', { url: url(ActivatePath) });

    zaq.win(message('ServiceMounted', { url: url() }));
    return router;
  }
};

module.exports = SkyGate.init;
