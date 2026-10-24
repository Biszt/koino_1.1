# A KÖLTÖZÉS ÁTVIZSGÁLÁSA (D66, D118 — 2026-10-24)

> Csaba (2026-10-23): *„rendben. akkor legyen a kőltözés, de mielött elkezdjük beszéljük át, alapossan.”* Ez a lap az
> átbeszélés eredménye az építés előtt: mi a költözés, mi dőlt el (D118), mire épít a meglévő gépből, mit talált a
> felmérés (egy mért lelet — 3. szakasz), hogyan áll össze, mi maradt Csabánál (KZ1–KZ5), és milyen sorrendben épül.

## 1. A kérdés, és ami eldőlt

**A D66 (2026-09-12, Csaba):** *„nem kell program frissítés sem … a program megújulása viszont továbbra is fontos, csak nem
úgy kell rá gondolni, hogy felülírjuk azt, ahol a közösség van, hanem a közösséget és entitásaikat, meg mindent, ami fontos,
átmásolunk az új koino verzióba. És ezt nem automatikusan, hanem az e-ember utasítására.”*

**A költözés helye a kormányzásban** (Csaba kérdése: *„a költözés a forráskód-kormányzás, vagy csak annak a része?”*): a
[`kormanyzas.md`](kormanyzas.md) öt lépcsőjéből (javaslat · értékelés · döntés · bevezetés · sürgősségi út) a **negyedik**, a
bevezetés — ott eredetileg a D9 önfrissítése állt, ezt a D66 vetette el. ⭐ És a D66 óta a **súlypontja** is: elosztott
rendszerben senki nem kényszeríthet senkit az elfogadott kód futtatására, ezért a kódról szóló szavazás legfeljebb jelzés, a
valódi döntés az, hogy **ki költözik** (a D65 kérdésére is ez lett a válasz). A kormányzás így inkább választás, mint
határozat. Két irányban nem esik egybe a kettő: a költözés **tágabb** (ugyanez kell a szétváláshoz, egy változat
kipróbálásához és a „más paraméterekkel” induló koinóhoz — D13, D25), és **szűkebb** is (a kód változásainak többsége nem
kíván költözést — 4.1).

### ✅ D118 — Csaba: *„rendben, mind a hatot elfogadom, jöhet az átvizsgálás”* (2026-10-24)

1. **Az alapelv: a múlt közös, a jelenlét személyes.** Az új koinó nem másolat, hanem a szülőjére épül: a születése
   megnevezi a szülőt, és a vágás pillanata a saját születése. A szülő múltja (a vágásig) az új koinó múltja is, a régi
   aláírásokkal, átírás nélkül; az entitások a régi nevükön élnek. **Súlyt** (pont, szavazat, érték javaslat, állásfoglalás)
   csak az hoz, aki maga költözik. Amire senki nem hozott súlyt, azt a D14 elfelejti, a gyerekei felkerülnek; ami a vágás
   előtt lezárult, az múlt (a szülő szabályaival, mindenki szavazatával); ami nyitva volt, az jövő.
2. **A szabályok a koinó születésében**, nem a programban; és **a koinó neve a születése lenyomatából** jön.
3. **A tagság a vágáskor öröklődik** (a D25 kivétele: *„születéskor örökölhet, utána soha”*), de csak a költözőnek ad súlyt;
   utána csak az új koinó meghívásai számítanak. ⚠️ *A kérdés két része („és a tanúsítások is?”) közül a másodikat — amit
   Csaba a D25-nél nyitva hagyott — az „elfogadom mind” szerint IGEN-nek vettük: a 2. lépcső (tanúsítások, felhatalmazások)
   is a vágáskori állapotból öröklődik, ugyanígy. Ha nem így gondolta, ez az egy pont visszanyitandó.*
4. **A vágáskor nyitott javaslatok a költözőkkel folytatódnak** az új koinóban (a szavazatukkal, az új szabályokkal).
5. **A zártság öröklődik:** zárt szülőnek csak zárt gyermeke lehet (a nyílt szülő gyermeke lehet zárt).
6. **A költözés két esemény:** **kiköltözés** a szülőben (a saját azonosság-szeletemben: hova mentem) és **beköltözés** az
   újban (ez köti meg a láncomat, és megnevezi a kiköltözést); a kiköltözés már most, pénz nélkül is — ebből tudja meg a
   szülő, hogy született egy gyermeke, és itt lesz majd a pénz kivezetése (D66/6).

