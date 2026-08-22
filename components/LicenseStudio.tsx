"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { familyOf, recommendLicenses, ruleLabels } from "../lib/recommend";
import type {
  GuideAnswers,
  LicenseDetail,
  LicenseSummary,
  LicenseType,
} from "./types";

type View = "catalog" | "guide" | "compare" | "ecosystem";
type StatusFilter = "current" | "all" | "deprecated";
type ApprovalFilter = "all" | "osi" | "fsf" | "profiled";

const DATA_ROOT = "./data";
const PAGE_SIZE = 48;

const guideQuestions: Array<{
  key: keyof GuideAnswers;
  title: string;
  hint: string;
  options: Array<{ value: string; label: string; description: string }>;
}> = [
  {
    key: "openness",
    title: "Má být možné odvozený software uzavřít?",
    hint: "Jde o to, zda smí někdo váš kód použít uvnitř proprietárního produktu.",
    options: [
      { value: "open", label: "Chci zachovat otevřenost", description: "Odvozeniny mají zůstat otevřené podle zvolené síly copyleftu." },
      { value: "closed", label: "Ano, dovolím uzavřené použití", description: "Upřednostním permisivní licenci a širokou adopci." },
      { value: "undecided", label: "Nejsem rozhodnutý/á", description: "Průvodce ponechá otevřené obě skupiny." },
    ],
  },
  {
    key: "reciprocity",
    title: "Kde má vzniknout povinnost sdílet změny?",
    hint: "Copyleft může působit na soubor, knihovnu, celé distribuované dílo nebo také síťovou službu.",
    options: [
      { value: "none", label: "Nikde", description: "Stačí zachovat oznámení; odvozeniny mohou mít jinou licenci." },
      { value: "file", label: "Jen upravené soubory", description: "Slabý copyleft na úrovni souborů, typicky MPL." },
      { value: "library", label: "Samotná knihovna", description: "Změny knihovny zůstávají otevřené, aplikace může mít jinou licenci." },
      { value: "strong", label: "Celé distribuované dílo", description: "Silný copyleft při distribuci, typicky GPL." },
      { value: "network", label: "I provozované jako služba", description: "Síťový copyleft pokrývá také uživatele služby, typicky AGPL." },
    ],
  },
  {
    key: "delivery",
    title: "Jak software lidé dostanou?",
    hint: "Způsob dodání ovlivňuje, kdy se licenční povinnosti aktivují.",
    options: [
      { value: "application", label: "Aplikace nebo CLI", description: "Distribuovaný spustitelný program pro koncové uživatele." },
      { value: "library", label: "Knihovna nebo SDK", description: "Kód, který budou jiné aplikace linkovat nebo importovat." },
      { value: "saas", label: "SaaS / webová služba", description: "Software běží u vás a uživatelé s ním komunikují po síti." },
      { value: "internal", label: "Pouze interně", description: "Bez předávání kopií mimo vaši organizaci." },
    ],
  },
  {
    key: "patents",
    title: "Je důležité výslovné patentové oprávnění?",
    hint: "Některé licence výslovně udělují patentová práva přispěvatelů a upravují jejich ukončení.",
    options: [
      { value: "important", label: "Ano, chci patentovou klauzuli", description: "Zvýhodní licence s výslovným patentovým oprávněním." },
      { value: "neutral", label: "Není to rozhodující", description: "Patentová klauzule nebude hlavním kritériem." },
    ],
  },
  {
    key: "notices",
    title: "Kolik administrativy při distribuci snesete?",
    hint: "U každé licence je vždy potřeba dodržet přesné podmínky; liší se jejich rozsah.",
    options: [
      { value: "minimal", label: "Absolutní minimum", description: "Upřednostnit co nejkratší text a minimum oznámení." },
      { value: "standard", label: "Běžná oznámení jsou v pořádku", description: "LICENSE, copyright, NOTICE nebo popis změn nejsou problém." },
    ],
  },
  {
    key: "jurisdiction",
    title: "Má být licence zvlášť ukotvena v prostředí EU?",
    hint: "Pro většinu projektů je vhodný globální výběr; EUPL může být relevantní pro evropský veřejný sektor.",
    options: [
      { value: "global", label: "Globální projekt", description: "Bez zvláštní preference jurisdikce." },
      { value: "eu", label: "EU / evropský veřejný sektor", description: "Zvýhodnit EUPL, ale zachovat i ostatní kandidáty." },
    ],
  },
];

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

function detailUrl(type: LicenseType, id: string) {
  const folder = type === "license" ? "licenses" : "exceptions";
  return `${DATA_ROOT}/${folder}/${encodeURIComponent(id)}.json`;
}

