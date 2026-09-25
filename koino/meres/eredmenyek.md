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

---

## 21. ⭐⭐ A MÉRT ÚJRAKÜLDÉSI IDŐ — az ablak tetején (2026-09-14, D67 / 1. darab)

*A **D67** 1. darabja, **másodszorra**. Először az ablak ELŐTT próbáltuk (20. mérés), és a
mérés megbuktatta; most az ablak tetején épült meg — és most már fizet.*

### Az eredmény

```
  vonal                    stop-and-wait    ablak      ablak + mért RTT
  ─────────────────────────────────────────────────────────────────────
  +1 ms                        24 KB/s     460 KB/s        454 KB/s
  1 ms, 1% vesztés             20 KB/s     370 KB/s        582 KB/s
  1 ms, 15% vesztés             4 KB/s      53 KB/s         78 KB/s
  400 ms oda-vissza (8 KB)      1 KB/s      10 KB/s         10 KB/s   (×3,0 → ×1,9)
  400 ms oda-vissza (64 KB)        ~2 KB/s      —           22 KB/s   (×1,4)

  csere 4 eseménnyel, ötször futtatva (átlag):
   10% vesztés                 875 ms      870 ms           51 ms
   30% vesztés                4173 ms     2552 ms         1028 ms
   50% vesztés               10403 ms     4235 ms        25127 ms
```

### ⭐ Amit a darab hozott

1. ⭐⭐⭐ **PONTOS MINTÁK KARN HELYETT.** A klasszikus gond, hogy nem tudni, melyik küldésre
   felel a nyugta — a régi válasz erre Karn szabálya (*újraküldöttből ne mérj*). ⭐ Mi
   **megszüntettük a kétértelműséget**, ahogy a QUIC: minden újraküldés **sorszámot** visz
   (`k`), a nyugta **visszamondja**, tehát **minden nyugta pontos minta**. ⭐ **És ez nem
   kerül bájtot a szokásos esetben** (6. szabály): az **első** küldésen nincs `k`, és a `k`
   nélküli nyugta épp azt jelenti, hogy az elsőre felel. *A többletbájt csak ott van, ahol
   amúgy is baj van.*
2. ⭐ **A visszalépést a nyugta feloldja** — ha most jutott át forgalom, az út él, nincs mit
   kímélni. *A TCP is a nyugtánál állítja vissza az óráját.*
3. ⭐ **A vak óra csak a legrégebbi darabot szondázza.** Mérés nélkül minden óra puszta tipp;
   abból **egy szonda elég, kilenc nem** (×1,9 pazarlás volt belőle). ⚠️ Mért óra esetén ez
   már nem áll — ott az óra **bizonyíték** az adott darabról —, és a rászűkítés nélkül 15%
   veszteségnél 430 → **8177 ms**-ra romlott a fájl-átvitel. *Ugyanaz a szabály két
   helyzetben ellentétesen helyes.*
4. ⛔ **A kezdőérték 1000 → 300 ms.** Az RFC 1 másodpercet mond — a TCP megteheti, mert a
   **kézfogásból** már van mintája, mielőtt adatot küldene. A mi vonalunknak nincs külön
   kézfogása: **az első darab maga a kézfogás**. *Egy vak tipp ezerszeres tévedése minden
   további duplázásba beleszorzódik.*
5. ⛔⛔ **ÉS EGY ELVI ELLENTMONDÁS, AMIT A MÉRÉS MUTATOTT MEG:** a visszalépő óra 3,2
   másodperces várakozásokig nőtt, miközben a 30 mp-es feladási keretből alig maradt. *Egy
   olyan várakozás, ami után nem fér bele újabb próbálkozás, nem türelem, hanem **garantált
   bukás türelemnek öltözve**.* ✅ Mostantól az RTO sosem több a **maradék keret negyedénél**.

### ⛔ ÉS AMIT NYÍLTAN KI KELL MONDANI: 50% VESZTESÉGNÉL LASSABB, MINT A RÉGI

**10 403 → 25 127 ms.** ⚠️ Bukás nincs, de ez **2,4-szeres romlás** egy ponton, miközben
0–30% között 4–17-szeres a javulás.

⭐ **Az ok nem hiba, hanem a viselkedés ára:** a régi kód **soha nem lépett vissza** — 300
ezredmásodpercenként hajtotta a vonalat, akármi volt. Ez gyorsabb egy véletlenszerűen
vesztő vonalon, és pontosan az a viselkedés, ami egy **torlódott** vonalon a bajt okozza.
⛔ 50% csomagvesztés = **75% oda-vissza bukás**: ez nem egészséges vonal.

⏸️ **És van szerkezeti ok remélni, hogy javul:** ma az óra **és** az ablak is a torlódásra
reagál (visszalépéssel), vagyis **átfedik egymást**. A **D67 / 4. darabja** (veszteségre
feleződő ablak) veszi át a torlódás-választ — utána az óra megengedheti magának, hogy
kevésbé legyen türelmes. *Ez nem ígéret, hanem a következő mérés kérdése.*

### ⚠️ Ami nyitva marad

- **A lassú vonal indulási lökete:** 8 KB-nál ×1,9, de 64 KB-nál már **×1,4** — *a löket
  elolvad, ha van mit átvinni.* ⏸️ Teljesen a kézfogásból nyert kezdő RTT szüntetné meg (a
  pajzsfúrás **már megmérte**: a terepmérésen 76 ms).
- **A ×1,5–1,8 pazarlás veszteség és szórás mellett** — a gyors újraküldés néha fölöslegesen
  lép. ⏸️ A 4. darab után újramérendő.

---

## 22. ⭐⭐ AZ ALKALMAZKODÓ ABLAK — AIMD (2026-09-14, D67 / 4. darab)

*A D67 utolsó darabja. ⭐ És a legfontosabb, amit meg kell érteni róla: **ez a darab
SZÁNDÉKOSAN LASSÍT** bizonyos vonalakon — mert nem a sebességről szól, hanem arról, hogy
**ne mi legyünk a baj**.*

### A szabály

- **siker** → az ablak **lassan nő** (+1 darab körönként),
- **vesztés** → **felére csökken**, azonnal.

⚠️ **Az aszimmetria a lényeg, nem mellékhatás:** így a vonalat megosztó felek **egyensúlyba
kerülnek** egymással ahelyett, hogy a legagresszívabb vinné el az egészet. ⛔ **Egy
vesztés-esemény = egy felezés**: egy elveszett körben több darab is hiányozhat, és ha
mindegyikre feleznénk, egyetlen zavar a földbe döngölné az ablakot.

### Az eredmény — és a két irány

```
  vonal                     ablak+RTT (21.)    +AIMD (22.)     csomag
  ─────────────────────────────────────────────────────────────────────
  +1 ms                        454 KB/s        593 KB/s      182 → 182
  1 ms ± 20 ms szórás          234 KB/s        221 KB/s      294 → 292
  1 ms, 1% vesztés             582 KB/s        287 KB/s      253 → 198  (×1,4 → ×1,1)
  1 ms, 5% vesztés             356 KB/s        104 KB/s      281 → 226  (×1,5 → ×1,2)
  1 ms, 15% vesztés             78 KB/s         39 KB/s      332 → 254  (×1,8 → ×1,4)

  csere 4 eseménnyel (átlag):   10%  51 → 203 ms · 30%  1028 → 2108 ms
```

⭐⭐ **A csomag-oszlop a lényeg:** veszteséges vonalon **egyharmaddal kevesebb csomagot**
küldünk (×1,8 → ×1,4). *A lassulás nem ár nélküli veszteség — pontosan az a forgalom tűnt
el, amivel a torlódást etettük volna.*

⚠️ **És ez megfelel az elméletnek:** a veszteség-alapú torlódás-vezérlés átbocsátása a
veszteséggel fordítottan, a gyök szerint romlik. ⛔ **Egy VÉLETLENSZERŰEN vesztő** (nem
torlódott) vonalon ez **túlreagálás** — de a küldő **nem tudja megkülönböztetni** a kettőt,
és a tévedés két iránya nem egyenrangú: *aki tévedésből visszafog, lassabb lesz; aki
tévedésből hajt, összeomlást okoz másoknak is.*

### ⛔⛔ ÉS EGY VALÓDI HIBÁT A MÉRÉS AZONNAL KIDOBOTT

Az első futásnál `1 ms ± 20 ms` szórásnál, **nulla veszteség mellett** a sebesség
**234 → 106 KB/s**-ra esett. ⭐ Az ok: a **sorrend-csere** hármas „előrébb járó" nyugtát ad,
amit a gyors újraküldés vesztésnek olvas — *a vonal nem volt torlódott, csak rendetlen.*

⭐⭐⭐ **És a bizonyíték ingyen megvolt, az 1. darabból:** a nyugta **visszamondja, melyik
küldésre felel**. Ha az **ELSŐ** küldésre jön nyugta egy olyan darabra, amit közben
újraküldtünk, akkor az eredeti **megérkezett** — tehát nem veszett el, csak késett, és a
felezés **téves volt**. ✅ Ilyenkor visszaadjuk az ablakot (`tevesFelezes`), és a szórás-sor
visszaállt **221 KB/s**-ra. *Ugyanaz a mechanizmus, ami a pontos RTT-mintát adta, itt a téves
torlódás-jelet is kiszűri — egy mező, két haszon.*

### ⭐ Két új önpróba, rontás-próbával

`csereProba.js`: **az ablak feleződik vesztéskor** (hét felszabadult hely után is legfeljebb
kettő új darab indul — *felezés nélkül mind a hét indulna*) · **az ablak nő, ha minden
átmegy** (száz sikeres nyugta után ~21 darab van úton, **nem 64** — az additív növekedés
lassan tapogat). ⭐ Mindkettő **bukik**, ha a felezést vagy a növelést kikapcsoljuk.

⚠️ **A felezés-próba első változata NULLA új darabot várt, és emiatt bukott** — pedig a kód
jó volt: a vesztés csak a **harmadik** jelre bizonyított, tehát az első két nyugta még a
régi, tág ablakkal szabadít helyet. *A várakozásom volt rossz, nem a mérés tárgya.*

### ⏸️ Ami nyitva marad

- **Nincs lassú indítás** (slow start): az ablak 16-ról indul, nem 1-ről duplázva. ⭐ Rövid
  cseréknél ez előny, nagy fájlnál a 64-es plafon elérése lassabb. ⏸️ Méréssel eldönthető.
- **A véletlen vesztés és a torlódás megkülönböztetése** — ehhez ütem-alapú vezérlés
  kellene (a BBR iránya). ⏸️ Más nagyságrendű munka; ma nem indokolt.
- **A lassú vonal indulási lökete** (×1,9 nyolc kilobájtnál) változatlan — az a kezdő RTO-é,
  nem az ablaké.

---

## 23. ⭐⭐⭐ A MŰSZER MEGTANUL TORLÓDNI — és rögtön kimutat egy bajt (2026-09-14)

*A következő lépés a **késleltetés-alapú torlódás-jel** lenne (a véletlen vesztés és a
torlódás megkülönböztetése). ⛔ De a műszerünk **torlódást egyáltalán nem tudott
szimulálni**: a késleltetés állandó volt, nem függött attól, hány darab van úton. Így csak a
**hízelgő felét** tudtuk volna megmérni.*

### A modell: egy kiszolgáló, egy sor

A szűk keresztmetszet másodpercenként `savszelesseg` darabot visz át; a többi **sorban áll**
(ettől nő a késleltetés), és ha a sor megtelik, a csomag **elveszik**. ⭐ *Ez a torlódás — és
itt a küldő MAGA okozza, nem a vonal zaja.*

### ⛔⛔ ÉS AZ ELSŐ FUTÁS AZONNAL KIMUTATOTT EGY BAJT

```
  UDP-rés (2000 darab/mp, 5 ms)    64 KB    197 ms   325 KB/s   182 csomag  sor: 13
  UDP-rés (500 darab/mp, 5 ms)     64 KB    260 ms   246 KB/s   182 csomag  sor: 14
  UDP-rés (500 darab/mp, 8-as sor) 64 KB    323 ms   198 KB/s   210 csomag  sor:  8  14 torlódásos
```

⭐⭐⭐ **A `sor:` oszlop a lelet: 13–14.** Az ablak 16 — vagyis a küldő **majdnem a teljes
ablakával teletömi a szűk keresztmetszet sorát**, és **egyetlen csomag sem vész el**. ⛔ Az
AIMD ezért **soha nem is értesül róla**: nincs vesztés, tehát nincs felezés.

⚠️ **Ez a „bufferbloat", és nem a mi sebességünket rontja, hanem MINDENKI MÁSÉT:** aki
ugyanazon a szűk keresztmetszeten osztozik velünk, a mi 14 darabunk mögé áll be. *A koino
szabálya erre világos — „ne mi legyünk a baj" —, és ma megszegjük.*

⭐ **És a harmadik sor bizonyítja, hogy a torlódásos ELDOBÁS ága is él** (14 eldobás, 6,7%
vesztés): ha a puffer kicsi, a 16-os ablak **túlcsordítja**. *Egy méretlen ág olyan, mint egy
vak próba — ezért került külön sorba.*

### ⏸️ Ez a KÖVETKEZŐ LÉPÉS MÉRCÉJE

A késleltetés-alapú jel akkor lesz jó, ha:

- ⭐ **a `sor:` oszlop 13–14-ről 1–2-re esik** — vagyis nem tömjük tele a vonalat,
- ⭐ **a véletlenül vesztő sorok NEM romlanak** (1%/5%/15%: ma 287/104/39 KB/s) — ott nincs
  torlódás, tehát nem szabad visszafogni,
- ⚠️ és a torlódásos sor **nem lesz lassabb** annál, amit ma mérünk.

*A cél tehát nem a sebesség, hanem hogy a két helyzetet a vonal MEGKÜLÖNBÖZTESSE.*

⭐⭐⭐ **ÉS A DÖNTÉS MEGSZÜLETETT ERRE — D68 (Csaba, 2026-09-14):** a jel a **késleltetés**
legyen, a **fájl-átvitel engedékeny** (a csere nem), és ⭐⭐ **a REDUNDANCIA teszi
megfizethetővé**: ha ugyanazt több társ is hozza, a visszafogás **nem állítja meg a munkát** —
*ez a ritka tulajdonság, ami a MÉRETTEL JAVUL.*

⛔⛔ **DE A KÖVETKEZŐ MÉRÉS NEM EZ, HANEM A MŰSZERÉ: VERSENGŐ FOLYAM.** Ma az `udpParos()`
**egyetlen** folyamot enged a szűk keresztmetszeten át — vagyis a fenti mérce **fele
méretlen**: nem tudjuk megmérni, hogy **eleget engedünk-e** másnak, és hogy minket
**kiéheztet-e** egy veszteség-alapú versenytárs. *Egy méretlen ág olyan, mint egy vak próba —
és épp ezt mondtuk ki két bekezdéssel feljebb.*

⚠️ **És egy modellezendő kockázat:** mobilvonalon az oda-vissza idő attól is ingadozik, aminek
semmi köze a sorbanálláshoz (rádiós ütemezés, cellaváltás, link-szintű újraküldés) — ott a
késleltetés-jel **fölöslegesen is visszafoghat**. *Romlás, nem törés (a bukás módja itt a
lényeg), de mérni kell.*

---

## 24. ⭐⭐⭐ A MŰSZER MEGTANUL VERSENGENI — és megméri a KÁRT, amit másnak okozunk (2026-09-14)

**Kérdés:** a 23. mérés kimutatta, hogy teletömjük a szűk keresztmetszet sorát (`sor: 13–14`)
— de hogy ez **mekkora kár másnak**, az addig **következtetés** volt, nem mérés. És a
fordítottja is méretlen maradt: ha egy veszteség-alapú szomszéd tolja a vonalat,
**kiéheztet-e minket**? ⛔ *A D68 mércéjének mindkét fele hiányzott.*

**Futtatás:** `node koino/meres/resSebessegMeres.js` · a műszer:
[`resSebessegMeres.js`](resSebessegMeres.js) `udpParos({ idegen })`

### A műszer, amivel készült

Az `udpParos()` eddig **egyetlen** folyamot engedett a szűk keresztmetszeten át. Most kapott
egy második, **„idegen" terhelést**, ami **ugyanazt a sort** tölti — kétféle szomszéd, mert a
két kérdés kétfélét kíván:

- **`egyenletes`** — állandó ütem (50 csomag/mp, mint egy hívás). ⭐ Ő a **sértett fél**: nem
  tud visszafogni, tehát amit elszenved, az a **mi kárunk**.
- **`moho`** — ablakot tart, és csak **vesztésre** fog vissza (mint bárki TCP-je). ⭐ Ő a
  **versenytárs**: mellette a **mi** átbocsátásunk a lelet.

⭐⭐ **És a sorbanállás kódja EGY helyre került** (`sorbaAll`), mert mostantól két forgalom
használja. *Ha két helyen állna, nem versengés lenne, hanem két külön vonal — épp azt nem
mérnénk, ami a kérdés.* ⚠️ Az idegen **nem küld valódi csomagot**, csak **foglalja** a szűk
keresztmetszetet; a sor nem tudja, ki tette bele a csomagot.

### 1. ⛔⛔ ÁRTUNK-E MÁSNAK? — IGEN, ÉS MOST MÁR SZÁMBAN IS

