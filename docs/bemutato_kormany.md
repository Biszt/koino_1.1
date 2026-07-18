# koino — bemutató dokumentum a kormány részére (MUNKAPÉLDÁNY, v2.2)

*Készült: 2026. július 17. — Csaba átszerkesztett változata, Claude formai javításaival
és a Csaba által eldöntött módosításokkal (v2.2). Csaba végső átolvasására vár.*

---

## Bevezető

Tisztelt Döntéshozók!

Lőrincz Csabának hívnak, Vértesszőlősön élek. Két éve fejlesztek egy közösségi
döntéshozatali platformot, amelynek neve **Kollektív Intelligencia Online — röviden
koino**. A koino egy online közösségi tér, amelyet a használói irányítanak: nem egy
cégé és nem egy kormányé, hanem azoké, akik használják. A célja, hogy a közösségek ne
csak beszélgetni tudjanak egymással, hanem egyezségre is jutni — bármilyen témakörben,
központi szereplők nélkül.

Ezt a programot ajándéknak szánom minden embernek a Földön — elsősorban a magyaroknak.
Ma még egyedül dolgozom rajta, ezért biztosan nem tökéletes; éppen ezért úgy építem,
hogy a fejlesztés irányát fokozatosan maga a közössége vegye át, és az én szerepem —
minden többlet-befolyásommal együtt — tervezetten megszűnjön.

**A kérésem egyetlen, jól körülhatárolt dolog megfontolása:** a fejlesztés második
fázisában — ha a koino közössége erre felhatalmazást ad — a kormány kibocsátóként
**küldjön meghívót az állampolgárainak** a koino-regisztrációhoz. Ezzel sokat
segítene a koinonak abban, hogy a regisztrációk hitelesek legyenek, és így juthatna
el a koino a legszélesebb körben a magyarokhoz — határon innen és túl. Most, az első
fázisban ehhez csak annyit kérek: ismerjék meg a projektet, és maradjon nyitva a
párbeszéd.

## A koino alapszándékai

- **Egyenlőség.** Minden regisztráló a koinoban **e-ember** — nem „felhasználó". Ez
  azért fontos, mert itt a regisztráló egyszerre tulajdonos, fejlesztő, moderátor és
  haszonélvező is. Mindenki egyenlő tudatponttal indul (10 000): mindenkinek vannak
  tudatpontjai, és mindenkinek ugyanannyi. A tudatpontokat nem lehet elkölteni, csak
  szétosztani. A tudatpont mutatja meg, mi fontos egy embernek és a közösségnek.
  Hozzárendelhetik tartalmakhoz, közösségi részekhez, de ami a legfontosabb: bármikor
  visszarendelhetik és átszervezhetik őket.

  Ez azért lényeges, mert a koino nem szeretné jutalmazni azt, hogy az emberek
  folyamatosan a telefont nyomkodják. Egy csendes, ritkán jelen lévő ember ugyanakkora
  alaperővel rendelkezik a prioritások kiosztásában, mint az, aki folyamatosan aktív.

- **Szavazás.** A döntéseknél mindenki egyenlő — a tudatpont mennyisége nem ad több
  szavazatot. A közösség szavazással dönthet például arról, hogy mit módosítsunk, mit
  töröljünk, vagy hogyan rendezzünk át egy témát, valamint arról, hogy milyen irányban
  történjen a program fejlesztése.

Amint elkészült a kezdeti verzió, és létrejött az első közösség, én sem leszek több,
mint bárki más. Én is tehetek javaslatot, én is fogok szavazni, de az irányt nem én
határozom meg.

- **Önkormányzás.** A koino szabályait — hosszú távon magát a forráskódját is — a
  közössége alakítja, javaslatok és egyezmények útján. A demokráciát három területre
  szeretné elvinni: a közéleti párbeszédbe (hiteles szándék-jelzésként), az online
  térbe (közösen irányított felületként), és — távlatban, szigorú feltételekkel —
  a pénzügybe.

## Első fázis — a központi szerveres koino (ez épül ma)

A koino már képes arra, hogy bemutassa, ahogy teszt e-emberek közös nevezőre jutnak
központi szereplők nélkül, de optimalizációra és a hiányosságok pótlására még szüksége
van. A frontend elkészülte után az első közösség már képes lesz tartalmakat létrehozni,
amelyekhez általuk létrehozott kategóriákat tudnak rendelni — például tudomány,
természetvédelem, politika, programfejlesztés. További rendszerezést az általuk
létrehozott tartalomtípusok adnak, mint például kérdés, válasz, témakör, ismeret,
feladat, feladatvállalás. A regisztráció meghívásos alapon működik.

A létrehozott tartalmak felett azok rendelkeznek, akik tudatpontot rendeltek hozzájuk.
Ők képesek javaslatot tenni módosításra, áthelyezésre, törlésre vagy több tartalom
egyesítésére, például hasonlóság miatt. Minden tartalomnak vannak küszöbértékei,
amelyek meghatározzák, mekkora támogatottság és mekkora részvételi arány szükséges
ahhoz, hogy egy javaslat elfogadásra kerüljön, és egyezmény legyen belőle. Továbbá
minimum és maximum döntési idővel is rendelkeznek — ezek az értékek határolják be egy
javaslat döntési idejét.

