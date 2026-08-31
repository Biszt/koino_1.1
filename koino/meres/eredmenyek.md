# Képesség-mérés — a Szakasz 1 tervezése előtt

*Mérve: 2026-08-26. Eszköz: [`kepessegProba.html`](kepessegProba.html) (eldobható mérőoldal).*

> **Miért mértünk tervezés előtt?** Mert négy tervezési döntés múlt rajta, és a projekt
> visszatérő tanulsága, hogy az ilyet nem saccoljuk meg.

## A mérés eredménye (Chrome 148 alapú böngésző, Windows, 8 mag)

### 1. Aláírás — a kulcs-réteg alapja (D15)

| Mit | Eredmény | Miért számít |
|---|---|---|
| **Ed25519 a WebCryptóban** | ✅ **TÁMOGATOTT natívan** | **nem kell külső kripto-könyvtár** |
| Aláírás | **0,031 ms** (~32 800/mp) | a mindennapi művelet ára gyakorlatilag nulla |
| Ellenőrzés | **0,058 ms** (~17 200/mp) | ez a fontos: minden esemény ellenőrzendő |
| **10 000 esemény ellenőrzése** | **0,58 mp** | a **D17 determinisztikus újraszámítása gyakorlatban is megy** |
| Nyilvános kulcs | **32 bájt** | a D21 „mindenki tárolja a saját lapját, ~1 KB" számítása **tartható** |
| Aláírás mérete | **64 bájt** | |
| SHA-256 (1 KB) | 0,005 ms | a Merkle-fához (Szakasz 4) bőven elég |
| *ECDSA P-256 (tartalék)* | *támogatott, de lassabb (0,12 ms) és nagyobb kulcs (65 bájt)* | **nem kell** |

### 2. Tárolás — a helyi tár

| Mit | Eredmény |
|---|---|
| IndexedDB | ✅ működik (írás + visszaolvasás) |
| Becsült kvóta | **2,48 GB** |
| Tartós tárolás (`persist`) | ⚠️ **nincs bekapcsolva** — kérni kell |

### 3. Hálózat — előretekintés a Szakasz 2-re

| Mit | Eredmény |
|---|---|
| WebRTC (`RTCPeerConnection`) | ✅ elérhető |
| Adatcsatorna (`DataChannel`) | ✅ létrehozható |
| WebSocket (jelzéshez) | ✅ elérhető |

## Amit ez a Szakasz 1 tervére jelent

1. **Nulla külső függőség a kriptográfiához.** Az Ed25519 natív — se npm-csomag, se
   ellátási-lánc kockázat, se letöltendő könyvtár. Egy P2P programnál, aminek a lényege,
   hogy **nem kell megbízni senkiben**, ez több, mint kényelem.
2. **A determinisztikus állapotszámítás (D17) reális.** Egy koino teljes története
   újraszámolható másodpercek alatt: 10 000 aláírt esemény ellenőrzése **fél másodperc**.
   *(A prototípus dev adatbázisában ~15 600 tudatpont-hozzárendelés van — nagyságrendileg
   ez az a méret, amiről beszélünk.)*
