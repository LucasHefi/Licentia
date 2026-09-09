# LGPLLR — obsahová revize

Lesser General Public License For Linguistic Resources

Revize: **2026-09-10** · pravidlo **2026-09-09.10**.

Výsledek: **zpracována, nezařazena do průvodce**.

LGPL pro jazykové zdroje upravuje slovníky, gramatiky a jiná jazyková data, nikoli běžnou softwarovou knihovnu. Změněný zdroj musí zůstat jazykovým zdrojem a jako celek pod touto licencí; oddělený program pouze používající data má vlastní podmínky. Spojený balík lze licencovat jinak, pokud dovolí vlastní změny a jejich ladění reverzním inženýrstvím a zvolí jednu z pěti cest umožňujících upravit či nahradit zdroj, včetně zvláštního režimu šifrovaných dat. Notices a data změn se zachovávají; patentový grant chybí.

## Předmět a rozsah

§0 collection of data about language připravená pro aplikace, typicky lexikony a gramatiky. Běh programu se zdrojem je mimo působnost a výstup je pokryt jen pokud sám tvoří odvozeninu. §3 samostatná aplikace bez odvozených dat pouze čtoucí/kompilující/linkující zdroj není odvozeninou; balík obsahující i zašifrovaná data ano a řídí se §4.

## Udělená práva

§§1–2 dovolují kopie a modifikace jazykových dat za stanovených podmínek, fyzický přenos i záruku lze zpoplatnit a běh není komerčně omezen. §2(a) modifikované dílo musí zůstat linguistic resource. §4 dovoluje vlastní podmínky spojeného balíku s povinnými svobodami zákazníkových úprav a reverzního ladění. §10 dovoluje jiné verze pouze dle konkrétního notice nebo neurčeného čísla; výslovný patentový grant neobsahuje.

## Podmínky a spouštěče

§1 copyright/disclaimer na kopiích, zachované licenční/warranty notices a celý text. §2 změněné soubory výrazná změna+datum, celý odvozený zdroj zdarma licencovaný všem pod LGPLLR; nezávislé části odděleně vyňaty, uvnitř odvozeného celku zahrnuty, pouhá agregace vyňata. §4 každý balík výrazně oznámí použití/licenci zdroje, přiloží licenci a při zobrazování copyrightů zobrazí i zdrojový copyright s odkazem. Dále jedna cesta: (a) kompletní legible zdroj a u šifrování používající program v objektu a/nebo zdroji pro přestavbu se změněnými daty, (b) mechanismus pro nahrazení kompatibilním zdrojem, (c) nabídka témuž uživateli nejméně 3 roky za náklady, (d) ekvivalentní přístup ze stejného místa, (e) ověřené dřívější předání. Šifrovaný balík vyžaduje i potřebná data/nástroje, s OS výjimkou jen pokud komponenta není přiložena.

## Omezení, výjimky a ukončení

§5 nepovolené kopie/úpravy/sublicence/link/distribuce ruší práva, compliant downstream zůstává. §7 příjemce získá přímou licenci a zákaz dalších restrikcí; distributor nemusí vymáhat dodržování třetími stranami. §8 při neslučitelném soudním/patentovém či jiném závazku nedistribuovat; nejde o patentovou odvetu ani grant. §9 umožňuje explicitně doplněné zeměpisné omezení, ale tato předloha žádné země nevyjmenovává. §§12–13 výluky záruk/škod s právními a písemnými výjimkami.

## Verze a kombinování

§4 výjimka balíku nezbavuje jazyková data podmínek §§1–2, ale dovoluje jiné aplikační podmínky při výměně/obnově zdroje a reverse engineering. Text výslovně řeší možný konflikt s proprietárními knihovnami, kdy balík nelze distribuovat. §11 neslučitelné jiné licence vyžadují svolení autora, nikoli automatický přechod na obecnou LGPL nebo GPL. Název licence sám nečiní jazykový zdroj softwarovou knihovnou.

## Překážky a navazující práce

