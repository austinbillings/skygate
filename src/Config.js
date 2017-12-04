const zaq = require('zaq');
const Lex = require('./Lex');

let Config = {
  algo: 'sha256',
  signed: true,
  sendgridKey: null,
  dbUri: 'mongodb://127.0.0.1:27017',
  defaultFromAddress: null,

  appName: '',
  modelPrefix: 'SkyGate_',

  maxAttempts: 10,
  allowRegistration: true,
  maxAge: 24 * 60 * 60,

  cookieName: 'authToken',
  privateKeys: [
    'pass',
    'salt',
    'resetToken',
    'activationToken'
  ],

  port: null,
  protocol: 'http',
  host: '127.0.0.1',
  endpoint: '/auth',
  getRoot () {
    const { protocol, host, port, endpoint } = Config;
    return protocol + '://' + host + (port ? ':' + port : '');
  },

  tests: {
    name: /^[a-zA-Z-. ]{1,256}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    pass: /^[a-zA-Z0-9!@#`~%^&?_-]{10,256}$/
  },

  canRegister ({ email }) {
    zaq.warn(Lex.NoRegistrationValidatorSet);
    return false;
  },

  disableRegistration () {
    zaq.warn(Lex.RegistrationDisabled);
    Config.canRegister = () => false;
  },

  use (newConfig = {}) {
    Object.entries(newConfig).forEach(([ key, value ]) => {
      Config[key] = value;
    });
    Config.validate();
  },

  validate () {
    if (!Config.sendgridKey) {
      zaq.warn(Lex.NoSendgridKeyProvided);
      Config.disableRegistration();
    } else if (Config.sendgridKey.length !== 69 || Config.sendgridKey.indexOf('SG.') !== 0) {
      zaq.warn(Lex.BadSendgridKeyProvided);
      Config.disableRegistration();
    };
  }
};

module.exports = Config;
