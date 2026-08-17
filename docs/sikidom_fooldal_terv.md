# Síkidom nézet mint főoldal — terv és mérési eredmények

*Készült: 2026-08-16/17. Forrás: Csabával folytatott tervező- és mérő-munkamenet.*

Ez a dokumentum három dolgot rögzít: (1) a nagy átalakítás tervét, (2) a mögötte
álló hosszú távú víziót, (3) a böngészős mérés eredményeit. A folytatáshoz ez a
kiindulópont.

---

## 1. A vízió: három nézet, egy böngészési állapot

A koino három nézetben mutatja ugyanazt:

- **Síkidom nézet** — a hierarchia, terület ∝ tudatpont
- **Térkép nézet** — a földrajz (még nem létezik)
- **Pakli nézet** — **NEM egyenrangú**: ez egy *eszköz*, ami a tartalmakat
  megjeleníti mindkét nézetben. Modálként nyílik, ✕-szel bezárható.

Csaba szavai: „a pakli nézetet nem szeretném egyenrangúnak venni, hanem egy
eszköznek, ami segít megjeleníteni a tartalmakat mindkét nézetben."

### A két szűrő-dimenzió (későbbi fázis)

```
böngészési állapot
├── ágazat   : melyik ágban vagyok      ← a síkidom és a pakli állítja
├── lokáció  : melyik földrajzi körben  ← a térkép állítja
├── aktív entitás
└── rendezés
```

A két szűrő **merőleges** és **metszetben** hat: leszűkítesz egy ágazatra a
síkidomban → átváltasz térképre → annak az ágazatnak a lokális eloszlását látod.
Vagy fordítva: a térképen ráközelítesz egy megyére → síkidomra váltva annak a
megyének a struktúráját látod.

**Az ágazat-dimenzió lényegében kész**: az indexelt `osLanc` + `agEntitasId` /
`agazatId` már végigmegy a struktúrán, kereséseken, értesítéseken, tudatpontokon
és a rendezett paklin.

**A lokáció-dimenzióból szinte semmi nincs meg** — lásd a 4. szakaszt.

---

## 2. A most következő átalakítás (hatókör)

Csaba által rögzített hatókör:

1. A **síkidom a főoldal** — belépéskor ez jön, nem a pakli.
2. Az **alsó sáv marad**.
3. A síkidomon **nincs ✕** (nem bezárható; ez az alapréteg).
4. Egy entitásra koppintva **a pakli nyílik meg modálként**, azzal az entitással;
   a síkidom a **háttérben marad**, a pakli **kiixelhető**.
5. A **nézetváltás a hamburger menükben marad** (egyelőre minden funkció ott).
   A fő menüben: **Síkidom nézet** marad, mellé **Térkép nézet 🚧**.
   A „Pakli nézet" **NEM** menüpont.
6. A síkidom legyen elérhető a **kártyák hamburger menüjéből** is — akkor az adott
   **ágat mutassa a környezetével** (szülők, ami a söprés után is megmarad).
7. Az **üres/hibás állapotot a síkidomnak kell megjelenítenie** (ma zsákutca-felirat).
8. Belépéskor **teljes kép**; oldalfrissítéskor **őrizze meg a horgonyt**
   (→ `sessionStorage`, belépéskor kifejezetten ürítve).
9. A `SikidomKartyaPanel` (egykártyás panel koppintásra) **törlendő** — a pakli
   lép a helyére.

### Csaba döntései a megvalósítás előtt (2026-08-17)

A hatókör négy nyitott kérdését a kódolás előtt tisztáztuk. **A lényeg: a két réteg
LAZÁN kapcsolódik** — nem kell összehangoló gépezet, és ez érezhetően kisebb munka.

- **D1 — A ◀ vissza-gomb.** Ha a pakli nyitva van, a vissza **csak bezárja**. A síkidom
  **kimarad a történetből** (ma sincs benne: a `_sikidomMegnyitasa` nem rögzít állapotot).
  A horgony-váltások történetbe kötése későbbi, ráépíthető lépés.
- **D2 — A pakli bezárása után a síkidom OTT MARAD, ahol volt.** A horgonya független
  állapot; nem a pakli „aktív entitása" vezérli.
