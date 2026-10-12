# A MARADÉK MODÁLOK ÁTVIZSGÁLÁSA (5.8) — a nyolc helyőrző a szigorú (b) alatt (2026-10-11)

*A ház (D100) után a felületből a kártya-menük helyőrzői maradtak. Csaba: „az 1-est választom” — előbb átvizsgálás, mert a
szigorú (b) alatt nem mind egyforma. Ez a lap összegyűjti, mit tud a nyolc modál a prototípusban, mire épülne itt, mi
hiányzik alóla, és melyik kérdés Csabáé.*

## 1. Ami ma van

- **A nyolc helyőrző** (`felulet/js/components/modals/`, a `helyorzoModal` alakúak): a Rendezés, a Struktúra nézet, a
  Síkidom nézet, a Keresés és a Tudatpontok a `Kartya.js` közös menüjéből nyílik, mind **ág-szűrve** (a kártya ága
  alatt); a Kategória a `KategoriaKartya` „Új alkategória létrehozása” pontjából (csak létrehozás); az Értesítések a közös
  menüből (a kártya sarkán a részfa-olvasatlan számlálóval — ma mindig 0, `kartyaAdat.js`); az Értesítési beállítások
  minden kártyafajta saját menüjéből.
- **A prototípusban ugyanezek a FŐ MENÜBŐL is nyílnak, ág nélkül** (`foOldal.js`: Keresés, Struktúra, Síkidom, Rendezés,
  Értesítések, Értesítési beállítások, Új gondolat / kategória / gondolattípus, Meghívóim, Tudatpontok, e-ember
  beállítások, Kijelentkezés). ⚠️ A felületen ma **nincs fő menü** — a fejlécben a rendezés-választó, a „+ Új gondolat” és
  a tér/pakli váltó áll (D100).
- **Ami alattuk már megvan:**
  - a ház (`pakli.js` `pakliHierarchia`: a felmenők a szülő-láncon ≤ 64, a bogár, a testvérek ≤ 50; a hiányzót a lap
    függő kérelemként írja be — lekérésenként ≤ 4, összesen ≤ 16 függő —, az őrjárat hozza, a lap csendben újrakérdez);
  - a fejléc-kérdés (`kerelem.js`: X gyerekei össz-pont szerint, n ≤ 50, a legjobb ág d ≤ 4 szintig, mintákkal
    ellenőrizve) — ⚠️ **folytatás nélkül**: az 51. gyerek nem kérhető;
  - a lapos pakli (`pakliOldal`: idő / saját pont / ágazati pont) — ⚠️ **csak a helyben ismert entitásokon**, és semmit
    nem kér el;
  - a helyi keresés (`/api/kereses`: cím-részlet a két tár állapotában, ≤ 20 találat, ág-szűrés nélkül — a
    szövegszerkesztő hivatkozás-mezője használja);
  - a saját lánc (a kiosztás, a szabad pont — `szetosztottPontok`);
  - a besorolások létrehozása (`muveletek.js` `besorolasLetrehozasa`: szülővel, a leírás szöveg-darabként, emoji- vagy
    kép-ikonnal) — ⚠️ **csak a parancssorból**, a kapun nincs írási útja.
- **Egy javítás a régi feljegyzéshez:** a `szakasz5_terv.md` 2026-09-13-i listája szerint „a `SikidomModal` a
  prototípusban is felfüggesztve”. ⛔ Ez elavult: a 2026-07-20-i felfüggesztés után a nézet **újraépült** (2026-08-03:
  terület ∝ tudatpont, háromszögeléses pakolás, küszöb-vezérelt betöltés, korlátlan nagyítás; 2026-08-06: lineáris
  skálázódás — `fejlesztesi_terv.md` 14. pont, ✅). A prototípus síkidomja működő, átvehető nézet.

## 2. A nyolc — mit tud a prototípusban, és mire épülne itt

### I. Ami a saját láncból vagy egy meglévő rétegből jön (nincs új réteg alatta)

