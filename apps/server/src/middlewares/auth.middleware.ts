import type { NextFunction, Request, Response } from "express";
import { refuse } from "../utils/refuse";
import { getSessionUser } from "../utils/session";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = await getSessionUser(req.headers);

  if (!user) return refuse(res, 401, "Not signed in");

  req.user = user;
  next();
}

export default authMiddleware;
