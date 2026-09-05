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

## Az eredmény *(a skála-mérésé — az ébredés-mérés lentebb)*

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

---

# A 3.2 UTÁN — a két fal ledőlt (2026-09-03)

*Ugyanaz a mérő, ugyanazok a méretek, a **kérdezhető tár-illesztő** és a javított
**ág-méret** után. ⚠️ Az esemény közben nagyobb lett (478 → 611 B a 3.1 négy új mezőjétől),
tehát ez az összevetés még **konzervatív** is.*

| | 10 000 | 25 000 | 50 000 | 100 000 |
|---|---|---|---|---|
| `allapotSzamitasa` **előtte** | 84 ms | — | — | **4 615 ms** |
| `allapotSzamitasa` **utána** | **45 ms** | 114 ms | 261 ms | **502 ms** |
| `esemenyMentese` (1 db) **előtte** | 42 ms | — | — | **495 ms** |
| `esemenyMentese` (1 db) **utána** | **2,1 ms** | 1,1 ms | 1,0 ms | **1,4 ms** |
| tár megnyitása *(új tétel)* | 54 ms | 164 ms | 329 ms | 859 ms |

## ⭐⭐ Amit ez mond

**A görbe alakja változott meg, nem csak a szám.**

- **`allapotSzamitasa`:** tízszeres adatra **tizenegyszeres idő** — lineáris. Korábban
  ugyanez **ötvenötszörös** volt. *(Az ok egy közönséges hiba volt egy közönséges
  függvényben: az `agMeretSzamitasa` entitásonként végigment az összes entitáson. Az új,
  levelektől felfelé összegző változat egy menetben dolgozik — és mellesleg egy rejtett
  veszélyt is megszüntet: egy körbe mutató szülő-lánc a régi, rekurzív változatot végtelen
  rekurzióba vitte volna.)*
- **`esemenyMentese`: LAPOS.** 2,1 → 1,1 → 1,0 → 1,4 ms — **nem nő a tár méretével.**
  Vagyis a beírás **már nem négyzetes**: ami 100 000 eseménynél ~6,9 óra lett volna, az most
  ~2 perc. *(Az ok: a mentés eddig `tar.betolt()`-tel kereste a kettősséget és az
  elágazást; most azonosító és lánc-pont szerint kérdez, ami O(1).)*

⚠️ **És egy tétel, ami nem tűnt el, csak áthelyeződött: a tár megnyitása.** A mutatót
megnyitáskor építjük fel, tehát a fájl beolvasása oda került. **Futásonként egyszer**
történik, nem műveletenként — de becsületesen külön mérjük, mert enélkül a „betöltés
595 → 13 ms" javulás félrevezető lenne.

⭐ **A következő mélység** (ha egyszer kell): lemezre írt index, hogy a megnyitás se
olvassa végig a fájlt. **A hívók változtatása nélkül** cserélhető — pontosan ezért volt
fontos, hogy a 3.2 az *illesztést* rendezte, ne csak a sebességet.

---

# ÉBREDÉS-MÉRÉS — a „buli" ablaka (2026-09-03)

*Eszköz: [`ebredesProba.js`](ebredesProba.js) `fut` üzemmód · Android telefon, Termux, Node ·
azonos wifi, a laptop `figyel`-t futtat.*

> **Miért ez volt a legsürgősebb ismeretlen?** Mert az összehangolt ablak (buli) terve azon
> áll, hogy a készülékek egyszerre ébrednek — és ⚠️ az Android „Doze" módja **kötegeli** az
> ébresztéseket, felfüggeszti az alkalmazásokat, és meg is ölheti a folyamatot. Erről nem
> szabad emlékezetből dönteni.

## Az eredmény

| szünet | ébredés csúszása | csere | idő |
|---|---|---|---|
| 1 perc | **0 mp** | 1/3 társ · 610 B | 149 ms |
| 5 perc | **0 mp** | 1/3 társ · 610 B | 554 ms |
| **60 perc** | **0 mp** | 1/3 társ · 610 B | 339 ms |
| ~~240 perc~~ | ⚠️ **ÉRVÉNYTELEN** | *a mérés közben megnyitottuk a Termuxot* | |

⚠️ **A négyórás lépés elromlott, és ezt jelöljük, nem hallgatjuk el.** A mérés közben a
Termuxot megnyitottuk (az előző kimenet kimásolásához), amitől a rendszer **aktívnak vette
a folyamatot** — így az eredmény nem arról szólna, amiről akartuk. **A négyórás alvás
kérdése tehát NYITVA MARADT.**

