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
- a tagsági lánc **64-es** mélység-korlátja (`MELYSEG_KORLAT`, D59 — a bizonyíték hosszának őre; → ✅ D113: 256 — a 78.
  mérés szerint a korlát a LEGMÉLYEBB tagnál dönt, és a lenti „~10^29–10^30” az átlag volt) — a természetes,
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

## 9. ✅ A 75. mérés (2026-10-16) — a D105 alakja kiállja

> A részletek: [`koino/meres/eredmenyek.md`](../koino/meres/eredmenyek.md) 75. (`node koino/meres/keresoMeres.js`).

- **K7:** a legnagyobb fiók (a „nem”) a címek ~5%-a (prózai aránnyal ~10%) MINDEN méretnél — osztódás nélkül egymillió
  gondolatnál egy készüléken ~53 ezer bejegyzés (~31 MB, az átlag 61-szerese); osztódással (B = 256) ~2400 (~1,4 MB,
  2,8×), és nem nő a koinóval. ✅ A K7 kell, és működik.
- **K2:** a tőre keresve („park”) a „legalább 10 találat vagy mind” (A) 47–72%, **(C) 91–96%** — a magyar toldalékolás
  miatt az egész szavas kulcs a találatok több mint felét elveszíti. ✅ A (C) megéri a kétszeres tárolást.
- **Két szavas kérdés:** 96–100%-ban a ritkább szó fiókja kicsi — egy helyről teljes válasz.
- **A tartók és a késés:** régiónként ~8–12 tartó; az első válasz 1 perces körrel medián 1 perc, 99% 11–14 perc.
- **K3:** a tartó a régiója ~1240 szerzőjét látja — a tagság-gyorsítótára ennél nagyobb legyen (**4096**: 30 naponként
  ~5% új szerző, ~41 KB/nap). Az új tartó első kitöltése a közös ősökkel ~8,4 MB (egymillió gondolat, 100 ezer tag) — a
  ④-ben a háttérben, a tagsági kísérők gépével, nem egyszerre.
- **K4–K5:** a felajánlás ~90 KB gondolatonként (felső becslés); a megújítás „soros” újítóval ~15–17 KB/nap/készülék; a
  legnagyobb állandó tétel a régió hirdetése a DHT-n (~650 KB/nap, mint a gyökér-darabé).

⏭️ **A sorrendből:** ① ✅ · ② ✅ a szó és az index-darab (2026-10-16 — `keresoReteg.js`: a szavak, a kulcsok, a szűrő, az
osztódás, a régiók; a darab-számítás közös a gyökérrel) → ③ a tartás és a hirdetés → ④ a felajánlás (a tagság a
háttérben; előtte a 10. szakasz kérdése) → ⑤ a kérdés → ⑥ a halványulás → ⑦ a modál.

## 10. ✅ A MÓDOSÍTOTT CÍM — K9 (D105, 2026-10-16): az (A)

> Csaba: *„A módosított címre legyen az (A): a tulajdonos a születést a címet adó javaslattal ajánlja fel, a kérdező a találat után ellenőriz.”*

**A kérdés.** A bejegyzés a gondolat születése (`GondolatLetrehozas` — aláírt, a címmel): a tartó maga ellenőrzi, hogy a
cím tartalmazza a szót. De a címet egy elfogadott szerkesztési egyezmény (módosítás, egyesítés) átírhatja
(`szerkesztesiVegrehajtas.js`), és az új cím nem a születésben áll: a módosítási javaslat hordozza (aláírva), az
ELFOGADÁSA viszont számított (D17) — egyetlen aláírt esemény sem mondja ki, hogy a javaslat nyert.

⭐ **Pontosítás (Csaba kérdésére, 2026-10-16):** a TULAJDONOSOK készülékén a gondolat címe a lezárás után az új — a
számítás (a szerkesztési végrehajtás) rávezeti az entitásra, mert náluk megvan a döntés minden bemenete (a gondolat és a
javaslat szelete, a szavazatok). Új esemény nem születik (a tár csak hozzáfűz — a cím a számításból jön). A kérdés tehát nem
az, hogy KI tudja az új címet — a tulajdonosok tudják —, hanem hogy a kereső TARTÓJA (egy véletlen készülék a szó régiójában,
ami a gondolat szeletét nem tartja) hogyan ellenőrizze. Kiszámolni nem tudja (ahhoz a döntés összes bemenete kellene),
csak az aláírásokat látja. ⭐ Ezért illik ide az (A): a felajánló és a 30 naponkénti megújító a tulajdonos (K4–K5), aki a
mai, számított címet ismeri — ő ajánlja fel a születést a címet adó javaslattal; a régi cím bejegyzését többé nem újítja,
így az 30 nap alatt elhalványul.

