# OSL-2.1 — obsahová revize

Open Software License 2.1

Revize: **2026-09-09** · pravidlo **2026-09-09.10**.

Výsledek: **zpracována, nezařazena do průvodce**.

OSL 2.1 vyžaduje OSL pro distribuovaný originál i odvozeniny. Externí nasazení odvozeniny, včetně síťové aplikace pro osoby mimo definované You, se počítá jako distribuce a licence musí být nabídnuta všem. Poskytovatel dodává zdroje svého originálu nebo repozitář po dobu vlastní distribuce; toto pravidlo přebírá i poskytovatel odvozeného díla pod OSL. Zdroje odvozenin zachovávají notices a označují změnu. Distribuce také vyžaduje přiměřené úsilí získat výslovný souhlas příjemců. Záruka původu autorských a patentových práv zůstává vedle ostatních výluk.

## Předmět a rozsah

Original Work s notice OSL2.1 hned po copyrightu a odvozená díla. You zahrnuje jednotlivce/právnickou osobu i subjekty pod stejným ovládáním podle §14; externí nasazení §5 se posuzuje vůči této skupině, nikoli vůči jednotlivému zaměstnanci.

## Udělená práva

§1 celosvětově, bez royalty, nevýhradně, trvale a sublicencovatelně povoluje kopie, odvozeniny, veřejnou distribuci, předvádění a zobrazování. §2 stejně konstruuje patentový grant k nárokům vlastněným/ovládaným poskytovatelem a uskutečněným v jím dodaném originálu, pro výrobu, užití, prodej a nabídku originálu a odvozenin. §15 doplňuje ostatní užití neomezená licencí nebo právem.

## Podmínky a spouštěče

§1(c) distribuovaný originál i odvozeniny pod OSL. §3 zavazuje Licensor k preferované strojově čitelné formě originálu a dostupné dokumentaci úprav; alternativně levně/pohodlně dostupný repozitář po dobu vlastní distribuce s adresou po copyrightu. Při licencování odvozeniny pod OSL vzniká jeho poskytovateli odpovídající zdrojový závazek. §5 definuje External Deployment široce, ale vlastní distribuční fikci výslovně váže na Derivative Work, který musí být licencován všem pod OSL. §6 zachovává ve zdrojích odvozenin copyright/patent/známky/licenční a Attribution Notices a výrazně označuje změnu; §9 úsilí o výslovný souhlas.

## Omezení, výjimky a ukončení

§4 zakazuje propagační užití jmen/známek bez písemného souhlasu a vyhrazuje ostatní IP. §7 zaručuje původ/licenční oprávnění copyrightu i patentů, ostatní záruky vylučuje. §8 výluka odpovědnosti má zákonnou výjimku smrti/újmy z nedbalosti a kogentních jurisdikcí. §9 okamžitě ukončuje práva při porušení §1(c). §10 ruší celou licenci při patentové žalobě včetně protižaloby proti poskytovateli či libovolnému příjemci kvůli originálu, avšak vyjímá kombinace s jiným SW/HW. §§11–12 upravují fórum/právo místa poskytovatele, bez CISG, a náklady úspěšné strany.

## Verze a kombinování

§1(c) neobsahuje obecnou výjimku pro přelicencování odvozenin jinou licencí; §4 dovoluje samotnému poskytovateli jiné podmínky k vlastním právům. Síťová povinnost §5 této verze se výslovně aktivuje externím nasazením odvozeniny; nelze ji bez poznámky rozšířit na pouhé externí užití nezměněného originálu. Text nenabízí automatickou volbu pozdější verze.

## Překážky a navazující práce

- §9 vyžaduje při distribuci originálu či odvozeniny přiměřené úsilí získat výslovný souhlas příjemců s OSL. Tento závazek, relevantní i při External Deployment odvozeniny považovaném §5 za distribuci, není pouhé přiložení licence; je nutné doplnit model získání souhlasu před doporučením.

