# A kereső-réteg átvizsgálása (D101 ⑦, 2026-10-13)

> A D101 (M4) szerint a Keresés modálja a **helyi aljára** épült (⑤ — a készüléken ismert entitások címében), a hálózati
> **megtalálás** pedig külön alappillér, saját átvizsgálással. Ez az átvizsgálás. Építés nincs benne; a végén a kérdések
> (D-szintűek, Csabáéi), javaslattal.

## 1. A kérdés

A szigorú (b) alatt egy készülék csak a saját szeleteit ismeri (amit tart, és amit egy kérelem elhozott). A helyi kereső
ezért azt találja meg, amit a készülék már ismer — egy friss tag szinte semmit. A hálózati megtalálás azt a kérdést
válaszolja meg, hogy *„melyik gondolat címében van ez a szó — bárhol a koinóban?”*, úgy, hogy egy készülék terhe ne a
koinó méretétől függjön (a „végtelen” próbája).

Három dolgot a korábbi döntések már rögzítettek. ⭐ **Cím szerinti keresés elég** (Csaba, 2026-08-31 — skálázási terv
5.1): nincs címke, nincs értelmezés, a bejegyzés **számított**, nem kimondott — aki ismeri az entitást, ugyanazt a
bejegyzést kapja. ⭐ **Elhagyható** (5.7, 2. szabály): ha a kereső-réteg nem működik, a koino működik — semmi, ami
**dönt**, nem függhet tőle; csak a megtalálás. ⭐ **A bejegyzésnek el kell halványulnia** (5.7, D14): ha a mutató
megőrzi egy elfelejtett entitás nevét, temetőt építettünk.

## 2. Ami már áll — és a lelet

Az átvizsgálás legfontosabb lelete, hogy **a kereső-réteg ugyanaz a mozdulat, ami a gyökér-darabokban (D95/4) már
működik**, csak más kulccsal:

- A gyökér-darab a legfelső szintű születéseket a **születés azonosítójának lenyomata** szerint osztja darabokra; minden
  készülék a saját darabját tartja (a tábla-kulcsa lenyomatából számolva), a mélységet a saját darabjából becsüli
  (`gyokerMelysegBecslese`), és a darabját a DHT-n hirdeti (D91/3, ~20 percenként). Aki egy legfelső szintű gondolatot ír,
  a csak küldő úton a darab kulcsa alatt is felajánlja (`kuldoKulcsai`), és a darab tartója ugyanazon a kapun veszi be.
- A kereső-réteg darabja a **cím egy szavának lenyomata** szerint osztana: az index-darab a „szót tartalmazó születések”
  halmaza. ⭐ **A bejegyzés maga a létrehozó esemény** (aláírt, a címmel — `GondolatLetrehozas` `adat.cim`): nem kell új
  eseményfajta, és nem lehet hamisítani — a kérdező az aláírást és a címet maga ellenőrzi. Ez pontosan a skálázási terv
  „számított bejegyzése”, csak a koinó meglévő eszközeivel.

Ami még ráépíthető: a **DHT** (D91, 58. mérés — egy hirdetett téma ~0,65 MB/nap, egy keresés ~3 KB), a **kopogtatás és a
kérelem** (D92 — randevú a tartó témáján, lyukfúrás, `KERELEM`, sorozat — D102/J3), és a **csak küldő út** (D95/3; a ⑥
óta a bejelentési helyeken is). Új protokoll-üzenet alig kell: a kérdés egy `KERELEM` az index-darabra, a szó szűrőjével.

## 3. A javasolt alak (vázlat)

**A szó.** A cím szavai (betűk és számjegyek egybefüggő sora), NFC-normalizálva, kisbetűsítve; a túl rövid (1–2 jeles)
szavak kimaradnak. Egy cím átlag ~4–6 szót ad.

**Az index-darab.** A szó lenyomatának első bitjeiből, a gyökér-darab mintájára (`kereso:<mélység>:<darab>`); a mélységet
a készülék a saját index-darabjából becsüli (amit tart, annak a méretéből), kettőzésenként +1.

**Ki tartja.** Minden készülék a saját index-darabját (a tábla-kulcsa lenyomatából — mint a gyökér-darabot), és hirdeti a
DHT-n (+1 téma, ~0,65 MB/nap). A tartók száma darabonként ≈ készülékek / darabok: a darab célmérete dönti el (mint a
gyökérnél) — ha egy darab ~R tartónál van, egy kérdésre R közül elég egy, aki éppen elérhető.

**Hogyan kerül oda.** A szerző a születést a cím szavainak index-darab kulcsai alatt is felajánlja a csak küldő úton
(`kuldoKulcsai` + a szavak darab-kulcsai), és amit egy tartó átvett, az kézbesített (14 nap, `kezbesites.json`). ⚠️ Ez a
nehéz rész: a csere a **társakkal** megy, az index-darab tartója nem feltétlenül társ. Két út: (a) a szerző a DHT-n
megkeresi a darab tartóit, és kopogtat (mint a kérelem — késés: a NAT-os tartónál percek-tízpercek, D102/74. mérés), vagy
(b) a bejegyzés a raj és a csere útján **terjed** a darab felé (minden készülék továbbadja a hozzá került, nem a saját
darabjába eső bejegyzést annak, akinél a darab van — ez a kopogtatás nélküli, lassabb, de olcsóbb út).

**A kérdés.** A kereső a szó darabjának tartóit a DHT-n keresi (~3 KB), kopogtat, és egy `KERELEM`-et küld (a darab, a
szó); a válasz a szót tartalmazó születések (legfeljebb n, az ágazati pont szerint? — a tartó nem tudja az össz-pontot; a
legutóbbiak), aláírva. ⭐ **Több tartót kérdez, és egyesít** (5.6): a hamis bejegyzés az aláírásnál elbukik, a hiányzót a
másik tartó pótolja — az elhallgatás így elérhetőségi kérdés lesz.

