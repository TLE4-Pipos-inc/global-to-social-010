import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import venuesRouter from "@/routes/venues.js"
import authRouter from "@/routes/auth.js"
import conversationStartersRouter from "@/routes/conversations_starters.js"
import interestsRouter from "@/routes/interests.js"

// ConnectDB();

const app = express()
const port = Number(process.env.PORT ?? 3000)

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
app.use("/api/conversation-starters", conversationStartersRouter)
app.use("/api/interests", interestsRouter)
app.use("/api/venues", venuesRouter)

app.get("/api/status", (_req, res) => {
  res.json({ message: "API is running" })
})

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`)
})
