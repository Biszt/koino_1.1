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
elérhető része kész — a következő pillér a B.**

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
döntésben; a tagsági csomag a saját azonosság-szeletben (D = 64); a zárt koinó a kézfogásban (személyes aláírás +
csomag); a 2. lépcső ugyanígy (előbb mérés); a Profil kötelező mezőkkel, a meghívás megnevezi a lenyomatát; a
kontraszt-jelzés bemenete. ✅ **Megépült (2026-10-04):** a tagság tiszta számítása (`tagsag.js` — a legrövidebb lánc,
D = 64), a tagsági csomag (E2; a kapu ellenőrzi, az őrjárat kiadja), a Profil (E5; a koinó `profil=` mezői, a
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

A pakli-nézet a felületen (a prototípus láncos-testvéres nézete — ma egyszerűsített lista), később a
síkidom- és a térkép-nézet kérelmezése, és a terep (a telefon frissítése — ⛔ a tiszta törés óta
enélkül nem cserél).

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
   a negatív levél (D80) új fajta nélkül elég. ⏸️ Csabánál: F1, A1, A2.

*Utána a ház:* a pakli-nézet a felületen, a terep (két mobil, a 🅱️ változat).

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
