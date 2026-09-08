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
| Négy szerkesztési művelet | `javaslatTipus` enum | ✅ **mind a négynek van végrehajtója** (2026-09-07) |
| A törlés = **tudatpont-visszaosztás**, az entitás 0 pontnál szűnik meg | `torlesiVegrehajto.js` | ✅ `szerkesztesiVegrehajtas.js`: `torles` (2.6) |
| A törölt entitás gyerekei **FELKERÜLNEK** a szülőjéhez | `entitasTorleseEllenorzese` kaszkádja | ✅ `allapotSzamitas.js`: `arvakFelkerulese` (2.2/b) |
| Egyesítés: pontok emberenként, gyerekek az egyesítetthez, közös ős | `egyesitesiVegrehajto.js` | ✅ `szerkesztesiVegrehajtas.js`: `egyesites` (2.6) |
| A döntés gépezete (küszöb, medián, részvétel, bizonyosság) | `javaslatSzamitasService.js` | ✅ `javaslatSzamitas.js` |
| Az egyezmény a **pillanatképet** viszi magával | `egyezmeny.js`: `tamogatokSzama`, arányok, `bizonyossagiMutato` | ✅ `javaslatSzamitas.js` → `egyezmeny.pillanatkep` |
| Az egyezmény **végrehajtódik** | `vegrehajtok/` | ✅ `szerkesztesiVegrehajtas.js` (2026-09-06) |
| **Az érintettek TÖMBJE**, entitásonkénti művelettel | `javaslat.js`: `erintettEntitasok` | ✅ 2026-09-07 (2.3) |
| **A jogosultság metszet a beadásnál** | `javaslatJogosultsagService.js` | ✅ `szabalyok.js` (2026-09-07) |
| **A döntés érintettenként, ÉS-sel** (töredék-modell) | `javaslatService` + `javaslatIdozitesService` | ✅ `javaslatSzamitas.js`: `reszekSzamitasa` (2026-09-07, 2.3/c) |
| **Típus-alapú tiltások** (egyezmény/kategória/gondolattípus) | `javaslatService.js:87–113` | ✅ `szabalyok.js`: `TILTOTT_MUVELETEK` (2026-09-07) |
| **Az egyesítés nem keverhető** más művelettel | `javaslat.js` Csomag-validátor | ✅ `szabalyok.js` (2026-09-07) |

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

### ✅ 2.1/b MEGÉPÍTVE: a MÓDOSÍTÁSI különválás (2026-09-08)

A prototípus `_kulonvalasokVegrehajtasa` + `kulonvalasService` első köre átjött — a **hatóköre
is ugyanaz**: `Modositas`, elfogadott javaslat, az **ellenzők** viszik a **régi** változatot.

| Lépés | A koinóban |
|---|---|
| **Ki válik külön** | aki `Ellenez`-t szavazott **ÉS** kért külön ágat (`kulonvalasIgeny`) |
| **Tartózkodó** | ⛔ SOHA — a művelet hamisra állítja, **és a számítás is ellenőrzi** |
| **Mit visz** | a módosítás **ELŐTTI** cím és szöveg (a végrehajtás a felülírás előtt elteszi) |
| **A tudatpont** | **átkerül, nem duplázódik** — a főág prioritása ennyivel csökken |
| **A két ág** | össze van kötve: `kulonvalasok: [{ testverId, testverTipus, testverCim, agSzerep, kulonvalasIdeje }]` |

⭐ **Az összekötés alakját nem kellett kitalálni**: a prototípus `GondolatKartya.js`
„Másik ág" füle pontosan ezt olvassa.

⛔⛔ **A FŐÁG NEM ESHET NULLÁRA.** Ha a végrehajtáskor már mindenki a különválók közt van, a
szétválás **nem történik meg** — különben a főág gazdátlanul eltűnne (D14), vagyis a
„szétválás" valójában elvinné az egészet. ⭐ A kihagyás **látszik** (`kihagyottak`, D19).

