const zaq = require('zaq').as('SkyGate');
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

      this.getIp = this.getIp.bind(this);
      this.getUser = this.getUser.bind(this);
      this.lockout = this.lockout.bind(this);
      this.getToken = this.getToken.bind(this);
      this.isLoggedIn = this.isLoggedIn.bind(this);
      this.refreshToken = this.refreshToken.bind(this);
      this.canAttemptLogin = this.canAttemptLogin.bind(this);
      this.registerLoginAttempt = this.registerLoginAttempt.bind(this);
    }

    getToken () {
      const { signedCookies } = this.req;
      const { cookieName } = Config;
      return (signedCookies && signedCookies[cookieName])
        ? signedCookies[cookieName]
        : undefined;
    }

    getIp () {
      const { req } = this;
      return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    }

    getUrl () {
      const { originalUrl } = this.req;
      return originalUrl;
    }

    appendMeta (text = '') {
      const ip = this.getIp();
      const url = this.getUrl();
      return `${text} (${ip} @ ${url})`;
    }

    info () {
      const ip = this.getIp();
      const user = this.getUser();
      const token = this.getToken();
      const isLoggedIn = this.isLoggedIn();
      return { ip, user, token, isLoggedIn };
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
