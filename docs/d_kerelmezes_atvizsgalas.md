# A D — a kérelmezés: átvizsgálás a döntés előtt

*2026-10-03 · a végleges sor ⑤ lépése · a D76 (a nézet kérdez, a kérelem továbbadható), a D83/3 (a kérő először a
tudatpont-tartóktól), a D84/1 (a kiszolgálás korlátja csak a törzsé) és a D87 (a törzs a kérelem útján, a közvetítő
nem ismeri a kérdezőt) megépítése előtt. A G mintájára: a követelmények, ami már megvan, a terep valósága a 60.
mérés számaival, a nyitott kérdések javaslattal, és a következő mérések.*

> *„azt kell szem előtt tartani, hogy a böngészés közben a felhasználó lássa a címeket, fejléceket adatokkal. […] ezt
> a nézet mondja meg."* — Csaba (D76)

## 1. Mit kell tudnia — a követelmények (a meglévő döntésekből)

1. **A nézet kérdez** (D76/1–2): első körben a pakli, hierarchikusan, az ÖSSZ-PONT szerint — az első betöltés a
   legnagyobb össz-pontú legfelső szintű entitás mindenestül, szintenként a legnagyobb össz-pontú leszármazott
   fejléce, és a kiválasztott testvéreinek fejléce. Egy másik kártya kiválasztása új kérelem.
2. **A válasz az átmeneti tárba** (D75, B/2) — ugyanazon a kapun (3. szabály).
3. **Nem élő kapcsolat** (D76/3, 5. szabály): a válasz akár percek múlva jön; a frissesség törekvés, nem ígéret.
4. **Továbbadható** (D76/4): ugrás-korlát (kiinduló 3), azonosító (nincs kétszeres továbbadás), darabkorlát — senki
   terhe ne a koinó méretétől függjön.
5. **A kérdező védelme** (D87, SK13): a kérelem nem hordozza a kérdező címét és nevét; a válasz lépésenként megy
   vissza; az ugrás-számláló kezdőértéke véletlen. Aki közvetlenül egy vállalótól kér, annak a vállaló a válaszoló,
   nem közvetítő — ő megtudhatja (D87/3).
6. **A továbbító átengedi, de nem tartja meg és nem szolgálja ki** (D87/1).
7. **A kérő először a tudatpont-tartóktól** (D83/3) — a G-ből (a raj, a DHT).
8. **A törzs csak a vállalótól, az események bárkitől** (D84/1).
9. **Az össz-pont a NÉZETÉ, nem a döntésé** (D78): szúrópróba a szerzők aláírt gyökereivel + a legnagyobb
   ellenőrzött válasz (D76/5, az A pillér 5. helye).
10. **Elhagyható segédek** (2. szabály): ha a DHT nem elérhető, a kérelmezés a kötéseken át működjön; és legyen kézi
   út (4. szabály — ma a `hozd` és a `kivisz`/`behoz`).

## 2. Ami már megvan

A `hozd` egyetlen szeletet kér, közvetlenül: a jelöltekre (a raj-jegyzék, a DHT hirdetői, az induló címek)
egyszerre kopog, és akinél a rés megnyílik, attól kéri a szelet halmazát (`szeletUdpResen` — a csere halmazát, a
bejelentésekkel együtt); a válasz az átmeneti tárba megy (B/2). A G (D91) megmondja, ki tartja: a raj-jegyzék
készülék-azonosítóval és címmel, a DHT csak címmel. A kötés-háló (K = 3–5) és a buli (az összehangolt ablak)
adja, kivel beszélhetek; a csere titkosított (D89/1). ⛔ Ami hiányzik: a továbbadás, a nézet kérdése (fejlécek,
össz-pont), a fejléc–törzs szétválasztás, és az, hogy egy NAT mögötti tartót egy idegen elérjen.

## 3. A terep valósága — a 60. mérés

*`meres/kerelemMeres.js` (szimuláció): N készülék, K kötés, a buliban 70% él, f arányuk fogadóképes; egy szeletnek T
tartója van, λ eséllyel a kérő 2 lépéses környékén (közösségi érdeklődés). A teljes jegyzőkönyv:
[`eredmenyek.md`](../koino/meres/eredmenyek.md) 60.*

⭐ **A közvetlen elérés a fogadóképesektől függ.** Ha a kérő mindegyik tartó címét ismeri (a G legjobb esete), de csak
a kötéseit és a fogadóképes gépeket éri el, T = 3 tartónál 20% a siker (10% fogadóképesnél), és **fogadóképes gép
nélkül 0,1%**. A koinó méretétől nem függ (50 és 100 000 között ugyanannyi).

⛔ **Az elárasztás a kötés-hálón nagy koinóban szinte semmit nem ad hozzá.** K = 3 kötésnél, 70% élő mellett a
kérelem alig terjed (5 ugrás alatt ~38 üzenet), és véletlenül szórt tartóknál a siker 20,5% → 20,6%. K = 5-nél 442
üzenet, ugyanannyi siker. ⭐ **Ahol számít:** közösségi érdeklődésnél (λ = 0,3: 34% → 52%) és kis koinóban (N = 50:
27% → 72%) — de **2 ugrás után semmi többet**. A véletlen séta kevesebb üzenetből valamivel kevesebbet ér el.

