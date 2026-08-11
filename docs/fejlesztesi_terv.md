# koino_1.1 — Fejlesztési terv

*Utolsó frissítés: 2026. 08. 10.*

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

    ### ÁLLAPOT 2026-08-06 — A LINEÁRIS SKÁLÁZÓDÁS MEGVAN

    A 2026-08-05-én nyitva hagyott pont lezárva. **A mérés viszont mást mutatott,
    mint amit a terv feltételezett — ezt fontos rögzíteni.**

    **A DIAGNÓZIS JAVÍTÁSA.** A terv azt írta, hogy „az egyetlen ok a `horgonyMelle`
    ciklusa". A CPU-profil (`node --cpu-prof`, 1500 síkidom) ezt megcáfolta:

    | mit mértünk | a futásidő hányada |
    |---|---|
    | a pót-horgonyok rendezése (`peremSorrend`) | **67%** |
    | a `pakolas` törzse (a rendezés előkészítése) | 16% |
    | a geometria (`tiltottIv` + `horgonyMelle`) | **5%** |

    Vagyis a geometria alig számított; az időt az vitte el, hogy a pakoló MINDEN
    lerakásnál újrarendezte az összes kört a peremtől mért távolság szerint —
    ráadásul olyan összehasonlítóval, ami hívásonként KÉT gyökvonást végez.

    **A KÉT JAVÍTÁS.**

    1. **PEREM-RANGSOR** (`sikidomPakolas.js`). Egy lerakott kör „külsősége"
       (`|közép| + sugár`) többé nem változik — fölösleges újrarendezni. Helyette
       egy 42 elemű, csökkenő rangsort tartunk karban (kettes kereséssel), és
       mindig annak az elejéről jönnek a pót-horgonyok. A rendezés 67%-ból 1,6%
       lett.
    2. **TÉRBELI RÁCS** (új: `frontend/js/utils/sikidomRacs.js`). A `horgonyMelle`
       nem olvassa végig az összes kört, csak a közelieket kéri el. A nehézség a
       méret-szórás volt (mért 765-szörös sugárarány): egyetlen cellamérettel vagy
       a nagy körök lógnának ki száz cellába, vagy a kicsikből zsúfolódna ezer
       egyetlen cellába. **Ezért méret-osztályonként külön rács van:** a kör
       szintje `⌊log₂ sugár⌋`, a szint cellamérete `2^(szint+2)` — így az átmérő
       pont egy cella, minden kör legfeljebb 2×2 cellát érint. A szintek száma
       logaritmikus (765-szörös szórás = 10 szint). Ha egy szinten több cellát
       járnánk be, mint ahány kör van rajta, BIZTONSÁGI FÉK kapcsol be, és a
       szint listáját olvassuk végig — így a rács soha nem lehet lassabb a réginél.

    **A KÉP NEM VÁLTOZOTT.** Nyolc pakolás-eset (200/600/1500/3000 kör, négy
    méret-eloszlás, maggal és anélkül, befagyasztott környezettel) pozíció-szintű
    ujjlenyomata **bitre azonos** a gyorsítás előttivel. A gyorsítás tehát nem
    „másik pakolás", hanem ugyanaz, kevesebb munkával.

    **MÉRT EREDMÉNY.**

    | eset | előtte | utána |
    |---|---|---|
    | mérőpróba, 600 síkidom, a legdrágább lépés | 91 ms | **11 ms** |
    | mérőpróba, 3000 síkidom, a legdrágább lépés | 2114 ms | **25 ms** |
    | egyetlen pakolás, 3000 kör | 2224 ms | **52 ms** |

    Skálázódás (egy pakolás, Zipf-eloszlás): 500 → 27 ms, 4000 → 65 ms,
    32 000 → 710 ms, **64 000 → 1099 ms**. Az egy síkidomra jutó idő 128-szoros
    mérettartományban 0,015–0,022 ms között marad — ez a linearitás.

    A linearitás OKA is mérve (`backend/tools/sikidomRacsProba.mjs`): a lerakásonként
    megnézendő jelöltek száma KORLÁTOS. 500 körnél 71,9 jelölt, 32 000-nél 99,0 —
    vagyis 64-szeres darabszámnál 1,38-szoros munka, az összes kör 0,31%-a.

    Az új próba a rács helyességét is bizonyítja: 2400 lekérdezésen, négy
    méret-eloszláson (a legszélsőségesebb 1400-szoros sugárugrással) a rács
    **egyetlen közeli kört sem hagyott ki** a nyers erővel összevetve.

    ### HIBAJAVÍTÁS 2026-08-06 — „NEM TAPADNAK EGYBE, HA KILÓG A KÉPERNYŐBŐL"

    **Csaba megfigyelése:** „zoom-kor, ha már egy része kilóg a képernyőből, akkor
    már rosszul pakolja le a köröket. Nem tapadnak egybe." Böngészőben
    reprodukálva (felvétellel): amíg minden elfér, a gyűrű tömör; ahogy a kép
    túlnő a képernyőn, a KÜLSŐ nagy síkidomok láthatóan elválnak egymástól —
    miközben a belső, kis körök gyűrűje végig hibátlanul tömör marad.

    **AZ OK.** Az újrapakolás hatósugarát eddig a rövidebb képernyő-oldalból
    számoltuk: `(min(szélesség, magasság) / 2) × 1,5`. Széles ablakban ez súlyosan
    alábecsül. A mért esetben a vászon 1535×480 volt:

    | mennyiség | érték |
    |---|---|
    | rövidebb oldal fele | 240 px |
    | ebből a fagyasztási határ (× 1,5) | **360 px** |
    | a vászon sarkának távolsága a középtől | **803 px** |

    Vagyis a fagyasztási határ BELÜL került a látható területen. A határon kívüli
    — de még jól látható — síkidomok befagytak egy korábbi nagyításkor számolt
    helyükön, miközben a bentebbiek szorosan újrapakolódtak a zsugorodó mag köré.
    A két réteg találkozásánál nyílt a rés. Ezért függött a jelenség pontosan
    attól, hogy a kép kilóg-e a képernyőből: a varrat épp ott futott.

    **A JAVÍTÁS.** A hatósugár mostantól a vászon FÉL ÁTLÓJÁBÓL számolódik
    (`_ujrapakolasiSugar()`): ez a képernyő-téglalap körülírt körének sugara,
    tehát bármilyen képarány mellett lefedi az egész látható területet; a
    `UJRAPAKOLASI_TARTALEK` pedig ezen felül ad ráhagyást, hogy a varrat a
    képernyőn KÍVÜLRE essen. A mért esetben 360 px → 1206 px.

    **Böngészőben ellenőrizve:** ugyanaz a nagyítási sor, ugyanaz a mélység — a
    külső gyűrű összefüggő maradt. A munka nem nőtt el: a teljes nagyítási soron
    6 újrapakolás futott. (Ez a javítás azért volt megfizethető, mert a pakolás
    aznap vált lineárissá — a régi, négyzetes pakolóval a megnövelt hatókör
    vállalhatatlan lett volna.)

    **A MARADÉK RÉSEK NEM HIBÁK — MÉRVE (2026-08-06).** A javítás után Csaba még
    mindig látott hézagokat a nagy síkidomok között. Böngészőből kiolvasva a
    pakoló tényleges bemenetét és eredményét (ideiglenes `window.__sikidomNyom`
    horog), három nagyítási szinten:

    | mérés | eredmény |
    |---|---|
    | befagyasztott síkidom | **0** |
    | lerakatlan | **0** |
    | 2%-nál nagyobb réssel „lebegő" | **0** |
    | a 40 px-nél nagyobb körök rése a legközelebbi NAGY szomszédjukhoz | **0 px** |

    Vagyis **minden kör érint legalább két másikat, és minden nagy kör érint egy
    másik nagyot is.** A látott ékek a különböző méretű körök pakolásának
    ELKERÜLHETETLEN hézagai: egy körpakolásban nem lehet minden szemre szomszédos
    pár érintkező. A geometria tehát rendben van.

    **AMI VISZONT VALÓDI, ÉS TERVEZÉSI KÉRDÉS.** A hézagok azért ILYEN feltűnőek,
    mert a pakolás sorrendje „legkisebb középre, növekvő kifelé". Így a nagy körök
    utoljára, egy finom szemcsés belső tömb PEREMÉRE kerülnek: mindegyik beékelődik
    a tömb egy-egy horpadásába, és a szomszédos nagyok közt ék alakú üresség marad.
    Ez a sorrend szándékos (a mag peremén bukkanjanak elő az újonnan láthatóvá váló
    kicsik) — a látvány ennek az ára.

    Ha a tömörebb, „buborékfürt" kép a cél, az irány a D3 `packSiblings`-éhez
    hasonló FRONT-LÁNC: a legnagyobbakkal kezdeni, és minden új kört a front két
    egymást követő köréhez érintve letenni. Ez viszont felülírná a „legkisebb
    középre" döntést, ezért külön, tudatos döntés kell hozzá.

    ### HIBAJAVÍTÁS 2026-08-06 (2.) — A MAG KILÖKTE A GYEREKEKET A SZÜLŐBŐL

    Csaba küldött egy képernyőképet MEGNYITOTT KONZOLLAL, és abban ott volt a
    bizonyíték:

    ```
    sikidomPakolas.pakolas - VÉGE
    {lerakott: 1, lerakatlan: 0, mertMag: '0.8969', kulsoSugar: 1.2842}
    ```

    **`kulsoSugar = 1,2842`** — a gyerek a szülőjén KÍVÜLRE került (a szülő sugara
    1). Ez a nézet egyik alapinvariánsának sérülése.

    **AZ OK.** A mag képpontban ÁLLANDÓ (`MAG_CEL_ATMERO` = 120 px), a szülő
    viszont a nagyítás állásától függően kicsi is lehet a képernyőn. Ha a szülő
    képernyő-sugara a mag sugara körül van, `celMag = 60 / kepSugar` az 1-hez
    közelít. A mért esetben a szülő 67 px sugarú volt → a mag 0,8969, vagyis a
    szülő 90%-a. A gyerekek a mag peremére kerülnek, és a szülőn kívülre lógnak —
    onnan pedig a szülő TESTVÉREI közé szóródnak. Ez a „szétesik" látvány.

    **MIÉRT NEM BUKOTT MEG A MÉRŐPRÓBA.** A `beagyazasEllenorzes` pontosan ezt
    az invariánst nézi („Minden síkidom a szülőn belül"), de a próba
    `KEZDO_KEPSUGAR = 400`-ról indul és csak NŐ — ilyen kis képernyő-sugárral
    sosem futott, ezért a hibás tartományba bele sem ért.

    **A JAVÍTÁS.** Egy gyerek a mag peremén ülve `mag + 2·sugár`-ig ér ki, ez
    pedig legfeljebb 1 lehet:

    ```
    magSugar ≤ 1 − 2 · legnagyobbGyerekSugár
    ```

    A VILÁG szint kivétel: virtuális csomópont, nincs valódi pereme, és a
    gyökereket szándékosan a mag KÖRÉ terítjük (ott a mért `kulsoSugar` 5,43 —
    ez helyes).

    **NYITOTT: HIÁNYZIK A MÉLYSÉGI TESZT-ADAT.** A fejlesztői adatbázisban 105
    gyökér van, de alattuk alig van gyerek (a mért csomópontnak 1 darab). Ezért a
    drill-down eset böngészőben alig gyakorolható, és ezért kerülgettük ilyen
    sokáig ezt a hibát. A `tools/sikidomTesztAdat.js`-t ki kellene egészíteni
    TÖBB SZINTŰ teszt-adattal, és a mérőpróbát kis kezdő képernyő-sugárral is
    futtatni.

    **MEGMARADT, KISEBB PONT.** A `_lathatoLista` kiszámolja minden csomópont
    képernyő-pozícióját (`kepX`, `kepY`), de az újrapakolásnak csak a `kepSugar`-t
    adja át. Az `_ujrapakolas` ezért a SZÜLŐ KÖZÉPPONTJÁTÓL mért távolságot
    hasonlítja a képernyőből számolt küszöbhöz — hallgatólagosan feltéve, hogy a
    szülő a képernyő közepén van. Elhúzott (panolt) képnél ez nem igaz. A fél
    átlós ráhagyás ezt elfedi, de a tiszta megoldás a `kepX`/`kepY` átadása és a
    valódi látómező-téglalaphoz mérés. Külön, kis lépés.

    ### HIBAJAVÍTÁS 2026-08-06 (3.) — A MAG SZINTENKÉNTI SKÁLÁZÁSA

    **Csaba pontosítása:** „a belső magméretnek a képernyőhöz kell igazodnia, DE a
    hierarchia szintet, azaz a 20-adra csökkentést, szintenként alkalmazni kell."
    Ez javítja ki a modell valódi hibáját — a (2.) pont korlátja csak tünetet kezelt.

    **A KORÁBBI HIBÁS MODELL.** A mag minden csomópontnál a SAJÁT képernyő-
    sugarából jött: `60 / sajátKépSugár`. Vagyis MINDEN szint egyszerre akart
    120 képpontos lyukat. Csakhogy egy szinttel lejjebb a csomópont √20 ≈ 4,47-szer
    kisebb a képernyőn — ott a 120 px már nem fér bele, és a mag kilökte a
    gyerekeket a szülőből. A terv korábbi állítása („a szintenkénti √20-as
    váltószám miatt MAGÁTÓL kijön a helyes magméret minden mélységben, nem kell
    külön mélység-logika") tehát **téves volt** — épp fordítva: a szintenkénti
    skálázást KÜLÖN kell alkalmazni.

    **A HELYES SZABÁLY.** A 120 px EGY szintre szól: arra, amit épp nézünk (a
    horgony szintje). Lejjebb szintenként √20-cal kisebb a lyuk is. Adat-térben ez
    azt jelenti, hogy minden csomópont UGYANAZT a relatív magot kapja, a HORGONY
    képernyő-sugarából számolva:

    ```
    magSugarRel = (MAG_CEL_ATMERO / 2) / horgonyKépernyőSugár
    ```

    A horgony képernyő-sugara maga a `_nezet.skala` (a horgony kerete definíció
    szerint 1 sugarú). Kapcsoló: `MAG_SZABALY` — `'szintenkent'` (új) /
    `'csomopontonkent'` (korábbi).

    **A PROGRAM TUDJA, MELYIK SZINTET NÉZI.** Csaba kérése: „amikor beleközelítenek
    egy entitásba, azt a programnak érzékelnie kell; a koino_1.0 ezt már tudta."
    A nézet ezt a HORGONNYAL érzékeli (`_horgonyEllenorzes` lépteti le/föl). Az új
    `_horgonySzint()` teszi kiolvashatóvá (VILÁG = −1, gyökerek = 0, gyerekeik = 1…),
    és a naplóba is bekerül. Erre épül a mag skálázása, és erre épülhet később a
    szint kiírása vagy a szinthez kötött viselkedés.

    **INVARIÁNS-ŐR.** Az `_ujrapakolas` mostantól `console.error`-t ír, ha egy
    gyerek a szülőn kívülre kerül (`kulsoSugar > 1`). Ez a hiba 2026-08-06-án épp
    egy konzolos képernyőképről derült ki — ne kelljen legközelebb kitalálni.

    **MEGSZŰNT AZ ADATHIÁNY.** Új eszköz: `backend/tools/sikidomMelysegTesztAdat.js`
    — TÖBB SZINTŰ fát épít egy meglévő gyökér alá (a rendes service-en át, tehát
    minden származtatott rekord konzisztens). Futtatva: 155 tartalom 3 szinten.
    Erre azért volt szükség, mert a fejlesztői adatbázisban 105 gyökér mellett
    mindössze 3 nem-gyökér entitás volt — **a horgony szintje mérve végig −1
    maradt**, vagyis a drill-down esetet hetekig nem is teszteltük.

    ```
    docker exec koino-backend node tools/sikidomMelysegTesztAdat.js 3 5
    ```

    **NYITOTT — böngészős ellenőrzés.** A mélységi adat megvan, a szabály és az
    invariáns-őr bekötve, a böngészőben eddig 0 sértés — de a horgony a próbáim
    alatt még nem lépett 0. szint alá, tehát a drill-down eset ELLENŐRZÉSRE VÁR
    (a böngészős tesztet Csaba végzi).

    ### KÍSÉRLET 2026-08-06 — ÜRES MAG NÉLKÜL

    Csaba kérése: próbáljuk ki a nézetet üres mag nélkül. **Minden újrapakolásnál
    a LEGKISEBB olyan testvér kerüljön a KÖZÉPPONTBA, amelyik elérte a láthatósági
    küszöböt.** Ez felülírja a 2026-08-05-i „a mag mindig üres" döntést.

    **DÖNTÉS (2026-08-06 este, Csaba): MARADUNK A MAG NÉLKÜLI VÁLTOZATNÁL.**
    `SikidomModal.URES_MAG = false`. Napközben egyszer visszaállt `true`-ra, mert
    a böngészős próbán a mag nélküli változat rosszabbnak tűnt — de utóbb kiderült,
    hogy a „szétesést" NEM a mag hiánya okozta, hanem két külön hiba: a fagyasztási
    határ (1. javítás) és a szülőt kinövő mag (2–3. javítás). A mérés végig a mag
    NÉLKÜLI változatot mutatta tömörebbnek: **52,7% kitöltöttség és 4,08 átlagos
    érintés**, szemben a maggal futó 48,7%-kal és 3,01-gyel (105 valódi gyökéren).

    A mérőpróba tudja mindkettőt:
    `node backend/tools/sikidomPakolasProba.mjs 600 1.3 90 24 nincsmag`.
    Mag nélkül 600-nál és 3000-nél is mind a hat ellenőrzés átmegy (perem 0,3547
    illetve 0,3439, nincs középső lyuk).

    **AMI EZZEL NYITOTTÁ VÁLIK:** a mag azt IS jelezte, hogy „van még lejjebb
    testvér". Ezt — ha kell — MÁSHOGY kell megoldani, nem a kép lazítása árán.

    **Ami a kapcsolón kívül változott:** a pakoló eddig csak TELJESEN ÜRES lapon
    tette a legkisebb kört a középpontba (`kornyezet.length === 0`). Mag nélküli
    nézetben ez kevés — újrapakoláskor mindig van befagyasztott környezet (a
    látómezőn kívüli testvérek), tehát a kép közepén ok nélkül maradt volna lyuk.
    Most a feltétel az, hogy a **középpont szabad-e** (`kozeppontSzabad`): a
    környezet egyetlen köre se üljön rajta. Vak (0,0)-ra helyezés átfedést okozna,
    ezért ezt megvizsgáljuk, nem feltételezzük.

    **Ami MAGÁTÓL megszűnik, külön kód nélkül:**
    - a szaggatott mag-kör nem rajzolódik (a mért lyuk 0 lesz, a rajzoló pedig
      csak pozitív lyukat rajzol);
    - a „kinőtt a mag" újrapakolás-ág nem sülhet el — innentől az újrapakolást
      CSAK az hajtja, hogy érkezett-e új, láthatóvá vált testvér.
    - A BETÖLTÉST ez nem érinti: azt a tudatpont-küszöb vezérli (`_pontKuszob`).

    **Mérve** (mind a hat ellenőrzés átmegy mag nélkül is, 600-nál és 3000-nél):
    nulla átfedés, egyetlen entitás sem vész el, minden a szülőn belül (perem
    0,3547 / 0,3439), monoton gyűrűk, **nincs középső lyuk (0 px)**, determinizmus.
    A meglévő nyolc pakolás-eset ujjlenyomata változatlan — a maggal futó
    viselkedést a módosítás nem érintette.

    **AMIT A BÖNGÉSZŐS PRÓBÁN FIGYELNI KELL** (ezt csak képernyőn lehet eldönteni):
    - A mag eddig azt IS jelezte, hogy „van még lejjebb testvér". Mag nélkül ez a
      jelzés eltűnik — látszik-e egyáltalán, hogy érdemes tovább nagyítani?
    - Nagyításkor mindig új, kisebb testvér lesz a legkisebb, tehát a KÖZÉPSŐ
      síkidom cserélődik. Nyugodt-e ez a csere, vagy ugrálásnak látszik?

    ### HÁNY SÍKIDOM LEHET EGYSZERRE A KÉPERNYŐN? (matematikai korlát)

    Csaba kérdése (2026-08-06): korlátozza-e a minimum-méret és a képernyő+50%
    matematikailag a darabszámot? **Igen — és ez a nézet egyik alaptörvénye.**

    A levezetés két tényből áll:
    - a síkidomok **nem fedik át egymást**, tehát a területük összege legfeljebb
      akkora, mint a mező, amin vannak;
    - minden látható síkidom **átmérője legalább `MIN_KEP_ATMERO` = 24 px**, tehát
      a területe legalább `π · 12² ≈ 452 px²`.

    Az újrapakolás mezője egy `R = (min(szélesség, magasság) / 2) · 1,5` sugarú
    korong (`UJRAPAKOLASI_TARTALEK`). Legyen `M = min(szélesség, magasság)` CSS-
    képpontban (a nézet `clientWidth`/`clientHeight`-tel számol, tehát a retina-
    szorzó NEM sokszorozza a darabszámot). Ekkor

    ```
        N · π · 12²  ≤  π · R²  =  π · (0,75 · M)²
        N  ≤  (0,75 · M)² / 12²  =  M² / 256
    ```

    | képernyő | M | elméleti felső korlát | reális (0,9069 pakolási sűrűséggel) |
    |---|---|---|---|
    | telefon, 390×844 | 390 | 594 | ~539 |
    | laptop, 1366×768 | 768 | 2304 | ~2090 |
    | Full HD, 1920×1080 | 1080 | 4556 | ~4132 |
    | 4K, 3840×2160 | 2160 | 18 225 | ~16 529 |

    Ez **a képernyő méretének négyzetével** nő, és teljesen független attól, hány
    entitás van a rendszerben (millió vagy milliárd). A gyakorlati szám ennél
    KISEBB, mert a síkidomok nem mind minimális méretűek — a nagyok sok helyet
    esznek. A korábban mért „egyszerre legfeljebb ~600 testvér" ezzel egyezik.

    Következmények:
    - A `MIN_KEP_ATMERO` a nézet igazi szabályozója: **négyzetesen** hat a
      darabszámra (24 → 34 px felezi a maximumot).
    - **Ellenőrizendő:** a `MAX_RAJZOLT` = 4000 biztonsági plafon Full HD fölött
      már a korlát ALÁ esik (4556, illetve 4K-n 18 225). Nagy képernyőn tehát nem
      a matematika, hanem a plafon vágna — ezt vagy fel kell emelni, vagy a
      képernyő-méretből kell számolni. Külön, kis lépés.

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
    - ~~Az üres mag MINDIG van (nem feltételhez kötött), és MINDIG ÜRES~~ —
      **FELÜLÍRVA 2026-08-06-án, lásd az „ÜRES MAG NÉLKÜL" kísérletet alább.**
    - A mag mérete a KÉPERNYŐHÖZ van kötve (állandó képpont-átmérő), nem a
      tudatponthoz. A hierarchia-mélység szerinti skálázás ebből magától adódik.
      (Csak akkor érvényes, ha a mag be van kapcsolva.)
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

---

## Síkidom nézet — az újrapakolás hatóköre a VALÓDI látómezőhöz (2026-08-06 este)

**Csaba kérdése:** „nem azt beszéltük, hogy befelé zoomkor újrarakjuk az egészet,
mindig, a zoom végén? ez most így működik?"

**A válasz a kódból: NEM egészen.** Két korlát volt benne:

1. **Az újrapakolás csak akkor FUT LE**, ha új testvér vált láthatóvá
   (`ujak.length > 0`), vagy — maggal futva — ha a mag kinőtte a célméretet.
   Mag nélkül a második ág soha nem sül el, tehát ha semmi új nem jött, nincs
   újrapakolás. Ez rendben van: a relatív helyek nagyítás-függetlenek, nincs mit
   újraszámolni.

2. **A hatókör NEM az egész**, hanem a látómező — ez így is volt eltervezve
   (2026-08-05). DE a válogatás rosszul mért: a gyerek `|relX, relY|` távolságát,
   vagyis a SZÜLŐ KÖZÉPPONTJÁTÓL vett távolságot hasonlította egy képernyőből
   számolt sugárhoz. Ez hallgatólagosan feltette, hogy a szülő a képernyő
   közepén van.

**A KÖVETKEZMÉNY (ez okozta Csaba új hibáját).** Amint az e-ember elhúzza a
képet, vagy egy OLDALSÓ körbe nagyít bele, a szülő középpontja elcsúszik a
képernyő közepétől. Ilyenkor a képernyőn LÁTHATÓ testvérek befagynak (mert a
szülő középpontjától messze esnek), a frissen érkező kicsik pedig a szülő
KÖZÉPPONTJA köré épülnek — vagyis „nem középen jelennek meg, hanem teljesen
máshol, a nagyok között".

**A JAVÍTÁS.** A `_lathatoLista` mostantól a teljes `kep`-et adja át
(`{ kepX, kepY, kepSugar }`), és az `_ujrapakolas` a gyerek VALÓDI
képernyő-körét veti össze a látómező TÉGLALAPJÁVAL (a képernyő +
`UJRAPAKOLASI_TARTALEK` arányú kerete). A korábbi fél átlós kerülőút
(`_ujrapakolasiSugar`) ezzel feleslegessé vált — törölve.

**Böngészős ellenőrzésre vár** (a tesztet Csaba végzi).

---

## Síkidom nézet — a több milliós testvér-állomány kezelése (2026-08-06, Csaba modellje)

Miután a képernyő-pozíció alapú kivágást kikapcsoltuk (mert az okozta a napi
hibákat), valaminek korlátoznia kell a munkát. Csaba javaslata:

> „ugyanabban a sorban szednénk vissza a kívül esőket, ahogyan leraktuk, és
> kifelé zoomkor az íves számítással építjük vissza. Meg ha lenne maximum
> terület, ami fölött eltűnik a síkidom, akkor az sorrendben tüntetné el őket."

### A modell

A testvérek EGY rendezett sort alkotnak (növekvő méret szerint — ez a pakolás
sorrendje is), és ebből mindig egy ABLAK látszik:

- a sor **elejét** a láthatósági küszöb vágja (`MIN_KEP_ATMERO` — túl kicsi);
- a sor **végét** a képernyő **kapacitása** vágja (nem fér több a képre).

Nagyításkor az ablak előre csúszik: elöl belépnek az apróbbak, a végéről leesnek
a legnagyobbak. Kicsinyítéskor pontosan fordítva, UGYANABBAN a sorrendben épül
vissza — az íves pakolás hozzáfűzésre való, ez természetes.

**Miért ez a jó megoldás:** a sorrend az ADATBÓL következik (méretből), nem
abból, hogy épp hol van a kép. Egy pozíció-teszt referenciapontja elcsúszhat (ez
okozta az egész napi hibasorozatot) — a sorrendé nem tud.

### ELVETVE: a maximum-MÉRET küszöb (mérés)

Csaba felvetése szerint a vágás egy felső méret-küszöb lenne. **Mérve nem
korlátoz** (1 000 000 testvér, Zipf-eloszlás):

| szülő képsugár | csak MIN | MAX=2000 px | MAX=600 px | MAX=200 px |
|---|---|---|---|---|
| 6 400 | 722 | 722 | 719 | 701 |
| 102 400 | 73 408 | 73 362 | 73 065 | 71 265 |
| 409 600 | 739 909 | 739 444 | 736 448 | 718 308 |

A felső küszöb 0,5–3%-ot vág le, és ez az arány a nagyítással NEM javul. Az ok:
a tömeg nem a néhány nagynál van, hanem a hosszú farokban — ahogy nagyítunk,
egyre több apró lépi át az ALSÓ küszöböt, és a darabszám a nagyítás négyzetével
nő. A felső küszöb tehát csak állandó hányadot vág, nem korlát.

### A VÉGE: a képernyő kapacitása, TERÜLETBEN

`_kepernyoKapacitas()`: a rajzolt mező (képernyő + `LATOMEZO_TARTALEK` kerete)
területe × `PAKOLASI_SURUSEG`. Addig veszünk a sorból, amíg a síkidomok
együttes KÉPERNYŐ-TERÜLETE ebbe belefér.

**Miért terület, és nem darabszám:** egy darabszám-plafon a legrosszabb esetet
(csupa minimum-méretű síkidom) feltételezné, és 4K-n 73 000-et engedne — pedig
néhány nagy síkidom ugyanennyi helyet foglal. A terület magától igazodik a
méret-keverékhez.

**MÉRVE — a munka a testvérek számától FÜGGETLEN:**

| szülő képsugár | 10 000 testvér | 100 000 | 1 000 000 |
|---|---|---|---|
| 6 400 | 765 | 730 | 710 |
| 102 400 | 370 | 4 399 | 4 395 |

Képernyőnként (1 000 000 testvér): telefon 151, széles ablak 409, Full HD 1 150,
4K 4 593 síkidom. A lineáris pakolóval ez legrosszabb esetben is ~80 ms.

### Ami a sor végéről leesik

Nem vész el: visszakerül a `varolista`-ra (ugyanabba a sorba), a részfáját pedig
elengedjük a tárból. Kicsinyítéskor onnan épül vissza.

**Böngészős ellenőrzésre vár** (a tesztet Csaba végzi).

---

## Síkidom nézet — a kapacitás-vágás két hiányossága (2026-08-08)

A méret szerinti sor + képernyő-kapacitás modell (fentebb) a **megjelenítést**
korlátozta. Kódolvasáskor két rés derült ki rajta; mindkettőt ugyanabban a
metódusban (`_ujrapakolas` / `_lathatoLista`) javítottuk.

### 1. A horgony kieshetett a tárból → ÜRES VÁSZON

**A hiba.** A kapacitás-vágás a sor VÉGÉRŐL, tehát a **legnagyobbaktól** dobott le
síkidomokat, és a leesőket ki is törölte a tárból (`_reszfaTorlese` + `_tar.delete`).
Csakhogy befelé nagyítva épp a **horgony** a legnagyobb a képernyőn (a váltás
küszöbe a képernyő kétszerese) — vagyis garantáltan a sor végén állt, ott, ahol a
vágás történik.

Ha a horgony kiesett, a `this._horgony` egy nem létező azonosítóra mutatott. A
`_horgonyEllenorzes` és a `_lathatoLista` is azonnal kilépett, és a **vászon
kiürült** — csak az „illesztés" gomb hozta vissza. Számokkal: egy 1000×800-as
ablaknál a kapacitás 2,24 millió képpont², a horgony területe 900 képpontos
sugárnál már 2,54 millió.

**A javítás.** Új `_vedettIdk()`: a horgony és a teljes ős-lánca védett. Ők
- mindig bekerülnek a `beferok` közé (kell nekik hely, a pakoló elhelyezi őket);
- a kapacitásból **nem esznek** — a horgony nem a testvéreivel versenyez a
  helyért, ő MAGA a jelenlegi látómező. Ha a területe beszámítana, egyedül
  fölemésztené a keretet, és minden testvére kiesne.

A „legalább egy elem mindig befér" szabályt külön számláló (`normalDarab`) őrzi,
hogy egy védett elem jelenléte ne rontsa el. A visszadobó ágban maradt egy
`console.error` biztonsági ellenőrzés: ha valaha mégis védett elem kerülne a
vágásba, azonnal látszik a konzolon.

### 2. A kapacitás a LERAKÁST korlátozta, a LETÖLTÉST nem

**A hiba.** A letöltést egyedül a tudatpont-küszöb vezérelte, és a
`betoltottKuszob` csak akkor frissült, ha az adag nem telt bele a 150-es plafonba.
Amíg `vanTovabb` igaz volt, `Infinity` maradt → a feltétel mindig teljesült, a
betöltés `finally` ága pedig újra meghívta a `_tennivalokFeldolgozasa`-t, tehát a
kérések **maguktól láncolódtak**.

Következmény: mély nagyításnál — a saját mérésünk szerint — akár **739 909**
testvér kerül a küszöb fölé. A nézet mindet lehozta, 150-esével (~4900 kérés), és
mind ott ült a várólistán; a jelölt-gyűjtés és a rendezés onnantól több százezer
elemen futott képernyőnyi eredményért.

**A javítás.** Ugyanaz a két vágás vezérli a letöltést is:

- új csomópont-mező `varolistaRelTerulet` — a FRISS (backendtől érkezett)
  várakozók együttes **relatív** területe (Σ π·relR²). Relatív, ezért
  nagyítás-független: a képernyő-terület egyetlen szorzás (`× kepSugar²`), nem
  kell képkockánként végigolvasni a listát;
- a `_lathatoLista` csak akkor kér újat, ha ez a puffer a képernyő-kapacitás
  `BETOLTESI_TARTALEK` (= 2) szeresénél kevesebb. Miért 2: egy zoom-lépés (×1,2)
  a látszó területet ~1,44-szeresére növeli, tehát a kétszeres puffer egy teljes
  lépést kiszolgál letöltés nélkül;
- a kapacitás által **visszadobott** testvérek `visszaesett: true` jelölést kapnak,
  és **nem** számítanak a pufferbe. Ez a lényegi finomság: ők a sor végéről estek
  le (túl nagyok), és ha beszámítanának, örökre elzárnák a még hiányzó **kicsik**
  letöltését.

Semmi nem vész el: a kurzor őrzi, hol tartunk, és amint a puffer lerakás közben
leapad, a következő adag pontosan onnan folytatódik. A `relR`-t mostantól a
várólistára fűzéskor számoljuk ki, egyszer, a közös `_relSugar()` segéddel — így a
sor és a lerakás sorrendje biztosan egy forrásból jön.

### 3. Backend: az összesítő aggregáció nem futhat kérésenként

A `gyerekekOsszPontja` egy `$group` a szülő MINDEN gyerekére. A fenti láncolással
ez ~4900-szor futott volna le ugyanazért az egy számért. Új `osszesKell` query
paraméter (alap: `1`): `osszesKell=0` esetén a service kihagyja, és
`osszesGyerekPont: null`-t ad. A kliens csak az ELSŐ kérésnél kéri el, utána a
saját másolatát használja (a `??` miatt a null nem írja felül).

### Mellékesen javítva

- `kulsoSugar` felvéve az `_ujCsomopont`-ba (eddig az első `_meretekUjramerese`-ig
  `undefined` volt);
- `sulyy` → `suly` elgépelés a betöltési sorrendben;
- a `sikidomRoutes.js` és a `sikidomController.js` elavult kommentjei (a törölt
  `kihagy`+`darab` lapozásra, illetve a megszűnt `GET /api/sikidom`-ra hivatkoztak).

**Böngészős ellenőrzésre vár** (a tesztet Csaba végzi) — a `teszt.md` (j2) és (j3)
forgatókönyve.

---

## Síkidom nézet — mit veszünk át a koino_1.0-ból (2026-08-08)

Csaba kérésére végignéztük a `C:/koino_1.0` síkidomos rétegét (`calculators.js`,
`ContentPositioner.js`, `contentLayout.js`, `screenFillingContentDetector.js`,
`contentRenderer.js`, `canvasZoomPanManager.js`, `titlecards.js`, `shapes.js`),
hogy van-e benne bármi, amit az jobban csinál.

### Amit NEM veszünk át — és miért

- **A pakolás.** A `positionByTriangulation` három ágon `Math.random()`-mal helyez
  el, `+0,001` / `+0,000001` ráhagyásokkal, és `0,0001`-es epszilonnal rendez (ami
  nem tranzitív → motorfüggő sorrend). Átfedés-ellenőrzés nincs. Mérve: 300 körnél
  767 átfedő pár, szemben a 1.1 nullájával.
- **Az abszolút koordináták** (`szülő abs + gyerek rel`). Ez fogy el mélységben —
  emiatt kellett a teljes vászon-újraépítés. A 1.1 horgony-kerete ezt megoldja.
- **A DOM-alapú drill-down.** A `screenFillingContentDetector` csomópontonként
  `getBoundingClientRect`-tel mér, hiszterézis nélkül, és `CanvasReset`-et hív.
- **Az inkrementális DOM-delta** (`calculateContentDeltas`: új / eltávolított /
  változatlan). Okos SVG-hez, de a 1.1 Canvasra rajzol, ott minden képkocka új.
- **Kategória-SZÍN és típus-FORMA az adatból** (`category.color`,
  `contentType.shapeId`). Csaba döntése (2026-08-08): **nem kell** — a színek és a
  formák száma korlátozott, tehát nem tudnák lefedni a kategóriákat és a típusokat.
  Az IKONOK száma viszont nem korlátozott → az információt ikonnal hordozzuk.

### A szintváltás folyamata 1.0-ban (átnézve, nincs átvennivaló)

A `handleZoomEnd` → `detectAndUpdateScreenFillingContent` → `CanvasReset` lánc:

1. **Menti** az activeCanvasRoot képernyő-pozícióját (`savedActiveCanvasRootPosition`).
2. `previousVisibleContents` snapshot, majd **kiüríti** a `visibleContents`-t.
3. **Zoom-korrekció:** lefelé `zoom / √20`, fölfelé `zoom × √20`.
4. **Teljes újraszámolás** (`calculateKioDisplayData`): processedContentsMap,
   sugarak, pozicionálás, abszolút pozíciók.
5. Új transform: az új gyökér a képernyő közepére, a mentett pozícióval korrigálva.
6. `updateVisibleContents` + inkrementális render.

**Mit tesz be a képernyőre** (`populateProcessedContents`, hierarchikus mód):
nagyszülő → nagyszülő gyermekei (vagy ha nincs: az összes gyökér + azok gyermekei)
→ a szülő gyermekei és azok gyermekei (az aktív ágat kizárva) → az aktív gyökér
részfája. Mélységi ablak: `minDepth = canvasLevel`, `maxDepth = canvasLevel + 3` —
tehát **négy szint** egyszerre. **Mit vesz ki:** a maxDepth-en túli részfát, a 3 px
DOM-sugárnál kisebbeket, és a viewport-körön kívülieket.

**A két tanulság:**

- A **√20-as zoom-korrekció közelítés**: a valódi gyerek/szülő sugárarány
  `√(gyerekPont / (20 · szülőPont))`, ami csak akkor pont `1/√20`, ha a gyerek
  pontja megegyezik a szülőével. 1.0 tehát **ugrik** a váltáskor. A 1.1
  `horgonyValtasNezet` a VALÓDI `relR`-rel számol, ezért nem mozdul a kép.
- A **fölfelé épített kontextus** (2 szint + oldalág) nálunk már bővebb:
  `FELFELE_SZINTEK = 3`, és onnan lefelé mindent bejárunk a méret-küszöbig.

### Amit ÁTVESZÜNK — megvalósítva

1. **Címke: kártya + sortörés + a középpont fölé** (`titlecards.js` mintájára).
   Több sor (max 3) mért szélességgel, szóhatáron; félig áttetsző lekerekített
   háttérkártya; a hely `sugár × 0,6`-tal a középpont FÖLÖTT.
   **Ez nálunk hibajavítás is volt:** `URES_MAG = false` óta a középpontban a
   LEGKISEBB GYEREK ül, tehát a középre írt felirat rátakart — a kód kommentje
   viszont még azt állította, hogy ott üres mag van.
2. **Mellék-ikonok a síkidomon.** Kategória-ikonok balra, tartalomtípus jobbra, a
   felirat alatt, 96 px látszó átmérő fölött. Backend: a `sikidomService` a
   Struktúra nézettel KÖZÖS `mellekIkonokFeltoltese`-t hívja (nincs duplikált
   logika, típusonként egy csoportos lekérdezés). Frontend: `_ikonTar` kép-gyorsítótár,
   betöltéskor újrarajzolás — a rajzolás sosem vár a hálózatra.
3. **Elhalványodás a mérettel** (`calculateOpacity` mintájára). A képernyőhöz
   mérve (nem fix 4000 px-hez, mint 1.0): a halványodás a képernyő kisebbik
   oldalával egyenlő SUGÁRNÁL kezdődik — pont ahol a horgonyváltás történik — és
   háromszorosánál ér véget. A kitöltésre ÉS a keretre is vonatkozik (1.0 csak a
   kitöltésre alkalmazta; nálunk épp a keret vágta át a képernyőt).
4. **Animált illesztés** (`fitZoom` mintájára), 420 ms. A nagyítást a `skala`
   LOGARITMUSÁN interpoláljuk, mert a nagyítás szorzó jellegű; az eltolás lineáris,
   koszinuszos lágyítással. Megnyitáskor nincs animáció.
   **+ kifelé nagyítás alsó határa** (a D3 `scaleExtent` megfelelője): a VILÁG
   szinten az illesztési nagyítás negyedénél megáll — eddig nem volt korlát, és
   kizoomolva üres képernyő maradt.
5. **Görgő-érzékenység** (Csaba kérése). Eddig egy görgetés-esemény FIX 1,2-szeres
   ugrást adott; érintőpadon ez elszaladt (ott egy mozdulat sok apró eseményt küld).
   Mostantól a D3 `wheelDelta` képlete: `szorzó = 2^(−deltaY × egység)`, ahol az
   egység a görgetési módtól függ (képpont 0,002 / sor 0,05 / oldal 1). Egérgörgőn
   ez ~1,149-szeres lépés, érintőpadon folytonos. A +/− gombok maradnak 1,2-esek.
   A koppintás/húzás határa 5 → **7 px** (a 1.0 értéke).

**Böngészős ellenőrzésre vár** (a tesztet Csaba végzi) — `teszt.md` (j4).

### Utólag (2026-08-08): érintőpad és mobil

Csaba jelezte, hogy érintőpadot használ, és mobilon is működnie kell. Az átnézés
két VALÓDI hibát talált a gesztuskezelésben, plusz egy hiányzó érintőpad-ágat.

**1. Két ujjal nem lehetett mozgatni.** A csippentés csak az ujjak TÁVOLSÁGÁNAK
arányát nézte; ha az ujjak együtt csúsztak (az arány 1 maradt), a kép meg sem
mozdult. Mobilon a kétujjas mozgatás alapelvárás.

**2. Csippentés után az ott maradt ujjal nem lehetett mozgatni.** A húzás
kezdőpontja (`_huzasKezdet`) elavult maradt, és a `_huzasAktiv` false-ra állt —
amíg minden ujjat fel nem emeltél, a mozgatás nem indult újra.

**A megoldás: INKREMENTÁLIS gesztuskezelés.** Minden mozgás-eseménynél az ELŐZŐ
mérethez képest számolunk (`_gesztusMerese` → `{ kozepX, kozepY, tavolsag }`):

- **nagyítás** = a távolságok aránya, az ujjak MOSTANI középpontja körül;
- **mozgatás** = a középpont elmozdulása — egy ujjnál ez maga a húzás, kettőnél a
  csippentés melletti eltolás. **Ugyanaz a képlet mindkettőre.**

Ettől az ujjak számának változása MAGÁTÓL helyreáll: `pointerdown`/`pointerup`
után újramérjük az alapállapotot, tehát nincs ugrás. Három ujjnál sem esik szét
(az első kettő vezérel). A koppintás felismerése szigorúbb lett: csak akkor
adatlap, ha VÉGIG egy ujj volt (`_gesztusMaxUjj === 1`) és alig mozdult — így a
csippentés utolsó ujjának felemelése nem nyit véletlenül adatlapot.

**3. Érintőpad-csippentés.** A böngészők `wheel` eseményként küldik, `ctrlKey =
true`-val, de sokkal kisebb delta-értékekkel, mint a kétujjas görgetést. Külön
(nagyobb) egységet kapott: `GORGO_EGYSEG_CSIPPENTES` — Csaba próbája után
0,010-ről **0,012**-re emelve (20%-kal érzékenyebb).

**4. Firefox-igazítás.** A `GORGO_EGYSEG_SOR` mostantól a képpontos egység
100/3-szorosa (nem a D3 fix 0,05-e), így egy egérgörgő-kattanás minden
böngészőben ugyanakkorát nagyít.

**Böngészős ellenőrzésre vár** — `teszt.md` (j5).

---

## Síkidom nézet — a lerakottak HELYBEN MARADNAK (2026-08-08)

**Csaba tünete:** „amikor közelítek, akkor újrapakolja az egészet, és ettől
máshová kerülnek a síkidomok, és így nehéz ráközelíteni egy szélső síkidomra,
mert az mindig elugrál, kb. kergetni kell."

### Az ok

A `pakolas()` **sorrend-érzékeny**: növekvő méret szerint rak le, a legkisebbet a
középpontba. Közelítéskor az újonnan láthatóvá vált — az eddigieknél KISEBB —
testvérek a méret szerinti sor **elejére** kerülnek, tehát minden utánuk következő
lerakás új helyre kerül. Nem hiba: a „legkisebb középre" szabály következménye.

A másik irány stabil volt: amikor a kapacitás-vágás a sor VÉGÉRŐL dobott le
nagyokat, a kép nem rendeződött át (a pakoló determinisztikus, azonos kezdőszakasz
azonos eredményt ad). Kizárólag az **elülső beszúrás** destabilizál.

### A megoldás (Csaba választása: „A”)

Visszakapcsoltuk azt a szerkezetet, **amire a pakoló eredetileg épült** — a
`magSugar` és a `kornyezet` paraméterét eddig üresen hagytuk:

- **`URES_MAG = true`** — a mag képpontban állandó, tehát ADAT-TÉRBEN zsugorodik
  a nagyítással, és a pereme mentén folyamatosan hely szabadul fel;
- **a már lerakottak `kornyezet`-ként** (akadályként) vesznek részt, nem
  pakolandóként — a helyük **soha többé nem változik**;
- csak az ÚJAKAT rakjuk le.

A 2026-08-06-i mérés a mag NÉLKÜLI változatot mutatta tömörebbnek (52,7% / 4,08
érintés, szemben a 48,7% / 3,01-gyel) — de akkor nem tudtuk, hogy a stabilitást
fizetjük érte. A ~4 százalékpont ennek olcsó ára.

### ZSÁKUTCA (mérve): a kikényszerített gyűrű-szűrés

Első nekifutásra beépítettünk egy megkötést: az újak CSAK a zsugorodó mag pereme
és a legbelső meglévő síkidom közötti gyűrűbe kerülhessenek (radiális előszűrés +
utólagos elvetés). Az indok az volt, hogy a pakoló különben a pót-horgonyokhoz
fordul, azok pedig a legkülső körök — tehát az apró újakat a nagyok KÜLSŐ peremére
tenné.

**Mérve ez ÉHEZTET: 600 testvérből csak 99 került le, 501 véglegesen a várólistán
ragadt.** Az ok: a mag képpontban állandó (adat-térben zsugorodik), a testvérek
mérete viszont fix — a gyűrű előbb-utóbb mindenkinél túl vékony lesz, és mivel
onnantól nem kerül le semmi, a mért belső perem sem frissül. Holtpont.

**A megkötés fölösleges is volt.** A pakoló horgony-sorrendje (1. a mag pereme,
2. a munkafront, 3. pót-horgonyok kifelé) magától a helyes szerkezetet adja. Szűrés
NÉLKÜL mind a 600 lekerül, és a „középtől kifelé monoton nő a méret" ellenőrzés is
átmegy: 11 egymásba fűzött gyűrű.

### Mérés (böngésző nélkül, `sikidomPakolasProba.mjs`)

Új, 7. ellenőrzés: **„Lerakás után egyetlen síkidom sem mozdul"** — minden síkidom
helyét a lerakás pillanatában rögzítjük, és a futás végén összevetjük.

| testvér | lerakva | várólistán | legdrágább lépés | mozdult |
|---|---|---|---|---|
| 600 | 600 | 0 | 15 ms | **0** |
| 3000 | 3000 | 0 | 20 ms | **0** |

Mindkettőnél mind a 7 állítás átmegy: nulla átfedés, semmi nem vész el, minden a
szülőn belül, a méret középtől kifelé monoton nő, a lyuk képpontban pontosan
120 px, semmi nem mozdul, és a futás determinisztikus. (A régi, mindent
újrapakoló modell 3000-nél 25 ms-os legdrágább lépést adott — ez tehát gyorsabb is.)

**Böngészős ellenőrzésre vár** — `teszt.md` (j6).

---

## Síkidom nézet — a mag a HÁTRALÉVŐ TUDATPONTBÓL (2026-08-09)

Csaba felismerése: ha a lerakott síkidomokat fixen tartjuk, akkor **előre kell
tudni, mennyi hely kell a később érkezőknek** — és ezt meg lehet becsülni az
ágazati tudatpont mínusz a saját tudatpont alapján.

### Miért bukott meg a képernyőhöz kötött mag

A 2026-08-08-i változatban a mag képpontban állandó volt (120 px átmérő). Ez
adat-térben zsugorodik a nagyítással — **függetlenül attól, hány testvér van még
hátra**. Amikor a világ-szinten minden gyökér letöltődött, a `vanMegNemJelenitett`
hamis lett, és a `magSugar` **0**-ra esett: onnantól a pakoló a pót-horgonyokhoz
fordult, azok pedig a LEGKÜLSŐ körök. A böngészőben ebből kifelé fűződő „kígyó"
lett (`helybenMaradt: 361, ujonnan: 36, magSugar: 0`).

Volt egy második ütközés is: a mag 60 px sugarú, tehát egy ×1,2-es nagyítás-lépés
csak `60 × 0,2 = 12 px` széles gyűrűt nyit — a láthatósághoz viszont 24 px átmérő
kell. **A két feltétel sosem jött össze**, és a pakoló nem várt, hanem kifelé rakott.

### Az új szabály

```
c = √( T_hátra / (20 · P_szülő · σ) )        — `_magSugar`
```

- `T_hátra` = azok együttes pontja, akiknek **még nincs helyük** — a le sem
  töltötteket is beleértve. Forrás: `osszesGyerekPont` (a backend adja) mínusz a
  már helyet kapottak pontja (`helyezettPont`).
- A **láthatóság (MIN_KEP_ATMERO) mostantól CSAK a rajzolást vezérli**, a lerakást
  nem. A helyet a mag tartja fenn.
- A kapacitás-vágásból visszatérő síkidom a **megjegyzett helyére** kerül vissza
  (`hely: {x, y}` a várólista-elemen), nem újként a mag peremére.

### A mérésből jött két buktató

1. **A `T_hátra` NEM a képernyőn látszókból számol.** Akit a kapacitás levett,
   annak VAN helye — ha őt is a hátralévők közé vesszük, a mag nem zsugorodik, és
   minden új síkidom a nagy mag peremére, KIFELÉ kerül. Mérve: a méret-tizedek
   átlagos középtávolsága fordítva állt (0,3042 … 0,2241). Javítás után monoton:
   **0,0222 → 0,2241**.
2. **A régi „monotónia" ellenőrzés vak volt:** csak a MÉRETEKET hasonlította
   körönként, a POZÍCIÓKAT nem. Mivel a letöltés amúgy is méret szerint csökkenő,
   mindig átment — akkor is, amikor az elrendezés rossz volt. Ez magyarázza,
   miért mutatott a próba tiszta képet, miközben a böngészőben szétesett.

### σ (MAG_SURUSEG) = 0,5

Egy teljes GYŰRŰ a felszabaduló hely π/4 ≈ 78,5%-át tölti ki, a vegyes méretekre
mért pakolási sűrűség 0,41–0,53. A 0,5-tel ~1,57-szer akkora magot tartunk fenn,
mint a szigorúan szükséges — Csaba kérése szerint „inkább maradjon üres belső rész,
mint hogy elfogyjon a belső tér". Hangolás: nagyobb σ = kisebb mag.

### Mérés

`sikidomPakolasProba.mjs`, mind a 8 állítás átmegy: 600 testvér (20-as és 5-ös
adagokban, σ = 0,5 és 0,35), 3000 testvér (50-es és 20-as adagokban). A legdrágább
lépés 4–5 ms. A kis adagok a lényegesek: azok kényszerítik a magot arra, hogy sok
körön át helyet tartson a még meg sem érkezett testvéreknek.

**Böngészős ellenőrzésre vár** — `teszt.md` (j6).

---

## Síkidom nézet — a lerakás és a megjelenítés szétválasztása (2026-08-09)

**Csaba tünete:** „ahogy közelítek, a belső mag a képernyőhöz képest folyamatosan
nő, és előbb-utóbb csak az üres magot látom."

### Az ok — egy ördögi kör

A mag a HÁTRALÉVŐ tudatpontból számol. A hátralévők közé viszont bekerültek azok
is, akiket a **kapacitás-vágás** nem engedett lerakni. Közelítéskor a síkidomok
képernyő-területe nő → a vágás egyre többet dob le → azok nem kapnak helyet →
bent maradnak a hátralévők között → **a mag tovább nő**. Minél jobban közelítettél,
annál kevesebb került le, és annál nagyobb lett az üres közép.

### ZSÁKUTCA (mérve): a mag képernyő-korlátja

Kézenfekvő javításnak tűnt, hogy a becslés csak felső korlát legyen, és a mag
képernyő-sugara ne léphessen túl egy határt (MAG_KEP_ARANY = 0,18). **Mind a négy
beállításban MEGFORDÍTOTTA a rendet:**

| beállítás | méret-tizedek átlagos középtávolsága (legkisebb → legnagyobb) |
|---|---|
| korlát nélkül | 0,0222 → 0,2241 ✅ |
| korláttal, 600/20 | 0,2618 → 0,2241 ❌ |
| korláttal, 600/5 | **0,6616 → 0,1460** ❌ |
| korláttal, 3000/20 | 0,4614 → 0,1261 ❌ |

Az ok: a korlát elveszi a tartalékot. Amint a mag lecsökken, a következő adag a
középpontot foglalja el, a rá következő, még kisebb adagnak befelé már nincs hely,
ezért kifelé szorul — és így tovább, körről körre. **Fix helyek mellett a tartalék
nem opcionális.**

### A MEGOLDÁS: a kapacitás csak a RAJZOLÁST korlátozza

A hely kiosztása néhány szám — nem kerül rajzolási időbe. Ezért:

- **minden letöltött testvér azonnal helyet kap** (nincs kapacitás-szűrés a
  lerakás útjában, és nincs visszadobás sem);
- a `T_hátra` már csak a **le nem töltötteket** jelenti;
- közelítéskor a tudatpont-küszöb süllyed → több töltődik le → mind helyet kap →
  **a mag magától zsugorodik.** A közelítés fogyasztja a magot, nem növeli;
- a rajzolást továbbra is a `MIN_KEP_ATMERO` és a `MAX_RAJZOLT` korlátozza, a
  letöltést pedig a `_kepernyoKapacitas` × `BETOLTESI_TARTALEK` fék.

Ezzel elesett a `_vedettIdk()` (a horgony védelme a vágástól) is: mivel a tárból
többé semmi nem törlődik, a horgony nem tud kiesni. A helyét kommentben jeleztük,
hogy ha valaha visszakerül törlő lépés, vissza kell hozni.

### Mérés

Mind a 8 állítás átmegy, négy beállításban — és a méret-tizedek átlagos
középtávolsága végig szigorúan monoton:

| beállítás | tizedek (legkisebb → legnagyobb) |
|---|---|
| 600 / 20-as adag | 0,0222 → 0,2241 |
| 600 / 5-ös adag | 0,0198 → 0,1927 |
| 3000 / 50-es adag | 0,0159 → 0,1668 |
| 3000 / 20-as adag | 0,0150 → 0,1519 |

**Böngészős ellenőrzésre vár** — `teszt.md` (j6).

---

## Síkidom nézet — a mag a lerakandó adagot is fenntartotta (2026-08-09)

**A tünet:** hatalmas üres kör a kép közepén, körülötte gyűrű, és semmi nem tudta
betölteni. Csaba kérdése: „lehet, hogy a helyük megvan, de miért nem látszanak?"

### A mérés döntötte el

Beépítettünk egy `SikidomModal - ÁLLAPOT` naplósort, ami a zoom végén kiírja, mi
történik. A böngészőből:

```
csomopont: 'vilag' · lerakott: 150 · rajzolt: 24→32→49 · varolistan: 0 · hatraPont: 592
```

Ez kizárta a két kézenfekvő magyarázatot:
- `varolistan: 0` → **nem a lerakás akadt el**, minden letöltött testvér helyet kapott;
- a minimum átmérő sem a lerakást fogja vissza (csak a rajzolást: a 150-ből
  126 kisebb 24 px-nél, ezért nem látszik — de helyük VAN).

### Az ok

A `lerakott: 150` a megnyitáskori adag (küszöb nélkül kérünk, a 150-es plafonig).
Amikor ezt a 150-et lepakoltuk, a mag még **az összes 405 testvérre** volt méretezve,
mert a `T_hátra` a MOST lerakandó adagot is tartalmazta:

| | T_hátra | mag |
|---|---|---|
| lerakás ELŐTT | 17 235 (mindenki) | **3,92** |
| lerakás UTÁN | 592 (a maradék 255) | **0,73** |

A 150 síkidom tehát egy **5,4-szer nagyobb** mag köré került, mint kellett volna —
és mivel a lerakottak nem mozdulnak, ott is ragadt. A hely nem hiányzott: fölöslegesen
volt fenntartva.

### A javítás

```
T_hátra  =  összes  −  már helyet kapott  −  MOST lerakandó
```

Egy sor. Kis adagoknál a hiba elenyésző (ezért nem tűnt fel a mérőpróbán, ahol
5–20-as adagokkal mértünk), 150-esnél viszont uralja a képet.

### Új, 9. állítás: „A lyuk nem nagyobb az indokoltnál"

A 8. állítás a SORRENDET méri (kicsik belül) — ezt a hibát NEM fogta meg, mert a
sorrend végig helyes maradt, csak a lyuk lett túl nagy. A 9. a MÉRETET méri: a
tényleges középső üresség nem lehet nagyobb, mint amit a még hely nélküliek
indokolnak (plusz a legbelső kör körüli rés).

Visszapróbálva a régi képlettel **el is bukik**: mért 0,0420 · indokolt 0,0000 ·
felső határ 0,0045 — kilencszeres.

### Mérés

Mind a 9 állítás átmegy: 600 testvér 450-es, 150-es és 20-as adagokban; 3000
testvér 450-es és 50-es adagokban. A nagy adagok most már külön is mérve vannak —
épp azok hozták elő ezt a hibát.

**Böngészős ellenőrzésre vár** — `teszt.md` (j6).

---

## Síkidom nézet — mélyebbre töltünk, mint amit rajzolunk (2026-08-09)

**Csaba megfigyelése:** „addig szépen pakolja a síkidomokat a közép felé, ameddig
azok el nem érik a belső mag kerületét… utána már csak hátráltat." Javaslata: a
magot az első adag lerakása után vegyük ki.

### ELVETVE (mérve): a mag elvétele az első adag után

Megcsináltuk és lemértük. **Hat beállításból ötben megfordítja a rendet:**

| beállítás | méret-tizedek (legkisebb → legnagyobb) | |
|---|---|---|
| 600 / 450-es adag | 0,0126 → 0,1353 | ✅ |
| 600 / 150-es adag | 0,1914 → 0,1469 | ❌ |
| 600 / 20-as adag | 0,2932 → 0,1174 | ❌ |
| 3000 / 50-es adag | 0,3237 → 0,1524 | ❌ |
| 3000 / 20-as adag | 0,4064 → 0,1446 | ❌ |

Csak ott megy át, ahol gyakorlatilag EGYETLEN adagban érkezik minden — vagyis épp
ott, ahol nincs is „utána". Amint több adag jön, a második elfoglalja a
középpontot, a harmadiknak (még kisebbnek) már csak kifelé jut hely.

### Az igazi ok — és a megoldás

A megfigyelés helyes volt, csak az ok más: a mag nem „hátráltat", hanem **nem jön
senki, aki betöltse**. A letöltési küszöb ugyanis PONTOSAN egyenlő volt a
láthatósági küszöbbel — mindig csak azt hoztuk le, ami épp láthatóvá vált. A farok
közvetlenül a küszöb alatt várt, és csak további nagyításra jött; közben a
fenntartott mag a képernyőn nőtt.

**A javítás:** `BETOLTESI_MELYSEG = 4` — a letöltési küszöböt a láthatósági küszöb
negyedéből számoljuk. Mivel a küszöb a méret NÉGYZETÉVEL arányos, ez **16-szor**
több testvért enged be: a farok jóval a láthatóvá válás előtt megérkezik és helyet
kap, tehát a `T_hátra` (és vele a mag) magától lefogy.

Vagyis a magot nem elvesszük, hanem **feleslegessé tesszük**. A rajzolás küszöbe
változatlan (`MIN_KEP_ATMERO = 24`), és a letöltést továbbra is fékezi a
`BETOLTESI_TARTALEK` (a várólista területéhez mérve).

**Böngészős ellenőrzésre vár** — `teszt.md` (j6).

---

## Síkidom nézet — a mérőpróba vakfoltjai (2026-08-09)

A nézet átnézésekor kiderült: a mérőpróba **nem mérte azt, amit az utolsó két
commit megváltoztatott**. Ez a legfontosabb tanulság, mert épp az a szabályunk,
hogy mérünk, nem saccolunk — a műszer viszont vak volt.

### 1. A betöltés hiányzott a modellből

A próbában a testvérek körönként vak `ADAG`-onként érkeztek, függetlenül a
nagyítástól. A `MIN_KEP_ATMERO` deklarálva volt és a fejlécbe is kiíródott, de
SEHOL nem használtuk. Mérve: ugyanaz a futás 24-es és 4-es küszöbbel bitre azonos
eredményt adott.

Következmény: a `BETOLTESI_MELYSEG` bevezetése — az a javítás, aminek a folyton
növő üres magot kellett megszüntetnie — a próba számára láthatatlan volt. A „mind
a 9 állítás átmegy" igaz volt, de semmit nem mondott a javításról: akkor is
átment volna, ha az érték 1 vagy 100.

**Javítva:** a próba mostantól a nézet valódi szabályát futtatja — tudatpont-küszöb
(`_pontKuszob` tükre), területalapú fék (`BETOLTESI_TARTALEK`), és **láncolt
kérések** (a nézetben minden befejezett letöltés `finally` ága újraindítja a
feldolgozást, tehát egy zoom-lépésen belül több adag is jöhet).

### 2. Az 5. állítás mindig üresen ment át

A „lyuk képpontban állandó (cél ±20%)" két okból volt rossz:

- **Rossz elvárást mért.** A `MAG_CEL_ATMERO = 120` az elvetett, KÉPERNYŐHÖZ
  horgonyzott mag modelljéből maradt ott. A mai modellben a mag az adatból jön, és
  épp az a dolga, hogy ELFOGYJON — az állandóság nem elvárás, hanem hiba lenne.
- **Sosem futott le.** A `varolistan > 0` szűrő 2026-08-09 óta egyetlen lépést sem
  talál (a várólista minden körben kiürül, mert a kapacitás már nem korlátozza a
  lerakást), ezért „nincs mérhető lépés" indoklással mindig átment.

**Helyette:** „A lyuk közelítéskor nem szalad el" — Csaba valódi tünetének
(„ahogy közelítek, a belső mag folyamatosan nő, és előbb-utóbb csak az üres magot
látom") a fordítása. Határ: a képernyő kisebbik oldalának a fele. A növekedés
TRENDJE minden futásban kiíródik, de nem buktat — az nem hiba, csak korlát.

### 3. A próbában nincs horgonyváltás

A próba egyetlen szülőt nagyít a végtelenségig, a valódi nézet viszont lefelé lép,
amint egy gyerek átmérője eléri a képernyő kétszeresét. Enélkül a képpontban mért
lyuk értelmetlenné vált: kis adaggal **29 millió képpontos** „lyukat" mértünk egy
olyan szülőn, amit a nézet rég elhagyott. A mérés mostantól csak azokra a körökre
szól, ahol a horgony még érvényes.

### A MÉRÉS EREDMÉNYE — a `BETOLTESI_MELYSEG = 4` igazolva

| testvérek | mélység 1 (a javítás előtt) | mélység 4 (mai) | mélység 8 |
|---|---|---|---|
| 600 | ❌ 480 px (164 → 421, NŐ) | ✅ 119 px (97 → 94, fogy) | – |
| 3000 | ❌ 1053 px (171 → 1053, NŐ) | ✅ 267 px (118 → 189, nő) | ✅ 134 px |

A javítás tehát valóban működik, és most már **bizonyítva** is van, nem csak
levezetve. A legnagyobb lyuk jó közelítéssel fordítottan arányos a mélységgel.

**Ismert korlát:** 3000 testvérnél a mag mélység 4-gyel még nem fogy — 118-ról
267 px-ig nő, mielőtt elfogyna. A „magától lefogy" ígéret tehát ~600 testvérig
teljesül. Döntést igényel, hogy emeljük-e a mélységet (több hálózat, kisebb mag).

### Mellékesen kiderült

- **A kérés-plafon nem szabályoz.** 20-as és 450-es adaggal a lyuk azonos 119 px.
  A betöltés fékje a `BETOLTESI_TARTALEK` (terület), nem a darabszám.
- **Az állapot-napló rossz mértékegységgel számolt.** A `_magSugar` második
  paramétere tudatpont, a napló viszont képpontot adott át — mély nagyításnál
  `magRel: 0.0000`-t írt ki akkor is, amikor a mag nagy volt. Épp abban a
  kérdésben vezetett félre, amire való. Javítva (a várólista pontját adjuk át), és
  mostantól a MÉRT lyukat is kiírja a számolt mag mellett.
- **A memória-takarítás némán megszűnt.** A `_takaritas` ugyanazon a kapcsolón ült,
  mint a rajzolás-szűrés — Csaba döntése („ne tüntess el semmit, ami kilóg") a
  rajzolásra szólt, de az ágak elengedését is kikapcsolta. A tár azóta monoton nő.
  A kapcsoló szétválasztva (`AGAK_ELENGEDESE`), a viselkedés egyelőre változatlan.

---

## Síkidom nézet — bentről kifelé, egyszerre (2026-08-09)

**Csaba döntése:** „a befelé pakolás nem lesz jó, mert a kör átmérők között nagy
ugrások is lehetnek, és így a belső kör egyre szabálytalanabb lesz a kidudorodások
miatt. Szóval mindenképpen bentről kifelé pakoljunk, és egyszerre minél többet.
A láthatóság csak a minimum felett, de a pozíciók legyenek meg mélyebben is."

### A régi modell hibája — reprodukálva

A mérőpróba világ-szintű módjában, a VALÓDI 405 gyökeres adattal:

| modell | méret-tizedek (legkisebb → legnagyobb) | lyuk |
|---|---|---|
| mag + adagonként (régi) | 0,094 · 0,263 · 0,418 · **0,250** · 0,438 … 1,85 | ❌ 581 px |
| mag nélkül + adagonként | **2,59 · 2,46 · 2,32** · 2,58 · 2,42 · 2,49 · 1,06 · 0,42 · 0,77 · 1,68 | káosz |
| **mag nélkül + egyszerre** | **0,094 · 0,179 · 0,267 · 0,336 · 0,402 · 0,483 · 0,576 · 0,710 · 0,964 · 1,78** | ✅ nincs |

Az első sor Csaba képe. A középső a figyelmeztetés: **a mag kikapcsolása önmagában
ROSSZABB a réginél** — a legkisebbek kerülnek legkívülre. A kettő csak együtt jó.

### Amit a nézetben átírtunk

1. `URES_MAG = false` — nincs fenntartott hely.
2. `_ujrapakolas` MINDENT újrapakol (a már lerakottakat is), üres lapra, mag és
   környezet nélkül. A leszármazottakhoz nem kell nyúlni: ők a szülőjükhöz képest
   vannak tárolva, tehát a részfa vele mozog.
3. A lerakás CSAK a gyűjtés végén fut (`_lathatoLista`): amíg jön még anyag vagy
   letöltés fut, nem pakolunk.
4. Új `ELORETOLTES_DARAB = 10 000`: egy szülő alatt ennyi testvér HELYÉT számoljuk
   ki előre. Ez váltja a területalapú féket (`BETOLTESI_TARTALEK`), ami részleges
   pakolást engedett volna — épp azt, amitől a rend felborul.

### 5. A FÓKUSZ MINDENT KAP — enélkül az egész hiábavaló

Az első átíráskor bennmaradt a letöltési küszöb a gyűjtés feltételében. Emiatt
3000 testvérből az első körben csak **73** jött le (aki átlépte a láthatósági
küszöb negyedét), és a kép **10-szer rendeződött át** a benagyítás alatt — pontosan
az, amit el akartunk kerülni. Csaba észrevétele: „azt beszéltük, hogy 10000
síkidomig az egészet elhelyezzük, nem?"

A pozíció-számítás NEM függhet a láthatóságtól. Ezért a **horgony** — az a csomópont,
amibe épp belenagyítottál — küszöb nélkül kapja meg az `ELORETOLTES_DARAB` testvérét,
egyben. Mindenki más marad a küszöb-vezérelt betöltésnél.

**Miért nem kap mindenki mély előretöltést:** mert egyszerre sok csomópont látszik.
100 látható csomópont × 10 000 gyerek = egymillió sor — miközben egy 24 képpontos
síkidom gyerekei úgyis 5 képpont alatt maradnának, tehát láthatatlanok.

### A mérés (a próba `egyszerre` módja)

| adat | pakolás | átrendeződés | legdrágább lépés |
|---|---|---|---|
| 405 gyökér (világ-szint, valódi) | **1×** | **0 / 405** | 27 ms |
| 600 testvér (gyerek-szint) | **1×** | **0 / 600** | 21 ms |
| 3000 testvér (gyerek-szint) | **1×** | **0 / 3000** | 71 ms |

Minden beállításban monoton a méret-sorrend, nulla átfedés, nincs középső lyuk, és
**egyetlen síkidom sem mozdul** — az `ELORETOLTES_DARAB` korlátig egyszer pakolunk,
és kész.

### Amit elvben feladtunk

A „lerakott síkidom soha nem mozdul" ígéret elvben megszűnt: ha az `ELORETOLTES_DARAB`
korláton TÚL érkezik új, kisebb testvér, a kép átrendeződik. A mérés szerint 10 000-ig
ez egyszer sem fordul elő. Efölött az `ELORETOLTES_DARAB` emelése tolja ki a határt —
a pakolás nem korlát (128 000 síkidom 850 ms), a letöltés viszont igen.

### Sebesség-mérések a döntéshez

- **Kifelé pakolás:** 2 000 síkidom 15–20 ms · 10 000 kb. 70 ms · 128 000 kb.
  850 ms → **~145 000 síkidom/másodperc**, lineárisan, nulla átfedéssel. Extrém
  méret-ugrások NEM lassítanak.
- **Letöltés:** 12 600 testvér/s meleg dev adatbázison, HTTP és hálózat nélkül →
  3 másodperces megnyitási kerettel reálisan ~20 000 testvér. Egy adag kiszolgálása
  150-esével 19,6 ms, 300-asával 27,5 ms (elemenként 0,130 → **0,092 ms**), tehát a
  `KERES_PLAFON` 150 → 300 emelése olcsó nyereség, ha mélyen töltünk előre.

### Hátravan

A **méret szerinti visszaszedés** (Csaba, 2026-08-09): „mindenképpen sorrendben kell
visszaszedni azokat, amik már nincsenek képben — vagy darabszám-korláttal, vagy a
maximum terület alapján. Amik a külső részről tűnnek el, azoknak még a pozícióját
sem kell tárolni, mert a kifelé építkezés elég gyors. Nem kell halmozni."
A `_kepernyoKapacitas()` és a `BETOLTESI_TARTALEK` ehhez megmarad.

---

## ✅ Síkidom nézet — BÖNGÉSZŐBEN IGAZOLVA (2026-08-09)

Csaba visszajelzése a bentről kifelé pakoló, egyszerre lerakó modellre:
**„ez most jól működik."**

Ezzel lezárul a 2026-08-05 óta tartó sorozat. A fenti szakaszok mindegyike
„Böngészős ellenőrzésre vár — `teszt.md` (j6)" jelzéssel zárult; ezek az utolsó,
érvényes modellben (`URES_MAG = false` + egyszerre pakolás + fókusz-előretöltés)
együtt lettek ellenőrizve, és rendben vannak.

### A végleges modell három szabálya

1. **Bentről kifelé.** Nincs fenntartott mag; a legkisebb a középpontba kerül, és
   onnan épül kifelé. (Csaba érve: nagy átmérő-ugrásoknál a befelé pakolás belső
   pereme a kidudorodásoktól egyre szabálytalanabb lesz.)
2. **Egyszerre, nem adagonként.** A gyűjtés végén EGY pakolás rakja le a teljes
   készletet. Adagonként pakolva a rend felborul — mérve a legkisebbek kerülnek
   legkívülre.
3. **A fókusz küszöb nélkül kap mindent.** A horgony `ELORETOLTES_DARAB` (10 000)
   testvért kap egyben, a láthatósági küszöbtől függetlenül; a többi csomópont
   marad a küszöb-vezérelt betöltésnél.

Mérve: 405 · 600 · 3000 testvérnél egyaránt **1 pakolás, 0 elmozdulás**, monoton
méret-sorrend, nulla átfedés, nincs középső lyuk.

### Hátravan — a méret szerinti visszaszedés

Csaba (2026-08-09): „mindenképpen sorrendben kell visszaszedni azokat, amik már
nincsenek képben — vagy darabszám-korláttal (ekkor közelítéskor, ahogy előjönnek az
újabb síkidomok, úgy tűnnek el a régiek), vagy a maximum terület alapján tűnnek el.
Amik a külső részről tűnnek el, azoknak még a pozíciójukat sem kell tárolni, mert a
kifelé építkezés az íves elhelyezéssel elég gyors. Nem kell halmozni."

A `_kepernyoKapacitas()` és a `BETOLTESI_TARTALEK` ehhez maradt meg.

---

## Síkidom nézet — méret szerinti visszaszedés (2026-08-09)

**Csaba kérése:** „mindenképpen sorrendben kell visszaszedni azokat, amik már
nincsenek képben — vagy darabszám-korláttal, vagy a maximum terület alapján. Amik a
külső részről tűnnek el, azoknak még a pozíciójukat sem kell tárolni, mert a kifelé
építkezés az íves elhelyezéssel elég gyors. Nem kell halmozni."

### Amire épül: a pakoló ELŐTAG-STABIL

A pakoló növekvő méret szerint halad, és minden elem helye kizárólag a nála
KISEBBEKTŐL függ. Ezért a kanonikus sorrend (méret növekvő, holtversenynél
azonosító) egy ELŐTAGJA külön lepakolva **bitre ugyanazokat a helyeket** adja —
mérve 100, 500, 1000, 2000 és 2999 elemű előtagra, 3000-es készletből.

A sorrend VÉGÉRŐL tehát ingyen elengedhetünk, és visszanagyításkor pontosan
visszakapjuk a képet.

### ⚠️ Két szabály, mindkettő MÉRVE

Csaba felvetése: „előfordulhatnak egyforma méretűek is egymás mellett, úgyhogy arra
ügyeljünk, hogy sorrendbe szedjük őket vissza." A mérés igazolta, és élesebben:

| megtartott halmaz | elmozdul | legnagyobb elmozdulás |
|---|---|---|
| pontos előtag (kanonikus sorrend) | 0 / 1200 | **bitre azonos** ✅ |
| méret-küszöb szerinti vágás (csoport egészben) | 0 / 1332 | **bitre azonos** ✅ |
| holtverseny-csoport **félbevágva** | 83 / 1248 | **7,78** ❌ |
| **egyetlen** elem kihagyva a közepéből | **599 / 1199** | 0,099 ❌ |

1. **Csak összefüggő farok.** Egyetlen kivétel a sorrend közepén (például a horgony
   „megvédése") a maradék FELÉT új helyre viszi. A visszaszedés SOHA nem lehet
   elemenkénti döntés.
2. **Holtverseny-csoportot nem vágunk félbe.** 7,78-as elmozdulás = a legerősebb
   gyökér sugarának hétszerese, több képernyőnyi ugrás. A tiszta méret-küszöb ezt
   magától megoldja (az egyformák együtt lépik át), de a kód külön is védi.

Ez nem elméleti aggály: a mai teszt-adatban **10 405 gyökérből 9 910 egypontos**,
vagyis a holtverseny a tipikus eset, nem a kivétel.

### A megvalósítás

- `_visszaszedes()` — a HORGONY SZÜLŐJÉNÉL fut (ott vannak a túlnőtt testvérek).
  Kanonikus sorrendbe rendez, a végéről vág, a horgony alá nem megy, és
  holtverseny-csoportot nem vág félbe. Az elengedett testvér **részfája is
  eldobódik** (ott a valódi memória), az adata megmarad, a helye nem.
- `_visszahozatal()` — kicsinyítéskor a küszöb 80%-a alatt (hiszterézis) visszateszi
  őket a várólistára; onnan a szokásos teljes újrapakolás állítja vissza a helyüket.
- `VISSZASZEDES_ATMERO_ARANY = 4` (a képernyő kisebbik oldalának többszöröse; a
  horgonyváltás a kétszeresénél van, ezért kell ennél nagyobb),
  `MEGTARTOTT_DARAB = 4000`.

### Teszt-adat: `tools/sikidomTizezerGyokerTesztAdat.js`

10 000 gyökér-tartalom. Mivel 0 tudatpontos entitás nem létezik, ehhez legalább
10 000 tudatpont kell — a szerszám ezért annyi „töltő" e-embert hoz létre
(`tesztTolto1…`, jelszó `jelszo123`), amennyi a kerethez kell.

*Lefuttatva 2026-08-09-én: 10 000 tartalom 337 másodperc alatt, 0 hiba. A gyökér-
allokációk száma **10 405**, összpont 28 025, a legerősebb 2243, és **9 910
egypontos** (a keret szűk volt, ezért az eloszlás farka lapos).*

---

## Síkidom nézet — az üres mag mint LÁTHATÓSÁGI szabály (2026-08-09)

**Csaba tünete:** „a nagyítás gyorsabban történik, mint ahogy betöltenék az űrt az
előbukkanó síkidomok."

**Az ok:** a láthatóságot MÉRET döntötte el (24 képpontos minimum-átmérő). Mivel a
legkisebbek ülnek a közép körül, nagyításkor versenyfutás indult: a lyuk azonnal
tágult, a benne lévők viszont csak fokozatosan nőttek a küszöb fölé — és ezt a
versenyt a nagyítás nyerte.

**Csaba megoldása:** ne a méret döntsön, hanem a HELY. Van egy KÉPPONTBAN ÁLLANDÓ
üres mag a közép körül; ami azon kívülre esik, az látszik, mérettől függetlenül.
Mivel a mag képpontban nem változik, nagyításkor sem tágul — nincs miért futni.

**⚠️ Ez CSAK rajzolási szabály.** A helyek továbbra is egyben, előre, bentről kifelé
számolódnak; a pakoló mit sem tud a magról. Ezért nem hozza vissza a 2026-08-08-i
mag bajait (nem szorítja kifelé a később érkezőket, nem borítja fel a rendet).

### A szabály

- **Rejtés a KÖZÉPPONT alapján** (Csaba választása): a mag pereme szaggatott, a
  síkidomok félig belelógnak, az előbukkanás folyamatos.
- **Egy kikötéssel:** aki már NAGYOBB a magnál, az akkor is látszik, ha a közepén
  ül. Enélkül a legbelső síkidom — ami épp a középpontban van — sosem bukkanna elő,
  akármekkorára nő.
- **A mag mérete a képernyő arányában** (`MAG_ATMERO_ARANY = 0.12`), hogy telefonon
  és nagy monitoron is ugyanúgy nézzen ki. 800 képpont magas ablakon 96 px átmérő.
  **Ez a nézet fő hangoló száma.**
- **A részfa-metszés is innen jön:** a magban rejtett síkidom gyerekeit meg sem
  nézzük (nála is kisebbek, és rajta belül vannak).

### Egy tévedésem, mérve

Azt állítottam, hogy a mag peremén ülő síkidomok a nagyítással ZSUGORODNÁNAK (mert
befelé a méretek gyorsabban fogynak, mint a távolságok). **Ez téves volt** — a mérés
az ellenkezőjét mutatja:

| nagyítás | a mag peremén ülők átmérője | a magban rejtve |
|---|---|---|
| ×1 (illesztett) | 3,0 px | 955 |
| ×2 | 6,0 px | 241 |
| ×4 | 11,9 px | 61 |
| ×8 | (a perem üres) | 19 |
| ×32 | | 1 |

A síkidomok a mag peremén **nőnek**, pontosan a nagyítás arányában. Az ok: a 10 405
gyökérből 9 910 EGYPONTOS, vagyis a közép körüli teljes tartomány azonos méretű
síkidomok tömege — ott a méret nem függ a távolságtól. A korábbi számom a ritkább,
405 gyökeres adatból származó becslés volt. **Alsó vágásra tehát nincs szükség.**

### Ami ezzel járt

- `MIN_KEP_ATMERO` már NEM a láthatóság kapuja — mostantól kizárólag a LETÖLTÉST
  vezérli (`_pontKuszob`, nem-fókusz csomópontoknál).
- `MAX_RAJZOLT` 4000 → 30 000 (vészfék, nem napi korlát): az illesztett nézetben a
  11 143 síkidomból ~10 200 rajzolandó.
- **Olcsó rajzolási út** 5 képpont alatt: egyetlen kitöltött pont, forma, körvonal
  és halványodás nélkül. Ekkora méretben úgysem látszik a különbség, viszont
  ezekből van a legtöbb.
- A szaggatott magkört mostantól a SZABÁLY rajzolja ki (a fix mag), nem a mért
  üresség — amit az e-ember lát, pontosan az, ami a szabály.

---

## ✅ Síkidom nézet — böngészőben igazolva a 10 405 gyökéren (2026-08-09)

Csaba visszajelzése az üres-mag-alapú láthatóságra, a valódi 10 405 gyökeres
adaton: **„egész jó, nem akadozik túlságosan."**

Vagyis a ~10 200 egyszerre rajzolt síkidomot a vászon elbírja — de **enyhe akadozás
előfordul**. Ez a nézet egyetlen ismert, nyitott gyengéje.

### Ha a sebesség kell (a következő lépés, ha zavaróvá válik)

Az olcsó rajzolási út (5 képpont alatt kitöltött pont) már bent van. A következő
kézenfekvő lépés: a legapróbbakat **egyetlen `Path2D`-be gyűjteni** és egy húzásra
kirajzolni, szín szerint csoportosítva — így képkockánként néhány rajzoló-hívás
marad több ezer helyett. ELŐBB MÉRNI KELL, hol megy el az idő (böngésző-profil),
mert a `_lathatoLista` bejárása is jelölt: az is végigmegy ~10 000 csomóponton.


## Síkidom nézet — VÉGTELEN TESTVÉR: lapozás teljes újraépítéssel (2026-08-10, Csaba modellje)

A nézet eddig 10 000 testvérnél megállt (`ELORETOLTES_DARAB`). Ez a terv arról szól,
hogyan jelenítünk meg tetszőlegesen sokat.

### A kiindulás: két sorrend, egymással szemben

- **Letöltés:** csökkenő tudatpont — a legerősebb jön először (kurzoros lapozás,
  `kurzorPont` + `kurzorId`).
- **Pakolás:** növekvő méret — a legkisebb kerül középre, a legnagyobb legkívülre.

Ebből következik minden: **minél később érkezik egy testvér, annál kisebb, tehát
annál beljebb a helye.** A 10 001. testvérnek a KÖZÉPEN kell hely — ott, ahol már
ülnek a korábbiak.

### A modell: az egész újraépül (Csaba, 2026-08-10)

Amikor az e-ember a következő 10 000-et kéri, **az egész elrendezés újraszámolódik**,
immár a következő sorozat legkisebbjétől kezdve. De nem kell mind a 20 000-et
lerakni: csak a legkisebbtől nagyjából a 12 000-ig, mert a többi az adott
nagyításban már a **maximális méret fölött** van (`VISSZASZEDES_ATMERO_ARANY`).

**Miért ez a jó modell:**

1. **Nincs varrat.** A 2026-08-08-i mag azért lett szabálytalan („kidudorodások"),
   mert adagonként fűztük a peremére az újakat. Teljes újraépítésnél minden
   koppintás EGYETLEN tiszta pakolási futás.
2. **Az ablak a kanonikus sorrend ELŐTAGJA** (a legkisebbtől indul, a nagy végén
   vág) — pontosan az a forma, amire a két mért szabály ki van élezve: összefüggő
   farok, és a tiszta méretküszöb nem vágja félbe a holtverseny-csoportot.
3. **Nem kerül semmibe.** A pakolás mért sebessége ~145 000 síkidom/s → egy
   12 000-es újraépítés ~85 ms. Koppintásra észrevehetetlen.

### ❌ ELVETVE: a foglalásos mag (`_magSugar`)

A 2026-08-08-i mag a hátralévő tudatpontból méretezett:
`c = √(T_hátra / (20 · P_szülő · σ))`. **Csaba cáfolata (2026-08-10):** végtelen
testvérnél `T_hátra` sem korlátos, tehát a mag sem — vagyis épp abban az esetben
mond csődöt, amiért az egészet csináljuk. És a foglalás egyetlen célja a már
lerakottak védelme volt; teljes újraépítésnél nincs mit megvédeni.

→ A `_magSugar`, a `MAG_SURUSEG` és az `URES_MAG` **törlendő**, amint a böngészős
teszt megerősítette az új magot.

### ⚠️ KÉT KÜLÖN „üres mag" — soha ne keverd őket

- **Kijelző-mag** (`MAG_ATMERO_ARANY = 0.12`): a képernyőhöz fixált, állandó
  képpont-méretű kör. CSAK azt szabályozza, mi rajzolódik ki. Nagyításkor
  adat-térben zsugorodik — ezért bukkannak elő belőle a síkidomok.
- **Pakolási mag** (`PAKOLASI_MAG_ARANY = 6`): VALÓDI lyuk az adat-térben. Nem
  zsugorodik, tehát bármilyen mélységben üres marad. Ez ad helyet a feliratnak, és
  önmagában is jelzi, hogy van még. Mértékegysége a legkisebb testvér sugara.

### A felirat megjelenésének feltétele

**Amikor a kijelző-mag belezsugorodott a pakolási lyukba** — vagyis már egyetlen
lerakott síkidomot sem takar el. Ez pontosan Csaba megfogalmazása („a legbelső
lerakott is előbukkant"), csak nem kell nyilvántartani, melyik a legbelső.

A `PAKOLASI_MAG_ARANY` tehát azt szabja meg, milyen mélyre kell nagyítani, mielőtt
a nézet felajánlja a következő adagot.

### A nagyítás megőrzése (Csaba, 2026-08-10)

A kép ELUGORHAT a koppintáskor — ezt az e-ember maga váltotta ki, és az ÚJAKRA
kíváncsi, nem arra, hogy egy meglévőn maradjon a szeme. A horgony-igazítás tehát
NEM kell. Egyetlen kikötés: **ne vesszen el a mélység.**

A megoldás: a betöltés ELŐTT megjelöljük a legkisebb entitást (még a régi
lepakolásban), és a következő lepakolásnál **ugyanakkora legyen a területe**, mint
előtte. A helye változhat, a mérete nem — a szem ezt érzékeli mélységként.

**Vizuálisan is megjelöljük:** az a tartalom, ami eddig (majdnem) középen volt, most
valahol a gyűrűben lesz, ezért fontos, hogy az e-ember lássa, **hol maradt abba az
előző lepakolás**.

### A lépések

1. [x] **A mag mint jelzés** (2026-08-10) — `PAKOLASI_MAG_ARANY` + `_pakolasiMagSugar`
   + `_vanMegBetoltetlen`. Ha van még le nem töltött testvér → lyuk; ha nincs → nincs
   lyuk, és a legkisebb síkidom a középpontban, láthatóan. Böngésző nélkül mérve
   (9 állítás áll); böngészős teszt: [teszt.md](teszt.md), „a PAKOLÁSI MAG mint jelzés".
2. [x] **A feltétel** (2026-08-11) — `magbanRejtett === 0` (a kijelző-mag már EGYETLEN
   lerakott síkidomot sem takar) ÉS van még le nem töltött testvér → „további tartalmak"
   felirat a magban. CSAK A HORGONYON, hogy egy egyértelmű koppintási cél legyen.
   Új: `TOVABBI_FELIRAT_MIN_SUGAR`, `_feliratSzin()`. A felirat a MÉRT ürességhez
   (a pakolási lyukhoz) méretezi magát, nem a kijelző-maghoz.

   *Mérve (2026-08-11): asztalon (800 px kisebbik oldal) az illesztett nézet ×5-énél
   jelenik meg, telefonon (390 px) ×8-nál. A billenés nem pontosan ott van, ahol a
   lyuk eléri a kijelző-magot (×5,73), hanem hamarabb — mert aki már NAGYOBB a
   magnál, az akkor is látszik, ha a közepén ül. Ez a dokumentált kivétel, és épp
   ezt jelenti a „a legbelső is előbukkant".*

   **🔴 Böngészős találat és javítása (Csaba, 2026-08-11):** a felirat MEGJELENT, de
   tovább közelítve ELTŰNT. Az ok az én kötésem volt: az ajánlatot a KIJELZŐ-MAGHOZ
   kötöttem (méretben és a horgony-feltételen át is). A kijelző-mag képpontban
   állandó, tehát befelé nagyítva adat-térben zsugorodik, és egy ponton belecsúszik a
   pakolási lyukba; a horgony pedig eközben lejjebb lép, amitől a feltétel elbukott.
   → **Csaba szabálya: a képernyő-fix mag zsugorodása NE legyen hatással a szövegre
   és a koppintásra.** Javítás: (1) a horgony-feltétel KIVÉVE — így a feltétel
   MONOTON, ami egyszer megjelent, nem tűnhet el a további nagyítástól; (2) a
   felirat ÉS a szaggatott kör is a MÉRT ürességhez (`magSugarRel` → `uresSugarPx`)
   igazodik, nem a kijelző-maghoz. *Mérve: 400 lépéses nagyítás-söprés az illesztett
   nézettől a ×200-ig, asztalon és telefonon is — 0 visszaesés, mind a 6 állítás áll.*
3. [x] **A koppintás** (2026-08-11) — `_ajanlatKoppintas`: az ajánlat a síkidomok ELŐTT
   kapja a találatot (a szülő síkidoma elnyelné), a célja a PAKOLÁSI LYUK
   (`uresSugarPx`), nem a kijelző-mag. Csomópontonkénti `betoltesiPlafon` +
   `tovabbiKert`: **egy koppintás = egy adag**, a kurzor onnan folytatja, ahol
   abbahagyta. A mélységet a megjelölt legkisebb entitás LÁTSZÓ SUGARÁNAK
   visszaállítása őrzi (`_jeloltHelyzet`), a vizuális jelölés egy tágabb szaggatott
   gyűrű (`_jeloltId`).

   **Két őrszem, amit menet közben tettem bele:** (1) a `tovabbiKert` lezárul, amint a
   kért adag megérkezett — enélkül a méret szerinti visszaszedés a plafon alá vihetné
   a darabszámot, és a nézet magától lapozna tovább, pedig ez az e-ember döntése;
   (2) ha az e-ember a letöltés alatt MAGA nagyít, a mélység-visszaállítás kimarad —
   az ő szándéka az erősebb.

4. [x] **A korlát** (2026-08-11) — `MEGTARTOTT_DARAB` 4000 → 12 000, hogy az ablak
   tetejét a MÉRET vágja (`VISSZASZEDES_ATMERO_ARANY`), ne a darabszám. A darabszám
   így vészfék marad, nem napi korlát.

### ⚠️ A lapozás KÉTFÉLE arca (mérve, 2026-08-11)

A teljes kör lemérve (10 000 lerakva → jelölés → +10 000 → teljes újrapakolás),
kétféle pont-eloszláson. A megjelölt síkidom **mérete mindkettőben változatlan** —
a mélység tehát megmarad. A HELYE viszont nem:

| | változatos pontok | csupa egypontos (holtverseny) |
|---|---|---|
| az új adag mérete | kisebb | ugyanakkora |
| hová kerül | **középre** | **kívülre** |
| a megjelölt | 12,77×-ére tolódik kifelé | **meg sem mozdul** |

Mindkettő HELYES, és ugyanabból a szabályból jön: a pakolás növekvő méret szerint
halad, és az azonos méretűeknél az azonosító dönt — az új, ugyanakkora testvér tehát
nem kerülhet a régiek ELÉ a sorrendben.

**Gyakorlati következmény a teszteléshez:** a mai teszt-adatban 10 405 gyökérből
9 910 egypontos, tehát ott a koppintás után a kép közepén *látszólag nem történik
semmi* — az új adag a külső gyűrűbe kerül. Ez nem hiba. Változatos tudatpont-eloszlású
(valósághű) adaton az új adag középre érkezik, ahogy a modell mondja.


## Síkidom nézet — a HOLTVERSENY-DÖNTŐ megfordítása (2026-08-11, Csaba)

### A hiba, amit Csaba a böngészőben megtalált

A lapozás után a megjelölt síkidom a KÖZÉPPONTBAN maradt, pedig a modell szerint
kifelé kellett volna tolódnia, és az újaknak kellett volna középre kerülniük.

**A mérés (2026-08-11):** a megjelölt egyezmény a 10 005 egypontos allokáció közül
az **ELSŐ** az azonosító szerinti sorban. Az ok: MINDKÉT sorrend növekvő azonosítóval
döntötte el a holtversenyt —

- letöltés: `{ hierarchikusOsszesPont: -1, _id: 1 }`
- pakolás: `(a.sugar - b.sugar) || a.id.localeCompare(b.id)`

— ezért a **legkorábban letöltött lett a legbelső**, pontosan fordítva, mint amire a
nézet épül („ami később érkezik, az beljebb való"). Azonos méretű testvéreknél a
később érkezők így CSAK KIFELÉ kerülhettek, tehát a középen fenntartott lyukat soha
nem tudták kitölteni. A valódi adatban 10 405 gyökérből 10 005 egypontos — vagyis ez
nem elméleti eset, hanem gyakorlatilag az egész adathalmaz.

### Csaba szabálya

> „Holtversenyeknél a létrehozás dátuma legyen a döntő; amelyik a legfrissebb, az a
> »legkisebb«. Úgy, mint a Pakli esetében is, ahol az egyenlő testvéreket besorolja."

Ez illeszkedik a meglévő konvencióhoz: a Pakli (`testverRendezes.js`) pont csökkenő →
döntetlennél `letrehozva` NÖVEKVŐ szerint sorol, vagyis a sor VÉGÉN a legfrissebb áll.
A Síkidom nézet ugyanezt a sort nézi a másik végéről: ami a Pakliban utolsó, az itt a
legbelső.

### A megvalósítás

- **Backend** (`sikidomService.js`): a gyerek-végpont mostantól küldi az allokáció
  `letrehozva` mezőjét.
- **Pakoló** (`sikidomPakolas.js`): új, EXPORTÁLT `frissebbElol` és `pakolasiSorrend`.
  A kanonikus sorrend: méret növekvő → holtversenynél `letrehozva` CSÖKKENŐ (frissebb
  elöl) → végső döntő az azonosító, szintén csökkenő.
- **Modal** (`SikidomModal.js`): a `letrehozva` végigvezetve (várólista → csomópont →
  pakolandó sor), és MIND A NÉGY rendezés a közös `pakolasiSorrend`-ből dolgozik:
  a pakolás, a méret szerinti visszaszedés, a visszahozatal és a megjelölendő
  legkisebb kiválasztása. A LETÖLTÉSI sorrend ennek pontos tükörképe
  (`frissebbElol(b, a)`), hogy a legfrissebb érkezzen utoljára.

⚠️ **A négy rendezésnek EGY forrásból kell jönnie.** Épp az volt a hiba oka, hogy a
letöltés és a pakolás holtverseny-döntője külön-külön volt leírva, és egy irányba
mutatott — pedig egymás tükörképének kell lenniük.

*Mérve (2026-08-11): 20 000 azonos méretű testvérrel — a megjelölt kifelé tolódik, a
LEGFRISSEBB a középpontba kerül, a megjelölt mérete változatlan. Mind a 4 állítás áll.*

*Böngészőben igazolva (2026-08-11): a megjelölt azonosítója a javítás után a friss
tartományból való (`6a78f6b4…`, a korábbi `6a6c41d8…` helyett), a határjelölő gyűrű a
képernyő közepén, a mező üres közepe pedig elmozdult — az új adag foglalta el.*


## Síkidom nézet — az ADAG feleződése és két új próba-ág (2026-08-11, Csaba)

### Az adag: 10 000 → 5 000

`SikidomModal.ELORETOLTES_DARAB` 10 000 → **5 000**. A szám kettős szerepű: ez az
ELSŐ adag mérete ÉS a „további tartalmak" koppintásával kért következő adagé is
(a `betoltesiPlafon` növekménye). A feleződéssel tehát a megnyitás és minden egyes
lapozás is fürgébb — a 2026-08-09-i mérés szerint (~6 500 testvér/s internetes
sebességgel) egy adag másfél-két másodpercről nagyjából fél másodpercre esik.
Cserébe több lépés kell ugyanannak a mennyiségnek a bejárásához; ez a lapozás
lényege, nem mellékhatása.

A `MEGTARTOTT_DARAB` (12 000) **érintetlen**. Az vészfék, nem lépésköz — és most
még nagyobb a ráhagyása az adag fölött, tehát továbbra is a MÉRET vágja az ablakot
(`VISSZASZEDES_ATMERO_ARANY`), nem a darabszám.

### Két próba-ág, amit a gyökér-szintű adat nem tudott megadni

Új szerszám: `backend/tools/sikidomAgTesztAdat.js`. Mindkét ágat KÜLÖN gyökér alá
építi, a rendes service-en át, újrafuttathatóan. Részletes teszt-forgatókönyv:
[teszt.md](teszt.md), „Síkidom nézet — KÉT PRÓBA-ÁG teszt-adat".

**A) „Ötezres testvér-mező"** — 5 000 gyerek egy gyökér alatt, Zipf-eloszlású
ponttal (550 → 1, ~23-szoros sugár-különbség). Ez pótolja a mai adat hiányát: a
gyökér-szinten 10 405-ből 9 910 egypontos, csupa holtverseny, ezért ott az új adag
a külső gyűrűbe kerül és a kép közepén látszólag nem történik semmi (lásd fentebb,
„A lapozás KÉTFÉLE arca"). Szóró pontokon az új adagnak **középre** kell érkeznie.

**B) „Ötven szintű mély lánc"** — 50 szint, szintenként EGYETLEN gyerek, egyenként
1 tudatponttal. Ez a végtelen egymásba ágyazhatóság próbája: szintenként a terület
a huszadára esik, a sugár tehát √20 ≈ 4,47-szeresére nagyítandó — 50 szint alatt
nagyjából 10³²-szeres nagyítás.

⚠️ **Miért 1 pont minden láncszemnek.** A gyerek látszó mérete a SAJÁT és a SZÜLŐ
hierarchikus pontjának arányából jön, a szülőé pedig halmozott (tartalmazza a
leszármazottaiét). Egyenletes 1 pontnál a d-edik szint pontja (mélység − d + 1),
az arány pedig (n−1)/n — a lehető legközelebb az 1-hez, vagyis ez adja a LEGNAGYOBB
elérhető láncszemet. Több pontot adni a mélyebb szinteknek épp rontana: a fölöttük
lévő arányt nyomná le. Ugyanezért kapnak a próba-gyökerek is csak 1 saját pontot.

### 🔴 Közben talált hiba: az `osszesGyerekPont` minden nem-gyökér szülőn 0 volt

A két próba-ág API-s ellenőrzésekor derült ki (2026-08-11). A `sikidom/gyerekek`
végpont a `letrehozva`-t, a kurzort és magukat a gyerekeket helyesen adta, az
`osszesGyerekPont` viszont **0**-t — pedig az 5 000 gyerekes mezőnél 8 549-nek
kellett volna lennie.

**Az ok:** `hierarchikusTudatpontAllokaciRepository.gyerekekOsszPontja` **aggregációt**
használ, és az `aggregate()` — a `find()`-dal ellentétben — **nem kasztol a séma
alapján**. A `$match: { szuloId: "6a7acc…" }` tehát szó szerint hasonlít, egy
szöveges azonosítóra pedig soha nem talál sort. Mérve, ugyanazon az adaton:

```
string-ként:   []
ObjectId-ként: [{ ossz: 50 }]
```

A végpont a query-paraméterből kapja az azonosítót, tehát **stringként** — így ez
MINDEN nem-gyökér szülőn elsült. A gyökér szinten viszont a szűrő `null`, nincs mit
kasztolni: ott végig helyes volt. Ezért maradt eddig rejtve — a Síkidom nézetet
végig a gyökér-szinten mértük.

**Mit rontott el.** Nem azt, amire először gondoltam — a `_vanMegBetoltetlen` a
0-t szándékosan „nem tudni, tehát lehet még" értelemben veszi
(`osszesGyerekPont === 0 || betoltott < osszes`). Az ajánlat tehát nem tűnt el;
a nézet csak elvesztette az egyetlen VALÓDI adatát arról, mennyi van hátra, és
egy tartalék-ágra esett vissza. Három következménye volt:

1. **A takarékossági fék kimaradt.** A kliens az `osszesKell=0`-t csak akkor küldi,
   ha már ismeri az összeget (`if (szulo.osszesGyerekPont > 0)`). Mivel az örökre
   0 maradt, **minden egyes kérés újra végigolvasta a szülő ÖSSZES gyerekét** egy
   aggregációval. Pont az a csapda, amitől a kód kommentje óv: „egy milliós ágnál
   kérésenként végigolvasná az egészet". Egy 5 000 gyerekes szülő 150-esével kérve
   ~34 kérés — 34 teljes végigolvasás ugyanazért az egy számért.
2. **Kamu lyuk a nem-fókusz szülőkben.** A `mindenLetoltve` csak nulla küszöbnél
   áll be (`pontKuszob <= 0`), amit egyedül a FÓKUSZ csomópont kap meg. Egy
   nem-fókusz szülő tehát a 0-s tartalék-ágon maradt: **lyukat mutatott akkor is,
   ha már minden gyereke le volt töltve.**
3. A diagnosztikai kiírás (`hatra = osszes − helyezett`) végig 0-t mutatott.

A FÓKUSZ csomópontban a lapozás emiatt véletlenül helyesen viselkedett (a
`mindenLetoltve` elfedte a hibát) — ezért nem bukott ki a korábbi böngészős
próbákon.

**Javítás:** kézi `Types.ObjectId` átalakítás a `$match` előtt, ugyanúgy, ahogy a
`melyikSzulonekVanGyereke` már csinálta.

*Mérve a javítás után (2026-08-11): mező 8 549 · lánc 50 · gyökér-szint 36 626 —
mindhárom egyezik az adatbázissal.*

⚠️ **Tanulság a jövőre:** `aggregate()`-ben MINDEN azonosítót kézzel kell ObjectId-dá
alakítani. A hiba némán 0-t ad vissza, nem dob — és egy 0 pont tökéletesen
életszerűen néz ki.
