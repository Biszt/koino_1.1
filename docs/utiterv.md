# ÚTITERV — mit építünk, milyen sorrendben, és miért

*Létrehozva: 2026-08-31, Csaba kérésére, a skálázási terv és az S1 mérés után.*

> **Mi ez a dokumentum, és mi nem?**
> A [`fejlesztesi_terv_fazis2.md`](fejlesztesi_terv_fazis2.md) a **döntések** helye (D1–D63),
> a szakasz-tervek az egyes szakaszok **részletei**, a [`skalazas_terv.md`](skalazas_terv.md)
> a **szerkezet**. Ez itt a **sorrend**: mi következik mi után, és miből mennyi kell.
> Rövidnek kell maradnia — ha hosszú lesz, valamit rossz helyre írtunk.

---

> ## ▶️ HOL TARTUNK (2026-09-06) — a Szakasz 4 SZERKEZETE MEGVAN
>
> ✅ **Szakasz 1–3 kész.** A 3. (a szerkezet) 2026-09-03-án zárult: a kanonikus alak négy
> új mezője, a **kérdezhető tár-illesztő** (két mért fal ledőlt: mentés 495 ms → 1,4 ms,
> állapotszámítás 4 615 ms → 502 ms), és a böngésző-lekérés. **217 önpróba rendben.**
>
> ✅ **Szakasz 4 — AZ IDENTITÁS: A 9/c TERV MEGÉPÜLVE (2026-09-06).**
> `js/allapot/identitas.js` (a három kérdés: tag · tanúsíthat · 2. lépcsős) ·
> `js/allapot/jelzesek.js` (a kontraszt-jelzés) · hat új művelet · **50 önpróba**.
> ⭐ **A kanonikus alakot nem kellett felbontani.**
> ⛔ A **séta elvetve** (mérve gyenge, és a D62 óta a szerepe is megszűnt) ·
> ⏸️ a **`lancGyoker`** jelentése rögzítve (D63), a megvalósítás mérés alapján jön.
> ✅ **Csaba lezárta a méréseket:** *„eleget mértünk. Nekem ez így már megfelel, első
> koinónak."*
>
> ⭐⭐⭐ **A SZERKEZET, EGY MONDATBAN (D56):** *az 1. lépcső olcsó, mert a kapu úgysem véd;
> a 2. lépcső drága, mert ott a zsákmány; és a védelem egyikben sem a kapu, hanem hogy a
> rossz tanúsító elveszíti a szerepét.*
>
> - **1. lépcső:** egy meghívó → tag, és **minden mehet** (tartalom, tudatpont, javaslat,
>   szavazat).
> - **2. lépcső:** három tanúsítás felhatalmazott tanúsítótól → **pénztárca**. Ez a **D11**.
> - **A felhatalmazást csak 2. lépcsősök adják**, emberenként egyet; a küszöb **kimondott
>   szám** (érték javaslatok mediánja), nem mért rangsor. ⭐ **Megbízás, nem pontszám**
>   (D60): *„27-en bízták rá a tanúsítást"*.
> - **Az ellenőrzés a gyökérig megy** — mérve olcsó: 17,7 → 30,1 → 40,7 ős 1500 / 6000 /
>   20 000 főnél, **logaritmikus**.
>
> ⛔⛔ **AMIT A MÉRÉS MEGDÖNTÖTT — ne induljon el rajta senki** ([`eredmenyek.md`](../koino/meres/eredmenyek.md) 11–12.):
> **a belépési szám nem védelem, hanem árcédula** (4 megtévesztettnél 0 hamis, 5-nél 880) ·
> **a jogosítási küszöb elrejti a szigetet** (100%/0% helyett 91%/16%) · ⛔ **és a SÉTA a
> leggyengébb láncszem**, nem a legerősebb (43–74% / 31–61%). ⚠️ *A tenger-gondolat (D50)
> megmarad, de nem ő a védelem.* ⛔ A `k` tanúsítás + keret vonala (**D44, D51, D53**)
> **tárgytalan**.
>
> ⭐⭐ **A VÉDELEM A KONTRASZT:** *„hány olyan embert ismersz, akinek nincs önálló élete a
> közösségben?"* — becsületes alapvonal **0,3**, megvett tanúsítóé több száz.
> **100% / 9–25%** minden támadó ellen, és **olcsó**: nincs séta, nincs élő kapcsolat.
>
> ⭐⭐⭐ **ÉS A TÖRVÉNY:** a visszacsatolással a kár **880 → 120**, és
> **kár = a támadó üteme × az ébredés ideje** — lineáris, tehát **a hurok mindig bezárul**.
> ⭐ Ezért a program dolga **az ÉSZREVÉTEL**, a döntés a közösségé (D46).

