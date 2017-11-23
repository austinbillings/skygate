module.exports = {
  mode: 'id',
  algo: 'sha256',

  maxAttempts: 10,
  maxSessionLength: 3 * 60 * 60 * 1000,

  cookieName: 'authToken',
  exposableAttributes: ['_id', 'name', 'email', 'created'],
  dbUri: 'mongodb://127.0.0.1:27017',

  tests: {
    name: /^[a-zA-Z ]{1,256}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    pass: /^[a-zA-Z0-9!@#`~%^&?_-]{10,256}$/
  }
};
