# SZAKASZ 4 — AZ IDENTITÁS

*Létrehozva: 2026-09-04, a Szakasz 3 lezárása után, Csabával közösen végigbeszélve.*

> **Mi ez a dokumentum, és mi nem?**
> A [`fejlesztesi_terv_fazis2.md`](fejlesztesi_terv_fazis2.md) a **döntések** helye (D1–D60),
> az [`utiterv.md`](utiterv.md) a **sorrendé**, a [`skalazas_terv.md`](skalazas_terv.md) a
> **szerkezeté**. Ez itt a Szakasz 4 **részlete**: hogyan lesz a koinónak olyan
> bizalmi hálója, ami az első naptól milliárdos.
> ⚠️ **A koino kódja még nem változott.** Ez tervezés — az egyetlen megírt darab a
> [`szigetMeres.js`](../koino/meres/szigetMeres.js) **mérőeszköz** (gráf-kísérlet, nem
> koino-kísérlet: nincs benne kulcs, aláírás, esemény, hálózat).
> ⚠️⚠️ **A DOKUMENTUM KÉT RÉTEGŰ.** A 3–8/e szakaszok a 09-04/05-i **tanúsítás-alapú**
> szerkezet levezetése — az 09-06-án **kiesett**, és a fejlécükben ott a ⛔ jel. **Ami ma
> áll: a D54–D60 és a 9/c.** A történetet azért hagytuk meg, mert a bukások okai
> megőrzendők (a projekt módszertana).
> ✅ **Átvezetve a döntések közé:** D43–D50 (2026-09-05) és D54–D60 (2026-09-06).

---

> ## ▶️ HOL TARTUNK (2026-09-06) — A SZERKEZET ÁTÉPÜLT, ÉS CSABA LEZÁRTA
>
> ⚠️⚠️ **FIGYELEM, AKI EZT A DOKUMENTUMOT OLVASSA:** a 2026-09-04/05-i szakaszok (3–8/e)
> egy **másik szerkezetet** írnak le — `k` tanúsítás, keret, horgony —, ami 09-06-án
> **kiesett**. Azok a szakaszok **a levezetés története**, nem a terv. ⭐ **Ami ma áll, az
> a D54–D60 és a 9/c szakasz.** A halott részek fejlécében ott a ⛔ jel.
>
> ⭐⭐⭐ **A SZERKEZET, EGY MONDATBAN (D56):** *az 1. lépcső olcsó, mert a kapu úgysem véd;
> a 2. lépcső drága, mert ott a zsákmány; és a védelem egyikben sem a kapu, hanem hogy a
> rossz tanúsító elveszíti a szerepét.*
>
> - **1. lépcső — a tagság:** **egy meghívó**, és minden mehet (tartalom, tudatpont,
>   javaslat, szavazat). **D56**
> - **2. lépcső — a pénztárca:** **három tanúsítás** felhatalmazott tanúsítótól — a **D11**
>   megvalósulása. **D56**
> - **A felhatalmazás:** 2. lépcsősök adják, **emberenként egyet**; a küszöb `N` **kimondott
>   szám** (a 2. lépcsősök érték javaslatainak mediánja), nem mért rangsor. **D57, D57/b**
>   ⭐ **Megbízás, nem pontszám:** *„27-en bízták rá a tanúsítást"*, soha nem
>   *„becsületesség: 27"*. **D60**
> - **Az ellenőrzés a gyökérig megy**, mert mérve olcsó (17,7 → 30,1 → 40,7 ős 1500 / 6000 /
>   20 000 főnél — **logaritmikus**). A `D` mélység-korlát **elhagyható szelep**. **D59**
> - **A jelzés: „MÉG NEM ÉRTÜNK ÖSSZE"** — tény, szimmetrikus, **önjavító**. **D55**
> - **A készülék-felfedezés segédeszköz, nem adatforrás.** **D54**
> - **A papír nélküli ember** az 1. lépcsőn teljes jogú e-ember; a 2. lépcsőn nem
>   számolunk vele **ebben a verzióban**. **D58**
>
> ⛔⛔ **AMIT A 09-06-I MÉRÉSEK MEGDÖNTÖTTEK** ([`eredmenyek.md`](../koino/meres/eredmenyek.md)
> 11–12. szakasz) — **ezeket ne hozd vissza:**
>
> - **a belépési szám nem védelem, hanem árcédula**: a fal pontosan ott van, ahol a
>   megtévesztettek száma eléri a kért meghívó-számot (4-nél 0 hamis, **5-nél 880**);
> - **a jogosítási küszöb ELREJTI a szigetet** (100%/0% helyett 91%/16%), mert minden
>   hamisat egy valódi emberhez kényszerít — *egy teljesítendő küszöb egyben hitelesítő
>   pecsét is*;
> - ⛔ **a SÉTA a leggyengébb láncszem, nem a legerősebb**: sok megtévesztettnél
>   **43–74% / 31–61%**. A **D50** hordozó-döntése áll (helyi lista, ugráló üzenet), de
>   **a tenger NEM a védelem**;
> - ⛔ **a `k` tanúsítás + keret vonala (D44, D51, D53) tárgytalan** — a meghívás váltotta ki.
>
> ⭐⭐ **A VÉDELEM A KONTRASZT:** *„hány olyan embert tanúsítottál/ismersz, akinek nincs
> önálló élete a közösségben?"* — becsületes alapvonal **0,3**, megvett tanúsítóé több száz.
> **100% / 9–25%**, mind a hét támadó-változat és mindhárom arány ellen. ⭐ És olcsó: nem
> kell hozzá séta, se élő kapcsolat — a **D55** nyíltság teszi helyben kiszámíthatóvá.
>
> ⭐⭐⭐ **ÉS A TÖRVÉNY:** a visszacsatolással (a közösség visszavonja a megbízást) a kár
> **880 → 120**, és **kár = a támadó üteme × az ébredés ideje** (40 · 120 · 240 · 440 a
> 0/2/5/10 körös késésnél). **Lineáris, nem exponenciális: a hurok mindig bezárul.**
> ⭐ Ezért a gépi segítség értéke **az ÉSZREVÉTELBEN** van, nem a döntésben.
>
> ✅ **CSABA LEZÁRTA A MÉRÉSEKET (2026-09-06):** *„eleget mértünk. Nekem ez így már
> megfelel, első koinónak."*
>
> ▶️ **A megépítés terve: a 9/c szakasz.** ⚠️ *A régi 9/b terv a `k` tanúsításra épült —
> ⛔ elavult, és meg van jelölve.*

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

## 4. ⛔ A MAG: A KERET — Csaba szabálya *(TÁRGYTALAN, 2026-09-06)*

