# Platform-függetlenség — az elméleti híd

*Készült: 2026. 08. 28. — Csaba befagyasztotta a fejlesztést, amíg ez a kérdés elméletben
nincs áthidalva (**D30**), majd a híd elkészülte után feloldotta. A kiváltó ok: a Google
2026 szeptemberétől (globálisan 2027-től) megköveteli, hogy minden tanúsított
Android-készülékre telepített alkalmazás **azonosított, nála regisztrált fejlesztőtől**
származzon — a bolt nélküli telepítésre is.*

> **A kérdés, ahogy Csaba feltette:** *„a technikai korlátozhatóságoknak nem szabad, hogy
> hatni tudjanak a koinóra."*

---

## 0. Két korlát, amit a válasznak be kell tartania

Ez a két megkötés Csabáé, és **tervezési korlát, nem vélemény**:

1. **A védelem nem lehet jogi.** *„A jogi részek egyáltalán nem érdekelnek."* Nem
   támaszkodunk EU-szabályozásra, versenyjogi döntésre, hatósági fellépésre. Egy
   szabályozás megváltozhat, egy per elveszhet, és minden ország más. Amit építünk, annak
   **akkor is állnia kell, ha senki nem áll mellénk.**
2. **A fenyegetés szándékos.** *„Ha a koino híre eljut a Google-hez, akkor ő ahol tudja,
   gáncsolni fogja."* Nem véletlen mellékhatásra tervezünk, hanem célzott akadályozásra.

---

## 1. A hat beavatkozási pont — hogy ne ködben vitatkozzunk

A „gáncsolni tudják" nem egy dolog. Hat különböző pont, nagyon eltérő nehézséggel:

| # | Hol | Mit tud tenni a platform | Meddig ér el |
|---|---|---|---|
| 1 | **Terjesztés** | boltból kivenni; a weboldalról telepítést azonosításhoz kötni; domaint elvenni | a program **megszerzését** nem tudja megakadályozni |
| 2 | **Telepítés / futtatás** | a lezárt készülék megtagadja a jóvá nem hagyott kód futtatását | ⚠️ **ez az egyetlen valódi kapu** |
| 3 | **Működés futás közben** | — | **semmit**: futó programot nem felügyel senki |
| 4 | **Hálózat** | NAT, tűzfal, nincs bejövő kapcsolat | csak a **kényelmet** rontja |
| 5 | **Megtalálás** | keresőből kivenni, domaint elvenni | csak az **új belépőt** nehezíti |
| 6 | **Pénz** *(D10/D16, később)* | a boltok a fizetést is szabályozzák | ⚠️ **a legkeményebb kar** — még megoldatlan |

⭐ **A legfontosabb sor a 3-as.** Az operációs rendszer nem felügyeli, hogy egy **futó**
program kivel beszélget, mit olvas, milyen kapcsolatot nyit. **Nincs második kapu.** Ezért
az egész fenyegetés egyetlen kérdésre szűkül:

> **Futhat-e egyáltalán a program ezen a készüléken?**

Ez jó hír, mert egy pontot könnyebb megkerülni, mint egy hálót — és rossz hír, mert az az
egy pont a készülék gyártójának kezében van.

---

## 2. ⚠️ Amit a böngészőről tévesen gondoltunk (és Csaba megtalált)

Az első válasz-kísérlet az volt, hogy **a böngésző a mentőöv**: azt nem érinti a
fejlesztő-ellenőrzés, tud aláírni (WebCrypto), és tud kapcsolatot kezdeményezni.

**Csaba kérdése ezt megbuktatta:** *„mi van, ha a Google meggyőzi a böngészők
tulajdonosait, hogy ők is gáncsolják a koinót?"* — és igaza volt:

| Böngésző | Kié a motor |
|---|---|
| Chrome | Google |
| Edge, Brave, Opera, Vivaldi | **a Google motorja** (Chromium) |
| Firefox | saját motor, de a bevétele túlnyomó része a Google-től jön |
| iPhone-on minden | Apple motorja |

És van **ma is működő** eszköz: a **Safe Browsing** tiltólista, amit a Google állít össze —
és nem csak a Chrome használja, hanem a Firefox és a Safari is. Egyetlen lista, majdnem az
összes böngésző.

Ráadásul két súrlódás **már most létezik**: egy HTTPS-lap nem beszélhet titkosítatlan
helyi géppel, és a böngészők egyre szigorúbban tiltják, hogy egy weboldal a helyi
hálózatra kapcsolódjon — vagyis épp azt, amire szükségünk lenne.

