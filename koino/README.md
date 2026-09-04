# koino — a P2P program

*Ez a mappa a **Fázis 2** koinója: a készüléken futó, aláírt eseményekre épülő,
központi szerver nélküli program.*

## Mi ez, és mi nem

- **Ez:** az új koino, ami a **D22** döntés szerint az első kiadástól P2P
  („a központi server részét most nem kell fejleszteni"), és a **D29** szerint **önálló
  program** — nem böngészőben fut.
- **Nem ez:** a `../backend` + `../frontend`. Az a **prototípus**, ami tanított — ma is fut
  (koino.hu), és **változatlanul marad**. Nem alakítjuk át, nem költöztetjük: az éles
  rendszer a repó gyökeréből épül, és működnie kell.

## ⭐ Miért nem böngésző? (D29, 2026-08-28)

> „Tulajdonképpen hagyjuk is el a böngészős részt, mert csak bezavar. A tiszta P2P
> kapcsolatra koncentráljunk." — Csaba

A böngésző korlátai nem a koino korlátai. Egy lap **nem tud portot nyitni**, nem fogad
kapcsolatot, **elrejti a saját címeit**, csak „biztonságos környezetben" enged
kriptográfiát, és bezáráskor eltűnik. Az egész infrastruktúra, amit a P2P-hez emlegetni
szoktak — jelzőpont, STUN, továbbító —, jórészt **ebből** következik, nem magából a
P2P-ből.

Ezért a koino önálló program. A böngésző később lehet **egy kliens**, de nem ő szabja meg,
mire képes a koino.

## Futtatás

Nincs telepítendő függőség — csak Node (a kriptográfia a beépített WebCryptóból jön).

```bash
node koino/koino.js
```

| Parancs | Mit csinál |
|---|---|
| `node koino/koino.js` | mi az állapot (tartalmak, javaslatok, egyezmények) |
| `node koino/koino.js allapot 3` | **mi lesz 3 nap múlva** — a döntési idő napokban mérhető |
| `node koino/koino.js kulcs` | ki vagyok, hol a kulcsom és az adatom |
| `node koino/koino.js mentes kulcs.json` | a kulcs kimentése (ez te vagy — mentsd el) |
| `node koino/koino.js koino "Név"` | koino létrehozása |
| `node koino/koino.js tartalom "Cím" "szöveg"` | új tartalom (+100 tudatpont, enélkül nem létezne) |
| `node koino/koino.js pont <azonosító> <pont> [passziv]` | tudatpont-rendezés |
| `node koino/koino.js javaslat <azonosító> "Új cím"` | szerkesztési javaslat |
| `node koino/koino.js szavaz <javaslat> tamogat\|ellenez\|tartozkodik` | szavazat |

**A Szakasz 2 parancsai** — a csere két készülék között:

| Parancs | Mit csinál |
|---|---|
| `node koino/koino.js ujjlenyomat` | **„ugyanazt látjuk-e?"** — az állapot 43 karakteres lenyomata |
| `node koino/koino.js orjarat [perc] [port]` | ⭐⭐ **a készülék magától dolgozik**: kaput tart nyitva ÉS időnként kiszól minden társnak. Ez a valódi üzemmód |
| `node koino/koino.js figyel [port]` | ⭐ **postaláda** (D34): átveszi mások eseményeit, eltárolja, és a következő beszélgetésnél továbbadja |
| `node koino/koino.js felfedez [mp] [port]` | ⭐ **ki van még ezen a wifin?** — cím beírása nélkül megtalálja a helyi készülékeket, és felveszi őket társnak |
| `node koino/koino.js kulsoport [port]` | **hogy látszik kívülről a portom?** — a NAT átírja, ezt kell megmérni a fúrás előtt |
| `node koino/koino.js pajzsfuro <cím> <port>` | ⭐⭐ **pajzsfúrás**: mindkét fél kifelé kopog, a két rés a közepén találkozik — és ha átjut, **azonnal cserél is** |
| `node koino/koino.js csere <hoszt> <port>` | kapcsolódás egy megadott készülékhez |
| `node koino/koino.js csere` | ⭐ csere **minden társsal** — egy elérhetetlen társ nem dönti el a kört |
| `node koino/koino.js hozd <azonosító> [cím] [port]` | ⭐ **böngésző-lekérés** (3.4): „add ide EZT az egy entitást" — a rendes csere mindent hoz, ez **válogat**. A szelet-címjegyzékből, aztán a társ-listából keres |
| `node koino/koino.js tarsak` | kik a társaim, és melyikkel mikor sikerült |
| `node koino/koino.js tars <hoszt> [port] [név]` | társ felvétele (levétel: `tars torol <hoszt> [port]`) |
| `node koino/koino.js tukor <hoszt> [port]` | ⭐ **kívülről hogy látszom?** — a másik visszamondja, milyen címről/portról lát (STUN helyett) |
| `node koino/koino.js cimek` | milyen címeken érhető el ez a készülék |
| `node koino/koino.js kapu [port]` | megkéri a routert, hogy engedje be a kapcsolatot (NAT-PMP / PCP / UPnP) |

Az azonosítókból elég a **rövidítés** (mint a gitben). Az adat helye alapból a
`koino-adat/` mappa; máshová a `KOINO_ADAT` környezeti változóval tehető. A részletes
napló `KOINO_NAPLO=1`-gyel kapcsolható be.

⚠️ **A parancssori arc fejlesztői eszköz**, nem a koino felülete — ugyanúgy, ahogy a
korábbi böngészős nézet is az volt. A valódi felület a prototípus pakli-nézetéből
öröklődik (D22), amikor a modell megállapodott: [`../docs/felulet_terv.md`](../docs/felulet_terv.md).

## Önpróbák

```bash
node koino/meres/mind.js
```

Kilenc próba-fájl, **217 önpróba**; a kilépési kód 1, ha bármi bukott. Egy réteg külön is
futtatható: `node koino/meres/mind.js szabaly`. ⚠️ A szűrő részszóra illeszkedik — a `tar`
a `tarsak` réteget is elindítja.

⚠️ *Ha új próba kerül be, ezt a számot itt is vezesd át* — a 6. szabály mércéje attól
ellenőrizhető, hogy friss. *(Ugyanez a mappa mérete: ma **35 fájl, 576 KB**, nulla
npm-csomag.)*

| Fájl | Mit bizonyít |
|---|---|
| `meres/kanonikusProba.js` | ugyanaz az adat mindig ugyanazt a lenyomatot adja (+ regressziós horgony) |
| `meres/esemenyProba.js` | az esemény hamisíthatatlan, a kettős cselekvés leleplezhető |
| `meres/tarProba.js` | az események megmaradnak, ellenőrizetlen nem kerül a tárba |
| `meres/allapotProba.js` | a sorrend nem számít — ugyanaz a halmaz, ugyanaz az állapot |
| `meres/javaslatProba.js` | a döntés kiszámítható, és **a lezárt döntés nem fordul vissza** |
| `meres/szabalyProba.js` | a szabályokat a **számítás** őrzi, nem a felület |
| `meres/csereProba.js` | a csere teljes: a hézag és a rejtett elágazás is kiderül, és a hálózat **nem kap engedékenyebb kaput** |
| `meres/tarsakProba.js` | ⭐ **egy társ bukása nem dönti el a kört** — a csere nem múlik egyetlen címen |
| `meres/vizsgaProba.js` | ⭐ **a Szakasz 2 vizsgája**: kevert események, csere, **azonos állapot** — és a **postaláda** (D34) |

⚠️ **Két mérőeszköz NEM önpróba** — nem igen/nem-et adnak, hanem számokat, ezért a
`mind.js` nem futtatja őket:

- `node koino/meres/skalaMeres.js` — **skála-mérés**: hol van a fal (a 3.2 két
  falledőlését is ez mérte: mentés 495 ms → 1,4 ms, állapotszámítás 4 615 ms → 502 ms);
- `node koino/meres/ebredesProba.js` — **ébredés-próba** telefonon: bír-e a készülék
  ötperces ablakot (mérve: egy óra alvás után is **nulla csúszás**);
- `node koino/meres/szigetMeres.js` — ⭐ **a hamis sziget mérése** (Szakasz 4): egy
  becsületes hálót és egy támadót szimulál, és megmondja, **hány hamis azonosság jut be**
  szabályonként — **és hogy közben nő-e egyáltalán a közösség**. `GORBE=1`-gyel
  körönkénti kimutatást ad.

Az eredmények: [`meres/eredmenyek.md`](meres/eredmenyek.md).

## A rétegek

| Fájl | Felelősség |
|---|---|
| `js/esemeny/kanonikusAlak.js` | ⚠️ a legveszélyesebb részlet: ugyanaz az adat = ugyanazok a bájtok |
| `js/esemeny/esemeny.js` | aláírás és ellenőrzés; az esemény neve a tartalma lenyomata |
| `js/tar/fajlTar.js` | a tár: **hozzáfűzhető** fájl, soronként egy esemény — ⭐ 3.2 óta **kérdezhető** (`esemeny`, `szerzoLanca`, `szeletEsemenyei`, `sorszamSzerint`), nem csak `betolt()` |
| `js/tar/esemenyTar.js` | a lánc kezelése — ellenőrizetlen esemény nem kerül be |
| `js/kulcs/kulcsTar.js` | a kulcs = a személyazonosság (D15) |
| `js/allapot/szabalyok.js` | mely események **számítanak** (keret, jogosultság) |
| `js/allapot/allapotSzamitas.js` | események → entitások |
| `js/allapot/javaslatSzamitas.js` | a döntéshozatal; **az egyezmény mint számítás** |
| `js/allapot/osszehasonlitas.js` | **„ugyanazt látjuk-e?"** — az állapot ujjlenyomata, és hol tér el |
| `js/csere/csere.js` | a csere-protokoll **logikája, hálózat nélkül** (`ALLAS` → `KEREK` → `ESEMENY`) |
| `js/csere/vonal.js` | a **szállítás**: soronként egy JSON-üzenet TCP-n. Semmit nem tud a koinóról |
| `js/csere/kapunyitas.js` | megkérjük a routert, hogy engedje be a kapcsolatot — ⚠️ **segédeszköz, nem előfeltétel** |
| `js/csere/tarsak.js` | **a társ-lista** (D33): kikkel próbáljunk cserélni, és milyen sorrendben — ⭐ 3.4 óta a **szelet-címjegyzék** is („kinél van EZ az entitás?"): név nélkül, elévüléssel |
| `js/csere/pajzsfuro.js` | **pajzsfúrás** (E. lépés): mindkét fél kifelé kopog, hogy a két router rése egymásra illeszkedjen |
| `js/csere/udpVonal.js` | ugyanaz a csere **az átfúrt UDP-résen** — sorszám, nyugta, újraküldés, kiürítés és tétlenségi óra |
| `js/csere/helyiFelfedezes.js` | **helyi felfedezés** (F. lépés): aki keres, kiált; aki dolgozik, felel — cím beírása nélkül |
| `js/muveletek.js` | a hat művelet |
| `koino.js` | a parancssori arc |

⚠️ **Az 1. szabály itt látszik:** a `csere.js` **soha nem importál hálózati kódot** — a
logika és a szállítás külön él, ezért cserélhető ki a vonal bármi másra (fájl, pendrive,
rádió) anélkül, hogy a csere-protokollhoz hozzá kellene nyúlni.

## Hol tartunk (2026-09-03)

> ⭐ **A sorrend külön dokumentumban él:** [`../docs/utiterv.md`](../docs/utiterv.md) —
> *mit építünk, milyen sorrendben, és miért*. Ez itt csak a rövid leltár.

**Szakasz 1 — A HELYI MODELL** *(egy készülék, hálózat nélkül)*: ✅ **kész**. A teljes kör
végigjátszható: koino → tartalom → tudatpont → javaslat → szavazat → **egyezmény**.

**Szakasz 2 — A SZÁLLÍTÁS** *(hogy két készülék egyáltalán összeérjen)*: ✅ **kész**
— terv: [`../docs/szakasz2_terv.md`](../docs/szakasz2_terv.md).

| Lépés | Állapot |
|---|---|
| **1a** a csere logikája, hálózat nélkül | ✅ kész |
| **1b** a vonal (TCP) | ✅ kész |
| **2** a vizsga: két készülék → azonos állapot | ✅ kész |
| **A** több társ: a `csere` társ-listára menjen, ne egy címre | ✅ kész — és két halott címmel is átment a valódi csere |
| **B** olcsó csere: ujjlenyomat előbb, részletes `ALLAS` csak eltérésnél (D35) | ✅ kész — **334 bájt a 16 158 helyett** (50 e-ember, „nincs újdonság") |
| **C** postaláda-szerep kimondása (D34) | ✅ kész — **Anna és Béla soha nem beszélt, mégis mindent tud** |
| **D** terjedő címjegyzék: a társ-lista bővüljön magától | ✅ kész — **B megtanulta Cili és Dóra címét A-tól**, gépelés nélkül |
| **E** pajzsfúrás + UDP-szállítás | ⭐⭐⭐ **kész** (2026-08-29): két háztartás, CGNAT mögül is, **83 ms alatt átfúrva — és a CSERE IS ÁTMENT** rajta |
| **F** helyi felfedezés: azonos wifin, cím beírása nélkül | ✅ kész — ⚠️ kényelem, nem előfeltétel (2. és 4. szabály) |

⚠️ **A lépés-sorrend 2026-08-29-én átíródott** (D33): nem az a kérdés, hogy egy adott gép
**fogadni** tud-e, hanem hogy **a hálózat összefüggő marad-e**. A részletek a
[`szakasz2_terv.md`](../docs/szakasz2_terv.md) 6. pontjában.

⚠️ **D39 — a meleg rés:** minden újrakapcsolódáshoz kell legalább egy társ, akinek a rése
éppen él — vagy mert fogadóképes, vagy mert **folyamatosan fut** (az `orjarat` kifelé
szólása nyitva tartja a rést). Ez olcsóbb bármilyen router-beállításnál.

**Szakasz 3 — A SZERKEZET** *(ettől lett a koino skálázható a szerkezetében)*:
✅ **kész** (2026-09-03).

| Lépés | Állapot |
|---|---|
| **3.1** a kanonikus alak négy új mezője: `entitas` · `entitasSorszam` · `latott` · ⏸️ `lancGyoker` *(lefoglalt hely)* + a **D42-ellenőrzés** | ✅ kész — az ár mérve: **478 → 611 bájt** eseményenként |
| **3.2** a **kérdezhető tár-illesztő** — a `betolt()` helyett célzott kérdések | ⭐⭐ kész — **két mért fal ledőlt**: mentés **495 ms → 1,4 ms** (és lapos), állapotszámítás **4 615 ms → 502 ms** (és lineáris) |
| **3.3** entitás-központú lemez-tár | ⏸️ **elhalasztva** — a 3.2 után ez már mélység, nem szerkezet |
| **3.4** szelet-címjegyzék + **böngésző-lekérés** (`hozd`) | ✅ kész — a lekérés **csak a kért szeletet hozta**, a rendes csere változatlan |

⭐ **Amit a 3.2 tanított:** a `betolt()`-tel nem a *fájlformátum* volt a baj, hanem az
**illesztés** — gyorsítótárral csak a rossz kérdés lett volna gyorsabb. Ezért az illesztés
az első naptól milliárdos (⛔ **9. szabály**), a megvalósítás mögötte pedig maradhat
egyszerű: ma memóriában tartott mutató, és a hívók egyike sem tud róla.

### ▶️ A KÖVETKEZŐ MUNKA: Szakasz 4 — AZ IDENTITÁS

⚠️ *A D17 mondata áll: a konszenzus biztonsága = az identitás-réteg biztonsága, semmi más.
**Enélkül minden eddigi munka egy hatékonyan skálázódó hamisítás-gépezet.***

Tanúsítás · távolság-szabály · tartós mag — a részletek az
[`utiterv.md`](../docs/utiterv.md) 4. szakaszában és a
[`skalazas_terv.md`](../docs/skalazas_terv.md) Sybil-válaszában.

⭐ **És az első valódi használat nem a végén van:** a **D18/0** szerint kis közösségben
*„nem kell rendszer — tudod, ki valódi, mert ismered"*. Vagyis a Szakasz 3 + egy minimális
felület után **egy család vagy egy osztály élesben használhatja** — helyes, milliárdos
szerkezettel, csak kevesebb emberrel (D22).

A teljes terv és a döntések (D1–D42): [`../docs/fejlesztesi_terv_fazis2.md`](../docs/fejlesztesi_terv_fazis2.md)
· a sorrend: [`../docs/utiterv.md`](../docs/utiterv.md)
· a milliárdos lépték szerkezete: [`../docs/skalazas_terv.md`](../docs/skalazas_terv.md)
· a Szakasz 1 terve: [`../docs/szakasz1_terv.md`](../docs/szakasz1_terv.md)
· az adatmodell rétegei: [`../docs/adat_osztalyozas.md`](../docs/adat_osztalyozas.md)
