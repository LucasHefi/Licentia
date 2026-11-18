import { tagsById } from "../lib/catalog-tags";
import { profileForDisplay, ruleLabels } from "../lib/recommend";
import type { EditorialDate, EditorialSource, LicenseDetail } from "./types";

export function safeExternalUrl(value: string): string | null {
  const url = URL.parse(value);
  return url && (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password ? url.href : null;
}

export function CatalogTagList({ ids, selected, onSelect, counts }: {
  ids: string[];
  selected: ReadonlySet<string>;
  onSelect: (id: string) => void;
  counts?: ReadonlyMap<string, number>;
}) {
  if (ids.length === 0) return null;
  return <div className="catalog-tag-list">{ids.map(id => {
    const tag = tagsById.get(id);
    if (!tag) return null;
    const active = selected.has(id);
    return <button key={id} className="catalog-tag" data-group={tag.group} aria-pressed={active} onClick={() => onSelect(id)}>
      {active && <span aria-hidden="true">✓ </span>}{tag.label}
      {counts && <small>{counts.get(id) ?? 0}</small>}
    </button>;
  })}</div>;
}

function SourceLink({ source, label }: { source: EditorialSource; label?: string }) {
  const url = safeExternalUrl(source.url);
  return url ? <a href={url} target="_blank" rel="noreferrer" title={source.locator}>{label ?? source.title} ↗</a> : null;
}

function formatDate(value: EditorialDate) {
  if (value.precision === "year") return value.date;
  const options: Intl.DateTimeFormatOptions = { timeZone: "UTC", year: "numeric", month: "long" };
  if (value.precision === "day") options.day = "numeric";
  const date = new Date(value.precision === "month" ? `${value.date}-01` : value.date);
  return new Intl.DateTimeFormat("cs-CZ", options).format(date);
}

function RuleList({ title, values, tone }: { title: string; values: string[]; tone: string }) {
  return (
    <div className={`rule-group ${tone}`}>
      <h4>{title}</h4>
      {values.length ? (
        <ul>{values.map((value) => <li key={value}>{ruleLabels[value] ?? value}</li>)}</ul>
      ) : <p>Profil v této kategorii neuvádí žádné položky.</p>}
    </div>
  );
}

const relations = { previous: "Předchozí verze", next: "Další verze", variant: "Varianta identifikátoru" };

export function CatalogDetailOverview({ detail, selected, onTag, onRelated }: {
  detail: LicenseDetail;
  selected: ReadonlySet<string>;
  onTag: (id: string) => void;
  onRelated: (id: string) => void;
}) {
  const editorial = detail.editorial;
  const profile = profileForDisplay(detail);
  const sources = new Map<string, EditorialSource>();
  for (const source of [
    editorial?.summary?.source,
    editorial?.release?.source,
    editorial?.approval?.source,
    editorial?.spdxInclusion?.source,
    editorial?.publisher?.source,
    editorial?.exceptionUse?.source,
    ...(editorial?.purposes ?? []).map(fact => fact.source),
    ...(editorial?.related ?? []).map(fact => fact.source),
  ]) {
    if (source && !sources.has(source.url)) sources.set(source.url, source);
  }

  return <div className="overview-content">
    <div className="editorial-overview">
      <section className="editorial-summary">
        <h3>Stručně</h3>
        <p>{editorial?.summary?.value ?? profile?.description ?? detail.comments ?? "K této položce je k dispozici kanonické znění SPDX."}</p>
      </section>
      <aside className="editorial-about">
        <h3>{detail.type === "exception" ? "O výjimce" : "O licenci"}</h3>
        <dl>
          <dt>Vydáno</dt>
          <dd>{editorial?.release ? <>
            <time dateTime={editorial.release.value.date}>{formatDate(editorial.release.value)}</time>
            <SourceLink source={editorial.release.source} label="Zdroj data" />
            <small>{editorial.release.source.locator}</small>
          </> : "Rok nedoložen"}</dd>
          {editorial?.publisher && <>
            <dt>Vydavatel</dt><dd>{editorial.publisher.value}</dd>
          </>}
          {editorial?.approval && <>
            <dt>Schváleno</dt><dd><time dateTime={editorial.approval.value.date}>{formatDate(editorial.approval.value)}</time>
              <SourceLink source={editorial.approval.source} label="Doklad schválení" /></dd>
          </>}
          {editorial?.spdxInclusion && <>
            <dt>Zařazení do SPDX</dt><dd><time dateTime={editorial.spdxInclusion.value.date}>{formatDate(editorial.spdxInclusion.value)}</time>
              <SourceLink source={editorial.spdxInclusion.source} label="Doklad zařazení" /></dd>
          </>}
          <dt>Typ</dt><dd>{detail.type === "license" ? "Licence" : "Výjimka"}</dd>
          <dt>Stav SPDX</dt><dd>{detail.deprecated ? "Historický identifikátor" : "Aktuální záznam"}</dd>
          {(detail.osi || detail.fsf) && <><dt>Schválení</dt><dd>{[detail.osi && "OSI", detail.fsf && "FSF Free/Libre"].filter(Boolean).join(" · ")}</dd></>}
        </dl>
      </aside>
      {Boolean(detail.tags?.length || editorial?.properties?.length) && (
        <section className="editorial-tags" aria-label="Tagy licence">
          <CatalogTagList ids={detail.tags ?? []} selected={selected} onSelect={onTag} />
          {Boolean(editorial?.properties?.length) && <ul className="tag-conditions">{editorial?.properties?.map(({ value, source }) => <li key={value.tag}>
            <strong>{tagsById.get(value.tag)?.label}</strong> {value.condition} <SourceLink source={source} />
          </li>)}</ul>}
        </section>
      )}
    </div>
    {editorial?.exceptionUse && <section className="exception-expression">
      <h3>Použití s licencí</h3>
      <code>{editorial.exceptionUse.value} WITH {detail.id}</code>
      <SourceLink source={editorial.exceptionUse.source} />
    </section>}
    {profile ? <div className="rules-grid">
      <RuleList title="Oprávnění" values={profile.permissions} tone="allow" />
      <RuleList title="Podmínky" values={profile.conditions} tone="condition" />
      <RuleList title="Omezení" values={profile.limitations} tone="limit" />
    </div> : <p className="unprofiled-note">Podmínky této položky ověřte v úplném znění.</p>}
    <div className="editorial-references">
      {Boolean(editorial?.related?.length) && <section>
        <h3>Další verze</h3>
        <ul>{editorial?.related?.map(({ value, source }) => <li key={value.id}>
          <span>{relations[value.relation]}</span>
          <button onClick={() => onRelated(value.id)}>{value.id}</button>
          <SourceLink source={source} label="Doklad vazby" />
        </li>)}</ul>
      </section>}
      {sources.size > 0 && <section>
        <h3>Oficiální zdroje</h3>
        <ul>{Array.from(sources.values(), source => <li key={source.url}><SourceLink source={source} /></li>)}</ul>
      </section>}
    </div>
    {detail.seeAlso.some(url => safeExternalUrl(url)) && <section className="source-links">
      <h3>Další zdroje SPDX</h3>
      {Array.from(new Set(detail.seeAlso)).flatMap(url => {
        const safe = safeExternalUrl(url);
        return safe ? [<a href={safe} target="_blank" rel="noreferrer" key={url}>{url} ↗</a>] : [];
      })}
    </section>}
  </div>;
}
