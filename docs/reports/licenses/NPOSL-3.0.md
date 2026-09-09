# NPOSL-3.0 — obsahová revize

Non-Profit Open Software License 3.0

Revize: **2026-09-09** · pravidlo **2026-09-09.10**.

Výsledek: **zpracována, nezařazena do průvodce**.

Non-Profit OSL3.0 má síťový copyleft, ale pod touto variantou smí dále distribuovat jen nezisková organizace deklarující nulový příjem z díla, odvozenin, podpory i souvisejících služeb. Ostatní distributoři musí použít původní OSL3.0 a jasně to oznámit. Není to obecný zákaz komerčního užití. NPOSL neobsahuje záruku původu práv a vylučuje i přímé škody; přechod na OSL3.0 proto nesmí tyto rozdíly zamlčet. Zdrojové a atribuční povinnosti, externí nasazení a získávání souhlasu příjemců zůstávají podrobně stanoveny.

## Předmět a rozsah

Original Work výslovně označené Non-Profit OSL3.0 vedle copyrightu; §17(e) přikazuje toto rozlišení oproti původní OSL. Odvozeniny jsou vymezeny §1(b); kolektivní dílo samostatně §1(a). You podle §14 zahrnuje i ovládající/ovládané/společně ovládané subjekty.

## Udělená práva

§1 celosvětový bezplatný nevýhradní sublicencovatelný copyright po dobu práv pro kopie, změny, distribuci/sdělování a veřejné provádění/zobrazení. §2 uděluje po dobu patentů poskytovatelem vlastněné/ovládané nároky uskutečněné v dodaném originálu pro výrobu včetně have made, užití, prodej a import. §15 neomezuje další dovolené užití. §17(d) dovoluje a pro nesplňující distributory vyžaduje OSL3.0 alternativu; nelze naopak běžnou OSL3.0 přepnout na NPOSL.

## Podmínky a spouštěče

§1(c) distribuované/sdělované kopie pod NPOSL nebo povinnou alternativou §17(d). §3 poskytovatel dodává preferované zdroje a dostupné návody úprav, nebo je drží levně/pohodlně dostupné v repozitáři po dobu distribuce. §5 externí nasazení originálu i odvozenin pro osoby mimo You včetně sítě je distribuce. §6 ve zdrojích odvozenin zachovává copyright/patent/známkové/licenční a Attribution Notices a výrazně označuje změnu. §9 přiměřené úsilí o výslovný souhlas. §17(a),(d) pod NPOSL vyžaduje neziskovou deklaraci a nulový příjem z díla, změn, podpory i služeb; jinak celé sdělení/distribuce pod OSL3.0 s jasnými licenčními notices.

## Omezení, výjimky a ukončení

§§7,17(b) výslovně odstraňují provenanční záruku OSL3.0 a vylučují všechny záruky; §§8,17(c) přidávají k výluce i přímé škody s výjimkou nepominutelného práva. §4 neuděluje propagační jména/známky. §9 ukončuje grant nesplněním §1(c), ponechává fair use/fair dealing. §10 patentová žaloba proti poskytovateli či jakémukoli příjemci včetně proti/křížové žaloby ruší celou licenci, ale kombinace originálu s jiným SW/HW jsou vyňaty. §§11–12 volí právo a fórum místa poskytovatele bez CISG a náklady úspěšné strany.

## Verze a kombinování

Připnutou OSL3.0 jsem rovněž přečetl: nařízená alternativa §17(d) má vlastní provenanční záruku a odlišný seznam výluk škod, které NPOSL odstranila/rozšířila. Nelze tvrdit, že přechod zachovává všechny výluky NPOSL. §16 dovoluje jinak pojmenovaný upravený licenční text pouze pro jiná původní díla a pod uvedenými podmínkami včetně OSI schválení před open-source tvrzením; není to přelicencování této odvozeniny. Automatická later version uvedena není.

## Překážky a navazující práce

- §17(a),(d) vyžaduje deklaraci neziskového statusu a nulového příjmu z distribuce, podpory i služeb pro další NPOSL distribuci; jinak nařizuje přechod na OSL3.0 s novými notices. Model nemá tuto rolovou a příjmovou podmínku ani podmíněnou změnu záruk/odpovědnosti mezi oběma licencemi. Je třeba modelovat tuto větev, nikoli zakázat všechnu komerci nebo sloučit obě varianty.
- §9 nařizuje přiměřené úsilí získat výslovný souhlas příjemců; §5 zahrnuje externí nasazení originálu i odvozenin jako distribuci. Povinnost souhlasu není pokryta notice enumem a potřebuje samostatný model.

