import { toNodeHandler } from "better-auth/node";
import express, { Request, Response } from "express";
import { auth } from "@repo/auth/server";
import authMiddleware from "./middlewares/auth.middleware";
import { prisma } from "@repo/db";

const app = express();

app.use(express.json());

const BE_PORT = process.env.BE_PORT;

app.all("/api/auth/{*any}", toNodeHandler(auth));

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ status: "healthy!" });
});

app.get("/me", authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: {
      id: req?.user?.id,
    },
  });
  return res.status(200).json(user);
});

app.listen(BE_PORT, () => {
  console.log(`app is listening at http://localhost:${BE_PORT}/`);
});
