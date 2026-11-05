# A belépő megtalálása két hálózat között — átvizsgálás (2026-11-04)

*Csaba (a terep után): „elfogadom a javaslataidat, és igen szeretném hogy kidólgozd a tervet, még kódírás elött.” — Ez a terv;
kód csak a döntések után. A kiinduló lelet: [`meghivas_atvizsgalas.md`](meghivas_atvizsgalas.md) 9. szakasz, elágazás 233.*

---

## 1. Mi történt (mérve, 2026-11-04 este)

A laptop (otthon, router mögött) meghívott egy mobilneten lévő telefont. A telefon elfogadta a meghívót, 21:04-kor a DHT-n
bejelentkezett, és percenként kopogott a laptopra — a laptop viszont nem talált rá, a meghívó „aktív” maradt. Amikor a telefon
DHT-n bejelentett címét kézzel adtam a laptopnak, a rés az első percben megnyílt, és két perc múlva a laptop magától meghívta.

⭐ **A tanulság:** a két NAT (az otthoni router és ennek a mobilszolgáltatónak a NAT-ja) engedi a résfúrást; ami elakadt, az a belépő
CÍMÉNEK MEGTALÁLÁSA.

⚠️ **Helyesbítés:** a telefon naplójának „4 tartónál jelentkeztem” sora nem négy DHT-gépet jelent, hanem **négy témát** (rekeszt), amin
legalább egy gép eltárolta a bejelentést (`koino.js` — a `bejelentve` a témák száma). A felirat félrevezető (az esti elemzésben
én is félreolvastam) — lásd M6.

## 2. Hogyan megy ma az első találkozás

1. **A meghívó** (a szöveg, amit a meghívó elküld) hordozza a meghívó készülék címeit (a belső és a kifelé látszó) és a
   készülék-nevét (tábla-aláíró). A belépő tehát tudja, hol a meghívó — a meghívó semmit nem tud a belépőről.
2. **A belépő** a meghívó elfogadásakor (`meghivoElfogadasa`) a címeket induló címnek veszi, és felvesz egy **jelentkezés-kérelmet**
   (cél nélküli függő kérelem — MH6), aminek a kopogtató témája a meghívó **készülék-témája** (a koinó nevéből és a meghívó
   készülék-nevéből számolt rekesz). ⚠️ Mint minden függő kérelem, ez is **két óra után lejár**.
3. **A belépő őrjárata** az új függő kérelemnél azonnal, aztán ~20 percenként a **BitTorrent DHT-n** (a világ torrent-programjainak
   közös, gazdátlan hálója — nem koinós gépek) bejelenti a címét ezen a rekeszen: a DHT ismert belépőin (`router.bittorrent.com`
   stb. — csak indítás; utána a megismert gépekből) a rekesz számához „legközelebbi” ~8 géphez jut, és azok eltárolják: „ezen a
   rekeszen ez a cím” (az IP a csomagból, a port a saját, kívülről látszó portja — STUN). A rekesz száma vakított: csak az tudja,
   melyiket nézze, akinél ott a meghívó.
4. **A meghívó őrjárata** ~20 percenként (`cimjegyzekKor`) ugyanezen a rekeszen (és a gyökér-darabjai párjain) megkérdezi, ki jelentkezett;
   akit talál, azt 30 percig a kör céljai közé veszi (`KOPOGTATO_ELEVULES`), és percenként kopog rá.
5. **A résfúrás:** mindkét fél percenként, ugyanabban az ablakban kopog a másikra — a két router „válasznak” látja a másik csomagját,
   és beengedi. Megindul a csere, a belépő bizonyítja a meghívót (D122), a meghívó magától meghív.

## 3. Hol vész el

- **F1 — a keresés elhibázza a valódi bejelentést.** Egy keresés (`tarsakKeresese`) témánként 1–3 címet hozott, és ugyanaz a
  bejelentés hol benne volt, hol nem: 21:05-kor a telefon címe a gyökér-pár témán megvolt, a készülék-témán nem; 21:12:48-kor a laptop
  egyetlen „kérőt” talált, és az nem a telefon volt (különben a rés 21:13-kor megnyílt volna); 21:18-kor mindkét témán megvolt.
