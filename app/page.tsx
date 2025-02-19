"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function Home() {
  const [roomId, setRoomId] = useState("")
  const router = useRouter()

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(7)
    router.push(`/room/${newRoomId}`)
  }

  const joinRoom = () => {
    if (roomId) {
      router.push(`/room/${roomId}`)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">WebRTC Video Call</h1>
      <div className="flex flex-col items-center space-y-4">
        <Button onClick={createRoom} className="w-full">
          Create New Room
        </Button>
        <div className="flex w-full space-x-2">
          <Input type="text" placeholder="Enter Room ID" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
          <Button onClick={joinRoom}>Join Room</Button>
        </div>
      </div>
    </main>
  )
}

