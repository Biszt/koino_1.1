// backend/services/ertesitesiBeallitasService.js

// Repository importálása
const ertesitesiBeallitasRepository = require('../repositories/ertesitesiBeallitasRepository');

// Entitás-modellek – a szülő lekéréséhez kellenek (a cascade felfelé lépéséhez).
// Minden entitástípusnak lehet szülője (szuloId + szuloTipus), ezért mind az öt kell.
const Tartalom = require('../models/tartalom');
const Kategoria = require('../models/kategoria');
const TartalomTipus = require('../models/tartalomTipus');
const Javaslat = require('../models/javaslat');
const Egyezmeny = require('../models/egyezmeny');

// Az eEmber modell – a GLOBÁLIS (fő menüs) alapbeállítás rajta tárolódik
// (ertesitesiAlapbeallitas mező), ez a cascade legvégső visszaesése.
const eEmber = require('../models/eember');


// ===== SEGÉDFÜGGVÉNY: normalizaltKuszobok =====
// A tudatpont-változási küszöbök objektumát egységes, teljes alakra hozza (hiányzó
// mező → null). Így a frontend mindig ugyanazt a 4 kulcsot kapja/küldheti.
const normalizaltKuszobok = (k) => ({
  sajatDirekt: k?.sajatDirekt ?? null,
  sajatSzazalek: k?.sajatSzazalek ?? null,
  osszDirekt: k?.osszDirekt ?? null,
  osszSzazalek: k?.osszSzazalek ?? null,
});


// ===== SEGÉDFÜGGVÉNY: szuloKereses =====
// Egy entitás szülőjét adja vissza (szuloId + szuloTipus formában). Ha nincs szülő, null.
// (Áthozva az ertesitesService-ből: a beállítás FELOLDÁSA a beállítás-service felelőssége,
//  a szülőkön felfelé lépkedés ennek a része.)
// Paraméterek: entitasId (ObjectId), entitasTipus (String)
// Visszatérés: { szuloId, szuloTipus } vagy null
const szuloKereses = async (entitasId, entitasTipus) => {
  console.log('ertesitesiBeallitasService.szuloKereses - KEZDET', { entitasId, entitasTipus });

  // A megfelelő modellből olvassuk ki a szülő-mezőket (minden típusnál ugyanaz a két mező)
  let entitas = null;

  if (entitasTipus === 'Tartalom') {
    entitas = await Tartalom.findById(entitasId).select('szuloId szuloTipus');
  } else if (entitasTipus === 'Kategoria') {
    entitas = await Kategoria.findById(entitasId).select('szuloId szuloTipus');
  } else if (entitasTipus === 'TartalomTipus') {
    entitas = await TartalomTipus.findById(entitasId).select('szuloId szuloTipus');
  } else if (entitasTipus === 'Javaslat') {
    entitas = await Javaslat.findById(entitasId).select('szuloId szuloTipus');
  } else if (entitasTipus === 'Egyezmeny') {
    entitas = await Egyezmeny.findById(entitasId).select('szuloId szuloTipus');
  }

  // Ha nem találjuk az entitást, vagy nincs szülője → a cascade itt megáll (fa gyökere)
  if (!entitas || !entitas.szuloId) {
    console.log('ertesitesiBeallitasService.szuloKereses - VEGE', { szulo: null });
    return null;
  }

  const szulo = { szuloId: entitas.szuloId, szuloTipus: entitas.szuloTipus };
  console.log('ertesitesiBeallitasService.szuloKereses - VEGE', { szulo });
  return szulo;
};


