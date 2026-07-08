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
| Küszöb érték javaslat | 🚧 | ÚJ menüpont — backend oldalon az ertekJavaslat útvonalak léteznek |

### 3. Javaslat kártya menü (`JavaslatKartya.js`)

| Menüpont | Állapot | Megjegyzés |
|---|---|---|
| Szavazat leadása | ✅ | SzavazatModal — támogat/ellenez/tartózkodik, korábbi szavazat kiemelve, visszavonás |
| Új tartalom létrehozása ebből | 🚧 | ÚJ menüpont |
| Tudatpont módosítás | ✅ | TudatpontModal — saját pont módosítása + felmenő-szabály |
| Részletes adatok | 🚧 | Most „Részletek megtekintése" néven, csak console.log |
| ~~Törlés~~ | ❌ | Nem része a tervnek (a törlés javaslat/szavazás útján történik) — a tulajdonos jóváhagyta a törlését |

### 4. Tartalomtípus kártya menü (`TartalomTipusKartya.js`)

| Menüpont | Állapot | Megjegyzés |
|---|---|---|
| Új tartalom létrehozása ebből | 🚧 | ÚJ menüpont |
| Javaslat létrehozása | ✅ | |
| Tudatpont módosítás | ✅ | TudatpontModal — saját pont módosítása + felmenő-szabály |
| Részletes adatok | 🚧 | ÚJ menüpont |
| Küszöb érték javaslat | 🚧 | ÚJ menüpont |

### 5. Kategória kártya menü (`KategoriaKartya.js`)

| Menüpont | Állapot | Megjegyzés |
|---|---|---|
| Új tartalom létrehozása ebből | 🚧 | ÚJ menüpont |
| Új kategória létrehozása ebből | 🚧 | ÚJ menüpont — az így létrehozott kategória ALKATEGÓRIA lesz; backend módosítás is kell hozzá (kategória-hierarchia) |
| Javaslat létrehozása | ✅ | |
| Tudatpont módosítás | ✅ | TudatpontModal — saját pont módosítása + felmenő-szabály |
| Részletes adatok | 🚧 | ÚJ menüpont |
| Küszöb érték javaslat | 🚧 | ÚJ menüpont |

### 6. Egyezmény kártya menü (`EgyezmenyKartya.js`)

| Menüpont | Állapot | Megjegyzés |
|---|---|---|
| Új tartalom létrehozása ebből | 🚧 | ÚJ menüpont |
| Javaslat létrehozása | 🚧 | ÚJ menüpont |
| Tudatpont módosítás | ✅ | TudatpontModal — saját pont módosítása + felmenő-szabály |
| Részletes adatok | 🚧 | Most „Részletek megtekintése" néven, csak console.log |

---

## Fejlesztési fázisok

### 0. fázis — A menüváz kiépítése (ez teszi „élővé" a tervet)

- [x] Közös `FejlesztesreVar` üzenet-komponens létrehozása (egységes modal/üzenet) — `frontend/js/components/FejlesztesreVar.js` + CSS
- [x] Minden menü igazítása a fenti hálózathoz: hiányzó pontok felvétele 🚧 ikonnal és akcióval, feliratok egységesítése („Szavazat leadása", „Részletes adatok"), törlendők eltávolítása (Javaslat „Törlés", Egyezmény „Előzmény megtekintése")
- [x] Ellenőrzés a dev környezetben

### A funkciók fejlesztési sorrendje (javaslat — a döntés a tulajdonosé)

1. [x] **Szavazat leadása** (Javaslat kártya) — ez zárja be a döntéshozatali kört: javaslat → szavazás → egyezmény. SzavazatModal + `GET /api/javaslat/:id/sajat-szavazat` végpont; szavazás, módosítás, visszavonás.
2. [x] **Tudatpont módosítás** (minden kártya) — közös `TudatpontModal` (standard modal-stílus), mind a négy kártyatípus használja. A meglévő `POST /api/tudatpont/hozzarendeles` végpontra épül. ÚJ felmenő-szabály: pont hozzárendelésekor a teljes szülőláncon kell legalább 1 pont; a backend kikényszeríti (`GET /api/tudatpont/hianyzo-felmenok/...` felmérés + `felmenoketAutomatikusan` flag), a frontend a megnyitáskor felméri és hozzájárulás után automatikusan kitölti a hiányzó felmenőket.
3. [ ] **Részletes adatok** (minden kártya) — közös részletező nézet entitástípusonkénti tartalommal
4. [ ] **Új tartalom létrehozása ebből** kiterjesztése (javaslat-, kategória-, tartalomtípus- és egyezmény-kártyára) — a TartalomKartya meglévő megoldása újrafelhasználható
5. [ ] **Küszöb érték javaslat** (tartalom-, kategória-, tartalomtípus-kártya) — backend útvonalak léteznek
6. [ ] **Értesítések** (főmenü) — backend kész, frontend nézet kell
7. [ ] **Tudatpontok nézet** (főmenü) — saját tudatpontok áttekintése, átrendezése
8. [ ] **eember beállítások** (főmenü)
9. [ ] **Új kategória létrehozása ebből** (Kategória kártya) — alkategória létrehozása; backend módosítást is igényel (kategória-hierarchia)
10. [x] **Jogosultság-függő menüpontok** — a kártya-menük megnyitáskor jelzik a jogosultságot: a tudatpontot igénylő menüpontok (Javaslat létrehozása, Szavazat leadása, valamint „Új tartalom/kategória létrehozása ebből") inaktívak (halvány + magyarázó tipp), ha az eembernek nincs tudatpontja az entitáson. Megvalósítás: a menüpont `tudatpontFuggo: true` jelölést kap; a `Kartya` alaposztály a menü megnyitásakor a `GET /api/tudatpont/entitas/:tipus/:id → eemberHozzajarulas` (eemberenkénti `tudatponthozzarendeles.tudatPontok`) alapján tiltja/engedi. A backend a védelmet külön kikényszeríti (javaslatService, szavazatService).
    - **Nyitott finomság:** a szavazás backend-szabálya a javaslat *érintett entitásait* (`erintettEntitasok`) nézi, a frontend viszont egyszerűsítve a javaslat entitásán ellenőriz. A felmenő-szabály miatt ez általában egybeesik, de eltérhet — ha zavaró, a Javaslat kártyán az érintett tartalomra kell ellenőrizni (esetleg backend `szavazhat` jelzéssel).
    - **Egyezmény** kártya „Javaslat létrehozása" pontja még 🚧 (nincs kész) — amikor megépül, ugyanígy `tudatpontFuggo` jelölést kap.

### Backend adósságok (a levélben említett „optimalizáció és hiánypótlás")

- [ ] A backend hiányosságainak felmérése és listázása (külön feladat)
- [x] `docker-compose.dev.yml`: `NODEeNV` elírás javítása `NODE_ENV`-re

---

## Stílus-irányelvek

Az új modalok és menük stílusa a **standard vonalat** kövesse:
- **Irányadó:** a tartalom (entitás) létrehozása modal (`TartalomModal`), a fő hamburger menü, és a kártyák hamburger menüi.
- **Kivétel (szándékosan eltér):** a javaslat-típus választó menü és a `JavaslatModal` — ezt NE vegyük mintának új felületekhez.

---

## Nyitott kérdések

1. A menühálózat később bővül — a bővítéseket ebbe a dokumentumba vezetjük át.
2. A „Részletes adatok" és a „Tudatpont módosítás" pontos tartalmát/felületét az adott feladat megkezdésekor tervezzük meg.
