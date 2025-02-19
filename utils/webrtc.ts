import type { Socket } from "socket.io-client"

export const initializePeerConnection = async (
  localVideo: HTMLVideoElement,
  remoteVideo: HTMLVideoElement,
  socket: Socket,
): Promise<RTCPeerConnection> => {
  const configuration: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  }

  const peerConnection = new RTCPeerConnection(configuration)

  peerConnection.ontrack = (event) => {
    if (remoteVideo.srcObject !== event.streams[0]) {
      remoteVideo.srcObject = event.streams[0]
    }
  }

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", event.candidate)
    }
  }

  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream))

  localVideo.srcObject = stream

  return peerConnection
}

export const handleSignalingData = async (peerConnection: RTCPeerConnection, data: any, socket: Socket) => {
  if (data.type === "offer") {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data))
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)
    socket.emit("answer", answer)
  } else if (data.type === "answer") {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data))
  } else if (data.type === "candidate") {
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
  }
}

export const startScreenShare = async (
  peerConnection: RTCPeerConnection,
  localVideo: HTMLVideoElement,
): Promise<MediaStream> => {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
    const videoTrack = screenStream.getVideoTracks()[0]

    const sender = peerConnection.getSenders().find((s) => s.track?.kind === "video")
    if (sender) {
      sender.replaceTrack(videoTrack)
    } else {
      peerConnection.addTrack(videoTrack, screenStream)
    }

    localVideo.srcObject = screenStream
    return screenStream
  } catch (error) {
    console.error("Error starting screen share:", error)
    throw error
  }
}

export const stopScreenShare = async (
  peerConnection: RTCPeerConnection,
  localVideo: HTMLVideoElement,
): Promise<MediaStream> => {
  try {
    const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    const videoTrack = userStream.getVideoTracks()[0]

    const sender = peerConnection.getSenders().find((s) => s.track?.kind === "video")
    if (sender) {
      sender.replaceTrack(videoTrack)
    }

    localVideo.srcObject = userStream
    return userStream
  } catch (error) {
    console.error("Error stopping screen share:", error)
    throw error
  }
}

