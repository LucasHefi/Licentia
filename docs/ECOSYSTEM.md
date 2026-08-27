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

## REST API 1.1

Webová i Apache varianta poskytují stejný veřejný kontrakt. `GET /v1` vrací
discovery dokument a `GET /v1/openapi.json` úplný strojově čitelný popis ve
formátu OpenAPI 3.1. Všechny JSON požadavky používají `Content-Type:
application/json`.

| Metoda | Endpoint | Účel |
|---|---|---|
| `GET` | `/v1/openapi.json` | OpenAPI 3.1 dokumentace |
| `GET` | `/v1/licenses` | hledání a filtrování licencí a výjimek |
| `GET` | `/v1/licenses/{id}` | metadata, profil, evidence a kanonické znění |
| `GET` | `/v1/licenses/{id}/text` | kanonické znění jako `text/plain` |
| `GET` | `/v1/exceptions/{id}` | detail licenční výjimky |
| `GET` | `/v1/versions` | dostupné snapshoty SPDX |
| `GET` | `/v1/guide` | celý verzovaný model průvodce |
| `POST` | `/v1/guide` | zahájení nebo pokračování bezstavového průvodce |
| `POST` | `/v1/recommendations` | přímé vyhodnocení již známých požadavků |
| `POST` | `/v1/expressions/validate` | kontrola syntaxe a identifikátorů SPDX výrazu |
| `POST` | `/v1/compatibility/check` | orientační kontrola kombinace komponent |
| `POST` | `/v1/sbom/analyze` | souhrn licencí v SPDX/CycloneDX JSON SBOM |

### Průvodce přes API

Průvodce je bezstavový. Server nevydává session ID a neukládá odpovědi. Klient
v každém volání posílá režim a všechny dosud získané odpovědi. Díky tomu lze
požadavek bezpečně opakovat, přenášet mezi instancemi a auditovat. Pokud změna
odpovědi deaktivuje podmíněnou otázku (například závislosti), server její starou
odpověď z výsledného kurzoru odstraní.

Model rychlého režimu:

```http
GET /v1/guide?mode=quick
```

Zahájení průvodce:

```http
POST /v1/guide
Content-Type: application/json

{"mode":"quick","answers":{}}
```

Odpověď obsahuje `guideModelVersion`, normalizované `answers`, právě aktivní
`activeQuestions`, počítadlo `progress`, stav `awaiting-input` a celý objekt
`nextQuestion` včetně povolených voleb. Pokračování používá kumulativní
odpovědi:

```json
{
  "mode": "quick",
  "answers": {
    "openness": "open",
    "projectForm": "application",
    "reciprocity": "none",
    "commercialUse": "allowed",
    "delivery": "internal",
    "patents": "neutral"
  }
}
```

Po zodpovězení všech aktivních otázek je `state` rovno `complete`,
`nextQuestion` je `null` a pole `recommendation` obsahuje stejný kanonický
výsledek jako `/v1/recommendations`. Do té doby je `recommendation` vždy `null`.
Volby `unknown`, `not-applicable` a `undecided` jsou legitimní odpovědi
průvodce. Při doporučení se takové pole vynechá ze skóre a licence se stále
zobrazí podle ostatních známých požadavků; pokud není známý žádný konkrétní
požadavek, zobrazí se s nulovým skóre a výsledkem `insufficient-evidence`.
Neplatné odpovědi a neznámé či nevalidní SPDX výrazy zůstávají fail-closed.

Pro jednorázové vyhodnocení bez dialogu lze nadále poslat přímo odpovědi nebo
obálku s explicitním režimem:

```json
{"mode":"advanced","requirements":{"delivery":"saas","copyleftTrigger":"network"}}
```

Výsledek vždy obsahuje verzi dat, modelu a pravidel, auditní `trace`, konflikty,
neznámé hodnoty, povinnosti, kandidáty a evidenci. Jde o orientační pomůcku,
nikoli binární verdikt „legální/nelegální“.

### Přístup, limity a chyby

Veřejný allowlist zahrnuje discovery `/v1`, všechny výše popsané `/v1/*`
endpointy a `/mcp`. `/api/state` a `/api/auth/*` jsou oddělené aplikační cesty a
nejsou součástí veřejného API. Apache anonymní pracovní prostor zůstává pouze v
`localStorage`; stav účtu ani privátní API tím nejsou zpřístupněny.

GET používá limit 60 požadavků za minutu a IP, POST a MCP 20 požadavků.
Odpovědi obsahují `RateLimit-Limit`, `RateLimit-Remaining` a `RateLimit-Reset`;
při vyčerpání vracejí 429 a `Retry-After`. Výpadek úložiště limiteru nebo
neurčitelná adresa klienta skončí fail-closed stavem 503. Tělo požadavku je
omezeno na 128 KiB.