⚠️⚠️ **És ezt a próbát először VAKRA írtam:** elvetett javaslattal, ami el sem jut az őrig —
a rontás-próba buktatta le (az őrt kikapcsolva semmi nem bukott). A valódi eset ravaszabb: a
**támogatók a szavazás UTÁN veszik el a pontjaikat**, tehát a döntés elfogadva marad (a
lezárás pillanata szerint), de a végrehajtáskor már csak a különválni akaró ellenző a gazda.


### ✅ 2.1/c ÉS A LESZÁRMAZOTTAK SZÉTOSZTÁSA (2026-09-08)

A prototípus `_leszarmazottakSzetosztasa`-ja, **három kimenettel, leszármazottanként külön**:

| Kimenet | Feltétel | Mi történik |
|---|---|---|
| **MARAD** | a különválók közül senkinek nincs rajta pontja | a főágon marad — ⚠️ ha a szülője elköltözött, a **legközelebbi megmaradt ősre** kötjük át |
| **KÖLTÖZIK** | csak a különválóknak van rajta pontja | az egész entitás átvándorol, **a pontjaival együtt** (nincs pont-mozgatás, csak a szülője változik) |
| **DUPLÁZÓDIK** | mindkét oldalnak van rajta pontja | mindkét ágon kell egy példány |

⭐⭐ **ÉS A DUPLÁZÓDÁSNÁL A FEJSZÁM DÖNT (Csaba, 2026-09-08):** *„ha többen vannak valahol a
radikális ellenzők, mint a többiek, akkor ők tarthatják meg az id-t."* Az eredeti azonosítót
**az az oldal viszi, ahol több ember áll**; a másik kapja a származtatott nevet. ⭐ **A szerző
másolódik**, attól függetlenül, hogy tulajdonos-e még.

⚠️ **Egyenlőségnél a főág tartja** — valamit dönteni kell, és ez determinisztikus, senkit nem
jutalmazó választás (ugyanaz a mintázat, mint az elágazás-feloldásnál).

⚠️ **A GYÖKÉRNÉL viszont NEM a fejszám dönt**, hanem a főág tartja az azonosítót: ez a
prototípus viselkedése, és Csaba a fejszám-szabályt a **duplázódó leszármazottakra** mondta
ki. ⏸️ Ha a gyökérre is ki kell terjeszteni, az külön döntés.

⚠️⚠️ **ÉS EGY MÁSODIK VAK PRÓBA UGYANEBBEN A MENETBEN:** az **árva-átkötés** ága méretlen volt
— kikapcsolva semmi nem bukott, mert az összes próbám egyszintű ágat használt. A valódi eset
**két szintet** kíván: a középső elköltözik, az alsó marad — és ilyenkor az alsó egy olyan
szülőre mutatna, ami már a másik ágon van.


### ✅ 2.1/d A TÜKÖR-ESET ÉS AZ ÉRTÉK JAVASLATOK (2026-09-08) — a különválás KEREK

**A szimmetria bezárult.** A prototípus: *„Elfogadott javaslatnál az ELLENZŐK viszik a RÉGI
állapotot; elvetettnél a TÁMOGATÓK a MÓDOSÍTOTTAT."*

| A szavazás vége | Ki léphet külön | Mit visz | A főág |
|---|---|---|---|
| **elfogadva** | az **ellenzők** (akik kérték) | a **régi** cím/szöveg | a módosított |
| **elvetve** | a **támogatók** (akik kérték) | a **módosított** cím/szöveg | ⛔ **változatlan** |

⚠️ **Ez MÁSIK BELÉPÉSI PONT, nem elágazás a meglévőben:** az elvetett javaslatnak **nincs
egyezménye**, tehát a végrehajtás nem indulhat abból. ⭐ A megoldás: a végrehajtás sora
mostantól **az elvetett szerkesztési javaslatokat is** tartalmazza — ha van támogató, aki
külön ágat kért. A sorrend közös: a **lezárás ideje** szerint, elfogadott és elvetett
egyformán. *Ami korábban dőlt el, előbb hat.*

