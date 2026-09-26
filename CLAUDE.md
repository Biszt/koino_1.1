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

## ⏭️ HOL TARTUNK — ELŐSZÖR EZT OLVASD (2026-09-26)

### ▶️ SESSION-VÁLTÁS (2026-09-26 késő este) — A KÖVETKEZŐ SESSION INNEN INDUL

**Az állapot:** a D69 (*„UDP mindenhol"*) kész — **nincs TCP a készülékek között**. ✅ **A 43.
terepmérés** (telefon a szomszéd wifijén, laptop otthon): mindkét oldal a tábláról találta meg a
másikat, a rés két router között nyílt ([`eredmenyek.md`](koino/meres/eredmenyek.md) 43.). ✅ **A
D70 — EGY ÍRÓ** megépült, és **Androidon is mérve** (a telefonon 714/714,
[`eredmenyek.md`](koino/meres/eredmenyek.md) 43/b.). **714 önpróba zöld** (27 próba-fájl) a laptopon
és a telefonon; a munkakönyvtár tiszta, a telefon a friss `main`-en.

**Ahogy most működik (egy bekezdésben):** minden út az **állandó UDP-kapun** megy
([`udpKapu.js`](koino/js/csere/udpKapu.js)), és ugyanazt a munkát végzi
(`resMunkaKeszito` a [`koino.js`](koino/koino.js)-ben: csere · kötés · tanulás · fájl-randevú). Az
**őrjárat** a kötésekre, a friss UDP-címekre és az **induló címekre** (`indulocimek.json`) kopog,
**ismételt menettel**. A **`figyel`** = állandó kapu (postaláda). A **kézi `csere`/`hozd`/`tukor`**
a parancs idejére nyit kaput. ⭐ **A tár `frissit()`-tel** olvassa be, amit más folyamat fűzött
hozzá (sorban, egyszerre egy), ⭐⭐ **és a tár mögött az ÍRÓ áll** (D70,
[`iro.js`](koino/js/tar/iro.js)): a fájlhoz csak az a folyamat fűz, amelyik a gépen belüli
csatornán hallgat — a csatorna maga a zár. A kézi parancs a kész eseményt átadja, vagy ha nincs
író, maga lesz az; a saját új esemény csak a lánc végére kerülhet.

⭐ **Kimondott feltevés (Csaba):** két cél-függő NAT között (két mobil szolgáltató) a pajzsfúrás
nehéz lehet — **nem mértük**; addig úgy vesszük, hogy nem áll útban.

#### ⏭️⏭️ A KÖVETKEZŐ SESSION: AZ (a) DÖNTÉS FOLYTATÁSA (Csaba, 2026-09-26)

> *(a):* „a terepmérés után a hozzárendelést a munka végén kapott tábla-kulcs erősítse meg" ·
> és este: *„Az a) döntés folytatásával menjünk tovább, de csak másik sessionban."* — Csaba

⭐ **KÉT TÜNET, EGY HIÁNY:**
1. **Téves hozzárendelés azonos IP-n.** A `udpKapu.js` `talal`-jának (317–319. sor) harmadik
   lépcsője — *„azonos IP, más port = a célunk"*, a mobil NAT portváltása miatt — az IDEGEN
   bekopogóra is lefut: egy **néma** célt sikeresnek könyvel, és **abbahagyja a kopogtatását**.
   Kísérlettel mérve (a [napló](docs/claude_naplo.md) 2026-09-26-i délelőtti átnézése: néma port a
   127.0.0.1-en + egy harmadik kapu ugyanarról az IP-ről bekopog → a néma célra `ok: true`). ⚠️ A
   kézenfekvő javítás (bekopogóra ne fusson) a portváltó mobil NAT-ot rontaná el.
2. **Négyszeres csere** (43. mérés): otthon két készülék két címen érte el egymást (helyi +
   nyilvános — a router hairpinningel), és mindkettő a saját körében is kopogott → **percenként
   négy csere**, egyenként ~1,4 KB; egyperces körrel társanként ~8 MB/nap.

⭐⭐ **A közös gyökér:** a kopogás-kör csak CÍMEKET ismer — hogy két cím ugyanaz a társ-e, az csak
a munka VÉGÉN derül ki, a társ **tábla-kulcsából** (`csere.kapottTablaKulcs`, `vonal.js` 453. sor).

**Hol van ma a tudás, és hol vész el:**
- a kötés-jegyzék tudja a társ tábla-kulcsát (`alairo`), de a `kopogasCeljai` (`kotesek.js` 97.
  sor) a célba csak címet tesz — **a várt azonosság elvész**, mielőtt a kör elindul;