- **(A) ⭐ A bejegyzés a születés + a címet adó javaslat; a tartó az elfogadást NEM ellenőrzi, a kérdező a találat után igen
  — ezt javaslom.** A tartó ellenőrzi az aláírásokat, hogy a javaslat erre a gondolatra szól, és hogy a (javasolt) cím
  tartalmazza a szót; a kérdező a találatot elkéri, és a gondolat VALÓDI, számított címével szűr (a kereső a MEGTALÁLÁS
  rétege, nem dönt semmiről — D105, 5.7). A régi cím a megújításkor kiesik (K5: a tartók a MAI címet újítják, 30 nap). Ára:
  egy el nem fogadott javaslat címe is felkerülhet, ha valaki felajánlja — a K3 (két tag-tulajdonos) és a kérdező szűrője
  fogja meg.
- **(B) Csak a születés címe** — egyszerű, de az átnevezett gondolat az új nevén soha nem található meg.
- **(C) A bejegyzés mellé a döntés bizonyítéka** (a lezárási összegzés — D95/1) — pontos, de drága (60–70 KB döntésenként,
  67. mérés), és csak a nagy szeleteknél van ilyen.

## 11. ✅ A ③–④ átvizsgálása — a tartás, a hirdetés és a felajánlás (2026-10-16) — D107: mind (A)

> Csaba: *„Az L1–L4 javaslataidat elfogadom, mehet a ③.”*

> A ② után, építés előtt. A ③ (a tartás és a hirdetés) és a ④ (a felajánlás) összefonódik: amit a tartó tart, azt valaki
> felajánlotta, és amit a tartók egymás közt egyeztetnek, annak a lejárata is utazik. Négy kérdés D-szintű (L1–L4), Csabáé.

**Ami a kódból kiderült.** (1) A csak küldő út (`osszegzoTartas.js` `sajatKuldo`) ma csak a SAJÁT eseményeimet ajánlja fel
— a kereső-bejegyzést viszont a gondolat TULAJDONOSA ajánlja fel (K9), aki nem feltétlenül a szerző, és nem egy eseményt,
hanem egy CSOMAGOT: a születés + a címet adó javaslat (K9) + két tag-tulajdonos pont-eseménye (K3). (2) A gyökér-darab
(D95/4) születései a tartós tárban élnek (a tömörítés megtartja őket) — de ott csak születések vannak, pont-események nem. Ha
a kereső-csomag pont-eseményei a tartós tárba kerülnének, a saját állapotom egy NEM tartott gondolatra részleges össz-pontot
számolna (két tulajdonos pontját látná, a többit nem). (3) A régió tartói a DHT-n a régió témáján találhatják meg egymást, és
a változást a raj kör (D97/2) viheti körbe — ha a régió kulcsa a raj-jegyzékben szelet-kulcsként szerepel. (4) A K5 (30 napos
halványulás) és a raj együtt egy rést nyit: ha a tartók egymásnak adják a bejegyzéseket, egy lejárt bejegyzés egy másik
tartótól visszajöhet — a „temető” (5.7) a hátsó ajtón.

**L1. Hol élnek a bejegyzések a tartónál?**
- **(A) ⭐ Külön KERESŐ-TÁRBAN — ezt javaslom.** Puha állapot: a koinó állapotába nem számít bele (a csomag pont-eseményei nem
  torzítják a saját számításomat), korlátos és eldobható (mint az átmeneti tár — B/2), és UGYANAZON A KAPUN át íródik
  (`esemenyMentese` a tár három műveletével — 3. szabály). A lejárat helyi feljegyzés mellette.
- **(B) A tartós tárban, megtartási szabállyal** (mint a gyökér-darab születései): a csere bekötése egyszerűbb, de a
  csomag pont-eseményei a saját állapotomban részleges össz-pontot adnának.

**L2. Hogyan egyeztetnek a régió tartói?**
- **(A) ⭐ A cserében, a régió kulcsa alatt — ezt javaslom** (a gyökér-darab mintája: a NYITÁS-ban egy rövid jel — becslés
  +60–100 B egy cserén, mérendő —, a vonal a régió kulcsánál a kereső-tárat olvassa és írja). A régió társait a DHT-n a
  régió témáján találják meg (a hirdetés — a ③), és a változást a raj kör viszi körbe (a régió kulcsa a raj-jegyzékben). A
  tartomány-egyeztetés miatt csak a KÜLÖNBSÉG utazik.
- **(B) A kérelemmel** (a régió egészét kérik egy társtól): a vonalhoz nem kell nyúlni, de minden alkalommal az egész régió
  utazik (~1000 csomag, ~2–3 MB).

**L3. A halványulás a rajban — hogy ne jöjjön vissza a lejárt bejegyzés**
- **(A) ⭐ Aláírt megújítás — ezt javaslom.** A tulajdonos 30 naponként egy kis ALÁÍRT megújítást ad a bejegyzéshez (a
  bejegyzés azonosítója + az idő — nem esemény, a láncát nem növeli; a tábla-bejegyzés mintája). A bejegyzés az utolsó
  megújítása után 30 nappal lejár — BÁRKINÉL, akármelyik tartótól jött is; a tartók a megújítást a bejegyzéssel együtt adják
  tovább. A jövőbe dátumozott megújítást (a tartó saját órájához képest több mint egy nap) a tartó elveti. A „soros” (K5)
  egyben ez az aláíró.
