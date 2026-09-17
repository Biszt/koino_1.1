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
| **Titkosított csatorna** | A koino gondolata a közösségé, és minden esemény **aláírt** — a hitelesség nem a csatornán múlik. ⚠️ De a **metaadat** (ki kivel beszél, mikor) így látható a hálózaton. Tudatos halasztás, felírva a nyitott kérdések közé. |
| **Mindig futó csomópontok** | A D21 harmadik rétege; ahhoz előbb működő csere kell. |

---

## 1. A JÓSLAT, amit igazolni kell

> **Az összefésülés triviális**, mert az azonos gondolatú események **azonos nevet** kapnak
> (a név a gondolat lenyomata), és a duplikátumok maguktól elnyelődnek.

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

| Üzenet | Gondolata | Mérete |
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
| **STUN** („mi a nyilvános címem?") | NAT mögött a készülék nem tudja a saját külső címét | Fél-függés: pár csomag, gondolatot nem lát, bárki futtathat ilyet. **Kihagyható, ha van globális IPv6.** |
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
> | **B** | ✅ **OLCSÓ CSERE** — összesített ujjlenyomat előbb, részletes `ALLAS` csak eltérésnél | **D35: befogadási feltétel**, nem optimalizálás | **kész (2026-08-29): mérve 334 bájt a 16 158 helyett** |
> | **C** | ✅ **POSTALÁDA-SZEREP** kimondása — aki fogad, az tárol és továbbad | ⭐ **jórészt már ma is ezt csinálja**, csak nincs kimondva | **kész (2026-08-29): 3 önpróba + valódi három-készülékes mérés** |
> | **D** | **TERJEDŐ CÍMJEGYZÉK** — aláírt, **mulandó** cím-üzenetek a meglévő cserén | ettől bővül a társ-lista magától | közepes |
> | **E** | **LYUKFÚRÁS** (`talalkozo`) — rögzített helyi portról, kifelé, ismételve | ⚠️ **lecsúszott**: az A. lépés után már csak a maradékra kell | közepes |
> | **F** | ✅ **HELYI FELFEDEZÉS** — azonos wifin lévő készülékek maguktól | eltünteti a kézi cím-beírást | **kész (2026-08-30): 13 önpróba** — [`js/csere/helyiFelfedezes.js`](../koino/js/csere/helyiFelfedezes.js) |
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
| a mai protokoll | **190** |

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
| 4. Anna → Cili | **Anna megkapta Béla gondolatát** |

Anna állapotában ott van *„Bela gondolata"* — pedig **Anna és Béla soha nem beszélt
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

### ⚠️ CSABA KÉRDÉSE, AMI EGY HIBÁT HOZOTT ELŐ (2026-08-29)

*Az első feljegyzésem így szólt: „a postaláda csak abban a koinóban postaláda, amelyikben
ő maga is benne van." Csaba rákérdezett: **„még akkor sem, ha a családinak is a tagja?"** —
és a mérés kiderítette, hogy **rosszul fogalmaztam, és emellett egy valódi hiba is volt
a kódban.***

**A korlát nem a tagságról szól.** Az, hogy **egy `figyel` = egy koino**: a
`KOINO_AZONOSITO` a folyamat indulásakor eldől. Aki két koinónak is tagja, két `figyel`-t
futtat, két porton — nem elvi akadály, csak kényelmetlenség.

**A hiba viszont valódi volt.** Megmérve, mi történt, ha egy MÁSIK koino készüléke szólt be:

| | Előtte (mérve) | Utána (mérve) |
|---|---|---|
| a csere lefutása | **5 kör, 17,2 KB** | **1 kör, 191 bájt** |
| Béla `nagy` mappája | `{nagy: 3, csaladi: 3}` | `{nagy: 3}` |
| Cili `csaladi` mappája | `{csaladi: 3, nagy: 3}` | `{csaladi: 3}` |

Két baj volt együtt: **(1)** az idegen koino eseményei bekerültek a mappába — az állapotot
nem rontották el (a `koinoEsemenyei` szűr), de ott ültek, és egy hazug fél így korlátlanul
tölthette volna a lemezt; **(2)** mivel az `ALLAS` mindig csak a saját koinóra készül, a
két lenyomat **sosem konvergált** — a csere a kör-korlátig pörgött, ugyanazt küldve újra.

**A javítás két rétegű, szándékosan:**

1. a `LENYOMAT` üzenet megmondja, **melyik koinóról** beszélünk — eltérésnél a csere
   azonnal, tisztán véget ér. Ez az **őszinte tévedést** fogja meg (két idegen koino
   találkozása egy nyitott hálózaton teljesen rendes dolog);
2. a **beolvasztás szűr** a koino szerint — ez a **hazugot** fogja meg, aki a mi koinónkat
   mondja be, és mást küld. Az `esemenyMentese` szándékosan nem tud erről: ő az aláírást
   és az azonosítót nézi, és jól teszi.

⭐ **És amit ez megnyit:** mivel a protokoll mostantól **kimondja, melyik koinóról szól**,
később egy `figyel` **több koinót is kiszolgálhat** — vagyis egy erős készülék tényleg
tudna postaláda lenni egy kis családi koinónak. Ez volt Csaba kérdésének a valódi gondolata.
**Felírva, nem megépítve** — előbb a D. lépés mutassa meg, mekkora a valódi hiány.

---

### ⭐⭐⭐ MOBILHÁLÓZATRÓL IS ÁTMEGY (2026-08-30, 12:52) — a CGNAT-kérdés megválaszolva

*A terv ezt nyitva hagyta: „Ami őszintén bizonytalan marad: a fejlesztő vonala **CGNAT** — a
szolgáltatói NAT kiszámíthatatlanabb egy házi routernél. Hogy a pajzsfúrás átmegy-e rajta,
azt **csak méréssel** lehet megtudni, nem levezetéssel." **Megmértük.***

**A helyzet:** Csaba barátja átjött, a telefonján **mobilnet**. Nincs globális IPv6, a
címei `10.7.54.67` és `10.88.16.117` — vagyis **CGNAT**. A laptop vonala szintén CGNAT.
Két szolgáltatói NAT, egymással szemben, port-továbbítás nélkül.

| Mérés | Eredmény |
|---|---|
| a mobil NAT **célfüggetlen-e** (két tükör) | ✅ **igen** — mindkettő `130.43.208.72:41933` |
| az otthoni NAT célfüggetlen-e | ✅ igen — mindkettő `31.46.250.127:26359` |
| **a pajzs átfúrható-e** | ⭐ **IGEN, mindkét irányban** |
| **átmegy-e a csere a résen** | ⭐ **igen: 9 esemény, 6,7 KB, 2 kör** |
| **ugyanazt számolja-e a két készülék** | ⭐⭐ **igen — az ujjlenyomat KARAKTERRE azonos** |

⭐⭐⭐ **A VIZSGA ÉLESBEN.** A csere után mindkét készülék ugyanazt írta ki:

```
TUDÁS     bS0p3Cu2KiOA59GbnZp9H20h7RWvX41zg4EqmYItAuU   2 e-ember · 9 esemény
ÁLLAPOT   SzGwPqybDFfFKMNAUE93zE1884KEuu5jUUHuqiRUfmA   4 entitás · 0 javaslat
```

Egy **idegen telefon**, **mobilhálózatról**, **két szolgáltatói NAT mögül** — ugyanaz a
koino. Ez az 1. szakasz jóslata („ha két készülék kicseréli, amit tud, ugyanazt az állapotot
számolják"), most nem önpróbában, hanem a valóságban.

⭐⭐ **ÉS AMI A LEGTÖBBET MONDJA — a két oldal ideje:**

| | laptop (előbb kezdte) | telefon (később) |
|---|---|---|
| kopogás | **110** | **1** |
| idő | **110 297 ms** | **191 ms** |

A laptop két percig fúrt, és **melegen tartotta a rést**. Mire a telefon elindult, az ajtó
már nyitva volt — az **első** kopogása azonnal átment. Ez a **D39 felismerésének mérése**:
*„egy folyamatosan futó készülék gyakorlatilag fogadóképes"* — nem azért, mert a routere
beengedi, hanem mert a kifelé szólás nyitva tartja a rését.

✅ **A MÉRÉS KÉT HIBÁT HOZOTT ELŐ — MINDKETTŐ MEGJAVÍTVA (2026-08-30):**

1. **A rés címe NEM társ-cím.** A csere után a laptop felvette a `130.43.208.72:41933`-at a
   társ-listára — de az **UDP-only** (az `orjarat` TCP-vel hívja, tehát azonnal bukik), és
   **percek alatt elévül** (D39: „a port mozgékonyabb, mint a cím"). A lista ma nem tudja
   megkülönböztetni a tartós TCP-címet a múlandó UDP-réstől. *Mérve: `1× nem sikerült`
   közvetlenül a sikeres csere után.*
   → ✅ **JAVÍTVA:** a rés címét **nem hirdetjük** többé. ⭐ Ez nem a D39 visszavonása: aki
   KAPUT TART NYITVA (`figyel`), az továbbra is hirdeti a saját címét, mert az tartós és
   TCP-vel hívható. A rés nem az. Visszakapcsolható, ha az őrjárat egyszer maga is tud
   fúrni — de akkor a társ-listának meg kell tanulnia, mi múlandó és mi tartós.
2. **A `pajzsfuro` nem tudja megmondani a saját külső portját.** A `kulsoport` KÜLÖN
   foglalatot nyit, méri, bezárja — a fúró viszont ÚJ foglalatot nyit, ami más leképezést
   kaphat. Most a NAT jóindulatán múlt, hogy ugyanazt adta (a tükör visszaigazolta:
   `26359`). Ráadásul **fúrás közben nem is lehet mérni**: a STUN-válasz a fúró
   foglalatára megy.
   → ✅ **JAVÍTVA:** a `pajzsfuras` a **saját foglalatáról** méri, és induláskor kiírja —
   sőt a bemondandó parancsot is. *(Bizonyíték a volatilitásra: ugyanazon a délutánon a
   külső port `26293 → 26359 → 6075` volt.)* A STUN-választ a fúró külön felismeri, hogy
   ne számolja beérkezett kopogásnak — enélkül a mérés hazudna.

---

### ✅ AZ F. LÉPÉS MEGVAN (2026-08-30) — és két hamis feltevést buktatott

**Mit vált ki:** a kézi cím-beírást. Egy háztartáson belül fölösleges címeket olvasgatni —
a két készülék ugyanazon a wifin van, elég egy kiáltás. **Két szerep:**

- aki **keres**, az KIÁLT (`felfedez` parancs) — és megkapja a válaszokat;
- aki **dolgozik** (`orjarat`, `figyel`), az FELEL — de magától soha nem szólal meg.

⚠️ **Kényelem, nem előfeltétel** (2. és 4. szabály): ha a wifi tiltja a kliensek közti
forgalmat, ez üres kézzel tér vissza, és a kézi `tars` út változatlanul megmarad. Ezért
nem is fut magától — külön parancs. És **bizalom nem jár vele** (3. szabály): a cím a
**foglalatból** jön, nem az üzenetből (aki hazug címet mond magáról, nem ér el semmit),
és a felfedezett cím **sosem lesz esemény** — múlandó körülmény, mint a terjedő címjegyzéké.

#### ⚠️ KÉT HAMIS FELTEVÉS, AMIT A VALÓDI MÉRÉS BUKTATOTT

Mindkettőt **átvitte** az önpróba, és mindkettő **elbukott két valódi példánnyal**:

| Amit feltételeztem | Mi történt valójában | A javítás |
|---|---|---|
| elég **egyszer** kiáltani, induláskor | félsiker: az egyik meghallotta a másikat, **visszafelé nem** — mert a másik egy másodperccel később indult, és az egyetlen kiáltás addigra elhangzott. **Két ember sosem nyom egyszerre entert.** | fél másodpercenként ismételünk (~70 bájt/kiáltás) |
| elég, ha **mindkét fél a `felfedez`-t futtatja** | egy `figyel`-t futtató postaláda **meg sem hallotta** a kiáltást — pedig épp őt kellett volna megtalálni | `felfedezoValaszolo`: a dolgozó készülék felel |

És egy harmadik, ami csak egy gépen jön elő: a felfedező port **rögzített**, tehát két
példány ugyanazon a porton ül, és a **célzott** válasz a „rossz" foglalatra érkezhet.
Ezért a válasz a **csoportnak is** elmegy. *(Válaszra senki nem válaszol → nem gyűrűzik.)*

⚠️ **Módszertan:** az önpróbák szándékosan **nem multicasttal** mérnek, hanem célzott
csomagokkal — különben a HÁLÓZATOT mérnék, nem a programot, és hol zöldek lennének, hol
nem. A szórás valódi átmenetele **kézi mérés**.

**MÉRVE (2026-08-30, valódi hálózaton, 192.168.1.134):** a postaláda elindult (semmit nem
írtunk be neki) · a másik készülék `felfedez` → **1 készüléket találtam 3013 ms alatt,
+1 új társ a listán** · `csere` érv nélkül → **kaptam 2, küldtem 2** · és a két készülék
**ujjlenyomata bájtra azonos** lett. **Egyetlen címet sem írtunk be.**

---

### ⭐⭐⭐ ÁTFÚRTUK A PAJZSOT (2026-08-29, 21:46) — KÉT HÁZTARTÁS, SZOLGÁLTATÓ NÉLKÜL

*Ez a Szakasz 2 nagy kérdésének a válasza, és igenlő.*

```
21:46:37 a fúró elindult (7373-es port)
21:46:37 … fúrok (1. kopogás)
  ✓ ŐK IS HALLANAK MINKET (145.236.111.251)

⭐ A PAJZS ÁTFÚRVA — mindkét irány működik.
  1 kopogás, 1 válasz, 232 ms alatt
```

**A két oldal:**

| | Laptop (itthon) | Telefon (a szomszédban) |
|---|---|---|
| helyi port | 7373 | 7373 |
| **külső cím és port** | `31.46.250.127:51967` | `145.236.111.251:7373` |
| a NAT viselkedése | **átírja** a portot (CGNAT, kétszeres NAT) | **megtartja** a portot |

⭐ **Amit ez bizonyít:** két **hétköznapi otthoni hálózat** — az egyik mögött **szolgáltatói
CGNAT** — közvetlenül összeér. **Nincs továbbító, nincs port-továbbítási szabály, nincs
szolgáltató az útban.** Egyik routeren sem állítottunk be semmit.

**Miért működött, és miért nem korábban:**

1. **Célfüggetlen NAT** (mérve két különböző kiszolgálóval): a laptop külső portja
   ugyanaz, akárkihez szól — tehát a fúrás **célozható**. Ha szimmetrikus lett volna, ez
   az egész út lezárult volna.
2. **A külső portot meg kellett tudni.** Előtte vaktában a `7373`-ra kopogtunk, ahol a
   laptop oldalán nincs semmi — a NAT az `51967`-esre írta át. *Egy este ment el arra,
   hogy ezt nem mértük, hanem feltételeztük.*
3. **Mindkét fél kifelé indult**, ugyanarról a helyi portról — így a két rés
   egymásra illeszkedett (ez a pajzsfúrás lényege, D37).

### ⭐⭐⭐ ÉS UGYANAZON AZ ESTÉN: A CSERE IS ÁTMENT (2026-08-29, 22:54)

*Az UDP-szállítás megépülte után, ugyanazzal a két készülékkel:*

```
⭐ A PAJZS ÁTFÚRVA — mindkét irány működik.
  1 kopogás, 1 válasz, 83 ms alatt

CSERE A RÉSEN
  ✓ kaptam 2 új eseményt, küldtem 0 (2 kör, 3.7 KB)
  + 1 új társ-címet tanultam
  Kívülről így látszol: 145.236.111.251:7373
```

| | Laptop (itthon) | Telefon (a szomszédban) |
|---|---|---|
| **esemény** | küldött **2** | kapott **2** |
| **címjegyzék** | +1 új társ-cím | +1 új társ-cím |
| **tükör** | `31.46.250.127:51967` | `145.236.111.251:7373` |

⭐⭐ **EZZEL A SZAKASZ 2 NAGY KÉRDÉSE MEGVÁLASZOLVA, ÉS A VÁLASZ IGEN.**
Két hétköznapi otthoni hálózat — az egyik mögött szolgáltatói **CGNAT** — **koino-eseményt
cserélt**, továbbító nélkül, port-továbbítási szabály nélkül, szolgáltató nélkül az útban.
Egyik routeren sem állítottunk be semmit.

És a csere mindent vitt, ami hozzá tartozik: az **eseményeket**, a **címjegyzéket** (a
társ-lista magától bővült) és a **tükröt** (mindkét fél megtudta a saját külső címét).

⚠️ **Ami ehhez kellett, és amit egy estén tanultunk meg:** a külső portot **meg kell
mérni**, nem feltételezni (a laptopé 7373 → 51967); a NAT-nak **célfüggetlennek** kell
lennie (mérve, az); és a UDP-n **pótolni kell**, amit a TCP ingyen ad (megérkezés, sorrend
— 30%-os csomagvesztésre is van próba).

---

### ⭐⭐⭐ ÉS MEGISMÉTELVE, EGY MÁSIK HÁLÓZAT-PÁRON (2026-09-13, 22:38)

*Terepmérés: Csaba a telefonnal egy MÁSIK szomszédban, más wifin, két héttel később.
Teljes jegyzőkönyv: [`koino/meres/eredmenyek.md`](../koino/meres/eredmenyek.md) 17.*

| | Gép (itthon) | Telefon (a szomszédban) |
|---|---|---|
| **külső cím és port** | `31.46.250.205:54013` | `5.187.186.127:7373` |
| a NAT viselkedése | **átírja** a portot | **megtartja** a portot |
| **átfúrva** | ⭐ igen, mindkét irányban | ⭐ igen, **1 kopogásra, 190 ms** |
| **a csere a résen** | ✓ 1 kör | ✓ 1 kör |

⭐⭐ **A 190 ms a valódi szám.** A másik oldal 237 másodperce **nem a fúrás ára volt, hanem a
várakozásé** — addig kopogott egyedül, amíg a másik fél el nem indult. Amint mindkét fél élt,
a rés **az első kopogásra** összeért.

⭐⭐⭐ **És ez az érv a BULI mellett, mérve:** a pajzsfúrás nem lassú és nem bizonytalan —
**egyidejűséget** kíván. Megbeszélt találkozóval két tized másodperc; megbeszélés nélkül
órákig kopogunk egymás mellett.

⛔⛔ **A TCP-fúrás kérdése viszont NYITVA MARADT.** A TCP-fúróval indultunk, és nem ment —
⚠️ **de ez nem cáfolat**: a routerem az IPv4-portot minden foglalatnál **más számra** írja át
(**25787 → 6119 → 33905 → 54013**), a UDP-fúró ezt **megméri a saját foglalatáról**, a
TCP-fúrónak viszont **nincs ilyen mérése** (a tükör `udp4`). A másik fél tehát a `7373`-ra
kopogott, ahol nincs rés. ⏸️ **Előbb mérendő, mint bármit megépíteni:** célfüggetlen-e a
TCP-leképezés? Ha kapcsolatonként ad új portot, a TCP-fúrás ezen a vonalon **elvi okból**
lehetetlen.

⛔ **Két hiány a fúróban, amit ez az este hozott ki:** a tükör `udp4`-re van drótozva
(`pajzsfuro.js:167`), ezért **IPv6-on a fúró vak** · és a fúró **nem mondja meg, melyik saját
címéről szól ki** (`localAddress`) — két globális IPv6 mellett ez eldönti, melyik címhez
nyílik a rés. ⚠️ És egy harmadik, ami nem a kódé: az **ideiglenes IPv6-cím négy óra alatt
háromszor cserélődött**, tehát **előre kiadni nem lehet**.

⚠️ **A STUN-ról őszintén:** a külső portot ma egy külső kiszolgálótól kérdeztük meg
(`kulsoport` parancs). Ez **segédeszköz, nem előfeltétel** (D38): a kiszolgáló paraméter,
bizalom nem jár vele, és hosszú távon **a koino saját tükre váltja ki** (`vonal.js`,
`latlak`) — aki fogad, az amúgy is látja, honnan jövünk. Ma azért kellett, mert még nem
volt kihez szólni; ez pontosan a D37 „első bemutatkozás" esete.

---

### ⚠️ A 4. LÉPÉS ELSŐ VALÓDI MÉRÉSE (2026-08-29 este) — és amit rosszul hittünk

*A telefon a szomszéd lakásba került, a laptop itthon maradt. Este többször is
következtetést vontam le, és **kétszer is vissza kellett vonnom** — mindkétszer Csaba
kérdése miatt. A végén ez maradt, bizonyítékkal:*

| Mérés | Eredmény |
|---|---|
| laptop → nyilvános IPv6 (Google DNS) | ✅ 8 ms |
| telefon (itthon, azonos wifi) → laptop 7373 | ✅ csere lefutott, 7 esemény |
| telefon (szomszéd) → **Cloudflare** `2606:4700:4700::1111` | ❌ **ENETUNREACH** |
| telefon (szomszéd) → **Google** `2001:4860:4860::8888` | ❌ **ENETUNREACH** |
| telefon (szomszéd) → laptop | ❌ **ENETUNREACH** |

⭐ **A TANULSÁG, ami az egész szakaszt érinti: A CÍM NEM UGYANAZ, MINT AZ ÚT.**
A telefonnak **volt** globális IPv6-címe a szomszédnál (`2001:4c4e:25d2:8101:…`) — ezt
korábban úgy jegyeztük fel, hogy „a telefonnak a szomszédban működő IPv6-a van". **Ez
téves volt.** A router kiosztja az előtagot (ezért képez magának címet a készülék), de nem
hirdeti magát kijáratnak, vagy a szolgáltató nem ad neki IPv6-ot. A cím megvan, az út nem.

**Amit ezért NEM mértünk meg, pedig azt hittük:** egyik router tűzfalát sem. A csomagok
oda sem jutottak. A korábbi „mindkét router zárja a bejövőt" következtetés **nem áll**.

⚠️ **És amit ez a tervnek jelent:** abból indultunk ki, hogy az IPv6 általában elérhető, és
erre épült a közvetlen kapcsolat terve (D31). Két hálózatból **egyben** volt működő IPv6.
Ha ez az arány általános, akkor előbb-utóbb kell az **IPv4-es út** is — ahol viszont a
router átírja a portot, tehát **STUN kellene**, épp az, amit eddig elkerültünk.

**A 4. lépés tehát továbbra is NYITOTT.** Nem a koinón és nem a pajzsfúrón múlt — olyan
második hálózat kell, ahol tényleg van IPv6.

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
| **mennyi adat megy át egy csere alatt** | mit jelent a napi működés egy mobil-előfizetésnek | ✅ **„nincs újdonság" csere: 190 bájt** oda-vissza, 50 e-embernél (a régi protokollban 16 158). Valódi hálózaton még mérendő (4. lépés). |

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
3. **Titkosítás és metaadat.** A gondolat nyílt (a közösségé), de „ki kivel beszél" ma
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
  **mindkettő ugyanazt a két gondolatot és ugyanazt a koino-nevet** számolta ki — a B gép
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

---

### ⭐⭐⭐ ÉS A TCP-FÚRÁS IS ÁTMEGY (2026-09-13, 23:34) — a Szakasz 2 utolsó nyitott kérdése

*A 2026-08-29-i és a 17. mérés egyaránt **UDP**-vel ment; a TCP-fúrást a napló szerint **soha
nem mértük meg**. Most igen. Teljes jegyzőkönyv: [`koino/meres/eredmenyek.md`](../koino/meres/eredmenyek.md) 19.*

| | Gép (itthon) | Telefon (a szomszédban) |
|---|---|---|
| **külső TCP-cím** | `31.46.250.205:63517` | `5.187.186.127:7373` |
| a NAT viselkedése | **átírja** a portot | **megtartja** a portot |
| **átfúrva TCP-vel** | ⭐ a 16. próbálkozásra (11 474 ms) | ⭐⭐ **az 1.-re, 76 ms** |
| **a csere a résen** | ✓ 1 kör | ✓ 1 kör |

⭐⭐⭐ **Amit eldönt:** a TCP negyven évnyi csiszolása (ablak, torlódás-vezérlés, újraküldés)
**elérhető ott, ahol a router célfüggetlen.**

⛔⛔⛔ **DE A DÖNTÉS EZZEL SZEMBEN SZÜLETETT (Csaba, 2026-09-13):** *„az UDP-ét kell
használnunk, és nem ússzuk meg a munkát. De ez nem baj, ha ettől lesz készülék- és
router-független."* ⭐⭐ A különbség nem sebességbeli, hanem **szerkezeti**: a UDP-nél **egy
foglalat = egy leképezés** (a modellből következik), a TCP-nél minden kapcsolat külön, és
csak a NAT **célfüggetlensége** köti őket össze — egy cél-függő NAT mögött a TCP-fúrás
**elvi okból lehetetlen**. ⛔ **A 9. szabály szerint** egymilliárdnál a router-eltérés
**alapállapot, nem kivétel**. ⭐ Következmény: **a UDP-vonal ablakát meg kell építeni** (16.
mérés: 25 KB/s 1 ms/csomag mellett), a TCP-út pedig **alkalmi gyorssávvá** fokozódik le.

⛔⛔ **És élőben megmutatta, hogy a külső port NEM adható ki előre:** három futáson át
**63539 → 63495 → 63517**, és a társ az első **tizenöt** próbálkozás alatt a **régi** számra
kopogott. ⭐ A siker abban a percben jött, amikor a **friss** számmal indult újra — amit
mostantól **maga a fúró mond ki** (`kulsoCimTcp`, a 18. mérés nyomán).

⚠️ **Amit NEM mond meg:** egy hálózat-pár (egyik port-átíró, másik port-megtartó) — ⏸️ **két
port-átíró NAT között** újra kell mérni · a **számcsere kézi volt** (ezt a buli fogja
elvégezni, és az még nincs megépítve) · a TCP-rés **sebességét** nem mértük.

---

### ✅✅✅ A D67 MEGÉPÜLT — A UDP-VONAL NÉGY DARABJA (2026-09-14)

*Jegyzőkönyv: [`koino/meres/eredmenyek.md`](../koino/meres/eredmenyek.md) 20–23. A kód végig a
[`koino/js/csere/udpVonal.js`](../koino/js/csere/udpVonal.js)-ben él; a fájl-átvitel **egyetlen
sora sem változott** (1. szabály).*

| # | Darab | Amit hozott |
|---|---|---|
| 3. | **Az ablak** (16 darab úton, gyors újraküldés, korlátos fogadó-puffer) | 24 → **460 KB/s** (1 ms) · 11 → 346 (5% vesztés) · 1 → 5 (800 ms) |
| 1. | **A mért újraküldési idő** (Jacobson–Karels + **pontos minták** a `k` mezővel) | 10% vesztésnél 875 → **51 ms** · a lassú vonal pazarlása ×3,0 → ×1,4 |
| 4. | **Az alkalmazkodó ablak (AIMD)** + `tevesFelezes` | **egyharmaddal kevesebb csomag** · a sorrend-csere okozta 234 → 106 KB/s visszaállt 221-re |
| — | **A műszer** (veszteség · ingadozás · lassú vonal · szűk keresztmetszet + sor) | ez tette mindegyiket mérhetővé |

⛔⛔⛔ **A szakasz legfontosabb módszertani tanulsága:** a **sorrendemet a mérés cáfolta.** A
mért RTT-vel kezdtem (a legerősebb bizonyíték állt mögötte), és **erős veszteségnél elrontotta
a vonalat** (30%: 1 bukás, 50%: mind az 5) — mert **stop-and-wait mellett az óra az EGYETLEN
veszteség-jel**, tehát az óvatos óra végzetes. *Az ablak nem gyorsítás, hanem **előfeltétel**.*
⭐ Csaba döntésére visszavettük, és az ablak után **másodszorra** épült meg, hibátlanul.

### ⛔⛔ ÉS A 23. MÉRÉS EGY ÚJ BAJT NYITOTT: BUFFERBLOAT — ITT TARTUNK

```
  UDP-rés (2000 darab/mp, 5 ms)    64 KB    197 ms   325 KB/s   182 csomag  sor: 13
  UDP-rés (500 darab/mp, 5 ms)     64 KB    260 ms   246 KB/s   182 csomag  sor: 14
  UDP-rés (500 darab/mp, 8-as sor) 64 KB    323 ms   198 KB/s   210 csomag  sor:  8  14 torlódásos
```

⛔ A küldő **teletömi a szűk keresztmetszet sorát** a majdnem teljes 16-os ablakával,
**miközben egyetlen csomagot sem veszít** — tehát az AIMD **nem tanul semmit**. Két kár: a
vonalat megosztó **másoknak** (a mi sorunk mögé áll be a hívásuk), és **magunknak is**, mert
a **3 egyidejű fájl-átvitel** ugyanazon a feltöltésen osztozik a **késleltetés-érzékeny
cserével**.

⭐⭐⭐ **A válasz a D68** (2026-09-14, Csaba): **késleltetés-alapú jel** + a fájl-átvitel
legyen **engedékeny** (scavenger), a **csere ne** — és ⭐⭐ **a REDUNDANCIA teszi
megfizethetővé**: ha ugyanazt több társ is hozza, a visszafogás nem állítja meg a munkát.
*Ez a ritka tulajdonság, ami a mérettel JAVUL.* Teljes indoklás, a 9. szabály próbájával és
Csaba három válaszával: **D68** a [`fejlesztesi_terv_fazis2.md`](fejlesztesi_terv_fazis2.md)-ben.

#### ⏭️ A KÖVETKEZŐ SESSION SORRENDJE (ebben a sorrendben)

1. ✅ **A MŰSZER MEGTANULT VERSENGENI (2026-09-14, 24. mérés) — KÉSZ.** Az `udpParos()`
   kapott egy második, **„idegen" terhelést**, ami **ugyanazt a sort** tölti: `egyenletes`
   (50 csomag/mp, mint egy hívás — ő a **sértett fél**) és `moho` (ablakos, veszteség-alapú,
   mint bárki TCP-je — ő a **versenytárs**). ⭐ A sorbanállás kódja **egy helyre került**
   (`sorbaAll`), mert két forgalom használja.
   ⭐⭐ **ÉS A KÉT SZÁM, AMIRE EDDIG VAKOK VOLTUNK:**
   **(1) ártunk másnak** — a hívás késleltetése **2,0 → 12,8 ms** (átlag), a csúcsa
   **2 → 44 ms**, miközben mi egyetlen csomagot sem veszítünk;
   **(2) ma NEM éheztetnek ki minket** — a mohó szomszéd mellett **281 → 141 KB/s**, vagyis
   pontosan **felezünk** (az AIMD ígérete teljesül).
   ⛔⛔ **A 141 KB/s a D68 ÁRCÉDULÁJA:** a késleltetés-alapú jel megépítése után ennek a
   számnak **romlania fog** — ezért kellett MOST megmérni. *A romlás a fájl-átvitelnél
   megengedhető (a redundancia pótolja), a cserénél nem.*
   ⚠️ Amit a műszer még nem tud: a **mobilvonal ingadozása**, és **két koino-folyam** egymás
   mellett (a 3 egyidejű átvitel esete).
2. ✅ **A JEL ALAKJA ELDŐLT — 26. mérés (2026-09-15): VEGAS.** Két jelölt épült meg
   **paraméterként** (`torlodasJel`), és futott ugyanazon a műszeren, ugyanazokon a
   helyzeteken. ⭐ **A Vegas négy okból nyert:** a hívás késleltetése mellette **12 → 3 ms**
   (a LEDBAT csak 6–8-ig jut) · az ára a gyors, üres vonalon **nulla** · az **ingadozó
   (mobil-szerű) vonalon stabil** (−4…−12%, a LEDBAT ott 43%-ot is veszít) · és ⭐⭐⭐ **a
   küszöbe DARABSZÁM** (α=2/β=4), nem ezredmásodperc — a 9. szabály próbáján ez az egyetlen,
   ami magyarázat nélkül megy át. ⛔ Ára: a véletlenül vesztő vonalon −30…−50%, mohó
   szomszéd mellett feleannyi — *a D68 ezt tudatosan vállalja a fájl-átvitelnél.*
   ⛔⛔ **Három MŰSZER-hibát kellett előbb megtalálni** (mind a jelet fojtotta): a `Date.now()`
   ms-felbontása → `performance.now()` · a Windows `setTimeout` **15,6 ms-os kvantálása**
   (a „+1 ms-os" vonal valójában ingadozó, 15 ms-os) · és a jel bemenete (`srtt` átlag helyett
   a friss minták **minimuma**). *Mindhárom a jel belső állapotából (`jelAllapot()`) derült ki.*
2/b. ⛔⛔ **ÉS EGY CÉL, AMI NEM TELJESÜLT — ÜTEMEZÉS KELL HOZZÁ.** A `sor:` **27 → 14–16**
   lett, nem 1–2; szigorúbb küszöbbel (α=1/β=2) sem csökkent, csak az ár nőtt. ⭐ Az ok
   szerkezeti: **a `sor:` a CSÚCSOT méri, azt pedig a LÖKETSZERŰ küldés adja** (16 darab
   egyszerre indul), nem az ablak nagysága. ⏭️ *Amit a D68 (d) pontja „félmegoldásnak"
   nevezett, az valójában a hiányzó másik fele.*
3. ✅ **AZ ENGEDÉKENYSÉG SZÉTVÁLASZTÁSA KÉSZ — 27. mérés (2026-09-15).** A **fájl-átvitel**
   enged (`vegas`), a **csere** nem (`nincs`). ⭐ És a jel **nem a hívó dolga**: a fájl-út
   magával hozza — *ha a hívóra bíznánk, az egyik út megtenné, a másik elfelejtené.*
   ⚠️ A **kiszolgáló** oldalnak is kell, mert a torlódást a küldő okozza (ő küldi a 64 KB-os
   szeleteket). ⭐⭐ **Mérhetővé téve:** a használt jel visszakerül az eredménybe
   (`torlodasJel`), önpróba méri, rontás-próba buktatja.
   ⭐ **Élesben:** a hívás késleltetése **11,5 → 3,0 ms**, csúcsa **45 → 18 ms**; az ár a
   fájl-átvitelen **−14%** (271 → 233 KB/s).
4. ⛔⛔ **AZ ÜTEMEZÉS MEGÉPÜLT, DE ALAPBÓL KI — mért döntés.** Önmagában dolgozik (csúcs
   45 → 24–27, sor 27 → 17–18, **nem lassít**), de a jel mellett nem ad hozzá mérhetőt.
   ⭐⭐⭐ **Az ok szerkezeti: a sor alsó határát az ÓRA szabja meg** —
   `sor_alsó ≈ ébredési köz / szolgálati idő` = 15,6 / 2 ≈ **8 csomag**. *A `sor: 1–2` ezen a
   gépen nem hangolás kérdése, hanem mérhetetlen.* ⏸️ A telefonon (~1 ms-os óra) újra kell
   mérni — a parancs készen áll.
5. ✅ **A TÜRELEM KÉSZ — 28. mérés (2026-09-15).** `turelem(n) = max(5 000, 30 000 / n)`,
   ahol `n` a források száma. ⭐ Egy forrásnál 30 mp (*nincs hova menni*), négynél 7,5, hatnál
   az alsó korlát; az **ismeretlen** forrásszám a legóvatosabb választ adja (D19).
   ⛔ Az alsó korlát a lassú vonalé: 800 ms oda-visszánál 5 mp is csak néhány próbálkozás.
   ⭐ A számítás a **fájl-rétegben** (`turelemForrasokbol`), a vonal **paraméterként kapja** —
   ő nem tudhatja, hány forrás van. ⚠️ A randevúnál marad a teljes türelem: ott nincs
   alternatíva. ⛔⛔ **És egy vak próbát a rontás-próba buktatott le**: a kiírt türelmet
   mértem, nem a használtat — a javított próba **viselkedést** mér (hat nem válaszoló
   forrásnál ~5 mp alatt fel kell adni).
5. ⏸️ **Több forrásból egy fájl — KÜLÖN munka** (Csaba 3. válasza: *„ahogy logikusabb"*).
   ⚠️ Ára: ma **a részleges fájl mérete MAGA az állapot**, ami **sorrendben** érkező
   szeleteket feltételez; több forráshoz **szelet-nyilvántartás** kellene.

**A cél, számokban:** `sor:` **13–14 → 1–2** ⛔ **anélkül**, hogy a véletlenül vesztő sorok
romlanának (1% / 5% / 15% = **287 / 104 / 39 KB/s**), és anélkül, hogy a torlódásos sor
lassulna. ⚠️ **És egy kockázat, amit mérni kell:** mobilvonalon az RTT attól is ingadozik,
aminek semmi köze a sorbanálláshoz (rádiós ütemezés, cellaváltás) — ott **fölöslegesen is
visszafoghatunk**; a műszernek ezt is modelleznie kell.

---

## ⛔⛔⛔ ÉS EGY KÖZBEJÖTT MUNKA A D68 ELŐTT: A SZÁLLÍTÁS BEKÖTÉSE (2026-09-14)

Egy kód-átnézés kimutatta, hogy **a fájl-szállítás megépült, mérve volt, próba őrizte — és
az éles út nem hívta**. Ez a D68 sorrendjét is érinti: ⚠️ *a bufferbloat, amit a 23. mérés
kimutatott (három egyidejű átvitel teletömi a sort), élesben elő sem állhatott, mert három
egyidejű átvitel csak kézzel gépelt `csere` parancsból indult.* **A D68 tehát a bekötés
utáni világ szabálya** — és a bekötés megtörtént.

### Amit a mérés talált

1. ⛔ **Az `orjarat` nem hozott fájlt.** A `csereVonalon` **hetedik paramétere** (a fájl-rész)
   hiányzott, és a kör után nem futott a `fajlAtvitelKiirasa()`. Az őrjárat csak **felelt**,
   ha kérdezték.
2. ⛔ **A `fajlUdpResen` (a randevú) egyetlen éles hívó nélkül állt.** A `pajzsfuro` az
   esemény-csere után azonnal bezárta a foglalatot; a fájlokat csak a `fajlokElhozasa`
   hozta, az pedig TCP-t nyit. *Két zárt router mögött — pont amiért a pajzsfúrás létezik —
   a kép soha nem jött át.*

### ⭐⭐ A szerkezeti darab: a szereposztás a résen

TCP-n a szerep magától adódik (aki kaput tart, kiszolgál; aki csatlakozik, kér). ⛔ **A résen
nincs kapu és nincs elfogadás**: egy foglalat, egy társ, tökéletes szimmetria — ha mindkettő
kér, egyik sem szolgál ki. ⭐ **A döntés új üzenet nélkül:** a két **külső cím** dönt (a csere
mindkét félnek megmondja a sajátját a `latlak`-ban), és **a kisebb kér előbb**; ugyanaz a két
szöveg van meg mindkét gépen, csak fordítva. ⚠️ Ha nem eldönthető: **kiszolgálunk, nem
kérünk**, és **kimondjuk** (D19) — *romlás, nem törés*.

⚠️ **A második kiszolgáló fázis kétszer türelmesebb:** aki előbb kért, annak a kérő fázisa
üresen is véget érhet, és ilyenkor a két oldal órája versenyre kelne.

### ⛔⛔ És egy valódi hibát a mérés talált, nem az érvelés

A kiszolgáló **nem futtathat `parbeszed`-et**, mert az **kezdeményez** (rögtön `LENYOMAT`-ot
küld). A résen mindkét fél ugyanazt tette, a két LENYOMAT találkozott, és a két gép **rendes
cserébe kezdett egymással** — a fájl-ág a második szeletnél `CIMEK` üzenetet kapott
`FAJLKEREK` helyett, kilépett, és a 70 KB-os fájl fele úton maradt. ⚠️ A tünet félrevezetett
(*„a társ nem kért semmit"*). ✅ Ezért van a **passzív `fajlKiszolgalas`** (`vonal.js`):
ugyanaz a kiszolgáló-logika, amit a `parbeszed` fájl-ága futtat — **egy helyen, két hívóval**
—, de **néma, amíg nem kérdezik**. *Aki kiszolgál, az ne beszéljen elsőként.*

### ⛔⛔ És egy „takarítást" a mérés cáfolt — a lezárás utóhangja

Észrevettem, hogy a lezárt `udpKapcsolat` nem veszi le a figyelőjét a foglalatról, és
azonnal levettem: *„egy lezárt kapcsolat ne beszéljen"*. ⛔ **A 30%-os vesztésű, ötszörös
rontás-próba elbukott tőle.** A lezárt példány nyugtázása ugyanis **funkció**: a másik fél
utolsó darabja épp a lezárás pillanatában lehet úton, és ha a nyugtánk elveszett, **ő
újraküldi** — a lezárt példány ilyenkor **pótolja a nyugtát**. *Enélkül ő a tétlenségi
órájáig vár: pontosan a 2026-08-30-i holtpont.*

✅ **A megoldás UTÓHANG** (`UTOHANG = 2000`): a lezárás után még felelünk egy darabig, aztán
elhallgatunk — az elveszett nyugta pótolható, a lezárt példányok mégsem gyűlnek a foglalaton.
⭐ És ami miatt a duplikált nyugta nem hazug: amíg a régi figyelő él, az **új is él** — a
`halo` mindkettőnek odaadja a csomagot, tehát a régi példány arra felel, ami tényleg
megérkezett.

### ✅✅✅ ÉS A NÉMA HOLTPONT MEGVAN ÉS MEGJAVÍTVA (25. mérés, 2026-09-14/15)

A 30%-os vesztésű csere önpróbája **6 futásból 1-szer** bukott — és a D67 **előtti** kódon is
5-ből 1-szer, tehát a jelenség régi. ⭐ *Egy néha bukó próba nem szeszélyes: igazat mond.*

⛔ **Két magyarázatomat a mérés cáfolta**, mielőtt a harmadikhoz eljutottam: a lezárt kapcsolat
figyelője (az **utóhang** után is megmaradt) és a visszalépő óra (a határidőt 15 000 ms-ra
emelve **ugyanúgy bukott**). *Mindkettő érvelés volt, nem mérés.*

⭐⭐ **A harmadik nekifutás csomag-naplóból indult** — a bukás ugyanis **nem-esemény** (teljes
csend), amit naplóból nem lehet látni. 200–300 kísérlet, minden csomag feljegyezve.

**A mechanizmus: három helyes szabály esett egybe.** A kapcsolat **első** darabja sorozatban
elveszett → `srtt` **null** maradt → a **vak óra** szándékosan csak a **legrégebbi** darabot
szondázza (21. mérés) → a mögötte álló, már kiküldött darab **meg sem mozdult** → közben a
visszalépés **4800 ms**-ra nőtt. ⛔⛔ **És ekkor a két őr ellentmondott egymásnak:** a mi
újraküldésünk tovább hallgatott, mint a **társ tétlenségi órája** (5000 ms). *Egy türelem, ami
túléli a másik fél türelmét, nem türelem, hanem néma bukás.*

✅ **Két korlát, mindkettő a meglévő elv kiterjesztése:**

1. a visszalépés **megáll**, ha a darab utolsó küldése óta **hallottuk a társat** — a kód már
   kimondta, hogy *„a nyugta bizonyítja, hogy az út él"*, és ez minden tőle jövő csomagra
   igaz; ⚠️ de **csak a duplázást** állítjuk meg, az RTO-t nem nullázzuk (a beérkező adat a
   MÁSIK irányról szól, a torlódás lehet aszimmetrikus);
2. az **RTO sosem több a tétlenségi óra harmadánál** — a **szimmetrikus** esetre, amikor egyik
   fél sem beszél. A társ **ugyanazt a programot futtatja** (D66), tehát a saját óránkból
   következtethetünk az övére: így legalább **három szondát** hall.

⭐ **Mérve: 3/200 → 0/300.** És az önpróba határideje **10 000 ms** lett: ez a `csereUdpResen`
**éles alapértéke**, tehát a próba mostantól azt méri, amit élesben futtatunk. *Nem lazítás —
ugyanazzal a javított kóddal 5000-nél még 1/300 maradt, 10 000-nél 0/300.*

⚠️ **A D67 számai nem romlottak** (három ismételt futás): 1%/5%/15% = ~**300 / 104–110 /
31–35 KB/s** a korábbi 287/104/39 ellenében — a 15%-os sor a szóráson belül, de szemmel
tartandó. ⏸️ És a vak óra rászűkítése **marad** (nélküle 15%-nál 430 → 8177 ms): csak a
némaság ideje lett korlátos, a tulajdonság megmaradt.


### ✅ Négy új próba, mind rontás-próbával igazolva

- a **kétirányú randevú** (mindkét fél kér ÉS ad, egy foglalaton; és a szerepük **ellentétes**),
- a **„nem tudom a szerepet"** ág (nem ragad be, kimondja),
- ⭐ **az őrjárat parancssor-próbája**: a kép **magától** megérkezik, kézi parancs nélkül.

⛔ **A rontás-próbák mind buktatnak:** a 7. paraméter kivétele · a `fajlAtvitelKiirasa`
kikapcsolása · a szerepválasztás rontása (*mindkettő kezd*) · a passzív kiszolgáló
visszacserélése `parbeszed`-re.

⚠️ **A tanulság, amit érdemes megjegyezni:** a meglévő kép-próba **végig zöld volt**, mert
kézzel cserélt. *Amit csak kézi paranccsal mérünk, arról nem tudjuk, hogy magától is
megtörténik-e — ahogy amit csak modul-próba mér, arról nem tudjuk, hogy elérhető-e kézzel.*

### ⏸️ Ami nyitva maradt ebből

- ⛔ **A fájl-bájtoknak nincs kézi útja** (a 4. szabály másik fele): a `kivisz`/`behoz` csak
  eseményeket visz. Kézzel a `koino-adat/<koino>/fajlok/<lenyomat>` másolható, és az
  ellenőrzés ott is ingyen van (az `olvas` újra lenyomatol) — de a program nem kínálja.
- ⚠️ **A `pajzsfuro` randevú-ágát parancssor-próba nem méri** (két készülék és két hálózat
  kellene hozzá); a `fajlRandevu` maga modul-szinten mérve van, két foglalattal.

---

## ✅ MEGÉPÜLT: TÖBB FORRÁSBÓL EGY FÁJL (D68 / 6., Csaba 3. válasza) — 2026-09-15

> ⭐ **A lap alatti terv MEGVALÓSULT**, a javasolt irány szerint: szeletenként egy fájl a
> `reszleges/<lenyomat>/<eltolas>` mappában, munkalopó felosztás, és a rossz szeletre az
> **1. válasz** (a lezárás elbukik, újrakezdjük). ⏸️ **Ami nyitva maradt:** a helyi
> kiegészítés — *„a következő körben más forrásokkal próbáljuk"* — még nincs megépítve.
>
> ⛔ **És a valódi kód kevesebbet hoz, mint a mérő-utánzat** (×2,7 → ×2,0): az **első szelet
> mindig sorosan jön**, mert a fájl méretét csak az első válasz mondja meg. Részletek és a
> további leletek: [`koino/meres/eredmenyek.md`](../koino/meres/eredmenyek.md) **29/b**.

**Ez a D68 utolsó tétele**, és Csaba 2026-09-15-én ezt jelölte ki következőnek. ⚠️ Ez a lap
azért készült, hogy a következő session **ne vakon kezdjen bele** — mert az első kérdés nem
az, hogy *hogyan*, hanem hogy *mennyit hoz*.

### ⛔⛔ ELŐSZÖR A MÉRCE: MENNYIT HOZNA EGYÁLTALÁN?

A mai (2026-09-15-i) állapot már **sokat megad a redundancia hasznából**, több forrás nélkül:

- a **türelem** a forrásszámhoz igazodik (28. mérés): hat forrásnál 5 mp után **társat
  váltunk**, nem küzdünk fél percig egy rossz vonallal;
- a **részleges fájl megmarad**, tehát a váltás nem veszít adatot — a következő társ onnan
  folytatja, ahol az előző abbahagyta.

⭐ **Vagyis a „soros több forrás" (egyik után a másik) MÁR MEGVAN.** Ami hiányzik, az a
**párhuzamos** eset: ugyanannak a fájlnak a különböző szeletei **egyszerre, több társtól**.

⛔ **Ezért az első lépés MÉRÉS, nem építés** (ugyanaz a rend, mint a D67/D68-nál): mennyivel
gyorsabb egy fájl, ha három társtól jön párhuzamosan, mint ha egytől? ⚠️ És a válasz **nem
triviálisan „háromszor"**: a szűk keresztmetszet gyakran a **saját letöltésünk**, nem a
társak feltöltése — akkor a párhuzamosság **semmit nem hoz**, csak bonyolít.

### ✅ A MÉRÉS MEGTÖRTÉNT (2026-09-15) — 29. mérés

`node koino/meres/resSebessegMeres.js`, a „TÖBB FORRÁSBÓL EGY FÁJL" szakasz. Jegyzőkönyv:
[`koino/meres/eredmenyek.md`](../koino/meres/eredmenyek.md) 29.

⭐⭐⭐ **A válasz nem egy szám, hanem egy ARÁNY: a haszon pontosan addig tart, amíg a források
EGYÜTT be nem töltik a saját letöltésünket.**

| eset | 2 forrás | 3 forrás | 5 forrás |
|---|---|---|---|
| **(A) a FORRÁS feltöltése a szűk** | ×2,0 | **×2,7** | |
| ⛔ **(B) a MI letöltésünk a szűk** | | **×1,0** — *semmit nem hoz* | |
| **(C) valósághű aszimmetria** (4× letöltés) | ×1,6 | ×1,9 | **×2,6** |

⭐ **És az otthoni vonal az (A) felé húz:** az aszimmetrikus kapcsolatokon a **feltöltés** a
szűk. ⭐⭐ **A mérés előtt pedig a kód adott egy leletet:** a `FAJLKEREK` **már ma hordozza az
`eltolas`-t**, és a kiszolgáló **állapotmentes** — *a több forrás nem protokoll-kérdés, hanem
kliens-oldali szerkezeté.* ⛔ A műszerhez viszont **két sort** kellett modellezni (a forrás
feltöltése + a mi közös letöltésünk), különben három foglalat automatikusan háromszoros sávot
kapott volna, és a „×3" a műszerből jött volna, nem a valóságból.

### A mai szerkezet, és pontosan mi áll az útban

```
  fajlAtvitel.js    kovetkezoKeres(eddigi) → { eltolas }      ← a MÉRETBŐL számol
  fajlTar.js        reszlegesMeret / reszlegesHozzafuz         ← append: SORRENDET feltételez
                    reszlegesLezaras                           ← újra lenyomatol, majd átnevez
  atvitelTerv       fájlonként EGY társ (TARSANKENT = 1)
```

⭐⭐ **A mai elv: „a részleges fájl mérete MAGA az állapot"** — nincs szelet-nyilvántartás,
mert a szeletek rögzített méretűek és **sorrendben** jönnek. *Ugyanaz, mint az esemény-tárnál:
a tartalom az igazság, nem egy mellette vezetett napló.* ⛔ Több forrásnál ez a feltevés
elesik: a 3. szelet megjöhet az 1. előtt.

### ⭐ A javasolt irány — és amiért illik a koinóba

Ne vezessünk be **naplót**; tartsuk meg az elvet, hogy **a tartalom az állapot**:

```
  koino-adat/<koino>/fajlok/reszleges/<lenyomat>/<eltolas>     ← szeletenként egy fájl
```

⭐ Ekkor **„mi van meg?" = a mappa listája** — nincs külön nyilvántartás, amit szinkronban
kellene tartani, és egy megszakadt írás legfeljebb egy szeletet visz. A lezárás ugyanaz marad:
a szeleteket eltolás szerint összefűzzük, **újra lenyomatoljuk**, és csak akkor nevezzük át.

⚠️ Az ára kimondva: sok apró fájl (2 MB-nál 32 darab), és egy mappa-takarítás a lezárásnál.

### ⛔⛔ A VALÓDI DÖNTÉSI PONT, AMI CSABÁÉ: A ROSSZ SZELET

Ma a lenyomat **a teljes fájlra** szól. Ha több forrásból szedjük össze, és **egy társ hamis
szeletet ad**, a lezárás elbukik — ⛔ de **nem tudjuk, melyik szelet volt rossz**, tehát az
egészet eldobjuk, és kezdhetjük elölről. *Egy rosszindulatú társ így olcsón tehet tönkre egy
nagy letöltést, újra és újra.*

Három válasz lehetséges, és mindegyiknek ára van:

1. **Nem teszünk semmit** — a lezárás elbukik, újrakezdjük. ⭐ Olcsó és biztonságos (hamis
   fájl SOHA nem kerül be), ⛔ de egy támadó ingyen ismételheti.
2. **Szeletenkénti lenyomat az eseményben** — ⛔ ez **új adat a láncon**, és a 6. szabály
   KEMÉNY fele tiltja: egy 2 MB-os fájlnál 32 × 43 karakter ≈ 1,4 KB, *négyszerese egy teljes
   eseménynek.*
3. ⭐ **Merkle-fa**: az esemény továbbra is **egyetlen** lenyomatot hordoz (a gyökeret), a
   szelet-hasheket és az ellenőrző ágat a **szállítás** adja át (nem a lánc). Így szeletenként
   ellenőrizhetünk, és a rossz forrás **azonosítható**. ⚠️ Ára: a fájl-lenyomat számítása
   megváltozna — ⛔⛔ **és ez visszamenőleg minden meglévő hivatkozást érvénytelenítene**,
   hacsak nem tartunk meg kétféle lenyomatot. *Ez nem apró döntés.*

⭐ **A javaslatom az 1-es**, egy kiegészítéssel: ha a lezárás elbukik, **jegyezzük fel, kik
adtak szeletet** ehhez a próbálkozáshoz, és a következő körben **más forrásokkal** próbáljuk.
⛔ *Ez nem rangsor és nem „ki mennyit adott" mérleg (D18/2, D48)* — csak egyetlen bukott
letöltés helyi tanulsága, ami a következő buli után el is felejthető.

### ⏸️ Amit el kell dönteni, mielőtt kód születik

1. **Megéri-e egyáltalán?** → előbb a mérés (fent).
2. **A rossz szelet válasza** → 1., 2. vagy 3. (a javaslat: 1.).
3. **Hány forrás egy fájlhoz?** A mai `TARSANKENT = 1` társanként egy átvitelt enged; a
   fájlonkénti korlát (ma szintén egy) lazulna. ⚠️ A 9. szabály kérdése: *„mit csinál
   egymilliárdnál?"* — a szeletszám fájlonként korlátos (2 MB / 64 KB = 32), de a **források
   száma** is korlátos kell legyen.
4. **A `FAJL_KORLAT`** (ma 2 MB, Csaba nyitott kérdése) ezzel összefügg: nagyobb fájloknál nő
   a párhuzamosság haszna és a rossz-szelet kockázata is.

### ⚠️ És ami NEM tartozik ide

- A **randevú** (átfúrt rés) marad egy forrásos: ott a pajzsfúrás **egyetlen társsal** nyitott
  rést, nincs kihez fordulni.
- A **csere** (esemény-forgalom) érintetlen: ott a redundancia már ma is megvan (a postaláda
  és a társ-lista), és nincs szeletelés.

---

## ⏭️⏭️ A KÖVETKEZŐ MUNKA: A BULI MÁSODIK FELE — A RÉS-NYITÁS (2026-09-15)

⚠️ **Ez a lap azért készült, hogy a következő session ne vakon kezdjen.** A buli **terjedési**
fele 2026-09-15-én megépült (30. mérés: igazítás + ismételt menet, együtt ×30) — ⛔ **de a
másik fele hiányzik: a KAPCSOLÓDÁS.**

### Hol tartunk pontosan

| | ma |
|---|---|
| **mikor** találkozunk | ✅ megvan — a **percfordulóhoz igazított** ablak (üzenetváltás nélkül) |
| **hogyan** terjed a hír az ablakban | ✅ megvan — a kör ismétlődik, amíg van újdonság |
| **hogyan** ér el egymáshoz két zárt router | ⛔ **hiányzik** — az őrjárat **TCP-vel** cserél |

⛔⛔ **KIMONDVA, mert könnyű félreérteni: AZ ŐRJÁRAT MA IS TCP-N FUT.** Csaba 2026-09-13-án
eldöntötte, hogy **a UDP a fő út** (19. mérés után), és a UDP-vonal teljesen megépült (ablak,
mért RTT, AIMD, Vegas, randevú, 20–29. mérés) — ⛔ **de egyetlen éles hívója a kézi `pajzsfuro`
parancs.** Az automatikus üzemmódban minden `node:net`:

- a társ-lista bejárása: `csereVonalon` (`koino.js`, `orjarat`);
- a postaláda-kapu: `figyeloIndulasa`;
- a fájlok: `fajlokElhozasa` → `tcpNyito`;
- és a kézi `csere` parancs is.

*Ugyanaz az alak, mint a 2026-09-14-i átnézés két leleténél: a réteg kész, az éles út nem
hívja.* ⭐ **A következő munka tehát nem „egy újabb darab", hanem az őrjárat átállítása UDP-re**
— a döntés már megszületett, a végrehajtása maradt el.

### ⛔⛔ A SZERKEZETI AKADÁLY: a UDP-cím NEM AZ, amit ma cserélünk

- a `latlak` a **TCP-kapcsolat** távoli címét mondja meg (`vonal.js`), a `hirdetendoCimek`
  a társ-lista **TCP-címeit** hirdeti;
- ⛔ a router a UDP-nek **külön leképezést** ad — mérve egy futáson belül: **UDP 39471,
  TCP 63495** (2026-09-13);
- ⛔⛔ és a külső UDP-port **foglalatonként más**, a TCP-port **futásonként más** (17., 19.
  mérés) — *a címet nem lehet előre megbeszélni, csak a találkozás pillanatában átadni.*

### ⭐ A kérdés, amire a terv nem tud válaszolni — és ezért MÉRÉS az első lépés

**Két port-átíró NAT között** (pl. két CGNAT) a koino **soha nem mért** — a 19. mérés
kimondja: *„egy hálózat-pár (egyik port-átíró, másik port-megtartó); két port-átíró NAT
között újra kell mérni."* ⛔ A 9. szabály szerint ez **alapállapot, nem kivétel**.

⚠️ **Ez terepmérés: két készülék, két hálózat** — Csaba nélkül nem elvégezhető. *Ha itt elvi
fal van, az egész irányt újra kell gondolni (postaláda-központú megoldás), és akkor kár lenne
előbb megépíteni.*

### A javasolt irány (ha a mérés átmegy)

1. **A buli elején mindenki megméri a saját UDP külső címét** (`kulsoCim`, a fúró-foglalatról
   — ez már megvan, `ba9ce7b`).
2. **A cím a cserén utazik**, a meglévő `CIMEK` üzenet mellett — ⚠️ de **külön mezőben**,
   mert a TCP- és a UDP-cím **nem ugyanaz** (*„két szám ugyanarra a kérdésre, és csak az
   egyik igaz"*).
3. **A következő ablakban mindkét fél kopog** — az időpontot már nem kell megbeszélni, mert
   a percforduló adja. ⭐ *Itt térül meg az igazítás: a pajzsfúrás nehéz feltétele
   (egyidejűség) innentől megbeszélt, nem véletlen.*
4. **A kurbli marad kézi**: az első találkozáshoz (`tars <cím>`, helyi felfedezés, vagy
   egyidejű `pajzsfuro`) nincs mit automatizálni — akinek a címét nem ismered, afelé nem
   tudsz nyitni.

### ⏸️ Nyitott döntések (mind Csabáé)

1. ⛔ **Mérjünk-e előbb két port-átíró NAT között?** *(A javaslat: igen — ez a 19. mérés
   kimondott hiánya, és egy elvi falnak nem érdemes építeni.)*
2. **Hol utazzon a UDP-cím?** A `CIMEK` üzenetben új mezőként, vagy a `LENYOMAT` `latlak`-ja
   mellett? ⚠️ A 6. szabály szerint ez **új adat a vonalon** — meg kell nézni a bájtokat.
3. **Mikor váltson át az őrjárat UDP-re?** Mindig, vagy csak ha a TCP nem megy? *(A javaslat:
   a TCP marad az első próbálkozás, mert olcsóbb — a rés a tartalék. Az 1. szabály miatt ez
   nem kerül kódba: a `parbeszed` mindkét szállításon változatlanul fut.)*
4. **Az adat-ár**: a kopogás minden társra, minden ablakban — mennyi? *(Számolni kell, a D35
   szerint ez befogadási kérdés.)*

### ✅ A 31. MÉRÉS (2026-09-17) — az első kérdés, amihez egy készülék elég

⭐ Mielőtt az őrjárat UDP-re áll, azt kellett tudni, **túléli-e a bulin bemondott külső
UDP-cím a buli-közt** (az őrjárat 5 percenként ébred, közben hallgat). `node
koino/meres/udpLekepezesMeres.js`. **Az otthoni vonalon: 330 mp csend után is ugyanaz a port**,
a leképezés célfüggetlen. ⭐ *Vagyis ezen a vonalon a „cím a cserén utazik, a következő bulin
arra kopogunk" szerkezet életjel nélkül működik.* ⚠️ A külső IP viszont napok alatt változott.
⏸️ **A döntő eset a mobil (CGNAT)** — a telefonon, mobil adattal ugyanez a parancs; utána a két
készülékes terepmérés. Részletek: `koino/meres/eredmenyek.md` 31.

### ⛔ A TÜKÖR: A GOOGLE/CLOUDFLARE NEM A VÉGLEGES (Csaba, 2026-09-17)

A saját külső címet ma a Google/Cloudflare STUN-tükre mondja meg (`kulsoCimFoglalaton`,
alapértelmezés: `stun.l.google.com`). ⭐ **Addig marad, amíg kevés készülék van a hálózatban.**
⛔ Nem végleges: egymilliárd készülék nem függhet egy cég szerverétől (2. és 9. szabály).
⭐ **A végleges tükör a társ**: a cserén megmondja, honnan lát (`latlak` →
`kivulrolIgyLatszom`), és ez annál jobban működik, minél több készülék van — ráadásul
pontosabb, mert arról a résről szól, amelyen beszélünk. ⚠️ A STUN szerepe a végén az
**első bemutatkozás** marad, amikor még nincs kit kérdezni — és ott is cserélhető paraméter.
