import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"
import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import authRouter from "./routes/auth.js"
import { attachSocketServer } from "./sockets/index.js"

// ConnectDB();

const app = express()
const port = Number(process.env.PORT ?? 3000)
const clientOrigin = process.env.CLIENT_ORIGIN ?? `http://localhost:${port}`
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const publicDir = path.resolve(__dirname, "../public")

app.use(express.json())
app.use(cookieParser())
app.use(
  cors({
    origin: clientOrigin,
    credentials: true, // required to allow cookies cross-origin
  })
)

// Routes
app.use("/api/auth", authRouter)

app.use("/websocket-test", express.static(publicDir))
app.get("/websocket-test", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"))
})

app.get("/api/status", (_req, res) => {
  res.json({ message: "API is running" })
})

const server = http.createServer(app)
attachSocketServer(server, { corsOrigin: clientOrigin })

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`)
  console.log(`Socket.IO ready on ws://localhost:${port}`)
})
