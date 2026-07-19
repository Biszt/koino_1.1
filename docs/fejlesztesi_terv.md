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
| Térkép | ✅ | A teljes entitás-fa teljes képernyős, interaktív nézete (13/b terv-pont; böngészős teszt: teszt.md 50) |
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
    2026-07-19, Csaba döntései; 13/a KÉSZ és böngészőben igazolva, 13/b KÉSZ —
    böngészős teszt hátra: teszt.md 50). Név-döntés (2026-07-19): a „minimap"
    név elvetve, a funkció neve **Térkép**, és TELJES KÉPERNYŐS.
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
    - **13/b. Térkép (HIBRID Canvas + SVG fa-nézet) — ✅ KÉSZ (2026-07-19;
      böngészős teszt hátra: teszt.md 50).** Teljes képernyős, interaktív nézet
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

### Backend adósságok (a levélben említett „optimalizáció és hiánypótlás")

- [ ] A backend hiányosságainak felmérése és listázása (külön feladat)

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

- [ ] 🔴 **Az értesítések SOHA nem keletkeznek — a termelői oldal nincs bekötve.**
  A `ertesitesService.ertesitesKuldes` kész és exportált, de sehonnan nincs meghívva (sem
  javaslat-létrehozás, sem szavazás, sem tudatpont-változás, sem a javaslat-cron lezárás nem
  hívja). A postafiók emiatt üres marad, amíg az eseményforrásokat be nem kötjük
  (pl. `javaslatService` → `ertesitesKuldes(...)`, a 7 típushoz: `ujJavaslat`,
  `javaslatElfogadas`, `javaslatElvetve`, `szavazatErkezett`, `szavazasiHatarido`,
  `tudatpontValtozas`, `ujGyerekEntitas`). Ez a legnagyobb hiányzó darab.
- [ ] 🟠 **Fájlnév kis/nagybetű-eltérés (Docker/Linux-veszély).**
  `ertesitesiBeallitasRepository.js` így importál: `require('../models/ErtesitesiBeallitas')`,
  de a tényleges fájl `ertesitesiBeallitas.js` (kis `e`). Windows / Docker Desktop bind-mount
  alatt működik (case-insensitive FS), de valódi Linux-hoston vagy case-sensitive köteten
  indításkor elszáll („module not found"). Egysoros javítás. (Ugyanígy ellenőrizni: a
  `models/ertesites.js` fejléc-kommentje `Ertesites.js`-t ír, de a require-ök kisbetűsek — a
  require-ök a mérvadók, azok jók.)
- [ ] 🟡 **Feliratkozás/beállítás felület hiányzik (opt-in következménye).**
  Alapból senki nincs semmire feliratkozva (`ertesitesTipusok: []`), és nincs alapértelmezett
  feliratkozás; a `beallitasKeresesCascade` csak FELFELÉ keres beállítást a fában. Így éles
  értesítésekhez kell egy feliratkozás-UI is (entitásonként vagy globálisan) — a beállítás-API
  (`PUT/GET/DELETE /api/ertesitesi-beallitasok/...`) készen áll hozzá.
- [ ] 🟡 **Takarító metódusok nincsenek bekötve (árva adatok).**
  `ertesitesRepository.torolEntitasOsszes` / `torolE_EmberOsszes` és
  `ertesitesiBeallitasRepository.torolE_EmberOsszes` léteznek, de senki nem hívja őket. Entitás
  törlésekor (`torlesiVegrehajto`) és eember törlésekor a kapcsolódó értesítések/beállítások
  árván maradnak a DB-ben.
- [ ] 🟡 **Halott kód:** `ertesitesiBeallitasRepository.keresByEntitas` definiált és exportált,
  de sehol sem hívott — egy korábbi, meg nem valósult kiküldési terv maradványa (a mostani
  `ertesitesKuldes` nem ezt használja). Törölhető, vagy a jövőbeli kiküldés-optimalizációhoz
  meghagyható.
- [ ] 🟢 **Nincs egyedi értesítés-törlés a postafiókból.** A repo-ban van `torol`, de nincs hozzá
  controller/route — az eember csak olvasottnak jelölhet, törölni nem tud. Termék-döntés kérdése.
- [ ] 🟢 **Válaszboríték-eltérés (a frontendnek fontos).** Az értesítés-controllerek
  `{ siker, adatok }` borítékba csomagolnak, míg pl. `eember/sajat-adatok` laposan ad vissza; a
  frontendnek `valasz.adatok.ertesitesek`-ként kell olvasnia. Mellékesen: a hiba-válaszok `uzenet`
  mezőt küldenek, de az `apiHelper` `message`/`error`-t keres, így a szerver hibaszövege nem jut ki
  a frontendre (ez az egész projektre igaz, nem csak ide).

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