3. **A tár bőven elég** a tartalmi réteghez (2,5 GB).
4. ⚠️ **A kulcs elveszhet — és ez nem elméleti.** A böngésző alapból **kiürítheti** a tárat
   (a tartós tárolás nincs bekapcsolva). Ebből két kötelező elem következik a Szakasz 1-be:
   - `navigator.storage.persist()` kérése **rögtön a kulcs létrehozásakor**;
   - a kulcs **kimenthetősége** (és a D15 több-tanús helyreállítása így nem
     „ritka határeset", hanem a mindennapi működés része).

## Amit még meg kell mérni

- **MOBIL böngésző** (különösen iOS/Safari): az Ed25519-támogatás és a tárolási kvóta ott
  szűkebb lehet. A mérőoldal ugyanaz — csak el kell érni a telefonról.
- ✅ ~~**Nagyobb adathalmaz**~~ — **MEGMÉRVE 2026-08-31**, lásd a következő szakaszt.

---

# SKÁLA-MÉRÉS — az S1 lépés (2026-08-31)

*Eszköz: [`skalaMeres.js`](skalaMeres.js) · Node v22.16.0 · win32 · `--expose-gc`*

> **Miért mértünk tervezés előtt (megint)?** Mert a [skálázási terv](../../docs/skalazas_terv.md)
> három falat nevez meg, és **csak kettő volt mérve**. A harmadik — hogy a globális lenyomat
> megtakarítása mérettel elpárolog — **számítás** volt. A projekt visszatérő tanulsága, hogy
> az ilyet nem saccoljuk meg.

**A szintetikus tár valódi:** valódi Ed25519 kulcsok, valódi aláírások, valódi kanonikus
alak, valódi lánc, betartott tudatpont-keret (**a kivételek száma minden méretnél 0** —
tehát valódi terhelést mérünk, nem egy szűrő sebességét). ⚠️ **Feltevés benne:** az
esemény-keverék (60% tudatpont · 25% tartalom · 10% szavazat · 5% javaslat/érték) és a
200 esemény/fő. Ha a valódi használat más, ezt kell először átírni.

## Az eredmény

| esemény | e-ember | fájl | **B/esemény** | betöltés | `allapotSzamitasa` | heap | **ÁLLÁS B/fő** | **1 kör ára** | ebből hasznos | **1 mentés** |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 000 | 5 | 469 KB | 480 | 5 ms | 9 ms | 0,9 MB | 170 | 2,6 KB | 20,05% | 6,4 ms |
| 10 000 | 50 | 4,6 MB | 478 | 40 ms | 84 ms | 7,4 MB | 164 | 16,8 KB | 2,56% | 42 ms |
| 20 000 | 100 | — | 478 | — | 280 ms | — | — | 32,7 KB | — | 103 ms |
| 40 000 | 200 | — | 478 | — | 1 166 ms | — | — | 64,6 KB | — | 178 ms |
| 60 000 | 300 | — | 477 | — | 1 770 ms | — | — | 96,4 KB | — | 263 ms |
| **100 000** | **500** | **45,4 MB** | **476** | **595 ms** | **4 615 ms** | **72,5 MB** | **163** | **160,1 KB** | **0,27%** | **495 ms** |

## Négy megállapítás

### 1. ✅ A terv „C" állítása IGAZOLVA — a globális lenyomat nem ment meg

A lenyomat **egyik méretnél sem egyezett**, tehát minden kör visszaesett a részletes
ÁLLÁS-ra. És a kör ára **egyenesen arányos a koino méretével**:

| | 1 000 | 10 000 | 100 000 |
|---|---|---|---|
| egy kör ára **egyetlen** eltérő eseményért | 2,6 KB | 16,8 KB | **160,1 KB** |
| ebből hasznos adat | 20,05% | 2,56% | **0,27%** |
| egy hasznos bájtra jutó forgalom | 5 B | 39 B | **372 B** |

> ⭐ **Ez volt eddig számítás; most mérés.** A D35 megtakarítása kis közösségi hatás:
> 100 000 eseménynél **372 bájt forgalom megy egyetlen hasznos bájtért**.

### 2. ⭐⭐ A LEGKORÁBBI FAL NEM A TÁROLÁS, HANEM A BEÍRÁS — és ez nem volt a tervben

Az `esemenyMentese` minden mentésnél végigolvassa és -elemzi az **egész** fájlt
(`tar.betolt()`), a `lancVege` pedig még egyszer. Nincs gyorsítótár. Ezért **egy mentés ára
a tár méretével nő** — és N esemény beírása **négyzetes**:

| tár mérete | egy mentés | N esemény beírása ezen az úton |
|---|---|---|
| 1 000 | 6,4 ms | 3 mp |
| 10 000 | 42 ms | 3,5 perc |
| 100 000 | **495 ms** | **~6,9 óra** |

> ⚠️ **Fél másodperc EGY esemény elmentése egy 100 000 eseményes koinóban** — és egy csere
> több eseményt hoz. Ez **jóval a 43,5 GB-os tárolási fal ELŐTT** teszi használhatatlanná a
> koinót. **A terv rossz falat nevezett meg elsőnek.**

### 3. ⭐ ÚJ LELET: az `allapotSzamitasa` is négyzetes — de ez KÜLÖNÁLLÓ, JAVÍTHATÓ hiba

Nem a skálázási szerkezetből következik, hanem egy konkrét függvényből:
[`agMeretSzamitasa`](../js/allapot/allapotSzamitas.js:416) **minden entitásnál végigmegy az
összes entitáson**, rekurzívan — 7 767 entitásnál ez ~60 millió lépés.

| | 1 000 | 10 000 | 40 000 | 100 000 |
|---|---|---|---|---|
| `allapotSzamitasa` | 9 ms | 84 ms | 1 166 ms | **4 615 ms** |

**A javítás szokásos és olcsó:** egyszer felépíteni egy „szülő → gyerekek" mutatót (O(n)),
és egy utó-bejárással kiszámolni az összes ág-méretet (O(n)). ⚠️ **Felírva, még nincs
megcsinálva.**

### 4. ✅ A terv becsült számai tartják magukat

| Amit a terv becsült | Amit a mérés ad |
|---|---|
| 435 B / esemény *(9 valódi eseményből)* | **476–480 B** — a terv **alábecsülte**, +10% |
| 162 B / e-ember az ÁLLÁS-ban *(50 fővel)* | **163 B** 500 fővel — ⭐ **kiválóan tartja** |

## Amit ez a tervre jelent

> ⛔ **ELŐBB EGY KORLÁT, AMI A MÉRÉS ÉRTELMEZÉSÉRE VONATKOZIK** (Csaba, 2026-08-31).
> A mérés után kézenfekvőnek látszott a következtetés: *„javítsuk a két rövidítést, indítsuk
> az első koinót a mai szerkezettel, és cseréljük később."* **Ez nem járható** — a D21/D22
> már kizárta: *„az első kiadás is milliárdra képes program, csak kevesebb emberrel"*, és
> *„a szeletelés nem »később, ha a méret kikényszeríti«"*.
> ⭐ **Tehát az alábbi javítások KARBANTARTÁSOK, nem mérföldkövek.** Részletek:
> [`skalazas_terv.md`](../../docs/skalazas_terv.md) **0. szakasz**.

1. **A lépés-sorrend változik** — de nem a javítások felé, hanem az **illesztés** felé. A
   mérés legfontosabb szerkezeti tanulsága ugyanis nem a lassúság, hanem hogy a tár-illesztő
   **`betolt()`** művelete az **összes** eseményt adja vissza: akármilyen tárolót teszünk
   mögé, a felület kényszeríti a teljes betöltést. ⚠️ **A gyorsítótár ezt nem javítja meg —
   csak gyorsabbá teszi a rossz kérdést.**
2. **A 100 000 esemény nem sok.** 500 e-ember, 200 esemény fejenként — ez egy **falu vagy egy
   iskola**, nem egy ország. A fal tehát nem „valamikor a milliárd felé", hanem **belátható
   közelségben** van.
3. **A 2. és 3. lelet külön kezelendő:** a 3. egy mai hiba, ami a mai koinóban is javítható,
   a szeletelés kivárása nélkül.
