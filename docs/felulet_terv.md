# A koino felülete a Fázis 2-ben

*Létrehozva: 2026. 08. 27. — Csaba kérésére, aki a Szakasz 1 fejlesztői nézetét látva
kimondta az alapelvet.*

---

## ALAPELV: a felület ÖRÖKLŐDIK, nem rögtönzünk újat

> „Nem szeretnék ideiglenes, rögtönzött frontendet, még a teszteléshez sem. Pontosan azt
> a felületet szeretném látni, mint a koino_1.1-ben. Természetesen azt megértem, hogy ha
> a fejlesztés még nem tart ott, de akkor még **nem is akarom tesztelni a kliens
> oldalt**." — Csaba

Ez a **D22** örökség-elvének gyakorlati alakja: a domain-logika és a **felület** átjön a
prototípusból, csak az alatta lévő réteg cserélődik (szerver helyett aláírt események).

**Következmények a munkamódszerre:**

| | |
|---|---|
| Amíg a modell nem stabil | **nincs kliens-oldali tesztelés** — a próbaoldalak (`koino/meres/*.html`) elegendők |
| A Szakasz 1 nézete | ⚠️ **fejlesztői eszköz**, és a lapon is ez áll rajta. Nem a koino képe, nem is lesz az |
| Amikor a felület elkészül | a **pakli, a kártyák, a fülek és a hamburger menük** a prototípusból jönnek át |

---

## A BELÉPŐ TÉR NÉZETE (Csaba, 2026-08-27)

A **D25** belépő tere kap egy saját nézetet — **ugyanazzal a stílussal és logikával, mint
a pakli**, de a kártyákon nem gondolatok, hanem **koinók** állnak.

> „A belépő tér is követné ugyanazt a stílust meg logikát, mint a pakli nézet, annyi
> különbséggel, hogy itt a kártyákon a **koinók** (közösségek saját adatbázissal) kapnak
> helyet." — Csaba

### Rendezés

- **Nem hierarchikus** (egyelőre) — sima **lista**;
- ⭐ **a LÉTREHOZÁS IDŐPONTJA szerint** *(Csaba, 2026-09-06)*.

> ### ⚠️ AMI ITT EREDETILEG ÁLLT — és miért esett ki
>
> *„e-ember-szám szerint, fentről lefelé csökkenő sorrendben (a D25 létszám-rangsora)."*
>
> A **D25 2026-08-31-i módosítása** után ez tarthatatlan lett: nincs téri mag, tehát a térből
> nézve a létszám **a koino állítása**, kívülről igazolhatatlan. Egy csökkenő rangsor
> igazolhatatlan, önbevallott számokból pontosan az a **hamisítható toplista**, amit a
> tanúsító-rangsornál elvetettünk — ugyanaz a „globális szám" alak, ami miatt a Duniter-féle
> távolság-szabály is kiesett (**D18/2**).
>
> ⭐ **Amiért a létrehozási idő jobb, és nem csak más:** a létszám **nő**, tehát folyamatos
> ösztönzőt ad a felfújására; a létrehozás ideje **rögzített**, egyszer eldől és soha nem
> változik. Nincs mit hajszolni rajta, és a lista sem kavarog.

> ⏸️ **Két részlet még eldöntetlen** *(Szakasz 5)*:
>
> 1. **Új van elöl, vagy régi?**
> 2. **Melyik időpont?** A koino-létrehozás `ido` mezője **a szerző órája** — vagyis ez is
>    állítás, csak sokkal gyengébb ösztönzővel (egyszeri hazugság, nem növelhető).
>    ⚠️ *Az `allapotSzamitas.js` épp ezért nem rendez `ido` szerint sehol.* A hamisíthatatlan
>    alternatíva: **mikor látta ELŐSZÖR ez a készülék** — helyi megfigyelés, mint a
>    `tarsak.js` `utoljara` mezője: nem terjed, és semmit nem dönt el (3. szabály). Ára, hogy
>    készülékenként más sorrendet ad.

