"use client"

import type React from "react"
import { useRef, useEffect } from "react"
import { MicOff, VideoOff } from "lucide-react"

interface ParticipantVideoProps {
  stream: MediaStream | null
  isLocal: boolean
  isAudioEnabled: boolean
  isVideoEnabled: boolean
  username: string
}

const ParticipantVideo: React.FC<ParticipantVideoProps> = ({
  stream,
  isLocal,
  isAudioEnabled,
  isVideoEnabled,
  username,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div className="relative overflow-hidden rounded-lg bg-gray-800">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover ${isVideoEnabled ? "" : "hidden"}`}
      />
      {!isVideoEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
          <div className="w-20 h-20 rounded-full bg-gray-500 flex items-center justify-center text-white text-2xl font-bold">
            {username.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center space-x-2">
        <span className="text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
          {username} {isLocal && "(You)"}
        </span>
        {!isAudioEnabled && <MicOff className="w-4 h-4 text-red-500" />}
        {!isVideoEnabled && <VideoOff className="w-4 h-4 text-red-500" />}
      </div>
    </div>
  )
}

export default ParticipantVideo