⏸️ **Elhalasztva (Csaba is):** a vágáskor lezárt döntések **lezárási összegzése** (D95/1 — a múlt ne az órán, hanem egy
fán álljon) — mérés után; a szerkezet helyet hagy neki (4.4).

## 2. Ami már megvan — és amire a költözés épít

- **Az esemény koinó-mezője** — az első aláírt mező (`esemeny.js`), és az azonosító a tartalom lenyomata: egy esemény
  sosem „vándorol át” egy másik koinóba (D66/2). ⭐ Ezért nem kell átírni semmit: a szülő eseménye a gyermekben is
  ugyanaz az esemény, ugyanazzal a névvel — csak a kapunak kell tudnia, mikor számít (4.3).
- **A lánc-gyökér** (D78, D81 — `lancGyoker.js`): minden esemény hozza a szerzője láncának napló-gyökerét és
  kiosztás-gyökerét. ⭐ A beköltözés ezzel köti meg egyetlen aláírással, mely eseményeimről van szó (4.5).
- **A tagsági csomag** (D93/2 — `tagsag.js`): a tag a legrövidebb láncát a saját szeletébe teszi — az örökölt tagság
  bizonyítéka az ősök szeletei nélkül (4.6).
- **A D14 és az árvák felkerülése** (`allapotSzamitas.js` `arvakFelkerulese`): amire senki nem hozott pontot, az eltűnik, a
  gyerekei a legközelebbi élő felmenőhöz kerülnek — a részleges költözés lyukaira **nem kell új szabály**.
- **A döntési csomag és a lezárási összegzés** (D85 T3, D95/1): mások aláírt eseményeinek másolata egy hordozóban („a
  teljességéért senki nem kezeskedik — egy teljesebb pótolja”), és egy döntés bemenete fában rögzítve — a mintái itt is.
- **A belépő tér** (5.6, `ter.js`) — a koinók családfájának helye (D25).
- **A kézi út** (`kivisz` / `behoz`) — a költözés fájlon át is megy (4. szabály).

## 3. ⛔ A LELET: a koinó neve ma nincs a születéséhez kötve (mérve, 2026-10-24)

A koinó neve ma **szabad szöveg** (`KOINO_AZONOSITO`, a próbákon `sajat`), és három hely háromféleképp választja ki „a”
koinó születését:
- az állapot (`allapotSzamitas.js`) a rendezett bemenetben az **utolsó** `KoinoLetrehozas`-t (a név, a zártság innen jön);
- a tagság (`tagsag.js` `tagsagiIndex`) az **elsőt** — az ő szerzője az alapító, a tagsági fa gyökere;
- a kapu (`koino.js` `koinoSzuletese`) a **saját tagsági láncomból** keresi.

**A próba** (a scratchpadban, két ideiglenes „készülékkel”, nyílt koinóban): A létrehoz egy koinót és egy gondolatot 100
ponttal; egy kívülálló C — tagság nélkül, egy olyan kulccsal, ami az A kulcsa elé rendeződik („EL…” az „aw…” előtt) —
aláír egy **második** `KoinoLetrehozas`-t ugyanazzal a koinó-névvel.
- **A kézi úton** (`behoz`): az A készüléken a koinó neve a hamisé lett, az A pontja „nem számít, amíg a szerzője tagsága
  nem ellenőrizhető (… köztük te — D93/1)”, és **a gondolata eltűnt** (D14). Közben az AZONOSSÁG rész továbbra is azt írta:
  „✔ tag — a koinó létrehozója” (a két út eltér).
- **A cserén** (`figyel` + `csere`): ugyanez — a kívülálló **egyetlen eseményt** küldött (a csere 8,2 KB volt), és az A2
  készüléken a valódi alapító pontja megszűnt számítani.
- ⭐ Ha a hamis szerző kulcsa **a valódi mögé** rendeződik („eE…”), a tagság megmarad, de a koinó neve akkor is a hamisé.

