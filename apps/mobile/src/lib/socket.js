import { io } from "socket.io-client";
let socket = null;

export function createSocket(authData) {
  if (socket) return socket;

  socket = io("http://localhost:8000", {
    auth: { data: authData },
    transports: ["websocket"],
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}