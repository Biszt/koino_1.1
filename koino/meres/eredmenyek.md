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
esemény-keverék (60% tudatpont · 25% gondolat · 10% szavazat · 5% javaslat/érték) és a
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
*(Nyitott kérdés: AK16.)*

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

---

# 12. ⭐⭐⭐ A KÉT LÉPCSŐ ÉS A LÁNC ALAKJA (2026-09-06)

*Csaba szerkezete (D56–D59) és az állítása: „nem lenne annyira szerteágazó és mély, mivel
nincsen szabad tanúsítgatás, ezért »középre« fognak mutatni a láncok, ahol meg már
összefutások lesznek." — Eszköz: [`meghivasMeres.js`](meghivasMeres.js) `LEPCSO=1` móddal.*

## 12.1 ⚠️ ELŐBB KÉT SAJÁT HIBA, MERT AZ ELSŐ FUTÁS ÉRVÉNYTELEN VOLT

**(1) Mindenki felhatalmazott mindenkit**, akivel találkozott — ettől **1428 lett tanúsító
az 1429-ből**, vagyis a mérendő mechanizmus **abban a világban nem is létezett**. A
lánc-alak száma (296 ős) így értelmetlen volt.
⭐ **Javítás:** egy 2. lépcsős **három** embert hatalmaz fel, és nem véletlenszerűen, hanem
**akit a legjobban ismer** (a legtöbbször találkoztak — az ismétlődés-súly, ami Csaba
korábbi ötletéből már a modellben volt).

**(2) A 20 000 fős világ első futása „0,5 mélységet" adott** — csodálatos szám, ami
valójában azt jelentette, hogy **a közösség fel sem nőtt**: 11 159 tagból csak 118 jutott a
2. lépcsőre, tehát szinte mindenki alapító volt vagy egy lépésre tőle.
⚠️ *A jó szám ugyanolyan gyanús, mint a rossz, amíg nem nézzük meg, mitől jó.*

## 12.2 ⭐⭐⭐ AZ EREDMÉNY: A GYÖKÉRIG MENŐ ELLENŐRZÉS OLCSÓ

*Az ős-halmaz = hány KÜLÖNBÖZŐ embert kell megnézni, ha mindenkit csak egyszer nézünk meg
(gyorsítótár). Ez a valódi ár — nem a 3^mélység.*

| közösség | ős-halmaz (átlag / legrosszabb) | mélység (átlag / max) | tanúsítók aránya |
|---|---|---|---|
| 1 500 | **17,7** / 62 | 2,9 / 5 | 23% |
| 6 000 | **30,1** / 99 | 3,7 / 7 | 23% |
| 20 000 | **40,7** / 171 | 4,3 / 8 | 24% |

⭐⭐ **A növekedés LOGARITMIKUS, és feltűnően egyenletes: kettőzésenként ≈ +6 ős és
≈ +0,37 szint.** *(1500→6000: +12,4 ős két kettőzésre; 6000→20000: +10,6 ős 1,74
kettőzésre — vagyis 6,2 és 6,1 kettőzésenként.)*

> ⭐⭐⭐ **Ha ez a vonal tartja magát, egymilliárd e-embernél ≈ 136 embert kell megnézni,
> ≈ 10 szint mélyen.** Ez **semmi** — és Csabának igaza lett: *„a láncok középre mutatnak,
> ahol már összefutások lesznek."*

⚠️ **Ez EXTRAPOLÁCIÓ három pontból, 15 kettőzésen át.** A modell szerkezete (földrajz,
találkozó-méret, 3 felhatalmazás fejenként) végig ugyanaz volt; egy valódi milliárdos
közösség máshogy is alakulhat. **A vonal biztató, de nem bizonyíték.**

## 12.3 ⭐ MIT JELENT EZ A D59-RE (a mélység-korlát)

A **D59** azért született, hogy a rekurzió korlátos legyen. ⭐ **A mérés szerint magától is
korlátos** — a gyorsítótár és a láncok összefutása elvégzi a munkát.

- **A determinizmust nem a korlát adja:** ha mindenki a **gyökérig** ellenőriz, akkor is
  mindenki ugyanoda jut — sőt **jobban**, mert nincs `D` paraméter, amiben eltérhetnének.
- **A korlát haszna más lett:** ha valakinek **hiányoznak szeletek**, kevesebbet kell
  látnia. Vagyis **adat-elérhetőségi tartalék**, nem számítási szükség.

▶ **Javaslat:** menjen az ellenőrzés a **gyökérig** (Csaba ösztöne), és a `D` maradjon
**elhagyható biztonsági szelep**. ⚠️ *A döntés Csabáé: a korlát BIZTOSAN olcsó, a mérés
csak VALÓSZÍNŰSÍTI, hogy nem kell.*

## 12.4 ⛔ ÉS AMI NEM JAVULT: A PÉNZTÁRCA KAPUJA UGYANOLYAN ALAKÚ

**Minden hamis azonosság megkapta a pénztárcát** (1500-nál 880/880, 20 000-nél 2080/2080).
Az ok: a megtévesztett emberek **tanúsítók is**, és egy megvett tanúsító **korlátlanul
tanúsíthat**.

> ⛔ **A 2. lépcső kapuja tehát ugyanaz az alakzat, mint az 1.-é (11.1): nem véd, hanem
> ÁRAT SZAB** — *„vegyél meg három tanúsítót"*.

⭐ **Ez nem cáfolja a D56-ot** — a D11 célja teljesül, mert a pénz drágább lett a
tagságnál. De azt jelenti, hogy **a védelem itt is a jelzés**, nem a kapu: egy tanúsító,
aki 293 embert tanúsított, akiknek **nincs más tanúsítójuk**, pontosan az a **kontraszt**,
amit a 11.13-ban 100%-osnak mértünk. ⏳ *A tanúsítói torlódás mérése hátra van.*

## 12.5 ⭐⭐⭐ A VISSZACSATOLÁS — és a törvény, ami kijött belőle

*Csaba szerkezetének utolsó darabja: a felhatalmazás **visszavonható**. Ha a közösség
látja, hogy egy tanúsító üres azonosságokat tanúsít, elveszi tőle a megbízást.*

### ⚠️ ELŐBB EGY SAJÁT HIBA: ROSSZ GRÁFON MÉRTEM

Az első változat a **bemutatkozási** gráfban kereste a mintát (`zsakutcaIsmerosok`) — de a
megvett tanúsító **nem mutatkozik be** a hamisaknak, csak **tanúsítja** őket. A jelzés így
**egyszer sem szólalt meg** (0 visszavonás, 880 hamis pénztárca).

⭐ **A helyes kérdés:** *„azok közül, akiket TANÚSÍTOTTAM, hánynak nincs önálló élete a
közösségben?"* A becsületes tanúsító olyanokat tanúsít, akikkel találkozott — azoknak van
saját ismeretségük; a megvett tanúsító **üres azonosságokat**.

### Az eredmény

| | visszacsatolás nélkül | ⭐ visszacsatolással (2 kör késés) |
|---|---|---|
| hamis azonosság **pénztárcával** | 880 | **120** |
| visszavont megbízás | — | **3** |
| valódi 2. lépcsős | 1404 | **1404** |
| tanúsítók | 333 | **330** |