> **Tanulság: a böngésző kényelmi sáv, nem híd.** Használjuk, amíg lehet, de semmi nem
> múlhat rajta. Ha a böngésző lenne a válasz, csak áthelyeztük volna az egyetlen pontot.

---

## 3. A híd: a koino szállítási igénye nevetségesen kicsi

Nem egy sáv a válasz, hanem az, hogy **a koinónak nem kell csatorna**.

Nem kell élő kapcsolat, protokoll, szerver, port, cím. Ami mozog, az **aláírt bájt** — és
mindegy, hogyan és mikor ér oda. Egy esemény ~400 bájt; egy családi koino teljes élete pár
kilobájt. Ez elfér egy QR-kódban, egy pendrive-on, egy üzenet mellékleteként, Bluetooth-on
vagy egy kinyomtatott lapon.

### ⭐ Az elv, ami ezt szerkezetté teszi

> **A bizalom az aláírásban van, nem a csatornában.**

Ezért a koino szempontjából **egy pendrive pontosan ugyanolyan megbízható, mint egy
titkosított kapcsolat.** Nem „kevésbé biztonságos, de jobb a semminél" — *ugyanolyan.* Az
esemény vagy hitelesen aláírt, vagy nem; ezen semmit nem változtat, min érkezett.

Ebből következik a **D32** szabálya:

> **Szállítási függés igen, igazság-függés soha.** Amire a koino rászorul, az legyen
> mindig csak **postás**: cserélhető (bárki más is lehet) és ellenőrizhető (ha kihagy,
> az látszik — hézag keletkezik a láncban).

### Ez már így van megépítve — mérve, nem remélve

| Fájl | Mit tud |
|---|---|
| [`js/csere/csere.js`](../koino/js/csere/csere.js) | a csere **teljes logikája**, **nulla hálózati kóddal** |
| [`js/csere/vonal.js`](../koino/js/csere/vonal.js) | az egyetlen fájl, ami tud a TCP-ről |

Nem előrelátásból lett így: azért választottuk szét, hogy a protokollt hálózat nélkül
lehessen mérni. De a következménye pont az, ami itt kell: **a szállítás cserélhető
alkatrész.** Aki egy USB-s vagy QR-kódos átadást ír hozzá, az a `vonal.js` helyére teszi,
és ugyanaz a 24 önpróba érvényes rá.

---

## 4. A sávok létrája

| Sáv | Kényelem | Ki tudja lezárni |
|---|---|---|
| **natív program, közvetlen kapcsolat** | legjobb, teljesen automatikus | a készülék gyártója — **PC-n: senki** |
| **böngésző** | kényelmes | **a böngésző tulajdonosa** (lásd 2. pont) |
| **fájl bármilyen úton** (pendrive, Bluetooth, üzenet, QR) | lassú, kézi | **senki** |

A legalsó sor a padló. Nem azért, mert kényelmes — hanem mert **nincs kire hatni.**

Szerencsés arány: a kézi átadás pont ott a legpraktikusabb, ahol a legnagyobb szükség
lenne rá — **kis közösségben**. Egy nagy koinóban körülményes lenne, de ott rengeteg
PC-s csomópont van, tehát nem is kell.

---

## 5. Az automatizálás — a kézi sáv NEM üzemmód

*Csaba kérdése: „az aláírt bájtok mozgatása pendrive-on rendben, de ez még nem
automatikus. Az aktivitásból fakadó interakciókat automatizálni kell."*

Igaza van: kézi másolgatás egy telepítésnél elmegy, a napi működésnél nem. **A kézi sáv a
legvégső tartalék**, arra az esetre, ha egy készüléken a program egyáltalán nem futhat.
Ahol fut, ott minden automatikus, mert nincs mit engedélyeztetni (lásd az 1. pont 3-as
sorát).

> ### ⭐ A koino folyamatos működését nem a telefonok tartják fenn, hanem a PC-k.
>
> PC-n semmi nem korlátozza a telepítést és a futtatást. Ott a csomópontok folyamatosan,
> automatikusan cserélnek. **A hálózat élete végig automatikus, és senki nem tud
> hozzányúlni.** A telefon ehhez csatlakozik — nem ő tartja fenn.

