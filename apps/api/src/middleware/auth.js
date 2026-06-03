import { verifyAccess } from "../lib/jwt-helper.js"

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null
  const token = bearerToken || req.cookies?.access_token
  if (!token) {
    return res.status(401).json({ message: "Authentication token is required" })
  }
  
  try {
    console.log("Received token:", token)
    const payload = verifyAccess(token)
    res.locals.payload = payload
    return next()
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" })
  }
}
