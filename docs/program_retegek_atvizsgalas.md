# A program rétegei szerinti verziók — átvizsgálás (2026-11-05, kód nélkül)

> **Állapot:** ✅ **D123** (Csaba, 2026-11-06: *„Mindet elfogadom”* — PR1–PR7 a javaslat szerint, a 4. szakasz ⭐ jelű válaszai). 🚧
> Az építés: ✅ ① PR1–PR3 (a 6. szakasz) → ② PR7 → ③ PR6 → ④ PR5 → ⑤ PR4.
>
> **A kérdés (Csaba, 2026-11-05):** *„beszéljük át, hogy hogyan lehetne program rétegek szerint, program verziókat létrehozni. pl. a
> megjelenítési módozatok közül, amiket a közösség »feltölt«, szabadon lehet használni, költözés nélkül, gondolom, de ami meglévő
> számításokat is módosítja, az már költözést igényel. jól értem a helyzetet?”*

## 1. A rövid válasz: igen — és ez a D118-ban már így áll

A költözés átvizsgálása (`koltozes_atvizsgalas.md` 4.1, KZ1, KZ4) a változások négy fajtáját különíti el:

- **a felület, a szállítás, egy eredményt nem érintő javítás** → egyszerű programfrissítés, költözés nélkül (ilyen az M5–M8);
- **a számítás változása** — és minden hibajavítás, ami egy eredményt megváltoztat (KZ4 (A)) — → költözés egy gyermek koinóba (különben
  a régi és az új program ugyanabból más állapotot számol: a 15. mérés néma kettéhasadása);
- **egy szabály-paraméter** (a tudatpont-keret, a küszöbök alapértéke…) → új koinó, ugyanaz a program (a szabályok a születésben, D118/2);
- **a protokoll-törés** → ugyanaz a koinó, de átmeneti szabály kell rá (KZ5 — nyitva hagytuk).

A gond tehát nem az elv, hanem hogy **a program ma nem rétegzett**: egyetlen csomagként van megnevezve, telepítve és összevetve.

## 2. A mai helyzet (mérve, 2026-11-05)

- **A program neve a TELJES csomag** (`kodCsomag.js`): a `koino/` mappa minden git-követett fájlja — ma 358 fájl / 6941 KB, ebből a
  felület 162 fájl, a próbák (`meres/`) 113, a telepítő szkriptek (`termux/`, `windows/`) és a README is. A gyermek születése ezt nevezi
  meg (`program`), és a lap ezzel veti össze a futó programot (`programVerzioja`). Ezért írta ki a lap októberben, hogy „más
  programverzió”, amikor csak a felület különbözött — és ma egy próba-javítás is ezt váltaná ki.
- **A számítás magja kicsi.** Ha a magot úgy határozzuk meg, mint annak a két belépőnek az import-zárványát, ami a koinó képét
  (`ketReteg.js` `koinoKepe`) és a kaput (`esemenyTar.js` `esemenyMentese`) adja, az **17 fájl, 383 KB** (~5,5%):
  `allapotSzamitas`, `dontesiCsomag`, `ellentmondas`, `javaslatSzamitas`, `ketReteg`, `koinoLanc`, `lancGyoker`, `lezarasiOsszegzes`,
  `szabalyok`, `szerkesztesiVegrehajtas`, `tagsag` (allapot/), `esemeny`, `kanonikusAlak`, `koinoSzabalyok`, `osszegzoFa`,
  `szovegDarab` (esemeny/), `esemenyTar` (tar/).
- **A mag ritkán változik — most már.** 2026-10-25 óta a `koino/`-t érintő 27 commitból 2 nyúlt a maghoz (a D119 kártya és a D120
  törzs-határ — mindkettő az esemény alakját bővítette); a felülethez 11. 2026-10-01 óta 130-ból 32 (a fejlesztés sűrűjében).
- **A kártya nem telepít.** A koino-verzió kártyán a teljes kód utazik (D119 ①b), de nincs lépés, ami belőle programot rakna össze
  a készüléken.
