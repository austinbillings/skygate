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