> ### ⚠️ ELAVULT LETT (2026-08-31) — a D25 módosítása miatt
>
> Itt eredetileg ez állt: *„az emberek valódiságát a **téri mag** igazolja — tehát a rangsor
> ellenőrizhető."* **Ez már nem igaz: nincs téri mag.** Csaba 2026-08-31-én úgy döntött, hogy
> **a tanúsítások nem jönnek át koinók között** — a belépő tér csak **böngészésre** közös —,
> mert különben egy laza koino **tanúsítás-gyárrá** válhatna. Ezzel a **tartós mag
> koino-helyi** lett.
>
> **Amit ez a nézetre jelent:** egy koino létszáma **abból a koinóból** ellenőrizhető, nem a
> térből. A téren átnézve a szám **a koino állítása**, amit onnan nem lehet igazolni.
> ⚠️ **Ezt a felületnek meg kell mondania** (D19: bejelent, nem bíráskodik) — különben a
> rangsor pontosan olyan hamisítható toplistává válna, amilyet a tanúsító-rangsornál
> elvetettünk.
>
> *Tisztázandó a Szakasz 5-ben: mit mutasson a kártya a létszám mellé, hogy a szám
> súlya látszódjon.*

### Két menü-szint

| Hol | Mit tartalmaz |
|---|---|
| **A kártyán** (hamburger) | az **adott koinóhoz** tartozó opciók — **és itt kap helyet a bejelentkezés is** |
| **Az alsó sávban** | a **térre** vonatkozó opciók |

Ez tükrözi a D25 szerkezetét: a koino a saját ügyeit intézi (belépés, szabályok), a tér
pedig az, ami közös (az azonosságod, a koinók listája, új koino indítása).

---

---

## ⭐ A SZAKASZ 5 ELŐTT (2026-09-06) — amit az identitás-réteg hozzátett

> ⚠️ **Ez a dokumentum 2026-08-27-én készült — tíz nappal a Szakasz 4 ELŐTT.** Amit alatta
> olvasol (pakli, belépő tér, menük), az érvényes, de **egy szót sem szól** a két lépcsőről,
> a megbízásról, a kontraszt-jelzésről és a visszavonásról. Márpedig a **D46** szerint a
> visszavonás **emberi út** — vagyis végig felület-kérdés. Ez a szakasz pótolja.

### 1. ⭐ A MEGBÍZÁS MUTATHATÓ — a jelzés nem rangsorolható

*Csaba (2026-09-06): „a megbízásnak köszönhetően kialakul egy híresebb csoport, de ez nem
baj, mert **választott emberek** lesznek."*

**És ez így is van** — a **D18/1** nem erről szól. Az a döntés egyetlen szűk dolgot zár ki:
hogy **maga a tanúsítás** jelentsen bizalmat (*„megbízom benne"* → hírnév-rendszer lenne,
kapuőrséggel). A **felhatalmazás** ezzel szemben nyílt, közösségi megbízás, amit a **D60**
kifejezetten *„megbízás, nem pontszám"*-ként ír le. Egy ismert, választott tanúsítói kör
tehát **a szerkezet szándéka**, nem a mellékhatása.

### ⭐⭐ ÉS A FELÜLETRE NINCS KÜLÖN KORLÁTOZÁS — ez Csaba döntése

Felmerült, hogy a felületnek külön szabály tiltsa meg a kontraszt-jelzés rangsorolását
(nehogy a számból pontszám vagy toplista legyen). **Csaba elvetette (2026-09-06):**

> „Nem kell szabályt hozni erre. Szerintem **látszódhat bármi**. A koino **a láthatóságról**
> szól, nem a magánügyről."

⭐ Ez következetes az egész építménnyel: a **D19** szerint a program **bejelentő, nem bíró**,
a **D49** szerint a szabály *„egy minimumon kívül nem tilt, hanem FELTÁR"*. Ha a feltárás a
cél, akkor a felület dolga **megmutatni**, nem szűrni. Amit a közösség lát, arról dönteni is
tud — épp ez a *„kár = a támadó üteme × az ébredés ideje"* törvény gyakorlati oldala: a
gépnek az **észrevételt** kell gyorsítania.

⚠️ **Amit ez NEM változtat meg:** a `jelzesek.js` kódbeli garanciái maradnak — nincs „gyanús"
mező, és a **szabály- és döntés-réteg nem importálja** a jelzéseket. Az a garancia arról
szól, hogy a jelzés **semmilyen jogot nem von meg** (D49/c), nem arról, hogy mi látszik.
⭐ *A kettő független: a koino mindent megmutathat, és közben semmit nem ítél meg.*

### 2. ⭐ A MÉRET: az ADAT-csomag a szűk keresztmetszet, nem a program

*Csaba (2026-09-06): „az adat-csomagnak kell kicsinek lennie. A telepítendő programnak nem
kell kicsinek lennie."*