- **F2 — a zaj.** A DHT néhány gépe BÁRMILYEN rekeszre hamis „tartókat” ad (31.200.249.x és mások — három véletlen, soha nem használt
  témán ugyanígy jöttek; a ⑦ 1. lelete). A kör percenként rájuk kopog, és a „kérő vár rám” szám hazudik.
- **F3 — a ritkaság.** Egy elhibázott keresés után 20 perc a következő próba.
- **F4 — a jelentkezés lejár.** Két óra után a belépő abbahagyja a jelentkezést a meghívó készülék-témáján (a lapja kérései — a
  gyökér-fejlécek — addig jelentkeznek a gyökér-pár témákon, amíg a lap kér). Ha a meghívó addig nem talált rá, a belépés
  elakad.
- **F5 — az ütközés útja.** Ha a két gép egy munkában egymástól kér, és a meghívó enged és kiszolgál (`kerelemAtvetele` — a ⑦
  javítása, `dfda545`), a bizonyíték igazolódik, de a „belépő útja” (a belépés elkérése, az automatikus meghívás) kimarad — ma két
  perc késés (a következő rendes csere pótolja).
- **F6 — a félrevezető naplósor:** „N tartónál jelentkeztem” (témák, nem gépek); a „kérő vár rám” a zajt is számolja.
- ⚠️ *Nem e terv tárgya:* a kifelé látszó port a STUN-é — egy cél-függő (szimmetrikus) NAT mögött más porton megy ki a csomag, és a
  résfúrás így nem sikerülne. Ennél a szolgáltatónál működött; a két mobil közötti eset (🅱️) változatlanul nyitott.

## 4. A javaslatok (Csaba elfogadta az irányt: a gyakoribb keresést, a zaj szűrését és a megbízhatóbb keresést)

- **M1 — a keresés megbízhatóbb (F1):** egy körben ugyanazt a rekeszt **többször** kérdezzük (pl. 3×, rövid szünettel, más-más
  belépési pontról indulva), és az eredményeket **egyesítjük**; a bejelentő pedig a bejelentés után **egy ellenőrző kereséssel** nézi,
  hány gép tartja (ha egy sem, azonnal újra). *A számokat a mérés adja (5. szakasz).*
- **M2 — gyakrabban, amíg él egy meghívó (F3):** csak a készülék-témát (a meghívottak rekeszét), és csak amíg van fel nem használt,
  le nem járt meghívó. ⏸️ **B2 — az ütem:**
  - (a) az első napban 2 percenként, utána a mai 20 perc;
  - (b) ⭐ **lépcsős:** az első órában 2, az első napban 5, utána 10 percenként, amíg a meghívó él (egy hónap) — a belépő napok múlva is
    beillesztheti a meghívót;
  - (c) 5 percenként, amíg él.
  Egy keresés ~3 KB: a (b) az első napban ~1,5 MB, utána ~0,4 MB/nap meghívónként (a telefonos meghívónál számít).
- **M3 — a zaj kiszűrése (F2):** ⏸️ **B3:**
  - (a) **kudarc-számláló:** amelyik kopogtató címen 3 kör után sem nyílik rés, azt 6 óráig nem hívjuk;
  - (b) **ellenpróba-rekesz:** körönként egy véletlen, soha nem használt rekeszt is megkérdezünk — ami ott is megjelenik, az zaj (a
    mostani mérés pontosan így ismerte fel), és kimarad;
  - (c) ⭐ **mindkettő:** a (b) azonnal kiszűri a „mindenre felelő” gépeket, az (a) a többi halott címet.
- **M4 — a jelentkezés nem jár le, amíg van értelme (F4):** ⏸️ **B4:** (a) ⭐ a belépő a jelentkezést addig újítja, amíg a meghívója él és
  ő még nem tag (a meghívó egy hónapig érvényes — a teher korlátos: egy rekesz); (b) marad a két óra.
- **M5 — az ütközés útja (F5):** a kiszolgálás közös útja (`kerelemAtvetele`) is lefuttatja a belépő útját — hibajavítás, nincs
  döntés.
