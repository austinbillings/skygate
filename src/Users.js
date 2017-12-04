const Lex = require('./Lex');
const Utils = require('./Utils');
const Config = require('./Config');
const User = require('./UserModel');
const Sessions = require('./Sessions');

const zaq = require('zaq');
const mongoose = require('mongoose');

const {
  hashPass, generateSalt,
  sendEmail, vetUser, message,
  scramble, descramble
} = Utils;

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

      return Users.findByEmail(email)
        .then(user => {
          if (!user.checkPassword(pass))
            return reject(Lex.BadEmailOrPass);
          if (!user.activated)
            return reject(Lex.NotActivated);
          if (user.disabled)
            return reject(Lex.AccountDisabled)
          else
            resolve(user)
            return user;
        }).catch(err => {
          return reject(Lex.BadEmail);
        });
    });
  },

  validateRegistration ({ name, email, pass }) {
    return new Promise ((resolve, reject) => {
      let { tests, canRegister } = Config;

      if (!email && !pass && !name) return reject(Lex.NoInput);
      if (typeof email !== 'string') return reject(Lex.NoEmail);
      if (typeof pass !== 'string') return reject(Lex.NoPass);
      if (typeof name !== 'string') return reject(Lex.NoName);
      email = email.toLowerCase();

      if (!tests.email.test(email)) return reject(Lex.WeirdEmail);
      if (!tests.pass.test(pass)) return reject(Lex.WeirdPass);
      if (!tests.name.test(name)) return reject(Lex.WeirdName);
      if (!canRegister({ email })) return reject(message('RegistrationRejected', { email }));

      const finish = () => {
        zaq.info(message('RegistrationAccepted', { email }));
        resolve({ name, email, pass });
      };

      User.find({ email })
        .then(users => users.length
          ? reject(message('EmailAlreadyUsed', { email }))
          : null)
        .then(finish)
        .catch(err => reject(err));
    });
  },

  registerUser ({ name, email, pass }) {
    const salt = generateSalt();
    const activationToken = generateSalt(32);
    pass = hashPass({ pass, salt });
    const NewUser = new User({ name, email, salt, pass, activationToken });
    return new Promise ((resolve, reject) => {
      NewUser.save((err, user) => {
        if (err) return reject(err);
        return resolve(user);
      });
    });
  },

  sendActivationEmail ({ name, email, activationToken }) {
    const { getRoot } = Config;
    const url = `${getRoot()}/activate?token=${activationToken}&ref=${scramble(email)}`;
    return new Promise((resolve, reject) => {
      sendEmail({
        to: email,
        text: message('RegistrationActivation', { url, name }),
        html: message('RegistrationActivationHTML', { url, name }),
        subject: message('RegistrationActivationSubject', { name })
      })
      .then(result => resolve({ name, email }))
      .catch(err => {
        zaq.err(err);
        reject(Lex.FailedToSendActivation);
      });
    });
  },

  attemptActivation ({ token, ref }) {
    return new Promise((resolve, reject) => {
      if (typeof token !== 'string' || !token.length || typeof ref !== 'string' || !ref.length) {
        zaq.err(Lex.BadActivation, { token, ref });
        reject(message('BadActivation'));
      }

      const email = descramble(ref);

      User.findOne({ email, activationToken: token })
        .then(user => {
          if (!user) {
            zaq.err(Lex.BadActivation, { token, email });
            return reject(Lex.BadActivation);
          };
          user.activated = true;
          user.activationToken = null;
          user.save((err, savedUser) => {
            return !err
              ? resolve(savedUser)
              : zaq.err(err) || reject(Lex.SaveError);
          });
        })
        .catch(err => {
          zaq.err(err);
          reject(Lex.BadActivation);
        });
    });
  }
};

module.exports = Users;
