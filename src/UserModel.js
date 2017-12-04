const zaq = require('zaq');
const mongoose = require('mongoose');
const { hashPass } = require('./Utils');
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
  const { salt, pass } = this;
  const hash = hashPass({ pass: candidatePass, salt });
  return hash === pass;
}

module.exports = mongoose.model('SkygateUser', User);
