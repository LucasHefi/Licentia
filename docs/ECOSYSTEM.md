# Licentia Hub: licenční datový ekosystém

Identitu produktu, vlastnický kontext, licenční status a hranici mezi
kanonickými daty, kurátorovanými metadaty a odvozenými výsledky shrnuje
[veřejná stránka About](ABOUT.md). Licentia je interní projekt Bucifálek.cz
s.r.o.; externí zdroje a adaptéry uvedené níže nejsou licencí aplikace.

## Implementovaný stav

Web i Apache balíček publikují REST API `/v1` a stateless Streamable HTTP MCP endpoint `/mcp`. Implementované jsou vyhledávání, detail a text licence, výjimky, snapshot verze, doporučení, validace SPDX výrazů, orientační kompatibilita a analýza JSON SBOM. Kanonický katalog je pevný snapshot SPDX 3.28.0; aktualizace probíhá reprodukovatelným generátorem.

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

## REST API

### Anonymous access policy

The anonymous public allowlist is limited to `/v1` discovery and the documented
`/v1/licenses`, `/v1/exceptions`, `/v1/versions`, `/v1/snapshots/{version}`,
`/v1/recommendations`, `/v1/expressions/validate`, `/v1/compatibility/check`,
`/v1/sbom/analyze`, and `/mcp` endpoints. `/api/state` and `/api/auth/*` remain
protected application routes and are never part of the public allowlist.

### Apache anonymous workspace

The Apache login/registration screen also offers “Pokračovat bez registrace a
přihlášení”. Account features remain available for signed-in users, while an
anonymous workspace is kept only in browser `localStorage`; it has no server or
account persistence. This does not change the protected `/api/state` and
`/api/auth/*` boundary.

GET requests use a 60 requests/minute/IP bucket; POST and MCP requests use a
20 requests/minute/IP bucket. Responses expose `RateLimit-Limit`,
`RateLimit-Remaining`, and `RateLimit-Reset`; exhausted requests return 429 and
`Retry-After`. Rate-limit storage errors fail closed with 503. Requests larger
than 128 KiB are rejected. In direct mode the adapter must provide the actual
remote address; `X-Forwarded-For` is never trusted. Set `TRUSTED_PROXY_MODE=true`
and explicitly configure `TRUSTED_PROXY_HEADER` (or use Cloudflare's
`CF-Connecting-IP`) only when the ingress proxy is trusted. If no address is
available, the public request is rejected rather than placed in a shared bucket.
Configure a long random `RATE_LIMIT_SECRET` in the Cloudflare Worker binding or
the process environment; it is required for the web limiter and missing secrets
fail closed with 503. The same prerequisite applies to the Apache example's
`rate_limit_secret` before deployment. Trusted proxy mode and its header must
only be enabled when the ingress proxy is controlled by the deployment.

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

## MCP server

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
