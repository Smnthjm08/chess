"use client";

import { getRoomBySlug } from "@/actions/room";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useRoom } from "@/hooks/use-room";
import { Badge } from "@/components/ui/badge";
import { authClient } from "@repo/auth/client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Share2, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UsersInRoomType } from "@/components/providers/room-providers";
import { ScrollArea } from "@/components/ui/scroll-area";

const WS_URL = process.env.WS_URL || "ws://localhost:8080";

type ChatMessage = {
  roomId: string;
  userId: string;
  userName: string;
  message: string;
};

const Page = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { room, setRoom, usersInRoom, setUsersInRoom } = useRoom();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

  useEffect(() => {
    const slug = getSlugFromPath(pathname);
    if (slug) {
      getRoomByRoomSlug(slug);
    } else {
      router.push("/explore");
    }
  }, []);

  // useEffect(() => {
  //   if (!room || !session?.user || !room?.id) return;

  //   const url = `${WS_URL}?roomId=${room?.id}`;
  //   const ws = new WebSocket(url);

  //   ws.onopen = () => {
  //     console.log("✅ Connected to WebSocket");
  //   };

  //   ws.onmessage = (message) => {
  //     const parsedMessage = JSON.parse(message.data);

  //     switch (parsedMessage.event) {
  //       case "USER_UPDATE":
  //         setUsersInRoom(parsedMessage.payload.users);
  //         break;
  //       case "MESSAGE":
  //         setMessages((prev) => [...prev, parsedMessage.payload]);
  //         break;
  //       default:
  //         break;
  //     }
  //   };

  //   ws.onclose = () => {
  //     console.log("❌ WebSocket closed");
  //   };

  //   ws.onerror = (err) => {
  //     console.error("⚠️ WebSocket error:", err);
  //   };

  //   return () => {
  //     ws.close(1000, "Cleanup");
  //   };
  // }, [session?.user, room]);

  return (
    <div className="h-[calc(100vh-3.5rem)] bg-background">
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full border rounded-lg overflow-hidden"
      >
        <ResizablePanel defaultSize={25} minSize={20}>
          <div className="h-full flex flex-col bg-muted/30">
            {/* Room Header */}
            <div className="p-4 border-b bg-background/50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg truncate">{room?.name}</h2>
                <Share2 className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
              </div>
            </div>

            {/* Users Section */}
            <div className="p-3 border-b bg-background/30 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4" />
                  <span>Users</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {usersInRoom?.length || 0}
                </Badge>
              </div>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-1">
                  {usersInRoom?.length > 0 ? (
                    usersInRoom.map((user: UsersInRoomType) => (
                      <div
                        key={user.userId}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-background/50 transition-colors"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.userId ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {user.userName?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate">
                          {user.userName}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-32">
                      <p className="text-sm text-muted-foreground">
                        No users in room
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle className="w-1 bg-border hover:bg-border/80" />

        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex items-center justify-center bg-background">
            <div className="text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">
                Main content area
              </p>
              <p className="text-sm text-muted-foreground/70">
                Content will be displayed here
              </p>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle className="w-1 bg-border hover:bg-border/80" />

        <ResizablePanel defaultSize={25} minSize={20}>
          <div className="h-full flex flex-col bg-muted/30">
            {/* Messages Header */}
            <div className="p-4 border-b bg-background/50 flex-shrink-0">
              <h3 className="font-semibold">Messages</h3>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-3 space-y-3">
                  {messages.length > 0 ? (
                    messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-background/50 border"
                      >
                        <div className="font-medium text-sm mb-1">
                          {msg.userName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {msg.message}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-32">
                      <p className="text-sm text-muted-foreground">
                        No messages yet
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default Page;
