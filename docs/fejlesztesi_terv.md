# koino_1.1 — Fejlesztési terv

*Utolsó frissítés: 2026. 07. 20.*

## A terv gerince: a menühálózat

A fejlesztési terv alapja a teljes menürendszer. Minden menüpont már most felkerül a felületre:
- ✅ **KÉSZ** — a menüpont mögött működő funkció van
- 🚧 **FEJLESZTÉSRE VÁR** — a menüpont kattintásra egységes „Fejlesztésre vár" üzenetet mutat, amíg el nem készül
- ❌ **TÖRLENDŐ** — jelenleg létezik a kódban, de nem része a tervnek

A „fejlesztésre vár" állapotot egy közös komponens jeleníti meg minden menüben egységesen.

---

## A teljes menühálozat és állapota

### 1. Fő hamburger menü (alsó sáv — `foOldal.js`)

A menü CSOPORTOKBA rendezve, közöttük elválasztó vonallal (2026-07-22): (1) nézetek/navigáció ·
(2) értesítések · (3) létrehozás · (4) fiók · (5) kilépés.

| Csoport | Menüpont | Állapot | Megjegyzés |
|---|---|---|---|
| 1. Nézetek | Keresés | ✅ | KeresesModal (12. pont) |
| 1. Nézetek | Struktúra nézet | ✅ | A teljes entitás-fa teljes képernyős, interaktív nézete (13/b) |
| 1. Nézetek | **Világtérkép** | 🚧 | ÚJ (2026-07-22) — fejlesztésre vár; a régi koino világtérkép újraépítése. MINDEN menüben szerepel (fő + kártya) |
| 1. Nézetek | Síkidom nézet | ✅ | ÚJRAÉPÍTVE (2026-08-03): terület ∝ tudatpont, háromszögeléses pakolás üres maggal, képernyő-vezérelt betöltés, KORLÁTLAN nagyítás horgonyváltással (pislogás nélkül); koppintásra egyetlen bezárható kártya (14. terv-pont) |
| 1. Nézetek | Rendezés | ✅ | Pakli rendezés-választó (15. pont): hierarchikus/időrend/saját/ágazati pont; fő menü = globális |
| 2. Értesítések | Értesítések | ✅ | ErtesitesekModal + olvasatlan badge |
| 2. Értesítések | Értesítési beállítások | ✅ | Globális ErtesitesiBeallitasModal |
| 3. Létrehozás | Új tartalom létrehozása | ✅ | TartalomModal |
| 3. Létrehozás | Új kategória létrehozása | ✅ | KategoriaModal |
| 3. Létrehozás | Új tartalomtípus létrehozása | ✅ | TartalomTipusModal |
| 4. Fiók | Meghívóim | ✅ | Meghívó rendszer |
| 4. Fiók | Tudatpontok | ✅ | Saját aktív tudatpont-hozzárendelések (7. pont) |
| 4. Fiók | eember beállítások | ✅ | EemberBeallitasokModal (8. pont) |
| 5. Kilépés | Kijelentkezés | ✅ | |

### 2. Tartalom kártya menü (`TartalomKartya.js`)

| Menüpont | Állapot | Megjegyzés |
|---|---|---|
| Új tartalom létrehozása ebből | ✅ | Ágaztatás szülő-adatokkal |
| Javaslat létrehozása | ✅ | JavaslatModal |
| Tudatpont módosítás | ✅ | TudatpontModal — saját pont módosítása + felmenő-szabály |
| Részletes adatok | ✅ | Közös ReszletekModal |
| Küszöb érték javaslat | ✅ | ErtekJavaslatModal — támogatottsági/részvételi %, min/max döntési idő; a Tartalom létrehozó modál is bekéri az értékeket (alapértékekkel). Csak tartalomra! |

**Közös kártya-menü rész (minden kártyán, a `Kartya` alaposztály adja hozzá — 2026-07-22 óta csoportosítva):**
a kártya-specifikus műveletek után két csoport, elválasztó vonallal — (a) INFO: 🔔 Értesítések (ág-szűrt, badge) · 🌟 Tudatpontok (ág-szűrt); (b) NAVIGÁCIÓ: 🔍 Keresés · 🗺️ Struktúra nézet · 🚧 **Világtérkép** (fejlesztésre vár) · ↕️ Rendezés — mind ág-szűrt módban.

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
| Új kategória létrehozása ebből | ✅ | Az így létrehozott kategória ALKATEGÓRIA lesz (a kategória lesz a szülő). A `KategoriaModal` `szuloAdatok`-ot fogad; a backend (modell + `kategoriaService`) már kezelte a `szuloId`/`szuloTipus`-t — csak frontend-munka volt. Böngészős teszt hátra (teszt.md 55) |
| Javaslat létrehozása | ✅ | |
| Tudatpont módosítás | ✅ | TudatpontModal — saját pont módosítása + felmenő-szabály |
| Részletes adatok | ✅ | Közös ReszletekModal (név, típus, létrehozó, tudatpont, leírás) |
| Küszöb érték javaslat | ✅ | ErtekJavaslatModal + a létrehozó modál is bekéri az értékeket (az érték-rendszer entitás-polimorf: entitasId + entitasTipus) |

### 6. Egyezmény kártya menü (`EgyezmenyKartya.js`)

| Menüpont | Állapot | Megjegyzés |
|---|---|---|
| Új tartalom létrehozása ebből | ✅ | Ágaztatás szülő-adatokkal (TartalomModal, szuloTipus) |
| Javaslat létrehozása | ✅ | 🌿 `tudatpontFuggo`; JavaslatModal. Egyezményre a domain szerint KIZÁRÓLAG áthelyezési javaslat indítható (frontend gombszűrés + backend kikényszerítés) |
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
   - **FIÓK-TÖRLÉS (2026-07-23):** a modál „veszély"-szakaszában önkéntes, végleges
     fiók-törlés — jelszós megerősítéssel. Backend: DELETE `/api/eember`
     (`eemberService.eemberTorlese`). A tudatpontokat VISSZAOSZTJA (minden aktív
     hozzárendelést 0-ra állít → a „nincs 0-tudatpontos entitás" láncreakció törli a
     0-ra esett entitásokat; a mások által is támogatottak megmaradnak). Törli a
     szavazatait, érték-javaslatait, értesítéseit és beállításait; a megmaradó
     entitásokon a `letrehozo`-t null-ra („törölt e-ember") állítja (a séma most már
     enged null-t az 5 entitásnál). Az érték-javaslatok törlésekor a megmaradó
     entitások küszöb-HISZTOGRAMJÁBÓL is kivonja őket (új `ertekSzamitasService.
     hisztogramCsokkentese`), így a medián-küszöb frissül, nem marad benne a törölt
     e-ember szavazata. Az általa MEGHÍVOTTAK bizalmi-gráf éle
     (`meghivoEemberId`) SZÁNDÉKOSAN érintetlen (Fázis 2 alapja). Böngésző nélkül
     igazolva; böngészős teszt: teszt.md 47. Kapcsolódik az adatvédelmi nyilatkozat
     „törlését kérheted" ígéretéhez ([adatvedelmi_nyilatkozat.md](adatvedelmi_nyilatkozat.md)).
