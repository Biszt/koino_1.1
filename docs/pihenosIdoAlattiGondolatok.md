Visszatérünk, az 5 percenlénti, buli-hoz a keresésnél, de a fejlesztés alatt percenként, aztán majd meglátjuk.
Az hogy 1 adott időben, szinte az egész közösség jelen van, bebiztosítja a maximális elérhetőséget, az eszközök között, és még energia takarékos is. Ezek akkora előnyök, hogy lemondok a folyamatos, és friss böngészésről, és ez nem is fáj annyira, mert csak az első betőltéskór, kell várnia 1 percet, mert utánna, már láthatja offlen(jelezve, szines dátummal, hogy mikor frissűlt utóljára), annyi külömbséggel, hogy még nem frissűlt. Lehetne szondázás opció is, amikor egy adott ágazatra agyja le a kérelmeket, teljes mélységben.
Ehez kell egy kérelmezések adatcsoport, amibe összegyűjthük, azokat, akik a böngészés miatt, autómatikussan, kérelmeket, intéznek, a tudatpont tulajdonosok felé. Ebben az adatcsoprtban bermelyik készülék láthatja, hogy kiknek kell megmutatni, nyitni, azaz a címével pajzsot fúrni. És természetessen, a kérelmező, is elkezdi a fúrást, azok felé, akik azokat az entitásokat tárólják, amiket böngészés közben bejárt. tehát, a programnak fel kell jegyeznie, autómatikussan, hogy miket szeretett vólna megnézni. 
ehez, szerintem kell, még egy lokális adatbázis is, ami tárólja azokat az entitásokat, is, amikre nem rakott tudatpontot. Ezek, csak akkor frissűlnek, ha ismét arra felé böngészett. Viszont a számértékei frissűlnek, a mag-ból.
Amikre rakott tudatpontot, azoknak csak akkor kell frissűlniük, amikor módosúl, de akkor autómatikussan.(ezt a body-ra értem, a számozott értékeinek frissűlnie kell mindig).

