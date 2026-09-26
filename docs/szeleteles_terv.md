# A SZELETELÉS TERVE — S3 (entitásonkénti tár) és S4 (entitásonkénti csere)

*2026-09-26 éjjel. A [skálázási terv](skalazas_terv.md) S3 és S4 lépésének részletes terve.
Kiindulás: a [48. mérés](../koino/meres/eredmenyek.md) (a mai alapvonal). ⚠️ Ez TERV — a döntési
kérdések (a 7. szakaszban) Csabáéi, és építés csak azok után indul.*

## 0. Miért most

> *„az nagyon fontos, hogy úgy tervezzünk meg mindent, hogy végtelenig lehessen skálázni."*
> — Csaba, 2026-09-26

A „végtelen" próbája (a 9. szabály élesítése a `CLAUDE.md`-ben): **egy készülék terhe — amit
tárol, amit naponta küld, ahány cserét csinál, amennyit számol — ne a koino méretétől függjön,
hanem attól, amivel ő maga foglalkozik.** A 48. mérés szerint ma ennek egyik sem felel meg:

- a csere ára egyetlen eltérésért a koinóval nő (2,7 KB → 17 KB → 160 KB, 1k → 10k → 100k esemény),
  és 100 000 eseménynél egy hasznos bájtra **286 bájt forgalom** jut;
- az ÁLLÁS-t **minden csere az összes eseményből** állítja össze (239 ms 100 000-nél);
- a tár megnyitása végigolvassa az egész fájlt (813 ms), az állapot-számítás az egész koinón fut.

⭐ **És a D71 (iii) is ezen áll:** a „van-e mit mondanom a társnak" kérdés ma a koino-szintű
lenyomatból felelne, ami nagy koinóban soha nem egyezik (skálázási terv 4.1). Entitás-szintű
lenyomattal viszont pontosan azt kérdezi, amit kell: *a közös entitásainkban van-e újdonság?*

## 1. A cél egy mondatban

> **A tár és a csere egysége a SZELET (egy entitás eseményei), nem a koino.** Egy készülék a
> saját szeleteit tárolja, és egy társsal a KÖZÖS szeleteiket egyezteti — a csere ára a közös
> szeletek számától és az eltérések számától függ, a koino méretétől nem.

## 2. Ami NEM változik

- **Az esemény alakja.** A kanonikus alak már hordozza, ami kell: `entitas` (a szelet-kulcs),
  `entitasSorszam` (a hézag az entitáson belül újra jel — 4.3), `latott`, és a lefoglalt
  `lancGyoker` (D63). ⭐ **Tehát nincs szükség új koinóra (D66): a tárolás és a szállítás változik,
  az esemény nem.**
- **Az egyetlen kapu** (`esemenyMentese`, 3. szabály) és **az író** (D70).
- **A szabály-réteg és a számítás logikája.** A számítás bemenete a HELYI események halmaza —
  ma az egész koino, a szeletelés után a saját szeletek. A számítás maga nem változik: ami
  szűkül, az a bemenet (és vele az ára).
- **A kézi út** (`kivisz`/`behoz`, 4. szabály): a fájl alakja marad (soronként egy esemény).

## 3. S3 — AZ ENTITÁSONKÉNTI TÁR

**A tárolás egysége a szelet.** Ma egyetlen `esemenyek.jsonl` van koinónként, és a megnyitás
végigolvassa. Helyette:

- **szeletenként egy hozzáfűzhető fájl** (`szeletek/<az azonosító első két jele>/<szelet>.jsonl`
  — az alkönyvtár azért kell, hogy egy mappában ne legyen százezer fájl);
- **egy kis jegyzék** (`szeletek.json`): szeletenként az eseményszám és a **szelet lenyomata**
  (a rendezett esemény-azonosítókból). Ez a készülék saját érdeklődésével arányos — a koinóval nem;
- **a saját láncom mutatója** (sorszám → szelet): a saját eseményeim a szeletekben laknak, a
  lánc-kérdés (`szerzoLanca` a sajátomra, `lancVege`) ebből felel;