- **(B) Aláíratlan átvételi idő** (a tartó a saját órája szerint, és a társának is megmondja): egyszerűbb, de egy hazug
  tartó a végtelenségig életben tarthat egy bejegyzést — a „temető” visszajön.
- **(C) Nincs raj** (a tulajdonos minden tartónak maga ajánlja fel): nincs rés, de a felajánlás ára a tartók számával
  szorzódik (~12×).

**L4. A felajánlás útja (④)**
- **(A) ⭐ A kérelem gépén, egy új fajtával — ezt javaslom** (`FELAJANLAS`): a tulajdonos a régió tartóit a DHT-n keresi és
  bekopogtat (a függő kérelem gépe — D92/1, K4), és átadja a csomagot (a születés, a címadó javaslat, a két pont-esemény, a
  megújítás; a tagsági kísérőket a tartó kéri, ha kell — D95/2). A tartó mindent ugyanazon a kapun ellenőriz, és a
  kereső-tárába teszi; ha a fiók osztódott (K7), ezt kimondja, és a felajánló a darab régiójába viszi.
- **(B) A csak küldő út kiterjesztése** a mások eseményeire: a csere minden körében utazna egy újabb lista — a „nincs
  újdonság” csere drágulna, pedig a felajánlás ritka (gondolatonként egyszer, aztán 30 naponként).

⭐ **A sorrend a döntések után:** ③ a kereső-tár, a régió részvétele a cserében és a hirdetés (L1, L2) → ④ a felajánlás és a
megújítás (L3, L4) → ⑤ a kérdés → ⑥ a halványulás (a lejárat a kereső-tárban — az L3 szerint) → ⑦ a modál.

## 12. A ③ építésének alakja (2026-10-17) — és egy rés, ami a gyökér-darabot is érinti (K10, Csabáé)

> A D107 után, építés előtt, a kódból (a vonal, a gyökér-darab, az átmeneti tár). Az alak a megvalósításé (az L1–L2
> szerint); egy kérdés D-szintű (K10).

**A régió halmazának egysége: a BEJEGYZÉS, nem az esemény.** Egy bejegyzés = egy gondolat EGY fiókban:
`{ k: a fiók kulcsa, s: az osztódás mélysége, g: a gondolat, esemenyek: [a születés, a címadó javaslat (K9, ha van), a
pont-események (K3)], m: a megújítás (L3 — a ④-ben) }`. A régió halmazának eleme a bejegyzés AZONOSÍTÓJA — a tartalmának
lenyomata (a fiók, az osztódás, a gondolat, az események azonosítói, a megújítás). Miért nem az események azonosítói:
(1) egy gondolat több fiókban él (≤ 32 kulcs) ugyanazokkal az eseményekkel — a fiók és az osztódás a bejegyzésé, nem az
eseményé, és ettől függ, melyik régióba esik; (2) a megújítás nem esemény (L3), az esemény-halmaz nem látná; (3) a fogadó
egy pont-eseményről (címe nincs) nem tudná, melyik régióba tartozik. ⭐ A megújított vagy bővült bejegyzés így ÚJ elem: a
tartó gondolatonként és fiókonként a legfrissebbet tartja, a régi kiesik — a különbség után a két tartó ugyanazt tartja.

**A vonalon (a gyökér-darab mintája — D95/4):** a NYITÁS `kd` jele (`m:l1:l2:l3`, mint a `gyd`; a társ a régióim kulcsait a
tábla-aláírómból számolja); a legsekélyebb közös eltérő régió az eltérők közé kerül, a tartomány-egyeztetés a
bejegyzés-azonosítókon fut, az átadás `BEJEGYZES` üzenettel (a teljes bejegyzés, a keret maradékáig — D109). A fogadó a
KERESŐ-TÁRBA teszi: minden esemény ugyanazon a kapun (`esemenyMentese` a kereső-tár három műveletével — 3. szabály), és a
bejegyzés alakja ellenőrizve (a `k` a cím kulcsa — a születésé, vagy a javaslaté —, a hely a közös régióba esik, a
pont-események erre a gondolatra szólnak, pozitívak, különböző szerzőktől). ⏸️ A tagság (K3) a ④-ben, a tagsági kísérők
gépével (gyorsítótárral — 75. mérés: 4096 szerző).

**A kereső-tár (L1 (A)):** `<koino>/kereso/` — a bejegyzések hozzáfűzhető fájlban, tömörítéssel; korlátos és eldobható
(ami kívül esik a régióimon — a mélység változott —, és a ⑥-tól a lejárt); a koinó állapotába NEM számít (a csomag
pont-eseményei nem torzítják a saját számításomat).

**A hirdetés és a társak:** a saját régióm témája (`keresoRegioTemaja`) a hirdetett témák közé (a kopogtató párja
magától); a régióm témáján a DHT-n talált címek a kör céljai közé, és a csere után a raj-jegyzékben a régió kulcsa alatt
(a `RESZVETEL` `vallal`-jában); a változott régiót a raj kör viszi körbe (D97/2).

