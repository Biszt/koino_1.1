# A CLAUDE.md naplója (2026-09-06 – 2026-09-25)

Ez a fájl a [`CLAUDE.md`](../CLAUDE.md) korábbi „HOL TARTUNK” szakaszainak **szó szerinti**
archívuma. A 2026-09-25-i karcsúsításkor került ide, mert a CLAUDE.md minden session
indulásakor betöltődik, és 233 KB-ra nőtt. A friss állapot, a szabályok és a tartós
elvek a CLAUDE.md-ben maradtak; itt a **történet** és a döntések **indoklása** áll.
Újabb bejegyzés a fájl **tetejére** kerül.

---

### ✅ 2026-09-26 — D69/2: A TCP KIKERÜLT A KÉSZÜLÉKEK KÖZÜL (Csaba döntései)

⭐ **A döntések, szó szerint:** *„nyugottan lehet tiszta lappal indúlni. nem szeretnék tcp-és
megoldásokat."* · *„vegyük ki a tcp-ét egyszerre. nem szeretném hogy bezavarjon."* · a több
forrás árára: *„elfogadom ezt az árat, ameddig az udp-és több forrás meg nem épűl."* · és a két
mobil NAT feltevésére: *„ameddig ezt nem tudjuk tesztelni, feltételezzük azt, hogy működik."*

⭐ **Előtte egy tanuló-beszélgetés** (a TCP és a UDP, a portás-kép, a pajzsfúrás lépésenként, a
cél-függő NAT) — ebből jött a tiszta lap: a `tarsak.json` címei a TCP-kapuk számai voltak, UDP-n
hiábavalók.

**Mit építettünk (három commitban):** közös munka minden útnak (`resMunkaKeszito`) · `figyel` =
állandó UDP-kapu · az őrjárat TCP-kör és TCP-postaláda nélkül, a kötésekre + friss címekre +
induló címekre kopog, ismételt menettel · kézi `csere`/`hozd`/`tukor` a kapun · `pajzsfuro … tcp`
ki · `kapu` UDP-rést kér · `indulocimek.json` (tiszta lap) · a `vonal.js` TCP-nyitói, a
`tcpPajzsfuras`, a `korbeCsere`, a `cimek` mező és a `tcpLekepezesMeres.js` ki · a könyvelés a
kopogásból (`kopogasMegfigyelesei`, próbával).

⛔⛔ **A MENET LELETE — EGY VALÓDI VONAL-HIBA:** az ismételt menet a teljes próbasorban egyszer
elbukott (*„rés nyílt, de a csere a résen elbukott: A másik fél nem válaszol"*). Külön futtatva
zöld volt — ⚠️ **nem hangoltuk zöldre**, a próba megnevezte magát (az őrjárat naplójával), és
kiderült: ugyanazzal a társsal másodpercen belül új kapcsolat nyílik ugyanazon a foglalaton, a
sorszámok 1-től indulnak, és a társ **régi kapcsolatának utóhangja nyugtázta az új kapcsolat
első darabját**, mielőtt az ő új kapcsolata megszületett volna. ✅ Javítva új mező nélkül: az
első küldés sosem visz `k`-t, tehát az utóhang csak `k`-val érkező, bájtra azonos ismétlést
nyugtáz. Új önpróba reprodukálja (késleltetett túloldal), a rontása buktat.

⚠️ **Két apróbb javítás a próbákból:** egy lezárt foglalaton próbált küldés szinkron dob
(`ERR_SOCKET_DGRAM_NOT_RUNNING`) — most elnyeljük, egy bezárt kapu ne döntse le a folyamatot; a
küldő a saját UDP-listájából is csak érvényes címet küld.

⚠️ **Az árak:** a több forrás (és a rossz szelet helyi tanulsága) élesben pihen; IPv6 nincs (a
kapu IPv4-es); a „nincs újdonság" csere a résen ~480 bájt (TCP-n ~334 volt — a UDP-vonal
sorszámai és nyugtái); a régi és az új koino nem beszél egymással. ⏭️ **Terepen még semmi nincs
mérve a D69/2-ből.**

---

### ▶️ SESSION-VÁLTÁS (2026-09-25 este) — a D69/2 TERVE, ahogy a munka előtt állt

**Az állapot:** a D69 (*„UDP mindenhol, lépcsőzetesen"*, Csaba döntése) **1. lépcsője ✅**
(az egyoldalú rés javítva, terepen is láttuk: 42. mérés, 16:30) és **3. lépcsője ✅** (az
állandó UDP-kapu, lent). ⏭️ **A KÖVETKEZŐ MUNKA: a D69/2 — a TCP-kör kivétele az őrjáratból.**
Csaba kifejezetten új sessionben akarja kezdeni. **717 önpróba zöld** (26 próba-fájl a
`mind.js`-ben); a munkakönyvtár a session-váltó commit után tiszta.

#### ⏭️ A D69/2 — hol és hogyan

⭐ **Hol van a kód:** [`koino/koino.js`](koino/koino.js), a `case 'orjarat'` ág. A körben
előbb a **UDP-ág** fut (`udpCelok` → `kapu.kopog(...)`), utána a **TCP-kör** (`hivhatok` →
`korbeCsere(hivhatok, (t) => csereVonalon(...))` az ismételt menettel, a `MENET_PLAFON`-nal és
az `ablakVege`-vel), aztán a tábla. A résen végzett munka a `resMunka` — **ez már most mindent
megtesz, amit a TCP-kör a sikeres társsal** (kötés · saját cím a társtól · UDP-címek · DHT-gépek
· társ-címek · fájl-tanulság · fájl-randevú), egyetlen kivétellel: a `tarsak.json` `utoljara`
könyvelése (`megfigyelesekRavezetese`) csak a TCP-körben van.

A lépések, ahogy most látom:

1. **A társlista címeire is a kapun kopogunk.** A `hivhatok` címei kerüljenek a `kapu.kopog`
   céljai közé az `udpCelok` mellé, cím:port szerint egyszer. ⚠️ A társlistán **TCP-port** áll,
   de az őrjárat a UDP-kaput **ugyanazon a számon** nyitja (`port`), tehát a szám jó — ha a
   másik oldalon is őrjárat fut.
2. ⛔ **A `figyel` parancsnak is kell UDP-kapu.** Ma csak TCP-t nyit (postaláda, D34): a D69/2
   után az őrjárat nem hívná többé. A `figyel` nyisson `udpKapuNyitasa`-t ugyanazon a porton, a
   `resMunka`-val azonos munkával (a kör-állapot nélkül). Célszerű a `resMunka`-t kiemelni az
   őrjáratból, hogy mindkettő ugyanazt hívja. *Egy problémára egy gépezet.*
3. **Az ismételt menet (30. mérés, ×30) UDP-n.** Ha egy kopogás-kör új eseményt hozott (a
   `kopog` eredményében `eredmenyek[i].eredmeny.uj`), kopogjunk újra az átfúrt társakra,
   amíg van újdonság, és `Date.now() < ablakVege`, legfeljebb `MENET_PLAFON`-szor. A társ
   kapuja bármikor fogad; a `FOGLALT` már kezelve van. ⚠️ Ezt a próbának kell eldöntenie: a 30.
   mérés alakja (három készülék láncban, a hír egy ablakon belül a végéig jut) UDP-n is.
4. **Az `utoljara` könyvelés** (melyik társ mikor felelt) kerüljön át a UDP-útra, vagy mondjuk
   ki, hogy a társlista mostantól csak *kiinduló cím* (a kötés tudja a többit). ⚠️ Ez
   tervezési kérdés — ha nem egyértelmű, **Csabának döntési kérdésként** kell feltenni.
5. **A `sikeresEbbenAKorben`** (ebből lesz a körből „buli", a felszabadítás mércéje) maradjon
   meg: a `udp.sikeres` adja.
6. **Próbák:** a parancssor-próbák közül azok, amelyek `figyel`-t indítanak, és egy őrjárat
   TCP-körrel éri el (pl. a felület + őrjárat próba; a „fájl több forrásból" próba két `figyel`
   forrással), a 2. pont után a kapun kell átmenjenek — ez maga a bizonyítás. ⛔ Rontás-próba:
   a társlista-kopogás kivétele buktasson; a régi (TCP-körös) `koino.js` pedig egy új próbán,
   ami csak UDP-n mehet át.
7. **Mérés:** a 41. mérés 90–97 mp-es köre halott TCP-címekből jött — írjuk fel a kör új
   hosszát az [`eredmenyek.md`](koino/meres/eredmenyek.md)-be.

⚠️ **Ami a D69/2 után is TCP marad** (a D69 szerint *egyelőre*): a `figyel` TCP-postaládája
(a kézi `csere <cím>` és a régi társak miatt) · a kézi `csere`, `hozd`, `tukor` · a felület
(`127.0.0.1`, HTTP — a gépen belül) · a `kapu` (routerkérés). *A TCP-kapu teljes lezárása
külön lépés, nem ennek a része.*

#### ⏸️ Ami nyitva maradt (terep és próbák)

- ⏸️ **Terepen még nem mért:** az állandó kapu, a Termux-ébren tartás és a 0-tárolós újrapróba.
  A **telefon + laptop** (forgatókönyv **0/b.** a [`terepmeres_mobil.md`](docs/terepmeres_mobil.md)-ben,
  az új naplósorok az A3. táblában) elég hozzá. A telefon frissítése:
  `cd ~/koino_1.1 && git fetch --depth 1 origin main && git reset --hard origin/main && node koino/meres/mind.js > ~/probak.txt 2>&1; tail -3 ~/probak.txt`
- ⏸️ **A két mobil NAT közötti rés** még nincs mérve: Csaba feltöltőkártyás mobilnete nem
  működik, a szomszédé korlátlan, de nem mindig érhető el.
- ⏸️ **Négy időzítés-érzékeny próba** egyszer-egyszer bukott a telefonokon (a laptopon zöld):
  meg kell nevezniük a bukásuk okát, mielőtt bárki hozzányúl az időzítésükhöz.
- ⏸️ **A kopogás saját üteme** (41. mérés): a D69/2 után kisebb munka, a tábla-olvasás
  (~20 mp néma kötésenként) akkor is megnyújtja a kört.

---

### ⛔ 2026-09-25 éjjel — ÁTNÉZÉS: AZ ÁLLANDÓ UDP-KAPU JEGYZÉKE DARABRA IS KORLÁTOS

⛔ **A lelet:** az `udpKapu.js` társ-jegyzéke csak IDŐBEN volt korlátos (10 perc), darabra
nem — pedig a fájl maga hivatkozik a 9. szabályra. A UDP feladócíme **hamisítható**, és minden
új feladótól jövő `KOPOG` új bejegyzés: egy elárasztó a jegyzéket korlátlanul felduzzaszthatta.
✅ **A javítás:** `JEGYZEK_KORLAT = 1000` (egy valódi koinóban el sem érjük). A plafon felett a
**legrégebben látott, kiszorítható** bejegyzés esik ki — kiszorítható az, amellyel nem fut
munka, és amelyre **nem kopogtunk az utolsó 15 mp-ben** (⚠️ különben az elárasztó a mi
célunkat szorítaná ki, és a HALLAK-ja kóbor csomagnak látszana). Ha nincs kiszorítható hely,
az idegen új feladó **választ sem kap** (se HALLAK, se FOGLALT, se visszakopogás), és a napló
sorozatonként **egyszer** mondja: `JEGYZEK-TELE`. A saját céljaink mindig bekerülnek.
⭐ **3 új önpróba** (100 hamis feladó 20-as plafonnal · az áradat a kopogás és a HALLAK között ·
tele jegyzék), **négy rontás, mind buktat** (a plafon kivétele · a friss kopogás védelmének
kivétele · a „tele" minden alkalommal · válasz tele jegyzéknél). **717 önpróba**, az új próbák
ötből ötször zöldek. ⏸️ *Nem változott:* egy kopogásra a kapu egy választ küld (HALLAK vagy
FOGLALT, hasonló méretű csomag); második csomagot (visszakopogást) csak a korlátos számú —
alapból 3 — friss bekopogó kap. Erősítésre (amplification) tehát érdemben nem használható.

---

### ▶️▶️▶️▶️▶️▶️ 2026-09-25 este — D69/3: AZ ÁLLANDÓ UDP-KAPU MEGÉPÜLT

⭐ **Egy UDP-foglalat a teljes futásra** ([`js/csere/udpKapu.js`](koino/js/csere/udpKapu.js)) — a
régi, körönként nyitott-zárt fúró-foglalat helyett. A kopogásra bármikor felel, a bekopogóval
munka indul, **társanként egyszerre egy munka** (ha a munkánk vele már adatot kapott, az újabb
kopogására `FOGLALT` — új üzenet), a bekopogók száma korlátos, és a saját külső címet ezen a
foglalaton mérjük (egy leképezés, egész futásra). ⭐ Mellékhatásként a leképezés percekig él, tehát
két eltérő percben kopogó készülék is összeérhet (a 41. mérés bajának nagy része). Részletek:
**D69 / 5.** a [`fejlesztesi_terv_fazis2.md`](docs/fejlesztesi_terv_fazis2.md)-ben.
**6 kapu-önpróba** (hamis munkával) + **1 új parancssor-próba**, ami csak az állandó kapuval megy
át · a teljes régi parancssor-sor zöld. ⏸️ **Terepen még nincs mérve.**
⏭️ **A következő: D69/2 — a TCP-kör kivétele az őrjáratból** (most már van mindig figyelő
UDP-kapu, és az ismételt menet is megoldható rajta).

### ▶️▶️▶️▶️▶️ 2026-09-25 délután — 42. MÉRÉS: A SZOMSZÉD WIFIJE

⭐ **Telefon a szomszéd wifijén, laptop otthon** (két router, mobilnet nélkül; a laptopot Claude
futtatta). Jegyzőkönyv: [`eredmenyek.md`](koino/meres/eredmenyek.md) **42.**
- ✅⭐ **A TÁVOZÓ KIOLVASTA A MARADÓ CÍMÉT** a tábláról (négyszer) — *a 39. mérés nyitott kérdése
  eldőlt: igen.*
- ⛔ **A rés azért nem nyílt meg**, mert a telefon új címe **0 tárolóval** került ki, és a program
  ezt kiírtnak vette — 2,5 órán át nem próbálta újra. ✅ **Javítva:** 0 tárolóval nem „kiírt", a
  következő kör újra próbálja.
- ⛔ A telefon körei a zsebben **15–20 percesek** lettek (Android). ✅ **Javítva:** Termuxban az
  őrjárat maga kéri az ébren tartást (`termux-wake-lock`). ⏸️ *Telefonon még nem kipróbálva.*
- ⚠️ A telefon **önmagával is kötött** (a saját címe a társlistán). ✅ **Javítva** (három helyen).
- ⭐⭐ **Hazaérve a rés megnyílt, és a CSERE A RÉSEN VÉGIGMENT** — először terepen, az őrjáraton
  belül, és a 41/b. javítás sora is megjelent: *„ismeretlen kopogott be — visszakopogok"*.
- ⚠️ Egyszer a rés megnyílt, de a másik fél „már átfúrtnak" tartotta, és nem cserélt → ez a
  körönként nyitott foglalat szerkezeti hibája.

✅ *(Azóta kész — lásd fent.)* ⏭️⏭️ **A KÖVETKEZŐ: D69/3 — egyetlen, a futás alatt nyitva maradó UDP-foglalat** (UDP-postaláda),
ami bármikor fogad kopogást és cserét. ⚠️ **A D69/2 (TCP-kör ki) csak UTÁNA**: ma az ismételt
menet (30. mérés, ×30) és a postaláda csak TCP-n létezik — előbb kivenni rontana. ⚠️ A 3.
lépés protokoll-tervezés: a UDP-folyamoknak ma nincs saját azonosítójuk, egy mindig figyelő
kapunak pedig meg kell különböztetnie az új beszélgetést egy régi késő csomagjától.

### ▶️▶️▶️▶️ 2026-09-25 délelőtt — D69: UDP MINDENHOL, LÉPCSŐZETESEN

⭐ **Csaba döntése (D69, [`fejlesztesi_terv_fazis2.md`](docs/fejlesztesi_terv_fazis2.md)):** a
TCP–UDP kettősség drága (két címjegyzék, két kör, és a TCP-kör ELREJTETTE a UDP-út hibáját) —
**UDP mindenhol**, de lépcsőzetesen, minden lépcső előtt bizonyítással: *(1)* a résen futó
csere hibája ✅ · *(2)* a TCP-kör ki az őrjáratból ⏭️ · *(3)* állandó UDP-kapu a postaládának ✅
(2026-09-25 este; a sorrend pontosítva: a 3. a 2. előtt).

⛔⛔ **41. mérés:** öt halott TCP-címmel és két néma kötéssel egy kör **90–97 mp**, és a kopogás
csak minden második percfordulón fut — két ilyen készülék **soha nem kopog egyszerre**. ⏸️ A
kopogás saját üteme továbbra is javasolt (a D69/2 után kisebb munka).

✅ **41/b.: az egyoldalú rés — itthon reprodukálva, JAVÍTVA.** A 40. mérésen a rés megnyílt, a
csere elbukott, mert a kötés csak az egyik oldalon tudott PORTOT (a bekopogóval kötött kötés
port nélkül áll) — a másik fél csak visszaszólt, cserét nem indított. Most **aki bekopog, azzal
a másik is cserél** (`bekopogoFogadas`, ablakonként ≤ 3), és a kötés ettől öngyógyító. A
láthatóság is javítva: *„rés nyílt, de a csere a résen elbukott: …"*. ⚠️ *A reprodukcióhoz a
hurok-cím csapdáját ki kellett kerülni: azonos címről a fúró a halott célt „felismerte".*
⏸️ **Terepen még nincs mérve.**

📄 **Interaktív magyarázó oldal** a hálózatról (Csabának): *„A koino hálózata"* (artifact).

### ▶️▶️▶️ 2026-09-24 — 40. MÉRÉS: A KÉT MOBIL NAT ELMARADT

⛔ **A két mobil NAT közötti rést NEM mértük meg** — az „A" telefon (Csabáé) mobilnete nem
működött (feltöltőkártyás). ⭐ Ami mégis kiderült: [`eredmenyek.md`](koino/meres/eredmenyek.md)
**40.** Röviden:
- ✅ a kötés a kézi `tars`-szal megszületett, a kiírás mindkét oldalon ment (8 és 14 tároló);
- ⭐⭐ **a DHT egy 72,4 órás bejegyzést is megőrzött** (eddig 6,6 óra volt a csúcs) — de 7-ből
  csak 5-ször adta vissza;
- ⚠️ egy routeren a **helyi** címre nyílt rés (1,4–4,2 mp), a **nyilvánosra soha** — ez a router
  valószínűleg nem tud hairpinninget (a 2026-09-22-i NAT-javítás kimondott ára, most terepen);
- ✅ a csere körönként **35 KB** volt, 0 új eseménnyel — ⭐ **JAVÍTVA (40/b.): 33,1 KB → 1022
  bájt, 5 kör → 1.** Egy ok, két tünet: a csere a SAJÁT tárát hirdette, benne a 2026-08-31-i
  alakváltás előtti eseményekkel, amiket a mai kapu eldob — a társ körönként újra elkérte
  (9 elutasítva), és a tükörképe a teljes tartományt kérte újra (`marMegvolt: 2`). Most az
  állás és a válasz csak **alakilag érvényes** eseményt lát (`alakiHiba`, a kapuval közös
  szabály, most külön függvény). **4 új próba, a terepi számokat pontosan visszaadja.**
- ⛔⛔ **KÉT HALLGATÓ HELY, mindkettő JAVÍTVA 2026-09-24:** offline telefonon a napló azt írta,
  hogy *„egy néma társ nincs a táblán"* (pedig egyetlen DHT-gép sem felelt), és **szó nélkül
  kihagyta** az új cím kiírását (a STUN-bukást az őrjárat eldobta). Most: *„a tábla NEM ÉRHETŐ
  EL (N kérdés, egyik DHT-gép sem felelt)"* · a társat is megnevezi · és *„nem tudom megmérni a
  saját külső címemet (…) — amíg ez így van, új címet sem írhatok a táblára"* (sorozatonként
  egyszer). ⭐ Új: **`KOINO_TUKOR=cím:port`** (a tükör cserélhető, 2. szabály — és így
  próbálható). **2 új parancssor-próba, 3 rontás-próba.**
- ⚠️ a telefonokon **4 különböző időzítés-érzékeny próba bukott**, mind egyszer (a laptopon mind
  zöld, 8 mag terhelése mellett is) — ⏸️ a négyből háromnak meg kell neveznie a bukása okát.

⏭️⏭️ **A KÖVETKEZŐ LÉPÉS:** amint az „A" mobilnete működik → a **telefon + laptop** változat
(forgatókönyv **0/b.**) — ehhez **nem kell a szomszéd**, és ez dönti el, hogy a program
hibás-e. ⭐ A kötés az „A" és a szomszéd „B" telefonja között **megmaradt**: a két mobilos
mérés legközelebb rögtön a hálózatváltással kezdhet. ⚠️ A telefonokon **„Acquire wakelock"**
(a körök között 3–5 perces szünetek voltak).

### ▶️▶️ SESSION-VÁLTÁS (2026-09-21)

⭐⭐⭐ **A HIRDETŐTÁBLA TEREPEN IS MŰKÖDIK — 39. mérés, két valódi telefonnal.**
Jegyzőkönyv: [`koino/meres/eredmenyek.md`](koino/meres/eredmenyek.md) 39. · a forgatókönyv:
[`docs/terepmeres_mobil.md`](docs/terepmeres_mobil.md). **707 önpróba zöld** (26 próba-fájl;
680 volt a 2026-09-22-i átnézés előtt, 692 utána — lásd lentebb). ⚠️ *A 2026-09-22-i átnézés
munkája 2026-09-23-ig NEM volt commitolva — az itteni „a munkakönyvtár tiszta" sor hazudott.*

✅ **ÉS A 2026-09-22-I ÁTNÉZÉS UTÓLAGOS ÁTNÉZÉSE (2026-09-23) — HÁROM JAVÍTÁS:**
*(1)* a `megfigyelesekRavezetese` csak az ÜRES `utoljara`-t szűrte, a RÉGIT nem: a sikertelen
kör a kör eleji időt vitte tovább, és az felülírhatta a közben szerzett frissebb sikert. Most a
kettő közül a frissebb marad (új próba, rontással buktatva). · *(2)* a bemutatkozásoknál a
*„⚠️ nem ellenőrizhető"* felirat **halott ág** volt (0/0-nál a sor meg sem jelent) — most külön
sor. ⚠️ *Parancssor-próba nincs rá: éles úton a horgony a saját láncunkból jön, ez az ág csak
sérült tárnál élne.* · *(3)* a kézi `tars`, `tars torol` és `csere <cím>` is a `modosit()`-on
át ír — **a társ-lista minden írása egy gépezeten megy**.
✅ **ÉS A FÜGGŐBEN LÉVŐ BEMUTATKOZÁS KÉT IRÁNYA KÜLÖN (2026-09-23):** az `egyoldalu` összeg
egybemosta a *„rád vár"* (ő bemutatkozott, én még nem — **teendő**) és a *„a másik félre
vár"* esetet. Most a `bemutatkozasok` külön adja (`radVar` · `masikraVar`), és az `allapot`
a rám várókhoz kiírja a parancsot is: *„ha találkoztatok, viszonozd: … bemutatkoz <horgony>"*.
⛔⛔ **A javasolt horgonyt ELLENŐRIZZÜK:** a bemutatkozó a `sajatBelepes`-t maga írja, és egy
csaló egy HARMADIK ember horgonyát is beírhatná — a javaslat akkor rávenne, hogy olyasvalakiről
állítsak találkozást, akit sosem láttam. Csak az aláíró saját belépése lesz javaslat.
⭐ 2 új önpróba + a parancssor-próba bővítve; **három rontás, mind buktat** (az ellenőrzés
kivétele · a két irány felcserélése · a javaslat-sor kikapcsolása).

**A DÖNTŐ SOR, a maradó telefon naplójából:**

```
20:09:35  0/4 társ — 0 új esemény, 0 bájt          ← a társ elnémult
20:10:05  ⭐ a táblán megvan egy néma társ új címe:
          5.187.184.117:7373 (az ő órája szerint 1 perce írta ki)
```

⭐ Az elvitt telefon **magától** kiírta az új címét, a maradó **magától** kiolvasta —
**kézzel egyetlen címet sem írtunk be**, és elnémulástól a megtalálásig **30 másodperc**.
A kiírás telefonról **8 tárolót** ért el, ugyanannyit, mint a 37. mérés laptopról.

⛔⛔ **DE A RÉS NEM NYÍLT MEG, és a gondolat nem jött át** (`1 friss címre kopogtam, egyik
rés sem nyílt meg`). ⚠️⚠️ **Két magyarázat, és a naplóból NEM szétválaszthatók:**
*(1)* a másik fél **nem kopogott vissza** (az ő kötésében a maradó RÉGI, hotspotos címe állt,
és nem tudjuk, kiolvasta-e a tábláról az újat) · *(2)* **két mobil NAT nem tud egymásba
fúrni** (a 32. mérés máig nyitott kérdése). ⛔ *Nem választottunk, mert az „A" telefon
naplójához megszűnt a hozzáférés — egy mérés, aminek a döntő fele hiányzik, nem ad választ.*

⏭️⏭️ **A KÖVETKEZŐ LÉPÉS EBBEN: MEGISMÉTELNI, MINDKÉT NAPLÓVAL.**
⭐ **A 0. szakaszt NEM kell újra** — a kötés mindkét telefon lemezén megmaradt
(`kotesek.json`), tehát a következő alkalom **rögtön a hálózatváltással kezdhet**.
⛔ A döntő adat: **kiolvassa-e a TÁVOZÓ is a tábláról a maradó címét?** Ha igen, és a rés
mégsem nyílik, akkor az a 32. mérés hiányzó darabja, **negatív eredménnyel**.

✅ **És egy kicsi, de terepen drága javítandó (39. mérés / 2. mellék-lelet) — JAVÍTVA
2026-09-22:** a `felfedez` azt írta, *„1 már ismerős volt"* akkor is, amikor a valóság
*„1-et kiszűrtem, mert a SAJÁT címem"*. ⭐ *A réteg mindig is megmondta* (a
`sajatCimekKiszurese` ad egy `kihagyott` mezőt) — **a hívó dobta el**. Most három szám jön
vissza (`hozzajott` · `ismeros` · `mienk`), és a felirat mindhármat megnevezi.

### ⛔⛔⛔ ÉS EGY ÁTNÉZÉS (2026-09-22) — NÉGY JAVÍTÁS, ÉS A LEGSÚLYOSABBAT A MÉRÉS ADTA

⛔⛔⛔ **1. ELVESZETT ÍRÁS A TÁRS-LISTÁN — és a 2026-09-21-i javítás ezt KIHAGYTA.** A
`modosit()` (a beolvas–módosít–kiír sorba állítása) megkapta a `kotesek.json`-t és az
`udpcimek.json`-t; ⛔ **a `tarsak.json` nem** — ott a régi `cimIrasSor` ígéret-lánc maradt a
`koino.js`-ben, ami viszont **csak a `cimeketTanul` hívásait** rendezte egymáshoz, az
őrjárat kör végi `tarolo.ir(kor.lista)`-ját nem. *Egy problémára két gépezet: az egyik
előbb-utóbb kimarad valahonnan.*
⭐⭐ **MÉRVE, két készülékkel** (a napló maga mondja ki a bukást):
```
A társai a kör ELŐTT:                   [ 10.255.255.1:7999 ]
← 20:57:08 bejött valaki — … · +1 cím       ← a napló szerint MEGTANULTA
A társai KÖZVETLENÜL a bekopogás után:  [ 10.255.255.1:7999, 10.9.9.9:9999 ]
A társai a kör VÉGE után:               [ 10.255.255.1:7999 ]   ⛔ elveszett
```
⛔⛔ **És a rés itt a leghosszabb az egész programban:** a 2026-09-21-i esetben
**ezredmásodperc** volt (a tükör és a társ válasza között), itt **a TELJES csere-kör** —
másodpercek, akár percek. ⛔ **A kár iránya pedig a rosszabbik: a POSTALÁDA-ág veszít**,
vagyis épp az a készülék, aki a legtöbb emberrel beszél — *pontosan az, amit a cím-tanulás
bevezetése meg akart előzni.*
✅ **A javítás nem zárolás, hanem szerkezet:** a kör csak **megfigyel**
(`korbeCsere` → új `megfigyelesek` mező), és a megfigyeléseket **rávezetjük** arra, ami épp
a lemezen van (`megfigyelesekRavezetese`) — a tároló `modosit()`-ján át. ⭐ Amit a kör nem
figyelt meg, ahhoz nem nyúlunk; ⚠️ **és amit a kéz közben LEVETT (`tars torol`), azt a kör
nem támasztja fel** — *egy sorrend-frissítés nem hozhat vissza valakit, akit szándékosan
levettünk.*

⛔ **2. A `bemutatkozasok()` ÉLES HÍVÓ NÉLKÜL ÁLLT** (`jelzesek.js`, 7 önpróbával). A
`bemutatkoz` parancs kiírta, hogy *„D62: csak KÖLCSÖNÖSEN számít"* — ⛔ de hogy teljesült-e,
azt a program **sehol nem mondta meg**. *Egy kimondott feltétel, amiről hallgatunk, nem
feltétel, csak felirat.* ✅ Bekötve az AZONOSSÁG szakaszba, és a **függőben lévő külön
megnevezve** (D19): *„1 kölcsönös bemutatkozásod van · 2 még FÜGGŐBEN (egyoldalú)"*.

⚠️ **3–4. KÉT HAZUDÓ FELIRAT:** a `felfedez` (fent) · és **a kör mérete a kódban**: hét
helyen *„334 bájt"*, egy helyen *„~190 bájt"* állt a MAI körről, holott a 38. mérés
**931 bájt**ot mond (a saját mérésem naplója 832-t egy üres jegyzékű körre). ⛔ *A 190 és a
334 egymásnak is ellentmondott* — és a számokra a kód **érvet** épít (pl. *„a csere apró,
tehát nem ő tölti meg a sort"*). Az érv 931-nél is áll, de a szám hamis volt.

⭐ **NYOLC ÚJ PRÓBA, ÉS MIND A HAT RONTÁS BUKTAT:** a kör végi írás visszacserélése
`ir(kor.lista)`-ra · a bemutatkozás-kiírás kikapcsolása · a rávezetés visszaállítása a régi
viselkedésre (**három ágon**) · az `utoljara` naiv ráírása · a társ-tároló sorának kivétele.
⚠️ **És egy ágat a saját rontásom talált meg:** az `utoljara` óvatos kezelése
(*egy sikertelen kör nem törölheti a közben szerzett sikert*) **mérhetetlen ág** maradt
volna — külön próbát kellett írni rá.

### ⭐⭐⭐ ÉS AZ ÖTÖDIK LELET IS MEGVAN — A NAT MÖGÖTTI TÁRS (2026-09-22, Csaba „B" döntése)

⛔⛔ **A BAJ:** a saját címünk kiszűrése **csak CÍM szerint** ment, miközben a NAT miatt egy
egész háztartás **egyetlen** külső címet mutat kifelé, és a készülékeket csak a **PORT**
különbözteti meg. ⛔ Vagyis **minden velünk egy NAT-on lévő társ láthatatlan volt** a cserén
tanult címek közül. ⭐⭐ **És a súlyosabb eset nem is a család:** mobilon a szolgáltató is
fordít (**CGNAT**), tehát több ezer, egymást nem ismerő előfizető osztozik egy címen — egy
**vadidegen** koino-társ is kiesett, és neki a helyi felfedezés **nem tartalék útja**, mert
nem is egy hálózaton vagyunk. *(A 32. mérés mobil NAT-ja: `130.43.209.249`.)*

⛔⛔⛔ **ÉS AMIT A RÉTEG KOMMENTJE MEGMENTETT: EZT MÁR MEGPRÓBÁLTUK EGYSZER, ÉS MÉRÉSBŐL
TÉRTÜNK VISSZA RÁ.** A `sajatCimE` fejléce szó szerint őrizte: *„Egy korábbi, szűkebb szűrő
csak a cím+port párost hasonlította a tükörhöz — az **IPv6-os saját cím átcsúszott rajta,
mert a tükör IPv4-et mondott**."* (2026-08-30: a laptop minden körben önmagával cserélt, és
a saját címe a cserén **tovább is terjedt** a telefonra.) *Egy vak „cím+port mindenhol"
javítás ezt visszahozta volna.*

⭐⭐ **EZÉRT A MEGOLDÁS NEM EGY SZABÁLY, HANEM A KÉT FORRÁS SZÉTVÁLASZTÁSA:**

- **interfész-cím** (a gépünk saját címei) → **a port NEM számít**. Ezeken senki mással nem
  osztozunk, és **csak így lehet elkapni a saját IPv6-unkat**, amit a tükör sosem mond meg.
- **tükör-cím** (ahogy NAT mögül kifelé látszunk) → **a port SZÁMÍT**. Ugyanaz a cím más
  porton már valaki MÁS készüléke.

⭐ A tükör ezért **kikerült** a `sajatOsszesCim()` listájából, és a `sajatCimekKiszurese`
külön, **cím+port párként** kapja. ⚠️ A `kivulrolIgyLatszom` portja erre alkalmas: a
`vonal.js` csak akkor hirdeti, ha a mi oldalunk a **figyelő** vagy az **UDP-rés** — ott a
port tényleg a bejövő kapué, nem egy röpke forrásport.

⚠️ **AZ ÁRA KIMONDVA:** a velünk egy NAT-on lévő társat ezután megpróbáljuk hívni, és a
hívás **nem biztos, hogy átmegy** (a saját routerünkön magunk felé fordulni külön képesség —
*hairpinning* —, amit sok router nem tud). ⭐ Akkor a társ „sikertelen"-ként jegyződik, és a
kör megy tovább: *ez a `korbeCsere` alapviselkedése, nem hiba.* ⭐⭐ **És ezzel a hairpinning
végre MÉRHETŐVÉ válik** — a 32. mérés nyitott pontja (*„két mobil készülék egymás közt"*)
azért maradt nyitva, mert eddig meg sem próbáltuk.

⭐ **4 új önpróba, HÁROM rontás-próbával, mind külön ágon:** a régi cím-alapú szűrés
visszaállítása · a tükör-ág teljes kivétele · **és az interfész-ág cím+portra szűkítése**
(a 2026-08-30-i hiba visszahozása) — **mind buktat**, és mind MÁS próbát buktat.

⛔⛔ **ÉS AMIT NEM TUDTAM MEGMÉRNI, AZT KIMONDOM: a BEKÖTÉSRE nincs parancssor-próba.** A
tükör-ág **csak valódi NAT mögött** különbözik az interfész-ágtól — a hurok-címen a
`127.0.0.1` maga is interfész-cím, tehát mindkét szabály ugyanazt teszi, és a rontás nem
buktatna. ⏭️ *Ezt a soron következő terepmérés (39. mérés megismétlése két mobillal) fogja
megmérni — ott a két telefon CGNAT alatt épp ebbe a helyzetbe kerül.*

**Ami 2026-09-20-án elkészült — mind próbával és rontás-próbával:**

**Ami 2026-09-20-án elkészült — mind próbával és rontás-próbával:**
1. ✅ **AZ ŐRJÁRAT UDP-RE ÁLLT.** A kör elején **egy foglalatról** kopogunk minden friss
   címre (⭐ *a NAT-leképezés a foglalathoz tartozik: társanként külön foglalattal nem lenne
   egyetlen bemondható címünk*), és akinek megnyílik a rése, azzal **azonnal** csere +
   fájl-randevú megy ugyanazon a foglalaton. ⭐ A cím-jegyzék ezzel nem write-only többé.
2. ✅ **KÖTÉS-JEGYZÉK** (`kotesek.json`): a kötést a **TÁBLA-KULCS** azonosítja, nem a cím —
   *mert épp a cím az, ami elromlik*. Megőrzi az utolsó ismert címet akkor is, ha a névtelen
   jegyzékből elévült. K=3, legfeljebb 5.
3. ✅ **A HIRDETŐTÁBLA** (`js/csere/tabla.js` + `tabla` parancs): társanként külön rekesz
   (a só a két nyilvános kulcsból — ⭐ *egy kívülálló meg sem találja*), a tartalom
   titkosítva, a bejegyzés aláírva. Az őrjárat **néma kötésnél olvas, címváltáskor ír**.
4. ✅ **A CÍM-KORLÁT 3** + a megismert **DHT-gépek átadása** a társaknak.

⭐ **Két új mérés:** **37.** — a tábla a VALÓDI DHT-n: kiírás 22,1 mp (8 tároló), kiolvasás
22,9 mp, a lánc végigment. **38.** — a „nincs újdonság" kör **1346 → 931 bájt** (napi
5,4 → 3,8 MB, 14 társnál): *a tábla árát a cím-korlát kifizette.*

**A KÖVETKEZŐ MUNKA, sorrendben:**
1. 🚧 **TEREPMÉRÉS KÉT VALÓDI MOBILLAL — FELE MEGVAN (39. mérés, 2026-09-21).**
   ✅ A tábla-út végigment (a fenti napló). ⛔ A rés nem nyílt meg, és az ok **nyitva van**.
   ⏭️ **Megismételni, MINDKÉT telefon naplójával** — a 0. szakasz nélkül, rögtön a
   hálózatváltással. **Csaba kell hozzá** (2026-09-22: késő délután, két mobilnetes készülék).
   ✅ **A forgatókönyv FEL VAN KÉSZÍTVE rá** ([`docs/terepmeres_mobil.md`](docs/terepmeres_mobil.md)
   új 0. szakasza): **napló fájlba `tee`-vel mindkét telefonon** (*ez volt a 39. mérés
   bukásának oka*) · a **két külső cím** összevetése ⛔ **más helyi porttal** (`kulsoport 7400`
   — a `reuseAddr` miatt a 7373 elvenné a futó őrjárat csomagjait) · és a **bukás
   szétválasztása**: a *„megvan a táblán"* sor a TÁVOZÓ naplójában dönti el, hogy
   program-hiba (nem kopogott vissza) vagy fal (két mobil NAT).
2. ⏸️ **A VÉLETLEN SÉTA** — ma a kötések abból lesznek, akivel amúgy is összeérünk; a
   társakat még **nem kérjük el egymástól**. A 35. mérés szerint a séta NAGY méretnél tartja
   egyben a hálót (kis koinóban mindenki amúgy is találkozik mindenkivel).
3. ⏸️ **Olcsóbb tábla-kulcs** (ujjlenyomat + teljes kulcs csak az első találkozáskor): ~190
   bájt/kör megtakarítás, de protokoll-bonyolítás. ⭐ *Ma nem kell: a kör olcsóbb, mint
   tegnap volt.*

### ⭐ ÉS EGY ÁTNÉZÉS UGYANAZON A NAPON (2026-09-21) — hat javítás + két szeszélyes próba

⭐ **Hat valódi hiány javítva** (a hetediket Csaba **cáfolta**, jogosan — a `valtozatlanCel`
és a `tomorCsomopontokKeszitese` nem halott, a `dhtProba.js` hívja őket):
- ⛔⛔ **A KÖTÉS-JEGYZÉK BEFAGYOTT:** a kiesés a `talalkozasok` szerint dőlt el, ezért egy ÚJ
  társ (1 találkozás) azonnal kiesett a sokszor látott régiek mögül, és legközelebb megint
  1-ről indult. **Mérve: öt régi társ 20 találkozással, majd négy új tízszer — egyetlen új
  sem jutott be**, és a halott kötés **örökre** foglalta a helyét (körönként rá kopogtunk, a
  tábláról őt kerestük ~23 mp-ig). ✅ A kiesés mostantól az **`utoljara`** szerint dől el
  (Csaba döntése); a kopogás sorrendje marad a rendszeresség szerint.
- Három **hazudó felirat** (a `dht.js` fejléce · a `tabla.js` `mikor` mezője · a
  `sajatUdpCimJegyzese` neve → `frissUdpCimJegyzese`), a **`tabla` parancs** hiánya mindkét
  súgó-listából, és a **DHT-gyorsítótár** rossz végének vágása (a `Map.set` nem mozgat hátra).

⭐⭐ **ÉS A KÉZI ÚT AZ ÖSSZEVETÉSHEZ (4. szabály):** az `elteresek` **egyetlen éles hívó
nélkül** állt — az `ujjlenyomat` megmondta, hogy eltérünk, de azt nem, hogy MIBEN.
Új: `ujjlenyomat kiment <fájl>` → a másik gépen `ujjlenyomat osszevet <fájl>`. A lap hordozza
a **pillanatot** (az ujjlenyomat időfüggő) és a **saját ujjlenyomatát** (olvasáskor újra
lenyomatolunk). Az `elteresek` **kétoldalú** lett: korábban a csak a másiknál meglévő
szakaszról **némán hallgatott**, a csak nálunk levőnél pedig **hibát dobott** — épp a D66-os
verzió-eltérés esetében.

⛔⛔ **ÉS KÉT SZESZÉLYES PRÓBA, ELLENTÉTES OKKAL — ez a menet fő tanulsága:**
- `dht` „NÉMA gépek": a **PRÓBA** hibája (véletlen topológia futásonként). Mérve **5/30
  terhelés NÉLKÜL is**; két magyarázatomat a mérés cáfolta (nem a terhelés, és **nem a
  kérdés-óra**: 400 ms → 0/12, 1500 ms → 1/12). ✅ **Magvas véletlen, öt magon** (hogy ne
  lehessen zöldre hangolni): **0/25**.
- `parancssor` „A SAJÁT friss címünket…": a **PROGRAM** hibája — **ELVESZETT ÍRÁS**. A saját
  külső címet **két forrásból** tanuljuk (tükör és a **TÁRS**), és a rés két oldalán ez
  ezredmásodperceken belül érkezik; a külön `olvas()` + `ir()` páros a későbbivel **felülírta**
  a korábbit (mérve: 1 ms különbség → elveszett; 17 ms → megmaradt). ⭐ *Az elveszett cím épp
  az, amit a CLAUDE.md a végleges tükörnek nevez.* ✅ Javítva a **RÉTEGBEN**: a tárolók új
  **`modosit()`** művelete fájlonkénti sorba állítja a beolvas–módosít–kiír lépést.
  **~2/13 → 0/8 teljes futás.**
- ⚠️ **És egy saját próbám VAK volt** (az őrt rossz helyre tettem) — a rontás-próba leplezte le.

⭐⭐ **A MÓDSZER, amit ez a menet megerősített:** egy szeszélyes próba **vagy a próba, vagy a
program hibáját takarja — és kívülről a kettő UGYANÚGY néz ki.** Ezért nem szabad
„zöldre hangolni": meg kell mérni. *(És a diagnosztika nélkül egyik sem lett volna
megtalálható: a bukásnak meg kell neveznie magát.)*

