# koino — Fázis 2 fejlesztési terv (P2P)

*Létrehozva: 2026. 07. 16. — a vízió-vita ([vizio_kritikak.md](vizio_kritikak.md))
eredményeként. Élő dokumentum: a vitában meghozott döntések ide folynak át tervezési
döntésként, a nyitott kérdések itt válnak tervezési feladattá.*

## A két fázis

- **Fázis 1 — központi szerveres koino** (a jelenlegi koino_1.1: Node/Express/MongoDB,
  vanilla JS frontend). Célja: a döntéshozatali mechanika (tartalom → javaslat →
  szavazás → egyezmény; tudatpont; küszöbértékek; bizonyossági mutató) kifejlesztése és
  élesben bizonyítása az első közösséggel. Fejlesztését a
  [fejlesztesi_terv.md](fejlesztesi_terv.md) vezeti.
- **Fázis 2 — P2P koino**: elosztott, központi szereplő nélküli működés. A koino
  „különálló entitássá" válása — de a vita tanulsága szerint ez NEM „kész technológiák
  ráépítése", hanem a projekt legnehezebb szakasza, saját tervezéssel.

A Fázis 1 alatt a koino önképe: **hitelesített szándék-jelző** — ellenőrzött-ember,
egy-ember-egy-hang, átlátható folyamat; azt mutatja meg, „a részt vevők hitelesített
szándékát", nem „a társadalmi többség döntését". A közvetlen döntésbe-kötöttség
(pl. a saját forráskódjára hatás) a Fázis 2 kérdése.

---

## Összegzés — a vita döntései egy pillantásra (2026-07-17)

