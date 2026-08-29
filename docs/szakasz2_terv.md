# Szakasz 2 — A KAPCSOLAT (részletes terv)

*Készült: 2026. 08. 28. — a [Fázis 2 terv](fejlesztesi_terv_fazis2.md) lépés-sorrendjének
**2. szakasza**, a **D29** (a koino önálló program, nem böngésző) után. Az előzmény:
[`szakasz1_terv.md`](szakasz1_terv.md) — a helyi koino kész, 90 önpróbával.*

---

## Mit épít ez a szakasz — és mit nem

**Épít:** két készülék **megtalálja egymást és kicseréli az eseményeit**, majd mindkettő
**ugyanazt az állapotot számolja**. A végén Csaba a laptopján és a telefonján ugyanazt a
koinót látja — anélkül, hogy bármelyikük „a szerver" lenne.

**Nem épít:**

| Ami kimarad | Miért |
|---|---|
| **Jelzőpont-szolgáltatás** | Előbb megmérjük, kell-e egyáltalán. Ha két készülék IPv6-on összeér, a bemutatkozást kézzel is át lehet vinni. *Előbb mérünk, aztán építünk infrastruktúrát.* |
| **Felfedezés** (hogyan találod meg azt, akinek nem tudod a címét) | Ez a bizalmi hálóval együtt lesz értelmes (Szakasz 3). Itt a címet **kézzel** adjuk meg. |
| **Titkosított csatorna** | A koino tartalma a közösségé, és minden esemény **aláírt** — a hitelesség nem a csatornán múlik. ⚠️ De a **metaadat** (ki kivel beszél, mikor) így látható a hálózaton. Tudatos halasztás, felírva a nyitott kérdések közé. |
| **Mindig futó csomópontok** | A D21 harmadik rétege; ahhoz előbb működő csere kell. |

---

## 1. A JÓSLAT, amit igazolni kell

> **Az összefésülés triviális**, mert az azonos tartalmú események **azonos nevet** kapnak
> (a név a tartalom lenyomata), és a duplikátumok maguktól elnyelődnek.

Ez nem remény: a mentés **már ma is idempotens** — ha egy esemény megvan, a második mentés
`marMegvolt`-ot ad vissza, és nem csinál semmit. A hálózaton ugyanez fut le, csak nem a
saját eseményünkkel.

**Amit ebből igazolni kell:** ha két készülék kicseréli, amit tud, akkor **ugyanazt az
állapotot számolják** — ugyanazokat az entitásokat, ugyanazokat a javaslat-eredményeket,
ugyanazokat az ellentmondás-jelzéseket. Ez a Szakasz 1 „a sorrend nem számít" próbájának
hálózati megfelelője, és ez a szakasz **vizsgája**.

---

## 2. A CSERE-PROTOKOLL — mit kérdez A gép B-től

A lánc szerkezete egy nagyon olcsó összefoglalót enged meg. Nem kell felsorolni, mely
eseményeket ismerjük: elég **szerzőnként a legnagyobb sorszám**.

| Üzenet | Tartalma | Mérete |
|---|---|---|
| `ALLAS` | szerzőnként: a nyilvános kulcs + a legnagyobb ismert sorszám + **hézagok** + **elágazások** + a lánc **ujjlenyomata** | **162 bájt / e-ember** (mérve, 50 fő) |
| `KEREK` | mely szerző mely sorszámait kérem | pár bájt / hiány |
| `ESEMENY` | soronként egy aláírt esemény | ~400 bájt / esemény |

**Három tulajdonsága van, ami miatt ez a jó alak:**

1. **A hálózati alak = a tárolási alak.** Egy esemény ugyanaz a JSON-sor a fájlban és a
   dróton. Nincs külön hálózati séma, amit külön karban kellene tartani — és a forgalom
   egy szövegszerkesztővel is megnézhető.
2. **Szimmetrikus.** Nincs kliens és szerver: mindkét fél elküldi az állását, és mindkettő
   kér, amit hiányol. Aki kezdeményez, az csak annyiban más, hogy ő nyitja a kapcsolatot.
3. **A hézag magától látszik.** Ha B azt mondja, Anna láncából a 7-esig ismer, én pedig
   csak az 5-öst ismerem, akkor tudom, mit kérjek. Nem kell külön „mi hiányzik"-számítás.

**Amit a beérkezett eseménnyel teszünk:** semmi újat. Ugyanaz az `esemenyMentese` fut le,
mint a sajátnál — **ellenőrizetlen esemény nem kerül a tárba** (aláírás + azonosító), és
az elágazás mentéskor lelepleződik. Ez a Szakasz 1 óta kész.

### ⚠️ AMIT A MEGÉPÍTÉS HELYESBÍTETT (2026-08-28, mérve)

*A fenti terv azt mondta: „elég szerzőnként a legnagyobb sorszám". **Ez nem volt igaz** —
a megvalósítás közben két lyuk derült ki, mindkettőt önpróba bizonyítja
([`csereProba.js`](../koino/meres/csereProba.js), 19 próba).*

