import { Repository } from "@/models";
import { Job } from "bullmq";
import { TaskController } from "./controllers/task.controller";
import { Octokit } from "@octokit/rest";
import env from "@/env";
import octokit from "@/services/octokit";

//TODO: there will be uat or prod (or if i read from one file, just another type of job) => need if else to separate the job types
const processRepo = async (job: Job<{ link: string }>) => {
  console.log("processing job");
  const { link } = job.data;

  console.log("Scanning for repository...");
  // Extract owner and repository name from link
  // e.g: https://github.com/mui/material-ui => owner: mui, repo: material-ui
  const [owner, repo] = link.split("/");

  // Checks for repository on database, if doesn't exist, create a new repository document
  const repository: Repository = await TaskController.scanRepository(
    octokit,
    owner,
    repo,
  );

  console.log(`Scanning commits from ${repository.full_name}...`);
  const commits = await TaskController.scanCommits(octokit, repository);

  await job.updateProgress(50);

  console.log(`Scanning deployments from ${repository.full_name}`);
  await Promise.all([
    TaskController.scanWorkflows(octokit, repository, commits, {
      filter: "Docker",
    }),
  ]);

  await job.updateProgress(100);
};

export default { processRepo };