⭐ **De az egyórás lépés önmagában is elég ahhoz, hogy a munka folytatódjon** (Csaba
döntése): ötperces ablaknál a kérdés úgyis az, hogy öt percet bír-e — és bír egy órát is.

*(A 3-ból 1 társ azért, mert kettő IPv6-cím, amire ezen a wifin nincs útvonal — `ENETUNREACH`,
azonnali, nem lassít. ⭐ Mellékesen ez is mérés: **egy elérhetetlen társ nem dönti el a
kört**, ahogy a D33 kívánja.)*

## ⭐ Amit ez jelent

**Egy óra alvás után NULLA másodperc csúszás, és a csere azonnal ment.** Ez három dolgot mond:

1. **A Doze nem ütemezte át az ébredést** — sem öt percnél, sem egy óránál.
2. **A wifi rádió visszatért**, és a koino ébredés után **azonnal tudott dolgozni** (339 ms).
3. **A folyamat túlélt** több mint egy órát.

⭐ **Az ötperces ablak ára is kijött:** egy csendes kör **610 bájt**, tehát 288 kör naponta
≈ **176 KB/nap**. Elhanyagolható — a befogadási aggály (D35) a csendes esetre **nem áll**.

## ⚠️ Amit ez NEM bizonyít — és ezt ki kell mondani

**A Termux valószínűleg tartós értesítést és részleges ébrentartót használ**, amíg fut benne
egy munkamenet. Vagyis lehet, hogy nem „egy háttérben alvó alkalmazást" mértünk, hanem egy
**előtér-szolgáltatást**.

⭐ **Ez a koino szempontjából nem baj, hanem TERVEZÉSI KÖVETKEZTETÉS:** az androidos koino is
így fog futni — **előtér-szolgáltatásként, látható értesítéssel**. Ilyen feltételek mellett az
ötperces ablak **tartható**. ⚠️ De az eredmény **nem általánosítható** egy szokásos,
háttérben alvó alkalmazásra.

**További korlátok, tisztességből:** egy készülék, egy Android-verzió, egy wifi; a töltés és a
képernyő állapota nem volt rögzítve (a Doze akkumulátoron agresszívabb); és a **négyórás lépés
még hátravan** — az „app standby" korlátai hosszabb tétlenség után lépnek életbe.

---

# A HAMIS SZIGET MÉRÉSE — a Szakasz 4 jelzései (D49)

*Mérve: 2026-09-05. Eszköz: [`szigetMeres.js`](szigetMeres.js). Terv:
[`docs/szakasz4_terv.md`](../../docs/szakasz4_terv.md).*

> **Miért mérünk?** Mert a Szakasz 4 tervezésében három nap alatt KÉT javaslat bukott meg,
> és mindkettőt a **számolás** buktatta ki, nem a megérzés. A harmadik irány (horgony,
> táguló kör, jelzések) már túl összetett a fejben-ellenőrzéshez.

## 1. A növekedés — és a megmaradási csapda

1500 valódi ember, 12 alapító egyetlen körben, induló keret 60, `k = 5`, támadó nélkül.

| Szabály | 30. kör | 97. kör | mikor állt meg |
|---|---|---|---|
| **A** — puszta darabszám (nincs keret) | 841 | **1499** | nem állt meg |
| **B** — keret (D44) | 104 | **104** | ⛔ **a 24. körben, véglegesen** |

⛔ **A „B" nem lassult, hanem elfogyott.** Az alapítók 720 egységnyi kerete: 720 → 474 →
239 → 138 → 83 → … → **0**. Amikor nulla, senki nem tud tanúsítani, tehát senki nem tud
belépni — soha többé. **Ez a megmaradási bizonyítás futás közben** (szakasz4_terv 5.1).

⭐ **És hova ment a keret?** Megszámolva: **79%-a olyanokra, akik MÁR tagok** (elismerés),
és csak **21%** olyanra, aki még kívül van (támogatás). Egy 12 fős találkozón a tagok
132-szer tanúsítják egymást, és csak 36-szor a három vendéget. **Ez adja a súlyát az
elismerés/támogatás szétválasztásnak** (Csaba, 2026-09-04).

## 2. ⛔ A horgony-kör nem tágul egyetlen alapítói klikkből

