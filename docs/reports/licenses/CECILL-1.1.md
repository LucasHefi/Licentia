# CECILL-1.1 — obsahová revize

CeCILL Free Software License Agreement v1.1

Revize: **2026-09-09** · pravidlo **2026-09-09.10**.

Výsledek: **zpracována, nezařazena do průvodce**.

CeCILL 1.1 zahrnuje upravený software a staticky propojené moduly ve společném executable; samostatný Dynamic Module musí mít oddělený executable i adresní prostor. Redistribuce zachovává licenci, oznámení a přístup k úplným zdrojům, změny jméno a datum. Článek 5 výslovně uděluje patentová práva. Zůstává mimo průvodce kvůli zvláštním aktivním závazkům a nutnosti doložit vztah anglické verze 1.1 k rozhodujícímu francouzskému znění.

## Předmět a rozsah

Článek 1 pokrývá software ve zdrojové/objektové podobě a dokumentaci. Contributions jsou integrované změny i Static Modules, jejichž objekt je staticky propojen v jednom executable. Dynamic Module je nezávislý, ve dvou samostatných executable a adresních prostorech s voláním mezi nimi; §5.3.3/6.3 dovolují jeho vlastní licenci. Nejde o obecnou výjimku každého dynamického linkování v témže procesu.

## Udělená práva

Čl.2 a5 udělují bezplatná nevýlučná převoditelná celosvětová práva po dobu majetkových práv. §5.1 kopie, loading/display/run/storage a pozorování/studium/testování pro myšlenky/principy bez omezení oboru; §5.2 změny/odvozeniny; §5.3 veřejné šíření i prodej. Čl.5 výslovně uděluje bezplatná exploitation rights k patentům poskytovatele na vynálezy implementované softwarem. Úplné znění nemá patentovou odvetu a nepřenáší se sem patentový non-enforcement režim CeCILL2.0. Obecné sublicencování není zvlášť uděleno.

## Podmínky a spouštěče

§5.2 každá Contribution výslovně uvádí autora a datum. §5.3.1/5.3.2 nezměněné i upravené kopie nesou dohodu a notice omezení záruk/odpovědnosti; samotný objekt vyžaduje neomezený přístup budoucích příjemců k úplnému modifikovatelnému zdroji s informací o cestě, dodatečné náklady nanejvýš přenos dat. Čl.1 Source Code znamená instrukce/řádky potřebné k modifikaci, bez převzetí cizí definice GPL Corresponding Source. §6.4.1 zachovává identická IP oznámení v kopiích. §6.4.2 navíc aktivně zajišťuje dodržování IP práv zaměstnanci; §6.1 držitel slibuje zachovat distribuci za podmínek dohody po dobu ochrany. §3.2 zaznamenává kopii dohody/notices poskytnutou před loading/prvním výkonem práv.

## Omezení, výjimky a ukončení

§7 podpora/údržba nejsou automatické, dobrovolné služby a další záruky pouze vlastní odpovědností v odděleném ujednání. §8.1 připouští prokázanou přímou škodu z pochybení, §8.2 vyjímá vlastní porušení příjemce, profesní užití profesionálem a následné ztráty, včetně široce definovaných obchodních škod/nároků třetích stran. §9.1 příjemce aktivně ověřuje vhodnost, řádnou funkci a nepoškození osob/majetku; §9.2 poskytovatel v dobré víře prohlašuje oprávnění k udělení práv a §9.3 AS IS tuto výjimku zachovává. §9.4 žádná IP indemnita, ale při žalobě musí poskytovatel nabídnout technickou a právní pomoc, podmínky případ od případu memorandem. Disclaimer názvu/známky není výslovný zákaz propagace. §10.1 ukončení po neúčinné výzvě a 30 dnech, §10.2 řádné starší downstream licence zůstávají.

## Verze a kombinování

§5.3.4 dovoluje celý kombinovaný kód pod GPL při začlenění CeCILL kódu do GPL nebo obráceně; verze GPL zde uvedena není, nesmí se bez podkladů přiřadit pouze GPL2 či GPL3. §12.3 redistribuce pod stejnou nebo pozdější CeCILL, s výjimkou GPL cesty; formulář lze kopírovat bez změn, další číslované verze vydávají autoři licence. §11.5 při výkladovém rozporu upřednostňuje francouzské znění, avšak připnuté comments a SPDX notes uvádějí pouze anglickou1.1 s úpravami1.0: vztah k autentickému textu je třeba doložit, ne potichu zaměnit. §11 zachovává force majeure, písemné podepsané změny a adaptaci na právo. §13 francouzské právo, pokus o smír, po2 měsících pařížský příslušný soud mimo naléhavá řízení.

## Překážky a navazující práce

