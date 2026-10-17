# A KISZOLGÁLÁSI KERET — átvizsgálás (D108, 2026-10-17)

> **Honnan jön:** Csaba ötlete, a FELDERÍTÉS (egy beállítható ág egyszeri pillanatképe), és vele a kérdés: *„tényleg
> korlátoznunk kell valahogy, hogy ne lehessen vele túl terhelni a készülékeket.”* A **D108** szerint a korlát két oldalú:
> a kérő beállításai a saját készüléket védik, a valódi védelem a KISZOLGÁLÓNÁL van — mert amit a kiszolgáló nem ellenőriz,
> az csak illemtan. ⭐ A sorrend (A): előbb ez (átvizsgálás + mérés), mert a ma élő kérelem-utat is védi, és a kereső-réteg
> ④ (felajánlás) és ⑤ (kérdés) is erre épül; utána a kereső-réteg ③–⑦, aztán a felderítés.

## 1. A kérdés

Egy készülék ma mások kérésére dolgozik — elküld eseményeket, fejléceket, fájlokat, és számol hozzájuk. **Mennyit szolgáljon
ki, és kinek?** A becsületes használatot (egy új tag böngészése, egy felderítés, a mindennapi csere) a keret soha ne fogja
meg; a mohó vagy átírt programot (ami újra és újra, új kulcsokkal kér) viszont igen — és a készülék terhe ne nőjön a koinó
méretével (a „végtelen”, 9. szabály).

## 2. Hol dolgozik egy készülék MÁSNAK — a térkép (a kódból)

- **A csere** (`vonal.js` `parbeszed`, a `koino.js` `resMunka`-ja): a közös szeletek eltérő eseményei (`ESEMENY`), a tagsági
  kísérők (`TAGSAGCSOMAGOK`, ≤ 512), a lánc-kör válasza (`LANCVALASZ`), az összegzés-minták, a közös halmaz (`HALMAZ`), a raj
  tippjei, a DHT-gépek, és a fájl-randevú (a törzs — csak a vállalt entitásaimra, D84/1).
- **A kérelem** (`KERELEM` → a `koino.js` `kerelemKiszolgaloja`): a SZELET (a két tárból, + a szerzők tagsági kísérői,
  ≤ 1024), a FEJLÉCEK (+ a MINTÁK), a TÖRZS (≤ 64 fájl, csak a vállalótól). Egy kapcsolaton legfeljebb 16 egymás után
  (`SOROZAT_KORLAT` — D102/J3).
- **A továbbadás** (D92/1 (c)): az átvett kérelmet a saját munkáimban továbbadom, és a választ visszaviszem (≤ 32 egyszerre,
  15 percig).
- **A kapu** (`udpKapu.js`): a kopogásra felel; társanként egyszerre egy munka (`FOGLALT`); ablakonként ≤ 3 új, ismeretlen
  bekopogó lesz cél (`BEKOPOGO_KORLAT`).
- **A helyi felfedezés** válasza (a wifin).

## 3. Ami ma véd — csak kérésenkénti korlátok

Egy kérésre legfeljebb 50 fejléc (`FEJLEC_KORLAT`), egy szelet-válaszban legfeljebb 4000 esemény (`VALASZ_ESEMENY_KORLAT`),
egy törzsben legfeljebb 64 fájl (`TORZS_KORLAT`) fájlonként legfeljebb 2 MB (`FAJL_KORLAT`), egy kapcsolaton legfeljebb 16
kérés, a bejárás legfeljebb 5000 lépés; társanként egyszerre egy munka. ⛔ **Időbeli keret nincs:** a munka végén a
következő jöhet — ugyanattól, vagy egy új tábla-kulccsal (ingyen van).

⛔ **És a kérelemben a kiszolgáló ma nem tudja, KI kér:** a tábla-kulcs aláírása csak a cserében jön (a `CIMEK`-ben); a
kérelemben zárt koinóban a személy (`ki`) igen, nyíltban csak a cím (IP:port — a mobil NAT portot vált).

## 4. A 76. mérés — mennyibe kerül egy kérés kiszolgálása (`kiszolgalasMeres.js`)

Egy szintetikus koinón (120 tag-szerző, a gondolatok egy fában, mindegyiken a szerzője pontja és fele eséllyel egy
másiké), a memóriában, a kiszolgáló valódi függvényeivel:

```
gondolat / esemény        az állapot   a gyökér fejlécei mélyen (n = 50)      egy szint (melegen)     egy szelet
                          (ma minden    hidegen      melegen    válasz        idő      válasz          medián / max
                          fejléc-kérés)
   500 /   1 486            6,5 ms      45 ms        1,8 ms     34 + 8 KB     3 ms     5 + 12 KB       1,6 / 5,1 KB
 2 500 /   6 479           43 ms        48 ms        3,6 ms     35 + 9 KB     7 ms     5 + 8 KB        1,6 / 4,7 KB
10 000 /  25 172          164 ms        57 ms       18 ms       35 + 7 KB    19 ms     6 + 8 KB        1,6 / 5,2 KB
50 000 / 124 866          937 ms       184 ms      150 ms       35 + 7 KB   155 ms     7 + 8 KB        1,6 / 6,3 KB
```
(egy esemény a vonalon ~550 B; a beolvasás nincs benne — a 49. mérés szerint 100 000 esemény ~0,4 s)

A mai felső határokból számolva a legrosszabb válasz: egy szelet ≈ 2,1 MB (+ a kísérők ≈ 0,5 MB), egy törzs 128 MB; egy
16-os sorozat szeletből ≈ 34 MB, törzsből ≈ 2 GB — és utána a következő kapcsolat jöhet.

⭐ **A lelet — két külön dolog:**
1. **A VÁLASZOK KICSIK ÉS KORLÁTOSAK** (fejlécek ~35–45 KB, egy szint ~13–19 KB, egy szelet ~1,6 KB) — **kivéve a
   törzset és a nagy szeletet**: ott egyetlen kérés is MB-okat, a törzs akár 128 MB-ot vihet. A BÁJT-keret ezeket fogja.
2. ⛔ **A SZÁMÍTÁS VISZONT A TÁRRAL NŐ:** minden fejléc-kérelem a TELJES állapotot újraszámolja (`kepetKeszit` —
   gyorsítótár nélkül, ~7,5 µs eseményenként), és a válasz maga is a teljes entitás-halmazon számol össz-pontot és
   gyerek-jegyzéket. Egy „alap” készüléknél a tár a vállalásával arányos (kicsi); egy „mindent” tartónál (az önkéntes teljes
   tartó — a laptop) a koinó méretével nő: 125 000 eseménynél **~1,1 s CPU kérésenként** (+ a beolvasás), egy 16-os
   sorozatra ~18 s. ⭐ Ez a „végtelen” megsértése a kiszolgáló oldalán, és egy mohó kérő ezzel terheli legjobban — nem a
   bájtokkal. A kérések SZÁMA csak akkor jó mérce, ha egy kérés ára korlátos.

**A becsületes használat** (a keretnek ezeket soha nem szabad megfognia), a fenti számokból: egy navigáció a pakliban egy
új készüléken ~50–100 KB (a mély fejléc-kérés + legfeljebb 4 függő szelet, a képek nélkül); egy felderítés (3 szint ×
legjobb 10) ~0,2 MB fejléc, a szövegekkel ~0,5 MB; a mindennapi csere egy társsal „nincs újdonság” esetén 1,2–1,7 KB / kör
(43. mérés), az első találkozás közös halmaza 2,9–28,3 KB (68. mérés). A képek ezeknél nagyobbak — ezért a bájt-keret a
törzsnél számít igazán.

## 5. A javasolt alak

- **Előbb a kérés ára legyen korlátos** (KK1): a kiszolgáló a képét (az állapot, az össz-pontok, a gyerek-jegyzék) a tár
  állása szerint gyorsítótárban tartja, rövid időkorláttal (a döntések időfüggők) — így egy kérés a lista hosszával arányos,
  nem a tárral.
- **A keret két mércével** (KK2): a kimenő BÁJT és a KÉRÉSEK száma, csúszó órás ablakban, helyi feljegyzésként (nem esemény).
- **A társ** (KK3): zárt koinóban a személy, egyébként a tábla-kulcs (amit a kérelembe is beteszünk), végső esetben a cím;
  a KÖZÖS keret a sok-azonosságos kerülőút ellen.
- **Ami alá tartozik** (KK4): minden, amit MÁSNAK teszek, a kötéseimmel folytatott cserét kivéve (D108: a saját cserém).
- **Az elsőbbség** (D108): a kötéseim → az ismert tagok → az idegenek; az idegenek a közös keretnek legfeljebb a felét
  vihetik, így az ismerősöknek mindig marad hely.
- **A „később”** (KK6): a keret fölött (és ha egy válasz a maradékot túllépné — a törzs fájlonként) a kiszolgáló „később”-t
  mond, a kérő a megadott ideig mást kérdez.

⭐ A „végtelen” próbája: minden keret időablakra szól, és egy kérés ára (KK1 után) korlátos — egy készülék kiszolgálási
terhe nem nő a koinó méretével.

## 6. A kérdések — javaslattal (D-szintűek, Csabáéi)

**KK1. A kérés ára — a kép gyorsítótárban?**
- **(A) ⭐ Igen, ez a keret előfeltétele — ezt javaslom.** A kép (az állapot, a döntések, az össz-pontok, a gyerek-jegyzék) a
  tár állása, az átmeneti tár változata és a vállalás szerint megmarad, legfeljebb ~60 mp-ig (a döntés lezárása idő
  kérdése). A 76. mérés szerint egy meleg fejléc-válasz így a lista hosszával arányos (a 2–4 ms-os tartomány), nem a tárral.
