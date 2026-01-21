import { loadFixture } from "./loadFixture.js";
import * as yaml from "js-yaml";
import * as fs from "fs";
import * as path from "path";

async function loadYamlFixture(dir: string, filename: string) {
  const filePath = path.join(
    process.cwd(),
    "../..",
    "data",
    "fixtures",
    "recorded",
    dir,
    `${filename}.yml`,
  );
  const fileContents = fs.readFileSync(filePath, "utf8");
  const yamlData = yaml.load(fileContents);
  return loadFixture(yamlData);
}

void (async () => {
  try {
    const allItems = await Promise.all([
      loadYamlFixture("actions", "bringArgMadeAfterLook"),
      loadYamlFixture("decorations", "chuckBlockAirUntilBatt"),
      loadYamlFixture("decorations", "cutFine"),
      loadYamlFixture("decorations", "chuckLineFine"),
      loadYamlFixture("actions", "bringAirAndBatAndCapToAfterItemEach"),
    ]);
    allItems.forEach((item) => {
      if (item) {
        console.log(`
.wrapper
  .before
    ${item.before.replace(/\n/gi, "\n    ")}
  .during
    ${(item.during || item.before).replace(/\n/gi, "\n    ")}
    .command ${item.command}
  .after
    ${item.after.replace(/\n/gi, "\n    ")}
`);
      }
    });
  } catch (err) {
    console.error("Error loading fixtures:", err);
  }
})();
