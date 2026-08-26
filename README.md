# Licentia

Licentia je česká webová a desktopová aplikace pro práci s katalogem SPDX License List 3.28.0. Pomáhá rychle najít licenci, porovnat její metadata a zorientovat se v povinnostech bez nutnosti procházet stovky textů ručně.

> Průvodce je orientační rozhodovací pomůcka, nikoli právní rada.

## Co umí

- offline katalog 727 licencí a 84 licenčních výjimek;
- plnotextové vyhledávání podle názvu, SPDX ID i úplného znění;
- filtrování podle typu záznamu, aktuálnosti, OSI/FSF metadat a profilu licence;
- detailní zobrazení kanonického textu a povinností;
- porovnání licencí a ukládání položek do osobního pracovního prostoru;
- šestikrokový průvodce výběrem běžného licenčního směru;
- veřejné REST API `/v1`;
- Streamable HTTP MCP endpoint `/mcp`;
- validaci SPDX výrazů, orientační kontrolu kompatibility a analýzu SPDX/CycloneDX SBOM;
- webovou, Tauri desktopovou a sdílenou Apache/PHP variantu.

## Ukázky aplikace

### Katalog licencí

![Katalog Licentia](docs/screenshots/licentia-catalog.png)

### Průvodce výběrem

![Průvodce výběrem licence](docs/screenshots/licentia-guide.png)

### Vyhledávání v katalogu

![Vyhledávání licence MIT](docs/screenshots/licentia-search.png)

## Vývoj webové aplikace

Požadovaný Node.js: `>=22.13.0`.

```bash
npm install
npm run dev
```

Produkční sestavení:

```bash
npm run build
```

Kontrola stylu a statických pravidel:

```bash
npm run lint
```

## Desktop: Linux, Windows a macOS

Desktop používá Tauri 2 a samostatnou statickou Vite sestavu se stejnými React komponentami a lokální kopií všech dat.

```bash
npm run dev:desktop
npm run tauri:dev
npm run tauri:build
```

Instalátory se sestavují na cílovém systému. Linux potřebuje WebKitGTK 4.1, macOS Xcode Command Line Tools a Windows Microsoft C++ Build Tools plus WebView2. Přesné aktuální požadavky jsou v [oficiální dokumentaci Tauri](https://v2.tauri.app/start/prerequisites/).

## Sdílený Apache hosting

Požadavky: Apache 2.4 s `mod_rewrite`, HTTPS, PHP 8.2+, rozšíření PDO SQLite (nebo PDO MySQL), cURL a JSON.

```bash
npm run build:apache
```

Výsledný adresář `apache-dist/` nahrajte do kořene webu. Pro Google/GitHub přihlášení zkopírujte `api/config.example.php` jako `api/config.php`, doplňte OAuth klíče a nastavte callback na:

```text
https://vase-domena.cz/api/auth/oauth/callback
```

Bez OAuth konfigurace fungují účty přes e-mail a heslo. Databáze se při prvním požadavku vytvoří v `api/var/`; adresář musí být zapisovatelný pro PHP.

Přihlašovací a registrační obrazovka nabízí také volitelnou cestu „Pokračovat bez registrace a přihlášení“. Účetní funkce zůstávají k dispozici; stav anonymního pracovního prostoru se ukládá pouze v `localStorage` prohlížeče a nepersistuje se na serveru ani k účtu.

Po nahrání ověřte `/v1`, `/v1/licenses?q=MIT` a MCP inicializaci přes `POST /mcp`. Soubor `checksums.sha256` umožňuje ověřit úplnost přenosu.

Před nasazením veřejného API nastavte dlouhý náhodný rate-limit secret
(`RATE_LIMIT_SECRET` v Cloudflare/procesním prostředí, nebo `rate_limit_secret`
v Apache konfiguraci). `TRUSTED_PROXY_MODE=true` a příslušný proxy header
zapínejte pouze za kontrolovaným ingress proxy.

## Aktualizace dat

Generátor očekává checkouty pevné verze `spdx/license-list-data` a `github/choosealicense.com`:

```bash
node scripts/build-app-data.mjs /cesta/license-list-data /cesta/choosealicense public/data
```

Výstup obsahuje katalog metadat, detailní JSON každé položky a plnotextový index. Desktop jej balí přímo do aplikace; web jej servíruje jako verzovaná statická data.

## Struktura

- `app/` — webový vstup pro Sites/Vinext;
- `components/` a `lib/` — sdílené uživatelské rozhraní a pravidlový engine;
- `desktop/` — statický Vite vstup pro Tauri;
- `src-tauri/` — nativní obálka a konfigurace balíčků;
- `public/data/` — offline katalog;
- `docs/ECOSYSTEM.md` — API, MCP a navazující nástroje;
- `docs/screenshots/` — screenshoty aktuální desktopové webové sestavy;
- `apache-server/` — PHP runtime a bezpečnostní konfigurace pro sdílený hosting;
- `apache-dist/` — artefakt vytvořený příkazem `npm run build:apache`.

## About, identita a datová hranice

Licentia je interní projekt Bucifálek.cz s.r.o. Osobní autorství není v aktuálních
repozitářových důkazech deklarováno a zůstává OPEN k potvrzení vlastníkem.
Repozitář neobsahuje `LICENSE` a aplikace je proto OPEN / bez deklarované
aplikační licence; MIT, Apache ani GPL zde nejsou tvrzeny. SPDX poskytuje
kanonická data podle vlastních podmínek, zatímco OSI, GitHub a MCP jsou externí
zdroje nebo adaptéry. Podrobnosti jsou v [docs/ABOUT.md](docs/ABOUT.md).

Veřejné API `/v1` a MCP `/mcp`, včetně anonymního přístupu a hranic dat,
popisuje [dokumentace API a ekosystému](docs/ECOSYSTEM.md).
