# A SKÁLÁZHATÓ P2P TERVE — a két réteg

*Létrehozva: 2026-08-31. **Kétszer újraírva ugyanaznap**, Csaba két észrevétele után. A
jelenlegi szerkezet az ő megfogalmazása:*

> **A DAG a hitelességé és offline is működik; a kereső-réteg a megtalálhatóságé és
> hálózatot kíván. Ez két külön probléma, és jó, hogy külön is marad.**

> ⚠️ **TERVJAVASLAT, nem meghozott döntés.** A D-döntéseket Csaba hozza; a döntést igénylő
> pontok a 9. szakaszban. Ahol egy szám **mérve** van, oda van írva; ahol **becslés vagy
> feltevés**, az is. A DHT és a DAG rövid magyarázata a 11. szakaszban.

---

## 0. ⛔ A SZABÁLY, AMI MINDEN MÁS FÖLÖTT ÁLL (Csaba, 2026-08-31)

> **A skálázhatóság szempontjából az első verziónak IS késznek kell lennie.**

*Ez a szakasz azért került ide, mert Claude az S1 mérése után azt javasolta: „az első koino
elindítható a mai szerkezettel, a nagy átalakítás akkor kell, amikor kinövi". **Csaba
elutasította — és egy álló döntésre hivatkozott, nem új szempontra:***

| Döntés | Amit már kimondott |
|---|---|
| **D22** | *„Milliárdra tervezünk — és **az első kiadás is milliárdra képes program**, csak kevesebb emberrel."* |
| **D21** | *„A szeletelés **nem »később, ha a méret kikényszeríti«**, hanem **az első naptól a tervben van** […] különben pontosan az a fajta »majd kicseréljük« adósság keletkezik, amit a milliárdos cél kizár."* |
| **D22** | *„**A lefelé skálázás olcsó, a felfelé nem** — tehát a CÉL a milliárdos lépték."* |

