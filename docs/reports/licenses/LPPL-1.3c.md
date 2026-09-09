# LPPL-1.3c — obsahová revize

LaTeX Project Public License v1.3c

Revize: **2026-09-10** · pravidlo **2026-09-09.10**.

Výsledek: **zpracována, nezařazena do průvodce**.

LPPL 1.3c rozlišuje správce Current Maintainer od ostatních autorů změn. Ostatní mohou soukromě měnit a kompilovat; při šíření nahrazující odvozeniny musí zachovat rozpoznatelnou interaktivní identitu, popsat změny, neimplikovat cizí podporu a dodat originál nebo údaje k jeho získání. Příjemci kompilovaného derivátu dostávají Derived Work. Jiná licence smí zachovat jen podmínky§6; pro odvozeniny nezamýšlené jako náhrady odpadají§6b/6d. Režim správce, převzetí údržby a tyto alternativy dosud brání přesnému zařazení copyleftu.

## Předmět a rozsah

Preambule dovoluje jakékoli vlastní autorské dílo i mimo TeX. Work a Derived Work se odvozují od použitelného práva, distribuce zahrnuje přístup přes FTP/HTTP i sdílený souborový systém a část díla je podle§2 modifikací. Compiled Work je výsledek zpracování pro přímé užití v počítači; úprava instalačních prostředků je modifikací. Base Interpreter lze výslovně určit, jinak LaTeX-Format nebo pro jeho vlastní soubory TeX; externí komponenta není součástí interpretu, pokud se při interaktivním použití identifikuje. Current Maintainer je určená osoba, jinak copyright holder.

## Udělená práva

§1 běh ani nabídka podpory nejsou omezeny. §2 kompletní nezměněná kopie, §3 její kompilace jen s přesnou instalovatelností jako při vlastní kompilaci originálu. §4 správce smí neomezeně měnit/šířit včetně kompilace jako aktualizovanou verzi. §5 ostatní smí soukromě měnit a kompilovat, §§6,7 podmíněně šířit. Komerční cena není zakázána, patentový grant chybí. §10(a) výslovně dovoluje jinou licenci při zachování§6, nikoli blanket převod originálu pod libovolné podmínky.

## Podmínky a spouštěče

§6 u nesprávce pro každou komponentu kromě výjimky v copyright notice přidané pouze správcem: přímá náhrada se při interaktivním užití s Base Interpreter identifikuje jako změněná tam, kde se identifikoval originál; výrazný popis změn nebo odkaz na distribuovaný úplný přesný log; nesmí implikovat nepotvrzenou podporu kohokoli. Přiložit celý nezměněný Work NEBO dostatečné informace k jeho získání; při downloadu změněné komponenty postačí ekvivalentní přístup k originálu na stejném či podobném místě. §7 všem příjemcům kompilovaného derivátu dodat Derived Work a splnit§6. §8 výjimka pro přesnou aktualizaci komponenty na správcovu verzi, §9 alternativní formát povinnosti výsledku neobchází. §10(b) při JINÉ licenci derivát obsahuje dokumentaci umožňující příjemci plnit§6. Pro deriváty nezamýšlené jako náhrady§6b/6d výslovně neplatí. Aplikační návod žádá copyright/rok a licenční statement v komponentách; všeobecné přiložení celého textu licence není výslovně samostatně nařízeno.

## Omezení, výjimky a ukončení

AS-IS a široká výluka záruk, riziko oprav u uživatele; výluka škod má výjimku použitelného práva či písemné dohody. Samostatný mechanismus ukončení text neuvádí. Maintenance: author-maintained vyhrazuje správu držiteli; maintained znamená dostupného správce přijímajícího error reports, bez povinnosti je potvrdit/řešit. Po6měsících nedostupnosti bez dalších známek aktivity unmaintained. Převzetí dohodou nebo rozumné hledání, dotaz, měsíc pro aktualizaci kontaktu, komunitní oznámení a3měsíce bez námitek; dostupný správce/držitel může urychlit souhlasem a oznámením. Původní správce vrátivší se do3měsíců po převzetí podle3b/4 může žádat návrat při aktualizaci kontaktu do měsíce. Doporučení upravovat i soukromě podle distribučních pravidel není povinnost.

## Verze a kombinování

§11 neomezuje nesouvisející díla/agregace. §10 jiná licence musí sama respektovat§6, nikoli zbytek LPPL, což vylučuje jednoduchou trvalou same-license interpretaci. Převzetí správce samo licenci nemění. Vzor notice1.3-or-later není automatická volba každého Work; skutečné notice musí určit verzi a součásti. Bez jednoznačného seznamu smí příjemce rozumně usuzovat na rozsah Work. Odkazy cfgguide/modguide jsou doporučení a vysvětlení, ne neznámé další podmínky grantu. Vlastní odlišná licence může použít text jako vzor, ale nemá implikovat LPPL.

