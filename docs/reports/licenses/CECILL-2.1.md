# CECILL-2.1 — obsahová revize

CeCILL Free Software License Agreement v2.1

Revize: **2026-09-09** · pravidlo **2026-09-09.10**.

Výsledek: **zpracována, nezařazena do průvodce**.

CeCILL 2.1 vyžaduje stejnou licenci upraveného softwaru včetně interních modulů běžících v témže adresním prostoru. Nezměněné i upravené binárky vyžadují účinný přístup k úplným zdrojům nejméně tři roky od distribuce. Výslovně dovoluje vymezené kombinace s GPL2+, AGPL3+ a EUPL1.1+. Zbývá modelovat patentový závazek nevymáhání s jeho předáním nabyvatelům a další aktivní povinnosti poskytovatele i příjemce.

## Předmět a rozsah

Čl.1 zahrnuje software v source/object formě a dokumentaci, Contributions včetně Internal Modules v témže adresním prostoru. External Module je neodvozený, běží odděleně a volá se se softwarem; §5.3.3/6.3 dovoluje jeho vlastní licenci. Oproti1.1 není hranicí jen statický link/jeden executable: interní je každý takto připojený modul ve stejném adresním prostoru.

## Udělená práva

Čl.2 a5 udělují převoditelná nevýlučná celosvětová práva po dobu ochrany; §5.1 kopie, loading/display/run/storage a pozorování/studium/testování bez oborového omezení; §5.2 změny; §5.3 šíření a prodej. Čl.5 poskytovatele zavazuje nevymáhat nynější i budoucí patenty na funkce softwaru/komponent vůči následným užívajícím, využívajícím a modifikujícím příjemcům a zajistit převzetí závazku nabyvateli patentů. To je jiný právní mechanismus než výslovný patentový grant1.1; slovník jej dosud neumí. Obecné sublicencování ani síťové zveřejnění zdrojů se z práv k distribuci nevyrábí.

## Podmínky a spouštěče

§5.2 Contribution označí autora a datum. §5.3.1 nezměněná distribuce nese dohodu a notice warranty/liability, u samotného objektu účinný přístup k úplnému zdroji nejméně3 roky od distribuce za nejvýše náklady přenosu dat. §5.3.2 Modified Software podléhá celé dohodě a navíc u objektu nese poznámku o podmínkách účinného přístupu ke kompletním zdrojům stejně nejméně3 roky; tato doba není jen do ukončení distribuce. Čl.1 Source Code jsou instrukce/programové řádky potřebné k modifikaci. §6.4 identické IP notices ve všech kopiích a potřebná opatření vůči zaměstnancům. §3.2 uznává dohodu a upozornění poskytnuté/přečtené před přijetím.

## Omezení, výjimky a ukončení

§6.1 Initial Software zůstane alespoň pod touto dohodou po dobu ochrany, neukládá zde stejný příslib trvající distribuce jako1.1. §7 dobrovolná údržba/podpora a vlastní další záruky vyžadují oddělené ujednání a nezavazují ostatní poskytovatele. §8.1 připouští prokázanou přímou ztrátu z pochybení s §8.2 výjimkami pro vlastní porušení a škody z užití/výkonu i všechny následné obchodní ztráty. §9.1 příjemce ověří vhodnost/funkci/neškodnost; §9.2 dobrá víra poskytovatele v oprávnění udělit práva zůstává výjimkou z AS IS§9.3. §9.4 bez záruky neporušení cizích IP a bez odpovědnosti za tyto žaloby, ale poskytovatel musí dodat technickou/právní expertizu pro obranu, konkrétně memorandem. Disclaimer názvu/známky není samostatný zákaz propagace. §10 ukončení po neúčinné30denní výzvě, řádné starší downstream licence zachovány.

## Verze a kombinování

Čl.1 definuje GPL2 nebo pozdější, Affero GPL3 nebo pozdější a EUPL1.1 nebo pozdější. §5.3.4 výslovně dovoluje obě směrové kombinace a distribuci celého příslušného kódu pod stejnou konkrétní verzí GPL/AGPL/EUPL jako druhá část; nejde o volbu libovolné licence bez kombinace ani důkaz kompatibility všech závislostí současně. §12.3 další distribuce stejné/pozdější CeCILL s touto výjimkou. §11.5 FR i EN autentické, bez jednostranné priority1.1; formulář bez svévolných změn a budoucí verze vydávají autoři. §11 force majeure, podepsaná písemná ujednání a zákonné přizpůsobení, §13 francouzské právo, smír a po2 měsících příslušná Paříž mimo naléhavé řízení.

## Překážky a navazující práce

