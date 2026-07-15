// backend/services/ertesitesService.js

// Repository importálása – a service csak ezen keresztül kommunikál az adatbázissal
const ertesitesRepository = require('../repositories/ertesitesRepository');

// A beállítás-FELOLDÁS (cascade a szülőkön felfelé) az ertesitesiBeallitasService-ben lakik,
// mert az a beállítások felelőse. Itt csak felhasználjuk a `beallitasKeresesCascade`-et,
// hogy eldöntsük: egy adott eEmber az adott entitáson kap-e értesítést.
const ertesitesiBeallitasService = require('./ertesitesiBeallitasService');

// Entitás-modellek – a postafiók-megjelenítéshez az értesítésekhez feltöltjük a cím-viselő
// entitások címét/nevét (a Javaslat/Egyezmény típusnak nincs címe → ott null marad).
const Tartalom = require('../models/tartalom');
const Kategoria = require('../models/kategoria');
const TartalomTipus = require('../models/tartalomTipus');


// ===== SEGÉDFÜGGVÉNY: entitasCimekFeltoltese =====
// Az értesítésekhez feltölti az érintett entitás címét/nevét (`entitasCim`), típusonként
// EGY csoportos lekérdezéssel (nincs N+1). A nem cím-viselő típusoknál `entitasCim: null`.
const entitasCimekFeltoltese = async (ertesitesek) => {
  const idkTipusonkent = { Tartalom: [], Kategoria: [], TartalomTipus: [] };
  for (const e of ertesitesek) {
    if (idkTipusonkent[e.entitasTipus]) idkTipusonkent[e.entitasTipus].push(e.entitasId);
  }

  const [tartalmak, kategoriak, tipusok] = await Promise.all([
    idkTipusonkent.Tartalom.length ? Tartalom.find({ _id: { $in: idkTipusonkent.Tartalom } }).select('cim') : [],
    idkTipusonkent.Kategoria.length ? Kategoria.find({ _id: { $in: idkTipusonkent.Kategoria } }).select('nev') : [],
    idkTipusonkent.TartalomTipus.length ? TartalomTipus.find({ _id: { $in: idkTipusonkent.TartalomTipus } }).select('nev') : [],
  ]);

  const cimMap = new Map(); // `${tipus}:${id}` -> cím/név
  for (const t of tartalmak) cimMap.set(`Tartalom:${t._id}`, t.cim);
  for (const k of kategoriak) cimMap.set(`Kategoria:${k._id}`, k.nev);
  for (const tt of tipusok) cimMap.set(`TartalomTipus:${tt._id}`, tt.nev);

  return ertesitesek.map((e) => ({
    ...(typeof e.toObject === 'function' ? e.toObject() : e),
    entitasCim: cimMap.get(`${e.entitasTipus}:${e.entitasId}`) ?? null,
  }));
};


// ===== SEGÉDFÜGGVÉNY: tudatpontKuszobTeljesul =====
// A tudatpontValtozas 4 küszöbét értékeli ki ("VAGY": bármelyik megadott feltétel elég).
// Ha egyetlen küszöb sincs megadva → minden változásnál értesítünk.
//   adatok: { sajatValtozas, osszValtozas, sajatOssz, osszOssz } – ezeket a tudatpont-esemény tölti fel.
const tudatpontKuszobTeljesul = (kuszobok, adatok = {}) => {
  const k = kuszobok || {};
  const { sajatDirekt, sajatSzazalek, osszDirekt, osszSzazalek } = k;

  // Nincs egyetlen küszöb sem → mindig értesítünk
  if (sajatDirekt == null && sajatSzazalek == null && osszDirekt == null && osszSzazalek == null) {
    return true;
  }

  const sajatValt = Math.abs(adatok.sajatValtozas || 0);
  const osszValt  = Math.abs(adatok.osszValtozas || 0);
  const sajatOssz = adatok.sajatOssz || 0;
  const osszOssz  = adatok.osszOssz || 0;

  // "VAGY" logika: bármelyik megadott küszöb teljesülése elég
  if (sajatDirekt != null && sajatValt >= sajatDirekt) return true;
  if (osszDirekt  != null && osszValt  >= osszDirekt) return true;
  if (sajatSzazalek != null && sajatOssz > 0 && (sajatValt / sajatOssz) * 100 >= sajatSzazalek) return true;
  if (osszSzazalek  != null && osszOssz  > 0 && (osszValt  / osszOssz)  * 100 >= osszSzazalek)  return true;
  return false;
};