## Překážky a navazující práce

- §§3–7 a Maintenance rozlišují správce, přesnou instalovatelnost originální kompilace a interaktivní identitu náhrad s Base Interpreter; převzetí údržby vyžaduje dohledání osob, dotazy a komunitní oznámení s několika lhůtami. Model potřebuje tuto podmíněnou strukturu rolí, identifikace a převzetí, nikoli jen mark-modifications.
- §6(d) dovoluje originální celek NEBO informace k získání, §7 dodává Derived Work příjemcům kompilace, ale §10 dovoluje jinou licenci zachovávající jen§6. Oddíl Derived Works That Are Not Replacements navíc vypíná§6b/6d mimo náhradní účel. K určení scope je nutné modelovat tyto konkrétní cesty; nelze je zploštit na file/library/whole-work copyleft ani univerzální povinnost původních i nových zdrojů.

## Metadata a jejich doložení

| Pole | Hodnota | Doložení znění |
|---|---|---|
| family | "nonstandard" | public/data/licenses/LPPL-1.3c.json#text; §§4–7 rozdílné pravomoci správce/ostatních a §10 přelicencování s pouze§6; nonstandard, nikoli běžný souborový copyleft; https://spdx.org/licenses/LPPL-1.3c.html |
| copyleftScope | "unknown" | public/data/licenses/LPPL-1.3c.json#text; §§6(d),7,10 a výjimka nenahrazujících derivátů kombinují různé rozsahy a alternativy; žádná pevná file/library/whole-work hranice, unknown; https://spdx.org/licenses/LPPL-1.3c.html |
| permissions | ["commercial-use","conditional-relicensing","distribution","modifications","private-use"] | public/data/licenses/LPPL-1.3c.json#text; §§1–7 běh, komerční kopie, soukromé změny a podmíněné šíření; §10 explicitní conditional-relicensing; patenty neuvedeny; https://spdx.org/licenses/LPPL-1.3c.html |
| obligations | ["include-copyright","include-notice","mark-modifications","provide-corresponding-source","unknown"] | public/data/licenses/LPPL-1.3c.json#text; §6 notices/změny a originál NEBO informace, §7 Derived Work všem příjemcům kompilace; role, instalační a maintenance podmínky vyžadují unknown; https://spdx.org/licenses/LPPL-1.3c.html |
| triggers | ["distribution","modification","use"] | public/data/licenses/LPPL-1.3c.json#text; §§2–7 distribuce/modifikace, §6(a) interaktivní identita při použití náhrady s Base Interpreter; běh sám jinak§1 volný; https://spdx.org/licenses/LPPL-1.3c.html |
| restrictions | ["additional-terms","liability","unknown","warranty"] | public/data/licenses/LPPL-1.3c.json#text; §6(c) žádná nepravdivá podpora, §10 zachování podmínek§6, warranty section výluky; instalační/identitní/maintenance omezení mimo enumy; https://spdx.org/licenses/LPPL-1.3c.html |
| patentPosition | "none-stated" | public/data/licenses/LPPL-1.3c.json#text; Úplný grant §§1–12 ani Maintenance neobsahuje výslovné patenty či patentovou odvetu; https://spdx.org/licenses/LPPL-1.3c.html |
| noticeBurden | "material" | public/data/licenses/LPPL-1.3c.json#text; §6 komponentové změnové a interaktivní notices, dokumentace§10(b) a aplikační copyrighty tvoří materiální břemeno, s přesnými výjimkami; https://spdx.org/licenses/LPPL-1.3c.html |

## Zdroje

- [Primární zdroj](https://spdx.org/licenses/LPPL-1.3c.html) — Individuálně přečten celý připnutý SPDX text; §§4–7 rozdílné pravomoci správce/ostatních a §10 přelicencování s pouze§6; nonstandard, nikoli běžný souborový copyleft
- [Kurátorovaný profil](../../../data/profiles/licenses/id-TFBQTC0xLjNj.json)
- [Uložené úplné znění](../../../public/data/licenses/LPPL-1.3c.json)

## Otisk zdroje

```json
{
  "sourceId": "spdx-license-list",
  "revision": "manifest-sha256:74897699de0d23c4da42b94bf46bc6fd01f7b68ffcece9db1a98194ac277bb02",
  "contentHash": "sha256:46d4ae388784c9132c6d530ac469f54cee27c5216a9c6764ba3c8117c93eae93"
}
```
