import env from "@/env";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: env.GH_PAT,
});

export default octokit;
