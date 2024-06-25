const os = require("os");
const fs = require("fs");

// Get all devices that provide internet
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

  log(
    "Network Interfaces with Internet Access: " +
      JSON.stringify(interfacesWithInternet)
  );
  return interfacesWithInternet;
}

const list_MacID_Port = [
  {
    mac: "",
    phoneName: "phone1",
    port: 80000,
    ip: "",
  },
];

// Function to create and write the JSON file
function writeJSONFile(filename, data) {
  fs.writeFile(filename, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.error(
        "An error occurred while writing JSON Object to File.",
        err
      );
    } else {
      console.log("JSON file has been saved.");
    }
  });
}

// Call the function to write the JSON file
writeJSONFile("listDevices.json", list_MacID_Port);

// Function to read the JSON file
function readJSONFile(filename, callback) {
  fs.readFile(filename, "utf8", (err, data) => {
    if (err) {
      console.error("An error occurred while reading the JSON file.", err);
      callback(err, null);
    } else {
      try {
        const jsonData = JSON.parse(data);
        callback(null, jsonData);
      } catch (parseErr) {
        console.error(
          "An error occurred while parsing the JSON file.",
          parseErr
        );
        callback(parseErr, null);
      }
    }
  });
}

// Call the function to read the JSON file
readJSONFile("listDevices.json", (err, data) => {
  if (err) {
    console.error("Failed to read the file:", err);
  } else {
    console.log("JSON file content:", data);
  }
});

// Function to update the "mac" field of a specific phone
function updateDeviceDetails(phoneName, newMac) {
    // Read the existing data
    readJSONFile('data.json', (err, data) => {
      if (err) {
        console.error("Failed to read the file:", err);
      } else {
        // Update the "mac" field for the specified phoneName
        const phone = data.find(item => item.phoneName === phoneName);
        if (phone) {
          phone.mac = newMac;
          // Write the updated data back to the JSON file
          writeJSONFile('data.json', data);
        } else {
          console.log(`Phone with name ${phoneName} not found.`);
        }
      }
    });
  }
// Update the "mac" field for "phone1"
updateDeviceDetails('phone1', '00:1A:2B:3C:4D:5E');  

module.exports = {
    readJSONFile,
    writeJSONFile,
    updateDeviceDetails
}