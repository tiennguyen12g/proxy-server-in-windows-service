import fs from "fs";
import path from "path";
const logFile = path.join(__dirname, "proxy_server.log");
import http from "http";
import net from "net";
import url from "url";
import httpProxy from "http-proxy";

function log(message: any) {
  fs.appendFileSync(logFile, `${new Date().toISOString()} - ${message}\n`);
}

log("Starting proxy server...");
const proxyServers = new Map();
async function CreateProxyServer(localAddressIP: string, port: number) {
  return new Promise((resolve, reject) => {
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

        proxy.web(req, res, options, (err: any) => {
          log("Proxy error: " + err);
          res.writeHead(502);
          res.end("Proxy error");
        });
      });

      server.on("connect", (req, clientSocket, head) => {
        log("HTTPS request for: " + req.url);
        const [host, port] = req.url.split(":");
        const proxySocket = net.createConnection(
          { port: Number(port), host: host, localAddress: localAddressIP },
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
        proxyServers.set(port, server);
        resolve(`Proxy server has created successfully as ${localAddressIP}:${port}`);
      });
    } catch (error) {
      log("Exception in CreateProxyServer: " + error);
      reject(new Error('Failed to connect to proxy server after several attempts'));
    }
  });
}

function stopProxyServer(port: number) {
    const server = proxyServers.get(port);
    if (server) {
      server.close(() => {
        log(`Proxy server on port ${port} stopped`);
        proxyServers.delete(port);
      });
    } else {
      log(`No proxy server running on port ${port}`);
    }
  }
export { 
    CreateProxyServer,
    stopProxyServer

 };
