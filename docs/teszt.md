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
| `meghivoKod` | ⚙️ | `MCUQ-QDQA-Q8R5` | CSAK ha `MEGHIVAS_KOTELEZO=true` (backend/.env); a mező az űrlapon is csak ekkor látszik. Fejlesztés alatt a kapcsoló `false` → nyílt regisztráció. |

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
| `indoklas` | ✅ | szövegszerkesztő JSON; **kötelező** (nem lehet üres), de **nincs min. karakterszám** (2026-07-14) |
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
| `agEntitasId` | ❌ | ÁG-SZŰRŐ (2026-07-18 óta): csak az adott entitás ága alatti találatok (ős-lánc bejárás; a kártya-menük Keresés pontja használja) |

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

### F) Értesítések — postafiók + olvasatlan badge (ÚJ, 2026-07-15)

> **Végpontok:** `GET /api/ertesitesek?lap=&lapMeret=&agEntitasId=` (postafiók, lapozva;
> az `agEntitasId` opcionális ÁG-SZŰRŐ — csak az adott entitás ága alatti értesítések,
> osLanc-alapon) · `GET /api/ertesitesek/olvasatlan-szam` (badge) ·
> `PATCH /api/ertesitesek/:id/olvasott` · `PATCH /api/ertesitesek/mind-olvasott?agEntitasId=`
> (az `agEntitasId`-vel csak az ág olvasatlanjait jelöli). Mind auth-kötelesek,
> boríték: `{siker, adatok}`.
>
> **Teszt-értesítés gyártása kézzel** (amíg kevés az élő esemény) — közvetlen DB-beszúrás.
> FONTOS (2026-07-15 óta): az `osLanc` mezőt is add meg — ez az esemény entitásának
> ős-lánca (első elem MAGA az entitás, utána a szülők a gyökérig); a részfa-szűrés
> (kártya-badge, ág-postafiók) csak azokat az értesítéseket látja, amikben ez ki van töltve:
> ```bash
> docker exec koino-mongodb-dev mongosh koino --eval "db.ertesites.insertOne({
>   eEmberId: ObjectId('<eember_id>'), tipus: 'ujJavaslat',
>   entitasId: ObjectId('<tartalom_id>'), entitasTipus: 'Tartalom',
>   osLanc: [ { entitasId: ObjectId('<tartalom_id>'), entitasTipus: 'Tartalom' } ],
>   adatok: {}, olvasva: false, olvasvaIdopont: null,
>   createdAt: new Date(), updatedAt: new Date() })"
> ```
> (Ha a tartalomnak van szülője, a szülőt is fűzd az `osLanc` végére — így a szülő
> kártyáján is megjelenik majd a részfa-badge.)

30. ⬜ **Badge betöltéskor:** legyen ≥1 olvasatlan értesítésed → belépés/frissítés után a
    **fő hamburger gomb sarkán piros kör** mutatja a számot, és a menüben az
    **„Értesítések" sor jobb szélén** ugyanaz a szám.
31. ⬜ **Postafiók:** menü → *Értesítések* → a lista mutatja az értesítéseket
    (típus-felirat + entitás címe + időpont), az olvasatlanok kiemelve (zöld pont).
32. ⬜ **Egy elolvasása:** kattints egy olvasatlan értesítésre → a modal bezárul, a pakli
    az érintett entitásra navigál, és **mindkét badge eggyel csökken** (0-nál eltűnik).
33. ⬜ **Mind olvasottnak:** a postafiók *Mind olvasottnak* gombja után a lista kiemelései
    eltűnnek és **mindkét badge elrejtődik**.
34. ⬜ **99+ határeset:** 99-nél több olvasatlannál a badge „99+"-t mutat (DB-beszúrással
    szimulálható; vizuális ellenőrzés).
