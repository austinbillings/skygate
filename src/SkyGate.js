const zaq = require('zaq');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment');
const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const Trolley = require('trolley');

const Lex = require('./Lex');
const Utils = require('./Utils');
const Sessions = require('./Sessions');
const Users = require('./Users');
const Config = require('./Config');

const SkyGate = {

  init (config = {}) {
    Config.use(config);
    SkyGate.connect();
    return SkyGate;
  },

  connect () {
    const { dbUri } = Config;
    const cleanUri = Utils.sanitizeConnectionUri(dbUri);
    mongoose.Promise = global.Promise;

    mongoose.connect(dbUri)
      .then(() => zaq.win(Lex.MongoOk.replace('%uri%', chalk.reset.dim(cleanUri))))
      .catch((err) => zaq.err(Lex.MongoFail.replace('%uri%', cleanUri), err));
  },

  login (req, res) {
    const request = new Request(req);

    if (request.isLoggedIn()) {
      let message = Lex.AlreadyLoggedIn;
      let code = 409;
      return Trolley.crash(res, { message, code });
    }
    if (!request.canAttemptLogin()) {
      let message = Lex.MaxAttemptsReached;
      let code = 429;
      return Trolley.crash(res, { message, code });
    }
    return Users.attemptLogin(req.body)
      .then(user => Sessions.create(req, res, user))
      .catch(message => Trolley.crash(res, { message }));
  },

  logout (req, res) {
    const request = new Request(req);
    const token = request.getToken();

    Sessions.destroy(token)
    request.refreshToken(res);
    return SkyGate.echoStatus(req, res);
  },

  echoStatus (req, res) {
    const request = new Request(req);
    const loggedIn = request.isLoggedIn();
    const user = request.getUser();
    res.send({ loggedIn, user });
  },

  /* - = - = - = - = - = - =  Middleware - = - = - = - = - = - = - = - = - = */

  requireClearance (req, res, next) {
    const request = new Request(req);
    const token = request.getToken();

    if (!request.isLoggedIn()) return Trolley.crash(res, {
      code: 401,
      message: Lex.Unauthorized,
      obj: token
    });

    if (next) return next();

    else return Trolley.crash(res, {
      code: 502,
      message: Lex.BadGateway,
      obj: token
    });
  }

  mount (endpoint = '/') {
    let router = new express.Router();
    let secret = crypto.randomBytes(32).toString('hex');

    router.use(cookieParser(secret));
    router.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
    router.use(bodyParser.json({ limit: '10mb' }));

    router.get(endpoint, (req, res) => SkyGate.echoStatus(req, res));
    router.post(endpoint, (req, res) => SkyGate.login(req, res));
    router.delete(endpoint, (req, res) => SkyGate.logout(req, res));
    router.post(path.join(endpoint, '/register'), (req, res) => SkyGate.register(req, res));
    router.post(path.join(endpoint, '/reset'), (req, res) => SkyGate.register(req, res));

    return router;
  }

};

module.exports = SkyGate.init;