⛔ Vagyis ma **egy kívülálló egyetlen aláírt eseménnyel** az alapító — és mivel minden tag lánca hozzá vezet, **minden tag**
— döntéseit „nem ellenőrizhetővé” teheti minden készüléken, amihez az esemény eljut. ⚠️ Zárt koinóban nem mértük; a zárt
kapu korlátozott útja a nem tagtól is átveszi a `KoinoLetrehozas`-t (`vonal.js`, a megengedett szeletek), tehát ott is
valószínű. ⭐ **Élő koinó ma nincs** (a koino.hu a prototípus), a kockázat a laptop–telefon próba-koinója.

⭐ **A javítás a D118/2 maga:** ha a koinó neve a születésének lenyomata, egy második születés **másik koinó** — nincs mit
választani. Ezért ez az építés **első** lépése (7. szakasz), bekötés-próbával és rontással (a régi névválasztás visszahozza
a bukást).

## 4. A költözés alakja — a döntések kibontva

### 4.1 A koinó neve és a szabályok a születésben (D118/2)

**A név:** a `KoinoLetrehozas` a koinó-mezőben még nem nevezheti meg önmagát (a lenyomata a tartalmából jön), ezért a
születés koinó-mezője üres jel, és **a koinó neve a születés azonosítója**; minden további esemény ezt viszi. A `nev` mező
marad az emberi név. ⚠️ A `KOINO_AZONOSITO` a készüléken **helyi becenév** maradhat (a készülék tudja, melyik születéshez
tartozik) — a vonalon, a DHT-témákban és az eseményekben a lenyomat jár; a csatlakozó a koinó nevét a meghívással (vagy az
első cserével) kapja. *(A részlet az építésé; a próbák becenevei így nagyrészt maradhatnak.)*

**A szabályok:** az állapotot befolyásoló állandók a születés `szabalyok` mezőjébe kerülnek, a számítás onnan olvassa őket
(egy helyen), és a kapu ellenőrzi az értékek határait. Ha a mező hiányzik, a mai értékek érvényesek (a régi születések
ugyanazt számolják). Ettől:
- egy szabály-változás **nem programváltozás**, hanem egy új koinó születése ugyanazzal a programmal (a D25 első módja, a
  D13/b paraméter-pluralizmusa — a `javaslatSzamitas.js` megjegyzése már ezt ígéri: *„később koino-szintű PARAMÉTEREK
  lesznek”*);
- a szülő múltját **ugyanaz a kód** számolja, a szülő paramétereivel — a nemzedékekhez csak a születések lánca kell;
- a 15. mérés néma kettéhasadása (ugyanaz a név, más állandó) szerkezetileg megszűnik.

**A besorolás** (a mai állandók — ⏸️ KZ1):
- **(a) szabály a születésben** (csak új koinóval változik): `TUDATPONT_KERET` (10 000), `KATEGORIA_KORLAT` (3),
  `MEGHIVO_KELL` (1), `TANUSITAS_KELL` (3), `ALAP_KUSZOBOK` (az alapérték — az entitásonkénti medián ma is mozgatja).
- **(b) élő paraméter** (a születés az alapértéket adja, a közösség a mediánnal mozgatja — D57/b; a bekötés még nincs meg):
  `FELHATALMAZAS_KELL` (5).
- **(c) a modell része** (a számítás kódja, nem paraméter): `TAGSAG_KELL`, `JAVASLAT_MUVELETEK` / `ISMERT_MUVELETEK`, a
  döntés képlete — ezek változása **a számítás változása** (lent).
- **(d) méret-korlát** (D106: nem lehet szűkebb a koinó saját határánál, ezért nem paraméter): `MELYSEG_KORLAT` (256).
- **(e) helyi** (a készülék ellenőrzési mélysége vagy szokása, nem szabály — az eredményt becsületes esetben nem
  változtatja): `LEPCSO_KERET`, `SZUROPROBA_SETAK`, `LEZARASI_MINTA`, `MINTA_ALAP`, `MEGULEPEDES_BULIK`, `KIFUTAS`,
  `ONALLO_KUSZOB`.

**A változások négy fajtája:**
- **paraméter-változás** → új koinó, ugyanaz a program;
- **a számítás változása** → új koinó **és** új program, ami a szülő múltjához megtartja a régi számítást (változatként);
  ⚠️ ide tartozik minden hibajavítás is, ami egy számítás **eredményét** változtatja (⏸️ KZ4);
- **minden más** (a felület, a szállítás, az eredményt nem érintő javítás) → egyszerű programfrissítés;
- **protokoll-törés** → ugyanaz a koinó, de szabály kell rá, különben kettévágja a hálót (⏸️ KZ5).

