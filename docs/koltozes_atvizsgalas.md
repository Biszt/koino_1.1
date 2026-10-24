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
  `TANUSITAS_KELL` (3), `ALAP_KUSZOBOK` (az alapérték — az entitásonkénti medián ma is mozgatja).
- **(b) élő paraméter** (a születés az alapértéket adja, a közösség a mediánnal mozgatja — D57/b; a bekötés még nincs meg):
  `FELHATALMAZAS_KELL` (5).
- **(c) a modell része** (a számítás kódja, nem paraméter): `TAGSAG_KELL`, `JAVASLAT_MUVELETEK` / `ISMERT_MUVELETEK`, a
  döntés képlete — ezek változása **a számítás változása** (lent). ⭐ És a **meghívó-szám** (`MEGHIVO_KELL` = 1: hány
  különböző tag hívjon meg egy új embert, hogy tag legyen) — Csaba, 2026-10-24: *„igen, maradjon 1 egyelőre”*. Az
  `identitas.js` állandója ma holt (a `tagsag.js` egy meghívással és a legrövidebb lánccal számol), és a 11–12. mérés
  szerint a nagyobb szám árcédula, nem védelem; ha valaha mégis szabály lenne, az a tagsági lánc új számítása — költözés.
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
   érint. ✅ **①a a név (2026-10-24):** az új alakú születés koinó-mezője üres, a koinó neve a születés azonosítója
   (`esemeny.js` `esemenyKoinoja`, `koinoSzuleteseE`, `koinoSzuleteseListabol` — a születés EGY szabállyal az állapotban, a
   tagságban, a kapuban, a vonalon és a belépő térben; a kapu elveti a lenyomat-nevet mondó születést), a `KOINO_AZONOSITO`
   helyi becenév (`becenevek.json`), `koino` (új alakban; argumentum nélkül a név), `csatlakoz <név>`, a `behoz` egyértelmű
   fájlnál csatlakozik; a mappa a koinó neve. ✅ **①b a szabályok a születésben (2026-10-24, elágazás 194):** a 4.1 (a)
   csoportja és a (b) alapértéke a születés `szabalyok` mezőjében (`koinoSzabalyok.js`: `ALAP_SZABALYOK`, a határok,
   `szabalyokAlakiHibaja` — a kapu —, `koinoSzabalyai`, `teljesSzabalyok`); ⭐ a program az új születésbe MINDET kiírja
   (+206 B), így egy későbbi program alapértéke nem írhatja át — ⛔ az `ALAP_SZABALYOK` ezért soha nem változik (csak a régi
   alakú és a még meg nem érkezett születésre szól). A keret felső határa a mai 10 000 (a D106 kivétele erre van
   levezetve), tehát a születés nélkül a kapu a legengedékenyebb. A számítás mindenütt a koinó számával: a szabály-réteg
   (a keret mindkét vizsgálata, a kategória-korlát), a döntés (a küszöbök alapértéke, a lezárási pillanatkép és az
   összegzés ellenőrzése), az identitás (a tanúsítás-szám, a felhatalmazás alapértéke — a nézet a tárból: a koinó neve a
   születés azonosítója), a lánc-gyökér (a gyorsítótár a kerethez kötött), a lánc-ellenőrzés, az ellentmondás, az
   észlelő, a vállalás, a művelet, a pakli és a parancssor (`koino "<név>" … tudatpontKeret=500 elfogadasiKuszob=66`).
   ⛔ A meghívó-szám NEM szabály (Csaba: „maradjon 1 egyelőre” — a 4.1 (c)). ⭐ A 15. mérés megismételve
   (`eredmenyek.md` 15.): a régi alakú koinó a program-állandó átírásával kettéhasad, az új alakú nem — és a mérés egy
   hibát is talált (a keret második vizsgálata még az állandót nézte; javítva, próbával). ⚠️ A laptop–telefon
   próba-koinója (`sajat`) így nem folytatható (régi alakú események is vannak benne) — a következő kézi próbához új koinó
   kell, és a telefon frissítése.
