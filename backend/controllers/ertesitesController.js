// backend/controllers/ertesitesController.js

// A service importálása – a controller csak ezen keresztül végez műveleteket
const ertesitesService = require('../services/ertesitesService');

// --- METÓDUS KEZDETE: postafiokLekereses ---
// GET /api/ertesitesek
// Egy eEmber postafiókjának lekérése lapozással
// A bejelentkezett eEmber saját értesítéseit kéri le
const postafiokLekereses = async (req, res) => {
  console.log('ertesitesController.postafiokLekereses - KEZDET', {
    eEmberId: req.eEmber._id,
    query: req.query,
  });

  try {
    // A lapozási paraméterek a query stringből jönnek (pl. ?lap=2&lapMeret=20)
    // Ha nincs megadva, az alapértelmezett értékeket használjuk
    const lap = parseInt(req.query.lap) || 1;
    const lapMeret = parseInt(req.query.lapMeret) || 20;

    const eredmeny = await ertesitesService.postafiokLekereses(
      req.eEmber._id,
      lap,
      lapMeret
    );

    console.log('ertesitesController.postafiokLekereses - VEGE', {
      visszaadottDarab: eredmeny.ertesitesek.length,
    });

    res.status(200).json({
      siker: true,
      adatok: eredmeny,
    });
  } catch (hiba) {
    console.error('ertesitesController.postafiokLekereses - HIBA', { hiba });
    res.status(500).json({
      siker: false,
      uzenet: 'A postafiók lekérése sikertelen',
    });
  }
};
// --- METÓDUS VEGE: postafiokLekereses ---


// --- METÓDUS KEZDETE: olvasatlanokSzama ---
// GET /api/ertesitesek/olvasatlan-szam
// Csak az olvasatlan értesítések számát adja vissza (badge frissítéshez)
const olvasatlanokSzama = async (req, res) => {
  console.log('ertesitesController.olvasatlanokSzama - KEZDET', {
    eEmberId: req.eEmber._id,
  });

  try {
    const eredmeny = await ertesitesService.olvasatlanokSzamaLekereses(req.eEmber._id);

    console.log('ertesitesController.olvasatlanokSzama - VEGE', { eredmeny });

    res.status(200).json({
      siker: true,
      adatok: eredmeny,
    });
  } catch (hiba) {
    console.error('ertesitesController.olvasatlanokSzama - HIBA', { hiba });
    res.status(500).json({
      siker: false,
      uzenet: 'Az olvasatlan szám lekérése sikertelen',
    });
  }
};
// --- METÓDUS VEGE: olvasatlanokSzama ---


// --- METÓDUS KEZDETE: megjelolOlvasottnak ---
// PATCH /api/ertesitesek/:id/olvasott
// Egy konkrét értesítés olvasottnak jelölése
const megjelolOlvasottnak = async (req, res) => {
  console.log('ertesitesController.megjelolOlvasottnak - KEZDET', {
    ertesitesId: req.params.id,
    eEmberId: req.eEmber._id,
  });

  try {
    const frissitett = await ertesitesService.ertesitesMegjelolOlvasottnak(
      req.params.id,
      req.eEmber._id
    );

    console.log('ertesitesController.megjelolOlvasottnak - VEGE', { frissitett });

    res.status(200).json({
      siker: true,
      adatok: frissitett,
    });
  } catch (hiba) {
    console.error('ertesitesController.megjelolOlvasottnak - HIBA', { hiba });

    // A service-ből érkező hibaüzenetek alapján különböző HTTP kódokat küldünk
    if (hiba.message === 'Az értesítés nem található') {
      return res.status(404).json({ siker: false, uzenet: hiba.message });
    }
    if (hiba.message === 'Nincs jogosultságod ehhez az értesítéshez') {
      return res.status(403).json({ siker: false, uzenet: hiba.message });
    }

    res.status(500).json({
      siker: false,
      uzenet: 'Az olvasottnak jelölés sikertelen',
    });
  }
};
// --- METÓDUS VEGE: megjelolOlvasottnak ---


// --- METÓDUS KEZDETE: mindetOlvasottnak ---
// PATCH /api/ertesitesek/mind-olvasott
// Az összes olvasatlan értesítés olvasottnak jelölése egyszerre
const mindetOlvasottnak = async (req, res) => {
  console.log('ertesitesController.mindetOlvasottnak - KEZDET', {
    eEmberId: req.eEmber._id,
  });

  try {
    const eredmeny = await ertesitesService.mindetOlvasottnak(req.eEmber._id);

    console.log('ertesitesController.mindetOlvasottnak - VEGE', {
      modositottDarab: eredmeny.modifiedCount,
    });

    res.status(200).json({
      siker: true,
      adatok: { modositottDarab: eredmeny.modifiedCount },
    });
  } catch (hiba) {
    console.error('ertesitesController.mindetOlvasottnak - HIBA', { hiba });
    res.status(500).json({
      siker: false,
      uzenet: 'Az összes olvasottnak jelölése sikertelen',
    });
  }
};
// --- METÓDUS VEGE: mindetOlvasottnak ---


// Az összes controller metódus exportálása
module.exports = {
  postafiokLekereses,
  olvasatlanokSzama,
  megjelolOlvasottnak,
  mindetOlvasottnak,
};