Azt, hogy a minimum vagy a maximum időhöz közelít-e a döntés, a bizonyossági mutató
határozza meg. Ha egy javaslatnak jóval nagyobb a támogatottsági aránya, mint az
ellenzői aránya (vagy fordítva), és a részvételi arány is magas, akkor hamarabb eljön
a döntés ideje. Ha viszont közel egyenlő a támogatás és az ellenzés, és a részvétel is
alacsony, akkor tovább tart a döntés. Az értékeket is közösen határozzák meg a
tulajdonosok.

## Második fázis — az elosztott (P2P) koino (ez a terv)

A második fázisban a koino elhagyja a központi szervert: az adatait a tagok
készülékei tárolják, a szabályait a hálózat együtt érvényesíti. Ez
kutatás-fejlesztési feladat — részletes terve elkészült, a legfontosabb elemei:

- **A tudatpont tárolási vállalás is.** Minden entitást azok a készülékek tárolnak,
  amelyek tulajdonosai tudatpontot rendeltek hozzá. Amivel senki nem törődik, az
  elenyészik; ami sokaknak fontos, azt sokan őrzik — központi archívum nélkül.
- **Tartós mag:** a regisztráció-bizonyítékok, a szavazási eredmények és az
  egyezmények külön, mindig és mindenhol replikált rétegben élnek — a megszületett
  megállapodás nem veszhet el és nem hamisítható meg. Ebbe a rétegbe személyes adat
  soha nem kerül, csak olyan kriptográfiai bizonyíték, amelyből az adat nem
  állítható vissza.
- **Titkos, de ellenőrizhető szavazás:** cél, hogy az eredményt bárki
  hitelesíthesse, miközben az egyéni szavazat nem visszafejthető, és nincs szereplő,
  akinél többlet-adat halmozódna fel.
- **A kód a közösségé:** az elfogadott kód-módosításokat a hálózat ellenőrzött,
  automatikus frissítéssel veszi át; a rendszer működtetéséhez rám többé nincs
  szükség. Ha pedig a közösség egy módosításban végül nem ért egyet, a hálózat több
  ágra válhat: párhuzamos koinók jöhetnek létre, amelyek a közös múltat mind
  megőrzik, és a jövőjükről külön-külön döntenek. Ez nem hiba, hanem a végső
  biztosíték arra, hogy a koinót senki — én sem — sajátíthatja ki.

A koino nem kriptovalutával kezdődik: először döntéshozatalt építünk és egyezményeket
hozunk létre — de ha a közösség úgy dönt, létrejöhet az első olyan pénz, amelyet a
közössége felügyel.

## Zárás

A projektet szívesen bemutatom részletesen, írásban vagy személyesen. Köszönöm, hogy
elolvasták, és kérem, továbbítsák annak, akinek a megfontolása a hatáskörébe tartozik.

Tisztelettel:

**Lőrincz Csaba**
Vértesszőlős
biszt5@gmail.com

---

## Szerkesztői jegyzetek (a végleges változatból törlendők)

- **v2.1 (2026-07-17):** Csaba átszerkesztette a dokumentumot (az eredeti levelek
  legjobb részei vissza; a Fázis 1 leírás az eredeti részletes szöveggel; új indoklás
  a kérésnél). Claude formai javítások + a párhuzamos koinók (fork) bekezdése a csupa
  nagybetűs jegyzet helyére.
- **v2.2 (2026-07-17) — Claude 6 észrevételének sorsa (Csaba döntött):**
  (1) védő-mondatok visszaállítása — ELVETVE (Csaba: magától értetődik, a
  meghívó-küldés nem tesz a kormányból adat-tulajdonost); (2) „hitelesített
  szándék-jelző / ilyen eszköz nem létezik" — ELVETVE (Csaba: a hitelesség csak a
  2. fázisban áll be, és nem csak a botok a probléma); (3) EUDI/DÁP-bullet — KIMARAD,
  a téma KÉSŐBB ÁTBESZÉLENDŐ (Csaba nyitott kérdése: sérti-e az EUDI-út a teljes
  decentralizációt? → fejlesztesi_terv_fazis2.md eIDAS-szakasz); (4) pénz-duplikáció —
  Csaba törölte az alapszándékokból (a kapuk/„hozamot nem ígér" visszaemelése nélkül,
  Csaba döntése); (5) meghívásos regisztráció az 1. fázisban — BEÉPÍTVE („A
  regisztráció meghívásos alapon működik."); (6) „társadalmi többség felügyel" →
  „közössége felügyel" — ÁTÍRVA. + Az Önkormányzás pont jelölője helyreállítva.
- **Tudatosan kimaradt** (a vita eredményei alapján, változatlanul): párt-megszólítás;
  személyes adatok pártnál/kormánynál kezelése; „minden szavazás nyilvános"; „P2P kész
  technológia"; fiat-elavultság tétel; világbéke/Trump/Brüsszel.
- **Döntések LEZÁRVA (2026-07-17):** címzett = a kormány (a cím és a megszólítás
  marad); a világbéke-gondolat VÉGLEG elmarad; „állampolgárainak" tudatos, nincs
  korhatár (16 év alatt GDPR szülői hozzájárulási lépés — megvalósítási részlet,
  lásd fejlesztesi_terv_fazis2.md). **Egyetlen nyitott teendő: Csaba végső átolvasása
  — utána a szerkesztői jegyzetek törlésével a dokumentum KÜLDHETŐ.**
