let Config = {
  algo: 'sha256',
  signed: true,
  dbUri: 'mongodb://127.0.0.1:27017',

  maxAttempts: 10,
  maxSessionLength: 3 * 60 * 60 * 1000,
  allowRegistration: true,

  cookieName: 'authToken',
  privateKeys: [
    'pass',
    'salt',
    'resetToken',
    'activationToken'
  ],
  tests: {
    name: /^[a-zA-Z-. ]{1,256}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    pass: /^[a-zA-Z0-9!@#`~%^&?_-]{10,256}$/
  },

  use (newConfig = {}) {
    Config = Object.assign({}, Config, newConfig);
  }
};

module.exports = Config;
