// backend/services/ertesitesService.js

// Repository-k importálása – a service csak ezeken keresztül kommunikál az adatbázissal
const ertesitesRepository = require('../repositories/ertesitesRepository');
const ertesitesiBeallitasRepository = require('../repositories/ertesitesiBeallitasRepository');

// A Tartalom modell importálása – a szülő lekéréséhez kell (cascade felfelé lépéshez)
// Ha más entitástípusokon is van szülő, azokat is ide kell importálni
const Tartalom = require('../models/tartalom');
const Kategoria = require('../models/kategoria');
const TartalomTipus = require('../models/tartalomTipus');
const Javaslat = require('../models/javaslat');
const Egyezmeny = require('../models/egyezmeny');

// --- SEGÉDFÜGGVÉNY: szuloKereses ---
// Egy entitás szülőjét adja vissza (szuloId + szuloTipus formában)
// Ha nincs szülő, null-t ad vissza – ez jelzi a cascade végét
// Paraméterek: entitasId (ObjectId), entitasTipus (String)
// Visszatérés: { szuloId, szuloTipus } vagy null
const szuloKereses = async (entitasId, entitasTipus) => {
  console.log('ertesitesService.szuloKereses - KEZDET', { entitasId, entitasTipus });

  // A megfelelő modellből olvassuk ki a szülő adatokat
  // Minden entitástípusnak lehet más mező neve a szülőre
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

  // Ha nem találja az entitást, vagy nincs szülője, a cascade megáll
  if (!entitas || !entitas.szuloId) {
    console.log('ertesitesService.szuloKereses - VEGE', { szulo: null });
    return null;
  }

  const szulo = { szuloId: entitas.szuloId, szuloTipus: entitas.szuloTipus };
  console.log('ertesitesService.szuloKereses - VEGE', { szulo });
  return szulo;
};


// --- SEGÉDFÜGGVÉNY: beallitasKeresesCascade ---
// Megkeresi egy eEmber értesítési beállítását egy entitásra – cascade módon
// Ha az adott entitáson nincs beállítás, felfelé lép a szülőre, és így tovább
// A ciklus addig fut, amíg el nem ér egy szülő nélküli entitáshoz (fa gyökere)
// Paraméterek: eEmberId, entitasId, entitasTipus
// Visszatérés: a megtalált beállítás dokumentum, vagy null ha sehol sincs
const beallitasKeresesCascade = async (eEmberId, entitasId, entitasTipus) => {
  console.log('ertesitesService.beallitasKeresesCascade - KEZDET', {
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
      // Találtunk beállítást – ezt adjuk vissza
      console.log('ertesitesService.beallitasKeresesCascade - VEGE', {
        talalt: true,
        beallitas,
      });
      return beallitas;
    }

    // Nincs beállítás ezen a szinten → lépünk a szülőre
    const szulo = await szuloKereses(aktualisEntitasId, aktualisEntitasTipus);

    if (!szulo) {
      // Elértük a fa gyökerét, nincs több szülő → nincs beállítás sehol
      console.log('ertesitesService.beallitasKeresesCascade - VEGE', { talalt: false });
      return null;
    }

    // Felfelé lépünk
    aktualisEntitasId = szulo.szuloId;
    aktualisEntitasTipus = szulo.szuloTipus;
  }
};


// --- METÓDUS KEZDETE: ertesitesKuldes ---
// Ez a rendszer szíve: egy esemény alapján meghatározza ki kap értesítést és elküldi
// Paraméterek:
//   entitasId    – melyik entitáson történt az esemény
//   entitasTipus – az entitás típusa
//   ertesitesTipus – milyen esemény történt (pl. 'ujJavaslat')
//   adatok       – esemény-specifikus részletek (pl. javaslatId)
//   erintettE_EmberIdkTombje – azok az eEmberek akiknek potenciálisan értesítés kell
//                              (pl. a tudatpont tulajdonosok listája)
// Visszatérés: a létrehozott értesítések tömbje
const ertesitesKuldes = async (
  entitasId,
  entitasTipus,
  ertesitesTipus,
  adatok = {},
  erintettE_EmberIdkTombje = []
) => {
  console.log('ertesitesService.ertesitesKuldes - KEZDET', {
    entitasId,
    entitasTipus,
    ertesitesTipus,
    adatok,
    erintettDarab: erintettE_EmberIdkTombje.length,
  });

  // Az értesítendő eEmberek adatait gyűjtjük össze
  const kuldendoErtesitesek = [];

  // Minden érintett eEmberre megvizsgáljuk, hogy kap-e értesítést
  for (const eEmberId of erintettE_EmberIdkTombje) {

    // Cascade keresés: van-e beállítás ezen az eEmberen erre az entitásra?
    const beallitas = await beallitasKeresesCascade(eEmberId, entitasId, entitasTipus);

    // Ha nincs beállítás sehol a fában → nem kap értesítést (opt-in rendszer)
    if (!beallitas) continue;

    // Ha ki van kapcsolva az értesítés ezen az ágon → nem kap értesítést
    if (beallitas.kikapcsolva) continue;

    // Ha ez a típusú értesítés nincs bekapcsolva → nem kap értesítést
    if (!beallitas.ertesitesTipusok.includes(ertesitesTipus)) continue;

    // Tudatpont változásnál ellenőrizzük a küszöbértéket
    if (ertesitesTipus === 'tudatpontValtozas' && beallitas.tudatpontKuszob) {
      const valtozasMerteke = Math.abs(adatok.valtozas || 0);
      // Ha a változás kisebb a küszöbnél → nem kap értesítést
      if (valtozasMerteke < beallitas.tudatpontKuszob) continue;
    }

    // Minden feltétel teljesül → ez az eEmber kap értesítést
    kuldendoErtesitesek.push({
      eEmberId,
      tipus: ertesitesTipus,
      entitasId,
      entitasTipus,
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
// Paraméterek: eEmberId, lap, lapMeret
// Visszatérés: { ertesitesek, osszes, olvasatlan, lapokSzama }
const postafiokLekereses = async (eEmberId, lap = 1, lapMeret = 20) => {
  console.log('ertesitesService.postafiokLekereses - KEZDET', {
    eEmberId,
    lap,
    lapMeret,
  });

  const { ertesitesek, osszes, olvasatlan } = await ertesitesRepository.keresByE_Ember(
    eEmberId,
    lap,
    lapMeret
  );

  // Kiszámítjuk az összes lap számát a frontend lapozójához
  const lapokSzama = Math.ceil(osszes / lapMeret);

  const eredmeny = { ertesitesek, osszes, olvasatlan, lapokSzama };

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
// Paraméter: eEmberId
const mindetOlvasottnak = async (eEmberId) => {
  console.log('ertesitesService.mindetOlvasottnak - KEZDET', { eEmberId });

  const eredmeny = await ertesitesRepository.megjelolMindetOlvasottnak(eEmberId);

  console.log('ertesitesService.mindetOlvasottnak - VEGE', {
    modositottDarab: eredmeny.modifiedCount,
  });
  return eredmeny;
};
// --- METÓDUS VEGE: mindetOlvasottnak ---


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
};