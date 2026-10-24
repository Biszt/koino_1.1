# CLAUDE.md

Ez a fájl a Claude Code-nak ad útmutatót a koino_1.1 kódbázisához.

## A projekt

**Kollektív Intelligencia Online (koino)** — közösségi tér, amit a közösség irányít. A regisztrálók **e-emberek** (nem „felhasználók"): egyszerre tulajdonosok, fejlesztők, moderátorok és felelősök. A platform lényege a közösségi döntéshozatal: gondolatokból javaslatok, javaslatokból egyezmények születnek, központi szereplő nélkül.

## ⚠️ KÉT PROGRAM VAN A REPÓBAN (2026-08-26 óta)

| Mappa | Mi ez | Állapot |
|---|---|---|
| `backend/` + `frontend/` | **A PROTOTÍPUS** — központi szerveres koino (Fázis 1), ez fut a koino.hu-n | ⏸️ **befagyasztva** — üzemel, de **NEM fejlesztjük**. **NE nyúlj hozzá:** az éles deploy a repó gyökeréből épít, egy átrendezés némán eltörné |
| **`koino/`** | **AZ ÚJ PROGRAM** — P2P koino (Fázis 2): a készüléken fut, aláírt eseményekkel, szerver nélkül | 🚧 **itt folyik a fejlesztés** |

**A fordulat oka (D22):** *„a központi server részét most nem kell fejleszteni. A kis családi közösségeknek is P2P-nek kell lenniük."* — a régi koino a prototípus, ami tanított; az új a **készüléken** kezdődik, örökölve belőle a domain-logikát és a felületet.

## ⏭️ HOL TARTUNK — ELŐSZÖR EZT OLVASD (2026-10-15)

### ▶️ SESSION-VÁLTÁS (2026-10-15) — A KÖVETKEZŐ SESSION INNEN INDUL

**Az állapot:** **1317 önpróba** (62 próba-fájl; a legutóbbi teljes soron mind zöld — 2026-10-25, D118 ⑥ a felület — a költözés megépült) · 331 fájl / 6403,3 KB (⚠️ CR nélkül mérve —
lásd a 6. szabályt) · 0 npm-csomag · minden pusholva. ✅ **A telefon friss** (Csaba 2026-10-23-án a felderítés kézi
próbájához és a három javításhoz frissítette — *„működik”*); a parancs lent, *„Ami nyitva maradt"*. A laptopon a próbához három
fa: „Felderítés-próba” (60 gondolat), „Nagy felderítés-próba” és „Harmadik felderítés-próba” (400–400 gondolat, ≤ 8 szint, ≤ 8
testvér) — a scratchpad `felderites_fa.mjs`-ével.

⛔⛔ **SESSION-NYITÁSKOR („nézd át a koino_1.1 mappát") NE FUTTASS PRÓBÁT** (Csaba, 2026-10-01) — az
átnézés OLVASÁS: a munkakönyvtár, az utolsó commitok, a dokumentáció, a kód. Lásd *A munka módja*.

**Ami ebben a sessionben (2026-10-11 → 10-15) megépült** — az előző blokk szó szerint a [napló](docs/claude_naplo.md)
tetején; a döntések (D101–D104) a [fázis-2 tervben](docs/fejlesztesi_terv_fazis2.md), az elágazások (105–153) az
[alappillérek](docs/alappillerek.md) 5. szakaszában, a mérés (74.) az [eredményekben](koino/meres/eredmenyek.md):
- ✅ **A MARADÉK MODÁLOK — D101 ①–⑥ (5.8) — helyőrző modál már nincs** ([`modalok_atvizsgalas.md`](docs/modalok_atvizsgalas.md)):
  ① az I. csoport (Tudatpontok, kategória/gondolattípus a lapról, Rendezés ág-szűrve, a fő menü — `agHelyzete`,
  `koinoModalok.js`) · ② a bejáró (74. mérés → **D102**: a tartó maga jár be, gyerekszám, a fejléc folytatása; J3: a
  kérelem-sorozat; `biztosElotag`) · ③ a Struktúra · ④ a Síkidom · ⑤ a Keresés helyi alja · ⑥ az értesítés-réteg (a
  postafiók a készüléken). Közben javítva: a küszöb két prototípus-alakja (109.), az össz-pont a nem tartott entitásnál
  (133.), egy importkör a lapon (134.), a csak küldő út a bejelentési helyeken (143.).
- ✅ **D103 — a levél helyett a készülék saját értesítése** (Windows, Mac, Linux, Termux; `KOINO_ERTESITO`; az őrjárat is
  számol — zárt lapnál is jelez).
- ✅ **A telefon + laptop kézi próbája (2026-10-14)** — a telefonon egy második teszt-e-ember (`~/koino-proba`), a laptop
  meghívta. Csaba: *„egész jól működik, ügyes vagy.”* Két kérés és egy lelet lett belőle:
  - ✅ **Az alsó sáv** (148–152.): a fő menü és az infók a prototípus helyén, a lap alján; a csere ideje („🔄 2 perce +3 ·
    ⏭ 0:42” — `csere.json`), és ha egy csere újat hozott, a lap magától frissül. Lelet: a fő menü értesítés-számlálója a
    ⑥ óta 0 volt.
  - ✅ **D104 — a kifutás** (153.): a pont levétele után a készülék még 24 óráig tartja a szeletet — különben a telefon
    lemaradt a laptop későbbi levételéről, és az egyezmény nála életben maradt (a bekötés-próba rontása pontosan ezt hozza
    vissza).
- ⚠️ **A laptop kézi próba-adata** az előző session scratchpadjában (a Temp mappában megmarad):
  `C:\Users\Csabika\AppData\Local\Temp\claude\C--koino-1-1\fd30c1b1-39c4-43a6-a24d-e73684414a0f\scratchpad\bongeszo-adat4`
  („mindent” beállítás; a telefon a `192.168.1.124:7374`-en). Indítás PowerShellben, két ablakban:
  `$env:KOINO_ADAT = '<a mappa>'; node koino/koino.js orjarat 1 7373` és `…; node koino/koino.js felulet 7499` (a felület
  minden indításkor új jelszót ír ki). ⚠️ A teljes próbasor előtt mindkettőt le kell állítani.

#### ⏭️⏭️ A KÖVETKEZŐ SESSION — Csaba választ (a sorrend az övé)

1. ⭐ **⑦ a kereső-réteg** (a D101 utolsó lépése, külön pillér) — 🔍 **ÁTVIZSGÁLVA**
   ([`kereso_reteg_atvizsgalas.md`](docs/kereso_reteg_atvizsgalas.md)): ⭐ a kereső-réteg ugyanaz a mozdulat, mint a
   gyökér-darab (D95/4), csak a kulcs a cím egy SZAVÁNAK lenyomata; a bejegyzés maga a létrehozó esemény (aláírt, a címmel —
   számított, hamisíthatatlan); a darabot a saját tartói tartják és hirdetik (+1 DHT-téma), a szerző a csak küldő úton
   ajánlja fel, a kérdező több tartót kérdez és egyesít. ⛔ Az átnézés (2026-10-15) a 7. szakaszba hozta a K7-et (a
   gyakori szavak) és a K8-at (a 16 bites darab-szám). ✅ **D105 (Csaba: „minden javaslatodat elfogadom … ezt leszámítva”,
   2026-10-15) — a K1–K7 eldőlt** (az átvizsgálás 8. szakasza, elágazás 154.): K1 hash a DHT-n · **K2 (C) minden szó két
   kulcs alatt — az egész szó és az első négy betűje** (a magyar toldalékol: a „park” így találja a „parkban”-t) · K3 két
   ellenőrzött TAG tulajdonos, és nem tag szerző születése egyáltalán nem kerül az indexbe · K4 felajánlás kopogtatással ·
   K5 30 nap, néhány „soros” megújítóval · K6 előbb a 75. mérés · K7 a túl nagy fiók a gondolat lenyomata szerint osztódik,
   a több szavas kérdés a legritkább szóhoz megy. ✅ **D106 (Csaba: „A (C)-t választom”) — a „végtelen” mércéje** (lent, a
   9. szabálynál: *a koinó saját határa — a drága helyen kimondott kivétel*), és vele a **K8 KÉSZ**: a gyökér-darab száma
   legfeljebb 144 bit (BigInt; 16-ig bájtra a régi kulcs; elágazás 155.). ✅ **A 75. mérés** (2026-10-16, `keresoMeres.js`):
   a D105 alakja kiállja — a K7 nélkül a gyakori szó fiókja (a címek ~5%-a) egymillió gondolatnál ~31 MB egy készüléken,
   vele ~1,4 MB a legtöbbet tartónál (~0,5 átlagosan), és nem nő a koinóval; a K2 (C) a tőre keresve 91–96%-ban hoz legalább
   10 találatot (az egész szó 47–72%); paraméterek: B = 256, a tartó tagság-gyorsítótára 4096, az első kitöltés (~8,4 MB) a
   háttérben. ✅ **② a szó és az index-darab** (2026-10-16, Csaba: „rendben, mehetünk tovább”): `keresoReteg.js` — a szavak
   (NFC, kisbetű, ékezet-összevonás nélkül), a kulcsok (`e:` egész szó, `p:` az első négy jel; ≤ 32 / cím), a szűrő
   (`cimIllik`), a bejegyzés, az osztódás (K7), a régiók (`k` jel, a gyökértől független helyen); a darab-számítás közös a
   gyökérrel (`cimjegyzek.js`); elágazás 156. ⏭️ **③ a tartás és a hirdetés.** ✅ **K9 — a MÓDOSÍTOTT CÍM** (Csaba: „legyen az (A)”;
   elágazás 157.): a bejegyzés a születés + a címet adó javaslat, a felajánló a tulajdonos, az elfogadást a kérdező ellenőrzi. 🔍 **A ③–④ átvizsgálva** (az
   átvizsgálás 11. szakasza): ⏸️ **Csabánál L1–L4** — L1 külön kereső-tár (puha állapot, ugyanazon a kapun) · L2 a régió
   tartói a cserében egyeztetnek (a gyökér-darab mintája, NYITÁS-jel) · L3 aláírt megújítás (hogy a lejárt bejegyzés ne
   jöjjön vissza a rajból) · L4 a felajánlás a kérelem gépén (`FELAJANLAS`). ✅ **D107** (Csaba: „Az L1–L4 javaslataidat elfogadom, mehet a ③.”): mind (A).
   ✅ **D108** (Csaba, 2026-10-17: „1. igen 2. igen 3. (A)”) — Csaba ötlete, a **FELDERÍTÉS** (egy beállítható ág egyszeri
   pillanatképe: mélység, szélesség, fejléc/törzs, MB-keret; nem frissül, értesítést nem ad — a tudatpont marad a követés
   eszköze), és a **KISZOLGÁLÁSI KERET** (a valódi védelem a kiszolgálónál: közös és társankénti időkeret, elsőbbség, a keret
   fölött „később”). ⭐ **A sorrend (A): előbb a kiszolgálási keret** (átvizsgálás + mérés) **→ a kereső-réteg ③–⑦ → a
   felderítés.** 🔍 **A kiszolgálási keret ÁTVIZSGÁLVA** ([`kiszolgalasi_keret_atvizsgalas.md`](docs/kiszolgalasi_keret_atvizsgalas.md),
   76. mérés — `kiszolgalasMeres.js`): ⭐ a válaszok kicsik és korlátosak (fejlécek ~35–45 KB, egy szelet ~1,6 KB), kivéve a
   törzset (≤ 128 MB / kérés) és a nagy szeletet (≤ 2,1 MB); ⛔ de a SZÁMÍTÁS a tárral nő — minden fejléc-kérelem a teljes
   állapotot újraszámolja (gyorsítótár nélkül), egy „mindent” tartónál 125 000 eseménynél ~1,1 s CPU kérésenként. ✅
   **D109 (Csaba: „minden javaslatodat elfogadom”) — KK1–KK6 mind (A):** KK1 a kép gyorsítótárban (a keret előfeltétele) · KK2 két mérce: bájt és kérésszám, csúszó óra ·
   KK3 a társ: a személy / a tábla-kulcs a kérelemben / a cím · KK4 minden, amit másnak teszek, a kötéseimmel folytatott
   cserét kivéve · KK5 alap: 20 MB + 600 kérés / óra (társ ≤ ¼, idegenek ≤ ½), „mindent”: 100 MB + 3000 · KK6 a „később”:
   `KESZ` + `kesobb` (kompatibilis), a cserénél `KESOBB`. 🚧 **Az építés:** ✅ ① a kép gyorsítótára (a kiszolgáló képe ≤ 60 mp, a fejléc-válasz lusta összefésüléssel — egy kérés
   0,5–0,7 ms a tár méretétől függetlenül; elágazás 161) → ✅ **a KÉRELEM útja a kereten** (②–④ a kérelemre: a könyvelés —
   `kiszolgalasiKeret.js` —, a tábla-kulcs a kérelemben, az ítélet és a könyvelés a kiszolgálónál, `KESZ` + `kesobb`, a
   részleges törzs; elágazás 162) → ✅ **a CSERE a kereten, a kérő, a beállítás — a D109 MEGÉPÜLT** (a nyitás után `KESOBB`,
   a maradék bájtig küldés; a kötés a keretben a RENDSZERES társ — a három legrendszeresebb, ≥ 3 találkozás, ≥ 1 óra; a társ
   kulcsa egy helyen — `keretTarsa`; a kapu `tag`-je csak ellenőrzött tagságnál; a ki nem szolgált kérelem nem csere; a kérő
   a „később”-t mondót kihagyja; `kiszolgalas keret <MB> <kérés>`, az elmúlt óra a `keret.json`-ből; elágazás 163–165 — két
   hibát a bekötés-próba mért meg). ✅ **A kereső-réteg ③ KÉSZ** ([12. szakasz](docs/kereso_reteg_atvizsgalas.md) — az
   építés alakja: a BEJEGYZÉS az egység, nem az esemény): ✅ **③a a kereső-tár** (`keresoTar.js` — a csomag a kapun,
   fiókonként a frissebb, korlátos; a kézi út: `kereso felajanl` / `behoz` / `kivisz`; elágazás 166) → ✅ **③b a régió a
   cserében** (a NYITÁS `kd` jele, a legsekélyebb közös eltérő régió, `BEJEGYZES`, a fogadó helye és kapuja; elágazás 167) →
   ✅ **③c a hirdetés és a raj** (a régió témája, a régió-társak a DHT-ról a kör céljai közé, a régió a rajban; elágazás
   168). ✅ **D110 — a K10 (A2)** (Csaba, 2026-10-18: „rendben. elfogadom a javaslatodat” → „(A2) Medián”): a gyökér-darab és
   a kereső-régió mélysége legalább a friss társak bemondott mélységének alsó mediánja − 1 (≥ 2 társ, csak mélyebbre, egy nap
   után elévül; a K10 (A) „csak amíg kevés” feltétele elmaradt — egy hosszan offline készüléket beragasztott volna);
   `melysegTanulas.js`, elágazás 169. 🚧 **A ④** ([13. szakasz](docs/kereso_reteg_atvizsgalas.md)): ✅ **④a az aláírt
   megújítás és a lejárat** (`keresoMegujitas.js` — a tulajdonos személyes aláírása, a gondolat minden fiók-bejegyzésére
   egy; a lejárat bárkinél ugyanaz, a lejárt nem kerül be és nem megy tovább; a soros 20. / 25. nap; elágazás 170) → ✅ **④b a
   tagság** (csak ellenőrzött tag-szerzők az indexben; a függő nem megy tovább, a korlát tizedéig, előbb esik ki; a csere
   tagsági köre és a kézi út kísérői hozzák a tagságot; elágazás 171) → ✅ **④c a felajánlás** (a kérelem `felajanlas` fajtája,
   a tartó kimondja az osztódást; a felajánló régiónként, közvetlenül / automatikusan az őrjáratban / fájlban; elágazás 172) —
   **a ④ kész** → ✅ **⑤ a kérdés** (`kereses.js`: a leghosszabb szótól, a szóeleje-fiók, az osztódottból minta; a kérelem
   `kereses` fajtája; a kérdező maga ellenőriz — a tagságot is —, a találat az átmeneti tárba; `kereso keres "<kérdés>"`;
   elágazás 173; a ⑥ halványulás a ④a-val kész) → ✅ **⑦ a Keresés ablaka a hálózati találatokkal** (a felület a háttérben
   kérdez, a találat az átmeneti tárból a helyi listában; a NAT mögötti tartóhoz a kérdés függő kérelem — az őrjárat viszi,
   a lap figyel; elágazás 174) — **a kereső-réteg megépült**. ⏸️ **K11 Csabánál** ([16. szakasz](docs/kereso_reteg_atvizsgalas.md)):
   a megtalált gondolat TARTÓI → ✅ **D111** (Csaba: „(A) Tartó-tipp”): a kereső tartó a felajánló KÉSZÜLÉKÉT (a kérelem
   ellenőrzött tábla-kulcsát) a gondolat mellé jegyzi, a találat ≤ 2 tippet ad (cím nélkül), a kérdező függő kérelme a tipp
   készülékének kopogtató témáján jelentkezik (elágazás 175). 🔍 **A FELDERÍTÉS ÁTVIZSGÁLVA**
   ([`felderites_atvizsgalas.md`](docs/felderites_atvizsgalas.md), **77. mérés** — `bejaroMeres.js --felderites`): a felderítés
   egy háttérben futó, rögzített Struktúra; egy friss készüléken a mai menettel K = 200 fejléce 2,5–4,3 óra, a törzse még
   ~1–1,5 óra (~145 különböző készülék), „mindent” tartóval percek; ⛔ lelet: a fájl-tár nem korlátos (a nem vállalt törzs
   örökre marad — a lapnál is); ⛔ a 74. mérés javítva (a G és a H kettőzött csomópontokat számolt — a G oldala 38–40 perc a
   29–34 helyett; a D102 döntései állnak). ✅ **D112** (Csaba: F1–F6 mind (A)): összesen K legjobb-először · előbb a
   fájl-tár kerete, aztán a rögzítés az átmeneti tárban · K = 200, csak fejléc, 20 MB, 4 kérés/kör · a kártya menüjéből +
   a fő menü listája. 🚧 **Az építés:** ✅ ① **a fájl-tár kerete** (a nem vállalt törzs átmeneti: ≤ 50 MB, a legrégebben
   érintett megy; `fajlTarTakaritasa`, `tomorit`; elágazás 176) → ✅ ② **a rögzítés** (az átmeneti tárban, saját kerettel;
   a bemondott össz-pontok is megmaradnak; elágazás 177) → ✅ ③ **a jegyzék és az ütemező** (`felderites.js`, az őrjárat
   `felderitesKor`-e, háttér-kérések, `felderites` parancs; elágazás 178) → ✅ ④ **a törzs-fázis** (a fejlécek után a
   szöveg-darab és a fájlok, rögzítve, a fájl-tárban védve; elágazás 179) → ✅ ⑤ **a felület** (a kártya menüjében „📷
   Felderítés…”, a fő menüben a „Felderítések” ablak, a kártyán „📷”; böngészőben végigjárva — két lelet javítva; elágazás
   180) — ⭐ **A FELDERÍTÉS (D108/D112) MEGÉPÜLT.** ✅ **D113** (Csaba, 2026-10-19: „(A) 256”) — a D106 másik
   következménye, **a tagsági lánc korlátja 64 → 256**: a 78. mérés szerint a korlát a LEGMÉLYEBB tagnál dönt, nem az
   átlagnál (a „~10^29–10^30” az átlag volt) — véletlen meghívónál a legmélyebb tag a 64-et ~1,3·10^11 tagnál elérte volna,
   a 256-ot a koinó saját határáig sem éri el; a tagsági kísérők egy szerzőé egészben, ≤ 1024 esemény / 4 MB (elágazás 182).
   ⏭️ **Csaba (2026-10-19): a következők — a UDP-s több forrás, a kopogás saját üteme.** 🔍 **A UDP-s több forrás
   ÁTVIZSGÁLVA** ([`udp_tobb_forras_atvizsgalas.md`](docs/udp_tobb_forras_atvizsgalas.md), **79. mérés**): ⛔ a mai élő úton
   két egyidejű munka ugyanarra a fájlra minden szeletet kétszer hoz (×1,0 a közös munka ×1,6-ja helyett), és a lezárásért
   versenyez. ✅ **D114** (Csaba: T2 „(B) Aktívan, korlátosan”) — **a UDP-s több forrás MEGÉPÜLT**: a közös munka-jegyzék
   lenyomatonként (a randevú és a kérelem törzse; itt áll a „3 egyidejű átvitel”), a befejezetlen fájlok további tartói a kör
   céljai közé (≤ 2 / kör, ≤ 3 / fájl), a rossz szelet tanulsága és a türelem a forrásokból a UDP-n, a birtoklás jegyzete a
   tábla-aláíróval, korlátosan (elágazás 183); ⛔ közben javítva: a fájl-randevú a kiszolgálási kereten (eddig csak a csere
   könyvelődött — D109 KK4; elágazás 184). ✅ **D115 — a kopogás saját üteme** (a 41. mérés (a)-ja; **80. mérés**,
   `korUtemMeres.js`): a tábla, a címjegyzék és a házimunka HÁTTÉR-munka (egyszerre egy, a kör nem várja meg), és a
   fordulón legfeljebb 3 mp-cel túlcsúszott kör után a következő azonnal indul — 8 fordulóból 0 kimaradt (előtte 1, mindig az
   induló körben, amikor az új címét írja a táblára; elágazás 185). ✅ **D116 — a felderítetlen rész** (Csaba, 2026-10-22, a
   felderítés kézi próbája előtt: „(B) Gyerekszám + össz-darab”; **81. mérés**, `darabMeres.js`): a részfa-fa három összeget visz
   ([pont, darab, gyerek]), a fejléc az alatta lévők számát is hozza (a gyökér köti, a szúrópróba a darab és a gyerek szerint is
   vesz mintát — a mély kérés +9–12%), és a felület egy segédből mondja ki, mi maradt felderítetlen (a kártyán „▾+N”, a
   testvér-jelző alatt, a Struktúrában, a Síkidomban, a Felderítések ablakában — böngészőben végigjárva egy ideiglenes „alap”
   készülékkel, 2026-10-23); közben javítva: a minták születése nem kerül a tárba (elágazás 186–187). ⛔ **Csaba lelete
   (2026-10-23):** a telefon „felderítés nélkül” az egész koinót (475) áthozta — a lapos (ágazati) lista bejárója a TELJES sor
   biztosságáig kért és percenként újrakérdezett; javítva: a bejáró csak addig kér, amit a nézet mutat (az oldal vége, a
   Struktúra kerete, a felderítés K-ja — elágazás 188). ✅ **D117** (Csaba: „(B) Az első 200-at”): a Struktúra magától csak az
   első 200-ig kér (mint egy alapbeállítású felderítés), a többit a „+N” jelek mutatják és a felderítés hozza (elágazás 189).
   ✅ Csaba próbája után (2026-10-23): a kártyán MINDIG a leszármazottak (▾) és a testvérek (↔) ismert száma, a hiány halványan
   mellette; az alsó sáv a kérelemmel jött tudás után is frissül (a csere-állapot `tudas` változata — elágazás 190). ✅ És
   (2026-10-23): az alsó sáv semmit nem takar (a valódi magassága — telefonon több sorba törik), a Tudatpontok lista
   lapozva („További”), az alsó sávon a még nem ismert entitások („🔭 N”) — elágazás 191. Csaba kérdésére: az össz-pont a TÉNYLEGES (a tartó bemondása), nem a helyben ismertek összege; a
   teljes szerkezet minden készüléken a 9. szabályba ütközne. ⏸️ Az IPv6 Csabánál (a kérdése:
   „miért kell?” — a válasz: nem kell, egy második út a két mobilnet közé, aminek az értéke a terepen derülne ki).
   ⭐⭐ **A KÖVETKEZŐ PILLÉR: A KÖLTÖZÉS** (Csaba, 2026-10-23: *„akkor legyen a kőltözés, de mielött elkezdjük beszéljük át,
   alapossan”*) — 🔍 **ÁTVIZSGÁLVA** ([`koltozes_atvizsgalas.md`](docs/koltozes_atvizsgalas.md)): a forráskód-kormányzás 4.
   lépcsője (a D9 önfrissítése helyett), és a D66 óta a súlypontja. ✅ **D118** (Csaba, 2026-10-24: *„mind a hatot
   elfogadom”*): **a múlt közös, a jelenlét személyes** — az új koinó a szülőjére épül (a szülő múltja a vágásig, átírás
   nélkül, az entitások a régi nevükön), súlyt csak a költöző hoz (egy beköltözés-aláírással), a lezárt döntés múlt, a
   nyitott a költözőkkel folytatódik, a tagság és a 2. lépcső a vágáskor öröklődik, a zártság is; **a szabályok a koinó
   születésében, a koinó neve a születés lenyomata**; a költözés két esemény (ki- és beköltözés — a kiköltözés a pénz
   kivezetésének helye). ⛔ **LELET (mérve, 2026-10-24):** a koinó neve ma szabad szöveg, és egy kívülálló EGYETLEN azonos
   nevű `KoinoLetrehozas`-szal (a cserén is) az alapító — és így minden tag — döntéseit „nem ellenőrizhetővé” tette (az
   állapot az utolsó, a tagság az első születést veszi; élő koinó ma nincs) — a D118/2 zárja. ⏸️ **Csabánál KZ1–KZ5** (a
   paraméterek besorolása · ki hozhat létre gyermeket · ha a hozott pontok nem férnek · a hibajavítás, ami eredményt
   változtat · a protokoll-törés). ✅ **KZ1–KZ5** (Csaba: *„miden javaslatodat elfogadom, kezdheted az elsővel”*) — mind a
   javaslat szerint. ✅ **①a a koinó neve a születés lenyomata** (2026-10-24, elágazás 193): az új alakú születés koinó-mezője
   üres, minden más esemény a születés azonosítóját viszi; a kód koinó-hasonlításai egy segédet hívnak (`esemenyKoinoja`), a
   születést EGY szabály választja (`koinoSzuleteseListabol`); a kapu elveti a lenyomat-nevet mondó születést; a
   `KOINO_AZONOSITO` helyi becenév (`becenevek.json`), a mappa a koinó neve; `koino` (új alakban; argumentum nélkül a név),
   `csatlakoz <név>` (a belépés ELŐTT — a belépés a koinó nevére szól), a `behoz` egyértelmű fájlnál csatlakozik. ✅ **①b a
   szabályok a születésben** (2026-10-24, elágazás 194): a keret, a kategória-korlát, a tanúsítás-szám, a felhatalmazás
   alapértéke és a küszöbök alapértékei a születés `szabalyok` mezőjében (`koinoSzabalyok.js` — a kapu csak ismert kulcsot,
   a határon belüli egészet enged; a keret ≤ a mai 10 000); ⭐ a program az új születésbe MINDET kiírja (+206 B), és ⛔ az
   `ALAP_SZABALYOK` SOHA nem változik (csak a régi alakú és a még meg nem érkezett születésé — különben a régi koinó két
   programon kettéhasad: a 15. mérés megismételve); a számítás mindenütt a koinó számával (a mérés egy helyet talált, ahol
   még nem: a keret második vizsgálata); `koino "<név>" … tudatpontKeret=500 elfogadasiKuszob=66`. ⛔ A meghívó-szám NEM
   szabály — a modell része, rögzítve 1 (Csaba: *„igen, maradjon 1 egyenlőre”*). ✅ **②a a gyermek születése** (2026-10-24,
   elágazás 195 — `koinoLanc.js`; az építési alak az átvizsgálás 8. szakaszában): a születés `szulo` + `szuloTagsag` (a
   létrehozó tagsági lánca a szülőben, a szülő születése NÉLKÜL — különben egymásba ágyazva minden őst hozná); a kapu a
   szülő születésével együtt ellenőriz (KZ2, zárt szülőnek csak zárt gyermeke), a születések lánca a gyökértől utazik (a
   születés-szelet, a kézi út; a fájl koinója a lánc legfiatalabbja); `koino "<név>" … szulo=<szülő>` — a szülő szabályait
   és zártságát örökli, és ⭐ a születés a létrehozó szülőbeli LÁNCÁT folytatja (egy új 1-es sorszám elágazásnak látszana).
   ✅ **②b a kapu koinó-szabálya** (elágazás 196): az ős vágás előtti eseményei a gyermek tárában és cseréjében — a
   létrehozóé a lánc-pont, mindenki másé az óra szerint; EGY segéd (`koinohozTartozik`) a `beolvasztas`-ban és a szelet
   halmazában. ⚠️ A számítás a múltat még NEM veszi figyelembe; az átmeneti tár, a lánc-ellenőrzés, az észlelő a név
   szerint szűr (az ⑤). ✅ **KZ6** (Csaba: *„elfogadom a javaslataidat, mehetünk tovább”*): a nem költöző nyitott javaslata
   nem folytatódik. ✅ **③ a két réteg a számításban** (elágazás 197 — `ketReteg.js` `koinoKepe`: a parancssor, a pakli és a
   művelet ugyanazt hívja): a múlt nemzedékenként, az ős szabályaival, a vágáskor — a lezárt döntések rögzítve
   (`rogzitettek`); a jelenben a szerkezet mindenkié, a súly csak a költözőké, a lánc-pontjukig, nemzedékenként
   (`jelenbenSzamit`); ⭐ a létrehozó a születésével költözik. 83. mérés: a gyermek első képe ~1,6× a szülő nélküliének, a
   gyorsítótárral kisebb. ✅ **④a a ki- és a beköltözés eseménye** (elágazás 198; az alak az átvizsgálás 10. szakaszában):
   `Kikoltozes` a szülőben, `Bekoltozes` a gyermekben (a szülőbeli láncot a vágás előtti utolsó esemény után folytatja, a
   vágáskori tagsági bizonyítékkal; `elhagy` — KZ3 (A)); a kapu a koinó és a szülő születésével ellenőriz (a csomagban utazót
   is — különben egy hamis beköltözés ingyen tagságot adna); a beköltözés tagsági horgony (D118/3); a kép a beköltözésekből
   tudja, ki költözött. ✅ **④b a `koltozes` parancs** (elágazás 199; 82. mérés: a beköltözés ~1 KB tagsági lépésenként, a
   születés-lánc ~0,8 KB nemzedékenként): `koltozes <gyermek> [elhagy=<az>,…] [fájl]` — a kiköltözés a szülőben, az első
   kitöltés (a láncom a lánc-pontig és a hozott szeleteim múltja), a beköltözés a gyermekben, a kézi út; ⭐ a létrehozó is
   (a `koino … szulo=` a hozott múltját is viszi). Két készüléken mérve: a csere után a másik készülék a beköltöző súlyával
   számol. ✅ **④c a 2. lépcső öröklése** (elágazás 200): a beköltözött és a létrehozó tanúsíthat-e / 2. lépcsős-e kérdése a
   szülőben folytatódik (a szülőbeli horgonyára, a szülő szabályaival, a vágáskori állapot); ⛔ a gyermek születése nem
   alapító kör (4.2 — eddig a létrehozó a születéssel tanúsíthatott és 2. lépcsős lett). ✅ **⑤a a vállalás, a kereső-réteg
   és az átmeneti tár a hozott entitásokra** (elágazás 201): a beköltöző tartja a hozott gondolatait (eddig „nem tartod”), a
   hozott gondolat kereső-bejegyzése a gyermekben elfogadott (eddig „más koinó eseménye”), az átmeneti tár megtartja az ős
   eseményét. ✅ **⑤b a szerző LÁNCA a koinóban** (elágazás 202 — `koinoLanc.js` `lancbanVan` / `lancNezete`, egy szabály a
   lánc-végnek — `esemenyTar.js` `ujSajatHelye`, a művelet és az író —, a lánc-gyökérnek, a koinó képének és a
   lánc-ellenőrzésnek): három mért lelet zárult — a költöző gyermekbeli eseményének nem volt lánc-gyökere; a hazug bemondása
   csak jelzés volt (a jelenből kizárt esemény hézagnak látszott — most ismert sorszám); ⛔⛔ a nem költöző gyermekbeli
   gondolata eltűnt, amikor a szülőbeli múltja megérkezett (most a láncon kívüli ős-esemény külön lánc-ág, és a gyermekbeli
   lánca 1-ről indul); a `koltozes` a kiköltözés ELŐTT elutasítja, aki a gyermekben már nem költözőként él. ✅ **⑥ a
   felület** (elágazás 203): a tér kártyáján a családfa (↑ a szülő, ↓ a gyermekek, a költözéseim — ⛔ lelet: a tér a
   beköltözést nem vette horgonynak), a fő menüben a „🧳 Költözés…” ablak (a gyermekek, a kerete, a hozott pontok, az
   elhagyás KZ3-ra élő összeggel, megerősítés); a parancs és a lap ugyanazt hívja (`koltozesVegrehajtasa`, `GET`/`POST
   /api/koltozes`); böngészőben végigjárva. ⭐⭐ **A KÖLTÖZÉS (D118) MEGÉPÜLT.** ⏭️ **Csaba kézi próbája:** a laptopon új
   koinó (`koino "<név>"`), a telefon frissítése és `csatlakoz <név>`, gyermek (`koino "<név>" … szulo=…`), költözés a
   lapról. ⚠️ Gyermeket a lapról nem lehet létrehozni (a koinó létrehozása ma parancs). ⚠️ A D94 szúrópróba a szülőbeli
   bemondásokat követi — a nagy zárványú költöző a gyermekben „nem ellenőrizhető”, amíg azok nincsenek meg. ⚠️ A laptop–telefon próba-koinója (`sajat`, régi alak) nem folytatható — a
   következő kézi próbához új koinó kell (`koino "<név>"`, a telefonon `csatlakoz <név>`). Elágazás 192–196.
2. ⏸️ **A terep 🅱️ (két mobilnetes telefon)** — Csaba (2026-10-19): *„ezt hagyjuk ki”*; előtte a telefon frissítése (lent).
3. **Az „UTÁNA” lista** (lent).

✅ **A D101 ④ Síkidom bekötés-próbájának szeszélye — az oka megvan (2026-10-24):** a próba azt várta, hogy B ismeri az R1 saját
pontját („a gyökér-darabbal”), pedig azt a gyökér-kérelem SZÚRÓPRÓBÁJA hozza, súlyozott véletlennel (fele eséllyel A pontja,
fele eséllyel a gyerek-ág) — ~6%-ban egyik minta sem az, és a nem ismert saját pont helye 1 (60 − 1 = 59 a várt 30 helyett; a
teljes sor kimenete fájlban volt). A program jól számol; a próba most B tudásából várja a számot (és kiírja, melyik eset volt —
8 futásból egyszer „nem ismert”, zöld). ⚠️ A 2026-10-13-i bukás (lent) más alakú volt: a beállító lépés nem kapott választ.

⏸️ **Kisebb nyitottak (2026-10-24):** ⚠️ a D91/3 címjegyzék-próba a teljes sor terhelése alatt egyszer bukott: „rés nyílt, de a csere
a résen elbukott: A másik fél nem válaszol (10000 ms)” — ugyanaz a 10 mp-es tétlenségi óra, mint a lenti csere-próbáknál
(megnevezte magát); magában 3/3 zöld. MÉRENDŐ, nem hangolandó.

⏸️ **Kisebb nyitottak (2026-10-19):** ⚠️ a ⑦b próbájában a felület a teljes sor terhelése alatt egyszer nem írt ki semmit 15 mp alatt (magában zöld) — a `feluletet` segéd hibája most megnevezi magát (stderr, kilépési kód, eltelt idő). ✅ A ⑦b MÁSIK bukás-alakjának oka megvan és javítva (elágazás 181): az első próbálkozás egy épp újrainduló tartónál elbukott, és a régi szabály szerint a tartó a kérelem lejáratáig (2 óra) nem kapott újra esélyt — a „már próbáltuk” jel most 2 percre szól.

⏸️ **Kisebb nyitottak (2026-10-15):** telefon-szélességen az alsó sáv a prototípus stílusa szerint több sorba törik
(~5 sor, a képernyő negyede) — ✅ 2026-10-23 óta nem takar semmit (a lap a valódi magasságával számol); ha a mérete zavar, a
koinós többletben összecsukható · a „⏳ csere most” a kör csere-részét
mutatja (a kopogás után már a következő ablakot), a súgó a részleteket.

⏸️ **Kisebb nyitottak (a 2026-10-11 → 10-15-i sessionből):** ⚠️ (2026-10-13) a ④ Síkidom bekötés-próbája a teljes sor terhelése alatt egyszer
bukott: a BEÁLLÍTÓ lépés (az egy szintű gyökér-kérelem a frissen indított `figyel`-nek) nem kapott választ, és a próba a mért
viselkedésen bukott, az ok kimondása nélkül (magában 3/3 zöld) — a beállító lépés (`gyokerFejlecek`, a D102 próbájában is)
most legfeljebb kétszer újrapróbál, és ha így sem, a bukás megnevezi (rossz porton mérve) · ⚠️ (2026-10-13) a `csereProba`
„CSOMAGVESZTÉS MELLETT IS ÁTMEGY (30%)” próbája a teljes sor terhelése alatt egyszer bukott („a másik fél nem válaszol (10000 ms)”
— a tétlenségi óra); magában 5/5 zöld — ugyanaz a jelenség, mint a lenti lezárás-próbáé: a 10 mp-es óra terhelés alatt;
MÉRENDŐ (mi hallgat el 10 mp-ig 30% veszteség mellett?), nem hangolandó · ⚠️ (2026-10-11) a `csereProba` „a lezárás NEM dobhatja el az utolsó darabot (5×)” próbája a
teljes sor terhelése alatt egyszer bukott (a 10 mp-es tétlenségi óra — „a másik fél nem válaszol”); magában 5/5, a `csere`
témakör egészében 363/363 zöld — a bukásnak meg kell neveznie az okát, mielőtt bárki az időzítéséhez nyúl · egy egyszeri téves „0 új esemény” kiírás a telefonon (helyben nem jön
elő) · a D71 őrjárat-próba egyszer bukott a teljes sor terhelése alatt (magában 3/3 zöld, a következő teljes soron
is) · a `koinoPakli.js` csendes újrakérdezését csak böngészőben mértük (node alatt nem futtatható; a program oldalát a
D100 parancssor-próbája méri, egy végig futó felülettel) · a lap a még meg nem érkezett szöveget üresen mutatja
(a kiszolgáló kimondja: `szovegHianyzik`; a ház a törzset már elkéri, de a „még nem jött meg” felirat hiányzik).

#### ⏭️ UTÁNA — a sorrend Csabáé (változatlanul nyitva)

1. ⭐ **A 🅱️ változat (két mobil):** dönt a kimondott feltevésről (két cél-függő NAT).
2. ✅ **A UDP-s több forrás** (D68 / 6. → D114) · 3. ⏸️ **IPv6** (kettős kapu — Csabánál) · 4. ✅ **A kopogás saját üteme** (41., 45. → D115).

#### ⏸️ Ami nyitva maradt (terep és próbák)

- ⏸️ **A TELEFON FRISSÍTÉSE A TEREPI TESZTELÉSKOR** (Csaba, 2026-10-09: *„ezt majd akkor frissítjük, ha már készen áll a program, a terepi teszteléshez.”* — a fejlesztés közbeni protokoll-törések miatt NEM kell emlékeztetni; a telefon a tiszta törés óta nem cserél a laptoppal, egy frissítéssel minden megy). ⏸️ **A két mobil NAT
  közötti rés** még nincs mérve (lásd a feltevést fent). A telefon frissítése:
  `cd ~/koino_1.1 && git fetch --depth 1 origin main && git reset --hard origin/main && node koino/meres/mind.js > ~/probak.txt 2>&1; tail -3 ~/probak.txt`
  ⚠️ *Előtte a Termuxban `termux-wake-lock` — alvás közben a próbák lelassulnak.*
- ⏸️ **Négy időzítés-érzékeny próba** egyszer-egyszer bukott a telefonokon (2026-09-26-án a
  telefonon kétszer is minden zöld volt): meg kell nevezniük a bukásuk okát, mielőtt bárki
  hozzányúl az időzítésükhöz.
- ⏸️ **Robusztusság (mérendő):** a bekopogóra EGYETLEN visszakopogás megy; ha az vagy a rá jövő
  HALLAK elvész, a kör *„rés nyílt, de a csere elbukott”* lesz (a következő menet pótolja).
- ⏸️ **A sikerszámlálás javítása** (a UDP-sikereket a TCP-kör felülírta) magától jött a TCP-kör
  kivételével; külön próbája nincs.
- ⏸️ **A D72 A-ból maradt (a D lépés része):** a `hozd` csak az eseményeket hozza, a szöveg-darabot
  nem (a következő randevú hozza) · a felület a még meg nem érkezett szöveget üresen mutatja (a
  kiszolgáló kimondja: `szovegHianyzik`, a lap még nem írja ki).
- ⚠️ **A telefon + laptop teszt-koinója (`sajat`) régi alakú eseményeket hordoz** (a 09-06-i
  átnevezés és a D42 előttről) — a két terepi gondolat ezért nem számít (esemény nem írható át);
  az új pont-események a javítás óta már igen.

#### ⛔ A munka módja (Csabával)

- **Ne kérj engedélyt** — commit, push, a következő lépés: csináld, és számolj be (lásd lent:
  *„ENGEDÉLY ELŐRE"*). A D-szintű döntés Csabáé, azt **döntési kérdésként** tedd fel.
- **Magyarázatnál folyó szöveg, ne táblázat** (Csaba kérése).
- **Fájlonként add hozzá**, ne `git add -A` (más session munkája is állhat a könyvtárban).
- **Commit-üzenet fájlból:** PowerShellben a `-m` idézőjelei eltörnek — az üzenet egy fájlba,
  és `git commit -F`. ⚠️ **Ne a `.git/` alá** (Csaba, 2026-09-26): azt az app érzékeny helynek
  veszi, és engedélyt kér rá — *„ne kérj engedélyt semmire"*. A session ideiglenes mappája
  (scratchpad) jó. **Abszolút útvonalak** (a .NET más
  munkakönyvtárból dolgozik: egyszer egy üres `koino/CLAUDE.md` lett belőle).
- ⛔⛔ **A PRÓBÁK RENDJE (Csaba, 2026-10-01):** session-nyitáskor („nézd át") **NEM futtatunk próbát**;
  fejlesztés közben **témakörönként** (`node koino/meres/mind.js <csoport>` — lásd *Futtatás → Önpróbák*); **a teljes sor** csak
  ha KÖZÖS réteg változott (az esemény alakja, a kapu, a tár, a szabály-réteg), vagy egy lépés
  lezárásakor, commit előtt. *(Miért kell mégis a teljes: a D81 alakváltása egyszerre három csoport
  próbáit törte el.)*
- **A teljes próbasor kimenete fájlba** (`node koino/meres/mind.js > …txt 2>&1`): egy
  szeszélyes bukás csak így nézhető meg utólag.

#### ⛔ Tartós elvek (Csabától — a naplóból ide emelve)

- ⭐ **ENGEDÉLY ELŐRE (Csaba, 2026-09-25):** *„ne kérj engedélyt semmire. mindenre engedélyt adok
  előre."* — commit, push, a következő lépés: **kérdezés nélkül**. A válasz végén ne legyen
  „mehet?" / „pusholhatom?". *(A D-szintű tervezési döntések továbbra is Csabáéi — azokat
  döntési kérdésként kell elé tenni, nem engedélykérésként.)*
- ⭐⭐ **AZ ALAPPILLÉR ELVE (Csaba, 2026-09-27):** *„csináljunk meg minden alap pillért, amire épül
  valami. […] a fejlesztés iránya tele lesz elágazással, ezért jól kell dokumentálni, hogy miről
  ágaztunk le, és miért. szóval akkor a merkle-fát se halogassuk, ha már építenénk rá."* ⭐ Vagyis: amire
  egy következő lépés épül, azt NEM halasztjuk „majd később"-re (a 9. szabály testvére); és minden
  elágazás bekerül a [`docs/alappillerek.md`](docs/alappillerek.md) 5. szakaszába (mikor, miről, mire,
  miért, hol a részlet).
- ⛔⛔ **A SORREND ELVE (Csaba, 2026-09-15) — egy friss session ösztönösen ez ellen fog
  javasolni:** *„nem kell, hogy minél hamarabb használható legyen. Az a lényeg, hogy a
  **megfelelő sorrendben** fejlesszünk, nem az, hogy minél hamarabb lássak valamit."*
  ⭐ Vagyis **ne** ajánlj „gyors győzelmet" vagy demózható funkciót azzal, hogy *ettől lesz
  hamarabb használható*. A sorrendet a **függőségek és a szerkezet** döntsék el (9. szabály: a
  szerkezetet nem lehet utólag beletenni), és a választás Csabáé.
- ⛔⛔ **A PRÓBA MÓDSZERE:** egy zöld próba önmagában nem bizonyíték — **kapcsold KI, amit mérni
  akar (rontás-próba), és ha nem bukik, A PRÓBA a hibás.** Minden ágra külön. Amit csak
  modul-próba mér, arról nem tudjuk, hogy a program használja-e (4. szabály-hiány: *a réteg
  kész, az éles út nem hívja* — ez a napló leggyakoribb lelete), ezért a bekötést
  **parancssor-próba** méri, ami VISELKEDÉST néz (a másik készülék lemezét), nem feliratot.
  Egy szeszélyes próba vagy a próba, vagy a program hibáját takarja — **mérni kell, nem zöldre
  hangolni**, és a bukásnak meg kell neveznie magát.
  ⚠️ **Ami hosszan fut (a felület, az őrjárat), azt hosszan futó folyamattal kell mérni** (D100, elágazás 101): egy
  minden kérdéshez újraindított folyamat mindent frissen lát, és elrejti, amit közben egy MÁSIK folyamat írt — a ház
  bekötés-próbája így nem vette észre, hogy a futó felület nem látja az őrjárat hozta választ.
- ⛔ **Előbb a mérés, aztán az építés** — a mérések jegyzőkönyve:
  [`koino/meres/eredmenyek.md`](koino/meres/eredmenyek.md) (számozott, 1–83.).

#### ⏸️ Régebbi nyitott döntések (mind Csabáé — részletek a naplóban)

- **A véletlen séta** — a társakat még nem kérjük el egymástól (35. mérés: nagy méretnél ez
  tartja egyben a hálót).
- **Olcsóbb tábla-kulcs** (ujjlenyomat + teljes kulcs csak az első találkozáskor): ~190
  bájt/kör, de protokoll-bonyolítás — ma nem kell.
- **A „kurbli":** az első találkozás kézi marad (`tars <cím>`, helyi felfedezés, pajzsfúrás).
- **A fájl-bájtok kézi útja** (`fajlKivisz`/`fajlBehoz`) — a `kivisz`/`behoz` csak eseményt visz.
- **`FAJL_KORLAT`** (ma 2 MB, kiindulás; nem állapot-befolyásoló állandó, D66).
- **A maradék modálok** (5.8) — [`docs/szakasz5_terv.md`](docs/szakasz5_terv.md) „ITT TARTUNK".
- **A hívás ötlete** (2026-09-13) — [`docs/jegyzetek.md`](docs/jegyzetek.md).
- **Kérdezzen-e a szabály-réteg tagságot?** Ha igen, a válasz nem lehet „kidobom": P2P-n a
  *„nem tag"* és a *„még nem láttam a bizonyítékát"* ugyanaz (`nemEllenorizhetok`, D19).

#### 📚 Hol van a többi

- **A munka története** (2026-09-06 – 2026-09-25: mérések, átnézések, javítások, döntések
  indoklása): [`docs/claude_naplo.md`](docs/claude_naplo.md) — a CLAUDE.md 2026-09-25-i
  karcsúsításakor került oda, **szó szerint**. Ha egy döntés *miértje* kell, ott keresd.
- ⭐ **Az alappillérek és az elágazások naplója:** [`docs/alappillerek.md`](docs/alappillerek.md) — mi áll,
  mi hiányzik (függőségi sorrendben), és miről ágaztunk le, miért. **Új elágazásnál ide is írj.**
- **Induláskor, ha a nagy kép kell:** [`docs/utiterv.md`](docs/utiterv.md) (mit építünk, milyen
  sorrendben, és miért) → [`docs/fejlesztesi_terv_fazis2.md`](docs/fejlesztesi_terv_fazis2.md)
  („HOL TARTUNK" + a D1–D118 döntések) → a szakasz-tervek (`docs/szakasz1_terv.md` …
  `szakasz5_terv.md`). A gépezet ábrákon: [`docs/gepezet.md`](docs/gepezet.md).
- ⚠️ **Új session-váltáskor** a fenti „SESSION-VÁLTÁS" blokkot **cseréld le**, ne fölé írj
  újat — a régit (ha kell) a napló tetejére tedd. *Így maradt 233 KB-os ez a fájl.*

## 🪪 Az identitás szerkezete és a zsákutcák (Szakasz 4 — lezárva)

⭐⭐⭐ **A SZERKEZET, EGY MONDATBAN (D56):** *az 1. lépcső olcsó, mert a kapu úgysem véd; a 2. lépcső drága, mert ott a zsákmány; és a védelem egyikben sem a kapu, hanem hogy a rossz tanúsító elveszíti a szerepét.*

- **1. lépcső — a tagság:** **egy meghívó**, és minden mehet (gondolat, tudatpont, javaslat, szavazat).
- **2. lépcső — a pénztárca:** **három tanúsítás** felhatalmazott tanúsítótól. Ez a **D11** megvalósulása: *a pénz csak bizonyított identitás után.*
- **A felhatalmazás (D57/b, D60):** 2. lépcsősök adják, **emberenként egyet**; a küszöb `N` **kimondott szám** — a 2. lépcsősök érték javaslatainak mediánja —, nem mért rangsor. ⭐ **Megbízás, nem pontszám:** a felületen *„27-en bízták rá a tanúsítást"*, soha nem *„becsületesség: 27"*.
- **Az ellenőrzés a gyökérig megy (D59):** mérve **olcsó** — 17,7 → 30,1 → 40,7 ős 1500 / 6000 / 20 000 főnél, vagyis **logaritmikus** (kettőzésenként ≈ +6). A `D` mélység-korlát **elhagyható biztonsági szelep**, nem szükség.
- **A jelzés: „MÉG NEM ÉRTÜNK ÖSSZE"** — tény, szimmetrikus, és **önjavító** (ha bemutatkoznak, eltűnik; hamis azonosságnál nem).

⛔⛔ **AMIT A 2026-09-06-I MÉRÉSEK MEGDÖNTÖTTEK — ezeket NE hozd vissza** ([`koino/meres/eredmenyek.md`](koino/meres/eredmenyek.md) 11–12.): **a belépési szám NEM védelem, hanem árcédula** — a fal pontosan ott van, ahol a megtévesztettek száma eléri a kért meghívó-számot (4-nél 0 hamis, 5-nél 880) · **a jogosítási küszöb ELREJTI a szigetet** (100%/0% helyett 91%/16%), mert minden hamisat egy valódi emberhez kényszerít — *egy teljesítendő küszöb egyben hitelesítő pecsét* · ⛔ **és a SÉTA a leggyengébb láncszem, nem a legerősebb**: sok megtévesztettnél 43–74% / 31–61%. **A D50 tenger-gondolata áll, de NEM ő a védelem.**

⭐⭐ **A VÉDELEM A KONTRASZT:** *„hány olyan embert tanúsítottál/ismersz, akinek nincs önálló élete a közösségben?"* — a becsületes alapvonal **0,3**, a megvett tanúsítóé több száz. **100% / 9–25%, mind a hét támadó-változat és mindhárom arány ellen.** ⭐ És olcsó: nem kell hozzá séta, se élő kapcsolat.

⭐⭐⭐ **ÉS A TÖRVÉNY, ami az egészet lezárja:** a visszacsatolással (a közösség visszavonja a megbízást) a kár **880 → 120**, és **kár = a támadó üteme × az ébredés ideje** — 40 · 120 · 240 · 440 a 0/2/5/10 körös késésnél. **Lineáris, nem exponenciális: a hurok mindig bezárul.** ⭐ Ezért a gépi segítség értéke **az ÉSZREVÉTELBEN** van, nem a döntésben.

⚠️ **Zsákutcák, amiket ne javasolj újra** (mind megmérve): a Duniter-féle távolság-szabály (globális szám) · az „ingyenes elismerés" (D48) · **a gazdaság önmagában nem véd** · a horgony-kör (880 hamis horgony) · ⛔ a *„kevés kapcsolata van, tehát gyanús"* jelzés (31/41/45% téves) · ⛔ **és a `k` tanúsítás + keret vonala** (D44, D51–D53) — **tárgytalan**, a meghívás váltotta ki.

A tervezési döntések (**D1–D118**; a D48 elvetve, a D64 is, a D44/D51/D53 tárgytalan) a fázis-2 tervben állnak. A milliárdos lépték szerkezete: [`docs/skalazas_terv.md`](docs/skalazas_terv.md) (2026-08-31 — tervjavaslat, kilenc döntést igénylő ponttal). **Az irány két réteg:** a **DAG** a hitelességé és offline is működik · a **kereső-réteg** a megtalálhatóságé, hálózatot kíván, és **elhagyható**. ⭐ *Ami DÖNT valamiről, az soha ne kívánjon élő lekérdezést; csak a MEGTALÁLÁS kívánhat.*

## 🛠️ NYOLC SZABÁLY, ami MINDEN új kódra érvényes (D30–D32, 2026-08-28)

A koino nem támaszkodhat arra, hogy egy platform-tulajdonos (Google, Apple, böngésző-gyártó) megengedi a működését. Az indoklás és a teljes fenyegetés-elemzés: [`docs/platform_fuggetlenseg.md`](docs/platform_fuggetlenseg.md). **Ezek ellenőrizhető szabályok — kódolás közben tartsd be őket:**

1. **A szállítás cserélhető marad.** A csere-logika (`js/csere/csere.js`) SOHA ne importáljon hálózati kódot; új szállítás a `vonal.js` MELLÉ kerül, ne bele a logikába.
2. **Semmi ne múljon egyetlen címen vagy szolgáltatáson.** Nincs beégetett koino.hu, jelzőpont, STUN, továbbító. Ha ilyen kell, legyen cserélhető és elhagyható.
3. **A bizalom sose a csatornából jöjjön.** Eseményt soha nem fogadunk el azért, mert „megbízható helyről jött" — egyetlen kapu van: `esemenyMentese`.
4. **Legyen mindig kézi út.** Minden automatikus cseréhez tartozzon fájlba mentés / fájlból olvasás. **Ha egy funkció csak online tud működni, az fojtópont.**
5. **Ne épüljön folyamatos kapcsolatra.** ⚠️ *Csaba helyreigazítása (2026-08-29): a döntés NEM feltétlenül napokban mér — lehet órákban is, a tudatpont-változás még sűrűbben. **A lassúságra tehát nem szabad védelemként hivatkozni.*** A szabály viszont áll: ami **másodperces élő kapcsolatot** kívánna (mindkét fél egyszerre online), az visszahozza a törékenységet — ezért postaláda kell, nem élő továbbító (D34).
6. ⭐ **Nulla függőség — és a méret ott számít, ahol UTAZIK.** *(Szétválasztva 2026-09-06, Csaba döntése: „**az adat-csomagnak** kell kicsinek lennie. A telepítendő programnak nem kell kicsinek lennie.")*

   - ⛔ **KEMÉNY: nulla függőség.** Ma **0 npm-csomag**, és ez nem alkudható. Minden új függőség egy újabb fojtópont — valaki más dönthet arról, fut-e a koino. A kriptográfia is ezért a beépített WebCryptóból jön.
   - ⛔ **KEMÉNY: az ADAT-csomag kicsi marad.** Ez a valódi szűk keresztmetszet: a programot egyszer töltöd le, az adat **minden nap utazik** — a telefonodon, a mért hálózaton, a lassú vonalon. A mai mércék: egy esemény **~400 bájt** · egy „nincs újdonság" csere a résen **1,2–1,7 KB** (43. mérés, terepen — TCP-n 334 bájt volt; ⚠️ D89/1 óta titkosítva +~0,4 KB: kézfogás, csomagonként ~18 B, az aláírás — 57. mérés; D95/4 óta a gyökér-darab jele +76–100 B) · a **D21** szerint ~**1 KB/fő** a saját lap (az újjáépítés magja). ⚠️ **Új eseménymezőnél, új protokoll-üzenetnél EZT kell megnézni**, nem a mappa méretét.
   - 🟡 **LÁGY: a program mérete.** Ma **331 fájl, 6403,3 KB** — ⚠️ *ebből a `felulet/` 146 fájl / 1603,8 KB (2026-10-22), ami 2026-09-06-án érkezett: **örökölt, változatlan** kártya-kód és CSS a prototípusból (5.3).* Nem korlát, de érték: ekkora program **elfér egy üzenetben, és bárki újraírhatja** — ez a fojtópont-védelem másik fele. A felülettel (Szakasz 5) nőni fog, és **ez rendben van**; a szám itt attól hasznos, hogy tudjuk, hol tartunk.

   ⚠️⚠️ **A PROGRAM-MÉRET MÉRCÉJE: a FÁJLOK BÁJTJAINAK ÖSSZEGE, nem a lemezfoglalás.** A `du -sk koino` **920 KB**-ot mond ugyanerre a mappára, mert lemezblokkokat számol (39 fájl × félig üres utolsó blokk). A kettő nem hiba, hanem két különböző kérdés — de csak az egyik az, ami „elfér egy üzenetben". A mérés:
   ```bash
   echo "$(find koino -type f | wc -l) fajl, $(find koino -type f -exec cat {} + | tr -d '\r' | wc -c | awk '{printf "%.1f KB", $1/1024}')"
   ```
   ⛔ **SORVÉG NÉLKÜL (2026-09-27 este, átnézés):** a Windows-munkakönyvtár a git `autocrlf`-je miatt
   CRLF-et tart, de VEGYESEN (amit egy eszköz újraírt, az LF lett) — a nyers bájtösszeg így attól
   függött, mivel szerkesztettünk: ugyanarra a tartalomra 3361,9 (LF) · 3395,4 (a dokumentált,
   vegyes) · 3436,4 KB (csupa CRLF). ⭐ A mérce a TARTALOM: ahogy a git tárolja és a telefon (Linux)
   kicsekkolja — LF-fel. *(A korábbi számok a régi `find … -printf '%s'` méréssel vegyes
   munkakönyvtárat mértek; a 2026-09-27 esti számtól kezdve CR nélkül.)* Ellenőrzés a commit után:
   `git ls-tree -r -l HEAD koino | awk '{n++; s+=$4} END {printf "%d fajl, %.1f KB\n", n, s/1024}'`.
7. **A böngésző csak kliens lehet, sose előfeltétel** (a D29 pontosítása).
8. **Ne tervezz jogi védelemre.** Ha egy érv így kezdődik: „ezt úgyis megtiltja a szabályozás" — az érv nem érvényes.

## ⛔ ÉS EGY KILENCEDIK, AMI A TÖBBI FÖLÖTT ÁLL (Csaba, 2026-08-31)

> **A skálázhatóság szempontjából az első verziónak IS késznek kell lennie.**

⚠️ **A D13 („nem kell az első verziónak tökéletesnek lennie") NEM vonatkozik erre.** A D13 a *funkciókra* és a *paraméterekre* igaz — a **szerkezetet** viszont nem lehet utólag beletenni. A D22 ezt már kimondta: *„az első kiadás is milliárdra képes program, csak kevesebb emberrel"*, a D21 pedig: *„a szeletelés nem »később, ha a méret kikényszeríti«, hanem az első naptól a tervben van"*. **A lefelé skálázás olcsó, a felfelé nem.**

⭐ **A különbségtétel, amitől betartható:** a **SZERKEZET és az ILLESZTÉS** az első naptól milliárdos; **a megvalósítás mögötte lehet egyszerű**.

🔍 **Ellenőrizhető alak — ezt kérdezd minden új darabnál:** *„Ez mit csinál egymilliárd e-embernél?"* Ha a válasz **„akkor majd kicseréljük"**, a darab **nincs kész**.

⚠️ *Ez a szabály azért került ide, mert Claude 2026-08-31-én pont ezt javasolta („indulj a maival, cseréld később"), és Csaba elutasította. Egy friss session ugyanezt fogja javasolni.* Az első, amit a szabály elkap: a tár-illesztő **`betolt()`** művelete az ÖSSZES eseményt adja vissza — vagyis **nem a fájlformátum a hiba, hanem az illesztés**; gyorsítótárral is csak a rossz kérdés lesz gyorsabb. Részletek: [`docs/skalazas_terv.md`](docs/skalazas_terv.md) 0. szakasz.

⭐⭐ **ÉS A VÉGTELEN (Csaba, 2026-09-26):** *„az nagyon fontos, hogy úgy tervezzünk meg mindent, hogy végtelenig lehessen skálázni."*

🔍 **A „végtelen" ellenőrizhető alakja — élesebb, mint a milliárd:** *egy készülék terhe (amit tárol, amit naponta küld, ahány cserét csinál, amennyit számol) **ne a koino méretétől függjön**, hanem attól, amivel ő maga foglalkozik — a tudatpontjaitól, a kötéseitől, a saját szeletétől.* Ahol elkerülhetetlen (az identitás-ellenőrzés, a DHT keresése), legfeljebb **logaritmikusan** nőhet.

⚠️ *Ez a mondat azért került ide, mert Claude még aznap a D71 (iii)-ra azt javasolta, hogy „a V2 most megépül" — pedig a V2 az EGÉSZ koino egyetlen lenyomatára épült volna, ami nagy koinóban soha nem egyezik, tehát ott semmit nem spórolt volna. Ugyanaz a minta, mint 08-31-én: „működik most, és majd kicseréljük alatta".* ⭐ Ami ma a próbát kiállja: a kötés-háló (K korlátos), a kötés címei (≤3), a kapu jegyzéke (időben és darabra korlátos), a DHT-tábla (log N). ⛔ Ami nem: az egyetlen `esemenyek.jsonl` és a „mindenki mindent tárol" (skálázási terv **S3**), a koino-szintű lenyomat és a szerzőnkénti ÁLLÁS (**S4**).

⭐⭐⭐ **A MÉRCE: A KOINÓ SAJÁT HATÁRA (D106, Csaba, 2026-10-15 — *„az (A) a szabály, a drága helyen kimondott (B)-kivétel"*).** Kétféle korlát van. A **teher-korlát** egy készülék munkáját fogja meg (K = 3 kötés, 8 raj-tartó, 20 MB átmeneti tár, a bizonyítékok hossza) — ez a végtelen ESZKÖZE. A **méret-korlát** egy szám, ami a koinóval nőne, de rögzített szélességű — erre szól a szabály: **egy méret-korlát se legyen szűkebb, mint a koinó saját határa** — az azonosító-tér (egy entitás neve a 256 bites lenyomata; ~2^128 entitás fölött két név véletlenül egybeeshet, ennél többet a koinó semmilyen formában nem tud megkülönböztetni). Ahol ez drága, ott **kimondott kivétel** áll, a koinó szabályaiból levezetett felső mérettel (az e-ember élő, külön ember → ≤ az emberiség, ~10^10; élő entitás csak ponttal → ≤ e-ember × 10 000) és a tartalékkal — **itt, egy helyen**. ⛔ A „gyakorlatilag végtelen" nem érv (az IPv4 32 bitje is az volt): egy szám és egy indoklás kell. 🔍 **Minden rögzített számnál a kérdés: a koinó saját határa előtt áll-e meg?**
- ✅ **A gyökér-darab száma** (D106): 16 bit helyett a mélységhez kellő bit, legfeljebb 144 (`cimjegyzek.js` `GYOKER_MAX_MELYSEG`, BigInt; 16-ig bájtra a régi kulcs).
- ⚠️ **KIVÉTEL — a kanonikus alak „biztonságos egész" határa** (2^53 ≈ 9·10^15: `kanonikusAlak.js`, az összegző fa összegei, az össz-pont bemondása): egy ág össz-pontja (≤ e-ember × 10 000) **~900 milliárd e-emberig pontos — az emberiség ~87-szereséig**. A nagy egészek a kanonikus alakban formátum-szintű munka lennének. ⚠️ *A × 10 000 a tudatpont-keret: D118/2 (①b) óta a koinó születése mondja, ezért a kapu legfeljebb a mai 10 000-et engedi (`koinoSzabalyok.js` — nagyobb kerethez a kivételt újra kell számolni).*
- ✅ **A tagsági lánc mélység-korlátja** (D113): 64 → 256 (`MELYSEG_KORLAT`, a 2. lépcső szúrópróbájának útja is). ⛔ A tanulság: a korlátot a LEGMÉLYEBB tagra kell mérni, nem az átlagra — a 64-et az átlaggal számolva „~10^29–10^30 tagnál” érte volna el a lánc, a legmélyebb tag viszont (véletlen meghívónál a fa magassága ~e·ln n) már ~1,3·10^11-nél; a 256-ot a koinó saját határáig (2^128: ~234) sem (78. mérés).

## Domain-fogalmak (kötelező terminológia)

- **e-ember** — regisztrált tag; mindig így hivatkozunk rá, sosem „felhasználó"-ként.
- **tudatpont** — mindenkinek ugyanannyi van; nem elkölthető, csak szétosztható és bármikor átrendezhető. Prioritást fejez ki, NEM szavazaterőt (szavazásnál mindenki egyenlő).
- **gondolat** — a platform alapegysége; **kategóriák** és **gondolattípusok** (kérdés, válasz, témakör, ismeret, feladat...) rendszerezik.
- **javaslat** — entitástípus: módosítás, áthelyezés, törlés vagy egyesítés kezdeményezése egy gondolatra. Csak az tehet javaslatot, aki tudatpontot rendelt a gondolathoz. ⚠️ **A Fázis 2-ben ez „szerkesztési javaslat"** (D27) — mellette lesz **általános javaslat** is (a közösség álláspontja, nem entitás-változtatás). A prototípusban marad a régi név.
- **érték javaslat** — KÜLÖN fogalom, nem keverendő a javaslattal (entitástípus)! Mindig „érték javaslat"-ként hivatkozunk rá.
- **egyezmény** — elfogadott javaslat eredménye. ⚠️ A Fázis 2-ben **„szerkesztési egyezmény"** (D27), és **nem esemény, hanem SZÁMÍTÁS eredménye** (D17) — senki nem „mondja ki". Az **általános egyezmény** viszont **élő**: csatlakozni, tiltakozni, ütközést jelölni lehet hozzá.
- **küszöbértékek** — gondolatonként meghatározzák, mekkora támogatottság és részvételi arány kell az elfogadáshoz; minimum/maximum döntési idővel együtt.
- **bizonyossági mutató** — minél egyértelműbb az eredmény és magasabb a részvétel, annál hamarabb zárul a döntés (a min/max döntési idő között).
- **pakli** — kártyák (entitások) listázott megjelenítése a frontenden.

### ⛔⛔ A „javaslat" és az „egyezmény" ÖNMAGÁBAN GYŰJTŐNÉV (Csaba, 2026-09-07)

> *„Csak előszóval használjuk a javaslat és egyezmény szót, mert több mindenre is fogjuk használni. Amiről most beszélünk, az a **szerkesztésiJavaslat / szerkesztésiEgyezmény**."*

⭐ **A puszta szó a FELSŐ szint** — alá tartozik a **szerkesztési** (entitás-változtatás) és az **általános** (a közösség álláspontja, D27), és jönni fog több is. Amikor egy konkrét fajtáról beszélünk — kódban, kommentben, doksiban, felületen —, **oda kell írni a jelzőt**.

Mit jelent ez a gyakorlatban:

- ✅ **Marad gyűjtőnév** (mert tényleg mindkét fajtára vonatkozik): a `Javaslat` **esemény-típus** (⛔ átnevezni tilos — minden meglévő tárat érvénytelenítene, és a `fajta` mező amúgy is megmondja, melyikről van szó), a `js/allapot/javaslatSzamitas.js` (mindkét fajtát számolja), a `Szavazat` esemény, a kártya `javaslat` mezője.
- ⭐ **Jelzőt kap** minden, ami CSAK az egyik fajtáé: `js/allapot/szerkesztesiVegrehajtas.js` · `szerkesztesiEgyezmenyekAlkalmazasa()` · `allapot.szerkesztesiAlkalmazasok` / `szerkesztesiKihagyasok` · a parancssor „SZERKESZTÉSI JAVASLATOK / EGYEZMÉNYEK" fejlécei.
- ⚠️ Új kódnál ez a kérdés: *„ez mindkét fajtára igaz?"* Ha nem, a név mondja meg, melyikről szól.

### ⚠️ „tartalom" → „gondolat" (2026-09-06) — és ami SZÁNDÉKOSAN nem változott

A fogalom átnevezése **mindenhol** megtörtént: a P2P koinóban (`GondolatLetrehozas` esemény), a
prototípus kódjában, az API-útvonalakon (`/api/gondolat`, `/api/gondolatTipus`), a Mongo-modellekben
(`Gondolat`, `GondolatTipus`, `GondolatErtekHisztogram` → `gondolats`, `gondolattipus`,
`gondolatertekhisztograms`), a tárolt típus-értékekben (`entitasTipus: 'Gondolat'`) és a
dokumentációban.

⭐ **A FELÜLETEN sehol nem jelenik meg a „tartalom" szó** — se felirat, se üzenet, se e-mail-sablon; amit az e-ember lát, az mindenhol **gondolat**. *(Ellenőrizve 2026-09-06.)*

⛔ **Öt helyen viszont a régi szó maradt a kód belsejében, mert ott NEM a domain-fogalmat jelenti. ✅ Csaba megnézte és úgy döntött (2026-09-06), hogy maradjanak — ezeket ne írd át:**

1. **A „tartalmaz" ige** (`tartalmazza`, `tartalmazó`) és a **„tartalék"** — más szavak.
2. **A doboz belseje a felületen:** a `Modal` `{ cim, tartalom }` beállítása, a `.modal-tartalom` /
   `#fooldal-tartalom` / `kartya-fulsav__tartalom` osztályok, a `tartalomHtml`, `tartalomDiv`,
   `tartalomElem`, `fejlecTartalom`, `tartalomFrissitese`. Ezek bármilyen modal törzsét jelentik,
   nem a gondolatot. *(A `Modal.js`-ben egyetlen domain-jelentésű „tartalom" sincs.)*
3. **A szerkesztő blokk-mezője:** `blokk.tartalom` — *a blokk szövege*. ⭐ Ez **tárolt adat** is
   (`szoveg[].tartalom` minden gondolatban), és a `SzovegSzerkeszto.get/setTartalom()` ugyanez.
4. **Az esemény lenyomatolt része** a P2P koinóban: `TARTALOM_MEZOK`, `tartalomResz` — ez MINDEN
   esemény „tartalma", nem csak a gondolatoké.
5. **A `kanonikusProba.js` regressziós horgonya** — ⚠️ **befagyasztott bemenet**: ha átírod, a
   lenyomat elszakad a 2026-08-27-i mérésétől, és a próba értelmét veszti. *(Az átnevezéskor kétszer
   is elbukott — helyesen.)*

⏸️ **És egy nyitott kérdés:** a **D3 „tartalmi réteg"** (adatosztály: tudatpont-replikált, elveszhet)
maradt a régi néven, mert nem csak gondolatokat tartalmaz — nevek és személyes adatok is ott élnek.
A „tartalmi módosítás" (a módosítás fajtája, szemben az áthelyezéssel) szintén maradt.

## Futtatás

### Az ÚJ program (`koino/` — Fázis 2, itt folyik a fejlesztés)

```bash
node koino/koino.js              # az állapot: gondolatok, javaslatok, egyezmények
node koino/koino.js koino "név" [leírás] [nyilt] [profil=nev,telepules]  # ⭐ koinó létrehozása — alapból ZÁRT (D89/2; a betartatás az E-vel)
                                 # (profil=: a kötelező profil-mezők — a meghívás csak a profil lenyomatával érvényes, D93/5)
                                 # ⭐⭐ D118/2: a koinó NEVE a születése lenyomata (43 jel); a `KOINO_AZONOSITO` csak helyi
                                 # becenév (alapból `sajat`, a `becenevek.json` jegyzi); argumentum nélkül kiírja a nevet
                                 # ⭐ D118/2 (①b): a koinó SZABÁLYAI `kulcs=egész` alakban (tudatpontKeret, kategoriaKorlat,
                                 # tanusitasKell, felhatalmazasKell, elfogadasiKuszob, reszveteliKuszob, minimumDontesiIdo,
                                 # maximumDontesiIdo) — a születésbe MIND bekerül, a meg nem adott a mai értékkel
                                 # ⭐⭐ D118 (②a): szulo=<a szülő neve vagy becenéve> — a GYERMEK születése (KZ2: a szülő
                                 # tagja hozhatja létre); a szülő szabályait (a meg nem adottakat) és zártságát örökli
node koino/koino.js koltozes <a gyermek neve vagy becenéve> [elhagy=<az>,…] [fájl]  # ⭐⭐ D118 (④b): a KÖLTÖZÉS a szülőből
                                 # (a szülő a mostani koinó): kiköltözés itt, a láncom és a hozott szeleteim múltja a gyermekbe,
                                 # beköltözés ott (a vágáskori tagság kell; a hozott pontok a gyermek keretébe — KZ3); fájlba is
node koino/koino.js csatlakoz <a koinó neve> [felulir]  # ⭐ D118/2: a becenév mostantól ennek a koinónak a neve — a születést
                                 # és a többit a csere (vagy a `behoz`) hozza; utána `belep`. A `behoz` egy egyértelműen
                                 # egy koinóé fájlnál magától is csatlakozik, ha a becenév még nem jegyzett
node koino/koino.js allapot 3    # mi lesz 3 nap múlva (a döntési idő napokban mérhető)
node koino/koino.js mentes <fájl>                   # a kulcs kimentése (ez te vagy)
node koino/koino.js visszatolt <fájl> [felulir]     # ⭐ …ÉS A VISSZAHOZÁSA (2026-09-15)
                                 # ⛔ A kulcs-biztosítás ELŐTT fut — különben a próbálkozás
                                 # pillanatában ÚJ azonosság születne (mérve). A `felulir`
                                 # kimondott engedély: meglévő kulcsot némán nem dobunk el.
node koino/koino.js torol <azonosító> [indoklás]     # ⭐ TÖRLÉSI javaslat (5.5, 2026-09-07)
node koino/koino.js athelyez <mit> <hova|gyoker>    # ⭐ ÁTHELYEZÉSI javaslat
node koino/koino.js egyesit <az1>,<az2> <új cím>    # ⭐ EGYESÍTÉSI javaslat (az ELSŐ nyeli be a többit)
node koino/koino.js szavaz <javaslat> ellenez kulonag  # ⭐ KÜLÖNVÁLÁSI igény: ha ellened megy, viszem a régit
node koino/koino.js belep [alapítás]                # ⭐ A SAJÁT azonosság-szeletem (D56)
                                 # A kiírt horgonyt add meg annak, aki behív.
node koino/koino.js meghiv <horgony>                # ⭐ 1. LÉPCSŐ: tagság
node koino/koino.js felhatalmaz <horgony>           # ⭐ rábízom a tanúsítást (D60)
node koino/koino.js tanusit <horgony>               # ⭐ 2. LÉPCSŐ: pénztárca (D11)
node koino/koino.js bemutatkoz <horgony>            # ⭐ találkoztunk (D62 — csak kölcsönösen)
node koino/koino.js visszavon <horgony>             # ⭐ a felhatalmazás visszavétele (csak ELŐRE hat)
node koino/koino.js lattam                          # ⭐ buli-elismerés (D61)
node koino/koino.js altalanos "Az álláspont" <hely> [indoklás]  # ⭐ ÁLTALÁNOS javaslat (D27)
                                 # (a hely KÖTELEZŐ: az határozza meg a hatókört — D27/4)
node koino/koino.js allast <egyezmény> csatlakozik  # ⭐ ÁLLÁSFOGLALÁS általános egyezményről (D27)
node koino/koino.js ertek <az> 51 0 86400 604800    # ⭐ ÉRTÉK JAVASLAT (küszöbök) — eddig CSAK a felületről ment
node koino/koino.js felszabadit [buli]              # ⭐ a törölt gondolatokra tett pontod visszavétele
                                 # (magától is megy: az őrjárat minden körében, megülepedés után)
node koino/koino.js hozd <azonosító> [cím] [port]   # ⭐ BÖNGÉSZŐ-LEKÉRÉS: EGY entitás elhozása
                                 # (a rendes csere mindent hoz; ez válogat — a szelet-címjegyzékből
                                 #  vagy a társ-listából keres, és megjegyzi, kinél volt meg)
node koino/koino.js cimjegyzek [hirdet [port] | keres <az> | gyoker [darab] | hirdetes <n>]
                                 # ⭐⭐ D91/3: A CÍMJEGYZÉK A DHT-N — mit hirdetek (a gyökér-darabom; szeletet csak
                                 # a `hirdetes <n>` beállítással), és ki tartja, amit keresek (vakított téma)
node koino/koino.js kerelem fejlecek <az|gyoker> [cím] [port] [n] [mely]  # ⭐⭐ D92: a KÉRELEM — a fejlécek össz-pont szerint
                                 # (D102: `mely` — a tartó maga jár be legjobb-először, a gyerekszámmal), mintákkal ellenőrizve → az átmeneti tárba
node koino/koino.js kerelem torzs <az> [cím] [port]  # …és a törzs (szöveg-darab, fájlok) — csak a vállalótól (D84/1)
node koino/koino.js kerelem fejlecek <az|gyoker>    # ⭐⭐ D92/1: CÍM NÉLKÜL a kérelem FÜGGŐ lesz — a tartóit a G adja,
                                 # a kopogtató témáikon jelentkezünk, és az őrjárat a következő buliban kéri
node koino/koino.js kerelem szelet <az>             # …egy szelet függő kérelemként (továbbadható — D92/1 (c))
node koino/koino.js kerelem                         # …a függő és a kész kérelmek
node koino/koino.js ter [rendezés] [irány]        # ⭐ A BELÉPŐ TÉR (5.6): a koinók, amiket ismerek
node koino/koino.js fajlok                        # ⭐ MELY KÉPEK/FÁJLOK HIÁNYOZNAK a készülékről
node koino/koino.js tabla                         # ⭐⭐⭐ A HIRDETŐTÁBLA (2026-09-20): a kötéseim
node koino/koino.js tabla kiir [cím] [port]       #   …az új címem a társaim rekeszébe (titkosítva)
node koino/koino.js tabla olvas                   #   …és hol vannak ŐK most (a néma kötések)
                                 # ⛔ A tábla-kulcs NEM az azonosságod (D6) — külön kulcs.
node koino/koino.js felulet [port]  # ⭐ A FELÜLET (5.1): helyi kapu a 127.0.0.1-en, a böngészőnek.
                                 # Kiír egy címet, benne az indításkor generált jelszóval.
                                 # ⚠️ NE keverd a `kapu` paranccsal — az a ROUTERT kéri meg.
node koino/koino.js kivisz <fájl> [mind|sajat|<azonosító>]  # ⭐ A KÉZI ÚT: események fájlba
node koino/koino.js behoz <fájl>                    # ⭐ …és fájlból — HÁLÓZAT NÉLKÜL (4. szabály)
node koino/koino.js vallalas                         # ⭐ B/1–B/2: mit tartok — a vállalásom (tartós) és az átmeneti tár (eldobható)
node koino/koino.js profil nev="Kovács Anna" telepules=Pécs  # ⭐ D93/5: a Profil (a darab sózva a fájl-tárba, az esemény csak a lenyomat)
node koino/koino.js tagsag                          # ⭐ D93: tag vagyok-e (a láncom mélysége) + a tagsági csomag kiadása; D94: ha 2. lépcsős, a tanúsítások bemondása
node koino/koino.js jelzes [horgony]                # ⭐ D93/6: a kontraszt-jelzés kérésre — kiket tanúsított, van-e önálló életük (a szeletekből;
                                 # a hiányzó szeletekhez a `hozd`-ot mondja). ⛔ SZÁM, nem ítélet
                                 # ⛔ D93/1: a NEM TAG pontja, javaslata, szavazata NEM számít (függőben, nem vád) —
                                 # a `pont` és a `szavaz` ezt kimondja; a meghívás után ugyanaz az esemény számít
node koino/koino.js felderites [<ág|gyoker> [K] [mélység] [torzs] [MB] | torol <az>]  # ⭐ D112: a FELDERÍTÉS — egy ág egyszeri
                                 # pillanatképe a háttérben (az őrjárat viszi), rögzítve; argumentum nélkül a lista és az állás
node koino/koino.js tomorit [proba]                 # ⭐ D75/1, D73: a tár tömörítése — ami kiesett a vállalásomból, az átmeneti tárba
                                 # (+ D112 ①: a fájl-tár kerete — a nem vállalt törzs a 50 MB fölött kiesik, a legrégebben érintett előbb)
                                 # (csak az író; az őrjárat naponta egyszer magától; a `proba` csak számol)
node koino/koino.js kiszolgalas [mindent|alap]      # ⭐ D83/2, D95/1: a „mindent” készülék a nagy szeleteket is egészében tartja
                                 # (az önkéntes teljes tartó: a többinek összegzi őket); az alap 1000 esemény fölött összegez
node koino/koino.js kiszolgalas keret <MB> <kérés> | keret alap  # ⭐ D109 (⑤): a kiszolgálási keret óránként (a kiinduló
                                 # szám helyett) — a parancs az elmúlt órát is kiírja (a futó kiszolgáló `keret.json`-jéből)
node koino/koino.js kereso [felajanl <fájl> | behoz <fájl> | kivisz <fájl>]  # ⭐ D107 L1 (a kereső-réteg ③): a kereső-tár — a
                                 # régióim és a bejegyzéseim; a kézi út: a gondolataim bejegyzései fájlba, és fájlból ugyanazon a kapun
node koino/koino.js kereso felajanl [<cím> <port>]  # ⭐ D107 L4 (④c): a felajánlás — közvetlenül egy tartónak, vagy (cím nélkül)
                                 # a DHT-n keresi a régióim tartóit, és függő kérelmeket vesz fel (az őrjárat magától is, ~20 percenként)
node koino/koino.js kereso keres "<kérdés>" [<cím> <port>]  # ⭐ a kereső-réteg ⑤: a kérdés a hálózaton — a tartónál (vagy cím
                                 # nélkül a DHT-n talált tartóknál); a találat ellenőrizve az átmeneti tárba
node koino/koino.js osszegzes                       # ⭐ D95/1: a lezárási összegzések kiadása (nagy szelet teljes tartójaként —
                                 # az őrjárat magától is) és a kapott, mintákkal ellenőrzöttek
node koino/koino.js csomag [javaslat]               # ⭐ D85 T3 (B): a lezárt, több érintettes döntés csomagja a töredékekbe
                                 # (az őrjárat a saját javaslataimra magától kiadja; ismételhető)
node koino/koino.js ellenoriz                       # ⭐ D82: a tár MINDEN eseménye körül bizonyítható ellentmondás (+ D98: a lánc-ellenőrzés állása)
                                 # → bejelentés a vádolt azonosság-szeletébe (a csere és a `behoz` után magától is)
                                 # A fájl alakja a táré: a másolt esemenyek.jsonl is behozható.
                                 # ⛔ A kapu UGYANAZ: az átírt esemény itt is elbukik.
node koino/meres/mind.js         # a 1317 önpróba
node koino/meres/mind.js fa      # ⭐ egy témakör (csoport): alap · allapot · felulet · csere · fajl · fa · parancssor
KOINO_PROBA="részlet" node koino/meres/mind.js parancssor  # ⭐ csak a nevükben ezt tartalmazó próbák (kimondja magát)
node koino/meres/skalaMeres.js   # SKÁLA-MÉRÉS (nem önpróba: számokat ad, nem igen/nem-et)
node koino/meres/szeletTarMeres.js [darab]  # ⭐ A TÁR ALAKJA (49.): szelet-fájlok vs egy adatfájl + mutató,
                                 # és a valódi tár megnyitása (D73) — alapból 100 000 esemény, ~6 perc
node koino/meres/tartomanyMeres.js [darab]  # ⭐ A TARTOMÁNY-EGYEZTETÉS ÁRA (50.): 1 eltérés 100 000 közt → bájt
                                 # (egy halmazként és két szinten: szeletek, aztán az eltérő szelet)
node koino/meres/csereMeres.js [darab]  # ⭐ A SZELETENKÉNTI CSERE A VONALON (51.): 1 eltérés és „nincs újdonság" bájtban
node koino/meres/osszegzoFaMeres.js [n]  # ⭐ AZ ÖSSZEGZŐ MERKLE-FA ÁRA (52., D78): bizonyíték bájtban, idők, a teljes lista
node koino/meres/esemenyMeretMeres.js    # ⭐ AZ ESEMÉNY MÉRETE A BIZONYÍTÉKKAL (53., D81; 54., D85/2; 56., D85 T3): gondolat, pont-esemény, szavazat, javaslat bájtban
node koino/meres/dontesiCsomagMeres.js [N ...]  # ⭐ A DÖNTÉSI CSOMAG MÉRETE (55., D85 T3): ~2,5–3 KB résztvevőnként; 1000-ig egy esemény
node koino/meres/titkositasMeres.js [darab]  # ⭐ A CSERE TITKOSÍTÁSÁNAK ÁRA (57., D89/1): nyíltan vs titkosítva — nincs újdonság +406 B, fájl +3,7%
node koino/meres/zartKapuMeres.js       # ⭐ A ZÁRT KOINÓ KAPUJA A DRÓTON (64., D93/3): ismert társnál +0 B; első találkozáskor +0,5 KB, csomaggal ~1,1 KB/lépés
node koino/meres/lepcsoMeres.js [N] [F0]  # ⭐ A 2. LÉPCSŐ BIZONYÍTÉKA (65., D93/4): a teljes zárvány közel lineáris; a szúrópróba logaritmikus
node koino/meres/szigoruMeres.js [p] [küszöb]  # ⭐ EGY KÉSZÜLÉK TERHE A SZIGORÚ (b) ALATT (66.): teljes vállalással ~√N, két fokúval konstans
node koino/meres/osszegzesMeres.js [k]  # ⭐ A LEZÁRÁSI ÖSSZEGZÉS ÁRA (67., D95/1): ~60–70 KB döntésenként, logaritmikus
node koino/meres/rajKorMeres.js [N] [S] [V]  # ⭐ A RAJ A KÖRBEN (69., szimuláció): csak kötéssel 0,3% ér körbe; „változott előre” R = 2: medián 1, 99% 9 kör
node koino/meres/tarsEmlekezetMeres.js [n ...]  # ⭐ A TÁRSANKÉNTI EMLÉKEZET (70.): emlékezet nélkül és vele — a változott közös szeleteknél
                                 # az első szint a nyílt forgalom 25–62%-a; az F-fel elmarad (`uzenetMeres` műszer; KOINO_BONTAS=1)
node koino/meres/lancKorMeres.js [n ...]  # ⭐ A LÁNC-KÖR ÁRA (71., D98/2–4): kérdezett eseményenként ~0,6–0,8 KB, logaritmikusan; a szerző a
                                 # részfa-gyorsítótárral 9–42 ms (nélküle 5000 eseménynél 1,9 s)
node koino/meres/koltozesMeres.js  # ⭐ A KÖLTÖZÉS ÁRA (82., D118 ④): kiköltözés 0,5 KB, beköltözés ~1 KB tagsági lépésenként (13 lépés
                                 # 13,8 KB), a születések lánca ~0,8 KB nemzedékenként — mind egyszeri
node koino/meres/ketRetegMeres.js [N ...]  # ⭐ A KÉT RÉTEG ÁRA (83., D118 ③): a gyermek első képe ~1,6× a szülő nélküliének, a múlt
                                 # gyorsítótárával kisebb; a nemzedékekkel enyhén nő (minden szint az ősök szerkezetét újraolvassa)
node koino/meres/darabMeres.js [gondolatok ...]  # ⭐ AZ ÖSSZ-DARAB A VONALON (81., D116): a fejléc-kérdések bájtjai (KOINO_KOD=<régi
                                 # koino/js> a régi kóddal, KOINO_MINTA=kd,kg,td,tg a minta-számok) — a mély kérés +9–12%
node koino/meres/korUtemMeres.js [perc] [port] [--friss]  # ⭐ A KOPOGÁS ÜTEME (80., D115): egy valódi őrjárat a valódi DHT-n — hány
                                 # percforduló marad ki (előtte 8-ból 1, az induló kör tábla-írása miatt; utána 0)
node koino/meres/bejaroMeres.js [N ...]  # ⭐ A LEGJOBB-ELŐSZÖR BEJÁRÓ ÁRA (74., D101/M1, szimuláció): egy friss készüléken egy oldal a mai
                                 # menettel 80–114 perc (a NAT-os késés × a szintek), ha a tartó maga jár be ~40 perc (javítva 2026-10-18), „mindent” tartóval 1 kör
node koino/meres/bejaroMeres.js --felderites [N ...]  # ⭐ A FELDERÍTÉS ÁRA (77., D108/1): a legjobb-először első K fejléce és a K törzse —
                                 # K = 200: 2,5–4,3 óra + ~1–1,5 óra a törzs (~145 készülék); „mindent” tartóval percek
node koino/meres/kiszolgalasMeres.js [gondolatok ...]  # ⭐ MENNYIBE KERÜL EGY KÉRÉS KISZOLGÁLÁSA (76., D108): a válaszok kicsik, a
                                 # törzs ≤ 128 MB; az állapot kérésenként újraszámolva a tárral nő (125 000 eseménynél ~1,1 s)
node koino/meres/keresoMeres.js [N ...] [--prozai] [--B=256] [--T=512]  # ⭐ A KERESŐ-RÉTEG ÁRA (75., D105, szimuláció): a gyakori
                                 # szó fiókja osztódás nélkül a koinóval nő (1M gondolatnál ~31 MB), vele ~1,4 MB; a (C) kulcs 91–96% találat
node koino/meres/reszvetelMeres.js [n ...]  # ⭐ A „NINCS ÚJDONSÁG” CSERE A SZIGORÚ (b) ALATT (68.): saját halmazzal 6–300 KB, csak a közössel 702 B;
                                 # D97/1 (közös halmaz): első találkozás 2,9–28,3 KB, utána 1,3 KB
node koino/meres/dhtTarsMeres.js [témák] [percek]  # ⭐ A BEP 5 A VALÓDI DHT-N (58., D91): bejelentés ~9 KB, keresés ~3 KB, a háló 30–60 perc alatt felejt
node koino/meres/rajMeres.js [N] [körök] [szabályok]  # ⭐ A RAJ KIALAKULÁSA (59., D91, szimuláció): L = 8, fele friss / fele véletlen → ~99,5% egyben
node koino/meres/kerelemMeres.js [kérelmek]  # ⭐ A KÉRELEM ÚTJA (60., a D átvizsgálása, szimuláció): az elárasztás nagy koinóban ~semmit nem ad, a kopogtatás (randevú + lyukfúrás) 20% → 76%
node koino/meres/osszPontMeres.js             # ⭐ AZ ÖSSZ-PONT BIZONYÍTÉKA (62., D92/5): egy minta 0,5–2,6 KB, a fejléc k = 8-cal 5–21 KB, a lebukás 1 − (1 − f)^k
node koino/meres/tagsagMeres.js               # ⭐ A TAGSÁGI LÁNC (63., az E átvizsgálása): természetesen logaritmikus (1M tagnál ~13 lépés, ~16 KB), lánc-szerűen lineáris
node koino/meres/lancFarokMeres.js            # ⭐ A TAGSÁGI LÁNC FARKA (78., D113): a LEGMÉLYEBB tag (~e·ln n) — a 64-et ~1,3·10^11 tagnál elérte volna,
                                 # a 256-ot a koinó saját határáig (2^128) sem; a farok a pontos eloszlásból, a kivetítés tételekből
node koino/meres/felszabaditasMeres.js  # ⭐ A MEGÜLEPEDÉS: hány buli kell? (13. mérés)
node koino/meres/kuszobMeres.js  # ⭐ AZ ALAPÉRTÉK SÚLYA: számít-e a hallgató tulajdonos? (14.)
node koino/meres/verzioMeres.js ir|olvas  # ⛔ A PROGRAM-VERZIÓ mint az állapot bemenete (15.)
node koino/meres/resSebessegMeres.js    # ⭐ A FÁJL-ÁTVITEL SEBESSÉGE az átfúrt résen (16.)
                                 # ⭐⭐ 2026-09-14 óta: VESZTESÉG · ingadozás · lassú vonal
                                 # (a D67 alapvonala) — magvas véletlen, hogy összevethető legyen
                                 # ⭐⭐⭐ 2026-09-15 óta: TÖBB FORRÁSBÓL EGY FÁJL (29. mérés) —
                                 # KÉT sor egymás után: a forrás feltöltése ÉS a mi letöltésünk
                                 # (közös). A haszon a kettő arányától függ: ×2,7 … ×1,0
node koino/meres/buliMeres.js    # ⭐⭐⭐ MENNYIT ÉR AZ ÖSSZEHANGOLT ABLAK? (30.) ÉS
                                 # HÁNY FRISS CÍM KELL? (34. — a válasz: nem a szám, hanem
                                 # a HORGONYOK aránya; K=0 és K=10 között nincs különbség)
                                 # Az igazítás ÉS az ismétlés együtt ×30 — külön alig.
                                 # A mai állapot MÉRETTEL romlik (8,9 → 70,3 perc), az új nem.
node koino/meres/dhtMeres.js [kor 5 5]  # ⭐⭐⭐ A DHT MINT HIRDETŐTÁBLA (36.) — a VALÓDI BitTorrent DHT-n
                                 # KOINO_DHT_BELEPOK=nincs · KOINO_DHT_UJKULCS=1 · tesz / keres <kulcs>
                                 # KOINO_TUKOR=cím:port — a tükör (STUN) cseréje (2026-09-24, 40.)
node koino/meres/kotesMeres.js   # ⭐⭐⭐ A KÖTÉS-HÁLÓ (35.): 3 kötés/készülék, hálózatváltás —
                                 # mentés nélkül egy nap alatt szétesik, hirdetőtáblával ~1%
                                 # leszakadva; és a méhsejt vs véletlen (lépésszám)
node koino/meres/udpLekepezesMeres.js   # ⭐⭐ TÚLÉLI-E a bemondott UDP-cím a buli-közt? (31.)
                                 # EGY készülék elég; a MOBIL adattal futtatva a döntő
node koino/meres/meghivasMeres.js       # ⭐ A MEGHÍVÁSOS BELÉPÉS: védelem ÉS ár, hat változatban
                                 # (MELEGIT=1 · MEGTEVESZTETT=8 · MEGHIVO_KORLAT=10 · KOROK=60)
node koino/meres/iranyokMeres.js [N K csúszás futás]  # ⭐⭐⭐ EGY CSERE ABLAKONKÉNT (47.): lassít-e? — és
                                 # a továbbadás (V3): a hír percek helyett másodpercek alatt
node koino/meres/negyszeresCsereMeres.js 15 ketto  # ⭐⭐ A NÉGYSZERES CSERE (45.): címek × irányok
                                 # (csúszás mp · ketto|egy · ablak perc · ablakok) — 1·2·2·4 csere/ablak;
                                 # a D71 (ii) óta (46.) két címen is 1, csúszással 2
node koino/meres/ebredesProba.js fut    # ÉBREDÉS-PRÓBA egy hálózaton: engedi-e az OS az ébredést
node koino/meres/ebredesProba.js res <cím> <port>   # …és KÉT hálózat között: összeér-e a rés
                                        # (a fal órájához igazított ablakokban — ez a „buli"); utána: olvas
```

⭐ **A valódi üzemmód: `node koino/koino.js orjarat [perc] [port]`** — a készülék **magától dolgozik**: nyitva tartja a kaput (postaláda) ÉS időnként végigmegy a társ-listán. *Csaba vette észre, hogy eddig minden csere kézi indítású volt, pedig a D33 terve erre épül.* Egy „nincs újdonság" csere a résen **1,2–1,7 KB** (43. mérés; TCP-n 334 bájt volt). ⚠️ Két készülék között ma körönként akár **négy** is lemegy (két cím × két irány, 43. mérés; a 45. mérés szétszedte: a két tényező független, és terepen egy címen is két csere megy percenként) — egyperces körrel ez társanként ~8 MB/nap, ötperccel ~1,6 MB. ⭐ A címek tényezőjét a D71 (ii) megszüntette (46. mérés: két címen is 1 csere/ablak); az irányokét a (iii) döntés felezné. ⚠️ Ez NEM sérti az 5. szabályt: a kör végén minden elenged, a készülék alszik a következőig.

📱 **Telefonra telepítés (Termux + Node):** [`docs/telepites_telefon.md`](docs/telepites_telefon.md) — a Szakasz 2 / 4. lépéséhez. `git clone --depth 1` a nyilvános repóból (5,6 MB a 23 helyett). A `koino/` mappa **önmagában futtatható**: 331 fájl, 6403,3 KB (a `tar.gz` csomag ~80 KB), nulla függőség — *ugyanaz a szám, mint a 6. szabálynál; ha az egyik változik, mindkettőt vezesd át.* ⚠️ A mércét a 6. szabály mondja meg: **bájtok összege, nem `du`**.

**Két készülék egy gépen** (Szakasz 2 / 1. lépés — a `KOINO_ADAT` két külön „készüléket" ad, saját kulccsal):

```bash
KOINO_ADAT=./adat-A node koino/koino.js figyel 7373
```

⭐ D118/2 óta a B-nek előbb meg kell mondani, melyik koinóhoz csatlakozik (a nevét az A-n a `koino` parancs írja ki):

```bash
KOINO_ADAT=./adat-B node koino/koino.js csatlakoz <az A koinójának neve>
```

```bash
KOINO_ADAT=./adat-B node koino/koino.js csere 127.0.0.1 7373
```

**Több társ** (Szakasz 2 / A. lépés): a `tars` paranccsal felvett címekre a `csere` érv nélkül is elmegy — és **egy elérhetetlen társ nem dönti el a kört**:

```bash
node koino/koino.js tars 127.0.0.1 7373 "A készülék" && node koino/koino.js csere
```

⭐ **A `figyel` = POSTALÁDA** (D34, C. lépés; 2026-09-26 óta az állandó UDP-kapun): aki fogadni tud, az átveszi mások eseményeit, eltárolja, és a következő beszélgetésnél továbbadja. **Nem élő továbbító** — nem kell egyszerre online tartania két felet (ez a TURN drágasága). Mérve: Anna és Béla egyike sem nyitott kaput, csak Cilihez szóltak ki — mégis mindkettő mindent megtudott. ⚠️ **Egy `figyel` = EGY koino** (a `KOINO_AZONOSITO` indításkor dől el). Aki két koinónak is tagja, két `figyel`-t futtat, két porton. A protokoll a `LENYOMAT`-ban megmondja, melyik koinóról beszél, és **eltérésnél a csere azonnal, tisztán véget ér** (1 kör, ~334 bájt) — mérve, mert korábban nem így volt.

⚠️ **A KOINO NEM BÖNGÉSZŐBEN FUT (D29, 2026-08-28).** Csaba döntése: *„hagyjuk is el a böngészős részt, mert csak bezavar. A tiszta P2P kapcsolatra koncentráljunk."* Indok: a böngésző korlátai nem a koino korlátai — egy lap nem tud portot nyitni, nem fogad kapcsolatot, elrejti a saját címeit, és bezáráskor eltűnik; a P2P-hez emlegetett infrastruktúra (jelzőpont, STUN, továbbító) jórészt EBBŐL következik. A böngésző később lehet egy kliens, de nem ő szabja meg, mire képes a koino.

- **Nincs telepítendő függőség** — a kriptográfia a Node beépített WebCryptójából jön (Ed25519 natívan). Az adat a `koino-adat/` mappában él, **hozzáfűzhető** fájlban (soronként egy aláírt esemény); máshová a `KOINO_ADAT` változóval tehető.
- **Önpróbák:** `node koino/meres/mind.js` — 1317 próba 62 fájlban (egy próba kaphat **ismert hiba** jelet: a javításig bukik, de a sort nem pirosítja be — ha átmegy, az bukás; ma egy sincs); a kilépési kód 1, ha bármi bukott. ⭐ **Témakörönként (2026-10-01):** `node koino/meres/mind.js <csoport> [<csoport> …]` — **alap** (kanonikus, kulcs, esemény, tár, író, átmeneti, keresőtár, keresőmegújítás) · **allapot** (állapot, javaslat, szabály, egyezmény, döntési csomag, össz-pont, felszabadítás, identitás, tagság, értesítés, felderítés, koinólánc, kétréteg, költözés) · **felulet** (kapu, pakli, tér, csereállapot) · **csere** (csere, fájlcsere, társak, tartomány, titkosítás, udpkapu, kötés, tábla, dht, címjegyzék, kérelem, összegzőtartás, tagságkísérő, gyökérdarab, kereső, közöshalmaz, részvétel, társemlékezet, vizsga, kiszolgálásikeret, keresőrégió, mélységtanulás, felajánlás, keresés) · **fajl** (fájl, fájligény, fájlkérelem, fájlátvitel, szövegdarab) · **fa** (összegzőfa, láncgyökér, ellentmondás, észlelő, láncellenőrzés) · **parancssor**. Egy próba-fájl a nevével (`mind.js eszlelo`), és ha a neve csoport is: `mind.js csak csere`. A szűrő **pontosan** illeszkedik (a régi részszó-szűrő a `tar`-ra a `tarsak`-ot is indította), és a részleges futás az összegzésben kimondja magát (`Csak: fa — 4 próba-fájl a 40-ből`). ⭐ **Egy próba a nevéből (2026-10-05):** `KOINO_PROBA=<részlet>` — csak az a próba fut, amelynek a nevében benne van (a hosszú parancssor-csoportból egyet); a fejléc és az összegzés kimondja (`Szűrve: …`). ⛔ **A besorolás-őr:** minden próba-fájl pontosan egy csoportban van, és a `meres/` minden `*Proba.js` fájlja be van kötve (kivétel a `NEM_ONPROBA` listán: az `ebredesProba.js` mérés) — ha nem, a `mind.js` semmit nem futtat (kilépési kód 2), és megnevezi, mi hiányzik. *Új próba-fájlnál tehát a `CSOPORTOK`-ba is be kell írni.* Nincs teszt-könyvtár. A koino részletes naplója alapból néma, `KOINO_NAPLO=1`-gyel kapcsolható be.
- ⚠️ A `koino/koino.js` **fejlesztői eszköz**, nem a koino felülete — a valódi felület a prototípus pakli-nézetéből öröklődik (lásd [`docs/felulet_terv.md`](docs/felulet_terv.md)).

### A PROTOTÍPUS (`backend/` + `frontend/` — Fázis 1, befagyasztva)

- **Fejlesztői környezet:** `docker-compose -f docker-compose.dev.yml up` — backend a 3000-es porton (a frontendet is ez szolgálja ki statikusan), MongoDB kívülről a 27018-as porton (konténeren belül 27017). CSAK localhost (a 8080-at már az éles stack viszi).
- **Éles környezet (koino.hu):** `docker-compose -f docker-compose.prod.yml up -d --build` — a fejlesztőitől független stack UGYANAZON a gépen: `koino-backend-prod` a 8080-as porton (ide jön a koino.hu Cloudflare Tunnel / IP), külön `koino-mongodb-prod` adatbázis-kötettel, külön `backend/uploads-prod` feltöltés-mappával, saját `backend/.env.prod` titkokkal (gitből kizárva; minta: `backend/.env.prod.example`). A kód a képbe van égetve → csak ezzel a paranccsal (deploy) frissül. Részletek: [`docs/elesites.md`](docs/elesites.md).
- **Backend önállóan:** `cd backend`, majd `npm run dev` (nodemon) vagy `npm start`. A kapcsolatot a `backend/.env` `MONGODB_URI` változója adja.
- A gyökér `package.json` üres — a valódi a `backend/package.json`.
- Nincs automatizált teszt; a tesztelés böngészős, referenciája a [`docs/teszt.md`](docs/teszt.md).

## Architektúra

### 🚧 Az ÚJ program (`koino/`) — P2P, a készüléken fut

Nincs szerver és nincs adatbázis-kiszolgáló: **minden művelet egy aláírt esemény**, az állapot pedig ezekből **számítódik** (D17). Terv: [`docs/szakasz1_terv.md`](docs/szakasz1_terv.md).

- `js/kulcs/kulcsTar.js` — a kulcspár (Ed25519, natív WebCrypto): létrehozás, tárolás, mentés, visszatöltés. **A kulcs a személyazonosság** (D15) — nincs jelszó, nincs bejelentkezés. ⛔⛔ **A visszatöltés az EGYETLEN művelet, ami eldob valamit** (mindenütt máshol hozzáfűzünk), ezért kimondott `felulir` kell hozzá — és az őr a **rétegben** van, nem a parancsban: *ha a hívóra bíznánk, az egyik út megtenné, a másik elfelejtené.* ⭐ **És a név a kulcsból jön, nem a fájl szavából:** a leírás `azonosito` mezője kényelem, a valódi azonosító a nyilvános kulcsból **számítható** — ha a kettő eltér, a fájlt átírták (*egy második, hazudható forrás ugyanarról nem érték*).
- `js/esemeny/kanonikusAlak.js` — ⚠️ **a legveszélyesebb részlet**: ugyanaz az adat MINDIG ugyanazokat a bájtokat adja. Szabályok: rendezett mezőnevek · **csak egész szám** · NFC-normalizált szöveg. Ha ez elromlik, két gép sosem ért egyet.
- `js/esemeny/esemeny.js` — aláírás és ellenőrzés; az esemény **neve a gondolatának lenyomata** (mint a gitben). ⛔ **D77 (2026-09-27):** az `entitas` és a `GondolatLetrehozas` `szulo`-ja csak azonosító alakú (`AZONOSITO_MINTA`) vagy null — mert a csere szelet-kulcsként mondja ki őket a vonalon. ⭐ **D85/1, /3 (2026-10-03): `bejelentesHelyei`** — hova jelentjük be az eseményt a saját szeletén kívül: a születést a szülőnél, a `Javaslat`-ot (ami a saját szeletében él) minden érintettjénél, a lánc-gyökeres `Szavazat`-ot (ami a javaslatéban él) a bizonyítéka kulcsainál (legfeljebb 64). ⭐⭐ **D118/2 (2026-10-24): a koinó NEVE a születése lenyomata** — az új alakú `KoinoLetrehozas` koinó-mezője üres, minden más esemény a születés azonosítóját viszi; `esemenyKoinoja` (melyik koinóé egy esemény — a kód minden koinó-hasonlítása ezt hívja), `koinoSzuleteseE` / `koinoSzuleteseListabol` (a koinó születése EGY szabállyal: lenyomat-nevű koinónál csak az az esemény, amelyiknek az azonosítója maga a név); a kapu (`alakiHiba`) elveti a lenyomat-nevet mondó születést és az üres koinó-nevű nem-születést. ⛔ A lelet: a szabad név mellett egy kívülálló egyetlen azonos nevű születéssel az alapító (és minden tag) döntéseit „nem ellenőrizhetővé” tette. ⚠️ A régi alak (szabad név) csak a próbák és a régi adat kedvéért él.
- `js/esemeny/koinoSzabalyok.js` — ⭐⭐ **A KOINÓ SZABÁLYAI A SZÜLETÉSBEN** (D118/2 ①b, 2026-10-24): `ALAP_SZABALYOK` (a tudatpont-keret, a kategória-korlát, a tanúsítás-szám, a felhatalmazás alapértéke, a küszöbök alapértékei — ⛔ SOHA nem változik: csak a régi alakú és a még meg nem érkezett születésé), a határok és a kapu ellenőrzése (`szabalyokAlakiHibaja` — csak ismert kulcs, határon belüli egész; a keret ≤ 10 000, a D106 kivétele miatt), `koinoSzabalyai` (a születésből, a hiányzót a mai értékkel), `teljesSzabalyok` (az új születésbe MIND — +206 B). A számítás minden helyen ebből: a szabály-réteg, a döntés, a lezárási összegzés, az identitás-nézet (a tárból: a koinó neve a születés azonosítója), a lánc-gyökér (a gyorsítótár a kerethez kötött), a lánc-ellenőrzés, az ellentmondás, az észlelő, a vállalás, a művelet (`koinomSzabalyai`), a pakli. ⛔ A meghívó-szám nem szabály (a modell része, 1). A 15. mérés megismételve: a régi alakú koinó a program-állandóval hasad, az új nem.
- `js/esemeny/szovegDarab.js` — ⭐⭐ **A GONDOLAT SZÖVEGE KÜLÖN DARAB** (D72, 2026-09-26): az esemény a szöveg helyett a **hivatkozását** hordozza (`{ lenyomat, bajt }` — a kanonikus alak lenyomata, és ez a neve a fájl-tárban is), a szöveg pedig úgy jön a résen, mint egy kép. ⭐ A számítás a hivatkozást viszi az állapotba, tehát **minden gép ugyanazt az ujjlenyomatot számolja, akár lehozta a szöveget, akár nem**; a megjelenítés oldja fel, és ami még nincs meg, azt kimondja (D19). A régi (szöveget hordozó) események érvényesek maradnak. ⭐ A randevú egy megérkezett szöveg-darab képeit **ugyanabban a randevúban** elkéri (`ujKerhetok`), a kézi út (`kivisz`/`behoz`) a darabot is viszi, és a hamisat nem veszi be.
- `js/esemeny/halmaz.js` — ⭐ **AZ AZONOSÍTÓ-HALMAZ** (D73–D74, 2026-09-27): a rendezés és a halmaz-lenyomat **egyetlen helyen** — a tár `szeletLenyomata()`-ja és a tartomány-egyeztetés ugyanezt használja, így a teljes tartomány lenyomata mindig a szeleté (próba őrzi). ⭐ A lenyomat **hash, nem összeg** (D74). ⚠️ *(Átnézés, 2026-09-27 este:)* a csere a C 7–8. pontja óta **nem** a tár `szeletLenyomata()`-ját veti össze, hanem a `szeletEgyeztetes.js` halmazát (+ a gyerekek születése, − az alakilag hibás) — a kettő csak gyerek nélküli szeletnél egyezik, és a táré mögött ma nincs éles hívó. ⏸️ Hogy a szelet összegzése hol éljen, azt az **A** (az összegző Merkle-fa) alakja dönti el.
- `js/allapot/dontesiCsomag.js` — ⭐⭐ **A DÖNTÉSI CSOMAG** (D85 T3, a (B) — Csaba, 2026-10-03): egy több érintettes javaslat (egyesítés, csomag) döntéséhez a G1 tartóinak a G2-es rész bemenete is kell (az ÉS és a közös lezárás). A lezárás után egy aláírt `DontesiCsomag` hozza el a döntés bemenetének másolatait (`dontesBemenete`: a javaslat, a szavazatai a lezárásig, a többi érintett létrehozása, pont- és küszöb-eseményei — a felülírt régiek nélkül) — ⭐ a rész TÖREDÉKÉNEK szeletébe, és CSAK azt, ami a cél szeletéből hiányzik (`celbolHianyzik`; az 55. mérés erősítése miatt nem a gondolat szeletébe). A kapu a tartalmát is ellenőrzi (`dontesiCsomagEllenorzese`: minden belső esemény ugyanazon a próbán, csak a döntés bemenete; egy hamis az egészet elveti), a számítás a BEMENETÉBE bontja, nem a tárba (`csomagokKibontasa` — különben a G1-tartó a G2 szeletének egy darabját hirdetné). ⛔ A teljességéért senki nem kezeskedik (a (b) ezért nem cél) — egy teljesebb csomag pótolja, a számítás az unión fut. ⚠️ Ami a részvételhez kötött (a döntés ISMERETE és a töredék-részvétel), az a B/1-ben és a B/3-ban jön.
- `js/allapot/koinoLanc.js` — ⭐⭐ **A GYERMEK SZÜLETÉSE ÉS A SZÜLETÉSEK LÁNCA** (D118 ②a, 2026-10-24): a gyermek születése (`gyermekSzuleteseE` — új alakú, `szulo`-t mond) a létrehozó tagsági bizonyítékát hozza a szülőben (`szuloTagsag` = `{ horgony, lanc }`, a szülő születése nélkül — `szuloTagsagaEpitese`); a kapu (`esemenyMentese`) a szülő születésével együtt ellenőriz (`gyermekSzuletesEllenorzese`: hiteles, a szülőé, a horgony a létrehozóé, tagságot ad — KZ2; zárt szülőnek csak zárt gyermeke — D118/5; a hiányzó szülő nem végleges elutasítás). `szuletesLanc` (a `szulo` mutatókon a gyökérig, a tárból és a kapottakból; nemzedék-korlát nincs — D106): a `beolvasztas` ezen veszi be az ős-születéseket (a gyökértől, előre), a `vonal.js` születés-szelete és a `kivisz` a teljes láncot viszi. ⭐⭐ **②b a koinó-szabály** (`koinoNezete`, `koinohozTartozik`): egy esemény a koinó táráé, ha a koinóé, a láncon van, vagy egy ős eseménye a vágása előtt — a létrehozóé a lánc-pont (a sorszám a gyermek születéséé alatt), mindenki másé az óra szerint; a `beolvasztas` és a szelet halmaza (`egyeztetettEsemenyek`) ugyanezt hívja. ⭐ ③: `jelenbenSzamit` (a jelen réteg: a szerkezet mindenkié, a súly csak a költözőké, nemzedékenként), `lancKoltozoi` (a létrehozó a születésével; ④a: a beköltözésekből, a lánc-ponttal és az elhagyott entitásokkal — KZ3). ⭐⭐ ⑤b: `lancbanVan` és `lancNezete` — a szerző LÁNCA a koinóban (a költözőé a hozott előtaggal; a nem költöző szülőbeli múltja nem a gyermekbeli lánca, az ott 1-ről indul; a születés nélkül a koinó saját eseményei), egy szabály a lánc-végnek (`esemenyTar.js` `ujSajatHelye` — a művelet és az író), a lánc-gyökérnek, a művelet összegének, a vállalásnak és a lánc-ellenőrzésnek; a koinó képe nemzedékenként a lánc-ágat és a láncon ismert, de a jelenből kizárt sorszámokat adja a szabály-rétegnek. ⭐⭐ ④a: `bekoltozesEllenorzese` (a koinó és a szülő születésével, a lánc-pont alakja, a VÁGÁSKORI tagsági bizonyíték — `szuloTagsagaEllenorzese`, a születésével egy szabály), `bekoltozesekEllenorzese` (a tagsági csomagban utazóké — a kapu és a társ tagsági ítélete hívja).
- ⭐⭐ **A KÖLTÖZÉS A FELÜLETEN (D118 ⑥, 2026-10-25)** — `koino.js` `koltozesElokeszitese` (semmit nem ír — a parancs, az
  előnézet és a végrehajtás ugyanezt hívja), `koltozesVegrehajtasa` (a kiköltözés, az első kitöltés, a beköltözés, a kézi
  út), `koltozesElonezete` (a saját koinó ismert gyermekei a készüléken: költözhetek-e és miért nem, a kerete, a hozott
  pontjaim), a kapun `GET`/`POST /api/koltozes` (csak a saját — indításkori — koinóból), `koinoTaraEgyszer` (a többi koinó
  tára folyamatonként egyszer); `js/allapot/ter.js` (a beköltözés is horgony — `HORGONY_TIPUSOK`; a kártyán `szulo`,
  `szuloNev`, `szuloIsmert`, `gyermekek`, `enBekoltoztem`, `kikoltoztem`); a lap: `felulet/js/terNezet.js` (a családfa a
  kártyán), `felulet/js/koinoKoltozes.js` (a „🧳 Költözés…” ablak — `foMenu.js`), `css/components/koinoKoltozes.css`.
- `js/allapot/ketReteg.js` — ⭐⭐ **A KOINÓ KÉPE KÉT RÉTEGBEN** (D118 ③, 2026-10-24): `koinoKepe` — a három fázis (állapot, döntések, végrehajtás) EGY helyen (a parancssor `kepetKeszit`-je, a pakli és a művelet hívja); szülőre épülő koinónál a múlt nemzedékenként, az ős szabályaival, a vágás pillanatára (rekurzívan; a múlt képe gyorsítótárban, a bemenete lenyomata szerint), és a lezárt döntései rögzítve (`javaslatokSzamitasa` `rogzitettek`); a jelen bemenete `koinoLanc.js` `jelenbenSzamit` szerint (a szerkezet mindenkié, a súly csak a költözőké — `lancKoltozoi`: a létrehozó a születésével). Szülő nélküli koinónál a kép ugyanaz, mint eddig (próba: az ujjlenyomat bájtra). A bemenet `esemenyTar.js` `koinoBemenete` (a koinó-szabály szerint). 83. mérés.
- `js/allapot/tagsag.js` — ⭐⭐ **A TAGSÁG TISZTA SZÁMÍTÁSA** (D56, D59, D93, 2026-10-03): egy esemény-halmazból, SZINKRON, EGY HELYEN — a szabály-réteg, a tagsági csomag kapu-ellenőrzése és az `identitas.js` tár-alapú `tagE`-je (ami csak összegyűjti a lánc eseményeit, `tagsagiEsemenyekGyujtese`) ugyanezt hívja. Alapító (a létrehozó, vagy a megnevezett és az `alapitas`-ra hivatkozó) · tag: érvényes meghívás egy tagtól (neki szól, nem önmagáé, a meghívó horgonya a meghívás szerzőjéé; D93/5: ha a koinó profil-mezőket vár, a meghívás megnevezi a profil lenyomatát és a profil megvan) · ⭐ a LEGRÖVIDEBB lánc számít, legfeljebb `MELYSEG_KORLAT` = 256 (D113 — a 78. mérés: a legmélyebb tag a koinó saját határáig sem éri el; 63. mérés: a „végtelen” őre). A hiány „nem ellenőrizhető” (D19), a kör nem szül tagságot. ⭐ **A TAGSÁGI CSOMAG** (`TagsagiCsomag`, D93/2): a tag a saját azonosság-szeletébe teszi a legrövidebb lánca eseményeinek másolatát (`tagsagiLanc`); a kapu ellenőrzi (`tagsagiCsomagEllenorzese`), az index a tartalmát is beolvassa — az ősök szeletei nélkül is tagság. A `Profil` (D93/5, `muveletek.js` `profilMegadasa`): a darab (a mezők + egy véletlen só) a fájl-tárban, az esemény csak a lenyomatát hordozza.
- `js/allapot/osszPont.js` — ⭐⭐ **AZ ÖSSZ-PONT A SZELETELT VILÁGBAN** (D76/2, D92/5, 2026-10-03): össz-pont(X) = a szerzők pontja X-en + a gyerekek össz-pontja — FELFELÉ ÖSSZEGZŐDIK (`osszPontokSzamitasa`: amelyik gyereket tartjuk, azét számoljuk, amelyiket nem, annak a BEMONDOTT össz-pontját vesszük; ami se ez, se az, az 0, és a `bizonytalan` kimondja; iteratív, körbiztos — ⛔ D101 ④: a `tartott` kérdéssel a nem tartott entitásnál akkor is a bemondás számít, ha a saját pontjait ismerjük; elágazás 133). A tartó X részfájáról állapot-fát tart (`reszfaLevelei`: 'p:' + szerző → a nyertes aláírt pont-esemény — az állapot `pontEsemenyek` főkönyvéből —, 'g:' + gyerek → az össz-pontja; a `reszfaKarbantarto` a különbséget vezeti rá, korlátosan), a kérdező a gyökér bemondása UTÁN mintát kér (`mintaHelyek`, kriptográfiai véletlen), és ellenőriz (`fejlecEllenorzese`: a levél tartománya fedi a helyet, és az aláírt pont-esemény ugyanazt mondja). ⚠️ Kimondott határai: a gyerek-levél bemondás (ott ellenőrizhető, ahová a nézet lép), az egyezmény által ÁTVITT pontnak nincs saját eseménye (`atvitt` — nem ellenőrizhető, nem csalás), és a frissesség törekvés (a „legnagyobb ellenőrzött válasz”). 62. mérés. ⭐⭐ **D116 (2026-10-22): az ÖSSZ-DARAB** — a részfa-fa
  három összeget visz (`RESZFA_HOSSZ`: [pont, darab, gyerek] — a szerzői levél [pont, 0, 0], a gyerek-levél [össz-pont, 1 + alatta,
  1]); az `osszPontokSzamitasa` az alattát is összegzi (`alatta`, `alattaBizonytalan` — a bemondott ágé a bemondásból), az
  `ismertAlattaSzamitasa` a helyben ismert leszármazottakat; a szúrópróba a darab és a gyerek szerint is (`mintaHelyekOsszegre` —
  a hely egy pár; az eltalált gyerek születése kell: `szuletesek`, `szuloje`). A kérelem a tételekben és a kérdezettnél `ad`/`adb`
  (a gyökér köti), a pakli egy segédből mondja ki, mi maradt felderítetlen (`pakli.js` `felderitetlenTudas` — a kártyák `hiany`-ja,
  a `testverHiany`, a sorok `koinoHiany`-ja, a felderítés `agOsszes`-e), a felület egy szöveggel (`felulet/js/koinoFelderitetlen.js`).
  ⛔ A minták születése nem kerül a tárba (bizonyíték, nem tudás). 81. mérés.
- `js/allapot/lezarasiOsszegzes.js` — ⭐⭐ **A LEZÁRÁSI ÖSSZEGZÉS** (D95/1 (a)–(b), 2026-10-05): egy NAGY szeletű érintett döntése a nyers események nélkül — a teljes tartó a lezárás pillanatképéből építi (`lezarasiOsszegzesEpitese`: a végső számok, a küszöbök, a lezárás, a különválók, és három fa: a beszámított szavazatok `'v:' + szerző`, a lezáráskori aktív tulajdonosok `'n:' + szerző`, az érték javaslatok küszöbönként érték szerint rendezve — a medián helye mindig a minták közt), az összegző tartó MAGA sorsol mintát (`lezarasiMintaHelyek`) és ellenőriz (`lezarasiOsszegzesEllenorzese`: a számokból UGYANAZZAL a képlettel az állás és a határidő, a minták aláírása, időpontja, jogosultsága, tagsága — a nem ellenőrizhető tagság nem hiba). ⭐ Az elhallgatott szavazatot a szavazó veszi észre (`kimaradtSzavazat`: a saját aláírt szavazata + a fa hiány-bizonyítéka). Esemény: `LezarasiOsszegzes` (a javaslat szeletébe, az érintetthez bejelentve). A döntés-számítás (`javaslatokSzamitasa`, `osszegzesek`) az összegezve tartott szelet részét az ellenőrzött összegzésből számolja, a többi rész a közös lezáráshoz igazodik. 67. mérés.
- ⭐⭐ **A CSAK KÜLDŐ ÚT (D95/3, 2026-10-05)** — `osszegzoTartas.js` (`sajatKuldo`, `kuldoFogado`): ahol saját eseményem van, de a szeletet nem egyeztetem halmazként (nem vállalom, vagy csak összegezve tartom), ott csak a sajátjaimat ajánlom fel (`kul` a CIMEK-ben), onnan semmit nem kérek. ⛔ D101 ⑥ óta a saját szeletük mellett a BEJELENTÉSI HELYEIKEN is (`koino.js` `kuldoKulcsai` — `bejelentesHelyei`, a gyökér kivételével): különben egy nem tartott gondolat alá írt gyerek a szülő tartójához soha nem ért el (elágazás 143). A fogadó (aki egészében tartja) a hiányzókat kéri és a meglévőket visszamondja (`megvan`); amit egy tartó átvett vagy tudott, az KÉZBESÍTETT (`kezbesites.json`, `fajlTar.js` `kezbesitesTarolo`) — többé nem utazik. Csak a 14 napnál frissebb (`KULDES_ELETTARTAM`). A zárt koinó nem tagjának is, de csak a megengedett szeletekben (a meghívása így jut el hozzá). A `vallalas` kimondja, hány vár kézbesítésre.
- `js/allapot/ketFok.js` + `js/allapot/osszegzoTartas.js` — ⭐⭐ **A KÉT FOKÚ VÁLLALÁS** (D95/1, D95/3, 2026-10-05): a vállalt szelet KICSI → egészében (a csere halmazként egyezteti), NAGY (`KETFOK_KUSZOB` = 1000 esemény fölött, vissza `KETFOK_VISSZA` = 800 alatt; helyi mennyiség) → összegezve; az azonosság-szelet és a koinó születése mindig teljes, a „mindent” beállítás (D83/2, `kiszolgalas.json`) mindent teljesen tart. A szerepek a cserében: az ÖSSZEGZŐ (`osszegzoKerdo` — megnevezi a szeleteit a legutóbb ellenőrzött gyökérrel, mintát sorsol, ellenőriz, tárol: `osszegzesek.json`, `fajlTar.js` `osszegzesTarolo`), a TELJES tartó (`teljesTarto` — az új gyökér a D92/5 részfa-fájából és az azóta lezárt döntések összegzései; lezárási mintát csak olyanra, amit maga is bájtra ugyanígy számol), a KÜLDŐ és a FOGADÓ (`sajatKuldo`, `kuldoFogado` — a saját eseményeim a nem egyeztetett szeletből). A vonal (`osz`/`kul` a CIMEK-ben és a CIM-pótlásban; `OSSZEGZESEK` → `OSSZEGZESMINTAKEREK` → `OSSZEGZESMINTAK`) semmit nem tud a koinóról; a `koino.js` köti be (`ketFokBeallitasai`, `ellenorzottOsszegzesek`, `lezarasiOsszegzesekKiadasa` az őrjáratban). Az össz-pont az összegezve tartott szeletnél a tárolt gyökérből (`osszegzett` bemondás, `osszPont.js`). ⚠️ A nagy szelet már meglévő eseményei a tartós tárban maradnak — a tömörítés a bekapcsolással jön.
- `js/allapot/tagsagKisero.js` — ⭐⭐ **A TAGSÁGI KÍSÉRŐK** (D95/2, 2026-10-05): a döntésben csak az ellenőrzött tag számít (D93/1), a szerzők azonosság-szeletét viszont a szigorú (b) alatt nem tartom — ezért a csere végén akinek a tagságát nem tudom, annak a csomagját kérem. A tagság forrása a tár (`szerzoTagsagaTarbol`: a szerző saját eseményei a mutatóból — a horgonya, a csomagja —, a láncának bejárása, és a MI koinó-születésünk elöl). A KÉRDEZŐ (`tagsagKerdo`): az újonnan kapott döntési események szerzői és a FÜGGŐK jegyzéke (`tagsagfuggo.json`, `fajlTar.js` `tagsagFuggoTarolo` — 256 szerző, 6 óra, 30 kérdezés), legfeljebb 32 egy cserében; a fogadás csak a kért szerzők csomagját és a lánc-típusú eseményeket veszi át, ugyanazon a kapun; a `tagE` a B1 mintáinak szerzőit is innen dönti el. A VÁLASZOLÓ (`tagsagiKiserok`): a legutóbbi csomag, vagy ha nincs, a tagsági lánc (amennyit ő bizonyítani tud), egy eseményt egyszer, egy szerzőét egészben vagy sehogy, legfeljebb 1024-et és 4 MB-ot (D113). A vonal (`TAGSAGKEREK` → `TAGSAGCSOMAGOK`, a 6. lépés; egyező szeleteknél is, ha a nyitás `tk` jelet hoz) semmit nem tud a tagságról. A kézi út párja: a `kivisz <entitás>` a kísérőket is viszi.
- `js/allapot/vallalas.js` — ⭐⭐ **A VÁLLALÁS** (B/1 — D75, D86, D90, 2026-10-03): mely szeleteket tartom TARTÓSAN — számított, a SAJÁT láncomból (a terhe a saját tevékenységemmel nő): a pozitív pontú szeleteim (ugyanazzal az ítélettel, mint a szabály-réteg — `pontEsemenyMerlege`; D85 óta a javaslat és a töredék is), az azonosság-szeletem (`Belepes`, az alapítónál a `KoinoLetrehozas`), és a koinó születése (D90/2). ⛔ A gyökér nem vállalás (D90/1 — a G dolga). Erre épül: a két tár (a `hozd` a nem vállaltat az átmenetibe teszi), a „nem tartod” jelzés, később a G és a B/3. ⭐ **D104 (2026-10-15): a KIFUTÁS** — a pont levétele után még `KIFUTAS` (24 óra, a saját eseményem `ido`-ja szerint) vállalt marad a szelet (`kifuto`), hogy a többiek későbbi változásait (pl. az utolsó pont levételét) is megkapjam; a próbák `KOINO_KIFUTAS`-sal állíthatják.
- `js/allapot/eszlelo.js` — ⭐⭐ **AZ ÉSZLELŐ** (D82 sorrend ①): a megadott (jellemzően most beérkezett) események szomszédságában — ugyanaz a sorszám (elágazás), az előző és a következő (folytonosság), maga a pont-esemény (bemondás) — bizonyítható ellentmondást keres, és CSAK a kapun is átmenő leletet adja. Célzott tár-kérdések: a terhe a beérkezett eseményekkel arányos, nem a koinóval. A bejelentés a művelet-rétegé (`ellentmondasokBejelentese`: a vádolt azonosság-szeletébe, ismétlés nélkül); a `koino.js` a csere, a `behoz` és az `ellenoriz` parancs után hívja.
- `js/allapot/ellentmondas.js` — ⭐⭐ **AZ ELLENTMONDÁS BIZONYÍTÉKA** (D79, D80): az `Ellentmondas` esemény tartalma — a vádolt SAJÁT, egymásnak ellentmondó aláírt állításai (bemondás · folytonosság · negatív levél), a lánc-gyökerük előképe és egy logaritmikus bizonyíték. `ellentmondasEllenorzese` levezeti a vádpontot; a **kapu** (`esemenyMentese`) hívja, a **szabály-réteg** a vádponttól kihagyja a vádolt pont-eseményeit, a bejelentés (`ellentmondasBejelentese`) a vádolt azonosság-szeletébe teszi. ⛔⛔ Becsületes láncra nem állítható össze vád: ugyanaz az ítélet (`pontEsemenyMerlege`), mint a szerző saját gyökerénél, és ⚠️ az előkép SZÁMAIT (darab, összeg) sehol nem használja bizonyítás nélkül — csak a lenyomat kötött.
- `js/allapot/lancGyoker.js` — ⭐⭐ **A SZERZŐ LÁNC-GYÖKERE** (D78, D81, az A pillér 2. lépése): minden új saját esemény `lancGyoker`-e = `{ naplo: napló(1..k-1), kiosztas: kiosztás(k-1) }` — az ESEMÉNY ELŐTTI két gyökér MAGA (D81: a bizonyíték az eseménnyel utazik), a pont-esemény pedig az `adat.bizonyitek`-ben az entitása régi értékének bizonyítékát is hozza (`lancUjEsemenyhez`); a kapu ezt ellenőrzi (`pontEsemenyOnbizonyitasa`), a szabály-réteg pedig ebből ítél (`onbizonyitas`) — hézagos láncnál is. A kiosztást ugyanaz az ítélet állítja elő (`pontEsemenyMerlege`), mint a szabály-réteget. A gyorsítótár (memória + `lanc.json`) az utolsó lefedett esemény azonosítójához kötött (az `elozo`-lánc az egészet elköti) és ellenőrző-lenyomattal védett; ha nem illik, a láncból épül újra. ⛔ Ha a saját lánc nem ép (hézag, elágazás, szakadás), a gyökér null. `lancAllapotaLancbol`: a teljes állapot (a kiosztás FÁJA is) — ebből állítja elő a szerző a bizonyítékot (③).
- `js/esemeny/osszegzoFa.js` — ⭐⭐⭐ **AZ ÖSSZEGZŐ MERKLE-FA** (D78, 2026-09-27; az alappillérek A-ja): egy csomópont (`{ l, d, o }` — a lenyomat a darabot és az összegeket is fedi; a levél, a belső csomópont és az üres fa más előtaggal), két elrendezés: a **napló-fa** (RFC 6962 alak; a szerző a folytatáshoz csak a csúcsokat tartja) és az **állapot-fa** (a helyet a kulcs lenyomatának bitjei szabják meg, egyelemű részfa maga a levél — sorrend-független, törlés után is kanonikus). Bizonyíték a jelenlétre ÉS a hiányra, és ⭐ **a változás a bizonyítékból** (a régi gyökér + a kulcs bizonyítéka → az új gyökér, a fa nélkül). ⛔ A kívülről jött bizonyíték alakját, méretét és kanonikus voltát is ellenőrzi (a csaló fát is elutasítja). ⚠️ **A határa:** a rejtett negatív levelet csak a teljes lista mutatja meg (`allapotGyokereListabol`). ⭐ **D92/5 (2026-10-03): a SÚLYOZOTT MINTAVÉTEL** — `allapotSulyozottKeresese` (melyik levélre esik az r-edik egység) és `allapotSulyozottEllenorzese` (a levél tartománya a bizonyíték bal testvéreinek összegéből; negatív összeg az úton: elutasítás) — az össz-pont szúrópróbája: a felfújt gyökér hamis leveleire k mintából 1 − (1 − f)^k eséllyel esik minta (62. mérés). Hálózatot nem importál.
- `js/tar/fajlTar.js` — a tár: **hozzáfűzhető fájl** (`esemenyek.jsonl`), soronként egy esemény. Nincs adatbázis-motor és nincs séma-migráció; „módosít" és „töröl" nincs, mert a modell szerint nem is létezhet. ⭐ **És `frissit()`-et** (2026-09-26, 43. mérés): egy készüléken több folyamat ír ugyanabba a fájlba (őrjárat, második ablak, felület), a mutató viszont megnyitáskor épül — ez olvassa be a fájl új végét. ⭐⭐ **D73 (2026-09-27): a MUTATÓ az esemény teste NÉLKÜL** (eseményenként a sor helye, azonosító, szerző, sorszám, szelet) — ebből felel a tár minden kérdése, és ebből a `szeletek()` és a `szeletLenyomata()` (a C erre épít); a **pillanatképe** (`mutato.json`) a megnyitást gyorsítja, a **testek kérésre** jönnek. ⛔ A pillanatkép tiszta gyorsítótár: ha nem illik a fájlhoz, a mutató a fájlból épül újra, és a testek beolvasásakor minden mezőt ellenőrzünk. *(A szeletenkénti fájlokat a 49. mérés vetette el — Windowson a teljes betöltés 19,6 s lett volna.)*
- `js/allapot/felderites.js` — ⭐⭐ **A FELDERÍTÉS** (D108/1, D112 — tiszta számítások): egy ág egyszeri PILLANATKÉPE — a beállítás (`felderitesBeallitasa`: K = 200 ≤ 2000, mélység ≤ 64, csak fejléc vagy a törzs is, 20 MB ≤ 500, 4 kérés / kör ≤ 16; egyszerre ≤ 8 fut, együtt ≤ 1 GB), a jegyzék (`<koino>/felderitesek.json` — a `koino.js` írja; ugyanarra az ágra az újrafelderítés a régi helyére lép), a lépés (`felderitesLepese`: kész, ha az első K biztos — vagy a kisebb ág teljes —, keret a méretnél, elakadt két óra haladás nélkül, különben a beállított számú kérés), az elévülés (30 nap). A végrehajtó: `koino.js` `felderitesKor` az őrjárat minden körében — a Struktúra sorrendje az ágban (`pakli.js` `felderitesAllasa`, `maxMelyseg`), a látható csomópontok RÖGZÍTÉSE az átmeneti tárban (`atmenetiTar.js` `rogzites` — a böngészés kerete csak a nem rögzítettekre számol, a rögzítettekre külön, `ROGZITETT_KORLAT` = 1 GB; a bemondott össz-pontjaik is megmaradnak — `korlatosBemondasok`), a hiányzó HÁTTÉR-kérésként (`fuggoKerelmek.js` `hatter` — egy társnál a lap kérései előbb mennek; ≤ 48 függő, hogy a lapnak maradjon hely); a `felderites` parancs. Nem frissül, értesítést nem ad — a követés eszköze a tudatpont.
- ⭐⭐ **A FÁJL-TÁR KERETE (D112 ①, 2026-10-18)** — `fajlTar.js` `fajlBlobTarolo` (`allapot`: a kész fájlok mérettel és az utolsó érintés idejével; `erintes`; `torol`) + `fajlTakaritasTerve` (tiszta: a védett és a friss — `FAJL_FRISS` = 24 óra — marad, a nem vállalt együtt ≤ `FAJL_ATMENETI_KORLAT` = 50 MB, fölötte a legrégebben érintett megy) + `koino.js` `fajlTarTakaritasa` (a védett: a vállalt entitások törzse — `fajlIgenyek` a tágabb `vallaltE`-vel: a pont, a saját létrehozás, a vállalás —, és a profil-darabok; a „mindent” készülék mindent tart; ritkítva — `FAJL_TAKARITAS_KOZ` = 10 perc — az őrjáratban és a törzs-kérelem után, a `tomorit [proba]` kényszeríti; a felület a megmutatott fájlt megérinti; a próbák: `KOINO_FAJL_ATMENETI`, `KOINO_FAJL_FRISS`). ⭐ A tartalom-címzés miatt a kiesett fájl bármikor újra elhozható.
- `js/tar/atmenetiTar.js` — ⭐⭐ **AZ ÁTMENETI TÁR** (B/2, D75, 2026-10-03): amit csak LÁTTAM (a `hozd`, később a D kérelmének válasza) — **eldobható**: ha kell a hely (`ATMENETI_KORLAT`, 20 MB, állítható), a LEGRÉGEBBEN MEGNÉZETT szelet megy (SK11); a „megnézett” helyi feljegyzés (a `hozd` és a felületen megnyitott kártya), nem esemény. ⭐ Ugyanazt a három tár-műveletet adja, mint a tartós (`esemeny`, `sorszamSzerint`, `hozzafuz`), tehát az `esemenyMentese` VÁLTOZATLANUL ír bele — ugyanaz a kapu. Szeletenként egy fájl (`<koino>/atmeneti/<kulcs>.jsonl` — az eldobás egy fájl törlése; korlátos, ezért a 49. mérés ellenérve itt nem áll). ⭐ D100: a `frissit` beolvassa, amit MÁS folyamat írt bele vagy dobott ki belőle (az őrjárat hozza a kérelem válaszát, a futó felület mutatja) — a `valtozat` jel-fájl dönti el, kell-e végignézni; a két tár nézete (`ketTarNezet`) és a `ketTarBemenete` hívja. `ketTarBemenete` / `ketTarNezet`: a számítás és a felület a két tárból olvas (a `csakAtmeneti` a D14 kivételéhez). ⭐ **Az előléptetés** (`koino.js`): ami az átmenetiben van, de már vállalom, a tartós tárba kerül (minden parancs indulásakor és az őrjárat körében). ⚠️ A csere még a MAI módon fut (a tartósba) — a szigorú (b) a B/3.
- `js/tar/iro.js` — ⭐⭐ **AZ ÍRÓ** (D70, 2026-09-26): koinónként és készülékenként EGY folyamat fűz a tárhoz. **A csatorna maga a zár** (Windowson cső, máshol fájl-foglalat az ideiglenes mappában — ott az író minden hozzáfűzés előtt ellenőrzi, hogy még ő hallgat-e). Aki nem író, a kész, aláírt eseményt átadja; az író SENKI helyett nem ír alá, ugyanazon a kapun enged be mindent (3. szabály), és SORBAN dolgozik: a saját új esemény csak a lánc végére kerülhet („ELAVULT"), a hálózatról jött idegen elágazás bizonyítékként megmarad (D19). ⛔ A csatorna nem tartja életben a folyamatot (a kézi parancs kilép).
- `js/tar/esemenyTar.js` — a lánc kezelése; a tárolót **kívülről kapja** (első paraméter), így a szabályok egy példányban élnek. **Ellenőrizetlen esemény nem kerül a tárba**, és eseményt **soha nem módosítunk/törlünk**.
- `js/allapot/szabalyok.js` — **a szabály-réteg**: egy helyen dönti el, mely események **számítanak** (tudatpont-keret, javaslat-jogosultság). *Amit a számítás nem ellenőriz, az nem szabály, csak illemtan* — a felület a másik gépen nem véd semmitől. A szabálysértő eseményt **nem törli**, csak kihagyja és felsorolja (D19). ⭐⭐ **D93/1 (2026-10-04): a döntésben csak a TAG számít** — a pont, a javaslat, a szavazat, az érték javaslat és az állásfoglalás (`TAGSAG_KELL`) csak akkor, ha a szerző tagsága a bemenetből bizonyítható (`tagsag.js`); különben a kulcs ingyen van, és egy támadó annyi pont-keretet és szavazatot gyártana, ahány kulcsot. A nem tag eseménye `tagsagFuggoben` (az okával — nem vád: P2P-n a „nem tag” és a „még nem láttam a meghívását” ugyanaz), és a bizonyíték megérkezésekor számít.
- `js/allapot/allapotSzamitas.js` — események → entitások. ⭐ B/2 (D75/4): a D14 csak a tartós tárra vonatkozik — ami csak az átmenetiből ismert, és egyetlen pont-eseményét sem láttuk, az nem tűnik el, hanem `pontokIsmeretlenek` jelzéssel marad (`beallitas.csakAtmeneti`). „E-emberenként az utolsó nyer", ezért **nem kell globális sorrend**. A 0 tudatpontos entitás **nem létezik** (D14). ⚠️ A bemenetet **egy helyen rendezi** (`rendezettBemenet`: szerző + sorszám + azonosító), mert az ÉRTÉKEK sorrend-függetlenek voltak, a **FELSOROLÁSOK nem** — a csere után a két gép ugyanazokat az entitásokat más sorrendben mutatta. Nem az idő szerint rendez: az `ido` a szerző órája.
- `js/allapot/osszehasonlitas.js` — **„ugyanazt látjuk-e?"**: az állapot ujjlenyomata egyetlen 43 karakteres szövegben (entitások, javaslatok, egyezmények, jelzések), és az `elteresek`, ami megmondja, **melyik szakaszban** térnek el. Az `ujjlenyomat` parancs ezt írja ki. ⚠️ Időfüggő — csak azonos pillanatra hasonlítható.
- `js/allapot/javaslatSzamitas.js` — a döntéshozatal; **az egyezmény itt születik számításként**. ⭐ **D85 T3 (2026-10-03): a döntés ISMERETE** — egy rész csak akkor ismert, ha az érintettjének legalább egy pont-eseménye a bemenetben van (a tárból vagy egy döntési csomagból); ha nem, a státusz `nemIsmert` (nem hajtódik végre, nincs különválás), és a részek `ismert` / `valahaTeljesult` mezője megmondja, mit tudunk. A jel tartalmi, nem a vállalásból jön — a D17 áll. Az összehasonlítások **egész aritmetikával** (kereszt-szorzás), hogy kerekítés soha ne dönthessen el szavazást. ⚠️ **A lezárás időrendben**: a határidő után érkezett esemény (szavazat, tudatpont-rendezés, érték javaslat) már nem számít bele — különben a lezárt döntés visszafordulna.
- `js/allapot/szerkesztesiVegrehajtas.js` — ⭐ **A HARMADIK FÁZIS** (2026-09-06): az elfogadott **szerkesztési** egyezmények rávezetése az entitásokra. A **D8** gyakorlati alakja: az egyezmény a TÉNY, az entitás mai alakja a HATÁLY. ⚠️ Az **általános** egyezményből soha nem következik entitás-változás (D27). A sorrend a **lejárat** szerint dől el (holtversenynél az azonosító), sosem a térkép bejárása szerint — különben két gép mást mutatna. Amit nem tud végrehajtani, azt **felsorolja** (`kihagyottak`), nem hallgatja el (D19).
- `js/allapot/pakli.js` — ⛔⛔ **EGY OLDALNYI KÁRTYA, soha nem az egész** (5.2): `darab` felülről korlátos, kulcs-alapú kurzor, a lista nem hordoz szövegeket. ⭐ A **horgony** (első N esemény + a pillanat) tartja együtt a lapozást; a közben érkezettet az `ujdonsag` bejelenti. *Helyi feljegyzés, nem esemény.*
- `js/felulet/kapu.js` — a **helyi kapu** a böngészőnek (5.1). ⛔ **Semmit nem tud a koinóról** — ettől marad a böngésző cserélhető rajzoló (7. szabály). Öt őr: hurok-cím · jelszó · Origin · Host · útvonal.
- ⭐⭐ **A HÁZ — a felület paklija (D100, 2026-10-10)** — `felulet/js/components/Pakli.js` (+ `TestverJelzo.js`, `utils/testverRendezes.js`, `css/components/testverJelzo.css`): a prototípus láncos-testvéres nézete **bájtra változatlanul** (felmenők, a kiválasztott, a bogár, a testvérek ‹ N / N › kacsacsőrökkel, húzás, lapos rendezés). ⭐ **A lap fordít:** a `Pakli.js` a prototípus útvonalait kérdezi, a `kartyaAdat.js` `prototipusUtvonala` megmondja, hova menjen (`/api/pakli/hierarchikus` — `pakli.js` `pakliHierarchia`; `/api/pakli`), és a választ a prototípus alakjába fordítja; az `apiHelper.js` `apiGet`-je kérdezi meg, a pakli válaszát a lap horgonyává teszi, és a `koino:pakliValasz` eseménnyel adja tovább, amit a `Pakli.js` nem tárol. `felulet/js/koinoPakli.js` (alosztály, a meglévő metódusok KÖRÉ): a csendes újrakérdezés (H1 — a függő kérelmeket az őrjárat hozza; 4 → 60 mp, a kiválasztás helyén újrarajzol; ha nincs kitől kérni, „keresem”, nem „betöltés”), a forrás jele (H2 — ✓ ≈ +? ?, a nem tartott kártya szaggatott keretű, a nem látott pontok „?”), a lapos nézet lapozása (kurzorral). A program oldala: `koino.js` `/api/pakli/hierarchikus` + `lapHianyzoinakElkerese` (lekérésenként ≤ 4 függő kérelem, a 10 percen belül elhozottat nem kéri újra).
- ⭐⭐ **A MARADÉK MODÁLOK (D101, 2026-10-11)** — `felulet/js/components/modals/` (`TudatpontokModal`, `KategoriaModal`, `GondolatTipusModal`, `RendezesModal` + sablon, CSS — **bájtra a prototípuséi**) + `felulet/js/foMenu.js` (a prototípus `foOldal.js`-ének MENÜJE, a fejléc elején) + `felulet/js/koinoModalok.js` (a koinós többlet a prototípus-metódus KÖRÉ — `koruleIr` —, mert a modálokat az örökölt kártyák példányosítják: a program `koinoMegjegyzes`-e, a tudás határa, a modál listája alá). A program oldala: `pakli.js` `agHelyzete` (**„X ága alatt van-e?” egy helyen** — a felmenő-láncon, ≤ 64; a hiányzó felmenő „nem eldönthető”), `sajatHozzarendelesek` (a Tudatpontok — a saját láncból), `pakliOldal` `agazat` (a Rendezés ág-szűrve); a kapun `/api/tudatpont/aktiv-hozzarendelesek`, `/api/eember/sajat-adatok`, `POST /api/kategoria` és `/api/gondolatTipus`. ⚠️ A lap fordít: a `FormData`-t JSON-ra (`apiHelper.js` `formDataJsonna` — a kapu csak JSON-t fogad, a fájl a feltöltésen át lenyomat-cím lesz). ⛔ **A küszöb KÉT alakja** (`pakli.js` `KUSZOB_NEVEK_KINT`): a medián az időket `aktualMinimumDontesiIdo`, egy e-ember javaslata (amit a modálok küldenek) `minimumDontesiIdo` néven — a `kuszobokBefele` a javaslat-alakot fordítja (elágazás 109). ⭐ **③ a Struktúra** (`StrukturaModal` + `utils/faElrendezes.js`, bájtra): `pakli.js` `strukturaDarabszam` / `strukturaLap` — a fa a bejáró sorrendjéből (`biztosElotag`), egy keretig (`STRUKTURA_KERET` = 5000, lapok `STRUKTURA_LAP` = 2000, a kurzor a horgonyt viszi), a prototípus sor-alakjában; a kapun `/api/struktura/darabszam` és `/api/struktura`, a `kapu.js` a jelszót `Authorization: Bearer`-ből is elfogadja (a modál nyers `fetch`-e); a `koruleIr` ígéret-tudó (elágazás 122–126). ⭐ **④ a Síkidom** (`SikidomModal`, `SikidomKartyaPanel` + `utils/sikidom*.js`, `debugFogantyu.js`, bájtra): `pakli.js` `sikidomGyerekek` / `sikidomOslanc` (egy szint a bejáró sorrendjéből, küszöb és kurzor, ≤ 300; a gyerek-tudás egy helyen: `gyerekTudas` — a bejáróval közös), a kapun `/api/sikidom/gyerekek` és `/api/sikidom/oslanc` (a kép mindig friss); a lap csendes újrakérdezése a `koinoModalok.js`-ben (a `betoltes` jel a `koino:megjegyzes` eseménnyel); ⛔ az `index.html` a kártya-gyárat importálja előre (az örökölt importkör); a `kartyaAdat.js` a teljes kiválasztottat adja (elágazás 127–135). ⭐ **⑤ a Keresés helyi alja** (`KeresesModal`, bájtra): `pakli.js` `keresesHelyben` (a két tárból, a cím-viselők, típusonként `KERESES_ALAP` = 10 / `KERESES_MAX` = 50, a legerősebb elöl, ág-szűrve az `agHelyzete`-vel), a kapun `/api/kereses` (`agEntitasId`, `limit`; ⭐ a kereső-réteg ⑦ óta a háttérben a hálózaton is — `koino.js` `halozatiKereses`, a találat az átmeneti tárból a helyi listában, a `keresesMegjegyzes` kimondja az állását; a lap a `betoltes` jelre újrakérdez — `koinoModalok.js`); elágazás 136–138, 174. ⭐ **⑥ az értesítés-réteg** (`ErtesitesekModal`, `ErtesitesiBeallitasModal`, bájtra): `js/allapot/ertesites.js` (a postafiók két pillanatkép különbségéből — `pillanatkep`, `ertesitesekSzamitasa`; a beállítások öröklődése — `ervenyesBeallitas`; korlátok: 500 tétel / 30 nap / 1000 beállítás), `pakli.js` `ertesitesiKep`, `fajlTar.js` `ertesitesTarolo`, a kapun `/api/ertesitesek…` és `/api/ertesitesi-beallitasok…` (`koino.js` `postafiokFrissitese` — a felület számol, a műveletek sorban), a kártyák `olvasatlanErtesitesek`-e a pakli válaszain; elágazás 139–143. ⭐ **D103 a készülék saját értesítése:** `ertesites.js` `keszulekErtesitesei` (mit jelezzen: azonnal ≤ 5 + „és még N”, vagy összefoglaló N óránként), `js/felulet/eszkozErtesites.js` (a platform eszköze, npm nélkül; a szöveg sosem a parancsban; `KOINO_ERTESITO` cserélhető), a postafiókot az őrjárat is számolja percenként legfeljebb egyszer (`orjaratErtesitesei`), a folyamatok közt zár (`ertesitesTarolo` `zar`); elágazás 144–147.
- ⭐ **AZ ALSÓ SÁV (2026-10-15)** — `felulet/index.html` (a prototípus `foOldalForm.html`-jének sávja: `#hamburger-menu-kontener`, `#tortenet-vissza-gomb` / `#tortenet-elore-gomb`, az `info-*` elemek, és a koinós `#info-csere`), `felulet/css/components/foOldal.css` és `felulet/js/components/FoOldalTortenetKezelo.js` (**bájtra a prototípuséi**), `felulet/js/alsoSav.js` (a prototípus `foOldal.js`-ének alsó sáv része: a vissza/előre történet a `koino:aktivEntitasValtozas` / `koino:rendezesValtozas` / `koino:nezetNyitas` jelzésekből — az `authHelper.js` `aktivEntitasMentese` küldi, mint a prototípusé —, az infók, és a csere). A program oldala: `pakli.js` `helyiStatisztika` (a kártyák száma típusonként és az e-emberek a lap képéből — `/api/platform/statisztika`); `js/csere/csereAllapot.js` + `fajlTar.js` `csereAllapotTarolo` (`<koino>/csere.json`: az őrjárat a kör elején, a csere-rész végén és a kör végén írja, a `resMunka` a sikeres csere után; „nem fut”, ha két ablak + 2 perc óta nem frissült) — `/api/csere-allapot`. A lap 10 mp-enként kérdez (rejtett lapnál nem), és ha az `utolsoUj` lépett, `KoinoPakli.kulsoValtozas` (a kiválasztott fa-szelete csendben; eltűnt kiválasztott → a szülője), az infók és a menü számlálója (`foMenu.js` `_ertesitesBadgeFrissitese`) frissül. A fő menü a tér pontját is adja (`terMegnyitasa`) és a nézet-modálokat újranyitja (`_nezetModalNyitasa`); elágazás 148–152.
- `js/allapot/identitas.js` — ⭐ **KI TAG?** — és ez **számítás, nem esemény** (D17). A 9/c terv 4.1–4.3 lépése — **három kérdés, ugyanazzal a vázzal** (TAG ← meghívás · TANÚSÍTHAT ← felhatalmazás · 2. LÉPCSŐS ← tanúsítás): az **alapító** a gyökér (a `KoinoLetrehozas` szerzője), mindenki más a **saját `Belepes` horgonyával** és **egy** érvényes meghívással tag. ⭐⭐ A meghívás a **meghívott szeletébe** kerül (ettől korlátos a „hányan hívtak be?"), és **magával hozza a meghívó horgonyát** (`adat.sajatBelepes`) — így a lánc bejárása tiszta mutató-követés, keresés nélkül. A **gyorsítótár nem kényelem, hanem a lényeg**: nélküle 3^mélység, vele az ős-halmaz (mérve: 17,7 → 40,7 ős 1500 → 20 000 főnél). ⚠️ A hiányzó esemény **nem vád**, hanem „nem ellenőrizhető" (D19), és a **kör** nem szül tagságot. ⭐⭐ **D118 (④c): az ÖRÖKÖLT állapot** — a gyermekben a beköltözött (a horgonya a beköltözése) és a létrehozó (a gyermek születése) tanúsíthat-e / 2. lépcsős-e kérdése a szülőben folytatódik (`oroklesForrasa`, a szülő szabályaival — `szuloNezete`; a szúrópróba sétája is); ⛔ a gyermek születése nem alapító kör (4.2).
- ⭐⭐ **A 2. LÉPCSŐ SZÚRÓPRÓBÁVAL (D94, 2026-10-04)** — `identitas.js`: a `lepcso2E` keretet nyit (`LEPCSO_KERET` = 1000 esemény-olvasás); ha a teljes ellenőrzés belefér, az dönt (pontos), ha nem, a `lepcso2Szuroproba`: a helyi rész teljesen (a bemondott tanúsítások és a tanúsítók bemondott felhatalmazásai, D61-gyel), és `SZUROPROBA_SETAK` = 8 véletlen út az alapító körig (az ELLENŐRZŐ választ, kriptográfiai véletlennel; az út az alapító tanúsítónál vagy egy már igazolt 2. lépcsősnél ér célba; kör és 64-nél mélyebb út: nem ellenőrizhető). ⛔ Az út CSAK aláírt bemondásokat követ: a 2. lépcsős `LepcsoBemondas`-át (a saját szeletében; `muveletek.js`: `lepcsoBemondasKiadasa` — csak az érvényes tanúsítások; az őrjárat és a `tagsag` parancs adja ki) és a tanúsító felhatalmazás-bemondását (D47; a tanúsítás csak ellenőrzött 2. lépcsős felhatalmazót mond be) — és minden bemondott tételt megkövetel (a szeletbe szórt hamis állítás így nem buktatja el a becsületest, és a csaló nem hígíthat). A közös helyi szabály: `allitasHelyben`, `tanusitoFelhatalmazoi`. 65. mérés.
- `js/allapot/jelzesek.js` — ⭐⭐⭐ **A VALÓDI VÉDELEM: a kontraszt-jelzés** (9/c 4.4). *„Hány olyan embert tanúsítottál, akinek nincs önálló élete a közösségben?"* — a becsületes alapvonal **0,3**, a megvett tanúsítóé több száz; mérve **100% / 9–25%** minden támadó ellen. ⭐ Nem a NAGY SZÁM kell hozzá, hanem a **kontraszt** — ezért a 18 ugyanolyan feltűnő, mint a 293. ⛔ **Ez a fájl SOHA nem ítél és nem dönt:** csak számokat ad, nincs benne „gyanús" mező, és a **döntés-réteg nem importálja** (ellenőrizhető szabály, nem ígéret). A visszavonás emberi út (D46). ⭐⭐ **D93/6 (E6, 2026-10-04): a SZELETEKBŐL** — „kiről állított?” a szerző azonosság-szeletéből (az identitás-állítás oda is bejelentődik — `esemeny.js`: `AZONOSSAG_ALLITASOK`, `bejelentesHelyei`), nem a láncából; a tanúsítottak önálló élete az ő szeleteikből (+ `aktivitas`: legalább hány eseménye van); ami nincs meg, azt megnevezi (`hianyzoSzeletek`). A `jelzes` parancs kérésre.
- ⭐⭐ **A VISSZAVONÁS (4.5), és a szép megkülönböztetés benne:** a **felhatalmazás az enyém** — én adtam, én veszem vissza, egyoldalúan („az utolsó nyer", mint a tudatpontnál); a **tanúsítás állítás a múltról**, azt nem lehet visszavonni (D46). ⭐ És Csaba döntése (b): a visszavonás **csak előre hat** — aki elveszíti a megbízást, többet nem tanúsíthat, de a **már kiadott tanúsításai érvényben maradnak** (D47), különben néhány ember összebeszélve becsületes emberek tömegétől venné el a pénztárcát. Ehhez a tanúsítás **bemondja**, mire támaszkodott (D42-minta). ⭐⭐ **És a szigorítás, amit Csaba kérdése hozott ki (D61):** a tanúsítás **lehorgonyoz a saját szeletébe** — elköti, meddig látta a rólam szóló eseményeket. Ha a visszavonás ezen **belülre** esik, a tanúsító **bizonyíthatóan tudott róla**, és a tanúsítás **nem számít** (kemény szabály, mert a saját aláírásából következik). ⚠️ Aki a visszavonás **előtti** pontra horgonyzott, azt **nem büntetjük** — az a normális eset egy P2P hálózaton. ⭐⭐⭐ **És a rést a BULI-ELISMERÉS zárja be (D61):** a `Lattam` esemény aláírja, **meddig látok** a saját szeletemben — és mivel **a saját láncomban van sorrend** (a `sorszam`, amit csak én írhatok), minden KÉSŐBBI eseményem bizonyíthatóan azután keletkezett. ⭐ **Globális óra nélkül.** Így a „szándékosan régi horgony" trükk sem működik: horgony nélkül is elkapjuk azt, aki egyszer már elismerte, hogy látja a visszavonást. ⚠️ Aki SOHA nem ismeri el, hogy lát, az nem szeg szabályt — de **kilóg a ritmusból**, és ezt a jelzés mutatja (`elismeresek`).
- `js/muveletek.js` — a **tizenhat** művelet; mindegyik: lánc vége → aláírt esemény → mentés. ⭐ A `meghivas`, a `felhatalmazas` és a `tanusitas` **ugyanaz az alak** (`allitokRola`): az esemény a MÁSIK szeletébe kerül, és **hozza a saját horgonyomat** — ettől lesz az ellenőrzés keresés nélküli mutató-követés.
- `js/csere/csere.js` — **a régi csere-logika, hálózat nélkül** (Szakasz 2): `ALLAS` (szerzőnként legnagyobb sorszám + hézagok + elágazások + a lánc ujjlenyomata) → `KEREK` → `ESEMENY`. ⚠️ **2026-09-27 óta a párbeszéd NEM ezt használja** (a csere szeletenként megy — `szeletEgyeztetes.js`, `tartomany.js`); innen a **`beolvasztas`** éles (a hálózatról és a kézi útról jött események kapuja — **a hálózat nem kap engedékenyebb kaput**), az ÁLLÁS a próbák mércéje (`allasokEgyeznek`). ⏸️ Kivehető, ha a próbák más mércére állnak.
- `js/csere/szeletEgyeztetes.js` — ⭐⭐ **MIT EGYEZTETÜNK SZELETENKÉNT** (a C 7–8. pontja, 2026-09-27): egy szelet halmaza = az alakilag érvényes eseményei (a 40. mérés tanulsága) + a hozzá **bejelentett** események (a gyerekei születése — a legfelső szintűeké a gyökérben, `GYOKER_KULCS` —, és D85 óta a javaslatai és a szavazataik: `bejelentesHelyei`; a szelet-kérés, a `hozd` túloldala is ezt a halmazt küldi, és az egy entitásos `kivisz` is ezt viszi); a „szelet:lenyomat” párok gyorsítótárral (a tár `szeletValtozata` szerint); a lista-feldolgozó leletéből a három szelet-lista (mindkettőnél eltér · csak nálam · csak nála); és a fogadó szűrője (`szeletbeTartozik`: csak közös vagy általunk várt szeletből veszünk át). ⛔ **A ki nem mondható szelet-kulcs** (átnézés, 2026-09-27 este — mérve): egy kapun átjutott, nem 43 jeles `entitas` vagy születés-`szulo` a társsal folytatott MINDEN cserét megakasztotta (`HIBAS-EGYEZTETES`). ⭐ **D77 óta a kapu nem engedi be**, a vonal kulcs-mintája ugyanaz a konstans (`ervenyesKulcs = azonositoAlaku`), és egy régebbi programmal tárolt ilyet a 40. mérés elve tart távol (alakilag hibás → üres halmaz → nem hirdetjük).
- `js/csere/tartomany.js` — ⭐⭐ **A TARTOMÁNY-EGYEZTETÉS** (S4, D74, 2026-09-27; a C lépés 6. pontja): két azonosító-halmaz különbsége úgy, hogy a forgalom az **eltérések számától** függjön, ne a halmaz méretétől — *„ebben a tartományban ez a lenyomatom; a tiéd?”*, és ahol eltér, 16 részre osztva tovább, ahol kevés maradt, a lista. ⭐ Mérve (50.): lásd az `eredmenyek.md`-t. ⚠️ **Hálózatot nem importál** (1. szabály), a beérkező üzenetet ellenőrzi (alak, határok, méret — `HIBAS-EGYEZTETES`), és ⭐ **2026-09-27 óta a párbeszéd ezen fut** (a C 8. pontja, két szinten).
- `js/csere/vonal.js` — **a párbeszéd** — ⭐⭐ **2026-09-27 óta szeletenként** (NYITAS → SZELETEK → ELTERO → RESZVETEL → TARTOMANYOK → ESEMENY/KEREK/KESZ; a szeletelési terv 4.5; ⛔ tiszta törés a régi `LENYOMAT`-tal — `REGI-PROTOKOLL`; az alábbi leírás a korábbi menetből való, a lényege áll): soronként egy JSON-üzenet egy foglalat-szerű kapcsolaton (2026-09-26 óta csak a UDP-résen — D69/2: nincs TCP a készülékek között) (ugyanaz az alak, mint a táré). Szimmetrikus — egyetlen `parbeszed` fut mindkét oldalon —, és **a csendes körnél áll meg** (se nem adtunk, se nem kaptunk). Semmit nem tud a koinóról. ⭐ **A kör egy 43 karakteres `LENYOMAT`-tal kezdődik** (D35, B. lépés): ha a két fél tudása egyezik, a részletes `ALLAS` el sem indul — mérve **334 bájt a 16 158 helyett**. ⚠️ A csendes kör feltétele emellett is megmarad: a lenyomat az egyetértést fogja meg, a csendes kör a hibás/rosszindulatú felet.
- `js/csere/titkositas.js` — ⭐⭐ **A CSERE TITKOSÍTÁSA** (D89/1, a ② — 2026-10-03): a kézfogás és a csomagok kriptográfiája, hálózat nélkül (beépített `node:crypto`, szinkron). **A kézfogás két lépés, mindkét oldal egyszerre:** (1) egy 33 bájtos bináris csomag az EGYSZERI X25519 kulccsal (a közös titokból HKDF-fel a két irány kulcsa — a munka végén elvész, tehát egy később ellopott kulcs sem nyitja ki a rögzített múltat); (2) a hitelesítés már titkosítva, a `CIMEK`-ben: a tábla-kulcs aláírója aláírja a kézfogás ÁTIRATÁT (`kezfogasAlairasa`) — ettől a tábla-kulcs nem bemondás, és közbeékelődő nem adhatja ki magát a társnak. **A csomag:** `[jel][számláló][AES-256-GCM rejtjel][címke]`, minden csomag (a nyugta is); a hamis/sérült/más kulcsú csomag NULL, nem kivétel. ⚠️ Ami látszik: hogy két cím beszél, mikor, mennyit, és a kopogás. Az első találkozásnál a kulcsot elfogadjuk és a kötés megjegyzi (mint az SSH); a személyhez kötés az E-vel jön. ⛔ Az 57. mérés döntött a formáról: a külön, JSON-os kézfogás 692 B lett volna munkánként. ⭐⭐ **D93/3 (2026-10-04): a SZEMÉLY** — zárt koinóban, ha a kapu a társat nem ismeri, a társ a SZEMÉLYES kulcsával (az azonosságával) is aláírja az átiratot a koinóval együtt (`szemelyesKezfogasAlairasa`, más előtaggal, mint a tábla-kulcsé), és megnevezi a horgonyát.
- `js/csere/udpVonal.js` — **a csere UDP-n** (D37–D39, E. lépés; 2026-09-26 óta az EGYETLEN szállítás): egy foglalatnak látszó utánzat, ami alatta UDP-t használ, így a `parbeszed` **változatlanul** fut az átfúrt résen (1. szabály gyakorlati haszna). Amit a UDP nem ad meg, azt itt pótoljuk: sorszám + nyugta + újraküldés. ⭐⭐ **D89/1 (2026-10-03): csak VÉDETT résen** — minden munka-függvény (`csereUdpResen`, `szeletUdpResen`, `fajlRandevu`, `fajlUdpResen`) kezet fog, ha nyers foglalatot kap (`kezfogasUdpResen` → `vedettHalo`: a foglalat egy társra szóló, titkosító nézete, a `udpKapcsolat` számára ugyanaz a felület); a munkán belül a hívó (`resMunkaKeszito`) EGYSZER fog kezet, és a védett rést adja tovább. Nyílt csere nincs (az őr a rétegben). ⚠️ **És két őr, ami először hiányzott** (2026-08-30): a `kiurites()` — a lezárás előtt meg kell várni, hogy az utolsó darabot nyugtázzák, különben eldobjuk (a `parbeszed` az utolsó `LENYOMAT`-ra már nem vár) —, és a **tétlenségi óra**, hogy a néma társ ne ragaszthasson be. E kettő nélkül a csere **végtelenül várt**; rontás-próba őrzi mindkettőt.
- `js/csere/udpKapu.js` — ⭐ **az állandó UDP-kapu** (D69/3, 2026-09-25; a D69/2 óta az EGYETLEN kapu; D89/1 óta a titkosított csomag is ADAT — a JSON-olvasás előtt felismeri): egy foglalat a teljes futásra — bármikor felel a kopogásra, a bekopogóra visszakopog, társanként egyszerre egy munka (`FOGLALT`), a jegyzéke időben ÉS darabra korlátos. A munkát kívülről kapja (`resMunkaKeszito` a `koino.js`-ben — az őrjárat, a `figyel` és a kézi parancsok közös gépezete). ⭐⭐ **D71 (2026-09-26): a kör a TÁRSAT keresi, nem a címét.** A kötésből jött cél a várt társ tábla-aláíróját is hordozza, a munka visszaadja, kivel dolgozott — és az azonos IP-jű, más portú válasz (a mobil NAT portváltása) csak FELTEVÉS, amit a munka végén a tábla-kulcs erősít meg (egy IP-n több kötésnél is ez választ). Ha nem az jött, akit vártunk, a cél „nem felelt", és a kör hívja tovább (44. mérés: különben egy azonos IP-jű idegen tette sikeressé a néma kötést); pontos címen a más aláíró „más felelt". Várt társ nélkül (friss és induló cím) a régi, azonnali hozzárendelés marad.
- `js/csere/pajzsfuro.js` — **a lyukfúrás** (D37, E. lépés): mindkét fél kifelé kopog egy **rögzített helyi portról**, és a két rés a közepén találkozik — fogadóképes fél nélkül. A `mindketIrany` a mérce: nem elég kapni, a MI csomagunknak is át kell jutnia. ⚠️ A `kulsoCim` (STUN) **segédeszköz és paraméter** (2. szabály): a szerver cserélhető, ha nem válaszol a koino ugyanúgy működik, és **semmilyen bizalom nem jár vele** — egy portszámot mond, nem igazságot. Hosszú távon a saját tükrünk váltja ki (`vonal.js`, `latlak`).
- `js/csere/kapunyitas.js` — **megkérjük a routert**, hogy engedje be a kapcsolatot (NAT-PMP, PCP, UPnP — mind a három megmérve). ⚠️ **Segédeszköz, nem előfeltétel** (2. szabály): ha a router nemet mond, a koino ugyanúgy működik, csak ő kezdeményez kifelé. A fejlesztő routere mind a hármat elutasította — ezért fordult a terv a D33 felé.
- `js/csere/helyiFelfedezes.js` — **a helyi felfedezés** (Szakasz 2 / F. lépés; ⭐ D89/7 óta a koinó azonosítója nem hangzik el a wifin, csak a REJTETT JELE — `koinoRejtettJele`, a futás jelével lenyomatolva; aki tudja az azonosítót, felismeri): azonos wifin lévő készülékek megtalálják egymást, **cím beírása nélkül**. Két szerep: aki keres, **kiált** (`helyiFelfedezes`), aki dolgozik (`orjarat`/`figyel`), az **felel** (`felfedezoValaszolo`) — magától senki nem kiabál. ⚠️ **Kényelem, nem előfeltétel** (2. és 4. szabály): ha a wifi tiltja a kliensek közti forgalmat, a kézi `tars` út marad. Bizalom nem jár vele (3. szabály): a cím a **foglalatból** jön, nem az üzenetből, és sosem lesz esemény. ⚠️ Két dolog mérésből jött: **ismételve kell kiáltani** (egyszeri kiáltásnál a később induló nem hall semmit), és a válasz **a csoportnak is** megy (egy gépen több példány osztozik a rögzített felfedező porton).
- `js/csere/tablaKulcs.js` — ⭐⭐ **A TÁBLA-KULCS** (2026-09-20): a készülék neve a hirdetőtáblán és a kötések azonosítója. ⛔⛔ **SOHA nem az azonosságod** (D6): a `kulcs.json` azt mondja meg, KI vagy, ez azt, hogy HOL érhető el ez a KÉSZÜLÉK. Két kulcspár: **Ed25519** (a rekesz neve, ez írja alá a bejegyzést — BEP 44) és **X25519** (ebből lesz a társankénti közös titok). ⭐⭐ **A titok SOHA nem utazik:** mindkét fél a saját titkos kulcsából és a másik nyilvánosából SZÁMÍTJA ki — *így a hirdetőtáblán is működik, ahol nincs kézfogás.* ⭐ D89/1 óta a tábla-kulcs a CSERÉBEN is hitelesít: az aláírója aláírja a kézfogás átiratát (`titkositas.js`), és (D93/3 óta a `NYITAS`-ban) titkosítva utazik.
- `js/csere/kotesek.js` — ⭐⭐ **A KÖTÉS-HÁLÓ könyvelése** (Csaba ötlete, 2026-09-18): kivel tartok rendszeres kapcsolatot. ⛔ **A kötést a tábla-kulcs azonosítja, nem a cím** — *mert épp a cím az, ami elromlik.* ⭐ Ezért őrzi a társ utolsó ismert címét akkor is, ha a névtelen jegyzékből elévült: egy kopogás ~60 bájt, *olcsóbb megpróbálni, mint elfelejteni valakit, akivel tegnap beszéltünk.* K=3, legfeljebb 5 (9. szabály). ⚠️ Helyi megfigyelés, sosem terjed (3. szabály). ⭐⭐ **D71 (ii): egy kötés legfeljebb 3 címet jegyez meg** (ahol elértük — a legrégebbi esik ki), és a `kopogasCeljai` ezeket **egy csoportként** adja a kapunak (ugyanaz az `alairo`), **rang szerint**: a gépen belüli, a helyi háló, a link-local, végül a nyilvános — *a rang a címből jön, így a két fél ugyanazt az utat választja*. A kapu a csoportot sorban hívja, és amint a társat az egyiken elérte, a többit kihagyja (45. mérés: otthon két út, két csere).
- `js/csere/tabla.js` — ⭐⭐⭐ **A HIRDETŐTÁBLA** (2026-09-20): „leszakadtam, itt az új címem" — **társanként külön rekesz**, a tartalom titkosítva, a bejegyzés aláírva. ⭐⭐ **A rekesz „sója" a két NYILVÁNOS kulcsból számítódik**, a DHT-beli cél pedig a kulcs és a só lenyomata — *egy kívülálló tehát nem tudja kiszámolni, hol keresse: nem azért nem olvassa el, mert megtiltjuk, hanem mert nem találja meg.* ⚠️ Hálózatot nem nyit (1. szabály): bejegyzést KÉSZÍT és OLVAS; hogy mi viszi a táblára, az a hívó dolga (ma a `dht.js`).
- ⭐⭐ **A GYÖKÉR DARABJAI (D95/4, 2026-10-06)** — `cimjegyzek.js` (`gyokerDarabKulcsa`/`gyokerDarabBol`: a felismerhető darab-kulcs a vonalon — ⭐ D106: a darab-szám a mélységhez kellő bit, legfeljebb 144 (`GYOKER_MAX_MELYSEG`, `gyokerLenyomata`, BigInt; 16-ig bájtra a régi kulcs); `gyokerMelysegBecslese`: a mélység a SAJÁT darabból — a darabomban ismert születések × 2^mélység maximuma; `gyokerDarabKulcsai`: a darabjaim a mélységem ±1 szintjén) + `szeletEgyeztetes.js` (a darab halmaza: a gyökérhez bejelentett születések közül a darabba esők; a fogadó szűrője) + `vonal.js` (a NYITÁS `gyd` jele: `m:l1:l2:l3`, 11 jeles lenyomatok; a társ a tábla-aláíróból számolja a darabjaimat; csak a legsekélyebb közös eltérő darab egyeztetődik, a nyitó lenyomatba nem kerül; a teljes gyökér ilyenkor nem cserélődik egészében) + `koino.js` (`gyokerMelysegem` — egy forrás a cserének és a DHT-hirdetésnek; `kuldoKulcsai`: a saját legfelső szintű születés a darab-kulcsa alatt a csak küldő úton). A próbák a darab célméretét a környezetből kicsinyíthetik (`KOINO_GYOKER_DARAB_CEL`). ⭐ D105: a darab-számítás KÖZÖS a kereső-réteggel (`darabLenyomata`, `lenyomatDarabja`, `darabKulcsa`/`darabKulcsBol` — `g` a gyökér, `k` a kereső-régió —, `melysegBecslese`, `darabMelysege`, `keszulekDarabjai`, `keszulekDarabKulcsai`); a gyökér függvényei vékony burkolók.
- `js/csere/keresoReteg.js` — ⭐⭐ **A KERESŐ-RÉTEG TISZTA SZÁMÍTÁSAI** (D105 — a D101 ⑦ ② lépése, 2026-10-16; hálózat nélkül): a cím szavai (`szavak`: NFC, kisbetű, a betűk, jelek és számjegyek egybefüggő sora — ékezet-összevonás és szótár nincs, 5.1), a kulcsok (K2 (C) — `szoKulcsai`/`cimKulcsai`: `e:` az egész szó a 3 és ≥ 5 jelesnél, `p:` az első négy jel a ≥ 4 jelesnél; egy cím legfeljebb `CIM_KULCS_KORLAT` = 32), a kérdés (`kerdesFiokjai`) és a szűrő (`cimIllik`: minden kérdés-szó egy cím-szó ELEJE — a „park” a „parkban”-ra illik), a bejegyzés (`bejegyzesKulcsai`: csak a címet viselő `GondolatLetrehozas`), ⭐ az osztódás (K7 — `osztodasMelysege` a `KERESO_FIOK_CEL` = 256 fölött, a gondolat darabja a saját lenyomatából: `fiokDarabja`, egymásba ágyazva; `fiokHelye`, `bejegyzesHelye`), a régiók (a gyökér-darab alakja `k` jellel: `keresoRegioKulcsa`/`keresoRegioBol`; a készülék a gyökér-darabjától független helyen: `keszulekKeresoHelye`, `sajatKeresoRegioi`, `keresoRegioKulcsai` ±1; `keresoMelysegBecslese` — cél `KERESO_REGIO_CEL` = 512; `keresoRegioTemaja` — vakított). A 75. mérés ezt az alakot mérte. A felajánlás (④c), a kérdés (⑤) és a halványulás (④a) a saját moduljaikban (`felajanlas.js`, `kereses.js`, `keresoMegujitas.js`).
- `js/csere/melysegTanulas.js` — ⭐⭐ **A TANULT MÉLYSÉG** (D110 — a K10 (A2), 2026-10-18): a gyökér-darab (`g`) és a kereső-régió (`k`) mélysége legalább a FRISS társak bemondott mélységének ALSÓ mediánja − 1 (`tanultMelyseg`: ≥ `TANULT_TARS_MIN` = 2 különböző társ, `TANULT_ELETTARTAM` = 1 nap), CSAK MÉLYEBBRE (`ervenyesMelyseg`) — egy új vagy hosszan offline készülék így a nagy koinó mély tartóival is közös kulcsot talál. A bemondás a NYITÁS `gyd`/`kd` jeléből (a `vonal.js` `tarsMelysegei` — csak hitelesített tábla-kulccsal), a jegyzék `<koino>/melysegek.json` (`fajlTar.js` `melysegTarolo`; fajtánként ≤ 64 társ); a `koino.js` a csere után jegyzi (`tarsMelysegeiFeljegyzese`), és a `gyokerMelysegem` (`gyokerMelysegTanulva`) és a `keresoRegioim` alkalmazza; a próbák a régió célméretét kicsinyíthetik (`KOINO_KERESO_REGIO_CEL`). ⛔ A K10 (A) „csak amíg a saját darab kevés” feltétele elmaradt (egy offline készüléket beragasztott volna); a hazug társ ellen a medián véd. Hálózatot nem importál.
- `js/csere/kereses.js` — ⭐⭐ **A KÉRDÉS TISZTA SZÁMÍTÁSAI** (a kereső-réteg ⑤, 2026-10-18 — K2 (C), K3, K7, K9): a terv (`kerdesTerve` — a kérdés szavai a leghosszabbtól, a ≥ 4 jelesnél a szóeleje-fiók, a háromjelesnél az egész szó), a hely (`kerdesHelye`), az osztódott fiók mintája (`osztottMinta`, `OSZTOTT_MINTA` = 2), a tartó válasza (`helyTalalatai` — a TELJES kérdésre illők, a legfrissebbek elöl, ≤ `KERESES_TALALAT_KORLAT` = 50) és a kérdező ellenőrzése (`talalatokEllenorzese` — alak, tartalom, hely, szűrő, gondolatonként egyszer, a cím forrása: `szuletes` | `javaslat`). A bekötés: a kérelem `kereses` fajtája (`kerelem.js`, `vonal.js` `KERESESVALASZ`), a `koino.js` kiszolgálója (a hely indexelt bejegyzései — `keresoTar.js` `helyBejegyzesei` —, a kísérők, a méret, az osztódás) és kérdezője (`kereses`: helyről helyre, közvetlenül vagy a DHT-n a régió témáján; `keresesValaszFeldolgozasa`: a kísérők a kapun, a szerzők tagsága a saját tudásomból — a nem ellenőrizhető kimarad —, a csomag az ÁTMENETI tárba; K9: a valódi címmel is szűr; ⭐ D111: a találat tartó-tippjei — a felajánló készülék tábla-aláírója, cím nélkül — a kérdezőnél `tartotippek.json`, és a gondolatra szóló függő kérelem a tipp készülékének kopogtató témáján jelentkezik — `fuggoKerelemFelvetele`); a próbák a tartó kísérőit visszatarthatják (`KOINO_KERESES_KISEROK=0`). ⭐ **A ⑦ (a felület):** a `/api/kereses` a háttérben kérdez (`halozatiKereses` — kérdésenként egyszerre egy, két percig él), a találat az átmeneti tárból a helyi listában jelenik meg, a `betoltes` jelre a lap újrakérdez (`koinoModalok.js` — 2 → 30 mp, ~17 percig); ⑦b: ha a DHT-n talált tartók közül egy sem felel, a kérdés FÜGGŐ KÉRELEM (`keresesFuggoFelvetele`; `fuggoKerelmek.js` `ker` — a kérdés a kérelem része), az őrjárat munkája futtatja, a megjegyzés kimondja (`keresesFuggoAllasa`). Hálózatot nem importál.
- `js/csere/felajanlas.js` — ⭐⭐ **A FELAJÁNLÁS TISZTA SZÁMÍTÁSAI** (D107 L4 — a kereső-réteg ④c, 2026-10-18): a tulajdonos a gondolatai bejegyzéseit RÉGIÓNKÉNT csoportosítja (`regioCsoportok` — a kimondott osztódások szerinti mélységgel: `felajanlasHelye`, `osztodasokFeljegyzese`, a lánc s → s' követhető; a régió a felajánló mélységén — D110), nyilvántartja a felajánlottakat (`felajanlandok`, `felajanlottakFeljegyzese`), és a megújítást újrahasznosítja, amíg érvényes a mai csomagra és nem esedékes (`megujitasUjrahasznalhato` — különben minden kör új aláírás, új azonosító, újra-felajánlás); a jegyzék (`felajanlasok.json` — a `koino.js` írja) korlátos. A bekötés: a kérelem `felajanlas` fajtája (`kerelem.js`: a kulcs egy kereső-régió vagy a gyökér, ≤ 64 bejegyzés + ≤ 512 kísérő, nem adható tovább — `TOVABBADHATO_FAJTAK`; a válasz `felajanlasValaszAlakja`: felvett, függő, megvolt, elutasított, és az OSZTÓDOTT fiókok), a `vonal.js` két oldala (`FELAJANLASVALASZ`), a `koino.js` kiszolgálója (a kísérők a kapun, a bejegyzések a kereső-tár kapuján, csak ami a régióimba esik; az osztódás a hely nálam lévő, indexelt méretéből — `keresoTar.js` `helyMerete`, a próbák `KOINO_KERESO_FIOK_CEL`), és a felajánló három útja (`kereso felajanl <cím> <port>` — közvetlenül; `kereso felajanl` és az őrjárat címjegyzék-köre — `felajanlasKor`: a régió témájának hirdetői a függő kérelem céljai, a kopogtató a téma párja, `cimjegyzek.js` `kereso` pár; `kereso felajanl <fájl>`). Hálózatot nem importál.
- `js/tar/keresoMegujitas.js` — ⭐⭐ **A KERESŐ-BEJEGYZÉS ALÁÍRT MEGÚJÍTÁSA ÉS A LEJÁRAT** (D107 L3, K5 — a kereső-réteg ④a, 2026-10-18; a ⑥ magja): a megújítás nem esemény (`m = { szerzo, ido, alairas }`) — a tulajdonos SZEMÉLYES kulcsával aláírja a koinót, a gondolatot és a csomag eseményeit az idővel (a fiók és az osztódás nélkül: egy aláírás a gondolat minden fiók-bejegyzésére — `megujitasKeszitese`); az ellenőrzés (`megujitasEllenorzese`): az aláíró a csomag tulajdonosa (`csomagTulajdonosai`), nem jövőbeli (`JOVO_TURES` = 1 nap), és az aláírás erre a csomagra szól; a lejárat a bejegyzésből (`bejegyzesIdeje` + `MEGUJITAS_ELETTARTAM` = 30 nap — `bejegyzesLejarata`, `lejartE`), bárkinél ugyanaz; a soros (`sorosRend`, `megujitaniKell`): a gondolat és a tulajdonos lenyomatának sorrendjében az első a 20., a második a 25. napon újít (`SOROS_NAPOK`). Hálózatot nem importál.
- `js/tar/keresoTar.js` — ⭐⭐ **A KERESŐ-TÁR** (D107 L1 (A) — a kereső-réteg ③a, 2026-10-17): a régióm BEJEGYZÉSEI — puha állapot, a koinó állapotába NEM számít (a csomagok pont-eseményei más gondolatokról szólnak). A bejegyzés egy gondolat egy fiókban: `{ k, s, g, esemenyek, m }` (a fiók kulcsa, az osztódás, a gondolat, a csomag — a születés, a címadó javaslat (K9), legalább két tulajdonos pont-eseménye (K3) —, a megújítás: a ④-ig null); az azonosítója a tartalmának lenyomata (`bejegyzesAzonositoja`), a tartalom ellenőrzése `bejegyzesTartalma` (a fiók kulcsa a cím kulcsa, pozitív pontok, különböző szerzők, idegen esemény nincs), a befogadás `bejegyzesBefogadasa` (a csomag minden eseménye az `esemenyMentese`-n, a kereső-tár három műveletével — 3. szabály); fiókonként a FRISSEBB marad (két tartó a különbség után ugyanazt tartja); `<koino>/kereso/bejegyzesek.jsonl`, korlátos (`KERESO_KORLAT` = 16 MB — a legrégebben érkezett megy), `tomorites`, `frissit` (más folyamat írása), a régió halmaza `regioHalmaza` (⭐ ④a: a LEJÁRT nélkül — a megújítás ellenőrzése és a lejárat a `bejegyzesTartalma`-ban, a frissesség a megújítás ideje, a tömörítés a lejártat mindig eldobja; ⭐ ④b: a FÜGGŐ nélkül — a tagság-ellenőrzőt a hívó adja (`beallitas.tagE`), a bejegyzés csak akkor az indexben, ha minden szerzője (`bejegyzesSzerzoi`) ellenőrzött tag; a függők a korlát `FUGGO_HANYAD`-od részéig, előbb esnek ki, a `fuggokFrissitese` emel; az újraírás generáció-jelet ír, amit a `frissit` néz). Az építő `bejegyzesekEpitese` (a cím minden kulcsa alatt, a két legtöbb pontú tulajdonossal; a megújítást a hívó adja — a `koino.js` `sajatBejegyzesek` a személyes kulcsommal, ha a csomag tulajdonosa vagyok; az őrjárat óránként tömörít — `keresoTarTomoritese`). ⭐ **A régió a cserében (③b — D107 L2):** a `vonal.js` a gyökér-darab mintájára — a NYITÁS `kd` jele (`m:l1:l2:l3`; a társ a tábla-aláíróból számolja a régióim kulcsait — `keresoRegioKulcsai`), a legsekélyebb közös eltérő régió az eltérők közé, a halmaz a bejegyzés-azonosítókon, az átadás `BEJEGYZES` üzenettel (a keret maradékáig), a fogadó a helyet MAGA számolja és csak a közös régióba esőt veszi fel, a kapun (`bejegyzesBefogadasa`); a `koino.js` `resMunka` adja (`keresoTar`, `keresoMelyseg`). ⭐ **A hirdetés és a raj (③c):** a régió témája (`keresoRegioTemaja`) a `sajatHirdetendoTemak`-ban, a címjegyzék-kör a régió többi hirdetőjét (≤ `REGIO_TARS_KORLAT` = 4) a kör céljai közé veszi, a raj a régió kulcsát vállalja és jegyzi, a változott régiót a raj kör viszi körbe. ⭐ **D111 (K11): a TARTÓ-TIPPEK** — gondolatonként a felajánló készülékek tábla-aláírója (`tippek`, `tippFeljegyzese`; ≤ 4, 30 nap, `tippek.json` — külön, mert a bejegyzés azonosítója a tartalmáé; a felajánlás kiszolgálója a kérelem ellenőrzött tábla-kulcsából jegyzi, a `BEJEGYZES` az idejével viszi, a kézi út `{ tipp }` sorokkal).
- ⭐⭐ **A RÉSZVÉTEL A VÁLLALÁSBÓL — a szigorú (b) (D97, 2026-10-08)** — `koino.js` `reszvetelHalmazom`: az „alap” készülék csak a vállalt szeleteiben vesz részt (a pozitív pontúak, az azonosság-szelet; a koinó születésének szelete csak az alapítónál — D96; az összegzett nagy szelet nem; a töredék-részvétel D85 T3), a tár eseményszáma szerint gyorsítótárazva; a „mindent” beállítás (D83/2) „minden” (a mai mód). A vonalon: a koinó születése eseményként (`KOINO_SZULETES_KULCS` — a halmaza egyedül a `KoinoLetrehozas`, mindenki részt vesz benne); a zárt kapu korlátozott útja a megengedett szeleteket a vállalástól függetlenül egyezteti. A `vallalas` kimondja a részvételt.
- ⭐⭐ **A TÖRZS KORLÁTJA, A KÉRELEM AZ ÁTMENETIBŐL, A TÖMÖRÍTÉS (a bekapcsolás, 2026-10-09)** — a fájl-randevú a törzset (szöveg-darab, fájlok) alapból csak a vállalt entitásaimra adja ki (`fajlIgeny.js` `vallaltLenyomatok`; „mindent” módban mindent); a szelet-kérelmet a két tárból szolgálom ki, a szerzők tagsági kísérőivel (a nem tagnak nem); a tartós tár tömörítése (`fajlTar.js` `ujrairas` + `generacio.json` — a többi folyamat ebből építi újra a mutatóját; `iro.js` `tomorites` — csak az író; `koino.js` `tomoritesSzabalya`): ami kiesett a vállalásomból, az átmeneti tárba kerül (D75/1), a saját eseményeim maradnak (D86/2).
- `js/allapot/lancEllenorzes.js` — ⭐⭐ **A LÁNC-ELLENŐRZÉS A CSERÉBEN** (az A hátralévői — D98/2–4, 2026-10-09): a szigorú (b) alatt egy szerző teljes láncát csak ő tartja, a kettős lánc két ága külön tartókhoz kerülhet. A KÉRDEZŐ (`lancKerdesek`) szerzőnként a nálam lévő legújabb lánc-gyökeres eseményt veszi fejnek: a fej az övé-e (`f`), a többi nálam lévő eseménye benne van-e a fej napló-gyökerében (≤ 8; új fejnél a régi ellenőrzött fej elöl), a régi gyökér a mostaninak előtagja-e (`r` — `osszegzoFa.js` `naploKovetkezetesseg…`, RFC 9162), és 5%-kal (D79) a teljes kiosztás-lista (`k`). A SZERZŐ OLDALA (`lancKiszolgalo`): a kérdezett fej láncából (`elozo` visszafelé) vagy a szerző egyetlen láncából felel — ahol mást talál, ott a SAJÁT eseményét adja; a részfa-gyorsítótárral logaritmikusan (D98/4). A válasz feldolgozása (`lancValaszokFeldolgozasa`) a meglévő bizonyítékokat adja (elágazás, negatív levél — ellenőrizve), a hallgatás FÜGGŐBEN marad (nem vád). A vonal: `LANCKEREK` (`en`: a saját szerzői kulcs) → `LANCVALASZ`, a szelet-csere végén, minden cserében, ami nem ért véget a nyitásnál (⛔ szimmetrikus feltétel — az eltérő szeletek száma a zárt koinó korlátozott útján a két félnél eltér, azon a csere megakadt); a tároló `lancellenorzes.json` (`fajlTar.js` `lancEllenorzesTarolo`); az `ellenoriz` kiírja az állását. 71. mérés.
- `js/csere/tarsEmlekezet.js` — ⭐⭐ **A TÁRSANKÉNTI EMLÉKEZET** (az F — D98/1, 2026-10-09): a csere végén a társ tábla-aláírója alatt a tárom állása (`fajlTar.js` `allas`: a mutató hossza + a tömörítés generációja) és a maradék (ahol valamelyik fél kimaradt) — `emlekezet.json` (`emlekezetTarolo`, ≤ 64 társ). A következő cserén, ha a nyitó lenyomatok eltérnek: VALTOZOTT (mi változott NÁLAM azóta — `valtozottKulcsok`: a tár vége óta hozzáfűzött események szeletei és bejelentési helyei a mutatóból, test nélkül; null, ha nincs feljegyzés) → VALTOZOTTPAROK (a U-n KÍVÜLI párok lenyomata + a U párjai) → ⭐ ha a két kívüli lenyomat egyezik, a U osztályozható (`uOsztalyozasa` — az első szint és az ELTERO elmarad); ha nem, a rendes első szint fut (a lista nem kíván bizalmat). 70. mérés: egy változás 6,5 → 3,8 KB 1000 szeletnél, 8,0 → 3,8 KB 5000-nél — nem függ a szeletek számától. Hálózatot nem importál.
- `js/csere/rajKor.js` — ⭐⭐ **A RAJ A KÖRBEN** (D97/2, 2026-10-09): a szigorú (b) alatt az őrjárat körönként `RAJ_KOR_TARSAK` = 2 raj-társat is felkeres (a raj-jegyzékből): előbb a VÁLTOZOTT szeleteim tartóit (`valtozottFeljegyzese` — a csere után kapott és a saját új eseményeim szeletei; a tartók sorban, változásonként egyszer), aztán a FORGATÁST (a vállalt szeleteimen körben, a tartók sorban — `rajKorCeljai`). 69. mérés: medián 1, 99%-ban 9 kör alatt minden tartóhoz; az átfedés szerinti választás szétesett. A `koino.js` `rajKorCeljaim` köti be (a „mindent” módban nincs). Hálózatot nem importál.
- `js/csere/kozosHalmaz.js` — ⭐⭐ **A KÖZÖS HALMAZ** (D97/1, 2026-10-08): a szigorú (b) alatt két készülék mást vállal — a nyitó lenyomat ezért a KÖZÖS halmazon fut (68. mérés: különben a „nincs újdonság” 6–300 KB). A részvételi halmaz rövid ujjlenyomatokként (`ujjlenyomat`: 6 bájt) egyszer megy, a társ megjegyzi (a tábla-aláírója alatt — `fajlTar.js` `halmazTarolo`, `halmazok.json`); utána a változatok (`valtozat`, 11 jel) és ha kell, csak a változás (`naploFrissitese`, `valtozasBol`, `halmazUzenet`; a fogadó ellenőriz — `halmazAlkalmazasa`); a metszet szűrője `kozosSzuro`. A vonal: a NYITÁS `pv`, a CÍMEK `kz` (k/s/x : ismert : a közös lenyomat eleje), HALMAZ, KOZOS; a „minden” részvétel (null) a régi menet. A zárt koinó nem tagja nem kapja meg a halmazt. Hálózatot nem importál.
- `js/csere/cimjegyzek.js` — ⭐⭐ **A CÍMJEGYZÉK (G)** (D84/2, D90, D91, 2026-10-03): a hash-elhelyezés tiszta számításai — a VAKÍTOTT téma (`cimjegyzekTema`: a koinó azonosítójával sózott 20 bájtos lenyomat, a BEP 5 `info_hash`-e — kívülálló nem tudja kiszámolni) és a gyökér-darab (`gyokerDarabja`, `sajatGyokerDarabjai`). ⭐ A D91 szerint a „mi kinél van” fő útja a FA és a RAJ (a raj-jegyzék a `tarsak.js`-ben, a csere `RESZVETEL`-je viszi), a hash-elhelyezés csak a gyökér darabjaira és a közvetlen keresésre kell. ⚠️ Az 58. mérés: a DHT a hirdetést 30–60 perc alatt elfelejti — egy téma ~0,65 MB/nap. ⭐⭐ **D91/3 (2026-10-03): mit hirdet egy készülék** (`hirdetendoTemak`): a saját gyökér-darabját mindig (a mélység a legfelső szintű gondolatok számából: `gyokerMelysege`, ~256/darab, kettőzésenként +1), a vállalt szeleteiből csak a készülékenkénti beállítás szerint (`cimjegyzek.json`, alapból 0, legfeljebb 50); az őrjárat ~20 percenként a HÁTTÉRBEN hirdet (`HIRDETES_KOZ`), a `hozd` a DHT-n keres, ha a raj nem ismer tartót.
- `js/csere/kerelem.js` — ⭐⭐ **A KÉRELEM — a nézet-független alapkérdések** (D76, D84/1, D92/4–6, 2026-10-03): *szelet* (X eseményei), *fejlécek* (X alatt a legjobb n össz-pont szerint — ⭐ D102: MÉLYEN (`m`) a tartó MAGA jár be legjobb-először, amit tud — egy csomópont gyerekeit akkor, ha a szeletét tartja —, egyetlen csökkenő listában, minden tétel a szülőjével (`sz`) és ha tartja, a gyerekszámával (`gy`); a FOLYTATÁS `utan`-nal; a `GYOKER_KULCS` gyerekei a legfelső szintűek), *törzs* (X szöveg-darabja és fájljai — csak a vállalótól). ⭐ **A menet a vonalon** (`vonal.js`): `KERELEM` → (szelet: `ESEMENY` × N) · (fejlécek: `FEJLECEK` → a kérő a gyökerek UTÁN `MINTAKEREK` → `MINTAK`) · (törzs: `TORZS` → a fájlok egymás után ugyanazon a kapcsolaton — `fajlHozatala` `nyitvaHagy`); a tartó a kívülről kapott `kerelemKiszolgalo`-t hívja (a `koino.js` `kerelemKiszolgaloja`: a két tárból, folyamatonként megmaradó részfa-karbantartóval), és amit nem szolgál ki, arra is `KESZ`-t mond; a kérő a `kerelemKapcsolaton` / `kerelemUdpResen` (védett résen). A `SZELETKEREK` helyett a szelet is `KERELEM` (tiszta törés — a telefon úgyis frissül). A bemondott össz-pontok helyi gyorsítótára: `<koino>/osszpontok.json`. A fejléc = a létrehozó esemény + az össz-pont + a részfa-fa gyökere (ha a tartó tartja; ha nem, a bemondott össz-pont, `forras`); a töredék létrehozója a javaslat, a szülőjét ugyanaz a forrás mondja, mint az állapotot (`javaslatEntitasai`); a felkerült gyereket (a szülőjét a D14 elfelejtette) kimondja (`felkerult`). ⭐ D109 (KK1): a fejléc-válasz képe (`fejlecKepe` — az össz-pontok, a gyerek-jegyzék, a lustán rendezett gyereklisták) a kiszolgálónál gyorsítótárban (`koino.js` `kiszolgaloKepe` — a tár állása, az átmeneti tár `valtozas`-a, a vállalás, a bemondások, ≤ 60 mp), és a bejárás LUSTA ÖSSZEFÉSÜLÉSSEL (csomópontonként csak a következő legjobb gyerek a kupacban) — egy kérés ára a lista hossza, nem a tár. A kérdező a kiválasztott ágat k = 8, a legfelső 3 testvért k = 4 mintával ellenőrzi (`mintaKeres`, `fejlecekEllenorzese` — tételenként, egy hamis tétel nem dönti el a többit). Hálózatot nem importál; a menet a `vonal.js`-é.
- ⭐⭐ **A TÖBB FORRÁS A UDP-N (D114, 2026-10-19)** — `fajlAtvitel.js` `kozosMunkaJegyzek` (lenyomatonként egy munkamegosztás a
  folyamatban — a randevú, `udpVonal.js` `fajlRandevu` `kozosMunka`, és a kérelem törzse rajta; az első ág nyitja, az utolsó
  zárja; itt áll a „3 egyidejű átvitel” — `belep` → null; a próbálkozás adói — `adott`/`adok`) + `aktivForrasok` (a befejezetlen
  fájlok — `fajlTar.js` `reszlegesLenyomatok` — további, címmel ismert, nem romlott tartói a kör céljai közé: ≤ 2 / kör, ≤ 3 /
  fájl; `koino.js` `aktivFajlForrasCeljai`, a D99 kihagyása rájuk nem vonatkozik) + a randevú forrás-tudása (`koino.js`
  `fajlForrasTudas`: a romlottan jött forrás kerülése — 29/c —, a türelem a tartók számából — D68/2 —, a megjött fájl jegyzete
  törlődik) + a birtoklás jegyzete (`fajlKerelem.js`: a tábla-aláíróval és a címmel, a `romlott` megmarad, korlátosan —
  `birtoklasTakaritasa`; az írás sorban). 79. mérés: közös munka nélkül két egyidejű munka minden szeletet kétszer hozott.
- `js/csere/kiszolgalasiKeret.js` — ⭐⭐ **A KISZOLGÁLÁSI KERET KÖNYVELÉSE** (D108, D109 — KK2–KK5, 2026-10-17): mennyit dolgozott a készülék MÁSOKNAK az utóbbi órában — a kimenő bájt és a kérésszám percenkénti vödrökben, csúszó órában, folyamatonként a memóriában (`keretFeljegyzes`, `keretItelete`, `keretAllasa`); a társ (`tarsKulcsa`): a személy / a tábla-kulcs / a cím IP-je; az osztály (`tarsOsztalya`): a KÖTÉS csak könyvelődik (a saját cserém — D108), egy társ ≤ ¼, az idegenek együtt ≤ ½; a maradék bájt a részleges törzshöz; korlátos jegyzék (512 társ). A határ (KK5): alap 20 MB + 600 kérés, „mindent” 100 MB + 3000 óránként (`KERET_ALAP`, `KERET_MINDENT`; a próbák `KOINO_KERET`). A bekötés: `koino.js` `kiszolgalasiKeretKapcsolo` (a vonalnak — `beallitas.kiszolgalasiKeret`), a `vonal.js` KERELEM-ága kérésenként kérdez és könyvel (a kapcsolat kiküldött bájtjai), a keret fölött `KESZ` + `kesobb` (KK6, kompatibilis), a túl nagy törzsből a beférő fájlok (`TORZS` + `kesobb`); ⭐ D114 óta a fájl-randevú is (fájlonként az ítélet, a keret fölött
`FAJLNINCS` + `kesobb`, a kiküldött bájtok könyvelve — elágazás 184); a kérő a kérelemben a tábla-kulcsát is hozza (`tabla` + `aa` — `udpVonal.js` `kerelemTablaja`, `azonossagBeallitasa`). ⭐ A csere is a kereten (③–④): a `vonal.js` a nyitás után kérdez (a keret fölött `KESOBB {mp}` és tiszta vég — `kesobbMondtam`; a kérő `varj`-ja `kod: 'KESOBB'`), ha enged, az átadás a maradék bájtig küld (`keretMiattKimaradt` — a többit a következő csere hozza), a `koino.js` a sikeres csere kiküldött bájtjait könyveli; a kérő a „később”-t mondót a kör és a függő kérelem elől addig elteszi (`kesobbTarsak`). ⛔ A kötés a keretben a RENDSZERES társ (`keretKotesE`: a három legrendszeresebb közül, ≥ 3 találkozás, az első ≥ 1 órája — a próbák `KOINO_KERET_KOTES_KOR`); a társ kulcsa egy helyen (`koino.js` `keretTarsa`: zárt koinóban a személy, különben a tábla-kulcs); a `tag` a kapu kimondott jele (`tarsKapuja` — csak ellenőrzött tagságnál; `tagsagItelete`), nem a `szabad`-ja; a ki nem szolgált kérelem nem csere (`kerelem: true`). A beállítás (⑤): `kiszolgalas keret` (`kiszolgalas.json`), az állás a `<koino>/keret.json`-ben (`keretAllasIrasa`). Hálózatot nem importál.
- `js/csere/fuggoKerelmek.js` — ⭐⭐ **A FÜGGŐ KÉRELMEK** (D92/1, 2026-10-03): a cím nélküli kérés nyilvántartása (`<koino>/kerelmek.json`, helyi): kinél próbálom (a célok — a raj tartói készülék-azonosítóval, a DHT hirdetői, az induló címek), hol jelentkeztem (a kopogtató témák), mikor, hányszor; a kész kérelmek rövid naplója. Korlátos (16 függő, kérelmenként 12 cél), két óra után lejár — kimondva (`lejart`, `kiszorult`). ⭐ **A KOPOGTATÁS** (`cimjegyzek.js`: `keszulekKopogtatoTemaja`, `temaKopogtatoja`, `figyelendoKopogtatok`): a kérő a BEP 5-tel bejelenti a futó kapuja címét (`kapu.json`) a tartó készülék-témáján, vagy — ha csak a DHT címét ismeri — egy HIRDETETT téma (gyökér-darab, szelet) párján; az őrjárat címjegyzék-köre (`cimjegyzekKor`: hirdetés + ránézés + a függők újra-bejelentése, egy DHT-munkamenetben, ~20 percenként, új függőnél azonnal) a kopogtatókat 30 percig a kör céljai közé veszi; a kérő munkája a csere helyett a kérelmet futtatja (`fuggoKerelemMunkaja`), ha a társ a célja, vagy ismeretlen bekopogó, miközben kopogtat. ⛔ Önmagunkat nem kérdezzük (a saját gyökér-darabunkat mi is hirdetjük). ⭐⭐ **A TOVÁBBADÁS** (D92/1 (c), D92/2–3, D87 — `koino.js`): a függő kérelem azonosítóval és UGRAS_MAX = 3 számlálóval megy (`kerelem.js`: `tovabbiUgras` — a Freenet mintája: aki a maximumot kapja, fele eséllyel csökkenti); aki nem tudja kiszolgálni, de vállalja, `ATVESZEM`-et mond (a kiszolgáló `atvesz`: nincs kétszeres továbbadás, korlátos), a saját munkáiban továbbadja (a szeletet TÁR NÉLKÜL, a törzset a memóriabeli fájl-tárba — `memoriaBlobTarolo`), és a választ annak viszi vissza, akitől kapta (`VALASZ` → `valaszFogadasa`) — ⛔ K2: csak a memóriában, 15 percig. A továbbadott fejlécnél nincs szúrópróba (az interaktív): a létrehozó események aláírása ellenőrizhető, az össz-pont bemondás. ⚠️ D87: a tartó a kérelmet a továbbítótól kapja, a kérdező címe nincs benne (a terjedő címjegyzék attól még továbbadhatja a címét — de az nem árulja el, hogy kért valamit).
- `js/csere/dht.js` — **a tábla mai megvalósítása**: függőség nélküli BitTorrent-DHT kliens (BEP 5 + 44; ⭐ D91 óta a BEP 5 „ki tartja” is: `bejelent` / `tarsakKeresese`, a port kifejezetten megadva, a hirdetők listája korlátos; és forgalom-számláló). ⚠️ **Segédeszköz, nem előfeltétel** (2. szabály): ha nem elérhető, a koino megy tovább, csak a leszakadt társ visszatalálása lassul. ⭐ A **belépő csak kurbli**: a készülék a saját emlékezetéből indul, és a csere **át is ad** néhány megismert gépet a társaknak (Csaba döntése, 2026-09-20).
- ⭐⭐ **A RAJ (D91, 2026-10-03)** — `tarsak.js`: a szelet-címjegyzék (`szeletcimek.json`) a „kitől kaptam” és a raj: szeletenként legfeljebb 8 tartó (tábla-aláíró + utolsó cím, név nélkül), a FELE a legfrissebb, a többi VÉLETLEN (59. mérés: különben a nagy rajok szétesnek); `rajTippekBeolvasztasa` / `rajAjanlat`. A csere `RESZVETEL`-je viszi, ha van eltérő szelet: melyiket VÁLLALOM (a megnézettet és a gyökeret soha), és néhány ismert tartójukat (`vonal.js`: `rajAlakja` — az ellenséges üzenetet is szűri); a `koino.js` a csere után a társat tartónak jegyzi (a hitelesített tábla-aláírójával).
- `js/csere/tarsak.js` — **a társ-lista** (D33, Szakasz 2 / A. lépés) — 2026-09-26 óta az **induló címek** (`indulocimek.json`, tiszta lap): a `csere` és az őrjárat nem egyetlen címre megy, hanem a listára — a kapun, egyszerre. ⭐ **Egy társ bukása nem hiba, hanem a normális működés** — a kör megy tovább, és a bukás csak feljegyződik. Hálózatot **nem importál**: a kopogás a kapué, ez csak könyvel (`kopogasMegfigyelesei`, 1. szabály), ezért hálózat nélkül önpróbázható. A `utoljara`/`sikertelen` mező **helyi megfigyelés** — sosem terjed, és semmit nem dönt el a koinóban.
- ⭐⭐ **A ZÁRT KOINÓ KAPUJA (D93/3, az E3 — 2026-10-04)** — `vonal.js` + `koino.js` (`tarsKapuja`): a zárt koinó tartalmát a készülék csak (ellenőrzött) tagnak adja. A tábla-kulcs a `NYITAS`-ban jön; a kapu ebből (a tábla-kulcshoz megjegyzett személyből — `azonossagok.json`, helyi, legfeljebb 256) dönt, és ha nem ismeri a társat, a `CIMEK`-ben kér (`kell`); a bizonyítás egy `TAGSAG` körben jön (a személyes aláírás az átiratra + a horgony + a tagsági csomag), a kérelemnél `KELL` → `TAGSAG`. A nem tag csak a koinó születését, a saját és a mi azonosság-szeletünket kapja — fájlt, idegen címet, DHT-gépet nem (a társ által bemondott szelet-kulcsokat is szűrjük). Nyílt koinóban, és ahol a koinó születése nem ismert, nincs kapu. ⛔ A kapu hibája zárva hagy. A hétköznapi (ismert társú) csere nem drágul (64. mérés).
- `koino.js` — a **parancssori arc**: ezzel játszható végig kézzel a teljes kör (fejlesztői eszköz, lásd fentebb).
- `meres/probaFuttato.js` + `meres/mind.js` — az önpróbák közös váza és belépője.

### A PROTOTÍPUS architektúrája (befagyasztva)

### Backend (`backend/`) — Node.js + Express + Mongoose

Rétegek: `routes` → `controllers` → `services` → `repositories` → `models`. Belépési pont: `server.js` (route-regisztráció, statikus frontend-kiszolgálás, MongoDB-kapcsolat, cron indítás).

- `models/` — Mongoose sémák: eember, gondolat, kategoria, gondolatTipus, javaslat, ertekJavaslat, egyezmeny, szavazat, tudatpontAllokacio/Hozzarendeles, ertesites...
- `services/javaslat/` — a javaslat-életciklus magja; a `vegrehajtok/` almappában művelet-típusonkénti végrehajtók (athelyezesi, egyesitesi, torlesi, csomag), amiket a `javaslatVegrehajtasiService` fog össze.
- `jobs/javaslatCronJob.js` — node-cron: lejáró javaslatok időzített lezárása.
- `services/hierarchikusFrissitesService.js` — hierarchikus (szülő-gyerek) frissítések; a sorrend kritikus (lásd git history).

### Frontend (`frontend/`) — vanilla HTML/CSS/JS, build nélkül

ES-modulok, komponens-osztályok. Belépés: `index.html` + `js/main.js`, nézetek a `js/components/foOldal.js`-ből.

- `js/components/kartya/` — entitás-kártyák (GondolatKartya, JavaslatKartya, EgyezmenyKartya...), a `Pakli.js` listázza őket.
- `js/components/szovegSzerkeszto/` — blokk-alapú szerkesztő: `blokkok/` (SzovegBlokk, KepBlokk, FajlBlokk, LinkBlokk, EntitasHivatkozasBlokk), `eszkoztar/`, BlokkLista, OldalNavigacio.
- `js/components/modals/` — Modal alaposztály + specifikus modálok (JavaslatModal); a hozzájuk tartozó HTML a `html/components/modals/` alatt.
- CSS komponensenként külön fájlban a `css/components/` alatt, a `css/main.css` importálja őket.

## Kódolási konvenciók

1. **Minden név magyarul, camelCase-ben** (fájlok, változók, függvények, CSS-osztályok). Osztályfájlok PascalCase-zel (pl. `IdEllenorzoMezo.js`).
2. **Minden fájl első sora** komment az elérési úttal, pl. `// frontend/js/main.js`.
3. **Bőséges magyar kommentek**: a fájl/osztály tetején felelősség-leírás („Felelősség: ...", „Használják: ..."), a logikai blokkok előtt `// ===== SZAKASZ =====` fejlécek.
4. **Naplózás**: a metódusok elején és végén `console.log` a releváns értékekkel (pl. `'Metodus - KEZDÉS'`, `'Metodus - VÉGE'`).
5. **Moduláris, clean code** a frontenden is: egy komponens = egy JS-fájl + egy CSS-fájl.
6. A fejlesztő most tanul programozni: **apró, alapos lépésekben** haladjunk, a változtatásokat érthetően magyarázzuk el magyarul.

## Munkafolyamat

- Commit-üzenetek magyarul, a `main` branchre dolgozunk.
- **Az ÚJ program (`koino/`):** módosítás után `node koino/meres/mind.js` — minden próbának zöldnek kell lennie. Új próbánál **rontás-próba** is: kapcsold ki, amit mér, és nézd meg, hogy bukik-e. Ami parancsból érhető el, azt a `meres/parancssorProba.js` méri (viselkedést, nem feliratot).
- **A PROTOTÍPUS (befagyasztva)** — csak ha mégis hozzá kell nyúlni: a Docker-es dev környezetben (http://localhost:3000) ellenőrizzük, és **tesztelés előtt a [`docs/teszt.md`](docs/teszt.md)** (környezet-indítás, útvonalak, kötelező mezők, forgatókönyvek); ha ezek változnak, a `teszt.md`-t is át kell vezetni.

## Zárójeles jegyzetek konvenciója

A fejlesztő a munka közben felmerülő mellékes ötleteit, kéréseit **zárójelben** írja le — `[ ... ]` (szögletes) vagy `{ ... }` (kapcsos) formában is. Ezeket **nem szabad azonnal megvalósítani**, de elveszíteni sem. A helyes kezelés:

1. A jegyzetet **szó szerint felvezetni a [`docs/jegyzetek.md`](docs/jegyzetek.md) naplóba** (dátummal, felülre, 🆕 jellel).
2. Röviden visszaigazolni, hogy fel lett jegyezve, majd **folytatni az aktuális feladatot**.
3. Ha a jegyzet a folyó munkát közvetlenül érinti, előbb rákérdezni.
4. Ha valódi feladattá válik, átvezetni a [`docs/fejlesztesi_terv.md`](docs/fejlesztesi_terv.md)-be, és a naplóban ✅-re állítani.
