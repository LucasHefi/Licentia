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