- Modelovat skutečné aktivní povinnosti: držitel zachová distribuci po dobu ochrany (§6.1), příjemce přijme potřebná opatření vůči zaměstnancům (§6.4.2) a ověří vhodnost/funkčnost/neškodnost (§9.1), poskytovatel poskytne technickou a právní pomoc při IP řízení (§9.4). Nejde pouze o AS IS ani obecnou indemnitu.
- Doložit autoritativní vztah anglické CeCILL1.1 k francouzskému znění: §11.5 upřednostňuje francouzštinu, zatímco připnutá SPDX poznámka a primární stránka uvádějí pouze anglickou verzi1.1. Historickou1.0 ani novější2.x nepovažovat bez doložení za totožný rozhodující text.

## Metadata a jejich doložení

| Pole | Hodnota | Doložení znění |
|---|---|---|
| family | "strong-copyleft" | CeCILL1.1 čl.1 zahrnuje Contributions/Static Modules, §5.3.2 vyžaduje dohodu pro celý Modified Software; §5.3.3 vyjímá jen přesně nezávislý Dynamic Module s odděleným executable/adresním prostorem. Silný copyleft, nikoli knihovní výjimka. |
| copyleftScope | "whole-work" | CeCILL1.1 čl.1 Static Module propojí objekt do jednoho executable a stane se Contribution; §5.3.2 pokrývá Modified Software jako celek. Výjimka Dynamic Module §5.3.3 vyžaduje jiné executable i oddělené address spaces. |
| permissions | ["commercial-use","conditional-relicensing","distribution","modifications","patent-grant","private-use"] | CeCILL1.1 čl.2/5 a §§5.1–5.3 výslovně kopie, běh, studium, změny, šíření a prodej bez oborového omezení; čl.5 uděluje exploitation rights k patentům poskytovatele implementovaným softwarem. §5.3.4 podmíněné GPL kombinace; obecný sublicensing není explicitní. |
| obligations | ["include-copyright","include-license-text","include-notice","mark-modifications","provide-corresponding-source","same-license","unknown"] | CeCILL1.1 §5.2 jméno/datum Contributions; §5.3.1/5.3.2 dohoda, warranty/liability notice a úplný zdroj binárek za nejvýše náklady přenosu; §6.4.1 IP notices. Unknown zachovává aktivní staff opatření §6.4.2, trvání distribuce držitele §6.1, prověření §9.1 a technickou/právní pomoc §9.4. |
| triggers | ["combination","distribution","linking","modification","use"] | CeCILL1.1 §5.2 tvorba změn, §5.3 distribuce a GPL kombinace, čl.1 statické propojení, §6.4.1 notices v kopiích a §9.1 prověření při užití. Úplný text nezavádí síťový source trigger ani patentovou žalobu jako zvláštní automatický zánik. |
| restrictions | ["liability","unknown","warranty"] | CeCILL1.1 čl.8 omezuje odpovědnost s přímou prokázanou škodou a profesními výjimkami; čl.9 záruky s kladným prohlášením oprávnění §9.2 a pomocí §9.4. Unknown pro aktivní bezpečnostní/IP závazky, které nelze nahradit slovem warranty; zmínka Software name v§9.4 není endorsement zákaz. |
| patentPosition | "express-grant" | CeCILL1.1 čl.5 výslovně: poskytovatel uděluje bezplatná exploitation rights k patentům na implementované vynálezy. Čl.10 je obecné porušení, žádné zvláštní patentové odvetné ukončení v celém textu není; express-grant se neodvozuje z CeCILL2.0. |
| noticeBurden | "material" | CeCILL1.1 §5.2 jméno/datum změn, §5.3 licence a warranty/liability notice plus cesta ke zdrojům, §6.4.1 identická IP oznámení; §3.2 předchozí poskytnutí dohody s upozorněním: materiální zátěž. |

## Zdroje

- [Primární zdroj](https://spdx.org/licenses/CECILL-1.1.html) — Primární stránka potvrzuje explicitní patentový grant čl.5 a poznámku, že1.1 existuje jen anglicky s úpravami1.0; v uloženém textu však zůstává priorita francouzštiny§11.5. Tato nejistota se neskrývá změnou kanonického zdroje.
- [Kurátorovaný profil](../../../data/profiles/licenses/id-Q0VDSUxMLTEuMQ.json)
- [Uložené úplné znění](../../../public/data/licenses/CECILL-1.1.json)

## Otisk zdroje

```json
{
  "sourceId": "spdx-license-list",
  "revision": "manifest-sha256:74897699de0d23c4da42b94bf46bc6fd01f7b68ffcece9db1a98194ac277bb02",
  "contentHash": "sha256:01cb123989abc4d37c381913a14c01751557f3d1fd899d8adc27085a9759fcf8"
}
```
