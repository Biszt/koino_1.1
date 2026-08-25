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
| D13 | A koino mint eszköz | Bárki indíthat koinót; a fork normál üzemmód, nem vésznyílás; az egység az ADATBÁZIS. A skálázás nem opcionális — a legfőbb koino evolúciósan jön létre. **D13/b:** a paramétereket nem eltaláljuk, hanem koinónként szétosztjuk. |
| D14 | Tartós mag | A csalás-elleni CSONTVÁZRA szűkül (azonosság-egyszeriség, később pénz); minden más — az **egyezmény is** — a tudatpontot követi és elfelejthető. → **N2 (GDPR) megoldva.** |
| D15 | Kulcs | A kulcs HITELESÍT, nem titkol — a lopás minden kára visszafordítható, kivéve a pénzt. A helyreállítás TÖBB FÜGGETLEN TANÚBÓL áll (háló + opcionálisan EUDI + opcionálisan választott bizottság); a bizottság **tanú, nem hatóság**. |
| D16 | Pénz-tempó | Az irreverzibilitás DÖNTÉS, nem törvény: a nagyobb átutalás késleltetve, nyilvánosan, az ablakban megtámadhatóan megy — értesítéssel, **külön csatornán**. A kulcslopás így túlélhető. |
| D17 | Konszenzus | A globális egyetértés hatóköre = a tartós mag (D14), semmi más; minden egyéb saját lánc-következetesség + determinisztikus számítás. **A konszenzus biztonsága = az identitás-réteg biztonsága** → az identitás a gerinc, elsőként kell állnia. |

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

- **N1. A tartós mag megtervezése** — 🟡 **KÉTHARMADA LEZÁRVA (2026-08-25).**
  - ✅ **MI kerül bele:** a **D14** megválaszolta — a csalás-elleni csontváz és semmi más
    (azonosság-egyszeriség, később pénz). Az egyezmények **kikerültek** belőle: azok is a
    tudatpontot követik.
  - ✅ **HOGYAN írható:** a **D17** vázolja — személy-alapú érvényesítés, lassú
    véglegességgel (D16); a hatókör olyan kicsi, hogy a konszenzus ritkán fut.
  - ❌ **NYITVA: hogyan replikálódik mindenhová.** A tartalmi rétegre ezt az N6/D14
    megoldja (a tudatpont a tárolási térkép) — de a tartós magra **épp az a lényeg, hogy
    NE a tudatponthoz kötődjön**, hiszen senki nem tesz rá pontot. Kell tehát egy külön,
    garantált replikációs szabály erre a nagyon kicsi halmazra. Kapcsolódik: vita 4–5. pont.
