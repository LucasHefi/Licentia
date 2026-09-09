# LPPL-1.1 — obsahová revize

LaTeX Project Public License v1.1

Revize: **2026-09-10** · pravidlo **2026-09-09.10**.

Výsledek: **zpracována, nezařazena do průvodce**.

LPPL 1.1 dovoluje neomezený běh, ale nezměněný Program se smí distribuovat jen úplný. Změněný soubor zpravidla vyžaduje jiné jméno, přiznání původního autorství, změněnou identifikaci a adresy hlášení chyb; zákaz původního jména musí nést i jeho další odvozeniny. Příjemci musí získat celý originální Program nebo dostatečné informace k jeho získání. LaTeX soubory .ins, .fd a .cfg mají vlastní výjimky/zákazy a jednotlivé soubory smějí mít další modifikační podmínky. Vlastní změněná díla nemusejí být obecně pod LPPL; pokračuje specifická jmenná podmínka.

## Předmět a rozsah

Program může být libovolný software, nejen TeX. Nezměněná distribuce musí zahrnout celý Program; autor má jednoznačně vymezit jeho soubory. Jednotlivé soubory smějí měnit pravidla vlastních úprav a šíření upravených verzí, ale nikoli přidávat podmínky na nezměněné kopie. Soukromý běh je výslovně mimo působnost licence.

## Udělená práva

Conditions dovolují úplnou nezměněnou distribuci a modifikované soubory při osmi podmínkách; explicitně zakazují modifikovat soubor s právním zákazem. Obecné užití včetně komerčního běhu není omezeno; patenty nejsou licencovány. Modifikovaná verze už nemusí obecně splnit celou LPPL, ale stále nese podmínku 7 zákazů původního jména; příjemci tedy nemusí dostat plošnou LPPL licenci odvozeniny.

## Podmínky a spouštěče

Podmínky 1–2 respektují souborové a LaTeX dodatky; 3 nové jméno; 4 původní autorství/jméno souboru a případného programu; 5 identifikace jasně mimo původní Program; 6 bug-report adresy novým správcům; 7 další licence musí zakázat původní jméno i budoucím odvozeným souborům; 8 buď celý nezměněný Program spolu/s ekvivalentním přístupem ze stejného místa, nebo dostatečná informace k jeho získání, například očekávaný bezplatný URL i pozdější verze. Každé zpřístupnění jiným, včetně instalace na víceuživatelský stroj, je distribuce. Samotné přejmenování je modifikace; aktualizace na přesný nejnovější originál je vyňata.

## Omezení, výjimky a ukončení

.ins nelze měnit. .fd má standardní cestu nebo původní jméno při změnách jen zpřístupňujících dostupné/potlačujících nedostupné fonty a s přiloženými originály. .cfg smí zachovat jméno, ale Program může omezit povolené příkazy. Doporučení neměnit ani soukromou kopii bez osmi podmínek není obecný závazek soukromých úprav, zatímco explicitní souborový zákaz změn závazný je. No Warranty vylučuje záruky a škody mimo písemnou dohodu. cfgguide.tex/modguide.tex jsou doporučená vysvětlení, nikoli skrytý další povinný grant.

## Verze a kombinování

Text nemá source/binary poskytování kompletních zdrojů odvozeniny ani obecný GPL kompatibilní přechod. Aplikační příklad uvádí 1.1 or-later, ale sám není automatickou volbou každého Programu; musí ji obsahovat konkrétní notice. Autor používající jiné distribuční podmínky má zvolit vlastní jinak pojmenovanou licenci. Individuální souborové podmínky jsou povolené jen k úpravám/upraveným verzím a musí být při konkrétním použití přečteny.

## Překážky a navazující práce