9. [x] **Új kategória létrehozása ebből → ALKATEGÓRIA** (Kategória kártya).
    KÉSZ (2026-07-22; böngészős teszt hátra: teszt.md 55). Menüpont: **🏷️ „Új alkategória
    létrehozása"** (a fő menü „Új kategória létrehozása" ikonjával, `tudatpontFuggo`),
    a `KategoriaModal`-t nyitja az aktuális kategóriát szülőként átadva; a modal címe
    ilyenkor „Új alkategória létrehozása".
    - **Frontend:** `KategoriaModal` új `szuloAdatok` beállítást fogad, létrehozáskor a
      `szuloId`+`szuloTipus`-t (párban) a FormData-hoz fűzi + a cím szülő esetén „alkategória";
      `KategoriaKartya._ujKategoriaLetrehozasa` + a menüpont átkötve (elárvult `FejlesztesreVar`
      import törölve).
    - 🔴→✅ **HIBA JAVÍTVA (2026-07-22): az alkategória a fában a GYÖKÉRBE került.** Ok:
      a `tudatpontService.getSzuloEntitas` a `Kategoria` típusra FIXEN `null`-t adott vissza
      („Kategóriának nincs szülője" — a hierarchia előtti feltevés), így a hierarchikus
      allokáció + osLanc sosem kapta meg a szülőt, hiába volt a `szuloId` a dokumentumon.
      Javítás: a Kategoria-ág most a valódi `szuloId`-t olvassa (`KategoriaRepository.findById`)
      — ez kaszkádol a hierarchia-pont felfelé propagálásába, a fa-szülőbe és az osLanc-ba.
    - ✅ **DOMAIN-SZABÁLY (2026-07-22, Csaba kérése): kategória szülője CSAK másik kategória
      lehet.** (1) `kategoria` modell `szuloTipus` enum SZŰKÍTVE `['Kategoria', null]`-ra;
      (2) `kategoriaService._szuloKategoriaEllenorzese` (típus = 'Kategoria' + a szülő
      LÉTEZIK) — bekötve létrehozáskor és módosításkor is.
    - ✅ **Leírás-szerkesztő (Csaba kérése): a `KategoriaModal` ÉS a `TartalomTipusModal`
      most a blokk-alapú `SzovegSzerkeszto`-t használja** (mint a `TartalomModal`).
      Korábban mindkettőben holt kód volt: a JS a `leiras-szerkeszto-kontener`-t kereste,
      de a HTML sima `<textarea>`-t tartalmazott + hiányzott az import → a LEÍRÁS nem
      mentődött. Javítás: import + a `<textarea>` cseréje a szerkesztő-konténerre mindkét
      modal HTML-jében.
    - 🔴→✅ **Kártya nem jelenítette meg a blokk-szerkezetet — JAVÍTVA (2026-07-22).**
      Ok: a Kategoria/TartalomTipus modálja MULTIPART FormData-t küld (ikon-fájl), ahol a
      `leiras` csak stringként mehet → `JSON.stringify`-olt stringként tárolódott, és a
      kártya megjelenítője „legacy sima szövegként" a NYERS JSON-t mutatta. (A Tartalom
      JSON-body-t küld → ott a `szoveg` tömbként tárolódik, ezért jó.) Javítás: új
      `backend/utils/leirasParser.js` (`leirasParse`) a FormData-ból jött JSON-stringet
      tömbbé alakítja — bekötve a `kategoriaService` és a `tartalomTipusService`
      létrehozás- ÉS módosítás-ágába. A már meglévő string-leírásokat egyszeri
      DB-javítással tömbbé alakítottuk (mongosh, csak érvényes JSON-t konvertálva).
    - ✅ **Kategória-választó a Tartalom modálban HIERARCHIKUS (Csaba kérése, a
      jegyzetek.md 2026-07-22 ötletéből).** A `TartalomModal` legördülője fa-sorrendben,
      mélység szerinti behúzással mutatja a kategóriákat (alkategória a szülője alatt,
      nem törő szóközök + „└ " jel). Új `_kategoriakFaSorrendbe()` (DFS, mélység a teljes
      fából, árva-söprés, kör-védelem); a `findAll` úgyis küldi a `szuloId`-t.
