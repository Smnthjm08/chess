

export enum EventTypes {
  JOIN_ROOM = "JOIN_ROOM",
  EXIT_ROOM = "EXIT_ROOM",
  MESSAGE = "MESSAGE",
  USER_UPDATE = "USER_UPDATE",
}

// Map<roomId, Map<userId as key, userName as value>>
const rooms: Record<string, Map<string, string>> = {};

const server = Bun.serve({
  port: 8080,
  fetch(req, server) {
    const url = new URL(req.url);
    const roomId = url.searchParams.get("roomId");
    if (!roomId) return new Response("Upgrade failed", { status: 500 });

    if (server.upgrade(req, { data: { roomId } })) return;
    return new Response("Upgrade failed", { status: 500 });
  },

  websocket: {
    open(ws) {
    const { roomId } = ws.data as { roomId: string };
    ws.subscribe(roomId);

    // TEMP: assign a userId & userName (replace with real auth in production)
    const userId = crypto.randomUUID();
    const userName = `test-${userId.split("-")[0]}`;

    if (!rooms[roomId]) rooms[roomId] = new Map();
    rooms[roomId].set(userId, userName);

    const joinMsg = {
      event: EventTypes.JOIN_ROOM,
      payload: { roomId, userId, userName },
    };
    server.publish(roomId, JSON.stringify(joinMsg));

    const userUpdate = {
      event: EventTypes.USER_UPDATE,
      payload: { roomId, users: Array.from(rooms[roomId]).map(([id, name]) => ({ userId: id, userName: name })) },
    };
    server.publish(roomId, JSON.stringify(userUpdate));
  },

    message(ws, msg) {
      const { roomId } = ws.data as { roomId: string };
      if (!msg) return;
      console.log("📩", msg.toString());
      server.publish(roomId, msg);
    },

    close(ws) {
      const { roomId } = ws.data as { roomId: string };
      ws.unsubscribe(roomId);
      console.log("❌ A user disconnected from", roomId);
      server.publish(roomId, "A user left the room");
    },

    drain(ws) {},
  },
});

console.log("🎶 WS backend running at ws://localhost:8080/");
