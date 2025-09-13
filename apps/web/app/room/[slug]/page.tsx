"use client";

import { getRoomBySlug } from "@/actions/room";
import { useRoom } from "@/hooks/useRoom";
import { authClient } from "@workspace/auth/client";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";

const Page = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { room, setRoom } = useRoom();
  const { data: session } = authClient.useSession();

  const getSlugFromPath = (path: string) => {
    const parts = path.split("/");
    return parts[2] ?? null;
  };

  const getRoomByRoomSlug = async (roomSlug: string) => {
    const res = await getRoomBySlug(roomSlug);

    if (res?.status !== "success" || !res.data) {
      router.push("/explore");
      return;
    }

    setRoom(res.data);
  };

  // fetch the room
  useEffect(() => {
    const slug = getSlugFromPath(pathname);
    if (slug) {
      getRoomByRoomSlug(slug);
    } else {
      router.push("/explore");
    }
  }, [pathname]);

  useEffect(() => {
    if (!room || !session?.user) return;

    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
      console.log("✅ Connected to WebSocket");

      ws.send(
        JSON.stringify({
          type: "join_room",
          message: `User ${session.user.name} joined the room.`,
          roomId: room.id,
          userId: session.user.id,
        })
      );
    };

    ws.onmessage = (event) => {
      console.log("📩 Message from server:", event.data);
    };

    ws.onclose = () => {
      console.log("❌ WebSocket closed");
    };

    ws.onerror = (err) => {
      console.error("⚠️ WebSocket error:", err);
    };

    return () => {
      ws.close();
    };
  }, [room, session?.user]);

  return (
    <div>
      <div>room page {pathname}</div>
    </div>
  );
};

export default Page;
