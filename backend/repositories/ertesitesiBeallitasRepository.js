// backend/repositories/ertesitesiBeallitasRepository.js

// Az ErtesitesiBeallitas modell importálása
const ErtesitesiBeallitas = require('../models/ertesitesiBeallitas');

// --- METÓDUS KEZDETE: letrehoz ---
// Új értesítési beállítás létrehozása egy adott entitásra
// Paraméter: adatok (objektum) – az összes szükséges mező
// Visszatérés: az újonnan létrehozott dokumentum
const letrehoz = async (adatok) => {
  console.log('ertesitesiBeallitasRepository.letrehoz - KEZDET', { adatok });

  // Új dokumentum létrehozása és mentése az adatbázisba
  const ujBeallitas = await ErtesitesiBeallitas.create(adatok);

  console.log('ertesitesiBeallitasRepository.letrehoz - VEGE', { ujBeallitas });
  return ujBeallitas;
};
// --- METÓDUS VEGE: letrehoz ---


// --- METÓDUS KEZDETE: keresById ---
// Egy beállítás lekérése az azonosítója alapján
// Paraméter: id (string) – a MongoDB ObjectId
// Visszatérés: a dokumentum, vagy null ha nem található
const keresByid = async (id) => {
  console.log('ertesitesiBeallitasRepository.keresByid - KEZDET', { id });

  const beallitas = await ErtesitesiBeallitas.findById(id);

  console.log('ertesitesiBeallitasRepository.keresByid - VEGE', { beallitas });
  return beallitas;
};
// --- METÓDUS VEGE: keresByid ---


// --- METÓDUS KEZDETE: keresByE_EmberEsEntitas ---
// Egy eEmber beállításának lekérése egy konkrét entitáson
// Ez az egyedi index alapján fut – pontosan 0 vagy 1 eredményt ad vissza
// Paraméterek: eEmberId, entitasId, entitasTipus
// Visszatérés: a dokumentum, vagy null ha nincs beállítás ezen az entitáson
const keresByE_EmberEsEntitas = async (eEmberId, entitasId, entitasTipus) => {
  console.log('ertesitesiBeallitasRepository.keresByE_EmberEsEntitas - KEZDET', {
    eEmberId,
    entitasId,
    entitasTipus,
  });

  const beallitas = await ErtesitesiBeallitas.findOne({
    eEmberId,
    entitasId,
    entitasTipus,
  });

  console.log('ertesitesiBeallitasRepository.keresByE_EmberEsEntitas - VEGE', { beallitas });
  return beallitas;
};
// --- METÓDUS VEGE: keresByE_EmberEsEntitas ---


// --- METÓDUS KEZDETE: keresByE_Ember ---
// Egy eEmber összes értesítési beállításának lekérése
// Pl. a beállítások kezelő oldalhoz kell, ahol az eEmber látja az összes beállítását
// Paraméter: eEmberId
// Visszatérés: beállítások tömbje (üres tömb ha nincs semmi)
const keresByE_Ember = async (eEmberId) => {
  console.log('ertesitesiBeallitasRepository.keresByE_Ember - KEZDET', { eEmberId });

  const beallitasok = await ErtesitesiBeallitas.find({ eEmberId });

  console.log('ertesitesiBeallitasRepository.keresByE_Ember - VEGE', {
    darabszam: beallitasok.length,
  });
  return beallitasok;
};
// --- METÓDUS VEGE: keresByE_Ember ---


// --- METÓDUS KEZDETE: keresByEntitas ---
// Egy adott entitás összes eEmber beállításának lekérése
// Ez kell a cascade értesítés kiküldésekor: kik figyelik ezt az entitást?
// Paraméterek: entitasId, entitasTipus
// Visszatérés: beállítások tömbje
const keresByEntitas = async (entitasId, entitasTipus) => {
  console.log('ertesitesiBeallitasRepository.keresByEntitas - KEZDET', {
    entitasId,
    entitasTipus,
  });

  const beallitasok = await ErtesitesiBeallitas.find({ entitasId, entitasTipus });

  console.log('ertesitesiBeallitasRepository.keresByEntitas - VEGE', {
    darabszam: beallitasok.length,
  });
  return beallitasok;
};
// --- METÓDUS VEGE: keresByEntitas ---


// --- METÓDUS KEZDETE: frissit ---
// Egy meglévő beállítás módosítása
// Paraméterek: id, ujAdatok (objektum a módosítandó mezőkkel)
// Visszatérés: a frissített dokumentum, vagy null ha nem található
const frissit = async (id, ujAdatok) => {
  console.log('ertesitesiBeallitasRepository.frissit - KEZDET', { id, ujAdatok });

  // new: true → a frissített dokumentumot adja vissza, nem a régit
  // runValidators: true → a séma validációkat futtatja a frissítéskor is
  const frissitettBeallitas = await ErtesitesiBeallitas.findByIdAndUpdate(
    id,
    ujAdatok,
    { new: true, runValidators: true }
  );

  console.log('ertesitesiBeallitasRepository.frissit - VEGE', { frissitettBeallitas });
  return frissitettBeallitas;
};
// --- METÓDUS VEGE: frissit ---


// --- METÓDUS KEZDETE: torol ---
// Egy beállítás törlése az azonosítója alapján
// Paraméter: id
// Visszatérés: a törölt dokumentum, vagy null ha nem találta
const torol = async (id) => {
  console.log('ertesitesiBeallitasRepository.torol - KEZDET', { id });

  const toroltBeallitas = await ErtesitesiBeallitas.findByIdAndDelete(id);

  console.log('ertesitesiBeallitasRepository.torol - VEGE', { toroltBeallitas });
  return toroltBeallitas;
};
// --- METÓDUS VEGE: torol ---


// --- METÓDUS KEZDETE: torolE_EmberOsszes ---
// Egy eEmber összes beállításának törlése
// Pl. ha az eEmber törlődik a rendszerből, a beállításait is törölni kell
// Paraméter: eEmberId
// Visszatérés: törlési eredmény (hány dokumentum törlődött)
const torolE_EmberOsszes = async (eEmberId) => {
  console.log('ertesitesiBeallitasRepository.torolE_EmberOsszes - KEZDET', { eEmberId });

  const eredmeny = await ErtesitesiBeallitas.deleteMany({ eEmberId });

  console.log('ertesitesiBeallitasRepository.torolE_EmberOsszes - VEGE', {
    toroltDarab: eredmeny.deletedCount,
  });
  return eredmeny;
};
// --- METÓDUS VEGE: torolE_EmberOsszes ---


// Az összes metódus exportálása
module.exports = {
  letrehoz,
  keresByid,
  keresByE_EmberEsEntitas,
  keresByE_Ember,
  keresByEntitas,
  frissit,
  torol,
  torolE_EmberOsszes,
};