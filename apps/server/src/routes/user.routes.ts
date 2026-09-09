import { Router } from "express";
import { getUserByHandle } from "../controllers/user.controller";

export const userRouter: Router = Router();

userRouter.get("/:handle", getUserByHandle);

export default userRouter;
