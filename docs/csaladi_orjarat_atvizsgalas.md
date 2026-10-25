# A családi őrjárat — átvizsgálás (2026-10-25)

> A költözés (D118) kézi próbájának (2026-10-25, a [`koltozes_atvizsgalas.md`](koltozes_atvizsgalas.md) 13. szakasza) két
> tervezési lelete és Csaba döntése nyomán. ⭐ **Csaba:** a 2. leletre *„(A)+(B) mindkettő”*, a 3.-ra *„(B) Egy őrjárat minden
> koinónak … de csak az azonos felmenőből származtatott koinók legyenek így. Lehessen teljesen külön koinót is létrehozni.”*

## 1. A kérdés

A költözés után egy készüléken (és egy e-embernél) TÖBB koinó él: a szülő és a gyermek (és ha tovább költözik, az unoka).
Ma minden koinónak külön őrjárat és külön UDP-port kell („egy figyel = egy koinó”), és ebből a próbán három baj lett:

- **A gyermek magától nem cserél** (3. lelet). A két őrjárat a KÉSZÜLÉK kulcsával dolgozik, a kopogás a TÁRSAT keresi: a
  másik koinó portján éri el elsőként, ott „MÁSIK koinóé, nem cseréltünk” lesz, és a társ többi címét nem próbálja. Ugyanez
  két FÜGGETLEN koinó között is előjön, ha két készülék mindkettőben együtt van.
- **A gyermek nem fedezhető fel** (2. lelet): a nevét be kell gépelni (`csatlakoz`), a portját kézzel felvenni (`tars`);
  a csatlakozás, a társ felvétele és a kézi csere csak parancs.
- **Egy társsal két munka** (1. lelet iránya): a kapu a „társanként egyszerre egy munka” szabályt CÍM szerint tartja — két
  úton (helyi háló + a router nyilvános címe) ugyanaz a társ két társnak látszik.

## 2. Ami ma megvan

- **Készülék-szintű** (az adat-mappa gyökerében): a kulcs, a tábla-kulcs, a kötések (`kotesek.json` — a tábla-kulcs
  szerint, ≤ 3 cím), az induló címek, a raj (`szeletcimek.json`), a DHT-gépek, a tér-jegyzék. **Koinó-szintű** (`<koino>/`):
  a tár, az átmeneti tár, a kereső-tár, a vállalás, a kiszolgálás, a csere-állapot és minden gyorsítótár.
- **A program egy koinós folyamat:** a `koino.js` (9197 sor) a koinót induláskor rögzíti (`KOINO`, 248 hivatkozás), a tár, a
  művelet-környezet, az átmeneti és a kereső-tár modul-szintű. ⭐ A felület már tud több koinót NÉZNI (`aktivAllapot` — a
  tér „Belépek” gombja koinónként nyit tárat és környezetet), de csak a sajátjában dolgozik (költözés, felderítés).
- **A vonal** a nyitásban (`NYITAS`) EGY koinó nevét mondja, eltérésnél tisztán kilép (`masKoino`). Hálózatot a koinóról
  semmit nem tud — a munkát a `koino.js` adja (`resMunka`).
- **A kapu** (`udpKapu.js`) egy foglalat a futásra, a társ-jegyzéke cím:port szerint; a kötésből jött célokat a tábla-kulcs
  szerint csoportosítja (az egyik címen elért társ többi címét kihagyja).

## 3. A javasolt alak

**A család** = a közös gyökerű koinók: a születések lánca (`szuletesLanc`) legfelső eleme a család NEVE. Egy készüléken egy
családnak EGY őrjárata és EGY portja van; a független családok külön őrjáratot kapnak (Csaba).

**① A koinó-példány.** A `koino.js` koinó-szintű része egy gyárba kerül (`koinoPeldany(K)` — a tár, az átmeneti és a
kereső-tár, a környezet, a gyorsítótárak, a munka — a mai kód, a `KOINO` bezárt változó). Gépies átalakítás, a teljes
próbasor a háló; a parancsok egy példánnyal futnak, mint ma.

**② A családi csere.** A nyitás a CSALÁDOT nevezi meg és a koinóimat a családban (a nevük; korlátosan); a közös koinókra a
mai csere fut SORBAN ugyanazon a védett résen (a társsal egy munka — a kapu szabálya áll); a nem közösekről a „hír” (③).
A régi alakú társ (egy koinós nyitás) ugyanúgy megy, ha az a koinó közös.

