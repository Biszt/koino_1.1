# koino — adat-osztályozás (H6 híd-feladat)

*Létrehozva: 2026. 08. 26. — a [Fázis 2 terv](fejlesztesi_terv_fazis2.md) **H6** híd-feladata,
a **Szakasz 0** egyetlen elkészült (és egyben utolsó) terméke. Ez a dokumentum a besorolás
FORRÁSA; a kódban lévő jelölés (`reteg` séma-opció) ennek a gépi mása.*

> ℹ️ **Ez a dokumentum túlélte a P2P-fordulatot.** Ugyanaznap a **D22/D23/D24** átírta a
> Fázis 2 végrehajtási tervét (P2P az első kiadástól, JS marad, nincs adat-költöztetés) —
> a besorolás viszont **nyelv- és architektúra-független**, ezért teljes értékű maradt.
> Csak a *felhasználása* változott: nem export-térkép, hanem **az új adatmodell térképe**.

---

## Mi ez, és mi NEM

**Ez:** minden mai adatmezőnek megmondjuk, hogy a Fázis 2-ben **melyik rétegbe** kerül —
még jóval azelőtt, hogy bármit szétválasztanánk.

**Ez NEM:** átalakítás. A H6 egyetlen sornyi működést sem változtat meg. A célja, hogy amikor
a szétválás tényleg megtörténik (B–C szakasz), az **ne utólagos szétszálazás legyen**, hanem
egy már meglévő, végiggondolt címkézés végrehajtása.

> **Miért most?** Mert a besorolást **ma még olcsó** elvégezni: 15 modell, ~150 mező, és a
> fejlesztő fejében még friss, mit miért csinál. Egy év múlva, kétszer ennyi mezővel,
> visszafejtés lenne.

---

## Miért ezek a rétegek — a döntések, amikből következnek

| Döntés | Amit kimond | Amit a besorolásra jelent |
|---|---|---|
| **D3** | két adatosztály: tartalmi réteg (tudatpont-replikált, elveszhet) és tartós mag | a kiinduló kettéosztás |
| **D5** | a lánc hatóköre CSAK a tartós mag | a tartalmi rétegnek nem kell lánc |
| **D6** | **személyes adat SOHA a láncra** | kell egy **második dimenzió**, a rétegtől függetlenül |
| **D14** | a tartós mag **az azonosság egyszeriségére és (később) a pénzre szűkül** — az egyezményeket is beleértve minden más a tudatpontot követi | **a mag drámaian kicsi lett** |
| **D17** | a tartalom, a tudatpont-hozzárendelés és a szavazás NEM igényel globális egyetértést — elég a **saját lánc-következetesség**; egy javaslat eredménye **determinisztikus számítás** | ezért kell a **LÁNC** és a **SZÁMÍTOTT** réteg |
| **D21** | a mag Merkle-fa: mindenki tárolja a saját lapját, ~1 KB | a MAG-ba sorolt mezők mérete **valódi korlát** |

**A D14 a legfontosabb, mert visszamenőleg átrendezte a D3-at:** a törésvonal nem
„tartalom vs. mag", hanem *„amit valaki fontosnak tart"* ↔ *„amit senki nem tart fontosnak,
de nélküle a rendszer csalható"*.

---

## Az öt réteg

A besorolás **sorrendben eldöntendő kérdések** láncolata — a sorrend számít, mert egy mező
több feltételnek is megfelelhet, és mindig az **első találat** nyer.

### 1. kérdés → `mag`

> **Ha ezt az adatot mindenki elfelejtené, csalás válna lehetővé?**

Nem „fontos-e", nem „kár lenne-e érte" — hanem: **a felejtés maga a csalás?** (D14)

Ma egyetlen ilyen dolog van: **„ez az ember már regisztrált"** (a kettős regisztráció ellen).
Később egy második: **„ez a pénz már el lett költve"** (D10/D16).

Ez a réteg igényel **globális egyetértést** (D17) és **örök replikációt** (D21) — ezért kell
a lehető legkisebbnek lennie. *Minden ide sorolt mező ~8 milliárd készüléken fog élni.*

### 2. kérdés → `lanc`

> **Egy e-ember aláírt cselekvése ez, amiért ő felel?**

