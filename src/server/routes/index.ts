import { Router } from "express";
import { jobRoutes } from "./job.routes";
import { webhookRoutes } from "./webhook.routes";
import env from "@/env";

const router = Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    msg: "Server is healthy",
    last_checked: new Date().toISOString(),
  });
});

router.use("/v1/jobs", jobRoutes);

router.use("/v1/webhooks", webhookRoutes);

export { router as apiRoutes };
