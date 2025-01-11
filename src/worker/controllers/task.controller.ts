import octokit from "@/services/octokit.service";
import { GH_RELEASE_REG_EXP, PROD_REG_EXP, UAT_REG_EXP } from "@/utils";
import { Octokit } from "@octokit/rest";
import { Job } from "bullmq";
import { GithubService } from "../services/github.service";
import { Repository, RepositoryModel } from "@/models";
import { GoogleService } from "@/services/google.service";
import { GoogleDocumentParserService } from "../services/google.service";

const scanDevEnv = async (job: Job<{ repo_ref: string }>) => {
  const { repo_ref } = job.data;

  console.log("Scanning for repository...");
  // Extract owner and repository name from ref
  // e.g: mui/material-ui => owner: mui, repo: material-ui
  const [owner, repo] = repo_ref.split("/");

  // Checks for repository on database, if doesn't exist, create a new repository document
  const repository: Repository = await GithubService.scanRepository(
    octokit,
    owner,
    repo,
  );

  console.log(`Scanning commits from ${repository.full_name}...`);
  const commits = await GithubService.scanCommits(octokit, repository);

  await job.updateProgress(50);

  console.log(`Scanning deployments from ${repository.full_name}`);
  await Promise.all([
    GithubService.scanWorkflows(octokit, repository, commits, {
      filter: "Docker",
    }),
  ]);

  await job.updateProgress(100);
};

const scanUatEnv = async (job: Job) => {
  const { doc_id } = job.data;

  const deployments = await GoogleService.readUat(doc_id);

  if (!deployments || deployments.length === 0) {
    throw new Error(
      "This document is either empty or worker failed to fetch the document",
    );
  }

  const promises = deployments.map(async (deployment) => {
    const parsed = GoogleDocumentParserService.parseUatDocs(deployment);

    if (!parsed) {
      return;
    }

    const { deploymentVersion, content, selectedRepositories, timestamp } =
      parsed;

    await Promise.all(
      selectedRepositories.map(async (release) => {
        try {
          const match = release.match(GH_RELEASE_REG_EXP);
          if (!match) {
            console.warn(`No match for release: ${release}`);
            return;
          }

          const [owner, repo, tagName] = match.slice(1);
          let repository = await RepositoryModel.findOne({
            owner: owner,
            name: repo,
          });

          if (repository) {
            await GithubService.scanUatReleases(octokit, repository, {
              tagName,
              deploymentVersion,
              timestamp,
            });
          }
        } catch (err) {
          console.error(`Error processing release: ${release}`, err);
        }
      }),
    );
  });

  await Promise.all([...promises, job.updateProgress(100)]);
};

const scanProdEnv = async (job: Job) => {
  const { doc_id } = job.data;
  const deployments = await GoogleService.readProd(doc_id);

  if (!deployments || deployments.length === 0) {
    throw new Error(
      "This document is either empty or worker failed to fetch the document",
    );
  }

  const promises = deployments.map(async (deployment) => {
    const parsed = GoogleDocumentParserService.parseProdDocs(deployment);

    if (!parsed) {
      return;
    }

    const { deploymentVersion, content, selectedRepositories, timestamp } =
      parsed;

    await Promise.all(
      selectedRepositories.map(async (release) => {
        try {
          const match = release.match(GH_RELEASE_REG_EXP);
          if (!match) {
            console.warn(`No match for release: ${release}`);
            return;
          }

          const [owner, repo, tagName] = match.slice(1);
          let repository = await RepositoryModel.findOne({
            owner: owner,
            name: repo,
          });

          if (repository) {
            await GithubService.scanProdReleases(octokit, repository, {
              tagName,
              deploymentVersion,
              timestamp,
            });
          }
        } catch (err) {
          console.error(`Error processing release: ${release}`, err);
        }
      }),
    );
  });

  await Promise.all([...promises, job.updateProgress(100)]);
};

const TaskController = {
  scanDevEnv,
  scanUatEnv,
  scanProdEnv,
};

export { TaskController };