Nem kell hozzá globális egyetértés — elég, hogy **ne tudj két különböző változatot mutatni
két különböző embernek** (D17: saját lánc-következetesség). A kettős szavazás így nem
„szabálysértés", hanem **a saját láncod önellentmondása**, amit bárki észrevesz.

Ide tartozik: a szavazat, a tudatpont-hozzárendelés, az érték javaslat, és minden
létrehozás/szerkesztés ténye.

### 3. kérdés → `szamitott`

> **Újra elő tudom állítani a fentiekből, ha eldobom?**

Ha igen: **nem igazságforrás, hanem gyorsítótár.** A Fázis 2-ben ezek nem is „adatok",
hanem függvények (D17: determinisztikus számítás). Ma azért tároljuk őket, mert a MongoDB-s
lekérdezés gyorsabb — de **eldobhatók, és ez a lényeg**.

### 4. kérdés → `tartalom`

> **Rendelhet hozzá valaki tudatpontot?**

Ha igen: tudatpont-replikált, és **elfelejthető** — ha senki nem tart rá pontot, eltűnik
(D3/D14). Ez a koino érdemi része: tartalom, javaslat, **egyezmény**, kategória.

### 5. kérdés → `helyi`

> **Ami idáig eljutott:** nem hagyja el a szervert/készüléket. Jelszó-hash, e-mail token,
> értesítések, üzemi jelzők. Se láncra, se hálózatra nem kerül — soha.

---

## A második dimenzió: `szemelyes`

A rétegtől **függetlenül** jelöljük, ha a mező azonosítható személyre vonatkozik (D6).

Egy mező lehet `tartalom` **és** `szemelyes` egyszerre (pl. a `nev`) — ez azt jelenti:
tudatpont-replikált, de **kriptográfiai bizonyítékon kívül semmi nem kerülhet róla a
láncra**, és a törlésének kezelhetőnek kell maradnia.

