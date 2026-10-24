# ALAPPILLÉREK — amire a koino épül, ami még hiányzik, és ahonnan leágaztunk

*Létrehozva: 2026-09-27 este, Csaba kérésére, a C lépés 8. pontja után.*

> *„én azt mondom, hogy csináljunk meg minden alap pillért, amire épül valami. csak tudom, hogy
> így a fejlesztés iránya tele lesz elágazással, ezért jól kell dokumentálni, hogy miről ágaztunk
> le, és miért. szóval akkor a merkle-fát se halogassuk, ha már építenénk rá."* — Csaba

**Mi ez a dokumentum?** A [`utiterv.md`](utiterv.md) a **sorrend** helye, a
[`fejlesztesi_terv_fazis2.md`](fejlesztesi_terv_fazis2.md) a **döntéseké** (D1–D89), a
[`skalazas_terv.md`](skalazas_terv.md) és a [`szeleteles_terv.md`](szeleteles_terv.md) a
**szerkezeté**. Ez itt a **térkép** közöttük: mely darabok állnak, melyek azok az alapok, amelyekre
még sok minden épül, és — az 5. szakaszban — **minden elágazás**, amit a munka közben vettünk.
⚠️ Új elágazásnál ide is be kell írni (dátum, miről, miért, hol a részlet).

---

## 1. Az irány egy bekezdésben

A koino **a készüléken fut**, szerver nélkül: minden művelet egy aláírt esemény, az állapot
eseményekből **számítódik** (D17). A **„végtelen" elve** (Csaba, 2026-09-26) szerint egy készülék
terhe nem a koino méretétől függ, hanem attól, amivel ő maga foglalkozik. Ehhez a tárolás és a
csere egysége a **szelet** (egy entitás eseményei), és egy készülék **a saját érdeklődését** tartja
(D72/1, (b)). Amit nem tart, azt **kérésre** hozza el (D76), és amit csak látott, azt **eldobható**
tárban tartja (D75). Ami nem ellenőrizhető, az kimondottan „nem ellenőrizhető" (D19) — és amit
ellenőrizhetővé lehet tenni, azt egy közös szerkezet, az **összegző Merkle-fa** teszi azzá.

## 2. Ami áll — a kész pillérek

- **Az aláírt esemény** — kanonikus alak, lenyomat, Ed25519 (D15): `esemeny/kanonikusAlak.js`,
  `esemeny/esemeny.js`. A kulcs a személyazonosság; a szöveg külön darab (D72): `szovegDarab.js`.
- **Az egyetlen kapu** — `esemenyMentese` (3. szabály): ellenőrizetlen esemény nem kerül a tárba.
- **A tár** — egy hozzáfűzhető adatfájl + a **mutató** és a pillanatképe (D73), lusta testek;
  mögötte **az író** (D70). A szeletek, a születések (a C 7. pontja), a szelet lenyomata kérdezhető.
- **A számítás** — állapot, szabályok, döntés (javaslat → egyezmény), a szerkesztési egyezmények
  végrehajtása, az identitás (D56–D62) és a kontraszt-jelzés.
- **A szállítás** — az állandó UDP-kapu, a rés, a kötések (tábla-kulcs, D71), a hirdetőtábla (DHT),
  a helyi felfedezés; a fájlok és darabok tartalom-címzett tára és a fájl-randevú.
- **A csere szeletenként** — tartomány-egyeztetés (D74: a lenyomat hash), két szinten, a
  gyerek-bejelentéssel; a régivel tiszta törés (D72) — a C 6–8. pontja.
- **A kézi út** (4. szabály) — `kivisz`/`behoz`, a szöveg-darabbal együtt.

## 3. Ami hiányzik — az alappillérek, a függőségük szerint

### A. ⭐⭐⭐ AZ ÖSSZEGZŐ MERKLE-FA — a legtöbb dolog erre épül

**Mi ez:** egy rendezett elemhalmaz fája, amelynek minden csomópontja a gyerekei lenyomatát
(hash, a D74 szerint — nem összeg), az elemszámot, és **összegeket** (pl. tudatpont) hordoz. Egy
gyökér-lenyomatból bármely tartomány lenyomata, egy elem jelenléte vagy egy részösszeg **log N
adatból bizonyítható**, a teljes halmaz nélkül.

**Hat hely épül rá — ezért nem halasztható:**
1. **A szerző lánca (D63, a C 10. pontja)** — a szerző minden eseménye elköteleződik az egész
   addigi láncára; így a **kettős lánc a szeletek között is lelepleződik** (a (b) ára enélkül).
2. **A tudatpont-keret (skálázási terv 4.8)** — a `kiosztva` bemondása a lánc részösszegéből
   bizonyítható, a lánc hézagtalan ismerete nélkül.
3. **Az identitás a szeletelt világban** — Csaba mondata: *„a láncok a hitelesítéshez — mindenkinél,
   Merkle módon"* (skálázási terv 0/b, 4.9): egy ember egész élete ~80 bájt.
4. **A tömeges entitás (4.6)** — egy millió eseményes szelet tartomány-lenyomata O(n) helyett
   O(log n) (a D74 ára).
5. **Az össz-pont ellenőrzése (D76)** — a pakli „legerősebb" ágát ma a válaszoló mondja be;
   ellenőrizhetővé a részfa összegző fája teszi.
6. **A tartós mag (D14/D21)** — azonosság-egyszeriség, később a pénz (a pénzzel együtt, D66).

✅ **ELDÖNTVE (D78, Csaba, 2026-09-27 este) — a fa alakja és a horgony:**
- **Egy csomópont** (a gyerekek lenyomata + darab + rögzített összeg-lista, a lenyomat mindent
  fed), **két elrendezés**: a **napló-fa** (a szerző lánca, sorszám szerint, csak hozzáfűzés) és az
  **állapot-fa** (kulcs szerint, felülírható — a szerző kiosztása, később egy entitás tulajdonosai;
  a helyet a kulcs lenyomata szabja meg). Egy `lancGyoker` az eseményben mindkettőt elköti.
- **Most darab + egy összeg (a tudatpont).** Az összeg-lista fa-típusonként bővíthető.
- ⭐⭐ **A horgony: aláírással csak a SZERZŐ, és csak a sajátjáról; minden más gyökér SZÁMÍTOTT**
  — a szelet (mindkét fél), a döntés (a raj), és ⭐ az **össz-pont a NÉZETÉ, nem a döntésé**:
  szúrópróba a szerzők aláírt gyökereivel + a legnagyobb ellenőrzött válasz. ⛔ A tartók aláírása
  nem horgony (olcsó azonosság). ⏸️ A tartós mag horgonya a pénzzel együtt (D66).
- ✅ **SK14 lezárva:** a lánc-gyökér az eseményben lakik, nem a magban.

**A megépítés sorrendje:** ✅ ① a fa-modul (a két elrendezés, bizonyíték, ellenőrzés, a kiosztás
változásának ellenőrzése) próbákkal és méréssel (52.) → ✅ ② a `lancGyoker` az új eseményekben (az
ESEMÉNY ELŐTTI állapot; a szerző gyorsítótára) → ✅ ③/helyi: az ellentmondás bizonyítéka (D80 — esemény a
vádolt azonosság-szeletébe; a kapu ellenőrzi, a szabály a vádponttól kihagyja a pontjait) → ✅
D81: a bizonyíték az eseménnyel utazik (a `lancGyoker` maga a két gyökér, a pont-esemény a
bizonyítékát is hozza; a szabály hézagnál is bizonyítottan ítél) → ✅
D82: a kettős lánc nem büntet, a bizonyíték a két ágat egy helyre hozza → ✅ az ÉSZLELŐ (a csere és a
kézi út után magától; `ellenoriz`) → ⏸️ a D pillér UTÁN: a D79 szúrópróba (a teljes lista kérésre), a
napló-alapú kettős-lánc észlelés, a napló-bizonyíték kiszolgálása (logaritmikusan). ⭐ **Az A helyben
elérhető része kész — a következő pillér a B.** ✅ **A hátralévők is (2026-10-09, D98/2–4):** a lánc-kör a cserében
(`lancEllenorzes.js`, 71. mérés) — ⭐ **AZ A PILLÉR KÉSZ.**

### B. ⭐⭐ A KÉT TÁR (D75) ÉS AZ ÉRDEKLŐDÉS SZABÁLYA (a C 9. pontja)