- **M6 — igaz felirat (F6):** „N témán jelentkeztem”, és a „kérő vár rám” a kiszűrt zaj nélkül — nincs döntés.

- **M7 — a belépő lapja kimondja, hogy keresi az első kapcsolatot** (Csaba, 2026-11-04: *„a meghívott felületén értesítse a
  meghívottat, hogy a készüléke, éppen próbálja fel venni az első kapcsolatot, és jelezhetné a probálkozásokat is.”*). Ma a
  belépő a lapon csak annyit lát, hogy „a hiányzó részek tartóit még keresem … meghívót kaptál?” — este a barátod fél órán át nem
  tudhatta, történik-e valami. **A javasolt állapotok** (egy sáv a lap tetején, amíg nem tag; a szöveg a laptól függetlenül is igaz):
  1. *„✔ A meghívót elfogadtad (Csaba Laptopja hívott meg). Keresem a meghívód készülékét…”*
  2. *„📡 Bejelentkeztem a hálózaton, hogy a meghívód készüléke rám találjon — utoljára 21:04-kor (3 helyen), legközelebb 21:24-kor.”*
  3. *„🚪 Kopogok a meghívód készülékére: 17 próbálkozás, az utolsó 21:18-kor — még nem válaszolt.”* (percenként frissül)
  4. *„🤝 Megvan a kapcsolat (21:19) — a meghívód készüléke most fogad be…”*
  5. *„✅ Bent vagy a koinóban (21:21) — jönnek a gondolatok.”* (néhány perc múlva eltűnik)

  Ha sokáig nincs kapcsolat (pl. 30 perc), egy segítő mondat: *„Akkor tud rád találni, ha a meghívód készülékén fut a koinó. Ha
  ugyanazon a wifin vagytok, azonnal megy. A meghívód december 4-ig érvényes.”* **Az adat forrása:** a belépés lépéseit az őrjárat
  jegyzi (a csere-állapot mellé — `csere.json`, amit a lap úgyis 10 mp-enként kérdez); címet a lap nem mutat (csak a „részletek”
  alatt, a hibakereséshez). ⏸️ **B5:** (a) ⭐ **a meghívó oldalán is:** a „Meghívóim” ablak a „aktív” helyett kimondja, hogy *„jelentkezett —
  kopogok rá (5 próbálkozás)”*, aztán *„igazolta — befogadom”*, *„felhasznált”* (este a te oldaladon sem látszott semmi); (b) és a
  készülék saját értesítése (D103), amikor a belépés sikerült — mindkét oldalon (*„Bent vagy a koinóban”* / *„Csikós Alex belépett”*),
  mert a lapot közben bezárhatják; (c) csak a belépő lapján.

⛔ **Amit nem javaslok:** központi segítő (jelzőpont, közvetítő szerver — a 2. szabály); a meghívott a saját címét a meghívóba
vagy egy válaszüzenetbe tegye (a mobilcím változik, és egy második üzenet visszahozná a „kódos utat”, amit a D122 megszüntetett).

## 5. Előbb a mérés (87.)

A valódi DHT-n két készülékkel (a laptop otthon és egy telefon mobilneten — hogy a két cím különbözzön: a DHT-gépek egy része a
kérdező saját címét nem adja vissza, ezért egy gépről nem mérhető): a telefon K véletlen rekeszen bejelent (ahogy egy belépő), a
laptop mindegyiket 0, 2, 5, 10 és 20 perc múlva keresi.
- **Mit mér:** egy keresés találati aránya; ugyanez 2×, 3× ismételve és egyesítve (M1); hány gép tárolta a bejelentést, és ezt az
  ellenőrző keresés látja-e; a zaj aránya és az ellenpróba-rekesz szűrőjének pontossága (M3 (b) — téves kiszűrés nincs-e).
- **Mire dönt:** az M1 ismétlésszáma és szünete, az M2 ütemének értelme (ha 3 ismétléssel ~100%, a ritkább ütem is elég), az M3 (b)
  érvényessége.
