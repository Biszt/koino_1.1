// backend/repositories/hierarchikusTudatpontAllokaciRepository.js

// MODEL IMPORTÁLÁSA
const HierarchikusTudatpontAllokacio = require('../models/hierarchikusTudatpontAllokacio');

const { Types } = require('mongoose'); 

// HIERARCHIKUS TUDATPONT ALLOKÁCIÓ REPOSITORY OSZTÁLY
class HierarchikusTudatpontAllokaciRepository {

// ----- KERESÉS ENTITÁS ALAPJÁN -----
/**
* @param {string} entitasId - Az entitás azonosítója
* @param {string} entitasTipus - Az entitás típusa
* @returns {Promise}
*/
async findByEntitas(entitasId, entitasTipus) {
  console.log('hierarchikusAllokaciRepository.findByEntitas - KEZDÉS', { entitasId, entitasTipus });

  // =============================================
  // MÓDOSÍTVA - ObjectId konverzió
  // =============================================
  // Az entitasId stringként érkezik (URL paraméterből vagy authHelper-ből),
  // de a MongoDB ObjectId-ként tárolja – explicit konverzió szükséges.
  const objektumId = Types.ObjectId.isValid(entitasId)
    ? new Types.ObjectId(entitasId)
    : entitasId;

  const eredmeny = await HierarchikusTudatpontAllokacio.findOne({
    entitasId: objektumId,
    entitasTipus: entitasTipus
  });

  console.log('hierarchikusAllokaciRepository.findByEntitas - VÉGE', { talalt: !!eredmeny });
  return eredmeny;
}

// ----- KERESÉS ID ALAPJÁN -----
/**
* @param {string} id - MongoDB ObjectId
* @returns {Promise}
*/
async findById(id) {
    console.log('hierarchikusAllokaciRepository.findById - KEZDÉS', { id });

    const eredmeny = await HierarchikusTudatpontAllokacio.findById(id);

    console.log('hierarchikusAllokaciRepository.findById - VÉGE', { talalt: !!eredmeny });
    return eredmeny;
}

// ----- KERESÉS ENTITÁS-AZONOSÍTÓ ALAPJÁN (TÍPUS NÉLKÜL) -----
/**
* Egy entitáshoz pontosan egy allokáció tartozik (compound unique index),
* így az entitasId önmagában (indexelt) egyértelműen azonosít. A Síkidom
* nézet gyökér-lekérése használja, ahol csak az entitasId érkezik URL-ből.
* @param {string} entitasId - Az entitás azonosítója
* @returns {Promise<Object|null>} a lean allokáció, vagy null
*/
async findByEntitasId(entitasId) {
    console.log('hierarchikusAllokaciRepository.findByEntitasId - KEZDÉS', { entitasId });

    const objektumId = Types.ObjectId.isValid(entitasId)
        ? new Types.ObjectId(entitasId)
        : entitasId;

    const eredmeny = await HierarchikusTudatpontAllokacio.findOne({ entitasId: objektumId }).lean();

    console.log('hierarchikusAllokaciRepository.findByEntitasId - VÉGE', { talalt: !!eredmeny });
    return eredmeny;
}

// ----- LÉTREHOZÁS VAGY FRISSÍTÉS (UPSERT) -----
/**
* @param {string} entitasId - Az entitás azonosítója
* @param {string} entitasTipus - Az entitás típusa
* @param {number} hierarchikusOsszesPont - Az új hierarchikus pontérték
* @param {string|null} szuloId - A szülő entitás azonosítója (opcionális)
* @param {string|null} szuloTipus - A szülő entitás típusa (opcionális)
* @returns {Promise}
*/
async createOrUpdate(entitasId, entitasTipus, hierarchikusOsszesPont, szuloId = null, szuloTipus = null) {
    console.log('hierarchikusAllokaciRepository.createOrUpdate - KEZDÉS', {
        entitasId, entitasTipus, hierarchikusOsszesPont, szuloId, szuloTipus
    });

    // Frissítendő mezők összeállítása
    const frissitesek = {
        hierarchikusOsszesPont: hierarchikusOsszesPont,
        frissitve: new Date()
    };

    // Szülő adatokat csak akkor írjuk be, ha meg vannak adva
    // Ez elkerüli, hogy meglévő szülő adatot null-ra írjuk felül véletlenül
    if (szuloId !== undefined) frissitesek.szuloId = szuloId;
    if (szuloTipus !== undefined) frissitesek.szuloTipus = szuloTipus;

    const eredmeny = await HierarchikusTudatpontAllokacio.findOneAndUpdate(
        { entitasId: entitasId, entitasTipus: entitasTipus },
        { $set: frissitesek },
        {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true
        }
    );

    console.log('hierarchikusAllokaciRepository.createOrUpdate - VÉGE', { entitasId, entitasTipus });
    return eredmeny;
}

// ----- HIERARCHIKUS PONT NÖVELÉSE/CSÖKKENTÉSE (ATOMI MŰVELET) -----
/**
* @param {string} entitasId - Az entitás azonosítója
* @param {string} entitasTipus - Az entitás típusa
* @param {number} kulonbseg - A különbség (+/-)
* @returns {Promise}
*/
async incrementHierarchikusPont(entitasId, entitasTipus, kulonbseg) {
    console.log('hierarchikusAllokaciRepository.incrementHierarchikusPont - KEZDÉS', {
        entitasId, entitasTipus, kulonbseg
    });

    const eredmeny = await HierarchikusTudatpontAllokacio.findOneAndUpdate(
        { entitasId: entitasId, entitasTipus: entitasTipus },
        {
            $inc: { hierarchikusOsszesPont: kulonbseg },
            $set: { frissitve: new Date() }
        },
        { new: true, upsert: true, runValidators: true }
    );

    console.log('hierarchikusAllokaciRepository.incrementHierarchikusPont - VÉGE', {
        entitasId, ujPont: eredmeny?.hierarchikusOsszesPont
    });
    return eredmeny;
}

// ----- SZÜLŐ ADATOK FRISSÍTÉSE -----
/**
* Egy allokáció szülő adatainak frissítése
* Használat: törlési kaszkádnál, amikor a szülő entitás megváltozik
* @param {string} entitasId - Az entitás azonosítója
* @param {string} entitasTipus - Az entitás típusa
* @param {string|null} ujSzuloId - Az új szülő azonosítója (lehet null)
* @param {string|null} ujSzuloTipus - Az új szülő típusa (lehet null)
* @returns {Promise}
*/
async updateSzulo(entitasId, entitasTipus, ujSzuloId, ujSzuloTipus) {
    console.log('hierarchikusAllokaciRepository.updateSzulo - KEZDÉS', {
        entitasId, entitasTipus, ujSzuloId, ujSzuloTipus
    });

    const frissitett = await HierarchikusTudatpontAllokacio.findOneAndUpdate(
        { entitasId: entitasId, entitasTipus: entitasTipus },
        {
            $set: {
                szuloId: ujSzuloId,
                szuloTipus: ujSzuloTipus,
                frissitve: new Date()
            }
        },
        { new: true }
    );

    console.log('hierarchikusAllokaciRepository.updateSzulo - VÉGE', { frissitett: !!frissitett });
    return frissitett;
}

// ----- SZÜLŐ ADATOK FRISSÍTÉSE (ALIAS) -----
/**
* Az updateSzulo metódus aliasa - tudatpontService.js kompatibilitáshoz
* @param {string} entitasId - Az entitás azonosítója
* @param {string} entitasTipus - Az entitás típusa
* @param {string|null} ujSzuloId - Az új szülő azonosítója (lehet null)
* @param {string|null} ujSzuloTipus - Az új szülő típusa (lehet null)
* @returns {Promise}
*/
async updateSzuloId(entitasId, entitasTipus, ujSzuloId, ujSzuloTipus) {
    return await this.updateSzulo(entitasId, entitasTipus, ujSzuloId, ujSzuloTipus);
}

// ----- GYEREKEK KERESÉSE SZÜLŐ ALAPJÁN -----
/**
* Egy szülő entitás közvetlen gyerekeinek lekérése
* Pont szerint csökkenő sorrendben - bogár logikához
* @param {string} szuloId - A szülő entitás azonosítója
* @param {number} limit - Maximum ennyi rekord (alapértelmezett: 100)
* @param {number} skip - Ennyi rekord kihagyása (alapértelmezett: 0)
* @returns {Promise}
*/
async findBySzuloId(szuloId, limit = 100, skip = 0) {
    console.log('hierarchikusAllokaciRepository.findBySzuloId - KEZDÉS', { szuloId, limit, skip });

    const gyerekek = await HierarchikusTudatpontAllokacio.find({ szuloId: szuloId })
        .sort({ hierarchikusOsszesPont: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

    console.log('hierarchikusAllokaciRepository.findBySzuloId - VÉGE', { count: gyerekek.length });
    return gyerekek;
}

// ----- LEGERŐSEBB GYEREK KERESÉSE -----
/**
* Egy szülő entitás legerősebb (legnagyobb hierarchikusOsszesPont) gyerekének lekérése
* Bogár logika fő művelete - minden lépésnél ezt hívjuk
* @param {string} szuloId - A szülő entitás azonosítója
* @returns {Promise}
*/
async findLegerossebbGyerek(szuloId) {
    console.log('hierarchikusAllokaciRepository.findLegerossebbGyerek - KEZDÉS', { szuloId });

    const legerosebb = await HierarchikusTudatpontAllokacio.findOne({ szuloId: szuloId })
        .sort({ hierarchikusOsszesPont: -1 })
        .lean();

    console.log('hierarchikusAllokaciRepository.findLegerossebbGyerek - VÉGE', {
        talalt: !!legerosebb,
        entitasId: legerosebb?.entitasId
    });
    return legerosebb;
}

// ----- GYÖKÉR ENTITÁSOK KERESÉSE -----
/**
* Gyökér entitások lekérése (ahol szuloId = null)
* @param {number} limit - Maximum ennyi rekord
* @param {number} skip - Ennyi rekord kihagyása
* @returns {Promise}
*/
async findGyokerek(limit = 100, skip = 0) {
    console.log('hierarchikusAllokaciRepository.findGyokerek - KEZDÉS', { limit, skip });

    const gyokerek = await HierarchikusTudatpontAllokacio.find({ szuloId: null })
        .sort({ hierarchikusOsszesPont: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

    console.log('hierarchikusAllokaciRepository.findGyokerek - VÉGE', { count: gyokerek.length });
    return gyokerek;
}

// ----- LEGERŐSEBB GYÖKÉR ENTITÁS -----
/**
* A legnagyobb hierarchikusOsszesPont értékű gyökér entitás lekérése
* Használat: első betöltéskor ez lesz a kiindulópont
* @returns {Promise}
*/
async findLegerossebbGyoker() {
    console.log('hierarchikusAllokaciRepository.findLegerossebbGyoker - KEZDÉS');

    const legerosebb = await HierarchikusTudatpontAllokacio.findOne({ szuloId: null })
        .sort({ hierarchikusOsszesPont: -1 })
        .lean();

    console.log('hierarchikusAllokaciRepository.findLegerossebbGyoker - VÉGE', {
        talalt: !!legerosebb,
        entitasId: legerosebb?.entitasId
    });
    return legerosebb;
}

// ----- KÖVETKEZŐ TESTVÉR KERESÉSE -----
/**
* Az aktuális entitásnál kisebb hierarchikusOsszesPont értékű,
* azonos szuloId-jú entitások közül a legközelebbi (legnagyobb) lekérése.
* Használat: balra swipe - következő testvér paklijának betöltéséhez.
* Gyökér esetén (szuloId: null) ugyanez a logika működik, nincs külön ág.
* @param {string|null} szuloId - Az aktuális entitás szülőjének azonosítója (null ha gyökér)
* @param {number} aktualisHierarchikusOsszesPont - Az aktuális entitás pontszáma
* @param {string} aktualisEntitasId - Az aktuális entitás azonosítója (döntetlen töréshez)
* @returns {Promise} A következő testvér allokációja, vagy null ha nincs
*/
async findKovetkezoTestver(szuloId, aktualisHierarchikusOsszesPont, aktualisEntitasId) {
    console.log('hierarchikusAllokaciRepository.findKovetkezoTestver - KEZDÉS', {
        szuloId, aktualisHierarchikusOsszesPont, aktualisEntitasId
    });

    const kovetkezo = await HierarchikusTudatpontAllokacio.findOne({
        szuloId: szuloId,
        $or: [
            { hierarchikusOsszesPont: { $lt: aktualisHierarchikusOsszesPont } },
            {
                hierarchikusOsszesPont: aktualisHierarchikusOsszesPont,
                entitasId: { $gt: aktualisEntitasId }
            }
        ]
    })
        .sort({ hierarchikusOsszesPont: -1, entitasId: 1 })
        .lean();

    console.log('hierarchikusAllokaciRepository.findKovetkezoTestver - VÉGE', {
        talalt: !!kovetkezo,
        entitasId: kovetkezo?.entitasId,
        pont: kovetkezo?.hierarchikusOsszesPont
    });
    return kovetkezo;
}

// ----- ELŐZŐ TESTVÉR KERESÉSE -----
/**
* Az aktuális entitásnál nagyobb hierarchikusOsszesPont értékű,
* azonos szuloId-jú entitások közül a legközelebbi (legkisebb) lekérése.
* Használat: jobbra swipe - előző testvér paklijának betöltéséhez.
* Gyökér esetén (szuloId: null) ugyanez a logika működik, nincs külön ág.
* @param {string|null} szuloId - Az aktuális entitás szülőjének azonosítója (null ha gyökér)
* @param {number} aktualisHierarchikusOsszesPont - Az aktuális entitás pontszáma
* @param {string} aktualisEntitasId - Az aktuális entitás azonosítója (döntetlen töréshez)
* @returns {Promise} Az előző testvér allokációja, vagy null ha nincs
*/
async findEloZoTestver(szuloId, aktualisHierarchikusOsszesPont, aktualisEntitasId) {
    console.log('hierarchikusAllokaciRepository.findEloZoTestver - KEZDÉS', {
        szuloId, aktualisHierarchikusOsszesPont, aktualisEntitasId
    });

    const elozo = await HierarchikusTudatpontAllokacio.findOne({
        szuloId: szuloId,
        $or: [
            { hierarchikusOsszesPont: { $gt: aktualisHierarchikusOsszesPont } },
            {
                hierarchikusOsszesPont: aktualisHierarchikusOsszesPont,
                entitasId: { $lt: aktualisEntitasId }
            }
        ]
    })
        .sort({ hierarchikusOsszesPont: 1, entitasId: -1 })
        .lean();

    console.log('hierarchikusAllokaciRepository.findEloZoTestver - VÉGE', {
        talalt: !!elozo,
        entitasId: elozo?.entitasId,
        pont: elozo?.hierarchikusOsszesPont
    });
    return elozo;
}

// ----- TESTVÉREK KERESÉSE (AKTUÁLIS ENTITÁS NÉLKÜL) -----
/**
* Az aktuális entitással azonos szuloId-jú entitások lekérése,
* az aktuális entitást kizárva. Pont szerint csökkenő sorrend.
* Használat: pakli összeállításakor a testvérek adatainak lekéréséhez,
* ahol az aktuális entitás maga nem szerepelhet testvérként.
* Gyökér esetén (szuloId: null) a többi gyökeret adja vissza.
* @param {string|null} szuloId - Az aktuális entitás szülőjének azonosítója (null ha gyökér)
* @param {string} kizartEntitasId - Az aktuális entitás azonosítója (ezt kizárjuk)
* @param {number} limit - Maximum ennyi rekord (alapértelmezett: 100)
* @returns {Promise<Array>}
*/
async findTestverek(szuloId, kizartEntitasId, limit = 100) {
    console.log('hierarchikusAllokaciRepository.findTestverek - KEZDÉS', {
        szuloId,
        kizartEntitasId,
        limit
    });

    // $ne operátorral kizárjuk az aktuális entitást már az adatbázis lekérdezésben
    const testverek = await HierarchikusTudatpontAllokacio.find({
        szuloId:   szuloId,
        entitasId: { $ne: kizartEntitasId }
    })
        // Elsődleges rendezés: hierarchikus összpont CSÖKKENŐ.
        // Döntetlennél (azonos pont) a KORÁBBAN létrehozott entitás kerül előrébb
        // (letrehozva NÖVEKVŐ) – így a testvér-sorrend determinisztikus, nem ugrál.
        .sort({ hierarchikusOsszesPont: -1, letrehozva: 1 })
        .limit(limit)
        .lean();

    console.log('hierarchikusAllokaciRepository.findTestverek - VÉGE', {
        testverekSzama: testverek.length
    });
    return testverek;
}

// ----- TÖRLÉS ENTITÁS ALAPJÁN -----
/**
* @param {string} entitasId - Az entitás azonosítója
* @param {string} entitasTipus - Az entitás típusa
* @returns {Promise}
*/
async deleteByEntitas(entitasId, entitasTipus) {
    console.log('hierarchikusAllokaciRepository.deleteByEntitas - KEZDÉS', { entitasId, entitasTipus });

    const torolve = await HierarchikusTudatpontAllokacio.findOneAndDelete({
        entitasId: entitasId,
        entitasTipus: entitasTipus
    });

    console.log('hierarchikusAllokaciRepository.deleteByEntitas - VÉGE', { torolve: !!torolve });
    return torolve;
}

// ----- TÖRLÉS ID ALAPJÁN -----
/**
* @param {string} id - MongoDB ObjectId
* @returns {Promise}
*/
async deleteById(id) {
    console.log('hierarchikusAllokaciRepository.deleteById - KEZDÉS', { id });

    const torolve = await HierarchikusTudatpontAllokacio.findByIdAndDelete(id);

    console.log('hierarchikusAllokaciRepository.deleteById - VÉGE', { torolve: !!torolve });
    return torolve;
}

// ----- LÉTEZIK-E ENTITÁSHOZ ALLOKÁCIÓ -----
/**
* @param {string} entitasId - Az entitás azonosítója
* @param {string} entitasTipus - Az entitás típusa
* @returns {Promise}
*/
async existsByEntitas(entitasId, entitasTipus) {
    console.log('hierarchikusAllokaciRepository.existsByEntitas - KEZDÉS', { entitasId, entitasTipus });

    const result = await HierarchikusTudatpontAllokacio.exists({
        entitasId: entitasId,
        entitasTipus: entitasTipus
    });

    const letezik = result !== null;
    console.log('hierarchikusAllokaciRepository.existsByEntitas - VÉGE', { letezik });
    return letezik;
}

// ----- LISTA LEKÉRÉSE TÍPUS SZERINT -----
/**
* @param {string} entitasTipus - Az entitás típusa
* @param {number} limit - Maximum ennyi rekord
* @param {number} skip - Ennyi rekord kihagyása
* @returns {Promise}
*/
async listByTipus(entitasTipus, limit = 100, skip = 0) {
    console.log('hierarchikusAllokaciRepository.listByTipus - KEZDÉS', { entitasTipus, limit, skip });

    const lista = await HierarchikusTudatpontAllokacio.find({ entitasTipus: entitasTipus })
        .sort({ hierarchikusOsszesPont: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

    console.log('hierarchikusAllokaciRepository.listByTipus - VÉGE', { count: lista.length });
    return lista;
}

// ----- ÖSSZES ALLOKÁCIÓ DARABSZÁMA -----
/**
* A teljes kollekció elemszáma — a Térkép (teljes képernyős fa-nézet) előzetes
* darabszám-kijelzéséhez. Minden entitásnak pontosan egy allokációja van
* (compound unique index), így ez az entitások összdarabszáma.
* @returns {Promise<number>}
*/
async countOsszes() {
    console.log('hierarchikusAllokaciRepository.countOsszes - KEZDÉS');

    const darab = await HierarchikusTudatpontAllokacio.countDocuments({});

    console.log('hierarchikusAllokaciRepository.countOsszes - VÉGE', { darab });
    return darab;
}

// ----- TÉRKÉP LAP LEKÉRÉSE (KURZOROS LAPOZÁS) -----
/**
* A teljes fa lapozott lekérése a Térkép (teljes képernyős fa-nézet) számára.
* Kurzoros lapozás _id szerint (stabil, skip nélkül): a hívó a legutóbb
* kapott sor `_id`-ját adja át kurzorként, mi az annál nagyobbakat adjuk.
* Csak a fa-rajzoláshoz szükséges mezőket küldjük (szűk projection).
* @param {string|null} kurzorId - az előző lap utolsó sorának _id-ja (null = első lap)
* @param {number} limit - lap mérete (alapértelmezett: 2000)
* @returns {Promise<Array>} a lap sorai _id szerint növekvő sorrendben
*/
async findTerkepLap(kurzorId = null, limit = 2000) {
    console.log('hierarchikusAllokaciRepository.findTerkepLap - KEZDÉS', { kurzorId, limit });

    const szuro = kurzorId ? { _id: { $gt: new Types.ObjectId(kurzorId) } } : {};

    const sorok = await HierarchikusTudatpontAllokacio.find(szuro)
        .sort({ _id: 1 })
        .limit(limit)
        .select('entitasId entitasTipus szuloId hierarchikusOsszesPont letrehozva')
        .lean();

    console.log('hierarchikusAllokaciRepository.findTerkepLap - VÉGE', { count: sorok.length });
    return sorok;
}

// ----- ÖSSZES ALLOKÁCIÓ IDŐREND SZERINT (LAPOS RENDEZETT LISTA) -----
/**
* A teljes kollekció egyetlen LAPOS listában, létrehozási idő szerint rendezve.
* A Rendezés nézet (15. terv-pont) globális IDŐRENDI módja használja — itt nincs
* hierarchia, testvér vagy bogárlogika, csak egy sík, rendezett halmaz.
* Determinisztikus döntő az _id, hogy azonos időbélyegnél se ugráljon a sorrend.
* @param {string} irany - 'csokkeno' (legújabb elöl, alapértelmezett) vagy 'novekvo'
* @param {number} limit - Maximum ennyi elem (alapértelmezett: 200; a lapozás későbbi lépés)
* @param {string|null} agazatId - ha megadva, CSAK ennek az ágnak (részfájának) elemei
*   (az indexelt osLanc-szűrésen; a gyökér önmaga is beletartozik)
* @returns {Promise<Array>} a rendezett allokációk (lean)
*/
async findMindIdorendben(irany = 'csokkeno', limit = 200, agazatId = null) {
    console.log('hierarchikusAllokaciRepository.findMindIdorendben - KEZDÉS', { irany, limit, agazatId });

    // Irány → sort érték: csökkenő = -1 (legújabb elöl), növekvő = 1 (legrégebbi elöl).
    // Az _id ugyanabba az irányba dönt, hogy azonos időbélyegnél stabil legyen a sorrend.
    const sortIrany = irany === 'novekvo' ? 1 : -1;

    // Ágazat-szűrés: az osLanc tartalmazza az agazatId-t MINDEN olyan entitásnál, amely
    // az ág gyökere vagy annak leszármazottja → egyetlen indexelt lekérdezés (skálázható).
    const szuro = agazatId
        ? { 'osLanc.entitasId': Types.ObjectId.isValid(agazatId) ? new Types.ObjectId(agazatId) : agazatId }
        : {};

    const sorok = await HierarchikusTudatpontAllokacio.find(szuro)
        .sort({ letrehozva: sortIrany, _id: sortIrany })
        .limit(limit)
        .lean();

    console.log('hierarchikusAllokaciRepository.findMindIdorendben - VÉGE', { count: sorok.length });
    return sorok;
}

// ----- ÖSSZES ALLOKÁCIÓ ÁGAZATI (HIERARCHIKUS) PONT SZERINT (LAPOS RENDEZETT LISTA) -----
/**
* A teljes kollekció (vagy egy ág) LAPOS listában a hierarchikusOsszesPont szerint
* rendezve — ez az „ágazati tudatpont" (az entitás + teljes ága/részfája alatti súly).
* A Rendezés nézet (15. terv-pont) „ágazati tudatpont" módja. Globálisan a
* { hierarchikusOsszesPont: -1 } index, ág-szűrésnél a
* { 'osLanc.entitasId':1, hierarchikusOsszesPont:-1 } compound index szolgálja ki.
* Determinisztikus döntő az _id, hogy azonos pontnál se ugráljon a sorrend.
* @param {string} irany - 'csokkeno' (legtöbb elöl, alapértelmezett) vagy 'novekvo'
* @param {number} limit - Maximum ennyi elem (alapértelmezett: 200)
* @param {string|null} agazatId - ha megadva, CSAK ennek az ágnak (részfájának) elemei
* @returns {Promise<Array>} a rendezett allokációk (lean)
*/
async findMindHierarchikusPontSzerint(irany = 'csokkeno', limit = 200, agazatId = null) {
    console.log('hierarchikusAllokaciRepository.findMindHierarchikusPontSzerint - KEZDÉS', { irany, limit, agazatId });

    const sortIrany = irany === 'novekvo' ? 1 : -1;

    const szuro = agazatId
        ? { 'osLanc.entitasId': Types.ObjectId.isValid(agazatId) ? new Types.ObjectId(agazatId) : agazatId }
        : {};

    const sorok = await HierarchikusTudatpontAllokacio.find(szuro)
        .sort({ hierarchikusOsszesPont: sortIrany, _id: sortIrany })
        .limit(limit)
        .lean();

    console.log('hierarchikusAllokaciRepository.findMindHierarchikusPontSzerint - VÉGE', { count: sorok.length });
    return sorok;
}

// ----- TÖBB ALLOKÁCIÓ LEKÉRÉSE ENTITÁS-AZONOSÍTÓK ALAPJÁN (BATCH) -----
/**
* Több entitás hierarchikus allokációja EGYETLEN lekérdezéssel ($in).
* A Rendezés nézet „saját összpont" módja használja: a tudatpontAllokacio adja a
* rendezett top-N entitást, de a kártya-fejléchez kellő `hierarchikusOsszesPont`
* (+ szuloId, letrehozva) a MÁSIK kollekcióban van — azt hozzuk ide egy batch-csel.
* A visszaadott sorrend NEM garantált; a hívó entitasId szerint map-eli.
* @param {Array} entitasIdk - entitás-azonosítók tömbje (ObjectId vagy string)
* @returns {Promise<Array>} a megtalált allokációk (lean)
*/
async findManyByEntitasIdk(entitasIdk) {
    console.log('hierarchikusAllokaciRepository.findManyByEntitasIdk - KEZDÉS', {
        darab: entitasIdk?.length ?? 0
    });

    if (!entitasIdk || entitasIdk.length === 0) return [];

    // A vegyes (ObjectId/string) bemenetet egységes ObjectId-kká alakítjuk a $in-hez
    const objektumIdk = entitasIdk.map(id =>
        Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : id
    );

    const sorok = await HierarchikusTudatpontAllokacio.find({
        entitasId: { $in: objektumIdk }
    }).lean();

    console.log('hierarchikusAllokaciRepository.findManyByEntitasIdk - VÉGE', { count: sorok.length });
    return sorok;
}

// ----- GYEREK-AZONOSÍTÓK LEKÉRÉSE TÖBB SZÜLŐHÖZ -----
/**
* Több szülő entitás KÖZVETLEN gyerekeinek entitasId-jai egyetlen lekérdezéssel.
* A Térkép ág-darabszámlálása (szintenkénti BFS-bejárás) használja.
* @param {Array} szuloIdk - a szülő entitás-azonosítók tömbje
* @returns {Promise<Array>} a gyerekek entitasId-jai
*/
async findGyerekIdkBySzulok(szuloIdk) {
    console.log('hierarchikusAllokaciRepository.findGyerekIdkBySzulok - KEZDÉS', {
        szulokSzama: szuloIdk.length
    });

    if (!szuloIdk.length) return [];

    const gyerekek = await HierarchikusTudatpontAllokacio.find({
        szuloId: { $in: szuloIdk }
    })
        .select('entitasId')
        .lean();

    console.log('hierarchikusAllokaciRepository.findGyerekIdkBySzulok - VÉGE', {
        gyerekekSzama: gyerekek.length
    });
    return gyerekek.map(gy => gy.entitasId);
}

// ----- ELAVULT HIERARCHIKUS ALLOKÁCIÓK KERESÉSE -----
/**
* Elavult hierarchikus adatok lekérése hierarchia szint alapján
* Használat: HierarchikusFrissitesService CRON job-ja hívja
* @param {number} hierarchiaSzint - A hierarchia szint
* @param {number} batchMeret - Maximum ennyi rekord
* @returns {Promise}
*/
async findElavultHierarchikusAllokaciok(hierarchiaSzint, batchMeret = 100) {
    console.log('hierarchikusAllokaciRepository.findElavultHierarchikusAllokaciok - KEZDÉS', {
        hierarchiaSzint, batchMeret
    });

    const elavultak = await HierarchikusTudatpontAllokacio.find({
        hierarchiaSzint: hierarchiaSzint,
        hierarchikusAdatokElavultak: true
    })
        .limit(batchMeret)
        .lean();

    console.log('hierarchikusAllokaciRepository.findElavultHierarchikusAllokaciok - VÉGE', {
        count: elavultak.length
    });
    return elavultak;
}

// ----- ALLOKÁCIÓ FRISSÍTÉSE ENTITÁS ALAPJÁN -----
/**
* Hierarchikus összesített adatok frissítése
* Használat: HierarchikusFrissitesService hívja újraszámítás után
* @param {string} entitasId - Az entitás azonosítója
* @param {string} entitasTipus - Az entitás típusa
* @param {Object} frissitesek - A frissítendő mezők
* @returns {Promise}
*/
async updateAllokaciByEntitas(entitasId, entitasTipus, frissitesek) {
    console.log('hierarchikusAllokaciRepository.updateAllokaciByEntitas - KEZDÉS', {
        entitasId, entitasTipus, frissitesek
    });

    const eredmeny = await HierarchikusTudatpontAllokacio.findOneAndUpdate(
        { entitasId: entitasId, entitasTipus: entitasTipus },
        { $set: { ...frissitesek, frissitve: new Date() } },
        { new: true }
    );

    console.log('hierarchikusAllokaciRepository.updateAllokaciByEntitas - VÉGE', { frissitett: !!eredmeny });
    return eredmeny;
}
}

// EXPORTÁLÁS - SINGLETON példány
module.exports = new HierarchikusTudatpontAllokaciRepository();