function includesLoose(value: string, query: string) {
  return value.toLocaleLowerCase("cs").includes(query.toLocaleLowerCase("cs"));
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

export default function LicenseStudio() {
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
  const [answers, setAnswers] = useState<GuideAnswers>({});

  useEffect(() => {
    fetch(`${DATA_ROOT}/catalog.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
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
      .then((response) => response.json())
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
    () => recommendLicenses(catalog, answers),
    [catalog, answers],
  );
  const searchLoading = fullText && deferredQuery.length >= 3 && !searchIndex && !searchFailed;

  async function openDetail(license: LicenseSummary) {
    setDetailLoading(true);
    setDetailTab("overview");
    setCopied(false);
    try {
      const response = await fetch(detailUrl(license.type, license.id));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setDetail(await response.json());
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

  const guideComplete = guideStep >= guideQuestions.length;
  const currentQuestion = guideQuestions[guideStep];

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
          <button className={view === "ecosystem" ? "active" : ""} onClick={() => navigate("ecosystem")}>API a ekosystém</button>
        </nav>
        <span className="version-pill">SPDX 3.28.0</span>
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
                      {license.type === "license" && (
                        <button className={`compare-toggle ${compareIds.includes(license.id) ? "selected" : ""}`} onClick={() => toggleCompare(license.id)} disabled={!compareIds.includes(license.id) && compareIds.length >= 4}>
                          {compareIds.includes(license.id) ? "✓ V porovnání" : "+ Porovnat"}
                        </button>
                      )}
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
            <p>Šest rozhodnutí zúží kurátorovaný výběr běžných licencí. Výsledek vysvětlíme a ukážeme jeho povinnosti.</p>
            <div className="legal-note"><strong>Důležité</strong><span>Jde o orientační pomůcku, nikoli právní stanovisko. Kompatibilitu závislostí a konkrétní jurisdikci posuďte zvlášť.</span></div>
          </div>
          <div className="guide-panel">
            {!guideComplete && currentQuestion ? (
              <>
                <div className="progress-row"><span>Krok {guideStep + 1} z {guideQuestions.length}</span><div><i style={{ width: `${((guideStep + 1) / guideQuestions.length) * 100}%` }} /></div></div>
                <h2>{currentQuestion.title}</h2><p className="question-hint">{currentQuestion.hint}</p>
                <div className="answer-grid">
                  {currentQuestion.options.map((option) => (
                    <button key={option.value} className={answers[currentQuestion.key] === option.value ? "chosen" : ""} onClick={() => setAnswers((current) => ({ ...current, [currentQuestion.key]: option.value }))}>
                      <span className="radio-dot" /><strong>{option.label}</strong><small>{option.description}</small>
                    </button>
                  ))}
                </div>
                <div className="guide-actions"><button className="secondary" disabled={guideStep === 0} onClick={() => setGuideStep((step) => step - 1)}>← Zpět</button><button className="primary" disabled={!answers[currentQuestion.key]} onClick={() => setGuideStep((step) => step + 1)}>{guideStep === guideQuestions.length - 1 ? "Zobrazit doporučení" : "Pokračovat →"}</button></div>
              </>
            ) : (
              <div className="recommendations">
                <div className="recommend-heading"><div><span className="section-kicker">Výsledek průvodce</span><h2>Nejbližší kandidáti</h2></div><button onClick={() => { setAnswers({}); setGuideStep(0); }}>Začít znovu</button></div>
                {answers.openness === "closed" && <div className="proprietary-callout"><strong>Zvažte také proprietární licenci / EULA.</strong><span>Pokud nechcete dát veřejnosti právo software používat, upravovat a distribuovat, open-source licence není správný nástroj. Vytvoření vlastních podmínek patří právníkovi.</span></div>}
                <div className="recommend-list">
                  {recommendations.map((item, index) => (
                    <article key={item.license.id}>
                      <span className="rank">0{index + 1}</span><div className="recommend-copy"><code>{item.license.id}</code><h3>{item.license.name}</h3><p>{item.reasons.join(" · ")}</p><LicenseBadges license={item.license} /></div>
                      <div className="recommend-score"><strong>{Math.max(0, Math.min(99, item.score))}</strong><span>shoda</span></div>
                      <div className="recommend-actions"><button onClick={() => openDetail(item.license)}>Otevřít detail</button><button onClick={() => toggleCompare(item.license.id)}>{compareIds.includes(item.license.id) ? "✓ V porovnání" : "+ Porovnat"}</button></div>
                    </article>
                  ))}
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

      {view === "ecosystem" && (
        <section className="ecosystem-view" id="ekosystem">
          <div className="page-heading"><span className="section-kicker">Napojení a architektura</span><h1>Jedno rozhraní nad licenčními zdroji.</h1><p>SPDX už je centrálním katalogem znění. Licentia nad něj přidává cache, vyhledávání, lidsky čitelné profily a rozhraní pro aplikace i AI agenty.</p></div>
          <div className="source-grid">
            {ecosystemSources.map((source) => <article key={source.title}><span className="source-badge">{source.badge}</span><h2>{source.title}</h2><p>{source.description}</p><div className="endpoint-list">{source.endpoints.map((endpoint) => <code key={endpoint}>{endpoint}</code>)}</div><a href={source.url} target="_blank" rel="noreferrer">Otevřít dokumentaci ↗</a></article>)}
          </div>
          <div className="architecture-map">
            <div className="architecture-copy"><span className="section-kicker light">Navržený ekosystém</span><h2>Licentia Hub</h2><p>Synchronizační služba verzuje upstream data, kontroluje jejich integritu a publikuje jedno stabilní API. Stejný základ používá web, desktop, CLI, IDE plugin i MCP server.</p><ul><li>Podepsané snapshoty a offline režim</li><li>REST + GraphQL + MCP nad jedním datovým modelem</li><li>Auditovatelný pravidlový engine bez skrytého skórování</li><li>Rozšíření o SBOM a kontrolu kompatibility závislostí</li></ul></div>
            <div className="architecture-flow" aria-label="Tok dat ekosystému"><div className="flow-source"><span>SPDX</span><span>OSI</span><span>GitHub</span></div><b>→</b><div className="flow-hub"><small>centrální vrstva</small><strong>Licentia Hub</strong><code>licenses · rules · versions</code></div><b>→</b><div className="flow-target"><span>Web / Desktop</span><span>REST / CLI</span><span>MCP / IDE</span></div></div>
          </div>
          <div className="api-proposal"><div><span className="section-kicker">Návrh veřejného API</span><h2>Malé, stabilní a verzované.</h2></div><div className="api-code"><code><i>GET</i> /v1/licenses?q=apache&amp;osi=true</code><code><i>GET</i> /v1/licenses/Apache-2.0</code><code><i>GET</i> /v1/licenses/Apache-2.0/text</code><code><i>POST</i> /v1/recommendations</code><code><i>POST</i> /v1/compatibility/check</code><code><i>GET</i> /v1/snapshots/3.28.0</code></div></div>
        </section>
      )}

      <footer><div className="brand"><span className="brand-mark">L</span><span>Licentia</span></div><p>Data SPDX 3.28.0 · Nejde o právní radu.</p><button onClick={() => navigate("ecosystem")}>Zdroje a API</button></footer>

      {detailLoading && <div className="detail-loading">Načítám detail…</div>}
      {detail && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}>
          <article className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <header><div><code>{detail.id}</code><h2 id="detail-title">{detail.name}</h2></div><button className="close-button" onClick={() => setDetail(null)} aria-label="Zavřít">×</button></header>
            <nav className="detail-tabs"><button className={detailTab === "overview" ? "active" : ""} onClick={() => setDetailTab("overview")}>Přehled</button><button className={detailTab === "text" ? "active" : ""} onClick={() => setDetailTab("text")}>Úplné znění</button><button className={detailTab === "template" ? "active" : ""} onClick={() => setDetailTab("template")}>Šablona variant</button></nav>
            <div className="detail-content">
              {detailTab === "overview" && <div className="overview-content"><div className="detail-summary"><span className={detail.deprecated ? "status deprecated" : "status"}>{detail.deprecated ? "Historický identifikátor" : "Aktuální SPDX záznam"}</span><p>{detail.profile?.description ?? detail.comments ?? "SPDX poskytuje kanonické znění, ale pro tuto položku není k dispozici zjednodušený profil podmínek."}</p><div className="detail-meta"><span><small>Typ</small>{detail.type === "license" ? "Licence" : "Výjimka"}</span><span><small>OSI</small>{detail.osi ? "Schválená" : "Ne / neuvedeno"}</span><span><small>FSF</small>{detail.fsf ? "Free/Libre" : "Ne / neuvedeno"}</span></div></div>{detail.profile ? <div className="rules-grid"><RuleList title="Oprávnění" values={detail.profile.permissions} tone="allow" /><RuleList title="Podmínky" values={detail.profile.conditions} tone="condition" /><RuleList title="Omezení" values={detail.profile.limitations} tone="limit" /></div> : <div className="unprofiled-note">Podrobnou právní klasifikaci nelze bezpečně automaticky odvodit pouze z textu. Prostudujte úplné znění.</div>}{detail.seeAlso.length > 0 && <div className="source-links"><h3>Další zdroje</h3>{detail.seeAlso.slice(0, 5).map((url) => <a href={url} target="_blank" rel="noreferrer" key={url}>{url} ↗</a>)}</div>}</div>}
              {detailTab === "text" && <div className="text-view"><div className="text-actions"><span>Doslovné znění ze SPDX 3.28.0</span><div><button onClick={copyText}>{copied ? "Zkopírováno ✓" : "Kopírovat"}</button><button onClick={downloadText}>Stáhnout .txt</button></div></div><pre>{detail.text}</pre></div>}
              {detailTab === "template" && <div className="text-view"><p className="template-note">SPDX šablona popisuje volitelné a proměnné části pro automatické rozpoznávání textových variant.</p><pre>{detail.template ?? "Pro tuto položku není samostatná šablona k dispozici."}</pre></div>}
            </div>
          </article>
        </div>
      )}
    </main>
  );
}