**A kézi út (4. szabály):** `kereso kivisz <fájl>` / `kereso behoz <fájl>` (a bejegyzések, ugyanazon a kapun), és a
`kereso` parancs (a régióim, hány bejegyzés, mekkora).

**A sorrend:** ③a a kereső-tár, a kézi út és a parancs → ③b a régió a cserében → ③c a hirdetés és a raj.

✅ **③a KÉSZ (2026-10-17):** `js/tar/keresoTar.js` (a bejegyzés alakja, azonosítója, tartalma, az építő, a tár — korlátos, tömöríthető, más folyamat írását a `frissit` olvassa), a `koino.js` `kereso` parancsa (`felajanl` — a gondolataim bejegyzései a főkönyv nyertes pont-eseményeivel, a mai címmel —, `behoz`, `kivisz`). Próbák: `keresoTarProba.js` (11, mind rontással) és a kézi út parancssor-próbája (négy készüléken: felajánlás → behozatal → továbbadás → behozatal, a hamis fájl a kapun bukik, a kereső-tár a koinó állapotába nem számít — három rontással). Elágazás 166.

✅ **③b KÉSZ (2026-10-17) — a régió a cserében:** a NYITÁS `kd` jele, a legsekélyebb közös eltérő régió, a halmaz a
bejegyzés-azonosítókon, a `BEJEGYZES` átadás, a fogadó a helyet maga számolja és a kapun vesz fel (`vonal.js`); a `koino.js`
a kereső-tárat és a mélységet adja a cserének. Próbák: `keresoRegioProba.js` (7, valódi UDP-résen — mind rontással; a
közös régió határát két védvonal fogja: a halmaz és a fogadó) és egy valódi `figyel` + `csere` kör (D kereső-tárába átjön,
a tartós tára üres marad). A „nincs újdonság” csere ára: a jel +11–46 B nyitásonként (számolva). Elágazás 167.

✅ **③c KÉSZ (2026-10-17) — a hirdetés és a raj:** a régió témája a hirdetett témák közt; a címjegyzék-körben a régió többi
hirdetője (≤ 4) a kör céljai közé kerül; a raj a régió kulcsát is vállalja és jegyzi, a változott régiót a raj kör viszi
körbe. Próba: két őrjárat egy hamis DHT-n, társ-felvétel nélkül — D a régió témáján megtalálja C-t, és az öt bejegyzés
átjön; a raj-jegyzékben C a régió kulcsa alatt (két rontással). Elágazás 168.

⏭️ **A ③ kész. Következik a ④** (a felajánlás a kérelem gépén — `FELAJANLAS`, L4 — és az aláírt megújítás, L3); előtte a
K10 döntése (az új készülék mélysége), mert a felajánló a mély témán keresi a tartókat.

### ✅ K10. Honnan tudja egy ÚJ készülék a mélységet? — D110 (Csaba, 2026-10-18): az (A2)

> Csaba: *„rendben. elfogadom a javaslatodat, mehetünk tovább”* — és a pontosításra (az (A) „csak amíg kevés” feltétele egy
> hosszan offline készüléket beragasztana): *„(A2) Medián”*. A friss társak mélységének alsó mediánja − 1, legalább két
> társtól, csak mélyebbre, egy nap után elévül; a „kevés” feltétel elmarad. Megépült — a fázis-2 terv D110-e, elágazás 169.

**A rés.** A mélységet (a gyökér-darabét és a kereső-régióét is) a készülék a SAJÁT darabjából becsüli: a darabjában ismert
elemek × 2^mélység (`melysegBecslese`). Egy új (vagy „alap”, kevés vállalású) készülék darabja üres → a becslése 0 → a
régiói a 0. és az 1. szinten vannak. Egy nagy koinó tartói viszont mélyen (m ~ 10): közös kulcsuk nincs, tehát a cserében
SOHA nem egyeztetnek — az új készülék a régióját nem tölti fel, a felajánló a mély témán nem találja meg. ⚠️ A gyökér-darabnál
ugyanez a rés áll (D95/4): egy kis koinóban (m ≤ 1) nem látszik, a próbák ott futnak; egy nagyban egy új „alap” készülék a
gyökér-darabját a cserében nem kapja meg (a kérelem és a bejáró hozza, de az átmeneti tárba). A 9. szabály kérdése: *ez mit
csinál egymilliárd e-embernél?* — a darab-elosztás nem indul el.

- **(A) ⭐ A társtól tanul, de csak MÉLYEBBRE, és csak amíg a saját darabja kevés — ezt javaslom.** A NYITÁS jeléből (a `gyd`
  és a `kd` mélysége) a készülék megjegyzi a társak mélységét; ha a saját becslése a célnál (~256 / 512) jóval kevesebből áll,
  a mélysége legalább a legalább KÉT különböző társtól látott legnagyobb mélység − 1. Egy hazug társ így legfeljebb
  mélyebbre tolhat (kevesebbet tartok — a többi tartó fedez, és a saját adatom mélyebben is jó), sekélyebbre nem (az a
  nagyobb teher lenne); a tanult mélység elévül (egy nap), ha nem erősítik meg. Ugyanaz a szabály a gyökér-darabra és a
  kereső-régióra (egy helyen). Ára: néhány bájt helyi feljegyzés, a vonalon semmi (a jel már ott van).
