# Terepmérés két valódi mobillal — forgatókönyv

*Készült: 2026-09-21. Az [elérhetőség tervének](elerhetoseg_terv.md) **5/4. lépése**: az
utolsó nyitott kérdés, amit eddig csak modellben (35.) és egy gépen (37.) mértünk.*

> ⚠️ **Ezt a mérést Csaba futtatja.** Két valódi telefon kell hozzá, és fizikailag hálózatot
> kell váltani. A program minden darabja készen áll; ez a lap azt mondja meg, **mit kell
> begépelni, mit fogsz látni, és mit jelentenek a számok.**

---

## 0. A MÁSODIK NEKIFUTÁS — olvasd el ezt először (2026-09-22)

⭐ A **39. mérés fele sikerült**: a tábla-út végigment (az elvitt telefon magától kiírta az új
címét, a maradó magától kiolvasta, 30 másodperc alatt), ⛔ **de a rés nem nyílt meg, és nem
tudtuk megmondani, miért** — mert *„az »A« telefon naplójához megszűnt a hozzáférés"*.
**Egy mérés, aminek a döntő fele hiányzik, nem ad választ.**

### ⛔⛔ EZÉRT AZ ELSŐ SZABÁLY: A NAPLÓ FÁJLBA MEGY, MINDKÉT TELEFONON

Az őrjáratot **így** indítsd — a `tee` egyszerre írja a képernyőre és a fájlba:

```bash
node koino/koino.js orjarat 1 2>&1 | tee ~/orjarat-A.log
```

*(A másik telefonon értelemszerűen `~/orjarat-B.log`.)*

⭐ **Ez a mérés legfontosabb sora.** A döntő kérdés — *kiolvassa-e a TÁVOZÓ is a tábláról a
maradó címét?* — csak a **két napló egymás mellé téve** válaszolható meg, és a képernyőn
görgő szöveg a mérés végére elvész. ⚠️ Ha a `tee` bármiért nem megy, a mérés akkor is
futtatható — de akkor **fényképezd le** a döntő sorokat, ahogy megjelennek.

A naplók utólag megnézhetők, és a telefonról átküldhetők:

```bash
grep -E "tábl|rés|kopog|csere" ~/orjarat-A.log
```

### ⭐⭐ A MÁSODIK ÚJDONSÁG: MOST HÁROM KÉRDÉSRE IS FELELHET

Ha **mindkét telefon mobilneten** van, ez a mérés egyszerre három nyitott pontot zár le:

1. **A 39. mérés megismétlése** — a tábla-út *mindkét* oldalról, naplóval.
2. **A 32. mérés nyitott pontja** — *nyílik-e rés két mobil NAT között?* (eddig csak
   otthoni ↔ mobil párost mértünk).
3. ⭐ **A 2026-09-22-i NAT-javítás bekötése** — ezt hurok-címen **nem lehetett megmérni**,
   mert ott a saját gép címe amúgy is kiesik. Valódi CGNAT kell hozzá.

⛔⛔ **DE A 0. SZAKASZ KÖZÖS WIFIT KÍVÁN, és ez mobilneten nem megy.** Két eset van:

- ⭐ **Ha ugyanaz a két telefon, mint 2026-09-21-én:** a kötés **megmaradt a lemezükön**
  (`kotesek.json`), tehát a 0. szakasz **kihagyható** — ellenőrizd a `tabla` paranccsal, és
  ha kötést ír, indulhatsz rögtön az 1. szakasszal.
- ⚠️ **Ha friss készülék van köztük:** előbb kell egy **közös wifi** az ismerkedéshez (0.
  szakasz), és csak utána a váltás. *A kézi `tars` út itt nem segít: CGNAT mögé nem lehet
  csak úgy bekopogni — épp ez az egész mérés tárgya.*

### 🔍 ÉS EGY MÉRÉS, AMI EGY PERC: UGYANAZT A KÜLSŐ CÍMET KAPTÁK?

**A váltás után, mindkét telefonon** — ⛔ **egy MÁSIK helyi porttal**, egy harmadik ablakban:

