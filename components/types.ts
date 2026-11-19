export type LicenseType = "license" | "exception";

export interface EditorialSource {
  title: string;
  url: string;
  locator: string;
}

interface EditorialFact<T> {
  value: T;
  source: EditorialSource;
}

export interface EditorialDate {
  date: string;
  precision: "year" | "month" | "day";
}

export interface LicenseEditorial {
  release?: EditorialFact<EditorialDate>;
  approval?: EditorialFact<EditorialDate>;
  spdxInclusion?: EditorialFact<EditorialDate>;
  publisher?: EditorialFact<string>;
  summary?: EditorialFact<string>;
  purposes?: EditorialFact<string>[];
  properties?: EditorialFact<{ tag: string; condition: string }>[];
  related?: EditorialFact<{ id: string; relation: "previous" | "next" | "variant" }>[];
  exceptionUse?: EditorialFact<string>;
}

export interface LicenseSummary {
  id: string;
  name: string;
  type: LicenseType;
  deprecated: boolean;
  osi: boolean;
  fsf: boolean;
  profiled: boolean;
  tags?: string[];
  permissions: string[];
  conditions: string[];
  limitations: string[];
  metadata?: import("../lib/recommendation-contract").CatalogMetadataRecord["metadata"];
}

export interface LicenseProfile {
  title?: string;
  description?: string;
  how?: string;
  permissions: string[];
  conditions: string[];
  limitations: string[];
  "spdx-id"?: string;
}

export interface LicenseDetail {
  id: string;
  name: string;
  type: LicenseType;
  deprecated: boolean;
  osi?: boolean;
  fsf?: boolean;
  text: string;
  template?: string | null;
  header?: string | null;
  headerTemplate?: string | null;
  comments?: string | null;
  seeAlso: string[];
  tags?: string[];
  editorial?: LicenseEditorial;
  profile?: LicenseProfile | null;
  metadata?: import("../lib/recommendation-contract").CatalogMetadataRecord["metadata"];
}

export type GuideAnswers = import("../lib/recommendation-contract").GuideAnswers;

export interface Recommendation {
  license: LicenseSummary;
  score: number;
  reasons: string[];
}

export interface AppIdentity {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  authSource: "chatgpt" | "licentia";
  providerLabel: string;
  signOutPath?: string;
  signOutMethod?: "GET" | "POST";
  csrfToken?: string;
  canAddPasskey?: boolean;
}

export interface ActivityEntry {
  id: string;
  kind: "detail" | "guide" | "comparison";
  label: string;
  createdAt: string;
}

export interface WorkspaceState {
  favorites: string[];
  compareIds: string[];
  guideAnswers: GuideAnswers;
  history: ActivityEntry[];
  updatedAt?: string;
}
