const Service = require("node-windows").Service;
const path = require("node:path");
const { ipcMain } = require("electron");

// Define the service
const svc = new Service({
  name: "Proxy Service V1",
  description: "Node.js Proxy Server running as a Windows Service",
  script: path.join(__dirname, "proxy_server.js"),
  nodeOptions: ["--harmony", "--max_old_space_size=4096"],
});

// Install the service if not already installed
if (!svc.exists) {
  svc.on("install", () => {
    console.log("Service installed.");
  });
  svc.install();
} else {
  console.log("Service already installed.");
}

// Listen for the "install" event, which indicates the process is available as a service.
svc.on("install", () => {
  console.log("Service installed and started!");
});

// Listen for the "start" event and log it
svc.on("start", () => {
  console.log("Service started successfully!");
});

// Listen for the "stop" event and log it
svc.on("stop", () => {
  console.log("Service stopped.");
});

// Event listeners for control commands from Electron
// ipcMain.on("start-proxy-service", () => {
//   if (!svc.exists) {
//     console.log("Service does not exist. Install it first.");
//     return;
//   }
//   svc.start();
// });

// ipcMain.on("stop-proxy-service", () => {
//   if (!svc.exists) {
//     console.log("Service does not exist.");
//     return;
//   }
//   svc.stop();
// });

