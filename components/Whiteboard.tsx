"use client"

import type React from "react"
import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Eraser, PenTool } from "lucide-react"

interface WhiteboardProps {
  peerConnections: { [key: string]: RTCPeerConnection }
}

const Whiteboard: React.FC<WhiteboardProps> = ({ peerConnections }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState("#000000")
  const [lineWidth, setLineWidth] = useState(2)
  const [tool, setTool] = useState<"pen" | "eraser">("pen")

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    const dataChannels: RTCDataChannel[] = []

    Object.values(peerConnections).forEach((pc) => {
      const dataChannel = pc.createDataChannel("whiteboard")
      dataChannels.push(dataChannel)

      dataChannel.onmessage = (event) => {
        const data = JSON.parse(event.data)
        drawLine(context, data.x0, data.y0, data.x1, data.y1, data.color, data.lineWidth)
      }
    })

    const drawLine = (
      context: CanvasRenderingContext2D,
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      color: string,
      lineWidth: number,
    ) => {
      context.beginPath()
      context.moveTo(x0, y0)
      context.lineTo(x1, y1)
      context.strokeStyle = color
      context.lineWidth = lineWidth
      context.lineCap = "round"
      context.stroke()
    }

    let lastX = 0
    let lastY = 0

    const draw = (e: MouseEvent) => {
      if (!isDrawing) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      drawLine(context, lastX, lastY, x, y, tool === "eraser" ? "#FFFFFF" : color, lineWidth)

      dataChannels.forEach((dc) => {
        if (dc.readyState === "open") {
          dc.send(
            JSON.stringify({
              x0: lastX,
              y0: lastY,
              x1: x,
              y1: y,
              color: tool === "eraser" ? "#FFFFFF" : color,
              lineWidth,
            }),
          )
        }
      })

      lastX = x
      lastY = y
    }

    canvas.addEventListener("mousedown", (e) => {
      setIsDrawing(true)
      const rect = canvas.getBoundingClientRect()
      lastX = e.clientX - rect.left
      lastY = e.clientY - rect.top
    })

    canvas.addEventListener("mousemove", draw)
    canvas.addEventListener("mouseup", () => setIsDrawing(false))
    canvas.addEventListener("mouseout", () => setIsDrawing(false))

    return () => {
      canvas.removeEventListener("mousedown", () => {})
      canvas.removeEventListener("mousemove", draw)
      canvas.removeEventListener("mouseup", () => {})
      canvas.removeEventListener("mouseout", () => {})
    }
  }, [isDrawing, color, lineWidth, tool, peerConnections])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    context.clearRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <div className="mt-4 p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Collaborative Whiteboard</h3>
      <div className="flex items-center space-x-2 mb-2">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8" />
        <input
          type="range"
          min="1"
          max="20"
          value={lineWidth}
          onChange={(e) => setLineWidth(Number.parseInt(e.target.value))}
          className="w-32"
        />
        <Button
          onClick={() => setTool("pen")}
          className={`bg-blue-500 hover:bg-blue-600 text-white ${tool === "pen" ? "ring-2 ring-blue-300" : ""}`}
        >
          <PenTool className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => setTool("eraser")}
          className={`bg-gray-500 hover:bg-gray-600 text-white ${tool === "eraser" ? "ring-2 ring-gray-300" : ""}`}
        >
          <Eraser className="h-4 w-4" />
        </Button>
        <Button onClick={clearCanvas} className="bg-red-500 hover:bg-red-600 text-white">
          Clear
        </Button>
      </div>
      <canvas ref={canvasRef} width={800} height={400} className="border border-gray-300 rounded" />
    </div>
  )
}

export default Whiteboard