- **A telepítő sorok nem frissítenek.** A Termux-sor és a Windowsos sor (232.) a már meglévő programmappát kihagyja — a frissítés ma
  a Termuxban a git-es sor, Windowson a mappa törlése és a sor újrafuttatása (az adat a mappán kívül van, megmarad).
- **A protokoll-törésre nincs szabály** (KZ5). A fejlesztés közben „tiszta törésekkel” mentünk (`REGI-PROTOKOLL`), a telefont pedig
  a terepkor frissítettük.

## 3. A rétegek — javaslat

- **R1 — a számítás magja:** a koinó képe és a kapu (a fenti 17 fájl). Egy koinón belül **mindenkinél azonos** kell legyen →
  a változása költözés (D118). Ezt nevezze meg a gyermek születése.
- **R2 — a protokoll:** amit két készülék egymásnak mond (a vonal üzenetei, a kérelem, a titkosítás, a DHT-témák és -rekeszek
  alakja). Nem kell azonosnak lennie, de **érteniük kell egymást** → a változása átmenetet kíván (KZ5), költözést nem.
- **R3 — a helyi viselkedés:** az őrjárat ütemei, a tárak, a vállalás, az értesítés, a felderítés, a kiszolgálási keret… →
  szabadon, készülékenként (az M5–M8 is ilyen volt).
- **R4 — a felület:** a lap és a kiszolgálása (`felulet/`, `pakli.js`, `ter.js`, `kapu.js`) → szabadon; a közösség feltöltött
  nézetei is ide kerülnének — engedély-réteggel (PR4).
- (Nem program: a próbák, a dokumentáció, a telepítő szkriptek — a verzió-összevetésbe nem kellene beleszámítaniuk.)

## 4. A kérdések (⏸️ Csabáé)

- **PR1 — Mit nevezzen meg a gyermek születése?** (A) ⭐ **a mag jegyzékének lenyomatát** (R1) — a többi réteg a koinón belül
  szabadon változhat, és a „más programverzió” csak akkor szól, ha a számítás más; (B) marad a teljes program (ma) — minden felületi
  javítás „más verziónak” látszik, és a pontos verzió-egyezés egy élő közösségben soha nem teljesülne; (C) a mag + egy
  protokoll-verziószám.
- **PR2 — Hogyan legyen meghatározva a mag?** (A) ⭐ **számítva**: a két belépő import-zárványa (nem lehet elfelejteni egy új fájlt
  beírni; egy próba őrzi, hogy a kapu és a kép nem kap kívülről döntő függvényt — a hívó által beadott függvények az import-zárványban
  nem látszanak); (B) kézi jegyzék (egyszerű, de egy kimaradt fájl némán kettéhasíthat — a 15. mérés mintája).
- **PR3 — Mit mondjon a lap az eltérésről?** (A) ⭐ **két szint:** a mag eltérése piros („más számítás — ebben a koinóban mást
  látnál, mint a többiek”), a többi réteg eltérése csak tájékoztatás („újabb felület érhető el”); (B) csak a mag eltérését mondja.
- **PR4 — A közösség feltöltött nézetei (felület-bővítmények).** Egy nézet a te kulcsoddal futna: a lap a helyi kapun át pontot
  tehet, javaslatot írhat, szavazhat a nevedben. A koinót nem veszélyezteti (a számítás nem változik), téged igen. (A) nincs ilyen,
  a felület a programmal jön (ma); (B) ⭐ **olvasó nézetek elsőként:** egy nézet egy kártya (mint a koino-verzió kártya — a kódja
  rajta, a pont rá a közösség jelzése), a lap elszigetelten futtatja (külön keretben, a kapu csak olvasó végpontokat ad neki), és te
  kapcsolod be a saját készülékeden; (C) cselekvő nézetek is, műveletenkénti megerősítéssel (egy nézet „kér”, a lap a saját
  ablakában megmutatja, mit írna alá — később, a (B) után).