⭐⭐ **A kár 86%-kal csökken, és a visszavont három megbízás pontosan a három megvett
tanúsítóé** — egyetlen becsületes sem veszítette el a szerepét, a hitelesítettek köre
változatlan.

### ⭐⭐⭐ ÉS A TÖRVÉNY: a kár = a támadó üteme × az ébredés ideje

*Ugyanaz a világ, csak a közösség reakcióideje változik:*

| a közösség ébredése | hamis pénztárca | visszavont megbízás |
|---|---|---|
| **azonnal** (0 kör) | **40** | 3 |
| 2 kör | 120 | 3 |
| 5 kör | 240 | 3 |
| 10 kör | 440 | 3 |

A támadó körönként 40 azonosságot próbál — és a kár **pontosan** `40 × (késés + 1)`.

> ⭐⭐⭐ **Tökéletesen LINEÁRIS, nem exponenciális: a hurok mindig bezárul.** A támadó nem
> tud elszaladni; csak annyit nyer, amennyi ideig a közösség nem néz oda. És a
> **felismerés minden esetben megtörtént** (3 visszavonás mindig) — csak az **időzítés**
> változott.

### ⭐ Amit ez a TERVEZÉSRE mond

Mivel a kár az **ébredés idejével** arányos, a gépi segítség értéke **az ÉSZREVÉTELBEN**
van, nem a döntésben:

- ⭐ **a program azonnal mutassa meg a jelzést** — ez olcsó, biztonságos, és a D49-cel
  összefér (tényt mutat, nem ítéletet);
- ⭐ **a döntés maradhat emberi** (D46: bizonytalanra jelölés + gondolat), mert ha a
  felismerés azonnali, akkor a késés már csak a **megbeszélés** ideje, nem a felfedezésé.

⚠️ **Amit ez a mérés NEM tartalmaz:** a támadó nem reagál a visszavonásra (nem szerez új
tanúsítót a régiek helyett). Egy kitartó támadó **újra és újra** megvásárolna hármat — és
akkor a kár nem egyszeri 120, hanem **ciklusonként** ennyi. Ezt külön kell mérni.

---

## 13. A FELSZABADÍTÁS MEGÜLEPEDÉSE — hány „tiszta buli" kell? (2026-09-08)

**A kérdés (Csaba):** *„ne időhöz kössük, hanem a bulik számához… és mégjobb lenne ezt az
értéket méréssel meghatározni."* A kódban addig egy tippelt `3` állt.

**A mérés:** `node koino/meres/felszabaditasMeres.js` — N készülék, T társ, körönként
kölcsönös csere az ébren lévőkkel. Egy „késő" készülék tart egy határidőn belüli szavazatot,
és `alvasKorok`-ig nem ébred. A hiba a **KORAI** felszabadítás: a hír a felszabadítás UTÁN ér
hozzánk. *(A késői nem hiba: addig csak a keretből hiányzik a pont.)*

### Az eredmény — 50 készülék, 3 társ, 200 ismétlés

| ébrenlét | a késő alszik | a hír terjedése (medián / 90%) | K=2 | K=3 | K=6 | K=8 |
|---|---|---|---|---|---|---|
| 100% | 0 kör | 1 / 2 | **0%** | 0% | 0% | 0% |
| 100% | 5 kör | 1 / 2 | 100% | 100% | 11% | **0%** |
| 100% | **20 kör** | 1 / 2 | 100% | 100% | 100% | **100%** |
| 60% | 0 kör | 2 / 4 | 27,5% | 15,5% | 1,5% | 0,5% |
| 60% | 5 kör | 2 / 4 | 100% | 100% | 65,5% | 14,5% |
| 30% | 0 kör | 6 / 12 | 82,5% | 68,5% | 35% | 16,5% |
| 30% | **20 kör** | 5 / 11 | 100% | 100% | 100% | **100%** |

*(200 készülék / 6 társ mellett a terjedés medián 1 kör, és 100%-os ébrenlétnél már K=2-nél
0% a korai — a hálózat mérete nem rontja el, sőt.)*

### ⛔⛔ AMIT A MÉRÉS MEGCÁFOLT

> **A buli-szám a HÁLÓZAT terjedési idejét méri — nem azt, hogy a döntésben érintett emberek
> megszólaltak-e.**

- ✅ **A hálózat lassúsága ellen véd, és olcsón**: ha mindenki ébren van, **K=2** már 0%-ra
  viszi a korai felszabadítást (200 fősnél is).
- ⛔ **Az ALVÓ készülék ellen viszont SEMMILYEN véges szám nem véd**: 20 kör alvásnál K=8
  mellett is **100%** a korai felszabadítás. És ez nem a modell hibája, hanem a helyzeté —
  a mi számlálónk fut, miközben a másik ember telefonja ki van kapcsolva.

⭐ **A tanulság nem az, hogy melyik szám a jó, hanem hogy ROSSZ DOLGOT SZÁMOLUNK.** A
kockázat nem „a hálózat lassú", hanem *„van, aki még nem szólalt meg, pedig még
megszólalhat."*

### ⭐⭐ AMIT EHELYETT ÉRDEMES MÉRNI — javaslat

A döntés választóköre **ismert** (az érintett entitás tulajdonosai — a saját eseményeinkből
kiszámoljuk). A megülepedés akkor teljes, ha **minden jogosult szavazó láncát ismerjük a
lezárás utáni pontig**: aki ezután írt alá bármit, az már nem tud visszamenőleg beszavazni —
egy határidőn belüli időbélyeg a saját láncában **visszafelé lépő idő** lenne, amit a koino
már ma is felsorol (`idoEllentmondasok`).

⭐ Ez nem valószínűség, hanem **bizonyíték** — és pont abból áll, amit a csere úgyis
megmond (`ALLAS`: szerzőnként a legnagyobb sorszám), illetve amit a `Lattam` esemény (D61)
kifejezetten aláír.

⚠️ Akitől semmi nem érkezett a lezárás óta, arról továbbra sem tudunk semmit — ott marad a
buli-szám mint **másodlagos, olcsó heurisztika**. *De a fő jel a láncok vége legyen, ne a
körök száma.*

---

## 14. AZ ALAPÉRTÉK SÚLYA — számít-e a hallgató tulajdonos? (2026-09-11)

`node koino/meres/kuszobMeres.js`

**A kérdés** Csaba felvetéséből jött, az alkotmány (D64) elhalasztása után: *„A fontosabb
ügyek súlyosabbá tételét elegendő az ALAPÉRTÉK meghatározásával elérni. Pl. a pénz esetében
alap 2/3-os érték javaslatok, amik módosíthatók, de attól lesz nehéz, hogy a program
használatában **passzív** e-emberek érték javaslatai teszik nehézzé a döntési keretek
módosítását."*

⚠️ „Passzív" itt **nem** a `szerep: 'passziv'` mező, hanem a program használatában passzív
tömeg: tulajdonos, de sosem nyúl a küszöbökhöz.

### Az eredmény

