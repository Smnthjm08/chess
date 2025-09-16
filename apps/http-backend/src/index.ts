import { toNodeHandler } from "better-auth/node";
import express, { Request, Response } from "express";
import { auth } from '@repo/auth/server';

const app = express();

app.use(express.json());

const BE_PORT = process.env.BE_PORT;

app.all("/api/auth/*", toNodeHandler(auth));

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ status: "healthy!" });
});

app.listen(BE_PORT, () => {
  console.log(`app is listening at http://localhost:${BE_PORT}/`);
});