// ===== SEGÉDFÜGGVÉNY: beallitasKeresesCascade =====
// Egy eEmber ÉRVÉNYES beállítását keresi meg egy entitásra – a szülőkön FELFELÉ lépkedve.
// Az ELSŐ megtalált beállítás nyer (a legközelebbi csomópont), a feljebb lévők NEM számítanak
// (ez a "teljes felülírás" elve). Ha a gyökérig sehol nincs beállítás → null (opt-in rendszer).
// Használják: ertesitesService.ertesitesKuldes (kinek küldjünk) és lentebb az
// ervenyesBeallitasLekereses (a beállító ablak előkitöltése).
// Paraméterek: eEmberId, entitasId, entitasTipus
// Visszatérés: a megtalált beállítás dokumentum, vagy null
const beallitasKeresesCascade = async (eEmberId, entitasId, entitasTipus) => {
  console.log('ertesitesiBeallitasService.beallitasKeresesCascade - KEZDET', {
    eEmberId,
    entitasId,
    entitasTipus,
  });

  // Az aktuális pozíció a fában – innen indulunk felfelé
  let aktualisEntitasId = entitasId;
  let aktualisEntitasTipus = entitasTipus;

  while (true) {
    // Van-e beállítás ezen a szinten?
    const beallitas = await ertesitesiBeallitasRepository.keresByE_EmberEsEntitas(
      eEmberId,
      aktualisEntitasId,
      aktualisEntitasTipus
    );

    if (beallitas) {
      // Megvan a legközelebbi beállítás – ezt adjuk vissza, feljebb már nem nézünk
      console.log('ertesitesiBeallitasService.beallitasKeresesCascade - VEGE', { talalt: true });
      return beallitas;
    }

    // Nincs ezen a szinten → lépünk a szülőre
    const szulo = await szuloKereses(aktualisEntitasId, aktualisEntitasTipus);

    if (!szulo) {
      // Elértük a fa gyökerét, nincs több szülő → sehol nincs beállítás
      console.log('ertesitesiBeallitasService.beallitasKeresesCascade - VEGE', { talalt: false });
      return null;
    }

    aktualisEntitasId = szulo.szuloId;
    aktualisEntitasTipus = szulo.szuloTipus;
  }
};


// --- METÓDUS KEZDETE: cimzettekFeloldasa ---
// Egy eseményhez (entitas + típus) visszaadja azokat az e-embereket, akiknek az ÉRVÉNYES
// beállítása (csomóponti/felmenő nearest-wins VAGY globális) TARTALMAZZA ezt a típust és
// nincs kikapcsolva. A tudatpont NEM számít – tisztán a beállítás dönt (bárki figyelhet
// bárhol, akkor is, ha nincs pontja az entitáson).
// Hatékonyság: korlátos számú, indexelt lekérdezés – (fa-mélység) db `keresByEntitas`
// + 1 db globális lekérdezés; nincs "címzettenként egy lekérdezés".
// MELLÉKTERMÉK: a bejárás közben összegyűjtjük az esemény entitásának ŐS-LÁNCÁT is
// (első elem maga az entitás, utána a felmenők a gyökérig) — ezt az ertesitesService
// menti el az értesítésekbe (osLanc mező), hogy később részfa-szűrésre lehessen használni.
// Így a fát csak EGYSZER járjuk be, nem kell külön kör az ős-lánchoz.
// Visszatérés: {
//   cimzettek – [{ eEmberId (string), tudatpontKuszobok }] a tudatpontValtozas küszöbeihez,
//   osLanc    – [{ entitasId, entitasTipus }] az entitástól a gyökérig
// }
const cimzettekFeloldasa = async (entitasId, entitasTipus, ertesitesTipus) => {
  console.log('ertesitesiBeallitasService.cimzettekFeloldasa - KEZDET', {
    entitasId, entitasTipus, ertesitesTipus,
  });

  // eEmberId (string) -> a LEGKÖZELEBBI (érvényes) csomóponti/felmenő beállítása.
  // A lánc bejárása nearest-first; aki egyszer bekerül, azt feljebb már nem írjuk felül.
  const feloldott = new Map();

  // Az ős-lánc gyűjtője — a while-ciklus pontosan a láncot járja be, csak fel kell jegyezni
  const osLanc = [];

  let aktId = entitasId;
  let aktTipus = entitasTipus;
  while (aktId && aktTipus) {
    osLanc.push({ entitasId: aktId, entitasTipus: aktTipus });
    const beallitasok = await ertesitesiBeallitasRepository.keresByEntitas(aktId, aktTipus);
    for (const b of beallitasok) {
      const kulcs = b.eEmberId.toString();
      if (!feloldott.has(kulcs)) feloldott.set(kulcs, b); // nearest wins
    }
    const szulo = await szuloKereses(aktId, aktTipus);
    if (!szulo) break;
    aktId = szulo.szuloId;
    aktTipus = szulo.szuloTipus;
  }

  const cimzettek = [];

  // Csomóponti/felmenő jelöltek: az érvényes beállításuk tartalmazza a típust és nem kikapcsolt.
  // (Aki fel van oldva, de a beállítása NEM tartalmazza a típust → kimarad, ÉS a globális sem
  //  vonatkozik rá, mert a közelebbi beállítás felülírja a globálist.)
  for (const b of feloldott.values()) {
    if (b.kikapcsolva) continue;
    if (!Array.isArray(b.ertesitesTipusok) || !b.ertesitesTipusok.includes(ertesitesTipus)) continue;
    cimzettek.push({ eEmberId: b.eEmberId.toString(), tudatpontKuszobok: b.tudatpontKuszobok });
  }

  // GLOBÁLIS feliratkozók: a globális alapjuk tartalmazza a típust, ÉS a lánc még nem oldotta
  // fel őket (nincs csomóponti/felmenő beállításuk ezen az ágon → a globális az érvényes).
  const globalisEmberek = await eEmber
    .find({ 'ertesitesiAlapbeallitas.ertesitesTipusok': ertesitesTipus })
    .select('ertesitesiAlapbeallitas');

  for (const e of globalisEmberek) {
    const kulcs = e._id.toString();
    if (feloldott.has(kulcs)) continue;
    cimzettek.push({
      eEmberId: kulcs,
      tudatpontKuszobok: e.ertesitesiAlapbeallitas?.tudatpontKuszobok ?? {},
    });
  }

  console.log('ertesitesiBeallitasService.cimzettekFeloldasa - VEGE', {
    cimzettDarab: cimzettek.length,
    osLancHossz: osLanc.length,
  });
  return { cimzettek, osLanc };
};
// --- METÓDUS VEGE: cimzettekFeloldasa ---


