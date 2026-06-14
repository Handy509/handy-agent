const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const excludedDirectories = new Set([".git", "node_modules", "data", "logs", "coverage"]);
const excludedFiles = new Set(["package-lock.json", "security.test.js"]);

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (excludedDirectories.has(entry.name)) return [];
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    if (excludedFiles.has(entry.name)) return [];
    return [fullPath];
  });
}

test("repository does not contain common committed secret formats", () => {
  const privateKeyMarker = ["-----BEGIN", "PRIVATE KEY-----"].join(" ");
  const patterns = [
    privateKeyMarker,
    ["sk", "svcacct", ""].join("-"),
    ["sk", "proj", ""].join("-"),
    ["ghp", ""].join("_"),
    ["xoxb", ""].join("-")
  ];
  const findings = [];

  for (const filePath of sourceFiles(root)) {
    const content = fs.readFileSync(filePath, "utf8");
    for (const pattern of patterns) {
      if (content.includes(pattern)) {
        findings.push(`${path.relative(root, filePath)}: ${pattern}`);
      }
    }
  }

  assert.deepEqual(findings, []);
});

test("no environment or private-key files are committed in the working tree", () => {
  const forbidden = sourceFiles(root)
    .map((filePath) => path.relative(root, filePath))
    .filter((name) =>
      /(^|[\\/])\.env($|\.)/.test(name) && name !== ".env.example"
      || /\.(p8|p12|pem|key)$/i.test(name)
    );

  assert.deepEqual(forbidden, []);
});