⚠️ **A D13 („nem kell az első verziónak tökéletesnek lennie") NEM vonatkozik erre.** A D13 a
*paraméterekre* és a *funkciókra* igaz — ami hiányzik, azt egy későbbi verzió pótolja. A
**szerkezetet** viszont nem lehet utólag beletenni.

### ⭐ A KÜLÖNBSÉGTÉTEL, amitől ez betartható (a D21 saját megfogalmazása)

> **A SZERKEZET és az ILLESZTÉS az első naptól milliárdos. A megvalósítás mögötte lehet
> egyszerű.**
>
> *„Az illesztésnek eleve engednie kell a 3. réteget, még ha az első kiadás az 1.-et
> használja is."* (D21)

Vagyis nem az a baj, ha valami **egyszerűen** van megcsinálva — hanem az, ha az **illesztés**
kizárja a nagy változatot.

### 🔍 ELLENŐRIZHETŐ ALAK — ezt kell kérdezni minden új darabnál

> **„Ez mit csinál egymilliárd e-embernél?"**
> Ha a válasz **„akkor majd kicseréljük"** — a darab **nincs kész.**

### ⭐⭐ AZ ELSŐ, AMIT EZ A SZABÁLY ELKAP: a `betolt()`

A mai tár-illesztő két műveletet ad: `betolt()` és `hozzafuz()`. A `hozzafuz()` rendben van.
De a **`betolt()` az ÖSSZES eseményt adja vissza** — vagyis:

> ⚠️ **Nem a fájlformátum a probléma, hanem maga az ILLESZTÉS.** Akármilyen okos tárolót
> teszünk mögé, ha a felület azt kérdezi, hogy „add ide mindet", akkor **minden
> megvalósítás kénytelen mindet visszaadni.** A gyorsítótár (S1/b) ezt **nem** javítja meg —
> csak gyorsabbá teszi a rossz kérdést.

**Amit a szabály ebből következtet:** az S1/b és S1/c javítás **karbantartás, nem mérföldkő**.
A tár-illesztőt **szeletelhetővé** kell tenni (entitás / szerző / tartomány szerint), és ez
nem az S3 kényelmi része, hanem **az illesztés helyessége** — az első naptól.

---

## 1. AZ ÚJ IRÁNY: két réteg, két természet

| | **I. A DAG-réteg** | **II. A kereső-réteg** |
|---|---|---|
| **Mire válaszol** | *mi történt, és milyen sorrendben?* | *hol van, amit keresek?* |
| **Mit szolgál** | a **hitelességet** (H1–H8) | a **megtalálhatóságot** |
| **Eszköz** | aláírt események, lánc + kereszt-élek | elosztott, replikált mutató (DHT vagy bizalmi háló) |
| **Offline működik?** | ✅ **igen, és muszáj** | ❌ nem |
| **Elhagyható?** | ❌ **soha** — ez maga a koino | ✅ **igen** (2. szabály): nélküle kevesebbet találsz, de minden működik |
| **Mai állapot** | 🟡 részben megvan | ❌ nincs |

> ⭐ **Miért ez a legfontosabb tábla a dokumentumban?** Mert a két réteg összekeverése volt
> az eddigi két tévedés forrása. Ha egy protokollal akarjuk kiszolgálni mindkettőt, akkor
> **vagy a döntés lesz online-függő** (fojtópont, 4. szabály), **vagy a keresés lesz
> lehetetlen**. Szétválasztva mindkettő megoldható.
>
> **A határvonal, amit ebből javaslok:** *ami DÖNT valamiről, az soha ne kívánjon élő
> lekérdezést; csak a MEGTALÁLÁS kívánhat.*

---

## 2. HOGYAN JUTOTTUNK IDE — két bukott változat

**Az 1. változat: replikáció.** Mindenki tárolja, ami érdekli, és 5 percenként egyeztet.
**Csaba buktatta le:** *„az 5 percenkénti egyeztetés nem jó, mivel böngészés közben az összes
entitásnak elérhetőnek kell lennie."* — A döntéshozatalra terveztem, ami tűri a késleltetést;
közben a koinóban az ember **nézelődik**, és az nem tűri. Hiába ér körbe minden esemény öt
perc alatt, ha egy nem tárolt entitást akarok megnyitni.

**A 2. változat: mindenki tartsa az ágai mutatóját.** Kiszámoltam, hogy a mutató ~100 000
főnél nem fér el egy telefonon, és ebből azt a következtetést vontam le, hogy **ágankénti**
mutatókra kell bontani. **Csaba ezt is leszűkítettnek találta:** *„a kereső rétegnek nem egy
eszközön kell rajta lennie, hanem elosztva, mindig a kellő mennyiségűre replikálva."* —
Igaza volt: rossz kérdést tettem fel. Azt számoltam, elfér-e **egy** eszközön, holott soha
nem kellett volna egyen lennie. **Elosztva a kapacitás-fal nem enyhül, hanem eltűnik.**

**A harmadik gondolat, ami a mai szerkezetet adta** — szintén Csabáé: *„mi lenne, ha az
entitások tárolnák a tudatpont-tulajdonosaik címét, amit frissítünk?"* Ez **nem új gépezet**:
a `vonal.js` `CIMEK` üzenete (D. lépés) ma koino-szinten kulcsolt címjegyzék; ez ugyanaz
**entitás-szinten**. *Ugyanaz a gépezet, egy szinttel odébb.*

---

## 3. A HITELESSÉG FELTÉTELEI — ezek nem változtak

Ez a rész mindkét újraírást túlélte, mert nem az architektúrából jött, hanem a kódból és a
döntésekből. **Nyolc feltétel, és a döntő oszlop az, hogy mekkora tudás kell hozzá:**

| # | Feltétel | Mekkora tudás kell? | Hol tart |
|---|---|---|---|
| **H1** | a szerző valódi (aláírás) | ⭐ egyetlen esemény | ✅ kész |
| **H2** | egy kulcs = egy ember | 🌍 **globális** | ❌ nincs (D18, Szakasz 3) |
| **H3** | nincs kettős cselekvés | 🔗 egy szerző lánca | ⚠️ 4.3 |
| **H4** | a tudatpont-keret betartva | 🔗 egy szerző **teljes** lánca | ⚠️ **csak a D42-vel** |
| **H5** | a számítás determinisztikus | ⭐ semennyi | ✅ kész |
| **H6** | mindenki ugyanazt a bemenetet ismerte | 📦 **az entitás eseményhalmaza** | ⭐ javul (4.1) |
| **H7** | az idő nem hazudott | 🔗 lánc + horgony | ❌ nyitva |
| **H8** | a nevező ellenőrizhető | 📦 **az entitás eseményhalmaza** | ✅ a szelet pont ez |

**A nyolcból hat helyi.** Globális tudást egy kíván: a H2 (és később a pénz) — pontosan az,
amit a **D14/D17** tartós magként már megnevezett. És a kódban ott az egybeesés:

```js
// javaslatSzamitas.js:176 — a részvételi arány nevezője NEM a koino létszáma
const nevezoHalmaz = new Set(aktivHalmaz);   // az ÉRINTETT ENTITÁS aktív tulajdonosai
```

> ⭐⭐ **A döntés bemenete már ma is entitás-helyi** — tehát a tárolás határa **egybeeshet**
> a döntés határával: aki részt vesz egy döntésben, definíció szerint tárolja annak teljes
> bemenetét.

---

# I. RÉTEG — A DAG: mi történt és milyen sorrendben

## 4.1 Entitás-központú tár — az `esemenyek.jsonl` megszűnik

Ha az entitás a hitelesség egysége, akkor a **koino-szintű egyetlen hozzáfűzhető fájl** — a
Szakasz 1 alapköve — nem tartható. Ez a terv legdrágább pontja, ezért nyíltan:

| Ma | Entitás-központúan |
|---|---|
| `koino-adat/<koino>/esemenyek.jsonl` — **egy fájl mindenre** | **entitásonként külön tár** + a saját láncom külön |
| `koinoEsemenyei()` mindent betölt | entitásonként tölt |
| `allapotSzamitasa()` a teljes halmazon fut | **entitásonként** fut |
| `ujjlenyomat` = az egész koinóra | **entitásonként** (a globális csak kicsiben marad értelmes) |
| ÁLLÁS: szerzőnként egy sor (**162 B/fő, mérve**) | **entitásonként egy sor** |

**Amit megnyer:** a csere ára nem a koino létszámával nő, hanem **a közös szeletek számával**.
Két készülék, ami 3 entitáson osztozik, 3 sort egyeztet — akkor is, ha a koino milliós.

⚠️ **És egy fal, amit ez old meg** *(számítás, S1-ben mérendő)*: a D35 megtakarítása mérettel
elpárolog. Milliós koinóban két csere közt mindig történik valami → a **globális** lenyomat
soha nem egyezik → minden kör visszaesik a teljes ÁLLÁS-ra. **A megtakarítás pont akkor
szűnne meg, amikor a legnagyobb szükség lenne rá.** Entitás-szintű lenyomattal nem.

⚠️ Ez öt fájlt érint: `fajlTar.js`, `esemenyTar.js`, `csere.js`, `allapotSzamitas.js`,
`osszehasonlitas.js`. **Ezért kell mérés előtte** (S1).

## 4.2 ⭐ A címjegyzék az entitáson (Csaba javaslata)

> **Az entitás tulajdonosi köre EGYBEN a replikáló köre.** Nem kell kitalálni, ki tárolja
> E-t — a **D14** miatt a tudatpont már megmondta. *(„Aminek nincs gazdája, az nem
> létezik.")*

⭐⭐ **És ebből következik a legfontosabb dolog az I. rétegben:** ha minden entitás viszi a
példányai címeit **és** felsorolja a gyerekeit, akkor **a böngészés = a fa bejárása, és
minden lépésnél megkapod a következő lépés címeit.**

> ### 🎯 A TARTALOM GRÁFJA MAGA AZ ÚTVONAL-GRÁF.
> A **bejáráshoz** nem kell külön felfedező réteg: se DHT, se jelzőpont, se globális index.
> ⚠️ **A KERESÉSHEZ kell** — az a II. réteg dolga (5. szakasz). Ezt korábban tévesen úgy
> fogalmaztam, hogy „nem kell DHT"; az csak a bejárásra igaz.

**Három szabály, ami a címjegyzékre vonatkozik:**

| Szabály | Miért |
|---|---|
| ⭐ **A címhez NE tartozzon név** | a döntéshez soha nem kell konkrét embert elérni, csak *valakit, akinél megvan*. A `tulajdonos → cím` pár **profil** lenne (D6) |
| ⭐ **Magától frissül** | amikor E miatt cserélsz, mindkettő **a foglalatból** tanulja a másik friss címét (`latlak`, `vonal.js:195`). **Nincs külön frissítő forgalom** |
| **Bizalom nem jár vele** | a cím **nem esemény**, nem megy az `esemenyMentese`-n, semmit nem dönt el (3. szabály). Ezért **aláírni sem kell**: hamis cím elérhetetlenséget okoz, nem hamisítást |

## 4.3 ⚠️ AZ ÁR: a hézag megszűnik jel lenni

Ez a legfontosabb figyelmeztetés az I. rétegben. Ma a `sorszam` **koino-szintű**, és a hézag
**gyanújel**: ha Anna 3-as eseménye hiányzik, az a szelektív mutogatás nyoma
(`szabalyok.js:146`).

> ⚠️ **Entitás-központú tárban a hézag NORMÁLIS lesz.** Anna láncából az 1-est és a 4-est
> látom, a 2–3 pedig **jogosan** hiányzik: más entitásokon történt. **A jel elveszik, és vele
> a H3/H4 védelme.**

**A javítás egy egész szám:** minden esemény vigye a sorszámát **azon az entitáson** is
(`entitasSorszam`). Akkor az **entitáson belüli** hézag újra gyanú, az **entitások közti**
pedig várt és ártalmatlan.

## 4.4 ⭐ A kanonikus alak egyszeri bővítése — most ingyen, később nagyon drága

Három mező, mind ugyanabból az okból: **ahol a tudás elfogy, ott az esemény hozza magával a
bizonyítékát.** Mind a három a `kanonikusAlak.js`-t érinti — *„a legveszélyesebb részletet"*
—, ezért **egyszerre kell bevinni őket.**

| Mező | Mit old meg | Honnan | Státusz |
|---|---|---|---|
| **`kiosztva`** — összesen kiosztott tudatpont | **H4**: a keret **egy eseményből** ellenőrizhető | ⭐ Csaba, **D42** | ✅ eldöntve, nincs megépítve |
| **`entitasSorszam`** — hányadik eseményem ezen az entitáson | **H3**: a hézag újra jel lesz (4.3) | e terv | ⚠️ K3 |
| **`latott`** — pár idegen esemény azonosítója, amit már ismertem | **H7**: a visszadátumozás **bizonyíthatóvá** válik | e terv | ⚠️ K4 |

> ⭐ **A `latott` az, amitől a koino lánca igazi DAG lesz.** Ma a szerzők láncai külön futnak;
> a kereszt-élekkel bizonyítható sorrend keletkezik **óra nélkül**: aki visszadátumoz, annak
> olyan eseményre kellene hivatkoznia, ami akkor még nem létezett.
>
> ⭐ **És a D42 az entitás-központú tárban nem „fontos", hanem az EGYETLEN mód** a keret
> ellenőrzésére — teljes láncot soha többé nem fogunk látni.

⚠️ **A dokumentum leginkább időérzékeny pontja.** A `koino-adat` ma **9 valódi eseményt**
tartalmaz. Egy mező most **percek**; tízezer esemény után migráció vagy kétféle eseményalak
— és a kanonikus alak épp ott van, ahol a kétféleség **némán** viszi szét a két gép
állapotát.

## 4.5 ⚠️ Amit nem szabad megígérni: „minden entitás elérhető"

Csaba feltétele így szólt: *„legalább az egyik tudatpont-tulajdonosnak elérhetőnek kell
lennie."* **A szó szerinti ígéret nem tartható** — mérve tudjuk (D40/D41), hogy a készülékek
nagy része **nem fogadóképes**. Egy három-tulajdonosos, alvó entitás elérhetetlen. Ha
megígérjük, hazudunk; ha kikényszerítjük, fogadóképes „szerverek" kellenek, és **a koinónak
megint lesz teteje** (D12 bukása).

**A válasz: tágítsuk a kört.**

| Ki szolgálhatja ki E-t? | Miért szabad neki? |
|---|---|
| a **tulajdonosai** | D14 — ők tartják életben |
| a **postaládák** (D34) | fogadóképesek, és amit továbbadnak, azt tárolják is |
| ⭐⭐ **bárki, aki valaha megnézte és megtartotta** | **az események ALÁÍRTAK — a másolat ugyanolyan hiteles** (D32) |

> ⭐ A harmadik sor ingyen van, és a legtöbbet éri: bárki lehet másolat-tartó **anélkül, hogy
> bárkinek meg kellene bíznia benne**. A népszerű entitásokból magától sok példány lesz.

**És ami marad, azt ki kell mondani:** ha egy entitásnak nincs elérhető tartója, akkor
**„jelenleg nem elérhető"** — a D21 *„jelenleg nem ellenőrizhető"* mintája. A koino
**bejelent, nem bíráskodik** (D19).

⚠️ **Az őszinte ár:** kívülről nem különböztethető meg, hogy *„ezt már senki nem tartja"*
(D14 szerint helyesen tűnik el) attól, hogy *„a tartói épp alszanak"*.

## 4.6 ⭐ A TÖMEGES ENTITÁS — a D21 szerkezete másodszor

*(2026-08-31. Ez a szakasz egy korábbi „nincs javaslatom" helyére került.)*

**A probléma:** egy entitás, amire tízmillióan tesznek tudatpontot, ~**4,3 GB** eseményt
gyűjt (10⁷ × 435 B). A 4.1 szelet-elve ezen megbukna: a tulajdonosa nem tudja tárolni.

**Az átfogalmazás, ami megoldja:** ez a 4,3 GB **tízmillió aláírt szavazat** — nem
architektúra-hiba, hanem **a tömeges részvétel fizikai ára**. Bármely rendszerben, ahol
tízmillióan szavaznak, tízmillió aláírásnak kell mozognia. A kérdés tehát nem az, hogyan
kerüljük el, hanem: **kinek kell ténylegesen elvinnie?**

⭐ **És a válasz már meg van tervezve — a D21-ben, csak másra:**

| | **Tartós mag (D21)** | **Tömeges entitás** |
|---|---|---|
| **mindenki tárol** | a csúcs-számot, ~32 B | a csúcs-számot **+ a saját szavazatát**, ~1 KB |
| **egy ellenőrzés** | bizonyíték, ~1 KB | ugyanaz |
| **a teljes halmaz** | csak aki vállalja | csak aki vállalja |
| **a tároló hazudhat?** | ❌ nem | ❌ nem |

**Egyetlen kiegészítés kell: ÖSSZEGZŐ Merkle-fa** (lásd 11. szakasz) — a csomópontok vigyék
az alattuk lévő **darabszámot és a szavazat-összesítést** is, a hasított tartalmon belül.
Ekkor nemcsak az bizonyítható log N adatból, hogy *„az én szavazatom benne van"*, hanem az
is, hogy **„a végösszeg tényleg ennyi"**.

> ⭐ **A gyökér itt sincs KIMONDVA, hanem SZÁMÍTVA** — kanonikus sorrend, determinisztikus
> számítás, mindenki ugyanarra jut (D17). Nincs kit megválasztani, nincs mit befolyásolni.
>
> ⭐⭐ **És az elhallgatás ellen itt van a legjobb védelmünk:** *aki kimarad, pontosan az, aki
> észreveszi* — és a kezében a bizonyíték, a **saját aláírt szavazata**, ami a gyökér
> ellenében megmutatja, hogy nincs benne. Tízmillió szavazó **tízmillió független
> ellenőrzést** végez, egyenként egy lekérdezéssel (a kliens automatikusan). A csaláshoz nem
> elég elhallgatni — **el kell hallgatni úgy, hogy a károsult ne nézzen utána.**

### ⚠️ EGY KORÁBBI ÁLLÍTÁS VISSZAVONÁSA

Korábban ide az volt írva, hogy ha kötegeléssel oldjuk meg a tömeges entitást, akkor **a
D17 táblázata módosul**, mert a globális egyetértés halmaza bővül. **Ez téves volt.** A
tömeges entitás összesítése **entitás-helyi**: E rajának eseményeiből számítódik, nem az
egész koinóéból. **Nagy, de helyi.** → **A D17 táblázata érintetlen:** globális egyetértés
továbbra is csak az **azonossághoz** és a **pénzhez** kell.

### Ami nyitva marad

1. **A megegyezés a bemenetről** — ha két gép más szavazat-halmazt ismer, más gyökeret
   számol. ⭐ De ez **nem új probléma**: ugyanaz a H6, amit a határidő és a késői szavazat
   szabálya már kezel, csak nagyobb mennyiségben.
2. **A 6. szabály ára** — az összegző Merkle-fa új kód. ⭐ De **ugyanaz a kód, amit a D21-hez
   amúgy is meg kell írni**: egy szerkezet, két haszon.
3. **A kötelező különválás** (D25 mintája) megmarad **lehetőségként**, de már nem kényszer —
   szabad kormányzati döntés, nem a technika szorít rá.

---

# II. RÉTEG — A KERESŐ-RÉTEG: hol van, amit keresek

## 5.1 Mi ez, és mi nem

> **Mutató a tartalomhoz, nem a tartalom.** Mint egy könyv tárgymutatója: *cím → hol van.*

### ⭐ CSABA DÖNTÉSE (2026-08-31): elég a CÍM szerinti keresés

> *„az nem baj, elég a cím szerinti keresés"*

**Ez egy teljes alrendszert töröl**, és ez a legolcsóbb változat, ami még használható:

| Ami eltűnik | Miért |
|---|---|
| ❌ a **címke-mechanizmus** (téma szerinti keresés) | nem kell **értelmezni**, csak **levezetni** |
| ❌ „ki írja a bejegyzést?" | ⭐ **senki** — a bejegyzés **számított**, mint az egyezmény |
| ❌ a szemetelés a mutatóban | nincs mit beleírni |
| ❌ moderálás, hírnév, súlyozás | fel sem merül |

> ⭐⭐ **A bejegyzés az entitás saját aláírt eseményeiből SZÁMÍTÓDIK** — aki ismeri az
> entitást, ugyanazt a bejegyzést kapja. Ugyanaz a mozdulat, mint az egyezménynél (D17) és a
> köteg-gyökérnél: **számítva, nem kimondva.** Nincs is mit hamisítani.

**És a szemetelés magától korlátozott marad:** egy entitás létezéséhez tudatpontnak kell
rajta lennie (D14), tudatpontból pedig **10 000 van, összesen**. Aki ezer csali-címmel
árasztaná el a keresőt, **a saját szűkös keretét éli fel** — abból, amit tényleg fontosnak
tart. ⭐ **Beépített ár, pénz és moderálás nélkül.**

⚠️ **Amit ezzel elfogadunk:** ha az „iskolabusz" szó nem szerepel a **címben**, a tartalom
nem található meg szó szerint. A téma szerinti keresés **kimarad** — tudatosan.

### A bejegyzés tartalma

| Benne van | **Nincs benne** |
|---|---|
| azonosító, szülő, **cím**, típus, létrehozó, idő, tulajdonos-szám | ❌ **a tartalom törzse** — az az entitásnál él |
| | ❌ **a hálózati cím** — az is az entitásnál (4.2) |
| | ❌ **kulcsszó/címke** — nincs ilyen (lásd fent) |

⚠️ **Miért nincs benne a cím?** Mert a metaadat **szinte soha** nem változik, a hálózati cím
viszont **percenként** (NAT, wifi↔mobil). Egy szerkezetbe téve **az egész örökli a gyorsabb
ütemet**: percenként kellene újraterjeszteni azt, aminek 99%-a változatlan.

⚠️ **Névtan:** ez **NEM** a „tartós mag" (D14). Az a *csalás-elleni csontváz* (azonosság,
pénz), amiről Csaba döntése az, hogy **legyen minél kisebb**. Ez itt kényelmi réteg, aminek
épp hogy nagynak kell lennie. **Két külön dolog, két külön név** — ez a **kereső-réteg**.

## 5.2 ⭐ Elosztva és replikálva (Csaba korrekciója) — és a szám

> *„nem egy eszközön kell rajta lennie, hanem elosztva, mindig a kellő mennyiségűre
> replikálva."*

Ezzel a kapacitás-kérdés **eltűnik**, nem enyhül. *(Feltevés: fejenként 10 entitás, bejegyzés
~250 B — mindkettő mérendő.)*

| | Milliárdos koino |
|---|---|
| entitás | 10 milliárd |
| a **teljes** mutató | 2,5 TB |
| ×25 példány (a kieséshez) | 62,5 TB |
| ⭐ **egy készülékre jutó rész** | **~62 KB** — kisebb, mint egy fénykép |

**Mennyi a „kellő mennyiség"?** ⭐ **Ez nem tipp, hanem mérés kérdése** — a készülékek mért
elérhetőségéből jön. Ha egy készülék az idő `p` részében elérhető, `r` példánynál az esély,
hogy legalább egy válaszol, `1 − (1−p)^r`:

| p (elérhetőség) | r = 10 | r = 20 | r = 30 |
|---|---|---|---|
| 10% | 65% | 88% | **96%** |
| 30% | **97%** | 99,9% | ~100% |

Utána a replikációs szám **közösségi paraméter** legyen (D13/c), ne beégetett szám.

⚠️ **Az ára: a „mindig" szó egy fenntartó kört rejt.** Valakinek észre kell vennie, ha egy
szelet példányszáma leesett — a bevált megoldás: a bejegyzések **lejárnak** (pl. 24 óra), a
tulajdonosuk **időnként újra közzéteszi** őket (pl. óránként). Órás ütem, tehát az 5.
szabállyal összefér, de **külön munka, ami eddig sehol nem szerepelt.**

## 5.3 Hogyan találod meg a szeletet? — két jelölt, mérésre

**A) Hash-alapú DHT** (Kademlia-féle). A kulcsszóból számolt szám megmondja, melyik szelet;
a felelős csomópontot ~log N ugrással találod meg — **egymilliárdnál ~30 kérdés**. Bevált,
egyszerű, húsz éve él (BitTorrent).
⚠️ Klasszikus gyengéje: **bárki felvehet sok azonosítót** és odapozicionálhatja magát egy
célszelet mellé.

**B) A bizalmi háló mint útvonal-szerkezet** *(Csaba felvetése)*. Nem hash-szomszédok, hanem
**akik kezeskedtek érted**. Van rá szakirodalom, és pont ebből az érvből született (Whānau,
MIT ~2010: Sybil-ellenálló DHT a társas gráfon, véletlen sétákkal; a Freenet „darknet" módja
és a Tribler is ide tart). ⚠️ **Ellenőrizendő, mielőtt bármit építünk.**

