import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });

export type messageType = {
  type: "join_room" | "exit_room" | "message";
  roomId: string;
  userId: string;
  message: string;
};

const rooms = new Map<string, Set<WebSocket>>();

wss.on("connection", (ws) => {
  console.log("ws connection established!");

  ws.on("message", (message) => {
    const data: messageType = JSON.parse(message.toString());
    console.log("message received:", data);

    if (data.type === "join_room") {
      if (!rooms.has(data.roomId)) {
        rooms.set(data.roomId, new Set());
      }
      rooms.get(data.roomId)!.add(ws);

      broadcastToRoom(
        data.roomId,
        `👤 User ${data.userId} joined the room.`
      );
    }

    if (data.type === "exit_room") {
      rooms.get(data.roomId)?.delete(ws);
      broadcastToRoom(
        data.roomId,
        `🚪 User ${data.userId} left the room.`
      );
    }

    if (data.type === "message") {
      broadcastToRoom(
        data.roomId,
        `💬 ${data.userId}: ${data.message}`
      );
    }
  });

  ws.on("close", () => {
    console.log("ws disconnected!");
    rooms.forEach((clients, roomId) => {
      if (clients.has(ws)) {
        clients.delete(ws);
        broadcastToRoom(roomId, `🚪 A user disconnected.`);
      }
    });
  });
});

function broadcastToRoom(roomId: string, msg: string) {
  const clients = rooms.get(roomId);
  if (!clients) return;
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

console.log("🚀 WebSocket server running at ws://localhost:8080");
