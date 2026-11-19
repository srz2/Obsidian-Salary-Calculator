// Fails the release unless the tag is a semantic version matching manifest.json and package.json.
// Usage: node scripts/check-release-tag.mjs <tag>
import { appendFileSync, readFileSync } from "node:fs";

// The official pattern from https://semver.org. Group 4 is the prerelease label.
const SEMVER =
	/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

function fail(message) {
	console.error(`::error::${message}`);
	process.exit(1);
}

const tag = process.argv[2] ?? "";
const match = SEMVER.exec(tag);

if (!match) {
	fail(
		/^v\d/.test(tag)
			? `Tag "${tag}" starts with "v". Obsidian expects the bare version, like "${tag.slice(1)}".`
			: `Tag "${tag}" is not a semantic version, like 1.2.3 or 1.2.3-beta.1.`,
	);
}

for (const file of ["manifest.json", "package.json"]) {
	const { version } = JSON.parse(readFileSync(file, "utf8"));
	if (version !== tag) {
		fail(`${file} has version "${version}", but the tag is "${tag}". Use "npm version" to bump and tag together.`);
	}
}

const prerelease = match[4] !== undefined;
console.log(`Releasing ${tag}${prerelease ? " as a prerelease" : ""}.`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `prerelease=${prerelease}\n`);
