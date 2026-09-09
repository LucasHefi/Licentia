# CERN-OHL-W-2.0 — obsahová revize

CERN Open Hardware Licence Version 2 - Weakly Reciprocal

Revize: **2026-09-09** · pravidlo **2026-09-09.10**.

Výsledek: **zpracována, nezařazena do průvodce**.

Slabě reciproční CERN OHL 2.0 ponechává upravené pokryté podklady pod stejnou licencí, ale rozlišuje dostupné součásti a externí materiál připojený dokumentovaným rozhraním. Příjemce produktu dostává úplné podklady nebo jejich umístění; externí materiál má vlastní výjimku z dodání zdrojů. Produkt může mít jiné podmínky, pokud neomezí práva k pokrytým podkladům, a poskytovatelé mají širokou ochranu před nároky. Tento výrobní rozsah a závazky vyžadují samostatné hardwarové posouzení mimo softwarový průvodce.

## Předmět a rozsah

CERN-OHL-W v2 pokrývá návrhy, digitální kód a výsledné Products; výslovně rozlišuje Available Component a External Material připojený dokumentovaným rozhraním.

## Udělená práva

§2–4 dovolují kopírování, změny, výrobu i obchodní zveřejnění/šíření. §4.3 umožňuje vlastní licenci Product, pokud neomezuje práva ke Covered Source, a §7 uděluje nutné patentové nároky poskytovatele.

## Podmínky a spouštěče

§3 požaduje relevantní notices, datovaný popis změn, Source Location podle způsobu dodání a stejnou licenci celého modified Covered Source s výjimkou Available Components a External Material. §4.1 každému příjemci dává Complete Source nebo oznámení místa; případné předepsané umístění na výrobku/balení/dokumentaci je viditelné a pevné. Complete Source obsahuje instalační a propojovací údaje a pokud jej proprietární nástroj umí vytvořit, i formát čitelný dostupným FSF/OSI nástrojem. §4.2 vylučuje zdroj External Material; Source Location je očekáváno dostupné alespoň3 roky.

## Omezení, výjimky a ukončení

§5 smluvně uzavírá externí vývoj/testování pro zadavatele. §6 AS IS a výluka škod obsahují také obecné hold harmless za použití včetně cizích nároků. Jména/loga jsou omezena na zákonné či nezbytné faktické použití bez dojmu podpory. §8 má okamžité ukončení, podmíněné obnovení a30 dnů od výzvy, při opakování definitivní konec.

## Verze a kombinování

§8.3 přechod W na S dovoluje jen při splnění přísnější definice Available Component v S; pozdější stejná varianta závisí na původním určení a chybějící varianta znamená S. §1.7(b)(i) W na rozdíl od S neomezuje dostupnou součást pouze na fyzický díl.

## Překážky a navazující práce

- §1.7–1.9 a§3–4 potřebují model výroby, Complete Source, Available Components a dokumentovaného External Material; softwarový enum library by tuto přesnou hranici nahradil jiným významem.
- §6.2 ukládá obecné hold harmless za použití a výrobu včetně cizích nároků, což není pouhé odškodnění za dobrovolně přidanou záruku.

## Metadata a jejich doložení

