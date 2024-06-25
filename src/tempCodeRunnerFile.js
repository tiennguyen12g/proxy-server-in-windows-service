const { exec } = require('child_process');
const { error } = require('console');
async function getPublicIpUsingCurl(sourceIp) {
    return new Promise((resolve, reject) => {
      exec(`curl --interface ${sourceIp} http://api.ipify.org?format=json`, (error, stdout, stderr) => {
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
      });
    });
  }

// const a = getPublicIpUsingCurl("192.168.102.82").then((res) => console.log('res', res)).catch((error) => console.log('error', error));

// Read json file
const filePath = "C:\\Users\\tienn\\OneDrive\\Desktop\\ProxyService\\listDevices.json";

async function ReadJsonInReact(filePath) {
  let dataDevices;
  await fetch(filePath)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }
      return response.json();
    })
    .then((data) => {
      dataDevices = data;
    })
    .catch((error) => {
      console.error(
        "There has been a problem with your fetch operation:",
        error
      );
    });

  return dataDevices;
}

// ReadJsonInReact(filePath).then((res) => console.log('res', res)).catch((error)=> console.log('error', error))
const b = ReadJsonInReact(filePath);
console.log('b', b);