# LGPL-2.0+ — obsahová revize

GNU Library General Public License v2 or later

Revize: **2026-09-10** · pravidlo **2026-09-09.10**.

Výsledek: **zpracována, nezařazena do průvodce**.

Deprecated LGPL-2.0+ znamená Library GPL 2 nebo pozdější, nikoli Lesser GPL 2.1. Původní § 6 nemá samostatnou cestu sdílené knihovny; vlastní aplikace využije jednu ze čtyř cest poskytnutí relinkovacích materiálů. Změny zachovávají knihovní povahu a smysluplný provoz bez nepředaných aplikačních funkcí či tabulek.

## Předmět a rozsah

§0 software library funkce/data připravené ke spojení s aplikací; Library/dílo na ní založené zahrnuje odvozené části/překlady. Complete source všechny moduly/interfaces/build/install. Spouštění neomezeno a output jen pokud sám obsahově odvozený, nikoli jen podle nástroje. §§2,5 odlišují odvozenou knihovnu od samostatného work that uses Library. Pinned ID je deprecated, plus indikuje§13 or-later, úplný text je LibraryGPLv2June1991.

## Udělená práva

§§1–2 kopírovat/šířit/měnit, komerční distribuce s fyzickým přenosovým poplatkem a dobrovolnou placenou zárukou;§6 vlastní podmínky linked aplikace při zachování práv úpravy/reverse engineering. §3 lze konkrétní kopii nevratně přepnout změnou všechlicenčníchnotices naGPL2 nebo již vydanou novější, všechny další kopie/odvozeniny tím svázány. §13 plus volba2/pozdějšíLibraryGPL při skutečnémor-later notice. Žádný výslovný patentový grant;§11 pouze zákaz distribuce při kolizi s povinnostmi včetně patentovýchroyalties, nepatentováodveta. §10 downstream přímálicence, neobecnýsublicensing.

## Podmínky a spouštěče

§1 každá zdrojová kopie copyright/disclaimer/licence notices+licence. §2 změněné dílo samo softwarelibrary, změnovéfiles prominentní datum, celé odvozené dílo bez licenčního poplatku podLGPL; funkce odkazující na aplikačnífunkci/tabulku jinaknežargumentem musí good-faith zůstat smysluplně funkční i pokud ji aplikace nedodá. §4 object samotnéknihovny s úplným odpovídajícím source§1–2, stejnýmísto ekvivalentnídownloadstačí. §6 linkedwork jinými podmínkami musí dovolit vlastní úpravy zákazníka a reverzníinženýrství prodebug těchtoúprav, prominentnínotice oLibrary+licence a runtimecopyright pokud ostatnícopyrightzobrazuje. Jedna cesta:6a knihovnysource+úplnýappobject/source prorelinking;6b nejméně3letá nabídka STEJNÉMUuživateli za cenu distribuce;6c stejnédownloadmísto pro všechny materiály;6d ověřit jiždoručené/poslané. V2 zde není sdílenálibrary alternativa2.1. Appmateriály data/utility pro obnovuexecutable, běžnéOSkomponentyvyňatyledaaccompany. §7 kombinovanáknihovna navíc nezávisláLGPLčást+noticekdeji najít.

## Omezení, výjimky a ukončení

§5 header hranice derivative ponechána právu, ale pouze numericképarametry/datovélayout/accessors/makra+inline≤10řádků unrestrictedobject; skutečněderivative ostatníobject§6 i při nepřímémspojení. §8 nepovolenýúkon automatickyukončí práva bezcure, řádnípříjemci trvají;§9 přijetí změnou/distribucí. §10 žádnédalšíomezení anipovinnostvymáhat třetí. §11 při neslučitelnýchexterníchpodmínkáchnedistribuovat. §12 původnídržitel MŮŽEpřidat explicitnígeoomezení dlepatentů/copyrightinterfaces, žádnýkonkrétní seznamstátůnenívtextu. §§15–16 as-is/škodovévýlukys výjimkoupráva/písemnédohody.

## Verze a kombinování

§2 samostatněoddělené nezávislésekce a pouháagregace mimo; odvozenýcelek knihovny LGPL. §6 cizíneOSproprietarylibrary kolidujícís relinkovacími povinnostmi znamená nedistribuovat danýexecutable. §7 side-by-side jinéknihovnífacilities pokud dovolena jejichsamostatnádistribuce, uncombinedLGPLčást přiložit. §3 nevratnáGPL cesta prointegracidone-libraryprogramu,§13 or-later a§14 individuálnívýjimkaautora/FSF, nikoli automatickákompatibilita. Závěrečný návod uvéstnotices/kontakt/employerdisclaimer nenívýslovná povinnost každého uživatele.

## Překážky a navazující práce

- Identifikátor LGPL-2.0+ je deprecated. Pro nové doporučení podle skutečného oznámení použít explicitní LGPL-2.0-or-later; zachovat popsané knihovní podmínky a samostatné alternativy pro propojenou aplikaci.