**A halványulás.** A tartó a bejegyzést 30 nap után elejti, ha senki nem ajánlotta fel újra; a szerző (és aki az entitást
tartja) a csak küldő úton időnként újra felajánlja — amíg az entitás él (D14). Ami elfelejtődik, az a kereső-rétegből is
eltűnik.

## 4. Az ára — becslés (mérendő)

Egy készülék terhe: **+1 DHT-téma** (~0,65 MB/nap, mint a gyökér-darabé); az index-darab tárolása ≈ (entitások × szavak ×
tartók darabonként) / készülékek — fejenként 10 entitással, 5 szóval, darabonként 10 tartóval ~500 bejegyzés, egyenként
~0,4–0,8 KB → **~0,2–0,4 MB, a koinó méretétől függetlenül** (a „végtelen” próbája ✓). A felajánlás: egy új entitás ~5
szó × a darab tartói közül néhány (nem mind — a tartók egymás közt a csere útján egyeztetik a darabot) → néhány tíz KB.
A kérdés: ~3 KB DHT + egy kérelem (a válasz méretével). ⚠️ **A késés** a fő ár: egy friss kérdésre a NAT-os tartóhoz a
kopogtatás percekig tart (74. mérés) — a kereső-réteg ezért nem lesz „gépelés közbeni” kereső, hanem *„kérd, és jön”*
(a lap ezt kimondja, mint a pakli: „keresem”).

## 5. A kérdések — javaslattal (D-szintűek, Csabáéi)

**K1. A szelet-megtalálás: hash vagy bizalmi háló? (SK7)**
- **(A) ⭐ Hash szerinti elhelyezés a meglévő DHT-n (a gyökér-darab mintája), a társak a bizalmi hálóból — ezt
  javaslom.** A skálázási terv „középútja”: a hash egyenletes, a DHT és a darabolás már megépült (D91, D95/4); a
  Sybil-gond itt kicsi, mert a bejegyzés aláírt és ellenőrizhető (a csaló tartó csak elhallgathat, hamisítani nem tud), és
  több tartót kérdezünk.
- **(B) Bizalmi háló mint útvonal** (Whānau-féle): Sybil-ellenálló, de bonyolultabb, a hubokra torlódik, és az
  identitás-réteg zavara azonnal keresési zavar.

**K2. Mi a kulcs: egész szó vagy előtag is?**
- **(A) ⭐ Egész szavak — ezt javaslom.** Egy címből ~5 bejegyzés-hely. A részszó-keresés a helyi aljában megmarad.
- **(B) Előtagok is** (3 jeltől): gépelés közben is találna, de egy szó 3–8 helyre kerülne (×3–8 tárolás és felajánlás),
  és a hálózati késés miatt a gépelés közbeni keresés úgysem élhet.

**K3. Láthatósági küszöb a keresőn? (SK10)**
- **(A) ⭐ Igen, rögzítve: a hálózati kereső csak a legalább 2 különböző tulajdonosú gondolatot adja — a helyi alja és a
  létezés soha nem szűr; és a küszöb NEM közösségi paraméter (nem tolható feljebb — a cenzúra-kockázat, 5.8).** ⚠️ Az ára:
  a tartó ezt csak akkor tudja, ha a pont-eseményeket is látja — a bejegyzés mellé a felajánló a két legnagyobb tulajdonos
  aláírt pont-eseményét is adja (+~1 KB), vagy a kérdező a találat után maga ellenőrzi (lassabb).
- **(B) Nem** — minden születés kereshető (a szemetet a tudatpont-keret ára korlátozza, 5.1).

**K4. Hogyan jut a bejegyzés a darab tartójához?**
- **(A) ⭐ A szerző (és aki az entitást tartja) a csak küldő úton ajánlja fel, a darab tartóit a DHT-n megkeresve és
  kopogtatva — ugyanaz a gépezet, mint a függő kérelemé (D92/1); ezt javaslom.** A késés itt nem fáj (a felajánlás a
  háttérben megy), a tartók egymás közt a csere útján egyeztetik a darabot (a raj — D91).
- **(B) Terjedés a cserében** (a bejegyzés a társakon át jut a darab felé): kopogtatás nélkül, de lassú és kiszámíthatatlan.

**K5. A halványulás**
- **(A) ⭐ 30 napos élettartam, a tartók (az entitás tartói) megújítják, amíg az entitás él — ezt javaslom.**
- **(B)** Amíg a darab tartója meg nem tudja, hogy az entitás elfelejtődött (ehhez a tartónak követnie kellene az entitást —
  drága).

**K6. Előbb mérés?**
- **(A) ⭐ Igen — a 75. mérés (szimuláció, a 74. mintájára): a darab tartóinak száma, a válasz-arány az elérhetőség
  mellett, a felajánlás és a kérdés késése és forgalma, a tárolás készülékenként; csak utána építés.** A D101 is így
  rendelte („saját átvizsgálással és méréssel”).
- **(B)** Építés a becslések alapján.

## 6. A javasolt sorrend (a döntések után)

① a 75. mérés (szimuláció) → ② a szó és az index-darab (tiszta számítás, a gyökér-darab mintájára) → ③ a tartás és a
hirdetés (a saját index-darab, +1 DHT-téma) → ④ a felajánlás (a csak küldő út a szavak darabjain, kopogtatással) → ⑤ a
kérdés (`KERELEM` a darabra, több tartó, egyesítés) → ⑥ a halványulás → ⑦ a Keresés modálja a hálózati találatokkal
(„keresem” — a lap kimondja, mi helyi és mi jött a hálózatról).
