# copyleft-next-0.3.0 — obsahová revize

copyleft-next 0.3.0

Revize: **2026-09-09** · pravidlo **2026-09-09.10**.

Výsledek: **zpracována, nezařazena do průvodce**.

copyleft-next0.3.0 standardně požaduje licenci celého odvozeného díla, zachování relevantních právních notices a u objektového kódu bezplatné zdroje přes URL; fyzický produkt má dvouletou dostupnost nebo může zdroje přímo obsahovat. Lze dodatečně nabídnout GPL včetně AGPL. Tyto distribuční povinnosti však zanikají při určité placené proprietární nabídce poskytovatele nebo po15 letech od jeho první distribuce. Patentová žaloba ukončuje grant s výjimkami, ale potřebné kopírování pro samotný běh zůstává neukončitelné.

## Předmět a rozsah

My Work a Derived Work vyžadující autorské svolení; výjimkou je mere aggregation, pouhá reprodukce a pouhý odkaz na originál, pokud originál výslovně neříká jiné očekávání. Separate Work je samostatné nezávislé dílo nikoli přirozené rozšíření, a/nebo runtime/standardní knihovna či obdobná sestavovací komponenta (§15).

## Udělená práva

§1 poskytuje nevýhradná celosvětová trvalá bezplatná neodvolatelná autorská a patentová práva, podmíněná dalšími oddíly a ukončením. Patenty zahrnují nynější/budoucí bez royalty licencovatelné nároky nutně porušované výrobou/užitím/prodejem My Work, nikoli nároky vznikající jen další změnou. §3 umožňuje dodatečnou GPL alternativu, definovanou včetně AGPL; §11 umožňuje pozdější copyleft-next, pokud poskytovatel výslovně možnost neodebere.

## Podmínky a spouštěče

§2 informuje, jak získat licenci, a zachovává relevantní copyright/licenční notices/texty/autorství; Legal Notices vylučují loga, obrázky, známky a legendy. §3 vyžaduje celý derivativ pod touto licencí s výrazným notice, nelze obejít dělenou distribucí. §5 objektový kód doprovází URL s bezplatnými Corresponding Source; fyzické produkty vyžadují dostupnost dva roky od poslední vlastní distribuce produktu, alternativně přímo přístupně přiložené zdroje bez URL. Zdroj zahrnuje preferovanou formu, potřebné generovací skripty/instrukce a identifikovaný seznam samostatných sestavovacích/instalačních děl včetně verzí. §6 patch výslovně určený poskytovateli bez vlastních podmínek přebírá tuto licenci v rozsahu vlastního copyrightu.

## Omezení, výjimky a ukončení

§4 zakazuje další restrikce i z vnějších smluv/soudních příkazů s popsanou historickou výjimkou jiných licencí. §7 ruší §§2–5 při určité poskytovatelově placené nabídce a §8 po15 letech; ostatní oddíly zůstávají. §10 umožňuje nápravu do30 dnů od zjištění porušení, ale žaloba na patent proti jakékoli části My Work ukončuje grant bez této cesty; vyjímá deklaratorní žaloby, protižaloby a křížové žaloby. Ukončení platí i pro později získané kopie, ne však pro nutné kopie jen k běhu; downstream práva přežívají. §§12–13 vylučují záruky a škody v mezích zákona, §1 neuděluje jména ani známky.

## Verze a kombinování

§3 nabízí příjemci buď copyleft-next, nebo dodatečně udělenou GPL/AGPL bez zde fixované verze. §4 pro kombinované materiály vyžaduje splnit jinou licenci a její současné OSI+FSF uznání k2013-05-16, zatímco §7 placenou výjimku testuje odlišně. §11 later version je výchozí možnost, kterou může poskytovatel výslovně odebrat. §9 poskytuje příjemci přímou licenci od původního poskytovatele; §5 mu výslovně dává vymahatelné právo třetího beneficienta pouze na zdroje.

## Překážky a navazující práce

- §§7–8 odstraňují celé podmínky §§2–5 podle nabídky placené proprietární varianty a po15 letech od první distribuce My Work pod touto licencí. Statický profil neumí přepnout notices/copyleft/zdroje podle těchto událostí; je nutné modelovat čas a obchodní nabídku konkrétního poskytovatele, nikoli použít datum vydání licence2013-05-16 jako datum začátku lhůty.
- §4 dovoluje začleněné licence jen pokud byly zároveň OSI-Approved a FSF-Free k vydání této verze; §7 používá odlišnou disjunkci OSI nebo FSF či číslovaný copyleft-next. Před automatickou kombinací či vyhodnocením zániku podmínek je potřebný verzovaný historický registr a odlišení obou testů, nikoli dnešní příznaky SPDX.