- **PR5 — Telepítés a kártyáról (a program P2P-frissítése).** (A) nincs — a git / zip marad (ma; ⚠️ a GitHub egy cím — D30, 2.
  szabály); (B) ⭐ **„telepítés a kártyáról”:** a kártya kód-csomagjából egy új programmappa a régi MELLÉ (minden fájl a lenyomata
  szerint ellenőrizve, a jegyzék lenyomata a kártya `kod`-ja), az e-ember maga indítja, a lap előtte megmutatja, ki tette fel, hány
  pont van rajta és mi változott (rétegenként); a régi mappa megmarad (visszaút), az adat mappán kívül van; (C) automatikus frissítés
  — elvetendő (a D9 önfrissítése helyett van a költözés: *a jelenlét személyes*).
  ⚠️ A lenyomat csak azt bizonyítja, hogy a kód az, amit a kártya megnevez — azt nem, hogy jó. A védelem itt is az éberség (a kód
  olvasható a „Kód” fülön) és a kilépés joga.
- **PR6 — A protokoll-törés (KZ5).** (A) ⭐ **verziózott protokoll:** a NYITÁS kimondja a protokoll-verziót, és az új program egy
  ideig a régit is beszéli (a régi felé a régi alakot küldi); a régit egy kimondott dátumig tartjuk; (B) tiszta törés + mindenki
  frissít (ma — fejlesztés közben elfogadható, egy élő közösségben kettévágja a hálót); (C) a protokoll is a magba (költözés) —
  nem javaslom: a hálózat alakja nem a koinó döntése, és két koinó ugyanazon a protokollon beszél (a családi csere).
- **PR7 — A telepítő sor frissítsen is?** (A) ⭐ **igen:** a Termux-sor `git pull`-lal, a Windowsos sor a zipet a régi mappa mellé
  tölti, és csak a sikeres kicsomagolás után cserél (a futó program leállítása után); (B) külön `koino frissit` parancs (egy sorral
  kevesebb tudnivaló, de még egy dolog, amit el kell mondani).

## 5. A javasolt sorrend (ha a kérdések eldőlnek)

① **PR1–PR3 (a mag)** — a koino-verzió kártya és a költözés ma a teljes programra épül; a mag nélkül minden további réteg
„más verziót” jelezne. Mérés előtte: a mag stabilitása (melyik commit változtatta egy esemény KÉPÉT — nem csak érintette a fájlt; a
fenti 2 / 27 felső becslés). → ② **PR7** (olcsó, és a terepi próbák óta hiányzik) → ③ **PR6** (KZ5 — mielőtt a koinónak élő,
frissíteni nem tudó tagjai lesznek) → ④ **PR5** (telepítés a kártyáról) → ⑤ **PR4** (a feltöltött nézetek — az engedély-réteg a
kapun).

## 6. ✅ Az építés ① — PR1–PR3 (2026-11-06, elágazás 238)

**A mérés előtte (89.):** a mag stabilitása a git-történeten (`koino/meres/magMeres.js` — a program saját `magJegyzeke`-jével):
2026-10-24 (a `ketReteg.js` bevezetése) óta a `koino/`-t érintő 36 commitból **4** változtatta a magot (a költözés ④a és ⑤b, a D119
①a, a D120), **mind kód-változással** — csak kommentet vagy szóközt érintő egy sem —, és 10-29 óta egyszer sem. A kezdeti mag 17 fájl /
378 KB, a mai 17 fájl / 405 KB. ⭐ Ebből: a fájlok bájtjait kötő lenyomat nem ad téves „más számítás” riasztást (a kommentet szűrő
lenyomat egy JS-elemzőn múlna — egy téves szűrés a kimaradó változás felé billentene, a veszélyes irányba).