### 4.2 A gyermek születése

- A `KoinoLetrehozas` új mezői: `szulo` (a szülő koinó neve — a szülő születésének lenyomata) és a `szabalyok`. **A vágás a
  gyermek születésének ideje.** Egy gyermeknek egy szülője van (koinók egyesítése nem cél); egy szülőnek több gyermeke is
  lehet, és egy e-ember több gyermekbe is költözhet (D13: „mindkét ágon létezik”).
- **A zártság öröklődik** (D118/5): zárt szülő gyermekének a születése csak zárt lehet — a kapu a nyíltat elveti.
- **Ki hozhat létre gyermeket?** — ⏸️ KZ2 (javaslat: aki a vágáskor a szülő tagja).
- ⭐ **Az alapító nem kap hatalmat:** a gyermek tagsága a szülőé (4.6) — a gyermek létrehozója maga is örökölt tag, nem a
  fa gyökere. *(A szülő alapítója marad a gyökér a múlt rétegében; a jelenben a fa a költözőkkel és az új meghívásokkal
  él.)*

### 4.3 A kapu koinó-szabálya (D118/1)

A kapu (`esemenyMentese`) ma nem nézi a koinót — az olvasás szűr (`koinoEsemenyei`). ⭐ A szabály a **kapuba** kerül, egy
helyre, mert mostantól érvényességi kérdés. Egy esemény akkor tartozik egy koinóba, ha:
- a koinóé; **vagy**
- egy ősé a születések láncában, és **a vágás előtti** (egy ős eseménye annak a nemzedéknek a születéséig számít, amelyik
  tőle örökölt); **vagy**
- egy költöző **kiköltözése**, amit a saját beköltözése megnevez (ez a vágás utáni, mégis kell — 4.5).

Minden más ős-esemény (a szülő vágás utáni jelene) kívül marad. ⚠️ **A vágást a szerzők órája jelöli ki** (globális óra
nincs) — ugyanakkora bizalom, mint amivel a szülő a saját lezárásait számolja (`javaslatSzamitas.js`: a lezárás a javaslat
`ido`-jából, a szavazat a saját `ido`-ja szerint). A költözőknél viszont óra nem kell (a beköltözés a lánc egy pontját
nevezi meg), a nem költözők tartalmánál a visszadátumozás ártalmatlan (súly nélkül a D14 elfelejti), a lezárt döntéseknél
pedig a szülő számítása dönt — egy visszadátumozott szavazat a szülőben is ugyanúgy fordítana. A szigorítás (az összegzés)
elhalasztva.

### 4.4 A két réteg a számításban

- **A múlt rétege** (a talaj): az ősök eseményei a vágásig, **az ős szabályaival** → az entitások alakja (a szerkesztési
  egyezmények hatálya), a vágás előtt lezárt döntések (mindenki szavazatával — nem fordulhatnak meg), és a vágáskori tagság
  és 2. lépcső. Rekurzív: a szülő múltja a nagyszülőre épül — a mélysége a nemzedékek száma, a terhe egy szeleten belül
  marad (⏸️ 6. szakasz, M2).
- **A jelen rétege:** a költözők súlya (az átvett láncuk + a gyermekben írt eseményeik) és az új tagok, **a gyermek
  szabályaival** — a pontok (a D14 itt ítél), a nyitott javaslatok folytatása (D118/4: a költözők szavazatával, a gyermek
  küszöbeivel), az új javaslatok, meghívások.
- ⭐ Ugyanaz a kód fut mindkét rétegben, más paraméterekkel. Csak a ritka **számítás-változásnál** kell az új programnak a
  régi számítást megtartania.

### 4.5 A ki- és a beköltözés (D118/6)

- **Kiköltözés** (`Kikoltozes`, a szülőben, a saját azonosság-szeletemben): `{ gyermek: <a gyermek neve> }`. Csak tagtól
  számít. ⭐ Ebből látja a szülő (és a belépő tér), hogy született egy gyermek, és ki ment át — a családfa (D25). A pontjaim
  a szülőben maradnak (a két koinóban külön keretem van); a pénznél majd itt lesz a kivezetés (4.8).
