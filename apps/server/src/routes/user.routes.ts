import { Router } from "express";
import { getUserByHandle, getUserGames } from "../controllers/user.controller";

export const userRouter: Router = Router();

userRouter.get("/:handle", getUserByHandle);
userRouter.get("/:handle/games", getUserGames);

export default userRouter;