- ⭐ **LUSTA betöltés:** a megnyitás csak a jegyzéket olvassa; egy szelet eseményei az első
  kérdezéskor töltődnek be. *(A 48. mérés 813 ms-os megnyitása így a jegyzék méretével arányos.)*

**Az illesztés nem változik** (S2/a óta szeletelhető: `esemeny` · `szerzoLanca` ·
`szeletEsemenyei` · `sorszamSzerint` · `hozzafuz` · `frissit`), csak két kérdés jön hozzá:
`szeletek()` (a jegyzék) és `szeletLenyomata(szelet)`. ⛔ A `betolt()` a koino méretével nő —
**kikerül a hétköznapi útból teljesen** (ma a csere és a számítás még ezen át kapja a bemenetét,
a `koinoEsemenyei`-n keresztül).

**Az átállás:** egyszeri szétválogatás — a régi `esemenyek.jsonl`-t szeletekre bontjuk, a régi
fájl megmarad biztonsági másolatnak. Az események nem változnak, tehát nincs mit elrontani rajtuk.

⚠️ **Egy ismert gyengülés, kimondva:** amíg egy készülék MINDENT tart, a kettős lánc (egy szerző
két eseménye ugyanarról a sorszámról) bárhol lelepleződik. Ha csak a saját szeleteit tartja, és a
két ág két különböző szeletbe esik, a találkozás elmaradhat (skálázási terv 4.8). A válasz a
**D63 `lancGyoker`** (a szerző minden eseménye elköteleződik az egész addigi láncára) — ez most
is lefoglalt mező. ⏸️ Hogy mikor épüljön meg, az a 7. szakasz 1. kérdéséhez kötődik.

## 3/b. ⭐ HÁROM DOLOG, HÁROM ÚT — a metaadat, a hálózati cím és a tartalom (Csaba, 2026-09-26)

> *„azt is beszéltük, hogy a címeket, a meta adatokat, és az entitás tartalmát, is külön kell
> kezelni."* — ez a skálázási terv 4.7 és 0/b szakasza (*„Külön kell kezelni az entitás
> metaadatait, a címet, és a body-t."*, 2026-09-02).

- **A metaadat** (cím, típus, szülő, kategóriák — és a számok: tudatpont, a szavazás állása) kicsi
  (~250 B/entitás). ⭐ **Ez az, aminek a SZÜLŐ körében is terjednie kell** — ettől tud bárki egy új
  gondolatról, és ettől böngészhető a fa. *(A számok SZÁMÍTÁS eredményei: aki nem tartja az
  entitást, annak csak tájékoztatás — dönteni csak a tartók döntenek, akiknél a teljes bemenet
  megvan. Ellenőrizhetővé az összegző Merkle-fa teszi, 4.6.)*
- **A hálózati cím** percenként változhat: a kötéseké a DHT-táblán (D71 előtt, 2026-09-20), az
  entitás tartóié az entitás címjegyzékében (S5, név nélkül).
- **A tartalom** (a szöveg, a képek) a legnagyobb, és csak ott kell, ahol tudatpontot tettek rá, vagy
  megnyitották. ⭐ **A képek és a fájlok MÁR ÍGY működnek:** a szöveg a lenyomatukkal hivatkozik
  rájuk, és a résen, igény szerint jönnek (fájl-randevú, 5.7).

⛔ **A MAI AKADÁLY:** a `GondolatLetrehozas` EGY aláírt eseményben viszi a metaadatot ÉS a teljes
szöveget (`adat.szoveg`). Ha a metaadatnak a szülő körében kell terjednie, a szöveg is vele
utazna — pont az, amit a három külön út el akar kerülni.

⭐ **A kézenfekvő megoldás ugyanaz, mint a képeké:** a szöveg külön darab lesz, és az esemény csak a
LENYOMATÁT hordozza. Az esemény így kicsi és ellenőrizhető (aláírt), a szöveg pedig úgy jön, mint
egy kép — és a lenyomat garantálja, hogy azt kaptuk, amit a szerző aláírt (a bizalom nem a
csatornából jön, 3. szabály). ⏸️ Ez a gondolat ADATÁNAK alakját érinti (nem a kanonikus alak
szabályait) — a 7. szakasz 5. kérdése.

