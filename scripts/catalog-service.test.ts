import assert from "node:assert/strict";
import test from "node:test";
import { analyzeSbom, checkCompatibility } from "../lib/catalog-service.ts";
import type { LicenseSummary } from "../components/types.ts";

const catalog: LicenseSummary[] = [
  { id: "MIT", name: "MIT License", type: "license", deprecated: false, osi: true, fsf: true, profiled: true, permissions: [], conditions: [], limitations: [] },
  { id: "GPL-3.0-only", name: "GNU GPL v3", type: "license", deprecated: false, osi: true, fsf: true, profiled: true, permissions: [], conditions: ["same-license"], limitations: [] },
];

test("compatibility never claims a legally safe result from family labels alone", () => {
  const result = checkCompatibility(catalog, ["MIT"]);
  assert.equal(result.compatible, "review");
  assert.match(result.warnings.join(" "), /neprokazuje kompatibilitu/i);
});

test("SBOM analysis only reads license-specific fields", () => {
  const falsePositive = analyzeSbom(catalog, { description: "Built by MIT researchers", package: { name: "GPL-3.0-only tools" } });
  assert.equal(falsePositive.licenseCount, 0);
  const detected = analyzeSbom(catalog, { packages: [{ name: "app", licenseDeclared: "MIT" }, { licenses: [{ license: { id: "GPL-3.0-only" } }] }] });
  assert.deepEqual(detected.licenses.map((item) => item.id), ["MIT", "GPL-3.0-only"]);
});