2. ✅ **② A gyermek születése** (szülő, vágás, zártság) **és a kapu koinó-szabálya**, a csere két névvel egy szeletben
   (2026-10-24 — ②a és ②b, a 8. szakasz; elágazás 195–196).
3. ✅ **③ A két réteg a számításban** (a múlt az ős szabályaival; a talaj; a lezárt és a nyitott döntések) — 2026-10-24, a 9.
   szakasz; elágazás 197; 83. mérés.
4. ✅ **④ A ki- és a beköltözés** (a lánc megkötése, a kiosztás átvétele, a tagság és a 2. lépcső öröklése), a `koltozes`
   parancs és a kézi út — 2026-10-24, a 10. szakasz (④a–④c); elágazás 198–200; 82. mérés.
5. **⑤ A többi réteg bekötése** (vállalás, gyökér-darab, kereső-réteg, felderítés, értesítés, lánc-ellenőrzés).
6. **⑥ A felület** (a belépő tér családfája, „Költözés…” a fő menüben).

*Amit ez nem old meg:* a koinók egyesítését, a pénzt (csak a helyét), és a protokoll-törést (KZ5).

## 8. A ② építési alakja (2026-10-24)

A 4.2–4.3 és a 4.7 első pontja, a kódhoz igazítva. Két rész: **②a a gyermek születése** (és a születések lánca), **②b a
kapu koinó-szabálya** (az ős vágás előtti eseményei a gyermek tárában és cseréjében). A számítás még NEM veszi őket
figyelembe — az a ③ (a két réteg); a ②-ben a gyermek állapota ugyanaz, mintha szülő nélkül született volna, csak a
múltja már megérkezhet.

**②a — a gyermek születése.** ✅ *(2026-10-24, elágazás 195 — `koinoLanc.js`; a próbák a `koinoLancProba.js`-ben és a
parancssorban, 13 rontással.)*
- A születés új mezői: `szulo` (a szülő koinó neve) és `szuloTagsag` — **a létrehozó tagsági bizonyítéka a szülőben**
  (KZ2): a horgonya és a tagsági lánca a szülő eseményeiből (ugyanaz, amit a `TagsagiCsomag` visz), **a szülő születése
  nélkül** — arra a `szulo` mutat. ⭐ Így a születés mérete nem nő a nemzedékekkel (ha a szülő születése benne volna, az a
  sajátját is hozná: egymásba ágyazva minden ős — egyetlen esemény, ami a koinó történetével nő, a 9. szabályba ütközik).
- **A kapu** (`esemenyMentese`): a gyermek születése csak akkor kerül a tárba, ha a szülő születése már ott van, és a
  bizonyíték megáll — a lánc minden eseménye hiteles és a szülőé, a horgony a létrehozóé, és a szülő születésével együtt
  tagságot ad; ⛔ és a zárt szülő gyermeke csak zárt lehet (D118/5 — a 4.2 szerint a kapu elveti). Ha a szülő születése
  még nincs meg, az elutasítás nem végleges: a csere legközelebb újra hozza (a lánc a gyökértől jön, lent).
- **A születések lánca:** a gyermek születésétől a `szulo` mutatókon a gyökérig. A koinó születés-szelete
  (`KOINO_SZULETES_KULCS`, D96) mostantól a TELJES láncot hordozza, **a gyökértől** (így a fogadó kapuja a szülőt a
  gyermek előtt kapja); a fogadó a lánc születéseit akkor veszi be, ha a koinója láncán vannak (a láncot a kapott
  születésekből és a tárából együtt követi). A lánc a vállalás része (D90/2: a koinó születése mindenkié — a tömörítés
  sem viheti el), és a kézi út (`kivisz` / `behoz`) is viszi; egy fájl koinója a lánc legfiatalabb tagja.
