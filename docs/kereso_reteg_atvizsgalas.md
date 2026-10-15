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

## 7. Az átnézés lelete (2026-10-15) — két rés és egy kiegészítés, a döntések elé

> Session-nyitáskor, olvasva (próba nélkül). A K1–K6 mellé két új kérdés (K7, K8) és a K3 árának pontosítása; mind
> D-szintű, Csabáé.

**K7. A gyakori szavak — egy szó darabja nem osztható tovább (⛔ itt a „végtelen” próbája NEM áll).** A 4. szakasz
becslése (~0,2–0,4 MB készülékenként, „a koinó méretétől függetlenül”) átlag: egyenletes szóeloszlást feltételez. A cím
szavai viszont, mint minden nyelvben, erősen egyenlőtlenek (Zipf): a 3 jelnél hosszabb szavak közt is van néhány, ami a
címek nagy részében áll (a magyarban pl. „egy”, „hogy”, „nem”, „kell”, „van”). Mivel a darab a szó lenyomatának
bitjeiből jön, **egy szó minden bejegyzése mindig ugyanabba a darabba esik, akármilyen mély a darabolás**: ha egy szó a
címek 10%-ában szerepel, a darabja a koinó gondolatainak 10%-át tartja — a tartóinak terhe (a tárolás, a beérkező
felajánlások, a kérdések) a koinóval lineárisan nő. Ebből két baj lesz: (1) a 9. szabály szerint ez a darab nincs kész;
(2) a mélység-becslés (a gyökér-darab mintája: a saját darab mérete × 2^mélység — `gyokerMelysegBecslese`) a gyakori szót
tartó készüléken elszáll, a többin nem, így a két gép mélysége nem ±1-en belül tér el, és a kérdés elkerülheti a tartót.
- **(A) ⭐ A szó darabja az entitás lenyomatával tovább osztódik — ezt javaslom.** Két szintű kulcs: a szó, alatta az
  azonosító bitjei; a mélység szavanként, a szó saját darabjának méretéből (mint a gyökéré). A gyakori szóra a kérdés egy
  vagy néhány al-darabot kérdez, és mintát kap (a gyakori szóra a „mind” úgysem értelmes válasz). ⭐ És mivel a bejegyzés a
  TELJES címet hordozza, a több szavas kérdés a legritkább szava darabjához mehet: a tartó a többi szóra helyben szűr.
- **(B) Stopszó-lista** — nyelvfüggő, és értelmezés (5.1: *„nem kell értelmezni, csak levezetni”*); új nyelvnél vagy
  szleng-szónál elromlik. Nem javaslom.
- **(C) Szavanként korlát a tartónál** (a legfrissebb n) — egyszerű, de a tárolást korlátozza, a beérkező felajánlásokat
  nem, és a „több tartót kérdezünk, és egyesítünk” teljessége a gyakori szóra elvész.
- ⚠️ A K6-hoz: a 75. mérés a szavakat **valószerű, Zipf-szerű eloszlással** húzza — egyenletes szavakkal az átlagot mérné,
  és a farkat (épp ezt a darabot) elrejtené.

**A K3 árának pontosítása — a két tulajdonos csak TAGKÉNT ér valamit.** Az 5.8 a küszöb értékét abból vezeti le, hogy
*„az identitás-réteg miatt nem elég egy második kulcs”*, és a D93/1 óta a döntésben is csak a tag pontja számít. A tartónál
tehát a két aláírt pont-esemény mellé a két szerző **tagsága** is kell (a tagsági csomagja vagy lánca — a 63. mérés szerint
egymillió tagnál ~13 lépés, ~16 KB szerzőnként; a tartó szerzőnként gyorsítótárazhatja, mint a tagsági kísérőt — D95/2),
különben a küszöböt egy második, ingyen kulcs teljesíti. A „+~1 KB” így alulbecslés — a 75. mérésben ezt is mérni kell (a
másik út, hogy a kérdező maga ellenőrzi a találat után, a saját tagság-tudásából). ⚠️ És a küszöb a FELAJÁNLÁS pillanatáé:
ha egy tulajdonos később leveszi a pontját, a tartó csak a megújításkor (K5) tudja meg.