**③ A gyermekek híre (2. (B)).** Kétféleképpen lehet: (a) a nyitás sorolja a családom koinóit, és a társ, amelyiket nem
ismeri, annak a születését kéri (élő út) · (b) ⭐ a gyermek születése a SZÜLŐBEN is bejelentett (a gyermek-jegyzék egy
szelet a szülőben, mint egy gondolat gyerekei — `bejelentesHelyei`), tehát a szülő rendes cseréje és a KÉZI ÚT (`kivisz`
/ `behoz`) is viszi (4. szabály); nagy gyermekszámnál darabolható, mint a gyökér. A tér a gyermeket ismertnek mutatja, a
„Költözés…” ablak felkínálja — gépelés nélkül.

**④ A kör.** A család minden koinójának céljai egy körben, a TÁBLA-KULCS szerint összevonva (egy társ egyszer, a közös
koinóival) — ez zárja a 3. leletet a családon belül; és a kapu a társat a kézfogás után a tábla-kulcsa szerint is ismeri:
ha vele már fut munka (egy másik címén), az új tisztán véget ér (az 1. lelet iránya).

**⑤ A független családok.** Külön őrjárat, külön port (Csaba); a kötés a társ címeit CSALÁDONKÉNT jegyzi, és a „MÁSIK
család” válasz nem számít elértnek (a kör a társ többi címével próbálkozik).

**⑥ A lap (2. (A)).** A téren „Csatlakozás egy koinóhoz…” (a név beillesztése) és „Társ felvétele…” (cím, port); a
gyermek ③ után magától jelenik meg.

## 4. A döntési pontok (Csabánál)

- **CS1 — a család határa:** a közös gyökér (a születések lánca legfelső eleme) — egy családba tartozik minden koinó, ami a
  készüléken ebből a gyökérből ered (a testvérek is: két gyermek ugyanabból a szülőből). ⭐ Javaslat: így.
- **CS2 — a családi csere alakja:** (A) ⭐ egy munka egy társsal, a közös koinók SORBAN ugyanazon a résen · (B) koinónként
  külön munka ugyanazzal a társsal, egymás után (több kézfogás, több kopogás — egyszerűbb, drágább).
- **CS3 — a gyermekek híre:** (a) a nyitásban (élő út) · (b) ⭐ a szülőben bejelentett születés (szelet — a csere és a kézi
  út is viszi, darabolható).
- **CS4 — a folyamat:** (A) ⭐ az őrjárat egy családé (a független család másik folyamat, másik port — ma is így indul
  kézzel) · (B) egy folyamat a készülék minden családjának, családonként külön porttal (a felület is ebben futna).
- **CS5 — a lap és az őrjárat:** (A) ⭐ marad két külön indítás (`orjarat`, `felulet`), a lap kimondja, ha egy koinónak
  nincs futó őrjárata · (B) a felület indítja az őrjáratokat (egy indítás a telefonon).

## 5. Mérések az építés előtt

- **M1 — a családi nyitás ára:** a nyitás mérete k közös koinóval, és egy „nincs újdonság” családi csere bájtban (a mai
  1,2–1,7 KB koinónként a mérce).
- **M2 — a gyermek-jegyzék szelete:** egy gyermek születése a szülőben (~0,8 KB nemzedékenként a 82. mérés szerint); a
  jegyzék mérete sok gyermeknél (a gyökér-darab mintája).

## 6. Az építési sor (a döntések után)

① a koinó-példány (gépies, a teljes sor a háló) → ② a családi csere a vonalon → ③ a kör a családra, a tábla-kulcs szerinti
összevonás és a kapu egy-munka szabálya → ④ a gyermekek híre és a tér → ⑤ a független családok címei → ⑥ a lap
(csatlakozás, társ) → ⑦ terepi próba (laptop + telefon: költözés, majd a gyermek magától cserél).

## 7. ✅ D119 — a döntések (Csaba, 2026-10-25)