- Doplnit patentový non-enforcement covenant čl.5 a povinnost nechat jej převzít nabyvatelem patentů. Metadata jej nesmějí zaměnit za výslovný patentový grant starší1.1, pouhé mlčení či odvetné ukončení.
- Modelovat aktivní opatření vůči zaměstnancům (§6.4), prověření vhodnosti/funkce/neškodnosti (§9.1) a technickou/právní expertizu poskytovatele pro obranu při IP řízení (§9.4) s podmínkami případového memoranda. Warranty/liability ani obecná indemnita nevyjadřují jejich nositele a obsah.

## Metadata a jejich doložení

| Pole | Hodnota | Doložení znění |
|---|---|---|
| family | "strong-copyleft" | CeCILL2.1 čl.1 Contributions zahrnují Internal Modules ve stejném adresním prostoru; §5.3.2 celý Modified Software pod dohodou, §5.3.3 pouze nezávislé External Modules odděluje. Silný copyleft je doložen operativními články. |
| copyleftScope | "whole-work" | CeCILL2.1 čl.1 a §5.3.2 zahrnují do celku integrované změny a interní moduly ve stejném adresním prostoru; §5.3.3 nezávislé neodvozené externí moduly dovoluje jinak. Whole-work má tuto konkrétní výjimku, není to obecný file/library rozsah. |
| permissions | ["commercial-use","conditional-relicensing","distribution","modifications","private-use","unknown"] | CeCILL2.1 čl.2/5 a §§5.1–5.3 dovolují kopie, běh/studium, změny, distribuci a prodej. §5.3.4 s definicemičl.1 dovoluje konkrétní GPL2+/AGPL3+/EUPL1.1+ kombinace. Unknown je pouze nemodelované patentové nevymáhání s povinností převzetí, ne chybějící analýza copyrightu. |
| obligations | ["include-copyright","include-license-text","include-notice","mark-modifications","provide-corresponding-source","same-license","unknown"] | CeCILL2.1 §5.2 autor/datum, §5.3.1/5.3.2 licence/warranty-liability notice a účinný zdrojový přístup minimálně3 roky od distribuce (upravený objekt s přístupovou poznámkou), §6.4 IP notices. Unknown pro čl.5 závazek nabyvatelů patentů, staff opatření§6.4, bezpečnostní prověření§9.1 a právní/technickou expertizu§9.4. |
| triggers | ["combination","distribution","linking","modification","use"] | CeCILL2.1 §5.2 změny, §5.3 distribuce a kombinace s jinými licencemi, čl.1 propojení v témže adresním prostoru, §6.4 notices kopií a §9.1 ověřování užití. AGPL pouze jako alternativní kompatibilní větev nezavádí do základní CeCILL síťový source trigger. |
| restrictions | ["additional-terms","liability","unknown","warranty"] | CeCILL2.1 §6.1 zachování podmínek původního softwaru a §5.3.2 dohodu změněného celku; čl.8 liability a čl.9 warranty s výjimkami. Unknown označuje aktivní závazky včetně neškodnosti, které nelze zploštit na prosté AS IS; žádný samostatný patent-claim termination nebyl nalezen. |
| patentPosition | "unknown" | CeCILL2.1 čl.5 zavazuje nevymáhat nynější i budoucí patenty na funkce vůči následným Licensees a nechat závazek převzít nabyvateli. Unknown je konkrétně chybějící non-enforcement hodnota; nejde o patentovou výluku, mlčení, odvetu ani formulaci explicitního grantu1.1. |
| noticeBurden | "material" | CeCILL2.1 §5.2 autor a datum, §5.3 licence/disclaimery/podmínky tříletého zdrojového přístupu a §6.4 identické IP notices v nezměněných i změněných kopiích; materiální zátěž. |

## Zdroje

- [Primární zdroj](https://spdx.org/licenses/CECILL-2.1.html) — Primární CeCILL2.1 potvrzuje nejméně tříletý účinný source přístup, obousměrnou GPL2+/AGPL3+/EUPL1.1+ kombinaci a patentový covenant s předáním nabyvatelům. Oba jazyky podle§11.5 autentické; revize nemění připnuté znění.
- [Kurátorovaný profil](../../../data/profiles/licenses/id-Q0VDSUxMLTIuMQ.json)
- [Uložené úplné znění](../../../public/data/licenses/CECILL-2.1.json)

## Otisk zdroje

```json
{
  "sourceId": "spdx-license-list",
  "revision": "manifest-sha256:74897699de0d23c4da42b94bf46bc6fd01f7b68ffcece9db1a98194ac277bb02",
  "contentHash": "sha256:9858d653bf09abe142482bc4cc335aeb622252b06c27a7c22477de6e928ff3cf"
}
```
