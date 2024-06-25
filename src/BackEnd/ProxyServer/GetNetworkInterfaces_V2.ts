import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import util from 'util';

// Promisify fs methods to use with async/await
const access = util.promisify(fs.access);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

interface NetworkInterfaceType {
  name: string;
  address: string;
  netmask: string;
  mac: string;
  cidr: string;
  nat_ip: string;
  port: number;
}

interface LocalDevicesDetails {
    name: string;
    address: string;
    netmask: string;
    mac: string;
    cidr: string;
    port: number;
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
          port: 1000,
        });
      }
    }
  }

  return activeInterfaces;
}

// const activeInterface = getActiveNetworkInterfaces();
// log("Active Network Interface: " + JSON.stringify(activeInterface));

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

  const phoneInterfaces = interfacesWithInternet.filter(
    (networkInterface) => networkInterface.name !== "LAN FPT"
  );
  log(
    "Network Interfaces with Internet Access: " +
      JSON.stringify(phoneInterfaces)
  );
  return phoneInterfaces;
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


// Check new device that is first time attach to pc.
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
      // console.log('activeDevices',activeDevices);

      // Get new devices
      const newDevices = activeDevices.filter(device => !existingData.some((d: LocalDevicesDetails) => d.name === device.name));

      const newDataDevices = newDevices.map((device, j) => {
        return {
          ...device,
          port: currentPort + j + 1,
        };
      });

      // Append new data and update IP addresses
      const updatedData_With_Old_IP = existingData.concat(newDataDevices);
      const updatedData_With_New_IP = updatedData_With_Old_IP.map((device: NetworkInterfaceType) => {
        const activeDevice = activeDevices.find(d => d.name === device.name);
        return {
          ...device,
          address: activeDevice ? activeDevice.address : device.address,
        };
      });

      // console.log('updatedData_With_New_IP', updatedData_With_New_IP);

      // Get exactly port according to name
      const getExactlyPortByMac = activeDevices.map((activeDevice, k)=>{
        const device = updatedData_With_New_IP.find((d: NetworkInterfaceType) => d.name === activeDevice.name);
        return {
          ...activeDevice,
          port: device.port,
        }
      });
      // console.log('getExactlyPortByMac',getExactlyPortByMac);

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
      const activeDevices: NetworkInterfaceType[] = await checkAllInterfacesForInternet();
      const newDataDevices = activeDevices.map( (device: NetworkInterfaceType, i) => {
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


// async function QueryNetworkInterface() {
//   try {
//     const interfacesWithInternet = await checkAllInterfacesForInternet();
//     const phoneInterfaces = interfacesWithInternet.filter(
//       (iface: NetworkInterfaceType) => iface.name !== "LAN FPT"
//     );

//     // Get default port from local file
//     const fileExisted = await CheckFileExisted();
//     if (fileExisted) {
//         const data = await readFile(filePath, 'utf8');
//         let existingData: LocalDevicesDetails[] = JSON.parse(data);
//         for (let i = 0; i < phoneInterfaces.length; i++) {
//             const iFace = phoneInterfaces[i];

//             // Add nat_ip
//             const publicIp = await getPublicIpUsingCurl(iFace.address)
//             .then((res: any) => {
//               return res;
//             })
//             .catch((error: any) => console.log("error", error));
//             iFace.nat_ip = publicIp || "";

//             // Get default port
//             const device = existingData.find((item: any) => item.name === iFace.name);
//             const port = device.port;
//             iFace.port = port;
//         }
//     }
//     return phoneInterfaces;
//   } catch (error) {
//     console.log("QueryNetworkInterface error:", error);
//     return "No network device connected";
//   }
// }

export { 
  // Functions

  CheckNewDevices,
  getPublicIpUsingCurl,

  // Type
  LocalDevicesDetails, 
  NetworkInterfaceType
}