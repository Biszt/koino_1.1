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
| `email` | ⬜ (opcionális) | `anna@teszt.hu` | **Nem kötelező** (2026-07-31). Ha megadják: egyedi, kisbetűsít, csak azonosításra. Ha üresen hagyják: nem tárolódik e-mail (a mező hiányzik). |
| `jelszo` | ✅ | `jelszo123` | min. 8 karakter, + legalább egy betű ÉS egy szám (`jelszoHelper.validalJelszoErosseg`) |
| `nev` | ✅ | `Teszt Anna` | valódi név |
| `lokacio.orszag` | ✅ | `Magyarország` | |
| `lokacio.regio` | ✅ | `Komárom-Esztergom` | |
| `lokacio.telepules` | ✅ | `Tatabánya` | |
| `meghivoKod` | ⚙️ | `MCUQ-QDQA-Q8R5` | Kötelező, ha kell meghívó (lásd lent). Böngészőben NEM az űrlapon adod meg, hanem a **regisztráció 1. lépésében** (külön kód-oldal); a 2. lépésben nyíló űrlapon rejtett mezőben utazik tovább. |

> **Élesítés (2026-07-23): `MEGHIVAS_KOTELEZO=true`.** A regisztráció kétlépcsős:
> **1.** meghívó kód-oldal (`GET /api/meghivo/ellenorzes/:kod` ellenőrzi, nem fogyasztja el) →
> **2.** regisztrációs űrlap a meghívott **nevével előre kitöltve** (szerkeszthető).
> **Kivétel:** ha még **0 e-ember** van, az ELSŐ (alapító) regisztráció **kód nélkül** mehet
> (`GET /api/meghivo/kotelezo` ilyenkor `false`-t ad). A backend a végső őr: kód kell, ha
> `MEGHIVAS_KOTELEZO=true` **és** már van legalább 1 e-ember.
> **Nyílt regisztráció visszakapcsolása** (fejlesztéshez): `MEGHIVAS_KOTELEZO=false` + `docker restart koino-backend`.

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
Body: `{ entitasId, entitasTipus, pontok, felmenoketAutomatikusan?, szerep? }`
- **Felmenő-kényszer MEGSZŰNT** (2026-07-30): pont akkor is tehető egy entitásra, ha a
  felmenőkön nincs. A frontend csak FIGYELMEZTET (`GET /api/tudatpont/hianyzo-felmenok/...`),
  és a „Felmenők kitöltése" gomb `felmenoketAutomatikusan`-nal opcionálisan tölti ki őket.
- **`szerep`** (`'passziv'` | `'aktiv'`): csak az ELSŐ allokáláskor érvényes; a részvételi
  szerep. Alapból `passziv`. Lásd az **5/b. H)** mélytesztet és a fejlesztési terv
  „Részvételi modell" szakaszát.