## 0. MIÉRT KELLETT ÚJRATERVEZNI

Négy dolog változott meg két nap alatt, és mind a négy a sorrendet érinti:

| # | Mi történt | Mit rendez át |
|---|---|---|
| 1 | ⭐ **A két réteg** — a DAG a hitelességé és offline megy; a kereső a megtalálhatóságé és elhagyható | a kereső-réteg **hátra** kerül, a szerkezet **előre** |
| 2 | ⭐ **Az entitás-központúság** — a koino-szintű napló nem tartható | a Szakasz 1 alatti **hordozó** kicserélődik |
| 3 | ⭐⭐ **Az S1 mérés** — a fal nem a tárolás, hanem a **beírás**, és nem a milliónál, hanem **500 e-embernél** | a sürgősség ugrik |
| 4 | ⛔ **A kilencedik szabály** (Csaba) — *a skálázhatóság szempontjából az első verziónak is késznek kell lennie* | **ez adja az egész rendezőelvet** |

---

## 1. A RENDEZŐELV: illesztés → megvalósítás → mélység

A kilencedik szabály nem azt mondja, hogy mindent egyszerre kell megépíteni. Azt mondja, amit
a D21 már megfogalmazott:

> **A SZERKEZET és az ILLESZTÉS az első naptól milliárdos. A megvalósítás mögötte lehet
> egyszerű.**

Ezért **minden lépés három rétegre bomlik**, és csak az első kettő kell most:

| Réteg | Mikor | Példa |
|---|---|---|
| **1. Az illesztés** | ⛔ **most, mindig** | a tár `entitasEsemenyei()`-t adjon, ne `betolt()`-öt |
| **2. A megvalósítás** | most, de **lehet a legegyszerűbb** | mögötte akár egy fájl entitásonként |
| **3. A mélység** | **később, mérés alapján** | gyorsítótár, index, tömörítés, DHT |

🔍 **Az ellenőrző kérdés minden darabnál:** *„Ez mit csinál egymilliárd e-embernél?"*
Ha a válasz **„akkor majd kicseréljük"** — a darab **nincs kész**.

---

## 2. A FÜGGŐSÉGI SORREND — és hogyan fér össze a D17-tel

⚠️ **Látszólagos ellentmondás.** A **D17** azt mondja: *„az identitás-réteg nem egy a
részrendszerek közül, hanem a gerinc, amin az összes többi áll — tehát elsőként kell
állnia."* Az alábbi sorrendben mégis a **harmadik** helyen áll.

**A feloldás:** az identitás **a bizalom gerince**, nem a *program* gerince. Az azonosság
maga is **aláírt eseményekből** áll, amiket a tár tárol és a csere továbbít — vagyis az
esemény-hordozó **az identitás ALATT van**. Ha a hordozó rossz, az identitás-réteg örökli a
hibát.

> **A D17 helyes olvasata:** az identitásnak azelőtt kell állnia, hogy **bármi a bizalomra
> épülne** — vagyis a valódi szavazás és a pénz előtt. Nem az esemény-hordozó előtt.

