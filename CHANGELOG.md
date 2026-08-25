# Változásnapló

A koino főbb változásai időrendben, legújabb elöl. A dátumok a `main` branch
commit-jeiből származnak. Ez nem szemantikus verziózás — a projekt egyetlen,
folyamatosan fejlődő ágon (`main`) halad.

A formátum lazán követi a [Keep a Changelog](https://keepachangelog.com/hu/)
szellemét (magyarul, a projekt stílusához igazítva).

---

## 2026-08-25 — Különválás: a módosítási döntés kétágú kimenete

Egy módosítási javaslatnak eddig **egy** nyertese volt. Mostantól **mindkét oldal
magával viheti azt, amit szeretett volna** — a koinón BELÜL, a mindennapi működés
részeként (ez nem a hálózat-szintű „fork-jog", ami vésznyílás).

- **A szándék a szavazatra kerül.** A *Támogatom* / *Ellenzem* mellett megjelenik a
  kérdés: *„Ha a döntés nem a te álláspontodat követi, szeretnél külön ágat?"*
  Tartózkodásnál nem jelenik meg — aki nem foglal állást, a **főágon** marad. A szándék
  nem „ragad be": minden szavazat-módosításkor újra meg kell adni.
- **Szimmetria:** elfogadott javaslatnál az **ellenzők** válhatnak külön a RÉGI
  tartalommal; elvetettnél a **támogatók** a MÓDOSÍTOTTAL.
- **A tudatpont ÁTKERÜL, nem duplázódik.** Aki elmegy, viszi a súlyát; a rendszerben
  lévő összes tudatpont nem változik. A főág sosem eshet 0-ra — ez nem védőkorlát,
  hanem levezethető: szavazni csak pont-tulajdonos tud.
- **A fa szétválik, nem megkettőződik.** Egyetlen szabály dönt minden leszármazottról:
  oda kerül, ahol tudatpontja van annak, aki különválik. Három kimenet: **marad**,
  **átköltözik**, vagy **megkettőződik**. Köztes szint nem másolódik üresen — ami
  átmegy, a legközelebbi átkerült ősre csatlakozik; ami marad, a legközelebbi
  megmaradt ősre.
- **A két ág nem veszíti szem elől egymást:** a kártya „Másik ág" fülén hivatkozás mutat
  a testvérre. Így később **újra egyesíthetők** a meglévő egyesítési javaslattal.
- **A szerkesztők átkerülnek**, és a nevük színe az ÁG szempontjából számolódik: aki a
  módosítást támogatta, a különvált (régi tartalmú) ágon pirosan jelenik meg. Ugyanaz az
  adat, két nézőpontból.
- **Az érték javaslatok is átvándorolnak** a különválókkal, ezért a két ág küszöbei
  eltérhetnek.
- **Az azonosító a főágé** — elfogadott javaslatnál tehát a régi tartalom kap újat.
- **Elvetéskor nincs egyezmény** (az egyezmény kizárólag elfogadott javaslat eredménye),
  ezért ott a különvált ág horgonya maga az elvetett javaslat.
- Új e-embereknek szóló leírás: [`megismeres/18-kulonvalas.md`](megismeres/18-kulonvalas.md).
- Fejlesztői próba-eszköz a motor méréséhez: `backend/tools/kulonvalasProba.js`.

**Hatókör (első kör):** csak `Modositas` típusú javaslat, csak `Tartalom` entitás. A
kategória/tartalomtípus különválása és a láncolt (többszörös) szétválás külön kör.

## 2026-08-24 — E-mail: értesítés levélben és elfelejtett jelszó

A koino eddig **egyetlen levelet sem küldött** — nem is volt hozzá kódja. Ez most két
funkcióval bővült, de az alapelv szigorúbb lett, nem lazább.

- **A program magától SOHA nem küld levelet.** Minden kimenő levélhez tartozik egy
  azonosítható, e-ember általi kérés (gombnyomás, kapcsoló, űrlap). A **levél-kapu**
  (`emailKuldoService`) ezt kódban kényszeríti ki: kötelező `indok` zárt listából,
  és **megerősítetlen címre semmit nem enged ki**. Hiányos beállításnál magától
  „napló módba" esik — kiírja a levelet, de nem küldi el.
- **Cím-megerősítés:** a megadott cím önmagában nem bizonyít semmit, ezért egyszer
  használatos hivatkozással igazolható. Cím-változáskor a megerősítés elvész.
- **Elfelejtett jelszó:** helyreállító hivatkozás a megerősített címre (1 óra, egyszer
  használatos). A kérés válasza **mindig ugyanaz**, akár létezik az azonosító, akár
  nem — így a végpont nem árulja el, ki tagja a koinónak.
- **A bejelentkezések visszavonhatók (`tokenVerzio`).** A tokenek nem járnak le, ezért
  a jelszócsere önmagában nem lökte volna ki azt, aki illetéktelenül bejutott.
  Jelszóváltáskor és helyreállításkor most minden korábbi token érvénytelen lesz,
  minden eszközön.
- **Értesítés e-mailben**, választható ütemmel: minden értesítésről külön levél
  **azonnal**, vagy **időközönkénti összefoglaló** — az időköz szabadon állítható
  (1–168 óra). Alapérték: összefoglaló, naponta.
- **Kérés-korlát** a levélküldő végpontokra (saját middleware, nulla új npm csomag).
- **Élesben:** Resend (EU-s régió), a koino.hu DKIM+SPF+DMARC hitelesítéssel.
- **Adatkezelés:** az `adatkezeles.md` korábbi „e-mailt sosem küldünk" ígérete
  átírva, a változás okával együtt kimondva. Visszamenőleg senki nem kap semmit:
  minden meglévő e-ember kikapcsolt állapotból indul.
- Új e-embereknek szóló leírás: [`megismeres/17-email-ertesitesek.md`](megismeres/17-email-ertesitesek.md).

## 2026-08-18–24 — Szerkesztők, kártya-dátum, hozzájárulók

- **„Létrehozó" → „Szerkesztő":** egy entitásnak több szerkesztője lehet (az eredeti
  létrehozó + akinek elfogadott módosítási javaslata módosította). A Részletes
  adatokban a nevek a szavazatuk szerinti színnel jelennek meg.
- **Kártya-fejléc dátum + elavulás-jelző szín:** a tartalom/kategória/tartalomtípus
  kártyán 📅 dátum, a szülő utolsó módosításához mérve (piros = elavulhat).
- **Hozzájárulók:** a Részletes adatok → Hozzájárulók listájában látszik minden
  e-ember **részvételi szerepe** (aktív / passzív).
- **Cache-javítás:** `Cache-Control: no-cache` a statikus frontendre — megelőzi a
  deploy utáni „régi JS fut a telefonon" csapdát.
- **A bejelentkezés nem jár le:** az e-ember addig marad bejelentkezve, ameddig akar.

## 2026-08-16–17 — A lapozás visszafelé is jár

- **A lapozás lépcsője a valódi gesztushoz kötve.** Ha egy szintről kizoomolsz, a
  lerakott mennyiség visszalép egy adaggal (15 000 → 10 000 → 5 000), és a
  „további tartalmak" mag újra megjelenik. A kioldás mércéje a valódi nagyítási
  gesztusok futó szorzata (görgő, csippentés, +/− gomb) — nem a mért képernyő-sugár,
  amit az illesztés, a fókusz-animáció és az újrapakolás is elmozdít. Ezzel együtt
  javítva a kérés-mód, ami kifogyott szinten örökre nyitva maradt és némán elnyelte
  a visszalépést. Új mérőműszer: `_lepcsoAllapot()` a konzolról.
- **A lapozás fókusza és a mag-foglalás** javítása: a régi „várólista üres" feltétel
  nagy készleten sosem teljesült.
- **Terv:** a Síkidom nézet főoldallá tétele, a hozzá tartozó mérési eredményekkel
  ([`docs/sikidom_fooldal_terv.md`](docs/sikidom_fooldal_terv.md)).

## 2026-08-11–13 — A síkidom motorjának szétbontása és az adat-felhalmozódás

- **A `SikidomModal.js` szétbontása** négy modulba (3584 → 2631 sor): rajzoló,
  tár-kezelés, vezérlés, pont-küszöb. A pont-küszöb a méret-modell megfordításaként
  áll elő, tehát egyetlen forrásból.
- **Mélység szerinti ős-söprés:** a megtartási folyosón kívüli szintek elengedése.
  Az ős-söprés **töröl, nem parkoltat** — a parkoltatás csak vándoroltatta az adatot,
  a memória nem szabadult fel. A megtartási folyosó 6 → 4.
- **Végtelen testvér:** lapozás a „további tartalmak" koppintással, 5000-es adagokban.
- **A horgony arra vált, amire nézel** (pozíció-feltétellel), a pozicionálási keret
  pedig zsugorodni is tud.
- Biztonsági frissítés: 12 sebezhetőség → 0.

## 2026-08-05–10 — A Síkidom nézet

- **Canvas-alapú síkidom nézet**, képernyő-vezérelt betöltéssel: a hierarchia úgy
  jelenik meg, hogy minden entitás **területe a tudatpontjával arányos**.
- **Küszöbös gyerek-végpont** a backenden — a lapozás helyett a képernyőn látható
  méret dönti el, mi töltődik le.
- **Geometria-modulok:** méret, pakolás, horgony, rács, spirál — böngésző nélkül is
  mérhető, tiszta számításként.
- **A pakolási modell** többszöri mérés után állt össze: bentről kifelé, egyszerre
  pakolunk; a lerakott síkidomok helye végleges; a mag üressége a láthatóság
  szabálya; méret szerinti visszaszedés a nagyítás végén.
- **Fejlesztői homokozó** (`sikidomTeszt.html`) és böngésző nélküli mérőpróbák a
  `backend/tools/` alatt; böngészős igazolás 10 405 gyökéren.

## 2026-08-08 — Megismerés

- **E-embereknek szóló használati leírások** (`megismeres/`, 16 dokumentum): tartalom,
  kategória, javaslat, szavazás, bizonyossági mutató, keresés, értesítés és a többi.

## 2026-08-03 — Struktúra nézet és testvér-navigáció

- **A „Térkép nézet" átnevezve Struktúra nézetre** (kódban és dokumentumokban) — a
  térkép név a későbbi, valódi földrajzi nézeté.
- **Testvér-navigáció:** egeres húzás és mobilos érintéses swipe; a nyilak a képernyő
  közepéhez rögzítve.

## 2026-08-01 — Élesítés és finomítás

- **Egyezmény törölhető:** törlés-javaslat engedélyezése egyezményre; a
  javaslat szülő-/tárhelytípus enum kiegészítése az Egyezménnyel.
- **Szövegszerkesztő:** a beillesztett szöveg formázásának megőrzése
  (paste-sanitizálás), sticky eszköztár, korlátlan szélességű modálok.
- **Éles/fejlesztői környezet szétválasztása:** külön `docker-compose.prod.yml`
  stack (koino-backend-prod a 8080-on, saját mongo- és uploads-kötet, `.env.prod`
  titkok), a kód a képbe égetve.
- E-mail opcionális utólagos szerkesztése a beállításokban.

## 2026-07-31

- Módosítási javaslat: kategória + típus választás, ikon-egységesítés,
  fejléc-elválasztók, opcionális e-mail.
- Részvételi szerep (passzív/aktív) bevezetése; a felmenő-kényszer megszüntetése.

## 2026-07-30 — Éles bevetésre felkészítés

- Meghívó-rendszer, adatvédelmi lépések, hosting- és kártya-javítások.
- Árva feltöltött fájlok megszüntetése: halasztott feltöltés + törlés/csere
  takarítás.

## 2026-07-23

- Főoldal vissza/előre történet-kezelő (entitás + rendezés + térkép állapot).
- Térkép ág-szűrés a backendre helyezve; önkéntes fiók-törlés; alsó sáv
  entitás-számok; adatvédelmi nyilatkozat.
- Egyezmény-javaslat + javaslat-típus domain-szabályok + kategória-egyesítés.
- Alkategória + leírás-szerkesztő + hierarchikus kategória-választó.
- Menü: csoportosítás, Világtérkép, görgetés-javítás; testvér-ugrás gombok.

## 2026-07-22

- Rendezés funkció: lapos pakli-rendezés + skálázható ág-szűrés.
- Dokumentáció: a név története + bemutató kívülállóknak.

## 2026-07-19–20

- **Értesítési rendszer** lezárása + governance-lyuk befoltozása.
- **Térkép nézet:** kétszintű LOD, mellék-ikonok, sima zoom, kattintás-javítás.
- **Síkidom nézet** 1. lépése (statikus ablak) — utána felfüggesztve.
- **Tudatpontok nézet** és **Keresés** (fő menü + ág-szűrt kártya-menük).
- eember beállítások: profil-módosítás + jelszóváltás.
- Ikon-egységesítés (kategória 🧩, tartózkodás ➖).
- Kis adósságok: üres-pakli állapot, `szavazasiHatarido` cron, árva
  értesítés-takarítás.

## 2026-07-18 — Adatvédelmi audit

- Szavazat-láthatóság szűkítése (az egyéni szavazat nem nyilvános; csak az
  összesített eredmény az).
- E-mail priváttá tétele.
- Küszöb-hiba javítás: a kategória/tartalomtípus javaslatok saját küszöbe
  érvényesül.

---

> A teljes, részletes történet a git-logban van:
> `git log --oneline`. A régebbi (2026-07-18 előtti) commitok is ott
> követhetők.
