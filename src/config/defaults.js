module.exports = {
  mode: 'id',
  algo: 'sha256',

  maxAttempts: 10,
  maxSessionLength:
    3 /* hours total, at */
    * 60 /* minutes/hour */
    * 60 /* seconds/minute */
    * 1000, /* ms/second */

  cookieName: 'authToken',
  exposableAttributes: ['_id', 'name', 'email', 'created'],
  dbUri: 'mongodb://127.0.0.1:27017',

  tests: {
    name: /^[a-zA-Z ]{1,256}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    pass: /^[a-zA-Z0-9!@#`~%^&?_-]{10,256}$/
  }
};
