import dictionary from "../data/catalog-tags.json" with { type: "json" };

export const tagGroups = [
  { id: "properties", label: "Vlastnosti" },
  { id: "use", label: "Použití" },
] as const;

export const catalogTags = dictionary;
export const tagsById = new Map(catalogTags.map(tag => [tag.id, tag]));

export function matchesCatalogTags(tags: string[] = [], selected: ReadonlySet<string>, exceptGroup?: string) {
  return tagGroups.every(({ id }) => {
    if (id === exceptGroup) return true;
    const active = catalogTags.filter(tag => tag.group === id && selected.has(tag.id));
    return active.length === 0 || active.some(tag => tags.includes(tag.id));
  });
}

export function priorityTags(tags: string[]) {
  const known = catalogTags.filter(tag => tags.includes(tag.id));
  const property = known.filter(tag => tag.group === "properties");
  const purpose = known.find(tag => tag.group === "use");
  // An Apache-style card has room for the family, patent grant and notice obligation.
  if (property.length >= 3 && tags.includes("permissive") && tags.includes("patent-grant") && tags.includes("preserve-notices")) {
    return ["permissive", "patent-grant", "preserve-notices"];
  }
  return [...property.slice(0, purpose ? 2 : 3), ...(purpose ? [purpose] : [])].map(tag => tag.id);
}
