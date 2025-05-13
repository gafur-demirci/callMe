const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*" },
});

const users = {}; // username -> socket.id

io.on("connection", (socket) => {
  socket.on("register", (username) => {
    users[username] = socket.id;
    socket.username = username;
    io.emit("user-list", Object.keys(users));
  });

  socket.on("offer", ({ target, offer, from }) => {
    const targetId = users[target];
    if (targetId) io.to(targetId).emit("offer", { offer, from });
  });

  socket.on("answer", ({ target, answer }) => {
    const targetId = users[target];
    if (targetId) io.to(targetId).emit("answer", answer);
  });

  socket.on("ice-candidate", ({ target, candidate }) => {
    const targetId = users[target];
    if (targetId) io.to(targetId).emit("ice-candidate", candidate);
  });

  socket.on("call-cancelled", ({ target }) => {
    const targetId = users[target];
    if (targetId) io.to(targetId).emit("call-cancelled");
  });

  socket.on("disconnect", () => {
    delete users[socket.username];
    io.emit("user-list", Object.keys(users));
  });
});

server.listen(3000, () => {
  console.log("Signaling server listening on port 3000");
});