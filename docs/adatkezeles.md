# Adatkezelési őszinteség (1. fázis)

*Készült: 2026-07-18, a vízió-vita D2 döntése és a H2–H3 híd-feladatok (V3–V4)
nyomán. Ez a dokumentum azt mondja ki őszintén, hogy a koino 1. fázisában
(központi szerveres működés) ki mit láthat. A megfogalmazás elve a vitában
rögzített ŐSZINTE KOMMUNIKÁCIÓ: azt állítjuk, ami technikailag igaz, nem azt,
ami jól hangzik.*

## Mit látnak a többi e-emberek?

**Nyilvános** (a platform működéséhez szükséges, szándékosan látható):

- az **e-embernév**, a **valódi név** és a **település** (a nyilvános profil);
- a **tudatpont-eloszlás**: ki mely entitásokhoz rendelt tudatpontot és mennyit
  (a tudatpont prioritást fejez ki, nem véleményirányt — D2; a tárolási
  vállaláshoz is nyilvánosnak kell lennie — D3);
- az entitások **létrehozójának e-emberneve**;
- a döntések **összesített eredményei**: támogatottsági/ellenzői/tartózkodói/
  részvételi arány, szavazó-darabszámok, bizonyossági mutató — egyénhez nem
  köthető formában;
- a meghívó-rendszerben: a kibocsátó látja, hogy a saját meghívójával KI
  regisztrált (e-embernév).

**NEM látható más e-emberek felé:**

- az **egyéni szavazat** (ki hogyan szavazott egy javaslatra) — a szavazásnál
  mindenki egyenlő, és a nyílt szavazás a D2 szerint elvetett (kikényszeríthető
  szavazatvásárlás + önkiválasztási torzítás); az API kizárólag a saját
  szavazatot adja vissza a bejelentkezett e-embernek;
- az **e-mail cím** — **megadása nem kötelező** (adatvédelmi döntés, 2026-07-31);
  ha megadták, kizárólag azonosításra (bejelentkezésre) szolgál, e-mailt sosem
  küldünk rá, és semmilyen más felhasználónak szóló API-válaszban nem szerepel.
  Aki nem ad meg e-mailt, arról **egyáltalán nem tárolunk e-mailt** (a mező hiányzik),
  így nem keletkezik funkció nélküli e-mail-jegyzék;
- a **jelszó** — hash-elve tárolódik (bcrypt), visszafejthető formában sehol.

## Mit lát az üzemeltető? (őszinte kimondás)

Az 1. fázisban a koino **központi szerveren és központi adatbázisban** fut.
Ez azt jelenti, hogy **aki a szervert üzemelteti, technikailag hozzáfér a teljes
adatbázishoz** — így az egyéni szavazatokhoz és az e-mail címekhez is. Ezt nem
tagadjuk és nem kendőzzük el: az 1. fázisban a szavazat a többi e-ember felől
titkos, az üzemeltető felől technikailag nem az.

Éppen ez az egyik fő ok, amiért a 2. fázis (elosztott, P2P koino) készül: a cél
a **titkos, de ellenőrizhető szavazás kiváltságos adatkezelő nélkül** (D2 —
zero-knowledge irány; CÉLKÉNT kommunikáljuk, nem kész képességként) és az, hogy
**senkinél ne keletkezzen többlet-adat**. Részletek:
[fejlesztesi_terv_fazis2.md](fejlesztesi_terv_fazis2.md).

## A gyakorlati garanciák a kódban (V3–V4, 2026-07-18)

- Az egyéni szavazatokat listázó publikus végpont (`GET /api/javaslat/:id/szavazatok`)
  és a hozzá tartozó service-metódusok **törölve**; az összesített statisztika
  (`GET /api/javaslat/:id/statisztika`) megmaradt.
- Az e-mail **minden** entitás-válaszból kikerült (a `letrehozo` és a szavazat
  populate-ok csak `eemberNev`-et adnak); e-mailt csak a saját adatok
  (regisztráció/bejelentkezés/beállítások) válasza tartalmaz — és csak akkor, ha
  az e-ember egyáltalán megadott e-mailt.
- Az e-mail a **JWT tokenből is kikerült** (2026-07-31): a token payload csak
  `id`-t és `eemberNev`-et tartalmaz — a kliensoldalon olvasható tokenben nincs
  személyes e-mail.
- Változás esetén ezt a dokumentumot is frissíteni kell (teszt-referencia:
  [teszt.md](teszt.md)).
