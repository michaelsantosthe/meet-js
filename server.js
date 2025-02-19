const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Replace with your client URL
    methods: ["GET", "POST"],
  },
})

const rooms = new Map()

io.on("connection", (socket) => {
  console.log("A user connected")

  socket.on("join-room", (roomId) => {
    socket.join(roomId)
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set())
    }
    rooms.get(roomId).add(socket.id)

    // Notify other users in the room
    socket.to(roomId).emit("user-joined", socket.id)

    // Send list of other users to the new user
    const otherUsers = Array.from(rooms.get(roomId)).filter((id) => id !== socket.id)
    socket.emit("room-users", otherUsers)
  })

  socket.on("offer", (offer, roomId, targetUserId) => {
    socket.to(targetUserId).emit("offer", offer, socket.id)
  })

  socket.on("answer", (answer, roomId, targetUserId) => {
    socket.to(targetUserId).emit("answer", answer, socket.id)
  })

  socket.on("ice-candidate", (candidate, roomId, targetUserId) => {
    socket.to(targetUserId).emit("ice-candidate", candidate, socket.id)
  })

  socket.on("leave-room", (roomId) => {
    if (rooms.has(roomId)) {
      rooms.get(roomId).delete(socket.id)
      if (rooms.get(roomId).size === 0) {
        rooms.delete(roomId)
      } else {
        socket.to(roomId).emit("user-left", socket.id)
      }
    }
    socket.leave(roomId)
  })

  socket.on("disconnect", () => {
    console.log("A user disconnected")
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id)
        if (users.size === 0) {
          rooms.delete(roomId)
        } else {
          socket.to(roomId).emit("user-left", socket.id)
        }
      }
    })
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