// --- METÓDUS KEZDETE: beallitasLetrehozasVagyFrissites ---
// Beállítás létrehozása, ha még nincs – vagy frissítése, ha már létezik (upsert logika).
// FONTOS (megbeszélt szabály): a mentés MINDIG létrehoz saját rekordot ezen a csomóponton,
// akkor is, ha az érték megegyezik az örökölttel. Így az eEmber "be tudja fixálni" ezen az
// ágon a beállítást, és a felülről jövő KÉSŐBBI változás nem hat rá (teljes felülírás).
// Paraméterek:
//   eEmberId – a bejelentkezett eEmber
//   beallitasAdatok – { entitasId, entitasTipus, ertesitesTipusok, tudatpontKuszob, kikapcsolva }
// Visszatérés: a létrehozott vagy frissített beállítás
const beallitasLetrehozasVagyFrissites = async (eEmberId, beallitasAdatok) => {
  console.log('ertesitesiBeallitasService.beallitasLetrehozasVagyFrissites - KEZDET', {
    eEmberId,
    beallitasAdatok,
  });

  const { entitasId, entitasTipus, ertesitesTipusok, tudatpontKuszobok, kikapcsolva } =
    beallitasAdatok;

  // Megkeressük, hogy létezik-e már beállítás ezen az entitáson
  const meglevo = await ertesitesiBeallitasRepository.keresByE_EmberEsEntitas(
    eEmberId,
    entitasId,
    entitasTipus
  );

  let eredmeny;

  if (meglevo) {
    // Már létezik → frissítjük a meglévő beállítást
    eredmeny = await ertesitesiBeallitasRepository.frissit(meglevo._id, {
      ertesitesTipusok,
      tudatpontKuszobok: normalizaltKuszobok(tudatpontKuszobok),
      kikapcsolva,
    });
  } else {
    // Még nem létezik → létrehozzuk
    eredmeny = await ertesitesiBeallitasRepository.letrehoz({
      eEmberId,
      entitasId,
      entitasTipus,
      ertesitesTipusok: ertesitesTipusok || [],
      tudatpontKuszobok: normalizaltKuszobok(tudatpontKuszobok),
      kikapcsolva: kikapcsolva || false,
    });
  }

  console.log('ertesitesiBeallitasService.beallitasLetrehozasVagyFrissites - VEGE', { eredmeny });
  return eredmeny;
};
// --- METÓDUS VEGE: beallitasLetrehozasVagyFrissites ---


// --- METÓDUS KEZDETE: sajatBeallitasokLekereses ---
// Az eEmber összes értesítési beállításának lekérése
// Paraméter: eEmberId
// Visszatérés: beállítások tömbje
const sajatBeallitasokLekereses = async (eEmberId) => {
  console.log('ertesitesiBeallitasService.sajatBeallitasokLekereses - KEZDET', { eEmberId });

  const beallitasok = await ertesitesiBeallitasRepository.keresByE_Ember(eEmberId);

  console.log('ertesitesiBeallitasService.sajatBeallitasokLekereses - VEGE', {
    darabszam: beallitasok.length,
  });
  return beallitasok;
};
// --- METÓDUS VEGE: sajatBeallitasokLekereses ---


