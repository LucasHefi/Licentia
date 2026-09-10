import { writeFile, rename, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchGithubSignals } from "../lib/github-signals-source.ts";
import { decodeGithubSignalPayload, GITHUB_SIGNALS_SOURCE_URL } from "../lib/public-signals.ts";

const destination = fileURLToPath(new URL("../data/github-signals.snapshot.json", import.meta.url));

export async function writeGithubSignalsSnapshot(payload: unknown, output = destination) {
  const decoded = decodeGithubSignalPayload(payload);
  if (!decoded || decoded.status !== "complete") throw new Error("GitHub neposkytl údaje pro všech sedm licencí. Původní snímek zůstává zachován.");
  const temporary = `${output}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify({
      source: decoded.source,
      sourceUrl: GITHUB_SIGNALS_SOURCE_URL,
      fetchedAt: decoded.fetchedAt,
      coverage: "Veřejné repozitáře s rozpoznanou licencí; výchozí vyhledávání bez forků.",
      caveat: decoded.caveat,
      status: decoded.status,
      licenses: decoded.signals,
    }, null, 2) + "\n");
    await rename(temporary, output);
  } finally {
    await rm(temporary, { force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const payload = await fetchGithubSignals();
    await writeGithubSignalsSnapshot(payload);
    console.log(`Uloženo ${payload.licenses.length} licencí, sběr ${payload.fetchedAt}.`);
    for (const signal of payload.licenses) console.log(`${signal.id}: ${signal.repositoryCount}${signal.incompleteResults ? " (GitHub označil výsledek jako neúplný)" : ""}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Aktualizace statistik se nezdařila.");
    process.exitCode = 1;
  }
}