**Tudatpontok** (a prototípusban 284 sor). A saját aktív pont-hozzárendeléseim listája (cím, típus, pont), fejlécben a
szabad pont; sorra kattintva a pakli odaugrik, a „Módosítás” a meglévő `TudatpontModal`-t nyitja. Itt a forrás a SAJÁT
láncom — a szigorú (b) alatt minden pozitív pontú szeletemet tartom (B/1), tehát a címek is megvannak. 🔍 *Egymilliárdnál?*
A lista a saját tevékenységemmel nő (legfeljebb a keret, 10 000 tétel), nem a koinóval — rendben. Az ág-szűrés („csak X
ága alatt”) a felmenő-láncon dől el; ahol egy felmenő nincs meg, ott „nem eldönthető” (D19), és a ház útján elkérhető.

**Kategória és gondolattípus létrehozása** (a `KategoriaModal` 467 sor, a fő menü `GondolatTipusModal`-ja 447 sor). A
művelet kész, csak a kapu írási útja hiányzik (a kezdő tudatponttal és a küszöbökkel, ahogy a `/api/gondolat`-nál). ⚠️
A modál a képet `FormData`-ban küldi, a kapu viszont csak JSON-t fogad (5.5, a harmadik őr) — a fordítás a lapé: előbb a
meglévő `/api/feltoltes/kep`, aztán JSON (vagy emoji-ikon, feltöltés nélkül). A szerkesztés a P2P-ben javaslat (a
`JavaslatModal` útja); a kártyák a `KategoriaModal`-t ma amúgy is csak létrehozásra nyitják.

**Rendezés** (147 sor). Maga a modál semmi: módot és irányt választ, és a `Pakli.js` `rendezesBeallitasa`-ját hívja — a
fejléc választója ma pontosan ezt teszi (D100). A kártya-menüből viszont **ág-szűrve** (`agazatId`): a kártya részfájának
lapos rendezése — ez a program oldalán még nincs (`kartyaAdat.js` ki is mondja). Hogy mire épül, azt a 3. szakasz mondja
meg; itt dől el a legtöbb.

### II. Ami a fát járja be — a kérelemre épül

**Struktúra nézet** (958 sor). A prototípus a TELJES fát tölti le (`/api/struktura`, 2000 soros lapokban), előtte
megkérdezi: „N entitás — elkészíted?” (`struktura/darabszam`), és vásznon rajzol (több tízezer csomópont; a részlet a
nagyítással jön elő). ⛔ A szigorú (b) és a 9. szabály alatt a teljes fa sehol nincs meg, és nem is lehet — a forma itt
megváltozik: a fa **a legerősebb ágaktól kifelé nő, egy keretig** (3. szakasz), és a darabszám helyén „ismert N” áll.

⚠️ **Egy átvételi csapda:** a letöltő metódus nyers `fetch`-et használ (`Authorization: Bearer` fejléccel, a megszakítás
miatt), nem az `apiGet`-et — ezt a lap fordítója nem látja, és a kapu sem fogadja el (az `X-Koino-Kulcs` fejlécet várja).
Bájtra változatlan átvételnél vagy a kapu fogadja el a Bearer-alakot is (ugyanaz a jelszó), vagy a koinós alosztály írja
felül a letöltést.

**Síkidom nézet** (3439 sor + a `SikidomKartyaPanel` + kilenc `sikidom*.js` segéd, ~2850 sor). A legnagyobb darab — és a
P2P-hez a legjobban illő, mert **a skálára tervezték** (a 2026-07-20-i terv: nem lehet a teljes fát letölteni). Egy
síkidom akkor látszik, ha a képernyőn elér egy átmérőt; ebből a nézet kiszámolja a pont-küszöböt, és csak a küszöb
fölötti gyerekeket kéri (`sikidom/gyerekek`: szülő, pont-küszöb, kurzor = utolsó pont + azonosító; össz-pont szerint
csökkenően, és a gyerekek együttes pontja), az ős-láncot külön (`sikidom/oslanc`). Ez **majdnem pontosan a
fejléc-kérdés** — a `kerelem.js` fejléce ki is mondja: *„a síkidom, a térkép később ugyanezt használja”*. A gyerekek
együttes pontja = össz-pont(X) − X saját pontja, tehát a fejlécből számolható. Ami hiányzik: a **folytatás** (a
korlátlan nagyításnál az 51. gyerek is láthatóvá válik — és a prototípus kurzora pontosan az, ami kellene: az utolsó
össz-pont és azonosító), meg a mellék-ikonokhoz a besorolások ikonja (a besorolás létrehozó eseménye — ha nincs meg, ikon
nélkül, vagy elkérhető). ⭐ Csaba 2026-09-02-i mondata (SK10) épp ezt mondta ki: a síkidom láthatósági küszöbe dönti el,
**mikről megy kérelem**.

