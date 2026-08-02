// backend/services/pakliService.js

// --- IMPORTÁLÁSOK ---
const hierarchikusAllokaciRepository = require('../repositories/hierarchikusTudatpontAllokaciRepository');
// A fejléc tudatpont-adatait (entitás saját összpont, hozzájárulók száma, a néző
// e-ember saját pontja) a TudatpontService egyetlen metódusa adja – ugyanaz a
// forrás, mint amit a tudatpont-modal és a jogosultság-ellenőrzés is használ.
const tudatpontService = require('./tudatpontService');
// A „saját összpont" rendezés a denormalizált osszesPont mezőn megy (indexelt),
// a tudatpontAllokacio kollekción — ezt a repository közvetlenül adja.
const tudatpontRepository = require('../repositories/tudatpontRepository');
const tartalomRepository = require('../repositories/tartalomRepository');
const kategoriaRepository = require('../repositories/kategoriaRepository');
const tartalomTipusRepository = require('../repositories/tartalomTipusRepository');
const javaslatRepository = require('../repositories/javaslatRepository');
const egyezmenyRepository = require('../repositories/egyezmenyRepository');
// A szavazati jogosultság a backend SAJÁT szabályát használja (érintett entitások
// tudatpontja), hogy a pakli által küldött `szavazhat` jelzés egyezzen a
// szavazatService védelmével – egyetlen forrásból.
const javaslatJogosultsagService = require('./javaslat/javaslatJogosultsagService');
// A részfa-alapú olvasatlan értesítés-számláló (kártya-badge) – a pakli minden
// elemére EGYETLEN csoportos lekérdezéssel kérjük le az ág alatti olvasatlanok számát.
const ertesitesService = require('./ertesitesService');