35. ⬜ **Kártya-badge (részfa, 2026-07-15 óta):** legyen olvasatlan értesítésed egy
    entitásról, aminek van szülője (az `osLanc`-ban a szülő is szerepel) → a paklin az
    **esemény entitásának kártyáján ÉS minden felmenője kártyáján** piros badge a
    hamburger gomb sarkán („felbugyborékolás"); a nem érintett ágak kártyáin nincs badge.
    A szám a backend pakli-válasz `olvasatlanErtesitesek` mezőjéből jön (osLanc-alapú
    csoportos számlálás). Olvasottnak jelölés után a pakli újratöltésével tűnik el.
36. ⬜ **Ág-szűrt kártya-postafiók (2026-07-15 óta):** bármely kártya hamburger-menüjében
    ÚJ közös menüpont: **🔔 Értesítések** (jobb szélén a részfa-olvasatlan számláló) →
    a postafiók-modal CSAK az adott entitás ága alatti értesítéseket listázza
    (cím: „Értesítések – <entitás címe/neve>"). A **Mind olvasottnak** itt csak az ág
    olvasatlanjait jelöli (a többi ág és az app-badge többi része érintetlen). Értesítésre
    kattintva az érintett entitásra navigál; olvasás után az app-badge azonnal, a
    kártya-badge-ek a modal bezárásakor (pakli-újratöltés) frissülnek.
37. ⬜ **Tudatpont-tulajdonossági szűrő (2026-07-15 óta):** az Értesítési beállítások
    modalban (csomóponti ÉS globális módban is) a típus-lista alatt ÚJ pipa:
    **„Csak ahol tudatpontom van"**. Bekapcsolva csak akkor jön értesítés, ha az
    e-embernek PONTOSAN az esemény entitásán van saját tudatpontja (a felmenőkön lévő
    pont NEM elég). KIVÉTEL: Egyezményen történt eseménynél a szűrő nem érvényesül
    (egyezményre nem lehet tudatpontot tenni) — ott bekapcsolt szűrővel is jön az
    értesítés. Próba: szűrő BE + pont nélküli entitáson esemény → nincs értesítés;
    ugyanez pont birtokában vagy szűrő KI → van. A pipa állapota mentés után
    visszatöltve is látszik (PUT/GET `ertesitesi-beallitasok[/globalis]`,
    `tudatpontSzuro` mező).
38. ⬜ **Meghívóim modal (2026-07-18 óta):** fő menü → **✉️ Meghívóim** → info-sor
    mutatja, kötelező-e most a meghívó; a tanúsító pipa NÉLKÜL az „Új meghívó" gomb
    inaktív; bepipálva → új meghívó jön létre (kód: `XXXX-XXXX-XXXX`), a pipa
    visszaáll üresre (minden meghívóhoz újra kell). A listában: kód, státusz-jelvény,
    dátum; aktív sornál 📋 (kód másolása, ✅ visszajelzéssel) és 🗑️ (visszavonás,
    megerősítő al-modallal). Visszavont meghívónál az akció-gombok eltűnnek.
39. ⬜ **Meghívó kód mező a regisztrációnál:** `MEGHIVAS_KOTELEZO=false` mellett a
    regisztrációs űrlapon NINCS meghívó kód mező; `true`-ra állítva (+ `docker
    restart koino-backend`) a mező megjelenik és kötelező. Érvénytelen/visszavont/
    felhasznált kóddal a backend 400-at ad; érvényes kóddal a regisztráció sikeres,
    a meghívó `Felhasznalt`-ra vált, és a Meghívóim listában megjelenik a
    felhasználó e-emberneve. A kód kis- és nagybetűvel is beírható.
40. ⬜ **Bizalmi gráf éle:** meghívóval regisztrált e-embernél a DB-ben a
    `meghivoEemberId` a kibocsátóra mutat (`docker exec koino-mongodb-dev mongosh
    koino --eval "db.eembers.findOne({eemberNev:'...'},{meghivoEemberId:1})"`).
41. ⬜ **Küszöbváltozás-értesítés (V2, 2026-07-18 óta):** az Értesítési
    beállításokban (csomóponti VAGY globális) pipáld be a **„Küszöbváltozás"**
    típust → ezután ha valaki érték javaslatot ad be úgy, hogy az entitás
    érvényes (medián) küszöbei elmozdulnak, a postafiókban **„Küszöbváltozás –
    <entitás címe>"** értesítés jelenik meg, alatta részlet-sorral: melyik küszöb
    változott, régi → új (pl. „elfogadási küszöb: 51% → 66% · min. döntési idő:
    – → 30 másodperc"). A beadó maga NEM kap értesítést. A típus UGYANÚGY
    beállítás-vezérelt (opt-in, cascade), mint a többi (a tulajdonos döntése,
    2026-07-18: nincs különleges bánásmód); a tudatpont-tulajdonossági szűrővel
    kombinálva szűkíthető a saját pontos entitásokra. A kártya-badge és az
    ág-szűrt postafiók ezt a típust is számolja (van osLanc).
    API-ellenőrzés (curl, 2026-07-18, lefutott): globálisan feliratkozott
    e-ember kapott (adatok.valtozasok = 4 mező régi/új), a fel nem iratkozott
    tulajdonos és a beadó nem.
42. ⬜ **Tudatpontok nézet (terv 7. pont, 2026-07-18 óta):** fő menü → **🌟
    Tudatpontok** → fejlécben a szabad tudatpontod, alatta a saját AKTÍV
    hozzárendelések (típus-ikon + entitás címe + 🌟 pont). Egy sorra kattintva a
    modal bezárul és a pakli az entitásra navigál; a sor ✏️ gombja a megszokott
    Tudatpont módosítás modalt nyitja AL-modalként — mentés után a lista, a
    fejléc ÉS az alsó statisztika-sáv frissül; a modal bezárásakor (ha volt
    módosítás) a pakli is újratölt. **Kártya-változat:** MINDEN kártya
    hamburger-menüjében ÚJ közös menüpont: **🌟 Tudatpontok** → ugyanez a lista
    ÁG-SZŰRVE (cím: „Tudatpontok – <entitás címe>"): csak az adott entitáson
    VAGY leszármazottain lévő saját pontok látszanak. API-ellenőrzés (curl,
    2026-07-18, lefutott): teljes lista entitás-címekkel; ág-szűrt lista =
    szülő + gyerek igen, más ág (kategória) nem.
    Végpont: `GET /api/tudatpont/aktiv-hozzarendelesek?limit=&skip=&agEntitasId=`
    (auth; `entitasCim` mezővel).
43. ⬜ **Keresés (2026-07-18 óta):** fő menü → **🔍 Keresés** → keresőmező +
    3 típus-pipa (📄 Tartalom / 📁 Kategória / 🏷️ Tartalomtípus, alapból mind
    bepipálva). Gépelés közben (~300 ms késleltetéssel) frissül a találati lista
    (típus-ikon + cím); pipa-váltásra azonnal újrakeres; minden pipa kivéve →
    „Pipálj be legalább egy típust." Találatra kattintva a modal bezárul és a
    pakli az entitásra navigál. **Kártya-változat:** MINDEN kártya
    hamburger-menüjében ÚJ közös menüpont: **🔍 Keresés** → ugyanez ÁG-SZŰRVE
    (cím: „Keresés – <entitás címe>"): csak az adott entitás ága alatti
    találatok. API-ellenőrzés (curl, 2026-07-18, lefutott): teljes keresés,
    típus-szűrés, ág-szűrt találat (Gyerek C a Szulo P ágában), ágon kívüli
    kizárás (0 találat) — mind helyes. A keresés cím/név alapú (v1); a
    tartalmak szövegében keresés későbbi bővítés.
44. ⬜ **Üres-pakli barátságos állapot (2026-07-18 óta):** TELJESEN ÜRES (friss)
    adatbázisnál a főoldal már nem hibázik el: a pakli helyén 🌱 útmutató
    jelenik meg („Még nincs tartalom a koino-n. Hozd létre az elsőt...").
    Az első tartalom létrehozása után a pakli normálisan betölt. Ha a MENTETT
    aktív entitás nem található (pl. törölték), a pakli automatikusan gyökérről
    próbál újra (a null-védelem most már a backend üres válaszát is kezeli).
    Kipróbálás: friss DB (docker volume törlés) mellett belépés.
45. ⬜ **Szavazási határidő értesítés (2026-07-18 óta):** az Értesítési
    beállításokban ÚJ pipa: **„Szavazási határidő"**. Bekapcsolva akkor jön
    értesítés, ha egy aktív javaslat döntési idejéből MÁR CSAK a teljes idő
    25%-a (de legfeljebb 24 óra) van hátra — a cron percenként ellenőrzi, és
    javaslatonként csak EGYSZER küld (hataridoErtesitesElkuldve jelző).
    FIGYELEM: nagyon rövid (1-2 perces) döntési időnél az értesítés lemaradhat
    (a cron percenként fut) — vállalt korlát. FIGYELEM 2: a cron a döntési időt
    percenként újraszámolja (BM-dinamika), ezért kézi DB-s határidő-állítás
    tesztnél felülíródik — a service-metódus (hataridoErtesitesekKuldese)
    közvetlen hívásával tesztelhető megbízhatóan (2026-07-18: lefutott, 1 küldés
    a feliratkozottnak, ismételt futásnál 0 = duplikátum-védelem OK).
46. ⬜ **Árva értesítések takarítása (2026-07-18 óta):** amikor egy entitás
    törlődik (tudatpontokVisszaosztasa → 0 pont → auto-törlés, pl. Törlési
    javaslat végrehajtásakor), a KÖZVETLENÜL rá vonatkozó értesítések is
    törlődnek (ertesitesRepository.torolEntitasOsszes, best-effort).
    2026-07-18: teljes mini-folyamattal igazolva (eldobható tartalom + 3
    értesítés → törlés után entitás és értesítések is eltűntek).
47. ⬜ **eember beállítások (terv 8. pont, 2026-07-18 óta):** fő menü → **⚙️
    eember beállítások** → felül az azonosítók (e-embernév, e-mail — v1-ben nem
    módosíthatók), alatta a **Profil-adatok** (valódi név + ország/régió/település
    lokáció-autocomplete-tel; „Profil mentése" → ✅ Mentve, a fejléc-adatok
    frissülnek), legalul a **Jelszóváltás** (jelenlegi + új + megerősítés; rossz
    jelenlegi jelszóval hibaüzenet; sikeres váltás után a mezők ürülnek, és az
    ÚJ jelszóval kell belépni). API (curl, 2026-07-18, lefutott): GET
    `/api/eember/sajat-adatok` (már email+lokacio is), PUT `/api/eember/adatok`
    (nev, lokacio — hiányos adatra 400), POST `/api/eember/jelszovaltas`
    (regiJelszo, ujJelszo — rossz régire 400; erősség-szabály mint
    regisztrációnál); új jelszóval a bejelentkezés igazolva.
48. ⬜ **Testvér-jelző kacsacsőrök (terv 13/a pont, 2026-07-19 óta):** a
    KIVÁLASZTOTT kártya két szélén lebegő **‹ N** és **N ›** gombok mutatják,
    hány testvér entitás van az adott irányban (a testvér-sorrend: hierarchikus
    pont csökkenő → régebbi előrébb). Ellenőrzés: (a) olyan entitásnál, aminek
    több testvére van, mindkét irányban helyes szám látszik; a sor szélein csak
    az egyik gomb van (0 testvér irányában NINCS gomb); (b) a gombra **koppintva**
    testvérváltás történik (ugyanaz, mint a vízszintes görgetés), és a számok az
    új helyzethez frissülnek; (c) a gombra kattintás NEM választja ki magát a
    kártyát (nem "üt át" a kártya-koppintásra); (d) a paklin belül másik kártyára
    koppintva a kacsacsőrök az ÚJ kiválasztott kártyára ugranak át (ha a
    testvérlista még töltődik, rövid ideig nem látszanak, majd megjelennek);
    (e) testvér nélküli entitásnál (pl. egyetlen gyökér) egyik gomb sem látszik.
    Megjegyzés: a backend a testvéreket 100 darabban maximálja — a számláló
    ennél többet nem mutat.
49. ⬜ **Teljes szélességű kártyák (2026-07-19 óta, Csaba döntése):** a kártyák
    (és velük a pakli) MINDEN képernyőn a képernyő szélességét követik (a
    wrapper paddingjén belül) — a korábbi fix, legfeljebb 400px-es kártya-oszlop
    megszűnt; a menük (fő hamburger, alsó sáv, kártya-hamburgerek) változatlanok.
    Ellenőrzés: (a) széles (asztali) ablakban a kártya a képernyő szélét követi,
    és az ablak átméretezésekor vele nyúlik/szűkül; (b) a KIVÁLASZTOTT kártya
    magassága NEM nő az ablak szélességével (a régi kártya-arány szerinti fix
    magasság marad, mobilon pixelre a korábbi); (c) mobilon (keskeny ablak) a
    megjelenés gyakorlatilag a korábbi; (d) a cím-betűméret a szélesebb
    kártyához igazodik (Tartalom-kártyán dinamikus); (e) a kártya-body szövege
    a teljes szélességet használja (a 72 karakteres sor-korlát megszűnt);
    (f) a testvér-kacsacsőrök (48.) a széles kártya szélein is jó helyen vannak.
50. ⬜ **Térkép (terv 13/b pont, 2026-07-19 óta):** teljes képernyős, interaktív
    fa-nézet. Elérés: fő menü → **🗺️ Térkép** (teljes fa), VAGY bármely kártya
    hamburgere → **🗺️ Térkép** (ág-szűrt: csak az entitás részfája, a cím a
    modal fejlécében). Ellenőrzés:
    (a) megnyitáskor NINCS előzetes kérdés — a Térkép EGYBŐL nekiáll az építésnek
    (2026-07-20-i változás);
    (b) építés közben folyamatjelző (számláló) fut („Letöltés: X / N entitás",
    majd „Elhelyezés: X / N entitás") és végig látható a **Mégse** gomb —
    megnyomva leáll és bezár, félkész rajz nélkül (az ESC/✕ is zár);
    (c) a kész térképen a GYÖKÉR ALUL van és az ágak FELFELÉ nőnek (mint a
    pakliban: gyökér legalul, levél legfelül; 2026-07-19-i javítás). A
    megjelenítés KÉTSZINTŰ, a részletesség a NAGYÍTÁStól függ (2026-07-20):
    kicsinyítve csak típus-színű pöttyök (áttekintés); befelé nagyítva
    (görgetés / ＋) FOKOZATOSAN jön elő előbb a típus-ikon, majd a cím, végül az
    ágazati össztudatpont (🌿🌟 + szám). A cím betűmérete DINAMIKUS a cím hossza
    szerint (rövid nagyobb, hosszú kisebb) — ugyanaz a lépcsős skála, mint a
    kártya fejlécénél; a kisebb betűbe több karakter is fér (2026-07-20). A csomópontok
    mérete VÉGIG egységes (nem a tudatponttal arányos). Rámutatva tooltip a
    teljes címmel (Javaslat/Egyezménynél a típusnév látszik cím helyett).
    Kicsinyítve vissza a pöttyök, kifelé nagyítva a cím/info eltűnik — a zoom
    tehát ÉRZÉKELHETŐEN vált szintet (a korábbi „a zoom nem csinál semmit" hiba
    javítva);
    (d) pan/zoom (2026-07-20): húzással VAGY kétujjas görgetéssel mozgatható; a
    nagyítás CSAK az ujjak széthúzására (pinch) történik — a kétujjas fel/le
    görgetés NEM zoomol, hanem pásztáz; a pinch-zoom finom (nem „ugrik"); a ＋/－
    gombok a közepére nagyítanak, a ⤢ gomb a teljes fát behúzza; a zoom/pan SIMA
    marad (kis adatnál sem akadozik): mozgás közben csak a canvas frissül, a
    részletes SVG-réteg a mozgás VÉGÉN (~150 ms) épül újra (2026-07-20);
    (e) az AKTUÁLIS entitás (amin a pakli áll / amelyik kártyáról nyitottad)
    kiemelt gyűrűt kap (távolról téglavörös gyűrű a pötty körül, közelről
    vastag gyűrű az SVG-körön);
    (f) csomópontra kattintva (közeli nézetben az SVG-elemre, távoliban a
    pöttyre) a modal bezárul és a pakli a választott entitásra navigál;
    (g) kártya-menüs (ág-szűrt) módban CSAK az adott entitás részfája látszik,
    és a darabszám az ág mérete;
    (h) a Térkép alatt (a teljes képernyős nézetben) is LÁTSZIK a főoldal alsó
    sávja (koino · név · tudatpont · … + hamburger), ugyanúgy, mint a pakliban —
    a Térkép épp az alsó sáv fölött ér véget, és a hamburger menü is használható
    marad (2026-07-20);
    (i) a LEGKÖZELEBBI szinten (a tudatponttal együtt) MELLÉK-IKONOK bukkannak elő
    kis körökben, a fő ikonnál kisebben (2026-07-20): Tartalomnál a KATEGÓRIÁI
    balra (lila kör), a TARTALOMTÍPUSA jobbra (okker kör) — a körben a kategória/
    típus saját ikonja (emoji vagy feltöltött kép), csak ha van hozzárendelve;
    Javaslat/Egyezménynél a MŰVELET-TÍPUS jobbra (a saját típus-színével): Törlés
    🗑️ · Módosítás ✏️ · Egyesítés 🔗 · Áthelyezés ➡️ · Csomag 📦; Kategóriának és
    Tartalomtípusnak NINCS mellék-ikonja. (Backend: a `/api/terkep` sorai
    `kategoriaIkonok`, `tipusIkon`, `javaslatTipus` mezőkkel bővültek.)
    API (curl, 2026-07-19, lefutott): GET `/api/terkep/darabszam` (globális: 25;
    `?agEntitasId=` ág-BFS: 5), GET `/api/terkep?lapMeret=&kurzor=` (kurzoros
    lapozás, 3 lap = pontosan 25 sor, cím-viselőknél `cim`, auth nélkül 401).
51. ⬜ **Síkidom nézet — 1. lépés (terv 14. pont, 2026-07-20 óta):** fő menü →
    **🔷 Síkidom nézet**. STATIKUS ablak (még NINCS dinamikus felfedés / drill-down).
    A globális nézet az **ÖSSZES gyökeret** mutatja (egymás mellé pakolva, a
    legnagyobb középen). Ellenőrzés:
    (a) rövid töltő után megjelenik a nézet: a síkidomok **entitástípus szerinti
    formák** — Tartalom = kör, Kategória = háromszög, Tartalomtípus = négyzet,
    Javaslat = ötszög, Egyezmény = hatszög (halvány kitöltés, típus-színű keret);
    (b) a leszármazottak a szülő síkidomán **BELÜL**, napraforgó-spirálban, a
    **legnagyobb középen**, a kisebbek kifelé; a méret a hierarchikus
    össztudatponttal arányos (szintenként √20-szor kisebb);
    (c) a elég nagynak látszó síkidomokon **felirat** (cím vagy típusnév), a
    túl kicsiken nincs — zoomolva előjön / eltűnik;
    (d) pan/zoom: húzással mozgatható, görgetéssel a kurzorra nagyít, ＋/－ a
    közepére, ⤢ a teljes nézetre illeszt;
    (e) az AKTUÁLIS entitás (amin a pakli áll) kiemelt kerettel jelenik meg, ha
    látszik a nézetben;
    (f) síkidomra **koppintva** a modal bezárul és a pakli az entitásra navigál
    (beágyazott kicsire kattintva azt választja, nem a szülőt).
    Node-teszt (böngésző nélkül, 2026-07-20): sikidomElrendezes 16 eset zöld
    (containment, legnagyobb-középen, APPEND-STABILITÁS, determinizmus,
    kör-védelem); sikidomFormak forma/pont-matek OK. API (curl): GET
    `/api/sikidom` (best-first effektív méret szerint; a plafonnál
    `vanTovabbGyerek` igaz; auth nélkül 401).
52. ⏸️ **Szavazat-értesítés (`szavazatErkezett`) — FÜGGŐBEN (2026-07-20):** a backend
    TERMELŐ be van kötve (`szavazatService.szavazatLeadasa`, best-effort, a szavazót
    kihagyva, minden szavazásnál), DE a frontend szándékosan kihagyja a típust a
    feliratkozásból és a megjelenítésből is (tulajdonosi döntés, zaj miatt) → jelenleg
    NINCS feliratkozó → 0 értesítés → böngészőből NEM tesztelhető. Csaba dönt: teljesen
    bekapcsoljuk (a 2 frontend-listába is felvesszük) vagy visszavonjuk a backend-bekötést.
53. ⬜ **Egyedi értesítés-törlés a postafiókból (2026-07-20 óta):** a fő menü vagy egy
    kártya-hamburger → **Értesítések** postafiók. Minden sor jobb szélén **🗑️** gomb.
    Ellenőrzés: (a) a 🗑️-re kattintva a sor eltűnik a listából, és a modal NYITVA marad
    (NEM navigál el, mint a sor törzsére kattintva); (b) ha a törölt értesítés olvasatlan
    volt, az app-badge és a kártya-badge száma is csökken (a modal bezárása után is helyes);
    (c) az utolsó sor törlése után „Nincs értesítésed." üres-állapot jelenik meg; (d) a sor
    TÖRZSÉRE kattintva továbbra is olvasottnak jelöl + navigál (a 🗑️ nem üt át, és fordítva).
    Backend (curl, 2026-07-20, lefutott): `DELETE /api/ertesitesek/:id` — saját értesítés →
    200 (+ DB-ből törlődik); MÁSIK e-ember értesítése → 403 „Nincs jogosultságod ehhez az
    értesítéshez"; nem létező id → 404 „Az értesítés nem található"; auth nélkül → 401.

### API-referencia — meghívó rendszer (2026-07-18, curl-lel igazolva)

| Végpont | Auth | Leírás |
|---|---|---|
| `GET /api/meghivo/kotelezo` | – | `{ kotelezo: bool }` — a MEGHIVAS_KOTELEZO kapcsoló állása |
| `POST /api/meghivo` | ✅ | body: `{ tanusitva: true }` — enélkül 400; válasz: a meghívó a `kod`-dal |
| `GET /api/meghivo/sajat` | ✅ | saját meghívók (felhasznaloEemberId → eemberNev populate) |
| `POST /api/meghivo/:id/visszavonas` | ✅ | csak a kibocsátó, csak `Aktiv` státuszban |

V1-szabályok (Csaba döntése, 2026-07-18): **nincs darabszám-korlát és nincs lejárat**
(a korlátozás később közösségi döntés lehet — fazis2 N4); a tanúsítás = maga a
meghívás (1 tanúsító). A kódot a kibocsátó maga juttatja el a meghívottnak.

---

## 6. Ismert megjegyzések / buktatók

- **✅ Küszöb csak Tartalomból — JAVÍTVA (2026-07-18):** a döntéskor a küszöböket
  korábban csak a `Tartalom` típusú érintettekből átlagolta a rendszer; kategórián/
  tartalomtípuson tett javaslat az alapértelmezett 51%/0%-kal dőlt el. A javított
  `erintettEntitasokKuszobertekenekLekerese` mostantól **mindhárom érték-képes
  típusból** (Tartalom, Kategoria, TartalomTipus) átlagol; ha egyik sincs az
  érintettek között, marad az alapértelmezett 51%/0%.
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
- **V3–V4 API-változások (2026-07-18):** a `GET /api/javaslat/:id/szavazatok`
  végpont TÖRÖLVE (egyéni szavazatokat adott ki — D2 sértés); a
  `/:id/statisztika` (összesített) és a `/:id/sajat-szavazat` marad. Az e-mail
  minden entitás-válaszból kikerült (populate-ok `eemberNev`-re szűkítve) —
  e-mail csak a saját regisztráció/bejelentkezés válaszában van. Részletek:
  [adatkezeles.md](adatkezeles.md).
- **osLanc-pótlás (2026-07-18, LEFUTOTT):** a 2026-07-15 (A1) előtt keletkezett
  értesítésekből hiányzott az `osLanc` mező, ezért azok NEM számítottak bele a
  kártya-badge részfa-számlálásába és az ág-szűrt postafiókba (a fő menü badge-e jó
  volt — az nem osLanc-alapú). Egyszeri migráció: `docker exec koino-backend node
  tools/osLancPotlas.js` (52 értesítés pótolva; többször futtatható, csak a hiányos
  rekordokhoz nyúl). Ha egy régi DB-mentés visszatöltése után a kártya-badge megint
  „eltűnik", ezt kell újra lefuttatni.

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
   tartalom létrehozása (a menü a hiba ellenére működik) feloldja. → **JAVÍTVA
   (2026-07-18):** null-védelem + 🌱 barátságos üres állapot (lásd 44. forgatókönyv).
2. ~~**⚠️ Kategória/tartalomtípus javaslat a saját küszöbét figyelmen kívül hagyja.**~~
   → **JAVÍTVA (2026-07-18):** a küszöb-lekérés kiterjesztve mindhárom érték-képes
   típusra (`erintettEntitasokKuszobertekenekLekerese` — lásd a 6. szakasz jegyzetét).
   Az itteni eredeti találat: a kereszt-teszt igazolta, hogy a kategória-javaslat 51/0-val
   fogadódott el, nem a kategóriára beállított értékekkel.

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