| | A) hash-DHT | B) bizalmi háló |
|---|---|---|
| Sybil-védelem | ⚠️ csak ha az identitás kapuz | ⭐ **strukturálisan** — *„a darabszám hamisítható, a pozíció nem"* (D18/2) |
| Bootstrap | ⚠️ kezdő címlista kell (D38, feszül a 2. szabállyal) | ⭐ **megoldva** (5.4) |
| Útvonal | ⭐ egyenletes kulcstér, felezés | ⚠️ **a társas gráf nem jó útvonal-szerkezet magától** — megoldható, de **bonyolultabb kóddal** (6. szabály!) |
| Magánélet | ⚠️ idegenek látják a kérdéseidet | ⚠️ **rosszabb: ismerőseid látják** |
| Terhelés | egyenletes | ⚠️ **a társas hubokra torlódik** — lágy „teteje" (D12 más ruhában) |
| Csatolás | két réteg külön romolhat el | ⚠️ **az identitás-réteg zavara azonnal hálózati zavar** |

> ⭐ **A javaslatom: középút.** A bizalmi háló adja a **társakat** (5.4) — nincs
> bootstrap-szolgáltatás, és a társ-halmaz Sybil-ellenálló —, de a **szelet-kiosztás maradjon
> hash szerint**. Így megvan a bootstrap- és a pozicionálás-védelem, a bonyolult
> társas-útvonalválasztás nélkül.
>
> **És semmi nem blokkolódik:** a kereső-réteg elhagyható, tehát ez a döntés **ráér**, amíg
> a mérésekkel haladunk — akkor pedig **méréssel** dőljön el, ne megérzésből (D17
> módszertani figyelmeztetése).

