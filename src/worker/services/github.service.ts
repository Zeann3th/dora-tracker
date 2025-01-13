import {
  Commit,
  CommitModel,
  Deployment,
  DeploymentModel,
  Repository,
  RepositoryModel,
} from "@/models";
import { Octokit } from "@octokit/rest";

const scanRepository = async (
  client: Octokit,
  owner: string,
  name: string,
): Promise<Repository> => {
  let repository = await RepositoryModel.findOne({
    name,
    owner,
  });
  if (!repository) {
    const { data } = await client.request("GET /repos/{owner}/{repo}", {
      owner,
      repo: name,
    });
    repository = await RepositoryModel.create({
      gh_id: data.id,
      name,
      owner,
      private: data.private,
      default_branch: data.default_branch,
    });
  }
  return repository;
};

const scanCommits = async (
  client: Octokit,
  repository: Repository,
): Promise<Commit[]> => {
  const commits = await client.paginate("GET /repos/{owner}/{repo}/commits", {
    owner: repository.owner,
    repo: repository.name,
    sha: repository.default_branch,
    ...(repository.last_scanned_at
      ? { since: repository.last_scanned_at.toISOString() }
      : {}),
  });

  const commitPromises = commits.map(async (commit) => {
    try {
      // Check if commit exists
      let cmt = await CommitModel.findOne({
        repo_id: repository._id,
        sha: commit.sha,
      }).then();
      // If not exist, create new
      if (!cmt) {
        const author = commit.commit.author?.name;
        const commit_message = commit.commit.message;
        const created_at = commit.commit.committer?.date;
        // No Date = skip
        if (!created_at) {
          console.warn(
            `Skipping commit ${commit.sha} due to missing required fields`,
          );
          return null;
        }

        cmt = await CommitModel.create({
          repo_id: repository._id,
          sha: commit.sha,
          commit_message,
          author,
          created_at,
        });
      }
      return cmt;
    } catch (error) {
      console.log(`Error processing commit ${commit.sha}: ${error}`);
      return null;
    }
  });

  const processedCommits = await Promise.all(commitPromises);

  return processedCommits.filter((commit) => commit !== null);
};

const scanWorkflows = async (
  client: Octokit,
  repository: Repository,
  commits: Commit[],
  opts: {
    filter?: string;
    return?: boolean;
  } = {},
): Promise<Deployment[] | void> => {
  if (!commits?.length) {
    console.log("No commits provided!");
    return opts.return ? [] : undefined;
  }

  let runs;
  try {
    runs = await client.paginate("GET /repos/{owner}/{repo}/actions/runs", {
      owner: repository.owner,
      repo: repository.name,
      branch: repository.default_branch,
    });
  } catch (error) {
    console.error("[Worker]: Error fetching workflow runs", error);
    return opts.return ? [] : undefined;
  }

  // Early return if no runs
  if (!runs?.length) {
    console.log("No workflow runs found!");
    return opts.return ? [] : undefined;
  }

  const filterName = opts.filter?.toLowerCase();
  const filteredRuns = filterName
    ? runs.filter((run) => run.name?.toLowerCase().includes(filterName))
    : runs;

  if (!filteredRuns.length) {
    console.log("No matching workflow runs found with the specified filter!");
    return opts.return ? [] : undefined;
  }

  const commitMap = new Map(commits.map((commit) => [commit.sha, commit]));

  const deploymentPromises = filteredRuns.map(async (run) => {
    const commit = commitMap.get(run.head_sha);
    if (!commit) return null;

    try {
      let deployment = await DeploymentModel.findOne({
        repo_id: repository._id,
        commit_id: commit._id,
        name: run.name,
      });

      if (!deployment) {
        deployment = await DeploymentModel.create({
          repo_id: repository._id,
          commit_id: commit._id,
          environment: "dev",
          name: run.name,
          status: run.conclusion,
          started_at: run.created_at,
          finished_at: run.updated_at,
        });
      }

      return deployment;
    } catch (error) {
      console.error(
        `[Worker]: Error processing deployment for run ${run.name}:`,
        error,
      );
      return null;
    }
  });

  if (opts.return) {
    const deployments = (await Promise.all(deploymentPromises)).filter(
      (deployment) => deployment !== null,
    );
    return deployments;
  }
};

