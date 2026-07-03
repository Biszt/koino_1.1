// backend/controllers/feltoltesController.js

// Kép feltöltés végpont – a Multer (szovegKepFeltoltes) már feldolgozta a fájlt
const kepFeltoltes = (req, res) => {
  console.log('feltoltesController.kepFeltoltes - KEZDÉS');

  // Ha Multer nem talált 'kep' mezőnevű fájlt a kérésben
  if (!req.file) {
    console.warn('feltoltesController.kepFeltoltes - Nincs fájl a kérésben');
    return res.status(400).json({ error: 'Nem érkezett képfájl.' });
  }

  // Nyilvános URL összeállítása – uploads/kepek/ mappából szolgáljuk ki
  const url = `/uploads/kepek/${req.file.filename}`;

  console.log('feltoltesController.kepFeltoltes - VÉGE', { url });
  return res.status(200).json({ url });
};

// Fájl feltöltés végpont – a Multer (szovegFajlFeltoltes) már feldolgozta a fájlt
const fajlFeltoltes = (req, res) => {
  console.log('feltoltesController.fajlFeltoltes - KEZDÉS');

  // Ha Multer nem talált 'fajl' mezőnevű fájlt a kérésben
  if (!req.file) {
    console.warn('feltoltesController.fajlFeltoltes - Nincs fájl a kérésben');
    return res.status(400).json({ error: 'Nem érkezett fájl.' });
  }

  // Nyilvános URL összeállítása – uploads/fajlok/ mappából szolgáljuk ki
  const url = `/uploads/fajlok/${req.file.filename}`;
  // Eredeti fájlnév megőrzése a frontend számára (megjelenítéshez)
  const nev = req.file.originalname;

  console.log('feltoltesController.fajlFeltoltes - VÉGE', { url, nev });
  return res.status(200).json({ url, nev });
};

// Multer hibákat JSON-ként adja vissza, nem HTML-ként
// 4 paraméteres függvény – az Express így ismeri fel hibakezelőként
const feltoltesHibaKezelo = (err, req, res, next) => {
  console.log('feltoltesController.feltoltesHibaKezelo - KEZDÉS', { hiba: err.message });

  if (err) {
    console.log('feltoltesController.feltoltesHibaKezelo - VÉGE', { statusz: 400 });
    return res.status(400).json({ error: err.message });
  }

  next(err);
};

module.exports = { kepFeltoltes, fajlFeltoltes, feltoltesHibaKezelo };