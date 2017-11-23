const uid = require('node-uuid');
const Utils = require('./Utils');
const Config = require('./Config');
const Request = require('./Request');

const Sessions = {
  active: [],
  attempts: {},

  create (req, res, rawUser) {
    const { cookieName, maxAge } = Config;
    const request = new Request(req);

    const token = uid.v4();
    const signed = true;
    const ip = request.getIp();
    const user = Utils.vetUser(rawUser);
    const start = (new Date()).getTime();

    let payload = { user, ip, start };
    let session = { user, ip, start, token };

    Sessions.active.push(session);
    zaq.win(Lex.SessionStarted.replace('%token%', token).replace('%ip%', ip));
    zaq.log(Utils.sessionTable(Sessions.active));

    res.cookie(cookieName, token, { maxAge, signed });
    res.send(payload);
  },

  destroy (token) {
    let index = Sessions.active.findIndex(s => s.token === token);
    if (index < 0) return zaq.err(Lex.KillSessionFail.replace('%token%', token));
    Sessions.active.splice(index, 1);
    zaq.info(Lex.KillSessionOk.replace('%token%', token));
  },

  findByToken (token) {
    return Sessions.active.find(session => session.token === token);
  },

  registerLoginAttempt (req) {
    const request = new Request(req);
    const ip = request.getIp();
    const count = (ip in Sessions.attempts)
      ? Sessions.attempts[ip]
      : (request.isLoggedIn() ? -1 : 0);
    req.authAttempts = Sessions.attempts[ip] = (count + 1);
  }
};

module.exports = Sessions;