⭐⭐ **A döntő a RÉS NYITÁSA a tartóhoz, nem a továbbadás.** Ha a tartó tudja, hogy valaki kér tőle, és a következő
buliban MINDKETTEN kopognak, a rés két NAT között akkor is megnyílik, ha egyik sem fogadóképes (ez a lyukfúrás —
otthon ↔ mobil között terepen mérve működik). A szimulációban a **kopogtatás** (a kérő bejelenti magát a tartó
„kopogtató” témáján a DHT-n, a tartó időnként ránéz) T = 3 tartónál: ha a NAT-párok fele fúrható, **20% → 76%**,
fogadóképes gép nélkül is 72%; ha 80%-uk, 93%. ⚠️ **Hogy a valóságban mennyi a fúrható pár, az terepmérés** — az
otthon ↔ mobil rés megy, a két mobil közötti (a 🅱️ változat) még nincs mérve.

## 4. A nyitott kérdések — javaslattal

**K1. Az út.** ⭐ Javaslat — három út, ebben a sorrendben, egyszerre indítva:
(a) **közvetlenül** a G-ből ismert tartóhoz, ha a kötésem vagy fogadóképes (mint a mai `hozd`);
(b) ⭐ **kopogtatás**: a kérő a BEP 5-tel bejelenti a címét a tartó kopogtató témáján — `H(koinó ‖ „kopogtató” ‖ a
tartó tábla-aláírója)`, vakítva, mint a D91 témái; minden készülék ~20 percenként ránéz a sajátjára (~3 KB, ~0,2
MB/nap — a gyökér-darab hirdetése mellé), és a következő buliban a kérők felé is kopog; a rés után a kérés
közvetlen (a tartó a válaszoló — D87/3);
(c) **továbbadás a kötés-hálón**, 2–3 ugrásig (a közösségi és a kis koinókban — D76/4, D87).
⚠️ Ez a D76/4 és a D87 hangsúlyát megfordítja: a továbbadás kiegészítő út, nem a fő út. ⚠️ A kopogtatás határai: csak
olyan tartóhoz megy, akinek a tábla-aláíróját ismerem (a raj-jegyzék, nem a DHT puszta címe — annál a közvetlen
kopogás marad); és aki ismeri a koinót és a tartó aláíróját, az látja, hány cím kopogtat nála (azt nem, hogy mit
kér).

**K2. A közvetítő átmeneti tartása.** A továbbítónak a kérelmet a következő találkozásig meg kell őriznie, a választ
pedig addig, amíg a kérőhöz vissza nem ér (5. szabály: nincs egyidejű kapcsolat). ⭐ Javaslat: csak a memóriában,
időkorláttal (két ablak) és darabkorláttal; nem kerül a tárba, nem szolgálja ki — ez a D87/1 „nem tartja meg”
értelmezése.

**K3. Az ugrás-számláló.** ⭐ Javaslat — a Freenet mintája: a kérő 3-at küld, aki 3-at kap, fele eséllyel csökkenti
(így az első továbbító nem tudja, hogy a szomszédja maga a kérdező-e); a 60. mérés szerint 2 ugrás után nincs több
nyereség, tehát ez nem drága (~14 üzenet).

**K4. A fejléc és a törzs határa.** ⭐ Javaslat: a **fejléc** = a létrehozó esemény (cím, típus, szülő) + az
össz-pont; a **szelet eseményei** (pontok, javaslatok) bárkitől jöhetnek (D84/1); a **törzs** = a szöveg-darab
(D72) és a fájlok — csak a vállalótól.

**K5. Az össz-pont a szeletelt világban.** ⚠️ Ez a legnehezebb: az össz-pont a leszármazottak pontjait is tartalmazza,
azokat viszont a leszármazottak szeleteiben tartják — **senki nem látja egyben** (a „végtelen” szerint nem is
láthatja). Két út: (i) **felfelé összegződik** — minden szelet tartója a saját pontokból és a gyerekek bemondott
össz-pontjából számol, és a válasz a részletezést is hozza, amit a kérő súlyozott szúrópróbával ellenőriz (a
szerzők aláírt lánc-gyökereivel, D78, D81: a felfújás f arányát k mintából 1 − (1 − f)^k eséllyel kapja el);
(ii) **első körben csak a saját pont** szerint rendez a pakli. ⭐ Javaslat: az (i), de előbb a mérés (a bizonyíték
mérete k mintánál, és az összegzés terhe).

**K6. A kérdés alakja.** ⭐ Javaslat: a protokoll **nézet-független alapkérdéseket** ismer — *fejlécek* (X gyerekei
össz-pont szerint, legfeljebb n, és ha a válaszoló tartja, a legjobb ág d szintig), *szelet* (X eseményei), *törzs*
(X szöveg-darabja, fájljai) —, és a pakli első betöltése ezekből áll össze. Így a síkidom és a térkép később
ugyanazt használja, és a válaszolónak nem kell az egész utat tartania. (A D76/2 egyetlen válaszra gondolt.)

## 5. A mérések

- ✅ **60.** a kérelem útja (szimuláció) — fent.
- ⏭️ **61.** a kopogtatás a valódi DHT-n: a bejelentés a kopogtató témán, a tartó ránézése, az idők (a döntés után).
- ✅ **62.** az össz-pont bizonyítéka: egy minta 0,5–2,6 KB, a fejléc k = 4-gyel 3–11 KB, k = 8-cal 5–21 KB; a lebukás
  pontosan 1 − (1 − f)^k; a tartó a részfa-fát folyamatosan tartja karban (egy változás < 1 ms, a nulláról építés
  10 000 szerzőnél 7 s). → a kiválasztott ág k = 8, a legfelső testvérek k = 4, a többi bemondás (és ezt kimondja).
- ⏸️ **Terep:** a fúrható NAT-párok aránya (otthon ↔ otthon, otthon ↔ mobil, mobil ↔ mobil — a 🅱️ változat).