- **(B) A DHT-ből keres:** a készülék a saját helyének témáit több mélységen megkérdezi, és a legmélyebbet veszi, ahol van
  hirdető. Független a társaktól, de mélységenként egy DHT-keresés (~3 KB), és a hirdetők számából nem következik a mélység.
- **(C) Marad a mai** (a saját darabból): a rés áll, és a nagy koinóban a darab-elosztás egy új készüléken nem indul el.

## 13. A ④ építésének alakja (2026-10-18) — a megújítás, a tagság, a felajánlás

> A D110 után, építés előtt, a kódból. Az alak a megvalósításé — az L3, L4, K3, K5, K7 döntésein belül; új D-szintű kérdés
> nem merült fel.

**④a — az aláírt megújítás (L3) és a lejárat (a ⑥ magja).** A megújítás egy kis aláírt állítás, nem esemény (a láncot nem
növeli): `m = { szerzo, ido, alairas }` — az aláírás a gondolatra és a csomag eseményeinek azonosítóira szól az idővel
(`{ koino, g, e, ido }`), a fiók és az osztódás NÉLKÜL: egy aláírás a gondolat minden fiók-bejegyzését megújítja (egy cím
≤ 32 kulcs — nem 32 aláírás). Az aláíró a csomag egyik TULAJDONOSA (egy pont-esemény szerzője), a személyes kulcsával. A
tartó elveti: a nem tulajdonos aláírását, a hamisat, és a saját órájához képest egy napnál jövőbelit. ⭐ A lejárat BÁRKINÉL
ugyanaz: a megújítás ideje (vagy, ha nincs, a csomag legfrissebb eseménye) + 30 nap — a lejárt bejegyzés a kereső-tárból a
tömörítéskor kiesik, és a cserében nem jön vissza (a társnál is lejárt). A megújított bejegyzés új elem (az azonosítója a
megújítást is fedi), fiókonként a frissebb marad. **A soros (K5):** a csomag tulajdonosai közül az újít, akit a gondolat és a
30 napos időszak lenyomata a sorban elsőnek tesz — ha az időszak 25. napjáig nem látszik megújítás, a következő is. A
megújító a MAI csomagot építi újra (a mai címmel, a mai nyertes pont-eseményekkel — K9).

**④b — a tagság (K3).** A bejegyzés csak akkor kerül az INDEXBE (a kérdés csak ilyet ad vissza), ha a születés szerzője és a
két tulajdonos ellenőrzött tag. Amíg nem tudjuk, a bejegyzés FÜGGŐ: a kereső-tárban egy korlátos részben (a korlát ~tizede),
és ha a hely kell, előbb a függő megy — így a nem tag (ingyen kulcsú) szerzők nem szoríthatják ki a valódiakat. A tagság a
tagsági kísérők gépével jön (D95/2): az új bejegyzések szerzői a függő tagság-kérdések közé kerülnek, a csere tagsági köre
elhozza a csomagjukat; a tartó szerzőnként jegyzi az ellenőrzött tagokat (75. mérés: 4096). A régió cseréjében a társ a
függőt is megkapja (ő maga ellenőriz).

**④c — a felajánlás (L4).** A kérelem gépén, új fajtával: `KERELEM { fajta: 'felajanlas', bejegyzesek }` → a tartó a
kereső-tár kapuján veszi fel (ugyanaz, mint a cserében: a hely a régióiba esik, a csomag a kapun, a megújítás ellenőrizve), és
megmondja: hányat vett fel, és mely fiók OSZTÓDOTT (K7 — a fiók a nálam lévő része meghaladja a 256-ot → `{ k, s }`); a
felajánló az osztódott fiókot a darab régiójába viszi újra (`bejegyzesHelye(k, g, s)`), és az osztódást megjegyzi. A
felajánló a tulajdonos: a gondolatai bejegyzéseit (a kézi út építője) a fiók helye szerint régiókba osztja (a mélység a
`keresoRegioim` szerint — D110-zel), a régió témáján a DHT-n keres tartót, és függő kérelmet vesz fel (a kopogtatás: a
régió témájának párja). Egy régióban EGY tartó elég — a régió többi tartójához a ③b viszi. Mikor: új gondolatnál (ha már két
tag-tulajdonos van), a cím változásakor, és a soros megújításkor; a felajánlások jegyzéke helyi (`felajanlasok.json`). A
kiszolgálási keret (D109) a felajánlást is méri (kérés).

**A sorrend:** ④a (a megújítás és a lejárat) → ④b (a tagság) → ④c (a felajánlás). Utána ⑤ a kérdés, ⑦ a modál.

