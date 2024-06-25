const fs = require("fs");
const path = require("path");
const logFile = path.join(__dirname, "proxy_server.log");
const http = require("http");
const net = require("net");
const url = require("url");
const httpProxy = require("http-proxy");
const os = require("os");
const { exec } = require("child_process");
const util = require('util');
const WMI = require('node-wmi');
// Promisify fs methods to use with async/await
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const access = util.promisify(fs.access);

function log(message) {
  fs.appendFileSync(logFile, `${new Date().toISOString()} - ${message}\n`);
}

log("Starting proxy server...");

function CreateProxyServer(localAddressIP, port) {
  try {
    const proxy = httpProxy.createProxyServer({});
    const server = http.createServer((req, res) => {
      log("HTTP request for: " + req.url);

      const targetUrl = new url.URL(req.url);
      const options = {
        changeOrigin: true,
        localAddress: localAddressIP,
        target: targetUrl.origin,
      };

      proxy.web(req, res, options, (err) => {
        log("Proxy error: " + err);
        res.writeHead(502);
        res.end("Proxy error");
      });
    });

    server.on("connect", (req, clientSocket, head) => {
      log("HTTPS request for: " + req.url);
      const [host, port] = req.url.split(":");
      const proxySocket = net.createConnection(
        { port: port, host: host, localAddress: localAddressIP },
        () => {
          clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
          proxySocket.write(head);
          proxySocket.pipe(clientSocket);
          clientSocket.pipe(proxySocket);
        }
      );
      proxySocket.on("error", (err) => {
        log("Proxy socket error: " + err);
        clientSocket.end("HTTP/1.1 502 Bad Gateway\r\n");
      });

      clientSocket.on("error", (err) => {
        log("Client socket error: " + err);
        proxySocket.end();
      });
    });

    server.listen(port, "127.0.0.1", () => {
      log(`Proxy server is running on 127.0.0.1:${port}`);
    });
  } catch (error) {
    log("Exception in CreateProxyServer: " + error);
  }
}

function getActiveNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const activeInterfaces = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        activeInterfaces.push({
          name: name,
          address: iface.address,
          netmask: iface.netmask,
          mac: iface.mac,
          cidr: iface.cidr,
        });
      }
    }
  }

  return activeInterfaces;
}

const activeInterface = getActiveNetworkInterfaces();
log("Active Network Interface: " + JSON.stringify(activeInterface));

function checkInternetConnection(interface) {
  return new Promise((resolve) => {
    exec(
      `ping -n 1 -S ${interface.address} 8.8.8.8`,
      (error, stdout, stderr) => {
        const success = /Reply from/.test(stdout);
        resolve(success);
      }
    );
  });
}

async function checkAllInterfacesForInternet() {
  const activeInterfaces = getActiveNetworkInterfaces();
  const interfacesWithInternet = [];

  for (const iface of activeInterfaces) {
    const hasInternet = await checkInternetConnection(iface);
    if (hasInternet) {
      interfacesWithInternet.push(iface);
    }
  }

  const phoneInterfaces = interfacesWithInternet.filter(
    (interface) => interface.name !== "LAN FPT"
  );
  log(
    "Network Interfaces with Internet Access: " +
      JSON.stringify(phoneInterfaces)
  );
  return phoneInterfaces;
}