### III. Ami alá új réteg kell

**Keresés** (258 sor). Cím-részlet, típus-szűrő, legfeljebb 20 találat típusonként, ág-szűrve vagy az egész koinóban; a
találatra a pakli odaugrik. Két fele van:
- A **helyi** fele megvan (`/api/kereses` — a két tár állapotában, amit a készülék tart vagy látott); az ág-szűrés a
  felmenő-láncon jöhet, mint a Tudatpontoknál. 🔍 *Egymilliárdnál?* A készülék tudásával nő, nem a koinóval — rendben;
  de egy friss tag szinte semmit nem talál.
- A **hálózati** fele — „hol van, aminek a címében ez áll” — a **kereső-réteg** (`skalazas_terv.md` II. réteg, S8–S10;
  nyitott: SK7 a szelet-megtalálás, SK10 a láthatósági küszöb), ami még egyáltalán nincs. ⭐ A 2. szabály szerint
  elhagyható: ha nem működik, a helyi fele marad — tehát a helyi fele **végleges alak** (D84), nem köztes.

⚠️ **Ugyanez a rés másutt is áll**, és ettől alappillér a kereső-réteg: a `GondolatModal` besorolás-lenyílói
(`/api/kategoria`, `/api/gondolatTipus` — a helyben ismert besorolások teljes listája; a kapu megjegyzése maga mondja,
hogy *„ide kereső kell, nem nagyobb lista”*) és a szövegszerkesztő entitás-hivatkozása (`EntitasKeresoMezo`,
`EntitasHivatkozasPanel`). A szigorú (b) alatt egy friss tag mindhárom helyen csak azt látja, amit véletlenül már ismer.

**Értesítések** (383 sor) **és Értesítési beállítások** (639 sor). A prototípusban a szerver írja az értesítést, amikor
valami történik — nyolc fajta: új javaslat, elfogadás, elvetés, szavazat, közeledő határidő, tudatpont-változás (négy
küszöbbel), új gyerek, küszöb-változás —, az entitás ős-láncával (a részfa-szűréshez és a kártya számlálójához); a
beállítás entitásonként szól (fajtánként feliratkozás, küszöbök, „csak ahol pontom van”, csend), és **lefelé öröklődik
az ágon**. Minden mezője `helyi` réteg (H6). Itt nincs szerver, ami írna: az értesítést **a készülék számolja abból, ami
hozzá megérkezik** (szakasz5_terv 6.: „helyben számolva”; az olvasott jel helyi feljegyzés).

⛔ És itt a döntő kérdés: a szigorú (b) alatt a készülékhez CSAK a részvételi szeletek eseményei érkeznek (a pozitív
pontú szeletek és az azonosság-szelet). Ami ott van, arról minden fajta kiszámolható — az új javaslat az érintettnél
bejelentve (D85/1), a gyerek születése a szülőnél, a döntés a lezárás után a számításból (D17), a határidő az óra szerint.
Ami a tartott ágon **mélyebben** történik, az nem érkezik meg: a prototípus „(és leszármazottain)” öröklődése csak a
tartott leszármazottakra teljesíthető. ⭐ A domain itt segít: a prototípus „passzív” szerepe épp a **figyelő** — *„csak
figyeled az entitást és prioritást jelzel a tudatpontoddal”* (`SzerepValasztoModal`). A koinóban a figyelés eszköze a
tudatpont.

