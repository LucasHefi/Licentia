"use client";

import { useRef, useState } from "react";
import snapshot from "../data/github-signals.snapshot.json";
import { fetchGithubSignals } from "../lib/github-signals-source";
import { decodeGithubSignalPayload, GITHUB_SIGNALS_SOURCE_URL, mergeGithubSignalReadings, type GithubSignalReading } from "../lib/public-signals";

const initialPayload = decodeGithubSignalPayload(snapshot);
if (!initialPayload || initialPayload.status !== "complete") throw new Error("Neplatný datový snímek statistik GitHubu.");
const initialReadings: GithubSignalReading[] = initialPayload.signals.map((signal) => ({ signal, fetchedAt: initialPayload.fetchedAt, origin: "snapshot" }));
const countFormat = new Intl.NumberFormat("cs-CZ");
const dateFormat = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Prague" });

export default function GithubSignals() {
  const [readings, setReadings] = useState(initialReadings);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("Zobrazen je datový snímek přiložený k aplikaci. Aktuální údaje můžete načíst online.");
  const inFlight = useRef(false);

  async function refresh() {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setNotice("Načítám aktuální údaje z GitHubu…");
    try {
      let raw: unknown;
      if (document.documentElement.dataset.licentiaStaticTarget === "true") {
        raw = await fetchGithubSignals();
      } else {
        const response = await fetch("./api/signals", { cache: "no-store", signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        raw = await response.json();
      }
      const payload = decodeGithubSignalPayload(raw);
      if (!payload) throw new Error("Neplatná odpověď statistik.");
      setReadings((previous) => mergeGithubSignalReadings(previous, payload));
      const available = payload.signals.filter((signal) => signal.repositoryCount !== null && !signal.error).length;
      const reason = payload.signals.find((signal) => signal.error)?.error ?? "";
      setNotice(payload.status === "complete"
        ? "Údaje byly obnoveny. Datum sběru je uvedeno u každé licence."
        : `Obnoveno ${available} ze ${payload.signals.length} licencí. ${reason} U ostatních zůstávají poslední dostupné údaje.`);
    } catch {
      setNotice("Aktualizace se nezdařila. Zůstávají poslední dostupné údaje; načtení můžete zkusit znovu.");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  return (
    <section className="github-signals" aria-labelledby="github-signals-heading">
      <div>
        <span className="section-kicker light">GitHub průzkum</span>
        <h2 id="github-signals-heading">Licence ve veřejných repozitářích.</h2>
        <p>Počty veřejných repozitářů, u kterých GitHub rozpoznal licenci. Výchozí vyhledávání nezahrnuje forky. Nejde o počet uživatelů, instalací ani všech závislostí.</p>
        <p className="github-status" role="status">{notice}</p>
        <div className="github-actions">
          <button type="button" onClick={refresh} disabled={loading}>{loading ? "Načítám…" : "Obnovit údaje"}</button>
          <a href={GITHUB_SIGNALS_SOURCE_URL} target="_blank" rel="noreferrer">Zdroj a metodika GitHubu ↗</a>
        </div>
        <p>Časy sběru uvádíme v časovém pásmu Praha. GPL, LGPL a AGPL používají skupiny licencí rozpoznávané GitHubem; nerozlišují varianty „only“ a „or-later“.</p>
      </div>
      <div className="github-license-links" aria-busy={loading}>
        {readings.map(({ signal, fetchedAt, origin }) => (
          <article key={signal.id}>
            <code>{signal.id}</code>
            <strong>{countFormat.format(signal.repositoryCount!)}</strong>
            <span>veřejných repozitářů</span>
            {signal.incompleteResults && <span className="github-incomplete">GitHub označil výsledek jako neúplný.</span>}
            <small>{origin === "snapshot" ? "Datový snímek" : "Načteno online"} · <time dateTime={fetchedAt}>{dateFormat.format(new Date(fetchedAt))}</time></small>
            {signal.topRepositories.slice(0, 2).map((repo) => <a className="github-repository" href={repo.url} key={repo.name} target="_blank" rel="noreferrer">{repo.name} · ★ {countFormat.format(repo.stars)}</a>)}
            <a className="github-search-link" href={`https://github.com/search?q=license%3A${signal.query}&type=repositories`} target="_blank" rel="noreferrer">Otevřít veřejné vyhledávání ↗</a>
          </article>
        ))}
      </div>
    </section>
  );
}
