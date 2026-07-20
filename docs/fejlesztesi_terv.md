# koino_1.1 — Fejlesztési terv

*Utolsó frissítés: 2026. 07. 19.*

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
| Térkép | ✅ | A teljes entitás-fa teljes képernyős, interaktív nézete (13/b). AKTÍV IRÁNY (2026-07-20: visszatértünk hozzá a síkidom felfüggesztése után) |
| Síkidom nézet | ⏸️ | FELFÜGGESZTVE (2026-07-20) — az 1. lépés (statikus ablak) elkészült, de a megjelenés még nem jó; jegelve, később visszatérünk (14. terv-pont) |
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
6. [x] **Értesítések** (főmenü) — KÉSZ (2026-07-14–15): beállítás-cascade, postafiók
   (`ErtesitesekModal`), app- és kártya-badge-ek, ág-szűrt kártya-postafiók (A1–A3 + B
   lépések; teszt.md 30–37).
7. [x] **Tudatpontok nézet** — KÉSZ (2026-07-18; böngészős teszt hátra: teszt.md 42).
   Új `TudatpontokModal`: a saját AKTÍV hozzárendelések listája (entitás címe + típusa
   + 🌟 pont), fejlécben a szabad tudatpont; sor-kattintás → pakli-navigálás; ✏️ →
   a meglévő `TudatpontModal` al-modalként, siker után frissülő lista + alsó sáv.
   A fő menü 🌟 „Tudatpontok" pontja a TELJES listát nyitja; MINDEN kártya-hamburgerben
   közös „Tudatpontok" pont ÁG-SZŰRT módban (Csaba kérése: az ágazat saját entitásai).
   Backend: `GET /api/tudatpont/aktiv-hozzarendelesek` bővítve `entitasCim`-mel
   (közös cím-feltöltő az ertesitesService-ből) + opcionális `agEntitasId` szűrővel
   (ős-lánc bejárás, entitásonként cache-elve).
8. [x] **eember beállítások** — KÉSZ (2026-07-18; böngészős teszt hátra: teszt.md 47).
   Új `EemberBeallitasokModal` (fő menü ⚙️): azonosítók megjelenítése (e-embernév,
   e-mail — v1-ben nem módosíthatók), profil-adatok módosítása (valódi név + lokáció
   autocomplete-tel; mentés után fejléc-frissítés) és jelszóváltás (jelenlegi jelszó
   igazolásával, regisztrációs erősség-szabállyal). Backend: PUT `/api/eember/adatok`
   + POST `/api/eember/jelszovaltas`; a `sajat-adatok` válaszban már email + lokacio is.