- **(B) Nincs gyorsítótár, a keret a CPU-időt is méri:** egyszerűbb, de a „mindent” tartó a saját ugyanilyen kéréseire is
  lassú marad, és a keret a nagy koinóban a becsületes kérőt is hamar megfogná.

**KK2. Mit mér a keret?**
- **(A) ⭐ Két mércét: a kimenő bájtot és a kérések számát, csúszó óránként — ezt javaslom.** A bájt a törzset és a nagy
  szeletet fogja (ahol a MB-ok vannak), a kérésszám a sok apró kérést (KK1 után ez korlátos munka).
- **(B) Csak a bájtot:** egyszerűbb, de a sok kis kérés (minden csak néhány KB) bájtban alig látszik.

**KK3. Ki a „társ” a társankénti kerethez?**
- **(A) ⭐ Zárt koinóban a személy (a `ki` — már ma jön), egyébként a tábla-kulcs, amit a kérelembe is beteszünk (a kérő
  vele is aláírja a kézfogás átiratát, mint a cserében — ~+100 B kérésenként); ha egyik sincs, a cím — ezt javaslom.** A
  tábla-kulcs ingyen van, ezért a KÖZÖS keret fogja a sok-azonosságos kérőt; a társankénti a mohó egyént.
- **(B) Csak a cím:** a vonalhoz nem kell nyúlni, de a mobil NAT portváltása és az egy IP mögötti család összemosódik.

**KK4. Mi tartozik a keret alá?**
- **(A) ⭐ Minden, amit másnak teszek — a kérelem (mindhárom fajta, a kísérőkkel), a továbbadás, a fájl-randevú törzse, és a
  csere azzal, aki NEM a kötésem —; a kötéseimmel folytatott csere nem — ezt javaslom.** Az idegen csere az út, amin egy
  új tábla-kulccsal érkező „mindent kérő” újra és újra lehúzhatná egy „mindent” tartótól a koinót; a kötés a saját cserém
  (D108).
- **(B) Csak a kérelem:** egyszerűbb, de a csere nyitva hagyja a fenti utat.

**KK5. A számok (kiindulás — a panelen állítható, mérés után igazítható)**
- **(A) ⭐ „Alap” készülék: összesen 20 MB és 600 kérés óránként, egy társ legfeljebb a negyede, az idegenek együtt
  legfeljebb a fele; „mindent” készülék: 100 MB és 3000 kérés óránként — ezt javaslom.** A 76. mérés szerint egy új tag
  intenzív böngészése (óránként ~60 navigáció, képek nélkül) ~3–6 MB, egy felderítés ~0,5 MB — a keret ezeket átengedi;
  egy mohó törzs-sorozat (2 GB) vagy a sok-kulcsos „mindent kérő” viszont megáll. Egy telefonon mobilnettel a panel lejjebb
  veheti.
- **(B) Más számok** — Csaba megmondja, mi a fontos (például a telefon mobiladata).

**KK6. A „később” a vonalon**
- **(A) ⭐ A kérelemnél `KESZ` + `kesobb: <mp>` (egy régi kérő üres válasznak látja — kompatibilis); a cserénél a nyitás után
  egy `KESOBB` üzenet (a régi program a cserét elbukottnak látja — a terepi frissítéssel úgyis jön); a kérő függő kérelme
  addig attól a tartótól nem kér, és a raj másik tartójához fordul; a lap kimondja: „a tartók most foglaltak” — ezt
  javaslom.** Ha egy törzs-válasz a maradékot túllépné, a kiszolgáló a beférő fájlokat adja, a többire „később”.
- **(B) Némán elutasít** (üres válasz): egyszerűbb, de a kérő nem tudja, hogy várnia kell, és ugyanott próbálkozik.

## 7. A sorrend az építésben (a döntések után)

① A kép gyorsítótára (KK1) — és a 76. mérés újra: a meleg fejléc-kérés a tárral nem nő. → ② A keret könyvelése (a mérő,
a csúszó ablak, a társ-azonosítás — KK2–KK3; a tábla-kulcs a kérelemben) → ③ a kiszolgálás bekötése (KK4: a kérelem, a
továbbadás, a törzs, az idegen csere; az elsőbbség) → ④ a „később” a vonalon és a kérőnél (KK6) → ⑤ a beállítás (a
`kiszolgalas` parancs, és a felderítés-panelhez a helye). Próbák: modul-próba a könyveléshez, és a bekötés
parancssor-próbával (egy mohó kérő a keret fölött „később”-t kap, egy kötés közben gond nélkül cserél) — rontással.