## 5.4 ⭐ A belépéskori címcsere — ezt csináljuk meg, függetlenül mindentől

*Csaba: „meghíváskor, tanúsításkor ők már tudnának is elérhetőséget cserélni."*

Tiszta nyereség, nulla plusz munka: a két fél **amúgy is kapcsolatban van**. És megold egy
valódi gondot, a **D38 bejárati címlistáját** — ma minden „kezdő címlista" feszül a 2.
szabállyal.

> ⭐ **Mindenki attól kapja az első címeit, aki beengedte.** Nem lista, nem szolgáltatás, nem
> beégetett cím. Ez pontosan a D21 bootstrap-mondata: *„ugyanaz a társas bizalom, ami beenged
> a közösségbe, alapozza meg a technikai bizalmadat is."*

**Ez a rész A) és B) esetén is kell** — ezért független a 5.3 döntéstől, és **most felírható**.

## 5.5 ⚠️ A feszülés, amit ki kell mondani

Minden társas-gráf alapú Sybil-védelem azon áll, hogy **a támadó nem tud sok becsületes
embert rávenni, hogy kezeskedjen érte**. De a **D18/1** szándékosan **gyengévé tette** a
tanúsítást: *„létező, külön ember"* — nem ajánlólevél, nem jár felelősséggel, nem kell jól
ismerned az illetőt.

