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

**Olvasd el induláskor:** [`docs/fejlesztesi_terv_fazis2.md`](docs/fejlesztesi_terv_fazis2.md) → az elején a **„HOL TARTUNK"** szakasz. A 28 tervezési döntés (D1–D28) is ott van.

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
node koino/meres/mind.js         # a 90 önpróba
```

⚠️ **A KOINO NEM BÖNGÉSZŐBEN FUT (D29, 2026-08-28).** Csaba döntése: *„hagyjuk is el a böngészős részt, mert csak bezavar. A tiszta P2P kapcsolatra koncentráljunk."* Indok: a böngésző korlátai nem a koino korlátai — egy lap nem tud portot nyitni, nem fogad kapcsolatot, elrejti a saját címeit, és bezáráskor eltűnik; a P2P-hez emlegetett infrastruktúra (jelzőpont, STUN, továbbító) jórészt EBBŐL következik. A böngésző később lehet egy kliens, de nem ő szabja meg, mire képes a koino.

- **Nincs telepítendő függőség** — a kriptográfia a Node beépített WebCryptójából jön (Ed25519 natívan). Az adat a `koino-adat/` mappában él, **hozzáfűzhető** fájlban (soronként egy aláírt esemény); máshová a `KOINO_ADAT` változóval tehető.
- **Önpróbák:** `node koino/meres/mind.js` — 90 próba hat fájlban; a kilépési kód 1, ha bármi bukott. Egy réteg külön is: `node koino/meres/mind.js szabaly`. Nincs teszt-könyvtár. A koino részletes naplója alapból néma, `KOINO_NAPLO=1`-gyel kapcsolható be.
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
- `js/allapot/allapotSzamitas.js` — események → entitások. „E-emberenként az utolsó nyer", ezért **nem kell globális sorrend**. A 0 tudatpontos entitás **nem létezik** (D14).
- `js/allapot/javaslatSzamitas.js` — a döntéshozatal; **az egyezmény itt születik számításként**. Az összehasonlítások **egész aritmetikával** (kereszt-szorzás), hogy kerekítés soha ne dönthessen el szavazást. ⚠️ **A lezárás időrendben**: a határidő után érkezett esemény (szavazat, tudatpont-rendezés, érték javaslat) már nem számít bele — különben a lezárt döntés visszafordulna.
- `js/muveletek.js` — a hat művelet; mindegyik: lánc vége → aláírt esemény → mentés.
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
