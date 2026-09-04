"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import packageJson from "../package.json";
import { familyOf, ruleLabels } from "../lib/recommend";
import { candidateStatusLabels, evidenceLabels, guideMessage, outcomeLabels } from "../lib/guide-copy";
import { buildGuideModel, GUIDE_MODEL_VERSION, recommendFromCatalog, runtimeSourceLockResolved, type GuideAnswers } from "../lib/recommendation-contract";
import { safeStoredWorkspaceState } from "../lib/workspace-state";
import { decodeGithubSignalPayload, type GithubSignal } from "../lib/public-signals";
import AccountMenu from "./AccountMenu";
import type {
  ActivityEntry,
  AppIdentity,
  LicenseDetail,
  LicenseSummary,
  LicenseType,
  WorkspaceState,
} from "./types";

type View = "catalog" | "guide" | "compare" | "saved" | "signals" | "ecosystem" | "about";
type StatusFilter = "current" | "all" | "deprecated";
type ApprovalFilter = "all" | "osi" | "fsf" | "profiled";
type UpdateState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "up-to-date"; version: string }
  | { status: "available"; version: string; url: string }
  | { status: "error"; message: string };
type GithubSignalState =
  | { status: "idle" }
  | { status: "ready" | "partial"; fetchedAt: string; source: string; caveat: string; signals: GithubSignal[] }
  | { status: "error" }
  | { status: "unavailable"; reason: string };

const DATA_ROOT = "./data";
const PAGE_SIZE = 48;
const APP_VERSION = packageJson.version;
const APP_REPOSITORY_URL = "https://github.com/LucasHefi/Licentia";
const APP_RELEASES_API_URL = "https://api.github.com/repos/LucasHefi/Licentia/releases/latest";
const APP_RELEASES_PAGE_URL = `${APP_REPOSITORY_URL}/releases`;
const APP_LICENSE_URL = `${APP_REPOSITORY_URL}/blob/main/LICENSE`;
const APP_AUTHOR = "Lukáš Hefner";

const guideModel = buildGuideModel();
const guideQuestions = guideModel.questions.map((question) => ({
  ...question,
  hint: `${question.help} Model ${GUIDE_MODEL_VERSION}.`,
  options: question.options.map((option) => ({ ...option, description: question.help })),
}));


const ecosystemSources = [
  {
    badge: "Primární zdroj",
    title: "SPDX License List API",
    url: "https://spdx.org/licenses/licenses.json",
    description: "Kompletní index, kanonická znění, výjimky, šablony a stabilní SPDX identifikátory.",
    endpoints: ["GET /licenses/licenses.json", "GET /licenses/{SPDX-ID}.json"],
  },
  {
    badge: "Schválení",
    title: "Open Source Initiative API",
    url: "https://opensource.org/api/license",
    description: "Oficiální metadata OSI Approved Licenses, data schválení, správci a historický stav.",
    endpoints: ["GET /api/license", "GET /api/licenses?spdx={query}"],
  },
  {
    badge: "Praktická metadata",
    title: "GitHub Licenses API",
    url: "https://docs.github.com/en/rest/licenses",
    description: "Kurátorovaný výběr běžných licencí, podmínky a rozpoznání licence konkrétního repozitáře.",
    endpoints: ["GET /licenses", "GET /repos/{owner}/{repo}/license"],
  },
  {
    badge: "AI integrace",
    title: "SPDX License MCP",
    url: "https://registry.modelcontextprotocol.io/?q=io.github.pipeworx-io%2Fspdx-license",
    description: "Komunitní MCP server v oficiálním registru. Vhodný jako adaptér, ne jako autoritativní zdroj dat.",
    endpoints: ["search_licenses", "get_license_text"],
  },
];

const publicSignalSources = [
  {
    badge: "Aktivita",
    title: "GitHub",
    description: "Veřejné repozitáře, hvězdy, forky a poslední aktivita. Jde o signál viditelnosti projektu, nikoli o počet uživatelů.",
    url: "https://docs.github.com/en/rest/licenses/licenses",
  },
  {
    badge: "Balíčky",
    title: "npm a crates.io",
    description: "Download statistiky konkrétních balíčků v časovém okně. Jedno stažení není totéž co jeden uživatel nebo instalace.",
    url: "https://github.com/npm/registry/blob/main/docs/download-counts.md",
  },
  {
    badge: "Kontext",
    title: "deps.dev",
    description: "Licence, závislosti, vazby na repozitáře a dostupné signály zdraví projektu z více ekosystémů.",
    url: "https://docs.deps.dev/api/v3/",
  },
  {
    badge: "Kvalita údajů",
    title: "ClearlyDefined",
    description: "Porovnání deklarované a detekované licence, kurace a úplnost licenčních údajů u balíčků.",
    url: "https://docs.clearlydefined.io/docs/get-involved/using-data",
  },
];

const trackedPublicLicenses = [
  ["MIT", "mit"],
  ["Apache-2.0", "apache-2.0"],
  ["GPL-3.0", "gpl-3.0"],
  ["BSD-3-Clause", "bsd-3-clause"],
  ["MPL-2.0", "mpl-2.0"],
  ["LGPL-3.0", "lgpl-3.0"],
  ["AGPL-3.0", "agpl-3.0"],
] as const;

const familyLabels: Record<string, string> = {
  "Permisivní": "Permisivní",
  "Maximálně volná": "Maximálně volná",
  "Síťový copyleft": "Síťový copyleft",
  "Silný copyleft": "Silný copyleft",
  "Knihovní copyleft": "Knihovní copyleft",
  "Souborový copyleft": "Souborový copyleft",
  "Neklasifikováno": "Neklasifikováno",
};

function detailUrl(type: LicenseType, id: string) {
  const folder = type === "license" ? "licenses" : "exceptions";
  return `${DATA_ROOT}/${folder}/${encodeURIComponent(id)}.json`;
}

function includesLoose(value: string, query: string) {
  return value.toLocaleLowerCase("cs").includes(query.toLocaleLowerCase("cs"));
}

function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function initialGithubSignalState(): GithubSignalState {
  return typeof document !== "undefined" && document.documentElement.dataset.licentiaStaticTarget === "true"
    ? { status: "unavailable", reason: "Živá data jsou dostupná pouze ve webové variantě." }
    : { status: "idle" };
}