> Ez a döntés a **belépést** teszi emberségessé — de ugyanez teszi **olcsóbbá a támadási
> éleket**, amikre a társas útvonalválasztás biztonsága épülne. A D18/2 távolság-szabálya az
> ellensúly, de a „bizalmi háló megvéd" érv **csendben erősebb tanúsítást feltételez, mint
> amilyet választottunk.**

## 5.6 Mi véd az elhallgatás ellen?

⚠️ **Szeletelve rosszabb, mint teljes másolatban.** Ha mindenkinél minden megvan, elhallgatni
lehetetlen. Ha „iskolabusz" a 47-es szeletbe esik és annak tartói kihagynak egy bejegyzést,
**nincs másik hely, ahol megnézd.** A szeletelés egy nagy kapuőrt **sok kicsire** cserél — és
a kicsi **olcsóbban elfoglalható**.

**Két lépés, mindkettő a koino saját logikája:**

1. ⭐ **Több példányt kérdezünk, és EGYESÍTJÜK a válaszokat.** A bejegyzés magából az
   entitásból **levezethető és ellenőrizhető** — a hamis megnyitáskor kiesik, a hiányzót a
   másik példány pótolja. Így az elhallgatás megint **elérhetőségi** probléma lesz: pontosan
   az a fordítás, amit a D21 is csinál.
2. ⭐ **A szelet-tartónak e-embernek kell lennie** — vagyis az identitás-rétegen (D18) kell
   átjutnia. A szokásos DHT-k épp azért sebezhetők, mert nincs mögöttük ember. **A keresés
   biztonsága így ingyen jön az identitás-réteggel** — ugyanaz a mondat, mint a D17-é a
   konszenzusról.

## 5.7 Két korlát, amit tervezési szabályként kell rögzíteni

**⚠️ Elhagyható kell maradjon** (2. szabály). Ha a kereső-réteg nem működik, a koino működik:
a bejárás, a csere, a döntés, a szavazás nem függ tőle. **Egy jól működő kereső észrevétlenül
válik előfeltétellé** — ezért kell írásban rögzíteni.

**⚠️ A bejegyzésnek is el kell halványulnia.** Ha a mutató megőrzi egy entitás nevét azután
is, hogy már senki nem tartja, akkor **temetőt** építettünk: a D14 szerint a felejtés az
alapállapot, és az N2 (törléshez való jog) is ezen múlik. A bejegyzés csak addig él, amíg
valakinél megvan maga az entitás.

## 5.8 ⭐ LÁTHATÓSÁGI KÜSZÖB — a keresőn, soha a létezésen (Csaba felvetése, 2026-08-31)

> Csaba: *„az nem probléma, hogy ha csak 1 tulajdonosa van egy tartalomnak, akkor az nem
> látszik… a trol támadások, vagy illetlen tartalmak, csak akkor lesznek elérhetőek, ha
> legalább 2-en próbálják meg közzétenni."*

**Amit megvesz:** a küszöb 1-ről 2-re emelése **strukturális védelem, moderálás nélkül** —
senki nem ítél meg semmit, mégis kell hozzá egy **második, valódi ember** (az
identitás-réteg miatt nem elég egy második kulcs).

**⚠️ És az ára, amit mérlegelni kell — mert a mechanizmus VAK:**

