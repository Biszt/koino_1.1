# Architektúra — technikai kód-túra

Ez a dokumentum a **fejlesztőknek** szól, akik meg akarják érteni, *hogyan*
épül fel és *hogyan működik* a koino kódja. Feltételezi, hogy a
[`CLAUDE.md`](../CLAUDE.md) domain-fogalmait már elolvastad (e-ember,
tudatpont, gondolat, javaslat, egyezmény, küszöbérték, bizonyossági mutató).

## Tartalomjegyzék

- [Nagy kép](#nagy-kép)
- [Backend — a rétegek](#backend--a-rétegek)
- [Egy kérés útja végig a rendszeren](#egy-kérés-útja-végig-a-rendszeren)
- [A javaslat életciklusa](#a-javaslat-életciklusa)
- [Adatmodell — a fő entitások](#adatmodell--a-fő-entitások)
- [Időzített feladatok (cron)](#időzített-feladatok-cron)
- [Hierarchikus frissítések](#hierarchikus-frissítések)
- [Frontend — komponens-architektúra](#frontend--komponens-architektúra)
- [Frontend ↔ backend kommunikáció](#frontend--backend-kommunikáció)
- [Üzemeltetési architektúra](#üzemeltetési-architektúra)

---

## Nagy kép

```
   BÖNGÉSZŐ                          SZERVER (Node.js)               ADATBÁZIS
 ┌───────────┐   HTTP / JSON     ┌──────────────────────┐        ┌──────────┐
 │ frontend/ │ ───────────────► │ Express (server.js)   │ ─────► │ MongoDB  │
 │ vanilla JS│ ◄─────────────── │ routes→controllers→   │ ◄───── │ (Mongoose)│
 │ SPA       │                  │ services→repositories │        └──────────┘
 └───────────┘                  └──────────┬────────────┘
                                           │ node-cron
                                    ┌──────▼───────┐
                                    │ jobs/ (időzítés,│
                                    │ javaslat-lezárás)│
                                    └───────────────┘
```

- A **backend** egyetlen Express-alkalmazás. A `server.js` regisztrálja az
  útvonalakat, kiszolgálja a frontendet statikusan, csatlakozik a MongoDB-hez,
  és elindítja a cron-motort.
- A **frontend** build nélküli, natív ES-modulokból álló egyoldalas alkalmazás
  (SPA). Ugyanaz a Node-szerver szolgálja ki statikus fájlként.
- A **MongoDB** tárolja az összes entitást; a Mongoose adja a sémákat.

## Backend — a rétegek

A backend szigorú rétegzést követ. **Minden réteg csak a közvetlenül alatta
lévőt hívja** — így a felelősségek nem keverednek:

```
  routes/         „Milyen URL-ekre reagálunk?"      (Express Router)
     │            HTTP-metódus + útvonal → controller-metódus
     ▼
  controllers/    „Értsük meg a kérést, adjunk választ." (req/res kezelés)
     │            Kicsomagolja a body/params/auth adatot, hívja a service-t,
     │            formázza a HTTP-választ és a hibakódokat.
     ▼
  services/       „Az üzleti logika."                (a rendszer esze)
     │            Itt élnek a szabályok: jogosultság, számítások,
     │            a javaslat-életciklus. NEM tud a HTTP-ről.
     ▼
  repositories/   „Beszélgetés az adatbázissal."     (Mongoose-hívások)
     │            find, create, update, delete — a query-k egy helyen.
     ▼
  models/         „Hogy néz ki egy entitás?"         (Mongoose sémák)
                  Mezők, típusok, validáció, indexek.
```

Miért jó ez? Mert ha meg akarsz érteni egy funkciót, mindig ugyanott keresel:

- **Milyen végpontok vannak?** → `routes/`
- **Mi az elfogadás szabálya?** → `services/`
- **Hogyan tárolódik?** → `models/` és `repositories/`

Kiegészítő mappák:

- `middlewares/` — a kérés útjába ékelt közös logika. Az `authMiddleware`
  ellenőrzi a JWT-t, és a bejelentkezett e-embert a `req`-re teszi; az
  `uploadMiddleware` (Multer) a fájlfeltöltést kezeli.
- `jobs/` — időzített (cron) feladatok, lásd lentebb.

## Egy kérés útja végig a rendszeren

Kövessük végig egy **konkrét** hívást: *„listázd a javaslatokat"*.

1. **Böngésző:** `GET /api/javaslat` HTTP-kérés indul.
2. **`server.js`:** az `app.use('/api/javaslat', javaslatRoutes)` sor miatt a
   kérés a javaslat-routerhez kerül.
3. **`routes/javaslatRoutes.js`:** a `router.get('/', ...)` sor a
   `JavaslatController.javaslatokListazasa` metódushoz irányít. (Védett
   végpontoknál itt fut le előbb az `authMiddleware`.)
4. **`controllers/javaslatController.js`:** kiolvassa a szűrőket a
   `req.query`-ből, meghívja a megfelelő service-metódust, majd `res.json(...)`
   formában visszaadja az eredményt (és hibánál a megfelelő státuszkódot).
5. **`services/javaslat/javaslatService.js`:** alkalmazza az üzleti szabályokat
   (pl. mit láthat a hívó), és a repository-tól kéri az adatot.
6. **`repositories/javaslatRepository.js`:** lefuttatja a konkrét
   Mongoose-query-t a `models/javaslat.js` séma alapján.
7. Az eredmény visszafelé buborékol ugyanezen a láncon, és JSON-ként ér a
   böngészőbe.

> **Ez a minta ismétlődik minden entitásnál.** Ha egy új funkciót akarsz
> megérteni vagy hozzáadni, ezt a láncot járd végig. A recept a
> [`fejlesztoi_utmutato.md`](fejlesztoi_utmutato.md)-ban van.

## A javaslat életciklusa

Ez a projekt **szíve**. A logika a `services/javaslat/` alatt lakik:

| Fájl | Felelősség |
|------|-----------|
| `javaslatService.js` | A fő koordinátor: létrehozás, listázás, lekérés. |
| `javaslatJogosultsagService.js` | Ki tehet javaslatot / szavazhat? (tudatpont-feltétel) |
| `javaslatSzamitasService.js` | Támogatottság, részvétel, **bizonyossági mutató** számítása. |
| `javaslatIdozitesService.js` | Mikor záruljon a döntés? (min/max idő + bizonyosság) |
| `vegrehajtok/` | Az elfogadott javaslat **végrehajtása** művelet-típusonként. |

A `vegrehajtok/` almappa a művelet-típusonkénti végrehajtókat tartalmazza,
amelyeket a `javaslatVegrehajtasiService.js` fog össze:

- `modositasiVegrehajto.js` — gondolat módosítása
- `athelyezesiVegrehajto.js` — gondolat áthelyezése másik szülő alá
- `torlesiVegrehajto.js` — gondolat (vagy egyezmény) törlése
- `egyesitesiVegrehajto.js` — több gondolat egyesítése
- `csomagVegrehajto.js` — összetett, több lépéses csomag

**A teljes életciklus lépésről lépésre:**

```
1. LÉTREHOZÁS   e-ember javaslatot tesz egy gondolatra
                (feltétel: tudatpontot rendelt hozzá → jogosultságService)
        │
        ▼
2. SZAVAZÁS     mások támogatják / ellenzik / tartózkodnak (szavazatService)
        │       közben folyamatosan számoljuk:
        │       – támogatottsági arány, részvételi arány (számításService)
        │       – bizonyossági mutató → a tényleges határidő (időzítésService)
        ▼
3. LEZÁRÁS      a cron (jobs/javaslatCronJob.js) figyeli a lejáró javaslatokat
        │       és lezárja őket, amikor eljön az idő
        ▼
4a. ELFOGADVA → a megfelelő végrehajtó lefut (vegrehajtok/…),
                a változás átvezetődik, és EGYEZMÉNY keletkezik
4b. ELUTASÍTVA → nincs változás, a javaslat lezárul
```

## Adatmodell — a fő entitások

A Mongoose sémák a `models/` alatt vannak. A legfontosabbak és kapcsolataik:

```
   eember ──rendel──► tudatpont ──kötődik──► gondolat
     │                                          │
     │ tehet                          kategorizál│ (kategoria, gondolatTipus)
     ▼                                          ▼
   javaslat ──────► szavazat            ertekJavaslat (KÜLÖN fogalom!)
     │  (elfogadva)
     ▼
   egyezmeny
```

- **`eember.js`** — a regisztrált tag (auth-adatok, profil).
- **`gondolat.js`** — a platform alapegysége; kategória + gondolattípus
  rendszerezi, saját küszöbértékei vannak.
- **`kategoria.js`, `gondolatTipus.js`** — rendszerező dimenziók; a kategóriák
  hierarchikusak (al-kategóriák).
- **`tudatpontAllokacio.js`, `tudatpontHozzarendeles.js`,
  `hierarchikusTudatpontAllokacio.js`** — a tudatpont-szétosztás nyilvántartása.
- **`javaslat.js`** — a módosítás/áthelyezés/törlés/egyesítés kezdeményezése.
- **`szavazat.js`** — egy e-ember szavazata egy javaslaton (támogat / ellenez /
  tartózkodik).
- **`egyezmeny.js`** — az elfogadott javaslat eredménye.
- **`ertekJavaslat.js` + `gondolatErtekHisztogram.js`** — az **érték javaslat**
  (KÜLÖN entitástípus, nem keverendő a `javaslat`-tal!) és annak eloszlása.
- **`meghivo.js`** — meghívásos regisztráció (éles környezetben kötelező lehet).
- **`ertesites.js`, `ertesitesiBeallitas.js`** — értesítési rendszer.

> ⚠️ **Domain-invariáns:** nincs 0-tudatpontos entitás — ha egy gondolathoz
> rendelt összes tudatpont elfogy, a gondolat törlődik.

## Időzített feladatok (cron)

A `jobs/javaslatCronJob.js` a `node-cron`-nal fut, és a `server.js` indítja el a
MongoDB-kapcsolat után. Feladata a **lejáró javaslatok időzített lezárása**:
rendszeresen megnézi, mely javaslatoknál jött el a döntési idő (a bizonyossági
mutató és a min/max idő alapján), és lezárja őket — elfogadás esetén lefuttatva
a megfelelő végrehajtót.

## Hierarchikus frissítések

A `services/hierarchikusFrissitesService.js` a szülő-gyerek kapcsolatok
frissítését végzi (pl. tudatpont-összegek felfelé görgetése a
kategória-fában). **A műveletek sorrendje itt kritikus** — a git history
őrzi, miért. Ha ehhez nyúlsz, előbb nézd meg a kapcsolódó commiteket.

## Frontend — komponens-architektúra

A frontend **vanilla JavaScript**, build-lépés nélkül, natív ES-modulokkal.
Nincs React/Vue — komponens-**osztályok** vannak, minden komponens egy JS-fájl
+ egy CSS-fájl.

- **Belépés:** `index.html` betölti a `js/main.js`-t, ami elindítja az
  alkalmazást. A fő nézeteket a `js/components/foOldal.js` szervezi.
- **`js/components/kartya/`** — az entitás-**kártyák** (GondolatKartya,
  JavaslatKartya, EgyezmenyKartya…). A `Pakli.js` listázza őket („pakli" =
  kártyák listás megjelenítése).
- **`js/components/szovegSzerkeszto/`** — blokk-alapú szerkesztő: `blokkok/`
  (SzovegBlokk, KepBlokk, FajlBlokk, LinkBlokk, EntitasHivatkozasBlokk),
  `eszkoztar/`, BlokkLista, OldalNavigacio.
- **`js/components/modals/`** — Modal alaposztály + specifikus modálok (pl.
  JavaslatModal); a hozzájuk tartozó HTML a `html/components/modals/` alatt.
- **`FoOldalTortenetKezelo.js`** — a böngésző vissza/előre gombjainak kezelése
  (entitás + rendezés + struktúra nézet állapot).

A **CSS** komponensenként külön fájlban van a `css/components/` alatt, és a
`css/main.css` importálja őket.

## Frontend ↔ backend kommunikáció

A frontend `fetch`-csel hívja a `/api/...` végpontokat, JSON-t küld és kap.
A védett végpontokhoz a bejelentkezéskor kapott **JWT-t** küldi (Authorization
fejléc), amit a backend `authMiddleware`-e ellenőriz. Az elérhető végpontok
teljes listáját a `server.js` route-regisztrációja és az egyes `routes/` fájlok
adják; teszteléshez a [`teszt.md`](teszt.md) sorolja fel őket.

## Üzemeltetési architektúra

Két **független** Docker-stack fut ugyanazon a gépen:

| | Fejlesztői (dev) | Éles (prod) |
|---|---|---|
| Indítás | `docker-compose.dev.yml` | `docker-compose.prod.yml` |
| Backend port | 3000 (csak localhost) | 8080 (koino.hu a Cloudflare Tunnelen át) |
| MongoDB | 27018 kívülről | külön `koino-mongodb-prod` kötet |
| Feltöltés | `backend/uploads` | `backend/uploads-prod` |
| Titkok | `backend/.env` | `backend/.env.prod` (gitből kizárva) |
| Kód | élőben csatolva (nodemon) | a képbe **beégetve** (deploykor frissül) |

Részletek és az éles deploy menete: [`elesites.md`](elesites.md).

> ⚠️ Az éles adatbázist **soha** ne állítsd le `down -v`-vel — az törölné a
> kötetet és vele az összes éles adatot.