Ezért a kérdés nem az, hogy „megáll-e a koino", hanem hogy **egy adott ember egy adott
készülékről kényelmesen tud-e részt venni.** Ez **készülékenkénti** kérdés, nem a koino
léte.

### Egy tulajdonság, ami itt sokat számít

A koino döntései **napokban** mérődnek (min./max. döntési idő, D4), nem másodpercekben.
Ennek váratlan haszna van: **aki naponta egyszer szinkronizál, semmiről nem marad le.**
Egy folyamatos kapcsolatot igénylő rendszer sokkal törékenyebb lenne — **a koino lassúsága
itt védelem.**

---

## 6. A MÉRCE (D31) — Csaba döntése

> **Egy lezárt készülék tulajdonosa is teljes értékű e-ember lehet — de ehhez szüksége van
> legalább egy elérhető társra a hálózatban.**

Csaba szavaival: *„elfogadom, és tetszik is. Így a pc-sek segítségével ugyanúgy tud
működni, és lehet, hogy ez lesz az első digi harc a koino életében, amit összefogással tud
megvívni. […] Már az is elég nekem, hogy a pc-sek fent tudják tartani a koinót."*

⚠️ **Amit a mérce NEM ígér** *(Csaba helyesbítése: „nem érdem, csak legyen rá mód")*: a
függés nem érték, hanem elfogadható ár. Nem szépítjük.

**Mit jelent a „teljes értékű"?** Négy dolgot, és mindegyik a szállítástól függetlenül áll:

1. **tud cselekedni** — a saját kulcsával, senki nem tud helyette aláírni;
2. **tud látni** — az állapotot maga számolja ki, nem elhiszi;
3. **tud részt venni** — a cselekedete eljut a többiekhez, és az övék hozzá;
4. **nem lehet neki hazudni** — a társ nem tud hamis eseményt becsempészni, és ha kihagy
   valamit, az **hézagként látszik**.

A társtól tehát **csak szállítást** kap, igazságot soha. Ez a D32.

---

## 7. ⚠️ AMIT EZ NEM OLD MEG

*Ezt külön szakaszba tesszük, hogy később se higgyük megoldottnak.*

1. **A teljesen lezárt készülék.** Ha egy eszköz csak jóváhagyott kódot futtat, és a
   böngésző utat is elzárják, akkor **azon a készüléken nincs automatikus út.** Ezt
   semmilyen tervezés nem oldja meg — **szoftver nem tud szabaddá tenni egy lezárt
   készüléket.** Amit a tervezés megold: hogy ez ne jelentsen kizárást a koinóból.
2. **Ha senki nem érhető el a közeledben**, akkor el vagy szigetelve. Ez **elérhetőségi**,
   nem bizalmi probléma (D21) — de probléma.
3. **Hálózati szintű blokkolás** (állam, szolgáltató). Más fenyegetés, más válaszokkal;
   most nem tárgyaljuk.
4. **A pénz (6. pont).** Ha a koino valaha bolti alkalmazásként futna, **a pénz miatt
   vennék ki, nem a terjesztés miatt.** A D11 kapuja marad; a pénz sose kösse a koinót
   bolthoz.
5. **Az új belépő megtalálása**, ha a domain elvész. Enyhíti, hogy a belépés amúgy is
   **személyes meghívással** történik (D18, Szakasz 3) — nem weboldal-kereséssel.

---

## 8. 🛠️ AMIRE KÓDOLÁS KÖZBEN FIGYELNI KELL

*Ez a dokumentum leghasznosabb része. Egy elv, amit nem lehet ellenőrizni, pár hónap alatt
elkopik — ezek ellenőrizhetők.*

| # | Szabály | Hogyan ellenőrizhető |
|---|---|---|
| **1** | **A szállítás cserélhető marad.** A csere-logika soha ne importáljon hálózati kódot; minden új szállítás a `vonal.js` MELLÉ kerül, ne bele a logikába. | `grep "^import" js/csere/csere.js` — csak koino-modulok |
| **2** | **Semmi ne múljon egyetlen címen vagy szolgáltatáson.** Nincs beégetett koino.hu, jelzőpont, STUN vagy továbbító. Ha ilyen kell, legyen **cserélhető és elhagyható**. | keresés beégetett címre a kódban |
| **3** | **A bizalom sose a csatornából jöjjön.** Eseményt soha nem fogadunk el azért, mert „megbízható helyről jött". Egyetlen kapu van: `esemenyMentese`. | a hálózati út ugyanazon a kapun megy be — próba van rá |
| **4** | **Legyen mindig kézi út.** Minden automatikus cseréhez tartozzon fájlba kimentés / fájlból beolvasás. **Ha egy funkció csak online tud működni, az fojtópont.** | funkciónként: van-e kézi megfelelője |
| **5** | **Ne épüljön folyamatos kapcsolatra.** A döntések napokban mérődnek; ami másodperces élő kapcsolatot kívánna, visszahozza a törékenységet. | tervezéskor: elromlik-e, ha naponta egyszer szinkronizál |
| **6** | ⭐ **Nulla függőség, kis méret.** Ma **33 fájl, 463 KB** a mappa — **tömörítve ~85 KB**, ennyi megy át a telefonra —, **0 npm-csomag**. *(Mérve 2026-08-31; korábban 27 fájl / 257 KB állt itt — a szabály attól ellenőrizhető, hogy a mércéje friss.)* Ez már **nem elegancia, hanem védelem**: elfér egy üzenetben, és bárki újraírhatja. Minden új függőség egy újabb fojtópont (csomagtár, regisztráció, letiltás). | `find koino -type f \| wc -l`, `du -sh koino` — ⚠️ a **kicsomagolt** számot adja, ne a 73 KB-ot keresd benne |
| **7** | **A böngésző csak kliens lehet, sose előfeltétel.** (D29 pontosítása: nem tiltjuk, de nem is támaszkodunk rá.) | egyetlen működés se igényeljen böngészőt |
| **8** | **Ne tervezzünk jogi védelemre.** Ha egy érv így kezdődik: „ezt úgyis megtiltja a szabályozás" — az érv nem érvényes. | átnézéskor: van-e ilyen feltevés |

---

## 9. Ami a tervben megváltozik ettől

- **A Szakasz 2 / 4. lépése** (két hálózat, IPv6) **már nem életkérdés**, hanem mérés. A
  mérce elfogadja az aszimmetriát: nem kell mindenkinek tudnia kapcsolatot fogadni, elég,
  ha **valakik** tudnak. A mérés attól még fontos: megmondja, **hányan** tudnak.
- **A D29 pontosul:** a böngésző nem tiltott, hanem **kliens-sáv** — használjuk, ha
  kényelmes, de a 8/7. szabály szerint semmi nem múlhat rajta.
- **A terjesztés követelménye bővül:** ne egy lábon álljon. koino.hu **és** GitHub **és**
  F-Droid **és** e-emberek egymásnak, fájlként. *Ugyanaz a gondolat, mint a P2P-ben: ne
  legyen egyetlen hely, aminek a megszerzésével le lehet állítani.*
- **A `koino/` mappa mérete és függőség-mentessége mostantól követelmény**, nem
  melléktermék (8/6. szabály).

---

## 10. Távlati lehetőség — és miért nem tervezünk rá

Csaba felvetése: *„ha a Google makacskodik, és már van a közösségnek pénze, meg meg tudnak
egyezni mindenben központi szereplők nélkül, akkor akár egy koino által megrendelt
telefonokat is gyártathatunk. Persze ez már egy távlati elképzelés."*

**Nem abszurd** — létezik rá példa (Fairphone, Pine64, Purism). De gyártótőkét és ellátási
láncot igényel, tehát **évtizedes távlat**.

⚠️ **Épp ezért nem szabad rá tervezni.** A híd feladata pont az, hogy **soha ne legyen rá
szükség**. Ha a koino működéséhez saját hardver kellene, akkor elbuktuk — a lényeg az,
hogy **a meglévő, idegen kézben lévő eszközökön is működjön.**

---

## Napló

- **2026-08-28** — A híd elkészült, és **Csaba feloldotta a fagyasztást**.
  A dokumentum három ponton lett erősebb attól, hogy Csaba **háromszor talált hibát** a
  frissen leírt válaszban:
  1. **a jogi útra való támaszkodás** — kiesett, tervezési korlát lett belőle;
  2. **a böngésző mint mentőöv** — álbiztonság volt; a böngészők a Google motorján
     futnak, és a Safe Browsing egyetlen lista majdnem mindenhez;
  3. **a kézi sáv mint üzemmód** — nem az; a kézi sáv tartalék, az automatizmust a PC-k
     adják.
  *Ez a negyedik és ötödik alkalom, hogy Csaba percekkel korábban leírt szabályban talált
  hibát. A minta változatlan: a friss levezetést nem szabad véglegesnek tekinteni.*
