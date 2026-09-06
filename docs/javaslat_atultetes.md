# A javaslat → egyezmény logika átültetése a prototípusból

*Létrehozva: 2026-09-07, Csaba kérésére: „nézd meg a koino_1.1-et. Azt kell lemásolni, azokat
a részeket módosítani, amiket kell, de a **logikai kapcsolatoknak pontosan át kell hogy
legyenek ültetve**."*

> **Mi ez a dokumentum?** Egy **leltár**: mit tud a prototípus javaslat–egyezmény
> gépezete, és ebből mi van már át a P2P koinóban. Nem terv és nem döntés — a hiányok
> listája, hogy ne találgatásból épüljön tovább.
>
> ⚠️ **A forrás mindig a prototípus kódja**, nem az emlékezet: minden sorhoz oda van írva,
> honnan való.

---

## 0. Amit Csaba eldöntött (2026-09-07)

> **Az egyezmény azonosítója AZONOS a javaslatéval — csak a státusz más.**
> *(„ha ez alatt azt érted, hogy azonos id-jük lesz, csak más státusszal, akkor rendben van.")*

⚠️ **Ez ELTÉR a prototípustól, és ez rendben van.** Ott az `Egyezmeny` **külön dokumentum**,
saját `_id`-vel és `javaslatId` hivatkozással (`backend/models/egyezmeny.js`). A koinóban
viszont az egyezmény **számítás** (D17) — nem születik esemény, ami új azonosítót adhatna.
Az azonos azonosító tehát nem kényelmi rövidítés, hanem az egyetlen mód, hogy a **D17 és a
D27/5 („az egyezmény teljes értékű entitás") egyszerre álljon**.

⭐ **De egy logikai kapcsolatot ez nem tehet zárójelbe** — lásd a 3. pontot: a prototípusban
az egyezmény **NEM ott jön létre, ahol a javaslat áll**.

---

## 1. ✅ AMI MÁR HELYESEN ÁT VAN ÜLTETVE

| Logikai kapcsolat | A prototípus forrása | A koinóban |
|---|---|---|
| **A javaslat az érintett entitás GYEREKE** | `javaslat.js`: *„A javaslat MINDIG az érintett entitás gyereke… ezért kötelező"* | ✅ `allapotSzamitas.js`: `szulo = adat.erintett` (2026-09-06) |
| **A javaslat entitás** — tudatpont, küszöb, gyerekek | `javaslat.js` séma + a pakli kártyái | ✅ 2026-09-06 |
| Négy szerkesztési művelet | `javaslatTipus` enum | 🟡 a **név** megvan mind a négyre; végrehajtója kettőnek van (`Modositas`, `Athelyezes`) |
| A döntés gépezete (küszöb, medián, részvétel, bizonyosság) | `javaslatSzamitasService.js` | ✅ `javaslatSzamitas.js` |
| Az egyezmény a **pillanatképet** viszi magával | `egyezmeny.js`: `tamogatokSzama`, arányok, `bizonyossagiMutato` | ✅ `javaslatSzamitas.js` → `egyezmeny.pillanatkep` |
| Az egyezmény **végrehajtódik** | `vegrehajtok/` | ✅ `egyezmenyVegrehajtas.js` (2026-09-06) |

---

## 2. ⛔ AMI HIÁNYZIK — a hiánylista

### 2.1 ⛔⛔ KÜLÖNVÁLÁS — az ellenzők külön ágra léphetnek

**A legnagyobb hiány, és tegnap tévesen elintéztem** („a `kulonvalasIgeny` a prototípus
fogalma — a koinóban nincs megfelelője"). Valójában **teljes, kidolgozott mechanizmus**:
`megismeres/18-kulonvalas.md` + a végrehajtásban külön szakasz
(`javaslatVegrehajtasiService.js`: *„KÜLÖNVÁLÁS: AZ ELLENZŐK KÜLÖN ÁGRA LÉPHETNEK"*, 3.A–3.E).

**A logika, pontosan:**

| A szavazás vége | Ki válhat külön | Mit visz magával |
|---|---|---|
| a javaslat **elfogadva** | az **ellenzők** | a **régi**, módosítás előtti gondolatot |
| a javaslat **elvetve** | a **támogatók** | a **módosított** gondolatot |

- ⭐ **Szavazáskor kérdezik meg** (a `kulonvalasIgeny` mező): *„Ha a döntés nem a te
  álláspontodat követi, szeretnél külön ágat?"* — tartózkodásnál a kérdés meg sem jelenik.
- ⭐⭐ **A tudatpont ÁTKERÜL, nem duplázódik.** Aki különválik, viszi a pontjait; az eredeti
  ág prioritása ennyivel csökken. *„Ez a szétválás ára: aki elmegy, viszi a súlyát."*
- **A leszármazottak a tudatpont-tulajdon szerint költöznek:** csak a különválóknak van rajta
  pont → átköltözik · mindkét oldalnak → **mindkét ágon megmarad** · a különválóknak nincs →
  marad.
- **Az érték javaslatok is mennek** — ezért a két ág küszöbei eltérhetnek.
- ⭐ **A FŐÁG tartja meg az azonosítót** — így a régi hivatkozások a főágra mutatnak tovább.
- A kártyán **„Másik ág" fül**, és a két ág később **újra egyesíthető**.

🔍 *Ez a D14-gyel és a tudatpont-modellel tökéletesen összefér — nem új mechanizmus, hanem a
meglévők átrendezése. De egyetlen sora sincs meg a koinóban.*

### 2.2 ⛔ Az egyezmény HELYE — `egyezmenyTarhelyId`

`javaslat.js`: *„Hol jön létre az EGYEZMÉNY, ha a javaslatot elfogadják **(nem a javaslat
helye!)**. Típusonként a service vezeti le:"*

| Művelet | Hova kerül az egyezmény |
|---|---|
| **Törlés** | az érintett **szülője** |
| **Módosítás / Áthelyezés** | maga az **érintett entitás** |
| **Egyesítés** | placeholder → a végrehajtáskor az **új entitás** |

⭐⭐ **És itt van, amit az azonos-azonosítós megoldás miatt külön kezelni kell.** Ha az
egyezmény ugyanaz az entitás, mint a javaslat, akkor a helye a javaslat helye — vagyis az
érintett entitás alatt van. Ez:

- ✅ **Módosításnál és áthelyezésnél PONTOSAN a prototípus válasza** — nincs teendő;
- ⚠️ **Törlésnél HIBÁS**: az érintett megszűnik, tehát az egyezménynek **fel kell lépnie**
  eggyel (az érintett szülőjéhez), különben nem létező entitás alatt lógna;
- ⚠️ **Egyesítésnél HIBÁS**: az egyezménynek az **új** entitás alá kell kerülnie.

*Vagyis a végrehajtásnak a `Torles` és az `Egyesites` esetén a szülőt is igazítania kell.*

### 2.3 ⛔ `erintettEntitasok` — TÖMB, nem egy

`javaslat.js`: *„Egy vagy több entitás, amelyekre a javaslat vonatkozik"*, típusonként
`['Gondolat','Kategoria','GondolatTipus','Egyezmeny']`.

A koinóban ma **egy** `erintett` string. ⚠️ Az **egyesítéshez** legalább kettő kell (a két
forrás), és a **D27/5** szerint egy **egyezmény is lehet érintett**.

### 2.4 ⛔ `Csomag` javaslat és a TÖREDÉKEK

Az ötödik javaslat-típus: `['Torles', 'Modositas', 'Egyesites', 'Athelyezes', **'Csomag'**]`,
a `toredekCsoportId` / `toredekSorszam` / `toredekDarab` mezőkkel. Egy összetett javaslat
**töredékekre bomlik**, amik együtt élnek és együtt dőlnek el
(`vegrehajtok/csomagVegrehajto.js`, 10 KB).

A koinóban nincs — sem típus, sem töredék-fogalom.

### 2.5 ✅ `Hiba` státusz — NEM hiány (megmérve)

A prototípus séma négy státuszt sorol fel: `['Aktiv', 'Elfogadva', 'Elvetve', 'Hiba']`, a
koino hármat (`folyamatban` / `elfogadva` / `elvetve`).

⚠️⚠️ **De ez nem hiány, és elsőre tévesen annak írtam.** A `'Hiba'` az EGÉSZ prototípusban
**két helyen fordul elő**, és egyik sem állítja be:

```
backend/models/javaslat.js:213          enum: ['Aktiv','Elfogadva','Elvetve','Hiba']
backend/services/javaslat/javaslatService.js:943   megengedettStatuszok = [… 'Hiba']
```

⭐ Vagyis **fenntartott hely**, nem élő mechanizmus — a prototípus is csak hármat használ.
A koino három státusza tehát **pontosan azt tudja, amit a prototípus valójában csinál**.

🔍 *Tanulság a leltárhoz: a séma nem a viselkedés. Amit a modell felsorol, azt meg kell nézni
a kódban is — különben olyat „ültetünk át", ami ott sincs.*

⏸️ Ami viszont **valódi kérdés** marad: ma az `egyezmenyVegrehajtas.js` a végre nem hajtható
egyezményt a `kihagyottak` listába teszi, a javaslat státusza pedig „elfogadva" marad. Ez a
prototípussal **egyezik** — de érdemes lehet többet mutatni, mint amennyit ő tudott.

### 2.6 🟡 Két végrehajtó hiányzik

`Torles` és `Egyesites` — a prototípusban `torlesiVegrehajto.js` (5 KB) és
`egyesitesiVegrehajto.js` (19,9 KB). ⚠️ Az egyesítés a legnagyobb végrehajtó, és a
`egyesitesAdatok` mező is hozzá tartozik.

---

## 3. ⏸️ ÉS AMI A PROTOTÍPUSBAN SINCS: az általános javaslat/egyezmény

*Csaba (2026-09-07): „Az általános javaslat → egyezmény az még nem létezik a koino_1.1-ben,
azt még ki kell találni."*

A **D27** leírja, mit KELL tudnia (`fejlesztesi_terv_fazis2.md`), de nincs kód, amit másolni
lehetne — ez **tervezés**, nem átültetés. A D27 összefoglalója és a hiánylistája a
[`szakasz5_terv.md`](szakasz5_terv.md) 16. szakaszában áll.

⭐ **Egy dolog viszont már most látszik:** a **különválás** (2.1) és az általános egyezmény
**csatlakozás/tiltakozás** művelete ugyanarról szól két irányból — *ki áll mögötte MOST*. A
kettőt érdemes együtt átgondolni, mert ugyanaz a tudatpont-mozgatás van alattuk.

---

## 4. Javasolt sorrend

*A `Hiba` státusz kikerült a listáról: megmérve nem hiány (2.5).*

1. **`erintettEntitasok` tömbbé** (2.3) — ez a legalsó kő: **enélkül az egyesítés meg sem
   fogalmazható**, és a D27/5 („egyezmény is lehet érintett") sem.
   ⚠️ *Esemény-alak változás:* a meglévő `Javaslat` események `erintett` (string) mezőt
   hordoznak, tehát a számításnak **mindkettőt** olvasnia kell — a régi tárak nem
   érvényteleníthetők.
2. **Az egyezmény helyének igazítása** törlésnél és egyesítésnél (2.2) — ez teszi az
   azonos-azonosítós döntést teljessé. *Csak a hozzájuk tartozó végrehajtóval együtt van
   értelme.*
3. **`Torles` és `Egyesites` végrehajtó** (2.6).
4. **Különválás** (2.1) — a legnagyobb, és a legszebb; a 1–3. után áll össze, mert
   tudatpont- és érték javaslat-mozgatásra épül.
5. **Csomag/töredék** (2.4).
6. **Általános javaslat/egyezmény** — ⏸️ **tervezés, nem átültetés** (3. pont).

⭐ **És egy megfigyelés a sorrendhez:** a **különválás** (2.1) és az általános egyezmény
**csatlakozás/tiltakozás** művelete ugyanazt a kérdést feszegeti — *ki áll mögötte MOST, és
hova viszi a súlyát*. Ha a különválás tudatpont-mozgatása megépül, a csatlakozás/tiltakozás
nagy része már ott lesz.
