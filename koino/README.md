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
| `node koino/koino.js talalkozo <hoszt> [port]` | **lyukfúrás-mérés**: mindkét fél kopog, és kiderül, átjut-e ⚠️ ma még csak mérés |
| `node koino/koino.js csere <hoszt> <port>` | kapcsolódás egy megadott készülékhez |
| `node koino/koino.js csere` | ⭐ csere **minden társsal** — egy elérhetetlen társ nem dönti el a kört |
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

Kilenc próba-fájl, **171 önpróba**; a kilépési kód 1, ha bármi bukott. Egy réteg külön is
futtatható: `node koino/meres/mind.js szabaly`.

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

## A rétegek

| Fájl | Felelősség |
|---|---|
| `js/esemeny/kanonikusAlak.js` | ⚠️ a legveszélyesebb részlet: ugyanaz az adat = ugyanazok a bájtok |
| `js/esemeny/esemeny.js` | aláírás és ellenőrzés; az esemény neve a tartalma lenyomata |
| `js/tar/fajlTar.js` | a tár: **hozzáfűzhető** fájl, soronként egy esemény |
| `js/tar/esemenyTar.js` | a lánc kezelése — ellenőrizetlen esemény nem kerül be |
| `js/kulcs/kulcsTar.js` | a kulcs = a személyazonosság (D15) |
| `js/allapot/szabalyok.js` | mely események **számítanak** (keret, jogosultság) |
| `js/allapot/allapotSzamitas.js` | események → entitások |
| `js/allapot/javaslatSzamitas.js` | a döntéshozatal; **az egyezmény mint számítás** |
| `js/allapot/osszehasonlitas.js` | **„ugyanazt látjuk-e?"** — az állapot ujjlenyomata, és hol tér el |
| `js/csere/csere.js` | a csere-protokoll **logikája, hálózat nélkül** (`ALLAS` → `KEREK` → `ESEMENY`) |
| `js/csere/vonal.js` | a **szállítás**: soronként egy JSON-üzenet TCP-n. Semmit nem tud a koinóról |
| `js/csere/kapunyitas.js` | megkérjük a routert, hogy engedje be a kapcsolatot — ⚠️ **segédeszköz, nem előfeltétel** |
| `js/csere/tarsak.js` | **a társ-lista** (D33): kikkel próbáljunk cserélni, és milyen sorrendben |
| `js/csere/pajzsfuro.js` | **pajzsfúrás** (E. lépés): mindkét fél kifelé kopog, hogy a két router rése egymásra illeszkedjen |
| `js/muveletek.js` | a hat művelet |
| `koino.js` | a parancssori arc |

⚠️ **Az 1. szabály itt látszik:** a `csere.js` **soha nem importál hálózati kódot** — a
logika és a szállítás külön él, ezért cserélhető ki a vonal bármi másra (fájl, pendrive,
rádió) anélkül, hogy a csere-protokollhoz hozzá kellene nyúlni.

## Hol tartunk

**Szakasz 1 — A HELYI KOINO** *(egy készülék, hálózat nélkül)*: ✅ **kész**. A teljes kör
végigjátszható: koino → tartalom → tudatpont → javaslat → szavazat → **egyezmény**.

**Szakasz 2 — A KAPCSOLAT** *(itt tartunk)*: két készülék egymásra talál és kicseréli az
eseményeit — terv: [`../docs/szakasz2_terv.md`](../docs/szakasz2_terv.md).

| Lépés | Állapot |
|---|---|
| **1a** a csere logikája, hálózat nélkül | ✅ kész |
| **1b** a vonal (TCP) | ✅ kész |
| **2** a vizsga: két készülék → azonos állapot | ✅ kész |
| **A** több társ: a `csere` társ-listára menjen, ne egy címre | ✅ kész — **25 önpróba**, és két halott címmel is átment a valódi csere |
| **B** olcsó csere: ujjlenyomat előbb, részletes `ALLAS` csak eltérésnél (D35) | ✅ kész — **334 bájt a 16 158 helyett** (50 e-ember, „nincs újdonság") |
| **C** postaláda-szerep kimondása (D34) | ✅ kész — **Anna és Béla soha nem beszélt, mégis mindent tud** |
| **D** terjedő címjegyzék: a társ-lista bővüljön magától | ✅ kész — **B megtanulta Cili és Dóra címét A-tól**, gépelés nélkül |
| **E** pajzsfúrás (UDP + TCP) | 🚧 magja kész, valódi mérésre vár |

⚠️ **A lépés-sorrend 2026-08-29-én átíródott** (D33): nem az a kérdés, hogy egy adott gép
**fogadni** tud-e, hanem hogy **a hálózat összefüggő marad-e**. A részletek a
[`szakasz2_terv.md`](../docs/szakasz2_terv.md) 6. pontjában.

A teljes terv és a döntések: [`../docs/fejlesztesi_terv_fazis2.md`](../docs/fejlesztesi_terv_fazis2.md)
· a Szakasz 1 terve: [`../docs/szakasz1_terv.md`](../docs/szakasz1_terv.md)
· az adatmodell rétegei: [`../docs/adat_osztalyozas.md`](../docs/adat_osztalyozas.md)
