import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import path from "path"
import http from "http"
import { fileURLToPath } from "url"
import matchesRouter from "@/routes/matches"
import sessionsRouter from "@/routes/sessions"
import { attachSocketServer } from "@/sockets/index"
import authRouter from "@/routes/auth"
import conversationStartersRouter from "@/routes/conversations-starters"
import interestsRouter from "@/routes/interests"
import userInterestsRouter from "@/routes/user-interests"
import venuesRouter from "@/routes/venues"
import usersRouter from "@/routes/users"
import themaRouteRouter from "@/routes/thema-route"
import routesRouter from "@/routes/routes"
import routeStopsRouter from "@/routes/route-stops"
import photosRouter from "@/routes/photos"
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
    credentials: true,
  })
)

// Routes
app.use("/api/auth", authRouter)
app.use("/api/sessions", sessionsRouter)
app.use("/api/matches", matchesRouter)
app.use("/api/users", usersRouter)

app.use("/websocket-test", express.static(publicDir))
app.get("/websocket-test", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"))
})
app.use("/api/conversation-starters", conversationStartersRouter)
app.use("/api/interests", interestsRouter)
app.use("/api/user-interests", userInterestsRouter)
app.use("/api/venues", venuesRouter)
app.use("/api/thema-route", themaRouteRouter)
app.use("/api/routes", routesRouter)
app.use("/api/route-stops", routeStopsRouter)
app.use("/api/photos", photosRouter)

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