## 3. A közös alap, amit az átvizsgálás talált: a fa bejárása össz-pont szerint

⭐ **Az össz-pont lefelé nem nő.** össz-pont(X) = a szerzők pontja X-en + a gyerekek össz-pontja, és a pontok nem
negatívak — tehát egy gyerek össz-pontja sosem nagyobb a szülőjénél. Ebből következik, hogy **„az ág entitásai ágazati
pont szerint csökkenően” legjobb-először bejárással kiszámolható**: a gyökértől (vagy X-től) indulva mindig a legnagyobb
ismert össz-pontút vesszük ki, és a gyerekeit (a fejléc-kérdéssel) betesszük a sorba. Egy 20 kártyás oldal legfeljebb 20
kibontás — a terhe az oldallal arányos, nem a koinóval.

Ugyanez a bejáró hordozza:
- a **lapos „ágazati pont” rendezést** — az egész koinóban (ma csak a helyben ismert részen fut, és semmit nem kér el) és
  ág-szűrve (a Rendezés modál);
- a **Struktúra** nézetet (ugyanez a sorrend, egy csomópont-keretig — a fa a legerősebb ágaktól kifelé nő);
- a **Síkidomot** (a küszöb fölötti gyerekek — ott sor sem kell, csak a fejléc és a folytatása).

⚠️ **Ami hozzá hiányzik:**
1. A fejléc-kérdés **folytatása** (`utan`: az utolsó össz-pont és azonosító) — enélkül a bejáró az 50. gyereknél megáll,
   és ugyanez a korlát a pakli testvér-soráé is (`TESTVER_KORLAT`). Protokoll-bővítés (a telefon úgyis frissül).
2. **A betöltés több körben jön** — ez a szigorú (b) természete, nem hiba: X fejléceit X tartói adják, a gyerekekéit a
   gyerekek tartói, szintenként más készülékek. Egy oldal néhány kérelem; egy több száz csomópontos Struktúra viszont
   tucatnyi, és a függő kérelmek korlátja (≤ 16) meg az őrjárat üteme mellett ez percekig tart. ⏸️ Hogy mennyi, arra
   mérés kell a bejáró előtt (keret, kérelem-szám, körök), és ebből derül ki, kell-e több kulcsos kérelem.

⛔ **Ami NEM monoton, az így nem járható be:** az időrend, a saját (közvetlen) pont és a növekvő irány. Ezekhez egy ág
(vagy az egész koinó) teljes listája kellene, vagy egy új részfa-összegző. A kettő közül az **idő-összegző nem jó**: az
`ido` a szerző órája (az állapot-számítás ezért nem is erre építi a bemenet sorrendjét), és egy jövőbe állított óra a
„legfrissebb” lista élére tűzné az ágát. A **darabszám-összegző** ellenőrizhető volna (ugyanúgy, mint az össz-pont:
bemondás + minták), de ma semmi nem dönt rajta — a prototípusban egy figyelmeztetést szolgált („elkészíted?”).

⭐ **A második közös darab: „X ága alatt van-e?”** A Tudatpontok, a Keresés, a Rendezés helyi módjai és az értesítések
részfa-szűrése mind ezt kérdezi. A felmenő-láncon dől el (a ház `pakliHierarchia`-ja már bejárja, ≤ 64), és ahol egy
felmenő nincs meg, ott „nem eldönthető” (D19) — egy helyen kell megírni.

## 4. A kérdések — javaslattal (D-szintűek, Csabáéi)

**M1. A fa bejárása — a Rendezés ágazati módja, a Struktúra és a Síkidom közös alapja.**

- **(A) ⭐ Egy közös, keretes legjobb-először bejáró a fejléc-kérdésre, a fejléc FOLYTATÁSÁVAL — ezt javaslom.** A ház
  útján kér (függő kérelem, az őrjárat hozza, a lap csendben újrakérdez), a keretet a nézet adja (egy oldal, egy
  csomópont-szám, egy küszöb). Előtte mérés: hány kérelem és hány kör egy oldal, és egy 200 / 500 / 2000 csomópontos
  Struktúra.