- **D3 — A síkidom NEM követi a paklit.** Ha a nyitott pakliban másik entitásra lépsz
  (testvér-lapozás, rendezés), a mögötte lévő síkidom **meg sem mozdul**. Navigálni a
  síkidomban egyetlen módon lehet: a kártya hamburger menüjének „Síkidom nézet"
  pontjával. *(Csaba: „később lesz majd valami duplakattintásos módja is a
  navigációnak, de egyelőre a paklin keresztül, a Síkidom nézet kiválasztásával
  lehet csak navigálni.")*
- **D4 — A kártya-menüs „Síkidom nézet" BEZÁRJA a paklit.** Az ágra állított síkidomot
  akarod nézni, nem a paklit fölötte.

**Következmény, amit ebből levezettünk:** az „aktív entitás" (amire az alsó sáv és a
menük hivatkoznak) megtartja a mai jelentését — a pakli utolsó entitása —, a síkidom
horgonya pedig **külön állapot**. A kettő szándékosan nem szinkronizált.

### A megvalósítás lépései (megegyezve, 2026-08-17)

Apró lépések, mindegyik után működő állapottal:

1. ✅ **A síkidom saját rétegre** (ki a `Modal`-ból) — *kész, böngészőben igazolva*
2. A **harmadik réteg** bevezetése, a pakli modálként megnyithatóvá tétele
3. **A lusta pakli** — a `FoOldal` 17 pakli-hivatkozásának felkészítése a hiányra
   *(itt érdemes megállni böngészős ellenőrzésre — ez a legnagyobb munka)*
4. A síkidom lesz a **belépő nézet**; menüben „Térkép nézet 🚧"; az **ideiglenes ✕ törlése**
5. Koppintás → **a pakli modálként** nyílik az entitásra
6. A `SikidomKartyaPanel` **törlése**
7. **Ág-gyökértől indítás** a kártyák hamburger menüjéből (D4: a pakli bezárul)
8. **Üres/hibás állapot** a síkidomon + horgony megőrzése `sessionStorage`-ban

### A három csapda, amit a kód átnézése feltárt

**1. A síkidom nem maradhat `Modal`.** A `Modal` vermet vezet a nyitott
modálokról, és a főoldal vissza-gombja azt kérdezi: „van nyitott modál? akkor
előbb azt zárjuk". Ha a síkidom mindig nyitott modál, ez **örökre igaz** → a
vissza-gomb soha többé nem navigál. Ki kell venni a modal-gépezetből, saját
rétegre. (Az ESC és a háttérre kattintás bekötése is innen jön.)

**2. Három réteg kell, nem kettő.** A `Modal` felülírja a konténere tartalmát:

```
alapnézet-réteg  →  síkidom                     (saját konténer)
modal-réteg      →  pakli                       (modal-kontener)
al-modal réteg   →  a pakli kártyáinak modáljai (almodal-kontener)
```

A harmadik nélkül az első javaslat-modál kilőné a paklit. Olcsó: a `Pakli`
konstruktora **már paraméterként kapja mindkét konténer azonosítóját**.

**3. A `FoOldal` mindenhol azt hiszi, hogy van pakli.** Ma az `init()`-ben jön
létre, és hivatkozik rá a rendezés-történet, a nézet-nyitás történet, a
`_navigalasEntitasra` és a vissza/előre visszajátszás. Lusta paklinál mindnek el
kell viselnie a hiányát. **Ez a legnagyobb tényleges munka, és kívülről nem látszik.**

### Ág-gyökértől indítás (6. pont)

A viselkedés **már be van építve**, csak a megnyitás nem tud ág-gyökértől indulni:

- `gerincLanc` — a horgony és ősei; ez éli túl az ős-söprést (ez a „környezet")
- `FELFELE_SZINTEK = 3` — a bejárás 3 szinttel a horgony fölött kezdődik
- `FOLYOSO_SZINT = 4` — a megtartási folyosó, ami ezt nem engedi elsöpörni

Egyetlen új munka: induláskor a horgonyt az adott entitásra állítani, és lehozni
az ős-láncát (a méretezéshez kell a szülők pontja). Az `osLanc` indexelt.

---

## 3. Mérési eredmények (2026-08-16, dev, 15 611 tartalom / 10 407 gyökér)

### Kezdő fázis: **1,73 másodperc**

Megnyitástól a zárolás feloldásáig, 5000 lerakott síkidommal. Csaba becslése
(~2 mp) igazolva. A hálózat 1,72 mp-et vitt el az 1,73-ból → **a kezdő fázis
gyakorlatilag teljesen a lekérésekre megy el**. 38 kérés, kérésenként 50–120 ms.

### Hálózat: 38 kérés, **1,29 MB**

- **Nincs tömörítés.** `decodedBodySize == encodedBodySize`, és a
  `backend/package.json`-ben nincs `compression`. Ez nyers, tömörítetlen JSON,
  ötezerszer ismételt mezőnevekkel — gzip-pel a töredéke lenne. **Egy sor
  middleware, és MINDEN végpontnak használ.** A legolcsóbb nagy nyereség.
- **Az üres ikon-mezők ~130 KB-ot (10%) visznek** úgy, hogy ezen az adaton
  gyakorlatilag nincs is ikon — csak az üres állványzat (`[]`, `null`) utazik.
  Valódi adaton (kategóriákkal, típusokkal) ez sokszorosa lenne.

### A cím-hasznosulás: **4998 letöltött címből 2 látszik**

A beállt kezdő képen 5000 lerakott síkidomból **kettő** éri el a 48 képpontos
felirat-küszöböt, **egy** a 96-os ikon-küszöböt.

```
letöltés küszöbe   MIN_KEP_ATMERO   = 24 px
felirat küszöbe    CIMKE_MIN_ATMERO = 48 px  →  2× átmérő  →   4× tudatpont
ikon küszöbe       IKON_MIN_ATMERO  = 96 px  →  4× átmérő  →  16× tudatpont
```

**Javaslat: három fokozat egy végponton** — `pozicio` (id, típus, pont,
létrehozva, vanGyereke) tömeges adagban; `cim` csak a felirat-küszöb fölöttieknek;
`ikonok` csak a 96 fölöttieknek. A kliensnek megvan a gépezete: a `_pontKuszob` a
méret-modell megfordítása, ugyanezzel a képlettel a felirat- és ikon-küszöb is
kiszámolható tudatpontban.

⚠️ **De a cím csak 168 KB, a forgalom 13%-a.** A szétválasztás önmagában nem a nagy
nyeremény bájtban — a **szerver-időben** viszont az lehet (elmarad az
`entitasCimekFeltoltese` + `mellekIkonokFeltoltese` kör adagonként). A mérés
localhost volt, ami **alábecsüli a bájt-költséget** és **felfedi a szerver-költséget**;
interneten fordítva lenne. **Mérni kell, mielőtt hozzányúlunk.**

### Hosszú munkamenet (7 perc 20 mp)

105 kérés, 2,84 MB, tár 10 692 csomópont, memória **14 MB** — nem szállt el.

**Szerkezeti tanulság:** a böngészés során **a teljes gyökér-szint lejött** (10 407),
és a tár a `MEGTARTOTT_DARAB = 12 000` plafon **89%-án** állt. Egyetlen szint
majdnem kitölti a teljes megtartási keretet — és főoldalként ezt látja mindenki
elsőként.

**Amit ez a menet NEM mért meg:** az **ős-söprés egyszer sem futott** (a horgony végig
`vilag` maradt, a legnagyobb mélység 4).
→ **Pótolva 2026-08-17-én**, az `Ötven szintű mély lánc (síkidom próba)` ágon: 35
láncszem mélyre, 73 horgonyváltással; a söprés a világ-szintet elengedte, a tár 6-ra
esett. Lásd [fejlesztesi_terv.md](fejlesztesi_terv.md), „A MÉLY LÁNC MÉRÉSE".

---

## 4. A térkép nézet — ami tudható

### Az ős-térkép megvan

`E:\xampp\htdocs\csabi\Project_mappa\onlinedemocracy`

A legérettebb: **`static/js/world_map3.js`** (39 KB) + `templates/world_map3.html`.
D3 v7 + topojson, Mercator. Adatok ugyanott: `ne_50m_admin_0_countries.json`,
`ne_50m_admin_1_states_provinces.json`, `ne_50m_populated_places.json`,
`world_cities.json` (38 MB), GeoNames `allCountries.zip` (398 MB).

Átveendő mechanizmusok: háromszintű gyorsítótár (minimal/summary/detailed),
zoom-függő részletesség, `mergeThoughts` (közeli pontok összevonása),
`createPieChart` (kategória-eloszlás pontonként), látómező-vezérelt betöltés.

**A síkidom motorja fogalmilag ugyanaz** (küszöb-vezérelt letöltés, LOD,
látómező-nyesés) — nem két motort építünk, egy mintát alkalmazunk kétszer.

### A lyuk: a tartalomnak nincs helye

| | van-e lokációja ma |
|---|---|
| **e-ember** | igen: `lokacio { orszag, regio, telepules }` — kötelező, **három szabad szöveg, koordináta nélkül** |
| **tartalom** | **nincs, semmilyen** |
| `/api/lokacio/*` | csak legördülő javaslat a regisztrációs űrlaphoz |

Három út: (a) saját lokáció-mező a tartalmon; (b) **a hely a tudatpontból jön** —
egy tartalom ott van jelen, ahol a tudatpontot rendelő e-emberek élnek, tehát a
térkép azt mutatja, **hol van rá figyelem**; (c) vegyes.

**(b) a javasolt alap** (ez adja Csaba „egy ágazat lokális eloszlása" kérését),
három következménnyel:

1. **Adatvédelem.** Egyéni lokáció soha nem lehet visszafejthető. Csak aggregátum,
   **minimum-létszám küszöbbel** — kis településen különben kikövetkeztethető, ki
   mire rakott pontot. Ugyanaz a határ, amit a 2026-07-18-i audit a szavazatoknál húzott.
2. **Koordináták.** A három szabad szövegmezőt geokódolni kell, és a regisztrációs
   lokációnak **kontrollált törzsadattá** kell válnia („Bp"/„Budapest"/„budapest" ma
   három külön hely).
3. **Az összegzés backend-oldali**, indexelt előszámítással — mint az `osLanc` az ágnál.

---

## 5. Nyitott feladatok (sorrendben)

1. ~~**A lapozás lépcsőjének átkötése.**~~ ✅ **KÉSZ (2026-08-17, böngészőben igazolva).**
   A `_plafonLepcsoVisszafele` már nem a mért `utolsoKepSugar`-ból következtet, hanem az
   új `_gesztusSzorzo`-ból: a valódi nagyítási gesztusok (görgő, csippentés, +/− gomb)
   futó szorzatából, amit kizárólag a `_zoom` ír. `PLAFON_LEPCSO_BEKAPCSOLVA = true`.
   **Két hiba volt egy tünet mögött**: az átkötés mellé kellett a kérés-mód (`tovabbiKert`)
   javítása is, ami kifogyott szinten örökre nyitva maradt és némán elnyelte a lépcsőt.
   Részletek: [fejlesztesi_terv.md](fejlesztesi_terv.md), a „A LAPOZÁS LÉPCSŐJE A VALÓDI
   GESZTUSHOZ KÖTVE" szakasz.
2. ~~**A mély lánc mérése**~~ ✅ **KÉSZ (2026-08-17, Csaba böngészős mérése).** Az
   ős-söprés és a horgonyváltás először futott valódi munkamenetben. 35 láncszem
   mélyre, 73 horgonyváltással, 0 hibával; az ős-söprés a világ-szintet részfástul
   elengedte (4 939 csomópont / 5 099 adat → a tár 6-ra esett), és a mélyben a tár
   végig 15–40 csomópont volt. A visszaút nem halmozott. Részletek:
   [fejlesztesi_terv.md](fejlesztesi_terv.md), „A MÉLY LÁNC MÉRÉSE".
3. **A nagy átalakítás** (2. szakasz).
4. **Tömörítés bekapcsolása** a backenden (a legolcsóbb nagy nyereség).
5. **A cím/ikon szétválasztása** — csak mérés után.
6. A `window._debug_sikidom` fogantyú sorsa (mérésre kell, éles kódban kivezeti
   a nézet belsejét).

---

## 6. Egyéb, amit a kódbázis átnézése hozott

- A `CHANGELOG.md` **2026-08-01-nél megáll** — azóta 60+ commit.
- A `CLAUDE.md` frontend-szakasza **nem említi a Síkidom nézetet**, pedig ma az a
  legnagyobb frontend-terület.
- A **`megismeres/`** mappa (16 e-embereknek szóló használati leírás) **sehonnan
  nincs hivatkozva** — sem kódból, sem a README-ből. Eldöntendő: felületi súgó lesz-e.
- Az éles kép a mérés napján **13 committal** volt lemaradva.
