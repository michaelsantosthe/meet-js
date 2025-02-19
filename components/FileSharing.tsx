import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Upload, Download } from "lucide-react"

interface FileSharingProps {
  peerConnections: { [key: string]: RTCPeerConnection }
}

const FileSharing: React.FC<FileSharingProps> = ({ peerConnections }) => {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [isReceiving, setIsReceiving] = useState(false)
  const [receivedFileName, setReceivedFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0])
    }
  }

  const sendFile = () => {
    if (!file) return

    Object.values(peerConnections).forEach((pc) => {
      const dataChannel = pc.createDataChannel("fileTransfer")
      dataChannel.binaryType = "arraybuffer"

      dataChannel.onopen = () => {
        const chunkSize = 16384
        const fileReader = new FileReader()
        let offset = 0

        fileReader.onload = (e) => {
          if (e.target?.result && typeof e.target.result !== "string") {
            dataChannel.send(e.target.result)
            offset += e.target.result.byteLength
            setProgress(Math.round((offset / file.size) * 100))

            if (offset < file.size) {
              readSlice(offset)
            } else {
              dataChannel.send(JSON.stringify({ type: "file-complete", name: file.name }))
            }
          }
        }

        const readSlice = (o: number) => {
          const slice = file.slice(o, o + chunkSize)
          fileReader.readAsArrayBuffer(slice)
        }

        readSlice(0)
      }
    })
  }

  const setupFileReceiving = () => {
    Object.values(peerConnections).forEach((pc) => {
      pc.ondatachannel = (event) => {
        const dataChannel = event.channel
        dataChannel.binaryType = "arraybuffer"

        let receivedBuffers: ArrayBuffer[] = []
        let receivedSize = 0

        dataChannel.onmessage = (event) => {
          if (typeof event.data === "string") {
            const message = JSON.parse(event.data)
            if (message.type === "file-complete") {
              setIsReceiving(false)
              setReceivedFileName(message.name)
              const blob = new Blob(receivedBuffers)
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = message.name
              a.click()
              URL.revokeObjectURL(url)
            }
          } else {
            receivedBuffers.push(event.data)
            receivedSize += event.data.byteLength
            setProgress(Math.round((receivedSize / file!.size) * 100))
          }
        }

        dataChannel.onopen = () => {
          setIsReceiving(true)
          receivedBuffers = []
          receivedSize = 0
        }
      }
    })
  }

  useEffect(() => {
    setupFileReceiving()
  }, [peerConnections])

  return (
    <div className="mt-4 p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">File Sharing</h3>
      <div className="flex items-center space-x-2">
        <Input type="file" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
        <Button onClick={() => fileInputRef.current?.click()} className="bg-blue-500 hover:bg-blue-600 text-white">
          <Upload className="mr-2 h-4 w-4" /> Select File
        </Button>
        <Button onClick={sendFile} disabled={!file} className="bg-green-500 hover:bg-green-600 text-white">
          <Download className="mr-2 h-4 w-4" /> Send File
        </Button>
      </div>
      {file && <p className="mt-2">Selected file: {file.name}</p>}
      {(progress > 0 || isReceiving) && (
        <div className="mt-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-gray-600 mt-1">
            {isReceiving ? "Receiving: " : "Sending: "}
            {progress}%
          </p>
        </div>
      )}
      {receivedFileName && <p className="mt-2 text-green-600">File received: {receivedFileName}</p>}
    </div>
  )
}

export default FileSharing

