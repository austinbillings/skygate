const trolley = require('trolley');

const Lex = require('./Lex');
const Config = require('./Config');

class Request {
  constructor (req, res) {
    if (!req || typeof req !== 'object')
      trolley.crash(res, { message: Lex.NoRequest, code: 500, obj: req });
    this.req = req;
    this.res = res;
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
   let { maxAge, cookieName, signed } = Config;
   const token = this.getToken();
   if (!token) return;
   const session = Sessions.getByToken(token);
   if (!session) maxAge = 1;
   res.cookie(cookieName, token, { maxAge, signed });
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
    return this.req.authAttempts >= config.maxAttempts
  }
}