Ez feloldja azt, ami elsőre ütközésnek látszott: a prototípus frontendje ≈ **1,8 MB**
(1490 KB JS + 231 KB CSS + 81 KB HTML), a pakli-mag önmagában **288 KB** — a mai 827 KB-os
programhoz képest sok, **de nem ez a mérce.** Amit telepítesz, egyszer töltöd le; amit a
koino **naponta cserél**, az megy a hálón, a telefonodon, a méréseidben.

✅ **A 6. szabály ezért szét lett választva** (`CLAUDE.md`, 2026-09-06, Csaba jóváhagyásával):
**kemény** a nulla függőség és az **adat-csomag** mérete (~400 bájt egy esemény · 334 bájt egy
üres csere-kör · ~1 KB/fő a saját lap, D21), **lágy** a program mérete.

### 3. ✅ A FUTTATÓKÖRNYEZET — ELDŐLT (2026-09-06): helyi kiszolgáló + böngésző mint kliens

*Csaba döntése: **„legyen az A)"**.*

**A koino marad az, ami ma: Node-program**, ami portot nyit, eseményt cserél, állapotot
számol — ma is **nulla böngészővel** működik, és ez nem változik. A program **emellé** nyit
egy helyi kaput a `127.0.0.1`-en, kiszolgálja az örökölt felületet, és a lap **rajzol**.

⭐ **Amiért ez olcsó — mérve:** a prototípus frontendjében **nincs build-lépés, nincs
keretrendszer, nincs `package.json`** (sima ES-modulok), és a **teljes szerver-kapcsolata egy
fájlon megy át**: `frontend/js/utils/apiHelper.js` (`API_ALAP_URL = '/api/'`), összesen **7
`fetch(`** az egész frontendben. A lap átirányítása a koino programra tehát **egy 11 KB-os
fájl**, nem 94.

#### ⛔⛔ A KÉT SZABÁLY, AMITŐL A BÖNGÉSZŐ CSERÉLHETŐ MARAD

*Ez a szakasz Csaba kérdésére született: „böngésző-függővé kell tennünk a koinót? Ha a
böngésző tiltólistájára kerül, nem fog működni?" — **Nem.** De csak akkor nem, ha ez a kettő
igaz marad, ezért ellenőrizhető szabályként van leírva. ⭐ Ugyanaz a fogás, mint az 1.
szabálynál: a szállítás azért cserélhető, mert a `csere.js` sosem importált hálózati kódot.*

1. ⛔ **A program SOHA ne importálja a felületet.** A felület beszél a programhoz a helyi
   illesztésen át; a program nem tud róla semmit. Így a böngésző **egy illesztés MÖGÖTT van,
   nem a programban** — kicserélni annyi, mint másik klienst írni, nem a koinót átírni.
2. ⛔ **A parancssori út marad TELJES út, nem csökevény.** A **4. szabály** a felületre
   alkalmazva: amit a pakli tud, azt a parancssor is tudja. ⚠️ *Ha ez egyszer megbicsaklik, a
   böngésző csendben előfeltétellé válik — pontosan az, amit a 7. szabály tilt.*

⭐ **Ezért a böngésző abba a rekeszbe kerül, ahol a `kapunyitas.js`, a `helyiFelfedezes.js` és
a STUN van: kényelem, nem előfeltétel.** Ha egyszer elérhetetlen lesz, **az örökölt paklit**
veszítjük el (az HTML/CSS/JS, más nem futtatja), nem a koinót — és mivel a felület egy
illesztés mögött ül, olcsón jöhet **második kliens** (terminál vagy natív). *A mai CLI már
ennek a kezdetleges változata.*

> **Amit a „tiltólista" valójában elérhet — és amit nem:** a Safe Browsing / SmartScreen
> **URL-eket és domaineket** tilt, hálózatról jövő oldalakra; a `http://127.0.0.1:7373/`
> egyik sem, és kérés sem hagyja el a gépet. A Chrome **Private Network Access** a fordított
> irányt korlátozza (webes oldal ne érje el a te localhostodat) — az nekünk **véd**. Ahol
> tényleg elérhet: **céges/iskolai házirend** (`URLBlocklist`), vagy ha egy gyártó egyszer
> megvonná a localhosttól a „biztonságos környezet" státuszt. ⚠️ *Ez az egész
> webfejlesztést törné, tehát valószínűtlen — de a **D30–D32** lényege, hogy a
> „valószínűtlen"-re nem fogadunk, ha a kapcsoló másnál van.*