> ⛔ **EZ A SZAKASZ MÁR NEM A TERV.** A keret azért született, hogy a `k` tanúsításos
> belépést fékezze — de a **D56** két lépcsője kiváltotta: az 1. lépcsőn **nincs mit
> fékezni** (egy meghívó, és a mérés szerint a kapu úgysem véd), a 2. lépcsőn pedig a
> **felhatalmazás + visszavonás** végzi a munkát. ⭐ *A levezetés viszont megmarad, mert a
> 4.1 támadása (a „fizess egyszer, arass örökké" hatodik köre) a meghívásos világban is
> ugyanígy jelent meg — és ezt 09-06-án meg is mértük.*

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

## 5. ⛔ AZ ÁRA — amit vállalunk *(a keret-vonal része, TÁRGYTALAN)*

> ⛔ **A 4. szakasszal együtt esett ki.** ⭐ **De az 5.1/c általános eredménye ÁLL, és ez a
> szakasz legfontosabb öröksége:** *a gazdaság önmagában nem lehet a védelem, mert a számtan
> nem látja a különbséget egy valódi és egy hamis ember között.* Ez zárta ki a
> keret-családot, és ez vezetett a D49-hez.

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

## 8/b. ⛔ A HORGONY — mi ez, és miért KÖR *(MÉRVE ELBUKOTT)*

> ⛔ **A horgony-kört a támadó elfoglalja: 880 hamis horgony a 20 valódi mellett.** A K12 és
> a K13 tárgytalan. ⭐ A tanulság viszont általános, és azóta kétszer is visszaköszönt:
> *minden kitüntetett halmaz, amit gráf-statisztika jelöl ki, ELFOGLALHATÓ.*

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

## 8/c. ⭐⭐ A FORDULAT — az identitás-réteg nem TILT, hanem FELTÁR

*Csaba döntése, 2026-09-05, három megbukott kereső-nap után.*

> **Csaba:** *„az identitás réteg, egy minimumon kívül nem tilt, hanem feltár. Szóval
> legyenek kimutathatóak/láthatóak a gyanús minták, mint ahogy az is legyen látható, hogy
> kit hányan ismernek személyesen. Az áttekinthetőséget és a jelzéseket dolgozzuk ki
> alaposan. Aztán majd a közösség eldönti, hogyan tovább."*

### Mit változtat

Eddig **a szabálytól vártuk az igazságot**: döntse el, ki valódi. Ezért kerestünk olyan
képletet, ami ezt hibátlanul tudja — és ezért ütköztünk mindig ugyanabba, hogy *a számtan
nem látja a különbséget valódi és hamis ember között* (5.1/c).

⭐ **A fordulat: a szabály csak egy minimumot tart, a többit a közösség látja és dönti el.**
Ezzel az identitás abba a családba kerül, ahová a koino minden más nehéz kérdése:

- a szabálysértő eseményt **nem töröljük, hanem kihagyjuk és felsoroljuk** (D19);
- a döntés nem igen/nem, hanem **bizonyossági mutató**;
- a halál (D18/7), a kulcsvesztés (D15) és a pénz (D16) mind **lassú, nyilvános,
  megtámadható** — nem automatizmus.

⚠️ **És ez nem a nehézség megkerülése.** A szakirodalom egésze (SybilGuard, SybilLimit,
Whānau) ugyanoda érkezik: *a hamis azonosságok száma a támadó által szerzett becsületes
kapcsolatok számától függ.* Aki mást ígér, az kilépett a gráfból valami másba — állami vagy
biometrikus azonosításba (a papír nélküli embert kizárná), pénzbe vagy számítási erőbe
(a **D7** tagadása), vagy kapuőrbe (a koino tagadása). **Nem azt nem találtuk meg, ami
létezik; azt kerestük, ami nem létezik.**

### ⛔ D49/a — A MINIMUM MARAD KEMÉNY SZABÁLY

Ha minden jelzés lesz és semmi sem szabály, akkor **készülékenként más lesz, ki számít
e-embernek** — és a szavazatszámlálás szétesik. Megdőlne az, amit a `vizsgaProba.js` a
Szakasz 2 vizsgájaként bizonyít (⭐⭐ *ugyanaz a halmaz, ugyanaz az állapot*).

A réteg tehát **két élesen elváló részre bomlik**:

- **Amit a program ELDÖNT** — objektív, offline, minden gépen ugyanaz: megvan-e a `k`
  tanúsítás (D43), és a befagyasztás (D47). ⭐ Kevés, de kemény.
- **Amit a program MEGMUTAT** — minden más; és abból **ember von le következtetést**,
  nem képlet.

### ⭐ D49/b — A JELZÉS TÉNYT MUTAT, SOHA NEM ÍTÉLETET

Egy jelzés, ami azt mondja: *„ez az e-ember gyanús"* — **ítélet**. Abból hírnév-rendszer
lesz, kapuőrséggel: pontosan az, amit a **D18/1** kizárt (*„megbízom benne" → ❌*).
Egy jelzés, ami azt mondja: *„négy egymást nem ismerő körből tanúsították"* — **tény**,
amit bárki a láncból is kiszámolhat.

> ⭐⭐ **És Csaba két mondata ugyanaz az egy szám, két irányból olvasva.** *„Legyenek
> láthatóak a gyanús minták"* és *„legyen látható, kit hányan ismernek személyesen"* —
> nem kell külön gyanú-mutatót építeni: aki sokfelől ismert, arról ez **melegen** hangzik;
> aki egyetlen zárt foltból érkezett, arról ugyanez **hidegen**. **Egy mérce, nem kettő**
> — és ezért nem lehet belőle megbélyegzés.

### A jelzések — amit ki kell dolgozni

**A koino kitettsége (rólunk, nem róla):**

- **a horgony-kör vastagsága** — hányan vannak, és mennyire függetlenek egymástól;
- **torlódás a tanúkon** — hány felvétel vezethető vissza ugyanarra a néhány emberre;
- **az „egy körből született" arány** — hány e-ember jött be úgy, hogy minden tanúja
  ugyanabból a foltból való;
- **a legszűkebb átvágás** — hány ember kiesése szakítaná ketté a hálót.

**Egy e-emberről (tény, nem ítélet):**

- **hányan tanúsították** — a nyers szám;
- ⭐ **hány FÜGGETLEN körből** — ez a *„hányan ismerik személyesen"* becsületes alakja: a
  puszta darabszám hamisítható, ez sokkal nehezebben;
- **milyen ütemben** — tizenkét tanúsítás egy órán belül egy foltból, vagy egy év alatt
  négy városból;
- **mennyire megállapodottak a tanúi** — régóta bent lévők, vagy szintén frissek.

### ⛔ D49/c — HÁROM VÉDŐKORLÁT, mert ez boszorkányüldözéssé tud válni

1. ⛔ **Nincs személyre szóló gyanú-pontszám, nincs rangsor, nincs piros jelzés a név
   mellett.** Csak a fenti tények, mindenkinél ugyanúgy megjelenítve.
2. ⛔ **A jelzés tájékoztat, nem jogosít** (N9). Attól, hogy valakinek vékony a hálója,
   **semmilyen joga nem csökken** — nem esik ki, és nem lesz kevesebb a szavazata.
3. ⛔ **Az összesített nézet a koinóról szóljon, ne emberekről.** *„Mennyire vagyunk
   kitéve"* — nem *„kik a gyanúsak"*.

### ⭐ És a kör bezárul — nem kell új mechanizmus

Ha valaki mintát lát: **bizonytalanra jelöl**, és **létrehoz egy gondolatot**, amivel a
felelősséget megosztja a közösséggel (**D46**). Onnan a rendes koino-út következik —
javaslat, vita, egyezmény —, és a megjelölt események kihagyása a **szabály-rétegen**
történik, ahogy a D19-ben. ⚠️ **A maradék kockázat** ugyanaz, mint mindenhol: a többség
így elvileg kizárhat egy kisebbséget. Az ellensúly is ugyanaz: **lassú, nyilvános,
megtámadható.**

### 🔍 A mérce, amivel egy jelzés értékét eldöntjük

> **Egy jelzés akkor ér valamit, ha a szimulált szigetre KIGYULLAD, egy valódi, gyorsan
> növő közösségre viszont NEM.**

⚠️ Egy jelzés, ami a becsületes közösségre is kigyullad, **rosszabb a semminél**:
hozzászoknak, és megszűnik jelzés lenni. Ezt a `szigetMeres.js`-ben mérjük (10. szakasz).

### ⛔ ÉS AZ ELSŐ MÉRÉS UTÁN (2026-09-05): AMIT FELTÁRUNK, AZT MÉG NEM TALÁLTUK MEG

Teljes jegyzőkönyv: [`eredmenyek.md`](../koino/meres/eredmenyek.md) 3–8. szakasz.

- ⭐ **Egy naiv és egy óvatos támadót a jelzések elkapnak** — és ez tanulságos: a **támadó
  nem tud egyszerre halk és hangos lenni**. Ha keveset tanúsít, feltűnik, hogy az
  azonosságait pontosan `k`-an ismerik (megállapodottság 6 a 96 helyett); ha sokat, csak a
  saját hamisaiból meríthet, és az összefonódás **0,99**-re szalad.
- ⛔ **De aki egész hamis TÁRSADALMAT épít, azt egyik személyes jelzés sem fogja meg.**
  A szigeten belüli „találkozók" ingyen vannak neki, és utánozzák a valódi világ alakját.
- ⛔⛔ **Az ösztönös jelzés HÁROMSZOR bukott meg.** A *„kevés kapcsolata van, tehát gyanús"*
  rendre **31%, 41%, 45%** becsületes tagot jelölne meg tévesen — és épp azokat, akikért a
  befogadás-gondolat szól.
- ⛔⛔ **És a horgony-kört a támadó elfoglalja** (K12): a becsületes kör 30 kör alatt
  **egyáltalán nem nőtt** (végig 20 = az alapítók), a hamisak viszont **mind a 880-an**
  horgonnyá váltak. A *„több, egymást nem ismerő körből"* feltétel azt jutalmazza, aki
  **tudatosan hálózatot épít** — és a támadó a legtudatosabb.

> ⭐ **Az irány (feltárás tiltás helyett) ÁLL. De a jelzés nem lehet sem személyes
> statisztika ÖNMAGÁBAN, sem a mai horgony-távolság** — mindkettőt megmértük.
>
> ⭐⭐⭐ **ÉS MÉG AZNAP MEGLETT A HIÁNYZÓ FELE: a bemutatkozások tengere (8/d).** A személyes
> statisztika a **ritka** szigetet fogja meg, a tenger-jelzés a **sűrűt** — és a támadó nem
> tud egyszerre sűrű és ritka lenni. **Együtt 100% / 0% mind a három támadó ellen.**

## 8/d. ⚠️ A BEMUTATKOZÁSOK TENGERE — és a satu *(FELÜLVIZSGÁLVA 2026-09-06)*

> ⚠️ **AZ ITT LEÍRT SATU MÁSKÉNT ÁLL.** A tenger-jelzés 100% / 0%-os számai **három
> megtévesztett emberre** igazak. Sok megtévesztettnél (20–50) a séta **összeomlik**:
> 43–74% elkapva, 31–61% tévesen ([`eredmenyek.md`](../koino/meres/eredmenyek.md) 11.12–11.13).
> ⭐ **A satu gondolata áll — csak a másik pofa lett az erős:** nem a séta, hanem a
> **KONTRASZT** (*„hány olyan embert ismersz, akinek nincs önálló élete?"*), ami 100% / 9–25%
> minden támadó ellen. A tenger **megmarad, de mint kényelem, nem mint védelem.**

> **Csaba:** *„egy szóban: BEMUTATKOZÁS. Bemutatkozás jelöléseket intéznek egymás felé,
> amit mérünk. A nem létező e-emberek mindig szigeteket alkotnak, a létező e-emberek pedig
> beolvadnak a bemutatkozások tengerébe."*

### Miért ez az első, ami átmegy a mérésen

Minden korábbi jelzés **egy kitüntetett ponthoz** mért — és a támadó **elfoglalta a
mérőoszlopot** (8/c mérés: 880 hamis horgony). Ez a tengerhez mér, és **a tengert nem lehet
elfoglalni**, mert nincs benne kitüntetett hely.

⭐⭐ **És amit a D49 nyitott ki:** ez a mérés **szubjektív** („tőlem nézve"). Ilyet két nappal
korábban elvetettünk, mert készülékenként más eredményt ad — de az akkor volt igaz, amikor
a mérés **döntött**. A D49 óta nem dönt, csak megmutat. **Csaba tegnapi döntése tette
lehetővé a mai ötletét**, és ezt előre nem lehetett látni.

**A mérés:** két ember elindul véletlen sétákkal a saját kapcsolatai mentén —
**összeérnek-e valahol?**

### ⭐⭐⭐ A SATU — és ez a szakasz eddigi legfontosabb eredménye

*Teljes jegyzőkönyv: [`eredmenyek.md`](../koino/meres/eredmenyek.md) 9–10. szakasz.*

- **A személyes statisztika a RITKA szigetet fogja meg.** Az óvatos támadó azonosságait
  pontosan `k`-an tanúsítják — **100% elkapva / 0% téves, még 150 megtévesztett embernél
  is**, mert ez a szám nem attól függ, hány embert vett meg.
- **A tenger-jelzés a SŰRŰ szigetet fogja meg.** Az alapos támadó — aki minden személyes
  jelzést átugrott — **100% / 0%**, szintén minden megtévesztés-szinten.

> ⭐⭐⭐ **A támadó nem tud egyszerre sűrű és ritka lenni.** Ha élethű társadalmat épít, hogy
> a statisztikát megverje, azzal **bezárja magát a saját tengerébe**. Ha ritka marad, hogy
> a séták kijussanak, akkor az azonosságai csupaszak, és **a statisztika elkapja**.

⭐ **És átmegy a 9. szabályon:** a számítás **helyi és korlátos** (≈4000 séta-lépés, a
közösség méretétől függetlenül) — nem kíván élő lekérdezést és nem kíván globális számot.
Ez az első jelzés, amiről ez elmondható.

### ⚠️ A feltétel, amin áll

A jelzés azon múlik, hogy a valódi társas háló **„kis világ"** — van benne néhány **távoli
él** (elköltözik valaki, más városban van rokona, utazik). ⚠️ *Ezt a mérés tanította: az
első futásban a modell világa egy KÖR volt, amiben nincs is tenger, csak part — és a jelzés
magonként 0% és 46% közt szórt. **10% távoli találkozóval az ingadozás eltűnt.*** Egy
teljesen elszigetelt közösségnél tehát a jelzés gyengébb; ezt külön kell mérni.

### Amit ki kell dolgozni

- ⏳ **A bemutatkozás alakja** — olcsóbb és sűrűbb, mint a tanúsítás: *„találkoztunk"*, nem
  *„létező, külön ember"*. A mérés még a tanúsítási gráfon futott. **A hordozó kérdését a
  8/e szakasz zárja le.**
- ⏳ **A séta paraméterei** (hány séta, hány lépés) — közösségi paraméterek (D13/c)?
- ⏳ **Mi szivárog ki egy séta közben?** Külön végiggondolandó és mérendő (8/e).

## 8/e. ⭐⭐ A TÉRKÉP NÉLKÜLI TENGER — a bemutatkozás hordozója

*Csaba, 2026-09-05. Ez zárja le a 8/d legkomolyabb nyitott kérdését.*

### A kifogás, ami a 8/d-ből következett

Ha mindenki feljegyzi a láncra, kivel találkozott, akkor a koino **teljes, örök, nyilvános
társas térképet** épít mindenkiről. Ez a **D6** tagadása (*„személyes adat SOHA a láncra"*)
— és mivel a koino épp politikai döntésekre készül, ez pontosan az az adat, ami egy
mozgalom elnyomásához a legértékesebb.

### ⭐ Csaba válasza: ez nem megfigyelés, hanem közlés

> *„nem a készülék méri önkényesen, hanem a résztvevők jelzik a bemutatkozásukat, tehát
> engedélyezik. Persze mindent korrekt módon le kell írnia a programnak, hogy mi mivel jár."*

**Ez helyes, és a gyűjtés jogosságát megoldja.** ⚠️ De három dolgot nem old meg, és ezeket
ki kell mondani:

- **A beleegyezés egyenkénti, a kár az összegben van.** Egy *„találkoztunk"* ártalmatlan;
  tízezerből **térkép** lesz — abba senki nem egyezett bele, csak a pontokba.
- **Örökre szól.** A koino nem felejt; amibe húszévesen beleegyezel, az hatvanévesen is ott
  van. A **D14** szerint viszont a felejtés az alapállapot.
- **A körülmények változnak.** Aki elmenekült valaki elől, vagy akinek a hazájában
  veszélyessé válik egy társaság, annak a régi beleegyezése nem véd.

### ⭐⭐ D50 — A JELZÉSHEZ NEM KELL A TÉRKÉP, CSAK AZ ÚT

A feloldás abból jön, hogy **megnézzük, mire van szüksége egy sétának**:

- az **első lépéshez** a saját ismerőseidet kell tudnod — azokat úgyis tudod, hiszen te
  találkoztál velük;
- a **második lépéshez** a te ismerősöd saját ismerőseit — **azokat meg ő tudja**;
- és így tovább, tíz lépésen át.

> ⭐ **Senkinek nem kell látnia az egészet. Mindenki csak azt tudja, amit amúgy is tud.**

**Ebből következik a döntés:**

> **A bemutatkozás NEM esemény a láncon, hanem HELYI LISTA** — és a séta nem lekérdezés,
> hanem **üzenet, ami ugrál**.

⭐ **Már van rá minta a programban:** a `js/csere/tarsak.js` társ-listája pontosan ilyen —
*„helyi megfigyelés — sosem terjed, és semmit nem dönt el a koinóban."*

**A séta a gyakorlatban:** küldök egy jelet az egyik ismerősömnek, ő továbbadja egy véletlen
ismerősének, az is tovább; tíz ugrás után az utolsó visszaszól, hogy ide jutott.

- **Senki nem látja az utat** — mindenki csak azt, kitől kapta és kinek adta.
- **Nem áll össze térkép:** a kiinduló annyit tud meg, mely embereket éri el tíz lépésen
  belül — nem azt, hogy ki kit ismer.
- A két halmaz összevetése (*„hány ponton érünk össze?"*) elvégezhető úgy, hogy csak a
  **darabszám** derüljön ki, a nevek ne.

⭐ **Ez ugyanaz a szerkezet, mint a csere:** üzenet fut a hálón, nem adat áll egy helyen.

### ⭐⭐ És ezzel a 9. szabály gondja is megoldódik

Eddig ez állt: *ami DÖNT valamiről, az soha ne kívánjon élő lekérdezést.* Egy séta viszont
**élő embereket kíván**.

⭐ **A D49 óta ez nem baj:** a tenger-jelzés **nem dönt semmiről**, csak megmutat. Ha most
épp nem fut le, akkor nem látod a jelzést — és **semmi más nem áll meg**. Pontosan olyan,
mint a **kereső-réteg**: hasznos és **elhagyható**.

> **Vagyis a bemutatkozás nem a DAG-ba tartozik, hanem a MÁSODIK RÉTEGBE.** A láncon marad,
> ami dönt (a `k` tanúsítás, D43/D47); a tenger fölötte úszik — élőben, elhagyhatóan,
> térkép nélkül.

⭐ **És egy egybeesés, ami nem véletlen:** a séták akkor tudnak végigfutni, amikor mindenki
egyszerre ébren van — vagyis **a buliban**, az összehangolt ötperces ablakban (6/c szakasz).
Az a szerkezet pontosan ehhez való.

### ✅ A KÉSZÜLÉK-FELFEDEZÉS: SEGÉDESZKÖZ, NEM ADATFORRÁS (Csaba, 2026-09-06)

*Csaba felvetése: a készülékek érzékeljék, ha koino-s készülék van a közelben, és
jegyezzék fel a találkozást — technikailag ez láthatóbbá tenné a tengert.*

⛔ **Megmérve, és a válasz nem.** Az automatikus közelség **pont azt adja ingyen a
támadónak, ami ma a legdrágább neki**: egy készülék ezer azonosságot sugározhat, és egy
pályaudvalon végigsétálva mind az ezer „találkozik" valódi emberekkel. A 11.3/b mérés
szerint viszont **épp a valódi emberekhez kötés rejti el a szigetet** (100% / 0% helyett
91% / 16%). A sűrűbb tenger tehát **tompítaná** a jelzést, nem élesítené.

⛔ **És a D50 saját indoklása dől meg vele:** *„ez nem megfigyelés, hanem közlés — a
résztvevők jelzik, tehát engedélyezik."* Az automatikus érzékelés **pontosan megfigyelés**,
és a helyi lista ekkor már nem szándékos bemutatkozások listája, hanem **mozgás- és
társaság-napló** — miközben a D14 szerint a felejtés az alapállapot. A
[`helyiFelfedezes.js`](../koino/js/csere/helyiFelfedezes.js) ezt a határt egyszer már
tudatosan meghúzta: *„bizalom nem jár vele (3. szabály) … és sosem lesz esemény."*

> ### ✅ D54 (Csaba: „rendben, akkor nem kell, csak segédeszközként")
>
> A készülék-felfedezés **a kézi lépés segédje**, nem adatforrás: a készülék **javasol**
> (*„ezek a koino-készülékek voltak a közelben — ismersz köztük valakit?"*), az **ember
> dönt**. Így a bemutatkozás **közlés marad**, csak nem kell címet gépelni.
> ⭐ Kockázat nélküli haszon, és a meglévő `helyiFelfedezes.js`-re épül.

### ⭐⭐ D55 (Csaba, 2026-09-06) — A NYÍLTSÁG: A D49/c 1. PONTJA FELÜLÍRVA

*A D49/c első védőkorlátja ezt mondta: „nincs személyre szóló gyanú-pontszám, nincs
rangsor, nincs piros jelzés a név mellett." A mérés viszont azt adta, hogy **csak a
személyre szóló alak működik** — a koino-szintű összesítés semmit nem mutat (11.7).*

> **Csaba döntése:** *„felülírom. Az első közösségben fel kell vállalnia mindenkinek a
> nevét, a települését, a bemutatkozásait (nyilván ha titkolni akar egy találkozót, akkor
> nem teszi). Mivel nincsen kormány-garancia arra, hogy 1 ember = 1 e-ember legyen, ezért
> csak egymást tudjuk hitelesíteni, ahhoz meg elengedhetetlen, hogy közzétegyünk
> »személyes« dolgokat is. A koino a nyíltságról szól."*

⭐ **Az indoklás szerkezeti, nem hangulati:** a koino elutasítja az állami és a biometrikus
azonosítást (D7, D18), tehát **nem marad más, mint hogy az emberek egymást hitelesítik** —
és ahhoz látniuk kell egymást. A titkosság és az egymás-hitelesítés **nem fér össze**; a
koino a másodikat választja.

⭐ **És a megfogalmazás, amiben megegyeztünk:** a jelölés **soha ne azt mondja, hogy
„gyanús"**, hanem hogy **„MÉG NEM ÉRTÜNK ÖSSZE"**. Ugyanaz a szám, de:

- **tény, nem ítélet** — a D49/b sértetlen marad;
- **a kapcsolatról szól, nem a személyről**, és **szimmetrikus**: ha te így látsz engem,
  én is így látlak téged. Ezért **nem tud stigmává válni**;
- ⭐⭐ **a cselekvés benne van, és a jelzés önjavító**: a következő lépés magától adódik —
  *mutatkozzunk be* —, és ha megtörténik, a jelölés **eltűnik**. A hamis azonosságnál nem
  tűnik el, mert nincs, aki valóban bemutatkozzon vele.

⚠️ **A D49/c 2. és 3. pontja ÁLL:** a jelzés **tájékoztat, nem jogosít** (semmilyen jog nem
csökken tőle), és az összesített nézet továbbra is a koinóról szóljon.

⏳ **És egy kérdés, amit ez NYITVA HAGY:** a nyilvános bemutatkozás **nem ugyanaz**, mint a
láncra tett bemutatkozás. Lehet *nyilvános, de helyi* (a személy készülékéről lekérhető),
vagy *lánc-esemény* (mindenkinél ott van). A **D50** az utóbbit zárta ki — a különbség a
léptéknél és a D6-nál dől el, tehát külön döntés kell rá.
⭐ *A séta ettől függetlenül megmarad*: már nem a titkosság miatt, hanem mert **korlátos
munkával** felel arra, amire a teljes gráf bejárása csak globálisan tudna (9. szabály).

### ⭐⭐⭐ D56 (Csaba, 2026-09-06) — A KÉT LÉPCSŐS BELÉPTETÉS

*Ez az a szerkezet, ami a nap összes mérését összefogja: a költség oda kerül, ahol a
támadás kifizetődik, és sehova máshova.*

> **1. lépcső — a tagság.** **Egy meghívó**, és kész. Ezzel **minden mehet**: tartalom,
> tudatpont, javaslat, szavazat. ⭐ **Nincs kapu, mert a mérés szerint a kapu úgysem véd**
> (11.1: a meghívási szám nem védelem, hanem árcédula — a támadó egyszer megveszi a kellő
> embereket, és onnantól korlátlan).
>
> **2. lépcső — a pénztárca.** **Három tanúsítás**, amit **csak felhatalmazott tanúsító**
> adhat. ⭐ Ez a **D11** szó szerinti megvalósulása: *a pénz csak bizonyított identitás
> után.* Eddig elvi mondat volt, most szerkezet.
>
> **A felhatalmazás.** Mindenki annyi felhatalmazást oszt, amennyit akar, annak, akinek
> akar — **de emberenként csak egyet**. Aki elér egy küszöböt, **tanúsíthat**. ⭐ Ez
> **szerep, nem rang**: bármikor visszavonható, mert az emberek újraosztják.
>
> ⭐⭐ **A választótestület: CSAK aki már átment a 2. lépcsőn** *(Claude javaslata, Csaba:
> „igen, igazad van, ez tetszik")*. ⚠️ **Enélkül a szerkezet megbukna**, és ezt mérve
> tudjuk: ha bárki oszthat felhatalmazást, akkor a támadó 880 hamis azonossága **egymást
> hatalmazza fel**, mind bekerül a küszöb fölé, saját tanúsítókat állít, és a pénztárcák
> megnyílnak. Pontosan ez történt a horgony-körnél (**880 hamis horgony** a 20 valódi
> mellett): *minden kitüntetett halmaz, amit gráf-statisztika jelöl ki, elfoglalható.*
> ⭐ A hitelesített körre szűkítve viszont a sziget **hiába ezerfős — egyetlen szavazata
> sincs**, és a kör csak személyes találkozással bővül. Az alapító kör indítja, ugyanúgy,
> mint a meghívási láncot.

> ### ⛔ D57 — A KÜSZÖB ABSZOLÚT SZÁM, NEM RANGSOR
>
> A *„felső medián 1/3"* alak **globális számot kíván** (mindenki felhatalmazás-száma), és
> ugyanazon a 9. szabályon bukna el, mint a Duniter-alak. Helyette: **„legalább N
> felhatalmazás"** — a saját szeletből, offline ellenőrizhetően.
>
> ⭐⭐ **És a közösség így is állíthatja mediánnal**, mert a **D13/c** szerint a
> koino-paraméter maga is **entitás**: az `N` értéke az *arra az entitásra* adott érték
> javaslatok mediánja. **Nem veszítünk semmit — csak a rangsort, és épp az volt a globális.**
>
> ⭐ *Csaba kérdésére, hogy a medián gond-e milliárdos léptékben:* **nem a medián a gond,
> hanem a sokaság, amin fut.** A mai küszöbök az **entitás tulajdonosain** futnak
> ([`javaslatSzamitas.js`](../koino/js/allapot/javaslatSzamitas.js) `kuszobokMost`), ami
> szelet-korlátos, és azt a szeletet a szavazatszámláláshoz úgyis végigolvassuk.

> ### ⭐⭐ D57/b (Csaba, 2026-09-06) — A KÜSZÖB A 2. LÉPCSŐSÖK JAVASLATAINAK MEDIÁNJA
>
> `N` **nem mért érték, hanem kimondott**: a paraméter-entitásra adott **érték javaslatok
> mediánja** — és javaslatot is **csak 2. lépcsős** e-ember tehet.
>
> ⚠️ **Claude tévedésének javítása:** azt írtam, hogy „a hitelesítettek köre jóval kisebb",
> ezért ott a globális medián megoldható. **Nem igaz** — *(Csaba: „reményeim szerint több
> milliárdan lesznek a 2. lépcsőfokon")*. ⭐ **De nem is számít**, mert nem a SZÁMOLÁS volt
> a baj, hanem a **RANGSOR**: a *„felső harmadban vagy-e"* mindenki számát kívánja, a
> *„van-e legalább N"* csak a **saját szeletemet**.
>
> **A program szintjén:**
>
> - új esemény: `Felhatalmazas` — szerzője 2. lépcsős, `entitas` a **felhatalmazott**
>   szelete (nem a szerzőé), így a *„hányan hatalmazták fel X-et?"* **egyetlen
>   szelet-lekérdezés** (`szeletEsemenyei`, a 3.2 munkája);
> - a tanúsítói engedély **nem esemény, hanem SZÁMÍTÁS** (D17):
>   `tanusithat(X) = |X szeletében a KÜLÖNBÖZŐ, 2. lépcsős felhatalmazók| ≥ N`;
> - a szabály-rétegben: **emberenként egy** felhatalmazás számít, és a szerzőnek
>   2. lépcsősnek kell lennie.

> ### ⭐⭐ D61 (Csaba, 2026-09-06) — A BULI MINT KÉZBESÍTÉSI IGAZOLÁS
>
> *Csaba két mondata hozta:* **„ne tervezzük a koinót lassúra"** — és: *„nem mondtam le
> arról, hogy a buli alkalmával a közösség globálisan tudjon értékekben megegyezni, amit a
> készülékek szabályként fogadnak el."*
>
> ⚠️ **Claude ellenvetése részben hibás volt.** Azt mondtam, hogy a visszavonást azért nem
> lehet kemény szabállyá tenni, mert a lassú terjedés miatt nem tudjuk, ki mit kapott meg —
> és hogy ezen egy globális óra sem segítene, mert *„nem az óra hiányzik, hanem a
> kézbesítési igazolás"*. ⭐ **Az utolsó mondat igaz, de a következtetés nem: a buli
> ÉPPEN kézbesítési igazolás.**
>
> **A szerkezet, amiben ez működik:**
>
> - a bulikörben mindenki **aláírja, meddig lát** — ez **saját, aláírt állítás**, nem kívülről
>   ráerőltetett igazság;
> - ha a visszavonás **belül van** azon, amit valaki elismert, hogy látott, akkor a későbbi
>   ellentétes cselekedete **bizonyíthatóan hazug** → ⭐ **kemény szabály lehet**;
> - aki offline volt, **nem írt alá semmit** → rá nem vonatkozik, és nem is büntetjük
>   („nem ellenőrizhető", D19).
>
> ⛔ **AMI VISZONT NEM LEHET GLOBÁLIS: a teljes állapot ujjlenyomata.** A szeletelés
> (Szakasz 3) óta egyetlen készülék sem ismer minden eseményt, tehát „a közösség
> állapotának lenyomata" milliárdnál nem is számítható ki — arra építeni a 9. szabályt
> sértené. ⭐ **De nem is kell:** az elismerés **szeletenkénti** (*„a saját szeletemet eddig
> a pontig láttam"*), és pontosan az kell a tanúsításnál.
>
> ⭐⭐ **ÉS EZ AZ, AMI A HORGONYT ERŐSSÉ TESZI (9/c 4.5).** A horgony megmondja, meddig
> láttam; a **buli teszi rendszeressé és frissé**. Az elavult horgony így nem „gyanús",
> hanem **kilóg egy ritmusból, amit mindenki más tart** — egy kimaradás semmi, húsz kör
> kimaradása tanúsítgatás közben ordít.
>
> ⚠️ **Egy őrrel, amit a D47 már megad:** az esemény fagyassza magába, melyik paraméter-
> értékhez igazodott. Enélkül két készülék eltérő tudással MÁS szabályt alkalmazna ugyanarra
> az eseményre — és az a D49/a-t törné.
>
> ✅ **MEGÉPÍTVE (2026-09-06):** a horgony ÉS a buli-elismerés (`Lattam` esemény) is.
> ⭐⭐⭐ **És a megépítés közben derült ki, mitől lesz igazán erős:** a `Lattam` nem
> önmagában bizonyít, hanem azzal, hogy **a saját láncban VAN sorrend** (a `sorszam`, amit
> csak a szerző írhat). Ha egyszer aláírtam, hogy látom a visszavonást, akkor minden
> **későbbi** saját eseményem bizonyíthatóan azután keletkezett — **globális óra nélkül**.
> Ettől a „szándékosan régi horgonyt választok" trükk sem működik: horgony nélkül is
> elkapjuk. *(4 önpróba őrzi, köztük az, hogy a KÉSŐBBI elismerés nem hat a KORÁBBI
> tanúsításra — a (b) döntés sértetlen.)*

> ### ⭐ D60 (2026-09-06) — A FELHATALMAZÁS MEGBÍZÁS, NEM PONTSZÁM
>
> *Csaba felvetése: „az emberek a felhatalmazást valószínűleg becsületesség ismeretében
> fogják osztani. Talán még a neve is lehetne: becsületesség pont."*
>
> ⭐ **Amiben igaza van:** a név alakítja a viselkedést — a koino szótára amúgy is szándékos
> (e-ember, tudatpont). És valóban ez fog történni: az emberek jellem alapján osztanak.
>
> ⛔ **De a „becsületesség pont" névvel a program ÍTÉLETET mondana egy emberről**, és ezzel
> visszahozná azt, amit a **D18/1** kizárt (*„megbízom benne" → ❌*) és amit a **D49/b**
> tilt (*a jelzés tényt mutasson, soha ne ítéletet*). Egy nyilvános jellem-szám
> hírnév-rendszerré romlik: udvarolnak érte, kereskednek vele, büntetnek vele.
>
> ⭐⭐ **A feloldás ugyanaz a fogás, ami a „még nem értünk össze"-nél bevált** *(Csaba:
> „igazad van, elfogadom")*:
>
> - ⛔ **nem** *„becsületesség: 27"* — ez ítélet a személyről;
> - ✅ **hanem** *„27-en bízták rá a tanúsítást"* — ez **tény**, és nem róla szól, hanem
>   arról, amit **mások tettek**.
>
> ⭐ És a lényegi különbség megmarad: ez **egy szerephez szóló megbízás**, nem általános
> emberi érték-mérő — csak a tanúsításra vonatkozik, bármikor visszavonható, és nem tapad
> az emberhez.

> ### ⭐⭐⭐ D59 (Csaba, 2026-09-06) — AZ ELLENŐRZÉS MÉLYSÉGE KORLÁTOS
>
> *„Csak egy bizonyos lépésszámig kell ellenőrizni."*
>
> A *„2. lépcsős-e a felhatalmazó?"* kérdés rekurzív (az ő tanúsítói is ellenőrizendők, és
> így tovább). ⭐ **A válasz: rögzített `D` mélységig ellenőrzünk, azon túl nem.**
>
> ⚠️ **DE CSAK RÖGZÍTETT MÉLYSÉGGEL — ez a döntő részlet.** Ha mindenki *„addig ellenőriz,
> ameddig lát"*, akkor a kevesebb adattal rendelkező készülék MÁS eredményre jut, és
> **megdől a D49/a** (készülékenként más lesz, ki 2. lépcsős → szétesik a szavazatszámlálás).
> ⭐ Ha viszont `D` **közösségi paraméter** (érték javaslatok mediánja, mint `N`), akkor
> **mindenki pontosan ugyanannyit ellenőriz, tehát ugyanoda jut.**
>
> ⭐⭐ **És amit ez megszüntet:** eddig nyitott kérdés volt, *„milyen mély a lánc
> egymilliárdnál"* — **a korlát ezt tárgytalanná teszi.** A munka `D`-től függ, nem a
> közösség méretétől: a 9. szabály közvetlenül teljesül.
>
> ⭐ **A költség ráadásul egyszeri** (D47): akiről egyszer megállapítottuk, hogy 2. lépcsős,
> az **soha nem változik**, tehát a készülék eltárolja és nem számolja újra.
>
> #### ⚠️ Amit feladunk vele — és miért vállalható
>
> A `D`-nél mélyebben rejtőző csalás **véglegesen láthatatlan** marad. ⭐ **De ezt a D47-tel
> már úgyis feladtuk:** a befagyasztás szerint a múltat nem tárgyaljuk újra. A korlátos
> mélység ennek csak a **számítási megfelelője**, nem új engedmény.
>
> ⚠️ **A támadó ebből következő lépése:** *mélységet épít* — több generációnyi hamis
> tanúsítót, hogy a hamisság `D` alá kerüljön. ⭐ Ez viszont **generációnként** kíván `N`
> felhatalmazást 2. lépcsősöktől és **személyes, igazolvánnyal ellenőrzött találkozókat** —
> vagyis **lassú, drága és nyilvános**, és közben a **torlódás-jelzés** (11.13: 100% / 9–25%)
> végig látja. *A rétegzett védelem itt kapcsolódik össze.*

> ### ⚠️ D58 (Csaba, 2026-09-06) — EBBEN A VERZIÓBAN A PAPÍR NÉLKÜLI EMBERREL NEM SZÁMOLUNK
>
> A felhatalmazott tanúsító **kérheti az igazolványt** — *„okkal, hiszen több embert is
> képvisel"*. A **D45** betűje sértetlen (a tanúsítás egyetlen, egyforma mondat marad,
> nincs ráírva, hogy „igazolvánnyal ellenőrizve"), de a gyakorlatban ez azt jelenti, hogy
> **papír nélkül nem lesz pénztárca**.
>
> ⭐ **A hatóköre viszont SZŰK, és ezt fontos rögzíteni:** ez **csak a 2. lépcsőt** érinti.
> A papír nélküli ember **teljes jogú e-ember marad** — tartalmat hoz létre, tudatpontot
> oszt, javasol és **szavaz**. Csak pénztárcája nincs.
> ⚠️ *A D45 eredeti indoka (a befogadás) tehát az 1. lépcsőn továbbra is teljesül; a
> 2. lépcsőn tudatosan feladjuk.*

### ⏳ Amit ez még nem old meg

- **Mi szivárog ki egy séta közben?** A kiinduló megtudja a végpontokat; a közbenső látja,
  kitől kapta és kinek adta. Ez sokkal kevesebb egy térképnél, de **nem nulla** — külön
  végig kell gondolni, és mérni.
- **A séta üzenet-alakja** — új protokoll-kérdés a `vonal.js` mellé, a 3.4 mintájára.
- ✅ **„Mi van, ha a lista elvész?" — Csaba válasza (2026-09-05):** *„ez könnyen pótolható,
  újbóli bemutatkozással (viccesen). Vagy ha több készüléket is használ, akkor nem vész el.
  Meg felrakhatja ingyenes felhő-szolgáltatásba is."*
  ⭐ **És a tréfás rész a legkomolyabb:** a tengerben elfoglalt helyed **nem tárolt
  jogosultság, hanem élő tény** arról, kiket ismersz. A lista elvesztése a **feljegyzést**
  viszi el, nem a **kapcsolatokat** — és a feljegyzés újra keletkezik attól, hogy élsz.
  *(Ellentétben a kulccsal, aminek az elvesztése a D15 egész helyreállítási gépezetét
  igényli.)*
  **Gyakorlatban:** a lista legyen **fájlba menthető**, mint a kulcs (`mentes kulcs.json`)
  — és hogy a tulajdonos hova teszi a fájlt (másik készülék, pendrive, felhő), az **az ő
  dolga**. ⚠️ Így a 2. szabály sem sérül: a koino nem függ semmilyen szolgáltatástól, csak
  megengedi, hogy az e-ember használjon egyet.
  ⚠️ *(Nyitva marad: a saját több készülék között kell-e szinkron — az a SAJÁT adat
  másolása, nem terjesztés, tehát más kérdés, mint hogy a lista „sosem terjed".)*
- **És mérni kell:** a 8/d mérése a **tanúsítási** gráfon futott. A bemutatkozás sűrűbb és
  olcsóbb; elvileg **erősíti** a jelzést, de ez feltevés, nem mérés.

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

## 9/b. ⛔ A MEGÉPÍTÉS RÉGI TERVE (2026-09-05) — ELAVULT

> ⛔ **EZ A TERV A `k` TANÚSÍTÁSRA, A KERETRE ÉS A REKURZIÓRA ÉPÜLT** — mind a három kiesett
> 2026-09-06-án. **Az érvényes terv a 9/c.** ⭐ *Ami belőle átment: a 4.1 „a kanonikus alakot
> előbb" sorrend-elve, a szelet-illesztés (D52 → D57/b) és az, hogy a jelzés-réteg
> elhagyható. A D51 és a D53 tárgytalan.*

*Eddig a szakasz a **miért**-ről szólt. Ez a rész a **mit és milyen sorrendben** — a Szakasz 2
betűs lépéseinek és a Szakasz 3 számozott lépéseinek mintájára, hogy minden darab
külön-külön kipróbálható legyen.*

> ### A RENDEZŐELV, amit a 9. szabály diktál
>
> **Illesztés → megvalósítás → mélység.** Minden lépésnél ugyanaz a kérdés:
> 🔍 *„Ez mit csinál egymilliárd e-embernél?"* — és ha a válasz *„akkor majd kicseréljük"*,
> a lépés nincs kész. ⭐ A Szakasz 3 megtanított, hol bújik meg a hiba: **nem a
> fájlformátumban, hanem a KÉRDÉSBEN**, amit a tárnak felteszünk.

### ⭐ A rendezőelv második fele: mi kerül a LÁNCRA, és mi nem

A D49 és a D50 után a szakasz **két, élesen elváló félre** bomlik, és ezt a sorrend is
tükrözi:

- **4.1–4.4 — a LÁNC (a kemény mag).** Aláírt események, offline eldönthető, minden gépen
  ugyanaz. *Ez dönt, tehát soha nem kívánhat élő lekérdezést.*
- **4.5–4.8 — a MÁSODIK RÉTEG (a feltárás).** Jelzés és bemutatkozás: helyi, élő,
  **elhagyható**. *Ez nem dönt, tehát szabad élő kapcsolatot kívánnia.*

⚠️ **A két fél között nincs átjárás lefelé:** a második réteg semmilyen eredménye nem
befolyásolhatja azt, hogy ki e-ember. Ha valaki mintát lát, az útja a **D46** — bizonytalanra
jelölés és gondolat —, nem egy automatikus következmény.

---

### 4.0 ⚠️ DÖNTÉS ELŐTT — két kérdés, ami nélkül nem lehet kódot írni

**(a) Mennyi `k`, és ki állítja?** A **D13/c** szerint a koino-szintű paraméterek maguk is
entitások, tehát a közösség állítja (medián, D4). ⚠️ De induláskor nincs közösség, aki
állítsa — kell egy **alapítói érték**, amit a koino-létrehozás eseménye rögzít.

**(b) A K14: mekkora méret fölött kapcsoljon be a szabály?** ⛔ **Ezt a kérdést így nem
szabad feltenni** — mert *„mekkora méret"* maga is **globális szám** (`N`), és ugyanazon a
9. szabályon bukna el, mint a Duniter-alak. Egyetlen készülék sem tudja megmondani, hányan
vagyunk.

> #### ⭐ D51 (javasolt) — A BEKAPCSOLÁS NEM MÉRET-FÜGGVÉNY, HANEM PARAMÉTER: `k = 0`
>
> A kis koino nem *„kikapcsolja"* az identitás-réteget, hanem **`k = 0`-val futtatja** —
> ugyanaz a kód, ugyanaz a szerkezet, csak a küszöb nulla. A **D18/0** ekkor pontosan igaz:
> *tudod, ki valódi, mert ismered.* Amikor a koino nő, a közösség **felemeli a `k`-t** — és
> a **D47** miatt ez **előre hat**: aki `k = 0` mellett lépett be, bent marad.
>
> ⭐ **Ezzel a K14 megszűnik nyitott kérdés lenni**, és a családi koino nem külön üzemmód
> (a D22 *„egy program, ami nő"* mondata így lesz kódban is igaz).
>
> ⚠️ **Amit vállalunk vele:** a 🔴 **közepes zóna** nem tűnik el — a `k` emelése emberi
> döntés, és el lehet késni vele. A D49 óta viszont **látszik**, hogy hol tartunk, ahelyett
> hogy egy képlet eltakarná.

---

### 4.1 A TANÚSÍTÁS MINT ESEMÉNY — és hova kerül a szeletelt tárban

**Ez a szakasz legveszélyesebb lépése**, ugyanabból az okból, amiért a 3.1 az volt: a
kanonikus alakot érinti, és **utólag drága**.

**Az új esemény-típus — `Tanusitas`:**

- `szerzo` — a **tanú** (ő írja alá);
- ⭐ `entitas` — **a tanúsított belépési eseményének azonosítója**, vagyis **a tanúsított
  szelete**, NEM a tanúé;
- `entitasSorszam` — hányadik eseményem ezen a szeleten *(a hézag itt is jel)*;
- `latott` — a horgony: mit ismertem, amikor aláírtam *(ez a D47 befagyasztás alapja)*;
- `adat: { kit, kiadott, k, keret }` — ahol `kit` a tanúsított nyilvános kulcsa, a többi
  három **bemondott érték** (lásd lent).

> #### ⭐⭐ D52 (javasolt) — A TANÚSÍTÁS A TANÚSÍTOTT SZELETÉBE KERÜL
>
> A tanúsítást a **tanú írja alá**, de az esemény **a tanúsított szeletében él**. Ettől lesz
> a keret *kapott* fele **egyetlen, korlátos lekérdezés**: `szeletEsemenyei(koino, szelet)` —
> pontosan az a kérdés, amit a **3.2** tett skálázhatóvá.
>
> 🔍 **Egymilliárd e-embernél:** a kérdés *„ki tanúsított engem?"* — a válasz **egy szelet**,
> néhány tucat esemény. Soha nem kell végigolvasni sem a koinót, sem a tanúk láncait.
>
> ⚠️ **Amit ez a szerkezettől kap ingyen:** a szelet a **belépési eseményhez** kötődik, az
> pedig **koinónként külön** (D25: *az azonosság közös, a jogosultság helyi*) — vagyis
> ugyanaz a kulcs két koinóban két külön szeletet gyűjt, külön `k`-val. Ez nem külön
> mechanizmus, hanem a meglévő szeletelés következménye.

**A három bemondott érték — a D42 mintája, háromszor:**

- `kiadott` — **hányadik tanúsítás ez tőlem** ebben a koinóban. Ettől lesz a keret *adott*
  fele **egyetlen eseményből** ellenőrizhető, teljes lánc nélkül. Aki hazudik, annak két
  saját aláírt eseménye mond ellent egymásnak → **átadható bizonyíték**, nem hiány.
- `k` — **a belépési minimum, amit a tanú látott**. Ez fagyasztja be a D47-et: a számítás
  nem azt kérdezi, *„megfelel-e a mai szabálynak"*, hanem hogy **megfelelt-e az akkorinak**.
- `keret` — **mennyi volt a tanú kerete az aláíráskor**, saját bemondás szerint. ⚠️ Ez a
  legvitatottabb a három közül — a 4.3 tárgyalja, miért kell mégis.

⚠️ **Amit NEM tartalmaz** (D45): semmilyen jelzés arról, **hogyan** győződött meg a tanú.
Egy mondat, egyforma mindenkinél — különben a papír nélküli ember kiszorul.

**Mérés ehhez a lépéshez:** rontás-próbák a bemondott értékekre (a 10. szakasz 1–3. pontja),
és a **méret** újramérése — a 3.1 tanulsága szerint a becslés alábecsül (`478 → 611` bájt
volt a jóslat 11%-a helyett 28%).

---

### 4.2 A KERET ELLENŐRZÉSE — és a szabály-réteg illesztése

⛔ **Itt van a lépés, ahol a 9. szabály elkapja a kényelmes megoldást.** A mai
[`szabalyok.js`](../koino/js/allapot/szabalyok.js) **egy tömböt kap**, és szerzőnként
csoportosít — mert eddig minden szabály a **saját láncban** dőlt el. A keret *kapott* fele
viszont **más emberek eseményeiből** jön. Ha ezt úgy oldanánk meg, hogy a réteg megkapja az
összes eseményt, azzal visszahoznánk a `betolt()`-öt — csak más néven.

**Az illesztés, amit javaslok:**

```
szabalyokErvenyesitese(esemenyek, { szeletek })
```

— vagyis a szabály-réteg **előre lekérdezett szeleteket** kap, nem tárat és nem
lekérdező-függvényt. Három okból:

- **marad tiszta függvény** — szinkron, determinisztikus, próbázható, ahogy ma is;
- **nem importál tár-kódot** — ugyanaz az elv, mint az 1. szabálynál a `csere.js`-nél;
- ⭐ **a lekérdezés ott marad, ahol a mélység cserélhető** (a tár-illesztőben), tehát a
  memóriában tartott mutató később indexre váltható **a szabály-réteg érintése nélkül**.

**A szabály maga**, a tanú saját láncában (ahol minden mai szabály is eldől):

`keret = kapott − k − eddig_adott`, nullára padlózva — és aki nulla kerettel tanúsít, annak
**az az egy esemény** esik ki, semmi más (D19: nem törlünk, nem büntetünk).

**Mérés:** a 10. szakasz **1–3/b** pontja, mind a négy rontás-próbával. ⚠️ *A 3. és a 3/b
csak együtt érvényes:* az egyik a támadót fogja meg (a kölcsönös gyűrű nulla keretet
termel), a másik azt bizonyítja, hogy **közben nem fagyasztottuk be a koinót** (ötven
megállapodott tag tanúsít egy frisset → a kerete 50 legyen).

---

### 4.3 ⚠️ DÖNTÉS ELŐTT — a rekurzió, amit fel kell oldani

**A probléma, pontosan.** Egy tanúsítás érvényessége a tanú keretén múlik. A tanú kerete a
*neki* adott tanúsításokon. Azok érvényessége az ő tanúik keretén. **Ez visszafelé a
láncon végig ugyanaz a kérdés** — egymilliárdnál nyilvánvalóan járhatatlan, de már ezernél
is az, mert szeletelt tárban **a tanú szeletét nem is ismerjük feltétlenül**.

⚠️ **És van egy második baj, ami súlyosabb:** ha a hiányzó szelet miatt nálam a tanúsítás
kiesik, nálad meg nem, akkor **készülékenként más lesz, ki e-ember** — és megdől a **D49/a**,
vagyis a szavazatszámlálás szétesik.

> #### ⭐⭐ D53 (javasolt) — A KERET A KIADÁS OLDALÁN KEMÉNY, A BEFOGADÁS OLDALÁN JELZÉS
>
> - **Kemény, és a tagságról dönt:** van-e `k` érvényes aláírás a szeleten, olyan tanúktól,
>   akik **akkor** tagok voltak, a **befagyasztott** `k` szerint (D43 + D47). ⭐ Ez
>   **egy szint mély**, nem rekurzív: a szelet eseményeiből eldől.
> - **Jelzés, és a tagságot nem dönti el:** a bemondott `keret` és `kiadott` értékek
>   ellenőrzése. Ha a tanú szelete megvan és a bemondás ellentmond neki → ⭐ **bizonyított
>   hazugság, átadható bizonyítékkal**. Ha nincs meg → **„nem ellenőrizhető"**, a
>   `szabalyok.js` harmadik kategóriája — *nem vád, mert akkor a hiány a MI lemaradásunk.*
>
> ⚠️ **Ez így nem automatikus védelem, és ezt ki kell mondani.** A keret nem *akadályozza
> meg* a túllépést, hanem **lelepleződővé teszi** — ami pontosan a D49 fordulata (*nem tilt,
> hanem feltár*), a D17/D19 mintája, és ugyanaz, amit a **D26** csinál a fájlmérettel.
> A leleplezett tanúsítás útja onnan a **D46**: bizonytalanra jelölés + gondolat.
>
> ⛔ **A megmaradó rés — nyíltan:** a **szelektív mutogatás**. Aki a saját láncából elrejt
> eseményeket, annál a bemondás átmenetileg „nem ellenőrizhető" marad. Ez ugyanaz a rés,
> amit a `szabalyok.js` a tudatpontnál már kimond — nem új, és nem is oldható meg
> szigorúbb ellenőrzéssel, csak **több tudással** (a csere hozza).

⚠️ **Ez a szakasz eddigi legfontosabb eldöntetlen pontja.** A HOL TARTUNK a **keretet a
kemény magban** sorolja (D44), a D49/a viszont csak a `k` tanúsítást és a befagyasztást
nevezi keménynek. **A kettő között a D53 választ** — és ez Csaba döntése, nem az enyém.

---

### 4.4 A TAGSÁG MINT SZÁMÍTÁS — és a bizonytalanra jelölés

**Új darab:** `js/allapot/identitas.js` — *„ki e-ember ebben a koinóban?"*, tisztán a
szeletekből számítva. ⚠️ **Nem esemény:** senki nem mondja ki, hogy valaki tag — ugyanúgy
**számítás**, ahogy az egyezmény (D17).

**És a `BizonytalanraJeloles` esemény (D46):** a tanú nem vonhat vissza, hanem jelölhet — az
esemény **ugyanabba a szeletbe** kerül, mint a tanúsítás, és **létrehozhat mellé egy
gondolatot** *(ma: „tartalom")*, amivel megosztja a felelősséget a közösséggel. A
szabály-réteg **nem törli** tőle a tanúsítást: bemenet lesz egy nyilvános, megtámadható
döntésbe.

**Mérés:** a 10. szakasz **4.** (befagyasztás mindkét irányban) és **5.** (objektivitás).
⭐ Az 5. a `vizsgaProba.js` mintája identitásra alkalmazva, és **ez a lépés vizsgája**:
két készülék, eltérő szeletekkel, **ugyanazt mondja arról, ki e-ember** — miközben a
*jelzésekben* szabad eltérniük.

---

### 4.5 A JELZÉSEK — a feltárás, tény-alakban

*Innen kezdődik a második réteg: semmi, ami itt születik, nem dönt a tagságról.*

**Amit egy e-emberről mutatunk** (mind **tény**, a láncból bárki újraszámolja): hányan
tanúsították · milyen **ütemben** (tizenkét tanúsítás egy órán belül, vagy egy év alatt négy
városból) · mennyire **megállapodottak a tanúi**. **Amit a koinóról:** torlódás a tanúkon ·
az *„egy körből született"* arány · a legszűkebb átvágás.

⛔ **A három védőkorlát (D49/c) itt válik kóddá, nem jószándékká:** nincs személyre szóló
pontszám, nincs rangsor, nincs piros jelzés · a jelzés **tájékoztat, nem jogosít** (N9) ·
az **összesített nézet a koinóról szól**, nem emberekről.

⛔ **És egy jelzés, amit tilos beépíteni:** a *„kevés kapcsolata van, tehát gyanús"* —
háromszor mérve **31 / 41 / 45%** becsületes tagot jelölne meg tévesen, épp a magányost és a
frissen érkezettet.

**A megvalósítás módja:** a `szigetMeres.js`-ben **már megmért** jelzések átemelése a valódi
kódba, **ugyanazokkal a számokkal** — hogy a mérés és a program ne csússzon szét.

---

### 4.6 A BEMUTATKOZÁS HELYI LISTÁJA (D50)

**Új darab:** `js/bemutatkozas/lista.js` — és **a mintája adott**: a
[`tarsak.js`](../koino/js/csere/tarsak.js), amiről a saját kommentje mondja ki, hogy *„helyi
megfigyelés — sosem terjed, és semmit nem dönt el a koinóban."*

- **nem esemény**, nem megy a láncra, nem megy át a cserén (D6, D14);
- a `koino-adat/` mappában él, a `tarsak.json` mellett;
- **elévül** és **eldobható** — ha elvész, újra lehet mutatkozni *(Csaba: „ez könnyen
  pótolható… viccesen")*; ⭐ a tréfás rész a komoly: a tengerben elfoglalt helyed **nem
  tárolt vagyon**, hanem élő viszony.

---

### 4.7 A SÉTA ÜZENET-ALAKJA (K17) — az 1. szabály szerint kettéosztva

⭐ **Ugyanaz a kettéosztás, ami a Szakasz 2-t megmentette:** a `csere.js` sosem importált
hálózati kódot, ezért a UDP-re állás a **logikát** nem érintette. Itt is:

- `js/bemutatkozas/seta.js` — **a séta logikája, hálózat nélkül**: hány lépés, hogyan
  választ véletlen következőt, mikor szól vissza a végpont, hogyan áll össze a
  **darabszám** a nevek nélkül. Önpróbázható TCP nélkül.
- a **szállítás** a `vonal.js` **mellé** kerül, új üzenet-típusként — a 3.4
  böngésző-lekérés (`SZELETKEREK`) mintájára, ami már bizonyította, hogy a szimmetrikus
  párbeszéd **visszafelé kompatibilisen** bővíthető.

⚠️ **Két dolog, amit itt nem szabad elrontani:**

- ⛔ **A séta nem hoz bizalmat** (3. szabály). Nem esemény, nem megy az `esemenyMentese`
  kapun — és semmi, ami a sétából jön, nem lehet bemenete egy döntésnek.
- ⭐ **Elhagyható** (2. és 4. szabály): ha a séta nem fut le, **csak a jelzést nem látod**, és
  semmi más nem áll meg. Ezt a próbának is bizonyítania kell — *futtassuk a koinót úgy, hogy
  a séta ki van kapcsolva, és minden más menjen változatlanul.*

⭐ **És egy egybeesés, ami nem véletlen:** a séták akkor futnak végig, amikor mindenki
egyszerre ébren van — vagyis **a buliban**, az összehangolt ötperces ablakban. Az a
szerkezet pontosan ehhez való.

---

### 4.8 MI SZIVÁROG EGY SÉTA KÖZBEN (K18) — mérés, nem kód

A kiinduló megtudja a **végpontokat**; a közbenső látja, **kitől kapta és kinek adta**.
Ez sokkal kevesebb egy térképnél, de **nem nulla**.

**Javaslat, amit mérni kell:** a séta **ne vigye a kiinduló kilétét** — csak egy egyszer
használatos jelet —, és a végpont **arra a jelre** feleljen. Így a *„hány ponton érünk
össze"* kiszámolható úgy, hogy a nevek egyik oldalon se álljanak össze.

⚠️ **És a 8/d feltétele is mérendő marad:** a jelzés azon áll, hogy a valódi társas háló
**„kis világ"** — egy teljesen elszigetelt közösségnél gyengébb.

---

### 4.9 A `lancGyoker` — a lefoglalt hely kitöltése

Az [`esemeny.js`](../koino/js/esemeny/esemeny.js) kommentje **név szerint erre a szakaszra**
utalja a döntést: a mező ma mindig `null`, és *„egy mező, aminek nincs fogyasztója, ROSSZ
DEFINÍCIÓT kap"*.

**A jelölt jelentés:** összegző Merkle-gyökér a szerző egész addigi láncára. ⭐ Ettől a
**kettős lánc** bizonyítéka túlélné az összenyomást: aki elágazik, két különböző gyökeret
kötelez el magára, és **a két saját aláírt állítása mond ellent egymásnak** — ugyanaz az
alakzat, mint a D42-nél.

⚠️ **Ez a lépés a legkésőbbre való**, mert csak akkor szabad kitölteni, ha **van fogyasztója**
— vagyis ha a 4.1–4.4 után látszik, hol kérdezi meg valaki. Ha nem lesz fogyasztó, a
tisztességes válasz az, hogy **kimondjuk: nem kell** *(a mező akkor is maradhat `null`-on —
kivenni drágább, mint bennhagyni)*.

---

### ⭐ A SORREND INDOKLÁSA — miért pont így

- **4.1 az első**, mert a kanonikus alakot érinti, és az **utólag drága** (a 3.1 ezt már
  megtanította). Amíg kevés a valódi esemény, most olcsó.
- **4.2–4.3 közvetlenül utána**, mert az illesztés (nem a megvalósítás!) itt dől el — és a
  9. szabály szerint az illesztésnek az első naptól milliárdosnak kell lennie.
- **4.4 zárja a kemény magot**, és ez az a pont, ahol a szakasznak **vizsgája** van: két
  készülék ugyanazt mondja arról, ki e-ember.
- **4.5–4.8 a második réteg**, és **bármikor elhagyható**. ⭐ Ha itt megállnánk, a koino
  akkor is működne — kevesebbet látnánk, semmi nem törne el.
- **4.9 a legvégén**, mert csak a fogyasztója ismeretében definiálható helyesen.

⭐ **És az első valódi mérföldkő nem a szakasz végén van:** a **4.4** után, `k = 0`-val
(D51), **egy család vagy egy osztály élesben használhatja** — helyes, milliárdos
szerkezettel, csak kevesebb emberrel (D22). A `k` felemelése onnantól a közösség döntése,
és a D47 miatt **előre hat**.

---

---

## 9/c. ⭐⭐⭐ A MEGÉPÍTÉS TERVE (2026-09-06) — EZ AZ ÉRVÉNYES

*A 09-06-i átépítés után. A régi 9/b elavult; ez a D54–D60 szerkezetére épül, és minden
lépése mögött ott van a 11–12. mérés.*

> ### ⭐ AMI EBBŐL A LEGJOBB HÍR: A KANONIKUS ALAK NEM VÁLTOZIK
>
> A régi terv első és legveszélyesebb lépése a **kanonikus alak bővítése** volt. ⭐ **Erre
> most nincs szükség:** a meghívás, a felhatalmazás és a tanúsítás **mind belefér a meglévő
> burkolatba** — új `tipus`, és az `entitas` mező a címzett szeletére mutat. *A 3.1-ben
> megépített négy mező pontosan elég.* ⚠️ **A legveszélyesebb részletet tehát nem nyitjuk
> fel újra.**

### 4.1 A MEGHÍVÁS, ÉS A TAGSÁG MINT SZÁMÍTÁS

**Új esemény:** `Meghivas` — szerzője tag, `entitas` a **meghívott** szelete,
`adat: { kit }`.

**A tagság nem esemény, hanem SZÁMÍTÁS** (D17): *van-e a szeletemben legalább egy meghívás
olyantól, aki a meghívás pillanatában tag volt.* 🔍 **Egymilliárdnál:** egy
`szeletEsemenyei` hívás — a 3.2 munkája.

⭐ **Az alapító kör** a koino-létrehozás eseményéből jön: ők meghívás nélkül tagok. Ez a
**rekurzió alapesete**, nem kivétel — nincs szükség méret-figyelésre.

### 4.2 A LÁNC BEJÁRÁSA — a gyökérig, gyorsítótárral

*„Tag volt-e a meghívó?"* visszafelé kérdés. ⭐ **Mérve olcsó** (12.2): 1500 főnél 17,7,
20 000-nél 40,7 ős — **logaritmikus**, kettőzésenként ≈ +6.

- **A gyorsítótár a lényeg:** mindenkit **egyszer** nézünk meg, és a **D47** miatt az
  eredmény **örökre áll** — nem kell újraszámolni.
- **A `D` mélység-korlát** (D59) marad **elhagyható szelepként**, arra az esetre, ha
  szeletek hiányoznak.
- ⚠️ Amit nem látunk, arra **nem mondunk vádat**: „nem ellenőrizhető" (a `szabalyok.js`
  harmadik kategóriája), nem elutasítás.

### 4.3 A FELHATALMAZÁS ÉS A TANÚSÍTÁS — a 2. lépcső

**Két új esemény, mindkettő a CÍMZETT szeletében** (ettől lesz a számlálás korlátos):

- `Felhatalmazas` — szerzője **2. lépcsős**; emberenként **egy** számít;
- `Tanusitas` — szerzője **felhatalmazott tanúsító**; **három** kell a 2. lépcsőhöz.

**Két számítás, nem esemény:**

```
tanusithat(X)  = |X szeletében a KÜLÖNBÖZŐ, 2. lépcsős felhatalmazók|  ≥  N
lepcso2(X)     = |X szeletében a KÜLÖNBÖZŐ, tanúsítható tanúsítók|     ≥  3
```

`N` a **paraméter-entitásra** adott érték javaslatok mediánja (D57/b) — **kimondott szám,
nem mért rangsor**. 🔍 *Egymilliárdnál:* egyik sem kíván globális tudást.

⚠️ **A felületen a felhatalmazás TÉNYKÉNT jelenik meg** (D60): *„27-en bízták rá a
tanúsítást"* — soha nem pontszámként.

### 4.4 ⭐⭐ A KONTRASZT-JELZÉS — ez a valódi védelem

**A legerősebb és a legolcsóbb darab** (11.13, 12.5): *„hány olyan embert tanúsítottál
vagy ismersz, akinek nincs önálló élete a közösségben?"* — becsületes alapvonal **0,3**,
megvett tanúsítóé **több száz**.

- **Nem kell hozzá séta, se élő kapcsolat** — helyi számítás a saját és a szomszédos
  szeletekből, amit a **D55** nyíltság tesz lehetővé;
- **tény-alakban jelenik meg**, és a személyes változata a *„MÉG NEM ÉRTÜNK ÖSSZE"* (D55) —
  szimmetrikus és **önjavító**;
- 🔍 **Egymilliárdnál:** az ismerőseim ismerőseinek darabszáma — korlátos.

### 4.5 A VISSZAVONÁS ÚTJA — és amit a programnak NEM szabad megtennie

⭐ **A mérés törvénye** (12.5): *kár = a támadó üteme × az ébredés ideje* — **lineáris**.
Ezért a program dolga **az ÉSZREVÉTEL gyorsítása**, nem a döntés:

- ✅ **a program azonnal MUTASSA** a jelzést;
- ⛔ **a program SOHA ne vonjon vissza magától** — az út a **D46**: bizonytalanra jelölés,
  gondolat, javaslat, egyezmény. A felhatalmazás visszavonása **emberi döntés**;
- ⭐ mérve: a visszacsatolás **880 → 120**-ra viszi a kárt, és **egyetlen becsületes**
  tanúsító sem veszíti el a szerepét.

### 4.6 ✅ A BEMUTATKOZÁS — LÁNC-ESEMÉNY, KÖLCSÖNÖSEN (D62, 2026-09-06)

> ⚠️ **A TERV EREDETI ALAKJA (helyi lista, sosem terjed) MEGVÁLTOZOTT.** Így szólt: *„a
> `tarsak.js` mintájára: helyi, sosem terjed, elévül, eldobható (D50)."*

⭐⭐ **Csaba felülírta (2026-09-06):** *„miért probléma a társas térkép? Nem mondtam olyat,
hogy ezt el kell kerülni… épp az rajzolná ki a tengert."*

⚠️ **És igaza volt abban is, hogy ez nem az ő korlátja volt:** a *„ne legyen belőle társas
térkép"* aggály a **8/e-ben Claude-tól** származik, nem tőle — az ő álláspontja végig az
volt, hogy ez **közlés, nem megfigyelés**, és a **D55** ezt meg is erősítette.

> ### ⭐⭐ D62 (Csaba, 2026-09-06) — A BEMUTATKOZÁS LÁNC-ESEMÉNY, ÉS CSAK KÖLCSÖNÖSEN SZÁMÍT
>
> - **Lánc-esemény**, a másik szeletébe — mint minden más állítás (D52/D57/b mintája). Ezzel
>   a **D50** hordozó-döntése **felülírva**.
> - ⭐⭐ **KÖLCSÖNÖS, vagy sehogy.** Egyoldalúan bárki bármit állíthat — ha az számítana, a
>   támadó **ingyen gyártana sűrűséget**, pont azt, amit a kontraszt-jelzés keres. Amíg a
>   másik fél nem írta alá, az állítás **függőben** van, és **egyik oldalon sem** számít.
> - ⭐ **A kölcsönösség ellenőrzéséhez nem kell új lekérdezés** — két meglévő kérdés
>   metszete: *„ki állította, hogy találkozott velem?"* (a szeletem) és *„kiről állítottam
>   én ugyanezt?"* (a saját láncom).
>
> #### ⚠️ Amit tisztázni kellett: a térkép nem menti meg a sétát
>
> A séta nem azért omlott össze (11.12–11.13), mert pontatlanul mintavételez, hanem mert sok
> megtévesztettnél a hamisak **tényleg össze vannak kötve** a valódi világgal. Egy pontos
> térkép ugyanazt mondaná. ⭐ **A valódi haszon máshol van:** a **kontraszt-jelzés** eddig a
> lánc RITKA gráfján futott (1-2 szál egy frissen érkezettnek, 1 egy üres azonosságnak — és
> épp ez volt a 9–25% téves megjelölés oka). A bemutatkozásokkal a valódi embernek **több
> tucat** szála lesz, a hamisnak nem: **a különbség kinyílik.**
>
> #### ⭐ És a lépték nem esik el
>
> A **Szakasz 3 szeletelése** miatt fejenként pár száz esemény a **saját szeletben** (pár
> száz kilobájt), és **senki nem tárolja az egészet** — csak azt kéred le, akire ránézel.
> *Ez a szeletelés haszna, most először egy új adatfajtán.*

Mellette a **készülék-felfedezés mint segéd** (D54): *javasol*, az ember *dönt* — ez teszi a
műveleteket használhatóvá, mert egy 43 karakteres horgonyt senki nem gépel be.

### 4.7 ⛔ A SÉTA — ELVETVE (2026-09-06, Csabával közösen)

**Ne induljon el rajta újra egy friss session.** Két, egymástól független ok:

1. ⛔ **Mérve gyenge** (11.12–11.13): sok megtévesztettnél **43–74% / 31–61%** — vagyis
   érdemben használhatatlan. *A séta a leggyengébb láncszem, nem a legerősebb.*
2. ⭐⭐ **És az eredeti szerepe megszűnt.** A séta azért létezett, hogy **térkép nélkül**
   lehessen megmérni, összeérünk-e. A **D62** óta viszont a bemutatkozások **a láncon
   vannak** — a kapcsolat-kérdés **közvetlenül kiszámítható, offline, séta nélkül.**

⚠️ **Ami maradna neki:** elérni olyanokat, akiknek a szeletét nem tartjuk. ⭐ De arra már van
eszköz — a **3.4 böngésző-lekérés** (`hozd`) célzottan elhozza, amire ránézünk. A séta tehát
nem az egyetlen út, csak a bonyolultabbik: **élő kapcsolatot kíván**, és gyengébb jelzést ad.

> ⭐ **A gondolat mégsem volt hiába: a TENGERBŐL JÖTT A KONTRASZT.** Csaba
> „BEMUTATKOZÁS"-ötlete (8/d) vezetett oda, hogy a sűrűséget kell nézni — és amikor a séta
> elbukott a mérésen, a helyén ott maradt a **kontraszt-jelzés**, ami ma a védelem.
> *A történet marad; a kód nem készül el.*

### 4.8 ⏸️ A `lancGyoker` — A JELENTÉSE RÖGZÍTVE, A MEGVALÓSÍTÁS KÉSŐBB

Az [`esemeny.js`](../koino/js/esemeny/esemeny.js) mezője ma mindig `null`, és a saját
kommentje mondja ki, miért: *„egy mező, aminek nincs fogyasztója, ROSSZ DEFINÍCIÓT kap."*

⭐⭐ **2026-09-06-tól van fogyasztója**, és épp a legfrissebb darab miatt. A **D61**
(`Lattam`) egész ereje azon áll, hogy **a saját láncban van sorrend**: ha egyszer aláírtam,
hogy látom a visszavonást, a későbbi eseményeim bizonyíthatóan utána vannak.

⚠️ **Ezt egy dolog tudná megtörni: ha valaki KETTÉÁGAZTATJA a saját láncát.** Egyik ágon
aláírja, hogy látta; a másikon nem. Ma ezt az `elagazasE` fogja meg — **de csak ha mindkét
eseményt tartjuk**, a szeletelés óta viszont gyakran csak egy darabot tartunk.

> ### ⏸️ D63 (2026-09-06) — A `lancGyoker` JELENTÉSE: gördülő elköteleződés a saját láncra
>
> Minden esemény egyetlen lenyomattal elkötelezi magát a szerző **egész addigi láncára**.
> ⭐ Ettől a **kettős lánc bizonyítéka túléli a szeletelést**: két különböző ágból származó,
> **későbbi** esemény is ellentmond egymásnak, akkor is, ha az elágazás pontját nem tartjuk.
>
> **De a megvalósítás NEM most jön**, három okból:
>
> - a mező **bennhagyása ingyen van**, a kivétele viszont drága (a kanonikus alak mindenkinél
>   változna) — tehát semmit nem veszítünk a halasztással;
> - a fogyasztója megvan, tehát a **definíció most már helyesen** megfogalmazható (épp ezt
>   várta ki az `esemeny.js` kommentje);
> - ⚠️ de **nincs mérésünk arról, hogy sürgős**, a megvalósítás pedig valódi munka (gördülő
>   Merkle-gyökér a saját láncon, és az ellenőrzése).
>
> ⭐ **Ez pontosan a 9. szabály alakja:** a **szerkezet és az illesztés kész** (a mező ott
> van, a jelentése rögzített), **a megvalósítás mérés alapján jön.**

### ✅ A 9/c LEZÁRVA (2026-09-06)

| lépés | állapot |
|---|---|
| **4.1** belépés, meghívás, tagság-számítás | ✅ megépítve |
| **4.2** a lánc bejárása gyorsítótárral | ✅ megépítve |
| **4.3** felhatalmazás, tanúsítás, 2. lépcső | ✅ megépítve |
| **4.4** a kontraszt-jelzés | ✅ megépítve |
| **4.5** a visszavonás + a horgony + a buli-elismerés (D61) | ✅ megépítve |
| **4.6** a bemutatkozás lánc-eseményként (D62) | ✅ megépítve |
| **4.7** a séta | ⛔ **elvetve** |
| **4.8** a `lancGyoker` | ⏸️ **definiálva (D63), megvalósítás később** |

**Megépült:** `js/allapot/identitas.js` (a három kérdés) · `js/allapot/jelzesek.js` (a
jelzések) · hat új művelet a `muveletek.js`-ben · **50 önpróba** az
`identitasProba.js`-ben. ⭐ **A kanonikus alakot nem kellett felbontani.**

### ⭐ A SORREND INDOKLÁSA — és ami közben megváltozott

**4.1–4.3 a LÁNC** (offline dönt) · **4.4–4.5 a JELZÉS ÉS A KÖVETKEZMÉNY** (ez a valódi
védelem) · **4.6 a bemutatkozás**, ami ⭐ **a tervezettnél többet ad**: a kontraszt-jelzés
gráfját sűríti · ⛔ **4.7 elvetve** · ⏸️ **4.8 definiálva**.

⭐ **És az első valódi mérföldkő a 4.2 után van:** meghívásos tagság + a lánc ellenőrzése
= **egy család vagy egy osztály élesben**, pénztárca nélkül. A 2. lépcső akkor jön, amikor
a pénz is.

## 10. ⚠️ MÉRÉS — a régi terv próbái *(nagyrészt TÁRGYTALAN)*

> ⛔ **Az 1–5. pont a keret-szabályt bizonyította volna — az kiesett.** ⭐ **Amit a 09-06-i
> mérések a helyükbe tettek** (11–12. szakasz): a belépési szám ára, a jogosítás rejtő
> hatása, a három lencse, a lánc alakja és a visszacsatolás törvénye. **Csaba lezárta:**
> *„eleget mértünk."*

### A régi lista (megőrizve)

*A projekt módszertana: minden állítás mellé mérés. Ezek a próbák még nincsenek megírva.*

> ⭐ **ÁLLAPOT (2026-09-05): az 1–5. pont MEGVAN**, a `szigetMeres.js`-ben, három támadóval
> (hangos · óvatos · alapos) — jegyzőkönyv: [`eredmenyek.md`](../koino/meres/eredmenyek.md)
> 1–10. szakasz. ⚠️ **A 6. (méret) még hátra van**, és hátra van a mérés megismétlése egy
> **valódi bemutatkozás-gráfon** — eddig a tanúsítási gráfon futott.

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
| ~~**K12**~~ | ~~Milyen legyen a horgony-halmaz?~~ | ⛔ **TÁRGYTALAN.** A „m független horgony-tanú" alak **mérve elbukott** ([`eredmenyek.md`](../koino/meres/eredmenyek.md) 7.): a becsületesnek nehéz, a támadónak könnyű, és **a kört elfoglalja** (880 hamis horgony). ⭐ **És már nem is kell:** a tenger-jelzés (8/d) **nem mér kitüntetett ponthoz** — épp ezért nem foglalható el |
| ~~**K13**~~ | ~~Milyen út-feltétel kerüljön a keret mellé?~~ | ⛔ **TÁRGYTALAN**, ugyanezért. A helyére a **véletlen séta** lépett, ami nem egy ponthoz, hanem a **tengerhez** mér |
| ⏸️ ~~**K17**~~ | ~~A séta üzenet-alakja~~ | ⏸️ **LEMINŐSÍTVE (2026-09-06):** a séta **nem védelem** (11.12–11.13), tehát az üzenet-alakja már nem sürgős. **9/c, 4.7** — utolsóként, ha egyáltalán |
| ⏸️ ~~**K18**~~ | ~~Mi szivárog ki egy séta közben?~~ | ⏸️ **A K17-tel együtt leminősítve.** ⚠️ A kérdés viszont **áthelyeződött**: a **D55** nyíltság-döntés után nem a séta szivárgása a kérdés, hanem hogy a **nyilvános bemutatkozás** lánc-esemény legyen-e vagy nyilvános-de-helyi (lásd D55 zárómondata) |
| ~~**K16**~~ | ~~Hogyan indul el a horgony-kör?~~ | ⛔ **TÁRGYTALAN** — nincs horgony-kör (K12). *A kérdés maga hasznos maradt: ő buktatta ki, hogy a „több független körből" feltétel a tudatos hálózatépítőt jutalmazza.* |
| ~~**K14**~~ | ~~Mekkora méret fölött **kapcsoljon be** a szabály?~~ | ⛔ **A KÉRDÉS ROSSZ VOLT** (9/b, 4.0): a *„mekkora méret"* maga is **globális szám** (`N`), és ugyanazon a 9. szabályon bukna el, mint a Duniter-alak. ▶️ **Javaslat helyette (D51):** a `k` **paraméter**, a kis koino `k = 0`-val futtatja **ugyanazt a kódot** — nem külön üzemmód. ⛔ **A D51 azóta TÁRGYTALAN** (nincs `k`); a kérdés valódi válasza a **D56 két lépcsője**: a kis koino ugyanazt a kódot futtatja, csak nincs pénztárcája. ⚠️ A 🔴 közepes zóna így sem szűnik meg, csak láthatóvá válik — *Csaba ezt vállalta (2026-09-03)* |
| **K15** | Milyen **pótutak** legyenek a találkozó mellett, és mennyivel gyengébbek? | 4. szabály: legyen mindig kézi út — de ezt nem szabad letagadni |

---

## 12. ✅ AMI ÁT VAN VEZETVE A DÖNTÉSEK KÖZÉ

*A [`fejlesztesi_terv_fazis2.md`](fejlesztesi_terv_fazis2.md) a döntések helye. Ott a
döntés áll, itt a levezetés.*

**2026-09-05 — D43–D50** (a kemény mag + a D48 bukása · a hetedik fordulat, D49 · a satu és
a D50). ⭐ Három meglévő döntés kapott ott jelzést a felülírásról: **D18/2** (Duniter-szabály),
**D18/4** (időszakonként), **D18/5** (visszavonás).

**2026-09-06 — D54–D60**, az átépítés napja:

| # | Mi | Állapot |
|---|---|---|
| **D54** | a készülék-felfedezés **segédeszköz, nem adatforrás** | ✅ |
| **D55** | ⭐⭐ **a nyíltság** — a D49/c 1. pontja felülírva; a jelölés *„még nem értünk össze"* | ✅ |
| **D56** | ⭐⭐⭐ **a két lépcsős beléptetés**, és a felhatalmazók köre = a 2. lépcsősök | ✅ |
| **D57** | a küszöb **abszolút szám, nem rangsor** | ✅ |
| **D57/b** | `N` = a **2. lépcsősök érték javaslatainak mediánja**; a felhatalmazás a **címzett szeletében** | ✅ |
| **D58** | ebben a verzióban a **papír nélküli emberrel a 2. lépcsőn nem számolunk** | ✅ |
| **D59** | az ellenőrzés **mélysége korlátos** — ⚠️ *a 12.2 mérés szerint a korlát nem is kell: menjen a gyökérig* | ✅ (a korlát elhagyható szelep) |
| **D60** | a felhatalmazás **megbízás, nem pontszám** | ✅ |

### ⛔ ÉS AMI TÁRGYTALAN LETT (2026-09-06)

- **D44** — a tanúsítási keret. *Kiváltotta a D56 két lépcsője; a mérés szerint a kapu úgysem véd.*
- **D51** (javasolt volt) — `k = 0` paraméter. *Nincs `k`.*
- **D53** (javasolt volt) — a keret kemény/jelzés kettőssége. *Nincs keret.*
- ⭐ **D52** (javasolt volt) — **ÉL, más néven:** a „az esemény a címzett szeletébe kerül"
  elv a **D57/b**-ben valósult meg, a felhatalmazásra és a tanúsításra alkalmazva.
- ⚠️ **D50** — a hordozó-döntés **áll** (helyi lista, ugráló üzenet), de a **szerep
  átértékelődött**: a tenger **nem védelem**, hanem kényelem.

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
- **2026-09-05** — Megépült a **`szigetMeres.js`**, és rögtön háromszor tanított:
  **(1)** a keret nélküli szabálynak nincs fala (97 kör alatt 1499 fő), a keretesnek van
  (**104-nél megáll, örökre**) — a megmaradási csapda futás közben; **(2)** a keret **79%-a
  olyanokra megy el, akik már tagok** — ez adja meg a súlyát az elismerés/támogatás
  szétválasztásnak, amit Csaba javasolt; **(3)** ⛔ egyetlen alapítói klikkből a
  **horgony-kör soha nem tágul** (K16) — és Claude erre először a *világot* írta át a
  szabálya alatt, ráadásul Csabának tulajdonítva az ötletet. Csaba javította ki.
  ⭐⭐ **És ebből született a fordulat (8/c):** *az identitás-réteg egy minimumon kívül nem
  tilt, hanem feltár* — **D49**. ▶️ A következő munka a **jelzések** kidolgozása és
  megmérése.
- **2026-09-05 (még aznap, a jelzés-mérés után)** — Megépült a jelzés-mérés és **három
  támadó**: hangos, óvatos, alapos. ⭐ Az első kettőt a jelzések elkapják, és kiderült,
  **miért**: a támadó nem tud egyszerre halk és hangos lenni. ⛔ **De az alapos — aki egész
  hamis társadalmat épít — mindet átugorja**, és ⛔⛔ **a horgony-kört elfoglalja** (880
  hamis horgony a 20 valódi mellett, miközben a becsületes kör **egyáltalán nem nőtt**).
  ⭐ A tanulság túlmutat a szabályon: *a „több független körből" feltétel azt jutalmazza,
  aki tudatosan hálózatot épít — és a támadó a legtudatosabb hálózatépítő.*
- **2026-09-05 (aznap este)** — ⭐⭐⭐ **CSABA: „BEMUTATKOZÁS"** (8/d). Nem ponthoz mérünk,
  hanem a **tengerhez**; a tengert nem lehet elfoglalni. Mérve: **100% hamis elkapva, 0%
  becsületes tévesen** az alapos támadó ellen, **minden megtévesztés-szinten** — és minél
  alaposabb a támadó, annál jobban működik. ⭐⭐⭐ **A satu bezárult:** a statisztika a ritka
  szigetet fogja meg, a tenger a sűrűt, és **a támadó nem lehet egyszerre mindkettő**.
  ⚠️ A mérés közben kiderült, hogy a modell világa (egy kör) rossz volt — **10% távoli
  találkozó** kellett hozzá, hogy legyen egyáltalán „tenger".
- **2026-09-05 (a nap vége)** — ⭐⭐ **A D6 kérdése lezárva (D50, 8/e).** Csaba: a
  bemutatkozás **közlés, nem megfigyelés** — a résztvevők jelzik, tehát engedélyezik. Ehhez
  jött a hordozó feloldása: **a jelzéshez nem kell a térkép, csak az út.** A bemutatkozás
  **helyi lista** (mint a `tarsak.js` társ-listája), a séta pedig **ugráló üzenet** — így
  senki nem lát többet, mint amit amúgy is tud. ⭐ És mivel a jelzés nem dönt (D49), szabad
  élő kapcsolatot kívánnia: **a tenger a második rétegbe kerül**, a kereső-réteg mellé.
  ▶️ Hátra van: mi szivárog egy séta közben · a séta üzenet-alakja · a lista elvesztése
  készülékcserénél · és a mérés megismétlése egy valódi bemutatkozás-gráfon.
- **2026-09-05 (a terv)** — ⭐ **MEGSZÜLETETT A MEGÉPÍTÉS TERVE (9/b szakasz):** tíz lépés,
  4.0-tól 4.9-ig, mindegyiknél az **illesztéssel** (mit kérdezünk a tártól) és a **méréssel**
  (melyik rontás-próba őrzi). ⭐ **A vízválasztó a lépések közt a D49/D50-ből jött:** a
  4.1–4.4 a **LÁNC** (kemény mag, offline dönt), a 4.5–4.8 a **MÁSODIK RÉTEG** (jelzés és
  bemutatkozás, élő és elhagyható), a 4.9 pedig a `lancGyoker` lefoglalt helyét zárja le —
  azt a mezőt, amit az `esemeny.js` kommentje név szerint erre a szakaszra utal.
  ⚠️ **A tervezés közben három dolog derült ki, ami eddig nem látszott:**
  **(1)** a **K14 kérdése rossz volt** — a *„mekkora méret fölött kapcsoljon be"* maga is
  globális szám, tehát ugyanazon a 9. szabályon bukna el, mint a Duniter-alak; helyette a
  `k` legyen paraméter, `k = 0`-val a kis koinóban (**D51 javaslat**);
  **(2)** a keret *kapott* fele csak akkor korlátos lekérdezés, ha a tanúsítás **a
  tanúsított szeletébe** kerül, nem a tanúéba (**D52 javaslat**) — és ezzel a `szabalyok.js`
  **illesztése is változik**, mert ma egyetlen tömböt kap és szerzőnként csoportosít;
  **(3)** ⚠️ a keret ellenőrzése **rekurzióhoz vezet** (a tanú kerete a tanúi keretén
  múlna), és a feloldás nem lehet „több számítás": a keret **a kiadás oldalán kemény, a
  befogadás oldalán jelzés** (**D53 javaslat**). ⛔ **Ez a szakasz legfontosabb eldöntetlen
  pontja**, mert a HOL TARTUNK a keretet a kemény magban sorolja (D44), a D49/a viszont csak
  a `k` tanúsítást és a befagyasztást nevezi keménynek. **Kód addig nem készül.**
- **2026-09-06** — ⭐⭐⭐ **A SZAKASZ ÁTÉPÜLT, ÉS CSABA LEZÁRTA.** Csaba két mondata indította:
  *„nem kell tanúsítás, csak a bemutatkozások"*, majd *„maradjunk a meghívásos rendszernél"*.
  Innen tizenkét mérés következett ([`eredmenyek.md`](../koino/meres/eredmenyek.md) 11–12.),
  és a nap végére **a tanúsítás–keret–horgony vonal egésze kiesett**, helyette a **két
  lépcsős beléptetés** (D56) áll.
  **A négy legfontosabb, amit a mérés tanított — mindegyik ellentmond annak, amit reggel
  hittünk:**
  **(1)** ⛔ **a belépési szám nem védelem, hanem árcédula** — a fal pontosan ott van, ahol
  a megtévesztettek száma eléri a kért meghívó-számot (4-nél 0, **5-nél 880**);
  **(2)** ⛔ **a jogosítási küszöb ELREJTI a szigetet** (100%/0% helyett 91%/16%), mert
  minden hamisat egy valódi emberhez kényszerít — *egy teljesítendő küszöb egyben
  hitelesítő pecsét is*;
  **(3)** ⛔⛔ **a SÉTA a leggyengébb láncszem**, nem a legerősebb: sok megtévesztettnél
  43–74% / 31–61%. A **tenger-gondolat nem védelem** — a **kontraszt** az (100% / 9–25%);
  **(4)** ⭐⭐⭐ **és a törvény:** a visszacsatolással a kár 880 → 120, és
  **kár = a támadó üteme × az ébredés ideje** — lineáris, tehát **a hurok mindig bezárul**.
  ⚠️ **Négy saját modell-hibát is elkövettem közben**, mind a jegyzőkönyvben: a korlátos
  mérés befagyott koinót mutatott „tökéletes védelemként" · az ismétlődés-szűrőt olyan
  világban mértem, amiben nincs ismétlődés · a felhatalmazást nem korlátoztam, ezért
  mindenki tanúsító lett · és a visszavonás-jelzést **rossz gráfon** kerestem.
  ⭐ *A tanulság mind a négyszer ugyanaz: a jó szám ugyanolyan gyanús, mint a rossz, amíg
  nem nézzük meg, mitől jó.*
  ✅ **Csaba lezárása:** *„eleget mértünk. Nekem ez így már megfelel, első koinónak."*
  ▶️ Az érvényes megépítési terv: **9/c**. A régi 9/b ⛔ elavult, meg van jelölve.
- **2026-09-06 (este)** — ⭐⭐⭐ **A 9/c MEGÉPÜLT, ÉS A SZAKASZ 4 KÓDDÁ VÁLT.** A 4.1–4.6
  kész (`js/allapot/identitas.js`, `js/allapot/jelzesek.js`, hat új művelet, **50 önpróba**),
  a **4.7 elvetve**, a **4.8 definiálva** (D63). ⭐ **A kanonikus alakot nem kellett
  felbontani** — a régi terv legveszélyesebb lépése kiesett.
  **Négy dolog, amit a megépítés tanított, és a terv nem látott előre:**
  **(1)** ⭐ **a három kérdés UGYANAZ a mondat** (tag ← meghívás · tanúsíthat ←
  felhatalmazás · 2. lépcsős ← tanúsítás), ezért egy közös váz írja le mindhármat;
  **(2)** ⚠️ **egyetlen alapítóval a 2. lépcső befagy** — a pénztárcához három tanúsítás
  kell, de egy alapító egyet ad; ezért nevezhet meg a koino-létrehozás **alapító kört**;
  **(3)** ⭐⭐⭐ **a saját láncban VAN sorrend**, és ez adja meg a kézbesítési igazolást
  globális óra nélkül (D61) — *ez Csaba buli-ötletéből lett kód*;
  **(4)** ⭐⭐ **a bemutatkozás a kontraszt-jelzést élesíti**, nem a sétát — a lánc ritka
  gráfján 1 vs 1 volt a különbség, most 5 vs 1 (D62).
  ⚠️ **És öt saját hiba, mind a próbákkal megfogva:** a beállítást az `ido` helyére tettem ·
  a bemondás-ellenőrzést az alapító-vizsgálat elé ·  a jelzést rossz gráfon kerestem · a
  horgonyt nem továbbítottam a próba-segédben · és kétszer **rossz elvárást** írtam a
  próbába (a lejárt megbízásnál és az egyoldalú bemutatkozásnál).
  ⭐ *Mind az öt ugyanazt tanította: a tiltó próbák önmagukban semmit nem bizonyítanak — a
  pozitív próbák nélkül a hiba észrevétlen marad.*
