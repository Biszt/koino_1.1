<!-- docs/teszt.md -->

# koino_1.1 — Tesztelési referencia

> **Cél:** ez a fájl összegyűjti a teszteléshez szükséges **útvonalakat, kötelező
> mezőket és adatokat**, valamint a **böngészős teszt-forgatókönyveket**, hogy ne
> kelljen minden alkalommal a kódból kikeresni őket. A kódból kiolvasott adatokat
> tükrözi — ha a kód változik, ezt is frissítsük.
>
> *Utolsó frissítés: 2026. 07. 12.*

---

## 1. Környezet indítása

| Lépés | Parancs / cím |
|---|---|
| Dev környezet indítása | `docker-compose -f docker-compose.dev.yml up` |
| Frontend + backend | http://localhost:3000 (a backend szolgálja ki a frontendet is) |
| MongoDB kívülről | `mongodb://localhost:27018/koino` (konténeren belül `mongodb:27017`) |
| Backend konténer neve | `koino-backend` |
| MongoDB konténer neve | `koino-mongodb-dev` |

### ⚠️ Fontos Windows-buktató
A nodemon a Docker-volume-on **nem reloadol megbízhatóan** Windowson. **Minden
backend-módosítás után** kézzel újra kell indítani a backendet:

```
docker restart koino-backend
```

A **frontend** (HTML/CSS/JS) build nélküli, statikusan kiszolgált — ott elég a
böngésző **hard refresh** (Ctrl+F5), backend-restart nem kell.

### Naplók nézése
```
docker logs -f koino-backend
```
A kód bőségesen naplóz (`KEZDÉS` / `VÉGE` minták), így a konzol jól követhető.

---

## 2. Teszt-adatok

### 2.1. Teszt e-ember (regisztráció)

> A regisztrációkor minden e-ember **10 000 tudatpontot** kap automatikusan.
> A dev DB időnként ürül — ha a régi teszt-e-emberek eltűntek, regisztrálj újat.

Böngészőben a regisztrációs űrlap mezői (a `POST /api/eember/regisztracio` body-ja):

| Mező | Kötelező | Példa | Megkötés |
|---|---|---|---|
| `eemberNev` | ✅ | `tesztAnna` | egyedi, 3–30 karakter |
| `email` | ✅ | `anna@teszt.hu` | egyedi, kisbetűsít |
| `jelszo` | ✅ | `jelszo123` | min. 6 karakter |
| `nev` | ✅ | `Teszt Anna` | valódi név |
| `lokacio.orszag` | ✅ | `Magyarország` | |
| `lokacio.regio` | ✅ | `Komárom-Esztergom` | |
| `lokacio.telepules` | ✅ | `Tatabánya` | |

**Javasolt teszt-e-emberek** (a szavazás/részvétel teszteléséhez legalább 2–3 kell):

| eemberNev | email | jelszo |
|---|---|---|
| tesztAnna | anna@teszt.hu | jelszo123 |
| tesztBela | bela@teszt.hu | jelszo123 |
| tesztCili | cili@teszt.hu | jelszo123 |

### 2.2. Bejelentkezés
`POST /api/eember/bejelentkezes` — body: `{ azonosito, jelszo }`
(az `azonosito` lehet **email** vagy **eemberNev**). A válasz `token`-jét a frontend
a `localStorage`-ba menti.

---

## 3. Entitások kötelező mezői (létrehozáshoz)

> A frontenden ezeket a **létrehozó modálok** kérik be. Itt a *kötelező* mezők és a
> megkötések láthatók, hogy tudd, mit muszáj kitölteni, és mi az érvényes tartomány.

### 3.1. Tartalom — `POST /api/tartalom` (auth)
| Mező | Kötelező | Megjegyzés |
|---|---|---|
| `cim` | ✅ | szöveg |
| `szoveg` | ❌ | a szövegszerkesztő JSON blokk-tömbje |
| `tartalomTipusId` | ❌ | egy TartalomTipus ObjectId-ja |
| `kategoriaIds` | ❌ | max. 3, egyediek |
| `szuloId` + `szuloTipus` | ❌ | ágaztatásnál; ha az egyik van, a másik is kell. `szuloTipus` ∈ `Tartalom, Javaslat, Egyezmeny, Kategoria, TartalomTipus` |
| (küszöbértékek) | ❌ | a létrehozó modál is bekéri, alapértékekkel — lásd 4. szakasz |

