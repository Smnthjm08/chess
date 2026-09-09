import { Router } from "express";
import { gameRouter } from "./game.routes";
import { userRouter } from "./user.routes";

export const apiRouter: Router = Router();

apiRouter.use("/games", gameRouter);
apiRouter.use("/users", userRouter);

export default apiRouter;
