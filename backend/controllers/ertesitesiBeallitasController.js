// backend/controllers/ertesitesiBeallitasController.js

// A service importálása
const ertesitesiBeallitasService = require('../services/ertesitesiBeallitasService');

// --- METÓDUS KEZDETE: beallitasLetrehozasVagyFrissites ---
// PUT /api/ertesitesi-beallitasok
// Beállítás létrehozása vagy frissítése egy entitáson
// Ha már létezik beállítás ezen az entitáson → frissíti
// Ha még nem létezik → létrehozza
// Ezt "upsert" műveletnek nevezzük
const beallitasLetrehozasVagyFrissites = async (req, res) => {
  console.log('ertesitesiBeallitasController.beallitasLetrehozasVagyFrissites - KEZDET', {
    eEmberId: req.user.id,
    body: req.body,
  });

  try {
    const { entitasId, entitasTipus, ertesitesTipusok, tudatpontKuszob, kikapcsolva } = req.body;

    const beallitas = await ertesitesiBeallitasService.beallitasLetrehozasVagyFrissites(
      req.user.id,
      { entitasId, entitasTipus, ertesitesTipusok, tudatpontKuszob, kikapcsolva }
    );

    console.log('ertesitesiBeallitasController.beallitasLetrehozasVagyFrissites - VEGE', {
      beallitas,
    });

    res.status(200).json({
      siker: true,
      adatok: beallitas,
    });
  } catch (hiba) {
    console.error(
      'ertesitesiBeallitasController.beallitasLetrehozasVagyFrissites - HIBA',
      { hiba }
    );
    res.status(500).json({
      siker: false,
      uzenet: 'A beállítás mentése sikertelen',
    });
  }
};
// --- METÓDUS VEGE: beallitasLetrehozasVagyFrissites ---


// --- METÓDUS KEZDETE: sajatBeallitasokLekereses ---
// GET /api/ertesitesi-beallitasok
// A bejelentkezett eEmber összes beállításának lekérése
// Pl. a beállítások kezelő oldalhoz
const sajatBeallitasokLekereses = async (req, res) => {
  console.log('ertesitesiBeallitasController.sajatBeallitasokLekereses - KEZDET', {
    eEmberId: req.user.id,
  });

  try {
    const beallitasok = await ertesitesiBeallitasService.sajatBeallitasokLekereses(
      req.user.id
    );

    console.log('ertesitesiBeallitasController.sajatBeallitasokLekereses - VEGE', {
      darabszam: beallitasok.length,
    });

    res.status(200).json({
      siker: true,
      adatok: beallitasok,
    });
  } catch (hiba) {
    console.error('ertesitesiBeallitasController.sajatBeallitasokLekereses - HIBA', { hiba });
    res.status(500).json({
      siker: false,
      uzenet: 'A beállítások lekérése sikertelen',
    });
  }
};
// --- METÓDUS VEGE: sajatBeallitasokLekereses ---


// --- METÓDUS KEZDETE: entitasBeallitasLekereses ---
// GET /api/ertesitesi-beallitasok/entitas/:entitasTipus/:entitasId
// Egy konkrét entitáson lévő beállítás lekérése a bejelentkezett eEmbernek
// Akkor kell, amikor egy entitás oldalán meg kell mutatni, hogy mi az aktuális beállítás
const entitasBeallitasLekereses = async (req, res) => {
  console.log('ertesitesiBeallitasController.entitasBeallitasLekereses - KEZDET', {
    eEmberId: req.user.id,
    entitasId: req.params.entitasId,
    entitasTipus: req.params.entitasTipus,
  });

  try {
    const beallitas = await ertesitesiBeallitasService.entitasBeallitasLekereses(
      req.user.id,
      req.params.entitasId,
      req.params.entitasTipus
    );

    console.log('ertesitesiBeallitasController.entitasBeallitasLekereses - VEGE', { beallitas });

    res.status(200).json({
      siker: true,
      // null értéket is visszaadunk – ez azt jelenti, nincs beállítás ezen az entitáson
      adatok: beallitas,
    });
  } catch (hiba) {
    console.error('ertesitesiBeallitasController.entitasBeallitasLekereses - HIBA', { hiba });
    res.status(500).json({
      siker: false,
      uzenet: 'A beállítás lekérése sikertelen',
    });
  }
};
// --- METÓDUS VEGE: entitasBeallitasLekereses ---


// --- METÓDUS KEZDETE: beallitasTorles ---
// DELETE /api/ertesitesi-beallitasok/:id
// Egy beállítás törlése – csak a saját beállítást törölheti az eEmber
const beallitasTorles = async (req, res) => {
  console.log('ertesitesiBeallitasController.beallitasTorles - KEZDET', {
    beallitasId: req.params.id,
    eEmberId: req.user.id,
  });

  try {
    await ertesitesiBeallitasService.beallitasTorles(req.params.id, req.user.id);

    console.log('ertesitesiBeallitasController.beallitasTorles - VEGE', { torolt: true });

    res.status(200).json({
      siker: true,
      uzenet: 'A beállítás törölve',
    });
  } catch (hiba) {
    console.error('ertesitesiBeallitasController.beallitasTorles - HIBA', { hiba });

    if (hiba.message === 'A beállítás nem található') {
      return res.status(404).json({ siker: false, uzenet: hiba.message });
    }
    if (hiba.message === 'Nincs jogosultságod ehhez a beállításhoz') {
      return res.status(403).json({ siker: false, uzenet: hiba.message });
    }

    res.status(500).json({
      siker: false,
      uzenet: 'A törlés sikertelen',
    });
  }
};
// --- METÓDUS VEGE: beallitasTorles ---


module.exports = {
  beallitasLetrehozasVagyFrissites,
  sajatBeallitasokLekereses,
  entitasBeallitasLekereses,
  beallitasTorles,
};