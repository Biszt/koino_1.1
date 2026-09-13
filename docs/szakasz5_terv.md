# Szakasz 5 — A FELÜLET: a végpont-térkép

*Létrehozva: 2026-09-06. A döntések, amikre épül: [`felulet_terv.md`](felulet_terv.md)
3–4. pont (futtatókörnyezet, vékony lap, teljes pakli).*

> **Mi ez a dokumentum?** A Szakasz 5 **munkadarabja**: mit kérdez a lap, mit számol a
> program. Nem a felület kinézetéről szól — az a [`felulet_terv.md`](felulet_terv.md) —,
> hanem az **illesztésről** a kettő között.
>
> ⭐ **Miért ez az első, kód előtt?** Mert a Szakasz 3 megtanította: *nem a fájlformátum volt
> a hiba, hanem az illesztés.* Ha a lap azt kérdezi, hogy „add ide mindet", akkor bármilyen
> okos program **kénytelen** mindet visszaadni. A rajzolás utólag is javítható; a kérdés
> alakja nem.

---

## 0. A KIINDULÁS

**A prototípus felülete 18 útvonal-fájlon, 82 végponton át beszélt a szerverrel** — az egész
kapcsolat egyetlen fájlban fut össze (`frontend/js/utils/apiHelper.js`, `API_ALAP_URL =
'/api/'`, 7 `fetch(`). A Szakasz 5 ezt a fájlt irányítja át a koino programra.

**A 82 végpont hármas felosztása** ([`felulet_terv.md`](felulet_terv.md) 4. pont):
**43 átjön** · **10 átjön más mechanikával** · a többi mögött nincs mit átemelni
(jelszó, e-mail, feltöltés, lokáció, platform-statisztika), vagy későbbi szakasz
(keresés → Szakasz 6, síkidom → felfüggesztve).

### Három szabály, ami minden sorra érvényes

1. ⛔ **Kérdezhető alak, nem „add ide mindet"** (9. szabály). Minden lista-végpont
   **lapozható** vagy **szeletre szűkített**. 🔍 A próba: *„ez mit csinál egymilliárd
   e-embernél?"*
2. ⛔ **A lap nem számol** (vékony lap). Amit a program tud kiszámolni, azt a program
   számolja ki. A lap **rajzol**.
3. ⛔ **Az írás mindig ESEMÉNY.** Nincs „mentés az adatbázisba": minden `POST`/`PATCH`/`PUT`
   pontosan **egy művelet** a `js/muveletek.js`-ből, ami **egy aláírt eseményt** hoz létre.
   ⚠️ Ahol nincs művelet, ott **új művelet kell** — és az a Szakasz 5 valódi munkája, nem a
   rajzolás.

### Amit az „authentikáció" helyettesít

A prototípus végpontjait `authMiddleware` védte (JWT, bejelentkezés után). **A P2P koinóban
nincs bejelentkezés** (D15): a személyazonosság a **készülék kulcsa**. Ezért:

| Prototípus | P2P koino |
|---|---|
| `authMiddleware` (JWT) | ⭐ **a helyi kapu jelszava** — nem azonosít, csak *azt* bizonyítja, hogy a kérés a saját gépemről, a saját lapomról jön |
| „a bejelentkezett e-ember" | **a helyi kulcs tulajdonosa** — mindig ugyanaz |
| `/sajat-*` végpontok | ugyanaz, csak a „saját" a **helyi kulcsot** jelenti |
| „nyilvános" végpont | ⭐ **nincs különbség** — a tár helyi, minden olvasás helyi |

⚠️ **A helyi kapu jelszava NEM biztonsági réteg a koinón belül** (3. szabály: a bizalom sose
a csatornából jöjjön). Egyetlen dolgot véd: hogy egy **másik weboldal** ne írhasson eseményt
a nevemben a `127.0.0.1`-en át. A koino kapuja változatlanul az `esemenyMentese`.

---

## 1. A PAKLI — és a végpont, ami a legfontosabb az egészben

| Végpont | Mit kérdez a lap | Mit csinál a program |
|---|---|---|
| `GET /api/pakli/` | a pakli kártyái | ⛔⛔ **EZ A KRITIKUS SOR** — lásd alább |
| `GET /api/pakli/rendezett` | rendezett pakli | ugyanaz, rendezéssel |
| `GET /api/pakli/szoveg/:tipus/:id` | egy entitás szövege | **egy szelet** — `entitasEsemenyei` (3.2), O(szelet) |

> ### ⛔⛔ A `GET /api/pakli/` A `betolt()` ALAKJA — ITT DŐL EL A 9. SZABÁLY
>
> A prototípusban ez Mongo-lekérdezés volt, szerver-oldali rendezéssel és lapozással. A P2P
> koinóban az állapot **számítás** az eseményekből — és a mai számítás **az összes eseményt**
> kapja (`allapotSzamitasa(await koinoEsemenyei(tar, KOINO))`).
>
> ⚠️ **Ez az utolsó megmaradt nem-skálázó út a programban.** A Szakasz 3 szándékosan
> meghagyta („a próbák és a kis koino így kapja a bemenetét"), de **ha a pakli erre épül, a
> felület bebetonozza.**
>
> ⭐ **Amit tehát el kell dönteni, MIELŐTT a pakli megszületik:** a lap **soha ne kérjen
> paklit**, hanem **egy oldalnyi kártyát** kérjen — rendezéssel és kurzorral:
>
> ```
> GET /api/pakli?rendezes=<mi>&kurzor=<hol tartok>&darab=<max>
> ```
>
> A megvalósítás mögötte maradhat egyszerű (ma: számol, rendez, szeletel) — **a KÉRDÉS
> alakja az, ami az első naptól helyes kell legyen.** Ugyanaz a lecke, mint a 3.2-nél.
>
> 🔍 *Nyitott: mi a rendezés kulcsa, és mi lesz a „kurzor"? A tudatpont-összeg változhat két
> lekérés között — a kurzornak stabilnak kell lennie, különben a lapozás elemet ismétel vagy
> kihagy. Ez a Szakasz 5 első valódi tervezési kérdése.*

---

## 2. AZ ENTITÁSOK — gondolat, kategória, gondolattípus

Mindhárom **ugyanaz az öt végpont** (`/api/gondolat`, `/api/kategoria`, `/api/gondolatTipus`):

| Végpont | Mit csinál a program | Van rá művelet? |
|---|---|---|
| `POST /` | új entitás | ⚠️ **csak a gondolatra** — `gondolatLetrehozasa` |
| `GET /` | lista | ⛔ **lapozhatóvá kell tenni** (ugyanaz, mint a pakli) |
| `GET /:id` | egy entitás | ✅ **egy szelet** — O(szelet) |
| `GET /:id/reszletek` | egy entitás + számított mezők | ✅ szelet + számítás |
| `PATCH /:id` | módosítás | ⚠️⚠️ **lásd lent** |

> ### ⚠️ KÉT HIÁNY, AMIT EZ A TÉRKÉP TALÁLT
>
> **(a) A kategória és a gondolattípus NEM LÉTEZIK a P2P koinóban.** A `muveletek.js` ma
> **13 műveletet** ismer, és entitást csak egyet tud létrehozni: `gondolatLetrehozasa`
> (`tipus: 'Gondolat'`). A prototípus **10 végpontja** (kategória 5 + gondolattípus 5) tehát
> nem „átemelendő", hanem **megépítendő** — a domain-fogalom megvan (a kategóriák és
> gondolattípusok rendszerezik a gondolatokat), az esemény nincs.
>
> **(b) A `PATCH /:id` alighanem NEM közvetlen írás.** A koino domain-logikája szerint egy
> gondolat módosítása **szerkesztési javaslat** → szavazás → egyezmény (D27), és
> *„csak az tehet javaslatot, aki tudatpontot rendelt a gondolathoz."* A prototípusban volt
> közvetlen `PATCH` — **tisztázandó, hogy az mikor jogos** (a létrehozó a saját, még
> érintetlen gondolatán?), vagy a P2P-ben teljesen a javaslat-út váltja ki.
> ⭐ *Ez nem felület-kérdés, hanem domain-kérdés — és jobb most feltenni, mint a kártya
> megírása közben.*

---

## 3. A JAVASLAT ÉS AZ EGYEZMÉNY

| Végpont | Mit csinál a program | Művelet |
|---|---|---|
| `POST /api/javaslat` | új szerkesztési javaslat | ✅ `javaslatLetrehozasa` |
| `GET /api/javaslat/` | lista | ⛔ lapozható |
| `GET /api/javaslat/:id` · `/:id/reszletek` | egy javaslat | ✅ szelet |
| `GET /api/javaslat/:id/statisztika` | támogatás, részvétel, bizonyossági mutató | ✅ **`javaslatSzamitas.js`** — egész aritmetikával, ahogy ma |
| `GET /api/javaslat/:id/sajat-szavazat` | szavaztam-e már | ✅ a saját láncomból |
| `POST /api/javaslat/szavazat` | szavazat | ✅ `szavazas` |
| `DELETE /api/javaslat/szavazat` | szavazat visszavonása | ⚠️ **nincs művelet** — de lehet, hogy nem is kell: „az utolsó nyer" · *tisztázandó, van-e „nem szavazok" állapot* |
| `GET /api/egyezmeny/` · `/:id` · `/:id/reszletek` · `/javaslat/:javaslatId` | egyezmények | ✅ ⭐ **számítás, nem tárolt sor** (D17) — az egyezmény sosem volt esemény |