```
   A HORDOZÓ          →   AZ IDENTITÁS      →   AMI A BIZALOMRA ÉPÜL
   esemény alakja         tanúsítás              valódi szavazás
   tár-illesztés          távolság-szabály       pénz
   csere, elérés          tartós mag             nagy tétű döntések
```

---

## 3. HOL TARTUNK VALÓJÁBAN — őszinte leltár

### ✅ Ami kész és megmarad

| Mi | Állapot |
|---|---|
| **A domain-logika** — tudatpont, javaslat, szavazás, küszöbök, egyezmény mint **számítás** | ✅ kész, és **nem változik** |
| **A szabály-réteg** (`szabalyok.js`), a determinizmus, az egész aritmetika | ✅ kész |
| **A szállítás** — TCP, UDP, **pajzsfúrás CGNAT-on át**, kapunyitás, postaláda, helyi felfedezés, társ-lista | ✅ kész, **és érintetlen marad** |
| 217 önpróba | ✅ |

> ⭐ **A szállítás azért marad érintetlen, mert az 1. szabályt betartottuk.** A
> `csere.js` sosem importált hálózati kódot, ezért az entitás-szintű átállás a
> **logikát** írja át, nem a drótot. A legnehezebben megszerzett darab — hogy két
> hétköznapi otthoni hálózat CGNAT mögül összeér — **megmarad.**

### 🔧 Ami átalakul (nem vész el, de átíródik)

| Mi | Miért |
|---|---|
| `fajlTar.js` — a tár-**illesztés** | a `betolt()` mindent ad → ⛔ a 9. szabály elkapja |
| `esemenyTar.js` — a mentési út | minden mentés végigolvassa a fájlt (mérve: **495 ms** 100k-nál) |
| `csere.js` — a csere **logikája** | koino-szintű → **entitás-szintű** |
| `vonal.js` — a **párbeszéd** (nem a foglalat) | az új üzenet-sorrend miatt |
| `allapotSzamitas.js` — `agMeretSzamitasa` | négyzetes (mérve: **4,6 mp** 100k-nál) |

### ❌ Ami még sehol nincs

identitás-réteg · tartós mag · felület · kereső-réteg · pénz

---

## 4. A SZAKASZOK — újrarendezve

