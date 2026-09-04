# SZAKASZ 4 — AZ IDENTITÁS

*Létrehozva: 2026-09-04, a Szakasz 3 lezárása után, Csabával közösen végigbeszélve.*

> **Mi ez a dokumentum, és mi nem?**
> A [`fejlesztesi_terv_fazis2.md`](fejlesztesi_terv_fazis2.md) a **döntések** helye (D1–D42),
> az [`utiterv.md`](utiterv.md) a **sorrendé**, a [`skalazas_terv.md`](skalazas_terv.md) a
> **szerkezeté**. Ez itt a Szakasz 4 **részlete**: hogyan lesz a koinónak olyan
> bizalmi hálója, ami az első naptól milliárdos.
> ⚠️ **Kód még nincs.** Ez tervezés — a lezárt döntések alább külön szakaszban állnak, és
> **át kell vezetni őket D43–D49-ként** a fázis-2 tervbe.

---

> ## ▶️ HOL TARTUNK (2026-09-04)
>
> ✅ **Ami áll:** a belépés **alsó korlát**, nem lefedettség (D43) · ⭐ **a keret Csaba
> szabálya** (D44): *annyi tanúsítást adhatsz, amennyivel a minimum fölött vagy* — ez
> **megöli a „fizess egyszer, arass örökké" támadást**, mert a friss belépő kerete nulla ·
> **nincs időszak** (K11) · a paraméterek **befagynak** az aláírás pillanatában (D47) · a
> visszavonás helyett **bizonytalanra jelölés + gondolat** (D46) · az igazolvány soha nem
> rögzíthető (D45) · a **tanúsító találkozó** a szokásos út.
>
> ⛔ **ÉS AMI KIDERÜLT (2026-09-04, 5.1/c): A GAZDASÁG ÖNMAGÁBAN NEM LEHET A VÉDELEM.**
> Ha a keret megmaradó, a közösség **nem tud nőni**; ha teremthető, **a sziget is teremt** —
> mert *a számtan nem látja a különbséget valódi és hamis ember között*. A keret tehát
> **fék és ütemszabályzó**, nem a Sybil-korlát hordozója.
>
> ⏳ **A szakasz fő kérdése ezért most:** ⛔ **K12 — a horgony-halmaz** és ⛔ **K13 — az
> út-feltétel**, vagyis **a szerkezet**. *(Az „talán nem kell horgony" mondat visszavonva.)*
> Mellettük: a bekapcsolási méret (K14) és a pótutak (K15).
>
> ▶️ **A következő munka:** ⭐ **szimuláció, ne érvelés.** Írjuk meg a támadó-szimulátort
> (10. szakasz), és **mérjük meg**, hol a szikla — a fenti két bukást is a számolás hozta
> ki, nem a megérzés. *(Mérj, ne saccolj.)*

---

## 1. MIÉRT EZ A SZAKASZ A GERINC

A **D17** mondata: *a konszenzus biztonsága = az identitás-réteg biztonsága, semmi más.*
A [`skalazas_terv.md`](skalazas_terv.md) 10. szakasza ezt még élesebben mondja ki:

> **Ha az identitás-réteg megtörik, minden eddigi munka egy hatékonyan skálázódó
> hamisítás-gépezet.**

A Szakasz 1–3 azt építette meg, hogy az események **hamisíthatatlanul** terjedjenek és
**azonos állapotra** vezessenek. Egyik sem kérdezi meg, hogy **a szerző valódi ember-e**.
Ezer kulcsot bárki legyárt egy délután alatt, és a mai koino mind az ezret ugyanolyan
komolyan veszi.

---

## 2. A KÖVETELMÉNY — a 9. szabály az identitásra alkalmazva

🔍 *„Ez mit csinál egymilliárd e-embernél?"* Az identitás-rétegnél ez **három** egyidejű
követelménnyé bomlik, és a nehézség az, hogy mind a három egyszerre kell:

1. ⛔ **Objektív** — minden készülék **ugyanarra** jusson. Ha nálad valódi vagyok, nálam meg
   nem, akkor a szavazatszámlálás készülékenként mást ad, és megdől az, amit a
   `vizsgaProba.js` a Szakasz 2 vizsgájaként bizonyít (⭐⭐ *azonos állapot*).
2. ⛔ **Offline eldönthető** — ⭐ *ami DÖNT valamiről, az soha ne kívánjon élő lekérdezést.*
   Az identitás mindenről dönt, tehát ez rá a legszigorúbban áll.
3. ⛔ **Korlátos munka** — az ellenőrzés ideje ne függjön a közösség méretétől.

### ⚠️ Amit ez elkap: a Duniter-féle távolság-szabály nem skálázik

A **D18/2** helyesen jelölte ki a védelem magvát — *„a darabszám hamisítható, a pozíció
nem"* —, de a hozzá felírt Duniter-alak két **globális számot** kíván:

- *„a referens tagok legalább 80%-a 6 lépésen belül"* → ismerni kell a **teljes**
  referens-halmazt;
- *„N^(1/5)"* → ismerni kell **N**-et, az összes tag számát.

Egymilliárdnál egyik sincs meg egyetlen készüléken sem, és a válasz nem lehet az, hogy
„majd lekérdezzük". **A darab tehát nincs kész** — ezért kellett újratervezni.

---

## 3. A FELFEDEZÉS: a bizonyíthatóság iránya nem szimmetrikus

Ez az egész szakasz sarka, és minden más ebből következik:

> ⭐⭐ **Az elérhetőség pozitívan, kis csomagban bizonyítható. A lefedettség nem.**

Ha azt állítom, hogy *„tőled hozzám vezet egy 5 lépéses tanúsítási út"*, azt **oda tudom
adni**: öt aláírt esemény, egymás után. Bárki ellenőrzi, offline, ugyanazzal az
eredménnyel. Ez **bizonyíték-alakú**.

Ha azt állítom, hogy *„elérem a tagok 80%-át"*, azt **nem tudom odaadni** — ahhoz a
másiknak ismernie kellene az egész halmazt. Ez **lekérdezés-alakú**, tehát a koinóban
használhatatlan.

> ### ✅ D43 (javasolt) — A BELÉPÉSI SZABÁLY ALSÓ KORLÁT, SOHA NEM LEFEDETTSÉG
>
> Minden identitás-szabályt úgy kell megfogalmazni, hogy **a teljesülése** legyen a
> bizonyítandó, ne a hiánya. *(Csaba: „igen", 2026-09-03.)*

---

## 4. ⭐⭐ A MAG: A KERET — Csaba szabálya

> **Annyi tanúsítást adhatsz, amennyivel a kapott tanúsításaid száma a belépési minimum
> fölött van.** *(Csaba, 2026-09-04.)*
>
> `keret(X) = kapott(X) − k − eddig_adott(X)`, nullára padlózva.

Ez a szabály önmagában megoldja azt, amin a korábbi javaslat elbukott.

### 4.1 Mi bukott el korábban

A javaslat ez volt: *„legalább `k` csúcs-diszjunkt út vezessen hozzád **már felvett
e-emberektől**."* A támadó ezt így kerüli meg (`k = 5`):

- **1. kör:** öt valódi ember tanúsítja Hamis #1-et. Bejut. **És ettől ő maga is felvett tag.**
- **2. kör:** Hamis #2-nek négy valódi kell + Hamis #1. **3. kör:** három valódi + két hamis.
  **4. kör:** kettő + három. **5. kör:** egy + négy.
- **6. kör:** Hamis #1–#5 tanúsítja Hamis #6-ot — **egyetlen valódi ember sem kell többé.**

⚠️ **Az igazi baj nem az, hogy az él olcsó, hanem hogy az árat EGYSZER kell megfizetni.**
15 tanúsítás öt embertől → **korlátlan** hamis azonosság. A diszjunktság ugyanis **egy
bizonyításon belül** tilt közös embert, a bizonyítások **között** nem — ugyanaz az öt
ember újra és újra eladható.

### 4.2 Mit csinál ezzel a keret

A frissen felvett e-embernek **pontosan `k` tanúsítása van, tehát a kerete 0.** Nem
tanúsíthat senkit.

⭐ **Ezzel a 6. kör meg sem születik**, és a 2. kör is elhal: Hamis #2-nek megint öt
valódi ember kell. **Csak az tud beengedni valakit, akit a közösség a szükségesnél
jobban ismer.**

### 4.3 És ebből általános korlát következik

Legyen `g` az összes tanúsítás, amit becsületes emberek adtak a szigetnek, `f` a hamis
azonosságok száma, `I` pedig amit egymásnak adtak.

- Minden hamisnak legalább `k` kapott tanúsítás kell: `g + I ≥ k·f`.
- Amit egymásnak adhatnak, az a saját keretükből megy: `I ≤ (g + I) − k·f`.
- A két egyenlőtlenségből az `I` kiesik:

> ### ⭐⭐ `f ≤ g / k`
>
> *A hamis azonosságok száma legfeljebb annyi, ahány becsületes tanúsítást a sziget
> összeszedett, osztva a belépési minimummal.*

Öt ember, fejenként 3 kerettel = 15 tanúsítás → **három** hamis azonosság, nem végtelen.
**Az ár lineáris lett:** minden újabb hamis ember újabb valódi embereket kíván.

⚠️ **Ez levezetés, nem mérés.** Amíg a 7. szakasz rontás-próbái le nem futottak, ez
állítás marad. *(Rokon szakirodalom: SybilLimit / SybilGuard — a becsületes és a hamis
tartomány közti ritka vágás; Whānau. Ellenőrizendő, mielőtt bármit építünk.)*

### 4.4 Három dolog, amit ingyen megold

- ⛔ ~~**Talán nem kell horgony-halmaz.**~~ **VISSZAVONVA még aznap** — lásd az 5.1/c-t: a
  gazdaság önmagában nem tud különbséget tenni valódi és hamis ember között, tehát a
  szerkezet (horgony, út-feltétel) **kell**. *A hiba oka: a `f ≤ g/k` levezetés a megmaradó
  esetre igaz, és én a növekedést engedő esetre is átvittem, holott ott nem áll.*
- ⭐ **Nem kell időalapú érési idő.** A friss e-ember **vár, de nem időt, hanem
  elismerést**: ahogy a közösség megismeri és többen tanúsítják, úgy nyílik ki a kerete.
  Ez jobb egy naptári határidőnél, mert nem büntet senkit, aki tényleg beilleszkedett.
- ⭐ **A kölcsönös gyűrű nem termel semmit.** Ha ketten tanúsítják egymást, mindkettőnek nő
  eggyel a kapott és eggyel az adott — **nettó nulla**. A keret nem teremthető, csak
  áramlik. Ez zárja be azt a rést, amit a „több tanúsítás = több jog" gondolat általában
  megnyit.

> ### ✅ D44 (javasolt) — A TANÚSÍTÁSI KERET = A MINIMUM FELETTI TANÚSÍTÁSOK SZÁMA
>
> A tanúsítás nem teremt jogot, hanem **továbbít**. Aki ad, elkölti; aki kap, gyarapszik.
> A frissen felvett kerete nulla.

---

## 5. AZ ÁRA — amit vállalunk

### 5.1 ⛔ A MEGMARADÁSI CSAPDA — és a feloldása

> ⚠️ **Ez a szakasz először hibásan állt: „a növekedés önfinanszírozó".** Nem az. A hibát
> a `k` emelésének átszámolása hozta felszínre (2026-09-04). **Megőrizve, mert a hiba
> alakja tanulság: az összeadást el kell végezni, nem elég, hogy jól hangzik.**

**A bizonyítás két sorban.** Minden tanúsításnak pontosan egy adója és egy kapója van,
tehát az összes kapott = az összes adott. Ha a keret „kapott − `k` − adott", és ezt
mindenkire összeadjuk:

> `(összes kapott) − k·N − (összes adott) = −k·N`

⛔ **A közösség összes kerete mindig negatív** — a szabály így egyszerre nem teljesülhet
mindenkire. A gyakorlatban: az alapító kör véges készlettel indul, ami felvételenként `k`-val
fogy, és **soha nem termelődik újra**. A növekedés néhány száz főnél megáll, örökre.

### ⭐ A kérdés, ami mindent eldönt

Két külön dolgot hívtunk ugyanazon a néven:

- **a támogatás** — az a `k` tanúsítás, ami egy **új** embert beenged;
- **az elismerés** — amikor egy találkozón tanúsítom azt, aki **már tag**.

Ha az elismerés is fogyaszt keretet → a fenti csapda, nincs növekedés. Ha az elismerés
ingyen van → a hamis sziget is **ingyen hizlalja magát** (öt bejutott hamis egymást
elismerve keretet gyárt, abból újakat vesz fel — négyzetesen elszáll).

> ### ⛔ D48 (javasolt volt) — ELVETVE, MÉG AZNAP
>
> **A javaslat ez volt:** *az elismerés (egy már felvett tag tanúsítása) nem fogyaszt
> keretet — de csak akkor számít bele a tanúsított keretébe, ha a tanúnak magának is van
> pozitív kerete.* A becsületes oldalon működik: Béla `k = 5`-tel jön be nulla kerettel,
> egy találkozón ötven megállapodott tag elismeri → a kerete 50 lesz.
>
> ⛔ **De a gát nem lejtő, hanem SZIKLA.** Öt korrumpált, megállapodott ember elismeri
> Hamis #1-et → annak kerete 5, tehát **pozitív** → ettől kezdve **Hamis #1 elismerése is
> számít**, és mivel ingyen van, elismeri a testvéreit, azok egymást, és az egész sziget
> kerete felszalad. **Öt korrumpált ember elég az összeomláshoz** — nincs fokozatos
> romlás, csak kapcsoló.

### 5.1/c ⛔ AZ ÁLTALÁNOS EREDMÉNY — a gazdaság önmagában nem lehet a védelem

A D48 bukása nem megfogalmazás kérdése volt. Két eset van, és mindkettő elbukik:

- **Ha a keret MEGMARADÓ** (az elismerés annyiba kerül az adónak, amennyit a kapónak ad):
  a Sybil-korlát tökéletes (`f ≤ g/k`), **de a közösség bizonyíthatóan nem tud nőni**
  (5.1). Az össz-keret rögzített, tehát az egy főre jutó rész a létszámmal nullához tart.
- **Ha a keret TEREMTHETŐ** (az elismerés ingyen van): a közösség nő, **de a sziget
  ugyanazzal a mozdulattal ugyanúgy teremt.**

> ⛔ **Az ok, amiért nincs középút: a számtan nem látja a különbséget egy valódi és egy
> hamis ember között.** Bármilyen szabály, ami megengedi a becsületeseknek, hogy keretet
> gyártsanak, ugyanazt megengedi a szigetnek is — aritmetikailag **ugyanúgy néznek ki**.
> *(Végigpróbálva: fix alapítói készlet · ingyenes elismerés · belépéskori juttatás
> (`e < k`, `e = k`, `e > k`) · visszatérítéses „kölcsön" — mindegyik vagy elfogy, vagy a
> szigetet ugyanúgy táplálja.)*

⭐ **Ami ebből MEGMARAD, és nem kevés:** a keret-szabály megöli a *„fizess egyszer, arass
örökké"* támadást (a 4.1 hatodik körét), mert a friss belépő kerete nulla. **Kiváló fék és
ütemszabályzó — csak nem hordja el egyedül a Sybil-korlátot.**

⚠️ **És ezért kerül vissza a szerkezet.** Ha az aritmetika nem tud különbséget tenni,
akkor a különbségnek **a gráf alakjából** kell jönnie: abból, hogy a sziget a becsületes
hálóhoz **hol** kapcsolódik. A **K12** (horgony-halmaz) és a **K13** (út-feltétel) tehát
**nem elhagyható dísz** — a 4.4 „talán nem kell horgony" mondata **visszavonva**.

### 5.1/b A közösségépítés valódi találkozásokat igényel — és ez cél, nem hiba

⭐ **Csaba (2026-09-04):**

> *„Talán még az se baj, ha a közösségépítés valódi találkozásokat igényelne… Egy
> elszigetelt, magányos ember is közösségre találhat, vagy egy menekült, bajba jutott
> ember is."*

### 5.2 Az újonc nem tudja azonnal behozni a családját

Aki pont a minimummal jut be, annak nulla a kerete — a saját gyerekét sem tanúsíthatja,
amíg többen nem tanúsítják őt. Kis közösségben ez fájhat; ott viszont a `k` alacsony
lehet (2), és akkor a hatás enyhe. **Ezt a paraméter-választás oldja meg, nem külön
szabály.**

### 5.3 ⚠️ A `k` két dolgot csinál egyszerre — és egy lépés sem apró

A `k` egyszerre **belépési mérce** (hány tanú kell) és **növekedési fék** (mennyi keret van
összesen), mert kétszer üt: csökkenti mindenki keretét, **és** drágítja magát a felvételt.

⭐ **Csaba korrekciója (2026-09-04):** *„személyes találkozókon nagyon sok tanúsítást lehet
gyűjteni. Nem ezerszer 3, hanem akár 1000 × 50–100."* — **Igaza van, és ez megváltoztatja
a hatás nagyságát.** Egy 1000 fős koinóban:

- **átlag 50 tanúsítás** (találkozós kultúra): `k = 5`-nél 45 000 egység → **9000
  felvétel**; `k = 6`-nál 44 000 egység, felvételenként 6 → **7333 felvétel**. Ez
  **18% csökkenés** — finom szabályzó.
- **átlag 8 tanúsítás** (vékony háló): 600 → **333 felvétel**. Ez **majdnem felezés**.

> ⭐ **A `k` emelése annál durvább, minél közelebb van a közösség átlaga a minimumhoz.**
> Vastag hálóban lépésenként ~17%, vékonyban majdnem befagyasztás. **A fék tehát magától
> erősebb ott, ahol a közösség vékony** — pont ahol óvatosnak kell lenni.

Csaba döntése: **a mínusz rendben van, és a `k` egyesével emelkedik.** ⏳ Ha valaha külön
kellene szabályozni a mércét és az ütemet, ahhoz **két** paraméter kell — ma nem építjük meg.

### 5.4 A támadás nem lehetetlen, csak árazott — és önbeismerő

`f ≤ g/k` azt jelenti, hogy **nincs ingyenebéd**: a támadó költsége a hasznával együtt nő.
De van egy ennél erősebb fék is, amit Csaba nevezett meg (2026-09-04):

> **A megvásárolt tanúsítás önbeismerés.** Aki eladja, tudja, hogy a vevő hamisat akart —
> tehát a hallgatásáért egyszeri fizetség nem elég; visszajöhet még.

⭐ **És a koino szerkezete ezt tovább élezi:** a tanúsítás **aláírt esemény, ami soha nem
tűnik el.** Az eladó a saját nevét adja egy nyomhoz, amit később bármikor kiáshatnak.
Nem egy szívesség árát kéri tehát, hanem egy **tartós kockázat** árát.

⚠️ **Amit ez nem old meg:** egy bűnszervezet a belső bizalmat magának oldja meg — épp az a
dolga. Az érv tehát nem azt mondja, hogy „biztonságos", hanem hogy **a támadás megszűnt
olcsónak, egyéninek és némának lenni**: drága, szervezetet kíván, és tartós aláírt nyomot
hagy.

⛔ **És amire NEM támaszkodunk: az EUDI.** A **8. szabály** tiltja a jogi védelemre
tervezést, az EUDI az EU-n kívül nem létezik, és a 2. szabály szerint semmi nem múlhat
egyetlen szolgáltatáson. Marad annak, aminek a **D18/7** már megnevezte: *további
független tanú a több közül, önmagában soha nem elég.* **A Sybil-érv nem áll rá.**
*(Csaba: „rendben", 2026-09-04.)*

---

## 6. A TANÚSÍTÁS EMBERI OLDALA

### 6.1 ⭐ A tanúsító találkozó (Csaba, 2026-09-04)

> *„Lehetne szervezni tanúsító találkozókat, ahol tanúsításokat lehetne gyűjteni
> egymástól… Az hogy valódi találkozások történnek az e-emberek között."*

**Miért erős ez, és nem csak kedves:** a **D18/1** szándékosan gyenge állítást kér a
tanútól — *„létező, külön ember"* —, és korábban attól tartottunk, hogy a gyenge állítás
olcsó élt jelent. De ez két külön dolog volt: **az állítás gyengesége** és **az ellenőrzés
olcsósága**.

⭐ Egy fizikai találkozáson pontosan az ellenőrizhető, hogy **ez itt egy létező, külön
ember** — nem több, és mást nem is lehet így ellenőrizni. A találkozó tehát **nem
erősíti fel** a tanúsítást ajánlólevéllé (az felelősséget hozna, amit a D18/1 kizárt),
csak **drágává teszi a hamisítását**.

⭐ **És van egy védelme, amit semmilyen kriptográfia nem ad: az emberek megjegyzik az
arcokat.** Aki kétszer áll sorba két azonossággal, azt észreveszik. Ehhez semmit nem kell
rögzíteni — se biometria, se felvétel, se adat: **a D6 sértetlen marad.**

**A szélsőséges esetek kezelése emberi, nem programbeli** (Csaba): a mozgássérülthöz
**ki lehet menni**. *„A program nem tud helyettesíteni mindent, szükség van mindenki
emberségére."*

### 6.2 ⛔ De ez gyakorlat, nem szabály

**A kód sosem fogja tudni, hogy egy szobában találkoztatok-e.** Ha kimondanánk
szabálynak, hogy „tanúsítani csak személyesen szabad", akkor a saját mércénk szerint
**illemtant írtunk, nem szabályt** — *amit a számítás nem ellenőriz, az nem szabály.*

**Amit a program ellenőriz: a keret. Amit a program bátorít: a találkozó.**

⭐ **És erre van kész darabunk:** a tanúsítás alapértelmezett útja legyen a **helyi
felfedezés** (`js/csere/helyiFelfedezes.js`, Szakasz 2 / F. lépés) — a kliens azt kínálja
fel tanúsításra, akit a készüléked **éppen lát maga körül**. ⚠️ Ez nem bizonyítja a
jelenlétet (hamisítható), de **a becsületes utat teszi a legkönnyebbé**, a hamisat pedig
szándékos kerülőúttá. Ez a legtöbb, amit tisztességesen tehetünk — és ingyen van.

### 6.3 A nyilvános profil és az igazolvány

> ⚠️ **Pontosítás a tanúsítás szövegéhez (Csaba, 2026-09-04).** A **D18/1** teljes alakja:
> *„valódi, **külön** személy, **aki még nem regisztrált**."* Három állítás, nem kettő — és
> a harmadik a Sybil-szempontból a legfontosabb, mert **a kettős regisztrációt** zárja ki.
>
> ⭐ **És épp ezt a harmadikat nem tudja ellenőrizni egy találkozó:** hiába látom, hogy
> valódi és külön ember, azt nem látom rajta, hogy van-e már azonossága. **Ezt egyedül a
> nyilvános profil teszi ellenőrizhetővé** — rá lehet keresni a névre. Vagyis a teljes név
> és a település nem csak társas nyitottság, hanem **a tanúsítás harmadik felének az
> egyetlen műszere.**

A **D28** szerint a koino kérhet adatot a belépéskor; Csaba első koinója **teljes nevet és
település szintű lokációt** kér, és ezek nyilvánosak. Ez az, ami a tanúsítást emberileg
kezelhetővé teszi — **egy idegenről meg lehet kérdezni másokat.** Három fokozat, és
mindhárom a tanú saját döntése:

- akit **ismersz** → tanúsítod;
- akit **az ismerőseid ismernek** → kérdezel;
- akiről **senki nem tud semmit** → kérhetsz **igazolványt bemutatásra**.

> ### ⛔ D45 (javasolt) — VÉDŐKORLÁT: AZ IGAZOLVÁNY SOHA NE LEGYEN RÖGZÍTHETŐ
>
> A tanúsítás **egyetlen, egyforma mondat** marad — *„létező, külön ember"* —, akárhogy
> győződött meg róla a tanú. **Nem lehet ráírni, hogy „igazolvánnyal ellenőrizve".**
>
> ⚠️ **Miért kötelező ez:** ha kétféle tanúsítás lenne, elkerülhetetlen a nyomás, hogy a
> fontos dolgokhoz csak az „erős" fajta számítson — és azzal pontosan azt zárnánk ki,
> akiért az egész befogadás-gondolat szól: **a papír nélküli embert.** Az igazolvány így
> **erősíti** a rendszert (a tanú nyugodtabban ír alá), anélkül, hogy **osztályozná** az
> embereket.

---

## 7. A VISSZAVONÁS HELYETT: BIZONYTALANRA JELÖLÉS

**A kérdés:** ha egy tanú visszavonja a tanúsítását, attól a tanúsított kiesik-e?

- Ha **igen** → `k` ember összebeszélve **bárkit kiléptethet** utólag. Kizárás-támadás.
- Ha **nem** → egy bevallottan csalárd tanúsítás is örökre érvényben marad.

> ### ✅ D46 (javasolt) — Csaba válasza (2026-09-04)
>
> **A tanú nem vonhat vissza, hanem BIZONYTALANRA JELÖLHET** — és mellé **létrehozhat egy
> gondolatot** *(ma: „tartalom", lásd a [`jegyzetek.md`](jegyzetek.md) 2026-09-04-i
> bejegyzését)*, **amivel megosztja a felelősséget a közösséggel**.

⭐ **Miért helyes ez:** a jelölés **nem automatizmus, hanem bizonyíték** — bemenet egy
kifejezett, nyilvános, megtámadható közösségi döntésbe. Pontosan ugyanaz az alakzat, mint
a **D15**-nél (kulcs-helyreállítás), a **D16**-nál (lassú pénz) és a **D19**-nél: *lassú,
nyilvános, megtámadható*. És a gondolat révén a döntés **oda kerül, ahol a koino minden
más döntése történik** — nem külön adminisztratív gépezetbe.

⚠️ **És ez teszi igazzá azt, hogy „a koino fejlődése fenyegetés a szigetre":** nem a
szabály szigorodása söpri ki a hamisakat (az a felvételt nem érinti, mert be van fagyva),
hanem a **lelepleződés** — mert az aláírás megmarad, és egy leleplezett hamis azonosság
**megnevezi a saját tanúit.**

---

## 8. A BEFAGYASZTÁS — hogy a szigorítás előre hasson

A **D18/5** 2026-08-31-i felülvizsgálata kimondta: *a szigorítás ELŐRE hasson, soha
visszamenőleg.* Ez a keret-szabállyal együtt csak akkor tartható, ha:

> ### ✅ D47 (javasolt) — AZ ELLENŐRZÉS AZ ALÁÍRÁS PILLANATÁBAN TÖRTÉNIK, ÉS BEFAGY
>
> - A **felvételi esemény** magába fagyasztja az akkor érvényes paramétereket (`k`, és ami
>   még lesz) — a számítás nem azt kérdezi, *„megfelel-e a mai szabálynak"*, hanem hogy
>   **„megfelelt-e az akkorinak"**. Ez a válasz **örökre ugyanaz**, minden készüléken.
> - A **kiadott tanúsítás** ugyanígy: ha a `k` emelkedik és valaki mínuszba kerül, amit
>   korábban aláírt, az **nem válik érvénytelenné**, és akit felvettek, az **bent marad**.
>
> *(Ugyanaz a minta, mint a 3.1 `latott` mezőjéé: azt rögzítjük, mi volt igaz akkor.)*
> *(Csaba: „rendben", 2026-09-04.)*

---

## 8/b. ⭐⭐ A HORGONY — mi ez, és miért KÖR

*Ez a szakasz az 5.1/c bukása után született (2026-09-04), és ez a jelenlegi fő irány.*

### Mi a horgony

**A horgony az a pont, ahonnan a távolságot mérjük** — mint a tengerszint. Nem uralkodik
semmi fölött, nem dönt senkiről; csak **mindenki ugyanonnan mér**, ezért összehasonlíthatók
a számok.

Miért kell? Mert a *„vezessen hozzád `k` külön út"* szabálynál azonnal jön a kérdés:
**honnan?** Erre pontosan **három** válasz létezik, és kettő bukott:

- ⛔ **bármely felvett tagtól** — a sziget saját tagjai is felvett tagok, tehát
  **önmagát hitelesíti** (4.1);
- ⛔ **a kérdezőtől** — szerkezetileg helyes, de **készülékenként más eredmény**, és a
  szavazatszámlálás szétesik (2. szakasz, 1. követelmény);
- ✅ **egy rögzített, közös csoporttól** — objektív, és a sziget nem hamisíthatja, mert a
  horgonyhoz **csak a becsületes hálón át** vezet út.

### ⭐ Csaba: „a horgonynak nem egy pontban kell lennie, hanem egy körben, ami tágul" (2026-09-04)

Három dolgot old meg, amit a fix, kicsi halmaz nem tudott:

1. **A kiváltság feloldódik.** Egy húszfős alapítói kör kaszt. Egy táguló kör, amibe
   bárki bekerülhet a feltétel teljesítésével, **nem kiváltság, hanem állapot** — nem
   kineveznek rá, hanem eljutsz odáig.
2. **Skálázik, és helyi.** Egymilliárd ember útja nem futhat át húsz emberen. Egy új
   városban tartott találkozókból **helyben nőnek ki a horgonyok**, és az ottani belépő a
   **közeli** horgonyoktól mér. A kör nem egy nagy gyűrű, hanem **helyi ívekből** áll össze.
3. ⭐⭐ **Kiváltja az N^(1/5)-öt.** A Duniter azért kívánt globális számot, mert a mércének
   **nőnie kell a közösséggel**. Itt ez magától megtörténik: ahogy nő a közösség, **nő a
   horgony-kör is**. **A mérce együtt nő a mérettel, anélkül hogy bárkinek meg kellene
   számolnia, hányan vagyunk.** Amit a 9. szabály elvett, azt ez visszaadja.

### ⭐ Csaba: „mi lenne, ha a horgonnyá váláshoz több személyes találkozó kéne?" (2026-09-04)

**Ez viszi be azt, ami az 5.1/c szerint bizonyíthatóan hiányzott.** A számtan nem látja a
különbséget valódi és hamis ember között — de a **test** az egyetlen, amit a sziget nem tud
előállítani.

⚠️ **A program nem látja a találkozót** (*amit a számítás nem ellenőriz, az nem szabály*)
— **de látja az ALAKJÁT.** Egy húszfős találkozón húsz ember rövid időn belül mindenkit
tanúsít mindenkivel: sűrű folt a gráfban. Aki **több különböző találkozón** volt, annak a
tanúsításai **több, egymást nem ismerő foltból** érkeznek.

> **A horgony-feltétel tehát: nem sok tanúsítás, hanem SOKFÉLE.**

⭐ **És ezt Csaba már eldöntötte** — a **D18/3**-ban, 2026-08-25-ből: *„Nem a darabszám, a
FÜGGETLENSÉG számít. Tíz igazolás egy baráti körből kevesebbet ér, mint három a háló távoli
pontjairól — különben kialakulnak a kölcsönös igazolgató gyűrűk."* Akkor a folytonos
igazolásra írta; **most kapott feladatot.**

### ⚠️ Amit ez NEM old meg

- **A sűrű folt hamisítható.** Ötven egymást tanúsító hamis azonosság a gráfban
  **pontosan úgy néz ki, mint egy találkozó.** Ezért a függetlenség csak **a horgony-körhöz
  képest** mérhető: a csoportjaimnak külön-külön kell kapcsolódniuk a meglévő horgonyokhoz.
  ⚠️ Ez **bonyolultabb kód** — a 6. szabályt komolyan kell venni.
- **A küszöb-jelleg megmarad.** Ha a támadó megtéveszt `k` egymástól független horgonyt,
  onnantól megint *„fizess egyszer, arass örökké"* — **ezért kell a keret-szabály (D44) is.**
  ⭐ **A szerkezet a belépődíjat szabja meg, a keret a darabárat.**
- ⛔ **A horgony ne kapjon hangot.** Ha a horgony-lét több jogot vagy súlyt kezd jelenteni,
  kasztot építettünk. A **D18/3** védőkorlátja szó szerint ide is kell: **mérce lehet, hang
  soha.**

## 9. ILLESZKEDÉS A MEGLÉVŐ GÉPHEZ

⭐ **A keret-szabály alá nem kell új gépezetet építeni — a Szakasz 3 három darabja pont ezt
tudja:**

- **amit adtál** → a saját láncodból, egyetlen eseményből ellenőrizhető: pontosan a
  **D42-minta** (bemondott összeg, és a hézag az `entitasSorszam`-ból kiderül);
- **amit kaptál** → a rólad szóló események, vagyis **a te szeleted**: az a lekérdezés,
  amit a **3.2** tett skálázhatóvá (`szeletEsemenyei`);
- **mi volt látható a felvételkor** → a **3.1** `latott` mezője.

⚠️ **És egy figyelmeztetés, amit a megvalósításnál nem szabad elfelejteni:** a beérkező
tanúsítás **ugyanazon az `esemenyMentese` kapun** megy be, mint minden más (3. szabály) —
az identitás-réteg **nem kap külön, engedékenyebb utat**.

⚠️ **A `lancGyoker` lefoglalt helye** (3.1, ma mindig `null`) itt dől el: a Szakasz 4-ben
kell megmondani, mit jelent — vagy kimondani, hogy nem kell, és kivenni.

---

## 10. MÉRÉS — mit kell bizonyítani, mielőtt bármit elhiszünk

*A projekt módszertana: minden állítás mellé mérés. Ezek a próbák még nincsenek megírva.*

1. ⛔ **A szimulált sziget.** Egy támadó `g` becsületes tanúsítást szerez; a próba futtassa
   ki, hány hamis azonosságot tud felvetetni. **Az `f ≤ g/k` korlátnak tartania kell**
   — és a próba akkor jó, ha *előbb* megpróbálja megdönteni.
2. ⛔ **A hat kör.** A 4.1 támadása (a fogyó valódi-oszlop) **ne menjen át** a keret-szabály
   mellett — rontás-próba, ami nélküle átmenne.
3. ⛔ **A kölcsönös gyűrű.** Két, majd húsz egymást tanúsító, **nulla keretű** azonosság
   **nulla** keretet termeljen (D48).
3/b. ⛔ **És a párja: a NÖVEKEDÉS is menjen.** Ötven megállapodott tag tanúsítson egy friss
   tagot — a kerete **legyen 50**. ⚠️ *Ez a két próba együtt érvényes csak: az egyik a
   támadót fogja meg, a másik azt bizonyítja, hogy közben nem fagyasztottuk be a koinót.*
4. ⛔ **A befagyasztás.** `k` emelése után a régi felvételek maradjanak érvényesek, az újak
   essenek az új mérce alá — mindkét irányban.
5. ⛔ **Objektivitás.** Két készülék, eltérő szeletekkel, **ugyanazt** mondja egy felvételről
   — ez a `vizsgaProba.js` mintája, identitásra alkalmazva.
6. ⏳ **Méret.** Mekkora egy felvételi bizonyítvány bájtban, és mit tesz ez az esemény
   478 → 611 bájtos ára mellé? *(A 3.1 tanulsága: a becslés alábecsült; mérni kell.)*

---

## 11. NYITOTT KÉRDÉSEK

| # | Kérdés | Miért fontos |
|---|---|---|
| ~~**K11**~~ | ~~A keret élethosszig szól, vagy időszakonként újratöltődik?~~ | ✅ **LEZÁRVA (Csaba, 2026-09-04):** *„csak egymás tanúsítgatásával jusson mindenki tanúsítási lehetőséghez, 1-ért 1. Ne keverjük bele az időt."* — **nincs időszakos újratöltés**; a keret az elismerésből keletkezik, a **D48** szerint. ⚠️ Ez felülvizsgálja a **D18/4** „időszakonként, nem élethosszig" sorát, ami a Duniter fix 100-as korlátjára vonatkozott, nem erre |
| ⛔ **K12** | **Milyen legyen a horgony-halmaz** (tartós mag)? | ⚠️ **Ez lett a szakasz fő kérdése** (5.1/c): a gazdaság önmagában nem véd, tehát a szerkezet kell. Az ára a kiváltságos csoport — a védőkorlát: **mérce lehet, hang soha** (D18/3) |
| ⛔ **K13** | **Milyen út-feltétel** kerüljön a keret mellé (diszjunkt utak? távolság?) | Ugyanaz az ok. ⚠️ A 4.1 tanulsága áll: az út-feltétel **egy bizonyításon belül** tilt közös embert, a bizonyítások között nem — tehát önmagában ez sem elég |
| **K14** | Mekkora méret fölött **kapcsoljon be** a szabály? | A **D18/0** szerint kicsiben a közvetlen ismeret véd. ⚠️ A 🔴 közepes zóna nem szűnik meg, csak láthatóvá válik — *Csaba ezt vállalta (2026-09-03)* |
| **K15** | Milyen **pótutak** legyenek a találkozó mellett, és mennyivel gyengébbek? | 4. szabály: legyen mindig kézi út — de ezt nem szabad letagadni |

---

## 12. AMIT ÁT KELL VEZETNI A DÖNTÉSEK KÖZÉ

*A [`fejlesztesi_terv_fazis2.md`](fejlesztesi_terv_fazis2.md) a döntések helye. Az itt
javasolt számok — **D43–D47** — még nincsenek átvezetve.*

- **D43** — a belépési szabály alsó korlát, soha nem lefedettség (3. szakasz)
- **D44** — a tanúsítási keret = a minimum feletti tanúsítások száma (4. szakasz)
- **D45** — védőkorlát: az igazolvány soha ne legyen rögzíthető (6.3)
- **D46** — visszavonás helyett bizonytalanra jelölés + gondolat (7. szakasz)
- **D47** — az ellenőrzés az aláírás pillanatában történik, és befagy (8. szakasz)
- ~~**D48**~~ — ⛔ **elvetve** (5.1/c): az ingyenes elismerés a szigetet ugyanúgy táplálja.
  **Nem kell átvezetni** — de a bukás okát igen, mert az egy egész megoldás-családot zár ki

⚠️ **És két meglévő döntést érint:**

- **D18/2** — a Duniter-féle távolság-szabály (80% / N^(1/5)) **nem tartható**, mert
  globális számokat kíván; a helyébe a keret lép. *A D18/2 magva („a darabszám
  hamisítható, a pozíció nem") viszont **áll** — a keret is pozíciót mér, csak
  helyben ellenőrizhető alakban.*
- **D18/4** — az „időszakonként, nem élethosszig" sor felülvizsgálandó (lásd K11).

---

## Napló

- **2026-09-04** — A dokumentum létrejött, egy több körös tervezési beszélgetésből.
  A menete: a Duniter-szabály elbukott a 9. szabályon → az alsó korlát alakja → a
  diszjunkt-út javaslat, amiről kiderült, hogy **megkerülhető** (az ár egyszer fizetendő,
  a haszon korlátlan) → ⭐⭐ **Csaba keret-szabálya**, amiből az `f ≤ g/k` korlát
  levezethető → a tanúsító találkozó mint gyakorlat → a visszavonás helyett bizonytalanra
  jelölés. **Kód még nincs; a következő lépés a 10. szakasz rontás-próbái.**
- **2026-09-04 (még aznap)** — ⚠️ **Javítás:** a „növekedés önfinanszírozó" állítás **hibás
  volt**, és a `k`-emelés átszámolása buktatta ki (Csaba korrekciója: találkozókon nem 8,
  hanem 50–100 tanúsítás gyűlik). A megmaradási bizonyítás szerint a szabály eredeti
  alakja **nem tud növekedni**. A **K11 lezárva**: nincs időszak. ⭐ *A tanulság a hiba
  alakja: az összeadást el kell végezni, nem elég, hogy jól hangzik.*
- **2026-09-04 (harmadszor)** — ⛔ **A D48 is elbukott**, ugyanaznap: az ingyenes elismerés
  a hamis szigetet ugyanúgy táplálja, és nem lejtőn, hanem **sziklán** (öt korrumpált ember
  elég). ⭐ **Ebből viszont általános eredmény lett** (5.1/c): *a gazdaság önmagában nem
  lehet a védelem, mert a számtan nem látja a különbséget valódi és hamis ember között.*
  Ez egy **egész megoldás-családot zár ki** — és visszahozza a szerkezetet (K12, K13).
  ▶️ Innentől **szimulációval haladunk, nem érveléssel.**
