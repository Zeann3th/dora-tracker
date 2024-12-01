import { Router } from "express";
import WebhookController from "../controllers/webhook.controller";

const router = Router();

router.post("/github", WebhookController.handleGithubWebhook);

export { router as webhookRoutes };