// --- METÓDUS KEZDETE: ertesitesKuldes ---
// Ez a rendszer szíve: egy esemény alapján KISZÁMOLJA a címzetteket (a beállítások alapján,
// TUDATPONTTÓL FÜGGETLENÜL) és létrehozza az értesítéseket.
// Paraméterek:
//   entitasId    – melyik entitáson történt az esemény
//   entitasTipus – az entitás típusa
//   ertesitesTipus – milyen esemény történt (pl. 'ujJavaslat')
//   adatok       – esemény-specifikus részletek (pl. { javaslatId }); tudatpontValtozas-nál
//                  a küszöb-kiértékeléshez { sajatValtozas, osszValtozas, sajatOssz, osszOssz }
//   cselekvoId   – aki kiváltotta az eseményt (őt NEM értesítjük magát); opcionális
// Visszatérés: a létrehozott értesítések tömbje
const ertesitesKuldes = async (
  entitasId,
  entitasTipus,
  ertesitesTipus,
  adatok = {},
  cselekvoId = null
) => {
  console.log('ertesitesService.ertesitesKuldes - KEZDET', {
    entitasId,
    entitasTipus,
    ertesitesTipus,
    cselekvoId,
  });

  // A címzettek feloldása a BEÁLLÍTÁSOK alapján (csomóponti/felmenő nearest-wins + globális),
  // tudatponttól függetlenül. A bejárás mellékterméke az esemény entitásának ŐS-LÁNCA is
  // (első elem maga az entitás, utána a felmenők a gyökérig) — ezt mentjük az értesítésekbe.
  // Visszatérés: { cimzettek: [{ eEmberId, tudatpontKuszobok }], osLanc: [{ entitasId, entitasTipus }] }.
  const { cimzettek, osLanc } = await ertesitesiBeallitasService.cimzettekFeloldasa(
    entitasId,
    entitasTipus,
    ertesitesTipus
  );

  const cselekvoKulcs = cselekvoId ? cselekvoId.toString() : null;

  // Az értesítendő eEmberek adatait gyűjtjük össze
  const kuldendoErtesitesek = [];

  for (const cimzett of cimzettek) {
    // A cselekvőt nem értesítjük magát
    if (cselekvoKulcs && cimzett.eEmberId === cselekvoKulcs) continue;

    // tudatpontValtozas: a 4 küszöb kiértékelése (a többi típusnál nincs küszöb)
    if (ertesitesTipus === 'tudatpontValtozas' &&
        !tudatpontKuszobTeljesul(cimzett.tudatpontKuszobok, adatok)) {
      continue;
    }

    // Minden feltétel teljesül → ez az eEmber kap értesítést
    kuldendoErtesitesek.push({
      eEmberId: cimzett.eEmberId,
      tipus: ertesitesTipus,
      entitasId,
      entitasTipus,
      osLanc, // Az esemény entitásának ős-lánca — a részfa-szűréshez (kártya-badge, ág-postafiók)
      adatok,
      olvasva: false,
      olvasvaIdopont: null,
    });
  }

  // Ha nincs senki akinek küldeni kell, visszatérünk üres tömbbel
  if (kuldendoErtesitesek.length === 0) {
    console.log('ertesitesService.ertesitesKuldes - VEGE', {
      kuldottDarab: 0,
    });
    return [];
  }

  // Tömeges mentés – egy adatbázis kérés az összes értesítésnek
  const letrehozottErtesitesek = await ertesitesRepository.tomegesLetrehoz(kuldendoErtesitesek);

  console.log('ertesitesService.ertesitesKuldes - VEGE', {
    kuldottDarab: letrehozottErtesitesek.length,
  });
  return letrehozottErtesitesek;
};
// --- METÓDUS VEGE: ertesitesKuldes ---


// --- METÓDUS KEZDETE: postafiokLekereses ---
// Egy eEmber postafiókjának lekérése lapozással
// Paraméterek: eEmberId, lap, lapMeret,
//   agEntitasId – opcionális ág-szűrő: csak az adott entitás ága alatti értesítések
//                 (osLanc-alapú; a kártya-hamburgerből nyíló „Értesítések" használja)
// Visszatérés: { ertesitesek, osszes, olvasatlan, lapokSzama }
const postafiokLekereses = async (eEmberId, lap = 1, lapMeret = 20, agEntitasId = null) => {
  console.log('ertesitesService.postafiokLekereses - KEZDET', {
    eEmberId,
    lap,
    lapMeret,
    agEntitasId,
  });

  const { ertesitesek, osszes, olvasatlan } = await ertesitesRepository.keresByE_Ember(
    eEmberId,
    lap,
    lapMeret,
    agEntitasId
  );

  // Az entitás címének/nevének feltöltése a megjelenítéshez (típusonként 1 lekérdezés)
  const ertesitesekCimmel = await entitasCimekFeltoltese(ertesitesek);

  // Kiszámítjuk az összes lap számát a frontend lapozójához
  const lapokSzama = Math.ceil(osszes / lapMeret);

  const eredmeny = { ertesitesek: ertesitesekCimmel, osszes, olvasatlan, lapokSzama };

  console.log('ertesitesService.postafiokLekereses - VEGE', {
    visszaadottDarab: ertesitesek.length,
    osszes,
    olvasatlan,
    lapokSzama,
  });
  return eredmeny;
};
// --- METÓDUS VEGE: postafiokLekereses ---