✅ **④a KÉSZ (2026-10-18):** `js/tar/keresoMegujitas.js` (a megújítás elkészítése és ellenőrzése, a lejárat, a soros-rend),
a kereső-tár ellenőrzi a megújítást, a lejártat nem veszi fel és nem adja tovább (a régió halmazából kimarad), a tömörítés
és a megnyitás eldobja; a frissesség a megújítás ideje; a kézi felajánlás a megújításommal megy; az őrjárat óránként
tömöríti a kereső-tárat. Próbák: `keresoMegujitasProba.js` (6), `keresoTarProba.js` (+1, a megújítás és a lejárat — a
„frissebb nyer” egy olyan párral is, ahol a frissebbnek a nagyobb az azonosítója, hogy a holtverseny-döntő ne takarhassa el),
`keresoRegioProba.js` (+1: a lejárt a rajból sem jön vissza), és a kézi út (a felajánlás minden sora megújítással — két
rontással). Elágazás 170.

✅ **④b KÉSZ (2026-10-18):** a kereső-tár a tagság-ellenőrzőt kívülről kapja (a `koino.js` tagsági kérdezője); a nem
ellenőrzött szerzőjű bejegyzés FÜGGŐ (nem megy tovább, a korlát tizedéig, helyhiánynál előbb ő esik ki); a csere után és a
`kereso` parancsban a függők újraértékelődnek; a kézi út fájlja a tagsági kísérőket is viszi. A ③b-ben a postaláda a
szerzők tagságát ugyanabban a cserében a tagsági körrel kapja meg — a bejegyzések nála az indexbe kerülnek (a lemezen mérve).
Közben javítva: a kereső-tár újraírása generáció-jelet ír (egy azonos hosszú újraírást a másik folyamat nem látott). Próbák:
`keresoTarProba.js` (+3, és a `frissit`-próba az azonos hosszú újraírással), a kézi út (+1 készülék: kísérők nélkül függő), a
③b (a lemezen az index) — mind rontással. Elágazás 171.

✅ **④c KÉSZ (2026-10-18) — a ④ kész:** `js/csere/felajanlas.js` (a régiónkénti csoportok a kimondott osztódások szerint, a
felajánlottak jegyzéke, a megújítás újrahasznosítása), a kérelem `felajanlas` fajtája (`kerelem.js`, `vonal.js` — a tartó
válasza az osztódással), a kiszolgáló (`koino.js` — a kísérők a kapun, a bejegyzések a kereső-tár kapuján, a régióim szerint, az
osztódás a hely méretéből), a felajánló három útja (közvetlenül, automatikusan az őrjárat címjegyzék-körében — a régió
hirdetői a függő kérelem céljai, a kopogtató a régió témájának párja —, és fájlban). Próbák: `felajanlasProba.js` (6),
`kerelemProba.js` (+2: az alak és a menet a védett résen), és két bekötés-próba (közvetlenül: a kísérőkkel az indexbe, az
osztódás után a mélyebb darabba; automatikusan: két őrjárat egy hamis DHT-n, társ-felvétel nélkül) — mind rontással.
Elágazás 172. ⏭️ **Következik az ⑤ (a kérdés)**, aztán a ⑦ (a Keresés ablaka a hálózati találatokkal).

## 14. ✅ Az ⑤ — a kérdés (2026-10-18)

> A ④ után. Az alak a K1, K2 (C), K3, K7, K9 döntésein belül; új D-szintű kérdés nem merült fel.

**A terv** (`js/csere/kereses.js` `kerdesTerve`): a kérdés szavai a LEGHOSSZABBTÓL (a hosszabb szó jellemzően ritkább — a
K7 „a legritkább szóhoz megy”-ének olcsó becslése; a válaszból derül ki, ha a fiók mégis nagy); a szó fiókja a ≥ 4 jelesnél
a SZÓELEJE (`p:` — teljes a toldalékos alakokra), a háromjelesnél az egész szó. A tartó a TELJES kérdésre szűr, tehát egy nem
osztódott fiók válasza teljes — ott megállunk; az osztódottból 2 darabot kérdezünk (a minta — K7), és a következő szóra
lépünk. **A menet:** a kérelem `kereses` fajtája (a hely — fiók, mélység, darab — és a kérdés); a tartó a hely indexelt
bejegyzései közül a kérdésre illőket adja (a legfrissebbek elöl, ≤ 50), a szerzők tagsági kísérőivel, a hely méretével és
az osztódással. **Az ellenőrzés** (3. szabály): a kérdező maga ellenőriz — a kísérőket a kapun, a találat alakját,
tartalmát, a helyét és a szűrőt (`talalatokEllenorzese`), a szerzők tagságát a saját tudásából (a nem ellenőrizhetőt
kihagyja, kimondva — K3); a csomagot az ÁTMENETI tárba teszi (a kártya megnyitható); a javasolt címet kimondja, és ha a
gondolatot ismeri, a valódi címével is szűr (K9). **A tartó:** közvetlenül (`kereso keres "<kérdés>" <cím> <port>`), vagy a
DHT-n a régió témáján (cím nélkül). ⏸️ A NAT mögötti tartóhoz a kérdés függő kérelemként (az őrjárat viszi) a ⑦-tel jön: a
felület várja meg a választ.

