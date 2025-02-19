"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import io from "socket.io-client"
import VideoCall from "@/components/VideoCall"

export default function Room() {
  const [socket, setSocket] = useState<any>(null)
  const params = useParams()
  const roomId = params.id as string

  useEffect(() => {
    const newSocket = io("http://localhost:3001") // Replace with your server URL
    newSocket.emit("join-room", roomId)
    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [roomId])

  if (!socket) return <div>Connecting...</div>

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold mb-8">Room: {roomId}</h1>
      <VideoCall socket={socket} roomId={roomId} />
    </main>
  )
}