N tulajdonos egy gondolaton, közülük **egy** ad be érték javaslatot, a többi hallgat.
Az alapérték 51.

| tulajdonos | a hangos értéke | **MA érvényes** | Csaba modellje szerint |
|---:|---:|---:|---:|
| 2 | 90 | **90** | 51 |
| 3 | 90 | **90** | 51 |
| 9 | 90 | **90** | 51 |
| 21 | 90 | **90** | 51 |
| 9 | 20 | **20** | 51 |
| 21 | 20 | **20** | 51 |

⛔⛔ **A hallgató tulajdonos MA NEM SZÁMÍT.** A `kuszobokItt` (`javaslatSzamitas.js`) a
**beadott érték javaslatokon** megy végig, nem a tulajdonosokon — tehát az `ALAP_KUSZOBOK`
**nem súly, hanem tartalék**: csak akkor él, ha *senki* nem szólt. **Huszonegy tulajdonos
küszöbét egyetlen ember állítja**, mindkét irányban (a mérés felfelé és lefelé is nézi,
hogy ne legyen vak).

### ⭐ Mit jelent ez

⚠️⚠️ **ELŐSZÖR TÚL SZÉLESRE VETTEM, ÉS CSABA KIJAVÍTOTTA (ugyanaznap):** azt írtam, hogy az
egész küszöb-rendszert át kellene állítani (a medián a teljes tulajdonosi körön, a hallgatók
az `ALAP_KUSZOBOK`-kal). ⛔ **Nem ez a terv.** Csaba pontosítása:

> *„A »normál entitások« érték javaslatai rendszerét nem kell módosítani, hanem majd a
> jövőben az igazán fontos, **programot vagy pénzt módosító** ügyek kapnának alap érték
> javaslatot (**67% részvétel, 67% támogatottság**) **mindenkitől**. Ezek a **program által
> megírt javaslatok** lennének, amit egy e-ember indít, és rak is rá tudatpontot."*

⭐ Vagyis a változás **nem a küszöb-rendszeré, hanem EGY JAVASLAT-FAJTÁÉ**: a hétköznapi
entitás marad, ahogy van, és csak a **sablonból született, program- vagy pénz-ügyű** javaslat
viszi magával a saját döntési keretét — úgy, hogy **mindenki alapból 67/67-et tart**, amit
egyenként felül lehet írni saját érték javaslattal.

⭐⭐ **A mérés ettől nem lesz kevesebb — ez a mérés a FUNDAMENTUMA:** a 14. mérés azt mondja
ki, hogy **a koinóban ma SEHOL nincs olyan mechanizmus, hogy egy hallgató ember „tart" egy
alapértéket**. Tehát a szűk változat is ugyanezt a kódrészt kívánja (`kuszobokItt`), csak
**javaslat-fajtára kapuzva** — nem repó-szinten.

⭐⭐⭐ **És ami szép benne: ez ENTRENCHMENT MENEKÜLŐÚTTAL.** A 67/67 nem beégetett
állandó, amit csak programozó mozdíthat (mint a `KATEGORIA_KORLAT`), és nem is új gépezet
(mint az alkotmány): **a közösség el tudja mozdítani — de csak úgy, ha az emberek fele
tényleg bead egy másik értéket.** *A menekülőút pontosan olyan nehéz, mint amit véd.*

### ⚠️ Amit el kell dönteni, mielőtt kód lesz belőle

- ⚠️⚠️ **„Mindenkitől" — kitől pontosan?** A koino **minden tagjától** (`identitas.js`), vagy
  annak az entitásnak a tulajdonosaitól, ahol a javaslat áll? Program- és pénz-ügynél a
  „mindenki" a természetes olvasat — és ⭐ **akkor ez ugyanaz a globális választókör, amit a
  D65 és a globális passzív/aktív ötlet is kíván**. *Három oldalról ugyanaz a mechanizmus.*
