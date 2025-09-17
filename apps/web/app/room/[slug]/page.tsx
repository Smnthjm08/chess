"use client";

import { getRoomBySlug } from "@/actions/room";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useRoom } from "@/hooks/use-room";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { authClient } from "@repo/auth/client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Share, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UsersInRoomType } from "@/components/providers/room-providers";

const WS_URL = process.env.WS_URL || "ws://localhost:8080";

const Page = () => {
  const pathname = usePathname();
  const router = useRouter();

  const { room, setRoom, usersInRoom, setUsersInRoom } = useRoom();
  const [messages, setMessages] = useState<string[]>([]);
  const { data: session } = authClient.useSession();

  console.log("message", messages);

  console.log("session", session);

  console.log("room", room);
  console.log("usersInRoom", usersInRoom);

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

  useEffect(() => {
    const slug = getSlugFromPath(pathname);
    if (slug) {
      getRoomByRoomSlug(slug);
    } else {
      router.push("/explore");
    }
  }, []);

  useEffect(() => {
    if (!room || !session?.user || !room?.id) return;

    const url = `${WS_URL}?roomId=${room?.id}`;
    const ws = new WebSocket(url);

    console.log("ws", ws);

    ws.onopen = () => {
      console.log("✅ Connected to WebSocket");
    };

    ws.onmessage = (message) => {
      console.log("message.data", JSON.parse(message.data));
      const parsedMessage = JSON.parse(message.data);

      switch (parsedMessage.event) {
        case "JOIN_ROOM":
          break;
        case "USER_UPDATE":
          setUsersInRoom(parsedMessage.payload.users);
          break;
        default:
          break;
      }

      setMessages((prev) => [...prev, message.data]);
      console.log(",ess", typeof message.data);
      //       ws.send(`{
      //     "message": "im good"
      // }`);
    };

    ws.onclose = () => {
      console.log("❌ WebSocket closed");
    };

    ws.onerror = (err) => {
      console.error("⚠️ WebSocket error:", err);
    };

    return () => {
      ws.close(1000, "Cleanup");
    };
  }, [room, session?.user]);

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="min-h-[calc(100vh-3.5rem)] max-w-full border md:min-w-[450px]"
    >
      <ResizablePanel defaultSize={25}>
        <div className="p-4 flex flex-row items-center justify-between">
          <p className="font-bold">{room?.name}</p>
          <Share size={16} />
        </div>
        <Separator />
        <div className="flex items-center justify-between p-2">
          <div className="flex flex-row items-center gap-2">
            <Users size={16} /> Users
          </div>
          <div>
            <Badge variant={"secondary"}>{usersInRoom?.length}</Badge>
          </div>
        </div>
        <Separator />
        {/* <div className="flex h-full items-center justify-center p-6"></div> */}
        {usersInRoom?.length > 0 ? (
          usersInRoom?.map((user: UsersInRoomType) => (
            <div key={user.userId} className="flex items-center gap-2 p-2">
              <Avatar>
                <AvatarImage src={user.userId ?? undefined} />
                <AvatarFallback>
                  {user.userName?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>{user.userName}</div>
            </div>
          ))
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <span className="font-semibold">No One has joined the room</span>
          </div>
        )}
      </ResizablePanel>

      <ResizableHandle disabled={true} />

      <ResizablePanel defaultSize={75}>
        <div className="flex flex-col h-full p-6 gap-2">
          <span className="font-semibold">Messages</span>
          <div className="flex-1 overflow-y-auto border rounded p-2">
            {messages.length > 0 ? (
              messages.map((msg: string, idx: number) => (
                <div key={idx} className="text-sm p-1 border-b">
                  {typeof msg === "string" ? msg : JSON.stringify(msg)}
                </div>
              ))
            ) : (
              <span className="text-gray-500">No messages yet</span>
            )}
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default Page;
