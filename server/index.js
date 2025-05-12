const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

io.on("connection", (socket) => {
  console.log("Bağlandı:", socket.id);

  socket.on("offer", (data) => socket.broadcast.emit("offer", data));
  socket.on("answer", (data) => socket.broadcast.emit("answer", data));
  socket.on("ice-candidate", (data) => socket.broadcast.emit("ice-candidate", data));

  socket.on("disconnect", () => {
    console.log("Ayrıldı:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Sinyal sunucusu çalışıyor: http://localhost:3000");
});