import { PROD_REG_EXP, UAT_REG_EXP } from "@/utils";

const parseUatDocs = (deployment: string) => {
  const [firstLine, ...restLines] = deployment.split("\n");
  let deploymentVersion = firstLine.split(" ")[0];

  if (!/^v/i.test(deploymentVersion)) {
    deploymentVersion = "v" + deploymentVersion;
  }

  const match = firstLine.match(UAT_REG_EXP);

  if (!match) {
    console.log("No version tag found at the start of the file.");
    return null;
  }

  const date = match[1];

  const versionIndex = restLines.indexOf("Version");
  if (versionIndex === -1) {
    console.warn(
      `"Version" marker not found in deployment for ${deploymentVersion}.`,
    );
    return null;
  }

  const content = restLines.slice(0, versionIndex).join("\n");
  const selectedRepositories = restLines.slice(versionIndex + 1);
  const timestamp = new Date(`${date}T00:00:00Z`).toISOString();

  return { deploymentVersion, content, selectedRepositories, timestamp };
};

const parseProdDocs = (deployment: string) => {
  const [firstLine, ...restLines] = deployment.split("\n");
  let deploymentVersion = firstLine.split(" ")[0];

  if (!/^v/i.test(deploymentVersion)) {
    deploymentVersion = "v" + deploymentVersion;
  }

  const match = firstLine.match(PROD_REG_EXP);

  if (!match) {
    console.log("No version tag found at the start of the file.");
    return null;
  }

  const [hour, minute, date] = [match[1], match[2], match[3]];

  const versionIndex = restLines.indexOf("Version");
  if (versionIndex === -1) {
    console.warn(
      `"Version" marker not found in deployment for ${deploymentVersion}.`,
    );
    return null;
  }

  const content = restLines.slice(0, versionIndex).join("\n");
  const selectedRepositories = restLines.slice(versionIndex + 1);
  const timestamp = new Date(`${date}T${hour}:${minute}:00Z`).toISOString();

  return { deploymentVersion, content, selectedRepositories, timestamp };
};

const GoogleDocumentParserService = {
  parseUatDocs,
  parseProdDocs,
};

export { GoogleDocumentParserService };