#### ⭐ VÉKONY LAP: a program számol, a böngésző rajzol

- ⛔ **Vastag lap** (a program átadja az eseményeket, a lap számol) — ekkor a szabály-logika
  **kétszer** létezne. Ez a `kanonikusAlak`-kettőzés kockázata, csak az egész szabályrendszeren.
  Ráadásul a lapnak **az összes eseményre** szüksége volna: a `betolt()`, az egyetlen
  megmaradt nem-skálázó út, **beépülne a felületbe** (9. szabály).
- ✅ **Vékony lap** — egy megvalósítás, és a lap **szeletet vagy egy oldalnyi kártyát** kér,
  sosem azt, hogy „add ide mindet".

🔍 **Ebből következik a Szakasz 5 igazi munkája:** nem a rajzolás a nehéz, hanem hogy a
**lap↔program illesztés KÉRDEZHETŐ legyen az első naptól** — ugyanaz a lecke, mint a
Szakasz 3 tár-illesztésénél. *Mögötte a megvalósítás nyugodtan maradhat egyszerű.*

#### ⚠️ Két ár, amit ki kell mondani

- **A helyi kapu támadási felület.** Bármelyik nyitott weboldal megpróbálhat
  `fetch('http://127.0.0.1:…')`-ot. Kell rá **origin-ellenőrzés és indításkor generált
  jelszó** — nem opcionális részlet. *(A 3. szabályt nem sérti, a kapu ugyanaz az
  `esemenyMentese` marad — de a **saját kulcsommal aláírni** más kérdés, mint eseményt
  elfogadni.)*
- **Az `/api/` alakját újra kell tervezni.** A fájl egy, a jelentés nem: a prototípusban
  REST-hívások mentek Mongóra, itt **számított állapot** van. Ez nem másolás, hanem tervezés.

### 4. ✅ A HATÓKÖR: a TELJES pakli — nem mérföldkő (2026-09-06)

