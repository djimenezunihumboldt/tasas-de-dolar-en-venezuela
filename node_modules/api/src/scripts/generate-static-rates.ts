import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getRatesToday, refreshNow } from "../rates";

async function main() {
  await refreshNow();

  const data = getRatesToday();

  const outputFile = fileURLToPath(
    new URL("../../../app/public/rates-today.json", import.meta.url)
  );

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, JSON.stringify(data, null, 2) + "\n", "utf8");

  // eslint-disable-next-line no-console
  console.log(`Wrote ${outputFile}`);
}

void main();