---

## 4. A TUDATPONT

| Végpont | Mit csinál a program | Művelet |
|---|---|---|
| `POST /api/tudatpont/hozzarendeles` | pont az entitásra | ✅ `tudatpontRendezese` |
| `PUT /api/tudatpont/szerep/:tipus/:id` | aktív/passzív | ✅ ugyanaz (`szerep` paraméter) |
| `GET /api/tudatpont/entitas/:tipus/:id` | az entitás allokációja | ✅ szelet |
| `GET /api/tudatpont/hozzajarulok/:tipus/:id?limit&skip` | ki adott pontot | ✅ szelet — ⭐ **már a prototípusban is lapozott** |
| `GET /api/tudatpont/hozzarendelesek?limit&skip` | a saját hozzárendeléseim | ✅ a saját láncom — ⭐ **szintén lapozott** |
| `GET /api/tudatpont/aktiv-hozzarendelesek?limit&skip` | ugyanaz, aktívra szűrve | ✅ |
| `GET /api/tudatpont/hianyzo-felmenok/:tipus/:id` | hány felmenőre kell még pont | ✅ számítás |
| `GET /api/tudatpont/jogosultsag/:tipus/:id` | tehetek-e javaslatot | ✅ **`szabalyok.js`** — ez ma is szabály-kérdés |

⭐ **Ez a legkönnyebb csoport:** nyolcból hat már ma is szeletre vagy saját láncra kérdez, és
kettő már a prototípusban is lapozott. *A tudatpont-réteg készen áll.*

---

## 5. AZ ÉRTÉK JAVASLAT

| Végpont | Mit csinál a program | Művelet |
|---|---|---|
| `POST /api/ertekJavaslat` | küszöb-javaslat | ✅ `ertekJavaslat` |
| `GET /api/ertekJavaslat/aktualis/:tipus/:id` | a hatályos küszöbök | ✅ **medián-számítás** (`median`) |
| `GET /api/ertekJavaslat/eloszlas/:tipus/:id` | érték → hány javaslat | ✅ szelet + számítás |
| `GET /api/ertekJavaslat/sajat/:tipus/:id` | a saját javaslatom | ✅ a saját láncomból |
| `GET /api/ertekJavaslat/reszletek/:tipus/:id` | részletes értékek | ✅ |

---

## 6. AMI MÁS MECHANIKÁVAL JÖN ÁT

### Meghívó (5 végpont) — ⭐ kód helyett esemény

A prototípusban a meghívó egy **kód** volt, amit a szerver ellenőrzött. A Szakasz 4 óta a
meghívás **aláírt esemény** (`Meghivas`), ami a **meghívott szeletébe** kerül.

| Prototípus | P2P |
|---|---|
| `GET /kotelezo` (kell-e meghívó?) | ⭐ mindig kell — **1 meghívó** (`MEGHIVO_KELL`, D56) |
| `GET /ellenorzes/:kod` | ⛔ nincs kód — az ellenőrzés a `tagE()` |
| `GET /sajat` (kiket hívtam) | ✅ a saját láncomból |
| `POST /` | ✅ `meghivas` |
| `POST /:id/visszavonas` | ⚠️ **nincs művelet** — és ⭐ **valószínűleg nem is lesz**: a meghívás **állítás a múltról**, mint a tanúsítás (D46). *Tisztázandó.* |

### Értesítések (5 végpont) — helyben számolva

