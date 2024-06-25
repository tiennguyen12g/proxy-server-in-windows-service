import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { NetworkInterfaceType, LocalDevicesDetails, CheckNewDevices, getPublicIpUsingCurl } from './BackEnd/ProxyServer/GetNetworkInterfaces_V2';
import WMI from 'node-wmi';
import os from 'os';
import net from 'net';
import { exec } from 'child_process';
import util from 'util';
import fs from "fs";
import { CreateProxyServer, stopProxyServer } from './BackEnd/ProxyServer/CreateProxyServer';
const Service = require("node-windows").Service;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

//**Build communication between electron app and service on windows */

const MAX_RETRIES = 5;
const RETRY_DELAY = 2000;
async function sendNetworkInterfaces(activeInterfaces: NetworkInterfaceType[]) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    function attemptConnection() {
      const client = new net.Socket();

      client.connect(8004, '127.0.0.1', () => {
        console.log('Connected to proxy server');
        // Send each network interface to the proxy server
        activeInterfaces.forEach((iface) => {
          client.write(JSON.stringify({ command: 'start', localAddressIP: iface.address, port: iface.port }));
          // client.write(JSON.stringify({ command: 'start', localAddressIP: "192.168.102.82", port: 50000 }));
        });
        client.end(); // Close the connection after sending all data
        resolve('Network interfaces sent successfully');
      });

      client.on('data', (data) => {
        console.log('Server response: ' + data.toString());
      });

      client.on('error', (err) => {
        console.error('Socket error: ' + err);
        if (retries < MAX_RETRIES) {
          retries++;
          console.log(`Retrying connection (${retries}/${MAX_RETRIES})...`);
          setTimeout(attemptConnection, RETRY_DELAY);
        } else {
          reject(new Error('Failed to connect to proxy server after several attempts'));
        }
      });

      client.on('close', () => {
        console.log('Connection to proxy server closed');
      });
    }

    attemptConnection();
  });
}
// Call the function to send network interfaces when the app is ready
// app.whenReady().then(sendNetworkInterfaces);


//** Build Proxy-Service */ 

// Define the service
const svc = new Service({
  name: "Proxy Service V2",
  description: "Node.js Proxy Server running as a Windows Service",
  script: path.join(__dirname, "ManageProxyService/proxy_server_v2.js"),
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

svc.on("start", async () => {
  console.log("Service started successfully!");
  const activeInterfaces = await CheckNewDevices();
  console.log('activeInterfaces', activeInterfaces);
  try {
    const response = await sendNetworkInterfaces(activeInterfaces);
    console.log(response);
  } catch (error) {
    console.error(`Error sending network interfaces: ${error.message}`);
  }
});

// Listen for the "stop" event and log it
svc.on("stop", () => {
  console.log("Service stopped.");
});

// Event listeners for control commands from Electron
ipcMain.handle("start-proxy-service", async (event) => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 3000;
  let reCall = 1;
  async function ReCall(){
    let array: NetworkInterfaceType[] = [];
    if(reCall >= MAX_RETRIES) return [];
    const activeInterfaces = await CheckNewDevices();
    if(activeInterfaces.length > 0){
      array = activeInterfaces;
      console.log('reCall', reCall);
    } else {
      reCall++;
      setTimeout(ReCall, RETRY_DELAY);
    }
    return array;
  }

  // try {
    // const activeInterfaces = await ReCall();
    // console.log('activeInterfaces', activeInterfaces);
    // for(let i = 0; i < activeInterfaces.length ; i++){
    //   const iFace = activeInterfaces[i];
    //   const port = iFace.port;
    //   const simIP = iFace.address;
    //   const respone =  await CreateProxyServer( simIP, Number(port));
    //   console.log('respone',respone);
    // }
    // const fullInterfaceDetails = activeInterfaces;
    // activeInterfaces.forEach( async (iFace: NetworkInterfaceType, i: number) => {
    //   const port = iFace.port;
    //   const simIP = iFace.address;
    //   const respone =  await CreateProxyServer( simIP, Number(port));
    //   console.log('respone',respone);
    //   const publicIp = await getPublicIpUsingCurl(iFace.address).then((res: any) => {
    //           return res;
    //         })
    //         .catch((error: any) => console.log("error", error));
    //   fullInterfaceDetails[i].nat_ip = publicIp;
    // });
  //   event.sender.send("response-on-proxy-server-start", {
  //     success: true,
  //     message: {
  //       message: `Proxy-server start command sent`,
  //       networks: fullInterfaceDetails
  //     }
  //   });
  // } catch (error) {
  //   console.log('start-proxy-service error:', error);
  // }
  if (!svc.exists) {
    console.log("Service does not exist. Install it first.");
    return;
  }
  await svc.start();

  // // Listen for the "start" event and log it
  svc.once("start", async () => {
    console.log("Service started successfully!");
    const activeInterfaces = await CheckNewDevices();
    console.log('activeInterfaces', activeInterfaces);
    try {
      const response = await sendNetworkInterfaces(activeInterfaces);
      console.log(response);
      event.sender.send("response-on-proxy-server-start", {
        success: true,
        message: {
          message: `Proxy-server start command sent`,
          networks: activeInterfaces
        }
      });
    } catch (error) {
      console.error(`Error sending network interfaces: ${error.message}`);
      event.sender.send("response-on-proxy-server-start", {
        success: false,
        message: `Error starting proxy-server: ${error.message}`
      });
    }
  });
});

ipcMain.handle("stop-proxy-service",async (event, params: number[]) => {
  // const arrayPort = params;
  // arrayPort.forEach((port, i: number) =>{
  //   stopProxyServer(port);
  //   console.log(`Proxy Server on port ${port} stopped`);
  // })

  if (!svc.exists) {
    console.log("Service does not exist.");
    return;
  }
  await svc.stop();
  event.sender.send("response-on-proxy-server-stop",{
    success: true,
    message: {
      message: `Proxy-server stop successfully`,
    },
  })
});
//
// ipcMain.handle("start-one-proxy-server", async(event)=>{

// });

// ipcMain.handle("stop-one-proxy-server", async(event)=>{

// });