import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import util from 'util';

// Promisify fs methods to use with async/await
const access = util.promisify(fs.access);
const readFile = util.promisify(fs.readFile);

interface NetworkInterfaceType {
  name: string;
  address: string;
  netmask: string;
  mac: string;
  cidr: string;
  nat_ip: string;
  port: string;
}

interface LocalDevicesDetails {
    name: string;
    address: string;
    netmask: string;
    mac: string;
    cidr: string;
    port: string;
}
const logFile = path.join(__dirname, "proxy_server.log");

function log(message: string) {
  fs.appendFileSync(logFile, `${new Date().toISOString()} - ${message}\n`);
}
log("Starting proxy server...");
function getActiveNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const activeInterfaces: NetworkInterfaceType[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        activeInterfaces.push({
          name: name,
          address: iface.address,
          netmask: iface.netmask,
          mac: iface.mac,
          cidr: iface.cidr,
          nat_ip: "",
          port:"",
        });
      }
    }
  }

  return activeInterfaces;
}

const activeInterface = getActiveNetworkInterfaces();
log("Active Network Interface: " + JSON.stringify(activeInterface));

function checkInternetConnection(iface: NetworkInterfaceType) {
  return new Promise((resolve) => {
    exec(`ping -n 1 -S ${iface.address} 8.8.8.8`, (error, stdout, stderr) => {
      const success = /Reply from/.test(stdout);
      resolve(success);
    });
  });
}

async function checkAllInterfacesForInternet() {
  const activeInterfaces: NetworkInterfaceType[] = getActiveNetworkInterfaces();
  const interfacesWithInternet = [];

  for (const iface of activeInterfaces) {
    const hasInternet = await checkInternetConnection(iface);
    if (hasInternet) {
      interfacesWithInternet.push(iface);
    }
  }

  log(
    "Network Interfaces with Internet Access: " +
      JSON.stringify(interfacesWithInternet)
  );
  return interfacesWithInternet;
}

async function getPublicIpUsingCurl(ipv4: string) {
  return new Promise((resolve, reject) => {
    exec(
      `curl --interface ${ipv4} http://api.ipify.org?format=json`,
      (error, stdout, stderr) => {
        if (error) {
          reject(`Error fetching public IP address: ${stderr}`);
        } else {
          try {
            const response = JSON.parse(stdout);
            resolve(response.ip);
          } catch (parseError) {
            reject(`Error parsing response: ${parseError}`);
          }
        }
      }
    );
  });
}



// Read json file
const filePath = "C:\\Users\\tienn\\OneDrive\\Desktop\\ProxyService\\listDevices.json";
async function CheckFileExisted() {
  try {
    await access(filePath, fs.constants.F_OK);
    console.log('File is existed');
    return true;
  } catch (err) {
    console.log('File does not existed', err);
    return false;
  }
}
async function QueryNetworkInterface() {
  try {
    const interfacesWithInternet = await checkAllInterfacesForInternet();
    const phoneInterfaces = interfacesWithInternet.filter(
      (iface: NetworkInterfaceType) => iface.name !== "LAN FPT"
    );

    // Get default port from local file
    const fileExisted = await CheckFileExisted();
    if (fileExisted) {
        const data = await readFile(filePath, 'utf8');
        let existingData: LocalDevicesDetails[] = JSON.parse(data);
        for (let i = 0; i < phoneInterfaces.length; i++) {
            const iFace = phoneInterfaces[i];

            // Add nat_ip
            const publicIp = await getPublicIpUsingCurl(iFace.address)
            .then((res: any) => {
              return res;
            })
            .catch((error: any) => console.log("error", error));
            iFace.nat_ip = publicIp || "";

            // Get default port
            const device = existingData.find((item: any) => item.name === iFace.name);
            const port = device.port;
            iFace.port = port;
        }
    }
    return phoneInterfaces;
  } catch (error) {
    console.log("QueryNetworkInterface error:", error);
    return "No network device connected";
  }
}

export { QueryNetworkInterface, LocalDevicesDetails, NetworkInterfaceType}
// output look like:
// {
//     name: string;
//     address: string;
//     netmask: string;
//     mac: string;
//     cidr: string;
//     nat_ip: string;
//     port: string;
// }