## Metadata a jejich doložení

| Pole | Hodnota | Doložení znění |
|---|---|---|
| family | "network-copyleft" | public/data/licenses/NPOSL-3.0.json#text; §§1(c),5 síťový copyleft s povinnou variantou OSL3.0 podle §17(d); nejedná se o obecnou nekomerční licenci; https://spdx.org/licenses/NPOSL-3.0.html |
| copyleftScope | "network" | public/data/licenses/NPOSL-3.0.json#text; §5 externí nasazení Original/Derivative Works kýmkoli mimo §14 You jako distribuce, včetně síťové aplikace; žádná file/library hranice; https://spdx.org/licenses/NPOSL-3.0.html |
| permissions | ["commercial-use","conditional-relicensing","distribution","modifications","patent-grant","private-use","sublicensing"] | public/data/licenses/NPOSL-3.0.json#text; §§1–2 autorský a patentový sublicencovatelný grant a §15 použití; §17(d) podmíněná/povinná OSL3.0 alternativa s výslovným zákazem opačného převodu z OSL na NPOSL; https://spdx.org/licenses/NPOSL-3.0.html |
| obligations | ["disclose-source","include-copyright","include-notice","mark-modifications","network-use-disclose","same-license","unknown"] | public/data/licenses/NPOSL-3.0.json#text; §3 zdroje/repozitář poskytovatele, §6 zdrojové notices/změny, §§1(c),5 copyleft; §9 express assent a §17(a),(d) deklarace role/příjmů a povinný přechod nejsou plně modelovány; https://spdx.org/licenses/NPOSL-3.0.html |
| triggers | ["distribution","modification","network-use","patent-claim","use"] | public/data/licenses/NPOSL-3.0.json#text; Distribuce/sdělování §1(c), externí užití/síť §5, změny §6 a patentová žaloba §10; §17 omezení deklarace se váže na distribuční roli, ne jakékoli komerční spuštění; https://spdx.org/licenses/NPOSL-3.0.html |
| restrictions | ["additional-terms","liability","patent-claim","trademark","unknown","warranty"] | public/data/licenses/NPOSL-3.0.json#text; §4 známky, §§7–8 výluky včetně direct damages bez provenanční záruky; §17(a),(d) role neziskové organizace a nulové příjmy s přepnutím licence vyžadují unknown restriction; https://spdx.org/licenses/NPOSL-3.0.html |
| patentPosition | "retaliatory-termination" | public/data/licenses/NPOSL-3.0.json#text; §2 omezený výslovný grant, §10 ruší celou licenci za patentovou žalobu proti Licensor/any licensee; kombinace s jiným softwarem/hardwarem vyjmuty; https://spdx.org/licenses/NPOSL-3.0.html |
| noticeBurden | "material" | public/data/licenses/NPOSL-3.0.json#text; §6 více zdrojových notices a prominentní změny, §17(d),(e) jasné rozlišení NPOSL a povinné OSL3.0 alternativy; §9 aktivní souhlas nad běžný notice; https://spdx.org/licenses/NPOSL-3.0.html |

## Zdroje

- [Primární zdroj](https://spdx.org/licenses/NPOSL-3.0.html) — Individuálně přečten celý připnutý SPDX text; §§1(c),5 síťový copyleft s povinnou variantou OSL3.0 podle §17(d); nejedná se o obecnou nekomerční licenci
- [Kurátorovaný profil](../../../data/profiles/licenses/id-TlBPU0wtMy4w.json)
- [Uložené úplné znění](../../../public/data/licenses/NPOSL-3.0.json)

## Otisk zdroje

```json
{
  "sourceId": "spdx-license-list",
  "revision": "manifest-sha256:74897699de0d23c4da42b94bf46bc6fd01f7b68ffcece9db1a98194ac277bb02",
  "contentHash": "sha256:2bb90ffe04bd782958663f2829b1e54410b42c1a4fe965a41bb39a84ddabb9f1"
}
```