| Pole | Hodnota | Doložení znění |
|---|---|---|
| family | "weak-copyleft" | public/data/licenses/CERN-OHL-W-2.0.json#text; CERN-OHL-W v2 pokrývá návrhy, digitální kód a výsledné Products; výslovně rozlišuje Available Component a External Material připojený dokumentovaným rozhraním. §2–4 dovolují kopírování, změny, výrobu i obchodní zveřejnění/šíření. §4.3 umožňuje vlastní licenci Product, pokud neomezuje práva ke Covered Source, a §7 uděluje nutné patentové nároky poskytovatele. §1.8 a3.3(d) vyjímají External Material přes dokumentované rozhraní i nezbytný propojovací derivát; tato konstrukční hranice není totožná s file ani obecnou software library. Scope vyžaduje model komponent hardwaru.; https://spdx.org/licenses/CERN-OHL-W-2.0.html |
| copyleftScope | "unknown" | public/data/licenses/CERN-OHL-W-2.0.json#text; §1.8 a3.3(d) vyjímají External Material přes dokumentované rozhraní i nezbytný propojovací derivát; tato konstrukční hranice není totožná s file ani obecnou software library. Scope vyžaduje model komponent hardwaru.; https://spdx.org/licenses/CERN-OHL-W-2.0.html |
| permissions | ["commercial-use","conditional-relicensing","distribution","modifications","patent-grant","private-use"] | public/data/licenses/CERN-OHL-W-2.0.json#text; §2–4 dovolují kopírování, změny, výrobu i obchodní zveřejnění/šíření. §4.3 umožňuje vlastní licenci Product, pokud neomezuje práva ke Covered Source, a §7 uděluje nutné patentové nároky poskytovatele.; https://spdx.org/licenses/CERN-OHL-W-2.0.html |
| obligations | ["include-copyright","include-license-text","include-notice","mark-modifications","provide-corresponding-source","same-license","unknown"] | public/data/licenses/CERN-OHL-W-2.0.json#text; §3 požaduje relevantní notices, datovaný popis změn, Source Location podle způsobu dodání a stejnou licenci celého modified Covered Source s výjimkou Available Components a External Material. §4.1 každému příjemci dává Complete Source nebo oznámení místa; případné předepsané umístění na výrobku/balení/dokumentaci je viditelné a pevné. Complete Source obsahuje instalační a propojovací údaje a pokud jej proprietární nástroj umí vytvořit, i formát čitelný dostupným FSF/OSI nástrojem. §4.2 vylučuje zdroj External Material; Source Location je očekáváno dostupné alespoň3 roky.; https://spdx.org/licenses/CERN-OHL-W-2.0.html |
| triggers | ["distribution","modification","patent-claim","unknown","use"] | public/data/licenses/CERN-OHL-W-2.0.json#text; §3 požaduje relevantní notices, datovaný popis změn, Source Location podle způsobu dodání a stejnou licenci celého modified Covered Source s výjimkou Available Components a External Material. §4.1 každému příjemci dává Complete Source nebo oznámení místa; případné předepsané umístění na výrobku/balení/dokumentaci je viditelné a pevné. Complete Source obsahuje instalační a propojovací údaje a pokud jej proprietární nástroj umí vytvořit, i formát čitelný dostupným FSF/OSI nástrojem. §4.2 vylučuje zdroj External Material; Source Location je očekáváno dostupné alespoň3 roky.; https://spdx.org/licenses/CERN-OHL-W-2.0.html |
| restrictions | ["additional-terms","liability","patent-claim","trademark","unknown","warranty"] | public/data/licenses/CERN-OHL-W-2.0.json#text; §5 smluvně uzavírá externí vývoj/testování pro zadavatele. §6 AS IS a výluka škod obsahují také obecné hold harmless za použití včetně cizích nároků. Jména/loga jsou omezena na zákonné či nezbytné faktické použití bez dojmu podpory. §8 má okamžité ukončení, podmíněné obnovení a30 dnů od výzvy, při opakování definitivní konec.; https://spdx.org/licenses/CERN-OHL-W-2.0.html |
| patentPosition | "retaliatory-termination" | public/data/licenses/CERN-OHL-W-2.0.json#text; §7.1 výslovně nutně porušené licencovatelné nároky; §7.2 končí všechna práva při žalobě na Source/Product včetně protinároku i žádosti o neplatnost či nevymahatelnost licencovaného patentu.; https://spdx.org/licenses/CERN-OHL-W-2.0.html |
| noticeBurden | "material" | public/data/licenses/CERN-OHL-W-2.0.json#text; §3 požaduje relevantní notices, datovaný popis změn, Source Location podle způsobu dodání a stejnou licenci celého modified Covered Source s výjimkou Available Components a External Material. §4.1 každému příjemci dává Complete Source nebo oznámení místa; případné předepsané umístění na výrobku/balení/dokumentaci je viditelné a pevné. Complete Source obsahuje instalační a propojovací údaje a pokud jej proprietární nástroj umí vytvořit, i formát čitelný dostupným FSF/OSI nástrojem. §4.2 vylučuje zdroj External Material; Source Location je očekáváno dostupné alespoň3 roky. Rozsah notifikační zátěže: material.; https://spdx.org/licenses/CERN-OHL-W-2.0.html |

## Zdroje

- [Primární zdroj](https://spdx.org/licenses/CERN-OHL-W-2.0.html) — Individuálně přečten celý připnutý text; §3 požaduje relevantní notices, datovaný popis změn, Source Location podle způsobu dodání a stejnou licenci celého modified Covered Source s výjimkou Available Components a External Material. §4.1 každému příjemci dává Complete Source nebo oznámení místa; případné předepsané umístění na výrobku/balení/dokumentaci je viditelné a pevné. Complete Source obsahuje instalační a propojovací údaje a pokud jej proprietární nástroj umí vytvořit, i formát čitelný dostupným FSF/OSI nástrojem. §4.2 vylučuje zdroj External Material; Source Location je očekáváno dostupné alespoň3 roky. §7.1 výslovně nutně porušené licencovatelné nároky; §7.2 končí všechna práva při žalobě na Source/Product včetně protinároku i žádosti o neplatnost či nevymahatelnost licencovaného patentu.
- [Kurátorovaný profil](../../../data/profiles/licenses/id-Q0VSTi1PSEwtVy0yLjA.json)
- [Uložené úplné znění](../../../public/data/licenses/CERN-OHL-W-2.0.json)

## Otisk zdroje

```json
{
  "sourceId": "spdx-license-list",
  "revision": "manifest-sha256:74897699de0d23c4da42b94bf46bc6fd01f7b68ffcece9db1a98194ac277bb02",
  "contentHash": "sha256:6a32aed009db8f53267a350551cae0f28bf57ad4c6d119da36ce1afe96432406"
}
```