### 3.2. Kategória — `POST /api/kategoria` (auth, **multipart**, ikon-feltöltés)
| Mező | Kötelező | Megjegyzés |
|---|---|---|
| `nev` | ✅ | egyedi, 2–50 karakter |
| `ikon` | ✅ | **feltöltött fájl** (kép) — minden kategóriának kell ikon |
| `leiras` | ❌ | szövegszerkesztő JSON |
| `szuloId` + `szuloTipus` | ❌ | ágaztatásnál |

### 3.3. Tartalomtípus — `POST /api/tartalomTipus` (auth, **multipart**, ikon-feltöltés)
| Mező | Kötelező | Megjegyzés |
|---|---|---|
| `nev` | ✅ | 2–50 karakter |
| `ikon` | ✅ | **feltöltött fájl** (kép) |
| `leiras` | ❌ | szövegszerkesztő JSON |
| `szuloId` + `szuloTipus` | ❌ | ágaztatásnál |

### 3.4. Javaslat — `POST /api/javaslat` (auth)
| Mező | Kötelező | Megjegyzés |
|---|---|---|
| `javaslatTipus` | ✅ | `Torles, Modositas, Egyesites, Athelyezes, Csomag` |
| `erintettEntitasok[]` | ✅ | min. 1; elemenként `entitasId`, `entitasTipus` (`Tartalom/Kategoria/TartalomTipus`), `muvelet` |
| `indoklas` | ❌ | szövegszerkesztő JSON; **opcionális** (nincs kötelezőség, nincs min. karakter) |
| `kezdoTudatpont` | ✅ | a controller kötelezővé teszi (a javaslattevő induló pontja) |
| `szuloId` | — | **NEM a frontend adja** — a service teszi az érintett entitás alá |
| `egyezmenyTarhelyId` (+`egyezmenyTarhelyTipus`) | Csomagnál ✅, egyébként ❌ | hova kerül az elfogadott javaslat **egyezménye**. **Csomagnál KÖTELEZŐ** (a létrehozó dönt); a service minden csomag-töredékre ezt írja. Más típusnál lehet **null** (a modell elfogadja), a service vezeti le (Módosítás/Áthelyezés → érintett entitás, Törlés → szülő, Egyesítés → új entitás) |

> A javaslattevés feltétele, hogy az e-embernek **legyen tudatpontja az érintett
> entitáson** (a menüpont `tudatpontFuggo`, backend is kikényszeríti).
>
> **Új (2026-07-12): cím-alapú kereső minden ID-mezőben.** A JavaslatModal ID-mezői
> (áthelyezés cél, egyesítés forrás/szülő, csomag tétel-entitás/áthelyezés-cél, egyezmény
> tárhely) most a közös `EntitasKeresoMezo`-t használják: a felhasználó **cím alapján
> keres** és a legördülő találatból választ; a nyers 24-hex **ObjectId** beírása is működik
> (fallback). A szövegszerkesztő entitás-hivatkozás panelje szintén kap cím-keresőt.

### 3.5. Tudatpont-hozzárendelés — `POST /api/tudatpont/hozzarendeles` (auth)
Body: `{ entitasId, entitasTipus, pontok }`
Az **új felmenő-szabály**: pont hozzárendelésekor a teljes szülőláncon kell legalább
1 pont. A frontend megnyitáskor felméri (`GET /api/tudatpont/hianyzo-felmenok/:entitasTipus/:entitasId`),
és hozzájárulás után automatikusan kitölti a hiányzó felmenőket.

### 3.6. Szavazat — `POST /api/javaslat/szavazat` (auth)
Body: `{ javaslatId, szavazatTipus }` — `szavazatTipus` ∈ `Tamogat, Ellenez, Tartozkodik`.
Visszavonás: `DELETE /api/javaslat/szavazat`, body: `{ javaslatId }`.
Feltétel: tudatpont az érintett entitáson.
**UI (SzavazatModal):** a típus-gombok és a „Visszavonás" CSAK helyben választanak;
a tényleges szerverhívás (leadás/módosítás/visszavonás) a **„Rendben"** gombra
történik. Bezárás „Rendben" nélkül (X/ESC) = nincs változás. A „Szavazat leadása"
menüpont csak **Aktiv** státuszú javaslatnál jelenik meg.