- a `resMunkaKeszito` (`koino.js`) a kapott tábla-kulcsot a kötés feljegyzéséhez felhasználja, de a
  munka eredményében **nem adja vissza** (`return { ...alap, fajlMegjott }`) — **a kör nem tudja
  meg, kivel dolgozott**.

**Az indulás, sorban (előbb a mérés, aztán az építés):**
1. **A délelőtti kísérlet önpróbává** (`udpKapuProba.js`): néma cél + azonos IP-ről bekopogó idegen.
   Ma a hibás viselkedést mutatja — a próba nevezze meg, és a javítás fordítsa zöldre.
2. **A négyszeres csere mérése helyben:** egy gépen a hurok-cím és a helyi cím ugyanaz a társ két
   címen — hány csere megy körönként, és mennyi bájt.
3. ⭐ **Döntési kérdések Csabának, MIELŐTT építünk** (felírni, nem eldönteni): (i) ha a munka végén
   kiderül, hogy a társ nem az, akit a cél várt — mi legyen a könyveléssel és a kopogással? (ii) ha
   egy társt a körben már elértünk az egyik címén, kopogjunk-e a másikon? (iii) ha mindkét fél a
   saját körében is kopog, elég-e egy csere — és ki kezdje?

#### ⏭️ UTÁNA — a sorrend Csabáé

1. ⭐ **A 🅱️ változat (két mobil):** dönt a kimondott feltevésről (két cél-függő NAT).
2. ⏸️ **A UDP-s több forrás** (D68 / 6. — ma egy fájl egy társtól jön a résen): a tervező
   függvények és a `parbeszed` `FAJLKEREK`-ága készen állnak, a résen próbával mérve.
3. ⏸️ **IPv6:** a kapu IPv4-es. Kettős (IPv4+IPv6) kapu — külön lépés.
4. ⏸️ **A kopogás saját üteme** (41. mérés): a tábla-olvasás (~20 mp néma kötésenként) még
   megnyújtja a kört.

#### ⏸️ Ami nyitva maradt (terep és próbák)

- ⏸️ **A két mobil NAT közötti rés** még nincs mérve (lásd a feltevést fent). A telefon frissítése:
  `cd ~/koino_1.1 && git fetch --depth 1 origin main && git reset --hard origin/main && node koino/meres/mind.js > ~/probak.txt 2>&1; tail -3 ~/probak.txt`
  ⚠️ *Előtte a Termuxban `termux-wake-lock` — alvás közben a próbák lelassulnak.*
- ⏸️ **Négy időzítés-érzékeny próba** egyszer-egyszer bukott a telefonokon (2026-09-26-án a
  telefonon kétszer is minden zöld volt): meg kell nevezniük a bukásuk okát, mielőtt bárki
  hozzányúl az időzítésükhöz.
- ⏸️ **Robusztusság (mérendő):** a bekopogóra EGYETLEN visszakopogás megy; ha az vagy a rá jövő
  HALLAK elvész, a kör *„rés nyílt, de a csere elbukott”* lesz (a következő menet pótolja).
- ⏸️ **A sikerszámlálás javítása** (a UDP-sikereket a TCP-kör felülírta) magától jött a TCP-kör
  kivételével; külön próbája nincs.
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
- **A teljes próbasor kimenete fájlba** (`node koino/meres/mind.js > …txt 2>&1`): egy
  szeszélyes bukás csak így nézhető meg utólag.

#### ⛔ Tartós elvek (Csabától — a naplóból ide emelve)