- **CS1:** a család a közös gyökérből eredő koinók (a testvérek is).
- **CS2 (A):** egy társsal egy munka — a közös koinók cseréje sorban, ugyanazon a résen.
- **CS3 — Csaba ötlete, a javaslatok helyett:** *„A gyermek születésének is egy entitásnak kéne lennie, amit a „feltöltő”
  hoz létre, űrlap kitöltése után, amit a főmenüből nyitott meg. Tudatpontot kell hogy rendeljen hozzá. Ezen a programverzió
  típusú kártyán, az egyik fülben ott kéne hogy legyen a teljes kód, hogy mindenki le tudja ellenőrizni.”* A pontosítások
  (Csaba, mind a javaslat szerint): ⭐ **ez a [`kormanyzas.md`](kormanyzas.md) „koino-verzió entitása”** (a fában, a
  gyökér-entitások fölött, tudatponttal, javaslattal, különválással — a forráskód-kormányzás 1–3. lépcsője ugyanazzal a
  gépezettel, a 4. a költözés); **minden gyermek ilyen kártyával születik** (a gyermek leírása: a neve, a szabályai, a
  programja); és **a kód köti a gyermeket** (a teljes program tartalom-címzett fájlokként a kártya fülén; a gyermek
  születése megnevezi a kód lenyomatát; a lap kimondja, ha a készülék más verziót futtat — nem tiltja, jelzi).
- **CS4 (A):** családonként egy őrjárat (a független család másik őrjárat, másik port).
- **CS5 (A):** két külön indítás marad (`orjarat`, `felulet`); a lap kimondja, ha egy koinónak nincs futó őrjárata.

## 8. A koino-verzió kártya (a CS3 alakja — az építés előtt pontosítandó)

- **Az entitás a szülőben:** a koino-verzió egy legfelső szintű entitás a szülő fájában (`GondolatLetrehozas`, `tipus:
  'KoinoVerzio'` — a kategória és a gondolattípus mintájára), a címe a gyermek neve, a szövege a leírása, és megnevezi a
  gyermeket (a születése azonosítója) és a kódot (a kód-csomag lenyomata). A feltöltő pontot rendel hozzá (D14 — enélkül
  nincs), a többiek ugyanúgy, mint bármire; javaslat, különválás ugyanúgy. ⭐ **Ez a gyermek HÍRE** (a 2. (B)): a szülő
  rendes cseréje (a gyökér darabjai) és a kézi út viszi — a tér és a „Költözés…” ablak ebből tudja, hogy van gyermek, akkor is,
  ha a születése még nincs a készüléken (azt a családi csere hozza).
- **A kód-csomag:** a teljes program (a `koino/` mappa, sorvég nélkül — a 6. szabály mércéje) egy jegyzékkel (útvonal →
  a fájl lenyomata) és a fájlokkal, tartalom-címzetten a fájl-tárban (D72, 5.7 — a törzs útja, a vállalóktól); a jegyzék
  lenyomata a kód neve. A kártya „Kód” füle a jegyzéket és a fájlokat mutatja (a lap csak rajzol).
- **A kötés:** a gyermek születése (a `szabalyok` mellett) a kód lenyomatát is mondja (`program`); a futó program a saját
  jegyzékét kiszámolja, és ha a koinóé más, a lap kimondja („ez a koinó a … verziót futtatja, te a …-t”).
- **Az űrlap:** a fő menüben „Új koino-verzió (gyermek)…”: a név, a leírás, a szabályok (a szülőé az alap), a kezdő pont; a
  kód a feltöltő FUTÓ programja (aki új verziót javasol, az azt telepíti, és onnan hozza létre). Egy lépésben: a kód-csomag,
  a gyermek születése (a létrehozó költözik vele — ma is így), a koino-verzió entitás a szülőben, a pont. ⭐ Ezzel a lap
  gyermeket is létre tud hozni (eddig csak parancs).
- **A kód terjedése:** aki költözne, a kártya fájljaiból a programot is megkapja (P2P, GitHub nélkül — D12); a telepítése
  ma kézi (a fájlok kiírása egy mappába) — ⏸️ a frissítés kényelme később.
