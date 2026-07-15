// backend/repositories/ertesitesRepository.js

// A mongoose az aggregációs ObjectId-konverzióhoz kell (olvasatlanokSzamaEntitasonkent)
const mongoose = require('mongoose');

// Az Ertesites modell importálása
const Ertesites = require('../models/ertesites');

// --- METÓDUS KEZDETE: letrehoz ---
// Új értesítés létrehozása (egyetlen rekord egy eEmbernek)
// Paraméter: adatok (objektum) – az összes szükséges mező
// Visszatérés: az újonnan létrehozott dokumentum
const letrehoz = async (adatok) => {
  console.log('ertesitesRepository.letrehoz - KEZDET', { adatok });

  const ujErtesites = await Ertesites.create(adatok);

  console.log('ertesitesRepository.letrehoz - VEGE', { ujErtesites });
  return ujErtesites;
};
// --- METÓDUS VEGE: letrehoz ---


// --- METÓDUS KEZDETE: tomegesLetrehoz ---
// Több értesítés egyszerre létrehozása – hatékonyabb mint egyenként hívni a letrehoz-t
// Pl. ha egy eseményre 20 eEmber kap értesítést, egyszerre menti be mindet
// Paraméter: adatokTombje (tömb) – több objektum egyszerre
// Visszatérés: a létrehozott dokumentumok tömbje
const tomegesLetrehoz = async (adatokTombje) => {
  console.log('ertesitesRepository.tomegesLetrehoz - KEZDET', {
    darabszam: adatokTombje.length,
  });

  // insertMany sokkal gyorsabb mint N darab create() egymás után
  const ujErtesitesek = await Ertesites.insertMany(adatokTombje);

  console.log('ertesitesRepository.tomegesLetrehoz - VEGE', {
    letrehozottDarab: ujErtesitesek.length,
  });
  return ujErtesitesek;
};
// --- METÓDUS VEGE: tomegesLetrehoz ---


// --- METÓDUS KEZDETE: keresByid ---
// Egy értesítés lekérése azonosító alapján
// Paraméter: id (string)
// Visszatérés: a dokumentum, vagy null ha nem található
const keresByid = async (id) => {
  console.log('ertesitesRepository.keresByid - KEZDET', { id });

  const ertesites = await Ertesites.findById(id);

  console.log('ertesitesRepository.keresByid - VEGE', { ertesites });
  return ertesites;
};
// --- METÓDUS VEGE: keresByid ---


// --- METÓDUS KEZDETE: keresByE_Ember ---
// Egy eEmber postafiókjának lekérése – lapozással (pagination)
// Paraméterek:
//   eEmberId – kinek a postafiókja
//   lap       – hányadik oldal (1-től indul)
//   lapMeret  – hány elem per oldal (alapból 20)
//   agEntitasId – opcionális ÁG-SZŰRŐ: csak azok az értesítések, amelyeknek az
//                 ős-láncában (osLanc) szerepel ez az entitás — vagyis az entitáson
//                 VAGY bármely leszármazottján történt az esemény (kártya-postafiók)
// Visszatérés: { ertesitesek, osszes, olvasatlan }
const keresByE_Ember = async (eEmberId, lap = 1, lapMeret = 20, agEntitasId = null) => {
  console.log('ertesitesRepository.keresByE_Ember - KEZDET', {
    eEmberId,
    lap,
    lapMeret,
    agEntitasId,
  });

  // Hány rekordot kell kihagyni (pl. 2. oldal, 20 elemet kihagyunk)
  const kihagyando = (lap - 1) * lapMeret;

  // A közös szűrő-objektum: alapból az eEmber összes értesítése; ág-szűrésnél
  // csak azok, amiknek az ős-láncában szerepel a kért entitás (a find automatikusan
  // ObjectId-vá alakítja a stringet — az aggregációval ellentétben)
  const szures = { eEmberId };
  if (agEntitasId) szures['osLanc.entitasId'] = agEntitasId;

  // Párhuzamosan futtatjuk a három lekérdezést a gyorsaság érdekében
  const [ertesitesek, osszes, olvasatlan] = await Promise.all([
    // A tényleges lista: legújabb elöl, lapozással
    Ertesites.find(szures)
      .sort({ createdAt: -1 })
      .skip(kihagyando)
      .limit(lapMeret),

    // Az összes értesítés száma (lapozáshoz kell)
    Ertesites.countDocuments(szures),

    // Az olvasatlan értesítések száma (badge számhoz kell a UI-ban)
    Ertesites.countDocuments({ ...szures, olvasva: false }),
  ]);

  console.log('ertesitesRepository.keresByE_Ember - VEGE', {
    visszaadottDarab: ertesitesek.length,
    osszes,
    olvasatlan,
  });

  return { ertesitesek, osszes, olvasatlan };
};
// --- METÓDUS VEGE: keresByE_Ember ---