- ⭐ **ENGEDÉLY ELŐRE (Csaba, 2026-09-25):** *„ne kérj engedélyt semmire. mindenre engedélyt adok
  előre."* — commit, push, a következő lépés: **kérdezés nélkül**. A válasz végén ne legyen
  „mehet?" / „pusholhatom?". *(A D-szintű tervezési döntések továbbra is Csabáéi — azokat
  döntési kérdésként kell elé tenni, nem engedélykérésként.)*
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
- ⛔ **Előbb a mérés, aztán az építés** — a mérések jegyzőkönyve:
  [`koino/meres/eredmenyek.md`](koino/meres/eredmenyek.md) (számozott, 1–42.).

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
- **Induláskor, ha a nagy kép kell:** [`docs/utiterv.md`](docs/utiterv.md) (mit építünk, milyen
  sorrendben, és miért) → [`docs/fejlesztesi_terv_fazis2.md`](docs/fejlesztesi_terv_fazis2.md)
  („HOL TARTUNK" + a D1–D70 döntések) → a szakasz-tervek (`docs/szakasz1_terv.md` …
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

A tervezési döntések (**D1–D70**; a D48 elvetve, a D64 is, a D44/D51/D53 tárgytalan) a fázis-2 tervben állnak. A milliárdos lépték szerkezete: [`docs/skalazas_terv.md`](docs/skalazas_terv.md) (2026-08-31 — tervjavaslat, kilenc döntést igénylő ponttal). **Az irány két réteg:** a **DAG** a hitelességé és offline is működik · a **kereső-réteg** a megtalálhatóságé, hálózatot kíván, és **elhagyható**. ⭐ *Ami DÖNT valamiről, az soha ne kívánjon élő lekérdezést; csak a MEGTALÁLÁS kívánhat.*

## 🛠️ NYOLC SZABÁLY, ami MINDEN új kódra érvényes (D30–D32, 2026-08-28)

A koino nem támaszkodhat arra, hogy egy platform-tulajdonos (Google, Apple, böngésző-gyártó) megengedi a működését. Az indoklás és a teljes fenyegetés-elemzés: [`docs/platform_fuggetlenseg.md`](docs/platform_fuggetlenseg.md). **Ezek ellenőrizhető szabályok — kódolás közben tartsd be őket:**

1. **A szállítás cserélhető marad.** A csere-logika (`js/csere/csere.js`) SOHA ne importáljon hálózati kódot; új szállítás a `vonal.js` MELLÉ kerül, ne bele a logikába.
2. **Semmi ne múljon egyetlen címen vagy szolgáltatáson.** Nincs beégetett koino.hu, jelzőpont, STUN, továbbító. Ha ilyen kell, legyen cserélhető és elhagyható.
3. **A bizalom sose a csatornából jöjjön.** Eseményt soha nem fogadunk el azért, mert „megbízható helyről jött" — egyetlen kapu van: `esemenyMentese`.
4. **Legyen mindig kézi út.** Minden automatikus cseréhez tartozzon fájlba mentés / fájlból olvasás. **Ha egy funkció csak online tud működni, az fojtópont.**
5. **Ne épüljön folyamatos kapcsolatra.** ⚠️ *Csaba helyreigazítása (2026-08-29): a döntés NEM feltétlenül napokban mér — lehet órákban is, a tudatpont-változás még sűrűbben. **A lassúságra tehát nem szabad védelemként hivatkozni.*** A szabály viszont áll: ami **másodperces élő kapcsolatot** kívánna (mindkét fél egyszerre online), az visszahozza a törékenységet — ezért postaláda kell, nem élő továbbító (D34).
6. ⭐ **Nulla függőség — és a méret ott számít, ahol UTAZIK.** *(Szétválasztva 2026-09-06, Csaba döntése: „**az adat-csomagnak** kell kicsinek lennie. A telepítendő programnak nem kell kicsinek lennie.")*

   - ⛔ **KEMÉNY: nulla függőség.** Ma **0 npm-csomag**, és ez nem alkudható. Minden új függőség egy újabb fojtópont — valaki más dönthet arról, fut-e a koino. A kriptográfia is ezért a beépített WebCryptóból jön.
   - ⛔ **KEMÉNY: az ADAT-csomag kicsi marad.** Ez a valódi szűk keresztmetszet: a programot egyszer töltöd le, az adat **minden nap utazik** — a telefonodon, a mért hálózaton, a lassú vonalon. A mai mércék: egy esemény **~400 bájt** · egy „nincs újdonság" csere a résen **1,2–1,7 KB** (43. mérés, terepen — TCP-n 334 bájt volt) · a **D21** szerint ~**1 KB/fő** a saját lap (az újjáépítés magja). ⚠️ **Új eseménymezőnél, új protokoll-üzenetnél EZT kell megnézni**, nem a mappa méretét.
   - 🟡 **LÁGY: a program mérete.** Ma **184 fájl, 3160,1 KB** — ⚠️ *ebből a `felulet/` 105 fájl / 949,7 KB, ami 2026-09-06-án érkezett: **örökölt, változatlan** kártya-kód és CSS a prototípusból (5.3).* Nem korlát, de érték: ekkora program **elfér egy üzenetben, és bárki újraírhatja** — ez a fojtópont-védelem másik fele. A felülettel (Szakasz 5) nőni fog, és **ez rendben van**; a szám itt attól hasznos, hogy tudjuk, hol tartunk.

   ⚠️⚠️ **A PROGRAM-MÉRET MÉRCÉJE: a FÁJLOK BÁJTJAINAK ÖSSZEGE, nem a lemezfoglalás.** A `du -sk koino` **920 KB**-ot mond ugyanerre a mappára, mert lemezblokkokat számol (39 fájl × félig üres utolsó blokk). A kettő nem hiba, hanem két különböző kérdés — de csak az egyik az, ami „elfér egy üzenetben". A mérés:
   ```bash
   find koino -type f -printf '%s\n' | awk '{n++; s+=$1} END {printf "%d fajl, %.1f KB\n", n, s/1024}'
   ```
   *(Windowson: `Get-ChildItem koino -Recurse -File | Measure-Object Length -Sum` — a `Sum` bájtban.)*
7. **A böngésző csak kliens lehet, sose előfeltétel** (a D29 pontosítása).
8. **Ne tervezz jogi védelemre.** Ha egy érv így kezdődik: „ezt úgyis megtiltja a szabályozás" — az érv nem érvényes.

## ⛔ ÉS EGY KILENCEDIK, AMI A TÖBBI FÖLÖTT ÁLL (Csaba, 2026-08-31)

> **A skálázhatóság szempontjából az első verziónak IS késznek kell lennie.**

⚠️ **A D13 („nem kell az első verziónak tökéletesnek lennie") NEM vonatkozik erre.** A D13 a *funkciókra* és a *paraméterekre* igaz — a **szerkezetet** viszont nem lehet utólag beletenni. A D22 ezt már kimondta: *„az első kiadás is milliárdra képes program, csak kevesebb emberrel"*, a D21 pedig: *„a szeletelés nem »később, ha a méret kikényszeríti«, hanem az első naptól a tervben van"*. **A lefelé skálázás olcsó, a felfelé nem.**

⭐ **A különbségtétel, amitől betartható:** a **SZERKEZET és az ILLESZTÉS** az első naptól milliárdos; **a megvalósítás mögötte lehet egyszerű**.

🔍 **Ellenőrizhető alak — ezt kérdezd minden új darabnál:** *„Ez mit csinál egymilliárd e-embernél?"* Ha a válasz **„akkor majd kicseréljük"**, a darab **nincs kész**.

⚠️ *Ez a szabály azért került ide, mert Claude 2026-08-31-én pont ezt javasolta („indulj a maival, cseréld később"), és Csaba elutasította. Egy friss session ugyanezt fogja javasolni.* Az első, amit a szabály elkap: a tár-illesztő **`betolt()`** művelete az ÖSSZES eseményt adja vissza — vagyis **nem a fájlformátum a hiba, hanem az illesztés**; gyorsítótárral is csak a rossz kérdés lesz gyorsabb. Részletek: [`docs/skalazas_terv.md`](docs/skalazas_terv.md) 0. szakasz.

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
                                 # A fájl alakja a táré: a másolt esemenyek.jsonl is behozható.
                                 # ⛔ A kapu UGYANAZ: az átírt esemény itt is elbukik.
node koino/meres/mind.js         # a 714 önpróba
node koino/meres/skalaMeres.js   # SKÁLA-MÉRÉS (nem önpróba: számokat ad, nem igen/nem-et)
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
node koino/meres/ebredesProba.js fut    # ÉBREDÉS-PRÓBA egy hálózaton: engedi-e az OS az ébredést
node koino/meres/ebredesProba.js res <cím> <port>   # …és KÉT hálózat között: összeér-e a rés
                                        # (a fal órájához igazított ablakokban — ez a „buli"); utána: olvas
```

⭐ **A valódi üzemmód: `node koino/koino.js orjarat [perc] [port]`** — a készülék **magától dolgozik**: nyitva tartja a kaput (postaláda) ÉS időnként végigmegy a társ-listán. *Csaba vette észre, hogy eddig minden csere kézi indítású volt, pedig a D33 terve erre épül.* Egy „nincs újdonság" csere a résen **1,2–1,7 KB** (43. mérés; TCP-n 334 bájt volt). ⚠️ Két készülék között ma körönként akár **négy** is lemegy (két cím × két irány, 43. mérés) — egyperces körrel ez társanként ~8 MB/nap, ötperccel ~1,6 MB; a tábla-kulcsos hozzárendelés (az (a) döntés folytatása) negyedelné. ⚠️ Ez NEM sérti az 5. szabályt: a kör végén minden elenged, a készülék alszik a következőig.

📱 **Telefonra telepítés (Termux + Node):** [`docs/telepites_telefon.md`](docs/telepites_telefon.md) — a Szakasz 2 / 4. lépéséhez. `git clone --depth 1` a nyilvános repóból (5,6 MB a 23 helyett). A `koino/` mappa **önmagában futtatható**: 184 fájl, 3160,1 KB (a `tar.gz` csomag ~80 KB), nulla függőség — *ugyanaz a szám, mint a 6. szabálynál; ha az egyik változik, mindkettőt vezesd át.* ⚠️ A mércét a 6. szabály mondja meg: **bájtok összege, nem `du`**.

**Két készülék egy gépen** (Szakasz 2 / 1. lépés — a `KOINO_ADAT` két külön „készüléket" ad, saját kulccsal):

```bash
KOINO_ADAT=./adat-A node koino/koino.js figyel 7373
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
- **Önpróbák:** `node koino/meres/mind.js` — 714 próba huszonhét fájlban; a kilépési kód 1, ha bármi bukott. Egy réteg külön is: `node koino/meres/mind.js szabaly`. ⚠️ A szűrő **részszóra** illeszkedik: a `tar` a `tarsak`-ot is elindítja (13 + 26 = 39) — ez nem hiba, de a próbaszám olvasásakor félrevezet. Nincs teszt-könyvtár. A koino részletes naplója alapból néma, `KOINO_NAPLO=1`-gyel kapcsolható be.
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
- `js/esemeny/esemeny.js` — aláírás és ellenőrzés; az esemény **neve a gondolatának lenyomata** (mint a gitben).
- `js/tar/fajlTar.js` — a tár: **hozzáfűzhető fájl** (`esemenyek.jsonl`), soronként egy esemény. Nincs adatbázis-motor és nincs séma-migráció; a tároló csak `betolt()`-öt és `hozzafuz()`-t tud — „módosít" és „töröl" nincs, mert a modell szerint nem is létezhet. ⭐ **És `frissit()`-et** (2026-09-26, 43. mérés): egy készüléken több folyamat ír ugyanabba a fájlba (őrjárat, második ablak, felület), a mutató viszont megnyitáskor épül — ez olvassa be a fájl új végét.
- `js/tar/iro.js` — ⭐⭐ **AZ ÍRÓ** (D70, 2026-09-26): koinónként és készülékenként EGY folyamat fűz a tárhoz. **A csatorna maga a zár** (Windowson cső, máshol fájl-foglalat az ideiglenes mappában — ott az író minden hozzáfűzés előtt ellenőrzi, hogy még ő hallgat-e). Aki nem író, a kész, aláírt eseményt átadja; az író SENKI helyett nem ír alá, ugyanazon a kapun enged be mindent (3. szabály), és SORBAN dolgozik: a saját új esemény csak a lánc végére kerülhet („ELAVULT"), a hálózatról jött idegen elágazás bizonyítékként megmarad (D19). ⛔ A csatorna nem tartja életben a folyamatot (a kézi parancs kilép).
- `js/tar/esemenyTar.js` — a lánc kezelése; a tárolót **kívülről kapja** (első paraméter), így a szabályok egy példányban élnek. **Ellenőrizetlen esemény nem kerül a tárba**, és eseményt **soha nem módosítunk/törlünk**.
- `js/allapot/szabalyok.js` — **a szabály-réteg**: egy helyen dönti el, mely események **számítanak** (tudatpont-keret, javaslat-jogosultság). *Amit a számítás nem ellenőriz, az nem szabály, csak illemtan* — a felület a másik gépen nem véd semmitől. A szabálysértő eseményt **nem törli**, csak kihagyja és felsorolja (D19).
- `js/allapot/allapotSzamitas.js` — események → entitások. „E-emberenként az utolsó nyer", ezért **nem kell globális sorrend**. A 0 tudatpontos entitás **nem létezik** (D14). ⚠️ A bemenetet **egy helyen rendezi** (`rendezettBemenet`: szerző + sorszám + azonosító), mert az ÉRTÉKEK sorrend-függetlenek voltak, a **FELSOROLÁSOK nem** — a csere után a két gép ugyanazokat az entitásokat más sorrendben mutatta. Nem az idő szerint rendez: az `ido` a szerző órája.
- `js/allapot/osszehasonlitas.js` — **„ugyanazt látjuk-e?"**: az állapot ujjlenyomata egyetlen 43 karakteres szövegben (entitások, javaslatok, egyezmények, jelzések), és az `elteresek`, ami megmondja, **melyik szakaszban** térnek el. Az `ujjlenyomat` parancs ezt írja ki. ⚠️ Időfüggő — csak azonos pillanatra hasonlítható.
- `js/allapot/javaslatSzamitas.js` — a döntéshozatal; **az egyezmény itt születik számításként**. Az összehasonlítások **egész aritmetikával** (kereszt-szorzás), hogy kerekítés soha ne dönthessen el szavazást. ⚠️ **A lezárás időrendben**: a határidő után érkezett esemény (szavazat, tudatpont-rendezés, érték javaslat) már nem számít bele — különben a lezárt döntés visszafordulna.
- `js/allapot/szerkesztesiVegrehajtas.js` — ⭐ **A HARMADIK FÁZIS** (2026-09-06): az elfogadott **szerkesztési** egyezmények rávezetése az entitásokra. A **D8** gyakorlati alakja: az egyezmény a TÉNY, az entitás mai alakja a HATÁLY. ⚠️ Az **általános** egyezményből soha nem következik entitás-változás (D27). A sorrend a **lejárat** szerint dől el (holtversenynél az azonosító), sosem a térkép bejárása szerint — különben két gép mást mutatna. Amit nem tud végrehajtani, azt **felsorolja** (`kihagyottak`), nem hallgatja el (D19).
- `js/allapot/pakli.js` — ⛔⛔ **EGY OLDALNYI KÁRTYA, soha nem az egész** (5.2): `darab` felülről korlátos, kulcs-alapú kurzor, a lista nem hordoz szövegeket. ⭐ A **horgony** (első N esemény + a pillanat) tartja együtt a lapozást; a közben érkezettet az `ujdonsag` bejelenti. *Helyi feljegyzés, nem esemény.*
- `js/felulet/kapu.js` — a **helyi kapu** a böngészőnek (5.1). ⛔ **Semmit nem tud a koinóról** — ettől marad a böngésző cserélhető rajzoló (7. szabály). Öt őr: hurok-cím · jelszó · Origin · Host · útvonal.
- `js/allapot/identitas.js` — ⭐ **KI TAG?** — és ez **számítás, nem esemény** (D17). A 9/c terv 4.1–4.3 lépése — **három kérdés, ugyanazzal a vázzal** (TAG ← meghívás · TANÚSÍTHAT ← felhatalmazás · 2. LÉPCSŐS ← tanúsítás): az **alapító** a gyökér (a `KoinoLetrehozas` szerzője), mindenki más a **saját `Belepes` horgonyával** és **egy** érvényes meghívással tag. ⭐⭐ A meghívás a **meghívott szeletébe** kerül (ettől korlátos a „hányan hívtak be?"), és **magával hozza a meghívó horgonyát** (`adat.sajatBelepes`) — így a lánc bejárása tiszta mutató-követés, keresés nélkül. A **gyorsítótár nem kényelem, hanem a lényeg**: nélküle 3^mélység, vele az ős-halmaz (mérve: 17,7 → 40,7 ős 1500 → 20 000 főnél). ⚠️ A hiányzó esemény **nem vád**, hanem „nem ellenőrizhető" (D19), és a **kör** nem szül tagságot.
- `js/allapot/jelzesek.js` — ⭐⭐⭐ **A VALÓDI VÉDELEM: a kontraszt-jelzés** (9/c 4.4). *„Hány olyan embert tanúsítottál, akinek nincs önálló élete a közösségben?"* — a becsületes alapvonal **0,3**, a megvett tanúsítóé több száz; mérve **100% / 9–25%** minden támadó ellen. ⭐ Nem a NAGY SZÁM kell hozzá, hanem a **kontraszt** — ezért a 18 ugyanolyan feltűnő, mint a 293. ⛔ **Ez a fájl SOHA nem ítél és nem dönt:** csak számokat ad, nincs benne „gyanús" mező, és a **döntés-réteg nem importálja** (ellenőrizhető szabály, nem ígéret). A visszavonás emberi út (D46).
- ⭐⭐ **A VISSZAVONÁS (4.5), és a szép megkülönböztetés benne:** a **felhatalmazás az enyém** — én adtam, én veszem vissza, egyoldalúan („az utolsó nyer", mint a tudatpontnál); a **tanúsítás állítás a múltról**, azt nem lehet visszavonni (D46). ⭐ És Csaba döntése (b): a visszavonás **csak előre hat** — aki elveszíti a megbízást, többet nem tanúsíthat, de a **már kiadott tanúsításai érvényben maradnak** (D47), különben néhány ember összebeszélve becsületes emberek tömegétől venné el a pénztárcát. Ehhez a tanúsítás **bemondja**, mire támaszkodott (D42-minta). ⭐⭐ **És a szigorítás, amit Csaba kérdése hozott ki (D61):** a tanúsítás **lehorgonyoz a saját szeletébe** — elköti, meddig látta a rólam szóló eseményeket. Ha a visszavonás ezen **belülre** esik, a tanúsító **bizonyíthatóan tudott róla**, és a tanúsítás **nem számít** (kemény szabály, mert a saját aláírásából következik). ⚠️ Aki a visszavonás **előtti** pontra horgonyzott, azt **nem büntetjük** — az a normális eset egy P2P hálózaton. ⭐⭐⭐ **És a rést a BULI-ELISMERÉS zárja be (D61):** a `Lattam` esemény aláírja, **meddig látok** a saját szeletemben — és mivel **a saját láncomban van sorrend** (a `sorszam`, amit csak én írhatok), minden KÉSŐBBI eseményem bizonyíthatóan azután keletkezett. ⭐ **Globális óra nélkül.** Így a „szándékosan régi horgony" trükk sem működik: horgony nélkül is elkapjuk azt, aki egyszer már elismerte, hogy látja a visszavonást. ⚠️ Aki SOHA nem ismeri el, hogy lát, az nem szeg szabályt — de **kilóg a ritmusból**, és ezt a jelzés mutatja (`elismeresek`).
- `js/muveletek.js` — a **tizenhat** művelet; mindegyik: lánc vége → aláírt esemény → mentés. ⭐ A `meghivas`, a `felhatalmazas` és a `tanusitas` **ugyanaz az alak** (`allitokRola`): az esemény a MÁSIK szeletébe kerül, és **hozza a saját horgonyomat** — ettől lesz az ellenőrzés keresés nélküli mutató-követés.
- `js/csere/csere.js` — **a csere-protokoll logikája, hálózat nélkül** (Szakasz 2): `ALLAS` (szerzőnként legnagyobb sorszám + hézagok + elágazások + a lánc **ujjlenyomata**) → `KEREK` → `ESEMENY`. ⚠️ A „legnagyobb sorszám önmagában elég" **nem igaz** — a hézag és a lánc közepén rejtett elágazás miatt; mindkettő rontás-próbával igazolva. A beérkezett esemény ugyanazon az `esemenyMentese` kapun megy be, mint a saját: **a hálózat nem kap engedékenyebb kaput**.
- `js/csere/vonal.js` — **a párbeszéd**: soronként egy JSON-üzenet egy foglalat-szerű kapcsolaton (2026-09-26 óta csak a UDP-résen — D69/2: nincs TCP a készülékek között) (ugyanaz az alak, mint a táré). Szimmetrikus — egyetlen `parbeszed` fut mindkét oldalon —, és **a csendes körnél áll meg** (se nem adtunk, se nem kaptunk). Semmit nem tud a koinóról. ⭐ **A kör egy 43 karakteres `LENYOMAT`-tal kezdődik** (D35, B. lépés): ha a két fél tudása egyezik, a részletes `ALLAS` el sem indul — mérve **334 bájt a 16 158 helyett**. ⚠️ A csendes kör feltétele emellett is megmarad: a lenyomat az egyetértést fogja meg, a csendes kör a hibás/rosszindulatú felet.
- `js/csere/udpVonal.js` — **a csere UDP-n** (D37–D39, E. lépés; 2026-09-26 óta az EGYETLEN szállítás): egy foglalatnak látszó utánzat, ami alatta UDP-t használ, így a `parbeszed` **változatlanul** fut az átfúrt résen (1. szabály gyakorlati haszna). Amit a UDP nem ad meg, azt itt pótoljuk: sorszám + nyugta + újraküldés. ⚠️ **És két őr, ami először hiányzott** (2026-08-30): a `kiurites()` — a lezárás előtt meg kell várni, hogy az utolsó darabot nyugtázzák, különben eldobjuk (a `parbeszed` az utolsó `LENYOMAT`-ra már nem vár) —, és a **tétlenségi óra**, hogy a néma társ ne ragaszthasson be. E kettő nélkül a csere **végtelenül várt**; rontás-próba őrzi mindkettőt.
- `js/csere/udpKapu.js` — ⭐ **az állandó UDP-kapu** (D69/3, 2026-09-25; a D69/2 óta az EGYETLEN kapu): egy foglalat a teljes futásra — bármikor felel a kopogásra, a bekopogóra visszakopog, társanként egyszerre egy munka (`FOGLALT`), a jegyzéke időben ÉS darabra korlátos. A munkát kívülről kapja (`resMunkaKeszito` a `koino.js`-ben — az őrjárat, a `figyel` és a kézi parancsok közös gépezete).
- `js/csere/pajzsfuro.js` — **a lyukfúrás** (D37, E. lépés): mindkét fél kifelé kopog egy **rögzített helyi portról**, és a két rés a közepén találkozik — fogadóképes fél nélkül. A `mindketIrany` a mérce: nem elég kapni, a MI csomagunknak is át kell jutnia. ⚠️ A `kulsoCim` (STUN) **segédeszköz és paraméter** (2. szabály): a szerver cserélhető, ha nem válaszol a koino ugyanúgy működik, és **semmilyen bizalom nem jár vele** — egy portszámot mond, nem igazságot. Hosszú távon a saját tükrünk váltja ki (`vonal.js`, `latlak`).
- `js/csere/kapunyitas.js` — **megkérjük a routert**, hogy engedje be a kapcsolatot (NAT-PMP, PCP, UPnP — mind a három megmérve). ⚠️ **Segédeszköz, nem előfeltétel** (2. szabály): ha a router nemet mond, a koino ugyanúgy működik, csak ő kezdeményez kifelé. A fejlesztő routere mind a hármat elutasította — ezért fordult a terv a D33 felé.
- `js/csere/helyiFelfedezes.js` — **a helyi felfedezés** (Szakasz 2 / F. lépés): azonos wifin lévő készülékek megtalálják egymást, **cím beírása nélkül**. Két szerep: aki keres, **kiált** (`helyiFelfedezes`), aki dolgozik (`orjarat`/`figyel`), az **felel** (`felfedezoValaszolo`) — magától senki nem kiabál. ⚠️ **Kényelem, nem előfeltétel** (2. és 4. szabály): ha a wifi tiltja a kliensek közti forgalmat, a kézi `tars` út marad. Bizalom nem jár vele (3. szabály): a cím a **foglalatból** jön, nem az üzenetből, és sosem lesz esemény. ⚠️ Két dolog mérésből jött: **ismételve kell kiáltani** (egyszeri kiáltásnál a később induló nem hall semmit), és a válasz **a csoportnak is** megy (egy gépen több példány osztozik a rögzített felfedező porton).
- `js/csere/tablaKulcs.js` — ⭐⭐ **A TÁBLA-KULCS** (2026-09-20): a készülék neve a hirdetőtáblán és a kötések azonosítója. ⛔⛔ **SOHA nem az azonosságod** (D6): a `kulcs.json` azt mondja meg, KI vagy, ez azt, hogy HOL érhető el ez a KÉSZÜLÉK. Két kulcspár: **Ed25519** (a rekesz neve, ez írja alá a bejegyzést — BEP 44) és **X25519** (ebből lesz a társankénti közös titok). ⭐⭐ **A titok SOHA nem utazik:** mindkét fél a saját titkos kulcsából és a másik nyilvánosából SZÁMÍTJA ki — *a csere-csatorna nyílt, ami rajta megy, azt bárki elolvashatja az úton.*
- `js/csere/kotesek.js` — ⭐⭐ **A KÖTÉS-HÁLÓ könyvelése** (Csaba ötlete, 2026-09-18): kivel tartok rendszeres kapcsolatot. ⛔ **A kötést a tábla-kulcs azonosítja, nem a cím** — *mert épp a cím az, ami elromlik.* ⭐ Ezért őrzi a társ utolsó ismert címét akkor is, ha a névtelen jegyzékből elévült: egy kopogás ~60 bájt, *olcsóbb megpróbálni, mint elfelejteni valakit, akivel tegnap beszéltünk.* K=3, legfeljebb 5 (9. szabály). ⚠️ Helyi megfigyelés, sosem terjed (3. szabály).
- `js/csere/tabla.js` — ⭐⭐⭐ **A HIRDETŐTÁBLA** (2026-09-20): „leszakadtam, itt az új címem" — **társanként külön rekesz**, a tartalom titkosítva, a bejegyzés aláírva. ⭐⭐ **A rekesz „sója" a két NYILVÁNOS kulcsból számítódik**, a DHT-beli cél pedig a kulcs és a só lenyomata — *egy kívülálló tehát nem tudja kiszámolni, hol keresse: nem azért nem olvassa el, mert megtiltjuk, hanem mert nem találja meg.* ⚠️ Hálózatot nem nyit (1. szabály): bejegyzést KÉSZÍT és OLVAS; hogy mi viszi a táblára, az a hívó dolga (ma a `dht.js`).
- `js/csere/dht.js` — **a tábla mai megvalósítása**: függőség nélküli BitTorrent-DHT kliens (BEP 5 + 44). ⚠️ **Segédeszköz, nem előfeltétel** (2. szabály): ha nem elérhető, a koino megy tovább, csak a leszakadt társ visszatalálása lassul. ⭐ A **belépő csak kurbli**: a készülék a saját emlékezetéből indul, és a csere **át is ad** néhány megismert gépet a társaknak (Csaba döntése, 2026-09-20).
- `js/csere/tarsak.js` — **a társ-lista** (D33, Szakasz 2 / A. lépés) — 2026-09-26 óta az **induló címek** (`indulocimek.json`, tiszta lap): a `csere` és az őrjárat nem egyetlen címre megy, hanem a listára — a kapun, egyszerre. ⭐ **Egy társ bukása nem hiba, hanem a normális működés** — a kör megy tovább, és a bukás csak feljegyződik. Hálózatot **nem importál**: a kopogás a kapué, ez csak könyvel (`kopogasMegfigyelesei`, 1. szabály), ezért hálózat nélkül önpróbázható. A `utoljara`/`sikertelen` mező **helyi megfigyelés** — sosem terjed, és semmit nem dönt el a koinóban.
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