Nincs e-mail és nincs szerver, ami küldene. Ami marad: **helyben kiszámolt** értesítés
(új javaslat abban, amiben pontom van; lezárult szavazás; a „MÉG NEM ÉRTÜNK ÖSSZE" jelzés).
Az „olvasott" állapot **helyi feljegyzés**, nem esemény — mint a `tarsak.js` `utoljara` mezője:
nem terjed, és semmit nem dönt el.

---

## 6/b. ⛔⛔ AMIT AZ 5.3 ELSŐ ÓRÁJA TALÁLT (2026-09-06) — három akadály a kártyák alatt

*A kártyák megírása helyett előbb megnéztük, mire épülnének. Három dolog derült ki, és
mind a három **a kártyák ALATT** van — vagyis a felületen „megjavítani" őket hiba volna.*

### ✅⛔ 1. AZ EGYEZMÉNYT SEMMI NEM ALKALMAZZA — mérve, és 2026-09-06-án MEGÉPÍTVE

```
javaslat: „MEGVALTOZTATOTT CIM"  →  ELFOGADVA  →  📜 EGYEZMÉNY megszületett
a gondolat viszont továbbra is:      tiFKe5ig  EREDETI CIM
```

A `javaslatSzamitas.js` kiszámolja az egyezményt és megőrzi benne a `valtozas`-t — de az
`allapotSzamitas.js` **soha nem olvassa**: a `valtozas` és az `egyezmeny` szó elő sem fordul
benne. A sorrend is ezt mutatja: előbb `allapotSzamitasa`, utána `javaslatokSzamitasa` — a
javaslat-réteg nem tud visszahatni az entitásra.

⚠️ **A prototípusban ez külön réteg volt:** `services/javaslat/javaslatVegrehajtasiService.js`
+ négy végrehajtó (`vegrehajtok/`: módosítási, áthelyezési, törlési, egyesítési). **A P2P
koinóban ez a réteg nincs megépítve.**

⭐ **Miért blokkolja a kártyákat?** Mert a kártya a címet és a szöveget mutatja. Elfogadott
egyezmény után a **régit** mutatná — és a legrosszabb kimenet az volna, ha ezt a felületen
„javítanánk ki". *Ami DÖNT valamiről, az a számítás, nem a rajzolás.*

> ### ✅ MEGÉPÍTVE: `js/allapot/szerkesztesiVegrehajtas.js` (2026-09-06, **16 önpróba**)
>
> *Csaba döntése: „csináld úgy, ahogy a fejlesztés szempontjából a legpraktikusabb; nem baj,
> ha eltérsz a sorrendtől."* — ezért a végrehajtás **a kártyák ELÉ** került, új lépésként.
>
> **A három fázis**, és a sorrend nem cserélhető fel:
>
> 1. `allapotSzamitasa` → az entitások **úgy, ahogy létrejöttek**
> 2. `javaslatokSzamitasa` → a döntések, és belőlük az **egyezmények** (D17)
> 3. ⭐ **`egyezmenyekAlkalmazasa`** → az egyezmények **rávezetése** az entitásokra
>
> *A döntéshez kell az állapot (küszöbök, tudatpontok), az entitás végleges alakjához pedig
> kell a döntés.* ⭐ Ez a **D8** gyakorlati alakja: az egyezmény a **TÉNY** (örök,
> pillanatképpel), az entitás mai alakja a **HATÁLY** — ez a fájl a kettő között a nyíl.
>
> **Mérve, a parancssoron:**
> ```
> MOST (folyamatban):   tiFKe5ig  EREDETI CIM
> 30 NAP MÚLVA:         tiFKe5ig  MEGVALTOZTATOTT CIM   📜 egyezmény
> ```
> ⭐ És a `pakli.js` **ugyanezt a három fázist** futtatja — így a parancssor és a lap
> ugyanazt mondja. *(Enélkül a kártya a régi címet mutatta volna, és a javítás a rossz
> helyre, a felületre került volna.)*
>
> **Két végrehajtó van megépítve, kettő szándékosan nem:**
>
> - ✅ **Modositas** — cím és/vagy szöveg. ⚠️ *Csak a megnevezett mező változik:* egy
>   cím-csere nem törölheti a szöveget azzal, hogy nem beszélt róla.
> - ✅ **Athelyezes** — új szülő. ⛔ **Kör-őrrel:** egy áthelyezés kört csinálhatna a fában
>   (A alá kerül B, miközben B már A leszármazottja); ilyenkor **kihagyjuk, és megmondjuk,
>   miért** — a fa érintetlen marad.
> - ⏸️ **Torles**, **Egyesites** — ⭐ *nem részletkérdés:* a törlés a tudatpontok
>   visszaosztását kívánja, az egyesítés két szelet összefésülését. És **ma egyik eseményt
>   sem tudja előállítani semmi** (a `muveletek.js` alapértéke `Modositas`, a parancssor is
>   azt adja). ⚠️ **A hiány LÁTSZIK**, nem néma: a `kihagyottak` listába kerülnek,
>   indoklással — ugyanaz a minta, mint a `szabalyok.js` szabálysértő eseményeinél (D19).
>
> ⭐⭐ **És a determinizmus, ami nélkül két gép mást mutatna:** ha két egyezmény ugyanazt az
> entitást írja át, a sorrend eldönti, melyik marad felül. **A lejárat (`megszuletett`)
> szerint rendezünk**, holtversenynél a javaslat azonosítója dönt — *nem* a térkép bejárási
> sorrendje szerint, mert az a beszúrás sorrendje, ami két gépen eltérhet. *Ugyanaz a
> hiba-fajta, amit az `allapotSzamitas.js` `rendezettBemenet`-je zárt ki.*

### ⚠️ 2. A KÁRTYÁK MÉLYEN ÖSSZEFONÓDNAK A MODÁLOKKAL

Mérve, importonként: `Kartya.js` **hét modált** importál (Ertesitesek, Tudatpontok, Kereses,
Struktura, Sikidom, Rendezes, ReszveteliBeallitasok) · `GondolatKartya` hatot ·
`JavaslatKartya` négyet · `EgyezmenyKartya` ötöt · `KategoriaKartya` hetet.

⚠️ **Vagyis az 5.3 (kártyák) → 5.5 (modálok) sorrend a valóságban nem választható szét.**
Két út van, és ez **döntés, nem részletkérdés**:

| Út | Mit jelent |
|---|---|
| **(a) Helyőrzők** | 13 apró modal-helyettesítő („ez az 5.5-ben jön"). A kártya **változatlanul** átjön és **pontosan úgy néz ki**; csak a menüpontok némák. ⭐ Van rá minta a prototípusban: `FejlesztesreVar.js`. |
| **(b) 5.3 + 5.5 egyben** | A modal-park (**570 KB**) is most jön át. Teljes viselkedés, de sokkal nagyobb lépés — és a modálok fele olyan végpontot hívna, ami a P2P-ben nem létezik (jelszó, e-mail, feltöltés). |

### ⚠️ 3. A KÁRTYA OLYAN MEZŐKET VÁR, AMIK A P2P-BEN NINCSENEK

A kártyák adat-alakja: `{ entitasId, entitasTipus, olvasatlanErtesitesek, adatok: { cim,
szoveg, szovegMezo, gondolatTipus, kategoriak, kulonvalasok, modositva, nev, szuloModositva } }`.

Ebből a P2P koino ma **a `cim`-et és a `szoveg`-et tudja**. Nincs `gondolatTipus` és
`kategoriak` (⭐ ez a 2. pont a 7. szakasz munkalistájából — a két entitástípus nem létezik),
nincs `olvasatlanErtesitesek`, `kulonvalasok`, `modositva`, `szuloModositva`.

⭐ **Ahol a leképezés lakni fog:** egy **adapter a `koino/felulet/`-ben**, nem szétszórva a
kártyákban, és **nem** az `/api/pakli`-ban. Az API maradjon a koino saját szótárában (a
terminál- és natív kliensnek is az kell); a mező-átnevezés nem számítás, tehát a lapon a
helye. *A „vékony lap" a SZÁMÍTÁSRÓL szól, nem az elnevezésekről.*

---

## 7. ⚠️ AMIT A TÉRKÉP TALÁLT — az igazi munkalista

*Ez a dokumentum haszna: nem az derült ki, mit kell átrajzolni, hanem **mi hiányzik**.*

0. ✅ **AZ EGYEZMÉNY VÉGREHAJTÁSA** — *mérve hiányzónak, majd megépítve 2026-09-06 (6/b.
   szakasz)*. `js/allapot/szerkesztesiVegrehajtas.js`, **16 önpróba**; a `koino.js` és a
   `pakli.js` is a három fázist futtatja. ⏸️ Nyitva: a `Torles` és az `Egyesites`
   végrehajtója — de azokat ma **egyetlen művelet sem tudja előállítani**.
1. ✅ **A pakli-lekérdezés kérdezhető alakja** — *kész az 5.2-ben.* Ez volt az utolsó
   `betolt()`-alakú út; ha elrontottuk volna, a felület bebetonozza.
2. ✅ **A kategória és a gondolattípus** — *megépítve az 5.4-ben* (12. szakasz).
3. ✅ **A `PATCH` értelme** — *eldőlt (5.4):* nincs közvetlen módosítás. A koinóban a
   szerkesztés **javaslat → szavazás → egyezmény** (D27), és az egyezményt azóta rá is
   vezetjük az entitásra. ⭐ A prototípus `PATCH`-ének tehát **nincs megfelelője, és nem is
   lesz** — ez nem hiány, hanem a modell.
4. ✅ **A szavazat visszavonása** — *eldőlt (5.4):* nem kell külön művelet. A meggondolást az
   „utolsó nyer" fedi (a `szavazas` erre épül), a „jelen vagyok, de nem foglalok állást"
   pedig a **`Tartozkodik`**. ⭐ Egy harmadik, „mégsem szavaztam" állapot csak a részvételi
   arányt tenné kétértelművé.
5. ✅ **A meghívás visszavonása** — *eldőlt (5.4):* nincs ilyen. A **D46** szerint a
   tanúsítás **állítás a múltról**, azt nem lehet visszavonni — és a meghívás ugyanilyen
   állítás („behívtam"). ⚠️ Amit vissza lehet vonni, az a **felhatalmazás**, mert az jog,
   nem állítás — és az meg is van (`felhatalmazasVisszavonasa`).
6. ⏸️ **A képek és fájlok helye** (`KepBlokk`, `FajlBlokk`) — a prototípusban szerver-mappa,
   a P2P-ben **eldöntetlen** (D3, tartalmi réteg). ⭐ *A pakli ezen fog először elakadni.*
7. ✅ **A helyi kapu védelme** — *megépítve az 5.1-ben*, öt őrrel.
8. ⏸️ **„Hány gondolat használja ezt a kategóriát?"** — *új, az 5.4-ből.* A besorolás-kártya
   mutatná (`hasznaloGondolatokSzama`), de ez **visszafelé mutató kérdés** (ki hivatkozik
   rám?), amihez a szeletelt tárban külön mutató kellene. ⚠️ Ma `null`, vagyis **a hiány
   látszik** — nem találunk ki számot. *A kereső-réteg kérdése (Szakasz 6).*

---

## 8. ÁLLOMÁSOK

*Csaba (2026-09-06): a „nem kell mérföldkő" a **szűkített termékre** vonatkozott, nem a munka
felosztására — **„természetesen megértem, hogy szakaszokra/állomásokra van osztva az
átvitel."*** A cél tehát a teljes pakli; az út állomásokra bomlik.

| # | Állomás | Mire jó |
|---|---|---|
| **5.1** | ✅ **A helyi kapu** — HTTP a `127.0.0.1`-en, négy őr, **23 önpróba** (2026-09-06) | ettől beszél a lap a programmal |
| **5.2** | ✅ ⭐ **A kérdezhető pakli-lekérdezés** — rendezés + kurzor + darab, **23 önpróba** (2026-09-06) | ⛔ **a 9. szabály itt dőlt el** |
| **5.3** | ✅ **A kártyák** — az örökölt `Kartya.js` + Gondolat/Javaslat/Egyezmény, **változatlanul** (2026-09-06) | ettől lett mit nézni |
| **5.4** | ✅ **A hiányzó műveletek** — kategória, gondolattípus, és a 7. pont lezárása (2026-09-06) | a felület alatti lyukak betömése |
| **5.5** | 🚧 **A modálok** — ✅ tudatpont, érték javaslat, részletek, részvétel, **szavazás** (2026-09-06); ⏸️ a JavaslatModal és a létrehozó modálok (az 5.7-re várnak) | a teljes pakli |
| **5.6** | ✅ **A belépő tér** — koino-kártyák létrehozási idő szerint, **19 önpróba** (2026-09-12) | a D25 nézete |
| **5.7** | ✅ **A szövegszerkesztő + az „Új gondolat” + a FÁJL-RÉTEG helyi fele**, **20 önpróba** (2026-09-12) | a szövegszerkesztő teljes átemelése |
| **5.8** | 🚧 ✅ **A `JavaslatModal`** (66 KB) — a lapról már **javasolni is** lehet, **3 önpróba** (2026-09-13); ⏸️ `KategoriaModal`, `TudatpontokModal`… | a pakli teljes működése |
| **✅** | **A fájlok SZÁLLÍTÁSA** — felderítés · kérelem a bulin · átvitel · randevú az átfúrt résen, **43 önpróba** (2026-09-13) | a kép két készülék között is átjön |

⚠️ *Az 5.2 nem halasztható az 5.3 mögé: a kártya alakja attól függ, mit tud kérni a lap.*

### ⏭️ ITT TARTUNK (2026-09-12)

⭐⭐ **Az 5.6 elé bekerült egy tétel, ami nem volt a tervben, de az 5.6 ALAPJA:** a Szakasz 4
(identitás) **kézi útja** megépült — hét parancs (`belep` · `meghiv` · `felhatalmaz` ·
`tanusit` · `bemutatkoz` · `visszavon` · `lattam`) és az állapot **AZONOSSÁG** szakasza
(három kérdés, három jellel: ✔ igen · ✘ nem · **?** nem ellenőrizhető).

⛔ Kiderült ugyanis, hogy a teljes két lépcsős beléptető (D54–D63, **52 önpróbával**)
**senkihez nem volt bekötve**: az `identitas.js` és a `jelzesek.js` egyetlen importálója a
**saját próbája** volt. *A belépő tér (a D25 nézete) pont erre épülne — enélkül nem lett
volna mit mutatnia.*

⭐ A teljes kör **két készüléken, próbával bizonyítva** (`meres/parancssorProba.js`):
`belep` → csere → `meghiv` → csere, és a másik készülék állapota **✘ tag-ról ✔ tag-ra** vált.

⏸️ **És egy nyitott döntés, ami az 5.6-ot érinti:** kérdezzen-e a **szabály-réteg** tagságot?
⛔ Ha igen, a válasz nem lehet „kidobom": P2P-n a *„nem tag"* és a *„még nem láttam a
bizonyítékát"* ugyanaz — a koinónak van erre szava (`nemEllenorizhetok`, D19).

✅ **ÉS EZ MEGÉPÜLT (2026-09-12): `kivisz` + `behoz`** — a 4. szabály hiánya pótolva
(`js/csere/fajlCsere.js`). ⭐ A behozatal **nem ír új beolvasztó logikát**, hanem a `csere.js`
`beolvasztas()`-át hívja — ugyanazt, amit a TCP- és az UDP-csere —, tehát *a fájl sem kap
engedékenyebb kaput* (3. szabály). A kivitel alakja **bájtra a táré**, ezért a lemásolt
`esemenyek.jsonl` is behozható: a régi kézi út nem veszett el, hanem **ellenőrzötté vált**.

---

## ✅ AZ 5.6 ELKÉSZÜLT (2026-09-12) — a belépő tér

⭐ **Csaba két döntése, amire épül:**

1. **A hatókör:** a v1 azt mutatja, amit **ez a készülék ismer**. A D25 tere egyszer idegen
   koinókat is mutatna, de ahhoz a **kereső-réteg** kell, ami szándékosan elhagyható és nincs
   megépítve. ⛔ A felület ezért **kimondja a határt** (`csakAmitIsmerunk`) — próba őrzi, nem
   csak komment. *A hallgatás teljességet ígérne, amit nem tudunk tartani (D19).*
2. **A rendezés:** **létrehozási idő, új elöl.** A `KoinoLetrehozas.ido` a szerző órája, tehát
   állítás — de **minden készüléken ugyanaz a sorrend**; a „mikor láttam először"
   hamisíthatatlan, viszont gépfüggő. ⭐ A koino mindenhol a determinizmust választja, és a
   másikat is **eltesszük és mutatjuk** (`eloszorLattam`), így a döntés megfordítása egy sor.

### ⭐⭐ A terv két nyitott kérdésére megjött a válasz

**„Mit mutasson a kártya a létszám mellé, hogy a szám súlya látszódjon?"** → **három szám,
nem egy:** `tagok` · `nemEllenorizhetok` · `belepok`. Ugyanaz a D19-es hármas, amit az
AZONOSSÁG szakasz használ — nem kellett hozzá új gépezet. ⭐ **A különbségük MAGA a súly:**
ahol 900-an beléptek, de 12-nek van visszavezethető meghívási lánca, az **ránézésre más**,
mint ahol 900-ból 900.

**És a „létszám = a koino állítása" aggály szűkebb, mint hittük:** ez csak arra a koinóra
igaz, aminek **nincs meg az adata**. Amelyiknek megvan, ott a számot **aláírt eseményekből
számoljuk** — tény, nem állítás. ⛔ **Rendezni viszont továbbra sem lehet szerinte** (D18/2),
és ezt próba őrzi: a `RENDEZESEK` lista nem tartalmazhat ilyet.

### ⛔⛔ A szerkezeti darab: a felület koinót vált

A parancssor **egy koinóra szól** (a `KOINO_AZONOSITO` indításkor eldől), és ez helyes. A
belépő tér viszont a koinók FÖLÖTT áll: a lap belép az egyikbe, majd egy másikba,
**újraindítás nélkül**. ⭐ Ezért a felület koinónként tart egy **nyitott állapotot** — saját
tár, saját környezet, saját pakli-nézet —, és a kezelő **árnyékolja** a neveket, ezért
egyetlen végpont kódját sem kellett átírni miatta.

⚠️ **A pakli-nézet koinónként külön**, mert a horgony „az első N esemény" képe, és az
eseményhalmaz koinónként más — egy közös nézet a váltás után **másik koino képét** adná
vissza a gyorsítótárból.

⚠️ **A „belépés" NEM bejelentkezés** (D15): a kulcsod minden koinóban ugyanaz, csak a lap
néz máshová. ⛔ És csak **létező** koinóra lehet váltani: az `esemenyTarNyitasa` létrehozná a
mappát, tehát egy elgépelt név némán új, üres koinót csinálna a téren.

### ⚠️ Amit a böngésző mondott meg

A `hidden` attribútum csak a böngésző alap-stíluslapján állít `display: none`-t, amit
**bármelyik osztály-szabály felülír** — a `.koino-sav { display: flex }` miatt a tér sávja a
pakli mellett is látszott. *Megint nem az érvelés találta meg, hanem a képernyő.*

⏸️ **Ami a térből még hátra van:** a kártya-hamburger (az adott koino opciói) és az alsó sáv
(a tér opciói: új koino indítása — ma parancssorból megy).

---

## 🚧 AZ 5.7 ELSŐ FELE (2026-09-12) — a szövegszerkesztő, és az első valódi használója

⭐⭐ **HÚSZ FÁJL JÖTT ÁT BÁJTRA VÁLTOZATLANUL**, és **egyet** kellett átírni: a
`FeltoltesKezelo`-t. Ugyanaz a minta, mint az 5.3-ban a kártyáknál — és ez nem véletlen:
a feltöltés a szerkesztő **1355 soros** fő fájljában mindössze **13 sort** érint.

⭐ **ÉS A 13 HELYőRZŐ ÍGÉRETE BEVÁLT:** a `GondolatModal` egy 601 bájtos helyőrző volt,
most a protoípus **24 KB-os valódija** — *egy fájl cseréje*, ahogy az 5.3 megígérte.

### ⛔ Amit ez kinyitott: a lapról eddig NEM lehetett gondolatot létrehozni

A pakli mutatta a gondolatokat, de újat csak a parancssorból lehetett — *a 4. szabály
fordítottja: itt a kéz volt meg, a lap nem.* Most megvan: `POST /api/gondolat`.

⭐ **HÁROM ALÁÍRT ESEMÉNY, nem egy „mentés".** A prototípusban egy POST hozta létre a
gondolatot, a kezdő tudatpontot és a küszöbeit; a koinóban ez három **külön állítás**,
három esemény, ugyanazon az `esemenyMentese` kapun.

⛔⛔ **ÉS AMI NEM JÖTT ÁT: a kÖZVETLEN SZERKESZTÉS.** A prototípusban a szerző egyszerűen
átírhatta a gondolatát (`PATCH /api/gondolat/:id`). A koinóban egy létrejött entitást
**csak egyezmény** változtathat meg (D8/D27) — tehát a végpont **őszinte 400-at ad**, és
megmondja, mit tegyen helyette. *(Ugyanaz a minta, mint a szavazat visszavonásánál.)*

### ⛔⛔ AMI NYITVA MARADT: A KÉPEK ÉS FÁJLOK HELYE (D3)

A prototípusban a kép egy **szerver-mappába** került, és a blokk egy **URL-t** tárolt.
A koinóban nincs szerver — és ez nem pótolható egy másik szerverrel sem:

- ⛔ **2. szabály** — semmi ne múljon egyetlen címen vagy szolgáltatáson;
- ⛔ **6. szabály (KEMÉNY)** — egy esemény ma ~400 bájt, egy fénykép ennek több ezerszerese;
- ⏸️ **D3** — a kép a *tartalmi rétegbe* tartozik, aminek a **szállítása még nincs megtervezve**.

⭐ **Ezért a `FeltoltesKezelo` őSZINTÉN ELAKAD, nem csendben:** a szerkesztő minden más
része megy (szöveg, link, entitás-hivatkozás, oldalak, előzmények, méretezés, mozgatás),
és aki képet próbál beszúrni, **megtudja, miért nem megy**.

⭐⭐⭐ **ÉS CSABA MEGADTA AZ IRÁNYT A SZÁLLÍTÁSRA (2026-09-12):**

> *„azt még ki kell találni, mert szükség lesz nagyobb entitások másolására is. szerintem,
> az eseményekből a buli alkalmával, megtudják a készülékek, hogy kinek mire van szüksége,
> és a buli után meg fent kell tartani a kapcsolatot azon eszközöknek, amik nagyobb csomagot
> kell hogy küldjenek egymásnak, addig, ameddig végbe megy a másolás/letöltés."*

⭐ **KÉT LÉPÉS, ÉS EZ A SZÉTVÁLASZTÁS A LÉNYEG:**

1. **A FELDERÍTÉS az eseményekből jön, a buli alatt.** Nem kell új kérdezősködés: az
   események úgyis utaznak, és belőlük kiderül, **kinek mi hiányzik** — ugyanaz az elv,
   mint az `ALLAS`-nál a cserében. *A drága rész (a bájtok) csak azután indul, hogy az
   olcsó rész (a hivatkozások) már megmondta, mire van szükség.*
2. **A SZÁLLÍTÁS a buli UTÁN is él**, de **csak a két érintett készülék között**, és **csak
   amíg a másolás tart**.

⚠️ **ÉS AMIÉRT EZ NEM SÉRTI AZ 5. SZABÁLYT** (*„ne épüljön folyamatos kapcsolatra"*): a
szabály azt tiltja, hogy a koino **működése** kívánjon egyidejű online létet. Itt a
kapcsolat **nem előfeltétel, hanem következmény**: az események már átmentek, a döntések
már számolhatók — ha a másolás megszakad, a koino **teljes értékűen működik tovább**, csak
a kép hiányzik. ⭐ *És a D3 pontosan ezt mondja a tartalmi rétegről: **elveszhet**.*

⭐⭐ **ÉS A RANDEVÚ (Csaba, 2026-09-12):**

> *„a buli alkalmával, mindenki kikűldi a kérelmeit, ami a böngészés közben született, és
> megkapja azokat a kéréseket, amik az ő eszközéről kérnek adatot. A pajzsfuró elve az,
> hogy egyidőben kell hogy keressék egymást, a kérelmező és a tároló eszköz. és egy
> eszköznek tudnia kell, párhuzamossan kűldeni, és fogadni is, több helyről."*

⭐⭐⭐ **A BULI EGY TALÁLKOZÓ-MEGBESZÉLÉS — és ez oldja meg a pajzsfúró nehéz feltételét.**
A `pajzsfuro.js` szerint *„nem elég, ha az egyik fél figyel… mindkét félnek KI KELL SZÓLNIA
a másiknak"* — vagyis az **egyidejűség** a működés feltétele. Eddig ez véletlenen múlt;
a bulival **megbeszélt** lesz: *ott dől el, ki kinek mit küld, és onnan tudja mindkét fél,
hogy a másik is kopogni fog.*

⭐ **ÉS A PÁRHUZAMOSSÁG SEM ÚJ MECHANIZMUS:** a `pajzsfuro.js` azért választott UDP-t, mert
*„egyetlen UDP-foglalat egyszerre tud küldeni és fogadni ugyanazon a porton"*. Amit Csaba
kér — párhuzamosan küldeni és fogadni, több helyről —, arra a választott szállítás **már
képes**; a munka a **nyilvántartás** (melyik átvitel hol tart) és a **korlátozás**.

⚠️ **EGY KÉRDÉS, AMIT TISZTÁZNI KELL: a kérelem ESEMÉNY vagy MÚLÉKONY ÜZENET?**
*Az én olvasatom: múlékony* — mint az `ALLAS` a cserében —, két okból: ⛔ ha esemény lenne,
**a böngészésem felkerülne a láncra**, örökre és mindenki számára láthatóan (*mit néztem meg*
— ez a D6 személyes-adat határa), és ⛔ minden kérés ~400 bájttal növelné a tartós adatot,
holott a kérés **egyszeri és múlandó**. ⏸️ Eldöntendő.

⏸️ **Amit ez még nyitva hagy:** mekkora az egy darabban küldött szelet és hogyan folytatódik
megszakadás után · ki kezdeményezi (a kérő vagy a birtokló) · hány párhuzamos átvitelt
vállal egy készülék · és a **felső mérethatár** (a 6. szabály az eseményre kemény, de egy
videóra is kell egy „eddig és ne tovább").

⏸️ **A javaslat, ha majd eldől:** a koino saját mintája — a fájlt a **lenyomata** nevezi
meg (mint mindent a koinóban), az esemény csak ezt a ~100 bájtos hivatkozást hordozza, a
bájtok pedig a tartalmi rétegben utaznak. Az ellenőrzés ingyen van: újra-lenyomatolni és
összevetni — *a csatornát nem kell megbízhatóvá tenni* (3. szabály).

⚠️ **És egy MÁSODIK nyitott pont ugyanitt:** az **entitás-hivatkozás** blokk keresése a
`GET /api/kereses`-re épül — az a **kereső-réteg** (Szakasz 6), ami szándékosan elhagyható
és még nincs meg.

### ⭐ És egy új próba-fajta, amit ez a munka hozott

**Forrás-próba a bájt-azonosságra.** A feltüntetett érték („az örökölt kód változatlan")
eddig csak ígéret volt; most **mérjük**. ⛔ A helyőrzőket nem listázzuk, hanem
**felismerjük** (a `helyorzoModal.js` importjáról) — így amikor egy helyőrzőt valódira
cserélünk, a fájl **magától** bekerül az ellenőrzés alá. *Épp ez történt a `GondolatModal`-lal.*

⚠️ A próba mellé kellett egy másik, ami azt méri, hogy **nem vak**: ha minden fájlt
kihagyna (nincs `frontend/`, csupa helyőrző, elgépelt útvonal), akár úgy is zöld lenne.

---

## 11. ✅ AZ 5.3 ELKÉSZÜLT (2026-09-06) — a kártyák, változatlanul

**Mérve, valódi böngészőben:** a pakli megjelenik az örökölt zöld stílussal, a kártyák
címmel és a teljes hamburger menüvel, a tudatpont-sor valódi számokkal (👥 1 · 👤🌟 100 ·
🌟 100 · 🌿🌟 100), kinyitáskor megérkezik a szöveg, a menüpontok pedig megnyitják a
helyőrzőt („🚧 Még nem készült el"). **Konzol-hiba nincs.**

### ⭐ Amit NEM kellett átírni — és ez a lényeg

A `koino/felulet/` alá **22 JS + 3 HTML + 14 CSS** fájl került át a prototípusból, és ezek
közül a kártya-osztályok, a hamburger menü, a szövegmegjelenítő, az öt blokk-osztály és
**minden CSS bájtra ugyanaz**. A `frontend/` érintetlen (`git status`: 0 változás).

**Amihez hozzá kellett nyúlni, mindössze három fájl:**

| Fájl | Miért |
|---|---|
| `utils/apiHelper.js` | a JWT token helyett a **kapu jelszava** (D15: nincs bejelentkezés) |
| `utils/authHelper.js` | **kicserélve** — a fájl egész tárgya (bejelentkezés, token) nem létezik a koinóban; ⭐ az **export-nevek** viszont ugyanazok, ezért a `Kartya.js` nem változott |
| `kartya/kartyaGyar.js` | a `KategoriaKartya` és a `GondolatTipusKartya` kimaradt — **a koinóban ez a két entitástípus nem létezik** (a végpont-térkép 2. találata) |

### ⭐⭐ A modal-csapda megoldása: 13 helyőrző

A kártyák 4–7 modált importálnak fejenként (6/b. 2. pont). Megoldás: a `modals/` mappában
**13 apró fájl**, mindegyik a közös `helyorzoModal.js`-t exportálja a saját nevén.

⭐ Ettől a kártyák **import-sorai bájtra ugyanazok**, mint a prototípusban — és amikor egy
valódi modal átjön (5.5), **elég a saját fájlját kicserélni**. A minta a prototípusból való:
a `FejlesztesreVar.js` pontosan ezt csinálja a még el nem készült menüpontoknál.

### ⚠️ Két dolog, ami csak MÉRÉSKÖZBEN derült ki

1. ⛔ **A jelszó határa az `/api/`-ra tolódott.** Eddig minden kérés jelszót kívánt — de a
   `Kartya.js` sima `fetch('./html/…')`-lel tölti a sablonját, a CSS `<link>`-kel jön, és
   **egyik sem küld fejlécet**. A kártyák átírása elveszítette volna a fidelitást, a süti
   pedig **visszahozta volna a CSRF-et** (minden kéréssel automatikusan menne). ⭐ Ezért a
   jelszó oda került, ahol az ADAT van: az `/api/`-ra. A kiszolgált fájlok a koino nyílt
   felülete — nincs bennük titok —, és a kulcsfájlt továbbra is az útvonal-őr védi
   (próbával igazolva, **jelszó nélkül is**).
2. ⚠️ **A tudatpont-sor mezői a kártya LEGFELSŐ szintjén vannak, nem az `adatok`-ban.**
   Elsőre mindent az `adatok`-ba tettem, és a kártya **három nullát mutatott**. A
   `_kozosTudatpontSorFeltoltese` négy nevet olvas: `hozzajarulokSzama`,
   `eemberSajatTudatpontEntitason`, `entitasSajatTudatpont`, `hierarchikusOsszesPont`.
   *A böngésző mondta meg, nem a kód olvasása.*

### Két új végpont, mert a kártya kérte

- `GET /api/pakli/szoveg/:tipus/:id` — a lista szándékosan nem hozza a szövegeket
  (9. szabály), tehát a kártya **kinyitáskor** kéri el, kártyánként.
- `GET /api/tudatpont/entitas/:tipus/:id` — ebből dönti el a kártya, hogy a tudatpont-függő
  menüpontok elérhetők-e. ⚠️ **A válasza `{ data: … }` alakú**, eltérve a többitől: az
  örökölt `Kartya.js` így olvassa. *A hívó a régi; a válasz alkalmazkodik hozzá.*

### ⚠️ És a méret

A `koino/` **46 fájl / 915 KB → 102 fájl / 1331 KB** lett; ebből a `felulet/` **57 fájl,
408 KB**. ⭐ A **6. szabály** 2026-09-06 óta a program méretét **lágy** preferenciának
tekinti (a kemény korlát az adat-csomagon van), tehát ez rendben van — de érdemes tudni,
hogy a növekmény **majdnem teljes egészében örökölt, változatlan kód**.

---

## 12. ✅ AZ 5.4 ELKÉSZÜLT (2026-09-06) — a kategória és a gondolattípus

A végpont-térkép 2. találata volt: *„a koinóban ez a két entitástípus nem létezik"* — tíz
prototípus-végpont mögött nem volt esemény, pedig a domain-fogalom mindig megvolt
(*a kategóriák és a gondolattípusok rendszerezik a gondolatokat*).

**Mérve, végponttól végpontig:** a parancssorból létrehozott 🌲 Természet kategória és
❓ Kérdés gondolattípus saját kártyaként jelenik meg, a hozzájuk sorolt gondolat kártyáján
pedig **feloldva** látszik a két ikon — nem azonosítóként.

### ⭐ Miért NEM új esemény-fajta

A `GondolatLetrehozas` az **általános entitás-létrehozás**, és az `adat.tipus` különbözteti
meg a fajtákat — ez a szerkezet a Szakasz 1 óta így van (`allapotSzamitas.js`:
`adat.tipus ?? 'Gondolat'`). Új esemény-név bevezetése **minden meglévő tárat
érvénytelenítene**, cserébe semmit nem adna. *Az esemény neve történeti; a típust az adat
mondja meg.*

### ⭐ Miért ÖNÁLLÓ ENTITÁS, és miért `cim` a neve

**Önálló entitás**, mert így ugyanaz jár neki, mint bármely másnak: tudatpont, javaslat,
küszöbök, egyezmény. ⭐ *Egy kategória neve is közösségi döntéssel változik — nem egy mező
átírásával.* (És mivel az egyezmény-végrehajtás az 5.3 előtt elkészült, ez már működik is.)

A név a **`cim` mezőbe** kerül, nem egy külön `nev`-be: a koinóban minden entitásnak `cim`-e
van, így az állapot-számítás, a rendezés és az egyezmény-végrehajtás **változtatás nélkül**
működik rajtuk. A prototípus kártyái `nev`-et olvasnak — azt a felület fordítja
(`felulet/js/kartyaAdat.js`). *Nincs párhuzamos mező, amit külön kellene karbantartani.*

### ⛔⛔ A max-3 korlát a SZÁMÍTÁSBAN van, nem a felületen

A prototípus Mongoose-validátorral tartotta (*„Maximum 3 különböző kategória"*). A P2P
koinóban **nincs szerver, ami visszautasítsa** — ezért a korlát a `szabalyok.js`-be került
(`KATEGORIA_KORLAT`), a duplikátum-szűréssel együtt. *Amit a számítás nem ellenőriz, az nem
szabály, csak illemtan.*

⭐ Mérve: a szabály kikapcsolásával a hozzá tartozó próba bukik — mindhárom mechanizmusnál
(korlát · ismétlés-szűrés · feloldás).

### Ami ebből következett

- **A `kartyaGyar.js` visszaállt a prototípus alakjára** — az 5.3-ban ideiglenesen kihagyott
  két kártya visszakerült. *A jóslat bevált: tényleg két sor volt.*
- **Az ikon lehet emoji.** Az örökölt kártya URL-nél képet rak ki, egyébként szöveget —
  tehát nem kell hozzá feltöltés, ami a P2P-ben amúgy sincs megoldva (D3).
- ⏸️ **Egy új nyitott pont** (a 7. lista 8. tétele): *„hány gondolat használja ezt a
  kategóriát?"* — visszafelé mutató kérdés, amihez mutató kellene. Ma `null`, vagyis a hiány
  **látszik**, nem találunk ki számot.

---

## 13. 🚧 AZ 5.5 ELSŐ FELE (2026-09-06) — az ÍRÁS, és a tudatpont-csoport modáljai

⭐⭐ **Ez a szakasz legnagyobb határátlépése: eddig MINDEN végpont olvasás volt.** Az 5.5-től
a lap **eseményt írat a kulcsommal** — vagyis a tét már nem az adat kiszivárgása, hanem hogy
valaki a **nevemben cselekedjen**.

### ⛔⛔ A harmadik őr: csak `application/json` testet fogadunk

A jelszó és az Origin mellé az írás kapott egy harmadik őrt, és ez a legkevésbé nyilvánvaló:

> Egy idegen lap `<form>`-mal vagy egyszerű `fetch`-csel küldhetne POST-ot **előellenőrzés
> (preflight) nélkül** — olyankor a böngésző nem kérdez rá előre, csak elküldi. A JSON
> tartalomtípus viszont **kötelezővé teszi** az előellenőrzést, amit a kapunk (CORS-fejlécek
> híján) nem enged át. ⭐ Így **a böngésző maga állítja meg** az idegen írást, még mielőtt
> ideérne.

Mellé egy **test-korlát** (256 KB): enélkül egy elszabadult lap végtelen testtel megtöltené a
memóriát. ⚠️ A korlátot **menet közben** nézzük, nem a végén — a végén már késő volna.

⭐ Mindkettő mérve: a kikapcsolásuk a hozzájuk tartozó próbát buktatja.

### Az írás alakja

**Minden írás EGY MŰVELET** a `js/muveletek.js`-ből, ami **egy aláírt eseményt** hoz létre.
Nincs „mentés az adatbázisba", és a felület nem kerülhet meg semmit: az esemény ugyanazon az
`esemenyMentese` kapun megy be, mint a hálózatról érkező (3. szabály).

⭐ **A szabályokat a SZÁMÍTÁS őrzi.** Ha a lap szabálysértőt küld, az esemény létrejön, de nem
fog számítani. *A felület nem véd, és nem is kell neki.*

| Végpont | Művelet |
|---|---|
| `POST /api/tudatpont/hozzarendeles` | `tudatpontRendezese` (a D42 bemondott összegével) |
| `PUT /api/tudatpont/szerep/:tipus/:id` | ugyanaz, más szereppel — a pontokhoz nem nyúl |
| `POST /api/ertekJavaslat` | `ertekJavaslat` |

### Négy modal jött át, változatlanul

`TudatpontModal` · `ReszveteliBeallitasokModal` · `ReszletekModal` · `ErtekJavaslatModal`
(+ a segédeik: `SzerepValasztoModal`, `HozzajarulokModal`, `ErtekEloszlasModal`,
`kuszobErtekMezok`) — 8 JS, 5 HTML-sablon, 7 CSS, **mind bájtra ugyanaz**. A helyükön álló
helyőrzőket egyszerűen felülírták. *Ez volt a 13 helyőrző ígérete, és beváltotta.*

**Négy új olvasó végpont, mert a modálok kérték:**
`…/:id/reszletek` · `ertekJavaslat/reszletek/…` · `tudatpont/hianyzo-felmenok/…` (⭐ *„hány
felmenőre kell még pont?"* — segítség, nem szabály: a koino nem tiltja, hogy csak a gyerekre
tegyél pontot) · és a már meglévő `tudatpont/entitas/…`.

⚠️ **A küszöb-nevek eltérnek**, és a fordítás egy helyen van (`pakli.js`,
`KUSZOB_KIFELE`): a koino `elfogadasiKuszob`-ot mond, a prototípus modálja
`javaslatElfogadasiKuszob`-ot olvas. *A koino nem veszi át az idegen neveket; a válasz
alkalmazkodik.*

### Mérve, valódi böngészőben és HTTP-n

A `TudatpontModal` megnyílik a kártya menüjéből, betölti a jelenlegi pontot, és a mentés
**valódi aláírt eseményt** ír a tárba. Végigmérve HTTP-n: a tudatpont 100 → 700 (és a pakli
azonnal ezt mutatja), a szerep passzívra vált, a küszöbök 51/0/86400/604800 → 66/10/3600/7200.
⭐ **A parancssor ugyanazt látja** — és a tárban `TudatpontRendezes` + `ErtekJavaslat`
események állnak, aláírással.

---

## 14. ✅ A SZAVAZÁS (2026-09-06) — a kör bezárul a felületen

**Mérve, kattintással:** a szavazás-fülön a „Támogatom" gombra kattintva **aláírt esemény**
születik, és az állapot azonnal átfordul (1000‰ ellenzés → 1000‰ támogatás). A tárban három
`Szavazat` esemény áll egymás után: `Tamogat` → `Ellenez` → `Tamogat` — *az utolsó nyer.*

⭐ **Ezzel a koino fő köre a lapon is teljes:** javaslat → **szavazás** → egyezmény →
az egyezmény rávezetése az entitásra.

### A javaslat mint KÁRTYA

A javaslatok eddig nem szerepeltek a pakliban (csak az entitások). Most igen — ahogy a
prototípus paklija is együtt mutatja őket.

⚠️ **A rendezési értékük az ÉRINTETT entitásé.** A javaslatnak magának nincs tudatpontja
(nem is lehet: nem entitás, hanem döntés). Ha nullát adnánk, minden javaslat a lista végére
süllyedne, **elszakadva attól a gondolattól, amiről szól**. ⭐ Így viszont a gondolata mellé
kerül — próbával igazolva, hogy **szomszédosak**.

### ⛔ A szavazat visszavonása: őszinte nem

A `SzavazasFul`-on ott a „Szavazat visszavonása" gomb — a koinóban viszont **nincs ilyen
művelet** (5.4 döntés). ⚠️ Nem némán nyeljük el: a végpont **400-at ad, indoklással** —
*„a szavazat nem vonható vissza, csak megváltoztatható; ha nem akarsz állást foglalni,
szavazz Tartózkodom-ra."*

🔍 **Ez most vált láthatóvá**, ezért érdemes Csabának újra megnéznie: a döntés ára az, hogy
egy véletlen szavazat véglegesen beleszámít a **részvételi arányba** (megváltoztatni lehet,
kivenni nem).

### ⚠️ Két dolog, amit megint csak a böngésző mondott meg

1. ⛔ **Az én 5.3-as lap-kódom hibája:** a body-t a `bodyFrissitese()` tölti fel, de én csak
   akkor hívtam, **ha volt szöveg elkérve**. A gondolat-kártyáknál ez működött — a
   javaslat-kártyának viszont nincs szövege, így **a body üresen maradt**, és vele a fülsáv
   meg a szavazás-fül is. *A szöveg csak EGY dolog a body-ban; a feltöltést nem szabad hozzá
   kötni.*
2. ⚠️ **A státusz szavai eltérnek**, és ez nem kozmetika: a `JavaslatKartya` a
   **szavazás-fület kifejezetten az `'Aktiv'` státuszhoz köti**, a koino viszont
   `'folyamatban'`-t mond — fordítás nélkül **a szavazás soha nem jelent volna meg**. A
   leképezés az adapterben van (`STATUSZ_KIFELE`).

---

## 15. ⭐⭐ A JAVASLAT IS ENTITÁS (Csaba, 2026-09-06) — és ez javított egy hibás modellt

> *„Kell neki tudatpont, akárcsak a többi entitásnak. Az egyezmény is entitás. És még annyi,
> hogy hívjuk szerkesztési javaslatnak, és szerkesztési egyezménynek."* — Csaba

⚠️ **A 14. szakaszban azt írtam, hogy „a javaslatnak nincs tudatpontja (nem is lehet: nem
entitás, hanem döntés)". Ez tévedés volt** — és a **D27/5** ki is mondja az ellenkezőjét:
*„nem kell külön egyezmény-kezelés: **egy entitás a többi között** — tudatpontot lehet rá
tenni, küszöbei vannak, gyerekei lehetnek."*

### KÉT RÉTEG, EGY AZONOSÍTÓ

A javaslat mostantól **egyszerre** kettő, ugyanazon az azonosítón:

| Réteg | Ki számolja | Mit ad |
|---|---|---|
| **entitás** | `allapotSzamitas.js` | tudatpont, küszöbök, szülő, gyerekek, cím |
| **döntés** | `javaslatSzamitas.js` | szavazatok, státusz, egyezmény |

⭐⭐ **És a szülője az ÉRINTETT entitás** — ez a **D27/1** („az általános javaslat
gondolatból ágazik ki") szerkezeti megvalósítása. Három dolgot old meg egyszerre:

1. **Megszüntetett egy kényszer-megoldást.** Előtte a javaslat rendezési értékét *kézzel*
   kölcsönöztük az érintettétől, hogy ne süllyedjen a lista végére. Most nem kell: a
   hierarchikus rendezés amúgy is a szülő után teszi. ⭐ *A jó szerkezet elvette a szabály
   dolgát.*
2. Az **ágazati tudatpont** helyesen folyik felfelé.
3. A **D27/4** hatóköre („a hely határozza meg, lefelé terjed") ugyanezen a fán mérhető —
   amikor az általános rendszer megépül.

### ⚠️ ÉS EGY KÖVETKEZMÉNY, AMIT A PRÓBA FORDÍTOTT MEG

Amíg a javaslat nem volt entitás, az érintettjével **együtt tűnt el**. Mióta saját
tudatpontja van, a **D14 rá is külön vonatkozik**: attól létezik, hogy valaki áll mögötte —
nem attól, hogy a tárgya még megvan.

⭐ Ez következetes: a `szulo`-ja ilyenkor egy elfelejtett entitásra mutat, tehát a
fa-bejárások átugorják (gyökér-szintű kártya lesz), az egyezmény-végrehajtás pedig már eddig
is tudta kezelni — *„az érintett entitás nem létezik"*, kihagyva, indoklással (D19).

⚠️ **A parancssor is változott:** a `javaslat` parancs mostantól **tudatpontot is rendel**
a javaslathoz — enélkül a D14 szerint meg sem születne. Ugyanaz a lépés, mint a gondolatnál.

### Az elnevezés

A felületen és a parancssorban mostantól **SZERKESZTÉSI JAVASLATOK** és **SZERKESZTÉSI
EGYEZMÉNYEK** áll (D27). A `fajta` mező (`'szerkesztesi' | 'altalanos'`) már eddig is ott
volt a `muveletek.js`-ben — a név most követte.

---

## 16. ⏸️ AZ ÁLTALÁNOS JAVASLAT ÉS EGYEZMÉNY — a D27 feljegyzései, és mi hiányzik

*Csaba kérésére megkeresve: a teljes leírás a
[`fejlesztesi_terv_fazis2.md`](fejlesztesi_terv_fazis2.md) **D27** szakaszában áll
(2026-08-27). Itt csak az összefoglaló és a hiánylista.*

**A szavazás gépezete mindkét fajtánál UGYANAZ** — küszöbök, medián, részvételi arány,
bizonyossági mutató, döntési idő. **Csak a következménye más:**

| | Szerkesztési | Általános |
|---|---|---|
| Miről szól | egy entitás megváltoztatása | a közösség **álláspontja** |
| Elfogadáskor | a rendszer **végrehajtja** | **semmi automatikus** — az egyezmény maga az álláspont |
| Az egyezmény élete | egyszeri: eldőlt, kész | ⭐ **ÉLŐ**: csatlakozni, tiltakozni, ütközést jelölni lehet |

### Mi van már meg belőle

- ✅ a `fajta` mező (`'szerkesztesi' \| 'altalanos'`) a `muveletek.js`-ben és a döntés-rétegben;
- ✅ az egyezmény-végrehajtás **kizárja** az általánost (*„az általánosból nem következik
  entitás-változás"*) — próbával igazolva;
- ✅ **a javaslat entitás** (15. szakasz) — a D27/5 alapja;
- ✅ a **hierarchikus tudatpont**, amit a D27/4 hatókörré emel.

### ⛔ Mi hiányzik

1. **Az élő egyezmény három művelete:** `Csatlakozas`, `Tiltakozas`, `UtkozesJeloles`.
   ⭐ *A TÉNY örök, a HATÁLY él: hányan állnak mögötte MOST.*
2. **A csatlakozó mint aktív résztvevő** — a D27/3 szerint számít a részvételi arányban, és
   ezért ő szavaz a későbbi módosításokról is. *(Ez old meg egy feszültséget: nem kell se
   nullázni a csatlakozásokat, se változatokhoz kötni őket.)*
3. **A hatókör a HELYBŐL** (D27/4): aki az entitásra **vagy annak bármely leszármazottjára**
   tett pontot. A gyökérben ez „mindenki". ⚠️ *A hierarchikus tudatpont eddig a fontosság
   mutatója volt — itt jogosultsággá válik.*
4. **Az egyezmény mint önálló entitás.** ⚠️⚠️ **És itt van egy VALÓDI FESZÜLTSÉG, amit el
   kell dönteni:** a **D17** szerint az egyezmény **számítás, nem esemény** — de egy
   entitásnak azonosító kell, amire tudatpontot lehet tenni. Két út:
   - **(a)** az egyezmény azonosítója **származtatott** (a javaslatéból) — a számítás marad,
     de lesz stabil neve, amire lehet pontot tenni;
   - **(b)** az elfogadáskor **születik egy esemény** — ez viszont felülírná a D17-et, és
     kellene valaki, aki „kimondja".
   ⭐ *Az (a) őrzi meg a D17-et; ezt javaslom, de ez Csaba döntése.*
5. **A négy szerkesztési művelet az egyezményre** (módosítás, áthelyezés, egyesítés,
   törlés) — ehhez a `Torles` és az `Egyesites` végrehajtója is kell (ma nincs).

⏸️ **A D27 maga is nyitva hagyott kettőt:** az egyesítéskor összeadódnak-e a csatlakozók, és
`fajta` mező vagy külön esemény-típusok legyenek-e. ⭐ *A második eldőlt: a `fajta` mező —
a közös mechanika mellette szól, és a kód is így épült.*

---

### ⏸️ Ami az 5.5-ből még hátra van

- **`JavaslatModal`** (66 KB) — ⚠️ **importálja a `SzovegSzerkeszto`-t**, tehát ugyanaz a
  függés, mint a létrehozó modáloknál: **az 5.7 után jön**. *(A szavazás nem várt rá.)*
- **`GondolatModal`** / **`KategoriaModal`** / **`GondolatTipusModal`** — létrehozás és
  szerkesztés; ⚠️ **a szövegszerkesztőn múlnak (5.7)**;
- **`ErtesitesekModal`**, **`ErtesitesiBeallitasModal`** — ⛔ nincs mögöttük réteg;
- **`KeresesModal`** (Szakasz 6), **`StrukturaModal`**, **`SikidomModal`** (felfüggesztve),
  **`RendezesModal`** (a lapon már van rendezés-választó).

---

## 9. ✅ AZ 5.1 ELKÉSZÜLT (2026-09-06) — a helyi kapu

`js/felulet/kapu.js` + `node koino/koino.js felulet [port]` + `felulet/index.html` (műszer-lap)
+ `meres/kapuProba.js` (**23 önpróba**). Mérve, futó kiszolgálón és valódi böngészőben: a lap
megkérdezi a programot, és megkapja a helyi kulcs azonosságát.

**Öt őr**, mert a kulcsod a gépen van: **csak a hurok-címre kötünk** · **jelszó** (indításkor
generált, sehol nem tárolt) · **Origin** · **Host** (DNS-visszakötés ellen) · **útvonal-őr**
(a `koino-adat/kulcs.json` nem kérhető el).

⭐ **És egy szabály ellenőrizhetővé vált:** a `kapuProba.js` utolsó próbája a **forrást
olvassa**, és állítja, hogy a `js/` alatt — a `js/felulet/` kivételével — **semmi nem
importál a felületből**. Ez a `felulet_terv.md` 3. pontjának 1. szabálya, mostantól mérve.

> ### ⚠️⚠️ A TANULSÁG, AMI TÖBBET ÉR A KÓDNÁL: a VAK PRÓBA
>
> Az útvonal-őrhöz elsőre három rontás-próba készült (`/../kulcs.json`, `/%2e%2e/…`,
> `/a/b/../../../…`). Mind a három **átment** — ⛔ **és akkor is átment, amikor az őrt
> KIKAPCSOLTUK.** Nem bizonyítottak semmit.
>
> ⭐ **Az ok, mérve:** a WHATWG URL-elemző a `..` szegmenst és a százalék-kódolt alakjait
> (`%2e%2e`, `.%2e`) **maga normalizálja**, mielőtt a kódunk látná — mind a három
> `/kulcs.json`-ra egyszerűsödött, ami a mappán BELÜL van, és csak azért lett 404, mert ott
> nincs ilyen fájl. *A próba a mappa tartalmát mérte, nem az őrt.*
>
> ⭐⭐ **Ami viszont átjut az elemzőn: a kódolt PER JEL.** A `%2f` az `URL.pathname`-ben
> kódolva marad, a `decodeURIComponent` viszont `/`-t csinál belőle — így lesz a
> `/%2e%2e%2fkulcs.json`-ból `../kulcs.json`. **Ez az igazi vektor, és most ezt méri a próba:**
> az őr kikapcsolásával **négy próba bukik**.
>
> 🔍 **A módszer, ami ezt kihozta — érdemes megjegyezni:** nem a próbát néztük, hanem
> **kikapcsoltuk azt, amit mérni akart**, és megnéztük, bukik-e valami. Amelyik őrnél nem
> bukott semmi, ott **a próba volt a hibás**. *Ugyanaz a szemlélet, mint a mérésekben: ne
> érvelj, mérj — és a mérőeszközt is mérd meg.*

---

## 10. ✅ AZ 5.2 ELKÉSZÜLT (2026-09-06) — a kérdezhető pakli

`js/allapot/pakli.js` + `GET /api/pakli` a kapun + `meres/pakliProba.js` (**23 önpróba**).
Végigmérve HTTP-n is: 7 kártya, 3 oldal, ismétlés és kihagyás nélkül.

⭐ **Miért az állapot-rétegben van, és nem a felületben?** Mert ez **kérdés az állapotról**,
nem rajzolás — így bármelyik kliens (terminál, natív, későbbi lap) ugyanezt használja. A
felület csak *átadja* a paramétereket.

**Az illesztés:**

```
GET /api/pakli?rendezes=<hierarchikus|ido|sajatPont|agazatiPont>
              &irany=<csokkeno|novekvo>&kurzor=<átlátszatlan>&darab=<max 100>
```

- ⛔ **`darab` felülről korlátos** (`MAX_DARAB = 100`) — enélkül a hívó `darab=999999999`-cel
  visszakérhetné az egész paklit, és az illesztés máris azt jelentené: „add ide mindet".
- ⛔ **A szövegek nincsenek a listában** — húsz kártya húsz gondolat-szövege az a
  válasz-méret, ami a **6. szabály KEMÉNY felébe** ütközne (az adat utazik, a program nem).
- ⭐ **Kulcs-alapú kurzor, nem sorszám** — egy későbbi, indexelt megvalósítás **oda tud
  ugrani**, míg egy `skip=1000000` mindig végigolvasná az elejét. *Az illesztés így marad
  milliárdos akkor is, hogy a megvalósítás ma egyszerűen rendez és szeletel.*

### ⭐⭐ A HORGONY — amiért a lapozás nem csúszik el

A tudatpont **bármikor átrendezhető**, tehát a rendezés kulcsa két lekérés között
megváltozhat: egy kártya átugrik a lapok határán, és **kimarad vagy kétszer jön**.

⭐ A koinóban van rá szép válasz: **a tár hozzáfűzhető, tehát az első N esemény halmaza soha
nem változik.** A lapozás ezért egy horgonyhoz kötődik — *„az állapot, ahogy az első N
eseményből látszott"* —, és a további oldalak ugyanabból a képből jönnek. **Nem az időt
fagyasztjuk be, hanem a bemenetet.**

⚠️ A horgony **helyi feljegyzés, nem esemény** (3. szabály): nem terjed, semmit nem dönt el,
két készüléken mást jelent — ugyanaz a fajta, mint a `tarsak.js` `utoljara` mezője. És ami
közben érkezett, azt **megmondjuk** (`ujdonsag`), nem keverjük némán a sorok közé.

### ⚠️ ÉS ISMÉT KÉT VAK PRÓBA — ugyanazzal a módszerrel elkapva

A 22 próba elsőre mind átment. Aztán sorra kikapcsoltuk a mechanizmusokat:

1. ⛔ **A horgony kikapcsolása NULLA próbát buktatott.** Az ok: a **gyorsítótár elfedte** —
   a lapozás végig ugyanazt a nézetet kapta, tehát a képet az tartotta együtt, a horgony meg
   sem szólalt. ⭐ Élesben viszont minden oldal külön HTTP-kérés, és a nézet bármikor
   kieshet. **Új próba:** friss nézettel lapoz, gyorsítótár nélkül — így a stabilitást csakis
   a horgony adhatja. *Most a horgony kikapcsolása bukik.*
2. ⛔ **A `MAX_DARAB` kikapcsolása is nullát.** A próba **12 entitáson** kért egymilliót — és
   12 ≤ 100, tehát a korlát nélkül is átment. ⭐ Egy felső korlátot csak úgy lehet mérni, ha
   **több elem van, mint a korlát**: most 120 a 100-hoz. *Most ez is bukik, ha kivesszük.*

🔍 **A tanulság kétszer jött elő ugyanabban a szakaszban** (5.1: útvonal-őr · 5.2: horgony és
darab-korlát), ezért érdemes szabállyá tenni: **egy zöld próba önmagában nem bizonyíték.
Kapcsold ki, amit mérni akar — ha nem bukik, a próba a hibás.**
