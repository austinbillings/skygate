const crypto = require('crypto');
const mongoose = require('mongoose');

const Config = require('./Config');

const User = new mongoose.Schema({
  email: String,
  name: String,
  salt: String,
  pass: String,
  resetToken: String,
  activationToken: String,
  activated: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  created: {
    type: Date,
    default: Date.now
  }
});

User.methods.checkPassword = function (candidatePass) {
  let { salt, pass } = this;
  let { algo } = Config;
  let hash = crypto.createHash(algo)
    .update(candidatePass)
    .update(salt)
    .digest('hex');
  return hash === pass;
}

module.exports = mongoose.model('User', User);
