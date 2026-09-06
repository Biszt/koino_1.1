# Jegyzetek — a zárójeles üzenetek naplója

Ebbe a fájlba kerül **szó szerint** minden olyan üzeneted, amit zárójelben írsz
(`[ ... ]` vagy `{ ... }`) — a munka közben felmerülő ötletek, kérések, amiket
NEM akarunk azonnal megcsinálni, de elveszíteni sem.

## Hogyan működik

- Amikor zárójeles jegyzetet írsz, **felveszem ide** (dátummal, szó szerint),
  röviden visszaigazolom, és **folytatjuk az aktuális feladatot**.
- A jegyzet nem azonnal elvégzendő feladat — csak feljegyzés a jövőre.
- Ha egy jegyzet a folyó munkát közvetlenül érinti, előbb rákérdezek.
- Ha egy jegyzetből valódi feladat lesz, átvezetjük a
  [fejlesztesi_terv.md](fejlesztesi_terv.md)-be, és itt lezárjuk (✅).

## Állapotjelek

- 🆕 új, még feldolgozatlan
- ✅ átvezetve a fejlesztési tervbe vagy elvégezve
- 💤 elvetve

---

## Napló

<!-- Az új jegyzetek FELÜLRE kerülnek. Formátum:

### ÉÉÉÉ-HH-NN
- 🆕 a jegyzet szövege szó szerint

-->

### 2026-09-04

- 🆕 „a »gondolat« szót, le szeretném cserélni, »gondolatra«, mindenhol (tudom hogy ez nagy
  munka, ezért most ne foglalkozz vele, csak írd be valamelyik dokumentumba)"
  → Kontextus: a Szakasz 4 (identitás) megbeszélése közben merült fel, ott, ahol a
  tanúsítás visszavonásáról volt szó — a tanú nem vonhat vissza, hanem **bizonytalanra
  jelölhet**, és **létrehozhat egy gondolatot**, amivel megosztja a felelősséget a
  közösséggel.
  ⚠️ **A méret miatt külön feladat.** A `gondolat` szó ma egyszerre: domain-fogalom
  (a platform alapegysége), entitástípus, adatosztály (`adat_osztalyozas.md`),
  Mongoose-modell és útvonal a prototípusban (`models/gondolat.js`, `/api/gondolatok`),
  frontend-komponens (`GondolatKartya.js`, `GondolatModal`), és megszámlálhatatlan
  dokumentum-hivatkozás. ⛔ **A prototípus be van fagyasztva** (nem nyúlunk hozzá), tehát
  az átnevezés a **Fázis 2-ben** végezhető el — legkésőbb a Szakasz 5-ben (a felület),
  amikor a domain-szótár úgyis a képernyőre kerül. Addig mindkét szó ugyanazt jelenti.
  → Felírva, **nem elvégezve**.

### 2026-07-22

