const chalk = require('chalk');

module.exports = {
  ServiceOk: chalk.green('Initialized') + ' SkyGate Service',
  ServiceFail: chalk.red('Failed to start') + 'SkyGate Service',
  MongoFail: chalk.red('Failed to Connect') + ' SkyGate to MongoDB using URI: \n \t  %uri%',
  MongoOk: chalk.green('Connected') + ' SkyGate to MongoDB using URI: \n \t  %uri%',
  ServiceMounted: chalk.green('Mounted') + ' SkyGate at URL: \n \t  ' + chalk.blue('%url%'),
  UsingUserModel: 'Using User Model Name: ' + chalk.blue('%userModelName%'),

  AnnounceStatus: chalk.gray('GET ') + chalk.blue.dim.underline('%url%') + chalk.gray(' for status'),
  AnnounceLogin: chalk.gray('POST ') + chalk.blue.dim.underline('%url%') + chalk.gray(' for login'),
  AnnounceLogout: chalk.gray('DEL ') + chalk.blue.dim.underline('%url%') + chalk.gray(' for logout'),
  AnnounceRegister: chalk.gray('POST ') + chalk.blue.dim.underline('%url%') + chalk.gray(' for registration'),
  AnnounceReset: chalk.gray('POST ') + chalk.blue.dim.underline('%url%') + chalk.gray(' for password reset'),
  AnnounceActivate: chalk.gray('GET ') + chalk.blue.dim.underline('%url%') + chalk.gray('?token=XXX&ref=XXX for activation'),

  GenericError: 'An unknown error occurred.',
  GenericWarning: 'An unspecified warning. Be careful, I guess.',
  SaveError: 'An error occurred while saving your changes. Please try again.',
  Unauthorized: 'You need to be logged in to do that.',
  BadGateway: 'Bad gateway; something isn\'t hooked up proper.',

  NoInput: 'No input provided.',
  NoUserId: 'No user ID provided.',
  NoEmail: 'No email address provided.',
  NoName: 'No name provided.',
  NoPass: 'No password provided.',
  NoRequest: 'No request instance provided.',

  WeirdEmail: 'Invalid email address provided.',
  WeirdPass: 'Invalid password provided. Passwords are 10-256 characters long and may include the following special characters: "!@#`~%^&?_-".',
  WeirdName: 'Invalid name format given. Names can only contain letters, spaces, hyphens, and periods.',

  BadEmail: 'No user with that email address could be found.',
  BadEmailOrPass: 'Incorrect email or password given.',
  EmailAlreadyUsed: 'A user with the email "%email%" already exists.',
  BadActivation: 'Invalid activation parameters provided.',
  ActivatedUser: 'Successfully activated %email%.',
  IpTimelockDisabled: 'IP %ip% lockout time has expired.',

  AlreadyLoggedIn: 'You\'re already logged in.',
  MaxAttemptsReached: 'Too many invalid login attempts. You have been locked out for 1 minute.',
  SessionStarted: 'Session started from IP %ip% using token: \n \t  %token%',
  NotActivated: 'Account not activated. Activate your account using the link sent to your email.',
  AccountDisabled: 'Your account has been disabled. Beware.',
  KillSessionFail: 'No session matching token "%token%" could be found. Failed to kill.',
  KillSessionOk: 'Successfully killed session with token "%token%".',
  NoFromAddress: 'Attempted <sendMessage> without a "from" address. \n \t  You can set a default address by setting `defaultFromAddress` in config.',
  NoSendgridKeyProvided: 'No SendGrid API key ({ sendgridKey }) given in configuration. \n \t  Registration will be disabled as no emails can be sent.',
  BadSendgridKeyProvided: 'Invalid SendGrid API key provided. \n \t  Registration will be disabled as no emails can be sent.',
  FailedToSendActivation: 'An error occurred sending the activation email. Please see your system administrator for details.',

  NoRegistrationValidatorSet: 'Default <canRegister({ email })> not overridden. Please override the default predicate method in Config (all registrants disallowed by default).',
  RegistrationAccepted: 'Registration by %email% deemed valid.',
  RegistrationDisabled: 'Registration is disabled. ' + chalk.grey('You might wanna take a look at that.'),
  RegistrationRejected: 'Registration is disallowed for "%email%".',
  RegisteredSuccessfully: 'Successfully Registered! Verify your email address to activate your account.',
  RegistrationActivationSubject: 'Welcome, %name%. Please Confirm Your Email',
  RegistrationActivation: 'Hey there, %name%! \nUse the following url to activate your account: %url%',
  RegistrationActivationHTML: `
    <html>
      <body style="font-family: 'San Francisco', 'Univers', 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif; padding: 30px;">
        <h1 style="border-bottom: 1px solid rgba(128, 128, 128, 0.3); padding-bottom: 5px; margin-bottom: 5px;">Almost there, %name%.</h1>
        <p style="margin: 0">We just need to verify your email address in order to activate your account.</p>
        <p>
          <a href="%url%" target="_blank" style="text-decoration: none;">
            <button style="border: 1px solid rgba(128, 128, 128, 0.3); line-height: 1em; background-color: black; padding: 10px 30px; margin: 5px 0 0; color: white">
             It's really me! &nbsp;➾
            </button>
          </a>
        </p>
        <br />
        <p style="font-size: 0.6em; opacity: 0.35; max-width: 400px">
          If you believe you have received this email in error, please contact your system administrator or simply ignore this message. Please do not activate the account if you have not requested its creation.
        </p>
      </body>
    </html>
  `
};
