#### Github update
1. git remote add proxy-server-on-windows-service https://github.com/tiennguyen12g/proxy-server-in-windows-service.git
2. git push -u proxy-server-on-windows-service main

#### Create proxy-server with Nodejs and run on windows service
** Advantages
  1. Separate running between electron app and proxy server.
** Disadvantages
  1. It is differcult to control. I have to use socket to build communication between app and service run on window.
  2. The code is more complex.
