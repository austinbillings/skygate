# <strike>SkyGate</strike>


## Dead-simple mongo and express-based plug'n'play authentication for Node servers

It's as easy as:

```
const express = require('express');
const skygate = require('../index');
const settings = {
  verbose: true,
  endpoint: '/auth',
  port: 12345,
  userModelName: 'sg_test_user',
  appName: 'Test App',
  sendgridKey: process.env.RockLititzSendgridKey
};

const instance = skygate(settings);
const app = express();

app.use(instance.mount());
app.listen(settings.port);
```
