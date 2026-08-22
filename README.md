# Licentia

Licentia je česká webová a desktopová aplikace nad úplným katalogem SPDX License List 3.28.0. Obsahuje 727 licencí, 84 licenčních výjimek, plnotextové vyhledávání, detail kanonického znění, porovnání a vysvětlitelný průvodce výběrem.

Součástí je veřejné REST API `/v1`, Streamable HTTP MCP `/mcp`, validace SPDX výrazů, orientační kontrola kompatibility, analýza SPDX/CycloneDX SBOM a synchronizovaný osobní pracovní prostor s oblíbenými položkami a historií.

Průvodce je orientační rozhodovací pomůcka, ne právní rada. Podmínky kurátorovaného výběru vycházejí z projektu [Choose a License](https://choosealicense.com/) a z metadat SPDX.

## Vývoj webové aplikace

```bash
npm install
npm run dev
```

Produkční sestavení:

```bash
npm run build
```

## Desktop: Linux, Windows a macOS

Desktop používá Tauri 2 a samostatnou statickou Vite sestavu se stejnými React komponentami a lokální kopií všech dat.

```bash
npm run tauri:dev
npm run tauri:build
```

Instalátory jednotlivých systémů se sestavují na cílovém systému. Linux potřebuje WebKitGTK 4.1, macOS Xcode Command Line Tools a Windows Microsoft C++ Build Tools plus WebView2. Přesné aktuální požadavky jsou v [oficiální dokumentaci Tauri](https://v2.tauri.app/start/prerequisites/).

## Sdílený Apache hosting

Požadavky: Apache 2.4 s `mod_rewrite`, HTTPS, PHP 8.2+, rozšíření PDO SQLite (nebo PDO MySQL), cURL a JSON.

```bash
npm run build:apache
```

Obsah adresáře `apache-dist/` nahrajte do kořene webu. Pro Google/GitHub přihlášení zkopírujte `api/config.example.php` jako `api/config.php`, doplňte OAuth klíče a nastavte callback na `https://vase-domena.cz/api/auth/oauth/callback`. Bez této konfigurace fungují účty přes e-mail a heslo. Databáze se při prvním požadavku vytvoří v `api/var/`; adresář musí být zapisovatelný pro PHP.

Po nahrání ověřte `/v1`, `/v1/licenses?q=MIT` a MCP inicializaci přes `POST /mcp`. Soubor `checksums.sha256` umožňuje ověřit úplnost přenosu.

## Aktualizace dat

Generátor očekává checkouty pevné verze `spdx/license-list-data` a `github/choosealicense.com`:

```bash
node scripts/build-app-data.mjs /cesta/license-list-data /cesta/choosealicense public/data
```

Výstup obsahuje malý katalog metadat, detailní JSON každé položky a plnotextový index. Desktop jej balí přímo do aplikace; web jej servíruje jako verzovaná statická data.

## Struktura

- `app/` — webový vstup pro Sites/Vinext
- `components/` a `lib/` — sdílené uživatelské rozhraní a pravidlový engine
- `desktop/` — statický Vite vstup pro Tauri
- `src-tauri/` — nativní obálka a konfigurace balíčků
- `public/data/` — vygenerovaný offline katalog
- `docs/ECOSYSTEM.md` — API, MCP a navazující nástroje
- `apache-server/` — PHP runtime a bezpečnostní konfigurace pro sdílený hosting
- `apache-dist/` — hotový artefakt vytvořený příkazem `npm run build:apache`
