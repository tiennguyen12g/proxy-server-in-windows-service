export interface IElectronAPI {
  // Manage proxy-server
  proxy_server_Start: () => Promise<void>;
  proxy_server_Stop: (params: number[]) => Promise<void>;

  proxy_server_responce_on_start: (callball: any) => Promise<void>;
  proxy_server_responce_on_stop: (callball: any) => Promise<void>;
  proxy_server_responce_on_running: (callball: any) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