⏭️ **A KÖVETKEZŐ PILLÉR (2026-10-01).** A megépítendő alak (D75, D83, D84): két tár (tartós = vállalt:
a tudatpontos szeletek és a saját eseményeim szeletei — ⚠️ a pontos határ nyitott kérdés, lásd lent;
átmeneti = látott, eldobható — a legrégebben megnézett megy, SK11) · a vállalás SZÁMÍTOTT (a
tudatpontokból és a saját eseményekből) · a „megnézett" feljegyzése (a `hozd` és a felület
megnyitásai) · a D14 csak a tartósra (a nem tartott entitás „nem tartod" jelzéssel látszik) · a csere
`reszvesz`-e a vállalásból · a kiszolgálás D83/D84 szerint (az eseményeket kiszolgálja, akinél
megvannak; a **törzset** alapból csak a vállaló; készülékenként „mindent"). ⛔⛔ **NINCS KÖZTES ÁLLAPOT
(D84/3):** a szigorú (b) a B végleges alakja, és az előfeltételei (G, D, E) elé kerülnek — a sorrend: 4.

✅ **A két kérdés eldőlt (2026-10-02):** (1) → **D86** (a tartós tár: a tudatpontos szeletek + a saját
azonosság-szeletem; a máshová írt saját eseményeim eseményként); (2) → **D85** (a javaslat a saját
szeletében, mindenestül; a döntés bemenete bejelentésként minden érintettnél; szavazati jog: pont a
gondolaton ÉS a javaslaton; az egyezmény ugyanaz az entitás, új fázisban; a töredékek számított
entitások, mindegyik a saját érintettje gyereke) — ⭐ ez is a B része, a B/3 előtt. ⏸️ **Új nyitott
kérdés (B):** a gyökérre nem lehet pontot tenni — a szigorú (b) alatt ki tartja a legfelső szintű
gondolatok születését? *(Az alábbi bekezdés a kérdések eredeti alakja.)*

*(Eredeti, 2026-10-01:)* **Két nyitott kérdés, ami a B-t érinti:** **(1) a tartós tár
határa.** A D75/1 „a saját eseményeim szeleteit" is tartósnak mondja, de a pont-rendezésem maga is
esemény az entitás szeletében — szó szerint a visszavett pontú szelet soha nem kerülne át az
átmenetibe, holott ugyanez a pont kimondja, hogy átkerül. Tudatpont nélküli saját esemény: a
visszavett pontú entitás, a meghívás / felhatalmazás / tanúsítás (a MÁSIK azonosság-szeletébe), az
ellentmondás-bejelentés, az állásfoglalás. *Javaslat:* tartós = a tudatpontos szeletek + a saját
azonosság-szeletem; a máshová írt saját eseményeimet mindig megtartom és kiszolgálom, de ESEMÉNYKÉNT,
nem az egész szeletet (a D83/1 szövege); a meghívott szeletéről az E dönt. **(2) az érintettek
bejelentése.** A javaslat és a szavazatai az ELSŐ érintett szeletébe kerülnek (`muveletek.js`: „a
szeletnek egyetlen gazdája lehet") — egyesítésnél a második entitás tartói, áthelyezésnél az új szülő
tartói nem látják (a 6. elágazás ennek a születésre szűkített esete). *Javaslat:* a gyerek-bejelentés
mintájára a javaslat bejelentése minden érintett szelet egyeztetési halmazába bekerül (nem új
esemény, csak a szelet halmaza bővül).

A **tartós tár** a vállalt (tudatpontos szeletek, a saját eseményeim szeletei) — itt a csere teljes
jogú résztvevője vagyok, és a D14 csak erre vonatkozik. Az **átmeneti tár** a látott (megnézett,
lekért, a szülő köréből jött születések) — eldobható, és **mindent kiszolgál, a törzs kivételével**.
Erre épül: a (b) részvétele (`reszvesz`), a kérelmezés válaszainak helye, a felület „nem tartod"
jelzése. ⚠️ Ma a „megnézett" sehol nincs feljegyezve — ez is ide tartozik.

### C. ⭐ A LÁNC-GYÖKÉR (D63, a C 10. pontja) — A-ra épül

A (b)-vel a kettős lánc két ága külön szeletbe eshet, és ott senki nem látja együtt. A lánc-gyökér
(A/1) ezt pótolja. ⚠️ A `lancGyoker` mező ma lefoglalt — a kanonikus alak már elbírja.

### D. ⭐⭐ A KÉRELMEZÉS (D76) — B-re épül (az ellenőrzött össz-pont A-ra)

A felület **nézet-kérdést** tesz fel (első körben a **pakli** hierarchikus elrendezése, az
össz-pont szerint): aki több adatot tart, összeállítja a választ, és az az átmeneti tárba kerül.
A kérelem **továbbadható** — a válasz ugyanazon az úton jön vissza, ugrás-korláttal (kiinduló 3),
azonosítóval (nincs kétszeres továbbadás) és darabkorláttal (a terhelés a koino méretétől
független). A folytonosság élménye nem fontos: a válasz akár percek múlva jön.
⭐ **D87 (2026-10-02):** a törzs a kérelem útján jön vissza, a továbbító átengedi, de nem tartja meg és
nem szolgálja ki; a közvetítő nem tudja, ki a kérdező (a kérelem nem hordozza a címét, a válasz
lépésenként megy vissza, az ugrás-számláló kezdőértéke véletlen).
🔍 **Az átvizsgálás (2026-10-03):** [`d_kerelmezes_atvizsgalas.md`](d_kerelmezes_atvizsgalas.md) — a 60. mérés
(szimuláció) szerint a kötés-hálón való elárasztás nagy koinóban szinte semmit nem ad (2 ugrás után semmit), a döntő a
rés nyitása a tartóhoz: a KOPOGTATÁS (randevú a DHT-n, a buliban mindkét fél kopog) T = 3 tartónál 20% → 76%. Hat
nyitott kérdés javaslattal (K1–K6: az út, a közvetítő tartása, az ugrás-számláló, a fejléc–törzs határ, az össz-pont
a szeletelt világban, a kérdés alakja). ✅ **Eldőlt (D92, Csaba, 2026-10-03 — „minden javaslatodat elfogadom”):** a
kopogtatás a fő út (a közvetlen és a 2–3 ugrásos továbbadás mellett), a közvetítő csak a memóriájában tart, Freenet-féle
ugrás-számláló, a fejléc = létrehozó esemény + össz-pont, a törzs = szöveg-darab + fájlok, az össz-pont felfelé
összegződik és szúrópróbával ellenőrizhető (előbb a 62. mérés), nézet-független alapkérdések. 🚧 **Az építés (2026-10-03):**
✅ a súlyozott mintavétel az összegző fában (62. mérés) · ✅ az össz-pont (`osszPont.js`: a felfelé összegzés, a részfa-fa
karbantartása, a szúrópróba és az ellenőrzése) · ✅ a kérelem tartalma (`kerelem.js`: az alapkérdések alakja, a fejlécek
és a minták, a kérdező ellenőrzése, a törzs lenyomatai) · ✅ a menet a vonalon (`KERELEM` → `FEJLECEK`/`MINTAKEREK`/`MINTAK`,
`TORZS` → fájlok egy kapcsolaton) és a kiszolgálás a kapu munkájában · ✅ a `kerelem fejlecek|torzs` parancs (cím vagy
induló címek; ellenőriz, az átmeneti tárba ment, a bemondott össz-pontot megjegyzi) · ✅ a függő kérelmek és a KOPOGTATÁS
(a cím nélküli út: a célok a G-ből, a kopogtató témák — a készüléké és a hirdetett témák párja —, az őrjárat ránéz és
felé kopog, a kérő munkája a kérelmet futtatja; végig mérve hamis DHT-n) · ✅ a TOVÁBBADÁS (K2, K3: az azonosító és a
Freenet-féle számláló, az `ATVESZEM`, a `VALASZ` lépésenkénti visszaútja, a továbbító csak a memóriájában tart; a lánc
R → P → H végig mérve) · ✅ a pakli „ágazati pontja” EGY FORRÁSBÓL (az `osszPont.js`; a felület a bemondásokkal rendez).
✅ **A D PILLÉR KÉSZ (2026-10-03).** ⏭️ A ház: a pakli-nézet a felületen a kérelemből tölt (a láncos-testvéres nézet).
⚠️ **Elágazás 56:** a továbbadott fejlécnél nincs
szúrópróba (az interaktív) — az össz-pont ott bemondás, és ezt kimondja. ⚠️ **Elágazás 55:** a kopogtató téma nemcsak a készüléké — a hirdetett témák párja is (különben a DHT-n
talált, csak címmel ismert tartó, pl. egy új készülék gyökér-darabja, elérhetetlen volna).

### E. ⭐ AZ IDENTITÁS A SZELETELT VILÁGBAN — A-ra és C-re épül

Ma a tagság a láncon a gyökérig ellenőrződik (D59), és ehhez a belépési események kellenek. A (b)
után ezek nem mind vannak meg — addig „nem ellenőrizhető" (D19). A cél: a láncok mindenkinél,
összenyomva (A/3).
🔍 **Az átvizsgálás (2026-10-03):** [`e_identitas_atvizsgalas.md`](e_identitas_atvizsgalas.md) — a 63. mérés szerint a
meghívási lánc természetesen logaritmikus (1M tagnál ~13 lépés, ~16 KB), lánc-szerű növekedésnél lineáris (a D59
mélység-korlátja és a rövidítő meghívás kezeli). ⛔ A szabály-réteg ma nem kérdez tagságot (Sybil-rés). Hat kérdés
(E1–E6). ✅ **Eldőlt (D93, Csaba, 2026-10-03 — „minden javaslatodat elfogadom”):** csak az ellenőrzött tag számít a
döntésben; a tagsági csomag a saját azonosság-szeletben (D = 64 — D113 óta 256); a zárt koinó a kézfogásban (személyes aláírás +
csomag); a 2. lépcső ugyanígy (előbb mérés); a Profil kötelező mezőkkel, a meghívás megnevezi a lenyomatát; a
kontraszt-jelzés bemenete. ✅ **Megépült (2026-10-04):** a tagság tiszta számítása (`tagsag.js` — a legrövidebb lánc,
D = 64, D113 óta 256), a tagsági csomag (E2; a kapu ellenőrzi, az őrjárat kiadja), a Profil (E5; a koinó `profil=` mezői, a
`profil` parancs, a meghívás a lenyomatot tanúsítja), és ⭐ **az E1: a szabály-réteg csak a tag pontját, javaslatát,
szavazatát, érték javaslatát és állásfoglalását számolja** — a nem tagé `tagsagFuggoben` (az okával; nem vád, D19), és a
meghívás után UGYANAZ az esemény számít. A döntési csomag a résztvevők tagsági láncát is viszi. ✅ **Az E3 (2026-10-04): a zárt
koinó a kézfogásban** — a nem tag csak a koinó születését és a két azonosság-szeletet kapja (fájlt, idegen címet nem); a
személyt a kapu csak az ismeretlen társtól kéri (a hétköznapi csere nem drágul — 64. mérés; elágazás 57–60). ✅ **Az E4 (D94, Csaba: „Az (A)-t választom.”):** a 65. mérés
szerint a 2. lépcső TELJES bizonyítéka közel lineáris (egymillió 2. lépcsősnél ~290 MB), ezért a SZÚRÓPRÓBA: ha a teljes
ellenőrzés nem fér a keretbe (1000 esemény-olvasás), a helyi rész teljesen és 8 véletlen út az alapító körig (~0,9–2,2 MB,
logaritmikus); az út csak aláírt bemondásokat követ (a 2. lépcsős `LepcsoBemondas`-át és a tanúsító felhatalmazás-
bemondását); elágazás 61–62. ⚠️ Útközben egy régi hiba: a kézi tanúsítás 2026-09 eleje óta nem mondta be a
felhatalmazásait, ezért egy nem alapító tanúsító tanúsítása nem számított — javítva.
✅ **Az E6 (2026-10-04):** az identitás-állítás a szerző
azonosság-szeletébe is bejelentődik, a jelzés a szeletekből számol, a `jelzes` parancs kérésre (elágazás 63). ⭐ **AZ E
PILLÉR KÉSZ** (E1–E6).

### F. A TÁRSANKÉNTI EMLÉKEZET (a D71 (iii) V2-je) — B után

A (b)-ben a nem közös szeletek minden körben „eltérőnek" látszanának. Ha társanként megjegyezzük a
közös szeleteket és a legutóbbi lenyomatukat, a kör csak a változottakról szól.

### G. ⭐⭐ A CÍMJEGYZÉK — „mi kinél van" (D84/2) — B-re épül, a D alapja

⭐ **D90 (2026-10-03): a gyökér is ide tartozik** — a legfelső szintű gondolatok születésének listáját a G osztja
szét (lenyomat szerinti darabok, több helyen, bárki kiszámolja, kitől kérdezze); a vállalásba nem kerül.

⭐ **Az átvizsgálás (S10, 2026-10-03):** [`g_cimjegyzek_atvizsgalas.md`](g_cimjegyzek_atvizsgalas.md) — a
követelmények, a NAT valósága („tudni, ki tartja” ≠ „elérni”), az irodalom, négy jelölt (C1 a fa és a raj ·
C2 belső hash-DHT · C3 a BitTorrent-DHT vakított témával · C4 középút), és a mérés: egy valódi DHT-művelet
~50 kérdés ≈ 5–10 KB — tehát a DHT csak takarékosan. ✅ **Eldőlt (D91, 2026-10-03):** a fő út a fa és a raj;
a hash-elhelyezés csak a gyökér darabjaira és a közvetlen keresésre, most a BitTorrent-DHT-n vakított témával
(az E után újragondolva). Előbb a mérés: 58. (BEP 5), 59. (a raj). ⭐ **A mérések (2026-10-03):** az 58. szerint a
DHT a hirdetést 30–60 perc alatt elfelejti (egy téma ~0,65 MB/nap, ha 20 percenként ismételjük) — a gyökér-darabokra
elmegy, szeletenkénti közvetlen keresésre nem; az 59. szerint a raj L = 8 tartóval, fele friss / fele véletlen
megtartással egyben marad (a csak-friss szétesik). ✅ **A raj megépült** (a jegyzék, a csere, a tanulság), és ✅ **a DHT-rész is
(D91/3, 2026-10-03):** minden készülék a saját gyökér-darabját hirdeti ~20 percenként; a szeletenkénti hirdetés csak
készülékenkénti beállítással (alapból 0); keresni bárki kereshet (a `hozd`, ha a raj nem ismer tartót). ⏸️ **Ami a G-ből
hátravan:** hogy a gyökér-darab tartója a darabot TÉNYLEG tartsa és kiszolgálja (ma mindenki a teljes gyökeret cseréli —
a D90 szétosztása a B/3-mal, a szigorú (b)-vel válik élessé), és a fa „a szülő tartói a gyerekek tartóit is” ága (a
raj ma szeletenként tanul).

> *„a meta adatok, amik megmutatják, hogy mi kinél található, azt több helyen kell tárolni, és
> biztosítani, hogy az egész hálózat tudja, vagy tudja azt, hogy ki tudhatja."* — Csaba, 2026-10-01

A szigorú (b) mellett egy szelet csak a tartóitól mozdul — aki kér (D), annak tudnia kell, kitől. Ma
csak egy **helyi**, nem terjedő szelet-címjegyzék van (`tarsak.js`: név nélkül, a használat tartja
karban, elévül; a `hozd` használja). A terv a skálázási tervben áll: **4.2** — a címjegyzék az
entitáson (Csaba javaslata, 2026-09-02): ha minden szelet hozza a tartói címét és a gyerekeit, a
böngészés a fa bejárása · **5.2–5.3** — a kereső-réteg elosztva és replikálva; a hash-elhelyezés épp
a „tudja, ki tudhatja" (bárki kiszámolja, mely csomópontok felelnek egy szeletért). Ami eldöntött: a
cím **név nélkül** (SK2), **bizalom nem jár vele** (3. szabály — hamis cím elérhetetlenséget okoz, nem
hamisítást), **elhagyható** (2. szabály, 5.7), és **elhalványul**, ha már senki nem tartja (5.7).
⏸️ **Nyitott:** a terjedés alakja (a `fajlTar.js` megjegyzése szerint aláírt, de mulandó üzenet — a
tábla-kulcs írhatja alá, nem az azonosság, D6) · a hash-elhelyezés: a meglévő BitTorrent-DHT vagy a
koinón belüli (SK7: A/B/középút — méréssel, S10: előbb irodalmi átvizsgálás) · ⚠️ csak a VÁLLALT
szeleteket hirdetjük (a tudatpont úgyis nyilvános esemény), a megnézettet soha (D6: elárulná, mit
néztem meg).

### Ami ezekre épül (nem pillér, hanem ház)

A pakli-nézet a felületen (a prototípus láncos-testvéres nézete — ✅ **kész, D100, 2026-10-10**: a kérelemből
tölt, az örökölt `Pakli.js`-szel), később a síkidom- és a térkép-nézet kérelmezése (a maradék modálok, 5.8), és a
terep (✅ PC–mobil két külön címen, 72–73. mérés; ⏸️ két mobil — a 🅱️). 🚧 **A maradék modálok (D101, 2026-10-11):**
átvizsgálva ([`modalok_atvizsgalas.md`](modalok_atvizsgalas.md)); ✅ az I. csoport kész (Tudatpontok, a besorolások
létrehozása, Rendezés, a fő menü); ✅ a közös alap, a legjobb-először bejáró (D102: a tartó maga jár be, a fejléc
folytatásával, a kérelem-sorozattal); ✅ a Struktúra (a bejáró sorrendjéből, egy keretig); ✅ a Síkidom (egy szint a
bejáró sorrendjéből, a nem tartott síkidom gyerekei a kérelem útján; vele az össz-pont javítása — 133.); ✅ a Keresés
helyi alja (136–138.); ✅ az értesítés-réteg (⑥ — a postafiók a készüléken; vele a csak küldő út rése javítva, 139–143.);
🔍 a kereső-réteg (⑦, külön pillér) átvizsgálva ([`kereso_reteg_atvizsgalas.md`](kereso_reteg_atvizsgalas.md) — a
gyökér-darab mintájára, a cím szavainak lenyomatával; K1–K6 Csabánál). ⭐ **És egy új pillér a láthatáron: a KERESŐ-RÉTEG** (skálázási terv II.,
S8–S10) — három dolog épül rá (a Keresés, a besorolás-lenyílók, az entitás-hivatkozás); a D101 szerint a modálok után,
saját átvizsgálással.

## 4. A sorrend — a függőségekből (✅ Csaba megerősítette, 2026-09-27 este)

1. **A** — az összegző Merkle-fa, az első alkalmazásával: **a szerző lánca** (D63 + a tudatpont-keret),
   mert ott a horgony tiszta (a szerző aláírja). Ezzel a **C** (a C lépés 10. pontja) is kész.
2. **B** — a két tár és az érdeklődés szabálya (a C lépés 9. pontja).
3. **D** — a kérelmezés és a továbbadás (a pakli szabályai szerint).
4. **F** és **E** — a társankénti emlékezet, az identitás a szeletelt világban.
5. Utána a ház: a pakli-nézet a felületen, a terep.

*Miért A előbb, mint B?* Mert a B-vel kezdődik a (b), és a (b) azonnal megnyitja a kettős lánc
rését (a két ág külön szeletbe esik) — a D63 zárja be. *A sorrend elve (Csaba, 2026-09-15): ne az
döntsön, mi látszik hamarabb, hanem a függőség.*

⭐ **ÁTRENDEZVE (D84, 2026-10-01) — ✅ Csaba megerősítette (2026-10-02).** Nincs köztes állapot, tehát
a szigorú (b) csak a végleges alakjában kapcsolhat be, és az előfeltételei elé kerülnek. Az A kész
(helyben elérhető része); a további sor a függőségek szerint:

1. **B/1 — a vállalás számítása** (tiszta függvény, a SAJÁT láncból: a kiosztás fájának kulcsai, D78 —
   a terhe a saját tevékenységemmel nő). Ez mindennek az alapja: ezt hirdeti a G, ebből jön a csere
   részvétele és a törzs kiszolgálása. ⚠️ Előtte kell a B (1) kérdés válasza.
2. **B/2 — a két tár**: az átmeneti tár, a „megnézett", a D14 csak a tartósra, az eldobás. A csere
   ekkor még a MAI módon fut (az átmenetibe csak a `hozd` és a D válaszai kerülnek) — új köztes
   útvonal nélkül.
3. **G — a címjegyzék** (előbb mérés / átvizsgálás: S10, SK7).
4. **D — a kérelmezés** (a G-ből tudja, kitől; a válasz az átmeneti tárba megy; először a
   tudatpont-tartóktól — D83/3).
5. **E — az identitás a szeletelt világban** (az A-ra és a C-re épül, a G-től és a D-től független —
   bárhol lehet a 6. előtt).
6. **B/3 — a szigorú (b) bekapcsolása:** a csere `reszvesz`-e a vállalásból, a törzs kiszolgálása a
   D84/1 szerint, és benne a B (2) kérdés (az érintettek bejelentése). Innen végleges.
7. **F — a társankénti emlékezet** (hatékonyság a szigorú (b) alatt, nem helyesség), és az A-ból
   hátralévők (a 24. elágazás szerint a D után).

⭐⭐ **A VÉGLEGES SOR a D85–D89 után (2026-10-02 — Claude döntése, Csaba kérésére: „akkor most azt döntsd
el, hogy milyen sorrendben, érdemes folytatni a fejlesztést").** A fenti sor kiegészül két előre kerülő
lépéssel (a D85 és a D89/1), a többi változatlan. ⭐ **A következő session az 1. lépéssel indul.**

1. **D85 — az entitás-modell** (a szelet-szerkezet utolsó hiányzó darabja). *Miért első:* minden további
   lépés (a vállalás, a két tár, a címjegyzék, a kérelem, a szigorú (b)) szeletekben gondolkodik, és a
   D85 megváltoztatja, melyik esemény melyik szeletbe kerül. Ha a B előbb épülne, a javaslat
   áthelyezése után újra kellene írni. Belső sor: (a) a számítás — az egyezmény mint entitás (ugyanaz,
   mint a javaslat, új fázisban), a töredékek mint számított entitások a saját érintettjük alatt;
   (b) a szabály — a szavazati jog (pont a gondolaton ÉS a javaslaton / töredékén) és a javaslattevő
   lépése (létrehozás → pont → szavazat); (c) a szelet-kulcsok (`Javaslat` saját szelet, `Szavazat` a
   javaslatéba) és a bejelentés TÖBB szülővel (a döntés bemenete minden érintettnél; a tár mutatójában
   a születés-szülő listává válik); (d) az ÉS-szabály: a többi érintett nevezője a javaslat szeletébe.
   ⭐ **Állás (2026-10-03):** (a) ✅ `cbb6f19`, `ee624d6` · (b) ✅ `6016df7`, `54a4d8e` (a T2 bizonyítékkal) ·
   (c) ✅ `2764cab` · (d) ⭐ T3 eldőlt (2026-10-03): az (a) végleges, formája a **döntési csomag** (a2); a tartalma
   és a mérés (55.) ✅ `a97fa28`; ⭐ **Csaba: „legyen a (B)”** — a csomag a TÖREDÉK szeletébe kerül (a rész
   szavazói kapják), a nem szavazó tartó csak akkor kéri el, ha a saját része igent mondott; az előfeltétele, a
   javaslat jogának bizonyítéka (56.) ✅ `41f59d0`; ⭐ **a csomag maga ✅** — a `DontesiCsomag` esemény a
   töredék szeletében, célzottan (csak ami a cél szeletéből hiányzik), a kapu a tartalmát is ellenőrzi, a
   számítás a bemenetébe bontja (nem a tárba), a `csomag` parancs és az őrjárat adja ki (a saját lezárt
   javaslataimra, ismételhetően). ⭐ **Ami a RÉSZVÉTELHEZ kötődik, az a B/1-be és a B/3-ba kerül** (lent, a
   VÉGLEGES SOR 3. és 7. pontja): a mai csere minden szeletben részt vesz (`reszvesz` = mind), tehát az
   elkérés feltétele csak ott kap értelmet.
   *(Próbák: allapot → alap + csere; a végén a teljes sor — közös réteg.)*
2. **D89/1 — a csere titkosítása** és a **zárt / nyílt koinó-paraméter** a `KoinoLetrehozas`-ban (a
   betartatása az E-vel jön). ✅ **KÉSZ (2026-10-03)** — a D89 „A MEGÉPÍTÉS” szakasza, az 57. mérés. *Miért itt:* a D85 a szeletek halmazát is megváltoztatja, tehát a régi
   programmal úgyis megszakad a csere (tiszta törés) — a titkosítás ugyanebbe a törésbe kerül, így a
   telefont EGYSZER kell frissíteni. És minden későbbi üzenet (a kérelem, a címjegyzék) már titkosított
   csatornán születik.
3. **B/1 + B/2 — a vállalás és a két tár** (D86): a vállalás a saját láncból (a kiosztás kulcsai + a
   saját azonosság-szeletem), az átmeneti tár, a „megnézett", a D14 csak a tartósra, az eldobás. A csere
   még a mai módon fut. ✅ A gyökér tartása eldőlt (**D90**, 2026-10-03, Csaba: „legyen a (B)”): nem vállalás,
   hanem a G dolga (a legfelső szintű születések listáját a kereső-réteg osztja szét); a koinó születését
   mindenki tartja. ✅ **A ③ KÉSZ (2026-10-03):** a **vállalás** (`vallalas.js` — a saját láncból: a pozitív
   pontú szeletek, az azonosság-szelet, a koinó születése; a `vallalas` parancs), az **átmeneti tár**
   (`atmenetiTar.js` — ugyanaz a kapu, a legrégebben megnézett megy, a „megnézett” a `hozd` és a megnyitott
   kártya), a **D14 csak a tartósra** (a csak az átmenetiből, pont nélkül ismert entitás jelölve marad), a `hozd`
   a nem vállaltat az átmenetibe hozza, és az **előléptetés** (a vállalttá vált átmeneti szelet a tartósba). A
   csere a mai módon fut (a tartósba) — a szigorú (b) a B/3.
   ⛔⛔ **ÉS A DÖNTÉS ISMERETE (D85 T3, a (B) építéséből — mérve, `dontesiCsomagProba.js` 1.):** ✅ **KÉSZ
   (2026-10-03), de TARTALMI jellel** (a 47. elágazás): egy rész akkor ismert, ha az érintettjének legalább egy
   pont-eseménye a bemenetben van (a tárból vagy egy csomagból) — nem a vállalásból, így a D17 áll.
   *(Az eredeti terv szövege:)* a több
   érintettes döntés-számítás a részvételt (a vállalást) is megkapja, és egy rész csak akkor ISMERT, ha a
   szeletét vállalom, vagy egy csomag hozta el. Ha nem ismert, a javaslat nálam „nem ismert” (D19, T3), a
   végrehajtás nem fut, és ha a SAJÁT részem egyszer sem mondott igent, ezt is kimondja. *Miért kell:* a
   csak-G1-nézet csomag nélkül a G2-es részből csak a mindkét részen szavazó A szavazatát látja (az a G1-be
   is bejelentődik), a G2 tulajdonosait nem — és ELFOGADVA-t számol ott, ahol a teljes tudás ELVETVE-t
   (mérve). ⚠️ A létrehozó esemény jelenléte NEM elég jel: a gyökér (vagy a szülő) tartója minden gyerek
   születését látja, a szeletét mégsem tartja.
4. **G — a címjegyzék** — ⛔ előbb mérés / átvizsgálás (S10, SK7); a D89/2 szerint a zárt koinó
   címjegyzéke nem kerülhet kiolvasható nyilvános helyre.
5. **D — a kérelmezés** (D76, D83/3, D87): a G-ből tudja, kitől; a törzs a kérelem útján, a közvetítő nem
   tartja meg és nem ismeri a kérdezőt; a válasz az átmeneti tárba. ✅ **KÉSZ (2026-10-03, D92):** az össz-pont és a
   szúrópróbája, a kérelem alapkérdései a vonalon, a függő kérelmek és a kopogtatás, a továbbadás (60.–62. mérés).
6. **E — az identitás a szeletelt világban**, vele a zárt koinó betartatása (a tagság bizonyítása a
   kézfogásban, D89/2) és a Profil (D28 a D88 alakjában — az azonosság-szeletben él).
7. **B/3 — a szigorú (b) bekapcsolása:** a csere részvétele a vállalásból, a törzs kiszolgálása a D84/1
   szerint. Innen végleges. 🔍 **Az átvizsgálás (2026-10-04):** [`b3_szigoru_atvizsgalas.md`](b3_szigoru_atvizsgalas.md) —
   a 66. mérés szerint a teljes vállalás terhe a népszerű entitások és a szerzők tagsága miatt ~√N szerint nő, a két fokú
   vállalás (a skálázási terv 4.6) konstans; négy kérdés Csabánál (B1 a tömeges entitás, B2 a tagsági csomag a cserében,
   B3 a csak küldő részvétel, B4 a gyökér darabjai) — ✅ **D95** (Csaba: „igen, elfogadom a javaslataidat”). ✅ **A B1 KÉSZ
   (2026-10-05):** a két fokú vállalás — a nagy szelet összegezve (a gyökér és a lezárási összegzések mintákkal ellenőrizve,
   a döntés az összegzésből), a saját eseményeim a csak küldő úton. ✅ **A B2 KÉSZ (2026-10-05):** a tagsági kísérők — a
   csere végén akinek a tagságát nem tudom, annak a csomagját (vagy láncát) kérem. ✅ **A B3 KÉSZ (2026-10-05):** a csak
   küldő út minden nem halmazként egyeztetett szeletre, a kézbesítés nyilvántartásával. ✅ **D96** (a B5 — Csaba: „rendben,
   elfogadom a javaslatodat”): a koinó születését mindenki az eseményként tartja, a szeletét csak az alapító azonosságát
   vállalók. ✅ **A B4 KÉSZ (2026-10-06):** a gyökér darabonként. 🔍 **A bekapcsolás átvizsgálva**
   ([`bekapcsolas_atvizsgalas.md`](bekapcsolas_atvizsgalas.md), 68. mérés): a közös halmaz nélkül a „nincs újdonság” csere
   6–300 KB, és az őrjárat a rajjal nem cserél. ✅ **D97** (K1/A, K2/A). ✅ **A közös halmaz és a részvétel a vállalásból KÉSZ
   (2026-10-08)** — a szigorú (b) él. ✅ **A raj a körben KÉSZ (2026-10-09, 69. mérés).** ✅ **A törzs korlátja, a kérelem az
   átmenetiből (+ kísérők), a visszavett vállalás és a tár tömörítése KÉSZ (2026-10-09).** ⭐ **A ⑦ KÉSZ** — következik a ⑧.
   ⭐ **A részvételbe a döntési csomag (B) szabálya is beletartozik** (D85 T3,
   Csaba, 2026-10-03): a vállalt szeleteken túl azok a TÖREDÉK-szeletek, amelyek érintettjét vállalom, és
   amelyek saját része valamikor igent mondott (a rész szavazói a töredék pontjuk miatt úgyis vállalják).
8. **F — a társankénti emlékezet** és **az A hátralévői** (a D79 szúrópróba, a napló-alapú kettős-lánc
   észlelés, a logaritmikus napló-bizonyíték). 🔍 **Az átvizsgálás (2026-10-09):** [`f_a_atvizsgalas.md`](f_a_atvizsgalas.md) — a
   70. mérés szerint a változott közös szeleteknél a forgalom legnagyobb része az első szint (változásonként ~1–2 KB; az F
   ~0,1 KB-ra vinné); az A-nál a szigorú (b) alatt a szerző teljes láncát csak ő tartja (minden lánc-ellenőrzés kérdés
   hozzá), de a pont-szerzők a vállalásuk miatt a raj tagjai, tehát a cserében kérdezhetők; az elágazás-bizonyíték (D82) és
   a negatív levél (D80) új fajta nélkül elég. ✅ **D98** (Csaba: „elfogadom a javaslataidat”): F1/A, A1/A, A2/A. ✅ **Az F KÉSZ
   (2026-10-09):** a társankénti emlékezet (`tarsEmlekezet.js`, a tár `allas`-a, `emlekezet.json`) — a változott közös szelet
   az első szint nélkül jön (a 70. mérés kiegészítése). ✅ **Az A hátralévői KÉSZ (2026-10-09, 71. mérés):** a lánc-kör a
   cserében (`lancEllenorzes.js`) — a napló-fa következetessége (RFC 9162) és részfa-gyorsítótára (logaritmikus kiszolgálás),
   a kérdező (a fej, a többi esemény, a régi fej, a következetesség, 5%-kal a teljes kiosztás-lista), és a válaszból a meglévő
   elágazás- és negatív levél bizonyíték; parancssor-próba: a két ágú szerző eseményei egy harmadik készüléken különböző
   sorszámon találkoznak, és a lánc-kör bizonyítja az elágazást. ⭐ **A ⑧ KÉSZ — A VÉGLEGES SOR VÉGE.**

*Utána a ház:* a pakli-nézet a felületen, a terep (két mobil, a 🅱️ változat). ✅ **A terep PC–mobil között
(72–73. mérés, D99) és a ház (D100, 2026-10-10) KÉSZ** — a részletek a fázis-2 terv D100-ában és az 5. szakasz
96–104. bejegyzésében. ⏭️ Csaba a maradék modálokat választotta (D101, 2026-10-11) — az I. csoport kész (105–111.), a
bejáró (D102, 112–121.), a Struktúra (122–126.), a Síkidom (127–135.), a Keresés helyi alja (136–138.) és az értesítés-réteg
(139–143.), és a készülék saját értesítése (D103, 144–147.) is. ⭐ Csaba kérésére (2026-10-15) az ALSÓ SÁV: a fő menü és
az infók a prototípus helyén, a csere ideje és az automatikus frissítés a csere után (148–152.); és a kézi próba lelete
nyomán a kifutás (D104, 153.). ⏭️ A ⑦, a kereső-réteg: az alakja eldőlt (D105, 154.), a „végtelen” mércéje is (D106,
155.: a koinó saját határa — és vele a K8, a 144 bites darab-szám); ✅ a 75. mérés (2026-10-16): a D105 alakja kiállja
(a K7 nélkül a gyakori szó fiókja a koinóval nő, vele nem; a K2 (C) kétszer annyi találat); ✅ ② a szó és az index-darab
(156.). ⏭️ ③ a tartás és a hirdetés.

## 5. ⭐ AZ ELÁGAZÁSOK NAPLÓJA — miről ágaztunk le, és miért

*Minden bejegyzés: mikor · miről · mire · miért · hol a részlet. Új elágazás a lista végére.*

1. **2026-09-26 · D71 (iii) V2/V3 (a „van-e mit mondanom" és a továbbadás)** → **leállítva** · mert a
   koino-szintű lenyomatra épült volna, ami nagy koinóban soha nem egyezik (a „végtelen" elv) · a V3
   2026-09-27-én **kérelmekre** újra él (D76), korlátokkal · CLAUDE.md, `eredmenyek.md` 47.
2. **2026-09-27 · a fájl-kérés** → **korlátos lett** (a csere válaszából csak a kérdezett, a randevú
   legfeljebb `KERELEM_KORLAT`) · mert egy társ akármennyi lenyomatot bemondhatott · commit `c00a892`.
3. **2026-09-27 · a tár alakja: „szeletenként egy fájl"** → **egy adatfájl + a mutató (D73)** · mert
   Windowson a teljes betöltés 19,6 s lett volna 0,69 helyett · `eredmenyek.md` 49., D73.
4. **2026-09-27 · a tartomány-lenyomat: az összeadó (Negentropy)** → **hash (D74)** · mert az
   összeget egy sok eseményt aláíró fél ütköztetni tudná (Wagner) · D74.
5. **2026-09-27 · a csere: szerzőnkénti ÁLLÁS** → **szeletenkénti tartomány-egyeztetés** · 160 KB →
   ~10 KB egy eltérésért · `eredmenyek.md` 50–51. ⚠️ A régi ÁLLÁS-logika (`csere.js`) a próbák
   mércéjeként maradt — ⏸️ kivehető.
6. **2026-09-27 · a gyerek-bejelentés: az áthelyezés** → **csak a születés hangzik el a szülőnél** ·
   az egyezménnyel áthelyezett gyerek az új szülő körében még nem · ⏸️ szeletelési terv 4.5.
7. **2026-09-27 · az első találkozás nagy koinónál** → **egy üzenetben megy** (a kulcs-lista
   legfeljebb ~180 000) · ⏸️ ennél nagyobbnál részletekben kell · `vonal.js` `KULCS_KORLAT`.
8. **2026-09-27 · a (b) előtt a D14-gond** („0 pontos entitás nem létezik" — a nem tartott gyerek
   eltűnne) → **a két tár (D75)**: a D14 csak a tartósra vonatkozik · D75.
9. **2026-09-27 · az össz-pont hitelessége** → **tájékoztatás most, a Merkle-fa (A) teszi
   ellenőrizhetővé** — ⭐ Csaba: az alappillért nem halasztjuk · D76, e dokumentum A.
10. **2026-09-27 · a pakli-nézet a felületen** → **a kérelmezés első köre CSAK a pakli** (a
    hierarchikus elrendezés, össz-pont) · a saját pont / idő szerinti rendezés és a síkidom/térkép
    nézet később · D76.
11. **2026-09-27 · a telefon** → **a tiszta törés óta nem tud cserélni**, amíg nem frissül · CLAUDE.md.
12. **2026-09-27 este · a kapu: bármilyen szöveg mint `entitas` / születés-`szulo`** → **csak azonosító
    alakú vagy null (D77)** · mert a szeletenkénti csere ezeket szelet-kulcsként mondja ki, és egy
    kapun átjutott `"x"` a társsal folytatott minden cserét megakasztotta (az átnézés mérte). Elsőként
    a csere szűrt; ⭐ Csaba döntésével a szabály a KAPUBA került, a csere-oldali szűrő kikerült (egy
    szabály, egy helyen) · D77, `esemenyProba.js`, `csereProba.js` („KI NEM MONDHATÓ”).
13. **2026-09-27 este · a Merkle-fa: EGY fa mindenre** → **két elrendezés, egy csomópont (D78)** · mert
    a kiosztott összeg nem az események összege (a tudatpont átrendezhető, az utolsó nyer) — a
    napló-fa a történetre, az állapot-fa a mostani állásra felel · D78.
14. **2026-09-27 este · a gyökér horgonya: a tartók aláírása** → **csak a szerző ír alá; minden más
    számított, az össz-pont szúrópróbával** (D78) · mert a tartó olcsó azonosság (11–12. mérés: a
    szám árcédula), és az össz-pont nem dönt, csak sorrendet ad · D78.
15. **2026-09-27 este · a lánc-gyökér helye: a tartós mag (SK14)** → **az esemény** (D78) · mert a
    mag állandóan változóvá válna (D14: „legyen minél kisebb") · D78, skálázási terv SK14.
16. **2026-09-27 este · a teljes kiosztás-lista ellenőrzése: mindig / gyanúra** → **szúrópróba, 5%
    (D79)** · mert a „mindig" túl drága, a „gyanúra" a csalót nem fogja meg · D79.
17. **2026-09-27 este · a bizonyíték helye: csak aki megtalálta** → **esemény a vádolt azonosság-szeletébe
    (D80)** · mert különben a gépek másképp számolnának (D17) · D80.
18. **2026-09-27 este · az ellentmondás-keresés a teljes láncból** → **kivéve, építés közben** · mert
    a folytonosság bizonyítékához a szerző HAMIS előképe kell, ami a láncból nem számolható — csak a
    szerző adhatja ki · `ellentmondas.js` vége.
19. **2026-09-27 este · a kettős lánc napló-alapú bizonyítéka** → **nem most** · mert az elágazás ma
    szándékosan nem büntet (két offline készülék ártatlanul is elágaztat), a következménye döntés · D80.
20. **2026-09-27 este · a bizonyíték útja: kérésre a szerzőtől** → **az eseménnyel utazik (D81)** · mert
    kérésre a csaló egyszerűen hallgathat, és a hallgatás „nem ellenőrizhető" (a pontja számít) · D81.
21. **2026-09-27 este · a `lancGyoker` alakja: a két gyökér lenyomata (43 jel)** → **maga a két gyökér**
    · mert így az előkép az aláírt eseményben utazik (nem választható le), és nem kell új mező (egy alak
    marad, a régi események érvényesek) · D81, 53. mérés.
22. **2026-09-27 este · a kettős lánc következménye: büntetés** → **nem büntet, a két ágat egy helyre
    hozza (D82)** · mert két offline készülék ártatlanul is elágaztat · D82.
23. **2026-09-27 este · az elágazás kezelése: a vesztes ág kihagyása** → **a bizonyíték eseményeinek
    bevétele a kapun** · mert akinél csak a vesztes volt meg, a nyertest nem ismerte — a villa előtti
    állapotot számolta (próba mérte) · D82, `esemenyTar.js`.
24. **2026-09-27 este · a D79 szúrópróba és a napló-alapú észlelés** → **a D pillér (kérelmezés) után**
    · mert mindkettő kérés–válasz, és egy alkalmi üzenet a D-t előzné meg · D82.
25. **2026-10-01 · a szigorú (b) bekapcsolása a B-vel együtt** (a D72 szövege: „nem köztes állapot")
    → **a D és az E után; addig KÖZTES ÁLLAPOT, NEM VÉGLEGES** · mert előtte az új készülékek indulása és a
    tagság ellenőrzése elakadna; ⚠️ addig a készülék mindent tárol (a „végtelen" próbáját ez a szakasz
    nem állja ki) · D83/4. ⛔ **Visszavonva — lásd 26.**
26. **2026-10-01 · a köztes állapot (D83/4)** → **visszavonva: nincs köztes állapot**; a szigorú (b) a B
    végleges alakja, az előfeltételei (G, D, E) elé kerülnek, és ezért a sorrend átrendeződik (4.) ·
    mert Csaba szerint „csak bezavarna" — és: „ha ezért fel kell rugnunk, az eredti fejlesztési
    sorrendet, akkor rugjuk fel" · D84/3.
27. **2026-10-01 · a kiszolgálás korlátja: minden szeletre („csak a tudatpontosat")** → **csak a
    törzsre**; az eseményeket kiszolgálja, akinél megvannak · mert szó szerint ez már maga a szigorú (b)
    lett volna (egy szelet csak a tartóitól mozdul) · D84/1.
28. **2026-10-01 · „mi kinél van": helyi címjegyzék, a skálázási terv későbbi rétege** → **alappillér
    (G)** · mert a szigorú (b) mellett a kérelmezés (D) enélkül nem tudja, kitől kérjen, és Csaba szerint
    ezt „több helyen kell tárolni" · D84/2, e dokumentum G.
29. **2026-10-02 · a javaslat két szeletben** (a létrehozás és a szavazatok az első érintettnél, a rá tett
    pont és az állásfoglalás a saját azonosítója alatt) → **a saját szeletében, mindenestül; a döntés
    bemenete bejelentésként minden érintettnél** · mert a szigorú (b) alatt a második érintett tartói nem
    látták volna, hogy róluk döntenek, és a gondolat nem szavazó tartói nem tudnák kiszámolni a gondolatuk
    állapotát (D17) · D85/1, D85/3.
30. **2026-10-02 · a szavazati jog: pont az érintett gondolaton** → **ÉS a javaslaton is** (Csaba) · mert
    így a szavazók tudatponttal tartják a javaslatot, külön vállalási szabály nélkül · D85/2.
31. **2026-10-02 · az egyezmény: a döntés kiszámolt mezője** → **entitás: ugyanaz, mint a javaslat, új
    fázisban** · mert Csaba szerint ugyanolyan entitásnak kell lennie, és így a javaslat pontjai rajta
    maradnak (különben a D14 a születésekor elfelejtené) · D85/4.
32. **2026-10-02 · a töredékek: számított részek egy javaslaton belül** → **számított entitások, a saját
    érintettjük gyerekei** · mert több gondolat gyermekeként is meg kell jelenniük (Csaba, a prototípus
    `toredekCsoportId`-ja szerint) · D85/5–6.
33. **2026-10-02 · a tartós tár: „a saját eseményeim szeletei"** → **a tudatpontos szeletek + a saját
    azonosság-szeletem; a máshová írt saját eseményeim eseményként** · mert szó szerint a visszavett pontú
    szelet soha nem kerülne át az átmenetibe · D86.
34. **2026-10-02 · a kérelem válasza a továbbítón** → **átengedi, nem tartja meg; a kérdezőt nem ismeri** ·
    mert a törzset alapból csak a vállaló adja ki (D84/1), és Csaba szerint ha nem bonyolult, a közvetítő
    ne tudja, ki kérdez · D87.
35. **2026-10-02 · a név a Profil eseményben** → **sózott lenyomat; a név törölhető darab** · mert az
    eseményt nem lehet törölni, és a D6 szerint a láncra csak kriptográfiai bizonyíték kerülhet · D88.
36. **2026-10-02 · a csere: titkosítatlan, tagság-kérdés nélkül** → **titkosított; a koinó a létrehozásakor
    zárt vagy nyílt** · mert az úton minden olvasható volt, és aki a koinó azonosítóját ismerte, mindent
    letölthetett · D89.
37. **2026-10-02 · a sor: B/1 elsőként** → **előbb a D85 (az entitás-modell), aztán a titkosítás (D89/1),
    utána a B** · mert a D85 megváltoztatja, melyik esemény melyik szeletbe kerül (a B erre épül), és a
    két protokoll-változás egy törésbe fér (a telefon egyszer frissül) · e dokumentum 4.
38. **2026-10-03 · a szelet-kérés (`hozd`) kiszolgálója: a szelet saját eseményei** → **a csere halmaza**
    (a saját események + a hozzá bejelentettek) · mert a D85/1 óta a javaslatok és a szavazatok a saját
    szeletükben élnek, így egy gondolat elkérése nélkülük jött volna; a viselkedési próba mérte (a modul-
    szintű próbák zöldek voltak) · `vonal.js`, `csereProba.js` „D85: a javaslat és a szavazat”.
39. **2026-10-03 · a szavazat bejelentése: a bizonyíték minden kulcsánál** → **csak a lánc-gyökeres
    szavazatnál** · mert a kapu csak akkor ellenőrzi a bizonyítékot; gyökér nélkül bármennyi, bármilyen
    szeletbe be lehetett volna jelenteni egy szavazatot · `esemeny.js`: `bejelentesHelyei`.
40. **2026-10-03 · a több érintettes döntés a szeletelt világban (T3): ellenőrizhető összegzés (b)** →
    **a valódi adat (a), döntési csomagban (a2)** · mert az összegzés teljességéért senki nem kezeskedhet
    (szerző nincs, a tartó olcsó azonosság), és Csaba nem akar átmeneti megoldást — az (a) teljes és végleges;
    az (a1)-et (a csere számol határidőt) elvetettük, mert a csere réteget a döntéshez kötné · D85 T3.
41. **2026-10-03 · a döntési csomag útja: minden érintett szeletébe (A)** → **a töredék szeletébe, és a nem
    szavazó tartó csak akkor kéri el, ha a saját része igent mondott (B)** · mert az (A) erősítés volt (a kis
    gondolat tartóira a nagy teljes bemenete — 10 000 tulajdonosnál ~26 MB —, egy pont árán, ismételhetően), és
    a terhet a nagy gondolat méretéhez kötötte (a „végtelen” ellen); a (B)-ben csak az kapja, aki részt vesz,
    vagy akinek a közössége igent mondott — és ha nem mondott, az ÉS miatt a gondolata nem változhatott, ezt a
    saját adatából tudja. A csere réteg továbbra sem számol döntést: az elkérést a készülék indítja, mint a
    `hozd`-ot · Csaba, 2026-10-03 · `eredmenyek.md` 55., D85 T3.
42. **2026-10-03 · a javaslattevő jogosultsága a lánc-bejárásból** → **a javaslat hozza a bizonyítékát
    (érintettenként, a saját kiosztás-fájából — a T2 mintája)** · mert a csak-G1-tartónál a javaslattevő lánca
    hézagos (a G2-es pontja a G2 szeletében van), és a bejárás a hiányt „nincs”-nek olvasta volna — a
    javaslat tévesen kiesett volna; a lánc-gyökeres javaslatnál CSAK a bizonyíték dönt, a régi marad a
    bejárásnál · ára érintettenként +0,5–1,2 KB (`eredmenyek.md` 56.) · `lancGyoker.js`:
    `hozottBizonyitekokOnbizonyitasa`, `szabalyok.js`: `hozottSajatPontok`.
43. **2026-10-03 · a döntési csomag tartalma: a tárba bontva** → **a számítás bemenetébe bontva, a csomag
    maga marad a tárban** · mert a tárba bontott belső események a G2 szeletének egy darabját tennék a
    G1-tartóhoz — a csere ezt a szeletet hirdetné, és az egész G2-t áthozná (épp az, amit a (B) elkerül) ·
    `dontesiCsomag.js`: `csomagokKibontasa`, `allapotSzamitas.js`.
44. **2026-10-03 · a döntés ismerete és a töredék-részvétel most** → **a B/1-be és a B/3-ba** · mert
    mindkettő a részvételtől függ (melyik szeletet vállalom), az pedig a B/1-ben születik; a mai csere
    minden szeletben részt vesz, így ma nincs részleges tudás, csak a kézi úton · a VÉGLEGES SOR 3. és 7.
    pontja.
45. **2026-10-03 · a csere titkosítása: a két állandó tábla-kulcsból, „küldés nélkül” (D89/1)** → **egyszeri
    kulcs minden munkánál + az állandó a hitelesítéshez** · mert az állandókból számolt titoknál egy később
    ellopott kulcs a teljes rögzített múltat kinyitná; az egyszeri kulcs kb. 64 bájtba kerül, és a
    tábla-kulcs így titkosítva utazhat · Csaba, 2026-10-03 · D89 pontosítás.
46. **2026-10-03 · a kézfogás formája: külön, JSON-os üzenetváltás két lépésben** → **egy 33 bájtos bináris
    csomag irányonként, a hitelesítés (a tábla-kulcs aláírása) a már menő `CIMEK`-ben** · mert az 57. mérés
    szerint a külön kézfogás 692 B lett volna munkánként, egy gépen belüli „nincs újdonság” csere pedig 484 B;
    az egyszeri kulcs nem a kopogásban utazik, mert a kapu „cím:port” szerint könyvel, a mobil NAT portot vált
    · `titkositas.js`, `udpVonal.js`: `kezfogasUdpResen`, `eredmenyek.md` 57.
47. **2026-10-03 · a döntés ismerete a VÁLLALÁSBÓL (a ③ terve)** → **TARTALMI jel: egy rész ismert, ha az
    érintettjének legalább egy pont-eseménye a bemenetben van (a tárból vagy egy döntési csomagból)** · mert a
    vállalás-alapú jelnél ugyanazokból az eseményekből két készülék mást számolt volna (a D17 ellen); pont-
    eseményt semmi nem jelent be máshová, tehát ha egy sincs, a szeletet nem láttuk, és a javaslattevő
    pont-eseménye mindig létezik — a jel minden helyzetben (mai csere, szigorú (b), kézi út) működik ·
    `javaslatSzamitas.js`: `ismeretlenReszek`, a `nemIsmert` státusz.
48. **2026-10-03 · a gyökér tartása (D90)** → **a G dolga, nem vállalás** · Csaba: „legyen a (B)” — az (A)
    terhe a koinó méretével nőne; a gyökér semmiről nem dönt, csak a megtalálást segíti · D90.
49. **2026-10-03 · a vállalttá vált átmeneti szelet: az átmenetiben marad** → **ELŐLÉP a tartós tárba** (ugyanazon
    a kapun, minden parancs indulásakor és az őrjárat körében) · mert különben a vállalt szelet teste az
    eldobható tárban maradna, és a korlát miatt kieshetne · `koino.js`: `atmenetiElolepetese`. ⚠️ A fordítottja
    (a visszavett pontú szelet a tartósból az átmenetibe — D75/1) a B/3-mal jön: a mai csere úgyis mindent a
    tartósba hoz.
50. **2026-10-03 · az átmeneti tár alakja: egy hozzáfűzhető fájl (mint a tartós)** → **szeletenként egy fájl** ·
    mert az eldobás így egy fájl törlése (a hozzáfűzhető fájlból törölni csak újraírással lehetne), és a tár
    korlátos — a 49. mérés ellenérve (100 000 eseménynél lassú a sok fájl) itt nem áll · `atmenetiTar.js`.
51. **2026-10-03 · a G közege: szeletenkénti hirdetés egy DHT-n (a skálázási terv 5.3 A/B)** → **a fa és a raj a fő út,
    a hash-elhelyezés csak a gyökérre és a közvetlen keresésre, most a BitTorrent-DHT-n vakított témával** · mert egy
    DHT-művelet ~50 kérdés ≈ 5–10 KB (mérve), a szeletenkénti gyakori hirdetés a 6. szabályt sértené; a fa a cserén
    belül marad (zárt koinó), és a terhe a vállalással arányos · Csaba, 2026-10-03 · D91, `g_cimjegyzek_atvizsgalas.md`.
52. **2026-10-03 · a DHT-n mindenki hirdeti a vállalt szeleteit** → **mindenki csak a gyökér-darabját; a szeletet csak
    készülékenkénti beállítással (alapból 0)** · mert a háló 30–60 perc alatt felejt (58. mérés): 100 szelet egy
    telefonon ~65 MB/nap volna, a gyökér-darab egy téma (~0,65 MB/nap); a szeletek fő útja úgyis a raj · Csaba,
    2026-10-03 · D91/3, `cimjegyzek.js`.
53. **2026-10-03 · a kérelem fő útja a továbbadás a kötés-hálón (D76/4, D87)** → **a kopogtatás (randevú a DHT-n a tartó
    kopogtató témáján, a buliban mindkét fél kopog); a továbbadás kiegészítő, 2–3 ugrásig** · mert a 60. mérés szerint
    az elárasztás K = 3 kötés mellett nagy koinóban szinte semmit nem ad, a rés nyitása viszont 20% → 76% · Csaba,
    2026-10-03 · D92/1, `d_kerelmezes_atvizsgalas.md`.
54. **2026-10-03 · a pakli első betöltése egyetlen összetett válasz (D76/2)** → **nézet-független alapkérdések
    (fejlécek, szelet, törzs)** · mert a válaszolónak így nem kell az egész utat tartania (a szeletelt világban nem is
    tartja), és a síkidom, a térkép ugyanazt használja · Csaba, 2026-10-03 · D92/6.
55. **2026-10-03 · a kopogtató téma a tartó KÉSZÜLÉKÉÉ (D92/1, a tábla-aláírójából)** → **a készüléké ÉS minden hirdetett
    téma párja** (a gyökér-darabé, a beállítás szerinti szeleteké) · mert a DHT hirdetője csak címmel ismert — egy új
    készülék, ami a gyökérrel kezd, egyetlen tartó azonosítóját sem tudja; a pár ára témánként ~3 KB / 20 perc · a
    megépítéskor, Claude (a D92/1 keretén belül) · `cimjegyzek.js`, `fuggoKerelmek.js`.
56. **2026-10-03 · minden fejléc szúrópróbával ellenőrzött (D92/5)** → **a továbbadott fejléc össz-pontja bemondás** (a
    létrehozó események aláírása ott is ellenőrzött) · mert a szúrópróba interaktív (a kérdező a gyökerek bemondása UTÁN
    választ — különben a tartó addig próbálkozna, amíg a minták el nem kerülik a hamis leveleket), a továbbadás pedig
    nem élő kapcsolat; a nézet a közvetlen válaszok közül a „legnagyobb ellenőrzöttet” veszi · a megépítéskor, Claude ·
    `koino.js` (`valaszFogadasa`).
57. **2026-10-04 · a személy minden kézfogásban (D93/3: „a társ a személyes kulcsával is aláírja a kézfogás átiratát és
    megnevezi a horgonyát”)** → **csak ha a kapu nem ismeri a társat** · a tábla-kulcs a nyitásba került (korábban a
    CIMEK-ben volt), a kapu ebből (a tábla-kulcshoz megjegyzett személyből — `azonossagok.json`, helyi, korlátos) dönt, és
    ha nem ismeri, a CIMEK-ben kér; a bizonyítás (a személyes aláírás + a tagsági csomag) egy külön körben jön · mert
    minden cserén ~0,4 KB volna (a „nincs újdonság” csere ~20%-a — 6. szabály), a tábla-kulcs pedig a kézfogásban már
    hitelesített (az első találkozáskor a kettőt ugyanaz az átirat köti össze) · a megépítéskor, Claude (a D93/3 keretén
    belül) · `vonal.js`, `koino.js` (`tarsKapuja`), 64. mérés.
58. **2026-10-04 · a nem tagnak „csak a koinó születése és a SAJÁT azonosság-szelete jár” (D93/3)** → **és a MIÉNK is** ·
    mert a belépéshez a két fél azonosság-szelete kell (a meghívás az övébe kerül, a meghívó lánca az enyémben van), és a
    láncunkat a bizonyításhoz úgyis odaadjuk (a tagsági csomagban) · a megépítéskor, Claude · `koino.js` (`tarsKapuja`).
59. **2026-10-04 · a zárt koinó kapuja a koinó minden ismerőjénél** → **csak ott, ahol a koinó születése ismert** (ahol nem,
    nincs kapu) · mert egy tag mindig ismeri (a lánca végén van); aki nem, az vagy még nem tag (a saját belépésén kívül
    nincs mit adnia), vagy egy születés nélküli, régi koinót tart, amit utólag nem zárhatunk be úgy, hogy senki ne kapjon
    belőle — az „alapból zárt” (D89/2) a létrehozásé · a megépítéskor, Claude · `koino.js` (`tarsKapuja`).
60. **2026-10-04 · a nem tag korlátozása: a szeletek (D93/3)** → **a szeletek, a fájlok ÉS a címek** (a fájl-válasz és a
    randevú nem szolgál ki, a CIMEK csak a saját címünket viszi, DHT-gépet nem) · mert a koinó hálózata (kik vannak benne,
    hol érhetők el) és a fájljai is a koinó tartalma · a megépítéskor, Claude · `vonal.js`, `koino.js`.
61. **2026-10-04 · a 2. lépcső igazolása mindig szúrópróbával (D94)** → **a teljes ellenőrzés, ha belefér egy keretbe
    (1000 esemény-olvasás), és csak azon túl a szúrópróba** · mert a kis koinóban így az ítélet pontos (a csalót biztosan
    elkapja), és a becsületesre a két út ugyanazt mondja; a keret helyi mennyiség (mennyit olvastam), nem a koinó mérete
    — a kis koinó ugyanazt a kódot futtatja · a megépítéskor, Claude (a D94 keretén belül) · `identitas.js` (`lepcso2E`).
62. **2026-10-04 · a szúrópróba útja a szelet állításai közül sorsol (D94)** → **csak ALÁÍRT BEMONDÁSOKAT követ: a 2.
    lépcsős új `LepcsoBemondas` eseményét (mely tanúsításaira támaszkodik) és a tanúsító felhatalmazás-bemondását (D47);
    minden bemondott tételnek érvényesnek kell lennie, és a tanúsítás csak ellenőrzött 2. lépcsős felhatalmazót mond be**
    · mert a szeletbe bárki tehet állítást: ha az út azok közül sorsolna, egy kulcs-gyűrű a becsületest is elbuktathatná
    (szolgáltatás-megtagadás), ha pedig a bemondás többlete megengedett volna, a csaló hamis tételekkel hígíthatná a
    bemondását · a megépítéskor, Claude · `identitas.js` (`lepcso2Szuroproba`), `muveletek.js` (`lepcsoBemondasKiadasa`).
63. **2026-10-04 · a kontraszt-jelzés bemenete: „kiről állított?” a szerző LÁNCÁBÓL (a D93/6 a tanúsítottak szeleteit és a
    lánc összegzését nevezte meg)** → **az identitás-állítás a szerző saját azonosság-szeletébe is bejelentődik (a D85
    bejelentési mintája), és a jelzés innen olvas** · mert a szeletelt világban a lánc nincs meg egy helyen (az állítások a
    másik ember szeletében élnek), a felhatalmazó viszont a tanúsító szeletét tartja — így egy szelet elég, és a terhe a
    tanúsító tevékenységével arányos; ⚠️ tiszta törés a szelet-halmazban (a telefon úgyis frissül) · a megépítéskor, Claude
    (a D93/6 keretén belül) · `esemeny.js` (`bejelentesHelyei`), `jelzesek.js`, `atmenetiTar.js` (a két tár nézete a
    szeletet és a bejelentéseket is mindkét tárból adja).
64. **2026-10-05 · a nagy szelet döntése: a lezárási összegzés csak ott, ahol az érintett egyetlen pont-eseményét sem látjuk
    (a D95/1 (b) első alakja)** → **ahol az összegezve tartott szeletre ellenőrzött összegzés van, az dönt** · mert az összegző
    tartó a saját pont-eseményét mindig tartja: az első alak nála soha nem érvényesült volna, és a nevezőt a részleges
    bemenetből számolta volna (a parancssor-próba mérte; a modul-próba nézete minden pont-eseményt kivett, ezért nem fogta
    meg) · a megépítéskor, Claude (a D95/1 keretén belül) · `javaslatSzamitas.js` (`reszOsszegzese`), `koino.js`
    (`ellenorzottOsszegzesek`: csak a most összegzett szeletekéi), `lezarasiOsszegzesProba.js`.
65. **2026-10-05 · az összegző és a küldő lista a CIMEK-ben (a B1 terve)** → **ÉS a bizonyítás utáni CIM-pótlásban** · mert
    első találkozáskor a zárt koinó kapuja a CIMEK idején még nem döntött (a lista csak tagnak megy), és a lépés a második
    cserére csúszott volna; külön kör nélkül · a megépítéskor, Claude · `vonal.js` (`sajatListak`).
66. **2026-10-05 · az összegezve tartott szelet össz-pontja (a B1 terve: „a D14, az össz-pont, a pakli”)** → **a tárolt,
    ellenőrzött gyökér `osszegzett` jelű bemondásként, az egész részfát fedve; a saját pontom megmarad** · mert a részleges
    bemenetből (a saját pontom) az össz-pont hamisan kicsi volna, a jel nélküli bemondás pedig a tartott entitásnál szándékosan
    nem számít (D92/5) · a megépítéskor, Claude · `osszPont.js`, `koino.js` (`bemondasok`).
67. **2026-10-05 · a minták szerzőinek tagsága az összegző tartónál (D95/1: „a minták szerzőinek tagságával”)** → **ma a kapu
    emlékéből (akit tagnak láttunk); a többi „nem ellenőrizhető” (D19), az összegzést nem veti el** · mert a teljes válasz a
    tagsági csomag a cserében (B2) — az a következő lépés, és a B1 ellenőrzése már kész a bemenetére (`tagE`) · a megépítéskor,
    Claude · `koino.js` (`ketFokBeallitasai`), `lezarasiOsszegzes.js`. ✅ A B2-vel lezárva: a tagság a tárból jön, ami
    hiányzik, az a függők közé kerül, és ugyanannak a cserének a tagsági köre kéri (a 71. bejegyzés).
68. **2026-10-05 · a tagsági kísérő: „a tagsági csomagját a társtól kérem” (D95/2)** → **a csomag, és ha a válaszolónál
    nincs, a tagsági LÁNC (amennyit ő bizonyítani tud)** · mert az alapítónak és a még csomagot ki nem adott tagnak nincs
    csomagja, a láncát viszont a társ a saját tárából (a nála lévő csomagok tartalmából is) összerakhatja; a fogadó ugyanazon
    a kapun veszi át, és csak a kért szerzők csomagját · a megépítéskor, Claude (a D95/2 keretén belül) · `tagsagKisero.js`
    (`tagsagiKiserok`).
69. **2026-10-05 · mikor kérdezünk (D95/2: „a szelet cseréje után”)** → **a cserék végén MINDIG egy kis kör, ha volt eltérés;
    és egyező szeleteknél is, ha bármelyik félnek FÜGGŐ kérdése van (a nyitás `tk` jele)** · mert a szigorú (b) alatt a
    csomag a társnál épp a nem egyeztetett szeletben (a szerző azonosság-szeletében) van, tehát a szeletek egyezése nem
    jelenti, hogy nincs mit kérdezni; a függők jegyzéke korlátos és lejár (256 szerző, 6 óra, 30 kérdezés), hogy egy soha ki
    nem derülő tagság ne drágítsa örökké a cserét; mérve: egy eltérő cserén +0,3 KB, a „nincs újdonság” változatlan · a megépítéskor, Claude · `vonal.js` (`tagsagKor`), `tagsagKisero.js`
    (`tagsagKerdo`), `fajlTar.js` (`tagsagFuggoTarolo`).
70. **2026-10-05 · a kézi út (4. szabály) a tagsági kísérőkhöz** → **a `kivisz <entitás>` a döntési események szerzőinek
    kísérőit is viszi** · mert különben egy fájlba vitt gondolat a túloldalon a szerzői pontjai nélkül számolódna (D93/1) — a
    csere párja · a megépítéskor, Claude · `fajlCsere.js` (`kivitelSzovege`, `kiserok`), `koino.js`.
71. **2026-10-05 · a B1 mintáinak szerzői (a 67. bejegyzés)** → **a tagság a tárból (`tagsagKerdo.tagE`), és ami nem derül
    ki, a függők közé — ugyanannak a cserének a tagsági köre kéri** · mert az összegzés lépése a szelet-csere előtt fut,
    a tagsági kör utána: a minta szerzőjének csomagja így ugyanabban a cserében megérkezik (a következő ellenőrzésre) · a
    megépítéskor, Claude · `koino.js` (`ketFokBeallitasai`).
72. **2026-10-05 · a csak küldő felajánlás (D95/3: „a cserében csak a sajátjaimat küldöm”)** → **csak a még nem
    KÉZBESÍTETT és friss (14 napnál fiatalabb) saját eseményeim; a fogadó a „megvan”-t is visszamondja** · mert ha minden
    saját eseményemet minden cserén felajánlanám, egy régi tag felajánlása (pl. több száz meghívás) minden „nincs újdonság”
    cserét drágítana; egy tartó elég, mert a tartók egymás közt egyeztetnek, és én is megtartom (D86/2) · a megépítéskor,
    Claude (a D95/3 keretén belül) · `osszegzoTartas.js` (`sajatKuldo`, `kuldoFogado`), `vonal.js`, `fajlTar.js`
    (`kezbesitesTarolo`), `koino.js` (`kezbesitesFeljegyzese`).
73. **2026-10-05 · a csak küldő felajánlás a zárt koinó nem tagjának (az E3 csak a születést és a két azonosság-szeletet
    adja)** → **a felajánlás neki is megy, de csak a megengedett szeletekben** · mert a meghívás épp a meghívott (még nem
    tag) azonosság-szeletébe kerül: a szigorú (b) alatt a meghívó ezt a szeletet nem egyezteti, tehát enélkül a meghívás
    nem jutna el · a megépítéskor, Claude · `vonal.js` (`sajatListak`).
74. **2026-10-06 · a gyökér-darab kulcsa (D95/4: „a mélység és a darab lenyomata”)** → **felismerhető, visszafejthető kulcs
    (34 nulla, `g`, a mélység és a darab hexában)** · mert így bárki kiszámolja a halmazát a kulcsból (nem kell nyilvántartás
    a lehetséges darabokról), és egyetlen esemény-azonosító sem lehet ilyen (egy lenyomat nem kezdődik 34 nullával) · a
    megépítéskor, Claude (a D95/4 keretén belül) · `cimjegyzek.js` (`gyokerDarabKulcsa`, `gyokerDarabBol`).
75. **2026-10-06 · a darabok a cserében (D95/4: „a darab szeletként cserélődik”)** → **nem a nyitó lenyomatban, hanem a NYITÁS
    tömör jelében (`gyd`: a mélység és a darabok 11 jeles lenyomata); csak a legsekélyebb KÖZÖS eltérő darab egyeztetődik** ·
    mert két különböző darabú készülék nyitó lenyomata így soha nem egyezne, és minden „nincs újdonság” csere végigfutná az
    első szintet (több KB); a darabok egymásba ágyazottak, tehát a legsekélyebb közös egyezése a mélyebbekét is jelenti;
    mérve +76–100 B egy „nincs újdonság” cserén (a tömörítetlen alak +136–178 B volt) · a megépítéskor, Claude · `vonal.js`.
76. **2026-10-06 · a gyökér mélysége (D91/3: a legfelső szintű gondolatok számából, a teljes állapotból)** → **a SAJÁT
    darabból becsülve (minden mélységen a darabomban ismert születések × 2^mélység, ezek maximuma), egy forrásként a
    cserének és a DHT-hirdetésnek** · mert a szigorú (b) alatt senki nem látja az egész gyökeret — a régi számolás a saját
    darabot mutatná, és a készülék mást hirdetne, mint amiben részt vesz · a megépítéskor, Claude · `cimjegyzek.js`
    (`gyokerMelysegBecslese`), `koino.js` (`gyokerMelysegem`).
77. **2026-10-06 · az új legfelső szintű gondolat születése (a B4 (B) kérdése: „csak a szerzőjénél van meg, amíg valaki nem
    kérdez”)** → **a csak küldő úton a darab-kulcsa alatt is felajánlódik, ha nem a saját darabomba esik** · mert a szerző
    nem feltétlenül tartója annak a darabnak, ahová a születése esik · a megépítéskor, Claude · `osszegzoTartas.js`
    (`sajatKuldo` `kulcsai`), `koino.js` (`kuldoKulcsai`).
78. **2026-10-08 · a közös halmaz jele (D97/1: „a NYITÁS a változatokat viszi”)** → **a NYITÁS csak a saját változatomat
    (`pv`), a CÍMEK a többit (`kz`: amit a társ halmazából ismerek, és a közös lenyomat eleje)** · mert a társat (a
    tábla-aláíróját) a NYITÁS-ból tudom meg — előtte nem tudom, kinek a halmazát kell elővennem; a közös lenyomatból 11 jel
    elég (66 bit; ha eltér, a teljes egyeztetés úgyis a részekre bontással indul) · a megépítéskor, Claude (a D97/1 keretén
    belül) · `vonal.js`.
79. **2026-10-08 · a közös halmaz a zárt koinó nem tagjánál** → **nincs (`x`): a régi, korlátozott menet fut, és a nem tag
    NEM kapja meg a tag halmazának ujjlenyomatait** · mert az a tag érdeklődését mutatná meg egy nem tagnak (a korlátozott
    egyeztetés amúgy is csak a megengedett szeleteken fut — a próba szerint az `x` nélkül is helyes volna, de szivárogna) ·
    a megépítéskor, Claude · `vonal.js`, `kozosHalmazProba.js`.
80. **2026-10-08 · a közös halmazon a nyitó lenyomat** → **a nyitásbeli (teljes részvételi) lenyomat marad a kiindulás, külön
    közös nyitó üzenet nincs** · mert a tartomány-egyeztetés az eltérő kezdő lenyomatot „eltér” jelnek veszi, és a részekre
    bontással helyesen halad (a rontás-próba szerint a külön üzenet semmit nem adott hozzá — kivettük) · a megépítéskor,
    Claude · `vonal.js`.
81. **2026-10-08 · a koinó születése mint esemény (D96: „az eseményt mindenki tartja”)** → **egy virtuális kulcs a vonalon,
    amelynek halmaza egyedül a `KoinoLetrehozas`, és mindenki részt vesz benne** · mert a koinó azonosítója egy név, nem a
    létrehozás lenyomata — a társ nem tudja előre, melyik eseményt kérje; a pár a párok közt csak akkor utazik, ha
    valakinél hiányzik · a megépítéskor, Claude (a D96/D97 keretén belül) · `szeletEgyeztetes.js`
    (`KOINO_SZULETES_KULCS`), `vonal.js`.
82. **2026-10-08 · a zárt koinó korlátozott útja (D93/3: a nem tag a megengedett szeleteket kapja)** → **a megengedett
    szeleteket a tag a saját vállalásától FÜGGETLENÜL egyezteti** · mert a szigorú (b) alatt a tag a nem tag
    azonosság-szeletét nem vállalja — a belépés (a belépés és a meghívás egymáshoz jutása) különben elakadna · a
    megépítéskor, Claude · `vonal.js`.
83. **2026-10-08 · a saját tagságom a kísérőkből (a D95/2 a szerzők tagságát kérdezte)** → **ha meghívtak, de a láncomat
    nem tudom bizonyítani, magamat is kérdezem** · mert a szigorú (b) alatt a friss tag a meghívója azonosság-szeletét nem
    egyezteti, a láncát viszont a meghívója a saját tárából összerakja · a megépítéskor, Claude · `tagsagKisero.js`
    (`sajatSzerzo`).
84. **2026-10-08 · a parancssor-próbák a bekapcsolás után** → **alapból „mindent” módban (a környezetből —
    `KOINO_KISZOLGALAS`; a készülék saját beállítása felülírja), a szigorú esetek kifejezetten „alap”-pal** · mert a
    meglévő próbák nagy része más funkciót mér, és arra épül, hogy a csere mindent mindenkihez eljuttat; a „mindent” a
    D83/2 valódi beállítása (az önkéntes teljes tartó), nem próba-kapcsoló · a megépítéskor, Claude · `koino.js`
    (`kiszolgalasBeallitas`), `parancssorProba.js`.
85. **2026-10-09 · a raj-társ választása (D97/2: „akik a legtöbb vállalt szeletemet tartják, forgatva”)** → **előbb a
    VÁLTOZOTT szeleteim tartói, sorban (változásonként mindegyik egyszer), aztán a forgatás — a tartók SORBAN, nem átfedés
    szerint** · mert a 69. mérés szerint az átfedés szerinti választás szeletenként mindig ugyanazt a tartót adja, és a
    tartók gráfja szétesik (a változások 4–6%-a soha nem ér körbe), a „változott előre” viszont járványszerűen terjed (R = 2:
    medián 1, 99%-ban 9 kör) — egy csere a két fél összes közös szeletét szinkronba hozza (D97/1) · a megépítéskor, Claude
    (a mérés alapján, a D97/2 keretén belül; Csabának jelezve) · `rajKor.js`, `koino.js` (`rajKorCeljaim`), 69. mérés.
86. **2026-10-09 · a visszavett vállalás (D75/1: „az átmenetibe kerül”) és a tár ritka újraírása (D73)** → **tömörítés: a
    tartós tár újraírása (csak az író), a kivettek az átmeneti tárba; a többi folyamat egy generáció-jelből tudja meg,
    hogy újra kell építenie a mutatóját; az összegzett szeletből csak az ellenőrzött gyökér után; naponta egyszer** · mert
    a többi folyamat mutatója eltolásokkal dolgozik (átírás után másra mutatna), és az ellenőrzött gyökér nélkül a két fokú
    vállalás mérete leesne — a szelet teljesre váltana, és a csere mindent visszahozna (billegés) · a megépítéskor, Claude
    · `fajlTar.js` (`ujrairas`, `generacio.json`), `iro.js` (`tomorites`), `koino.js` (`tomoritesSzabalya`).
87. **2026-10-09 · a kérelem kísérői (a B2 párja a `hozd`-nál)** → **a szelet-kérelemre a döntési események szerzőinek
    tagsági kísérői is mennek — a nem tag (zárt koinó) kérőnek nem** · mert az átmeneti nézetben a szerzők pontja különben
    „függőben” maradna; a nem tagnak a harmadik felek láncát nem adjuk ki · a megépítéskor, Claude · `vonal.js`,
    `koino.js` (`kerelemKiszolgaloja`).
88. **2026-10-09 · a társankénti közös alap (D98/1: „a csere végén a közös lenyomat és a tár állása; a NYITÁS a közös
    alapot is bemondja; a végén a közös lenyomat ellenőriz”)** → **nincs közös alap a NYITÁS-ban: mindkét fél a SAJÁT
    feljegyzéséhez képest mondja a változásait, és az ellenőrzés a második szint ELŐTT van — a U-n kívüli párok lenyomata (ha
    eltér, ugyanabban a cserében a rendes első szint fut)** · mert a NYITÁS-kor a társ még ismeretlen (a feljegyzés a
    tábla-aláírója alatt van), egy régebbi feljegyzéshez mért lista csak bővebb (nem hibás), és a „végén ellenőriz” egy
    második menetet kívánt volna ugyanabban a cserében; a kívüli lenyomat ugyanazt a garanciát adja egy lépéssel korábban,
    és mindkét fél ugyanazt a két lenyomatot látja (egyformán dönt) · a megépítéskor, Claude · `tarsEmlekezet.js`, `vonal.js`.
89. **2026-10-09 · a MARADÉK a feljegyzésben** → **a csere végén is eltérő szeletek (ahol valamelyik fél kimaradt) a
    feljegyzésbe kerülnek, és a következő lista része** · mert különben ahol az egyik fél tartósan nem vesz részt (a közös
    halmaz nélküli, „minden” módú társ mellett), a kívüli lenyomat soha nem egyezne, és az F soha nem működne · a megépítéskor
    (próba mérte), Claude · `tarsEmlekezet.js`.
90. **2026-10-09 · ki felel a lánc-körben (D98/2: „aki maga az a szerző, vagy »mindent« módban a teljes láncát tartja”)** →
    **aki a KÉRDEZETT FEJ láncát tartja (a fejtől `elozo` mutatókon visszafelé), vagy ha a fej nincs nála, a szerző egyetlen
    láncát** · mert a két ágú szerző saját készüléke a cserében a másik ág eseményét is megkapja (a G-t mindketten tartják),
    és a saját lánca ettől „elágazik” — a sorszám szerinti egyetlen lánc nem állna elő, és épp a bizonyítékot nem adná ki
    (parancssor-próba mérte); a fej aláírása a láncát úgyis elköti · a megépítéskor, Claude · `lancEllenorzes.js`.
91. **2026-10-09 · az új fejnél a RÉGI ellenőrzött fej is kérdés (a következetesség mellett)** → **a régi fej az első tétel**
    · mert a következetesség hiánya csak jelez (a szerző hallgathat), a régi fej helyén álló MÁSIK esemény viszont azonnal
    bizonyíték — egy fejváltásonként ~1 KB-ért · a megépítéskor (próba mérte), Claude · `lancEllenorzes.js`.
92. **2026-10-09 · mikor fut a lánc-kör (A2: „minden cserében a szerzővel, ha új eseménye jött”)** → **a szelet-csere végén,
    minden cserében, ami nem ért véget a nyitásnál (⛔ NEM „ha volt mit cserélni”: az eltérő szeletek száma a zárt koinó
    korlátozott útján a két félnél eltér — a csere megakadt, a teljes próbasor mérte), a társ bemondott szerzői kulcsa és a
    most kapott események szerzői közül legfeljebb 3-ról** · mert a vonalnak mindkét félnél ugyanúgy kell döntenie, a
    „nincs újdonság” csere ne dráguljon, és a szerző saját eseményeit jellemzően ő maga hozza; a társ kulcsa (`en`) bemondás, nem bizalom (a
    válasz úgyis önmagát igazolja) · a megépítéskor, Claude · `vonal.js`, `koino.js` (`lancKerdeseim`).
93. **2026-10-09 · a hallgatás a lánc-körben** → **nincs „megtagadta” állapot, csak FÜGGŐBEN (mióta)** · mert a kérdezett
    társról nem tudni biztosan, hogy ő-e a szerző (a bemondott kulcs nem hitelesített) — egy hamis bemondó hallgatása
    különben becsületes szerzőt bélyegezne meg (D19) · a megépítéskor, Claude · `lancEllenorzes.js`.
94. **2026-10-09 · a D14 a szigorú (b) alatt (D75/4: „a D14 csak a tartós tárra”)** → **a D14 csak a TARTOTT (vállalt)
    szeletre ítél; amit nem tartok, és egyetlen pont-eseményét sem láttam, az „pontjai ismeretlenek” jelzéssel látszik** ·
    mert terepen (72. mérés) a telefon a laptop új gondolatának csak a születését kapta meg (a gyökér-darabján át, a tartós
    tárba), a D14 eltüntette, és a `pont` sem találta — a szigorú (b) alatt új gondolatot nem lehetett felvenni · a terepi
    mérés után, Claude · `allapotSzamitas.js` (`nemTartott`), `koino.js` (`kepetKeszit` — a vállalásból, nem a részvételből:
    az utóbbi maga is a képet kéri).
95. **2026-10-10 · a néma kötés keresése a táblán (2026-09-20: „akiről egy ablak óta nem hallottunk, azt a tábláról
    keressük”)** → **visszalépő ütem: a hallgatás első 4 körében mindig, aztán a 8., 16., 32., 64., és 64 körönként** · mert
    terepen (72. mérés) a telefon egy rég eltűnt kötést percenként keresett a mobilneten (minden keresés néhány KB DHT); a
    friss leszakadásnál a gyors visszatalálás marad (43. mérés) · a terepi mérés után, Claude · `kotesek.js`
    (`tablanKeresendok`).
96. **2026-10-10 · a bogár elkérése (D100)** → **egyetlen mély fejléc-kérés a bogár ELSŐ bizonytalan pontján (`d` = 4), nem
    szintenként** · mert a kérelem a legjobb ágat `d` szintig hozza (D92/6), és a függők jegyzéke korlátos (16) — egy lap
    ne töltse meg · a megépítéskor, Claude · `pakli.js` (`BOGAR_MELYSEG`).
97. **2026-10-10 · az üres fejléc-lista a kérelemben (D92/1 (c): „ha nem tudja kiszolgálni, de vállalja, ÁTVESZEM”)** →
    **az üres lista csak akkor továbbadás, ha a tartó NEM tartja az entitást; aki tartja, üres listával felel** · mert a
    gyerektelen gondolat fejléc-kérését a tartója továbbadásra vette át, és a kérelem soha nem zárult le (a ház
    parancssor-próbája mérte) · a megépítéskor, Claude · `vonal.js`, `koino.js` (`kerelemKiszolgaloja` — `tartja`).
98. **2026-10-10 · a fejléc-kérelem sikere** → **a kiszolgált ÜRES válasz is siker („megjött: 0 fejléc”); ha jöttek tételek,
    de egy sem ellenőrizhető, nem** · ugyanaz a próba mérte · a megépítéskor, Claude · `koino.js` (`fuggoKerelemMunkaja`).
99. **2026-10-10 · a lap frissessége (D100, H1)** → **amit a kérelem 10 percen belül elhozott, azt a lap nem kéri újra** ·
    mert a nem tartott ág gyerekeit a lekérdezés soha nem tekinti biztosnak — e nélkül a lap minden lekéréskor kérne, és
    örökké „betöltés”-t mutatna · a megépítéskor, Claude · `koino.js` (`lapHianyzoinakElkerese`, `LAP_FRISSESSEG`).
100. **2026-10-10 · a bekopogó és a függő kérelem (D92/1: „ismeretlen bekopogó, miközben kopogtatunk”)** → **csak az a kérelem
    fut a csere helyett, amelynek egy kopogtató témáján az őrjárat TÉNYLEG jelentkezett (`bejelentettKopogtatok`)** · mert a
    lap magától ír be kérelmet, és a régi feltétel (bármely kopogtató témájú kérelem) minden új bekopogót — egy csatlakozó
    készülék kézi cseréjét is — kérelemre fordított, amit az nem tudott kiszolgálni (mérve: a csatlakozó semmit nem kapott); a
    postaláda (`figyel`) nem is kopogtat · a ház bekötésekor, Claude · `koino.js` (`resMunka`), parancssor-próba.
101. **2026-10-10 · az átmeneti tár több folyamatból (B/2)** → **a `frissit` beolvassa, amit más folyamat írt bele vagy dobott ki
    belőle; a `valtozat` jel-fájl dönti el, kell-e végignézni (különben egy olvasás), a félbe írt sort a következő frissítés
    olvassa** · mert a futó felület nem látta, amit az őrjárat a kérelem válaszaként hozott (a böngészős próba mérte), és a
    tartós tár `frissit`-je (43. mérés) mintájára itt is kell · a ház bekötésekor, Claude · `atmenetiTar.js`.
102. **2026-10-10 · hol fordít a lap (H3/A megvalósítása)** → **a `Pakli.js` útvonalait az `apiHelper.js` kérdezi meg a
    `kartyaAdat.js`-től (`prototipusUtvonala`); a `Pakli.js` által nem tárolt rész egy eseménnyel (`koino:pakliValasz`) megy a
    `koinoPakli.js` alosztályhoz** · mert a `Pakli.js` bájtra a prototípusé maradjon (a `pakliLekerese` felülírása a
    gyorsítótár-logikája második példányát szülte volna), és a prototípus teljes szerver-kapcsolata eddig is ezen az egy
    fájlon ment át (a horgony is) · a megépítéskor, Claude · `kartyaAdat.js`, `apiHelper.js`, `koinoPakli.js`.
103. **2026-10-10 · „betöltés” vagy „keresés” a lapon (H1)** → **ha a függő kérelmeknek nincs célja (se társ, se ismert tartó),
    a lap nem betöltést ígér, hanem kimondja, hogy a tartóikat keresi (`kitolKerni`)** · mert egy társ nélküli készüléken a
    gyökér szintje örökké hiányzik, és a „betöltés” soha nem érkezne meg · a böngészős próbán, Claude · `koino.js`,
    `koinoPakli.js`.
104. **2026-10-10 · a „0” a nem látott pontoknál (H2 kiterjesztése)** → **ha a kártya pontjait sem láttuk (csak a születését),
    a saját pont és a hozzájárulók száma is „?”, nem 0** · mert a 0 állítás, a „?” a tudás határa (D19) — a H2 csak az
    össz-pontot nevezte meg · a böngészős próbán, Claude · `pakli.js` (`pontokIsmeretlenek`), `koinoPakli.js`.
105. **2026-10-11 · hol a modálok koinós többlete (D101, M5)** → **a prototípus-osztály egy meglévő metódusa KÖRÉ
    (`koinoModalok.js` `koruleIr`: az eredeti lefut, utána a koinós rész), nem alosztályban** · mert ezeket a modálokat az
    ÖRÖKÖLT kártyák példányosítják (`Kartya.js`), alosztályt nem tehetnénk a helyükbe a kártyához nyúlás nélkül (a pakli
    alosztálya azért lehetett, mert azt a lap példányosítja); a tudás határát a PROGRAM mondja ki (`koinoMegjegyzes`), az
    `apiHelper.js` eseménnyel adja tovább, a lap a lista alá írja · az I. csoport építésekor, Claude · `koinoModalok.js`,
    `apiHelper.js`.
106. **2026-10-11 · „X ága alatt van-e?” (D101)** → **egy helyen (`pakli.js` `agHelyzete`): a felmenő-láncon, legfeljebb 64
    lépés; az entitás maga is az ágához tartozik; ha egy felmenő hiányzik, „nem eldönthető” (null) és a hiányzó megnevezve
    (a hívó a ház útján elkéri); a kör nem szül fát (nem alatta); ha a hiányzó felmenő MAGA az ág, eldönthető** · mert a
    Tudatpontok, a Keresés, a Rendezés helyi módjai és az értesítések mind ezt kérdezik, és a hiány nem tény (D19) · az I.
    csoport építésekor, Claude · `pakli.js`, `pakliProba.js`.
107. **2026-10-11 · a Tudatpontok lista forrása és sorrendje (D101)** → **a kép kiosztási főkönyve (amiből a szabad pont is
    jön), a legutóbb rendezett elöl — a SAJÁT láncom sorszáma szerint, nem az óra szerint; felülről korlátos (100, a
    prototípusé), és megmondja, hány van összesen** · mert a lista a saját tevékenységemmel nő (≤ a keret), és ugyanaz a
    szám kell, amit a szabály-réteg számol (a még nem igazolt tag pontja itt sincs benne, mint a szabad pontnál) · az I.
    csoport építésekor, Claude · `pakli.js` (`sajatHozzarendelesek`), `koino.js`.
108. **2026-10-11 · a `FormData` a kapun (D101)** → **a lap fordítja JSON-ra (`apiHelper.js` `formDataJsonna`): a fájl-mező a
    meglévő feltöltésen át a fájl lenyomat-címe lesz, a többi szöveg marad; a számokat a kapu olvassa ki** · mert a kapu
    harmadik őre (csak `application/json` — 5.5) egy multipart küldést nem enged, és nem is szabad megkerülni; az ikon így
    fájl-igény a többi készüléken is (`fajlIgeny.js`) · a besorolások bekötésekor, Claude · `apiHelper.js`, `koino.js`.
109. **2026-10-11 · a küszöb KÉT alakja (régi hiba, mérve)** → **egy tábla két oszloppal (`pakli.js` `KUSZOB_NEVEK_KINT`): a
    MEDIÁN (`aktualMinimumDontesiIdo`) és egy e-ember JAVASLATA (`minimumDontesiIdo` — amit a modálok küldenek és
    visszaolvasnak); az `/api/ertekJavaslat` a fordítón át ír, a hiányos négyest elutasítja; a már kiírt események olvasata
    NEM változik** · mert egy táblával, a medián nevein, a lapról jött küszöb 2026-09-06/12 óta nem fordult le (a gondolat
    létrehozásakor némán elveszett, az érték javaslatban az elfogadási és a részvételi küszöb elveszett — a döntés az
    alapértéken maradt, nem romlott el); a régi „oda-vissza” próba önmagával volt következetes, a valódi hívóval nem (vak
    próba), és négy további próba a HIBÁS alakra épült (a saját javaslatot a medián nevével várta, három lap-próba a medián
    nevével küldte a küszöböt — amit a valódi modál soha nem küld); mind a valódi hívó alakjára igazítva; egy tárolt esemény más olvasata két készülék állapotát hasítaná szét (D66) — aki így adta be, újra beadhatja ·
    a Kategória-modál bekötésekor, Claude · `pakli.js`, `koino.js`, `pakliProba.js`, `parancssorProba.js`.
110. **2026-10-11 · a kártya menüjének Rendezése (D101, M2)** → **a lapos pakli `agazat`-ja: csak az ág (`agHelyzete`), a
    lapozás is az ágon marad; a hiányzó felmenőt elkéri (mint a Tudatpontok), és a szigorú (b) alatt a lista határát
    kimondja („a készülékeden ismert entitásokból”)** · mert ami nem monoton, az csak helyből rendezhető (M2 — végleges
    alak), és ezt a lapnak tudnia kell; az ágazati pont csökkenő sorát a bejáró (②) teszi teljessé · az I. csoport
    építésekor, Claude · `pakli.js` (`pakliOldal`), `koino.js`, `kartyaAdat.js`, `koinoPakli.js`.
111. **2026-10-11 · a fő menü (D101, M6)** → **a prototípus `foOldal.js`-ének MENÜJE jön át (a pontok, a rend, a csoportok, a
    modál-hívások — `foMenu.js`), nem az egész főoldal; a fejléc elején ül (a prototípusban az alsó sávban); a Meghívóim és
    az eember beállítások a prototípus „fejlesztésre vár” jelzését kapják, a Kijelentkezés kimarad** · mert a főoldal többi
    része a koinóban nem létezik (a bejelentkezés — D15) vagy nem lehet (az alsó sáv platform-szintű számai: hány e-ember,
    hány gondolat — 9. szabály), a meghívás és a profil pedig P2P-ben más út (saját átvizsgálás) · az I. csoport
    építésekor, Claude · `foMenu.js`, `index.html`.
112. **2026-10-11 · a fejléc-válasz alakja (D102, J1)** → **egyetlen lista a sorrendben (össz-pont szerint csökkenő, a
    holtverseny az azonosító), minden tétel a szülőjével (`sz`) — a szintenként fészkelt `ag` helyett; az egy szintű mód
    (`m` nélkül) megmarad** · mert az össz-pont lefelé nem nő, tehát a legjobb-először bejárás sorrendje pontosan ez a
    sorrend — egy lista, egy összehasonlítás (`elobbJon`), és a folytatás (`utan`) természetes; a ház testvér-sora és
    gyökér-szintje egy szintet kér (a mély válasz a testvéreket kiszoríthatná) · a bejáró építésekor, Claude · `kerelem.js`.
113. **2026-10-11 · a bejáró a kérő oldalán (D102)** → **nem külön gépezet: a helyi tudás rendezett listájának BIZTOS
    ELŐTAGJA (`biztosElotag`) — egy csomópont gyerekei teljesek, ha tartom, vagy a bemondott gyerekszámnyit ismerem; ha
    nem, a még nem ismert gyerek legfeljebb az össz-pont − a saját pont (legalább 1, D14) − az ismert gyerekek, és a
    levágásnál sem nagyobb** · mert a sorrend már a helyi listában van, csak a végleges hossza a kérdés; a „tömeg-határ” a
    gyerekszám nélkül is sokszor pontos (a 74. mérés G-je ezt nem használta ki) · a bejáró építésekor, Claude · `pakli.js`.
114. **2026-10-11 · a folytatás szülője (D102)** → **a folytatás egy tétele egy KORÁBBI oldal tétele alá kerülhet: az
    ellenőrzés elfogadja, ha a kérő már ismeri a szülőt (`ismert`)** · mert különben a folytatás minden mély tétele (és
    láncban a gyerekei) elbukna — a modul-próba mérte · a bejáró építésekor, Claude · `kerelem.js`, `koino.js`.
115. **2026-10-11 · hol a gyerekszám és a levágás (D102, J2)** → **egy külön helyi feljegyzésben (`fejlectudas.json`), nem
    a bemondott össz-pontok közt** · mert a bemondás egy entitás pontszáma, ez pedig egy csomópont gyerekeiről szóló tudás
    (a gyökérről is, aminek nincs pontszáma); ugyanúgy helyi, korlátos, nem esemény · a bejáró építésekor, Claude ·
    `koino.js` (`fejlecTudas`).
116. **2026-10-11 · a gyökér biztossága a szigorú (b) alatt (D102)** → **egy tartó kifogyott (teljes) gyökér-válasza a
    legjobb, amit tudhatunk — a határ 0; a levágott válasznál a levágás; válasz nélkül semmi nem biztos** · mert az
    „alap” készülék a gyökeret csak darabjaiban ismeri, globális teljességet semmi nem ígérhet (D19 — a lap kimondja) · a
    bejáró építésekor, Claude · `pakli.js`.
117. **2026-10-11 · a J4 megvalósítása** → **a raj tartói az ágból tartott (jegyzett) szeleteik száma szerint állnak a
    céllista elején, az induló címek utánuk; egy társ azt a kérelmet viszi, amelyiknek a céllistáján ő áll a legelöl
    (holtversenyben a legrégebbit, a már próbáltat kihagyva)** · mert egy körben minden cél sorra kerül, tehát a „kitől
    előre” a társankénti választásban dől el; az ág-számlálás korlátos (500 csomópont) · a bejáró építésekor, Claude ·
    `koino.js` (`agSzeleteiTartonkent`), `fuggoKerelmek.js` (`tarshozIllo`).
118. **2026-10-11 · a lapos nézet a lapon (D102)** → **amíg a bejáró kérései úton vannak, a lapos lista is csendben
    újrakérdez (4 → 60 mp), és csak akkor rajzol újra, ha az első oldal vagy a biztos előtag változott** · mert eddig csak a
    fa-szelet kérdezett újra; a lapos „ágazati” lista különben a beérkezett választ soha nem mutatná · a bejáró építésekor,
    Claude · `koinoPakli.js`, `kartyaAdat.js`.
119. **2026-10-11 · a kérelem-sorozat alakja (D102, J3)** → **az első `KERELEM` `sorozat` jele, utána további `KERELEM`-ek,
    a végén `VEGE`; a tartó egyenként szolgál ki (legfeljebb 16), a zárt kapu ítélete egyszer születik; ha egyet tilt, a
    kérő ott megáll; a szelet-kérés külön út marad** · mert így a mai menet (egy kérelem) változatlan, a sorozat csak a
    jelből indul, és a tartó egyetlen kiszolgáló-függvényt használ (`egyKerelem`) — két másolat nem csúszhat szét · a J3
    építésekor, Claude · `vonal.js`, `udpVonal.js`, `kerelem.js` (`SOROZAT_KORLAT`).
120. **2026-10-11 · a mély válasz levágása egy szinten (D102)** → **a levágás a tételek gyerekeire CSAK mély válaszban
    érvényes; egy szintű válasznál csak a kérdezett kulcsra** · mert egy szinten a tartó a tételek gyerekeit nem járta be —
    a levágás határa ott semmit nem mond róluk (a bekötés-próba forgatókönyvének átírásakor derült ki) · Claude ·
    `koino.js` (`fejlecValaszFeldolgozasa`).
121. **2026-10-11 · a lapos lista megjegyzése (D102)** → **ha a látott rész biztos sorrendben áll, de a bejáró még kér, a lap
    azt mondja: „a sor folytatódhat azzal, amit még nem ismerek — elkértem”** · mert a biztos előtag a LÁTOTT részről szól; a
    sor vége (ami még nem jött meg) attól még hiányozhat, és ezt eddig semmi nem mondta ki · Claude · `koino.js`
    (`laposMegjegyzes`).
122. **2026-10-11 · a Struktúra forrása (D101 ③)** → **a fa a bejáró sorrendjéből jön (az ágazati pont szerint csökkenően,
    holtversenyben az azonosító), és egy keretig látszik (`STRUKTURA_KERET` = 5000, a legerősebbek); a darabszám helyén a
    prototípus két száma (`osszesDarab`, `agDarab`), mellette a koinós többlet (ismert, látszik, keret, biztos)** · mert a
    prototípus a TELJES fát töltötte le, ami a szigorú (b) alatt sehol nincs meg (9. szabály); és mivel a szülő össz-pontja
    mindig nagyobb a gyerekénél (D14: a saját pontja ≥ 1), a sorrend minden előtagja ZÁRT FA — a keret nem vág ki szülőt a
    gyereke alól (ha ismerjük) · a Struktúra építésekor, Claude · `pakli.js` (`strukturaDarabszam`, `strukturaLap`).
123. **2026-10-11 · a Struktúra lapjai egy képből (D101 ③)** → **a kurzor a horgonyt és a pillanatot is viszi (a lapozás
    `kurzorKodolas`-a, az `ertek` itt a sorbeli helyzet), tehát a 2000 soros lapok ugyanabból a képből jönnek** · mert
    különben két lap között beérkezett esemény a sorrendet elcsúsztatná (egy sor kétszer, egy kimaradna) — ugyanaz az elv,
    mint a pakli horgonya · Claude · `pakli.js` (`strukturaLap`).
124. **2026-10-11 · a nyers `fetch` a kapun (D101 ③)** → **a kapu a jelszót az `Authorization: Bearer` fejlécből is
    elfogadja** · mert az örökölt `StrukturaModal` a lapokat nem az `apiGet`-tel, hanem nyers `fetch`-csel kéri
    (`tokenLekerese` → `Bearer`), és a modál bájtra a prototípusé (M5/A); a koinó lapján a „token” a kapu jelszava — a
    négy őr ugyanaz marad · Claude · `kapu.js` (`jelszoRendben`), `kapuProba.js`.
125. **2026-10-11 · a `koruleIr` ígéretre is (D101 ③)** → **ha a becsomagolt prototípus-metódus ígéretet ad, a koinós rész
    a teljesülése UTÁN fut** · mert a Struktúra darabszám-lekérése aszinkron: a megjegyzés különben a válasz ELŐTT íródott
    volna ki (az előző válaszé, vagy semmi) · Claude · `koinoModalok.js`.
126. **2026-10-11 · a Struktúra megjegyzésének helye (D101 ③)** → **építés közben a folyamatjelző alatt, a kész fán a vászon
    tetején (abszolút pozícióban, a súgó-sor mintájára)** · mert a kész nézet súgó-sora alul, abszolút pozícióban ül: a
    normál folyamban a megjegyzés a vászon alá csúszott, és nem látszott (a böngészőben derült ki) · Claude ·
    `koinoKartya.css`.
127. **2026-10-12 · a Síkidom forrása (D101 ④)** → **egy szint a bejáró sorrendjéből (az ágazati pont szerint, holtversenyben
    az azonosító), a küszöb fölött, kurzorral — és a HELYBEN ISMERT gyerekek mind, nem csak a biztos előtag** · mert a
    gyökér szintje a szigorú (b) alatt soha nem teljes: a biztos előtag ott üres volna, és a nézet semmit nem mutatna; a
    később érkező (akár nagyobb) gyereket a lap újrakérdezése hozza (a kurzor elölről, a modál saját szűrője a meglévőket
    kihagyja) · a Síkidom építésekor, Claude · `pakli.js` (`sikidomGyerekek`).
128. **2026-10-12 · a gyerek-tudás egy helyen (D101 ④, D102)** → **`gyerekTudas`: teljes-e, a `maradek` (a még nem ismert
    gyerekek össz-pontjának összege) és a `hatar` (EGY még nem ismert gyerek — a maradék és a levágás kisebbike) külön** ·
    mert a bejáró a sorrendhez az egy gyerek határát kérdezi, a Síkidom a helyfoglaláshoz az összeget — és a kettő egy
    forrásból jöjjön (két másolat csendben szétcsúszna) · Claude · `pakli.js`.
129. **2026-10-12 · a `vanGyereke` a szigorú (b) alatt (D101 ④)** → **igaz, ha ismerek gyereket, ha a tartó gyerekszámot
    mondott (> 0), vagy ha nem ismerem mind, és az össz-pontból hely marad egy még nem ismertnek** · mert a prototípus csak
    annak a síkidomnak kéri a gyerekeit, amelyiknek „van”; ha csak az ismerteket néznénk, a nem tartott síkidom levélnek
    látszana, és a nézet soha nem kérné el · Claude · `pakli.js` (`sikidomSora`).
130. **2026-10-12 · az `osszesGyerekPont` a még nem ismertek helyével (D101 ④)** → **az ismertek összege + a maradék (ha
    nem ismerem mind; a gyökérnél nincs ilyen szám — ott az ismertek)** · mert a prototípus ebből foglal helyet a később
    érkezőknek (a pakolási mag — a lerakott síkidom soha nem mozdul), és ebből tudja, van-e még mit letölteni · Claude ·
    `pakli.js`.
131. **2026-10-12 · a Síkidom csendes újrakérdezése (D101 ④)** → **a `betoltes` jel a `koino:megjegyzes` eseménnyel jön;
    a lap a síkidom „kész” jegyét (`mindenLetoltve`, `betoltottKuszob`), a kurzorát és az összes pontját visszaállítja, és a
    prototípus a SZOKÁSOS útján kér újra — ha a síkidom épp látszik (ha nem, akkor, amikor látszani fog); az üres világnál a
    megnyitás útját futtatja újra; 4 → 60 mp** · mert a modál egy síkidomot végleg „kész”-nek jegyez, ha a válasz szerint
    nincs több, a kérelem válasza viszont később jön · Claude · `koinoModalok.js`, `apiHelper.js`.
132. **2026-10-12 · a Síkidom képe mindig friss (D101 ④)** → **a program a lap horgonyát nem veszi át (a tár mai vége)** ·
    mert a nézet újrakérdez, és a közben megjött gyerekeket látnia kell; a horgony a pakli lapozásáé (ott a sorrend ne
    csússzon el két lap között) · Claude · `koino.js`, `pakli.js` (`sikidomAlap`).
133. **2026-10-12 · az össz-pont a NEM TARTOTT entitásnál (D101 ④ — lelet, D92/5 javítása)** → **ha a szeletét nem tartom, és
    van érvényes bemondás, az számít — akkor is, ha a saját pontjait ismerem (az `osszPontokSzamitasa` `tartott` kérdést
    kap; nélküle a régi: csak a `pontokIsmeretlenek` dönt)** · mert a gyökér-darabbal a legfelső szintűek saját pontja is
    megjön, a gyerekeik nem: a „saját + az ismert gyerekek” alulszámolt (a bekötés-próbában egy ág 60 helyett 30-on állt), és
    a bejáró biztos előtagja ettől hibásan bővülhetett; a D92/5 terve („a nem tartott entitásnál a bemondott össz-pont
    számít”) eddig csak a pont nélküli entitásra teljesült · a Síkidom bekötés-próbája mérte, Claude · `osszPont.js`,
    `pakli.js` (`agazatiPontok`, `tartottKerdes`), `kerelem.js`.
134. **2026-10-12 · a lap modul-fájának sorrendje (D101 ④ — lelet)** → **az `index.html` a kártya-gyárat importálja
    először; egy próba az ES kiértékelési sorrendjét járja be a belépőktől, és megnézi, hogy minden `extends` szülője előbb
    kész-e** · mert az örökölt kártyák körbe importálnak (Kartya → SikidomModal → … → kartyaGyar → GondolatKartya → Kartya),
    és ha a fát a `Kartya.js` felől érjük el (a `Pakli.js` így tenné), a leszármazott a kész szülő előtt értékelődik ki — a lap
    semmit nem töltött be; a prototípus fájljaihoz nem nyúlunk (M5/A), a belépő a koinóé · a böngésző mérte, Claude ·
    `index.html`, `pakliProba.js`.
135. **2026-10-12 · a pakli válaszának kiválasztottja a TELJES elem (D101 ④ — régi hiba)** → **a `hierarchiaAdatta` a teljes
    kártya-adatot adja `kivalasztottEntitas`-ként** · mert a `SikidomKartyaPanel` ebből építi az adatlapot, a prototípus
    szolgáltatása viszont csak azonosítót és típust adott — az adatlap ott „(cím nélkül)” állt; a `Pakli.js` csak az
    azonosítót olvassa, neki a bővebb válasz semmit nem változtat · a böngésző mérte, Claude · `kartyaAdat.js`.
136. **2026-10-12 · a Keresés korlátja (D101 ⑤)** → **típusonként, a prototípusé: alapból 10, legfeljebb 50 (eddig a koinóban
    egyetlen 20-as összkorlát)** · mert a modál 20-at kér típusonként, a hivatkozás-mező semmit (alapból 10), és a két
    útnak ugyanazt kell kapnia, mint a prototípusban; a felső korlát áll (egy kereső, ami mindent adhat, nem kereső) · Claude ·
    `pakli.js` (`KERESES_ALAP`, `KERESES_MAX`).
137. **2026-10-12 · a Keresés forrása és sorrendje (D101 ⑤, M4)** → **a két tárból (amit tartok és amit láttam — eddig csak
    a tartósból), típusonként az ágazati pont szerint csökkenően (holtversenyben az azonosító)** · mert a látott (pl. a
    kérelem hozta) entitás is az e-ember elé került már, és a prototípus adatbázis-sorrendje helyett a legerősebb elöl a
    bejáró sorrendje; a hálózati MEGTALÁLÁS a kereső-rétegé (⑦) · Claude · `pakli.js` (`keresesHelyben`).
138. **2026-10-12 · a Keresés megjegyzése (D101 ⑤, M2)** → **a válasz kimondja, hány ismert entitás címében keresett, és
    hogy a hálózati keresés még nincs; ág-szűrésnél, hánynál nem dönthető el; a lap a keresés UTÁN írja ki, üres mezőnél
    eltávolítja** · mert a „Nincs találat” a helyi aljánál nem a teljes igazság (D19) — és a régi megjegyzés egy új,
    még nem futott keresés alatt félrevezetne · Claude · `koino.js` (`keresesMegjegyzes`), `koinoModalok.js`.
139. **2026-10-13 · a postafiók két pillanatkép különbségéből (D101 ⑥, M3/A)** → **nem eseményenként, hanem a tartott
    entitások és javaslataik két képének különbségéből; az első kép és a most tartani kezdett entitás alapvonal** · mert így
    nem számít, honnan jött a változás (csere, kérelem, kézi út), nincs elveszett és nincs dupla jelzés, a terhe a saját
    szeletekkel arányos; és egy friss készülék nem kap értesítést a teljes múltról · Claude · `ertesites.js`, `pakli.js`
    (`ertesitesiKep`).
140. **2026-10-13 · ki számol (D101 ⑥)** → **a felület folyamata (egy író): a postafiók kérdésére mindig, a kártyák
    számlálójához legfeljebb fél percenként; a postafiók-műveletek sorban** · mert a postafiók csak annak kell, aki nézi; az
    őrjárat és a felület egyszerre írva egy olvasott-jelölést elveszíthetne; a kihagyott időt a következő kép egyszerre
    látja (a határidő-jelzés ilyenkor elmaradhat — a döntés kimenetele nem) · Claude · `koino.js` (`postafiokFrissitese`,
    `postafiokMuvelet`).
141. **2026-10-13 · a saját cselekvés és a nem tartott (D101 ⑥)** → **a saját gyerek, a saját javaslat és a saját pont nem
    jelez (a prototípus „a cselekvőt nem értesítjük”); a nem tartott entitás nem jelez (csak a részvételi szeletekből)** ·
    mert ami csak most jött meg egy kérelemmel, az nem „új” — csak most látom; a felület kimondja, hogy egy mélyebb ágról,
    ahol nincs pontod, nem tudok · Claude · `ertesites.js` (`pillanatkep`, `ertesitesekSzamitasa`).
142. **2026-10-13 · a levél-kézbesítés (D101 ⑥)** → **a prototípus e-mail kapcsolója megmarad (a modál bájtra a prototípusé),
    tárolódik, de nincs hatása; a program kimondja, hogy a koinóban nincs levél-kézbesítés** · mert a levelet egy szerver
    küldené (2. szabály: semmi ne múljon egyetlen szolgáltatáson) — ⏸️ hogy helyette a készülék saját értesítése (az
    operációs rendszer felé) jöjjön-e, az Csaba döntése · Claude · `koino.js`, `koinoModalok.js`.
143. **2026-10-13 · a csak küldő út a bejelentési helyeken is (D95/3 — lelet)** → **a `kuldoKulcsai` a saját szelet és a
    gyökér-darab mellett a `bejelentesHelyei`-t is felajánlja (a gyökér kivételével)** · mert eddig egy nem tartott gondolat
    alá írt gyerek születése a szülő tartójához soha nem ért el (a szülő szeletében, ahová bejelentődik, a szerző nem vett
    részt) — ugyanígy a javaslat az érintett tartójához; a fogadó ugyanazon a kapun veszi be · az értesítések bekötés-próbája
    mérte, Claude · `koino.js` (`kuldoKulcsai`).
144. **2026-10-13 · a levél helyett a készülék (D103)** → **a prototípus e-mail kapcsolója és üteme a koinóban az operációs
    rendszer felugró értesítését kapcsolja; a modál feliratait a koinós többlet írja át a betöltés után, és engedi a
    kapcsolót** · mert a modál bájtra a prototípusé (M5/A), a levél szövege viszont hamis volna; a mezők (`emailErtesites`,
    `emailMod`, `emailOrakoz`) ugyanazok, csak mást jelentenek — a 142. elágazás „hatás nélkül”-je ezzel feloldva · Claude ·
    `koinoModalok.js`, `ertesites.js` (`keszulekErtesitesei`).
145. **2026-10-13 · a platform saját eszköze, cserélhetően (D103)** → **Windows: PowerShell (WinRT toast), Mac: `osascript`,
    Linux: `notify-send`, Termux: `termux-notification`; és a `KOINO_ERTESITO` (parancs vagy szkript — a címet és a
    szöveget kapja)** · mert nulla npm-csomag (6. szabály), és ne múljon egyetlen eszközön (2. szabály); a szöveg érvként
    vagy környezeti változóban megy, sosem a parancs részeként · Claude · `eszkozErtesites.js`.
146. **2026-10-13 · az őrjárat is számol — zár alatt (D103; a 140. módosul)** → **a postafiókot a felület ÉS az őrjárat
    (percenként legfeljebb egyszer) is számolja; a két folyamat egy zárral (atomi mappa, 60 mp-es elévülés) váltja egymást,
    a kiküldés a záron kívül megy** · mert a készülék értesítésének zárt lapnál is jönnie kell, és két író zár nélkül egy
    olvasott-jelölést elveszíthetne · Claude · `koino.js` (`postafiokMuvelet`, `orjaratErtesitesei`), `fajlTar.js`
    (`ertesitesTarolo` `zar`).
147. **2026-10-13 · az azonnali korlát és az összefoglaló kezdete (D103)** → **azonnal legfeljebb öt értesítés egy
    számolásból, a többiről egy „és még N”; összefoglaló módban az első bekapcsoláskor az időköz onnan indul (nem jön
    azonnal egy összegző)** · mert egy hosszú kiesés után (a készülék napokig nem futott) ne zúdítson száz felugró ablakot,
    és a bekapcsolás ne jelezzen azonnal a múltról · Claude · `ertesites.js`.
148. **2026-10-15 · az alsó sáv a prototípus helyén (Csaba: „szeretném, ha az alsósávot is megcsinálnád”)** → **a fő menü
    és az alap-információk a lap ALJÁN, a prototípus `foOldalForm.html`-jének sávjával: a stílus bájtra (`foOldal.css`), a
    vissza/előre történet bájtra (`FoOldalTortenetKezelo.js`), a vezérlő a `foOldal.js` alsó sáv része (`alsoSav.js`); a felső
    sáv (rendezés-választó, frissítés, új gondolat) kimarad, mert a prototípusban ezek a fő menüben vannak; a tér a menüből
    nyílik (koinós többlet), és a tér sávján a „Vissza a paklihoz”** · mert a felület a prototípusból öröklődik (M5/A), és a
    D101 M6-ja a menüt ideiglenesen a fejlécbe tette · Claude · `index.html`, `alsoSav.js`, `foMenu.js`, `authHelper.js`
    (a `koino:aktivEntitasValtozas` jelzés — a prototípusé).
149. **2026-10-15 · a „platform statisztika” a készüléken ismert rész (9. szabály)** → **a prototípus alakjában
    (`/api/platform/statisztika`), de a lap képéből: a kártyák száma típusonként (az elfogadott javaslat egyezmény — D85/4) és
    az e-emberek, akiknek eseménye a bemenetben van; a lap horgonyával (ugyanaz a kép, mint a paklié — egyeznek, és a kép-
    gyorsítótár sem cserélődik); a program kimondja, mit jelentenek** · mert a koinó egészét senki nem számolja meg · Claude ·
    `pakli.js` (`helyiStatisztika`), `koino.js`.
150. **2026-10-15 · a csere állapota helyi feljegyzésben** → **`<koino>/csere.json` (`csereAllapot.js`, `fajlTar.js`
    `csereAllapotTarolo`): az őrjárat a kör elején, a csere-rész végén (a kopogás után — a tábla és a házimunka már nem csere)
    és a kör végén írja (a következő ablak), a MUNKA a sikeres csere után (idő, hozam — a bekopogóé is); a felület adja
    (`/api/csere-allapot`); „nem fut”, ha a feljegyzés két ablak + 2 perc óta nem frissült; a lap 10 mp-enként kérdez (rejtett
    lapnál nem), a visszaszámlálás helyben** · mert a cserét egy MÁSIK folyamat végzi (D100, 101.: a futó felület csak így
    látja); és a feljegyzés mérete állandó · Claude.
151. **2026-10-15 · az automatikus frissítés: csak az „új eseményt hozott” cserére, a kiválasztás helyén** → **a lap az
    `utolsoUj` változásából frissül (a „nincs újdonság” csere nem rajzoltat újra), csendben (`KoinoPakli.kulsoValtozas`: a
    kiválasztott fa-szelete, és csak ha változott; a többi gyorsítótárazott szelet elfelejtve); nyitott modál alatt vár; ha a
    kiválasztott eltűnt (pl. a 0 pontos egyezmény — D14), a szülőjére lép; utána az infók és a menü számlálója** · mert a
    néző épp írhat vagy olvashat, és egy villogó újrarajzolás a kiválasztást is elmozdítaná · Claude · `alsoSav.js`,
    `koinoPakli.js`.
152. **2026-10-15 · lelet: a fő menü értesítés-számlálója 0-t mutatott (a ⑥ óta)** → **a prototípus
    `_ertesitesBadgeFrissitese`-je a menüben (betöltéskor, olvasottnak jelöléskor, a csere után)** · mert a D101 ⑥ a
    postafiókot megépítette, a kártyák számlálóját bekötötte, de a fő menüét nem — a „réteg kész, az éles út nem hívja”
    minta; az alsó sáv bekötésekor derült ki · Claude · `foMenu.js`.
153. **2026-10-15 · a kifutás (D104, Csaba: „rendben” — az (A))** → **a pont levétele után a készülék még 24 óráig tartja
    a szeletet (a vállalás a saját láncból: a levétel ideje a saját eseményem `ido`-ja), így a többiek későbbi változásait
    is megkapja; a lejárat után a napi tömörítés viszi az átmenetibe** · mert a telefon + laptop kézi próbáján a telefon a
    levétele pillanatában elengedte az egyezmény szeletét, a laptop egy perccel későbbi levételéről soha nem értesült, és az
    egyezmény nála életben maradt; az egyszeri utólagos lekérés (B) épp ezt nem javította volna · Claude · `vallalas.js`
    (`KIFUTAS`, `kifuto`), `koino.js` (`kifutasBeallitas`, a `vallalas` kiírása).
154. **2026-10-15 · a kereső-réteg alakja (D105, Csaba: „minden javaslatodat elfogadom … ezt leszámítva”)** → **hash a
    meglévő DHT-n, több tartó és egyesítés (K1); minden szó két kulcs alatt — az egész szó és az első négy betűje (K2 (C));
    csak két ellenőrzött TAG tulajdonos, és nem tag szerző születése egyáltalán nem kerül az indexbe (K3); a felajánlás a
    csak küldő úton, kopogtatással (K4); 30 napos halványulás, néhány „soros” megújítóval (K5); előbb a 75. mérés (K6); a túl
    nagy fiók a gondolat lenyomata szerint osztódik, a több szavas kérdés a legritkább szóhoz megy (K7); ⏸️ a darab-szám
    szélessége (K8) NYITVA, amíg a „végtelen” mércéje pontosodik** · mert a magyar toldalékol (az egész szó a „park”-ra a
    „parkban”-t nem találná); mert a kulcs ingyen van (a két tulajdonos csak tagként ér valamit); és mert egy szó minden
    bejegyzése egy fiókba esik — a gyakori szó fiókja a koinóval lineárisan nőne (a „végtelen” próbája) · Claude (az
    átnézés és az átbeszélés), Csaba (a döntés) · `docs/kereso_reteg_atvizsgalas.md` 7–8. szakasz, a fázis-2 terv D105-e.
155. **2026-10-15 · a „végtelen” mércéje (D106, Csaba: „A (C)-t választom”) és vele a K8** → **a SZABÁLY: egy
    méret-korlát se legyen szűkebb, mint a koinó saját határa (az azonosító-tér, ~2^128 entitás); ahol ez drága, KIMONDOTT
    kivétel, a koinó szabályaiból levezetett felső mérettel és tartalékkal, egy helyen (ma egy: a kanonikus alak 2^53-as
    egész-határa, ~900 milliárd e-emberig); a gyökér-darab száma 16 bit helyett a mélységhez kellő bit, legfeljebb 144
    (BigInt; 16-ig bájtra a régi kulcs)** · mert a „gyakorlatilag végtelen” egy feltevésen állt a valóságról (az IPv4 32
    bitje is „végtelen” volt), és a 16 bites darab a kereső-indexnél már ~3,4 millió gondolatnál megállt volna; a teher-korlát
    (egy készülék munkája) viszont a végtelen eszköze, nem korlát · Csaba (a mérce), Claude (a K8) · a fázis-2 terv D106-a,
    `cimjegyzek.js` (`GYOKER_MAX_MELYSEG`, `gyokerLenyomata`, `gyokerJelOlvasasa`), `vonal.js`, `szeletEgyeztetes.js`,
    `koino.js`. ⏸️ A tagsági lánc 64-es korlátja a szabály szerint szűk — külön lépés (állapot-befolyásoló, D66). → ✅ 182.
156. **2026-10-16 · a kereső-réteg tiszta számításai (D105 ②)** → **a szó: NFC + kisbetű, a betűk, jelek és számjegyek
    egybefüggő sora, ékezet-összevonás nélkül, a hossza jelekben; a kulcs: `e:` + az egész szó (3 és ≥ 5 jel), `p:` + az
    első négy jel (≥ 4 jel); egy cím legfeljebb 32 kulcs (az elejéről); a szűrő: minden kérdés-szó egy cím-szó eleje; a
    bejegyzés csak a címet viselő `GondolatLetrehozas`; az osztódó fiók darabja a gondolat SAJÁT lenyomatából (egymásba
    ágyazva, a fióktól független), a darab helye a fiók nevéből és a darabból; a régió a gyökér-darab alakja `k` jellel, a
    készülék a gyökér-darabjától független helyen (más só); a darab-számítás KÖZÖS a gyökérrel (`cimjegyzek.js`)** · mert a
    75. mérés ezt az alakot mérte (K2 (C), K7); a „nincs értelmezés” (5.1) a szótárat és az ékezet-összevonást is kizárja; a
    kulcs-korlát a felajánlás árát korlátosan tartja (9. szabály); és két egymás mellett élő másolat egyszer eltérne · Claude
    · `keresoReteg.js`, `cimjegyzek.js`, `keresoProba.js`. A módosított cím: 157.
157. **2026-10-16 · a módosított cím a keresőben (D105 K9, Csaba: „legyen az (A)”)** → **a bejegyzés a születés + a címet
    adó módosítási javaslat; a felajánló és a megújító a tulajdonos (ő ismeri a mai, számított címet); a tartó az
    aláírásokat, a javaslat célját és a cím szavát ellenőrzi, az elfogadást nem; a kérdező a találat után a gondolat valódi
    címével szűr; a régi cím 30 nap alatt elhalványul** · mert a tulajdonosoknál a cím a lezárás után számítással (új esemény
    nélkül) változik, a kereső tartója viszont a döntés bemenetei nélkül ezt nem tudja kiszámolni — és a kereső a megtalálás
    rétege, nem dönt semmiről (5.7); a csak-születés (B) az átnevezett gondolatot az új nevén elrejtené, a döntés
    bizonyítéka (C) drága · Csaba (a kérdés pontosítása és a döntés), Claude · az átvizsgálás 10. szakasza, a fázis-2 terv
    D105-e.
158. **2026-10-16 · a kereső-réteg tartása, hirdetése és felajánlása (D107, Csaba: „Az L1–L4 javaslataidat elfogadom, mehet
    a ③.”)** → **L1 külön kereső-tár (puha állapot, ugyanazon a kapun) · L2 a régió tartói a cserében egyeztetnek, a régió
    kulcsa alatt (a gyökér-darab mintája) · L3 aláírt megújítás (30 nap, bárkinél lejár) · L4 a felajánlás a kérelem gépén
    (`FELAJANLAS`)** · mert a csomag pont-eseményei a tartós tárban a saját állapotot torzítanák, a kérelem-alapú régió-egyeztetés
    mindig az egész régiót vinné, az aláíratlan átvételi idővel egy hazug tartó örökké élve tarthatna egy bejegyzést, a csak
    küldő út kiterjesztése a „nincs újdonság” cserét drágítaná · Csaba, Claude · az átvizsgálás 11. szakasza, a fázis-2 terv
    D107-e.
159. **2026-10-17 · a felderítés és a kiszolgálási keret (D108, Csaba: „1. igen 2. igen 3. (A)”)** → **a felderítés egyszeri
    pillanatkép (nem frissül, az átmeneti tárban saját kerettel, értesítést nem ad; a tudatpont marad a követés eszköze); a
    korlát két oldala: a kérő beállításai a saját készüléket védik, a valódi védelem a kiszolgálónál van (közös és társankénti
    időkeret, elsőbbség, a keret fölött „később”); a sorrend: előbb a kiszolgálási keret, aztán a kereső-réteg ③–⑦, aztán a
    felderítés** · mert egy ágat ma csak tudatponttal lehet tartósan látni, a tudatpont viszont prioritás; a frissen tartás a
    felderített ágnál nem kell (Csaba); és amit a kiszolgáló nem ellenőriz, az csak illemtan — ma időbeli keret nincs, és a
    kereső-réteg ④–⑤ új kéréseket hoz a tartókhoz · Csaba (az ötlet és a döntések), Claude · a fázis-2 terv D108-a.
160. **2026-10-17 · a kiszolgálási keret (D109, Csaba: „minden javaslatodat elfogadom”)** → **KK1 a kiszolgáló képe
    gyorsítótárban (a tár állása, az átmeneti változata, a vállalás szerint, ≤ ~60 mp) · KK2 két mérce: a kimenő bájt és a
    kérésszám, csúszó óránként · KK3 a társ: a személy / a tábla-kulcs (a kérelembe is) / a cím · KK4 minden, amit másnak
    teszek, a kötéseimmel folytatott cserét kivéve · KK5 alap 20 MB + 600 kérés / óra (társ ≤ ¼, idegenek ≤ ½), „mindent” 100 MB
    + 3000 · KK6 a „később” (`KESZ` + `kesobb`, `KESOBB`)** · mert a 76. mérés szerint a válaszok kicsik, de a törzs MB-okat
    vihet, és a számítás a tárral nő (egy „mindent” tartónál 125 000 eseménynél ~1,1 s / kérés) — a kérésszám csak akkor
    mérce, ha egy kérés ára korlátos; a csak címre épülő társ a NAT-portváltással összemosódik; az idegen csere egy új
    kulccsal újra és újra lehúzhatná a koinót · Csaba, Claude · `kiszolgalasi_keret_atvizsgalas.md`, a fázis-2 terv D109-e.
161. **2026-10-17 · a kiszolgáló képe és a lusta összefésülés (D109 ①)** → **a kiszolgáló a képét (az állapot, az össz-pontok, a
    gyerek-jegyzék, a csomópontonként lustán rendezett gyereklisták) a tár állása, az átmeneti tár változás-számlálója, a
    vállalás és a bemondások szerint gyorsítótárban tartja, legfeljebb 60 mp-ig; a fejléc-válasz csomópontonként csak a
    következő legjobb gyereket tartja a kupacban (a sorrend bájtra ugyanaz); a gyorsítótár csak a kiszolgálásé (a többi hívó
    a mai `kepetKeszit`-et kéri)** · mert a 76. mérés szerint minden fejléc-kérelem a teljes állapotot újraszámolta, és a
    válasz a teljes entitás-halmazon számolt (egy „mindent” tartónál 125 000 eseménynél ~1,1 s / kérés), a lapos gyökér pedig
    minden kérésnél a koinó minden legfelső gondolatát a kupacba tette; a 60 mp a döntések időfüggése miatt (egy lejárt
    határidő a képet is elavítja); a többi hívót nem érinti, hogy a változás kicsi maradjon · Claude · `koino.js`
    (`kiszolgaloKepe`), `kerelem.js` (`fejlecKepe`, `fejlecekValasza`), `atmenetiTar.js` (`valtozas`).
162. **2026-10-17 · a kérelem útja a kiszolgálási kereten (D109 ②–④, a kérelemre)** → **a könyvelés percenkénti vödrökben,
    csúszó órában, folyamatonként a memóriában (`kiszolgalasiKeret.js`); a társ a személy / a KÉRELEMBE tett tábla-kulcs (a
    kézfogás átiratára aláírva — `tabla` + `aa`) / a cím IP-je; a kötés (a tábla-kulcsa a kötés-jegyzékben) csak
    könyvelődik; a kiszolgáló minden kérés előtt kérdez, utána a kapcsolat kiküldött bájtjait könyveli; a keret fölött
    `KESZ` + `kesobb` (kompatibilis), a túl nagy törzsből a beférő fájlok (a base64 miatt ~4/3), a többire „később”; a
    továbbadás (`ATVESZEM`) is kérés; a próbák `KOINO_KERET`-tel szűkítenek** · mert a kérelemben a kiszolgáló eddig nem
    tudta, ki kér (a tábla-kulcs csak a cserében jött) — a kötés így nem lett volna felismerhető; a memóriabeli könyvelést
    egy kérő nem tudja nullázni (a MI folyamatunkat nem indíthatja újra); a kapcsolat bájtszámlálója a valódi kimenő
    forgalmat méri (a titkosítás és a fájl-szeletek is benne) · Claude · `kiszolgalasiKeret.js`, `vonal.js`, `udpVonal.js`,
    `koino.js` (`kiszolgalasiKeretKapcsolo`, `azonossagBeallitasa`, a törzs).
163. **2026-10-17 · a csere a kiszolgálási kereten (D109 ③–④, a cserére)** → **az ítélet a nyitás után, a társ tábla-kulcsával;
    a keret fölött `KESOBB {mp}` a CIMEK helyett, és tiszta vég (a „később” se kötés, se raj, se tanulás — egyik oldalon sem);
    ha enged, az átadás a maradék bájtig küld, a többit a következő csere hozza (nem részleges `KESOBB`); a sikeres csere
    kiküldött bájtjai könyvelődnek; a kérő a „később”-t mondót a megadott ideig kihagyja (a kör és a függő kérelem), és az
    nem sikertelen kísérlet** · mert a csere az út, amin egy új kulccsal érkező „mindent kérő” egy „mindent” tartótól újra és
    újra lehúzhatná a koinót; a tartomány-egyeztetés a félbehagyott átadást magától folytatja, ezért a maradékig küldés elég
    (külön folytatás-jel nem kell); a „később” nem bukás — a társ él, csak most nem ad · Claude · `vonal.js`, `koino.js`
    (`resMunka`, `kesobbTarsak`), `csereProba.js`.
164. **2026-10-17 · ki a kötés a keretben** → **a kötés-jegyzék három legrendszeresebbje (`kotesek.js` `kotesek`), legalább három
    találkozással, és az első legalább egy keretnyi (egy óra) ideje (`keretKotesE`)** — a jegyzék bármely tagja HELYETT ·
    mert a jegyzékben a legutóbbi öt találkozás áll, és egy idegen egyetlen csere után bekerülne (egy kevés társú készüléken
    azonnal) — onnantól a keret nem fogná; a kor-feltétel a „gyorsan háromszor bekopogó” ellen szól; így legfeljebb három
    társ cserél keret nélkül, és azok a rendszeresek (D108: a saját cserém) · Claude · `kiszolgalasiKeret.js`, `koino.js`
    (`keretOsztalya`).
165. **2026-10-17 · a társ kulcsa és a tag jel EGY helyen (két mért hiba)** → **a keret társ-kulcsa a `keretTarsa`-ból (zárt
    koinóban a személy — a kérelemben bizonyított, vagy a cserében a tábla-kulcsához megjegyzett —, egyébként a tábla-kulcs,
    végül a cím); a kapu `tag: true`-t CSAK ellenőrzött tagságnál mond (a tagság ítélete kiemelve: `tagsagItelete`; nyílt
    koinóban a kérelemben bizonyított személyt a nálam lévő lánca igazolja, és a tag-kérdés hibája nyílt koinót nem zár be); a
    ki nem szolgált kérelem (tiltott, „később”, ismeretlen) nem csere (`kerelem: true` a vonal válaszában)** · mert a
    bekötés-próba három hibát mért: nyílt koinóban a kérelem a személy, a csere a tábla-kulcs alatt számolt (ugyanaz a társ két
    keretet kapott); a vonal a kapu `szabad`-ját vette tagságnak, és nyílt koinóban mindenki szabad (az idegenek fele soha nem
    fogott); a „később”-t kapott kérelem után a munka cserét könyvelt (az alsó sáv, a keret, a D99) · Claude · `koino.js`
    (`keretTarsa`, `tarsKapuja`, `tagsagItelete`, `resMunka`), `vonal.js`, `parancssorProba.js`.
166. **2026-10-17 · a kereső-tár és a bejegyzés mint egység (a kereső-réteg ③a — D107 L1)** → **a kereső-tár (`keresoTar.js`)
    BEJEGYZÉSEKET tart (`{ k, s, g, esemenyek, m }` — egy gondolat egy fiókban), nem eseményeket; a bejegyzés azonosítója a
    tartalmának lenyomata (a fogadó számolja); a csomag minden eseménye a kapun (`esemenyMentese` a kereső-tár három
    műveletével); a tartalom: a fiók kulcsa a cím kulcsa (a címadó javaslaté, ha van — K9), legalább két különböző tulajdonos
    pozitív pontja, idegen esemény nincs; fiókonként a FRISSEBB marad (holtversenynél a kisebb azonosító); a megújítás (`m`)
    a ④-ig nem érvényes; korlátos (16 MB, a legrégebben érkezett megy) és eldobható (tömörítés); a kézi út: `kereso felajanl`
    (a gondolataim bejegyzései fájlba, a főkönyv nyertes pont-eseményeivel), `kereso behoz`, `kereso kivisz`** · mert egy
    gondolat több fiókban él ugyanazokkal az eseményekkel (a fiók és az osztódás a bejegyzésé), a megújítás nem esemény, és
    egy pont-eseményről a fogadó nem tudná, melyik régióba tartozik; a „frissebb marad” teszi, hogy két tartó a különbség után
    ugyanazt tartsa; egy ellenőrizetlen megújítás a lejáratot tolhatná ki (L3); a tagság (K3) a tagsági kísérők gépével a
    ④-ben jön · Claude · `keresoTar.js`, `koino.js` (`keresoRegioim`, `sajatBejegyzesek`, a `kereso` parancs),
    `keresoTarProba.js`, `parancssorProba.js`.
167. **2026-10-17 · a kereső-régió a cserében (a kereső-réteg ③b — D107 L2)** → **a gyökér-darab mintája: a NYITÁS `kd` jele
    (`m:l1:l2:l3`, a régióim halmazának 11 jeles lenyomata — az üres régióé üres), a társ a kulcsokat a tábla-aláírómból
    számolja, a legsekélyebb KÖZÖS eltérő régió kerül az eltérők közé (a nyitó lenyomatba nem); a régió halmaza a
    kereső-tár bejegyzés-azonosítói, az átadás `BEJEGYZES` üzenettel (a keret maradékáig — D109); a fogadó a helyet MAGA
    számolja, és csak az egyeztetett közös régióba esőt veszi fel, a kereső-tár kapuján; a zárt koinó nem tagjával a
    régió kimarad (a részvétel kimondja); jel nélküli társnál nincs régió (a csere nem csúszik el)** · mert a régió
    tartóinak a különbséget kell cserélniük (a tartomány-egyeztetés), és a „nincs újdonság” csere nem drágulhat (a jel
    +11–46 B nyitásonként, számolva); egy hazug társ a régió halmazába akármit beírhat, ezért a hely és a kapu a fogadóé ·
    Claude · `vonal.js`, `koino.js` (`resMunka`: `keresoTar`, `keresoMelyseg`, a kereső-tár `frissit`-je),
    `keresoRegioProba.js`, `parancssorProba.js`.
168. **2026-10-17 · a régió tartói a DHT-n és a rajban (a kereső-réteg ③c)** → **a készülék a kereső-régiója témáját is
    hirdeti (`keresoRegioTemaja`, vakított, a gyökér-darab mellé — `sajatHirdetendoTemak`); a címjegyzék-körben megnézi, ki
    hirdeti még (legfeljebb 4 cím), és azokat 30 percre a kör céljai közé veszi (mint a kopogtatókat); a raj a régió
    kulcsát is vállalja (a `RESZVETEL`-ben), a társat a régió kulcsa alatt tartónak jegyzi, és ha a csere új bejegyzést
    hozott, a régiót „változott”-nak jelöli (a raj kör a többi tartót is felkeresi); a raj kör szeletei közé a régióim is
    bekerülnek** · mert a régió tartói egymásról csak így tudnak (a DHT témája a régió neve), és mindkét fél megtalálja a
    másikat, tehát a buliban egymásra kopognak (D33) — kopogtató pár ezért nem kell; a raj teszi, hogy a változás a régió
    minden tartójához eljusson (D97/2); ⛔ a régió-társak a KOPOGTATÓK UTÁN kerülnek a célok közé — mérve (a teljes sor, a
    D92/1 kopogtatás-próba): előbb jöttek, és egy kérő, aki a régiónak is tartója, már ismertnek látszott, így a „kérő vár
    rám” jelzés elmaradt · Claude · `koino.js` (`sajatHirdetendoTemak`, `cimjegyzekKor`, `REGIO_TARS_KORLAT`, a raj,
    `rajKorCeljaim`), `parancssorProba.js`.
169. **2026-10-18 · a tanult mélység (D110 — a K10 (A2))** → **a gyökér-darab és a kereső-régió mélysége legalább a friss
    (≤ 1 nap) társak bemondott mélységének ALSÓ mediánja − 1 (legalább két különböző, hitelesített tábla-kulcsú társtól), csak
    mélyebbre; a bemondás a NYITÁS jeléből (`gyd`, `kd` — a vonal visszaadja, a `koino.js` a tábla-aláíró alatt jegyzi,
    `melysegek.json`); egy helyen (`melysegTanulas.js`)** — a K10 (A) „legnagyobb, és csak amíg a saját darab kevés” szabálya
    HELYETT · mert a „kevés” feltétel egy hosszan offline készüléket beragasztott volna (a régi, sekély darabja „teli”), a
    „legnagyobb” pedig két összebeszélt társnak engedett volna; a mélyre tolás ára csak a kisebb tartás, ezért az irány „csak
    mélyebbre” · Csaba, Claude · `melysegTanulas.js`, `fajlTar.js` (`melysegTarolo`), `vonal.js` (`tarsMelysegei`), `koino.js`
    (`tanultMelysegem`, `gyokerMelysegTanulva`, `keresoRegioim`), a fázis-2 terv D110-e.
170. **2026-10-18 · az aláírt megújítás és a lejárat (a kereső-réteg ④a — D107 L3, K5; a ⑥ magja)** → **a megújítás egy
    aláírt állítás, nem esemény (`m = { szerzo, ido, alairas }`); az aláírás a koinóra, a gondolatra és a csomag eseményeire
    szól az idővel, a fiók és az osztódás NÉLKÜL (egy aláírás a gondolat minden fiók-bejegyzésére); az aláíró a csomag egyik
    tulajdonosa, a személyes kulcsával; a tartó elveti a nem tulajdonosét, a hamisat és az egy napnál jövőbelit; a lejárat a
    bejegyzésből (a megújítás ideje — vagy a csomag legfrissebb eseménye — + 30 nap), bárkinél ugyanaz; a lejárt nem kerül
    be, a régió halmazából kimarad, a tömörítés és a megnyitás eldobja; a frissesség a megújítás ideje (a megújított
    felülírja a régit); a soros: a gondolat és a tulajdonos lenyomatának sorrendjében az első a 20., a második a 25. napon
    újít; az őrjárat óránként tömörít (a lejárt és a régióimon kívüli kiesik); a kézi felajánlás a megújításommal megy** ·
    mert egy aláíratlan „átvettem ekkor” időt egy hazug tartó a végtelenségig frissen tarthatna (a „temető” a rajból jönne
    vissza); 32 kulcsnál 32 aláírás helyett egy; a jövőbe dátumozott megújítás évekig élne · Claude ·
    `keresoMegujitas.js`, `keresoTar.js`, `koino.js` (`sajatBejegyzesek`, `keresoTarTomoritese`), a próbák.
171. **2026-10-18 · a tagság a kereső-táron (a kereső-réteg ④b — K3)** → **a bejegyzés csak akkor kerül az INDEXBE (a régió
    halmazába, a kérdés válaszába), ha a születés szerzője és a csomag minden tulajdonosa ellenőrzött tag; a tagság-ellenőrzőt
    a hívó adja (a `koino.js` tagsági kérdezője — a nem tudott szerző a függő tagság-kérdések közé is felkerül, és a csere
    tagsági köre elhozza a csomagját; minden szerzőt megkérdezünk); amíg nem tudjuk, a bejegyzés FÜGGŐ: nem megy tovább, a
    függők együtt legfeljebb a korlát tizedét foglalják, és helyhiánynál előbb a függő esik ki; a csere után és a `kereso`
    parancsban a függők újraértékelődnek; a kézi út fájlja a szerzők tagsági kísérőit is viszi (`{ kisero }` sorok — a
    befogadó a lánc-típusú eseményeket és a csomagokat ugyanazon a kapun a tartós tárba veszi); ⛔ a kereső-tár újraírása
    generáció-jelet ír, és a `frissit` ebből látja, ha a fájlt valaki újraírta** · mert a kulcs ingyen van: egy nem tag
    szerző bejegyzései különben kiszoríthatnák a valódiakat; a régió tartói a függőt nem adják tovább, így a szemét nem
    terjed; ⛔ a generáció-jel MÉRT hibából jött: a függő jel 1 → 0 átírása azonos hosszú fájlt ad, és a másik folyamat ezt
    nem vette észre (hosszabb újraírásnál pedig rossz helyről olvasott volna tovább) — és egy rontás-próba azt is megmutatta,
    hogy a `kereso` parancs saját újraértékelése a csere utáni emelés hiányát elfedte, ezért a próba a lemezt nézi · Claude
    · `keresoTar.js` (`bejegyzesSzerzoi`, `FUGGO_HANYAD`, `fuggokFrissitese`, a generáció), `koino.js` (a tagság-ellenőrző,
    a kísérők a kézi úton, az emelés a csere után), a próbák.
172. **2026-10-18 · a felajánlás a kérelem gépén (a kereső-réteg ④c — D107 L4, K7)** → **új kérelem-fajta (`felajanlas`): a
    kulcs egy kereső-régió (vagy a gyökér: „ami a régióidba esik”), a teher a bejegyzések (≤ 64) és a szerzőik tagsági
    kísérői (≤ 512); nem adható tovább; a tartó a kísérőket (lánc-típus + csomag) a kapun a tartós tárba, a bejegyzéseket a
    kereső-tár kapuján veszi fel (csak ami a régióiba esik), és kimondja az OSZTÓDÁST (ahol egy hely nálam lévő, indexelt
    része meghaladja a célt: `{ k, s' }`); a felajánló a gondolatai bejegyzéseit a kimondott osztódások szerinti mélységgel
    régiónként csoportosítja (a mélység a D110 szerint), nyilvántartja a felajánlottakat (`felajanlasok.json`), a
    megújítást újrahasznosítja, amíg érvényes és nem esedékes; három út: közvetlenül (`kereso felajanl <cím> <port>`),
    automatikusan (az őrjárat címjegyzék-köre — a régió témájának hirdetői a függő kérelem céljai, a kopogtató a téma párja),
    és fájlban (a kézi út)** · mert egy régióban egy tartó elég (a többihez a ③b viszi); az osztódás a tartó helyi tudása (ő
    látja a fiók méretét), ezért ő mondja ki, és a darabok egymásba ágyazottak (a lánc követhető); a megújítás
    újrahasznosítása nélkül minden kör új aláírás, új azonosító, újra-felajánlás lett volna; a kopogtató pár a NAT mögötti
    tartóhoz kell (a tartó a párján látja, hogy valaki ajánlana, és felé kopog) · Claude · `felajanlas.js`, `kerelem.js`
    (`felajanlas` fajta, `felajanlasValaszAlakja`, `TOVABBADHATO_FAJTAK`), `vonal.js`, `fuggoKerelmek.js`, `cimjegyzek.js` (a
    `kereso` pár), `keresoTar.js` (`helyMerete`), `koino.js` (a kiszolgáló, `felajanlasKor`, a függő munka, a parancs), a
    próbák.
173. **2026-10-18 · a kérdés (a kereső-réteg ⑤ — K1, K2 (C), K3, K7, K9)** → **a terv: a kérdés szavai a leghosszabbtól (a
    K7 „legritkább szó”-jának olcsó becslése), a ≥ 4 jeles szónál a SZÓELEJE-fiók (a toldalékos alakokra is teljes), a
    háromjelesnél az egész szó; egy nem osztódott fiók válasza teljes — ott megáll; az osztódottból 2 darab a minta, és a
    következő szóra lép; új kérelem-fajta (`kereses`: a hely — fiók, mélység, darab — és a kérdés): a tartó a hely indexelt
    bejegyzései közül a TELJES kérdésre illőket adja (a legfrissebbek elöl, ≤ 50), a szerzők tagsági kísérőivel, a hely
    méretével és az osztódással; a kérdező MAGA ellenőriz (a kísérők a kapun, a találat alakja, tartalma, a hely, a szűrő, a
    szerzők tagsága a saját tudásából — a nem ellenőrizhetőt kihagyja, kimondva), a csomagot az ÁTMENETI tárba teszi (a
    kártya megnyitható), és ha a gondolatot ismeri, a valódi címével szűr (K9); a tartót közvetlenül vagy a DHT-n (a régió
    témáján) éri el** · mert a tartó szava nem bizonyíték (3. szabály) — egy hazug tartó nem tag szerzőt, vagy más szót
    tartalmazó címet is adhatna; a szóeleje-fiók nélkül a „park” a „parkban”-t nem találná; ⏸️ a NAT mögötti tartóhoz a
    kérdés függő kérelemként (az őrjárat viszi) a ⑦-tel jön (a felület várja meg a választ) · Claude · `kereses.js`,
    `kerelem.js` (`kereses` fajta), `vonal.js` (`KERESESVALASZ`), `keresoTar.js` (`helyBejegyzesei`), `koino.js` (a
    kiszolgáló, `kereses`, `keresesValaszFeldolgozasa`, a `kereso keres` parancs), a próbák.
174. **2026-10-18 · a Keresés ablaka a hálózati találatokkal (a kereső-réteg ⑦)** → **a felület a helyi találatokkal
    azonnal felel, és a HÁTTÉRBEN elindítja a hálózati kérdést (kérdésenként egyszerre egyet; a kész eredmény két percig
    él); a találatok az átmeneti tárba kerülnek, így a lap újrakérdezésére (a `betoltes` jel) a HELYI listában jelennek meg —
    a modál bájtra változatlan rajzolója rajzolja őket; a megjegyzés kimondja az állást (keresem · nem találtam tartót · N
    tartót kérdeztem, egy sem felelt · N találat jött). ⑦b: ha a DHT-n talált tartók közül egy sem felel (NAT mögött), a
    kérdés FÜGGŐ KÉRELEM lesz — a kérdés is a kérelem része (`fuggoKerelmek.js` `ker`: két kérdés egy régióban külön) —, a
    célok a tartók, a kopogtató a régió témájának párja; az őrjárat munkája futtatja (ugyanaz az ellenőrzés; az osztódott
    fiók mintája újabb függő kérelem), a lap egyre ritkábban figyel (2 → 30 mp, ~17 percig), és amíg a kérdés függ, nem
    kérdezünk újra; ha az őrjárat nem fut, kimondja** · mert a lap nem várhat a hálózatra (a tartók felkutatása és a kopogás
    másodpercek, a NAT mögötti tartó válasza percek), és a lap csak rajzol (7. szabály) — a hálózati munka a programé ·
    Claude · `koino.js` (`halozatiKereses`, `keresesFuggoFelvetele`, `keresesFuggoAllasa`, a megjegyzés, a függő munka
    `kereses` ága; a sorozat csak a fejléc- és a törzs-kérelemé), `fuggoKerelmek.js` (`ker`), `koinoModalok.js` (az
    újrakérdezés), a próbák. ⏸️ **Ami a ⑦-tel láthatóvá vált — K11:** a megtalált gondolat kártyája a születést és a
    tulajdonosok pontjait mutatja; a többi részéhez (szöveg, gyerekek) a TARTÓIT kellene elérni, és erre alapból nincs út (a
    szelet DHT-hirdetése a D91/3 szerint alapból ki van kapcsolva) — az átvizsgálás 16. szakasza, Csabánál.
175. **2026-10-18 · a megtalált gondolat tartói (D111 — a K11 (A))** → **a tartó-tipp a találattal: a kereső tartó a
    felajánlás kérelmének ELLENŐRZÖTT tábla-kulcsát a gondolat mellé jegyzi (≤ 4, 30 nap, külön fájl — a bejegyzés
    azonosítója a tartalmáé), a régió tartói közt a `BEJEGYZES` az idejével viszi, a kézi út `{ tipp }` sorokkal; a válasz
    gondolatonként ≤ 2 tippet ad (cím nélkül); a kérdező helyben jegyzi — NEM a raj-jegyzékbe —, és a gondolatra szóló függő
    kérelem a tipp készülékének kopogtató témáján jelentkezik** · mert a szelet DHT-hirdetése (B) mindenkinek drága volna
    (D91/3), a továbbadás (C) a kereső tartót terhelné; a raj-jegyzék ellenőrzött, címes tartókat tart — egy ellenőrizetlen
    tipp onnan a `RESZVETEL`-lel tovább is terjedne · Csaba: „(A) Tartó-tipp” · `keresoTar.js` (`tippek`,
    `tippFeljegyzese`), `kereses.js` (`keresesValaszAlakja`), `vonal.js`, `koino.js` (`tartoTippekFeljegyzese`,
    `tartoTippjei`, a `fuggoKerelemFelvetele` kopogtatója), a próbák (⚠️ a bekötés-próba a kopogtató témán való
    megjelenést méri, mert a régió-társság a „megjött”-et a tipp nélkül is hozta).
176. **2026-10-18 · a fájl-tár kerete (D112 ① — F3 (A), a felderítés alatt)** → **a nem vállalt törzs (szöveg-darab, fájl)
    a fájl-tárban ÁTMENETI: ami nem védett (a vállalt entitások törzse — a pont, a saját létrehozás, a vállalás —, a
    profil-darabok, a 24 óránál frissebb), az együtt ≤ 50 MB, fölötte a legrégebben érintett megy; a „mindent” készülék
    mindent tart; a takarítás ritkítva az őrjáratban és a törzs-kérelem után, a `tomorit` kényszeríti; a felület a
    megmutatott fájlt megérinti** · mert a fájl-tár eddig korlátlan volt (a lap törzs-kérelmei is örökre hagyták a nem
    vállalt törzset), és a törzses felderítés erre épül (az alappillér elve); a védettséget a takarításkor számoljuk, nem
    az íráskor jelöljük — a törzs több úton jön (a csere randevúja, a kérelem, a kézi út) · Csaba: F2 + F3 (A) ·
    `fajlTar.js` (`allapot`, `erintes`, `torol`, `fajlTakaritasTerve`), `fajlIgeny.js` (`vallaltE`), `koino.js`
    (`fajlTarTakaritasa`), a próbák.
177. **2026-10-18 · a rögzítés (D112 ② — F2 (A))** → **a felderítés szeletei az átmeneti tárban RÖGZÍTVE (szelet →
    felderítés → mikor): a böngészés kerete csak a nem rögzítettekre számol, a rögzítettekre külön keret áll (1 GB, a
    legrégebbi rögzítés megy előbb), a feloldás visszaadja a böngészés kiszorításába; a bemondott össz-pontok és a
    fejléc-tudás korlátja a rögzítettet megtartja** · mert a nézetek így változatlanul a két tárból olvasnak (egy harmadik tár
    — F2 (B) — minden nézetet és a kiszolgálót érintette volna), és egy böngészés nem söpri ki a pillanatképet (D108/1:
    „saját kerettel”) · Csaba: F2 (A) · `atmenetiTar.js` (`rogzites`, `rogzitesFeloldasa`, `rogzitettKulcsok`,
    `rogzitesAllasa`, `ROGZITETT_KORLAT`), `koino.js` (`korlatosBemondasok`), a próbák.
178. **2026-10-18 · a felderítés ütemezője (D112 ③ — F1, F4, F6 (A))** → **a felderítés egy háttérben futó Struktúra: az
    őrjárat minden körében a futó felderítések egy lépése — a Struktúra sorrendje az ágban (a legjobb K, legfeljebb d szint
    — `felderitesAllasa`), a látható csomópontok rögzítése, a hiányzó HÁTTÉR-kérésként (egy társnál a lap kérései előbb
    mennek), körönként a beállított számig és csak ha a függő kérelmek közt marad hely a lapnak (48); kész, ha az első K
    biztos; keret a méretnél; elakadt két óra után; 30 nap után feloldódik; ha az ág gyökere ismeretlen, a szeletét is
    kéri** · mert a meglévő bejáró és kérelem-gép mindent tud (D102), a felderítésnek csak ütemeznie és rögzítenie kell; az
    ismeretlen ág esetét a bekötés-próba mérte (a bejáró a fejléc-kérdéssel csak a gyerekeket kéri) · Csaba: F1, F4, F6 (A) ·
    `felderites.js`, `pakli.js` (`felderitesAllasa`, `maxMelyseg`), `fuggoKerelmek.js` (`hatter`), `koino.js`
    (`felderitesKor`, a `felderites` parancs), a próbák.
179. **2026-10-19 · a felderítés törzse (D112 ④)** → **két fázis: a fejlécek, aztán (ha kérték) a látható csomópontok
    törzse — a szöveg-darab és a fájlok, háttér-kérésként (csak a vállaló adja — D84/1), a felderítés méretébe számítva; a
    törzs-kérések ugyanabban a körben indulnak, amelyikben a fejlécek elkészültek; a fájl-tár takarítása a rögzített
    entitások törzsét védi** · mert a következő körre halasztva a csere randevúja (ami a két tár minden entitásának fájljait
    kéri) előbb hozta volna a darabokat egy csere-társtól, és a felderítés egy kört várt volna (mérve); a randevú ettől még
    versenyez — a felderítés dolga a kérés, a darab bármelyik úton jöhet · Claude · `felderites.js` (`fazis`,
    `torzsHianyzik`), `pakli.js`, `koino.js` (`felderitesKor`, `fajlTarTakaritasa`), a próbák.
180. **2026-10-19 · a felderítés a felületen (D112 ⑤ — F5 (A))** → **a kártya menüjében „📷 Felderítés…” a kártya bővítési
    pontján (`extraMenuOpciok` — a prototípus kártyája bájtra változatlan), a fő menüben a „Felderítések” ablak és „Az egész
    koinó felderítése…”, a rögzített kártyán „📷”; a kapun `GET /api/felderitesek`, `POST /api/felderites`, `POST
    /api/felderites/torol`; ⭐ a felderítés állásában a tartó TELJES gyökér-válasza elég (a bejáró a gyökeret gyerekszám
    híján tovább kérendőnek tartja)** · mert a lap csak rajzol (7. szabály), a határokat a program szabja; a gyökér-esetet a
    böngészős próba mérte (az egész koinó felderítése „fut”-ban ragadt volna, két óra múlva „elakadt”) · Csaba: F5 (A) ·
    `felulet/js/koinoFelderites.js`, `foMenu.js`, `koinoPakli.js`, `kartyaAdat.js`, `koinoFelderites.css`, `koino.js`,
    `atmenetiTar.js` (`rogzitesIdeje`), `pakli.js` (`felderitesAllasa`), a próbák.
181. **2026-10-19 · a függő kérelem újrapróbája (a ⑦b próba megnevezett bukása)** → **a „már próbáltuk ezt a társat ezzel a
    kérelemmel” jel IDŐRE szól (`KERELEM_UJRAPROBA` = 2 perc — `fuggoKerelmek.js` `ujraProbalhato`), nem a futó őrjárat
    végéig** · mert a teljes sor terhelése alatt a ⑦b próba háromszor bukott, és a bukás (a függő kérelem sorait kiíró
    hibaüzenettel) megnevezte az okát: az első próbálkozás egy épp újrainduló tartónál 10 mp csend után elbukott („a másik fél
    nem válaszol”), és a régi szabály szerint ez a tartó a kérelem lejáratáig (két óra) nem kapott újra esélyt — a terepen
    egy átmenetileg lassú tartó ugyanígy járna. Nem a próba hangolása: a próba a dokumentált gombbal (`KOINO_KERELEM_UJRAPROBA`)
    rövidebb időt ad · Claude · `fuggoKerelmek.js`, `koino.js`, a próbák.
182. **2026-10-19 · a tagsági lánc korlátja 64 → 256 (D113 — a D106 (A))** → **`MELYSEG_KORLAT` = 256 (a tagság és a 2.
    lépcső szúrópróbájának útja); a tagsági kísérők egy szerzőé egészben vagy sehogy, a válasz ≤ 1024 esemény és ≤ 4 MB (a
    vonal 8 MB-os sor-korlátja alatt); a vonal és a felajánlás kísérő-korlátja 1024** · mert a 78. mérés szerint a korlát a
    LEGMÉLYEBB tagnál dönt, nem az átlagnál (a D106 számítása az átlaggal ~10^29–10^30-at mondott): véletlen meghívónál a
    fa magassága ~e·ln n, a 64-et a legmélyebb tag ~1,3·10^11 tagnál elérte volna (az emberiség ~13-szorosa), a 256-ot a
    koinó saját határáig (2^128) sem; a 128 ~3·10^21-ig tartott volna (kivételként); a 256 mély csomag (~240 KB) 32-szer
    egy válaszban a sor-korlátba nem fér, a csonka lánc pedig semmit nem bizonyít · Csaba: „(A) 256” · `tagsag.js`,
    `tagsagKisero.js`, `vonal.js`, `felajanlas.js`, `koino.js`, `lancFarokMeres.js`, `zartKapuMeres.js`, a próbák.
183. **2026-10-19 · a UDP-s több forrás (D114 — T1–T5)** → **a folyamat KÖZÖS munka-jegyzéke lenyomatonként (a randevú és a
    kérelem törzse rajta; itt áll a „3 egyidejű átvitel” is); a befejezetlen fájlok további tartói AKTÍVAN a kör céljai közé
    (≤ 2 / kör, ≤ 3 / fájl); a rossz szelet tanulsága és a türelem a forrásokból a UDP-n; a birtoklás jegyzete a
    tábla-aláíróval, korlátosan** · mert a 79. mérés szerint a párhuzamos munkák ugyanazt a fájlt egymástól függetlenül hozták
    (minden szelet kétszer, ×1,0, lezárási verseny), és a D69/2 óta a több forrás élesben nem futott; a „több szeletes” a
    részleges mappából pontos (a méretet az első szelet mondja meg) · Csaba: T2 (B) · `fajlAtvitel.js` (`kozosMunkaJegyzek`,
    `aktivForrasok`), `fajlKerelem.js` (`birtoklasTakaritasa`), `fajlTar.js` (`reszlegesLenyomatok`), `udpVonal.js`
    (`fajlRandevu`), `vonal.js`, `koino.js`, a próbák.
184. **2026-10-19 · a fájl-randevú a kiszolgálási kereten (D109 KK4 pótlása)** → **a kiszolgáló fájlonként kérdezi a keretet
    (a keret fölött `FAJLNINCS` + `kesobb` — kompatibilis), a kiküldött bájtok könyvelődnek, a kérő a „később”-re megáll, és a
    kör a tartót addig nem hívja** · mert a D114 átvizsgálása közben kiderült: csak a csere bájtjai könyvelődtek, a randevún egy
    idegen a csere-keret alatt korlát nélkül vihetett fájlt (a KK4: „minden, amit másnak teszek”) — és az aktív forrás-gyűjtés
    a tartók keretére is épít; a D109-kori hibakereső naplósor is ki · Claude · `vonal.js` (`fajlKiszolgalas`, `fajlHozatala`),
    `udpVonal.js`, `koino.js`, a próbák.
185. **2026-10-19 · a kopogás saját üteme (D115 — a 41. mérés (a)-ja)** → **a tábla (a néma kötések keresése, az új cím
    kiírása), a címjegyzék és a házimunka HÁTTÉR-munka (egyszerre egy — a kör nem várja meg); és ha a kör legfeljebb 3 mp-cel
    csúszott túl a saját ablakán, a következő azonnal indul** · mert a rés csak egyidejű kopogásra nyílik, és a 80. mérés két
    okot talált a kimaradt fordulóra: a tábla a kopogás után sorban (az induló kör új címének kiírása 30–55 mp — épp a
    hálózatváltás után, amikor a legnagyobb szükség van a résre), és a fordulóig tartó kopogás utáni ütemezés · Csaba: „a
    többi mehet” · `koino.js` (`orjarat`, `ABLAK_KESES_TURES`, `KOINO_HATTER_KESLELTETES`), `korUtemMeres.js`, a próbák.
186. **2026-10-22 · a felderítetlen rész (D116)** → **a részfa-fa három összeget visz ([pont, darab, gyerek]); a fejléc az alatta
    lévők számát is hozza, a gyökér köti, és a szúrópróba a darab és a gyerek szerint is vesz mintát (az eltalált gyerek
    születésével); a felület egy segédből mondja ki, mi maradt felderítetlen (a kártyán, a testvérnél, a Struktúrában, a
    Síkidomban, a felderítésnél)** · a teljes szerkezet minden készüléken a 9. szabályba ütközik, a darabszám irányonként nem; a
    gyerekszám egymagában is minden felderítetlen irányt megjelöl (a megszerzett rész összefüggő), de a mennyiséget csak az
    össz-darab mondja meg · a kitalált gyerek és a darabot hordozó szerzői levél csak a darab szerinti mintán, a felfújt
    gyerekszám a gyerek szerintin bukik — ezért kettő; 81. mérés: +9–12% a mély kérésen · Csaba: „(B) Gyerekszám + össz-darab” ·
    `osszPont.js`, `kerelem.js`, `pakli.js` (`felderitetlenTudas`), `koino.js`, `felulet/js/koinoFelderitetlen.js`, a próbák.
187. **2026-10-22 · a minták születése nem tudás (D116 — a bekötés-próba lelete)** → **a kérő a fejléc-minták eseményei közül
    csak a pont-eseményeket teszi az átmeneti tárba** · a darab-minták gyerekeinek születése bizonyíték: a tárban a gyerek
    „ismert” lett volna pont és fejléc nélkül — a felderítetlen rész kisebbnek látszott (mérve: 4 helyett 2), és a D102 bejárója
    egy csomópontot teljesnek vett volna, aminek a gyerekei össz-pontját nem ismeri · Claude · `koino.js`
    (`fejlecValaszFeldolgozasa`), a parancssor-próba.
188. **2026-10-23 · a bejáró csak addig kér, amit a nézet mutat (a D102 javítása)** → **a `biztosElotag` egy `szukseges`
    határig kér: a lapos lista az oldal végéig, a Struktúra a keretéig, a felderítés a K-ig** · Csaba lelete: a telefon
    „felderítés nélkül” az egész koinót (475 gondolatot) áthozta — a lapos (ágazati pont szerinti) lista bejárója a TELJES sor
    biztosságáig kért, a lap a `betoltes` miatt percenként újrakérdezett, így egy nyitva hagyott lista a koinót lehúzta (egy
    nagy koinóban vég nélkül); egy hely biztosságát csak az előtte álló nem teljes csomópontok rontják, a szükséges helyen
    túl nincs mit kérni · Claude · `pakli.js` (`biztosElotag`, `pakliOldal`, `strukturaSorrend`), a próbák.
189. **2026-10-23 · a Struktúra magától az első 200-ig kér (D117)** → **a Struktúra megnyitáskor annyit kér, mint egy
    alapbeállítású felderítés (200), a keretig (5000) a már ismertet mutatja a „+N” jelekkel; a felderítés a saját K-jáig kér** ·
    a D101 ③ a keretig kért: egy kis koinóban a Struktúra megnyitása mindent lehúzott, egy nagyban egy nézelődés több MB
    forgalom — a tömeges elhozás a felderítés dolga · Csaba: „(B) Az első 200-at” · `pakli.js` (`STRUKTURA_KERES`,
    `strukturaSorrend`, `felderitesAllasa`), `koino.js` (`strukturaMegjegyzes`), a próba.
190. **2026-10-23 · a kártya MINDIG mutatja a számokat, és az alsó sáv a kérelem után is frissül (Csaba kérése a D116 próbája
    után)** → **a ház kártyáján a leszármazottak (▾) és a testvérek (↔) ismert száma a tudatpont-sor stílusában, mellettük
    halványan a még nem ismert („+N”); a program a csere-állapot mellett a készülék TUDÁSÁNAK változatát is mondja (a tartós
    tár állása + az átmeneti tár változása), és a lap erre is frissít** · Csaba: „ne csak akkor és azt írja ki, amennyi még
    nincs meg, hanem azt is, ha már megvan”, és „csere után az alsó sáv számai nem frissülnek” — ami kérelemmel jön (böngészés,
    felderítés), az nem csere, az `utolsoUj` nem lép tőle · `pakli.js` (`kartyaSzamai`), `koino.js` (`/api/csere-allapot`
    `tudas`), `felulet/js/koinoFelderitetlen.js` (`kartyaSzamokJelolese`), `alsoSav.js`, a próbák.
191. **2026-10-23 · az alsó sáv nem takar, a Tudatpontok lapozva, a nem ismert entitások az alsó sávon (Csaba három kérése)**
    → **(1) a lap a sáv VALÓDI magasságát méri (`--koino-also-sav` — telefonon több sorba törik): a pakli alja ennyi helyet
    hagy, a menük a sáv fölötti részre igazodnak (a kártya menüje a kártya rétegében nyílik, a sáv alatt — a z-index nem
    segít); (2) a Tudatpontok lista kurzorral lapoz, a „További” gomb hozza a következő 100-at; (3) az alsó sáv a gyökér
    szintjének felderítetlen részét is mondja („🔭 N” — a tartó szerint, a D116 darabjából)** · a prototípus egysoros sávra
    hagyott helyet; a lista eddig 100-nál vágott; a darabszám ugyanabból a körből jön, mint a többi szám (nem drágább) · Csaba
    · `alsoSav.js`, `koinoKartya.css`, `main.css`, `index.html`, `koinoModalok.js`, `apiHelper.js`, `pakli.js`
    (`sajatHozzarendelesek` `kurzor`, `helyiStatisztika` `ismeretlenSzama`), `koino.js`, a próbák.
192. **2026-10-24 · a költözés átvizsgálása (D66 → D118) — a múlt közös, a jelenlét személyes**
    → **az új koinó a szülőjére épül (a szülő múltja a vágásig, átírás nélkül; az entitások a régi nevükön), súlyt csak a
    költöző hoz (egy beköltözés-aláírással), a lezárt döntés múlt, a nyitott a költözőkkel folytatódik, a tagság és a 2.
    lépcső a vágáskor öröklődik, a zártság is; a szabályok a koinó születésébe kerülnek, a koinó neve a születés
    lenyomata; a költözés két esemény (ki- és beköltözés)** · a D66 egyenkénti újra-aláírása minden entitást átnevezett
    volna, a részleges költözés lyukakat hagyott, a lezárt döntések megfordulhattak volna; egy teljes pillanatkép a 9.
    szabályba ütközik ⛔ **lelet:** a koinó neve ma szabad szöveg, és egy kívülálló egyetlen azonos nevű születéssel (a
    cserén is) az alapító — és minden tag — döntéseit „nem ellenőrizhetővé” tette (mérve) — a D118/2 zárja, ezért az ① az
    első lépés · Csaba · [`koltozes_atvizsgalas.md`](koltozes_atvizsgalas.md), a fázis-2 terv D118-a.
193. **2026-10-24 · a költözés ①a: a koinó neve a születés lenyomata (D118/2; KZ1–KZ5 elfogadva)**
    → **az új alakú `KoinoLetrehozas` koinó-mezője üres, a koinó neve a születés azonosítója, minden más esemény ezt viszi;
    a kód minden koinó-hasonlítása egy segédet hív (`esemenyKoinoja`), a születést EGY szabály választja (`koinoSzuleteseE` /
    `koinoSzuleteseListabol` — lenyomat-nevű koinónál csak az az esemény, amelyiknek az azonosítója maga a név); a kapu
    elveti a lenyomat-nevet mondó születést és az üres koinó-nevű nem-születést; a `KOINO_AZONOSITO` helyi becenév
    (`becenevek.json`), a mappa a koinó neve; `koino` (új alakban, argumentum nélkül a név), `csatlakoz <név>`, a `behoz`
    egyértelmű fájlnál csatlakozik** · a lelet (192.): a szabad név mellett egy kívülálló egyetlen azonos nevű születéssel
    az alapító és minden tag döntéseit „nem ellenőrizhetővé” tette; a három választási hely (az állapot az utolsót, a
    tagság az elsőt, a kapu a saját láncból) eltért · ⚠️ a régi alak (szabad név) csak a próbák és a régi adat kedvéért él,
    lenyomat-nevű koinóra soha nem vonatkozik; a csatlakozó előbb `csatlakoz`-ik, aztán `belep` (a belépés a koinó nevére
    szól) · Csaba · `esemeny.js`, `tagsag.js`, `allapotSzamitas.js`, `identitas.js`, `ter.js`, `vonal.js`, `fajlTar.js`
    (`koinoBecenevFeloldasa` / `Kijelolese`), `koino.js`, és a koinó-hasonlítások 18 fájlban; a próbák (`koinoMappa`,
    `koinoNeve` a parancssor-próbában).
194. **2026-10-24 · a költözés ①b: a koinó szabályai a születésben (D118/2, KZ1)**
    → **a tudatpont-keret, a kategória-korlát, a tanúsítás-szám, a felhatalmazás alapértéke és a küszöbök alapértékei a
    születés `szabalyok` mezőjében (`koinoSzabalyok.js` — a kapu csak ismert kulcsot és a határon belüli egész számot
    enged; a keret felső határa a mai 10 000); a program az új születésbe MINDET kiírja (+206 B), és az `ALAP_SZABALYOK`
    soha nem változik (csak a régi alakú és a még meg nem érkezett születésé); a számítás minden helyen a koinó számával
    (a szabály-réteg, a döntés, a lezárási összegzés, az identitás-nézet, a lánc-gyökér — a gyorsítótár a kerethez kötött —,
    a lánc-ellenőrzés, az ellentmondás, az észlelő, a vállalás, a művelet, a pakli); a parancssor:
    `koino "<név>" … kulcs=érték`** · ha csak az eltérők kerülnének a születésbe, egy későbbi program alapértéke minden ilyen
    koinót csendben átírna (a 15. mérés kettéhasadása — a megismételt mérés mutatja: a régi alakú hasad, az új nem); a
    hiányzó születésnél a mai érték a legengedékenyebb, tehát a kapu semmi érvényeset nem dob el · ⛔ a meghívó-szám NEM
    szabály (Csaba, 2026-10-24: „maradjon 1 egyelőre”) — a modell része; ⛔ a mérés egy hibát is talált: a keret MÁSODIK
    vizsgálata (a számított összegre, hézagos láncnál) még a program állandóját nézte · Csaba (KZ1) · `koinoSzabalyok.js`
    (új), `esemeny.js`, `szabalyok.js`, `javaslatSzamitas.js`, `lezarasiOsszegzes.js`, `osszegzoTartas.js`,
    `identitas.js`, `lancGyoker.js`, `lancEllenorzes.js`, `ellentmondas.js`, `eszlelo.js`, `esemenyTar.js`, `vallalas.js`,
    `allapotSzamitas.js`, `muveletek.js`, `pakli.js`, `koino.js`, `verzioMeres.js`; a próbák (esemény, szabály, döntés,
    identitás, lánc-gyökér, parancssor).
195. **2026-10-24 · a költözés ②a: a gyermek születése és a születések lánca (D118/1, /5, KZ2)**
    → **a születés `szulo` (a szülő neve) és `szuloTagsag` (a létrehozó horgonya és tagsági lánca a szülőben, a szülő
    születése NÉLKÜL) mezőt kaphat; a kapu a szülő születésével együtt ellenőriz (a lánc hiteles, a szülőé, a horgony a
    létrehozóé, tagságot ad; zárt szülőnek csak zárt gyermeke), és ha a szülő születése még nincs meg, nem véglegesen
    utasít el; a születések lánca a `szulo` mutatókon a gyökérig — a koinó születés-szelete és a kézi út a teljes láncot
    viszi a gyökértől, a beolvasztás a kapott születésekből és a tárból együtt követi (ami nincs rajta, idegen), egy fájl
    koinója a lánc legfiatalabbja; `koino "<név>" … szulo=<szülő>`: a szülő szabályait és zártságát örökli (ami nincs
    megadva, az a szülőé), és a gyermek születése a létrehozó szülőbeli láncát folytatja** · ha a szülő születése a
    bizonyítékban volna, egymásba ágyazva minden őst hozná (egy esemény, ami a történettel nő — 9. szabály); egy új, 1-es
    sorszámú lánc a szülőbelivel ütközne, amint a múlt a gyermekbe ér (elágazás — a létrehozó a saját láncát vádolná;
    építés közben derült ki) · ⚠️ a ②b-re: a létrehozó és a költözők szülőbeli eseményei a lánc-pont szerint jönnek, nem az
    óra szerint · Csaba (D118, KZ2) · `koinoLanc.js` (új), `esemeny.js` (az alak), `esemenyTar.js` (a kapu), `csere.js`
    (`beolvasztas`), `vonal.js` (a születés-szelet), `tarsEmlekezet.js`, `fajlCsere.js`, `muveletek.js`, `koino.js`
    (`gyermekSzuletesElokeszitese`, `koinoSzuletesLanca`, `behozandoKoinoja`); a próbák (`koinoLancProba.js`, parancssor).
196. **2026-10-24 · a költözés ②b: a kapu koinó-szabálya (D118/1 — 4.3)**
    → **egy esemény a koinó táráé, ha a koinóé, ha a születések láncán van, vagy ha egy ős eseménye a vágása előtt — a
    létrehozóé a LÁNC-PONT szerint (a sorszáma a gyermek születéséé alatt), mindenki másé az ÓRA szerint (`ido` ≤ a tőle
    örökölt nemzedék születése); EGY segéd (`koinohozTartozik`, a nézet `koinoNezete` — a teljes lánc nézete megmarad), és
    ugyanezt hívja a hálózat és a kézi út kapuja (`beolvasztas`) és a szelet halmaza (`egyeztetettEsemenyek`) — a csere két
    névvel egy szeletben** · a halmaz szabálya a kapuéval egyezik (különben minden cserében újraküldés — 40. mérés); a
    létrehozó óra szerinti vágása egy óra-csúszásnál a vágás utáni szülőbeli eseményét is beengedné, ugyanazzal a
    sorszámmal, mint a gyermekbeli folytatás (elágazás) · ⚠️ a számítás a múltat még nem veszi figyelembe (a ③); az átmeneti
    tár, a lánc-ellenőrzés, az észlelő és a tagsági kérdező a név szerint szűr (a ⑤) · Csaba (D118) · `koinoLanc.js`,
    `csere.js`, `szeletEgyeztetes.js`; a próbák (`koinoLancProba.js`, parancssor).
197. **2026-10-24 · a költözés ③: a koinó képe két rétegben (D118/1, /3, /4, KZ6)**
    → **a koinó képe EGY függvény (`ketReteg.js` `koinoKepe` — a parancssor, a pakli és a művelet ugyanazt hívja): szülőre
    épülő koinónál a múlt nemzedékenként, az ős szabályaival, a vágás pillanatára számolódik, és a LEZÁRT döntései rögzítve
    jönnek át (`javaslatokSzamitasa` `rogzitettek` — nem számolódnak újra; az általános egyezmény hatálya a jelenből); a
    jelenben a szerkezet (a létrehozások, az ellentmondás) mindenkié, a súly csak a költözőké, a lánc-pontjukig, nemzedékenként
    követve (`jelenbenSzamit`); a létrehozó a születésével költözik; a nem költöző nyitott javaslata nem folytatódik (KZ6
    (A)); a végrehajtás a múlt és a jelen egyezményeit egy sorban vezeti rá; a bemenet a koinó-szabály szerint
    (`koinoBemenete`); a művelet bemondott összege a jelen szerint (a hozott pontokkal); a múlt képe gyorsítótárban** · ha a
    lezárt döntést újraszámolnánk, a gyermek szigorúbb küszöbe vagy a költözők egyedül megfordítanák (D118/3); a nem
    költöző súlya (és nyitott javaslata) olyan ember döntése lenne, aki ott nincs jelen (D118/1); a művelet és a kép két
    szabállyal a bemondott összeget a lánc ellentmondásának látná · ⚠️ a próbák építése közben kétszer: a tagsági szabály
    elfedte a költözés szabályát (a nem költözőt tagként kell mérni), és egy elágazás a próbát véletlenné tette · ⏸️ a ④–⑤:
    a többi költöző, a tagság öröklése, a vállalás, a lánc-gyökér a költözött láncon · Csaba (D118, KZ6) · `ketReteg.js`
    (új), `koinoLanc.js`, `javaslatSzamitas.js`, `esemenyTar.js` (`koinoBemenete`), `atmenetiTar.js`, `pakli.js`,
    `muveletek.js`, `koino.js`; a próbák (`ketRetegProba.js`, parancssor); a 83. mérés (`ketRetegMeres.js`).
198. **2026-10-24 · a költözés ④a: a ki- és a beköltözés eseménye, a tagság öröklése (D118/3, /6, KZ3)**
    → **`Kikoltozes` a szülőben (`{ gyermek }`, a költöző azonosság-szeletébe — a szülő jelene, a gyermekbe nem kerül);
    `Bekoltozes` a gyermekben (`{ szulo, kikoltozes, lanc, szuloTagsag, elhagy }`, a saját szeletét nyitja — a költöző horgonya
    a gyermekben): a költöző szülőbeli láncát a vágás előtti utolsó eseménye után folytatja (mint a létrehozó születése); a
    kapu a koinó és a szülő születésével ellenőriz (a szülő egyezik, a lánc-pont alakja, a tagsági bizonyíték — egy szabály a
    születésével, `szuloTagsagaEllenorzese` —, és a lánc eseményei a vágás előttiek: a VÁGÁSKORI tagság); a gyermekben a
    beköltözés tagsági horgony (D118/3 — `HORGONY_TIPUSOK`, a lánc-típusok közt); a kép és a művelet a beköltözésekből tudja,
    ki költözött (a lánc-pont, és az elhagyott entitásokra a hozott pont nem jön — KZ3 (A))** · ⛔ a tagsági csomagba
    csomagolt hamis beköltözés ingyen tagságot adott volna — a csomag kapuja (és a társ tagsági ítélete) a születésekkel
    ellenőrzi (`bekoltozesekEllenorzese`; a `tagsag.js`-be körkörös import lett volna) · ⚠️ a próbák építése közben: a
    változatokat a lánc-ponton kell aláírni (`elagaztat`), és egy vak próba (a bemondott összeg mindkét szűrővel 150) — az új
    pont az elhagyott entitásra került · ⛔ két további lelet: a bizonyítékban utazó szülőbeli beköltözés (a több nemzedékes
    költöző) ellenőrizetlen volt — most a születésekkel, rekurzívan; és a hozott pont-esemény a szülő bemondását hordozza —
    a gyermekben a számított összeg és a gyermek kerete dönt (`pontEsemenyMerlege` `hozott`, a szabály-réteg és a művelet
    egy szabállyal; különben a kisebb keretbe az elhagyás után sem férne semmi) · Csaba (D118, KZ3) · `koinoLanc.js`,
    `tagsag.js`, `szabalyok.js`, `esemeny.js` (az alak),
    `esemenyTar.js` (a kapu), `ketReteg.js`, `muveletek.js`, `tagsagKisero.js`, `vallalas.js`, `jelzesek.js`, `koino.js`; a
    próbák (`koltozesProba.js`).
199. **2026-10-24 · a költözés ④b: a `koltozes` parancs és az első kitöltés (D118/6, KZ3)**
    → **`koltozes <gyermek> [elhagy=<az>,…] [fájl]` (a szülő koinóból): ellenőrzi, hogy a gyermek születése megvan és ennek a
    koinónak a gyermeke, hogy a vágáskor tag voltam (a tagsági láncom eseményei a vágás előttiek); a lánc-pont a vágás előtti
    utolsó eseményem; a KZ3 (a hozott pontjaim a gyermek keretébe, különben `elhagy=`); aztán a kiköltözés a szülőben, az első
    kitöltés (a láncom a lánc-pontig, és a hozott szeleteim múltja — a gyermek kapuján, a koinó-szabály szerint), a
    beköltözés a gyermekben, és ha kérem, mindez fájlba (a gyermek születés-láncával — a kézi út); ⭐ a létrehozó ugyanígy: a
    `koino … szulo=` a hozott múltját is a gyermekbe viszi (közös segéd: `hozottMult`)** · a létrehozó kitöltése nélkül a
    gyermek az ő múltját csak kézzel kapta meg (a ③ próbája így pótolta) · ⚠️ a próbák építése közben: a szelet kitöltését a
    csere ELŐTT kell mérni (a csere a létrehozó kitöltéséből is elhozza), egy rontás maga volt hibás (a modul szintjén
    `return` — szintaktikai hiba, ami semmit nem mért) · Csaba (D118) · `muveletek.js`, `koino.js`; a parancssor-próbák; a
    82. mérés (`koltozesMeres.js`).
200. **2026-10-24 · a költözés ④c: a 2. lépcső öröklése, és az alapító a gyermekben (D118/3, 4.2, 4.6)**
    → **a beköltözött és a gyermek létrehozója a tanúsíthat-e és a 2. lépcsős-e kérdésre a szülőbeli (vágáskori) állapotát
    hozza: a kérdés a szülőben folytatódik, a szülőbeli horgonyára, a SZÜLŐ szabályaival (külön nézet — a tanúsítás-szám más
    lehet); a gyermekben szerzett tanúsítások ezen felül számítanak; a szúrópróba sétája is a szülőben folytatódik; ⛔ a
    gyermek születése nem alapító kör (se a létrehozó, se a megnevezett alapító)** · eddig a gyermek létrehozója a születéssel
    alapító kör lett — tanúsíthatott és 2. lépcsős volt, akármi volt a szülőben (a 4.2 kimondta, hogy nem így); egy közös
    nézettel a szülő kérdése a gyermek tanúsítás-számával futott volna (a próba mérte: a gyermek 1, a szülő 3) · ⚠️ a D94
    szúrópróba a szülőbeli bemondásokat követi — a nagy zárványú költöző a gyermekben „nem ellenőrizhető”, amíg azok nincsenek
    meg · Csaba (D118) · `identitas.js`; a próbák (`koltozesProba.js`).
201. **2026-10-24 · a költözés ⑤a: a vállalás, a kereső-réteg és az átmeneti tár a hozott entitásokra (D118, 4.7)**
    → **a saját láncom a koinó jelen rétege szerint (a vállalás a hozott pontjaimból, a számított összeggel — mint a
    szabály-rétegben); a kereső-bejegyzés, a tartó találata és a kérdező ellenőrzése az ősök neveit is a koinóénak veszi; az
    átmeneti tár olvasása nem szűr a koinó nevére (a kapun átjutott ős-esemény megmarad)** · eddig a beköltöző a hozott
    gondolatait a gyermekben „nem tartod”-nak látta (a szigorú (b) alatt nem is cserélte volna), a hozott gondolat
    kereső-bejegyzése „más koinó eseménye” volt, az átmeneti tárból az ős eseménye az újranyitáskor eltűnt · ⭐ a 4.7 „újra kell
    indexelni” pontja: a költözők a gyermekben felajánlják (két tag-tulajdonos — a nem költöző nem tag) · ⏭️ ⑤b: a lánc a
    költözött láncon (három lelet, mérve — az átvizsgálás 11. szakasza) · ⛔ a teljes sor lelete: a még meg nem érkezett
    születésnél a lánc üres, és a jelen szűrője mindent kizárt (a vendég azonosság-szelete kiesett a vállalásából — a D95/3
    próbája mérte); ilyenkor a koinó saját eseményei (a művelet összegében a ③ óta ugyanez — a ⑤b zárja) · Csaba (D118) ·
    `vallalas.js`, `keresoTar.js`,
    `kereses.js`, `atmenetiTar.js`, `koino.js`; a próbák (`koltozesProba.js`, a ④b parancssor-próbája), 8 rontással.
202. **2026-10-25 · a költözés ⑤b: a szerző LÁNCA a koinóban (D118, 4.5)**
    → **egy szabály (`koinoLanc.js` `lancbanVan`, `lancNezete`): a szerző lánca egy koinóban a koinó saját eseményei, és ha
    költözött, az ős láncából hozott előtag (a lánc-pontja előtt) — a nem költöző szülőbeli eseménye NEM a gyermekbeli
    lánca, csak a múlt szerkezete; erre épül a lánc-vég (a nem költöző gyermekbeli lánca 1-ről indul — a művelet és az író
    is), a lánc-gyökér (a napló a teljes láncot fedi, a kiosztás a jelen szerint), a koinó képe (a láncon kívüli ős-esemény
    külön lánc-ág: nem elágazás, nem idő-visszalépés; a láncon lévő, de a jelenből kizárt esemény ismert sorszám, nem
    hézag), a lánc-ellenőrzés két oldala; a `koltozes` a kiköltözés ELŐTT elutasítja, aki a gyermekben már nem költözőként
    él** · mérve (2026-10-24): a költöző gyermekbeli eseményeinek nem volt lánc-gyökere (az 1. sorszámon „nem ép”), a hazug
    bemondása egy szülőbeli tagsági csomag mellett csak jelzés volt, és ⛔⛔ a nem költöző gyermekbeli gondolata eltűnt,
    amikor a szülőbeli múltja megérkezett (az elágazás-feloldás a kisebb azonosítót tartotta meg) — két készülék más képet
    számolt volna · ⚠️ a beköltözés nem horgonyoz (a nézet vele változik); a VÁD a hozott előtagon még nem fogadott · Csaba
    (D118 — a 4.5–4.6 következménye) · `koinoLanc.js`, `esemenyTar.js`, `iro.js`, `lancGyoker.js`, `muveletek.js`,
    `allapotSzamitas.js`, `szabalyok.js`, `ketReteg.js`, `lancEllenorzes.js`, `vallalas.js`, `koino.js`; a próbák
    (`koltozesProba.js`, a ④b parancssor-próbája), 13 rontással; az építés közben: a születés nélküli lánc (a ③ óta a
    művelet összege a korábbi pontjaimat kihagyta) és a koinó születésének helye (a hívó tára adja).
