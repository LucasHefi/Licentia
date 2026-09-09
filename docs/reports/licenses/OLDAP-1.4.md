# OLDAP-1.4 — obsahová revize

Open LDAP Public License v1.4

Revize: **2026-09-09** · pravidlo **2026-09-09.10**.

Výsledek: **zpracována, nezařazena do průvodce**.

OpenLDAP 1.4 zachovává oddělené alternativy změn a binárního šíření i cenové omezení samotného balíku. Navíc dovoluje volně šířit/prodávat linkované programy, pokud jejich primární funkce je jiná než funkce balíku; emulační subrutiny nesmějí rozbít jeho regresní testy.

## Předmět a rozsah

OpenLDAP Package a textové deriváty, verze1.4 z18.1.1999; Standard Version a definované copying fee/Freely Available.

## Udělená práva

1–4 source/modify/object práva dle cest;6 generované input/output patří autorům;8 linked programs mohou být komerční při odlišné primární funkci. Patentový grant chybí.

## Podmínky a spouštěče

3 how/when changed files +jedna public/free/internal/rename-standard-manual/arrangement cesta;4 jedna standard+location/source/rename-standard-manual/arrangement.1 copyrights/disclaimers;5 fee pouze copying a libovolná podpora, komerční agregace nepředstírá autorství.

## Omezení, výjimky a ukončení

7 vlastní C emulace vyňata pokud nezmění behavior tak, že selžou package tests;8 aplikace s jinou primary function vyňata a volně redistribuovatelná.9 naming consent;10 AS IS bez záruk, bez liability doložky.

## Verze a kombinování

Bod8 je explicitní přídavek oproti1.2; body7/8 se nesmějí spojit do blanket linking exception. Žádná volba novější licence ani obecné převzetí Artistic.

## Překážky a navazující práce

- Body3/4 mají samostatné ONE-of cesty a5 rozlišuje cenu balíku, kopírování, podporu a agregaci. Je třeba reprezentovat alternativy bez bezpodmínečné zdrojové/renaming povinnosti.
- Bod8 vyjímá vlastní linkované aplikace jen pokud primary function differs from package;7 vyjímá emulační C rutiny jen při zachování chování/regresních testů balíku. Je třeba modelovat obě funkčně odlišné hranice, ne neomezenou výjimku linkování či library scope.

## Metadata a jejich doložení

| Pole | Hodnota | Doložení znění |
|---|---|---|
| family | "nonstandard" | public/data/licenses/OLDAP-1.4.json#text; 1.4 přidává vedle3/4 alternativ a5 fee režimu funkčně omezený linked-app grant8.; https://spdx.org/licenses/OLDAP-1.4.html |
| copyleftScope | "unknown" | public/data/licenses/OLDAP-1.4.json#text; Bod7 regression behavior a8 primary-function hranice vedle source/rename alternativ vyžadují jemnější scope.; https://spdx.org/licenses/OLDAP-1.4.html |
| permissions | ["commercial-use","distribution","modifications","private-use"] | public/data/licenses/OLDAP-1.4.json#text; 1–4 základní grants a8 commercial linked executables pouze primary function different;6 výstupy vlastní jejich tvůrci.; https://spdx.org/licenses/OLDAP-1.4.html |
| obligations | ["include-copyright","include-notice","mark-modifications","unknown"] | public/data/licenses/OLDAP-1.4.json#text; 1 notices;3 changed-file how/when plus jedna cesta;4 další jedna cesta; nepřidávat obě jako kumulativní source/rename.; https://spdx.org/licenses/OLDAP-1.4.html |
| triggers | ["distribution","linking","modification"] | public/data/licenses/OLDAP-1.4.json#text; Modification3, object distribution4, emulation linking7 a program linking8 spouštějí odlišné podmínky.; https://spdx.org/licenses/OLDAP-1.4.html |
| restrictions | ["trademark","unknown","warranty"] | public/data/licenses/OLDAP-1.4.json#text; 5 omezuje cenu/propagaci balíku,7/8 funkční podmínky mimo slovník;9 endorsement souhlas,10 warranty.; https://spdx.org/licenses/OLDAP-1.4.html |
| patentPosition | "none-stated" | public/data/licenses/OLDAP-1.4.json#text; Všech10 bodů bez výslovného patentového grantu nebo patentového ukončení.; https://spdx.org/licenses/OLDAP-1.4.html |
| noticeBurden | "material" | public/data/licenses/OLDAP-1.4.json#text; Alternativní standardní protějšky/manuály/source a funkční/fee hranice jsou materiální.; https://spdx.org/licenses/OLDAP-1.4.html |

## Zdroje

- [Primární zdroj](https://spdx.org/licenses/OLDAP-1.4.html) — Individuálně přečten celý připnutý SPDX text; 1.4 přidává vedle3/4 alternativ a5 fee režimu funkčně omezený linked-app grant8.
- [Kurátorovaný profil](../../../data/profiles/licenses/id-T0xEQVAtMS40.json)
- [Uložené úplné znění](../../../public/data/licenses/OLDAP-1.4.json)

## Otisk zdroje

```json
{
  "sourceId": "spdx-license-list",
  "revision": "manifest-sha256:74897699de0d23c4da42b94bf46bc6fd01f7b68ffcece9db1a98194ac277bb02",
  "contentHash": "sha256:3b72181da069d1f7390947c2ef232647850796f707b2811ebc8d9af0e7b2caac"
}
```
