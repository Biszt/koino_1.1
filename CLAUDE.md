# CLAUDE.md

Ez a fájl a Claude Code-nak ad útmutatót a koino_1.1 kódbázisához.

## A projekt

**Kollektív Intelligencia Online (koino)** — közösségi tér, amit a közösség irányít. A regisztrálók **e-emberek** (nem „felhasználók"): egyszerre tulajdonosok, fejlesztők, moderátorok és felelősök. A platform lényege a közösségi döntéshozatal: tartalmakból javaslatok, javaslatokból egyezmények születnek, központi szereplő nélkül.

## Domain-fogalmak (kötelező terminológia)

- **e-ember** — regisztrált tag; mindig így hivatkozunk rá, sosem „felhasználó"-ként.
- **tudatpont** — mindenkinek ugyanannyi van; nem elkölthető, csak szétosztható és bármikor átrendezhető. Prioritást fejez ki, NEM szavazaterőt (szavazásnál mindenki egyenlő).
- **tartalom** — a platform alapegysége; **kategóriák** és **tartalomtípusok** (kérdés, válasz, témakör, ismeret, feladat...) rendszerezik.
- **javaslat** — entitástípus: módosítás, áthelyezés, törlés vagy egyesítés kezdeményezése egy tartalomra. Csak az tehet javaslatot, aki tudatpontot rendelt a tartalomhoz.
- **érték javaslat** — KÜLÖN fogalom, nem keverendő a javaslattal (entitástípus)! Mindig „érték javaslat"-ként hivatkozunk rá.
- **egyezmény** — elfogadott javaslat eredménye.
- **küszöbértékek** — tartalmanként meghatározzák, mekkora támogatottság és részvételi arány kell az elfogadáshoz; minimum/maximum döntési idővel együtt.
- **bizonyossági mutató** — minél egyértelműbb az eredmény és magasabb a részvétel, annál hamarabb zárul a döntés (a min/max döntési idő között).
- **pakli** — kártyák (entitások) listázott megjelenítése a frontenden.

## Futtatás

- **Fejlesztői környezet:** `docker-compose -f docker-compose.dev.yml up` — backend a 3000-es porton (a frontendet is ez szolgálja ki statikusan), MongoDB kívülről a 27018-as porton (konténeren belül 27017). CSAK localhost (a 8080-at már az éles stack viszi).
- **Éles környezet (koino.hu):** `docker-compose -f docker-compose.prod.yml up -d --build` — a fejlesztőitől független stack UGYANAZON a gépen: `koino-backend-prod` a 8080-as porton (ide jön a koino.hu Cloudflare Tunnel / IP), külön `koino-mongodb-prod` adatbázis-kötettel, külön `backend/uploads-prod` feltöltés-mappával, saját `backend/.env.prod` titkokkal (gitből kizárva; minta: `backend/.env.prod.example`). A kód a képbe van égetve → csak ezzel a paranccsal (deploy) frissül. Részletek: [`docs/elesites.md`](docs/elesites.md).
- **Backend önállóan:** `cd backend`, majd `npm run dev` (nodemon) vagy `npm start`. A kapcsolatot a `backend/.env` `MONGODB_URI` változója adja.
- A gyökér `package.json` üres — a valódi a `backend/package.json`.
- Nincs automatizált teszt; a tesztelés böngészős, referenciája a [`docs/teszt.md`](docs/teszt.md).

## Architektúra

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
