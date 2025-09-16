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
import { useEffect } from "react";
import { Share, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UsersInRoomType } from "@/components/providers/room-providers";

const WS_URL = process.env.WS_URL || "ws://localhost:8080";

const Page = () => {
  const pathname = usePathname();
  const router = useRouter();
  
  const { room, setRoom, usersInRoom, setUsersInRoom } = useRoom();
  const { data: session } = authClient.useSession();

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
  }, [pathname]);

  useEffect(() => {
    if (!room || !session?.user) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("✅ Connected to WebSocket");

      ws.send(
        JSON.stringify({
          type: "join_room",
          roomId: room.id,
          userId: session.user.id,
          userName: session.user.name,
          message: `${session.user.name} joined the room.`,
        })
      );
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "room_users":
          setUsersInRoom(msg.users);
          break;
        case "system":
          console.log("ℹ️", msg.message);
          break;
        case "message":
          console.log("💬", msg.userId, msg.message);
          break;
        default:
          console.log("Unknown message:", msg);
      }
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
        <div className="flex h-full items-center justify-center p-6">
          <span className="font-semibold">Content</span>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default Page;