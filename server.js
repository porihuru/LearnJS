/*
  Local development server.
  Run with: node server.js
*/
"use strict";

var http = require("http");
var fs = require("fs");
var path = require("path");

var HOST = "127.0.0.1";
var PORT = Number(process.env.PORT || 5500);
var ROOT = path.resolve(__dirname);

var MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function send(res, status, body, contentType) {
  res.writeHead(status, {
    "Content-Type": contentType || "text/plain; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function resolveRequestPath(url) {
  var pathname;
  try {
    pathname = decodeURIComponent(String(url || "/").split("?")[0]);
  } catch (e) {
    return null;
  }

  if (pathname === "/") pathname = "/index.html";

  var filePath = path.resolve(ROOT, "." + pathname);
  if (filePath !== ROOT && filePath.indexOf(ROOT + path.sep) !== 0) return null;
  return filePath;
}

var server = http.createServer(function (req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, "Method Not Allowed");
    return;
  }

  var filePath = resolveRequestPath(req.url);
  if (!filePath) {
    send(res, 400, "Bad Request");
    return;
  }

  fs.stat(filePath, function (statErr, stat) {
    if (statErr || !stat.isFile()) {
      send(res, 404, "Not Found");
      return;
    }

    var contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] ||
      "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store"
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    var stream = fs.createReadStream(filePath);
    stream.on("error", function () {
      if (!res.headersSent) send(res, 500, "Internal Server Error");
      else res.destroy();
    });
    stream.pipe(res);
  });
});

server.listen(PORT, HOST, function () {
  console.log("Quiz server ready: http://" + HOST + ":" + PORT + "/index.html");
});