## 4. S4 — A CSERE SZELETENKÉNT

### 4.1 Melyik szeleteken osztozunk?

A két félnek nem kell tudnia egymás összes szeletét — csak a KÖZÖSEKET. ⭐ Mivel a kötéseink
állandóak (a tábla-kulcs azonosítja őket, D71), **társanként megjegyezzük**, mely szeleteken
osztoztunk a legutóbb, és azoknak mi volt a lenyomata. Így:

- **Első találkozáskor** (vagy ha valamelyikünk érdeklődése változott) a két fél elküldi az
  érdeklődési halmazát — szeletenként egy rövid lenyomatot (~8 bájt; 200 szeletre ~1,6 KB). Ez a
  készülék saját érdeklődésével arányos, a koinóval nem.
- **Utána** a csere egy lenyomattal kezdődik — nem a koino, hanem **a közös szeletek (és a saját
  érdeklődési halmazunk) lenyomatával**. Ha egyezik, kész (a mai „csendes kör" ára).
- ⭐ **És itt kap otthont a D71 (iii) V2-je:** *„van-e mit mondanom neki?"* = változott-e valamelyik
  közös szelet az utolsó cserénk óta. A kérdés a koino méretétől függetlenül értelmes.

### 4.2 Egy szelet egyeztetése — tartomány-alapú halmaz-egyeztetés

Ha egy közös szelet lenyomata eltér, a két fél **az esemény-azonosítók rendezett halmazát**
egyezteti — nem szerzőnkénti ÁLLÁS-sal, hanem **tartományok lenyomatával**: *„a szelet ezen
tartományában ennyi eseményt ismerek, ez a lenyomatuk"*. Ahol a lenyomat egyezik, ott kész; ahol
nem, a tartományt kettéosztjuk, és ott folytatjuk. Amikor egy tartomány már kicsi, a benne lévő
azonosítókat elküldjük, és a hiányzó eseményeket elkérjük.

⭐ **Miért ez, és miért nem a mai ÁLLÁS szeletre szűkítve:** a szerzőnkénti ÁLLÁS egy szeleten a
szelet TULAJDONOSAINAK számával nő — egy tízmilliós tulajdonosi körű entitásnál (4.6) ugyanaz a fal,
csak egy szinttel lejjebb. A tartomány-alapú egyeztetés ára **az eltérések száma × log(szelet
mérete)** — a „végtelen" próbáját kiállja. *(Ugyanezt használja a Nostr „Negentropy" protokollja
és Aljoscha Meyer 2022-es „range-based set reconciliation" írása — nulla függőséggel, saját
kóddal valósítjuk meg, ahogy a DHT-t is.)*

⭐ **A hézag és az elágazás nem vész el:** mindkettő a HALMAZBÓL látszik — az elágazás két különböző
esemény ugyanarról a lánc-pontról (a halmaz mindkettőt hordozza, és a kapu elkapja), a hézag pedig
az `entitasSorszam`-ban (a szabály-réteg gyanújele, 4.3). A mai ÁLLÁS négy mezőjének mindegyik
feladata megmarad — csak nem a csere-üzenetben, hanem ahol eredetileg is lakniuk kellett.

⚠️ **A megvalósítás egyszerű lehet, az illesztés nem:** az első változat egy szelet tartomány-
lenyomatát a rendezett azonosító-listán számolja (a szelet méretével arányos — ez egy normál
entitásnál kicsi). A tömeges entitásnál (4.6) ugyanez az illesztés egy fával válaszol, amelynek
csomópontjai őrzik a tartományaik lenyomatát — *ugyanaz az összegző Merkle-fa, amit a terv három
helyen is előír* (4.6, 4.8, 4.9). A hívók ettől nem változnak.

### 4.3 A véletlen kötések

A 4.2/b óta a kötések egy része szándékosan VÉLETLEN — akivel lehet, hogy egyetlen közös szeletünk
sincs. ⏸️ Hogy velük mit cseréljünk, az a 7. szakasz 2. kérdése.

### 4.4 A régi protokollú társ

Az új csere nem érti a régit. ⏸️ A 7. szakasz 3. kérdése.

