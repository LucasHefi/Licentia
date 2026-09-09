# APL-1.0 — obsahová revize

Adaptive Public License 1.0

Revize: **2026-09-09** · pravidlo **2026-09-09.10**.

Výsledek: **zpracována, nezařazena do průvodce**.

Adaptive Public License 1.0 je nastavitelný formulář pro software. Zachovává licenci pokrytého kódu, poskytování zdrojů binárek, předepsaná oznámení a zvláštní veřejnou dostupnost příspěvků. Vyplněné Exhibit A a případný suppfile.txt určují zejména třetí osoby, patenty, označování změn a atribuci při spuštění. Samotný obecný text proto nestačí pro doporučení konkrétní varianty; nevybrané patenty mají výchozí NO, nikoli automatický grant.

## Předmět a rozsah

Úvod výslovně varuje před určením práv z generického formuláře. §1.9/1.11 Initial Work a Subsequent Work obsahují zdroje, případný objekt a dokumentaci počítačového programu z Exhibit A Part 2. §1.7 Independent Module musí být neodvozený a nepřevzatý, navíc se jím nestane vložený modul, reference jiná než function/class call ani modul povinně ve stejném adresáři/podadresáři kódu. §1.18/3.6 jej vyjímají, §3.7 odděluje jiný kód Larger Work. Tato komponentová a adresářová hranice není totožná se souborem, knihovnou ani celým produktem.

## Udělená práva

§2.1 původní i následný přispěvatel uděluje celosvětové bezroyalty copyright oprávnění reprodukce, odvozenin, display/performance, distribuce a sublicence zdrojů i Executable. §3.5 výslovně soukromé interní změny; §4.1 komerční služby, ale cena distribuce je omezena na fyzické náklady. §2.2/Exhibit A Part 6 nejsou bezpodmínečný patentový grant: nevybrané YES znamená NO. Jen vybrané YES začlení A–E s patenty původce, následného přispěvatele i distributora, vyjmutím smazaného/cizího kódu a samostatně mimo dodané verze. §2.3 obstarání případných cizích IP práv zůstává příjemci, §2.4 jiná práva včetně známek nejsou udělena.

## Podmínky a spouštěče

§3.1(a) Subsequent Contributor, tedy až osoba šířící příspěvek Third Party, zpřístupní Subsequent Work veřejně elektronicky na nejméně 12 měsíců, počínaje rozumně po vzniku a nejpozději 60 dnů po první distribuci. §3.1(b) každá distribuovaná kopie nese license.txt s Exhibit A i doprovodným suppfile.txt; License Notice začíná zdrojové soubory a je viditelné uživateli Executable. §3.2 binárka nese zdroje na stejném médiu/elektronicky NEBO nejméně 36měsíční písemnou nabídku každé třetí straně za fyzické náklady a elektronickou dostupnost zdrojů po tuto dobu. §1.16 zahrnuje moduly/komponenty, rozhraní a build/install skripty. §3.3 stejná licence všech zdrojových distribucí a cena nanejvýš fyzických nákladů; §3.4 strukturálně nutné náhradní umístění notice. §3.5 interní změny nemusí být vydány, ale jejich distribuce jakékoli osobě nese licenci a předání Third Party aktivuje §§3.1–3.4.

## Omezení, výjimky a ukončení

§3.8 dokumentování změn vzniká jen dle suppfile.txt Part 1; při jeho absenci není povinné a příklad Exhibit A Part 7 je výslovně dobrovolný. Starší příjemce si může ponechat stará pravidla nebo přijmout nová; dokumentace nesmí měnit grant, vést k zániku licence ani náhradě škody. §3.10 jen vyplněné Part 2 může vyžadovat atribuci při každém spuštění, případně i závislého programu, a na začátku zdrojů: nejvýše copyright/jméno, fráze do 10 slov, jeden obrázek a URL. Bez obsahu Part 2 atribuce nevzniká. §3.9 jméno distributora není k propagaci bez souhlasu. §4.1 přidané služby jen vlastním jménem, nesmějí odepřít zdroje/binárky; §4.2 obrana/odškodnění ostatních distributorů a následných přispěvatelů za vlastní komerční distribuční či servisní jednání, mimo IP claims, s rychlou písemnou výzvou, kontrolou/spoluprací obrany a možností účasti poškozeného na jeho náklady. §§6/8 záruky a odlišná liability původce oproti příjemcům, výjimka neprominutelné smrti/zranění z nedbalosti. §7 podstatné porušení s 60 dny od vědomosti, cross-default ostatních kopií licence, zánik všech práv příjemce a přežití řádných sublicencí.

## Verze a kombinování

§5.2 dovoluje starou verzi ponechat, ale po volbě nové platí pro všechna další vymezená nakládání. §2.2 rozlišuje dřívější Patents-Excluded kopie a budoucí Patents-Included; kombinace obou je od prvního užití/zpřístupnění/distribuce Patents-Included. Volitelná Part 6 E při patentové žalobě včetně counter/cross proti jinému Recipient o software ruší jím udělené copyright/patenty po 90 dnech přesné výzvy, pokud se žaloba nevezme zpět, a jen k právům uvedeným ve výzvě. Part 4 nabízí pět definic Third Party s různými vlastnickými/kontrolními výjimkami, při žádné/více volbách platí A. §9/Part 3 právo zvoleného místa, výchozí New York, nevýhradní soudy, roční lhůta, vzdání se jury a náklady vítězné strany; §10 CISG vyloučeno. Samotný SPDX identifikátor neurčuje výběry ani GPL kompatibilitu.