### 3.7. Entitás-kereső (cím alapján) — `GET /api/kereses` (auth)

A cím-alapú entitás-választó backendje (a JavaslatModal mezői és a szövegszerkesztő
hivatkozás-panelje használja).

**Query paraméterek:**
| Paraméter | Kötelező | Megjegyzés |
|---|---|---|
| `q` | ✅ | keresőszöveg (cím/név-részlet, kis/nagybetű független, részleges egyezés) |
| `tipusok` | ❌ | vesszős lista: `Tartalom,Kategoria,TartalomTipus` (alap: mind a három) |
| `limit` | ❌ | típusonkénti max. találat, 1–50, alap 10 |

**Válasz:** `{ success: true, talalatok: [{ entitasId, entitasTipus, cim }] }`.
Csak a **cím-viselő** három típusra keres (Tartalom címe = `cim`, Kategória/Tartalomtípus = `nev`).
Egyezmény/Javaslat típus a keresőben nincs — azok a nyers ID-fallbackkal érhetők el.

---

## 4. Küszöb érték javaslat (a mostani teszt fókusza)

**Végpont:** `POST /api/ertekJavaslat` (auth). **Entitás-polimorf** — Tartalomra,
Kategóriára és Tartalomtípusra is működik.

**Body / mezők és tartományok:**
| Mező | Kötelező | Tartomány | Alapérték |
|---|---|---|---|
| `entitasId` | ✅ | ObjectId | — |
| `entitasTipus` | ✅ | `Tartalom / Kategoria / TartalomTipus` | `Tartalom` |
| `javaslatElfogadasiKuszob` | ✅ | egész **51–100** (%) | — |
| `reszveteliAranyKuszob` | ✅ | egész **0–100** (%) | — |
| `minimumDontesiIdo` | ✅ | egész **≥ 0** mp | 0 |
| `maximumDontesiIdo` | ✅ | egész **0 – 315 360 000** mp (max 10 év) | 31 536 000 (1 év) |

> **Egyediség:** egy e-ember egy entitáshoz **csak egy** érték javaslatot adhat
> (`entitasId + entitasTipus + eemberId` egyedi) — újraküldés **felülírja** a
> korábbit (nem hibázik).

**Kapcsolódó lekérdező végpontok:**
| Cél | Végpont |
|---|---|
| Aktuális (medián) értékek | `GET /api/ertekJavaslat/aktualis/:entitasTipus/:entitasId` |
| Saját érték javaslat | `GET /api/ertekJavaslat/sajat/:entitasTipus/:entitasId` (auth) |
| Eloszlás (érték → darab) | `GET /api/ertekJavaslat/eloszlas/:entitasTipus/:entitasId` |
| Részletek (opcionális auth) | `GET /api/ertekJavaslat/reszletek/:entitasTipus/:entitasId` |

---

## 5. Böngészős teszt-forgatókönyvek

> Jelölés: ⬜ = tesztelendő, ✅ = OK, ❌ = hiba (írd mellé a hibát).
> A **fő teszt** a lenti **Nagy körteszt** (teljes életciklus, két döntési ággal). Az
> 5/b. „Célzott mélytesztek" ugyanezeket a részeket bontják ki külön, ha egy funkciót
> önmagában akarunk vizsgálni.

---

## 5/a. 🔴 NAGY KÖRTESZT — teljes életciklus (fő menet)

Egy összefüggő menet, ami a program nagy részét lefedi: regisztrációtól a
döntéshozatali kör lezárásáig (javaslat → szavazás → **egyezmény**), **két ággal**:
egy **elfogadás** és egy **elutasítás (lejáratkor)**.

### Megfigyelés végig — 4 csatorna
Minden lépésnél párhuzamosan figyeljük:
1. **UI** — sikeres visszajelzés, pakli frissül-e (vagy kell reload), validáció, jogosultsági állapotok.
2. **Böngésző konzol** (F12) — piros JS-hiba? Network: helyes végpont + **2xx** vs **4xx/5xx**.
3. **Backend napló** — `docker logs -f koino-backend`: `KEZDÉS/VÉGE`, `❌`, és a `⏰` cron-sorok.
4. **DB** — `docker exec koino-mongodb-dev mongosh koino --eval "..."` (parancsok a szakasz végén).

