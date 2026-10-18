# A FELDERÍTÉS ÁTVIZSGÁLÁSA (D108/1 — 2026-10-18)

> A D108 sorrendje (A): a kiszolgálási keret (D109 ✅) → a kereső-réteg ③–⑦ (✅, + D110, D111) → **a felderítés**. Ez a
> lap a felderítés átvizsgálása az építés előtt: mi van már meg, mibe kerül (a 77. mérés), mi hiányzik alatta, és mit kell
> Csabának eldöntenie (F1–F6).

## 1. A kérés, és ami eldőlt

Csaba ötlete (2026-10-17): *„egy új rendszernek kéne kezelnie [a kérelmeket], és ez a felderítés lenne, ahol egy jó pár
mindent be lehet állítani. pl. melyik ágat milyen mélyen derítse fel, vagy hogy csak a fejléc, vagy body-t is, hány MB-ig
szedheti össze az adatokat, stb.”* és: *„felderített, de tudatpont nélküli gondolatokat nem kell frissen tartani. viszont
tényleg korlátoznunk kell valahogy, hogy ne lehessen vele túl terhelni a készülékeket.”*

A **D108/1** szerint a felderítés egy ág egyszeri **pillanatképe**: a készülék egyszer elhozza a beállított ágat (melyik
ág, milyen mélyen, a legjobbak az össz-pont szerint, csak a fejléc vagy a törzs is, hány MB-ig, körönként hány kérés), és
nem tartja frissen; az átmeneti tárba kerül, **saját kerettel** (egy böngészés ne söpörje ki), és idővel eldobható; nem
vesz részt a cserében, és nem ad értesítést. ⭐ A tudatpont marad a **követés** eszköze. Az újrafelderítés egy új
pillanatkép. A beállítások helyi feljegyzések, nem események; a végrehajtó az őrjárat a meglévő kérelem-géppel. A
**D108/2** szerint a valódi védelem a kiszolgálónál van — ez a D109 kerete, megépült.

## 2. Ami már megvan

A felderítés szinte teljes egészében a meglévő gépre épül — **a felderítés egy háttérben futó, rögzített Struktúra**:

- **A legjobb-először bejáró** (D101 ②, D102): a lap a fejléc-kérelmet a tartónak adja, aki MAGA jár be (`m`), amit tud;
  a lista egy csökkenő sor, a folytatás `utan`-nal; a kérő a helyi tudásból a biztos előtagot számolja (`pakli.js`
  `biztosElotag`). Ugyanez a Struktúra (`strukturaLap` — az ág legjobb B csomópontja, keret 5000) és a Síkidom alapja. ⭐ Az
  össz-pont lefelé nem nő, tehát az ág legjobb-először sorának első K eleme MINDIG egy összefüggő részfa (az X gyökerével)
  — egy pillanatkép, ami rajzolható.
- **A kérelem-gép**: a függő kérelmek (≤ 64, két óra), a kopogtatás (a NAT mögött is), a kérelem-sorozat egy kapcsolaton
  (J3, ≤ 16), a továbbadás; a törzs-kérelem (a szöveg-darab, a fájlok — csak a vállalótól, D84/1, a keret maradékáig).
- **A két tár nézete**: minden lap-nézet a tartós és az átmeneti tárból olvas (`ketTarNezet`) — ami az átmenetibe kerül, az
  a pakliban, a Struktúrában, a Síkidomban, a Keresésben magától megjelenik (a forrás jelével: ≈).
- **A keret** (D109): a kiszolgáló óránként és társanként korlátoz, a keret fölött „később” — egy nagy felderítés így
  lassul, nem terhel túl senkit.
- **A tartó-tipp** (D111): a keresésből jött gondolat tartójához is van út.

## 3. Mibe kerül — a 77. mérés (és a 74. javítása)

`node koino/meres/bejaroMeres.js --felderites` — a 74. mérés modellje (a fa, a tartók 30%-a közvetlenül elérhető, a többi
a kopogtatás után ≤ 20 perc, körönként 70% eséllyel él), a felderítés = a legjobb-először sor első K csomópontja, és ha a
törzs is kell, a K csomópont mindegyikéhez egy törzs-kérelem a saját tartóihoz. Egy FRISS készüléken (a koinóból semmit
nem tart), 1 / 5 perces őrjárat-körrel:

- **A mai menet (G — a tartó maga jár be), „mindent” tartó nélkül:** a fejlécek K = 50-nél ~1 óra (1,3–2,2 MB), K = 200-nál
  2,5–4,3 óra (3,7–5,8 MB), K = 1000-nél 11–20 óra (8–21 MB). ⭐ A törzs ehhez K = 200-nál még ~1–1,5 órát tesz (a fele 15–28
  perc alatt; 200 kérelem ~145 KÜLÖNBÖZŐ készülékhez — a törzset csak a tulajdonos adja), K = 1000-nél ~3,5–6 órát (~700
  készülék). A törzs-kérelmek egymástól függetlenek (nem szintenként jönnek), ezért a fejlécnél olcsóbbak időben.
- **Egy „mindent” tartó a kötések közt (H):** K = 200 fejléce 8–40 perc, a törzse 3–15 perc; K = 1000: 33–200 + 15–75 perc.
  ⚠️ Itt a kiszolgálási keret szab határt (a szimuláció nem modellezi): a „mindent” tartó egy társnak óránként ≤ 750 kérést és
  ≤ 25 MB-ot ad (KK5) — egy 1000-es törzs-felderítés így legalább 80 perc.
- ⭐ **A koinó méretétől nem függ** (20 000 és 200 000 entitásnál ugyanaz) — a 9. szabály rendben.

⛔ **A 74. mérés javítása (2026-10-18):** a mérés bejárója ugyanazt a csomópontot két úton is a kupacba tehette (a tartó saját
bejárása és egy későbbi fejléc-válasz), és a „kiadott B” a másodpéldányokat is számolta — a G és a H változat így kevesebb
valódi csomóponthoz mérte az időt (K = 50-nél ~24 különböző jött ki). A javítás után (a kiadás a már kiadottat átlépi): az
A, a D és az F változat nem változott; a **G** egy oldala 29–34 helyett **38–40 perc**, a 200-as Struktúrája 94–116 helyett
**153–168 perc**; a **H** 200-asa 1–3 helyett 6–8 perc, a 2000-ese 19–29 helyett 19–79 perc. ⭐ A sorrend nem változott — a
D102 döntései (a tartó maga jár be, a kérelem-sorozat) állnak —, de egy friss készülék nagy koinóban, „mindent” tartó
nélkül lassabban tölt, mint ahogy a 74. mérés mondta.

## 4. Ami hiányzik alatta — a lelet

⛔ **A fájl-tár nem korlátos.** A törzs (a szöveg-darab, a fájlok) a fájl-tárba (`<koino>/fajlok/`) kerül, és ott marad —
akkor is, ha az entitást nem vállalom (egy megnézett kártya, egy kérelem). Ma ez a lap törzs-kérelmeire is áll (a ház a
megnézett kártya törzsét elkéri), csak még nem fáj; egy törzses felderítés (K = 1000, fájlokkal) viszont percek alatt
száz MB-okat hozhat, és soha nem engedné el. ⭐ Az alappillér elve szerint ez a felderítés ELŐTT jön: a nem vállalt
entitás törzse ugyanúgy átmeneti, mint az eseményei.

⚠️ **A felderítés össz-pontjai és fejléc-tudása** a helyi gyorsítótárakba kerülnek (`osszpontok.json`,
`fejlectudas.json` — 10 000 bejegyzés, a legrégebbi esik ki); egy későbbi böngészés ezeket is kiszoríthatja — a
rögzítésnek ezekre is ki kell terjednie (különben a pillanatkép kártyái „? pont”-tal maradnak).

## 5. A kérdések (Csabánál)

**F1. A szélesség — mit jelent „az ág legjobbjai”?**
- **(A) ⭐ Legjobb-először, összesen K (és legfeljebb d szint) — ezt javaslom:** a Struktúra sorrendje — az ág K
  legfontosabb csomópontja, bármilyen mélyen (ha d adott, legfeljebb d szintig). Mindig összefüggő részfa, és ezt adja a
  tartó saját bejárása (egy kérelemre több szint).
