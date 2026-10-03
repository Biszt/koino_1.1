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

### E. ⭐ AZ IDENTITÁS A SZELETELT VILÁGBAN — A-ra és C-re épül

Ma a tagság a láncon a gyökérig ellenőrződik (D59), és ehhez a belépési események kellenek. A (b)
után ezek nem mind vannak meg — addig „nem ellenőrizhető" (D19). A cél: a láncok mindenkinél,
összenyomva (A/3).

### F. A TÁRSANKÉNTI EMLÉKEZET (a D71 (iii) V2-je) — B után

A (b)-ben a nem közös szeletek minden körben „eltérőnek" látszanának. Ha társanként megjegyezzük a
közös szeleteket és a legutóbbi lenyomatukat, a kör csak a változottakról szól.

### G. ⭐⭐ A CÍMJEGYZÉK — „mi kinél van" (D84/2) — B-re épül, a D alapja

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
   javaslat jogának bizonyítéka (56.) ✅; a csomag kiadása és elkérése 🚧.
   *(Próbák: allapot → alap + csere; a végén a teljes sor — közös réteg.)*
2. **D89/1 — a csere titkosítása** és a **zárt / nyílt koinó-paraméter** a `KoinoLetrehozas`-ban (a
   betartatása az E-vel jön). *Miért itt:* a D85 a szeletek halmazát is megváltoztatja, tehát a régi
   programmal úgyis megszakad a csere (tiszta törés) — a titkosítás ugyanebbe a törésbe kerül, így a
   telefont EGYSZER kell frissíteni. És minden későbbi üzenet (a kérelem, a címjegyzék) már titkosított
   csatornán születik.
3. **B/1 + B/2 — a vállalás és a két tár** (D86): a vállalás a saját láncból (a kiosztás kulcsai + a
   saját azonosság-szeletem), az átmeneti tár, a „megnézett", a D14 csak a tartósra, az eldobás. A csere
   még a mai módon fut. ⏸️ Itt kell eldönteni a gyökér tartását (a legfelső szintű gondolatok születése).
4. **G — a címjegyzék** — ⛔ előbb mérés / átvizsgálás (S10, SK7); a D89/2 szerint a zárt koinó
   címjegyzéke nem kerülhet kiolvasható nyilvános helyre.
5. **D — a kérelmezés** (D76, D83/3, D87): a G-ből tudja, kitől; a törzs a kérelem útján, a közvetítő nem
   tartja meg és nem ismeri a kérdezőt; a válasz az átmeneti tárba.
6. **E — az identitás a szeletelt világban**, vele a zárt koinó betartatása (a tagság bizonyítása a
   kézfogásban, D89/2) és a Profil (D28 a D88 alakjában — az azonosság-szeletben él).
7. **B/3 — a szigorú (b) bekapcsolása:** a csere részvétele a vállalásból, a törzs kiszolgálása a D84/1
   szerint. Innen végleges.
8. **F — a társankénti emlékezet** és **az A hátralévői** (a D79 szúrópróba, a napló-alapú kettős-lánc
   észlelés, a logaritmikus napló-bizonyíték).

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
