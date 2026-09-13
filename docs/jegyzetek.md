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

### 2026-09-13

- 🆕 **Csaba:** *„az udp-és ablak szerintem, még máshól is jól fog jönni. arra gondolok,
  hogy a tagok, akár hívhatnák is egymást, mikor buli éppen buli van (ez másodlagos, de ha
  nem sokkal bonyolúltabb, akkor, az nagyon jó lenne)."*

  **Amit erről megállapítottunk (2026-09-13):**

  ⛔ **Az ablak a hívásnál NEM segít — sőt.** A fájl és a hang **ellentétes** dolgot kíván a
  vonaltól: a fájlnál minden bájtnak meg kell érkeznie (az idő mindegy), a hangnál viszont
  ami késik, az **halott** — azt el kell dobni, nem újraküldeni. *Az ablak + újraküldés a
  hívásnál kifejezetten káros lenne.* ⚠️ Az ablak kérdését tehát továbbra is a **fájlok**
  döntik el, nem a hívás.

  ⭐⭐ **De a hívás ötlete jó, és a nehezét már megcsináltuk.** Ami a világnak nehéz, az
  nálunk kész: a **pajzsfúrás** (a WebRTC pontosan ugyanezt csinálja) · a **randevú** ·
  a **kulcs-alapú személyazonosság** · és ⭐ a **jelzőcsatorna**, ami a legtöbb rendszernél
  központi szerver — *a WebRTC-hez ajánlatot és választ kell cserélni, és erre ott a buli:
  a koino saját maga a jelzőpont.*

  ⛔ **Ami hiányzik:** a Node-nak nincs mikrofonja/hangszórója, és a nyers hanghoz kodek
  kellene (~1,4 Mbit/s tömörítés nélkül) — ⚠️ npm-csomagot pedig a **6. szabály** kizár.

  ⭐ **Ezért a helye a BÖNGÉSZŐ:** ott mind a három megvan beépítve (mikrofon, Opus,
  WebRTC), és a `felulet` már ma böngésző-lap. ⚠️ A **7. szabály** ezt megengedi, de
  feltétellel: *a böngésző csak kliens lehet, sose előfeltétel* — egy hívás, ami csak
  böngészővel megy, rendben van, amíg a koino maga (események, döntések, fájlok) nélküle is
  teljes. **És az.**

  ⏸️ **Az őszinte becslés:** nem „nem sokkal bonyolultabb", de nem is a nulláról indul. A
  nehéz harmada (találkozás szolgáltató nélkül) megvan, a többi a böngészőből jön készen; a
  valódi munka a kettő **összekötése** — a bulin kicserélt ajánlat/válasz, és a lap, ami
  felveszi.

### 2026-09-11

- 🆕 „a »normál entitások« értékjavaslatai rendszerét, nem kell módosítani, hanem majd a
  jövőben, az igazán fontos, programot, vagy pénzt módosító, ügyek, kapnának alap
  értékjavaslatot(67% részvétel, 67% támogatottság) mindenkitől. ezek a program által megírt
  javaslatok lennének, amit e-ember indít, rak is rá tudatpontot. de most még nincs koforva
  a fejemben, a legjobb mególdás, csak ötletelek."
  → Kontextus: az alkotmány (D64) elhalasztása után, a „mitől lesz súlya egy ügynek" kérdés
  harmadik változataként. ⚠️ Claude előbb túl szélesre vette (az egész küszöb-rendszer
  átállítása), Csaba kijavította: **a hétköznapi entitás marad, ahogy van**.
  ⭐ **Amit ez összeköt:** ez ugyanaz a mechanizmus, mint a **D65** (program szintű szabály a
  közösség döntéséből) és a **globális passzív/aktív** ötlet — csak három oldalról nézve. A
  „program által megírt javaslat" egyszerre hoz **kötött mezőkészletet** (amit a számítás
  ellenőrizni tud) **és kötött döntési keretet** (67/67).
  ⭐⭐ **És entrenchment MENEKÜLŐÚTTAL:** a 67/67 nem beégetett állandó (amit csak programozó
  mozdíthat) és nem is új gépezet (mint az alkotmány) — a közösség el tudja mozdítani, de
  csak úgy, ha az emberek fele tényleg bead egy másik érték javaslatot. *A menekülőút
  pontosan olyan nehéz, mint amit véd.*
  ⛔ **Két éle, ami eldöntendő** (a [`koino/meres/eredmenyek.md`](../koino/meres/eredmenyek.md)
  14. szakaszában részletesen): **(1)** „mindenkitől" = a koino minden tagjától vagy az
  entitás tulajdonosaitól? **(2)** 67% RÉSZVÉTEL egymilliárdnál 670 millió szavazó — a
  „nehéz" és a „lehetetlen" két különböző terv; a válasz valószínűleg a saját globális
  passzív/aktív ötlete.
  ⚠️ Megmérve (14. mérés): **ma a koinóban sehol nincs olyan mechanizmus, hogy egy hallgató
  ember „tart" egy alapértéket** — az `ALAP_KUSZOBOK` csak tartalék. A szűk változat is
  ugyanazt a kódrészt kívánja (`kuszobokItt`), csak **javaslat-fajtára kapuzva**.
  → Felírva, **nem elvégezve**. *(Csaba: „csak ötletelek.")*

- 🆕 „(itt eszembe jutott valami. a globális döntéseknél, is lehetnének passzív/aktív
  e-emberek, annyi eltéréssel az entitás szinttütől, hogy itt az alap eset aktív és
  beállítás után passzív(akár témák szerint(pénzügy, program frissítés)))"
  → Kontextus: az alkotmány elhalasztásának lezárásakor merült fel, abban a mondatban,
  ahol a **program szintű szabályozásról** volt szó (D65): a kemény szabályt a teljes
  közösség döntése alapján kell a programba építeni — és akkor kell egy globális
  választókör is.
  ⭐ **Miért MÁS, mint az entitás-szintű passzív:** entitás szinten az számít bele a
  nevezőbe, aki **maga döntött úgy, hogy tudatpontot tesz rá** — a körbe lépés maga egy
  tett. Globálisan **nincs ilyen tett**: mindenki tag. Ezért fordul meg az alapértelmezés:
  alapból aktív, és a passzivitás **kimondás** (*„ez a téma ne rajtam múljon"*).
  ⚠️ **És egy feszültség, amit el kell dönteni, mielőtt kód lesz belőle:** a D64-ben az
  alkotmányról épp az ellenkezője áll — *„egy alkotmánynak akkor lesz súlya, ha a
  passzívak is beleszámolódnak"*, ott a hallgatás **NEM**-et jelent. Globálisan viszont a
  passzivitás **kilépés a nevezőből**. A kettő megfér egymás mellett, de **ki kell
  mondani, melyik hol érvényes** — különben két mérce lesz egy gépezetben.
  ⭐ **Egy javaslat hozzá, a koino meglévő gépezetéből:** a globális nevezőnél a néma
  készülék ugyanaz a probléma, mint a felszabadításnál — és ott **már megoldottuk**
  (`allapot.lancVegek`: aki évek óta nem írt alá semmit, arról nem állítunk semmit).
  Vagyis a globális nevező lehetne: *tag ÉS nem nyilvánította magát passzívvá ebben a
  témában ÉS a lánca él.* Nem hit, hanem a saját láncából olvasható.
  → Felírva, **nem elvégezve**.

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
