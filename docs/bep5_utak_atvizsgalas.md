# A koinó többi BEP 5 útja — átvizsgálás (2026-11-05, kód nélkül)

> **Állapot:** átvizsgálás — ⏸️ a kérdések (BP1–BP4) Csabáé. A belépő megtalálásának átvizsgálása (`belepo_megtalalasa_atvizsgalas.md`
> 7.) mondta ki, hogy a koinó többi BEP 5 útja ugyanattól a szennyezéstől szenved, mint a belépő cetlije — ez az a „külön
> átvizsgálás”. Semmi nem épült belőle.

## 1. A lelet (87. mérés, 2026-11-04 terep)

A BitTorrent-DHT „ki tartja ezt a témát” útja (BEP 5: `announce_peer` / `get_peers`):
- **témánként dől el:** egy témát vagy mindig megtalál a keresés, vagy soha (75%; egy második, friss kliens nem segít) — a
  bejelentés „8/8 gép tárolta” akkor is, ha senki nem kapja vissza;
- **hamisítódik:** a bejelentést figyelő gépek a saját címükkel adják vissza (a mi portunkon idegen IP-k), és bármilyen témára
  ugyanazok a címek jönnek (a 2026-11-04-i terep „zaja” — a laptop minden körben rájuk is kopogott; 2026-11-05 reggel a `terep4`
  őrjárata az M8-cal együtt is „1 kérő vár rám”-ot mutatott a valódi hálón).

Az aláírt bejegyzés (BEP 44 — a hirdetőtábla és, 2026-11-05 óta, a meghívó rekesze) **100%-ban megtalálható, és nem hamisítható**.

**Ami már enyhít:** az M3 (a) (2026-11-05) a 3 kör óta néma kopogtató és régió-társ címeket 6 órára kihagyja — a zaj így nem eszi
a kopogásokat. A *hiányt* (a valódi bejelentés el sem jut a keresőhöz) nem pótolja.

## 2. A leltár — hol használja a koinó a BEP 5-öt

1. **A gyökér-darab hirdetése** (D91/3, D95/4, D110): minden készülék a saját darabját hirdeti (~20 percenként); erre épül a hideg
   indulás (egy friss készülék a gyökér fejléceihez tartót keres — a függő kérelem `gyoker:m:d` kopogtatói és a DHT-keresés).
2. **A vállalt szeletek hirdetése** (alapból 0 — a készülék beállítása) és a `hozd` / a függő kérelem közvetlen keresése a szelet
   témáján, ha a raj nem ismer tartót.
3. **A kopogtatók** (D92/1): a kérő a tartó készülék-témáján (vagy egy hirdetett téma párján) jelentkezik a címével, a tartó a
   címjegyzék-körében ránéz, és visszakopog — ez nyitja a rést két NAT között (a D111 tartó-tipp is ezen megy).
4. **A kereső-réteg** (D105–D107): a régió hirdetése és a régió-társak (③c), a felajánlás céljai (④c), a kérdés tartói (⑤).
5. **A belépő jelentkezése** (MH6) — 2026-11-05 óta a fő út a meghívó rekesze (M8, BEP 44), a BEP 5 mellette maradt.

⭐ **Ami NEM BEP 5:** a raj (D91 — a „mi kinél van” fő útja a fa és a csere `RESZVETEL`-je), a kötések és a hirdetőtábla (BEP 44):
egy már ismert társ megtalálása nem a BEP 5-ön múlik. A BEP 5 a **hideg indulás** és az **idegen** útja: amikor még senkit nem
ismerünk, aki tartja, amit keresünk.

## 3. Miért nem költözik egy az egyben a BEP 44-re

A BEP 44 rekesze **egy írótól egy érték** (a kulcspár és a só egy bejegyzést nevez meg, a nagyobb sorszám felülírja a kisebbet); a
BEP 5 témája **sok író listája**. A belépőnél (M8) ez illett: egy meghívó — egy belépő — egy rekesz, és a kulcs a közös titokból
jött. A „ki tartja X-et” kérdésnél viszont sok tartó van, és a kérdező nem tudja előre, kik.

## 4. A lehetőségek útonként