- ⭐ **ENGEDÉLY ELŐRE (Csaba, 2026-09-25):** *„ne kérj engedélyt semmire. mindenre engedélyt adok
  előre."* — commit, push, a következő lépés: **kérdezés nélkül**. A válasz végén ne legyen
  „mehet?" / „pusholhatom?". *(A D-szintű tervezési döntések továbbra is Csabáéi — azokat
  döntési kérdésként kell elé tenni, nem engedélykérésként.)*
- ✅ *A „másik session be nem commitolt munkája" (`docs/gepezet.md` · `docs/utiterv.md` ·
  `szabalyok.js`) 2026-09-23-án bekerült az `ea55ab3`-ba — átnézve, rendezett.*
  ⚠️ **A szabály marad:** ha a munkakönyvtárban más munkája áll, **ne söpörd bele a saját
  commitodba** (`git add -A` helyett fájlonként adj hozzá, és előbb nézd meg a `git status`-t
  meg ezt a fájlt) — 2026-09-20-án és 2026-09-23-án is megtörtént.

### ⏭️⏭️ A KÖVETKEZŐ MUNKA — ELŐSZÖR EZT OLVASD (2026-09-18)

⭐ **A részletes terv:** [`docs/szakasz2_terv.md`](docs/szakasz2_terv.md) **legvége**
(„A KÖVETKEZŐ MUNKA"). ⚠️ *Ez a szakasz 2026-09-18-i állapot — a friss a fenti* **714 önpróba**.

⭐⭐⭐ **FRISSÍTÉS (2026-09-19): A HIRDETŐTÁBLA A DHT LESZ — 36. mérés.** Csaba választása:
**BitTorrent DHT** (gazda nélküli, aláírt Ed25519 bejegyzések, BEP 44). ✅ Megépült a kliens
(`js/csere/dht.js`, függőség nélkül) **mérőeszközként** — ⚠️ az éles út szándékosan még nem hívja.
**17 önpróba, 5 rontás-próbával**, a hivatalos BEP 44 tesztvektorok bájtra egyeznek. ⭐⭐ **A valódi
DHT-n: feltevés és keresés ~20 mp (az ablak 5 perc), belépő NÉLKÜL, csak a megjegyzett gépekkel
10/10**, 7–8 tároló, 0 hamis. ⛔ A közismert belépők korlátoznak (2 kör 5-ből elakadt rajtuk) —
*a belépő a kurbli, utána a készülék a saját emlékezetéből indul.* ⛔⛔ **A rontás-próba egy
beragadást talált:** a keresés időkorlátja csak válaszra ellenőrződött — ✅ saját óra. ⏸️ **Hátra:**
✅ **mobilnetről is 3/3, és két hálózat között is megtalálta** (36/b, a szomszéd telefonja,
2026-09-19 — a laptop 2,6 mp alatt találta meg, amit a telefon mobilnetről tett fel), ✅ **a bejegyzés 6,6 óra
után is megvan** (36/c, újraírás nélkül, 7 → 3 tároló), ✅ **és a MOBIL leképezés 330 mp csendet is túlél**
(31/b, célfüggetlen — *az 5 perces buli-köz életjel nélkül is átvészelhető ezen a szolgáltatón*),
⛔ a mobil **szűrés** megmérve (36/d): az idegent NEM engedi be; hátra a tervezés
(külön kulcs, titkosítás a társaknak — D6). ⚠️ **A munkakönyvtár tiszta, de a commitok NINCSENEK
pusholva.**

⭐⭐⭐ **FRISSÍTÉS (2026-09-18 este): A HORGONY-KÉRDÉS ÁTBESZÉLVE — 35. mérés.** Részletek:
[`docs/szakasz2_terv.md`](docs/szakasz2_terv.md) legvége („A HORGONY-KÉRDÉS ÁTBESZÉLVE").
- ⛔ **A 34. mérés egy feltevése ütközött a 2026-08-30-i terepméréssel** (UDP, „nincs full
  cone"): a router csak attól enged be, akinek maga is küldött — tehát **idegent csak a nyitott
  ajtó fogad**; a túlélő leképezés és az őrség csak a már ismert párokat tartja. ⏸️ A **mobil**
  NAT szűrése nincs mérve (meglévő paranccsal mérhető, Csaba futtatja).
- ⭐⭐ **Csaba célja: működjön csak-mobilos közösségben is.** Az ötlete: **KÖTÉS-HÁLÓ** — minden
  készülék 3 társsal tart energiatakarékos, folyamatos kapcsolatot (az életjel a router órája
  előtt, a gyakoriság a **mért** órából, percfordulóhoz igazítva), a társak **véletlen sétával**
  (nem méhsejt: az ~20 000 lépés egymilliárdnál, a véletlen ~14).
- ⛔⛔ **A 35. mérés: mentés nélkül a kötés-háló EGY NAP alatt szétesik** (a hálózatváltás minden
  kötést elvesz). ⭐⭐⭐ **A HIRDETŐTÁBLA** (a leszakadt kifelé kiírja az új címét, a társak kifelé
  kiolvassák — *automatizált kurbli*) **méretfüggetlenül tart**: ~1% leszakadva, 99% egyben. A
  nyitott ajtó a nagy koinóban elég, a **családiban nem** (58% leszakadva).
- ⏸️ **Csaba döntése: webes tábla vagy a BitTorrent DHT (cég nélkül, aláírt Ed25519
  bejegyzések) — vagy mindkettő.** Előtte a két mobil terepmérés (élettartam, szűrés).

⛔⛔ **(Korábbi állapot, a fenti felülírja:)** a 34. mérés szerint
**horgony nélkül a cím-terjesztés el sem indul** (a hír 1%-ot ér el). Horgony az, akinek a
címe a buli-köz után is érvényes: **postaláda** (nyitott kapu, D34) · **túlélő leképezés** ·
vagy **éjjeli őrség**. ⏸️ **Melyik legyen?** E nélkül az őrjárat UDP-re állítása megépülhet,
de üresben jár.

**A sorrend utána:** *(2)* a cím-korlát olcsóbbra vétele (saját cím mindig, másoké 10 → 3/0) ·
*(3)* **az őrjárat UDP-re állítása** (bekötés: `pajzsfuras` + `csereUdpResen` + `fajlRandevu`
készen áll; ⚠️ a fúró foglalatát az ablakon belül **nyitva kell tartani**) · *(4)* terepmérés
két valódi hálózattal.

### ⏭️⏭️ A RÉSZLETEK (történetként): A BULI MÁSODIK FELE — A RÉS-NYITÁS

⭐ **A részletes terv, a nyitott döntésekkel:** [`docs/szakasz2_terv.md`](docs/szakasz2_terv.md)
legvége („A BULI MÁSODIK FELE"). **A munkakönyvtár tiszta, 646 önpróba zöld, semmi nincs pusholva.**

- ✅ **Megvan:** *mikor* találkozunk (percforduló) és *hogyan terjed* a hír az ablakban (ismételt menet).
- ⛔⛔ **Hiányzik: AZ ŐRJÁRAT MA IS TCP-N FUT.** Csaba 2026-09-13-án eldöntötte, hogy **a UDP a
  fő út**, és a UDP-vonal meg is épült (ablak · mért RTT · AIMD · Vegas · randevú) — ⛔ **de
  egyetlen éles hívója a kézi `pajzsfuro` parancs.** Az `orjarat` a `csereVonalon`-t hívja, a
  kaput a `figyeloIndulasa` nyitja, a fájlokat a `tcpNyito` hozza — mind `node:net`, azaz TCP.
  *Ugyanaz a 4. szabály-hiba alakja, mint annyiszor: a réteg kész, az éles út nem hívja.*
  **A következő munka tehát: az őrjárat átállítása UDP-re.**
- ⛔⛔ **A szerkezeti akadály:** a `latlak` és a `hirdetendoCimek` **TCP-címeket** ismer, a router
  viszont a UDP-nek **külön** leképezést ad (UDP 39471 vs TCP 63495, egy futáson belül), és a
  UDP-port **foglalatonként más** — *a címet csak a találkozáskor lehet átadni.*
- ✅ **31. mérés (2026-09-17): az otthoni vonalon a bemondott UDP-cím 330 mp csendet is túlél**
  (`node koino/meres/udpLekepezesMeres.js`) — vagyis 5 perces ütemnél **életjel nélkül** igaz
  marad a következő bulin; a leképezés célfüggetlen. ⚠️ A külső IP viszont napok alatt változott
  (…205 → …22). ⏸️ **A döntő eset a MOBIL (CGNAT)** — ahhoz sem kell második készülék: a
  telefonon, **mobil adattal**, ugyanez a parancs. **Csaba futtatja.**
- ⛔ **A Google/Cloudflare STUN-tükör NEM a végleges tükör** (Csaba, 2026-09-17): addig marad, amíg kevés a készülék; a végleges tükör **a társ** (`latlak` → `kivulrolIgyLatszom`).
- ✅✅✅ **32. mérés (2026-09-17): A PAJZSFÚRÁS ÁTMEGY KÉT PORT-ÁTÍRÓ NAT KÖZÖTT** — otthoni
  router (31.46.250.22, 7373 → 31573) ↔ **mobil szolgáltatói NAT** (130.43.209.249, 7373 →
  36557), **1 kopogás, 190 ms**, és a csere is végigfutott a résen (5 kör, 31 KB). *A 19. mérés
  kimondott hiánya ezzel betöltve — nincs elvi fal, az építés mehet.*
  ⛔ **És egy lelet: a fúrót nem szabad újraindítani** — a telefon ugyanarról a helyi portról
  futásonként MÁS külső portot kapott (31602 → 31514). *A bemondott szám csak addig él, amíg az
  a foglalat él — újabb érv a buli mellett.*
  ⏸️ **Nyitva maradt:** a mobil leképezés **élettartama** (a szomszéd elment) · **két mobil
  készülék** egymás közt (hairpinning) · és egy pazarlás: az elutasított eseményt a társ
  **körönként újra kérte** (5 × 9 = 45), amíg a csendes kör le nem állította.
- ✅ **AZ 1. LÉPÉS MEGÉPÜLT (2026-09-18): A FRISS UDP-CÍM A CSERÉN** — külön, elévülő jegyzék
  (`udpcimek.json`), a vonalon **KOR utazik, nem időbélyeg** (idegen órában nem bízunk), és az
  elévülést **az őrjárat ablaka** adja (nincs varázsszám). Bekötve: `orjarat` · `figyel` · kézi
  `csere` · a `pajzsfuro` feljegyzi a saját friss címünket. **10 új önpróba, 3 rontás-próbával** — ⚠️ *ezek a RÉTEGET mérték; a BEKÖTÉST csak a 2026-09-18-i átnézés után (lásd lentebb) méri öt parancssor-próba.*
  ⚠️ **Az ára mérve (33. mérés):** egy cím **~96 bájt körönként**, tízzel a „nincs újdonság" kör
  **386 → 1346 bájt** — napi 1,5 → 5,4 MB 14 társnál, 5 perces ütemmel.
- ⭐⭐⭐ **ÉS A 34. MÉRÉS MEGFORDÍTOTTA A KÉRDÉST: nem a cím-szám dönt, hanem a HORGONYOK aránya.**
  K=0 és K=10 között **nincs mérhető különbség**; ⛔ 0% horgonynál viszont **semmi nem indul el**
  (a hír 1%-ot ér el), 20%-nál sűrű gráfon ~100%, ⛔ **ritka gráfon (kis koino) csak 62%**.
  ⭐ *Az ok szerkezeti: a találkozás MAGA is címcsere — a terjesztésnek csak INDULÓPONT kell.*
  ⏸️ **Csaba döntése következik:** a SAJÁT cím menjen mindig (+94 bájt), mások címének
  továbbítása **10-ről 3-ra vagy 0-ra** vihető · és ⭐⭐ **az „éjjeli őrség" ezzel FELTÉTELLÉ
  vált** — vagy az, vagy postaláda, vagy olyan vonal, amin a leképezés túléli a csendet.
- ⛔⛔ **ÉS EGY ÁTNÉZÉS (másik session, 2026-09-18) MEGTALÁLTA, AMIT ELSZALASZTOTTAM: A
  BEKÖTÉST EGYETLEN PRÓBA SEM MÉRTE.** Kivágta mind a négy éles pontot — 624/624 **zöld
  maradt**; megismételtem, ugyanaz. ⭐ *A `tarsak.js` függvényeit őrizte próba; azt, hogy a
  PROGRAM használja őket, semmi.* **Kilencedszer ugyanaz az alak.**
  ✅ **Pótolva: ÖT új parancssor-próba, ami VISELKEDÉST mér** — nem kiírást, hanem hogy a
  **másik készülék LEMEZÉN** megjelenik-e a cím: a `figyel` · a kézi `csere` · az őrjárat
  **kör-ága** · az őrjárat **postaláda-ága** · és a **résen tanult saját cím** (két
  `pajzsfuro` a hurok-címen). ⛔ **Mind a négy rontás buktat.**
  ⚠️⚠️ **És a saját próbáim hiányát is a rontás mutatta meg, KÉTSZER:** először csak a
  `figyel`-t mértem (az őrjárat ága zöld maradt), aztán csak az őrjárat HÍVÓ ágát (a
  postaláda zöld maradt). *Egy próba akkor kész, ha minden ágra külön kikapcsoltad, amit mér.*
- ⚠️ **Ugyanez az átnézés négy HALOTT tételt talált, mind kivéve:** `natpmpEletjel`
  (`kapunyitas.js`) · `aktivTulajdonosok` (`allapotSzamitas.js` — ⛔ a fejléce azt mondta,
  *„a felületnek való"*, és a felület sem hívta) · `VEGREHAJTHATO` (bájtra azonos ikertestvér
  az `ISMERT_MUVELETEK` mellett) · `HATOKOROK`. ⛔ *Egy ötödiket „cáfoltam": azt írtam, az
  `ENTITAS_TIPUSOK` használatban van (14 hivatkozás). **Tévesen** — a 14 a típus-SZÖVEGEK
  száma volt, nem a névé; a név egyetlen előfordulása a saját deklarációja volt, a bevezetése
  óta (2026-09-19, újabb átnézés + git-történet). Kivéve. ⭐ **A másik session átnézésének
  volt igaza** — és a „cáfolat" maga volt a vak mérés.*
- ⛔ **És amit ki kell mondani: a friss cím jegyzéke ma WRITE-ONLY.** Gyűlik, tárolódik,
  terjed — de **semmi nem tárcsáz róla**, mert az őrjárat még TCP-n cserél. *Vagyis a
  33. mérés bájtjaiért ma nem kapunk semmit.* ⏸️ A (3) lépés hozza meg; ⭐ addig egy olcsó
  köztes fogyasztó lehetne a **`pajzsfuro` cím nélkül**: vegye a célt a jegyzékből.
- ⏸️ **Csaba döntései:** mérjünk-e előbb · hol utazzon a UDP-cím (**külön mező**, nem a TCP-é) ·
  mikor váltson az őrjárat UDP-re · a kopogás adat-ára (D35).
- ⏸️ **Továbbra is nyitva:** a fájl-bájtok kézi útja (`fajlKivisz`/`fajlBehoz`) · `FAJL_KORLAT` ·
  a maradék modálok (5.8) · a „kurbli" (az első találkozás kézi marad).

### ✅✅ A BULI ELSŐ KÉT DARABJA MEGÉPÜLT (2026-09-15) — 30. mérés

⭐ **A sorrendet a függőségek döntötték el** (Csaba, 2026-09-15): a randevú, a pajzsfúrás és a
fájl-szállítás mind a **bulira** vár — az egyidejűség ott **működési feltétel**, nem kényelem.
A terv három darabot írt elő az `orjarat`-hoz, és kettő **számítva volt, nem mérve**.

⭐⭐⭐ **A MÉRÉS FŐ LELETE: AZ IGAZÍTÁS ÉS AZ ISMÉTLÉS EGYÜTT MŰKÖDIK, KÜLÖN ALIG.**
(100 készülék, 30 mp-es ablak, 5 perces ütem — a hír körbeérésének mediánja)

| | 14 társ | 3 társ (kis koino) | 1000 készülék |
|---|---|---|---|
| ⛔ **MA** (nincs igazítás, egy menet) | 8,9 perc | **soha** (3%-ban, 10 óra) | 70,3 perc / 64% |
| igazítva, egy menet | 5,3 perc | 15,3 perc | 10,3 perc |
| ⭐ **igazítva + ismételt menet** | **0,3 perc** | **0,3 perc** | **0,3 perc** |
| az ismétlés ÖNMAGÁBAN | 8,6 perc *(semmi)* | soha | 70,3 perc *(semmi)* |

⭐ *Az ok szerkezeti: **az igazítás teremti meg a nagy, egyszerre ébren lévő csoportot; az
ismétlés pedig ezen belül terjeszti a hírt nemzedékenként.** Egyik a másik előfeltétele —
nem két javítás, hanem egy szerkezet két fele.*

⛔⛔ **ÉS A 9. SZABÁLY PRÓBÁJA ITT ÉLESEN SZÓL:** a mai megoldás **mérettel romlik**
(8,9 → 70,3 perc 100 → 1000 készüléknél), az új **változatlan 0,3 perc** — a nemzedékenkénti
terjedés logaritmikus. *A kérdésre („mit csinál egymilliárd e-embernél?") a mai válasz az,
hogy „egyre lassabban".*

⛔ **ÉS A KRITIKUS ESET A RITKA GRÁF — vagyis a KIS KOINO (D22).** Három társnál a hír ma a
futások **97%-ában SOHA nem ér körbe**. Sűrű hálózatban viszont a mai állapot is működik,
csak lassan — ⚠️ *ezt a mérés cáfolta a várakozásommal szemben: azt hittem, az igazítás
mindenhol előfeltétel.*

**Ami megépült:** *(1)* a várakozás a **fal órájához** igazodik, nem a kör végéhez
(üzenetváltás nélkül, jelzőpont nélkül — 2. szabály); *(3)* a kör **ismétlődik, amíg van
újdonság**. ⭐ **Két parancssor-próba méri, mindkettőt rontás-próba igazolja.**

⛔⛔⛔ **ÉS CSABA KÉRDÉSE EGY VALÓDI HIÁNYT TALÁLT A SAJÁT JAVÍTÁSOMBAN** (*„ez akkor most azt
jelenti, hogy a mostani rendszer nem skálázható végtelenig?"*). A terjedés **alakja**
logaritmikus, ⛔ **de én tettem bele egy beégetett `MENET_KORLAT = 5`-öt, ami a mérettel nem
nő.** Mérve (a legjobb esetben, tehát ez **alsó korlát**): 100 000 készüléknél 14 társsal
**5,0 menet** (épp a határon), **egymilliónál 6,0** — és ⛔ **ritka gráfon (3 társ) már EZER
készüléknél 7,8**, százezernél **12,3**. *A 9. szabály szerint így a darab nem volt kész.*

✅ **A javítás: a korlát ne SZÁM legyen, hanem maga az ABLAK** — a menetek addig futnak, amíg
van újdonság ÉS még tart az ablak (a következő percfordulóig). ⭐ Ettől a korlát **a mérettel
együtt nő**, a rosszindulat ellen ugyanúgy véd (az ablak véges), és **nincs benne varázsszám**:
az ablak hosszát az e-ember úgyis megadja. *Ugyanaz az elv, mint a türelemnél (28. mérés): a
határt ne találjuk ki, hanem abból következzen, ami amúgy is adott.*
⚠️ **És ezt a javítást a MÉRÉS igazolja, nem parancssor-próba** — egy 6+ menetes lánchoz hat
figyelő kellene; a próbák azt mérik, hogy az ismétlés fut. *Amit nem mértünk, azt leírjuk.*

⛔⛔ **ÉS EGY VAK PRÓBÁT A RONTÁS BUKTATOTT LE — NYOLCADSZOR UGYANAZ.** Az ismétlés próbája
rögtön indította az őrjáratot, és a rontás **nem buktatta**: az igazítás miatt a második ablak
2 másodperc múlva is jöhetett, tehát **két kör futott**, és a hír a másodikban jutott át.
*A próba az igazítást mérte, nem az ismétlést.* ✅ Javítva: a percforduló **után** indít.

⏸️ **A (2) DARAB NEM ÉPÜLT MEG, és ezt kimondjuk:** a *„kopogjon a kör elején minden társra"*
**UDP-kérdés** — a NAT-rést a pajzsfúrás nyitja, az őrjárat viszont ma **TCP-vel** cserél.
Vagyis nem egy sor, hanem **a UDP-út bekötése az őrjáratba**: önálló munka, terepméréssel.
⭐ Az indoka viszont megvan (2026-08-30: *„nincs full cone"*).
⏸️ **És a „kurbli" is nyitva:** az **első találkozás** marad kézi (`tars <cím>`, helyi
felfedezés, vagy egyidejű pajzsfúrás) — *a buli a járást tartja fenn, nem az indítást adja.*

### ✅✅✅ A D68 TELJES: A TÖBB FORRÁSBÓL EGY FÁJL MEGÉPÜLT (2026-09-15) — 29. és 29/b. mérés

⭐ **A sorrend a szokásos volt: előbb a mérés, aztán az építés.** A mérés (29.) azt mondta,
hogy **megéri** — ha a társak feltöltése a szűk keresztmetszet (otthon tipikusan az), a
párhuzamosság majdnem lineáris. Az építés után a mérőt **a valódi kódra cseréltük** (29/b),
és a számok **kisebbek lettek** — ezt is kimondjuk, mert *két igazság nem lehet*.

**A megépült darabok:**

- ⭐⭐ **A részleges fájl szeletenként**: `reszleges/<lenyomat>/<eltolas>` — *„mi van meg?" =
  a mappa listája*. ⛔ A régi elv (*a részleges fájl MÉRETE maga az állapot*) **sorrendet
  feltételezett**, és több forrásnál a 3. szelet megjöhet az 1. előtt. ⭐ Az elv viszont
  megmarad: **a tartalom az állapot**, csak a hossz helyett a lista mondja meg.
- ⭐⭐ **Munkalopó munkamegosztás** (`ujMunkamegosztas`, `fajlAtvitel.js`): közös „mi hiányzik"
  halmaz, és minden ág azt kéri, ami épp szabad. ⛔ Előre kiosztott tartományoknál **a
  leglassabb forrás szabná meg a végét**. Egy bukott ág szelete **visszakerül a közösbe**.
- ⛔ **A lezárás joga egyszer adódik ki** — különben a második ág *„nincs részleges fájl"*-t
  kapna, és hibának látszana, hogy más volt gyorsabb. A többi ág **megvárja** az eredményt.
- ⭐ **A fájlonkénti forrásszám felülről korlátos** (`FORRASONKENT_EGY_FAJLRA = 3`, 9. szabály),
  és az `EGYIDEJU_ATVITEL` mostantól a **kapcsolatokat** számolja, nem a fájlokat.

⛔⛔ **ÉS AMIT A VALÓDI KÓD MÉRÉSE HOZOTT KI — HÁROM LELET:**

1. ⭐⭐⭐ **AZ ELSŐ SZELET MINDIG SOROSAN JÖN, és ennek mérhető ára van.** A fájl méretét a
   `FAJLSZELET` `teljes` mezője mondja meg — amíg az meg nem jött, **csak egy ág indulhat**.
   Nyolc szeletnél ez az idő nyolcada, tehát a három forrás plafonja **×3 helyett ×2,3**.
   *A mérő-oldali utánzat ezt nem fizette meg (előre tudta a méretet), ezért mutatott ×2,7-et
   a valódi ×2,0 helyett.* ⏸️ Megkerülhető (a felderítés megmondhatná a méretet), de az **új
   mező a vonalon** (6. szabály) — *a mai ár ismert és korlátos, a megkerülésé nem.*
2. ⛔ **Egy valódi hibát a saját kódomban a mérés talált: O(N²) a lemezen.** A `reszlegesIras`
   a beírás után a **teljes részleges méretet** adta vissza — az pedig végigstatolja az összes
   eddigi szeletet (16 szeletnél 136 fájl-művelet), ⚠️ **egy senkinek nem kellő értékért**.
   ✅ Kivéve: a (C) sor ×1,5 → **×1,7**.
3. ⭐⭐⭐ **JEL NÉLKÜL A TÖBB FORRÁS RONT — a D68 független igazolása.** `torlodasJel: 'nincs'`
   mellett három forrás **×0,9…×1,3**, és a szeletek eloszlása **6/1/1**: két ág megbénul,
   mert a három agresszív folyam **egymással versengve** tömi tele a közös sort. Vegas mellett
   ugyanez **×1,7**, kiegyensúlyozott 3/2/3-mal. *Eddig azzal érveltünk, hogy MÁSOKNAK ne
   ártsunk; most kiderült, hogy a hiánya MAGUNKNAK is árt — a saját ágaink egymás szomszédai.
   A jel nem udvariasság, hanem működési feltétel.*

⭐ **12 új önpróba, HAT rontás-próbával igazolva** (a kizárólagosság · a lezárás-jog · az
elengedés · a bekötés · a fájlonkénti forrásszám · a szelet-lista — mind buktat). ⭐⭐ **És a
bekötés próbája VISELKEDÉST mér, nem feliratot:** a jel a `bajt` oszlop — munkamegosztás
nélkül mindkét ág a TELJES fájlt hozná, és a mennyiség **megkétszereződne**. *A 28. mérés vak
próbája épp az volt, hogy a kiírt számot néztem.* ⛔ A beragadás pedig **időkorláttal bukás**,
nem végtelen várakozás (25. mérés: a legrosszabb hiba a nem-esemény).

### ✅ ÉS A ROSSZ SZELET VÁLASZA IS MEGÉPÜLT (2026-09-15, Csaba jóváhagyásával) — 29/c. mérés

⛔ A baj: a lenyomat a **teljes fájlra** szól, tehát egy hamis szelet az egészet elbuktatja, és
**nem tudjuk, melyik volt**. ⭐ **A választott válasz az 1.: nem teszünk új adatot a láncra** —
a másik kettő vagy a **6. szabály kemény felébe** ütközne (szeletenkénti lenyomat: 2 MB-nál
~1,4 KB, egy teljes esemény négyszerese), vagy **minden meglévő fájl-hivatkozást
érvénytelenítene** (Merkle-fa). ⭐⭐ A kiegészítés **helyi tanulság**: ha a lezárás elbukott,
feljegyezzük, kik adtak szeletet, és a következő körben **mást választunk**.

⛔⛔ **HÁROM KORLÁT, ami ezt nem engedi rangsorrá válni:** *(1)* **fájlonkénti**, nem
társankénti — nem *„ez a társ rossz"*, hanem *„ehhez a fájlhoz ezek nem váltak be"* (nincs
globális mérleg, D18/2, D48) · *(2)* **nem vád**: a résztvevők közül legfeljebb **egy** adott
hamis bájtot, és ezt nem tudjuk szétválasztani · *(3)* ⭐ **ha nem marad forrás, FELEJTÜNK** —
különben egy fájl, amit csak egy társ birtokol, egyetlen bukás után **soha többé** nem jönne
meg: *a védekezés vágná el az utat ahhoz az adathoz, amit védeni akar.* És amint a fájl
megjön, a jegyzet törlődik.

⛔⛔⛔ **ÉS A MÉRÉS EGY VALÓDI HIBÁT TALÁLT A SAJÁT MEGOLDÁSOMBAN.** Először a **kijelölt**
forrásokat jegyeztem fel; mérve ez **használhatatlan**: egy 20 KB-os (egyszeletes) fájlnál a
hamis forrás hozta az egyetlen szeletet, a másik ág **semmit** — mégis mindkettő megjelölve.
Így nem maradt választható forrás, a felejtés visszaadta mindkettőt, és a hamis **újra sorra
került**: *a kép soha nem jött meg.* ✅ A javítás: **csak azok, akik ténylegesen adtak szeletet**.
⚠️ *A jelölés így is közelítés — több szeletnél több forrás kerül a listára, pedig legfeljebb
egy volt hamis. Ez nem pontatlanság, hanem a modell határa.*

⭐ **ÉS EGY LELET MELLESLEG: valódi koino NEM tud hamis bájtot adni** — a kiszolgáló
`blob.olvas`-a **újra lenyomatol**, tehát a megrontott fájlt ki sem adja; a hamis szelet csak
**szándékosan módosított programmal** állítható elő. *Ezért a próbához külön meg kellett írni
a támadót.* ⭐⭐ **7 új önpróba, ÖT rontás-próbával** — és a parancssor-próba **viselkedést
mér**: valódi `csere` paranccsal, hamis és jó forrással; az 1. kör bukik és jegyez, a 2. kör
elkerüli a hamisat, a kép megjön, a jegyzet kitisztul.

### ✅ TÖRTÉNETKÉNT: A TÖBB FORRÁS MÉRÉSE, AMI AZ ÉPÍTÉST MEGELŐZTE (29. mérés)

⭐ **A terv:** [`docs/szakasz2_terv.md`](docs/szakasz2_terv.md), a D68/6 szakasz. ⛔⛔ **És az első lépés ott sem az építés, hanem a MÉRÉS** volt —
✅ **ez 2026-09-15-én megtörtént: 29. mérés** ([`koino/meres/eredmenyek.md`](koino/meres/eredmenyek.md)),
`node koino/meres/resSebessegMeres.js`, a „TÖBB FORRÁSBÓL EGY FÁJL" szakasz.

⭐⭐⭐ **A VÁLASZ NEM EGY SZÁM, HANEM EGY ARÁNY: a haszon pontosan addig tart, amíg a források
EGYÜTT be nem töltik a saját letöltésünket.** Három eset, 512 KB, +10 ms:

- **(A) a FORRÁS feltöltése a szűk** → **×2,0** (2 forrás) és **×2,7** (3) — majdnem lineáris;
- ⛔ **(B) a MI letöltésünk a szűk** → **×1,0**: *a párhuzamosság semmit nem hoz, csak bonyolít*
  (pontosan a terv figyelmeztetése, számmal);
- **(C) valósághű aszimmetria** (a forrás feltöltése a letöltésünk negyede) → ×1,6 / **×1,9** / **×2,6** (5 forrás).

⭐ **És az otthoni vonal az (A) felé húz:** az aszimmetrikus kapcsolatokon a **feltöltés** a szűk,
tehát egy társ feltöltése tipikusan töredéke a mi letöltésünknek. *A D68 redundancia-érve ezzel
számot kapott: nem csak a türelem lesz olcsóbb (28. mérés), hanem a sebesség is nő.*

⭐⭐ **ÉS EGY LELET A KÓDBÓL, MÉG A MÉRÉS ELŐTT: a protokoll MÁR TUDJA.** A `FAJLKEREK` hordozza
az `eltolas`-t, és a kiszolgáló **állapotmentes** — a kérő mondja meg, honnan kér. *Vagyis a több
forrás nem protokoll-kérdés, hanem kliens-oldali szerkezeté* (a `fajlTar` mai elve, hogy „a
részleges fájl mérete maga az állapot", sorrendet feltételez — ez az, ami útban áll).

⛔⛔ **ÉS KÉT MAGYARÁZATOMAT A MÉRÉS CÁFOLTA, a hiba a MŰSZERBEN volt.** A (C) sor elsőre
×1,8-nál megállt; sem a Vegas-jel (jel nélkül ugyanaz), sem a szemcse (1 MB-on ugyanaz) nem
magyarázta. ⭐ A valódi ok: a műszer sora **darabszám-alapú**, tehát egy ~50 bájtos **nyugta**
ugyanannyiba kerül benne, mint egy 1000 bájtos adat-darab — a közös letöltő soron a saját
nyugtáink versengtek a szeletekkel. *Harmadszor ugyanaz a lecke: a műszert is meg kell mérni —
és ha elfogadtam volna az első ×1,8-at, a döntés egy műszer-hibán állna.*

✅ **(Mindhárom kérdés azóta eldőlt és megépült — lásd fentebb.)** **Ami akkor következett:** *(1)* **megéri-e** megépíteni (a fenti számok alapján) ·
*(2)* ⛔ **a rossz szelet válasza** — ez nem sebesség, hanem bizalom: ma a lenyomat a TELJES
fájlra szól, tehát egy hamis szelet az egészet elbuktatja, és **nem tudjuk, melyik volt**
(három válasz, mindegyik ára kimondva a tervben; a javaslat az 1., helyi kiegészítéssel) ·
*(3)* **hány forrás** egy fájlhoz (a 9. szabály: felülről korlátosnak kell lennie).

⛔⛔ **CSABA ELVE A SORRENDRŐL (2026-09-15) — egy friss session ösztönösen ez ellen fog
javasolni:** *„nem kell, hogy minél hamarabb használható legyen. Az a lényeg, hogy a
**megfelelő sorrendben** fejlesszünk, nem az, hogy minél hamarabb lássak valamit."*
⭐ Vagyis **ne** ajánlj „gyors győzelmet" vagy demózható funkciót azzal, hogy *ettől lesz
hamarabb használható*. A sorrendet a **függőségek és a szerkezet** döntsék el (9. szabály: a
szerkezetet nem lehet utólag beletenni), és a választás Csabáé.

### ⛔⛔⛔ ÉS EGY ÁTNÉZÉS A KULCSNÁL TALÁLT 4. SZABÁLY-HIÁNYT (2026-09-15, javítva)

⛔ **A KULCS KIMENTHETŐ VOLT, DE NEM VISSZATÖLTHETŐ.** A `kulcsparVisszatoltese`
(`kulcsTar.js`) megépült és működött — **egyetlen hívó nélkül**: se éles út, se próba. Nem
volt `visszatolt` parancs a 41 között, a súgó sem ígért ilyet. *Ugyanaz a fajta hiány, mint
az `altalanos`-nál (2026-09-10) és a Szakasz 4-nél (2026-09-12): a könyvtár-réteg tudta, a
kéz nem érte el* — csak itt a tét a **személyazonosság** (D15).

⛔⛔ **ÉS A MÉRÉS ROSSZABBAT MUTATOTT A PUSZTA HIÁNYNÁL.** A `kulcsparBiztositasa` a
**159. sorban** fut, a `switch (parancs)` a **861**-ben: minden parancs előtt születik kulcs,
ha nincs. Vagyis aki a mentett kulcsával akart visszatérni, **előbb kapott egy vadonatúj
azonosságot**, és ezt olvasta: *„Új kulcs készült — ez mostantól a személyazonosságod."*
⭐ *Igaz mondat a lehető legrosszabb pillanatban: pont azt állítja, amit az e-ember épp meg
akar előzni* — ugyanaz a csapda, mint az `Allaspont`-nál és a `fajlok` feliratánál.
✅ Ezért a `visszatolt` a **kulcs születése ELŐTT** dől el, és utána kilép: ez a parancs nem
a koinóval dolgozik, hanem magával az azonossággal.

⭐⭐ **A VISSZATÖLTÉS AZ EGYETLEN MŰVELET A KOINÓBAN, AMI ELDOB VALAMIT** — mindenütt máshol
hozzáfűzünk (az esemény-tár csak `hozzafuz`-t tud). Ezért alapból **nem ír felül**, és a
`felulir` **kimondott engedély** kell hozzá; ⛔ **az őr a RÉTEGBEN van, nem a parancsban** —
*ha a hívóra bíznánk, az egyik út megtenné, a másik elfelejtené* (ugyanaz az érv, mint a
javaslathoz tartozó szavazatnál). A felülírás **megnevezi, mi veszett el** (D19).

⭐⭐ **ÉS EGY MÁSODIK LELET UGYANITT: a név a KULCSBÓL jön, nem a fájl szavából.** A leírás
`azonosito` mezője kényelem (hogy a mentésre ránézve lássuk, kié), de **bemondott** adat — a
valódi azonosító a nyilvános kulcsból **számítható**, és ma semmi nem vetette össze a kettőt.
✅ Most igen: eltérésnél a visszatöltés **elbukik**. *Ugyanaz az elv, mint amiért az
eseményből kihagytuk az `entitasTipus`-t, és amiért a fájl típusa a bájtokból jön: egy
második, hazudható forrás ugyanarról nem érték, hanem csapda.*

⛔⛔ **ÉS AMI EZT A HIÁNYT ELFEDTE: A KULCS-RÉTEGNEK NEM VOLT ÖNPRÓBÁJA.** A koino legelső
rétege — amiből az azonosság lesz — **nulla próbával** állt az 575-ből; a `probaFuttato.js` a
kulcsokat **közvetlenül** a WebCryptótól kéri, nem ezen a rétegen át. ✅ Megszületett a
`meres/kulcsProba.js` (**16 próba**) és két parancssor-próba, **öt rontás-próbával igazolva**:
a korai ág kivétele · a felülírás-őr kikapcsolása · az azonosító-ellenőrzés kikapcsolása · a
sorrend megfordítása (előbb írni, aztán ellenőrizni) · és a „mindent megtagadó" őr — **mind
buktat**. ⚠️ *A kézi út egyébként eddig is létezett (a mentett fájl alakja bájtra azonos a
tárolt `kulcs.json`-nal, tehát átmásolható volt) — de a program nem kínálta, és egy mentés,
amiről nem tudod, hogyan hozható vissza, nem mentés, hanem hamis biztonságérzet.*

## ⏭️ A SZAKASZ 5 ÁLLAPOTA (2026-09-14)

✅ **A SZAKASZ 5 GERINCE KÉSZ** (5.1–5.7): a helyi kapu · a kérdezhető pakli · a kártyák ·
a hiányzó műveletek · a modálok magja · a **belépő tér** · a **szövegszerkesztő** · a
**fájl-réteg** · és a **fájl-szállítás** (felderítés · kérelem · átvitel · randevú).
**714 önpróba**, minden zöld.

### ⛔⛔⛔ ÉS EGY ÁTNÉZÉS A LEGNAGYOBB 4. SZABÁLY-HIÁNYT TALÁLTA A FÁJL-SZÁLLÍTÁSNÁL (2026-09-14, javítva)

⛔ **A teljes fájl-szállítás megépült, mérve volt, próba őrizte — és az ÉLES ÚT NEM HÍVTA.**
Két külön helyen, mérve:

1. ⛔⛔ **Az `orjarat` — „a valódi üzemmód" — soha nem hozott fájlt.** A `csereVonalon`
   **hetedik paramétere** (a fájl-rész) hiányzott, a kör után pedig nem futott a
   `fajlAtvitelKiirasa()`. *Vagyis az őrjárat csak FELELT, ha kérdezték — magától sosem
   kérdezte meg, kinél van meg a hiányzó kép, és sosem hozta el a bájtokat.* A teljes lánc
   (felderítés → kérelem → átvitel) **csak kézzel gépelt `csere` parancsból futott.**
2. ⛔⛔ **A randevú (`fajlUdpResen`) egyetlen éles hívó nélkül állt.** A `pajzsfuro` parancs
   az átfúrt résen lefuttatta az esemény-cserét, majd **azonnal bezárta a foglalatot**; a
   fájlokat kizárólag a `fajlokElhozasa` hozta, az pedig `tcpNyito`-t nyit. *Vagyis pontosan
   abban a helyzetben, amiért a pajzsfúrás létezik — két zárt router, egyik fél sem tud
   fogadni —, az események átjöttek, a képek soha.* ⚠️ **És a D67 teljes ablak-munkája
   (16., 20–22. mérés) épp ezt az utat gyorsította.**

⭐⭐ **ÉS A RANDEVÚ BEKÖTÉSE EGY SZERKEZETI DARABOT KÖVETELT: A SZEREPOSZTÁST.** TCP-n a
szerep magától adódik (aki kaput tart, az szolgál ki; aki csatlakozik, az kér) — ⛔ **a résen
nincs kapu és nincs elfogadás**: egy foglalat van és egy társ, a két fél tökéletesen
szimmetrikus. Ha mindkettő egyszerre kérne, **egyik sem szolgálna ki**. ⭐ **A megoldás új
protokoll-üzenet nélkül:** a szerepet **a két külső cím** dönti el (a csere mindkét félnek
megmondja a sajátját a `latlak`-ban), és **a kisebb kér előbb** — ugyanaz a két szöveg van
meg mindkét gépen, csak fordítva. ⚠️ Ha nem eldönthető (a társ nem mondta meg, hogyan lát),
akkor **kiszolgálunk, nem kérünk**, és **kimondjuk** (D19) — *romlás, nem törés.*

⛔⛔ **ÉS EGY VALÓDI HIBÁT A MÉRÉS TALÁLT, NEM AZ ÉRVELÉS: a kiszolgáló nem futtathat
`parbeszed`-et.** A `parbeszed` ugyanis **kezdeményez** — rögtön küld egy `LENYOMAT`-ot.
Mivel a résen mindkét fél ugyanazt teszi, a két LENYOMAT találkozott, és a két gép **rendes
cserébe kezdett egymással**; a fájl-ág a második szeletnél egy **`CIMEK`** üzenetet kapott
`FAJLKEREK` helyett, kilépett, és **a 70 KB-os fájl fele úton maradt**. ⚠️ A tünet
félrevezetett (*„a társ nem kért semmit"*), az ok szerkezeti volt. ✅ Ezért született a
**passzív `fajlKiszolgalas`** (`vonal.js`): ugyanaz a kiszolgáló-logika, amit a `parbeszed`
fájl-ága futtat — **egy helyen, két hívóval** —, de **néma, amíg nem kérdezik**.
*Aki kiszolgál, az ne beszéljen elsőként.*

⛔⛔⛔ **ÉS EGY SAJÁT „TAKARÍTÁSOMAT A MÉRÉS CÁFOLTA — ez a menet legfontosabb tanulsága.**
Észrevettem, hogy a lezárt `udpKapcsolat` **nem veszi le a figyelőjét a foglalatról**, és
azonnal levettem, ezzel az érveléssel: *„egy lezárt kapcsolat ne beszéljen"* (a randevúnál
ugyanis egy foglalaton egymás után több kapcsolat nyílik). ⛔ **A 30%-os vesztésű, ötszörös
rontás-próba elbukott tőle.** Az ok: a lezárt példány nyugtázása **nem pazarlás, hanem
FUNKCIÓ** — a másik fél utolsó darabja épp a lezárás pillanatában lehet úton, és ha a mi
nyugtánk elveszett, **ő újraküldi**; ilyenkor a lezárt példányunk **pótolja a nyugtát**.
*Enélkül a tétlenségi órájáig vár — pontosan az a holtpont, amit a 2026-08-30-i mérés
megtalált.* ✅ A megoldás **utóhang**: a lezárás után még 2 másodpercig felelünk, aztán
csend — így az elveszett nyugta pótolható, a lezárt példányok mégsem gyűlnek a foglalaton.
⚠️ *Amit „szemétnek" néztem, az egy őr volt. A kód olvasása ezt nem mondta meg; a mérés igen.*

✅✅✅ **ÉS A HOLTPONT MEGVAN ÉS MEGJAVÍTVA — 25. mérés (2026-09-14/15).** A 30%-os
vesztésű csere önpróbája **6 futásból 1-szer** bukott (és a D67 ELŐTTI kódon is 5-ből 1-szer).
⛔ **Két magyarázatomat a mérés cáfolta** — a lezárt kapcsolat figyelője (az utóhang után is
megmaradt) és a visszalépő óra (15 000 ms-os határidőnél ugyanúgy bukott). ⭐⭐ **A harmadik
nekifutás már csomag-naplóból indult**, 200–300 kísérleten át — mert a bukás **nem-esemény**
(teljes csend), és azt naplóból nem lehet látni.
⭐⭐⭐ **A MECHANIZMUS: három helyes szabály esett egybe.** A kapcsolat **első** darabja
sorozatban elveszett → `srtt` **null** maradt → a **vak óra** szándékosan csak a **legrégebbi**
darabot szondázza (21. mérés) → a mögötte álló darab **meg sem mozdult** → közben a
visszalépés **4800 ms**-ra nőtt. ⛔⛔ **És ekkor a két őr ELLENTMONDOTT egymásnak:** a mi
újraküldésünk tovább hallgatott, mint a **társ tétlenségi órája**. *Egy türelem, ami túléli a
másik fél türelmét, nem türelem, hanem néma bukás.* ⚠️ Ugyanaz a hibafajta, mint a `maradek/4`
korlátnál — csak ott a saját keretünkkel ütközött, itt a **másikéval**.
✅ **Két korlát, mindkettő a meglévő elv kiterjesztése:** *(1)* a visszalépés **megáll**, ha a
darab utolsó küldése óta **hallottuk a társat** (a kód már kimondta, hogy „a nyugta bizonyítja,
hogy az út él" — ez minden tőle jövő csomagra igaz; ⚠️ de csak a duplázást állítjuk meg, az
RTO-t nem nullázzuk, mert a beérkező adat a MÁSIK irányról szól); *(2)* az **RTO sosem több a
tétlenségi óra harmadánál** — a szimmetrikus esetre, amikor egyik fél sem beszél; a társ
**ugyanazt a programot futtatja** (D66), tehát a saját óránkból következtethetünk az övére.
⭐ **MÉRVE: 3/200 → 0/300**, és a próba határideje **10 000 ms** lett — a `csereUdpResen`
**éles alapértéke**, tehát a próba mostantól azt méri, amit élesben futtatunk. *Nem lazítás:
ugyanazzal a javított koddal 5000-nél még 1/300 maradt, 10 000-nél 0/300.*
⚠️ A D67 számai nem romlottak (1%/5%/15% = ~300/104–110/31–35 KB/s a korábbi 287/104/39-hez
képest; a 15%-os sor a szóráson belül, de szemmel tartandó).

✅ **NÉGY ÚJ PRÓBA, ÉS MIND A NÉGY RONTÁS-PRÓBÁVAL IGAZOLVA:** a kétirányú randevú (mindkét
fél kér ÉS ad, egy foglalaton — és a szerepük **ellentétes**) · a „nem tudom a szerepet" ág
(nem ragad be, kimondja) · és ⭐ **az őrjárat parancssor-próbája: a kép magától megérkezik,
kézi parancs nélkül** (14 mp, két készülék, külön folyamatban). ⛔ **A rontás-próbák:** a
7. paraméter kivétele · a `fajlAtvitelKiirasa` kikapcsolása · a szerepválasztás rontása
(*mindkettő kezd*) · a passzív kiszolgáló visszacserélése `parbeszed`-re — **mind buktat**.
⚠️ *És ez a lényeg: a meglévő kép-próba végig ZÖLD volt, mert kézzel cserélt. **Amit csak
kézi paranccsal mérünk, arról nem tudjuk, hogy magától is megtörténik-e.***

⭐ **A lapon ma megy:** böngészés · gondolat- és kategória-létrehozás · **javaslat-tétel** ·
tudatpont · érték javaslat · szavazás · koino-váltás · **képek**.

⚠️ **ÉS EGY ÁTNÉZÉS EGY LATENS RÉST TALÁLT A FÁJL-RÉTEGBEN (2026-09-13, javítva).** A
`fajlTar.js`-ben **két különböző őr** állt ugyanazon a néven: az `olvas`/`van`/`ir` a
horgonyzott mintát nézte, a **részleges fájl útja viszont csak a HOSSZT**
(`lenyomat.length === 43`). ⛔ Egy 43 karakter hosszú, de érvénytelen név
(`../…/kulcsok` — mérve) **átcsúszott**, és a `reszlegesHozzafuz` `mkdir` + `appendFile`-lal
**írt is volna** a mappán kívülre. ⭐ **Elérhető nem volt** (az egyetlen forrás a `fajlIgeny.js`
horgonyzott mintája), de *az őr mást mondott, mint amit tett* — ugyanaz a csapda, amit az
`Allaspont`-nál kimondtunk. ✅ Egy őr (`ellenorzottNev`), és a **név ellenőrzése a `try`-on
KÍVÜL** a `reszlegesMeret`/`reszlegesEldobas`-ban is (D19: a **hiány** normális, az
**érvénytelen név** nem — különben a rossz név „még nincs meg"-nek látszana). ⚠️⚠️ **És
kiderült, MIÉRT nem fogta meg próba:** a meglévő lista minden eleme *„rossz hosszú"* volt
(`rovid`, `A`×44, `../../kulcs.json`) — **pont a 43 hosszú, de rossz nevet nem próbálta**,
vagyis a rés fölött mind átment. *Hatodszor ugyanaz: a zöld próba nem bizonyíték, amíg ki nem
kapcsoltad, amit mér.* Két új próba (a rontás-próba buktatja, a párja méri, hogy nem
mindenre mond nemet).

### ✅ A TEREPMÉRÉS MEGTÖRTÉNT (2026-09-13, 22:38) — 17. mérés

⭐⭐⭐ **A UDP-pajzsfúrás MEGISMÉTELVE egy másik hálózat-páron**, és **a csere is átment a
résen**: `31.46.250.205:54013` ↔ `5.187.186.127:7373`, **1 kopogás, 190 ms**. *A 2026-08-29-i
siker tehát nem szerencse volt.* Jegyzőkönyv: [`koino/meres/eredmenyek.md`](koino/meres/eredmenyek.md) 17.

⭐⭐⭐ **A 190 ms a valódi költség — és ez az érv a BULI mellett, mérve.** A másik oldal
237 másodperce **nem a fúrás ára volt, hanem a várakozásé** (egyedül kopogott, amíg a másik
el nem indult). *A pajzsfúrás nem lassú és nem bizonytalan — **egyidejűséget** kíván.*

⛔⛔ **DE A TCP KÉRDÉSE NYITVA MARADT, és ez NEM cáfolat.** A TCP-fúróval kezdtük, négy órán
át nem ment — az ok mérve: a fejlesztő routere az IPv4-portot **minden foglalatnál más
számra** írja át (**25787 → 6119 → 33905 → 54013**); a UDP-fúró ezt **megméri a saját
fúró-foglalatáról** (`ba9ce7b`), a **TCP-fúrónak viszont nincs ilyen mérése** (a tükör
`udp4`). A másik fél tehát a `7373`-ra kopogott, ahol nincs rés.

✅✅ **ÉS EZ MEGMÉRVE — 18. mérés (2026-09-13): A TCP-LEKÉPEZÉS CÉLFÜGGETLEN.**
`node koino/meres/tcpLekepezesMeres.js`. *Csaba döntése volt, hogy **előbb a mérés, ne az
építés** — „lehet, hogy egy elvi falnak építünk". ⛔ **A fal nincs ott.*** Három **különböző
cég, három különböző IP** (nextcloud · antisip · dus), és mindhárom **ugyanazt** a külső
portot látja a 7373-as helyiről: `31.46.250.205:63539`. ⭐ **A port átíródik, de
KISZÁMÍTHATÓAN** — nem az a baj, hogy más szám, hanem hogy **nem kérdeztük meg**.
⭐⭐ **És a mérés bizonyítottan nem vak:** röpke portokról három **különböző** szám jött
(63543 · 63598 · 63600), a rögzítettről **háromszor ugyanaz** — *érzékeny a helyi portra,
érzéketlen a célpontra; pontosan ez a célfüggetlenség.*
✅✅ **ÉS EBBŐL A KÉT ELSŐ LÉPÉS MEG IS ÉPÜLT (2026-09-13, Csaba jóváhagyott sorrendje).**

**(1) A `stunbolCim` STUN-hibája javítva** — a `pajzsfuro.js` **vakon négy bájtot olvasott
IPv4-ként**, a család-bájt nélkül; egy IPv6-válaszból így `32.1.76.77` lett, ami valójában a
**saját `2001:4c4d…` cím első négy bájtja**. *A mérés nem hazudott volna nagyobbat, ha
kitalálja a számot.* ⭐ **Két új próba** őrzi (`csereProba.js`, kézzel összerakott STUN-válasz
bájtokból — *érveléssel nem volt megfogható, csak bájtokkal*), és **rontás-próbával
igazolva**: a család-vizsgálat kikapcsolásával az IPv6-próba azonnal bukik.

**(2) A TCP-fúró megtanulta megkérdezni a saját külső portját** — `kulsoCimTcp` +
`TCP_TUKROK` (`pajzsfuro.js`), és a `tcpPajzsfuras` **a kopogás ELŐTT** kérdez,
`SAJAT-KULSO-CIM` jelzéssel. ⛔ **Miért előtte, és nem közben:** a rögzített helyi portot
egyszerre csak egy kapcsolat foghatja — fúrás közben a tükör-kapcsolat `EADDRINUSE`-szal
bukna, vagy elvenné a portot a fúrás elől. ⚠️ **IPv6-nál kihagyjuk** (nincs NAT), és ha
egyik tükör sem felel, **a fúrás ugyanúgy elindul** (2. szabály) — csak kimondjuk, hogy nem
tudjuk bemondani a portot (D19). A lap most ezt írja ki: *„⭐ KÍVÜLRŐL ÍGY LÁTSZOM TCP-N:
31.46.250.205:63495 · EZT MONDD BE A MÁSIKNAK…"*
⛔⛔ **És egy régi sort EL KELLETT VENNI:** a parancssor korábban egy **UDP**-s mérést írt ki
a TCP-fúrás előtt. Mérve, egy futáson belül: **UDP 39471, TCP 63495** — *két szám ugyanarra a
kérdésre, és csak az egyik igaz.* A router a két szállításnak külön leképezést ad, tehát a
UDP-szám a TCP-fúrásnál **félrevezet**; nem hagytuk ott „tájékoztatásul".

✅✅✅ **ÉS A HARMADIK LÉPÉS IS MEGTÖRTÉNT — 19. MÉRÉS (2026-09-13, 23:34): A TCP-PAJZSFÚRÁS ÁTMEGY.**
*Ez a Szakasz 2 utolsó nyitott kérdése, és a napló szerint **soha korábban nem mértük meg**.*
`31.46.250.205:63517` ↔ `5.187.186.127:7373`, és **a csere is átment ugyanazon a
kapcsolaton** (1 kör). Továbbító nélkül, port-továbbítási szabály nélkül, egyik routeren sem
állítottunk be semmit. ⭐⭐ **A telefon oldalán az 1. próbálkozásra, 76 MS alatt** — a gép 16
próbálkozása nem a fúrás ára volt, hanem a rossz címé; *ugyanaz a kép, mint a 17. mérés
190 ms-ánál.*
⛔⛔⛔ **ÉS CSABA DÖNTÉSE A MÉRÉS UTÁN — A UDP MARAD A FŐ ÚT (2026-09-13):** *„ez egy nagyon
fontos különbség, ami nekem azt mondja, hogy az UDP-ét kell használnunk, és nem ússzuk meg a
munkát. De ez nem baj, ha ettől lesz készülék- és router-független."* ⭐⭐⭐ **A három mérés
tehát nem azt döntötte el, melyik a gyorsabb, hanem hogy melyik az, AMELYIK MINDENHOL
MŰKÖDIK:** a **UDP** egy foglalat = egy leképezés — *a modellből következik*; a **TCP** csak
azért megy, mert ez a router **célfüggetlen** (18. mérés), és egy cél-függő NAT mögött
**elvi okból lehetetlen**. ⛔⛔ **A 9. szabály itt szól:** egymilliárdnál **nem lehet
előfeltétel, hogy a router célfüggetlen legyen** — a router-eltérés **alapállapot, nem
kivétel**. ⭐ **Következmény: a UDP-vonal ABLAKÁT MEG KELL ÉPÍTENI** (16. mérés: 25 KB/s
1 ms/csomag mellett), és ⭐ **a TCP-út nem vész el, csak lefokozódik alkalmi gyorssávvá** ott,
ahol a vonal engedi *(a `tcpLekepezesMeres.js` megmondja, hogy engedi-e)*. *Az 1. szabály
teszi ezt olcsóvá: a `parbeszed` mindkét szállításon változatlanul fut.*
⛔⛔ **ÉS A MÉRÉS ÉLŐBEN MUTATTA MEG, HOGY A SZÁM NEM ADHATÓ KI ELŐRE:** a külső TCP-portom
három futáson át **63539 → 63495 → 63517** volt, és a társ az első **tizenöt** próbálkozás
alatt a **régi** számomra kopogott — a siker abban a percben jött, amikor a frissel indult
újra. ⭐⭐⭐ **Ez a BULI harmadik, független igazolása egyetlen estén:** az ideiglenes
IPv6-cím négy óra alatt háromszor cserélődött (17.), a külső UDP-port foglalatonként más
(17.), a külső TCP-port futásonként más (19.). *A címet nem lehet előre megbeszélni — csak a
találkozás pillanatában átadni.*
⚠️ **Amit NEM mond meg:** egy hálózat-pár (egyik port-átíró, másik port-megtartó) — ⏸️ **két
port-átíró NAT között** (pl. két CGNAT) újra kell mérni · a **számcsere kézi volt**, a buli
ezt fogja elvégezni, és az még nincs megépítve · a TCP-rés **sebességét** nem mértük.

### ⛔ Három hiány, amit a terepmérés hozott felszínre (egyik sincs megépítve)

1. ⛔⛔ **Az ideiglenes IPv6-cím NEM adható ki előre.** A telefon „privacy" címe **négy óra
   alatt háromszor** cserélődött. ⭐ *Eddig a randevút azért terveztük, mert a fúrás
   egyidejűséget kíván; most kiderült, hogy a **cím érvényessége** miatt amúgy is kötelező.*
2. ⛔ **A tükör `udp4`-re van drótozva** (`pajzsfuro.js:167`) — ezért **IPv6-on a fúró vak**,
   nem tudja megmondani, mit adjunk át a másiknak. *Négy óra ment el erre.*
3. ⚠️ **A fúró nem mondja meg, melyik SAJÁT címéről szól ki** (`localAddress`). Két globális
   IPv6 mellett az OS választ, és ha nem azt adtuk meg, a rés **a másik címhez** nyílik — a
   csomagok némán elvesznek, **tökéletes szimmetriában**, ami elfedi az okot.

### ⏸️ A többi nyitott döntés (mind Csabáé)

1. ⭐⭐ **AZ ABLAK A UDP-VONALNAK — ELDŐLVE, ÉS MEG KELL ÉPÍTENI** (Csaba, 2026-09-13, a 19.
   mérés után). ⛔ *Nem azért, mert a TCP nem megy — hanem mert a TCP a router
   célfüggetlenségén áll, a UDP viszont a foglalat-modellen. Egymilliárdnál a router-eltérés
   alapállapot (9. szabály).* Az ablak a `udpVonal.js`-ben marad, a fájl-átvitel **egyetlen
   sorának változtatása nélkül** (1. szabály). **Ez a következő építés.**
   ✅ **ÉS A MŰSZER MÁR KÉSZ HOZZÁ (2026-09-14):** a 16. mérés kiterjesztve **veszteséggel,
   ingadozással, lassú vonallal** és **magvas véletlennel** — *veszteség-választ nem lehet
   olyan műszerrel építeni, ami soha nem veszít csomagot.* ⭐⭐ **És rögtön kiadta a D67
   második darabjának bizonyítékát:** késleltetésnél a vonal lassú, de **nem pazarol**
   (×1,0) — ⛔ **400 ms oda-visszánál ×2,0, 800 ms-nál ×3,0**, mert a **fix 300 ms**
   `UJRAKULDES_KOZ` rövidebb, mint az oda-vissza: *újraküldünk olyat, ami éppen ÚTON van.*
   ⚠️ **És egy saját állításomat a mérés cáfolta:** azt írtam, a vonal „feladja 20
   próbálkozás után" — **nem adta fel** sem 15% veszteségnél, sem 800 ms-nál; a kár a
   **megsokszorozott forgalom**, nem a feladás.
   ✅✅✅ **ÉS AZ ABLAK MEGÉPÜLT — 20. mérés (2026-09-14): NAGYSÁGRENDI UGRÁS.**
   `ABLAK = 16` darab úton · **gyors újraküldés** (egy későbbi darab nyugtája **bizonyíték**
   a korábbi vesztésére — három ilyen jel után, mert a sorrend-csere még nem vesztés) ·
   és ⛔ **a fogadó puffer korlátos lett** (az ablakon túlit **nem tároljuk és nem
   nyugtázzuk** — korábban **korlát nélküli** térkép volt, vagyis memória-veszély).
   ⭐ **24 → 460 KB/s** (1 ms), **11 → 346 KB/s** (5% vesztés), **1 → 5 KB/s** (800 ms),
   és a csere 50% veszteségnél **10,4 → 4,2 mp**. **3 új önpróba + rontás-próba** (`ABLAK = 1`
   azonnal buktatja).
   ⛔⛔⛔ **ÉS A SORRENDEMET A MÉRÉS CÁFOLTA — ez a szakasz legfontosabb tanulsága.**
   A **mért RTT-vel** kezdtem (1. darab), mert annak volt a legerősebb bizonyítéka; a lassú
   vonalat meg is javította (×3,0 → ×1,0), ⛔ **de erős veszteségnél elrontotta a vonalat**
   (30%: 1 bukás, 50%: mind az 5). ⭐⭐⭐ Az ok szerkezeti: a visszalépő óra 12 800 ms-ig nőtt
   egy **1 ms**-os vonalon — *és ez pontosan az, amit a TCP is csinál, csak ott ártalmatlan,
   mert a TCP a veszteségek nagy részét a **sorrenden kívüli nyugtákból** tudja meg.*
   ⛔ Stop-and-wait mellett **az óra az EGYETLEN veszteség-jel**, tehát az óvatos óra végzetes.
   *Az ablak tehát nem gyorsítás, hanem **előfeltétel**.* ⚠️ Az 1. darab kódját Csaba
   döntésére **visszavettük**, hogy az ablak tiszta lappal épüljön.
   ✅✅ **ÉS A MÉRT RTT IS MEGVAN — 21. mérés (2026-09-14), az ablak tetején, másodszorra.**
   ⭐⭐⭐ **Pontos minták Karn helyett:** minden újraküldés **sorszámot** visz (`k`), a nyugta
   **visszamondja** — így **minden nyugta pontos minta**, nem csak a tiszta darabé (a QUIC
   útja). ⭐ **És nem kerül bájtot a szokásos esetben** (6. szabály): az **első** küldésen
   nincs `k`, és a `k` nélküli nyugta épp azt jelenti, hogy az elsőre felel.
   ⭐ **10% vesztésnél 875 → 51 ms**, 30%-nál **4173 → 1028 ms**, 1%-nál a fájl **20 → 582
   KB/s**; a lassú vonal pazarlása **×3,0 → ×1,4** (64 KB-on; 8 KB-on ×1,9 — *az indulási
   löket elolvad, ha van mit átvinni*).
   ⛔⛔ **DE 50% VESZTESÉGNÉL LASSABB A RÉGINÉL: 10 403 → 25 127 ms** (bukás nélkül). *Az ok
   nem hiba, hanem a viselkedés ára: a régi kód **soha nem lépett vissza**, 300 ms-onként
   hajtotta a vonalat — ez gyorsabb véletlen vesztésnél, és pontosan az, ami egy **torlódott**
   vonalon a bajt okozza.* ⏸️ És van szerkezeti ok remélni, hogy javul: ma az óra **és** az
   ablak is a torlódásra reagál, vagyis **átfedik egymást** — a **4. darab** veszi majd át a
   torlódás-választ, és akkor az óra kevésbé lehet türelmes.
   ⭐ **Három további lelet, mind mérésből:** a visszalépést a **nyugta feloldja** (ha most
   jutott át forgalom, az út él) · a **vak** óra csak a **legrégebbi** darabot szondázza
   (mérés nélkül minden óra tipp — abból egy elég, kilenc nem), ⚠️ *de mért óránál ez már nem
   áll: rászűkítés nélkül 15% vesztésnél 430 → 8177 ms-ra romlott* · és ⛔ **az RTO sosem több
   a maradék feladási keret negyedénél**, mert *egy várakozás, ami után nem fér bele újabb
   próbálkozás, nem türelem, hanem garantált bukás türelemnek öltözve.*
   ✅✅✅ **ÉS A D67 TELJES — 22. mérés (2026-09-14): AZ ALKALMAZKODÓ ABLAK (AIMD).**
   *siker → +1 darab körönként · vesztés → felére.* ⚠️ **Az aszimmetria a lényeg:** így a
   vonalat megosztó felek **egyensúlyba kerülnek**, ahelyett hogy a legagresszívabb vinné el
   az egészet. ⛔ Egy vesztés-esemény = **egy** felezés (különben egyetlen zavar a földbe
   döngölné).
   ⭐⭐ **ÉS EZT A DARABOT ÚGY KELL OLVASNI, HOGY SZÁNDÉKOSAN LASSÍT:** `+1 ms`-nál
   454 → **593 KB/s**, de **1% vesztésnél 582 → 287**, 5%-nál **356 → 104**, 15%-nál
   **78 → 39 KB/s**. ⭐ *A csomag-oszlop mondja meg, miért jó ez:* ugyanott **×1,8 → ×1,4**,
   vagyis **egyharmaddal kevesebb csomag** — *pontosan az a forgalom tűnt el, amivel a
   torlódást etettük volna.* ⚠️ És ez megfelel az elméletnek (a veszteség-alapú vezérlés a
   vesztés **gyöke** szerint romlik); egy **véletlenszerűen** vesztő vonalon túlreagálás, de
   a küldő nem tudja megkülönböztetni — *és a két tévedés nem egyenrangú: aki tévedésből
   visszafog, lassabb lesz; aki tévedésből hajt, másoknak okoz összeomlást.*
   ⛔⛔ **ÉS EGY VALÓDI HIBÁT A MÉRÉS AZONNAL KIDOBOTT:** `±20 ms` szórásnál, **nulla
   veszteség mellett** 234 → **106 KB/s** — mert a **sorrend-csere** hármas „előrébb járó"
   nyugtát ad, amit a gyors újraküldés vesztésnek olvas. ⭐⭐⭐ **A bizonyíték ingyen megvolt
   az 1. darabból:** ha az **ELSŐ** küldésre jön nyugta egy közben újraküldött darabra, az
   eredeti **megérkezett** — a felezés téves volt, és **visszaadjuk az ablakot**
   (`tevesFelezes`); a sor visszaállt **221 KB/s**-ra. *Egy mező, két haszon.*
   ⏸️ **Nyitva:** nincs **lassú indítás** (16-ról indul, nem 1-ről duplázva) · a **véletlen
   vesztés és a torlódás megkülönböztetése** (a BBR iránya — más nagyságrendű munka) · és a
   lassú vonal **indulási lökete** (×1,9), ami a kezdő RTO-é, nem az ablaké.
   ✅✅ **ÉS A MŰSZER MEGTANULT TORLÓDNI — 23. mérés (2026-09-14), és RÖGTÖN KIMUTATOTT EGY
   BAJT:** szűk keresztmetszet + korlátos sor, és a küldő **teletömi a sort** a majdnem teljes
   16-os ablakával, **miközben egyetlen csomagot sem veszít** — tehát az **AIMD nem tanul
   semmit** (`sor: 13–14`, nulla vesztés). ⛔ **Ez a bufferbloat**, és kétszeresen árt: a vonalat
   megosztó **másoknak** (a mi sorunk mögé áll be a hívásuk), és **magunknak is**, mert a
   **3 egyidejű fájl-átvitel** ugyanazon a feltöltésen osztozik a **késleltetés-érzékeny
   cserével**. *A vonal tele van, és a mai vezérlés vak rá.*
   ⭐⭐⭐ **ÉS EBBŐL SZÜLETETT A D68 (Csaba, 2026-09-14): A TORLÓDÁS JELE LEGYEN A
   KÉSLELTETÉS — és a REDUNDANCIA teszi megfizethetővé.** A fájl-átvitel legyen **engedékeny**
   (scavenger), a **csere ne** — a szétválasztás már kész (a fájl-átvitel saját kapcsolaton fut).
   ⭐⭐ **És a két szál egymás gyengéjét orvosolja:** a késleltetés-jelet **kiéheztethetik**, de
   ⭐ ha ugyanazt az adatot több társ is hozza, a visszafogás **nem állítja meg a munkát** —
   *ez a ritka tulajdonság, ami a MÉRETTEL JAVUL.* ⛔ **Határ:** *„a vesztés megengedhető"* ≠
   *„nem kell torlódás-vezérlés"* — a teletömött sor akkor is **mindenki másnak** okoz
   késleltetést. ⏸️⏸️ **A KÖVETKEZŐ MUNKA, Csaba három válaszával: (1)** a küszöb alakja
   (Vegas / LEDBAT / CDG) **méréssel** dőljön el · **(2)** a `FELADAS_IDO` (ma **30 000 ms**,
   `udpVonal.js:131`) **le**, de **függjön attól, hány forrásból szerezhető be ugyanaz** (és/vagy
   a torlódás-mérőtől) — *a türelem annyi legyen, amennyit az alternatíva hiánya indokol* ·
   **(3)** a több forrásból egy fájl **külön munka** (ma a részleges fájl **mérete maga az
   állapot**, ami sorrendet feltételez).
   ✅✅ **AZ ELSŐ LÉPÉS KÉSZ — 24. mérés (2026-09-14): A MŰSZER MEGTANULT VERSENGENI.** Az
   `udpParos()` kapott egy **idegen** terhelést ugyanazon a soron — `egyenletes` (hívás) és
   `moho` (TCP-szerű) —, a sorbanállás kódja pedig **egy helyre került** (`sorbaAll`), mert
   két forgalom használja. ⭐⭐⭐ **És rögtön kiadta a két számot, amire eddig vakok voltunk:
   (1) a hívás késleltetése mellettünk 2,0 → 12,8 ms (átlag), csúcsban 2 → 44 ms** — vagyis
   *ártunk*, miközben egyetlen csomagot sem veszítünk (az AIMD nem tanul semmit); **(2) a
   mohó szomszéd mellett 281 → 141 KB/s**, vagyis ma **pontosan felezünk** — nem éheztetnek ki.
   ⛔⛔ **A 141 KB/s a D68 ÁRCÉDULÁJA:** a késleltetés-alapú jel után ennek **romlania fog**,
   és épp ezért kellett előbb megmérni. *A romlás a fájl-átvitelnél megengedhető (a
   redundancia pótolja), a cserénél nem.* ⚠️ A műszer még nem tud **mobil-ingadozást** és
   **két koino-folyamot** egymás mellett.
   ✅✅✅ **ÉS A JEL ALAKJA IS ELDŐLT — 26. mérés (2026-09-15): A VEGAS NYERT, MÉRÉSSEL.**
   Két jelölt épült meg **paraméterként** (`torlodasJel`), és futott ugyanazon a műszeren:
   ⭐ **Vegas** (a jel a sorban álló darabok **becsült SZÁMA**, α=2/β=4 **darab**) és
   **LEDBAT** (a sorbanállási késleltetés egy cél alatt; ⛔ a klasszikus 100 ms-os cél
   varázsszám lenne, ezért nálunk a `minRtt`-hez viszonyul).
   ⭐⭐ **A VEGAS NÉGY OKBÓL:** *(1)* a mellettünk futó hívás késleltetése **12 → 3 ms** (az
   üres vonal 2,0!), csúcsa 45 → 19; a LEDBAT csak 6–8 ms-ig jut · *(2)* az ára a fő
   helyzetben −11…−19%, a **gyors, üres vonalon NULLA** · *(3)* az **ingadozó (mobil-szerű)
   vonalon stabil** (−4…−12%), míg a LEDBAT ott 43%-ot is veszíthet — *ez a D68 kimondott
   kockázata volt* · *(4)* ⭐⭐⭐ **a küszöbe DARABSZÁM, nem ezredmásodperc**, tehát a 9.
   szabály próbáján magyarázat nélkül megy át.
   ⛔ **Az ára kimondva:** a véletlenül vesztő vonalon −30…−50%, a mohó szomszéd mellett
   feleannyi. *A D68 ezt tudatosan vállalja: a fájl-átvitel háttérmunka, a redundancia
   pótolja — a cseréé nem.*
   ⛔⛔ **ÉS HÁROM MŰSZER-HIBÁT KELLETT ELŐBB MEGTALÁLNI, mindhárom a jelet fojtotta:** a
   `Date.now()` **ms-felbontása** (a minták azóta `performance.now()`-val készülnek), a
   Windows `setTimeout` **15,6 ms-os kvantálása** (a „+1 ms-os" vonal valójában ingadozó,
   15 ms-os volt — a jel **helyesen** fogott vissza rajta), és a jel bemenete (az `srtt`
   **átlag** helyett a friss minták **MINIMUMA**). ⚠️ *Mindhármat úgy találtuk meg, hogy a jel
   kiadta a belső állapotát (`jelAllapot()`) — a jel alakját nem lehet a végeredményből
   megítélni.*
   ⛔⛔⛔ **ÉS EGY CÉL, AMI NEM TELJESÜLT:** a `sor:` **27 → 14–16** lett, nem 1–2. ⚠️
   Szigorúbb küszöbbel (α=1/β=2) sem csökkent — csak az ár nőtt. ⭐ **Az ok szerkezeti: a
   `sor:` a CSÚCSOT méri, azt pedig nem az ablak nagysága szabja meg, hanem hogy LÖKETBEN
   küldünk** (16 darab egyszerre indul). ⏭️ **Vagyis a `sor: 1–2`-höz ÜTEMEZÉS kell** (D68/d),
   nem szigorúbb küszöb — *amit „félmegoldásnak" neveztünk, az a hiányzó másik fele.*
   ✅✅✅ **ÉS A D68 ÉLESBEN IS MEGVAN — 27. mérés (2026-09-15): A SZÉTVÁLASZTÁS.**
   ⭐ A jel **nem a hívó dolga**: a fájl-út **magával hozza** (`fajlUdpResen`, `fajlRandevu`
   → `vegas`), a csere szintén (`csereUdpResen` → `nincs`). *Ugyanaz az érv, mint a
   javaslathoz tartozó szavazatnál: ha a hívóra bíznánk, az egyik út megtenné, a másik
   elfelejtené.* ⚠️ **A kiszolgáló oldalnak is kell**, mert a torlódást a **küldő** okozza —
   a 64 KB-os szeleteket ő küldi. ⛔ A TCP-úton a kernel vezérel (CUBIC), az nem a mi dolgunk.
   ⭐⭐ **ÉS MÉRHETŐVÉ IS TETTÜK:** a használt jel **visszakerül az eredménybe**
   (`torlodasJel`) — nem naplósor, hanem megfigyelhető tény; új önpróba méri, hogy a két
   forgalom **tényleg külön jelet kap**, és rontás-próba (a szétválasztás elmosása) buktatja.
   ⭐ **AMI ÉLESBEN VÁLTOZOTT:** a mellettünk futó hívás késleltetése **11,5 → 3,0 ms**, a
   csúcsa **45 → 18 ms**; az ára a fájl-átvitelen **271 → 233 KB/s** (−14%), amit a D68
   tudatosan vállal (*háttérmunka, a redundancia pótolja*).
   ⛔⛔ **ÉS AZ ÜTEMEZÉS MEGÉPÜLT, DE ALAPBÓL KI MARAD — MÉRT DÖNTÉS.** Önmagában dolgozik
   (a csúcs 45 → 24–27, a sor 27 → 17–18, és **nem lassít**), ⛔ **de a jel mellett nem ad
   hozzá mérhetőt**: a Vegas a csúcsot már 18–19-re vitte, a kettő együtt az átlagot
   **rontotta** (3,0 → 3,4–4,6). ⚠️ *Nem „megépült, de senki nem hívja" — a mérő hívja, a
   paraméter él (`utemezes: true`), és a kikapcsolás mérésen áll.*
   ⭐⭐⭐ **ÉS A LELET, AMI EZT MEGMAGYARÁZZA — A SOR ALSÓ HATÁRÁT AZ ÓRA SZABJA MEG:**
   `sor_alsó ≈ az óra ébredési köze / a vonal szolgálati ideje` = 15,6 ms (Windows
   `setTimeout`) / 2 ms ≈ **8 csomag**. Egy ébredés alatt a vonal ~8 csomagnyi időt kiszolgál,
   ennél kisebb löketet **nem lehet kirajzolni** anélkül, hogy a vonal kihasználatlan maradjon.
   *A `sor: 1–2` cél tehát ezen a gépen nem hangolás kérdése, hanem MÉRHETETLEN.* ⚠️ És ezt
   élőben is megmértük: fix, 4-es löket-plafonnal **a saját ütemezésünk fojtotta meg a vonalat**
   (247 → 179 KB/s); a javítás az lett, hogy a kredit-plafon az **ablakhoz igazodik**.
   ⏸️ **A koino célkészüléke viszont a TELEFON** (Termux/Android), ahol az óra ~1 ms-os — ott
   az ütemezés várhatóan fizet, és a cél is elérhető. **Bekapcsolni csak mérés után szabad:**
   `node koino/meres/resSebessegMeres.js`, az „AZ ÜTEMEZÉS" szakasz.
   ✅✅ **ÉS A TÜRELEM IS MEGVAN — 28. mérés (2026-09-15), Csaba 2. válasza.** A vonal
   **30 000 ms**-ig küzdött egyetlen 1000 bájtos darabért, akkor is, ha ugyanaz a fájl tíz
   társnál megvolt. ⭐ **A szabály:** `turelem(n) = max(5 000, 30 000 / n)` — egy forrásnál
   30 mp (*nincs hova menni*), négynél 7,5, hatnál az alsó korlát. ⛔ **Az alsó korlát nem
   dísz:** egy 800 ms oda-visszájú vonalon ennyi is csak néhány próbálkozás, és a 9. szabály
   szerint a lassú vonal **alapeset**. ⚠️ Az **ismeretlen** forrásszám a legóvatosabb választ
   adja (D19: *ha nem tudunk alternatíváról, akkor nincs alternatíva*).
   ⭐⭐ **És a feladás tényleg olcsó:** a részleges fájl megmarad, és **a mérete maga az
   állapot** — *a feladás itt nem adatvesztés, hanem társ-váltás.* ⭐ A számítás a
   **fájl-rétegben** van (`turelemForrasokbol`), a vonal **paraméterként kapja** — a vonal
   nem tudhatja, hány forrás van (1. szabály). ⚠️ A **randevúnál marad a teljes türelem**:
   ott nincs másik forrás.
   ⛔⛔ **ÉS EGY VAK PRÓBÁT A RONTÁS-PRÓBA BUKTATOTT LE — HETEDSZER UGYANAZ.** Az első
   parancssor-próbám a **kiírt** türelmet nézte; a bekötést kivéve a kiírás **változatlan
   maradt**, mert az a **kiszámolt** értékből jön. *Azt mértem, hogy kiszámoltuk — nem azt,
   hogy használjuk.* ✅ A javított próba **viselkedést mér**: hat nem válaszoló forrásnál
   ~5 mp alatt fel kell adni, és a rontás most **buktat**.
   ⚠️ **És egy hazudó felirat is javítva:** a `fajlok` parancs még azt írta, hogy *„a bájtok
   szállítása még nem épült meg"* — pedig 2026-09-13 óta megvan, és az őrjárat magától hozza.
   ⏸️ **A D68-ból hátra:** a **több forrásból egy fájl** (külön munka — ma a részleges fájl
   mérete maga az állapot, ami sorrendet feltételez). Teljes indoklás: **D68**.
1/b. ⛔ **A FÁJL-BÁJTOKNAK NINCS KÉZI ÚTJA** (2026-09-14, átnézés — a 4. szabály másik fele).
   A `kivisz`/`behoz` **csak eseményeket** visz; ha egyetlen hálózati út sem megy, a **kép
   semmilyen paranccsal nem vihető át**. ⚠️ Kézzel ma is átmásolható
   (`koino-adat/<koino>/fajlok/<lenyomat>`), és ⭐ **az ellenőrzés ott is ingyen van** — az
   `olvas` újra lenyomatol, tehát a rossz bájt nem jut be. *De a program nem kínálja: pont
   az az állapot, ami az eseményeknél 2026-09-12-ig volt.* ⏸️ Csaba döntése, hogy kell-e
   `fajlKivisz`/`fajlBehoz` parancs.
2. **`FAJL_KORLAT`** (ma **2 MB**, kiindulás) — 25 KB/s mellett 2 MB ≈ 80 mp. ⭐ **Nem**
   állapot-befolyásoló állandó (D66), tehát szabadon hangolható.
3. **A maradék modálok** (5.8) — részletek: [`docs/szakasz5_terv.md`](docs/szakasz5_terv.md)
   „ITT TARTUNK".
4. **A hívás ötlete** (2026-09-13) — [`docs/jegyzetek.md`](docs/jegyzetek.md).

---

**Olvasd el induláskor:** ⭐ [`docs/utiterv.md`](docs/utiterv.md) — **mit építünk, milyen sorrendben, és miért** (rövid; ez a belépő). Utána: [`docs/fejlesztesi_terv_fazis2.md`](docs/fejlesztesi_terv_fazis2.md) → az elején a **„HOL TARTUNK"** szakasz. A szakasz-tervek: [`docs/szakasz1_terv.md`](docs/szakasz1_terv.md) (**1. A helyi modell** — ✅ kész) · [`docs/szakasz2_terv.md`](docs/szakasz2_terv.md) (**2. A szállítás** — ✅ kész; a neve eddig „csere" volt, de a munka a szállításról szólt). ✅ **3. A szerkezet** — kész (2026-09-03): a kanonikus alak négy új mezője, a kérdezhető tár-illesztő, a böngésző-lekérés. ✅ **4. AZ IDENTITÁS — kész (2026-09-06)** — terv: [`docs/szakasz4_terv.md`](docs/szakasz4_terv.md) — a szerkezet 2026-09-06-án átépült, **Csaba lezárta** *(„nekem ez így már megfelel, első koinónak")*, és ⭐ **a megépítés BEFEJEZŐDÖTT**: a 9/c terv **LEZÁRVA**: a 4.1–4.6 megépítve, a **4.7 (séta) elvetve** (mérve gyenge, és a D62 óta a szerepe is megszűnt), a **4.8 (`lancGyoker`) definiálva** (D63), megvalósítás mérés alapján. Vagyis — a **két lépcső** (`js/allapot/identitas.js`), a **kontraszt-jelzés** és a **visszavonás** (`js/allapot/jelzesek.js`), **52 önpróbával** (a szakasz zárásakor összesen 269; **ma 646**). 🚧 **Most az 5. szakasz FOLYIK: A FELÜLET** — a pakli és a belépő tér a prototípusból; ettől lesz a koino **használható**. Két doksi: [`docs/felulet_terv.md`](docs/felulet_terv.md) (**a döntések** — futtatókörnyezet, vékony lap, hatókör) és [`docs/szakasz5_terv.md`](docs/szakasz5_terv.md) (**a végpont-térkép** és az állomások). ⭐ **A hatókör a TELJES pakli** (Csaba: *„nem kell mérföldkő"* — a szűkített termékre értve, a munka állomásokra bomlik): a 82 prototípus-végpontból **43 jön át**, 10 más mechanikával, a többi mögött nincs mit átemelni (jelszó, e-mail, feltöltés — D15/D6). ⛔ **A szakasz gerince a `GET /api/pakli/`**: ez a `betolt()` alakja, az utolsó nem-skálázó út — kérdezhetővé kell tenni (rendezés + kurzor + darab), különben a felület bebetonozza. ✅ **Az 5.1 (a helyi kapu) KÉSZ** (2026-09-06): `js/felulet/kapu.js` + `node koino/koino.js felulet` — négy őr (hurok-cím · jelszó · Origin · Host) és egy útvonal-őr, **23 önpróbával**. ✅ **És az 5.2 (a kérdezhető pakli) KÉSZ** (2026-09-06): `js/allapot/pakli.js` + `GET /api/pakli?rendezes&irany&kurzor&darab` — **`darab` felülről korlátos** (100), a lista **nem hordoz szövegeket**, a kurzor **kulcs-alapú** (nem `skip`), **23 önpróbával**. ⭐⭐ **A HORGONY:** a lapozás az „első N esemény" képéhez kötődik (a tár hozzáfűzhető, tehát az a halmaz soha nem változik) — *nem az időt fagyasztjuk be, hanem a bemenetet*; a közben érkezettet az `ujdonsag` **megmondja**, nem keveri bele. ⚠️ *A horgony helyi feljegyzés, nem esemény (3. szabály).*
✅ **ÉS AZ 5.3 (A KÁRTYÁK) KÉSZ** (2026-09-06): a `koino/felulet/` alá **22 JS + 3 HTML + 14 CSS** került át a prototípusból — a kártya-osztályok, a hamburger menü, a szövegmegjelenítő és **minden CSS bájtra ugyanaz**; a `frontend/` érintetlen. ⭐ **Három fájlt kellett átírni:** `apiHelper.js` (JWT → a kapu jelszava), `authHelper.js` (kicserélve, de **ugyanazokkal az export-nevekkel**, ezért a `Kartya.js` nem változott), `kartyaGyar.js` (a Kategória/GondolatTípus kimaradt — nem létezik a koinóban). ⭐⭐ **A modal-csapda megoldása: 13 helyőrző** — a kártyák import-sorai bájtra ugyanazok, és egy valódi modal átemelése (5.5) **egy fájl cseréje**. ⚠️ *Mérésből derült ki két dolog: a jelszó határa az `/api/`-ra tolódott (a `fetch('./html/…')` és a `<link>` nem küld fejlécet; süti helyett — az CSRF-et hozna — az adat kapujára került), és a tudatpont-sor mezői a kártya LEGFELSŐ szintjén vannak, nem az `adatok`-ban.* Két új végpont: `GET /api/pakli/szoveg/:tipus/:id` és `GET /api/tudatpont/entitas/:tipus/:id`.
✅ **ÉS AZ 5.4 (A KATEGÓRIA ÉS A GONDOLATTÍPUS) KÉSZ** (2026-09-06): a végpont-térkép 2. találata volt — tíz prototípus-végpont mögött **nem volt esemény**, pedig a domain-fogalom mindig megvolt. ⭐ **Nem új esemény-fajta:** a `GondolatLetrehozas` az ÁLTALÁNOS entitás-létrehozás, és az `adat.tipus` különbözteti meg a fajtákat (a Szakasz 1 óta így van) — új név minden meglévő tárat érvénytelenítene. ⭐ **Önálló entitás**, mert így ugyanaz jár neki, mint bármely másnak (tudatpont, javaslat, küszöb, egyezmény): *egy kategória neve is közösségi döntéssel változik.* ⚠️ **A neve a `cim` mezőben van**, nem külön `nev`-ben — így a rendezés és az egyezmény-végrehajtás változtatás nélkül működik rajta; a kártya `nev`-et olvas, azt a felület fordítja. ⛔⛔ **A max-3 korlát a SZÁMÍTÁSBAN van** (`szabalyok.js`: `KATEGORIA_KORLAT`), a duplikátum-szűréssel együtt — a prototípusban Mongoose-validátor tartotta, de itt **nincs szerver, ami visszautasítsa**. ⭐ Az ikon lehet **emoji** (a kártya URL-nél képet rak ki, egyébként szöveget), tehát nem kell hozzá feltöltés. Új parancsok: `kategoria <név> [ikon] [leírás]` · `gondolattipus <név> [ikon] [leírás]` · `gondolat <cím> [szöveg] [típus] [kategória…]`.
🚧 **ÉS AZ 5.7 ELSŐ FELE KÉSZ — A SZÖVEGSZERKESZTŐ ÁTEMELVE** (2026-09-12): **húsz fájl bájtra változatlanul**, és **egyet** kellett átírni — a `FeltoltesKezelo`-t. ⭐ Nem véletlen, hogy ilyen olcsó volt: a feltöltés a szerkesztő **1355 soros** fő fájljában mindössze **13 sort** érint. ⭐⭐ **ÉS A 13 HELYŐRZŐ ÍGÉRETE BEVÁLT:** a `GondolatModal` egy 601 bájtos helyőrző volt, most a prototípus **24 KB-os valódija** — *egy fájl cseréje*, pontosan ahogy az 5.3 megígérte. ⛔ **ÉS EZ KINYITOTT EGY VALÓDI LYUKAT: a lapról eddig NEM lehetett gondolatot létrehozni** — a pakli mutatta őket, de újat csak a parancssorból; *a 4. szabály fordítottja: itt a kéz volt meg, a lap nem.* ⭐ **HÁROM ALÁÍRT ESEMÉNY, nem egy „mentés"**: a prototípusban egy POST hozta létre a gondolatot, a kezdő tudatpontot és a küszöbeit — a koinóban ez három külön állítás. ⛔⛔⛔ **ÉS EGY TÉVEDÉSEM, AMIT CSABA HELYREIGAZÍTOTT — ÉS EGY VALÓDI HIÁNYT HOZOTT KI (2026-09-12).** Azt hittem, a prototípusban a szerző **közvetlenül** átírhatta a gondolatát, és ezért a `PATCH`-et őszinte 400-zal zártam le. ⭐ **Csaba:** *„a prototípusban is csak javaslat → egyezmény mentén lehet szerkeszteni, csak mivel ő az egyetlen tulajdonosa, ezért 100% támogatottság mellett azonnal megtörténik."* — vagyis **nincs kivétel és nincs külön út**: ugyanaz a gépezet fut, csak egytagú választókörrel. ⛔⛔ **ÉS A 100% NEM JÖTT MAGÁTÓL:** a prototípus a javaslat létrehozásakor **automatikusan lead egy támogató szavazatot** (`javaslatService.js:635`) — a koino ezt **nem tette**, és emiatt egy egytulajdonosú entitás saját szerkesztési javaslata **0 szavazattal, ELVETVE** zárult (mérve). ✅ Pótolva a `muveletek.js`-ben, mert **ez a javaslattétel jelentésének része** (aki javasol, az támogatja) — ha a hívóra bíznánk, az egyik út megtenné, a másik elfelejtené. ⚠️ **És egy második, finomabb rés ugyanitt:** a szavazatnak **ugyanazt az időbélyeget** kell viselnie, mint a javaslatnak — nulla döntési időnél a javaslat a **születése pillanatában** zár, és egy ezredmásodperccel későbbi szavazat már **késői** (szintén mérve). *Két esemény, egy tett — egy időbélyeg.* ✅ **ÉS A KÜSZÖB IS ELDŐLT (Csaba, 2026-09-12): `minimumDontesiIdo` = **1 MÁSODPERC** (korábban 1 nap; a prototípusé 0 volt). ⭐ **Miért nem 0:** a nulla ablak **elfajult** — a javaslat a születése pillanatában zárna, tehát rajtam kívül **senki más nem tudna beleszavazni**, akármilyen gyors. Az 1 mp ugyanúgy „azonnali” egytulajdonosnál, de nem zárja ki a többieket elvi szinten. ⚠️⚠️ **ÉS EZ NEM „GYORS DÖNTÉS”:** a **D4 bizonyossági mutatója** mondja meg, hol áll a valódi idő a minimum és a maximum KÖZÖTT — mérve: egy tulajdonos, egyhangú → **azonnal**; **két tulajdonos, 50% részvétel → 42 ÓRA**. *A minimum nem a szokásos, hanem a legjobb eset.* ⛔⛔ **A D66 szerint ez állapot-befolyásoló állandó:** ha egy már élő koino adatán változtatnánk, a régi és az új program **mást számolna** ugyanabból az eseményhalmazból — ez a sor **együtt mozog a koino nevével**. ⚠️ *És egy próba is tanult belőle: a beégetett `86400` helyett mostantól az `ALAP_KUSZOBOK`-ra hivatkozik — egy próba, ami a paraméter ÉRTÉKÉT rögzíti, a paraméter minden hangolását álhibának mutatja.*
✅ **ÉS AZ 5.8 ELSŐ DARABJA: A `JavaslatModal` (2026-09-13)** — 66 KB, bájtra a prototípusból, **3 önpróbával**. ⛔ **Eddig a lapról CSAK SZAVAZNI lehetett, javasolni nem:** a gépezet teljes volt (négy művelet, töredék-modell, különválás, egyesítés) — csak a felület hiányzott. ⭐ A kártyák **már hívták** (örökölt kód), tehát a helyőrző helyére lépett a valódi — *a 13 helyőrző ígérete másodszor is bevált.* ⚠️ **És a fordítás ITT van, egy helyen:** a modal a prototípus alakját küldi (`erintettEntitasok`, `modositasAdatok`), a koino `erintettek`-et ért. ⭐⭐ **Az `egyezmenyTarhelyId`-t SZÁNDÉKOSAN eldobjuk:** a prototípusban külön meg kellett mondani, hova kerül az egyezmény — a koinóban ez **következmény** (az egyezmény azonosítója AZONOS a javaslatéval, D17; a javaslat szülője az érintett). *A jó szerkezet megint elvette egy mező dolgát.* ⛔⛔ **ÉS EGY VALÓDI, NÉMA HIBÁT TALÁLT EZ A MUNKA:** a végrehajtás a `szoveg`-et **csak szövegként** fogadta el (`typeof === 'string'`), a szerkesztő viszont **blokk-tömböt** ad (5.7) — a módosítás lefutott, a cím átíródott, a **szöveg némán a régi maradt**, hiba nélkül. *Egy elhallgatott mező rosszabb, mint egy elutasított javaslat.* ✅ Javítva, és a próba **mindkettőt** méri. ⚠️ **Mellé egy `GET /api/kereses` is kellett** (az áthelyezés „hova?” és az egyesítés „mivel?” kérdése nélküle nem megy). ⛔ Ez a **kereső-réteg (Szakasz 6) előfutára**, és szándékosan kicsi: végignéz minden entitást, DE a **találat-szám felülről korlátos** (20) — *egy kereső, ami „mindent” adhat vissza, nem kereső.* Az ILLESZTÉS már milliárdos (kifejezés + korlát), tehát a valódi kereső-réteg a hívó változtatása nélkül léphet a helyére.
✅✅ **ÉS A FÁJL-RÉTEG HELYI FELE MEGÉPÜLT (2026-09-12) — A NÉV MAGA A BIZONYÍTÉK.** `fajlBlobTarolo` (`js/tar/fajlTar.js`), **13 önpróbával**. ⭐ A fájlt a **lenyomata** nevezi meg, ahogy mindent a koinóban: az esemény csak ezt a ~100 bájtos hivatkozást hordozza (6. szabály), a bájtok külön élnek (D3). ⭐⭐ **Két dolog ingyen jött:** az **ellenőrzés** (olvasáskor **újra lenyomatolunk** — mérve: a lemezen megrontott fájlt a koino **nem adja ki**; *ez ma a lemez, holnap a hálózat*) és a **duplikátum elnyelése** (ugyanaz a kép kétszer beszúrva EGY fájl a lemezen). ⛔⛔ **ÉS A TÍPUS A BÁJTOKBÓL JÖN, nem a kliens szavából** — ha a lap mondhatná meg, valaki HTML-t tölthetne fel `text/html`-ként, és a koino **a saját origin-jéről** szolgálná ki (XSS); az ismeretlen alak **letöltendő bináris**. ⚠️ **A feltöltés base64 egy JSON testben**, nem `multipart` — mert az 5.5 harmadik őre (csak `application/json`) az, ami a böngészővel **megállíttatja az idegen írást**; a +33% egy helyi kérésen olcsóbb, mint az őr feladása. ⛔⛔ **ÉS EGY ŐRT LAZÍTANI KELLETT, INDOKKAL:** egy `<img src>` **nem küld fejlécet**, a címébe pedig **tilos** jelszót tenni — az a cím a gondolat **eseményében** utazik, tehát a jelszó a **láncra kerülne és szétterjedne**. ⭐ Helyébe a **lenyomat lép jogosultságként**: 43 karakter, kitalálhatatlan, és aki nem látta az eseményt (ahhoz jelszó kell), nem tudja, mit kérjen. ⚠️ A kivételt **a hívó mondja meg** (`jelszoMentes`), a kapu továbbra sem tud a koinóról (7. szabály) — és **nyolc próba** bukik, ha a kivétel elmosódna. ⚠️ **A FELSŐ MÉRETHATÁR (`FAJL_KORLAT`) ma 2 MB, és ez KIINDULÁS, nem állásfoglalás** — Csaba nyitott kérdése. ⭐ **De NEM állapot-befolyásoló állandó (D66):** ha nálam 2 MB, nálad 5, **ugyanazt az állapotot számoljuk** — csak nekem nincs meg az a kép. *A D3 szerint a tartalmi réteg amúgy is elveszhet; a tartós magot ez nem érinti.* ⚠️ És **egy próba a saját kódomban talált hibát**: a `try` elnyelte az érvénytelen fájlnév hibáját, így egy `../../kulcs.json` alakú név **hiánynak** látszott, nem hibának — *a kettő nem ugyanaz* (D19). ⏸️ **Ami hátra van: a BÁJTOK SZÁLLÍTÁSA** két készülék között — addig egy kép **csak azon a készüléken van meg, ahol beszúrták**, és a többi a hiányt **látja** (404: *„ezt a fájlt nem ismeri ez a készülék"*), nem talál ki helyette semmit.
⛔⛔ **AMI NYITVA MARADT — A KÉPEK ÉS FÁJLOK SZÁLLÍTÁSA (D3), és ez Csaba döntése.** A prototípusban a kép **szerver-mappába** került, a blokk egy URL-t tárolt. A koinóban nincs szerver, és **másik szerverrel sem pótolható**: ⛔ a **2. szabály** (semmi ne múljon egyetlen címen) és ⛔ a **6. szabály KEMÉNY fele** (egy esemény ~400 bájt, egy fénykép ennek több ezerszerese) egyszerre zárja ki. ⭐ **Ezért a `FeltoltesKezelo` ŐSZINTÉN ELAKAD, nem csendben** — a szerkesztő minden más része megy (szöveg, link, entitás-hivatkozás, oldalak, előzmények, méretezés, mozgatás), és aki képet próbál beszúrni, **megtudja, miért nem megy** (a 13 helyőrző mintája, D19). ⭐⭐⭐ **ÉS CSABA MEGADTA A SZÁLLÍTÁS IRÁNYÁT (2026-09-12):** *„szükség lesz nagyobb entitások másolására is… az eseményekből a **buli alkalmával** megtudják a készülékek, hogy **kinek mire van szüksége**, és a buli után **fent kell tartani a kapcsolatot** azon eszközöknek, amik nagyobb csomagot küldenek egymásnak, addig, amíg végbe megy a másolás."* ⭐ **Két lépés, és a szétválasztás a lényeg:** a **felderítés** az eseményekből jön (nem kell új kérdezősködés — ugyanaz az elv, mint az `ALLAS`-nál), a **szállítás** pedig a buli után is él, de **csak a két érintett készülék között és csak amíg tart**. ⚠️ **És ez nem sérti az 5. szabályt:** az a koino **működésére** tiltja az egyidejű online létet — itt a kapcsolat **nem előfeltétel, hanem következmény**: az események már átmentek, a döntések számolhatók, és ha a másolás megszakad, a koino teljes értékűen megy tovább, csak a kép hiányzik. ⭐ *A D3 pontosan ezt mondja a tartalmi rétegről: **elveszhet**.* ⏸️ Nyitva: a szelet-méret és a folytatás megszakadás után · ki kezdeményez · hány párhuzamos átvitel · és a **felső mérethatár**.
⭐⭐ **ÉS A RANDEVÚ (Csaba, 2026-09-12):** *„a buli alkalmával mindenki kikűldi a kérelmeit, ami a böngészés közben született, és megkapja azokat a kéréseket, amik az ő eszközéről kérnek adatot. A **pajzsfuró elve** az, hogy **egyidőben** kell hogy keressék egymást, a kérelmező és a tároló eszköz. és egy eszköznek tudnia kell **párhuzamosan küldeni és fogadni is, több helyről**."* ⭐⭐⭐ **A BULI EGY TALÁLKOZÓ-MEGBESZÉLÉS** — és ez oldja meg a pajzsfúró nehéz feltételét: a `pajzsfuro.js` szerint *„nem elég, ha az egyik fél figyel… mindkét félnek KI KELL SZÓLNIA"*, vagyis az egyidejűség **működési feltétel**. Eddig véletlenen múlt; a bulival **megbeszélt** lesz. ⭐ **És a párhuzamosság sem új mechanizmus:** a pajzsfúró épp azért választott UDP-t, mert *„egyetlen UDP-foglalat egyszerre tud küldeni és fogadni ugyanazon a porton"* — a munka tehát a **nyilvántartás** (melyik átvitel hol tart) és a **korlátozás**, nem a szállítás. ⚠️ **Egy tisztázandó:** a kérelem **esemény vagy múlékony üzenet**? *Az én olvasatom: múlékony* (mint az `ALLAS`) — ⛔ eseményként **a böngészésem kerülne fel a láncra**, örökre és láthatóan (D6), és minden kérés ~400 bájttal növelné a tartós adatot, holott a kérés egyszeri.
✅ **ÉS A SZÁLLÍTÁS ELSŐ FELE MEGÉPÜLT: A FELDERÍTÉS (2026-09-13)** — `js/allapot/fajlIgeny.js` + a `fajlok` parancs, **12 önpróbával**. ⭐⭐ **A felderítés NEM KÍVÁN ÚJ ADATOT**, pontosan ahogy Csaba mondta: a gondolat szövegében ott a kép-hivatkozás, a besorolásban az ikon — *az események már elmondják, mely fájlok tartoznak a koinóhoz*; ez a réteg csak összeveti azzal, ami a lemezen megvan. ⛔⛔ **ÉS A TUDATPONT ITT TÁROLÁSI VÁLLALÁS (D3):** a válasz **nem egy lista, hanem kettő** — amire pontot tettem (tehát **vállaltam**), és ami csak „arra jár”. *Enélkül a felderítés azt jelentené: „add ide a koino összes képét” — épp az az alak, amit a 9. szabály tilt.* ⚠️ **Idegen címet nem veszünk fel** (2. szabály): csak a `/api/fajl/<43>` alakú hivatkozás számít, és a mintázat horgonyzott — rontás-próba őrzi. ⭐ A réteg **tárat és hálózatot nem importál** (1. szabály): a „megvan-e?” kérdést kívülről kapja, tehát tár nélkül próbázható.
✅ **ÉS A BULI KÉRDEZ IS — A FÁJL-KÉRELEM MEGÉPÜLT (2026-09-13):** `js/csere/fajlKerelem.js` + a `FAJLOK` üzenet, **12 önpróbával**. ⭐⭐ **A legfontosabb szerkezeti észrevétel: a fájl-csere MERŐLEGES az esemény-cserére** — két készülék eseményei egyezhetnek (a `LENYOMAT` megegyezik, a kör 334 bájttal kilép), miközben a **fájljaik teljesen eltérnek**, hiszen a bájtok sosem utaztak. *A kérdést tehát akkor is fel kell tenni, ha nincs mit cserélni eseményből.* ⛔ **Csak arra felelünk, amit kérdeztek:** a teljes fájl-listám elárulná, **mit néztem meg** — akkor is, ha a kérdező sosem hallott arról a gondolatról (D6); a kérdés és a válasz is **korlátos** (50), és a kör mérve **603 bájt** a 334 helyett. ⭐ **A ritkábbat előbb**, de ⛔ **a VÁLLALÁS ERŐSEBB a ritkaságnál** (D3: a tudatpont tárolási vállalás) — és *„ki mennyit adott” mérleg NINCS*, mert az rangsor lenne (D18/2, D48).
⛔⛔ **ÉS EGY VALÓDI PROTOKOLL-HIBÁT A KÉT FOLYAMATOS MÉRÉS FOGOTT MEG** — modul-próba nem találta volna. A fájl-kör feltétele elsőre a **saját** kérelem meglétéhez kötődött, így a figyelő (akinek nincs kérelme) **küldött, de nem olvasott** — az üzenet bent maradt a sorban, és a hiba **nem a fájl-rétegnél** jelentkezett, hanem később: *„Várt üzenet: CIMEK, érkezett: FAJLOK”*. ⭐ **A tanulság: egy protokoll-lépés feltétele csak olyan dolog lehet, amit MINDKÉT fél ugyanúgy lát** — itt a két **képesség-jelzés** együtt (`fajlCsere`), ami egyben a visszafelé-kompatibilitást is adja: egy régebbi társ nem jelzi, tehát **meg sem szólalunk** róla. ⚠️ **És egy tulajdonság a mérésből:** a fájl-felderítés **egy bulival később** jár, mint az esemény-csere — nem lehet olyan fájlról kérdezni, amiről még nem tudom, hogy létezik. *Ez nem hiba, hanem a sorrend következménye.*
✅✅ **ÉS A BÁJTOK IS MEGÉRKEZNEK — AZ ÁTVITEL KÉSZ (2026-09-13):** `js/csere/fajlAtvitel.js` + a `FAJLKEREK`/`FAJLSZELET` üzenetek, **16 önpróbával**. ⭐ **Saját kapcsolat fájlonként**, nem a párbeszéd közepébe ékelve — ugyanaz a minta, mint a `SZELETKEREK`-nél, és pontosan Csaba terve: *„a buli után fent kell tartani a kapcsolatot."* *Ez adja a párhuzamosságot is: három egyidejű átvitel = három kapcsolat, multiplexelés nélkül.* ⭐⭐ **A RÉSZLEGES FÁJL MÉRETE MAGA AZ ÁLLAPOT:** nincs szelet-nyilvántartás, mert a szeletek rögzített méretűek és sorrendben jönnek — a meglévő bájtok száma **megmondja**, hol folytassuk. *Ugyanaz az elv, mint az esemény-tárnál: a fájl tartalma az igazság, nem egy mellette vezetett napló.* ⛔⛔ **ÉS A LEZÁRÁS ÚJRA LENYOMATOL:** a bájtok **ideiglenes néven** gyűlnek, és csak akkor kerülnek a végleges nevükre, ha azt adják ki — *így egy megszakadt vagy meghamisított letöltés SOHA nem hagy hátra hamis fájlt*, és a félkész fájl **nem számít „megvan”-nak** (különben a bulin felajánlanánk másnak). ⭐ **MÉRVE, KÉT FOLYAMATTAL:** 150 KB-os kép, **3 szeletben**, `1 fájl megérkezett (150.0 KB)` — és a két fájl **bájtra azonos** (azonos md5), félkész maradvány nélkül.
⚠️ **KÉT HIBÁT A MÉRÉS TALÁLT, nem az érvelés:** (1) a figyelő **nem adta tovább** a `fajlOlvas`-t a párbeszédnek, így az ág el sem indult (a tünet félrevezető volt: *„a vonal lezárult, mielőtt a válasz megjött volna"*) · (2) a `fajlResz()` nem adott `olvas`-t, tehát a cserét kezdeményező fél nem volt forrás. ⚠️ **És egy MÉRÉSI csapda, ami engem is becsapott:** a birtoklás-jegyzet a társat `hoszt:port` alakban jegyzi — ha a próba minden körben MÁS porton indítja a figyelőt, a jegyzet a **régi** portot őrzi, és az átvitel halott címre megy. *Öt elavult port gyűlt össze, mielőtt észrevettem.* ⚠️ *És egy korábbi próba helyesen bukott: azt állította, hogy a fájl hiányzó MARAD — az átvitel megépültével ez már nem igaz. A próba a tárgyához igazodott, nem fordítva.*
✅✅✅ **ÉS A RANDEVÚ IS KÉSZ (2026-09-13) — A FÁJL ÁTMEGY AZ ÁTFÚRT RÉSEN.** ⭐⭐ **ÉS ITT TÉRÜLT MEG AZ 1. SZABÁLY:** a `fajlHozatala` mostantól **kapja** a kapcsolatot, nem ő nyitja (`tcpNyito` / `fajlUdpResen`) — ezért **ugyanaz a kód** fut TCP-n és a pajzsfúrt résen. *A fájl-átvitel logikája nem is tudja, melyiken beszél.* ⛔⛔ **ÉS KÉT HIBÁT A RÉS MUTATOTT MEG, amit TCP-n semmi nem jelzett:** **(1)** szeletenként ÚJ kapcsolat nyílt — TCP-n ez működik (a figyelő mindet elfogadja), de az átfúrt résen **nincs „elfogadás"**: ott egy foglalat van és egy társ, tehát a második szeletnél már senki nem figyelt · **(2)** a befejezést a **kapcsolat lezárásából** olvastuk ki — ⚠️ **a UDP-nek viszont nincs lezárása**, tehát a kiszolgáló a tétlenségi órájáig várt. ✅ Mindkettő javítva (**egy kapcsolat, minden szelet** + kimondott `KESZ`), és ⭐ **a TCP-út is gyorsabb lett tőle**. *A szállítás-függetlenség nem elméleti igény — a rés mutatta meg, hol sérült.*
⚠️ **ÉS EGY MÉRÉS, AMI DÖNTÉST KÍVÁN MAJD** (16., `meres/resSebessegMeres.js`): a UDP-vonal **egyszerre egy darabot tart úton** (stop-and-wait, 1000 bájt/darab). ⭐ Helyben ez alig számít (**2909 vs. 4923 KB/s** — a pajzsfúrás önmagában nem drága), ⛔⛔ **de már 1 ms/csomag késleltetésnél 25 KB/s** — **116-szoros** esés. ⭐⭐ **És a szelet mérete ezen NEM segít:** 64 KB = ~87 darab = 87 oda-vissza, akár egy szeletben van, akár nyolcban — *a szűk keresztmetszet a vonal ABLAKA, nem a szelet.* ⏸️ Ha egyszer sorra kerül, az ablak a `udpVonal.js`-ben marad, a fájl-átvitel **egyetlen sorának változtatása nélkül**. ⚠️ *És amit a mérés NEM mond meg: a +1 és +5 ms közötti különbség eltűnt (25 vs. 23 KB/s) — ez a mérés HATÁRA, nem eredmény; valódi hálózaton kell újramérni.*
⭐⭐ **ÉS CSABA NÉGY DÖNTÉSE A SZÁLLÍTÁSRÓL (2026-09-13, jóváhagyva):** **(1)** a **kérelmező kezdeményez** — ő tudja, mire vár, és a birtokló oldaláról ez listát kívánna (*ugyanaz az irány, mint a `tarsak.js` körbejárásánál*) · **(2)** a szelet **64 KB**, és ⭐ **a folytatáshoz nem kell új gépezet**: a részleges fájl ideiglenes néven áll, a végén **újra lenyomatolunk** (ez már megvan), és csak akkor kerül a végleges nevére — *így egy megszakadt letöltés soha nem hagy hátra hamis fájlt* · **(3)** **3 egyidejű átvitel irányonként, és társanként legfeljebb egy** — hogy egy lassú társ ne foglalhassa le az egész készüléket · **(4)** **a ritkábbat előbb**, és ⛔ **nincs „ki mennyit adott” mérleg** — az rangsor lenne, amit a koino már kétszer elvetett (D18/2, D48).
⏸️ **A javaslat, ha majd eldől:** a koino saját mintája — a fájlt a **lenyomata** nevezi meg (mint mindent a koinóban), az esemény csak ezt a ~100 bájtos hivatkozást hordozza, a bájtok a tartalmi rétegben utaznak, és az ellenőrzés **ingyen van** (újra-lenyomatolni és összevetni) — *a csatornát nem kell megbízhatóvá tenni* (3. szabály). ⚠️ **Második nyitott pont ugyanitt:** az **entitás-hivatkozás** keresése a `GET /api/kereses`-re épül — az a **kereső-réteg** (Szakasz 6).
⭐ **ÉS EGY ÚJ PRÓBA-FAJTA: forrás-próba a BÁJT-AZONOSSÁGRA.** Az „örökölt kód változatlan" eddig **ígéret** volt; most mérjük, és a próba **megnevezi** az eltérő fájlt. ⛔ A helyőrzőket nem listázzuk, hanem **felismerjük** (a `helyorzoModal.js` importjáról) — így amikor egy helyőrzőt valódira cserélünk, a fájl **magától** bekerül az ellenőrzés alá; *épp ez történt a `GondolatModal`-lal.* ⚠️ És mellé kellett egy másik próba, ami azt méri, hogy **nem vak**: ha minden fájlt kihagyna (nincs `frontend/`, csupa helyőrző, elgépelt útvonal), akár úgy is zöld lenne. ⚠️ *És egy valódi hibát a mérés talált: a parancssor `[object Object]`-et írt ki a lapról létrehozott gondolatra — a szöveg ugyanaz a mező **két alakban** (a parancssoré szöveg, a szerkesztőé blokk-tömb), és a kéz nem értette a lapét.*
✅ **ÉS AZ 5.6 (A BELÉPŐ TÉR) KÉSZ** (2026-09-12): [`js/allapot/ter.js`](koino/js/allapot/ter.js) + `GET /api/ter` + `POST /api/ter/valt` + a `ter` parancs, **19 önpróbával**. A pakli egy koinón BELÜL mutat kártyákat, a tér a koinók FÖLÖTT. ⭐ **A készülék félig már fel volt készülve rá:** a **kulcs** (`kulcs.json`) és a **társ-lista** (`tarsak.json`) eddig is a koinók FÖLÖTT laktak — *az azonosságod téri, a tagságod koino-helyi, pontosan ahogy a D25 mondja.* ⛔⛔ **A HATÓKÖR KIMONDVA (Csaba):** a v1 azt mutatja, amit **ez a készülék ismer** — idegen koinók böngészéséhez a **kereső-réteg** kell, ami szándékosan elhagyható és nincs megépítve; a felület ezért kiírja a határt (`csakAmitIsmerunk`), és **próba őrzi, nem komment**. ⭐ **A RENDEZÉS: létrehozási idő, új elöl** (Csaba) — a `KoinoLetrehozas.ido` a szerző órája, tehát állítás, de **minden készüléken ugyanaz a sorrend**; a „mikor láttam először" hamisíthatatlan, viszont gépfüggő — *a koino mindenhol a determinizmust választja*, és a másikat is eltesszük (`eloszorLattam`), így a döntés megfordítása egy sor. ⛔ **Létszám szerint SOHA nem rendezünk** (D18/2 hamisítható toplistája) — a `RENDEZESEK` lista ezt kizárja, és próba méri.
⭐⭐ **ÉS A TERV KÉT NYITOTT KÉRDÉSÉRE MEGJÖTT A VÁLASZ.** *„Mit mutasson a kártya a létszám mellé, hogy a szám súlya látszódjon?"* → **három szám, nem egy:** `tagok` · `nemEllenorizhetok` · `belepok` — ugyanaz a D19-es hármas, amit az AZONOSSÁG szakasz használ, **új gépezet nélkül**. ⭐ *A különbségük MAGA a súly:* ahol 900-an beléptek, de 12-nek van visszavezethető meghívási lánca, az **ránézésre más**, mint ahol 900-ból 900. ⚠️ **És a „létszám = a koino állítása" aggály szűkebb, mint a terv hitte:** csak arra a koinóra igaz, aminek **nincs meg az adata** — amelyiknek megvan, ott a szám **aláírt eseményekből számított tény**. *Az a kereső-réteg jövőbeli gondja, nem a mai.*
⛔⛔ **A SZERKEZETI DARAB: A FELÜLET KOINÓT VÁLT.** A parancssor egy koinóra szól (a `KOINO_AZONOSITO` indításkor eldől), és ez helyes; a tér viszont a koinók fölött áll, tehát a lap **újraindítás nélkül** lép be az egyikbe, majd egy másikba. ⭐ A felület koinónként tart egy **nyitott állapotot** (saját tár, környezet, pakli-nézet), és a kezelő **árnyékolja a neveket** — ezért egyetlen végpont kódját sem kellett átírni miatta. ⚠️ **A pakli-nézet koinónként külön**, mert a horgony „az első N esemény" képe, és az eseményhalmaz koinónként más — közös nézettel a váltás után **másik koino képe** jönne a gyorsítótárból. ⚠️ **A „belépés" NEM bejelentkezés** (D15): a kulcs minden koinóban ugyanaz, csak a lap néz máshová; ⛔ és csak **létező** koinóra lehet váltani, mert az `esemenyTarNyitasa` létrehozná a mappát — egy elgépelt név némán új, üres koinót csinálna a téren.
⚠️ *És egy dolgot megint a böngésző mondott meg, nem az érvelés: a `hidden` attribútum csak a böngésző alap-stíluslapján állít `display: none`-t, amit **bármelyik osztály-szabály felülír** — a `.koino-sav { display: flex }` miatt a tér sávja a pakli mellett is látszott.* ⏸️ A térből hátra: a kártya-hamburger és az alsó sáv (új koino indítása — ma parancssorból).
🚧 **AZ 5.5 ELSŐ FELE KÉSZ** (2026-09-06) — ⭐⭐ **és ez a szakasz legnagyobb határátlépése: eddig MINDEN végpont OLVASÁS volt.** Innentől a lap **eseményt írat a kulcsommal**, vagyis a tét már nem az adat kiszivárgása, hanem hogy valaki a **nevemben cselekedjen**. ⛔⛔ **A harmadik őr (a jelszó és az Origin mellé): csak `application/json` testet fogadunk el** — egy idegen lap `<form>`-mal vagy egyszerű `fetch`-csel küldhetne POST-ot **előellenőrzés nélkül**, a JSON tartalomtípus viszont **kötelezővé teszi** az előellenőrzést, amit a kapunk nem enged át; ⭐ *így a böngésző maga állítja meg az idegen írást.* Mellé **256 KB-os test-korlát**, menet közben nézve. ⭐ **Minden írás EGY MŰVELET** a `muveletek.js`-ből → **egy aláírt esemény**, ugyanazon az `esemenyMentese` kapun (3. szabály); a szabályokat a **számítás** őrzi, nem a felület. Végpontok: `POST /api/tudatpont/hozzarendeles` · `PUT /api/tudatpont/szerep/…` · `POST /api/ertekJavaslat`. ⭐ **Négy modal jött át változatlanul** (Tudatpont · RészvételiBeállítások · Részletek · ÉrtékJavaslat + négy segéd) — a helyőrzőket egyszerűen felülírták, *ez volt a 13 helyőrző ígérete*. ⚠️ *A küszöb-nevek eltérnek; a fordítás EGY helyen van (`pakli.js`, `KUSZOB_KIFELE`) — a koino nem veszi át az idegen neveket.* ✅ **ÉS A SZAVAZÁS IS KÉSZ** (2026-09-06): a javaslatok **kártyaként** megjelennek a pakliban (⚠️ *a rendezési értékük az ÉRINTETT entitásé — különben a lista végére süllyednének, elszakadva a gondolattól, amiről szólnak*), és a szavazás-fülön kattintva **aláírt esemény** születik. ⭐ **Ezzel a koino fő köre a lapon is teljes:** javaslat → szavazás → egyezmény → az egyezmény rávezetése. ⛔ **A szavazat visszavonása őszinte 400-at ad** (nincs ilyen művelet, 5.4) — *„megváltoztatható, de nem vonható vissza; ha nem foglalsz állást: Tartózkodom."* ⚠️ *Két dolgot megint a böngésző mondott meg: (1) a body-t a `bodyFrissitese()` tölti fel, és azt MINDEN kártyára hívni kell — nem csak akkor, ha van szöveg (enélkül a javaslat-kártya body-ja üresen maradt, fülsáv és szavazás nélkül); (2) a `JavaslatKartya` a szavazás-fület kifejezetten az `'Aktiv'` státuszhoz köti, a koino viszont `'folyamatban'`-t mond — a leképezés az adapterben (`STATUSZ_KIFELE`).* ⭐⭐ **ÉS EGY MODELL-JAVÍTÁS (Csaba, 2026-09-06): A JAVASLAT IS ENTITÁS** — *„kell neki tudatpont, akárcsak a többi entitásnak"*. ⚠️ Korábban tévesen azt írtam, hogy „nem entitás, hanem döntés"; a **D27/5** épp az ellenkezőjét mondja (*„egy entitás a többi között"*). Mostantól **két réteg, egy azonosító**: az **entitást** az `allapotSzamitas.js` számolja (tudatpont, küszöb, szülő, gyerekek), a **döntést** a `javaslatSzamitas.js` (szavazatok, státusz, egyezmény). ⭐⭐ **A szülője az ÉRINTETT entitás** (D27/1: „gondolatból ágazik ki") — ez **megszüntetett egy kényszer-megoldást**: eddig kézzel kölcsönöztük a rendezési értékét, most a hierarchikus rendezés amúgy is a szülője mellé teszi. *A jó szerkezet elvette a szabály dolgát.* ⚠️ Következmény: a javaslat **túléli az érintettje elfelejtését**, mert a D14 rá is külön vonatkozik — és a `javaslat` parancs mostantól tudatpontot is rendel hozzá. **Az elnevezés a D27 szerint: SZERKESZTÉSI javaslat / egyezmény.**
⭐⭐ **ÉS AZ ÉRINTETT ENTITÁSOK TÖMBJE — átültetve a prototípusból (2026-09-07).** Csaba kérése az volt, hogy a `koino_1.1`-et *„le kell másolni, a logikai kapcsolatoknak pontosan át kell hogy legyenek ültetve"* — a leltár: [`docs/javaslat_atultetes.md`](docs/javaslat_atultetes.md). ⭐ **A művelet ENTITÁSONKÉNTI:** minden elem `{ entitas, muvelet, valtozas }`, a végrehajtás elemenként fut, és **egy elem elakadása nem dönti el a többit** (a `kihagyottak` megnevezi, melyik és miért — D19). ⛔⛔ **A jogosultság METSZET, nem unió** (`javaslatJogosultsagService.js`: *„tudatponttal MINDEN érintett entitáson"*) — ugyanaz a feltétel a javaslattételre és a szavazásra. ⚠️ **A régi, egy-`erintett`-es események érvényesek maradnak** (az aláírás a régi bájtokra szól): egy elemű listaként olvasódnak, és a próbák nagy része továbbra is a régi alakot használja, tehát a visszafelé-olvasás **mérve van**. ⭐ **Amit szándékosan NEM vettünk át:** az `entitasTipus` mezőt (a típus magában az entitásban van; egy második, aláírt, de **hazudható** forrás ugyanarról nem érték) — és az **ismeretlen műveletet a szabály-réteg NEM dobja el**, mert az legvalószínűbben *egy újabb program-változat*: ha a régebbi készülék kidobná, a két gép **más javaslat-halmazt látna**. A `JAVASLAT_MUVELETEK` így nem kapu, hanem a mai lista.
⛔⛔⛔ **ÉS A MÁSODIK FÉL, AMI MINDENT ÁTRENDEZETT: A TÖREDÉK-MODELL (2026-09-07).** Az első átültetés a metszetet a **döntésre** is ráhúzta — egy szavazás, aminek a választóköre az érintettek metszete. **Ez nem a prototípus.** Ott a több entitást érintő javaslat **töredékekre bomlik, érintettenként egyre** (`javaslatService.js:519`), és onnantól: a töredék típusa **az adott entitás művelete**, a szülője **az adott entitás** · **szavazni töredékenként lehet**, a jogosultság ott már csak arra az EGY entitásra kérdez rá (a `szavazatService` a jogosult töredékekre leadja, a többit **átugorja**, és csak akkor dob hibát, ha egyikre sem jogosult) · a **küszöb és a részvételi arány töredékenként** számítódik, az adott entitás saját tulajdonosaival · a **lezárás ideje közös** (a leghosszabb döntési idő) · és a csoport **akkor és csak akkor elfogadott, ha MINDEN töredék teljesíti a SAJÁT küszöbeit** (`javaslatIdozitesService.js:566`). ⭐ **A metszet tehát CSAK A BEADÁSRA vonatkozik** — a döntés entitásonként dől el, és **ÉS**-sel áll össze: *aki a gondolatot tartja, az dönt a sorsáról, akkor is, ha a javaslat egy másikat is érint.* ⚠️ **Amit át kellett alakítani:** a koinóban nincs N tárolt töredék, mert egy aláírt `Javaslat` esemény van — **N tárolt rekord helyett N SZÁMÍTOTT RÉSZ** (`javaslatSzamitas.js`: `reszekSzamitasa`). Ugyanaz a minta, mint a D17-nél: ami ott adatbázis-sor, az itt számítás.
⛔⛔ **ÉS EGY VALÓDI RÉS, amit a próba talált — a szavazat jogosultsága.** A koino **minden szavazatot beleszámolt**: a jogosultságot csak a **felület** nézte (`pakli.js`, `szavazhatok`). ⚠️ *Amit a számítás nem ellenőriz, az nem szabály, csak illemtan* — egy kézzel írt `Szavazat` eseménnyel bárki dönthetett volna olyan gondolat sorsáról, amihez semmi köze. **Javítva**, de az első javításom **túllőtt a prototípuson**; a részletes összevetés három ponton igazította ki: ⭐ **a jogosultság a LEADÁS pillanatában dől el** (nem a lezárásén — különben a tudatpontom elvétele a **szavazatom visszavonása** lenne, pedig *„megváltoztatható, de nem vonható vissza"*) · ⭐ **a passzív figyelő SZAVAZHAT** (a prototípus jogosultság-ellenőrzése csak pontot néz, és a szavazás maga **billenti aktívvá** — `szerepAktivalasa`: *„ezt hívja minden döntés-alakító tett"*) · ⭐ **a nevező unió**: aktív tulajdonosok ∪ szavazók.
⛔⛔ **ÉS EGY MÁSODIK VALÓDI HIBA: a rendezés nem volt tranzitív.** A töredék-próba hol átment, hol elbukott — **a generált kulcsoktól függően**. Az ok: az azonos időbélyegű események holtverseny-döntője *„azonos szerzőnél a sorszám, egyébként az azonosító"* volt, és ez **nem tranzitív** (X < Y sorszám szerint, Y < Z és Z < X azonosító szerint) — ilyen körnél a `sort` eredménye tetszőleges, vagyis **két gép más sorrendet kap ugyanabból a halmazból**. ✅ Javítva: `ido → szerzo → sorszam → azonosito`. ⭐ *A tanulság ugyanaz, mint mindig: egy próba, ami csak néha bukik, nem „szeszélyes" — hanem igazat mond.*
✅ **ÉS A TÖRLÉS MEGÉPÜLT (2026-09-07)** — ⭐⭐ **és a prototípusban ez NEM „törlés"**: a `torlesiVegrehajto.js` egyetlen érdemi lépése a `tudatpontokVisszaosztasa`, és az entitás attól szűnik meg létezni, hogy 0 pont marad rajta (D14). *A törlés nem külön mechanizmus, hanem a felejtés kiváltása.* ⚠️⚠️ **Egy valódi eltérés viszont kellett:** a prototípus szervere **mások nevében** nullázott; a koinóban ez lehetetlen és nem is szabad (a tudatpont-rendezés ALÁÍRT esemény, D15). Ezért az entitás megszűnik, de a pontok a gazdájuk keretében **lekötve maradnak**, amíg ő maga vissza nem veszi (`pont <azonosító> 0`) — ez a **kézi út** (4. szabály), és a `torol` parancs ki is írja. Új parancsok: `torol <azonosító> [indoklás]` · `athelyez <mit> <hova|gyoker> [indoklás]`.
⭐⭐⭐ **ÉS EBBŐL KIDERÜLT EGY RÉGI, MÉRHETŐ KÁR: az árvák nem kerültek fel.** A prototípus a 0 pontos entitás törlésekor **minden gyerekének átírja a szülőjét a törölt entitás szülőjére** — a „kaszkád" ott **felkerülést** jelent, nem törlést. ⛔ A koino ezt nem tette meg: a gyerek nem létező szülőre mutatott, ezért az **ág-összesítés megszakadt** (`if (!szulo) continue`), és a hierarchikus rendezés elveszítette az egész alsó ágat. ✅ Megépítve (`arvakFelkerulese`), és **nem csak a törlésre, hanem a D14 szerinti felejtésre is** — az a gyakoribb eset, és a prototípusban is ugyanaz a függvény intézi. ⚠️⚠️ **Egy különbségtétel kellett hozzá, ami a prototípusban nem létezhetett:** ott minden entitás megvolt az adatbázisban, itt a hiányzó szülő **kétféle** — ha **ismertük és elfelejtették**, felkerülés; ha **soha nem láttuk** (a létrehozó eseménye még nem érkezett meg), **nem nyúlunk hozzá**: az hiány, nem tény (D19). Különben egy lemaradt készüléken fél pakli ugrana a gyökérre, majd a hiányzó esemény megérkezésekor vissza. ⭐ **És ezzel az egyezmény helye is megoldódott törlésnél** (a leltár 2.2), külön szabály nélkül: az egyezmény a javaslat-entitás, a szülője az érintett — ha az eltűnik, az árva-szabály felviszi a nagyszülőhöz. *A jó szerkezet megint elvette a szabály dolgát.*
✅ **ÉS AZ `Egyesites` IS MEGÉPÜLT — ⭐⭐ CSABA DÖNTÉSÉVEL (2026-09-07): NEM SZÜLETIK ÚJ AZONOSÍTÓ, AZ ELSŐ ÉRINTETT OLVASZTJA BE A TÖBBIT.** A kérdés az volt, honnan kapjon azonosítót az egyesített gondolat: a koinóban **minden azonosító egy aláírt esemény lenyomata**, és ezen áll az egész ellenőrizhetőség — egy „új" entitáshoz viszont nem tartozna esemény (a javaslaté már foglalt: *az az egyezményé*), tehát egy **második származtatott azonosítót** kellett volna bevezetni, amit senki nem írt alá. ⭐ Az elnyelés ezt elkerüli, és **több logikai kapcsolatot old meg magától**: a rá mutató **régi hivatkozások megmaradnak** (ugyanaz az elv, mint a különválásnál: *„a főág tartja meg az azonosítót"*), és **az egyezmény helye is jó lesz külön szabály nélkül** — a javaslat szülője úgyis az első érintett, pedig a prototípusban ehhez placeholder-feloldás kellett. ⭐ A többi logikai kapcsolat változatlanul átjött: a pontok **emberenként összeadódnak** (aki bármelyik forráson aktív volt, az az egyesítettben is aktív), a beolvasztottak **gyerekei az ELNYELŐHÖZ** kerülnek — ⛔ **nem a nagyszülőhöz**, és ezért kell őket az eltűnés ELŐTT összegyűjteni (Csaba döntése, 2026-07-22) —, a hely pedig a források **legközelebbi közös őse**. ⚠️ **Az ára, kimondva:** az egyesített gondolat az **elnyelő történetét folytatja** (szerző, létrehozás ideje, mérete), nem a javaslattevőét. ⭐ **Ezzel mind a négy szerkesztési műveletnek van végrehajtója ÉS kézi útja**: `javaslat` · `torol` · `athelyez` · `egyesit`.
⛔⛔ **ÉS AMIT CSABA KÉRDÉSE KIHOZOTT: „ha nem veszi vissza a pontját, akkor az entitás hogyan törlődik?" (2026-09-07).** A válasz első fele: **az entitás törlődik** — az eltűnés SZÁMÍTÁS az egyezményből, nem a pontok nullázódásának következménye, tehát minden készüléken ugyanaz jön ki. ⚠️ **A második fele viszont egy valódi hibát takart, és rosszabbat, mint amit mondtam.** Mérve: a törlés után a `szetosztottPontok` (az ÉLŐ entitásokból) 100-at mondott, a szabály-réteg a saját láncból 200-at — *„a bemondott összeg ellentmond a saját láncának"* —, vagyis **a készülék következő tudatpont-eseménye elbukott, és onnantól semmi újat nem tudott létrehozni**. ⭐ A gyökér: **két különböző definíció ugyanarra a számra**. Eddig egyeztek, mert egy entitás csak úgy tűnhetett el, ha mindenki 0-ra állt rajta — a törlési egyezmény ezt törte el. ✅ Javítva: az állapot vezet egy **kiosztási főkönyvet** (`allapot.kiosztasok`), és a „mennyit osztottam ki" abból számol — ez a D42 kérdése (*mit mondtam ki a saját láncomban*), és egyetlen eseményből ellenőrizhető. *Hogy az entitás létezik-e még, az MÁS kérdés; két kérdésnek nem lehet egy válasza.*
⭐⭐⭐ **ÉS A FELSZABADÍTÁS AUTOMATIKUS LETT — mert tévedtem, amikor azt írtam, „nem lehet".** Azt mondtam: „senki nem írhat alá helyettem" (igaz), és ebből azt következtettem, hogy a visszavétel kézi marad — **rossz következtetés**: a koino **az ÉN készülékemen fut, az ÉN kulcsommal**, tehát amikor a készülékem aláírja, hogy „leveszem a pontomat egy gondolatról, ami már nem létezik", az nem helyettem ír alá, hanem a saját készülékem könyvel. *(Precedens: a `javaslat` parancs ma is aláír egy második eseményt magától.)* ⚠️⚠️ **DE NEM AZONNAL (Csaba döntése):** a koino szerint *„a késve MEGÉRKEZŐ, de a határidőn belüli időbélyegű szavazat jogosan módosítja az eredményt"* — tehát **egy törlés vissza is fordulhat**, és ha addigra felszabadítottunk, a gondolat a pontom NÉLKÜL térne vissza; ha csak az enyém volt rajta, a felszabadításom **maga törölné el**. ⭐ Ezért **megülepedés** — és ⭐⭐ **BULIKBAN mérve, nem időben (Csaba, 2026-09-07)**: *az idő múlása semmit nem bizonyít* (egy kikapcsolt készülék mellett három nap alatt sem érkezik semmi), a **csere-kör** viszont azt méri, ami történik: hogy beszéltem másokkal, és nem hoztak újat. ⛔ **A néma kör nem buli** — csak az számít, amiben **legalább egy társ felelt**. ⚠️ És mellé kell a **döntés jele** (egyezmény + lezárás + a szavazás állása): ha az megváltozik, a számláló **nulláról indul** — *nem a bulik gyűlnek, hanem a MOSTANI döntés melletti bulik*. ⚠️⚠️ **A szám (ma 3) MÉG NINCS MEGMÉRVE.** A várakozás ingyen van — a fenti javítás után a koino az elakadt ponttal is hibátlanul működik. Az `orjarat` minden körben elvégzi, a `felszabadit [buli]` a kézi út (0 = azonnal), és az állapot kiírja, mennyi áll még. ⛔ **Egy csapdát is kikerült:** a **beolvasztott** (egyesített) forrás ugyanúgy „eltűnt", de ott a pont **átment az elnyelőbe** — ha a felszabadítás a puszta `elfelejtettek` listát nézné, ráírna egy `pont: 0`-t, és a következő számításnál az egyesítés **nem találná meg a pontjaimat**. Ezért a törlés **külön listát** vezet (`allapot.torlesek`). *Ugyanaz a szó, két ellentétes következmény.*
⭐ **ÉS EGY 4. SZABÁLY-HIÁNY, amit ez a munka talált:** az **érték javaslatnak** (küszöbök) **nem volt kézi útja** — csak a felületről ment (`POST /api/ertekJavaslat`), vagyis a küszöb-állítás böngésző-függő volt. ✅ Pótolva: `ertek <azonosító> <elfogadási%> <részvételi%> <min mp> <max mp>`.
⭐⭐ **TÍPUS-ALAPÚ TILTÁSOK is átjöttek** (`szabalyok.js`: `TILTOTT_MUVELETEK`): *egyezményre csak áthelyezés vagy törlés* · *kategóriát és gondolattípust nem lehet áthelyezni* · *gondolattípust nem lehet egyesíteni* · *egyesíteni csak azonos típusút, és csak gondolatot vagy kategóriát* · *az egyesítés nem keverhető más művelettel*. ⭐ **És itt látszik, miért volt helyes az `entitasTipus`-t kihagyni az eseményből:** a szabály a **valódi**, számított típusra vonatkozik, nem a bemondottra — tehát **nem lehet hazudni**. ⚠️ Az ismeretlen típus (még meg nem érkezett létrehozó esemény) **nem vád, hanem jelzés** (`nemEllenorizhetok`, D19) — és ezt a listát az állapot eddig eldobta, most továbbadja.
⛔⛔ **ÉS A BULI-SZÁM MEGMÉRVE — a mérés CÁFOLT (2026-09-08):** `node koino/meres/felszabaditasMeres.js` ([`eredmenyek.md`](koino/meres/eredmenyek.md) 13.). ✅ **A hálózat lassúsága ellen a buli-szám olcsón véd**: ha mindenki ébren van, **K=2 → 0%** korai felszabadítás (200 fősnél is). ⛔ **Az ALVÓ készülék ellen viszont SEMMILYEN véges szám nem véd**: 20 kör alvásnál **K=8 mellett is 100%** a korai felszabadítás. ⭐⭐ **A tanulság nem az, hogy melyik szám a jó, hanem hogy ROSSZ DOLGOT SZÁMOLUNK**: a buli-szám a **hálózat terjedési idejét** méri, nem azt, hogy a döntésben **érintett emberek** megszólaltak-e. ⭐⭐⭐ **A jobb jel, és már megvan hozzá minden**: ismerem-e **minden jogosult szavazó láncát a lezárás utáni pontig**? Aki azután bármit aláírt, az **nem tud visszamenőleg beszavazni** — az a saját láncában **visszafelé lépő idő** lenne, amit a koino ma is felsorol (`idoEllentmondasok`). ⭐ Ez **bizonyíték, nem valószínűség**, és pont abból áll, amit a csere úgyis megmond (`ALLAS`: szerzőnként a legnagyobb sorszám), illetve amit a `Lattam` (D61) kifejezetten aláír. ⏸️ Amíg ez nincs megépítve, a buli-szám marad **olcsó heurisztikaként** (3).
⭐⭐⭐ **ÉS A KÜLÖNVÁLÁS ELSŐ FELE MEGÉPÜLT (2026-09-08)** — a leltár legnagyobb tétele: [`docs/javaslat_atultetes.md`](docs/javaslat_atultetes.md) 2.1/b. A prototípus első körének **hatóköre is ugyanaz**: `Modositas`, elfogadott javaslat, az **ellenzők** viszik a **régi** változatot. ⭐ **Aki elmegy, viszi a súlyát**: a tudatpont **átkerül, nem duplázódik** — a főág prioritása ennyivel csökken. ⛔ **A tartózkodó SOHA nem válik külön**: a `muveletek.js` hamisra állítja, **és a számítás is ellenőrzi** (egy kézzel írt esemény hazudhat). ⭐ Új mező a `Szavazat` eseményben: `kulonvalasIgeny` — parancssorból `szavaz <javaslat> ellenez kulonag`. ⭐ **A két ág összekötésének alakját nem kellett kitalálni**: a prototípus `GondolatKartya.js` „Másik ág" füle pontosan a `kulonvalasok: [{ testverId, testverTipus, testverCim, agSzerep, kulonvalasIdeje }]` alakot olvassa. ⛔⛔ **A FŐÁG NEM ESHET NULLÁRA** — ha a végrehajtáskor már mindenki a különválók közt van, a szétválás nem történik meg (különben a főág gazdátlanul eltűnne, D14), és a kihagyás **látszik**.
⚠️⚠️ **ÉS EGY VAK PRÓBA, AMIT A RONTÁS-PRÓBA BUKTATOTT LE:** a „nem maradna főág" őrt elvetett javaslattal próbáltam, ami **el sem jut az őrig** — kikapcsolva semmi nem bukott. ⭐ A valódi eset ravaszabb: a **támogatók a szavazás UTÁN veszik el a pontjaikat**, tehát a döntés elfogadva marad (a lezárás pillanata szerint), de a végrehajtáskor már csak a különválni akaró ellenző a gazda. *Ötödször jött elő ugyanaz a szabály: egy zöld próba önmagában nem bizonyíték.*
⭐⭐ **A SZÁRMAZTATOTT AZONOSÍTÓ ÉS AZ ÁRA:** a különvált ág azonosítója `lenyomat({ fajta: 'kulonvalas', forras, egyezmeny })` — **ugyanolyan alakú 43 karakteres lenyomat**, mint bármelyik másik; a különbség, hogy **nincs mögötte aláírás, csak levezetés** (Csaba kimondása: *minden azonosító aláírt eseményekből számítható*). ⚠️ Az ára: **a harmadik fázis ASZINKRON lett**, mert a `lenyomat` a WebCryptót hívja. A másik út (összefűzött név) elkerülte volna, de akkor **kétféle azonosító-alak** lenne a koinóban; a hívók amúgy is aszinkronok voltak, tehát az ár kicsi, a nyereség egységes azonosító-modell.
⭐⭐⭐ **ÉS A LESZÁRMAZOTTAK SZÉTOSZTÁSA IS KÉSZ (2026-09-08)** — három kimenet, leszármazottanként külön: **MARAD** (a különválóknak nincs rajta pontja; ⚠️ ha a szülője elköltözött, a **legközelebbi megmaradt ősre** kötjük át) · **KÖLTÖZIK** (csak nekik van rajta pontja → az egész entitás átvándorol a pontjaival) · **DUPLÁZÓDIK** (mindkét oldalnak van → mindkét ágon kell egy példány). ⭐⭐ **És a duplázódásnál a FEJSZÁM dönt** (Csaba): az eredeti azonosítót **az az oldal viszi, ahol több ember áll**, a másik kapja a származtatott nevet; **a szerző másolódik**, attól függetlenül, hogy tulajdonos-e még. ⚠️ Egyenlőségnél a **főág** tartja (determinisztikus, senkit nem jutalmaz). ⚠️ **A GYÖKÉRNÉL viszont NEM a fejszám dönt**, hanem a főág tartja az azonosítót — ez a prototípus viselkedése, és a fejszám-szabály a **duplázódó leszármazottakra** szólt; ⏸️ a gyökérre kiterjeszteni külön döntés.
⚠️⚠️ **ÉS EGY MÁSODIK VAK PRÓBA UGYANEBBEN A MENETBEN:** az **árva-átkötés** ága méretlen volt — kikapcsolva semmi nem bukott, mert minden próbám **egyszintű** ágat használt. A valódi eset **két szintet** kíván: a középső elköltözik, az alsó marad, és ilyenkor az alsó egy olyan szülőre mutatna, ami már a másik ágon van. *Ugyanaz a szabály, kétszer egy napon: a zöld próba nem bizonyíték, amíg ki nem kapcsoltad, amit mér.*
⭐⭐⭐ **ÉS A KÜLÖNVÁLÁS KEREK LETT (2026-09-08): a TÜKÖR-ESET és az ÉRTÉK JAVASLATOK.** A szimmetria bezárult: **elfogadott** javaslatnál az **ellenzők** viszik a **régi** változatot, **elvetettnél** a **támogatók** a **módosítottat** — és ⛔ az elvetett eset **nem ír át semmit**: a főág marad, ami volt, csak azok lépnek ki, akik a módosítást akarták. ⚠️ **Ez MÁSIK belépési pont**, nem elágazás a meglévőben: az elvetett javaslatnak **nincs egyezménye**, tehát a végrehajtás sora mostantól **az elvetett szerkesztési javaslatokat is** tartalmazza — közös sorrenddel, a **lezárás ideje** szerint. *Ami korábban dőlt el, előbb hat.* ⭐⭐ **És az érték javaslatok is átvándorolnak**: az új ág küszöbei a **különválók** érték javaslatainak mediánja, a főágé **újraszámolódik nélkülük** — *ezért térhetnek el a két ág küszöbei, és ez a lényeg, nem mellékhatás.* ⚠️ Ha a különválóknak nincs saját érték javaslata, az új ág a **forrás küszöbeit örökli** (jobb, mint az alapértelmezésre esni).
⭐⭐⭐ **ÉS AZ EGYESÍTÉS-VÁLTOZAT IS KÉSZ (2026-09-08) — A KÜLÖNVÁLÁS EZZEL TELJES.** ⭐ **A győztes: a FEJSZÁM dönt** — az az entitás viszi tovább az azonosítót, amelyiknek **több tudatpont-tulajdonosa van**; ez **felváltotta** a korábbi „az első érintett nyeli be a többit" szabályt, holtversenynél viszont az **első érintett** nyer (a javaslattevő kimondott elsődlegese, minden gépen ugyanaz). ⭐⭐ **Vesztesenként két út:** ha **nincs radikális ellenző**, a vesztes azonosítója már nem kell — minden pont átvándorol, az entitás eltűnik; ha **van**, a vesztes **megmarad EREDETIBEN**, de csak a **radikálisok** pontjával, míg a támogatók, tartózkodók és **minden passzív** pontja a győztesre kerül. ⭐⭐ **És a leszármazottak ugyanezzel a szabállyal, egyenként** — ehhez a `leszarmazottakSzetosztasa` **változtatás nélkül újrahasznosult**: *ugyanaz a gépezet, két bemenettel*. A két ág itt is össze van kötve, tehát a kártya „Másik ág" füle az egyesítésnél is működik, külön munka nélkül.
⭐⭐⭐ **ÉS A JOBB JEL MEGÉPÜLT — A LÁNCOK VÉGE (2026-09-08, Csaba jóváhagyásával):** a felszabadítás fő jele mostantól **nem a buli-szám, hanem bizonyíték**. A törlés feljegyzi, **kik voltak az entitás gazdái** a törlés pillanatában (`torlesek[].gazdak`) — ők azok, akik a döntést még megfordíthatnák —, az állapot pedig **szerzőnként az utolsó lánc-pontot** (`allapot.lancVegek`). ⭐ Ha **mindegyik gazda láncát ismerem a lezárás UTÁNI pontig**, akkor egyikük sem tud már visszamenőleg beszavazni: egy határidőn belüli időbélyeg a saját láncában **visszafelé lépő idő** lenne, amit a koino felsorol (`idoEllentmondasok`). *Nem valószínűség, hanem bizonyíték* — és pont abból áll, amit a csere úgyis megmond (`ALLAS`), illetve amit a `Lattam` (D61) aláír. ⚠️ Akitől a lezárás óta semmi nem érkezett, arról nem állíthatunk semmit — ezért a **buli-szám megmarad másodlagos, olcsó heurisztikának**: a kettő közül **elég az egyik**, és a terv megmondja, **melyik alapján** szabadított fel (`indok: 'lancok' | 'bulik'`). ⭐ A várakozó tételnél a `nemaGazdak` **megnevezi, kire várunk** (D19: bejelent, nem hallgat).
⭐⭐⭐ **ÉS EGY KÉPES DOKUMENTÁCIÓ A GÉPEZETRŐL (2026-09-07, Csaba kérésére):** [`docs/gepezet.md`](docs/gepezet.md) — hat mermaid-ábra: a **három fázis**, a **töredék-modell**, az **entitás életútja** (háromféle eltűnés, három következmény), a **tudatpont útja** (kiosztás → elakadás → megülepedés bulikban → felszabadítás), és ⏸️ **kettő TERVKÉNT**: Csaba **egyesítés/különválás** modellje, valamint az **általános javaslat→egyezmény** terve. ⚠️ A doksi élesen elválasztja, mi van megépítve és mi terv — *a tervet a képet javítva vitatjuk, nem a szöveget*. ⭐ Az ábrák **lerenderelve ellenőrizve** (8/8 SVG, nulla szintaktikai hiba), nem csak leírva.
⭐⭐ **HÁROM DÖNTÉS AZ EGYESÍTÉS/KÜLÖNVÁLÁS MODELLHEZ (Csaba, 2026-09-07)** — még nincs kód, a terv a `gepezet.md` 5. ábráján: **(1)** a **győztes** az **ágazati (hierarchikus) tudatpont** szerint dől el, az **egyezmény születésének pillanatában** érvényes értékkel; **(2)** a **„radikális ellenző"** = aki **ellenzett ÉS külön ágat kért** — ez a prototípus `kulonvalasIgeny`-e, amit a módosítás ellenzőitől is megkérdeznek, tehát a `Szavazat` eseménynek **új mezőt kell kapnia**; **(3)** a duplázódó leszármazottnál **az eredeti tartja az azonosítót, a másolat kap újat** — és a **szerző másolódik**, függetlenül attól, tulajdonos-e még.
⭐ **ÉS AMIVEL EZ NEM MEGY SZEMBE** (Csaba kérdezte: *„milyen szabállyal megy szembe?"*): **semmilyennel.** A leírt szabály az **eseményről** szól (`js/esemeny/esemeny.js`: *„az azonosító a gondolat lenyomata, tehát nem külön adat, hanem a gondolat neve"*), és ez **érintetlen marad**. Ami változik, az egy **kimondatlan feltevés**: ma minden *entitás*-azonosító egyben egy *esemény*-azonosító is. A kimondás: ⭐ **minden azonosító aláírt eseményekből SZÁMÍTHATÓ; a lenyomat ennek a különleges esete.** ⚠️ Két helyen van következménye: az `allapotSzamitas.js` az azonosítóval keresi a **létrehozó eseményt** (a másolatot ezért a végrehajtás állítja elő, ahogy az egyezményt is), és a `hozd` a **társaktól kéri el** az eseményt (számított azonosítóra nem működik — de nem is kell: aki a forrásokat ismeri, kiszámolja). *Ez az első olyan név a koinóban, ami mögött nincs egyetlen aláírás, csak egy levezetés — ezért írjuk le, ne csússzon be észrevétlenül.*
⭐⭐ **ÉS KÉT PONTOSÍTÁS A TERVEKHEZ (Csaba, 2026-09-07)** — a [`docs/gepezet.md`](docs/gepezet.md) 5. és 6. ábráján: **(a)** a duplázódó leszármazottnál **nem feltétlenül a győztes ág tartja az azonosítót** — leszármazottanként külön nézzük, és **az erősebb oldal ott** kapja az eredetit. ⭐ *Technikailag semmi nem áll az útjában*, mert a láncokat soha nem írjuk át: nem a hivatkozásokat mozgatjuk, hanem azt **számítjuk ki**, melyik ág viseli melyik nevet — ugyanaz a gépezet, ami az egyesítésnél a pontokat is átviszi. ⚠️ Két következménye van: az azonosító **a történetet is hozza** (a másolat üresen indul), és az eredeti azonosító **elhozható** (`hozd`), a számított viszont csak **kiszámolható** — a `hozd`-nak ezt meg kell tanulnia. ⛔ **A valódi kérdés nem technikai, hanem jelentésbeli:** egy éves hivatkozás némán az egyik ágba visz. ⭐ A javaslatom: ne azon múljon a folytonosság, ki „érdemli" az azonosítót, hanem azon, hogy **a szétválás LÁTSZIK** — mindkét ág jegyezze, melyik egyezményből vált szét és hol a testvére (D19-minta). ⏸️ **Eldöntendő:** mivel mérjük, hogy „többen vannak" — a győztes **ágazati tudatpont** szerint dől el, de a leszármazottaknál a *„többen"* **fejszámot** sugall; **két mérce egy gépezetben csapda**.
⭐⭐ **(b) AZ ÁLTALÁNOS EGYEZMÉNY FELFELÉ VIHETŐ** — áthelyezési javaslattal egy felmenője alá, és ott **ismét javaslat lesz belőle**: a felmenő tudatpont-tulajdonosai **újra szavaznak** róla, **a felmenő küszöbeivel**. Ha elvetik, **visszakerül** az eredeti szülője alá; ha támogatják, ott marad. ⭐ Ez teszi a D27/4-et gyakorlattá: **a hatókört nem lehet egyoldalúan tágítani** — hiába viszi valaki feljebb az álláspontját, a tágabb kör **maga dönt** arról, hogy magára veszi-e. *Nem lehet egy nagy közösség nyakába varrni egy kis ág döntését.* ⏸️ Eldöntendő: a csatlakozók a költözéssel maradnak-e (javaslat: igen — a tény örök), fent van-e már az egyezmény a szavazás alatt (javaslat: igen, hogy a kör lássa, amiről szavaz), és lehet-e egy lépésben több szintet ugrani.
⭐⭐ **ÉS HÁROM LEZÁRÓ DÖNTÉS (Csaba, 2026-09-08)** — a [`docs/gepezet.md`](docs/gepezet.md) 5–6. ábráján átvezetve: **(1)** ⛔⛔ **A MÉRCE MINDENHOL A FEJSZÁM** — *„legyen csak fej szám"* —, ez **felülírja** a korábbi „ágazati tudatpont" választást: a győztes az, akinek **több tudatpont-tulajdonosa van**, és a leszármazottaknál is a **több ember** oldala tartja az eredeti azonosítót. *Egy gépezetben egy mérce; két mérce esetén ugyanaz a szétválás máshogy dőlne el a tetején és a levelein.* ⏸️ Nyitva: a holtverseny döntője (javaslat: az azonosító szerint kisebb, mint az elágazás-feloldásnál). **(2)** ✅ **A szétválás MEGJELENÍTÉSE ÖRÖKSÉG, nem tervezendő**: a `GondolatKartya.js` **„Másik ág" füle** már pontosan ezt tudja — `kulonvalasok: [{ testverId, testverTipus, testverCim, agSzerep, kulonvalasIdeje }]`, hivatkozás a testvér-ágra, és külön mondat arra, ha *„a másik ág időközben megszűnt"*. ⭐ Az `agSzerep: 'foag'` jelentése a koinóban: **ez az ág viseli az eredeti azonosítót** — így a leszármazottankénti szabállyal is helyes marad. *Megint a prototípus kártyája mondta meg, mit kell a számításnak kiszámolnia.* **(3)** ✅ **A felfelé vitel három nyitott pontja: mindegyikre IGEN** — a csatlakozók a költözéssel **maradnak** (a tény örök; és a tágabb körben már meglévő támogatók), az egyezmény **már fent van, amíg az új szavazás fut** (hogy a kör lássa, amiről szavaz), és **több szintet is lehet ugrani** egy lépésben.
⭐⭐⭐ **ÉS AZ ÁLTALÁNOS EGYEZMÉNY ÉLŐ HATÁLYA MEGÉPÜLT (2026-09-08)** — a D27 óta nyitott tétel, és ⚠️ **az egyetlen, amihez a prototípusban SEM volt kód**: tervezés, nem átültetés. ⭐ **Egy esemény-alak, három jelentés**: `Allasfoglalas { egyezmeny, allas: csatlakozik|tiltakozik|utkozik, masik, indoklas }` — ugyanaz az érv, mint a `meghivas`/`felhatalmazas`/`tanusitas` hármasnál. ⭐⭐ **„Az utolsó nyer", e-emberenként**: aki csatlakozott, majd tiltakozik, annál a tiltakozás számít — *ettől lesz a hatály élő, külön visszavonás-mechanizmus nélkül*. **A tényt a `pillanatkep` őrzi, a hatályt ez.** ⛔⛔ **A HATÓKÖR A HELYBŐL (D27/4):** állást az foglalhat, akinek tudatpontja van azon az entitáson, ami alatt az egyezmény áll — **vagy annak bármely leszármazottján**; a gyökérben **bárki**. ⭐⭐ **És itt a hierarchikus tudatpont JOGOSULTSÁGGÁ válik**: eddig a *fontosság* mutatója volt, most azt mondja meg, **ki szólhat hozzá** — *nincs új mechanizmus, csak egy meglévő egy szinttel feljebb*. ⛔ **Semmi nem következik belőle automatikusan** (D27/6). ⚠️ A **szerkesztési** egyezménynek **nincs** hatálya: az egyszeri. Kézi út: `allast <egyezmény> csatlakozik|tiltakozik|utkozik [másik] [indoklás]`.
⛔⛔⛔ **ÉS EGY 4. SZABÁLY-HIÁNY, AMIT EGY MÁSIK SESSION KÓD-ÁTNÉZÉSE TALÁLT (2026-09-10): AZ ÁLTALÁNOS JAVASLATNAK NEM VOLT KÉZI ÚTJA.** Megépült az élő hatály és az `allast` parancs — de **nem volt mivel létrehozni azt az egyezményt, amiről állást lehetett volna foglalni**: a `koino.js` mindkét javaslat-útja beégetve `fajta: 'szerkesztesi'`-t küldött, és az `altalanos` szó nem szerepelt benne egyszer sem. ⭐ *A könyvtár-réteg tudta; a kéz nem érte el* — pontosan az, amit a 4. szabály tilt. ✅ Pótolva: `altalanos <álláspont> <hely> [indoklás]`. ⛔ **A hely KÖTELEZŐ**, és ez nem szigor, hanem a D27/4: a hely határozza meg, kik dönthetnek róla és kik foglalhatnak állást — hely nélkül nem lenne kör, aki dönt.
⭐⭐ **ÉS EGY ÖTÖDIK MŰVELET SZÜLETETT HOZZÁ: az `Allaspont`** (`szabalyok.js`: `ALLASPONT_MUVELET`). Először `Modositas`-ként akartam beadni az általános javaslatot, és csak a `fajta` mező akadályozta volna meg a végrehajtását — ⛔ **de ez nem csak csúnya lett volna, hanem HIBÁS**: a `TILTOTT_MUVELETEK` szerint *egyezményre nem indítható módosítás*, tehát a koino **nem engedte volna, hogy a közösség állást foglaljon egy már megszületett egyezményről**. Az `Allaspont` névvel a tiltás külön kivétel nélkül nem fogja meg (mérve, rontás-próbával). ⭐ *Ahol egy mező mást mond, mint amit teszünk, ott előbb-utóbb valaki a mezőt hiszi el.* ⚠️ A `JAVASLAT_MUVELETEK`-be szándékosan NEM került bele: az a lista azt mondja meg, mi hajtódik VÉGRE.
⭐⭐⭐ **ÉS EGY ÚJ PRÓBA-FAJTA, AMI NÉLKÜL EZ A HIÁNY MEGINT ELBÚJNA: a `meres/parancssorProba.js`.** ⚠️ **Egyetlen meglévő próba sem vette észre**, mert mind a **modulokat** hívja közvetlenül — *amit csak modul-próba mér, arról nem tudjuk, hogy elérhető-e kézzel*. Ez a lap **külön folyamatban indítja a `koino.js`-t** (eldobható `KOINO_ADAT` mappával), és a **kimenetét** olvassa: végigviszi az `altalanos → szavaz → allast` kört és a szerkesztésit is. Lassabb (folyamat-indítás), ezért kevés van belőle — csak a teljes körök. ⭐ Három rontás-próba igazolja, hogy nem vak: a parancs kivétele, a `fajta` átírása és a fejléc-szétválasztás kikapcsolása **mind buktatja**.
⚠️ **És a parancssor fejlécei is szétváltak**: `SZERKESZTÉSI` és `ÁLTALÁNOS JAVASLATOK`/`EGYEZMÉNYEK` — eddig minden a „szerkesztési" fejléc alá került volna (a CLAUDE.md névszabálya). Az általános egyezmény alatt most a **hatály is látszik** (🤝 csatlakozók · ✋ tiltakozók · ⚡ ütközések), különben az `allast` eredménye sehol nem jelent volna meg.
⚠️ **Két kisebb tétel ugyanebből az átnézésből:** az `ALLASOK` **két helyen** volt definiálva (`szabalyok.js` + `muveletek.js`), mindkettőnél az én kommentemmel, ami azt állította, hogy a másik innen veszi — *két lista, két komment, egyik sem igaz*; mostantól a forrás a **szabály-réteg** (a szabályt a számítás őrzi), a `muveletek.js` importálja és továbbadja. És **három elavult szám** a CLAUDE.md-ben (a próbaszám, a `felulet/` mérete, a program mérete) átvezetve mérésből.

⛔⛔⛔ **ÉS CSABA ÚJRAGONDOLTA AZ EGÉSZET (2026-09-10) — AZ ÁLTALÁNOS JAVASLAT HELYÉRE AZ ALKOTMÁNY JÖN (D64).** *„Az általános javaslat teljesen más, mint a szerkesztési javaslat, ezért legyen külön entitás típus. Legyen inkább alkotmány a neve."* ⭐⭐ **Két gépezet, kétféle igazság:** a szerkesztési javaslat **esemény**-állítás (megtörtént, egy pillanatban, véglegesen), az alkotmány **állapot**-állítás (igaz MOST, ameddig igaz) — ezért **nincs döntési ideje**. ⭐ *És ettől nem lesz idegen test: van már pontosan ilyen gépezet a koinóban — a **tudatpont**. Az alkotmány ugyanaz, egy 2/3-os próbával a tetején.* ⭐ A típus olcsó: `Alkotmany` = `GondolatLetrehozas` + `adat.tipus`, mint a `Kategoria`/`GondolatTipus` — **nem új esemény-fajta**, meglévő tár nem évül el.
⛔ **A STÁTUSZ: egy mérce, két küszöb** — ≥**2/3** támogatottság → alkotmány lesz; <**1/3** → visszaesik javaslatba; közte **helyben marad, ami volt**. ⭐ Az **ellenzők száma nem szerepel** a számításban (Csaba javította a saját első megfogalmazását: *„az 1/3 alatti támogatási küszöb átfogóbban kezeli az eseteket"*). ⚠️ **A hiszterézis ára: az állapot ÚT-FÜGGŐ** — nem összeadás, hanem **újrajátszás**; cserébe nem **billeg** a küszöb körül.
⛔⛔ **A KÖR: a MOSTANI szülő SAJÁT tudatpont-tulajdonosai — a PASSZÍVAKKAL.** *„Egy alkotmánynak akkor lesz súlya, ha a passzívak is beleszámolódnak."* ⭐ Ugyanaz a halmaz adja a számlálót és a nevezőt — **nem lehet két kör egy gépezetben**; ez felváltja a **D27/4** lefelé terjedő hatókörét. ⛔ **A hallgatás NEM-et jelent**, és **tartózkodás nincs**. ⚠️ A nevező **mozog**: aki egy tudatpontot tesz a szülőre, hígítja a támogatottságot — *így oldódik meg magától a bootstrap-probléma*, és ezért kell a sáv.
⭐⭐⭐ **ÉS AZ ÁTHELYEZÉS: NINCS KÜLÖN ÚJRASZAVAZÁS.** *„A szavazatok átjönnek, de csak azok számítanak bele, akik az új szülőn is tudatpont-tulajdonosok."* A szavazat akkor számít, ha a szavazó a **mostani** szülő tulajdonosa; az áthelyezés csak **kicseréli a nevezőt**, és a státusz ennek a **következménye**. ⛔ Az áthelyezés viszont **ÚJ KÉRDÉS**: a hiszterézis nem jön vele, ott a **szigorú 2/3** fut újra. ⭐ *A hatókört így sem lehet egyoldalúan tágítani — de nem egy őrszabály miatt, hanem mert a tágabb körben nincs meg a 2/3.*
⭐ **A gyökérben szándékosan majdnem elérhetetlen** (*„ez fogja adni a súlyát"*) — ⛔⛔ **és ebből MEGJELENÍTÉSI követelmény lesz:** a kártyán **három szám külön látszik** — támogat · ellenez · **néma** —, mert *„egy magasan támogatott alkotmányi javaslatnak is lehet súlya, ha … csak a passzivitás miatt nem lett alkotmány belőle"*. *A puszta státusz elhallgatná a különbséget aközött, amit elutasítottak, és amiről nem szóltak (D19).*
⭐ **És a súly a STÁTUSSZAL érkezik:** szerkesztési javaslat egy alkotmányi javaslatra **51%, passzívak nélkül**; egy alkotmányra **2/3, a teljes körrel**.
⭐⭐ **AMIT EZ MEGSZÜNTET** — és ez a legfőbb érv mellette: **több gépezetet vesz el, mint amennyit hoz.** A `fajta: altalanos` második jelentése és a tegnapi **`Allaspont` művelet** · az `Allasfoglalas` **csatlakozik/tiltakozik** ága (határidő nélkül ezek egyszerűen **szavazatok** — ⭐ az **`utkozik`** megmarad, mert az **két alkotmány viszonya**) · a felfelé vitel újraszavazása és visszahelyezése · a D27/4 hatóköre · a tartózkodás · az ellenzők száma · és az alkotmányon **tárgytalan** a döntési idő, a bizonyossági mutató, a **medián-küszöb (D4)** és az **érték javaslat**. ⛔ *A rögzített 2/3 szándékos szakítás a D4-gyel, és helyes: ha medián lenne, a közösség **leszállíthatná a saját alkotmány-küszöbét**, és utána bármit átvihetne.*
⏸️ **A LEGNEHEZEBB NYITOTT PONT: a módosítás ÉLŐ vagy EGYSZERI?** Ha az alkotmány élő, a szövege logikusan az lenne, amelyik módosítás **most** tartja a 2/3-ot — de ez ütközik a **harmadik fázissal** (egyszeri átírás, a lezárás ideje szerint sorba rakva). Ha határidős marad, **egy gépezetben két mérce** lesz. ⏸️ További nyitott: mi vet véget egy nem kívánt alkotmányi javaslatnak (*javaslat: a **D14**, mert nem termel elakadt pontot*) · visszaeséskor a **hely** is visszaugrik-e (*javaslat: nem*) · mire vonatkozik az alkotmány a döntő körön túl · a `Tartozkodik` sorsa · az ütközés iránya · **értesítés** (*„majd módosítja a támogatását" csak akkor igaz, ha értesül róla*).
⚠️ **A tegnapi kód NEM romlott el és nem is töröltük** (451 próba zöld) — de az `altalanos` parancs, az `Allaspont` művelet és az `Allasfoglalas` csatlakozás/tiltakozás ága a D64 megépítésekor **lecserélődik**. A kép ábrákkal: [`docs/gepezet.md`](docs/gepezet.md) 6. szakasz (**11/11 ábra lerenderelve ellenőrizve**).
⏸️ **(2026-09-11-i állapot; a D66 óta VÉGLEG ELVETVE — lásd lentebb)** **A D64 ELHALASZTVA:** *„Mivel ez még nem építőköve semminek, ezért bele lehet rakni később is."* ⭐ **Az indok mérhető, nem vélemény:** az `Alkotmany` **tisztán additív** lenne — `GondolatLetrehozas` + `adat.tipus` (mint a `Kategoria`), a szavazás a meglévő `Szavazat`, a státusz **számítás** —, tehát **nincs új esemény-fajta, egyetlen meglévő tár sem évül el, egyetlen régi esemény sem lesz érvénytelen**, és később ugyanannyiba kerül. A **9. szabály** próbája (*„a szerkezetet nem lehet utólag beletenni"*) **nem fogja meg**: ez funkció, nem szerkezet. ⭐ A legdrágább darabjának — a hiszterézis miatti **újrajátszásnak** — ma nincs használója. ⚠️ A tegnapi `altalanos` parancs, az `Allaspont` művelet és az `Allasfoglalas` **marad, ahogy van** (működik, próba őrzi, a D27 eredeti célját szolgálja); a D64 „lecserélődik" mondata addig áll, amíg az alkotmány meg nem épül.
⚠️ **Egy mérés ebből a szálból, ami tény és marad** (14., `meres/kuszobMeres.js`): a küszöb-medián a **beadott** érték javaslatokon számolódik, nem a tulajdonosokon — aki nem adott be sajátot, az nem szerepel benne, tehát az `ALAP_KUSZOBOK` **tartalék, nem súly**. *(A belőle vont következtetéseimet Csaba nem osztotta; a szál a D66-tal lezárult.)*
⚠️ **És a pénzhez az alkotmány NEM is lett volna jó eszköz:** a **D27/6** szerint az alkotmány szövegéből **semmi nem következik automatikusan** — nem korlátozta volna a pénz-kiállítást, csak látszott volna mellette. ⭐ A helyes eszköz ott Csaba újabb ötlete: **kötött mezőkészletű javaslat**, amit a **számítás** tud ellenőrizni (*„nem olyan szabad formában, hanem megírt forma szerint, amiben az értékeket kell meghatároznia"*) — és erre a **`KATEGORIA_KORLAT`** a precedens: a korlát a **számításban** van, nem a mediánban.
⭐⭐⭐ **ÉS EBBŐL SZÜLETETT A D65: A PROGRAM SZINTŰ SZABÁLY IS A KÖZÖSSÉGÉ.** Csaba: *„szükség lesz program szintű szabályozásra, de a koino **teljes közössége** által hozott döntést kell majd program szintjére beépíteni."* ⚠️ Ennek ára van: a döntés és a hatálya közé **bekerül egy ember** (a beépítő) — ez a 2. szabály alakja, csak nem szolgáltatás, hanem ember. ⭐ A koino válasza ugyanaz, mint mindenhol: **nem a kapu véd, hanem hogy a rossz beépítő elveszíti a szerepét** — és ezt a **6. szabály** teszi lehetővé (*„ekkora program elfér egy üzenetben, és bárki újraírhatja"*). ⭐⭐ Ellenőrizhető alak a **D42 mintájára**: minden kemény állandó **mondja be, melyik koino-döntésből származik** — akkor a *„nem azt építette be"* állítás helyett **mérés** lesz.
⛔⛔ **ÉS AMIT EDDIG NEM MONDTUNK KI: A PROGRAM VERZIÓJA MÁR MA IS BEMENETE AZ ÁLLAPOTNAK.** A koino alapmondata (*ugyanazokból az eseményekből ugyanaz jön ki*) **csak azonos verzió mellett igaz**: a `TUDATPONT_KERET`, a `KATEGORIA_KORLAT`, a `TILTOTT_MUVELETEK` és az `ALAP_KUSZOBOK` mind a **programban** van. ⛔ A legélesebb a `TUDATPONT_KERET`: eltérésnél az egyik gép a másik tudatpont-eseményeit **szabálysértőnek** látja — vagyis nem „kicsit mást mutat", hanem **kettéhasad a koino**. ⭐ **A 9. szabály itt élesen szól:** egymilliárdnál **soha nem lesz mindenki ugyanazon a verzión**, tehát a verzió-eltérés nem kivétel, hanem az **alapállapot** — a **láthatóvá tétele szerkezeti kérdés**, nem funkció. ⭐ Javaslat, kész hellyel: a csere `LENYOMAT`-ja mellé egy **szabály-lenyomat** (*ugyanazokkal az állandókkal számolunk-e?*), eltérésnél **jelzés, nem vád** (D19). ⏸️ Megépítés előtt **mérjük meg**, mi történik ma egy eltérő `TUDATPONT_KERET` mellett.
⏸️ **És egy mellékes ötlet ugyanebből a mondatból** (szó szerint: [`docs/jegyzetek.md`](docs/jegyzetek.md), 2026-09-11): **a globális döntéseknél is legyen passzív/aktív e-ember, de fordított alapértelmezéssel** — alapból **aktív**, és a passzivitás **kimondás**, akár **témánként** (pénzügy, program frissítés). ⭐ Azért fordul meg, mert entitás szinten a körbe lépés maga egy tett (odateszem a tudatpontom), globálisan viszont **nincs ilyen tett**: mindenki tag. ⚠️ Feszültség, amit el kell dönteni: a D64-ben a hallgatás **NEM**-et jelent, itt viszont **kilépés a nevezőből** — ki kell mondani, melyik hol érvényes. ⭐ És a néma készülék problémáját **már megoldottuk egyszer** (`allapot.lancVegek`): a globális nevező lehetne *tag ÉS nem passzív ebben a témában ÉS a lánca él*.
⛔⛔⛔ **ÉS 2026-09-12-ÉN CSABA LEZÁRTA AZ EGÉSZ SZÁLAT — D66: A MEGÚJULÁS = KÖLTÖZÉS, NEM FRISSÍTÉS.** *„Nem kell alkotmány, nem kell 2/3-adot előidéző rendszer, és nem kell program frissítés sem. Ezek mind sok új élt hoznak létre. **Maradunk a prototípus szerinti funkcióknál.** A program megújulása viszont továbbra is fontos, csak nem úgy kell rá gondolni, hogy felülírjuk azt, ahol a közösség van, hanem a közösséget és entitásaikat, meg mindent, ami fontos, **átmásolunk az új koino verzióba** — és ezt nem automatikusan, hanem **az e-ember utasítására**."* ⛔ Ezzel **elvetve**: a D64 (alkotmány), a 67/67-es alapérték-ötlet és a D65 program-frissítési mechanizmusa. *Az indok nem az, hogy rosszak voltak, hanem hogy mindegyik ÚJ ÉLT hozott a gépezetbe.*
⭐⭐⭐ **ÉS EZ NEM ÚJ IRÁNY — Csaba 2026-08-31-én már kimondta.** A **D25** a koinók szaporodásának 2. módjaként sorolja fel: *„Új szabályrendszer — módosított program, saját szabályokkal"* (a D13 alá kötve: *a fork normál üzemmód*), a tanúsítás-öröklés kivételét pedig szó szerint így: *„ez alól az az eset lehet kivétel, ha egy koino szétválik, mert mondjuk nem mindenki fogadott el egy **verziófrissítést**."* ⭐ *Ami kétszer, függetlenül ugyanoda vezet, az valószínűleg a szerkezetből következik, nem az ízlésből.*
⭐⭐ **ÉS A KÓD ALÁTÁMASZTJA: az aláírás KÖTI a koino nevét.** Az `esemeny.js` aláírt mezői: **`'koino'`**, `'tipus'`, `'szerzo'`, `'elozo'`, `'sorszam'`, `'ido'` — a koino azonosítója az **első** aláírt mező. ⭐ Ezért **régi esemény nem tud beszivárogni az új koinóba** (nem kell őrszabály, a kriptográfia zárja), és ⭐⭐ **az „átmásolás" valójában ÚJRA ALÁÍRÁS, emberenként** — a D15 miatt nem is lehet másképp. *A modell nem enged más megoldást; ez jó jel.*
⭐ **ÉS A 15. MÉRÉS SZEREPE MEGFORDULT:** a néma kettéhasadás (ugyanaz a 8 esemény, eltérő kerettel 4 vs 2 entitás, és a csere nem veszi észre) mostantól **nem javítandó hiba, hanem az INDOK**. Ebben a modellben elő sem állhat: két program-verzió = **két koino**, és a csere a `LENYOMAT`-nál tisztán elutasítja az idegent (mérve: 1 kör, 334 bájt).
⛔⛔ **DE EGY FELTÉTELLEL, ami nélkül az egész nem véd: ha az állapotot befolyásoló állandó változik, az ÚJ KOINO — ÚJ AZONOSÍTÓVAL.** Ha valaki átírja a `TUDATPONT_KERET`-et és ugyanazt a koino-azonosítót hagyja, a néma kettéhasadás **változatlanul bekövetkezik**. A hat állapot-befolyásoló állandó (`TUDATPONT_KERET` · `ALAP_KUSZOBOK` · `KATEGORIA_KORLAT` · `MEGHIVO_KELL` · `TANUSITAS_KELL` · `FELHATALMAZAS_KELL`) tehát **együtt mozog a koino nevével**. ⏸️ A **szabály-lenyomat** ötlete ezért nem hal meg, csak más a szerepe: nem a frissítés kísérője, hanem **a szabály betartásának ellenőre** (*„tényleg azt a programot futtatjuk-e, amit a koino neve ígér?"*) — kisebb prioritás, de a 9. szabály szerint egymilliárdnál valaki biztosan futtat majd módosított programot változatlan névvel.
⛔ **A MÁSOLÁS HATÁRA — a kritérium:** amit **ÉN állítok** (gondolat, tudatpont, szavazat, érték javaslat) → **átvihető, újra aláírva**, és a régi esemény **mellé tehető bizonyítékként** (D42-minta) · amit **MÁSOK állítottak rólam** (meghívás, felhatalmazás, tanúsítás) → ⚠️ **nem én viszem**, mert nem az én aláírásom; a **D25 születéskori pillanatképe** menti át, vagy újra kell szerezni — ⛔ ha nem jön át, **mindenki visszaesik az 1. lépcsőre**, és a pénztárca bezárul (D11) · **a PÉNZ** → ⛔ **a másolása hamisítás**.
⛔⛔ **ÉS A PÉNZ — amit Csaba maga meglátott:** *„a termelődése, nyilvántartása nem történhet több helyen."* ⭐ **Miért más, pontosan:** a koino minden más adata attól igaz, hogy **ÉN mondtam ki**; a pénz attól, hogy **MÁS mondta ki nekem**. Aki átmásolja az egyenlegét, olyat állít magáról, amit nem ő adott magának — és ha a régi koino tovább él, ugyanaz a pénz **kétszer létezik**. ⭐ Az irány a koino saját mintájából: nem *másolás*, hanem **átvitel** — a régi koinóban aláírom, hogy *„ezt az összeget itt kivezetem"*, és az új koinóban ez a **fedezete** annak, amit kapok. ⛔ *Az őszinte korlát:* ez csak akkor ér valamit, ha a régi koino is **megszünteti** azt a pénzt — és azt a régi koino **programja** tartja be. ⚠️⚠️ **Elhalasztható, de CSAK a pénz megépítéséig:** a költözés pénz-szabályát a pénzzel **együtt** kell megtervezni (9. szabály).
⭐⭐ **ÉS EZZEL A D65 KÉRDÉSE IS MEGVÁLASZOLÓDOTT, új mechanizmus nélkül:** *ki állítja a koino kemény állandóit, ha nem a programozó?* → **a költözés.** Aki nem ért egyet az új állandókkal, **nem költözik át**. *A program szintű szabály attól a közösségé, hogy a közösség dönti el, melyik programban él.* ⛔ És ehhez a **6. szabály** kell — enélkül a „nem költözöm" üres mondat lenne, mert nem lenne hova.
⛔⛔⛔ **ÉS A LEGNAGYOBB 4. SZABÁLY-HIÁNY, AMIT EDDIG TALÁLTUNK (2026-09-12, egy másik session kód-átnézése): A SZAKASZ 4 SENKIHEZ NEM VOLT BEKÖTVE.** A két lépcsős beléptető, a kontraszt-jelzés és a visszavonás (D54–D63) **megépült, zöld volt, 52 önpróbával bizonyítva — és senki nem érte el.** Mérve: a `muveletek.js` **tizenhat** műveletet exportál, a `koino.js` **kilencet** importált; a hiányzó hét pontosan az identitásé (`belepes` · `meghivas` · `felhatalmazas` · `tanusitas` · `bemutatkozas` · `lattam` · `felhatalmazasVisszavonasa`), és mindegyikre **0 parancs**. ⛔⛔ Az `identitas.js` és a `jelzesek.js` **egyetlen importálója a saját próbája** volt. ⚠️ *Ugyanaz a hiba, mint az `altalanos`-nál (2026-09-10), csak sokkal nagyobb léptékben — és a legélesebb következménye: **a visszavonás elérhetetlen volt.** A CLAUDE.md szerint „nem a kapu véd, hanem hogy a rossz tanúsító elveszíti a szerepét" — épp ezt nem tudta kimondani senki.*
✅ **PÓTOLVA — a hét parancs és az AZONOSSÁG szakasz.** `belep [alapítás]` · `meghiv|felhatalmaz|tanusit|bemutatkoz|visszavon <horgony>` · `lattam`. ⭐⭐ **És a parancsoknak nem kell beírni a horgonyodat**: a saját láncodból olvassuk ki (`sajatHorgonyom`), a másik ember **nyilvános kulcsát pedig a horgonyából számítjuk** — *amit le lehet vezetni, azt ne kelljen bemondani*, mert egy idegen szeletébe tett állítás nem számít. ⭐ Az állapot új **AZONOSSÁG** szakasza a három kérdést mutatja (TAG · TANÚSÍTHAT · 2. LÉPCSŐS), ⚠️ **három jellel, nem kettővel**: ✔ igen · ✘ nem · **? nem ellenőrizhető** (a lánc egy része hiányzik — *hiány, nem vád*, D19). Mellette a **megbízás** (*„N-en bízták rád a tanúsítást"* — ⛔ soha nem „becsületesség: N", D60) és a **kontraszt-jelzés** számai.
⭐⭐⭐ **ÉS A TELJES KÖR PRÓBÁVAL BIZONYÍTVA, KÉT KÉSZÜLÉKEN** (`meres/parancssorProba.js`, most **8 próba**): `belep` → csere → `meghiv` → csere → **a másik készülék állapota ✘ tag-ról ✔ tag-ra vált** („1 tag hívta be"). *Ugyanaz a gép, ugyanaz a parancs, más válasz — ez a bizonyíték.* ⭐ Három rontás-próba igazolja, hogy nem vak: a `meghiv` kivétele, az AZONOSSÁG fejléc kikapcsolása és a D60-as szóhasználat megsértése (**„becsületesség"**) **mind buktat**.
⚠️ **Két fejléc HAZUDOTT, javítva:** az `identitas.js` azt írta, *„Használják: az állapot-számítás és a felület"*, a `jelzesek.js` azt, hogy *„a felület"* — **egyik sem volt igaz**. *Ugyanaz a csapda, amit az `Allaspont`-nál kimondtunk: ahol egy mező mást mond, mint amit teszünk, ott előbb-utóbb valaki a mezőt hiszi el.*
⏸️ **NYITVA HAGYVA (Csaba döntése, 2026-09-12): kérdezzen-e a SZABÁLY-RÉTEG tagságot?** ⛔ Ha egyszer igen, a válasz **nem lehet „kidobom"**: P2P-n a *„nem tag"* és a *„még nem láttam a bizonyítékát"* **ugyanaz** — egy lemaradt készüléken a friss belépő eseményei szabálysértőnek látszanának, és megint két gép számolna mást. ⭐ A koinónak van erre szava: `nemEllenorizhetok` (D19).
⚠️ **És két apróság, amit ez a munka hozott felszínre:** (1) a `koino/README.md` számai elavultak voltak (446 önpróba / 126 fájl), pedig a fájl maga írja elő az átvezetést — javítva; (2) **nincs fájlba mentés / fájlból olvasás az eseményekre** (a 4. szabály *„minden automatikus cseréhez tartozzon"* mondata) — ma a kézi út az adat-fájl másolása (`koino-adat/<koino>/esemenyek.jsonl`, hozzáfűzhető). ⏸️ Külön parancs lehetne belőle.

✅ **ÉS EZ MEGÉPÜLT (2026-09-12): `kivisz` + `behoz`** — [`js/csere/fajlCsere.js`](koino/js/csere/fajlCsere.js), **13 önpróbával** (11 modul + 2 parancssor). A koinónak öt hálózati útja volt (TCP · UDP · lyukfúrás · postaláda · helyi felfedezés) és **egy sem kézi**; mostantól két külön adat-mappa között **egy fájl is elég**, hálózat nélkül — mérve, két folyamattal. ⭐⭐ **A legfontosabb, hogy A FÁJL SEM KAP ENGEDÉKENYEBB KAPUT (3. szabály):** a behozatal **nem ír új beolvasztó logikát**, hanem a `csere.js` **`beolvasztas()`**-át hívja — ugyanazt, amit a TCP- és az UDP-csere —, tehát az `esemenyMentese` kapu, a duplikátum-elnyelés, az **idegen koino** kiszűrése és az **elágazás**-felsorolás mind magától adódott. *Egy pendrive-ról jött esemény pontosan annyira gyanús, mint egy hálózatról jött — sőt, a fájlt bárki átírhatja egy szövegszerkesztővel; mérve: a `sed`-del átírt cím **elbukik a lenyomatnál**, a többi sor bemegy.* ⭐ **EGY FORMÁTUM, NEM KETTŐ:** a kivitel alakja **bájtra a táré** (`esemenyek.jsonl`) — ezért a lemásolt adat-fájl **is behozható** (a régi kézi út nem veszett el, hanem **ellenőrzötté vált**), a kivitt fájl **hozzáfűzhető**, és szövegszerkesztővel megnézhető. ⚠️ **Egyirányú, és ezt kimondjuk:** nincs `parbeszed`, nincs `ALLAS`/`KEREK` kör, tehát a másik fél **nem tudja megmondani, mi hiányzik neki** — egy fájl *visz*, nem beszélget; aki oda-vissza akar cserélni, mindkét irányban visz egyet. ⚠️ **A 6. szabály miatt hatóköre van:** `mind` · **`sajat`** (a D21 ~1 KB/fő újjáépítési magja) · **egy entitás szelete** — mérve: egy szelet **417 bájt**, a teljes ötesemény**es** kivitel 2591. ⛔ Az ismeretlen azonosító **üreset** ad, nem „mindet" — külön próba őrzi, hogy a szűkítés ne kapcsolódhasson ki észrevétlenül.
⛔ **TÁRGYTALAN a D64 óta (2026-09-10), történetként marad itt:** ⏸️ **Az általánosból hátra:** a **csatlakozó mint aktív résztvevő** (D27/3 — ma a hatály kiszámolódik, de a döntés-réteg még nem veszi be), az **örökölt küszöbök** (D27/1 — ha nincs saját érték javaslat, a szülőé; ⭐ ez minden entitásra jó általánosítás), a **felfelé vitel**, és az **ütközés iránya** (ma irányított állítás).
⛔ **TÁRGYTALAN a D64 óta (2026-09-10), történetként marad itt:** ⏸️ **AZ ÁLTALÁNOS JAVASLAT ÉS EGYEZMÉNY** — a feljegyzések a **D27**-ben állnak (`fejlesztesi_terv_fazis2.md`), az összefoglaló és a hiánylista a [`szakasz5_terv.md`](docs/szakasz5_terv.md) 16. szakaszában. ⭐ *A szavazás gépezete UGYANAZ; csak a következménye más: az általánosnál semmi nem hajtódik végre, az egyezmény MAGA az álláspont — és ÉLŐ (csatlakozás, tiltakozás, ütközés-jelölés).* ⛔ Hiányzik: a három élő művelet · a csatlakozó mint aktív résztvevő · a hatókör a helyből (D27/4 — a hierarchikus tudatpont jogosultsággá válik) · és ⚠️ **egy valódi feszültség**: a D17 szerint az egyezmény **számítás, nem esemény**, de entitásként azonosító kellene neki — *javaslat: származtatott azonosító, hogy a D17 megmaradjon.*
⭐⭐⭐ **ÉS EGY ÁTÜLTETÉSI LELTÁR (2026-09-07, Csaba kérésére: *„nézd meg a koino_1.1-et… a logikai kapcsolatoknak pontosan át kell hogy legyenek ültetve"*):** [`docs/javaslat_atultetes.md`](docs/javaslat_atultetes.md) — mit tud a prototípus javaslat–egyezmény gépezete, és ebből mi van már át. ⛔⛔ **A legnagyobb hiány a KÜLÖNVÁLÁS** (`megismeres/18-kulonvalas.md`): aki ellenezte a javaslatot ÉS kérte a külön ágat, a saját álláspontja szerinti változattal él tovább — **a tudatpontjait és az érték javaslatait is magával viszi** (*„aki elmegy, viszi a súlyát"*); a leszármazottak a tudatpont-tulajdon szerint költöznek, a **főág tartja az azonosítót**. ⚠️ *Ezt 2026-09-06-án tévesen „nincs megfelelője"-ként intéztem el.* ⛔ További hiányok: az **egyezmény HELYE** (`egyezmenyTarhelyId` — törlésnél az érintett SZÜLŐJE, egyesítésnél az ÚJ entitás; az azonos-azonosítós megoldás miatt a végrehajtásnak igazítania kell) · **`erintettEntitasok` TÖMB** (egyesítéshez legalább kettő kell) · **`Csomag` javaslat + töredékek** · a `Torles`/`Egyesites` végrehajtó. ✅ **Helyesen áll:** a javaslat az érintett GYEREKE (a prototípus is ezt mondja), a javaslat entitás, a döntés-gépezet, a pillanatkép. ⚠️ **És egy tanulság a leltárból: a séma nem a viselkedés** — a `'Hiba'` státusz a prototípusban csak DEKLARÁLVA van, sehol nem állítja be semmi; elsőre tévesen hiánynak írtam. ⭐ **Az egyezmény azonosítója AZONOS a javaslatéval, csak a státusz más** (Csaba, 2026-09-07) — ez az egyetlen mód, hogy a D17 (számítás, nem esemény) és a D27/5 (teljes értékű entitás) egyszerre álljon. ⏸️ **Az általános javaslat→egyezmény a prototípusban SINCS** (Csaba: *„azt még ki kell találni"*) — a D27 leírja, mit kell tudnia, de nincs kód, amit másolni lehetne: ez tervezés, nem átültetés.
⏸️ Hátra még: a `JavaslatModal` (66 KB) — **importálja a `SzovegSzerkeszto`-t, tehát az 5.7 után jön**; a létrehozó modálok ugyanígy; az értesítés-modálok mögött ⛔ nincs réteg.
⭐⭐ **AZ 5.3 ELSŐ ÓRÁJA EGY VALÓDI RÉST TALÁLT — a kártyák ALATT** (2026-09-06, mérve): *a javaslat elfogadódott, az egyezmény megszületett, a gondolat címe mégis a régi maradt.* A `javaslatSzamitas.js` kiszámolta a `valtozas`-t, de az `allapotSzamitas.js` **soha nem olvasta** — a prototípus `javaslatVegrehajtasiService` rétege hiányzott. ✅ **Megépítve:** [`js/allapot/szerkesztesiVegrehajtas.js`](koino/js/allapot/szerkesztesiVegrehajtas.js), **16 önpróbával**. ⭐ **HÁROM FÁZIS, és a sorrend nem cserélhető fel:** `allapotSzamitasa` (ahogy létrejöttek) → `javaslatokSzamitasa` (döntés + egyezmény) → **`egyezmenyekAlkalmazasa`** (rávezetés). A `koino.js` és a `pakli.js` **ugyanazt** futtatja, ezért a parancssor és a lap egyet mond. ⚠️ *Ha ezt a felületen „javítottuk volna ki", két igazság lett volna.* Megépítve: `Modositas` + `Athelyezes` (⛔ **kör-őrrel**); ⏸️ a `Torles` és az `Egyesites` **szándékosan nem** — ma egyik eseményt sem tudja előállítani semmi, és a hiány a `kihagyottak` listában **látszik** (D19).
⛔⛔ **ÉS EGY MÓDSZERTANI SZABÁLY, ami ebben a szakaszban NÉGYSZER jött elő: egy zöld próba önmagában nem bizonyíték — kapcsold KI, amit mérni akar, és ha nem bukik, A PRÓBA a hibás.** Így derült ki, hogy (1) az útvonal-próbák vakok: a `..` alakokat az URL-elemző normalizálja, a valódi vektor a **kódolt per-jel** (`%2e%2e%2f`); (2) a horgony-próbákat a **gyorsítótár fedte el** — friss nézettel kell lapozni; (3) a `MAX_DARAB` próbája 12 entitáson kért egymilliót, pedig **a korlátnál több elem kell hozzá**; (4) az egyezmény-sorrend próbája vak volt, mert **a természetes bejárási sorrend véletlenül a helyes volt** — olyan eset kell, ahol a kettő szétválik. ⚠️ *A kód-átnézés egy valódi hibát talált a horgony-szabályban (2026-09-06): a **meggondoltam magam** eset — visszavesz, majd újra megad — becsületes tanúsítását is eldobta. Javítva; a szabály: csak az a visszavonás ellentmondás, ami a hivatkozott felhatalmazás **után** és a látott ponton **belül** van.*
