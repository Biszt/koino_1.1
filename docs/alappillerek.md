# ALAPPILLÉREK — amire a koino épül, ami még hiányzik, és ahonnan leágaztunk

*Létrehozva: 2026-09-27 este, Csaba kérésére, a C lépés 8. pontja után.*

> *„én azt mondom, hogy csináljunk meg minden alap pillért, amire épül valami. csak tudom, hogy
> így a fejlesztés iránya tele lesz elágazással, ezért jól kell dokumentálni, hogy miről ágaztunk
> le, és miért. szóval akkor a merkle-fát se halogassuk, ha már építenénk rá."* — Csaba

**Mi ez a dokumentum?** A [`utiterv.md`](utiterv.md) a **sorrend** helye, a
[`fejlesztesi_terv_fazis2.md`](fejlesztesi_terv_fazis2.md) a **döntéseké** (D1–D80), a
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
vádolt azonosság-szeletébe; a kapu ellenőrzi, a szabály a vádponttól kihagyja a pontjait) → ⏭️
③/hálózati: hogyan jut a bizonyíték az ellenőrzőhöz (⚠️ Csaba döntése: kérésre vagy az eseménnyel), a
teljes kiosztás-lista szúrópróbája (D79), a kettős lánc a szeletek között, a bizonyíték kiszolgálása
(logaritmikusan).

### B. ⭐⭐ A KÉT TÁR (D75) ÉS AZ ÉRDEKLŐDÉS SZABÁLYA (a C 9. pontja)

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

### E. ⭐ AZ IDENTITÁS A SZELETELT VILÁGBAN — A-ra és C-re épül

Ma a tagság a láncon a gyökérig ellenőrződik (D59), és ehhez a belépési események kellenek. A (b)
után ezek nem mind vannak meg — addig „nem ellenőrizhető" (D19). A cél: a láncok mindenkinél,
összenyomva (A/3).

### F. A TÁRSANKÉNTI EMLÉKEZET (a D71 (iii) V2-je) — B után

A (b)-ben a nem közös szeletek minden körben „eltérőnek" látszanának. Ha társanként megjegyezzük a
közös szeleteket és a legutóbbi lenyomatukat, a kör csak a változottakról szól.

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