**Az alak:**
- **A mag** (`kodCsomag.js`): `MAG_BELEPOK` (`js/allapot/ketReteg.js`, `js/tar/esemenyTar.js`) → `magZarvany` (a statikus importok és
  újrakivitelek a nyers szövegből — egy kommentben álló import-szerű szöveg legfeljebb egy fájllal többet tesz a magba, az óvatos
  irány; a dinamikus import és a hiányzó fájl kimondva) → `magJegyzeke` (`{ fajta: 'koino-mag-1', belepok, fajlok, kulsok }` — a fájlok
  sorvég nélkül; a lenyomata a MAG NEVE) · `magAKodban` (a mag a kód-csomagban: minden mag-fájl ugyanazon az úton, ugyanazzal a
  lenyomattal) · `sajatMag` (a futó programé, folyamatonként egyszer).
- **A születés** (`muveletek.js` `koinoLetrehozasa`, `koino.js` `ujKoinoSzuletese`): MINDEN új születés `mag`-ot visz — a gyökéré is (a
  15. mérés kettéhasadása ott is fenyeget); a kapu (`esemeny.js` `alakiHiba`) csak új alakban és hivatkozásként (`torzs` nélkül)
  fogadja. A gyermeken a `program` (a teljes program) megmaradt: a koino-verzió kártya kódja ehhez kötött, és a tájékoztató szint
  ehhez mér.
- **A két szint** (`koino.js` `programVerzioja` `szint`: `'mag'` | `'program'` | null; a magot nem nevező, D123 előtti születésnél a
  régi egyszintű jelzés): a `koino` parancs („A számítás magja: … — ezen a készüléken is ez fut” / „⚠ … MÁS SZÁMÍTÁS fut”), a
  `/api/program`, a lap alsó sávja (`alsoSav.js` — „⚠ más számítás” narancs, „ℹ más felület” halvány), a kártya „Kód” füle (`/api/kod`
  `mag`: a kártya kódjának magja a fájl-tárból — `kodJegyzekMagja` —, összevetve, a mag fájljai „⚙ mag” jellel), az űrlap (a gyermeket
  a mag köti).
- **A PR2 őre** (`koinoVerzioProba.js`): a mag fájljaiban minden beadott függvény (amit a kód függvényként vizsgál, dokumentál, vagy
  a beállításból hív) egy kimondott listán áll, az okával — ma hét: a D14 kivétele (`nemTartott` — a nézet, nem döntés), a lánc-ág
  (`lancAga` — a kép maga számolja), a lezárási összegzés két olvasója (`esemenyOlvas`, `tagE` — D95/1), a szöveg feloldása (`olvas` —
  D72). Egy új beadott függvény a próbát bukja, és a listára írása kimondott döntés.

**A próbák:** `koinoVerzioProba.js` +5 (a zárvány, a dinamikus import és a hiányzó fájl, a beadott függvények, a születés magjának
alakja, a mag a kód-csomagban) · `parancssorProba.js` +1 (a gyökér és a gyermek születése a magot nevezi meg; ugyanazon az adaton
három telepítés — ez a program, egy csak a felületében más másolat, egy más magú másolat — két szinten mondja ki) és a D119 ①b
lapos próbája a két szinttel. Rontás minden ágra (8 rontás, mind bukik). Böngészőben végigjárva (két másolattal: „ℹ más felület”,
„⚠ más számítás”, a „Kód” fül 17 „⚙ mag” jellel) — a lelet (a fül segédje a gyár belsejében, a lap „hiba”-t kapott) javítva.

**Kimondott határok:** a mag a Node változatát nem köti (a `kulsok` csak a modulok nevét — pl. az NFC-normalizálás a Node Unicode-
változatától függhet; ma nem mérve) · a mag-jegyzék darabja még nem utazik: a kártya kódjából bárki kiszámolja, ugyanazzal a
függvénnyel — ha a számítás módja egyszer változna (új belépő, más zárvány), a PR5-nek (telepítés a kártyáról) a jegyzéket is vinnie kell.

*Kapcsolódik:* `koltozes_atvizsgalas.md` (D118, KZ1–KZ5), `csaladi_orjarat_atvizsgalas.md` (D119 — a koino-verzió kártya),
`torzs_hatar_atvizsgalas.md` (D120 — a kártya kódja elemként), `kormanyzas.md` (a három szint), `platform_fuggetlenseg.md` (D30).
