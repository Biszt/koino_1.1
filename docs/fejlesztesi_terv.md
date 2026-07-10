# koino_1.1 — Fejlesztési terv

*Utolsó frissítés: 2026. 07. 06.*

## A terv gerince: a menühálózat

A fejlesztési terv alapja a teljes menürendszer. Minden menüpont már most felkerül a felületre:
- ✅ **KÉSZ** — a menüpont mögött működő funkció van
- 🚧 **FEJLESZTÉSRE VÁR** — a menüpont kattintásra egységes „Fejlesztésre vár" üzenetet mutat, amíg el nem készül
- ❌ **TÖRLENDŐ** — jelenleg létezik a kódban, de nem része a tervnek

A „fejlesztésre vár" állapotot egy közös komponens jeleníti meg minden menüben egységesen.

---

## A teljes menühálozat és állapota

### 1. Fő hamburger menü (alsó sáv — `foOldal.js`)

| Menüpont | Állapot | Megjegyzés |
|---|---|---|
| Értesítések | 🚧 | Most „hamarosan" modal; a backend értesítés-rendszer (ertesitesService, ertesitesRoutes) már létezik, a frontend hiányzik |
| Új tartalom létrehozása | ✅ | TartalomModal |
| Új kategória létrehozása | ✅ | KategoriaModal |
| Új tartalomtípus létrehozása | ✅ | TartalomTipusModal |
| Tudatpontok | 🚧 | ÚJ menüpont — saját tudatpontok áttekintése és átrendezése |
| eember beállítások | 🚧 | Most „hamarosan" modal |
| Kijelentkezés | ✅ | |

### 2. Tartalom kártya menü (`TartalomKartya.js`)

| Menüpont | Állapot | Megjegyzés |
|---|---|---|
| Új tartalom létrehozása ebből | ✅ | Ágaztatás szülő-adatokkal |
| Javaslat létrehozása | ✅ | JavaslatModal |
| Tudatpont módosítás | ✅ | TudatpontModal — saját pont módosítása + felmenő-szabály |
| Részletes adatok | 🚧 | Csak console.log |
| Küszöb érték javaslat | ✅ | ErtekJavaslatModal — támogatottsági/részvételi %, min/max döntési idő; a Tartalom létrehozó modál is bekéri az értékeket (alapértékekkel). Csak tartalomra! |

### 3. Javaslat kártya menü (`JavaslatKartya.js`)

| Menüpont | Állapot | Megjegyzés |
|---|---|---|
| Szavazat leadása | ✅ | SzavazatModal — támogat/ellenez/tartózkodik, korábbi szavazat kiemelve, visszavonás |
| Új tartalom létrehozása ebből | ✅ | Ágaztatás szülő-adatokkal (TartalomModal, szuloTipus) |
| Tudatpont módosítás | ✅ | TudatpontModal — saját pont módosítása + felmenő-szabály |
| Részletes adatok | ✅ | Közös ReszletekModal (típus, státusz, érintett entitások, szavazás állása, saját szavazat) |
| ~~Törlés~~ | ❌ | Nem része a tervnek (a törlés javaslat/szavazás útján történik) — a tulajdonos jóváhagyta a törlését |

### 4. Tartalomtípus kártya menü (`TartalomTipusKartya.js`)

| Menüpont | Állapot | Megjegyzés |
|---|---|---|
| Új tartalom létrehozása ebből | ✅ | Ágaztatás szülő-adatokkal (TartalomModal, szuloTipus) |
| Javaslat létrehozása | ✅ | |
| Tudatpont módosítás | ✅ | TudatpontModal — saját pont módosítása + felmenő-szabály |
| Részletes adatok | ✅ | Közös ReszletekModal (név, típus, létrehozó, tudatpont, leírás) |
| Küszöb érték javaslat | ✅ | ErtekJavaslatModal + a létrehozó modál is bekéri az értékeket (az érték-rendszer entitás-polimorf: entitasId + entitasTipus) |

### 5. Kategória kártya menü (`KategoriaKartya.js`)

| Menüpont | Állapot | Megjegyzés |
|---|---|---|
| Új tartalom létrehozása ebből | ✅ | Ágaztatás szülő-adatokkal (TartalomModal, szuloTipus) |
| Új kategória létrehozása ebből | 🚧 | ÚJ menüpont — az így létrehozott kategória ALKATEGÓRIA lesz; backend módosítás is kell hozzá (kategória-hierarchia) |
| Javaslat létrehozása | ✅ | |
| Tudatpont módosítás | ✅ | TudatpontModal — saját pont módosítása + felmenő-szabály |
| Részletes adatok | ✅ | Közös ReszletekModal (név, típus, létrehozó, tudatpont, leírás) |
| Küszöb érték javaslat | ✅ | ErtekJavaslatModal + a létrehozó modál is bekéri az értékeket (az érték-rendszer entitás-polimorf: entitasId + entitasTipus) |