- Egy mérő-szkript a `koino/meres/`-ben (nem a program része); a telefonon Csaba futtatja (`node ~/koino_1.1/koino/meres/…`).

## 6. A sorrend (a döntések után)

① a 87. mérés → ② B2–B5 Csabánál (a mérés számaival) → ③ az építés: M5 + M6 (javítás), M7 (a belépés lépéseinek feljegyzése és a
lap sávja — előre, hogy a többi javítás hatása a terepen látsszon), M3, M1, M4, M2 — mindegyik próbával és rontással (a DHT-t a próbák
hamis DHT-vel helyettesítik, ahogy a ③c próbái; a lap sávját böngészőben is végigjárva) → ④ terep: egy telefon mobilneten, a meghívó a
lapról — a cél, hogy **kézi segítség nélkül**, néhány percen belül bent legyen, és **mindkét fél lássa, hol tart**.

✅ **Csaba (2026-11-04): „rendben elfogadom”** — a terv (M1–M6, B2 (b), B3 (c), B4 (a)) és a sorrend; hozzátéve az M7-et (a belépő
lapja). ✅ **B5:** (a) + (b) (Csaba: „elfogadom a javaslataidat, kezdheted a munát a 87.-el.”).

## 7. ⛔⭐ A 87. mérés helyi része (2026-11-04 éjjel) — és ami ettől a tervben változik

*A részletek: [`eredmenyek.md`](../koino/meres/eredmenyek.md) 87. — egy gépen, két szerepben; a két készülékes rész (a kiíró
mobilneten) hátravan.*

- ⛔ **A BEP 5 (a belépő mai cetlije) témánként dől el:** egy téma vagy mindig megvan, vagy soha (75% — és a második, friss kliens nem
  segít); az első próbán négyből 0, egy perc múlva 1. **Az M1 (a megismételt keresés) tehát keveset ér** — ahol a cetli nincs, oda
  hiába kérdezünk újra.
- ⛔⛔ **A BEP 5 hamisít:** a mi portunkon a valódi cím mellett két idegen IP is visszajött — gépek, amik a bejelentést elfogják, és a
  saját címükkel adják vissza. A „zaj” ennek a tábornak a része (BitTorrent-figyelők, amik a kulcstérben „közelinek” adják ki
  magukat).
- ⭐ **A BEP 44 (aláírt bejegyzés — a hirdetőtábla útja) 100%:** hamisíthatatlan, titkosítható; egy keresés ~16 mp, ~7,5 KB.
- Az ellenpróba-téma (M3 (b)) keveset szűr: a zaj címei egy /24-en belül forognak.

**A javasolt új út — M8, a meghívó rekesze (BEP 44):** a meghívó titkából (ami a meghívóban utazik, és csak a két félnél van)
mindkét fél ugyanazt a kulcspárt és sót számolja. A belépő erre a rekeszre aláírva kiteszi a címét (és a tábla-aláíróját), a meghívó
titkából számolt kulccsal **titkosítva** (a DHT-figyelők így a címét sem látják); 20 percenként, és amíg a meghívója él, de ő még nem
tag, újra (M4). A meghívó minden élő meghívójának rekeszét nézi (az M2 ütemében — BEP 44 `get`), és amit talál, arra kopog. Mint a
hirdetőtábla rekesze (2026-09-20), csak a rekesz kulcsa nem a két tábla-kulcsból, hanem a meghívó titkából jön.

**⏸️ A döntések (Csabánál) — a mérés után:**
- **B6 — a belépő cetlije:** (a) ⭐ **BEP 44 a fő út, a BEP 5 mellette marad** (ahol megvan, ott is talál — semmi nem vész el) · (b) csak
  BEP 44 · (c) marad a BEP 5 az M1/M3-mal.
- **B3 (javítva):** az ellenpróba-téma helyett csak a **kudarc-számláló** (M3 (a)) — a mérés szerint az ellenpróba keveset szűr.
- **B2 (az ütem) változatlan** — csak most BEP 44 keresésre vonatkozik (~7,5 KB / keresés: az első napban ~2 MB, utána ~0,8 MB/nap
  meghívónként; ha sok, a 10 perces lépcső 20 percre nyújtható).