> **Pontosan ugyanúgy elnyomja az egyedüli igazat mondót, ahogy a trollt.** Aki elsőként vet
> fel egy kényelmetlen, de fontos ügyet, az definíció szerint az, akire még senki nem tett
> pontot.
>
> ⚠️ **És ha a küszöb közösségi paraméter lesz** (D13/c), egy többség **feljebb tolhatja** —
> ezzel a kisebbségi tartalom szerkezetileg láthatatlanná válik. **Cenzúra anélkül, hogy
> bárkinek cenzúráznia kellene** — rosszabb a nyílt tiltásnál, mert letagadható.

**⭐ A feloldás: a két réteg szétválasztása** — pontosan a most elfogadott felosztás mentén.

| Réteg | Küszöb | Következmény |
|---|---|---|
| **I. DAG-réteg** (létezés, elérés) | ❌ **nincs** — 1 tulajdonos elég (D14) | semmi nem tűnik el; **hivatkozásból és böngészésből mindig elérhető** |
| **II. Kereső-réteg** (megtalálhatóság) | ✅ **lehet** (pl. 2 független tulajdonos) | a keresőben csak akkor bukkan fel, ha valaki más is tartja |

> ⭐ **Semmi nincs elrejtve — csak nincs felkínálva.** Az egyedüli hang elérhető marad annak,
> aki odanéz vagy megkapja a hivatkozást; a kereső viszont nem sodorja mindenki elé az
> egyszemélyes szemetet. És mivel a II. réteg **elhagyható**, aki nem használ keresőt, annak
> a küszöb nem is létezik.

⚠️ **Pontosítás a mai működésről:** ma **egy tulajdonos is elég a létezéshez** — a D14 a
**nulla** pontos entitást tagadja, az egy pontosat nem. Egy egy-tulajdonosú tartalom tehát
ott van a fában. Ami valóban gyenge nála, az az **elérhetőség**: egy tulajdonos = egy
példány (4.5). ⚠️ **Ezért a küszöb ÚJ SZABÁLY lenne, nem a meglévő pontosítása** → K10.

---

## 6. SZÁMOK

> ### ✅ AZ S1 LEFUTOTT (2026-08-31) — teljes jegyzőkönyv: [`meres/eredmenyek.md`](../koino/meres/eredmenyek.md)
>
> **A terv „C" állítása igazolva:** a globális lenyomat **egyik méretnél sem egyezett**, tehát
> minden kör visszaesett a részletes ÁLLÁS-ra. Egyetlen eltérő eseményért:
>
> | | 1 000 | 10 000 | 100 000 |
> |---|---|---|---|
> | egy kör ára | 2,6 KB | 16,8 KB | **160,1 KB** |
> | ebből hasznos | 20,05% | 2,56% | **0,27%** |
>
> ⭐⭐ **ÉS EGY FAL, AMI NEM VOLT A TERVBEN — ez jön el ELSŐNEK:** az `esemenyMentese` minden
> mentésnél végigolvassa az egész fájlt (`tar.betolt()`), a `lancVege` még egyszer. **Nincs
> gyorsítótár.** Egy mentés ára: 1k-nál 6,4 ms · 10k-nál 42 ms · **100k-nál 495 ms**. Vagyis
> **fél másodperc EGY esemény elmentése egy 100 000 eseményes koinóban** — és egy csere több
> eseményt hoz. Ez **jóval a 43,5 GB-os tárolási fal előtt** teszi használhatatlanná a koinót.
>
> ⚠️ **És 100 000 esemény nem sok:** 500 e-ember, 200 esemény fejenként — ez egy **falu vagy
> egy iskola.** A fal nem „valahol a milliárd felé" van, hanem **belátható közelségben**.
>
> ⭐ **Harmadik lelet, KÜLÖNÁLLÓ és javítható:** az `allapotSzamitasa` is négyzetes (100k-nál
> 4 615 ms), de nem a szerkezet miatt — az [`agMeretSzamitasa`](../koino/js/allapot/allapotSzamitas.js:416)
> minden entitásnál végigmegy az összes entitáson. **Ez a mai kódban is javítható**, a
> szeletelés kivárása nélkül: „szülő → gyerekek" mutató + egy utó-bejárás.
>
> ✅ **A becsült számok tartják magukat:** 435 → **476 B/esemény** (a terv 10%-kal alábecsülte);
> 162 → **163 B/e-ember** 500 fővel (⭐ kiválóan tartja).

**Mérési alap:** esemény **476 B** átlagosan (⭐ **mérve 2026-08-31**, 100 000 eseményen; a
korábbi 435 B kilenc eseményből jött); ÁLLÁS **163 B/e-ember** (⭐ mérve 500 fővel; a D35
50 fővel 162-t adott); csendes kör **334 B** (mérve).

**A mai fal** (minden készülék mindent tárol, 100 esemény/fő):

| Létszám | Tár | Egy ÁLLÁS |
|---|---|---|
| 10 000 | 435 MB | 1,6 MB |
| 1 millió | **43,5 GB** | **162 MB** |

**A két réteggel** — a szeletnek beépített korlátja van: **a tudatpont-keret** (10 000 egész
pontból legfeljebb 10 000 entitás, gyakorlatilag 10–200):

| | I. réteg (tár) | I. réteg (címjegyzék) | II. réteg (mutató-szelet) | Egy csere-kör |
|---|---|---|---|---|
| 10 entitást tartok | 220 KB | 6 KB | ~62 KB | ~400 B |
| 200 entitást tartok | 4,4 MB | 120 KB | ~62 KB | ~400 B |

> **A koino létszáma egyik számban sem szerepel. Ez a skálázás.**

---

## 7. A NYOLC SZABÁLY ÁTVIZSGÁLVA

| # | Szabály | Megfelel? |
|---|---|---|
| 1 | a szállítás cserélhető | ✅ a címjegyzék és a mutató **adat**, nem hálózati kód; a `csere.js` továbbra sem importál hálózatot |
| 2 | semmi ne múljon egy címen | ⭐ **a II. réteg egésze elhagyható** (5.7); a belépéskori címcsere kiváltja a bejárati listát |
| 3 | a bizalom sose a csatornából | ✅ a cím és a mutató **nem esemény**, semmit nem dönt el; minden adat az `esemenyMentese`-n megy be |
| 4 | legyen mindig kézi út | ⚠️ **a keresés élő** — ezért kell az 1. szakasz határvonala: **ami dönt, az offline is megy** |
| 5 | ne épüljön folyamatos kapcsolatra | ✅ az I. réteg alszik; ⚠️ a II. réteg **órás** fenntartó kört kíván (5.2) |
| 6 | nulla függőség, kis méret | ⚠️ **itt a kockázat.** Az I. réteg meglévő fájlokat ír át; a II. réteg **új**. Cél: **0 npm, és a II. réteg max. +3 fájl** |
| 7 | a böngésző csak kliens | ✅ nem érinti |
| 8 | ne tervezz jogi védelemre | ✅ nincs ilyen érv |

---

## 8. A LÉPÉSEK — mindegyik külön mérhető

