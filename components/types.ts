export type LicenseType = "license" | "exception";

export interface LicenseSummary {
  id: string;
  name: string;
  type: LicenseType;
  deprecated: boolean;
  osi: boolean;
  fsf: boolean;
  profiled: boolean;
  permissions: string[];
  conditions: string[];
  limitations: string[];
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
  profile?: LicenseProfile | null;
}

export interface GuideAnswers {
  openness?: "open" | "closed" | "undecided";
  reciprocity?: "none" | "file" | "library" | "strong" | "network";
  delivery?: "library" | "application" | "saas" | "internal";
  patents?: "important" | "neutral";
  notices?: "minimal" | "standard";
  jurisdiction?: "eu" | "global";
}

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
