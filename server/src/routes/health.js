import { Router } from "express";

const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

export default healthRouter;