- **(i) A kopogtatók (3.) — a legtöbbet érő:** a tartó **postaládája** BEP 44-en: a kulcspár a tartó tábla-aláírójából és a koinó
  nevéből számítható (bárki, aki a kettőt tudja, írhat bele), a postaládának S rekesze van (a só = lenyomat(téma | i), i < S), a kérő a
  saját tábla-kulcsa szerinti rekeszbe írja a címét titkosítva (a tartó nyilvános titkosító-kulcsára — csak ő olvassa), a tartó a
  címjegyzék-körében S rekeszt néz meg. ⚠️ Ára: S keresés körönként (~16 mp, ~7,5 KB egy — 87. mérés), és aki a koinó nevét és a tartó
  aláíróját tudja, felülírhat egy rekeszt (egy kérőt kiszoríthat — hamisítani nem tud). A D111 tippje és a régi MH6 ugyanezt kapná.
- **(ii) A gyökér-darab és a kereső-régió (1., 4.) — sok hirdető:** (a) marad a BEP 5, és mérni kell, hogy egy témán SOK hirdetőnél
  (egy élő koinó gyökér-darabja) is „vagy mindig, vagy soha”-e — több hirdető több tároló géphez juttatja a bejelentést, a hiány itt
  talán ritkább (a 87. egy hirdetőt mért); (b) ugyanaz a rekeszes alak, mint az (i)-ben, de a kulcs a koinó nevéből és a darabból
  (a darab tartói közül legfeljebb S kerül bele — a hideg induláshoz egy is elég); (c) a hideg indulást a meghívó vigye: a belépő a
  meghívótól kapja az első tartók listáját (a meghívó gépe maga is tartó — D122 óta a belépő úgyis vele cserél először).
- **(iii) A vállalt szeletek hirdetése (2.):** alapból ki van kapcsolva (0), a raj fedezi — elég kimondani a dokumentációban, hogy
  a DHT-n talált tartó bizonytalan, és az M3 (a)-hoz hasonló szűrés vonatkozzon rá is.

## 5. Előbb a mérés (88. javaslat)

- **(a) sok hirdető egy témán:** a valódi DHT-n N = 1, 5, 20 kliens hirdeti ugyanazt a témát (külön portról); egy friss kereső hányszor
  és hány valódi hirdetőt kap vissza, és mennyi a zaj — ebből dől el, hogy a gyökér-darab és a kereső-régió BEP 5-ön maradhat-e;
- **(b) a postaláda ára:** S = 4, 8, 16 rekesz BEP 44-en — a kiírás és a végignézés ideje és bájtja, és a rekeszek találati aránya
  (a 87. mérés szkriptje — `dhtTalalatMeres.js` — kiterjeszthető; egy gépen, két szerepben futtatható).

## 6. A kérdések (⏸️ Csabáé)

- **BP1 — mérjünk előbb?** (A) ⭐ igen, a 88. mérés (a)+(b) egy gépen (a laptopon, a valódi DHT-n — ~1–2 óra futás); (B) a mérés
  nélkül, a (i) postaládával.
- **BP2 — a kopogtatók útja:** (A) ⭐ a tartó postaládája BEP 44-en (i), a BEP 5 mellette marad (mint az M8-nál — B6 (a)); (B) marad
  a BEP 5 + az M3 (a) szűrője.
- **BP3 — a hideg indulás:** (A) a mérés (88/a) dönti el: ha sok hirdetőnél megbízható, marad; ha nem, (ii)(b); (B) ⭐ mellette a
  meghívó is hozza az első tartókat (ii)(c) — olcsó, és a zárt koinóban a belépő úgyis a meghívóval kezd.
- **BP4 — a sorrend a többi munkához képest:** a terepi próba (egy mobilnetes telefon) előtt vagy után? Javaslat: **után** — a terep
  megmutatja, a belépő mennyire jut be az M5–M8-cal, és hogy a BEP 5 hiánya a gyakorlatban hol fáj.

*Kapcsolódik:* `belepo_megtalalasa_atvizsgalas.md` (7–8.), `koino/meres/eredmenyek.md` 58. (a BEP 5 a valódi DHT-n), 87. (a cetli
elvész és hamisítódik), `skalazas_terv.md` (D91 — a raj és a címjegyzék).
