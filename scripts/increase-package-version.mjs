import { inc } from "semver";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import process from "process";

const packageJsonPath = join(process.cwd(), "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const currentVersion = packageJson.version;

if (!currentVersion) {
  throw new Error("Current version not found in package.json");
}

// Function to increment the version based on the release type
export function incrementVersion(releaseType) {
  const validReleaseTypes = ["major", "minor", "patch", "prerelease", "premajor", "preminor", "prepatch"];

  if (!validReleaseTypes.includes(releaseType)) {
    throw new Error(`Invalid release type: ${releaseType}. Valid types are: ${validReleaseTypes.join(", ")}`);
  }

  const newVersion = inc(currentVersion, releaseType);

  if (!newVersion) {
    throw new Error(`Failed to increment version from ${currentVersion} using release type ${releaseType}`);
  }

  return newVersion;
}

// Parse command line arguments
const args = process.argv.slice(2);
const releaseType = args.find((arg) => !arg.startsWith("--")) || "patch"; // Get release type from command line argument or default to 'patch'
const shouldSave = args.includes("--save");

try {
  const newVersion = incrementVersion(releaseType);
  console.log(`Current version: ${currentVersion}`);
  console.log(`New version: ${newVersion}`);

  if (shouldSave) {
    // Update the package.json file
    packageJson.version = newVersion;
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
    console.log(`Updated package.json with new version: ${newVersion}`);
  } else {
    console.log("Use --save flag to update package.json file");
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
