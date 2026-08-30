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

## TERVEZÉSI ALAPELV: egyszerű és változtatható > összetett és teljes (2026-08-25, Csaba)

> „A koinóban az a jó, hogy nem kell az első verziónak tökéletesnek lennie, mert tud
> fejlődni, sokszorozódni." — Csaba

Ez nem megjegyzés, hanem **alapelv, ami újra és újra dönt helyettünk.** A tervezés során
többször kísértett, hogy egy ritka támadás miatt építsünk be még egy védelmi réteget — és
minden ilyen réteg terheli a becsületes többséget.

A **D12/D13** gyakorlati hozadéka épp az, hogy nem kell: ami hiányzik, azt egy későbbi
verzió pótolja, és ha vita van róla, **kétfelé válik, és mindkettő kipróbálja**.

**Gyakorlati szabály:** ami ritka és nem végzetes, azt **felírjuk, de nem építjük meg.**
*(Így járt a „csendes halál" foltja a D18/5-ben, és így az elhalványulás elvetése is.)*

---

## HOL TARTUNK — a Fázis 2 tervezés állapota (2026-08-28)

> ### 🔓 D30–D32: A PLATFORM-FÜGGETLENSÉG — a híd kész, a fagyasztás feloldva (2026-08-28)
>
> **Teljes leírás: [`platform_fuggetlenseg.md`](platform_fuggetlenseg.md)** — a hat
> beavatkozási pont, a sáv-létra, és a **8 ellenőrizhető szabály, amire kódolás közben
> figyelni kell** (8. szakasz).
>
> **D30 — ELŐFELTÉTEL.** Csaba a Google fejlesztő-ellenőrzési szabálya miatt **befagyasztotta
> a fejlesztést**, amíg ez elméletben nincs áthidalva: *„a technikai korlátozhatóságoknak
> nem szabad, hogy hatni tudjanak a koinóra."* A híd elkészült, **a fagyasztás feloldva** —
> de az előfeltétel megmarad: minden új funkciónak meg kell felelnie a 8 szabálynak.
>
> **D31 — A MÉRCE.** *Egy lezárt készülék tulajdonosa is teljes értékű e-ember lehet — de
> ehhez szüksége van legalább egy elérhető társra a hálózatban.* Csaba: *„a pc-sek
> segítségével ugyanúgy tud működni… már az is elég nekem, hogy a pc-sek fent tudják
> tartani a koinót."* ⚠️ A függés **nem érdem, csak elfogadható ár** (Csaba helyesbítése).
>
> **D32 — SZÁLLÍTÁSI FÜGGÉS IGEN, IGAZSÁG-FÜGGÉS SOHA.** Amire a koino rászorul, az legyen
> mindig csak **postás**: cserélhető (bárki más is lehet) és ellenőrizhető (ha kihagy, az
> hézagként látszik). Ebből következik: **a bizalom az aláírásban van, nem a csatornában** —
> ezért egy pendrive pontosan ugyanolyan megbízható, mint egy titkosított kapcsolat.
>
> ⚠️ **KÉT TERVEZÉSI KORLÁT, ami ezzel érvénybe lép:**
> - **A védelem nem lehet jogi.** *„A jogi részek egyáltalán nem érdekelnek."* Ha egy érv
>   így kezdődik: „ezt úgyis megtiltja a szabályozás" — az érv nem érvényes.
> - **A böngésző kényelmi sáv, nem híd.** A böngészők a Google motorján futnak, és a Safe
>   Browsing egyetlen lista majdnem mindhez. A **D29 pontosul**: a böngésző kliens lehet,
>   de semmi nem múlhat rajta.

> ### 🔀 HARMADIK FORDULAT (2026-08-29): NEM ELÉRÉS, HANEM TERJEDÉS — D33–D35
>
> *Négy estén át azon dolgoztunk, hogy a laptop **fogadni** tudjon kapcsolatot. Mindhárom
> szabvány (NAT-PMP, PCP, UPnP) megbukott a routeren, és a kézi szabály sem működött. Aztán
> Csaba feltett egy kérdést, ami kiderítette, hogy **rossz feladatot oldottunk meg.***
>
> **D33 — A CÉL AZ ÖSSZEFÜGGŐSÉG, NEM AZ ELÉRHETŐSÉG.** Csaba: *„a koinóban nem konkrét
> címzetthez kell eljuttatni valamit, hanem mindenkinek […] mindegy, hogy kivel sikerül
> kapcsolódni, az már tudja továbbítani máshova is."*
> A régi kérdés — *„el tud-e érni A a B-hez?"* — **N² kapcsolatot** követelne. Az új —
> *„összefüggő-e a gráf?"* — **logaritmikusat**: 10 főnél 3, 100-nál 5, 1000-nél 7,
> **egymilliónál ~14 kapcsolat fejenként**. Ezért működik a BitTorrent és a Bitcoin
> évtizedek óta, NAT ide vagy oda.
> **Amire ezzel NINCS többé szükség:** globális címtár · jelzőpont · garantált kézbesítés ·
> hogy mindenki elérhető legyen.
> ⚠️ **Az új kockázat: a SZÉTSZAKADÁS** — két sziget, ami soha nem érintkezik. Erre már van
> eszközünk: az `ujjlenyomat` azonnal megmutatja.
>
> **D34 — POSTALÁDA, NEM ÉLŐ TOVÁBBÍTÓ.** Mivel a koino **nem valós idejű**, a
> közvetítőnek nem kell egyszerre online tartania két felet (ez a TURN drágasága). Elég,
> ha **átveszi, eltárolja, és a következő beszélgetésnél továbbadja.**
> *Anna és Béla egyike sem tud fogadni; mindketten Cilihez szólnak ki — és teljesen
> kicserélik az eseményeiket, pedig soha nem beszéltek egymással.*
> ⭐ **A koino így megúszhatja a P2P legdrágább darabját** — nem okosságból, hanem mert a
> döntései nem másodpercesek.
>
> **D35 — A CSERE ÁRA BEFOGADÁSI KÉRDÉS, NEM OPTIMALIZÁLÁS.** Az `ALLAS` mérve **162
> bájt/e-ember**; 1000 fős koinónál 5 percenkénti cserével **46 MB/nap**, 10 000-nél
> **460 MB/nap**. *Ez nem a hálózatot terheli meg, hanem a mobilos e-ember számláját
> zárná ki — épp azt, akinek a legkevesebb pénze van.*
> **A javítás:** a csere kezdődjön **egyetlen összesített ujjlenyomattal** (43 karakter);
> a részletes állás csak akkor menjen, ha az eltér. Egy „nincs újdonság" csere így
> **1,6 MB helyett ~100 bájt**.
>
> **Csaba két helyreigazítása, ami idevezetett:**
> 1. *„a döntések napokban mérődnek" — ez nem igaz*, lehet órákban is, a tudatpont-változás
>    még sűrűbben. **A lassúságra nem szabad védelemként hivatkozni.**
> 2. *„nem lehet minden PC továbbító"* — igaza volt, ellentmondtam magamnak. Továbbító csak
>    az lehet, aki **fogadni** tud; a többi „csak kifelé" — de ⭐ **ők is megkapnak mindent**,
>    mert a csere kétirányú (mérve: a telefon kiszólt, és 3 eseményt kapott, 2-t küldött).

> ### 🔀 NEGYEDIK FORDULAT (2026-08-29 éjjel): A BEJUTÁS — D36–D38
>
> *Az esti mérés után azt írtam: „kell egy második hálózat, ahol tényleg van IPv6". Csaba
> ezt nem fogadta el: **„ha ezt elfogadom, akkor a p2p szerintem nem fog működni, mivel
> mind kettő otthoni hálózat, és olyan standard, ami sok háztartásra igaz."** Igaza volt —
> ez a hétköznapi eset, nem kivétel. A három döntés ebből született.*
>
> **D36 — A HARMADIK KÉSZÜLÉK NEM SZOLGÁLTATÁS, HANEM EGY E-EMBER.** Amikor a külső cím
> megtudásához kell valaki kívülről, az **nem infrastruktúra**, hanem a közösség egy tagja,
> aki történetesen tud fogadni. Amit ad — egy cím visszamondása —, azt **bárki más is
> adhatja**. Csaba: *„ha már van egy kiterjedt hálózatunk, akkor egymás elérhetőségeit már
> lehet közvetíteni az egész közösségnek."*
> ⭐ **Ebből következik, hogy a TÜKÖR és a TERJEDŐ CÍMJEGYZÉK ugyanaz a dolog:** a saját
> külső címed is csak egy cím, ami a közösségben terjed. Nem kell rá külön mechanizmus.
>
> **D37 — A FOGADÓKÉPESSÉG CSAK A BEMUTATKOZÁSHOZ KELL.** *(Csaba kérdése: „ez csak az első
> kapcsoláskor szükséges?")* Három külön dolgot mostunk össze, és szét kell választani:
>
> | Mihez | Kell-e fogadóképes fél? |
> |---|---|
> | **maga a kapcsolat** (pajzsfúrás) | ❌ **nem** — mindkettő kifelé indul, a két rés a közepén találkozik |
> | **a saját külső cím** (IPv4/NAT) | ismételten kell tükör — de az **első kapcsolat után a társak tükrözik egymást**; IPv6-on ez a lépés kimarad |
> | **az első bemutatkozás** | ✅ igen — **VAGY a kézi út** (4. szabály): a cím elküldhető üzenetben, felolvasható, beírható |
>
> ⭐ **Vagyis a hálózatnak szerkezetileg NEM kell fogadóképes tag** — csak egy első
> bemutatkozás, és az lehet emberi mozdulat is.
>
> **D38 — BEJÁRATI CÍMLISTA, BÖNGÉSZŐ NÉLKÜL.** Csaba felvetette, hogy a program az első
> csatlakozáshoz használhatna böngészőt, utána nem. A szándékkal egyetértettünk, az
> eszközzel nem: **a böngésző itt semmit nem ad hozzá** (a program maga is le tud tölteni
> egy címlistát), viszont behozza a saját korlátait (D29, 7. szabály). Helyette:
> - **több forrás, nem egy** — az e-ember sajátot is megadhat (2. szabály);
> - **elhagyható** — kézi cím-megadással ugyanúgy be lehet lépni (4. szabály);
> - **nem jár vele bizalom** — amit letölt, az *cím*, nem igazság (3. szabály, D32);
> - a próba: *ha holnap a bejárat eltűnik, be tud-e még lépni valaki?*
>
> ⚠️ **A valódi kockázat nem a bizalom, hanem a megfigyelés:** egyetlen bejárati oldal
> uralója **látja, ki lép be, és meg tudja akadályozni**. Ezért nem az a kérdés, meddig
> használjuk, hanem hogy **hányan tudják adni ugyanezt.**
>
> ⚠️ **Ami őszintén bizonytalan marad:** a fejlesztő vonala **CGNAT** — a szolgáltatói NAT
> kiszámíthatatlanabb egy házi routernél. Hogy a pajzsfúrás átmegy-e rajta, azt **csak
> méréssel** lehet megtudni, nem levezetéssel.

> ### 🔁 D39 (2026-08-29 éjjel): A MELEG RÉS — a D37 pontosítása
>
> *Csaba kérdése: „ipv4-en időnként megváltozik a címe mindenkinek. Ha ez figyelmeztetés és
> átfedés nélkül történik, hogyan tudja meg a többi készülék az új címét?"*
>
> **A válasz magja:** akinek megváltozott, annak **nem kell, hogy megtalálják** — a
> társ-listája még érvényes, tehát **ő szól ki**. Amint kiszól, a másik a foglalatból látja
> az új címét (minden csomag hordozza a feladóét), a tükör pedig visszamondja neki is.
>
> ⚠️ **DE EHHEZ KELL VALAKI, AKINEK A RÉSE ÉPPEN ÉL — és ez pontosítja a D37-et.**
> Tegnap azt írtam: *„a fogadóképesség csak az első bemutatkozáshoz kell."* Ez pontatlan.
> Helyesen:
>
> > **Minden újrakapcsolódáshoz kell legalább egy társ, akinek a rése éppen él** — vagy
> > mert fogadóképes, vagy mert **folyamatosan fut**.
>
> ⭐ **A FELISMERÉS: egy folyamatosan futó készülék gyakorlatilag fogadóképes** — nem azért,
> mert a routere beengedi, hanem mert az **`orjarat` percenként kifelé szól, és ettől a rése
> nyitva marad**. Ez olcsóbb bármilyen router-beállításnál: csak áram és net kell hozzá.
> Ezért az `orjarat` fontosabb, mint amilyennek látszott.
>
> **Két mozgékonyság, és a port a mozgékonyabb:** a cím ritkán változik (szolgáltatói
> bérlet), a **NAT-leképezés viszont percek alatt elévül**, ha nincs forgalom. Egy órája
> kikapcsolt készüléket a régi külső porton **soha nem** találsz meg — de ő megtalál téged.
>
> **Az elakadt eset, őszintén:** ha MINDENKI alszik, akit ismersz, nincs kihez szólni →
> kézi bemutatkozás (4. szabály). Nagy hálózatban elhanyagolható (14 társból nem alszik
> mind), két készüléknél viszont valós.
>
> ### ✅ KÉT APRÓ JAVÍTÁS, AMI EBBŐL KÖVETKEZIK — MEGÉPÍTVE (2026-08-30)
>
> A kód átnézve: ma **a saját külső címünket soha nem hirdettük** (csak a társainkét), és a
> **postaláda nem jegyezte fel, kit hallott a hívótól**. Emiatt egy címváltozás csak addig
> terjedt, ameddig a gazdája maga elvitte. Mindkettő kész:
>
> 1. ✅ **A postaláda tanul a hívótól** — a bekopogó címjegyzékét eddig eldobtuk, pedig a
>    postaláda beszél a legtöbb emberrel. *(`koino.js`, `figyel` és `orjarat`.)*
> 2. ✅ **Mindenki hirdeti a saját külső címét is** — azt, amit a tükörtől tanult.
>    ⭐ **Nem kell hozzá se fájl, se emlékezés:** a tükör a másik `LENYOMAT`-jával érkezik,
>    ami ELŐBB jön, mint ahogy mi a `CIMEK`-et küldjük — tehát a frissen tanult cím még
>    **ugyanabban a beszélgetésben** elmegy.
>
> ⚠️ **AMIT A MEGÉPÍTÉS HELYESBÍTETT — a tükör nem mindenkinek érték.** A `latlak` azt
> mondja meg, milyen címről ÉS PORTRÓL látnak minket. Ez csak akkor használható cím, ha azt
> a portot **nyitva is tartjuk**:
>
> | Ki | Hirdetheti a tükröt? | Miért |
> |---|---|---|
> | **figyelő** (postaláda) | ✅ igen | a hívó épp arra a kapura csatlakozott — bizonyítottan működik |
> | **UDP-rés** (pajzsfúrás után) | ✅ igen | a fúró RÖGZÍTETT helyi portról hív, a rés ott él |
> | **kifelé hívó TCP** | ❌ **nem** | efemer portról indul, amit a rendszer utána elenged — **halott címet terjesztene** |
>
> Ezért a `parbeszed` opciója (`sajatCimHirdetese`) alapból **ki van kapcsolva**, és csak ott
> kérjük, ahol igaz. Rontás-próba őrzi mindkét irányt.
>
> ⚠️ **ÉS EGY HIBA, AMIT EZ SZÜLT VOLNA:** ha a postaláda mindent felír, amit hall, akkor
> **önmagát is felveszi társként** — a társak ugyanis MINKET is hirdetnek egymásnak (ez így
> helyes). A készülék ettől minden körben önmagát hívogatná: nem végzetes (a lenyomat
> egyezne, ~334 bájt), de néma pazarlás, és a lista élére kerülne, mert mindig „sikeres".
> A beolvasztás ezért kiszűri azt a címet, aminek a másik épp minket lát (a tükröt).
>
> **Mérve, két adat-mappával (2026-08-30):** a postaláda senkit nem ismert; egy bekopogó
> elmondta neki a két címét; a postaláda **egyet tanult meg** — a másikat, a sajátját,
> helyesen kihagyta.
>
> Ettől egy címváltozás **magától végigfut a hálózaton**: elég egyvalakinek szólni.

> ### 🔒 D40 (2026-08-30): A FOGADÓKÉPESSÉG-FÜGGÉS MINIMALIZÁLÁSA — sebesség árán is
>
> *Egy UDP-holtpont javítása közben oda jutottunk, hogy a koinóban lesz TÖMEGES forgalom is,
> nem csak apró szinkron — Csaba vetette fel: „ha valaki tudatpont-tulajdonos lesz egy
> entitáson, akkor azt le kell töltenie a hálózatról, mert ő tárolja onnantól kezdve."
> Erre azt javasoltam, hogy a tömeges letöltés menjen TCP-n, ahol a másik fogadóképes.
> Csaba ezt elutasította — és a javaslatom tényleg visszahozta azt a függést, amit a
> D31–D33 ki akar zárni.*
>
> > „Minimalizálni akarom a fogadóképes (postaláda) függést, annyira amennyire csak lehet,
> > **még akkor is, ha sebességet veszítünk vele**, mert szerintem az eszközök java nem lesz
> > fogadóképes. Ezt azért gondolom, mert két háztartásból 2 nem volt az, és szerintem a
> > mobilnetesek sem lesznek azok." — Csaba
>
> **A minta erősebb, mint „2 háztartás":** a router **mind a három** szabványt elutasította
> (NAT-PMP, PCP, UPnP), a fejlesztői vonal **CGNAT**, a kézi portszabály sem működött. A
> mobilneteseknél a CGNAT nem kivétel, hanem az alapállapot.
>
> **A DÖNTÉS:**
> > **A tömeges letöltésnek is át kell mennie a résen. A TCP legyen ráadás, sose feltétel.**
>
> Ez ugyanaz a mondat, mint a 2. szabály („cserélhető és elhagyható"), csak most az
> **entitás-tartalomra** is kiterjesztve. ⚠️ Ez **nem tiltja** a TCP-t: ahol van
> fogadóképes társ, ott nyugodtan menjen azon — de semmi nem múlhat rajta.
>
> #### Amit ez KÖTELEZŐVÉ tesz: az ablak
>
> A mai `udpVonal.js` szándékosan **egyszerre egy darabot** enged útra (küldd — várd meg a
> nyugtát — küldd a következőt). Ebből egy egyszerű képlet jön:
>
> > **sebesség ≈ ablak × 1000 bájt / oda-vissza idő**
>
> | Ablak | Sebesség 30 ms-nál | 5 MB alatta |
> |---|---|---|
> | **1** (a mai) | 33 KB/s | 2,5 perc |
> | **8** | 267 KB/s | 19 mp |
> | **16** | 533 KB/s | 9 mp |
> | **64** | 2,1 MB/s | *már a vonal a szűk keresztmetszet, nem mi* |
>
> ⭐ **A cél nem a TCP hatékonysága, hanem A VONAL KAPACITÁSA.** Egy otthoni feltöltés
> 1–2 MB/s körül van; egy **16-os ablak és mért újraküldési idő** (a mai fix 300 ms helyett)
> ezt gyakorlatilag kimeríti. Nagyságrendileg 100–150 sor a `udpVonal.js`-ben — nem QUIC,
> nem függőség, és a `parbeszed` egy karakterét sem érinti (1. szabály).
>
> #### ⭐ És a valódi válasz a sebességre: SOK TÁRS, nem egy gyors
>
> Itt a D33 logikája tér vissza, most a tartalomra. A **D26** miatt a letöltés előtt tudod a
> fájl **lenyomatát és méretét** — ebből következik, amit a torrent évtizedek óta csinál:
> a fájl **darabokra bontható, darabonként ellenőrizhető, és több társtól párhuzamosan
> szedhető össze**. Ha 14 társad van, egyiküknek sem kell gyorsnak lennie — és egyiküknek
> sem kell fogadóképesnek, mert **te szólsz ki mindegyikhez**, ugyanazon a résen.
>
> ⭐ Ráadásul így **megszakítható és folytatható**: nem kell egy hosszú kapcsolatban
> végigvinni egy 40 MB-os entitást — az `orjarat` körönként hoz pár darabot, és a fájl
> idővel összeáll. Ez fontos, mert az **5. szabály** épp a hosszú élő kapcsolatot tiltja.
>
> **Vagyis a sebességet nem a vonal minőségéből nyerjük, hanem a társak számából** —
> pontosan úgy, ahogy az elérhetőség kérdését is a gráf összefüggőségére cseréltük.
>
> #### Az őszinte ár (felírva, még nincs megépítve)
>
> - **darab-címzés** — a fájlhoz lenyomat-fa kell (a **D21** Merkle-gondolata már itt van);
> - **új üzenettípusok**: „megvan-e neked az X fájl Y darabja?";
> - **folytatási állapot** — mit szedtem már össze; **helyi megfigyelés**, sosem terjed és
>   semmit nem dönt el a koinóban (mint a `tarsak.js` `utoljara` mezője).
>
> ⚠️ **Mikor:** a Szakasz 2 / **3. lépés** (részleges tudás) UTÁN. Előbb nincs is mit mérni:
> ma a [`csere.js`](../koino/js/csere/csere.js) `koinoEsemenyei`-t hív, vagyis **mindenki
> mindent replikál** — a D3 tudatpont-alapú válogatása még nincs megépítve.

> ### 🔑 D41 (2026-08-30): A FOGADÓKÉPESSÉG VISZONY — és a címjegyzék ajtót is nyit
>
> *A mobilhálózatos mérés után Csaba végigvitt egy gondolatmenetet, ami négy állítássá állt
> össze. Kettőnél az én megfogalmazásomat kellett helyesbíteni.*
>
> **1. A FOGADÓKÉPESSÉG NEM TULAJDONSÁG, HANEM VISZONY.** Csaba: *„azok az eszközök, amik
> éppen kapcsolatban vannak egymással, azok addig fogadóképesek, még akkor is, ha amúgy meg
> nem lennének azok."* Igaz — ma ezt mértük: a barátja telefonja mobilneten, CGNAT mögött,
> semmilyen értelemben nem „elérhető", mégis oda-vissza ment a csere.
> ⚠️ **DE PÁRRA SZÓL, NEM A VILÁGRA:** ha A rést nyitott B felé, attól C még nem jön be.
> ⚠️ **ÉS EGY HELYESBÍTÉS (Csaba kifogása):** ezt túl általánosan írtam le. **Csak arra igaz,
> aki nem tud kaput nyitni.** Akinek valódi elérhető címe van (nyitott kapu), az **mindenki
> felé** fogadóképes — ő a postaláda (D34), és a D31 rá épül.
>
> **2. NEM KÖZÖS ÓRA KELL, HANEM KÖZÖS ÜTEM.** Én azt írtam, a fúrás „randevút kíván";
> Csaba nem fogadta el, és igaza volt. **A fúró ismétel**, tehát nem az kell, hogy egyszerre
> INDULJANAK, hanem hogy az ablakaik ÁTFEDJENEK.
> ⭐ **Ezt a mai mérés már bizonyította, csak nem vontam le belőle:** a laptop **110 kopogás
> / 110 297 ms**, a telefon **1 kopogás / 191 ms** — két perc csúszással indultak, mégis
> összeértek.
>
> **3. ⭐ A CÍMJEGYZÉK NEM CSAK AZT MONDJA MEG, KIT HÍVJ — AZT IS, KINEK NYISS ELŐRE AJTÓT.**
> *(Csaba ötlete, és ez a szakasz veleje.)* Ha a készülék előre tudja a társai címét,
> **magától kiküldhet mindegyiknek** egy apró csomagot — ettől a router mindegyikükre nyit
> egy rést, és amikor bármelyikük kopog, **már benne van az engedélyező listában**.
> ⭐ **Ez kiváltja a „full cone" kérdést:** nem kell, hogy a router bárkit beengedjen — elég,
> ha azokat engedi be, akiket mi már megszólítottunk. És a randevút is fölöslegessé teszi.
>
> **4. AZ ÉBREDÉS LEGYEN ÖSSZEHANGOLT — ez az akkumulátor miatt számít.**
> *(Csaba kérdése: „és ha csak öt percenként áll fel a hálózat?")* Folyamatos melegítésnél a
> fázis nem számít; ötperces ütemnél a leképezés közben **elévül** (mobilon fél-egy perc),
> tehát **csak akkor működik, ha egyszerre állnak fel**. Ez ingyen megvan: a telefonok órája
> NTP-pontos, elég a **percfordulóhoz igazítani**, és 20–30 mp-es ablakban elfér a csúszás.
>
> | Megoldás (14 társ) | Napi adat | Rádió-ébresztés |
> |---|---|---|
> | folyamatos melegítés, 30 mp | ~3 MB | 120×/óra |
> | folyamatos melegítés, 60 mp | ~1,5 MB | 60×/óra |
> | **összehangolt, 5 percenként** | **~300 KB** | **12×/óra** |
>
> *(A D35 akkor kongatott vészharangot, amikor 46 MB/nap jött ki — ez annak a századrésze.)*
>
> **5. ⭐⭐ EGY ABLAK = A TELJES TERJEDÉS, NEM EGY LÉPÉS.** *(Csaba helyesbítése, és ez a
> szakasz legfontosabb pontja.)* Én úgy számoltam, hogy egy ablakban az esemény egyet lép,
> és ezért „száz fősnél ~25 perc, mire körbeér". **Ez rossz volt.** Csaba modellje:
>
> > *„5 percenként végigviszi a teljes hálózat frissítését — az eszközök addig egyeztetnek
> > egymással, ameddig ki nem cserélték azt, amit kell. Ez olyan lenne, mint egy buli:
> > amikor a legforróbb a hangulat, akkor a legkönnyebb elérni egymást."*
>
> Ha egy ablakban mindenki mindenkijével cserél, az esemény **nemzedékenként** terjed:
>
> | Nemzedék | Hány készülék tudja (14 társnál) |
> |---|---|
> | 1. | ~15 |
> | 2. | ~225 |
> | 3. | ~3 400 |
>
> Egy valódi csere **mérve 189 ms** (2026-08-30, mobilhálózaton). Három nemzedék tehát
> **10–30 másodperc** — **belefér egy ablakba**. A késleltetés így nem a hálózat átmérője,
> hanem **legfeljebb a következő ablakig tartó várakozás**.
> ⚠️ *A 189 ms mért; a nemzedék-számítás levezetett, nem mért.*
>
> ⭐ **A hasonlat pontos:** amikor mindenki egyszerre ébren van, a gráf **abban a pillanatban
> teljesen összefüggő** — nem az korlátoz, hogy ki van épp fent. Ez a D33 összefüggőség-elve
> IDŐBEN alkalmazva.
>
> ⭐ **ÉS AMI EBBŐL KÖVETKEZIK A KÓDRA:** az `orjarat` **már ma is ötperces ütemben jár**.
> Három dolog hiányzik belőle:
> 1. **igazítsa a kört a percfordulóhoz** (hogy a buli egyszerre kezdődjön);
> 2. a kör elején **kopogjon rá minden társra** (ne csak arra, akivel cserélni akar);
> 3. ⭐ **ismételje a kört, amíg van újdonság** — ma egyszer megy végig a listán, pedig amit
>    az 5. társtól kapott, azt az 1. még nem tudja. A leállás magától adódik: a csere már ma
>    is a „csendes körnél" áll meg.
>
> **AZ ÁRA (számolva, nem mérve):**
>
> | | |
> |---|---|
> | egy „nincs újdonság" csere | ~700 bájt oda-vissza (mérve: 334 bájt egy irányban) |
> | 14 társ × 2–3 kör | ~25 KB / ablak |
> | 5 percenként | **~7 MB/nap** |
> | 15 percenként | ~2,4 MB/nap |
> | akkumulátor | 12 ébredés/óra, ~30 mp-es ablak → a rádió az idő ~10%-ában aktív |
>
> ⚠️ A 7 MB/nap nem vészes (a D35 46-nál kongatott vészharangot), de **nem is elhanyagolható**
> egy mobil-előfizetésen. Az ablak-gyakoriság az a csavar, amivel állítható — és ez
> **befogadási kérdés**, nem technikai finomhangolás (D35).
>
> #### ⚠️ AMIT EZ NEM OLD MEG — és amiért a „kurbli" hasonlat pontos
>
> Csaba hasonlata: *„mint egy motor esetében, kurbli"* — a fúró csak az induláshoz kell.
> **Így igaz**, de a mechanizmus nem az, amit először gondoltunk:
>
> - **az ELSŐ találkozás** marad kézi vagy összeismertetett (akinek a címét nem ismered, afelé
>   nem tudsz előre nyitni) — **ez a kurbli**;
> - utána az előre nyitott rések **fenntartják a járást**, ütem és randevú nélkül;
> - ⚠️ **de alvó telefonon semmi ebből nem működik.** Az Android elaltatja a folyamatot; a
>   fenti számítás ébren lévő készülékre igaz. **A flotta gerince ezért asztali gép legyen.**
>
> #### ✅ MEGMÉRVE (2026-08-30, 23:44): **NINCS FULL CONE** — az előre nyitogatás SZÜKSÉGES
>
> A laptop a semmibe fúrt (`pajzsfuro 192.0.2.1 7373 7373`), tehát **soha nem küldött a
> telefonnak**; a telefon közben a szomszéd wifijéről a laptop külső portjára kopogott.
> **14 146 kopogás alatt a laptop SEMMIT nem kapott meg tőle.**
>
> ⭐ **Vagyis a meleg rés NEM általános kapu:** a router csak attól enged be, akinek maga is
> küldött. Ezzel a **3. pont (előre nyitogatás a címjegyzékből) nem opció, hanem az egyetlen
> út** — Csaba ötlete nélkül nem lenne mivel megoldani.
>
> ⚠️ *A vonal kétszeres NAT mögött van (router + CGNAT), tehát azt nem tudjuk, melyik réteg
> dobta el. A koino szempontjából a következmény ugyanaz.*
>
> #### 📏 ÉS AMIT UGYANEZ AZ ESTE MÉG MEGMUTATOTT
>
> **1. A két hálózat MÁSKÉPP viselkedik — ezért kell, hogy mindenki magát mérje.**
>
> | | Külső port |
> |---|---|
> | laptop (itthon, CGNAT) | `54915` → `60283` — **megváltozott** két perc alatt |
> | telefon (a szomszédnál) | `7373` → `7373` — **változatlan** |
>
> A délutáni javítás (a fúró a saját foglalatáról mér) itt élesben mutatta meg magát: a
> régi kóddal az elavult `54915`-öt mondtuk volna be, és kísértetet kergettünk volna.
>
> **2. HARMADSZOR ugyanaz a mintázat (a 2. pont igazolása):** laptop **295 kopogás**,
> telefon **1 kopogás / 150 ms**. Aki előbb kezdi, melegen tartja a rést.
>
> **3. Egy „nincs újdonság" csere valódi, két hálózat közti résen: 739–961 bájt** (a
> délelőtti 6,7 KB azért volt nagyobb, mert 9 esemény ment át).

### 🕐 AZ IDŐ ÉS A LEZÁRÁS — öt felírt irány (2026-08-29, Csaba ötleteiből)

*A D33–D35 után Csaba felvetette: ha valaki nem talál postaládát, a szavazata késhet — mit
kezdjünk ezzel? A beszélgetésből öt irány maradt, egyik sem eldöntve. ⚠️ **A szavazási
rendszerhez most NEM nyúlunk.***

**1. ✅ „Kik nem szavaztak az aktív tulajdonosok közül" — ma is kiszámítható.**
Nem kell hozzá semmi új: az aktív tudatpont-tulajdonosok listája adja a részvételi arány
nevezőjét, a szavazatok pedig az eseményekből jönnek — a kettő különbsége a keresett
halmaz. Determinisztikus (D17), új esemény-típus nélkül. **Megépíthető bármikor.**

**2. ⭐⭐ A HATÁRIDŐKOR: lezárható-e tisztességesen?** *(Csaba ötlete, és a legerősebb.)*

⚠️ **A határidő NEM rövidül ettől** — ez nem gyorsítás. *(Egy korábbi jegyzet tévesen
korai lezárásként írta le; Csaba helyreigazította.)* A szabály **csak a döntési idő
lejártakor** lép működésbe, és csak akkor, ha vannak **régóta néma aktív tulajdonosok**:

| A határidőkor | Mi történik |
|---|---|
| mindenki szavazott, vagy a nem szavazókról tudjuk, hogy elérhetőek voltak | **lezárul**, ahogy ma |
| vannak néma aktív tulajdonosok, **de a szavazatuk nem fordíthatná meg** az eredményt | **lezárul** — az eredmény biztos, akárhogy szavaztak volna |
| vannak néma aktív tulajdonosok, **és a szavazatuk megfordíthatná** | ⚠️ **nem zárható le tisztességesen** → halasztás vagy jelzés |

**Amit véd:** hogy ne mondjunk ki eredményt olyanok feje fölött, akik nem *nem akartak*
szavazni, hanem **nem tudtak** — mert nem találtak postaládát. A számítás ugyanaz az
egész-aritmetika, amit már használunk (legrosszabb és legjobb eset, kereszt-szorzással).

⚠️ A halasztás csak **korláttal** épülhet meg — különben egyetlen hallgató ember örökre
megállíthatna bármit. A maximum döntési idő (D4) ezt már lefedi.

**3. 🆕 A „nem tudunk róla" halmaz szűkítése az események `ido` mezője alapján.**
Aki nem szavazott, de a javaslat óta **más eseményt tett**, arról tudjuk, hogy aktív volt.
⚠️ **Korábban tévesen azt írtam, hogy ez nem lehet determinisztikus** — de igen: az `ido`
az **aláírt eseményben** van, tehát mindenki ugyanazt látja. *(Ami NEM használható: a
„mikor kaptam meg" — az helyi megfigyelés, sehol nincs rögzítve.)*
Hamisíthatatlanabb változat: **oksági bizonyíték** — nem lehet olyan eseményre hivatkozni,
ami még nem létezik. ⚠️ De ez az **esemény szerkezetét** érintené (kanonikus alak) → **nem
nyúlunk hozzá menet közben.**

**4. ⭐ MEDIÁN-IDŐ a hazug óra ellen — ez új, és talán a legértékesebb.**
Ma a határidőt **a javaslattevő órája** adja, és minden szavazatot **a saját szerzője
órája** szerint ítélünk meg. Egyetlen hazug óra tehát számít.
A koino a küszöböknél már **mediánt** használ, épp azért, mert *„csak létszámmal
billenthető, szélsőértékkel nem"* (D4). **Ugyanez alkalmazható az időre**: ha a mérvadó idő
a résztvevők medián-ideje, egyetlen hazug óra nem mozdít semmit. *(A Bitcoin is a
szomszédok idejének mediánját használja.)*

> ⚠️ **PONTOSÍTÁS (2026-08-29): a medián-idő NEM a társkereséshez kell.** Csaba felvetette,
> hogy ha az eszközöknek egyszerre kell keresniük a társakat, akkor a medián-időt előre
> kellene venni. A megépítés közben kiderült, hogy **két különböző dolgot** hívunk
> „egyidejűségnek": az **átfedéshez** (mindkét fél ébren van ugyanabban az ablakban) elég
> egy ütem, közös óra nélkül — a **randevúhoz** (ugyanaz a másodperc) kellene közös óra,
> de az csak a lyukfúrásnál (E. lépés) merül fel. Ráadásul a randevúnál a hazug óra csak a
> hazudót bünteti, tehát nincs mit védeni. **Megmérve: a csere-réteg egyetlen óra-hivatkozást
> sem tartalmaz.** A medián-idő tehát ott marad, ahol értéke van: a **lezárásnál**, ahol
> valaki nyerhet a hazugsággal. Részletek: [`szakasz2_terv.md`](szakasz2_terv.md).

**5. A jegyzőkönyv igen, az ítélet nem.**
Késve érkező szavazat **megjelenhet** a jegyzőkönyvben („a lezárás után érkezett" —
a `kesoiSzavazatok` mezőt már számoljuk), de **nem írhatja át a kimondott eredményt**.
E nélkül elesne a lezárási szabály (`e4cd10b`), és semmire nem lehetne támaszkodni.

⚠️ **Ami továbbra is nyitott:** a visszadátumozás teljes válasza a **kötegelés** (D21,
Szakasz 4). Addig friss kulccsal vagy hosszú tétlenség után szabadon lehet dátumozni —
ez **drágítja** a csalást, nem zárja. A kód ezt ki is mondja a `javaslatSzamitas.js`-ben.

⭐ **És egy tágabb haszon, amit Csaba emelt ki:** azt látni, **ki nem jelentkezett régóta**,
nem csak a szavazásnál fontos — ez mutatná meg a **szétszakadást** is (a D33 új
kockázata), a koino terjedésének egészségét, és emberi okból is érdekes.

> ### 🔀 MÁSODIK FORDULAT (2026-08-28): NINCS BÖNGÉSZŐ
>
> **D29** — *„Tulajdonképpen hagyjuk is el a böngészős részt, mert csak bezavar. A tiszta
> P2P kapcsolatra koncentráljunk."* A koino **önálló program**, ami a készüléken fut; a
> böngésző később lehet egy kliens, de nem ő szabja meg, mire képes a koino.
>
> Indoka mérhető: a Szakasz 2 tervezésekor minden akadály **böngésző-korlát** volt, és a
> döntő az, hogy **egy lap nem tud fogadni kapcsolatot** — ezért kell neki jelzőpont, STUN
> és továbbító. A koino magja eközben **már ekkor is futott böngésző nélkül**, változtatás
> nélkül; a böngésző-függés a tárban volt.
>
> **A Szakasz 1 ezzel átköltözött:** fájl-alapú tár, parancssori arc, és a 90 önpróba
> `node koino/meres/mind.js`-szel fut. A böngészős nézet és a próbaoldalak megszűntek
> (a git történetében megmaradnak).

**41 tervezési döntés (D1–D41) áll.** 2026-08-25-én három elméleti hidat építettünk
(kulcskezelés, konszenzus, identitás) — Csaba döntése alapján: *előbb elméletben hidaljuk
át a legkritikusabb problémákat, és csak utána jön a részletes terv és a kódolás.*

> ### 🔀 FORDULAT (2026-08-26): P2P AZ ELSŐ KIADÁSTÓL
>
> Három döntés írta át a végrehajtás tervét — az elméleti hidak **érintetlenül** maradtak:
>
> - **D22** — nincs központi szerveres kiadás; *„a kis családi közösségeknek is P2P-nek
>   kell lenniük"*. Ezzel a *„ne újraírás legyen, hanem feloldódás"* vezérelv elesett, és
>   helyébe lépett: **a régi koino a prototípus, az új a készüléken kezdődik.**
> - **D23** — a nyelv **JavaScript marad**; a nyelvhatárt a H6 réteg-besorolása jelöli ki
>   (a `mag` 8 mező, a `tartalom` 73 — nem a programot kell nyelvre választani, legfeljebb
>   a magot).
> - **D24** — a meglévő adat sem költözik: **új regisztráció** lesz. Ezzel a **Szakasz 0
>   (híd-feladatok) lezárult**, egyetlen elkészült termékkel: a **H6 adat-osztályozással**.
> - **D25** — **A BELÉPŐ TÉR**: a koinók családfája. Az azonosság és a tanúsítások
>   **közösek a térben**, a küszöbök, szabályok, tartalom és a pénz **koinónként külön**.
>   *Az azonosság közös, a jogosultság helyi.* A tér a **tartós mag második hasznosítása**
>   — új mechanizmus nélkül.
>
> **A következő lépés: a lépés-sorrend Szakasz 1-e — „A HELYI KOINO".**

Indoka szó szerint: *„ha az lesz a vége, hogy ez lehetetlen, akkor tényleg nem
világmegváltás lesz belőle, hanem csak esetleg egy hasznos program, és akkor úgy is állok
hozzá."*

### A nyitott kérdések állapota

| # | Kérdés | Állapot | Mi oldotta meg |
|---|---|---|---|
| N1 | Tartós mag | ✅ **lezárva** | mi: D14 · hogyan írható: D17 · **replikáció: D21** |
| N2 | GDPR ↔ megmásíthatatlanság | ✅ **lezárva** | D14 (a felejtés az alapállapot) |
| N3 | Titkos-ellenőrizhető szavazás | 🟡 **átfogalmazva** | kicsiben elvi korlát, nagyban létező tech |
| N4 | Tanúsítási szabályok | ✅ **lezárva** | D18 |
| N5 | Forráskód-kormányzás | ✅ **lezárva** | D12, D13 |
| N6 | Elérhetőség / replikáció-padló | 🟡 **fele lezárva** | a „szellem-kártya" szabály kiváltotta; a botok/napirend-manipuláció nyitva |
| N7 | Védelmi rétegek | ✅ lezárva (2026-07-16) | D5–D7 |
| N8 | Személy-alapú konszenzus | 🟡 **nagyrészt** | D17; nyitva az érvényesítő-kiválasztás |
| N9 | Elismerés + kinevezés | 🟡 kiterjesztve | D15 (helyreállító bizottság), D18/3; a terv hiányzik |
| N10 | Pénz-paraméterek | 🟡 részben | D16 (tempó), D18/8 (osztalék), D20 (öröklés); a paraméterek nyitva |
| N11 | Emberiség-lépték | 🟡 elemezve | verdikt: szeletelt architektúrával megvalósítható |

**Négy kérdés teljesen lezárult** (N2, N4, N5, N7), a többi részben.

### Ami VALÓBAN nyitva maradt

1. **Érvényesítő-kiválasztás** — befolyásolhatatlan véletlen *(N8)* — **az egyetlen valódi
   kutatási kérdés**, és a lépés-sorrendben a legkésőbbi szakaszok egyikében (5.) ül
2. **Nagy léptékű titkos szavazás** — technológia-választás *(N3)*
3. **Botok, napirend-manipuláció** — ez társadalmi probléma, nem technikai *(N6)*
4. **Az elismerés-rendszer és a kinevezés terve** *(N9)*
5. **A pénz paraméterei** *(N10)* — de a **D13/b** szerint ezeket nem kell eltalálni
6. **A teljes mérnöki munka** — ami nem elméleti kérdés
7. 🆕 **A TERJESZTÉS: hogyan jut a program a készülékre.** *Csaba kérése (2026-08-28): a
   végleges verzió legyen **telepíthető a koino.hu-ról** is.* Felírva követelményként.
   ⚠️ Ez **nem mond ellent a D29-nek** (a koino nem böngészőben *fut*) — a letöltés
   terjesztés, nem futtatás; a program utána a weboldal nélkül is működik. **De egy
   feszültséget kimond:** egy weboldal központi terjesztési pont, és aki megszerzi, hamis
   programot oszthatna. A választható válaszok (aláírt kiadás, nyilvános forrás,
   több forrás, a D12 verzió-entitása) a
   [`telepites_telefon.md`](telepites_telefon.md) 7. pontjában vannak — **a döntés még
   nincs meg**. Ami mérnöki munka: Androidon ez **APK**-t jelent, amiben benne van a
   Node-futtató is (ma ezt a Termux adja, végleges kiadásban nem várható el).

**A lépés-sorrend** (lentebb, saját szakaszban) megmutatja, hogy ezek közül **egyik sem áll
az első három szakasz útjában** — a helyi koino, a kapcsolat és a bizalmi háló megépíthető
anélkül, hogy bármelyik nyitott kérdésre válaszolnánk.

### A legfontosabb szerkezeti felismerések

- **A tartós mag és a globális konszenzus ugyanaz a halmaz** (D17) — amikor a D14
  összezsugorította a magot, **három probléma zsugorodott vele**: a GDPR-ütközés, a
  konszenzus és a replikáció.
- **A konszenzus biztonsága = az identitás-réteg biztonsága** (D17) → az identitás **a
  gerinc**, elsőként kell állnia; ez szabja meg a Fázis 2 sorrendjét.
- **Nem öt problémánk van, hanem egy, ami ötször jelenik meg: a KÖZTES MÉRET** (D18/0) —
  ahol a közvetlen ismeret már nem véd, a gráf szerkezete még nem. Egyetlen stratégiai
  válasz: a D11/D13b minta (a drágább képességek a háló erősödésével nyílnak).
- **A „lassú, nyilvános, megtámadható" mintát háromszor mondtuk ki** (D15, D16, D18) — és a
  **D19** adja meg a hiányzó „hol"-t.

### Az őszinte mérleg

> **Nem ütköztünk falba egyetlen kritikus ponton sem.** Egyetlen valódi kutatási függés
> maradt — az **identitás** —, és annak a nehezebbik felét az **EU csinálja meg** (EUDI,
> jogi kötelezettséggel), a másik felére pedig van élő precedens (a Duniter bizalmi hálója
> működik, csak kicsiben: 8 449 tag 6,5 év alatt).

**A kutatási kockázat nagyrészt mérnöki kockázattá és paraméter-választássá alakult.**

**De:** az elméleti híd **nem működő rendszer**. A D17–D20 levezetése **saját
következtetés**, nem kész szakirodalom — kódolás előtt elosztott rendszerek irodalmához
kell mérni. A vita 9. pontjának záró mondata változatlanul érvényes: *a bizonyítást a
működő közösség adja majd.*

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
| D18 | Identitás | **Pozíció, nem darabszám** (távolság-szabály, Duniter-precedens) + **folytonos igazolás** (kockázati korlát, SOHA nem hang). Megújítás helyett **tevékenység = életjel**; a halál megtámadható tanúsítás. ⚠️ Az aláírás a KULCS használatát bizonyítja, nem az EMBER életét (kulcs-öröklés) → a védelem a D20 ösztönző-szerkezete. **Osztalék csak hitelesítettnek** — birtoklás, keresés, befektetés mindenkinek. |
| D19 | Rendszer-tartalom | A program **BEJELENTŐ, nem BÍRÓ**: ellentmondásnál tartalmat hoz létre, a közösség dönt, egyezmény zárja. Ez adja meg a D15/D16/D18 hiányzó „hol"-ját. Zárt lista, felismerhető, gazdát kap, határidőre alapértelmezett kimenet. A **vita** a tartalmi rétegben marad, csak a **kimenet** megy a magba. |
| D20 | Öröklés | **Pénz igen; tudatpont és azonosság soha.** Nem csak méltányosság: **ösztönző-védelem a kulcs-öröklés ellen** — a családot cinkosból egymás őrzőjévé alakítja. Az egyenlő osztalék miatt a dinasztikus koncentráció magától gyengül. |
| D21 | Mag-replikáció | **Ujjlenyomat + bizonyíték** (a tároló nem tud hazudni → bizalmi helyett elérhetőségi probléma). **Három réteg:** önkéntesek · **mindenki tárolja a saját lapját** (~1 KB — az újjáépítés magja) · szeletelés később. **Napi kötegelés** → évi ~365 konszenzus-esemény, bármekkora koinónál. |

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
  - 🟡 **HOGYAN replikálódik: a megoldás ALAKJA megvan, a részletei nem (2026-08-25).**
    A tartalmi rétegre ezt az N6/D14 megoldja (a tudatpont a tárolási térkép) — de a tartós
    magra **épp az a lényeg, hogy NE a tudatponthoz kötődjön**, hiszen senki nem tesz rá
    pontot.
    - **MIÉRT KELL KICSINEK LENNIE — a valódi ok** (Csaba kérdésére): nem a tárhely ára. A
      mag az, amit **mindenkinek** tárolnia kell, mert amit nem tárolsz, azt nem tudod
      magad ellenőrizni — meg kell kérdezned valakit, aki tárolja. **És aki olyat tárol,
      amit más nem tud ellenőrizni, az kapuőr.** Ha a mag akkorára nő, hogy egy átlagos
      telefon nem bírja, akkor csak a jól felszerelt gépek tartják → **ők lesznek az
      érvényesítők → a koinónak megint lesz teteje → a D12 bukása.** *(A Bitcoin
      gyakorlatilag ezen bukott meg: a lánca akkorára nőtt, hogy teljes csomópontot már
      kevesen futtatnak.)*
    - **MÉRET-BECSLÉS (2026-08-25):** egy azonosság-rekord a magban durván **~600 bájt–1 KB**
      (nyilvános kulcs 32 B + állapot/dátumok ~20 B + néhány tanúsítás hivatkozással és
      aláírással ~500 B). Ebből: család (6 fő) 6 KB; falu (500) 0,5 MB; város (100 000)
      100 MB; **ország (10 millió) ~10 GB — ez már sok egy telefonnak.** Vagyis **még a
      minimális mag is méret-problémába fut, jóval a milliárd előtt.**
    - **A MEGOLDÁS ALAKJA:** nem kell mindenkinek a TELJES magot tárolnia ahhoz, hogy senki
      ne lehessen kapuőr. Elég, ha mindenki tárol egy **pici ujjlenyomatot** az egészről
      (néhány tíz bájt), és amikor tudni akarod, hogy „X regisztrált-e", **bizonyítékot**
      kérsz valakitől, aki tárolja. A trükk: a bizonyíték **ellenőrizhető az ujjlenyomat
      ellenében**, tehát **a tároló nem tud hazudni** — az adat kevés helyen van, de senki
      nem kapuőr, mert a kapuőrséghez hazudni kellene tudni. Bevált technika (a könnyű
      kliensek így működnek).
    - ✅ **A TERV MEGVAN (2026-08-25) — lásd D21.** Kapcsolódik: vita 4–5. pont, N11.
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
- **N4. ~~Tanúsítási szabályok számszerűsítése~~** — ✅ **LEZÁRVA (2026-08-25)** → **D18**.
  A gerinc a **távolság-szabály** (pozíció, nem darabszám — Duniter-precedens, 2017 óta
  üzemel), kiegészítve Csaba **folytonos igazolás** ötletével (kockázati korlát, soha nem
  hang). A Duniter öt paramétere átvizsgálva: kettő megtartva, három elvetve (helyettük
  **öregedés** és **tevékenység = életjel**). A halál a D15/D16 mintáját kapja („aki alá
  tud írni, az él"). A pénz-hozzáférés fokozatos, és a Sybil-lyuk befoltozva (**osztalék
  csak hitelesítettnek**). **Nyitva marad:** a paraméter-alapértékek (→ D13/b), a
  visszavonás pontos mechanizmusa, és a **felhatalmazott kibocsátók audit-folyamata**.
  Vita 1. pont.
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

### D18. Az identitás-réteg (2026-08-25 — az N4 lezárása, a 3. elméleti híd)

*A **D17** kimondta: a konszenzus biztonsága = az identitás-réteg biztonsága. Ez a döntés
tehát a Fázis 2 **gerince**. Épít a **D1**-re (meghívásos bizalmi háló + felhatalmazott
kibocsátók), és lezárja az **N4**-et (a tanúsítási szabályok számszerűsítése).*

#### 0. Pontosítás a D17-hez: miért a KÖZEPES méret a veszélyzóna

*(A D17 „nagyban sűrű a háló" megfogalmazása pontatlan volt.)* Nem a méret véd, hanem
**két teljesen különböző védelmi mechanizmus**, amelyek nem érnek össze:

| Méret | Mi véd | Hogyan |
|---|---|---|
| **Kicsi** | **közvetlen ismeret** | tudod, ki valódi, mert ismered. Nem kell rendszer. |
| **Nagy** | **a gráf szerkezete** | nem ismersz senkit, de a hamis csomók *alakja* elárulja magát |
| **Közepes** | 🔴 **egyik sem** | az első már kiesett, a második még nem kapcsolt be |

> ⚠️ A „nagyban a gráf megvéd" a **legkevésbé bizonyított** állítás az egészben: a Duniter
> soha nem lett nagy (lásd lent a számokat), és nagyban a támadás HASZNA is nagyobb. A
> veszély tehát nem eltűnik mérettel — **átalakul**.

#### 1. Mit állít a tanúsítás — és mit NEM

A **D1** zárójele a legfontosabb mondat az egész identitás-kérdésben: a tanú **csak azt**
állítja, hogy *valódi, külön személy, aki még nem regisztrált*.

| Mit állíthatna | Ítélet |
|---|---|
| „létező, külön ember" | ✅ **ennyi kell** — gyenge állítás, olcsó, nem jár felelősséggel |
| „tudom, hogy X-nek hívják" | ❌ személyes adat, felelősség |
| „megbízom benne" | ❌ hírnév-rendszer lenne, kapuőrséggel |

Ettől a tanúsítás **nem ajánlólevél**: nem kell jól ismerned valakit, és nem felelsz a
viselkedéséért.

#### 2. A VÉDELEM MAGVA: távolság-szabály — pozíció, nem darabszám

**A darabszám hamisítható, a pozíció nem.** Ezer hamis azonosság **tökéletesen** teljesít
bármilyen darabszám-küszöböt, ha egymást igazolják — amit viszont **nem tudnak**
előállítani, az a valódi hálóban elfoglalt helyzet.

> **Falusi hasonlat.** „Kezeskedik érted öt ember?" — ha hozott öt cinkost, ez a próba
> átmegy. „Tőled indulva, ismerőstől ismerősig, néhány lépésben eléred-e a falu ismert
> embereinek nagy részét?" — egy valódi falusi eléri; egy kívülálló öt cinkossal soha,
> mert ők egy **sziget** maradnak.

**A Duniter/Ğ1 ezt kidolgozta és 2017 óta üzemelteti** (forrás: duniter.org, lekérdezve
2026-08-25):
- **Referens tagok:** akiknek a befelé ÉS kifelé menő tanúsításaik száma is meghaladja az
  **N^(1/5)** értéket (N = összes tag) — a küszöb **magától skálázódik** a mérettel.
- **Belépés feltétele:** az új tag **6 lépésen belüli környezete tartalmazza a referens
  tagok legalább 80%-át.**

**Ez a koino „csillag vagy háló?" kérdésének a mérőszáma is** — a D11/D13b minta
(*„akkor kapcsold be, ha a háló elég erős"*) csak ezzel válik értelmes mondattá.

#### 3. FOLYTONOS IGAZOLÁS (Csaba ötlete, 2026-08-25) — a hitelesség fokozat, nem kapcsoló

A mai kép kétállapotú: be vagy engedve, vagy nem. Csaba javaslata folytonossá teszi: az
e-emberek a belépés UTÁN is igazolhatják egymás valódiságát, és **több igazolás nagyobb
pénzügyi mozgásteret ad** (pl. az egyszerre utalható összeg).

**Miért erős:** pont a **közepes rést tömi be**. Ott az emberek egyszerűen kevesebb
igazolással rendelkeznek, tehát alacsonyabb a korlátjuk — a rendszer **magától fékez a
tényleges bizonyosság szerint**, emberenként, nem koinónként. Ez a D11-logika finomabb
felbontásban.

> **🔒 KÖTELEZŐ VÉDŐKORLÁT: a több igazolás KOCKÁZATI KORLÁTOT emeljen, SOHA NEM HANGOT.**
> Amint az „igazolás = jog" gondolat létezik, jönni fog a nyomás a kiterjesztésére (több
> igazolás = nagyobb szavazatsúly?) — és ott a koino megszűnik. Ez nem kiváltság, hanem
> **csalás-védelmi limit**, mint egy új banki számla átutalási korlátja. A szavazathoz
> semmi köze.

- **Nem a darabszám, a FÜGGETLENSÉG számít.** Tíz igazolás egy baráti körből kevesebbet ér,
  mint három a háló távoli pontjairól — különben kialakulnak a kölcsönös igazolgató gyűrűk.
- **Kapcsolat az N9-cel:** ez az **elismerés-entitás** egy speciális fajtája („igazolom,
  hogy valódi ember"). Az N9 szabálya („tájékoztat, nem jogosít") alól ez **szándékos, szűk
  kivétel** — épp ezért kell írásban rögzíteni, meddig terjed.
- **Kapcsolat a D15-tel:** aki igazolta, hogy létezel, az a természetes tanú akkor is, ha
  elvesztetted a kulcsod. **Ugyanaz a halmaz, két feladatra.**

#### 4. A Duniter-paraméterek átvizsgálva (Csaba döntései, 2026-08-25)

**Keret:** a Duniter azért ilyen szigorú, mert náluk a bizalmi háló **közvetlenül a
pénzteremtést** őrzi (minden tag = pénznyomtatási engedély). A koino identitás-rétege
**először csak a szavazást** őrzi, a pénz később jön és kapuzva (D11) — **tehát a koino
lazábban indulhat, és a tét növekedésével szigorodhat.**

| Duniter-szabály | Érték | Döntés |
|---|---|---|
| Tanúsítás belépéshez | 5 | ✅ **elv megtartva**, de az érték **közösségi paraméter** (medián, D4) — kicsiben az 5 majdnem egyhangúság lenne, tehát vétójog, nem küszöb |
| Max. tanúsítás / tag | 100 (élethosszig) | ✅ **megtartva**, de **időszakonként**, nem élethosszig; az értéket a közösség adja (medián) |
| Min. szünet két tanúsítás közt | 5 nap | ❌ **ELVETVE** — egy tanár 30 diákkal 150 napig onboardolna; a normális csoportos belépést bünteti (osztály, munkahely). A távolság-szabály végzi az érdemi munkát, ez csak másodlagos védelem |
| Tanúsítás lejárata | 2 év, megújítandó | ❌ **ELVETVE, pótlás nélkül** (lásd 5.) |
| Tagság-megújítás | évente, különben kiesés | ❌ **ELVETVE** → helyette **TEVÉKENYSÉG = ÉLETJEL** (lásd 6.) |

#### 5. A TANÚSÍTÁS NEM JÁR LE, ÉS NEM IS HALVÁNYUL (Csaba döntése, 2026-08-25)

> „Akiről egyszer bebizonyosodott, hogy valódi ember, az tartson ki addig, ameddig meg nem
> hal, és a környezete ezt jelzi." — Csaba

**Két megoldást is elvetettünk**, és a második az enyém volt:
- ❌ a Duniter **2 éves lejárata** — folyamatos házimunkát ró mindenkire
- ❌ Claude javaslata, az **elhalványulás** (a tanúsítás súlya csökken az idővel) — szintén
  elvetve, és Csaba érve jobb volt: **ez az összes felhasználót terhelte volna egy ritka
  támadás miatt** (klasszikus biztonsági hiba), és filozófiailag is téves: **hogy valaki
  valódi ember, az TÉNY, nem előfizetés.** Nem jár le.

**A helyette választott elv: kivétel-alapú, nem folyamatos.** A rendszer nem terheli a
normális esetet, hanem **akkor néz oda, amikor tényleg ellentmondás van** (7. pont). A
**visszavonás** marad kifejezett cselekvés.

> **Felírva, de NEM megépítve** *(a lenti tervezési alapelv szerint)*: ha a „csendes halál"
> valaha gondot okoz, van olcsó folt — a rendszer **ritkán** megkérdezhetné a tanúkat:
> *„X köztetek van még?"* — egyetlen koppintás, nem újra-tanúsítás. Nem elhalványulás,
> csak egy néha feltett kérdés.

#### 6. Éves megújítás helyett: A TEVÉKENYSÉG AZ ÉLETJEL

Minden művelet a koinóban **aláírt** (a privát kulcs matematikai bizonyítékot ad arról,
hogy te állítottad elő). Ezért **nincs szükség külön „még élek" gombra**: aki szavaz,
tudatpontot rendez, tartalmat ír — az él.

Az aktív e-ember **soha nem találkozik ezzel a szabállyal.** Aki évek óta nincs sehol, az
**alvó** lesz (nem törölt): az azonossága megmarad (a D14 szerint a helye úgyis örökre
foglalt), de a tanúsításai nem számítanak be másokéba, és — ha már van pénz — **nem kap
osztalékot**. A visszatérés egyszerű.

#### 7. A HALÁL — tanúsítás, a D15/D16 mintájával

**A halál csak akkor sürgős probléma, amikor már van pénz:** a D10 egyenlő osztaléka miatt
egy halott ember **örökké termelne pénzt** — ugyanaz a hígulás, mint a Sybil-támadásnál,
csak természetes okból. *(Az N10 ezt már felvetette.)*

| Elem | Hogyan |
|---|---|
| Ki kezdeményezi | több **független** tanú a hálóból (akik a valódiságát is igazolták) |
| Mennyi idő | **hosszú, nyilvános várakozás** |
| Ki tiltakozhat | **bárki** — és mindenekelőtt **az érintett** |

Ugyanaz az alakzat, mint a lassú pénznél (D16) és a kulcs-helyreállításnál (D15): **lassú,
nyilvános, megtámadható.**

##### ⚠️ A KULCS-ÖRÖKLÉS TÁMADÁS (Csaba, 2026-08-25 — egy elvetett szabály helyreigazítása)

Az első megfogalmazás ez volt: *„aki alá tud írni, az él"* — egyetlen aláírt művelet
érvénytelenítse a halál-bejelentést. **Ez HIBÁS, és Csaba mutatott rá:**

> „A haldokló nagyszülő megadja a jelszavát a leszármazottjának a halála előtt, és akkor
> neki, ha aktív, plusz profilja van."

**A hiba pontosan:** az aláírás nem azt bizonyítja, hogy az EMBER él, hanem hogy a **KULCS
használatban van**. A kettő nem ugyanaz.

Ez a támadás **rosszabb a kulcslopásnál**, mert **önkéntes** — nincs áldozat, aki
tiltakozzon, és semmilyen lopás-felismerés nem fogja meg. Egyenlő osztalék mellett (D10)
minden örökölt kulcs **örökös jövedelemforrás**, tehát valódi gazdasági ösztönző. És ha
normalizálódik („persze, hogy örökölöd a nagyi fiókját"), akkor nem ritka kivétel lesz,
hanem tömeges.

**A javított szabály — három rétegben:**

1. **Az aláírás nem érvénytelenít, hanem ESZKALÁL.** Ha a halál-bejelentést aláírás
   vitatja, az nem automatikus felmentés: **újra-tanúsítás** következik — független
   tanúknak kell megerősíteniük, hogy a személy **jelen van**. Aki valóban él, azt látják
   az emberek; egy örökölt kulcs nem tud embereket előállítani.
2. **A PÉNZ BEFAGY az ellentmondás idejére** (Csaba). Ha egyszerre van halál-bejelentés és
   kulcshasználat, a **pénzmozgás megáll**, amíg a közösség nem dönt. A többi (szavazás,
   tartalom) mehet — az mind visszafordítható (D15 táblája). **Csak azt fagyasztjuk, ami
   nem az.** A vita helye: **D19**.
3. **A FŐ VÉDELEM AZ ÖRÖKLÉS → D20.** Nem technikai, hanem **ösztönző-szerkezeti**: ha van
   tisztességes út a nagymama pénzéhez, akkor a tisztességtelennek versenytársa támad. A
   testvérek, akik a bejelentett halálból részt kapnának, **érdekeltté válnak a
   bejelentésben** — a család cinkosból egymás őrzőjévé alakul. A csaláshoz **mindenkinek
   együtt kell hazudnia**, és mindenki részt kérne.
4. **Opcionális erősítés EU-polgároknál:** az EUDI-tárcát az állam a halotti
   nyilvántartásból érvényteleníti — ez **további független tanú** lehet (a D15 szabálya
   szerint: egy a több közül, önmagában soha nem elég).

**Ami őszintén marad:** a védelem arra a pillanatra épül, amikor **valaki bejelenti a
halált**. Ha az egész család hallgat, nincs mi kiváltsa — a D20 ezt teszi drágává, de nem
lehetetlenné. **És általánosabban: ezt teljesen kizárni nem lehet** — bármilyen tisztán
digitális azonosság átadható. Csak két valódi védelem létezik: **(a)** időszakos
**jelenlét**-bizonyítás (személyes, biometrikus vagy társas), vagy **(b)** az azonosság
**magától veszítsen értéket**, ha nem újítják meg. A koino **egyiket sem** választja
alapesetben (mindkettő terhelné a becsületes többséget) — helyette a **kivétel-alapú
D19-D20 kombinációt**, az (a)-t pedig opcionálisan meghagyja a nagy tétű képességekhez.

*(Összefüggés: ha valaki elvesztette a kulcsát ÉS halottnak nyilvánítják, aláírni nem tud
— akkor a D15 helyreállítási útján kell visszajönnie. A két mechanizmus egymásba
kapaszkodik.)*

**Az örökség — Csaba döntése:** a halott tudatpontjai felszabadulnak, és a **D14** szerint
aminek nincs gazdája, az eltűnik. *„Amin nincs tudatpont, az nem fontos a közösségnek,
tehát kuka."* Vagyis **ami csak az elhunytnak volt fontos, elhalványul vele; amit mások is
értékesnek tartanak, arra ráteszik a saját pontjaikat — és megmarad.** Nem külön szabály a
halálra: csak a D14, alkalmazva.

#### 8. A PÉNZ-HOZZÁFÉRÉS FOKOZATAI — és a Sybil-lyuk befoltozása

Csaba javaslata: a nem (vagy még nem teljesen) hitelesített e-ember is részt vehessen a
gazdaságban, amíg az EUDI nem elérhető.

**A lyuk, amit meg kellett találni:** a D10 szerint a pénz **egyenlő osztalékként
keletkezik**. Ezért a Sybil-támadás nyeresége **nem az utalásnál keletkezik, hanem a
KELETKEZÉSNÉL** — ezer hamis e-ember hígítja a pénzt akkor is, ha egyikük sem tud utalni.
Az utalás korlátozása a kifolyást zárja el, a **csapot** nem.

> **A SZABÁLY: a nem hitelesített e-ember BIRTOKOLHAT és HASZNÁLHAT pénzt — de NEM KAP
> OSZTALÉKOT.** Hozzájuthat úgy, hogy **megkeresi** (feladatvállalás) vagy **megveszi**
> (befektet — Csaba pontosítása: bárki vásárolhat koino-pénzt hitelesítés nélkül is).

Így a hamis azonosság **nem termel semmit** (tehát nem éri meg létrehozni), a valódi ember
viszont, aki még nem tudta igazolni magát, **teljes értékűen részt vehet**.

A teljes jogosultság (osztalék + magasabb utalási korlátok) **két úton** nyílik:
**EUDI-igazolás VAGY elegendő, független, megfelelő hálózati távolságú tanúsítás** — az
értékeket a közösség adja (medián, D4 / D13b).

#### 9. Hatókör: EU-FIRST, de a háló az elsődleges (Csaba, 2026-08-25)

> „Ha kitalálunk egy nagyon jó bizalmi hálót, akkor jó; ha nem, egyelőre azzal is
> megelégszem, ha EU-n belül működik — aztán ha elterjed, azt már az EU vagy az európai
> koino közösség kitalálja."

**Elfogadva**, egy megszorítással: az **EUDI-bevezetés csúszik** (2026 tavaszán a
tagállamok kevesebb mint harmada állt készen), ezért a **bizalmi háló marad az elsődleges
út**, az EUDI pedig a gyorsító — ahogy a D1 amúgy is mondja. Fordítva építve egy csúszó
EU-s ütemterven múlna, hogy egyáltalán indul-e a koino.

**Elfogadott következmény:** egy EU-polgár azonossága *robusztusabb* lesz (két
helyreállítási út a D15 szerint, nem egy) — de **a jogai nem többek**. A védettség eltér,
a hang nem.

#### 10. BOOTSTRAP-TANULSÁG — ami MA, 16 emberrel is érvényes

**A Duniter nem csillagból indult:** 59 alapító taggal kezdtek, akik **egymást
tanúsították** — a háló az első napon háló volt, nem sugár.

A koino mai állapota csillag (minden tanúsítás Csabához fut vissza) — ez **kiindulási
állapot, nem szerkezeti tulajdonság** (mások is meghívhatnak, csak még nem tették). A
Duniter-képlettel 16 tagnál a referens-küszöb ≈ 2 be- és 2 kimenő tanúsítás, vagyis
**ahhoz, hogy egyáltalán legyenek referensek, az embereknek EGYMÁST kell tanúsítaniuk.**

> Ez a mondat való az ismertető anyagokba: **„nem az a dolgod, hogy engem igazolj, hanem
> hogy egymást igazoljátok."**

#### 11. A VALÓSÁG SZÁMAI — és ami nyitva marad

> **Ğ1: 8 449 tag és 98 756 tanúsítás (2023. szept.), az induláskor (2017. márc.) 59 tag.**

Hat és fél év alatt 59-ből 8 449. Egy tiszta bizalmi háló **működik, de lassú** — ez
támasztja alá az EU-first + EUDI-gyorsító hatókört (9. pont), és ez az oka annak is, hogy
a „nagyban a gráf megvéd" állítás **csak ~8 000 fős léptékben bizonyított**.

**Nyitva marad:**
1. A konkrét paraméter-alapértékek (tanúszám, időszakos korlát, öregedési ütem,
   súly-küszöb a távolság-szabályhoz) — de a **D13/b** szerint ezeket nem kell eltalálni,
   csak alapértelmezésnek megadni.
2. A **visszavonás** pontos mechanizmusa (a Duniter dokumentációja, amit elértünk, nem
   részletezi — utánanézendő).
3. A **felhatalmazott kibocsátók** audit-folyamata (a D1-ből maradt).

### D19. A rendszer BEJELENTŐ, nem BÍRÓ (2026-08-25, Csaba)

*Ez a döntés egy lyukat tömít be, amit HÁROMSZOR nyitottunk ki anélkül, hogy észrevettük
volna.*

A **D15** (kulcs-helyreállítás), a **D16** (pénzmozgás) és a **D18** (halál-bejelentés)
mind ugyanazt mondja: *„lassú, nyilvános, megtámadható"*. Egyikük sem mondta meg, **HOL**.
Hol látja meg bárki? Hol tiltakozik? Hol vitatkoznak róla?

> **A válasz: a koinóban magában.** Ellentmondás vagy döntést igénylő kivétel esetén **a
> program létrehoz egy TARTALMAT**, ami jelzi a helyzetet; a közösség megvitatja, és
> **egyezmény zárja le.**

Ettől a koino olyat csinál, amit kevés rendszer: **nem eldönti a kivételes eseteket, hanem
megkérdezi.** A program nem bíró, hanem bejelentő.

**Négy kötelező korlát:**

| # | Korlát | Miért |
|---|---|---|
| 1 | **Zárt lista** — csak meghatározott események válthatják ki | különben egy módosított koino-verzió (D13) elárasztaná a napirendet „rendszer-üzenetekkel" — ami **napirend-manipuláció**, épp az N6 másik fele |
| 2 | **Felismerhető** — látszódjon, hogy rendszer hozta létre | ne lehessen emberi véleménynek álcázni |
| 3 | **Gazdát kap** — az érintettek és tanúik értesítést kapnak | a D14 szerint gazdátlan entitás eltűnik; itt az érintetteknek amúgy is ez a legfontosabb |
| 4 | **Alapértelmezett kimenet határidőre** | ha a közösség nem dönt, a **nem-döntés nem lehet a támadó nyeresége**: a pénz marad fagyasztva, a többi feloldódik |

**Tárolás — a mag NEM nő (Csaba és Claude egyeztetése):**

| Mi | Hova | Miért |
|---|---|---|
| **A vita** (a tartalom, a hozzászólások, az érvek) | ❌ **normál tartalmi réteg** | ha lezárult és senkit nem érdekel, elfelejthető (D14) |
| **A kimenet** („ez az azonosság halott") | ✅ **a magba** | de **nem új adatfajtaként**: néhány mező az azonosság-rekordon, ami eddig is a magban élt (állapot, mikor változott, kik tanúsították, a lezáró egyezmény azonosítója) |

*(Nagyságrend: egy vitatott halál kimenete ~100 bájt. Halál ritka, vitatott halál még
ritkább — elhanyagolható.)*

**Ez ma nem létezik:** a koino ma értesítést tud létrehozni, és a cron le tud zárni
javaslatokat — de **tartalmat semmi nem hoz létre magától**. Valódi új képesség.

**Alkalmazási esetek (a zárt lista jelöltjei):** vitatott halál-bejelentés (D18),
kulcs-helyreállítási kérelem (D15), megtámadott pénzmozgás (D16). További jelöltek később
vizsgálandók — a lista **bővítése maga is közösségi döntés** kell legyen.

### D20. Öröklés: a pénz igen, a tudatpont és az azonosság soha (2026-08-25, Csaba)

*Ez egyszerre válasz az N10 egy nyitott kérdésére („elhunyt e-ember pénzének sorsa") és
**ösztönző-szerkezeti védelem a D18 kulcs-öröklés támadása ellen**.*

| Mi | Örökölhető? | Miért |
|---|---|---|
| **Azonosság** | ❌ soha | ez maga a támadás, amit kizárunk |
| **Tudatpont** | ❌ nem | nem vagyon, hanem **figyelem** — mindenkinek ugyanannyi van; örökölni megtörné az egyenlőséget. A halott pontjai felszabadulnak (D14), és ami csak neki volt fontos, elhalványul vele |
| **Pénz** | ✅ igen | valódi vagyon: megkeresték vagy megvették. Az elhunyt rendelkezhet róla; ha nem rendelkezett, **egyenlően oszlik a közvetlen leszármazottak közt** |

#### Miért VÉDELEM ez, nem csak méltányosság

> **Ha van tisztességes út a nagymama pénzéhez, akkor a tisztességtelen útnak versenytársa
> támad.**

| | Öröklés nélkül | Örökléssel |
|---|---|---|
| Az örökös, aki tartja a kulcsot | nyer mindent, senki nem veszít vele | **a testvérei elől lopja el a részüket** |
| A többi leszármazott | nincs érdekük szólni | **érdekük bejelenteni a halált** |
| A csalás feltétele | egy ember hallgat | **mindenkinek együtt kell hazudnia** — és mindenki részt kérne |

**A családot cinkosból egymás őrzőjévé alakítja.** Nem kell felderíteni semmit — elég, ha
az érdekek szétválnak. *(Csaba: „még így is fenntarthatják a profilt, de csökken a haszon,
már csak azért is, mert több embernek kell hazudnia érte, és ezért vélhetően mindenki
osztalékot kérne.")* **A támadás nem lehetetlen, csak nem éri meg** — a koino végig ezt
csinálja.

#### A dinasztikus vagyon ellenvetése — és miért gyengébb itt

A szokásos ellenérv az öröklés ellen a vagyon-koncentráció. A koino-pénznél ez **magától
gyengül**: az egyenlő osztalék (D10) folyamatosan új pénzt teremt mindenkinél, tehát a
régi vagyon **relatív értéke magától csökken**. Fix mennyiségű pénznél (Bitcoin) az
öröklés örökre koncentrál — itt nem.

### D21. A tartós mag replikációja (2026-08-25 — az N1 lezárása)

#### A szerkezet: ujjlenyomat + bizonyíték

Képzeljünk el egy könyvet, amiben **minden oldal kap egy ellenőrző számot**; két-két szám
összevonva ad egy magasabb szintűt, és a csúcson **egyetlen szám** áll az egész könyvre
(Merkle-fa). Aki csak ezt az egy számot ismeri, az egy **oldal + a hozzá vezető ellenőrző
láncolat** birtokában **maga ki tudja számolni**, hogy az oldal tényleg a könyvben van-e.

| Mit tárol | Méret |
|---|---|
| **mindenki** — a csúcs-szám (ujjlenyomat) | **~32 bájt** |
| **egy ellenőrzés** („X regisztrált-e?") — a *bizonyíték* | ~1 KB, alkalmanként |
| **a teljes „könyv"** | csak az, aki vállalja |

> **AKI TÁROL, NEM TUD HAZUDNI.** Hamis oldal nem adja ki a csúcs-számot. Ezért a tárolónak
> **nem kell megbízhatónak lennie — akár ellenség is lehet.** Ez a mag tárolását bizalmi
> problémából **elérhetőségi** problémává alakítja, és az sokkal könnyebb.

**Mikor kell bizonyíték?** Csak határhelyzetekben: tanúsításkor (nincs-e már regisztrálva),
szavazat-számláláskor (valódi tag-e), később a pénznél (hitelesített-e a küldő). Ismerősöknél
soha.

**Ha senki nem válaszol:** ez **állapot, nem hiba** — *„jelenleg nem ellenőrizhető"*, pontosan
a szellem-kártya logikája (N6/D14). Egy nem ellenőrizhető szavazat még nincs beszámolva; amint
megjön a bizonyíték, beszámolódik. A hosszú döntési ablakok miatt (D16/D17) erre bőven van idő.

#### A HÁROM TÁROLÁSI RÉTEG — Csaba támadás-felvetése nyomán

> **Csaba:** *„a kizárólag önkéntes résszel az a bajom, hogy támadható… mi van, ha valaki
> megkeresi az összes önkéntes tárolót, és egyidejűleg törli őket?"*

**Jogos, és az első tervem hiányos volt.** A csúf összefüggés: *ahhoz, hogy egy tároló hasznos
legyen, meg kell találni — amit meg lehet találni, azt meg lehet támadni.* Néhány tucat,
nyilvánosan ismert önkéntes ellen egy elszánt (akár állami) támadó egyidejű akciója nem
irreális — és a mag elvesztése a **gerinc** elvesztése (D17).

| Réteg | Ki | Mire jó |
|---|---|---|
| **1. Önkéntes tárolók** | néhány tucat vállalkozó | a hétköznapi kiszolgálás — gyors, egyszerű, **holnap megépíthető** |
| **2. MINDENKI TÁROLJA A SAJÁT LAPJÁT** | minden e-ember, ~1 KB | **az újjáépítés magja** — ez a valódi védelem |
| **3. Szeletelés (DHT)** | később, méret szerint | kapacitás **és** ellenálló képesség |

**A 2. réteg az igazi válasz:** ha mindenki tárolja a saját azonosság-rekordját és ellenőrző
láncát, akkor a törléshez **gyakorlatilag minden tag készülékét** el kellene pusztítani. Az
újjáépítés magától megy (mindenki hozza a lapját, a csúcs-szám igazolja a helyességet), aki
pedig elveszíti a sajátját, **újra tanúsíttathatja magát** (D18) — **fokozatos romlás, nem
összeomlás**. Az önkéntesek ettől nem az igazság forrásai, csak **kényelmi réteg**.

> Filozófiailag is ez a helyes: **az azonosság-rekordod nálad lakik.**

**Az 1. és 3. réteg egymást váltja, nem zárja ki:** a csúcs-szám mindkettőnél ugyanaz, ezért az
átállás **semmi mást nem érint**. Az első megvalósítás az önkéntes változat.

> ⚠️ **Módosítás (Csaba, 2026-08-25 — milliárdos cél):** a szeletelés **nem „később, ha a
> méret kikényszeríti"**, hanem **az első naptól a tervben van**. Az illesztésnek eleve
> engednie kell a 3. réteget, még ha az első kiadás az 1.-et használja is — különben
> pontosan az a fajta „majd kicseréljük" adósság keletkezik, amit a milliárdos cél kizár.

#### KÖTEGELÉS — a konszenzus-teher eltüntetése

Minden regisztrációtól új csúcs-szám lesz, és hogy melyik az érvényes, abban mindenkinek egyet
kell értenie (D17). **De a koinóban nincs azonnali véglegesség** (D16/D17) — egy új tag ráér
órákat várni.

> **Ezért a regisztrációk KÖTEGEKBEN rögzülnek.** Napi köteggel egy koino **évi ~365
> konszenzus-eseményt** igényel az azonossághoz — akkor is, ha tízmillióan vannak.

Ezzel a legdrágábbnak látszó teher gyakorlatilag eltűnik. **Alapérték: 1 nap** (Csaba) —
egyben a belépés várakozási ideje. Közösségi paraméter (lásd D13/c).

#### BOOTSTRAP: honnan tudja egy új készülék a helyes csúcs-számot?

A koinóba **valaki meghív** (D1) — **tőle kapod meg a kiinduló ujjlenyomatot is**, és
összevetheted másokéval.

> **Ugyanaz a társas bizalom, ami beenged a közösségbe, alapozza meg a technikai bizalmadat
> is.** Nem két rendszer, egy.

### D13/c. A koino-szintű paraméterek is ENTITÁSOK (2026-08-25)

A **D4** medián-mechanizmusa eddig **entitásonként** működött (egy tartalom küszöbeit annak a
tulajdonosai adják). A kötegzárás, a tanúszám és „még jó pár dolog" viszont **koino-szintű,
globális paraméter** — kinek a mediánja dönt róluk?

> **Válasz: a paraméter is legyen entitás**, a fa tetején, a koino-verzió mellett (D12).
> Akinek fontos, tudatpontot rendel hozzá, és ő tehet rá **érték javaslatot**.

Ugyanaz a gépezet, megint egy szinttel feljebb — **nincs új mechanizmus**, és a globális
paraméter nem adminisztratív dolog lesz, hanem **ugyanolyan látható, vitatható, módosítható
tartalom, mint bármi más**.

### D22. P2P AZ ELSŐ KIADÁSTÓL — nincs központi szerveres kiadás (2026-08-26, Csaba)

> „A központi server részét most nem kell fejleszteni. A kis családi közösségeknek is
> P2P-nek kell lenniük." — Csaba

**Ez a döntés felülír egy tervezési feltevést.** Az eredeti lépés-sorrend az A szakaszt
(kulcsok, bizalmi háló) kifejezetten *„még központi szerverrel"* építette volna meg, azzal
az érveléssel, hogy az identitás-réteg P2P nélkül is kipróbálható. Ez az érv technikailag
igaz volt — de **egy központi szerveres köztes kiadást feltételezett**, és Csaba ezt nem
akarja.

| | Ami eddig volt | Ami a D22 után van |
|---|---|---|
| Az első kiadás | központi szerver, fokozatosan feloldva | **P2P, az első naptól** |
| A mai koino.hu szerepe | a fejlődés kiindulópontja | **prototípus, ami tanított** (befagyasztva) |
| A „kicsi" közösség | ugyanaz a szerver, kevés emberrel | **saját, önálló P2P-háló** |

**Ami ELESIK ezzel:** a *„ne újraírás legyen, hanem feloldódás"* vezérelv. Nem lehet
feloldani egy szervert, amire nem építünk. Őszintén ki kell mondani: **a D22 újraírást
jelent** — a régi elv helyébe másik lép:

> **ÚJ VEZÉRELV: a régi koino a prototípus, ami tanított; az új a KÉSZÜLÉKEN kezdődik.**
> Nem oldódik fel, hanem **örökölünk belőle**: a domain-logikát (küszöbök, bizonyossági
> mutató, javaslat-életciklus), a felületet (kártyák, pakli, szövegszerkesztő) és — a
> **H5** révén — az eddigi adatot. Ami megmarad a régi elvből: **minden lépés önmagában
> működő, kiadható állapot.**

**Ami NEM változik:** a függőségi sorrend (nincs konszenzus identitás nélkül, nincs pénz
bizonyított identitás nélkül) és a milliárdos léptékű cél. Az építés sorrendje viszont
átrendeződik — lásd a lépés-sorrend szakaszt.

#### ⚠️ Fogalmi tisztázás: a P2P nem jelent nulla infrastruktúrát

Két készülék nem talál egymásra magától: kell egy **jelzőpont** a kapcsolat felépítéséhez,
és tűzfalak mögött néha egy **továbbító**. Ezek viszont **nem hatóságok** — nem látják az
adatot, nem dönthetnek róla, bárki üzemeltethet ilyet, és bármikor cserélhetők.

> A különbség a mai szerverhez képest nem az, hogy „van-e gép a hálózaton", hanem hogy
> **az igazság forrása a szerver-e vagy az aláírás.**

Ez egybevág az N11 hibrid hálózatával (a telefon rossz P2P-polgár, kellenek önkéntes
tartós csomópontok) — azzal a különbséggel, hogy ezek a csomópontok **kényelmi réteg**,
nem hatóság (pontosan a D21 1. tárolási rétegének logikája).

#### Mit tud a böngésző, és mit nem — a Szakasz 2 alapjai (2026-08-27)

*Csaba kérdésére: „a böngészők kiszolgálnak P2P rendszereket is? meg azoknak kell domain
név is, nem?"*

A **WebRTC** az a technológia, amivel a böngészők közvetlenül beszélnek egymással
(eredetileg videohívásra készült). Adatot is tud küldeni, és **mérve elérhető** (2026-08-26:
`RTCPeerConnection` + `DataChannel` + `WebSocket` mind rendben). **Három valódi korlát van**,
és ezeket nem szabad elkenni:

| # | Korlát | Mit jelent |
|---|---|---|
| **1** | **A bemutatkozás** | Két böngésző nem tud egymásról. Kell egy **jelzőpont**, ami összeismerteti őket („hol vagyok, hogyan érhetsz el"). Amint a kapcsolat létrejött, **a jelzőpont kiszállhat** — az adat közvetlenül megy. Ez **postás, nem hatóság**: nem látja a tartalmat, bárki üzemeltethet ilyet |
| **2** | **A routerek mögötti rejtettség** | A legtöbb eszköz otthoni router mögött van, saját cím nélkül. A WebRTC ezt meg tudja kerülni, de az esetek egy részében (jellemzően 10–20%) nem sikerül — olyankor kell egy **továbbító**, ami átjátssza a forgalmat. Ez sávszélességet fogyaszt: **ez a P2P legdrágább része**, nem a tárolás |
| **3** | **A böngésző nem fut a háttérben** | Ha bezárod a lapot, a csomópontod eltűnik. Ezért kellenek **önkéntes, mindig futó csomópontok** (N11) — nem azért, mert ők tudják az igazságot (nem tudják, az aláírás tudja), hanem mert **ott vannak, amikor te nem** |

#### A domain kérdése — két külön dologra kell, és a válasz különbözik

| Mihez? | Kell domain? |
|---|---|
| **A program letöltéséhez** | Kell egy hely, ahonnan először megszerzed — de ez lehet **fájl is**: a program egy mappa, elküldhető e-mailben, átvihető pendrive-on. **A program terjesztése és a hálózat működése két külön dolog.** |
| **A csomópontok egymásra találásához** | **Nem domain kell, hanem KULCS.** A koinóban a címed a **nyilvános kulcsod** — nem egy név, amit bérelni kell valakitől, és nem vehető el. Domain csak a *jelzőpontoknak* kell (azokat meg kell találni induláskor), de ezekből több is lehet, cserélhetők, és nem birtokolják a hálózatot |

> **A domain tehát kényelmi réteg, nem hatóság.** Ha a koino.hu holnap eltűnik, a program
> megmarad mindenkinél, akinél már fut, és más jelzőponttal működik tovább.

#### 🔗 A koino.hu jövője (Csaba, 2026-08-27)

> „Ameddig a P2P el nem készül, üzemeltetném a koino.hu-t, **hátha kérdezne valaki
> valamit**." — Csaba

Ez illeszkedik a befagyasztási döntéshez, és a prototípus **kap egy második szerepet**:

> Amikor a P2P koino elkészül, **a koino.hu lesz az egyik hely, ahonnan letölthető.**
> A prototípus nem versenytársa lesz az újnak, hanem **a kapuja**.

### D23. A megvalósítás nyelve: JavaScript marad (2026-08-26, Csaba)

A kérdés jogosan merült fel: a JS/HTML/CSS hármas eredetileg **a központi weboldalas
kiszolgálás miatt** lett választva — ha az elesik (D22), akkor a nyelvválasztás is
újranyitható. Az átvizsgálás eredménye:

| Követelmény | Valódi JS-korlát? |
|---|---|
| Determinizmus a pénznél (D10/D16) | ❌ nem — `BigInt`-tel egész aritmetika; fegyelem kérdése, nem nyelvé |
| Kriptográfia (aláírás, Merkle) | ❌ nem — a műveletet natív/WASM könyvtár végzi |
| Mobil háttérfutás (N11) | ⚠️ valódi korlát, de **platformi, nem nyelvi** — a telefon minden nyelven rossz P2P-polgár |
| Böngészőben futó P2P | ✅ **a JS-nek ELŐNYE**: böngészőben csak a JS-libp2p (WebRTC/WebTransport) működik érdemben |
| Milliárdos lépték teljesítménye | 🟡 számít, de a szűk keresztmetszet ritkán a nyelv — **mérni kell, nem saccolni** |

**Egyik sem blokkoló**, és a böngésző-elérhetőség (telepítés nélkül bárki csatlakozhat)
egyenesen a JS mellett szól — ez a koino „bárki beléphet" ígéretének gyakorlati feltétele.

#### A nyelvhatárt a réteg-besorolás jelöli ki (H6)

A H6 adat-osztályozás mellékterméke egy váratlanul hasznos térkép:

| Réteg | Mezők | Természete |
|---|---|---|
| `mag` | **8** | determinizmus-kritikus, ritkán változik |
| `lanc` | 36 | aláírt cselekvés |
| `tartalom` | **73** | gyakran változik, **nem** konszenzus-kritikus |
| `szamitott` | 56 | eldobható gyorsítótár |
| `helyi` | 51 | soha nem hagyja el a készüléket |

> **Nem a programot kell nyelvre választani, hanem legfeljebb a MAGOT** — és az néhány
> száz sor, nem 200 fájl. Ha valaha kiderül, hogy a mag más nyelvet (pl. Rust/WASM)
> kíván, az **egy jól körülhatárolt csere**, nem újraírás — épp azért, mert a H6 már
> most megmondja, hol a határ.

**Döntés:** a nyelvi kérdés ezzel **lezárva a Fázis 2 egészére**; a mag nyelve külön,
későbbi kérdés, és csak akkor kerül elő, ha mérés indokolja.

### D24. A meglévő adat sem költözik — új regisztráció lesz (2026-08-26, Csaba)

> „Ez sem fontos. Új regisztrációt fogok tőlük kérni." — Csaba (a H5-ről)

A **H5** (entitások önhordozóvá tétele, export/import) eddig a *„valódi előfeltétel"*
minősítést viselte, mert a meglévő adat átmentését szolgálta. A D24 ezt megszünteti: a
16 fő **újra regisztrál**, és az eddigi tartalom nem költözik.

**Ez a befagyasztási döntés egyenes folytatása** (⏸️ üzemi döntés, 2026-08-25): ha az adat
úgyis eldobható, akkor nemcsak a *gyarapítása* értelmetlen, hanem a *költöztetése* is.
16 főnél egy újraindítás triviális — és most már **kimondottan az a terv**.

| Következmény | Mire |
|---|---|
| **A H5 elesik** | nincs export-formátum, nincs migráció, nincs kettős adatmodell-karbantartás |
| **A H6 értéke megmarad** | de a szerepe változik: nem az export alapja, hanem **az új adatmodell térképe** (mi kerül a készülékre) és a nyelvhatár rajza (D23) |
| **A Szakasz 0 lezárul** | a H6 volt az utolsó élő híd-feladat |
| **A régi kódbázis szerepe** | nem forrás, hanem **örökség**: domain-logika + felület (D22) |

> ⚠️ **Ki kell mondani a veszteséget is:** a mai koino tartalma (kategóriák, tartalmak,
> javaslatok, egyezmények, tudatpont-elrendezések) ezzel **elvész**. Ez vállalt ár —
> pontosan azért tartottuk kicsiben a közösséget, hogy ez az ár alacsony maradjon.

### D25. A BELÉPŐ TÉR — a koinók családfája (2026-08-26, Csaba)

> „Bárki létrehozhat közösséget. Az elsőt én fogom létrehozni, de tőlem teljesen független
> közösségeket is lehet indítani — ekkor azok nincsenek egymás belépő rétegében. Azonban a
> már meglévő közösség több koinót is létrehozhat, **ugyanabban a belépő térben**." — Csaba

**A D12 eddig azt mondta:** *a koinók sokasága felett nincs kormányzat — „a térkép nem
kormányzat"*. Ez igaz volt, de a térképnek **nem volt szerkezete**. A D25 megadja:

> **A belépő teret a LESZÁRMAZÁS hozza létre.** Nem globális regiszter, amibe valaki
> felvesz, hanem **családfa**: aki egy koinóból származik, az annak a terében van.

*(Csaba szóhasználatában „belépő réteg" és „belépő tér" ugyanaz; a dokumentum a **belépő
tér** alakot használja.)*

#### Hogyan szaporodnak a koinók

| Mód | Mi történik | Melyik döntés folytatása |
|---|---|---|
| **1. Más paraméterek** | ugyanaz a program, eltérő beállításokkal | **D13/b** paraméter-pluralizmus: *a beállításokat nem eltaláljuk, hanem szétosztjuk* |
| **2. Új szabályrendszer** | módosított program, saját szabályokkal | **D13**: a fork **normál üzemmód** |
| **3. Nézeteltérésből** | a közösség egy **program-szintű** módosításban nem ért egyet → kettéválik | **D9** (konszenzuális önfrissítés) elágazó ága |
| **— Új tér** | teljesen független indulás | **saját, új belépő teret nyit** — a két tér nem látja egymást |

> 🔁 **A 3. mód a KÜLÖNVÁLÁS, egy szinttel feljebb.** Amit 2026-08-25-én entitás-szinten
> megépítettünk (a szavazó külön ágat kér; elfogadásnál az ellenzők viszik a régi,
> elvetésnél a támogatók a módosított állapotot; testvér-nyilvántartás) — **ugyanaz a
> mozdulat a közösség szintjén.** A koino már tudja ezt, csak kisebb léptékben. Ez a
> D13/c-ben kimondott minta harmadik előfordulása: *ugyanaz a gépezet, megint egy szinttel
> feljebb.*

#### ⭐ A D25 MAGVA: mi közös a térben, és mi koinónként külön

| | Közös a térben | Koinónként külön |
|---|---|---|
| **Azonosság (kulcs)** | ✅ | |
| **Tanúsítások** (a bizalmi háló élei) | ✅ **átjönnek** | |
| **A hitelesítettség KÜSZÖBE** | | ✅ |
| **Belépési szabály** | | ✅ |
| **Szabályrendszer, paraméterek** | | ✅ |
| **Tartalom, javaslatok, egyezmények** | | ✅ |
| **Pénz** | | ✅ (de **átvihető** — lásd lentebb) |
| **Tudatpont** | | ⚠️ *feltehetően koinónként — megerősítendő* |

> **Az azonosság közös, a jogosultság helyi.** Ez a D25 egy mondatban — és ettől lesz
> értelme a „belépő" szónak: **a tér az, ahol az azonosságod érvényes.**

#### A hitelesítettség: közös tanúsítások, helyi küszöb

> „Elképzelhető, hogy egy koinóban te már elérted a teljesen hitelesített állapotot, de a
> másikban szigorúbbak a paraméterek… Pl. az egyik azt mondja, hogy **3 tanúsító elég**, és
> az neked már meg is van; de ha csak annyi van, és a másik koinóban **10 tanúsító kell**,
> akkor még **7-et össze kell szedned**." — Csaba

Vagyis a **tanúsítások halmaza közös**, a belőle levont **következtetés koino-szintű**. Ez
pontosan a **D18/3** folytonos igazolása (*a hitelesség fokozat, nem kapcsoló*) — csak most
kiderül, hogy **a fokozat-skála is koino-paraméter** (D13/c).

**Ez erős tulajdonság, nem bonyodalom:**
- egy szigorúbb koino **nem tudja felhígítani** a lazábbat, és fordítva sem;
- aki sok tanúsítást gyűjt, azt **mindenhová viszi** — a bizalmi háló építése egyszeri munka;
- a **köztes méret veszélyzónája** (D18/0) koinónként külön kezelhető: a fiatal koino
  szigorúbb küszöböt állíthat, amíg a hálója gyenge.

#### A belépés szabálya is koino-paraméter

> „Az is lehet, hogy egy közösség **nyílt azok számára, akik a tér valamelyik koinójában már
> benne vannak**, meg olyan is lehet, amelyik **egy plusz meghívást igényel**." — Csaba

Két ismert fokozat tehát: **tér-nyílt** (aki a térben bárhol tag, beléphet) és
**meghívásos** (a téren belüli tagság nem elég). *(A mai koino a szigorúbb változatot
futtatja: meghívó kötelező.)*

#### A pénz a térben (Csaba, 2026-08-26)

> „A pénzt **nem a térhez kötjük, hanem a koinókhoz** a térben. Egy új koino átviheti
> ugyanazt a pénzt, de **a pénzről az eredeti koinóban döntenek, és ott is termelődik**.
> Létrehozhatnak új pénzt is, és akár később a közös térben **kriptopiac** is kialakulhat."

| Kérdés | Válasz |
|---|---|
| Hol él a pénz? | **a koinóban**, nem a térben |
| Átvihető? | ✅ egy új koino **használhatja** ugyanazt a pénzt |
| Ki dönt róla? | **a kibocsátó koino** — a paraméterek, a szabályok ott vannak |
| Hol termelődik? | **a kibocsátó koinóban** (D10: alkotmányos kibocsátás + egyenlő osztalék) |
| Lehet saját pénz? | ✅ egy koino **új pénzt** is létrehozhat |
| Több pénz egymás mellett? | ✅ és később **csere is** — kriptopiac a térben |

**Ez a D10/D16 hatókörét pontosítja:** az „alkotmányos kibocsátás" és az „egyenlő osztalék"
**egy koino** belügye. A tér nem pénzügyi hatóság — ahogy kormányzati sem (D12).

> 💡 **Ismerős minta a való világból:** egy közösség használhatja más közösség pénzét
> anélkül, hogy beleszólna a kibocsátásába (mint amikor egy ország idegen valutát használ).
> A koino ezt **nem tiltja és nem is bátorítja** — egyszerűen lehetővé teszi, és a
> következményeket a közösségek viselik. Ez a D13/b szelleme.

#### Miért OLCSÓ ez — nem új alrendszer

A D25 **nem hoz új mechanizmust**. Amit használ, az mind megvan:

| Amit a belépő tér igényel | Ami már megvan |
|---|---|
| közös azonosság több koino felett | **a tartós mag** (D14) + a Merkle-fa (D21) — a mag **eleve téri, nem koino-szintű** |
| tanúsítások, amik átjönnek | **D18** bizalmi háló |
| koinónként eltérő küszöb | **D13/b** + **D13/c** (a paraméter is entitás) |
| kettéválás nézeteltérésnél | **KÜLÖNVÁLÁS** (megépítve) + **D9** |
| „nincs felette hatóság" | **D12** |

> **A belépő tér tehát a tartós mag MÁSODIK hasznosítása.** Ugyanaz az adat (ki valódi
> ember, ki tanúsította), amit a csalás ellen amúgy is őriznünk kell — most a koinók közti
> mozgást is ez teszi lehetővé, **külön ár nélkül**.

#### A belépő tér KLIENS OLDALA

A nézet terve — pakli-stílusú koino-kártyák, létszám szerinti lista, kártya-hamburger és
alsó sáv — a **[`felulet_terv.md`](felulet_terv.md)**-ben van (Csaba, 2026-08-27).

#### Nyitott kérdések a D25-höz

1. ✅ **A LÉTSZÁM BIZONYÍTÁSA — ELDÖNTVE (Csaba, 2026-08-26).** A kérdés az volt: a
   „létszám szerinti besorolás" **rangsor**, tehát érdemes benne hazudni (a hamis nagy
   koino embereket csábít). **A döntés: a tagság NEM kerül a magba.**

   > Elég, ha a koino meg tudja mutatni a tagjai **aláírt belépéseit**; az egyes emberek
   > valódisága pedig a **téri magból** igazolódik. Így a létszám ellenőrizhető — bárki
   > leszámolhatja az aláírásokat, és mindegyikről igazolható, hogy **külön valódi emberé**
   > —, a mag viszont marad az, ami: *„ez az ember már regisztrált a térben"*.

   **Miért ez a jó válasz:** (a) **nem növeli a magot** (D14: legyen minél kisebb); (b) a
   rangsor **magától becsületes** — hamis tagot csak valódi, tanúsított emberrel tehetsz a
   listádra, vagyis **ugyanaz a védelem őrzi, ami a szavazást** (D18); (c) a tagság így a
   koino saját, aláírt adata marad, ami illeszkedik a `lanc` réteghez (H6).
2. **Osztalék-aszimmetria:** ha egy koino más koino pénzét használja, a tagjai **nem
   kapnak osztalékot** (az a kibocsátó koino tagjainak jár). Ez valós gazdasági
   következmény — nem hiba, de **ki kell mondani**, mielőtt valaki meglepődik rajta.
3. **A tér elárasztása:** ha bárki indíthat koinót a térben, ezerszám gyárthatók üres
   koinók. Védelem valószínűleg **magától adódik** (a létszám szerinti rendezés az üreseket
   a lista aljára teszi — a D14 elve: *ami senkit nem érdekel, az láthatatlan*), de
   érdemes kimondani.
4. **Kihalt koino:** a D14 szerint *ami senkinek nem kell, eltűnik* — a térképről is
   lekerül. **Megerősítendő.**

### D26. Az entitás MÉRETE — a tárolási vállalás mértéke (2026-08-27, Csaba)

> „Eszembe jutott még egy adat, amit az entitásoknak tárolnia kell: a **méretük** — mivel
> P2P-ben a tudatpont-hozzárendelés tárolási vállalás is, ezért tudniuk kell, hogy mekkora
> az entitás." — Csaba

**A D3 egyenes következménye, amit eddig nem vezettünk le a végéig.** Ha a tudatpont
tárolási vállalás is, akkor **tudni kell, mit vállalsz, mielőtt vállalod.**

#### 1. A méretet a DÖNTÉS ELŐTT kell tudni

Ez a kulcs, és ez határozza meg, hova kerül az adat. Ha a méret csak az entitás
*tartalmában* lenne benne, akkor **le kellene tölteni ahhoz, hogy kiderüljön, megéri-e
letölteni**. Ezért:

> **A méret a HIVATKOZÁSBAN utazik, nem (csak) a tartalomban** — ugyanúgy, ahogy egy
> torrent-leíró tartalmazza a méretet és az ellenőrző összeget, mielőtt bármit letöltenél.

#### 2. Ki mondja meg — és mi van, ha hazudik?

A méret az **aláírt eseménybe** kerül, tehát a szerző állítja. Hazudhat — de ez ugyanaz a
minta, mint mindenhol: **nem megakadályozzuk, hanem leleplezzük** (D17/D19). Letöltéskor
kiderül, és mivel **aláírta**, a hamis méret **bizonyíték**, nem szóbeszéd.

#### 3. A fájlok külön objektumok

A szöveges tartalom mérete számítható; a képek és csatolt fájlok viszont nem folyhatnak
bele az esemény törzsébe. **A rájuk mutató hivatkozás hordozza a lenyomatukat ÉS a
méretüket** — így a fájl letöltése is ellenőrizhető és előre mérlegelhető.

#### 4. A vállalás hatóköre: CSAK AZ AZ ENTITÁS (Csaba döntése)

| | |
|---|---|
| **Amit vállalsz** | **az az egy entitás**, amire tudatpontot tettél |
| A leszármazottak | **külön pontot igényelnek** — a fa nem kötelez |
| Az ág teljes mérete | **tájékoztató adat** (mint ma a hierarchikus tudatpont), nem teher |

**Indok:** így a vállalt teher **kiszámítható marad**. A másik változat (az egész ág
vállalása) azzal járna, hogy bárki új gyereket tehet egy népszerű szülő alá — és ezzel
**mások gépét terheli** anélkül, hogy azok beleegyeztek volna.

#### 5. A méretnövekedés — a védelem NAGYRÉSZT MÁR MEGVAN (Csaba helyesbítése)

*Először azt írtam, hogy a méretnövekedés „a vállalók beleegyezése nélkül" terheli meg a
gépüket. **Ez pontatlan volt**, és Csaba kijavította:*

> „Egy entitás mérete **csak módosítási javaslat mentén tud nőni**, amiről **szavazás
> történik** az aktív tudatpont-tulajdonosok között, és a javaslatban benne van a
> módosított tartalom, aminek tartalmaznia kell **az új méretét is**." — Csaba

**Vagyis a rendes eset már védve van, méghozzá a koino saját gépezetével:**

| | |
|---|---|
| Hogyan nőhet egy entitás? | **csak elfogadott módosítási javaslattal** |
| Ki dönt róla? | a **tudatpont-tulajdonosok** — akiknek a gépét terhelné |
| Látják-e előre? | **igen**: a javaslat maga hordozza az új méretet, tehát **a szavazás előtt látszik** |
| Új gyerek-entitás? | **nem terheli** a szülő vállalóit — a D26/4 szerint a vállalás csak arra az egy entitásra szól |

**Ami valóban nyitva marad: a PASSZÍV tulajdonos.** Aki nem szavaz, annak a döntés
meglepetésként érkezik — a tudatpontja viszont ott van, tehát a teher rá is hárul.

> 💡 **Csaba ötlete (2026-08-27, felírva):** legyen egy **maximum méretnövekedési érték
> százalékban**, amit a passzív tudatpont-tulajdonosok is megadhatnak.

Ez **pontosan a D4 küszöb-gépezete, egy új paraméterrel** — ugyanaz a medián-mechanizmus,
amit a támogatottsági küszöbre használunk, csak most a méretre. Nincs új mechanizmus, és
illeszkedik a D13/b paraméter-pluralizmusához is.

> ⏸️ **Státusz: FELÍRVA, DE NEM MEGÉPÍTVE.** Csaba: *„ez már csak finomítás, meg még ezen
> nem is gondolkodtam eleget."* A tervezési alapelv szerint járunk el: *ami ritka és nem
> végzetes, azt felírjuk, de nem építjük meg* — a Szakasz 1-hez elég, hogy **a méret ott
> van az adatban és látható**.

**A maradék két védelem, ami így is kell:**

- **a méretváltozás legyen LÁTHATÓ** (a küszöbváltozás-értesítés, D4/H1 mintájára);
- **a tudatpont bármikor elvehető** → a vállalás **felmondható**.

#### 6. Mit jelent ez az adat-osztályozásra (H6)

| Adat | Réteg |
|---|---|
| az entitás **saját mérete** (az aláírt eseményben) | `tartalom` |
| a **fájl-hivatkozás** (lenyomat + méret) | `tartalom` |
| az **ág teljes mérete** (leszármazottakkal) | `szamitott` — összeadható, nem tárolandó igazságként |

### D27. SZERKESZTÉSI és ÁLTALÁNOS javaslat/egyezmény (2026-08-27, Csaba)

> „A javaslat, egyezmény-t át szerettem volna nevezni **szerkesztési javaslatra** és
> **szerkesztési egyezményre** már az 1.1-ben is… azért fontos, hogy **fenntartsuk a
> helyet** azoknak a javaslatoknak, egyezményeknek, amik nem szerkesztésről szólnak
> majd, hanem a közösség **általános** javaslatainak, egyezményeinek." — Csaba

#### A két fajta

| | **Szerkesztési** | **Általános** |
|---|---|---|
| Miről szól | egy entitás **megváltoztatása** (módosítás, áthelyezés, törlés, egyesítés) | a közösség **álláspontja** („fogadjuk el ezt az elvet", „szervezzünk találkozót") |
| Mi történik elfogadáskor | a rendszer **végrehajtja** | **semmi automatikus** — az egyezmény maga az álláspont |
| Az egyezmény élete | **egyszeri**: eldőlt, végrehajtódott, kész | **ÉLŐ**: csatlakozni, tiltakozni, ütközést jelölni lehet |
| Teljesítés | a koino végzi | **emberi** (D8: a hatály a tartalmi rétegben él) |

**A szavazás gépezete mindkettőnél UGYANAZ** — küszöbök, medián, részvételi arány,
bizonyossági mutató, döntési idő. Csak a *következménye* más.

#### 1. Az általános javaslat TARTALOMBÓL ágazik ki

Nem a semmiből indul: **egy tartalom alatt keletkezik**, és onnan örökli a kereteit —
a szavazók köre a tartalom tudatpont-tulajdonosai, a küszöbök az ő értékei.

> **Az induló küszöbök a szülő tartalomtól öröklődnek, utána viszont SAJÁT érték
> javaslatokkal formálhatók** (Csaba). Vagyis az egyezmény idővel önálló életet él,
> ahogy kialakul a saját tulajdonosi köre.

#### 2. ⭐ AZ ÁLTALÁNOS EGYEZMÉNY ÉLŐ — csatlakozás, tiltakozás, ütközés

Ez az, ami a mai koinóban nincs, és ami a **D8-at gyakorlattá teszi**:

| Művelet | Mit jelent |
|---|---|
| **Csatlakozás** | *„én is egyetértek ezzel"* — akár jóval a döntés után |
| **Tiltakozás** | *„én már nem"* — a támogatás visszavonása, ellenkezés |
| **Ütközés-jelölés** | *„ez a kettő ellentmond egymásnak"* |

> **A TÉNY örök** (ez az egyezmény akkor, ott, érvényesen megszületett), **a HATÁLY
> viszont él**: hányan állnak mögötte MOST.

**Két dolgot old meg, amit eddig nem tudtunk:**

- **A bootstrap-problémát.** Ha egy tízfős koino hoz egy megállapodást, és később ezren
  lesznek, az újak **csatlakozhatnak** — nem kell újraszavazni, és nem marad „tíz ember
  döntése" egy ezerfős közösségen.
- **Az elavulást.** Egy egyezmény, ami mögül elfogynak az emberek, **magától elsorvad** —
  nem kell „hatályon kívül helyezni". Ugyanaz a minta, mint a tudatpontnál (D14).

#### 3. A csatlakozó AKTÍV résztvevő — és ez old meg egy feszültséget

> „Aki csatlakozott egy egyezményhez támogatóan, és nem csak tudatpontot rakott rá
> passzívként, az már eleve **aktív résztvevője**, és számít a részvételi aránynál." — Csaba

**Ez old meg egy problémát, ami elsőre feloldhatatlannak látszott:** mi történik a
csatlakozókkal, ha az egyezményt később **módosítják**? Ötven ember csatlakozott egy
szöveghez, aztán a szöveg megváltozik — más szöveghez csatlakoztak?

> **Nem. Mert aki csatlakozott, az aktív résztvevő — tehát ŐK SZAVAZNAK arról a
> módosításról.** Nem kell se nullázni a csatlakozásokat, se változatokhoz kötni őket.

*(Ugyanaz a minta, amit Csaba a **D26/5**-ben a méretnövekedésre mondott ki: nem
történhet a hátuk mögött, mert javaslat és szavazás vezet oda.)*

#### 4. ⭐ A HELY HATÁROZZA MEG A HATÓKÖRT — és lefelé terjed

> „Attól függ, hol van az egyezmény: ha áthelyezik a gyökérbe, akkor **bárki**, amúgy meg
> **az adott ágazat** tudatpont-tulajdonosai." — Csaba

**A hatókör LEFELÉ terjed, nem felfelé** *(a felmenő ág értelmetlen lenne: akkor a gyökér
tulajdonosai minden egyezményben benne lennének, és a pozíció nem jelentene semmit —
Csaba jogosan javította ki ezt a felvetést)*:

> Egy egyezmény hatóköre azok köre, akik tudatpontot tettek **arra az entitásra, ami alatt
> az egyezmény áll — vagy annak bármely leszármazottjára.**

| Hol áll az egyezmény | Kik foglalhatnak állást |
|---|---|
| egy mély tartalom alatt | az a kis ág — néhány ember |
| egy nagy témakör alatt | az egész témakör tulajdonosai |
| **a gyökérben** | **a koino MINDEN tagja** (Csaba pontosítása: mindenki, nem csak aki tett már valahova pontot) |

**Amit ez ad:**

- a *„gyökérben bárki"* nem külön szabály, hanem **ugyanannak a szabálynak a széle**;
- a **pozíciónak valódi jelentése van**: minél feljebb viszik, annál többen szólhatnak
  hozzá;
- a feljebb vitel maga is javaslat → **a hatókör tágítása is közösségi döntés**.

**És ehhez már van gépezet:** a *hierarchikus tudatpont* (a saját + az összes
leszármazott pontja) pontosan ezt a lefelé terjedő kört méri. Eddig a **fontosság**
mutatója volt; itt **jogosultsággá** válik. Megint: nincs új mechanizmus, csak egy
meglévő, egy szinttel feljebb.

#### 5. Az általános egyezmény TELJES ÉRTÉKŰ ENTITÁS

> „Ezeket az egyezményeket lehet javaslattal **módosítani**, **áthelyezni**, **egyesíteni**
> másik általános egyezménnyel, meg **törlési javaslattal törölni**." — Csaba
> És: „az egyezménynek is lehetnek **gyerekei**, ahol az e-emberek megvitatják a témát."

Vagyis nem kell külön „egyezmény-kezelés": **egy entitás a többi között** — tudatpontot
lehet rá tenni, küszöbei vannak, gyerekei lehetnek, és mind a négy szerkesztési művelet
vonatkozik rá. *(A mai prototípus szűkebb: ott az egyezményre csak áthelyezési javaslatot
lehet indítani — ez tehát bővítés, nem átalakítás.)*

#### 6. NINCS automatikus következmény (D19)

> „Egyelőre csak látható lesz, hogy megfordult a közhangulat, és a következtetést az
> emberek vonják le." — Csaba (a tiltakozásról)
> „Az ütközés is csak láthatóvá teszi, hogy két egyezmény ellentmond egymásnak." — Csaba

Sem a tiltakozók többsége, sem az ütközés-jelölés **nem érvénytelenít** semmit magától. A
rendszer **bejelent, nem bíró** (D19) — a vita helye pedig az egyezmény alatti gyerek-
tartalmakban van.

#### Ami a megvalósításból még nyitott

- **Egy javaslat-gépezet `fajta` mezővel, vagy külön esemény-típusok?** *(A közös
  mechanika az előbbi mellett szól; eldöntendő a kódolás előtt.)*
- **Az egyesítés csatlakozói:** ha két általános egyezményt egyesítenek, a csatlakozóik
  összeadódnak-e.
- **A prototípus (1.1) NEM kap átnevezést** — befagyasztva marad (D22/D24). Az
  elnevezés az új koinóban él.

### D28. A BELÉPÉSI ADATOK — amit a koino elvár (2026-08-27, Csaba)

> „Szeretném, hogy a közösségbe úgy tudna valaki belépni, hogy már megadta azokat a
> **kötelező adatokat, amit az adott koino elvár**. Az első koinót én fogom létrehozni, és
> én szeretném, hogy megadják a **teljes nevüket és a lokációjukat is, település
> szintig**." — Csaba

#### 1. Az adatot nem „megadod egy szolgáltatónak", hanem ALÁÍROD MAGADRÓL

| Ma | A Fázis 2-ben |
|---|---|
| kitöltesz egy űrlapot, a szerver eltárolja — az adat **nála** van | **te állítod magadról, aláírva**: *„én, ez a kulcs, azt mondom magamról, hogy…"* |

#### 2. A valódiságát a TANÚSÍTÁS adja, nem az ellenőrzés

A rendszer nem tudja és nem is akarja ellenőrizni, hogy tényleg úgy hívnak-e. **Aki
behívott, az ismer** — és a D18 szerint ő tanúsítja, hogy valódi, külön ember vagy.

> **Ez már ma is így működik:** a mai meghívónál a kibocsátó megadja a meghívott **teljes
> nevét**, és a regisztrációs űrlap előre kitöltve nyílik meg. A séma kommentje ki is
> mondja: *„a kibocsátó tanúsítása a névre is kiterjed."* A Fázis 2 ezt folytatja.

#### 3. Koino-paraméter: mindegyik maga mondja meg, mit vár el

Csaba első koinója: **teljes név + lokáció település szintig**. Egy másik koino kérhet
mást, vagy semmit — ugyanaz a paraméter-szabadság, mint a küszöböknél (D13/b, D25).

#### 4. ⭐ KÉT ESEMÉNY, NEM EGY

```
Belepes  { koino }                    → a tagság TÉNYE: „csatlakozom"
Profil   { koino, nev, lokacio }      → az ADATAID: „ezt mondom magamról"
```

**Négy indok, amiért nem egyben:**

| # | Indok |
|---|---|
| 1 | **A költözés ne hamisítsa meg a belépés dátumát.** Egy eseménnyel új „belépést" kellene aláírni — mintha most csatlakoztál volna |
| 2 | **A tagság bizonyítéka ne tartalmazzon személyes adatot.** A létszám-rangsorhoz (D25) a tagságok bizonyítékai kellenek — ha a név bennük lenne, a létszám ellenőrzése egyben **a névsor kiadása** is volna |
| 3 | **Törölhető legyen a név, a tagság elvesztése nélkül.** Egy üres Profil-esemény leveszi az adatokat (az utolsó számít), miközben tag maradsz |
| 4 | **Koinónként külön profil** — az azonosság közös a térben, a megjelenés helyi (D25) |

**A felületen ez nem látszik:** egy űrlap, egy „Belépés" gomb — a háttérben két aláírás.
*(Pontosan úgy, ahogy ma is: tartalom létrehozásakor két esemény születik — a tartalom és
a tudatpont —, de a felhasználó egy gombot nyom.)*

#### 5. Az adat rétege (H6)

| Adat | Réteg |
|---|---|
| `Belepes` (a tagság ténye) | `lanc` — aláírt cselekvés; ebből számolható a létszám |
| `Profil` (név, lokáció) | `tartalom` · **`szemelyes`** |

> **A D6 tehát sértetlen:** a tartós magban csak az van, hogy *„ez a kulcs egy valódi,
> külön ember"* — a **nevedről ott egyetlen bit sincs**.


### D29. A FUTTATÓKÖRNYEZET — a koino ÖNÁLLÓ PROGRAM, nem böngésző (2026-08-28, Csaba)

> „Úgy érzem, hogy nagyon a böngészőkhöz akarunk igazodni. […] az elsődleges cél az, hogy
> az se kelljen hozzá." — majd: „Tulajdonképpen hagyjuk is el a böngészős részt, mert csak
> bezavar. **A tiszta P2P kapcsolatra koncentráljunk.**" — Csaba

#### Mi váltotta ki

A Szakasz 2 (a kapcsolat) tervezése közben derült ki, hogy **minden akadály, amibe
belefutottunk, böngésző-korlát volt**, nem koino-probléma: a tartós tárolás kérése nem
teljesült · a böngésző `.local` álnévre cseréli a saját címeit (amit másik hálózat nem tud
feloldani) · a kriptográfia csak „biztonságos környezetben" megy · `file://`-ból nem
tölthető modul · és a lap bezárásakor a csomópont eltűnik.

**A döntő szempont:** a böngészőben egy lap **nem tud fogadni kapcsolatot** — nem figyelhet
porton, és nem mutathat címet magáról. Ezért kell neki jelzőpont, STUN és továbbító.
*Vagyis az az infrastruktúra, amitől a P2P-ben szabadulni akarunk, jórészt a böngésző
korlátaiból következik, nem magából a P2P-ből.*

#### Amit a mérés mutatott (2026-08-28)

A koino **magja már ekkor is futott böngésző nélkül**, változtatás nélkül: kanonikus alak,
SHA-256 lenyomat, **Ed25519 aláírás és ellenőrzés**, szabály-réteg, állapotszámítás,
döntéshozatal — mind rendben Node alatt. A böngésző-függés **két fájlban** volt (a tár), és
a fejlesztői nézetben. Ez nem szerencse: a domain-logikát végig tiszta függvényként írtuk,
és az időt is bemenetnek vettük.

#### A döntés

| | |
|---|---|
| **A koino** | önálló program, ami a készüléken fut. Nincs telepítendő függősége (a kriptográfia a futtatókörnyezet WebCryptójából jön). |
| **A tár** | hozzáfűzhető fájl, soronként egy aláírt esemény — a git mintájára: nem módosítunk és nem törlünk. |
| **A böngésző** | később lehet **egy kliens**, de nem ő szabja meg, mire képes a koino. A Szakasz 1 böngészős nézete és próbaoldalai megszűntek (a git történetében megmaradnak). |
| **A nyelv** | változatlanul JavaScript — **a D23 nem sérül**: ott a NYELVRŐL volt szó, itt a FUTTATÓKÖRNYEZETRŐL. |

#### Mit jelent ez a Szakasz 2-re

A natív futtatókörnyezetben a koino **kinyithat egy portot és figyelhet**. Ezzel a
„szolgáltató nélkül" kérdés végre **mérhetővé** válik, három fokozatban:

1. **jelzőpont** — a bemutatkozás átvitele; lehet akár egy ember is (QR-kód, üzenet). Nem
   függés, csak postás;
2. **STUN** — „mi a nyilvános címem?"; NAT mögött a készülék ezt magától nem tudja. Pár
   csomag, tartalmat nem lát, bárki futtathat ilyet — **és kihagyható, ha van globális
   IPv6** (a fejlesztő gépén mérve: van, a routertől);
3. **továbbító (TURN)** — csak ha a közvetlen út nem jön össze. **Ez a drága függés**, és
   a gyakoriságát meg kell mérni, nem megbecsülni.


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

## A FÁZIS 2 LÉPÉS-SORRENDJE (2026-08-25 — **átírva 2026-08-26 a D22 után**)

> ⚠️ **EZT A SORRENDET A D22 ÁTÍRTA.** Az eredeti terv a központi szerver **fokozatos
> feloldódására** épült, és az identitás-réteget „még központi szerverrel" építette volna
> meg. A D22 (P2P az első kiadástól) ezt a feltevést megszüntette. A régi A–F szakaszok
> **tartalma érvényes marad** — a dokumentum sok helyen hivatkozik rájuk —, de a
> **végrehajtási sorrendjük** és a keretük megváltozott. A leképezés minden szakasznál ott
> áll.

**Ami NEM változott: a függőségi sorrend.** Nincs konszenzus identitás nélkül (D17), nincs
pénz bizonyított identitás nélkül (D11), nincsenek aláírt események kulcsok nélkül.

**Ami változott: az indulási pont.** Nem a szerverből indulunk kifelé, hanem **a
készülékből**. A koino a saját gépeden kezd létezni, és onnan terjed — nem fordítva.

### A régi és az új sorrend leképezése

| Új | Szakasz | Régi megfelelő |
|---|---|---|
| **1** | A HELYI KOINO — egy készülék, hálózat nélkül | A (kulcs-rész) + C |
| **2** | A KAPCSOLAT — két készülék egymásra talál | D |
| **3** | A BIZALMI HÁLÓ — tanúsítás, most már terjeszthető | A (a többi) |
| **4** | A LÉPTÉK — Merkle-bizonyíték, kötegelés, szeletelés | B |
| **5** | KONSZENZUS | E |
| **6** | PÉNZ | F |

### Szakasz 0 — ✅ LEZÁRVA (2026-08-26)

A híd-feladatok legnagyobb része **elesett** a D22 (nincs központi kiadás) és a **D24**
(nincs adat-költöztetés, új regisztráció lesz) nyomán. Ami elkészült és érvényes marad:

- **H6 — adat-osztályozás** ✅ *(2026-08-26)*: 224 mező besorolva öt rétegbe
  (`mag` / `lanc` / `tartalom` / `szamitott` / `helyi`) + `szemelyes` jelölés.
  Termék: [`adat_osztalyozas.md`](adat_osztalyozas.md) — **nyelv- és
  architektúra-független**, ezért a P2P-fordulat után is teljes értékű.

**Amit a H6 az új sorrendnek ad:** megmondja, **mi kerül a készülékre** (`mag` + `lanc` +
`tartalom`), mi számolható újra (`szamitott` — nem kell tárolni, nem kell terjeszteni), és
mi nem hagyhatja el a készüléket (`helyi`). Ez a Szakasz 1 adatmodelljének kiindulása.

### Szakasz 1 — A HELYI KOINO *(egy készülék, hálózat nélkül)*

**A legfontosabb felismerés az új sorrendben: a koino működőképes EGYETLEN készüléken is.**
Hálózat nélkül, szerver nélkül — és ez nem játék-üzemmód, hanem a valódi alap.

- **Kulcspár a készüléken** (D15): a privát fele soha nem hagyja el; a kulcs **hitelesít,
  nem titkol**.
- **Minden művelet aláírt esemény**: tartalom-létrehozás, tudatpont-rendezés, érték
  javaslat, szavazat (a H6 `lanc` rétege).
- **Helyi tár**: az adat a készüléken él (a böngésző tárában), nem egy szerveren.
- **Az állapot determinisztikus számítás** az eseményekből (D17) — a `szamitott` réteg
  megszűnik tárolt adat lenni, és **függvénnyé válik**.
- **Örökség a prototípusból**: a domain-logika (küszöbök, medián, bizonyossági mutató,
  javaslat-életciklus) és a felület (kártyák, pakli, szövegszerkesztő).

| | |
|---|---|
| Mit tud a végén? | egy ember, egy készülék: teljes koino — tartalom, javaslat, szavazás, egyezmény, **aláírva** |
| Miért ELSŐ? | mert minden más ezen áll, és mert **egyedül is kipróbálható** — nem kell hozzá se hálózat, se másik ember |
| Kockázat | 🟠 ez a legnagyobb építés (az esemény-modell + a felület ráültetése), de **ismert terep**, és minden darabja kipróbálható |

### Szakasz 2 — A KAPCSOLAT *(két készülék)*

- **Felfedezés és átvitel**: hogyan talál egymásra két készülék (jelzőpont), és hogyan
  cserélnek eseményt (WebRTC / libp2p).
- **Összefésülés**: két készülék eseményhalmaza egyesül — a sorrend nem számít, mert az
  állapot számítás (D17).
- **Saját lánc-következetesség** ellenőrzése: a kettős szavazat itt **lelepleződik**, nem
  tiltás által, hanem ellentmondásként.

| | |
|---|---|
| Mit tud a végén? | **egy család, egy baráti kör koinózik** — központi szereplő nélkül |
| Miért itt? | a D22 szerint ez az első kiadás feltétele; és **itt derül ki, mennyi infrastruktúra kell valójában** |
| Kockázat | 🟠 mérnökileg nehéz (NAT, tűzfalak, mobil-háttérfutás, N11) — **mérni kell, nem feltételezni** |

### Szakasz 3 — A BIZALMI HÁLÓ *(most már terjeszthető)*

- **Tanúsítás-entitás** (D18/1): „valódi, külön ember, még nem regisztrált".
- **Távolság-szabály** (D18/2): referensek, elérhetőség — a „csillag vagy háló" mérőszáma.
- **Folytonos igazolás** (D18/3) — kockázati korlát, soha nem hang.
- **Halál-bejelentés** (D18/7) + **D19** (a rendszer bejelentő, nem bíró) + **D20**
  (öröklés).

| | |
|---|---|
| Mit tud a végén? | a háló **maga tudja**, ki valódi — a D17 gerince áll |
| Miért itt és nem előbb? | mert a tanúsítás **terjesztést** igényel: aláírt nyilatkozat, aminek el kell jutnia máshoz. A Szakasz 2 nélkül nincs hová |
| Kockázat | 🟡 **csak emberekkel tesztelhető, nem kóddal** — és a D18/10 bootstrap-tanulsága szerint: *nem engem kell igazolni, hanem egymást* |

### Szakasz 4 — A LÉPTÉK *(amikor már nem fér el minden mindenkinél)*

- A tartós mag mint **Merkle-fa**, csúcs-szám és bizonyítékok (D21).
- **Mindenki tárolja a saját lapját** (D21, 2. réteg) + **önkéntes tárolók** (1. réteg).
- **Napi kötegelés** (D21) és a **szeletelés** (3. réteg) illesztése.

| | |
|---|---|
| Mit tud a végén? | **bizonyítható azonosság** anélkül, hogy bárki a teljes adatot tárolná |
| ⚠️ Mikor kell? | **családi léptéknél NEM** — lásd a következő szakaszt |
| Kockázat | 🟢 alacsony — bevált technika (könnyű kliensek) |

### Szakasz 5 — KONSZENZUS *(a köteg-gyökér elfogadása)*

- **Személy-alapú érvényesítők** az identitás-rétegből (D17).
- **Érvényesítő-kiválasztás** — befolyásolhatatlan véletlen.

| | |
|---|---|
| Kockázat | 🔴 **itt ül az utolsó valódi kutatási kérdés** (N8 maradéka) |

### Szakasz 6 — PÉNZ *(a D11 kapuja mögött)*

Csak azután, hogy az identitás-réteg **élesben bizonyított** (D11). Tartalma: **D10**
(alkotmányos kibocsátás, egyenlő osztalék), **D16** (lassú, megtámadható), **D18/8**
(osztalék csak hitelesítettnek), **D20** (öröklés), **N10** paraméterei.

### ⚠️ NINCS „CSALÁDI" ÉS „GLOBÁLIS" KOINO — egy program, ami nő (Csaba helyreigazítása, 2026-08-26)

> „Nem teszünk különbséget családi meg globális koino között. **Bármelyik koino közösség
> nőhessen akkorára, hogy több milliárd e-embert is tudjon kezelni.**" — Csaba

**Ez a helyreigazítás másodszor hangzott el** (először 2026-08-25, a „menü" keret
törlésekor), és most is jogos volt: a szakaszokat könnyű úgy olvasni, mintha egy „kicsi"
és egy „nagy" változat volna. **Nincs két változat.**

| Rossz olvasat | Helyes olvasat |
|---|---|
| „a családi koinóhoz elég az 1–2. szakasz" | **minden koino a teljes programot futtatja** |
| „a 4–6. szakasz a nagy verzió" | a 4–6. szakasz mechanizmusa **minden koinóban ott van** |
| „később kicseréljük a nagyra" | **nincs csere** — ugyanaz a kód, más terhelés alatt |

**Ami a mérettel változik, az nem a program, hanem a TERHELÉS:**

| Szakasz | Tíz embernél | Milliárdnál |
|---|---|---|
| 4. Lépték (Merkle) | a fa **ott van**, csak mindenki tárol mindent, és a bizonyíték triviális | szeletelés, önkéntes tárolók, kötegelés — a fa **ugyanaz** |
| 5. Konszenzus | tíz aláírás egy köteg-gyökérre — **triviálisan teljesül** | érvényesítő-kiválasztás, befolyásolhatatlan véletlen |
| 6. Pénz | ugyanaz a kibocsátás, kis számokkal | ugyanaz, nagy számokkal (D11 kapuja mögött) |

> **A szakaszok a FEJLESZTÉS sorrendjét adják, nem a termék változatait.** Amikor a 4.
> szakasz elkészül, **minden koino megkapja** — a tízfős is. Ott csak épp nem látszik,
> mert nincs mit megoldania.

⚠️ **A D21 figyelmeztetése ezért kétszeresen áll:** a szeletelés **illesztésének már az
1–2. szakaszban engednie kell**, különben pontosan az a „majd kicseréljük" adósság
keletkezik, amit a milliárdos cél kizár. **Milliárdra tervezünk — és az első kiadás is
milliárdra képes program, csak kevesebb emberrel.**

### ⚠️ A SZAKASZOK NEM MÉRETRŐL SZÓLNAK — FÜGGŐSÉGI SORREND (Csaba pontosítása, 2026-08-25)

**Az A–F NEM azt jelenti, hogy „előbb kicsi koino, aztán nagy".** Ez korábban félreérthetően
volt megfogalmazva („menü"), és Csaba jogosan javította ki:

> „Én most már egyből a több milliárdos közösséget befogadni képes P2P-t szeretném
> kifejleszteni, ami már a pénz létrehozását is magába foglalja. Az, hogy kisebb közösségek
> is létrehozhatók, nem egy lépcsőfok, amit elég elérni elsőnek, hanem magától értetődő:
> **ha világméretűen is működőképes, akkor egy család szintjén is.**"

**A sorrend a FÜGGŐSÉGEKBŐL jön, nem a méretből** — és ugyanez a sorrend érvényes akkor is,
ha az első naptól nyolcmilliárdra tervezünk: nincs konszenzus (E) identitás nélkül (A, D17);
nincs pénz (F) bizonyított identitás nélkül (D11); nincsenek aláírt események (C) kulcsok
nélkül (A).

**A lefelé skálázás olcsó, a felfelé nem — tehát a CÉL a milliárdos lépték.**

> #### ⚠️ Látszólagos ellentmondás a D22-vel — és a feloldása (2026-08-26)
>
> A fenti szakasz azt mondja: *„a kisebb közösség nem lépcsőfok"*. Az új sorrend viszont
> épp azzal kezd, hogy **egy család koinózni tudjon**. Ez nem ellentmondás, mert **két
> különböző dologról szól**:
>
> | | Amiről a 2026-08-25-i pontosítás szól | Amiről a D22 szól |
> |---|---|---|
> | | a **TERVEZÉS** léptéke | a **KIADÁS** sorrendje |
> | Állítás | ne tervezzünk kicsire, amit aztán ki kell cserélni | az első működő kiadás természetesen kicsi lesz |
>
> A családi koino **nem egy egyszerűsített változat**, amit később lecserélünk — hanem
> **ugyanaz a program, kevesebb emberrel**. A 4–6. szakasz nem „a nagy verzió", hanem
> ugyanannak a programnak a **később aktiválódó rétegei** (a D11/D13b minta).

#### Amit a milliárdos cél KONKRÉTAN megváltoztat

| # | Változás | Mihez képest |
|---|---|---|
| 1 | **A szeletelés (DHT) az első naptól a tervben van** — még ha az első megvalósítás az egyszerű önkéntes változat is, az **illesztésnek eleve engednie kell** | a D21 korábban azt írta, „akkor jön, amikor a méret kikényszeríti" |
| 2 | **A konszenzust a NEHÉZ esetre tervezzük** — nincs „kis csoportnál elég egyszerűbb megoldás" rövidítés, amit később cserélni kell → az **érvényesítő-kiválasztás** fontossági sorban előrébb kerül (a megvalósításban hátul marad) | — |
| 3 | **Az identitás-rétegnek rögtön a PÉNZ mércéjét kell ütnie**, nem a szavazásét: egy hamis azonosság a szavazásnál egy hang, a pénznél **pénznyomtató gép** (D11). Az A szakasz nem lehet „egyelőre elég jó" | — |
| 4 | **A hibrid hálózat alapszerkezet, nem kiegészítés** — a telefon rossz P2P-polgár, kellenek önkéntes tartós csomópontok a gerincnek (N11) | — |

#### A pénz hatóköre — pontosítva

Csaba: *„nem ezt írom felül, de a programnak készen kell állnia arra, hogy kiszolgálja a
már teljesen hitelesített e-embereket."*

> **A pénz KÉPESSÉGE megépül; a D11 KAPUJA marad.** A pénz a fejlesztés hatókörében van, nem
> az indulás sorrendjében: megtervezzük és megépítjük, de **élesíteni akkor élesítjük, amikor
> a háló kibírja.**

#### A feszültség, és a feloldása

A tervezési alapelv (*egyszerű és változtatható > összetett és teljes*) szembefeszül azzal,
hogy az első naptól a végső célra tervezünk — ez az a hely, ahol sok projekt elvérzik
(megépítik a tökéletes architektúrát, és soha nem adják ki). A feloldás:

> **Milliárdra TERVEZZÜNK, függőségi sorrendben ÉPÍTSÜNK, és minden réteget adjunk ki, amint
> áll.**

A cél globális; az építés sorrendjét a függőségek adják; a kiadás nem várja meg a végét.

### Hol lesz a koino „P2P"?

**Az első kiadástól — ez a D22.** *(A korábbi válasz „a D szakasztól" szólt, egy központi
szerveres köztes állapotot feltételezve; az elesett.)*

Pontosabban két lépcsőben, de mindkettő P2P:

- **Szakasz 1 után:** a koino a **saját készülékeden** él, aláírt eseményekkel — szerver
  nélkül, de még magányosan.
- **Szakasz 2 után:** két készülék egymásra talál → **valódi közösségi P2P**, központi
  szereplő nélkül.

> Amit a régi terv az A–B szakasztól várt (*„a szerver nem tud hazudni az azonosságról"*),
> az itt **erősebb formában** teljesül: nincs szerver, aki hazudhatna. Cserébe egy nehezebb
> feladatot kaptunk — **az elérhetőséget** (hogy az adat eljusson a másikhoz) —, ami viszont
> a D21 szerint **bizalmi problémából mérnöki problémává** vált.

### ⏸️ ÜZEMI DÖNTÉS: az éles koino szándékosan befagyasztva (Csaba, 2026-08-25)

> „Amíg a jelenlegi közösség ennyire inaktív, addig én sem akarok aktív lenni, mert a
> P2P-ben lehet, hogy újra regisztrálás kell. Ezt a 16 főt még könnyedén meg tudom erre
> kérni. Ugyanezen okokból az entitások számát sem szeretném gyarapítani magamtól. Persze
> ha kérdeznek, válaszolok."

**Indok:** ha az architektúra-váltás újraregisztrálást (és adat-migrációt) igényel, akkor
minden most felhalmozott adat potenciálisan eldobandó. **16 főnél egy újraindítás triviális
— 1600-nál nem.** A szándékos kicsiben tartás tehát nem tétlenség, hanem **a váltási költség
alacsonyan tartása**.

**Következmény a tervezésre:** a *„minden réteget adjunk ki, amint áll"* elv **technikai
kiadásra** vonatkozik, nem a közösség növelésére. Az élesítés és a népesítés külön kérdés,
és az utóbbi **vár**.

**Egy dolog viszont EMBEREKET fog igényelni:** az **A szakasz** (bizalmi háló) az egyetlen
réteg, amit **nem lehet kóddal tesztelni** — csak azzal, hogy valódi emberek tanúsítják
egymást. Ez viszont pontosan olyan **kicsi, konkrét kérés**, amilyet Csaba a 16 főtől
meg tud tenni (és a re-regisztrációnál amúgy is meg fog). **Nem tartalom-gyarapítás,
hanem néhány koppintás** — a D18/10 bootstrap-tanulsága szerint: *nem engem kell igazolni,
hanem egymást.*

---

## Híd-feladatok — ✅ A SZAKASZ LEZÁRVA (2026-08-26)

> ⛔ **EZ A LISTA TÖRTÉNETI. NE VÁLASSZ BELŐLE FELADATOT.**
>
> A híd-feladatok arra szolgáltak, hogy a **központi szerveres** Fázis 1 előkészítse a
> Fázis 2-t. A **D22** (P2P az első kiadástól) és a **D24** (nincs adat-költöztetés,
> új regisztráció) után a legtöbbjüknek **nincs kire és mire hatnia**.
>
> **A folytatás a lépés-sorrend Szakasz 1-e** („A HELYI KOINO"), nem ez a lista.

### Állapot-összegzés

| # | Feladat | Állapot | Miért |
|---|---|---|---|
| **H6** | Adat-osztályozás | ✅ **KÉSZ** (2026-08-26) | 224 mező, 5 réteg → [`adat_osztalyozas.md`](adat_osztalyozas.md). **Nyelv- és architektúra-független**, a Szakasz 1 adatmodelljének kiindulása |
| **H5** | Entitások önhordozóvá tétele | ❌ **ELESETT** | **D24**: nincs adat-migráció, a 16 fő újra regisztrál |
| **H1** | Küszöbváltozás-értesítés | ❌ **ELESETT** | a központi szerver funkciója lett volna; a D4 követelménye a Szakasz 1-ben teljesül majd, új alapon |
| **H8/2** | Verzió-végpont | ❌ **ELESETT** | a futó **központi** példány önvallomása volt — nincs mit vallania |
| **H8/1** | Tükör-másolat (Codeberg) | ❌ elvetve *(2026-08-25)* | lásd a részleteket lentebb: a repó nyilvános + AGPL, és a Codeberg ToU kizárja a koinót |
| **H4** | Identitás-réteg leválasztása | 🔄 **BEOLVAD** | nem a régi kódból választjuk le, hanem eleve P2P-ként épül → **Szakasz 1 + 3** |
| **H2** | Szavazat-titkosság 1. lépés | ⏸️ **HALASZTVA** | a befagyasztott éles rendszert védte volna; az elv a Szakasz 1-ben épül be (a szavazat aláírt esemény, nem szerver-rekord) |
| **H3** | E-mail privát | ⏸️ **HALASZTVA** | *(átvizsgálva 2026-08-26: a `populate()` hívások mindenütt projekcióval mennek, e-mail csak a saját adatok válaszában van)* |
| **H7** | Kormányzási ígéret dokumentum | 🟡 **NYITVA** | az egyetlen, ami **független** a D22-től — a Fázis 1 kormányzásáról szól, és a `kormanyzas.md` részben már fedi |

*Az eredeti leírások alább maradnak, változatlanul — a döntések története is tudás.*

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
- **H8. Kód-terjesztés függetlenítése a GitHubtól** (2026-08-25) — **egy** lépés maradt:
  1. ❌ **TÜKÖR-MÁSOLAT: ELVETVE (Csaba, 2026-08-25) — „nem kell tükör".** Indok: a repó
     2026-08-25 óta **nyilvános, AGPL-3.0 alatt**, tehát **minden klón teljes biztonsági
     mentés a történettel** — a kód nem tud elveszni akkor sem, ha a GitHub önkényesen
     törli (a helyi példány teljes: 189 commit, az első commitig).
     > ⚠️ **A Codeberg NEM jelölt — a felhasználási feltételeik kizárják a koinót.**
     > (Ellenőrizve 2026-08-25, a ToU szövegéből, MIUTÁN Csaba fiókot nyitott ott.) Két
     > kikötés is talál: *„You must not share projects that mostly consist of code written
     > by 'generative AI'-tools (including services such as Claude…)"* — a koino kódja
     > jelentős részben így készült, és a `Co-Authored-By: Claude` sorok ezt láthatóvá is
     > teszik; valamint *„Content that harms the reputation of Codeberg, such as
     > cryptocurrency related projects"* — a D10/D11 pénzterv nyilvánosan olvasható a
     > repóban. **Mindkettő tiltás, nem feltétel.** Ha valaha mégis kell tükör, **előbb a
     > célszolgáltató feltételeit kell elolvasni** — ez a hiba egyszer már megtörtént.
     > *(Tanulság általánosabban: az „LLM-mel írt kód" korlátozása kezd megjelenni a
     > kódmegosztóknál — a koino fejlesztési módja emiatt hosszabb távon is szempont.)*
  2. **Verzió-végpont** — ✅ **EZ MARADT AZ EGYETLEN H8-FELADAT.** A futó példány mondja meg,
     melyik commitból épült. Ma semmiből nem
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
- **2026-08-25 (5)** — **A 3. elméleti híd: az IDENTITÁS-RÉTEG → D18, az N4 LEZÁRVA.**
  A D17 után ez lett a gerinc („ha itt fal van, minden más mindegy"). Webes utánanézés a
  **Duniter/Ğ1** bizalmi hálójának tényleges szabályairól (duniter.org), és a
  **távolság-szabály** felismerése: nem a tanúsítások SZÁMA véd, hanem a hálóban elfoglalt
  POZÍCIÓ — „a darabszám hamisítható, a pozíció nem". Ez egyben a „csillag vagy háló?"
  kérdés mérőszáma is, ami nélkül a D11/D13b minta üres mondat maradt volna.
  Csaba hozzájárulásai: **folytonos igazolás** (a hitelesség fokozat, nem kapcsoló — és épp
  a közepes rést tömi be), a Duniter öt paraméterének átvizsgálása (kettő marad, három
  elvetve), a **fokozatos pénz-hozzáférés**, és a **halál** kérdésének felvetése.
  Claude hozzájárulásai: a **védőkorlát** (igazolás = kockázati korlát, SOHA nem hang), a
  **függetlenség ≠ darabszám** követelmény, az **öregedés** és a **tevékenység = életjel**
  a renitens Duniter-szabályok helyett, a **Sybil-lyuk** megtalálása (az osztalék a
  nyereség, nem az utalás), és a **D17 pontosítása** (a közepes rés = két védelmi
  mechanizmus, ami nem ér össze).
  **Számok a valóságból:** Ğ1 = 8 449 tag 6,5 év alatt (59-ről) — a tiszta bizalmi háló
  működik, de lassú; a „nagyban a gráf megvéd" állítás csak ~8 000 fős léptékben
  bizonyított.
  **Következő:** N1 maradéka (a tartós mag replikációja) + a Fázis 2 sorrendjének terve.
- **2026-08-25 (6)** — **A D18 finomítása Csaba két beavatkozása nyomán, és két új döntés.**
  - **Csaba lyukat talált egy percekkel korábban leírt szabályban:** a *„aki alá tud írni,
    az él"* HIBÁS — az aláírás a KULCS használatát bizonyítja, nem az EMBER életét
    (haldokló nagyszülő átadja a kulcsát → az örökösnek plusz profilja lesz; önkéntes,
    tehát semmilyen lopás-felismerés nem fogja meg).
  - **Csaba elvetette Claude javítását is** (a tanúsítás elhalványulását): *„akiről egyszer
    bebizonyosodott, hogy valódi ember, az tartson ki, ameddig meg nem hal"* — és az érve
    jobb volt: az elhalványulás **az összes felhasználót terhelte volna egy ritka támadás
    miatt**, és filozófiailag is téves (a személy-mivolt tény, nem előfizetés).
  - **Helyette: kivétel-alapú védelem.** Ellentmondásnál (halál-bejelentés + kulcshasználat)
    a **pénz befagy**, és a rendszer **tartalmat hoz létre** a vitának → **D19**.
  - **D20 (öröklés)** — Csaba ötlete, és ez a fő védelem a kulcs-öröklés ellen: ösztönző-
    szerkezeti, nem technikai. A pénz örökölhető (rendelkezés szerint, vagy egyenlően a
    közvetlen leszármazottak közt), a **tudatpont és az azonosság soha**. A család
    cinkosból **egymás őrzőjévé** alakul.
  - **N1: a mag mérete a valódi korlát** (Csaba kérdésére) — nem a tárhely ára, hanem hogy
    egy átlagos telefon teljes értékű résztvevő maradhasson, különben kapuőrök keletkeznek
    (D12 bukása). Becslés: ~1 KB/fő → 10 milliós koinónál ~10 GB, **ami már sok**. A
    megoldás alakja: **ujjlenyomat + ellenőrizhető bizonyíték** (a tároló nem tud hazudni).
  - **Új tervezési alapelv rögzítve:** *egyszerű és változtatható > összetett és teljes* —
    ami ritka és nem végzetes, azt felírjuk, de nem építjük meg.
  - **Új szakasz a dokumentum elején: „HOL TARTUNK"** — a Fázis 2 tervezés állapota
    egy helyen.
- **2026-08-25 (7)** — **N1 LEZÁRVA → D21, és megszületett a FÁZIS 2 LÉPÉS-SORRENDJE.**
  - **D21 (mag-replikáció):** ujjlenyomat + ellenőrizhető bizonyíték — *aki tárol, nem tud
    hazudni*, ezért a tárolás **bizalmi helyett elérhetőségi** probléma. **Csaba támadás-
    felvetése** („mi van, ha valaki egyszerre törli az összes önkéntes tárolót?") hiányosnak
    mutatta az első tervet → **három réteg**, és a középső a valódi védelem: **mindenki
    tárolja a saját lapját** (~1 KB), amiből a mag újjáépíthető. **Napi kötegelés** (Csaba
    alapértéke): évi ~365 konszenzus-esemény, bármekkora koinónál. **Bootstrap:** a kiinduló
    ujjlenyomatot attól kapod, aki meghívott — *ugyanaz a társas bizalom alapozza meg a
    technikait is*.
  - **D13/c:** a koino-szintű paraméterek (kötegzárás, tanúszám…) **maguk is entitások** a fa
    tetején — nincs új mechanizmus, a D4 mediánja egy szinttel feljebb.
  - **Fogalmi tisztázás Csaba kérdésére:** a döntési ablakok **nem** a lánc építése miatt
    hosszúak — fordítva: társadalmi okból amúgy is lassúak, **ezért nem kell a technikának
    gyorsnak lennie**. Plusz a DAG-terminológia: a **hálózati csomópont** egy készülék, a
    **DAG-csomópont** egy esemény — a gráf pontjai események, nem eszközök.
  - **A LÉPÉS-SORRSZAKASZOK (A–F) vezérelve: NEM ÚJRAÍRÁS, HANEM FELOLDÓDÁS** — minden
    szakasz egy okkal kevesebbet ad arra, hogy a szervernek higgyünk. **A legfontosabb
    felismerés: az identitás-réteg (A szakasz) megépíthető P2P NÉLKÜL**, a mostani
    kódbázisban, és a mai 16 fővel kipróbálható. Az egyetlen valódi kutatási kérdés
    (érvényesítő-kiválasztás) a legkésőbbi szakaszban (E) ül, tehát **semmi nem áll az első
    három szakasz útjában**. *(A „menü" keret — kis koinónak elég a C/D — másnap törölve,
    lásd lentebb.)*
- **2026-08-25 (8)** — **Csaba két pontosítása a lépés-sorrendhez.**
  - **A cél az első naptól a MILLIÁRDOS lépték, a pénzzel együtt.** A „menü" keret
    **törölve** — félreérthető volt: *„az, hogy kisebb közösségek is létrehozhatók, nem egy
    lépcsőfok, amit elég elérni elsőnek, hanem magától értetődő: ha világméretűen is
    működőképes, akkor egy család szintjén is."* A szakaszok **függőségi**, nem
    méret-sorrendet adnak — és ez akkor is így van, ha az első naptól nyolcmilliárdra
    tervezünk. Négy konkrét következmény rögzítve: szeletelés az első naptól · a konszenzust
    a NEHÉZ esetre · az identitás rögtön a PÉNZ mércéjét üsse (nem a szavazásét) · a hibrid
    hálózat alapszerkezet.
  - **A pénz: a KÉPESSÉG megépül, a D11 KAPUJA marad** — *„a programnak készen kell állnia
    arra, hogy kiszolgálja a már teljesen hitelesített e-embereket."*
  - **⏸️ ÜZEMI DÖNTÉS: az éles koino szándékosan befagyasztva.** Amíg a közösség inaktív,
    Csaba sem gyarapítja az entitásokat — mert a P2P-váltás újraregisztrálást igényelhet, és
    **16 főnél egy újraindítás triviális, 1600-nál nem**. A *„minden réteget adjunk ki, amint
    áll"* elv tehát **technikai kiadásra** vonatkozik, nem a közösség növelésére.
  - **Feszültség kimondva:** a tervezési alapelv (egyszerű és változtatható) szembefeszül a
    végső célra tervezéssel — ez az a hely, ahol sok projekt elvérzik. Feloldás:
    **milliárdra tervezzünk, függőségi sorrendben építsünk, és minden réteget adjunk ki,
    amint áll.**
- **2026-08-26** — **A SZAKASZ 0 LEZÁRULT, ÉS A VÉGREHAJTÁS TERVE ÁTFORDULT.**
  - **H6 elkészült** (az egyetlen befejezett híd-feladat): a mai adatmodell **224 mezője**
    besorolva öt rétegbe — `mag` (8) / `lanc` (36) / `tartalom` (73) / `szamitott` (56) /
    `helyi` (51) —, mellette `szemelyes` jelölés a D6-hoz (8 mező). Termék:
    [`adat_osztalyozas.md`](adat_osztalyozas.md); a kódban séma-opcióként (`reteg`), és
    egy ellenőrző eszközzel (`backend/tools/retegEllenorzes.js`), hogy a besorolás **ne
    tudjon némán elavulni**. **A legfontosabb felismerés: a mai adatmodellben a tartós mag
    majdnem üres** — amit ma az `eembers` unique indexe intéz, az nem bizonyíték, hanem a
    szerver szava.
  - **D22 — P2P AZ ELSŐ KIADÁSTÓL.** Csaba: *„a központi server részét most nem kell
    fejleszteni. A kis családi közösségeknek is P2P-nek kell lenniük."* Ezzel **elesett a
    „ne újraírás legyen, hanem feloldódás" vezérelv** (nem lehet feloldani egy szervert,
    amire nem építünk), és helyébe lépett: **a régi koino a prototípus, ami tanított; az új
    a KÉSZÜLÉKEN kezdődik** — örökölve belőle a domain-logikát és a felületet. Fogalmi
    tisztázás rögzítve: **a P2P nem jelent nulla infrastruktúrát** (jelzőpont, továbbító
    kell) — a különbség nem az, hogy van-e gép a hálózaton, hanem hogy **az igazság forrása
    a szerver-e vagy az aláírás**.
  - **D23 — a nyelv JavaScript marad.** Csaba kérdésére (a JS/HTML/CSS a *központi
    weboldal* miatt lett választva — a D22 után újranyitható) az átvizsgálás: a
    determinizmus (`BigInt`), a kriptográfia és a teljesítmény **nem nyelvi korlát**; a
    mobil háttérfutás **platformi**, nem nyelvi; a böngésző-P2P viszont **a JS előnye**.
    **A H6 mellékterméke a nyelvhatár térképe:** nem a programot kell nyelvre választani,
    legfeljebb a `mag`-ot — az néhány száz sor, nem 200 fájl.
  - **D24 — a meglévő adat sem költözik**, új regisztráció lesz (*„ez sem fontos"*). Ezzel
    a **H5 elesett**, és vele a Szakasz 0 utolsó élő feladata. A veszteség kimondva: a mai
    tartalom elvész — vállalt ár, épp ezért tartottuk kicsiben a közösséget.
  - **A LÉPÉS-SORREND ÁTÍRVA** hat szakaszra, a régi A–F leképezésével: **1. A helyi koino**
    (egy készülék, hálózat nélkül — A kulcs-rész + C) · **2. A kapcsolat** (D) ·
    **3. A bizalmi háló** (A többi) · **4. A lépték** (B) · **5. Konszenzus** (E) ·
    **6. Pénz** (F). **A függőségi sorrend NEM változott** — az indulási pont igen: nem a
    szerverből kifelé, hanem **a készülékből**.
  - ⚠️ **CSABA HELYREIGAZÍTÁSA (másodszor!):** *„nem teszünk különbséget családi meg
    globális koino között — bármelyik koino közösség nőhessen akkorára, hogy több milliárd
    e-embert is tudjon kezelni."* Először azt írtam, hogy „a családi lépték a 4–6. szakaszt
    nem igényli" — ez **visszacsempészte a 2026-08-25-én már törölt „menü"-gondolkodást**.
    A helyes megfogalmazás: **minden koino a teljes programot futtatja**; ami a mérettel
    változik, az nem a program, hanem a **terhelés** (tíz embernél a Merkle-fa ott van,
    csak triviális; a konszenzus ott van, csak magától teljesül). A szakaszok a
    **fejlesztés** sorrendjét adják, nem a termék változatait — és amikor a 4. szakasz
    elkészül, **a tízfős koino is megkapja**.
- **2026-08-26 (2)** — **D25: A BELÉPŐ TÉR** — Csaba kifejtette a koinók sokaságának
  szerkezetét, amiről a D12 eddig csak annyit mondott, hogy „a térkép nem kormányzat".
  - **A teret a LESZÁRMAZÁS hozza létre** (családfa, nem globális regiszter): a független
    indulás **új teret nyit**, egy meglévő közösség viszont a **saját terébe** hozhat létre
    új koinókat — három módon: más paraméterekkel (D13/b) · új szabályrendszerrel (D13) ·
    **program-szintű nézeteltérésből** (D9).
  - 🔁 **A harmadik mód a KÜLÖNVÁLÁS egy szinttel feljebb** — amit entitás-szinten már
    megépítettünk (S29), az itt a **közösség** szintjén ismétlődik. A D13/c mintájának
    harmadik előfordulása: *ugyanaz a gépezet, megint egy szinttel feljebb.*
  - ⭐ **A DÖNTÉS MAGVA: az azonosság közös, a jogosultság helyi.** A kulcs és a
    **tanúsítások átjönnek** a tér koinói között; a **hitelesítettség küszöbe** viszont
    koinónként eltér (Csaba példája: ahol 3 tanúsító elég, ott kész vagy; ahol 10 kell, ott
    még 7-et kell szerezned). A **belépési szabály** is koino-paraméter: lehet **tér-nyílt**
    (aki a térben bárhol tag) vagy **plusz meghívást igénylő**.
  - 💰 **A pénz: nem a térhez, hanem a KOINÓKHOZ kötött.** Egy új koino **átviheti** ugyanazt
    a pénzt, de **a döntés és a kibocsátás az eredeti koinóban marad**; saját, új pénz is
    létrehozható; később a térben **kriptopiac** alakulhat ki. Ez a **D10/D16 hatókörét
    pontosítja**: az alkotmányos kibocsátás és az egyenlő osztalék **egy koino belügye** —
    a tér nem pénzügyi hatóság, ahogy kormányzati sem (D12).
  - 💡 **Miért olcsó:** a D25 **nem hoz új mechanizmust** — a tartós mag (D14/D21) **eleve
    téri, nem koino-szintű**, ezért a belépő tér ennek a **második hasznosítása**, külön ár
    nélkül.
  - **Négy nyitott kérdés felírva:** (1) a koino-tagság a tartós mag része-e — ettől függ,
    hogy a **létszám szerinti besorolás hamisítható-e**; (2) osztalék-aszimmetria az átvett
    pénznél; (3) a tér elárasztása üres koinókkal; (4) a kihalt koino sorsa.
- **2026-08-27** — **D26: az entitás MÉRETE** (Csaba felvetése a Szakasz 1 kodolasa kozben).
  A D3 egyenes következménye, amit eddig nem vezettünk le a végéig: *ha a tudatpont
  tárolási vállalás is, akkor tudni kell, mit vállalsz, MIELŐTT vállalod.*
  - **A méret a HIVATKOZÁSBAN utazik**, nem csak a tartalomban — különben le kellene
    tölteni ahhoz, hogy kiderüljön, megéri-e letölteni (a torrent-leíró mintája).
  - **A szerző állítja, aláírva** → a hamis méret **bizonyíték**, nem szóbeszéd
    (ugyanaz a minta, mint mindenhol: nem megakadályozzuk, hanem leleplezzük).
  - **A csatolt fájlok külön objektumok**: a hivatkozás hordozza a lenyomatukat ÉS a
    méretüket.
  - **A vállalás hatóköre (Csaba döntése): CSAK az az entitás, amire pontot tettél.** A
    leszármazottak külön pontot igényelnek; az ág teljes mérete tájékoztató adat. Indok:
    így a teher **kiszámítható** — az „egész ág" változatban bárki új gyereket tehetne egy
    népszerű szülő alá, és azzal **mások gépét terhelné**.
  - ⚠️ **Csaba helyesbítése egy pontatlanságomra:** azt írtam, a méretnövekedés „a vállalók
    beleegyezése nélkül" terhel. Nem: **egy entitás mérete csak elfogadott MÓDOSÍTÁSI
    JAVASLAT mentén nőhet**, amiről a tudatpont-tulajdonosok szavaznak, és a javaslat maga
    hordozza az új méretet — tehát **a szavazás előtt látszik**. A rendes eset védve van a
    koino saját gépezetével.
  - 💡 **Ami nyitva marad: a PASSZÍV tulajdonos**, akinek a döntés meglepetés. Csaba ötlete
    (**felírva, nem megépítve**): **maximum méretnövekedési érték százalékban**, amit a
    passzívak is megadhatnak — ez **pontosan a D4 küszöb-gépezete egy új paraméterrel**,
    nincs benne új mechanizmus. *„Ez már csak finomítás, meg még ezen nem is gondolkodtam
    eleget."*
- **2026-08-27 (2)** — **D27: SZERKESZTÉSI és ÁLTALÁNOS javaslat/egyezmény.** Csaba régi,
  elfelejtett átnevezési szándéka („szerkesztési javaslat", „szerkesztési egyezmény") —
  azért fontos, hogy **helyet tartson** a közösség általános megállapodásainak.
  - **A szavazás gépezete mindkét fajtánál ugyanaz**; csak a KÖVETKEZMÉNYE más: a
    szerkesztési javaslat elfogadása **végrehajtódik**, az általánosé **nem csinál semmit
    automatikusan** — ott az egyezmény maga az álláspont, a teljesítése emberi (D8).
  - **Az általános javaslat TARTALOMBÓL ágazik ki**, és onnan örökli az induló küszöböket;
    utána **saját érték javaslatokkal** formálható.
  - ⭐ **AZ ÁLTALÁNOS EGYEZMÉNY ÉLŐ:** lehet hozzá **csatlakozni**, ellene **tiltakozni**,
    és **ütközést jelölni** két egyezmény között. Ez teszi a **D8-at gyakorlattá**: a TÉNY
    örök, a HATÁLY él. Két dolgot old meg: a **bootstrapet** (a később érkezők
    csatlakozhatnak, nem marad „tíz ember döntése" egy ezerfős közösségen) és az
    **elavulást** (ami mögül elfogynak az emberek, magától elsorvad — D14).
  - **A csatlakozó AKTÍV résztvevő** (Csaba) — és ez old meg egy feszültséget, amit
    feloldhatatlannak hittem: ha az egyezményt később módosítják, a csatlakozók nem
    „más szöveghez csatlakoztak", mert **ŐK SZAVAZNAK a módosításról**. Ugyanaz a minta,
    mint a D26/5-ben a méretnövekedésnél.
  - ⭐ **A HELY HATÁROZZA MEG A HATÓKÖRT, és LEFELÉ terjed:** az egyezmény hatóköre azok
    köre, akik az adott entitásra **vagy annak bármely leszármazottjára** tettek
    tudatpontot. Így a „gyökérben bárki" nem külön szabály, hanem ugyanannak a **széle** —
    és a pozíciónak valódi jelentése van. A feljebb vitel maga is javaslat, tehát **a
    hatókör tágítása is közösségi döntés**. *(Az első felvetésem a FELMENŐ ágra szólt —
    Csaba jogosan javította ki: az értelmetlen lenne, mert akkor minden egyezmény a
    gyökérig érne.)* **Gépezet már van rá:** a hierarchikus tudatpont pontosan ezt a
    lefelé terjedő kört méri — eddig a fontosság mutatója volt, itt jogosultsággá válik.
  - **Az általános egyezmény TELJES ÉRTÉKŰ ENTITÁS:** módosítható, áthelyezhető,
    egyesíthető, törölhető, és **gyerekei lehetnek** (ott folyik a vita).
  - **Nincs automatikus következmény:** sem a tiltakozók többsége, sem az ütközés-jelölés
    nem érvénytelenít magától — a rendszer **bejelent, nem bíró** (D19).
  - **A prototípus (1.1) NEM kap átnevezést** — befagyasztva marad.
- **2026-08-27 (3)** — **D28: a BELÉPÉSI ADATOK.** Csaba elvárása: a koino kötelező
  adatokat kérhet a belépéskor; az ő első koinója **teljes nevet és lokációt (település
  szintig)** vár el.
  - **Az adatot nem „megadod egy szolgáltatónak", hanem ALÁÍROD MAGADRÓL.** A valódiságát
    nem ellenőrzés adja, hanem a **tanúsítás**: aki behívott, az ismer (D18). *Ez már ma is
    így működik — a meghívó tartalmazza a meghívott teljes nevét, és a séma kommentje ki is
    mondja, hogy „a kibocsátó tanúsítása a névre is kiterjed".*
  - **Koino-paraméter**: mindegyik maga mondja meg, mit vár el (D13/b, D25).
  - ⭐ **KÉT ESEMÉNY, nem egy:** `Belepes { koino }` (a tagság ténye) és
    `Profil { koino, nev, lokacio }` (az adatok). Négy indok: a költözés ne hamisítsa meg a
    belépés dátumát · **a tagság bizonyítéka ne tartalmazzon személyes adatot** (különben a
    létszám ellenőrzése egyben a névsor kiadása volna) · a név törölhető legyen a tagság
    elvesztése nélkül · koinónként külön profil. **A felületen ez nem látszik**: egy űrlap,
    egy gomb, a háttérben két aláírás.
  - **A D6 sértetlen:** a `Belepes` a `lanc` rétegbe tartozik, a `Profil` a `tartalom`-ba
    `szemelyes` jelöléssel — a tartós magban a névről **egyetlen bit sincs**.
- **2026-08-27 (4)** — **A FELÜLET ALAPELVE + a Szakasz 1 elkészülte.** Csaba a Szakasz 1
  fejlesztői nézetét látva: *„Nem szeretnék ideiglenes, rögtönzött frontendet, még a
  teszteléshez sem… de akkor még nem is akarom tesztelni a kliens oldalt."* → a felület a
  prototípusból **öröklődik** (D22), és amíg a modell nem stabil, **nincs kliens-oldali
  tesztelés**; a próbaoldalak elegendők. Új: [`felulet_terv.md`](felulet_terv.md), benne a
  **belépő tér nézete** (pakli-stílus, koino-kártyák, **létszám szerinti lista**,
  kártya-hamburger az adott koino opcióival + alsó sáv a tér opcióival).
  **A Szakasz 1 (A HELYI KOINO) ELKÉSZÜLT:** 7/7 lépés, 82 önpróba zölden, és a teljes kör
  végigjátszva — a döntési idő egyetlen támogató szavazattól **168 óráról 24-re rövidült**
  (a D4 bizonyossági mutatója élőben), majd az **egyezmény megszületett**.
