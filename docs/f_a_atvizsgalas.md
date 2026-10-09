# A ⑧ ÁTVIZSGÁLÁSA — a társankénti emlékezet (F) és az A hátralévői (2026-10-09)

*A VÉGLEGES SOR utolsó pillér-lépése ([`alappillerek.md`](alappillerek.md) 4., 8. pont). A ⑦ (a szigorú (b)) kész: a csere
csak a vállalt szeletekben vesz részt, a közös halmazon (D97/1), a raj tartóival (D97/2). Ez a lap összegyűjti, mi van
hátra, mit mért a 70. mérés, mi változott a szigorú (b) óta az A hátralévőinél, és melyik kérdés Csabáé.*

## 1. Mi van hátra

- **F — a társankénti emlékezet** ([`alappillerek.md`](alappillerek.md) F): ha társanként megjegyezzük, hol tartottunk
  legutóbb, a csere csak a változott szeletekről szólhat. ⚠️ A terv egyik felét a D97/1 már megépítette: a közös halmazt
  (melyik szeleteket tartjuk mindketten) társanként megjegyezzük. Ami hiányzik: hogy a közös szeletek közül MELYIK
  változott — ezt ma a két szintű tartomány-egyeztetés első szintje keresi meg, minden cserén elölről.
- **Az A hátralévői** (D79, D82/4 — a 24. elágazás szerint a D után): **a D79 szúrópróba** (a szerző teljes kiosztás-
  listája kérésre, 5%), **a napló-alapú kettős-lánc észlelés** (ha a két ág eseményei különböző sorszámon találkoznak), és
  **a napló-bizonyíték kiszolgálása logaritmikusan** (ma a `naploBizonyitek` minden levelet újraszámol: 100 000 eseménynél
  3,6 s — 52. mérés).

## 2. F — a 70. mérés: mennyibe kerül ma, hogy MELYIK közös szelet változott?

[`eredmenyek.md`](../koino/meres/eredmenyek.md) 70. Két készülék, n közös szelet, a közös halmaz már ismert; v közös
szeletben egy-egy új esemény. Ha semmi nem változott, a csere 1,3 KB (a 68. mérés óta). Ha egy szelet változott, 5,1 KB
(50 szelet) · 6,3 KB (1000) · 7,7 KB (5000); öt változásnál 10,3 · 14,9 · 21,2 KB; húsznál 28,8 · 45,6 · 70,4 KB. A
párbeszéd üzenet-típusonkénti bontása szerint ennek a legnagyobb része az ELSŐ SZINT (a „szelet:lenyomat” párok
tartomány-egyeztetése): 5000 közös szeletnél egy változásra 3,6 KB, húszra 43,8 KB a ~70 KB-ból — az esemény maga (amit
semmi nem spórolhat meg) egy változásnál 0,6 KB. Az első szint ára változásonként 1000 szeletnél ~1 KB, 5000-nél ~2,2 KB:
logaritmikusan nő (a felosztások száma), és a lista-küszöb alatti tartományokban a teljes, 87 jeles párok utaznak.

⭐ **Amit az F megspórolhatna:** ha a két fél tudja, hol tartott a legutóbbi közös cseréjükön, a változott szeletek
listája változásonként ~0,1 KB (a kulcs és a rövid lenyomat) — az első szint helyett. Egy 1000 vállalt szeletes
készülék egy kötés-társsal ötpercenként cserélve, cserénként egy változással, naponta ~1,8 MB helyett ~1,2 MB-ot
forgalmaz társanként (húsz változásnál 5000 szeletnél cserénként ~70 helyett ~30 KB) (a 6. szabály mércéje: az adat minden nap utazik). A „végtelen” elvét a mai alak sem sérti (a
változásonkénti ár logaritmikus), az F viszont állandóvá teszi.

## 3. Az A hátralévői — ami a szigorú (b) óta megváltozott

