"use client";

import { Room } from "app/page";
import React, { createContext, useState } from "react";

export type UsersInRoomType = {
  userId: string;
  userName: string;
};

export type RoomContextType = {
  room: Room | null;
  setRoom: (room: Room | null) => void;

  usersInRoom: UsersInRoomType[] | [];
  setUsersInRoom: (userInRoom: UsersInRoomType[] | []) => void;
};

export const RoomContext = createContext<RoomContextType | null>(null);

export const RoomProvider = ({ children }: { children: React.ReactNode }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [usersInRoom, setUsersInRoom] = useState<UsersInRoomType[] | []>([]);

  return (
    <RoomContext.Provider
      value={{ room, setRoom, usersInRoom, setUsersInRoom }}
    >
      {children}
    </RoomContext.Provider>
  );
};
