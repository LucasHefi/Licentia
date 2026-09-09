# EPL-1.0 — obsahová revize

Eclipse Public License 1.0

Revize: **2026-09-09** · pravidlo **2026-09-09.10**.

Výsledek: **zpracována, nezařazena do průvodce**.

EPL1.0 zachovává Program a Contributions pod EPL ve zdrojové podobě. Vlastní objektová licence musí chránit ostatní přispěvatele výlukami, připsat odlišné podmínky pouze distributorovi a vysvětlit získání zdrojů. Samostatné moduly s vlastní licencí, které nejsou odvozeninou Programu, nejsou Contributions; text však nestanoví souborovou ani knihovní hranici. Komerční distributor odškodňuje ostatní za vlastní distribuční jednání kromě IP nároků. Patentová žaloba na samotný Program ukončuje jen patentový grant, nikoli automaticky autorskou licenci.

## Předmět a rozsah

Program tvoří původní kód a dokumentace a následné změny/doplňky pocházející od distributora či osob jednajících za něj. Contributor je každý distributor, Recipient každý příjemce. Oddělený modul je vyňat pouze při vlastní licenci A současné absenci odvozenosti od Programu (§1).

## Udělená práva

§2(a) uděluje z každé Contribution celosvětově bez royalty nevýhradná autorská práva ke kopiím, odvozeninám, veřejnému zobrazení/provádění, distribuci a sublicencím ve zdroji i objektu. §2(b) grant nutných licencovatelných patentů zahrnuje Contribution a kombinaci s Program jen k okamžiku jejího přidání; nekryje jiné kombinace ani hardware per se. §3 dovoluje vlastní objektovou licenci při podmínkách, §7 novější steward verzi. §2(d) obsahuje znalostně omezené prohlášení dostatečných copyrightových práv.

## Podmínky a spouštěče

§3 při vlastních objektových podmínkách vyžaduje účinné výluky všech záruk a škod jménem všech přispěvatelů, uvedení původu odlišných ustanovení pouze od daného distributora a oznámení dostupnosti zdrojů Programu s rozumným obvyklým způsobem získání. Zdroje mají EPL a její celý text s každou kopií. Copyrighty se nemění ani neodstraňují a původce každého příspěvku musí být rozumně identifikovatelný. §4 komerční nabídka zavazuje distributora bránit/odškodnit ostatní v rozsahu vlastních jednání a opomenutí, s výjimkou IP nároků; chráněný přispěvatel musí včas písemně oznámit nárok, předat vedení obrany a spolupracovat.

## Omezení, výjimky a ukončení

§§2(c),5,6 vylučují garance neporušení cizích IP, záruky a škody kromě výslovných závazků; příjemce si obstará potřebná cizí práva. §7 patentová žaloba včetně cross/counterclaim proti kterémukoli subjektu, že samotný Program bez kombinací porušuje příjemcův patent, ukončí jen §2(b). Podstatné nenapravené porušení po přiměřené době od zjištění ukončí všechny granty a vyžaduje ukončit použití/distribuci, ale vlastní závazky i dříve udělené licence přežívají. Text volí New York a federální IP právo USA, omezuje smluvní žaloby na rok od vzniku důvodu a vzdává se poroty. §7 vyhrazuje veškerá další IP práva včetně známek.

## Verze a kombinování

Zdrojová EPL a vlastní objektové podmínky jsou rozdílné režimy; druhý nemění první. §7 dovoluje vždy původně přijatou verzi a volitelně novou vydanou stewardem, původně Eclipse Foundation, která může správu předat. Tato EPL1.0 neobsahuje mechanismus Secondary Licenses ani definici Modified Works z EPL2.0 a sama není důkazem GPL kompatibility.

## Překážky a navazující práce

- §1 definuje Program jako Contributions a vyjímá jen samostatné moduly pod vlastní licencí, které současně nejsou odvozeninou Programu. Tato komponentová hranice slabého copyleftu není hranicí souboru ani definované knihovny a dostupný copyleftScope ji nemá. Před doporučením je nutné modelovat Program/Contributions a tuto výjimku; nelze sem přenášet definici Modified Works ani jiné výjimky EPL2.0.

