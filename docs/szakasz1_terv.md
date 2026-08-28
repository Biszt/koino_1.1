# Szakasz 1 — A HELYI KOINO (részletes terv)

*Készült: 2026. 08. 26. — a [Fázis 2 terv](fejlesztesi_terv_fazis2.md) lépés-sorrendjének
**1. szakasza**, a **D22** (P2P az első kiadástól) után. A kód helye:
[`../koino/`](../koino/). Az előmérés: [`../koino/meres/eredmenyek.md`](../koino/meres/eredmenyek.md).*

---

## Mit épít ez a szakasz — és mit nem

> ## ✅ A SZAKASZ 1 ELKÉSZÜLT (2026-08-27)
>
> Mind a 7 lépés kész, **90 önpróba fut zölden** (`node koino/meres/mind.js`), és a teljes
> kör végigjátszható. A vizsga lefutott:
>
> | Lépés a próbán | Eredmény |
> |---|---|
> | koino létrehozása | „Kispatak utcai szomszédok" |
> | tartalom + tudatpont | 111 bájt (D26), 100 pont |
> | szerkesztési javaslat | folyamatban, döntési idő **168 óra** |
> | egy támogató szavazat | bizonyosság 100% → a döntési idő **24 órára rövidült** |
> | idő +3 nap | **ELFOGADVA** |
> | **egyezmény** | megszületett, a pillanatképpel |
>
> A **döntési idő 168 → 24 óra rövidülése** a bizonyossági mutató (D4) működése élőben:
> minél egyértelműbb az eredmény, annál hamarabb zárul a döntés.

**Épít:** egy működő koinót **egyetlen készüléken, hálózat nélkül**. A végén egy ember
tartalmat hoz létre, tudatpontot rendez, javaslatot tesz, szavaz — és az egyezmény
megszületik. **Minden művelet aláírva**, az adat a készüléken.

**Nem épít:** hálózatot. Két készülék még nem talál egymásra — az a Szakasz 2.

**És szándékosan nem épít mást sem — ezt eddig nem mondtuk ki** *(pótolva 2026-08-28)*:

| Ami kimarad | Miért |
|---|---|
| **Az elfogadott szerkesztési javaslat VÉGREHAJTÁSA** (a cím tényleg megváltozzon) | A szakasz vizsgája az volt, hogy **az egyezmény megszülessen** aláírt eseményekből — nem az, hogy a koino végre is hajtsa. A D27 szerinti végrehajtás külön lépés: ahhoz a javaslat-számítás eredményének **vissza kell hatnia** az entitásra, ami új szerkezet, nem új szabály. |
| **Az érték javaslat felülete** | A küszöb-medián (D4) számítása kész és próbázott, de a fejlesztői nézetből nem hívható — a kártyák ezért „alapértelmezett" küszöböt mutatnak. |
| ~~**A szabályok kikényszerítése a SZÁMÍTÁSBAN**~~ | ✅ **Megépült** (2026-08-28, Csaba döntése: még a hálózat előtt) — lásd a 9. szakaszt. |

> **Miért van értelme egy magányos koinónak?** Mert minden más ezen áll. Ha az esemény-modell
> és az aláírás nem működik egy gépen, hálózaton sem fog. És mert **egyedül is
> kipróbálható**: nem kell hozzá se másik ember, se infrastruktúra.

---

## 1. Az ESEMÉNY — a program atomja

A prototípusban az adat **állapot**: egy tartalom-dokumentum, amit a szerver módosít. Itt az
adat **esemény**: *„én, ekkor, ezt tettem"* — aláírva. Az állapot ebből **számítódik** (D17).

### Egy esemény mezői

| Mező | Mi ez | Miért kell |
|---|---|---|
| `koino` | melyik koinóhoz tartozik | **D25**: egy ember több koinóban is tag lehet — az eseménynek tudnia kell, hol érvényes |
| `tipus` | mi történt (pl. `TartalomLetrehozas`) | ez dönti el, hogyan hat az állapotra |
| `szerzo` | a nyilvános kulcs (32 bájt) | **ez a személyazonosság** — nem név, nem fiók |
| `elozo` | az előző **saját** eseményem azonosítója | ez fűzi láncba a cselekedeteimet |
| `sorszam` | hányadik a saját láncomban | emberi olvashatóság + a lánc hézagai látszanak |
| `ido` | a szerző órája szerint | **tájékoztató, nem bizonyíték** — lásd a 6. pontot |
| `adat` | a művelet tartalma (típusfüggő) | |
| `azonosito` | a fentiek **hash-e** (SHA-256) | az esemény neve = a tartalma |
| `alairas` | a szerző aláírása az azonosítón (64 bájt) | **ez teszi hamisíthatatlanná** |