⛔ **Amit az elvetett eset NEM tesz:** nem ír át semmit. A főág marad, ami volt — csak azok
lépnek ki, akik a módosítást akarták.

### ⭐⭐ ÉS AZ ÉRTÉK JAVASLATOK IS ÁTVÁNDOROLNAK

*„Az érték javaslatok is mennek — ezért térhetnek el a két ág küszöbei."* A prototípus a
pont-átvitel **után** viszi őket, mert érték javaslatot csak az adhat, akinek van tudatpontja
az entitáson. A koinóban ugyanez **számítás**: az új ág küszöbei a **különválók** érték
javaslatainak mediánja, a főágé pedig **újraszámolódik nélkülük**.

⚠️ Ha a különválóknak nincs saját érték javaslata, az új ág a **forrás küszöbeit örökli** —
jobb, mint az alapértelmezésre esni: abból indul, amit eddig ismert.

### ⭐⭐ A SZÁRMAZTATOTT AZONOSÍTÓ — és mibe került

A különvált ág **új entitás**, amihez nem tartozik esemény. Az azonosítója
`lenyomat({ fajta: 'kulonvalas', forras, egyezmeny })` — vagyis **ugyanolyan alakú, 43
karakteres lenyomat**, mint bármelyik másik; a különbség az, hogy **nincs mögötte aláírás,
csak levezetés**. Ez Csaba 2026-09-07-i kimondása: *minden azonosító aláírt eseményekből
számítható; a lenyomat ennek a különleges esete.*

⚠️ **Az ára: a harmadik fázis ASZINKRON lett**, mert a `lenyomat` a WebCryptót hívja. A másik
út (kézzel összefűzött név) elkerülte volna ezt, de akkor a koinóban **kétféle
azonosító-alak** lenne. A hívók amúgy is aszinkronok voltak, tehát az ár kicsi
(`kepetKerni`, `kepetKeszit`, a próbák `kep()`-je), a nyereség pedig **egységes
azonosító-modell**.

### ⏸️ Ami a különválásból még hátravan

- ✅ **A tükör-eset** — **KÉSZ (2026-09-08)**, lásd 2.1/d.
- ✅ **A leszármazottak szétosztása** — **KÉSZ (2026-09-08)**, lásd 2.1/c.
- ✅ **Az érték javaslatok átvándorlása** — **KÉSZ (2026-09-08)**, lásd 2.1/d.
- **Az egyesítés-változat** (a vesztes gondolat megmarad, ha van radikális ellenzője).

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
- ✅ **Törlésnél MEGOLDVA (2026-09-07), és külön szabály NÉLKÜL.** Az érintett megszűnik,
  tehát az egyezmény árva lesz — az **árva-szabály** pedig felviszi a legközelebbi élő
  felmenőhöz, ami épp a törölt entitás szülője. *Pontosan a prototípus válasza, csak nem
  külön eset, hanem egy általánosabb szabály következménye.*
- ✅ **Egyesítésnél is MEGOLDVA (2026-09-07), szintén külön szabály nélkül.** Csaba döntése
  szerint nem születik új entitás: az **első érintett olvasztja be a többit** — és a javaslat
  szülője úgyis az első érintett, tehát az egyezmény pontosan ott van, ahol lennie kell. ⭐ A
  prototípusnak ehhez placeholder-feloldás kellett (2.6).

### 2.2/b ⭐⭐ ÉS AMI EBBŐL KIDERÜLT: az árvák felkerülése (2026-09-07)

A prototípus `entitasTorleseEllenorzese`-je a 0 pontos entitás törlésekor **minden gyerekének
átírja a `szuloId`-ját a törölt entitás szülőjére** — a „KASZKÁD" itt **felkerülést** jelent,
nem törlést. *A gondolat nem tűnhet el csak azért, mert a szülőjét elfelejtették.*

