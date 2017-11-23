module.exports = {
  ServerOk: 'SkyGate Server Initialized',
  ServerFail: 'SkyGate Server Failed to Start',
  MongoFail: 'SkyGate failed to connect to MongoDB using URI:\n\t  %uri%',
  MongoOk: 'SkyGate successfully connected to MongoDB using URI:\n\t  %uri%',

  GenericError: 'An unknown error occurred.',
  GenericWarning: 'An unspecified warning. Be careful, I guess.',
  Unauthorized: 'You need to be logged in to do that.',
  BadGateway: 'Bad gateway; something isn\'t hooked up proper.',
  AlreadyLoggedIn: 'You are already logged in.',
  MaxAttemptsReached: 'Too many invalid login attempts.',
  SessionStarted: 'Session started from IP %ip% using token\n\t  %token%',
  NotActivated: 'Account not activated. Activate your account using the link sent to your email.',
  AccountDisabled: 'Your account has been disabled. Sorry.',
  KillSessionFail: 'No session matching token "%token%" could be found. Failed to kill.',
  KillSessionOk: 'Successfully killed session with token "%token%".',

  NoInput: 'No input provided.',
  NoUserId: 'No user ID provided.',
  NoEmail: 'No email address provided.',
  NoName: 'No name provided.',
  NoPass: 'No password provided.',
  NoRequest: 'No request instance provided.',

  WeirdEmail: 'Invalid email address provided.',
  WeirdPassword: 'Invalid password provided. Passwords are 10-256 characters long and may include the following special characters: "!@#`~%^&?_-".',
  WeirdName: 'Invalid name format given. Names can only contain letters, spaces, hyphens, and periods.',

  BadEmail: 'No user with that email address could be found.',
  BadEmailOrPass: 'Incorrect email or password given.'
};
