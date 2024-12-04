import env from "@/env";
import crypto from "node:crypto";
import { Request, RequestHandler, Response } from "express";
import {
  GoogleDocs,
  PullRequest,
  Push,
  Release,
  GHRepository,
  WorkflowRun,
} from "./webhook.types";
import {
  Commit,
  CommitModel,
  DeploymentModel,
  Repository,
  RepositoryModel,
} from "@/models";
import octokit from "@/services/octokit";

const handleGithubWebhook: RequestHandler = async (
  req: Request,
  res: Response,
) => {
  const signature = req.headers["x-hub-signature-256"];
  const event = req.headers["x-github-event"];
  let payload = req.body;

  if (!signature) {
    res.status(400).json({ error: "Signature not specified" });
    return;
  }

  if (typeof signature !== "string") {
    res.status(400).json({ error: "Invalid signature format" });
    return;
  }

  if (!verifyWebhookSignature(signature, payload)) {
    res.status(403).json({ error: "Invalid signature" });
    return;
  }

  switch (event) {
    case "pull_request":
      await createCommit(req, res);
      break;
    case "workflow_run":
      await createWorkflowDeployment(req, res);
      break;
    case "repository":
      await handleRepository(req, res);
      break;
    default:
      console.log("Event not included in webhook's allowed actions");
  }
};

const handleRepository = async (req: Request, res: Response) => {
  try {
    const payload = req.body as GHRepository;
    const [owner, name] = payload.repository.full_name.split("/");

    switch (payload.action) {
      case "created":
        await RepositoryModel.create({
          owner,
          name,
          private: payload.repository.private,
          default_branch: payload.repository.default_branch,
        });
        break;
      case "deleted":
        const repository = await RepositoryModel.findOne({ owner, name });
        if (repository) {
          await Promise.all([
            RepositoryModel.deleteOne({ _id: repository._id }),
            CommitModel.deleteMany({ repo_id: repository._id }),
            DeploymentModel.deleteMany({ repo_id: repository._id }),
          ]);
        }
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
  }
};

const createCommit = async (req: Request, res: Response) => {
  try {
    const payload = req.body as PullRequest;

    const [owner, repo] = payload.repository.full_name.split("/");

    const repository = await findRepository(owner, repo);

    const isDefaultBranch =
      payload.pull_request.base.ref.replace("refs/heads/", "") ===
      repository.default_branch;

    if (
      payload.action != "closed" ||
      !payload.pull_request.merged ||
      !isDefaultBranch
    ) {
      res.status(204).send();
      return;
    }

    const commit = await CommitModel.create({
      repo_id: repository._id,
      sha: payload.pull_request.merge_commit_sha,
      created_at: payload.pull_request.merged_at,
      commit_message: payload.pull_request.merge_commit_message,
      author: payload.pull_request.merged_by.name,
    });

    res.status(200).json({
      message: `[Webhook]: Commit ${commit.sha} added to repository ${repository.full_name}`,
    });
    return;
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
    return;
  }
};

const createWorkflowDeployment = async (req: Request, res: Response) => {
  try {
    const payload = req.body as WorkflowRun;

    const [owner, repo] = payload.repository.full_name.split("/");

    const repository = await findRepository(owner, repo);

    if (!payload.workflow_run.head_branch) {
      res.status(204).send();
      return;
    }

    const isDefaultBranch =
      payload.workflow_run.head_branch === repository.default_branch;

    if (payload.action !== "completed" || !isDefaultBranch) {
      res.status(204).send();
      return;
    }

    const commit = await findCommit(
      repository,
      payload.workflow_run.head_commit.id,
    );

    await DeploymentModel.create({
      repo_id: repository._id,
      commit_id: commit._id,
      environment: "dev",
      name: payload.workflow.name,
      status: payload.workflow_run.conclusion,
      started_at: payload.workflow_run.created_at,
      finished_at: payload.workflow_run.updated_at,
    });

    res.status(200).json({
      message: `[Webhook]: Deployment of commit ${commit._id} in dev environment is added to repository ${repository.full_name}`,
    });
  } catch (error) {
    console.error("[Webhook]: Error - ", error);

    res.status(500).json({ error: "Internal Server Error" });
  }
};

const findRepository = async (
  owner: string,
  repo: string,
): Promise<Repository> => {
  const repository = await RepositoryModel.findOne({ owner, name: repo });
  if (!repository) {
    throw new Error(`Repository ${owner}/${repo} does not exist`);
  }
  return repository;
};

const findCommit = async (
  repository: Repository,
  sha: string,
): Promise<Commit> => {
  const commit = await CommitModel.findOne({ repo_id: repository._id, sha });
  if (!commit) {
    throw new Error(`Commit ${sha} does not exist in ${repository.full_name}`);
  }
  return commit;
};

const verifyWebhookSignature = (signature: string, payload: any) => {
  if (!signature || !env.GH_WEBHOOK_SECRET) return false;

  const hmac = crypto.createHmac("sha256", env.GH_WEBHOOK_SECRET);
  const computedSignature = `sha256=${hmac.update(JSON.stringify(payload)).digest("hex")}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature),
  );
};

const handleGoogleWebhook: RequestHandler = async (
  req: Request,
  res: Response,
) => {
  try {
    const payload = req.body as GoogleDocs;
    console.log(payload);

    const versionIdx = payload.content.findIndex((line) =>
      line.includes("Version"),
    );

    if (versionIdx === -1) {
      res.status(400).json({ error: "No version line found" });
      return;
    }

    const releases = payload.content.slice(versionIdx);
    const releaseRegex =
      /github\.com\/([^/]+)\/([^/]+)\/releases\/tag\/([^/]+)/;

    const versionPromises = releases.map(async (release) => {
      try {
        const match = release.match(releaseRegex);
        if (!match) {
          console.warn(`No match for release: ${release}`);
          return;
        }

        const [owner, repo, tagName] = match.slice(1);
        const repository = await findRepository(owner, repo);

        const tags = await octokit.paginate("GET /repos/{owner}/{repo}/tags", {
          owner,
          repo,
          per_page: 10,
        });

        const currTagIdx = tags.findIndex((tag) => tag.name === tagName);
        const currTag = tags[currTagIdx];
        const prevTag = tags[currTagIdx + 1];

        if (!currTag || !prevTag) {
          console.warn(`Missing tags for ${repo}. Skipping comparison.`);
          return;
        }

        const {
          data: { commits },
        } = await octokit.request(
          "GET /repos/{owner}/{repo}/compare/{base}...{head}",
          {
            owner,
            repo,
            base: prevTag.commit.sha,
            head: currTag.commit.sha,
          },
        );

        const commitPromises = commits.map(async (commit) => {
          try {
            const cmt = await CommitModel.findOne({ sha: commit.sha });
            if (!cmt) {
              console.warn(`Commit not found: ${commit.sha}`);
              return;
            }
            await DeploymentModel.create({
              repo_id: repository._id,
              commit_id: commit.sha,
              environment: "uat",
              name: `UAT release for ${commit.sha}`,
              status: "success",
              started_at: cmt.created_at,
              finished_at: payload.timestamp,
            });
          } catch (err) {
            console.error(`Error processing commit ${commit.sha}:`, err);
          }
        });

        await Promise.all(commitPromises);
      } catch (err) {
        console.error(`Error processing release: ${release}`, err);
      }
    });

    await Promise.all(versionPromises);
    res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const WebhookController = { handleGithubWebhook, handleGoogleWebhook };

export default WebhookController;