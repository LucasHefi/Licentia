# OLDAP-1.2 — obsahová revize

Open LDAP Public License v1.2

Revize: **2026-09-09** · pravidlo **2026-09-09.10**.

Výsledek: **zpracována, nezařazena do průvodce**.

OpenLDAP 1.2 má oddělené alternativy pro změny a binární distribuci: zveřejnění změn, interní užití, přejmenované/standardní protějšky s manuály či dohoda s držitelem. Zdroj není vždy povinný; samotný balík nesmí mít cenu, ale kopírování, podpora a komerční agregace jsou dovoleny.

## Předmět a rozsah

OpenLDAP Package podle licence1.2 z1.9.1998, textové deriváty a Standard Version; Freely Available zahrnuje nulovou cenu věci a další redistribuci za stejných podmínek.

## Udělená práva

1 verbatim source,2 public-domain/holder fixes jako standard,3 jiné úpravy,4 binary/object distribuce.5 placená podpora/komerční agregace;6 input/output scripts/libraries patří generujícím. Patentový grant chybí.

## Podmínky a spouštěče

3 vždy how/when notices ve změněných souborech plus jedna z public/free changes, internal-only, renamed+standard executables/manpages nebo dohoda.4 jedna z standard executables/source-location, modified machine-readable source, renamed+standard/differences nebo dohoda.1 původní copyrights/disclaimers.

## Omezení, výjimky a ukončení

5 jen copying fee za balík, support libovolná; agregace nesmí vydávat balík za vlastní.7 C emulace podmíněná regression tests jazyka;8 naming endorsement souhlas;9 AS IS bez záruk, bez samostatné liability.

## Verze a kombinování

Nejde o samotnou Artistic ani novější OpenLDAP verzi; dvě sady cest nejsou kumulativní. Regresní testy omezují výjimku vlastních C subroutin, ne každé nezávislé linkující aplikace automaticky.

## Překážky a navazující práce

- Body3a–d a4a–d jsou dvě samostatné volby ONE z různých cest, včetně interního užití, zdroje, standardních protějšků/manuálů a jiné dohody. Je třeba modelovat alternativy bez souběžného vynucení source+rename a zvlášť komerční agregaci/poplatky.
- Bod7 vyjímá vlastní emulační C subroutines jen pokud nemění jazyk způsobem vedoucím k neúspěchu regression tests. Je třeba zachovat testově podmíněnou hranici balíku, nikoli univerzální library nebo whole-work scope.

## Metadata a jejich doložení

| Pole | Hodnota | Doložení znění |
|---|---|---|
| family | "nonstandard" | public/data/licenses/OLDAP-1.2.json#text; 1.2 body3/4 ONE alternatives a5 fee regime nejsou jednoduchá jednotná reciproční licence.; https://spdx.org/licenses/OLDAP-1.2.html |
| copyleftScope | "unknown" | public/data/licenses/OLDAP-1.2.json#text; 3/4 alternativní source/interní/renaming cesty a7 podmíněná C-exemption neumožňují jeden věrný copyleft scope.; https://spdx.org/licenses/OLDAP-1.2.html |
| permissions | ["commercial-use","distribution","modifications","private-use"] | public/data/licenses/OLDAP-1.2.json#text; 1–4 copy/modify/binary grants,5 paid support/commercial aggregate a6 output sale; patent neuveden.; https://spdx.org/licenses/OLDAP-1.2.html |
| obligations | ["include-copyright","include-notice","mark-modifications","unknown"] | public/data/licenses/OLDAP-1.2.json#text; 1 copyright/disclaimers;3 how/when vždy a jedna cesta;4 nezávislá jedna cesta. Unknown brání kumulativnímu source/rename modelu.; https://spdx.org/licenses/OLDAP-1.2.html |
| triggers | ["distribution","linking","modification"] | public/data/licenses/OLDAP-1.2.json#text; Otherwise modification3,object/executable distribution4 a C-subroutine linking7 mají odlišné podmínky;2 approved fixes standard.; https://spdx.org/licenses/OLDAP-1.2.html |
| restrictions | ["trademark","unknown","warranty"] | public/data/licenses/OLDAP-1.2.json#text; 5 standalone price/own-product advertising omezení,8 name endorsement,9 warranty; fee/role cesty mimo slovník.; https://spdx.org/licenses/OLDAP-1.2.html |
| patentPosition | "none-stated" | public/data/licenses/OLDAP-1.2.json#text; Celých9 bodů bez výslovné patentové licence či patentového ukončení.; https://spdx.org/licenses/OLDAP-1.2.html |
| noticeBurden | "material" | public/data/licenses/OLDAP-1.2.json#text; Alternativy standardních protějšků/manuálů či source a cenové podmínky jsou materiální.; https://spdx.org/licenses/OLDAP-1.2.html |

## Zdroje

- [Primární zdroj](https://spdx.org/licenses/OLDAP-1.2.html) — Individuálně přečten celý připnutý SPDX text; 1.2 body3/4 ONE alternatives a5 fee regime nejsou jednoduchá jednotná reciproční licence.
- [Kurátorovaný profil](../../../data/profiles/licenses/id-T0xEQVAtMS4y.json)
- [Uložené úplné znění](../../../public/data/licenses/OLDAP-1.2.json)

## Otisk zdroje

```json
{
  "sourceId": "spdx-license-list",
  "revision": "manifest-sha256:74897699de0d23c4da42b94bf46bc6fd01f7b68ffcece9db1a98194ac277bb02",
  "contentHash": "sha256:a7e4d077ef3ece0a40910cac3936f93adaee743f55d33fc97b13c2129c79cbfa"
}
```
