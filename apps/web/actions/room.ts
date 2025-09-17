"use server";

import { prisma } from "@repo/db";
import { roomSchema, roomUpdateSchema } from "@repo/shared/room";
import bcrypt from "bcryptjs";
import { getSessionUser } from "./utils";
import { roomTypes } from "@/components/create-room-dialog";

export async function createRoomAction(data: roomTypes) {
  try {
    const userId = await getSessionUser();
    if (!userId) {
      return { 
        status: "failed", 
        message: "You must be logged in to create a room" 
      };
    }

    // Validate the input data
    const validatedData = roomSchema.parse(data);
    const { name, slug, isPublic, pin } = validatedData;

    // Check if slug already exists
    const existingRoom = await prisma.room.findUnique({
      where: { slug },
    });

    if (existingRoom) {
      // Generate a unique slug by appending a number
      let counter = 1;
      let uniqueSlug = `${slug}-${counter}`;
      
      while (await prisma.room.findUnique({ where: { slug: uniqueSlug } })) {
        counter++;
        uniqueSlug = `${slug}-${counter}`;
      }
      
      validatedData.slug = uniqueSlug;
    }

    // Hash the PIN if the room is private
    const hashedPin = !isPublic && pin ? await bcrypt.hash(pin, 10) : null;

    // Create the room
    const room = await prisma.room.create({
      data: {
        name: name.trim(),
        slug: validatedData.slug,
        isPublic,
        pin: hashedPin,
        hostId: userId,
        // You might want to add these fields if they exist in your schema
        // createdAt: new Date(),
        // updatedAt: new Date(),
      },
    });

    return {
      status: "success",
      message: "Room created successfully!",
      data: {
        id: room.id,
        name: room.name,
        slug: room.slug,
        isPublic: room.isPublic,
      },
    };
  } catch (error: any) {
    console.error("Create Room Error:", error);
    
    // Handle specific errors
    if (error.name === "ZodError") {
      return {
        status: "failed",
        message: "Invalid room data provided",
      };
    }
    
    if (error.code === "P2002") {
      return {
        status: "failed", 
        message: "A room with this name already exists",
      };
    }

    return {
      status: "failed",
      message: error.message || "Something went wrong while creating the room",
    };
  }
}

export async function getRoomById(roomId: string) {
  try {
    const userId = await getSessionUser();
    if (!userId) return { status: "failed", message: "Not authenticated" };

    const room = await prisma.room.findUnique({ where: { id: roomId } });

    if (!room) {
      return { status: "failed", message: "Room not found" };
    }

    return {
      status: "success",
      message: "Room fetched successfully!",
      data: room,
    };
  } catch (error: any) {
    console.error("Get Room By Id Error:", error);
    return {
      status: "failed",
      message: error.message || "Something went wrong while fetching the room",
    };
  }
}

export async function getUserRooms() {
  try {
    const userId = await getSessionUser();
    if (!userId) return { status: "failed", message: "Not authenticated" };

    const rooms = await prisma.room.findMany({
      where: { hostId: userId },
      orderBy: { createdAt: "desc" },
    });

    return {
      status: "success",
      message: "User rooms fetched successfully!",
      data: rooms,
    };
  } catch (error: any) {
    console.error("Get User Rooms Error:", error);
    return {
      status: "failed",
      message: error.message || "Something went wrong while fetching user rooms",
    };
  }
}

export async function getAllPublicRooms() {
  try {
    const rooms = await prisma.room.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        isPublic: true,
        pin: true,
        createdAt: true,
        updatedAt: true,
        hostId: true,
        // Add participant count if you have a participants relation
        // _count: {
        //   select: {
        //     participants: true,
        //   },
        // },
      },
    });

    // Convert Date objects to strings to avoid React serialization issues
    const serializedRooms = rooms.map(room => ({
      id: room.id,
      slug: room.slug,
      name: room.name,
      isPublic: room.isPublic,
      pin: room.pin,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
      hostId: room.hostId,
      // participants: room._count?.participants ?? 0,
    }));

    return {
      status: "success",
      message: "Public rooms fetched successfully!",
      data: serializedRooms ?? "No room",
    };
  } catch (error: any) {
    console.error("Get Public Rooms Error:", error);
    return {
      status: "failed",
      message: error.message || "Something went wrong while fetching public rooms",
      data: [],
    };
  }
}

export async function getRoomBySlug(slug: string) {
  try {
    const room = await prisma.room.findUnique({ where: { slug } });

    if (!room) {
      return { status: "failed", message: "Room not found" };
    }

    return {
      status: "success",
      message: "Room fetched successfully!",
      data: room,
    };
  } catch (error: any) {
    console.error("Get Room By Slug Error:", error);
    return {
      status: "failed",
      message: error.message || "Something went wrong while fetching the room",
    };
  }
}

export async function updateRoomAction(roomId: string, data: unknown) {
  try {
    const userId = await getSessionUser();
    if (!userId) return { status: "failed", message: "Not authenticated" };

    const parsed = roomUpdateSchema.parse(data);

    const existing = await prisma.room.findUnique({ where: { id: roomId } });
    if (!existing) return { status: "failed", message: "Room not found" };
    if (existing.hostId !== userId) return { status: "failed", message: "Not authorized" };

    const room = await prisma.room.update({
      where: { id: roomId },
      data: parsed,
    });

    return {
      status: "success",
      message: "Room updated successfully!",
      data: room,
    };
  } catch (error: any) {
    console.error("Update Room Error:", error);
    return {
      status: "failed",
      message: error.message || "Something went wrong while updating the room",
    };
  }
}

export async function deleteRoomAction(roomId: string) {
  try {
    const userId = await getSessionUser();
    if (!userId) return { status: "failed", message: "Not authenticated" };

    const existing = await prisma.room.findUnique({ where: { id: roomId } });
    if (!existing) return { status: "failed", message: "Room not found" };
    if (existing.hostId !== userId) return { status: "failed", message: "Not authorized" };

    await prisma.room.delete({ where: { id: roomId } });

    return {
      status: "success",
      message: "Room deleted successfully!",
    };
  } catch (error: any) {
    console.error("Delete Room Error:", error);
    return {
      status: "failed",
      message: error.message || "Something went wrong while deleting the room",
    };
  }
}