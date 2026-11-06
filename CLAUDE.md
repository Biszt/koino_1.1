# CLAUDE.md

Ez a fájl a Claude Code-nak ad útmutatót a koino_1.1 tárhoz — **a PROTOTÍPUSHOZ** (Fázis 1).

## ⛔⛔ A P2P KOINO MÁR NEM ITT VAN (2026-11-06)

Csaba (2026-11-06): *„most már nem szeretném, hogy a koino_1.1 (központi szerveres) mappájába legyen a koino (p2p). a p2p koino-nak
külön kéne lennie.”* → *„tiszta lappal szeretnék indúlni”*.

| Tár | Mi ez | Állapot |
|---|---|---|
| **ez a tár** — `C:\koino_1.1`, [github.com/Biszt/koino_1.1](https://github.com/Biszt/koino_1.1) | **A PROTOTÍPUS** — központi szerveres koino (`backend/` + `frontend/`), ez fut a koino.hu-n | ⏸️ **befagyasztva** — üzemel, de **NEM fejlesztjük**. **NE nyúlj hozzá:** az éles deploy a tár gyökeréből épít, egy átrendezés némán eltörné |
| `C:\koino`, [github.com/Biszt/koino](https://github.com/Biszt/koino) | **A P2P koino** (Fázis 2) — a program, a dokumentációja (`docs/`), a mérések, a CLAUDE.md-je | 🚧 **ott folyik a fejlesztés** — ⭐ a P2P munkát **abban a mappában** kell nyitni |

- ⚠️ **A `koino/` mappa itt csak ÁTMENETILEG maradt** — a P2P program fagyasztott másolata a 2026-11-06-i állapotban, a régi
  meghívó-sorok miatt (azok `~/koino_1.1/koino/termux/telepit.sh`-t, illetve a `koino_1.1` zip-jét hívják). A két telepítője
  (`koino/termux/telepit.sh`, `koino/windows/telepit.ps1`) **költöztet**: letölti az új tárat (`~/koino`, `%USERPROFILE%\koino`),
  és annak a telepítője folytat (a régi helyről futó koinót az leállítja; az adat — `koino-adat` — közös). ⛔ **Ne fejleszd** — ha a
  P2P programon kell változtatni, az a `C:\koino`-ban történik. Ha az ismert telepítések átköltöztek, a `koino/` innen törölhető.
- A 2026-08-26 – 2026-11-06 közötti P2P-munka TÖRTÉNETE (a commitok) itt olvasható; a dokumentáció (a fázis-2 terv, az alappillérek,
  az átvizsgálások, a napló) az új tárba költözött. Itt a prototípus dokumentumai maradtak: `docs/teszt.md`, `docs/elesites.md`,
  `docs/fejlesztesi_terv.md`, `docs/fejlesztoi_utmutato.md`, `docs/architektura.md`, `docs/sikidom_fooldal_terv.md`,
  `docs/adatkezeles.md`, `docs/adatvedelmi_nyilatkozat.md`.
- A P2P felület a prototípusból bájtra örökölt kódot hordoz (5.3) — az új tár `meres/kapuProba.js`-e EZEN tár `frontend/`-jével veti
  össze (a szomszéd mappából). ⛔ Ezért a `frontend/js/` örökölt fájljaihoz se nyúlj.

## A projekt

**Kollektív Intelligencia Online (koino)** — közösségi tér, amit a közösség irányít. A regisztrálók **e-emberek** (nem „felhasználók"): egyszerre tulajdonosok, fejlesztők, moderátorok és felelősök. A platform lényege a közösségi döntéshozatal: gondolatokból javaslatok, javaslatokból egyezmények születnek, központi szereplő nélkül.

## Domain-fogalmak (kötelező terminológia)

- **e-ember** — regisztrált tag; mindig így hivatkozunk rá, sosem „felhasználó"-ként.
- **tudatpont** — mindenkinek ugyanannyi van; nem elkölthető, csak szétosztható és bármikor átrendezhető. Prioritást fejez ki, NEM szavazaterőt (szavazásnál mindenki egyenlő).
- **gondolat** — a platform alapegysége; **kategóriák** és **gondolattípusok** (kérdés, válasz, témakör, ismeret, feladat...) rendszerezik.
- **javaslat** — entitástípus: módosítás, áthelyezés, törlés vagy egyesítés kezdeményezése egy gondolatra. Csak az tehet javaslatot, aki tudatpontot rendelt a gondolathoz. ⚠️ **A Fázis 2-ben ez „szerkesztési javaslat"** (D27) — mellette lesz **általános javaslat** is (a közösség álláspontja, nem entitás-változtatás). A prototípusban marad a régi név.
- **érték javaslat** — KÜLÖN fogalom, nem keverendő a javaslattal (entitástípus)! Mindig „érték javaslat"-ként hivatkozunk rá.
- **egyezmény** — elfogadott javaslat eredménye. ⚠️ A Fázis 2-ben **„szerkesztési egyezmény"** (D27), és **nem esemény, hanem SZÁMÍTÁS eredménye** (D17) — senki nem „mondja ki". Az **általános egyezmény** viszont **élő**: csatlakozni, tiltakozni, ütközést jelölni lehet hozzá.
- **küszöbértékek** — gondolatonként meghatározzák, mekkora támogatottság és részvételi arány kell az elfogadáshoz; minimum/maximum döntési idővel együtt.
- **bizonyossági mutató** — minél egyértelműbb az eredmény és magasabb a részvétel, annál hamarabb zárul a döntés (a min/max döntési idő között).
- **pakli** — kártyák (entitások) listázott megjelenítése a frontenden.

## Futtatás

### A PROTOTÍPUS (`backend/` + `frontend/` — Fázis 1, befagyasztva)

- **Fejlesztői környezet:** `docker-compose -f docker-compose.dev.yml up` — backend a 3000-es porton (a frontendet is ez szolgálja ki statikusan), MongoDB kívülről a 27018-as porton (konténeren belül 27017). CSAK localhost (a 8080-at már az éles stack viszi).
- **Éles környezet (koino.hu):** `docker-compose -f docker-compose.prod.yml up -d --build` — a fejlesztőitől független stack UGYANAZON a gépen: `koino-backend-prod` a 8080-as porton (ide jön a koino.hu Cloudflare Tunnel / IP), külön `koino-mongodb-prod` adatbázis-kötettel, külön `backend/uploads-prod` feltöltés-mappával, saját `backend/.env.prod` titkokkal (gitből kizárva; minta: `backend/.env.prod.example`). A kód a képbe van égetve → csak ezzel a paranccsal (deploy) frissül. Részletek: [`docs/elesites.md`](docs/elesites.md).
- **Backend önállóan:** `cd backend`, majd `npm run dev` (nodemon) vagy `npm start`. A kapcsolatot a `backend/.env` `MONGODB_URI` változója adja.
- A gyökér `package.json` üres — a valódi a `backend/package.json`.
- Nincs automatizált teszt; a tesztelés böngészős, referenciája a [`docs/teszt.md`](docs/teszt.md).

## Architektúra

### A PROTOTÍPUS architektúrája (befagyasztva)

### Backend (`backend/`) — Node.js + Express + Mongoose

Rétegek: `routes` → `controllers` → `services` → `repositories` → `models`. Belépési pont: `server.js` (route-regisztráció, statikus frontend-kiszolgálás, MongoDB-kapcsolat, cron indítás).

- `models/` — Mongoose sémák: eember, gondolat, kategoria, gondolatTipus, javaslat, ertekJavaslat, egyezmeny, szavazat, tudatpontAllokacio/Hozzarendeles, ertesites...
- `services/javaslat/` — a javaslat-életciklus magja; a `vegrehajtok/` almappában művelet-típusonkénti végrehajtók (athelyezesi, egyesitesi, torlesi, csomag), amiket a `javaslatVegrehajtasiService` fog össze.
- `jobs/javaslatCronJob.js` — node-cron: lejáró javaslatok időzített lezárása.
- `services/hierarchikusFrissitesService.js` — hierarchikus (szülő-gyerek) frissítések; a sorrend kritikus (lásd git history).

### Frontend (`frontend/`) — vanilla HTML/CSS/JS, build nélkül

ES-modulok, komponens-osztályok. Belépés: `index.html` + `js/main.js`, nézetek a `js/components/foOldal.js`-ből.

- `js/components/kartya/` — entitás-kártyák (GondolatKartya, JavaslatKartya, EgyezmenyKartya...), a `Pakli.js` listázza őket.
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
- **A PROTOTÍPUS (befagyasztva)** — csak ha mégis hozzá kell nyúlni: a Docker-es dev környezetben (http://localhost:3000) ellenőrizzük, és **tesztelés előtt a [`docs/teszt.md`](docs/teszt.md)** (környezet-indítás, útvonalak, kötelező mezők, forgatókönyvek); ha ezek változnak, a `teszt.md`-t is át kell vezetni.
- A zárójeles jegyzetek (`[ … ]`, `{ … }`) naplója az új tárban él: `C:\koino\docs\jegyzetek.md`.