- **Beköltözés** (`Bekoltozes`, a gyermekben — a láncom első eseménye ott): `{ szulo, kikoltozes: <az>, lanc: { sorszam,
  azonosito, naplo } — a vágás előtti utolsó eseményem a szülőben és a láncom napló-gyökere ott; kiosztas: <gyökér> —
  amit hozok; tagsag: a vágáskori tagsági csomagom }`. Egyetlen aláírás, nem ezer.
- **Mi jön át a láncomból:** a pontjaim (a kiosztás), a szavazataim, az érték javaslataim, az állásfoglalásaim — a vágás
  előtti utolsó állapotuk. A beköltözés utáni kiosztás-gyökér **a hozott kiosztás**, így a D81 önbizonyító lánca a
  gyermekben is folytatódik. Ha a hozott pontok nem férnek a gyermek keretébe — ⏸️ KZ3.
- **A késő költöző** a vágás utáni szülőbeli tevékenységét nem hozza (az a szülő jelene); a nem költöző múltja ott van,
  súlya nincs — ha később költözik, ugyanígy, ugyanazzal a vágással.

### 4.6 A tagság és a 2. lépcső öröklése (D118/3)

A gyermekben **tag** az, aki (1) a vágáskor a szülő tagja volt (a szülő eseményeiből bizonyítható — a tagsági csomagja), és
(2) beköltözött; vagy (3) a gyermekben egy jelenlegi tag meghívta. ⭐ A lánc a nem költözőkön át is érvényes: ha a meghívóm
nem jött át, a meghívása attól még a múlt része. A 2. lépcső ugyanígy: a vágáskori tanúsítások és felhatalmazások, csak a
költözőnek; utána csak a gyermek eseményei. *(Ez a D25 kivétele — „születéskor örökölhet, utána soha” —, tehát a
tanúsítás-gyár rése nem nyílik vissza: a pillanatkép egyszeri.)*

### 4.7 A csere, a többi réteg és a kézi út

- **A csere** protokollja nem változik: két készülék a gyermekről beszél, a szelet halmazában ős-események is vannak, a
  fogadó a kapun dönt. A szelet halmazának szabálya (`szeletEgyeztetes.js`) a kapuéval egyezik.
- **Az első kitöltés:** a költöző készüléke a beköltözéskor a saját szeleteinek örökölt múltját a szülő tárából a gyermek
  tárába viszi, a kapun át (a terhe a vállalásával arányos); a később jövők a cserén kapják.
- **A többi réteg** a koinó nevével sózott (a DHT-témák, a gyökér-darab, a kereső-régió) — a gyermeknek sajátjai vannak; az
  örökölt entitásokat a gyermekben újra kell indexelni (a kereső-bejegyzés két jelenlegi tag-tulajdonossal — a
  költözőkkel). A vállalás, a felderítés, az értesítés, a lánc-ellenőrzés a költözött láncon — mind az ⑤ lépés.
- **A kézi út:** `koino "<név>" … szulo=<szülő>` (a gyermek születése) és `koltozes <gyermek> [fájl]` (a kiköltözés, a
  beköltözés és a szeleteim örökölt múltja — fájlba is), a másik oldalon `behoz`.

### 4.8 A pénz helye

A kiköltözés a kivezetés helye: a pénznél majd kimondja az összeget, a szülő szabálya szerint az onnantól ott nem
költhető, a beköltözés erre hivatkozva kapja meg az újban. ⛔ A D66/6 korlátja áll (a szülő programjának kell betartania).
Most csak a két fél szerkezete épül; a pénz mezői később hozzáadhatók, mert egyetlen meglévő eseményt sem érintenek.

## 5. A kérdések — ✅ eldőltek (Csaba, 2026-10-24: *„miden javaslatodat elfogadom, kezdheted az elsővel”* — mind a javaslat szerint)

- **KZ1 — a paraméterek besorolása** (4.1 (a)–(e)). Javaslat: ahogy fent; a (b)-nél a medián bekötése külön lépés.
- **KZ2 — ki hozhat létre gyermeket?** (A) aki a vágáskor a szülő tagja — ⭐ javaslat: ő ismeri a szülő múltját, és a
  családfát nem szemetelheti tele egy kívülálló; ha nem tag, a születése önálló új koinó, szülő nélkül. (B) bárki (D13:
  „bárki indíthat”) — az alapító úgysem kap hatalmat, de a belépő térben bárki „gyermeket” mutathatna bármely koinónak.
