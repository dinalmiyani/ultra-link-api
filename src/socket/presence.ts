import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";

interface PresenceUser {
  id: string;
  name: string;
  color: string;
  page: string;
  socketId: string;
}

const connectedUsers = new Map<string, PresenceUser>();

export function initSocketServer(httpServer: HttpServer, corsOrigin: string) {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("presence:join", (user: Omit<PresenceUser, "socketId">) => {
      const presenceUser: PresenceUser = { ...user, socketId: socket.id };

      // Store in map
      connectedUsers.set(socket.id, presenceUser);

      socket.join(user.page);

      broadcastPresence(io, user.page);

      console.log(`${user.name} joined room: ${user.page}`);
    });

    socket.on("presence:move", (newPage: string) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      socket.leave(user.page);
      const oldPage = user.page;
      user.page = newPage;
      socket.join(newPage);

      broadcastPresence(io, oldPage);
      broadcastPresence(io, newPage);
    });

    socket.on("disconnect", () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        connectedUsers.delete(socket.id);
        broadcastPresence(io, user.page);
        console.log(`${user.name} disconnected`);
      }
    });
  });

  return io;
}

// Broadcast the current user list for a given page to everyone in that room
function broadcastPresence(io: SocketServer, page: string) {
  const usersOnPage = Array.from(connectedUsers.values())
    .filter((u) => u.page === page)
    .map(({ socketId: _, ...user }) => user);

  io.to(page).emit("presence:update", usersOnPage);
}