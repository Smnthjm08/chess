"use client"

import { Room } from "@/app/explore/page";
import React, { createContext, useState } from "react";


export type RoomContextType = {
  room: Room | null;
  setRoom: (room: Room | null) => void;
};

export const RoomContext = createContext<RoomContextType | null>(null);

export const RoomProvider = ({ children }: { children: React.ReactNode }) => {
  const [room, setRoom] = useState<Room | null>(null);

  return (
    <RoomContext.Provider value={{ room, setRoom }}>
      {children}
    </RoomContext.Provider>
  );
};