> **Fontos a döntéshez** ([javaslatIdozitesService.js:235](../backend/services/javaslat/javaslatIdozitesService.js)):
> a hatályba lépéskor `Elfogadva`, ha **támogatottság ≥ elfogadási küszöb** ÉS
> **részvétel ≥ részvételi küszöb**; különben **`Elvetve`**. A küszöböket **csak a
> `Tartalom` típusú** érintettekből átlagolja — kategória/tartalomtípus javaslatnál
> alapértelmezett **51% / 0%** él (lásd 6. buktatók). Ezért mindkét döntési ág
> **Tartalmon** fut.

### 0. Előkészület
1. ⬜ `docker-compose -f docker-compose.dev.yml up` → http://localhost:3000 megnyílik.
   - **Adatbázis-tisztítás (a menet MINDIG ezzel kezd):** a korábbi tesztadatok törlése tiszta indulásért:
     ```bash
     docker exec koino-mongodb-dev mongosh koino --quiet --eval "db.dropDatabase()"
     ```
     (majd böngésző hard refresh — Ctrl+F5; a kijelentkezéshez töröld a `localStorage` tokent is, ha bent ragadt.)
2. ⬜ Regisztrálj **3 e-embert**: `tesztAnna`, `tesztBela`, `tesztCili` (mind 10 000 tudatpont — DB-ben ellenőrizhető).
3. ⬜ `tesztAnna`-val hozz létre egy **Kategóriát** és egy **Tartalomtípust** (mindkettőhöz **ikon-feltöltés** kell).

### 1. Alapentitások + küszöbök a létrehozó modálban
4. ⬜ Hozz létre **Tartalom-A**-t (elfogadás-ág): a létrehozó modál küszöb-mezőit állítsd
   **elfogadás 60 / részvétel 60 / min 0 / max 3 perc**.
5. ⬜ Hozz létre **Tartalom-B**-t (elutasítás-ág): **elfogadás 60 / részvétel 90 / min 0 / max 3 perc**.
   - *Elvárt:* mindkét kártya megjelenik a pakliban; DB-ben a `tartalomertekhisztograms` létrejön (első érték javaslat).

### 2. Tudatpont-hozzárendelés + felmenő-szabály
6. ⬜ **Mind a 3 e-emberrel** rendelj tudatpontot **Tartalom-A**-ra és **Tartalom-B**-re
   (ehhez ki/bejelentkezés a 3 e-ember közt).
   - *Elvárt:* a felmenő-szabály a szülőláncot is kitölti; DB-ben a `tudatpont`-hozzárendelések látszanak,
     az érintett tartalmon **3 tudatpont-tulajdonos** (ez a részvétel nevezője).

### 3. Ágaztatás („Új tartalom létrehozása ebből")
7. ⬜ Egy kártya menüjéből *Új tartalom létrehozása ebből* → a `TartalomModal` szülő-adatokkal nyílik.
   - *Elvárt:* az új tartalom `szuloId` + `szuloTipus` az ág-adott entitásra mutat (DB-ben ellenőrizhető).

### 4. Küszöb érték javaslat — mindhárom típuson (utólag is)
8. ⬜ Nyisd meg a **Tartalom** / **Kategória** / **Tartalomtípus** kártya *Küszöb érték javaslat* pontját.
   - *Elvárt:* betölti az aktuális mediánt + a saját javaslatot; mentés után újranyitva **visszatöltődik**.