| Ami hiányzott | Mi történt volna nélküle | Rontás-próba |
|---|---|---|
| **hézagok** | Az egyik gép 1,2,**_**,4-et ismer, a másik 1,2,3,4-et. Mindkettő azt mondja, „a 4-esig" — a **3-as örökre hiányozna**. A terv 4. pontja szerint a hézag hálózaton *normális*, tehát ez nem ritka eset. | a rontás elbuktatja a hézag-próbát |
| **a lánc ujjlenyomata** (a „fej" helyett) | Ha a kettős aláírás a lánc **közepén** van, a legnagyobb sorszám azonos, elágazásról egyik gép sem tud, **és a fej is azonos** — a két gép némán azt hinné, egyetért. A teljes láncot fedő ujjlenyomat ugyanannyiba kerül (43 karakter), de ezt is megfogja. | a rontás elbuktatja a rejtett-elágazás próbát |
| **elágazások** | Az ujjlenyomat enélkül is felderítené — de a **teljes lánc** elkérése árán. Így egyetlen sorszám elkérése elég. | a rontás elbuktatja a célzott-kérés próbát |

**Egy finomítás, ami a pazarlást szünteti meg:** aki **hosszabb** láncot ismer a másiknál,
annak az ujjlenyomat-eltérés magától értetődő (több eseményt tud) — ezért **nem kér vissza
semmit**. E nélkül minden csere azzal indulna, hogy az előrébb tartó visszakéri az egész
láncot, amit már ismer. *Ez a szabály egyben a leállást is garantálja: két gép közül
legalább az egyik sosem „előrébb tartó", tehát a teljes-tartomány-kérés mindig lefut
valamelyik oldalon.*

⭐ **Módszertani jegyzet:** mindhárom mezőt **rontás-próbával** igazoltuk (elrontjuk a
szabályt, és megnézzük, elbukik-e a próba). Az első körben az elágazás-mező rontása
**átment** — vagyis a próba nem azt mérte, amit állított. A próbát élesítettük.

---

## 3. A HÁLÓZAT — a „szolgáltató nélkül" három fokozata

*Csaba kérdése: „arra vagyok a legkíváncsibb, hogy két készülék, külön IP-címről, tud-e
kapcsolódni szolgáltató nélkül."*

| Szerep | Kell-e? | Függés-e? |
|---|---|---|
| **Jelzőpont** (a cím/bemutatkozás átvitele) | Kell valamilyen csatorna — akár **egy ember**, kézzel | **Nem.** Postás, nem hatóság. |
| **STUN** („mi a nyilvános címem?") | NAT mögött a készülék nem tudja a saját külső címét | Fél-függés: pár csomag, tartalmat nem lát, bárki futtathat ilyet. **Kihagyható, ha van globális IPv6.** |
| **Továbbító (TURN)** | Csak ha a közvetlen út nem jön össze | **Ez a drága függés** — a gyakoriságát meg kell mérni, nem megbecsülni. |

### Amit már megmértünk (2026-08-28, a fejlesztő laptopján)

- a WebRTC-adatcsatorna helyben **23 ms** alatt összeáll (a gépezet megy);
- a **böngésző elrejti** a saját címeit (`xxxx.local`), és ezt a nevet **csak a helyi
  hálózat** tudja feloldani → két külön hálózat között használhatatlan;
- a gépen viszont **négy globális IPv6-cím** van a routertől (`2001:4c4d:25cb:b200:…`).

⚠️ **Mérési tanulság:** a böngésző először azt mondta, „nincs IPv6" — a rendszer cáfolta
(`Get-NetIPAddress`). **Hamis negatív volt.** Ez is a D29 melletti érv: a böngésző nem
azt mondja meg, mid van, hanem hogy ő mit ad oda.

### Miért más ez natívan

Egy böngésző-lap **nem tud fogadni kapcsolatot**. Egy önálló program **igen**: kinyithat
egy portot és figyelhet. Ezzel a kérdés végre mérhető:

> **Ha mindkét készüléknek van globális IPv6-címe, és a tűzfal átengedi, akkor a kapcsolat
> közvetlen — se jelzőpont, se STUN, se továbbító.** Az IPv6 nem NAT-ol.

Ez a szakasz **legfontosabb mérése**. Ha igaz, a koino a legszigorúbb értelemben is
szolgáltató nélkül működik két készülék között. Ha nem, akkor pontosan tudni fogjuk, **mi
hiányzik és miért** — nem sejtés alapján.

---

## 4. ⚠️ DÖNTÉS ELŐTT: a hézag és a szelektív mutogatás

*A Szakasz 1-ből örökölt nyitott kérdés — a [`szakasz1_terv.md`](szakasz1_terv.md) 9.
szakasza írja le, mérési adattal.*

Ha valaki a **saját láncából elrejt egy eseményt** egyes gépek elől, azok nem tudják
kiszámolni a keretét, és **átmegy nekik a keret-túllépés**. A csalás nyoma bennmarad
(hézag a sorszámokban), de az állapot ma **nem jelzi**.

**A választás nem „biztonságos vs. nem", hanem melyik hibát vállaljuk:**

| Ma | Ha óvatosak leszünk |
|---|---|
| a hiányos tudású gép **elhiszi** az igazolhatatlant | a hiányos tudású gép **nem számolja** az igazolhatatlant |
| a csalás átmenetileg működik | a becsületes ember eseménye átmenetileg nem látszik |

**Miért ide tartozik:** a hézag hálózaton **normális** átmeneti állapot — két csere között
mindig van. Az „óvatos" szabály ára tehát attól függ, **milyen gyorsan érnek körbe az
események**. Ezért előbb mérünk (5. lépés), és utána döntünk.

*Javaslat a mérés után: óvatosak legyünk (a koino máshol is a „nem tudjuk" felé téved, nem
az „elhisszük" felé), de a jelzés legyen megkülönböztethető — „még nem tudom igazolni" nem
ugyanaz, mint „szabálysértő".*

---

## 5. ⚠️ DÖNTÉS ELŐTT: egy ember, két készülék

A D25 szerint **egy kulcsod van**, és ugyanaz azonosít mindenhol. Csabának **laptopja és
telefonja** van. Ha mindkettőn cselekszik, mielőtt összeérnének, a **saját lánca
kettéágazik**: azonos sorszám, két különböző esemény.

A koino ezt ma kezeli (determinisztikus választás + jelzés), de **„ellentmondásnak"
nevezi** azt, ami itt csak két készülék. Három út:

| Út | Ára |
|---|---|
| **a) Cselekvés előtt össze kell érni** | egyszerű, de a „két készülék offline" hétköznapi eset szenved tőle |
| **b) Készülékenként külön lánc** ugyanahhoz a kulcshoz (pl. `szerzo` + készülék-jel) | tiszta, de új mezőt tesz az eseménybe → érinti a kanonikus alakot |
| **c) Elfogadjuk és jelezzük** (a mai állapot) | semmi új kód, de a saját magad elleni „bizonyíték" félrevezető |

