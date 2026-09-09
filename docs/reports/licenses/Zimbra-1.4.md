# Zimbra-1.4 — obsahová revize

Zimbra Public License v1.4

Revize: **2026-09-09** · pravidlo **2026-09-09.10**.

Výsledek: **zpracována, nezařazena do průvodce**.

ZPL 1.4 dovoluje kopírování, úpravy, kompilaci a distribuci softwaru Zimbra. Zdrojové distribuce zůstávají pod ZPL; binární lze licencovat jinak, ale příjemci musí získat přístup ke zdrojům s ZPL a zachovat zdrojová práva. Zcela vlastní přidané soubory bez původního kódu jsou oddělené. Zachovávají se všechny notices ve stejné podobě včetně log v rozhraní. Grant je pouze autorský; postoupení práv a povinností včetně podnikových přeměn vyžaduje písemný souhlas Zimbra.

## Předmět a rozsah

Software poskytovaný Zimbra, Inc., Texas, a jeho Modifications. §1.1 výslovně vylučuje přidaný soubor neobsahující žádnou část originálu z definice Modification. Předání uvnitř téže oprávněně zastupované společnosti není distribuce (§1.2).

## Udělená práva

§1.1 poskytuje bezúplatné nevýhradní nepřevoditelné autorské právo kopírovat, měnit, kompilovat, vykonávat a distribuovat. §1.4 dovoluje jinou licenci binární distribuce s ochranou práv ke zdrojům; §1.5 zcela vlastní oddělené soubory za libovolných podmínek. §3.1 výslovně vyhrazuje vše kromě autorského grantu, proto neposkytuje patentová práva ani implicitní grant.

## Podmínky a spouštěče

§1.3 vyžaduje při distribuci zdrojů ZPL a celý text; distributor změn vstupuje do role Zimbra s výjimkou texaské soudní příslušnosti. §1.4 vyžaduje přístup příjemců binárek ke zdrojům s licencí, jasné označení odlišných podmínek jako vlastních a zákaz omezit zdrojová práva. §3.2 vyžaduje v každé kopii i vytvořené změně zachovat copyright, patentové, známkové a atribuční notices ve stejné podobě včetně UI log. Nenařizuje obecný změnový deník.

## Omezení, výjimky a ukončení

§3.3 dovoluje značky pouze pro splnění zachování notices. §§4–5 výslovně vylučují záruky a přímé i další škody; §2 neukládá podporu, aktualizace ani licenci jiného vydání. Podle §6 může Zimbra při porušení dohodu ukončit bez uvedené nápravné lhůty. §7 volí Delaware/USA, vylučuje CISG a pro spory zahrnující Zimbra či rodiče/dceřiné společnosti stanoví severní Texas, Dallas; omezuje převody i právní přeměny.

## Verze a kombinování

Jasná souborová hranice umožňuje nezávislé vlastní soubory za jiných podmínek. Jiné binární podmínky nesmějí omezit práva ke zdrojům a musí být připsány pouze distributorovi. Text nenabízí pozdější verzi ani obecnou kompatibilitu s jinou zdrojovou licencí.

## Překážky a navazující práce

- §7 zakazuje bez předchozího písemného souhlasu Zimbra postoupení práv, delegaci povinností i převod dohody, výslovně také při prodeji aktiv, fúzi a konsolidaci, a nesouhlasný převod prohlašuje za od počátku neplatný. Slovník neobsahuje takové omezení převodu; před doporučením je nutné samostatně modelovat tuto podmínku a její dopad na nového poskytovatele podle §1.3.

## Metadata a jejich doložení

| Pole | Hodnota | Doložení znění |
|---|---|---|
| family | "weak-copyleft" | public/data/licenses/Zimbra-1.4.json#text; §§1.3–1.5: copyleft pro zdroje Software/Modifications, jiná binární licence přípustná, vlastní samostatné soubory odděleny; https://spdx.org/licenses/Zimbra-1.4.html |
| copyleftScope | "file" | public/data/licenses/Zimbra-1.4.json#text; §1.1 výslovně vylučuje přidaný soubor bez jakékoli části Software z Modifications; §1.5 potvrzuje volné podmínky vlastních souborů; https://spdx.org/licenses/Zimbra-1.4.html |
| permissions | ["commercial-use","conditional-relicensing","distribution","modifications","private-use"] | public/data/licenses/Zimbra-1.4.json#text; §1.1 copy/modify/compile/execute/distribute bez royalty; §1.4 pouze podmíněně jiná binární licence, §3.1 vyhrazuje neautorská práva; https://spdx.org/licenses/Zimbra-1.4.html |
| obligations | ["disclose-source","include-copyright","include-license-text","include-notice","same-license"] | public/data/licenses/Zimbra-1.4.json#text; §§1.3–1.4 zdroje pod ZPL, přístup ke zdrojům binárek, celý text licence a zřetelné připsání vlastních podmínek; §3.2 zachovat všechny notices včetně UI log ve stejné formě; https://spdx.org/licenses/Zimbra-1.4.html |
| triggers | ["distribution","modification","use"] | public/data/licenses/Zimbra-1.4.json#text; Distribuce spouští §§1.3–1.4; vytvoření změn a jakákoli kopie §3.2; zachování UI při užití vyplývá z nezměněné podoby notices; interní předání společnosti §1.2 není distribuce; https://spdx.org/licenses/Zimbra-1.4.html |
| restrictions | ["additional-terms","liability","trademark","unknown","warranty"] | public/data/licenses/Zimbra-1.4.json#text; §3.3 známky jen pro povinné notices, §§4–5 výluky, §1.4 ochrana zdrojových práv; §7 zákaz postoupení/delegace/převodu včetně fúzí vyžaduje neexistující omezení modelu; https://spdx.org/licenses/Zimbra-1.4.html |
| patentPosition | "express-exclusion" | public/data/licenses/Zimbra-1.4.json#text; §3.1: kromě výslovného autorského grantu §1.1 nevznikají žádná další práva, licence ani forbearances, výslovně ani implied/exhaustion/estoppel; jde o vyloučení neautorského grantu včetně patentů; https://spdx.org/licenses/Zimbra-1.4.html |
| noticeBurden | "material" | public/data/licenses/Zimbra-1.4.json#text; §3.2 zachovává původní formu všech notices i UI log; §§1.3–1.4 celý text a vysvětlení vlastních binárních podmínek, nikoli prostá minimální atribuce; https://spdx.org/licenses/Zimbra-1.4.html |

## Zdroje

- [Primární zdroj](https://spdx.org/licenses/Zimbra-1.4.html) — Individuálně přečten celý připnutý SPDX text; §§1.3–1.5: copyleft pro zdroje Software/Modifications, jiná binární licence přípustná, vlastní samostatné soubory odděleny
- [Kurátorovaný profil](../../../data/profiles/licenses/id-WmltYnJhLTEuNA.json)
- [Uložené úplné znění](../../../public/data/licenses/Zimbra-1.4.json)

## Otisk zdroje

```json
{
  "sourceId": "spdx-license-list",
  "revision": "manifest-sha256:74897699de0d23c4da42b94bf46bc6fd01f7b68ffcece9db1a98194ac277bb02",
  "contentHash": "sha256:59f0c0ec3f1953ef180ec098c1cfa47f46743e8bc655c805ac710349c1c67fae"
}
```
