// backend/tools/modositvaPotlas.js

// EGYSZERI MIGRÁCIÓ: a `modositva` (utolsó tartalmi módosítás dátuma) pótlása a régi
// (a mező bevezetése ELŐTT létrejött) gondolatoknál / kategóriáknál / gondolattípusoknál.
//
// Háttér: 2026-08-19-én bekerült a `modositva` mező (a kártya-fejléc dátumához és a
// gyerek↔szülő „elavulhat-e" szín-jelzéshez). A korábban keletkezett dokumentumokban
// ez a mező nincs a DB-ben. Fontos: mivel a séma `default: Date.now`-ot ad rá, egy
// hiányzó mezőt a Mongoose beolvasáskor a MOSTANI időre töltene — ami hibásan „épp most
// módosítva"-nak mutatná a régi gondolatokat. Ezért kell a mezőt a helyes értékre írni.
//
// Mit csinál? Minden `modositva` nélküli dokumentumnál beállítja: modositva = letrehozva
// (ha valamiért nincs letrehozva, akkor a mostani idő). Így a régi gondolat dátuma a
// létrehozása marad, amíg egy valódi módosítás nem frissíti.
//
// Futtatás (Docker dev):  docker exec koino-backend      node tools/modositvaPotlas.js
// Futtatás (Docker prod): docker exec koino-backend-prod node tools/modositvaPotlas.js
//
// Idempotens: többször is futtatható, mert CSAK a `modositva` nélküli rekordokhoz nyúl.

// ===== IMPORTOK =====
// A dotenv-et védetten hívjuk: a prod a .env.prod-ot env_file-ként injektálja
// (nincs .env fájl a konténerben), ezért ott a dotenv hiánya/üres futása nem baj.
try { require('dotenv').config(); } catch (_) { /* prod: env_file adja a változókat */ }

const mongoose = require('mongoose');
const Gondolat = require('../models/gondolat');
const Kategoria = require('../models/kategoria');
const GondolatTipus = require('../models/gondolatTipus');

// ===== EGY KOLLEKCIÓ FELDOLGOZÁSA =====
// @param {mongoose.Model} Model - a feldolgozandó modell (Gondolat/Kategoria/GondolatTipus)
// @param {string} nev - emberi név a naplóhoz
// @returns {Promise<number>} a frissített dokumentumok száma
async function egyKollekcio(Model, nev) {
  console.log(`modositvaPotlas - ${nev} - KEZDÉS`);

  // A hiányos dokumentumok: nincs `modositva` mező, VAGY null.
  // .lean() → a nyers DB-dokumentumot kapjuk (a séma default NEM íródik rá olvasáskor),
  // így pontosan látjuk, kinél hiányzik valójában.
  const hianyosak = await Model.find({
    $or: [{ modositva: { $exists: false } }, { modositva: null }]
  }).lean();

  console.log(`modositvaPotlas - ${nev}: hiányos dokumentumok:`, hianyosak.length);

  let frissitett = 0;
  for (const doc of hianyosak) {
    // A módosítás dátuma induláskor = a létrehozás dátuma. Ha valamiért nincs
    // letrehozva, a mostani időt használjuk (nem hagyjuk üresen).
    const modositva = doc.letrehozva ?? new Date();

    await Model.updateOne({ _id: doc._id }, { $set: { modositva } });
    frissitett++;
  }

  console.log(`modositvaPotlas - ${nev} - VÉGE`, { frissitett });
  return frissitett;
}

// ===== FŐ FUTÁS =====
async function futtatas() {
  console.log('modositvaPotlas - KEZDÉS');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('modositvaPotlas - MongoDB kapcsolat él');

  const gondolat      = await egyKollekcio(Gondolat, 'Gondolat');
  const kategoria     = await egyKollekcio(Kategoria, 'Kategoria');
  const gondolatTipus = await egyKollekcio(GondolatTipus, 'GondolatTipus');

  console.log('modositvaPotlas - VÉGE', {
    gondolat,
    kategoria,
    gondolatTipus,
    osszes: gondolat + kategoria + gondolatTipus
  });

  await mongoose.disconnect();
  process.exit(0);
}

// Hibakezelés: a hiba kiírása után nem-nulla kilépési kód
futtatas().catch((hiba) => {
  console.error('modositvaPotlas - HIBA', hiba);
  process.exit(1);
});
