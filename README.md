# Kollektív Intelligencia Online (koino)

> Közösségi tér, amit a közösség irányít — központi szereplő nélkül.

A **koino** egy közösségi platform, ahol a regisztrálók nem „felhasználók", hanem
**e-emberek**: egyszerre tulajdonosok, fejlesztők, moderátorok és felelősök. A
platform lényege a **közösségi döntéshozatal**: a tartalmakból *javaslatok*, a
javaslatokból *egyezmények* születnek — mindezt egy átlátható, mindenki számára
egyenlő szavazási mechanika vezérli.

Élesben: **[koino.hu](https://koino.hu)**

---

## Tartalomjegyzék

- [Mi ez a projekt?](#mi-ez-a-projekt)
- [A központi ötlet dióhéjban](#a-központi-ötlet-dióhéjban)
- [Technológiák](#technológiák)
- [Gyors indítás](#gyors-indítás)
- [Könyvtár-térkép](#könyvtár-térkép)
- [Hol kezdd az olvasást?](#hol-kezdd-az-olvasást)
- [Dokumentáció](#dokumentáció)
- [Állapot](#állapot)

---

## Mi ez a projekt?

A koino a nagy közösségi platformok ellenpontja: ott néhány ember birtokol és
irányít mindent, itt a **közösség maga** hozza a döntéseket. A rendszer nem a
„társadalmi többség akaratát" mondja ki, hanem a **részt vevők hitelesített
szándékát** teszi láthatóvá — ellenőrzött emberek, egy-ember-egy-hang, átlátható
folyamat.

Ez a repository a platform **1.1-es, tisztán újraírt változata**. Két fázisban
gondolkodunk:

- **Fázis 1 (ez a kód):** központi szerveres koino — a döntéshozatali mechanika
  kifejlesztése és élesben bizonyítása az első közösséggel.
- **Fázis 2 (jövő):** P2P koino — elosztott, központi szereplő nélküli működés.

Részletek: [`docs/fejlesztesi_terv_fazis2.md`](docs/fejlesztesi_terv_fazis2.md).

## A központi ötlet dióhéjban

1. Egy e-ember **tartalmat** hoz létre (kérdés, válasz, ismeret, feladat…), amit
   **kategóriák** és **tartalomtípusok** rendszereznek.
2. Mindenkinek ugyanannyi **tudatpontja** van. Ez nem elkölthető, csak
   szétosztható és bármikor átrendezhető — a **prioritást** fejezi ki, NEM a
   szavazaterőt (szavazásnál mindenki egyenlő).
3. Aki tudatpontot rendelt egy tartalomhoz, az tehet rá **javaslatot**
   (módosítás, áthelyezés, törlés, egyesítés).
4. A javaslatról **szavaznak**. Minden tartalomnak vannak **küszöbértékei**
   (mekkora támogatottság és részvétel kell az elfogadáshoz) és min/max
   döntési ideje.
5. A **bizonyossági mutató** dönti el, mikor zárul a szavazás: minél
   egyértelműbb az eredmény és magasabb a részvétel, annál hamarabb.
6. Az elfogadott javaslatból **egyezmény** lesz.

> A pontos terminológiát (kötelező!) lásd a [`CLAUDE.md`](CLAUDE.md)
> „Domain-fogalmak" szakaszában, illetve a
> [`docs/architektura.md`](docs/architektura.md)-ban.

## Technológiák

| Réteg | Eszközök |
|-------|----------|
| Frontend | Vanilla HTML / CSS / JavaScript (ES-modulok, **build nélkül**) |
| Backend | Node.js, Express, Mongoose |
| Adatbázis | MongoDB |
| Auth | JWT + bcrypt |
| Feltöltés | Multer |
| Időzítés | node-cron |
| Üzemeltetés | Docker Compose (külön dev és prod stack) |

## Gyors indítás

A legegyszerűbb út a Docker-es fejlesztői környezet:

```bash
docker-compose -f docker-compose.dev.yml up
```

Ezután a platform elérhető: **http://localhost:3000** (a backend a 3000-es
porton fut, és statikusan kiszolgálja a frontendet is; a MongoDB kívülről a
27018-as porton). Csak localhost — a 8080-at az éles stack viszi.

A backend önállóan is futtatható Docker nélkül:

```bash
cd backend
npm install
npm run dev
```

Ehhez a `backend/.env` fájlban be kell állítani a `MONGODB_URI` kapcsolatot.

> Az **éles** (koino.hu) környezet külön stackben fut ugyanazon a gépen — lásd
> [`docs/elesites.md`](docs/elesites.md). Éleset **soha** ne állíts le
> `down -v`-vel (törölné az adatbázist).

## Könyvtár-térkép

```
koino_1.1/
├─ README.md              ← ezt olvasod
├─ CLAUDE.md              ← domain-fogalmak + architektúra + konvenciók (kötelező olvasmány)
├─ CHANGELOG.md           ← mi változott mikor
├─ SECURITY.md            ← biztonsági hiba bejelentése
├─ docker-compose.dev.yml ← fejlesztői stack
├─ docker-compose.prod.yml← éles stack
│
├─ backend/               ← Node + Express + Mongoose (lásd backend/README.md)
│  ├─ server.js           ← belépési pont
│  ├─ routes/             ← HTTP-útvonalak
│  ├─ controllers/        ← kérés-értelmezés, válasz
│  ├─ services/           ← üzleti logika (a javaslat-életciklus magja itt)
│  ├─ repositories/       ← adatbázis-hozzáférés
│  ├─ models/             ← Mongoose sémák
│  ├─ middlewares/        ← auth, feltöltés
│  └─ jobs/               ← cron (lejáró javaslatok lezárása)
│
├─ frontend/              ← vanilla JS SPA (lásd frontend/README.md)
│  ├─ index.html          ← belépési pont
│  ├─ js/main.js          ← alkalmazás-indító
│  ├─ js/components/       ← komponens-osztályok (kártyák, modálok, szerkesztő)
│  ├─ html/               ← komponens-sablonok
│  └─ css/                ← komponensenkénti stílusok
│
└─ docs/                  ← részletes dokumentáció (lásd lentebb)
```

## Hol kezdd az olvasást?

Ha most találkozol először a kóddal, ebben a sorrendben haladj:

1. **[`CLAUDE.md`](CLAUDE.md)** — a domain-fogalmak és a magas szintű
   architektúra. Enélkül a magyar elnevezések nehezen értelmezhetők.
2. **[`docs/architektura.md`](docs/architektura.md)** — mélyebb technikai túra:
   végigköveti, hogyan halad egy kérés a rétegeken, és hogyan születik egy
   javaslatból egyezmény.
3. **[`backend/README.md`](backend/README.md)** és
   **[`frontend/README.md`](frontend/README.md)** — réteg-szintű belépők.
4. **[`docs/fejlesztoi_utmutato.md`](docs/fejlesztoi_utmutato.md)** — kódolási
   konvenciók és „hogyan adj hozzá új funkciót" recept.
5. Egy **konkrét folyamat** végigolvasása kódban: `javaslatRoutes.js` →
   `javaslatController.js` → `services/javaslat/javaslatService.js`. Ez a
   projekt szíve.

## Dokumentáció

A `docs/` mappa a projekt tudásbázisa:

| Fájl | Miről szól |
|------|-----------|
| [`architektura.md`](docs/architektura.md) | Technikai kód-túra (fejlesztőknek) |
| [`fejlesztoi_utmutato.md`](docs/fejlesztoi_utmutato.md) | Konvenciók, hozzájárulás, workflow |
| [`teszt.md`](docs/teszt.md) | Böngészős teszt-referencia (útvonalak, mezők, forgatókönyvek) |
| [`elesites.md`](docs/elesites.md) | Éles (koino.hu) üzemeltetési kézikönyv |
| [`fejlesztesi_terv.md`](docs/fejlesztesi_terv.md) | Fázis 1 fejlesztési terv |
| [`fejlesztesi_terv_fazis2.md`](docs/fejlesztesi_terv_fazis2.md) | Fázis 2 (P2P) terv |
| [`vizio_kritikak.md`](docs/vizio_kritikak.md) | A vízió melletti és elleni érvek |
| [`jegyzetek.md`](docs/jegyzetek.md) | Zárójeles ötletek naplója |
| [`adatkezeles.md`](docs/adatkezeles.md) / [`adatvedelmi_nyilatkozat.md`](docs/adatvedelmi_nyilatkozat.md) | Adatvédelem |
| [`a_nev_tortenete.md`](docs/a_nev_tortenete.md) | A „koino" név eredete |
| [`bemutato_kivulalloknak.md`](docs/bemutato_kivulalloknak.md) / [`bemutato_kormany.md`](docs/bemutato_kormany.md) | Bemutató anyagok |

## Állapot

🟢 **Élesben** fut a [koino.hu](https://koino.hu)-n (Fázis 1). A döntéshozatali
mechanika működik; a finomítás és a Fázis 2 (P2P) tervezése folyamatban.

Nincs automatizált teszt — a tesztelés böngészős, referenciája a
[`docs/teszt.md`](docs/teszt.md).