// --- PAKLI SERVICE OSZTÁLY ---
class PakliService {

// ----- PAKLI ÖSSZEÁLLÍTÁSA -----
/**
* A kiválasztott entitás függvényében összeállítja a teljes paklit.
* Ha nincs megadva entitás, a legerősebb gyökértől indul.
* @param {string|null} entitasId - A kiválasztott entitás azonosítója (opcionális)
* @param {string|null} entitasTipus - A kiválasztott entitás típusa (opcionális)
* @param {string|null} eemberId - A néző e-ember azonosítója (a szavazhat jelzéshez)
* @returns {Promise} A kész pakli adatokkal feltöltve
*/
async pakliotOsszeallitasa(entitasId = null, entitasTipus = null, eemberId = null) {
    console.log('pakliotOsszeallitasa - KEZDÉS', { entitasId, entitasTipus, eemberId });

    // 1. LÉPÉS - KIINDULÁSI ENTITÁS MEGHATÁROZÁSA
    let kivalasztottEntitas = null;

    if (entitasId && entitasTipus) {
        // Ha meg van adva entitás, ellenőrizzük hogy létezik-e a hierarchiában
        kivalasztottEntitas = await hierarchikusAllokaciRepository.findByEntitas(entitasId, entitasTipus);
        // Ha nem létezik a hierarchikus allokációban, hibát dobunk
        if (!kivalasztottEntitas) throw new Error('A megadott entitás nem található a hierarchiában');
    } else {
        // Ha nincs megadva, a legerősebb gyökér entitástól indulunk
        kivalasztottEntitas = await hierarchikusAllokaciRepository.findLegerossebbGyoker();
        // Ha egyáltalán nincs gyökér entitás, üres paklit adunk vissza
        if (!kivalasztottEntitas) {
            console.log('pakliotOsszeallitasa - Nincs gyökér entitás, üres pakli');
            return { kivalasztottEntitas: null, pakli: [] };
        }
    }

    console.log('pakliotOsszeallitasa - Kiindulási entitás meghatározva', {
        entitasId: kivalasztottEntitas.entitasId,
        entitasTipus: kivalasztottEntitas.entitasTipus
    });

    // 2. LÉPÉS - FELMENŐK ÖSSZEGYŰJTÉSE (szülő lánc követése felfelé)
    const felmenok = await this.felmenokOsszegyujtese(
        kivalasztottEntitas.entitasId,
        kivalasztottEntitas.entitasTipus
    );

    // 3. LÉPÉS - LESZÁRMAZOTTAK ÖSSZEGYŰJTÉSE (bogárlogika - legerősebb gyerek)
    const leszarmazottak = await this.leszarmazottakOsszegyujtese(
        kivalasztottEntitas.entitasId,
        kivalasztottEntitas.entitasTipus
    );

    // 4. LÉPÉS - ÖSSZEFŰZÉS
    // Felmenők + kiválasztott entitás + leszármazottak
    // A kiválasztott entitás a felmenők listájának UTOLSÓ eleme,
    // és a leszármazottak listájának ELSŐ eleme is -
    // ezért a leszármazottak első elemét (magát a kiválasztott entitást) kihagyjuk
    const egyesitiLista = [...felmenok, ...leszarmazottak.slice(1)];

    // 5. LÉPÉS - MÉLYSÉGI SZINT HOZZÁADÁSA
    // A gyökér (lista első eleme) kapja az 1-est, minden következő eggyel többet
    const listaaMelyseggelEgyutt = egyesitiLista.map((elem, index) => ({
        ...elem,
        melysegiSzint: index + 1
    }));

    // 6. LÉPÉS - ADATOK FELTÖLTÉSE ENTITÁSTÍPUSONKÉNT
    // Az eemberId továbbadva, hogy a javaslat-elemek megkapják a szavazhat jelzést
    const feltoltottPakli = await this.pakliAdatokFeltoltese(listaaMelyseggelEgyutt, eemberId);

    // 7. LÉPÉS - TESTVÉREK ÖSSZEGYŰJTÉSE
    // A felmenők listájának hossza megadja a kiválasztott entitás mélységi szintjét,
    // mivel a kiválasztott entitás mindig a felmenők listájának utolsó eleme.
    // Ezt adjuk át a testvéreknek, hogy helyes mélységi szinttel rendelkezzenek.
    const kivalasztottMelysegiSzint = felmenok.length;

    const testverek = await this.testverekOsszegyujtese(
        kivalasztottEntitas.szuloId ?? null,
        kivalasztottEntitas.entitasId.toString(),
        kivalasztottMelysegiSzint,
        eemberId
    );

    // 8. LÉPÉS - RÉSZFA-ALAPÚ OLVASATLAN ÉRTESÍTÉS-SZÁMOK (kártya-badge)
    // A pakli ÉS a testvérek MINDEN elemére egyetlen csoportos lekérdezéssel
    // rátesszük az `olvasatlanErtesitesek` számot (az elem ága alatti olvasatlanok).
    // Best-effort: ha a számlálás hibázik, a pakli attól még kimegy (badge = 0).
    await this.olvasatlanBadgeFeltoltese([...feltoltottPakli, ...testverek], eemberId);

    console.log('pakliotOsszeallitasa - VÉGE', {
        entitasId: kivalasztottEntitas.entitasId,
        paklimeret: feltoltottPakli.length,
        testverekSzama: testverek.length,
        kivalasztottMelysegiSzint
    });

    return {
        kivalasztottEntitas: {
            entitasId: kivalasztottEntitas.entitasId,
            entitasTipus: kivalasztottEntitas.entitasTipus
        },
        testverek,
        pakli: feltoltottPakli
    };
}

// ----- RENDEZETT LISTA ÖSSZEÁLLÍTÁSA (LAPOS NÉZET) -----
/**
* A Rendezés nézet (15. terv-pont) lapos, egyszintű listáját állítja össze.
* A hierarchikus pakli-val szemben ITT nincs fa, testvér vagy bogárlogika:
* minden entitás EGY sík listában van, a `mod` szerint rendezve.
* 2026-07-20: a GLOBÁLIS módok élnek — 'ido' (létrehozási idő) és 'sajatPont'
*   (entitás saját összpontja, a tudatpontAllokacio indexelt osszesPont mezőjén);
*   az ágazat (részfa) szűrés a következő lépésben jön.
* A listaelemek adat-feltöltése UGYANAZ, mint a paklié (egyElemAdatainakFeltoltese),
* így a kártyák fejléce változatlanul megjelenik; az olvasatlan badge-eket is
* feltöltjük. A frontend lapos módban a testvér/átfedés-részt hagyja majd ki.
* @param {string} mod - 'ido' (létrehozási idő) | 'sajatPont' (entitás saját összpontja) | 'agazatiPont' (hierarchikus összpont)
* @param {string|null} eemberId - A néző e-ember azonosítója (fejléc + badge + szavazhat)
* @param {Object} opciok - { irany: 'csokkeno'|'novekvo', limit: number }
* @returns {Promise<Object>} { mod, rendezettLista }
*/
async rendezettListaOsszeallitasa(mod = 'ido', eemberId = null, opciok = {}) {
    console.log('rendezettListaOsszeallitasa - KEZDÉS', { mod, eemberId, opciok });

    const { irany = 'csokkeno', limit = 200, agazatId = null } = opciok;

    // A rendezett, megjelenítendő lista — módonként másképp áll össze.
    let feltoltottLista;

    if (mod === 'ido') {
        // ----- IDŐREND (opcionálisan ÁGAZAT-SZŰRTEN) -----
        // A DB rendez létrehozási idő szerint ÉS limitál, így a limit pontos. Ha van
        // agazatId, csak az az ág (részfa) — az indexelt osLanc-szűrésen (skálázható).
        // A lapos lista minden entitástípust tartalmaz (Csaba döntése, 2026-07-20).
        const nyersElemek = await hierarchikusAllokaciRepository.findMindIdorendben(irany, limit, agazatId);
        feltoltottLista = await Promise.all(
            nyersElemek.map(elem => this.egyElemAdatainakFeltoltese(elem, eemberId))
        );

    } else if (mod === 'sajatPont') {
        // ----- SAJÁT ÖSSZPONT (DB-oldali rendezés, 2026-07-20) -----
        // A saját összpont a tudatpontAllokacio DENORMALIZÁLT `osszesPont` mezője —
        // pontosan az, amit a fejléc `entitasSajatTudatpont`-ként mutat (közös forrás).
        // Erre van csökkenő index → a DB rendez ÉS vág (top-N), skálázható nagy adatnál is.
        // Nincs 0-pontos entitás (az mindig törlődik), így a tudatpontAllokacio a teljes
        // entitás-halmazt lefedi (a Struktúra nézet/idő-móddal egyező 27 elem). A kártya-fejléchez
        // kellő hierarchikus mezőket (hierarchikusOsszesPont, szuloId, letrehozva) egy
        // batch $in-nel csatoljuk a másik kollekcióból.
        const rendezettAllok = await tudatpontRepository.findMindSajatPontSzerint(irany, limit, agazatId);
        const idk = rendezettAllok.map(a => a.entitasId);
        const hierSorok = await hierarchikusAllokaciRepository.findManyByEntitasIdk(idk);
        const hierMap = new Map(hierSorok.map(h => [h.entitasId.toString(), h]));

        // A tudatpontAllokacio sorrendje a mérvadó (ezen iterálunk); a hierarchikus batch
        // csak kiegészítő adatot ad. A Promise.all sorrendtartó → a rendezés végig megmarad.
        const feltoltendoElemek = rendezettAllok.map(a => {
            const hier = hierMap.get(a.entitasId.toString());
            return {
                entitasId: a.entitasId,
                entitasTipus: a.entitasTipus,
                hierarchikusOsszesPont: hier?.hierarchikusOsszesPont ?? 0,
                letrehozva: hier?.letrehozva ?? a.letrehozva ?? null,
                szuloId: hier?.szuloId ?? null
            };
        });
        feltoltottLista = await Promise.all(
            feltoltendoElemek.map(elem => this.egyElemAdatainakFeltoltese(elem, eemberId))
        );

    } else if (mod === 'agazatiPont') {
        // ----- ÁGAZATI (HIERARCHIKUS) ÖSSZPONT (opcionálisan ágazat-szűrten) -----
        // A hierarchikusOsszesPont (az entitás + teljes ága/részfája súlya) szerint;
        // a hierarchikus allokáció MAGA a forrás (minden mező megvan, mint az időrendnél).
        const nyersElemek = await hierarchikusAllokaciRepository.findMindHierarchikusPontSzerint(irany, limit, agazatId);
        feltoltottLista = await Promise.all(
            nyersElemek.map(elem => this.egyElemAdatainakFeltoltese(elem, eemberId))
        );

    } else {
        // Ismeretlen mód
        throw new Error(`Ismeretlen vagy még nem támogatott rendezési mód: ${mod}`);
    }

    // RÉSZFA-ALAPÚ OLVASATLAN BADGE-SZÁMOK (mint a pakliban) — a végleges listára
    await this.olvasatlanBadgeFeltoltese(feltoltottLista, eemberId);

    console.log('rendezettListaOsszeallitasa - VÉGE', { mod, elemszam: feltoltottLista.length });

    return { mod, rendezettLista: feltoltottLista };
}

// ----- TESTVÉREK ÖSSZEGYŰJTÉSE -----
/**
* A kiválasztott entitás összes testvérét gyűjti össze alap adatokkal feltöltve.
* Testvér = azonos szuloId-jú entitás, az aktuális entitás NÉLKÜL.
* A szűrés adatbázis szinten történik a findTestverek metódusban ($ne operátor).
* Hierarchikus pont szerint csökkenő sorrendben érkeznek.
* @param {string|null} szuloId - A kiválasztott entitás szülőjének azonosítója (null ha gyökér)
* @param {string} kivalasztottEntitasId - A kiválasztott entitás azonosítója
* @param {number} melysegiSzint - A kiválasztott entitás mélységi szintje – a testvérek ugyanezen a szinten vannak
* @param {string|null} eemberId - A néző e-ember azonosítója (a szavazhat jelzéshez)
* @returns {Promise<Array>} A testvérek listája alap adatokkal feltöltve
*/
async testverekOsszegyujtese(szuloId, kivalasztottEntitasId, melysegiSzint, eemberId = null) {
  console.log('testverekOsszegyujtese - KEZDÉS', { szuloId, kivalasztottEntitasId, melysegiSzint, eemberId });

  // Testvérek lekérése – az aktuális entitás már az adatbázis szinten ki van zárva
  const testverAllokaciok = await hierarchikusAllokaciRepository.findTestverek(
    szuloId,
    kivalasztottEntitasId,
    100
  );

  // A testvérek a kiválasztott entitással azonos mélységi szinten vannak
  // A szuloId minden testvérnél azonos – éppen a metódus szuloId paramétere
  const testverAlap = testverAllokaciok.map(allokacio => ({
    entitasId:              allokacio.entitasId,
    entitasTipus:           allokacio.entitasTipus,
    hierarchikusOsszesPont: allokacio.hierarchikusOsszesPont,
    letrehozva:             allokacio.letrehozva, // Döntetlen pontnál a testvér-sorrendhez
    melysegiSzint:          melysegiSzint,
    szuloId:                szuloId ?? null // A közös szülő azonosítója, null ha gyökér testvérek
  }));

  // Minden testvérre lefuttatjuk az egyElemAdatainakFeltoltese logikát – párhuzamosan
  const feltoltottTestverek = await Promise.all(
    testverAlap.map(elem => this.egyElemAdatainakFeltoltese(elem, eemberId))
  );

  console.log('testverekOsszegyujtese - VÉGE', {
    szuloId,
    melysegiSzint,
    testverekSzama: feltoltottTestverek.length
  });

  return feltoltottTestverek;
}
// ----- FELMENŐK ÖSSZEGYŰJTÉSE -----
/**
* A kiválasztott entitástól felfelé haladva összegyűjti az összes őst.
* Az eredménylista végén a kiválasztott entitás maga is szerepel.
* Pl.: gyökér, nagyszülő, szülő, kiválasztott entitás
* @param {string} entitasId - A kiindulási entitás azonosítója
* @param {string} entitasTipus - A kiindulási entitás típusa
* @returns {Promise} A felmenők listája, a kiválasztott entitással a végén
*/
async felmenokOsszegyujtese(entitasId, entitasTipus) {
  console.log('felmenokOsszegyujtese - KEZDÉS', { entitasId, entitasTipus });

  // A lánc, amit felépítünk - először a kiindulási entitással kezdünk
  const lanc = [];
  // Az aktuálisan vizsgált allokáció - a kiindulási entitástól indulunk
  let aktualis = await hierarchikusAllokaciRepository.findByEntitas(entitasId, entitasTipus);
  // Végtelen ciklus elkerülésére maximális lépésszám (mélységi korlát)
  let lepesek = 0;
  const maxLepesek = 200;

  // Addig megyünk felfelé, amíg van szülő
  while (aktualis && lepesek < maxLepesek) {
    // Az aktuális entitást a lánc ELEJÉRE szúrjuk be - így a gyökér kerül legelőre
    lanc.unshift({
      entitasId: aktualis.entitasId,
      entitasTipus: aktualis.entitasTipus,
      hierarchikusOsszesPont: aktualis.hierarchikusOsszesPont,
      letrehozva: aktualis.letrehozva, // Az allokáció létrehozási ideje – döntetlen pontnál rendez
      szuloId: aktualis.szuloId ?? null // A szülő azonosítója, null ha gyökér
    });
    // Ha nincs szülő, elértük a gyökeret - megállunk
    if (!aktualis.szuloId || !aktualis.szuloTipus) break;
    // Felfelé lépünk a szülőhöz
    aktualis = await hierarchikusAllokaciRepository.findByEntitas(
      aktualis.szuloId.toString(),
      aktualis.szuloTipus
    );
    lepesek++;
  }

  console.log('felmenokOsszegyujtese - VÉGE', { lancHossz: lanc.length });
  return lanc;
}

// ----- LESZÁRMAZOTTAK ÖSSZEGYŰJTÉSE (bogárlogika) -----
/**
* A kiválasztott entitástól lefelé haladva, minden lépésben a legerősebb
* (legmagasabb hierarchikusOsszesPont) gyereket választja.
* Az eredménylista elején maga a kiválasztott entitás áll.
* Pl.: kiválasztott entitás, legerősebb gyerek, legerősebb unoka, ..., levél
* @param {string} entitasId - A kiindulási entitás azonosítója
* @param {string} entitasTipus - A kiindulási entitás típusa
* @returns {Promise} A leszármazottak listája a kiválasztott entitással az elején
*/
async leszarmazottakOsszegyujtese(entitasId, entitasTipus) {
  console.log('leszarmazottakOsszegyujtese - KEZDÉS', { entitasId, entitasTipus });

  const lanc = [];
  let aktualis = await hierarchikusAllokaciRepository.findByEntitas(entitasId, entitasTipus);
  let lepesek = 0;
  const maxLepesek = 200;

  while (aktualis && lepesek < maxLepesek) {
    // Az aktuális entitást hozzáadjuk a lánc VÉGÉHEZ
    lanc.push({
      entitasId: aktualis.entitasId,
      entitasTipus: aktualis.entitasTipus,
      hierarchikusOsszesPont: aktualis.hierarchikusOsszesPont,
      letrehozva: aktualis.letrehozva, // Az allokáció létrehozási ideje – döntetlen pontnál rendez
      szuloId: aktualis.szuloId ?? null // A szülő azonosítója, null ha gyökér
    });
    // Legerősebb gyerek keresése - ez a bogárlogika kulcsa
    const legerossebbGyerek = await hierarchikusAllokaciRepository.findLegerossebbGyerek(
      aktualis.entitasId
    );
    // Ha nincs gyerek, elértük a levelet - megállunk
    if (!legerossebbGyerek) break;
    // Lefelé lépünk a legerősebb gyerekhez
    aktualis = legerossebbGyerek;
    lepesek++;
  }

  console.log('leszarmazottakOsszegyujtese - VÉGE', { lancHossz: lanc.length });
  return lanc;
}

// ----- PAKLI ADATOK FELTÖLTÉSE -----
/**
* A pakli minden eleméhez lekérdezi az entitástípusnak megfelelő adatokat,
* és az entitás saját (közvetlen) összpontját a TudatpontAllokacio kollekcióból.
* @param {Array} pakliAlap - A mélységi szinttel ellátott pakli alap tömb
* @param {string|null} eemberId - A néző e-ember azonosítója (a szavazhat jelzéshez)
* @returns {Promise} A feltöltött pakli
*/
async pakliAdatokFeltoltese(pakliAlap, eemberId = null) {
console.log('pakliAdatokFeltoltese - KEZDÉS', { elemszam: pakliAlap.length, eemberId });

// Minden elemet párhuzamosan dolgozunk fel - Promise.all
const feltoltottPakli = await Promise.all(
    pakliAlap.map(elem => this.egyElemAdatainakFeltoltese(elem, eemberId))
);

console.log('pakliAdatokFeltoltese - VÉGE', { feltoltottElemszam: feltoltottPakli.length });
return feltoltottPakli;
}

// ----- EGY ELEM ADATAINAK FELTÖLTÉSE -----
/**
* Egyetlen pakli elem adatait tölti fel entitástípus szerint.
* @param {Object} elem - A pakli elem (entitasId, entitasTipus, hierarchikusOsszesPont, melysegiSzint, szuloId)
* @param {string|null} eemberId - A néző e-ember azonosítója (a szavazhat jelzéshez)
* @returns {Promise} A feltöltött pakli elem
*/
async egyElemAdatainakFeltoltese(elem, eemberId = null) {
  console.log('egyElemAdatainakFeltoltese - KEZDÉS', {
    entitasId: elem.entitasId,
    entitasTipus: elem.entitasTipus,
    eemberId
  });

  // Az entitás tudatpont-adatai EGY közös forrásból (TudatpontService):
  //  - osszesPont         → az entitás saját (közvetlen) összpontja (a leszármazottak nélkül)
  //  - hozzajarulokSzama  → hány e-ember tett rá közvetlen tudatpontot
  //  - eemberHozzajarulas → a NÉZŐ e-ember saját pontja EZEN az entitáson (0, ha nincs eemberId vagy nincs pontja)
  // Így a fejléc mindhárom tudatpont-adata ugyanabból a számításból jön, mint a
  // tudatpont-modal és a jogosultság-ellenőrzés – nincs duplikált logika.
  const entitasAllokacio = await tudatpontService.entitasAllokaciLekerese(
    elem.entitasId,
    elem.entitasTipus,
    eemberId
  );
  const entitasSajatTudatpont         = entitasAllokacio?.osszesPont         ?? 0;
  const hozzajarulokSzama             = entitasAllokacio?.hozzajarulokSzama  ?? 0;
  const eemberSajatTudatpontEntitason = entitasAllokacio?.eemberHozzajarulas ?? 0;

  // Entitástípus-specifikus adatok lekérése
  let adatok;
  if (elem.entitasTipus === 'Tartalom') {
    const tartalom = await tartalomRepository.findById(elem.entitasId);
    const kategoriak = await Promise.all(
      (tartalom?.kategoriaIds ?? []).map(async kategoriaId => {
        const kategoria = await kategoriaRepository.findById(kategoriaId.toString());
        return {
          id: kategoriaId,
          nev: kategoria?.nev ?? null,
          ikon: kategoria?.ikon ?? null
        };
      })
    );
    const tartalomTipus = tartalom?.tartalomTipusId
      ? await tartalomTipusRepository.findById(tartalom.tartalomTipusId.toString())
      : null;
    adatok = {
      cim: tartalom?.cim ?? null,
      kategoriak,
      tartalomTipus: {
        id: tartalom?.tartalomTipusId ?? null,
        nev: tartalomTipus?.nev ?? null,
        ikon: tartalomTipus?.ikon ?? null
      }
    };
  } else if (elem.entitasTipus === 'Kategoria') {
    const kategoria = await kategoriaRepository.findById(elem.entitasId);
    // Hány tartalom használja ezt a kategóriát – a fejléc 2. sorához
    const hasznaloTartalmakSzama = await tartalomRepository.countByKategoriaId(elem.entitasId);
    adatok = {
      nev: kategoria?.nev ?? null,
      ikon: kategoria?.ikon ?? null,
      hasznaloTartalmakSzama
    };
  } else if (elem.entitasTipus === 'TartalomTipus') {
    const tartalomTipus = await tartalomTipusRepository.findById(elem.entitasId);
    // Hány tartalom használja ezt a tartalomtípust – a fejléc 2. sorához
    const hasznaloTartalmakSzama = await tartalomRepository.countByTartalomTipusId(elem.entitasId);
    adatok = {
      nev: tartalomTipus?.nev ?? null,
      ikon: tartalomTipus?.ikon ?? null,
      hasznaloTartalmakSzama
    };
  } else if (elem.entitasTipus === 'Javaslat') {
    const javaslat = await javaslatRepository.findById(elem.entitasId);
    const toredekAdatok = javaslat?.toredekCsoportId
      ? {
          toredekCsoportId: javaslat.toredekCsoportId,
          toredekSorszam: javaslat.toredekSorszam,
          toredekDarab: javaslat.toredekDarab
        }
      : null;

    // ===== EGYSÉGES DÖNTÉSI IDŐ A TÖREDÉKCSOPORTBAN =====
    // Töredékcsoportnál a kártyák a csoport KÖZÖS döntési idejét mutatják, ami a
    // töredékek döntési idejének MAXIMUMA (megegyezik a záró logikával: a
    // leglassabb töredék diktál). Így a csoport minden töredék-kártyáján ugyanaz a
    // ⏱ jelenik meg, nem a per-töredék nyers érték. Egyedi javaslatnál marad a saját.
    let kijelzendoDontesiIdo = javaslat?.dontesiIdo ?? null;
    if (javaslat?.toredekCsoportId) {
      const csoportToredekek = await javaslatRepository.findByToredekCsoportId(javaslat.toredekCsoportId);
      const idok = (csoportToredekek ?? [])
        .map(t => t.dontesiIdo)
        .filter(x => typeof x === 'number' && !Number.isNaN(x));
      if (idok.length > 0) kijelzendoDontesiIdo = Math.max(...idok);
    }

    adatok = {
      javaslatTipus: javaslat?.javaslatTipus ?? null,
      statusz: javaslat?.statusz ?? null,
      reszveteliArany: javaslat?.reszveteliArany ?? null,
      tamogatotsagiArany: javaslat?.tamogatotsagiArany ?? null,
      ellenzoiArany: javaslat?.ellenzoiArany ?? null,
      tartozkodoiArany: javaslat?.tartozkodoiArany ?? null, // MODELL A – tiszta tartózkodói szelet
      bizonyossagiMutato: javaslat?.bizonyossagiMutato ?? null,
      dontesiIdo: kijelzendoDontesiIdo, // Töredékcsoportnál a közös (MAX) döntési idő
      toredekAdatok
    };

    // ===== SZAVAZATI JOGOSULTSÁG (szavazhat) =====
    // A backend SAJÁT szabályát futtatjuk: az e-embernek MINDEN érintett
    // entitáson kell tudatpont (a javaslaton magán NEM szükséges). Így a
    // „Szavazat leadása" menüpont pontosan akkor aktív a frontenden, amikor a
    // szavazatService is engedné – egyetlen forrásból, nem duplikált logikából.
    let szavazhat = false;
    if (eemberId && Array.isArray(javaslat?.erintettEntitasok) && javaslat.erintettEntitasok.length > 0) {
      try {
        const jogosultsag = await javaslatJogosultsagService.szavazasiJogosultsagEllenorzese(
          eemberId,
          javaslat.erintettEntitasok
        );
        szavazhat = jogosultsag.jogosult;
      } catch (hiba) {
        // Hiba esetén NEM engedélyezünk – a backend úgyis kikényszeríti a szabályt
        console.error('egyElemAdatainakFeltoltese - szavazhat számítás hiba', hiba.message);
        szavazhat = false;
      }
    }
    adatok.szavazhat = szavazhat;
  } else if (elem.entitasTipus === 'Egyezmeny') {
    const egyezmeny = await egyezmenyRepository.findById(elem.entitasId);
    adatok = {
      javaslatTipus: egyezmeny?.javaslatTipus ?? null,
      reszveteliArany: egyezmeny?.reszveteliArany ?? null,
      tamogatotsagiArany: egyezmeny?.tamogatotsagiArany ?? null,
      ellenzoiArany: egyezmeny?.ellenzoiArany ?? null, // MODELL A – ellenzői arány snapshot
      tartozkodoiArany: egyezmeny?.tartozkodoiArany ?? null, // MODELL A – tartózkodói arány snapshot
      bizonyossagiMutato: egyezmeny?.bizonyossagiMutato ?? null,
      dontesDatum: egyezmeny?.vegrehajtva ?? null // A döntés (végrehajtás) dátuma – a fejléc 2. sorához
    };
  } else {
    console.warn('egyElemAdatainakFeltoltese - Ismeretlen entitástípus', elem.entitasTipus);
  }

  console.log('egyElemAdatainakFeltoltese - VÉGE', {
    entitasId: elem.entitasId,
    entitasSajatTudatpont,
    hozzajarulokSzama,
    eemberSajatTudatpontEntitason
  });

  return {
    melysegiSzint: elem.melysegiSzint,
    entitasId: elem.entitasId,
    entitasTipus: elem.entitasTipus,
    hierarchikusOsszesPont: elem.hierarchikusOsszesPont,
    letrehozva: elem.letrehozva ?? null, // Döntetlen pontnál a testvér-sorrendhez (Pakli.js)
    szuloId: elem.szuloId ?? null, // A szülő azonosítója, null ha gyökér
    entitasSajatTudatpont, // Az entitás saját (közvetlen) összpontja – NEM a néző e-emberé
    hozzajarulokSzama, // Hány e-ember tett rá közvetlen tudatpontot
    eemberSajatTudatpontEntitason, // A néző e-ember saját pontja ezen az entitáson (0, ha nincs / nincs bejelentkezve)
    adatok
  };
}

// ----- OLVASATLAN BADGE-SZÁMOK FELTÖLTÉSE (részfa-alapú) -----
/**
* A megadott pakli-elemekre ráírja az `olvasatlanErtesitesek` mezőt: hány OLVASATLAN
* értesítése van a néző e-embernek az elem ÁGA alatt (magán az entitáson vagy bármely
* leszármazottján — az értesítések osLanc mezője alapján, "felbugyborékolás").
* EGYETLEN csoportos lekérdezés fut az összes elemre (ertesitesService aggregáció).
* Best-effort: hiba esetén minden elem 0-t kap, a pakli összeállítása nem törik meg.
* A tömb elemeit HELYBEN módosítja (a hívó ugyanazokat az objektumokat küldi tovább).
* @param {Array} elemek - Pakli-elemek (entitasId mezővel)
* @param {string|null} eemberId - A néző e-ember azonosítója (null → minden badge 0)
*/
async olvasatlanBadgeFeltoltese(elemek, eemberId = null) {
  console.log('olvasatlanBadgeFeltoltese - KEZDÉS', {
    elemszam: elemek.length,
    eemberId
  });

  // Alapérték: minden elem 0 – így a mező bejelentkezés nélkül is mindig létezik
  for (const elem of elemek) elem.olvasatlanErtesitesek = 0;

  // Nincs bejelentkezett néző vagy nincs elem → nincs mit számolni
  if (!eemberId || elemek.length === 0) {
    console.log('olvasatlanBadgeFeltoltese - VÉGE', { megjegyzes: 'nincs néző vagy elem' });
    return;
  }

  try {
    const entitasIdk = elemek.map(elem => elem.entitasId.toString());
    const terkep = await ertesitesService.olvasatlanokSzamaEntitasonkent(eemberId, entitasIdk);
    for (const elem of elemek) {
      elem.olvasatlanErtesitesek = terkep[elem.entitasId.toString()] ?? 0;
    }
  } catch (hiba) {
    // A badge másodlagos információ – hibája nem akaszthatja meg a paklit
    console.error('olvasatlanBadgeFeltoltese - HIBA (badge-ek 0-n maradnak)', hiba.message);
  }

  console.log('olvasatlanBadgeFeltoltese - VÉGE', { elemszam: elemek.length });
}

// ----- ENTITÁS SZÖVEG LEKÉRÉSE -----
/**
* Csak a kiválasztott entitás szöveg/leírás/indoklás mezőjét kéri le.
* Típusonként eltérő mezőnév: Tartalom→szoveg, Kategoria/TartalomTipus→leiras,
* Javaslat/Egyezmeny→indoklas
* @param {string} entitasId - Az entitás azonosítója
* @param {string} entitasTipus - Az entitás típusa
* @returns {Promise<string|null>} A szöveg mező értéke, vagy null ha nincs
*/
async entitasSzovegLekerese(entitasId, entitasTipus) {
console.log('entitasSzovegLekerese - KEZDÉS', { entitasId, entitasTipus });

let szoveg = null;

if (entitasTipus === 'Tartalom') {
    const tartalom = await tartalomRepository.findById(entitasId);
    szoveg = tartalom?.szoveg ?? null;
} else if (entitasTipus === 'Kategoria') {
    const kategoria = await kategoriaRepository.findById(entitasId);
    szoveg = kategoria?.leiras ?? null;
} else if (entitasTipus === 'TartalomTipus') {
    const tartalomTipus = await tartalomTipusRepository.findById(entitasId);
    szoveg = tartalomTipus?.leiras ?? null;
} else if (entitasTipus === 'Javaslat') {
    const javaslat = await javaslatRepository.findById(entitasId);
    szoveg = javaslat?.indoklas ?? null;
} else if (entitasTipus === 'Egyezmeny') {
    const egyezmeny = await egyezmenyRepository.findById(entitasId);
    szoveg = egyezmeny?.indoklas ?? null;
} else {
    console.warn('entitasSzovegLekerese - Ismeretlen entitástípus', entitasTipus);
}

console.log('entitasSzovegLekerese - VÉGE', { entitasId, szoveg: szoveg ? 'van adat' : null });
return szoveg;
}
}

// --- EXPORTÁLÁS - SINGLETON példány ---
module.exports = new PakliService();