**Próbák:** `keresesProba.js` (5 — a terv, a tartó szűrője, a kérdező ellenőrzése, K9, a minta; mind rontással — három
próba-gyengeség megerősítve: egy-egy rontást egy másik szűrő elfedett), `kerelemProba.js` (+2: az alak és a menet a védett
résen), és két bekötés-próba (közvetlenül: a találat ellenőrizve az átmeneti tárba, kísérők nélkül kihagyva; a DHT-n talált
tartónál) — öt rontással. Elágazás 173.

**⑥ a halványulás** a ④a-val megépült (a lejárat bárkinél ugyanaz, a lejárt a tömörítéskor kiesik, a rajból sem jön vissza).
⏭️ **Hátravan a ⑦:** a Keresés ablaka a hálózati találatokkal (a helyi alja után a hálózatiak; a NAT mögötti tartóhoz a függő
kérelem útja).

## 15. ✅ A ⑦ — a Keresés ablaka a hálózati találatokkal (2026-10-18)

> Az ⑤ után. A D101 ⑤ helyi alja (a modál bájtra a prototípusé) a hálózati találatokkal; új D-szintű kérdés a megépítésben
> nem merült fel — a ⑦ egy hiányt tett láthatóvá (16. szakasz).

**⑦a — a háttérben.** A lap nem várhat a hálózatra: a `/api/kereses` a helyi találatokkal azonnal felel, és a háttérben
elindítja a hálózati kérdést (`koino.js` `halozatiKereses` — kérdésenként egyszerre egyet, a kész eredmény két percig él,
legfeljebb 64 kérdés). A találatok az ÁTMENETI tárba kerülnek (az ⑤ útja), így a lap következő kérdésére a HELYI listában
vannak — a modál saját rajzolója rajzolja őket, külön kód nélkül. A `betoltes` jel szól a lapnak (`koinoModalok.js`: a
`koino:megjegyzes` eseményből — csak ha ugyanarra a kérdésre szól), és a megjegyzés kimondja az állást: *„— és a hálózaton is
keresem…”* · *„nem találtam a kérdéshez tartót”* · *„N tartót kérdeztem, egy sem válaszolt (NAT mögött lehetnek)”* · *„a
hálózatról N találat jött (… tartótól; ha a szó nagyon gyakori, a válasz minta)”*, és ha a tagság miatt kimaradt valami.

**⑦b — a NAT mögötti tartó.** Ha a DHT-n talált tartók közül egy sem felel, a kérdés FÜGGŐ KÉRELEM lesz
(`keresesFuggoFelvetele`): a célok a tartók, a kopogtató a régió témájának párja (a tartó a címjegyzék-körében ott látja,
hogy kérnek tőle, és felém kopog), és a kérdés a kérelem része (`fuggoKerelmek.js` `ker` — egy régióban több kérdés is
függhet). Az őrjárat munkája futtatja (ugyanaz az ellenőrzés, mint a közvetlen kérdésnél; az osztódott fiók mintája újabb
függő kérelem a mélyebb hely régiójának párján). A lap egyre ritkábban figyel (2 mp-cel kezdve, legfeljebb fél percenként,
~17 percig), és amíg a kérdés függ, a felület nem kérdez újra; a megjegyzés kimondja, hogy az őrjárat viszi tovább — vagy
hogy nem fut, és így most nem megy tovább —, és amit hozott (*„Az őrjárat a NAT mögötti tartóktól N találatot hozott.”*).

**Próbák:** két bekötés-próba egy VÉGIG FUTÓ felülettel a hamis DHT-n (⑦a: a háttérben, a találat a helyi listában — három
rontással; ⑦b: C hirdet, leáll, D keres → függő kérelem → C újraindul → D őrjárata elviszi, a felület mutatja — négy
rontással), `kerelemProba.js` (+1: a kérdés a kérelem része — két rontással). A lap oldalát (az újrakérdezés) a beépített
böngészőben néztük meg: a közvetlen esetben az első kérdés üres listát ad, a 2 mp-es újrakérdezés már a két találatot; a
NAT-os esetben a nyitott ablak magától frissült, amikor az őrjárat a találatokat elhozta. Elágazás 174.

## 16. ✅ K11 — a megtalált gondolat tartói (D111, 2026-10-18 — Csaba: „(A) Tartó-tipp”)

**A lelet** (a ⑦ böngészős próbájában): a találat egy bejegyzés — a születés (a címmel) és legalább két tulajdonos
pont-eseménye. A kártya megnyílik (a cím, a tulajdonosok, a pontok), de a többi része — a szöveg (a szöveg-darab), a
gyerekek, a javaslatok — a gondolat SZELETÉNEK tartójától jönne, és egy friss készülék ma nem éri el: a raj-jegyzéke semmit
nem tud róla; a szelet DHT-témáját csak az hirdeti, aki ezt beállította (`cimjegyzek hirdetes <n>` — a D91/3 szerint
**alapból 0**, mert egy telefonon 100 szelet ~65 MB/nap volna); a lap függő kérelmének kopogtatója a szelet témájának párja,
amit csak a hirdetők figyelnek. A felület ki is mondja: *„a hiányzó részek tartóit még keresem (nincs ismert társ, aki
tartaná őket)”*. Vagyis alapbeállítással a kereső-réteg megtalálja a gondolatot, de a részleteihez csak szerencsével jut el
(ha a készülék később egy tartójával cserél). ⚠️ Ez nem csak a keresés kérdése: a `hozd` és a lap is ugyanígy jár egy olyan
gondolattal, amelynek a tartóit a raj nem ismeri — a keresés teszi gyakorivá.

