import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import authRouter from "./routes/auth.js"

// ConnectDB();

const app = express()
const port = Number(process.env.PORT ?? 3000)

app.use(express.json())
app.use(cookieParser())
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true, // required to allow cookies cross-origin
  })
)

// Routes
app.use("/api/auth", authRouter)

app.get("/api/status", (_req, res) => {
  res.json({ message: "API is running" })
})

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`)
})