**Az I. réteg előbb.** A II. réteg elhagyható, tehát ráér — és amíg az I. nem áll, nincs mit
indexelni.

| # | Lépés | Réteg | Mit bizonyít | Mérés |
|---|---|---|---|---|
| **S1** | ✅ **A FAL MEGMÉRVE** (2026-08-31) — [`skalaMeres.js`](../koino/meres/skalaMeres.js) | I | ✅ a C állítás igaz; ⭐⭐ **és a BEÍRÁS a legkorábbi fal** | kész — [`eredmenyek.md`](../koino/meres/eredmenyek.md) |
| **S1/b** | **A BEÍRÁSI ÚT** — gyorsítótár a tároló mögé | I | ⚠️ **KARBANTARTÁS, NEM MÉRFÖLDKŐ** (0. szakasz): a rossz kérdést gyorsítja, nem javítja | ugyanaz a mérő, újrafuttatva |
| **S1/c** | **`agMeretSzamitasa` javítása** — „szülő → gyerekek" mutató + utó-bejárás | I | ⚠️ szintén **karbantartás** — de valódi hiba a mai kódban | ugyanaz a mérő |
| **S2/a** | ⛔ **A TÁR-ILLESZTŐ SZELETELHETŐVÉ TÉTELE** — a `betolt()` ne „mindet" adjon, hanem entitás / szerző / tartomány szerint | I | ⭐ **ez az ILLESZTÉS helyessége**, nem kényelem — a 0. szakasz szabálya ezt kapja el elsőnek | a mérő: a betöltött bájt a **kért szelettel** arányos-e |
| **S2** | ⭐ **A KANONIKUS ALAK BŐVÍTÉSE** (`kiosztva` + `entitasSorszam` [+ `latott`]) | I | a három önhordó bizonyíték | rontás-próbák: elhallgatott esemény → **kimutatható ellentmondás** |
| **S3** | **Entitás-szintű tár** | I | a tárolás egysége az entitás | a betöltött bájt az entitás méretével arányos |
| **S4** | **Entitás-szintű lenyomat és ÁLLÁS** | I | a csere ára a **közös szeletektől** függ | S1 tárával: 1 eltérés 100 000 esemény közt → hány bájt |
| **S5** | **Címjegyzék az entitáson** (4.2) | I | egy nem tárolt entitás **elérhető** | önpróba + valódi két-készülékes próba |
| **S6** | **Böngésző-lekérés** („add ide E-t") | I | a fa bejárható a szeleten kívül is | hány kör, hány bájt, hány ms |
| **S7** | **Másolat-tartás** (4.5) | I | az elérhetőség a népszerűséggel nő | találati arány |
| **S8** | **Belépéskori címcsere** (5.4) | II | nincs szükség bejárati címlistára | önpróba |
| **S9** | **Mutató-bejegyzés + szelet** (5.1–5.2) | II | a mutató mérete és a replikáció | szintetikus mérés |
| **S10** | **Szelet-megtalálás** — A) vagy B) (5.3) | II | ⚠️ **előbb irodalmi átvizsgálás** | a két jelölt összemérése |
| **S11** | **Mag-bizonyíték** (D21) — H2 | — | az azonosság 32 B + ~1 KB-ból ellenőrizhető | önpróba |

---

## 9. ⚠️ DÖNTÉST IGÉNYEL