// Read json file
const filePath = "C:\\Users\\tienn\\OneDrive\\Desktop\\ProxyService\\listDevices.json";
async function CheckFileExisted() {
  try {
    await access(filePath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}


async function CheckNewDevices() {
  const isFileListDevicesExisted = await CheckFileExisted();
  let networkInterfaces;

  if (isFileListDevicesExisted) {
    console.log('1');
    // File exists, read the existing data, append new data, and write back
    try {
      const data = await readFile(filePath, 'utf8');
      let existingData = JSON.parse(data);
      const currentPort = existingData.length + 50000 - 1;
      const activeDevices = await checkAllInterfacesForInternet();

      // Get new devices
      const newDevices = activeDevices.filter(device => !existingData.some(d => d.name === device.name));

      const newDataDevices = newDevices.map((device, j) => {
        return {
          ...device,
          port: currentPort + j + 1,
        };
      });

      // Append new data and update IP addresses
      const updatedData_With_Old_IP = existingData.concat(newDataDevices);
      const updatedData_With_New_IP = updatedData_With_Old_IP.map(device => {
        const activeDevice = activeDevices.find(d => d.name === device.name);
        return {
          ...device,
          address: activeDevice ? activeDevice.address : device.address,
        };
      });

      // console.log('updatedData_With_New_IP', updatedData_With_New_IP);

      // Get exactly port according to name
      const getExactlyPortByMac = activeDevices.map((activeDevice, k)=>{
        const device = updatedData_With_New_IP.find(d => d.name === activeDevice.name);
        return {
          ...activeDevice,
          port: device.port,
        }
      })

      networkInterfaces = getExactlyPortByMac;

      // Write the updated data back to the file
      await writeFile(filePath, JSON.stringify(updatedData_With_New_IP, null, 2));
      console.log('Data appended to file successfully.');
    } catch (err) {
      console.error('Error handling file operations:', err);
    }
  } else {
    console.log('2');
    // For the first time running, add port to network devices
    try {
      const currentPort = 50000;
      const activeDevices = await checkAllInterfacesForInternet();
      const newDataDevices = activeDevices.map((device, i) => {
        return {
          ...device,
          port: currentPort + i,
        };
      });

      // console.log('newDataDevices', newDataDevices);

      // File does not exist, create and write initial data
      await writeFile(filePath, JSON.stringify(newDataDevices, null, 2));
      console.log('File created and initial data written.');

      networkInterfaces = newDataDevices;
    } catch (err) {
      console.error('Error creating and writing to file:', err);
    }
  }
  return networkInterfaces;
}

// Start proxy-server
async function ProxyServerStart() {
  try {
    const phoneInterfaces = await CheckNewDevices();
    console.log('Last data', phoneInterfaces);
    phoneInterfaces.forEach((networkDetails, i) => {
      const simAddressIP = networkDetails.address;
      const port = networkDetails.port;
      CreateProxyServer(simAddressIP, port);
    });
  } catch (error) {
    log("Exception in ProxyServerStart: " + error);
  }
}

// ProxyServerStart();

let previousInterfaces = [];
async function checkForNewNetworkInterfaces() {
  try {
    const phoneInterfaces = await checkAllInterfacesForInternet();
    const newInterfaces = phoneInterfaces.filter(
      (iface) => !previousInterfaces.some((prevIface) => prevIface.address === iface.address)
    );
    console.log('newInterfaces',newInterfaces);

    if (newInterfaces.length > 0) {
      log("New network interfaces detected: " + JSON.stringify(newInterfaces));
      newInterfaces.forEach((networkDetails, i) => {
        const simAddressIP = networkDetails.address;
        const port = networkDetails.port; // Assign a default port if not provided
        CreateProxyServer(simAddressIP, port);
      });
    }

    previousInterfaces = phoneInterfaces;
  } catch (error) {
    log("Exception in checkForNewNetworkInterfaces: " + error);
  }
}



// Function to monitor network device changes using WMI
function monitorNetworkDevices() {
  WMI.Query({class: 'Win32_NetworkAdapter'}, (err, networkAdapters) => {
    if (err) {
      log("WMI Query Error: " + err);
      return;
    }

    // Filter for newly connected network adapters
    const newAdapters = networkAdapters.filter(adapter => adapter.NetEnabled && !previousInterfaces.some(prevIface => prevIface.name === adapter.Name));
    if (newAdapters.length > 0) {
      log("New network adapters detected: " + JSON.stringify(newAdapters));
      checkForNewNetworkInterfaces();
    } else {
      log("No new network adapters detected.");
    }
  });
}

// Start proxy-server and monitor for new network devices
async function ProxyServerStart_V2() {
  try {
    await checkForNewNetworkInterfaces();
    setInterval(monitorNetworkDevices, 10000); // Check every 10 seconds
  } catch (error) {
    log("Exception in ProxyServerStart: " + error);
  }
}
// ProxyServerStart_V2()