```
  UDP-rés + HÍVÁS a vonalon       256 KB      915 ms     280 KB/s    716 csomag  sor: 27
      ↳ idegen folyam:             30 csomag     átlag 12.8 ms    csúcs 44 ms
      ↳ ugyanez ÜRES vonalon:      32 csomag      átlag 2.0 ms     csúcs  2 ms
```

⭐⭐⭐ **A hívás késleltetése 2,0 → 12,8 ms (átlag), a csúcsa 2 → 44 ms.** Hatszoros átlag,
**huszonkétszeres csúcs** — miközben mi egyetlen csomagot sem veszítünk, tehát az AIMD **nem
tanul semmit**. *Ez a bufferbloat ára, immár nem érvben, hanem ezredmásodpercben.*

⚠️ **És a szám a valóságban rosszabb:** a mérés egy **0,9 másodperces** átvitelt mutat egy
gyors helyi vonalon. Otthon a feltöltés lassabb, a fájl nagyobb, és **három egyidejű átvitel**
fut (Csaba 3. döntése) — ott a hívás nem 44 ms-ot vár, hanem sokszor annyit.

⭐ **A viszonyítás azért kellett, mert enélkül a 12,8 ms semmit nem mondana:** az üres vonalon
mért **2,0 ms** a vonal sajátja (a szolgálati idő), a különbség a MI sorunk.

### 2. ⭐⭐ KIÉHEZTETNEK-E MINKET? — MA NEM: PONTOSAN FELEZÜNK

```
  UDP-rés + MOHÓ szomszéd         256 KB     1819 ms     141 KB/s    796 csomag  sor: 32  28 torlódásos
      ↳ idegen folyam:            534 csomag     átlag 34.6 ms    csúcs 63 ms  ⛔ 0.4% eldobva
  UDP-rés (ugyanez, EGYEDÜL)      256 KB      912 ms     281 KB/s    716 csomag  sor: 27
```

⭐ **281 → 141 KB/s**, vagyis a mai, veszteség-alapú vonalunk **felezi a sávot** egy
TCP-szerű szomszéddal. *Ez az AIMD ígérete, és teljesül: aszimmetrikus szabály → egyensúly.*

⛔⛔ **ÉS EZ A SZÁM A D68 VALÓDI ÁRCÉDULÁJA.** A késleltetés-alapú jel ismert gyengéje, hogy
egy mohó szomszéd mellett **visszahúzódik** — vagyis ennek a 141 KB/s-nak a megépítés után
**romlania fog**. ⭐ *Pontosan ezért kellett MOST megmérni: ez az alapvonal, amihez a
„mennyit fizettünk az udvariasságért" kérdés mérhető lesz.* ⚠️ És a D68 szerint ez a romlás
**megengedhető a fájl-átvitelnél** (scavenger), mert a redundancia pótolja — a **cserénél
nem**.

### ⏸️ Amit ez a mérés MÉG NEM tud

- ⚠️ **A mobilvonal ingadozása** (rádiós ütemezés, cellaváltás) még nincs modellezve — ott a
  késleltetés-jel **fölöslegesen is visszafoghat**. *Romlás, nem törés, de mérni kell.*
- ⚠️ **Két koino-folyam egymás mellett** (a 3 egyidejű átvitel esete) nincs külön sorban: ma
  az idegen szomszéd vagy hívás, vagy TCP-szerű — nem egy másik koino.
- ⚠️ **A minta mérete határt szab:** 64 KB-os átvitelnél a hívásnak mindössze **9 csomagja**
  fért bele, ezért mennek a versengő sorok **256 KB-tal** (~30–50 minta). *Kilenc mintából
  nem szabad átlagot mondani — ezt a mérés maga tanította meg.*

### ⏭️ Innen a D68 következő lépése

A mérce **mindkét fele megvan**. A jel alakja (Vegas / LEDBAT / CDG) most már **méréssel**
dönthető el, és a cél számokban: `sor:` **27 → 1–2**, a hívás késleltetése **12,8 → ~2 ms**,
⛔ **anélkül**, hogy a véletlenül vesztő sorok romlanának (1%/5%/15%) — és tudva, hogy a
mohó-szomszéd melletti **141 KB/s** az, amiből engedünk.

---

## 25. ⛔⛔⛔ A NÉMA HOLTPONT — amit egy „szeszélyes" próba mondott el (2026-09-14)

**A jel:** a 30%-os csomagvesztésű UDP-csere önpróbája **6 futásból 1-szer** bukott — és nem
csak ma: `git stash`-sel visszaállított, **D67 előtti** kódon is 5-ből 1-szer. ⚠️ *A szakasz
szabálya szerint egy néha bukó próba nem szeszélyes, hanem igazat mond — csak nem feltétlenül
arról, amiről hisszük.*

**Műszer:** a bukás **nem-esemény** (teljes csend), tehát naplóból nem látszik. Kellett egy
lap, ami **minden csomagot feljegyez** (irány, tartalom eleje, idő) és bukásnál kiírja az
utolsó harmincat, mindkét oldalról — majd ezt 200–300 kísérleten át ismétli.

### ⛔ Két magyarázatomat a mérés cáfolta, mielőtt a harmadikhoz eljutottam

1. *„a lezárt kapcsolat figyelője okozza"* → az **utóhang** bevezetése után is megmaradt.
2. *„a D67-es visszalépő óra túlnő a tétlenségi órán, tehát emeljük a határidőt 15 000 ms-ra"*
   → **ugyanúgy bukott**. 15 másodperc teljes csendhez 7–8 egymás utáni vesztés kellene
   ugyanabból a darabból (0,3^7 ≈ 0,02%) — ez a 3%-ot nem magyarázza.

*Mindkettő érvelés volt, nem mérés. A harmadik nekifutás már a csomag-naplóból indult.*

### ⭐⭐⭐ A mechanizmus, ahogy a napló megmutatta

```
     0 ms  B KULD-ELVESZETT  {"sz":1,"a":"LENYOMAT…"}     ← B első darabja
   302 ms  B KULD-ELVESZETT  (újraküldés)
   909 ms  B KULD-ELVESZETT  (újraküldés)
   910 ms  B KULD            {"sz":2,"a":"CIMEK…"}        ← a MÁSODIK darab kiment
   910 ms  A KULD-ELVESZETT  {"ny":2}                     ← …de a nyugtája elveszett
  2120 ms  B KULD-ELVESZETT  (a sz:1 újra — a sz:2 NEM!)
  4533 ms  B KULD-ELVESZETT  (a sz:1 újra, 4,8 mp múlva)
        …és innentől CSEND, amíg a társ tétlenségi órája le nem jár
```

Három dolog esett egybe, és **egyenként mindhárom helyes volt**:

- a kapcsolat **első** darabja sorozatban elveszett, ezért `srtt` **null** maradt (nincs
  mintánk) — az óra **vak**;