- **Mérendő (M2'):** a kód-csomag mérete (ma 331 fájl / ~6,4 MB sorvég nélkül; tömörítve kevesebb), a jegyzék mérete, egy
  koino-verzió kártya és a törzse a vonalon.

## 9. Az építési sor (D119 után)

① **a koino-verzió kártya** (előbb az M2' mérés; a kód-csomag, a születés `program` mezője, az entitás, az űrlap, a „Kód” fül,
a tér és a „Költözés…” a kártyákból) → ② **a koinó-példány** (a `koino.js` koinó-szintű része egy gyárba — gépies, a teljes
sor a háló) → ③ **a családi csere** (a nyitás a családot nevezi meg, a közös koinók sorban; az M1 mérés előtte) → ④ **a kör a
családra**, a tábla-kulcs szerinti összevonás, és a kapu egy munkája társanként (az 1. lelet) → ⑤ **a független családok**
címei („MÁSIK család” nem elérés) → ⑥ **a lap** (csatlakozás egy koinóhoz, társ felvétele — 2. (A)) → ⑦ **terepi próba**
(laptop + telefon: koino-verzió a lapról, költözés, a gyermek magától cserél).

## 10. ✅ Az ①a — a koino-verzió a program oldalán (2026-10-25)

- **A kód-csomag** (`js/tar/kodCsomag.js`; a 84. mérés): a jegyzék `{ fajta: 'koino-kod-1', fajlok: [[út, lenyomat, bájt], …] }`
  (az utak a `koino/` mappától, rendezve), a kanonikus alakja egy darab, a lenyomata a KÓD NEVE; a fájlok a fájl-tárban (a
  nevük a lenyomatuk — két verzió közös fájlja egyszer). ⛔ Sorvég nélkül (a szöveges fájlokban a `\r\n` → `\n` — a 6.
  szabály mércéje): különben ugyanaz a verzió a Windows-munkakönyvtárban és a telefonon két nevet kapna. A program fájljai:
  amit a git követ (a mérések kimenete és a helyi adat nem a program); git nélkül a mappa bejárva, az adat-mappák nélkül. A
  kívülről jött jegyzéket csak az egy alakjában fogadjuk el (rendezett, ismétlés nélkül, relatív utak, a fájl-korláton belül).
- **A születés `program`-ja:** a gyermek születése a kód-csomag hivatkozását is mondja (csak új alakban). ⚠️ A gyökér-koinó
  születése nem nevez meg programot: nincs kártyája, ahol a kód lakna (a kód a gyermekekkel jön), és minden új koinó ~6,4 MB-ot
  írna a fájl-tárba.
- **A koino-verzió entitás** (`esemeny.js` `KOINO_VERZIO`, `koinoVerzioE`; a kapu: `koinoLanc.js` `koinoVerzioEllenorzese`):
  `GondolatLetrehozas`, `tipus: 'KoinoVerzio'`, legfelső szintű; a címe a gyermek neve, a szövege a leírás (darab), a `gyermek`,
  a `szuletes` (a gyermek ALÁÍRT születése, beágyazva) és a `kod` (= a születés programja). Az alak: a születés ennek a
  koinónak a gyermeke, a feltöltő hozta létre (a kártya szerzője), a kód a programja, a cím a neve. A kapu a beágyazott
  születést hitelesnek és a szülő születésével érvényes gyermek-születésnek látja (KZ2, D118/5 — ugyanaz a próba, mint a
  gyermek saját kapuján; a hiányzó szülő nem végleges elutasítás). A képben a `koinoVerzio: { gyermek, kod }` (a különválás
  is viszi). A kártya ~1–2 KB (a beágyazott születés a létrehozó tagsági láncával) — koinó-verziónként egyszer.
- ⭐ **A sorrend: előbb a gyermek születése, aztán a kártya.** A kártya magába ágyazza a születést, tehát a születés nem
  folytathatja a kártyát (kör lenne) — mindkettő a létrehozó vágás előtti utolsó szülőbeli eseményét folytatja (a születés a
  gyermekben, a kártya a szülőben: a lánc két ága, ahogy eddig is a születés utáni első szülőbeli esemény). A kártya így a
  szülő JELENE: a gyermek tárába nem kerül (a koinó-szabály — a létrehozóé a lánc-pont).
- **A pont** (D14): a feltöltő pontja a kártyán (alapból 100 — `pont=N`). ⛔ A szabad pontot ELŐRE nézzük
  (`szabadTudatpontjaim`), mert a gyermek születése után már nem volna mit visszacsinálni (a rontás mérte: a gyermek
  megszületett, a pont bukott).
- **A parancs:** `koinoverzio "<név>" [leírás] [nyilt] [szabályok…] [pont=N] [becenev=…]` a szülőben (a `koino … szulo=`
  ugyanezt hívja): a kód-csomag a szülő fájl-tárába, a gyermek születése a programmal, a kártya és a pont. A `koino` kimondja
  a koinó programját, és ha a készüléken más fut („⚠ ezen a készüléken MÁS verzió fut” — nem tilt, jelez).
- ⭐ **A gyermek a kártyából** (a kézi próba 2. lelete): a „Költözés…” előnézete a gyermekeket a szülő élő koino-verzió
  kártyáiból is látja (a legtöbb pontú 64-et — a terhe a koinó ÉLŐ gyermekeivel nő, nem a történetével), és a költözés a
  gyermek tára nélkül is megy: a tárát a kártyából nyitja meg (a születések lánca a gyökértől és a gyermek születése, a
  gyermek kapuján). ⛔ A tárat CSAK a költözés nyitja meg, nem minden kártya: különben minden készülék minden gyermek tárát
  tartaná, és a családi őrjárat (③–④) mindegyiket cserélné.
- ⛔ **A teljes sor lelete → Csaba döntése (2026-10-25): „(A) Nem költözik” — a KÁRTYÁRA TETT PONT a szülő ügye.** A ④b próba
  bukott: a létrehozó második (50-es keretű) gyermeke nem született meg, mert az első gyermek kártyáján lévő 100 pontja is
  hozott pont volt (150 > 50) — és ha befér, a gyermekben a testvér kártyája élve megjelent volna. ⭐ Az alak: nem a
  számítás találja ki, melyik pont kártyán van (a kártya létrehozó eseményét nem minden készülék ismeri — két készülék más
  képet számolna), hanem a program a KZ3 `elhagy` mezőjébe írja, MAGÁTÓL és aláírva: a beköltözés `elhagy`-ában (a költöző
  kártya-pontjai — `koinoVerzioKartyak`), és ⭐ a gyermek születése is kap `elhagy`-ot (a létrehozó a születésével költözik;
  csak a szülőt megnevező születésen); a számítás (`lancKoltozoi`) a létrehozóét is olvassa. ⛔ És a lelet mögötti lelet: az
  elhagyott pont-eseményt a számítás nem látta, ezért a „nem tartott” kivétel (D75/4 — a szigorú (b) alatt) a kártyát
  „a pontjai ismeretlenek” szellemként a gyermekben hagyta; most az elhagyott, de látott pont tudás (`ketReteg.js`
  `elhagyottPontok` → `allapotSzamitas.js` — „ez a költöző 0-t hoz rá”), a D14 ítélhet. Ez a kézi `elhagy`-ra is igaz (eddig
  ott is szellem maradt). A „Költözés…” előnézete a kártya-pontokat külön mondja ki (`kartyaPontok` — a szülőben maradnak).
- **A próbák:** `koinoVerzioProba.js` (9 — a kód-csomag sorvég nélkül, a jegyzék egy alakja, a futó program csomagja, a kapu, a
  hamis kártyák, a `program` alakja, a kép, ⭐ a kártyára tett pont nem költözik — a második gyermek képében a testvér kártyája
  szellemként sem él —, az `elhagy` alakja), a parancssor (1 új — a kártya és a kód-csomag a lemezen, a túl nagy pont előre,
  a `koino` a programmal, a B a kártyából költözik a gyermek tára nélkül, ⭐ egy második gyermek: a születése A, a beköltözés B
  kártya-pontját hagyja el, és egyik képben sincs szellem — „alap” módban mérve, mert a „mindent” mindent tart), a ②a próba a
  kártyával; 20 rontás, mind bukott.
- ⏭️ **Az ①b:** a kártya törzse a vállalásban és a törzs-kérelemben (a jegyzék és a fájlok — ma a fájl-tár kerete nem védi
  őket, és a törzs-kérelem 64 fájlnál megállna), a „Kód” fül, az űrlap a fő menüben, a „más verziót futtatsz” jelzés a lapon,
  a tér a kártyákból.
