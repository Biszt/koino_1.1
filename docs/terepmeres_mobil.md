# Terepmérés két valódi mobillal — forgatókönyv

*Készült: 2026-09-21. Az [elérhetőség tervének](elerhetoseg_terv.md) **5/4. lépése**: az
utolsó nyitott kérdés, amit eddig csak modellben (35.) és egy gépen (37.) mértünk.*

> ⚠️ **Ezt a mérést Csaba futtatja.** Két valódi telefon kell hozzá, és fizikailag hálózatot
> kell váltani. A program minden darabja készen áll; ez a lap azt mondja meg, **mit kell
> begépelni, mit fogsz látni, és mit jelentenek a számok.**

---

## ⭐ A D69/2 UTÁN — olvasd el ezt MINDENEK ELŐTT (2026-09-26)

⛔ **2026-09-26 óta nincs TCP a készülékek között** (D69/2): az őrjárat, a postaláda (`figyel`)
és a kézi parancsok (`csere`, `hozd`, `tukor`) is az **állandó UDP-kapun** mennek. Ami ebből a
mérésre tartozik:

- ⛔ **Minden készüléken ugyanaz a friss `main` kell** — a régi (TCP-s) koino **nem beszél** az
  újjal. A frissítés egy sor (lent, és a [`telepites_telefon.md`](telepites_telefon.md)-ben).
- ⭐ **A társ-lista tiszta lappal indul** (`indulocimek.json`): a `tarsak` parancs **üres** —
  ez rendben van, a régi `tarsak.json`-t semmi nem olvassa. Az induló címet **újra fel kell
  venni** (`tars`, vagy a wifin `felfedez`). ⭐ **A kötések viszont megmaradtak**
  (`kotesek.json`, a `tabla` paranccsal nézhető) — a két telefon ismerős társként ismeri fel
  egymást.
- ⭐ **A kör összegző sora új:** `✓ HH:MM:SS N/M társ — X új esemény[, K menet]` — a `K menet`
  az **ismételt menet** (ha egy menet újdonságot hozott, az ablakon belül újra kopog). Ha nincs
  kire kopognia: `nincs kire kopognom … — csak a kaput tartom nyitva`.
- ⭐ **Írd fel a kör hosszát is:** két egymás utáni kör-sor időbélyegének különbsége az ablakon
  belül. *A 41. mérés 90–97 mp-es köre halott TCP-címekből jött — most nincs TCP-kör, a kopogás
  legfeljebb 6 mp, csak a tábla-olvasás (~20 mp néma kötésenként) nyújthatja meg.*
- ⏸️ **Kimondott feltevés (Csaba):** két cél-függő NAT között (két mobil szolgáltató) a
  pajzsfúrás nehéz lehet — **nem mértük**. A 🅱️ változat ezt dönti el.

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

### ⭐⭐ KÉT VÁLTOZAT — ÉS MELYIK MIRE FELEL (2026-09-24)

| Kérdés | 🅰️ telefon + laptop (lent, **0/b.**) | 🅱️ két mobil |
|---|---|---|
| **1.** A program hibája? *(kiolvassa-e a TÁVOZÓ is a táblát, visszakopog-e, átmegy-e a gondolat)* | ✅ **ez felel rá a legtisztábban** | ✅ |
| **2.** Nyílik-e rés **két mobil NAT** között? *(a 32. mérés nyitott pontja)* | ❌ | ✅ **csak ez** |
| **3.** Él-e a 2026-09-22-i NAT-javítás? *(közös külső cím, más port)* | ✅ a hotspotos lépéssel | ✅ ha a két telefon közös CGNAT-on van |

⭐ **Ha mindkettőre van idő: előbb az 🅰️, aztán a 🅱️.** Az 🅰️ az **ismerten működő
párost** használja (otthoni router ↔ mobil: a 32. mérésen 1 kopogás, 190 ms) — ⛔ *ha ott
nem nyílik a rés, az szinte biztosan PROGRAM-hiba, nem fal.* Ha ott minden átmegy, a 🅱️
bukása már **csak** a két mobil NAT-ról szólhat.

