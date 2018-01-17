module.exports = {
  algo: 'sha256',
  signed: true,
  appName: '☯',
  sendgridKey: null,
  dbUri: 'mongodb://127.0.0.1:27017',
  verbose: false,
  development: true,
  defaultFromAddress: null,

  userModelName: 'skygate_user',

  maxAttempts: 10,
  allowRegistration: true,
  maxAge: 24 * 60 * 60 * 1000,

  port: null,
  protocol: 'http',
  host: '127.0.0.1',
  endpoint: '/',
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
};