- **N2. ~~Kilépési jog kontra örök elszámoltathatóság~~** — ✅ **LEZÁRVA (2026-08-25)** a
  **D14** által. A kérdés az volt, hogyan fér össze a GDPR törléshez való joga a
  megmásíthatatlan, P2P-replikált adatbázissal. A D14 megszünteti az ütközést: **ha semmi
  nem marad örökre magától, csak amit valaki aktívan tart, akkor a felejtés a rendszer
  ALAPÁLLAPOTA** — nem kell „törlés" funkciót építeni a megmásíthatatlanság ellen.
  **Ami nyitva marad** (szűkebben, mint eredetileg): a tartós magban maradó
  duplikátum-védelmi azonosító („ez a hely foglalt volt") jogi megítélése — ez az EGYETLEN
  dolog, amit a kilépő nem tud magával vinni. Kapcsolódik: vita 3–4. pont.
- **N3. A titkos-ellenőrizhető szavazás mechanizmusa** — 🟡 **ÁTFOGALMAZVA (2026-08-25).**
  Eddig egy „kutatás-közeli" problémának látszott. Valójában **kettő**, és a kettő
  természete gyökeresen más:
  - 🔴 **KIS szavazásoknál a titkosság ELVILEG lehetetlen** — és ennek semmi köze a
    kriptográfiához. Ha egy tartalomnak 3 tudatpont-tulajdonosa van és az eredmény 2:1,
    mindenki tudja, ki hogyan szavazott: **nincs elég ember, aki mögé el lehetne bújni.**
    Információelméleti korlát, amit semmilyen zk-technológia nem javít meg. **És a koino
    szavazásainak túlnyomó többsége ilyen lesz** (entitásonként csak a tulajdonosok
    szavaznak). → **Ezt SZABÁLLYAL kell kezelni, nem technológiával** (pl. kimondjuk, hogy
    kis létszámnál a szavazás gyakorlatilag nyílt; vagy késleltetett/aggregált közzététel).
    ⚠️ Ez a felismerés a **D2** ígéretét („titkos-de-ellenőrizhető") **korlátozza** — a
    bemutató anyagokban is így kell szerepelnie.
  - 🟢 **NAGY szavazásoknál létező technológia**, és a koino három tulajdonsága
    **kedvezőbbé** teszi az általános esetnél: (1) a döntési ablak órák–napok → **nincs
    valós idejű követelmény**, ahonnan a nehézség java jön; (2) mindenki egyenlő, nincs
    súlyozás → egyszerű összeadás; (3) **a tudatpont nyilvános**, tehát *ki jogosult* eleve
    publikus — csak azt kell rejteni, *hogyan* szavazott; (4) a **személy-alapú
    érvényesítők** (D7/N8) mellé a küszöbös (k-az-n-ből) visszafejtés természetesen
    illeszkedik: egyetlen érvényesítő sem tudja egyedül megnyitni a szavazatot.
  - **Marad tervezendő:** hol a határ a két üzemmód között (→ paraméter, D13/b), és a
    konkrét technológia-választás a nagy üzemmódhoz. Vita 3. pont.
- **N4. Tanúsítási szabályok számszerűsítése** — hány független tanúsító kelljen,
  meghívás-korlátok (db/idő), gráf-szabályok, visszavonás; a felhatalmazott kibocsátók
  audit-folyamata. Vita 1. pont.
- **N5. ~~Forráskód-kormányzás~~** — ✅ **LEZÁRVA (2026-08-25)** → **D12** (a három szint:
  önalkalmazás + kormányzat-nélküli legfelső szint) és **D13** (a koino eszköz, nem
  közösség; a fork normál üzemmód). A teljes levezetés önálló dokumentumban:
  [`kormanyzas.md`](kormanyzas.md). Ami NEM zárult le, és a nyitott listán marad:
  a **névvédelem kérdése** (védjegy vagy sem — lásd D13), valamint a koinók közti
  **felfedezési formátum** részletei (N1-gyel együtt vizsgálandó).
- **N6. Elérhetőség és replikáció-padló** — 🟡 **A FELE LEZÁRVA (2026-08-25, Csaba).**
  - ✅ **A replikáció-padló KIVÁLTVA a tartalmi rétegre — nem kell megépíteni.** Csaba
    szabálya: *„ha egyik tudatpont-tulajdonos sem elérhető, akkor a tartalom sem lesz
    elérhető — egy szellem-kártya, offline státusszal, és kész. Ami sok mindenkinek
    fontos, az sok készüléken lesz rajta."* Az elérhetőség tehát **a tényleges
    törődéshez kötött**, nem külön alrendszerhez. Egybevág a meglévő invariánssal
    (0 pont → az entitás törlődik) és a **D14**-gyel.
    - **Ellenőrizve (2026-08-25):** a fa „felfelé" mutat (a gyerek tudja a `szuloId`-t,
      a szülő NEM tartja nyilván a gyerekeit) — lefelé navigálni tehát nem triviális
      offline szülőnél. **A mechanizmus viszont már létezik:** a
      `tudatpontAllokacio.osLanc` indexelve tárolja minden entitás teljes ős-láncát, így
      „X összes leszármazottja" egyetlen lekérdezés. P2P-ben: **egy entitás gyerekeit
      azoktól kérdezed meg, akiknek pontjuk van az alatta lévő ágban** — megint a
      tudatpont-térkép, és ugyanúgy viselkedik, ahogy a szabály kívánja.
    - **Határ:** ez a TARTALMI rétegre igaz. A tartós mag (D14: azonosság-egyszeriség,
      később pénz) továbbra is garantált replikációt igényel.
  - ❌ **NYITVA MARAD a másik fele:** a blokklánc-réteg NEM védi a valódi támadási
    felületeket (botok, napirend-manipuláció) — ehhez külön védelmi rétegek kellenek.
    Vita 4–5. pont.
- **N7. ~~A „mit véd a blokklánc" védelmi rétegek~~** — LEZÁRVA (2026-07-16): a vita
  5. pontja megoldódott → D5–D7 döntések; a rétegzett védelem táblája a D5-ben.
- **N8. A személy-alapú konszenzus kidolgozása** — 🟡 **NAGYRÉSZT ÁTHIDALVA (2026-08-25)**
  → **D17**. A „kutatási terep" minősítés egy NAGYOBB tartós magot feltételezett; a **D14**
  után a globális konszenzus hatóköre az azonosság-egyszeriségre és (később) a pénzre
  szűkül, a **D16** pedig elveszi a legdrágább követelményt (az azonnali véglegességet).
  A biztonsági alap kimondva: **a konszenzus biztonsága = az identitás-réteg biztonsága.**
  **Nyitva marad:** az érvényesítő-kiválasztás (befolyásolhatatlan véletlen) és a köztes
  méret veszélyzónájának paraméterei. *(Az alábbi eredeti megfogalmazás referenciaként
  marad.)* — hogyan lesz az
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
  - **KITERJESZTVE (2026-08-25, D15):** a kinevezési minta MÁSODIK feladatot is kap — a
    **kulcs-helyreállító bizottságot** (akár személyes megjelenéssel igazolja, hogy a
    kérelmező az, akinek mondja magát). Ugyanaz az alakzat, másik tárgyra: időkorlátos
    mandátum, nyilvános lépések, utólagos jóváhagyás. **Kötelező korlát: a bizottság TANÚ,
    nem HATÓSÁG** — a szava önmagában soha nem elég (különben királyt csináltunk). Az N9
    tervezendő része ezzel bővül: hogyan választódik, hogyan hívható vissza, és hány
    tanúra van szükség egy helyreállításhoz.
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

#### D13/b. PARAMÉTER-PLURALIZMUS: a beállításokat nem eltaláljuk, hanem szétosztjuk (2026-08-25, Csaba)

*Ez a D13 következménye, és egy VISSZATÉRŐ problémára ad elvi választ.*

A tervezés során újra és újra ugyanabba futunk: *mekkora legyen a késleltetés? hány tanú
kell a helyreállításhoz? hol legyen a küszöb?* — és minden alkalommal ott lebeg, hogy ezt
valakinek el kell találnia.

> „Ezért is tartom jó ötletnek a több koino létezését, hogy minden közösség maga
> alkothassa meg a szabályait, és így természetes módon valamelyik pont optimális lesz."
> — Csaba

**Ne találja el senki: legyen paraméter, és a koinók térjenek el benne.** Ez nem új elv —
a koino BELÜL már így működik (**D4**: a küszöböket az érték javaslatok mediánja adja, nem
a tervező). A D13 ezt viszi **a koinók közé**, ahogy a D12 a kormányzást vitte egy
szinttel feljebb.

**Gyakorlati következmény a tervezésre:** ahol a terv „nyitott paramétert" mond (D15
tanú-szám, D16 összeghatár és ablak-hossz, D4 küszöbök), ott NEM kell egy helyes értéket
találni — **alapértelmezést** kell adni, és a koinóra bízni a változtatást.