⛔⛔ **MINDKÉT VÁLTOZAT ELŐTT: minden készüléken ugyanaz a friss `main`.** A 39. mérés
telefonjai a `5e832b8`-at futtatták — abban **még nincs benne** a 2026-09-22-i NAT-javítás.
A telefonon a frissítés egy sor ([`telepites_telefon.md`](telepites_telefon.md), „HA MÁR FENT
VAN"), és a kötés **megmarad** (az adat a program mappáján kívül van):

```bash
cd ~/koino_1.1 && git fetch --depth 1 origin main && git reset --hard origin/main && node koino/meres/mind.js
```

✅ Ha a vége `✅ Mind a … próba rendben`, mehet.

### 🅱️ A KÉT MOBILOS VÁLTOZAT: HÁROM KÉRDÉSRE IS FELELHET

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

## 0/b. 🅰️ A TELEFON + LAPTOP VÁLTOZAT (2026-09-24)

*Egy mobilnetes telefon és a laptop. A telefon a **távozó** (ő vált hálózatot), a laptop a
**maradó** (otthon marad, az otthoni routeren).*

### A laptopon: Git Bash, a `C:\koino_1.1` mappában

⚠️ **Git Bash-t használj, ne PowerShellt** — a `tee` ott ugyanúgy működik, mint a telefonon,
és a napló sima szövegfájl lesz. *(A PowerShell 5.1 a `2>&1`-et hibasorokba csomagolja, a
`Tee-Object` pedig UTF-16-ot ír — a napló utólag nehezen kereshető.)*

```bash
cd /c/koino_1.1
```

⚠️ **Ha a Windows tűzfal-kérdéssel ugrik fel** („Engedélyezi a Node.js-t…?"), engedélyezd.
*(A `szakasz2_terv.md` szerint a `node.exe` bejövő szabálya már megvan — de egy frissített
Node új kérdést hozhat.)*

### A0. Előkészület a laptopon — egyszeri, 1 perc

⭐ **2026-09-26 óta tiszta lap** (D69/2): a `tarsak` parancs üres listát mutat, a régi
próba-maradékok (a két `127.0.0.1`-es cím) a régi `tarsak.json`-ban maradtak, amit semmi nem
olvas. Nincs mit takarítani — csak nézd meg, és hogy a kötés megvan-e:

```bash
node koino/koino.js tarsak
node koino/koino.js tabla
```

### A1. Ismerkedés az otthoni wifin — ~5 perc

⛔ **Ez itt KELL** (a laptopnak még nincs kötése a telefonnal). Mindkettő az **otthoni
wifin**. A laptopon kérdezd meg a helyi címet:

```bash
node koino/koino.js cimek
```

A `192.168.…` kezdetűt írd fel. A **telefonon** vedd fel társnak *(a `felfedez` a 39.
mérésen csak önmagát találta — a kézi út biztosabb)*:

```bash
node koino/koino.js tars <a laptop 192.168-as címe> 7373
```

Most **mindkettőn** indítsd az őrjáratot, **naplóval**:

```bash
node koino/koino.js orjarat 1 2>&1 | tee ~/orjarat-L.log      # a laptopon
node koino/koino.js orjarat 1 2>&1 | tee ~/orjarat-T.log      # a telefonon
```

✅ **A vizsga:** mindkét naplóban megjelenik a `csere a résen <a másik címe>` sor és a
`kiírtam a táblára` is (ekkor tudja meg mindkettő a saját külső címét) — ⭐ és egy **harmadik
ablakban** a `node koino/koino.js tabla` **mindkét** készüléken mutatja a kötést, a másik fél
címével. *(A D69/2 óta a kör végén nincs külön „N társsal van kötésem" sor — a `tabla` mondja
meg.)* ⛔ Ha kötés nincs, **állj meg** — a tábla nem tud mit kiírni.

### A2. A váltás — a TELEFON megy mobilnetre

A **telefonon**: wifi KI, mobil adat BE. Az őrjárat fusson tovább (**ne indítsd újra** —
32. mérés: új foglalat, új külső port). A laptop marad, ahol volt.

⭐ **Innentől a telefon kötésében a laptop HELYI címe áll** (`192.168.…`), ami mobilnetről
használhatatlan. ⛔⛔ **Vagyis a telefonnak IS a tábláról kell kiolvasnia a laptop címét** —
*és ez pontosan a 39. mérés hiányzó fele.*

### A3. Amit a két naplóban keresünk — ~5-10 perc

| Napló | A sor | Mit jelent |
|---|---|---|
| **telefon** (T) | `az új címemet kiírtam a táblára (… N tároló)` | a távozó kiírta az új címét — **N-et írd fel** |
| **laptop** (L) | `a táblán megvan egy néma társ új címe: …` | a maradó kiolvasta |
| ⭐⭐ **telefon** (T) | `a táblán megvan egy néma társ új címe: …` | ⭐ **A DÖNTŐ SOR** — a távozó IS kiolvasta a maradót |
| mindkettő | `rés nyílt: …` | a rés megnyílt |
| mindkettő | `✓ … N/M társ — X új esemény[, K menet]` | ⭐ a kör összegzése (D69/2): hány célból hánnyal ment végig a munka; `K menet` = ismételt menet. **Két egymás utáni ilyen sor időbélyege adja a kör hosszát** |
| mindkettő | `N címre kopogtam, egyik rés sem nyílt meg` | a kopogás nem ért célba ebben a körben — a táblára vár |
| mindkettő | `ismeretlen kopogott be (…) — visszakopogok, és vele is cserélek` | ⭐ a másik fél kopogása a mi körünkön KÍVÜL érkezett, és az állandó kapu (D69/3) felelt rá |
| mindkettő | `… foglalt — épp egy korábbi munkán dolgozik velem` | ⭐ nem hiba: a munka vele már fut, a végén visszakopogunk |
| mindkettő | `rés nyílt (…), de a csere a résen elbukott: …` | ⛔ **a legfontosabb hibasor** — a rés él, a csere nem; az ok szó szerint kell |
| telefon (T) | `Ébren tartást kértem (termux-wake-lock)` | ⭐ az őrjárat maga kérte az ébren tartást (42. mérés óta) — ha helyette `✗ Az ébren tartás nem sikerült`, kézzel: „Acquire wakelock" |
| mindkettő | `… az új címem kiírása nem ért célba: egyetlen DHT-gép sem vette át` | ⚠️ 0 tároló — a következő kör **magától újra próbálja** (42. mérés óta) |

### A4. A döntő próba — a gondolat

A **telefonon** (mobilneten): `node koino/koino.js gondolat "Atjott a valtas utan"`, majd egy-két
ablak múlva a **laptopon**: `node koino/koino.js`. ⭐ **És fordítva is**: a laptopon egy
másik gondolat, és nézd meg a telefonon. *A rés kétirányú — a csere is legyen az.*

### A5. ⭐ A NAT-javítás próbája: a laptop a telefon HOTSPOTJÁRA — ~5 perc (opcionális)

A telefonon kapcsold be a **hotspotot** (a mobil adat maradjon), és a laptopot tedd rá.
**Mindkettőn**, egy harmadik ablakban:

```bash
node koino/koino.js kulsoport 7400
```

⭐ Ha a **két külső cím egyezik** (a port más lesz), a két készülék **ugyanazon a
szolgáltatói címen** osztozik — pontosan a 2026-09-22-i javítás esete. Ekkor figyeld:

- `node koino/koino.js tabla` — a kötés mellett a **másik fél nyilvános címe** áll-e (a közös
  cím, a MÁSIK porttal)? ⛔ *Ha néhány ablak után sem, a javítás nem ért el az éles útig.*
  ⚠️ *2026-09-26 óta a `tarsak` ezt nem mutatja: a társ-lista csak az induló címeké, a
  cserén tanult címek a friss UDP-jegyzékbe és a kötésbe kerülnek (D69/2).*
- a naplóban a `rés nyílt: <cím>` — ⚠️ **a cím mondja meg, merre nyílt**: ha a **nyilvános**
  cím, a szolgáltató NAT-ja visszafordult saját maga felé (*hairpinning* — erre eddig nem
  volt adatunk); ha egy **helyi** (`192.168.…`) cím, akkor a hotspot helyi hálózatán mentek
  át, és a hairpinning kérdése nyitva marad.

### Mit jelent az eredmény

- ✅ **A4 átment mindkét irányban** → a program lánca rendben: kiírás, kiolvasás **mindkét
  oldalról**, visszakopogás, csere. ⭐ Ekkor a 39. mérés bukása **a két mobil NAT** számlájára
  írható — és a 🅱️ változat dönti el, hogy tényleg fal-e.
- ⛔ **A telefon naplójában NINCS „a táblán megvan" sor** → a távozó nem olvasta ki a maradót:
  **program-hiba**, és ez volt a 39. mérés oka is. *A két napló kell hozzá — küldd el mindkettőt.*
- ⛔ **Mindkét „megvan" sor ott van, a rés mégsem nyílt** → ez **váratlan** (ezen a páron a
  32. mérés már nyitott rést). *A kopogás időzítése vagy a port a gyanús — a napló `kopogtam`
  sorai döntenek.*

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
| **Melyik változat** (🅰️ telefon + laptop · 🅱️ két mobil) | a kettő más kérdésre felel |
| A **szolgáltató** neve mindkét telefonon | a NAT viselkedése szolgáltatónként más (36/d) |
| ⭐ **A két külső cím** (`kulsoport` a váltás után) | egyezik → közös CGNAT, és él a 2026-09-22-i javítás meg a hairpinning kérdése |
| Hány **tároló** vette át a tábla-bejegyzést (`N tároló`) | ez a tábla erőssége; 0 = néma bukás |
| **Mennyi idő** telt a váltástól az `A` gép „megvan a táblán" soráig | a 35. modell 5 perces ablakkal számolt |
| ⛔⛔ **Kiolvasta-e a TÁVOZÓ is a tábláról a maradó címét** | *ez a 39. mérés hiányzó fele* — a B naplójában kell keresni |
| Hány **kopogás** után nyílt a rés (`… ms`) | a 17. mérés 190 ms-ot, a 19. 76-ot mért |
| Átment-e a **gondolat** (3. szakasz) | ez a valódi siker |
| ⭐ **A kör hossza** (két egymás utáni kör-sor időbélyege) | a D69/2 után először — a 41. mérés 90–97 mp-ét a TCP-kör okozta |
| Bármi, ami **nem** a fenti sorok közül jött | a meglepetés a legértékesebb adat |

⭐ **És a végén mentsd el a két naplót** (🅱️: `~/orjarat-A.log`, `~/orjarat-B.log` ·
🅰️: `~/orjarat-T.log` a telefonon, `~/orjarat-L.log` a laptopon) — az
`eredmenyek.md`-be a döntő sorok szó szerint kerülnek be, ahogy a 39. mérésnél is.

---

## 6. Ismert csapdák — ezekre a napló szerint már ment el idő

- ⛔ **A portszám futásonként MÁS lehet.** A 19. mérésnél tizenöt próbálkozás ment a **régi**
  számra. ⭐ Ebben a mérésben ez nem gond, mert a címet **nem kézzel adjuk át** — épp ez a
  tárgya. *De ha kézi `tars`-ra kényszerülsz, mindig frissen kérdezd meg.*
- ⛔ **A fúrót nem szabad újraindítgatni** (32. mérés): a telefon ugyanarról a helyi portról
  futásonként más külső portot kapott. Hagyd futni az őrjáratot. ⭐ *2026-09-25 óta (D69/3) az
  őrjárat UDP-foglalata a teljes futásra nyitva marad — a futás alatt tehát egy leképezés él,
  de az újraindítás továbbra is újat kér.*
- ⚠️ **A telefon elalvása** megakasztja az őrjáratot. Tartsd ébren a képernyőt mindkét
  készüléken a mérés idejére.
- ⚠️ **A DHT-belépők korlátozhatnak** (36. mérés: 5 körből 2 elakadt rajtuk). Ha a tábla
  egyáltalán nem megy, ez a leggyanúsabb — a készülék a saját emlékezetéből indulna, de egy
  friss telepítésnek még nincs emlékezete.
- ⚠️ **Ugyanaz a koino kell.** Ha a 0. szakasz cseréje megy, ez bizonyított; ha „MÁSIK koino"
  üzenetet látsz, ott állj meg.
- ⛔⛔ **A váltás előtt nézd meg, hogy a mobilnet TÉNYLEG működik** (40. mérés — ezen bukott el):
  kapcsold ki a wifit, és nyiss meg egy weboldalt. *Egy feltöltőkártyás telefonon a mobil
  adat „be van kapcsolva", címet is kap — de forgalmat nem enged.* Utána vissza a wifire.
- ⚠️ **„Acquire wakelock" mindkét telefonon** (a Termux értesítésében) — a 40. mérésen az 1
  perces körök között 3–5 perces szünetek voltak. *A mérés végén: „Release wakelock".*
- ⭐ **Mobilnet nélkül a napló 2026-09-24 óta megmondja:** *„a tábla NEM ÉRHETŐ EL"* és
  *„nem tudom megmérni a saját külső címemet"*. Ha ezt látod, a mérés nem a programot méri.

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