| # | Szakasz | Állapot | Mire jó |
|---|---|---|---|
| **1** | **A helyi modell** — esemény, lánc, állapot, szabály, javaslat | ✅ **kész** | a koino gondolkodása |
| **2** | **A szállítás** — hogy két készülék egyáltalán összeérjen | ✅ **kész** | ⭐ *(A neve eddig „csere" volt; a munka valójában a szállításról szólt, és az elkészült.)* |
| **3** | **A SZERKEZET** — az esemény alakja, a tár illesztése, az elérés | ✅ **kész** (2026-09-03) | ettől lett a koino skálázható **szerkezetében** |
| **4** | **AZ IDENTITÁS** — ⭐ **két lépcsős beléptetés**, kontraszt-jelzés, visszavonás, bemutatkozás ([terv](szakasz4_terv.md) 9/c) | ✅ **megépítve** (2026-09-06) | ettől lesz **hiteles** |
| **5** | **A FELÜLET** — a pakli és a belépő tér a prototípusból | ❌ | ettől lesz **használható** |
| **6** | **A KERESŐ-RÉTEG** — elosztott, replikált mutató | ❌ | ⭐ **elhagyható** (2. szabály) |
| **7** | **A PÉNZ** | ❌ | D11: csak bizonyított identitás után |

---

## 5. ⭐ AZ ELSŐ VALÓDI HASZNÁLAT — és miért nem sérti a 9. szabályt

A kilencedik szabály azt tiltja, hogy **rossz szerkezettel** induljunk. Azt **nem** tiltja,
hogy **kevés emberrel** induljunk — sőt a D22 pont ezt mondja: *„az első kiadás is milliárdra
képes program, csak kevesebb emberrel."*

És van egy döntés, ami ezt kifejezetten megengedi — a **D18/0**:

> | Méret | Mi véd |
> |---|---|
> | **Kicsi** | ⭐ **közvetlen ismeret** — *tudod, ki valódi, mert ismered. **Nem kell rendszer.*** |
> | Nagy | a gráf szerkezete |
> | Közepes | 🔴 egyik sem |

**Ebből következik az első valódi mérföldkő:**

> ### 🎯 EGY CSALÁD VAGY EGY OSZTÁLY, ÉLESBEN — a Szakasz 3 + egy minimális felület után
>
> Kis közösségben az identitás-réteg **nem hiányzik, hanem nem is kell** (D18/0). A szerkezet
> viszont már milliárdos: entitás-központú tár, entitás-szintű csere, helyes kanonikus alak.
> **Ez nem „ideiglenes verzió, amit majd kicserélünk" — ez ugyanaz a program, kevesebb
> emberrel.**
>
> ⚠️ **Egy feltétellel:** ez a koino **ne kapcsoljon be olyan képességet**, amit egy tucat
> hamis azonosság eldönthetne (D11/D17 közepes zóna). Kicsiben ez természetes; a szigorítás
> a növekedéssel jön.

---

## 6. AMIT TUDATOSAN KIHAGYUNK — és meddig

| Mi | Miért halasztható | Meddig |
|---|---|---|
| **Kereső-réteg** | ⭐ a 2. szabály szerint **elhagyható**: nélküle kevesebbet találsz, de minden működik | a Szakasz 6-ig |
| **Téma szerinti keresés** | Csaba döntése: **elég a cím szerinti** | ⛔ **soha** — kihagyva |
| **Pénz** | D11: csak bizonyított identitás-réteg után | a Szakasz 7-ig |
| **DHT / bizalmi hálós útvonal** | a keresőhöz kell, és **méréssel** dől el (K7) | a Szakasz 6-ig |
| **Tömeges entitás (összegző Merkle)** | ugyanaz a kód, mint a tartós magé | a Szakasz 4-gyel együtt |
| **Böngésző** | D29: kliens lehet, előfeltétel soha | — |

---

## 6/b. ✅ A 3.1 KÉSZ (2026-09-03) — *(a felfüggesztés története alább)*

> **A kanonikus alak bővítése megvan**, mind a négy mezővel: `entitas` · `entitasSorszam` ·
> `latott` · `lancGyoker` *(lefoglalt hely)*. Plusz a `szelet()` szabály, a tár három új
> lekérdezése (`entitasEsemenyei`, `kovetkezoEntitasSorszam`, `horgonyok`), a `muveletek.js`
> hat művelete és a `szabalyok.js` **D42-ellenőrzése** a harmadik kategóriával
> („nem ellenőrizhető").
>
> **203 önpróba rendben** (198 + 5 új). ⭐ A próba-segéd (`ujEember`) **egy helyen** tanulta
> meg az új mezőket — ezért kellett egyetlen javítás ahhoz, hogy a 198 régi próba újra
> átmenjen. *(Ez maga is a szerkezet dicsérete: ha a próbák másolták volna a szabályt,
> kilenc fájlt kellett volna átírni.)*
>
> Az ár mérve: **478 → 611 bájt** eseményenként (+28%) — lásd a 7. szakaszt.

<details><summary>⏸️ A felfüggesztés története (2026-09-02)</summary>

*Csaba a pihenőidő alatt írt gondolatai
([`pihenosIdoAlattiGondolatok.md`](pihenosIdoAlattiGondolatok.md)) olyan irányt hoztak, ami a
Szakasz 3 lépéseit is átrendezi. A 3.1 félbehagyva áll — a kód a munkafában van, nem
commitolva.*

**Ami a 3.1-ből MÁR MEGVAN (a kódban, commit nélkül):**

- a burkolat három új mezője (`entitas`, `entitasSorszam`, `latott`) az `esemeny.js`-ben,
  a `szelet()` szabállyal együtt;
- a tár lekérdezései: `entitasEsemenyei`, `kovetkezoEntitasSorszam`, `horgonyok`;
- a `muveletek.js` mind a hat művelete kitölti a mezőket, a tudatpont-rendezés pedig a
  D42 `adat.kiosztva` értékét is;
- a `szabalyok.js` D42-ellenőrzése, a harmadik kategóriával együtt („nem ellenőrizhető").

**Ami hátra van:** az önpróbák igazítása (a régi alakú események elbuknak — szándékosan),
rontás-próbák a bemondott összegre, és a `skalaMeres.js` újrafuttatása a bővített alakkal.

⚠️ **Miért nem baj a felfüggesztés:** a 3.1 a **kanonikus alakot** rendezi, és épp most derült
ki, hogy a keret-ellenőrzés a szeletelt világban **másképp is kiegészül** (összegző Merkle-fa
a saját láncon — lásd lent). Jobb egyszerre bevinni, mint kétszer bontani fel a legveszélyesebb
részletet.

*(Így is lett: a felfüggesztés alatt született meg a negyedik mező — a `lancGyoker` lefoglalt
helye —, tehát a kanonikus alakot **egyszer** kellett felbontani, nem kétszer.)*

</details>

---

## 6/c. 🎉 AZ ÚJ IRÁNY: A BULI — összehangolt ablak (Csaba, 2026-09-02)

*Ez már szerepelt egyszer (D40 környéke, „az ébredés legyen összehangolt"), de eddig
**energia-kérdésként**. Csaba füzete kimondja, hogy sokkal több annál.*

> *„Az, hogy 1 adott időben szinte az egész közösség jelen van, bebiztosítja a maximális
> elérhetőséget az eszközök között, és még energiatakarékos is."*

**Amit ez átír a tervben:** a [`skalazas_terv.md`](skalazas_terv.md) 4.5 szakasza azt mondja,
hogy *„a készülékek nagy része nem fogadóképes"* (D40/D41). ⭐ **Az összehangolt ablakban ez
nem igaz** — mert mindenki egyszerre kopog kifelé, tehát a rések egyszerre nyílnak. Az
elérhetőség nem a készülék tulajdonsága, hanem **az ablaké**.

**Az ár, amit Csaba vállal:** nincs folyamatos, friss böngészés. Az első betöltésnél várni
kell egy kört; utána offline is látszik minden, **színes dátummal jelezve, mikor frissült
utoljára**. Ez tudatos csere, nem hiány.

**És egy hiányzó darab, amit a füzet nevez meg — a KÉRELMEZÉSEK ADATCSOPORTJA:** a program
jegyezze fel, mit akart a böngésző megnézni, és ez a lista terjedjen. Ekkor a buli alatt
**mindkét fél tudja, ki felé kell fúrnia** — a kérelmező is, és az is, akinél az entitás van.
⭐ Enélkül a böngésző-lekérés csak reménykedés; ezzel **célzott**.

**Frissítési ütem — ✅ ELDÖNTVE (Csaba, 2026-09-02): ÖT PERC.** A füzet még percenkéntit írt;
a kérdés az volt, hogy a percenkénti ablak nagyságrendekkel sűrűbb, mint amire az 5. szabályt
(*„ne épüljön folyamatos kapcsolatra"*) írtuk. Csaba döntése: **legyen öt percenként** — ezzel
a szabály és az ütem megfér egymással, és ez egybeesik azzal, amit az `orjarat` ma is csinál.
⚠️ A napi szinkron mint elegendő ütem továbbra sem áll; bárki állíthat a saját készülékén
ritkábbat, de az alapütem öt perc.

⚠️ **És ebből következik egy kemény kötés:** öt percenként **288 kör naponta**. Egy csendes
kör 334 bájt (mérve), tehát ha nincs újdonság, ez napi ~96 KB — semmi. **De ha a kör
visszaesik a teljes ÁLLÁS-ra** (mérve: 160 KB száztizezer eseménynél), akkor **napi 46 MB**,
havi ~1,4 GB — és ez a mobilos e-ember számlája, vagyis **befogadási kérdés** (D35).
⭐ **Tehát az ötperces ütem CSAK entitás-szintű cserével engedhető meg** — ez köti össze
Csaba ütem-döntését a Szakasz 3 munkájával.

---

### ✅ ÉS A LEGSÜRGŐSEBB ISMERETLEN MEGMÉRVE (2026-09-03)

*A buli legkeményebb pontjának azt neveztük, hogy a mobil operációs rendszerek korlátozzák a
háttérébresztést. Megmértük — [`eredmenyek.md`](../koino/meres/eredmenyek.md).*

| szünet | ébredés csúszása | csere |
|---|---|---|
| 1 perc | **0 mp** | ✅ 610 B, 149 ms |
| 5 perc | **0 mp** | ✅ 610 B, 554 ms |
| **60 perc** | **0 mp** | ✅ 610 B, 339 ms |

⭐ **Egy óra alvás után nulla csúszás, és a csere azonnal ment.** A Doze nem ütemezett át, a
wifi visszatért, a folyamat túlélt. **Az ötperces ablak ára 176 KB/nap** — a D35 befogadási
aggálya a csendes esetre **nem áll**.

⚠️ **Amit nem bizonyít:** a Termux tartós értesítést és részleges ébrentartót használ, tehát
valószínűleg **előtér-szolgáltatást** mértünk, nem háttérben alvó alkalmazást.
⭐ **Ez tervezési következtetés, nem hiba:** az androidos koino is így fog futni — látható
értesítéssel —, és **ilyen feltételek mellett a buli tartható**.

⚠️ **A négyórás lépés ÉRVÉNYTELEN lett** (a mérés közben megnyitottuk a Termuxot, amitől a
rendszer aktívnak vette a folyamatot) — **a hosszú alvás kérdése tehát nyitva maradt**. Az
egyórás lépés viszont elég a folytatáshoz: ötperces ablaknál a kérdés úgyis az, bír-e öt
percet — és bír egy órát is.

---

## 7. A KÖVETKEZŐ HÁROM LÉPÉS — konkrétan

*(Részletek és mérési mód: [`skalazas_terv.md`](skalazas_terv.md) 8. szakasz.)*

### 3.1 ⛔ A KANONIKUS ALAK BŐVÍTÉSE — **ez a legidőérzékenyebb az egész tervben**

Három mező, egyszerre, amíg **9 valódi esemény** van a tárban:

| Mező | Mit old meg |
|---|---|
| `kiosztva` | **H4** — a tudatpont-keret **egy eseményből** ellenőrizhető (D42) |
| `entitasSorszam` | **H3** — a hézag újra jel lesz, miután szeleteltünk |
| `latott` *(a határidőt mozgató eseményeken)* | **H7** — a visszadátumozás bizonyíthatóvá válik |
| `lancGyoker` | ⏸️ **lefoglalt hely**, mindig `null` — a jelentése a Szakasz 4-ben dől el |

> ### ✅ MEGÉPÍTVE ÉS MEGMÉRVE (2026-09-03)
>
> Mind a négy mező a helyén, **203 önpróba rendben** (198 + 5 új rontás-próba a D42-re).
> ⭐ A legfontosabb, amit bizonyítanak: *a hazug bemondás lelepleződik* — két saját aláírt
> esemény ellentmond egymásnak —, **de hézag esetén nem vád, hanem jelzés**, mert akkor a
> hiány a MI lemaradásunk, nem az ő hazugsága.
>
> ⚠️ **AZ ÁR NAGYOBB, MINT A BECSLÉS VOLT:** Claude **+11%**-ot mondott, a mérés **+28%** —
> az esemény **478 → 611 bájt**. *(A becslés csak a `latott` szűkítésével számolt, és
> elfelejtette, hogy az `entitas` (~55 B), az `entitasSorszam` (~19 B) és a `lancGyoker`
> (~18 B) **minden eseményen** ott van.)*
>
> **Amit érint és amit nem:** a tár 28%-kal nő · az **ÁLLÁS 164 B/e-ember maradt** ·
> a **csendes kör ára változatlan** (az nem visz eseményt).
> ⭐ **Így is megéri:** e mezők nélkül a szeletelt koino sem a keretet, sem a hézagot nem
> tudná ellenőrizni — a 28% nem kényelem, hanem **a hitelesség ára**.

**Mérés:** rontás-próbák — az elhallgatott esemény **kimutatható ellentmondássá** válik-e.

### 3.2 ✅ A TÁR-ILLESZTŐ SZELETELHETŐ (2026-09-03)

A `betolt()` helyett **kérdezhető** felület: `esemeny(azonosito)` · `szerzoLanca(szerzo)` ·
`szeletEsemenyei(entitas)` · `sorszamSzerint(szerzo, n)`. A `betolt()` megmaradt — a próbák
és a kis koino állapotszámítása jogosan hívja —, de **a hétköznapi műveletek közül egyetlen
sem**. ⭐ *Ez volt az illesztés helyessége, nem a teljesítmény: a gyorsítótár csak a rossz
kérdést gyorsította volna.*

Mögötte **memóriában tartott mutató** — a legegyszerűbb megvalósítás, ami a helyes kérdéseket
ki tudja szolgálni. A mélység (lemezre írt index) később cserélhető, **a hívók változtatása
nélkül**.

> ### ⭐⭐ ÉS EZZEL A KÉT MÉRT FAL LEDŐLT
>
> | | előtte | utána |
> |---|---|---|
> | `esemenyMentese` (1 db, 100k táron) | **495 ms** | **1,4 ms** — és **lapos**, nem nő a mérettel |
> | `allapotSzamitasa` (100k) | **4 615 ms** | **502 ms** — és **lineáris** (10× adat → 11× idő) |
>
> Az elsőt a kérdezhető illesztés oldotta meg (a mentés már nem olvassa végig a tárat), a
> másodikat az **`agMeretSzamitasa`** átírása: levelektől felfelé, egy menetben — ⭐ ami
> mellesleg egy rejtett veszélyt is megszüntetett, mert egy **körbe mutató szülő-lánc** a
> régi, rekurzív változatot végtelen rekurzióba vitte volna.
>
> ⚠️ **Egy tétel nem tűnt el, csak áthelyeződött:** a tár **megnyitása** most építi a
> mutatót (859 ms 100k-nál) — **futásonként egyszer**, nem műveletenként. Külön mérjük,
> mert enélkül a javulás félrevezető lenne.

### 3.4 ✅ A CÍMJEGYZÉK AZ ENTITÁSON ÉS A BÖNGÉSZŐ-LEKÉRÉS (2026-09-03)

*Ez az, ami Csaba eredeti kifogására válaszol: „böngészés közben az összes entitásnak
elérhetőnek kell lennie."*

**A szelet-címjegyzék** (`tarsak.js`): „kinél van ez az entitás?" — a társ-listától külön,
mert más a természete (az **készülék-szintű és tartós**, ez **entitás-szintű és múlandó**).
⭐ **Név nélkül** (csak cím, port, idő — D6), **elévüléssel** (egy nap), és
**szeletenként legfeljebb 20 címmel**, hogy ne hízzon korlátlanul.

**A böngésző-lekérés** (`szeletHozatala`): új protokoll-kérdés, `SZELETKEREK` → `ESEMENY × N`
→ `KESZ`. ⭐ **Visszafelé kompatibilis:** a párbeszéd szimmetrikus, mindkét fél
`LENYOMAT`-tal kezd — egy régi kliens tehát sosem küld ilyet, és a régi kód nem változik.
⚠️ A kapott események **ugyanazon az `esemenyMentese` kapun** mennek be (3. szabály).

**A `hozd` parancs**: megkérdezi sorban a szelet-jegyzékben ismert címeket, aztán a társakat;
⭐ **egy elérhetetlen cím nem hiba, hanem a normális működés** (D33) — megy tovább. Ha
egyik sem válaszol, az őszinte válasz: *„jelenleg nem elérhető"* — és kimondja azt is, hogy
kívülről nem lehet megkülönböztetni a „már senki nem tartja" esetet (D14) az „alszanak"
esettől.

**Mérve, valódi két-tárolós próbával:** a lekérés **csak a kért szeletet hozta** (2 esemény),
a másik entitásból semmit; másodszorra 2 érkezett, de **0 új** (a kapu felismerte); és a
rendes csere változatlanul működik. **217 önpróba rendben** (203 + 14).

⚠️ **Egy ismert viselkedés:** a szelet-lekérés **az entitást hozza, nem a környezetet** — ha
a koino-létrehozás eseménye nincs meg, a készülék azt mondja, „még nincs koinód". A
gyakorlatban ez nem gond (böngészni azon belül szoktunk), de tudni kell róla.

### 3.3 ⏸️ AZ ENTITÁS-KÖZPONTÚ TÁR — elhalasztva (2026-09-03)

> ⏸️ **A 3.2 után ez már MÉLYSÉG, nem szerkezet.** Az illesztés kérdezhető, a mérés pedig
> nem követeli a lemez-szintű szeletelést: a mentés lapos, az állapotszámítás lineáris.
> A **9. szabály teljesül** — a szerkezet engedi, a megvalósítás egyszerű marad —, tehát ez
> akkor jön, ha egy mérés megmondja, hogy kell. *(Az eredeti leírás alább.)*

#### Az eredeti terv

Entitásonként külön tár + a saját lánc külön. Mögötte **a legegyszerűbb megvalósítás** jó.

**Mérés:** ugyanaz a `skalaMeres.js`, összevetve a mai számokkal — a mentés ideje ne nőjön
a koino méretével.

*(Mellékesen, karbantartásként: `agMeretSzamitasa` lineárissá tétele.)*

---

## 8. NYITOTT DÖNTÉSEK, amik ezt a sorrendet érintik

| # | Kérdés | Hol |
|---|---|---|
| **K3, K4** | `entitasSorszam` és `latott` bekerüljön-e a kanonikus alakba? | ⛔ **a 3.1 ezen áll** — skalazas_terv 9. |
| **K10** | láthatósági küszöb a keresőn | Szakasz 6 |
| **K7** | DHT vagy bizalmi hálós útvonal | Szakasz 6, **méréssel** |
| **—** | a **születéskori tanúsítás-öröklés** csak szétváláskor, vagy szándékos alapításnál is? | ⏸️ Csaba: *„maradhat későbbre"* — Szakasz 4 |
| **—** | ⚠️ **mi a felület futtatókörnyezete?** A D29 szerint a koino önálló program, nem böngésző — de a felület a prototípus böngészős paklijából öröklődik. Helyi kiszolgáló + böngésző mint kliens (7. szabály engedi), vagy natív felület? | **Szakasz 5, eldöntetlen** |

---

## Napló

- **2026-08-31** — A dokumentum létrejött. Kiváltó ok: a két réteg, az entitás-központúság,
  az S1 mérés és a **kilencedik szabály**. A Szakasz 2 átnevezve („csere" → **„szállítás"**),
  mert a munka valójában arról szólt és elkészült; új **Szakasz 3: A SZERKEZET** ékelődött be
  az identitás elé, a 2. szakaszban levezetett okból.
