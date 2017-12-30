const zaq = require('zaq').as('SkyGate');
const Lex = require('./Lex');
const chalk = require('chalk');
const crypto = require('crypto');
const moment = require('moment');
const sgMail = require('@sendgrid/mail');
const Config = require('./Config');
const { atob, btoa } = require('abab');

const Utils = {
  generateSalt (bytes = 64) {
    return crypto.randomBytes(bytes).toString('hex').substring(0, 64);
  },

  hashPass ({ pass, salt }) {
    let { algo } = Config;
    let hash = crypto.createHash(algo)
      .update(pass)
      .update(salt)
      .digest('hex');
    return hash;
  },

  sendEmail ({ to, from, html, text, subject = 'No Subject' }) {
    return new Promise ((resolve, reject) => {
      const { sendgridKey, defaultFromAddress } = Config;
      sgMail.setApiKey(sendgridKey);

      const email = {};
      if (typeof to === 'string' || Array.isArray(to)) email.to = to;
      if (from) email.from = from;
      else if (defaultFromAddress) email.from = defaultFromAddress;
      else return reject(Lex.NoFromAddress);

      if (html) email.html = html;
      if (text) email.text = text;
      if (subject) email.subject = subject;
      sgMail.send(email)
        .then(() => { resolve() })
        .catch(err => { reject(err) });
    });
  },

  scramble (text) {
    return encodeURIComponent(btoa(text));
  },

  descramble (text) {
    return atob(decodeURIComponent(text));
  },

  makeMessage (messageKey, injectables = {}) {
    let message = Lex[messageKey];
    if (!message) return messageKey;
    if (typeof injectables !== 'object' || !Object.keys(injectables).length) return message;
    Object.entries(injectables).forEach(([ key, value ]) => {
      if (!value || typeof value !== 'string') return;
      message = message.split(`%${key}%`).join(value);
    });
    return message;
  },

  appendMeta (requester, text) {
    const ip = requester.getIp();
    const url = requester.getUrl();
    return `${text} (${ip} @ ${url})`;
  },

  sanitizeConnectionUri (uri) {
    let pattern = /mongodb:\/\/[a-zA-Z0-9_-]+:[a-zA-Z0-9!?#$*_\-=`;'"]+@/;
    if (!pattern.test(uri)) return uri;
    let [ username, pass ] = uri.match(pattern).shift().substring(10, uri.length - 1).split(':');
    pass = Array(pass.length).join('*');
    let trail = uri.split('@');
    trail.shift();
    trail = trail.join('@');
    return 'mongodb://' + username + ':' + pass + '@' + trail;
  },

  sessionTable (sessionList) {
    let prefix = chalk.dim.blue(' → :::::  ');
    let table = sessionList.map(s => {
      let token = s.token.substr(0, 8) + '...';
      let time = moment(s.start).format('h:mm:ss');
      return `${prefix}${chalk.dim.cyan(time)} ${chalk.blue.bold(s.user.email)} ${chalk.dim('from')} ${chalk.yellow(s.ip)} ${chalk.dim('with')} ${chalk.dim.green.bold(token)}`;
    });
    return table.join('\n');
  },

  vetUser (user = {}) {
    const { privateKeys } = Config;
    return Object.entries('_doc' in user ? user._doc : user).reduce((result, [ key, value ]) => {
      if (!privateKeys.includes(key) && typeof value !== 'function')
        result[key] = value;
      return result;
    }, {});
  }
};

module.exports = Utils;
