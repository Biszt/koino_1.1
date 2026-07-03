// backend/services/ertesitesiBeallitasService.js

// Repository importálása
const ertesitesiBeallitasRepository = require('../repositories/ertesitesiBeallitasRepository');

// --- METÓDUS KEZDETE: beallitasLetrehozasVagyFrissites ---
// Beállítás létrehozása, ha még nincs – vagy frissítése, ha már létezik (upsert logika)
// Paraméterek:
//   eEmberId – a bejelentkezett eEmber
//   beallitasAdatok – { entitasId, entitasTipus, ertesitesTipusok, tudatpontKuszob, kikapcsolva }
// Visszatérés: a létrehozott vagy frissített beállítás
const beallitasLetrehozasVagyFrissites = async (eEmberId, beallitasAdatok) => {
  console.log('ertesitesiBeallitasService.beallitasLetrehozasVagyFrissites - KEZDET', {
    eEmberId,
    beallitasAdatok,
  });

  const { entitasId, entitasTipus, ertesitesTipusok, tudatpontKuszob, kikapcsolva } =
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
      tudatpontKuszob,
      kikapcsolva,
    });
  } else {
    // Még nem létezik → létrehozzuk
    eredmeny = await ertesitesiBeallitasRepository.letrehoz({
      eEmberId,
      entitasId,
      entitasTipus,
      ertesitesTipusok: ertesitesTipusok || [],
      tudatpontKuszob: tudatpontKuszob || null,
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
// Egy konkrét entitáson lévő beállítás lekérése az eEmbernek
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


// --- METÓDUS KEZDETE: beallitasTorles ---
// Egy beállítás törlése – csak a saját beállítását törölheti az eEmber
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
  beallitasLetrehozasVagyFrissites,
  sajatBeallitasokLekereses,
  entitasBeallitasLekereses,
  beallitasTorles,
};