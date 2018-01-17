const zaq = require('zaq').as('SkyGate');
const Lex = require('./Lex');
const Defaults = require('./Defaults');
const { makeMessage } = require('./Utils');

let Config = Object.assign({}, Defaults, {
  getRoot () {
    const { protocol, host, port, path, endpoint } = Config;
    return protocol
      + '://'
      + host
      + (port ? ':' + port : '')
      + (path ? path : '')
      + endpoint;
  },

  canRegister ({ email }) {
    zaq.warn(Lex.NoRegistrationValidatorSet);
    return false;
  },

  disableRegistration () {
    zaq.warn(Lex.RegistrationDisabled);
    Config.canRegister = () => false;
  },

  use (newConfig = {}) {
    Object.entries(newConfig).forEach(([ key, value ]) => {
      Config[key] = value;
    });
    Config.validate();
  },

  validate () {
    if (!Config.sendgridKey) {
      zaq.warn(Lex.NoSendgridKeyProvided);
      Config.disableRegistration();
    } else if (Config.sendgridKey.length !== 69 || Config.sendgridKey.indexOf('SG.') !== 0) {
      zaq.warn(Lex.BadSendgridKeyProvided);
      Config.disableRegistration();
    };
    if (Config.appName === Defaults.appName) {
      const { appName } = Config;
      zaq.warn(Lex.NoAppNameSet.split('%appName%').join(appName));
    };
    if (typeof Config.activationLanding === 'undefined') {
      const activationLanding = Config.getRoot() + Config.paths.session;
      zaq.warn(Lex.NoLandingPageGiven.split('%activationLanding%').join(activationLanding));
      Config.activationLanding = activationLanding;
    }
    // TODO: typechecking for regex and that all keys exist
    // (tests.email, tests.name, paths.register, etc.)
  }
});

module.exports = Config;