V přímém režimu se nepoužívá `X-Forwarded-For`. `TRUSTED_PROXY_MODE=true` a
`TRUSTED_PROXY_HEADER` (Apache: `trusted_proxy` a `trusted_proxy_header`) se smí
zapnout pouze za řízenou ingress proxy. Web vyžaduje dlouhý
`RATE_LIMIT_SECRET`, Apache `rate_limit_secret`.

## MCP server 1.1

Endpoint `/mcp` implementuje Streamable HTTP s JSON odpověďmi. Neposkytuje
serverový SSE stream, takže `GET /mcp` korektně vrací 405. Každá zpráva klienta
se posílá samostatným `POST`; notifikace a odpovědi přijaté od klienta končí
stavem 202 bez těla.

Server podporuje stabilní revize `2025-11-25`, `2025-06-18` a `2025-03-26`.
Klient navrhne revizi v `initialize.params.protocolVersion`; ve všech dalších
požadavcích ji posílá v hlavičce `MCP-Protocol-Version`. Bez hlavičky se kvůli
zpětné kompatibilitě předpokládá `2025-03-26`. Server je bezstavový a nevydává
`MCP-Session-Id`.

Inicializace:

```bash
curl -sS https://example.cz/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"example","version":"1.0"}}}'
```

Následující volání nástroje:

```bash
curl -sS https://example.cz/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: 2025-11-25' \
  --data '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"start_license_guide","arguments":{"mode":"quick"}}}'
```

### MCP capabilities

Tools:

- `search_licenses` — katalogové hledání a filtry;
- `get_license` — detail, provenance a úplné znění licence nebo výjimky;
- `compare_licenses` — orientační kontrola kombinace;
- `start_license_guide` — první krok rychlého nebo pokročilého průvodce;
- `continue_license_guide` — další krok z kumulativních odpovědí;
- `recommend_license` — přímé vyhodnocení známých požadavků;
- `validate_spdx_expression` — syntaktická a identifikátorová kontrola;
- `analyze_sbom` — analýza licenčních polí JSON SBOM.

Resources:

- `licentia://guide/model`;
- `licentia://api/discovery`;
- šablony `spdx://licenses/{id}` a `spdx://exceptions/{id}`.

Prompt `choose_license` instruuje klienta, aby použil průvodce po jedné otázce a
neprezentoval výsledek jako právní radu. Moderní definice nástrojů obsahují
`title`, read-only/idempotent anotace a `outputSchema`. Výsledek nástroje vrací
jak JSON text pro kompatibilitu, tak `structuredContent` a `isError`.

Neplatná JSON-RPC obálka používá standardní kódy `-32700` nebo `-32600` a HTTP
400. Chyby platného JSON-RPC požadavku (`-32601`, `-32602`) jsou JSON-RPC
odpovědi přes HTTP 200. Provozní chyba nástroje se vrací jako tool result s
`isError: true`, aby ji model mohl opravit. Neznámá nebo nepodporovaná revize v
hlavičce končí HTTP 400.

### Bezpečnost browserových MCP klientů

Pokud požadavek obsahuje `Origin`, server jej povolí jen pro vlastní origin nebo
explicitní allowlist. Web používá čárkou oddělené `MCP_ALLOWED_ORIGINS`, Apache
pole `mcp_allowed_origins`. CLI a serverové klienty bez hlavičky `Origin` toto
nastavení neomezuje. Není vhodné povolit univerzální browserový origin.

Implementace sleduje oficiální specifikaci MCP pro
[transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports),
[životní cyklus](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)
a [tools](https://modelcontextprotocol.io/specification/2025-06-18/server/tools).

## Další produkty ekosystému

1. CLI `licentia`: vyhledání, vložení LICENSE, validace SPDX výrazů a kontrola aktualizací.
2. IDE pluginy: doplnění `SPDX-License-Identifier`, náhled povinností a kontrola repozitáře.
3. GitHub/GitLab aplikace: komentář k pull requestu při nové nebo změněné licenci závislosti.
4. SBOM služba: import SPDX/CycloneDX, inventář licencí, zásady organizace a export auditu.
5. Organizační portál: povolené/zakázané licence, výjimkové workflow a schvalovací stopa.
6. Podepsané offline snapshoty: JSON, SQLite a OCI artefakt pro regulovaná nebo odpojená prostředí.

## Limity kompatibility

Kompatibilita není pouze vlastnost dvojice SPDX identifikátorů. Závisí na způsobu spojení kódu, typu distribuce, úpravách, jurisdikci, dodatečných výjimkách a patentových či obchodních podmínkách. Automatická kontrola proto musí pracovat s kontextem a vracet důvody, nejistotu a požadavek na lidské posouzení.
