/**
 * FrontWing Backend Server Entrypoint Alias
 * Allows launching either via `node src/index.js`, `node src/server.js`, or `npm start`.
 */
const { app, server, startServer } = require('./index.js');

if (require.main === module) {
  startServer();
}

module.exports = { app, server, startServer };