> **Őszinte fenntartás.** Az evolúciós érveléshez három dolog kell: változatosság ✅ (sok
> koino), öröklődés ✅ (a fork viszi a szabályokat) — és **kiválasztódási nyomás**, ami itt
> **gyenge és lassú**: a közösségek nem halnak meg gyorsan, az emberek nem költöznek
> könnyen. És ami terjed, nem szükségképpen a legjobb — a rövid távon vonzóbb is terjedhet
> (az internetet nem a legjobb platformok nyerték meg). A pontos mondat tehát nem
> „természetes módon optimális lesz", hanem: **„jobb eséllyel találjuk meg, mint
> találgatással — de nem magától és nem gyorsan."**

### D14. A tartós mag = a csalás-elleni csontváz (2026-08-25, Csaba — a D5 határának áthelyezése)

> „Ha mindenki leveszi a tudatpontját egy egyezményről, akkor az sem kell. Tudom, hogy
> korábban azt mondtam, hogy kell, de mégsem. Ami fontos a közösségnek, arra rakjanak
> tudatpontot." — Csaba *(és: „nem is akartam megdönteni, tudom hogy kell egy tartós mag,
> de az legyen minél kisebb")*

A D5 határa **rossz helyen volt**. Nem „tartalmi réteg vs. tartós mag" a törésvonal, hanem:

| | Amit valaki **fontosnak tart** | Amit senki nem tart fontosnak, de nélküle a rendszer **csalható** |
|---|---|---|
| Példa | tartalom, javaslat, **egyezmény** | „ez az ember már regisztrált"; „ez a pénz már el lett költve" |
| Ki tenne rá tudatpontot? | akit érdekel | **senki** — ez nem tartalom, hanem csontváz |
| Elfelejthető? | ✅ igen | ❌ nem — **a felejtés maga a csalás** |

- **A tartós mag tehát az azonosság egyszeriségére és (később) a pénzre szűkül.** Minden
  más — az **egyezményeket is beleértve** — a tudatpontot követi.