⛔ **A koino ezt eddig nem tette meg**, és ez mérhető kár volt: a gyerek egy nem létező
szülőre mutatott, ezért az ág-összesítés ott **megszakadt** (`if (!szulo) continue`), és a
hierarchikus rendezés elveszítette az egész alsó ágat. ✅ Megépítve (`arvakFelkerulese`), és
**nem csak a törlésre**: a D14 szerinti felejtésre is — az a gyakoribb eset, és a prototípusban
is ugyanaz a függvény intézi.

⚠️⚠️ **Egy különbségtétel viszont kellett, ami a prototípusban nem létezhetett:** ott minden
entitás megvolt az adatbázisban, itt a hiányzó szülő **kétféle** lehet. Ha **ismertük és
elfelejtették** → felkerülés. Ha **soha nem láttuk** (a létrehozó eseménye még nem érkezett
meg) → **nem nyúlunk hozzá**: az hiány, nem tény (D19). Különben egy lemaradt készüléken fél
pakli ugrana a gyökérre, majd a hiányzó esemény megérkezésekor vissza — vagyis két gép mást
mutatna ugyanarról.

### 2.3 ✅ `erintettEntitasok` — TÖMB, nem egy — **MEGÉPÍTVE (2026-09-07)**

`javaslat.js`: *„Egy vagy több entitás, amelyekre a javaslat vonatkozik"*, típusonként
`['Gondolat','Kategoria','GondolatTipus','Egyezmeny']`.

Eddig a koinóban **egy** `erintett` string volt. ⚠️ Az **egyesítéshez** legalább kettő kell
(a két forrás), és a **D27/5** szerint egy **egyezmény is lehet érintett**.

⭐ **Amit a prototípus alakja megmondott, és amit ebből átvettünk:**

- **A művelet ENTITÁSONKÉNTI.** A tömb minden eleme `{ entitas, muvelet, valtozas }` — egy
  csomagban az egyik gondolat módosul, a másik áthelyeződik. A végrehajtás ezért **elemenként**
  fut (`egyReszVegrehajtasa`), és egy elem elakadása **nem dönti el a többit**: a `kihagyottak`
  megnevezi, melyik akadt el és miért (D19).
- ⛔⛔ **A BEADÁSHOZ a jogosultság METSZET, nem unió** — `javaslatJogosultsagService.js`:
  *„rendelkezik-e tudatponttal MINDEN érintett entitáson"*, és a `javaslatService.js:494` a
  **teljes listával** hívja. Enélkül egy egyesítést be lehetne adni úgy, hogy a másik
  gondolathoz semmi közöd — pedig az is megszűnne tőle. (`szabalyok.js`)
  ⚠️ **A SZAVAZÁSRA viszont NEM ez vonatkozik** — azt először tévesen ide is átvettem; ott a
  töredék dönt, lásd 2.3/c.
- ⚠️ **A RÉGI ESEMÉNYEK ÉRVÉNYESEK MARADNAK.** Az aláírás a régi bájtokra szól: a `erintett`
  (string) alak **egy elemű listaként** olvasódik be (`szabalyok.js`, `erintettek()`), és a
  próbák nagy része továbbra is a régi alakot használja — vagyis a visszafelé-olvasás **mérve
  van**, nem ígéret.
- ⚠️ **Az `entitasTipus` mezőt szándékosan NEM vettük át**: a prototípusnak a polimorf
  Mongo-hivatkozás miatt kellett; a koinóban a típus **magában az entitásban** van. Egy második,
  aláírt, de **hazudható** forrás ugyanarról nem érték, hanem kockázat.
- ⭐ **Az ismeretlen műveletet a szabály-réteg NEM dobja el.** Először megírtam (a prototípusban
  Mongoose-enum őrizte), de rossz: az ismeretlen művelet legvalószínűbben **egy újabb
  program-változat**, és ha a régebbi készülék kidobná, a két gép **más javaslat-halmazt látna**.
  Így a `JAVASLAT_MUVELETEK` nem kapu, hanem a MAI lista: azt mondja meg, mit tudunk végrehajtani.

### 2.3/b ⛔⛔ ÉS EGY VALÓDI RÉS, AMIT A PRÓBA TALÁLT: a szavazat jogosultsága