"
⚠️ **Amit a terv NEM ígér, és nem is szabad:** hogy „minden entitás elérhető". Mérve tudjuk
> (D40/D41), hogy a készülékek nagy része nem fogadóképes — egy három-tulajdonosos alvó
> entitás elérhetetlen, és ezen semmilyen címjegyzék nem segít. A válasz a kör tágítása
> (tulajdonosok → postaládák → **bárki, aki megnézte és megtartotta**,
"
a bulis verzióban, szinte mindenki, fogadó képes, és a kérelmező adatcsomag miatt tudják is, hívni egymást. A postaládának, attól még lehet szerepe, a buli alatt is.

"
 ⚠️ **VISSZAVONÁS:** korábban ide az volt írva, hogy a tömeges entitás miatt **a D17
> táblázata módosul**. **Téves volt.** A tömeges entitás összesítése **entitás-helyi** — nagy,
> de helyi. **A D17 érintetlen:** globális egyetértés továbbra is csak az azonossághoz és a
> pénzhez kell.
>" A tudatpontokhoz is kell a globális egyet értés.

"
⭐ **CSABA FELVETÉSE, ami ebből nőtt ki — LÁTHATÓSÁGI KÜSZÖB:** *„a trol támadások, vagy
> illetlen tartalmak, csak akkor lesznek elérhetőek, ha legalább 2-en próbálják meg
> közzétenni."* Strukturális védelem moderálás nélkül — de ⚠️ **a mechanizmus vak: ugyanúgy
> elnyomja az egyedüli igazat mondót, ahogy a trollt**, és ha a küszöb közösségi paraméter
> lesz, egy többség feljebb tolhatja → **letagadható cenzúra**.
> **A feloldás a réteg-felosztás:** a küszöb **kizárólag a KERESŐ-RÉTEGEN** legyen, a
> **létezésen soha**. Így semmi nincs elrejtve — csak nincs felkínálva. *(A terv 5.8; döntést
> kér: K10.)*
"
ez is átalakúl. Síkoinom nézetben, ténylegessen fogjuk használni,a láthatósági paramétereket, mert abban a nézetben, azokról megy kérelem, amiket a síkidom nézet betőlt. Jobban átgondólva, külön kell kezelni az entitás meta adatait, a címet, és a bodyt. A metaadatok a széttőrdelt magban van(buliba összeál), szóval azokat könnyű frissíteni. A címekkel kapcsolatban, még át kell beszélni. a body, meg csak akkor, ha rákoppíntanak, adja ki, a kérelmet.


"
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
"
túl sokszór használsz táblázatot, ami nem rossz, át tudom nézni, de jobb lenne, inkább pontokba/mondatokba szedve. a hasonló jellegű összehasonlítások. 
"| 2 | **Telepítés / futtatás** | a lezárt készülék megtagadja a jóvá nem hagyott kód futtatását | ⚠️ **ez az egyetlen valódi "
jól értem, hogy ha a google ezt végig viszi, akkor is lehet telepíteni, csak a készűlék gazdájának, engedélyezni kell hozzá? mert akkor ez nem probléma, sőt még egyezik az elveivel is.
"| 6 | **Pénz** *(D10/D16, később)* | a boltok a fizetést is szabályozzák | ⚠️ **a legkeményebb kar** — még megoldatlan |"
erre szerintem én már kitaláltam a jó mególdást, kiváncsi vagyok a véleméyedre. Csak azt kell mególdanunk, hogy legyen egy belső piac, a koino közösségen bellűl, ahol kereskedni tudnak vele, akár készpénzel is, csak az a lényeg, hogy jegyezve legyen. ezeken a piacokon mind a vételi szándékot, mind az eladási szándékot is lehet jelezni, annyiért amennyiért akarják, de az értéke, ami a kereslet kínálatból fakad, az tudott lessz. Persze az ettől eltérő ajánlatokat sem kell inkorrektnek venni, mert mindenki annyiért adja, amennyiér akarja, így fog megmutatkozni az értéke. A pénz létrehozásához, legalább 3 e-ember kell, és ők foglyák meghatározni az adott közösség, pénzének a paramétereit, elsőnek, amit medián 2/3-addal, lehet, majd átírnia a közösségnek. egy kérdés: tudnánk, közös kripto kasszát létrehozni?
Az első koinoban, amit én fogok létrehozni, a pénz termelődést úgy képzelem el, hogy mindenki kap 10 koinos-t(a régi koinoniákban, mi vot a közös pénzük neve?), de nem egyszerre, hanem 1 év alatt, minden nap egy kicsit( 1/365), amennyiben eleget vóltak online( 6h/nap), de ha nem, akkor is fent lessz tartva nekik, oly módon, hogy a "lemaradásaikat" behozhatják. szóval ha 3 napig ofline vóltak, de a 4. napont 24, vannak online, akkor megkapják, a 4 napi pénzüket. Előre dolgozni nem lehet. Ezen kívül a pénz termelődik, mindenkinek ugyan annyi, a meghatározott százalékban, az összes pénz arányában(tehát nem a saját tőkéjük kamatozik). ezt én évi 10%-on fogom/foglyuk elindítani. A 10 pénz 1 év alatti paramétert, már nem lehet módosítani, de az évi 10%-ot igen, de 2/3-ad kell hozzá. öröklési rendszere is lessz, hogy az elhunytak pénze, az általa megjelőlt személyekhez menyjen. 

"> **Futhat-e egyáltalán a program ezen a készüléken?**

Ez jó hír, mert egy pontot könnyebb megkerülni, mint egy hálót — és rossz hír, mert az az
egy pont a készülék gyártójának kezében van." ha jól tudom, engedély kérés után lehet telepíteni, csak a felhasználó meg van róla kérdezve.

"
És van **ma is működő** eszköz: a **Safe Browsing** tiltólista, amit a Google állít össze —
és nem csak a Chrome használja, hanem a Firefox és a Safari is. Egyetlen lista, majdnem az
összes böngésző.
"
Szóval a tíltó listával meg akadályozhatják, a telefonra telepítést? még a felhasználó engedélye sem segít?


"
## 3. A híd: a koino szállítási igénye nevetségesen kicsi

Nem egy sáv a válasz, hanem az, hogy **a koinónak nem kell csatorna**.

Nem kell élő kapcsolat, protokoll, szerver, port, cím. Ami mozog, az **aláírt bájt** — és
mindegy, hogyan és mikor ér oda. Egy esemény ~400 bájt; egy családi koino teljes élete pár
kilobájt. Ez elfér egy QR-kódban, egy pendrive-on, egy üzenet mellékleteként, Bluetooth-on
vagy egy kinyomtatott lapon.
"
ha már létrejött a kapcsolat két eszköz között, akkor ők tudnak csatórnát is képezni maguknak. Arra gondóltam, hogy ha az udp tudjuk optimalizálni a tcp mintájára, akkor a buli alkalmával fel is tudnák egymást hívni, és a csatórnájuk fent meradna a buli utánkor is.

"> **Szállítási függés igen, igazság-függés soha.** Amire a koino rászorul, az legyen
> mindig csak **postás**: cserélhető (bárki más is lehet) és ellenőrizhető (ha kihagy,
> az látszik — hézag keletkezik a láncban).
"
fontos hogy több postás kapja meg, ugyan azt. ezért is jó a bulis verzió

"> ### ⭐ A koino folyamatos működését nem a telefonok tartják fenn, hanem a PC-k.
>
> PC-n semmi nem korlátozza a telepítést és a futtatást. Ott a csomópontok folyamatosan,
> automatikusan cserélnek. **A hálózat élete végig automatikus, és senki nem tud
> hozzányúlni.** A telefon ehhez csatlakozik — nem ő tartja fenn.

Ezért a kérdés nem az, hogy „megáll-e a koino", hanem hogy **egy adott ember egy adott
készülékről kényelmesen tud-e részt venni.** Ez **készülékenkénti** kérdés, nem a koino
léte." elfogadom, ha másképp nem megy, de fő cél az az, hogy készülék független legyen a működése.

"
⚠️ **A valódi kockázat nem a bizalom, hanem a megfigyelés:** egyetlen bejárati oldal
> uralója **látja, ki lép be, és meg tudja akadályozni**. Ezért nem az a kérdés, meddig
> használjuk, hanem hogy **hányan tudják adni ugyanezt.**"
igen, és mivel az éppen kapcsoladban lévő eszközök, befogadóak, ezért sok készülék lessz befogadó, a buli alkalmával. Ezért nem lessz értelme, blokkólni a folyamot, mivel azzal csak magád zárja ki, a frissülésből.


"### Egy tulajdonság, ami itt sokat számít

A koino döntései **napokban** mérődnek (min./max. döntési idő, D4), nem másodpercekben.
Ennek váratlan haszna van: **aki naponta egyszer szinkronizál, semmiről nem marad le.**
Egy folyamatos kapcsolatot igénylő rendszer sokkal törékenyebb lenne — **a koino lassúsága
itt védelem.**" percenként kell frissülnie, de bárki állíthatja a saját készülékét ritkább frissítésre is.


"4. **A pénz (6. pont).** Ha a koino valaha bolti alkalmazásként futna, **a pénz miatt
   vennék ki, nem a terjesztés miatt.** A D11 kapuja marad; a pénz sose kösse a koinót
   bolthoz." ezt nem értem. fejtsd ki. 

   "
   3. **a kézi sáv mint üzemmód** — nem az; a kézi sáv tartalék, az automatizmust a PC-k
     adják." ezt már nem tartom. egyenlőre a készülék független hálozatot próbálunk kiépíteni.