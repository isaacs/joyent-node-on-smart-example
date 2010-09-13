require("http").createServer(function (req, res) {
  res.writeHead(200, {})
  res.end("Hello, world!")
}).listen(80)