**K8. A darab-szám 16 bites korlátja — a gyökér-darabon MA is, és a kereső-réteg örökölné.** A gyökér-darab mélysége
legfeljebb 16: a `cimjegyzek.js` `gyokerDarabja` 16 bitet olvas a lenyomatból, a darab kulcsa (`0`×34 + `g` + két hexa
jegynyi mélység + NÉGY hexa jegynyi darab + `00`) a `gyokerDarabBol`-ban a 16 fölöttit elveti, és a `szeletEgyeztetes.js`
meg a tömörítés (`koino.js` `tomoritesSzabalya`) is 16 bittel számol. A célméret (`GYOKER_DARAB_CEL` = 256) mellett ez
2^16 × 256 ≈ **16,8 millió** legfelső szintű gondolatig tartja a darabot állandó méreten; fölötte a darab lineárisan nő
(100 millió → ~1500, egymilliárd → ~15 000 darabonként) — a `gyokerMelysege` kommentje szerint pedig *„egy darab mérete
nem nő a koinóval”*. A 9. szabály szerint a szerkezetet most olcsó kitágítani (a kulcsban 34 nulla jegy a tartalék), később
protokoll-törés.
- **(A) ⭐ A korlát kitágítása a ⑦ ② lépésével együtt — ezt javaslom** (a kereső index-darabja ugyanezt a mintát venné
  át), a telefon terepi frissítése előtt, egy tiszta törésben.
- **(B)** Marad: a növekedés lassú (16,8 millió fölött), és a darab akkor sem esik szét, csak nő.

⭐ **A sorrendhez:** a K7 és a K8 a ② (a szó és az index-darab) ELÉ tartozik — a 75. mérés (①) már a választott alakot
mérje.

## 8. ✅ Csaba döntése (D105, 2026-10-15) — és a K8 előtti kérdés

> Csaba: *„minden javaslatodat elfogadom, »Javaslatom: (A), most tágítsuk, például 48 bitre (ez gyakorlatilag
> végtelen).« ezt leszámítva, addig, ameddig át nem pontosítjuk, a gyakorlatilag végtelen fogalmat.”*

A K1–K7 a javaslat szerint — az átbeszélés két új szempontjával:
- **K1 (A)** — hash szerinti elhelyezés a meglévő DHT-n, több tartó, egyesítés.
- **K2 (C)** 🆕 — minden szó KÉT kulcs alatt: az egész szó és az első négy betűje (a négynél rövidebb szó csak egészében).
  A kérdés a szóeleje-fiókot (az őrző a címekben a kérdezett szóelejére szűr) és a pontos alak fiókját kérdezi. ⭐ Az ok: a
  magyar toldalékol — az egész szó szerinti index a „park”-ra a „parkban”-t nem találná, a helyi keresés (szórészlet) igen.
  Szótár és nyelvtani értelmezés nincs (5.1), a tőváltozás („tér” → „terek”) kimarad. Az index puha állapot (K5): a
  kulcs-séma később egy átmeneti időszakkal váltható, a koinó magja nélkül.
- **K3 (A)** 🆕 — a két tulajdonos ellenőrzött TAG; és a nem tag szerző születése a küszöbtől függetlenül sem kerül az
  indexbe (a kulcs ingyen van, a tudatpont-keret csak a tagot köti — D93/1). A tagság a tagsági csomagból, szerzőnként
  gyorsítótárazva (a tagsági kísérő gépe — D95/2).
- **K4 (A)** · **K5 (A)** — 30 nap; a gondolat tartói közül néhány „soros” újít, nem mind · **K6 (A)** — a 75. mérés a 7.
  szakasz és a fenti szempontok szerint · **K7 (A)**.

### ✅ A K8 előtti kérdés: mi a „végtelen” mércéje egy rögzített szélességű számnál? — D106: a (C)

> Csaba (2026-10-15): *„A (C)-t választom: az (A) a szabály, a drága helyen kimondott (B)-kivétel. Mehet a K8 és a 75.
> mérés.”* — A K8 ezzel: a darab-szám legfeljebb 144 bit (megépült — a fázis-2 terv D106-a).

