# SCEA — obsahová revize

SCEA Shared Source License

Revize: **2026-09-09** · pravidlo **2026-09-09.10**.

Výsledek: **zpracována, nezařazena do průvodce**.

SCEA dovoluje užití, změny a source/object distribuci. Zdrojová distribuce přikládá licenci, copyrighty, označení změn i veškerou dokumentaci; čistý objektový kód v hotové koncové aplikaci má výslovnou výjimku z notices i zdrojů. Příjemce nesmí přihlašovat práva narušující vlastnictví původních autorů.

## Předmět a rozsah

Software/dokumentace označené souborovým notice pod SCEA Shared Source; Licensor Sony Computer Entertainment America.

## Udělená práva

§2 irrevocable/nonexclusive/worldwide/perpetual/royalty-free use/modify/reproduce/distribute/public perform/display source/object. §3 patent přihlášky/ownership omezení nejsou uděleným patentovým právem.

## Podmínky a spouštěče

§5 source copyright/licence, identify modifications, celá dokumentace včetně změn. §6 object-only incorporated into finished end-user goods bez code/licence/copyright/attribution/docs. §4 dobrovolné dary mohou Sony/SCEA volně využít, nepřevádějí výhradně samotný příspěvek; integrace má Sony jako vlastníka Software/SCEA licencora.

## Omezení, výjimky a ukončení

§3 neohrozit vlastnictví přihláškou či jinou ochranou. §7 AS IS/title/noninfringement/warranty,§8 vzájemné liability limity;§9 California/US právo, San Mateo/Northern California soudy, waiver jury trial. §10 vzor source notice.

## Verze a kombinování

Dobrovolný contribution grant není povinné zveřejnění změn ani automatická náhrada softwarové licence. Žádná volba jiné/verze; copyright integračního celku nezaměnit za výlučné odebrání dárcových práv.

## Překážky a navazující práce

- Bod3 zakazuje patentové přihlášky, hledání copyrightové ochrany a další kroky narušující vlastnictví SCEA/jiných autorů. Je třeba modelovat tento zákaz registrace/přivlastnění; není to patentový grant ani patentová žalobní odveta.
- Bod5c vyžaduje všechnu doprovodnou dokumentaci a její úpravy, zatímco6 vyjímá pouze object-only v hotových end-user aplikacích. Je třeba modelovat plnou dokumentační povinnost a tuto konkrétní binární hranici, nikoli výjimku pro každou binární knihovnu.

## Metadata a jejich doložení

| Pole | Hodnota | Doložení znění |
|---|---|---|
| family | "nonstandard" | public/data/licenses/SCEA.json#text; §2 široký grant s mimořádným zákazem IP přihlášek§3 a source/doc versus finished-object cestami5–6.; https://spdx.org/licenses/SCEA.html |
| copyleftScope | "none" | public/data/licenses/SCEA.json#text; Celý text bez stejné licence derivátů a povinného zveřejnění zdrojů; voluntary contributions4 nejsou source reciprocity.; https://spdx.org/licenses/SCEA.html |
| permissions | ["commercial-use","distribution","modifications","private-use"] | public/data/licenses/SCEA.json#text; §2 výslovně use/modify/reproduce/distribute/perform/display source/object; patentová práva se neudělují.; https://spdx.org/licenses/SCEA.html |
| obligations | ["include-copyright","include-license-text","mark-modifications","unknown"] | public/data/licenses/SCEA.json#text; §5 licence/copyright/marking a all accompanying documentation+modifications;§6 jen object-only finished end-user goods bez těchto příloh.; https://spdx.org/licenses/SCEA.html |
| triggers | ["distribution","modification","use"] | public/data/licenses/SCEA.json#text; Source distribution5 plnění; object-only finished products6 výjimka; obecný zákaz3 platí v rámci výkonu užívací licence.; https://spdx.org/licenses/SCEA.html |
| restrictions | ["liability","unknown","warranty"] | public/data/licenses/SCEA.json#text; §3 patent/copyright application či other action impairing ownership mimo slovník;7–8 warranty/liability,9 jury waiver jurisdikce.; https://spdx.org/licenses/SCEA.html |
| patentPosition | "none-stated" | public/data/licenses/SCEA.json#text; No Right to File for Patent§3 je zákaz přihlášení ohrožujícího vlastnictví,nikoli výslovný patentový grant/claim termination.; https://spdx.org/licenses/SCEA.html |
| noticeBurden | "material" | public/data/licenses/SCEA.json#text; Veškerá dokumentace zdrojových kopií a binární produktová výjimka jsou materiální hranice.; https://spdx.org/licenses/SCEA.html |

## Zdroje

- [Primární zdroj](https://spdx.org/licenses/SCEA.html) — Individuálně přečten celý připnutý SPDX text; §2 široký grant s mimořádným zákazem IP přihlášek§3 a source/doc versus finished-object cestami5–6.
- [Kurátorovaný profil](../../../data/profiles/licenses/id-U0NFQQ.json)
- [Uložené úplné znění](../../../public/data/licenses/SCEA.json)

## Otisk zdroje

```json
{
  "sourceId": "spdx-license-list",
  "revision": "manifest-sha256:74897699de0d23c4da42b94bf46bc6fd01f7b68ffcece9db1a98194ac277bb02",
  "contentHash": "sha256:f3cec0a58a89c8da4d87b4bd2212c39ad06cab54d95d4b61704a49c8cc0b3a6e"
}
```