### 6. Egyezmény kártya menü (`EgyezmenyKartya.js`)

| Menüpont | Állapot | Megjegyzés |
|---|---|---|
| Új tartalom létrehozása ebből | ✅ | Ágaztatás szülő-adatokkal (TartalomModal, szuloTipus) |
| Javaslat létrehozása | 🚧 | ÚJ menüpont |
| Tudatpont módosítás | ✅ | TudatpontModal — saját pont módosítása + felmenő-szabály |
| Részletes adatok | ✅ | Közös ReszletekModal (típus, létrehozó, érintett entitások, szavazás pillanatképe, tudatpont) |

---

## Fejlesztési fázisok

### 0. fázis — A menüváz kiépítése (ez teszi „élővé" a tervet)

- [x] Közös `FejlesztesreVar` üzenet-komponens létrehozása (egységes modal/üzenet) — `frontend/js/components/FejlesztesreVar.js` + CSS
- [x] Minden menü igazítása a fenti hálózathoz: hiányzó pontok felvétele 🚧 ikonnal és akcióval, feliratok egységesítése („Szavazat leadása", „Részletes adatok"), törlendők eltávolítása (Javaslat „Törlés", Egyezmény „Előzmény megtekintése")
- [x] Ellenőrzés a dev környezetben

### A funkciók fejlesztési sorrendje (javaslat — a döntés a tulajdonosé)

1. [x] **Szavazat leadása** (Javaslat kártya) — ez zárja be a döntéshozatali kört: javaslat → szavazás → egyezmény. SzavazatModal + `GET /api/javaslat/:id/sajat-szavazat` végpont; szavazás, módosítás, visszavonás.
2. [x] **Tudatpont módosítás** (minden kártya) — közös `TudatpontModal` (standard modal-stílus), mind a négy kártyatípus használja. A meglévő `POST /api/tudatpont/hozzarendeles` végpontra épül. ÚJ felmenő-szabály: pont hozzárendelésekor a teljes szülőláncon kell legalább 1 pont; a backend kikényszeríti (`GET /api/tudatpont/hianyzo-felmenok/...` felmérés + `felmenoketAutomatikusan` flag), a frontend a megnyitáskor felméri és hozzájárulás után automatikusan kitölti a hiányzó felmenőket.
3. [x] **Részletes adatok** (minden kártya) — közös `ReszletekModal`, entitástípusonkénti nézettel (Tartalom, Kategória, Tartalomtípus, Javaslat, Egyezmény).
4. [x] **Új tartalom létrehozása ebből** kiterjesztése (javaslat-, kategória-, tartalomtípus- és egyezmény-kártyára) — mind az öt kártyatípus a közös `TartalomModal`-t nyitja, az entitást szülőként átadva (`szuloTipus`). Backend: a Tartalom modell `szuloTipus` enumja bővítve — most már `Kategoria` és `TartalomTipus` is lehet szülő (a korábbi `['Tartalom','Javaslat','Egyezmeny']` mellett). A menüpont mindenhol `tudatpontFuggo`.
5. [x] **Küszöb érték javaslat — KÉSZ mind a három típusra** (2026. 07. 09.): közös `ErtekJavaslatModal` a Tartalom-, Kategória- és Tartalomtípus-kártyán (aktuális medián + saját javaslat betöltése, mentés `POST /api/ertekJavaslat`), és mindhárom **létrehozó modál** (Tartalom, Kategória, Tartalomtípus) bekéri a négy küszöbértéket alapértékekkel. Közös segédek: `kuszobErtekMezok.js` (frontend mezők) + `idoFormazo.js` idő-egység átváltás + `backend/utils/kuszobErtekParser.js` (multipart értékek). A menüpontok `tudatpontFuggo`-k. **Backend általánosítás:** az érték-rendszer entitás-polimorf lett — `ertekJavaslat` és `tartalomErtekHisztogram` modellben `tartalomId` → `entitasId` + `entitasTipus` (enum: Tartalom/Kategoria/TartalomTipus); a repository-k, `ertekSzamitasService`, a controller és az útvonalak (`/api/ertekJavaslat/.../:entitasTipus/:entitasId`) mind entitás-alapúak. A régi (csak tartalom) érték-adatokat eldobtuk; a meglévő entitások első érték javaslatuknál kapják meg a hisztogramjukat. (Böngészős élő teszt még hátra.)
    - Mellékesen javítva: az `ertekJavaslatController` `/reszletek` és `/aktualis` végpontja rossz mezőnevet (`osszesJavaslat`) olvasott a service `osszesErtekJavaslat` helyett → `undefined` volt, most helyes.