- ✅ „még az is eszembe jutott, hogy az új gondolat létrehozása modalban, a kategória
  választó, legyen képes a legördülő menüben, jelezni, (mondjuk eltolással), hogy ha
  valamelyik, alkategóriája, a másiknak."
  → MEGVALÓSÍTVA (2026-07-22): a `GondolatModal` kategória-választó legördülője most
  fa-sorrendben, MÉLYSÉG szerinti behúzással jeleníti meg a kategóriákat (az alkategória
  a szülője alatt, nem törő szóközökkel + „└ " jellel). Új `_kategoriakFaSorrendbe()`
  segéd (DFS, árva-söprés, kör-védelem), a mélységet a teljes fából számolja.
  Átvezetve a fejlesztési tervbe (9. terv-pont).

### 2026-07-21

- ✅ „[A struktúra nézetnek, sem, frondend szűrés kéne, mert az nagy adatmennyiségnél, nem
  jó. több millio entitással kell tervezni.]"
  → Kontextus: a Rendezés nézet (15. terv-pont) ágazat-szűrésének tervezése közben
  merült fel. A Struktúra nézet (13/b) jelenleg FRONTEND-oldali ág-szűrést használ (a teljes
  fát letölti, a részfát a kliens vágja ki) — ez több millió entitásnál nem tartható.
  Cél: a Struktúra nézet ág-szűrését is BACKEND-oldalira cserélni, skálázható módon. A
  skálázhatóság általános elvárás minden nézetnél (több millió entitásra tervezünk).
  → **MEGVALÓSÍTVA (2026-07-23):** a Struktúra nézet ág-szűrése a Rendezés nézetnél már bevált,
  indexelt `osLanc`-infrastruktúrára került. A letöltő végpont (`GET /api/struktura`)
  mostantól kap `agEntitasId`-t, és ág-módban CSAK a részfát lapozza le
  (`{ 'osLanc.entitasId': agEntitasId }` szűrő + új `{ 'osLanc.entitasId':1, _id:1 }`
  index). A darabszám a szintenkénti BFS helyett egyetlen `countAg` (osLanc). A kliens
  többé nem tölti le a teljes fát egy ág megjelenítéséhez. A GLOBÁLIS teljes-struktúra nézet
  skálázása (millió csomópont egyszerre) KÜLÖN feladat — külön terv-pont (13/c).
  Átvezetve a fejlesztési tervbe (13/b + 13/c).

### 2026-07-11

- ✅ „[A saját tudatpont elnevezést, a kódban, eggyértelműsíteni e kell, hogya az
  entitasSajatTudatpont, és az eemberSajatTudatpontEntitason, meglehessen
  külömböztetni őket, eggyértelmüen]"
  → Kontextus: a fejléc-átalakítás során mindkét fogalom megjelenik a kártyán
  (az entitás saját összpontja ÉS a néző e-ember saját pontja az entitáson),
  ezért a jelenlegi kétértelmű `sajatTudatpont` mezőnevet érdemes egyértelműsíteni.
  → **Elvégezve (2026-07-12):** a kétértelműsítés már a fejléc-átalakítás (B1 lépés)
  során megtörtént, most ellenőrizve és lezárva. A kódban KIZÁRÓLAG a két
  egyértelmű név él: `entitasSajatTudatpont` (az entitás saját, közvetlen összpontja)
  és `eemberSajatTudatpontEntitason` (a néző e-ember saját pontja az entitáson);
  csupasz `sajatTudatpont` sehol nincs (`pakliService`, `Kartya._kozosTudatpontSorFeltoltese`,
  `ReszletekModal`). Nem volt szükség további átnevezésre.

- ✅ „[A legfelső sórnak, dinamikus betümérettel kéne megjelenítenie a szöveget,
  hogy a rövidebb cím nagyobb a hosszabb cím, bedig kisebb legyen. Ezt a karakter
  limit, és a hely fügvényében kell kitalálni.}"
  → Kontextus: a fejléc új felső sora (cím / név / javaslat-megnevezés) dinamikus
  betűmérettel jelenne meg — rövid szöveg nagyobb, hosszú kisebb, a karakterszám
  és a rendelkezésre álló hely függvényében.
  → **Elvégezve (2026-07-12):** kétlépcsős megoldás. (1) `init()`-ben gyors
  KARAKTERSZÁM-becslés (`Kartya._cimBetumeretBecsles`) – azonnali, villódzásmentes
  méret, mert a kártya még nincs a DOM-ban, így a tényleges szélesség nem mérhető.
  (2) A Pakli a kártya DOM-ba illesztése UTÁN (a `paklitRendel` `requestAnimationFrame`-jében)
  meghívja a `Kartya.cimBetumeretHozzaigazitasa()`-t, ami a cím-sáv VALÓDI szélességét
  méri és arányosan állítja a betűméretet (rövid → 24px, hosszú → arányosan kisebb,
  min. 8px, a maradékot a CSS ellipszise vágja). Így a „karakter limit ÉS a hely
  függvényében" is teljesül.
  → **Kiegészítés (2026-07-12, Csaba kérése):** a cím már NEM egy sorra zsugorodik,
  hanem LEGFELJEBB 3 SORBA tördel, és BALRA igazodik (nem középre). CSS: `-webkit-line-clamp: 3`
  + `overflow-wrap: anywhere` + `text-align: left`; a cím-sáv `justify-content: flex-start`.
  A méretezés a 3-soros helyhez arányosít (`MAX_SOR = 3`, kis `SOR_KIHASZNALTSAG` tartalékkal
  a ragadt sorvégek miatt); a méréskor ideiglenesen `inline-block` + `nowrap` a tiszta
  szövegszélességhez.
  → **Javítás (2026-07-12):** első próbára MÉGSEM tördelt, mert MIND az 5 per-kártya
  cím-osztály (`gondolat-kartya__cim`, `kategoria/gondolat-tipus __nev`, `javaslat/egyezmeny __tipus`)
  saját `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`-t tartalmazott
  (a régi egysoros dizájn maradványa), ami felülírta a tördelést. Megoldás: a közös
  `kartya.css` cím-szabály explicit `white-space: normal`-t állít (magasabb specificitás →
  győz), és kitakarítottam az elavult egysoros tulajdonságokat mind az 5 per-kártya CSS-ből
  (a `flex: 1` és `min-width: 0` maradt a szélességhez/tördeléshez). Csaba megfigyelése
  alapján a min. betűméretnél 3 sor is elfér.
  → **Megszorítás (2026-07-12, Csaba kérése):** a DINAMIKUS méretezés CSAK a Gondolat
  kártya címére vonatkozik; a többi kártyatípus (Kategória/Gondolattípus/Javaslat/Egyezmény)
  címe FIX 16px. Megvalósítás: base `Kartya._cimDinamikusMeretu()` → `false`, a
  `GondolatKartya` felülírja `true`-ra; az `init()`-beli becslés és a
  `cimBetumeretHozzaigazitasa()` csak akkor fut. A CSS közös cím-szabály 16px-e a fix méret.
  (A max. 3 soros tördelés + balra igazítás MINDEN kártyán marad, csak a méretezés Gondolat-only.)

### 2026-07-10

- ✅ „[javaslat, létrhozásakkor, ne legyen, minimum karakter követelmény, sőt
  nem is, kell, hogy kötelező legyen, az indoklás.]"
  → **Elvégezve (2026-07-10):** az indoklás opcionális lett. Eltávolítva a
  kötelezőség a frontend `JavaslatModal._validalas`-ból (≥10 karakter),
  a `javaslatService`-ből (throw), a `javaslat` modellből (`required:false` +
  pre-hook check törölve); a template `*` helyett „(opcionális)".
  → **VISSZAVONVA (2026-07-14, Csaba kérése):** az indoklás ismét KÖTELEZŐ, de
  MINIMUM karakterszám NÉLKÜL (nem lehet üres, de 1 karakter is elég). Ok: az
  `egyezmeny.indoklas` kötelező, így az opcionális javaslat-indoklás elfogadáskor
  egyezmény-hibát okozott. `javaslat` modell `required:true`; `javaslatService`
  `indoklasUres()` + dobás; `JavaslatModal._indoklasUres` + `_validalas`; template
  „(opcionális)" → „*". Curl-igazolt.

- ✅ „[szavazáskór a szavazat leadása, a servernek, ne a gombok
  megnyomásakkór, hanem a szavazási, modal rendben, gombjára kattíntva,
  tőrtényen meg.]"
  → **Elvégezve (2026-07-10):** a `SzavazatModal` halasztott véglegesítésű lett.
  A típus-gombok és a „Visszavonás" már CSAK helyben választanak
  (`kivalasztottTipus`); a tényleges szerverhívás (POST/DELETE) a „Rendben"
  gombra fut (`_megerosites`), a kiválasztás és az eredeti szavazat
  összevetésével, sikeres mentés után zárva. Bezárás mentés nélkül = nincs
  változás. Frontend-only.

- ✅ „[A szerkesztőben, link létrehozásakkor, a link blokk, nem tartja a
  szerkesztőben megadott méretét, a kártya body-jában. mindig nagyobb lessz a
  magassága]"
  → **Elvégezve (2026-07-10):** flexbox-csapda. A megjelenítő fő konténere
  `display: flex`, így a blokk-wrapperek flex-elemek, és a default
  `min-height: auto` felfújta a beállított magasságot a gondolat min-content
  méretére. Javítás: `szovegMezoMegjelenito.css`-ben a `.link-blokk-wrapper` és
  `.fajl-blokk-wrapper` `min-height: 0`. Frontend-only.

- ✅ „[a tátható/láthatatlan/takart státusz, teljes egészben, törőlhető, a
  gondolat létrhozása modalból is.]"
  → **Elvégezve (2026-07-10):** a gondolat `statusz` mezője (Lathato/Lathatatlan/
  Takart) teljesen eltávolítva. Backend: `gondolat` modell (mező + 2 index),
  `gondolatService` (create/update validáció, `gondolatLekerese` és
  `gondolatListazasa` láthatóság-szűrése – most minden gondolat látható),
  `gondolatRepository` (`findAll` + `findBySzuloId` szűrés/param), `gondolatController`
  (query-param), `tools/teszt.js`. Frontend: `gondolatModal.html` (legördülő),
  `GondolatModal.js` (kiolvasás/kitöltés), `JavaslatModal.js` (egyesítés
  `statusz:'Lathato'`). A **javaslat** statusz-a (Aktiv/…) érintetlen.

- 🆕 „[fejlécnek, mutatnia kéne majd az eember, saját tudatpontját is, az
  entitáson, ha van neki rajta]"
  → Kontextus: a pakli e-ember-tudatossá tétele kapcsán merült fel (a pakli
  ismerje a néző e-ember azonosítóját). Ez a fejléc-jelzés ennek egy későbbi
  felhasználása. Egyelőre feljegyezve, nem valósítjuk meg most.

### 2026-07-08 (visszavezetve az előző sessionből)

- ✅ „A jogosultságokat, már a menüben is jeleznünk kéne, úgy hogy lesznek
  menüpontok, amik csak akkor opciók a felhasználó számára, ha tudatpontjuk van
  az entitáson. (ha nem függ össze a mostani fejlesztéssel, akkor csak a
  fejlesztési tervbe rakjuk)"
  → **Átvezetve:** [fejlesztesi_terv.md](fejlesztesi_terv.md), a fejlesztési
  sorrend 10. pontja („Jogosultság-függő menüpontok").

- ✅ „Ami a modalok, és a menük stílusát illeti, az irányadók, a pl.
  gondolat(entitás) létrehozása modal, menübe, meg a fő menü, és a kártyák
  hamburger menüi. A javaslat típusok menüje, már eltér ettől, és a modaljai is."
  → **Átvezetve:** [fejlesztesi_terv.md](fejlesztesi_terv.md), a „Stílus-irányelvek"
  szakasz.