**A lehetőségek:**

- **(A) ⭐ A tartó-tipp a találattal — ezt javaslom.** A kereső tartó a bejegyzés mellé megjegyzi, melyik KÉSZÜLÉK ajánlotta
  fel (a tábla-aláírója — a felajánlás kérelme ma is hozza, D109; a felajánló a gondolat tulajdonosa, tehát a szeletét
  vállalásból tartja), a régió tartói közt a `BEJEGYZES` is viszi (csak tippként). A válasz találatonként legfeljebb 2 tippet
  ad (tábla-aláíró, CÍM NÉLKÜL). A kérdező a raj-jegyzékébe írja a gondolat szelete alá, és a lap függő kérelme így
  `keszulek` kopogtatót kap: a tulajdonos készüléke a címjegyzék-körében a saját kopogtató témáját figyeli, meglát, és felém
  kopog — a NAT mögött is (a D92 fő útja). **Ár:** ~45 bájt találatonként, új DHT-téma nincs. **Bizalom:** a hamis tipp
  elérhetetlenség, nem hamisítás (D6, 3. szabály). **Ami kiderül:** a kérdező megtudja, hogy a tulajdonosok egyikének
  készüléke a T tábla-kulcsot használja (személy ↔ készülék) — ugyanazt, amit bárki megtud, aki vele cserél; cím az indexben
  nem utazik. Mindkét tulajdonos felajánl, tehát két tipp van; ha egy készülék eltűnik, a következő felajánlás frissít.
- **(B) A kereső-indexben lévő gondolataim szeletének hirdetése** a DHT-n (a meglévő `hozd`-út találja meg a tartót): a
  kérdezőnek a legegyszerűbb, de témánként ~0,65 MB/nap MINDENKINEK — 10 gondolatnál ~6,5 MB/nap; a D91/3 épp ezt kapcsolta ki
  (legfeljebb néhány gondolatra korlátozva enyhíthető).
- **(C) A kereső tartó továbbadja** (D92/1 (c)): a kérdező a szeletet a kereső tartótól kéri, aki a felajánlóhoz továbbítja
  (a kopogtató témáján), és a választ `VALASZ`-ként hozza vissza. A címek egyik irányban sem derülnek ki (D87), de a kereső
  tartó kerete terhelődik, neki is elérhetőnek kell maradnia a visszaútig, és lassabb.
- **(D) Semmi:** a keresés a kártyát adja (cím, tulajdonosok, pontok), a részletek csak akkor, ha a készülék máshonnan
  eléri a tartót. A keresés így alapbeállítással félkarú marad.

**A javaslat (A)**, mert a D92 fő útjára (a kopogtatásra) illik, az ára találatonként néhány bájt, és a bizalmi modell nem
változik; a (C) a magánszféra szempontjából erősebb, de drágább és törékenyebb.

✅ **D111 — az (A) megépült (2026-10-18).** A kereső tartó a felajánlás kérelmének ELLENŐRZÖTT tábla-kulcsát jegyzi a
gondolat mellé (`keresoTar.js` `tippFeljegyzese` — gondolatonként ≤ 4, 30 nap, külön fájl: a bejegyzés azonosítója a
tartalmáé); a régió tartói közt a `BEJEGYZES` a tippet az idejével viszi (a társ nem frissítheti fel); a kézi út `{ tipp }`
sorokkal. A válasz gondolatonként ≤ 2 tippet ad; a kérdező helyben jegyzi (`tartotippek.json` — ⛔ nem a raj-jegyzékbe:
ott ellenőrzött cseréből jött, címes tartók állnak), és a gondolatra szóló függő kérelem a tipp készülékének kopogtató
témáján jelentkezik. **Próbák:** a kereső-tár (+1: a legfrissebb elöl, korlátos, az elévült nem jön vissza, másik megnyitás
is látja, a tömörítés a gondolat nélkülit eldobja — három rontással), a válasz alakja (+1), a régió cseréje (+1: a tipp az
idejével átjön — két rontással), a kézi út (a ⑤ próbájában — két rontással), és a bekötés: A felajánl C-nek, D a DHT-n
talált C-nél keres, a gondolat szeletét cím nélkül kéri, A őrjárata a saját kopogtató témáján meglátja D-t, és kiszolgálja
(D átmeneti tárában A érték javaslata — amit a bejegyzés nem hozott) — öt rontással. ⚠️ **Próba-tanulság:** a „megjött”
önmagában nem bizonyít — a próbában A és D ugyanabban a kereső-régióban hirdet, így régió-társként is egymásra találnak (a
„nem használja a tippet” rontás mellett is megjött); a bizonyíték az, hogy A a SAJÁT kopogtató témáján látta D-t („kérő vár
rám”), ami csak a tippből jöhet. Elágazás 175.