## Metadata a jejich doložení

| Pole | Hodnota | Doložení znění |
|---|---|---|
| family | "weak-copyleft" | public/data/licenses/EPL-1.0.json#text; §§1,3: zdrojový copyleft Programu s výjimkou samostatných nederivativních modulů s vlastní licencí a možností vlastní objektové licence; slabý copyleft; https://spdx.org/licenses/EPL-1.0.html |
| copyleftScope | "unknown" | public/data/licenses/EPL-1.0.json#text; §1 Program/Contributions a dvojí podmínka výjimky separate modules + not derivative works tvoří komponentový rozsah, nikoli výslovnou file/library hranici; potřeba unknown; https://spdx.org/licenses/EPL-1.0.html |
| permissions | ["commercial-use","conditional-relicensing","distribution","modifications","patent-grant","private-use","sublicensing"] | public/data/licenses/EPL-1.0.json#text; §2(a) sublicencovatelný source/object copyright, §2(b) omezený patentový grant, §3 vlastní objektové podmínky a §7 novější steward verze; https://spdx.org/licenses/EPL-1.0.html |
| obligations | ["defend-commercial-distribution","disclose-source","include-copyright","include-license-text","include-notice","pass-disclaimer-requirement","same-license"] | public/data/licenses/EPL-1.0.json#text; §3 zdroje pod EPL s celým textem, copyrighty, identita původce a objektová výluka/zdrojové oznámení; §4 obrana a indemnita komerčního distributora s výjimkou všech IP nároků; https://spdx.org/licenses/EPL-1.0.html |
| triggers | ["combination","distribution","modification","patent-claim"] | public/data/licenses/EPL-1.0.json#text; §3 distribuční source/object režimy a označení příspěvku, §4 začlenění do komerční nabídky, §2(b) patentový rozsah kombinace a §7 patentová žaloba; síťová interakce sama nic nespouští; https://spdx.org/licenses/EPL-1.0.html |
| restrictions | ["additional-terms","liability","patent-claim","trademark","warranty"] | public/data/licenses/EPL-1.0.json#text; §§5–6 výluky kromě výslovných závazků včetně §4; §3 povinné EPL a ochrana ostatních před vlastními podmínkami, §7 IP výhrada a patentová odveta; https://spdx.org/licenses/EPL-1.0.html |
| patentPosition | "retaliatory-termination" | public/data/licenses/EPL-1.0.json#text; §2(b) Contribution/Program kombinace k přidání, bez dalších kombinací/hardware; §7 žaloba na samotný Program ukončuje pouze patentová práva2(b), ne copyright2(a); https://spdx.org/licenses/EPL-1.0.html |
| noticeBurden | "material" | public/data/licenses/EPL-1.0.json#text; §3 celý text ve zdrojích, nepozměněné copyrighty, dohledatelný původce a specifická objektová licence s účinnými disclaimery a informací o zdrojích; materiální požadavky; https://spdx.org/licenses/EPL-1.0.html |

## Zdroje

- [Primární zdroj](https://spdx.org/licenses/EPL-1.0.html) — Individuálně přečten celý připnutý SPDX text; §§1,3: zdrojový copyleft Programu s výjimkou samostatných nederivativních modulů s vlastní licencí a možností vlastní objektové licence; slabý copyleft
- [Kurátorovaný profil](../../../data/profiles/licenses/id-RVBMLTEuMA.json)
- [Uložené úplné znění](../../../public/data/licenses/EPL-1.0.json)

## Otisk zdroje

```json
{
  "sourceId": "spdx-license-list",
  "revision": "manifest-sha256:74897699de0d23c4da42b94bf46bc6fd01f7b68ffcece9db1a98194ac277bb02",
  "contentHash": "sha256:9353a70a1a0ac71fe0f6730c7a7234a326d31809256dec6c21391033a8965ef0"
}
```
