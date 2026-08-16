# Változásnapló

A koino főbb változásai időrendben, legújabb elöl. A dátumok a `main` branch
commit-jeiből származnak. Ez nem szemantikus verziózás — a projekt egyetlen,
folyamatosan fejlődő ágon (`main`) halad.

A formátum lazán követi a [Keep a Changelog](https://keepachangelog.com/hu/)
szellemét (magyarul, a projekt stílusához igazítva).

---

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