10. [x] **Jogosultság-függő menüpontok** — a kártya-menük megnyitáskor jelzik a jogosultságot: a tudatpontot igénylő menüpontok (Javaslat létrehozása, Szavazat leadása, valamint „Új tartalom/kategória létrehozása ebből") inaktívak (halvány + magyarázó tipp), ha az eembernek nincs tudatpontja az entitáson. Megvalósítás: a menüpont `tudatpontFuggo: true` jelölést kap; a `Kartya` alaposztály a menü megnyitásakor a `GET /api/tudatpont/entitas/:tipus/:id → eemberHozzajarulas` (eemberenkénti `tudatponthozzarendeles.tudatPontok`) alapján tiltja/engedi. A backend a védelmet külön kikényszeríti (javaslatService, szavazatService).
    - **Döntés (2026-07-10) — a backend szabálya a mérvadó:** a szavazati jogosultságot MINDIG az érintett entitás(ok)on lévő tudatpont dönti el (`erintettEntitasok`, ahogy a backend teszi); a javaslaton magán lévő tudatpont hiánya NEM akadály, attól még lehet szavazni. A frontendet ehhez igazítjuk. **Választott megoldás:** a **pakli e-ember-tudatossá tétele** — a `pakliService` megkapja a néző e-ember azonosítóját (a pakli útvonal már `authMiddleware`-es, a `req.user.id` rendelkezésre áll), és a javaslat-kártya adataihoz kiszámolja a `szavazhat` jelzést a backend saját szabályával (`javaslatJogosultsagService`). A frontend a „Szavazat leadása" pontot ez alapján engedi/tiltja (nem a javaslat saját tudatpontja alapján). Ez foundational: az e-ember-tudatos pakli más funkciókhoz is kell (lásd a fejléc saját-tudatpont jelzés jegyzete, [jegyzetek.md](jegyzetek.md), 2026-07-10).
    - **Egyezmény** kártya „Javaslat létrehozása" pontja ✅ KÉSZ (2026-07-22) — `tudatpontFuggo`,
      a JavaslatModal-t nyitja. Lásd a lenti **„Javaslat-típus domain-szabályok"** szakaszt.

### Javaslat-típus domain-szabályok (2026-07-22, Csaba) — melyik entitáson mi indítható

| Entitás | Törlés | Módosítás | Áthelyezés | Egyesítés | Csomag |
|---|---|---|---|---|---|
| Tartalom | ✅ | ✅ | ✅ | ✅ *(csak Tartalommal → Tartalom)* | ✅ |
| Kategória | ✅ | ✅ | ❌ | ✅ *(csak Kategóriával → Kategória)* | — |
| Tartalomtípus | ✅ | ✅ | ❌ | ❌ | — |
| Egyezmény | ❌ | ❌ | ✅ | ❌ | ❌ |

- **Egyesítés — AZONOS típus (2026-07-22, Csaba finomítás):** Tartalmat csak Tartalommal,
  Kategóriát csak Kategóriával lehet egyesíteni; Tartalomtípust egyáltalán nem. Az „új entitás
  típusa" a kártya típusából KÖVETKEZIK (nincs szabad választás), a forrás-mezők is csak ezt a
  típust engedik. Backend: a résztvevők típusa AZONOS kell legyen (`Set(erintettek).size===1`) és
  Tartalom/Kategória; az eredmény-típus egyezik.
- **Az új entitás szülője OPCIONÁLIS (Csaba, 2026-07-22):** üresen hagyva az alap-szülő a források
  **LEGKÖZELEBBI KÖZÖS ŐSE** (`javaslatService._legkozelebbiKozosSzulo` — forrásonkénti ős-lánc az
  `osLancFelepitese`-ből, a legmélyebb mindegyikben szereplő ős), vagy null (gyökér), ha nincs közös
  ős. A számítás a javaslat LÉTREHOZÁSAKOR történik és bekerül a javaslatba. Ha megadják a szülőt:
  Tartalom-eredménynél Tartalom, Kategória-eredménynél Kategória; nem lehet érintett entitás vagy
  annak leszármazottja (service + végrehajtó). Kategória-eredménynél a közös ős úgyis kategória
  (a kategória-hierarchia enumja miatt), de defenzíven ellenőrizzük.
- **Egyezmény tárhely egyesítésnél:** üresen hagyva az ÚJ entitás (a `…0001` placeholder → a
  létrejövő entitás ID-ja), és lehet null is (gyökér egyezmény) — a modell/backend elfogadja.

- **Kikényszerítés KÉT szinten:** (1) frontend — `frontend/js/utils/javaslatSzabalyok.js`
  (`engedelyezettJavaslatTipusok` + `egyesitesForrasTipusok`), a `JavaslatModal` a típusgombokat
  entitástípus szerint elrejti, és a kategória-egyesítés forrás-/eredmény-/szülő-típusát kategóriára
  szűri; (2) backend — `javaslatService._javaslatTipusKorlatokValidalasa` érintett-entitásonként
  (így a Csomag tételeire is), a `javaslat` modell `erintettEntitasok.entitasTipus` enumja bővült
  `Egyezmeny`-nyel, a létezés-ellenőrzés is.
- **Egyezmény áthelyezése VÉGREHAJTÁS is:** az `athelyezesiVegrehajto` Egyezményt is mozgat
  (repository típus szerint; a cél mindig Tartalom). Az egyezmény-tárhely áthelyezésnél opcionális (null=gyökér).
- **Kategória-egyesítés:** a szülő-validáció (service) és a végrehajtó (create + kör-ellenőrzés) az
  eredmény-típushoz igazodó repository-t használ (kategóriánál `KategoriaRepository`).
- ✅ **Egyesített entitás GYEREKEI az ÚJ entitás alá kerülnek (Csaba döntése, 2026-07-22).** Korábban
  az `egyesitesiVegrehajto` 7. lépése (gyerek-átállítás) HALOTT kód volt: a 4. lépés a forrásokat
  0 pontra állítja → auto-törlés, ami a gyerekeket a NAGYSZÜLŐHÖZ kötötte, mielőtt a 7. lépés lefutott
  volna (findByParentId üres). Javítás: új **3.5 lépés** a törlés ELŐTT összegyűjti a forrás-gyerekeket
  (a hierarchikus fából, bármely típus, a magukat-is-forrás entitások kihagyva), a **7. lépés** pedig
  az ÚJ entitás alá köti őket — entitás-doc + hierarchikus fa (`updateSzuloId`) + osLanc-részfa
  (`reszfaOsLancUjraepitese`) + hierarchikus pont-újraszámítás felfelé (`_hierarchiaPontokFelfele`).
  Ez EGYSZERRE javítja a Tartalom-egyesítést (eddig a nagyszülőhöz kerültek) és valósítja meg a
  kategóriát. Típus-inkompatibilis gyerek (enum) esetén az adott gyerek átugorva, a merge nem hiúsul meg.

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

13. [x] **Navigáció-bővítés: testvér-kacsacsőrök + Struktúra nézet** (terv elfogadva:
    2026-07-19, Csaba döntései; 13/a KÉSZ és böngészőben igazolva, 13/b KÉSZ, de
    ❓ FELTÉTELES — böngészős teszt hátra: teszt.md 50). Név-döntés (2026-07-19):
    a „minimap" név elvetve, a funkció neve **Struktúra nézet**, és TELJES KÉPERNYŐS.
    **FRISSÍTÉS (2026-07-20): visszatértünk a Struktúra nézethez.** A Síkidom nézet
    (14. pont) 1. lépése elkészült, de a megjelenés még nem jó → FELFÜGGESZTVE;
    a Struktúra nézet (13/b) újra az AKTÍV navigációs-vizualizációs irány.
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
    - **13/b. Struktúra nézet (HIBRID Canvas + SVG fa-nézet) — ✅ KÉSZ, AKTÍV IRÁNY
      (2026-07-20).** Elkészült és curl-lel igazolt (böngészős teszt hátra:
      teszt.md 50). A Síkidom nézet (14. pont) felfüggesztése után visszatértünk
      a Struktúra nézethez mint navigációs-vizualizációs irány. A leírás alább a
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
      **Backend:** `GET /api/struktura/darabszam` (globális darab + `agEntitasId`-re
      szintenkénti BFS-sel az ág mérete) és `GET /api/struktura` (kurzoros lapozás
      `_id` szerint, max 2000/lap, szűk projection) — forrás a
      `hierarchikusTudatpontAllokacio` kollekció, címek a közös
      `entitasCimekFeltoltese` segéddel (Javaslat/Egyezmény → null). Új
      repository-metódusok: `countOsszes`, `findStrukturaLap`, `findGyerekIdkBySzulok`.
      Curl-igazolt: globális 25 / ág 5 darab; 3 lap = pontosan 25 sor; auth 401.
      **Frontend:** új `StrukturaModal` (JS + HTML + CSS; a Modal `meret: 'teljes'`
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
        változtatta. **Megoldás (`StrukturaModal.js` + `strukturaModal.css`):**
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
          Egy kapcsoló dönt (`StrukturaModal.js`: `IKON_NO_A_ZOOMMAL`): `true` =
          világhoz kötött (zoommal nő/zsugorodik, `NODE_VILAG_EGYUTTHATO` és
          `NODE_MAX_SKALA` hangolja), `false` = a korábbi fix képernyő-méret. A
          kattintás-tolerancia és a `scale()` transzform is ezt követi. Jelenlegi
          alapérték: `true` — Csaba böngészős összevetése dönt a véglegesről.
        - **13/b-4. Alsó sáv látszik a Struktúra nézet alatt is (2026-07-20, Csaba
          kérése).** A teljes képernyős Struktúra nézet eddig eltakarta a főoldal alsó
          sávját; most az is látszik, ahogy a pakli nézetben. Megoldás: a
          `StrukturaModal` megnyitáskor a body-ra teszi a `teljes-nezet-nyitva`
          osztályt (záráskor leveszi), a `strukturaModal.css` pedig (a) az
          `.also-sav`-ot a modal fölé emeli — mivel önálló rétegződési kontextus,
          a benne lévő hamburger menü is a modal fölé kerül, tehát HASZNÁLHATÓ
          marad —, (b) az overlayt és a teljes panelt az alsó sáv fölött zárja
          (`--alsosav-magassag`, a JS méri, mert kis képernyőn a statisztika
          tördhet). A Síkidom nézet (teljes) egyelőre NEM kapja ezt (később
          ugyanígy beköthető).
        - **13/b-5. Finomítások (2026-07-20, Csaba böngészős visszajelzése).**
          (1) **Nincs előzetes kérdés:** a Struktúra nézet megnyitáskor EGYBŐL épít (az
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
          Tartalomtípusnak nincs mellék-ikonja. **Backend:** a `strukturaService`
          új `mellekIkonokFeltoltese` segéde típusonként EGY-EGY csoportos
          lekérdezéssel (N+1 nélkül) tölti a `/api/struktura` sorait a
          `kategoriaIkonok`, `tipusIkon`, `javaslatTipus` mezőkkel; a
          `faElrendezes` átvezeti a csomópontba, a `StrukturaModal` rajzolja.
        - **13/b-7. Sima zoom/pan — a drága SVG csak a mozgás végén épül újra
          (2026-07-20, Csaba: „akadozik zoom közben").** Ok: eddig MINDEN zoom/pan
          képkockán újraépült a teljes SVG-fedőréteg (`innerHTML`), ami az emoji-
          raszterizálás miatt kis adatnál is akadt. Megoldás (`StrukturaModal.js`):
          mozgás közben csak az OLCSÓ canvas-réteg rajzolódik újra képkockánként,
          az SVG-réteg pedig egyetlen közös `<g id="struktura-svg-tartalom">`-en át
          egy TRANSZFORMMAL követi a nézetet (pontos pozíció/méret, GPU-gyors); a
          teljes SVG-újraépítés csak a mozgás megállása után fut (settle-debounce,
          150 ms), ekkor frissül a LOD-szint, a láthatóság és a feliratok.
          (`_interakcioRajzolas` / `_gyorsRajzolas` / `_svgKovetes`, plusz a
          canvas kiszervezve `_canvasRajzolas`-ba.)
        - **13/b-8. Dinamikus cím-betűméret a csomópontokon (2026-07-20, Csaba
          kérése).** A Struktúra nézet címei ugyanazt a lépcsős, hossz-alapú betűméretet
          kapják, mint a kártya fejléce (rövid cím nagyobb, hosszú kisebb). A
          közös skálát új segéd adja: `frontend/js/utils/cimBetumeret.js` →
          `dinamikusCimBetumeret(hossz, maxMeret)`; a kártya (Kartya.
          `_cimBetumeretBecsles`) és a `StrukturaModal` is ezt hívja. A struktúra nézet a
          csomóponthoz igazított maximummal (`CIM_MAX_BETUMERET = 13`) számol, és
          a levágási hosszt a betűmérettel fordítottan arányosítja (kisebb betű →
          több karakter). A méret inline `style`-lal kerül a SVG-címre (felülírja
          a CSS tartalék 11px-et).
        - **13/b-9. Ág-szűrés BACKEND-oldalra (skálázhatóság, 2026-07-23, Csaba
          jegyzete 2026-07-21).** Eddig a kártya-menük „Struktúra nézet" pontja ág-módban is
          a TELJES fát letöltötte, és a kliens (`FaElrendezes`) vágta ki a részfát —
          több millió entitásnál nem tartható. Megoldás: a Struktúra nézet ág-szűrése a
          Rendezés nézetnél már bevált, indexelt `osLanc`-infrastruktúrára került.
          - **Letöltő végpont:** `GET /api/struktura` mostantól kap `agEntitasId`-t;
            ág-módban a szűrő `{ 'osLanc.entitasId': agEntitasId }` → CSAK a részfa
            sorai jönnek (a gyökér önmaga is, mert az osLanc önmagával kezdődik).
            (`strukturaController.lap` → `strukturaService.lapLekerese` →
            `repository.findStrukturaLap(kurzor, limit, agEntitasId)`.)
          - **Darabszám:** a szintenkénti BFS (`darabszamLekerese`) helyett egyetlen
            indexelt `repository.countAg(agEntitasId)` (osLanc). A régi BFS-kód és a
            `MAX_BEJARASI_MELYSEG` konstans törölve.
          - **Új index:** `{ 'osLanc.entitasId': 1, _id: 1 }` — az ág-letöltés
            `_id`-kurzoros lapozása milliós ágnál is teljesen indexelt marad.
          - **Frontend (`StrukturaModal._faLetoltese`):** ág-módban `&agEntitasId=…` a
            kéréshez, a folyamatjelző nevezője az ág mérete (`agDarab`). A
            `FaElrendezes` ág-szűrője megmarad VÉDŐHÁLÓNAK (már csak a részfa érkezik).
          - Böngésző nélkül igazolva (service-teszt): ág → 5 sor, mind a részfa
            tagja; globális → teljes fa. Böngészős teszt: Csaba.

    - **13/c. GLOBÁLIS teljes-struktúra nézet skálázása — [ ] KÜLÖN FELADAT (2026-07-23).**
      A 13/b-9 az ÁG-szűrt esetet oldotta meg. A globális „mutass mindent" nézet
      (millió csomópont egyszerre) más stratégiát kíván (viewport/LOD-alapú
      szerver-lapozás vagy aggregált áttekintés) — itt nincs mit szűrni, magát a
      teljes halmaz megjelenítését kell darabolni. Nyitott terv-pont, még nem
      kezdett.

14. [x] **Síkidom nézet (fő menü) — ✅ ÚJRAÉPÍTVE (2026-08-03).** A 2026-07-20-i
    1. lépés (napraforgó-spirál) megbukott a böngészős próbán: a mérés szerint a
    testvérek a kisebbik átmérőjük FELÉIG átfedték egymást, mert a spirál sugár-képlete
    100%-os területkitöltést feltételezett (körökkel ez geometriailag lehetetlen).
    Ezért elölről kezdtük, Csaba döntései szerint (2026-08-03):
    minden síkidom KÖRKÉNT pozicionálódik; a TERÜLET arányos a tudatponttal;
    a pozicionálás a koino_1.0 HÁROMSZÖGELÉSE, kiegészítve egy ÜRES MAGGAL
    (ez adja a stabilitást és a lapozás helyét); a betöltést a KÉPERNYŐ-ÁTMÉRŐ
    vezérli, nem a szülő-gyerek bejárás; a látómezőn +50%-on kívüli ágakat
    elengedjük; koppintásra a nézetben maradunk, csak az entitás kártyája jelenik
    meg bezárhatóan (az alsó sáv végig látszik, a kártya hamburgeréből visz
    „Pakli nézet" az adott ágra).
    A régi `sikidomElrendezes.js`, a `reszfaLekerese` és a `GET /api/sikidom`
    TÖRÖLVE.
    A koino_1.0 (`C:/koino_1.0`) síkidomos megjelenítésének újraépítése tiszta
    architektúrában. A koino_1.0 kód KÁOSZ (window.KioData/KioSystem globálisok,
    `_mod_mod_mod_mod` fájlnevek, duplikált algoritmus, D3+SVG, rétegek nélkül) —
    NEM egy az egyben átvenni, hanem a MŰKÖDÉST megérteni és a projekt
    konvencióival (magyar camelCase, rétegek, egy komponens = egy fájl + CSS)
    újraépíteni. A Struktúra nézet (13/b) ezzel válik feleslegessé vagy konzisztenssé.

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
    `hierarchikusTudatpontAllokacio`-ra épül (mint a Struktúra nézet; a Struktúra nézet
    `findGyerekIdkBySzulok`-jához hasonló ág-bejáró segéddel).

    ### ÁLLAPOT 2026-08-04 (session-váltó összefoglaló)

    **MŰKÖDIK, a menüből elérhető (🔷 Síkidom nézet).** A fejlesztői adatbázisban
    105 gyökér van (`tools/sikidomTesztAdat.js` hozta létre), a nézet kirajzolja,
    lehet nagyítani, koppintásra megjelenik a bezárható kártya.

    **Az elkészült rétegek:**
    - `GET /api/sikidom/gyerekek` — KÜSZÖBÖS betöltés (nem lapozás), kurzorral.
      Lásd a teszt.md API-referenciáját. A régi `GET /api/sikidom` **megszűnt**.
    - `frontend/js/utils/sikidomMeret.js` — tudatpont → sugár (TERÜLET ∝ pont,
      szintenként /20). A becslő réteg (`PAKOLASI_SURUSEG`, `magSugarBecsles`,
      `gyokerMagSugar`) 2026-08-05-én TÖRÖLVE — lásd az alábbi állapotot.
    - `frontend/js/utils/sikidomPakolas.js` — háromszögeléses kör-pakolás üres
      maggal, determinisztikus (nincs `Math.random`), plusz a `kitoltPont`
      helycsináló mozgatás.
    - `frontend/js/utils/sikidomHorgony.js` — KORLÁTLAN nagyítás horgonyváltással.
      Mérve: 295 váltás 10²⁸⁷-szeres nagyításig, 2,9·10⁻¹¹ px képeltéréssel →
      **nincs pislogás** (ez váltja ki a koino_1.0 vászon-újraépítését).
    - `SikidomModal.js` — Canvas, képernyő-vezérelt betöltés/elengedés, pan/zoom,
      csippentés, koppintás → egyetlen bezárható kártya (`kartyaGyar.js` +
      `Kartya.extraMenuOpciok` → „🃏 Pakli nézet"). Alsó sáv végig látszik.
    - Törölve: `sikidomElrendezes.js` (a régi napraforgó-spirál, 50% átfedéssel).

    ### ÁLLAPOT 2026-08-05 — A SOK-TESTVÉRES PROBLÉMA MEGOLDVA

    A 2026-08-04-i nyitott probléma (sok testvérnél entitások maradtak ki) **le van
    zárva**. A tervezett „sűrűség-söprés" NEM kellett: nem a `PAKOLASI_SURUSEG`
    értéke volt rossz, hanem maga a becslő modell.

    **A hiba oka, visszafejtve.** A magot a tudatpontból BECSÜLTÜK, egy feltételezett
    0,45-ös sűrűséggel. A becslés csak TERÜLETTEL számolt — pedig egy `w` szélességű
    gyűrűbe egy `r > w/2` sugarú kör semennyi területtel sem fér be, és a pakolás
    növekvő sorrendben rak, tehát épp a legnagyobb kör kerül legkívülre. Ilyenkor a
    pakoló a magot felezve „javított", akár NULLÁRA; a `szabadMagSugar = 0` onnantól
    véglegesen 0 maradt, minden további adag `nincsHely`-t kapott, a hívó viszont a
    `betoltottGyerekPont`-ot mégis növelte → az entitások NÉMÁN elvesztek.
    (3 sikeres adag × 60 = 180 — pontosan egyezik a méréssel.)

    **AZ ÚJ MODELL — EGYETLEN SZABÁLY (Csaba döntései, 2026-08-05).**
    A nagyítás VÉGÉN fogjuk azt, ami a képernyőn (+50%) látszik — a már
    lerakottakat és a soron következő várakozókat —, és ÚJRAPAKOLJUK bentről
    kifelé, növekvő méret szerint, a mag körül. Nincs kitolás, nincs
    biztonsági szelep, nincs adagonkénti láncolás: egy szabály.

    - **A MAG MINDIG ÜRES** — soha semmit nem teszünk bele; a testvérek KÖRÉ
      pakolódnak.
    - **A mag képpontban állandó** (`MAG_CEL_ATMERO` = 120 px), adat-térben
      `(MAG_CEL_ATMERO/2) / szülőKépernyőSugár`. Ebből a szintenkénti √20-as
      váltószám miatt MAGÁTÓL kijön a helyes magméret minden hierarchia-
      mélységben — nem kell külön mélység-logika.
    - **A letöltés és a lerakás külön lépés:** a letöltött, de le nem rakott
      testvérek a csomópont `varolista`-ján várnak. Így semmit nem számolunk
      lerakottnak, aminek nincs helye.
    - **Az újrapakolás hatóköre a látómező:** aki oda benyúlik, azt átrendezzük;
      aki teljesen kívül van, helyben marad és akadály lesz.
    - **A szülő nem tud megtelni:** a gyerekek együttes területe legfeljebb a
      szülő 1/20-a (hierarchikus össztudatpont), tehát hússzoros a tartalék. A
      mérésen a perem 0,35 körül marad (a szülő sugara 1).

    **A PAKOLÓ: SZABAD ÍVEK SZÁMÍTÁSA (2026-08-05, Csaba döntése).**
    Az új kört a legutóbb lerakott kör („horgony") mellé tesszük. Ha érinti a
    horgonyt, a KÖZÉPPONTJA egy körön van (a horgony körül, r₁ = r_H + r sugárral)
    — végtelen sok hely. Kiszámoljuk, mely szögek TILTOTTAK: egy C kör (D
    távolságra, φ irányban, r_C sugárral) akkor zavar, ha

    ```
    cos(θ − φ)  >  (r₁² + D² − (r + r_C)²) / (2·r₁·D)
    ```

    vagyis φ körüli, szimmetrikus szög-intervallumot tilt le. A tiltott
    intervallumokat összefésüljük; ami marad, az a SZABAD ÍVEK halmaza, és azok
    VÉGPONTJAI pontosan azok a helyek, ahol az új kör egy MÁSODIK kört is érint —
    a klasszikus háromszögelés, csak hiánytalanul.

    Ezzel **az ütközés-ellenőrzés nem külön lépés, hanem maga a számítás.** Nem
    kell partner-választás, korrekciós ág, Σ-távolság heurisztika, véletlen
    tartalék — és nem kell szülő-perem korlát sem.

    - **A mag ugyanolyan horgony, mint bármely kör**, és ő az ELSŐ jelölt (növekvő
      méretben pakolunk, a legkisebbek oda valók). Enélkül — befagyasztott
      környezet mellett — senki nem került a mag peremére, és a középső üresség a
      célérték TÍZSZERESÉRE nőtt.
    - **Az üres mag CSAK akkor van, ha van még meg nem jelenített testvér.** Ha
      nincs, a legkisebb a KÖZÉPPONTBA kerül.
    - **Pót-horgonyok a LEGKÜLSŐVEL kezdve**: a horgony akkor fullad be, ha körbe
      van véve, a szabad hely pedig a peremen van. (Befelé rendezve 600-ból 197 a
      várólistán ragadt.)
    - **Nincs perem-korlát élesben** — a matematika garantálja: 3000 testvérnél a
      legkülső pont 0,3442, pedig semmi nem tartja bent. A mérőpróba ELLENŐRZI.

    **MIÉRT EZ, ÉS NEM A KORÁBBI JELÖLT-GYÁRTÁS.** A koino_1.0 (és az első 1.1-es
    változat) néhány jelöltet mintavételezett, majd ellenőrizte őket. Ha a mintában
    nem volt szabad hely, átfedés keletkezett. A homokozóban (`regiPakolasTeszt.html`)
    a két módszer egymás mellett futtatható, ugyanazon az adaton:

    | eset | régi: átfedő pár / legrosszabb | íves |
    |---|---|---|
    | 100 kör, valósághű | 4 / 24,8% | **0** |
    | 300 kör, valósághű | 23 / 122,3% | **0** |
    | 300 kör, EGYENLETES méret | 767 / 100,0% | **0** |
    | 100 kör, mértani ×2 ugrás | 290 / 100,0% | **0** |
    | 100 kör, kétpúpú (59 049× ugrás) | 109 / 240,3% | **0** |
    | 300 kör, kétpúpú | 1534 / **13 392%** | **0** |

    Az egyenletes eset a legbeszédesebb: azonos méreteknél a régi „legközelebbi"
    döntései holtversenybe futnak (42 véletlen elhelyezés) — pont az a szimmetria-
    probléma, amit a koino_1.0-ban a `+0,001`-es ráhagyás próbált feloldani. Az
    íves módszernél ilyen döntés nincs, csak tiltott és szabad ívek.

    **MÉRT EREDMÉNY** (`node backend/tools/sikidomPakolasProba.mjs 600 1.3 90`):

    ```
    OK  Nulla átfedés — 600 síkidom, 179 700 pár ellenőrizve
    OK  Egyetlen entitás sem vész el — 600 lerakva + 0 várólistán = 600
    OK  Minden síkidom a szülőn belül — a legkülső perem 0,3545
    OK  Középtől kifelé monoton nő a méret — 11 egymásba fűzött gyűrű
    OK  A lyuk képpontban állandó — 120–120 px (cél 120 px)
    OK  Determinizmus (kétszer futtatva bitre azonos)
    Újrapakolás: 11× · a legdrágább lépés: 100 ms
    ```

    3000 testvérnél is **mind a hat átmegy**: 3000 lerakva, 0 a várólistán, perem
    0,3442, mag végig 120 px, a legdrágább lépés 2114 ms.

    **⚠️ NYITOTT — a lineáris skálázódás.** A lépésidő még mindig négyzetesen nő
    (600 → 100 ms, 3000 → 2114 ms), mert a `horgonyMelle` minden lerakásnál
    végigolvassa az ÖSSZES kört. Pedig csak a közeliek tilthatnak: a `tiltottIv`
    magától eldobja azt, akire `D ≥ r₁ + r + r_C`. Egyetlen ciklusról van szó —
    ide jön egy TÉRBELI RÁCS, és a pakolás lineárissá válik. Ez a következő lépés.

    **⚠️ NYITOTT — kifelé zoom.** Csaba döntése szerint kicsinyítéskor NEM kell
    újraépíteni: az ív-számítással hozzá kell fűzni azokat, amik újonnan a
    képernyő+50%-os területre kerültek, a középen a minimum alá esők pedig
    egyszerűen eltűnnek. A modalba ez még nincs bekötve (most kicsinyítéskor is a
    teljes újrapakolás fut).

    **ELVETETT IRÁNY — kitolás.** A már lerakottak kifelé tolása (sugárirányban,
    bizonyítottan átfedésmentesen, 600 síkidomra 0,04 ms) működött, de pazarolt: Δ-t
    nyitni a magnál minden sugáron nyit egy Δ széles sávot, és ~750 lerakott testvér
    fölött a perem elérte a szülőt. Az újrapakolás egyszerűbb és jobb képet ad.

    **ELVETETT IRÁNY — spirál-lánc.** A síkidomok egyetlen, kifelé csavarodó láncot
    alkotnának, és helycsináláskor a lánc elcsúszna a saját pályáján (Csaba képe:
    összetekeredett kígyó, aminek a feje elindul a teste mellett). Sebességben
    kiváló: 600 síkidom 1,3 ms. DE a prototípus 25–37 átfedő párt adott (a
    legrosszabb 24%), és 1200 gyerek fölött a lánc kicsavarodott a szülőn kívülre
    (perem 7,4 → 15,4). Szoros burkoló és rendes érintő-számítás kellene hozzá.

    **Menet közben javított hibák (ne essünk vissza beléjük):**
    - `pakolas`: a `maxKulsoSugar = 0`-t tévesen „nincs korlát"-nak vette →
      az adagok teljes méretben egymásra pakolódtak (több ezer átfedés). Most a
      0 = „nincs hely", és üres eredményt ad.
    - A magra tett fix `maxKülső × 0,9` ráhagyás adagonként ÚJRA levonódott
      (0,9²⁸ ≈ 0,05) → elvette azt a területet, ami az adagnak kellett. Helyette
      levezetett korlát: `mag ≤ √(maxKülső² − adagTerület / sűrűség)`.
    - Az üres mag mérete NEM becslés: a backend `osszesGyerekPont`-jából a
      TÉNYLEGES maradék jön (a korábbi becslés a szülő saját pontját is
      beleszámolta → kétszeres túlfoglalás, látható üres gyűrű).
    - A minimum mag a LEGKISEBB testvérhez van kötve (nem a legnagyobbhoz),
      különben a középső üresség nem igazodik a képernyőhöz.
    - `findBySzuloId` / `findGyokerek`: a rendezés döntője az `_id` — enélkül
      azonos pontszámnál a lapok átfedtek volna.

    **Csaba döntései (kötelező érvényűek):**
    - Minden síkidomot KÖRKÉNT pozicionálunk; a TERÜLET arányos a tudatponttal.
    - Az üres mag MINDIG van (nem feltételhez kötött), és MINDIG ÜRES — soha
      semmit nem teszünk bele; a testvérek köré pakolódnak.
    - A mag mérete a KÉPERNYŐHÖZ van kötve (állandó képpont-átmérő), nem a
      tudatponthoz. A hierarchia-mélység szerinti skálázás ebből magától adódik.
    - Helyszűkében a már lerakottak KIMOZDULHATNAK (kifelé tolás), hogy a
      frissen láthatóvá vált testvéreknek jusson hely a mag mellett.
    - Koppintás → a nézet MARAD, csak az entitás kártyája jelenik meg, bezárhatóan.
    - Az alsó sáv végig látszik (onnan lehet pakli nézetre váltani).
    - Zoom van (görgetés/csippentés), de koppintásra nem.
    - A böngészős tesztet Csaba végzi.

    **Kis lépések — az ALÁBBI (2026-07-20-i) lépéssor TÖRTÉNETI: a napraforgó-spirálos
    megközelítést a 2026-08-03-i újraépítés leváltotta. A megvalósult lépések:
    (1) backend lapozós gyerek-végpont `GET /api/sikidom/gyerekek`; (2) `sikidomMeret.js`
    + `sikidomPakolas.js` (méret és háromszögeléses pakolás); (3) `sikidomHorgony.js`
    + a `SikidomModal` Canvas-alapú újraírása; (4) koppintás → egyetlen kártya
    (`kartyaGyar.js`, `Kartya.extraMenuOpciok`); (5) menü élesítése + doksik.**

    *(Történeti — a leváltott megközelítés:)*
    - **1. lépés — ~~✅ KÉSZ~~ LEVÁLTVA (2026-07-20; a böngészős próbán megbukott):** backend
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

15. [ ] **Rendezés (fő menü + kártya-menük) — TERV ELFOGADVA (2026-07-20).** A pakli
    nézet kap egy RENDEZÉS-választót: a mostani **hierarchikus** elrendezés marad az
    ALAP, e fölött két új, LAPOS mód: **időrend** (`letrehozva`) és **saját tudatpont**
    szerint. A lapos módoknál nincs testvér-navigáció (kacsacsőrök) és nincs
    szülő-gyerek kártya-átfedés — egyszintű, sorba rendezett kártyalista.
    **Csaba döntései (2026-07-20):**
    - „saját tudatpont" = az **entitás saját összpontja** (`entitasSajatTudatpont`),
      NEM a néző e-emberé és NEM a hierarchikus összpont.
    - a lapos lista **minden entitástípust** felsorol (Kategória, TartalomTípus,
      Tartalom, Javaslat, Egyezmény).
    - „ágazat" = **a fa egy ága (részfa)**: egy csomópont + minden leszármazottja.
    - hatókör: **fő menüből → GLOBÁLIS**; **kártya-menüből → az a kártya az
      ágazat-gyökér** (csak a részfáját rendezi) — a Keresés/Tudatpontok/Struktúra nézet
      ág-szűrt mintájára.
    **Lépések (apró, egyenként ellenőrizhető):**
    - Backend 1. ✅ KÉSZ (2026-07-20, curl-igazolt) — Globális időrendi lista: új
      `hierarchikusAllokaciRepository.findMindIdorendben` + `pakliService.rendezettListaOsszeallitasa`
      + `pakliController.rendezettLekerese` + route `GET /api/pakli/rendezett?mod=ido&irany=csokkeno|novekvo`.
      Minden entitás egy lapos listában `letrehozva` szerint, a pakliéval azonos fejléc-adat-
      feltöltéssel + olvasatlan badge-ekkel; limit fix 200 (lapozás későbbi). Igazolva:
      401 auth nélkül; 27 elem csökkenő/növekvő; mod/irány validáció 400; `sajatPont` egyelőre 400.
    - Backend 2. ✅ KÉSZ (2026-07-20, curl-igazolt) — „Saját összpont" mód (`mod=sajatPont`):
      DB-oldali rendezés a `tudatpontAllokacio` INDEXELT `osszesPont` mezőjén
      (`tudatpontRepository.findMindSajatPontSzerint`), a top-N-hez a hierarchikus mezőket
      batch `$in`-nel (`hierarchikusAllokaciRepository.findManyByEntitasIdk`). Csaba
      döntése: (B) skálázható út; nincs 0-pontos entitás (mindig törlődik) → a
      `tudatpontAllokacio` a teljes halmazt lefedi (27=27). Igazolva: csökkenő/növekvő
      monoton a saját összpont szerint, minden típus, `hierarchikusOsszesPont` helyes.
    - Backend 3. Ágazat (részfa) szűrés — SKÁLÁZHATÓ ős-lánc úton (Csaba döntése,
      2026-07-21: több millió entitásra tervezünk, BFS helyett indexelt `osLanc`).
      Alprojekt:
      - 3a. ✅ KÉSZ (2026-07-21, curl-igazolt) — `osLanc` mező + `{ 'osLanc.entitasId':1,
        letrehozva:-1 }` index a `hierarchikusTudatpontAllokacio`-ra; migrációs tool
        (`tools/entitasOsLancPotlas.js`, 27/27 feltöltve); az `ido` mód `agazatId`
        szűrője (`findMindIdorendben` 3. paraméter) az indexelt osLanc-on. Igazolva:
        részfa = DB-számolt méret (5), globális 27, IXSCAN, védelmek (sajatPont+ágazat
        → 400, érvénytelen agazatId → 400). Az „ágazat = részfa (csomópont + leszármazottai)",
        a gyökér önmaga is beletartozik (az osLanc önmagával kezdődik).
      - 3b. ✅ KÉSZ (2026-07-21, node-teszttel igazolt) — Karbantartás: közös
        `osLancKarbantartoService` (a láncot MINDIG a szuloId-láncból építi újra →
        sorrend-független). Bekötve best-effort (nem blokkoló) módon: `tudatpontService`
        (új entitás első allokációjakor → `entitasOsLancFrissitese`) és `athelyezesiVegrehajto`
        (áthelyezés után → `reszfaOsLancUjraepitese`, a részfát a RÉGI osLanc alapján gyűjti,
        majd újraépíti mindkét kollekcióban). A migrációs tool is ezt a service-t hívja (DRY).
        Igazolva (önmagát visszaállító teszt): lánc önmagával kezdődik+gyökérig ér;
        áthelyezés után az új gyökér bekerül / a régi kikerül mindkét kollekcióban;
        visszaállítás helyreáll.
      - 3c. ✅ KÉSZ (2026-07-21, curl-igazolt) — `sajatPont` + ágazat: `osLanc` a
        `tudatpontAllokacio`-ra is (+ `{ 'osLanc.entitasId':1, osszesPont:-1 }` index);
        a migrációs tool a hierarchikus láncot TÜKRÖZI a tudatpont-táblára (27/27);
        `findMindSajatPontSzerint` 3. paramétere az agazatId. Igazolva: ugyanaz az 5-elemű
        részfa mint `ido`+ágazatnál, monoton csökkenő saját pont, IXSCAN. A controller
        `sajatPont`+ágazat elzárása feloldva (mindkét mód szűrhető ágra).
    - Frontend 4. ✅ KÉSZ (2026-07-21, kód; böngészős teszt hátra) — Lapos renderelési
      út a `Pakli.js`-ben: `rendezesMod`/`rendezesIrany`/`rendezesAgazatId` állapot +
      `rendezesBeallitasa()` (publikus) + `_lapositottInit`/`rendezettLekerese`/
      `lapositottRendel`/`lapositottKartyaKivalasztasa`/`lapositottCsakCssValt`. Lapos
      módban kimarad a `TestverJelzo`, a wheel-testvérváltás és a
      `--szulo-alatta`/`--gyerek-felette` átfedés; a koppintás helyben bontja a body-t.
    - Frontend 5. ✅ KÉSZ (2026-07-21, kód; böngészős teszt hátra) — „Rendezés" a fő
      menüben (↕️): új `RendezesModal` (Modal-vázra épül, rádiók: 4 mód + irány;
      hierarchikusnál az irány letiltva) + `FoOldal._rendezesMegnyitasa` (globális,
      `agazatId=null`) + `rendezesModal.css`. Statikus kiszolgálás curl-igazolt (200).
    - Backend 4. mód ✅ KÉSZ (2026-07-21, curl-igazolt, Csaba kérése) — „ÁGAZATI tudatpont"
      (`mod=agazatiPont`): a `hierarchikusOsszesPont` (az entitás + teljes ága súlya) szerint,
      a `sajatPont` (közvetlen összpont) MELLETT külön módként. `findMindHierarchikusPontSzerint`
      + új `{ 'osLanc.entitasId':1, hierarchikusOsszesPont:-1 }` index; ág-szűrve IXSCAN.
      A modal negyedik rádiója: 🌿 „Ágazati tudatpont (az egész ág)".
    - Frontend 6. ✅ KÉSZ (2026-07-21, kód; böngészős teszt hátra) — „Rendezés" a
      KÁRTYA-menükben (közös pont minden kártyán, a Keresés/Struktúra nézet/Tudatpontok mintájára):
      `Kartya._agRendezesMegnyitasa` a `RendezesModal`-t nyitja `agazatCim`-mel; alkalmazáskor
      az adott kártya az ágazat-gyökér (`window.aktivPakli.rendezesBeallitasa(mod, irany,
      entitasId)`). Hierarchikus módban globálisra esik vissza (nincs ágazat).
    - Frontend 7. Visszaváltás a hierarchikus alaphoz KÉSZ (a modalból); a CSISZOLÁS
      (pl. lapos kártyák közti térköz, üres-ág állapot) a böngészős benyomásra vár.

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

## Részvételi modell — passzív/aktív szerep + a felmenő-kényszer leváltása (2026-07-30, Csaba döntése)

*Cél: a szavazásokat NE korlátozzák a passzív tudatpont-tulajdonosok. A tudatpontnak
eddig két, ütköző jelentése volt egyszerre — (1) prioritás-jelzés („legyen látható"),
(2) kormányzati belépő („szavazhatok/javasolhatok"). Ez a feladat szétválasztja a
kettőt egy explicit szereppel, és önkéntessé teszi a hierarchiába-tartozást.*

### A vezérszabály

> **Passzív** = az e-ember csak figyel és prioritást jelez a tudatpontjával; **NEM
> számít a részvételi arány nevezőjébe.**
> **Aktív** = számít a nevezőbe.
> **Bármilyen döntés-alakító tett aktívvá teszi az e-embert** az érintett entitáson:
> **szavazás, érték javaslat, javaslattétel.** Így a résztvevők (számláló) mindig
> részhalmaza a nevezőnek → a részvételi arány sosem lép 100% fölé.
> A szerepet **csak az entitás első allokálásakor** kérdezzük (alapból passzív);
> később ugyanazon az entitáson már nem kérdez rá.

### Rögzített döntések (2026-07-30, Csaba)

1. **Passzív az alapértelmezett.** Minden entitás ELSŐ allokálásakor egy beszédes
   modal elmagyarázza a passzív/aktív jelentését + hogy később átállítható; passzív
   előre kiválasztva. A második allokálástól ugyanazon az entitáson NEM kérdez újra.
2. **Passzív is szavazhat**, de a szavazattal (és az érték javaslattal, javaslattétellel
   is) **automatikusan aktívvá válik** — így tartható a 100%-os felső határ.
3. **Vállalt trade-off: elkötelezett kisebbség dönthet** a néma többség ellenére
   (szakmai/hozzáértés-igényes témák: pl. programfejlesztés). Nincs alsó védőkorlát —
   mert mindenki meg lett kérdezve.
4. **A kikényszerített felmenő-allokálás megszűnik.** Eddig: gyerekre csak úgy tehettél
   pontot, ha minden felmenőn is volt (`HIANYZO_FELMENOK` dobás + blokkoló checkbox).
   Ezután: **figyelmeztetés + opcionális** 1-1 pontos felmenő-kitöltés; a mentés
   kitöltés nélkül is végbemegy. A felmenő-kitöltés is a rendes szabály alá esik:
   **ahány felmenőre pont kerül, annyiszor** nyílik fel a passzív/aktív modal (mindegyik
   a saját első allokálásakor, egyenként — nincs „batch" közös választás).
5. **Külön menüpont a szerep utólagos állításához.** A kártya-menübe új, tudatpont-függő
   **„Részvételi beállítások"** pont kerül; itt az adott entitáson passzív↔aktív
   váltható (ez váltja ki az „első allokáláskor egyszer kérdezünk" ígéretének utóéletét).

**Migráció:** NINCS — a rendszer még éles indulás előtt (nincs valós e-ember,
a helyi DB tiszta). A `szerep` mező tiszta lappal indul.

**Parkolva (nem most, az első közösséggel egyeztetve):** részletesebb, **javaslat-
típusonkénti** aktív/passzív hozzáállás beállítása.

### Megvalósítási lépések (apró, izolált lépések)

- [x] **1. Modell** — ✅ KÉSZ (backend). [tudatpontHozzarendeles.js](../backend/models/tudatpontHozzarendeles.js):
  új `szerep` mező (`enum: ['passziv','aktiv']`, `default: 'passziv'`) + `{ entitasId,
  entitasTipus, szerep }` index az „aktív hozzájárulók" indexelt számolásához.
- [x] **2. Segédfüggvények** — ✅ KÉSZ (backend). [tudatpontService.js](../backend/services/tudatpontService.js):
  `szerepAktivalasa()` (passzív→aktív billentés, idempotens) + `szerepAktivalasaTobbEntitason()`
  (best-effort burkoló) + `szerepBeallitasa()` (a menüből, csak a szerepet állítja);
  [tudatpontRepository.js](../backend/repositories/tudatpontRepository.js) `updateSzerep()`.
- [x] **3. Aktívvá billentés bekötése** — ✅ KÉSZ (backend). [szavazatService.js](../backend/services/szavazatService.js),
  [ertekSzamitasService.js](../backend/services/ertekSzamitasService.js),
  [javaslatService.js](../backend/services/javaslat/javaslatService.js): a három
  döntés-alakító tett minden érintett entitáson (ahol a cselekvőnek van pontja)
  aktívvá teszi. A szavazásnál a billentés a nevező újraszámítása ELŐTT fusson.
- [x] **4. Nevező aktívra szűrése** — ✅ KÉSZ (backend). [javaslatSzamitasService.js](../backend/services/javaslat/javaslatSzamitasService.js)
  (`entitasokTudatpontTulajdonosokSzama`): a nevező = **aktív tulajdonosok ∪ szavazók**
  (a szavazó-unió miatt a ≤100% szavazás utáni passzívra-váltásnál is áll) + osztás-védelem.
  Az ÉRTESÍTÉS-címzettek lekérdezése marad teljes (minden tulajdonos)! Több-entitásos
  javaslatnál: aki legalább egy érintett entitáson aktív.
- [x] **5. Felmenő-kényszer kivétele** — ✅ KÉSZ (backend). [tudatpontService.js](../backend/services/tudatpontService.js)
  (`felhasznaloTudatpontHozzarendelese`): a `HIANYZO_FELMENOK` dobás törölve; az 1-1
  kitöltés opció marad (`felmenoketAutomatikusan`, alapból passzív szereppel). A
  [tudatpontController.js](../backend/controllers/tudatpontController.js) `HIANYZO_FELMENOK`-ága
  így holt kód → a 6. lépésnél/takarításnál eltávolítandó.
- [x] **6. TudatpontModal + szerepválasztó** — ✅ KÉSZ (böngészős teszt hátra).
  Támogató backend: az allokáló végpont (`szerep` param) + `entitasAllokaciLekerese`
  (`eemberSzerep`) átvezetve. Új [SzerepValasztoModal.js](../frontend/js/components/modals/SzerepValasztoModal.js)
  (+ [szerepValasztoModal.css](../frontend/css/components/modals/szerepValasztoModal.css)):
  újrahasznált, promise-t adó passzív/aktív választó. [TudatpontModal.js](../frontend/js/components/modals/TudatpontModal.js):
  első-allokáláskor felugró szerepválasztó; a felmenő-figyelmeztetés NEM blokkoló, a
  „Felmenők kitöltése" gomb felmenőnként (sorban) kér szerepet; a régi blokkoló
  checkbox-logika törölve.
- [x] **7. „Részvételi beállítások" menüpont** — ✅ KÉSZ (böngészős teszt hátra).
  Backend: `PUT /api/tudatpont/szerep/:entitasTipus/:entitasId` ([route](../backend/routes/tudatpontRoutes.js)
  + [controller](../backend/controllers/tudatpontController.js) `szerepBeallitasa`, a service-metódus a 2. lépésből).
  Frontend: új [ReszveteliBeallitasokModal.js](../frontend/js/components/modals/ReszveteliBeallitasokModal.js)
  (a `.szerepvalaszto` CSS-t újrahasználja) + közös, tudatpont-függő menüpont a
  [Kartya.js](../frontend/js/components/kartya/Kartya.js)-ben (🙋 „Részvételi beállítások").
- [x] **8. Dokumentáció** — ✅ KÉSZ. [teszt.md](teszt.md): 3.5. végpont-leírás frissítve
  (`szerep`, felmenő opcionális, `PUT .../szerep/...`), a körteszt 2. lépése átírva, és
  új **5/b. H)** mélyteszt-szakasz (45–51. lépés: szerepválasztó, felmenő nem blokkol,
  létrehozó aktív, „Részvételi beállítások" menü, nevező-hatás, ≤100%).

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