- §§0–4 vymezují jazykový datový zdroj, jeho legible form, používající aplikaci a složený balík, přičemž změněné dílo musí samo zůstat linguistic resource. Scope library nebo file by podsouval softwarovou hranici; je nutná datová komponentová větev s odpovídajícím rozsahem a omezením odvozenin.
- §4 má pět alternativ plnění: čitelná data plus u šifrovaného zdroje sestavitelný používající program, výměnný kompatibilní mechanismus, tříletá nabídka, ekvivalentní přístup nebo ověření dřívějšího předání. Model nezachycuje šifrování/reprodukci datového balíku ani tyto alternativní povinnosti; nelze je sloučit v obecný požadavek zveřejnit softwarové zdroje.

## Metadata a jejich doložení

| Pole | Hodnota | Doložení znění |
|---|---|---|
| family | "weak-copyleft" | public/data/licenses/LGPLLR.json#text; §2 copyleft odvozených jazykových dat a §§3–4 výjimka samostatné používající aplikace/spojeného balíku s vlastní licencí; slabý datový copyleft; https://spdx.org/licenses/LGPLLR.html |
| copyleftScope | "unknown" | public/data/licenses/LGPLLR.json#text; §§0,3–4 hranice linguistic resource/používající program/šifrovaný balík není dostupnou softwarovou file/library hranicí; unknown je přesně rozsah datové komponenty; https://spdx.org/licenses/LGPLLR.html |
| permissions | ["commercial-use","conditional-relicensing","distribution","modifications","private-use"] | public/data/licenses/LGPLLR.json#text; §§1–2 distribuce a modifikace dat, neomezený běh §0 a placené předání/záruka; §4 jiné balíkové podmínky, §10 verze dle notice; žádné patentové právo; https://spdx.org/licenses/LGPLLR.html |
| obligations | ["allow-reverse-engineering","include-copyright","include-license-text","include-notice","mark-modifications","same-license","unknown"] | public/data/licenses/LGPLLR.json#text; §§1–2 celý text/copyright/notices/změnové datum a stejná licence dat, §4 zákazníkova změna a reverzní ladění; pět datových/šifrovacích alternativ nelze mapovat na jediný source/relink enum; https://spdx.org/licenses/LGPLLR.html |
| triggers | ["combination","distribution","linking","modification","use"] | public/data/licenses/LGPLLR.json#text; Distribuce a změny §§1–2, spojení/čtení/kompilace/linkování §§3–4 a podmíněné zobrazování copyrightů při běhu balíku; samotný běh zdroje §0 není omezen; https://spdx.org/licenses/LGPLLR.html |
| restrictions | ["additional-terms","liability","unknown","warranty"] | public/data/licenses/LGPLLR.json#text; §2(a) odvozenina musí být jazykový zdroj je nemodelovaná restrikce; §7 bez dalších omezení, §8 zákaz rozporné distribuce, §§12–13 výluky; §9 pouze možnost explicitních zemí bez jejich určení; https://spdx.org/licenses/LGPLLR.html |
| patentPosition | "none-stated" | public/data/licenses/LGPLLR.json#text; §8 řeší konflikt patentové licence s royalty-free distribucí, nikoli patentový grant nebo žalobní odvetu; úplné §§0–13 další patentový grant nemají; https://spdx.org/licenses/LGPLLR.html |
| noticeBurden | "material" | public/data/licenses/LGPLLR.json#text; §1 notices a celý text, §2 datované změny a §4 prominentní použití zdroje, podmíněný runtime copyright a přesně vymezené nabídky/předání; materiální datová zátěž; https://spdx.org/licenses/LGPLLR.html |

## Zdroje

- [Primární zdroj](https://spdx.org/licenses/LGPLLR.html) — Individuálně přečten celý připnutý SPDX text; §2 copyleft odvozených jazykových dat a §§3–4 výjimka samostatné používající aplikace/spojeného balíku s vlastní licencí; slabý datový copyleft
- [Kurátorovaný profil](../../../data/profiles/licenses/id-TEdQTExS.json)
- [Uložené úplné znění](../../../public/data/licenses/LGPLLR.json)

## Otisk zdroje

```json
{
  "sourceId": "spdx-license-list",
  "revision": "manifest-sha256:74897699de0d23c4da42b94bf46bc6fd01f7b68ffcece9db1a98194ac277bb02",
  "contentHash": "sha256:68c7f1203d512223401295ddb7654fbaae9d232a565dffd4895554d658067572"
}
```
