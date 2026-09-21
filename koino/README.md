# koino — a P2P program

*Ez a mappa a **Fázis 2** koinója: a készüléken futó, aláírt eseményekre épülő,
központi szerver nélküli program.*

## Mi ez, és mi nem

- **Ez:** az új koino, ami a **D22** döntés szerint az első kiadástól P2P
  („a központi server részét most nem kell fejleszteni"), és a **D29** szerint **önálló
  program** — nem böngészőben fut.
- **Nem ez:** a `../backend` + `../frontend`. Az a **prototípus**, ami tanított — ma is fut
  (koino.hu), és **változatlanul marad**. Nem alakítjuk át, nem költöztetjük: az éles
  rendszer a repó gyökeréből épül, és működnie kell.

## ⭐ Miért nem böngésző? (D29, 2026-08-28)

> „Tulajdonképpen hagyjuk is el a böngészős részt, mert csak bezavar. A tiszta P2P
> kapcsolatra koncentráljunk." — Csaba

A böngésző korlátai nem a koino korlátai. Egy lap **nem tud portot nyitni**, nem fogad
kapcsolatot, **elrejti a saját címeit**, csak „biztonságos környezetben" enged
kriptográfiát, és bezáráskor eltűnik. Az egész infrastruktúra, amit a P2P-hez emlegetni
szoktak — jelzőpont, STUN, továbbító —, jórészt **ebből** következik, nem magából a
P2P-ből.

Ezért a koino önálló program. A böngésző később lehet **egy kliens**, de nem ő szabja meg,
mire képes a koino.

## Futtatás

Nincs telepítendő függőség — csak Node (a kriptográfia a beépített WebCryptóból jön).

```bash
node koino/koino.js
```

| Parancs | Mit csinál |
|---|---|
| `node koino/koino.js` | mi az állapot (gondolatok, javaslatok, egyezmények) |
| `node koino/koino.js allapot 3` | **mi lesz 3 nap múlva** — a döntési idő napokban mérhető |
| `node koino/koino.js kulcs` | ki vagyok, hol a kulcsom és az adatom |
| `node koino/koino.js mentes kulcs.json` | a kulcs kimentése (ez te vagy — mentsd el) |
| `node koino/koino.js visszatolt kulcs.json [felulir]` | ⭐ **…és a visszahozása** egy másik készüléken (2026-09-15). Meglévő kulcsot csak a kimondott `felulir` ír felül — a régi azonosság elveszne (D15) |
| `node koino/koino.js koino "Név"` | koino létrehozása |
| `node koino/koino.js gondolat "Cím" "szöveg" [típus] [kategória...]` | új gondolat (+100 tudatpont, enélkül nem létezne); a besorolás elhagyható, rövidítéssel is megadható |
| `node koino/koino.js kategoria "Név" [ikon] [leírás]` | ⭐ **új kategória** (5.4) — önálló entitás, saját tudatponttal. Az ikon lehet **emoji** vagy kép-cím |
| `node koino/koino.js gondolattipus "Név" [ikon] [leírás]` | ⭐ **új gondolattípus** (kérdés, válasz, témakör, ismeret, feladat…) |
| `node koino/koino.js pont <azonosító> <pont> [passziv]` | tudatpont-rendezés |
| `node koino/koino.js javaslat <azonosító> "Új cím"` | szerkesztési javaslat |
| `node koino/koino.js szavaz <javaslat> tamogat\|ellenez\|tartozkodik` | szavazat |

**A Szakasz 2 parancsai** — a csere két készülék között:

| Parancs | Mit csinál |
|---|---|
| `node koino/koino.js ujjlenyomat` | **„ugyanazt látjuk-e?"** — az állapot 43 karakteres lenyomata |
| `node koino/koino.js ujjlenyomat kiment\|osszevet <fájl>` | ⭐⭐ **…és ha NEM, akkor MIBEN?** (2026-09-21) A lap egy fájlban átvihető a másik készülékre, és ott **megnevezi az eltérő szakaszt**. ⛔ A vonalra nem tesszük (6. szabály), ez a **4. szabály útja**. ⚠️ Fejlesztői műszer: az összefoglaló minden entitást tartalmaz |
| `node koino/koino.js orjarat [perc] [port]` | ⭐⭐ **a készülék magától dolgozik**: kaput tart nyitva ÉS időnként kiszól minden társnak. Ez a valódi üzemmód |
| `node koino/koino.js figyel [port]` | ⭐ **postaláda** (D34): átveszi mások eseményeit, eltárolja, és a következő beszélgetésnél továbbadja |
| `node koino/koino.js felfedez [mp] [port]` | ⭐ **ki van még ezen a wifin?** — cím beírása nélkül megtalálja a helyi készülékeket, és felveszi őket társnak |
| `node koino/koino.js kulsoport [port]` | **hogy látszik kívülről a portom?** — a NAT átírja, ezt kell megmérni a fúrás előtt |
| `node koino/koino.js pajzsfuro <cím> <port>` | ⭐⭐ **pajzsfúrás**: mindkét fél kifelé kopog, a két rés a közepén találkozik — és ha átjut, **azonnal cserél is** |
| `node koino/koino.js tabla [kiir\|olvas]` | ⭐⭐⭐ **a HIRDETŐTÁBLA** (2026-09-20): a kötéseim · az új címem a társaim **külön rekeszébe**, titkosítva · és hol vannak ŐK most. ⛔ A tábla-kulcs **nem az azonosságod** (D6) |
| `node koino/koino.js csere <hoszt> <port>` | kapcsolódás egy megadott készülékhez |
| `node koino/koino.js csere` | ⭐ csere **minden társsal** — egy elérhetetlen társ nem dönti el a kört |
| `node koino/koino.js hozd <azonosító> [cím] [port]` | ⭐ **böngésző-lekérés** (3.4): „add ide EZT az egy entitást" — a rendes csere mindent hoz, ez **válogat**. A szelet-címjegyzékből, aztán a társ-listából keres |
| `node koino/koino.js tarsak` | kik a társaim, és melyikkel mikor sikerült |
| `node koino/koino.js tars <hoszt> [port] [név]` | társ felvétele (levétel: `tars torol <hoszt> [port]`) |
| `node koino/koino.js tukor <hoszt> [port]` | ⭐ **kívülről hogy látszom?** — a másik visszamondja, milyen címről/portról lát (STUN helyett) |
| `node koino/koino.js cimek` | milyen címeken érhető el ez a készülék |
| `node koino/koino.js kapu [port]` | megkéri a routert, hogy engedje be a kapcsolatot (NAT-PMP / PCP / UPnP) |

**A Szakasz 5 parancsa** — a felület:

| Parancs | Mit csinál |
|---|---|
| `node koino/koino.js felulet [port]` | ⭐ **a helyi kapu** (5.1): kiszolgálja a felületet a `127.0.0.1`-en, és kiír egy címet, amiben benne van az **indításkor generált jelszó**. ⚠️ **NE keverd a `kapu` paranccsal** — az a ROUTERT kéri meg, hogy engedjen be kívülről; ez a saját gépeden nyit ajtót a böngészőnek |

⛔ **Négy őr védi**, mert a kulcsod itt van a gépen: **csak a hurok-címre kötünk** ·
**jelszó** · **Origin-ellenőrzés** (idegen weboldal `fetch`-e ne jusson be) ·
**Host-ellenőrzés** (DNS-visszakötés ellen) — és egy ötödik a fájloknál: **útvonal-őr**,
hogy a `koino-adat/kulcs.json` ne legyen elkérhető. ⚠️ *A jelszó NEM a koino biztonsági
rétege (3. szabály): a kapu változatlanul az `esemenyMentese`. Egyetlen dolgot véd — hogy
egy másik weboldal ne írhasson eseményt **a te kulcsoddal**.*

Az azonosítókból elég a **rövidítés** (mint a gitben). Az adat helye alapból a
`koino-adat/` mappa; máshová a `KOINO_ADAT` környezeti változóval tehető. A részletes
napló `KOINO_NAPLO=1`-gyel kapcsolható be.

⚠️ **A parancssori arc fejlesztői eszköz**, nem a koino felülete — ugyanúgy, ahogy a
korábbi böngészős nézet is az volt. A valódi felület a prototípus pakli-nézetéből
öröklődik (D22), amikor a modell megállapodott: [`../docs/felulet_terv.md`](../docs/felulet_terv.md).

## Önpróbák

```bash
node koino/meres/mind.js
```

Huszonhat próba-fájl, **680 önpróba**; a kilépési kód 1, ha bármi bukott. Egy réteg külön is
futtatható: `node koino/meres/mind.js szabaly`. ⚠️ A szűrő részszóra illeszkedik — a `tar`
a `tarsak` réteget is elindítja.

⚠️ *Ha új próba kerül be, ezt a számot itt is vezesd át* — a 6. szabály mércéje attól
ellenőrizhető, hogy friss. *(Ugyanez a mappa mérete: ma **181 fájl, 3036,6 KB**, nulla
npm-csomag.)* ⛔ 2026-09-21-ig mindhárom szám elavult volt (23 fájl / 647 próba / 2903,6 KB
a valódi 26 / 672 / 2995,5 helyett) — *egy szám, amit nem vezetünk át, rosszabb a hiányzónál:
úgy néz ki, mintha mérték volna.*

⚠️ *2026-09-06 óta a program mérete **lágy** preferencia — a kemény korlát az **adat-csomagra**
került (6. szabály, `../CLAUDE.md`). A szám itt attól hasznos, hogy tudjuk, hol tartunk.*

⚠️⚠️ **A méret mércéje: a FÁJLOK BÁJTJAINAK ÖSSZEGE, nem a lemezfoglalás.** A `du -sk koino`
ugyanerre a mappára **920 KB**-ot mond, mert lemezblokkokat számol, nem bájtokat. A kettő
nem ellentmondás, csak két különböző kérdés — de „egy üzenetben elfér" csak az egyikre igaz:

```bash
find koino -type f -printf '%s\n' | awk '{n++; s+=$1} END {printf "%d fajl, %.1f KB\n", n, s/1024}'
```

| Fájl | Mit bizonyít |
|---|---|
| `meres/kanonikusProba.js` | ugyanaz az adat mindig ugyanazt a lenyomatot adja (+ regressziós horgony) |
| `meres/kulcsProba.js` | ⭐ **a személyazonosság** (2026-09-15): a kimentett kulcs visszahozza ugyanazt az e-embert — és a bizonyíték nem a szöveg, hanem egy **aláírt esemény**. ⛔ A visszatöltés nem ír felül némán, és az átírt `azonosito` mező lelepleződik |
| `meres/esemenyProba.js` | az esemény hamisíthatatlan, a kettős cselekvés leleplezhető |
| `meres/tarProba.js` | az események megmaradnak, ellenőrizetlen nem kerül a tárba |
| `meres/allapotProba.js` | a sorrend nem számít — ugyanaz a halmaz, ugyanaz az állapot |
| `meres/javaslatProba.js` | a döntés kiszámítható, és **a lezárt döntés nem fordul vissza** |
| `meres/szabalyProba.js` | a szabályokat a **számítás** őrzi, nem a felület |
| `meres/csereProba.js` | a csere teljes: a hézag és a rejtett elágazás is kiderül, és a hálózat **nem kap engedékenyebb kaput** |
| `meres/fajlCsereProba.js` | ⛔⛔ **a 4. szabály** (a kézi út): fájlba vinni és fájlból hozni hálózat nélkül — ⭐ és hogy **a fájl sem kap engedékenyebb kaput**: a szövegszerkesztővel átírt esemény elbukik, az idegen koinóé kimarad, a hibás sor nem állítja meg a többit |
| `meres/tarsakProba.js` | ⭐ **egy társ bukása nem dönti el a kört** — a csere nem múlik egyetlen címen |
| `meres/identitasProba.js` | ⭐ **a KÉT LÉPCSŐ és a KONTRASZT-JELZÉS** — a lánc visszavezet az alapítóig, a kör nem szül jogot, a választótestület zárt, a hiány nem vád, és a jelzés a becsületesre néma, a megvettre megszólal |
| `meres/kapuProba.js` | ⭐ **a helyi kapu** (5.1): a négy őr + az útvonal-őr — ⛔ a kulcsfájl nem szerezhető meg, idegen oldal nem jut be, és **a program sehol nem importálja a felületet** (forrás-próba) |
| `meres/fajlProba.js` | ⭐⭐ **a tartalom-címzett fájltár** (5.7): a név a lenyomat — ⛔ a **megrontott fájlt nem adja ki** (újra-lenyomatolás olvasáskor), a duplikátum elnyelődik, és a **típus a bájtokból** jön, nem a kliens szavából (HTML soha nem `text/html`) |
| `meres/fajlIgenyProba.js` | ⭐ **a fájl-igény** (a szállítás első fele): a felderítés **nem kíván új adatot** — az események már elmondják, mely fájlok tartoznak a koinóhoz; ⛔ és a **tudatpont tárolási vállalás** (D3): amire pontot tettem, azt vállaltam |
| `meres/fajlKerelemProba.js` | ⭐ **a fájl-kérelem**: ⛔ **csak arra felelünk, amit kérdeztek** (a fájl-listám elárulná, mit néztem meg — D6), a kérdés és a válasz is korlátos, és ⭐ **a ritkábbat előbb** — de a **vállalás erősebb** a ritkaságnál (D3) |
| `meres/fajlAtvitelProba.js` | ⭐⭐ **a bájtok átvitele** (5.7/B): a részleges fájl **mérete maga az állapot** (onnan folytatódik), ⛔ a lezárás **újra lenyomatol** — a meghamisított letöltés **nem kerül a végleges nevére, és nem hagy hátra semmit**; és a munka szétterül (társanként egy átvitel) |
| `meres/terProba.js` | ⭐ **a belépő tér** (5.6): a koinók FÖLÖTTI nézet — ⛔ **létszám szerint nem lehet rendezni** (D18/2), ⭐ a létszám súlya **három számban** van (tag · nem ellenőrizhető · belépő), és a hiány (ismeretlen születés) **megnevezve** jelenik meg |
| `meres/egyezmenyProba.js` | ⭐⭐ **a hurok bezárul**: az elfogadott szerkesztési egyezmény ÁTÍRJA az entitást — a folyamatban lévő és az általános (D27) nem; a sorrend a **lejárat** szerint dől el; ⛔ a kört csináló áthelyezés kimarad |
| `meres/pakliProba.js` | ⛔⛔ **a 9. szabály** (5.2): a `darab` felülről korlátos, a lista nem hordoz szövegeket, és ⭐ **a lapozás nem csúszik el**, ha közben átrendezik a tudatpontot — a **horgony** tartja együtt a képet |
| `meres/vizsgaProba.js` | ⭐ **a Szakasz 2 vizsgája**: kevert események, csere, **azonos állapot** — és a **postaláda** (D34) |
| `meres/dhtProba.js` | ⭐ **a DHT-kliens** (hirdetőtábla, BEP 44) — hálózat nélkül: a hivatalos tesztvektorok bájtra, a méret-korlátok, és egy hurok-címen futó **hamis DHT**-n a feltétel és a visszakeresés; ⛔ a **hazudó** gép bejegyzését elvetjük, a néma gépek és a halott belépő nem akasztják meg a keresést |

⚠️ **Két mérőeszköz NEM önpróba** — nem igen/nem-et adnak, hanem számokat, ezért a
`mind.js` nem futtatja őket:

- `node koino/meres/skalaMeres.js` — **skála-mérés**: hol van a fal (a 3.2 két
  falledőlését is ez mérte: mentés 495 ms → 1,4 ms, állapotszámítás 4 615 ms → 502 ms);
- `node koino/meres/ebredesProba.js` — **ébredés-próba** telefonon: bír-e a készülék
  ötperces ablakot (mérve: egy óra alvás után is **nulla csúszás**);
- `node koino/meres/szigetMeres.js` — ⭐ **a hamis sziget mérése** (Szakasz 4, a
  **tanúsítási** világ): egy becsületes hálót és egy támadót szimulál, és megmondja, **hány
  hamis azonosság jut be** szabályonként — **és hogy közben nő-e egyáltalán a közösség**.
  ⚠️ *Ezt a világot a 2026-09-06-i átépítés felváltotta; a mérés a történet része.*
- `node koino/meres/dhtMeres.js` — ⭐ **a DHT mint hirdetőtábla** (36. mérés): a VALÓDI BitTorrent DHT-n tesz fel és keres vissza egy aláírt bejegyzést; `tesz` + `keres` két készülékhez;
- `node koino/meres/meghivasMeres.js` — ⭐⭐ **a MEGHÍVÁSOS világ mérése** (a mai szerkezet):
  védelem ÉS ár hat változatban, három jelzés-lencse, és `LEPCSO=1`-gyel a **két lépcső**
  (pénztárca-kapu + a tanúsítói lánc alakja). Kapcsolók: `MELEGIT` · `REJTOZO` · `KITARTO` ·
  `ALLANDO_KOROK` · `VISSZAVONAS` · `MEGTEVESZTETT` · `MEGHIVO_KORLAT`.

Az eredmények: [`meres/eredmenyek.md`](meres/eredmenyek.md).

## A rétegek

| Fájl | Felelősség |
|---|---|
| `js/esemeny/kanonikusAlak.js` | ⚠️ a legveszélyesebb részlet: ugyanaz az adat = ugyanazok a bájtok |
| `js/esemeny/esemeny.js` | aláírás és ellenőrzés; az esemény neve a gondolata lenyomata |
| `js/tar/fajlTar.js` | a tár: **hozzáfűzhető** fájl, soronként egy esemény — ⭐ 3.2 óta **kérdezhető** (`esemeny`, `szerzoLanca`, `szeletEsemenyei`, `sorszamSzerint`), nem csak `betolt()` |
| `js/tar/esemenyTar.js` | a lánc kezelése — ellenőrizetlen esemény nem kerül be |
| `js/kulcs/kulcsTar.js` | a kulcs = a személyazonosság (D15) — kimentés **és visszatöltés**; ⛔ az egyetlen művelet a koinóban, ami ELDOB valamit, ezért kimondott engedély kell hozzá |
| `js/allapot/szabalyok.js` | mely események **számítanak** (keret, jogosultság) |
| `js/allapot/allapotSzamitas.js` | események → entitások |
| `js/allapot/javaslatSzamitas.js` | a döntéshozatal; **az egyezmény mint számítás** |
| `js/allapot/osszehasonlitas.js` | **„ugyanazt látjuk-e?"** — az állapot ujjlenyomata, és hol tér el |
| `js/csere/csere.js` | a csere-protokoll **logikája, hálózat nélkül** (`ALLAS` → `KEREK` → `ESEMENY`) |
| `js/csere/vonal.js` | a **szállítás**: soronként egy JSON-üzenet TCP-n. Semmit nem tud a koinóról |
| `js/csere/kapunyitas.js` | megkérjük a routert, hogy engedje be a kapcsolatot — ⚠️ **segédeszköz, nem előfeltétel** |
| `js/tar/fajlTar.js` → `fajlBlobTarolo` | ⭐ **a fájlok** (5.7): bájtok a **lenyomatuk** neve alatt — az esemény csak a ~100 bájtos hivatkozást hordozza (6. szabály), a bájtok a tartalmi rétegben (D3); olvasáskor **újra lenyomatolunk**, tehát a csatornát nem kell megbízhatóvá tenni |
| `js/csere/fajlAtvitel.js` | ⭐ **a bájtok logikája** (5.7/B): szeletelés (64 KB), a türelem a források számából, és a munka elosztása — három egyidejű **kapcsolat**, társanként legfeljebb egy. ⭐⭐ 2026-09-15 óta **több forrás egy fájlra** (D68 / 6.): munkalopó megosztás, a bukott ág szelete visszakerül, a lezárás joga **egyszer** adódik ki. ⚠️ Hálózatot **nem importál** (1. szabály) |
| `js/csere/fajlKerelem.js` | ⭐ **mit kérdezek a bulin, és mit tanulok belőle** — a kérelem **múlékony üzenet**, nem esemény (Csaba döntése: a böngészésem nem való a láncra); amit tanulunk, az **helyi feljegyzés** (3. szabály) |
| `js/allapot/fajlIgeny.js` | ⭐ **mire van szükségem?** — a gondolat szövegében ott a kép-hivatkozás, a besorolásban az ikon; ez a réteg csak összeveti a lemezzel. ⚠️ Tárat és hálózatot **nem importál** (1. szabály): a „megvan-e?” kérdést kívülről kapja |
| `js/allapot/ter.js` | ⭐ **A BELÉPŐ TÉR** (D25, 5.6): egy kártya minden koinóról, amit ez a készülék ismer — a kulcs és a társ-lista eddig is a koinók FÖLÖTT laktak, a tér ezt teszi láthatóvá |
| `js/csere/fajlCsere.js` | ⛔⛔ **a KÉZI ÚT** (4. szabály): események fájlba és fájlból — ⭐ a kivitel alakja **bájtra a táré** (a másolt `esemenyek.jsonl` behozható), a behozatal pedig a `csere.js` `beolvasztas()`-át hívja, tehát **ugyanazon a kapun** megy be, mint a hálózatról jött |
| `js/csere/tarsak.js` | **a társ-lista** (D33): kikkel próbáljunk cserélni, és milyen sorrendben — ⭐ 3.4 óta a **szelet-címjegyzék** is („kinél van EZ az entitás?"): név nélkül, elévüléssel |
| `js/csere/pajzsfuro.js` | **pajzsfúrás** (E. lépés): mindkét fél kifelé kopog, hogy a két router rése egymásra illeszkedjen |
| `js/csere/udpVonal.js` | ugyanaz a csere **az átfúrt UDP-résen** — sorszám, nyugta, újraküldés, kiürítés és tétlenségi óra |
| `js/csere/helyiFelfedezes.js` | **helyi felfedezés** (F. lépés): aki keres, kiált; aki dolgozik, felel — cím beírása nélkül |
| `js/csere/dht.js` | ⭐ **a BitTorrent DHT kliense** (BEP 5 + 44): egy kis, aláírt, kulcshoz kötött bejegyzés feltétele és visszakeresése — ma ez viszi a **hirdetőtáblát** (35–37. mérés). ⛔ Minden talált bejegyzés aláírását ellenőrzi (3. szabály), a belépők csak paraméterek (2. szabály), a belépő pedig **csak kurbli**: a készülék a saját emlékezetéből indul |
| `js/csere/tablaKulcs.js` | ⭐⭐ **a TÁBLA-KULCS**: a készülék neve a táblán és a kötések azonosítója — ⛔ **soha nem az azonosságod** (D6). Két kulcspár: Ed25519 (a rekesz neve, ez ír alá) és X25519 (ebből lesz a társankénti közös titok, **küldés nélkül**) |
| `js/csere/kotesek.js` | ⭐⭐ **a KÖTÉS-HÁLÓ könyvelése**: kivel tartok rendszeres kapcsolatot — ⛔ a kötést a **tábla-kulcs** azonosítja, nem a cím, *mert épp a cím az, ami elromlik*. K=3, legfeljebb 5 (9. szabály), és a jegyzékből a **legrégebben hallott** esik ki |
| `js/csere/tabla.js` | ⭐⭐⭐ **a HIRDETŐTÁBLA**: „leszakadtam, itt az új címem" — **társanként külön rekesz** (a só a két nyilvános kulcsból: egy kívülálló meg sem találja), a tartalom titkosítva, a bejegyzés aláírva. ⚠️ Hálózatot **nem nyit** (1. szabály) |
| `js/allapot/identitas.js` | ⭐ **KI TAG?** (Szakasz 4, D54–D63): két lépcső — tagság egy **meghívással**, pénztárca **három tanúsítással**; számítás, nem esemény |
| `js/allapot/jelzesek.js` | ⭐⭐ **a kontraszt-jelzés** (a valódi Sybil-válasz): *„hány olyan embert tanúsítottál, akinek nincs önálló élete a közösségben?"* — ⛔ soha nem ítél, csak számokat ad |
| `js/allapot/szerkesztesiVegrehajtas.js` | **a harmadik fázis**: az elfogadott szerkesztési egyezmények rávezetése az entitásokra (módosítás · áthelyezés · törlés · egyesítés · különválás) |
| `js/allapot/pakli.js` | ⛔ **egy oldalnyi kártya, soha nem az egész** (5.2): korlátos `darab`, kulcs-alapú kurzor, horgony a lapozáshoz |
| `js/allapot/felszabaditas.js` | az elakadt tudatpontok visszavétele — **bulikban mérve**, nem időben, és a láncok vége a bizonyíték |
| `js/felulet/kapu.js` | a **helyi kapu** a böngészőnek (5.1) — öt őr, és ⛔ **semmit nem tud a koinóról** (7. szabály) |
| `js/muveletek.js` | a **tizenhat** művelet — mindegyik: lánc vége → aláírt esemény → mentés |
| `koino.js` | a parancssori arc |

⚠️ **Az 1. szabály itt látszik:** a `csere.js` **soha nem importál hálózati kódot** — a
logika és a szállítás külön él, ezért cserélhető ki a vonal bármi másra (fájl, pendrive,
rádió) anélkül, hogy a csere-protokollhoz hozzá kellene nyúlni.

## Hol tartunk (2026-09-18)

> ⭐ **A sorrend külön dokumentumban él:** [`../docs/utiterv.md`](../docs/utiterv.md) —
> *mit építünk, milyen sorrendben, és miért*. Ez itt csak a rövid leltár.

**Szakasz 1 — A HELYI MODELL** *(egy készülék, hálózat nélkül)*: ✅ **kész**. A teljes kör
végigjátszható: koino → gondolat → tudatpont → javaslat → szavazat → **egyezmény**.

**Szakasz 2 — A SZÁLLÍTÁS** *(hogy két készülék egyáltalán összeérjen)*: ✅ **kész**
— terv: [`../docs/szakasz2_terv.md`](../docs/szakasz2_terv.md).

| Lépés | Állapot |
|---|---|
| **1a** a csere logikája, hálózat nélkül | ✅ kész |
| **1b** a vonal (TCP) | ✅ kész |
| **2** a vizsga: két készülék → azonos állapot | ✅ kész |
| **A** több társ: a `csere` társ-listára menjen, ne egy címre | ✅ kész — és két halott címmel is átment a valódi csere |
| **B** olcsó csere: ujjlenyomat előbb, részletes `ALLAS` csak eltérésnél (D35) | ✅ kész — **334 bájt a 16 158 helyett** (50 e-ember, „nincs újdonság") |
| **C** postaláda-szerep kimondása (D34) | ✅ kész — **Anna és Béla soha nem beszélt, mégis mindent tud** |
| **D** terjedő címjegyzék: a társ-lista bővüljön magától | ✅ kész — **B megtanulta Cili és Dóra címét A-tól**, gépelés nélkül |
| **E** pajzsfúrás + UDP-szállítás | ⭐⭐⭐ **kész** (2026-08-29): két háztartás, CGNAT mögül is, **83 ms alatt átfúrva — és a CSERE IS ÁTMENT** rajta |
| **F** helyi felfedezés: azonos wifin, cím beírása nélkül | ✅ kész — ⚠️ kényelem, nem előfeltétel (2. és 4. szabály) |

⚠️ **A lépés-sorrend 2026-08-29-én átíródott** (D33): nem az a kérdés, hogy egy adott gép
**fogadni** tud-e, hanem hogy **a hálózat összefüggő marad-e**. A részletek a
[`szakasz2_terv.md`](../docs/szakasz2_terv.md) 6. pontjában.

⚠️ **D39 — a meleg rés:** minden újrakapcsolódáshoz kell legalább egy társ, akinek a rése
éppen él — vagy mert fogadóképes, vagy mert **folyamatosan fut** (az `orjarat` kifelé
szólása nyitva tartja a rést). Ez olcsóbb bármilyen router-beállításnál.

**Szakasz 3 — A SZERKEZET** *(ettől lett a koino skálázható a szerkezetében)*:
✅ **kész** (2026-09-03).

| Lépés | Állapot |
|---|---|
| **3.1** a kanonikus alak négy új mezője: `entitas` · `entitasSorszam` · `latott` · ⏸️ `lancGyoker` *(lefoglalt hely)* + a **D42-ellenőrzés** | ✅ kész — az ár mérve: **478 → 611 bájt** eseményenként |
| **3.2** a **kérdezhető tár-illesztő** — a `betolt()` helyett célzott kérdések | ⭐⭐ kész — **két mért fal ledőlt**: mentés **495 ms → 1,4 ms** (és lapos), állapotszámítás **4 615 ms → 502 ms** (és lineáris) |
| **3.3** entitás-központú lemez-tár | ⏸️ **elhalasztva** — a 3.2 után ez már mélység, nem szerkezet |
| **3.4** szelet-címjegyzék + **böngésző-lekérés** (`hozd`) | ✅ kész — a lekérés **csak a kért szeletet hozta**, a rendes csere változatlan |

⭐ **Amit a 3.2 tanított:** a `betolt()`-tel nem a *fájlformátum* volt a baj, hanem az
**illesztés** — gyorsítótárral csak a rossz kérdés lett volna gyorsabb. Ezért az illesztés
az első naptól milliárdos (⛔ **9. szabály**), a megvalósítás mögötte pedig maradhat
egyszerű: ma memóriában tartott mutató, és a hívók egyike sem tud róla.

### ▶️ A KÖVETKEZŐ MUNKA (2026-09-18)

⭐ **A részletes terv:** [`../docs/szakasz2_terv.md`](../docs/szakasz2_terv.md) legvége, és a
[`../CLAUDE.md`](../CLAUDE.md) belépője. *Ez itt csak a rövid leltár.*

- ✅ **Szakasz 4 — AZ IDENTITÁS: kész** (2026-09-06): két lépcső, kontraszt-jelzés, visszavonás.
- 🚧 **Szakasz 5 — A FELÜLET: folyik** (5.1–5.8): helyi kapu · kérdezhető pakli · kártyák ·
  belépő tér · szövegszerkesztő · javaslat-modal · fájl-réteg és fájl-szállítás.
- ⛔ **A mostani munka a BULI MÁSODIK FELE:** az őrjárat ma **TCP-n** fut, a UDP-vonal viszont
  kész — a rés-nyitás bekötése hiányzik. ⭐ A friss UDP-címek terjesztése 2026-09-18-án
  megépült; ⛔ **a horgony (postaláda / éjjeli őrség) még nincs**, és a 34. mérés szerint
  **e nélkül a terjesztés el sem indul**.

⭐ **És az első valódi használat nem a végén van:** a **D18/0** szerint kis közösségben
*„nem kell rendszer — tudod, ki valódi, mert ismered"*. Vagyis a Szakasz 3 + egy minimális
felület után **egy család vagy egy osztály élesben használhatja** — helyes, milliárdos
szerkezettel, csak kevesebb emberrel (D22).

A teljes terv és a döntések (D1–D60): [`../docs/fejlesztesi_terv_fazis2.md`](../docs/fejlesztesi_terv_fazis2.md)
· a sorrend: [`../docs/utiterv.md`](../docs/utiterv.md)
· a milliárdos lépték szerkezete: [`../docs/skalazas_terv.md`](../docs/skalazas_terv.md)
· a Szakasz 1 terve: [`../docs/szakasz1_terv.md`](../docs/szakasz1_terv.md)
· az adatmodell rétegei: [`../docs/adat_osztalyozas.md`](../docs/adat_osztalyozas.md)