- **Egybevág egy MÁR MEGLÉVŐ invariánssal:** a `tudatpontService` ma is törli az entitást,
  ha 0 pontra csökken („aminek nincs gazdája, az nem létezik"). A D14 ennek időbeli
  változata.
- **A D8 pontosítása:** az egyezmény TÉNYE nem magától örök, hanem **addig, amíg valaki
  tartja**. A tény ↔ hatály szétválasztás érvényes marad, de az „örök" feltételessé válik.

**→ Ezzel az N2 (GDPR-törlés ↔ megmásíthatatlanság) MEGOLDÓDIK:** ha semmi nem marad
örökre magától, csak amit valaki aktívan tart, akkor **a felejtés a rendszer
alapállapota** — nem kell „törlés" funkciót építeni a megmásíthatatlanság ellen.

### D15. A kulcs hitelesít, nem titkol — a helyreállítás több tanúból áll (2026-08-25)

**A kulcsnak a koinóban egyetlen dolga van.** Egy kulcspár kétféle munkát végezhet:
**hitelesítés** („ez tényleg ő") és **titkosítás** („csak ő olvashatja"). A koino
**szándékosan nyilvános** — a tartalom, a tudatpont, a név mind az —, ezért a titkosítási
munkából alig marad valami (egyedül a szavazat, D2).

> **A kulcs nem páncélszekrény, hanem aláírás.** Aki ellopja, nem megtud rólad valamit,
> hanem **beszél helyetted**.

**A visszaélés-tábla — és a benne rejlő aszimmetria:**

| Visszaélés | Visszafordítható? |
|---|---|
| **Elviszi a pénzedet** | ❌ **soha** *(→ D16 oldja meg)* |
| Átrendezi a tudatpontjaidat | 🟡 újra kiosztható |
| Szavaz a nevedben | ✅ a szavazat módosítható |
| Javaslatot tesz a nevedben | ✅ visszavonható |
| Tartalmat ír a nevedben | 🟡 törölhető, de olvasták |

**Egyetlen visszafordíthatatlan sor van, és az a pénz.** Minden más feljegyzés, amit a
koino amúgy is folyamatosan felülír.

**Miért nehezebb ez P2P-ben:** ma van kihez fordulni (az üzemeltető visszaállít, a
`tokenVerzio` kiléptet). P2P-ben **nincs fellebbviteli fórum** — a kulcs maga az azonosság.
Ez a probléma valódi magja.

**A koino megoldása — amivel a Bitcoin nem rendelkezik:** ott a kulcs MAGA a számla, nincs
mögötte ember. A koinóban az e-ember **személy, akiért mások kezeskedtek** (D1). Ezért:

> Nem a kulcsot állítjuk helyre, hanem **új kulcsot** veszel fel, és **tanúk igazolják,
> hogy te vagy.**

**A helyreállítás TÖBB FÜGGETLEN FORRÁSBÓL áll — egyik sem elegendő egyedül:**

| Forrás | Státusz | Megjegyzés |
|---|---|---|
| **Bizalmi háló tanúi** | alapút, mindig | akik eredetileg is beengedtek |
| **EUDI-tárca** | opcionális, **kihagyható** | Csaba: *„vannak nagyon becstelen kormányok, kik visszaélhetnek vele"* |
| **Választott bizottság** | opcionális | akár személyes megjelenéssel — az **N9 mintája** |

**A bizottság az N9 újrahasznosítása**, nem új mechanizmus: az N9 már így írja le a
vészhelyzeti „őröket" — *időkorlátos mandátummal, nyilvános lépésekkel, utólagos közösségi
jóváhagyással*. Ugyanaz az alakzat, másik tárgyra.

> **A DÖNTŐ SZABÁLY: a bizottság TANÚ legyen, ne HATÓSÁG.** Ha a szava önmagában elég,
> **királyt csináltunk**. Ha egy a több szükséges jel közül, akkor tanú.

**Három veszély, kimondva:**
1. **A bizottság kisebb célpont, mint egy kormány.** Egy államot megnyomni nehéz, hét
   embert megfélemlíteni vagy megvesztegetni olcsó. Aki kulcsot adhat, **bárkivé válhat**.
2. **A személyes megjelenés kizár** — mozgásképtelen, távoli, menekülő embereket; megint
   azokat, akiknek a legjobban kellene.
3. **Mit néz meg a bizottság?** Ha **okmányt**, akkor a kormányt nem kiszerveztük, hanem
   **elszámoltathatatlan közvetítőt tettünk elé** — rosszabb lett. Ha **ismeretséget**,
   akkor ez már nem bizottság, hanem maga a bizalmi háló, intézményesítve.

**Nyitott paraméter** (→ D13/b): hány tanú kell, milyen súllyal, mekkora várakozással.

### D16. A pénz lassú, nyilvános és megtámadható (2026-08-25)

**Az irreverzibilitás DÖNTÉS, nem természeti törvény.** A kripto döntött így — és pont
ettől lett a kulcslopás végzetes. A koino minden más döntésnél az ellenkezőjét teszi:

> „A döntést nem elvesszük, hanem **lelassítjuk és megdrágítjuk**." — D10

Minden javaslatnak van minimum döntési ideje, nyilvános, és amíg tart, bárki reagálhat.
**A pénz ne legyen kivétel.** A nagyobb átutalások örököljék a koino tempóját:
**késleltetve, nyilvánosan, a várakozási ablakban megtámadhatóan.**

| Eset | Mi történik |
|---|---|
| Ellopják a kulcsod, de **neked is megvan** | látod a függő átutalást, és **megállítod** |
| Ellopják és **ki is zártak** | a D15 helyreállítása **beleér az ablakba** |
| Csak **elvesztetted** | nincs tolvaj, nincs sietség — a lassú út elég |

Ezzel a kulcslopás **túlélhetővé** válik. Nem külön mentőöv: ugyanaz az elv, amiből az
egész koino épül. *(A bankoknál is van visszahívási ablak; a kripto azért nincs, mert ott
nincs kihez fordulni — a koinóban **van**: maga a közösség.)*

**Az értesítés teszi valóságossá az ablakot** — papíron egy ablak semmit nem ér, ha nem
tudsz róla. Az infrastruktúra **megvan** (a 2026-08-24-i értesítés-rendszer: azonnali vagy
összefoglaló, bekapcsolható ütemmel) — csak új értesítés-típus kell.

> ⚠️ **Tervezési kényszer:** az értesítés olyan csatornára menjen, ami **NEM ugyanaz az
> eszköz**, mint amin a kulcs van. Ellopott telefonon a tolvajnál van a kulcs ÉS az
> értesítés is.

**Az ár őszintén:** a koino-pénz **nem lesz azonnali**. Cserébe **nem lesz
visszafordíthatatlan**.

**Nyitott paraméter** (→ D13/b): mekkora összeg fölött legyen késleltetés, milyen hosszú
az ablak.

### D17. A konszenzus hatóköre és biztonsági alapja (2026-08-25 — az N8 áthidalása)

*A D7 („személy-alapú konszenzus") folytatása. A **D14 megváltoztatta a feladatot**: az N8
„kutatási terep" minősítése egy NAGYOBB tartós magot feltételezett.*

#### A hatókör: mihez kell egyáltalán globális egyetértés?

| Művelet | Globális egyetértés? | Mi elég helyette |
|---|---|---|
| Tartalom létrehozása | ❌ | senki nem ütközik senkivel |
| Tudatpont-hozzárendelés | ❌ | **saját lánc-következetesség** — a saját keretedből osztasz, bárki utánaszámolhat |
| Szavazás | ❌ | ugyanaz — a kettős szavazás a SAJÁT láncod ellentmondása |
| Egy javaslat eredménye | ❌ | **determinisztikus számítás** — ugyanabból a bemenetből mindenki ugyanazt kapja |
| **Azonosság egyszerisége** | ✅ | — |
| **Pénz** (később) | ✅ | — |

> **A tartós mag és a globális konszenzus UGYANAZ A HALMAZ.** Amit örökre meg kell őrizni,
> arról kell megegyezni; amit el lehet felejteni, arról nem. A D14 tehát nem csak a
> tárolást csökkentette — **a konszenzus-problémát is összezsugorította.**

Amit a többi igényel helyette, az két olcsóbb dolog: **(1) saját lánc-következetesség**
(a „számla-láncos" minta, amit az N8 már megnevez: ne tudj két különböző változatot mutatni
két különböző embernek), és **(2) elérhetőség** — hogy mindenki lássa ugyanazokat a
szavazatokat. Ez utóbbi nem konszenzus-, hanem terjesztési kérdés, és a koino órás–napos
döntési ablakai bőven adnak rá időt.

#### A D16 másodszor is fizet

A konszenzus azért drága, mert rendszerint **azonnali véglegességet** követelnek (a Bitcoin
~egy órát kér, és attól szenved). A **D16** kimondja, hogy a koino-pénz lassú, nyilvános és
az ablakban megtámadható — **tehát a konszenzusnak nem kell másodpercek alatt döntenie.**
Nagyságrendekkel könnyebb feladat. A D16-ot kulcslopás ellen hoztuk; közben megoldotta a
konszenzus legdrágább követelményét is.

#### A biztonsági alap — Csaba elfogadta (2026-08-25)

> **A konszenzus biztonsága = az identitás-réteg biztonsága. Semmi más.**

Nincs bányászat, nincs letét, nincs vagyon — egyetlen kérdés van: **valódi, különböző
emberek-e a szavazók.** Ez egyszerű és elegáns, de **egyetlen ponton koncentrálja a
kockázatot**: ha a D1 (bizalmi háló + EUDI) megtörik, nem egy funkció romlik el, hanem
minden egyszerre.

**Következmény a Fázis 2 SORRENDJÉRE:** az identitás-réteg nem egy a részrendszerek közül,
hanem **a gerinc, amin az összes többi áll** — tehát elsőként kell állnia.

#### A köztes méret veszélyzónája — a D11-minta általánosítva (Csaba elfogadta)

- **Kicsiben** (család, osztály, munkahely) nincs baj: **ismeritek egymást**, vita esetén
  megkérdezitek egymást — a konszenzus társas.
- **Nagyban** a háló sűrű, a hamis azonosság aránya elenyészik.
- **Köztes méretben** — már nem ismersz mindenkit, de még kevés hamis azonosság is sokat
  számít — ott a legsérülékenyebb. *(Az N8 ezt „mi véd a kis-hálózatos korai fázisban"
  néven már felvetette; válasz nem volt rá.)*

**A szabály:** minden koino **maga dönti el, mikor kapcsolja be a „drágább" képességeket**
(pénz, nagy tétű globális döntések) — a mérete és a hálója erőssége szerint. Ez a **D11**
logikája („pénz csak bizonyított identitás-réteg után") általánosítva, és egybevág a
**D13/b** paraméter-pluralizmussal.

*(A D14 után amúgy is alig van, amit globálisan érdemes lenne megtámadni.)*

#### Ami nyitva marad az N8-ból

1. **Érvényesítő-kiválasztás.** Nem követelhető meg, hogy az e-emberek többsége online
   legyen. Kell egy kiválasztott részhalmaz — de a kiválasztásnak **megjósolhatatlannak és
   befolyásolhatatlannak** kell lennie, különben a támadó megvárja, míg az ő emberei
   kerülnek sorra. Vannak rá bevált eszközök (ellenőrizhető véletlen), de nem triviális.
2. **A köztes zóna gyakorlati paraméterei** — mikor „elég erős" egy háló.

> ⚠️ **Módszertani figyelmeztetés:** a D17 levezetése **saját következtetés**, nem kész
> szakirodalom. A hatókör-szűkítés érvelése erős, de az 1. pont (érvényesítő-kiválasztás)
> tényleges megoldását elosztott rendszerek irodalmához kell mérni, mielőtt kódot írunk.

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
- **git** *(2026-08-25)* — nem adat-jelölt, hanem **működő precedens** és a KÓD-terjesztés
  jelöltje: tartalom-címzett objektum-DAG, natív merge, teljes replikáció, hash-ellenőrzött
  történet — mindez központi hatóság nélkül, világméretben bizonyítva. A D9 ellenőrzési
  fele gyakorlatilag kész technológia (az egyezmény megnevez egy commit-hasht). **Nem ad
  konszenzust, identitást és jogosultságot** — a nehéz felét nem. Részletes elemzés lentebb:
  „A git mint minta". ⚠️ A **GitHub** ≠ git: a GitHub a Microsoft tulajdona, arra
  kormányzást építeni a D12-t érvénytelenítené.
- FONTOS KORLÁT mindnél: végső (eventual) konzisztencia ≠ tartós mag — szavazás-
  véglegesség, egyezmény-örökség és duplikátum-védelem EGYIKBŐL SEM jön; a tartós mag
  (N1) és az identitás (N4) külön megoldás marad. Egyik sem bizonyított országos
  léptékben.

---

## A git mint minta — mit vehet át a koino, és mit NEM (2026-08-25)

*Csaba kérdésére: „a GitHub egy jól kidolgozott verziókezelő platform, és független is —
a koino tudna a rendszerére támaszkodni?" A válasz kétfelé válik.*

### Először a tévedés: a GitHub NEM független

A GitHub a **Microsoft** tulajdona (2018, 7,5 mrd USD). Egyetlen cég, egyetlen jogrend,
egyetlen felhasználási feltétel. Nem elméleti aggály: **2019-ben szankciós okokból
zárolta iráni, szíriai és krími fejlesztők fiókjait** — a hozzáférés egy cég döntésén és
egy állam politikáján múlik.

> Ha a koino kód-kormányzása a GitHubra épülne, a **D12** állítása — hogy nincs teteje —
> egyszerűen nem lenne igaz: **a Microsoft lenne a tető.**

**A `git` ezzel szemben senkié**: nyílt forrású (GPL-2.0), és **eleve elosztott** — nincs
benne központi szerver, minden klón teljes értékű, a teljes történettel. Az ítélet tehát:
**a gitre igen, a GitHubra nem.**

*(A 2026-08-25-i nyilvánossá tétel + AGPL ezt a függést a gyakorlatban már meg is
szüntette: bárki klónozhat, és minden klón teljes biztonsági mentés.)*

### Az érdemi átfedések

A git nem analógia, hanem **működő precedens**: bizonyítja, hogy elosztott,
hash-ellenőrzött, forkolható-egyesíthető adatmodell világméretben működik, központi
hatóság nélkül — évekkel a blokklánc divatja előtt.

| A koino igénye | Amit a git már megoldott | Miért fontos |
|---|---|---|
| **DAG entitás-láncokból** (N8) | a commit-történet pontosan egy DAG; a merge-commitnak több szülője van | az N8 „kutatási terep" — de a DAG-alakzat maga bizonyított |
| **Az egyesítés legyen natív** — lineáris láncban rémálom | a `merge` alapművelet | egybevág az N8 megállapításával |
| **Fork: a teljes történet lemásolódik, közös múlt + külön jövő** (D13) | szó szerint ez a `clone` + saját ág | a D13 nem újdonság a világban, csak a koinóban |
| **Hamisíthatatlan történet hash-ellenőrzéssel** (D9) | minden objektum a TARTALMA lenyomatával azonosított — a múlt átírása minden leszármazott azonosítót megváltoztat | **tartalom-címzés = ingyen manipuláció-bizonyíték** |
| **TÉNY örök ↔ HATÁLY elavulhat** (D8) | a git szétválasztja a **megváltoztathatatlan objektum-DAG-ot** a **mozgatható mutatóktól** (branch/tag) | a D8-at magunktól találtuk ki — a git implementálja |
| **Tudatpont = tárolási vállalás, érdeklődés-vezérelt replikáció** (D3) | `partial clone`, `sparse checkout`, `shallow clone` — részleges másolat ismert kompromisszumokkal | a D3 „csak azt tárolom, ami érdekel" mérnökileg megoldott terep |
| **Csomópontok szinkronizálása** | a fetch-protokoll alkudozása („mim van / mi kell") a minimális átvitelről | P2P-ben ugyanez a probléma, kipróbált megoldással |
| **„Tényleg ez az e-ember tette?"** központi hatóság nélkül | aláírt commitok/tagek (GPG/SSH) | kriptográfiai szerzőség-bizonyíték precedense |

### Három konkrét fejlesztési nyom

**1. A D9 ellenőrzési fele gyakorlatilag kész technológia.** A D9 szerint a kliens az
elfogadott kód-egyezmény alapján, **hash-ellenőrzéssel** áll át. De a git-commit MAGA egy
hash. Vagyis: **az egyezmény megnevez egy commit-azonosítót; a kliens klónozza — bárhonnan
—, és ellenőrzi, hogy azt kapta.** Nem kell hozzá letöltő-szerver, sem GitHub; a git
peer-to-peer is működik.

**2. A KÖZÖS ŐS (merge base) — és a felismerés, hogy már meg is van.** A git nem egyszerűen
összefésül két ágat: megkeresi a **közös ősüket**, és ahhoz képest nézi, ki mit
változtatott (három-utas összefésülés). Ami csak az egyik oldalon változott, magától
átmegy; ami mindkettőn, azt ütközésként az ember elé teszi.

> A koino **különvált ágainak újraegyesítése** (a 6. döntés ígérete) pontosan ezzel a
> problémával fog szembenézni. És a **merge base már rögzítve van**: a
> `models/kulonvalasResz.js` `forrasJavaslatId` / `forrasEgyezmenyId` /
> `kulonvalasIdeje` hármasa **pontosan azt mondja meg, honnan indult a szétválás**.
> Ez akaratlanul készült el — de amikor az újraegyesítést tervezzük, ez lesz a horgony.

**3. A tartalom-címzés csökkentheti, mi kerül a láncra (D5/N1).** Ha egy entitás
azonosítója a tartalmának + előzményének lenyomata, akkor az entitás-lánc **önmagát
igazolja** — nem kell a lánc ahhoz, hogy bizonyítsuk, senki nem írta át a múltat. A lánc
szerepe így **horgonyzásra** szűkül (az N8 már ezt mondja: „az entitás-láncok időnként
bele-pecsételik az állapot-ujjlenyomatukat"). A git bizonyítja, hogy a horgony lehet
**ritka**.

### Ahol az átvitel NEM működik — ez a fontosabb fele

| A git NEM ad | Miért kritikus a koinónál |
|---|---|
| **Konszenzust** | a git SOHA nem dönti el, melyik ág az igazság — azt ember dönti el, kézzel. **A koino lényege épp a közös döntés.** A git a HORDOZÓT adja, a KORMÁNYZÁST soha. Aki azt mondja, „használjatok gitet", az a nehéz felét hagyta ki. |
| **Identitást** | a commit szerző-mezője szabad szöveg — bárki bárkinek kiadhatja magát (az aláírás segít, de a git nem tud „egy ember = egy fiók"-ról). A D1/N4 teljesen a git hatókörén kívül van. |
| **Jogosultságot** | a git nem ismer hozzáférés-vezérlést — **pontosan ezért létezik a GitHub üzletként**. A tudatpont-alapú jogosultság külön réteg marad. |
| **Jelentés-szintű összefésülést** | a git SOROKAT fésül össze. A koino **jelentést** egyesít: két tartalom egyesítése emberi ítélet, nem szöveg-diff. **A közös-ős GONDOLATA átvihető, az ALGORITMUS nem.** |
| **A koino DAG-ja gazdagabb** | a git-commit csak a saját előzményére mutat, egy repón belül. A koinóban egy esemény **két láncot köt össze** (cselekvő + entitás, N8) — ez inkább több-láncú főkönyv, mint git. |

### A SHA-1 csapda (mérve, 2026-08-25)

A koino repója **SHA-1** objektum-azonosítót használ (`git rev-parse
--show-object-format` → `sha1`, 40 hex karakter). A SHA-1 ütközés-ellenállását **2017-ben
feltörték**; a git tett ellene védelmet, és a hétköznapi használatban ez nem gond.

**De amint biztonsági garanciát építünk rá — márpedig a D9 pontosan az —, SHA-256 módú
git kell.** Ez létezik, külön be kell kapcsolni, és **nem visszamenőleg**. Nem most kell
megoldani; a D9 tervezésekor ez az első kérdés.

### Amire NE támaszkodjunk

A GitHub **kormányzási** felületére (pull request, issue, jogosultság, moderálás): ezek egy
cég fiókrendszerén és szabályzatán állnak. **A kód-módosítási javaslat helye a koino
fája** — a GitHub legfeljebb a bájtokat szállítja. → új híd-feladat: **H8**.

---

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
- **H8. Kód-terjesztés függetlenítése a GitHubtól** (2026-08-25) — két lépés, mindkettő
  olcsó:
  1. **Tükör-másolat egy második, független szolgáltatónál** (jelölt: Codeberg — nonprofit,
     európai). Egyetlen további `git push`, és a koino kódja két, egymástól független
     helyen van. *(A nyilvános repó + AGPL már ma is azt jelenti, hogy minden klón teljes
     biztonsági mentés — ez csak felezi a kiesés esélyét.)*
  2. **Verzió-végpont**: a futó példány mondja meg, melyik commitból épült. Ma semmiből nem
     állapítható meg, hogy a koino.hu a közzétett kódot futtatja-e — elég egy elfelejtett
     deploy, és a GitHub meg az éles kód némán szétcsúszik. Nem bizonyíték (hazug szerver
     hazudhat), de a VÉLETLEN szétcsúszást kizárja, és megteremti a szokást, hogy ez
     ellenőrizhető adat. Ez a 4. lépcső („ki kényszeríti ki, hogy az elfogadott kód
     fusson") legkisebb, Fázis 1-ben is megtehető darabja.
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
- **2026-08-25 (2)** — Csaba két döntése lezárta a fenti két szálat: **nem lesz védjegy**
  (vállalja a kockázatot; a védjegy hatóságot igényelne → visszahozná a „tetőt"), és **a
  pénz szétváláskor nem duplázódik** (külön név, 0 értékről). A repó **nyilvános lett**
  (AGPL-3.0 licenccel, `0b9c996`). Csaba kérdésére új szakasz: **„A git mint minta"** — a
  git nem analógia, hanem működő precedens (tartalom-címzett DAG, natív merge, teljes
  replikáció); a **D9 ellenőrzési fele gyakorlatilag kész technológia** (az egyezmény
  megnevez egy commit-hasht), a különvált ágak újraegyesítéséhez pedig **a merge base már
  rögzítve van** a `kulonvalasResz`-ben. De a git **nem ad konszenzust, identitást és
  jogosultságot** — a nehéz felét nem. ⚠️ A **GitHub ≠ git** (Microsoft-tulajdon) → új
  híd-feladat: **H8** (tükör + verzió-végpont). Mérve: a repó SHA-1 objektum-azonosítót
  használ — a D9-hez SHA-256 módú git kell majd.
- **2026-08-25 (3)** — **A Fázis 2 elméleti hidak átvizsgálása ELINDULT.** Csaba döntése:
  előbb a legkritikusabb problémákat hidaljuk át elméletben, és csak utána jön a részletes
  terv és a kódolás. Indok: *„ha az lesz a vége, hogy ez lehetetlen, akkor tényleg nem
  világmegváltás lesz belőle, hanem csak esetleg egy hasznos program, és akkor úgy is
  állok hozzá"* — plusz az ismertető anyagokhoz tudni kell, mit lehet kihozni a koinóból.
  - Claude **helyesbítette** korábbi pesszimizmusát: rossz dolgokhoz hasonlított
    (a Holochain általános platform, a Matrix szándékosan föderált), és a **D13 előtti
    léptékhez** mért (globális konszenzus), pedig a D13 azt már átírta.
  - **Az 1. probléma (kulcskezelés és helyreállítás) ÁTHIDALVA** → **D14–D16** és a
    **D13/b**. Két korábbi nyitott kérdés lezárult (**N2** teljesen, **N6** fele), az
    **N9** kiterjedt, a **D5** határa áthelyeződött, a **D8** „örök"-je feltételessé vált,
    a **D10** pénzképe pedig tempót kapott.
  - **Az N3 (titkos-ellenőrizhető szavazás) ÁTFOGALMAZÓDOTT** — lásd ott: nem egy probléma,
    hanem kettő, és a nehezebbik elvi korlát, nem kutatási feladat.
  - **Következő:** N8 — személy-alapú konszenzus.
- **2026-08-25 (4)** — **A 2. probléma (személy-alapú konszenzus) NAGYRÉSZT ÁTHIDALVA**
  → **D17**. A kulcs-felismerés: **a tartós mag és a globális konszenzus ugyanaz a halmaz**,
  tehát a D14 nem csak a tárolást, hanem a konszenzus-problémát is összezsugorította — az
  N8 „kutatási terep" minősítése egy nagyobb tartós magot feltételezett. A **D16** (lassú
  pénz) másodszor is fizetett: elvette az azonnali véglegesség követelményét, ami a
  konszenzus legdrágább része. Csaba két döntése: (1) elfogadja, hogy **a konszenzus
  biztonsága teljes egészében az identitás-rétegre támaszkodik** → az identitás a Fázis 2
  gerince, elsőként kell állnia; (2) a köztes méret veszélyzónájára a **D11-minta**
  általánosítva — minden koino maga dönti el, mikor kapcsolja be a drágább képességeket.
  **N1 kétharmada is lezárult** ennek melléktermékeként (a „mi kerül bele" a D14-től, a
  „hogyan írható" a D17-től); nyitva a tartós mag replikációja.
  **Következő:** N1 maradéka + a Fázis 2 sorrendjének megtervezése.