- **Szerep utólagos módosítása:** `PUT /api/tudatpont/szerep/:entitasTipus/:entitasId`,
  body: `{ szerep }` (a kártya „Részvételi beállítások" menüje).

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

### 2. Tudatpont-hozzárendelés + részvételi szerep (felmenő már NEM kötelező)
6. ⬜ **Mind a 3 e-emberrel** rendelj tudatpontot **Tartalom-A**-ra és **Tartalom-B**-re
   (ehhez ki/bejelentkezés a 3 e-ember közt). Az ELSŐ allokáláskor a szerepválasztó
   felugrik (alapból **passzív**); tegyél legalább egy e-embert **aktív**-ra.
   - *Elvárt:* a felmenő-figyelmeztetés NEM blokkol (mentés kitöltés nélkül is megy);
     DB-ben a `tudatpont`-hozzárendelések látszanak a `szerep` mezővel. A részvételi
     arány **nevezője csak az AKTÍV** tulajdonosok (∪ a szavazók) — nem mind a 3.

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
38. ⬜ **Meghívóim modal (2026-07-18 óta, névvel 2026-07-23 óta):** fő menü →
    **✉️ Meghívóim** → info-sor mutatja, kötelező-e most a meghívó; az „Új meghívó"
    gomb csak akkor aktív, ha a **meghívott teljes neve** ki van töltve **és** a
    tanúsító pipa be van pipálva. Létrehozás után a név-mező és a pipa is visszaáll
    üresre (minden meghívóhoz újra). A listában: kód, **a meghívott neve**,
    státusz-jelvény, dátum; aktív sornál 📋 (kód másolása, ✅ visszajelzéssel) és
    🗑️ (visszavonás, megerősítő al-modallal). Visszavont meghívónál az akció-gombok eltűnnek.
39. ⬜ **Kétlépcsős regisztráció (2026-07-23 óta):** `MEGHIVAS_KOTELEZO=true` és van
    már e-ember → a „Regisztráció" gomb ELŐBB a **meghívó kód-oldalt** nyitja. Rossz
    kód → mezőhiba („érvénytelen vagy már felhasznált"). Jó kód → a regisztrációs
    űrlap nyílik meg a meghívott **nevével előre kitöltve** (szerkeszthető). Sikeres
    regisztráció után a meghívó `Felhasznalt`, a Meghívóim listában megjelenik a
    felhasználó e-emberneve. **Első e-ember:** üres DB-n a kód-oldal kimarad, a
    regisztráció egyből nyílik (alapító). A kód kis- és nagybetűvel is beírható.
39/b. ⬜ **Adatvédelmi nyilatkozat (2026-07-23 óta):** a bejelentkezés oldal alján
    **„Adatvédelmi nyilatkozat"** link → felugró ablakban a nyilatkozat szövege,
    „Bezárás" gombbal (ESC / overlay-kattintás is zár).
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
    3 típus-pipa (📄 Tartalom / 🏷️ Kategória / 🧩 Tartalomtípus, alapból mind
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
    eember beállítások** → felül az azonosító (e-embernév — nem módosítható),
    alatta a **Profil-adatok** (valódi név + **E-mail (nem kötelező)** + ország/
    régió/település lokáció-autocomplete-tel; „Profil mentése" → ✅ Mentve, a
    fejléc-adatok frissülnek), legalul a **Jelszóváltás** (jelenlegi + új +
    megerősítés; rossz jelenlegi jelszóval hibaüzenet; sikeres váltás után a mezők
    ürülnek, és az ÚJ jelszóval kell belépni).
    **E-MAIL SZERKESZTÉSE A BEÁLLÍTÁSOKBAN (2026-07-31):** az e-mail utólag is
    **megadható / módosítható / TÖRÖLHETŐ** (üresen hagyva + Profil mentése → törlődik,
    a `sajat-adatok` „—"-t ad vissza). Érvénytelen formátumra azonnali hiba; már más
    által használt e-mailre a backend 400-at ad („már használatban"); a SAJÁT,
    változatlan e-mail újramentése NEM hibázik (önmagát kihagyó egyediség-ellenőrzés).
    API (curl, 2026-07-18, lefutott): GET
    `/api/eember/sajat-adatok` (már email+lokacio is), PUT `/api/eember/adatok`
    (nev, lokacio, **opcionális email** — hiányos alap-adatra 400), POST `/api/eember/jelszovaltas`
    (regiJelszo, ujJelszo — rossz régire 400; erősség-szabály mint
    regisztrációnál); új jelszóval a bejelentkezés igazolva.
    **FIÓK TÖRLÉSE (2026-07-23):** a modál alján, elkülönített „veszély"-szakaszban
    a **Fiók törlése** (piros gomb) — jelszó-mezővel + megerősítő párbeszéddel.
    Ellenőrzés: (a) üres jelszóra hibaüzenet; (b) a Mégse a párbeszédben nem töröl;
    (c) rossz jelszóra a backend 400-at ad; (d) sikeres törlés után KIJELENTKEZTET
    (token törlődik, újratöltés → bejelentkező képernyő), és a régi adatokkal már
    nem lehet belépni. Domain: a tudatpontok VISSZAOSZTÓDNAK az entitásokról — amit
    csak ő támogatott, 0-ra esik és a láncreakció törli; amit mások is, MEGMARAD,
    és a létrehozója „törölt e-emberre" (null) áll. A szavazatai, érték-javaslatai,
    értesítései és beállításai is törlődnek; az általa MEGHÍVOTTAK bizalmi-gráf éle
    (meghivoEemberId) szándékosan érintetlen (Fázis 2). FONTOS: az érték-javaslatok
    törlésekor a megmaradó entitások KÜSZÖB-HISZTOGRAMJÁBÓL is kivonjuk őket, így a
    medián (küszöbérték) frissül — nem marad benne a törölt e-ember szavazata.
    Végpont: DELETE `/api/eember` (body: jelszo; auth-köteles). Service-teszt
    (2026-07-23, lefutott): (1) a csak-ő-ága törlődik, a megmaradó entitás létrehozója
    null, hozzárendelés/szavazat 0; (2) két érték-javaslatos entitáson a hisztogram
    osszesErtekJavaslat 2→1, a medián a megmaradó e-ember értékére áll.
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
    **(2026-07-22, ÚJ) Ugrás-gombok:** a lépés-gombok ALATT megjelenik egy-egy
    **|‹** (bal) és **›|** (jobb) gomb — ugyanaz az áttetsző stílus. Koppintásra a
    testvér-sor **legelejére** (|‹, a legerősebb ág) illetve **legvégére** (›|)
    ugrik. Ellenőrzés: (f) sok testvérnél az ugrás egy lépésben a szélső testvérre
    visz (nem egyesével); (g) a legszélen már állva nincs oda mutató gomb; (h) az
    ugrás is bal/jobb irányú animációt kap.
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
50. ⬜ **Struktúra nézet (terv 13/b pont, 2026-07-19 óta):** teljes képernyős, interaktív
    fa-nézet. Elérés: fő menü → **🗺️ Struktúra nézet** (teljes fa), VAGY bármely kártya
    hamburgere → **🗺️ Struktúra nézet** (ág-szűrt: csak az entitás részfája, a cím a
    modal fejlécében). Ellenőrzés:
    (a) megnyitáskor NINCS előzetes kérdés — a Struktúra nézet EGYBŐL nekiáll az építésnek
    (2026-07-20-i változás);
    (b) építés közben folyamatjelző (számláló) fut („Letöltés: X / N entitás",
    majd „Elhelyezés: X / N entitás") és végig látható a **Mégse** gomb —
    megnyomva leáll és bezár, félkész rajz nélkül (az ESC/✕ is zár);
    (c) a kész struktúra nézeten a GYÖKÉR ALUL van és az ágak FELFELÉ nőnek (mint a
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
    és a darabszám az ág mérete. A szűrés 2026-07-23 óta BACKEND-oldali: a kliens
    ág-módban CSAK a részfát tölti le (nem a teljes fát, majd vágja) — így milliós
    adatnál is tartható. Ellenőrizhető a hálózati fülön: a `GET /api/struktura` kérés
    `agEntitasId=…` paramétert visz, és a válasz sorai csak a részfát tartalmazzák;
    (h) a Struktúra nézet alatt (a teljes képernyős nézetben) is LÁTSZIK a főoldal alsó
    sávja (koino · név · tudatpont · … + hamburger), ugyanúgy, mint a pakliban —
    a Struktúra nézet épp az alsó sáv fölött ér véget, és a hamburger menü is használható
    marad (2026-07-20);
    (i) a LEGKÖZELEBBI szinten (a tudatponttal együtt) MELLÉK-IKONOK bukkannak elő
    kis körökben, a fő ikonnál kisebben (2026-07-20): Tartalomnál a KATEGÓRIÁI
    balra (lila kör), a TARTALOMTÍPUSA jobbra (okker kör) — a körben a kategória/
    típus saját ikonja (emoji vagy feltöltött kép), csak ha van hozzárendelve;
    Javaslat/Egyezménynél a MŰVELET-TÍPUS jobbra (a saját típus-színével): Törlés
    🗑️ · Módosítás ✏️ · Egyesítés 🔗 · Áthelyezés ➡️ · Csomag 📦; Kategóriának és
    Tartalomtípusnak NINCS mellék-ikonja. (Backend: a `/api/struktura` sorai
    `kategoriaIkonok`, `tipusIkon`, `javaslatTipus` mezőkkel bővültek.)
    API: GET `/api/struktura/darabszam` (globális összes; `?agEntitasId=` → az ág
    mérete — 2026-07-23 óta egyetlen indexelt `osLanc`-lekérdezés, nem szintenkénti
    BFS), GET `/api/struktura?lapMeret=&kurzor=&agEntitasId=` (kurzoros lapozás;
    `agEntitasId`-vel CSAK a részfát lapozza — indexelt `{ 'osLanc.entitasId':1, _id:1 }`;
    cím-viselőknél `cim`, auth nélkül 401). Service-teszt (2026-07-23, lefutott):
    ág → 5 sor, mind a részfa tagja; globális → teljes fa (33 sor).
51. ⬜ **Síkidom nézet — ÚJRAÉPÍTVE (terv 14. pont, 2026-08-03):** fő menü →
    **🔷 Síkidom nézet**. *(A korábbi, napraforgó-spirálos változat forgatókönyve
    ÉRVÉNYTELEN — az az elrendezés átfedő síkidomokat adott, a kódja törölve lett.)*

    **A modell:** minden entitás egy síkidom, a **TERÜLETE arányos** a hierarchikus
    össztudatpontjával; a leszármazottak a szülőn **BELÜL**. A pozicionálás minden
    formát KÖRKÉNT kezel (háromszögelés + üres mag). A betöltést a **képernyő-átmérő**
    vezérli, nem a fa bejárása.

    Ellenőrzés:
    (a) rövid töltő után megjelenik a nézet; a síkidomok **entitástípus szerinti
    formák** — Tartalom = kör, Kategória = háromszög, Tartalomtípus = négyzet,
    Javaslat = ötszög, Egyezmény = hatszög (halvány kitöltés, típus-színű keret);
    (b) **átfedés SEHOL** — sem testvérek között, sem szülőből kilógó gyerek;
    (b2) **ÜRES MAG szaggatott körrel:** minden kibontott síkidom közepén
    **szaggatott kör** jelzi az ürességet. A mag **MINDIG ÜRES** — soha nem kerül
    bele semmi; a testvérek KÖRÉ pakolódnak. A kör pereme a MÉRT üresség (a
    legbelső testvér belső széle), nem becslés.
    - **Nagyítás közben:** amíg van meg nem jelent entitás, a kör átmérője
      **állandó marad a képernyőn** (`MAG_CEL_ATMERO` = 120 képpont), és a peremén
      sorra előbukkannak az újabbak. Amikor elfogynak, a kör a nagyítással
      **arányosan nőni kezd** — ez a jelzés, hogy „itt nincs több".
      *Böngésző nélkül mérve: 600 testvéren 90 nagyítási lépésen át végig
      pontosan 120–120 px.*
    - **A már lerakott síkidomok ÁTRENDEZŐDNEK.** A nagyítás VÉGÉN (nem görgetés
      közben) a képernyőn látszó síkidomok újrapakolódnak bentről kifelé, hogy a
      frissen előbukkanóknak is jusson hely a mag körül. Ez egy egyszeri,
      összehangolt átrendeződés — a kép nem remeg görgetés közben;
    - A gyökér-szint magjában felirat is van („üres kör — nagyíts befelé"), ha elfér.
      A 10 képpontnál kisebb átmérőjű magokat nem rajzoljuk ki;
    (c) az **alsó sáv végig látszik és használható** (hamburger + statisztikák) —
    innen bármikor át lehet váltani pakli nézetre;
    (d) **nagyítás**: görgetés a kurzorra, csippentés érintőképernyőn, ＋/－ a középre,
    ⤢ a teljes nézetre illeszt; húzással mozgatható;
    (e) **befelé nagyítva** egy síkidom gyerekei maguktól előjönnek (nem kell kattintani),
    és a nagyítás **nem áll meg, nem esik szét** — tetszőlegesen mélyre lehet menni.
    **PISLOGÁS NINCS**: a háttérben horgonyváltás történik, de a kép nem ugrik meg
    (ez váltja ki a koino_1.0 vászon-újraépítését);
    (f) **LÁTHATÓSÁGI KÜSZÖB — minimum képernyő-átmérő:** egy síkidom csak akkor
    jelenik meg, ha a képernyőn mért **átmérője eléri a 24 képpontot**; felirata
    csak **48 képpont** fölött van. A látható darabszám tehát a képernyő
    befogadóképességéből KÖVETKEZIK, nem fix szám (terv 14. pont). A küszöb alatti
    síkidomok **eltűnnek**, és **benagyítva jelennek meg** újra — a részfájukat
    addig nem is töltjük le. Egyetlen szám hangolja a sűrűséget:
    `MIN_KEP_ATMERO` a `SikidomModal.js`-ben;
    (g) az AKTUÁLIS entitás (amin a pakli áll) kiemelt kerettel jelenik meg, ha látszik;
    (h) **koppintás egy síkidomra:** a nézet MARAD, és bal alul megjelenik az entitás
    **egyetlen kártyája**, ✕-szel bezárhatóan (beágyazott kicsire koppintva azt
    választja, nem a szülőt; üres helyre koppintva bezárul);
    (i) a kártya **hamburger menüjében** ott a **🃏 Pakli nézet** pont → a síkidom nézet
    bezárul, és a pakli AZ ADOTT entitásra navigál. A menü többi pontja (Értesítések,
    Tudatpontok, Keresés, Struktúra nézet, Rendezés…) is működik, és a saját modáljaik
    **nem lövik ki** a síkidom nézetet (külön `almodal-kontener`-ben nyílnak).

    API: `GET /api/sikidom/gyerekek?szulo=&minPont=&kurzorPont=&kurzorId=&darab=&osszesKell=`
    (lásd a fenti API-referenciát). A régi `GET /api/sikidom` **megszűnt** (404).

    (j2) **HORGONY-PRÓBA (2026-08-08):** nagyíts BELE egy síkidomba addig, amíg
    kitölti a képernyőt, majd nagyíts tovább még néhány lépést. A vászon **NEM
    ürülhet ki**. Korábban ilyenkor a kapacitás-vágás kidobta a horgonyt a tárból
    (a horgony a legnagyobb a képernyőn, tehát a méret szerinti sor VÉGÉN áll),
    és onnantól a rajzolásnak nem volt mihez viszonyítania. A konzolban
    **nem szabad** megjelennie ennek: `VÉDETT csomópont került a vágásba`.

    (j4) **MEGJELENÍTÉS-PRÓBA (2026-08-08, a koino_1.0-ból átvett elemek):**
    - **Címke:** a felirat a síkidom közepe FÖLÖTT, félig áttetsző lekerekített
      kártyán, több sorba tördelve (legfeljebb 3 sor, az utolsón „…"). NEM takarhatja
      a középpontba pakolt legkisebb gyereket.
    - **Mellék-ikonok:** 96 px látszó átmérő fölött a felirat ALATT egy sorban
      megjelennek a kategória-ikonok (balra) és a tartalomtípus ikonja (jobbra).
      Csak azoknál, akiknek van ilyenje. *(A `tools/sikidomTesztAdat.js` gyökerei
      kategória és típus NÉLKÜL jönnek létre — ott jogosan nincs ikon; kézzel
      felvett, kategóriás tartalommal érdemes próbálni.)*
    - **Elhalványodás:** befelé nagyítva a túlnőtt szülő kitöltése ÉS kerete is
      fokozatosan halványul; a kerete nem vághatja át a képernyőt.
    - **Illesztés:** az „illesztés" gomb ANIMÁLVA áll rá a nézetre (~0,4 s), nem ugrik.
    - **Kifelé nagyítás:** a gyökér-szinten a kicsinyítés MEGÁLL (az illesztési
      nagyítás negyedénél) — a képernyő nem ürülhet ki attól, hogy kizoomoltál.
    - **Görgő:** érintőpadon a nagyítás sima és folytonos, nem ugrál; „kattanós"
      egérgörgőn egy kattanás ~1,15-szörös lépés.

    (j6) **STABILITÁS-PRÓBA (2026-08-08) — a legfontosabb:**
    Válassz ki egy **szélső** síkidomot, és közelíts rá több lépésben.
    - A már látható síkidomok **nem mozdulhatnak el**. A célpontod nem „ugrálhat",
      nem kell kergetni. *(Ez volt a hiba: minden újrapakolás az egészet
      újraszámolta, mert az új — kisebb — testvérek a méret szerinti sor elejére
      kerültek, és onnantól minden utánuk következő új helyre ugrott.)*
    - Az **új** síkidomok a középső üres kör (szaggatott vonal) **peremén**
      bukkannak elő, gyűrűnként — a meglévők közé, nem a helyükre.
    - A szaggatott kör **annál nagyobb, minél több testvér vár még helyre**, és
      ahogy sorra lekerülnek, MAGÁTÓL zsugorodik. Amikor mindenkinek van helye,
      eltűnik. *(2026-08-09 óta a mag a HÁTRALÉVŐ TUDATPONTBÓL számolódik, nem a
      képernyőből — korábban állandó ~120 px volt, és épp ezért nem tartott helyet
      a később érkezőknek.)*
    - **Nem lehet „kígyó":** apró síkidomok nem fűződhetnek láncban kifelé, a nagyok
      közé vagy azokon túlra. Ha ilyet látsz, a mag kicsi → `MAG_SURUSEG` lejjebb.
    - **A letöltés MÉLYEBBRE megy, mint a rajzolás** (`BETOLTESI_MELYSEG = 4`):
      a hálózati fülön a `minPont` érték a láthatóság-számolta érték ~1/16-a legyen.
      Így a farok a láthatóvá válás ELŐTT megérkezik és helyet kap.
    - **A mag KÖZELÍTÉSRE FOGY, nem nő.** Ahogy közelítesz, a tudatpont-küszöb
      süllyed, több testvér töltődik le, mindegyik helyet kap, és a szaggatott kör
      összehúzódik. Ha a mag a képernyőn NŐNI kezd közelítéskor, az hiba.
      *(2026-08-09 óta a kapacitás csak a RAJZOLÁST korlátozza; korábban a lerakást
      is, és emiatt a közelítés növelte az üres közepet.)*
    - A konzolban a `_ujrapakolas` sorában a `helybenMaradt` érték nőjön, az
      `ujonnan` pedig kicsi legyen — ez mutatja, hogy tényleg csak az újakat rakjuk
      le. A `magSugar` **nem lehet 0**, amíg van várakozó testvér.

    Böngésző nélkül: `node backend/tools/sikidomPakolasProba.mjs 600 1.3 90 24`
    — a 7. állítás („Lerakás után egyetlen síkidom sem mozdul") ezt méri. 600 és
    3000 testvérrel is mind a 7 átmegy, 0 elmozdulással.

    (j5) **ÉRINTŐPAD- ÉS MOBIL-PRÓBA (2026-08-08):**
    - **Érintőpad, kétujjas görgetés** → sima, folytonos nagyítás.
    - **Érintőpad, csippentés** → szintén nagyít (a böngésző `ctrlKey`-jel küldi;
      külön, nagyobb érzékenységgel megy — ha lomha, `GORGO_EGYSEG_CSIPPENTES` a
      [`sikidomNagyitas.js`](../frontend/js/utils/sikidomNagyitas.js)-ben, 2026-08-11 óta).
    - **Mobil, EGY ujj** → mozgatás.
    - **Mobil, KÉT ujj** → nagyítás **és** mozgatás EGYSZERRE. *(Ez volt hibás:
      ha az ujjak együtt csúsztak, a kép meg sem mozdult.)*
    - **Mobil, csippentés után egy ujjat felemelve** → a maradék ujjal AZONNAL
      tovább lehet mozgatni, ugrás nélkül. *(Ez volt hibás: az ott maradt ujjal
      addig nem lehetett mozgatni, amíg mindet fel nem emelted.)*
    - **Mobil, csippentés után az utolsó ujj felemelése** → NEM nyithat meg
      véletlenül adatlapot. Adatlap csak akkor, ha végig EGY ujj volt, és alig
      mozdult (7 képpont).
    - **Három ujj** → nem eshet szét: az első kettő vezérel.

    (j3) **LETÖLTÉS-FÉK PRÓBA (2026-08-08):** mély nagyításnál a hálózati fülön a
    `sikidom/gyerekek` kérések **nem futhatnak sorozatban** (korábban a küszöb fölötti
    összes testvért lehozta, 150-esével). A `_ujrapakolas` naplósorában a
    `varolistan` érték nem nőhet korlátlanul. Az első kérés után minden továbbiban
    ott kell lennie az `osszesKell=0` paraméternek.

    (j) **SOK-TESTVÉRES PRÓBA:** hozz létre egy szülőt sok (100+) gyerekkel, és
    nagyíts bele végig. **Mindegyik gyereknek elő kell bukkannia** a mag peremén,
    átfedés nélkül, és a nézet nem akadhat el. *(Ez volt a 2026-08-04-i nyitott
    hiba: 600 gyerekből 180 némán elveszett. Most mind a 600 megjelenik.)*

    **Teszt-adat a próbához** (csak fejlesztői környezetben):
    `docker exec koino-backend node tools/sikidomTesztAdat.js` — 100 gyökér
    tartalmat hoz létre 900-tól 1-ig terjedő tudatponttal. Újrafuttatható (a már
    létező címeket kihagyja).

    **SOK gyökér (2026-08-08):** `docker exec koino-backend node tools/sikidomSokGyokerTesztAdat.js`
    — alapból **300 további** gyökeret hoz létre, Zipf-szerű hosszú farokkal
    (`pont = C / sorszám`). A címek generáltak (10 jelző × 30 témakör), ezért
    ütközésmentesek; a témakör elemenként forog, a jelző 30-anként, így minden
    témakörből jut nagy és apró síkidom is.
    - Paraméterek: `<darab> <eemberNev> proba` — a `proba` SZÁRAZ FUTÁS (csak
      kiírja, mit hozna létre, semmit nem ír az adatbázisba).
    - A pontokat a választott e-ember **szabad tudatpontjának 90%-ára** skálázza,
      és előre ellenőrzi, hogy belefér-e. Minden tartalom legalább 1 pontot kap.
    - Újrafuttatható (a már létező címeket kihagyja).
    - *Lefuttatva 2026-08-08-án: 300 db jött létre 2423 pontból; a gyökér-allokációk
      száma ezzel **405**, összpontjuk 17 235, a legerősebb 2243, és 62 db 1 pontos.
      A világ-síkidom képernyő-sugarának függvényében a 24 px-es küszöböt 200-nál
      116, 400-nál 238, 800-nál mind a 405 gyökér lépi át — vagyis a nagyítás
      SORBAN hozza elő őket, épp ahogy a (j2)–(j5) próbákhoz kell.*

    **Böngésző nélküli mérőpróba (Claude futtatja):**
    `node backend/tools/sikidomPakolasProba.mjs 600 1.3 90`
    Hat állítást ellenőriz: nulla átfedés, egyetlen entitás sem vész el, minden a
    szülőn belül, középtől kifelé monoton nő a méret, a mag képpontban állandó,
    determinizmus. Paraméterek: darab, zoom-szorzó, zoom-lépések száma,
    minimum képernyő-átmérő. 600 és 3000 testvérrel egyaránt mind a hat átmegy.
    A legdrágább lépés 2026-08-06 óta: 600-nál 11 ms, 3000-nél 25 ms.

    *2026-08-08 óta 7 állítást ellenőriz — az új a **stabilitás** (lásd (j6)) —, és
    a modell is más: a már lerakottak `kornyezet`-ként (akadályként) vesznek részt,
    csak az újakat rakja le. `URES_MAG = true` ismét.*

    **2026-08-09 — A PRÓBA MOST MÁR A BETÖLTÉST IS MÉRI (9 állítás, új 9. paraméter):**
    `node backend/tools/sikidomPakolasProba.mjs 600 1.3 80 24 mag 0.5 450 4`
    (darab, zoom-szorzó, zoom-lépések, min. átmérő, mag-kapcsoló, σ, kérés-adag,
    **betöltési mélység**).
    - Eddig a testvérek vak adagokban érkeztek, a `MIN_KEP_ATMERO` deklarálva volt,
      de SEHOL nem használtuk — a próba ugyanazt adta 24-es és 4-es küszöbbel.
      Emiatt a `BETOLTESI_MELYSEG` bevezetése **láthatatlan volt** számára.
      Mostantól a nézet valódi szabálya fut: küszöb + fék + láncolt kérések.
    - Az 5. állítás KICSERÉLVE. A régi („a lyuk képpontban állandó, cél ±20%") az
      elvetett, képernyő-horgonyzott mag elvárása volt, ráadásul a `varolistan > 0`
      szűrője miatt SOHA nem talált mérhető lépést — mindig üresen ment át. Helyette:
      **„A lyuk közelítéskor nem szalad el"** — az üres mag átmérője nem nőheti túl
      a képernyő kisebbik oldalának a felét (a trend a napló minden sorában látszik).
    - Csak azok a körök számítanak, ahol a nézet még VALÓBAN ezt a szülőt mutatná;
      fölötte horgonyt váltana (a próbában nincs horgonyváltás, enélkül 29 millió
      képpontos „lyukat" mérnénk egy rég elhagyott szülőn).
    - **Mért eredmény — ez igazolja a `BETOLTESI_MELYSEG = 4`-et:**

      | testvérek | mélység 1 (a javítás előtt) | mélység 4 (mai) | mélység 8 |
      |---|---|---|---|
      | 600 | ❌ 480 px (164 → 421, NŐ) | ✅ 119 px (97 → 94, fogy) | – |
      | 3000 | ❌ 1053 px (171 → 1053, NŐ) | ✅ 267 px (118 → 189, nő) | ✅ 134 px |

    - **Ismert korlát:** 3000 testvérnél a mag mélység 4-gyel még NEM fogy — 118-ról
      267 px-ig nő, mielőtt elfogyna. A nézet közben használható marad (a határ
      400 px), de a „magától lefogy" ígéret csak ~600-ig teljesül. A mélység
      emelése (8 vagy 16) ezen segít, több hálózat árán.
    - **A kérés-adag (8. paraméter) már nem befolyásolja az eredményt:** 20-as és
      450-es adaggal a lyuk azonos 119 px. A betöltést a **fék**
      (`BETOLTESI_TARTALEK`) szabályozza, nem a darabszám-plafon.

    **Üres mag NÉLKÜL** (`SikidomModal.URES_MAG = false` tükre — már NEM a jelenlegi
    beállítás, csak összehasonlításhoz):
    `node backend/tools/sikidomPakolasProba.mjs 600 1.3 90 24 nincsmag`
    Ilyenkor az ötödik állítás megfordul: a lyuk-ellenőrzés helyett azt várjuk, hogy
    **nincs középső lyuk** — a legkisebb testvér a középpontban ül.

    *2026-08-09: ebben a módban a 8. állítás („a fenntartott mag elég") SZÁNDÉKOSAN
    bukik — épp ezt hivatott megmutatni. Mag nélkül a később érkezők kifelé
    szorulnak, tehát a méret-sorrend megfordul. A javítás előtt 2 tizednél fordult
    meg, a valósághű betöltéssel 7-nél: a próba most élesebben mutatja, MIÉRT kell a
    mag. Nem regresszió — az összehasonlító mód elvárt eredménye.*

    **Nagyítás-próba (2026-08-06 óta):** nyisd meg a Síkidom nézetet, és nagyíts
    addig, amíg a kép TÚLNŐ a képernyőn. A külső, nagy síkidomoknak ekkor is
    TAPADNIUK kell egymáshoz. Ha rés nyílik köztük, az az újrapakolás fagyasztási
    határa (`_ujrapakolasiSugar()`) — a vászon fél átlójából számoljuk, épp azért,
    hogy a varrat a képernyőn kívülre essen. Széles (alacsony) ablakban a
    legárulkodóbb: ott tér el legjobban a fél átló a rövidebb oldal felétől.

    **A böngészős próbán a mag nélküli nézetnél ezt nézd:** (1) látszik-e, hogy
    érdemes tovább nagyítani, ha nincs a lyuk mint jelzés; (2) nyugodt-e, hogy
    nagyításkor a középső síkidom cserélődik (mindig az új legkisebb kerül oda).
    A visszaváltás egy sor: `URES_MAG = true` a `SikidomModal.js`-ben.

    **A térbeli rács mérőpróbája (Claude futtatja):**
    `node backend/tools/sikidomRacsProba.mjs`
    A pakolás gyorsítását (`frontend/js/utils/sikidomRacs.js`) ellenőrzi. Négy
    állítás:
    - **a rács egyetlen közeli kört sem hagy ki** — 2400 lekérdezésen, négy
      méret-eloszláson (egyenletes, valósághű, kétpúpú, mértani) NYERS ERŐVEL
      összevetve. Ez a legfontosabb: ha a rács kihagyna egy szomszédot, átfedés
      keletkezne;
    - determinizmus (ugyanaz a kérdés → ugyanaz a válasz, ugyanabban a sorrendben);
    - a megnézendő jelöltek száma korlátos (64× darabszámnál 1,38× jelölt);
    - a rács érdemben szűkít (32 000 körnél az összes 0,31%-át adja vissza).

    Kiír egy tájékoztató táblát is a rács legrosszabb esetéről (szétszórt körök,
    a mérettől független lekérdezési hatótáv) — ott a biztonsági fék kapcsol be,
    ilyenkor a rács nem gyorsít, de lassabb sem lesz a régi megoldásnál.

    *Böngésző nélkül már igazolva:* a teljes elrendező folyamat négy fa-alakon
    (105–4680 csomópont, 150 gyökér = 3 lap is) **0 testvér-átfedés, 0 beágyazási hiba**;
    295 horgonyváltás 10²⁸⁷-szeres nagyításig **2,9·10⁻¹¹ px** képeltéréssel; a lapozás
    döntetlen pontszámoknál is stabil; mind a 79 frontend-modul import-útja feloldódik.

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

54. ⬜ **Rendezés (terv 15. pont, 2026-07-21 óta):** a pakli nézet rendezés-választója.
    **Fő menü → ↕️ Rendezés** (GLOBÁLIS) modal, rádiók: mód (🌳 Hierarchikus / 🕒 Időrend /
    🌟 Saját tudatpont [entitás közvetlen összpontja] / 🌿 Ágazati tudatpont [hierarchikus
    összpont = az egész ág súlya]) + sorrend (csökkenő/növekvő). Ellenőrzés: (a) **Időrend** →
    a pakli LAPOS lista, legújabb elöl, **testvér-kacsacsőrök és szülő-gyerek átfedés NÉLKÜL**;
    (b) egy kártyára koppintva a **body helyben kibomlik** (nem navigál); (c) **Saját tudatpont**
    → a lista az entitás saját összpontja szerint (legtöbb elöl); (c2) **Ágazati tudatpont**
    → a lista a hierarchikus összpont (az egész ág súlya) szerint — MÁS sorrend, mint a saját;
    (d) **Hierarchikus** → visszaáll
    a fa-nézet (kacsacsőrök + átfedés); (e) a modalban **hierarchikus módnál a Sorrend-csoport
    letiltott** (szürke), lapos módoknál aktív; (f) növekvő/csökkenő váltás megfordítja a sorrendet.
    **Kártya-hamburger → ↕️ Rendezés** (ÁG-SZŰRT): ugyanaz a modal, a fejlécben „Rendezés ezen az
    ágon: <cím>"; alkalmazva csak az adott entitás **részfája** jelenik meg laposan rendezve
    (a gyökér-entitás önmaga is benne van). Backend (curl, 2026-07-21, lefutott):
    `GET /api/pakli/rendezett?mod=ido|sajatPont&irany=csokkeno|novekvo&agazatId=<id>` — globális
    27 elem, ág-szűrve a részfa mérete; auth nélkül 401; érvénytelen mod/irány/agazatId → 400.

55. ⬜ **Alkategória létrehozása (terv 9. pont, 2026-07-22 óta):** egy kategória kártya
    hamburger menüjében a **🏷️ „Új alkategória létrehozása"** pont (a fő menü „Új kategória
    létrehozása" ikonjával; korábban 🚧 volt). Előfeltétel: legyen tudatpontod ezen a
    kategórián (különben a pont halvány/tiltott — `tudatpontFuggo`). Ellenőrzés:
    (a) a pontra koppintva megnyílik a modal, a **címe „Új alkategória létrehozása"**;
    (b) a **leírás mező most a blokk-alapú szerkesztő** (nem sima textarea) — írj bele,
    formázd; (c) kitöltés (név + ikon + leírás + küszöbök + kezdő tudatpont) után
    **Létrehozás** → siker, a pakli frissül; (d) 🔴 a leggontosabb: az új kategória a
    **szülő kategória ALÁ** kerüljön (NE a gyökérbe!) — a pakliban a szülő kategóriából
    lefelé navigálva jelenjen meg, illetve a Struktúra nézet/Rendezés ág-nézetében a szülő
    részfájában; (e) nyisd meg újra a kártya Részletes adatait / szerkesztését → a
    **leírás megőrződött** (korábban nem mentődött); (f) a **fő menü** „Új kategória
    létrehozása" továbbra is GYÖKÉR kategóriát hoz létre — ez ne változzon.
    **Domain-szabály (backend):** kategória szülője csak másik kategória lehet — ezt a
    modell enum + a service kikényszeríti (kézzel/API-ból erőltetett más szülő-típus → hiba).
    **Kapcsolódó — leírás-szerkesztő a TartalomTípusnál is:** a fő menü „Új tartalomtípus
    létrehozása" modáljában is a blokk-szerkesztő van, és a leírás elmentődik/visszatöltődik.
    (g) **Kártya-megjelenítés:** a kategória (és tartalomtípus) kártyát kiválasztva a body
    a BLOKK-szerkezetet mutassa (formázott szöveg/kép), NE nyers JSON-t. (A backend a
    FormData-ból jött leírást tömbbé parse-olja — `leirasParser`.)
    (h) **Hierarchikus kategória-választó:** a fő menü „Új tartalom létrehozása" modál
    kategória-legördülőjében az alkategóriák a szülőjük alatt, BEHÚZVA jelenjenek meg
    („└ " jellel, mélység szerint); gyökér-kategóriák behúzás nélkül.

56. ⬜ **Alkategória a Tartalom kategória-választójában (terv 9. pont záró-ellenőrzés):**
    hozz létre egy alkategóriát (55. pont), majd nyisd meg az „Új tartalom létrehozása"
    modált → a kategória-legördülőben az alkategória a szülője alatt, behúzva látszik;
    kiválasztva chip lesz belőle, és a legördülőből kikerül, de a többi behúzása marad jó.

57. ⬜ **Javaslat-típus domain-szabályok (terv 10. pont bővítés, 2026-07-22 óta):** a kártya-
    hamburger „Javaslat létrehozása" pontja (tudatpont kell rá). Nyisd meg minden entitástípuson,
    és nézd az 1. lépés TÍPUSGOMBJAIT: (a) **Tartalom** → mind az 5 (Törlés/Módosítás/Áthelyezés/
    Egyesítés/Csomag); (b) **Kategória** → Törlés/Módosítás/Egyesítés (NINCS Áthelyezés, nincs Csomag);
    (c) **Tartalomtípus** → csak Törlés/Módosítás; (d) **Egyezmény** → CSAK Áthelyezés (az Egyezmény
    kártyán a menüpont most már működik, nem „fejlesztésre vár"). **Egyesítés — azonos típus:**
    Tartalmat CSAK Tartalommal, Kategóriát CSAK Kategóriával (az „új entitás típusa" a kártyából
    következik, nem választható; a forrás-mezők is csak ezt a típust engedik). **Az új entitás
    szülője OPCIONÁLIS** — üresen hagyva GYÖKÉR lesz (ez volt a „nem tudok egyesíteni" hiba oka).
    **Egyezmény tárhely:** alapból az új entitás.
    **Backend-kikényszerítés (a lényeg):** ha API-ból erőltetsz tiltott kombinációt (pl. Egyezményre
    Módosítás/Egyesítés, vagy Kategóriára Áthelyezés, vagy Tartalomtípus Egyesítés, vagy kategória+tartalom
    egyesítés), a `POST /api/javaslat` **400**-at ad, magyar hibaüzenettel. **Egyezmény javaslat-típusok
    (2026-08-01):** Egyezményre mostantól **Törlés ÉS Áthelyezés** is indítható (módosítás/egyesítés továbbra
    is tiltott). A JavaslatModalban Egyezmény-kártyáról a **Törlés** és **Áthelyezés** gomb látszik, a többi
    rejtve. **Egyezmény törlés-végrehajtás:** elfogadott törlési javaslatnál az egyezmény tényleg törlődik
    (a tudatpontok visszaosztódnak, a gyerekei a szülő alá kerülnek), és a törlés-egyezmény a törölt egyezmény
    eredeti szülője alá kerül. **Egyezmény áthelyezés
    végrehajtás:** ha egy egyezmény-áthelyezési javaslat elfogadásra kerül, az egyezmény tényleg
    átkerül az új szülő alá. **Egyesítés — gyerekek:** ha az egyesített (forrás) entitásoknak
    GYEREKEIK vannak (tartalmak/alkategóriák), az egyesítés elfogadása után a gyerekek az ÚJ
    egyesített entitás alá kerülnek (nem a nagyszülőhöz) — a pakliban lefelé navigálva ellenőrizhető.
    Ez a Tartalom-egyesítésre és a Kategória-egyesítésre is áll.
58. ⬜ **Alsó sáv — entitástípus-darabszámok (2026-07-23):** a főoldal alsó statisztika-sávja
    mostantól MIND AZ 5 entitástípus darabszámát mutatja (nem csak a tartalmakét): koino · e-embernév ·
    🌟 tudatpont · 🧑‍🤝‍🧑 e-emberek · 📄 tartalmak · 🏷️ kategóriák · 🧩 tartalomtípusok · 📋 javaslatok ·
    🤝 egyezmények. Ellenőrzés: a számok betöltődnek (nem „…" marad), és megegyeznek a tényleges
    darabszámmal; kis képernyőn a sáv több sorba tördhet, de minden elem látszik. Végpont:
    GET `/api/platform/statisztika` — a válasz most `kategoriakSzama`, `tartalomTipusokSzama`,
    `javaslatokSzama`, `egyezmenyekSzama` mezőkkel is bővült. Service-teszt (2026-07-23, lefutott):
    mind a 6 darabszám visszajön.

59. ⬜ **Főoldal vissza/előre történet (2026-07-23):** az alsó sávban a hamburger mellett két új
    gomb: **↩ Vissza** / **↪ Előre** (billentyű: `Alt+←` / `Alt+→`). Mivel az app modálokat nyit/zár
    (nincs valódi oldalbetöltés), a böngésző saját Vissza gombja nem használható — ez a saját
    történet-navigáció. A gombok tiltottak, ha nincs hova lépni. Ellenőrzés:
    - **Entitás-lánc:** navigálj több entitáson (kártya-koppintás, testvér-ugrás, kereső/struktúra nézet/
      értesítés/tudatpont ugrás – akár a fő menüből, akár egy kártya menüjéből) → ↩ visszalépeget,
      ↪ előre. (A rögzítés közös pontja: `aktivEntitasMentese` → `koino:aktivEntitasValtozas` esemény.)
    - **Rendezés mint lépés:** menj be egy tartalomba → **rendezz** (kártya- vagy fő menü) → ↩ kilép a
      rendezett (lapos) nézetből, vissza az entitásra; ↪ újra alkalmazza a rendezést.
    - **Struktúra nézet mint lépés:** nyisd meg a **Struktúra nézetet** (fő menüből VAGY kártya-menüből) → ↩ bezárja és
      visszalép; ↪ újranyitja ugyanazt (teljes vagy ág-szűrt) struktúra nézetet. A ↩ ↪ a teljes képernyős
      struktúra nézet fölött is kattintható (az alsó sáv a struktúra nézet fölé emelkedik).
    - **Modál-védelem:** nyitott MÓDOSÍTÓ modálnál (pl. új tartalom, javaslat) a ↩ / `Alt+←` először
      csak bezárja a modált (mint az Esc), nem navigál alatta.
    - Böngésző-konzol: `_debug_tortenet.allapotLekeres()` mutatja a `{visszaLehetseges, eloreLehetseges}`
      állapotot. Architektúra: `FoOldalTortenetKezelo` (két-veremes), a nézet-állapotok típusai:
      `entitas` · `rendezes` · `nezet` (struktúra nézet).

### API-referencia — meghívó rendszer (2026-07-18, névvel/kétlépcsőssel 2026-07-23, curl-lel igazolva)

| Végpont | Auth | Leírás |
|---|---|---|
| `GET /api/meghivo/kotelezo` | – | `{ kotelezo: bool }` — **effektív**: `MEGHIVAS_KOTELEZO=true` ÉS van már ≥1 e-ember (0 e-embernél `false` → alapító kód nélkül) |
| `GET /api/meghivo/ellenorzes/:kod` | – | `{ ervenyes: bool, meghivottNev }` — kód ellenőrzése a regisztráció 1. lépésében, **nem fogyasztja el**; rossz kód → `ervenyes:false` (nem hiba) |
| `POST /api/meghivo` | ✅ | body: `{ tanusitva: true, meghivottNev }` — bármelyik hiányzik → 400; válasz: a meghívó a `kod`-dal és a `meghivottNev`-vel |
| `GET /api/meghivo/sajat` | ✅ | saját meghívók (felhasznaloEemberId → eemberNev populate) |
| `POST /api/meghivo/:id/visszavonas` | ✅ | csak a kibocsátó, csak `Aktiv` státuszban |

V1-szabályok (Csaba döntése, 2026-07-18): **nincs darabszám-korlát és nincs lejárat**
(a korlátozás később közösségi döntés lehet — fazis2 N4); a tanúsítás = maga a
meghívás (1 tanúsító). A kódot a kibocsátó maga juttatja el a meghívottnak.

### G) Feltöltött fájlok élettartama — árva-fájl kezelés (ÚJ, 2026-07-30)

> **Cél:** az `uploads/` mappában NE gyűljenek árva fájlok. Két mechanizmus véd:
> **(1) halasztott feltöltés** — a szövegszerkesztő kép/fájl blokkjai csak a tartalom
> MENTÉSEKOR kerülnek a szerverre (előtte `blob:`-URL-lel helyi előnézet); **(2) törlés
> és csere takarítása** — entitás törlésekor és ikon/kép cserekor a lemezes fájl is
> törlődik (`fajlKezeloService`).
>
> **Ikon (kategória/típus) — nincs halasztás gond:** az ikon eleve a create/update
> `multipart`-tal megy fel, tehát csak mentéskor. Cserénél a régi ikon törlődik.
>
> **Ellenőrző parancs (a konténerből):**
> ```bash
> docker exec koino-backend sh -c 'ls -1 uploads/icons uploads/kepek uploads/fajlok'
> ```

**Fontos:** minden kép/fájl-teszt előtt **hard refresh** (Ctrl+Shift+R), különben a régi JS fut.

40. ⬜ **Halasztott feltöltés — normál mentés:** új tartalom → szúrj be képet → az
    előnézet látszik, de a *Network* fülön **nincs** `/feltoltes` hívás → Mentés → **ekkor**
    fut a `/feltoltes/kep`, majd a `/tartalom` POST; a kép mentés után is megvan (valódi
    `/uploads/...` URL, nem `blob:`).
41. ⬜ **Halasztott feltöltés — elvetés (a lényeg):** új tartalom → szúrj be képet →
    zárd be **mentés nélkül** → az `uploads/kepek` (és `fajlok`) **üres marad**
    (semmi nem került fel).
42. ⬜ **Törlés takarítása:** tartalom képpel/csatolmánnyal, majd told **0 tudatpontra**
    (automatikus törlés) → a hozzá tartozó fájl **eltűnik** az `uploads/`-ból.
43. ⬜ **Ikon-csere takarítása:** szerkessz egy kategóriát/típust, tölts fel **új** ikont →
    a régi `uploads/icons/...` fájl **eltűnik**, csak az új marad.
44. ⬜ **Szöveg-csere takarítása:** meglévő tartalom szerkesztése → cserélj le egy képet a
    szerkesztőben → Mentés → a **régi** kép eltűnik, a megmaradók megvannak.

> **Ismert él:** ha a képek feltöltése sikerül, de a rá következő tartalom-mentés maga
> hibázik (ritka szerverhiba), a feltöltött képek árván maradhatnak. Ritka; szükség
> esetén később egy vékony söprögető (nem hivatkozott + régi fájlok) biztonsági háló.

### H) Részvételi szerep (passzív/aktív) + felmenő-kényszer megszűnése (ÚJ, 2026-07-31)

*A modell: a részvételi arány NEVEZŐJE csak az AKTÍV tudatpont-tulajdonosokat számolja
(∪ a szavazókat) — a passzív figyelők nem korlátozzák a döntést. A szerep alapból
`passziv`; bármely döntés-alakító tett (szavazás, érték javaslat, javaslattétel,
tartalom/kategória/típus LÉTREHOZÁS) automatikusan aktívvá tesz. Részletek: fejlesztési
terv „Részvételi modell" szakasz. Backend-változás után **`docker restart koino-backend`**!*

45. ⬜ **Első allokáláskori szerepválasztó:** tegyél pontot egy entitásra, ahol még nincs
    szereped → Mentés → felugrik a szerepválasztó (alapból **passzív**) → válassz → mentés.
    - *Elvárt:* a pont-allokálás megtörténik; a `tudatpontHozzarendeles.szerep` a választott.
46. ⬜ **Második allokálás ugyanott:** módosítsd a pontot → Mentés → **NEM** kérdez szerepet.
47. ⬜ **Felmenő NEM blokkol:** olyan entitás, aminek a felmenőin nincs pontod → a
    figyelmeztetés látszik, de a **Mentés kitöltés nélkül is** végbemegy. A „Felmenők
    kitöltése" gomb → **felmenőnként sorban** felugrik a szerepválasztó.
48. ⬜ **Létrehozó automatikusan aktív:** hozz létre egy ÚJ tartalmat/kategóriát/típust →
    a kártya **🙋 Részvételi beállítások** pontja → **aktív**-ot mutat (a kezdő értékjavaslat miatt).
49. ⬜ **„Részvételi beállítások" menü:** ahol van pontod, a menüpont aktív; nyisd meg →
    a jelenlegi szerep van kiválasztva → válts → Mentés → újranyitva a váltott érték látszik.
    Ahol nincs pontod → a menüpont **inaktív**.
50. ⬜ **Nevező-hatás (a lényeg):** A és B is tegyen pontot egy tartalomra; A **passzív**,
    B tegyen rá **törlési javaslatot** (a beadó auto-„Támogat" szavazatot kap + aktívvá válik).
    - *Elvárt:* a részvételi arány **100%** (nevező = {B}), NEM 50%. Ha a meglévő javaslatot
      nézed, a friss számhoz vagy új javaslat kell, vagy egy szavazat-változás (elavultra jelöl → cron).
51. ⬜ **≤100% szavazás után passzívra váltva:** B szavazzon egy javaslaton, majd a
    „Részvételi beállítások"-ban állítsa magát **passzív**-ra → az arány **nem** lép 100% fölé
    (a szavazó-unió miatt B a nevezőben marad).
52. ⬜ **Módosítási javaslat — kategória + tartalomtípus is (2026-07-31):** egy **Tartalom**
    kártyán indíts **Módosítás** javaslatot. A 2. lépés formájában a Cím és a Szöveg alatt
    mostantól **két új mező** is van: (a) **Tartalom típusa** legördülő — a tartalom jelenlegi
    típusa **előre kiválasztva**, első opciója „– Nincs típus –"; (b) **Kategóriák (max. 3)** —
    a jelenlegi kategóriák **chipként** megjelenítve (✕-szel törölhetők), a legördülő behúzva
    mutatja a hierarchiát, és a **4. kategóriát már nem enged** hozzáadni (letiltott legördülő).
    Változtass a típuson és a kategóriákon, tedd meg a javaslatot, majd **fogadtasd el** (szavazás/
    cron). *Elvárt:* elfogadás után a tartalom kártyáján a **típus-ikon (jobb, okker kör)** és a
    **kategória-ikonok (bal, lila kör)** az új értékeket mutatják. **Csak Tartalomnál** jelenik meg
    a két mező — **Kategória** és **Tartalomtípus** entitás módosításánál NINCS (nekik nincs ilyen
    mezőjük). Megjegyzés: **backend-módosítás nem történt** (a `modositasAdatok` már generikusan
    alkalmazódik `updateById`-vel, a „max 3 kategória" a szerveren is érvényes) → elég a böngésző
    **hard-refresh**-e, `docker restart` nem kell.
53. ⬜ **Beillesztett szöveg megtartja a formázását (2026-08-01):** egy szövegblokkba
    másolj be **formázott** szöveget több forrásból (Word, Google Docs, Claude chat, weboldal).
    - *Elvárt:* megmarad a **félkövér / dőlt / aláhúzás**, a **címsor / lista / idézet / kód**,
      a **betűszín** ÉS a **betűméret** (a forrás mérete pontosan, px-ben — akár `pt`/`em`/`%`
      forrásból is helyesen feloldva), valamint a **szöveg-háttérszín (kiemelés)**.
    - *Méret-plafon:* 144px fölötti beillesztett méret **144px-re** vágódik (a koino saját
      méret-választójának maximuma is mostantól **144** — a legördülő: 12…48, 60, 72, 96, 120, 144).
    - *Zaj-szűrés:* az átlátszó (`transparent`) háttér nem jelenik meg kiemelésként.
    - A blokkban látott formázás **egyezik** a mentés utáni kártya-megjelenítéssel.
    - Megjegyzés: **frontend-változás** (`sanitizeHelper.js`, `SzovegPanel.js`) → elég a
      böngésző **hard-refresh**-e (Ctrl+F5), `docker restart` nem kell.

### I) Síkidom teszt-oldal — önhasonló spirál (ÚJ, 2026-08-03)

*Fejlesztői **homokozó**, NEM az éles nézet: teszt körökkel próbáljuk ki a Síkidom nézet
új pakoló-motorját, valódi adat és bejelentkezés nélkül. Cím:*
**http://localhost:3000/sikidomTeszt.html** *(csak frontend — `docker restart` nem kell,
elég a hard-refresh). A motor: [`frontend/js/utils/sikidomSpiral.js`](../frontend/js/utils/sikidomSpiral.js).*

*A modell: a kör sugara ARÁNYOS a középponttól mért távolságával → a kép minden nagyítási
szinten ugyanúgy néz ki (önhasonló). Ebből jön a képernyőhöz igazodó üres kör és a
végtelen nagyítás. A helyet CSAK a sorszám adja — nem kell előre tudni az egész fát.*

54. ⬜ **Alapkép:** nyisd meg az oldalt → a közepén **szaggatott üres kör** („nagyíts befelé"),
    körülötte **kifelé növekvő** körök spirálba rendezve, egymást nem metszve.
    - *Elvárt:* a legkisebbek mindig a **közép körül** vannak — ez volt a cél.
55. ⬜ **Befelé nagyítás:** görgess befelé (vagy dupla kattintás) → az üres kör peremén
    **sorra megjelennek** az újabb, kisebb körök; az üres kör mérete **nagyjából állandó**
    marad a képernyőn (~23 px sugár az alapbeállítással).
56. ⬜ **Végtelenség:** kapcsold be az **Automatikus mélyülés**t → a kép folyamatosan
    mélyül, a „Mélység" és „Össznagyítás" kijelző nő, a kép **nem ugrik** és **nem esik szét**
    (a háttérben újranormálás fut). Böngésző nélkül igazolva: 10^637× nagyításig ép.
57. ⬜ **Paraméterek:** told a **Méret-arány** csúszkát 1,01 felé → sok, hasonló méretű kör;
    1,5 felé → kevés, ugrásszerű. A **Szöglépés** rajzolja a spirál-karokat (20° = egy karú,
    137,5° = napraforgó, 150° = legtömörebb). A **Kitöltés** 100%-on érintik egymást.
    - *Elvárt:* az „Átfedésmentes?" kijelző **végig „igen ✔"** marad (a program magától
      a biztonságos sugár-arányt számolja).
58. ⬜ **Előbeállítások:** a négy gomb (Legtömörebb / Napraforgó / Egy karú / Sok apró)
    átállítja a csúszkákat és azonnal újrarajzol.
- *Böngésző nélkül már igazolva:* 401 kör minden párja **átfedésmentes**; az önhasonlóság
  gépi pontosságú; az újranormálás képernyő-eltérése **5,5·10⁻¹² px** (a kép nem ugrik).

*Elrendező modulok (2026-08-03, böngésző nélkül mérve — még nincs bekötve a nézetbe):*
[`sikidomMeret.js`](../frontend/js/utils/sikidomMeret.js) (tudatpont → sugár, terület-arányosan),
[`sikidomPakolas.js`](../frontend/js/utils/sikidomPakolas.js) (háromszögeléses kör-pakolás üres maggal),
[`sikidomHorgony.js`](../frontend/js/utils/sikidomHorgony.js) (korlátlan nagyítás horgonyváltással).
*Igazolva: 1–200 testvérnél nulla átfedés és a szülőn belül maradás; 4 egymást követő,
egymásba ágyazott lapnál (240 kör) is nulla átfedés, a korábbi lapok mozdulása nélkül;
kevert bemeneti sorrenddel 20 futásból 0 eltérés (determinizmus); 295 horgonyváltás
10²⁸⁷-szeres nagyításig 2,9·10⁻¹¹ px képeltéréssel.*

### Fejlesztői homokozó — kör-pakolás (2026-08-05)

*NEM az éles nézet: a pakolási módszerek összehasonlítására szolgál, backend és
bejelentkezés nélkül.*

**http://localhost:3000/regiPakolasTeszt.html** *(tisztán frontend — `docker restart`
nem kell, elég a hard-refresh).*

Két módszer futtatható ugyanazon az adaton:

- **régi — koino_1.0 háromszögelés:** a
  [`ContentPositioner.js`](../../koino_1.0/public/js/ContentPositioner.js) hű
  portja ([`regiPakolas.js`](../frontend/js/teszt/regiPakolas.js)). Minden új kört
  az utoljára lerakotthoz és a hozzá legközelebbihez illeszt; ütközés-ellenőrzés
  nincs, ezért átfedések keletkeznek.
- **íves — szabad ívek:** ugyanaz, amit az éles nézet is használ
  ([`ivesPakolas.js`](../frontend/js/teszt/ivesPakolas.js) a lépésenkénti
  naplóval; élesben
  [`sikidomPakolas.js`](../frontend/js/utils/sikidomPakolas.js)).

Amit tud:

- **lépésenkénti lerakás** a legkisebbel kezdve (⏮ ◀ ▶ ⏭, lejátszás, csúszka,
  ← → billentyű), és a jobb oldali ablakban a **teljes pozíció-számítás**:
  a réginél horgony → partner → segédkörök → metszéspontok → ellenőrzés →
  korrekció; az ívesnél horgony → a lehetséges középpontok köre → tiltott ívek →
  szabad ívek → jelöltek → választás;
- a vásznon **geometriailag is** látszik ugyanez (szaggatott segédkörök és
  metszéspontok, illetve a szabad ívek vastag zölddel);
- **méret-eloszlás**: valósághű · egyenletes · mértani (állandó ugrás) ·
  kétpúpú (apró + óriás), plusz egy **ugrás-csúszka** (1,00–3,00×);
- statisztika: átfedő párok, érintett síkidomok, az átfedés mélysége a KISEBBIK
  kör átmérőjéhez mérve (100% = a kisebbik teljesen eltűnt), méret-szórás,
  legnagyobb szomszéd-ugrás.

**Amit érdemes megnézni:** állítsd `egyenletes` eloszlásra 300 körrel, és váltogasd
a módszert. A régi 767 átfedő párt ad (42 véletlen elhelyezéssel), az íves nullát —
ez a szimmetria-probléma, amit a koino_1.0-ban a `+0,001`-es ráhagyás próbált
feloldani.

### API-referencia — Síkidom nézet, KÜSZÖBÖS gyerek-végpont (2026-08-04)

`GET /api/sikidom/gyerekek?szulo=<entitasId|elhagyva>&minPont=<szám>&kurzorPont=<szám>&kurzorId=<id>&darab=<szám>&osszesKell=<0|1>`
— **auth-köteles**. A `szulo` elhagyva → a **gyökerek**.

**NEM lapozás.** A nézetben egy síkidom akkor látszik, ha a képernyőn mért átmérője
elér egy minimumot (24 px). Ebből a méret-képlet megfordításával a kliens kiszámolja,
mekkora tudatpont kell hozzá:

```
pontKüszöb = 20 × szülőPont × ( minimumÁtmérő / (2 × szülőKépernyőSugár) )²
```

…és azt kéri le, ami elér oda. Nagyításkor a küszöb folyamatosan süllyed, mindig
pontosan azok érkeznek, amelyek épp láthatóvá váltak — nincs önkényes lap-határ.
*(A 2026-08-03-i, `kihagy`+`darab` alapú lapozás megszűnt: Csaba kifogása szerint a
lapok között megtört a folytonosság.)*

```json
{ "success": true, "osszesGyerekPont": 13469, "vanTovabb": false,
  "kurzor": { "pont": 1, "id": "…" },
  "gyerekek": [ { "entitasId": "…", "entitasTipus": "Tartalom", "cim": "…",
                  "hierarchikusOsszesPont": 8400, "vanGyereke": true } ] }
```

- `kurzor` — meddig jutottunk a rangsorban (`pont` + az allokáció `_id`-ja). A
  következő kérésbe visszaadva folytatható. A döntő az `_id`, ugyanaz, mint a
  rendezésé — így azonos pontszámnál sem marad ki és nem duplázódik sor.
- `vanTovabb` — az adag beletelt a `darab` plafonba (a küszöbig van még); a kliens
  ilyenkor a kurzorral újra kér.
- `osszesGyerekPont` — az ÖSSZES gyerek együttes pontja (egy csoportosító
  lekérdezés). Ebből tudja a kliens, maradt-e még le nem töltött testvér.
- `osszesKell` — **új (2026-08-08).** Alapértéke `1`. `osszesKell=0` esetén a
  backend **kihagyja** a fenti aggregációt, és `osszesGyerekPont: null`-t ad.
  Miért: a `$group` a szülő MINDEN gyerekére fut, a kliens viszont 150-esével
  kér — egy milliós ágnál ez több ezer teljes végigolvasás ugyanazért az egy
  számért. A kliens ezért csak az **első** kérésnél kéri el, utána `osszesKell=0`
  megy, és a saját másolatát használja.
- `vanGyereke` — egyetlen `distinct` lekérdezésből az egész adagra (nincs N+1).
- `kategoriaIkonok` / `tipusIkon` / `javaslatTipus` — **új (2026-08-08).** Mellék-ikonok
  `{ ikon, nev }` alakban; az `ikon` feltöltött kép-URL VAGY emoji. A Struktúra
  nézettel KÖZÖS forrásból (`strukturaService.mellekIkonokFeltoltese`), típusonként
  egy csoportos lekérdezéssel. A síkidom FORMÁJA az entitástípust mutatja, ezek az
  ikonok pedig azt, amit a forma nem tud: a kategóriát és a tartalomtípust.
- Indexek: `{ szuloId, hierarchikusOsszesPont, _id }` — a szűrés és a rendezés is
  teljesen indexelt (nincs memóriabeli rendezés).
- Backend-változás → **`docker restart koino-backend`**.
- *Böngésző nélkül igazolva (2026-08-04, valódi 105 gyökéren):* küszöbös lekérdezés
  minden küszöbnél pontosan a fölötte lévőket adja; kurzoros folytatás 10-es
  adagokban 105 egyedi elemet ad, duplikátum és kimaradás nélkül.

**Teszt-adat a próbához** (csak fejlesztői környezetben):
`docker exec koino-backend node tools/sikidomTesztAdat.js` — 100 gyökér tartalmat hoz
létre 900-tól 1-ig terjedő tudatponttal. Újrafuttatható (a már létező címeket kihagyja).

*Al-entitások (2026-08-03): a síkidomokon BELÜL ugyanez a spirál ismétlődik — a legnagyobb
al-entitás éppen érinti belülről a szülő peremét. Kapcsoló: „Al-entitások a síkidomokon
belül"; a „Beágyazási mélység" csúszka (0–4) mondja meg, hány al-szintet rajzolunk.
Külön teszt-forgatókönyv nem tartozik hozzá. Böngésző nélkül ellenőrizve: 44 szülő 707
al-síkidomja közül egy sem lóg ki a szülőjéből.*

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

### Síkidom nézet — MÉLYSÉGI teszt-adat (2026-08-06)

A fejlesztői adatbázisban 105 gyökér volt, de mindössze 3 nem-gyökér entitás —
ezért a Síkidom nézet horgonya SOSEM lépett be egy entitásba (mérve: a horgony
szintje végig −1, a virtuális VILÁG maradt), és a befelé nagyítás (drill-down)
esetét nem is teszteltük.

```bash
docker exec koino-backend node tools/sikidomMelysegTesztAdat.js 3 5
```

(mélység, gyerek/csomópont) — a `Közösségi döntéshozatal` gyökér alá épít fát a
rendes service-en át, tehát minden származtatott rekord konzisztens. Újrafuttatható
(a már létező című gyerekeket kihagyja). Futtatva: 155 tartalom 3 szinten.

**Amit a mélységi próbán nézni kell:**

1. Nagyíts BELE egy körbe, amíg a felirataiból látszik, hogy egy szinttel lejjebb
   vagy (pl. „Alapelvek — Közösségi döntéshozatal").
2. A gyerekeknek a SZÜLŐN BELÜL kell maradniuk. Ha nem, a konzol azonnal szól:
   `SikidomModal._ujrapakolas - BEÁGYAZÁS SÉRÜL: gyerek a szülőn kívül`.
3. A konzol `_ujrapakolas` naplója kiírja a `horgonySzint`-et (VILÁG = −1,
   gyökerek = 0, gyerekeik = 1…) és a `magKeppont`-ot. A lyuk a HORGONY szintjén
   ~120 px; lejjebb szintenként √20 ≈ 4,47-szer kisebb — ez a helyes viselkedés.


### Síkidom nézet — a PAKOLÁSI MAG mint jelzés (2026-08-10, 1. lépés)

A „végtelen testvér" lapozás első lépése. Ekkor még NINCS felirat és NINCS
koppintás — csak a lyuk maga.

**⚠️ Két külön „üres mag" van, ne keverd őket:**

| | kijelző-mag | pakolási mag |
|---|---|---|
| hol él | a képernyőn | az adatban |
| mérete | állandó képpont (`MAG_ATMERO_ARANY = 0.12`) | a legkisebb testvér sugarának többszöröse (`PAKOLASI_MAG_ARANY = 6`) |
| mit csinál | eldönti, mi RAJZOLÓDIK ki | valódi lyukat hagy a pakolásban |
| nagyításkor | adat-térben zsugorodik | nem változik |

**Amit nézni kell:**

1. A 10 405 gyökeres adaton (`sikidomTizezerGyokerTesztAdat.js`) nyisd meg a
   Síkidom nézetet. Mivel az előretöltés 10 000-nél megáll, marad 405 le nem
   töltött gyökér — tehát **kell lennie lyuknak** a közepén.
2. Nagyíts befelé. A kijelző-mag zsugorodik, sorra előbukkannak a síkidomok — de
   a közép **akármilyen mélyen üres marad**. Ez a pakolási lyuk; korábban ilyenkor
   a legkisebb síkidom ült a középpontban.
3. A konzol `SikidomModal._ujrapakolas` naplójában a `magSugar` mostantól **> 0**,
   amíg van le nem töltött testvér.
4. **Kis adathalmazon** (ahol minden testvér letöltve): a `magSugar` **0**, és a
   legkisebb síkidom a KÖZÉPPONTBAN ül, láthatóan. Ez maga az üzenet, hogy nincs
   több tartalom.
5. A beágyazás nem sérülhet: ha mégis, a konzol azonnal szól
   (`BEÁGYAZÁS SÉRÜL: gyerek a szülőn kívül`).

**A döntés, ami Csabára vár:** nagyobb vagy kisebb legyen a lyuk. Ez a szám azt
szabja meg, milyen mélyre kell nagyítani, mielőtt a nézet felajánlja a következő
adagot (2. lépés): nagyobb lyuk = hamarabb ajánl. Egyetlen állandó,
`PAKOLASI_MAG_ARANY` a `SikidomModal.js`-ben.

*Böngésző nélkül mérve (2026-08-10): 10 405 gyökéren és 3000 apró gyereken a lyuk
üres marad (behatolás ~1e-17), nincs átfedés, a beágyazás áll, és mag nélkül a
legkisebb pontosan a (0,0)-ba kerül. Kevés, nagy gyereknél a felső határ élesen
harap: mag 0,56 = 1 − 2×0,22, külső sugár pont 1,0000.*


### Síkidom nézet — a „további tartalmak" AJÁNLAT megjelenése (2026-08-11, 2. lépés)

Az 1. lépés (pakolási mag) folytatása. A koppintás MÉG NEM működik — az a 3. lépés;
most csak azt nézzük, a felirat a helyes pillanatban jelenik-e meg, és jól néz-e ki.

**A feltétel:** a kijelző-mag már EGYETLEN lerakott síkidomot sem takar el,
ÉS van még le nem töltött testvér. Csak a HORGONYON (abban a csomópontban, amibe
belenagyítottál) — nem minden látható szülő közepén.

**Amit nézni kell:**

1. A 10 405 gyökeres adaton nyisd meg a Síkidom nézetet, és nagyíts befelé.
2. Kezdetben a „— nagyíts befelé —" súgó szól: van még mit előhívni nagyítással.
3. Nagyjából az **illesztett nézet ötszörösénél** (telefonon a nyolcszorosánál) a
   súgó helyét átveszi a **„további tartalmak"** felirat, rendes (nem halvány)
   szövegszínnel. A kettő SOSEM látszik egyszerre.
4. Kis adathalmazon (minden testvér letöltve) a felirat **soha nem jelenik meg** —
   nincs több tartalom, és lyuk sincs.

5. **TOVÁBB KÖZELÍTVE a feliratnak OTT KELL MARADNIA.** Ez 2026-08-11-en hiba volt
   (eltűnt, amikor a kijelző-mag belecsúszott a pakolási lyukba) — a feltétel azóta
   monoton, és a felirat a valódi ürességhez igazodik, nem a kijelző-maghoz. Mélyen
   bent a szaggatott kör már nagyobb lehet a képernyőnél: ilyenkor a képen CSAK a
   felirat látszik, ez a helyes (odabent tényleg nincs semmi, amíg nem töltünk).

**A döntések, amik Csabára várnak:**

- Jó-e a felirat szövege, mérete, színe. (`uresMagRajzolasa` —
  [`sikidomRajzolo.js`](../frontend/js/utils/sikidomRajzolo.js), 2026-08-11 óta)
- Nem túl korán / túl későn jelenik-e meg. Ha korán: `PAKOLASI_MAG_ARANY` csökkentése.
- Telefon-méretű ablakban van egy rés: minden síkidom látszik már (×5), de a felirat
  csak ×8-nál fér ki. Ha ez zavaró, a `TOVABBI_FELIRAT_MIN_SUGAR` (most 30 px)
  csökkenthető.
- Mélyen bent a felirat betűmérete 16 px-nél megáll, miközben az üres kör tovább nő.
  Ha ott elveszettnek tűnik, a `uresMagRajzolasa` betű-képletének felső korlátja
  emelhető (`sikidomRajzolo.js`).

*Böngésző nélkül mérve (2026-08-11): a feltétel mind asztali, mind telefon-méretben
billen, nem azonnal (kell nagyítani), és a billenés pontosan a „senki sincs elrejtve"
pillanatban van — mind a 4 állítás áll.*


### Síkidom nézet — a KOPPINTÁS és a lapozás (2026-08-11, 3–4. lépés)

Ezzel teljes a „végtelen testvér" kör: a felirat mostantól működik.

**Amit nézni kell:**

1. Nagyíts befelé, amíg megjelenik a „további tartalmak" felirat, majd **koppints rá**.
   A konzolban `SikidomModal._ajanlatKoppintas` sor jelenik meg (`ujPlafon`, `jelolt`).
2. Megérkezik a következő adag, és az **egész elrendezés újraépül**. A folyamatjelző
   közben látszik — az adag több körben jön (150-esével), ez eltarthat pár másodpercig.
3. **A mélység nem veszhet el:** a koppintás előtti legkisebb síkidom LÁTSZÓ MÉRETE
   ugyanakkora marad. Ha a konzolban `MÉLYSÉG visszaállítva` sor jelenik meg, valami
   elmozdította a skálát, és visszaállt — ez rendben van. Ha `MÉLYSÉG: kihagyva
   (közben nagyított)`, akkor te magad nagyítottál a letöltés alatt; ilyenkor a te
   szándékod az erősebb.
4. **A határjelölő:** a megjelölt síkidom körül tágabb, szaggatott gyűrű jelenik meg —
   ez mutatja, hol maradt abba az előző lepakolás.
5. **Egy koppintás = egy adag.** A felirat az adag beérkezése után újra megjelenhet
   (ha van még), de magától NEM tölt tovább.

**⚠️ FONTOS a mai teszt-adatnál.** A 10 405 gyökérből **9 910 egypontos**, vagyis a
következő adag UGYANAKKORA síkidomokból áll. Mivel a pakolás növekvő méret szerint
halad, az azonos méretűek nem kerülhetnek a régiek elé — így az új adag a **külső
gyűrűbe** kerül, és a kép közepén *látszólag nem történik semmi*. **Ez nem hiba.**
Változatos tudatpont-eloszlású adaton az új adag középre érkezik.

Ha a középre érkezést is látni akarod, olyan teszt-adat kell, ahol a pontok
érdemben szórnak (nem csupa 1-es).

*Böngésző nélkül mérve (2026-08-11): a teljes lapozási kör mindkét eloszláson —
a megjelölt mérete változatlan, változatos pontoknál 12,77×-ére tolódik kifelé,
holtversenynél meg sem mozdul, és mind a 20 000 lerakódik. Mind a 7 állítás áll.*


### Síkidom nézet — két böngészős hiba javítása (2026-08-11, Csaba)

**🔴 1. A határjelölő eltűnt az újrapakolás után.** A jelölés a koppintáskor még
látszott, utána nem. Ok: a gyűrűt az `_alakzatRajzolasa`-ban rajzoltam, ott viszont
a néhány képpontos síkidomok az OLCSÓ útra esnek (`APRO_ATMERO` alatt egyetlen folt,
korai `return`) — a megjelölt pedig épp a lepakolás LEGKISEBBJE, tehát mindig oda
esett. → Javítás: külön rajzoló menet (`_hatarjeloloRajzolasa`), minden más FÖLÖTT.

**🔴 2. Mélyen az üres magban koppintva a kép a TELJES SPIRÁLON KÍVÜLRE került.**
→ Javítás Csaba kérése szerint: **a megjelölt síkidom a lepakolás után a KÉPERNYŐ
KÖZEPÉRE kerül**, a koppintáskori méretében. A nézetet expliciten állítjuk be a
megjelölt keretéből (`keretbenCsomopont` + `skala = kepSugarPx / keret.r`).

**🔴 2/b. Az első javítás NEM MŰKÖDÖTT — az IDŐZÍTÉS volt a hiba.** A fókuszálást az
`_ujrapakolas`-ba tettem, az viszont a kért adag alatt SOKSZOR lefut: az adag
150-esével, kb. 67 körben érkezik. Így az első 150 síkidom után fókuszáltunk, majd
még ~9 850 érkezett, mindegyik újrapakolással — a nézet pedig ott maradt.
→ A fókuszálás átkerült EGYETLEN helyre (`_fokuszAMegjeloltre`, a
`_tennivalokFeldolgozasa` végén), és csak akkor fut, ha a LAPOZOTT csomópontra
nincs futó letöltés, nem is várunk rá továbbit, és a várólistája üres. A feltétel
szándékosan nem globális csend — más csomópontok folyamatosan kérhetnek adatot.

*Mérve (2026-08-11): az új képlet képpont-pontosan a közepére teszi és tartja a
méretét; a javítás előtti állapotban ugyanez a síkidom 4 képernyőnyire volt a
képernyő közepétől. Mind a 4 állítás áll.*

**Amit a böngészőben nézni kell:**

1. Nagyíts MÉLYEN bele az üres magba (annyira, hogy a szaggatott kör se látszódjon),
   és koppints a „további tartalmak"-ra. A lepakolás után a megjelölt síkidomnak a
   **képernyő közepén** kell lennie, a szaggatott határjelölő gyűrűvel körülvéve.
2. A konzolban `FÓKUSZ a megjelöltre` sor. Ha `FÓKUSZ: kihagyva (közben nagyított)`,
   akkor a letöltés alatt magad mozgattad a nézetet — ilyenkor a te szándékod győz.
3. A határjelölő gyűrűnek a legapróbb méretben is látszania kell.


### Síkidom nézet — KÉT PRÓBA-ÁG teszt-adat (2026-08-11, Csaba)

Két hiányzó eset kipróbálásához, amit a mai gyökér-szintű adat nem tudott megadni.
Egyetlen szerszám építi mindkettőt, KÜLÖN gyökér alá, hogy a meglévő 10 402 gyökeret
ne zavarja, és a Keresésből azonnal megtalálható legyen:

```bash
docker exec koino-backend node tools/sikidomAgTesztAdat.js
```

Paraméterezhető (`testvér-darab`, `lánc-mélység`), és van SZÁRAZ FUTÁSA is, ami csak
kiírja, mit hozna létre:

```bash
docker exec koino-backend node tools/sikidomAgTesztAdat.js proba
```

Újrafuttatható: a meglévő című gyerekeket kihagyja, a láncban pedig egyszerűen lelép
a meglévő szinteken — egy félbeszakadt futás tehát folytatható.

#### A) „Ötezres testvér-mező (síkidom próba)" — a lapozás VÁLTOZATOS pontokkal

5 000 gyerek egyetlen gyökér alatt, **Zipf-eloszlású** tudatponttal: a legerősebb
550 pont, a leggyengébb 1 — nagyjából 23-szoros sugár-különbség.

**Ez az az adat, ami a fenti „⚠️ FONTOS a mai teszt-adatnál" hiányát pótolja.** A
gyökér-szinten 10 405-ből 9 910 egypontos, tehát ott a lapozás után az új adag a
külső gyűrűbe kerül, és a kép közepén látszólag nem történik semmi. Itt viszont a
pontok érdemben szórnak, tehát:

1. Nagyíts bele a mezőbe, amíg megjelenik a „további tartalmak" felirat, és koppints rá.
2. **Az új adagnak KÖZÉPRE kell érkeznie** — a megjelölt síkidom kifelé tolódik, a
   határjelölő gyűrű a képernyő közepén marad, és körülötte megjelennek az újak.
3. A megjelölt síkidom LÁTSZÓ MÉRETE közben nem változhat (a mélység megmarad).

Mivel az adag mérete 5 000 (`ELORETOLTES_DARAB`), az 5 000 testvér épp EGY adag —
tehát a felirat itt a mező alján **nem** jelenik meg, ha minden testvér lejött. A
lapozás próbájához futtasd nagyobb darabszámmal, pl. `… sikidomAgTesztAdat.js 8000`.

#### B) „Ötven szintű mély lánc (síkidom próba)" — a végtelen egymásba ágyazás

50 szint, szintenként EGYETLEN gyerek, mindegyik 1 tudatponttal.

**Miért 1 pont:** a gyerek látszó mérete a saját és a szülő hierarchikus pontjának
arányából jön, a szülőé pedig tartalmazza a gyerekéit. Egyenletes 1 pontnál ez az
arány (n−1)/n — a lehető legközelebb az 1-hez, vagyis ez adja a LEGNAGYOBB elérhető
láncszemet. Több pontot adni a mélyebb szinteknek épp rontana.

**Amit nézni kell:**

1. Keresd meg a gyökeret, és nagyíts BELE, szintről szintre. A feliratból mindig
   látszik, hol tartasz: `1. szint — mély lánc`, `2. szint — mély lánc`, …
2. Szintenként a terület a huszadára csökken, a sugár tehát √20 ≈ **4,47-szeresére**
   nagyítandó. 50 szint alatt ez nagyjából **10³²-szeres** nagyítás — pontosan ez
   teszi próbára a korlátlan nagyítást és a horgonyváltást.
3. A konzol `_ujrapakolas` naplójában a `horgonySzint` szintenként eggyel nő
   (VILÁG = −1, gyökerek = 0, az 1. szint = 1 …). **Az 50. szintig el kell jutni
   pislogás és skála-ugrás nélkül.**
4. A beágyazás egyetlen szinten sem sérülhet: ha mégis, a konzol azonnal szól —
   `SikidomModal._ujrapakolas - BEÁGYAZÁS SÉRÜL: gyerek a szülőn kívül`.

#### 🔴 Amit ez a teszt-adat kihozott: az `osszesGyerekPont` hibája (2026-08-11)

A két ág API-s ellenőrzésekor derült ki, hogy a `GET /api/sikidom/gyerekek`
**minden nem-gyökér szülőre `osszesGyerekPont: 0`-t adott** (az 5 000 gyerekes
mezőnél 8 549 helyett). Ok: az aggregáció `$match`-e nem kasztolja a szöveges
azonosítót ObjectId-ra. Javítva; részletek a
[fejlesztesi_terv.md](fejlesztesi_terv.md)-ben.

**Két dolgot érdemes emiatt külön nézni:**

1. **Nem-fókusz szülő nem mutathat kamu lyukat.** A hiba miatt a nézet nem tudta,
   mennyi van hátra, és a „lehet még" tartalék-ágra esett — így egy olyan szülő
   közepén is lyuk maradt, aminek MINDEN gyereke le volt töltve. A javítás után
   ott a legkisebb síkidomnak a középpontban kell ülnie, lyuk nélkül.
2. **Sebesség.** A hiba miatt minden kérés újra végigolvasta a szülő összes
   gyerekét. A mezőbe (5 000 gyerek) nagyítva a betöltés most érezhetően fürgébb
   lehet; a konzolban az első kérés után `osszesKell=0` kell hogy szerepeljen a
   további kérések URL-jében.

Gyors ellenőrzés API-ból (a `<id>` helyére a szülő azonosítója):

```bash
curl -s -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/sikidom/gyerekek?szulo=<id>&minPont=0&darab=5&osszesKell=1"
```

Az `osszesGyerekPont` nem lehet 0, ha a szülőnek van gyereke.


### Síkidom nézet — a BEFELÉ NAGYÍTÁS felső határa (2026-08-11)

Eddig a befelé nagyítás korlátlan volt, mert „arra való a horgonyváltás". Ez csak
addig igaz, amíg a horgony le TUD lépni. Ha olyan csomóponton áll, aminek nincs
betöltött gyereke (levél, vagy még meg nem érkezett adat), akkor ott ragad, és a
skála elszalad — böngészőben mérve 1,18·10³-ról **1,81·10¹⁴**-re. Ekkor a `double`
16 jegye elfogy, és a **kép remegni kezd**. Ez volt a „19–20. szint után szétesik".

Az új korlát a meglévő állandókból jön (`LEFELE_KUSZOB / LEGNAGYOBB_GYEREK_ARANY`
≈ 8,94): a horgony legfeljebb a képernyő ~8,9-szeresére nőhet, ha nincs mibe
lelépnie. Részletek: [fejlesztesi_terv.md](fejlesztesi_terv.md).

**Amit a böngészőben nézni kell:**

1. **A levél-eset.** Nagyíts bele egy olyan síkidomba, aminek nincs gyereke (pl. az
   „Ötezres testvér-mező" bármelyik gyereke). A nagyításnak **simán meg kell
   állnia**, amikor a síkidom nagyjából 9 képernyőnyi — se remegés, se üres kép.
   A kifelé nagyítás és a húzás ilyenkor is működjön.
2. **A lánc.** Az „Ötven szintű mély lánc"-ban menj le, ameddig tudsz. Ahol eddig
   remegni kezdett, most **meg kell állnia**. Ha a következő láncszem betöltődik,
   a korlát felenged, és mehetsz tovább — vagyis a lefelé haladásnak folytatódnia
   kell, csak esetleg meg kell várni az adatot.
3. **Nem szabad falba ütközni ott, ahol van még lejjebb.** Ha egy olyan
   síkidomnál áll meg a nagyítás, aminek VAN gyereke, az hiba — jelezd.
4. A konzol `_ujrapakolas` naplójában a `horgonySzint` továbbra is nőjön, ahogy
   lefelé haladsz.

⚠️ **Ez a korlát nem a mélységet korlátozza.** A horgony-keretes nagyítás böngésző
nélkül 50 szinten át pontosnak mérve (`tools/sikidomMelysegProba.mjs`). A korlát
csak azt tiltja, hogy a nézet OLYAN mélyre menjen, ahonnan már nincs tovább.


### Síkidom nézet — a horgonyváltás POZÍCIÓ-feltétele (2026-08-11)

A lefelé váltás sokáig CSAK a méretet nézte, és a küszöböt átlépők közül a
legnagyobbat választotta — akkor is, ha az már kicsúszott a képből. Emiatt a
horgony nem abba az ágba ment, amibe nagyítottál. A koino_1.0 szabálya nyomán
(`distanceFromCenter <= content.radius`) mostantól kell a második feltétel is:
**a képernyő közepe a síkidomon belül legyen**. Részletek:
[fejlesztesi_terv.md](fejlesztesi_terv.md).

**Amit a böngészőben nézni kell:**

1. **A mély lánc:** nagyíts bele, és menj le. A horgonynak **végig azt kell
   követnie, amibe nagyítasz** — a konzol `_ujrapakolas` naplójában a
   `horgonySzint` szintenként pontosan **eggyel** nőjön (0 → 1 → 2 → …), ugrás
   nélkül. Az 50. szintig el kell jutni, remegés nélkül.
2. **Ne ugorjon más ágra:** ha egy erős testvér mellett nagyítasz be egy gyengébbe,
   a nézetnek a gyengébbet kell követnie — azt, ami a képernyő közepén van.
3. **Félre-nagyítás:** ha két síkidom KÖZÉ nagyítasz (egyikük közepén sincs a
   képernyő közepe), a horgony maradjon ott, ahol van. Ez helyes: nincs egyértelmű
   cél, amibe belépne.

*Böngészőben igazolva (2026-08-11, Csaba): az 50 szintű láncon a horgony útja
VILÁG → gyökér → 1 → 2 → … → 50, minden lépés pontosan +1, ugrás nélkül; a skála
végig 77 és 3 437 között maradt (a javítás előtt 1,81·10¹⁴-ig szaladt), és a
`BEFELE_HATAR` korlátnak egyszer sem kellett közbelépnie.*


### Síkidom nézet — MÉLYSÉG szerinti ős-söprés (2026-08-11)

A tár eddig monoton nőtt: a 49. szinten mérve **5 094** csomópontból **5 040 volt
gyökér**, 49 szinttel a látómezőn kívül. Mostantól a folyosón (`FOLYOSO_SZINT = 6`)
kívül eső ősök gyerekei elengedődnek — mérettől függetlenül, tisztán a mélység
alapján. Az adatuk megmarad, tehát visszafelé nincs újraletöltés. Részletek:
[fejlesztesi_terv.md](fejlesztesi_terv.md).

**Amit a böngészőben nézni kell:**

1. **A kép nem változhat.** Menj le a mély láncban 10-15 szintet, majd gyere vissza.
   A síkidomoknak PONTOSAN ott kell lenniük, ahol lefelé menet voltak — se ugrás,
   se átrendeződés. Ez a legfontosabb: a söprés a sorrend közepéből is elenged,
   és csak akkor helyes, ha a visszaút hiánytalan.
2. **A konzolban** `SikidomModal._osSopres` sorok jelennek meg lefelé haladva
   (`elengedve`, `parkolvaOsszesen`), kifelé jövet pedig `_kiparkolas`
   (`visszaadva`). A kettőnek párban kell állnia.
3. **Nem szabad újraletöltésnek indulnia** visszafelé: a parkolt szint adata
   megvan. Ha a hálózaton új `sikidom/gyerekek` kérés megy ugyanarra a szülőre,
   az hiba — jelezd.
4. **A pakolási lyuk és a „további tartalmak" ajánlat** ugyanúgy viselkedjen, mint
   eddig — a söprés nem érintheti a folyosón belüli szinteket.

*Böngésző nélkül mérve (`tools/sikidomParkolasProba.mjs`, 16 állítás): öt eseten
(300–3000 elem, változatos / vegyes / csupa holtverseny, maggal és anélkül) a
parkolás után egyetlen kör sem mozdul el. Ellenpróba: hiányos készlettel pakolva
600 kör mozdul el — ezért kötelező a szintet EGYBEN visszaadni.*


### Síkidom nézet — RÉSZLETESSÉGI FOKOZAT és a két üzemmód (2026-08-11)

A nézet mostantól mélység szerint fokozza a részletességet, és csomópontonként két
üzemmód között vált. Részletek: [fejlesztesi_terv.md](fejlesztesi_terv.md).

| mélység a horgonyhoz képest | pozicionált síkidom | kijelző-mag (517 px képernyőn) |
|---|---|---|
| 0 (a horgony) | 5 000 | 31,0 px |
| 1 | 250 | 6,9 px |
| 2 | 12 | 1,6 px |

**Amit nézni kell:**

1. **Nem szabad minden közelítéskor újrarendeznie.** A konzol `_ujrapakolas` sorai
   közt NEM lehet két olyan, ami ugyanarra a csomópontra, ugyanabban a mélységben
   fut le egymás után. Ha van, az visszaesés — jelezd.
2. **A horgony szintjén minden testvér látszik**, akármilyen apró. A minimum méret
   csak a mélyebb szinteken szűr.
3. **Ha minden testvér helyet kapott, nincs szaggatott kör** és nincs rejtés a
   közepén — a legkisebb síkidom ott ül, láthatóan. Ez az üzenet, hogy nincs több
   tartalom. Egy entitásos síkidomban a gyereknek azonnal látszania kell.
4. **Szintváltáskor átrendeződik a kép** (250 → 5 000). Ez TERVEZETT: végtelen
   testvérrel nem lehet megúszni az újrapakolást, csak ritkítani. Ha zavaróan
   erősnek érzed, jelezd — az időzítésen lehet állítani.

*Böngészőben igazolva (2026-08-11, oda-vissza zoomolással): 6 pakolás a teljes
munkamenetben, ismétlődés nélkül; a mező az 1. mélységben pontosan 250-et rakott le
egyetlen menetben.*