function versionParts(value: string): [number, number, number] | null {
  const match = value.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/i);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function isNewerVersion(current: string, candidate: string): boolean {
  const currentParts = versionParts(current);
  const candidateParts = versionParts(candidate);
  if (!currentParts || !candidateParts) return false;
  for (let index = 0; index < currentParts.length; index += 1) {
    if (candidateParts[index] !== currentParts[index]) return candidateParts[index] > currentParts[index];
  }
  return false;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("cs-CZ").format(value);
}

function RuleList({ title, values, tone }: { title: string; values: string[]; tone: string }) {
  return (
    <div className={`rule-group ${tone}`}>
      <h4>{title}</h4>
      {values.length ? (
        <ul>{values.map((value) => <li key={value}>{ruleLabels[value] ?? value}</li>)}</ul>
      ) : <p>Bez strukturovaných metadat.</p>}
    </div>
  );
}

function LicenseBadges({ license }: { license: LicenseSummary }) {
  return (
    <div className="card-flags">
      {license.osi && <span className="positive">OSI</span>}
      {license.fsf && <span>FSF</span>}
      <span>{license.type === "exception" ? "Výjimka" : familyOf(license)}</span>
      {license.deprecated && <span className="danger">Historická</span>}
    </div>
  );
}

export default function LicenseStudio({ account }: { account?: AppIdentity | null }) {
  const [view, setView] = useState<View>("catalog");
  const [catalog, setCatalog] = useState<LicenseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [fullText, setFullText] = useState(false);
  const [searchIndex, setSearchIndex] = useState<Array<{ id: string; type: LicenseType; haystack: string }> | null>(null);
  const [searchFailed, setSearchFailed] = useState(false);
  const searchRequested = useRef(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("current");
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | LicenseType>("license");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [detail, setDetail] = useState<LicenseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<"overview" | "text" | "template">("overview");
  const [copied, setCopied] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareDetails, setCompareDetails] = useState<LicenseDetail[]>([]);
  const [guideStep, setGuideStep] = useState(0);
  const [guideMode, setGuideMode] = useState<"quick" | "advanced">("quick");
  const [answers, setAnswers] = useState<GuideAnswers>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<ActivityEntry[]>([]);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateState>({ status: "idle" });
  const [githubSignalState, setGithubSignalState] = useState<GithubSignalState>(initialGithubSignalState);
  const githubSignalRequested = useRef(false);
  const [remoteSaveEnabled, setRemoteSaveEnabled] = useState(!account);
  const workspaceVersion = useRef<string | null>(null);
  const lastPersistedWorkspace = useRef("");
  const guideRecorded = useRef(false);

  useEffect(() => {
    const load = async () => {
      setWorkspaceReady(false);
      setRemoteSaveEnabled(!account);
      workspaceVersion.current = null;
      lastPersistedWorkspace.current = "";
      try {
        let raw: unknown;
        if (account) {
          const response = await fetch("./api/state", { credentials: "include", cache: "no-store" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          raw = await response.json();
          workspaceVersion.current = typeof (raw as WorkspaceState).updatedAt === "string" ? (raw as WorkspaceState).updatedAt! : null;
        } else {
          raw = JSON.parse(localStorage.getItem("licentia-workspace") ?? "{}");
        }
        const state = safeStoredWorkspaceState(raw);
        setFavorites(state.favorites);
        setCompareIds(state.compareIds);
        setAnswers(state.guideAnswers as GuideAnswers);
        setHistory(state.history);
        lastPersistedWorkspace.current = JSON.stringify(state);
        setRemoteSaveEnabled(true);
      } catch {
        if (account) setError("Pracovní prostor se nepodařilo načíst. Synchronizace je pozastavena, aby nedošlo k přepsání dat.");
        else {
          const state = safeStoredWorkspaceState({});
          lastPersistedWorkspace.current = JSON.stringify(state);
          setRemoteSaveEnabled(true);
        }
      }
      finally { setWorkspaceReady(true); }
    };
    load();
  }, [account]);

  useEffect(() => {
    if (!workspaceReady || !remoteSaveEnabled) return;
    const state: WorkspaceState = { favorites, compareIds, guideAnswers: answers as WorkspaceState["guideAnswers"], history };
    const serialized = JSON.stringify(state);
    if (serialized === lastPersistedWorkspace.current) return;
    const timer = window.setTimeout(() => {
      if (account) {
        fetch("./api/state", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json", ...(account.csrfToken ? { "X-CSRF-Token": account.csrfToken } : {}) }, body: JSON.stringify({ ...state, baseUpdatedAt: workspaceVersion.current }) })
          .then(async (response) => {
            const value = await response.json().catch(() => ({})) as { updatedAt?: string; error?: string };
            if (!response.ok) throw Object.assign(new Error(value.error ?? "Synchronizace se nepodařila."), { conflict: response.status === 409 });
            workspaceVersion.current = value.updatedAt ?? workspaceVersion.current;
            lastPersistedWorkspace.current = serialized;
          })
          .catch((syncError: Error & { conflict?: boolean }) => {
            if (syncError.conflict) setRemoteSaveEnabled(false);
            setError(syncError.conflict ? "Pracovní prostor byl změněn na jiném zařízení. Obnovte stránku, aby nedošlo k přepsání změn." : "Změny se nepodařilo synchronizovat. Zůstanou v této relaci a další změna vyvolá nový pokus.");
          });
      } else {
        localStorage.setItem("licentia-workspace", serialized);
        lastPersistedWorkspace.current = serialized;
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [workspaceReady, remoteSaveEnabled, account, favorites, compareIds, answers, history]);

  useEffect(() => {
    fetch(`${DATA_ROOT}/catalog.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<LicenseSummary[]>;
      })
      .then((data: LicenseSummary[]) => setCatalog(data))
      .catch(() => setError("Datový katalog se nepodařilo načíst."))
      .finally(() => setLoading(false));

    if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("./sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setView("catalog");
        requestAnimationFrame(() => document.querySelector<HTMLInputElement>("#license-search")?.focus());
      }
      if (event.key === "Escape" && detail) setDetail(null);
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, [detail]);

  useEffect(() => {
    document.body.style.overflow = detail ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [detail]);

  useEffect(() => {
    if (!fullText || deferredQuery.length < 3 || searchIndex || searchRequested.current) return;
    searchRequested.current = true;
    fetch(`${DATA_ROOT}/search-index.json`)
      .then((response) => response.json() as Promise<Array<{ id: string; type: LicenseType; haystack: string }>>)
      .then(setSearchIndex)
      .catch(() => {
        setSearchFailed(true);
        setError("Plnotextový index se nepodařilo načíst.");
      });
  }, [fullText, deferredQuery, searchIndex]);

  useEffect(() => {
    if (view !== "compare" || compareIds.length === 0) return;
    Promise.all(
      compareIds.map(async (id) => {
        const summary = catalog.find((item) => item.id === id);
        const response = await fetch(detailUrl(summary?.type ?? "license", id));
        return response.json() as Promise<LicenseDetail>;
      }),
    ).then(setCompareDetails).catch(() => setError("Porovnání se nepodařilo načíst."));
  }, [view, compareIds, catalog]);

  useEffect(() => {
    if (view !== "signals" || githubSignalRequested.current) return;
    githubSignalRequested.current = true;
    if (document.documentElement.dataset.licentiaStaticTarget === "true") {
      return;
    }
    fetch("./api/signals", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((payload) => {
        const decoded = decodeGithubSignalPayload(payload);
        if (!decoded) throw new Error("Neplatná odpověď.");
        if (decoded.status === "unavailable") {
          const reason = decoded.caveat.trim() || decoded.signals.find((signal) => signal.error)?.error || "Živá data nejsou momentálně dostupná.";
          setGithubSignalState({ status: "unavailable", reason });
        } else {
          setGithubSignalState({ status: decoded.status === "complete" ? "ready" : "partial", fetchedAt: decoded.fetchedAt, source: decoded.source, caveat: decoded.caveat, signals: decoded.signals });
        }
      })
      .catch(() => setGithubSignalState({ status: "error" }));
  }, [view, githubSignalState.status]);

  const fullTextMatches = useMemo(() => {
    if (!fullText || deferredQuery.length < 3 || !searchIndex) return null;
    const terms = deferredQuery.toLocaleLowerCase("cs").split(/\s+/).filter(Boolean);
    return new Set(
      searchIndex
        .filter((entry) => terms.every((term) => entry.haystack.includes(term)))
        .map((entry) => `${entry.type}:${entry.id}`),
    );
  }, [fullText, deferredQuery, searchIndex]);

  const filtered = useMemo(() => catalog.filter((license) => {
    if (typeFilter !== "all" && license.type !== typeFilter) return false;
    if (statusFilter === "current" && license.deprecated) return false;
    if (statusFilter === "deprecated" && !license.deprecated) return false;
    if (approvalFilter === "osi" && !license.osi) return false;
    if (approvalFilter === "fsf" && !license.fsf) return false;
    if (approvalFilter === "profiled" && !license.profiled) return false;
    if (!deferredQuery) return true;
    const metadataMatch = includesLoose(`${license.id} ${license.name}`, deferredQuery);
    const textMatch = fullTextMatches?.has(`${license.type}:${license.id}`) ?? false;
    return metadataMatch || textMatch;
  }), [catalog, deferredQuery, fullTextMatches, statusFilter, approvalFilter, typeFilter]);

  const recommendations = useMemo(
    () => {
      const activeKeys = new Set(guideQuestions.filter((question) => question.mode === guideMode && (!question.showWhen || answers[question.showWhen.key] === question.showWhen.equals)).map((question) => question.key));
      const scopedAnswers = Object.fromEntries(Object.entries(answers).filter(([key]) => activeKeys.has(key as keyof GuideAnswers))) as GuideAnswers;
      const knownIdentifiers = catalog.filter((item) => item.type === "license").map((item) => item.id);
      const knownExceptionIdentifiers = catalog.filter((item) => item.type === "exception").map((item) => item.id);
      return recommendFromCatalog(catalog, scopedAnswers, { sourceLockResolved: runtimeSourceLockResolved(catalog), ruleVersion: "1.0.0", knownIdentifiers, knownExceptionIdentifiers, guideMode });
    },
    [catalog, answers, guideMode],
  );
  const reviewedRecommendationCount = useMemo(() => catalog.filter((item) => item.type === "license" && item.metadata?.review.recommendable === true).length, [catalog]);
  const catalogStats = useMemo(() => {
    const licenses = catalog.filter((item) => item.type === "license");
    const families = new Map<string, number>();
    licenses.forEach((license) => {
      const family = familyOf(license);
      families.set(family, (families.get(family) ?? 0) + 1);
    });
    return {
      total: catalog.length,
      licenses: licenses.length,
      exceptions: catalog.filter((item) => item.type === "exception").length,
      current: licenses.filter((item) => !item.deprecated).length,
      osi: licenses.filter((item) => item.osi).length,
      fsf: licenses.filter((item) => item.fsf).length,
      profiled: licenses.filter((item) => item.profiled).length,
      recommendable: reviewedRecommendationCount,
      families: [...families.entries()].sort(([, left], [, right]) => right - left),
    };
  }, [catalog, reviewedRecommendationCount]);
  const searchLoading = fullText && deferredQuery.length >= 3 && !searchIndex && !searchFailed;

  function recordActivity(kind: ActivityEntry["kind"], label: string) {
    setHistory((current) => [{ id: crypto.randomUUID(), kind, label, createdAt: new Date().toISOString() }, ...current].slice(0, 100));
  }

  async function checkForUpdates() {
    setUpdateState({ status: "checking" });
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(APP_RELEASES_API_URL, {
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object") throw new Error("Neplatná odpověď GitHubu.");
      const release = payload as { tag_name?: unknown; html_url?: unknown };
      if (typeof release.tag_name !== "string" || !versionParts(release.tag_name)) throw new Error("GitHub nevrátil platnou verzi.");
      const latestVersion = release.tag_name.replace(/^v/i, "");
      const releaseUrl = typeof release.html_url === "string" && safeExternalUrl(release.html_url) ? release.html_url : APP_RELEASES_PAGE_URL;
      setUpdateState(isNewerVersion(APP_VERSION, latestVersion) ? { status: "available", version: latestVersion, url: releaseUrl } : { status: "up-to-date", version: APP_VERSION });
    } catch (error) {
      setUpdateState({ status: "error", message: error instanceof Error && error.name === "AbortError" ? "Kontrola trvá příliš dlouho." : "Aktualizace se nepodařilo ověřit." });
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function openDetail(license: LicenseSummary) {
    setDetailLoading(true);
    setDetailTab("overview");
    setCopied(false);
    try {
      const response = await fetch(detailUrl(license.type, license.id));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setDetail(await response.json());
      recordActivity("detail", `${license.id} · ${license.name}`);
    } catch {
      setError(`Detail ${license.id} se nepodařilo načíst.`);
    } finally {
      setDetailLoading(false);
    }
  }

  function toggleCompare(id: string) {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 4) return current;
      return [...current, id];
    });
  }

  function toggleFavorite(id: string) {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function copyText() {
    if (!detail) return;
    await navigator.clipboard.writeText(detail.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadText() {
    if (!detail) return;
    const blob = new Blob([detail.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `LICENSE-${detail.id}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function navigate(next: View) {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function changeGuideMode(nextMode: "quick" | "advanced") {
    setGuideMode(nextMode);
    setGuideStep(0);
    guideRecorded.current = false;
  }

  const activeGuideQuestions = guideQuestions.filter((question) => question.mode === guideMode && (!question.showWhen || answers[question.showWhen.key] === question.showWhen.equals));
  const guideComplete = guideStep >= activeGuideQuestions.length;
  const currentQuestion = activeGuideQuestions[guideStep];

  useEffect(() => {
    if (!guideComplete || guideRecorded.current || recommendations.candidates.length === 0) return;
    guideRecorded.current = true;
    recordActivity("guide", `Doporučení: ${recommendations.candidates.slice(0, 3).map(item => item.id).join(", ")}`);
  }, [guideComplete, recommendations]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => navigate("catalog")} aria-label="Licentia – domů">
          <span className="brand-mark">L</span><span>Licentia</span>
        </button>
        <nav className="main-nav" aria-label="Hlavní navigace">
          <button className={view === "catalog" ? "active" : ""} onClick={() => navigate("catalog")}>Katalog</button>
          <button className={view === "guide" ? "active" : ""} onClick={() => navigate("guide")}>Průvodce</button>
          <button className={view === "compare" ? "active" : ""} onClick={() => navigate("compare")}>
            Porovnání {compareIds.length > 0 && <b>{compareIds.length}</b>}
          </button>
          <button className={view === "saved" ? "active" : ""} onClick={() => navigate("saved")}>Moje {favorites.length > 0 && <b>{favorites.length}</b>}</button>
          <button className={view === "signals" ? "active" : ""} onClick={() => navigate("signals")}>Statistiky</button>
          <button className={view === "ecosystem" ? "active" : ""} onClick={() => navigate("ecosystem")}>API a ekosystém</button>
          <button type="button" className={view === "about" ? "active" : ""} aria-current={view === "about" ? "page" : undefined} onClick={() => navigate("about")}>O Licentii</button>
        </nav>
        <div className="topbar-account">
          <span className="version-pill" title="Verze aplikace">v{APP_VERSION}</span>
          {account && <AccountMenu account={account} />}
        </div>
      </header>

      {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError("")}>×</button></div>}

      {view === "catalog" && (
        <>
          <section className="hero compact" id="katalog">
            <div className="eyebrow"><span /> Ověřený katalog licencí</div>
            <h1>Najděte licenci, která<br />sedí vašemu softwaru.</h1>
            <p>Prohledejte úplná znění 727 licencí a 84 výjimek nebo si nechte výběr vysvětlit krok za krokem.</p>
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input id="license-search" value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(PAGE_SIZE); }} aria-label="Hledat licenci" placeholder="Název, SPDX ID nebo text podmínky…" />
              <kbd>⌘ K</kbd>
            </label>
            <div className="hero-meta">
              <span><strong>727</strong> licencí</span><span><strong>84</strong> výjimek</span><span><strong>Offline</strong> v desktopové aplikaci</span>
            </div>
          </section>

          <section className="catalog-workspace">
            <aside className="filters">
              <div className="filter-heading"><span>Filtry</span><button onClick={() => { setStatusFilter("current"); setApprovalFilter("all"); setTypeFilter("license"); setFullText(false); setVisibleCount(PAGE_SIZE); }}>Obnovit</button></div>
              <fieldset>
                <legend>Typ záznamu</legend>
                {[["license", "Licence"], ["exception", "Výjimky"], ["all", "Vše"]].map(([value, label]) => (
                  <label key={value}><input type="radio" checked={typeFilter === value} onChange={() => { setTypeFilter(value as typeof typeFilter); setVisibleCount(PAGE_SIZE); }} /> {label}</label>
                ))}
              </fieldset>
              <fieldset>
                <legend>Stav</legend>
                {[["current", "Aktuální"], ["all", "Všechny"], ["deprecated", "Historické"]].map(([value, label]) => (
                  <label key={value}><input type="radio" checked={statusFilter === value} onChange={() => { setStatusFilter(value as StatusFilter); setVisibleCount(PAGE_SIZE); }} /> {label}</label>
                ))}
              </fieldset>
              <fieldset>
                <legend>Ověření a metadata</legend>
                {[["all", "Bez omezení"], ["osi", "OSI schválené"], ["fsf", "FSF Free/Libre"], ["profiled", "Srozumitelný profil"]].map(([value, label]) => (
                  <label key={value}><input type="radio" checked={approvalFilter === value} onChange={() => { setApprovalFilter(value as ApprovalFilter); setVisibleCount(PAGE_SIZE); }} /> {label}</label>
                ))}
              </fieldset>
              <fieldset className="fulltext-toggle">
                <legend>Rozsah hledání</legend>
                <label><input type="checkbox" checked={fullText} onChange={(event) => { setFullText(event.target.checked); setVisibleCount(PAGE_SIZE); }} /> Prohledávat úplná znění</label>
                <small>Index se načte až při prvním hledání.</small>
              </fieldset>
              <button className="guide-side-cta" onClick={() => navigate("guide")}><span>Nejsem si jistý/á</span><strong>Spustit průvodce →</strong></button>
            </aside>

            <div className="catalog-results" id="vse">
              <div className="result-heading">
                <div><span className="section-kicker">Katalog SPDX</span><h2>{deferredQuery ? `Výsledky pro „${deferredQuery}“` : "Všechny dostupné položky"}</h2></div>
                <span>{searchLoading ? "Načítám plný index…" : `${filtered.length} výsledků`}</span>
              </div>
              {loading ? <div className="loading-state">Načítám katalog…</div> : error && catalog.length === 0 ? null : (
                <div className="catalog-grid">
                  {filtered.slice(0, visibleCount).map((license) => (
                    <article className="catalog-card" key={`${license.type}:${license.id}`}>
                      <div className="catalog-card-main" role="button" tabIndex={0} onClick={() => openDetail(license)} onKeyDown={(event) => { if (event.key === "Enter") openDetail(license); }}>
                        <div className="card-topline"><code>{license.id}</code><span className="arrow">↗</span></div>
                        <h3>{license.name}</h3>
                        <LicenseBadges license={license} />
                      </div>
                      <div className="card-actions">
                        <button className={`favorite-toggle ${favorites.includes(license.id) ? "selected" : ""}`} onClick={() => toggleFavorite(license.id)}>{favorites.includes(license.id) ? "★ Uloženo" : "☆ Uložit"}</button>
                        {license.type === "license" && <button className={`compare-toggle ${compareIds.includes(license.id) ? "selected" : ""}`} onClick={() => toggleCompare(license.id)} disabled={!compareIds.includes(license.id) && compareIds.length >= 4}>{compareIds.includes(license.id) ? "✓ V porovnání" : "+ Porovnat"}</button>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {!loading && filtered.length === 0 && <div className="empty-state"><strong>Nic jsme nenašli.</strong><span>Zkuste kratší dotaz nebo zrušte některý filtr.</span></div>}
              {visibleCount < filtered.length && <button className="load-more" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>Načíst další ({filtered.length - visibleCount})</button>}
            </div>
          </section>
        </>
      )}

      {view === "guide" && (
        <section className="guide-view">
          <div className="guide-intro">
            <span className="section-kicker light">Pravidlový průvodce</span>
            <h1>Vyberme vhodný licenční směr.</h1>
             <p>Otázky se přizpůsobí vašemu scénáři. Licence se seřadí podle skóre a u každé uvidíte, co vašemu zadání chybí. Aktuálně je jako doporučitelných schváleno {reviewedRecommendationCount}.</p>
            <div className="legal-note"><strong>Důležité</strong><span>Jde o orientační pomůcku, nikoli právní stanovisko. Kompatibilitu závislostí a konkrétní jurisdikci posuďte zvlášť.</span></div>
          </div>
          <div className="guide-panel">
            {!guideComplete && currentQuestion ? (
              <>
                <div className="progress-row"><span>{guideMode === "quick" ? "Rychlý" : "Pokročilý"} režim · krok {guideStep + 1} z {activeGuideQuestions.length}</span><div><i style={{ width: `${((guideStep + 1) / activeGuideQuestions.length) * 100}%` }} /></div></div>
                <h2>{currentQuestion.title}</h2><p className="question-hint">{currentQuestion.hint}</p>
                 <div className="answer-grid">
                  {currentQuestion.options.map((option) => (
                    <button key={option.value} type="button" aria-pressed={answers[currentQuestion.key] === option.value} className={answers[currentQuestion.key] === option.value ? "chosen" : ""} onClick={() => setAnswers((current) => ({ ...current, [currentQuestion.key]: option.value }))}>
                      <span className="radio-dot" /><strong>{option.label}</strong><small>{option.description}</small>
                    </button>
                  ))}
                {currentQuestion.key === "dependencies" && !["unknown", "not-applicable", "undecided"].includes(answers.dependencies ?? "") && <input aria-label="SPDX výraz závislostí" placeholder="např. MIT AND Apache-2.0" value={typeof answers.dependencies === "string" ? answers.dependencies : ""} onChange={(event) => setAnswers((current) => ({ ...current, dependencies: event.target.value }))} />}
                </div>
                <div className="guide-actions"><button className="secondary" disabled={guideStep === 0} onClick={() => setGuideStep((step) => step - 1)}>← Zpět</button><button className="primary" disabled={typeof answers[currentQuestion.key] !== "string" || answers[currentQuestion.key] === ""} onClick={() => setGuideStep((step) => step + 1)}>{guideStep === activeGuideQuestions.length - 1 ? "Zobrazit doporučení" : "Pokračovat →"}</button></div>
              </>
            ) : (
              <div className="recommendations">
                 <div className="recommend-heading"><div><span className="section-kicker">Výsledek průvodce</span><h2>Nejbližší licence podle skóre</h2></div><div><button onClick={() => changeGuideMode(guideMode === "quick" ? "advanced" : "quick")}>{guideMode === "quick" ? "Pokročilý režim" : "Rychlý režim"}</button><button onClick={() => { guideRecorded.current = false; setAnswers({}); setGuideStep(0); }}>Začít znovu</button></div></div>
                {answers.openness === "closed" && <div className="proprietary-callout"><strong>Zvažte také proprietární licenci / EULA.</strong><span>Pokud nechcete dát veřejnosti právo software používat, upravovat a distribuovat, open-source licence není správný nástroj. Vytvoření vlastních podmínek patří právníkovi.</span></div>}
                {reviewedRecommendationCount === 0 && <div className="proprietary-callout"><strong>Datová sada zatím neobsahuje právně zkontrolované doporučitelné profily.</strong><span>Průvodce proto bezpečně nevydá kandidáta. Katalog a úplná znění zůstávají dostupné, ale doporučení vyžaduje dokončenou lidskou revizi zdrojů a metadat.</span></div>}
                <div className="recommend-list">
                 {recommendations.candidates.map((item, index) => (
                     <article key={item.id}>
                       <span className="rank">0{index + 1}</span><div className="recommend-copy"><code>{item.id}</code><h3>{catalog.find((license) => license.id === item.id)?.name ?? item.id}</h3><p>{candidateStatusLabels[item.status]} ({item.status}) · {evidenceLabels[item.evidenceConfidence]} ({item.evidenceConfidence}){item.reasons.length > 0 && <> · {item.reasons.map(guideMessage).join(" · ")}</>}</p>{(item.conflicts.length > 0 || item.fit === 0) && <div className="recommend-deficits"><strong>Nedostatky podle zadání</strong><span>{item.conflicts.length > 0 ? item.conflicts.map(guideMessage).join(" · ") : "Žádný konkrétní požadavek nebyl vyhodnocen; skóre je 0 %."}</span></div>}<small>{[...item.unknowns, ...item.obligations, ...item.evidence.map((evidence) => `${evidence.sourceId}#${evidence.locator}`)].join(" · ")}</small></div>
                       <div className="recommend-score"><strong>{item.fit}%</strong><span>Skóre shody</span></div>
                       <div className="recommend-actions"><button onClick={() => { const license = catalog.find((entry) => entry.id === item.id); if (license) openDetail(license); }}>Otevřít detail</button><button onClick={() => toggleCompare(item.id)}>{compareIds.includes(item.id) ? "✓ V porovnání" : "+ Porovnat"}</button></div>
                     </article>
                   ))}
                 {recommendations.alternatives.length > 0 && <div className="question-hint">Alternativy: {recommendations.alternatives.map((item) => item.id).join(", ")}</div>}
                 {recommendations.nextQuestion && <div className="question-hint">Další rozlišující otázka: {String(recommendations.nextQuestion)}</div>}
                 <p className="question-hint">Výsledek: {outcomeLabels[recommendations.outcome]} ({recommendations.outcome})</p>
                 {[...new Set(recommendations.guidance.concat(recommendations.trace, recommendations.conflicts))].map((message) => <p key={message} className="question-hint">{guideMessage(message)}</p>)}
                 {recommendations.unknowns.map((message) => <p key={message} className="question-hint">Neznámé údaje: {message}</p>)}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {view === "compare" && (
        <section className="compare-view">
          <div className="page-heading"><span className="section-kicker">Rozhodovací matice</span><h1>Porovnání licencí</h1><p>Vedle sebe můžete mít nejvýše čtyři licence. Matice používá strukturovaná metadata Choose a License.</p></div>
          {compareIds.length === 0 ? <div className="empty-state large"><strong>Zatím tu nic není.</strong><span>V katalogu nebo průvodci přidejte licence tlačítkem „Porovnat“.</span><button onClick={() => navigate("catalog")}>Otevřít katalog</button></div> : (
            <div className="comparison-wrap">
              <div className="comparison-header comparison-row"><span>Licence</span>{compareIds.map((id) => { const item = catalog.find((license) => license.id === id); return <div key={id}><code>{id}</code><strong>{item?.name}</strong><button onClick={() => toggleCompare(id)}>Odebrat ×</button></div>; })}</div>
              {[
                ["Rodina", (license: LicenseSummary) => familyOf(license)],
                ["OSI schválení", (license: LicenseSummary) => license.osi ? "Ano" : "Ne / neuvedeno"],
                ["FSF Free/Libre", (license: LicenseSummary) => license.fsf ? "Ano" : "Ne / neuvedeno"],
              ].map(([label, getter]) => <div className="comparison-row" key={label as string}><span>{label as string}</span>{compareIds.map((id) => { const item = catalog.find((license) => license.id === id)!; return <div key={id}>{(getter as (license: LicenseSummary) => string)(item)}</div>; })}</div>)}
              {(["permissions", "conditions", "limitations"] as const).map((key) => <div className="comparison-row tall" key={key}><span>{{ permissions: "Oprávnění", conditions: "Podmínky", limitations: "Omezení" }[key]}</span>{compareDetails.map((item) => <div key={item.id}>{item.profile?.[key]?.length ? <ul>{item.profile[key].map((rule) => <li key={rule}>{ruleLabels[rule] ?? rule}</li>)}</ul> : <em>Bez strukturovaného profilu</em>}</div>)}</div>)}
            </div>
          )}
        </section>
      )}

      {view === "saved" && (
        <section className="saved-view">
          <div className="page-heading"><span className="section-kicker">Osobní pracovní prostor</span><h1>Uložené licence a historie</h1><p>{account ? "Výběry se synchronizují s vaším účtem." : "Výběry jsou uložené pouze v tomto zařízení."}</p></div>
          <div className="saved-columns">
            <section><div className="saved-heading"><h2>Oblíbené</h2><span>{favorites.length}</span></div>{favorites.length ? <div className="saved-list">{favorites.map((id) => { const item = catalog.find((license) => license.id === id); return item ? <article key={id}><div><code>{id}</code><strong>{item.name}</strong></div><button onClick={() => openDetail(item)}>Otevřít</button><button className="danger" onClick={() => toggleFavorite(id)}>Odebrat</button></article> : null; })}</div> : <div className="empty-state"><strong>Žádné uložené licence.</strong><span>V katalogu použijte tlačítko „Uložit“.</span></div>}</section>
            <section><div className="saved-heading"><h2>Nedávná aktivita</h2><button onClick={() => setHistory([])} disabled={!history.length}>Vymazat</button></div>{history.length ? <ol className="history-list">{history.slice(0, 30).map((entry) => <li key={entry.id}><span>{{ detail: "Detail", guide: "Průvodce", comparison: "Porovnání" }[entry.kind]}</span><strong>{entry.label}</strong><time dateTime={entry.createdAt}>{new Intl.DateTimeFormat("cs", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.createdAt))}</time></li>)}</ol> : <div className="empty-state"><strong>Historie je prázdná.</strong><span>Otevřené licence a výsledky průvodce se zobrazí zde.</span></div>}</section>
          </div>
        </section>
      )}

      {view === "signals" && (
        <section className="signals-view">
          <div className="page-heading"><span className="section-kicker">Ověřitelné signály</span><h1>Co se o licencích dá zjistit z veřejných dat.</h1><p>Nejdříve ukazujeme fakta z vlastního katalogu. Veřejné zdroje přidáváme jako kontext a vždy uvádíme jejich původ, datum a omezení.</p></div>

          <div className="stats-grid" aria-label="Statistiky katalogu">
            <article><span>Celkem položek</span><strong>{loading ? "…" : catalogStats.total}</strong><small>SPDX licence a výjimky</small></article>
            <article><span>Aktuální licence</span><strong>{loading ? "…" : catalogStats.current}</strong><small>bez historických identifikátorů</small></article>
            <article><span>OSI schválené</span><strong>{loading ? "…" : catalogStats.osi}</strong><small>podle katalogových metadat</small></article>
            <article><span>Profilované</span><strong>{loading ? "…" : catalogStats.profiled}</strong><small>srozumitelný strukturovaný profil</small></article>
          </div>

          <div className="signals-columns">
            <section className="signals-panel">
              <div className="signals-heading"><div><span className="section-kicker">Vlastní katalog</span><h2>Licenční rodiny</h2></div><span>{catalogStats.licenses} licencí</span></div>
              <div className="family-list">
                {catalogStats.families.map(([family, count]) => <div className="family-row" key={family}><div><span>{familyLabels[family] ?? family}</span><strong>{count}</strong></div><i><em style={{ width: `${catalogStats.licenses ? (count / catalogStats.licenses) * 100 : 0}%` }} /></i></div>)}
              </div>
              <p className="signals-note">Toto jsou statistiky datové sady Licentia, nikoli globální statistiky používání licencí. Katalog obsahuje také {catalogStats.exceptions} výjimek a {catalogStats.fsf} položek označených jako FSF Free/Libre.</p>
            </section>

            <section className="signals-panel">
              <div className="signals-heading"><div><span className="section-kicker">Připravené zdroje</span><h2>Veřejné signály</h2></div><span>bez osobních údajů</span></div>
              <div className="signal-source-list">{publicSignalSources.map((source) => <a className="signal-source" href={source.url} target="_blank" rel="noreferrer" key={source.title}><span className="source-badge">{source.badge}</span><div><strong>{source.title} ↗</strong><p>{source.description}</p></div></a>)}</div>
            </section>
          </div>

           <section className="github-signals">
             <div><span className="section-kicker light">GitHub průzkum</span><h2>Licence, které můžeme transparentně sledovat.</h2><p>Počty repozitářů jsou pouze počet veřejných projektů, u kterých GitHub licenci rozpoznal — nikoli počet uživatelů, instalací ani všech závislostí.</p>{githubSignalState.status === "idle" && <p className="github-status">Načítám veřejné údaje z GitHubu…</p>}{githubSignalState.status === "error" && <p className="github-status">Živé údaje nejsou momentálně dostupné. Veřejné vyhledávání zůstává k dispozici u každé licence.</p>}{githubSignalState.status === "unavailable" && <p className="github-status">{githubSignalState.reason}</p>}{githubSignalState.status === "partial" && <p className="github-status">Načteno částečně — některé údaje nejsou dostupné. {githubSignalState.caveat}</p>}{githubSignalState.status === "ready" && <p className="github-status">Načteno {new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(githubSignalState.fetchedAt))} · {githubSignalState.source}</p>}</div>
            <div className="github-license-links">{trackedPublicLicenses.map(([label, queryValue]) => {
               const signal = githubSignalState.status === "ready" || githubSignalState.status === "partial" ? githubSignalState.signals.find((item) => item.id === label) : undefined;
              return <a href={`https://github.com/search?q=license%3A${queryValue}&type=repositories`} target="_blank" rel="noreferrer" key={label}><code>{label}</code>{signal?.repositoryCount !== null && signal?.repositoryCount !== undefined ? <strong>{formatCount(signal.repositoryCount)}</strong> : <span>Údaj zatím není dostupný</span>}<span>{signal?.repositoryCount !== null && signal?.repositoryCount !== undefined ? `veřejných repozitářů${signal.incompleteResults ? " · výsledek může být neúplný" : ""}` : "Otevřít veřejné vyhledávání ↗"}</span>{signal?.topRepositories.slice(0, 2).map((repo) => <small key={repo.name}>{repo.name} · ★ {formatCount(repo.stars)}</small>)}</a>;
            })}</div>
          </section>

          <div className="signals-methodology"><strong>Metodika</strong><span>GitHub údaje jsou veřejný agregát načítaný přes Licentia endpoint s cache. U každého údaje zůstává zdroj, datum načtení a vysvětlení, co číslo neznamená. Download statistiky dalších ekosystémů přidáme stejným způsobem.</span><button onClick={() => navigate("ecosystem")}>Zdroje a architektura →</button></div>
        </section>
      )}

      {view === "ecosystem" && (
        <section className="ecosystem-view" id="ekosystem">
          <div className="page-heading"><span className="section-kicker">Napojení a architektura</span><h1>Jedno rozhraní nad licenčními zdroji.</h1><p>SPDX už je centrálním katalogem znění. Licentia nad něj přidává cache, vyhledávání, lidsky čitelné profily a rozhraní pro aplikace i AI agenty.</p></div>
          <div className="source-grid">
            {ecosystemSources.map((source) => <article key={source.title}><span className="source-badge">{source.badge}</span><h2>{source.title}</h2><p>{source.description}</p><div className="endpoint-list">{source.endpoints.map((endpoint) => <code key={endpoint}>{endpoint}</code>)}</div><a href={source.url} target="_blank" rel="noreferrer">Otevřít dokumentaci ↗</a></article>)}
          </div>
          <div className="architecture-map">
            <div className="architecture-copy"><span className="section-kicker light">Aktivní ekosystém</span><h2>Licentia Hub</h2><p>Jedna verzovaná vrstva publikuje katalog pro web, desktop, REST klienty a AI agenty.</p><ul><li>Verzovaný snapshot a offline režim</li><li>REST + MCP nad jedním datovým modelem</li><li>Auditovatelný pravidlový engine</li><li>SPDX výrazy, SBOM a orientační kompatibilita</li></ul></div>
            <div className="architecture-flow" aria-label="Tok dat ekosystému"><div className="flow-source"><span>SPDX</span><span>OSI</span><span>GitHub</span></div><b>→</b><div className="flow-hub"><small>centrální vrstva</small><strong>Licentia Hub</strong><code>licenses · rules · versions</code></div><b>→</b><div className="flow-target"><span>Web / Desktop</span><span>REST / CLI</span><span>MCP / IDE</span></div></div>
          </div>
          <div className="api-proposal"><div><span className="section-kicker">Veřejné API je aktivní</span><h2>Malé, stabilní a verzované.</h2><p>Stejné funkce jsou dostupné také přes Streamable HTTP MCP na <code>/mcp</code>.</p></div><div className="api-code"><code><i>GET</i> /v1/licenses?q=apache&amp;osi=true</code><code><i>GET</i> /v1/licenses/Apache-2.0</code><code><i>GET</i> /v1/licenses/Apache-2.0/text</code><code><i>POST</i> /v1/recommendations</code><code><i>POST</i> /v1/compatibility/check</code><code><i>POST</i> /v1/sbom/analyze</code><code><i>MCP</i> /mcp</code></div></div>
        </section>
      )}

      {view === "about" && (
        <section className="about-view">
          <div className="page-heading"><span className="section-kicker">Veřejný About</span><h1>Licence s dohledatelným původem.</h1><p>Licentia pomáhá orientovat se v licenčních datech. Nehraje si na právní stanovisko a jasně odděluje zdroj, kuraci a odvozený výsledek.</p></div>
          <div className="about-grid">
            <article><span className="about-label">Identita</span><h2>Licentia</h2><p>Interní projekt Bucifálek.cz s.r.o. Veřejný repozitář:</p><a href="https://github.com/LucasHefi/Licentia" target="_blank" rel="noreferrer">github.com/LucasHefi/Licentia ↗</a></article>
            <article><span className="about-label">Otevřená licence</span><h2>Autorství a licence</h2><p>Autorem aplikace je Lukáš Hefner. Zdrojový kód repozitáře je poskytován pod licencí MIT.</p><strong>Copyright © 2026 Bucifálek.cz s.r.o.</strong></article>
            <article><span className="about-label">Evidence</span><h2>Tři vrstvy</h2><ol><li>Kanonická data ze SPDX.</li><li>Kurátorovaná metadata odděleně.</li><li>Odvozené doporučení z pravidel.</li></ol></article>
            <article><span className="about-label">Soukromí</span><h2>Anonymně napoprvé</h2><p>Prohlížení funguje bez účtu. Anonymní pracovní prostor zůstává v localStorage; účetní stav je chráněný. Veřejné API používá rate limit a Licentia netvrdí ukládání plaintextových IP auditů.</p></article>
          </div>
          <div className="about-panel"><div><span className="section-kicker light">REST + MCP</span><h2>Veřejné rozhraní pro nástroje.</h2><p>Čtení katalogu, validace a doporučení používají explicitní vstupy. Kompatibilita není právní verdikt.</p></div><div className="about-api"><code>GET /v1/licenses?q=apache</code><code>POST /v1/recommendations</code><code>MCP /mcp</code><a href="https://github.com/LucasHefi/Licentia/blob/main/docs/ECOSYSTEM.md" target="_blank" rel="noreferrer">Dokumentace API a ekosystému ↗</a></div></div>
          <div className="about-links"><div><span className="about-label">Oficiální zdroje</span><a href="https://spdx.org/licenses/" target="_blank" rel="noreferrer">SPDX License List ↗</a><a href="https://opensource.org/licenses" target="_blank" rel="noreferrer">OSI licence ↗</a></div><div><span className="about-label">Další nástroje</span><a href="https://docs.github.com/en/rest/licenses" target="_blank" rel="noreferrer">GitHub Licenses API ↗</a><a href="https://v2.tauri.app/" target="_blank" rel="noreferrer">Tauri ↗</a></div></div>
          <div className="about-disclaimer"><strong>Právní a kontaktní hranice</strong><p>Obsah je orientační technická dokumentace, nikoli právní rada. Připomínky patří do veřejného repozitáře; konkrétní e-mail ani osobní kontaktní osoba nejsou v aktuálních důkazech deklarovány a zůstávají OPEN.</p></div>
        </section>
      )}

      <footer className="app-footer">
        <div className="brand"><span className="brand-mark">L</span><span>Licentia</span></div>
        <div className="footer-meta" aria-label="Informace o aplikaci">
          <span>v{APP_VERSION}</span>
          <span>Autor / vlastník: {APP_AUTHOR}</span>
          <a href={APP_REPOSITORY_URL} target="_blank" rel="noreferrer">GitHub ↗</a>
          <a href={APP_LICENSE_URL} target="_blank" rel="noreferrer">MIT licence ↗</a>
        </div>
        <div className="footer-update" aria-live="polite">
          <button className="footer-update-button" type="button" onClick={checkForUpdates} disabled={updateState.status === "checking"}>
            {updateState.status === "checking" ? "Kontroluji aktualizace…" : "Zkontrolovat aktualizace"}
          </button>
          {updateState.status === "available" && <a className="footer-update-link" href={updateState.url} target="_blank" rel="noreferrer">Nová verze v{updateState.version} ↗</a>}
          {updateState.status === "up-to-date" && <span className="footer-update-status">Aktuální v{updateState.version}</span>}
          {updateState.status === "error" && <span className="footer-update-error">{updateState.message}</span>}
        </div>
        <p>Data SPDX 3.28.0 · Nejde o právní radu.</p>
        <div className="footer-links"><button onClick={() => navigate("signals")}>Statistiky</button><button onClick={() => navigate("ecosystem")}>Zdroje a API</button><button onClick={() => navigate("about")}>O Licentii</button></div>
      </footer>

      {detailLoading && <div className="detail-loading">Načítám detail…</div>}
      {detail && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}>
          <article className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <header><div><code>{detail.id}</code><h2 id="detail-title">{detail.name}</h2></div><button className="close-button" onClick={() => setDetail(null)} aria-label="Zavřít">×</button></header>
            <nav className="detail-tabs"><button className={detailTab === "overview" ? "active" : ""} onClick={() => setDetailTab("overview")}>Přehled</button><button className={detailTab === "text" ? "active" : ""} onClick={() => setDetailTab("text")}>Úplné znění</button><button className={detailTab === "template" ? "active" : ""} onClick={() => setDetailTab("template")}>Šablona variant</button></nav>
            <div className="detail-content">
              {detailTab === "overview" && <div className="overview-content"><div className="detail-summary"><span className={detail.deprecated ? "status deprecated" : "status"}>{detail.deprecated ? "Historický identifikátor" : "Aktuální SPDX záznam"}</span><p>{detail.profile?.description ?? detail.comments ?? "SPDX poskytuje kanonické znění, ale pro tuto položku není k dispozici zjednodušený profil podmínek."}</p><div className="detail-meta"><span><small>Typ</small>{detail.type === "license" ? "Licence" : "Výjimka"}</span><span><small>OSI</small>{detail.osi ? "Schválená" : "Ne / neuvedeno"}</span><span><small>FSF</small>{detail.fsf ? "Free/Libre" : "Ne / neuvedeno"}</span></div></div>{detail.profile ? <div className="rules-grid"><RuleList title="Oprávnění" values={detail.profile.permissions} tone="allow" /><RuleList title="Podmínky" values={detail.profile.conditions} tone="condition" /><RuleList title="Omezení" values={detail.profile.limitations} tone="limit" /></div> : <div className="unprofiled-note">Podrobnou právní klasifikaci nelze bezpečně automaticky odvodit pouze z textu. Prostudujte úplné znění.</div>}{detail.seeAlso.some((url) => safeExternalUrl(url)) && <div className="source-links"><h3>Další zdroje</h3>{detail.seeAlso.slice(0, 5).flatMap((url) => { const safeUrl = safeExternalUrl(url); return safeUrl ? [<a href={safeUrl} target="_blank" rel="noreferrer" key={safeUrl}>{safeUrl} ↗</a>] : []; })}</div>}</div>}
              {detailTab === "text" && <div className="text-view"><div className="text-actions"><span>Doslovné znění ze SPDX 3.28.0</span><div><button onClick={copyText}>{copied ? "Zkopírováno ✓" : "Kopírovat"}</button><button onClick={downloadText}>Stáhnout .txt</button></div></div><pre>{detail.text}</pre></div>}
              {detailTab === "template" && <div className="text-view"><p className="template-note">SPDX šablona popisuje volitelné a proměnné části pro automatické rozpoznávání textových variant.</p><pre>{detail.template ?? "Pro tuto položku není samostatná šablona k dispozici."}</pre></div>}
            </div>
          </article>
        </div>
      )}
    </main>
  );
}