A horgony-feltétel `m` olyan horgony-tanút kér, akik **egymást nem ismerik**. Egy klikkben
mindenki ismer mindenkit → **az egész alapítás egyetlen független csoportnak számít** →
soha senki nem válik horgonnyá. Mérve: a horgonyok száma 30 körön át **végig 12**.
*(Nyitott kérdés: K16.)*

## 3. ⭐⭐ A JELZÉSEK — és a legfontosabb eredmény

Leggyengébb szabály (A), 8 megtévesztett ember, 30 kör → **843 valódi tag, 880 bejutott
hamis azonosság**. Ez a D49 helyzete: a minimum szándékosan alacsony, a hamisak bejutnak —
a kérdés, hogy **látszanak-e**.

| Jelzés | valódi átlag | hamis átlag |
|---|---|---|
| hányan tanúsították | 82 | **447** |
| hány FÜGGETLEN körből | 5,44 | 4 |
| tanúk összefonódása | 0,53 | **0,99** |
| tanúk megállapodottsága | 94 | **225** |

⭐ **A sziget nem attól látszik, hogy szegény, hanem hogy TÚL GAZDAG.**

### És a döntő szám: kit kapna el, és kit jelölne meg tévesen?

| Jelzés | legjobb küszöb | hamis elkapva | ⚠️ becsületes tévesen |
|---|---|---|---|
| hányan tanúsították | ≥ 184 | 80% | **0%** |
| tanúk összefonódása | ≥ 0,83 | **99%** | 7% |
| tanúk megállapodottsága | ≥ 142 | 69% | **0%** |
| ⛔ kevés független kör | ≤ 4 | 100% | ⛔ **31%** |

⛔ **AZ ÖSZTÖNÖS JELZÉS A LEGROSSZABB.** A *„kevés kapcsolata van, tehát gyanús"* a
becsületes tagok **harmadát** is megjelölné — és az eloszlásból látszik, kiket: **56
valódi embernek egyetlen köre van, 53-nak kettő, 66-nak három; hamisnak egynek sem.**
Ezek a frissen érkezettek, az egy társaságban élők, a magányosak — **pontosan azok,
akikért a befogadás-gondolat szól** (D49/c).

> ⭐⭐ **A jó jelzés nem azt kérdezi, „elég beágyazott-e", hanem azt, hogy „nem túl sok-e,
> túl egyforma-e".**

### Egy negyedik jelzés, amit nem is terveztünk

**Mind a 880 hamis azonosságnál pontosan 4 a független körök száma**, míg a valódiaknál
1-től 5+-ig szóródik. **880 egyforma érték nem természetes eloszlás** — a valódi emberek
szórnak, a gyár bélyegez. ⭐ És ez a koinóról szóló **összesített** jelzés, nem egy
emberről: épp az, amit a D49/c harmadik védőkorlátja kér.

## ⚠️ Amit ez NEM bizonyít

**Ez EGY támadó, és ostoba.** Mindent túlteljesít: tömegesen tanúsít, mindenkit
mindenkivel összeköt. Aki tudja, hogy nézzük, az **visszafogja magát** — tíz tanúsítás
hamisanként, szórt értékek, kevés összefonódás. ⛔ **Ha a jelzés csak a hangosat fogja meg,
akkor a csendest hitelesítjük vele.** A következő mérés egy **óvatos támadó** legyen.

**További korlátok, tisztességből:** egy véletlen-mag; a „földrajz" egy kör, a találkozók
szabályos méretűek; és a modellben nincs kulcs, aláírás, esemény és hálózat — ez
**gráf-kísérlet, nem koino-kísérlet**.

## 4. ⭐⭐ AZ ÓVATOS TÁMADÓ — és a szorítás két jelzés között

*Ugyanaz a világ, de a támadó tudja, hogy nézzük a jelzéseket: pontosan `k` tanúsítást
szerez azonosságonként, véletlenszerű tanúktól, és a hamisak nem tanúsítják tömegesen
egymást.*

**Ugyanúgy 880 hamis azonosság jutott be** — a szabály nem állította meg. **De a jelzések
elkapták, csak az ELLENKEZŐ irányból:**

| Jelzés | hangos támadó | óvatos támadó |
|---|---|---|
| hányan tanúsították | ≥ 184 → 80% / 0% téves | **≤ 5 → 100% / 1% téves** |
| tanúk összefonódása | ≥ 0,83 → 99% / 7% téves | **≤ 0,3 → 98% / 0% téves** |
| tanúk megállapodottsága | ≥ 142 → 69% / 0% téves | **≤ 37 → 100% / 1% téves** |
| ⛔ kevés független kör | ≤ 4 → 100% / **31% téves** | ≤ 5 → 100% / **41% téves** |

