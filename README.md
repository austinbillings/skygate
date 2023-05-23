# <strike>SkyGate</strike>


## Dead-simple mongo, sendgrid, and express-based plug'n'play authentication for Node apps

It's as easy as:

```js
const express = require('express');
const skygate = require('skygate');
const settings = {
  verbose: true,
  endpoint: '/auth',
  port: 12345,
  userModelName: 'sg_test_user',
  appName: 'Test App',
  sendgridKey: process.env.MY_SENDGRID_KEY_HERE_FOR_SENDING_REGISTRATION_EMAILS
};

const instance = skygate(settings);
const app = express();

app.use(instance.mount());
app.listen(settings.port);
```

Then, visiting `localhost:12345/auth/` should reveal auth status.


### Annotated settings & their keys

Basically all settings are optional with 1 caveat-- you'll need to provide a SendGrid API key to enable registration by users.


|Setting|Default value|Description|
|:---|:---|:---|
|algo|'sha256'| as accepted by `crypto` node api|
|signed|true|signed cookies, or no?
|appName|'☯'|this is the name of your app, as displayed in the registration and confirmation emails|
|sendgridKey|null|provide your api key here 'SG.XXX...' and emails will work, for registration|
|dbUri|'mongodb://127.0.0.1:27017'|mongo instance connection string|
|verbose|false|enabling this will show a lot more detail in the console|
|defaultFromAddress|null|"from" address to use when sending transactional emails|
|secretKey|require('crypto').randomBytes(32).toString('hex')|secret key to use when signing cookies etc.|
|userModelName|'skygate_user'|name to use for SkyGate user collection in mongodb|
|maxAttempts|10|maximum password attempts before lockout for 10 minutes|
|allowRegistration|true|set to false to simply disable all registration capability|
|maxAge|24 * 60 * 60 * 1000|maximum session/token refresh duration, defaulting to 24 hours|
|port|null|used for link URL construction; if serving on a real domain (not localhost), leave null
|protocol|'http'|used for link URL construction; if serving on a real domain (not localhost), https recommended
|host|'127.0.0.1'|used for link URL construction; if serving on a real domain (not localhost), set it here
|endpoint|'/'|base URL to use for link URL construction
|cookieName|'authToken'|name/key to use for auth cookie
|privateKeys|['pass','salt','resetToken','activationToken']|these fields will be stripped from User data when displaying via `GET /`
|paths| { ... } |API paths to use for different functionalities|
|paths.session|'/'|GET shows current state, DELETE logs out, POST logs in|
|paths.reset|'/reset'|POST for password reset, url path setting|
|paths.activate|'/activate'|POST for new registration activation, url path setting|
|paths.register|'/register'|POST for new registration, url path setting|
|tests| { ... } |these are regular expressions used to accept/reject signups/submissions|
|tests.name|/^[a-zA-Z-. ]{1,256}$/|for person name in registration|
|tests.email|/^[^\s@]+@[^\s@]+\.[^\s@]+$/|for email in registration & login|
|tests.pass|/^[a-zA-Z0-9!@#`~%^&?_-]{10,256}$/|for password in registration & login|
