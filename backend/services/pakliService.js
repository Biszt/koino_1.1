// backend/services/pakliService.js

// --- IMPORTÁLÁSOK ---
const hierarchikusAllokaciRepository = require('../repositories/hierarchikusTudatpontAllokaciRepository');
const tudatpontRepository = require('../repositories/tudatpontRepository');
const tartalomRepository = require('../repositories/tartalomRepository');
const kategoriaRepository = require('../repositories/kategoriaRepository');
const tartalomTipusRepository = require('../repositories/tartalomTipusRepository');
const javaslatRepository = require('../repositories/javaslatRepository');
const egyezmenyRepository = require('../repositories/egyezmenyRepository');

// --- PAKLI SERVICE OSZTÁLY ---
class PakliService {

// ----- PAKLI ÖSSZEÁLLÍTÁSA -----
/**
* A kiválasztott entitás függvényében összeállítja a teljes paklit.
* Ha nincs megadva entitás, a legerősebb gyökértől indul.
* @param {string|null} entitasId - A kiválasztott entitás azonosítója (opcionális)
* @param {string|null} entitasTipus - A kiválasztott entitás típusa (opcionális)
* @returns {Promise} A kész pakli adatokkal feltöltve
*/
async pakliotOsszeallitasa(entitasId = null, entitasTipus = null) {
    console.log('pakliotOsszeallitasa - KEZDÉS', { entitasId, entitasTipus });

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
    const feltoltottPakli = await this.pakliAdatokFeltoltese(listaaMelyseggelEgyutt);

    // 7. LÉPÉS - TESTVÉREK ÖSSZEGYŰJTÉSE
    // A felmenők listájának hossza megadja a kiválasztott entitás mélységi szintjét,
    // mivel a kiválasztott entitás mindig a felmenők listájának utolsó eleme.
    // Ezt adjuk át a testvéreknek, hogy helyes mélységi szinttel rendelkezzenek.
    const kivalasztottMelysegiSzint = felmenok.length;

    const testverek = await this.testverekOsszegyujtese(
        kivalasztottEntitas.szuloId ?? null,
        kivalasztottEntitas.entitasId.toString(),
        kivalasztottMelysegiSzint
    );

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

// ----- TESTVÉREK ÖSSZEGYŰJTÉSE -----
/**
* A kiválasztott entitás összes testvérét gyűjti össze alap adatokkal feltöltve.
* Testvér = azonos szuloId-jú entitás, az aktuális entitás NÉLKÜL.
* A szűrés adatbázis szinten történik a findTestverek metódusban ($ne operátor).
* Hierarchikus pont szerint csökkenő sorrendben érkeznek.
* @param {string|null} szuloId - A kiválasztott entitás szülőjének azonosítója (null ha gyökér)
* @param {string} kivalasztottEntitasId - A kiválasztott entitás azonosítója
* @param {number} melysegiSzint - A kiválasztott entitás mélységi szintje – a testvérek ugyanezen a szinten vannak
* @returns {Promise<Array>} A testvérek listája alap adatokkal feltöltve
*/
async testverekOsszegyujtese(szuloId, kivalasztottEntitasId, melysegiSzint) {
  console.log('testverekOsszegyujtese - KEZDÉS', { szuloId, kivalasztottEntitasId, melysegiSzint });

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
    testverAlap.map(elem => this.egyElemAdatainakFeltoltese(elem))
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
* és a saját tudatpontot a TudatpontAllokacio kollekcióból.
* @param {Array} pakliAlap - A mélységi szinttel ellátott pakli alap tömb
* @returns {Promise} A feltöltött pakli
*/
async pakliAdatokFeltoltese(pakliAlap) {
console.log('pakliAdatokFeltoltese - KEZDÉS', { elemszam: pakliAlap.length });

// Minden elemet párhuzamosan dolgozunk fel - Promise.all
const feltoltottPakli = await Promise.all(
    pakliAlap.map(elem => this.egyElemAdatainakFeltoltese(elem))
);

console.log('pakliAdatokFeltoltese - VÉGE', { feltoltottElemszam: feltoltottPakli.length });
return feltoltottPakli;
}

// ----- EGY ELEM ADATAINAK FELTÖLTÉSE -----
/**
* Egyetlen pakli elem adatait tölti fel entitástípus szerint.
* @param {Object} elem - A pakli elem (entitasId, entitasTipus, hierarchikusOsszesPont, melysegiSzint, szuloId)
* @returns {Promise} A feltöltött pakli elem
*/
async egyElemAdatainakFeltoltese(elem) {
  console.log('egyElemAdatainakFeltoltese - KEZDÉS', {
    entitasId: elem.entitasId,
    entitasTipus: elem.entitasTipus
  });

  // Saját tudatpont lekérése a TudatpontAllokacio kollekcióból
  const sajatAllokacio = await tudatpontRepository.findAllokaciByEntitas(
    elem.entitasId,
    elem.entitasTipus
  );
  const sajatTudatpont = sajatAllokacio?.osszesPont ?? 0;

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
    adatok = {
      nev: kategoria?.nev ?? null,
      ikon: kategoria?.ikon ?? null
    };
  } else if (elem.entitasTipus === 'TartalomTipus') {
    const tartalomTipus = await tartalomTipusRepository.findById(elem.entitasId);
    adatok = {
      nev: tartalomTipus?.nev ?? null,
      ikon: tartalomTipus?.ikon ?? null
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
    adatok = {
      javaslatTipus: javaslat?.javaslatTipus ?? null,
      statusz: javaslat?.statusz ?? null,
      reszveteliArany: javaslat?.reszveteliArany ?? null,
      tamogatotsagiArany: javaslat?.tamogatotsagiArany ?? null,
      ellenzoiArany: javaslat?.ellenzoiArany ?? null,
      bizonyossagiMutato: javaslat?.bizonyossagiMutato ?? null,
      dontesiIdo: javaslat?.dontesiIdo ?? null,
      toredekAdatok
    };
  } else if (elem.entitasTipus === 'Egyezmeny') {
    const egyezmeny = await egyezmenyRepository.findById(elem.entitasId);
    adatok = {
      javaslatTipus: egyezmeny?.javaslatTipus ?? null,
      reszveteliArany: egyezmeny?.reszveteliArany ?? null,
      tamogatotsagiArany: egyezmeny?.tamogatotsagiArany ?? null,
      bizonyossagiMutato: egyezmeny?.bizonyossagiMutato ?? null
    };
  } else {
    console.warn('egyElemAdatainakFeltoltese - Ismeretlen entitástípus', elem.entitasTipus);
  }

  console.log('egyElemAdatainakFeltoltese - VÉGE', {
    entitasId: elem.entitasId,
    sajatTudatpont
  });

  return {
    melysegiSzint: elem.melysegiSzint,
    entitasId: elem.entitasId,
    entitasTipus: elem.entitasTipus,
    hierarchikusOsszesPont: elem.hierarchikusOsszesPont,
    letrehozva: elem.letrehozva ?? null, // Döntetlen pontnál a testvér-sorrendhez (Pakli.js)
    szuloId: elem.szuloId ?? null, // A szülő azonosítója, null ha gyökér
    sajatTudatpont,
    adatok
  };
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