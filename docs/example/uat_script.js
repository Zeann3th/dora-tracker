/**
 * This is a script for your Google Docs to run hourly in App Script.
 * This is specifically used for uat (not using the timestamp in version, track by the time of update)
 **/

function onEdit(e) {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody().getText();
  const docId = doc.getId();
  const lastModifiedTime = new Date().toISOString();

  const versionRegex = /(v\d+\.\d+\.\d+\s\(\d{4}-\d{2}-\d{2}\))/gm;
  const blocks = body
    .split(versionRegex)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) return console.log("No valid version blocks found.");

  const firstBlock = blocks[0] + "\n" + (blocks[1] || "");
  console.log(firstBlock);

  const lines = firstBlock.split("\n").map((line) => line.trim());
  const [firstLine, ...restLines] = lines;

  // Check version tag
  const versionRegexCheck = /^v\d+\.\d+\.\d+\s\(\d{4}-\d{2}-\d{2}\)$/;
  if (!versionRegexCheck.test(firstLine))
    return console.log("No version tag found at the start of the file.");

  const versionIndex = restLines.indexOf("Version");
  const content = restLines.slice(0, versionIndex).join("\n");
  const selectedRepositories = restLines.slice(versionIndex + 1);
  const currentVersion = firstLine.split(" ")[0];
  console.log(currentVersion);
  console.log(selectedRepositories);

  // Get and compare stored version
  const scriptProperties = PropertiesService.getScriptProperties();
  if (scriptProperties.getProperty(docId) >= currentVersion)
    return console.log("No new version detected.");

  // Send payload
  sendToWebhook({
    docId,
    version: currentVersion,
    environment: "uat",
    timestamp: lastModifiedTime,
    content,
    target: selectedRepositories,
  });

  // Update stored version
  scriptProperties.setProperty(docId, currentVersion);
}

// Send data to the webhook
function sendToWebhook(payload) {
  const url = "<YOUR-ENDPOINT-HERE>/api/v1/webhooks/google";
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
  };
  UrlFetchApp.fetch(url, options);
}
