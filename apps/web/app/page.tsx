"use client";

import { CreateRoomDialog } from "@/components/create-room-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Lock,
  LockKeyholeOpen,
  Music,
  Search,
  Users,
  RefreshCw,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { getAllPublicRooms } from "@/actions/room";
import { toast } from "sonner";
import { Room } from "types/room.types";



const Page = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      const result = await getAllPublicRooms();
      const data = result?.data;
      console.log("Rooms", result)

      if (result.status === "success") {
        setRooms(data);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      toast.error("Failed to load rooms. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const filteredRooms = rooms
    ? rooms.filter((room) =>
        room.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleRoomClick = (slug: string) => {
    window.location.href = `/room/${slug}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-4xl mx-auto p-4">
      <div className="text-center space-y-6 mb-6">
        <div className="flex justify-center items-center gap-4">
          <Music className="h-8 w-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold text-balance">
            Explore Music Rooms
          </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Join a room to listen to music with friends or create your own room to
          host a listening party.
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

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRooms}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <CreateRoomDialog />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading rooms...</p>
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <Music className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <div>
                <h3 className="text-lg font-medium mb-2">
                  {searchQuery
                    ? "No rooms found matching your search"
                    : "No active rooms"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery
                    ? "Try searching for something else"
                    : "Be the first to create a room!"}
                </p>
                {!searchQuery && <CreateRoomDialog />}
              </div>
            </div>
          ) : (
            filteredRooms.map((room) => (
              <Card
                key={room.id}
                className="cursor-pointer hover:shadow-md transition-all duration-200 border-border/50 hover:border-border"
                onClick={() => handleRoomClick(room.slug)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Music className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{room.name}</h3>
                          {room.isPublic ? (
                            <LockKeyholeOpen className="h-4 w-4 text-green-600" />
                          ) : (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          test
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{new Date(room.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default Page;
