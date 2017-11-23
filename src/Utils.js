const zaq = require('zaq');
const chalk = require('chalk');
const crypto = require('crypto');
const moment = require('moment');
const Config = require('./Config');

const Utils = {
  generateSalt () {
    return crypto.randomBytes(16).toString('hex');
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

  vetUser (user) {
    let output = {};
    let { privateKeys } = Config;
    user.keys().forEach(key => {
      if (privateKeys.indexOf(key) < 0 && typeof user[key] !== 'function')
        output[key] = user[key];
    });
    return output;
  }
};

module.exports = Utils;
