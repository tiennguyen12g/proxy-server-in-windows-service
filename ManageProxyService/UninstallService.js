const Service = require('node-windows').Service;
const path = require("node:path");

// Define the service
const svc = new Service({
  name: 'Proxy Service V2',
  script: path.join(__dirname, 'proxy_server_v2.js')
});

// Listen for the "uninstall" event and log it
svc.on('uninstall', () => {
  console.log('Service uninstalled');
});

// Uninstall the service
svc.uninstall();