6. [ ] **Értesítések** (főmenü) — backend kész, frontend nézet kell
7. [ ] **Tudatpontok nézet** (főmenü) — saját tudatpontok áttekintése, átrendezése
8. [ ] **eember beállítások** (főmenü)
9. [ ] **Új kategória létrehozása ebből** (Kategória kártya) — alkategória létrehozása; backend módosítást is igényel (kategória-hierarchia)
10. [x] **Jogosultság-függő menüpontok** — a kártya-menük megnyitáskor jelzik a jogosultságot: a tudatpontot igénylő menüpontok (Javaslat létrehozása, Szavazat leadása, valamint „Új tartalom/kategória létrehozása ebből") inaktívak (halvány + magyarázó tipp), ha az eembernek nincs tudatpontja az entitáson. Megvalósítás: a menüpont `tudatpontFuggo: true` jelölést kap; a `Kartya` alaposztály a menü megnyitásakor a `GET /api/tudatpont/entitas/:tipus/:id → eemberHozzajarulas` (eemberenkénti `tudatponthozzarendeles.tudatPontok`) alapján tiltja/engedi. A backend a védelmet külön kikényszeríti (javaslatService, szavazatService).
    - **Döntés (2026-07-10) — a backend szabálya a mérvadó:** a szavazati jogosultságot MINDIG az érintett entitás(ok)on lévő tudatpont dönti el (`erintettEntitasok`, ahogy a backend teszi); a javaslaton magán lévő tudatpont hiánya NEM akadály, attól még lehet szavazni. A frontendet ehhez igazítjuk. **Választott megoldás:** a **pakli e-ember-tudatossá tétele** — a `pakliService` megkapja a néző e-ember azonosítóját (a pakli útvonal már `authMiddleware`-es, a `req.user.id` rendelkezésre áll), és a javaslat-kártya adataihoz kiszámolja a `szavazhat` jelzést a backend saját szabályával (`javaslatJogosultsagService`). A frontend a „Szavazat leadása" pontot ez alapján engedi/tiltja (nem a javaslat saját tudatpontja alapján). Ez foundational: az e-ember-tudatos pakli más funkciókhoz is kell (lásd a fejléc saját-tudatpont jelzés jegyzete, [jegyzetek.md](jegyzetek.md), 2026-07-10).
    - **Egyezmény** kártya „Javaslat létrehozása" pontja még 🚧 (nincs kész) — amikor megépül, ugyanígy `tudatpontFuggo` jelölést kap.

### Backend adósságok (a levélben említett „optimalizáció és hiánypótlás")

- [ ] A backend hiányosságainak felmérése és listázása (külön feladat)
- [x] `docker-compose.dev.yml`: `NODEeNV` elírás javítása `NODE_ENV`-re
- [x] **Javaslat szülő + egyezmény hely általánosítása** (2026. 07. 09.): a javaslat MINDIG az érintett entitás gyereke — a szülő polimorf lett (Tartalom/Kategoria/TartalomTipus), a felső szintű `szuloId`-kötelezőség eltávolítva (controller + service + modell). Ezzel megszűnt a „szülő tartalom megadása kötelező" hiba, és **kategórián/tartalomtípuson is lehet javaslatot tenni** (eddig a „csak Tartalom" korlát miatt hibára futott). Az **egyezmény helye** (`egyezmenyTarhelyId`) típusonként auto-levezetve: Törlés → az érintett entitás (a végrehajtó fallback az eredeti szülőre viszi), Módosítás/Áthelyezés → az érintett entitás, Egyesítés → placeholder → az új entitás. Új polimorf mezők: `javaslat.egyezmenyTarhelyTipus`, valamint `javaslat.szuloTipus` / `egyezmeny.szuloId`+`szuloTipus` polimorfra bővítve. A Csomag felső szintű csomagolása külön, későbbi feladat.

---

## Stílus-irányelvek

Az új modalok és menük stílusa a **standard vonalat** kövesse:
- **Irányadó:** a tartalom (entitás) létrehozása modal (`TartalomModal`), a fő hamburger menü, és a kártyák hamburger menüi.
- **Kivétel (szándékosan eltér):** a javaslat-típus választó menü és a `JavaslatModal` — ezt NE vegyük mintának új felületekhez.

---

## Nyitott kérdések

1. A menühálózat később bővül — a bővítéseket ebbe a dokumentumba vezetjük át.
2. A „Részletes adatok" és a „Tudatpont módosítás" pontos tartalmát/felületét az adott feladat megkezdésekor tervezzük meg.