*Felmerült, hogy előbb egy legkisebb használható felület készüljön (a „család vagy osztály
élesben" mérföldkő), és a pakli csak utána. **Csaba döntése: „a teljes pakli átemelése. Nem
kell mérföldkő."*** — a Szakasz 5 tehát a **teljes** felületet célozza, nem egy szűkített
első kiadást.

⭐ **És a pontosítás, ami ehhez tartozik** *(Csaba, 2026-09-06)*: a „nem kell mérföldkő" a
**szűkített termékre** vonatkozik (a „családi/osztály" kiadásra) — **nem a munka
felosztására**. *„Azt természetesen megértem, hogy a szakaszokra/állomásokra van osztva az
átvitel, központi szerverről P2P-re."* Vagyis: **az ÁLLOMÁSOK maradnak, a CÉL nem szűkül.**

⚠️ **Ebből NEM következik, hogy mind a 82 végpont átjön** — és ez nem hatókör-szűkítés, hanem
a P2P világ ténye: **egyes felület-darabok mögött nincs mit átemelni.** A prototípus 18
útvonal-fájlja, 82 végponttal, három csoportra esik:

| Csoport | Mi tartozik ide | Mi lesz vele |
|---|---|---|
| ✅ **Átjön, új adatforrással** | `pakliRoutes` (3) · `gondolatRoutes` (5) · `kategoriaRoutes` (5) · `gondolatTipusRoutes` (5) · `javaslatRoutes` (8) · `egyezmenyRoutes` (4) · `tudatpontRoutes` (8) · `ertekJavaslatRoutes` (5) | **ez a Szakasz 5 magja** — a nézet marad, alatta Mongo helyett **számított állapot** |
| 🔄 **Átjön, de MÁS mechanikával** | `meghivoRoutes` (5) — meghívó**kód** helyett a Szakasz 4 **`Meghivas` eseménye** · `ertesitesRoutes` (5) — helyben számolt értesítés, e-mail nélkül | a felület hasonló, a mögöttes fogalom más |
| ⛔ **Nincs mögötte semmi a P2P-ben** | `eemberRoutes` nagy része (regisztráció, **bejelentkezés, jelszóváltás, jelszó-helyreállítás, e-mail-megerősítés**) — a **D15** szerint nincs jelszó, a kulcs hitelesít · `ertesitesiBeallitasRoutes` (7) — e-mail-küldés nincs · `feltoltesRoutes` (2) — szerver-oldali feltöltés nincs (**D3**: a tartalmi réteg kérdése) · `lokacioRoutes` (3) — ország/régió/település, **D6**: személyes adat nem megy a láncra · `platformStatisztikaRoutes` (1) — központi fogalom | ⭐ nem „kihagyjuk", hanem **nincs mit átemelni** |

⏸️ **És két dolog szándékosan később:** a `keresesRoutes` (1) a **Szakasz 6** (kereső-réteg,
elhagyható — 2. szabály), a `sikidomRoutes` (2) + `SikidomModal.js` (171 KB) pedig a
**felfüggesztett síkidom-nézet** (2026-07-20 óta), amit ez a szakasz nem éleszt újra.

🔍 **A Szakasz 5 első munkadarabja ezért nem kód, hanem a végpont-térkép:** a felső sor 43
végpontjához megmondani, **mit kérdez a lap** és **mit számol a program** — kérdezhető
alakban (9. szabály), nem „add ide mindet".

---

## Ami még nyitott

- ✅ **A futtatókörnyezet** — *eldőlt 2026-09-06:* helyi kiszolgáló + böngésző mint kliens,
  vékony lappal (3. pont).
- ⏸️ **Az `/api/` alakja** — mit kérdezhet a lap a programtól? ⭐ **Ez a Szakasz 5 gerince**
  (kérdezhető illesztés, 9. szabály), és ez az első, amit meg kell tervezni.
- ⏸️ **A helyi kapu védelme** — origin-ellenőrzés + indításkor generált jelszó.
- **Mit jelent pontosan a „bejelentkezés" a kártya-menüben?** A D15 szerint nincs jelszó —
  a kulcs hitelesít. Valószínűleg **belépés az adott koinóba** (csatlakozás), nem
  jelszavas bejelentkezés. *Tisztázandó.* ⭐ *A Szakasz 4 óta van rá pontos válasz-jelölt: a
  `Belepes` esemény + egy meghívás — vagyis a „bejelentkezés" valójában **csatlakozás**.*
- **Mik legyenek az alsó sáv (tér-szintű) opciói?** Jelöltek: új koino indítása, a saját
  azonosságod és kulcsod, keresés a koinók között, a tér ujjlenyomata.
- ✅ **Mikor emeljük át a pakli-felületet?** — *megválaszolva:* a Szakasz 2 utánra tervezett
  átemelés a **Szakasz 5** lett, és a modell azóta megállapodott (Szakasz 3 + 4 kész).

---

## Napló

- **2026-09-06** — ⭐ **A Szakasz 5 előkészítése — öt döntés.** **(1)** a megbízás
  mutatható, és a belőle kialakuló ismertebb, **választott** kör nem baj — a D18/1 nem erről
  szól; ⭐ a felületre **külön korlátozás sem kerül** (Csaba: *„látszódhat bármi. A koino a
  láthatóságról szól"*). **(2)** A méret mércéje az
  **adat-csomag**, nem a telepítendő program (a 6. szabály átírása Csaba jóváhagyására vár).
  **(3)** A belépő tér rendezése **létszám helyett létrehozási idő** szerint — a létszám nő,
  tehát felfújható; a létrehozás ideje rögzített. ⭐ **(4)** És a nap végén a
  **futtatókörnyezet is eldőlt** (Csaba: *„legyen az A)"*): **helyi kiszolgáló + böngésző mint
  kliens, vékony lappal** — a böngésző cserélhető rajzoló marad, két ellenőrizhető szabállyal
  (a program nem importálja a felületet · a CLI teljes út marad). ⭐ **(5)** És a hatókör:
  **a TELJES pakli**, nem szűkített első kiadás (Csaba: *„nem kell mérföldkő"*) — a 82
  végpontból viszont **43 az, ami átjön**; a többi mögött vagy nincs semmi a P2P-ben
  (jelszó, e-mail, feltöltés, lokáció), vagy későbbi szakasz. ⏸️ Nyitva maradt: az
  **`/api/` alakja** (ez a következő munkadarab) és a **helyi kapu védelme**.
- **2026-08-27** — A dokumentum létrejött. Csaba kimondta az alapelvet (a felület
  öröklődik, nem rögtönzünk), és leírta a **belépő tér nézetét** (pakli-stílus, koino-
  kártyák, létszám szerinti lista, kártya-hamburger + alsó sáv). A Szakasz 1 nézete
  ezzel egyértelműen **fejlesztői eszközzé** minősült — a lapon is ez áll rajta.
