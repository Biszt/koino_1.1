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

---

# 11. ⭐⭐ A MEGHÍVÁSOS BELÉPÉS MÉRÉSE — védelem ÉS ár (2026-09-06)

*Eszköz: [`meghivasMeres.js`](meghivasMeres.js). Csaba kérése: „mi mekkora védelmet, és
mekkora árat követel." A 2026-09-06-i beszélgetés hat változatát méri, **ugyanabban a
világban**, tehát a számok összevethetők.*

> ⚠️ **Ez más világ, mint a 3–10. szakaszé.** Ott a tanúsítás volt az egyetlen él. Itt
> **két külön él** van: a **bemutatkozás** (kölcsönös, ingyenes, sok, HELYI — ezen fut a
> séta) és a **meghívás** (irányított, kevés, LÁNC-esemény — ez dönt a tagságról).
> A régi mérések ezért érvényben maradnak, nem cserélik le egymást.

**A világ:** 1500 valódi ember egy körön · 20 alapító · 30 kör · 10% távoli találkozó ·
4 mag átlagolva. A támadó a 8. körtől körönként 40 hamis azonosságot próbál bevinni, és a
legtöbb bemutatkozású, teljes körű tagokat téveszti meg.

## 11.1 ⛔ AZ ELSŐ EREDMÉNY: A MEGHÍVÁSI SZÁM NEM VÉDELEM, HANEM ÁRCÉDULA

**3 megtévesztett valódi tag mellett**, korlátlan meghívás-számmal:

| változat | valódi tag | HAMIS BENT | önellátó lett |
|---|---|---|---|
| V1 — nyílt (nincs kapu) | 1467 | **880** | a 0. hamistól |
| V2 — 1 meghívó | 1466 | **880** | az 1. hamistól |
| V2b — 1 meghívó, jogosítással | 1447 | **880** | soha (mindig kellett valódi) |
| V3 — 2 meghívó + jogosítás | 1430 | **880** | soha |
| V4 — 3 meghívó | 1237 | **880** | a 3. hamistól |
| V5 — 5 meghívó | 693 | **0** | — |

*(880 = a támadó MINDEN próbálkozása sikerült: 22 kör × 40.)*

⭐⭐ **A fal pontosan ott van, ahol a megtévesztettek száma eléri a kívánt meghívó-számot** —
és ezt külön megmértük: az öt-meghívós szabály **4 megtévesztettnél 0 hamisat** enged be,
**5-nél 880-at** (és az 5. hamistól önellátó). Nincs átmenet, nincs lejtő: **kapcsoló**.

> ⛔ **Amit ez kimond:** `n` meghívó nem azt jelenti, hogy a támadónak `n`-szer nehezebb.
> Azt jelenti, hogy **`n` valódi tagot kell megvennie — EGYSZER**, és utána korlátlan. Ez
> ugyanaz a *„fizess egyszer, arass örökké"* alakzat, ami ellen a D44 keret-szabálya
> született (4.1) — csak most meghívásokkal.

## 11.2 ⚠️ AZ ÁR — és egy fontos pontosítás a D48-hoz képest

A szigorú kapu nem véd, viszont **fizettetni fizettet**: az öt-meghívós szabálynál 30 kör
alatt **693 tag** lett az 1467 helyett, és **451 valódi ember maradt kívül**, pedig
találkozott tagokkal. Az átlagos várakozás **9,7 kör**.

⭐ **DE: ez lassúság, nem befagyás.** 60 körre nyújtva ugyanez **1308 tag** és már csak 94
kívülálló. ⚠️ **Ez lényeges különbség a D48-hoz képest:** a keretes tanúsítás **104 főnél
megállt, örökre** (a megmaradási csapda), a meghívásos kapu viszont **nem áll meg, csak
lassít**. A meghívás tehát nem esik a D48 csapdájába — mert nem elfogyó készlet, hanem
ismételhető cselekvés.

## 11.3 ⭐⭐ A LEGMEGLEPŐBB: A JOGOSÍTÁS ELREJTI A SZIGETET

A séta-jelzés, **csupasz** hamisak ellen (a hamisak nem mutatkoznak be egymásnak):

| változat | hamis elkapva | becsületes tévesen |
|---|---|---|
| V2 — 1 meghívó | **100%** | **0%** |
| V4 — 3 meghívó | **100%** | **0%** |
| V2b — 1 meghívó, **jogosítással** | 91% | ⚠️ **16%** |
| V3 — 2 meghívó + **jogosítás** | 90% | ⚠️ **11%** |