// --- METÓDUS KEZDETE: olvasatlanokSzama ---
// Csak az olvasatlan értesítések számát adja vissza egy eEmbernek
// Ezt hívjuk gyakran (pl. minden oldalbetöltéskor a badge frissítéséhez)
// Paraméter: eEmberId
// Visszatérés: szám (Number)
const olvasatlanokSzama = async (eEmberId) => {
  console.log('ertesitesRepository.olvasatlanokSzama - KEZDET', { eEmberId });

  const szam = await Ertesites.countDocuments({ eEmberId, olvasva: false });

  console.log('ertesitesRepository.olvasatlanokSzama - VEGE', { szam });
  return szam;
};
// --- METÓDUS VEGE: olvasatlanokSzama ---


// --- METÓDUS KEZDETE: olvasatlanokSzamaEntitasonkent ---
// RÉSZFA-SZÁMLÁLÓ a kártya-badge-ekhez: egy eEmber olvasatlan értesítéseit számolja meg
// ENTITÁSONKÉNT — egy értesítés MINDEN olyan kért entitásnál beleszámít, amelyik szerepel
// az ős-láncában (osLanc). Így egy mély eseményről a szülő, nagyszülő... kártyája is tud
// („felbugyborékolás"), és mindezt EGYETLEN aggregációs lekérdezéssel, nem entitásonként.
// Lépések: $match (a multikey indexet használja) → $unwind (a lánc elemeire bontás) →
// $match (csak a kért entitások maradnak) → $group (entitásonkénti darabszám).
// Paraméterek: eEmberId, entitasIdk (tömb — a pakli összes elemének azonosítója)
// Visszatérés: { '<entitasId>': darab, ... } — csak a 0-nál nagyobb számúak szerepelnek
const olvasatlanokSzamaEntitasonkent = async (eEmberId, entitasIdk) => {
  console.log('ertesitesRepository.olvasatlanokSzamaEntitasonkent - KEZDET', {
    eEmberId,
    entitasDarab: entitasIdk?.length ?? 0,
  });

  // Üres lista → nincs mit számolni
  if (!Array.isArray(entitasIdk) || entitasIdk.length === 0) return {};

  // Az aggregáció NEM végez automatikus string→ObjectId konverziót (a find igen),
  // ezért kézzel alakítjuk át az azonosítókat
  const idk = entitasIdk.map((id) => new mongoose.Types.ObjectId(id.toString()));

  const sorok = await Ertesites.aggregate([
    { $match: {
        eEmberId: new mongoose.Types.ObjectId(eEmberId.toString()),
        olvasva: false,
        'osLanc.entitasId': { $in: idk },
    } },
    { $unwind: '$osLanc' },
    { $match: { 'osLanc.entitasId': { $in: idk } } },
    { $group: { _id: '$osLanc.entitasId', darab: { $sum: 1 } } },
  ]);

  // Tömb → egyszerű { entitasId: darab } térkép, hogy a hívó O(1) alatt olvashassa
  const terkep = {};
  for (const sor of sorok) terkep[sor._id.toString()] = sor.darab;

  console.log('ertesitesRepository.olvasatlanokSzamaEntitasonkent - VEGE', {
    talalatDarab: sorok.length,
  });
  return terkep;
};
// --- METÓDUS VEGE: olvasatlanokSzamaEntitasonkent ---


// --- METÓDUS KEZDETE: megjelolOlvasottnak ---
// Egy konkrét értesítés megjelölése olvasottként
// Beállítja az olvasva: true és olvasvaIdopont: most mezőket
// Paraméter: id
// Visszatérés: a frissített dokumentum
const megjelolOlvasottnak = async (id) => {
  console.log('ertesitesRepository.megjelolOlvasottnak - KEZDET', { id });

  const frissitettErtesites = await Ertesites.findByIdAndUpdate(
    id,
    {
      olvasva: true,
      olvasvaIdopont: new Date(), // pontosan rögzítjük, mikor olvasta el
    },
    { new: true }
  );

  console.log('ertesitesRepository.megjelolOlvasottnak - VEGE', { frissitettErtesites });
  return frissitettErtesites;
};
// --- METÓDUS VEGE: megjelolOlvasottnak ---