9. ⬜ Határeset: elfogadás **50**/**101** vagy tört szám → **elutasítás**; ugyanarra kétszer mentve → **felülír** (nem hibázik).

### 5. Javaslat létrehozása — polimorf (a B) fókusz)
10. ⬜ **Kategórián** és **Tartalomtípuson** is *Javaslat létrehozása* → **NEM** fut „szülő tartalom kötelező" hibára.
11. ⬜ **Tartalom-A**-ra hozz létre egy **Módosítás** javaslatot (indoklással); ez lesz az **elfogadás-ág** javaslata.
12. ⬜ **Tartalom-B**-re hozz létre egy **Módosítás** javaslatot; ez lesz az **elutasítás-ág** javaslata.
    - *Elvárt:* DB `javaslats`: `statusz: Aktiv`, `szuloId/szuloTipus` az érintett tartalomra, `hatalybaLepesIdeje` a ~3 perces ablakban.

### 6. Szavazás (a két ág szétválik)
13. ⬜ **Elfogadás-ág (Tartalom-A javaslata):** mind a 3 e-ember **Támogat**.
    - *Elvárt:* részvétel 100% ≥ 60% ✓, támogatottság 100% ≥ 60% ✓. A magas BM miatt a döntési idő lerövidül → **hamar Elfogadva**.
14. ⬜ **Elutasítás-ág (Tartalom-B javaslata):** **csak 1** e-ember (pl. tesztAnna) szavaz (Támogat).
    - *Elvárt:* részvétel 33% < 90% → a küszöb sosem teljesül; alacsony BM → a döntési idő kifut a **max 3 percig**.
15. ⬜ Közben: korábbi szavazat **kiemelése**, **módosítása**, **visszavonása** működik; a kártyán a
    szavazás állása, **bizonyossági mutató** és **döntési idő** frissül.

> **Modell A (szavazási arányok) — 2026-07-11:** a támogatottsági / ellenzői / tartózkodói arány
> mostantól **tiszta szelet** (mindegyik = az adott szavazat-szám / összes szavazó × 100), és a három
> együtt **mindig 100%**. A tartózkodás már **nem** „fél-támogatás": csökkenti a támogatottságot, így
> sok tartózkodó mellett **nehezebb az elfogadás** (az elfogadási küszöb a tiszta támogató%-ot nézi).
> A **bizonyossági mutató** értéke változatlan: `( |támogató% − ellenző%| + részvételi% ) / 2`.

### 7. A kör lezárása (cron, percenként)
16. ⬜ **Elfogadás-ág:** figyeld a backend naplót (`⏰` + `Küszöbök ellenőrzése` + `Elfogadva`).
    - *Elvárt:* a javaslat `Elfogadva`, és **egyezmény jön létre** az érintett tartalomnál (Módosítás → érintett entitás).
      UI-ban megjelenik az **egyezmény kártya**; DB `egyezmenys` új dokumentum a helyes `szuloId/szuloTipus`-szal.
17. ⬜ **Elutasítás-ág:** ~3 perc után a cron lezárja.
    - *Elvárt:* a javaslat **`Elvetve`** (napló: `Elvetve`), **nincs egyezmény**, a tudatpontok visszaosztódnak.

### 8. Kiegészítő ellenőrzések
18. ⬜ *Részletes adatok* modál mind az 5 kártyatípuson megnyílik, helyes adatokkal.
19. ⬜ Jogosultság: olyan entitáson, ahol nincs tudatpontod, a tudatpont-függő menüpontok **halványak** + tooltip;
    tudatpont adása után **aktívak**.
20. ⬜ Pakli: a javaslatok/egyezmény az érintett entitás alatt jelennek meg.

### Hasznos ellenőrző parancsok (DB — a konténerből)
```bash
# Kollekciónevek (ha bizonytalan a név)
docker exec koino-mongodb-dev mongosh koino --eval "db.getCollectionNames()"

# e-emberek és tudatpont-egyenlegük
docker exec koino-mongodb-dev mongosh koino --eval "db.eembers.find({},{eemberNev:1,tudatpontok:1}).pretty()"

# Egy entitás érték javaslatai (polimorf) + a hisztogram megléte
docker exec koino-mongodb-dev mongosh koino --eval "db.ertekjavaslats.find().pretty()"
docker exec koino-mongodb-dev mongosh koino --eval "db.tartalomertekhisztograms.find().pretty()"

# Javaslatok státusza, számított értékei, hatályba lépés
docker exec koino-mongodb-dev mongosh koino --eval "db.javaslats.find({},{javaslatTipus:1,statusz:1,tamogatotsagiArany:1,ellenzoiArany:1,tartozkodoiArany:1,reszveteliArany:1,bizonyossagiMutato:1,dontesiIdo:1,hatalybaLepesIdeje:1,szuloTipus:1,egyezmenyTarhelyTipus:1}).pretty()"

# Egyezmények (a lezárás után) + helyük  [kollekció: egyezmenies]
docker exec koino-mongodb-dev mongosh koino --eval "db.egyezmenies.find().pretty()"

# Szavazatok egy javaslatra
docker exec koino-mongodb-dev mongosh koino --eval "db.szavazats.find().pretty()"

# Cron kézi kiváltása helyett: a napló figyelése
docker logs -f koino-backend
```

---

## 5/b. Célzott mélytesztek (kiegészítő — egy-egy rész külön)

### Előkészület
1. ⬜ `docker-compose -f docker-compose.dev.yml up`, majd http://localhost:3000 megnyílik.
2. ⬜ Regisztrálj `tesztAnna`-t (10 000 tudatpont jár).
3. ⬜ Hozz létre egy **Kategóriát** (ikon-feltöltéssel) és egy **Tartalomtípust** (ikon-feltöltéssel).
4. ⬜ Hozz létre egy **Tartalmat** (cím kötelező); a létrehozó modál a **küszöbértékeket** is bekéri.

### A) Küszöb érték javaslat — mindhárom entitástípuson
5. ⬜ **Tartalom** kártya → menü → *Küszöb érték javaslat*: az `ErtekJavaslatModal` megnyílik,
   betölti az aktuális mediánt és a saját javaslatot (első alkalommal üres).
6. ⬜ Adj meg érvényes értékeket (pl. elfogadás **60**, részvétel **30**, min **0**, max **1 év**) → **mentés** sikeres.
7. ⬜ Nyisd meg újra: a **saját** érték javaslat visszatöltődik.
8. ⬜ Ismételd a **Kategória** kártyán (menüpont csak akkor aktív, ha van tudatpontod rajta).
9. ⬜ Ismételd a **Tartalomtípus** kártyán.
10. ⬜ **Létrehozó modál teszt:** új Tartalom/Kategória/Tartalomtípus létrehozásakor a
    négy küszöbérték-mező megjelenik alapértékekkel, és menthető.

**Határeset-ellenőrzések (A):**
11. ⬜ Elfogadási küszöb **50** vagy **101** → elutasítás (érvényes: 51–100).
12. ⬜ Nem egész szám → elutasítás.
13. ⬜ Ugyanarra az entitásra **másodszor** is menteni → **felülírja**, nem hibázik.

### B) Polimorf általánosítás — javaslat kategórián / tartalomtípuson
14. ⬜ **Kategória** kártya → menü → *Javaslat létrehozása*: **NEM** fut „szülő tartalom
    kötelező" hibára (ez volt a régi bug), a javaslat elkészül.
15. ⬜ **Tartalomtípus** kártyán ugyanígy: *Javaslat létrehozása* működik.
16. ⬜ **Tartalom** kártyán is működik (regresszió-ellenőrzés).
17. ⬜ A létrejött javaslat a **pakliban** az érintett entitás alatt jelenik meg (a javaslat
    az érintett entitás gyereke).

**Egyezmény helye (B) — típusonként (elfogadás után):**
> Az egyezmény akkor jön létre, ha a javaslatot elfogadják. Gyorsítható: alacsony
> küszöb + rövid `maximumDontesiIdo`, vagy a lejáró javaslatokat a cron zárja.
18. ⬜ **Módosítás/Áthelyezés** javaslat elfogadása → az egyezmény az **érintett entitásnál** jön létre.
19. ⬜ **Törlés** javaslat elfogadása → az egyezmény az érintett entitás **szülőjénél** (fallback) jön létre.
20. ⬜ **Egyesítés** → az egyezmény az **új entitásnál** jön létre (placeholder → valódi).

### C) Jogosultság-függő menüpontok (regresszió)
21. ⬜ Olyan entitáson, ahol **nincs** tudatpontod: a *Javaslat létrehozása*, *Szavazat leadása*,
    *Új tartalom/kategória létrehozása ebből* menüpontok **halványak** és magyarázó tippet adnak.
22. ⬜ *Tudatpont módosítás*sal adj pontot → a fenti menüpontok **aktívvá** válnak (a felmenő-szabály
    a szülőláncot is kitölti).

### D) Döntéshozatali kör (regresszió, ha marad idő)
23. ⬜ Javaslatra több e-emberrel **szavazás** (Támogat/Ellenez/Tartózkodik), korábbi szavazat kiemelése, **visszavonás**.
24. ⬜ *Részletes adatok* modál minden kártyatípuson megnyílik és a helyes adatokat mutatja.

### E) Cím-alapú kereső + csomag kötelező egyezmény-tárhely (ÚJ, 2026-07-12)
25. ⬜ **Kereső — JavaslatModal:** indíts pl. *Áthelyezés* javaslatot; az „Új szülő tartalom"
    mezőbe **cím-részletet** gépelve legördül a találati lista, kiválasztás után a mező **zöld
    megerősítést** ad („✓ Tartalom: …"). Ellenőrizd a Network fülön: `GET /api/kereses?q=…`.
26. ⬜ **Nyers ID fallback:** ugyanabba a mezőbe egy **24-hex ObjectId**-t beírva közvetlenül
    feloldódik (nincs szükség keresésre).
27. ⬜ **Csomag — kötelező tárhely:** *Csomag* javaslatnál a 3. lépésen az „Egyezmény tárhely"
    felirat **`*`**-ot kap; **üresen** hagyva a beküldés **hibát** ad
    („Csomag javaslatnál kötelező kiválasztani az egyezmény tárhelyét").
28. ⬜ **Csomag — tényleges hatás:** válassz tárhelyet (cím-keresővel), állíts össze legalább
    **2 vegyes műveletet**, küldd be. DB-ben minden csomag-töredék `egyezmenyTarhelyId`-je a
    **választott** entitás (nem a tételek saját entitása):
    ```bash
    docker exec koino-mongodb-dev mongosh koino --eval "db.javaslats.find({toredekCsoportId:{$ne:null}},{javaslatTipus:1,egyezmenyTarhelyId:1,toredekCsoportId:1}).pretty()"
    ```
    Elfogadás után az **egyezmény a választott tárhelyen** jön létre.
29. ⬜ **Szerkesztő hivatkozás-kereső:** egy szövegblokkban az entitás-hivatkozás panelen
    cím-keresés → találat kiválasztása kitölti az ID-t és a típust → **Oké** beszúrja a
    hivatkozást; a régi kézi ID + Oké út is működik.

---

## 6. Ismert megjegyzések / buktatók

- **⚠️ Küszöb csak Tartalomból (vizsgálandó):** a döntéskor a küszöböket az
  `erintettTartalmakKuszobertekenekLekerese` **csak a `Tartalom` típusú** érintett
  entitásokból átlagolja. Ha a javaslat kategórián/tartalomtípuson van (nincs köztük
  Tartalom), **alapértelmezett 51% / 0%** küszöb él — a rájuk beállított küszöb érték
  javaslatot a döntés **nem** veszi figyelembe. Lehet szándékos, de lehet a polimorf
  átállás hiánya is. **Teszt közben figyeljük**, és ha hiba, külön feladatként javítjuk.
- **Nyitott finomság (terv 10. pont):** a szavazás backend-szabálya a javaslat
  *érintett entitásait* nézi, a frontend viszont a javaslat entitásán ellenőriz.
  A felmenő-szabály miatt általában egybeesnek, de eltérhet — érdemes fejben tartani.
- **Töredékcsoport (Csomag/Egyesítés) döntése — ÉS-szabály + közös MAX döntési idő (2026-07-12):**
  minden töredék a SAJÁT érintett entitásának tudatpont-táborával dől el (külön részvétel/küszöb);
  a csoport csak akkor `Elfogadva`, ha MINDEN töredék teljesíti a saját küszöbét, különben az EGÉSZ
  `Elvetve` (védi a kis táború entitást). A csoport **közös döntési ideje = a töredékek döntési
  idejének MAXIMUMA** (a leglassabb töredék diktál); a kártyák a csoport minden töredékén ugyanezt
  a ⏱-t mutatják. *(Ekkor javítva egy régi hiba is: a közös időzítés `findAll({toredekCsoportId})`-val
  a DB összes javaslatán számolt — most `findByToredekCsoportId` szűr helyesen a csoportra.)*
- **Egyezmény kártya „Javaslat létrehozása"** menüpont még 🚧 (nincs kész).
- Régi (csak tartalom) érték-adatokat a polimorf átállásnál eldobtuk; a meglévő
  entitások az **első** érték javaslatnál kapják meg a hisztogramjukat.

---

## 7. Teszt-eredmények — 2026-07-09 (Nagy körteszt, hibrid futtatás)

Böngészős + API/DB hibrid menet, 3 e-emberrel (tesztAnna/Bela/Cili), tiszta DB-ről.

### ✅ Igazolt (működik)
- **Regisztráció + bejelentkezés** (UI): 3 e-ember, mind 10 000 tudatpont.
- **Tartalom létrehozása küszöbökkel** (UI): Tartalom-A (60/60/0/3perc) és Tartalom-B
  (60/**90**/0/3perc); a `3 perc → 180 mp` időátváltás a DB-ben helyes.