**A magyarázat a mérésből jön, nem feltevésből:** a jogosítás miatt a hamisak **nem tudnak
meghívót kiállítani** (nincs elég bemutatkozásuk régebbi tagoktól), tehát **minden egyes
hamisat egy valódi, megtévesztett ember hív be** — ezt az „önellátó: soha" oszlop
bizonyítja. Így minden hamis **egy valódi emberen lóg**, a sétái bejutnak a tengerbe, és
**pont úgy néz ki, mint egy frissen érkezett becsületes ember.**

Jogosítás nélkül viszont a hamisak egymást hívják be, a sziget **leszakad** a valódi
világról — és onnantól **tökéletesen látszik**.

> ⭐⭐ **A tanulság általánosabb a szabálynál:** *minden feltétel, ami arra kényszeríti a
> támadót, hogy minden hamis azonosságot egy valódi emberhez kössön, egyben EL IS REJTI
> azt.* Ez a 8/c mérés mondatának pontos megismétlődése: *„ha a jelzések csak a hangosat
> fogják meg, akkor a csendest hitelesítjük velük."* **Egy teljesítendő küszöb egyben
> hitelesítő pecsét is.**

⭐ **És a satu áll:** ha a támadó **melegít** (a hamisak egymásnak is bemutatkoznak, hogy
ne legyenek csupaszak), a séta **mind a hat változatnál 99–100% / 0%**-ot ad. Sűrűn is
látszik, csupaszon is — **köztes csak akkor van, ha valódi emberek mögé bújik**, és annak
ára van (lásd 11.4).

## 11.4 ⭐ AMI TÉNYLEG KORLÁTOZ: A KIADHATÓ MEGHÍVÓK SZÁMA

Ha egy tag **legfeljebb 10 meghívót** állíthat ki életében (3 megtévesztett mellett):

| változat | HAMIS BENT (korlátlan → korlát 10) | valódi tag |
|---|---|---|
| V2 — 1 meghívó, jogosítás nélkül | 880 → **880** ⛔ | 1466 |
| V2b — 1 meghívó + jogosítás | 880 → **17** | 1457 |
| V3 — 2 meghívó + jogosítás | 880 → **2** | 1389 |
| V4 — 3 meghívó | 880 → **0** | 1248 |

⭐ **A korlát az egyetlen dolog, ami a kárt ténylegesen behatárolja** — a kár nagyságrendje
`megtévesztett × korlát` lesz a korlátlan helyett.

⛔ **De önmagában nem elég:** a jogosítás nélküli V2-nél **semmit nem ér** (880 marad),
mert a bejutott hamisak **friss korlátot kapnak**, és exponenciálisan hívják egymást. A
korlát tehát csak azzal együtt véd, ami megakadályozza, hogy **egy frissen belépő azonnal
hívhasson**.

⭐⭐ **És egy szerkezeti előny, ami eddig elkerülte a figyelmünket:** a kiadott meghívók
száma **a saját láncból ellenőrizhető** — pontosan a **D42** mintája (bemondott összeg, és
a hazugságnak a saját aláírt eseményei mondanak ellent). Vagyis a *„legfeljebb ennyi
meghívó"* **objektív szabály lehet**, szemben a bemutatkozás-számmal, ami helyi és
ellenőrizhetetlen.

## 11.5 ⚠️ AMIT EZ A MÉRÉS NEM BIZONYÍT — és egy saját hiba

⚠️⚠️ **A KORLÁTOS MÉRÉS ELŐSZÖR HAMIS SIKERT MUTATOTT.** Az első változat minden
ismerősnek kiállított meghívót, ezért korláttal a becsületes tagok az **első körben
elpazarolták a keretüket** olyanokra, akik úgysem érték el a küszöböt — és onnantól senki
nem hívhatott. A mérés „tökéletes védelmet" mutatott (0 hamis mindenhol), ami valójában
**befagyott koino** volt (V5: 20 tag az 1467-ből). ⭐ *A tanulság ugyanaz, mint a
kör-alakú világnál: a jó eredmény gyanús, amíg meg nem nézzük, mitől jó.*

**További korlátok, tisztességből:**

- ez **gráf-kísérlet, nem koino-kísérlet**: nincs benne kulcs, aláírás, esemény, hálózat;
- ⚠️ **a támadó nem tud versenyezni a becsületes belépőkkel** a megtévesztett emberek
  meghívó-keretéért — a modellben a becsületesek hívnak előbb. Ezért a **11.4 korlátos
  számai optimisták**; egy megvett ember a valóságban a támadót szolgálná ki előbb;
- a séta paraméterei (200 séta, 10 lépés) a korábbi mérésből örököltek, nincsenek hangolva;
- a kis mintás sorokat (2 és 17 hamis) **nem szabad a jelzés-táblázatban olvasni** — ott a
  küszöb-kereső túlilleszt;