- **A létrehozás:** `koino "<név>" … szulo=<a szülő neve vagy becenéve>` — a készülék, ami a szülőben tag; ⭐ a gyermek a
  szülő SZABÁLYAIT örökli (ami nincs megadva, az a szülőé, nem a mai érték — a költözés célja jellemzően egy szabály
  változtatása), és a szülő zártságát (zárt szülőnél a `nyilt` hibát ad). A gyermek tárába a szülő születés-lánca is
  bekerül.
- ⛔ **A vágás a gyermek születésének ideje** (`ido`, a létrehozó órája — 4.3). A létrehozó tagsági láncára nincs időfeltétel:
  a lánc eseményei a születésben vannak, tehát a születés előtt léteztek (oksági bizonyíték, óra nélkül).
- ⭐ **A gyermek születése a létrehozó szülőbeli LÁNCÁT folytatja** (az `elozo` a vágás előtti utolsó eseménye, a sorszám
  annak +1-e — 4.5: a lánc a vágásig közös). ⛔ Egy új, 1-es sorszámú lánc a szülőbeli 1-essel ütközne, amint a múlt a
  gyermekbe ér: a gyermekben elágazásnak látszana, és a létrehozó a saját becsületes láncát vádolná (építés közben vettem
  észre: az első változat véletlenül a szülő születését folytatta, mert az az ideiglenes tárban volt).
- ⚠️ **A ②b-re ebből egy szigorítás:** a létrehozó (és a ④-ben a költözők) szülőbeli eseményei a gyermekbe a **lánc-pont
  szerint** jönnek (a sorszám a pont alatt), nem az óra szerint — különben egy óra-csúszás a vágás utáni szülőbeli
  eseményét is beengedné, ugyanazzal a sorszámmal, mint a gyermekbeli folytatás (elágazás). Az óra a nem költözőké (4.3).

**②b — a kapu koinó-szabálya** (4.3). ✅ *(2026-10-24, elágazás 196 — `koinoLanc.js` `koinoNezete`, `koinohozTartozik`; a
próbák a `koinoLancProba.js`-ben és a parancssorban, 6 rontással.)* Egy esemény a gyermek tárába tartozik, ha a gyermeké; vagy a lánc egy ősének
születése; vagy egy ős eseménye a vágása előtt (`ido` ≤ annak a nemzedéknek a születése, amelyik tőle örökölt). Ez EGY
segéd (`koinohozTartozik`), és mindenütt ezt hívja, ahol ma a koinó nevére szűrünk a hálózat és a kézi út kapujában
(`beolvasztas`) és a szelet halmazában (`szeletEgyeztetes.js` — a csere két névvel egy szeletben); ⚠️ a halmaz szabálya
a kapuéval egyezik (különben két készülék minden cserében újraküldené, amit a másik elvet — a 40. mérés tanulsága). A
kiköltözés kivétele (a vágás utáni, mégis kell) a ④-gyel jön.
- ⭐ **A létrehozóé a lánc-pont szerint** (a sorszáma a gyermek születéséé alatt — a ②a-ból), mindenki másé az óra
  szerint; több nemzedéknél minden ős a saját vágásáig (a tőle örökölt nemzedék születéséig). A nézet a koinó nevéből
  következik (a lánc lenyomatokkal kötött): ha egyszer teljes, megmarad (`koinoNezete`).
- ⚠️ **Ami még a név szerint szűr** (a ⑤-ben jön): az átmeneti tár (a kérelmek válaszai — egy ős-esemény oda bekerülhet, de
  az újranyitáskor kiesik), a számítás (`koinoEsemenyei` — szándékosan, a ③-ig), a lánc-ellenőrzés, az észlelő és a
  tagsági kérdező (ezek a gyermek saját szerzőiről szólnak).

## 9. A ③ építési alakja — a két réteg a számításban (2026-10-24)