const scanReleases = async (
  client: Octokit,
  repository: Repository,
  release: {
    environment: "uat" | "prod";
    tagName: string;
    timestamp: string;
    deploymentVersion: string;
  },
) => {
  const tags = await client.paginate("GET /repos/{owner}/{repo}/tags", {
    owner: repository.owner,
    repo: repository.name,
  });

  const currTagIdx = tags.findIndex((tag) => tag.name === release.tagName);

  let releaseDate: string = release.timestamp;
  if (release.environment === "uat") {
    const { data } = await client.request(
      "GET /repos/{owner}/{repo}/releases/tags/{tag}",
      {
        owner: repository.owner,
        repo: repository.name,
        tag: release.tagName,
      },
    );
    releaseDate = data.created_at;
  }

  if (currTagIdx === -1) {
    console.warn(
      `Current tag (${release.tagName}) not found for ${repository.full_name}.`,
    );
    return;
  }

  const currTag = tags[currTagIdx];
  const prevTag = tags[currTagIdx + 1];

  if (!prevTag) {
    const commit = await CommitModel.findOne({
      sha: currTag.commit.sha,
    });
    if (!commit) {
      console.warn(`Commit not found: ${currTag.commit.sha}`);
      return;
    }

    const deployment = await DeploymentModel.findOne({
      repo_id: repository._id,
      commit_id: commit._id,
      environment: release.environment,
      name: `${release.environment.toUpperCase()}/${release.deploymentVersion}`,
    });

    if (!deployment) {
      await DeploymentModel.create({
        repo_id: repository._id,
        commit_id: commit._id,
        environment: release.environment,
        name: `${release.environment.toUpperCase()}/${release.deploymentVersion}`,
        status: "success",
        started_at: commit.created_at,
        finished_at: releaseDate,
      });
    }
  } else {
    const {
      data: { commits },
    } = await client.request(
      "GET /repos/{owner}/{repo}/compare/{base}...{head}",
      {
        owner: repository.owner,
        repo: repository.name,
        base: prevTag.commit.sha,
        head: currTag.commit.sha,
      },
    );

    await Promise.all(
      commits.map(async (commit) => {
        try {
          const cmt = await CommitModel.findOne({
            sha: commit.sha,
          });
          if (!cmt) {
            console.warn(`Commit not found: ${commit.sha}`);
            return;
          }

          const deployment = await DeploymentModel.findOne({
            repo_id: repository._id,
            commit_id: cmt._id,
            environment: release.environment,
            name: `${release.environment.toUpperCase()}/${release.deploymentVersion}`,
          });

          if (!deployment) {
            await DeploymentModel.create({
              repo_id: repository._id,
              commit_id: cmt._id,
              environment: release.environment,
              name: `${release.environment.toUpperCase()}/${release.deploymentVersion}`,
              status: "success",
              started_at: cmt.created_at,
              finished_at: releaseDate,
            });
          }
        } catch (err) {
          console.error(`Error processing commit ${commit.sha}:`, err);
        }
      }),
    );
  }
};

