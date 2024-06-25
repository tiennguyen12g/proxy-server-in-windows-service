import React, { useEffect, useState } from "react";
import TableDevices, {NetworkInterfaceType} from "./TableDevices";


export default function MainProxyServer() {
  const [listDevices, setListDevices] = useState<NetworkInterfaceType[]>([]);
  const startProxyService = async () => {
    try {
      await  window.electronAPI.proxy_server_Start();
    } catch (error) {
      console.log("Start Proxy Service Error:", error);
    }
  };
  const stopProxyService = async () => {
    try {
      await  window.electronAPI.proxy_server_Stop([50000]);
    } catch (error) {
      console.log("Stop Proxy Service Error:", error);
    }
  };

  useEffect(() => {
    // const onProxyServerStart = window.electronAPI.proxy_server_responce_on_start();
    window.electronAPI.proxy_server_responce_on_start((event: any, {success, message}: any) => {
      if (success) {
        const networks = message.networks;
        console.log(`${message.message}`);
        console.log('networks', networks);
        setListDevices(networks);
      } else {
        console.log("Nothing");
      }
    });

  },[])
  const obj: NetworkInterfaceType[] = [
    {
        "name": "Samsung 2A",
        "address": "192.168.102.82",
        "netmask": "255.255.255.0",
        "mac": "72:b7:bc:3f:c3:26",
        "cidr": "192.168.102.82/24",
        "nat_ip": "",
        "port": 50000
    }
]
  return (
    <div>
      <h4>Manage Proxy Service</h4>
      <button onClick={startProxyService}>Start All</button>
      <button onClick={stopProxyService}>Stop All</button>
      <TableDevices interfacesWithInternet={obj}/>
    </div>
  );
}

// Read json file
const filePath = "C:\\Users\\tienn\\OneDrive\\Desktop\\ProxyService\\listDevices.json";

async function ReadJsonInReact(filePath: string) {
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