✅ *Megépült (2026-10-24, elágazás 197 — `ketReteg.js` `koinoKepe`, `koinoLanc.js` `jelenbenSzamit` / `lancKoltozoi`,
`javaslatSzamitas.js` `rogzitettek`; a parancssor, a pakli és a művelet ugyanazt hívja; a próbák a `ketRetegProba.js`-ben és a
parancssorban, 10 rontással; a 83. mérés).* Az építés két pontosítása: ⭐ **a létrehozó a születésével költözik** (a születés
az ő láncát folytatja, a lánc-pontja a születés sorszáma — a ③ így a parancssoron is mérhető); és ⭐ **a súlyt nemzedékenként
követjük** (aki a nagyszülőből a szülőbe költözött, de tovább nem, annak a nagyszülőbeli súlya az unokában nem él).

⚠️ **Amit a ③ nem old meg (a ④–⑤):** a többi költöző (a beköltözés eseménye, a hozott kiosztás — KZ3 — és a tagság öröklése:
ma a nem költöző tag is csak meghívással lesz tag a gyermekben); a vállalás a hozott entitásokra (a gyermekben „nem tartod”);
a lánc-gyökér és a lánc-ellenőrzés a költözött láncon (ha a létrehozó a szülőt is alapította, a lánca a gyermekben
hézagos — az ős születése nincs a jelen bemenetében —, ezért a bemondott összegét a szabály-réteg csak jelzéssel méri); az
átmeneti tár, az észlelő.

A 4.4 a kódhoz igazítva. A számítás ma három fázis (`allapotSzamitasa` → `javaslatokSzamitasa` →
`szerkesztesiEgyezmenyekAlkalmazasa`), és három helyen fut (a parancssor `kepetKeszit`-je, a pakli képe, egy művelet). A ③
ezt EGY függvénybe foglalja (a koinó képe), ami a koinó-szabály (②b) szerinti bemenetet két rétegre bontja:

- **A múlt rétege (a talaj):** nemzedékenként, a gyökértől lefelé — az ős vágás előtti eseményei, **az ős szabályaival**, a
  vágás pillanatára számolva (és az ős saját múltjával, rekurzívan). Ebből a gyermekbe a **lezárt döntések** kerülnek át,
  rögzítve (elfogadva / elvetve, az egyezménnyel — mindenki szavazatával, a szülő küszöbeivel; D118/3: nem fordulhatnak
  meg). ⚠️ A hiányos tudás ugyanaz, mint ma (D85 T3): ami nem ismert, az `nemIsmert`.
- **A jelen rétege:** a gyermek eseményei, és az ősökéből a **szerkezet** — a létrehozások (gondolat, kategória, javaslat
  mint entitás) — mindenkié; a **súly** (pont, szavazat, érték javaslat, állásfoglalás) az ősökéből CSAK a költözőké, a
  lánc-pontjukig (D118/1: súlyt csak a költöző hoz). A gyermek szabályaival; a D14 itt ítél (amire egyetlen költöző sem
  tett pontot, az a gyermekben nem él — a múltja attól még a tárban van, és egy pont visszahozza).
- **A végrehajtás:** a múlt rögzített és a jelen elfogadott egyezményei egy sorban (a lejárat szerint), ugyanazzal a kóddal
  — így az entitások a vágáskori alakjukat kapják, és a jelen változásai arra épülnek.
- **A költözők** a ③-ban paraméter (`koltozok`: szerző → lánc-pont; a létrehozóé a születéséből); a beköltözés eseménye,
  a hozott kiosztás (KZ3) és a tagság öröklése a ④ — ezért a ③ modul-próbákkal mérhető, a teljes út (parancssor) a ④-gyel.
- **Az ár (a 83. mérés helyett a 76. számai):** a múlt rétege egy állapot-számítás a múlt eseményein (~9 µs eseményenként,
  76. mérés); a múlt nem változik, csak bővül (a csere hozza a késve érkezőt) → a talaj gyorsítótárban, a múlt
  változata szerint. A 83. mérés a megépült kódon méri (a teljes képet nemzedékenként).

