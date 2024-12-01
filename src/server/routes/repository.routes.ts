import { Router } from "express";
import { RepositoryController } from "../controllers/repository.controller";

const router = Router();

router.get("/:owner/:repo", RepositoryController.getAllCommits);

router.get("/:owner/:repo/:id", RepositoryController.getCommitById);

export { router as repositoryRoutes };