- ⛔⛔ **67% RÉSZVÉTEL egymilliárdnál = 670 millió szavazó.** A 9. szabály próbája: a
  globális alkotmánynál Csaba **szándékosan** választotta a majdnem-elérhetetlent
  (*„ez fogja adni a súlyát"*) — itt viszont a pénz **kereteinek** módosításáról van szó, és
  ha az gyakorlatilag lehetetlen, a keret **örökre befagy**. *A „nehéz" és a „lehetetlen"
  két különböző terv.* ⭐ **És a saját globális passzív/aktív ötleted a válasz rá:** ha a
  témában passzívvá nyilvánítottak kimaradnak a nevezőből, a 67% azok közt mérődik, akik
  **kérték, hogy számítsanak** — így lesz nehéz anélkül, hogy lehetetlen lenne.
- ⚠️ **A „program által megírt javaslat" két dolgot hoz egyszerre:** kötött **mezőkészletet**
  (amit a számítás ellenőrizni tud) **és** kötött **döntési keretet** (a 67/67). Ma a keret
  mindig a CÉL entitásból jön; itt a **sablonból** jönne. Új tengely, de kicsi.
- ⏸️ **És az évek óta néma tulajdonos**: ha az alapérték súlyt kap, az is szavaz, aki rég
  elhagyta a koinót. A néma készülék problémáját egyszer már megoldottuk
  (`allapot.lancVegek`, 13. mérés).

⚠️ *Csaba kimondta, hogy ez még nem kiforrott: „most még nincs kiforrva a fejemben a legjobb
megoldás, csak ötletelek." Ez a szakasz tehát **irány**, nem terv.*

---

## 15. A PROGRAM-VERZIÓ MINT AZ ÁLLAPOT BEMENETE (2026-09-11)

`node koino/meres/verzioMeres.js ir` → a `szabalyok.js` állandójának átírása → `… olvas`

**A kérdés** a „hogyan lehetne dinamikus a program" beszélgetésből jött. A koino alapmondata
*„ugyanazokból az eseményekből ugyanaz jön ki"* (D17) — de a `TUDATPONT_KERET`, a
`KATEGORIA_KORLAT` és az `ALAP_KUSZOBOK` a **programban** van, nem az eseményekben. ⭐ Ez a
mérés azt dönti el, hogy ez **elméleti aggodalom-e vagy mérhető kár**.

**A bemenet mindkét oldalon BÁJTRA UGYANAZ:** 8 aláírt esemény — négy gondolat, egyenként
2000 tudatponttal (összesen 8000). Csak a **programot** cseréltük alatta.

| | keret = 10 000 | keret = 5 000 |
|---|---:|---:|
| létező entitás | **4** | **2** |
| összes tudatpont | **8000** | **4000** |
| kivétel (kihagyott esemény) | 0 | **2** |
| **állapot-ujjlenyomat** | `taeExu20HCLplFGwbhixvpo1HnLXUlajbrOWkD1GA3c` | `H_ZcH6Z4oP4HNtWKMU8MIJGv0zsU2ublnvzz_gySc30` |

### ⛔⛔ Az eredmény: a koino KETTÉHASAD, és egyik gép sem tudja

Nem „kicsit mást mutat": a második készüléken **a gondolatok fele nem létezik**, és a rájuk
tett tudatpont sincs sehol. A kivétel-indok a saját naplójában is becsületes
(*„a bemondott összeg túllépi a keretet (6000 / 5000)"*) — ⚠️ **csak épp nem igaz**: a szerző
nem lépte túl a keretet, az olvasó programja ismer más keretet.

⛔ **És a csere ezt nem veszi észre.** A csere a **lánc** ujjlenyomatát veti össze (ki hány
eseményt írt alá), nem az **állapotét**. A két készülék tökéletesen szinkronban lesz —
ugyanaz a 8 esemény mindkettőnél —, miközben **mást számol belőle**. *A csere azt méri, hogy
ugyanazt TUDJUK-e; nem azt, hogy ugyanazt SZÁMOLJUK-e.*

### ⭐ Mit bizonyít ez

1. **A D65 aggodalma nem elméleti.** A program verziója **ma is bemenete az állapotnak**, és
   az eltérés **csendes**.
2. ⭐⭐ **A javítás iránya megerősítve:** ami **paraméter** (szám, amit a közösség dönt), az az
   **eseményekbe** tartozik; ami **gépezet** (algoritmus, képesség-lista), az a **programba**.
   A leltár szerint (`koino/js/` 54 konstans) mindössze **hat** befolyásolja az állapotot:
   `TUDATPONT_KERET` · `ALAP_KUSZOBOK` · `KATEGORIA_KORLAT` · `MEGHIVO_KELL` ·
   `TANUSITAS_KELL` · `FELHATALMAZAS_KELL`. ⭐ Az utolsó három a **D57/b és D60** szerint
   amúgy is mediánná válna — vagyis a valódi új munka **három szám**.
3. ⚠️ **A többi 48 konstans ártalmatlan** (portok, időzítések, `MAX_DARAB`, a felfedezés): a
   3. szabály szerint sosem terjednek és semmit nem döntenek el — eltérésnél legfeljebb
   lassabb, de **az állapot ugyanaz**. *(Az `ONALLO_KUSZOB` is ide tartozik: a `jelzesek.js`-t
   a döntés-réteg nem importálja.)*
4. ⭐ **És egy külön tétel, amit ez a mérés hozott ki:** a cserének **szabály-lenyomatot** is
   össze kellene vetnie, nem csak lánc-lenyomatot. Az állapot-ujjlenyomat **már létezik**
   (`osszehasonlitas.js`) — ma csak kézzel, az `ujjlenyomat` paranccsal használjuk.

⚠️ **Amit ez a mérés NEM mond meg:** hogy a szabály-lenyomat mennyibe kerülne egy csere-körben
(ma egy „nincs újdonság" kör 334 bájt), és hogy eltérésnél mit tegyen a készülék a
bejelentésen túl. *Az külön döntés — a koino bejelent, nem bíráskodik (D19).*

---

## 16. A FÁJL-ÁTVITEL SEBESSÉGE AZ ÁTFÚRT RÉSEN (2026-09-13)

`node koino/meres/resSebessegMeres.js`

A randevú (5.7 / C) megépítésekor egy szerkezeti tulajdonság látszott, amit **meg kellett
mérni, nem megbecsülni**: a UDP-vonal **egyszerre egy darabot tart úton** (stop-and-wait,
`udpVonal.js`), és egy darab 1000 bájt.

```
  mérés                          méret        idő      sebesség
  ──────────────────────────────────────────────────────────────
  TCP (helyben)                  64 KB       13 ms    4923 KB/s
  UDP-rés (helyben)              64 KB       22 ms    2909 KB/s
  TCP (helyben)                 256 KB       24 ms   10667 KB/s
  UDP-rés (helyben)             256 KB       75 ms    3413 KB/s

  UDP-rés (+1 ms/csomag)         64 KB     2606 ms      25 KB/s
  UDP-rés (+5 ms/csomag)         64 KB     2781 ms      23 KB/s
```

### Amit ez megmond

1. ⭐ **Helyben a rés alig lassabb:** 2909 vs. 4923 KB/s — a pajzsfúrás önmagában nem drága.
   *A randevú tehát nem „vészmegoldás", hanem teljes értékű út.*
2. ⛔⛔ **De a késleltetés összeomlasztja:** már **1 ms/csomag** mellett is **25 KB/s** —
   **116-szoros** esés. Egy valódi internetkapcsolaton (10–50 ms) ez a nagyságrend a mérvadó,
   nem a helyi szám.
3. ⭐⭐ **És a szelet mérete ezen NEM segít.** A 64 KB ~87 darabra bomlik, és 87 darab az
   87 oda-vissza — akár egy szeletben van, akár nyolcban. *A szűk keresztmetszet a vonal
   ablaka, nem a szelet.*

### ⚠️ Amit ez a mérés NEM mond meg

- **A +1 és a +5 ms közti különbség eltűnt** (25 vs. 23 KB/s), pedig ötszörös a késleltetés.
  Ez a mérés **határa**, nem eredmény: ezen a szinten valószínűleg a `setTimeout` felbontása
  és az újraküldési óra dominál, nem a bevitt késleltetés. *Valódi hálózaton kell újramérni.*
- Hogy **mennyivel javítana egy ablak** — ahhoz meg kellene építeni.

### ⏸️ A következmény, ha egyszer sorra kerül

A **vonalnak ablak kell** (több darab úton egyszerre), nem a szeletnek más méret.

### ⭐⭐ KITERJESZTVE (2026-09-14): VESZTESÉG, INGADOZÁS, LASSÚ VONAL — a D67 alapvonala

*A **D67** szerint a vonalnak **veszteségre reagáló ablakot** kell kapnia. ⛔ Veszteség-választ
viszont nem lehet becsületesen megépíteni olyan műszerrel, ami **soha nem veszít csomagot** —
az ugyanaz a csapda lenne, mint a vak próba. Ezért a műszer nőtt először, nem a vonal.*

**Amit a lap mostantól tud:** állítható **csomagvesztés** · **ingadozó** késleltetés (ettől a
csomagok sorrendet is cserélnek) · **magvas véletlen** (ugyanaz a mag → ugyanaz a
veszteség-minta, hogy az „ablak előtt / ablak után" **mérés** legyen, ne szerencse) · és a
**küldött csomagok száma**, a tökéletes vonalhoz viszonyítva.

```
  mérés                            méret        idő      sebesség
  ──────────────────────────────────────────────────────────────────────────────
  UDP-rés (helyben)                64 KB       23 ms    2783 KB/s    182 csomag
  UDP-rés (+1 ms)                  64 KB     2649 ms      24 KB/s    182 csomag
  UDP-rés (1 ms ± 5 ms szórás)     64 KB     2709 ms      24 KB/s    182 csomag
  UDP-rés (1 ms ± 20 ms szórás)    64 KB     3436 ms      19 KB/s    182 csomag
  UDP-rés (1 ms, 1% vesztés)       64 KB     3241 ms      20 KB/s    185 csomag  x1.0
  UDP-rés (1 ms, 5% vesztés)       64 KB     5808 ms      11 KB/s    198 csomag  x1.1
  UDP-rés (1 ms, 15% vesztés)      64 KB    17042 ms       4 KB/s    246 csomag  x1.4
  UDP-rés (200 ms -> 400 ms oda-vissza)  8 KB   5490 ms    1 KB/s     59 csomag  x2.0
  UDP-rés (400 ms -> 800 ms oda-vissza)  8 KB  10940 ms    1 KB/s     89 csomag  x3.0
```

#### ⭐⭐⭐ A legfontosabb lelet: a LASSÚ vonalon MI pazarolunk

A `x` oszlop a tökéletes vonalhoz viszonyít. ⭐ Késleltetésnél és ingadozásnál **x1,0** — a
vonal lassú, de **nem pazarol**. ⛔⛔ **400 ms oda-visszánál x2,0, 800 ms-nál x3,0** — vagyis
minden darab **két-háromszor** megy ki, és ez **önhiba**: a `UJRAKULDES_KOZ` **fix 300 ms**
rövidebb, mint az oda-vissza, tehát **újraküldünk olyat, ami éppen ÚTON van.**

⭐ *Ez a szám a D67 második darabjának (mért RTT) a bizonyítéka — és nem érv, hanem mérés.*
⚠️ Műholdas, mobil- és zsúfolt vonalakon a 400–600 ms hétköznapi, tehát ez nem szélsőség.

#### ⚠️ ÉS AMIT A MÉRÉS CÁFOLT — a saját állításomat

A kiterjesztés jegyzetébe azt írtam, hogy a vonal *„20 próbálkozás után FELADJA — ez egy
lassú vagy lyukas vonalon idő előtti feladás"*. ⛔ **Nem adta fel:** sem 15% veszteségnél,
sem 800 ms oda-visszánál. Az `ismetles` számláló **darabonként nullázódik**, és a nyugta
mindig megérkezett a 20. próbálkozás előtt. *A kár nem a feladás, hanem a megsokszorozott
forgalom — és ezt csak azért tudjuk, mert megmértük ahelyett, hogy elhittük volna.*

#### ⛔ Két SAJÁT műszer-hiba, felírva

1. **A késleltetett küldések túlélték a foglalat bezárását** — 400 ms-nál a mérés
   `ERR_SOCKET_DGRAM_NOT_RUNNING`-gal **összeomlott**. ✅ Javítva (órák nyilvántartása +
   zárás-jelző). *A műszert is meg kell mérni.*
2. ⚠️ **Az első csomag-oszlopom HAZUDOTT:** a „×1,4"-et újraküldésnek olvastam, pedig a
   **base64 (+33%) és a nyugták** adták. ✅ Javítva: a viszonyítás mostantól a **mért**
   alapvonal (ugyanaz a fájl tökéletes vonalon), nem egy számolt ideál. *Egy rossz
   viszonyítási pont magabiztos, kerek és hamis számot ad.*

#### ⏸️ És egy tétel, ami ebből a mérésből nőtt ki

⚠️ **A base64-adó láthatóvá vált:** 64 KB-ból **182 csomag** lesz (~87 adat + ~87 nyugta),
pedig 1000 bájtos darabokkal 65 elég volna. A fájl-szelet ugyanis `base64`-ként utazik a
JSON-ban (`vonal.js:279`) — **+33% minden bájton**. Kis eseményeknél ez ár nélküli kényelem,
**nagy fájloknál valódi teher** (D67, 6. pont).

 ⭐ És ez a
`udpVonal.js`-ben marad, a fájl-átvitel **egyetlen sorának változtatása nélkül** — mert az
átvitel a kapcsolatot **kapja**, nem ő nyitja (1. szabály).

---

## 17. ⭐⭐⭐ A PAJZSFÚRÁS MEGISMÉTELVE EGY MÁSIK HÁLÓZAT-PÁRON (2026-09-13, 22:38)

*Terepmérés. Csaba a telefonnal a szomszédban, a fejlesztői gép itthon. A kérdés az volt,
hogy átmegy-e a **TCP**-pajzsfúrás két valódi hálózat között — ⛔ **arra a kérdésre ez a
mérés NEM válaszolt** (lásd lentebb), de közben megismételte a 2026-08-29-i UDP-eredményt
egy **teljesen másik hálózat-páron**, és három hiányt hozott felszínre.*

### Az eredmény

```
az én oldalam (itthon)                  a telefon (a szomszédban)
────────────────────────────────────    ────────────────────────────────────
⭐ KÍVÜLRŐL ÍGY LÁTSZOM:                 ⭐ KÍVÜLRŐL ÍGY LÁTSZOM:
   31.46.250.205:54013                     5.187.186.127:7373
   (a router ÁTÍRTA a portot)              (a router MEGTARTOTTA)

⭐ A PAJZS ÁTFÚRVA — mindkét irány.      ⭐ A PAJZS ÁTFÚRVA — mindkét irány.
  236 kopogás, 5 válasz, 237 348 ms       1 kopogás, 1 válasz, 190 ms

CSERE A RÉSEN                           CSERE A RÉSEN
  ✓ 0 új esemény, 1 kör, 807 bájt         ✓ 0 új esemény, 1 kör, 1,4 KB
```

### ⭐⭐ A legfontosabb szám: 190 ms — és amit a 237 másodperc jelent

A két idő **nem ugyanazt méri**. A 237 másodperc az én oldalamon **nem a fúrás ára volt,
hanem a várakozásé** — addig kopogtam egyedül, amíg a másik fél el nem indult. Abban a
pillanatban, hogy a telefon kiszólt, a rés **az első kopogásra** összeért: **190 ms**.

⭐⭐⭐ **Ez a pajzsfúrás valódi költsége, és ez az érv a BULI mellett.** A fúrás nem lassú és
nem bizonytalan — **egyidejűséget** kíván. Ha a két készülék tudja, mikor keresse a másikat,
ez két tized másodperc; ha nem tudja, órákig kopognak egymás mellett — *ahogy ezen az estén
négy órán át tettük is.*

### ⭐ Amit megismételt (és ezzel megerősített)

A 2026-08-29-i mérés (232 ms, illetve 83 ms) **egy másik hálózat-páron** történt. Ez a mérés
ugyanazt adta **más szomszéddal, más wifin, hónapokkal később**: két hétköznapi hálózat
összeér, **továbbító nélkül, port-továbbítási szabály nélkül, szolgáltató nélkül az útban**.
*Az akkori siker tehát nem szerencse volt.*

### ⛔⛔ ÉS AMIT EZ A MÉRÉS NEM BIZONYÍT — a TCP kérdése NYITVA MARAD

A TCP-fúróval indultunk, és **négy órán át nem ment**. ⚠️ **Ez nem cáfolat**, és pontosan
tudjuk, miért nem:

- a routerem az IPv4-es portot **minden foglalatnál átírja, más-más számra**
  (mérve: **25787 → 6119 → 33905 → 54013**);
- a UDP-fúró ezt **megméri a saját fúró-foglalatáról** (`ba9ce7b`), és ezért talált célba;
- ⛔ a **TCP-fúrónak nincs ilyen mérése** — a tükör `udp4`-re van drótozva —, tehát a másik
  fél a `7373`-ra kopogott, ahol nincs rés.

⭐ Vagyis a nagy kérdés — *„megkapjuk-e ingyen a TCP negyven évnyi csiszolását?"* — továbbra
is **eldöntetlen**, és a mai nap megmondta, **mi kell hozzá**: a TCP-fúrónak meg kell tudnia
a saját külső TCP-portját.

⚠️⚠️ **És egy kemény kérdés, amit előbb kell megmérni, mint bármit megépíteni:**
**célfüggetlen-e a routerem TCP-leképezése?** A UDP-re ez **mérve igen** volt (2026-08-29,
két tükörrel) — TCP-re **nem tudjuk**. ⛔ Ha TCP-n **kapcsolatonként** ad új külső portot,
akkor a portot **elvi okból nem lehet előre megtudni**, és a TCP-pajzsfúrás ezen a vonalon
**nem lehetséges** — semmilyen programmal. *Ez a mérés olcsó (két tükör, két különböző cél),
és megspórolhat egy fölösleges építést.*

### ⛔ Három hiány, amit ez az este hozott felszínre

1. ⛔⛔ **Az ideiglenes IPv6-cím nem adható ki előre.** A telefon „privacy" címe **négy óra
   alatt háromszor** cserélődött (`…4642:…621` → `…3f0d:…99e6` → `…1d80:…e12`). Egy előre
   megbeszélt cím **a kimondás pillanatában elavulhat**. ⭐ *Eddig a randevút azért terveztük,
   mert a fúrás egyidejűséget kíván; most kiderült, hogy a **cím érvényessége** miatt amúgy is
   kötelező lenne.*
2. ⛔ **A tükör `udp4`-re van drótozva** (`pajzsfuro.js:167`, `kulsoCim`). Ezért IPv6-on a
   fúró **vak**: nem tudja megmondani, mit adjunk át a másiknak. Négy óra ment el erre.
3. ⚠️ **A fúró nem mondja meg, melyik SAJÁT címéről szól ki.** Két globális IPv6 mellett az
   OS választ, és ha nem azt adtuk meg a másiknak, a rés **a másik címhez** nyílik — a
   csomagok némán elvesznek, **tökéletes szimmetriában**, ami elfedi az okot. A javítás egy
   `localAddress` a `connect()`-ben, és **ugyanannak a címnek a kiírása** átadásra.

### ⚠️ Egy mérési bizonytalanság, felírva

Ugyanarra a csere-körre az egyik oldal **807 bájtot** mondott, a másik **1,4 KB-ot**. A két
szám **nem ugyanazt számolja** (küldött vs. teljes forgalom). Nem hiba, de a **6. szabály**
miatt — az adat-csomag mérete **kemény** korlát — tudni kell, melyik a mérce.

---

## 18. ⭐⭐⭐ CÉLFÜGGETLEN-E A ROUTER TCP-LEKÉPEZÉSE? (2026-09-13)

`node koino/meres/tcpLekepezesMeres.js [helyi port]`

*A 17. mérés nyitva hagyta a TCP-pajzsfúrás kérdését, és Csaba döntése az volt, hogy **előbb
a mérés, ne az építés**: „Enélkül ha megépítjük a TCP külső-port felderítést, lehet, hogy egy
elvi falnak építünk."* ⛔ **A fal nincs ott.**

### A kérdés, és miért eldöntő

- **célfüggetlen** leképezés → ugyanaz a helyi port MINDEN célpont felé UGYANAZT a külső
  portot kapja. A tükörtől kapott szám tehát **egy harmadik félre is érvényes**, vagyis
  bemondható → a TCP-fúrásnak van értelme.
- **cél-függő** leképezés → minden célponthoz új külső port jár. A tükör válasza **csak a
  tükörre igaz**, a társra nem → a TCP-pajzsfúrás **lehetetlen, semmilyen programmal**.

### Az eredmény

```
1. KONTROLL — UDP (erről tudtuk: célfüggetlen)
  10 tükör felelt, mind:  31.46.250.205:6251

2. ELŐSZŰRÉS — TCP, RÖPKE portról (csak elérhetőség)
  nextcloud  ✓ 31.46.250.205:63543
  antisip    ✓ 31.46.250.205:63598
  dus        ✓ 31.46.250.205:63600      (a többi 14 néma vagy elutasít)

3. A MÉRÉS — TCP, mindig a 7373-es HELYI portról
  nextcloud  ✓ 31.46.250.205:63539
  antisip    ✓ 31.46.250.205:63539
  dus        ✓ 31.46.250.205:63539

  UDP: ⭐ CÉLFÜGGETLEN      TCP: ⭐ CÉLFÜGGETLEN
```

### ⭐⭐ Amit ez megmond

1. ⭐⭐⭐ **A TCP-leképezés célfüggetlen** — három **különböző cég, három különböző IP**, és
   mindhárom **ugyanazt** a külső portot látja. *A TCP-pajzsfúrásnak tehát van értelme, és a
   17. mérés bukása valóban csak azon múlt, hogy a fúró nem kérdezi meg a saját portját.*
2. ⭐ **A port átíródik, de KISZÁMÍTHATÓAN:** 7373 → 63539. Nem az a baj, hogy más szám —
   hanem az volt, hogy **nem kérdeztük meg**.
3. ⭐⭐ **És a mérés bizonyítottan nem vak:** a **röpke** portokról három **különböző** szám
   jött (63543 · 63598 · 63600), a **rögzített** portról **háromszor ugyanaz**. *A mérés
   tehát érzékeny a helyi portra, és érzéketlen a célpontra — pontosan ez a célfüggetlenség.*

### ⚠️ Amit ez a mérés NEM mond meg

- **Nem bizonyítja, hogy a NEGYEDIK kapcsolat is ugyanazt a portot kapja.** Három egymás
  utáni kapcsolat tartotta a leképezést; ez erős jel, nem tétel. *A fúrásnál ezért a mérésnek
  ugyanabban a menetben kell megtörténnie, mint a kopogásnak.*
- **A társ oldaláról semmit** — a 17. mérés szerint az ő routere megtartja a portot, de az
  egy másik hálózat.
- **Nem méri, hogy a rés valóban átfúrható-e TCP-vel.** Ez elvi akadályt zárt ki, nem sikert
  igazolt. *A választ egy újabb terepmérés adja meg.*

### ⛔ Két SAJÁT mérési hibát fogott meg ez a lap — felírva

1. ⛔⛔ **Az első futás IPv6-on kapott választ, és a kód IPv4-nek olvasta.** A `pajzsfuro.js`
   `stunbolCim`-je **vakon négy bájtot olvas IPv4-ként**, a család-bájt megnézése nélkül —
   így a nextcloud IPv6-válaszából `32.1.76.77` lett, ami valójában a **saját `2001:4c4d…`
   címem első négy bájtja**. *A mérés nem hazudott volna nagyobbat, ha kitalálja a számot.*
   ✅ Itt javítva (család-bájt + `family: 4`), ⏸️ **de a `pajzsfuro.js`-ben még benne van.**
2. ⛔⛔ **A második futáson mind az öt tükör `EADDRINUSE`-szal bukott** — mert egy válasz
   nélkül elakadt kapcsolat `SYN_SENT`-ben **fogva tartja a rögzített helyi portot**. *Ez a
   kép a routerről szólt volna, pedig a MI sorrendünk volt rossz.* ✅ Megoldás: **előszűrés
   röpke portról** (ki felel egyáltalán?), és a rögzített portot csak a beszédesekre költjük.

⭐ *Mindkettő ugyanaz a tanulság, sokadszor: a mérőeszközt is meg kell mérni. Az első két
futás „eredménye" magabiztos és hamis volt.*

---

## 19. ⭐⭐⭐ A TCP-PAJZSFÚRÁS ÁTMEGY KÉT VALÓDI HÁLÓZAT KÖZÖTT (2026-09-13, 23:34)

*Ez a Szakasz 2 utolsó nyitott kérdése, és a napló szerint **soha korábban nem mértük meg**:
a 2026-08-29-i és a mai 17. mérés egyaránt **UDP**-vel ment. A válasz: **IGEN**.*

```
⭐ KÍVÜLRŐL ÍGY LÁTSZOM TCP-N: 31.46.250.205:63517   (a helyi 7373-esről, nextcloud szerint)
   ⚠ A router átírta a portot (7373 → 63517) — ezért KELL bemondani.

  23:30:23 → 1. próbálkozás…      ✗ némán eldobták
  …  (15 próbálkozás, amíg a másik fél a RÉGI számomra kopogott)
  23:34:08 → 16. próbálkozás…
     ⭐ ÁTFÚRVA a 16. próbálkozásra! (11474 ms)

⭐ A PAJZS ÁTFÚRVA — most jön a csere ugyanezen a kapcsolaton.
Csere kész — kaptam 0 új eseményt, küldtem 0 (1 kör)
```

| | Gép (itthon) | Telefon (a szomszédban) |
|---|---|---|
| **külső TCP-cím** | `31.46.250.205:63517` | `5.187.186.127:7373` |
| a NAT viselkedése | **átírja** a portot | **megtartja** a portot |
| **átfúrva TCP-vel** | ⭐ a 16. próbálkozásra (11 474 ms) | ⭐⭐ **az 1.-re, 76 ms** |
| **a csere a résen** | ✓ 1 kör | ✓ 1 kör |

⭐⭐ **A 76 MS A VALÓDI SZÁM, ugyanúgy, mint a 17. mérésnél.** A telefon azért fúrt át az
**első** próbálkozásra, mert a másik oldal addigra már folyamatosan kopogott — a rés készen
állt, csak a helyes szám hiányzott. *A gép 16 próbálkozása nem a fúrás ára volt, hanem a
rossz címé és a várakozásé.*

⚠️ **És egy mellékes lelet a telefon naplójából: az ANDROID ALTATÁSA látszik.** A 13 mp-esre
tervezett próbálkozások közül kettő **218 843 ms** és **100 667 ms** lett — a készülék aludt,
és az óra megnyúlt. *Ez nem a hálózat lassúsága; ez az, amiért a buli-szám mérésénél is az
alvó készülék volt a legnehezebb eset (13. mérés).*

### ⭐⭐⭐ Amit ez eldönt

1. ⭐⭐⭐ **A TCP-pajzsfúrás MŰKÖDIK két hétköznapi hálózat között** — továbbító nélkül,
   port-továbbítási szabály nélkül, egyik routeren sem állítottunk be semmit. ⭐ **És a koino
   cseréje átment rajta**, ugyanazon a kapcsolaton.
2. ⭐⭐ **A TCP negyven évnyi csiszolása elérhető** — ablak, torlódás-vezérlés, újraküldés —,
   **ott, ahol a router célfüggetlen.** ⛔⛔ **DE EBBŐL NEM LETT „az ablakot nem kell
   megépíteni": Csaba a mérés után az ELLENKEZŐJÉT döntötte** — lásd a lap alján.
3. ⭐ **A 18. mérés helyesnek bizonyult a gyakorlatban is:** a célfüggetlen leképezés miatt a
   tükörtől kapott szám **a társra is érvényes volt** — a fúrás pontosan arra a portra ért be.

### ⛔⛔ ÉS AMIT A MÉRÉS KÖZBEN ÉLŐBEN MEGMUTATOTT: A SZÁM NEM ADHATÓ KI ELŐRE

A külső TCP-portom **három futáson át három különböző szám volt**:

```
63539  (a 18. mérés)        63495  (próba-futás)        63517  (az éles fúrás)
```

⛔ A társ az **első tizenöt próbálkozás alatt a RÉGI számomra kopogott** — ezért a néma
eldobások. A siker abban a percben jött, amikor a **friss** számmal indult újra.

⭐⭐⭐ **Ez a BULI (randevú) harmadik, egymástól független igazolása egy estén:**

- az ideiglenes **IPv6-cím** négy óra alatt háromszor cserélődött (17. mérés),
- a külső **UDP-port** foglalatonként más (17. mérés),
- és most a külső **TCP-port** futásonként más (19. mérés).

*A címet tehát nem lehet előre megbeszélni — csak a találkozás pillanatában átadni. A buli
nem kényelem, hanem működési feltétel.* ⭐ És a fúró mostantól **magától kimondja** a saját
számát (18. mérés nyomán), tehát a bulinak már van mit átadnia.

### ⚠️ Amit ez a mérés NEM mond meg

- **Egy hálózat-pár.** Az egyik oldal port-átíró, a másik port-megtartó. ⏸️ **Két port-átíró
  NAT között** (pl. két CGNAT) újra kell mérni — ott nehezebb.
- **A számcsere kézi volt.** A fúrás sikerült, de a portokat mi írtuk át egymásnak; a buli
  ezt fogja elvégezni, és az még nincs megépítve.
- **Nem mértük a sebességet** a TCP-résen — csak azt, hogy a csere lefut rajta.

### ⛔⛔⛔ ÉS A DÖNTÉS, AMIT EZ A HÁROM MÉRÉS EGYÜTT HOZOTT (Csaba, 2026-09-13)

> *„Ez egy nagyon fontos különbség, ami nekem azt mondja, hogy az UDP-ét kell használnunk, és
> nem ússzuk meg a munkát. De ez nem baj, ha ettől lesz készülék- és router-független."*

⭐⭐⭐ **A mérés tehát NEM azt döntötte el, hogy melyik a gyorsabb, hanem hogy melyik az,
AMELYIK MINDENHOL MŰKÖDIK.** A különbség nem sebességbeli, hanem szerkezeti:

- ⭐ **UDP: egy foglalat = egy leképezés.** A fúró **abból a foglalatból** méri meg a portját,
  amellyel kopogni fog — a szám tehát **biztosan igaz**, amíg a foglalat él. *Ez a modellből
  következik, nem a router jóindulatából.*
- ⚠️ **TCP: minden kapcsolat külön kapcsolat.** Csak azért osztoznak egy leképezésen, mert ez
  a router **célfüggetlen** (18. mérés). ⛔ Egy cél-függő NAT mögött a TCP-fúrás **elvi okból
  lehetetlen** — semmilyen programmal.

⛔⛔ **ÉS ITT A 9. SZABÁLY SZÓL:** *„ez mit csinál egymilliárd e-embernél?"* — egymilliárdnál
**nem lehet előfeltétel, hogy a router célfüggetlen legyen.** Ami a 19. mérésben sikerült, az
ezen az egy vonalon sikerült; a 9. szabály szerint a verzió-eltéréshez hasonlóan a
**router-eltérés is alapállapot, nem kivétel**.

⭐ **Következmény, kimondva:** a **UDP-vonal ABLAKÁT MEG KELL ÉPÍTENI** (16. mérés: a mai
stop-and-wait 1 ms/csomag késleltetésnél **25 KB/s**). ⏸️ Az ablak a `udpVonal.js`-ben marad,
és a fájl-átvitel **egyetlen sorának változtatása nélkül** — mert az átvitel a kapcsolatot
**kapja**, nem ő nyitja (1. szabály).

⭐ **A TCP-út nem vész el, csak lefokozódik:** marad **alkalmi gyorssáv** ott, ahol a vonal
engedi (a `tcpLekepezesMeres.js` meg tudja mondani, hogy engedi-e). *Az 1. szabály — a
szállítás cserélhető marad — épp ezt teszi olcsóvá: kettő megtartása nem két gépezet, mert a
`parbeszed` mindkettőn változatlanul fut.*

---

## 20. ⭐⭐⭐ AZ ABLAK — a UDP-vonal nagyságrendet ugrott (2026-09-14, D67 / 3. darab)

*A **D67** négy darabja közül ez a harmadik. ⚠️ És **nem ebben a sorrendben kezdtük**: előbb
a mért RTT-vel próbálkoztam (1. darab), amit a mérés **megbuktatott** — lásd lentebb.*

### Amit a vonal kapott

- ⭐ **Csúszóablak**: egy helyett **`ABLAK` = 16** darab lehet egyszerre úton.
- ⭐⭐ **Gyors újraküldés**: ha egy **későbbi** darabot már nyugtáztak, az **bizonyíték**,
  hogy a korábbi elveszett — a hálózat ugyanis továbbvitte azt, ami utána indult. *Nem kell
  megvárni az órát.* ⚠️ Három ilyen jel után lépünk, mert a **sorrend-csere** önmagában még
  nem vesztés (ugyanaz a szám, amit a TCP is használ, és ugyanazért).
- ⛔ **A fogadó puffer korlátos lett**: az `ABLAK`-on túli darabot **nem tároljuk és nem is
  nyugtázzuk**. *Ez korábban korlát nélküli térkép volt — egy gyors vagy rosszindulatú társ
  határtalanul növelhette a memóriánkat. Ma is defekt volt, nem csak skálázási kérdés.*

### ⭐⭐ Az eredmény: mindenütt nagyságrend

```
  vonal                         előtte        ablakkal      szorzó
  ──────────────────────────────────────────────────────────────────
  +1 ms                        24 KB/s       460 KB/s        19x
  +5 ms                        23 KB/s       294 KB/s        13x
  1 ms ± 20 ms szórás          19 KB/s       212 KB/s        11x
  1 ms, 1% vesztés             20 KB/s       370 KB/s        18x
  1 ms, 5% vesztés             11 KB/s       346 KB/s        31x
  1 ms, 15% vesztés             4 KB/s        53 KB/s        13x
  400 ms oda-vissza             1 KB/s        10 KB/s        10x
  800 ms oda-vissza             1 KB/s         5 KB/s         5x
```

⭐ És a **csere** (4 esemény, ötször futtatva, vesztéssel):

```
  vesztés     régi (stop-and-wait)   1. darab (mért RTT)      ABLAKKAL
  ─────────────────────────────────────────────────────────────────────
    0%              9 ms                   8 ms                 8 ms
   10%            875 ms                1153 ms               870 ms
   30%           4173 ms              7393 ms, 1 BUKÁS        2552 ms
   50%          10403 ms              ⛔ mind az 5 BUKÁS      4235 ms
```

### ⛔⛔⛔ ÉS A LEGFONTOSABB TANULSÁG: A SORRENDEMET A MÉRÉS CÁFOLTA

Azt terveztem, hogy **a mért RTT-vel kezdünk** (1. darab), mert annak volt a legerősebb
bizonyítéka (a lassú vonalon ×2,0 és ×3,0 pazarlás). ⭐ Meg is építettem, és **a lassú vonalat
meg is javította** (×3,0 → ×1,0). ⛔⛔ **De erős veszteségnél ELROMLOTT tőle a vonal:** 30%-nál
egy bukás, 50%-nál mind az öt.

⭐⭐⭐ **Az ok szerkezeti, nem hangolási:** a visszalépő újraküldési idő 100 → 200 → … →
12 800 ms-ig nőtt egy olyan vonalon, aminek a **mért** oda-vissza ideje **1 ms**. ⚠️ **És ez
pontosan az, amit a TCP is csinál** — csak ott ártalmatlan, mert a TCP a veszteségek nagy
részét **nem az órából** tudja meg, hanem a **sorrenden kívüli nyugtákból**. ⛔ Stop-and-wait
mellett viszont **az óra az EGYETLEN veszteség-jel**, tehát egy óvatos óra végzetes.

⭐ **Vagyis az ablak nem gyorsítás, hanem ELŐFELTÉTEL:** ő adja a második veszteség-jelet, és
attól lesz a konzervatív óra ritka tartalék ahelyett, hogy a fő út lenne. *A mért RTT ezután
jöhet — most már biztonságosan.*

⚠️ **A 1. darab kódját visszavettük** (Csaba döntése), hogy az ablak tiszta lappal épüljön.
A mérése viszont megmarad: **így tudjuk, hogy a sorrend számít.**

### ⚠️ Amit ez a mérés NEM mond meg

- **A pazarlás nem tűnt el, sőt:** ×1,4–1,7 vesztés és szórás mellett (a gyors újraküldés
  néha feleslegesen lép), és a lassú vonalon **változatlanul ×2,0 / ×3,0** — *mert az
  újraküldési idő még mindig a beégetett 300 ms.* ⏸️ Ezt a D67 1. darabja fogja elvenni.
- **Az ablak fix 16.** ⏸️ A **4. darab** (veszteségre feleződő ablak) teszi alkalmazkodóvá —
  addig egy zsúfolt vonalon mi is lehetünk a baj.
- **Helyben nem gyorsult** (2133 vs. 2667 KB/s): ott nincs mit átfedni, az ablak csak
  könyvelés. *A haszon ott van, ahol a vonalnak hossza van.*

### ⭐ Három új önpróba, és a rontás-próba

`csereProba.js`: **több darab megy ki egyetlen nyugta nélkül** · **a nyugta helyet csinál** ·
**az ablakon túli darabot nem nyugtázzuk**. ⚠️ A próbák **bábu-foglalatot** használnak, nem
valódi hálózatot — így pontosan megszámolható, hány darab ment ki nyugta előtt; valódi
hálózaton ezt csak találgatni lehetne. ⭐ **Rontás-próbával igazolva:** `ABLAK = 1`-re
állítva (a régi stop-and-wait) az első próba **azonnal bukik**.
