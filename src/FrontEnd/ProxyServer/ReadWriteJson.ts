import fs from "fs";
import path from "path";
import fsExtra from "fs-extra";
import { NetworkInterfaceType } from './GetInterfaceIp';

// store static info
interface FileDevicesJsonType {
    mac: string,
    port: number,
    name: string,
    netmask: string,
    cidr: string,
}

// Define the storage path and file path
const storagePath = "C:\\Users\\tienn\\OneDrive\\Desktop\\ProxyService";
const filePath = path.join(storagePath, 'listDevices.json');

// Read json file
async function readJson() {
  try {
    const obj = await fsExtra.readJSONSync(filePath);
    console.log("obj:", obj);
    return obj;
  } catch (error) {
    console.log("readJson error:", error);
    return [];
  }
}

const listDevices: FileDevicesJsonType[] = [
  {
    mac: "",
    name: "",
    netmask: "",
    cidr: "",

    port: 80000,
  },
];

async function WriteAndUpdate(newDataDevices: FileDevicesJsonType[]){
// Check if the file exists
fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File does not exist, create and write initial data
      fs.writeFile(filePath, JSON.stringify(newDataDevices, null, 2), (err) => {
        if (err) {
          console.error("Error creating and writing to file:", err);
        } else {
          console.log("File created and initial data written.");
        }
      });
    } else {
      // File exists, read the existing data, append new data, and write back
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error("Error reading file:", err);
          return;
        }
  
        let existingData;
        try {
          existingData = JSON.parse(data);
        } catch (err) {
          console.error("Error parsing JSON data from file:", err);
          return;
        }
  
        // Append new data
        const updatedData = existingData.concat(newDataDevices);
  
        // Write the updated data back to the file
        fs.writeFile(filePath, JSON.stringify(updatedData, null, 2), (err) => {
          if (err) {
            console.error("Error writing updated data to file:", err);
          } else {
            console.log("Data appended to file successfully.");
          }
        });
      });
    }
  });
}


export { WriteAndUpdate }
export type {
    FileDevicesJsonType
}
