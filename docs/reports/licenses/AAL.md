# AAL — obsahová revize

Attribution Assurance License

Revize: **2026-09-09** · pravidlo **2026-09-09.10**.

Výsledek: **zpracována, nezařazena do průvodce**.

AAL vyžaduje při distribuci ověřitelný text podepsaný GPG; binární verze a každý závislý program při každém spuštění výrazně zobrazí jméno, profesní identifikaci a URL autora. Záruky a odpovědnost jsou vyloučeny.

## Předmět a rozsah

Software se vzorovými údaji autora; Code zahrnuje zdroj celku/částí a změny, startovací pravidlo i závislé programy.

## Udělená práva

Redistribution/use source/binary with or without modification; bez výslovného patentového grantu.

## Podmínky a spouštěče

Bod 1 prominentní ověřitelný GPG text ve zdrojových redistribucích. Bod 2 tentýž text v binární dokumentaci a při každém spuštění výrazná name/professional identification/URL atribuce.

## Omezení, výjimky a ukončení

Bod 3 endorsement autorovým jménem/známkou jen s písemným souhlasem. Bod 4 uživatel odpovídá za pravidla zařízení, jiné licence i místní právo včetně šifrování. AS IS a široké warranty/liability.

## Verze a kombinování

Bez jiné licence/verze a bez stejné licence celého díla; závislý program je rozsah UI atribuce, nikoli automatický copyleft.

## Překážky a navazující práce

- Body 1–2 požadují GPG-signed text in verifiable form, ale připnutý vzor podpis ani identitu autora neobsahuje. Je třeba získat konkrétní ověřitelný podepsaný text a modelovat zachování/verifikaci podpisu; obyčejné include-license-text nestačí.
- Startovací atribuce se vztahuje i na program dependent thereon při každém spuštění. Je třeba určit konkrétní závislé programy a zachovat tento rozsah/UI spouštěč; nelze jej omezit na samotnou knihovnu.

## Metadata a jejich doložení

| Pole | Hodnota | Doložení znění |
|---|---|---|
| family | "nonstandard" | public/data/licenses/AAL.json#text; Grant má zvláštní kryptograficky ověřitelný notice a opakovanou UI atribuci závislých programů.; https://spdx.org/licenses/AAL.html |
| copyleftScope | "none" | public/data/licenses/AAL.json#text; Celý text bez stejné licence a zdrojového zveřejnění; dependent program pravidlo je acknowledgment, ne copyleft.; https://spdx.org/licenses/AAL.html |
| permissions | ["commercial-use","distribution","modifications","private-use"] | public/data/licenses/AAL.json#text; Grant source/binary use/redistribution with or without modification bez účelového zákazu.; https://spdx.org/licenses/AAL.html |
| obligations | ["include-license-text","include-use-acknowledgment","unknown"] | public/data/licenses/AAL.json#text; Body 1–2 GPG signed/verifiable text a každé spuštění name/profession/URL; podpis není běžný textový notice.; https://spdx.org/licenses/AAL.html |
| triggers | ["distribution","use"] | public/data/licenses/AAL.json#text; Source/binary distribution spouští signed text; each time executable or dependent program launched spouští use acknowledgment.; https://spdx.org/licenses/AAL.html |
| restrictions | ["liability","trademark","warranty"] | public/data/licenses/AAL.json#text; Bod 3 autor naming/endorsement, bod 4 odpovědnost za jiné režimy; závěr warranty/liability včetně malicious network access škod.; https://spdx.org/licenses/AAL.html |
| patentPosition | "none-stated" | public/data/licenses/AAL.json#text; Celý text bez výslovného patentového grantu či patentového ukončení.; https://spdx.org/licenses/AAL.html |
| noticeBurden | "material" | public/data/licenses/AAL.json#text; Ověřitelný podpis a prominentní banner při každém spuštění jsou materiální povinnosti.; https://spdx.org/licenses/AAL.html |

## Zdroje

- [Primární zdroj](https://spdx.org/licenses/AAL.html) — Individuálně přečten celý připnutý SPDX text; Grant má zvláštní kryptograficky ověřitelný notice a opakovanou UI atribuci závislých programů.
- [Kurátorovaný profil](../../../data/profiles/licenses/id-QUFM.json)
- [Uložené úplné znění](../../../public/data/licenses/AAL.json)

## Otisk zdroje

```json
{
  "sourceId": "spdx-license-list",
  "revision": "manifest-sha256:74897699de0d23c4da42b94bf46bc6fd01f7b68ffcece9db1a98194ac277bb02",
  "contentHash": "sha256:6ab6bed6b583619981568b4c2063144c37526e779fe66e64323abb858e61e7db"
}
```
