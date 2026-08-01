# Backend — koino

Node.js + Express + Mongoose. Ez a mappa a koino **szerveroldala**: az API, az
üzleti logika és az adatbázis-hozzáférés. A frontendet is innen szolgáljuk ki
statikusan.

> Nagyobb kép és a rétegek részletes magyarázata:
> [`../docs/architektura.md`](../docs/architektura.md).

## Futtatás

Docker nélkül, önállóan:

```bash
cd backend
npm install
npm run dev      # nodemon (fejlesztés) — vagy: npm start
```

A kapcsolatot a `backend/.env` `MONGODB_URI` változója adja. A szerver a
**3000-es** porton indul.

Docker-es dev környezet a gyökérből: `docker-compose -f docker-compose.dev.yml up`.

## Belépési pont

`server.js` — importálja és regisztrálja a route-okat, beállítja a
middleware-eket (CORS, JSON, statikus frontend, `/uploads`), csatlakozik a
MongoDB-hez, majd elindítja a cron-motort és a szervert.

## Rétegek (a kérés útja)

```
routes/  →  controllers/  →  services/  →  repositories/  →  models/
 URL        req/res          üzleti logika    DB-query        Mongoose séma
```

Minden réteg csak a közvetlenül alatta lévőt hívja. Részletek és egy
végigkövetett példa: [`../docs/architektura.md`](../docs/architektura.md).

## Mappák

| Mappa | Tartalom |
|-------|----------|
| `routes/` | Express Router-ek, HTTP-útvonalak |
| `controllers/` | Kérés-értelmezés, válasz-formázás, hibakódok |
| `services/` | Üzleti logika. A **javaslat-életciklus** magja a `services/javaslat/` alatt (jogosultság, számítás, időzítés, `vegrehajtok/`) |
| `repositories/` | Adatbázis-műveletek (Mongoose) |
| `models/` | Mongoose sémák (entitások) |
| `middlewares/` | `authMiddleware` (JWT), `uploadMiddleware` (Multer) |
| `jobs/` | `javaslatCronJob.js` — lejáró javaslatok időzített lezárása |
| `uploads/` | Feltöltött fájlok (dev) — az éles a `uploads-prod` |

## Környezeti változók

- `backend/.env` — dev titkok (`MONGODB_URI`, JWT-titok stb.).
- `backend/.env.prod` — éles titkok, **gitből kizárva**. Minta:
  [`.env.prod.example`](.env.prod.example).

## Új végpont hozzáadása

A lépésről lépésre receptet lásd:
[`../docs/fejlesztoi_utmutato.md`](../docs/fejlesztoi_utmutato.md).
