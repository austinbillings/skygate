const zaq = require('zaq').as('SkyGate');
const mongoose = require('mongoose');
const UserSchema = require('./UserSchema');
const { message } = require('./Utils');

const nameCache = [];

module.exports = function ({ userModelName = 'skygate_user' }) {
  if (!nameCache.includes(userModelName)) {
    zaq.info(message('UsingUserModel', { userModelName }));
    nameCache.push(userModelName);
  }
  return mongoose.model(userModelName, UserSchema);
}
