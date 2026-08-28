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
| `ALLAS` | szerzőnként: a nyilvános kulcs + a legnagyobb ismert sorszám + a lánc feje | ~80 bájt / e-ember |
| `KEREK` | mely szerző mely sorszám-tartományát kérem | pár bájt / hiány |
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
| **1** | **Csere-protokoll** (`ALLAS` / `KEREK` / `ESEMENY`), sima TCP-n | két folyamat kicseréli, amit tud | két adat-mappa, két folyamat **egy gépen** (`KOINO_ADAT`), próbafájllal |
| **2** | **A vizsga:** két készülék, kevert események → **azonos állapot** | a jóslat igazolva | önpróba: mindkét oldalon ugyanaz az entitás-lista, javaslat-eredmény, jelzés-lista |
| **3** | **Hézag és részleges tudás** | eldől a 4. pont kérdése | mérés: mennyi idő alatt ér körbe egy esemény; utána döntés + megvalósítás |
| **4** | **Két hálózat, IPv6-on** — laptop itthon, telefon a szomszédban | **a szakasz nagy kérdése** | valódi próba, kézzel átvitt címmel, **STUN és jelzőpont nélkül** |
| **5** | *(csak ha a 4. megkívánja)* jelzőpont, majd továbbító | a hiányzó darab — de csak az, ami tényleg hiányzik | mérés alapján |

**A 4. lépés a szakasz vizsgája.** Ha két készülék külön hálózatról, szolgáltató nélkül
kicseréli az eseményeit, akkor a Fázis 2 gerince nemcsak áll, hanem **működik is**.

---

## 7. A MÉRENDŐ SZÁMOK

Ezek nem kíváncsiságból kellenek — mindegyik **eldönt valamit**:

| Szám | Mit dönt el |
|---|---|
| **mennyi idő alatt ér körbe egy esemény** | a józan **minimum döntési időt** (D4), és a 4. pont „óvatosság"-ának árát |
| **összeér-e két készülék IPv6-on, STUN nélkül** | kell-e egyáltalán infrastruktúra |
| **hányszor NEM jön össze a közvetlen út** | kell-e **továbbító** — a P2P legdrágább része |
| **az `ALLAS` üzenet mérete N e-embernél** | skálázódik-e a csere-protokoll, vagy szeletelni kell |
| **mennyi adat megy át egy csere alatt** | mit jelent a napi működés egy mobil-előfizetésnek |

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
   események azonnal átfolynak? (Az utóbbi kell a gyors döntésekhez.)

---

## Napló

- **2026-08-28** — A terv létrejött, a **D29** után: nem böngészőben, hanem két önálló
  program között. Az alapgondolat, ami a protokollt olcsóvá teszi: **szerzőnként elég a
  legnagyobb sorszámot elküldeni**, mert a lánc szerkezete a többit megmondja. A szakasz
  nagy kérdése mérhetővé vált: natívan egy program **tud fogadni kapcsolatot**, tehát a
  globális IPv6-on a **közvetlen, szolgáltató nélküli** kapcsolat valóban kipróbálható.
