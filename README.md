# ~SkyGate~

~SkyGate~ is Express-based middleware for Node apps that need a simple authentication layer (it's *layerware!*).

## Installation
```js
npm install skygate --save
```

## Basic Usage
In your Express-based node app...
1. Install and require ~SkyGate~.
2. Initialize ~SkyGate~ with your options.
3. Hook up ~SkyGate~ to an endpoint.

```js
const express = require('express');
const skygate = require('skygate');

let app = express();

// Nice, quick and easy setup.
let myAuthSetup = skygate({
  users: require('./config/users.json'),
  cookieName: '_MyCoolSiteAuth'
});

// Now we hook it up to an endpoint:
app.use('/session', myAuthSetup);
app.listen(5055);

```

Now, ~SkyGate~ is hooked up to the "/session" endpoint of our app (accessible at `http://localhost:5055/session` in the above example). That means we can do the following:

- `POST /session` using credentials (ID/password or email/password)  **to attempt a login.**
- `GET /session` **to see current auth status** (a `loggedIn` boolean with a `user` object which represents the current user, empty while not logged in.)
- `DELETE /session` **to logout from the current session.**

Invalid login attempts are logged to the console, including the offending IP. Successful logins are also logged, and a table of active sessions is given each time.

## Available Options

- **You must provide your own `users` list.** You can pull it from a database or just require a JSON document with an array of users. Be sure that all the objects in the collection have a `.pass` attribute and an `.id` or `.email` if you're using the "id" or "email" modes, respectively.

- **You can specify which `mode` to use: "id" or "email".** When checking inputted credentials, ~SkyGate~ will use check the input's `id` against each available user's `id`, or `email` against `email`.

- *You can specify a custom `cookieName`* that will be used for creating the session tokens. The default is `_AuthToken`.

- *You can specify a custom hashing algorithm*, used to create the hash against which an entered password is checked. The default is "sha256", but can be any string which represents a NodeJS `crypto` library algorithm.

...and much more. To be continued.