- a világ „kis világ" (10% távoli találkozó) — **egy teljesen elszigetelt közösségnél a
  séta-jelzés gyengébb lenne.**

## 11.3/b ⭐⭐ ÉS MIÉRT ANNYI? — a HÍD, ami a séta számait megmagyarázza

*Csaba kérdése (2026-09-06): „érdekes, hogy 100%-ban fel lehet deríteni a hamis
regisztrációkat — hogy is működik ez?" A válasz nem a séta ügyessége, hanem a sziget
alakja — és ezt külön megmértük, hogy ne feltevés maradjon.*

⭐ **A séta nem azt méri, hogy valaki hamis-e, hanem hogy MEDDIG ÉR EL a tengerben.**

| változat | hamis bent | híd-élek a valódi világhoz | ebből hamis, akinek van valódi ismerőse |
|---|---|---|---|
| V2 — 1 meghívó | 880 | ⭐ **1** | **1 (0%)** |
| V4 — 3 meghívó | 880 | 6 | 3 (0%) |
| V1 — nyílt | 880 | 880 | 880 (100%) |
| V2b — 1 meghívó + jogosítás | 880 | 880 | 880 (100%) |
| V3 — 2 meghívó + jogosítás | 880 | 1760 | 880 (100%) |

> ⭐⭐ **A V2-nél a 880 hamis azonosság EGYETLEN bemutatkozáson lóg.** A támadó azért
> építette így, mert ez a legolcsóbb: az első hamisat még egy megtévesztett ember hívja be,
> onnantól viszont **a hamisak hívják egymást, ingyen**. Egy tízlépéses séta pedig
> gyakorlatilag soha nem talál rá arra az egy élre — tehát a sziget lakói **sehol nem érnek
> össze senkivel**. Innen a 100% / 0%.

⚠️ **Vagyis a 100% nem a jelzés érdeme, hanem a támadó spórolásáé.** Ugyanez a jelzés
**91% / 16%**-ra esik, amint minden hamis kap egy valódi ismerőst (V2b) — mert akkor
**pontosan úgy néz ki, mint egy frissen érkezett becsületes ember**, akinek még egy
ismerőse van. A séta a **leszakadást** látja, nem a hamisságot.

⛔ **És a rossz hír: a leszakadás megszüntetése OLCSÓ.** A V2b-ben a 880 híd-él **három
megtévesztett emberből** indul — fejenként ~293 bemutatkozás. A támadónak tehát nem kell
több embert megvennie, csak többször kell ugyanazokat használnia.

⭐ **Ami viszont ebből következik, és még nincs megmérve:** három ember, fejenként ~293
bemutatkozással olyanok felé, akiknek nincs más ismerősük — ez **torlódás**, és épp a
megtévesztett emberek oldalán feltűnő, nem a hamisakén. Ezt a jelzést a
[`szigetMeres.js`](szigetMeres.js) már számolja a tanúsítási világban; a meghívásosban
**még nem**. Ez a következő mérés.

## 11.6 ⭐⭐⭐ A TORLÓDÁS — és a satu bezárul a meghívásos világban is

*Csaba kérése (2026-09-06): mérjük meg azt a jelzést, amit a 11.3/b rése kikövetelt.*

⭐ **A gondolat:** ha a támadó minden hamisat egy-két valódi emberhez köt (és ezzel elrejti
őket a séta elől), akkor **azok a valódi emberek** viszik el az egészet. Nem a hamisat
nézzük, hanem **akin lóg**.

