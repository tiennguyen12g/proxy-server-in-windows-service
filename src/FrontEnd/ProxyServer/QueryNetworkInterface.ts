// Create array network interface that has internet
import {
    checkAllInterfacesForInternet,
    getPublicIpUsingCurl,  
    NetworkInterfaceType,
} from "./GetInterfaceIp"

async function QueryNetworkInterface () {
    try {
        const interfacesWithInternet = await checkAllInterfacesForInternet();
        const phoneInterfaces = interfacesWithInternet.filter((iface: NetworkInterfaceType) => iface.name !== "LAN FPT");
        for(let i = 0; i < phoneInterfaces.length ; i++){
            const iFace = phoneInterfaces[i];
            const publicIp = await getPublicIpUsingCurl(iFace.address).then((res: any) => {
                return res;
            }).catch((error: any) => console.log('error',error));
            iFace.nat_ip = publicIp || "";
        }
    } catch (error) {
        console.log('QueryNetworkInterface error:', error);
    }
}