import { useContext } from "react";
import { RoomContext, RoomContextType } from "@/components/providers/room-context";

export const useRoom = (): RoomContextType => {
  const context = useContext(RoomContext);

  if (!context) {
    throw new Error("useRoom must be used within a RoomProvider");
  }

  return context;
};
