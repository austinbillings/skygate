const Lex = require('./Lex');
const Utils = require('./Utils');
const Sessions = require('./Sessions');
const UserModel = require('./UserModel');

const zaq = require('zaq');
const mongoose = require('mongoose');

const { hashPass, generateSalt, sendEmail, vetUser, message, scramble, descramble } = Utils;

class UserDB {
  constructor (config) {
    this.config = config;
    this.User = UserModel(config);
    this.list = this.list.bind(this);
    this.findById = this.findById.bind(this);
    this.findByEmail = this.findByEmail.bind(this);
    this.attemptLogin = this.attemptLogin.bind(this);
    this.registerUser = this.registerUser.bind(this);
    this.attemptActivation = this.attemptActivation.bind(this);
    this.sendActivationEmail = this.sendActivationEmail.bind(this);
    this.validateRegistration = this.validateRegistration.bind(this);
    this.validateLoginCredentials = this.validateLoginCredentials.bind(this);
    this.validateRegistrationCredentials = this.validateRegistrationCredentials.bind(this);
  }

  list () {
    return this.User.find();
  }

  findById (_id) {
    return this.User.findOne({ _id });
  }

  findByEmail (email) {
    return this.User.findOne({ email });
  }

  validateLoginCredentials ({ email, pass }) {
    let { tests } = this.config;
    if (!email && !pass) throw new Error(Lex.NoInput);
    if (typeof email !== 'string') throw new Error(Lex.NoEmail);
    if (typeof pass !== 'string') throw new Error(Lex.NoPass);
    email = email.toLowerCase();
    if (!tests.email.test(email)) throw new Error(Lex.WeirdEmail);
    if (!tests.pass.test(pass)) throw new Error(Lex.WeirdPass);
    return true;
  }

  validateRegistrationCredentials ({ email, pass, name }) {
    let { tests, canRegister } = this.config;

    if (!email && !pass && !name) throw new Error(Lex.NoInput);
    if (typeof email !== 'string') throw new Error(Lex.NoEmail);
    if (typeof pass !== 'string') throw new Error(Lex.NoPass);
    if (typeof name !== 'string') throw new Error(Lex.NoName);
    email = email.toLowerCase();

    if (!tests.email.test(email)) throw new Error(Lex.WeirdEmail);
    if (!tests.pass.test(pass)) throw new Error(Lex.WeirdPass);
    if (!tests.name.test(name)) throw new Error(Lex.WeirdName);
    if (!canRegister({ email })) {
      const Rejection = message('RegistrationRejected', { email })
      throw new Error(Rejection);
    }
    return true;
  }

  async attemptLogin ({ email, pass }, sessionList = []) {
    try { this.validateLoginCredentials({ email, pass }); }
    catch (err) { return Promise.reject(err); }
    const user = await this.findByEmail(email);
    if (!user) return Promise.reject(Lex.BadEmail);

    if (!user.checkPassword(pass)) return Promise.reject(Lex.BadEmailOrPass);
    if (!user.activated) return Promise.reject(Lex.NotActivated);
    if (user.disabled) return Promise.reject(Lex.AccountDisabled);
    if (sessionList.some(({ user }) => user.email === email)) return Promise.reject(Lex.AlreadyLoggedIn);
    return user;
  }

  async validateRegistration ({ name, email, pass }) {
    const { findByEmail, validateRegistrationCredentials } = this;
    try { validateRegistrationCredentials({ name, email, pass }); }
    catch (err) { throw new Error(err); }
    const existingUser = await findByEmail(email);
    const AlreadyTaken = message('EmailAlreadyUsed', { email });
    if (existingUser) throw new Error(AlreadyTaken);

    zaq.info(message('RegistrationAccepted', { email }));
    return { name, email, pass };
  }

  registerUser ({ name, email, pass }) {
    const salt = generateSalt();
    const activationToken = generateSalt(32);
    pass = hashPass({ pass, salt });
    const NewUser = new this.User({ name, email, salt, pass, activationToken });
    return new Promise ((resolve, reject) => {
      NewUser.save((err, user) => {
        if (err) return reject(err);
        return resolve(user);
      });
    });
  }

  sendActivationEmail ({ name, email, activationToken }) {
    const { getRoot } = this.config;
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
  }

  attemptActivation ({ token, ref }) {
    return new Promise((resolve, reject) => {
      if (typeof token !== 'string' || !token.length || typeof ref !== 'string' || !ref.length) {
        zaq.err(Lex.BadActivation, { token, ref });
        reject(message('BadActivation'));
      }

      const email = descramble(ref);
      const activationToken = token;

      this.User.findOne({ email, activationToken })
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

module.exports = UserDB;