## Metadata a jejich doložení

| Pole | Hodnota | Doložení znění |
|---|---|---|
| family | "network-copyleft" | public/data/licenses/OSL-2.1.json#text; §1(c) povinná OSL u distribuovaných odvozenin a §5 distribuční fikce externího nasazení odvozeniny včetně sítě tvoří síťový copyleft; https://spdx.org/licenses/OSL-2.1.html |
| copyleftScope | "network" | public/data/licenses/OSL-2.1.json#text; §5 dopadá na odvozeninu dostupnou komukoli mimo §14 You, včetně síťové aplikace; není to souborová/knihovní hranice a operativní věta nepostihuje beze změny originál; https://spdx.org/licenses/OSL-2.1.html |
| permissions | ["commercial-use","distribution","modifications","patent-grant","private-use","sublicensing"] | public/data/licenses/OSL-2.1.json#text; §§1–2 trvalý sublicencovatelný autorský a omezený patentový grant, §15 další neomezené způsoby použití; https://spdx.org/licenses/OSL-2.1.html |
| obligations | ["disclose-source","include-copyright","include-notice","mark-modifications","network-use-disclose","same-license","unknown"] | public/data/licenses/OSL-2.1.json#text; §1(c) stejná OSL, §3 zdrojový závazek Licensor originálu/alternativní repozitář, §5 externě nasazená odvozenina jako distribuce, §6 zachované zdrojové notices a změna; §9 express assent chybí ve slovníku; https://spdx.org/licenses/OSL-2.1.html |
| triggers | ["distribution","modification","network-use","patent-claim","use"] | public/data/licenses/OSL-2.1.json#text; §1(c) distribuce, §6 vytvořené odvozeniny, §5 jakékoli externí užití odvozeniny včetně sítě, §10 patentová žaloba; §14 interní skupina You upřesňuje hranici; https://spdx.org/licenses/OSL-2.1.html |
| restrictions | ["additional-terms","liability","patent-claim","trademark","warranty"] | public/data/licenses/OSL-2.1.json#text; §4 jména/známky a ostatní IP, §7 pozitivní záruka původu s ostatními výlukami, §8 výjimky odpovědnosti, §§1(c),9 povinné OSL a ukončení, §10 patentová odveta; https://spdx.org/licenses/OSL-2.1.html |
| patentPosition | "retaliatory-termination" | public/data/licenses/OSL-2.1.json#text; §2 výslovný patentový grant jen pro nároky uskutečněné v dodaném originálu; §10 ruší vše při žalobě proti Licensor nebo any licensee, kromě žaloby týkající se kombinace s dalším SW/HW; https://spdx.org/licenses/OSL-2.1.html |
| noticeBurden | "material" | public/data/licenses/OSL-2.1.json#text; §6 několik druhů zdrojových notices a prominentní oznámení změny, §3 případná adresa repozitáře za copyrightem; §9 vyžaduje aktivní přiměřené úsilí o souhlas; https://spdx.org/licenses/OSL-2.1.html |

## Zdroje

- [Primární zdroj](https://spdx.org/licenses/OSL-2.1.html) — Individuálně přečten celý připnutý SPDX text; §1(c) povinná OSL u distribuovaných odvozenin a §5 distribuční fikce externího nasazení odvozeniny včetně sítě tvoří síťový copyleft
- [Kurátorovaný profil](../../../data/profiles/licenses/id-T1NMLTIuMQ.json)
- [Uložené úplné znění](../../../public/data/licenses/OSL-2.1.json)

## Otisk zdroje

```json
{
  "sourceId": "spdx-license-list",
  "revision": "manifest-sha256:74897699de0d23c4da42b94bf46bc6fd01f7b68ffcece9db1a98194ac277bb02",
  "contentHash": "sha256:b5527e74a3f14722b9791f27302aa188a72cf94537d61d5b80c32b345db63e2c"
}
```