| # | Kérdés | A javaslatom |
|---|---|---|
| **K1** | Elfogadjuk a határvonalat: **„ami dönt, az offline is megy; csak a megtalálás kíván hálózatot"**? (5. szabály pontosítása) | ⭐ **igen** |
| **K2** | A címjegyzék **név nélküli** legyen (csak címek)? | ⭐ **igen** — ugyanolyan hasznos, és nem épít profilt (D6) |
| **K3** | Bekerüljön az **`entitasSorszam`** a kanonikus alakba? Enélkül a hézag megszűnik jel lenni (4.3). | ⭐ **igen, a D42-vel egyszerre** |
| **K4** | A **`latott`** horgony most menjen be? | ⭐ **most** — a kanonikus alak bővítése később nagyon drága |
| **K5** | **Megtarthatja-e bárki, amit megnézett**, és kiszolgálhatja-e? | ⭐ **igen** — az aláírás miatt veszélytelen, és ez adja a legtöbb elérhetőséget |
| **K6** | ~~Jó-e a „kereső-réteg" név?~~ | ✅ **ELDÖNTVE** — Csaba maga is így nevezte |
| **K7** | A szelet-megtalálás **A) hash-DHT** vagy **B) bizalmi háló**? | ⭐ **középút** (5.3), de **méréssel**, és **ráér** |
| **K8** | A **tömeges entitás** (10⁷ tulajdonos → ~4,3 GB) | ⭐ **VAN VÁLASZ (4.6):** összegző Merkle-fa — a D21 szerkezete másodszor. Mindenki ~1 KB-ot tárol. *(A korábbi „a D17 táblázata módosul" állítás visszavonva.)* |
| **K10** | **Láthatósági küszöb** a keresőn (Csaba felvetése, 5.8): 2 független tulajdonos kelljen a keresőben való megjelenéshez? | ⭐ **igen, de KIZÁRÓLAG a kereső-rétegen** — a létezésen soha. ⚠️ **Új szabály, nem pontosítás** — a te döntésed, és a küszöb **ne legyen felfelé tolható** közösségi paraméter (cenzúra-kockázat) |
| **K9** | Vállaljuk az `esemenyek.jsonl` átszervezését (4.1), vagy előbb csak mérünk? | ⭐ **előbb S1** — öt fájlt érint |

---

## 10. AMIT EZ A TERV NEM OLD MEG — őszintén

1. **A Sybil-védelmet (H2) nem oldja meg**, csak feltételezi — és **mindkét réteg ráépül**.
   A D17 mondata áll: *a konszenzus biztonsága = az identitás-réteg biztonsága, semmi más.*
   **Ha az identitás-réteg megtörik, ez az egész terv egy hatékonyan skálázódó
   hamisítás-gépezet.**
2. **A téma szerinti keresést nem adja meg** — csak a cím szerintit (5.1, Csaba döntése).
   Aminek a címében nincs benne a szó, azt szó szerint nem találod meg.
3. **Az elérhetetlen entitást nem oldja meg** (4.5) — csak őszintén megmondja.
4. **Az elzárás (eclipse) ellen nem ad újat**, és az entitás-központúság **enyhén ront**: több
   kis raj könnyebben elszigetelhető, mint egy nagy háló.
5. **A magánéletet rontja mindkét réteg.** Az I.: *amit tárolsz, elárulja, mi érdekel*. A II.:
   *a kereséseid átmennek valakin*. ⚠️ Ez ma nem probléma (mindenki mindent tárol) — **a
   szeletelés hozza be.** Az [`adat_osztalyozas.md`](adat_osztalyozas.md)-hez tartozik, és a
   D6 szellemével kell összevetni.
6. **A titkos szavazást nem érinti** — az N3 információelméleti korlátja áll.

---

## 11. FOGALOMTÁR — a két mechanizmus dióhéjban

### DHT (elosztott hasítótábla)

Egy hasítótábla, aminek a rekeszei nem a memóriában, hanem **külön gépeken** vannak.

1. **Közös számtér:** a kulcsot ÉS a csomópontot is számmá hasítjuk. *(A koinóban a
   csomópont száma természetesen adódna: az e-ember kulcsából.)*
2. **Felelősségi szabály:** egy kulcsért az a csomópont felel, amelyik száma a **legközelebb**
   van hozzá — kiosztás és nyilvántartás nélkül, **kiszámítva**.
3. **Távolság:** a Kademlia XOR-t használ, mert **szimmetrikus** — ha megismerlek, te is
   megismersz.
4. **Felezés:** mindenki csak ~log N másikat ismer (sok közelit, kevés távolit); a keresés
   minden lépésben legalább **felezi** a távolságot → **1 milliárdnál ~30 lépés**.
5. **Példányszám + karbantartás:** a k legközelebbi tárolja; a bejegyzés lejár, a tulajdonos
   újra közzéteszi.

**Amit nem ad:** bizalmat, Sybil-védelmet (ld. 5.6/2), magánéletet.

### Merkle-fa

**A feladat:** egymillió tételt **egyetlen kis számmal** elkötelezni, és **egyről**
bebizonyítani, hogy köztük van — az egymillió elküldése nélkül.

**Az építés:** párosával összehasítunk, amíg egy szám marad.

```
  L1    L2    L3    L4    L5    L6    L7    L8      ← levelek (a tételek lenyomatai)
   └──┬──┘     └──┬──┘     └──┬──┘     └──┬──┘
   A=h(L1,L2)  B=h(L3,L4)  C=h(L5,L6)  D=h(L7,L8)
      └─────┬─────┘           └─────┬─────┘
         E=h(A,B)                F=h(C,D)
            └───────────┬───────────┘
                    R = h(E,F)                      ← a GYÖKÉR
```

**A bizonyíték = a testvérek az úton fölfelé.** Hogy `L3` benne van: elküldöm `L4`-et
(→ `B`), `A`-t (→ `E`), `F`-et (→ `R`). Ha a kapott `R` egyezik az ismert gyökérrel, `L3`
tényleg benne van. **Három szám nyolc levélhez** — `log₂(8) = 3`.

| Levél | Bizonyíték | Méret (32 B/hash) |
|---|---|---|
| 1 millió | 20 lépés | 640 B |
| **8 milliárd** | **33 lépés** | **~1 KB** ← *innen jön a D21 „~1 KB"-ja* |

> ⭐⭐ **AKI TÁROL, NEM TUD HAZUDNI** — hamis levél nem adja ki a gyökeret. Ezért a tárolónak
> **nem kell megbízhatónak lennie, akár ellenség is lehet.** Ez a D21 lényege: **bizalmi
> problémából elérhetőségi probléma** lesz.

⚠️ **Egy feltétel:** a levelek **kanonikus sorrendben** kell álljanak, különben két gép
ugyanabból a halmazból **más fát épít**. Ugyanaz a lecke, mint a `rendezettBemenet`-nél.

**Az ÖSSZEGZŐ változat** (4.6): a csomópont vigye a darabszámot és az összesítést is, a
hasított tartalmon belül —

```
A = h(L1,L2) + { darab: 2, támogat: 1, ellenez: 1 }
R = h(E,F)   + { darab: 8, támogat: 5, ellenez: 3 }   ← a végeredmény ITT áll
```

— így nemcsak az bizonyítható, hogy *„benne vagyok"*, hanem az is, hogy **„a végösszeg
ennyi"**. *(Precedens: a Git így köti össze a commitokat; a Bitcoin így enged egy könnyű
klienst ellenőrizni a teljes lánc nélkül.)*

### DAG (irányított körmentes gráf)

**A probléma:** honnan tudjuk, mi történt előbb, **ha nincs közös óra**? (A koinóban az `ido`
a szerző órája, tehát hazudható.)

**Az alkatrész — a koino már használja:** az esemény neve **a tartalmának lenyomata**, és
magában hordozza az előzője nevét (`elozo`). ⚠️ Az irány **visszafelé** megy: az új mutat a
régire — ettől hamisíthatatlan, mert egy régi esemény átírása **minden rá mutató mutatót
elrontana** (a Git így működik).

**Három fokozat:**

```
1. LÁNC (ma):        Anna:  #4 ──► #3 ──► #2 ──► #1
                     Béla:  #3 ──► #2 ──► #1          (két külön lánc)

2. ELÁGAZÁS:                 ┌─► #3a                  (a `csere.js` elagazasok mezője:
   (gyanújel)        Anna: #2┤                         a kettős cselekvés bizonyítéka)
                             └─► #3b

3. IGAZI DAG:        Anna:  #3 ──► #2 ──► #1
   (`latott`)               └──────► Béla #2          ("ezt már láttam, amikor írtam")
```

**Amit ad:** ha Anna `#3`-ából el tudsz sétálni Béla `#2`-jéig, akkor Anna `#3`-a
**biztosan később keletkezett** — akármit ír az `ido` mezőbe. Ez a **részleges rendezés**:
amik között nincs út, azok **egyidejűek**.

> ⭐ **A koino már ezt a filozófiát választotta, csak nem így hívtuk.** A blokklánc **teljes**
> sorrendet kényszerít, és ezért drága (bányászat). A **D17** viszont kimondta:
> *„e-emberenként az utolsó nyer, ezért nem kell globális sorrend."* — **A domainből jutottunk
> oda, ahova mások a technológiából.** Ahol mégis kell teljes sorrend, az a **tartós mag**
> (azonosság, pénz), és arra a D21 kötegelése való.

**Amit nem ad:** a sorrend **nem hitelesség**, és **a hiány nem bizonyítható** — elhallgatni
mindig lehet. *(Ez a koino visszatérő témája: nem hamisítás, hanem visszatartás.)*

---

*Épít: **D14** · **D17** · **D18** · **D19** · **D21** · **D25** · **D32** · **D33–D35** ·
**D38** · **D40–D42**. Kód: [`javaslatSzamitas.js`](../koino/js/allapot/javaslatSzamitas.js) ·
[`szabalyok.js`](../koino/js/allapot/szabalyok.js) · [`csere.js`](../koino/js/csere/csere.js) ·
[`vonal.js`](../koino/js/csere/vonal.js) · [`tarsak.js`](../koino/js/csere/tarsak.js).*
