const trolley = require('trolley');

const Lex = require('./Lex');
const Config = require('./Config');

const ONE_MINUTE = 1000 * 60;

module.exports = (Sessions) => {
  class Request {
    constructor (req, res) {
      if (!req || typeof req !== 'object')
        trolley.crash(res, {
          message: Lex.NoRequest,
          code: 500,
          obj: req
        });
      this.req = req;
      this.res = res;
      return this;
    }

    getIp () {
      const { req } = this;
      return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    }

    getToken () {
      const { signedCookies } = this.req;
      const { cookieName } = Config;
      return (signedCookies && signedCookies[cookieName])
        ? signedCookies[cookieName]
        : undefined;
    }

    refreshToken (res) {
      let { maxSessionLength, cookieName, signed } = Config;
      const token = this.getToken();
      if (!token) return;
      const session = Sessions.findByToken(token);
      if (!session) maxSessionLength = 1;
      res.cookie(cookieName, token, { maxAge: maxSessionLength, signed });
    }

    getUser () {
      if (!this.isLoggedIn()) return undefined;
      const token = this.getToken();
      const session = Sessions.findByToken(token);
      return session.user;
    }

    isLoggedIn () {
      const token = this.getToken();
      const session = Sessions.findByToken(token);
      return token && session;
    }

    canAttemptLogin () {
      const { maxAttempts } = Config;
      const ip = this.getIp();
      const authAttempts = Sessions.getAttempts(ip);
      return authAttempts <= maxAttempts;
    }

    lockout () {
      const ip = this.getIp();
      setTimeout(() => Sessions.clearAttempts(ip), ONE_MINUTE);
    }

    registerLoginAttempt () {
      const authAttempts = Sessions.getAttempts(this.getIp());
      if (this.isLoggedIn()) return;
      Sessions.registerAttempt(this.getIp());
    }
  };

  return Request;
};
