"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Music, Search } from "lucide-react";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@repo/shared/auth/client";
import Image from "next/image";

const Page = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const session = authClient.useSession();

  console.log("sesssion", session);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-4xl mx-auto p-4 border-2 border-amber-100">
      <div>
        {session?.data ? (
          <div>
            <div className="text-center space-y-6 mb-6">
              <div className="flex justify-center items-center gap-4">
                <Music className="h-8 w-8 text-primary" />
                <h1 className="text-3xl md:text-4xl font-bold text-balance">
                  Explore Music Rooms
                </h1>
              </div>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Join a room to listen to music with friends or create your own
                room to host a listening party.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search rooms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <Image
              src="/chess.jpeg"
              alt="chess-board"
              width={512}
              height={512}
            />
            <Button className="" onClick={() => router.push("/game")}>
              Play Online
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;
