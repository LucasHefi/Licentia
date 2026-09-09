# GPL-1.0 — obsahová revize

GNU General Public License v1.0 only

Revize: **2026-09-09** · pravidlo **2026-09-09.10**.

Výsledek: **zpracována, nezařazena do průvodce**.

GNU GPLv1 vyžaduje licence pro celý distribuovaný celek obsahující Program, s výjimkou pouhé agregace nezávislých děl. Změněné soubory uvádějí změnu a datum a modifikovaný interaktivní program má počáteční notice. Objektový kód musí mít odpovídající zdroje, tříletou nabídku všem třetím stranám, nebo při omezené nekomerční redistribuci převzatou informaci o zdrojích. Jde o deprecated SPDX identifikátor GPL-1.0; pro nový projekt je nutné výslovně rozhodnout only versus or-later.

## Předmět a rozsah

§0 libovolný program/jiné dílo s GPL notice a work based on Program jako dílo obsahující jeho celek či část beze změny nebo s úpravami. §2 odděluje pouhé společné médium s nezávislým dílem. Příloha je návod aplikace, nikoli automatický notice každého konkrétního programu.

## Udělená práva

§§1–3 dovolují zdrojové kopie, změny a objektovou/executable distribuci, včetně placeného fyzického předání a placené volitelné záruky §2(d); preambule výslovně počítá s prodejem kopií. Neexistuje patentový grant ani patentová žalobní odveta. §7 later version platí při výslovném notice, u neurčeného čísla dovoluje libovolnou vydanou verzi FSF.

## Podmínky a spouštěče

§1 každá zdrojová kopie nápadný copyright a warranty disclaimer, zachované GPL/warranty notices a celý text příjemci. §2(a) změněné soubory prominentní změna+datum; §2(b) celý publikovaný/distribuovaný Work bez licenčního poplatku pod GPL. §2(c) modifikovaný interaktivní program při obvyklém startu zobrazí copyright, záruku/její absenci, redistribuci a cestu k licenci; není zde obecná výjimka pro původně beznoticový interaktivní program z GPLv2. §3 objektový kód: zdroje přiložit, NEBO písemná nabídka nejméně3 roky komukoli za nejvýše nominální distribuční náklady, NEBO pouze nekomerčně a po přijetí samotné binárky předat převzatou informaci o získání zdrojů. Zdroj zahrnuje všechny moduly, s výjimkou standardních knihoven/headerů/definic přiložených k OS; textv1 neuvádí instalační klíče ani povinné sestavovací skripty jako pozdější verze.

## Omezení, výjimky a ukončení

§4 nepovolené kopírování/změny/sublicence/distribuce/převod automaticky ruší práva, ale compliant downstream zůstává. §6 zakazuje další restrikce a poskytuje příjemci přímou licenci od originálního poskytovatele. §§9–10 vylučují záruky a škody v mezích zákona a mimo písemné dohody. Není zvláštní známková nebo patentová podmínka. Příloha doporučuje kontakty, notice v souborech a případné zaměstnavatelovo zřeknutí práv; tyto vzory nenahrazují vlastní normativní §§1–3.

## Verze a kombinování

§7 nečiní každý Program automaticky or-later; vyžaduje takový konkrétní licenční notice nebo žádné číslo verze. §8 jiné podmínky začleněného programu odkazuje na individuální svolení autora/FSF. Neexistuje explicitní GPLv3/AGPL kombinační výjimka, a pouhé použití deprecated ID ji nemůže dodat.

## Překážky a navazující práce

- Připnutá položka GPL-1.0 je deprecated a nerozlišuje samostatným identifikátorem licenci pouzev1 od volby dalších verzí. §7 tuto volbu váže na notice konkrétního programu, zatímco příloha nabízí jen vzor or-later. Pro nové doporučení je třeba podle záměru poskytovatele zvolit GPL-1.0-only nebo GPL-1.0-or-later; obsah této historické verze je individuálně zrevidován.

## Metadata a jejich doložení

| Pole | Hodnota | Doložení znění |
|---|---|---|
| family | "strong-copyleft" | public/data/licenses/GPL-1.0.json#text; §2(b) celý distribuovaný/publikovaný Work obsahující Program pod GPL bez licenčního poplatku; standardní silný copyleft; https://spdx.org/licenses/GPL-1.0.html |
| copyleftScope | "whole-work" | public/data/licenses/GPL-1.0.json#text; §§0,2(b) celek obsahující původní dílo nebo část, ale závěr§2 vyjímá mere aggregation nezávislého díla na médiu; https://spdx.org/licenses/GPL-1.0.html |
| permissions | ["commercial-use","conditional-relicensing","distribution","modifications","private-use"] | public/data/licenses/GPL-1.0.json#text; §§1–3 kopie/modifikace/source iobject distribuce, §2(d) placené předání a záruka; §7 pouze podle notice volba pozdějších verzí; https://spdx.org/licenses/GPL-1.0.html |
| obligations | ["include-copyright","include-license-text","include-notice","mark-modifications","provide-corresponding-source","same-license"] | public/data/licenses/GPL-1.0.json#text; §1 copyright/disclaimer/celá GPL, §2(a),(c) změna+datum a interaktivní notice, §2(b) stejná licence; §3 přesné tři alternativy zdrojů bez jejich kumulace; https://spdx.org/licenses/GPL-1.0.html |
| triggers | ["distribution","modification","use"] | public/data/licenses/GPL-1.0.json#text; Zdrojová/objektová distribuce §§1,3, změny §2(a), interaktivní start modifikovaného programu §2(c); žádný síťový zdrojový trigger; https://spdx.org/licenses/GPL-1.0.html |
| restrictions | ["additional-terms","liability","warranty"] | public/data/licenses/GPL-1.0.json#text; §6 zákaz dalších restrikcí, §4 automatické ukončení s downstream ochranou, §§9–10 výluky záruk/škod s právními a písemnými výjimkami; https://spdx.org/licenses/GPL-1.0.html |
| patentPosition | "none-stated" | public/data/licenses/GPL-1.0.json#text; Úplná GPLv1 §§0–10 ani příloha neudělují patentovou licenci a neukončují grant za patentovou žalobu; nelze přenést pozdější GPL ustanovení; https://spdx.org/licenses/GPL-1.0.html |
| noticeBurden | "material" | public/data/licenses/GPL-1.0.json#text; §1 každý copyright/disclaimer a celá licence, §2 změnová data/interaktivní oznámení, §3 formálně vymezené zdrojové varianty; materiální zátěž; https://spdx.org/licenses/GPL-1.0.html |

## Zdroje

- [Primární zdroj](https://spdx.org/licenses/GPL-1.0.html) — Individuálně přečten celý připnutý SPDX text; §2(b) celý distribuovaný/publikovaný Work obsahující Program pod GPL bez licenčního poplatku; standardní silný copyleft
- [Kurátorovaný profil](../../../data/profiles/licenses/id-R1BMLTEuMA.json)
- [Uložené úplné znění](../../../public/data/licenses/GPL-1.0.json)

## Otisk zdroje

```json
{
  "sourceId": "spdx-license-list",
  "revision": "manifest-sha256:74897699de0d23c4da42b94bf46bc6fd01f7b68ffcece9db1a98194ac277bb02",
  "contentHash": "sha256:eb096b3880a873f0547109f811e298c1c3f050da0cfc0bba6557d985d7c6c86d"
}
```