## Metadata a jejich doložení

| Pole | Hodnota | Doložení znění |
|---|---|---|
| family | "strong-copyleft" | public/data/licenses/copyleft-next-0.3.0.json#text; §3 standardně vyžaduje celý Derived Work pod licencí; §§7–8 tento režim později ruší, proto family zachycuje výchozí silný copyleft s konkrétním blockerem dynamiky; https://spdx.org/licenses/copyleft-next-0.3.0.html |
| copyleftScope | "whole-work" | public/data/licenses/copyleft-next-0.3.0.json#text; §3 entire Derived Work as a whole i při oddělené distribuci částí; §15 výjimky agregace, prosté reprodukce a pouhého odkazu bez opačného očekávání; https://spdx.org/licenses/copyleft-next-0.3.0.html |
| permissions | ["commercial-use","conditional-relicensing","distribution","modifications","patent-grant","private-use"] | public/data/licenses/copyleft-next-0.3.0.json#text; §1 široká autorská a patentová práva; §§3,15 GPL zahrnuje GNU GPL i Affero; §11 pozdější copyleft-next, pokud poskytovatel výslovně neodebere tuto možnost; https://spdx.org/licenses/copyleft-next-0.3.0.html |
| obligations | ["include-copyright","include-notice","preserve-combined-license-terms","provide-corresponding-source","same-license","unknown"] | public/data/licenses/copyleft-next-0.3.0.json#text; §§2–6 notices, celý derivativ a Corresponding Source s URL NEBO přiložením u fyzických produktů; §4 zachování začleněných podmínek; §§7–8 dynamický zánik §§2–5 nemá model; https://spdx.org/licenses/copyleft-next-0.3.0.html |
| triggers | ["combination","distribution","modification","patent-claim","unknown"] | public/data/licenses/copyleft-next-0.3.0.json#text; §§2–6 distribuční/příspěvkové a kombinační podmínky, §10 zahájení patentové žaloby s výjimkami; §7 nabídka placené varianty a §8 čas nejsou žádným stávajícím triggerem; https://spdx.org/licenses/copyleft-next-0.3.0.html |
| restrictions | ["additional-terms","liability","patent-claim","trademark","warranty"] | public/data/licenses/copyleft-next-0.3.0.json#text; §4 zákaz dalších restrikcí včetně soudních/smluvních s historickou výjimkou, §1 známky, §§12–13 výluky a §10 patentové ukončení se zachováním minimálního běhu; https://spdx.org/licenses/copyleft-next-0.3.0.html |
| patentPosition | "retaliatory-termination" | public/data/licenses/copyleft-next-0.3.0.json#text; §§1(b),15 nutně porušené nyní/budoucnu licencovatelné patenty, ne pouze další modifikace; §10 ruší grant za patentovou žalobu, vyjímá declaratory/counter/cross-claims; https://spdx.org/licenses/copyleft-next-0.3.0.html |
| noticeBurden | "material" | public/data/licenses/copyleft-next-0.3.0.json#text; §2 relevantní Legal Notices bez grafiky/známek, §3 prominentní licenční notice a §5 specifická zdrojová URL; §§7–8 mohou celý tento režim odstranit; https://spdx.org/licenses/copyleft-next-0.3.0.html |

## Zdroje

- [Primární zdroj](https://spdx.org/licenses/copyleft-next-0.3.0.html) — Individuálně přečten celý připnutý SPDX text; §3 standardně vyžaduje celý Derived Work pod licencí; §§7–8 tento režim později ruší, proto family zachycuje výchozí silný copyleft s konkrétním blockerem dynamiky
- [Kurátorovaný profil](../../../data/profiles/licenses/id-Y29weWxlZnQtbmV4dC0wLjMuMA.json)
- [Uložené úplné znění](../../../public/data/licenses/copyleft-next-0.3.0.json)

## Otisk zdroje

```json
{
  "sourceId": "spdx-license-list",
  "revision": "manifest-sha256:74897699de0d23c4da42b94bf46bc6fd01f7b68ffcece9db1a98194ac277bb02",
  "contentHash": "sha256:ca8fa1fc1443e76390670e9a2a4c9db7efa58ee364ff778a6ca80aa489ec7328"
}
```