- **(B) Szintenként a legjobb N (a D108 szövege):** minden szinten az N legerősebb — de ha szintenként globálisan, a
  részfa szétszakadhat (egy 3. szintű erős csomópont szülője nem fér a 2. szint N-jébe); ha szülőnként N, a darabszám N^d-vel
  nő (d = 3, N = 10: 1111 csomópont), és szintenként külön kérelmek kellenek.

**F2. A „saját keret” — hol él a pillanatkép?**
- **(A) ⭐ Rögzítés az átmeneti tárban — ezt javaslom:** a felderítés szeletei, a törzsük, az össz-pontjaik és a
  fejléc-tudásuk RÖGZÍTVE (a felderítés azonosítójával): a böngészés kiszorítása (LRU, 20 MB) átlépi őket, a rögzítettekre
  külön keret áll (a felderítések összes MB-ja), és ezen belül a legrégebbi felderítés megy előbb. A nézetek változatlanul a
  két tárból olvasnak.
- **(B) Külön, harmadik tár** (`<koino>/felderites/`): tisztább határ, de minden nézetnek és a kiszolgálónak három tárból
  kellene olvasnia.

**F3. A fájl-tár kerete (a 4. szakasz lelete) — előbb ez?**
- **(A) ⭐ Igen, előbb — ezt javaslom:** a nem vállalt entitás törzse a fájl-tárban ÁTMENETI (kiszorítható, LRU, saját
  keret — pl. 50 MB), a vállalté tartós; a felderítés rögzítése ugyanígy kiterjed rá. A lap mai törzs-kérelmeit is
  megfogja.
- **(B) A felderítés egyelőre csak fejlécet hoz**, a fájl-tár marad — a törzses felderítés és a lap rése később. (Az
  alappillér elve ellen szól.)

**F4. A beállítások alapértéke és felső határa** (a saját készülék védelme — a kiszolgálót a keret védi):
- **(A) ⭐ Ezt javaslom:** K = 200 (legfeljebb 2000), d nincs (legfeljebb 64), csak fejléc (a törzs bekapcsolható), 20 MB
  (legfeljebb 500), körönként 4 kérés (legfeljebb 16 — a sorozat határa), egyszerre legfeljebb 8 felderítés, összesen
  legfeljebb 1 GB, és egy pillanatkép 30 nap után eldobható (ha nem nézték meg). A 77. mérés szerint a K = 200 egy friss
  készüléken pár óra, egy „mindent” tartóval negyedóra.
- **(B) Kisebb alapértékek** (K = 50, 5 MB) — gyorsabb, de a pillanatkép sekély.

**F5. Hol indul, hol látszik? (a felület)**
- **(A) ⭐ A kártya menüjéből indul (a koinós többlet egy pontot fűz a prototípus menüjéhez — körülírva), a felderítések
  listája (állás, újrafelderítés, törlés) a fő menüben — ezt javaslom;** a rögzített kártyán egy kis jel: „📷 pillanatkép,
  3 napja”. A parancssorban: `felderites <ág> [K] [törzs] [MB]`, `felderites` (a lista), `felderites torol <az>`.
- **(B) Csak a fő menüből** (az ág a pakli aktív kártyája).

**F6. Az elsőbbség a saját kéréseim közt:** a felderítés körönként legfeljebb a beállított kérésszámot viszi, a lap
interaktív kérései (a pakli, a Struktúra) mindig előbb mennek — ezt javaslom; a kiszolgálónál nincs külön „háttér” jel (amit
a kiszolgáló nem ellenőrizhet, az illemtan — D108/2; a keret véd).

## 6. A javasolt építési sor

① a fájl-tár kerete (F3 — alappillér, a lapot is érinti) → ② a rögzítés az átmeneti tárban (a szeletek, a törzs, az
össz-pontok és a fejléc-tudás — F2) → ③ a felderítés jegyzéke és ütemezője az őrjáratban (a Struktúra bejárója a háttérben,
a beállítások határaival — F1, F4, F6) + a parancs → ④ a törzs-fázis → ⑤ a felület (F5). Mindegyik rontás-próbával, a
bekötés parancssor-próbával (egy végig futó őrjárattal).