✅ **KZ6 (Csaba, 2026-10-24: *„elfogadom a javaslataidat”* — az (A)): a vágáskor NYITOTT javaslat, amit NEM költöző tett.** A javaslattétel ma is súly (a nem tag
javaslata nem számít — D93/1), és a D118/1 szerint súlyt csak a költöző hoz; a D118/4 szerint viszont „a nyitott
javaslatok a költözőkkel folytatódnak”. (A) ⭐ javaslat: **nem folytatódik** — a nyitott ügy azé, aki beadta; ha nem jött
át, a javaslata a szülőben dől el (ott a múlt része marad), és ha egy költöző fontosnak tartja, a gyermekben újra beadja
(egy esemény). Ez következik a D118/1-ből, és nem kell külön szabály. (B) folytatódik: a javaslat a vágáskori tagságával
számít, a költözők szavaznak róla — a gyermekben egy olyan ember javaslata dőlne el, aki ott nincs jelen (a D118/1 kivétele
kellene hozzá). A költözők nyitott javaslatai mindkét esetben folytatódnak, a szavazataikkal és a gyermek küszöbeivel.

## 10. A ④ építési alakja — a ki- és a beköltözés (2026-10-24)

✅ *④a megépült (2026-10-24, elágazás 198 — `koinoLanc.js` `bekoltozesEllenorzese`, `szuloTagsagaEllenorzese` (a születésé és a
beköltözésé egy szabály), `bekoltozesekEllenorzese` (a csomagban utazóké), `lancKoltozoi` a beköltözésekből, `jelenSzuro`;
`tagsag.js` a beköltözés mint tagsági horgony, `HORGONY_TIPUSOK`; a próbák a `koltozesProba.js`-ben, 12 rontással).* Két lelet
az építés közben: ⛔ ha a költöző maga is beköltözéssel került a szülőbe, a bizonyítékában egy szülőbeli beköltözés utazik — a
kapu ezt is a születésekkel ellenőrzi (rekurzívan, nemzedékenként), különben egy hamis szülőbeli beköltözés ingyen tagságot
adna; és ⭐ KZ3: a hozott pont-esemény a SZÜLŐ keretét és kiosztását mondta be — a gyermekben a számított összeg és a gyermek
kerete dönt (`pontEsemenyMerlege` `hozott`; a szabály-réteg és a művelet egy szabállyal), különben a kisebb keretbe semmi nem
férne be, akármennyit hagy el a költöző. ✅ *④b megépült (2026-10-24, elágazás 199 — `koltozes <gyermek> [elhagy=<az>,…]
[fájl]`, `muveletek.js` `kikoltozes` / `bekoltozes`, `koino.js` `hozottMult` — a létrehozóé és a beköltözőé egy segéd; két
készüléken mérve, 7 rontással; a 82. mérés).* ⭐ Az építés közben: **a létrehozó első kitöltése** is kell (a `koino … szulo=`
a láncát és a hozott szeletei múltját is a gyermekbe viszi — eddig a ③ próbája kézzel pótolta), és a létrehozó KZ3-a a
parancsban (ha a hozott pontjai nem férnek, hiba). ✅ *④c megépült (2026-10-24, elágazás 200 — `identitas.js`
`oroklesForrasa`, `szuloNezete`): a beköltözött (a horgonya a beköltözése) és a létrehozó (a horgonya a gyermek születése)
tanúsíthat-e és 2. lépcsős-e kérdése a SZÜLŐBEN folytatódik, a szülőbeli horgonyára, a szülő szabályaival (külön nézet) — a
gyermek tárában a szülő eseményei a kapu miatt vágás előttiek, tehát ez a vágáskori állapot; a gyermekben szerzett
tanúsítások ezen felül számítanak (a szúrópróba sétája is a szülőben folytatódik). ⛔ És a 4.2: a gyermek születése nem
alapító kör — se a létrehozó, se a születésben megnevezett alapító nem kap hatalmat a születéssel (eddig a gyermek
létrehozója „alapító kör” volt: tanúsíthatott és 2. lépcsős volt, akármi volt a szülőben). 4 rontással.* ⚠️ Ami marad: a
szúrópróba (D94) a szülőben a szülőbeli 2. lépcső-bemondásokat követi — ha azok nincsenek a gyermek tárában, a nagy
zárványú költöző „nem ellenőrizhető” (a kis zárvány teljes ellenőrzéssel megy). ⏭️ ⑤ a többi réteg.

