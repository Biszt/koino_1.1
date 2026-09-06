# koino — Forráskód-kormányzás és a koinók sokasága

*Létrehozva: 2026-08-25, Csaba és Claude beszélgetéséből. Ez a dokumentum egy helyre
hozza azt, ami eddig négyfelé volt szétszórva ([vizio_kritikak.md](vizio_kritikak.md)
9. pont, [fejlesztesi_terv_fazis2.md](fejlesztesi_terv_fazis2.md) D9 / N5 / N9 / H7), és
lezárja az **N5** nyitott kérdést: hogyan hat a közösség közvetlenül a forráskódra.*

> **Státusz-figyelmeztetés.** Ez elvi terv, nem megvalósítás. A leírt mechanizmusból ma
> semmi nem fut. Amit a Fázis 1 ebből már tud, azt a záró szakasz sorolja fel.

## Tartalomjegyzék

- [A kérdés](#a-kérdés)
- [Az öt lépcső](#az-öt-lépcső)
- [A három szint](#a-három-szint)
- [1–2. szint: önalkalmazás, nem torony](#12-szint-önalkalmazás-nem-torony)
- [3. szint: térkép, nem kormányzat](#3-szint-térkép-nem-kormányzat)
- [Miért ez a garancia](#miért-ez-a-garancia)
- [A fordulat: a koino eszköz, nem közösség](#a-fordulat-a-koino-eszköz-nem-közösség)
- [Koino-születés: két mód, egy egység](#koino-születés-két-mód-egy-egység)
- [A skálázás nem opcionális](#a-skálázás-nem-opcionális)
- [Mi az a minimum, amitől valami koino?](#mi-az-a-minimum-amitől-valami-koino)
- [Kockázatok, amiket ki kell mondani](#kockázatok-amiket-ki-kell-mondani)
- [Amit a Fázis 1 ebből már tud](#amit-a-fázis-1-ebből-már-tud)

---

## A kérdés

A koino azt állítja, hogy a szabályait — hosszú távon **magát a forráskódját is** — a
közössége alakítja. Ez a mondat elhangzott a kormánynak írt bemutatóban
([bemutato_kormany.md](bemutato_kormany.md)), és a vízió-vita 9. pontja ezt járta körül.

A nehézség nem az, hogy „szavazzunk a kódról". Az könnyű. A nehézség az, hogy **egy
elosztott rendszerben senki nem kényszerítheti a többieket az elfogadott kód
futtatására** — és hogy ha valaki mégis kényszeríthetné, akkor nem is lenne elosztott.

## Az öt lépcső

A vita 9. pontjának szerkezete: a „közösség hat a forráskódra" öt külön probléma.

| # | Lépcső | Megoldás | Hol |
|---|---|---|---|
| 1 | **Javaslat** — a kód-módosítás javaslatként él a fában | a meglévő gépezet | ez a dokumentum |
| 2 | **Értékelés** — ki ítéli meg hozzáértően? | **elismerés**: tájékoztat, nem jogosít | N9 |
| 3 | **Döntés** — szavazás | a meglévő gépezet | — |
| 4 | **Bevezetés/kikényszerítés** | **konszenzuális önfrissítés** + fork-jog | D9 |
| 5 | **Sürgősségi út** | kinevezett őrök, időkorlátos mandátum | N9 |
| +1 | **Bootstrap** — egy szerzőtől a közösségig | *lásd lentebb: megszűnik a helye* | H7 |

A 2. lépcső megoldása a legkényesebb egyensúly: az **elismerés** láthatóvá teszi a
hozzáértést anélkül, hogy jogot adna neki. A szavazat egyenlő marad. Enélkül két rossz
irány közül kellene választani: vak szavazás a kódról, vagy szakértői kapuőrség.

> **A 4. lépcső ellenőrzési fele már létező technológia.** A D9 szerint a kliens
> hash-ellenőrzéssel áll át az elfogadott kódra — de a **git-commit maga egy hash**.
> Vagyis az egyezmény megnevezhet egy commit-azonosítót, a kliens pedig bárhonnan
> klónozhat és ellenőrizhet. Nem kell hozzá letöltő-szerver, sem GitHub.
> ⚠️ **GitHub ≠ git:** a GitHub a Microsoft tulajdona — arra kormányzást építeni a D12-t
> érvénytelenítené. Részletes elemzés (átfedések, korlátok, SHA-1 csapda):
> [`fejlesztesi_terv_fazis2.md`](fejlesztesi_terv_fazis2.md) → „A git mint minta".

## A három szint

Ahhoz, hogy a 4. lépcső megoldódjon, szét kell választani három dolgot, amit könnyű
összekeverni:

| Szint | Mit kormányoz | Ki kormányozza | Van-e döntés? |
|---|---|---|---|
| **1. Gondolat** | egy gondolatot | a koino közössége | ✅ tudatpont + küszöb + szavazás |
| **2. Koino-verzió** | magát a programot | **ugyanaz a közösség, ugyanazzal a gépezettel** | ✅ ugyanaz |
| **3. A koinók sokasága** | — | **senki** | ❌ **nincs mit eldönteni** |

A dokumentum további része ezt a táblázatot vezeti le.

## 1–2. szint: önalkalmazás, nem torony

**A koino-verzió entitás a fában él, a gyökér-entitások felett — de azon a koinón
belül, amit leír.**

Ebből következik, hogy a teljes meglévő gépezet magától vonatkozik rá: van tudatpontja,
vannak tulajdonosai, vannak küszöbei, lehet rá módosítási javaslatot tenni, és — ami a
legfontosabb — **különválhat**.

Vagyis a forráskód-kormányzás **nem új mechanizmus, amit meg kell építeni.** Ugyanaz a
mechanizmus, magasabb magasságban.

> Ez azt is jelenti, hogy a **különválás** (a Fázis 1-ben 2026-08-25-én megépített
> funkció) és a **fork** nem hasonlítanak egymásra: **ugyanaz a művelet**, két különböző
> szinten. Gondolat-szinten szétválik egy gondolat; verzió-szinten szétválik egy világ.

### Miért nem indul ettől végtelen regresszus

Kézenfekvő ellenvetés: ha a verziót is kormányozni kell, akkor kell egy rendszer, ami
*azt* kormányozza — annak is kell verzió, annak is kormányzás, és így tovább a
végtelenségig. A torony tetején pedig mindig ül valaki.

Az ellenvetés téved, mert a 2. szint **nem a rendszer felett** van, hanem **benne**. Akik
tudatpontot raknak a verzió-entitásra és szavaznak róla, **ugyanazt a gépezetet
használják, amit maga a verzió megvalósít**. A program a saját módosítását a saját
eszközeivel dönti el.

Ez nem meta-szint, hanem **önalkalmazás** — a rendszer önmagára mutat. Ahogy egy
alkotmány tartalmazza a saját módosításának szabályát: nem kell fölé „meta-alkotmány",
mert a módosítási eljárás magának az alkotmánynak a része.

**Az 1. és a 2. szint tehát valójában egy szint. A hurok bezárul.**

## 3. szint: térkép, nem kormányzat

A regresszus ott kezdődne, ahol a koinók *együttes megjelenítése* van — a lista vagy
térkép arról, milyen koinók léteznek. Ha **ott** lenne tudatpont, szavazás és küszöb,
akkor azt is verziózni kellene, annak is kellene fölöttes döntéshozó, és a torony
tényleg elindulna.

A megoldás egyetlen megkülönböztetésen múlik:

> **A regresszus addig folytatódik, amíg minden szinten van MIT ELDÖNTENI. A koinók
> listájánál nincs mit eldönteni — ezért ott megáll.**

Mert mi is az a lista? Koinók, amik léteznek és jelzik magukat. Ehhez nem kell döntés:
egy koino vagy létezik, vagy nem — ez **tény, nem határozat**. Bárki összeírhatja
azokat, amikről tud. Két embernek lehet két különböző listája, és egyik sem hibás.

A harmadik szint tehát nem rendszer, hanem **térkép**. És **a térkép nem kormányzat**:
bárki rajzolhat egyet, több létezhet egyszerre, egyikhez sem kell felhatalmazás.

### A három próba — hol csúszhatna vissza a döntés?

Az „nincs mit eldönteni" állítást ellenőrizni kell. Három helyen próbálkozhatna
visszaszivárogni a kollektív döntés:

**1. „Ki kerül fel a listára?"** → Aki jelzi magát. Nincs felvételi eljárás. A
rosszindulatú vagy érdektelen koinókat **minden néző maga szűri** a saját kliensében —
ez egyéni döntés, nem közös. A regresszushoz *kollektív* döntés kellene.

**2. „Milyen formátumban jelzi magát?"** → Ez tényleg közös, de **nem szavazással dől el,
hanem azzal, hogy mi működik.** Aki olyan formában jelzi magát, amit senki nem ért,
láthatatlan marad. Ez nem törvény, hanem következmény.

**3. „Mi van, ha a formátum változik?"** → Ugyanígy: a kompatibilis változat terjed, a
többi elhal. Pontosan így működnek az internet protokolljai — az RFC **ajánlás**, nem
jogszabály; nincs világkormány, ami kikényszerítené, mégis működik a web.

Mindhárom próba ugyanoda fut ki: **a legfelső szinten a szabályozó erő nem a döntés,
hanem a kompatibilitás.** Az pedig nem kormányzati aktus, hanem tény.

## Miért ez a garancia

Ha a legfelső szinten lenne kormányzat, akkor a koinónak **lenne teteje**. Aminek pedig
teteje van, azt el lehet foglalni — egyetlen ponton, és onnantól minden koino fölött ül
valaki.

> A legfelső szint kormányzat-nélkülisége **nem megoldatlan kérdés, hanem a válasz.**

## A fordulat: a koino eszköz, nem közösség

*(Csaba, 2026-08-25 — továbbgondolás a vita 9. pontjához képest)*

A vízió-vitában a **fork vésznyílás** volt: kilépési jog, védelem az elfoglalás ellen,
aminek „az ereje a létezése, nem a gyakorlása". Ritka és drága esemény.

**Ez megváltozott.** A szétválás normál működés, és nem csak a szétválás: **bárki
indíthat teljesen új koinót** — egy család, egy osztály, egy munkahely, egy párt, bárki.

> „A koinót nem kizárólag egy közösségnek építem, hanem egy eszközt szeretnék adni,
> amivel bárkik csinálhatnak közösséget." — Csaba

Ez nem bővítés, hanem **átdefiniálás**:

| | Eddig | Mostantól |
|---|---|---|
| Mi a koino? | egy közösség | egy **eszköz**, amivel közösség csinálható |
| Mi a siker? | hányan vannak rajta | **hány koino létezik** |
| Mi a fork? | vésznyílás | **menü** — választható közösségek |

### Következmény: megszűnik a bootstrap-probléma helye

A vita 4. kérdése az volt: mikor és milyen lépcsőkben adja át Csaba a kód feletti
döntést a közösségnek? A válasz eddig **ígéret** volt („ezt nem tudom garantálni, csak
ígérni") — ezért került be a H7 kormányzási ígéret dokumentum.

De ha bárki indíthat koinót, akkor **nincs „a koino"**, amit át kellene adni. A koino.hu
**egy** koino lesz: az első, talán a legnagyobb, de nem kiváltságos.

> A többlet-jog nem azért szűnik meg, mert valaki lemond róla, hanem mert **megszűnik az
> a hely, ahol többlet-jog egyáltalán létezhetne.**

A H7 ettől nem lesz fölösleges — az **átmenetre** továbbra is kell (amíg a koino.hu az
egyetlen valódi koino, addig a gyakorlatban mégis van súlypont) —, de a *végállapotot*
már nem az ígéret garantálja, hanem a szerkezet.

### Következmény: az identitás koinónként külön van

Ha valaki a családi és a munkahelyi koinójában is e-ember, **nem szükségszerűen ugyanaz
az e-ember**. Nincs összekötve, nincs mit kiszivárogtatni. Ez azt jelenti, hogy az „egy
ember = egy e-ember" szabály **koinón belüli**, nem világszintű — ami a D1 identitás-terv
hatókörét pontosítja.

## Koino-születés: két mód, egy egység

*(Csaba válasza arra a kérdésre, mennyi legyen közös a koinók között — 2026-08-25)*

**Az értelmezési egység az ADATBÁZIS.** Egy koino = egy adatbázis. Két módon
keletkezhet:

| | **Szétválás (fork)** | **Új alapítás** |
|---|---|---|
| Kiváltó ok | verzió-javaslat, amit egy rész elfogad, egy rész nem | valaki egyszerűen elindít egyet |
| Az adatbázis | **lemásolódik** — a regisztráltakon is osztoznak | **üres, teljesen külön** |
| A múlt | **közös** | nincs |
| A jövő | külön | külön |

A szétválás akkor is így megy, ha valaki **csak tesztelésre** rak fel egy verziót —
nincs külön „próba" üzemmód, a mechanizmus ugyanaz.

> **Eltérés a gondolat-szintű különválástól, és ez szándékos.** Gondolat-szinten a
> szétosztás **arányos**: mindenki azt viszi, amihez tudatpontot rendelt. Verzió-szinten
> **teljes**: minden lemásolódik. Az ok szerkezeti — a verzió nem csomópont a fában,
> hanem **talaj**. Egy programból nem lehet „felet" elvinni, és a rajta álló világot sem
> lehet félbevágni. Az e-ember tehát kezdetben **mindkét ágon létezik** (ez egybevág a
> vita 9. pontjának fork-leírásával).

A koinók közti kapcsolat **választható**: lehetnek teljesen szigetek, és lehetnek
összekapcsolódva. Ez nem központi döntés — minden koino magáról dönti el.

## A skálázás nem opcionális

*(Csaba helyesbítése, 2026-08-25 — fontos, mert az ellenkezője kézenfekvő tévedés)*

Csábító következtetés, hogy ha a koino eszköz, és a legtöbb koino kicsi (család,
osztály, munkahely), akkor a Fázis 2 legnehezebb kutatási problémái — a titkos-
ellenőrizhető szavazás nagy léptékben (N3), a tanúsítási szabályok (N4), a személy-alapú
globális konszenzus (N8), a Sybil-védelem — **legördülnek a projektről**.

**Nem gördülnek le.** Az igény az, hogy **bármelyik koino közösség megnőhessen milliárdos
nagyságrendre**. A kicsiben-működés nem a cél lecserélése, hanem az, hogy a koino
**hasznos lehet, mielőtt a nehéz problémák megoldódnának** — a nehéz problémák a
**növekedés útja** maradnak, nem a hasznosság előfeltételei.

Ami tényleg változik, az a **sorrend**, nem a lista:

- **Előfeltétel volt** → most: a nagyra növés ára.
- Kicsiben tanulható, mérhető, javítható — élesben, valódi közösségekkel, azelőtt, hogy
  a kutatási kérdések megoldódnának.

### Evolúciós, nem kikényszerített elsőség

> „Reményeim szerint a legelső fog megnőni ekkorára, de ezt nem kikényszeríteni akarom,
> hanem igazságos versenyben, ahol az eszközt biztosítom mindenki számára." — Csaba

A legfőbb koino tehát **evolúciósan** jön létre, nem kinevezéssel. És mivel minden
közösség saját pénzt is kibocsáthat (D10), a versenynek **anyagi tétje** is lesz: akár
egy új „kripto-család" is létrejöhet, amelynek tagjait a saját közösségeik kormányozzák.

*(Az is lehet, hogy verseny nem lesz — ha mindenkinek megfelel az első közösség.)*

## Mi az a minimum, amitől valami koino?

Ez a dokumentum legkevésbé lezárt kérdése, és érdemes pontosan látni, miért kényelmetlen.

**A dilemma.** Ha bárki módosíthatja és kirakhatja a kódot, akkor valaki kirakhat olyan
változatot is, ami **megtartja a nevet és a látszatot, de elárulja a lényeget**:

- a tudatpont **szavazaterővé** válik benne (a „mindenki egyenlő" elv kiiktatva),
- javaslatot csak kinevezettek tehetnek,
- vagy minden marad, csak közben megfigyeli és eladja az adatokat.

Az AGPL miatt a forrás **látható** lesz. De a láthatóság nem akadály: attól, hogy látom,
még megtörténik.

**A kényelmetlen rész.** A kézenfekvő válasz az lenne, hogy „ameddig a többi koino érti,
addig koino" — vagyis a kompatibilitás dönt. Csakhogy a kompatibilitás **technikai**
mérce, a koino lényege viszont **etikai**. Egy koino, amiben a tudatpont szavazaterő,
lehet tökéletesen kompatibilis. **A kompatibilitás tehát NEM védi a lényeget.**

### A kérdés rossz volt — nem megakadályozni kell

*(Csaba, 2026-08-25 — ez oldja fel a dilemmát)*

A fenti bekezdések végig azt keresték, **hogyan akadályozzuk meg** az elárult verziót. Ez
a kérdésfeltevés hibás, és a koino saját filozófiájával megy szembe.

> „Szerintem nem kell azt megakadályozni, hogy valaki »gyeplős« vagy vagyon alapú verziót
> hozzon létre. Ezért is tartom fontosnak a teljes decentralizáltságot, a teljesen
> demokratikus működést — mert **csak így van esélye globális méretűre nőni**." — Csaba

A koino nem *tiltja* az elárult változatot, hanem **veszteségessé teszi**. És a
mechanizmus már megvan: **az olcsó kilépés.**

| | Zárt platform | koino |
|---|---|---|
| Ha a működtető elveszi a hatalmat | nincs hova menni — a gondolatod, a kapcsolataid ott maradnak | **elmész, és viszed a súlyodat** (különválás / fork) |
| Mit ér az elfoglalás | mindent | **semmit — az emberek elmennek, marad az üres kód** |

Ezért gyengék a „gyeplős" verziók: aki átveszi az irányítást egy koino felett, **pontosan
azt semmisíti meg, amiért érdemes volt elfoglalni.** Nem tiltás állítja meg, hanem az,
hogy nincs benne nyereség.

**Ez ugyanaz a tétel, amire az egész platform épül.** A **D4 felelősség-elve** szerint
amit a tulajdonosok nem védenek be, azt a rendszer nem védi helyettük — a koino a
gondolatoknál sem cenzúrával véd, hanem éberséggel és kilépéssel. Egy szinttel feljebb:

> **Amit a közösség a koino lényegéből nem véd meg, azt semmilyen mechanizmus nem védi
> meg helyette.**

**Amit ki kell mondani:** a „koino" **szó elvehető**. Valaki futtathat valamit, ami
koinónak nevezi magát, és elárulja. Ez pontosan az az alku, amit minden emberi intézmény
megköt: a „demokrácia" szót is használják diktatúrák. **A szó nem védhető; a gyakorlat
látható** — az AGPL ezt garantálja.

### ✅ DÖNTÉS: nem lesz védjegy (Csaba, 2026-08-25)

> „Én viszont már eldöntöttem, hogy nem védem le. Vállalom a kockázatot, hogy rosszul
> használják majd fel mások." — Csaba

A **védjegy** lett volna az egyetlen aszimmetria, amit legitim módon meg lehetett volna
tartani — de hatóságot igényelne, aki eldönti, mi nevezheti magát koinónak, és ezzel
**visszahozná a tetőt**, amit a D12 megszüntetett. Az eszközt tehát nem vesszük fel.

**A fennmaradó aggály és a válasza:** *mi van, ha MÁS védeti le a „koino" szót?*

- **A védjegy nem a szoftvert korlátozza, hanem a NÉVHASZNÁLATOT** (jellemzően kereskedelmi
  körben). Attól, hogy valaki levédeti a nevet, a koino **futtatását, másolását,
  módosítását és terjesztését nem tudja megtiltani** — azt az AGPL rendezi, és a szerzői
  jog erősebb ezen a terepen. Egy P2P-ben futó koinót *senki nem tud engedélyhez kötni.*
- **A legjobb védekezés ingyenes, és épp most készül: a nyilvános, dátumozott előzmény.**
  A korábbi használat és a bizonyítható közzététel a legtöbb jogrendben védelmet ad, és
  a rosszhiszemű bejegyzés megtámadható. A **nyilvános repó** (dátumozott commitok), az
  élő koino.hu és az AGPL-licenc együtt ez a bizonyíték-készlet.
- *(Ez nem jogi tanácsadás; ha valaha élessé válik, ügyvéd kérdése. A cselekvés viszont
  egyértelmű: a nyilvános, dátumozott előzmény minden esetben javít a helyzeten.)*

## Kockázatok, amiket ki kell mondani

**1. A pénz mint fork-motiváció — ✅ SZABÁLLYAL KEZELVE (Csaba, 2026-08-25).** A vita
9. pontja arra épült, hogy a fork ritka és drága, mert *„a koino értéke az emberek, nem
a kód"* — ezért a közösség zöme egy ágon marad. **De ha a szétválással pénz is másolódik,
a forknak anyagi motivációja lesz**, ami az ötletek szintjén nem létezett: a kripto-világ
fork-jainak jelentős része haszonszerzési céllal történt (a birtokos ugyanazt az eszközt
kapta meg kétszer, és az egyiket eladhatta).

> **SZABÁLY: a pénz szétváláskor NEM duplázódik.** Ha a különvált ág saját pénzt akar,
> **külön nevet is kap** — és az az új pénz **0 értékről indul**, amíg nem fektetnek bele.
> Ugyanaz az egység nem létezhet két ágon (az kettős költés lenne).

**Miért nem puszta deklaráció ez** (mert az értéket nem lehet kimondani): a koino-pénz
értékét nem a szűkösség adja, hanem **az a közösség, amelyik elfogadja**. A szétválás az
adatbázist másolja, de **az élő közösséget nem** — így a különvált ág pénzének értéke
nem *rendeletre* nulla közeli, hanem **lényegénél fogva**: annyian fogadják el, ahányan
átjöttek. Aki haszonszerzésből forkolna, **nem tud nyerni anélkül, hogy embereket ne
hozna magával** — és ha hozza őket, az már nem visszaélés, hanem valódi közösségi
szétválás.

**Ami mindebből megmarad kockázatnak:**
- **A szétválás mindkét ág pénzét gyengíti** (kisebb közösség, kisebb elfogadottság) —
  ez viszont *egészséges* fék a komolytalan fork ellen, ugyanaz a logika, mint
  gondolat-szinten a tudatpont elvitele: **a szétválásnak ára van.**
- **A különvált ág kész identitás-hálót örököl** (a D11 szerint a pénz csak bizonyított
  identitás-réteg után indulhat — a fork ezt másolja). Hogy ez Sybil-kockázat-e, a
  D11-gyel együtt vizsgálandó.
- Az „új kripto-család" lehetősége (Csaba, 2026-08-25): ha sok koino sok pénzt bocsát ki,
  **egymáshoz képest** is árazódnak — ennek dinamikája teljesen feltáratlan (→ N10).

**2. A gyakorlatban egy ideig mégis lesz súlypont.** Amíg a koino.hu az egyetlen érdemi
koino, a „nincs kiváltságos koino" szerkezeti igazság **társadalmilag még nem igaz**.
Erre való a H7 átmenetileg.

**3. A bizonyítás hiányzik.** A vita 9. pontjának záró mondata változatlanul érvényes: a
forráskód-kormányzásra a koinonak **ellentmondásmentes elméleti terve** van, amely a
terület ismert kudarcaiból tanul — a bizonyítást a működő közösség adja majd. Ezt a
kombinációt még senki nem futtatta élesben.

## Amit a Fázis 1 ebből már tud

Hogy a fenti tervből ne látsszon több késznek, mint amennyi:

| Elem | Állapot |
|---|---|
| Licenc (a fork jogi alapja) | ✅ **AGPL-3.0**, 2026-08-25 — lásd [`LICENSE`](../LICENSE) |
| Különválás gondolat-szinten (a fork „főpróbája") | ✅ élesben, 2026-08-25 |
| Küszöb-rendszer (az „alkotmányosság" hordozója) | ✅ működik |
| Koino-verzió mint entitás | ❌ nincs |
| Konszenzuális önfrissítés (D9) | ❌ nincs |
| Elismerés-entitás (N9) | ❌ nincs *(már a Fázis 1-ben megépíthető lenne)* |
| Koinók közti felfedezés | ❌ nincs |
| A forrás bárki számára elérhető és forkolható | ✅ **nyilvános repó**, 2026-08-25 — minden klón teljes mentés a történettel |
| Ellenőrizhető, hogy a koino.hu a közzétett kódot futtatja | ❌ nincs *(nincs verzió-végpont — → H8)* |
| Kód-terjesztés független a GitHubtól | ❌ nincs tükör *(→ H8)* |

---

## Kapcsolódó dokumentumok

- [`vizio_kritikak.md`](vizio_kritikak.md) 9. pont — az eredeti vita, az öt lépcsővel
- [`fejlesztesi_terv_fazis2.md`](fejlesztesi_terv_fazis2.md) — **D9** (önfrissítés),
  **D12–D13** (ez a dokumentum), **N9** (elismerés + kinevezés), **H7** (kormányzási ígéret)
- [`../LICENSE`](../LICENSE) és a [`../README.md`](../README.md) Licenc szakasza
- [`../megismeres/18-kulonvalas.md`](../megismeres/18-kulonvalas.md) — a különválás
  e-embereknek elmagyarázva (a fork gondolat-szintű megfelelője)
