# GPL-2.0-with-autoconf-exception — obsahová revize

GNU General Public License v2.0 w/Autoconf exception

Revize: **2026-09-09** · pravidlo **2026-09-09.10**.

Výsledek: **zpracována, nezařazena do průvodce**.

Připnutý záznam nahrazuje GPL v2 placeholderem a obsahuje Autoconf výjimku pro výstupní configure skripty. Upravený Autoconf může výjimku převzít jen tehdy, nemůže-li do výstupu kopírovat původní non-data části; jinak se oznámení výjimky musí odstranit.

## Předmět a rozsah

Autoconf program versus configure výstup: data části se mohou kopírovat, non-data jsou komentáře a výkonný kód rozhodující o výstupu.

## Udělená práva

Výjimka dává neomezená práva kopírovat, šířit a měnit výstupní configure skripty bez GPL; zbytek programu zůstává GPL, jejíž text chybí.

## Podmínky a spouštěče

Upravené distribuované verzi lze výjimku rozšířit, pokud nemůže přesunout/kopírovat původní non-data do výstupu. Pokud takovou možnost má, oznámení výjimky se musí smazat.

## Omezení, výjimky a ukončení

Výjimka platí pro FSF vydání Autoconf; základní záruky, odpovědnost, zdrojové povinnosti a patenty placeholder neobsahuje.

## Verze a kombinování

Výstupní výjimka není obecná GPL kompatibilita či volba verze; podmínka převzetí závisí na konkrétní modifikaci programu.

## Překážky a navazující práce

- Základní GPL je nahrazena insert GPL v2 license text here. Pro úplný profil je třeba doložit základní text i jeho vazbu na výjimku; nelze převzít zdrojové, patentové a zárukové podmínky z nepřítomného grantu.
- Jde o deprecated složený identifikátor; pro nový projekt je třeba aktuální základní GPL identifikátor s odpovídající Autoconf výjimkou a ověření zacházení s data/non-data částmi.

## Metadata a jejich doložení

| Pole | Hodnota | Doložení znění |
|---|---|---|
| family | "strong-copyleft" | public/data/licenses/GPL-2.0-with-autoconf-exception.json#text; Nadpis Autoconf Exception a text GPL governs all other use odkazují na základní copyleft chybějící v placeholderu.; https://spdx.org/licenses/GPL-2.0-with-autoconf-exception.html |
| copyleftScope | "unknown" | public/data/licenses/GPL-2.0-with-autoconf-exception.json#text; Výstupní configure skripty jsou vyňaty; copyleft rozsah zbytku programu z placeholderu nelze úplně zrekonstruovat.; https://spdx.org/licenses/GPL-2.0-with-autoconf-exception.html |
| permissions | ["unknown"] | public/data/licenses/GPL-2.0-with-autoconf-exception.json#text; Výjimka unlimited copy/distribute/modify configure outputs; základní softwarový a patentový grant v textu chybí.; https://spdx.org/licenses/GPL-2.0-with-autoconf-exception.html |
| obligations | ["unknown"] | public/data/licenses/GPL-2.0-with-autoconf-exception.json#text; Podmínka delete exception při možném kopírování non-data do výstupu; ostatní GPL povinnosti nejsou přítomny.; https://spdx.org/licenses/GPL-2.0-with-autoconf-exception.html |
| triggers | ["distribution","modification"] | public/data/licenses/GPL-2.0-with-autoconf-exception.json#text; Make and distribute modified version spouští posouzení data/non-data; ostatní základní GPL triggery nelze doložit.; https://spdx.org/licenses/GPL-2.0-with-autoconf-exception.html |
| restrictions | ["unknown"] | public/data/licenses/GPL-2.0-with-autoconf-exception.json#text; Výjimka nezahrnuje jiné užití programu; kompletní základní omezení chybějí.; https://spdx.org/licenses/GPL-2.0-with-autoconf-exception.html |
| patentPosition | "unknown" | public/data/licenses/GPL-2.0-with-autoconf-exception.json#text; Placeholder neobsahuje GPL patentové podmínky; výjimka je sama neurčuje.; https://spdx.org/licenses/GPL-2.0-with-autoconf-exception.html |
| noticeBurden | "unknown" | public/data/licenses/GPL-2.0-with-autoconf-exception.json#text; Je uvedeno podmíněné odstranění výjimky, ale kompletní notice povinnosti základní GPL chybí.; https://spdx.org/licenses/GPL-2.0-with-autoconf-exception.html |

## Zdroje

- [Primární zdroj](https://spdx.org/licenses/GPL-2.0-with-autoconf-exception.html) — Individuálně přečten celý připnutý SPDX text; Nadpis Autoconf Exception a text GPL governs all other use odkazují na základní copyleft chybějící v placeholderu.
- [Kurátorovaný profil](../../../data/profiles/licenses/id-R1BMLTIuMC13aXRoLWF1dG9jb25mLWV4Y2VwdGlvbg.json)
- [Uložené úplné znění](../../../public/data/licenses/GPL-2.0-with-autoconf-exception.json)

## Otisk zdroje

```json
{
  "sourceId": "spdx-license-list",
  "revision": "manifest-sha256:74897699de0d23c4da42b94bf46bc6fd01f7b68ffcece9db1a98194ac277bb02",
  "contentHash": "sha256:5ca97f49b90c3328a8cd34411f0d4281d00664f559b5958adc866358a110a8cf"
}
```
