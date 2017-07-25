const express = require('express');
const zaq = require('zaq');
const lex = require('./app/lex.js');

const users = require('./config/users.json');
const skygate = require('./app/skygate.js')({ users, cookieName: '_SkyGateAuthToken' });

const app = express();
const port = 1919;
const live = __dirname + '/demo';

app.use('/session', skygate.mount());
app.use('/', express.static(live));
app.listen(port);

zaq.win(lex.ServerOk)
zaq.info(`Running on ${port}`);
