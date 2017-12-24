const zaq = require('zaq');
const uid = require('uuid');
const Lex = require('./Lex');
const Utils = require('./Utils');
const Config = require('./Config');
const Request = require('./RequestFactory')();
const { message } = Utils;

const Sessions = {
  active: [],
  attempts: {},
  leases: {},

  create (req, res, rawUser) {
    const { cookieName, maxAge } = Config;
    const request = new Request(req);

    const token = uid.v4();
    const signed = true;
    const ip = request.getIp();
    const user = Utils.vetUser(rawUser);
    const start = (new Date()).getTime();
    const end = start + maxAge;

    let payload = { user, ip, start };
    let session = { user, ip, start, token, end };

    Sessions.active.push(session);
    Sessions.leases[token] = setTimeout(() => { Sessions.destroy(token); }, maxAge);
    zaq.win(message('SessionStarted', { token, ip }));
    zaq.log(Utils.sessionTable(Sessions.active));

    res.cookie(cookieName, token, { maxAge, signed });
    res.send(payload);
  },

  destroy (token) {
    let index = Sessions.active.findIndex(s => s.token === token);
    if (index < 0) return zaq.err(message('KillSessionFail', { token }));
    Sessions.active.splice(index, 1);
    zaq.info(Lex.KillSessionOk.replace('%token%', token));
  },

  findByToken (token) {
    return Sessions.active.find(session => session.token === token);
  },

  getAttempts (ip) {
    return ip in Sessions.attempts ? Sessions.attempts[ip] : 0;
  },

  clearAttempts (ip) {
    Sessions.attempts[ip] = 0;
    zaq.info(message('IpTimelockDisabled', { ip }));
  },

  registerAttempt (ip) {
    const attempts = Sessions.getAttempts(ip);
    Sessions.attempts[ip] = attempts + 1;
  }
};

module.exports = Sessions;
