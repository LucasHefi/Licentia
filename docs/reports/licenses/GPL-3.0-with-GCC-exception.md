# GPL-3.0-with-GCC-exception — obsahová revize

GNU General Public License v3.0 w/GCC Runtime Library exception

Revize: **2026-09-09** · pravidlo **2026-09-09.10**.

Výsledek: **zpracována, nezařazena do průvodce**.

Historický záznam obsahuje GCC Runtime Library Exception 3.1, ale jen placeholder základní GPLv3. Target Code může kombinovat runtime knihovnu s nezávislými moduly pod vlastními podmínkami pouze po Eligible Compilation Process; GCC mezireprezentace jsou vyloučeny.

## Předmět a rozsah

Výjimka 3.1 z 31.3.2009 platí pro soubor Runtime Library s copyrightovým notice GPLv3 plus touto výjimkou; celý základ GPLv3 chybí.

## Udělená práva

§1 dovoluje propagovat Target Code kombinující Runtime Library s Independent Modules, je-li veškerý Target Code vytvořen způsobilými procesy; podmínky distribuce musí souhlasit s licencemi modulů. Úplný GPL copyrightový/patentový grant nelze doložit z placeholderu.

## Podmínky a spouštěče

§0 definuje Independent Module, GCC verzi GPL3-or-later, GPL-compatible software a Target Code bez compiler IR. Eligible proces používá GCC s GPL-kompatibilními nástroji, nebo žádnou GCC odvozeninu; nekompatibilní optimalizace GCC IR jej vylučuje. §1 vyžaduje způsobilost všeho Target Code; neznámé zůstávají základní GPL povinnosti.

## Omezení, výjimky a ukončení

§2 odmítá obecný předpoklad, že třetí software není dotčen GCC copyleftem. Úvod dovoluje jen doslovné kopie dokumentu výjimky; není zde celý disclaimer nebo terminace GPLv3.

## Verze a kombinování

Výjimka je dodatečné oprávnění §7 GPLv3 a pro nový zápis potřebuje odpovídající základ GPL-3.0-only/or-later WITH GCC-exception-3.1 podle konkrétního grantu. Způsobilost kompilace a licence modulů se hodnotí odděleně od syntaxe.

## Překážky a navazující práce

- Záznam je deprecated a začíná insert GPL v3 text here. Doložit správnou základní GPLv3 licenci a volbu verzí, poté použít WITH GCC-exception-3.1 a modelovat podmínku Eligible Compilation Process; historické ID není nová samostatná licence.

## Metadata a jejich doložení

| Pole | Hodnota | Doložení znění |
|---|---|---|
| family | "weak-copyleft" | public/data/licenses/GPL-3.0-with-GCC-exception.json#text; Target-code výjimka má knihovní hranici, nepovoluje automaticky všechny zásahy do GCC/IR a bez základního GPL textu nelze dokončit obecné copyleft povinnosti. |
| copyleftScope | "library" | public/data/licenses/GPL-3.0-with-GCC-exception.json#text; Target-code výjimka má knihovní hranici, nepovoluje automaticky všechny zásahy do GCC/IR a bez základního GPL textu nelze dokončit obecné copyleft povinnosti. |
| permissions | ["conditional-relicensing","distribution","unknown"] | public/data/licenses/GPL-3.0-with-GCC-exception.json#text; §1 dovoluje propagovat Target Code kombinující Runtime Library s Independent Modules, je-li veškerý Target Code vytvořen způsobilými procesy; podmínky distribuce musí souhlasit s licencemi modulů. Úplný GPL copyrightový/patentový grant nelze doložit z placeholderu. |
| obligations | ["preserve-combined-license-terms","unknown"] | public/data/licenses/GPL-3.0-with-GCC-exception.json#text; §0 definuje Independent Module, GCC verzi GPL3-or-later, GPL-compatible software a Target Code bez compiler IR. Eligible proces používá GCC s GPL-kompatibilními nástroji, nebo žádnou GCC odvozeninu; nekompatibilní optimalizace GCC IR jej vylučuje. §1 vyžaduje způsobilost všeho Target Code; neznámé zůstávají základní GPL povinnosti. |
| triggers | ["combination","distribution","linking","unknown"] | public/data/licenses/GPL-3.0-with-GCC-exception.json#text; §0 definuje Independent Module, GCC verzi GPL3-or-later, GPL-compatible software a Target Code bez compiler IR. Eligible proces používá GCC s GPL-kompatibilními nástroji, nebo žádnou GCC odvozeninu; nekompatibilní optimalizace GCC IR jej vylučuje. §1 vyžaduje způsobilost všeho Target Code; neznámé zůstávají základní GPL povinnosti. |
| restrictions | ["additional-terms","unknown"] | public/data/licenses/GPL-3.0-with-GCC-exception.json#text; §2 odmítá obecný předpoklad, že třetí software není dotčen GCC copyleftem. Úvod dovoluje jen doslovné kopie dokumentu výjimky; není zde celý disclaimer nebo terminace GPLv3. |
| patentPosition | "unknown" | public/data/licenses/GPL-3.0-with-GCC-exception.json#text; §1 dovoluje propagovat Target Code kombinující Runtime Library s Independent Modules, je-li veškerý Target Code vytvořen způsobilými procesy; podmínky distribuce musí souhlasit s licencemi modulů. Úplný GPL copyrightový/patentový grant nelze doložit z placeholderu. |
| noticeBurden | "unknown" | public/data/licenses/GPL-3.0-with-GCC-exception.json#text; §0 definuje Independent Module, GCC verzi GPL3-or-later, GPL-compatible software a Target Code bez compiler IR. Eligible proces používá GCC s GPL-kompatibilními nástroji, nebo žádnou GCC odvozeninu; nekompatibilní optimalizace GCC IR jej vylučuje. §1 vyžaduje způsobilost všeho Target Code; neznámé zůstávají základní GPL povinnosti. |

## Zdroje

- [Primární zdroj](https://spdx.org/licenses/GPL-3.0-with-GCC-exception.html) — Individuální revize celého připnutého textu; Výjimka 3.1 z 31.3.2009 platí pro soubor Runtime Library s copyrightovým notice GPLv3 plus touto výjimkou; celý základ GPLv3 chybí.
- [Kurátorovaný profil](../../../data/profiles/licenses/id-R1BMLTMuMC13aXRoLUdDQy1leGNlcHRpb24.json)
- [Uložené úplné znění](../../../public/data/licenses/GPL-3.0-with-GCC-exception.json)

## Otisk zdroje

```json
{
  "sourceId": "spdx-license-list",
  "revision": "manifest-sha256:74897699de0d23c4da42b94bf46bc6fd01f7b68ffcece9db1a98194ac277bb02",
  "contentHash": "sha256:8c8fdee8a358ca971cd8744dd890e1928f7fca9ecb7bcc932713658b3fa72d9d"
}
```