- **M1 kimarad** (a BEP 44-nél nem kell; a BEP 5-nél nem segít).
- ⚠️ **Külön átvizsgálás kell (nem most):** a koino többi BEP 5 útja — a címjegyzék (D91: a gyökér-darab hirdetése, a függő kérelmek
  kopogtatói, a kereső-régió társai, a D111 tippje) — ugyanettől a szennyezéstől szenved; a hirdetőtábla (BEP 44) nem.

**A sorrend (javítva):** ① a 87. két készülékes része (a telefon mobilneten kiír, a laptop keres — megerősíti, hogy a BEP 44 mobilnetről is
megy, és a hamisítást) → ② B6, B3 → ③ az építés: M5, M6, M7, M8, M3 (a), M4, M2 → ④ terep.

## 8. 🚧 Az építés

✅ **B6 (a)** (Csaba: *„elfogadom a javaslataidat, mehetünk tovább.”*) — a BEP 44 a fő út, a BEP 5 marad mellette; a mobilos
megerősítés a terepi próbán (Csabának nincs mobilnetes készüléke).

- ✅ **M5 — az ütközés útja:** a belépő útja (a belépés elkérése, az automatikus meghívás) egy függvény (`belepoUtjaFuttatasa`),
  amit a munka és a kiszolgálás közös útja (`kerelemAtvetele` — a családi átadás és az ütközés) is hív; a munka a kiszolgált
  kérelem után is (nyílt koinóban a nem tag kérelmét kiszolgáljuk — MH7). Próba (parancssor): A-nak függő törzs-kérelme van F felé,
  F szelet-kérelemmel jön, F kérelme megy elöl, A enged, kiszolgál — és ugyanabban a munkában meghív (a meghívó felhasznált).
  Rontás: a `kerelemAtvetele` hívása nélkül a meghívó „igazolt — a belépése még nem jött meg” marad (pontosan a terepi állapot).
- ✅ **M6 — igaz felirat:** „N témán jelentkeztem” (az őrjárat és a `kerelem` parancs; eddig „tartónál” / „helyen”). A „kérő vár
  rám” zajszűrése az M3-mal jön.
- ✅ **M7 — a belépő sávja** (2026-11-05, elágazás 234): a csere-állapot (`csere.json`, amit a lap úgyis 10 mp-enként kérdez) egy
  `belepes` résszel — `csereAllapot.js`: `belepesKezdete` (a meghívó elfogadása: a lap / a `csatlakoz`), `belepesJelentkezese` (az
  őrjárat címjegyzék-köre a meghívó készülék-témáján: mikor, hány gép tárolta, mikor legközelebb), `belepesKopogasa` (körönként
  egy próbálkozás, ha volt célja és még nincs kapcsolat), `belepesKapcsolata` (a munka a meghívó tábla-aláírójával; a kérelem útján
  — ahol a társ tábla-kulcsát nem kapjuk meg — a jelentkezés kérelme, vagy a társ címe a meghívó címei közül), `belepesTagsaga` (a
  háztartás, egyszer); a kép (`belepesKepe`) a legelőrébb tartó lépés, a „bent vagy” 5 percig látszik, fél óra kapcsolat nélkül
  segítő mondat. A lap: `felulet/js/koinoBelepes.js` — a sáv a lap tetején (a lépések listája; ha az őrjárat nem fut, kimondja;
  10 perccel a kapcsolat után tagság nélkül: „a meghívód nézze meg a Meghívóim ablakát”). ⭐ B5 (b) a belépő oldalán: a tagsággal a
  készülék értesít („Bent vagy a koinóban”) — csak akkor nem, ha a készülék értesítését kifejezetten kikapcsolták (egy friss belépőnek
  még nincs beállítása). Próbák: két modul-próba (a lépések sorrendje, a szélek) és egy parancssor-próba (A őrjárata előbb áll: F
  „kopog” → A elindul: „kapcsolat” → „tag” + értesítés; G a kérelem útján) — hét rontással; böngészőben végigjárva (asztali és
  telefon-szélességen). ⚠️ A „Meghívóim” igazi állapota (B5 (a): „jelentkezett — kopogok rá”) az M8-cal jön: a meghívó rekeszéből
  tudja a meghívó, MELYIK meghívója jelentkezett.
