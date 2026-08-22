# Licentia Hub: návrh licenčního datového ekosystému

## Co již existuje

SPDX je vhodný centrální a autoritativní zdroj identifikátorů, úplných znění, výjimek a šablon textových variant. Publikuje aktuální JSON index na `https://spdx.org/licenses/licenses.json`, index výjimek na `https://spdx.org/licenses/exceptions.json` a detail licence na `https://spdx.org/licenses/{SPDX-ID}.json`. Historické verze jsou tagované v repozitáři `spdx/license-list-data`.

Nové OSI API na `https://opensource.org/api/license` je autoritou pro OSI schválení a související organizační metadata. Starou doménu `api.opensource.org` nepoužívat; OSI oznámila její ukončení a nové API není zpětně kompatibilní.

GitHub Licenses REST API nabízí menší kurátorovaný výběr běžných licencí a rozpoznání licence souboru v repozitáři. Není náhradou úplného katalogu SPDX.

V oficiálním MCP Registry je komunitní server `io.github.pipeworx-io/spdx-license`. Je vhodný pro experimentální napojení AI klientů, ale autoritou zůstávají verze SPDX.

## Doporučená architektura

```text
SPDX release ─┐
OSI API ──────┼─> synchronizace + validace + podepsaný snapshot
GitHub rules ─┘                         │
                                       ▼
                              Licentia Canonical Store
                          ┌────────────┼─────────────┐
                          ▼            ▼             ▼
                      REST/GraphQL     MCP        statické balíčky
                          │            │             │
                    web, CLI, IDE   AI agenti   desktop/offline
```

Synchronizace musí být reprodukovatelná podle upstream verze, ukládat SHA-256 každého znění a nikdy tiše nepřepsat vydaný snapshot. Vlastní klasifikace a překlady musí být oddělené od kanonického textu a opatřené zdrojem, verzí pravidel a datem revize.

## Návrh REST API

| Metoda | Endpoint | Účel |
|---|---|---|
| `GET` | `/v1/licenses` | hledání a filtrování licencí |
| `GET` | `/v1/licenses/{id}` | metadata, profil a provenance |
| `GET` | `/v1/licenses/{id}/text` | kanonické znění jako text nebo JSON |
| `GET` | `/v1/exceptions/{id}` | licenční výjimka |
| `GET` | `/v1/versions` | dostupné snapshoty SPDX |
| `POST` | `/v1/recommendations` | vysvětlitelné skóre nad explicitními vstupy |
| `POST` | `/v1/expressions/validate` | syntaktická kontrola SPDX výrazu |
| `POST` | `/v1/compatibility/check` | kontextová kontrola kombinace komponent |
| `POST` | `/v1/sbom/analyze` | souhrn licencí a rizik v SPDX/CycloneDX SBOM |

Odpověď doporučení má vracet `rule_version`, kandidáty, bodové příspěvky jednotlivých pravidel, varování a odkazy na zdroje. Nemá vydávat binární verdikt „legální/nelegální“.

## Návrh MCP serveru

Resources:

- `spdx://licenses/{id}`
- `spdx://exceptions/{id}`
- `spdx://versions/{version}/licenses/{id}`
- `licentia://profiles/{id}`

Tools:

- `search_licenses(query, filters)`
- `get_license_text(id, version)`
- `compare_licenses(ids, context)`
- `recommend_license(requirements)`
- `validate_spdx_expression(expression)`
- `analyze_sbom(document, distribution_context)`

MCP odpovědi musí odlišovat kanonická data, kurátorované metadata a odvozené doporučení. Každý právně významný závěr má obsahovat upozornění, že nejde o právní stanovisko.

## Další produkty ekosystému

1. CLI `licentia`: vyhledání, vložení LICENSE, validace SPDX výrazů a kontrola aktualizací.
2. IDE pluginy: doplnění `SPDX-License-Identifier`, náhled povinností a kontrola repozitáře.
3. GitHub/GitLab aplikace: komentář k pull requestu při nové nebo změněné licenci závislosti.
4. SBOM služba: import SPDX/CycloneDX, inventář licencí, zásady organizace a export auditu.
5. Organizační portál: povolené/zakázané licence, výjimkové workflow a schvalovací stopa.
6. Podepsané offline snapshoty: JSON, SQLite a OCI artefakt pro regulovaná nebo odpojená prostředí.

## Limity kompatibility

Kompatibilita není pouze vlastnost dvojice SPDX identifikátorů. Závisí na způsobu spojení kódu, typu distribuce, úpravách, jurisdikci, dodatečných výjimkách a patentových či obchodních podmínkách. Automatická kontrola proto musí pracovat s kontextem a vracet důvody, nejistotu a požadavek na lidské posouzení.
