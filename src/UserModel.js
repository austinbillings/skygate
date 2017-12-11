const zaq = require('zaq');
const mongoose = require('mongoose');
const UserSchema = require('./UserSchema');
const { message } = require('./Utils');

const nameCache = [];

module.exports = function ({ userModelName = 'skygate_user' }) {
  if (!nameCache.contains(userModelName)) {
    zaq.info(message('UsingUserModel', { userModelName });
    nameCache.push(userModelName);
  }
  return mongoose.model(userModelName, UserSchema);
}
