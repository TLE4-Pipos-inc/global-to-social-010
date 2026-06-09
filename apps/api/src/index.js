import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import path from "path"
import http from "http"
import { fileURLToPath } from "url"
import matchesRouter from "@/routes/matches.js"
import sessionsRouter from "@/routes/sessions.js"
import { attachSocketServer } from "@/sockets/index.js"
import authRouter from "@/routes/auth.js"
import conversationStartersRouter from "@/routes/conversations-starters.js"
import interestsRouter from "@/routes/interests.js"
import venuesRouter from "@/routes/venues.js"
import usersRouter from "@/routes/users.js"
import userInterestsRouter from "@/routes/user-interests.js"
import themaRouteRouter from "@/routes/thema-route.js"
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
    origin: "*",
    credentials: true, // required to allow cookies cross-origin
  })
)

// Routes
app.use("/api/auth", authRouter)
app.use("/api/sessions", sessionsRouter)
app.use("/api/matches", matchesRouter)
app.use("/api/users", usersRouter)
app.use("/api/user-interests", userInterestsRouter)

app.use("/websocket-test", express.static(publicDir))
app.get("/websocket-test", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"))
})
app.use("/api/conversation-starters", conversationStartersRouter)
app.use("/api/interests", interestsRouter)
app.use("/api/venues", venuesRouter)
app.use("/api/thema-route", themaRouteRouter)

app.get("/api/status", (_req, res) => {
  res.json({ message: "API is running" })
})

app.get("/api/docs", (_req, res) => {
  res.sendFile(path.join(publicDir, "docs.html"))
})

app.get("/api/docs/content", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "../API.md"))
})

const server = http.createServer(app)
attachSocketServer(server, { corsOrigin: clientOrigin })

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`)
  console.log(`Socket.IO ready on ws://localhost:${port}`)
})