- Část Conditions zakazuje neúplnou distribuci nezměněného Programu a ukládá změněným souborům přejmenování, úpravu identifikačních/bug-report adres a přenesení zákazu původního jména na další deriváty. Podmínka 8 navíc volí přiložení celého originálu nebo informaci k jeho získání. Model tyto povinnosti neumí vyjádřit a nesmí je zaměnit za běžný source disclosure nebo same-license; je nutný vlastní model programu/souborů a těchto alternativ.
- Preambule a Additional Conditions dovolují jednotlivým souborům vlastní nadřazené modifikační podmínky včetně úplného zákazu změn; LaTeX .ins jsou neměnné, .fd a .cfg mají specifické výjimky jmen a povolených změn. Před doporučením konkrétního díla je třeba jeho úplný manifest a inventura těchto normativních notices, nikoli automatický grant libovolných změn každého souboru.

## Metadata a jejich doložení

| Pole | Hodnota | Doložení znění |
|---|---|---|
| family | "nonstandard" | public/data/licenses/LPPL-1.1.json#text; Conditions 3–8 vytvářejí zvláštní režim názvů, identity a dostupnosti celého originálu, ne standardní copyleft nebo pouhou permisivní atribuci; https://spdx.org/licenses/LPPL-1.1.html |
| copyleftScope | "none" | public/data/licenses/LPPL-1.1.json#text; Text po osmi podmínkách výslovně nevyžaduje obecné LPPL distribuční podmínky na již upravených souborech, trvá jen bod 7 jmenného omezení; to není same-license copyleft; https://spdx.org/licenses/LPPL-1.1.html |
| permissions | ["commercial-use","distribution","modifications","private-use"] | public/data/licenses/LPPL-1.1.json#text; Preambule neomezuje běh; Conditions dovolují úplný originál a kvalifikované modifikace, avšak zakazují změny právně neměnných souborů a .ins; patentový grant chybí; https://spdx.org/licenses/LPPL-1.1.html |
| obligations | ["include-copyright","include-notice","mark-modifications","unknown"] | public/data/licenses/LPPL-1.1.json#text; Body 4–5 autorství/identifikace a změny jsou notices, ale body 3,6,7,8 přejmenování, bug-report adresy, následný zákaz názvu a celý originál NEBO způsob získání nemají enum; https://spdx.org/licenses/LPPL-1.1.html |
| triggers | ["distribution","modification"] | public/data/licenses/LPPL-1.1.json#text; Conditions distribuce znamená každé zpřístupnění jiným včetně sdílené instalace; modifikace zahrnuje i přejmenování, běh explicitně není licenční trigger; https://spdx.org/licenses/LPPL-1.1.html |
| restrictions | ["liability","unknown","warranty"] | public/data/licenses/LPPL-1.1.json#text; No Warranty výslovně záruky/škody, Conditions úplnost nezměněné distribuce a souborové zákazy/jmenné podmínky i .ins/.fd/.cfg vyžadují unknown restriction; https://spdx.org/licenses/LPPL-1.1.html |
| patentPosition | "none-stated" | public/data/licenses/LPPL-1.1.json#text; Úplný text včetně LaTeX dodatků, No Warranty a aplikačního návodu neuděluje patentová práva ani nestanoví patentovou žalobní odvetu; https://spdx.org/licenses/LPPL-1.1.html |
| noticeBurden | "material" | public/data/licenses/LPPL-1.1.json#text; Původní autorství/soubor/program, nové identifikace a hlášení chyb, zvláštní LaTeX soubory a informace k získání kompletního originálu činí požadavky materiální; https://spdx.org/licenses/LPPL-1.1.html |

## Zdroje

- [Primární zdroj](https://spdx.org/licenses/LPPL-1.1.html) — Individuálně přečten celý připnutý SPDX text; Conditions 3–8 vytvářejí zvláštní režim názvů, identity a dostupnosti celého originálu, ne standardní copyleft nebo pouhou permisivní atribuci
- [Kurátorovaný profil](../../../data/profiles/licenses/id-TFBQTC0xLjE.json)
- [Uložené úplné znění](../../../public/data/licenses/LPPL-1.1.json)

## Otisk zdroje

```json
{
  "sourceId": "spdx-license-list",
  "revision": "manifest-sha256:74897699de0d23c4da42b94bf46bc6fd01f7b68ffcece9db1a98194ac277bb02",
  "contentHash": "sha256:310c3262b7a62ece19b913e23dc9575344c573c573306fc0aba8539f3c337c7c"
}
```