- a **vak óra szándékosan csak a LEGRÉGEBBI darabot szondázza** (a 21. mérés döntése:
  *„mérés nélkül minden óra tipp, abból egy elég, kilenc nem"*), tehát a mögötte álló,
  már kiküldött darab **meg sem mozdult**;
- a **visszalépés** közben 300 → 600 → 1200 → 2400 → **4800 ms**-ra nőtt.

⛔⛔ **És ekkor a két őr ELLENTMONDOTT egymásnak:** a mi újraküldésünk 4,8 másodpercig
hallgatott, a társ **tétlenségi órája** viszont 5 másodperc. *Egy türelem, ami túléli a másik
fél türelmét, nem türelem, hanem néma bukás.* ⚠️ Ugyanaz a hibafajta, amit a `maradek / 4`
korlátnál már egyszer kimondtunk — csak ott a saját feladási keretünkkel ütközött, itt a
**másik fél** türelmével.

### ✅ A javítás: két korlát, mindkettő a meglévő elv kiterjesztése

1. ⭐ **A visszalépés megáll, ha hallottuk a társat.** A kód már kimondta, hogy *„a nyugta
   bizonyítja, hogy az út él"* — ez **minden tőle érkező csomagra** igaz. ⚠️ De csak a
   **duplázást** állítjuk meg, az RTO-t nem nullázzuk: a beérkező adat a MÁSIK irányról szól,
   a torlódás lehet aszimmetrikus. *„Amíg hallom őt, nem ritkítok tovább — de nem is sietek."*
2. ⭐ **Az RTO sosem több a tétlenségi óra harmadánál.** Ez a **szimmetrikus** esetre kell,
   amikor egyik fél sem beszél (mindkettő a saját első darabjára vár). A másik fél
   **ugyanazt a programot futtatja** (a D66 óta ez a koino azonosságából következik), tehát a
   saját óránkból következtethetünk az övére: így legalább **három szondát** hall.

### A mérés, ami a javítást igazolja

```
  állapot                                   tétlenségi óra     bukás
  ─────────────────────────────────────────────────────────────────────
  eredeti kód                                    5 000 ms      3 / 200   (1,5%)
  + „hallottam azóta" feloldás                   5 000 ms      2 / 200
  + a társ türelmének korlátja                   5 000 ms      1 / 300   (0,33%)
  ugyanaz, az ÉLES órával                       10 000 ms      0 / 300
```

⭐⭐ **És ezért lett az önpróba határideje is 10 000 ms**: ez a `csereUdpResen` **éles
alapértéke**, tehát a próba mostantól **azt méri, amit élesben futtatunk**. Az 5000 ms
önkényes volt (a gyors bukásért választva), és mérve **túl szűk**. *Nem lazítás — a mérce
igazítása a valódi üzemhez.*

⚠️ **A D67 számai nem romlottak tőle** (három ismételt futás): 1% / 5% / 15% vesztés mellett
**~300 / 104–110 / 31–35 KB/s** a korábbi 287 / 104 / 39 ellenében — a 15%-os sor a mérés
szórásán belül, de érdemes szemmel tartani.

⏸️ **Amit ez a mérés nem old meg:** a vak óra rászűkítése a legrégebbi darabra **marad**
(a 21. mérés szerint nélküle 15% vesztésnél 430 → 8177 ms-ra romlott a fájl-átvitel) — tehát
a „mögötte álló darab áll" tulajdonság megmaradt, csak a némaság ideje lett korlátos.

---

## 26. ⭐⭐⭐ A JEL ALAKJA: VEGAS vagy LEDBAT? — a mérés döntött (2026-09-15, D68 / 2. lépés)

**Kérdés:** a D68 szerint a torlódás jele legyen a **késleltetés** — de melyik alakban?
Csaba 1. válasza: *„méréssel dőljön el"*. Két jelölt épült meg, paraméterként
(`torlodasJel`), hogy **ugyanazon a műszeren, ugyanazokon a helyzeteken** fussanak.

- **Vegas** — a jel a sorban álló darabok **becsült száma** (`ablak × (RTT − minRtt) / RTT`),
  a küszöb α=2 / β=4 **darab**. ⭐ A küszöb tehát **skálafüggetlen** — a 9. szabály szerint ez
  a legfontosabb tulajdonsága: *„két darab a sorban" egy 1 ms-os és egy 400 ms-os vonalon
  ugyanazt jelenti.*
- **LEDBAT** — a sorbanállási késleltetést tartja egy **cél** alatt. ⛔ A klasszikus 100 ms-os
  cél **varázsszám** lenne (tilos), ezért nálunk a cél a `minRtt`-hez viszonyul.

### ⛔⛔ Előbb két MŰSZER-HIBÁT kellett megtalálni — mindkettő a jelet fojtotta

1. **A `Date.now()` ezredmásodperc-felbontású**, a helyi vonalon mért oda-vissza idők viszont
   0–2 ms-ban mozognak. `minRtt` gyakran **0** lett, és akkor a „sorbanállás" a teljes mért
   időnek látszott. ✅ A minták azóta `performance.now()`-val készülnek (mikroszekundum,
   beépített, nulla függőség). *A jel a felbontás alatt dolgozott: nem torlódást mért, hanem
   kerekítést.*
2. ⭐⭐ **A késleltetés-utánzat `setTimeout`-ja Windowson ~15,6 ms-os kvantálást ad.** Mérve,
   a jel belső állapotából: egy „+1 ms-os" vonalon `minRtt = 1,8 ms`, a friss minták minimuma
   viszont **15–31 ms**. ⛔ Vagyis az a vonal nem 1 ms-os volt, hanem **ingadozó, 15 ms-os** —
   és a jel ezt **helyesen** olvasta sorbanállásnak: 591 → 131 KB/s. *Ez nem a jel hibája,
   hanem a műszeré.* ✅ A „gyors vonal" sor azóta `kesleltetes: 0` (ott nincs időzítő).

⭐ **És egy harmadik, a jel bemenetén:** először az `srtt`-ből (simított **átlag**) számoltuk a
sorbanállást, ami a zajt is beépíti. Mostantól az utolsó **8 minta MINIMUMA** a bemenet:
*a torlódás tartósan emel, a zaj csak szór — a minimum az, ami a kettőt szétválasztja.*

⚠️⚠️ **Mindhármat úgy találtuk meg, hogy a jel kiadta a belső állapotát** (`jelAllapot()`:
ablak, minRtt, friss, srtt). *A jel alakját nem lehet a végeredményből megítélni — két
különböző ablak-pálya ugyanazt a sebességet adhatja. Ha nem látjuk, mit csinál, csak
találgatunk.*

### A mérés (két egybehangzó futás)

```
  helyzet                           nincs          vegas          ledbat
  ──────────────────────────────────────────────────────────────────────────
  szűk vonal + HÍVÁS            281/280 KB/s   227/250 KB/s   273/268 KB/s
    ↳ a hívás késleltetése       10,9/12,0 ms    3,1/3,9 ms     5,8/6,9 ms
    ↳ a sor mélysége                 27/27          14/16          22/23
  5% véletlen vesztés            107/105 KB/s     76/50 KB/s     59/59 KB/s
  MOHÓ szomszéd mellett          113/134 KB/s     56/75 KB/s    146/38 KB/s
  gyors vonal, egyedül          4830/4830 KB/s 4923/4741 KB/s 4741/4571 KB/s
  ingadozó vonal (±20 ms)        239/240 KB/s   210/231 KB/s   207/137 KB/s
```

### ✅ A DÖNTÉS: VEGAS — és az indok mérésből, nem ízlésből

1. ⭐ **A fő célt ő teljesíti legjobban:** a mellettünk futó hívás késleltetése
   **12 → 3 ms** (az üres vonal 2,0 ms!), a csúcsa 45 → 19–21 ms. A LEDBAT ugyanitt csak
   6–8 ms-ig jut.
2. ⭐ **Az ára a legkisebb ott, ahol számít:** a fő helyzetben −11…−19%, a **gyors, üres
   vonalon nulla** (4923 vs. 4830 KB/s — nincs mit kímélni, és nem is fog vissza).
3. ⭐⭐ **Az ingadozó (mobil-szerű) vonalon stabil** (−4…−12%), míg a LEDBAT ott **43%-ot** is
   veszíthet. *Ez a D68 kimondott kockázata volt — a Vegas jobban viseli.*
4. ⭐⭐⭐ **A küszöbe darabszám, nem ezredmásodperc** — a 9. szabály próbáján ez az egyetlen,
   ami átmegy magyarázat nélkül. A LEDBAT célját viszonyítani kellett, és az maga is tipp.

⛔ **Az ára, kimondva:** a **véletlenül vesztő** vonalon −30…−50% (ott nincs torlódás, tehát
a visszafogás téves), a **mohó szomszéd** mellett pedig feleannyit kapunk. ⭐ *A D68 ezt
tudatosan vállalja: a fájl-átvitel háttérmunka, és a REDUNDANCIA pótolja — a cseréé nem.*

### ⛔⛔ ÉS EGY CÉL, AMI NEM TELJESÜLT — a mérés megmondta, miért

A D68 célja `sor:` **27 → 1–2** volt. A Vegas **14–16**-ra vitte. ⚠️ Szigorúbb küszöbbel
(α=1, β=2) sem lett kevesebb: a sor **maradt 14**, csak az ár nőtt (250 → 209 KB/s).

⭐⭐⭐ **Az ok szerkezeti: a `sor:` oszlop a CSÚCSOT méri, azt pedig nem az ablak nagysága
szabja meg, hanem hogy LÖKETBEN küldünk.** Tizenhat darab egyszerre indul, és a sor abban a
pillanatban telik meg — akármekkora is az ablak átlagban.

⏭️ **Vagyis a `sor: 1–2`-höz ÜTEMEZÉS kell** (a D68 (d) pontja: a darabokat elosztva küldeni
az oda-vissza idő alatt), nem szigorúbb küszöb. *Amit korábban „félmegoldásnak" neveztünk,
az valójában a hiányzó másik fele — és ezt csak a mérés mondta meg.*

---

## 27. ⭐⭐ A SZÉTVÁLASZTÁS ÉS AZ ÜTEMEZÉS — és amit az utóbbiról a mérés mondott (2026-09-15)

**A D68 3. és 4. lépése.** A 26. mérés eldöntötte a jel alakját (Vegas), de két dolog maradt:
a jel **élesben ki volt kapcsolva**, és a `sor:` oszlop 14–16 maradt a remélt 1–2 helyett.

### ✅ 3. lépés: a szétválasztás — a fájl enged, a csere nem

⭐ A jel **nem a hívó dolga**: a fájl-út magával hozza (`fajlUdpResen`, `fajlRandevu` →
`vegas`), a csere szintén (`csereUdpResen` → `nincs`). *Ugyanaz az érv, mint a javaslathoz
tartozó szavazatnál: ha a hívóra bíznánk, az egyik út megtenné, a másik elfelejtené.*

⭐⭐ **És mérhetővé is tettük:** a használt jel **visszakerül az eredménybe** (`torlodasJel`),
tehát nem naplósor, hanem megfigyelhető tény — egy új önpróba ezen méri, hogy a két forgalom
**tényleg külön jelet kap**, és rontás-próba (a szétválasztás elmosása) buktatja.

⚠️ **A kiszolgáló oldalnak is kell** — a torlódást a **küldő** okozza, és a 64 KB-os
szeleteket a kiszolgáló küldi. *Ha csak a kérőre tennénk, épp az maradna vezérlés nélkül,
aki a vonalat tölti.*

⛔ **A TCP-út nem a mi dolgunk:** ott a kernel torlódás-vezérlése (CUBIC) hajt. Ez a D67
utáni döntéssel összefér — a TCP „alkalmi gyorssáv", a fő út a UDP.

### ⛔⛔ 4. lépés: az ütemezés — MEGÉPÜLT, ÉS A MÉRÉS SZERINT ALAPBÓL KI MARAD

```
  változat                        KB/s    sor    hívás átlag    csúcs
  ────────────────────────────────────────────────────────────────────
  sem jel, sem ütem            271/275     27    11,5 ms        45 ms
  csak ÜTEMEZÉS                280/279  17/18    10,4/11,3      24/27
  csak JEL (vegas)             233/233     14     3,0 ms        18/19
  jel + ütemezés               263/226  15/15     4,6/3,4       19/19
```

⭐ **Az ütemezés önmagában dolgozik**: a csúcsot 45 → 24–27 ms-ra viszi, a sort 27 → 17–18-ra,
és **nem lassít** (280 KB/s). ⛔ **De a jel mellett nem ad hozzá mérhetőt:** a Vegas a csúcsot
már 18–19-re vitte, az átlagot 3,0-ra — a kettő együtt az átlagot **rontotta** (3,4–4,6), a
sebességet pedig ingadozóbbá tette.

### ⭐⭐⭐ ÉS A LELET, AMI EZT MEGMAGYARÁZZA: A SOR ALSÓ HATÁRÁT AZ ÓRA SZABJA MEG

A `sor: 1–2` cél **nem hangolás kérdése ezen a gépen, hanem mérhetetlen**:

```
  sor_alsó_határ  ≈  az óra ébredési köze / a vonal szolgálati ideje
                  ≈  15,6 ms (Windows setTimeout) / 2 ms (500 csomag/mp)  ≈  8 csomag
```

Egy ébredés alatt a vonal ~8 csomagnyi időt kiszolgál — ennél kisebb löketet **nem lehet
kirajzolni** anélkül, hogy a vonal kihasználatlan maradjon. ⚠️ És ezt **élőben is megmértük**:
egy fix, 4-es löket-plafonnal a saját ütemezésünk **megfojtotta a vonalat** (247 → 179 KB/s).
✅ A javítás az volt, hogy a kredit-plafon az **ablakhoz igazodik** (`ablak / 2`), nem fix szám.

⏸️ **A koino célkészüléke viszont a TELEFON** (Termux/Android), ahol az óra ~1 ms-os — ott az
ütemezés várhatóan fizet, és a `sor: 1–2` is elérhető. ⛔ **De bekapcsolni csak MÉRÉS után
szabad**, és a mérés parancsa készen áll: `node koino/meres/resSebessegMeres.js`, az
„AZ ÜTEMEZÉS" szakasz. *A kód marad, a paraméter él (`utemezes: true`) — a kikapcsolás mért
döntés, nem feledékenység.*

### Mi változott élesben ezzel

⭐ **A fájl-átvitel mostantól engedékeny** (Vegas), a csere nem. A mellettünk futó hívás
késleltetése **11,5 → 3,0 ms**, a csúcsa **45 → 18 ms** — az ára a fájl-átvitelen
**271 → 233 KB/s** (−14%), amit a D68 tudatosan vállal: *háttérmunka, és a redundancia
pótolja.*

---

## 28. ⭐⭐ A TÜRELEM: AMENNYIT AZ ALTERNATÍVA HIÁNYA INDOKOL (2026-09-15, D68 / 5. lépés)

**A D68 utolsó előtti tétele, Csaba 2. válasza.** A UDP-vonal **30 000 ms**-ig küzdött
**egyetlen 1000 bájtos darabért** — akkor is, ha ugyanaz a fájl tíz másik társnál megvolt.
⚠️ A döntés nem egy kisebb fix szám volt (*„az ugyanolyan varázsszám lenne"*), hanem hogy
**függjön attól, hány forrásból szerezhető be ugyanaz**.

### A szabály, és ami elvileg alátámasztja

```
  turelem(n) = max(5 000 ms, 30 000 ms / n)        n = hány társnál van meg
```

| források | türelem | miért |
|---|---|---|
| 1 | 30,0 mp | ha feladom, a fájl **nem jön meg** — nincs hova menni |
| 2 | 15,0 mp | |
| 4 | 7,5 mp | |
| 6+ | 5,0 mp | ⛔ az alsó korlát: egy **800 ms oda-visszájú** vonalon ennyi is csak néhány próbálkozás |
| 0 / ismeretlen | 30,0 mp | ⚠️ *ha nem tudunk alternatíváról, akkor nincs alternatíva* (D19) |

⭐⭐ **És amiért a feladás tényleg olcsó:** a részleges fájl megmarad, és **a mérete maga az
állapot** — a következő próbálkozás onnan folytatja. *A feladás itt nem adatvesztés, hanem
társ-váltás.*

### ⭐ A szétválasztás: a vonal nem tudhatja, hány forrás van

A számítás a **fájl-rétegben** él (`fajlAtvitel.js`: `turelemForrasokbol`), a vonal pedig
**paraméterként kapja** (`beallitas.feladasIdo`). ⛔ A vonal csak csomagokat lát — azt, hogy
*érdemes-e még küzdeni ezzel a társsal*, csak az tudja, aki a birtoklás-jegyzetet ismeri.
*Ugyanaz a szétválasztás, mint mindenhol: a vonal nem tud a koinóról (1. szabály).*

⚠️ **A randevúnál (átfúrt rés) marad a teljes türelem** — ott **nincs másik forrás**: a
pajzsfúrás egyetlen társsal nyitott rést, oda nem lehet „átváltani".

### ⛔⛔ ÉS EGY VAK PRÓBÁT A RONTÁS-PRÓBA BUKTATOTT LE — HETEDSZER UGYANAZ

Az első parancssor-próbám a kiírt *„türelem: 30,0 mp · 1 forrás"* sort nézte. ⛔ A bekötést
kivéve (a `tcpNyito` harmadik paraméterét elhagyva) **a kiírás változatlan maradt**, mert az a
**kiszámolt** értékből jön. *Azt mértem, hogy kiszámoltuk — nem azt, hogy használjuk.*

✅ A javított próba **viselkedést mér**: hat (nem válaszoló) forrásnál a türelem az alsó
korlát, tehát a bukásnak **~5 másodperc alatt** meg kell jönnie. Ha a szám nem jutna el a
vonalig, a vonal alapértéke (30 mp) szólna — és az a próba időkorlátjába ütközne. ⭐ A
rontás-próba ezt most **buktatja**.

⭐ **Négy modul-próba is őrzi a szabályt:** monoton csökken · van alsó korlát · az ismeretlen
forrásszám a legóvatosabb választ adja · és **a terv viszi magával** (`forrasok` + `turelem`
minden tervelemben).

### ⚠️ És egy hazudó felirat, amit ez a munka talált

A `fajlok` parancs még mindig azt írta: *„A bájtok szállítása még nem épült meg: egy kép ma
csak azon a készüléken van meg, ahol beszúrták."* ⛔ **2026-09-13 óta nem igaz** (felderítés →
kérelem → átvitel → randevú), és 2026-09-14 óta az őrjárat magától is elhozza. ✅ Javítva.
*Ugyanaz a csapda, amit az `Allaspont`-nál kimondtunk: ahol egy felirat mást mond, mint amit
a kód tesz, ott előbb-utóbb valaki a feliratot hiszi el.*

---

## 29. ⭐⭐⭐ TÖBB FORRÁSBÓL EGY FÁJL: MENNYIT HOZ? — mérés az építés ELŐTT (2026-09-15, D68 / 6.)

**A D68 utolsó tétele.** ⛔⛔ És a terv kimondottan azt írta elő, hogy **az első lépés ne az
építés legyen, hanem a mérés**: *„a válasz nem triviálisan »háromszor«: a szűk keresztmetszet
gyakran a saját letöltésünk, és akkor a párhuzamosság semmit nem hoz, csak bonyolít."*

### ⭐⭐ Amit a KÓD mondott meg, még a mérés előtt: a protokoll már tudja

A `FAJLKEREK` üzenet **hordozza az `eltolas`-t**, és a kiszolgáló
(`fajlSzeletekKiszolgalasa`) **állapotmentes**: a kérő mondja meg, honnan kér, ő onnan küld
egy szeletet. ⭐ *Vagyis a több forrás nem protokoll-kérdés, hanem kliens-oldali szerkezeté* —
és ezért volt a mérés egyáltalán elvégezhető építés nélkül: a **kiszolgáló a valódi éles kód**,
csak a kérő oldalát utánozza a mérő (memóriában gyűjt, és a végén **újra lenyomatol**).

### A műszer: KÉT sor, egymás után

⛔ Enélkül a mérés hazudna. Ha három foglalatnak három független sora van, a párhuzamosság
**automatikusan** háromszoros sávot kap — és a „×3" a műszerből jönne, nem a valóságból.
Ezért a `udpParos` mostantól két sorbanállást modellez:

1. **a FORRÁS feltöltése** — foglalatonként külön (minden társnak saját vonala van),
2. **a MI letöltésünk** — ⛔ **közös**: minden forrás ugyanabba a csövünkbe érkezik.

### Az eredmény (512 KB, +10 ms, munkalopó felosztás)

| eset | 1 forrás | 2 forrás | 3 forrás | 5 forrás |
|---|---|---|---|---|
| **(A) a FORRÁS a szűk** (200/s, letöltés bő) | 123 KB/s | 246 — **×2,0** | 328 — **×2,7** | |
| **(B) a MI LETÖLTÉSÜNK a szűk** (közös 200/s) | 132 KB/s | | 129 — **×1,0** | |
| **(C) aszimmetrikus** (forrás 150/s, letöltés 600/s) | 99 KB/s | 157 — ×1,6 | 191 — **×1,9** | 255 — **×2,6** |

⭐⭐⭐ **A VÁLASZ TEHÁT NEM EGY SZÁM, HANEM EGY ARÁNY: a haszon pontosan addig tart, amíg a
források EGYÜTT be nem töltik a saját letöltésünket.** Az (A) sor a felső határ (majdnem
lineáris), a (B) az alsó (**semmi**), és a valóság a kettő között van.

⭐ **És az otthoni vonal az (A) felé húz:** az aszimmetrikus kapcsolatokon a **feltöltés** a
szűk — egy társ feltöltése tipikusan töredéke a mi letöltésünknek. *Ez a D68 redundancia-érve
számokkal: nem csak a türelem lesz olcsóbb, hanem a sebesség is nő.*

### ⛔⛔ ÉS KÉT MAGYARÁZATOMAT A MÉRÉS CÁFOLTA — a hiba a MŰSZERBEN volt

A (C) sor elsőre **×1,8-nál megállt**, pedig a letöltésünk négyszer bővebb a forrásénál.
Két magyarázatot adtam, és **mindkettőt megmértem**:

- *„a Vegas fogja vissza őket, mert mind a közös sor késleltetését látja"* → ⛔ **cáfolva**:
  `torlodasJel: 'nincs'` mellett **ugyanaz a ×1,8**;
- *„a szemcse durva: 8 szelet nem osztható háromfelé"* → ⛔ **cáfolva**: 1 MB-on (16 szelet,
  5/6/5) **ugyanaz a ×1,8**.

⭐⭐⭐ **A valódi ok a műszerben volt: a sor DARABSZÁM-alapú, nem bájt-alapú** — tehát egy
~50 bájtos **nyugta** ugyanannyiba kerül benne, mint egy 1000 bájtos adat-darab. Egy forrásnál
ez sosem számított (a két irány külön soron ment); ⛔ **a közös letöltő sornál viszont
uralkodik**: a saját nyugtáink ott versengtek a beérkező szeletekkel, és a 600/s-ből
**effektíve 300/s** maradt az adatnak. *Ez számszerűen pontosan a ×1,8-at adja.*

✅ A javítás a kérdéshez szabott: a közös vonal a **letöltési irány** modellje, tehát csak a
forrás felől jövő forgalomra vonatkozik (a nyugta a mi feltöltő irányunkon megy, ami húszszor
kisebb — a késleltetés természetesen rá is vonatkozik). Utána a (B) sor **×0,9 → ×1,0** lett,
a (C) pedig ×1,8 → **×1,9 (3 forrás) és ×2,6 (5 forrás)**.

⚠️ *Harmadszor ugyanaz a lecke ebben a szakaszban: **a műszert is meg kell mérni**. És a
sorrend számít — ha elfogadtam volna az első ×1,8-at, a döntés egy műszer-hibán állna.*

### ⚠️ Amit ez a mérés NEM mond meg

