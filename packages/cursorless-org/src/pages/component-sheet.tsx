import { TestCaseComponentPage } from "@cursorless/test-case-component";

import { cheatsheetBodyClasses } from "@cursorless/cheatsheet";

import * as yaml from "js-yaml";
import fs from "fs";
import path from "path";

import Head from "next/head";

const fixturesDir = path.join("../", "../", "data", "fixtures", "recorded");

async function loadYamlFiles(dir: string, selectedFiles?: string[]) {
  const directoryPath = path.join(process.cwd(), dir);
  const files = fs.readdirSync(directoryPath);
  const data: any[] = [];

  files.forEach((file) => {
    if (
      path.extname(file) === ".yml" &&
      (!selectedFiles || selectedFiles.includes(file))
    ) {
      const filePath = path.join(directoryPath, file);
      const fileContents = fs.readFileSync(filePath, "utf8");
      const yamlData: any = yaml.load(fileContents);
      data.push(yamlData);
    }
  });

  return data;
}

// See https://github.com/vercel/next.js/discussions/12325#discussioncomment-1116108
export async function getStaticProps() {
  const itemsDirActions = path.join(fixturesDir, "actions");
  const itemsDirDecorations = path.join(fixturesDir, "decorations");
  const testSelectedFiles = [
    "bringArgMadeAfterLook.yml",
    "chuckBlockAirUntilBatt.yml",
    "cutFine.yml",
    "chuckLineFine.yml",
    "bringAirAndBatAndCapToAfterItemEach.yml",
    "carveLineHarp.yml",
    "chuckBlockAir.yml",
    "chuckBlockAirUntilBatt.yml",
    "chuckBlockBatt.yml",
    "chuckBlockBatt2.yml",
    "chuckBlockBattUntilAir.yml",
    "chuckFine.yml",
    "chuckLineFine.yml",
    "chuckLineFineBetweenRisk.yml",
    "clearBlockFine.yml",
    "clearFine.yml",
    "clearLineFine.ym",
  ];
  const dataActions = await loadYamlFiles(itemsDirActions, testSelectedFiles);
  const dataDecorations = await loadYamlFiles(
    itemsDirDecorations,
    testSelectedFiles,
  );
  const data = [...dataActions, ...dataDecorations];

  // Pass raw fixture data instead of processed HTML
  return { props: { data, loaded: data, bodyClasses: cheatsheetBodyClasses } };
}

interface PageProps {
  data: any;
  loaded: any;
}

export function Page({ data, loaded }: PageProps) {
  return (
    <>
      <Head>
        <title>Cursorless Test Case Component Page</title>
      </Head>
      <TestCaseComponentPage data={data} loaded={loaded} />
    </>
  );
}

export default Page;
