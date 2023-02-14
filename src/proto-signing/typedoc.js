const packageJson = require("./package.json");

module.exports = {
  entryPoints: ["./uintHelpers"],
  out: "docs",
  exclude: "**/*.spec.ts",
  name: `${packageJson.name} Documentation`,
  readme: "README.md",
  excludeExternals: true,
  excludePrivate: true,
};
