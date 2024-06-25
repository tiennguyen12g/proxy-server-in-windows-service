// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer,  } from "electron";
// Type


contextBridge.exposeInMainWorld("electronAPI", {

    // Manage proxy-server
    proxy_server_Start: () => ipcRenderer.invoke("start-proxy-service"),
    proxy_server_Stop: (params: number[]) => ipcRenderer.invoke("stop-proxy-service", params),

    proxy_server_responce_on_start: (callback: any) => ipcRenderer.on('response-on-proxy-server-start', callback),
    proxy_server_responce_on_stop: (callback: any) => ipcRenderer.on('response-on-proxy-server-stop', callback),
    proxy_server_responce_on_running: (callback: any) => ipcRenderer.on('response-on-proxy-server-running', callback),

})