A metszet próbáját megírva kiderült, hogy a koino **minden szavazatot beleszámolt** — a
jogosultságot csak a **felület** nézte (`pakli.js`, `szavazhatok`). ⚠️ *Amit a számítás nem
ellenőriz, az nem szabály, csak illemtan:* a másik gépen futó felület nem véd semmitől, egy
kézzel írt `Szavazat` eseménnyel bárki dönthetett volna olyan gondolat sorsáról, amihez semmi
köze. **Javítva** — de a javítás első változata **túllőtt a prototípuson**, és a részletes
összevetés (2.3/c) három ponton igazította ki.

### 2.3/c ⭐⭐⭐ A TÖREDÉK-MODELL — a tömb átültetésének MÁSODIK fele (2026-09-07)

Az első átültetés a metszetet a **döntésre** is ráhúzta: egy szavazás, aminek a választóköre
az érintettek metszete. ⛔ **Ez nem a prototípus.** Ott egy több entitást érintő javaslat
`javaslatService.js:519` szerint **töredékekre bomlik — érintettenként egyre**, és onnantól:

- a töredék `javaslatTipus`-a **az adott entitás művelete**, a `szuloId`-ja **az adott entitás**;
- **szavazni töredékenként lehet**: a `szavazatService` végigmegy a csoport töredékein, a
  jogosultakra leadja ugyanazt a szavazatot, a többit **átugorja** (`atugrottToredekek`), és
  hibát csak akkor dob, ha egyikre sem jogosult;
- a **küszöb és a részvételi arány töredékenként** számítódik, az adott entitás saját
  tulajdonosaival és saját érték javaslat-hisztogramjával;
- a **lezárás ideje közös**: `kozosDontesiIdo` = a töredékek döntési idejének **MAX**-a, és a
  `hatalybaLepesiIdoBeallitasa` ezt írja rá mindegyikre;
- és a csoport **akkor és csak akkor elfogadott, ha MINDEN töredék teljesíti a SAJÁT
  küszöbeit** (`javaslatIdozitesService.js:566`).

⭐ **A metszet tehát CSAK A BEADÁSRA vonatkozik** (`javaslatJogosultsagService` a teljes
listával, `javaslatService.js:494`) — a **döntés** entitásonként dől el, és **ÉS**-sel áll
össze. *Aki a gondolatot tartja, az dönt a sorsáról — akkor is, ha a javaslat egy másikat is
érint.*

⚠️ **Amit át kellett alakítani:** a koinóban nincs N tárolt töredék, mert **egy aláírt
`Javaslat` esemény** van. A töredék a Mongo tárolási kényszere volt; a logikai kapcsolat
viszont átjön: **N tárolt rekord helyett N SZÁMÍTOTT RÉSZ** (`reszekSzamitasa`). Ugyanaz a
minta, mint a D17-nél — ami ott adatbázis-sor, az itt számítás. A szavazat is egy esemény: a
prototípus „minden jogosult töredékre leadja" lépése itt annyi, hogy a szavazat **abban a
részben** számít, ahol a szavazónak van pontja.

**A három igazítás a tegnapi javításon** (mindhárom a prototípus szerint):

- **Az időzítés.** A jogosultság a **LEADÁS** pillanatában dől el, nem a lezárásén. ⛔ Különben
  a tudatpontom elvétele **a szavazatom visszavonása** lenne — pedig a szabály:
  *„megváltoztatható, de nem vonható vissza."*