// --- METÓDUS KEZDETE: entitasBeallitasLekereses ---
// Egy konkrét entitáson lévő SAJÁT beállítás lekérése az eEmbernek (NEM lép felfelé!).
// Akkor kell, ha kifejezetten arra vagyunk kíváncsiak, van-e ezen a csomóponton saját rekord.
// Paraméterek: eEmberId, entitasId, entitasTipus
// Visszatérés: a beállítás dokumentum, vagy null ha nincs
const entitasBeallitasLekereses = async (eEmberId, entitasId, entitasTipus) => {
  console.log('ertesitesiBeallitasService.entitasBeallitasLekereses - KEZDET', {
    eEmberId,
    entitasId,
    entitasTipus,
  });

  const beallitas = await ertesitesiBeallitasRepository.keresByE_EmberEsEntitas(
    eEmberId,
    entitasId,
    entitasTipus
  );

  console.log('ertesitesiBeallitasService.entitasBeallitasLekereses - VEGE', { beallitas });
  return beallitas;
};
// --- METÓDUS VEGE: entitasBeallitasLekereses ---


// --- METÓDUS KEZDETE: globalisBeallitasLekereses ---
// Az e-ember GLOBÁLIS (fő menüs) értesítési alapbeállítását adja vissza.
// Ez a cascade legvégső visszaesése, és a beállító ablak „globális módja” is ezt tölti.
// Paraméter: eEmberId
// Visszatérés: { ertesitesTipusok, tudatpontKuszob }
const globalisBeallitasLekereses = async (eEmberId) => {
  console.log('ertesitesiBeallitasService.globalisBeallitasLekereses - KEZDET', { eEmberId });

  const eember = await eEmber.findById(eEmberId).select('ertesitesiAlapbeallitas');
  const alap = eember?.ertesitesiAlapbeallitas ?? {};

  const eredmeny = {
    ertesitesTipusok: alap.ertesitesTipusok ?? [],
    tudatpontKuszobok: normalizaltKuszobok(alap.tudatpontKuszobok),
  };

  console.log('ertesitesiBeallitasService.globalisBeallitasLekereses - VEGE', { eredmeny });
  return eredmeny;
};
// --- METÓDUS VEGE: globalisBeallitasLekereses ---


// --- METÓDUS KEZDETE: globalisBeallitasMentese ---
// Az e-ember GLOBÁLIS alapbeállításának mentése (fő menüs „Értesítési beállítások”).
// Paraméterek: eEmberId, adatok { ertesitesTipusok, tudatpontKuszob }
// Visszatérés: a mentett { ertesitesTipusok, tudatpontKuszob }
const globalisBeallitasMentese = async (eEmberId, adatok) => {
  console.log('ertesitesiBeallitasService.globalisBeallitasMentese - KEZDET', { eEmberId, adatok });

  const { ertesitesTipusok, tudatpontKuszobok } = adatok;

  const eember = await eEmber
    .findByIdAndUpdate(
      eEmberId,
      {
        ertesitesiAlapbeallitas: {
          ertesitesTipusok: ertesitesTipusok || [],
          tudatpontKuszobok: normalizaltKuszobok(tudatpontKuszobok),
        },
      },
      { new: true, runValidators: true }
    )
    .select('ertesitesiAlapbeallitas');

  const alap = eember?.ertesitesiAlapbeallitas ?? {};
  const eredmeny = {
    ertesitesTipusok: alap.ertesitesTipusok ?? [],
    tudatpontKuszobok: normalizaltKuszobok(alap.tudatpontKuszobok),
  };

  console.log('ertesitesiBeallitasService.globalisBeallitasMentese - VEGE', { eredmeny });
  return eredmeny;
};
// --- METÓDUS VEGE: globalisBeallitasMentese ---