**A kettős lánc a szeletelt világban.** A D82 szerint az elágazás nem büntet, csak a két ágat egy helyre hozza — de csak
ott, ahol valaki mindkét ágat látja. A szigorú (b) alatt egy szerző eseményei szeletenként szétszóródnak, és a két ág
könnyen KÜLÖN tartókhoz kerül. A legkézenfekvőbb visszaélés: az egyik ágon a G1-re tesz 100 tudatpontot, a másikon a
G2-re 100-at; mindkét ág a saját láncában hibátlan (a D81 önbizonyítása mindkét pont-eseményt rendben találja), és ha a
G1 és a G2 tartói nem azonosak, a szerző a keret kétszeresét használja — a G1 és a G2 döntésében, és felfelé az
össz-pontban. Ugyanígy rejthető el a negatív levél (D79): egy folytonossági törés (a k+1. esemény más kiosztás-gyökérre
épít, mint amit a k. után számolni kell) csak annak látszik, aki a két szomszédos eseményt együtt tartja — a szigorú (b)
alatt jellemzően senki.

**Ki tudja ellenőrizni?** A szerző teljes láncát a szigorú (b) alatt csak ő maga tartja (és a „mindent” beállítású
készülékek). Minden lánc-ellenőrzés tehát kérdés a szerzőhöz — és a szerző hallgathat; a D79/3 szerint ilyenkor „nem
ellenőrizhető” (a pont számít, jelzéssel). ⭐ **De a kérdezett szerzők köre szerencsés:** akinek a pontja egy szeletemben
számít, az a pozitív pontja miatt maga is vállalja azt a szeletet (D86) — tehát benne van a raj-jegyzékben, és a raj a
körben (D97/2) rendszeresen találkozunk. A pont-szerzőket tehát nem kell a hálózaton keresni: a cserében kérdezhetők.

**Mit kérdezünk, és miből lesz bizonyíték?**
- *A napló:* a szerző X legújabb nálam lévő eseményének `lancGyoker.naplo`-ja az 1..j−1 sorszámú eseményeit köti el. A
  többi nálam lévő X-eseményre (i < j) egy tagsági bizonyítékot kérek ehhez a gyökérhez (az i. levél, ~1 KB, log n). Ha a
  szerző becsületes, mind stimmel. Ha két ága van, az i. helyen egy MÁSIK esemény áll: a bizonyíték megnevezi, azt az
  eseményt elkérem (az övé, nála megvan), és a két azonos sorszámú esemény a meglévő **elágazás-bizonyíték** (D82) — új
  bizonyíték-fajta nem kell. Ha nem adja ki: „nem ellenőrizhető”.
- *A kiosztás (D79):* a teljes lista ugyanezen a csatornán, 5% eséllyel egy új kiosztás-gyökérnél; ha negatív levél van
  benne, a meglévő **negatív levél** bizonyíték (D80). A lista 100 kiosztott entitásnál ~5 KB.
- *A kiszolgálás:* a szerző a saját napló-fájának részfa-gyökereit gyorsítótárban tartja (a 64 levélnél magasabb teljes
  részfákét — a saját eseményszámának 1/32-ed része), a többit kérésre számolja: egy bizonyíték így log n lépés, nem n.

⚠️ **Amit ez a személyről elárul:** aki a saját láncáról felel, kimondja, hogy ő X készüléke. Ez nem új kitettség: a
csere `RESZVETEL`-je ma is bemondja, hogy a készülék X azonosság-szeletét vállalja (és ezt X-en kívül alig vállalja
valaki), a zárt koinó kapuja pedig a személyt ismeretlen társtól kifejezetten kéri (D93/3). Aki ezt nem akarja, hallgathat
— a lánca nálam „nem ellenőrizhető” marad.

## 4. A kérdések — javaslattal (D-szintűek, Csabáéi)

**F1. Hogyan spóroljunk az első szinten?** (a 70. mérés szerint a változott közös szeleteknél ez a nyílt forgalom 25–62%-a)

- **(A) ⭐ Társankénti közös alap + változás-lista, visszaeséssel — ezt javaslom.** A csere végén mindkét fél feljegyzi a
  társ tábla-aláírója alatt a végső közös lenyomatát és a saját tára akkori állását (az eseményszám és a tömörítés
  generációja — társanként állandó méret, legfeljebb 64 társ, mint a `halmazok.json`). A következő NYITÁS ezt a közös
  alapot is bemondja (~12 B); ha a kettőé ugyanaz (a legutóbbi csere egyezéssel végződött), mindkét fél elküldi a közös
  szeletek közül azokat, amelyek NÁLA változtak azóta (a tára vége óta hozzáfűzött események szeletei és bejelentési
  helyei, a rövid lenyomatukkal), és ezek mennek egyenesen a második szintre. A végén a közös lenyomat ellenőriz: ha nem
  egyezik (valaki kihagyott egy szeletet, vagy hazudott), ugyanabban a cserében lefut a rendes első szint — tehát a lista
  nem kíván bizalmat. Ha nincs közös alap (az első találkozás, tömörítés után, ha a közös halmaz változott, vagy ha a lista
  túl hosszú), a mai menet. Az ár: a változásonkénti első szint ~1–2 KB helyett ~0,1 KB.
