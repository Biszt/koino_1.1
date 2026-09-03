# ÚTITERV — mit építünk, milyen sorrendben, és miért

*Létrehozva: 2026-08-31, Csaba kérésére, a skálázási terv és az S1 mérés után.*

> **Mi ez a dokumentum, és mi nem?**
> A [`fejlesztesi_terv_fazis2.md`](fejlesztesi_terv_fazis2.md) a **döntések** helye (D1–D42),
> a szakasz-tervek az egyes szakaszok **részletei**, a [`skalazas_terv.md`](skalazas_terv.md)
> a **szerkezet**. Ez itt a **sorrend**: mi következik mi után, és miből mennyi kell.
> Rövidnek kell maradnia — ha hosszú lesz, valamit rossz helyre írtunk.

---

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
| 198 önpróba | ✅ |

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
| **3** | ⛔ **A SZERKEZET** — az esemény alakja, a tár illesztése, az entitás-központúság, az elérés | 🚧 **most ez jön** | ettől lesz a koino skálázható **szerkezetében** |
| **4** | **AZ IDENTITÁS** — tanúsítás, távolság-szabály, tartós mag | ❌ | ettől lesz **hiteles** |
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

## 6/b. ⏸️ A 3.1 FELFÜGGESZTVE (2026-09-02) — és miért nem baj

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

## 7. A KÖVETKEZŐ HÁROM LÉPÉS — konkrétan

*(Részletek és mérési mód: [`skalazas_terv.md`](skalazas_terv.md) 8. szakasz.)*

### 3.1 ⛔ A KANONIKUS ALAK BŐVÍTÉSE — **ez a legidőérzékenyebb az egész tervben**

Három mező, egyszerre, amíg **9 valódi esemény** van a tárban:

| Mező | Mit old meg |
|---|---|
| `kiosztva` | **H4** — a tudatpont-keret **egy eseményből** ellenőrizhető (D42) |
| `entitasSorszam` | **H3** — a hézag újra jel lesz, miután szeleteltünk |
| `latott` *(csak a `Szavazat`-on)* | **H7** — a visszadátumozás bizonyíthatóvá válik; így az ár +31% helyett **~+11%** |

**Mérés:** rontás-próbák — az elhallgatott esemény **kimutatható ellentmondássá** válik-e.

### 3.2 ⛔ A TÁR-ILLESZTŐ SZELETELHETŐVÉ TÉTELE

A `betolt()` helyett **kérdezhető** felület: `entitasEsemenyei()`, `szerzoLanca()`,
`tartomany()`. ⭐ **Ez az illesztés helyessége, nem teljesítmény** — a gyorsítótár csak a
rossz kérdést gyorsítaná.

**Mérés:** a betöltött bájt a **kért szelettel** arányos-e (ma: az egész fájllal).

### 3.3 AZ ENTITÁS-KÖZPONTÚ TÁR

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