- **KZ3 — ha a hozott pontok nem férnek a gyermek keretébe** (kisebb `TUDATPONT_KERET`). (A) a beköltöző maga választ:
  elhagyni lehet, növelni nem, és a program felajánlja, mit hagyjon el — ⭐ javaslat („az e-ember utasítására”). (B)
  arányosan csökken — ehhez új számítás kellene, és nem az ő döntése. (C) a beköltözés érvénytelen, amíg nem fér.
- **KZ4 — a hibajavítás, ami egy számítás eredményét változtatja** (amilyen a 133. elágazás össz-pontos javítása volt).
  (A) mindig költözés — ⭐ javaslat: ez következik a D118/2-ből és a 9. szabályból (különben a régi és az új program
  ugyanabból más állapotot számol — a 15. mérés néma kettéhasadása); az ára, hogy egy élő koinóban minden ilyen javítás
  költözés — ezért a javításokat érdemes gyűjteni, és a költözés olcsó (egy aláírás fejenként). (B) programfrissítés,
  kimondott eltéréssel — amíg mindenki frissít, a koinó kettéhasadva számol. (C) a születés egy „számítás-változatot” is
  megnevez, amit a koinón belül lehet emelni — ez visszahozná a D9-et (ki emeli?), ezért nem javaslom.
- **KZ5 — a protokoll-törés szabálya.** Javaslat: nem a költözés része — a költözés után külön átvizsgálás (pl. az új
  program egy ideig a régi protokollt is beszéli).

## 6. Mérések — az építés előtt és közben

- **82. mérés — a költözés ára** (a formátum vázlata után, a ④ előtt): a két esemény mérete, egy szelet örökölt múltja a
  vonalon és a lemezen, a tagsági csomag; és a gyermek első cseréje.
- **83. mérés — a két réteg ára** (a ③ előtt): a múlt rétegének számítása szeletenként és nemzedékenként (a
  `kiszolgalasMeres.js` mintájára).
- **A 15. mérés megismétlése** (az ① után, `verzioMeres.js`): ugyanaz az esemény-halmaz, eltérő szabály → **két koinó**,
  nem kettéhasadás; rontás: az állandó vissza a programba.
- **A 3. szakasz lelete próbaként** (az ①-ben, bekötés-próba): a hamis születés a cserén → külön koinó, a valódi alapító
  pontja számít; rontás: a régi névválasztás.

## 7. A javasolt építési sor

1. **① A koinó neve a születés lenyomatából, a szabályok a születésben** — a 3. szakasz lelete ezzel zárul; minden koinót
   érint. 🚧 **①a a név (2026-10-24):** az új alakú születés koinó-mezője üres, a koinó neve a születés azonosítója
   (`esemeny.js` `esemenyKoinoja`, `koinoSzuleteseE`, `koinoSzuleteseListabol` — a születés EGY szabállyal az állapotban, a
   tagságban, a kapuban, a vonalon és a belépő térben; a kapu elveti a lenyomat-nevet mondó születést), a `KOINO_AZONOSITO`
   helyi becenév (`becenevek.json`), `koino` (új alakban; argumentum nélkül a név), `csatlakoz <név>`, a `behoz` egyértelmű
   fájlnál csatlakozik; a mappa a koinó neve. ⏭️ **①b a szabályok a születésben.** ⚠️ A laptop–telefon próba-koinója (`sajat`) így nem folytatható (régi alakú események is vannak benne) — a
   következő kézi próbához új koinó kell, és a telefon frissítése.
2. **② A gyermek születése** (szülő, vágás, zártság) **és a kapu koinó-szabálya**, a csere két névvel egy szeletben.
3. **③ A két réteg a számításban** (a múlt az ős szabályaival; a talaj; a lezárt és a nyitott döntések).
4. **④ A ki- és a beköltözés** (a lánc megkötése, a kiosztás átvétele, a tagság és a 2. lépcső öröklése), a `koltozes`
   parancs és a kézi út.
5. **⑤ A többi réteg bekötése** (vállalás, gyökér-darab, kereső-réteg, felderítés, értesítés, lánc-ellenőrzés).
6. **⑥ A felület** (a belépő tér családfája, „Költözés…” a fő menüben).

*Amit ez nem old meg:* a koinók egyesítését, a pénzt (csak a helyét), és a protokoll-törést (KZ5).