// --- METÓDUS KEZDETE: ertesitesMegjelolOlvasottnak ---
// Egy értesítés olvasottnak jelölése – csak az eEmber saját értesítésén végezhető el
// Paraméterek: ertesitesId, eEmberId (jogosultság ellenőrzéshez)
// Visszatérés: a frissített értesítés
const ertesitesMegjelolOlvasottnak = async (ertesitesId, eEmberId) => {
  console.log('ertesitesService.ertesitesMegjelolOlvasottnak - KEZDET', {
    ertesitesId,
    eEmberId,
  });

  // Megkeressük az értesítést
  const ertesites = await ertesitesRepository.keresByid(ertesitesId);

  // Ha nem létezik, hibát dobunk
  if (!ertesites) {
    throw new Error('Az értesítés nem található');
  }

  // Jogosultság ellenőrzés: csak a saját értesítését jelölheti olvasottnak
  if (ertesites.eEmberId.toString() !== eEmberId.toString()) {
    throw new Error('Nincs jogosultságod ehhez az értesítéshez');
  }

  // Ha már olvasott, nem kell újra frissíteni
  if (ertesites.olvasva) {
    console.log('ertesitesService.ertesitesMegjelolOlvasottnak - VEGE', {
      megjegyzes: 'Már olvasott volt',
    });
    return ertesites;
  }

  const frissitett = await ertesitesRepository.megjelolOlvasottnak(ertesitesId);

  console.log('ertesitesService.ertesitesMegjelolOlvasottnak - VEGE', { frissitett });
  return frissitett;
};
// --- METÓDUS VEGE: ertesitesMegjelolOlvasottnak ---


// --- METÓDUS KEZDETE: mindetOlvasottnak ---
// Egy eEmber összes olvasatlan értesítését olvasottnak jelöli
// Paraméterek: eEmberId,
//   agEntitasId – opcionális ág-szűrő: csak az adott entitás ága alattiakat jelöli
const mindetOlvasottnak = async (eEmberId, agEntitasId = null) => {
  console.log('ertesitesService.mindetOlvasottnak - KEZDET', { eEmberId, agEntitasId });

  const eredmeny = await ertesitesRepository.megjelolMindetOlvasottnak(eEmberId, agEntitasId);

  console.log('ertesitesService.mindetOlvasottnak - VEGE', {
    modositottDarab: eredmeny.modifiedCount,
  });
  return eredmeny;
};
// --- METÓDUS VEGE: mindetOlvasottnak ---


// --- METÓDUS KEZDETE: olvasatlanokSzamaEntitasonkent ---
// RÉSZFA-SZÁMLÁLÓ a kártya-badge-ekhez: a megadott entitásokra visszaadja, hány olvasatlan
// értesítése van az eEmbernek az adott entitás ÁGA alatt (magán az entitáson VAGY bármely
// leszármazottján — az értesítések osLanc mezője alapján). Egyetlen aggregációs lekérdezés.
// Használja: pakliService (a pakli minden elemére ráteszi az olvasatlanErtesitesek számot).
// Paraméterek: eEmberId, entitasIdk (tömb)
// Visszatérés: { '<entitasId>': darab, ... } — ami nincs benne, ott 0 az érték
const olvasatlanokSzamaEntitasonkent = async (eEmberId, entitasIdk) => {
  console.log('ertesitesService.olvasatlanokSzamaEntitasonkent - KEZDET', {
    eEmberId,
    entitasDarab: entitasIdk?.length ?? 0,
  });

  const terkep = await ertesitesRepository.olvasatlanokSzamaEntitasonkent(eEmberId, entitasIdk);

  console.log('ertesitesService.olvasatlanokSzamaEntitasonkent - VEGE', {
    talalatDarab: Object.keys(terkep).length,
  });
  return terkep;
};
// --- METÓDUS VEGE: olvasatlanokSzamaEntitasonkent ---


// --- METÓDUS KEZDETE: olvasatlanokSzamaLekereses ---
// Gyors lekérdezés: csak az olvasatlan értesítések száma
// Paraméter: eEmberId
// Visszatérés: { olvasatlan: Number }
const olvasatlanokSzamaLekereses = async (eEmberId) => {
  console.log('ertesitesService.olvasatlanokSzamaLekereses - KEZDET', { eEmberId });

  const szam = await ertesitesRepository.olvasatlanokSzama(eEmberId);

  console.log('ertesitesService.olvasatlanokSzamaLekereses - VEGE', { szam });
  return { olvasatlan: szam };
};
// --- METÓDUS VEGE: olvasatlanokSzamaLekereses ---


// Az összes publikus metódus exportálása
module.exports = {
  ertesitesKuldes,
  postafiokLekereses,
  ertesitesMegjelolOlvasottnak,
  mindetOlvasottnak,
  olvasatlanokSzamaLekereses,
  olvasatlanokSzamaEntitasonkent,
};