> ⭐⭐ **A TÁMADÓ NEM TUD EGYSZERRE MINDKETTŐ LENNI.** Ha keveset tanúsít, feltűnik, hogy
> az azonosságait **pontosan `k`-an** ismerik, és a tanúik maguk is ismeretlenek
> (megállapodottság **6** a **96** helyett). Ha sokat tanúsít, hogy ezt elfedje, **csak a
> saját hamisaiból** meríthet — és attól az összefonódás **0,99**-re szalad.
>
> **A szorítás abból jön, hogy a megtévesztett emberek száma valóban véges.** Nyolc
> emberrel nem lehet 880 azonosságot úgy körülvenni, hogy természetesnek látsszon.

⛔ **Az ösztönös jelzés KÉTSZER bukott meg.** A *„kevés kapcsolata van, gyanús"* a hangos
támadónál 31%, az óvatosnál **41%** becsületes tagot jelölne meg tévesen.

## 5. Két mérés, ami NEM sikerült — és ezt is fel kell írni

**A torlódás-jelzés megbukott.** *„A 8 legtöbbet tanúsító ember részesedése az összes
tanúsításból":* támadó nélkül **2%**, támadóval is **2%**. Oka: a támadó a **saját
hamisait is használja tanúnak**, és ezzel felhígítja a megtévesztettek súlyát. Megépítve,
megmérve, nem működik.

**És egy hamis siker, amit majdnem elhittünk.** Az óvatos támadó első változata azt kapta
feladatul, hogy a tanúi **egyáltalán ne ismerjék egymást** — ettől nem tudott összeszedni
`k`-t, és **0 hamis jutott be**. Ez nem védelem volt, hanem rossz támadó: egy valódi ember
tanúi **53%-ban** ismerik egymást, tehát a nulla összefonódás **feltűnőbb** lenne, nem
kevésbé. ⚠️ *Az óvatos támadó nem a függetlenséget maximalizálja, hanem átlagosnak látszik.*

## 6. ⚠️ A KÖVETKEZŐ TÁMADÓ FOG DÖNTENI

Az óvatos azért lepleződött le, mert az azonosságai **túl csupaszok** voltak. De semmi nem
akadályozza meg abban, hogy **egy egész hamis társadalmat építsen**: a 880 azonosságot
egymással is realisztikusan összekösse, klikkekbe rendezze, átlagosan 80 tanúsítást adjon
mindegyiknek. **Ez mind ingyen van neki, hiszen mind az övé.**

Akkor **mind a négy személyes jelzés normálisnak látszana** — és egyetlen dolog maradna,
ami elárulja: **hogy ez az egész társadalom mindössze nyolc élen lóg a valódi világon.**

⭐ Vagyis a **szerkezet** — ugyanaz a következtetés, mint a szakasz4_terv 5.1/c-ben, csak a
másik irányból. Ha az „alapos" támadó átmegy a jelzéseken, akkor a jelzések önmagukban nem
elegendők, és a **horgony visszakerül a középpontba**.

## 7. ⛔⛔ AZ ALAPOS TÁMADÓ — a jelzések összeomlanak, és a horgony-kört elfoglalja

*A harmadik támadó egész hamis TÁRSADALMAT épít: a szigeten belül is „találkozókat tart",
helyi csoportokban, ugyanolyan alakúra, mint a valódi világ. Ez ingyen van neki, hiszen
minden azonosság az övé.*

### A személyes jelzések elvesztették az erejüket

| Jelzés | valódi | hamis | legjobb küszöbbel |
|---|---|---|---|
| hányan tanúsították | 84,1 | 65,2 | 65% hamis / ⛔ **45% becsületes tévesen** |
| hány független körből | 5,4 | **7,5** | 48% / 17% — ⚠️ a hamisaknak TÖBB van |
| tanúk összefonódása | 0,53 | 0,36 | 66% / 10% |
| tanúk megállapodottsága | 96,0 | 87,1 | 94% / ⛔ **75% becsületes tévesen** |

⛔ **Egyik sem használható.** Az eloszlások átfednek; nincs olyan küszöb, ami a szigetet
elkapja anélkül, hogy a becsületes tagok jelentős részét is megjelölné.

### ⛔⛔ És a horgony-kört a támadó ELFOGLALJA

