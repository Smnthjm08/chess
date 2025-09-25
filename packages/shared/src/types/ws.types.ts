import { z } from "zod";

// 1️⃣ Event enum
export const EventTypes = z.enum([
  "JOIN_ROOM",
  "EXIT_ROOM",
  "MESSAGE",
  "USER_UPDATE",
]);
export type EventTypes = z.infer<typeof EventTypes>;

// 2️⃣ Message schemas
const JoinMessageSchema = z.object({
  event: z.literal("JOIN_ROOM"),
  payload: z.object({
    roomId: z.string(),
    userId: z.string(),
    userName: z.string(),
  }),
});

const ExitMessageSchema = z.object({
  event: z.literal("EXIT_ROOM"),
  payload: z.object({
    roomId: z.string(),
    userId: z.string(),
  }),
});

const ChatMessageSchema = z.object({
  event: z.literal("MESSAGE"),
  payload: z.object({
    roomId: z.string(),
    userId: z.string(),
    userName: z.string(),
    message: z.string(),
  }),
});

const UserUpdateMessageSchema = z.object({
  event: z.literal("USER_UPDATE"),
  payload: z.object({
    roomId: z.string(),
    users: z.array(z.object({ userId: z.string(), userName: z.string() })),
  }),
});

// 3️⃣ Union of all messages
export const WSMessageSchema = z.union([
  JoinMessageSchema,
  ExitMessageSchema,
  ChatMessageSchema,
  UserUpdateMessageSchema,
]);

// 4️⃣ Infer the TypeScript type
export type WSMessage = z.infer<typeof WSMessageSchema>;
