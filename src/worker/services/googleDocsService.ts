import { PROD_REG_EXP, UAT_REG_EXP } from "@/utils";

const parseUatDocs = (deployment: string) => {
  const [firstLine, ...restLines] = deployment.split("\n");
  const deploymentVersion = firstLine.split(" ")[0];
  const versionRegex = UAT_REG_EXP;
  const match = firstLine.match(versionRegex);

  if (!match) {
    console.log("No version tag found at the start of the file.");
    return null;
  }

  const versionIndex = restLines.indexOf("Version");
  if (versionIndex === -1) {
    console.warn(
      `"Version" marker not found in deployment for ${deploymentVersion}.`
    );
    return null;
  }

  const content = restLines.slice(0, versionIndex).join("\n");
  const selectedRepositories = restLines.slice(versionIndex + 1); // Why.. Just why, now i need to stop version from overflowing to other content
  const [_, hour, minute, date] = match;
  const timestamp = new Date(`${date}T${hour}:${minute}:00Z`).toISOString();

  return { deploymentVersion, content, selectedRepositories, timestamp };
};
const parseProdDocs = (deployment: string) => {
  const [firstLine, ...restLines] = deployment.split("\n");
  const deploymentVersion = firstLine.split(" ")[0];
  const versionRegex = PROD_REG_EXP;
  const match = firstLine.match(versionRegex);

  if (!match) {
    console.log("No version tag found at the start of the file.");
    return null;
  }

  const versionIndex = restLines.indexOf("Version");
  if (versionIndex === -1) {
    console.warn(
      `"Version" marker not found in deployment for ${deploymentVersion}.`
    );
    return null;
  }

  const content = restLines.slice(0, versionIndex).join("\n");
  const selectedRepositories = restLines.slice(versionIndex + 1); // Why.. Just why, now i need to stop version from overflowing to other content
  const [_, hour, minute, date] = match;
  const timestamp = new Date(`${date}T${hour}:${minute}:00Z`).toISOString();

  return { deploymentVersion, content, selectedRepositories, timestamp };
};
const parseDeployment = (deployment: string, environment: string) => {
  const [firstLine, ...restLines] = deployment.split("\n");
  const deploymentVersion = firstLine.split(" ")[0];
  const versionRegex = environment === "prod" ? PROD_REG_EXP : UAT_REG_EXP;
  const match = firstLine.match(versionRegex);

  if (!match) {
    console.log("No version tag found at the start of the file.");
    return null;
  }

  const versionIndex = restLines.indexOf("Version");
  if (versionIndex === -1) {
    console.warn(
      `"Version" marker not found in deployment for ${deploymentVersion}.`
    );
    return null;
  }

  const content = restLines.slice(0, versionIndex).join("\n");
  const selectedRepositories = restLines.slice(versionIndex + 1); // Why.. Just why, now i need to stop version from overflowing to other content
  const [_, hour, minute, date] = match;
  const timestamp = new Date(`${date}T${hour}:${minute}:00Z`).toISOString();

  return { deploymentVersion, content, selectedRepositories, timestamp };
};
export { parseProdDocs, parseUatDocs, parseDeployment };
