const zaq = require('zaq').as('SkyGate');
const mongoose = require('mongoose');
const UserSchema = require('./UserSchema');
const { makeMessage } = require('./Utils');

const nameCache = [];

module.exports = function ({ userModelName = 'skygate_user' }) {
  if (!nameCache.includes(userModelName)) {
    zaq.info(makeMessage('UsingUserModel', { userModelName }));
    nameCache.push(userModelName);
  }
  return mongoose.model(userModelName, UserSchema);
}
