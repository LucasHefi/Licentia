# Tagy a historie vydání licencí (LIC-017 až LIC-024)

## Vstupy a publikace

[Slovník tagů](../../data/catalog-tags.json) je společný pro generátor a React.
Odvození používá jednotlivá známá pole s evidencí, přijatelnou úrovní důkazu
a připnutým zdrojem. Zdrojová povinnost při distribuci či vzdálené interakci
vyžaduje samostatný doklad s konkrétním spouštěčem. Dvě nespojená profilová
pole pro povinnosti a spouštěče by tuto vazbu mohla přiřadit chybně.
Účel, NC, ND a ShareAlike jsou doložené samostatně. Výjimky mají vlastní typ
a volitelné doložené použití s licencí. Označení OSI, FSF, historického SPDX ID
a výjimky vycházejí přímo z katalogu.

[Doplňková data](../../data/catalog-editorial.json) obsahují výsledek rešerše
pro každé z 25 konkrétních SPDX ID. Publikovaná fakta mají název a adresu
pramene i místo, kde je tvrzení možné ověřit. Datum schválení je samostatné
od vydání znění. Pro data zařazení do SPDX zatím žádný doklad nepublikujeme.
Odkaz na variantu `only` / `or-later` zachovává stejné datum vydání znění, ale
upozorňuje na odlišný identifikátor v licenčním oznámení.

Po změně zdroje použijte `npm run data:profiles:check`. Pokud se změní otisk
záznamu, `data:validate` a `data:runtime:check` vyžadují revizi konkrétního
doplňku. Zkontrolujte znovu citovaná ustanovení a případnou vazbu na sousední
SPDX ID před změnou `textHash`. Při změně či nedostupnosti externího dokladu
ověřte datum a lokátor u vydavatele. Nejasné pole vynechte a důvod uveďte v
`research`. Po revizi spusťte `npm run data:runtime:write` a `npm run check`.

## Pokrytí

| Dávka | Položky | Doložené vydání | Vydavatel | Účel | Shrnutí | Verzová vazba |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| První sada | 20 licencí | 17 | 17 | 20 | 20 | 16 |
| Navazující sada | 4 licence, 1 výjimka | 5 | 5 | 4 | 5 | 4 |
| Součet | 24 licencí, 1 výjimka | 22 | 22 | 24 | 25 | 20 |

Alespoň jeden veřejný tag má 578 ze 727 licencí (79,5 %). Výjimky používají
stavovou značku „Výjimka“. Po druhé dávce má účel 24 ze 727 licencí a vydání
21 ze 727 (2,9 %) plus jedna z 84 výjimek.

| Příklad | Očekávané tagy a hranice |
| --- | --- |
| Apache-2.0 | Permisivní, Patentové oprávnění, Zachovat oznámení. Samotná distribuce nevyžaduje poskytnutí zdrojů. |
| MIT | Permisivní, Zachovat oznámení, Software. Rok a vydavatel nedoloženy. |
| GPL-3.0-only / or-later | Silný copyleft, Zdrojový kód při distribuci objektové podoby, Software. Shodné vydání znění. |
| LGPL-2.1-only | Knihovní copyleft, zdroje při distribuci binární knihovny. Pro linkovaná díla platí jiné možnosti v §6. |
| MPL-2.0 | Souborový copyleft. Při distribuci spustitelného kódu se zdrojová povinnost týká souborů krytých MPL. |
| AGPL-3.0-only | Síťový copyleft, zdroje při distribuci i síťové interakci. §13 vyžaduje upravenou verzi a vzdálenou interakci s ní. |
| CC-BY-SA-4.0 | Sdílení za stejných podmínek, Dokumentace a média, Data. |
| Neúplný profil | Neznámé či nedoložené pole a zastaralý profil nevytvářejí odvozený tag. |
| GCC-exception-3.1 | Samostatný typ výjimky, vlastní datum a příklad vazby na GPLv3. Bez vlastností převzatých z GPL. |

První sada pokrývá Apache-2.0, MIT, BSD-2-Clause, BSD-3-Clause, dvojice
GPL-2.0, GPL-3.0, LGPL-2.1, LGPL-3.0 a AGPL-3.0, MPL-2.0, EUPL-1.2,
CC-BY-4.0, CC-BY-SA-4.0, CC0-1.0 a OFL-1.1. U MIT a obou šablon BSD zůstalo
nedoložené vydání i vydavatel. Změna pro kód Berkeley z roku 1999 nedatuje
přesné generické znění SPDX. U těchto tří šablon a CC0-1.0 nedokládáme
příbuznou verzi. U Apache je schválení ASF 21. ledna 2004, znění je datované
pouze měsícem. U EUPL je rozhodnutí z 18. května 2017 a vydání v Úředním
věstníku z 19. května 2017. Pozdější přehled Creative Commons obsahuje
rozporný údaj 2014, proto pro sadu 4.0 používáme datované oznámení z
25. listopadu 2013 a [časovou osu CC](https://wiki.creativecommons.org/wiki/4.0).
U CC0 odlišujeme zahájení programu v roce 2007 a vydání verze 1.0 v roce 2009.

Druhá dávka zahrnuje CC-BY-NC-4.0, CC-BY-NC-SA-4.0, CC-BY-ND-4.0 a
CC-BY-NC-ND-4.0. Zdrojem data je dobové oznámení Creative Commons a pro
podmínky platí §2 až §4 příslušného znění. Pátá položka, GCC-exception-3.1,
má datum 31. března 2009 z vlastní hlavičky. Lednové oznámení FSF zmiňuje
první vydání výjimky, proto jej nepoužíváme pro revizi 3.1. U GCC-exception-3.1
nemáme doloženou vazbu na předchozí SPDX výjimku v katalogu. Účelové tagy
klasifikujeme pro licence. Druhá dávka nemá samostatná data schválení ani
zařazení do SPDX. Doklady jsou v jednotlivých kartách kurátorovaného souboru.

## Další kurace

1. Software a dokumentace. Prověřit Apache-1.1, GPL-1.0-only,
   GPL-1.0-or-later, LGPL-2.0-only, LGPL-2.0-or-later, MPL-1.1,
   EUPL-1.1, GFDL-1.3-only a GFDL-1.3-or-later.
2. Data, písma a hardware. Prověřit ODbL-1.0, PDDL-1.0, ODC-By-1.0,
   OFL-1.0 a CERN-OHL-P-2.0, CERN-OHL-W-2.0, CERN-OHL-S-2.0.
3. Výjimky a staré identifikátory. Prověřit LLVM-exception, Classpath-exception-2.0
   a GPL-2.0-with-classpath-exception. U historie oddělit vydání znění od doby,
   kdy bylo použito v konkrétním projektu nebo zařazeno do SPDX.

Při 2,9% pokrytí licencí datem vydání by řazení celého katalogu dávalo převážně
neznámé výsledky. Po dalších dávkách znovu změřit pokrytí celého katalogu a
výchozích skupin. Podle zpětné vazby ověřit užitečnost volby „Jen s doloženým
vydáním“ a řazení známých dat. Pro řazení zachovat přesnost a viditelně
odlišit odhadované pořadí v rámci roku.