| # | Döntés | Egy mondatban |
|---|---|---|
| D1 | Identitás | Meghívásos bizalmi háló az alap + a közösség által felhatalmazott, auditálható, visszavonható meghívó-kibocsátók (kormány/eIDAS beilleszthető). |
| D2 | Szavazás | Titkos, de ellenőrizhető — kiváltságos adatkezelő nélkül; a nyílt szavazás elvetve; e-mail privát. |
| D3 | Tárolás | A tudatpont tárolási vállalás is; két adatosztály: tudatpont-replikált tartalmi réteg (elveszhet) + tartós mag (soha). |
| D4 | Küszöbök | Medián-alapú érték javaslatok + felelősség-elv; kötelező elem a küszöbváltozás-értesítés. |
| D5 | Lánc szerepe | Csak a tartós mag őrzése és szabály-érvényesítése; a védelem rétegzett, minden támadásnak saját gazdája. |
| D6 | Adatvédelem | A láncra személyes adat soha — csak kriptográfiai bizonyíték; a név a tartalmi rétegben él. |
| D7 | Konszenzus | Személy-alapú (egy ember = egy érvényesítő hang) — vállalt kutatási terep. |
| D8 | Egyezmény | A TÉNY a láncon örök; a HATÁLY a tartalmi rétegben elavulhat — a lánc a levéltár, a tartalmi réteg az élő jog. |
| D9 | Kód | Konszenzuális önfrissítés (egyezmény-vezérelt, időzáras, hash-ellenőrzött) + a visszautasítás/fork joga. *(A „vésznyílás" keret a D13-ban felülírva: normál üzemmód.)* |
| D10 | Pénz | Alkotmányos kibocsátási szabály + egyenlő osztalék minden e-embernél; hozam-ígéret nincs; vagyon ≠ hatalom. |
| D11 | Pénz-ütemezés | Pénz csak az identitás-réteg éles bizonyítása után (az osztalék a hamis regisztrációt pénznyomtatóvá tenné). |
| D12 | Kód-kormányzás | Három szint: a verzió-entitás a koinón BELÜL él (önalkalmazás, nincs regresszus), a koinók sokasága fölött pedig NINCS kormányzat — ott nincs mit eldönteni. A térkép nem kormányzat. |
| D13 | A koino mint eszköz | Bárki indíthat koinót; a fork normál üzemmód, nem vésznyílás; az egység az ADATBÁZIS. A skálázás nem opcionális — a legfőbb koino evolúciósan jön létre. |

További lezárt kérdések: EUDI = belépési kapu, nem üzemi függőség — a meghívó-rendszer
MELLÉ jön (~2027), nem helyette; nincs regisztrációs korhatár (16 alatt szülői lépés);
emberiség-lépték: megvalósítható szeletelt architektúrával (N11); a koino DAG-ja =
entitás- és e-ember-láncok hálója vékony globális horgonnyal (N8).
Az 1. fázisra háruló feladatok: [fejlesztesi_terv.md](fejlesztesi_terv.md) V1–V8.

---

## A vízió-vitában MEGHOZOTT tervezési döntések (a Fázis 2 alapjai)

*(Részletes érvelés és előzmények: [vizio_kritikak.md](vizio_kritikak.md), pontonként.)*

### D1. Identitás — meghívásos bizalmi háló + felhatalmazott kibocsátók (vita 1. pont)

- Új e-embert meglévő e-emberek tanúsítanak (csak azt: valódi személy, még nem
  regisztrált). Minta: Duniter/Ğ1 (több független tanúsító, meghívás-korlátok,
  bizalmi-gráf szabályok, visszavonhatóság).
- A közösség FELHATALMAZHAT kibocsátókat (embereket, szervezeteket, akár kormányokat),
  hogy meghívót adjanak pl. minden választójogosultnak — a kibocsátónál nem keletkezik
  többlet-adat; a kibocsátott meghívók száma nyilvános és auditálható; a felhatalmazás
  visszavonható. Az állami eIDAS-tárca később beilleszthető mint kibocsátó.
- ŐSZINTE KOMMUNIKÁCIÓ: a duplikátum-kizárás nem abszolút („a szabályok valószínűtlenné
  teszik", nem „a program ellenőrzi").

### D2. Szavazás — titkos, de ellenőrizhető, kiváltságos adatkezelő nélkül (vita 3. pont)

- A nyílt („kézfeltartásos") szavazás ELVETVE (kikényszeríthető szavazatvásárlás +
  önkiválasztási torzítás miatt).
- Cél: az EREDMÉNY hitelesíthető, az egyéni szavazat nem visszafejthető; senkinél nincs
  többlet-adat. Technológiai irány: zero-knowledge / homomorf titkosítás (kutatás-közeli
  — CÉLKÉNT kommunikálandó, nem kész képességként).
- Átmenet a Fázis 1-ben: a szavazat titkos a többi e-ember felől; az üzemeltető
  technikailag láthatja — ezt KIMONDJUK.
- A tudatpont nyilvános marad (a tároláshoz is kell), de PRIORITÁST fejez ki, nem
  véleményirányt — a nyilvános „mi fontos nekem" és a titkos „mit gondolok róla"
  elvi szinten szétválik.

### D3. Tárolás — a tudatpont tárolási vállalás is (vita 4. pont)

- Egy entitást a tudatpont-tulajdonosainak készülékei tárolnak; a tudatpont-rendszer
  elérési utat is ad az adathoz. Amihez senki nem rendel pontot → közösségi felejtés
  (a koino törli). Kevés tulajdonosú entitás elveszhet — vállalt működés.
- KÉT ADATOSZTÁLY:
  - **Tartalmi réteg** — tudatpont-replikált, elveszhet, közösségi felejtés.
  - **Tartós mag** — NEM veszhet el: regisztrációk (duplikátum-védelem), szavazási
    eredmények, EGYEZMÉNYEK (az egyezmény attól egyezmény, hogy kötelez). Mindig,
    mindenhol replikált — lényegében a blokklánc-szerű réteg. (Pontos tartalma és
    működése NYITOTT — lásd N1.)
- Törlés-szemantika P2P-ben: BEST-EFFORT — „nem szolgáljuk ki és nem replikáljuk tovább,
  a példányok elsorvadnak"; fizikai megsemmisülés nem ígérhető. Kimondva kommunikáljuk.

### D4. Küszöb-kormányzás — medián + felelősség-elv (vita 2. pont, ✅ lezárva)

- A küszöbértékeket a tudatpont-tulajdonosok érték javaslatainak MEDIÁNJA adja; a medián
  „matematikailag is szavazás" — csak létszámmal billenthető, szélsőértékkel nem.
- **Felelősség-elv:** amit a tulajdonosok nem védenek be érték javaslatokkal, azt a
  rendszer nem védi helyettük; a többség erejével egy entitás felülírható/lezárható —
  ez a közösségi moderáció, nem hiba.
- Természetes fékek: a beavatkozás tudatpontba kerül (véges keret + felmenő-szabály),
  nyilvános (felismerhető mintázat), és a minimum döntési idő reakció-ablak.
- **KÖTELEZŐ ELEM: küszöbváltozás-értesítés** — a tulajdonosok riasztást kapnak, ha az
  entitásuk érvényes küszöbei jelentősen változnak → a passzív többség „alvó
  immunrendszer". (Már a Fázis 1-ben megépítendő — lásd H1.)

### D5. A lánc hatóköre: CSAK a tartós mag (vita 5. pont, 2026-07-16)

- A blokklánc/DAG szerepe a koinoban: a tartós mag őrzése (megmásíthatatlanság) és
  szabály-érvényesítése (a csomópontok csak protokoll-szabályos bejegyzést fogadnak el,
  pl. „egy e-ember egy javaslatra egyszer szavaz") + bárki általi ellenőrizhetőség.
- A tartalmi réteget a tudatpont-replikáció viszi (D3) — annak NEM kell lánc.
- A „manipuláció ellen véd" állítás rétegzett védelemmé bontva: kamu emberek → D1;
  szavazat-kényszer → D2; múlt-átírás + szabálysértő bejegyzés → lánc; szabályok
  elfoglalása → N5; bot-áradat/napirend-tolás → D4 + moderáció; konszenzus-elfoglalás
  → D7/N8.

### D6. Személyes adat SOHA a láncra (vita 5. pont, 2026-07-16)

- A láncra csak kriptográfiai bizonyíték kerül (hash/kötelezettségvállalás), amiből az
  eredeti adat nem állítható vissza, de a birtokosa bizonyíthatja, hogy az övé.
- A név és minden személyes adat a tartalmi rétegben él, ahol a törlés/kilépés kezelhető.
- Ezzel a lánc-szintű GDPR-ütközés (megmásíthatatlanság ↔ törlési jog) megszűnt;
  a kilépés tervezése az N2-ben folytatódik.

### D7. Konszenzus-irány: személy-alapú konszenzus (vita 5. pont, 2026-07-16)

- Nem proof-of-work (számítási erő) és nem proof-of-stake (vagyon) — mindkettő
  pénz-arányos hatalom, a „mindenki egyenlő" elv tagadása.
- Cél: egy ember = egy érvényesítő hang a lánc szintjén is, a D1 identitás-rétegre
  építve. Vállaltan kutatási terep („az egész koino projekt kutatási terep" — Csaba).
- Kidolgozása: N8.

### D8. Egyezmény: TÉNY ↔ HATÁLY szétválasztása (vita 5. pont — Csaba megerősítette 2026-07-16)

- A TÉNY („az egyezmény akkor, ott, érvényesen megszületett") a láncon, örökre.
- A HATÁLY (érvényben van-e, mennyire él) a tartalmi rétegben, tudatpont-vezérelten:
  elavulhat, felülírhatja új egyezmény, elsorvadhat. Egy egyezmény lehet hatályát
  vesztett, de soha nem meg-nem-történt. A lánc a levéltár, a tartalmi réteg az élő jog.
- Feloldja: az egyezmény-elavulás (közösségi felejtés) ↔ tartós mag (nem veszhet el)
  feszültséget.
- Kivétel-jegyzet: a kassza-mozgató egyezmény végrehajtása a láncon KIKÉNYSZERÍTHETŐ
  (a pénz a láncon él) — az egyetlen automatizálható való-világ-kar; a forráskód-egyezmény
  TELJESÜLÉSE ellenőrizhető (elfogadott kód hash-e vs. futó kód); minden más való-világi
  teljesülést az emberek ellenőriznek.

---

## Nyitott tervezési kérdések (a Fázis 2 feladatlistája)

- **N1. A tartós mag megtervezése** — pontosan mi kerül bele (regisztrációk, eredmények,
  egyezmények, metaadatok köre — „ezt még ki kell találni", Csaba); hogyan replikálódik
  mindenhová; hogyan írható (konszenzus-mechanizmus). Kapcsolódik: vita 4–5. pont.
- **N2. Kilépési jog kontra örök elszámoltathatóság** — kilépéskor a név
  leválasztható/törölhető-e úgy, hogy egy kriptográfiai azonosító („ez a hely foglalt
  volt") megmarad a duplikátum-védelemhez; a múltbeli szavazatok/javaslatok sorsa.
  GDPR-kritikus. Kapcsolódik: vita 3–4. pont.
- **N3. A titkos-ellenőrizhető szavazás mechanizmusa** — technológia-választás (zk,
  homomorf, MACI-tanulságok), és hogy mely döntéstípusokra mikortól. Vita 3. pont.
- **N4. Tanúsítási szabályok számszerűsítése** — hány független tanúsító kelljen,
  meghívás-korlátok (db/idő), gráf-szabályok, visszavonás; a felhatalmazott kibocsátók
  audit-folyamata. Vita 1. pont.
- **N5. ~~Forráskód-kormányzás~~** — ✅ **LEZÁRVA (2026-08-25)** → **D12** (a három szint:
  önalkalmazás + kormányzat-nélküli legfelső szint) és **D13** (a koino eszköz, nem
  közösség; a fork normál üzemmód). A teljes levezetés önálló dokumentumban:
  [`kormanyzas.md`](kormanyzas.md). Ami NEM zárult le, és a nyitott listán marad:
  a **névvédelem kérdése** (védjegy vagy sem — lásd D13), valamint a koinók közti
  **felfedezési formátum** részletei (N1-gyel együtt vizsgálandó).
- **N6. Elérhetőség és replikáció-padló** — „annyi helyen, ahány tulajdonos" nem elég
  (kikapcsolt készülékek); minimális replikáció a tulajdonos-számtól függetlenül;
  a blokklánc-réteg NEM védi a valódi támadási felületeket (botok,
  napirend-manipuláció) — külön védelmi rétegek kellenek. Vita 4–5. pont.
- **N7. ~~A „mit véd a blokklánc" védelmi rétegek~~** — LEZÁRVA (2026-07-16): a vita
  5. pontja megoldódott → D5–D7 döntések; a rétegzett védelem táblája a D5-ben.
- **N8. A személy-alapú konszenzus kidolgozása** (D7 folytatása) — hogyan lesz az
  identitás-rétegből érvényesítő-halmaz; mi véd a kis-hálózatos korai fázisban;
  entitás-láncok vizsgálata (számla-láncos DAG-minta: minden entitásnak saját lánca,
  globális konszenzus csak a tartós maghoz — az N1-gyel együtt vizsgálandó). Kutatási
  terep, vállaltan.
  - **DAG-architektúra pontosítás (2026-07-17, Csaba kérdésére):** (a) KÓDVERZIÓ-egység
    ≠ adat-központosítás — ha mindenki ugyanazt a verziót futtatja, az a kívánt
    normálállapot, és NEM terheli túl a rendszert, mert az adat-elosztást a fa adja,
    nem a verziók száma („a szabály közös, az adat elosztott" — egy jogrendszer, sok
    helyi jegyzőkönyv). (b) A koino DAG-ja: ENTITÁS-láncok + E-EMBER-láncok hálója —
    egy esemény két láncot köt össze (cselekvő + entitás); a fa élei hivatkozások
    (az 1. fázis `osLanc`-a ennek előfutára); az EGYESÍTÉS művelet lineáris láncban
    rémálom, DAG-ban natív (két szál összefut). (c) Globális sorrend CSAK: identitás-
    nyilvántartás (kettős regisztráció), később pénz (kettős költés), entitás-közi
    ütközések; minden más lokálisan rendeződik, a tartós mag horgony (az entitás-láncok
    időnként bele-pecsételik az állapot-ujjlenyomatukat).
- **N9. Elismerés-entitás + kinevezési (őr) rendszer** (vita 9. pont, 2026-07-16) —
  ÚJ entitástípus: ELISMERÉS (e-emberek fogalmazzák meg és aggatják egymásra, az
  érintett beleegyezésével); TÁJÉKOZTAT, nem jogosít (a szavazat egyenlő marad);
  bemenete a kinevezési rendszernek (vészhelyzeti „őrök" választása időkorlátos
  mandátummal, nyilvános lépésekkel, utólagos közösségi jóváhagyással). Tervezendő:
  az elismerés életciklusa (visszavonható? elavul?), kinevezés/visszahívás folyamata.
  *(Az elismerés-entitás akár már az 1. fázisban megépíthető.)*
- **N10. A koino-pénz paraméterei** (vita 6. pont — a D10 kerete adott, a részletek
  nyitottak) — az osztalék üteme (Duniter-minta: időben szimmetrikus keletkezés);
  új belépő kezelése (kap-e visszamenőleg — Duniter: nem, az osztalék idővel
  kiegyenlít); kilépő/elhunyt e-ember pénzének sorsa; **szétváláskor a pénz sorsa —
  az ALAPSZABÁLY megvan (nem duplázódik; külön név, 0 értékről — D13), a részletek
  nyitottak: mi lesz a főág pénzének értékével, hogyan árazódnak a koino-pénzek
  EGYMÁSHOZ képest („kripto-család"), és Sybil-kockázat-e az örökölt identitás-háló**;
  közös kassza részesedése
  (Csaba levélbeli (a) opciója); egység/elnevezés; volatilitás-kezelés a
  bér-fizetéshez (kis közösségnél a pénz ingadozik — árazás referencia-egységben?
  kassza-puffer?); a feladat/feladatvállalás fizetési rendszer terve. *(A vita 6.
  pontja 2026-07-16-án ✅ lezárult: hozam-ígéret-tilalom elfogadva, hívő-munkás korai
  fázis; a Sybil-pénz ütemezési szabály → D11.)*
- **N11. Emberiség-lépték (8 milliárd) — megvalósíthatósági elemzés (2026-07-17,
  Csaba kérdésére: „technikailag megvalósítható-e?"):**
  **VERDIKT: megvalósítható — de kizárólag szeletelt (hierarchikus) architektúrával;
  a „minden egy láncon" kizárt. A koino FA-struktúrája maga a skálázási architektúra:**
  az aktivitás résztvevő-arányos (entitás-szintű döntésben csak a tulajdonosok
  vesznek részt), globálissá csak a regisztráció-bizonyíték és az eredmény/egyezmény
  válik — a szavazatok az entitás körében maradnak, felfelé csak az eredmény + a
  bizonyíték megy.
  - *Tárolás:* a tagokkal skálázódik (minden új tag készüléket hoz); a szöveg-alapú
    tartalom triviális teher (1 mrd entitás × 50 KB × 20 replika ≈ 1 PB globálisan,
    8 mrd készülék közt elosztva elenyésző); a kép/fájl érdeklődés-arányos.
  - *Útvonal/felfedezés:* DHT — logaritmikus skála; a BitTorrent-DHT tízmilliós
    élő bizonyíték, a mélység 8 milliárdnál is csak ~33 lépés nagyságrend.
  - *Konszenzus-teher:* a koino döntési ablakai (órák–napok) 5-6 nagyságrenddel
    lazábbak, mint egy fizetési rendszeré → a konszenzus-probléma KÖNNYEBB, mint egy
    pénzé; a regisztráció-ütem (8 mrd / 10 év ≈ átlag 25/mp) kezelhető.
  - *Mobil-realitás:* a telefon rossz P2P-polgár (akku, OS-háttérkorlátok, mobilnet)
    → HIBRID hálózat kell: telefon = könnyű kliens, önkéntes tartós csomópontok
    (otthoni gép/szerver) viszik a gerincet. A kormányzás személy-alapú marad; az
    infra-hozzájárulás önkéntes — az egyenlőséget nem sérti (mint a tudatpont-tárolás).
  - *Fő kockázatok sorrendben:* (1) titkos (zk) szavazás milliós szavazó-számnál —
    a legéretlenebb elem; (2) a tartós mag konszenzusa milliárdos identitás-halmazzal;
    (3) mobil-háttérfutás. Egyik sem fizikai lehetetlenség — mindhárom
    kutatás-mérnökség.
  - *Precedensek:* milliárdos federált/hierarchikus rendszerek LÉTEZNEK (DNS, e-mail,
    web); tisztán P2P, milliárdos, globális konszenzusú rendszer NEM létezik → a koino
    célja az előbbi kategória személy-alapú, P2P-sített változata.

### D9. Konszenzuális önfrissítés (vita 9. pont, 2026-07-16 — Csaba elfogadta)

- A kliens ALAPÉRTELMEZETTEN figyeli a láncot: érvényes kód-egyezmény + időzár letelte
  után az új kódot letölti, hash-ét az elfogadottal összeveti, és automatikusan átáll.
- A frissítés VISSZAUTASÍTÁSÁNAK szabadsága szándékosan megmarad (a készülék tulajdonosáé
  az utolsó szó) — biztonsági szelep: megállíthatatlan önfrissítésnél a frissítési
  csatorna elfoglalója egyetlen mozdulattal minden készüléket birtokba venne.
- Kapcsolódik: fork-jog (a teljes történelem lemásolódik, nem oszlik meg; társadalmi
  gravitáció — a közösség zöme egy ágon marad), N5.
- Bootstrap-átmenet: Csaba nyilvános KORMÁNYZÁSI ÍGÉRET dokumentuma az 1. fázisra
  (mit dönt egyedül / mihez kell közösségi támogatás / mi történik ellenjavaslat esetén),
  amíg a P2P a többlet-jogaitól technikailag is függetleníti a rendszert. → H7.

### D10. A pénz: alkotmányos kibocsátás + egyenlő osztalék (vita 6. pont, 2026-07-16)

- A pénzteremtés SZABÁLYA alkotmányos entitás: az e-emberek alkotják és módosíthatják,
  de csak magas küszöbbel és hosszú döntési idővel („a döntést nem elvesszük, hanem
  lelassítjuk és megdrágítjuk" — Csaba pontosítása); a mindennapokban senki nem szavaz
  pénzmennyiségről.
- A keletkezés EGYENLŐ OSZTALÉK: a pénz ütemezett szabály szerint, minden e-embernél
  egyenlően keletkezik (Duniter Ğ1 minta) — a „mindenkinek ugyanannyi" elv pénzre
  alkalmazva.
- Újdonság-állítás (vállalható): egyenlő keletkezés + MÓDOSÍTHATÓ alkotmány +
  személy-alapú kormányzás kombinációja még nem létezett.
- SZERKEZETI ERÉNY (2026-07-16): a pénz-vagyon és a hatalom SZÉT VAN VÁLASZTVA — a
  szavazat személyenként egy, vagyontól függetlenül → a token-DAO-k plutokráciája a
  koinoban lehetetlen.
- Paraméterek és nyitott viták: **N10** (hozam-ígéret-tilalom mondata, sorrend).

### D11. Sybil-pénz ütemezési szabály (vita 6. pont, 2026-07-16 — Csaba elfogadta)

- **Pénz csak az identitás-réteg ÉLES bizonyítása után indulhat**: az N4 tanúsítási
  szabályok működnek, és a bizalmi háló már kibírt valódi támadási kísérleteket.
- Indok: egyenlő osztalék mellett minden hamis regisztráció pénznyomtató gép — az
  identitás-réteg elleni támadás megtérülő üzletté válik (a Duniter fő tanulsága).
- Kiegészítések: a kormány-meghívás GYORSÍTÓ, nem alap (a hálónak nélküle is állnia
  kell); stratégiai őszinteség: az állam a saját pénze versenytársához hívná meg a
  polgárait — belső feszültségű kérés, számítani kell a rámutatásra.
- Lehetségesség-verdikt (koncepció-tétel): „a demokratikusan kormányzott pénz
  lehetséges; a koinonál minden ismert előfeltétele megvan vagy tervben van; ami nem
  garantálható, az a világméretű elfogadottság — de az nem is előfeltétele annak,
  hogy a pénz a közösségnek szolgáljon."

### D12. A három szint: önalkalmazás + kormányzat-nélküli legfelső szint (N5 lezárása, 2026-08-25)

*Teljes levezetés: [`kormanyzas.md`](kormanyzas.md).*

- **A koino-verzió entitásként él a fában**, a gyökér-entitások felett — de AZON A KOINÓN
  BELÜL, amit leír. Ezért a teljes meglévő gépezet magától vonatkozik rá: tudatpont,
  küszöb, javaslat, szavazás, **különválás**. A forráskód-kormányzás nem új mechanizmus,
  hanem **ugyanaz a mechanizmus, magasabb magasságban**.
- **Nincs végtelen regresszus**, mert a verzió-szint nem a rendszer FELETT van, hanem
  BENNE: a program a saját módosítását a saját eszközeivel dönti el (**önalkalmazás** —
  ahogy egy alkotmány tartalmazza a saját módosítási szabályát). Az 1. és 2. szint
  valójában egy szint; a hurok bezárul.
- **A koinók sokasága NEM kormányzott szint.** Nincs rajta tudatpont, szavazás, küszöb —
  mert **nincs mit eldönteni**: egy koino léte tény, nem határozat. A legfelső szinten a
  szabályozó erő nem a döntés, hanem a **kompatibilitás** (RFC-minta: ajánlás, nem
  jogszabály). A közös megjelenítés **térkép, nem kormányzat** — bárki rajzolhat egyet,
  több létezhet egyszerre.
- **Ez nem hiányosság, hanem a garancia:** ha a legfelső szinten kormányzat lenne, a
  koinónak lenne TETEJE — aminek pedig teteje van, azt egyetlen ponton el lehet foglalni.
- **A különválás és a fork ugyanaz a művelet**, két szinten: tartalom-szinten egy gondolat
  válik szét, verzió-szinten egy világ. A Fázis 1-ben megépített különválás (2026-08-25)
  ennek a főpróbája — és empirikus választ ad a kérdésre, amire a blokklánc-világ csak
  anekdotákkal felel: **mi történik, ha az elválás olcsó?**

### D13. A koino eszköz, nem közösség; a fork normál üzemmód (2026-08-25, Csaba)

*Ez a vita 9. pontjához képest ÚJ álláspont — Csaba továbbgondolása.*

- A vitában a fork **vésznyílás** volt („az ereje a létezése, nem a gyakorlása"). Mostantól
  **normál működés**, sőt: **bárki indíthat teljesen új koinót** — család, osztály,
  munkahely, párt. *„A koinót nem kizárólag egy közösségnek építem, hanem egy eszközt
  szeretnék adni, amivel bárkik csinálhatnak közösséget."*
- **Siker-mérce változik:** nem az, hányan vannak a koino.hu-n, hanem **hány koino létezik**.
- **Az értelmezési egység az ADATBÁZIS.** Két születési mód: **szétválás** (a verzió-javaslat
  megosztja a közösséget → az adatbázis LEMÁSOLÓDIK, a regisztráltakon is osztoznak, a múlt
  közös) és **új alapítás** (üres, teljesen külön adatbázis, nincs közös múlt). A szétválás
  akkor is így megy, ha valaki csak TESZTELÉSRE rak fel egy verziót.
- **Verzió-szinten a szétosztás TELJES, nem arányos** (szemben a tartalom-szintűvel) — mert
  a verzió nem csomópont, hanem **talaj**: programból nem lehet „felet" elvinni. Az e-ember
  kezdetben mindkét ágon létezik.
- **A koinók közti kapcsolat választható**: lehetnek szigetek, lehetnek összekapcsolva.
- **A bootstrap-probléma helye megszűnik:** ha nincs „a koino", nincs mit átadni. A koino.hu
  egy koino lesz — az első, talán a legnagyobb, de nem kiváltságos. A többlet-jog nem
  lemondással szűnik meg, hanem mert megszűnik a hely, ahol létezhetne. *(A H7 az ÁTMENETRE
  továbbra is kell.)*
- **Az identitás koinónként külön van** → az „egy ember = egy e-ember" szabály koinón belüli,
  nem világszintű (a **D1** hatókörének pontosítása).
- **A skálázás NEM opcionális** (Csaba helyesbítése): az igény az, hogy BÁRMELYIK koino
  megnőhessen milliárdos nagyságrendre. Az N3/N4/N8 tehát nem gördül le a projektről — csak
  a SORREND változik: előfeltételből a **növekedés árává** válnak. A legfőbb koino
  **evolúciósan** jön létre, „igazságos versenyben", nem kinevezéssel.
- **✅ NÉVVÉDELEM: NEM LESZ (Csaba döntése, 2026-08-25).** Ha bárki kirakhat módosított
  verziót, kirakhat olyat is, ami megtartja a nevet, de elárulja a lényeget (pl. a
  tudatpont szavazaterővé válik). A kompatibilitás technikai mérce, a lényeg etikai —
  **a kompatibilitás nem védi meg**. A védjegy megvédené, de hatóságot igényelne, ami
  **visszahozná a tetőt**, amit a D12 megszüntetett → az eszközt nem vesszük fel. *„Vállalom
  a kockázatot, hogy rosszul használják majd fel mások."*
  - **A kérdés amúgy is rossz volt: nem megakadályozni kell.** A koino nem tiltja az
    elárult változatot, hanem **veszteségessé teszi** — az olcsó kilépés miatt aki elfoglal
    egy koinót, pontosan azt semmisíti meg, amiért érdemes volt elfoglalni. Ez a **D4
    felelősség-elve egy szinttel feljebb**.
  - **Ha MÁS védeti le a nevet:** a védjegy a névhasználatot korlátozza, nem a szoftvert —
    a futtatást/másolást/módosítást az AGPL rendezi, P2P-ben pedig senki engedélye nem kell.
    A védekezés ingyenes és most készül: **nyilvános, dátumozott előzmény** (nyilvános repó
    + élő koino.hu + AGPL). *(Nem jogi tanácsadás.)*
- **✅ A PÉNZ MINT FORK-MOTIVÁCIÓ — szabállyal kezelve (Csaba, 2026-08-25).** A fork-ritkaság
  érve arra épült, hogy „a koino értéke az emberek, nem a kód" — de ha a szétválással pénz
  is másolódik (D10), a forknak **anyagi motivációja** lesz, ami az ötletek szintjén nem
  létezett (a kripto-forkok jelentős része haszonszerzési célú volt). **SZABÁLY: a pénz
  szétváláskor NEM duplázódik**; ha a különvált ág saját pénzt akar, **külön nevet kap, és
  0 értékről indul**, amíg nem fektetnek bele.
  - **Ez nem puszta deklaráció:** a koino-pénz értékét nem a szűkösség adja, hanem **az a
    közösség, amelyik elfogadja** — a fork az adatbázist másolja, az élő közösséget nem.
    Haszonszerzésből nem lehet forkolni **anélkül, hogy embereket ne hozna magával** — és
    akkor az már valódi közösségi szétválás. → részletek: [`kormanyzas.md`](kormanyzas.md).
  - **Marad kockázatnak:** a szétválás MINDKÉT ág pénzét gyengíti (egészséges fék); a
    különvált ág kész identitás-hálót örököl (D11-gyel vizsgálandó); a sok koino-pénz
    egymáshoz képesti árazódása feltáratlan (→ N10).

---

## Technológia-radar (jelöltek a Fázis 2 rétegeihez — 2026-07-17)

*Csaba kérdésére (GunDB/OrbitDB) indított lista. Ezek NEM koino-versenytársak, hanem
lehetséges építőkövek — egyik sem ad identitást, konszenzust vagy kormányzást, csak
elosztott adat-alapot.*

- **GunDB** — valós idejű, elosztott gráf-adatbázis (JS, böngészőben is fut); a
  csomópontok azt replikálják, amire „figyelnek" → az „érdeklődés-vezérelt tárolás"
  elve feltűnően rokon a tudatpont-alapú tárolással (D3). CRDT-s végső konzisztencia,
  SEA kulcspár-alapú titkosítás. Gyengéi: lekérdezés, garanciák, a gyakorlatban
  relay-szerver-függés. → TARTALMI RÉTEG jelölt.
- **OrbitDB (IPFS/libp2p felett)** — append-only naplók (Merkle-CRDT), többféle
  adatbázis-típus; a „pinning" (kitűzés) szó szerint tárolási vállalás = a tudatpont
  tárolási-vállalás gondolata készen létezik benne. Gyengéi: érettség, teljesítmény,
  API-stabilitás. → TARTALMI RÉTEG jelölt.
- **Holochain** — ügynök-központú láncok (minden szereplőnek saját lánca + elosztott
  validálás) — a legközelebbi létező rokona az entitás-láncok ötletének (N8/N1).
- **libp2p** — a P2P hálózati alapréteg (kapcsolatok, felfedezés, NAT) — bármelyik
  fenti alatt ez van/lehet.
- FONTOS KORLÁT mindnél: végső (eventual) konzisztencia ≠ tartós mag — szavazás-
  véglegesség, egyezmény-örökség és duplikátum-védelem EGYIKBŐL SEM jön; a tartós mag
  (N1) és az identitás (N4) külön megoldás marad. Egyik sem bizonyított országos
  léptékben.

**eIDAS 2.0 / EUDI-tárca helyzetkép (2026-07-17, webes kutatás — Csaba kérdésére:
„ha a kormány nemet mond, tudja-e a koino másképp biztosítani az egy ember = egy
regisztrációt?"):**
- **A válasz: IGEN — az EUDI-út nem függ egyetlen kormány jóindulatától.** Az eIDAS
  2.0 rendelet szerint mind a 27 tagállam KÖTELES 2026 decemberéig EUDI-konform
  digitális személyazonossági tárcát adni a polgárainak — ez EU-jogi kötelezettség,
  nem szívesség. A tárca birtokosa úgy tud bizonyítani („valódi, egyedi személy
  vagyok"), hogy a személyes adatait nem adja át (szelektív felfedés, álnevesített
  azonosítás).
- A koinonak ehhez „relying party"-ként (igénybe vevő szolgáltatásként) kell
  regisztrálnia — ez szabály-alapú eljárás, és BÁRMELY tagállamban megtehető: egy
  máshol bejegyzett szolgáltatás is elfogadhatja a magyar polgárok tárcáit
  (a határon átnyúló elfogadás a keretrendszer lényege).
- **Magyar helyzet:** a DÁP (Digitális Állampolgárság Program) a magyar platform —
  ~2,5 millió letöltés (2025. szept.); az IdomSoft célja az eIDAS 2.0-konform,
  auditált magyar EUDI-tárca 2026 végére. FIGYELEM: Magyarország a régi (eIDAS 1.0)
  határon átnyúló hálózatba NEM notifikálta az eID-jét — a DÁP ma belföldi; az
  „átugrás" célpontja közvetlenül az eIDAS 2.0.
- **Kockázatok:** az EU-s rollout csúszik (2026 tavaszán a tagállamok kevesebb mint
  harmada állt készen; Németország 2027. január); a lefedettség csak a tárcát
  telepítőkre terjed ki; a magyar notifikáció/audit időzítése bizonytalan.
- **A koino háromutas identitás-stratégiája ezzel:** (1) bizalmi háló — mindig, alap;
  (2) EUDI-tárca relying party-ként — EU-polgárokra, kormány-független, mert EU-jog
  kényszeríti ki; (3) kormányi meghívó-kibocsátás — gyorsító, opcionális. Egyetlen
  kormány „nem"-je egyik utat sem zárja le.
- ~~CSABA NYITOTT KÉRDÉSE: sérti-e az EUDI a decentralizációt?~~ **LEZÁRVA
  (2026-07-17):** Csaba elfogadta — nem sérti, mert csak a regisztrációkor van rá
  szükség (belépési kapu, nem üzemi függőség). A bemutatóból az említés ettől még
  kimaradt (v2.2).
- **EUDI vs MEGHÍVÓ-RENDSZER — melyik legyen az alap? (2026-07-17, megvitatva):**
  Csaba kérdése: nem lenne-e jobb az EUDI, hogy már az 1. fázis is rá támaszkodhasson.
  **Verdikt: NEM „jobb" — más ütemű és más szerepű; nem helyette, hanem mellette.**
  (1) Az 1. fázis NEM épülhet rá: a tárcák még nem élnek (határidő 2026. dec., csúszik;
  magyar audit-cél év vége); relying party regisztrációhoz jogi személy + szerződések
  kellenek (Csaba ma magánszemély); a korai, decentralizáció-párti közösség egy része
  pont az állami-azonosítós egyetlen kaput kerülné. (2) A meghívó-rendszer NEM
  ideiglenes pótlék, hanem ÁLLANDÓ ALAPRÉTEG: emberi kapcsolatokon át épít közösséget,
  a tanúsítási gráf később önérték (elismerés/kinevezés erre épül), és globális
  (nem EU-s embereknek is út). (3) Amikor a tárca él (~2027) + van jogi kapacitás:
  MÁSODIK KAPU a meghívás mellé; a tárcás tagok erős tanúsítók a bizalmi hálóban —
  a két út erősíti egymást (a D1 pontosan ezt írta le).
  **ÚJ NYITOTT ALKÉRDÉS (N4-hez): hitelesítési szintek** — a két út egyediség-garanciája
  eltér; szavazásnál nem számíthat (egy e-ember egy hang), de a PÉNZ indulásánál (D11)
  eldöntendő, elég-e bármelyik út az osztalékhoz.
- **Korhatár-döntés (2026-07-17, Csaba):** NINCS regisztrációs korhatár — „nem
  szeretnék a kora miatt senkit sem kizárni" (a bemutatóban az „állampolgárainak"
  tudatos). Megvalósítási jegyzet: GDPR szerint 16 év alatt szülői hozzájárulási
  lépés kell — nem elvi akadály, csak plusz lépés a kiskorú útjában.
- Források: eideasy tagállami rollout-követő (2026. júl.), FinTechZone DÁP-cikkek,
  Euroastra-elemzés a magyar notifikáció hiányáról, kormany.hu.

---

## Híd-feladatok — amit a Fázis 1 készít elő a Fázis 2-höz

*(Ezek a központi szerveres kódban készülnek el, amikor a kódolás-felfüggesztés
feloldódik; a [fejlesztesi_terv.md](fejlesztesi_terv.md)-be is átvezetendők akkor.)*

- **H1. Küszöbváltozás-értesítés** (D4 kötelező eleme) — új értesítés-típus a meglévő
  értesítés-rendszerben: az entitás érvényes (medián) küszöbeinek jelentős változásáról
  a tudatpont-tulajdonosoknak. Az infrastruktúra (beállítás-cascade, postafiók, badge)
  kész, a típus és a trigger (érték javaslat mentésekor medián-újraszámítás + összevetés)
  hiányzik.
- **H2. Szavazat-titkosság első lépés** — a szavazat ne legyen látható más e-emberek
  felől (API-válaszok átvizsgálása: egyéni szavazatok kiszivárgása); az üzemeltetői
  láthatóság őszinte kimondása (adatkezelési szöveg).
- **H3. E-mail privát** — ellenőrizni, hogy az e-mail semmilyen nyilvános API-válaszban
  nem szerepel; a nyilvános profil: név + település (lokáció település mélységig).
- **H4. Identitás-réteg leválasztása** — a regisztráció modulként, hogy később a
  meghívásos tanúsítás / felhatalmazott kibocsátó becsatlakoztatható legyen a többi
  kód érintése nélkül.
- **H5. Entitások önhordozóvá tétele** — export/import-képes entitás-formátum, stabil
  azonosítók (a P2P-migráció előfeltétele; a tudatpont-alapú tárolás egysége az entitás).
- **H6. Adat-osztályozás előkészítése** — már a Fázis 1 adatmodelljében jelölni, mi
  tartozik a tartalmi rétegbe és mi a tartós magba (D3), hogy a szétválás ne utólagos
  szétszálazás legyen.
- **H7. Kormányzási ígéret dokumentum** (Csaba, 2026-07-16: „még nem kell, de
  felírhatod") — nyilvános dokumentum az 1. fázis kormányzásáról: mit dönt Csaba
  egyedül, mihez kell közösségi támogatás, mi történik, ha a közösség az ellenjavaslata
  ellenére akar valamit (Csaba kimondott gyakorlata: mindent egyeztet, támogatás nélkül
  nem vezet be, az ellenjavaslata ellenére kért fejlesztést is megcsinálja). Az
  átláthatóság pótolja a garanciát, amíg a P2P (D9 + N5) technikailag függetlenít.

---

## Napló

- **2026-07-16** — A fájl létrejött (Csaba kérése: a vita a közepes-kritikus pontok
  megoldásáig folytatódik, és közben elkezdjük a Fázis 2 terv írását). Bekerült: D1–D4
  (a vita eddigi döntései), N1–N7 (nyitott kérdések), H1–H6 (híd-feladatok). A vita 2.
  pontja ✅ lezárult (felelősség-elv + küszöbváltozás-értesítés).
- **2026-07-16 (2)** — A vita 5. pontja ✅ lezárult → **D5** (lánc = tartós mag, rétegzett
  védelem), **D6** (személyes adat soha a láncra), **D7** (személy-alapú konszenzus);
  **D8-jelölt** (egyezmény tény↔hatály — Csaba megerősítésére vár); N7 lezárva, **N8**
  (személy-alapú konszenzus + entitás-láncok) felvéve. Következő vita-téma: N5 /
  vita 9. pont (forráskód-kormányzás).
- **2026-07-16 (3)** — Vita 9. pont ✅ → **D8 megerősítve**, **D9** (konszenzuális
  önfrissítés), **N9** (elismerés + kinevezés), **H7** (kormányzási ígéret). Vita
  1./3./10. pont ✅ (maradék → N4/N3/H2 + betakarítási lista). Vita 6. pont (pénz):
  **D10** (alkotmányos kibocsátás + egyenlő osztalék) + **N10** (paraméterek; nyitott:
  áramló-vs-befektetés, sorrend, Sybil-pénz ütemezési szabály).
- **2026-08-25** — **N5 ✅ LEZÁRVA** → **D12** (a három szint: önalkalmazás + kormányzat-
  nélküli legfelső szint) és **D13** (a koino eszköz, nem közösség; a fork normál
  üzemmód; az egység az adatbázis). A teljes levezetés önálló dokumentumba került:
  [`kormanyzas.md`](kormanyzas.md). Előzmény ugyanaznap: a repó megkapta az **AGPL-3.0**
  licencet — a fork-jog eddig jogi alap nélkül állt (licenc hiányában „minden jog
  fenntartva"), vagyis a vita 9. pontjának VÉGSŐ GARANCIÁJA nem létezett.
  Két új nyitott szál: a **névvédelem** kérdése (D13) és a **pénz mint fork-motiváció**
  (a „társadalmi gravitáció" érve nem vihető át változatlanul a pénzre).