const scanUatReleases = async (
  client: Octokit,
  repository: Repository,
  release: {
    tagName: string;
    timestamp: string;
    deploymentVersion: string;
  },
) => {
  const tags = await client.paginate("GET /repos/{owner}/{repo}/tags", {
    owner: repository.owner,
    repo: repository.name,
  });

  const currTagIdx = tags.findIndex((tag) => tag.name === release.tagName);

  const { data } = await client.request(
    "GET /repos/{owner}/{repo}/releases/tags/{tag}",
    {
      owner: repository.owner,
      repo: repository.name,
      tag: release.tagName,
    },
  );

  const releaseDate = data.published_at ?? data.created_at;

  if (currTagIdx === -1) {
    console.warn(
      `Current tag (${release.tagName}) not found for ${repository.full_name}.`,
    );
    return;
  }

  const currTag = tags[currTagIdx];
  const prevTag = tags[currTagIdx + 1];

  if (!prevTag) {
    const commit = await CommitModel.findOne({
      sha: currTag.commit.sha,
    });
    if (!commit) {
      console.warn(`Commit not found: ${currTag.commit.sha}`);
      return;
    }

    const deployment = await DeploymentModel.findOne({
      repo_id: repository._id,
      commit_id: commit._id,
      environment: "uat",
      name: `UAT/${release.deploymentVersion}`,
    });

    if (!deployment) {
      await DeploymentModel.create({
        repo_id: repository._id,
        commit_id: commit._id,
        environment: "uat",
        name: `UAT/${release.deploymentVersion}`,
        status: "success",
        started_at: commit.created_at,
        finished_at: releaseDate,
      });
    }
  } else {
    const {
      data: { commits },
    } = await client.request(
      "GET /repos/{owner}/{repo}/compare/{base}...{head}",
      {
        owner: repository.owner,
        repo: repository.name,
        base: prevTag.commit.sha,
        head: currTag.commit.sha,
      },
    );

    await Promise.all(
      commits.map(async (commit) => {
        try {
          const cmt = await CommitModel.findOne({
            sha: commit.sha,
          });
          if (!cmt) {
            console.warn(`Commit not found: ${commit.sha}`);
            return;
          }

          const deployment = await DeploymentModel.findOne({
            repo_id: repository._id,
            commit_id: cmt._id,
            environment: "uat",
            name: `UAT/${release.deploymentVersion}`,
          });

          if (!deployment) {
            await DeploymentModel.create({
              repo_id: repository._id,
              commit_id: cmt._id,
              environment: "uat",
              name: `UAT/${release.deploymentVersion}`,
              status: "success",
              started_at: cmt.created_at,
              finished_at: releaseDate,
            });
          }
        } catch (err) {
          console.error(`Error processing commit ${commit.sha}:`, err);
        }
      }),
    );
  }
};

const scanProdReleases = async (
  client: Octokit,
  repository: Repository,
  release: {
    tagName: string;
    timestamp: string;
    deploymentVersion: string;
  },
) => {
  const tags = await client.paginate("GET /repos/{owner}/{repo}/tags", {
    owner: repository.owner,
    repo: repository.name,
  });

  const currTagIdx = tags.findIndex((tag) => tag.name === release.tagName);

  if (currTagIdx === -1) {
    console.warn(
      `Current tag (${release.tagName}) not found for ${repository.full_name}.`,
    );
    return;
  }

  const currTag = tags[currTagIdx];
  const prevTag = tags[currTagIdx + 1];

  if (!prevTag) {
    const commit = await CommitModel.findOne({
      sha: currTag.commit.sha,
    });
    if (!commit) {
      console.warn(`Commit not found: ${currTag.commit.sha}`);
      return;
    }

    const deployment = await DeploymentModel.findOne({
      repo_id: repository._id,
      commit_id: commit._id,
      environment: "prod",
      name: `PROD/${release.deploymentVersion}`,
    });

    if (!deployment) {
      await DeploymentModel.create({
        repo_id: repository._id,
        commit_id: commit._id,
        environment: "prod",
        name: `PROD/${release.deploymentVersion}`,
        status: "success",
        started_at: commit.created_at,
        finished_at: release.timestamp,
      });
    }
  } else {
    const {
      data: { commits },
    } = await client.request(
      "GET /repos/{owner}/{repo}/compare/{base}...{head}",
      {
        owner: repository.owner,
        repo: repository.name,
        base: prevTag.commit.sha,
        head: currTag.commit.sha,
      },
    );

    await Promise.all(
      commits.map(async (commit) => {
        try {
          const cmt = await CommitModel.findOne({
            sha: commit.sha,
          });
          if (!cmt) {
            console.warn(`Commit not found: ${commit.sha}`);
            return;
          }

          const deployment = await DeploymentModel.findOne({
            repo_id: repository._id,
            commit_id: cmt._id,
            environment: "prod",
            name: `PROD/${release.deploymentVersion}`,
          });

          if (!deployment) {
            await DeploymentModel.create({
              repo_id: repository._id,
              commit_id: cmt._id,
              environment: "prod",
              name: `PROD/${release.deploymentVersion}`,
              status: "success",
              started_at: cmt.created_at,
              finished_at: release.timestamp,
            });
          }
        } catch (err) {
          console.error(`Error processing commit ${commit.sha}:`, err);
        }
      }),
    );
  }
};

const GithubService = {
  scanRepository,
  scanCommits,
  scanWorkflows,
  scanReleases,
  scanUatReleases,
  scanProdReleases,
};

export { GithubService };