## Metadata a jejich doložení

| Pole | Hodnota | Doložení znění |
|---|---|---|
| family | "weak-copyleft" | public/data/licenses/LGPL-2.0+.json#text; §2 reciproční celéodvozenéknihovnídílo,§§5–6 výjimkapro workthatusesLibrary při zachování úprav/relinku,§7 dovolujesamostatnénezávisléfacilities. Weak library copyleft, nevynucujeLGPL nacelévlastníappani pouze soubory. §2a a §2d jsou konkrétní podmínky tohoto knihovního copyleftu: upravené dílo zůstává knihovnou a vyžaduje snahu v dobré víře zachovat smysluplnou funkčnost bez nepředané aplikační funkce či tabulky, vyjma argumentu při volání. Nepředstavují obecný bezpečnostní test užití. |
| copyleftScope | "library" | public/data/licenses/LGPL-2.0+.json#text; §2 reciproční celéodvozenéknihovnídílo,§§5–6 výjimkapro workthatusesLibrary při zachování úprav/relinku,§7 dovolujesamostatnénezávisléfacilities. Weak library copyleft, nevynucujeLGPL nacelévlastníappani pouze soubory. §2a a §2d jsou konkrétní podmínky tohoto knihovního copyleftu: upravené dílo zůstává knihovnou a vyžaduje snahu v dobré víře zachovat smysluplnou funkčnost bez nepředané aplikační funkce či tabulky, vyjma argumentu při volání. Nepředstavují obecný bezpečnostní test užití. |
| permissions | ["commercial-use","conditional-relicensing","distribution","modifications","private-use"] | public/data/licenses/LGPL-2.0+.json#text; §§1–2 kopírovat/šířit/měnit, komerční distribuce s fyzickým přenosovým poplatkem a dobrovolnou placenou zárukou;§6 vlastní podmínky linked aplikace při zachování práv úpravy/reverse engineering. §3 lze konkrétní kopii nevratně přepnout změnou všechlicenčníchnotices naGPL2 nebo již vydanou novější, všechny další kopie/odvozeniny tím svázány. §13 plus volba2/pozdějšíLibraryGPL při skutečnémor-later notice. Žádný výslovný patentový grant;§11 pouze zákaz distribuce při kolizi s povinnostmi včetně patentovýchroyalties, nepatentováodveta. §10 downstream přímálicence, neobecnýsublicensing. |
| obligations | ["allow-relinking","allow-reverse-engineering","disclose-source","include-copyright","include-license-text","include-notice","mark-modifications","preserve-combined-license-terms","provide-corresponding-source","same-license"] | public/data/licenses/LGPL-2.0+.json#text; §1 každá zdrojová kopie copyright/disclaimer/licence notices+licence. §2 změněné dílo samo softwarelibrary, změnovéfiles prominentní datum, celé odvozené dílo bez licenčního poplatku podLGPL; funkce odkazující na aplikačnífunkci/tabulku jinaknežargumentem musí good-faith zůstat smysluplně funkční i pokud ji aplikace nedodá. §4 object samotnéknihovny s úplným odpovídajícím source§1–2, stejnýmísto ekvivalentnídownloadstačí. §6 linkedwork jinými podmínkami musí dovolit vlastní úpravy zákazníka a reverzníinženýrství prodebug těchtoúprav, prominentnínotice oLibrary+licence a runtimecopyright pokud ostatnícopyrightzobrazuje. Jedna cesta:6a knihovnysource+úplnýappobject/source prorelinking;6b nejméně3letá nabídka STEJNÉMUuživateli za cenu distribuce;6c stejnédownloadmísto pro všechny materiály;6d ověřit jiždoručené/poslané. V2 zde není sdílenálibrary alternativa2.1. Appmateriály data/utility pro obnovuexecutable, běžnéOSkomponentyvyňatyledaaccompany. §7 kombinovanáknihovna navíc nezávisláLGPLčást+noticekdeji najít. |
| triggers | ["combination","distribution","linking","modification"] | public/data/licenses/LGPL-2.0+.json#text; §1 každá zdrojová kopie copyright/disclaimer/licence notices+licence. §2 změněné dílo samo softwarelibrary, změnovéfiles prominentní datum, celé odvozené dílo bez licenčního poplatku podLGPL; funkce odkazující na aplikačnífunkci/tabulku jinaknežargumentem musí good-faith zůstat smysluplně funkční i pokud ji aplikace nedodá. §4 object samotnéknihovny s úplným odpovídajícím source§1–2, stejnýmísto ekvivalentnídownloadstačí. §6 linkedwork jinými podmínkami musí dovolit vlastní úpravy zákazníka a reverzníinženýrství prodebug těchtoúprav, prominentnínotice oLibrary+licence a runtimecopyright pokud ostatnícopyrightzobrazuje. Jedna cesta:6a knihovnysource+úplnýappobject/source prorelinking;6b nejméně3letá nabídka STEJNÉMUuživateli za cenu distribuce;6c stejnédownloadmísto pro všechny materiály;6d ověřit jiždoručené/poslané. V2 zde není sdílenálibrary alternativa2.1. Appmateriály data/utility pro obnovuexecutable, běžnéOSkomponentyvyňatyledaaccompany. §7 kombinovanáknihovna navíc nezávisláLGPLčást+noticekdeji najít. |
| restrictions | ["additional-terms","liability","warranty"] | public/data/licenses/LGPL-2.0+.json#text; §5 header hranice derivative ponechána právu, ale pouze numericképarametry/datovélayout/accessors/makra+inline≤10řádků unrestrictedobject; skutečněderivative ostatníobject§6 i při nepřímémspojení. §8 nepovolenýúkon automatickyukončí práva bezcure, řádnípříjemci trvají;§9 přijetí změnou/distribucí. §10 žádnédalšíomezení anipovinnostvymáhat třetí. §11 při neslučitelnýchexterníchpodmínkáchnedistribuovat. §12 původnídržitel MŮŽEpřidat explicitnígeoomezení dlepatentů/copyrightinterfaces, žádnýkonkrétní seznamstátůnenívtextu. §§15–16 as-is/škodovévýlukys výjimkoupráva/písemnédohody. |
| patentPosition | "none-stated" | public/data/licenses/LGPL-2.0+.json#text; §§1–2 kopírovat/šířit/měnit, komerční distribuce s fyzickým přenosovým poplatkem a dobrovolnou placenou zárukou;§6 vlastní podmínky linked aplikace při zachování práv úpravy/reverse engineering. §3 lze konkrétní kopii nevratně přepnout změnou všechlicenčníchnotices naGPL2 nebo již vydanou novější, všechny další kopie/odvozeniny tím svázány. §13 plus volba2/pozdějšíLibraryGPL při skutečnémor-later notice. Žádný výslovný patentový grant;§11 pouze zákaz distribuce při kolizi s povinnostmi včetně patentovýchroyalties, nepatentováodveta. §10 downstream přímálicence, neobecnýsublicensing. |
| noticeBurden | "material" | public/data/licenses/LGPL-2.0+.json#text; §1 každá zdrojová kopie copyright/disclaimer/licence notices+licence. §2 změněné dílo samo softwarelibrary, změnovéfiles prominentní datum, celé odvozené dílo bez licenčního poplatku podLGPL; funkce odkazující na aplikačnífunkci/tabulku jinaknežargumentem musí good-faith zůstat smysluplně funkční i pokud ji aplikace nedodá. §4 object samotnéknihovny s úplným odpovídajícím source§1–2, stejnýmísto ekvivalentnídownloadstačí. §6 linkedwork jinými podmínkami musí dovolit vlastní úpravy zákazníka a reverzníinženýrství prodebug těchtoúprav, prominentnínotice oLibrary+licence a runtimecopyright pokud ostatnícopyrightzobrazuje. Jedna cesta:6a knihovnysource+úplnýappobject/source prorelinking;6b nejméně3letá nabídka STEJNÉMUuživateli za cenu distribuce;6c stejnédownloadmísto pro všechny materiály;6d ověřit jiždoručené/poslané. V2 zde není sdílenálibrary alternativa2.1. Appmateriály data/utility pro obnovuexecutable, běžnéOSkomponentyvyňatyledaaccompany. §7 kombinovanáknihovna navíc nezávisláLGPLčást+noticekdeji najít. |

## Zdroje

- [Primární zdroj](https://spdx.org/licenses/LGPL-2.0+.html) — Individuální revize celého připnutého textu; §0 software library funkce/data připravené ke spojení s aplikací; Library/dílo na ní založené zahrnuje odvozené části/překlady. Complete source všechny moduly/interfaces/build/install. Spouštění neomezeno a output jen pokud sám obsahově odvozený, nikoli jen podle nástroje. §§2,5 odlišují odvozenou knihovnu od samostatného work that uses Library. Pinned ID je deprecated, plus indikuje§13 or-later, úplný text je LibraryGPLv2June1991.
- [Kurátorovaný profil](../../../data/profiles/licenses/id-TEdQTC0yLjAr.json)
- [Uložené úplné znění](../../../public/data/licenses/LGPL-2.0+.json)

## Otisk zdroje

```json
{
  "sourceId": "spdx-license-list",
  "revision": "manifest-sha256:74897699de0d23c4da42b94bf46bc6fd01f7b68ffcece9db1a98194ac277bb02",
  "contentHash": "sha256:ff9f1221f08d7acd3e3a85538f92e3a2e2fabc18b6002a1b811e8330a1e7b680"
}
```