> ⚠️ **A legérzékenyebb mező az egész adatbázisban a `meghivo.meghivottNev`** — mert olyan
> emberről tárol nevet, aki **még nem is tagja a koinónak**, tehát nem is egyezett bele.
> (A séma kommentje ezt már ma tudja: *„a rendszer nem tárol adatot a még nem regisztrált
> személyről"* — a `meghivottNev` viszont pontosan ezt teszi. Lásd a határeseteket.)

---

## A teljes besorolás

### `eember` — az e-ember

| Mező | Réteg | Megjegyzés |
|---|---|---|
| `_id` | **mag** | az azonosság horgonya; a Fázis 2-ben a **nyilvános kulcs** veszi át a szerepét |
| `letrehozva` | **mag** | a regisztráció ténye és ideje — a D21 kötegelésének bemenete |
| `meghivoEemberId` | **mag** | **a bizalmi gráf éle** (a séma kommentje is így nevezi) — a D18 tanúsítás-gráfjának előképe |
| `eemberNev` | tartalom · *személyes* | ⚠️ az **egyedisége** ma index-kényszer, a Fázis 2-ben nem a mag része — lásd a határeseteket |
| `nev`, `lokacio.*` | tartalom · *személyes* | a nyilvános profil (D6: a név a tartalmi rétegben él) |
| `tudatpontok` | szamitott | mindenkinek **ugyanannyi** (10 000) — ez globális paraméter (D13/c), nem személyes adat; a mező ennek másolata |
| `email` | helyi · *személyes* | soha nem megy ki nyilvános válaszban (H3) |
| `jelszo` | helyi | bcrypt-hash — a Fázis 2-ben **megszűnik** (a kulcs hitelesít, D15) |
| `tokenVerzio`, `emailMegerositve`, `emailOsszefoglaloUtoljara`, `utolsoBejelentkezes` | helyi | üzemi mezők |
| `ertesitesiAlapbeallitas.*` | helyi | a saját beállításaid, senki mást nem érintenek |

### `meghivo` — a meghívó (a mai tanúsítás)

| Mező | Réteg | Megjegyzés |
|---|---|---|
| `kibocsatoEemberId` | **mag** | a **tanúsító** — a gráf él egyik vége |
| `felhasznaloEemberId` | **mag** | a **tanúsított** — a másik vége |
| `tanusitva` | **mag** | maga a nyilatkozat: „valódi, még nem regisztrált személy" (D18/1) |
| `felhasznalva` | **mag** | mikor lett az élből valóság |
| `letrehozva`, `statusz` | lanc | a kibocsátó cselekvései (kibocsátás, visszavonás) |
| `kod` | helyi | technikai titok, a kézbesítés eszköze — **soha nem megy láncra** |
| `meghivottNev` | helyi · *személyes* | ⚠️ **nem regisztrált személy adata** — lásd a határeseteket |

### `szavazat`

| Mező | Réteg | Megjegyzés |
|---|---|---|
| `eemberId`, `javaslatId`, `szavazatTipus`, `kulonvalasIgeny`, `letrehozva`, `modositva` | **lanc** | az e-ember aláírt cselekvése |

> A `{eemberId, javaslatId}` egyedi index **ma** adatbázis-kényszer; a Fázis 2-ben ugyanez
> **a saját lánc következetessége** lesz (D17) — nem a szerver tiltja meg a kettős
> szavazást, hanem a lánc leplezi le.

### `tudatpontHozzarendeles`

| Mező | Réteg | Megjegyzés |
|---|---|---|
| mind (`eemberId`, `entitasId`, `entitasTipus`, `tudatPontok`, `szerep`, `letrehozva`, `frissitve`) | **lanc** | a saját keretedből osztasz — **bárki utánaszámolhat** (D17) |

### `ertekJavaslat`

| Mező | Réteg | Megjegyzés |
|---|---|---|
| mind | **lanc** | aláírt érték javaslat; a mediánt ezekből számolja bárki (D4) |

### `tartalom`, `kategoria`, `tartalomTipus`

| Mező | Réteg | Megjegyzés |
|---|---|---|
| `cim`/`nev`, `szoveg`/`leiras`, `ikon`, `tartalomTipusId`, `kategoriaIds`, `szuloId`, `szuloTipus`, `kulonvalasok`, `letrehozva`, `modositva` | tartalom | a koino érdemi anyaga; tudatpont-replikált, elfelejthető |
| `szerkesztok[]` (`eemberId`, `allapot`, `eredeti`) | **lanc** | ki hozta létre / ki szerkeszti — aláírt cselekvés |

### `javaslat`

| Mező | Réteg | Megjegyzés |
|---|---|---|
| `javaslatTipus`, `erintettEntitasok`, `szuloId`, `szuloTipus`, `indoklas`, `egyesitesAdatok.*`, `egyezmenyTarhelyId`, `egyezmenyTarhelyTipus`, `toredek*` | tartalom | a javaslat érdemi törzse |
| `letrehozo`, `letrehozva` | **lanc** | a létrehozás eseménye |
| `statusz`, `hatalybaLepesIdeje`, `dontesiIdo`, `reszveteliArany`, `tamogatotsagiArany`, `ellenzoiArany`, `tartozkodoiArany`, `bizonyossagiMutato`, `javaslat*Szama`, `*TudatpontTulajdonosokSzama`, `utolsoSzamitas`, `ertekekElavultak` | szamitott | **a szavazatokból + küszöbökből újraszámolható** (D17) |
| `hataridoErtesitesElkuldve` | helyi | üzemi jelző (ne küldjünk kétszer) |

### `egyezmeny`

| Mező | Réteg | Megjegyzés |
|---|---|---|
| `javaslatId`, `szuloId`, `szuloTipus`, `javaslatTipus`, `erintettEntitasok`, `indoklas`, `egyesitesAdatok.*`, `modositasAdatok` | tartalom | **D14: az egyezmény is a tudatpontot követi** |
| `letrehozo` | lanc | átvett a javaslatból |
| `tamogatokSzama`, `ellenzokSzama`, `tartozkodokSzama`, az arányok, `bizonyossagiMutato` | tartalom | ⚠️ **PILLANATKÉP, nem számított** — lásd a határeseteket |
| `vegrehajtva`, `vegrehajatasEredmeny` | szamitott | a rendszer determinisztikus lépése, nem egy e-ember cselekvése |

### `tudatpontAllokacio`, `hierarchikusTudatpontAllokacio`, `tartalomErtekHisztogram`

| Mező | Réteg | Megjegyzés |
|---|---|---|
| **mind** | szamitott | **teljes egészében gyorsítótár**: az összesítések a `tudatpontHozzarendeles`-ekből, a hisztogramok az `ertekJavaslat`-okból újraszámolhatók |
| `osLanc[]` | szamitott | származtatott navigáció (a szülő-láncból) |

> Ez a három modell a legnagyobb darab, amit a Fázis 2-ben **el lehet dobni** — nem adat,
> hanem teljesítmény-döntés.

### `ertesites`, `ertesitesiBeallitas`, `emailToken`

| Mező | Réteg | Megjegyzés |
|---|---|---|
| **mind** | helyi | a postafiókod, a beállításaid, a levél-tokenjeid — soha nem hagyják el a szervert |
| `emailToken.email` | helyi · *személyes* | |
| `ertesites.adatok` | helyi | ⚠️ `Mixed` típus: **másolatokat tartalmazhat** tartalmi/személyes mezőkről |

---

## Határesetek — ahol a besorolás nem magától értetődő

### 1. Az egyezmény számlálói: pillanatkép, nem számított érték

A `javaslat` arányai **újraszámolhatók** (a szavazatok megvannak). Az `egyezmeny`-é
**nem** — mert a D14 óta a szavazatok maguk is elfelejtődhetnek alóluk, ha a javaslatot
senki nem tartja tudatponttal.

**Döntés: `tartalom`, nem `szamitott`.** Ezek az egyezmény elidegeníthetetlen részei — a
„hogyan született" bizonyítéka. Ha az egyezmény megmarad (mert valaki tartja), a
születésének körülményei is vele maradnak.

> Ez a D8 („tény ↔ hatály") gyakorlati következménye: a **tény** részévé válik az is,
> *milyen támogatottsággal* született.

### 2. Az `eemberNev` egyedisége nem tartozik a magba

Ma az `eemberNev` egyedi (index-kényszer). A Fázis 2-ben a mag **csak az emberi
egyszeriséget** őrzi (D14) — azt, hogy „ez a személy már regisztrált". Hogy két embernek
lehet-e ugyanaz a **beceneve**, az ettől független kérdés, és **nem éri meg globális
konszenzust** (D17: mindenre, ami nem csalás-kritikus, van olcsóbb megoldás).

**Következmény, amit ki kell mondani:** a P2P koinóban a becenév-egyediség vagy megszűnik
(a kulcs azonosít, a név csak címke), vagy külön mechanizmust kap. **Ez a Fázis 2 A/C
szakaszának eldöntendő kérdése** — most csak megnevezzük.

### 3. A `meghivottNev`: adat olyanról, aki nem tagja a koinónak

A meghívó sémája azt írja magáról, hogy *„a rendszer nem tárol adatot a még nem regisztrált
személyről"* — a `meghivottNev` viszont **pontosan ezt teszi**, méghozzá jó okból (a
tanúsítás a névre is kiterjed, és a regisztrációs űrlap előre kitöltve nyílik).

**Döntés: `helyi` + `szemelyes`.** Vagyis: soha nem megy hálózatra, soha nem megy láncra, és
a felhasználás után **elvileg törölhető**. *(Hogy ténylegesen töröljük-e — külön kérdés,
nem a H6-é; itt csak azt rögzítjük, hogy semmilyen elosztott réteg nem viszi tovább.)*

### 4. A `jelszo` mező a Fázis 2-ben megszűnik

A **D15** szerint a kulcs **hitelesít**, nem titkol — a bejelentkezés helyét az aláírás
veszi át. A `jelszo` tehát nem „átkerül valamelyik rétegbe", hanem **elfogy**. Ugyanígy a
`tokenVerzio` és az `emailToken` teljes modellje.

### 5. Ami MA nincs, de a magba fog kerülni

A besorolás legfontosabb tanulsága: **a mai adatmodellben a tartós mag majdnem üres.**
Amit ma az `eembers` kollekció unique indexe intéz (*„ez a név/e-mail már foglalt"*), az
**nem bizonyíték, hanem a szerver szava** — pontosan az, amit a B szakasz megszüntet.

A magba a Fázis 2-ben ezek kerülnek, és ma **egyik sem létezik**:

| Ami hiányzik | Melyik szakaszban jön | Döntés |
|---|---|---|
| **nyilvános kulcs** e-emberenként | A | D15 |
| **tanúsítás-entitás** (a meghívó utódja, több tanúval) | A | D18/1 |
| **Merkle-csúcsszám** (ujjlenyomat) + lapok | B | D21 |
| **köteg-azonosító** (napi kötegelés) | B–E | D21 |
| **pénz-egyenleg és költés-előzmény** | F | D10/D16 |

---

## Mit jelent ez a következő lépésekre

> 🔀 **FRISSÍTVE (2026-08-26):** a **D22** (P2P az első kiadástól) és a **D24** (nincs
> adat-költöztetés, új regisztráció) után ez a besorolás **nem export-térkép többé, hanem
> az új adatmodell térképe**. A H5 (export/import) elesett; a besorolás értéke viszont
> **nőtt**, mert most azt mondja meg, mi kerül egyáltalán a készülékre.

- **Szakasz 1 — A helyi koino:** a besorolás megmondja, mit tárol a készülék, és mit nem:
  - `mag` + `lanc` + `tartalom` → **a készüléken él, aláírva**
  - `szamitott` → **nem tárolandó és nem terjesztendő** — az eseményekből számítódik (D17);
    ez ma **56 mező**, ami a Fázis 2-ben adatból **függvénnyé** alakul
  - `helyi` → a jelentős része **megszűnik** (jelszó, token, e-mail-token: a kulcs
    hitelesít, D15), a maradék (értesítések, beállítások) készülék-magán marad
- **Szakasz 3 — A bizalmi háló:** a `mag` réteg mai 8 mezője jelöli ki, hova érkezik a
  tanúsítás — ma a `meghivo` a bizalmi gráf éle, holnap a tanúsítás-entitás (D18/1).
- **Szakasz 4 — A lépték:** a Merkle-fába pontosan a `mag` mezők kerülnek — ez az, ami
  ~1 KB/e-ember nagyságrendben tartja a D21 „mindenki tárolja a saját lapját" rétegét.
- **A nyelvhatár (D23):** a besorolás egyben azt is megmutatja, hol lenne értelme valaha
  más nyelvet (Rust/WASM) használni: a determinizmus-kritikus `mag` **8 mező**, míg a
  gyakran változó `tartalom` **73** — nem a programot kell nyelvre választani, legfeljebb
  a magot.
- **A tartalmi réteg érintetlen marad** — ez a besorolás legjobb híre: a koino érdemi
  anyaga (tartalom, javaslat, egyezmény, kategória) **nem kerül lánc-kényszer alá**.

---

## Hogyan van jelölve a kódban

Minden séma-mező Mongoose-definíciója kap két opciót:

```js
cim: {
  type: String,
  required: true,
  reteg: 'tartalom',    // H6 — adat-osztályozás
  szemelyes: false      // csak ott kiírva, ahol true
}
```

A Mongoose az **ismeretlen opciókat megőrzi, de nem használja** — a működésre tehát
semmilyen hatása nincs, viszont **gépileg olvasható**: `sema.path('cim').options.reteg`.

**Ellenőrző eszköz:** `backend/tools/retegEllenorzes.js` — végigmegy minden modellen, és
kiírja a **besorolatlan** mezőket. Így a besorolás nem tud némán elavulni: egy új mező
rögtön látszik.

```bash
node backend/tools/retegEllenorzes.js
```

---

## Napló

- **2026-08-26** — A dokumentum létrejött: a **H6** híd-feladat első lépése (a Fázis 2
  **Szakasz 0** kezdete). Csaba döntései: **öt réteg** (`mag` / `lanc` / `tartalom` /
  `szamitott` / `helyi`) + külön `szemelyes` jelölés; a jelölés helye a **séma-opció**,
  mellette ellenőrző eszközzel. A besorolás 15 modell + 2 al-séma ~150 mezőjét fedi le.
  Négy határeset kimondva (egyezmény-pillanatkép, `eemberNev`-egyediség, `meghivottNev`,
  a `jelszo` megszűnése), és rögzítve a legfontosabb felismerés: **a mai adatmodellben a
  tartós mag majdnem üres.**
- **2026-08-26 (2)** — **A P2P-fordulat átvezetve** (D22/D23/D24). A dokumentum tartalma
  változatlan; a „mit jelent ez a következő lépésekre" szakasz átírva: a H5 export elesett,
  helyette a besorolás a **Szakasz 1 (helyi koino)** adatmodelljének kiindulása. Új
  megfigyelés: a réteg-számok (`mag` 8 ↔ `tartalom` 73) **a nyelvhatár térképe** is (D23).
