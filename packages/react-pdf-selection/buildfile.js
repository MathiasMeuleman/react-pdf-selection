const fsp = require("fs").promises;
const readline = require("readline");
const replace = require("replace-in-file");
const spawnSync = require("child_process").spawnSync;

const r1 = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function question(query) {
    return new Promise((resolve) => {
        r1.question(query, function(answer) {
            resolve(answer);
        });
    });
}

async function runnpm(args, opts) {
    const options = opts || {};
    await spawnSync("npm", args, {...options, stdio: "inherit"});
}

async function publish() {
    const version = await question("Select a semver option (one of [<newversion> | major | minor | patch | premajor | preminor | prepatch | prerelease [--preid=<prerelease-id>] | from-git]:\n");
    const message = await question("Optional version commit message:\n");
    await runnpm(["run", "build"]);
    await runnpm(["version", version, "-m", message]);
    // Copy package.json to dist/ and update path references to allow publishing dist/ folder only
    await fsp.copyFile("./package.json", "./dist/package.json");
    await replace({
        files: "./dist/package.json",
        from: /dist\/index/g,
        to: "index",
    });
    await runnpm(["publish"], {cwd: "./dist"});
    await runnpm(["run", "deploy"], {cwd: "../examples"});
    r1.close();
}

publish();