## 5. A LÉPÉSEK — mindegyik mérve, próbával és rontás-próbával

⭐ **A D72 után (Csaba, 2026-09-26 éjjel: a szöveg külön darab, és a (b)):** a sorrendet a
függőségek adják. Az A és a B NEM függ a még nyitott 2–4. kérdéstől (a csere protokolljától), tehát
azokkal indulunk.

**A. ✅ A SZÖVEG KÜLÖN DARAB** (D72/2 — KÉSZ, 2026-09-26 éjjel: `szovegDarab.js`; a műveletek, a szerkesztés,
a megjelenítés, a fájl-igény, a randevú és a kézi út; 9 modul-próba + egy parancssor-próba, hét
rontás-próbával. ⭐ Építés közben: (1) a szöveg-darab KÉPEIT a randevú ugyanabban a körben elkéri —
különben a kép egy bulival a szöveg után jönne; (2) a különválás eddig a blokk-tömböt is csendben
elhagyta — javítva.)
1. Az új gondolat és a szerkesztési javaslat a szöveget nem hordozza, csak a **lenyomatát** (és a
   bemondott `meret`-et, D26); a szöveg a fájl-tárba kerül (ugyanoda, ahol a képek: `fajlBlobTarolo`).
2. A számítás a lenyomatot viszi az állapotba; a **megjelenítés** (a pakli, a felület, a parancssor)
   oldja fel szöveggé — ha nincs meg, „a szöveg még nem érkezett meg", nem hiba (D19).
3. A szöveg a résen jön, **mint egy kép** (a fájl-randevú): aki az entitást tartja vagy megnyitja,
   annak kell. ⚠️ A `fajlIgeny.js` (milyen képekre hivatkozik egy entitás) a szöveg lehozása UTÁN
   tudja meg a képeit — ezt végig kell vezetni.
4. ⭐ **A próba, ami a D72 ígéretét őrzi:** két készülék, az egyiknél megvan a szöveg, a másiknál
   nincs → **azonos állapot-ujjlenyomat**. És: a régi (szöveget hordozó) esemény ugyanúgy számol.

**B. AZ ENTITÁSONKÉNTI TÁR** (S3 — a protokolltól független)
5. Szelet-fájlok, jegyzék, lusta betöltés, a saját lánc mutatója, az író mögött; az egyszeri
   szétválogatás. ⭐ **Mérés:** a megnyitás ideje 100 000 eseménynél (ma 813 ms).

**C. A CSERE SZELETENKÉNT** (S4 — a 7. szakasz 2–4. kérdése döntve)
6. A szelet-lenyomat és a tartomány-egyeztetés logikája (hálózat nélkül, 1. szabály). ⭐ **Mérés:**
   ugyanaz, mint a 48.-é — 1 eltérés 100 000 esemény közt → hány bájt.
7. ⭐ **A gyerek-bejelentés:** egy szülő szeletének egyeztetési halmaza = a saját eseményei + a
   KÖZVETLEN GYEREKEI születési eseményei. *A szöveg külön darab (A), tehát ezek kicsik: a szülő köre
   megtudja, hogy új gondolat született, a szövege nélkül.*
8. A csere új üzenetei (`vonal.js`): az érdeklődési halmaz, a közös-szelet-lenyomat, a tartományok,
   a kérés. A társankénti emlékezet a kötés-jegyzék mellé (helyi, sosem utazik). ⭐ Itt kap otthont
   a D71 (iii) V2-je.
9. **Az érdeklődés szabálya (D72/1):** a készülék a tudatpontos, a megnézett és a saját szeleteit
   tartja; a hétköznapi út leválik a `betolt()`-ről (a csere és a számítás a helyi szeletekből).
10. **A D63 lánc-gyökere** — a kettős lánc a szeletek között is lelepleződjön.

**D. A BÖNGÉSZÉS ÚTJA** — a felület egy nem tartott entitást is megnyit (a `hozd`, S6, már megvan).

**E. TEREPEN, a telefonnal:** a csendes kör ára, és egy új gondolat útja a szülő körében.

## 6. Amit a terv NEM old meg (és hol van a helye)

