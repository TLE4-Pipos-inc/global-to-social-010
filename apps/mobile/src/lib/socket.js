import { io } from "socket.io-client"
import { API_URL } from "@/constants/api"
import { getAccessToken } from "@/lib/token"

let socket = null

/**
 * Create (or return the existing) Socket.IO connection.
 *
 * The server authenticates the handshake from `auth.token` (a JWT), falling
 * back to a Bearer header or cookie. React Native has no cookies here, so we
 * must pass the access token explicitly.
 */
export function createSocket() {
  if (socket) return socket

  socket = io(API_URL, {
    auth: { token: getAccessToken() },
    transports: ["websocket"],
    // Let socket.io reconnect automatically; the server re-pushes the current
    // party on every (re)connection so the UI restores itself.
    reconnection: true,
  })

  return socket
}

export function getSocket() {
  return socket
}

/**
 * Push the latest access token onto the live socket and force a reconnect so
 * the new credentials are used on the next handshake.
 */
export function refreshSocketAuth() {
  if (!socket) return
  socket.auth = { token: getAccessToken() }
  if (socket.connected) {
    socket.disconnect().connect()
  } else {
    socket.connect()
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
