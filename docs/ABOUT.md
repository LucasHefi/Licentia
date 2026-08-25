# O Licentii

> Licentia existuje proto, aby práce s licencemi byla dohledatelná, srozumitelná a opatrná — ne aby nahrazovala právní posouzení.

## Co Licentia je a není

Licentia je webová a desktopová aplikace pro prohlížení katalogu SPDX License
List, porovnání licenčních metadat, validaci SPDX výrazů a orientační práci s
licenčními požadavky. Nabízí také veřejné REST API `/v1` a Streamable HTTP MCP
endpoint `/mcp`.

Licentia není advokátní kancelář, právní stanovisko ani automatický verdikt o
tom, co je nebo není právně dovoleno. Doporučení jsou odvozená z explicitních
vstupů, dostupných dat a pravidel aplikace; konkrétní použití vyžaduje vlastní
posouzení.

## Ověřená identita projektu

- **Produkt:** Licentia.
- **Vlastník / kontext produktu:** interní projekt společnosti Bucifálek.cz s.r.o.
- **Veřejný repozitář:** https://github.com/LucasHefi/Licentia
- **Aplikace:** webová a Tauri desktopová varianta sdílející uživatelské rozhraní
  a datový model.

### Autorství a údržba

V aktuálních důkazech v repozitáři není deklarováno osobní jméno autora ani
konkrétní osoba maintaineru. Toto osobní autorství je záměrně **OPEN / k
potvrzení vlastníkem**. Licentia proto zde nevymýšlí ani nepřisuzuje žádné
osobní jméno.

## Licence aplikace a zdroje

### Aplikace: OPEN / neuvedeno

Repozitář v současnosti neobsahuje soubor `LICENSE` a `package.json` je
označen jako private. Pole licence aplikace je proto **OPEN / undeclared**,
dokud vlastník neschválí a nepřidá LICENSE. Licentia není v této dokumentaci
označena jako MIT, Apache, GPL ani jiná konkrétní aplikační licence.

### Třetí strany a zdrojová data

SPDX poskytuje kanonické identifikátory, texty a metadata podle vlastních
licenčních a jiných podmínek. OSI, GitHub a MCP Registry jsou externí zdroje
nebo adaptéry pro metadata a integraci; nejsou aplikační licencí Licentie.
Tato stránka nepředkládá právní závěry o kompatibilitě ani o použití
jednotlivých zdrojů.

## Tři vrstvy evidence

1. **Kanonická data** — identifikátory, úplná znění, výjimky a šablony ze
   snapshotu SPDX.
2. **Kurátorovaná metadata** — například profily, OSI/FSF příznaky a další
   strukturované údaje vedené odděleně od kanonického textu.
3. **Odvozené doporučení** — výsledek pravidelného modelu nad explicitními
   vstupy; není novým kanonickým zdrojem ani právním verdiktem.

## Soukromí podle návrhu

- Veřejné prohlížení funguje anonymně a nevyžaduje účet.
- Anonymní pracovní prostor (oblíbené položky, porovnání, odpovědi průvodce a
  historie) se ukládá do `localStorage` v daném prohlížeči.
- Stav chráněného účtu se zpracovává odděleně přes chráněné aplikační trasy;
  anonymní rozhraní k němu nemá přístup.
- Veřejné API používá rate limit a ochrany proti příliš velkým požadavkům.
- Licentia netvrdí, že ukládá auditní záznamy s plaintextovými IP adresami;
  veřejná dokumentace popisuje pouze technický limit požadavků a jeho
  konfiguraci.

## Veřejné API a MCP

API je určeno pro čtení katalogu a pro explicitní vstupy nástrojů. Příklady:

```text
GET  /v1/licenses?q=apache&osi=true
GET  /v1/licenses/Apache-2.0/text
POST /v1/recommendations
POST /v1/compatibility/check
MCP  /mcp
```

Detailní endpointy, payloady, provenance a anonymní přístup popisuje
**[dokumentace API a ekosystému](https://github.com/LucasHefi/Licentia/blob/main/docs/ECOSYSTEM.md)**.
MCP Registry: https://registry.modelcontextprotocol.io/?q=io.github.pipeworx-io%2Fspdx-license

## Užitečné odkazy

### Oficiální zdroje

- SPDX License List: https://spdx.org/licenses/
- SPDX JSON index: https://spdx.org/licenses/licenses.json
- OSI License API: https://opensource.org/api/license
- GitHub Licenses API: https://docs.github.com/en/rest/licenses

### Produkt a repozitář

- Licentia na GitHubu: https://github.com/LucasHefi/Licentia
- About a identita projektu: https://github.com/LucasHefi/Licentia/blob/main/docs/ABOUT.md
- API a ekosystém: https://github.com/LucasHefi/Licentia/blob/main/docs/ECOSYSTEM.md

### Standardy a tooling

- SPDX licence: https://spdx.org/licenses/
- Open Source Initiative: https://opensource.org/licenses
- Model Context Protocol Registry: https://registry.modelcontextprotocol.io/?q=io.github.pipeworx-io%2Fspdx-license
- Tauri dokumentace: https://v2.tauri.app/

## Roadmap: pouze odvozené kandidáty

Následující položky jsou kandidáti odvození z aktuálního směru ekosystému,
nikoli schválené závazky, termíny nebo přísliby vydání:

- CLI pro hledání, validaci a práci se snapshoty;
- integrace do IDE;
- podepsané offline snapshoty;
- workflow organizačních licenčních politik.

## Právní a kontaktní hranice

Informace v Licentii a v tomto dokumentu jsou poskytovány pro orientaci a
technickou dokumentaci. Nejde o právní radu, právní stanovisko ani záruku
vhodnosti konkrétní licence pro konkrétní případ. Externí zdroje si zachovávají
své vlastní podmínky.

Připomínky a potvrzení otevřených údajů patří do veřejného repozitáře
Licentie: https://github.com/LucasHefi/Licentia. Dokumentace zde nevymýšlí
kontaktní e-mail ani osobu; konkrétní kontaktní kanál a osobní attribution
zůstávají **OPEN / k potvrzení vlastníkem**.
