"use client";

import { useMemo, useState } from "react";
import { familyOf } from "../lib/recommend";
import { guideMessage } from "../lib/guide-copy";
import type { RecommendationResult } from "../lib/recommendation-contract";
import type { LicenseSummary } from "./types";

type Sort = "answers" | "name" | "family";
const PAGE_SIZE = 8;

export default function GuidePreview({ result, catalog, loading, compareIds, onOpen, onCompare }: {
  result: RecommendationResult;
  catalog: LicenseSummary[];
  loading: boolean;
  compareIds: string[];
  onOpen: (license: LicenseSummary) => void;
  onCompare: (id: string) => void;
}) {
  const [sort, setSort] = useState<Sort>("answers");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const licenses = useMemo(() => {
    const byId = new Map(catalog.filter((item) => item.type === "license").map((item) => [item.id, item]));
    const items = [...result.candidates, ...result.alternatives].flatMap((item) => {
      const license = byId.get(item.id);
      return license ? [{ license, family: familyOf(license) }] : [];
    });
    if (sort !== "answers") items.sort((a, b) => {
      const familyOrder = sort === "family" ? a.family.localeCompare(b.family, "cs") : 0;
      return familyOrder || a.license.name.localeCompare(b.license.name, "cs") || a.license.id.localeCompare(b.license.id);
    });
    return items;
  }, [catalog, result, sort]);

  return (
    <aside className="guide-preview" aria-labelledby="guide-preview-title" aria-busy={loading}>
      <div className="guide-preview-heading">
        <span className="section-kicker">Průběžný výběr</span>
        <h2 id="guide-preview-title">Licence podle vašich odpovědí</h2>
        <p>Pořadí se průběžně mění. Hodnocení a zdůvodnění uvidíte po dokončení otázek.</p>
      </div>
      <label className="guide-sort">Řadit podle
        <select value={sort} onChange={(event) => { setSort(event.target.value as Sort); setVisibleCount(PAGE_SIZE); }}>
          <option value="answers">Dosavadních odpovědí</option>
          <option value="name">Názvu A–Z</option>
          <option value="family">Rodiny licence</option>
        </select>
      </label>
      <p className="guide-preview-count" role="status">{loading ? "Načítám licence…" : `Zobrazeno ${Math.min(visibleCount, licenses.length)} z ${licenses.length} licencí`}</p>
      {!loading && licenses.length === 0 ? (
        <div className="guide-preview-empty">
          <strong>Řazení zatím není k dispozici</strong>
          <p>{result.guidance.length ? result.guidance.map(guideMessage).join(" ") : "Pro průvodce nejsou dostupné ověřené licence."}</p>
        </div>
      ) : (
        <ul className="guide-preview-list">
          {licenses.slice(0, visibleCount).map(({ license, family }) => (
            <li key={license.id}>
              <button className="guide-preview-license" onClick={() => onOpen(license)}>
                <code>{license.id}</code><strong>{license.name}</strong><span>{family}</span>
              </button>
              <button className="guide-preview-compare" aria-label={`${compareIds.includes(license.id) ? "Odebrat" : "Přidat"} ${license.id} ${compareIds.includes(license.id) ? "z porovnání" : "do porovnání"}`} disabled={!compareIds.includes(license.id) && compareIds.length >= 4} onClick={() => onCompare(license.id)}>{compareIds.includes(license.id) ? "✓ V porovnání" : "+ Porovnat"}</button>
            </li>
          ))}
        </ul>
      )}
      {visibleCount < licenses.length && <button className="guide-preview-more" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>Zobrazit další licence</button>}
    </aside>
  );
}