- **A rossz szelet** kérdését (a terv 2. döntési pontja) — az nem sebesség, hanem bizalom.
- **A tárolás szerkezetét**: a mérő memóriában gyűjt, az éles kódnak lemezen kellene
  (a mai elv — *„a részleges fájl mérete maga az állapot"* — sorrendet feltételez).
- **A valódi hálózatot**: itt a szűk keresztmetszet modell, nem mért vonal.
- És hogy **hány forrás az optimum**: a (C) sor 5 forrásnál még nőtt, de a 9. szabály szerint
  a források számának felülről korlátosnak kell lennie.

### ✅ És a műszer-változtatás a korábbi sorokat NEM mozdította el

*Ez nem feltevés, hanem ellenőrzés:* a teljes lap újrafuttatva a 16–28. mérés minden szakaszát
a rögzített értékeken adta vissza (Vegas mellett a hívás **12,3 → 3,5 ms**, csúcs **44 → 19**;
az ütemezés `sor: 27 → 17`, csúcs `45 → 25`). ⭐ Ennek szerkezeti oka van: a közös sor csak
akkor létezik, ha a hívó **kér** ilyet (`kozosSav`), és azt egyedül a több-forrás szakasz teszi.

---

## 29/b. ✅ ÉS MEGÉPÜLT — a valódi kód számai, és amit a mérő-utánzat elrejtett (2026-09-15)

A 29. mérés az **építés előtt** futott, ezért a kérő oldalát egy **mérő-oldali utánzat**
játszotta (memóriában gyűjtött, és vaktában osztotta a szeleteket). ⭐ A megépítés után az
utánzatot **le kellett cserélni a valódi `fajlHozatala`-ra** — *két igazság nem lehet: ha a
mérő mást csinál, mint az éles út, akkor nem azt mérjük, amit futtatunk.*

⛔ **És a csere azonnal kisebb számokat adott** (512 KB, +10 ms):

| eset | utánzat (29.) | **a valódi kód** |
|---|---|---|
| (A) a forrás a szűk, 3 forrás | ×2,7 | **×2,0** |
| (C) aszimmetrikus, 3 forrás | ×1,9 | **×1,7** |
| (C) aszimmetrikus, 5 forrás | ×2,6 | **×2,1** |
| (B) a mi letöltésünk a szűk | ×1,0 | **×1,0** |

⭐⭐⭐ **AZ OK SZERKEZETI, ÉS KI KELL MONDANI: az ELSŐ SZELET MINDIG SOROSAN JÖN.** A fájl
méretét a `FAJLSZELET` üzenet `teljes` mezője mondja meg — ⛔ amíg az meg nem érkezett, nem
tudjuk, hány szelet van, tehát **csak egy ág indulhat**. Nyolc szeletnél ez az idő nyolcada,
vagyis a három forrás elméleti ×3-a helyett **×2,3 a plafon**. *Az utánzat ezt nem fizette
meg — ő tudta előre a méretet, mert a mérő adta neki.*

⏸️ Megkerülhető lenne (a felderítés megmondhatná a méretet, vagy spekulatívan indulhatnánk),
⚠️ de mindkettő **új viselkedés**: az egyik új mezőt tesz a vonalra (6. szabály), a másik
fölösleges kérést egy rövid fájlnál. *A mai ár ismert és korlátos; a megkerülésé nem.*

### ⛔ Egy valódi hibát a saját kódomban a mérés talált: O(N²) a lemezen

A `reszlegesIras` a beírás után **a teljes részleges méretet adta vissza** — az pedig
végigstatolja az ÖSSZES eddigi szeletet. Nyolc szeletnél 36, tizenhatnál 136 fájl-művelet,
⚠️ **egy senkinek nem kellő visszatérési értékért** (a `fajlHozatala` nem használta).
✅ Kivéve: a (C) sor 3 forrásnál **×1,5 → ×1,7**, a (C/1) **×0,9 → ×1,3**.

### ⭐⭐⭐ ÉS A LEGFONTOSABB ÚJ LELET: JEL NÉLKÜL A TÖBB FORRÁS RONT

A (C/1) kontroll-sor — ugyanaz a vonal, `torlodasJel: 'nincs'` — három forrással **×0,9…×1,3**
között ingadozik, és a szeletek eloszlása **6/1/1**: ⛔ **két ág gyakorlatilag megbénul.**

⭐ Az ok: a három agresszív (veszteség-alapú) ág **ugyanazt a közös sort tölti**, tehát
egymással versengenek — torlódásos vesztés, újraküldés, kaotikus eloszlás. Vegas mellett
ugyanez **×1,7**, kiegyensúlyozott 3/2/3 eloszlással.

⭐⭐ **Ez a D68 (a késleltetés-alapú jel) független igazolása:** eddig azzal érveltünk, hogy
*másoknak* ne ártsunk. Most kiderült, hogy **magunknak is árt** a hiánya — mert a több forrás
óta a saját ágaink is egymás szomszédai. *A jel nem udvariasság, hanem működési feltétel.*

### Amit ez a menet még megépített

- **A részleges fájl szeletenként** (`reszleges/<lenyomat>/<eltolas>`) — „mi van meg?" = a
  mappa listája. ⭐ Az elv megmarad (*a tartalom az állapot*), csak a hossz helyett a lista
  mondja meg. ⚠️ A régi, egyfájlos alak eldobható helyi adat: a `readdir` `ENOTDIR`-je üres
  listát ad, és a letöltés elölről kezdődik.
- **A munkalopó munkamegosztás** (`ujMunkamegosztas`) — nem előre kiosztott tartományok,
  mert *a leglassabb forrás szabná meg a végét*. Egy bukott ág szelete **visszakerül**.
- **A lezárás joga egyszer adódik ki** — különben a második ág „nincs részleges fájl"-t
  kapna, és *hibának látszana, hogy más volt gyorsabb*.
- **12 új önpróba, hat rontás-próbával igazolva**: a kizárólagosság · a lezárás-jog · az
  elengedés (⭐ **időkorláttal, hogy a beragadás is BUKÁS legyen**, ne végtelen várakozás) ·
  a bekötés (a `munka` átadása az éles úton) · a fájlonkénti forrásszám · a szelet-lista.
- ⭐ **És a bekötés próbája VISELKEDÉST mér, nem feliratot:** a jel a `bajt` oszlop —
  munkamegosztás nélkül mindkét ág a TELJES fájlt hozná, és a mennyiség megkétszereződne.
  *A 28. mérés vak próbája épp az volt, hogy a kiírt számot néztem.*

---

## 29/c. ⭐⭐ A ROSSZ SZELET HELYI VÁLASZA — és egy hiba, amit megint a mérés talált (2026-09-15)

**A D68 / 6. utolsó darabja, Csaba jóváhagyásával.** ⛔ A baj: a lenyomat a **teljes fájlra**
szól, tehát egy hamis szelet az egészet elbuktatja, és **nem tudjuk, melyik volt** — a lezárás
eldobja a részlegest, és kezdhetjük elölről. *Egy rosszindulatú társ így olcsón ismételtethet.*

⭐ **A választott válasz az 1. (a tervből): nem teszünk új adatot a láncra.** A másik kettő
vagy a **6. szabály kemény felébe** ütközne (szeletenkénti lenyomat: 2 MB-nál ~1,4 KB, egy
teljes esemény négyszerese), vagy **minden meglévő fájl-hivatkozást érvénytelenítene**
(Merkle-fa). ⭐⭐ A kiegészítés **helyi tanulság**: ha a lezárás elbukott, feljegyezzük, kik
adtak szeletet, és a következő körben **mást választunk**.

### ⛔⛔ Három korlát, ami ezt nem engedi rangsorrá válni

1. **Fájlonkénti**, nem társankénti — nem azt mondjuk, hogy *„ez a társ rossz"*, hanem hogy
   *„ehhez a fájlhoz ezek nem váltak be"*. *Nincs globális mérleg (D18/2, D48).*
2. **Nem vád:** a résztvevők közül **legfeljebb egy** adott hamis bájtot, és ezt nem tudjuk
   szétválasztani. Ezért nem is mondunk róluk semmit.
3. ⭐ **Ha nem marad forrás, FELEJTÜNK.** Különben egy fájl, amit csak egy társ birtokol,
   egyetlen bukás után **soha többé** nem jönne meg — *a védekezés vágná el az utat ahhoz az
   adathoz, amit védeni akar.* És amint a fájl megjön, a jegyzet törlődik.

### ⛔⛔⛔ ÉS A MÉRÉS EGY VALÓDI HIBÁT TALÁLT A SAJÁT MEGOLDÁSOMBAN

Először **a kijelölt forrásokat** jegyeztem fel — azokat, akiknek a terv szólt. ⛔ Mérve
(kézi forgatókönyv, hamis kiszolgálóval) ez **használhatatlan**: egy 20 KB-os, **egyszeletes**
fájlnál a hamis forrás hozta az egyetlen szeletet, a másik ág **semmit** — mégis **mindkettő**
megjelölve. Így a következő körben nem maradt választható forrás, a felejtés-szabály
visszaadta mindkettőt, és a hamis **újra sorra került**: *a kép soha nem jött meg.*

✅ A javítás: **csak azokat jegyezzük fel, akik ténylegesen adtak szeletet** (`szeletek > 0`).
Utána a 2. kör elkerüli a hamis forrást, és a kép **bájtra azonosan** megérkezik.

⚠️ **A jelölés így is közelítés, és ezt kimondjuk:** több szeletnél több forrás kerül a
listára, pedig legfeljebb egy volt hamis. *Ez nem pontatlanság, hanem a modell határa.*

### ⭐ Egy lelet, ami mellékesen derült ki: valódi koino NEM tud hamis bájtot adni

A kiszolgáló `blob.olvas`-a **újra lenyomatol**, tehát a lemezen megrontott fájlt **ki sem
adja** — a hamis szelet csak **szándékosan módosított programmal** állítható elő. ⭐ Ezért a
próbához külön meg kellett írni a támadót: egy kézzel írt kiszolgáló, ami a fájl-protokollt
beszéli és szemetet küld. *Jó hír a modellről, és egyben a próba feltétele.*

### A próbák (7 új, ÖT rontás-próbával igazolva)

⭐ A parancssor-próba **viselkedést mér**: valódi `csere` paranccsal, hamis és jó forrással —
az 1. kör bukik és jegyez, a 2. kör **elkerüli a hamisat**, a kép megjön, a jegyzet kitisztul.
⛔ A rontás-próbák: a kerülés kikapcsolása · a felejtés kikapcsolása · a bekötés kivétele ·
a `romlott` **mező** elnémítása (⭐ *szöveg-illesztés helyett mező — egy átfogalmazott
hibaüzenet némán kikapcsolná a választ*) · és a fenti hiba visszacserélése — **mind buktat**.

---

## 30. ⭐⭐⭐ MENNYIT ÉR AZ ÖSSZEHANGOLT ABLAK? — a „buli" (2026-09-15)

`node koino/meres/buliMeres.js` · A fázis-2 terv három darabot ír elő az `orjarat`-hoz:
**(1)** igazítsa a kört a **percfordulóhoz** · **(2)** a kör elején **kopogjon minden
társra** · **(3)** **ismételje a kört, amíg van újdonság**.

⛔ A **(2) indoka már terepen mérve van** (2026-08-30: *„nincs full cone"* — 14 146 kopogás
alatt a laptop semmit nem kapott attól, akinek ő maga nem küldött). ⚠️⚠️ **Az (1) és a (3)
viszont SZÁMÍTVA volt, nem mérve** — a terv szó szerint kimondja: *„a nemzedék-számítás
levezetett, nem mért"*. Ez a mérés azt a kettőt méri meg.

### Miért kellett ÚJ műszer

A `felszabaditasMeres.js` az ébrenlétet **körönkénti érmedobással** modellezi
(`veletlen() < ebrenlet`) — ⛔ és ez pontosan azt rejti el, ami itt a kérdés: hogy az
ébrenlét **IDŐBEN HOL VAN**. *Két készülék attól találkozik, hogy az ablakaik átfednek, nem
attól, hogy mindkettő „ébren volt aznap" — egy független érmedobás beépíti a válaszba, amit
mérni akarunk.*

### ⚠️ És egy dolog, ami nélkül a mérés FEKETÉBBRE festette volna a mai állapotot

A mai kód `setTimeout(perc * 60 * 1000)`-t hív a kör **után**, tehát a csere ideje
hozzáadódik: minden készülék köze kicsit más. ⭐ **Fix közzel a találkozás determinisztikus
lenne — vagy mindig, vagy SOHA**; a valóságban viszont a fázisok lassan **egymásba
vándorolnak**. A modellbe ezért került be a **sodródás** (~3 mp/kör), és a mai sor rögtön
96%-ra ugrott a sodródás nélküli 73%-ról. *A becsületes mérés a saját állításomat gyengítette.*

### Az eredmény (100 készülék, 30 mp-es ablak, 5 perces ütem, 200 futás)

**Sűrű gráf — 14 társ (a D33 szerinti nagyságrend):**

| változat | elér | mindenkihez | medián idő |
|---|---|---|---|
| **(a) MA:** nincs igazítás, egy menet | 100% | 96% (12 órán 100%) | 8,9 perc |
| (b) igazítva, egy menet | 100% | 100% | 5,3 perc |
| ⭐ **(c) igazítva + ismételt menet** | 100% | 100% | **0,3 perc** |
| (d) nincs igazítás + ismételt menet | 100% | 96% | 8,6 perc |

**Ritka gráf — 3 társ (a kis családi koino, D22), 12 óra:**

| változat | elér | mindenkihez | medián idő |
|---|---|---|---|
| ⛔ **(a) MA** | 89% | **3%** | 601 perc |
| (b) igazítva, egy menet | 100% | 100% | 15,3 perc |
| ⭐ **(c) igazítva + ismételt menet** | 100% | 100% | **0,3 perc** |
| ⛔ (d) nincs igazítás + ismételt menet | 89% | **3%** | 601 perc |

### ⭐⭐⭐ A LELET: AZ IGAZÍTÁS ÉS AZ ISMÉTLÉS EGYÜTT MŰKÖDIK, KÜLÖN ALIG

- **az ismétlés ÖNMAGÁBAN semmit nem ér** (a → d: 8,6 vs 8,9 perc; ritkán 3% vs 3%);
- **az igazítás önmagában** sűrűn ×1,7, ritkán viszont **a működés feltétele**;
- ⭐ **a kettő EGYÜTT ×30 (sűrű) és ×2000 (ritka)**.

*Az ok szerkezeti, és pontosan az, amit a terv jósolt: **az igazítás teremti meg a nagy,
egyszerre ébren lévő csoportot; az ismétlés pedig ezen a csoporton belül terjeszti a hírt
nemzedékenként.** Egyik a másik előfeltétele — nem két független javítás, hanem egy szerkezet
két fele.*

### ⭐⭐⭐ ÉS A 9. SZABÁLY PRÓBÁJA: A MÉRETTEL A MAI MEGOLDÁS ROMLIK, AZ ÚJ NEM

**1000 készülék, 14 társ, 2 óra:**

| változat | mindenkihez | medián idő |
|---|---|---|
| ⛔ **(a) MA** | **64%** | **70,3 perc** |
| (b) igazítva, egy menet | 100% | 10,3 perc |
| ⭐ **(c) igazítva + ismételt menet** | 100% | **0,3 perc** |

⛔ A mai sor **100 → 1000 készüléknél 8,9 → 70,3 percre romlik** (és 96% → 64%), mert a hír
ablakonként **egy lépést** tesz, tehát az idő a hálózat átmérőjével nő. ⭐⭐ A (c) sor
**változatlanul 0,3 perc** — a nemzedékenkénti terjedés logaritmikus, nem lineáris.

*A 9. szabály kérdésére (**„mit csinál egymilliárd e-embernél?"**) tehát a mai válasz az,
hogy „egyre lassabban", az újé pedig az, hogy „ugyanannyi idő alatt". Ez nem hangolás
kérdése — a kettő más nagyságrendben nő.*

### ⛔⛔ ÉS A KRITIKUS ESET A RITKA GRÁF — vagyis a KIS KOINO

Sűrű hálózatban (14 társ) a mai állapot is eljut mindenkihez, csak lassabban — ott az
igazítás kényelem. ⛔ **Három társnál viszont a hír a futások 97%-ában SOHA nem ér körbe**,
és ahol mégis, ott 10 óra alatt. *A D22 szerint épp a kis családi közösség az egyik cél —
tehát ez nem sarokeset, hanem alapeset.*

⚠️ **És a saját várakozásomat is cáfolta a mérés:** azt hittem, az igazítás mindenhol
előfeltétel. Sűrű gráfban nem az — a sodródás elvégzi helyette, csak lassan és
kiszámíthatatlanul.

### ⚠️ Amit ez a mérés NEM mond meg

- A **kopogást** (2. darab): az NAT-kérdés, terepméréssel igazolva, itt nem modellezzük.
- Az **adat-árat**: a terv számolja (~7 MB/nap 5 perces ütemnél, 14 társsal).
- A **randevút**: hogy a kiszámítható ablak mennyit ér a fájl-átvitelnek — az egyidejűség
  ott **működési feltétel**, nem sebesség-kérdés.
- Az **alvó telefont**: a modell ébren lévő készülékkel számol (a terv is kimondja, hogy
  „a flotta gerince asztali gép legyen").

### ✅ ÉS MEGÉPÜLT — az (1) és a (3) darab (2026-09-15)

- ⭐ **Az igazítás:** a várakozás a **fal órájához** igazodik (`Math.ceil(most / kozMs) * kozMs`),
  nem a kör végéhez. ⭐⭐ *Üzenetváltás nélkül működik:* mindenki ugyanahhoz a **külső ponthoz**
  igazodik, nem kell megbeszélni és nem kell jelzőpont (2. szabály). ⚠️ Az órára támaszkodunk,
  és ezt kimondjuk: percekben eltérő óráknál az ablakok nem fednek át — a koino ettől nem
  romlik el (marad a mai sodródás), csak nem élvezi a hasznot. *Romlás, nem törés (D19).*
- ⭐ **Az ismétlés:** a kör addig fut, amíg egy menet hoz új eseményt. A szokásos eset **egy
  menet** (nincs újdonság → azonnal megállunk), tehát az ár csak akkor merül fel, amikor
  tényleg történt valami. ⛔ A `MENET_KORLAT = 5` **biztonsági szelep**: egy hibás vagy
  rosszindulatú társ minden menetben „újdonságot" adhatna, és az ablak sosem érne véget.

⛔⛔ **ÉS EGY VAK PRÓBÁT A RONTÁS-PRÓBA BUKTATOTT LE — NYOLCADSZOR UGYANAZ.** Az ismétlés
próbája először **rögtön indította** az őrjáratot, és a rontás (az ismétlés kivétele) **nem
buktatta**. ⭐ Az ok: az őrjárat azóta a **percfordulóhoz igazít**, tehát a második ablak akár
2 másodperc múlva is jöhetett — két kör futott a 12 másodpercben, és a hír a MÁSODIK körben
jutott át. *A próba az igazítást mérte, nem az ismétlést.* ✅ A javítás: a percforduló **után**
indítunk, így a próba idejébe biztosan egy kör fér. *Amit mérni akarunk, azt egyedül kell hagyni.*

### ⏸️ ÉS A (2) DARAB NEM ÉPÜLT MEG — kimondva, nem elhallgatva

A *„kopogjon a kör elején minden társra"* **UDP-kérdés**: a NAT-rést a pajzsfúrás nyitja
(`pajzsfuro.js`), az őrjárat viszont ma **TCP-vel** cserél (`csereVonalon` → `connect`).
⛔ Vagyis ez nem egy sor, hanem **a UDP-út bekötése az őrjáratba** — önálló munka, és a
mérése is terepmérés (két hálózat). *Az indoka viszont megvan: „nincs full cone" (2026-08-30).*

### ⛔⛔⛔ ÉS CSABA KÉRDÉSE EGY VALÓDI HIÁNYT TALÁLT A SAJÁT JAVÍTÁSOMBAN

*„Ez akkor most azt jelenti, hogy a mostani rendszer nem skálázható végtelenig?"* — és a
válasz kimérve **igen, volt egy pont, ahol nem**. A terjedés ALAKJA logaritmikus, ⛔ **de én
tettem bele egy beégetett `MENET_KORLAT = 5`-öt, ami a mérettel nem nő.**

**Hány menet kell egy ablakban?** (a legjobb eset: mindenki ébren, egy ablakban — tehát
**alsó korlát**)

| készülék | társ | menet (átlag) | legrosszabb | elég az 5? |
|---|---|---|---|---|
| 100 | 14 | 2,7 | 3 | ✔ |
| 1 000 | 14 | 3,7 | 4 | ✔ |
| 10 000 | 14 | 4,3 | 5 | ✔ |
| 100 000 | 14 | 5,0 | 5 | épp ✔ |
| **1 000 000** | 14 | **6,0** | 6 | ⛔ **NEM** |
| ⛔ **1 000** | **3** | **7,8** | 9 | ⛔ **NEM** |
| ⛔ **100 000** | 3 | **12,3** | 13 | ⛔ **NEM** |

⛔⛔ **A ritka gráf itt is a kritikus:** három társnál már **ezer készüléknél** kevés az öt.

### ✅ A JAVÍTÁS: A KORLÁT NE SZÁM LEGYEN, HANEM AZ ABLAK

A menetek addig futnak, amíg **van újdonság** ÉS **még tart az ablak** (a következő
percfordulóig). Ettől

- a korlát **a mérettel együtt nő** — ahány menet belefér, annyi fut;
- a **rosszindulat ellen ugyanúgy véd** (az ablak véges, tehát a ciklus véges);
- és **nincs benne varázsszám**: az ablak hosszát az e-ember úgyis megadja (`perc`).

⭐ *Ugyanaz az elv, mint a türelemnél (28. mérés): a határt ne találjuk ki, hanem abból
következzen, ami amúgy is adott.* A `MENET_PLAFON = 1000` csak a legvégső szelep.

**Belefér-e?** (számítás, nem mérés — egy csere mérve 189 ms, 2026-08-30):
egymilliónál 6 menet × 14 társ × 0,19 s ≈ **16 s**; ritka gráfon 100 000 főnél
12,3 × 3 × 0,19 ≈ **7 s**. ⭐ Egy 30 másodperces ablakba mindkettő belefér — *de ez
számítás: valódi vonalon a csere lassabb, és nem mindenki van ébren.*

⚠️ **És amit kimondunk: a korlát-javítást a FENTI MÉRÉS igazolja, nem parancssor-próba.**
A 6+ menetes lánc próbához hat figyelő kellene; a parancssor-próbák azt mérik, hogy az
ismétlés egyáltalán fut (és a rontás buktatja). *Amit nem mértünk, arról ezt írjuk le.*

---

## 31. ⭐⭐ TÚLÉLI-E A BEMONDOTT UDP-CÍM A BULI-KÖZT? — az őrjárat UDP-re állítása előtt (2026-09-17)

`node koino/meres/udpLekepezesMeres.js [várakozások mp] [helyi kezdőport]`

### Miért most

⛔ **Az `orjarat` ma is TCP-n fut** — a UDP-vonal (ablak, RTT, AIMD, Vegas, randevú) egyetlen
éles hívója a kézi `pajzsfuro` parancs. Csaba 2026-09-13-án a UDP-t választotta fő útnak; a
végrehajtás maradt el. Az átállítás előtt egy kérdés **szerkezetet** dönt el: az őrjárat
5 percenként ébred, közben a foglalat hallgat — **igaz marad-e a bulin bemondott külső
UDP-cím a következő bulin?** Ha nem, minden ablak elején újra át kell adni, vagy életjel kell
(az 5. szabály széle).

⭐ **Egy készülék elég hozzá.** Több foglalat egyszerre indul, megkérdezi a külső portját,
**hallgat** (20 / 60 / 150 / 330 mp), és újra kérdez; mellette egy **kontroll**, ami 15
mp-enként kérdez (ha az is mozdul, a vonal változott, nem a csend okozta).

### Az eredmény — a fejlesztő otthoni vonala

| csend | előtte → utána | |
|---|---|---|
| 20 mp | 9867 → 9867 | ✓ |
| 60 mp | 9890 → 9890 | ✓ |
| 150 mp | 9869 → 9869 | ✓ |
| **330 mp** | **9936 → 9936** | ✓ |
| kontroll | végig 9937 | ✓ |

- ⭐⭐ **A külső port 330 mp csendet is túlélt** — vagyis ezen a vonalon egy bulin bemondott
  UDP-cím az alapértelmezett 5 perces ütem mellett **életjel nélkül** is igaz marad.
- ⭐ **Célfüggetlen**: három tükör (google ×2, cloudflare) ugyanazt a portot látta (9954).
- ⭐ **A router átír, de kiszámíthatóan**: a helyi 7380 → 9954, 7381 → 9867 **mindkét futásnál,
  percek különbséggel** is. *Ebből az is következik, hogy a „port ugyanaz maradt" itt jelentheti
  azt is, hogy a leképezés lejárt, és ugyanazt a számot kapta vissza — a koinónak a kettő
  egyenértékű: a bemondott szám igaz.*

### ⛔ Egy vak lépést a saját mérőmben az első futás mutatott meg

Volt benne egy „újranyitás" lépés (bezárni, ugyanarról a helyi portról újra megnyitni) — és
**semmit nem mért**: a router nem tudja, hogy a program bezárta a foglalatot, neki csak a csend
számít, tehát egy másodperc után magától értetődően ugyanazt adta. Kivettem; a kérdést a
hallgató foglalatok teszik fel helyesen.

### ⚠️ És egy mellék-lelet: a KÜLSŐ IP IS VÁLTOZIK

A 17–19. mérésnél (2026-09-13) a vonal **31.46.250.205** volt, ma **31.46.250.22**. ⭐ *A
negyedik független igazolása, hogy a cím nem adható ki tartósan — csak a találkozáskor.* Egy
bulin bemondott cím napokra nem, percekre igen.

### ⛔ Amit NEM mond meg

- **EGY vonal** (otthoni router). ⏸️ **A mobilhálózat (CGNAT) a döntő eset** — és ⭐ ahhoz sem
  kell második készülék: a telefonon, **mobil adattal, wifi nélkül** ugyanez a parancs. A
  CGNAT-ok leképezése tipikusan rövidebb életű.
- **Hosszabb buli-közt** (pl. 30 perc) — a parancs első érvével mérhető.
- **A szűrést** (kinek engedi be a csomagot a router) — az a pajzsfúrás kérdése, azt a két
  készülékes terepmérés méri.

---

## 32. ⭐⭐⭐ A PAJZSFÚRÁS ÁTMEGY KÉT PORT-ÁTÍRÓ NAT KÖZÖTT — terepmérés (2026-09-17, 18:00)

*Ez a 19. mérés kimondott hiánya volt: „két port-átíró NAT között (pl. két CGNAT) újra kell
mérni". A szomszéd telefonja **mobil adaton** (szolgáltatói NAT), a laptop **otthoni routeren**.*

| | otthoni router (laptop) | mobil, szolgáltatói NAT (telefon) |
|---|---|---|
| helyi port | 7373 | 7373 |
| kívülről | **31.46.250.22:31573** | **130.43.209.249:36557** |
| a port átírva | ✔ | ✔ |

⭐⭐ **ÁTMENT: 1 kopogás, 190 ms** (a laptop oldalán; a telefon 52 kopogása a várakozásé volt,
mert 51 mp-cel korábban indult). **Mindkét irány működik**, továbbító nélkül, port-továbbítási
szabály nélkül. ⭐ **És a csere is végigfutott a résen**: 5 kör, 31 KB, a telefon **2 új
társ-címet tanult**.

⭐ *Vagyis a pajzsfúrás nem a router célfüggetlenségén bukik el attól, hogy MINDKÉT oldal
átírja a portot — a UDP-modellből következően a leképezés a foglalathoz tartozik, és a
STUN-nal megmért szám egy harmadik félre is érvényes volt.*

### ⛔ ÉS EGY LELET, AMI A KÖVETKEZŐ MUNKÁT ÉRINTI: A FÚRÓT NEM SZABAD ÚJRAINDÍTANI

A telefon ugyanarról a helyi portról **futásonként más külső portot** kapott
(7380 → 31602, majd 31514; a fúró 7373 → 36557). ⚠️ Tehát a bemondott szám **csak addig
érvényes, amíg az a foglalat él** — ha a program újraindul, a társ a semmibe kopog.
⭐ *Ez a buli-szerkezet melletti újabb érv: a címet a találkozás pillanatában kell átadni.*

### ⚠️ ÉS AMI 0 ESEMÉNYT HOZOTT — a kapu jól működött

A laptop 45 eseményt küldött, a telefon **0 újat vett át**. ⭐ Az ok nem a rés: helyben, két
folyamattal megismételve **ugyanez jött ki**. A laptop `sajat` koinójában **9 esemény** áll
**2026-08-29-ből**, vagyis a Szakasz 3 (2026-09-03) kanonikus alakja ELŐTTI formátumban —
hiányzik belőlük az `entitas` mező, ezért az `esemenyMentese` **minden készüléken elutasítja**
(„hiányzó mező: entitas"). *A régi adat nem törik be a mai koinóba — ez a 3. szabály
gyakorlatban.*

⏸️ **Egy kisebb pazarlás, feljegyezve:** a telefon **körönként újra kérte ugyanazt a 9
eseményt** (5 kör × 9 = 45), mert egyik sem került a tárába. A csendes kör szabálya leállította,
tehát nem végtelen — de egy elutasított eseményt ugyanabban a cserében nem kellene újra kérni.

### ⏸️ Amit ez a menet NEM mért meg

- **A mobil leképezés ÉLETTARTAMA** (31. mérés a mobilon) — a szomszéd elment, mielőtt lefutott
  volna. ⭐ A koino fent van a telefonján: `node koino/meres/udpLekepezesMeres.js`, 6 perc.
- **Két MOBIL készülék egymás közt** (ugyanazon szolgáltató CGNAT-ja mögül) — ott a fúrásnak a
  közös NAT-on kellene visszafordulnia (hairpinning), és ez gyakran tiltott.
- **A rés sebessége** valódi vonalon.

---

## 33. ⚠️ MENNYIBE KERÜL A FRISS CÍM A VONALON? (2026-09-18, a terjesztés megépítésekor)

*A `CIMEK` üzenet mostantól **friss UDP-címeket** is visz (`udp` mező, `kor` másodpercben).
A 6. szabály szerint az új mezőt a **bájtokon** kell megnézni, nem a mappa méretén.*

Két üres tár, „nincs újdonság" kör, oda-vissza együtt:

| | a kör mérete | a friss címek ára |
|---|---|---|
| friss cím nélkül | **386 bájt** | — |
| 1 friss címmel | 480 bájt | +94 |
| **10 friss címmel** | **1346 bájt** | **+960** |

⛔⛔ **EGY CÍM ~96 BÁJT KÖRÖNKÉNT (oda-vissza), és ez sok.** Tíz címmel a „nincs újdonság"
kör **megháromszorozódik**. ⚠️ Napi léptékben, 14 társsal, 5 perces ütemmel: **1,5 MB → 5,4 MB
naponta** — *egy mobilos e-embernek ez érezhető* (D35: a csere ára befogadási kérdés).

⏸️ **AMI EBBŐL KÖVETKEZIK, ÉS MÉRÉST KÍVÁN:** hány friss cím kell ahhoz, hogy a kör összeérjen?
A jegyzék korlátja ma **10** (a `CIM_KORLAT`-hoz igazítva), de ez **nem mért szám** — a
`buliMeres.js` kiterjesztése tudná megmondani, és addig ez a legdrágább új tétel a vonalon.
⭐ *Két olcsóbb irány is nyitva áll: kevesebb címet küldeni (a legfrissebbeket), vagy rövidebb
mezőneveket használni (~20%).*

---

## 34. ⭐⭐⭐ HÁNY FRISS CÍM KELL? — és a válasz NEM a szám (2026-09-18)

`node koino/meres/buliMeres.js [készülék] [társ]` — az utolsó szakasz.

### A kérdés és a modell

A 33. mérés szerint egy friss cím **~96 bájt körönként**, tíz címmel a kör 386 → 1346 bájt.
Tehát nem mindegy, hány utazik. ⭐ **A modell a legrosszabb esetet nézi:** egy ablak, és
**mindenki külső címe megváltozott** a buli-köz alatt — kivéve a **horgonyokat**, akiknek a
címe érvényes maradt (nyitott kapu / postaláda, vagy a leképezés túlélte a csendet).
⭐⭐ **És a kopogáshoz elég az egyik oldal tudása:** aki kopog, annak a címét a másik a
csomagból látja (`latlak`). *A találkozás maga is címcsere.*

### Az eredmény — a hír hány %-át éri el, egy ablakon belül

**Sűrű gráf (100 készülék, 14 társ):**

| horgony | K=0 | K=1 | K=3 | K=5 | K=10 |
|---|---|---|---|---|---|
| **0%** | **1%** | **1%** | **1%** | **1%** | **1%** |
| 2% | 20% | 32% | 22% | 25% | 25% |
| 5% | 58% | 65% | 57% | 60% | 56% |
| **20%** | 99% | 100% | 100% | 98% | 100% |
| 50% | 100% | 100% | 100% | 100% | 100% |

**⛔ Ritka gráf (100 készülék, 3 társ — a KIS KOINO, D22):**

| horgony | K=0 | K=1 | K=3 | K=5 | K=10 |
|---|---|---|---|---|---|
| 0% | 1% | 1% | 1% | 1% | 1% |
| 5% | 11% | 7% | 11% | 11% | 8% |
| 20% | 62% | 61% | 60% | 66% | 61% |
| 50% | 95% | 97% | 99% | 97% | 97% |

### ⛔⛔ A LELET: NEM A CÍM-SZÁM DÖNT, HANEM A HORGONYOK ARÁNYA

A sorokon belüli ingadozás (32% vs 22%) a **szórás**, nem tendencia — 60 futás mellett ±5
pont. ⭐ **A K oszlopok gyakorlatilag egyformák, a sorok viszont nagyságrendet ugranak.**

Két ok, és mindkettő szerkezeti:

1. ⭐ **A találkozás maga is címcsere** — az első kapcsolat után a címet nem kell terjeszteni.
2. ⛔⛔ **Horgony nélkül SEMMI nem indul el** (0% sor: 1%, vagyis csak a hír gazdája tudja).
   *A terjesztésnek kell egy pont, ahonnan induljon.*

⭐⭐⭐ **EBBŐL KÖVETKEZIK, HOGY AZ „ÉJJELI ŐRSÉG" NEM DÍSZ, HANEM FELTÉTEL** — vagy legalábbis
valami, ami ugyanezt adja: **postaláda, nyitott kapu, vagy olyan vonal, amin a leképezés
túléli a csendet**. *(A laptop ilyen volt, a telefon nem — 31. mérés.)* ⛔ És a **kis koino**
itt is a kritikus eset: három társnál még 20% horgony mellett is csak 62%.

### ⏸️ A JAVASLAT, ami ebből adódik (Csaba döntése)

⭐ **A SAJÁT friss címünk menjen mindig** (ez EGY bejegyzés: +94 bájt körönként) — ettől leszünk
megtalálhatók. ⏸️ **Mások címének továbbítása viszont a mérés szerint alig ad hozzá**, és
tízszer ennyibe kerül: a korlát **10-ről 3-ra (vagy 0-ra) vihető**, amíg valódi hálózaton
mást nem mutat. *Az olcsóbb megoldás nem feladás: a horgony adja a terjedést, nem a lista.*

### ⚠️ A MODELL HATÁRAI — amit ez a mérés NEM mond meg

- A terjesztést **azonosító–cím kötésként** modellezi; a valódi lista **névtelen**, tehát a
  kopogás a jegyzék MINDEN friss címére megy — ez **többet érhet**, mint amit itt mértünk
  (idegen, nem szomszéd címére is kopoghatunk).
- **Egy ablak, legfeljebb 10 menet, mindenki ébren** — legjobb eset.
- A horgony címét **végig érvényesnek** veszi.
- ⛔⛔ **ÉS EGY FELTEVÉSE ÜTKÖZIK A 2026-08-30-I TEREPMÉRÉSSEL** (felismerve 2026-09-18, a
  horgony-kérdés átbeszélésekor): a *„kopogáshoz elég az egyik oldal tudása"* csak akkor igaz,
  ha a kopogás **átjut** a fogadó routerén. A „nincs full cone" mérés szerint (UDP, 14 146
  kopogás) a router csak attól enged be, akinek maga is küldött. ⭐ Vagyis az a horgony, akinek
  csak a **leképezése** élte túl a csendet, egy **új címmel** ébredőt nem enged be — a modell
  horgonya valójában csak a **nyitott ajtó** lehet. ⚠️ A mobil NAT szűrését nem mértük.

---

## 35. ⭐⭐⭐ A KÖTÉS-HÁLÓ — összefüggő marad-e, ha a telefonok hálózatot váltanak? (2026-09-18)

`node koino/meres/kotesMeres.js` · *(`KOINO_VALTAS=8` → napi 8 hálózatváltás)*

### A kérdés — Csaba ötlete

*„minden készülék 2-3 készülékkel tartana fent egy olyan energiatakarékos kapcsolatot, ami
lehetővé tenné, hogy elcsípjük a címváltást úgy, hogy még a régivel kapcsolatban vagyunk… a
csoportok nem szigetek lennének, hanem hálózatba rendezve."* — és a cél: **működjön akkor is,
ha a közösségnek csak mobiltelefonja van.**

⭐ **A kötés** (két készülék rendszeresen szól egymásnak, mielőtt a router órája lejárna) a
**csendből jövő** címváltást megszünteti: a leképezés nem évül el, és a szűrő is nyitva marad a
két fél között. ⛔ A **hálózatváltást** (wifi ↔ mobil, IP-csere, router-újraindulás) viszont nem
vészeli át: új cím, és a társak routere eldobja a kopogást. **A modell kérdése: ki hozza vissza
a leszakadtat, és egyben marad-e a háló?**

### A modell

5 perces buli-ablakok, 3 nap · K = 3 kötés (legfeljebb 5 — 9. szabály) · az új társ **véletlen
sétával** jön a meglévő kötéseken (globális címjegyzék nélkül) · napi 4 hálózatváltás
készülékenként, és ilyenkor **minden kötés elvész**. A mentés a következő ablakban:
**hirdetőtábla** (a leszakadt kifelé kiírja az új címét, a régi társai kifelé kiolvassák) vagy
**nyitott ajtó** (egy horgonyon át indul a séta).

### Az eredmény (napi 4 hálózatváltás)

- ⛔⛔ **MENTÉS NÉLKÜL A HÁLÓ EGY NAP ALATT SZÉTESIK — mérettől függetlenül.** Átlagosan 93%
  leszakadva, a 3. nap végén **100%**; a legnagyobb összefüggő darab 10 készüléknél 15%, 1000-nél
  7%. *Hiába tart mindenki kötést: minden hálózatváltás kivesz egy készüléket, és vissza semmi
  nem hozza.* ⭐ Csaba megérzése (*„az nem segít azokon, akik leszakadtak"*) ezzel számot kapott.
- ⭐⭐⭐ **A HIRDETŐTÁBLA MÉRETTŐL FÜGGETLENÜL MŰKÖDIK:** 10 és 1000 készüléknél is ~1% leszakadva,
  99% egy darabban, a visszaállás mediánja **5 perc** (egy ablak). ⭐ Az 1% maga a szerkezeti
  alsó határ: napi 4 váltás × 5 perc ≈ 20 perc/nap. Ha minden második olvasás bukik: 2–3%, a
  95%-os visszaállás 25 perc.
- ⛔ **A NYITOTT AJTÓ A NAGY KOINÓBAN ELÉG, A KICSIBEN NEM:** 1000 készüléknél már 5% horgony is
  ~1%-ot ad, **10 készüléknél** viszont 5% mellett **58% leszakadva** (a futások ~60%-ában
  egyetlen horgony sincs), 20% mellett 10%. *A nyitott ajtó szerencse kérdése — a kis koinó
  (D22) épp ezen bukik el.*
- Napi 8 váltásnál ugyanez a kép: a tábla 2–5%, mentés nélkül 97%.

### ⭐⭐ ÉS A MÉHSEJT (Csaba első képe) — hány lépés bárhonnan bárhová?

| készülék | méhsejt | méhsejt + 1 véletlen | sétával növesztett |
|---|---|---|---|
| 100 | 7,7 | 3,2 | 3,1 |
| 1 000 | 23,2 | 4,6 | 4,6 |
| 10 000 | 78,6 | 6,3 | 5,9 |
| 100 000 | **198,7** | 7,9 | **7,6** |

⭐ A méhsejt a méret **gyökével** nő, a véletlen háló a **logaritmusával**. Kivetítve (becslés,
nem mérés) egymilliárdra: **méhsejt ~20 000 lépés, véletlen ~14**. ⚠️ *A beszélgetésben ~30-at
mondtam — a mérés szerint kevesebb.* ⭐⭐ **És a méhsejt megmenthető:** egyetlen véletlen
távoli társ készülékenként ugyanoda hozza, mint a teljesen véletlen háló *(⚠️ ott a kötésszám
4, nem 3)*. Csaba a véletlen hármat választotta (2026-09-18).

### ⭐ A LELET

**Csak-mobilos közösségben a kötések ÖNMAGUKBAN nem tartják egyben a hálót — a mentés nem
kényelem, hanem feltétel.** A mentések közül pedig **csak a hirdetőtábla nem függ a mérettől és a
szerencsétől**: a nyitott ajtó a nagy koinóban bőven elég, a családi koinóban nem.

### ⚠️ AMIT EZ A MODELL NEM MOND MEG

- **A hirdetőtábla mindig elérhető és egy ablak alatt olvasható** — valódi táblán (web vagy DHT)
  ezt mérni kell; az (e) sor csak a félig bukó olvasást mutatja.
- **A horgony terhelése korlátlan** — kedvező feltevés.
- **Nincs benne az alvó/kikapcsolt telefon, az otthoni wifi** (helyi felfedezés — a családi
  koinót ez segítené) **és a kézi kurbli.**
- **Nincs benne az akkumulátor** — az életjel gyakorisága a router órájából jön (31. mérés), és a
  mobil óra **még nincs megmérve**.

---

## 36. ⭐⭐⭐ A DHT MINT HIRDETŐTÁBLA — a VALÓDI BitTorrent DHT-n (2026-09-19)

`node koino/meres/dhtMeres.js [kor] [körök] [szünet]` · `tesz` + `keres` két készülékhez ·
`KOINO_DHT_BELEPOK=nincs` · `KOINO_DHT_UJKULCS=1` · `KOINO_DHT_KERDESIDO=…`

### A kérdés

A 35. mérés szerint a kötés-háló a hálózatváltást csak **hirdetőtáblával** éli túl, és a modell
feltételezte, hogy a tábla **egy 5 perces ablak alatt** írható és olvasható. Csaba a **DHT-t**
választotta (2026-09-19: gazda nélküli tábla). Igaz-e a feltevés a valódi hálón?

### A műszer — és hogy a mért kód a valódi

`js/csere/dht.js`: BEP 5 (iteratív keresés, tömör címek) + BEP 44 (aláírt, változtatható
bejegyzés), **függőség nélkül**, csak-olvasó kliensként (BEP 43). A mérés ezt a kódot hívja,
nem utánzatot (29/b tanulsága). A bejegyzés **~200 bájt** (három társnak titkosított cím
nagyságrendje), a só `koino-meres`, a kulcs **külön mérő-kulcs**, nem a koino-azonosságé.

### Az eredmény (a fejlesztő otthoni vonala, NAT mögül; 2 mp kérdésidő)

- **Belépőkkel, gyorsítótár nélkül (az első futás):** ha a feltevés sikerült (3/5), a
  visszakeresés **mindig** megtalálta — az első érvényes találat **2,5–3,4 mp**, 6 gépről,
  **0 hamis**. ⛔ **De 2 körben a feltevés már az indulásnál elakadt:** a 4 közismert belépőből
  egy felelt, a többi néma maradt (valószínűleg korlátoztak — egymás után sokszor kérdeztük őket).
  *A 2. szabály kockázata, mérve: aki csak a belépőkön áll, azon múlik.*
- ⭐⭐ **BELÉPŐ NÉLKÜL, csak az 50 megjegyzett géppel: 5/5** — tárolta 7/8 gép, a feltevés
  ~11 mp, a teljes keresés ~11 mp. ⚠️ Az első találat itt **0,1 mp** volt — de ez túl kedvező:
  minden kör UGYANAZT a célszámot használta, és a megjegyzett gépek között ott voltak épp a
  tárolói. *Egy visszatérő társnál valósághű, egy első keresésnél nem.*
- ⭐⭐⭐ **BELÉPŐ NÉLKÜL, MINDEN KÖR ÚJ KULCCSAL: 5/5** — tárolta 7–8 gép, a feltevés mediánja
  **17,6 mp**, a teljes keresés mediánja **18,9 mp**, 0 hamis. ⚠️ Az első találat (0,2–2,4 mp)
  itt is kedvező, mert a kereső ugyanazzal a gyorsítótárral indul, mint a feltevő; egy másik
  készüléknél az első futás **2,5–6 mp**-e a valósághűbb.
- A kérdések **kb. fele-kétharmada néma** (lejár), és az idő nagy része ezekre várás.

### ⭐ A LELET

**A 35. mérés feltevése áll: a DHT egy ablakon belül írható és olvasható** — a feltevés és a
keresés is **~20 mp**, az ablak 5 perc. ⭐⭐ **És a 2. szabály itt kézzelfogható:** a közismert
belépők korlátoznak és elnémulnak, **a megjegyzett gépekkel viszont belépő nélkül is 10/10**.
*A belépő a kurbli: egyszer kell, utána a készülék a saját emlékezetéből indul — és a társak
is átadhatják egymásnak a megismert DHT-gépeket.*

### ⛔⛔ AMIT AZ ÉPÍTÉS ÉS A MÉRÉS KÖZBEN A RONTÁS-PRÓBÁK TALÁLTAK

1. ⛔⛔ **A keresés időkorlátja csak VÁLASZRA ellenőrződött.** Ha egyetlen válasz sem jön (egy
   várakozás nem jár le, vagy egy ág elfelejt léptetni), a keresés **örökre állt** — két
   rontás-próba nem bukott, hanem **beragadt**. *A nem-esemény, a legrosszabb hibafajta
   (25. mérés).* ✅ Saját óra: az időkorlát akkor is lezár, ha semmi nem történik.
2. ⚠️ **Egy hazudó felirat:** a keresés akkor is „kész"-t mondott, ha **egyetlen** gép felelt
   és a jelöltek elfogytak (mérve: „7 kérdés, 1 felelt, vége: kesz"). ✅ „Kész" csak nyolc
   felelő géppel; különben „nincs-tobb-jelolt".
3. ⚠️⚠️ **És egy próba, ami a hazudó feliratra épült:** a néma gépes önpróba `ok === 'kesz'`-t
   kért, és a javítás után **néha** bukott — helyesen: néma gépekkel a keresés becsületesen
   kevesebb mint nyolc felelővel ér véget. *A próba a régi címkét mérte, nem a viselkedést.*
   ✅ Most azt méri, ami a lényeg: megtalálja, és az időkorlát ELŐTT ér véget.
4. ⚠️ **Az első halott-belépős próba vak volt:** a keresés a másik belépőn át már végzett,
   mire a halottra lejárt a várakozás. ✅ A valódi eset a néma gép a legközelebbiek KÖZÖTT.

⭐ **17 önpróba, ÖT rontás-próbával igazolva** — az aláírás-ellenőrzés kikapcsolása · a
jelöltek felvételének kikapcsolása · a só kihagyása az aláírt bájtokból · a `find_node`-tartalék
elrontása · és a lejárat letiltása: **mind buktat**, beragadás nélkül. A BEP 44 hivatalos
tesztvektorai (bittorrent.org) **bájtra** egyeznek.

### ⚠️ AMIT EZ A MÉRÉS NEM MOND MEG

- **Egy vonal, egy gép** (otthoni NAT). ⏸️ **Mobil adatról** és **két készülék között** a
  `tesz` + `keres` párossal mérhető — ez a következő terepmérés.
- **Mennyi ideig marad fent** egy bejegyzés (a BEP 44 szerint a tárolók néhány óra után
  elengedhetik): ⏸️ `node koino/meres/dhtMeres.js keres` órák múlva megmondja (a mérő-kulcs
  megmarad, és kiírja, hány perce tették fel).
- **Csak IPv4.** Az IPv6 DHT (`nodes6`) nincs megépítve.
- **Az adatvédelem** (D6): ma a mérő-kulcs nyilvános, a só ismert. Élesben a bejegyzést **nem
  az azonossági kulccsal** tesszük fel, és a tartalom a társaknak titkosított — ⏸️ ezt a
  beépítéskor kell megtervezni.

### ✅✅✅ 36/b. — MOBILNETRŐL ÉS KÉT HÁLÓZAT KÖZÖTT IS (2026-09-19, terepmérés)

A szomszéd telefonja (Termux, **mobil adat, wifi nélkül** — a képernyőn 4G jel), Csaba futtatta.

- **`kor 3` a telefonon, üres emlékezettel, a közismert belépőkkel: 3/3.** Feltéve 7/7, 7/7,
  7/8 gépre, 17–25 mp alatt; a visszakeresés mindháromszor megtalálta — az első körben
  **4,5 mp** alatt jött az első érvényes találat, utána 0,2–0,3 mp (a megjegyzett gépek hatása);
  a teljes keresés ~19 mp. **0 hamis.** A felelő és a néma gépek aránya ugyanaz, mint az
  otthoni vonalon — **a szolgáltató nem fojtja el a DHT-forgalmat**.
- ⭐⭐⭐ **KÉT HÁLÓZAT KÖZÖTT:** a telefon mobilnetről feltett egy bejegyzést (`tesz`, 7/8
  tároló, 19,2 mp), a **laptop az otthoni vonalról megtalálta** (`keres <kulcs>`): ugyanaz a
  sorszám, **4 perccel** a feltevés után, **5 érvényes, 0 hamis**, az első találat **2,6 mp**,
  a teljes keresés 22,8 mp. ⚠️ Ez az „első keresés" esete: a laptop megjegyzett gépei között
  nem voltak ennek a célszámnak a tárolói.
- A belépők ezúttal elsőre engedtek — a 36. mérés elakadása valószínűleg a sok egymás utáni
  futásnak szólt.

⭐ **A LELET: a DHT mint hirdetőtábla mobilnetről és két hálózat között ugyanúgy működik, mint
egy gépen — ez volt az egyetlen mérés, ami az építést befolyásolta volna.** ⏸️ Hátra: a
bejegyzés **élettartama** (`keres` órák múlva) — és a mobil leképezés élettartama és szűrése
(a kötés-hálóhoz), amik a DHT-t már nem érintik.

### ✅ 36/c. — A BEJEGYZÉS ÉLETTARTAMA: 6,6 óra után is megvan (2026-09-19, 19:40)

A telefon mobilnetről 13:04-kor feltett bejegyzését a laptop **6,6 órával később, újraírás
nélkül** is megtalálta: **3 érvényes, 0 hamis**, az első találat 2,1 mp, a keresés 24,6 mp.
⭐ A tárolók száma lassan fogy: **7** (feltevéskor) → **5** (4 perc múlva) → **3** (6,6 óra
múlva). *Vagyis a tábla nem percekben, hanem órákban felejt — az újraírás órás ütemben is
bőven elég, és a hálózatváltáskori kiírás addig biztosan fent marad, amíg a társak kiolvassák.*
⚠️ Egy mérés, egy bejegyzés — a pontos felejtési görbéhez több kell.

---

## 31/b. ⭐⭐⭐ A MOBIL LEKÉPEZÉS ÉLETTARTAMA — mobilnetről (2026-09-19, 17:59, terepmérés)

`node koino/meres/udpLekepezesMeres.js` · a szomszéd telefonja, **mobil adaton** (4G), Csaba futtatta.

- **Célfüggetlen:** ugyanarról a foglalatról (7380) három tükör (google-1, google-2,
  cloudflare) **ugyanazt** látja: `130.43.210.126:61396`. *A bemondott port egy harmadik félre
  is igaz — ahogy otthon (18., 31.) és a 32. mérésnél.*
- ⭐⭐⭐ **A LEKÉPEZÉS 330 MP CSENDET IS TÚLÉLT:** 20 · 60 · 150 · 330 mp hallgatás után
  **mind a négy foglalat ugyanazon a külső porton** szólalt meg; a 15 mp-enként kérdező
  kontroll végig ugyanaz. *A korábbi „150 és 330 mp között elévül" (31. mérés, telefon) nem ez
  a hálózat volt — ezen a mobil szolgáltatón legalább 5,5 perc.*
- ⚠️ Mellékes megfigyelés: az egymás után nyitott foglalatok (7380…7385) **egymás utáni**
  külső portot kaptak (61396…61401). A 32. mérésnél ugyanennél a szolgáltatónál újraindításkor
  **más** szám jött — tehát erre NEM szabad építeni, csak feljegyezzük.

### ⭐ A LELET — és ami a kötés-hálónak következik belőle

**Ezen a mobil hálózaton egy 5 perces buli-köz életjel nélkül is átvészelhető.** A kötés-háló
életjelének tehát nem kell sűrűbbnek lennie, mint maga a buli: *ha a társak a percfordulós
ablakban amúgy is szólnak egymásnak, az ablak MAGA tartja életben a leképezést* — külön
ébredés nélkül. ⚠️ **A 330 mp alsó korlát, nem a határ** (hosszabb csendet ez a futás nem
mért), és **egy szolgáltató egy mérése** — más szolgáltatónál más lehet; ezért marad az elv:
*a gyakoriság mindenhol a mért órából jön, nem beírt számból.*

⏸️ **Hátra:** hosszabb csend (`udpLekepezesMeres.js 900`) · és a **mobil SZŰRÉS** (beengedi-e
az idegent, amíg a leképezés él) — ahhoz a telefon és a laptop kell egyszerre.

---

## 36/d. ⛔⛔ A MOBIL SZŰRÉS — A MOBIL NAT NEM ENGEDI BE AZ IDEGENT (2026-09-19, 21:46, terepmérés)

A szomszéd telefonja **mobil adaton** (wifi ki), a laptop otthon. Meglévő parancsokkal, új kód nélkül.

**1. A próba (idegen kopog):** a telefon a **semmibe** fúrt
(`pajzsfuro 192.0.2.1 7373 7373` — a TEST-NET címen senki nem felel), így a leképezése élt
(`130.43.210.126:61389`), de rést **csak a 192.0.2.1 felé** nyitott. A laptop
(`31.46.250.22:49921`) **180 kopogást** küldött 3 percen át a telefon bemondott címére —
⛔ **egyetlen válasz sem jött** — és a telefon képernyője szerint (556 saját kopogás alatt) **egyetlen idegen kopogás sem érkezett hozzá**, vagyis a csomag nem a visszaúton veszett el, hanem be sem jutott. *(A fúró bárki kopogására felel, nem csak a céljáéra; ha
egyetlen kopogás átjut, a telefon `HALLAK`-ja a laptophoz visszaér, mert a laptop routere
már nyitott rést a telefon felé.)*

**2. Az ellenpróba (kölcsönös kopogás):** hogy ne a rossz cím legyen a magyarázat, a telefon
újraindult a **laptop** címére (`pajzsfuro 31.46.250.22 49921 7373`), a laptop változatlanul a
telefon **régi** címére kopogott — ✅ **azonnal átment** (a telefon oldalán **1 kopogás, 292 ms**): kopogás mindkét irányból, `HALLAK`
mindkét irányból, és a **csere is végigfutott a résen** (5 kör, 38,8 KB).
⭐ *Vagyis a cím jó volt, az út él — az egyetlen különbség az, hogy a telefon kopogott-e a
laptopra. Ez a SZŰRÉS, tisztán elválasztva.*

### ⭐ A LELET

- ⛔⛔ **Ezen a mobil szolgáltatón egy telefon NEM lehet nyitott ajtó.** A leképezés
  célfüggetlen (31/b) és 330 mp-et túlél, de a **szűrés** csak attól enged be, akinek a telefon
  maga is küldött — ugyanúgy, mint az otthoni router (2026-08-30). *A „port-korlátozott kúp"
  alak: a szám mindenkinek igaz, az ajtó csak az ismerősnek nyílik.*
- ⭐ **Következmény a kötés-hálóra: a kapcsolatot csak KÖLCSÖNÖS kopogás nyithatja** — tehát
  az **új** társ elérése (a hálózatváltás után is!) mindkét fél egyidejű fúrását kívánja. Ehhez
  kell a két dolog, amit már terveztünk: a **buli** (az egyidejűség) és a **hirdetőtábla** (a
  friss cím, amire kopogni kell). *A 35. mérés „nyitott ajtó" mentése csak-mobilos közösségben
  tehát nem áll rendelkezésre — a tábla nem kényelem, hanem az egyetlen út.*
- ⭐ **Mellékes, de hasznos:** a telefon **ugyanazt a külső portot** kapta vissza (61389), amikor
  ~8 perccel később ugyanarról a helyi portról újraindult; a laptop szintén (49921). *A
  leképezés a HELYI foglalathoz kötődik, és amíg él, az újraindítás nem változtatja meg.* ⚠️ A
  32. mérésnél ugyanennél a szolgáltatónál újraindításkor más port jött — ott valószínűleg
  közben elévült. Erre tehát nem építünk, csak feljegyezzük.

### ⚠️ AMIT EZ A MÉRÉS NEM MOND MEG

Egy szolgáltató, egy készülék, egy este. Más mobil szolgáltató szűrhet lazábban — de a
tervezésnek a **szigorú** esetet kell kiszolgálnia (9. szabály: a router-eltérés alapállapot).
⏸️ **Két mobil egymás közt** (hairpinning ugyanazon a szolgáltatón) továbbra is méretlen.

---

## 37. ⭐⭐⭐ A HIRDETŐTÁBLA ÉLESBEN — a cím átmegy a valódi DHT-n, titkosítva (2026-09-20)

`node koino/koino.js tabla kiir <cím> <port>` · `… tabla olvas` — két adat-mappa egy gépen,
a **valódi BitTorrent DHT-n** (nem hamis hálózat).

### Az eredmény

- ⭐ **KIÍRÁS: 22,1 mp, 8 tároló gép.** Az egyik készülék a MÁSIK rekeszébe írta a címét
  (`203.0.113.7:41777`) — aláírva a saját tábla-kulcsával, a tartalom titkosítva.
- ⭐ **KIOLVASÁS: 22,9 mp**, és a cím **kibontva, hibátlanul** megjött.
- ⭐⭐ **A teljes lánc végigment:** tábla-kulcs → közös titok (X25519, küldés nélkül) →
  AES-GCM titkosítás → Ed25519 aláírás → DHT (BEP 44) → vissza, kibontva.

### ⭐ A LELET

**Az „automatizált kurbli" működik: a leszakadt készülék KIFELÉ kiírja az új címét, a társa
KIFELÉ kiolvassa — és közben egyetlen idegen sem tudja, mit olvas.** A 35. mérés modellje
ezzel valódi alapot kapott: a tábla, ami ott ~1%-os leszakadást adott, élesben is ~22 mp,
vagyis az 5 perces ablakba **bőven belefér**.

### ⛔ AMIT A MÉRÉS NEM MOND MEG

- **Egy gép, két adat-mappa** — a DHT-út valódi, de a két „készülék" ugyanazon a vonalon
  van. ⏸️ Két valódi mobil még hátra van (a terv 4. lépése).
- **Egy bejegyzés, egy alkalom.** A 36/c. szerint a bejegyzés 6,6 órát túlél; a tábla
  felejtési görbéje ezzel együtt is csak közelítés.
- ⚠️ **A 22 mp a KERESÉS ideje, nem a kiírásé:** a DHT-ben a művelet nagy része a rekeszhez
  legközelebbi gépek megtalálása. *Ezért olcsóbb ritkán írni (csak címváltáskor), mint
  gyakran.*

### ⭐⭐ ÉS AMIT A SZERKEZET AD INGYEN — a rekeszt meg sem lehet találni

A rekesz „sója" a **két nyilvános titkosító-kulcsból** számítódik, a DHT-beli cél pedig a
kulcs és a só lenyomata. ⛔ Egy kívülálló tehát **nem tudja kiszámolni, hol keresse** — még
akkor sem, ha a tábla-kulcsunkat valahonnan megszerezte. *Nem azért nem olvassa el, mert
megtiltjuk, hanem mert nem találja meg.* ⚠️ A tartalmat ettől függetlenül a titkosítás védi:
két külön őr, két külön kérdésre.

---

## 38. ⚠️ MIBE KERÜL A KÖR A TÁBLA UTÁN? (2026-09-20, a 33. mérés folytatása)

Két készülék egy gépen, `figyel` + `csere`, **nincs újdonság** (üres kör) — ez a napi
forgalom alapegysége (D35, 6. szabály).

| a kör tartalma | bájt |
|---|---|
| ⛔ **RÉGEN: tíz idegen cím** (33. mérés) | **1346** |
| ⭐ **MA: 3 idegen cím + saját + tábla-kulcs + 3 DHT-gép** | **931** |
| csak a tábla-kulccsal (üres jegyzékek) | 762 |
| tábla-kulcs nélkül, üres jegyzékekkel | 550 |

### ⭐ A LELET — a tábla ÁRÁT a cím-korlát kifizette

- **A tábla-kulcs 212 bájt körönként** (106 irányonként: két 43 karakteres kulcs + a mezők).
  ⚠️ Ez több, mint amennyit becsültem (~90) — *a mérés megint pontosabb volt az érvelésnél.*
- ⭐⭐ **De a teljes kör MÉGIS olcsóbb lett: 1346 → 931 bájt**, mert Csaba (d) döntése
  (mások címéből 3 megy, nem 10) ennél többet szabadított fel. *A hirdetőtábla tehát nem
  drágítja a napi forgalmat — a helyére költözött annak, amiről a 34. mérés kimutatta, hogy
  nem számít.*
- Napi szinten, 5 perces ütemmel, 14 társsal: **5,4 MB → 3,8 MB**.

### ⏸️ AMI OLCSÓBB LEHETNE (ha egyszer szűkös lesz)

A tábla-kulcs **minden körben** utazik, pedig a társ az első találkozás után már tudja.
⭐ Olcsóbb alak: a kulcs helyett egy rövid **ujjlenyomat** menne (kb. 20 bájt), és a teljes
kulcs csak akkor, ha a másik nem ismeri fel. ⛔ Ez viszont protokoll-bonyolítás (ki kérdez,
ki felel, mi történik, ha az egyik fél elveszítette a jegyzékét) — *ma a 931 bájt kevesebb,
mint ami tegnap volt, tehát nem kell megvenni ezt a bonyolultságot.*

---

## 39. ⭐⭐⭐ A HIRDETŐTÁBLA TEREPEN — KÉT VALÓDI TELEFON (2026-09-21, 19:30–20:12)

**Ez a 35. és 37. mérés hiányzó darabja:** eddig a táblát csak modellben (35.) és **egy
gépen** (37.) mértük. Most két valódi telefon, Termux + Node, a friss `main`-ről
(`5e832b8`, 680 önpróba).

| | „A" telefon | „B" telefon |
|---|---|---|
| szerep | **elvitt** (ő váltott hálózatot) | **maradó** (ő figyelt) |
| kulcs | `UPkUZ4an_99W4vPc8` | `dqowl2V7_D29X0_wE` |
| tábla-kulcs (rekesz) | `ApZHO1qsoIyk…` | `35oykowL4itc…` |
| induló cím | `192.168.233.98` | `192.168.233.14` |
| globális IPv6 a mobilon | **van** (`2a00:1110:…`) | nincs |

Mindkettőn `orjarat 1` futott (1 perces ablak — a mérés miatt, az alapérték 5).

### ⭐⭐⭐ A FŐ EREDMÉNY: A TÁBLA VÉGIGVITTE A CÍMET, KÉZI BEAVATKOZÁS NÉLKÜL

A „B" telefon naplója, a hálózatváltás után:

```
20:09:35  0/4 társ — 0 új esemény, 0 bájt            ← a társ elnémult
20:10:05  ⭐ a táblán megvan egy néma társ új címe:
          5.187.184.117:7373 (az ő órája szerint 1 perce írta ki)
```

- **A** magától észrevette, hogy megváltozott a címe, és **kiírta a táblára** — miközben
  már úton volt, kézi parancs nélkül.
- **B** magától észrevette, hogy a társ **elnémult**, és **kiolvasta a tábláról az ÚJ
  címét** — egy vadonatúj, nyilvános címet (`5.187.184.117`), aminek semmi köze a korábbi
  `192.168.233.98`-hoz.
- ⭐ **Elnémulástól a megtalálásig 30 MÁSODPERC.** *(A 35. mérés modellje 5 perces ablakkal
  számolt; itt 1 perces ablaknál a teljes visszatalálás jóval egy percen belül volt.)*

⭐ **És a kiírás ára élesben, TELEFONRÓL:** `19:54:28 az új címemet kiírtam a táblára
(1 társ rekeszébe, **8 tároló**)` — **ugyanannyi tároló, mint a 37. mérésen** (laptopról).
*A telefon nem gyengébb tábla-résztvevő.*

⚠️⚠️ **PONTOSÍTÁS, mert könnyű összekeverni:** ez a 8 tárolós kiírás a **„B" (maradó)**
telefoné, és **még a váltás ELŐTT** történt — akkor, amikor a közös hálózaton először
megtudta a saját külső címét. ⛔ A **váltás utáni** kiírás az „A" telefoné volt, és arról
**csak közvetett tudásunk van**: „B" olvasata szerint *„az ő órája szerint 1 perce írta ki"*.
**Az „A" oldali tároló-szám ISMERETLEN** — a naplójához nem fértünk hozzá. *Ezt a számot a
következő mérésnek kell elhoznia.*

### ⛔ AMI NEM SIKERÜLT: A RÉS NEM NYÍLT MEG

```
20:11:24  1 friss címre kopogtam, egyik rés sem nyílt meg
20:12:06  1 friss címre kopogtam, egyik rés sem nyílt meg
```

A cím megvolt, a kopogás elment — de a rés nem nyílt, tehát a váltás után létrehozott
gondolat (`ie-mAD_2 „Atjott a valtas utan"`) **nem jött át**. A 3. szakasz nem teljesült.

⚠️⚠️ **ÉS KÉT MAGYARÁZAT VAN, AMIT EBBŐL A NAPLÓBÓL NEM LEHET SZÉTVÁLASZTANI:**

1. **A másik fél nem kopogott vissza.** A rés csak **kölcsönös** kopogásra nyílik. „A"
   kötés-jegyzékében „B" **régi, hotspotos címe** (`192.168.233.14`) állt — az kívülről
   használhatatlan. Neki is ki kellett volna olvasnia a tábláról „B" címét; hogy megtette-e,
   azt csak **az ő naplója** mondaná meg.
2. **Két mobil NAT nem tud egymásba fúrni.** Ez a **32. mérés** kimondott, máig nyitott
   kérdése (*„két mobil készülék egymás közt, hairpinning"*).

⛔ **A kettő közül NEM választunk, mert nincs rá adat.** Az „A" telefon naplójához a mérés
közben megszűnt a hozzáférés. *Egy mérés, aminek a döntő fele hiányzik, nem ad választ — és
ezt kimondani többet ér, mint a valószínűbbet megtippelni.*

### ⏭️ AMIT LEGKÖZELEBB MÁSKÉNT KELL CSINÁLNI

- ⭐ **A 0. szakaszt NEM kell újra:** a kötés mindkét telefon lemezén megmaradt
  (`kotesek.json`), tehát a következő alkalom **rögtön a hálózatváltással kezdhet**.
- ⛔⛔ **MINDKÉT telefon naplója kell**, és főleg a **távozóé**: kiolvassa-e a tábláról a
  maradó címét. Enélkül a rés-kérdés megválaszolhatatlan.
- Ha a távozó megtalálja a maradót, és a rés **mégsem** nyílik, akkor az a **32. mérés
  hiányzó darabja, negatív eredménnyel** — és akkor a két mobil NAT esete nem elméleti
  aggály, hanem mért tény.

### ⚠️ HÁROM MELLÉKLELET, MIND A TEREPRŐL

1. ⛔ **A HELYI FELFEDEZÉS CSAK ÖNMAGÁT TALÁLTA MEG.** A `felfedez 5` egyetlen választ
   kapott: a **saját** mobilnetes címét (`10.91.173.90`, ami a `cimek` szerint a saját
   felülete). A társ válasza sosem ért át — *ezen a hálózaton a broadcast/multicast nem megy
   át a két készülék között, csak visszahurkolódik.* A két telefon így **kézi `tars`-szal**
   találkozott (`192.168.233.98` ↔ `192.168.233.14`), és onnantól minden ment.
2. ⛔⛔ **ÉS EGY FELIRAT FÉLREVEZETETT — ENGEM IS.** A felfedezés ezt írta: *„+ 0 új társ a
   listán (**1 már ismerős volt**)"* — pedig a valóság az volt, hogy *„1-et KISZŰRTEM, mert
   a SAJÁT címem"*. A szűrő jól működött (`kapottCimekBeolvasztasa` → `sajatCimekKiszurese`),
   de a szöveg két különböző dolgot mond ugyanannak. ⭐ Ez tíz percnyi rossz irányt okozott
   a terepen: arra jutottam, hogy a telefon **felvette magát társnak** — a `tars torol`
   cáfolt meg (*„Nem volt a listán"*). ⏸️ **Javítandó:** a felirat mondja meg külön, hogy
   *már ismert* vagy *saját cím volt*.
3. ⭐ **A rés a közös hálózaton 36–98 ms alatt nyílt** (`rés nyílt: …:7373 (36 ms)`,
   `(67 ms)`, `(98 ms)`) — ugyanaz a nagyságrend, mint a 17. (190 ms) és 19. (76 ms) mérésen.
   *Telefonon sem drágább.*

---

## 40. ⚠️ A KÉT MOBIL NAT — ELMARADT, DE HAT LELETET HOZOTT (2026-09-24, 19:55–20:45)

*A 39. mérés megismétlése lett volna, két mobilnettel (a [forgatókönyv](../../docs/terepmeres_mobil.md)
🅱️ változata). ⛔ **A két mobil NAT közötti rést NEM mértük meg:** az „A" telefon mobilnete
nem működött (feltöltőkártyás — *„a bankos mobil alkalmazást se akarja megnyitni"*). Ami
mégis kiderült, az alább.*

| | „A" telefon (Csabáé) | „B" telefon (a szomszédé) |
|---|---|---|
| tábla-kulcs (rekesz) | `SbjQHYMA63Vd…` — **új**, nem a 39-es „A" | `35oykowL4itc…` — **a 39-es „B"** |
| kulcs | `3Wf7CJIW…` | `dqowl2V7…D29X0_wE` |
| a program | `e747be3` (695 önpróba) | `e747be3` |
| wifis cím | `192.168.1.144` | `192.168.1.36` |
| kötés a mérés előtt | 0 | 1 — a 39-es „A" (`ApZHO…`), **258 018 mp** (~72 óra) óta néma |

⚠️ Mivel az „A" új készülék volt, a 0. szakasz (ismerkedés) **kellett**: kézi `tars`
mindkét irányban, majd `orjarat 1 2>&1 | tee` mindkét telefonon (a 39. mérés tanulsága: a
napló most **fájlban** van).

### ✅ AMI MŰKÖDÖTT: A KÖTÉS ÉS A KIÍRÁS

```
A:  20:09:22 1 társsal van kötésem (a tábla-kulcsuk alatt)
A:  20:09:47 az új címemet kiírtam a táblára (1 társ rekeszébe, 8 tároló)
B:  20:08:14 1 társsal van kötésem (a tábla-kulcsuk alatt)
B:  20:09:33 az új címemet kiírtam a táblára (2 társ rekeszébe, 14 tároló)
```

⭐ A B **20:40:15-kor újra kiírt** (2 rekesz, 14 tároló) — hálózatváltás NÉLKÜL. A kiírás
csak akkor fut, ha a mért külső cím megváltozott, tehát a B-nek új leképezést adott a router.
*A napló nem mondja meg, mire változott — valószínűleg a portja (a fúró körönként új
foglalatot nyit, lásd 32. mérés).* Az „eseményre, nem órára" szabály így is ritka írást adott:
**két kiírás 36 perc alatt.**

### ⭐⭐ A DHT EGY HÁROMNAPOS BEJEGYZÉST IS MEGŐRZÖTT

A B minden néma-körben kereste a 39-es „A" rekeszét — és megtalálta:

```
20:08:38 a táblán megvan egy néma társ új címe: 5.187.184.117:7373 (az ő órája szerint 4320 perce írta ki)
…
20:32:05 a táblán megvan egy néma társ új címe: 5.187.184.117:7373 (az ő órája szerint 4343 perce írta ki)
```

- ⭐ **4343 perc = 72,4 óra**, újraírás nélkül. Eddig a leghosszabb mért élettartam **6,6 óra**
  volt (36/c). *A BEP 44 szerint a tárolók néhány óra után elengedhetik (lásd 36.) — a valódi
  DHT-n ezt a bejegyzést három napig többen is megtartották.*
- ⚠️ **De nem mindig:** a 3 napos bejegyzés **7 olvasásból 5-ször** jött meg (20:26:10-kor
  és 20:39:01-kor nem). A friss, 8 tárolós „A"-bejegyzés **3-ból 3-szor**.
- ⚠️ *A két „nincs" melyik társé volt, azt a napló NEM mondta meg* — az időrendből
  következtetve a régié (a friss mindkét alkalommal fél percen belül megjött). → **javítva**, lent.

### ⚠️ A RÉS: HELYI CÍMEN IGEN, NYILVÁNOSON SOHA

```
A:  20:11:04 rés nyílt: 192.168.1.36:7373 (4173 ms)
A:  20:19:01 rés nyílt: 192.168.1.36:7373 (1393 ms)
    … és minden körben: „1–3 friss címre kopogtam, egyik rés sem nyílt meg"
```

- A **helyi** címre (a kötésben álló `192.168.1.36`) a rés megnyílt — ⚠️ de **1,4–4,2 mp**
  alatt, a 39. mérés 36–98 ms-ával szemben.
- A **friss címekre** (a cserén terjedő nyilvános címek) **egyszer sem**. ⭐ A két telefon
  egy routeren van, tehát egymás nyilvános címe a SAJÁT külső címünk, más porttal — ez a
  2026-09-22-i NAT-javítás esete, és a rés itt csak akkor nyílna, ha a router **visszafordítja**
  a forgalmat saját maga felé (*hairpinning*). ⚠️ *Következtetés, nem mérés:* a napló nem
  írja ki, melyik címre kopogott — de a két telefon mindvégig egy wifin volt, és a helyi rés
  közben megnyílt, tehát a társ ott volt. *Ez a router valószínűleg nem tud hairpinninget* —
  a javítás előre kimondott ára, most először terepen.

### ⚠️ A CSERE: KÖRÖNKÉNT 35 KB, NULLA ÚJ ESEMÉNNYEL

A napló minden körben ezt mutatta: `1/5 társ — 0 új esemény, 35.2 KB` · `átvettem 0,
továbbadtam 10`. ⭐ **A kapu elutasítási okát a részletes napló adta meg** (kézi `csere`,
`KOINO_NAPLO=1`):

| Irány | Mi jött | Mi lett vele |
|---|---|---|
| A → B | **9 esemény** | mind `ELUTASÍTVA — hiányzó mező: entitas` |
| B → A | **2 esemény** | mind `marMegvolt` — az „A"-nál **már megvolt** |

- **Az A → B 9:** az „A" telefon **2026-08-29-i**, a Szakasz 3 (09-03) ELŐTTI alakú eseményei
  (a laptopon ugyanez a 9 áll: 7 a laptopé, 2 az „A"-é). *A 32. mérés már feljegyezte ezt a
  pazarlást* — egy elutasított eseményt a csere körönként újra elkér. A kapu jól dönt (3.
  szabály); a pazarlás marad.
- ⭐ **A B → A 2 ÚJ LELET:** az „A" körönként **újra elkér két eseményt, amelyek már
  megvannak nála**. Ez nem az elutasítás esete — a mentés „már megvolt"-ot mond. ✅ **Az oka
  megvan, és javítva — lásd 40/b.**
- ✅ **A mérést ez NEM akasztotta volna meg:** a kapu nem kéri az elődöt (`esemenyMentese`
  — aláírás, azonosító, elágazás), tehát egy ÚJ esemény a régi hézag mellett is bemegy.

### ⛔ 20:22 UTÁN: AZ „A" MOBILNET NÉLKÜL — ÉS A PROGRAM EZT NEM MONDTA KI

Az „A" 20:22-kor kikapcsolta a wifit — a mobilnet nem működött, vagyis **offline** lett. A
napló ettől kezdve:

```
A:  20:22:46 0/6 társ — 0 új esemény, 0 bájt
A:  20:22:56 egy néma társ nincs a táblán
A:  20:25:01 egy néma társ nincs a táblán
B:  20:26:36 a táblán megvan egy néma társ új címe: 31.46.251.115:47928 (az ő órája szerint 17 perce írta ki)
```

⛔⛔ **KÉT HALLGATÓ HELY, mindkettő ugyanabból a fajtából, mint a 39. mérés „már ismerős"
felirata:**

1. **„egy néma társ nincs a táblán"** — pedig az „A" **egyetlen DHT-gépet sem ért el**.
   A társ közben kint volt (a B mindvégig megtalálta a friss bejegyzéseket). *A felirat a
   HÁLÓZAT hírét a TÁRS hírének adta ki.*
2. **Az „A" nem írta ki az új címét — és erről egy szót sem szólt.** A kiírás csak akkor fut,
   ha a külső cím mérése (STUN, a fúró foglalatán) sikerül; ha nem, a fúró jelzi
   (`SAJAT-CIM-NEM-MEGY`) — ⛔ **de az őrjárat ezt a jelzést eldobta.** Ezért a B csak a
   RÉGI, otthoni címet találta meg (`31.46.251.115:47928`), és 20:29-től arra kopogott.

✅ **Mindkettő javítva ugyanaznap** — próbával és rontás-próbával (lásd a CLAUDE.md-t):
- a táblaolvasás a keresés **válaszszámát** is nézi: ha senki nem felelt → *„a tábla NEM
  ÉRHETŐ EL (N kérdés, egyik DHT-gép sem felelt)"*; ha feleltek, de nincs rajta → *„nincs a
  táblán (N DHT-gép felelt)"* — és **megnevezi a társat**;
- az őrjárat kiírja: *„nem tudom megmérni a saját külső címemet (…) — amíg ez így van, új
  címet sem írhatok a táblára"*, **sorozatonként egyszer**, és szól, ha a mérés újra megy.

### ⚠️ A KÖRÖK KÖZÖTT PERCEK MARADTAK KI

„Kör 1 percenként" helyett több helyen **3–5 perces** szünet: A `20:13:06 → 20:16:40`,
`20:25:01 → 20:29:52`; B `20:13:06 → 20:16:43`, `20:20:14 → 20:24:33`, `20:40:15 → 20:45:17`.
*Oka nyitott.* Két gyanú, és a napló nem választja szét őket: *(1)* az Android
visszafogja a háttérben/elsötétült képernyővel futó Termuxot (→ legközelebb **„Acquire
wakelock"**); *(2)* a kör maga hosszú: a B társ-listáján 6 cím állt, és egy halott TCP-cím
10 mp várakozás. ⚠️ A 20:13–20:16-os szünet **mindkét** telefonon egyszerre volt — ez közös
okra utal.

### ⚠️ ÉS AZ ÖNPRÓBÁK A TELEFONOKON: NÉGY IDŐZÍTÉS-ÉRZÉKENY BUKÁS

| Futás | Bukott (695-ből) |
|---|---|
| A, wifin | `parancssor`: *A TÜRELEM ELJUT A VONALIG* · *A KÖTÉS MEGSZÜLETIK A BULIN* |
| B, wifi nélkül | `dht`: *NÉMA gépek…* — `eltelt 10450 ms (keret 6000) · feltevés: idokorlat, tárolta=4 · keresés: megvan=true` |
| B, wifin | `parancssor`: *AZ ŐRJÁRAT A FAL ÓRÁJÁHOZ IGAZODIK* |

⭐ **Mind a négy más próba, mindegyik egyszer**, és mind a négy fix, a laptophoz szabott
időkeretet használ (1,5 mp induló folyamatra · 14 mp egy 12 mp-es ablakra · 6 mp a DHT-re ·
1 mp tűrés a kör végi kiírásra). A laptopon **mind zöld**, és a `dht` próba **8 mag teljes
terhelése mellett is 3/3**. *Az időzítésre utal, nem programhibára — de BIZONYÍTANI nem
lehet: a négyből három csak annyit mond, hogy „BUKOTT".* ⏸️ **Javítandó:** nevezzék meg,
melyik feltételük nem teljesült, és mennyi idő telt el (ahogy a `dht` próba már teszi).

### ⏭️ AMI KÖVETKEZIK

- ⭐ **A kötés MINDKÉT telefonon megmaradt** (`kotesek.json`) — a következő két mobilos
  alkalom **rögtön a hálózatváltással** kezdhet.
- ⭐ **A telefon + laptop változathoz (0/b.) nem kell a szomszéd** — amint az „A" mobilnete
  működik, egyedül is mérhető, és az dönti el a legfontosabbat: *kiolvassa-e a TÁVOZÓ is a
  táblát, visszakopog-e, átmegy-e a gondolat.*
- A két mobil NAT (32. mérés nyitott pontja) egy **második működő mobilnettel**.

---

## 40/b. ✅ A KÉT SZIVÁRGÁS EGY OKBÓL — JAVÍTVA: 33,1 KB → 1022 bájt körönként (2026-09-24)

*A 40. mérés két pazarlása (körönként 9 elutasított és 2 „már megvolt" esemény) ugyanabból
a gyökérből nőtt ki.*

⛔ **AZ OK:** a csere a SAJÁT tárát hirdette az állásában — benne a 2026-08-31-i alakváltás
előtti eseményekkel, amelyeket a régi program beengedett, a mai kapu viszont nem. Ebből két
kör-ismétlés lett:

1. **A társ elkérte és eldobta őket** — a hiány nála örökre megmaradt, tehát a következő
   körben újra elkérte.
2. **A tükörképe:** a régi események miatt az egyik lánc 1..4-nek látszott, a társé 3,4 +
   hézag 1,2-nek. Az ujjlenyomat örökre eltért, a „nyilvánvaló hiány" üres volt — és a
   `hianyokSzamitasa` erre a lánc közepén rejtett elágazás elleni ágával felelt: **a teljes
   tartományt** kérte el (a 3,4-et), körönként. *A számítás megállási érve azt feltételezi,
   hogy amit az egyik fél hirdet, azt a másik el is tudja tárolni — ez sérült.*

⭐ **A JAVÍTÁS EGY SZABÁLY:** az állás ÉS a válasz csak **alakilag érvényes** eseményt lát
(`csereLatoEsemenyek` — ugyanaz az `alakiHiba`, amit a kapu is használ, most már külön,
szinkron függvényként). *Amit egyetlen mai kapu sem enged be, az a mai protokoll számára nem
létezik.* ⚠️ Az aláírást nem ellenőrizzük újra: a tárba csak kapun át kerül esemény, és az
aláírás szabálya nem változott, csak az alaké.

⭐⭐ **MÉRVE — próbában és valódi vonalon:**

```
A terepi helyzet próbában (régi alakú Anna 1,2 + Béla 1..7; érvényes Anna 3,4), három kör:
  régi kód:     kör 1–3: régi kapott marMegvolt 2 · új kapott elutasítva 9 · egyezik: NEM
  javított kód: kör 1–3: régi kapott marMegvolt 0 · új kapott elutasítva 0 · egyezik: IGEN

A laptop VALÓDI adatával (a 9 régi + 2 érvényes esemény), TCP-n, `figyel` + `csere`:
  régi kód:     küldtem 45 (5 kör, 31 ms, 33.1 KB)     ← terepen 35 KB
  javított kód: küldtem 0  (1 kör, 20 ms, 1022 bájt)
```

⭐ **Körönként ~33-szor kevesebb**, és ⭐ a kör **egyetlen** oda-vissza lett az öt helyett. A
terepen percenkénti körrel ez napi **~50 MB → ~1,5 MB** egy mobilon (D35).

⭐ **4 új próba** (a hirdetés · a tükörképe · *„a próba nem vak"*: egy ÚJ, érvényes esemény a
régi hézag mellett is átmegy · a válasz sem küldi el a régit) — **és a rontás mind buktat**:
az állás szűrőjének kivétele hármat, a válaszé egyet.

⏸️ **AMIT EZ NEM OLD MEG:** egy RÉGEBBI változatú társ továbbra is hirdeti a régi eseményeit,
és a mai kapu továbbra is eldobja. *Ez frissítéssel megszűnik; a két telefonon a következő
mérés előtt úgyis frissítünk.*

⚠️ **ÉS EGY SZESZÉLYES FUTÁS A LAPTOPON:** a javítás után az első teljes önpróba-futás **1
bukást** mutatott (701-ből), a következő **négy** mind zöld volt. ⛔ *Hogy melyik próba
bukott, NEM tudjuk — a kimenetet nem mentettem el, csak az összesítő sort.* Ez ugyanaz a
lecke, mint a telefonokon: egy bukás, ami nem nevezi meg magát, és aminek a nyomát nem
őrizzük meg, nem vizsgálható. ⏸️ *Legközelebb a teljes futás kimenete fájlba megy.*

---

## 41. ⛔⛔ A HOSSZÚ KÖR ELVISZI A KOPOGÁST (2026-09-25, a laptopon)

*A 40. mérésen a körök között 3–5 perces szünetek voltak. Kérdés: mennyi egy kör, ha a
társ elnémult — és mit tesz ez a kopogással?*

**A beállítás** (ideiglenes adatmappa, a valódi `koino-adat` érintetlen): **5 halott TCP-társ**
(`10.255.255.1–5:7373`, nem routolható — a kapcsolódás csak az időkorlátnál adja fel, ahogy egy
telefon régi wifis címe) és **2 néma kötés** (a valódi DHT-n keresi őket). `orjarat 1`, 6 perc.

```
  · 12:16:31 2 friss címre kopogtam, egyik rés sem nyílt meg      ← indulás: 12:16:25
  · 12:17:21 0/5 társ — 0 új esemény, 0 bájt                     ← TCP-kör: 50 mp
  · 12:17:43 egy néma társ (LyJNctOl…) nincs a táblán (22 DHT-gép felelt)
  · 12:17:47 egy néma társ (ujdjB6Hh…) nincs a táblán (1 DHT-gép felelt)
  ⭐ 12:18:27 az új címemet kiírtam a táblára (2 társ rekeszébe, 15 tároló)
  · 12:19:06 2 friss címre kopogtam, …                            ← a 12:17 és 12:18 kimaradt
  · 12:19:56 0/5 társ …   · 12:20:15 … · 12:20:37 …
  · 12:21:06 2 friss címre kopogtam, …                            ← a 12:20 kimaradt
  · 12:21:56 0/5 társ …   · 12:22:14 … · 12:22:31 …
```

⭐ **Egy kör: kopogás 6 mp + TCP-kör 50 mp (5 × 10 mp, egymás után) + táblaolvasás 17–40 mp
(néma kötésenként 4–22 mp) ≈ 90–97 mp**; az első körben a táblaírással **122 mp**. ⛔ A kör
UTÁN alszik a következő percfordulóig — tehát **a kopogás csak minden második percfordulón fut**
(12:19, 12:21, 12:23), az elején kettőt is kihagyott.

⛔⛔ **A KÖVETKEZMÉNY A LÉNYEG:** a rés csak **egyidejű** kopogásra nyílik (36/d.). Két ilyen
állapotú készülék, ha az egyik páros, a másik páratlan percben kopog, **soha nem kopog
egyszerre** — és ez nem véletlen, hanem **stabil állapot**, amibe beleragadnak. ⚠️ És épp akkor
áll elő, amikor a legnagyobb szükség van a résre: hálózatváltás után a társ néma, ettől hosszú
a kör. *Kívülről ugyanúgy néz ki, mint „a két mobil NAT fal" — a két mobilos mérés e nélkül nem
adhat megbízható választ.*

⚠️ Az alapértelmezett 5 perces ütemben egy 97 mp-es kör még belefér; de a társlista nem
korlátos (*„a koino nem felejt el senkit magától"*), 30 halott cím már 5 perc.

⏸️ **Döntésre vár (Csaba):** *(a)* a kopogás SAJÁT ütemben, minden percfordulón, a kör többi
részétől függetlenül (+ a halott TCP-címek párhuzamos próbálása) · *(b)* csak a kör
rövidítése/korlátozása, garancia nélkül. **Átmeneti tanács terepre:** `orjarat 5`.

### ⛔ ÉS EGY HARMADIK HALLGATÓ HELY, AMIT A 40. MÉRÉS NAPLÓJA REJTETT

A 40. mérésen az „A" telefon kétszer kiírta: `rés nyílt: 192.168.1.36:7373` — utána nem jött
`csere a résen` sor, viszont jött ez: *„3 friss címre kopogtam, egyik rés sem nyílt meg"*.
⛔ **Ellentmondás, és a kódban megvan az oka, két rétegben:** az összegző sor a **sikeresen
lezárult cseréket** számolja, nem a megnyílt réseket; és a résen futó csere hibáját
(`ATFURT-MUNKA-BUKOTT`) **az őrjárat eldobja** — ugyanúgy, mint a 2026-09-24-én javított két
jelzést. *Vagyis a közös wifin a rés megnyílt, a csere rajta ismeretlen okból elbukott, és a
program ezt elhallgatta.* ⏸️ Javítandó a kopogás ütemezése előtt: két mobil között csak a rés
létezik, és ha azon a csere elbukik, a gondolat akkor sem megy át, ha a NAT-ok engednék.