| Támadó | valódi horgony | **hamis horgony** |
|---|---|---|
| hangos | 20 | ⛔ **880** |
| óvatos | 20 | 6 |
| alapos | 20 | ⛔ **880** |

**Két külön baj, és mindkettő végzetes:**

1. **A valódi horgony-kör NEM NŐTT — végig 20 maradt**, vagyis pontosan az alapítók,
   négy különálló alapítói kör mellett is. Egyetlen becsületes ember sem vált horgonnyá 30
   kör alatt: a helyi találkozókon **sosem kerül össze három ember három egymást nem ismerő
   körből**. A hétköznapi ember a saját környékén találkozik.
2. **A hamisak viszont MIND horgonnyá váltak.** A támadó **célzottan** választ: keres négy
   alapítót négy különböző körből, akik egymást nem ismerik, megtéveszti őket — és onnantól
   minden azonossága teljesíti a „három független horgony-tanú" feltételt. A hamis
   horgonyok pedig újabb hamis horgonyokat szülnek.

> ⛔⭐ **A SZABÁLY PONTOSAN FORDÍTVA MŰKÖDIK, MINT AHOGY TERVEZTÜK: nehéz a becsületesnek
> és könnyű a támadónak.**
>
> Az ok mély, és túlmutat ezen a szabályon: a *„több, egymást nem ismerő körből ismerjenek"*
> követelmény azt jutalmazza, aki **tudatosan hálózatot épít** — és a támadó a világ
> legtudatosabb hálózatépítője. A hétköznapi ember nem stratégiázik, csak él a maga körében.

⚠️ **És ezzel a szerkezeti jelzés is értelmét vesztette:** a „hány külön út vezet a
horgonyoktól idáig" mérés a hamisaknál 30-at adott (a korlátot), a valódiaknál 11,1-et —
de nem azért, mert a hamisak jobban kötődnek a valódi világhoz, hanem mert **a horgonyok
nagy része már ők maguk voltak.** A sziget önmagához képest mérte a távolságot.

### ⚠️ Két saját mérési hiba, felírva

- **Először 8-as korláttal mértem** a diszjunkt utakat — épp annyival, ahány megtévesztett
  ember volt. Így „nincs különbség" jött ki, holott a korlát rejtette el.