**Az entitást létrehozó és módosító események `adat` részében kötelező a MÉRET** (D26):
a tudatpont-hozzárendelés tárolási vállalás is, ezért **tudni kell, mit vállalsz, mielőtt
vállalod** — és ehhez a méretnek a *hivatkozásban* kell utaznia, nem csak a letöltött
tartalomban. A csatolt fájlok külön objektumok: a rájuk mutató hivatkozás hordozza a
**lenyomatukat és a méretüket**.

### Az azonosító = a tartalom lenyomata

Az esemény **neve a tartalmából származik** — pontosan úgy, ahogy a git nevezi el az
objektumait (lásd a fázis 2 terv „A git mint minta" szakaszát). Ennek három haszna van:

- két gép **ugyanarra az eseményre ugyanazt a nevet** adja → az összefésülés triviális;
- ha egy bájt megváltozik, **más lesz a neve** → a hamisítás nem rejthető el;
- a hivatkozás (pl. „erre a javaslatra szavaztam") **önmagát ellenőrzi**.

### ⚠️ A kanonikus alak — ahol a determinizmus eldől

A hash a bájtokból számítódik, tehát **ugyanannak az eseménynek mindig ugyanazokat a
bájtokat kell adnia**. A `JSON.stringify` erre önmagában **nem alkalmas**: a mezők
sorrendje a beszúrás sorrendjétől függ, a számok és az egyesített karakterek írásmódja
pedig eltérhet.

**Szabály:** az eseményt kanonikus alakra hozzuk a hash előtt — **rendezett mezőnevek,
egész számok, `NFC` szöveg-normalizálás, `undefined` mező nem szerepel.** Ez egyetlen
függvény lesz (`kanonikusAlak`), és **minden hash rajta megy keresztül**.

> Ez a legapróbb és legveszélyesebb részlet az egész szakaszban: ha elrontjuk, két gép
> ugyanarra az eseményre **két különböző nevet** ad, és soha nem fognak egyetérteni.
> Ezért kap saját, önmagában kipróbálható lépést (lásd a 7. pontot).

---

## 2. A SAJÁT LÁNC — miért nem kell globális egyetértés

Minden e-embernek **egy lánca** van: minden eseménye az előzőre mutat (`elozo`). Ez a D17
„saját lánc-következetesség"-e a gyakorlatban:

```
Csaba:   [1]───▶[2]───▶[3]───▶[4]
Anna:    [1]───▶[2]───▶[3]
```

**Amit ez megold, konszenzus nélkül:** a kettős cselekvés. Ha valaki két különböző
szavazatot ír alá ugyanarra a javaslatra, akkor vagy

- **ugyanazt a láncot folytatja** (2. szavazat felülírja az elsőt) → **ez megengedett**, a
  szavazat módosítható, ahogy ma is; vagy
- **kettéágazik** (két esemény ugyanazzal az `elozo`-vel) → **ez önellentmondás**, és
  **bizonyíték**: mindkét eseményt ő írta alá. Nem kell hozzá bíró — a két aláírás
  önmagában elég.

> **Ez a kulcsa annak, hogy a koino nem igényel globális konszenzust a mindennapokhoz**
> (D17). Nem megakadályozzuk a csalást, hanem **leleplezhetővé** tesszük.

---

## 3. Az ÁLLAPOTSZÁMÍTÁS — és a jó hír, hogy nem kell sorrend

Az állapot (mely tartalmak léteznek, kinek hány tudatpontja van hol, mi a szavazás állása)
**az eseményekből számítódik**. A kérdés, ami minden ilyen rendszert meg szokott fogni:
*milyen sorrendben?* — mert hálózaton az események összevissza érkeznek.

**A koino esetében ez a probléma nagyrészt eltűnik**, és ez nem szerencse, hanem a domain
tulajdonsága: **a műveletek túlnyomó része „e-emberenként az utolsó nyer" típusú.**

| Művelet | Ütközhet? | Miért nem |
|---|---|---|
| Tudatpont-rendezés | ❌ | (e-ember, entitás) párra **a saját láncod utolsója** érvényes — a sorszám dönt, nem a beérkezés |
| Szavazat | ❌ | ugyanígy: (e-ember, javaslat) párra az utolsó |
| Érték javaslat | ❌ | ugyanígy: (e-ember, entitás) párra az utolsó |
| Tartalom létrehozása | ❌ | egyszeri esemény, saját azonosítóval |
| Javaslat, egyezmény | ❌ | az eredmény **számítás** a szavazatokból (D17), nem külön állítás |

> **Vagyis nincs szükség globális sorrendre, és nincs szükség ütközés-feloldó könyvtárra
> (CRDT) sem.** Az „utolsó" mindig **a saját láncban** egyértelmű — és a saját láncot csak
> te írhatod.

**A számítás alakja:** `állapot = f(események halmaza)`. Egy tiszta függvény, ami rendezés
nélkül dolgozik: e-emberenként megkeresi az utolsó vonatkozó eseményt. **Ugyanaz a halmaz
mindig ugyanazt az állapotot adja** — ez a D17 determinizmusa.

**A gyorsítótár:** a számított állapotot **elmentjük** (különben minden indulás
újraszámolás), de a mérés szerint a teljes újraszámolás is olcsó: **10 000 esemény
ellenőrzése 0,58 mp**. Vagyis a gyorsítótár kényelem, nem szükséglet — bármikor
eldobható. *(A H6 `szamitott` rétege pontosan ez, 56 mezővel.)*

---

### ⚠️ Döntés az állapotszámításhoz: mi legyen az ELÁGAZÁS sorsa? (2026-08-27)

Ha valaki két különböző eseményt írt alá ugyanarról a pontról, az állapotnak **akkor is
determinisztikusnak kell lennie** — különben két gép két különböző eredményre jutna, és
épp az veszne el, amiért az egész épül.

**A megvalósított szabály: az azonosító szerint KISEBBET vesszük.**

| Miért nem zárjuk ki a csalót? | Mert az elágazás **nem mindig csalás**: ha valakinek két készüléke van, és mindkettő **offline** volt, természetes módon keletkezhet. A hang elvesztése aránytalan büntetés lenne egy hétköznapi helyzetért — és ez a helyzet a P2P-ben **gyakori** lesz. |
|---|---|
| **Miért jó így?** | Mindenki **ugyanazt** az állapotot számolja, tehát a csalásnak **nincs haszna**: nem lehet két embernek két különböző eredményt mutatni. |
| **És a felelősség?** | Az ellentmondás **látható marad** — a tár jelzi mentéskor, az állapot pedig felsorolja. **A koino bejelent, nem büntet** (D19). |

### ⚠️ Döntés a döntéshozatalhoz: MIKOR ZÁRUL a szavazás? (2026-08-28, Csaba jóváhagyásával)

A döntési idő a bizonyossági mutatóból számítódik, a bizonyosság a szavazatokból — a
szavazatok viszont a határidő UTÁN is megérkezhetnek. Ettől a határidő **visszamenőleg
mozgott**. Mérve: egy elvetett javaslat egy utólagos szavazattól **elfogadva** lett, majd
egy továbbitól újra elvetve. **Az egyezmény megszületett, aztán megszűnt létezni.**

**A megvalósított szabály:**

> A javaslatot érintő eseményeket **idő szerint** (azonos időnél **azonosító szerint**)
> sorba rendezzük, és lépésenként újraszámoljuk a határidőt az addigi állásból. Az első
> esemény, aminek az ideje **túl van** az akkor érvényes határidőn, **már nem számít
> bele** — és a lezárás ideje az a határidő.

| Melyik esemény tartozik ide? | **Mindegyik, ami a határidőt mozdítja** — nem csak a szavazat: · **szavazat** → a részvétel számlálója · **tudatpont-rendezés** az érintett entitáson → a nevezője (és **az aktív ↔ passzív váltás** is, mert azt is ez az esemény hordozza) · **érték javaslat** az érintett entitáson → a küszöbök, köztük a **min/max döntési idő**. *A tudatpontot az önpróba buktatta le (a szavazatot már kizártuk, de egy utólagos tudatpont-rendezés még mindig újranyitotta a döntést); az érték javaslatot és a szerep-váltást **Csaba vette észre** — mindkettő ugyanaz a lyuk volt.* |
|---|---|
| **Mit jelent ez a küszöbökre?** | A javaslatra azok a küszöbök érvényesek, amik a **lezárás pillanatáig** kialakultak (a tulajdonosok akkori mediánja, D4) — nem az entitás **mai** mediánja. A kártyán látható „mai" küszöb ettől eltérhet: az a jelenlegi állapot, nem az, ami a döntést eldöntötte. |
| **A visszadátumozás ellen** | A saját láncban az **idő legyen monoton**: ha egy nagyobb sorszámú eseményed korábbi időt visel, az **ellentmondás** — ugyanúgy, mint az elágazás, és ugyanúgy a saját aláírásoddal bizonyítva. |
| **⚠️ Mennyit ér ez?** | Csak a **saját előző eseményedhez** képest köt. Aki friss kulccsal jön (`sorszam: 1`), vagy régóta nem tett semmit, az szabadon visszadátumoz. **Drágítja a csalást, nem zárja ki** — a teljes válasz a kötegelés (D21, Szakasz 4). Ezt így kell számon tartani, hogy később ne higgyük megoldottnak. |
| **És ami NEM hiba** | Egy késve **megérkező**, de a határidőn belüli időbélyegű szavazat jogosan módosítja az eredményt. A követelmény nem az, hogy az eredmény soha ne változzon, hanem hogy **ugyanabból az eseményhalmazból mindenki ugyanazt kapja** (D17). |
| **És a felelősség?** | Az ellentmondás **látható marad**: a lezárás után érkezett szavazatok száma a javaslaton, a visszafelé lépő idő pedig az állapotsávon. **A koino bejelent, nem büntet** (D19). |

## 4. A TÁROLÁS — mi kerül a készülékre

A H6 besorolása közvetlenül megmondja ([`adat_osztalyozas.md`](adat_osztalyozas.md)):

| Réteg | Hova kerül a Szakasz 1-ben |
|---|---|
| `mag` + `lanc` + `tartalom` | **fájlban, aláírt eseményként** (D29 óta; korábban IndexedDB) |
| `szamitott` | **nem tároljuk igazságként** — újraszámolható gyorsítótár |
| `helyi` | a készüléken marad; nagy része **megszűnik** (jelszó, token: a kulcs hitelesít — D15) |

**A tár (D29 óta fájl, nem IndexedDB):**

1. **`koino-adat/<koino>/esemenyek.jsonl`** — soronként egy aláírt esemény. **Hozzáfűzhető,
   soha nem módosított** fájl: pontosan az, amit a modell megkövetel. Emberi szemmel is
   olvasható, és egy szövegszerkesztővel is menthető.
2. **`koino-adat/kulcs.json`** — a saját kulcspár (egy kulcs az egész belépő térben, D25).
3. **Gyorsítótár nincs**, és nem is hiányzik: a mérés szerint 10 000 esemény ellenőrzése
   0,58 mp, ezen a méreten a „töltsd be az egészet" a legegyszerűbb helyes megoldás.
   Amikor kevés lesz, a tár-illesztő mögött kicserélhető — a fölötte lévő rétegek
   érintése nélkül.

*A tárolónak szándékosan csak KÉT művelete van: `betolt()` és `hozzafuz()`. Nincs
„módosít" és nincs „töröl" — nem lustaságból, hanem mert a modell szerint nem is
létezhetnek.*

---

## 5. A KULCS — a legérzékenyebb pont

A böngészős korszakban ez volt a legkellemetlenebb tény: **a böngésző bármikor kiüríthette
a tárat** — a kulccsal együtt —, és a tartós tárolás kérése nem is teljesült. **A D29 ezt a
kockázatot megszüntette**: a kulcs egy közönséges fájl a gépeden, amit senki nem törölhet
magától. *(Ez a döntés egyik nem várt haszna volt.)*

**Ami viszont változatlanul kell:**

1. **A kulcs kimenthető** (`node koino/koino.js mentes <fájl>`), és a program az első
   indításkor **meg is mondja, hol a kulcs, és hogy mentsd el** — nem elrejtett haladó
   funkcióként.
2. **Őszinte szöveg:** *„ez a kulcs te vagy; ha elveszik, a koino-azonosságodat a közösség
   tudja visszaadni (D15), de az lassabb, mint egy mentés."*
3. **A kulcsfájl titkosítatlan.** Aki hozzáfér, a nevedben tud aláírni. Ez tudatos: a
   kulcsvesztés hétköznapi kockázat, a jelszó pedig egy újabb elveszíthető dolog lenne.

> A D15 (több tanús helyreállítás) így nem elméleti biztonsági háló, hanem **a Szakasz 3
> egyik indoka** — de addig is kell a mentés, mert az egy lépés.

---

## 6. AZ IDŐ — amit most még megúszunk

Az esemény `ido` mezője **a szerző órája** — hazudható, és P2P-ben nincs közös óra.
A Szakasz 1-ben ez **nem probléma**, mert egyetlen készülék van: az óra egyértelmű.

**Amit már most be kell tartani, hogy később ne fájjon:**

- az `ido` **tájékoztató adat**, soha nem bizonyíték;
- ami az `ido`-tól függene (pl. „lejárt-e a döntési idő"), az **számítás legyen**, ne tárolt
  állapot — hogy később kicserélhető legyen a szabálya;
- a saját láncban a `sorszam` adja a sorrendet, **nem az idő**.

*(A valódi megoldás a Szakasz 4–5-ben jön: kötegelés és köteg-gyökér — D21. A D16/D17
lassú döntési ablakai miatt ez nem sürgős.)*

---

## 7. A LÉPÉSEK — apró, külön-külön kipróbálható darabok

Minden lépés végén **legyen valami, ami megnézhető**. A sorrend a függőségeket követi.

| # | Lépés | Mi az eredménye | Hogyan próbáljuk ki |
|---|---|---|---|
| **1** ✅ | **Kulcs-réteg** — kulcspár létrehozása, tárolása, mentése | van azonosságod | `node koino/koino.js kulcs` — újraindítás után is ugyanaz |
| **2** ✅ | **Kanonikus alak + hash** | két azonos esemény **ugyanazt** az azonosítót kapja | [`kanonikusProba.js`](../koino/meres/kanonikusProba.js) — **14/14 rendben** |
| **3** ✅ | **Esemény-réteg** — aláírás, ellenőrzés | hamisíthatatlan esemény | [`esemenyProba.js`](../koino/meres/esemenyProba.js) — **13/13 rendben** |
| **4** ✅ | **Tár-réteg** — a saját lánc | az események megmaradnak | [`tarProba.js`](../koino/meres/tarProba.js) — **13/13 rendben**; a megmaradást a tár-objektum eldobása és a fájl újranyitása igazolja |
| **5** ✅ | **Állapot-réteg** — események → entitások | *„van egy tartalmam"* | [`allapotProba.js`](../koino/meres/allapotProba.js) — **16/16 rendben** |
| **6** ✅ | **A döntéshozatal** — javaslat, szavazat, és az **egyezmény mint számítás** | az egyezmény megszületik | [`javaslatProba.js`](../koino/meres/javaslatProba.js) — **22/22 rendben** |
| **7** ✅ | **A koino arca** — a kép a helyi adatból | végigjátszható magadnak | `node koino/koino.js` — **a teljes kör lefutott** *(a D29 előtt böngészőben, utána parancssorban)* |

> ⚠️ **A 6. és 7. lépés helyet cserélt** (2026-08-27, Csaba jóváhagyásával). Indok: a
> döntéshozatal logikája próbaoldalon **felület nélkül is végigjátszható**; fordított
> sorrendben viszont a felületet **kétszer** kellene megírni — egyszer a szűkebb modellre,
> aztán újra, amikor a javaslat és a szavazás is bekerül.

**A 7. lépés a szakasz vizsgája.** Ha az egyezmény megszületik pusztán aláírt eseményekből,
szerver nélkül — akkor a Fázis 2 gerince áll.

---

## 8. Mit ÖRÖKLÜNK a prototípusból (D22)

| Örökség | Hogyan |
|---|---|
| **Domain-logika**: küszöb-medián (D4), bizonyossági mutató, javaslat-életciklus, különválás | **átemelhető** — ezek tiszta számítások, nem függenek a szervertől. A `services/` mappa érdemi része. |
| **Felület**: kártyák, pakli, szövegszerkesztő, struktúra/síkidom nézet | **átemelhető** — vanilla JS, build nélkül, ahogy ma is |
| **Fogalmak és nevek**: e-ember, tudatpont, tartalom, javaslat, egyezmény | változatlan |
| **Konvenciók**: magyar nevek, fájl-fejléc komment, bőséges magyarázat | változatlan |

| Amit NEM viszünk | Miért |
|---|---|
| REST-végpontok, `controllers/`, `routes/` | nincs szerver |
| Mongoose-modellek, `repositories/` | nincs központi adatbázis |
| Bejelentkezés, jelszó, token | a kulcs hitelesít (D15) |
| **Az adat** | D24: új regisztráció lesz |

---

## 9. A SZABÁLY-RÉTEG — amit a SZÁMÍTÁS őriz (2026-08-28, Csaba jóváhagyásával)

> **Amit a számítás nem ellenőriz, az nem szabály, csak illemtan.**

A prototípusban a szerver volt a kapuőr. Itt nincs kapuőr — csak számítás. A két
domain-szabályt eddig **csak a felület** őrizte, a másik gép felülete viszont nem véd
semmitől. Mérve (2026-08-28), kézzel aláírt eseményekkel:

| Szabály | Mi történt a javítás előtt |
|---|---|
| „Csak az tehet javaslatot, aki tudatpontot rendelt a tartalomhoz" | Egy **teljesen idegen kulcs** javaslatot tehetett más tartalmára, megszavazhatta magának, és **az egyezmény megszületett** (1/1 = 100%). |
| „Mindenkinek ugyanannyi tudatpontja van" (keret: 10 000) | Kézzel aláírva **999 999 pont** is átment. |

**Ez nem két hiba volt, hanem egy hiányzó réteg** — ma a
[`js/allapot/szabalyok.js`](../koino/js/allapot/szabalyok.js), és az állapotszámítás
első lépése. Csaba döntése alapján **még a hálózat előtt** épült meg: két gép között ez
már valódi támadási felület, nem elméleti.

**Két alapelv, amin áll:**

1. **Nem törlünk és nem büntetünk.** A szabálysértő esemény a tárban marad, és a
   `kivetelek` listában megjelenik, indoklással. A koino **bejelent** (D19) — az esemény
   a szerző aláírásával van ellátva, tehát maga a **bizonyíték**: eldobni épp azt jelentené,
   hogy elveszítjük.
2. **A döntés a SAJÁT LÁNCBAN dől el, nem az órán.** A keret a szerző eseményeit sorszám
   szerint követi; a javaslat-jogosultság pedig azt nézi, volt-e a javaslattevőnek pontja
   az érintett tartalmon **a saját láncában a javaslat előtt**. Így nem hamisítható, és
   utólag nem írható át — ahogy a lezárási szabálynál is.

**Amit a keret helyesen NEM tilt:** az **átrendezést**. A tudatpont nem elkölthető, hanem
odarendelt — ha ugyanarra az entitásra teszel újra pontot, a régi felszabadul. A keret az
**összes kiosztott** pontra vonatkozik.

**Ami szándékosan kimaradt** *(a szabalyok.js végén is ott áll)*:

- **A szavazati jogosultság.** Ma bárki szavazhat, akinek van kulcsa — és ezt a Szakasz 1
  **nem is tudja jobban**: hogy egy kulcs mögött valódi, egyetlen ember áll, azt a bizalmi
  háló mondja meg (D1/D18, **Szakasz 3**). Addig egy kulcs-özön akárhány itteni szabályt
  megkerülne. Ez a réteg **határa**, nem feledékenység.
- **Az általános javaslat tágabb hatóköre** (D27: a jogosultság **lefelé** terjed, a
  leszármazottakra is). Ma mindkét fajtánál a szűkebb szabály fut; ez itt fog bővülni,
  egy helyen, amikor az általános javaslat felülete elkészül.

Próba: [`szabalyProba.js`](../koino/meres/szabalyProba.js) — **12/12 rendben**, végig
kézzel aláírt eseményekkel (vagyis pontosan úgy, ahogy egy rosszindulatú másik gép tenné).

### ⚠️ A RÉTEG ISMERT HATÁRAI — mit fog meg, és mit nem (2026-08-28, mérve)

*Csaba kérdésére: „egy nagy szakértelemmel bíró hacker tud több szavazatot leadni, vagy
átmenetileg irreális tudatpontot adni valamihez?"*

**Amit bizonyítottan megfog** *(nem „nehezen törhető", hanem matematikailag zárt)*:

| Támadás | Miért nem megy |
|---|---|
| más nevében aláírni | Ed25519 — 7 hamisítási próba (tartalom, szerző, idő, sorszám, azonosító, aláírás, idegen kulcs), mind bukik |
| **kétszer szavazni egy kulccsal** | láncfolytatásnál **felülírás** (1 szavazat); elágazásnál a számítás **determinisztikusan egyet vesz**, és az ellentmondást kiírja |
| keretet túllépő tudatpont | kizárva (mérve: 999 999 → nem számít) |
| idegen (0 pontos) javaslata | kizárva |
| határidő utáni szavazat / tudatpont / érték javaslat | nem számít bele |

**Három rés, amit NEM fog meg:**

1. **SOK KULCS (sybil).** Bárki generálhat ezret, és szavazhat ezerszer — ehhez nem kell
   szakértelem, csak egy ciklus. **Ez a Szakasz 1 tudatos határa**; a választ a bizalmi
   háló adja (D1/D18, **Szakasz 3**).

2. **SZELEKTÍV MUTOGATÁS — ⚠️ ez a réteg valódi rése, mérve 2026-08-28.** Ha valaki a
   SAJÁT láncából elrejt egy eseményt egyes gépek elől, azok nem tudják kiszámolni a
   keretét, és **átmegy nekik az irreális tudatpont**:

   ```
   TELJES lánc:    A: 10000 · B: NEM LÉTEZIK · kivétel: 1 (túllépné a keretet: 20000/10000)
   HIÁNYOS lánc:   B: 10000 · kivétel: 0        ← a #3 eseményt eltitkolta e gép elől
   → a két gép MÁST lát.
   ```

   **Nem a D17 determinizmusa sérül** (ugyanabból a halmazból ma is mindenki ugyanazt
   kapja) — a két gép **más halmazt** ismer. A csalás nyoma bennmarad: a láncban **hézag**
   keletkezik (sorszámok 1, 2, **4**), és amint a hiányzó esemény megérkezik, a kép magától
   helyreáll, a korábbi hamis kép pedig **bizonyítékká válik**. De ma **az állapot nem
   jelzi a hézagot** — van rá eszköz (`lancEllenorzese` a tár-rétegben), csak a számítás
   nem használja.

   **A javasolt irány (Csaba jóváhagyta, hogy a Szakasz 2-ben döntsük el):** a szabály-réteg
   legyen **óvatos** — ha a szerző láncában hézag van a vizsgált esemény ELŐTT, a keret nem
   ellenőrizhető, tehát ne fogadjuk el csendben, hanem jelezzük (*„ezt nem tudjuk
   igazolni"*, D19). ⚠️ **Ára van, és előre látni kell:** hálózaton a hézag **normális**
   átmeneti állapot, tehát a választás nem „biztonságos vs. nem", hanem **melyik hibát
   vállaljuk**:

   | Ma | Ha óvatosak leszünk |
   |---|---|
   | a hiányos tudású gép **elhiszi** az igazolhatatlant | a hiányos tudású gép **nem számolja** az igazolhatatlant |
   | a csalás átmenetileg működik | a becsületes ember eseménye átmenetileg nem látszik |

   *Azért tartozik a Szakasz 2-re, mert a válasz attól függ, milyen gyorsan érnek körbe az
   események — és azt előbb meg kell mérni.*

3. **VISSZADÁTUMOZÁS FRISS KULCCSAL.** Az idő-monotonitás csak a saját előző eseményhez
   képest köt; a teljes válasz a kötegelés (D21, Szakasz 4).

> **A minta mindhárom résnél ugyanaz:** a koino nem a MEGAKADÁLYOZÁSRA épül, hanem a
> LELEPLEZHETŐSÉGRE. Amit a támadó tesz, azt **aláírva** teszi — tehát bizonyíték marad
> utána. A védelem három lábon áll: kriptográfia (hamisíthatatlanság) · determinisztikus
> számítás (ugyanabból a halmazból nem lehet két embernek két eredményt mutatni) · és a
> bizalmi háló (hogy a kulcsok mögött emberek legyenek).

## 10. Nyitott kérdések — ezekre a kódolás előtt kell válasz

1. ✅ **EGY KULCS A BELÉPŐ TÉRBEN** *(Csaba, 2026-08-26)*. A D25-ből következik: ha az
   azonosság és a tanúsítások közösek a térben, akkor **egy kulcs viszi át mindet** —
   különben nem lenne mit „átvinni". A **megjelenített név** viszont koinónként külön
   lehet. *Vállalt ára: ugyanaz a kulcs azonosít mindenhol, tehát összeköthető, ki hol
   tag.*
2. ✅ **A PRIVÁT KULCS KIMENTHETŐ, ÉS A PROGRAM KÉRI IS A MENTÉST** *(Csaba, 2026-08-26)*.
   Indok: a mérés szerint a böngésző kiürítheti a tárat, tehát a kulcsvesztés **valós,
   hétköznapi** kockázat; a mentés egy kattintás, a D15 több-tanús helyreállítása lassabb.
   *Vállalt ára: egy rosszindulatú kód elvileg ellophatná a mentett fájlt.*
3. **Mi az esemény-típusok első köre?** Javaslat a legszűkebb, ami a 7. lépéshez elég:
   `TartalomLetrehozas`, `TudatpontRendezes`, `ErtekJavaslat`, `JavaslatLetrehozas`,
   `Szavazat`. *(Kategória és tartalomtípus később — azok is „tartalom" típusúak.)*
4. **Hogyan születik meg maga a koino?** A D25 szerint a koino entitás a térben. A Szakasz
   1-ben elég egy `KoinoLetrehozas` esemény — de a mezőit a D25 alapján kell kitalálni
   (név, paraméterek, belépési szabály, hitelesítési küszöb).

---

## Napló

- **2026-08-28 (a szál vége)** — **A SZABÁLY-RÉTEG HATÁRAINAK VÉGIGMÉRÉSE.** Csaba
  kérdésére („tud-e egy hacker több szavazatot leadni, vagy átmenetileg irreális
  tudatpontot adni?") végigmértük a támadási felületet. A zárt részek zártak — de a
  mérés **egy valódi rést talált: a szelektív mutogatást** (a saját láncból eltitkolt
  esemény miatt a hiányos tudású gép elfogadja a keret-túllépést). Felírva a 9. szakasz
  „ismert határai" közé; a döntés a Szakasz 2-re marad, mert a válasz attól függ, milyen
  gyorsan érnek körbe az események.

- **2026-08-28 (este)** — **D29: KIKÖLTÖZÉS A BÖNGÉSZŐBŐL.** Csaba: *„hagyjuk is el a
  böngészős részt, mert csak bezavar. A tiszta P2P kapcsolatra koncentráljunk."* A Szakasz 2
  tervezése közben derült ki, hogy **minden akadály böngésző-korlát volt**, és a döntő az,
  hogy egy lap **nem tud fogadni kapcsolatot** — ezért kell neki jelzőpont, STUN és
  továbbító. Mérve: a koino **magja már ekkor is futott Node alatt, változtatás nélkül**
  (kanonikus alak, Ed25519 aláírás+ellenőrzés, szabályok, állapot, döntéshozatal); a
  böngésző-függés a **tárban** volt.
  **Ami átalakult:** a tár → hozzáfűzhető fájl (`fajlTar.js`), a tároló a lánc-kezelésbe
  **kívülről** megy be (nincs két másolat) · a kulcs → fájl (és ezzel megszűnt a
  „böngésző kiüríti a tárat" kockázat) · a fejlesztői nézet → **parancssori arc**
  (`koino/koino.js`) · a hat próbaoldal → **hat Node-fájl + `mind.js`**, 90 próbával.
  Törölve: `index.html`, `css/fo.css`, `js/fo.js`, `fejlesztoiSzerver.js`,
  `js/tar/adatbazis.js`, a `meres/*.html` lapok. *(A git történetében megmaradnak.)*

- **2026-08-28** — **Átnézés és három javítás.** Egy teljes átolvasás (majd egy második
  session ellenőrzése) három olyan hibát talált, amelyek a Szakasz 2-ben két gép közti
  nézeteltéréshez vezettek volna:
  1. **A lezárt döntés visszafordult** egy késői szavazattól → megvan a lezárási szabály
     (fentebb, a 3. pont után), Csaba jóváhagyásával. A szabály **három** esemény-fajtára
     terjedt ki, két lépésben: az önpróba írása közben derült ki, hogy a
     **tudatpont-rendezés** ugyanígy újranyitotta a döntést, Csaba pedig rákérdezett az
     **érték javaslatra** és a **passzív ↔ aktív váltásra** — az előbbi ugyanaz a lyuk
     volt (az érték javaslat a min/max döntési időt is átírja), az utóbbi már benne volt.
     *Tanulság: nem a szavazatot kellett időhöz kötni, hanem MINDENT, ami a határidőt
     mozdítja.*
  2. **Az elágazás sorrend-függő döntést adott**: a döntéshozatal a NYERS eseményeket
     kapta, ezért a kettős szavazatnál a tömb sorrendje döntött (mérve: „támogat,
     ellenez" → elfogadva, fordítva → elvetve). Az elágazás-feloldás mostantól **egy
     forrásból** jön (`allapot.ervenyesek`).
  3. **Idő-monotonitás** a saját láncban: a visszafelé lépő idő ellentmondás — bejelentve,
     nem büntetve (D19).
  A szakasz „mit NEM épít" listája kiegészült azzal, ami eddig kimondatlanul maradt (a
  végrehajtás, az érték javaslat felülete), és külön szakaszt kapott az, hogy a
  **domain-szabályokat ma a felület őrzi, nem a számítás** (9. pont).
  **Ugyanaznap, Csaba döntése alapján ez a réteg meg is épült** — még a hálózat előtt,
  mert két gép között valódi támadási felület: `js/allapot/szabalyok.js`, 12/12 önpróbával.

- **2026-08-26** — A terv létrejött, az előmérés után (Ed25519 natív, 0,058 ms/ellenőrzés,
  IndexedDB 2,5 GB, WebRTC elérhető). A legfontosabb szerkezeti felismerés: **a koino
  műveletei „e-emberenként az utolsó nyer" típusúak**, ezért az állapotszámításhoz **nem
  kell globális sorrend és nem kell ütközés-feloldó könyvtár** — az „utolsó" a saját
  láncban mindig egyértelmű. A legveszélyesebb részlet: **a kanonikus alak** (ha két gép
  ugyanarra az eseményre más hasht ad, soha nem értenek egyet) — külön lépést kapott.