*Ez azért döntés, mert a b) érinti az esemény szerkezetét — vagyis a legveszélyesebb
részletet (kanonikus alak). Előbb lássuk, hogyan szinkronizálnak a készülékek.*

---

## 6. A LÉPÉSEK — apró, külön-külön kipróbálható darabok

| # | Lépés | Mi az eredménye | Hogyan próbáljuk ki |
|---|---|---|---|
| **1a** | ✅ **A csere LOGIKÁJA**, hálózat nélkül ([`js/csere/csere.js`](../koino/js/csere/csere.js)) | két tár kicseréli, amit tud | **kész: 19 önpróba** + három rontás-próba |
| **1b** | ✅ **A vonal**: ugyanez sima TCP-n ([`js/csere/vonal.js`](../koino/js/csere/vonal.js)) | két folyamat kicseréli, amit tud | **kész: 5 önpróba + kézi próba** két adat-mappával, egy gépen |
| **2** | ✅ **A vizsga:** két készülék, kevert események → **azonos állapot** | a jóslat igazolva | **kész: 10 önpróba** ([`vizsgaProba.js`](../koino/meres/vizsgaProba.js)) + az `ujjlenyomat` parancs |
| **3** | **Hézag és részleges tudás** | eldől a 4. pont kérdése | mérés: mennyi idő alatt ér körbe egy esemény; utána döntés + megvalósítás |
| **4** | **Két hálózat, IPv6-on** — laptop itthon, telefon a szomszédban | **a szakasz nagy kérdése** | valódi próba, kézzel átvitt címmel, **STUN és jelzőpont nélkül** → **útmutató: [`telepites_telefon.md`](telepites_telefon.md)** |
| **5** | *(csak ha a 4. megkívánja)* jelzőpont, majd továbbító | a hiányzó darab — de csak az, ami tényleg hiányzik | mérés alapján |

> ### 🔀 A LÉPÉS-SORREND ÁTÍRVA (2026-08-29, a D33–D35 után)
>
> A 4. lépés első kísérlete megbukott, és a hibakeresés során kiderült, hogy **rossz
> feladatot oldottunk meg**: nem azt kell elérni, hogy egy adott gép **fogadni** tudjon,
> hanem hogy **a hálózat összefüggő maradjon** (D33). Ettől a sorrend megváltozik:
>
> | Új # | Lépés | Miért itt | Mennyi munka |
> |---|---|---|---|
> | **A** | ✅ **TÖBB TÁRS** — a `csere` ne egy címre menjen, hanem egy **társ-listára**, és próbálja mindet | ez viszi a párban mért 70%-ot **99% fölé**, és minden más ettől függ | **kész (2026-08-29): 25 önpróba** — [`js/csere/tarsak.js`](../koino/js/csere/tarsak.js) |
> | **B** | ✅ **OLCSÓ CSERE** — összesített ujjlenyomat előbb, részletes `ALLAS` csak eltérésnél | **D35: befogadási feltétel**, nem optimalizálás | **kész (2026-08-29): mérve 158 bájt a 16 158 helyett** |
> | **C** | ✅ **POSTALÁDA-SZEREP** kimondása — aki fogad, az tárol és továbbad | ⭐ **jórészt már ma is ezt csinálja**, csak nincs kimondva | **kész (2026-08-29): 3 önpróba + valódi három-készülékes mérés** |
> | **D** | **TERJEDŐ CÍMJEGYZÉK** — aláírt, **mulandó** cím-üzenetek a meglévő cserén | ettől bővül a társ-lista magától | közepes |
> | **E** | **LYUKFÚRÁS** (`talalkozo`) — rögzített helyi portról, kifelé, ismételve | ⚠️ **lecsúszott**: az A. lépés után már csak a maradékra kell | közepes |
> | **F** | **HELYI FELFEDEZÉS** — azonos wifin lévő készülékek maguktól | eltünteti a kézi cím-beírást | kicsi |
>
> **Amit ez a sorrend kimond:** a 4. lépés (két hálózat, IPv6) **már nem vizsga, hanem
> mérés** — a koino sorsa nem múlik rajta (D31), csak azt mondja meg, hányan tudnak
> postaláda lenni.

### ✅ AZ A. LÉPÉS MEGVAN (2026-08-29) — és amit a megépítése hozott

