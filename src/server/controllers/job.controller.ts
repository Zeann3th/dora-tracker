import env from "@/env";
import queue from "@/services/queue";
import { Octokit } from "@octokit/rest";
import { Job } from "bullmq";
import { Request, RequestHandler, Response } from "express";

const queueJob: RequestHandler = async (req: Request, res: Response) => {
  const octokit = new Octokit({ auth: env.GH_PAT });

  const repos = await octokit.paginate("GET /orgs/{org}/repos", {
    org: env.GH_ORG_NAME,
  });

  const jobPromises = repos.map(async (repo) => {
    return queue.add("dev", { link: repo.full_name });
  });

  const jobs = await Promise.all(jobPromises);

  res.status(202).json({
    message: `Jobs are being processed, id range: [${jobs[0].id}; ${jobs[jobs.length - 1].id}]`,
  });
};

const getJobStatus: RequestHandler = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Get the job from the queue using its job ID
    const job: Job | null = await queue.getJob(id);

    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    // Get the job status
    const status = await job.getState();
    const progress = job.progress;
    const finishedOn = job.finishedOn;
    const failedReason = job.failedReason;

    res.status(200).json({
      status,
      progress,
      finishedOn,
      failedReason,
    });
    return;
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: "An error occurred while retrieving job status" });
    return;
  }
};

const JobController = { queueJob, getJobStatus };
export { JobController };