- **(B) Mindhárom csak a helyben ismert részt mutatja**, semmit nem kér el. Egy friss tag Struktúrája és Síkidomja szinte
  üres maradna — ugyanaz a helyzet, ami a ház előtt a paklival volt.

**M2. Ami nem monoton (az időrend, a saját pont, a növekvő irány — ág-szűrve és az egész koinóban), és a Struktúra
darabszáma.**

- **(A) ⭐ A helyben ismert részből, kimondva, VÉGLEGES alakként — ezt javaslom.** A lista alján: „csak a készülékeden
  ismert entitások közül”; a Struktúra a darabszám helyén „ismert N (keret: B)” feliratot mutat. Az idő-összegzőt a
  szerző órája miatt nem javaslom; a darabszám-összegző ráér, mert semmi nem dönt rajta.
- **(B) Új részfa-összegző (a darabszám) most** — a fejléc és a bizonyíték alakja megváltozik (előbb mérés).

**M3. Az értesítések hatóköre és helye.**

- **(A) ⭐ A részvételi szeletekből — ahol tudatpontod van (a „passzív figyelő” épp ez) —, és a tartott entitások
  közvetlen gyerekeinek születéséből; ezt javaslom.** A beállítás a TARTOTT ágon öröklődik lefelé, és a felület kimondja,
  hogy egy mélyebb ág eseményeiről csak akkor tudsz, ha ott is van pontod. A postafiók **helyi feljegyzés**, a tár
  végéből számolva (mint a társankénti emlékezetnél: egy állás-jel óta hozzáfűzött események — a terhe az újdonsággal
  arányos), korlátosan (pl. az utolsó 500 tétel / 30 nap); az olvasott jel helyi; a kártya számlálója a tétel
  felmenő-láncából jön; a közeledő határidőt és a döntés kimenetelét az óra szerint számolja (az őrjárat körében és a
  felület kérdésére).
- **(B) A figyelés kiterjeszti a részvételt:** egy készülékenkénti, korlátos lista (mint a `cimjegyzek hirdetes <n>`) a
  figyelt szeleteket pont nélkül is tartatja. ⚠️ Ez a vállalás második, helyi forrása lenne (ma a saját láncból számított,
  D86, D97) — és az ág mélyét ez sem hozza el.

**M4. A Keresés és a kereső-réteg.**

- **(A) ⭐ A modál most a helyi aljára (cím-részlet a két tárban + ág-szűrés), kimondva, hogy a hálózati kereső még nincs;
  a kereső-réteg UTÁNA, külön alappillérként — ezt javaslom.** Saját átvizsgálással és méréssel (S8–S10; az SK7 és az
  SK10 vele dől el), mert három dolog épül rá: a Keresés, a besorolás-lenyílók és az entitás-hivatkozás.
- **(B) A kereső-réteg előbb, a modál utána.** A sorrend elve szerint is védhető; de a helyi fele a 2. szabály miatt
  amúgy is kell, és a modál a réteg megérkezésekor nem változik (csak több találatot kap).

**M5. Az átvétel módja — a ház H3/A-ja szerint** (*„a felület öröklődik, nem rögtönzünk újat”*).

- **(A) ⭐ A prototípus modáljai bájtra változatlanul jönnek át** (a Síkidomé a panellel és a segédeivel, a fő menü
  `GondolatTipusModal`-ja is), a lap fordít (`kartyaAdat.js`, `apiHelper.js`), a koinós többlet alosztályba kerül (mint
  a `koinoPakli.js`), és a Struktúra nyers `fetch`-ét a kapu fogadja (a Bearer-alakot is elfogadja, ugyanazzal a
  jelszóval) — ezt javaslom.
- **(B) Koinós átírások** ott, ahol a forma megváltozik (a Struktúránál).