**Amit bizonyít** (a legfontosabb próba: *„egy társ bukása nem dönti el a kört"*): három
társ a listán, kettő **halott cím**, és a csere ettől még végigment — 1/3 vette fel, 3 új
esemény, 28 ms. A régi `csere <cím>` az első elérhetetlen címnél elszállt volna, és a
harmadik társ **soha** nem kapja meg az eseményeket. Ez volt a 2. szabály néma megsértése.

**Három döntés, ami a megépítés közben született:**

| Kérdés | Döntés | Miért |
|---|---|---|
| A társ-lista **esemény** legyen? | ❌ **Nem** — helyi JSON-fájl (`tarsak.json`) | A cím nem igazság, hanem múlandó körülmény. Egy aláírt esemény örökre megmarad; egy IP-cím két hét múlva már másé. *(A terjedő címjegyzék a D. lépés — ott lesznek aláírt, de MULANDÓ üzenetek.)* |
| Megálljunk az **első sikernél**? | ❌ **Nem**, de van `legfeljebb` korlát | A D33 célja az összefüggőség: minél több társ, annál nehezebb kettészakadni. A korlát viszont kell, mert a csere ára **befogadási kérdés** (D35). |
| A sokszor bukott társ **essen ki**? | ❌ **Nem**, csak hátrébb kerül | A hálózat változik: aki hetekig elérhetetlen volt, holnap visszajöhet. Törölni **csak kézzel** lehet (4. szabály). |

⚠️ **A nulla siker sem hiba**: ha egy társ sem válaszol, a parancs ezt kiírja, de nem dob
hibát és nem ad 1-es kilépési kódot — a koino helyben ugyanúgy működik tovább.

---

### ✅ A B. LÉPÉS MEGVAN (2026-08-29) — a csere ára 102-ed részére esett

**A változás egyetlen mondatban:** a kör már nem a részletes állással kezdődik, hanem egy
**43 karakteres lenyomattal** (`LENYOMAT` üzenet). Ha a kettő egyezik, a kör azonnal véget
ér — a részletes `ALLAS` el sem indul.

| Mérve, 50 e-ember, „nincs újdonság" csere | Bájt |
|---|---|
| a régi protokoll (2× részletes állás, oda-vissza) | **16 158** |
| a mai protokoll | **158** |

⭐ **Ez 102-szeres különbség — és nem a hálózatot kíméli, hanem a mobilos e-ember
számláját.** A D35 épp ezért nem optimalizálás: az 5 percenkénti csere egy 1000 fős
koinónál 46 MB/nap volt, most ~4,5 MB — ennyi már belefér egy olcsó előfizetésbe is.

**Két dolog, ami emiatt NEM változott meg — és próba őrzi mindkettőt:**

1. **A lenyomat nem takar el semmit.** Ha a tudás eltér, a részletes állás ugyanúgy
   elindul. Külön rontás-próba méri, hogy a **lánc közepén elrejtett elágazás** az olcsó
   kezdés után is előjön — ez volt a legfontosabb kockázat.
2. **A „csendes kör" feltétel megmaradt.** A lenyomat akkor állít meg, ha a két fél
   *egyetért*. Ha a másik fél hibás vagy rosszindulatú, és nem adja meg, amit kérünk, a
   lenyomat sosem egyezne — a csendes kör viszont kilép. A kettő **együtt** zárja ki a
   végtelen ciklust.

**Ami menet közben megszületett:** a csere mostantól **megmondja, hány bájt ment el**
(`bajtKuldott` / `bajtKapott`), és a parancssor ki is írja. *Ami nem mérhető, azt nem lehet
olcsóvá tenni* — a D35 száma így nem elmélet marad.

⚠️ **A vonal-protokoll változott** (új `LENYOMAT` üzenet a kör elején). Régi és új
készülék nem tud egymással cserélni: a telefonon frissíteni kell. Verzió-egyeztetést
szándékosan **nem** építettünk — kiadás előtt vagyunk, és *ami ritka és nem végzetes, azt
felírjuk, de nem építjük meg*.

---

### ✅ A C. LÉPÉS MEGVAN (2026-08-29) — a postaláda kimondva és megmérve

*A terv azt írta: „jórészt már ma is ezt csinálja, csak nincs kimondva." Ez igaz volt —
de a **kimondás** nem csak szóhasználat: amíg nincs próba rá, addig csak reméljük.*

**A mérés a D34 pontos alakjában** (Anna és Béla **egyike sem nyit kaput**, csak Cilihez
szólnak ki; Cili üresen indul):

| Lépés | Eredmény |
|---|---|
| 1. Anna → Cili | Cili átvett 3 eseményt |
| 2. Béla → Cili | Béla megkapta Anna 3 eseményét |
| 3. Béla létrehoz valamit, → Cili | Cili átvett 2-t |
| 4. Anna → Cili | **Anna megkapta Béla tartalmát** |

Anna állapotában ott van *„Bela tartalma"* — pedig **Anna és Béla soha nem beszélt
egymással, és egyikük sem fogadott kapcsolatot.**

⭐ **Amit ez bizonyít:** Cilinek **nem kell egyszerre online tartania** a két felet. Minden
kapcsolat lezárult, mielőtt a következő nyílt. Ez a TURN (élő továbbító) drágasága, és a
koino megúszta — nem okosságból, hanem mert a döntései nem másodpercesek.

**Három önpróba őrzi** (`vizsgaProba.js`), és a harmadik a legfontosabb:

1. a postaláda-kör: Anna és Béla azonos ujjlenyomatra jut, három beszélgetésből;
2. a postaláda **olyat is továbbad, amiről ő maga nem tud semmit** — a továbbításhoz nem
   kell „érdekeltség";
3. ⚠️ **a postaláda NEM kap engedékenyebb kaput**: a hamisított eseményt nem veszi át és
   nem is adja tovább. E nélkül a postaláda-szerep épp azt tenné veszélyessé, amit olcsóvá
   tesz — a D32 („a bizalom az aláírásban van, nem a csatornában") itt dől el.

**A `figyel` parancs mostantól kimondja a szerepet**, és vezeti a mérleget:

```
POSTALÁDA   (a kapu nyitva a 7575-es porton)
  ✓ csere ::ffff:127.0.0.1 — átvettem 0, továbbadtam 3 (2 kör, 2.1 KB)
    összesen: 2 beszélgetés · 3 átvett · 3 továbbadott · 4.2 KB
```

> ### ⚠️ EGY FELÍRT KORLÁT, amit a megépítés hozott elő
>
> **A postaláda ma csak abban a koinóban postaláda, amelyikben ő maga is benne van.** A tár
> koinónként külön mappa, és a csere a saját koinója eseményeit adja-veszi — egy idegen
> koino forgalmát nem venné át.
>
> Ez a **terjedés** szempontjából lesz kérdés: egy nagy koino tagja nem tudna postaláda
> lenni egy kis családi koino számára, pedig épp az ilyen „erős" készülékek tudnának
> segíteni. **Felírva, nem megépítve** — előbb a D. lépés (terjedő címjegyzék) mutassa meg,
> mekkora a valódi hiány.

---

### 🕐 KELL-E EGYSZERRE KERESNIÜK A TÁRSAKAT? — és mit jelent ez a MEDIÁN-IDŐRE

*Csaba kérdése (2026-08-29): „ha az időzítés fontos, hogy egyidőben keressék a társakat az
eszközök, akkor a medián-időt lehet, hogy előre kell venni."*

**A kérdés jó, és két különböző dolgot fed — érdemes szétválasztani:**

| | **ÁTFEDÉS** | **RANDEVÚ** |
|---|---|---|
| Mit kíván | mindkét fél **ébren legyen** ugyanabban az ablakban | mindkét fél **ugyanabban a másodpercben** lépjen |
| Kell hozzá közös óra? | ❌ **nem** — elég egy ütem | ✅ **igen** |
| Hol fordul elő | a mai csere és a postaláda (D34) | a **lyukfúrás** (E. lépés), ahol egyszerre kell kifelé csomagot küldeni |

⭐ **A mai működéshez ÁTFEDÉS kell, nem randevú** — és az átfedéshez nem kell egyetértés az
időben. Ha mindenki mondjuk 5 percenként próbálkozik, az órák eltérhetnek akár egy órával
is: a próbálkozások fázisa véletlen, tehát előbb-utóbb egybeesnek. **Épp ez a D34 haszna:**
a postaláda azért volt jó ötlet, mert *megszünteti* az egyidejűség kényszerét — Anna és
Béla soha nem beszél egymással, mégis mindent kicserélnek Cilin keresztül.

**Ezért a medián-időt NEM vesszük előre — de nem azért, mert a kérdés téves:**

1. **Az A. lépéshez nem kell óra.** Megmérve: a csere-réteg (`csere.js`, `vonal.js`,
   `tarsak.js`) **egyetlen óra-hivatkozást sem tartalmaz** — a protokoll sorszámokkal
   dolgozik, nem időbélyeggel. `grep "Date.now" js/csere/` → nincs találat.
2. **A randevúnál sem az órák HAZUGSÁGA a probléma, hanem a CSÚSZÁSUK.** A medián-idő
   viszont a hazug óra ellen való (a 4. irány) — ott van értelme, ahol valaki **nyerhet**
   a hazugsággal: a szavazás lezárásánál. Egy randevúnál a hazug óra csak a hazudót bünteti
   (lekési a találkozót), tehát nincs mit védeni.
3. **A szavazási rendszerhez most nem nyúlunk** — ez a döntés áll (lásd az öt irányt).

⚠️ **Amit viszont a kérdés helyesen jelez, és felírunk:** ha egyszer az **E. lépés**
(lyukfúrás) sorra kerül, ott **valóban másodperces egyidejűség** kell. Ott lesz először
tétje annak, hogy két készülék órája mennyire tér el — de akkor is elég a szokásos
óra-pontosság; a medián-idő ott sem **szinkronizáló** eszköz, hanem **védelmi**.

---

**A 4. lépés a szakasz vizsgája.** *(⚠️ A fenti átírás óta már nem — lásd ott.)* Ha két
készülék külön hálózatról, szolgáltató nélkül kicseréli az eseményeit, akkor a Fázis 2
gerince nemcsak áll, hanem **működik is**.

---

## 7. A MÉRENDŐ SZÁMOK

Ezek nem kíváncsiságból kellenek — mindegyik **eldönt valamit**:

| Szám | Mit dönt el | Mérve |
|---|---|---|
| **mennyi idő alatt ér körbe egy esemény** | a józan **minimum döntési időt** (D4), és a 4. pont „óvatosság"-ának árát | **9 ms** a laptopon, **77 ms a telefonon** (kapcsolatnyitás + két kör, helyben). Az alsó korlát tehát a leglassabb készüléken is elhanyagolható — a valódi számot a hálózat adja majd (4. lépés). |
| **összeér-e két készülék IPv6-on, STUN nélkül** | kell-e egyáltalán infrastruktúra | *(4. lépés)* — de a vonal `::1`-en már áll |
| **hányszor NEM jön össze a közvetlen út** | kell-e **továbbító** — a P2P legdrágább része | *(4. lépés)* |
| **az `ALLAS` üzenet mérete N e-embernél** | skálázódik-e a csere-protokoll, vagy szeletelni kell | **162 bájt/fő** (50 fő, 3-3 esemény). 10 000 fős koinónál ~1,6 MB — **ez már szeletelést kíván**, felírva. ⚠️ A B. lépés óta ez csak akkor megy el, ha a tudás TÉNYLEG eltér. |
| **mennyi adat megy át egy csere alatt** | mit jelent a napi működés egy mobil-előfizetésnek | ✅ **„nincs újdonság" csere: 158 bájt** oda-vissza, 50 e-embernél (a régi protokollban 16 158). Valódi hálózaton még mérendő (4. lépés). |

---

## 8. A KÉSZÜLÉKEK — Csaba korlátai, és mi következik belőlük

*Ezek nem apróságok: a 4. lépés kivitelezhetősége múlik rajtuk.*

| Korlát | Következmény |
|---|---|
| **Nincs mobilnet** | de a telefon átvihető a **szomszédba**, ahol más hálózatra csatlakozik → **külön router, külön nyilvános cím** — ez épp a jó mérés |
| **Nincs második laptop** | a szomszédban nincs kábeles port-forwarding → a telefonnak **magának** kell futtatnia a koinót |
| **Nem akar Cloudflare-alagutat** | *„épp az érdekel, hogy két készülék külön IP-ről tud-e kapcsolódni szolgáltató nélkül"* → helyes: az alagút épp azt a kérdést kerülné meg |

**Ebből következik:** a telefonon **natívan** fusson a koino (Android + Termux + Node) —
ami a D29 után amúgy is a természetes út. Így nincs se böngésző, se kábel, se alagút,
és **a mérés azt méri, amit mérni akarunk**.

📱 **A telepítés lépésről lépésre: [`telepites_telefon.md`](telepites_telefon.md)** — benne
az Ed25519 ellenőrzése a telefonon, a kód letöltése (2026-08-28 óta **fenn van a nyilvános
repóban**), a mérés menete, és a diagnosztikai létra, ha nem megy.
⭐ **Ki figyeljen?** A **laptop**, mert otthon a te routered van — a szomszéd routerének
tűzfalán nem múlhat a mérés.

A **cím és a bemutatkozás** átvitelére: kézzel (kiírva, QR-kódként vagy üzenetben). Ez
postás, nem szolgáltató — és a mérés érvényességét nem rontja, mert a kérdés az, hogy az
**adatcsatorna** közvetlenül épül-e ki.

---

## 9. Nyitott kérdések

1. **A hézag kezelése** — 4. pont. *Mérés után döntjük el.*
2. **Egy ember, két készülék** — 5. pont. *A csere megismerése után döntjük el.*
3. **Titkosítás és metaadat.** A tartalom nyílt (a közösségé), de „ki kivel beszél" ma
   látható a hálózaton. Mikor kell csatorna-titkosítás, és milyen?
4. **Mit tegyünk, ha a másik fél hazudik az állásáról** (azt mondja, nincs neki, holott
   van)? Ez a D21 „elérhetőségi probléma"-ága: nem tud hamisat mondani, csak **hallgatni**.
5. **Meddig tartsuk a kapcsolatot?** Egyszeri csere, vagy nyitva maradó vonal, amin az új
   események azonnal átfolynak? (Az utóbbi kell a gyors döntésekhez.) *Ma: a kapcsolat a
   csendes körig él, aztán lezárul — több kört fut, de nem marad nyitva.*
6. ✅ **Az `ALLAS` ára** — **eldöntve: D35** (2026-08-29). Már nem optimalizálás, hanem
   **befogadási feltétel**: 1000 fős koinónál 5 percenkénti cserével 46 MB/nap, ami egy
   mobilos e-embert a **számlája** miatt zárna ki. Megoldás: összesített ujjlenyomat előbb,
   részletes állás csak eltérésnél (1,6 MB → ~100 bájt). **Ez a B. lépés.**
8. 🆕 **A SZÉTSZAKADÁS mérése.** A D33 óta nem az a kockázat, hogy „A nem éri el B-t",
   hanem hogy a hálózat **két szigetre esik**. Az `ujjlenyomat` megmutatja, ha már
   megtörtént — de **honnan tudja egy e-ember, hogy le van maradva?** Kell-e jelzés arról,
   hogy „régen beszéltem bárkivel"?
9. 🆕 **Rádió (LoRa) mint sáv.** 2–10 km, szolgáltató nélkül, ~400 bájtos eseményekhez
   bőven elég; ⚠️ az EU-s szabad sávban **1% adásidő-korlát** (néhány száz üzenet/nap),
   és külön eszköz kell (~8–10 ezer Ft). Kis közösségnek elég, nagynak nem. *Felírva, nem
   tervezve.*
10. 🆕 **Tor onion-cím.** ⭐ Ez ad **elérhető címet annak is, aki semmilyen kaput nem tud
    nyitni** — vagyis bárkiből lehetne postaláda. A Briar bizonyítja, hogy Androidon
    működik. Ára: lassabb, függ egy külső (önkéntes) hálózattól, és van, ahol tiltják.
    *A platform-függetlenség 2. szabálya szerint: csak úgy, ha elhagyható.*
7. ✅ **AZ ENTITÁSOK SORRENDJE** *(felvetve és lezárva 2026-08-28)*. A kézi próbán a csere
   után mindkét készülék ugyanazokat az entitásokat számolta ki — de **más sorrendben**
   sorolta fel őket (a fájlba érkezés sorrendje). Az ÉRTÉKEK sorrend-függetlenek voltak, a
   LISTÁK nem. **Megoldva:** az állapotszámítás a bemenetet **egy helyen** rendezi
   (`rendezettBemenet`), és innen lefelé minden felsorolás ezt örökli.
   *A sorrend `szerzo` + `sorszam` + `azonosito` — nem az idő szerint, mert az `ido` a
   szerző órája; ha az óra döntené el a sorrendet, egy rossz óra átrendezhetné, amit
   mindenki lát.* A megjelenítés sorrendje ettől külön kérdés (a parancssori arc a
   tudatpont szerint rangsorol) — a felület dolga, nem a számításé.

---

## Napló

- **2026-08-29 (a fordulat)** — 🔀 **ROSSZ FELADATOT OLDOTTUNK MEG — D33–D35.**
  Négy estén át azon dolgoztunk, hogy a laptop **fogadni** tudjon kapcsolatot: kézi
  router-szabály, NAT-PMP, PCP, UPnP — mind megbukott. Aztán Csaba feltette a kérdést, ami
  a feladatot írta át: *„a koinóban nem konkrét címzetthez kell eljuttatni valamit, hanem
  mindenkinek… mindegy, hogy kivel sikerül kapcsolódni, az már tudja továbbítani máshova."*

  **A három döntés** (teljes leírás: [`fejlesztesi_terv_fazis2.md`](fejlesztesi_terv_fazis2.md)):
  **D33** a cél az **összefüggőség**, nem az elérhetőség (egymillió főnél is ~14 kapcsolat
  fejenként) · **D34** **postaláda**, nem élő továbbító (a koino nem valós idejű, tehát a
  közvetítőnek nem kell két felet egyszerre online tartania) · **D35** a csere ára
  **befogadási kérdés**, nem optimalizálás.

  **Csaba két helyreigazítása, ami idevezetett:**
  1. *„a döntések napokban mérődnek" — ez nem igaz*, lehet órákban is. **A lassúságra nem
     szabad védelemként hivatkozni** (a CLAUDE.md 5. szabálya javítva).
  2. *„nem lehet minden PC továbbító"* — ellentmondtam magamnak; igaza volt. Továbbító csak
     az lehet, aki fogadni tud. ⭐ **De a „csak kifelé" gépek is megkapnak mindent**, mert a
     csere kétirányú — ezt a saját mérésünk bizonyítja (a telefon kiszólt, és 3 eseményt
     kapott, 2-t küldött).

  **A lépés-sorrend átírva** (lásd a 6. szakaszban): előbb **több társ**, aztán **olcsó
  csere**, és a lyukfúrás lecsúszott.

- **2026-08-29 (a router megkérdezése)** — ⚠️ **AZ AUTOMATIKUS KAPUNYITÁS EZEN A ROUTEREN
  NEM MEGY — megmérve.** A kézi port-szabály után az volt a kérdés, tud-e a koino **magától**
  kaput kérni a routertől (ezt csinálják a játékok és a letöltőprogramok). Két szabvány
  létezik ugyanazon az UDP-porton (5351):

  | Protokoll | Mit tud | A Telekom Home Box |
  |---|---|---|
  | **NAT-PMP** (RFC 6886) | csak IPv4 | ✅ **válaszol** (megadta a CGNAT-címet: `100.97.184.76`) |
  | **PCP** (RFC 6887) | **IPv6 tűzfal-rés** — ez kellene | ❌ `verzió=0, hibakód=1` = *„nem ismerem ezt a verziót"* |

  **Vagyis a router csak a régi, IPv4-es szabványt tudja** — az viszont a szolgáltatói NAT
  (CGNAT) miatt használhatatlan befelé. **Ez a router nem tud IPv6 tűzfal-rést nyitni.**

  Az eszköz megmarad ([`js/csere/kapunyitas.js`](../koino/js/csere/kapunyitas.js), `kapu`
  parancs): **más routereknél működhet**, és ha működik, az e-embernek semmit nem kell a
  router felületén megkeresnie. ⚠️ **Segédeszköz, nem előfeltétel** (a platform-függetlenség
  2. szabálya): ha a router nemet mond, a koino ugyanúgy megy tovább — csak ő kezdeményez
  kifelé.

- **2026-08-28 (a 4. lépés első kísérlete)** — ⚠️ **KÉT HÁLÓZAT KÖZÖTT NEM JÖTT ÖSSZE — és
  pontosan tudjuk, miért.** A telefon a szomszédban, a laptop itthon, `figyel 7373`.
  Eredmény: **`A másik fél nem válaszol (10000 ms)`**, és **a laptophoz semmi nem érkezett
  meg** (a figyelő naplója üres maradt).

  **A behatárolás — mindkét oldal megmérve, nem feltételezve:**

  | Amit megmértünk | Eredmény |
  |---|---|
  | van-e a **telefonnak** globális IPv6 a szomszédban | ✅ `2001:4c4e:25d3:a601:35:5dff:fe43:b16a` |
  | van-e a **laptopnak** globális IPv6 itthon | ✅ `2001:4c4d:25cb:b200:7395:e583:5de6:5a1a` |
  | engedi-e a **Windows tűzfal** a bejövő kapcsolatot | ✅ `node.exe` · Inbound · Public · **Allow** — és a hálózat kategóriája **Public**, tehát a szabály érvényes |
  | megérkezett-e bármi a laptopig | ❌ **semmi** |

  ⭐ **Marad egyetlen lehetőség: az otthoni router IPv6-tűzfala** (Telekom-059293) eldobja
  a kéretlen bejövő kapcsolatot. Ez a legtöbb otthoni routeren **alapértelmezés**.

  **Amit ez NEM jelent:** hogy a koino nem működik. A **D31** mércéje épp ezt az esetet
  fogadja el: nem kell mindenkinek tudnia kapcsolatot *fogadni* — aki nem tud, az
  **kifelé** kapcsolódik. A mérés így nem a koino sorsát döntötte el, hanem azt, hogy **ez
  a laptop ma nem tud kaput nyitni a világ felé**, amíg a router beállítása meg nem
  változik.

  **A következő lépés:** az otthoni router IPv6-tűzfalán átengedni a 7373-as portot, majd
  a mérés megismétlése. ⚠️ *Ehhez nem kell újra átsétálni: ha a szomszéd PC-jén futna a
  koino, bármikor tudna kapcsolódni, és a router-beállítás azonnal próbálható lenne.*

  **Két korábbi hiba, ami ebből tisztázódott:**
  - a szomszédban kapott `EHOSTUNREACH` (a laptop helyi címére) **más hiba volt**, mint a
    mostani `timeout` — az első azt jelenti, „nincs út", a második azt, „volt út, nem jött
    válasz". A kettő nem keverendő.
  - a laptop **állandó** IPv6-címe `…7395:e583:5de6:5a1a` — ez a napot és a
    hálózatváltást is túlélte, tehát nem minden globális cím cserélődik naponta.

- **2026-08-28 (két VALÓDI készülék)** — ⭐⭐ **AZ ELSŐ CSERE KÉT KÜLÖNBÖZŐ GÉP KÖZÖTT.**
  Nem két folyamat egy gépen, hanem **laptop (Windows / x86 / Node v22.16.0) ↔ telefon
  (Android / ARM64 / Node v26.3.1)**, valódi wifin. A laptop `figyel`, a telefon `csere`.
  - **Szimmetrikus volt:** a laptop 2 eseményt kapott és 3-at küldött, a telefon fordítva.
  - **A telefon kiírta a koino nevét, amit soha nem hozott létre** — nem elhitte,
    kiszámolta a kapott eseményekből.
  - ⭐ **A két ujjlenyomat BETŰRE AZONOS** (`ujjlenyomat` parancs, kézzel összeolvasva):
    TUDÁS `ER96chiJ…` · ÁLLAPOT `Z0hnDbhS…`. Ez a **D17 ígéretének első igazolása két
    fizikailag különböző készüléken**.
  - **A felsorolás sorrendje is azonos** — a `rendezettBemenet` (ugyanaznap épült) két
    valódi gépen igazolva.
  - ⚠️ **Nyitva maradt:** a szomszédban a telefon `EHOSTUNREACH`-et kapott a laptop helyi
    címére, holott a laptop ott a szomszéd wifijén volt (`192.168.150.134`,
    IPv6-előtag `2001:4c4e:25d3:a601`). **Az okot nem tudjuk** — vendég-hálózat, kliens-
    elszigetelés vagy más. *Legközelebb a szomszédban ELŐSZÖR `cimek`-et kell futtatni a
    telefonon, és csak utána cserét.* A C-szakaszos mérést ez valószínűleg nem érinti (ott
    a telefon kifelé, IPv6-on kapcsolódik, nem a helyi hálózaton keres).
  - *A két ház 150 méterre van, dombbal takarva — a szomszéd hálózata tehát valóban külön
    hálózat, semmi nem mossa össze a kettőt. Ez a C szakasz szempontjából jó hír.*

- **2026-08-28 (a telefon)** — ⭐ **A KANONIKUS ALAK ÁTMENT EGY MÁSIK GÉPRE.** A `koino/`
  lefutott egy **Android telefonon** (Termux, ARM64 / `aarch64`, **Node v26.3.1** — szemben
  a laptop Windows / x86 / **v22.16.0** párosával): **mind a 124 önpróba rendben**.
  **Miért ez a legfontosabb mérés eddig:** a `kanonikusProba.js` tartalmaz egy
  **regressziós horgonyt** — rögzített bemenet → rögzített lenyomat. Ez a telefonon
  ugyanazt adta. A koino egész terve azon áll, hogy két gép ugyanarra az adatra **bájtra
  ugyanazt** számolja; eddig ez **egyetlen gépen bizonyított feltevés** volt, most **két
  architektúrán mért tény**. *(Ráadásul a Node-verzió is különbözött, tehát nem csak a
  processzor.)*
  **Mérve a telefonon:** egy esemény körbeérése helyben **77 ms** (laptop: 9 ms) — a
  telefon lassabb, de a nagyságrend így is elhanyagolható a napokban mérődő döntésekhez
  képest. Az `ALLAS` mérete változatlanul **162 bájt/fő**.
  ⚠️ **Melléktanulság:** a Termux a **Google Play Áruházból** települt és működik — a
  „csak F-Droidból" óvatosság elavult volt. Előbb mérni, aztán állítani.

- **2026-08-28 (a vizsga)** — **A 2. LÉPÉS KÉSZ: a jóslat igazolva.** Két készülék,
  **váltakozva szétosztott** események (tehát mindkét lánc lyukas), csere — és utána
  **azonos az állapot**: ugyanazok az entitások, tudatpontok, küszöbök, ugyanaz a
  javaslat-eredmény, ugyanaz az egyezmény, ugyanazok a jelzések. 10 önpróba.
  **A mérőeszköz:** az [állapot ujjlenyomata](../koino/js/allapot/osszehasonlitas.js) —
  egyetlen 43 karakteres szöveg, ami mindent lefed, ami döntés. Ebből lett az
  `ujjlenyomat` parancs is: a 4. lépésnél két készülék **szemmel** összeolvasható.
  **Amit a vizsga külön bizonyít** (mert egy mindig-átmenő vizsga nem vizsga):
  · csere ELŐTT a két gép ujjlenyomata **különbözik** · a csere utáni közös állapot
  UGYANAZ, mint amit egy mindent tudó gép számolna (két hiányos gép **közös tévedésben**
  is megegyezhetne) · **három** készülék láncolt cserével is ugyanoda jut · a **kettős
  szavazat két készülékről** után is egyeznek, és mindkettő ugyanúgy jelzi az
  ellentmondást · a **szabálysértő** esemény mindkét gépen ugyanúgy esik ki.
  **Egy javítás a Szakasz 1 magjában:** a felsorolások sorrendje (9. pont / 7. kérdés) —
  rontás-próbával igazolva.
  *Egy próba elsőre bukott, és a hiba a PRÓBÁÉ volt, nem a kódé: a küszöböket ezrelékben
  adtam meg, holott százalékban vannak. A kód végig helyesen számolt.*

- **2026-08-28 (a vonal)** — **AZ 1b LÉPÉS KÉSZ: a csere valódi TCP-n.** A szállítás
  (`js/csere/vonal.js`) semmit nem tud a koinóról — csak a `csere.js` objektumait küldi
  soronként egy JSON-üzenetként, vagyis **a vonal alakja ugyanaz, mint a táré**. A menet
  szimmetrikus: egyetlen `parbeszed` fut mindkét oldalon, és **a csendes körnél állunk
  meg** (ha egy körben se nem adtunk, se nem kaptunk) — ezt mindkét fél ugyanúgy számolja
  ki, tehát nem kell hozzá „vége" üzenet.
  **Kézi próba két folyamattal, egy gépen** (`KOINO_ADAT=./adat-A figyel` ↔
  `KOINO_ADAT=./adat-B csere`): a két készülék kicserélte az eseményeit, és utána
  **mindkettő ugyanazt a két tartalmat és ugyanazt a koino-nevet** számolta ki — a B gép
  úgy tudta meg a koino nevét, hogy soha nem hozta létre. Új parancsok: `figyel` és
  `csere`. A vonal `::1`-en (IPv6) is áll.
  ⚠️ **Amit a kézi próba talált:** a két gép **más sorrendben** sorolja fel az entitásokat
  (a fájlba érkezés sorrendje). Ma csak megjelenítés, de a 9. pont 7. kérdéseként felírva.

- **2026-08-28 (a megépítés)** — **AZ 1a LÉPÉS KÉSZ: a csere logikája, hálózat nélkül.**
  A protokoll magja tiszta függvény (két állás → egy kérés), tehát önpróbával mérhető, két
  gép és drót nélkül — **19 próba**, a teljes szám 90-ről **109-re** nőtt.
  **A terv jóslata állja:** az összefésülés tényleg triviális (ugyanaz az `esemenyMentese`
  fut a hálózatról jött eseményre is, a duplikátum magától elnyelődik), és egy kör után a
  két tár ugyanazt ismeri, **fordított irányból indítva is**.
  **De az összefoglaló alakja nem állta:** a „szerzőnként a legnagyobb sorszám" két lyukat
  hagyott (hézag, a lánc közepén rejtett elágazás) — lásd a 2. szakasz helyesbítését.
  *Tanulság a mai naphoz: a rontás-próba egyszer megbukott — az elágazás-mező elrontása
  ÁTMENT, mert a próba egy másik úton is teljesült. A vak ellenőrzés mindig zöld.*

- **2026-08-28** — A terv létrejött, a **D29** után: nem böngészőben, hanem két önálló
  program között. Az alapgondolat, ami a protokollt olcsóvá teszi: **szerzőnként elég a
  legnagyobb sorszámot elküldeni**, mert a lánc szerkezete a többit megmondja. A szakasz
  nagy kérdése mérhetővé vált: natívan egy program **tud fogadni kapcsolatot**, tehát a
  globális IPv6-on a **közvetlen, szolgáltató nélküli** kapcsolat valóban kipróbálható.
