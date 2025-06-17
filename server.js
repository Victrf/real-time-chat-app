const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const roomUsers = {}; // { room: [{ id, username }] }
const roomHistory = {}; // { room: [message1, message2, ...] }

function addUserToRoom(room, user) {
    if (!roomUsers[room]) roomUsers[room] = [];
    roomUsers[room] = roomUsers[room].filter(u => u.id !== user.id);
    roomUsers[room].push(user);
}

function removeUserFromRoom(room, socketId) {
    if (!roomUsers[room]) return;
    roomUsers[room] = roomUsers[room].filter(u => u.id !== socketId);
    if (roomUsers[room].length === 0) delete roomUsers[room];
}

function getRoomUserList(room) {
    return roomUsers[room] || [];
}

function addToHistory(room, msgObj) {
    if (!roomHistory[room]) roomHistory[room] = [];
    roomHistory[room].push(msgObj);
    if (roomHistory[room].length > 100) roomHistory[room].shift(); // Limit history
}

io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    socket.on("joinRoom", ({ room, username }) => {
        socket.join(room);
        socket.room = room;
        socket.username = username;

        addUserToRoom(room, { id: socket.id, username });

        // Send old messages (chat history)
        (roomHistory[room] || []).forEach(msg => {
            const event = msg.file ? "fileMessage" : "message";
            socket.emit(event, msg);
        });

        socket.to(room).emit("message", {
            username: "System",
            message: `🔔 ${username} joined room ${room}`,
        });

        io.to(room).emit("roomUsers", getRoomUserList(room));
    });

    socket.on("chatMessage", ({ room, message }) => {
        const msgObj = { username: socket.username, message };
        addToHistory(room, msgObj);
        io.to(room).emit("message", msgObj);
    });

    // 🔒 PRIVATE MESSAGE
    socket.on("privateMessage", ({ toSocketId, message }) => {
        io.to(toSocketId).emit("message", {
            username: `${socket.username} (private)`,
            message,
            private: true
        });
    });

    // ✉️ FILE MESSAGE
    socket.on("fileMessage", ({ room, filename, filetype, data }) => {
        const msgObj = {
            username: socket.username,
            file: { filename, filetype, data }
        };
        addToHistory(room, msgObj);
        io.to(room).emit("fileMessage", msgObj);
    });

    // ✍️ TYPING
    socket.on("typing", ({ room, username, isTyping }) => {
        socket.to(room).emit("typing", { username, isTyping });
    });

    // ❌ DISCONNECT
    socket.on("disconnect", () => {
        const { room, username } = socket;

        if (room) {
            removeUserFromRoom(room, socket.id);

            socket.to(room).emit("message", {
                username: "System",
                message: `❌ ${username} left the room`,
            });

            io.to(room).emit("roomUsers", getRoomUserList(room));
        }

        console.log("❌ User disconnected:", socket.id);
    });

    socket.on("fileMessage", ({ room, username, file }) => {
        io.to(room).emit("fileMessage", {
            username,
            file,
        });
    });
    
});

server.listen(3000, () => {
    console.log("🚀 Server running on http://localhost:3000");
});