**M6. A fő menü.**

- **(A) ⭐ A prototípus fő menüje (a `foOldal.js` menüje) a modálokkal együtt átjön — ezt javaslom.** A nyolc modál ág
  nélküli változata onnan nyílik, és onnan az „Új kategória / gondolattípus” is. Ami a P2P-ben más út — a Meghívóim (kód
  helyett esemény, a horgony cseréje — szakasz5_terv 6.), az e-ember beállításai (a Profil, D93/5, és a kulcs mentése) —,
  az a prototípus saját „fejlesztésre vár” jelzését kapja, amíg a saját átvizsgálása meg nem történik; a Kijelentkezés
  kimarad (D15).
- **(B) Később, külön lépésként** — addig a globális változatokból csak a rendezés érhető el (a fejléc választójából).

## 5. A javasolt sorrend (a döntések után)

A függőségek szerint:

1. **Az I. csoport:** a Tudatpontok (a saját láncból; az „X ága alatt van-e?” egy helyen), a besorolások létrehozása a
   kapun (a kép a feltöltésen át), a Rendezés modál (az ág-szűrt helyi módokkal), és a fő menü (M6).
2. **A bejáró (M1):** előbb a mérés, aztán a fejléc folytatása (protokoll) és a legjobb-először bejáró a `pakli.js`-ben;
   rá a lapos ágazati rendezés (az egész koinóban és ág-szűrve).
3. **A Struktúra** — a bejárón, kerettel.
4. **A Síkidom** — a fejlécen és a folytatásán, a küszöbbel.
5. **A Keresés** — a helyi alj, ág-szűrve.
6. **Az értesítés-réteg** és a két modálja (M3).
7. **A kereső-réteg** — külön pillér, saját átvizsgálással (M4).

⚠️ Minden lépés a próba módszere szerint: a bekötést parancssor-próba méri (két készülék, „alap” mód: a lap kártyái a
másik készülékről jönnek), a hosszan futót hosszan futó felülettel (D100, elágazás 101).

## 6. ② A bejáró — a 74. mérés és a kérdések (2026-10-11)

*A D101/M1 szerint a bejáró előtt mérés: `koino/meres/bejaroMeres.js`, a 74. mérés az `eredmenyek.md`-ben.*

**Amit a mérés mondott.** Egy friss készüléken (a koinóból semmit nem tart) a mai menettel egy 20 kártyás oldal 80–114
percig, egy 200 csomópontos Struktúra 6–8 óráig tart — és ez nem a koinó méretétől függ (N = 2000-től 200 000-ig
ugyanaz), hanem a KÉRÉSENKÉNTI KÉSÉSTŐL (a NAT mögötti tartó a kopogtató témáját ~20 percenként nézi) szorozva a sorrend
SZINTJEIVEL (egy csomópont gyerekei csak a kibontása után kérhetők). ⭐ A kapcsolatonkénti több kérelem NEM segít (a
kérelmek úgyis más-más tartóhoz mennek). Ami segít: ha egy kérelemre több szint jön — a tartó maga jár be legjobb-először,
amit tud (az idő és a kérelemszám harmada: egy oldal ~30 perc, ~50 kérelem) —, és ha a közelben egy jól ellátott
(„mindent”, D83/2) tartó van: akkor egy oldal egyetlen körben megjön. A gyerekszám a fejlécben a kérelmek 10–60%-át
spórolja meg (a csomópontok kétharmada levél), a bővebb függő-korlát (64) a Struktúra idejét felezi. A folytatás hiánya
csak a nagy Struktúrát érinti (a 2000-esből 55–107 kimaradna).

**J1. Mennyit adjon egy fejléc-kérdés?**