- **(B) A tartomány tömörebb kódolása, állapot nélkül.** A határokat a kulcsok lenyomatának bitjei szabnák meg (nem kellene
  elküldeni), a listák rövid ujjlenyomatokat vinnének a 87 jeles párok helyett: az első szint nagyjából ötödére esne, de
  változásonként logaritmikus marad, és a társankénti állapot nem kell. Protokoll-törés (a telefon úgyis frissül).
- **(C) Semmi.** A mai ár logaritmikus, a „végtelen” elvét nem sérti — csak drágább.

**A1. Hol kérdezzük a szerzőt a lánca felől?**

- **(A) ⭐ A cserében: a társ a SAJÁT láncáról felel, ha kérdezik — ezt javaslom.** A csere végén (a tagsági kör mellett) egy
  rövid kör: „ezekről a szerzőkről kérek lánc-bizonyítékot” (rövid ujjlenyomatokkal, legfeljebb néhány szerző); aki maga
  az a szerző (vagy „mindent” módban a teljes láncát tartja), felel a napló-bizonyítékokkal és — ha kérték — a kiosztás-
  listával. A pont-szerzők a raj tagjai (lásd 3.), tehát a raj a körben eléri őket; új útvonal, DHT, keresés nem kell.
- **(B) Függő kérelem a G-n át** (D92/1): a szerző azonosság-szeletének tartóitól (a raj, a DHT). Bárkitől kérdezhető, de a
  szerző készülékének keresése nyilvános helyen (vakított téma) a személy és a cím összekötését a koinó minden tagja elé
  teszi.
- **(C) Az esemény hozza** (a D81 szellemében): minden K-adik pont-esemény a teljes listát egy darabként hozná, és minden
  esemény az előző eseményt kísérőként (a folytonosság így minden tartónál ellenőrizhető). Hallgatni nem lehet, de az
  esemény-forgalom közel kétszeresére nőne (6. szabály) — és a D81/5 szerint a lista kérésre marad.

**A2. Milyen gyakran fusson a napló-ellenőrzés?** (a lista gyakorisága eldőlt: D79, 5%)

- **(A) ⭐ Minden cserében a szerzővel, ha az utolsó ellenőrzés óta új eseménye jött hozzám — ezt javaslom.** Szerzőnként
  feljegyzem, meddig ellenőriztem (a legnagyobb ellenőrzött napló-méret; helyi, korlátos); egy cserében legfeljebb
  8 eseményt kérdezek (~1 KB eseményenként). A kettős lánc a szigorú (b) sajátos rése (a D63 épp ezért készült), az ára
  kicsi, és a szerzőnként feljegyzett állás miatt egy eseményt egyszer ellenőrzök.
- **(B) 5% eséllyel, mint a lista.** Olcsóbb, de a felfedezés esélye a tartók számától függ, és egy kis rajban ritka.
- **(C) Csak gyanúra.** Gyenge: a csaló épp úgy rejt el, hogy ne legyen gyanús (a D79-ben ezért vetettük el).

## 5. A javasolt építési sorrend (a döntések után)

① **F** (ha az (A) vagy a (B)) — a vonal első szintje előtt, a közös halmaz mellett; parancssor-próba: a második cserén a
változott szelet az első szint nélkül megérkezik, és a hazug lista után is minden megérkezik. → ② **A szerző oldala:** a
napló-fa részfa-gyorsítótára (logaritmikus bizonyíték), a lánc-kör kiszolgálója (napló-bizonyítékok, a kiosztás-lista). →
③ **A kérdező oldala:** a szerzőnkénti ellenőrzött állás, a kérdések a cserében (A2), a válaszból az elágazás- és a
negatív levél bizonyítéka (a meglévő `Ellentmondas` fajták), a „nem ellenőrizhető” helyi feljegyzése és kiírása. → ④
**Parancssor-próba:** két ágú szerző, a két ág két készüléken, egy harmadik mindkettőből tart egy-egy eseményt — a csere
után mindhárom ugyanazt számolja.
