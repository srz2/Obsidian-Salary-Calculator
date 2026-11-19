// Run by "npm version" to copy the new package.json version into manifest.json and versions.json.
import { readFileSync, writeFileSync } from "node:fs";

const version = process.env.npm_package_version;
if (!version) {
	console.error('Run this through "npm version", not directly.');
	process.exit(1);
}

function updateJson(file, update) {
	const data = JSON.parse(readFileSync(file, "utf8"));
	update(data);
	writeFileSync(file, `${JSON.stringify(data, null, "\t")}\n`);
}

let minAppVersion;
updateJson("manifest.json", (manifest) => {
	manifest.version = version;
	minAppVersion = manifest.minAppVersion;
});

// versions.json tells Obsidian the newest plugin version each app version can install,
// so it only needs an entry when minAppVersion changes.
updateJson("versions.json", (versions) => {
	if (!Object.values(versions).includes(minAppVersion)) versions[version] = minAppVersion;
});