A 4.5–4.6 a kódhoz igazítva, három részben: **④a az események** (a formájuk, a kapu, a költözők a képben, a tagság
öröklése), **④b a `koltozes` parancs** (a két aláírás, az első kitöltés, a kézi út — és a két készüléken mért út), **④c a 2.
lépcső öröklése**. Előtte, a formátum után a 82. mérés (a két esemény mérete, egy szelet örökölt múltja).

- **A kiköltözés** (`Kikoltozes`, a szülőben, a költöző azonosság-szeletébe — `entitas` a szülőbeli horgonya):
  `{ gyermek }`. A szülő ebből tudja, ki ment át (a családfa; később a pénz kivezetése — 4.8). A szülő jelene: a gyermek
  tárába nem kerül (a vágás után van).
- **A beköltözés** (`Bekoltozes`, a gyermekben; a saját szeletét nyitja — ez a költöző horgonya a gyermekben):
  `{ szulo, kikoltozes, lanc: { sorszam, azonosito }, szuloTagsag: { horgony, lanc }, elhagy: [entitás…] }`. ⭐ Ugyanaz az
  alak, mint a létrehozó születése: a költöző szülőbeli láncát FOLYTATJA a vágás előtti utolsó eseménye után (`elozo` =
  `lanc.azonosito`, a sorszám annak +1-e — a lánc a vágásig közös, utána két ág: a szülőben a jelene, a gyermekben a
  beköltözés). A késő költöző a vágás utáni szülőbeli tevékenységét így nem hozza (4.5). ⭐ A tagsági bizonyíték a szülőben
  ugyanaz, mint a születésé (a lánc a szülő születése nélkül).
- **A kapu:** a beköltözés csak a koinó születésével (a szülő neve egyezik) és a szülő születésével együtt — a bizonyíték
  hiteles, a szülőé, a horgony a beköltözőé, tagságot ad (a vágáskor: a lánc eseményei a vágás előtt), a lánc-pont alakja
  rendben (`elozo`, sorszám). ⛔ A tagsági csomagban utazó beköltözést a csomag ellenőrzése is így nézi — különben egy hamis
  beköltözés egy csomagba csomagolva ingyen tagságot adna.
- **A tagság öröklése (4.6, D118/3):** a kapun átjutott beköltözés a gyermekben tagsági horgony (mint az alapítóé): aki a
  vágáskor a szülő tagja volt és beköltözött, tag. A lánc-típusok közé kerül (a kísérők, a csomagok, a tömörítés viszik).
- **A költözők a képben:** a `lancKoltozoi` a létrehozó mellett a beköltözéseket is olvassa (nemzedékenként a bemenetből) —
  a lánc-pont a beköltözés sorszáma; az `elhagy` lista entitásaira a hozott pont nem jön (KZ3 (A): elhagyni lehet, növelni
  nem). A művelet bemondott összege ugyanígy (a saját beköltözésemből). A ③ próba-paramétere ezzel kiesik.
- ⚠️ **A létrehozó** a KZ3-at a szülőben oldja meg: ha a hozott pontjai nem férnek a gyermek keretébe, a `koino … szulo=`
  hibát ad (előbb a szülőben kell csökkentenie).