// --- METÓDUS KEZDETE: ervenyesBeallitasLekereses ---
// Az entitáson ÉPP ÉRVÉNYES (örökölt VAGY saját) beállítást adja vissza – a beállító ablak
// ELŐKITÖLTÉSÉHEZ. A cascade-del feloldja a legközelebbi felmenő beállítást, és megmondja,
// hogy ez a KONKRÉT csomópont saját rekordja-e (ekkor mutatható a "vissza az örököltre" gomb).
// Paraméterek: eEmberId, entitasId, entitasTipus
// Visszatérés: {
//   ertesitesTipusok  – az előre kipipálandó típusok (üres, ha sehol nincs beállítás),
//   kikapcsolva       – az érvényes beállítás kikapcsolt-e,
//   tudatpontKuszob   – az érvényes küszöb (vagy null),
//   forras            – 'sajat' | 'orokolt' | 'nincs' (honnan jön az érvényes érték),
//   vanSajat          – van-e saját rekord PONTOSAN ezen a csomóponton
// }
const ervenyesBeallitasLekereses = async (eEmberId, entitasId, entitasTipus) => {
  console.log('ertesitesiBeallitasService.ervenyesBeallitasLekereses - KEZDET', {
    eEmberId,
    entitasId,
    entitasTipus,
  });

  // A legközelebbi érvényes beállítás a fában felfelé (vagy null, ha a fában sehol nincs)
  const ervenyes = await beallitasKeresesCascade(eEmberId, entitasId, entitasTipus);

  if (ervenyes) {
    // Van-e saját rekord PONTOSAN ezen a csomóponton? A cascade a saját rekordot találná
    // meg elsőként, ezért elég összevetni a talált beállítás entitását a kért entitással.
    const vanSajat =
      ervenyes.entitasId.toString() === entitasId.toString() &&
      ervenyes.entitasTipus === entitasTipus;

    const eredmeny = {
      ertesitesTipusok: ervenyes.ertesitesTipusok,
      kikapcsolva: ervenyes.kikapcsolva,
      tudatpontKuszobok: normalizaltKuszobok(ervenyes.tudatpontKuszobok),
      forras: vanSajat ? 'sajat' : 'orokolt',
      vanSajat,
      // A saját rekord azonosítója – ez kell a "vissza az örököltre" (törlés) gombhoz.
      // Csak saját (nem örökölt) beállításnál van értelme.
      beallitasId: vanSajat ? ervenyes._id : null,
    };

    console.log('ertesitesiBeallitasService.ervenyesBeallitasLekereses - VEGE', { eredmeny });
    return eredmeny;
  }

  // A fában SEHOL nincs beállítás → a GLOBÁLIS (fő menüs) alapbeállítás dönt.
  const globalis = await globalisBeallitasLekereses(eEmberId);
  const eredmeny = {
    ertesitesTipusok: globalis.ertesitesTipusok,
    kikapcsolva: false,
    tudatpontKuszobok: normalizaltKuszobok(globalis.tudatpontKuszobok),
    forras: 'globalis',
    vanSajat: false,
    beallitasId: null,
  };

  console.log('ertesitesiBeallitasService.ervenyesBeallitasLekereses - VEGE', { eredmeny });
  return eredmeny;
};
// --- METÓDUS VEGE: ervenyesBeallitasLekereses ---


// --- METÓDUS KEZDETE: beallitasTorles ---
// Egy beállítás törlése – csak a saját beállítását törölheti az eEmber.
// UI-jelentés: "vissza az örököltre" (a saját rekord törlése után újra a felmenőt örökli).
// Paraméterek: beallitasId, eEmberId (jogosultság ellenőrzéshez)
const beallitasTorles = async (beallitasId, eEmberId) => {
  console.log('ertesitesiBeallitasService.beallitasTorles - KEZDET', {
    beallitasId,
    eEmberId,
  });

  // Megkeressük a beállítást
  const beallitas = await ertesitesiBeallitasRepository.keresByid(beallitasId);

  if (!beallitas) {
    throw new Error('A beállítás nem található');
  }

  // Jogosultság ellenőrzés: csak a saját beállítását törölheti
  if (beallitas.eEmberId.toString() !== eEmberId.toString()) {
    throw new Error('Nincs jogosultságod ehhez a beállításhoz');
  }

  const torolt = await ertesitesiBeallitasRepository.torol(beallitasId);

  console.log('ertesitesiBeallitasService.beallitasTorles - VEGE', { torolt });
  return torolt;
};
// --- METÓDUS VEGE: beallitasTorles ---


module.exports = {
  // A cascade-et, a címzett-feloldást és a globális lekérést az ertesitesService is használja
  beallitasKeresesCascade,
  cimzettekFeloldasa,
  globalisBeallitasLekereses,
  globalisBeallitasMentese,
  ervenyesBeallitasLekereses,
  beallitasLetrehozasVagyFrissites,
  sajatBeallitasokLekereses,
  entitasBeallitasLekereses,
  beallitasTorles,
};