**Mérve (3 megtévesztett, „zsákutca" = akinek rajtam kívül 3-nál kevesebb ismerőse van):**

| változat | séta (elkapva / tévesen) | a megtévesztett zsákutcái | ⚠️ a legrosszabb becsületes |
|---|---|---|---|
| V2 — 1 meghívó | **100% / 0%** | 0 | 0,3 |
| V4 — 3 meghívó | **100% / 0%** | 0 | 0,3 |
| V2b — 1 meghívó + jogosítás | 91% / 16% | ⭐ **293** | **0,3** |
| V3 — 2 meghívó + jogosítás | 90% / 11% | ⭐ **587** | **0,3** |

> ⭐⭐⭐ **A SATU BEZÁRUL, ÉS A TÁMADÓ MINDHÁROM ÚTJA FEDVE VAN:**
>
> - **a hamisak egymást hívják** (a legolcsóbb) → a sziget **leszakad** → a séta **100%**;
> - **a hamisak néhány valódi emberen lógnak** → a séta megvakul (91%), de az a néhány
>   ember **293–587 zsákutca-ismerőst** cipel, szemben a legrosszabb becsületes **0,3**-mal;
> - **a hamisak egymást melegítik** (sűrű sziget) → a séta megint **99–100% / 0%**.

⚠️ **A küszöb NEM részletkérdés, és ezt majdnem elrontottam.** Az első mérésnél a zsákutca
azt jelentette, hogy „rajtam kívül **nincs** ismerőse" — ezzel a V3 jelzése **0** volt, mert
ott minden hamis **két** valódi emberhez kötődik, tehát egyiknek sem „zsákutcája". A
küszöböt 3-ra emelve a V3 jelzése **587** lett. *Egy jelzés, ami egyetlen küszöbön áll vagy
bukik, törékeny — több küszöbbel kell mérni.*

## 11.7 ⛔ ÉS A KELLEMETLEN EREDMÉNY: AMI MŰKÖDIK, AZT A D49/c TILTJA

**A koino-szintű alak nem működik.** A „8 legtöbb bemutatkozású ember részesedése"
támadóval **1–3%**, támadó nélkül **1%** — vagyis **nincs jelzés**. Ez az az alak, ami a
**D49/c 3. védőkorlátjával** megférne (*„az összesített nézet a koinóról szóljon, ne
emberekről"*).

⛔ **Ami működik, az személyre szóló** — és ráadásul **egy becsületes emberre** mutat: arra a
megtévesztettre, akit a támadó felhasznált. Ez két védőkorlátot is súrol: a D49/c
1. pontját (*nincs személyre szóló gyanú-pontszám*) és a 2.-at (*a jelzés tájékoztat, nem
jogosít*).

⚠️ **És egy határeset, amit a modell NEM tartalmaz:** egy tanár, aki harminc diákot fogad
be, átmenetileg **harminc zsákutca-ismerőst** cipelne — pontosan úgy, mint egy megtévesztett
ember. *(A modellben ez nem jön elő, mert a becsületesek nem csinálnak tömeges beléptetést.)*
⭐ A különbség idővel derül ki: a diákok **megismerik egymást**, tehát megszűnnek zsákutcák
lenni; a hamisak nem. **Ezt külön kell mérni, mielőtt bárki ilyen jelzést beépít.**

## 11.8 ⭐ AZ ISMÉTLŐDÉS — Csaba ötlete, és amit a mérés mondott (2026-09-06)

> *„Egy kollégával kétszáz nap alatt kétszázszor találkozol; egy pályaudvari átutazóval
> egyszer."* — a jelzés csak a **sokszor ismételt** bemutatkozást vegye figyelembe.

### ⚠️ ELŐSZÖR A MÉRÉS BUKOTT MEG, NEM AZ ÖTLET

Az első futás **100% hamis elkapva / 81–89% becsületes tévesen** volt — használhatatlan.
Az ok a **modellben** volt: a világ csupa **egyszeri találkozásból** állt (a találkozók
véletlen embereket hívnak egy környékről), tehát *„a sokszor ismételt él"* fogalma **üres**
volt, és a szűrő mindenkit leszakított.

⭐ **Ezért került a modellbe az ÁLLANDÓ TÁRSASÁG** (`allandoKorok`): család, munkahely,
osztály — nyolc fő, körönként 50% eséllyel összejön, és **mindenki kettőhöz tartozik**
(enélkül a sok-találkozású gráf szétesne külön szigetekre, és a séta a saját társaságában
ragadna). ⚠️ *Ez a világ bővítése, tehát a 11.1–11.7 számai a régi világra érvényesek;
a kettőt nem szabad összekeverni.*

### Az eredmény — állandó társaságokkal, 3 megtévesztett

| változat | séta szűrő nélkül | ⭐ csak a ≥3× ismételt élen | kitartó támadó ellen |
|---|---|---|---|
| V2 — 1 meghívó | **100% / 0%** | 100% / ⚠️ 17% | 100% / 17% |
| V4 — 3 meghívó | **100% / 0%** | 100% / ⚠️ 34% | 100% / 34% |
| V2b — 1 meghívó + jogosítás | 88% / 11% | ⭐ **100% / 9%** | 100% / 9% |
| V3 — 2 meghívó + jogosítás | 90% / 15% | ⭐ **100% / 13%** | 100% / 14% |

⭐⭐ **Ahol a séta vak volt, ott az ismétlődés megjavítja:** a V2b és a V3 — vagyis épp az a
két eset, ahol a támadó minden hamisat egy valódi emberhez köt — **88–90%-ról 100%-ra** megy,
és a téves megjelölés is **csökken** (11% → 9%, 15% → 13%).

⛔ **De ahol a séta tökéletes volt, ott ront:** a V2 és a V4 **0%-ról 17%-ra, illetve
34%-ra** rontja a téves megjelölést. Az ok kézenfekvő: a szűrő leszakítja azokat, akiknek
**még nincs ismétlődő kapcsolatuk** — a frissen érkezettet és a magányost. Pontosan az a
kör, akikért a D49/c 2. védőkorlátja szól.

> ⭐ **Ebből az következik, hogy az ismétlődés nem HELYETTESÍTI a sima sétát, hanem egy
> MÁSIK LENCSE.** Hogy a kettő együtt (mindkettőn leszakadt = erős jelzés) jobb-e
> bármelyiknél külön, az **még nincs megmérve.**

### ❓ ÉS EGY SZÁM, AMIT NEM TUDOK MEGMAGYARÁZNI

A **kitartó támadó** — aki minden körben újra jelöli a bemutatkozásait, hogy az élei
„sokszor ismételtnek" látszódjanak — **semmit nem nyert vele** (17% → 17%, 9% → 9%,
13% → 14%). Ez ellentmond a várakozásnak: ha a jelölés puszta bejegyzés, a támadónak fel
kellene tudnia pörgetni a számlálót.

⚠️ **Nem tudom, miért nem nyert, és ezért ezt a sort NEM szabad védelemként olvasni.** A
11.3/b esetében is előbb megmértük a hidat, és csak utána mondtuk ki az okot; itt ez a
diagnosztika **még hiányzik**. Amíg nincs meg, a helyes olvasat: *a modell így viselkedett,
az okát nem ismerjük.*

## 11.9 ⭐⭐ MIÉRT NEM NYERT A KITARTÓ TÁMADÓ? — a rejtély megoldva

*A 11.8-ban nyitva hagytunk egy számot: a kitartó támadó (aki minden körben újra jelöli a
bemutatkozásait) semmit nem nyert. Két gyanút mértünk meg.*

| | kitartó NÉLKÜL | ⭐ KITARTÓ támadóval |
|---|---|---|
| a híd-élek átlagos súlya | **1** | **12,5–23** |
| ebből átmegy a ≥3-as szűrőn | **0%** | ⭐ **95–100%** |
| a megtévesztett szomszédai közül hamis | 28–56% | 28–56% (**erős élen: 31–64%**) |

⛔ **H1 megdőlt:** a hidak **nem maradnak gyengék** — a kitartó támadó sikeresen felpörgette
a számlálót, az élei 95–100%-ban átmennek a szűrőn. Tehát *nem azért* bukott meg, mert nem
sikerült neki.

⭐⭐ **H2 IGAZOLVA — és ez a szakasz egyik legszebb eredménye:** a megtévesztett ember
szomszédságának **28–56%-a hamis**, az **erős élein pedig 31–64%-a**. Vagyis amikor a séta
átlép a hídon, a következő lépésnél **31–64% eséllyel visszaesik a szigetbe**. Tíz lépésen
át ez újra és újra megtörténik, tehát a séta **nem jut ki a tengerbe**.

> ⭐⭐⭐ **A TÁMADÓ SAJÁT TÖMEGE VERI MEG.** Ahhoz, hogy a hamisai kapcsoltnak látszódjanak,
> mindet néhány emberre kell aggatnia — de ettől **azoknak az embereknek a környezete válik
> szigetté**, és a séták onnan sem tudnak kijutni. **Minél több hamisat akar elrejteni,
> annál erősebb a csapda.** Ugyanaz az alakzat, mint a satu: *a támadó nem tud egyszerre
> sok és láthatatlan lenni.*

⚠️ **A korlát, amit ez NEM mond meg:** a mérés **3 megtévesztett emberrel** futott, tehát
fejenként ~293 hamis jutott. Ha a támadónak **sok** megtévesztett embere volna (mondjuk
száz, fejenként 9 hamissal), azok környezete nagyrészt valódi maradna, és a séták kijutnának.
⭐ **A védelem tehát a „hamis / megtévesztett ember" ARÁNYON áll, nem a darabszámon** — és
ezt külön kell megmérni.

## 11.10 ⭐⭐⭐ A KÉT LENCSE EGYÜTT — és a válasz Csaba mércéjére

> **Csaba mércéje (2026-09-06):** *„ha nem növeli meg annyival a támadó lebukási esélyét,
> akkor ne bonyolítsunk."*

*Mindkét lencse UGYANAZON a világon, UGYANAZOKRA a párokra fut, hogy az ÉS/VAGY összevethető
legyen. „elkapva / tévesen".*

| változat | 1. lencse (sima séta) | 2. lencse (≥3× ismételt él) | ⭐ MINDKETTŐ (ÉS) | BÁRMELYIK (VAGY) |
|---|---|---|---|---|
| V1 — nyílt | 89% / 11% | 100% / 18% | **89% / 3%** | 100% / 27% |
| V2 — 1 meghívó | 100% / 0% | 100% / 17% | **100% / 0%** | 100% / 17% |
| V2b — 1 meghívó + jogosítás | 89% / 10% | 100% / 9% | ⭐ **89% / 1%** | 100% / 17% |
| V3 — 2 meghívó + jogosítás | 89% / 8% | 100% / 13% | ⭐ **89% / 1%** | 100% / 20% |
| V4 — 3 meghívó | 100% / 0% | 100% / 34% | **100% / 0%** | 100% / 34% |

⭐⭐ **A második lencse NEM azzal érdemli ki a helyét, hogy többet kap el, hanem azzal, hogy
CSENDESEBBÉ teszi a jelzést a becsületeseken.** Az „ÉS" olvasat a téves megjelölést
**8–11%-ról 1–3%-ra** viszi — nyolcszoros-tízszeres javulás —, miközben az elkapás a
gyengébb lencse szintjén marad (89%).

Ez pontosan a projekt saját mércéje: *egy jelzés akkor ér valamit, ha a szigetre kigyullad,
a becsületes közösségre viszont NEM.* A **VAGY** olvasat ezzel szemben mindent elkap (100%),
de 17–34%-ot tévesen jelöl — ⚠️ **ez rosszabb a semminél**, mert hozzászoknak, és megszűnik
jelzés lenni.

> ✅ **A válasz Csaba mércéjére: MEGÉRI a bonyolítás — de nem úgy, ahogy vártuk.** Nem a
> lebukási esélyt növeli (az marad 89–100%), hanem **a hamis riasztást csökkenti a
> tizedére**. A koinóban ez fontosabb: a téves jelölés a magányost és a frissen érkezettet
> érinti.

⚠️ **Amit nem tudunk:** miért marad 11% a szigetből észrevétlen az „ÉS" olvasatnál — ezek
azok a hamisak, amiket az egyik lencse átenged. A 11.9 alapján a gyanú az, hogy ezek a
legkorábban létrehozott, legjobban beágyazott azonosságok, de **ez feltevés, nem mérés.**

## 11.11 ⭐⭐⭐ A REJTŐZKÖDŐ TÁMADÓ ÉS A HÁROM LENCSE (2026-09-06)

*Csaba kifogása a 11.10-re: „az »ÉS« olvasat 11%-os vakfoltja — ez nem tetszik." Két
válasz született rá: egy **jobb támadó** (mert a régi számok kedvezőbbek voltak a
valóságnál) és egy **harmadik lencse**.*

### ⚠️ ELŐBB A SAJÁT MODELLEM JAVÍTÁSA: A REJTŐZKÖDŐ TÁMADÓ

Eddig a támadó a **költségét** optimalizálta: a saját hamisait használta meghívónak, mert
az ingyen van — és ettől a szigete **leszakadt**, tehát a séta tökéletesen látta. ⚠️ Ez
kedvezőbb kép a valóságnál: egy okosabb támadó a **láthatatlanságát** optimalizálja, és
**mindig valódi (megtévesztett) embereket használ**, akkor is, ha a szabály nem
kényszeríti rá. Ez neki **semmivel nem kerül többe** — a megtévesztettek megvannak.

⛔ **És tényleg működik:** az első lencse (sima séta) a V2-nél **100% / 0%-ról
71% / 22%-ra**, a V4-nél **100% / 0%-ról 89% / 14%-ra** romlik. *A korábbi „tökéletes"
számok tehát az olcsó támadót írták le, nem a legokosabbat.*

### Az eredmény — három lencse, két támadó (`allandoKorok=1`, 3 megtévesztett)

*„elkapva / tévesen". Az 1. és 2. lencsénél a KEVÉS a gyanús, a 3.-nál a SOK.*

| változat | 1. séta | 2. ismétlés | 3. torlódás | ⭐ 2 A 3-BÓL | MIND A 3 |
|---|---|---|---|---|---|
| **olcsó támadó** | | | | | |
| V2 — 1 meghívó | 100% / 0% | 100% / 17% | 100% / 0% | **100% / 0%** | 100% / 0% |
| V2b — + jogosítás | 89% / 10% | 100% / 9% | 100% / 9% | **100% / 2%** | 89% / 0% |
| V4 — 3 meghívó | 100% / 0% | 100% / 34% | 100% / 0% | **100% / 0%** | 100% / 0% |
| **⭐ rejtőzködő támadó** | | | | | |
| V2 — 1 meghívó | ⛔ 71% / 22% | 100% / 17% | 100% / 14% | **100% / 8%** | 71% / 0% |
| V2b — + jogosítás | ⛔ 73% / 14% | 100% / 9% | 100% / 9% | ⭐ **100% / 2%** | 73% / 0% |
| V3 — 2 + jogosítás | 78% / 8% | 100% / 13% | 100% / 25% | **100% / 6%** | 78% / 0% |
| V4 — 3 meghívó | 89% / 14% | 100% / 34% | 100% / 22% | **100% / 12%** | 89% / 1% |

> ⭐⭐⭐ **A VAKFOLT BEZÁRUL — a „2 a 3-ból" olvasattal: 100% elkapva, 0–12% tévesen**,
> **mindkét támadó ellen**. Az egyhangúság („mind a 3") ennél rosszabb: kevesebbet kap el
> (71–89%), cserébe majdnem nulla tévedésért.

⭐ **Miért működik:** a rejtőzködő támadó **a séta ellen véd, de a másik kettőt ezzel
kinyitja.** Ha minden hamisat valódi emberre aggat, akkor (a) azok az emberek
zsákutca-tömeget cipelnek → a **torlódás** meglátja, és (b) a hamisak nem tudnak
ismétlődő találkozásokat felmutatni → az **ismétlődés** meglátja. *Ugyanaz a satu-alakzat:
amivel az egyik lencse elől rejtőzik, azzal a másik kettő elé lép.*

### ⛔ ÉS A LEGFONTOSABB KORLÁT — mindkét megmaradó lencse UGYANAZON az arányon áll

⚠️ **Ez a mérés 3 megtévesztett emberrel futott, fejenként ~293 hamissal.** Mind a torlódás
(*„egy csapatnyi zsákutcát cipel"*), mind az ismétlődés-csapda (11.9 H2: *„a megtévesztett
környezete elhamisodik"*) **abból él, hogy kevés ember hordoz sok hamisat**.

⛔ **Ha a támadónak sok megtévesztett embere volna, fejenként kevés hamissal, mindkét lencse
gyengülne — egyszerre.** Vagyis a két „független" lencsének **közös töréspontja** van, és a
100%-ot addig nem szabad elhinni, amíg ezt meg nem mértük. *(Következik: 11.12.)*

## 11.12 ⭐⭐ AZ ARÁNY-PRÓBA — a félelmem NEM igazolódott

*A 11.11 végén azt írtam, hogy mindkét megmaradó lencse ugyanazon az arányon áll (kevés
ember hordoz sok hamisat), tehát közös töréspontjuk lehet. **Megmértük, és tévedtem.***

**Rejtőzködő támadó, 3 → 20 → 50 megtévesztett emberrel** (a hamisak száma változatlanul
880, tehát fejenként 293 → 44 → 18 jut):

| lencse | 3 megtévesztett | 20 megtévesztett | 50 megtévesztett |
|---|---|---|---|
| 1. séta | 71–89% / 14–22% | ⛔ **39–68% / 25–57%** | ⛔ **48–68% / 39–51%** |
| 2. ismétlés | **100% / 9–34%** | **100% / 9–34%** | **100% / 9–34%** |
| 3. torlódás | **100% / 9–25%** | **100% / 9–25%** | **100% / 9–25%** |
| ⭐ 2 a 3-ból | **100% / 2–12%** | **100% / 4–18%** | **100% / 7–23%** |

⛔ **A SÉTA AZ, AMI ÖSSZEOMLIK** — 50 megtévesztettnél 48–68% elkapva és 39–51% tévesen,
vagyis érdemben használhatatlan. *A „bemutatkozások tengere" önmagában tehát NEM a válasz;
a sok kis híd feloldja a szigetet a tengerben.*

⭐⭐ **De a másik két lencse meg sem rezdült.** És az ok, amit rosszul gondoltam:

> **A torlódás-jelzésnek nem NAGY számra van szüksége, hanem arra, hogy a becsületes
> alapvonal NULLA legyen.** A legrosszabb becsületes tag **0,3** zsákutca-ismerőst cipel —
> tehát a 18 ugyanolyan feltűnő, mint a 293. A jelzés nem a mérettől él, hanem a
> **kontraszttól**.

⭐ **Az ismétlődés pedig azért nem gyengül, mert nem is az aránytól függ:** a hamisnak
egyszerűen **nincsenek ismétlődő találkozásai** valódi emberekkel, akárhányan hordozzák.

### Amit ez a három mérés együtt mond

- ⛔ **A séta a leggyengébb láncszem**, nem a legerősebb — pedig eddig ő volt a főszereplő.
- ⭐ **A torlódás a legerősebb**, és a legolcsóbb is: nem kell hozzá séta, csak a saját
  ismerőseim ismerőseinek darabszáma.
- ⭐⭐ **A „2 a 3-ból" olvasat mindhárom támadó-változat és mindhárom arány mellett
  100% / 2–23%** — ez az egyetlen alak, ami eddig minden próbát kiállt.

⚠️ **És ami MÉG NINCS megmérve:** a **rejtőzködő ÉS kitartó** támadó **sok megtévesztettel**
— vagyis a három képesség együtt. Ott a 11.9 H2-mechanizmusa (a megtévesztett környezete
elhamisodik) gyengül, miközben a kitartó a súlyokat felpörgeti. **Ez a legrosszabb eset, és
ez a következő futás.**

## 11.13 ⛔⛔ A LEGROSSZABB ESET — és amit szét kell szedni belőle

*A három támadói képesség EGYÜTT: rejtőzködő (valódi emberekre aggat) + kitartó (minden
körben újrajelöl) + **50 megtévesztett** ember.*

| lencse | 3 megtévesztett, rejtőzködő | ⛔ **a legrosszabb eset** |
|---|---|---|
| 1. séta | 71–89% / 14–22% | **43–74% / 31–61%** |
| 2. ismétlés | **100% / 9–34%** | ⛔ **77–85% / 41–55%** |
| 3. torlódás | **100% / 9–25%** | ⭐⭐ **100% / 9–25%** |
| 2 a 3-ból | **100% / 2–12%** | ⛔ **82–95% / 21–38%** |
| mind a 3 | 71–89% / 0–1% | 37–63% / 1–8% |

### ⛔ AMIT VISSZA KELL VONNOM

**A 11.11–11.12-ben azt írtam, hogy a „2 a 3-ból" olvasat minden próbát kiállt. NEM állja
ki.** A legrosszabb esetben **82–95%-ra esik, 21–38% téves megjelöléssel** — mert a
többségi szavazás **két megromlott lencsét** is beleszámol, és azok **lehúzzák** az
egyetlen épet.

> ⚠️ **A tanulság általánosabb a számnál:** *egy erős jelzés és két gyenge ÖSSZEVONÁSA
> rosszabb, mint az erős jelzés egyedül.* A többségi olvasat csak addig jó, amíg a tagjai
> egyenként is jók.

### ⭐⭐ AMI VISZONT ÁLL, ÉS EGYEDÜL ÁLL: A TORLÓDÁS

**100% / 9–25%, mind a hét eddigi támadó-változat és mindhárom arány mellett** — ez az
egyetlen jelzés, amit semmi nem tört el.

És a szerkezeti oka egyszerű: a támadónak **a hamisait valakikhez kötnie kell**, és bárkihez
köti, azoknál **feltűnő lesz a zsákutca-tömeg** — mert a becsületes alapvonal **0,3**.
⭐ **Nem tud olyan embert találni, akinél ez ne látszana**, hacsak nem szerez annyi valódi
embert, hogy fejenként csak 1–2 hamis jusson — de az már nem Sybil-támadás, hanem
**elfoglalt közösség**, és ott minden szám elveszti az értelmét.

### ⛔ ÉS AMI ÖSSZEOMLOTT: A SÉTA — vagyis a D50 főszereplője

A **séta** (a „bemutatkozások tengere") a **leggyengébb** láncszemnek bizonyult: sok
megtévesztett embernél **43–74% / 31–61%**. A sok kis híd **feloldja a szigetet a
tengerben** — és ezt nem lehet paraméterrel megjavítani, mert épp a jelzés lényege
(„összeérünk-e?") válik igazzá a támadóra is.

⚠️ **Ez a D50 és a 8/d satu-érv felülvizsgálatát kívánja.** A tenger-gondolat nem hibás —
csak nem ő a védelem, hanem a **kontraszt-jelzés**, ami olcsóbb is nála: nem kell hozzá
séta, se élő kapcsolat, csak az ismerőseim ismerőseinek darabszáma. ⭐ És a **D55**
(nyíltság) pontosan ezt teszi helyben kiszámíthatóvá.

### ⏳ A határ, amit nem mértünk

880 hamis / 50 megtévesztett = fejenként **18**. Ha valaki **500** valódi embert szerezne
meg, fejenként 2 hamissal, a 0,3-as alapvonal mellett a kontraszt elvékonyodna. ⚠️ De 1500
fős közösségben az 500 ember **a közösség harmada** — ott a D18/0 értelmében már nem
Sybil-védelemről beszélünk. **A mért tartomány (3–50, azaz 0,2–3%) a valódi fenyegetés
tartománya.**