- **(A) ⭐ A tartó maga jár be legjobb-először, amit tud — ezt javaslom:** a `fejlecek(X, n)` X alatt a legjobb n
  csomópontot adja a SAJÁT tudásából (egy csomópont gyerekeit akkor ismeri, ha a szeletét tartja — a születések oda vannak
  bejelentve), mindegyiket a szülőjével, hogy a kérő a fába illessze. A mai `d` (a legjobb ág d szintig) ennek egy szűkebb
  esete — ezt váltja fel. Protokoll-bővítés (tiszta törés — a telefon úgyis frissül). 🔍 *Egymilliárdnál?* A válasz
  felülről korlátos (n ≤ 50), a tartó terhe a saját tudásával arányos.
- **(B) Marad egy szint + a legjobb ág** — egyszerűbb, de egy oldal ~1,5–2 óra egy friss készüléken.

**J2. A gyerekszám a fejlécben, és a bejáró függő-korlátja.**

- **(A) ⭐ Igen mindkettő — ezt javaslom:** a fejléc bemondja a csomópont gyerekeinek számát (a tartó a szülő szeletéből
  tudja; bemondás, nem ellenőrzött — ha hamis, legfeljebb egy kérés marad el vagy egy fölösleges megy, a döntést nem
  érinti), így a levélre nem kell kérni; és a bejáró függő-korlátja 64 (helyi paraméter, ma 16 — korlátos marad).
- **(B) Nem** — a levelekre is kérünk, 16-os korláttal.

**J3. Több kérelem egy kapcsolaton?**

- **(A) ⭐ Nem kell — ezt javaslom:** a mérés szerint nem ez a szűk keresztmetszet; a protokoll egyszerűbb marad.
- **(B) Mégis** (egy kis koinóban, ahol kevés tartó van, segíthetne) — a mérés ezt nem igazolta.

**J4. Kitől kérjen a bejáró?**

- **(A) ⭐ Az ismert tartók közül előre azt, amelyik X ágából a legtöbbet tartja — ezt javaslom:** a raj-jegyzék (D91)
  szeletenként ismeri a tartókat; aki X ágának több szeletét tartja (egy „mindent” tartó a legtöbbet), annak a G-válasza (J1)
  a legtöbb szintet hozza. Olcsó: helyi döntés a meglévő jegyzékből.
- **(B) Véletlenszerűen a tartók közül** (a mai `fuggoKerelmek` célsorrendje).

**A javasolt sorrend (a döntések után):** a fejléc-kérdés új alakja (J1 + a gyerekszám + a folytatás — egy protokoll-
bővítés) → a bejáró a `pakli.js`-ben (a kérő oldal: a sor, az előre kérés a 64-es korlátig, a célválasztás — J4) → rá a
lapos ágazati rendezés (az egész koinóban és ág-szűrve) → ③ Struktúra.

**D102 (Csaba: „minden javaslatodat elfogadom”):** J1, J2, J4 (A) — megépült (a fázis-2 terv D102-e, elágazás 112–118).

**⚠️ J3 ÚJRA (a 74. mérés pótlása, még aznap).** A „több kérelem egy kapcsolaton” változatot csak véletlen tartókkal mértem;
ott valóban nem számít. De ha EGYETLEN jól ellátott tartó kapja a kérelmeket — a kis, családi koinó, ahol egy laptop
„mindent” tart (D22: a kis családi közösségeknek is P2P-nek kell lenniük) —, a kapcsolatonkénti 1 kérelem mindent sorba
állít: egy oldal 1 kör helyett 6, egy 200-as Struktúra 2–3 perc helyett 46–85 perc (1 perces körrel).

- **(A) ⭐ Egy kapcsolaton egy kérelem-SOROZAT — ezt javaslom most:** a kérő ugyanazon a védett résen egymás után több
  `KERELEM`-et küld (a társhoz illő függőket, legfeljebb 16-ot), a tartó egyenként kiszolgálja, a végén `KESZ`.
  Protokoll-bővítés (korlátos), a mai menet változatlan marad, ha csak egy kérelem van.
- **(B) Marad 1 kérelem / kapcsolat** — egyszerűbb, de a családi koinóban a Struktúra percek helyett órák.

✅ **Csaba: „elfogadom a javaslatodat, legyen az (A)”** — megépült (a fázis-2 terv D102-e, elágazás 119).
