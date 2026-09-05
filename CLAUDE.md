# CLAUDE.md

Ez a fájl a Claude Code-nak ad útmutatót a koino_1.1 kódbázisához.

## A projekt

**Kollektív Intelligencia Online (koino)** — közösségi tér, amit a közösség irányít. A regisztrálók **e-emberek** (nem „felhasználók"): egyszerre tulajdonosok, fejlesztők, moderátorok és felelősök. A platform lényege a közösségi döntéshozatal: tartalmakból javaslatok, javaslatokból egyezmények születnek, központi szereplő nélkül.

## ⚠️ KÉT PROGRAM VAN A REPÓBAN (2026-08-26 óta)

| Mappa | Mi ez | Állapot |
|---|---|---|
| `backend/` + `frontend/` | **A PROTOTÍPUS** — központi szerveres koino (Fázis 1), ez fut a koino.hu-n | ⏸️ **befagyasztva** — üzemel, de **NEM fejlesztjük**. **NE nyúlj hozzá:** az éles deploy a repó gyökeréből épít, egy átrendezés némán eltörné |
| **`koino/`** | **AZ ÚJ PROGRAM** — P2P koino (Fázis 2): a készüléken fut, aláírt eseményekkel, szerver nélkül | 🚧 **itt folyik a fejlesztés** |

**A fordulat oka (D22):** *„a központi server részét most nem kell fejleszteni. A kis családi közösségeknek is P2P-nek kell lenniük."* — a régi koino a prototípus, ami tanított; az új a **készüléken** kezdődik, örökölve belőle a domain-logikát és a felületet.

**Olvasd el induláskor:** ⭐ [`docs/utiterv.md`](docs/utiterv.md) — **mit építünk, milyen sorrendben, és miért** (rövid; ez a belépő). Utána: [`docs/fejlesztesi_terv_fazis2.md`](docs/fejlesztesi_terv_fazis2.md) → az elején a **„HOL TARTUNK"** szakasz. A szakasz-tervek: [`docs/szakasz1_terv.md`](docs/szakasz1_terv.md) (**1. A helyi modell** — ✅ kész) · [`docs/szakasz2_terv.md`](docs/szakasz2_terv.md) (**2. A szállítás** — ✅ kész; a neve eddig „csere" volt, de a munka a szállításról szólt). ✅ **3. A szerkezet** — kész (2026-09-03): a kanonikus alak négy új mezője, a kérdezhető tár-illesztő, a böngésző-lekérés. 🚧 **Most a 4. szakasz folyik: AZ IDENTITÁS** — terv: [`docs/szakasz4_terv.md`](docs/szakasz4_terv.md) — a szerkezet 2026-09-06-án átépült, **Csaba lezárta** *(„nekem ez így már megfelel, első koinónak")*, és ⭐ **a megépítés ELKEZDŐDÖTT**: a 9/c terv **4.1–4.3 kész** — a **két lépcső** teljes: belépés, meghívás, felhatalmazás, tanúsítás, és rá a három számítás (`js/allapot/identitas.js`), **25 önpróbával**.

⭐⭐⭐ **A SZERKEZET, EGY MONDATBAN (D56):** *az 1. lépcső olcsó, mert a kapu úgysem véd; a 2. lépcső drága, mert ott a zsákmány; és a védelem egyikben sem a kapu, hanem hogy a rossz tanúsító elveszíti a szerepét.*

- **1. lépcső — a tagság:** **egy meghívó**, és minden mehet (tartalom, tudatpont, javaslat, szavazat).
- **2. lépcső — a pénztárca:** **három tanúsítás** felhatalmazott tanúsítótól. Ez a **D11** megvalósulása: *a pénz csak bizonyított identitás után.*
- **A felhatalmazás (D57/b, D60):** 2. lépcsősök adják, **emberenként egyet**; a küszöb `N` **kimondott szám** — a 2. lépcsősök érték javaslatainak mediánja —, nem mért rangsor. ⭐ **Megbízás, nem pontszám:** a felületen *„27-en bízták rá a tanúsítást"*, soha nem *„becsületesség: 27"*.
- **Az ellenőrzés a gyökérig megy (D59):** mérve **olcsó** — 17,7 → 30,1 → 40,7 ős 1500 / 6000 / 20 000 főnél, vagyis **logaritmikus** (kettőzésenként ≈ +6). A `D` mélység-korlát **elhagyható biztonsági szelep**, nem szükség.
- **A jelzés: „MÉG NEM ÉRTÜNK ÖSSZE"** — tény, szimmetrikus, és **önjavító** (ha bemutatkoznak, eltűnik; hamis azonosságnál nem).

⛔⛔ **AMIT A 2026-09-06-I MÉRÉSEK MEGDÖNTÖTTEK — ezeket NE hozd vissza** ([`koino/meres/eredmenyek.md`](koino/meres/eredmenyek.md) 11–12.): **a belépési szám NEM védelem, hanem árcédula** — a fal pontosan ott van, ahol a megtévesztettek száma eléri a kért meghívó-számot (4-nél 0 hamis, 5-nél 880) · **a jogosítási küszöb ELREJTI a szigetet** (100%/0% helyett 91%/16%), mert minden hamisat egy valódi emberhez kényszerít — *egy teljesítendő küszöb egyben hitelesítő pecsét* · ⛔ **és a SÉTA a leggyengébb láncszem, nem a legerősebb**: sok megtévesztettnél 43–74% / 31–61%. **A D50 tenger-gondolata áll, de NEM ő a védelem.**

⭐⭐ **A VÉDELEM A KONTRASZT:** *„hány olyan embert tanúsítottál/ismersz, akinek nincs önálló élete a közösségben?"* — a becsületes alapvonal **0,3**, a megvett tanúsítóé több száz. **100% / 9–25%, mind a hét támadó-változat és mindhárom arány ellen.** ⭐ És olcsó: nem kell hozzá séta, se élő kapcsolat.

⭐⭐⭐ **ÉS A TÖRVÉNY, ami az egészet lezárja:** a visszacsatolással (a közösség visszavonja a megbízást) a kár **880 → 120**, és **kár = a támadó üteme × az ébredés ideje** — 40 · 120 · 240 · 440 a 0/2/5/10 körös késésnél. **Lineáris, nem exponenciális: a hurok mindig bezárul.** ⭐ Ezért a gépi segítség értéke **az ÉSZREVÉTELBEN** van, nem a döntésben.

⚠️ **Zsákutcák, amiket ne javasolj újra** (mind megmérve): a Duniter-féle távolság-szabály (globális szám) · az „ingyenes elismerés" (D48) · **a gazdaság önmagában nem véd** · a horgony-kör (880 hamis horgony) · ⛔ a *„kevés kapcsolata van, tehát gyanús"* jelzés (31/41/45% téves) · ⛔ **és a `k` tanúsítás + keret vonala** (D44, D51–D53) — **tárgytalan**, a meghívás váltotta ki.

A tervezési döntések (**D1–D60**; a D48 elvetve, a D44/D51/D53 tárgytalan) a fázis-2 tervben állnak. A milliárdos lépték szerkezete: [`docs/skalazas_terv.md`](docs/skalazas_terv.md) (2026-08-31 — tervjavaslat, kilenc döntést igénylő ponttal). **Az irány két réteg:** a **DAG** a hitelességé és offline is működik · a **kereső-réteg** a megtalálhatóságé, hálózatot kíván, és **elhagyható**. ⭐ *Ami DÖNT valamiről, az soha ne kívánjon élő lekérdezést; csak a MEGTALÁLÁS kívánhat.*

## 🛠️ NYOLC SZABÁLY, ami MINDEN új kódra érvényes (D30–D32, 2026-08-28)

A koino nem támaszkodhat arra, hogy egy platform-tulajdonos (Google, Apple, böngésző-gyártó) megengedi a működését. Az indoklás és a teljes fenyegetés-elemzés: [`docs/platform_fuggetlenseg.md`](docs/platform_fuggetlenseg.md). **Ezek ellenőrizhető szabályok — kódolás közben tartsd be őket:**

1. **A szállítás cserélhető marad.** A csere-logika (`js/csere/csere.js`) SOHA ne importáljon hálózati kódot; új szállítás a `vonal.js` MELLÉ kerül, ne bele a logikába.
2. **Semmi ne múljon egyetlen címen vagy szolgáltatáson.** Nincs beégetett koino.hu, jelzőpont, STUN, továbbító. Ha ilyen kell, legyen cserélhető és elhagyható.
3. **A bizalom sose a csatornából jöjjön.** Eseményt soha nem fogadunk el azért, mert „megbízható helyről jött" — egyetlen kapu van: `esemenyMentese`.
4. **Legyen mindig kézi út.** Minden automatikus cseréhez tartozzon fájlba mentés / fájlból olvasás. **Ha egy funkció csak online tud működni, az fojtópont.**
5. **Ne épüljön folyamatos kapcsolatra.** ⚠️ *Csaba helyreigazítása (2026-08-29): a döntés NEM feltétlenül napokban mér — lehet órákban is, a tudatpont-változás még sűrűbben. **A lassúságra tehát nem szabad védelemként hivatkozni.*** A szabály viszont áll: ami **másodperces élő kapcsolatot** kívánna (mindkét fél egyszerre online), az visszahozza a törékenységet — ezért postaláda kell, nem élő továbbító (D34).
6. ⭐ **Nulla függőség, kis méret.** Ma **38 fájl, 750 KB** a mappa (tömörítve ~80 KB), **0 npm-csomag**. Ez **védelem, nem elegancia**: elfér egy üzenetben, és bárki újraírhatja. Minden új függőség egy újabb fojtópont. ⚠️ *Ha új fájl kerül a `koino/`-ba, ezt a számot itt is vezesd át — a szabály attól ellenőrizhető, hogy a mércéje friss.*
7. **A böngésző csak kliens lehet, sose előfeltétel** (a D29 pontosítása).
8. **Ne tervezz jogi védelemre.** Ha egy érv így kezdődik: „ezt úgyis megtiltja a szabályozás" — az érv nem érvényes.

## ⛔ ÉS EGY KILENCEDIK, AMI A TÖBBI FÖLÖTT ÁLL (Csaba, 2026-08-31)

> **A skálázhatóság szempontjából az első verziónak IS késznek kell lennie.**

⚠️ **A D13 („nem kell az első verziónak tökéletesnek lennie") NEM vonatkozik erre.** A D13 a *funkciókra* és a *paraméterekre* igaz — a **szerkezetet** viszont nem lehet utólag beletenni. A D22 ezt már kimondta: *„az első kiadás is milliárdra képes program, csak kevesebb emberrel"*, a D21 pedig: *„a szeletelés nem »később, ha a méret kikényszeríti«, hanem az első naptól a tervben van"*. **A lefelé skálázás olcsó, a felfelé nem.**

⭐ **A különbségtétel, amitől betartható:** a **SZERKEZET és az ILLESZTÉS** az első naptól milliárdos; **a megvalósítás mögötte lehet egyszerű**.

🔍 **Ellenőrizhető alak — ezt kérdezd minden új darabnál:** *„Ez mit csinál egymilliárd e-embernél?"* Ha a válasz **„akkor majd kicseréljük"**, a darab **nincs kész**.

⚠️ *Ez a szabály azért került ide, mert Claude 2026-08-31-én pont ezt javasolta („indulj a maival, cseréld később"), és Csaba elutasította. Egy friss session ugyanezt fogja javasolni.* Az első, amit a szabály elkap: a tár-illesztő **`betolt()`** művelete az ÖSSZES eseményt adja vissza — vagyis **nem a fájlformátum a hiba, hanem az illesztés**; gyorsítótárral is csak a rossz kérdés lesz gyorsabb. Részletek: [`docs/skalazas_terv.md`](docs/skalazas_terv.md) 0. szakasz.

## Domain-fogalmak (kötelező terminológia)

- **e-ember** — regisztrált tag; mindig így hivatkozunk rá, sosem „felhasználó"-ként.
- **tudatpont** — mindenkinek ugyanannyi van; nem elkölthető, csak szétosztható és bármikor átrendezhető. Prioritást fejez ki, NEM szavazaterőt (szavazásnál mindenki egyenlő).
- **tartalom** — a platform alapegysége; **kategóriák** és **tartalomtípusok** (kérdés, válasz, témakör, ismeret, feladat...) rendszerezik.
- **javaslat** — entitástípus: módosítás, áthelyezés, törlés vagy egyesítés kezdeményezése egy tartalomra. Csak az tehet javaslatot, aki tudatpontot rendelt a tartalomhoz. ⚠️ **A Fázis 2-ben ez „szerkesztési javaslat"** (D27) — mellette lesz **általános javaslat** is (a közösség álláspontja, nem entitás-változtatás). A prototípusban marad a régi név.
- **érték javaslat** — KÜLÖN fogalom, nem keverendő a javaslattal (entitástípus)! Mindig „érték javaslat"-ként hivatkozunk rá.
- **egyezmény** — elfogadott javaslat eredménye. ⚠️ A Fázis 2-ben **„szerkesztési egyezmény"** (D27), és **nem esemény, hanem SZÁMÍTÁS eredménye** (D17) — senki nem „mondja ki". Az **általános egyezmény** viszont **élő**: csatlakozni, tiltakozni, ütközést jelölni lehet hozzá.
- **küszöbértékek** — tartalmanként meghatározzák, mekkora támogatottság és részvételi arány kell az elfogadáshoz; minimum/maximum döntési idővel együtt.
- **bizonyossági mutató** — minél egyértelműbb az eredmény és magasabb a részvétel, annál hamarabb zárul a döntés (a min/max döntési idő között).
- **pakli** — kártyák (entitások) listázott megjelenítése a frontenden.

## Futtatás

### Az ÚJ program (`koino/` — Fázis 2, itt folyik a fejlesztés)

```bash
node koino/koino.js              # az állapot: tartalmak, javaslatok, egyezmények
node koino/koino.js allapot 3    # mi lesz 3 nap múlva (a döntési idő napokban mérhető)
node koino/koino.js hozd <azonosító> [cím] [port]   # ⭐ BÖNGÉSZŐ-LEKÉRÉS: EGY entitás elhozása
                                 # (a rendes csere mindent hoz; ez válogat — a szelet-címjegyzékből
                                 #  vagy a társ-listából keres, és megjegyzi, kinél volt meg)
node koino/meres/mind.js         # a 242 önpróba
node koino/meres/skalaMeres.js   # SKÁLA-MÉRÉS (nem önpróba: számokat ad, nem igen/nem-et)
node koino/meres/meghivasMeres.js       # ⭐ A MEGHÍVÁSOS BELÉPÉS: védelem ÉS ár, hat változatban
                                 # (MELEGIT=1 · MEGTEVESZTETT=8 · MEGHIVO_KORLAT=10 · KOROK=60)
node koino/meres/ebredesProba.js fut    # ÉBREDÉS-PRÓBA egy hálózaton: engedi-e az OS az ébredést
node koino/meres/ebredesProba.js res <cím> <port>   # …és KÉT hálózat között: összeér-e a rés
                                        # (a fal órájához igazított ablakokban — ez a „buli"); utána: olvas
```

⭐ **A valódi üzemmód: `node koino/koino.js orjarat [perc] [port]`** — a készülék **magától dolgozik**: nyitva tartja a kaput (postaláda) ÉS időnként végigmegy a társ-listán. *Csaba vette észre, hogy eddig minden csere kézi indítású volt, pedig a D33 terve erre épül.* Egy „nincs újdonság" kör **334 bájt** (a B. lépés miatt), tehát sűrűn is mehet. ⚠️ Ez NEM sérti az 5. szabályt: a kör végén minden elenged, a készülék alszik a következőig.

📱 **Telefonra telepítés (Termux + Node):** [`docs/telepites_telefon.md`](docs/telepites_telefon.md) — a Szakasz 2 / 4. lépéséhez. `git clone --depth 1` a nyilvános repóból (5,6 MB a 23 helyett). A `koino/` mappa **önmagában futtatható**: 36 fájl, 706 KB (a `tar.gz` csomag ~80 KB), nulla függőség — *ugyanaz a szám, mint a 6. szabálynál; ha az egyik változik, mindkettőt vezesd át.*

**Két készülék egy gépen** (Szakasz 2 / 1. lépés — a `KOINO_ADAT` két külön „készüléket" ad, saját kulccsal):

```bash
KOINO_ADAT=./adat-A node koino/koino.js figyel 7373
```

```bash
KOINO_ADAT=./adat-B node koino/koino.js csere 127.0.0.1 7373
```

**Több társ** (Szakasz 2 / A. lépés): a `tars` paranccsal felvett címekre a `csere` érv nélkül is elmegy — és **egy elérhetetlen társ nem dönti el a kört**:

```bash
node koino/koino.js tars 127.0.0.1 7373 "A készülék" && node koino/koino.js csere
```

⭐ **A `figyel` = POSTALÁDA** (D34, C. lépés): aki fogadni tud, az átveszi mások eseményeit, eltárolja, és a következő beszélgetésnél továbbadja. **Nem élő továbbító** — nem kell egyszerre online tartania két felet (ez a TURN drágasága). Mérve: Anna és Béla egyike sem nyitott kaput, csak Cilihez szóltak ki — mégis mindkettő mindent megtudott. ⚠️ **Egy `figyel` = EGY koino** (a `KOINO_AZONOSITO` indításkor dől el). Aki két koinónak is tagja, két `figyel`-t futtat, két porton. A protokoll a `LENYOMAT`-ban megmondja, melyik koinóról beszél, és **eltérésnél a csere azonnal, tisztán véget ér** (1 kör, ~334 bájt) — mérve, mert korábban nem így volt.

⚠️ **A KOINO NEM BÖNGÉSZŐBEN FUT (D29, 2026-08-28).** Csaba döntése: *„hagyjuk is el a böngészős részt, mert csak bezavar. A tiszta P2P kapcsolatra koncentráljunk."* Indok: a böngésző korlátai nem a koino korlátai — egy lap nem tud portot nyitni, nem fogad kapcsolatot, elrejti a saját címeit, és bezáráskor eltűnik; a P2P-hez emlegetett infrastruktúra (jelzőpont, STUN, továbbító) jórészt EBBŐL következik. A böngésző később lehet egy kliens, de nem ő szabja meg, mire képes a koino.

- **Nincs telepítendő függőség** — a kriptográfia a Node beépített WebCryptójából jön (Ed25519 natívan). Az adat a `koino-adat/` mappában él, **hozzáfűzhető** fájlban (soronként egy aláírt esemény); máshová a `KOINO_ADAT` változóval tehető.
- **Önpróbák:** `node koino/meres/mind.js` — 242 próba tíz fájlban; a kilépési kód 1, ha bármi bukott. Egy réteg külön is: `node koino/meres/mind.js szabaly`. ⚠️ A szűrő **részszóra** illeszkedik: a `tar` a `tarsak`-ot is elindítja (13 + 26 = 39) — ez nem hiba, de a próbaszám olvasásakor félrevezet. Nincs teszt-könyvtár. A koino részletes naplója alapból néma, `KOINO_NAPLO=1`-gyel kapcsolható be.
- ⚠️ A `koino/koino.js` **fejlesztői eszköz**, nem a koino felülete — a valódi felület a prototípus pakli-nézetéből öröklődik (lásd [`docs/felulet_terv.md`](docs/felulet_terv.md)).

### A PROTOTÍPUS (`backend/` + `frontend/` — Fázis 1, befagyasztva)

- **Fejlesztői környezet:** `docker-compose -f docker-compose.dev.yml up` — backend a 3000-es porton (a frontendet is ez szolgálja ki statikusan), MongoDB kívülről a 27018-as porton (konténeren belül 27017). CSAK localhost (a 8080-at már az éles stack viszi).
- **Éles környezet (koino.hu):** `docker-compose -f docker-compose.prod.yml up -d --build` — a fejlesztőitől független stack UGYANAZON a gépen: `koino-backend-prod` a 8080-as porton (ide jön a koino.hu Cloudflare Tunnel / IP), külön `koino-mongodb-prod` adatbázis-kötettel, külön `backend/uploads-prod` feltöltés-mappával, saját `backend/.env.prod` titkokkal (gitből kizárva; minta: `backend/.env.prod.example`). A kód a képbe van égetve → csak ezzel a paranccsal (deploy) frissül. Részletek: [`docs/elesites.md`](docs/elesites.md).
- **Backend önállóan:** `cd backend`, majd `npm run dev` (nodemon) vagy `npm start`. A kapcsolatot a `backend/.env` `MONGODB_URI` változója adja.
- A gyökér `package.json` üres — a valódi a `backend/package.json`.
- Nincs automatizált teszt; a tesztelés böngészős, referenciája a [`docs/teszt.md`](docs/teszt.md).

## Architektúra

### 🚧 Az ÚJ program (`koino/`) — P2P, a készüléken fut

Nincs szerver és nincs adatbázis-kiszolgáló: **minden művelet egy aláírt esemény**, az állapot pedig ezekből **számítódik** (D17). Terv: [`docs/szakasz1_terv.md`](docs/szakasz1_terv.md).

- `js/kulcs/kulcsTar.js` — a kulcspár (Ed25519, natív WebCrypto): létrehozás, tárolás, mentés, visszatöltés. **A kulcs a személyazonosság** (D15) — nincs jelszó, nincs bejelentkezés.
- `js/esemeny/kanonikusAlak.js` — ⚠️ **a legveszélyesebb részlet**: ugyanaz az adat MINDIG ugyanazokat a bájtokat adja. Szabályok: rendezett mezőnevek · **csak egész szám** · NFC-normalizált szöveg. Ha ez elromlik, két gép sosem ért egyet.
- `js/esemeny/esemeny.js` — aláírás és ellenőrzés; az esemény **neve a tartalmának lenyomata** (mint a gitben).
- `js/tar/fajlTar.js` — a tár: **hozzáfűzhető fájl** (`esemenyek.jsonl`), soronként egy esemény. Nincs adatbázis-motor és nincs séma-migráció; a tároló csak `betolt()`-öt és `hozzafuz()`-t tud — „módosít" és „töröl" nincs, mert a modell szerint nem is létezhet.
- `js/tar/esemenyTar.js` — a lánc kezelése; a tárolót **kívülről kapja** (első paraméter), így a szabályok egy példányban élnek. **Ellenőrizetlen esemény nem kerül a tárba**, és eseményt **soha nem módosítunk/törlünk**.
- `js/allapot/szabalyok.js` — **a szabály-réteg**: egy helyen dönti el, mely események **számítanak** (tudatpont-keret, javaslat-jogosultság). *Amit a számítás nem ellenőriz, az nem szabály, csak illemtan* — a felület a másik gépen nem véd semmitől. A szabálysértő eseményt **nem törli**, csak kihagyja és felsorolja (D19).
- `js/allapot/allapotSzamitas.js` — események → entitások. „E-emberenként az utolsó nyer", ezért **nem kell globális sorrend**. A 0 tudatpontos entitás **nem létezik** (D14). ⚠️ A bemenetet **egy helyen rendezi** (`rendezettBemenet`: szerző + sorszám + azonosító), mert az ÉRTÉKEK sorrend-függetlenek voltak, a **FELSOROLÁSOK nem** — a csere után a két gép ugyanazokat az entitásokat más sorrendben mutatta. Nem az idő szerint rendez: az `ido` a szerző órája.
- `js/allapot/osszehasonlitas.js` — **„ugyanazt látjuk-e?"**: az állapot ujjlenyomata egyetlen 43 karakteres szövegben (entitások, javaslatok, egyezmények, jelzések), és az `elteresek`, ami megmondja, **melyik szakaszban** térnek el. Az `ujjlenyomat` parancs ezt írja ki. ⚠️ Időfüggő — csak azonos pillanatra hasonlítható.
- `js/allapot/javaslatSzamitas.js` — a döntéshozatal; **az egyezmény itt születik számításként**. Az összehasonlítások **egész aritmetikával** (kereszt-szorzás), hogy kerekítés soha ne dönthessen el szavazást. ⚠️ **A lezárás időrendben**: a határidő után érkezett esemény (szavazat, tudatpont-rendezés, érték javaslat) már nem számít bele — különben a lezárt döntés visszafordulna.
- `js/allapot/identitas.js` — ⭐ **KI TAG?** — és ez **számítás, nem esemény** (D17). A 9/c terv 4.1–4.3 lépése — **három kérdés, ugyanazzal a vázzal** (TAG ← meghívás · TANÚSÍTHAT ← felhatalmazás · 2. LÉPCSŐS ← tanúsítás): az **alapító** a gyökér (a `KoinoLetrehozas` szerzője), mindenki más a **saját `Belepes` horgonyával** és **egy** érvényes meghívással tag. ⭐⭐ A meghívás a **meghívott szeletébe** kerül (ettől korlátos a „hányan hívtak be?"), és **magával hozza a meghívó horgonyát** (`adat.sajatBelepes`) — így a lánc bejárása tiszta mutató-követés, keresés nélkül. A **gyorsítótár nem kényelem, hanem a lényeg**: nélküle 3^mélység, vele az ős-halmaz (mérve: 17,7 → 40,7 ős 1500 → 20 000 főnél). ⚠️ A hiányzó esemény **nem vád**, hanem „nem ellenőrizhető" (D19), és a **kör** nem szül tagságot.
- `js/muveletek.js` — a **tíz** művelet; mindegyik: lánc vége → aláírt esemény → mentés. ⭐ A `meghivas`, a `felhatalmazas` és a `tanusitas` **ugyanaz az alak** (`allitokRola`): az esemény a MÁSIK szeletébe kerül, és **hozza a saját horgonyomat** — ettől lesz az ellenőrzés keresés nélküli mutató-követés.
- `js/csere/csere.js` — **a csere-protokoll logikája, hálózat nélkül** (Szakasz 2): `ALLAS` (szerzőnként legnagyobb sorszám + hézagok + elágazások + a lánc **ujjlenyomata**) → `KEREK` → `ESEMENY`. ⚠️ A „legnagyobb sorszám önmagában elég" **nem igaz** — a hézag és a lánc közepén rejtett elágazás miatt; mindkettő rontás-próbával igazolva. A beérkezett esemény ugyanazon az `esemenyMentese` kapun megy be, mint a saját: **a hálózat nem kap engedékenyebb kaput**.
- `js/csere/vonal.js` — **a szállítás**: soronként egy JSON-üzenet TCP-n (ugyanaz az alak, mint a táré). Szimmetrikus — egyetlen `parbeszed` fut mindkét oldalon —, és **a csendes körnél áll meg** (se nem adtunk, se nem kaptunk). Semmit nem tud a koinóról. ⭐ **A kör egy 43 karakteres `LENYOMAT`-tal kezdődik** (D35, B. lépés): ha a két fél tudása egyezik, a részletes `ALLAS` el sem indul — mérve **334 bájt a 16 158 helyett**. ⚠️ A csendes kör feltétele emellett is megmarad: a lenyomat az egyetértést fogja meg, a csendes kör a hibás/rosszindulatú felet.
- `js/csere/udpVonal.js` — **ugyanaz a csere, UDP-n** (D37–D39, E. lépés): egy TCP-foglalatnak látszó utánzat, ami alatta UDP-t használ, így a `parbeszed` **változatlanul** fut az átfúrt résen (1. szabály gyakorlati haszna). Amit a UDP nem ad meg, azt itt pótoljuk: sorszám + nyugta + újraküldés. ⚠️ **És két őr, ami először hiányzott** (2026-08-30): a `kiurites()` — a lezárás előtt meg kell várni, hogy az utolsó darabot nyugtázzák, különben eldobjuk (a `parbeszed` az utolsó `LENYOMAT`-ra már nem vár) —, és a **tétlenségi óra**, hogy a néma társ ne ragaszthasson be. E kettő nélkül a csere **végtelenül várt**; rontás-próba őrzi mindkettőt.
- `js/csere/pajzsfuro.js` — **a lyukfúrás** (D37, E. lépés): mindkét fél kifelé kopog egy **rögzített helyi portról**, és a két rés a közepén találkozik — fogadóképes fél nélkül. A `mindketIrany` a mérce: nem elég kapni, a MI csomagunknak is át kell jutnia. ⚠️ A `kulsoCim` (STUN) **segédeszköz és paraméter** (2. szabály): a szerver cserélhető, ha nem válaszol a koino ugyanúgy működik, és **semmilyen bizalom nem jár vele** — egy portszámot mond, nem igazságot. Hosszú távon a saját tükrünk váltja ki (`vonal.js`, `latlak`).
- `js/csere/kapunyitas.js` — **megkérjük a routert**, hogy engedje be a kapcsolatot (NAT-PMP, PCP, UPnP — mind a három megmérve). ⚠️ **Segédeszköz, nem előfeltétel** (2. szabály): ha a router nemet mond, a koino ugyanúgy működik, csak ő kezdeményez kifelé. A fejlesztő routere mind a hármat elutasította — ezért fordult a terv a D33 felé.
- `js/csere/helyiFelfedezes.js` — **a helyi felfedezés** (Szakasz 2 / F. lépés): azonos wifin lévő készülékek megtalálják egymást, **cím beírása nélkül**. Két szerep: aki keres, **kiált** (`helyiFelfedezes`), aki dolgozik (`orjarat`/`figyel`), az **felel** (`felfedezoValaszolo`) — magától senki nem kiabál. ⚠️ **Kényelem, nem előfeltétel** (2. és 4. szabály): ha a wifi tiltja a kliensek közti forgalmat, a kézi `tars` út marad. Bizalom nem jár vele (3. szabály): a cím a **foglalatból** jön, nem az üzenetből, és sosem lesz esemény. ⚠️ Két dolog mérésből jött: **ismételve kell kiáltani** (egyszeri kiáltásnál a később induló nem hall semmit), és a válasz **a csoportnak is** megy (egy gépen több példány osztozik a rögzített felfedező porton).
- `js/csere/tarsak.js` — **a társ-lista** (D33, Szakasz 2 / A. lépés): a `csere` már nem egyetlen címre megy, hanem végig a listán. ⭐ **Egy társ bukása nem hiba, hanem a normális működés** — a kör megy tovább, és a bukás csak feljegyződik. Hálózatot **nem importál**: a cserét végző függvényt kívülről kapja (1. szabály), ezért TCP nélkül önpróbázható. A `utoljara`/`sikertelen` mező **helyi megfigyelés** — sosem terjed, és semmit nem dönt el a koinóban.
- `koino.js` — a **parancssori arc**: ezzel játszható végig kézzel a teljes kör (fejlesztői eszköz, lásd fentebb).
- `meres/probaFuttato.js` + `meres/mind.js` — az önpróbák közös váza és belépője.

### A PROTOTÍPUS architektúrája (befagyasztva)

### Backend (`backend/`) — Node.js + Express + Mongoose

Rétegek: `routes` → `controllers` → `services` → `repositories` → `models`. Belépési pont: `server.js` (route-regisztráció, statikus frontend-kiszolgálás, MongoDB-kapcsolat, cron indítás).

- `models/` — Mongoose sémák: eember, tartalom, kategoria, tartalomTipus, javaslat, ertekJavaslat, egyezmeny, szavazat, tudatpontAllokacio/Hozzarendeles, ertesites...
- `services/javaslat/` — a javaslat-életciklus magja; a `vegrehajtok/` almappában művelet-típusonkénti végrehajtók (athelyezesi, egyesitesi, torlesi, csomag), amiket a `javaslatVegrehajtasiService` fog össze.
- `jobs/javaslatCronJob.js` — node-cron: lejáró javaslatok időzített lezárása.
- `services/hierarchikusFrissitesService.js` — hierarchikus (szülő-gyerek) frissítések; a sorrend kritikus (lásd git history).

### Frontend (`frontend/`) — vanilla HTML/CSS/JS, build nélkül

ES-modulok, komponens-osztályok. Belépés: `index.html` + `js/main.js`, nézetek a `js/components/foOldal.js`-ből.

- `js/components/kartya/` — entitás-kártyák (TartalomKartya, JavaslatKartya, EgyezmenyKartya...), a `Pakli.js` listázza őket.
- `js/components/szovegSzerkeszto/` — blokk-alapú szerkesztő: `blokkok/` (SzovegBlokk, KepBlokk, FajlBlokk, LinkBlokk, EntitasHivatkozasBlokk), `eszkoztar/`, BlokkLista, OldalNavigacio.
- `js/components/modals/` — Modal alaposztály + specifikus modálok (JavaslatModal); a hozzájuk tartozó HTML a `html/components/modals/` alatt.
- CSS komponensenként külön fájlban a `css/components/` alatt, a `css/main.css` importálja őket.

## Kódolási konvenciók

1. **Minden név magyarul, camelCase-ben** (fájlok, változók, függvények, CSS-osztályok). Osztályfájlok PascalCase-zel (pl. `IdEllenorzoMezo.js`).
2. **Minden fájl első sora** komment az elérési úttal, pl. `// frontend/js/main.js`.
3. **Bőséges magyar kommentek**: a fájl/osztály tetején felelősség-leírás („Felelősség: ...", „Használják: ..."), a logikai blokkok előtt `// ===== SZAKASZ =====` fejlécek.
4. **Naplózás**: a metódusok elején és végén `console.log` a releváns értékekkel (pl. `'Metodus - KEZDÉS'`, `'Metodus - VÉGE'`).
5. **Moduláris, clean code** a frontenden is: egy komponens = egy JS-fájl + egy CSS-fájl.
6. A fejlesztő most tanul programozni: **apró, alapos lépésekben** haladjunk, a változtatásokat érthetően magyarázzuk el magyarul.

## Munkafolyamat

- Commit-üzenetek magyarul, a `main` branchre dolgozunk.
- Módosítás után a Docker-es dev környezetben (http://localhost:3000) ellenőrizzük a működést.
- **Tesztelés előtt mindig nézd meg a [`docs/teszt.md`](docs/teszt.md)-t** — ez tartalmazza a környezet-indítást, az útvonalakat, a kötelező mezőket és a teszt-forgatókönyveket.
- **Fejlesztés közben frissítsd a [`docs/teszt.md`](docs/teszt.md)-t is, ha kell** — ha egy útvonal, kötelező mező, érték-tartomány vagy teszt-forgatókönyv változik, vezesd át ide, hogy a teszt-referencia naprakész maradjon.

## Zárójeles jegyzetek konvenciója

A fejlesztő a munka közben felmerülő mellékes ötleteit, kéréseit **zárójelben** írja le — `[ ... ]` (szögletes) vagy `{ ... }` (kapcsos) formában is. Ezeket **nem szabad azonnal megvalósítani**, de elveszíteni sem. A helyes kezelés:

1. A jegyzetet **szó szerint felvezetni a [`docs/jegyzetek.md`](docs/jegyzetek.md) naplóba** (dátummal, felülre, 🆕 jellel).
2. Röviden visszaigazolni, hogy fel lett jegyezve, majd **folytatni az aktuális feladatot**.
3. Ha a jegyzet a folyó munkát közvetlenül érinti, előbb rákérdezni.
4. Ha valódi feladattá válik, átvezetni a [`docs/fejlesztesi_terv.md`](docs/fejlesztesi_terv.md)-be, és a naplóban ✅-re állítani.