- ✅ **M8 — a meghívó rekesze (BEP 44)** és vele **✅ M2 (az üteme)** és **B5 (a)** (2026-11-05, elágazás 235): `koino/js/csere/meghivoRekesz.js`
  — a meghívó titkából a kulcspár, a só és az AES-kulcs (`meghivoRekesze`), a belépő bejegyzése (`rekeszBejegyzes`: legfeljebb 4 cím
  és a tábla-aláíró, titkosítva, másodperc-sorszámmal), a kibontás (`rekeszBejegyzesbol`: a sértett, az idegen alakú és a más titkú
  null), az ütem (`rekeszKeresesKoze`: 2 / 5 / 10 perc a meghívó kora szerint). A program: a belépő a címjegyzék-körében ír
  (`belepoRekeszKiirasa` — amíg a meghívója él és nem tag: ez az M4 a fő úton), a meghívó a háztartásában keres
  (`meghivoRekeszekKore` — a háttérben, egy DHT-munkamenetben; a talált címek 30 percre a kör céljai közé), és feljegyzi
  (`meghivok.json` `rekesz`: mikor jelentkezett, hány próbálkozás azóta); a „Meghívóim” sorában „📡 jelentkezett (21:04) — kopogok
  rá: 5 próbálkozás”, „még nem jelentkezett”, „✔ igazolta a meghívót — befogadom”; a `meghivok` parancs ugyanígy; a belépő sávjának
  jelentkezése a rekesz gépeit is mondja. Próbák: három modul-próba (a rekesz, az alakja, az ütem — öt rontással) és egy
  parancssor-próba a hamis DHT-n (a belépő nem éri el a meghívót, és a BEP 5 elveszik: csak a rekeszből találhatnak egymásra — négy
  rontással); ⛔ a (c) rontás eleinte nem bukott: a hamis hálón a BEP 5 hibátlan volt, és a két gép a közös kereső-régió és
  gyökér-darab hirdetőiként is megtalálta egymást → a hamis háló `bep5Elvesz` kapcsolója (a 87. mérés leletét utánozza). Böngészőben
  végigjárva. ⚠️ A mobilnetes megerősítés a terepi próbán.
- ✅ **M3 (a) — a kopogtatók kudarc-számlálója** (2026-11-05, elágazás 236): `koino/js/csere/kopogtatoSzuro.js` — `kopogtatoFelvetele`
  (a tiltottat nem veszi fel, a DHT-ról újra jött cím a számlálóját megtartja, a rekesz címe feloldja a tiltást), `kopogtatoEredmenyek`
  (a kör első menetének eredményei: a siker nulláz, a kudarc nő, 3 után 6 órára tiltott; a tiltások jegyzéke ≤ 1024). A program: a
  címjegyzék-kör kopogtatói és régió-társai a szűrőn át („N néma címet kihagytam”), a rekesz címei `REKESZ_FORRAS`-sal, és a kör után a
  család minden példányára (`🚫 … 6 óráig nem hívom`). Próbák: két modul-próba (öt rontás) és egy parancssor-próba (egy „figyelő” egy
  halott címet jelent be a meghívó készülék-témáján: a kör céljainak száma 1-ről 0-ra esik — egy rontással).
- ✅ **M4 — a jelentkezés a meghívó lejáratáig** (2026-11-05, elágazás 236): a függő kérelem `meddig`-je (`fuggoKerelmek.js` —
  rövidebbre nem, legfeljebb 31 nap, egy újabb felvétel kitolhatja); a meghívó elfogadása a meghívó lejáratát adja, a tagsággal
  (`belepesKovetese`) a jelentkezés lezárul. Próbák: egy modul-próba (három rontás) és az M7 parancssor-próbájában a belépő lemeze
  (két rontással).
- ⏭️ **Hátra:** a terepi próba (egy mobilnetes telefon — a 87. két készülékes része is), és a koinó többi BEP 5 útjának átvizsgálása.