9. [ ] **Új kategória létrehozása ebből** (Kategória kártya) — alkategória létrehozása; backend módosítást is igényel (kategória-hierarchia)
10. [x] **Jogosultság-függő menüpontok** — a kártya-menük megnyitáskor jelzik a jogosultságot: a tudatpontot igénylő menüpontok (Javaslat létrehozása, Szavazat leadása, valamint „Új tartalom/kategória létrehozása ebből") inaktívak (halvány + magyarázó tipp), ha az eembernek nincs tudatpontja az entitáson. Megvalósítás: a menüpont `tudatpontFuggo: true` jelölést kap; a `Kartya` alaposztály a menü megnyitásakor a `GET /api/tudatpont/entitas/:tipus/:id → eemberHozzajarulas` (eemberenkénti `tudatponthozzarendeles.tudatPontok`) alapján tiltja/engedi. A backend a védelmet külön kikényszeríti (javaslatService, szavazatService).
    - **Döntés (2026-07-10) — a backend szabálya a mérvadó:** a szavazati jogosultságot MINDIG az érintett entitás(ok)on lévő tudatpont dönti el (`erintettEntitasok`, ahogy a backend teszi); a javaslaton magán lévő tudatpont hiánya NEM akadály, attól még lehet szavazni. A frontendet ehhez igazítjuk. **Választott megoldás:** a **pakli e-ember-tudatossá tétele** — a `pakliService` megkapja a néző e-ember azonosítóját (a pakli útvonal már `authMiddleware`-es, a `req.user.id` rendelkezésre áll), és a javaslat-kártya adataihoz kiszámolja a `szavazhat` jelzést a backend saját szabályával (`javaslatJogosultsagService`). A frontend a „Szavazat leadása" pontot ez alapján engedi/tiltja (nem a javaslat saját tudatpontja alapján). Ez foundational: az e-ember-tudatos pakli más funkciókhoz is kell (lásd a fejléc saját-tudatpont jelzés jegyzete, [jegyzetek.md](jegyzetek.md), 2026-07-10).
    - **Egyezmény** kártya „Javaslat létrehozása" pontja még 🚧 (nincs kész) — amikor megépül, ugyanígy `tudatpontFuggo` jelölést kap.

11. [ ] **Kártya-fejléc átalakítása (folyamatban, 2026-07-11)** — a fejléc három vízszintes sávra oszlik (elválasztó vonalak nélkül): **felső sor** = cím/név/megnevezés (dinamikus betűméret — [jegyzetek.md](jegyzetek.md)); **bal négyzet** = lejjebb hozott hamburger; **jobb oldali két sor** = ikon+szám blokkok (jobbra igazítva). Entitástípusonként:
    - **Közös 1. sor:** entitás saját tudatpont + hierarchikus tudatpont + hozzájárulók száma (mindig), a néző e-ember saját pontja (csak ha >0).
    - **2. sor:** Tartalom → kategória + tartalomtípus ikon; Kategória/Tartalomtípus → hány tartalom használja; Javaslat → részvételi/támogatottsági/ellenzői/tartózkodói % + döntési idő; Egyezmény → részvételi/támogatottsági/ellenzői/tartózkodói % + döntés dátuma.
    - **Felső sor szövege:** Javaslat → „Módosítási/Törlési/Áthelyezési/Egyesítési javaslat", csomag → „Javaslat csomag"; Egyezmény → ugyanígy „… egyezmény" / „Egyezmény csomag".
    - **Backend KÉSZ (B1–B5):** `sajatTudatpont` → `entitasSajatTudatpont` átnevezés; a pakli küldi a `hozzajarulokSzama` és `eemberSajatTudatpontEntitason` mezőket (közös forrás: `TudatpontService.entitasAllokaciLekerese`); Kategória/Tartalomtípus `hasznaloTartalmakSzama` (új `tartalomRepository.countByKategoriaId` / `countByTartalomTipusId`); a javaslat/egyezmény küldi a `tartozkodoiArany`-t, az egyezmény az `ellenzoiArany`/`tartozkodoiArany`/`dontesDatum` (=`vegrehajtva`) mezőket.
    - **Szavazási matek — Modell A (2026-07-11):** a támogatottsági/ellenzői/**tartózkodói** arány tiszta szelet (mind = szavazat-szám/összes szavazó × 100), együtt 100%. A tartózkodás már nem „fél-támogatás" (a korábbi `tk/2` szétosztás megszűnt) → csökkenti a támogatottságot, így nehezíti az elfogadást (az elfogadási küszöb a tiszta támogató%-ot nézi). A **bizonyossági mutató** matematikailag változatlan: `(|támogató% − ellenző%| + részvételi%) / 2`. Érintett: `javaslatSzamitasService`, `javaslat`+`egyezmeny` modell (új `tartozkodoiArany`, egyezménynél `ellenzoiArany` is), `egyezmenyService` snapshot, `pakliService`.
    - **Frontend KÉSZ (F1–F4, 2026-07-11, böngészőben MÉG NEM tesztelve):** `kartya.html` + `kartya.css` háromsávos váz (elválasztó vonalak nélkül, hamburger 60×60 bal négyzet, ikon-terület jobbra igazítva); `Kartya.js` a két slotot (cím / ikon-terület) adja át. **F2:** közös `javaslatMegnevezes.js` (Módosítási javaslat / Javaslat csomag / … egyezmény) + dinamikus címbetűméret **kétlépcsősen** (2026-07-12): `_cimBetumeretBecsles` karakterszám-becslés az `init()`-ben (a kártya még nincs a DOM-ban), majd `cimBetumeretHozzaigazitasa()` a valódi cím-sáv-szélességhez arányosítva (a Pakli `paklitRendel` rAF-jében hívja; MIN 8 – MAX 24px). A cím LEGFELJEBB 3 SORBA tördel (CSS `-webkit-line-clamp: 3`), balra igazítva, a méretezés a 3-soros helyhez arányosít. A mezőnév-egyértelműsítés (`entitasSajatTudatpont` vs. `eemberSajatTudatpontEntitason`) ellenőrizve, kész. **F3:** közös tudatpont-sor a base-ben (`_kozosTudatpontSorFeltoltese` + `_ikonElem`) mind az 5 kártyán: 🌿 entitás saját · 🌲 hierarchikus · 👥 hozzájárulók (mindig) · ⭐ néző saját (csak >0); a régi per-kártya tudatpont-sorok törölve. **F4:** típusfüggő 2. sor — Tartalom: típus+kategória ikon; Kat/Típus: 📄 „hány tartalom használja" (az entitás saját ikonja is marad); Javaslat/Egyezmény: 👥✅❌➖ (részvételi/támogatottsági/ellenzői/tartózkodói %, **egészre kerekítve**) + ⏱ döntési idő (`masodpercFelirat`) / 📅 döntés dátuma. **Döntés:** a bizonyossági mutató (🎯) lekerült a fejlécről (a Részletek modálban marad).

12. [x] **Keresés (fő menü + ág-szűrt kártya-menük)** — KÉSZ (2026-07-18; böngészős
    teszt hátra: teszt.md 43). Csaba döntései: v1 = **cím/név alapú** (a tartalmak
    szövegében keresés későbbi bővítés); **típus-pipák** vannak (Tartalom/Kategória/
    Tartalomtípus); tudatpontos rangsor NEM kell. Új `KeresesModal` (keresőmező
    ~300 ms debounce-szal, pipa-váltásra újrakeresés, találatra kattintva
    pakli-navigálás); fő menü 🔍 pont (teljes keresés) + MINDEN kártya-hamburgerben
    közös 🔍 pont ÁG-SZŰRT módban. Backend: a meglévő `GET /api/kereses` bővítve
    `agEntitasId` paraméterrel (ős-lánc bejárás cache-elve; ág-szűrésnél
    jelölt-többlet lekérés, a limitre vágás a szűrés után).

13. [x] **Navigáció-bővítés: testvér-kacsacsőrök + Térkép** (terv elfogadva:
    2026-07-19, Csaba döntései; 13/a KÉSZ és böngészőben igazolva, 13/b KÉSZ, de
    ❓ FELTÉTELES — böngészős teszt hátra: teszt.md 50). Név-döntés (2026-07-19):
    a „minimap" név elvetve, a funkció neve **Térkép**, és TELJES KÉPERNYŐS.
    **FRISSÍTÉS (2026-07-20): visszatértünk a Térképhez.** A Síkidom nézet
    (14. pont) 1. lépése elkészült, de a megjelenés még nem jó → FELFÜGGESZTVE;
    a Térkép (13/b) újra az AKTÍV navigációs-vizualizációs irány.
    - **13/a. Testvér-jelző kacsacsőrök — ✅ KÉSZ (2026-07-19; böngészős teszt
      hátra: teszt.md 48).** A kiválasztott kártya két szélén lebegő, KATTINTHATÓ
      ‹ N és N › gombok: hány testvér van az adott irányban (a testvér-sorrendben
      az aktív elem előtt/után). Koppintásra testvérváltás — így mobilon is megy
      (eddig csak vízszintes görgetés/swipe). Csak frontend munka volt: a backend
      a pakli-válaszban már küldte a `testverek` listát. Megvalósítás: a rendezés
      KÖZÖS segédbe került (`frontend/js/utils/testverRendezes.js` —
      `testverTeljesSor` + `testverSzamok`; a `Pakli.testverValtasa` lépegetése
      és a számok UGYANEBBŐL jönnek, így sosem térhetnek el); új `TestverJelzo`
      komponens (JS + CSS, a gombok a `.pakli-kartya` külső wrapperre kerülnek,
      `stopPropagation`-nel, hogy ne váltsanak kártya-kiválasztást); a
      `Pakli.testverJelzoFrissitese` önvédő (adat-hiánynál/kártya-eltérésnél
      elrejt), hívva a render utáni rAF-ben, kártya-kiválasztáskor (cache-ből
      azonnal, különben a háttér-letöltés után) és a csak-CSS váltásnál.
      Node-os egység-teszt (15 eset: rendezés, döntetlenek, szél-helyzetek,
      ObjectId) lefutott, a statikus kiszolgálás curl-lel igazolva. Ismert
      korlát: a `findTestverek` 100 testvérre limitál, a számláló ott levág.
    - **13/b. Térkép (HIBRID Canvas + SVG fa-nézet) — ✅ KÉSZ, AKTÍV IRÁNY
      (2026-07-20).** Elkészült és curl-lel igazolt (böngészős teszt hátra:
      teszt.md 50). A Síkidom nézet (14. pont) felfüggesztése után visszatértünk
      a Térképhez mint navigációs-vizualizációs irány. A leírás alább a
      megvalósult állapotot rögzíti. Teljes képernyős, interaktív nézet
      az entitás-fáról. **Hibrid felépítés** (Csaba döntése: több tízezer
      tartalomra kell készülni, de a részletes interakció is fontos):
      **Canvas alapréteg** rajzolja a TELJES fát (élek + típus-színű pöttyök),
      fölötte **SVG fedőréteg** CSAK a látható csomópontokra és legfeljebb 250
      darabig (ikon + rövid cím + tooltip + kattintás) — távolról a canvas-kép,
      belenagyítva az interaktív réteg. Közös transzformáció (skála + eltolás),
      pan (húzás), zoom (görgetés a kurzorra + ＋/－/⤢ gombok). Az aktuális
      entitás kiemelve (gyűrű); csomópontra kattintva pakli-navigálás; távoli
      nézetben a pöttyre kattintás kézi találat-kereséssel működik.
      Elérhetőség a Keresés/Tudatpontok mintájára: fő menü 🗺️ = TELJES fa,
      MINDEN kártya-hamburger 🗺️ = ÁG-SZŰRT részfa. Mind az 5 entitástípus
      fixen rajta van. **Folyamat-vezérlés (Csaba kérése):** (1) megnyitáskor
      ELŐBB darabszám-kijelzés („N entitás — elkészíted?", Elkészítés/Mégse);
      (2) építés közben folyamatjelző (Letöltés 0–50% + Elhelyezés 50–100%,
      számokkal); (3) végig látható MEGSZAKÍTÁS gomb — a letöltést
      `AbortController` állítja le, az elrendezés darabhatáron áll meg, a modal
      visszaáll az indító nézetre.
      **Backend:** `GET /api/terkep/darabszam` (globális darab + `agEntitasId`-re
      szintenkénti BFS-sel az ág mérete) és `GET /api/terkep` (kurzoros lapozás
      `_id` szerint, max 2000/lap, szűk projection) — forrás a
      `hierarchikusTudatpontAllokacio` kollekció, címek a közös
      `entitasCimekFeltoltese` segéddel (Javaslat/Egyezmény → null). Új
      repository-metódusok: `countOsszes`, `findTerkepLap`, `findGyerekIdkBySzulok`.
      Curl-igazolt: globális 25 / ág 5 darab; 3 lap = pontosan 25 sor; auth 401.
      **Frontend:** új `TerkepModal` (JS + HTML + CSS; a Modal `meret: 'teljes'`
      — új `modal-panel--teljes` CSS-osztály, az alaposztály nem változott) +
      **`faElrendezes.js`** elrendezés-motor (DOM-független, Node-tesztelt:
      30 eset zöld, 55 000 csomópont ~76 ms): levelek balról jobbra, szülő a
      gyerekei közepén, testvér-sorrend a KÖZÖS `testverRendezes` szabállyal
      (új `testverOsszehasonlitas` export); generátoros, darabolt feldolgozás
      rAF-szünetekkel; kör-védelem + maradék-söprés (hibás adatnál sem tűnik el
      entitás); árva entitás gyökérként jelenik meg. Az ág-szűrés a frontenden
      történik (a letöltés mindig a teljes fa — vállalt v1-korlát, kis ágnál
      többlet-letöltés; cserébe egyetlen egyszerű, kurzoros adat-út van).
      - **13/b-2. Kétszintű (LOD) megjelenítés + kattintás-javítás (2026-07-20,
        Csaba böngészős visszajelzése után).** Két hiba derült ki a böngészőben:
        (1) a csomópontra kattintva nem ugrott a pakli, (2) a nagyításkor az ikon
        nem nőtt és nem jött elő többletinfó — nem volt érezhető „ráközelítés".
        **Okok:** (1) a pan-húzás `setPointerCapture`-je miatt a `pointerup`
        `e.target`-je mindig a nézet-div volt, így az SVG-csomópont sosem
        illeszkedett; ráadásul a canvas-tartalék tolerancia csak 10 px volt.
        (2) az SVG-réteg a LÁTHATÓ darabszámtól függött, nem a nagyítástól — kis
        fánál mindig minden látszott, fix méretben, így a zoom csak a távolságot
        változtatta. **Megoldás (`TerkepModal.js` + `terkepModal.css`):**
        (1) a kattintás mostantól `elementFromPoint`-tal keresi a valódi
        csomópontot (a capture-t elengedve), tartalékként koordináta-kereséssel,
        a látható jel-sugárhoz igazított toleranciával. (2) Új **részletességi
        (LOD) szintek** a NAGYÍTÁStól függően (mérce: `FA_TAVOLSAG_Y * skála`
        képernyő-rács): 0 = csak pötty (áttekintés) · 1 = + ikon · 2 = + cím ·
        3 = + ágazati össztudatpont (🌿🌟). A csomópontok mérete VÉGIG EGYSÉGES
        (Csaba döntése: nem a tudatpont-mennyiség, hanem a ráközelítés hozza elő
        a részletet). Az illesztés max 0.6 skáláig zoomol be (marad hova
        közelíteni), a kicsinyítés eléri az áttekintő pötty-szintet, `MAX_ZOOM`
        4 → 6. Böngészős teszt hátra (teszt.md 50).
        - **13/b-3. Csomópont-méret a zoomhoz (kipróbálás alatt, 2026-07-20).**
          Csaba kérése: próbáljuk ki azt is, hogy a csomópontok NE fix képernyő-
          méretűek legyenek, hanem a ráközelítéssel TERMÉSZETESEN nagyobbak.
          Egy kapcsoló dönt (`TerkepModal.js`: `IKON_NO_A_ZOOMMAL`): `true` =
          világhoz kötött (zoommal nő/zsugorodik, `NODE_VILAG_EGYUTTHATO` és
          `NODE_MAX_SKALA` hangolja), `false` = a korábbi fix képernyő-méret. A
          kattintás-tolerancia és a `scale()` transzform is ezt követi. Jelenlegi
          alapérték: `true` — Csaba böngészős összevetése dönt a véglegesről.
        - **13/b-4. Alsó sáv látszik a Térkép alatt is (2026-07-20, Csaba
          kérése).** A teljes képernyős Térkép eddig eltakarta a főoldal alsó
          sávját; most az is látszik, ahogy a pakli nézetben. Megoldás: a
          `TerkepModal` megnyitáskor a body-ra teszi a `teljes-nezet-nyitva`
          osztályt (záráskor leveszi), a `terkepModal.css` pedig (a) az
          `.also-sav`-ot a modal fölé emeli — mivel önálló rétegződési kontextus,
          a benne lévő hamburger menü is a modal fölé kerül, tehát HASZNÁLHATÓ
          marad —, (b) az overlayt és a teljes panelt az alsó sáv fölött zárja
          (`--alsosav-magassag`, a JS méri, mert kis képernyőn a statisztika
          tördhet). A Síkidom nézet (teljes) egyelőre NEM kapja ezt (később
          ugyanígy beköthető).
        - **13/b-5. Finomítások (2026-07-20, Csaba böngészős visszajelzése).**
          (1) **Nincs előzetes kérdés:** a Térkép megnyitáskor EGYBŐL épít (az
          indító „N entitás — elkészíted?" nézet megszűnt, HTML/CSS/JS-ből is);
          a folyamatjelző (számláló) + **Mégse** gomb végig látszik, a Mégse
          leáll és bezár. (2) **Zoom-gesztus:** a kétujjas fel/le görgetés már
          NEM zoomol (az pásztáz), a nagyítás CSAK pinch-re (`ctrlKey`-es
          görgetés) történik. (3) **Kevésbé érzékeny zoom:** a pinch a delta
          nagyságával arányos, sima (`Math.exp(-deltaY * ZOOM_ERZEKENYSEG)`,
          `ZOOM_ERZEKENYSEG = 0.0025`, hangolható). A ＋/－ gombok maradtak.
        - **13/b-6. Mellék-ikonok a közeli nézetben (2026-07-20, Csaba kérése).**
          A legközelebbi (3.) LOD-szinten a fő ikon MELLETT kis körökben extra
          típus-infó jelenik meg (a fő ikonnál kisebben, ugyanaz a dizájn):
          Tartalomnál a KATEGÓRIÁI balra (kategória-szín), a TARTALOMTÍPUSA jobbra
          (tartalomtípus-szín) — a körben az adott kategória/típus saját `ikon`-ja
          (emoji vagy feltöltött kép, utóbbi körre vágva `<image>`-dzsel), csak ha
          van hozzárendelve. Javaslat/Egyezménynél a `javaslatTipus` szerinti
          művelet-emoji jobbra (Törlés 🗑️ · Módosítás ✏️ · Egyesítés 🔗 ·
          Áthelyezés ➡️ · Csomag 📦), a csomópont saját színével. Kategóriának és
          Tartalomtípusnak nincs mellék-ikonja. **Backend:** a `terkepService`
          új `mellekIkonokFeltoltese` segéde típusonként EGY-EGY csoportos
          lekérdezéssel (N+1 nélkül) tölti a `/api/terkep` sorait a
          `kategoriaIkonok`, `tipusIkon`, `javaslatTipus` mezőkkel; a
          `faElrendezes` átvezeti a csomópontba, a `TerkepModal` rajzolja.
        - **13/b-7. Sima zoom/pan — a drága SVG csak a mozgás végén épül újra
          (2026-07-20, Csaba: „akadozik zoom közben").** Ok: eddig MINDEN zoom/pan
          képkockán újraépült a teljes SVG-fedőréteg (`innerHTML`), ami az emoji-
          raszterizálás miatt kis adatnál is akadt. Megoldás (`TerkepModal.js`):
          mozgás közben csak az OLCSÓ canvas-réteg rajzolódik újra képkockánként,
          az SVG-réteg pedig egyetlen közös `<g id="terkep-svg-tartalom">`-en át
          egy TRANSZFORMMAL követi a nézetet (pontos pozíció/méret, GPU-gyors); a
          teljes SVG-újraépítés csak a mozgás megállása után fut (settle-debounce,
          150 ms), ekkor frissül a LOD-szint, a láthatóság és a feliratok.
          (`_interakcioRajzolas` / `_gyorsRajzolas` / `_svgKovetes`, plusz a
          canvas kiszervezve `_canvasRajzolas`-ba.)
        - **13/b-8. Dinamikus cím-betűméret a csomópontokon (2026-07-20, Csaba
          kérése).** A Térkép címei ugyanazt a lépcsős, hossz-alapú betűméretet
          kapják, mint a kártya fejléce (rövid cím nagyobb, hosszú kisebb). A
          közös skálát új segéd adja: `frontend/js/utils/cimBetumeret.js` →
          `dinamikusCimBetumeret(hossz, maxMeret)`; a kártya (Kartya.
          `_cimBetumeretBecsles`) és a `TerkepModal` is ezt hívja. A térkép a
          csomóponthoz igazított maximummal (`CIM_MAX_BETUMERET = 13`) számol, és
          a levágási hosszt a betűmérettel fordítottan arányosítja (kisebb betű →
          több karakter). A méret inline `style`-lal kerül a SVG-címre (felülírja
          a CSS tartalék 11px-et).

14. [ ] **Síkidom nézet (fő menü) — ⏸️ FELFÜGGESZTVE (2026-07-20).** Az 1. lépés
    (statikus ablak) elkészült és böngésző nélkül tesztelt, DE a megjelenés még
    NEM jó (Csaba böngészős próbája) → jegelve, később visszatérünk. A kód és a
    terv MEGMARAD (a Térképhez tértünk vissza). A dinamikus felfedés + drill-down
    (2. lépés) is hátra. Az alábbi terv és az 1. lépés leírása érvényben marad.
    A koino_1.0 (`C:/koino_1.0`) síkidomos megjelenítésének újraépítése tiszta
    architektúrában. A koino_1.0 kód KÁOSZ (window.KioData/KioSystem globálisok,
    `_mod_mod_mod_mod` fájlnevek, duplikált algoritmus, D3+SVG, rétegek nélkül) —
    NEM egy az egyben átvenni, hanem a MŰKÖDÉST megérteni és a projekt
    konvencióival (magyar camelCase, rétegek, egy komponens = egy fájl + CSS)
    újraépíteni. A Térkép (13/b) ezzel válik feleslegessé vagy konzisztenssé.

    **A koino_1.0 mechanizmusa (megértve):** fraktál kör-pakolás. Minden entitás
    egy síkidom, területe a hierarchikus össztudatponttal arányos; a leszármazottak
    a szülőn BELÜL (containment), minden szinttel a terület 1/20-ára (sugár
    1/√20 ≈ 4,47) csökken → egy körbe ~20 gyerek. Végtelen zoom; egyszerre ~3-4
    szint; „képernyőt kitöltő" tartalomnál átlép rá — EZ okozza a kifogásolt
    PISLANTÁST (teljes DOM teardown+rebuild).

    **Közös tervezési döntések (Csaba, 2026-07-20):**
    - **Formák ENTITÁSTÍPUS szerint** (nem tartalomtípus szerint, mint 1.0):
      Tartalom = kör, Kategória = háromszög (3), Tartalomtípus = négyzet (4),
      Javaslat = ötszög (5), Egyezmény = hatszög (6). Oldalszám-progresszió.
    - **Skálázhatóság a lényeg** (milliárd+ ember, több entitás) → NEM lehet a
      teljes fát letölteni. Bounded, lazy betöltés mélységben ÉS szélességben.
    - **Láthatóság = minimum-átmérő KÜSZÖB, NEM fix darabszám.** Effektív méret =
      `hierarchikusOsszesPont / 20^(gyökér alatti szint)`; lefelé MONOTON csökken
      (gyerek pontja ≤ szülőé + extra ×20) → ha egy csomópont túl kicsi, a
      leszármazottai is → részfa levágható. A látható darabszám a képernyő-
      kapacitásból KÖVETKEZIK. Első nézet: az összes gyökeret a megfelelő
      TÁVOLSÁGBÓL; csak a legnagyobb össz-pontúak lépik át a küszöböt.
    - **A globális nézet az ÖSSZES gyökeret mutatja** (egymás mellé pakolva, a
      legnagyobb középen) — így teljesül a „az összes gyökér tartalmat kéne
      megjelenítenie" igény; a pakli indul a legerősebb gyökértől, a síkidom a
      szélesebb rálátást adja. (2026-07-20; a korábbi „csak a legerősebb gyökér"
      megfogalmazás javítva, mert az egy levél-gyökérnél üres nézetet adott.)
    - **Viewing distance aggregált össz-pontból** számolható (nem kell milliárd
      rekordot felsorolni): gyökerek együttes területe = Σ(össz-pont) × faktor.
    - **A NEHÉZ PROBLÉMA MEGOLDVA — spirál sorrend:** a testvérek/gyökerek
      SPIRÁLISAN rakódnak, a soron-következés (nem csak a középtávolság) számít.
      koino_1.0: LEGKISEBB középre → a látható nagyok a spirál VÉGÉN → pozíciójuk
      az összes láthatatlan kicsitől függ → instabil (zoomkor ugrálna).
      **MEGOLDÁS: MEGFORDÍTVA — LEGNAGYOBB KÖZÉPRE**, kisebbek kifelé. A látható
      nagyok a spirál ELEJÉN, pozíciójuk csak a nála NAGYOBBAKTÓL függ (azok is
      láthatók); a láthatatlan kicsik a spirál vége, zoomra kifelé HOZZÁFŰZŐDNEK,
      a magot nem mozdítják. Konkrét: **napraforgó/filotaxis spirál** (n. elem
      szöge = n × 137,5°, sugara a korábbiak összterületéből), pont szerint
      csökkenő sorrend. Az n. pozíció csak n-től függ → append-stabil; NEM kell
      helyet fenntartani a soron következőknek (kifelé szabadon tágul).
    - **Pislantás megoldása:** NEM a mechanizmus eldobása (a drill-down kell a
      skálához), hanem 3 dolog SZÉTVÁLASZTÁSA: (1) lazy adatbetöltés (prefetch),
      (2) ritka, ZÖKKENŐMENTES koordináta-újrahorgonyzás (ugyanabban a
      képkockában a transzformációt is illesztve), (3) INKREMENTÁLIS rajzolás
      (közös csomópontok újrahasználva, csak delta — nincs teardown).
    - **Pakli vs síkidom komplementaritás:** pakli = teljes mélység, keskeny;
      síkidom = korlátos mélység, SZÉLES. Körre kattintva a pakli odanavigál.

    **Backend-végpont alak (megbeszélt):**
    `GET /api/sikidom?gyoker=<id|null>&kuszob=<min effektív méret>` → a küszöb
    feletti csomópontok (entitasId, entitasTipus, szuloId, hierarchikusOsszesPont,
    gyökérAlattiSzint, cim, vanTovabbGyerek) MONOTON metszéssel (legjobb-először
    bejárás), + az aggregált „mennyi van még alatta" össz-pont. A
    `hierarchikusTudatpontAllokacio`-ra épül (mint a Térkép; a Térkép
    `findGyerekIdkBySzulok`-jához hasonló ág-bejáró segéddel).

    **Kis lépések (Csaba egyetért):**
    - **1. lépés — ✅ KÉSZ (2026-07-20; böngészős teszt: teszt.md 51):** backend
      `/api/sikidom` (best-first, effektív méret szerint, `maxCsomopont`
      biztonsági plafonnal + opcionális `kuszob`; `vanTovabbGyerek` jelző;
      `sikidomService` + controller + route + `findByEntitasId` repo-metódus) +
      STATIKUS frontend ablak. Új `SikidomModal` (SVG-világ + képernyő-cimkék,
      pan/zoom, kattintás → pakli); `sikidomElrendezes.js` DOM-független motor
      (napraforgó-spirál: r_i = √(korábbiak összterülete/π), legnagyobb középre,
      APPEND-STABIL — a kisebb, hátrébb betöltött gyerek a meglévőket nem mozdítja;
      containment a √20-matekból); `sikidomFormak.js` (entitástípus → forma-leíró
      + szabályos sokszög pontjai). Node-teszt: elrendezés 16 eset zöld, formák
      OK; curl: /api/sikidom best-first + plafon-jelző + 401. Fő menü 🔷.
      **Megjegyzés:** az 1. lépésben a méret-skála miatt a világ-sugár a
      √(effektivMeret)-tel arányos; a kezdő nézet a befoglaló dobozra illeszt
      (nem a „megfelelő távolság" aggregált-terület logikára — az a 2. lépésé).
    - **2. lépés:** dinamikus felfedés (zoomra a küszöb csökken, új csomópontok
      jönnek elő) + ZÖKKENŐMENTES drill-down (a nehéz rész, külön).

    **Nyitott (nem blokkoló, képernyőn hangoljuk):** az első nézet pontos
    „hátrahúzása" (az egész gyökér-mező vs. csak a látható nagyok kerete).

### Backend adósságok (a levélben említett „optimalizáció és hiánypótlás")

- [~] A backend hiányosságainak felmérése és listázása (külön feladat) — RÉSZBEN
  elvégezve (2026-07-20, lásd lentebb az értesítés-tételeket + a lenti governance-javítást).
  A felmérés tanulsága: kevés valódi adósság; a „backend-kész, frontend-hiányos" darabok
  többsége SZÁNDÉKOSAN felfüggesztett funkció (nem hiba). Nyitva maradt megfigyelések:
  `szamitHierarchiaSzinteket` (implementálatlan, hívatlan no-op — törölhető);
  `uploads/fajlok/` régi teszt-feltöltések (forrásfájl-másolatok — rendrakás).

- [x] 🔴→✅ **Governance-lyuk: védtelen `POST /api/tudatpont/visszaosztas` végpont
  ELTÁVOLÍTVA (2026-07-20, a tulajdonos döntése).** A végpontot csak `authMiddleware`
  védte (admin-védelem nélkül, csak `// TODO`), így BÁRMELY bejelentkezett e-ember
  meghívhatta tetszőleges `{entitasId, entitasTipus}`-szal, és ezzel bármely entitást
  töröltethetett a javaslat→szavazás→egyezmény folyamat MEGKERÜLÉSÉVEL (a visszaosztás
  0-ra állítja a pontokat → az entitás auto-törlődik). A frontend nem használta.
  Eltávolítva: a route (`tudatpontRoutes.js`) és a controller-metódus
  (`tudatpontController.js`) — helyükön magyarázó komment. A visszaosztás LOGIKÁJA
  változatlanul él a `TudatpontService.tudatpontokVisszaosztasa` service-metódusban,
  amit a törlés-/egyesítés-végrehajtók KÖZVETLENÜL hívnak (a szavazás után) — a
  végpont törlése ezt NEM érinti. Curl-igazolt: a végpont most 404. Alapelv:
  egyezmény nélkül entitás nem törlődhet.

- [x] **Üres-pakli barátságos állapot — KÉSZ (2026-07-18).** Friss/üres DB-n a főoldal
  már nem hibázik el: a `Pakli.pakliLekerese` null-védelmet kapott, üres adatbázisnál
  🌱 útmutató jelenik meg; érvénytelen MENTETT entitásnál a pakli gyökérről próbál
  újra (teszt.md 44).
- [x] **szavazasiHatarido cron-értesítés — KÉSZ (2026-07-18).** A dormant típus éles:
  a cron percenként ellenőrzi az aktív javaslatokat, és ha a hátralévő idő legfeljebb
  a döntési idő 25%-a (max. 24 óra), a figyelők „Szavazási határidő közeleg"
  értesítést kapnak — javaslatonként EGYSZER (`hataridoErtesitesElkuldve` jelző).
  A típus bekerült az Értesítési beállítások listájába. Vállalt korlát: 1-2 perces
  döntési időnél lemaradhat (percenkénti cron). (teszt.md 45)
- [x] **Árva értesítések takarítása — KÉSZ (2026-07-18).** Entitás-törléskor
  (`tudatpontokVisszaosztasa` → 0 pont → auto-törlés) a közvetlenül rá vonatkozó
  értesítések is törlődnek (`torolEntitasOsszes`, best-effort). (teszt.md 46)

- [x] 🟠 **Indoklás nélküli javaslat elfogadáskor végrehajtási hibára futott — JAVÍTVA (2026-07-14).**
  Az `egyezmeny.indoklas` KÖTELEZŐ, de a javaslat `indoklas`-a 2026-07-10 óta opcionális volt, így
  egy indoklás nélküli (API-ból null) javaslat elfogadáskor egyezmény-létrehozási hibát dobott.
  **Megoldás (Csaba döntése): a javaslat `indoklas`-a ismét KÖTELEZŐ, de MINIMUM karakterszám nélkül.**
  `javaslat` modell `indoklas.required: true`; `javaslatService` új `indoklasUres()` helper +
  üres-indoklás dobás; frontend `JavaslatModal._indoklasUres` + `_validalas` ellenőrzés; a
  `javaslatModal.html` felirat „(opcionális)" → „*". Curl-igazolt: üres/hiányzó/csak-üres-blokk →
  „Az indoklás megadása kötelező"; kitöltött → siker. (A 2026-07-10-i „opcionális" jegyzet ezzel
  visszafordítva.)

#### Értesítés-rendszer átvizsgálása (2026-07-13)

A 6. terv-pont (Értesítések frontend) előtt átnéztük a teljes backend értesítés-vertikumot
(`ertesites*` + `ertesitesiBeallitas*`: modell / repository / service / controller / route).
A **fogyasztói oldal** (tárolás, lekérés lapozva, olvasottság, beállítás-CRUD) tiszta, biztonságos
(minden végpont `authMiddleware`-es, minden lekérés `req.user.id`-re szűkít) és kész — a
frontend-nézet ráépíthető. A talált hiányosságok fontossági sorrendben:

- [x] 🔴→✅ **A termelői oldal BE VAN kötve — a 2026-07-13-i megállapítás elavult.**
  Az `ertesitesService.ertesitesKuldes` időközben minden eseményforrásból meghívásra
  került. Mind a 8 típus él (2026-07-20-i ellenőrzés): `ujJavaslat`
  (`javaslatService`), `javaslatElfogadas`/`javaslatElvetve` (`javaslatIdozitesService._lezarasErtesites`),
  `szavazasiHatarido` (`javaslatIdozitesService`, cron), `tudatpontValtozas`
  (`tudatpontService`), `ujGyerekEntitas` (`tartalomService`), `kuszobValtozas`
  (`ertekSzamitasService`, V2). A **`szavazatErkezett`** külön eset (lásd lentebb).
- [~] ⏸️ **`szavazatErkezett` — FÜGGŐBEN (2026-07-20, a tulajdonos döntése).** A backend
  TERMELŐ be van kötve (`szavazatService.szavazatLeadasa`, nem-töredék + töredék ág,
  best-effort, a szavazót magát kihagyva, minden szavazásnál), DE a frontend a
  `szavazatErkezett`-et SZÁNDÉKOSAN kihagyja mindkét helyről: a feliratkozási
  beállításokból (`ErtesitesiBeallitasModal.js` `ERTESITES_TIPUSOK`) és a
  megjelenítésből (`ErtesitesekModal.js` `TIPUS_SZOVEG`) is — a korábbi tulajdonosi
  döntés szerint (zaj: minden szavazás/módosítás értesítene). Emiatt a bekötött termelő
  jelenleg HATÁSTALAN (nincs feliratkozó → 0 értesítés keletkezik), ami ártalmatlan.
  ELDÖNTENDŐ (Csaba): vagy teljesen bekapcsoljuk (a 2 frontend-listába is felvesszük →
  valódi opt-in értesítés), vagy visszavonjuk a backend-bekötést és marad dormant.
- [x] 🟠→✅ **Fájlnév kis/nagybetű-eltérés — MÁR NINCS (2026-07-20-i ellenőrzés).**
  A `ertesitesiBeallitasRepository.js:4` és az `ertesitesRepository.js:7` egyaránt
  KISBETŰS modell-nevet importál (`../models/ertesitesiBeallitas`, `../models/ertesites`),
  ami pontosan egyezik a tényleges fájlnevekkel — valódi Linux/case-sensitive köteten
  sem száll el. (A `models/ertesites.js` fejléc-kommentje ugyan `Ertesites.js`-t ír, de az
  csak komment; a require-ök jók.)
- [x] 🟡→✅ **Feliratkozás/beállítás felület KÉSZ (2026-07-20-i ellenőrzés).**
  A közös `ErtesitesiBeallitasModal` be van kötve a fő menübe („Értesítési beállítások" =
  GLOBÁLIS alapbeállítás, a cascade legvégső visszaesése) ÉS MINDEN kártya-hamburgerbe
  (entitásonkénti beállítás) — Tartalom/Kategória/Tartalomtípus/Javaslat/Egyezmény. Az opt-in
  így teljes: az e-ember globálisan vagy entitásonként feliratkozhat a típusokra. A beállítás-API
  (`PUT/GET/DELETE /api/ertesitesi-beallitasok/...`) mögötte működik.
- [~] 🟡 **Takarító metódusok — RÉSZBEN kész (2026-07-20-i ellenőrzés).** Az ENTITÁS-törlési
  takarítás (`torolEntitasOsszes`) 2026-07-18 óta be van kötve (lásd fentebb, „Árva értesítések
  takarítása — KÉSZ"). Az E-EMBER-törlési takarítók (`ertesitesRepository.torolE_EmberOsszes`,
  `ertesitesiBeallitasRepository.torolE_EmberOsszes`) még nincsenek hívva — DE nincs is
  e-ember-törlés funkció a projektben (nincs rá controller/service/route), ezért ez egy
  jövőbeli feature-re váró horog, nem aktív hiba. Amikor az e-ember-törlés megépül, ezeket be
  kell kötni.
- [x] 🟡→✅ **„Halott kód" tévedés — `keresByEntitas` MÉGIS használatban van (2026-07-20-i
  ellenőrzés).** Az `ertesitesiBeallitasService.beallitasKeresesCascade` (145. sor) hívja a
  szülőláncon felfelé bejáráskor. Élő kód, nem törlendő.
- [x] 🟢→✅ **Egyedi értesítés-törlés a postafiókból — KÉSZ (2026-07-20).** ÚJ
  `DELETE /api/ertesitesek/:id` (controller `torolErtesites` + service `ertesitesTorlese`
  a SAJÁT-értesítés jogosultság-ellenőrzéssel, az olvasottnak-jelölés mintájára; a repo
  `torol`-ját használja). Frontend: az `ErtesitesekModal` minden során 🗑️ törlés-gomb
  (a sor wrapperbe került, hogy ne legyen gomb-a-gombban; egykattintásos, megerősítő
  dialógus nélkül — alacsony tétű saját adat); törléskor a sor kikerül a DOM-ból, üres
  listánál üres-állapot, és a badge frissül (`onValtozas`). Curl-igazolt: saját → 200 +
  DB-ből törlődik; idegen → 403; nem létező → 404. (teszt.md 53)
- [x] 🟢→✅ **Hiba-válasz boríték: `uzenet` mező — JAVÍTVA (2026-07-20).** Az `apiHelper`
  hiba-ága mostantól `message || error || uzenet`-et néz (mindhárom mezőnevet, amit a
  vegyes backend-controllerek használnak), így a szerver valódi hibaszövege (pl. az
  értesítés-controllerek `uzenet`-je) eljut a felhasználóhoz. 3 helyen (JSON + FormData
  POST/PATCH). Az egész projektre hat. (A `{ siker, adatok }` vs. lapos SIKER-boríték
  eltérés NEM hiba — a frontend helyesen `valasz.adatok`-ként olvassa, ahol az van.)

- [x] `docker-compose.dev.yml`: `NODEeNV` elírás javítása `NODE_ENV`-re
- [x] **Csomag egyezmény-tárhely kötelező + cím-alapú entitás-kereső** (2026. 07. 12.):
  - **Csomag tárhely:** a Csomag javaslatnál az egyezmény tárhelye mostantól **kötelező**, és a
    létrehozó dönti el (nincs automatikus levezetés). A `javaslatService` a választott tárhelyet
    **minden** csomag-töredék `egyezmenyTarhelyId`-jébe írja, így az elfogadáskor keletkező
    egyetlen csoport-egyezmény oda kerül. A `javaslat` modellben az `egyezmenyTarhelyId` mostantól
    **elfogadja a null-t** (`required: false`); a kötelezőséget csak csomagnál a service adja.
  - **Cím-alapú kereső:** új `GET /api/kereses` végpont (`keresesRoutes/Controller/Service` +
    `searchByCim`/`searchByNev` repository-metódusok a három cím-viselő típusra). Frontend: közös
    `entitasKeresoHelper.js` (keresés + nyers ID ellenőrzés) és `EntitasKeresoMezo` komponens
    (a régi `IdEllenorzoMezo` helyett, azonos API + kereső dropdown + ID-fallback). Bevezetve a
    `JavaslatModal` **összes** ID-mezőjébe és a szövegszerkesztő `EntitasHivatkozasPanel`-jébe.
    A régi `IdEllenorzoMezo(.js/.css)` törölve.
- [x] **Javaslat szülő + egyezmény hely általánosítása** (2026. 07. 09.): a javaslat MINDIG az érintett entitás gyereke — a szülő polimorf lett (Tartalom/Kategoria/TartalomTipus), a felső szintű `szuloId`-kötelezőség eltávolítva (controller + service + modell). Ezzel megszűnt a „szülő tartalom megadása kötelező" hiba, és **kategórián/tartalomtípuson is lehet javaslatot tenni** (eddig a „csak Tartalom" korlát miatt hibára futott). Az **egyezmény helye** (`egyezmenyTarhelyId`) típusonként auto-levezetve: Törlés → az érintett entitás (a végrehajtó fallback az eredeti szülőre viszi), Módosítás/Áthelyezés → az érintett entitás, Egyesítés → placeholder → az új entitás. Új polimorf mezők: `javaslat.egyezmenyTarhelyTipus`, valamint `javaslat.szuloTipus` / `egyezmeny.szuloId`+`szuloTipus` polimorfra bővítve. A Csomag felső szintű csomagolása külön, későbbi feladat.

---

## A vízió-vita hozadéka — új 1. fázisú feladatok (2026-07-17)

*A 2026-07-15–17-i vízió-vita ([vizio_kritikak.md](vizio_kritikak.md)) döntéseiből az
1. fázisra (központi szerveres koino) háruló feladatok. Részletes indoklás:
[fejlesztesi_terv_fazis2.md](fejlesztesi_terv_fazis2.md) (D-döntések, H-híd-feladatok,
N-nyitott kérdések). A sorrendről a tulajdonos dönt; a meglévő terv-sorrend
(7. Tudatpontok nézet, 8. eember beállítások, 9. alkategória) mellé illesztendők.*

**Elfogadott kidolgozási sorrend (2026-07-17, a tulajdonos döntése):** a vita
lezárultával a kódírás-felfüggesztés VÉGET ÉRT, a fejlesztés az 1. fázisban
folytatódik. Első lépés a **V1 részletes terve** (megvitatás, majd implementáció) —
ez a bemutató dokumentum hitelességének feltétele is („a regisztráció meghívásos
alapon működik", miközben a kód ma nyíltan regisztrál). Utána **V2**, majd **V5**;
a többi V-feladat és a régi terv-sorrend (7–9. pont) ezek után.
**MÓDOSÍTÁS (2026-07-18, a tulajdonos döntése):** a V1 és V2 elkészült; a **V5
(elismerés) HÁTRASOROLVA** a V-lista végére — a folytatás a többi feladatból megy.

- [x] **V1. Meghívásos regisztráció + tanúsítás (bizalmi háló v1)** — ✅ KÉSZ
  (2026-07-18; böngészős teszt hátra: teszt.md 38–40). A megvalósítás (a tulajdonos
  döntései szerint):
  - **`MEGHIVAS_KOTELEZO` kapcsoló** (backend/.env): `false` = nyílt regisztráció
    (fejlesztés/tesztelés alatt), `true` = meghívó kód kötelező. Így a bemutató
    ígérete bekapcsolható anélkül, hogy a fejlesztés közbeni tesztelést nehezítené.
  - **Meghívó entitás** (`meghivo` modell): kibocsátó, egyedi kód (XXXX-XXXX-XXXX),
    státusz (Aktiv/Felhasznalt/Visszavont); a kódot a kibocsátó maga juttatja el a
    meghívottnak (a rendszer NEM tárol adatot a még nem regisztrált személyről — D6).
  - **Tanúsítás v1 = maga a meghívás** (1 tanúsító): a létrehozáskor kötelező
    nyilatkozat („a meghívott valódi, még nem regisztrált személy"); a több-tanúsítós
    rendszer Fázis 2.
  - **NINCS darabszám-korlát és NINCS lejárat** (Csaba, 2026-07-18: „ha nem muszáj,
    ne rakjunk be korlátot") — az 1. fázisban a kis közösség + a visszakövethető
    kibocsátó-lánc elég védelem; a korlát-számok később közösségi döntés tárgyai (N4).
    A visszavonhatóság (felhasználásig) VAN — az nem korlát, hanem a kibocsátó eszköze.
  - **Bizalmi gráf első éle**: `eember.meghivoEemberId` = a felhasznált meghívó
    kibocsátója (a Fázis 2 gráf-szabályai erre épülnek).
  - Frontend: fő menü **✉️ Meghívóim** modal + a regisztrációs űrlapon feltételes
    meghívó kód mező (csak bekapcsolt kapcsolónál látszik).
  - ELHALASZTVA a v1-ből: felhatalmazott kibocsátók (D1 szerint is Fázis 2); szülői
    hozzájárulás-lépés (korhatár-döntés: nincs regisztrációs korhatár; a GDPR-kérdés
    nyitott pontként az N4 mellé).
- [x] **V2. Küszöbváltozás-értesítés** (H1, a vita 2. pontjának kötelező eleme) —
  ✅ KÉSZ (2026-07-18; böngészős teszt hátra: teszt.md 41). Új `kuszobValtozas`
  értesítés-típus + trigger az érték javaslat mentésekor (a mentés előtti és utáni
  medián-értékek összevetése; az `adatok.valtozasok` őrzi a régi → új párokat).
  A típus a NORMÁL beállítás-cascade szerint működik (opt-in, mint a többi típus)
  — a tulajdonos döntése (2026-07-18): „nem kell neki különleges bánásmód, legyen
  csak beállítható"; az Értesítési beállítások listájában „Küszöbváltozás" néven
  szerepel. „Jelentős változás" v1-ben = bármilyen elmozdulás (az értékek
  egészek); később finomítható külön küszöbbel.
- [x] **V3. Szavazat-láthatóság szűkítése** (H2, D2 első lépése) — ✅ KÉSZ
  (2026-07-18). Audit-eredmény: a `GET /api/javaslat/:id/szavazatok` publikus végpont
  nyersen kiadta az egyéni szavazatokat (a frontend nem használta) → a végpont + a
  mögötte lévő service-metódusok TÖRÖLVE. Az összesített statisztika
  (`/:id/statisztika`) és a saját szavazat (`/:id/sajat-szavazat`) marad. Az
  üzemeltetői láthatóság őszinte kimondása: ÚJ [adatkezeles.md](adatkezeles.md).
- [x] **V4. E-mail privát** (H3) — ✅ KÉSZ (2026-07-18). Audit-eredmény: a
  `letrehozo` és szavazat populate-ok 20+ helyen az e-mailt is kiadták
  (javaslat/egyezmény/tartalom/szavazat válaszokban) → mind `eemberNev`-re szűkítve;
  curl-lel igazolva, hogy a javaslat/egyezmény/pakli válaszokban nincs e-mail.
  E-mailt csak a SAJÁT regisztráció/bejelentkezés válasza tartalmaz.
- [ ] **V6. Identitás-réteg modulba** (H4) — a regisztráció leválasztása külön modulba,
  hogy a későbbi EUDI-kapu (második regisztrációs út, ~2027) a többi kód érintése
  nélkül becsatlakozhasson.
- [ ] **V7. P2P-előkészítés az adatmodellben** (H5+H6) — entitás-export/import-képes
  formátum, stabil azonosítók; annak jelölése, mi tartozik a tartalmi rétegbe és mi a
  tartós magba (D3).
- [ ] **V8. Kormányzási ígéret dokumentum** (H7) — Csaba: „még nem kell, de felírva";
  mit dönt egyedül / mihez kell közösségi támogatás / mi történik ellenjavaslat esetén.
- [ ] **V5. Elismerés-entitástípus** (N9) — ⏬ HÁTRASOROLVA (2026-07-18, a tulajdonos
  döntése). E-emberek által megfogalmazott, egymásra az érintett BELEEGYEZÉSÉVEL
  aggatható elismerés; tájékoztat, nem jogosít (a szavazat egyenlő marad); később a
  kinevezési rendszer bemenete.

## Stílus-irányelvek

**Teljes szélességű kártya-elrendezés (2026-07-19, Csaba döntése):** a kártyák
(és a pakli) MINDEN képernyőn a képernyő szélességét követik — a korábbi fix,
legfeljebb 400px-es kártya-oszlop megszűnt (`--kartya-szelesseg` törölve,
`.pakli-kartya { width: 100% }`, a pakli-wrapper 768px-es max-width korlátja és
a body-szöveg 72ch sor-korlátja eltávolítva). A KIVÁLASZTOTT kártya fix
magassága viszont a régi kártya-arányból számolódik (`--kartya-magassag-alap:
min(90vw, 400px)` × 1.574), hogy széles képernyőn ne nőjön aránytalanul.
A menük (fő hamburger, alsó sáv, kártya-hamburgerek) és a modálok változatlanok.
(Böngészős teszt: teszt.md 49.)

Az új modalok és menük stílusa a **standard vonalat** kövesse:
- **Irányadó:** a tartalom (entitás) létrehozása modal (`TartalomModal`), a fő hamburger menü, és a kártyák hamburger menüi.
- **Kivétel (szándékosan eltér):** a javaslat-típus választó menü és a `JavaslatModal` — ezt NE vegyük mintának új felületekhez.

---

## Nyitott kérdések

1. A menühálózat később bővül — a bővítéseket ebbe a dokumentumba vezetjük át.
2. A „Részletes adatok" és a „Tudatpont módosítás" pontos tartalmát/felületét az adott feladat megkezdésekor tervezzük meg.
