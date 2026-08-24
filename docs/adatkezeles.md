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
  semmilyen más felhasználónak szóló API-válaszban nem szerepel. Aki nem ad meg
  e-mailt, arról **egyáltalán nem tárolunk e-mailt** (a mező hiányzik);
- a **jelszó** — hash-elve tárolódik (bcrypt), visszafejthető formában sehol.

## Mire használjuk az e-mail címet? (2026-08-24 — VÁLTOZÁS)

**Ez a szakasz egy korábbi ígéret módosítása, ezért kimondjuk, mi változott.**

2026-08-24 előtt itt az állt, hogy a megadott címre **„e-mailt sosem küldünk"** —
mert akkor a koinónak egyáltalán nem volt levélküldése. Azóta két funkció épült rá:
az **elfelejtett jelszó** és az **e-mailes értesítés**. Aki korábban ebben a hitben
adta meg a címét, azt ez a változás nem érheti váratlanul, ezért:

**A koino magától SOHA nem küld levelet.** Minden kimenő levélhez tartozik egy
azonosítható, e-ember általi kérés:

| Levél | Mi a kérés? |
|---|---|
| Cím-megerősítő | az e-ember megnyomta a „Cím megerősítése" gombot |
| Értesítés / összefoglaló | az e-ember bekapcsolta az e-mailes értesítést |
| Jelszó-helyreállító | az e-ember rákattintott az „Elfelejtett jelszó"-ra |

Ez nem csak elv, hanem a kódban kikényszerített szabály: a levél-kapu
(`services/emailKuldoService.js`) minden híváshoz **kötelező indokot** kér egy zárt
listából, és **megerősítetlen címre semmit nem enged ki** — egyetlen kivétel maga a
megerősítő levél, hiszen az teszi megerősítetté a címet.

**Visszamenőleg senki nem kapott és nem kap semmit:** a mező bevezetésekor minden
meglévő e-ember `emailMegerositve: false` és `emailErtesites: false` állapotból indult.
Aki nem kapcsol be semmit, annak a helyzete pontosan ugyanaz, mint a változás előtt.

**Amit a levélküldés szükségszerűen jelent:** a leveleket egy külső szolgáltató
(Resend, EU-s régió) kézbesíti, tehát a címzett e-mail címe és a levél tárgya
áthalad rajta. A levelekbe **nem kerül** koino-tartalom a címeknél és az esemény
megnevezésénél több (pl. „Új javaslat — <entitás címe>"), és nem kerül bele
szavazat, tudatpont-adat vagy jelszó.

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
  `id`-t, `eemberNev`-et és a token-verziót (`tv`) tartalmazza — a kliensoldalon
  olvasható tokenben nincs személyes e-mail.
- **A bejelentkezések visszavonhatók** (2026-08-24): a tokenek szándékosan nem járnak
  le, ezért jelszóváltáskor és jelszó-helyreállításkor az e-ember `tokenVerzio`
  értéke nő — ettől minden korábban kiadott token azonnal érvénytelen lesz, minden
  eszközön. Enélkül a jelszó megváltoztatása nem zárná ki azt, aki illetéktelenül
  hozzáfért a fiókhoz.
- **A jelszó-helyreállítás nem árulja el, ki tagja a koinónak** (2026-08-24): a kérés
  válasza szó szerint ugyanaz, akár létezik a megadott azonosító, akár nem.
- Változás esetén ezt a dokumentumot is frissíteni kell (teszt-referencia:
  [teszt.md](teszt.md)).