// --- METÓDUS KEZDETE: megjelolMindetOlvasottnak ---
// Egy eEmber összes olvasatlan értesítését megjelöli olvasottként egyszerre
// Pl. "Mindet olvasottnak jelöl" gomb a postafiókban
// Paraméterek:
//   eEmberId – kinek az értesítései
//   agEntitasId – opcionális ÁG-SZŰRŐ: csak az adott entitás ága alatti (osLanc)
//                 olvasatlanokat jelöli meg — a kártya-postafiók „Mind olvasottnak"
//                 gombja NEM nyúlhat a többi ág értesítéseihez
// Visszatérés: tömeges frissítés eredménye (hány rekord módosult)
const megjelolMindetOlvasottnak = async (eEmberId, agEntitasId = null) => {
  console.log('ertesitesRepository.megjelolMindetOlvasottnak - KEZDET', { eEmberId, agEntitasId });

  // Csak az olvasatlanokat; ág-szűrésnél csak az ág alattiakat
  const szures = { eEmberId, olvasva: false };
  if (agEntitasId) szures['osLanc.entitasId'] = agEntitasId;

  const eredmeny = await Ertesites.updateMany(
    szures,
    {
      olvasva: true,
      olvasvaIdopont: new Date(),
    }
  );

  console.log('ertesitesRepository.megjelolMindetOlvasottnak - VEGE', {
    modositottDarab: eredmeny.modifiedCount,
  });
  return eredmeny;
};
// --- METÓDUS VEGE: megjelolMindetOlvasottnak ---


// --- METÓDUS KEZDETE: torol ---
// Egy konkrét értesítés törlése
// Paraméter: id
// Visszatérés: a törölt dokumentum
const torol = async (id) => {
  console.log('ertesitesRepository.torol - KEZDET', { id });

  const toroltErtesites = await Ertesites.findByIdAndDelete(id);

  console.log('ertesitesRepository.torol - VEGE', { toroltErtesites });
  return toroltErtesites;
};
// --- METÓDUS VEGE: torol ---


// --- METÓDUS KEZDETE: torolE_EmberOsszes ---
// Egy eEmber összes értesítésének törlése
// Pl. ha az eEmber törlődik a rendszerből
// Paraméter: eEmberId
// Visszatérés: törlési eredmény
const torolE_EmberOsszes = async (eEmberId) => {
  console.log('ertesitesRepository.torolE_EmberOsszes - KEZDET', { eEmberId });

  const eredmeny = await Ertesites.deleteMany({ eEmberId });

  console.log('ertesitesRepository.torolE_EmberOsszes - VEGE', {
    toroltDarab: eredmeny.deletedCount,
  });
  return eredmeny;
};
// --- METÓDUS VEGE: torolE_EmberOsszes ---


// --- METÓDUS KEZDETE: torolEntitasOsszes ---
// Egy entitáshoz kapcsolódó összes értesítés törlése
// Pl. ha egy Tartalom vagy Kategoria törlődik, a rá vonatkozó értesítések is törlődnek
// Paraméterek: entitasId, entitasTipus
// Visszatérés: törlési eredmény
const torolEntitasOsszes = async (entitasId, entitasTipus) => {
  console.log('ertesitesRepository.torolEntitasOsszes - KEZDET', {
    entitasId,
    entitasTipus,
  });

  const eredmeny = await Ertesites.deleteMany({ entitasId, entitasTipus });

  console.log('ertesitesRepository.torolEntitasOsszes - VEGE', {
    toroltDarab: eredmeny.deletedCount,
  });
  return eredmeny;
};
// --- METÓDUS VEGE: torolEntitasOsszes ---


// Az összes metódus exportálása
module.exports = {
  letrehoz,
  tomegesLetrehoz,
  keresByid,
  keresByE_Ember,
  olvasatlanokSzama,
  olvasatlanokSzamaEntitasonkent,
  megjelolOlvasottnak,
  megjelolMindetOlvasottnak,
  torol,
  torolE_EmberOsszes,
  torolEntitasOsszes,
};