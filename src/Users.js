const mongoose = require('mongoose');

const Config = require('./Config');
const User = require('./UserModel');
const Sessions = require('./Sessions');

const Users = {
  list () {
    return User.find();
  },

  findById (_id) {
    return User.findOne({ _id });
  },

  findByEmail (email) {
    return User.findOne({ email });
  },

  attemptLogin ({ email, pass }) {
    return new Promise((resolve, reject) => {
      let { tests } = Config;

      if (!email && !pass) return reject(Lex.NoInput);
      if (typeof email !== 'string') return reject(Lex.NoEmail);
      if (typeof pass !== 'string') return reject(Lex.NoPass);
      email = email.toLowerCase();

      if (!tests.email.test(email)) return reject(Lex.WeirdEmail);
      if (!tests.pass.test(pass)) return reject(Lex.WeirdPass);

      Users.findByEmail(email)
        .then(user => {
          if (!user.checkPassword(pass))
            return reject(Lex.BadEmailOrPass);
          if (!user.activated)
            return reject(Lex.NotActivated);
          if (user.disabled)
            return reject(Lex.AccountDisabled)
          else
            return resolve(user);
        }).catch(err => {
          return reject(Lex.BadEmail);
        });
    });
  },

  attemptRegistration ({ name, email, pass }) {
    let { tests } = Config;

    if (!email && !pass && !name) return reject(Lex.NoInput);
    if (typeof email !== 'string') return reject(Lex.NoEmail);
    if (typeof pass !== 'string') return reject(Lex.NoPass);
    if (typeof name !== 'string') return reject(Lex.NoName);
    email = email.toLowerCase();

    if (!tests.email.test(email)) return reject(Lex.WeirdEmail);
    if (!tests.pass.test(pass)) return reject(Lex.WeirdPass);
    if (!tests.name.test(name)) return reject(Lex.WeirdName);
    
  }
};

module.exports = Users;
