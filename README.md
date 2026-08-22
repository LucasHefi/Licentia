# Licentia

Licentia je česká webová a desktopová aplikace nad úplným katalogem SPDX License List 3.28.0. Obsahuje 727 licencí, 84 licenčních výjimek, plnotextové vyhledávání, detail kanonického znění, porovnání a vysvětlitelný průvodce výběrem.

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
- `docs/ECOSYSTEM.md` — návrh API, MCP a navazujících nástrojů
