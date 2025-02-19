"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, Copy } from "lucide-react"
import ParticipantVideo from "./ParticipantVideo"
import FileSharing from "./FileSharing"
import Whiteboard from "./Whiteboard"

interface Participant {
  id: string
  stream: MediaStream | null
  isAudioEnabled: boolean
  isVideoEnabled: boolean
  username: string
}

interface VideoCallProps {
  socket: any // Socket.IO client instance
  roomId: string
}

const VideoCall: React.FC<VideoCallProps> = ({ socket, roomId }) => {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const peerConnections = useRef<{ [key: string]: RTCPeerConnection }>({})

  useEffect(() => {
    const initializeLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        setLocalStream(stream)
        setParticipants([
          {
            id: "local",
            stream,
            isAudioEnabled: true,
            isVideoEnabled: true,
            username: "You",
          },
        ])
      } catch (error) {
        console.error("Error accessing media devices:", error)
      }
    }

    initializeLocalStream()

    socket.on("user-joined", handleUserJoined)
    socket.on("user-left", handleUserLeft)
    socket.on("offer", handleOffer)
    socket.on("answer", handleAnswer)
    socket.on("ice-candidate", handleIceCandidate)

    return () => {
      socket.off("user-joined", handleUserJoined)
      socket.off("user-left", handleUserLeft)
      socket.off("offer", handleOffer)
      socket.off("answer", handleAnswer)
      socket.off("ice-candidate", handleIceCandidate)
    }
  }, [socket])

  const handleUserJoined = async (userId: string) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    })

    peerConnections.current[userId] = peerConnection

    localStream?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream)
    })

    peerConnection.ontrack = (event) => {
      setParticipants((prevParticipants) => [
        ...prevParticipants,
        {
          id: userId,
          stream: event.streams[0],
          isAudioEnabled: true,
          isVideoEnabled: true,
          username: `User ${userId.slice(0, 4)}`,
        },
      ])
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", event.candidate, roomId, userId)
      }
    }

    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)
    socket.emit("offer", offer, roomId, userId)
  }

  const handleUserLeft = (userId: string) => {
    setParticipants((prevParticipants) => prevParticipants.filter((participant) => participant.id !== userId))
    if (peerConnections.current[userId]) {
      peerConnections.current[userId].close()
      delete peerConnections.current[userId]
    }
  }

  const handleOffer = async (offer: RTCSessionDescriptionInit, userId: string) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    })

    peerConnections.current[userId] = peerConnection

    localStream?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream)
    })

    peerConnection.ontrack = (event) => {
      setParticipants((prevParticipants) => [
        ...prevParticipants,
        {
          id: userId,
          stream: event.streams[0],
          isAudioEnabled: true,
          isVideoEnabled: true,
          username: `User ${userId.slice(0, 4)}`,
        },
      ])
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", event.candidate, roomId, userId)
      }
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)
    socket.emit("answer", answer, roomId, userId)
  }

  const handleAnswer = (answer: RTCSessionDescriptionInit, userId: string) => {
    peerConnections.current[userId]?.setRemoteDescription(new RTCSessionDescription(answer))
  }

  const handleIceCandidate = (candidate: RTCIceCandidateInit, userId: string) => {
    peerConnections.current[userId]?.addIceCandidate(new RTCIceCandidate(candidate))
  }

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      audioTrack.enabled = !isAudioEnabled
      setIsAudioEnabled(!isAudioEnabled)
      setParticipants((prevParticipants) =>
        prevParticipants.map((participant) =>
          participant.id === "local" ? { ...participant, isAudioEnabled: !isAudioEnabled } : participant,
        ),
      )
    }
  }

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      videoTrack.enabled = !isVideoEnabled
      setIsVideoEnabled(!isVideoEnabled)
      setParticipants((prevParticipants) =>
        prevParticipants.map((participant) =>
          participant.id === "local" ? { ...participant, isVideoEnabled: !isVideoEnabled } : participant,
        ),
      )
    }
  }

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const videoTrack = screenStream.getVideoTracks()[0]

        setLocalStream((prevStream) => {
          if (prevStream) {
            const oldVideoTrack = prevStream.getVideoTracks()[0]
            prevStream.removeTrack(oldVideoTrack)
            prevStream.addTrack(videoTrack)
          }
          return prevStream
        })

        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video")
          if (sender) {
            sender.replaceTrack(videoTrack)
          }
        })

        videoTrack.onended = () => {
          toggleScreenShare()
        }

        setIsScreenSharing(true)
      } catch (error) {
        console.error("Error starting screen share:", error)
      }
    } else {
      try {
        const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        const videoTrack = userStream.getVideoTracks()[0]

        setLocalStream((prevStream) => {
          if (prevStream) {
            const oldVideoTrack = prevStream.getVideoTracks()[0]
            prevStream.removeTrack(oldVideoTrack)
            prevStream.addTrack(videoTrack)
          }
          return prevStream
        })

        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video")
          if (sender) {
            sender.replaceTrack(videoTrack)
          }
        })

        setIsScreenSharing(false)
      } catch (error) {
        console.error("Error stopping screen share:", error)
      }
    }
  }

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/room/${roomId}`
    navigator.clipboard.writeText(inviteLink).then(() => {
      alert("Invite link copied to clipboard!")
    })
  }

  const leaveCall = () => {
    localStream?.getTracks().forEach((track) => track.stop())
    Object.values(peerConnections.current).forEach((pc) => pc.close())
    setParticipants([])
    socket.emit("leave-room", roomId)
    // Redirect to home page or show "call ended" screen
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="mb-4">
        <Button onClick={copyInviteLink} className="bg-green-500 hover:bg-green-600 text-white">
          <Copy className="mr-2 h-4 w-4" /> Copy Invite Link
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4 w-full max-w-7xl">
        {participants.map((participant) => (
          <ParticipantVideo
            key={participant.id}
            stream={participant.stream}
            isLocal={participant.id === "local"}
            isAudioEnabled={participant.isAudioEnabled}
            isVideoEnabled={participant.isVideoEnabled}
            username={participant.username}
          />
        ))}
      </div>
      <div className="flex space-x-4 mb-4">
        <Button onClick={toggleAudio} className="bg-blue-500 hover:bg-blue-600 text-white">
          {isAudioEnabled ? <Mic /> : <MicOff />}
        </Button>
        <Button onClick={toggleVideo} className="bg-blue-500 hover:bg-blue-600 text-white">
          {isVideoEnabled ? <Video /> : <VideoOff />}
        </Button>
        <Button onClick={toggleScreenShare} className="bg-purple-500 hover:bg-purple-600 text-white">
          <Monitor />
        </Button>
        <Button onClick={leaveCall} className="bg-red-500 hover:bg-red-600 text-white">
          <PhoneOff />
        </Button>
      </div>
      <FileSharing peerConnections={peerConnections.current} />
      <Whiteboard peerConnections={peerConnections.current} />
    </div>
  )
}

export default VideoCall