- **A passzív szerep.** A prototípus jogosultság-ellenőrzése **csak pontot néz**
  (`eemberHozzajarulasaEntitason`: `tudatPontok > 0`), a szerepet nem — sőt a szavazás
  **aktívvá billenti** a szavazót (`szerepAktivalasa`: *„ezt hívja minden döntés-alakító
  tett"*). A passzív figyelő tehát szavazhat, és a szavazásával belép a döntésbe.
- **A nevező.** Aktív tulajdonosok **∪ szavazók** — a prototípus szándékosan uniózik, arra az
  esetre, ha valaki a szavazása után passzívra vált.

### 2.3/d ⛔⛔ ÉS EGY MÁSODIK VALÓDI HIBA: a rendezés nem volt tranzitív

A töredék-modell próbája hol átment, hol elbukott — **a generált kulcsoktól függően**. Az ok:
az azonos időbélyegű események holtverseny-döntője így szólt, hogy *„azonos szerzőnél a
sorszám, egyébként az azonosító"*. ⚠️ Ez **nem tranzitív**: X < Y (sorszám), Y < Z és Z < X
(azonosító) egyszerre állhat, és egy ilyen körnél a `sort` eredménye tetszőleges — vagyis **két
gép más sorrendet kap ugyanabból a halmazból**, ami épp a D17-et dönti meg. ✅ Javítva: a
sorrend `ido → szerzo → sorszam → azonosito`; így a saját lánc sorrendje érvényesül (azt csak a
szerző írhatja alá), és a reláció totális. Próba őrzi: 30 kevert bemenet, azonos eredmény.

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

⏸️ Ami viszont **valódi kérdés** marad: ma az `szerkesztesiVegrehajtas.js` a végre nem hajtható
egyezményt a `kihagyottak` listába teszi, a javaslat státusza pedig „elfogadva" marad. Ez a
prototípussal **egyezik** — de érdemes lehet többet mutatni, mint amennyit ő tudott.

### 2.6 ✅ TÖRLÉS — megépítve (2026-09-07) · ⏸️ EGYESÍTÉS — hátravan

⭐⭐ **A törlés a prototípusban NEM „törlés".** A `torlesiVegrehajto.js` egyetlen érdemi
lépést tesz: `tudatpontokVisszaosztasa` — mindenki visszakapja a pontjait az entitásról, és
**az entitás ettől szűnik meg létezni**, mert 0 pontnál a modell szerint nincs is (D14).
*A törlés tehát nem külön mechanizmus, hanem a felejtés kiváltása.* ✅ Megépítve
(`szerkesztesiVegrehajtas.js`: `torles`), a `torol` paranccsal együtt.

⚠️⚠️ **ÉS EGY VALÓDI ELTÉRÉS, amit ki kell mondani.** A prototípus szervere **mások nevében**
állította nullára a pontokat. A koinóban más nem írhat alá helyettem (D15). Ezért az entitás
**megszűnik létezni** — ez a prototípus eredménye, és ez a lényeg —, a pontok viszont a
gazdájuk keretében maradnak, amíg vissza nem veszi őket.

### 2.6/b ⛔⛔ Csaba kérdése: *„ha nem veszi vissza, akkor az entitás hogyan törlődik?"*

⭐ **Törlődik.** Az eltűnés **számítás az egyezményből**, nem a pontok nullázódásának
következménye — minden készülék ugyanazt számolja, tehát a gondolat annak a paklijából is
eltűnik, aki 100 pontot tart rajta. Amit „lekötve marad"-nak neveztem, az **csak a keret
könyvelése**.

⛔ **De a kérdés egy valódi hibát takart, és rosszabbat, mint amit mondtam.** Mérve:

```
a törölt entitás létezik-e?          false     (jó)
szetosztottPontok (élő entitásokból)   100
a szabály-réteg a saját láncból        200
KIVÉTEL: "a bemondott összeg ellentmond a saját láncának"
az új gondolat NEM jött létre
```

Vagyis a törlés után a készülék **következő tudatpont-eseménye elbukott**, és onnantól semmi
újat nem tudott létrehozni. A gyökér: **két különböző definíció ugyanarra a számra** — a
kettő eddig egyezett, mert egy entitás csak úgy tűnhetett el, ha mindenki 0-ra állt rajta.
✅ Javítva: az állapot vezet egy **kiosztási főkönyvet**, és a „mennyit osztottam ki" abból
számol (D42: *mit mondtam ki a saját láncomban*).

### 2.6/c ⭐⭐ A FELSZABADÍTÁS AUTOMATIKUS — megülepedés után (Csaba döntése)

Azt írtam, „nem lehet automatizálni", mert más nem írhat alá helyettem. Igaz — de **rossz
következtetés**: a koino **az én készülékemen fut, az én kulcsommal**. Amikor a készülékem
aláírja, hogy „leveszem a pontomat egy gondolatról, ami már nem létezik", az nem helyettem ír
alá, hanem a saját készülékem könyvel. *(Precedens: a `javaslat` parancs ma is aláír egy
második eseményt magától.)*

⚠️⚠️ **És a mérce NEM az idő, hanem a BULI (Csaba, 2026-09-07).** Először naphoz kötöttem —
de az idő múlása **semmit nem bizonyít**: egy hétvégén kikapcsolt készülék mellett három nap
alatt sem érkezik semmi, egy sűrűn cserélő mellett viszont öt perc alatt körbeér minden. ⭐
Amit mérni akarunk, az nem idő, hanem **egyeztetés**: hányszor beszéltem azóta másokkal úgy,
hogy nem hoztak semmi újat erről a döntésről. ⛔ **A néma kör nem buli** — csak az számít,
amiben legalább egy társ felelt. ⚠️ És mellé kell a **döntés jele** (egyezmény + lezárás + a
szavazás állása): ha az változik, a számláló nulláról indul. *Nem a bulik gyűlnek, hanem a
MOSTANI döntés melletti bulik.* ⚠️⚠️ **A szám (ma 3) még nincs megmérve** — Csaba kérése:
*„mégjobb lenne ezt az értéket méréssel meghatározni."*

⚠️ **Miért nem azonnal:** a koino szerint *„a késve MEGÉRKEZŐ, de a határidőn belüli
időbélyegű szavazat jogosan módosítja az eredményt"* — tehát **egy törlés vissza is
fordulhat**. Ha addigra felszabadítottunk, a gondolat a pontom nélkül térne vissza; ha csak
az enyém volt rajta, a felszabadításom **maga törölné el**. ⭐ Ezért megülepedés
(`js/allapot/felszabaditas.js`, bulikban mérve): a számláló a törlés első meglátásakor indul, és
**újraindul, ha a döntés visszafordul**. A várakozás ingyen van — a 2.6/b javítás után a
koino az elakadt ponttal is hibátlanul működik.

⛔ **Egy csapdát is ki kellett kerülni:** a **beolvasztott** (egyesített) forrás ugyanúgy
„eltűnt", de ott a pont **átment az elnyelőbe**. Ha a felszabadítás a puszta `elfelejtettek`
listát nézné, ráírna egy `pont: 0`-t — és a következő számításnál az egyesítés **nem találná
meg a pontjaimat**, vagyis a felszabadítás **elvenné, amit megőrizni akar**. Ezért a törlés
külön listát vezet (`allapot.torlesek`). *Ugyanaz a szó, két ellentétes következmény.*

Az `orjarat` minden körben elvégzi; a kézi út a `felszabadit [buli]` (0 = azonnal), és az
állapot kiírja, mennyi pont áll még törölt gondolaton.

✅ **AZ `Egyesites` IS MEGÉPÜLT (2026-09-07)** — ez volt az utolsó, és jó okkal: ez az
EGYETLEN művelet, ami entitásokat von össze. A prototípus `egyesitesiVegrehajto.js`-e
(19,9 KB) hét lépésben: összesíti emberenként a pontokat MINDEN forrásról → kiüríti a
forrásokat (azok eltűnnek) → **létrehoz egy új entitást** → ráteszi az összesített pontokat →
a források gyerekeit **az ÚJ entitás alá köti** (⭐ szándékosan NEM a nagyszülőhöz — ezért
gyűjti össze őket a törlés ELŐTT, Csaba döntése 2026-07-22) → és az egyezmény
placeholder-tárhelyét az új entitásra oldja fel. A hely alapból a források
**legközelebbi közös őse** (`_legkozelebbiKozosSzulo`).

⭐⭐ **CSABA DÖNTÉSE (2026-09-07): nem születik új azonosító — az ELSŐ érintett olvasztja be
a többit.**

A kérdés az volt, hogy az új entitás honnan kapjon azonosítót: a koinóban **minden azonosító
egy aláírt esemény lenyomata**, és ezen áll az egész ellenőrizhetőség. Az egyesítettnek nem
tartozna eseménye (a javaslaté már foglalt — az az egyezményé), tehát egy **második
származtatott azonosítót** kellett volna bevezetni, amit senki nem írt alá.

⭐ Az elnyelés ezt elkerüli, és **több logikai kapcsolatot old meg magától**:

- a rá mutató **régi hivatkozások megmaradnak** — ugyanaz az elv, mint a különválásnál:
  *„a főág tartja meg az azonosítót"*;
- **az egyezmény helye is jó lesz külön szabály nélkül** (a javaslat szülője úgyis az első
  érintett), pedig a prototípusban ehhez placeholder-feloldás kellett — a 2.2 utolsó nyitott
  pontja is ezzel zárult;
- és a **közös ős** számítása is átjött: ha a források külön ágban vannak, az egyesített
  gondolat a legközelebbi közös őshöz kerül; ha egy szülő alatt voltak, **semmi nem mozdul**.

⚠️ **Az ára, kimondva:** az egyesített gondolat az **elnyelő történetét folytatja** (szerző,
létrehozás ideje, mérete), nem a javaslattevőét — a prototípusban új entitás születik új
szerzővel. ⭐ A pontok viszont ugyanúgy **emberenként összeadódnak**, és aki bármelyik
forráson aktív volt, az az egyesítettben is aktív marad.

Új parancs: `egyesit <az1>,<az2>[,...] <egyesített cím> [indoklás]` — ⭐ az **első** a
különleges: ő nyeli be a többit.

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

1. ✅ **`erintettEntitasok` tömbbé** (2.3) — **KÉSZ (2026-09-07)**, a **töredék-modellel**
   (2.3/c) és a **típus-tiltásokkal** együtt. Ez volt a legalsó kő: enélkül az egyesítés meg
   sem fogalmazható, és a D27/5 („egyezmény is lehet érintett") sem. A régi, egy-`erintett`-es
   események **változatlanul érvényesek**. ⭐ Mellékesen **két valódi hibát** is kihozott: a
   szavazat jogosultsága csak a felületen élt (2.3/b), és a rendezés nem volt tranzitív (2.3/d).
   ⏸️ *Ami tudatosan kimaradt:* a többérintettes javaslat **kézi útja** (4. szabály) — a
   `javaslat` parancs ma egy entitást vesz. A csomag-alak a **Csomag/töredék** (2.4) lépéssel
   együtt kap parancssori arcot, mert ott dől el, hogyan írja le az ember egy mondatban.
2. **Az egyezmény helyének igazítása** törlésnél és egyesítésnél (2.2) — ez teszi az
   azonos-azonosítós döntést teljessé. *Csak a hozzájuk tartozó végrehajtóval együtt van
   értelme.*
3. ✅ **`Torles` és `Egyesites` végrehajtó** (2.6) — **KÉSZ (2026-09-07)**, és velük az
   egyezmény helye is (2.), meg az árvák felkerülése (2.2/b). ⭐ Mind a négy művelethez van
   **kézi út** is: `javaslat` · `torol` · `athelyez` · `egyesit`.
4. **Különválás** (2.1) — a legnagyobb, és a legszebb; a 1–3. után áll össze, mert
   tudatpont- és érték javaslat-mozgatásra épül.
5. **Csomag/töredék** (2.4).
6. **Általános javaslat/egyezmény** — ⏸️ **tervezés, nem átültetés** (3. pont).

⭐ **És egy megfigyelés a sorrendhez:** a **különválás** (2.1) és az általános egyezmény
**csatlakozás/tiltakozás** művelete ugyanazt a kérdést feszegeti — *ki áll mögötte MOST, és
hova viszi a súlyát*. Ha a különválás tudatpont-mozgatása megépül, a csatlakozás/tiltakozás
nagy része már ott lesz.