- **A kereső-réteg** (II. réteg, S8–S10) — elhagyható, ráér.
- **A kettős lánc a szeletek között** — a D63 `lancGyoker` (lásd 3. és 7./1.).
- **A tömeges entitás összegző fája** (4.6) — az illesztés már most rá van szabva (4.2).

## 7. ⭐ DÖNTÉSI KÉRDÉSEK (Csabáéi)

✅ **Döntve (D72, 2026-09-26 éjjel):** az **1.** → **(b)**, az **5.** → **igen** (a szöveg külön darab),
és a **2–4.** → a javaslatok szerint (Csaba: *„elfogadom a javaslataidat"*).

1. **Mit tartson egy készülék az első változatban?**
   - **(a) mindent, amit a társai kínálnak** — a mai viselkedés, de már szeletes szerkezetben: a
     tár, a csere és a lenyomat szeletenként dolgozik, és a „mit tartok" egyetlen szabály, amit
     utána szűkítünk. Így a felület (ami ma minden entitást mutat) nem törik el.
   - **(b) csak az érdeklődését** — amire tudatpontot tett, amit megnézett (SK11: megtartja), és
     a saját szeletét. ⚠️ Ehhez kell még két dolog, ami ma nincs: (1) **a gyerek-bejelentés** — egy
     új gondolat születése a SZÜLŐJE körében terjedjen (4.2: „az entitás felsorolja a
     gyerekeit"), különben senki nem tud róla; (2) **a böngészés útja a felületen** (a `hozd`
     megvan, S6), hogy amit nem tartok, azt meg lehessen nyitni. És a (b)-vel jön a kettős lánc
     gyengülése (3. szakasz vége), tehát a D63 is.
   - ⭐ **Javaslatom: a szerkezet (1–4. lépés) az (a)-val épül meg, és KÖZVETLENÜL utána a (b)** a
     gyerek-bejelentéssel és a D63-mal — nem „egyszer majd", hanem a következő lépésként. ⚠️ Az
     őszinte ár: az (a) még nem állja ki a „végtelen" próbáját (mindent tart); a SZERKEZET igen,
     a szabály az, ami utána szűkül.
2. **Mit cseréljünk a véletlen kötésekkel, akikkel nincs közös szeletünk?** Javaslatom: az
   érdeklődési halmazok lenyomatát (hogy észrevegyük, ha közös szelet keletkezik), a
   gyerek-bejelentéseket (ha a (b) megépül), és később a lánc-gyökereket (D63) — ettől marad a
   háló „kis világ", és ettől találkozik két ellentmondó ág.
3. **A régi protokollú társ:** tiszta törés (a régi programmal a csere megnevezetten leáll, a
   telefont frissíteni kell), vagy egy átmeneti időre mindkét protokoll? ⭐ Javaslatom: **tiszta
   törés** — a koino még nincs élesben, két készüléken fut, és a kettős protokoll kettős hibahely
   (ez volt a TCP-kivezetés tanulsága, D69).
4. **A szelet-egyeztetés módja:** tartomány-alapú halmaz-egyeztetés (4.2), vagy a mai ÁLLÁS szeletre
   szűkítve? ⭐ Javaslatom: **a tartomány-alapú** — a szeletre szűkített ÁLLÁS a tömeges entitásnál
   ugyanazt a falat hozná vissza, egy szinttel lejjebb.
5. **A gondolat szövege külön darab legyen-e, lenyomattal hivatkozva — ahogy a képek?** (3/b) ⭐
   Javaslatom: **igen** — ettől terjedhet a metaadat a szülő körében a szöveg nélkül, és ettől lesz
   a (b) tiszta. ⚠️ Két dolgot meg kell nézni előtte: (1) a régi (szöveget hordozó) események
   érvényesek maradnak, tehát a számításnak mindkét alakot értenie kell; (2) kell-e hozzá új koino
   (D66)? Valószínűleg nem, mert az állapot (entitás, tudatpont, döntés) nem a szövegből számítódik
   — de ezt a 15. mérés mintájára meg kell mérni, nem kijelenteni. A szerkesztési javaslat (ami új
   szöveget hoz) ugyanígy.