A „végtelen” ellenőrizhető alakja (CLAUDE.md, 2026-09-26) a NÖVEKEDÉSRŐL szól: egy készülék terhe ne függjön a koinó
méretétől. A „gyakorlatilag végtelen” két külön állítást mosott össze: *nincs korlát*, és *van, de olyan magasan, hogy a
valóságban nem érjük el* — az utóbbi egy feltevésen áll a valóságról.

**Kétféle korlát van a kódban.** A *teher-korlát* egy készülék munkáját fogja meg (K = 3 kötés, ≤ 3 cím, 8 raj-tartó,
20 MB átmeneti tár, a bizonyítékok hossza): ezek a „végtelen” eszközei — ettől NEM nő a teher a koinóval. A *méret-korlát*
egy szám, ami a koinóval nőne, de rögzített szélességű: ha a koinó kinövi, vagy a teher kezd nőni, vagy a szám nem
ábrázolható. Ma három ilyen van:
- a gyökér-darab **16 bites** száma (K8) — a gyökérnél ~16,8 millió legfelső szintű gondolatig, a kereső-indexnél
  ~3,4 (a K2 (C)-vel ~1,7) millió gondolatig tartana;
- a tagsági lánc **64-es** mélység-korlátja (`MELYSEG_KORLAT`, D59 — a bizonyíték hosszának őre) — a természetes,
  logaritmikus mélység (63. mérés: egymillió tagnál ~13, vagyis lépésenként ~2,9-szeres) ~10^29–10^30 tagnál érné el;
- a kanonikus alak **„biztonságos egész”** határa (2^53 ≈ 9·10^15, `kanonikusAlak.js`, és az összegző fa összegei, az
  össz-pont bemondása — `osszegzoFa.js`, `osszPont.js`) — egy népszerű ág össz-pontja (legfeljebb e-ember × 10 000 pont)
  ~900 milliárd e-embernél lépné át.

**A mérce — három lehetőség:**
- **(A) A belső mérce:** egy méret-korlát se legyen szűkebb, mint a koinó SAJÁT határa — az azonosító-tér: egy entitás
  neve a 256 bites lenyomata, és ~2^128 entitás fölött két név véletlenül egybeeshet; ennél többet a koinó semmilyen
  formában nem tud megkülönböztetni. Feltevés nélküli. Ára: a darab-szám ~124 bit (a kulcsba 144 fér — olcsó), a
  lánc-korlát 64 → ~128 (olcsó), de a 2^53-as egész-határ helyett nagy egészek kellenének a kanonikus alakban (a
  „legveszélyesebb részlet” — drága, formátum-szintű).
- **(B) A levezetett mérce, kimondott tartalékkal:** a korlát akkor elég, ha a koinó saját szabályaiból levezetett
  legnagyobb méret fölött van, rögzített tartalékkal. A szabályok: az e-ember élő, külön ember (D18/1) → legfeljebb az
  emberiség (~10^10); élő entitás csak ponttal (D14), fejenként 10 000 pont → legfeljebb ~10^14 élő entitás. ×10
  tartalékkal: a darab-számnak ~46 bit kell (a 48 elég), a 64-es lánc-korlát is (~24 lépés), és a 2^53 is (az utóbbi ~87×
  az emberiség fölött).
  Ára: a feltevések (ki az e-ember, mekkora a keret) a mérce részei — ha egy változik, a korlát csendben elfogyhat. (Az
  IPv4 32 bitje 1981-ben „gyakorlatilag végtelen” volt; 2011-re elfogyott, mert a használatról szóló feltevés változott.)
- **(C) ⭐ A kettő együtt — ezt javaslom:** a SZABÁLY az (A); ahol a betartása drága, ott (B) szerinti KIMONDOTT kivétel,
  a levezetett felső mérettel és a tartalékkal, egy helyen leírva. Ma egyetlen kivétel lenne: a 2^53-as egész-határ
  (~900 milliárd e-emberig pontos). A K8 ezzel: a darab-szám annyi bitet vesz a lenyomatból, amennyi a mélységhez kell,
  legfeljebb 144-et (amennyi a kulcsba fér) — nem 48-at. A 64-es lánc-korlát az (A) szerint szűk: a felemelése (~128)
  olcsó, külön lépésként.