- **A `hamisHorgony` oszlop végig ott volt a mérőeszközben**, a saját figyelmeztetésemmel
  együtt (*„ha igen, a mérce elveszett"*) — de a jelzés-módban nem írattam ki, ezért három
  mérésen át nem vettem észre.

## 8. HOL TARTUNK A MÉRÉS UTÁN

- ✅ **A keret-szabály (D44) áll**: a friss belépő kerete nulla, tehát a sziget nem
  hitelesíti önmagát azonnal.
- ⛔ **A gazdaság önmagában nem véd** (5.1/c) — mérve is.
- ⛔ **A személyes jelzések egy alapos támadó ellen nem védenek** — és az ösztönös
  („kevés kapcsolata van") háromszor mérve a legrosszabb: 31%, 41%, 45% téves megjelölés.
- ⛔ **A horgony-szabály ebben az alakjában elbukott**: a becsületesnek nehéz, a támadónak
  könnyű, és a kört elfoglalja.

▶️ **Amit ez nem dönt le:** a **D49** iránya (feltárás tiltás helyett) áll — de kiderült,
hogy **amit feltárunk, azt még nem találtuk meg.** A jelzés nem lehet sem személyes
statisztika, sem a mai horgony-távolság.

## 9. ⭐⭐⭐ A BEMUTATKOZÁSOK TENGERE — és a satu bezárul

*Csaba ötlete, 2026-09-05: „bemutatkozás jelöléseket intéznek egymás felé, amit mérünk. A
nem létező e-emberek mindig szigeteket alkotnak, a létező e-emberek pedig beolvadnak a
bemutatkozások tengerébe."*

### Miért más ez, mint minden eddigi

Minden korábbi jelzés **egy kitüntetett ponthoz** mért („milyen messze vagy a
horgonyoktól") — és a támadó ezt úgy verte meg, hogy **elfoglalta a horgonyokat**, vagyis
magát a mérőoszlopot. Ez nem ponthoz mér, hanem a **tengerhez**; azt nem lehet elfoglalni,
mert nincs benne kitüntetett hely.

⭐⭐ **És ami ezt lehetővé tette: ez a mérés SZUBJEKTÍV** („tőlem nézve"). Ilyet két nappal
korábban elvetettünk, mert készülékenként más eredményt ad. De az akkor volt igaz, amikor a
mérés **döntött**. A **D49** óta nem dönt, csak megmutat — **egy jelzés lehet szubjektív.**
*(Vagyis a D49 nyitotta ki az ajtót e mérés előtt; ezt előre nem lehetett látni.)*

**A mérés:** én elindulok véletlen sétákkal a saját kapcsolataim mentén, te a tieid mentén
— **találkozunk-e valahol?** (200 séta, 10 lépés, irányítatlan gráf, 5 kérdező.)

### Az eredmény, támadónként és a megtévesztettek száma szerint

*„hamis elkapva / becsületes tévesen megjelölve", `k = 5`, 1500 fős világ.*

| megtévesztett | hangos | óvatos | **alapos** |
|---|---|---|---|
| 5 | 100% / 0% | 100% / 0% | **100% / 0%** |
| 8 | 100% / 0% | 100% / 0% | **100% / 0%** |
| 20 | 77% / 36% | 97% / 6% | **100% / 0%** |
| 60 | 5% / 2% | 93% / 16% | **100% / 0%** |
| 150 | értelmetlen | 92% / 45% | **100% / 0%** |

⭐⭐ **Minél ALAPOSABB a támadó, annál jobban működik a jelzés.** Aki minden más jelzést
átugrott, azt ez fogja meg a legtisztábban, **még 150 megtévesztett emberrel is**: minél
sűrűbb belül a hamis társadalom, annál kisebb az esély, hogy egy séta épp a kifelé vezető
kevés élre lép.

### ⭐⭐⭐ ÉS EZZEL A SATU BEZÁRUL

A két jelzés-család **pontosan egymás hiányát fedi le**:

- **A személyes statisztika** a *ritka* szigetet fogja meg. Az óvatos támadó azonosságait
  pontosan `k`-an tanúsítják — ez **150 megtévesztett embernél is 100% / 0%**, mert ez a
  szám nem attól függ, hány embert vett meg.
- **A tenger-jelzés** a *sűrű* szigetet fogja meg — mert a sűrűség csapdába ejti a sétákat.

> ⭐⭐⭐ **A támadó nem tud egyszerre sűrű és ritka lenni.** Ha élethű társadalmat épít, hogy
> a statisztikát megverje, azzal bezárja magát a saját tengerébe. Ha ritka marad, hogy a
> séták kijussanak, akkor az azonosságai csupaszak, és a statisztika elkapja.

## 10. ⚠️ AMIT EZ NEM BIZONYÍT — és egy saját hiba

**A modell világa először ROSSZ volt, és majdnem félrevezetett.** Az első mérés magonként
0% és 46% közt szórta a téves megjelölést. Az ok nem a jelzés volt, hanem hogy a szimulált
világ egy **kör**, ahol mindenki csak a szomszédaival találkozik — abban nincs is tenger,
csak egy hosszú part, és két becsületes ember a kör átellenes pontjairól sosem ér össze.
⭐ **10% „távoli találkozó"** (elköltözik valaki, más városban van rokona, utazik) — és az
ingadozás **eltűnt**: négy különböző maggal egyaránt 100% / 0%.

⚠️ **De ez egyben feltétel is:** a jelzés azon áll, hogy a valódi társas háló **„kis világ"**
— van benne néhány távoli él. Egy **teljesen elszigetelt** közösségnél (falu, ahonnan senki
nem jár ki) a jelzés gyengébb lenne. Ezt külön mérni kell.

**További korlátok, tisztességből:**

- ez **gráf-kísérlet, nem koino-kísérlet**: nincs benne kulcs, aláírás, esemény, hálózat;
- a **bemutatkozás** még nincs külön modellezve — a meglévő tanúsítási gráfon mértünk. Egy
  sűrűbb, olcsóbb bemutatkozás-réteg **elvileg csak erősítené**, de ez feltevés, nem mérés;
- a séta paraméterei (200 séta, 10 lépés) **első választás**, nincsenek hangolva;
- **150 megtévesztett ember** ~19%-a a közösségnek — ott már nem Sybil-támadásról van szó,
  hanem elfoglalt közösségről, és minden szám elveszti az értelmét.

⭐ **Amit viszont megad, és eddig semmi nem adott meg:** a számítás **helyi és korlátos**
(400 séta × 10 lépés ≈ 4000 lépés, a közösség méretétől függetlenül), tehát **átmegy a
9. szabályon** — nem kíván élő lekérdezést és nem kíván globális számot.
