const fs = require("fs");
const path = require("path");
const logFile = path.join(__dirname, "proxy_server.log");
const http = require("http");
const net = require("net");
const url = require("url");
const httpProxy = require("http-proxy");


function log(message) {
  fs.appendFileSync(logFile, `${new Date().toISOString()} - ${message}\n`);
}

log("Starting proxy server...");
const proxyServers = new Map();
function CreateProxyServer(localAddressIP, port) {
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

      proxy.web(req, res, options, (err) => {
        log("Proxy error: " + err);
        res.writeHead(502);
        res.end("Proxy error");
      });
    });

    server.on("connect", (req, clientSocket, head) => {
      log("HTTPS request for: " + req.url);
      const [host, port] = req.url.split(":");
      const proxySocket = net.createConnection(
        { port: port, host: host, localAddress: localAddressIP },
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
    });
  } catch (error) {
    log("Exception in CreateProxyServer: " + error);
  }
}
function stopProxyServer(port) {
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
// Socket server to receive data from Electron app
const socketServer = net.createServer((socket) => {
    socket.on('data', (data) => {
      try {
        const message = JSON.parse(data);
        console.log('message',message);
        if (message.command === 'start') {
          const { localAddressIP, port } = message;
          log(`Received start command - IP: ${localAddressIP}, Port: ${port}`);
          CreateProxyServer(localAddressIP, port);
          socket.write('Proxy server started successfully\n');
        } else if (message.command === 'stop') {
          const { port } = message;
          log(`Received stop command - Port: ${port}`);
          stopProxyServer(port);
          socket.write(`Proxy server on port ${port} stopped successfully\n`);
        } else {
          log('Unknown command');
          socket.write('Unknown command\n');
        }
      } catch (error) {
        log('Error parsing data: ' + error);
        socket.write('Error processing command\n');
      }
    });
  
    socket.on('error', (err) => {
      log('Socket error: ' + err);
    });
  
    socket.on('close', () => {
      log('Socket connection closed');
    });
  });
  

const SOCKET_PORT = 8004; // Port for the socket server
socketServer.listen(SOCKET_PORT, '127.0.0.1', () => {
  log(`Socket server listening on port ${SOCKET_PORT}`);
});