```bash
node koino/koino.js kulsoport 7400
```

⛔⛔ **A `7400` nem elírás, és ne hagyd el.** Az őrjárat a `7373`-at használja, a mérés pedig
`reuseAddr`-rel ugyanarra a portra ülne — ⚠️ a két foglalat **elveheti egymás csomagjait**,
és a 32. mérés szerint egy újabb foglalat **más külső portot** is kaphat, ami épp a futó rést
zavarná meg. ⭐ *Nekünk viszont nem a port kell, hanem a **CÍM** — az minden porton ugyanaz.*

Írd fel a **két külső címet** (a `KÍVÜLRŐL ÍGY LÁTSZOL` sor első fele). ⭐ Ha a cím
**megegyezik** (a port úgyis más lesz), akkor a két telefon **ugyanazon a szolgáltatói
NAT-on (CGNAT) van** — és ez ma már nem csak érdekesség:

- ⛔ A tegnapi programban ilyenkor a két telefon **kiszűrte volna egymást** („ez a saját
  címem"), és a cserén tanult cím sosem került volna a listára. **Ma nem szűri ki** — ez a
  2026-09-22-i javítás, és élesben itt derül ki, hogy tényleg működik-e.
- ⭐ Ilyenkor a rés-nyitás a **hairpinning** kérdése is: át tud-e fordulni a szolgáltató
  NAT-ja saját maga felé. *Erre eddig nem volt adatunk, mert meg sem próbáltuk.*

⚠️ Ha a két külső cím **különbözik**, az is eredmény — akkor a mérés a „két mobil NAT" tiszta
esetét méri, javítás-függetlenül.

---

## 1. A kérdés, egy mondatban

**Ha két telefon összeismerkedett, majd az egyik hálózatot vált, visszatalálnak-e egymáshoz
— kézzel beírt cím nélkül?**

⭐ **A siker mércéje nem egy felirat, hanem egy TETT:** a váltás után az egyik telefonon
létrehozol egy gondolatot, és az **magától megjelenik** a másikon. *Ha csak a „megtaláltam"
sort látjuk, de a hír nem megy át, a mérés nem sikerült.*

---

## 2. Miért kell a 0. szakasz — a tábla nem a semmiből dolgozik

⛔ **A hirdetőtábla TÁRSANKÉNTI rekeszekbe ír**, és a rekeszt a társ **tábla-kulcsa** nevezi
meg. Vagyis **előbb ismerniük kell egymást**: kötés nélkül nincs kinek kiírni, és nincs kit
keresni. *Ez nem hiányosság, hanem a D6: a tábla nem hirdetőoszlop, hanem levélszekrény-sor.*

Ezért a mérés **közös wifin kezdődik**, és csak utána jön a váltás.

---

## 3. Előkészület (egyszeri)

Mindkét telefonon fusson a koino — a telepítés lépésről lépésre:
[`telepites_telefon.md`](telepites_telefon.md).

Ellenőrzés mindkét készüléken:

```bash
node koino/koino.js kulcs
```

Ha kiírja, ki vagy és hol az adatod, kész. *(A két telefonnak **külön** azonossága van —
ez így helyes.)*

---

## 4. A mérés, szakaszonként

### 0. szakasz — ISMERKEDÉS közös wifin *(~5 perc)*

Mindkét telefon **ugyanarra a wifire**. Az **A** telefonon:

```bash
node koino/koino.js koino "Terepmeres"
```

A **B** telefonon keresd meg az A-t (ez a „kurbli", ez marad kézi):

```bash
node koino/koino.js felfedez 5
```

**Amit látni fogsz, ha sikerült:** `⭐ 1 készüléket találtam … + 1 új társ a listán`.

⚠️ **Ha nem talál senkit:** a wifi tilthatja a készülékek közti forgalmat (vendéghálózat,
„AP isolation"). A parancs ki is írja ezt. Ilyenkor a kézi út marad: az A telefonon
`node koino/koino.js cimek`, és a B-n `node koino/koino.js tars <cím> 7373`.

Most **mindkét telefonon** indítsd el az őrjáratot, és hagyd futni — ⛔ **naplóval együtt**
(lásd a 0. szakaszt: a 39. mérés épp ezen bukott el):

```bash
node koino/koino.js orjarat 1 2>&1 | tee ~/orjarat-A.log
```

*(1 perces ablak — a mérés alatt jobb, mint az 5 perces alapérték: nem kell annyit várni.
A másik telefonon `~/orjarat-B.log` legyen a fájl neve.)*

**Amit látni fogsz, ha sikerült — ez a 0. szakasz vizsgája:**

- `✓ … 1/1 társ — N új esemény`
- `· … 1 társsal van kötésem (a tábla-kulcsuk alatt)`
- és előbb-utóbb `⭐ … rés nyílt: …` — *ez azt jelenti, hogy a UDP-út is él.*

Ellenőrizd a kötést külön is (egy harmadik ablakban, vagy állítsd le rövid időre az őrjáratot):

```bash
node koino/koino.js tabla
```

⛔ **Ha itt `0 kötés a jegyzékben` áll, ÁLLJ MEG.** Enélkül a mérés többi része tárgytalan —
nincs rekesz, amibe írni lehetne.

### 1. szakasz — A VÁLTÁS *(~1 perc)*

A **B** telefonon: **kapcsold ki a wifit, és kapcsold be a mobil adatot.** Az őrjárat
fusson tovább (ne állítsd le).

⭐ Ettől a pillanattól a B külső címe más — és az A a régit ismeri.

### 2. szakasz — A VISSZATALÁLÁS *(~5-10 perc)*

Most nem kell semmit gépelni. **Nézd a két képernyőt**, és jegyezd fel, mi jelenik meg.

**A B telefonon (aki elment) ezt várjuk:**

```
⭐ … az új címemet kiírtam a táblára (1 társ rekeszébe, N tároló)
```

⚠️ Írd fel az **N**-et (hány DHT-gép tárolta el). A 37. mérésen 8 volt. ⛔ **Ha N = 0**, a
kiírás nem sikerült — és ma a program ezt **nem próbálja újra**, amíg a cím megint meg nem
változik *(ismert, nyitott kérdés — épp ez a mérés hivatott eldönteni, kell-e ellene szabály)*.

**Az A telefonon (aki maradt) ezt várjuk:**

```
⭐ … a táblán megvan egy néma társ új címe: <cím>:<port> (az ő órája szerint N perce írta ki)
⭐ … rés nyílt: <cím>:<port> (… ms)
✓ … csere a résen …
```

### 3. szakasz — A DÖNTŐ PRÓBA *(~2 perc)*

⭐ **Ez dönti el a mérést**, nem a fenti feliratok. A **B** telefonon (mobil adaton):

```bash
node koino/koino.js gondolat "Atjott a valtas utan"
```

Majd az **A** telefonon, egy-két ablak elteltével:

```bash
node koino/koino.js
```

✅ **SIKER**, ha a gondolat ott van — *és közben egyetlen címet sem gépeltél be.*

---

## 5. Mit írj fel (ez kerül az `eredmenyek.md`-be)

| Amit mérünk | Miért ez |
|---|---|
| A **szolgáltató** neve mindkét telefonon | a NAT viselkedése szolgáltatónként más (36/d) |
| ⭐ **A két külső cím** (`kulsoport` a váltás után) | egyezik → közös CGNAT, és él a 2026-09-22-i javítás meg a hairpinning kérdése |
| Hány **tároló** vette át a tábla-bejegyzést (`N tároló`) | ez a tábla erőssége; 0 = néma bukás |
| **Mennyi idő** telt a váltástól az `A` gép „megvan a táblán" soráig | a 35. modell 5 perces ablakkal számolt |
| ⛔⛔ **Kiolvasta-e a TÁVOZÓ is a tábláról a maradó címét** | *ez a 39. mérés hiányzó fele* — a B naplójában kell keresni |
| Hány **kopogás** után nyílt a rés (`… ms`) | a 17. mérés 190 ms-ot, a 19. 76-ot mért |
| Átment-e a **gondolat** (3. szakasz) | ez a valódi siker |
| Bármi, ami **nem** a fenti sorok közül jött | a meglepetés a legértékesebb adat |

⭐ **És a végén mentsd el a két naplót** (`~/orjarat-A.log`, `~/orjarat-B.log`) — az
`eredmenyek.md`-be a döntő sorok szó szerint kerülnek be, ahogy a 39. mérésnél is.

---

## 6. Ismert csapdák — ezekre a napló szerint már ment el idő

- ⛔ **A portszám futásonként MÁS lehet.** A 19. mérésnél tizenöt próbálkozás ment a **régi**
  számra. ⭐ Ebben a mérésben ez nem gond, mert a címet **nem kézzel adjuk át** — épp ez a
  tárgya. *De ha kézi `tars`-ra kényszerülsz, mindig frissen kérdezd meg.*
- ⛔ **A fúrót nem szabad újraindítgatni** (32. mérés): a telefon ugyanarról a helyi portról
  futásonként más külső portot kapott. Hagyd futni az őrjáratot.
- ⚠️ **A telefon elalvása** megakasztja az őrjáratot. Tartsd ébren a képernyőt mindkét
  készüléken a mérés idejére.
- ⚠️ **A DHT-belépők korlátozhatnak** (36. mérés: 5 körből 2 elakadt rajtuk). Ha a tábla
  egyáltalán nem megy, ez a leggyanúsabb — a készülék a saját emlékezetéből indulna, de egy
  friss telepítésnek még nincs emlékezete.
- ⚠️ **Ugyanaz a koino kell.** Ha a 0. szakasz cseréje megy, ez bizonyított; ha „MÁSIK koino"
  üzenetet látsz, ott állj meg.

---

## 7. Mit jelent, ha NEM sikerül — a bukás is eredmény

⭐ *A mérésnek akkor is van hozama, ha nemet mond* — csak tudni kell, melyik nem:

- **A B nem tudta kiírni** (nincs „kiírtam a táblára" sor) → nem ismerte meg a saját új külső
  címét. *A kopogás és a tükör kérdése, nem a tábláé.*
- **Kiírta, de `0 tároló`** → a DHT nem vette át. *A tábla hordozójának kérdése (2. szabály:
  cserélhető).*
- **Az A nem találta a táblán** → a rekesz-számítás vagy az olvasás ideje. *Írd fel, hány
  ablakot várt.*
- **Megtalálta, de a rés nem nyílt** → a két mobil NAT egymás közt (ez a 32. mérés nyitva
  hagyott kérdése: **két mobil készülék egymás között**).
  ⛔⛔ **ÉS ITT A NAPLÓ DÖNT, NEM A TÜNET** — a 39. mérésen pont ez maradt eldöntetlenül. Két
  magyarázat van, és **kívülről ugyanúgy néznek ki**:
  *(1)* a másik fél **nem kopogott vissza** (nem olvasta ki a tábláról a friss címet, tehát
  a régire kopogott) — ez **program-kérdés**, javítható;
  *(2)* a két mobil NAT **elvi okból** nem tud egymásba fúrni — ez **fal**, és akkor a
  kötés-hálónak más utat kell találnia.
  ⭐ A kettőt **csak a TÁVOZÓ naplója** választja szét: keresd benne a *„a táblán megvan egy
  néma társ új címe"* sort. Ha ott van, és a rés mégsem nyílt → **(2)**, negatív eredménnyel.
  Ha nincs ott → **(1)**, és van mit javítani.
- ⭐ **Ha a két külső cím EGYEZETT, és a társ mégsem került a listára** → a 2026-09-22-i
  javítás nem ért el az éles útig. *Ez az egyetlen pont, amit hurok-címen nem tudtunk
  próbával lefedni — itt derül ki.*
- **A rés megnyílt, de a gondolat nem ment át** → ez lenne a legmeglepőbb, és a csere
  rétegéé, nem az elérhetőségé.