- **Küszöb érték javaslat entitás-polimorf**: az első érték javaslatnál **létrejön a
  hisztogram mind a 3 típusra** (Tartalom, Kategória, Tartalomtípus).
- **Kezdő tudatpont**: a létrehozó egyenlege helyesen csökken (Anna 10000 → 9600 = 4×100).
- **Tudatpont-hozzárendelés** (API): Béla+Cili 100-100 pontja A-ra és B-re → 3 tulajdonos.
- **Javaslat polimorf** (a fő B) fókusz): **kategórián és tartalomtípuson is 201**,
  „szülő tartalom kötelező" hiba **nélkül**.
- **Döntési kör – ELFOGADÁS-ág** (Tartalom-A): 3 Támogat → részvétel 100% ≥ 60%,
  támogatottság 100% ≥ 60% → **Elfogadva** → **egyezmény a Tartalomnál**, és a Módosítás
  végrehajtva (a cím „Tartalom-A ELFOGADVA" lett). A UI is tükrözi.
- **Döntési kör – ELUTASÍTÁS-ág** (Tartalom-B): csak a létrehozó szavazata → részvétel
  33% < 90% → a döntési idő lejártakor **Elvetve**, nincs egyezmény. ✅ (épp a kért eset)
- **Egyezmény helye polimorf**: Módosítás → az érintett entitásnál jön létre; igazolva
  **Tartalmon** és **Kategórián** is (`szuloTipus` helyes).
- **A cron** percenként lezárja a lejáró javaslatokat; az elfogadott Módosítás
  javaslatból egyezmény lesz (a javaslat „átalakul", nem marad Aktiv listában).

### 🔴 Találatok (javítandó)
1. **Üres/friss adatbázison a főoldal nem tölt be.** [`Pakli.js:122`](../frontend/js/components/Pakli.js:122)
   null-ellenőrzés nélkül olvassa a `eredmeny.kivalasztottEntitas.entitasId`-t, miközben
   a backend üres paklinál `kivalasztottEntitas: null`-t ad ([`pakliService.js:40`](../backend/services/pakliService.js:40)).
   Hibaüzenet: „Cannot read properties of null (reading 'entitasId')". Kerülő út: az első
   tartalom létrehozása (a menü a hiba ellenére működik) feloldja. **Javítandó** (null-ág:
   üres pakli barátságos üres állapottal).
2. **⚠️ Kategória/tartalomtípus javaslat a saját küszöbét figyelmen kívül hagyja.** A döntés
   az `erintettTartalmakKuszobertekenekLekerese`-vel **csak `Tartalom` típusú** érintettekből
   átlagol; nem-Tartalomnál **alapértelmezett 51% / 0%** küszöb él. A teszt igazolta: a
   kategória-javaslat 51/0-val fogadódott el, nem a kategóriára beállított értékekkel.
   Eldöntendő: szándékos-e; ha nem, a küszöb-lekérést ki kell terjeszteni mindhárom típusra.

### ⏳ Időzítési tanulság (nem hiba)
- Egy **magányos létrehozó** automatikus Támogat szavazata 100% támogatottságot ad → magas
  BM → **rövid döntési idő** (pl. 60 mp min 0-nál). Ezért a támogató szavazatoknak
  **gyorsan** kell jönniük, különben a javaslat a részvétel elérése előtt lezárul (nálunk
  az első A-javaslat így lett tévesen Elvetve). Böngészős teszthez érdemes a **min döntési
  időt** nagyobbra (pl. 2 perc) állítani, hogy legyen idő végigszavazni.

### ⬜ Böngészőben még nem ellenőrzött (API/DB-vel igen)
- Szavazat-UI (SzavazatModal): korábbi szavazat kiemelése, módosítás, visszavonás.
- Jogosultság-függő menük halványítása olyan entitáson, ahol nincs tudatpont.
- „Részletes adatok" modál tartalma; egyezmény-kártya külön megjelenítése a pakliban.