## Překážky a navazující práce

- Zavést parametrizované instance APL: vyplněné Exhibit A a doprovodný suppfile.txt určují Third Party, patenty, dokumentování a atribuci. Zachovat defaulty NO pro patenty, A pro žádnou/více definic Third Party a New York pro jurisdikci. Větve nesmí být sloučeny do jedné bezpodmínečné sady povinností či patentového grantu.
- Doplnit komponentový rozsah §1.7/1.18/3.6 včetně vložení, referencí a nutného adresáře/podadresáře. Samotná neodvozenost ani souborový/knihovní tag nedokládají výjimku Independent Module.
- Modelovat veřejnou elektronickou dostupnost Subsequent Work nejméně 12 měsíců s počátkem do 60 dnů od distribuce (§3.1), omezení ceny distribuce fyzickými náklady (§3.3/4.1) a 36měsíční zdrojovou nabídku. Před doporučením ověřit konkrétní role, výběry a historii kopií, zvláště přechod na Patents-Included při kombinování (§2.2).

## Metadata a jejich doložení

| Pole | Hodnota | Doložení znění |
|---|---|---|
| family | "weak-copyleft" | APL §3.2/3.3 vyžaduje zdrojové podmínky stejné licence pro Licensed Work; §1.18/3.6 vylučuje Independent Modules a §3.7 ponechává jiné části Larger Work samostatné. Slabá reciprocita je doložena, přesná komponentová hranice zatím chybí. |
| copyleftScope | "unknown" | APL §1.7 definuje Independent Module nejen neodvozeností, ale i embed/reference/directory podmínkami; §1.18/3.6/3.7 určuje hranici Licensed Work v kombinaci. Unknown znamená chybějící komponentový model se zvláštní adresářovou podmínkou, nikoli automaticky library nebo file. |
| permissions | ["commercial-use","distribution","modifications","private-use","sublicensing","unknown"] | APL §2.1 grants reproduction, derivative works, display/performance, distribution/sublicense pro zdroje/binárky; §3.5 interní použití a §4 komerční služby. Unknown zachovává výběr patentového grantu dle §2.2/Part 6, proto patent-grant není při prázdných polích tvrzen. |
| obligations | ["defend-added-warranty","defend-commercial-distribution","include-license-text","include-notice","provide-corresponding-source","same-license","unknown"] | APL §§3.1–3.4 license.txt/Exhibit A/suppfile.txt, umístění notice, source s binárkou nebo 36měsíční nabídka, stejná licence; §4.2 podmíněná obrana komerčních distribučních/servisních nároků. Unknown pro 12měsíční veřejnou dostupnost Subsequent Work a parametrizovaná pravidla §3.8/3.10; nevyplněný dobrovolný příklad Part 7 nevytváří mark-modifications ani povinnou atribuci. |
| triggers | ["combination","distribution","modification","unknown","use"] | APL §§3.1–3.5 distribuce/změny, viditelné notice uživatelům a §3.7 kombinace. Unknown uchovává zvolenou definici Third Party a podmíněné spuštění §3.10 či patentový spor Part 6 E. Síťový provoz sám není v obecném textu univerzálním zdrojovým spouštěčem. |
| restrictions | ["liability","trademark","unknown","warranty"] | APL §3.9 jména a §2.4 rezervace IP, §§6/8 záruky/liability s výjimkami. Unknown pro cenový limit distribuce §3.3/4.1, aktivní nároky a parametrizované zvláštní podmínky; známý zákaz cizího endorsementu nezastupuje cenový limit. |
| patentPosition | "unknown" | APL §2.2 a Exhibit A Part 6 mají default NO pokud YES není vybráno; v opačné variantě A–D výslovné granty a E odvetné ukončení copyrightu i patentů po 90denní kvalifikované výzvě s možností zpětvzetí. Obecný ID bez instance a historie kombinací nelze pro všechny kopie označit express-grant ani express-exclusion: unknown s doloženými oběma větvemi. |
| noticeBurden | "material" | APL §3.1(b) licence s přílohami, notice na začátku všech zdrojů a viditelné v binárce; §3.2 písemná nabídka/dostupnost zdrojů. Jde o materiální zátěž i bez volitelné atribuce či změnových záznamů v suppfile.txt. |

## Zdroje

- [Primární zdroj](https://opensource.org/license/APL-1.0) — Primární znění OSI potvrzuje adaptive upozornění, specifickou hranici Independent Module a rozlišení patentových variant podle vyplněné přílohy; schválení názvu samo neurčuje zvolené podmínky.
- [Primární zdroj](https://spdx.org/licenses/APL-1.0.html) — Úplný připnutý formulář APL-1.0 včetně Parts 1–7 byl samostatně přečten. Prázdné volby a výchozí NO/A/New York zůstávají popsány, žádná příloha ani patentové YES nebyly domyšleny.
- [Kurátorovaný profil](../../../data/profiles/licenses/id-QVBMLTEuMA.json)
- [Uložené úplné znění](../../../public/data/licenses/APL-1.0.json)

## Otisk zdroje

```json
{
  "sourceId": "spdx-license-list",
  "revision": "manifest-sha256:74897699de0d23c4da42b94bf46bc6fd01f7b68ffcece9db1a98194ac277bb02",
  "contentHash": "sha256:a264965a8361e3ef8baf3b2adbd275b0f937affa2f93ad163a4236dfba89443f"
}
```