## 9. ✅ A terep (2026-11-05 este) — mobilnet és otthoni wifi, cím beírása nélkül

Csaba a laptop lapján (`terep4`, „Meghívókulcs-próba”, az M3 (a) és az M4 utáni kóddal) 17:26:46-kor meghívót állított ki Schubert
Zoltánnak (Csaba barátja, mobilneten — a telefonja a CGNAT mögött: 151.0.83.29, belül 10.40.217.106 és 100.113.152.100). Zoltán a
sort bemásolta a Termuxba; a telepítés (`pkg`, Node, a program) a mobilneten néhány perc. A laptop naplója szerint:

- **17:28** (az ő órája) a belépése; **17:30:08** a telefonja kiírta a címeit a meghívó rekeszébe (BEP 44).
- **17:32:20** a laptop a háztartásában megtalálta: *„📮 Schubert Zoltán jelentkezett a meghívóm rekeszében — kopogok rá
  (151.0.83.29:42957, 10.40.217.106:7373, 100.113.152.100:7373)”* — az M8 a valódi DHT-n működik, az M2 kétperces üteme elkapta.
- **17:33:00** a rés az első próbára megnyílt (50 ms); Zoltán első kérelmét a laptop még nem szolgálta ki (*„zárt koinó, nem tag”*),
  a saját függő kérelmével elhozta a belépését.
- **17:33:07** *„✉️ meghívtam: Schubert Zoltán — a meghívómmal lépett be”* (D122) — a csere ugyanabban a percben.
- **17:34** Zoltán lapja fejléceket kért; amit a laptop nem tartott, azt továbbadásra átvette. **17:35** megjött a „Teszt” gondolata.
- 50 percen át percenként egy csere (2,5–3,2 KB, „nincs újdonság”), a telefon címe (a CGNAT portja) végig ugyanaz.
- **18:23** óta a telefon hallgat (valószínűleg a Termux leállt — Androidon `termux-wake-lock` kell, különben a háttérben leállhat).

⭐ Ami ezzel igazolva: a belépő megtalálása mobilnet és otthoni router között **cím beírása nélkül** (M8 + M2), a rés a két NAT között
az első próbára, és a meghívó gépe magától meghív. Az M3 (a) a terepen is dolgozott: a címjegyzék-kör 20 percenként két „kérőt”
hozott a DHT zajából (mindig másikat), és a szűrő 3 kör után kidobta őket. ⚠️ Amit nem láttunk: a belépő lapjának sávját (M7) — Zoltán
telefonján volt; és a B5 (a) számlálója a rekesz feljegyzésében 0 maradt (a rés a megtalálás utáni első körben nyílt).

⛔ **A lelet (javítva, elágazás 237):** a hirdetőtábláról olvasott cím TALÁLKOZÁSNAK számított. A laptop két régi kötése (két egy napja
leállt telefon) bejegyzését a DHT még őrizte (*„az ő órája szerint 1500 perce írta ki”*), és a laptop kétpercenként megtalálta — a
kötésük így kétpercenként „élő” lett: a visszalépő ütem (72. mérés) elmaradt, a találkozás-számláló a hallgatás alatt is nőtt (971), és
a halott kötés nem eshetett ki a jegyzékből. Most `kotesek.js` `tablaCimFeljegyzese`: a cím a kötés címei közé kerül, a hallgatás
marad. Az új kóddal újraindított laptop a két halott telefont már nem keresi kétpercenként (a következő keresés a hallgatás 64. körében).

⚠️ **Nyitott:** a laptop régi őrjárata 18:40:26-kor (egy tábla-találat kiírása után) megállt, és 19:15-ig semmit nem csinált — nem
kopogott, fájlt nem írt; a gép nem aludt (a Windows eseménynaplója), a Ctrl+C azonnal leállította. Az oka ismeretlen: a kör a táblától
függetlenül fut (D115), tehát az egész folyamat állt. Az új folyamat mellett percenként jegyezzük a processzoridőt és a `csere.json`
írását — egy újabb megállásnál ebből látszik, hogy pörög-e vagy blokkolva áll (egy kiírásnál, egy szinkron hívásnál).
