// backend/tools/szerkesztokPotlas.js

// EGYSZERI MIGRÁCIÓ: a `szerkesztok` tömb pótlása a régi (átnevezés ELŐTT létrejött)
// gondolatoknál / kategóriáknál / gondolattípusoknál.
//
// Háttér: 2026-08-18-án az egyszeres `letrehozo` mező `szerkesztok` tömbbé alakult.
// Az AZ ELŐTT keletkezett dokumentumokban csak a régi `letrehozo` van, `szerkesztok`
// nincs — ezért a Részletes adatokban a „Szerkesztő" sor üres.
//
// Mit csinál? Minden `szerkesztok` nélküli dokumentumhoz felépíti a listát a régi
// `letrehozo`-ból: az eredeti létrehozó lesz az EGYETLEN, EREDETI szerkesztő (zölden).
// A régi `letrehozo` mezőt SZÁNDÉKOSAN nem törli — biztonsági tartaléknak megmarad.
//
// Futtatás (Docker dev):  docker exec koino-backend      node tools/szerkesztokPotlas.js
// Futtatás (Docker prod): docker exec koino-backend-prod node tools/szerkesztokPotlas.js
//
// Idempotens: többször is futtatható, mert CSAK a hiányos (szerkesztok nélküli vagy
// üres) rekordokhoz nyúl — a már felépült listákat nem bántja.

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
  console.log(`szerkesztokPotlas - ${nev} - KEZDÉS`);

  // A hiányos dokumentumok: nincs szerkesztok mező, VAGY üres a tömb.
  // .lean() → a nyers dokumentumot kapjuk, benne a régi (nem-séma) `letrehozo` mezővel.
  const hianyosak = await Model.find({
    $or: [{ szerkesztok: { $exists: false } }, { szerkesztok: { $size: 0 } }]
  }).lean();

  console.log(`szerkesztokPotlas - ${nev}: hiányos dokumentumok:`, hianyosak.length);

  let frissitett = 0;
  for (const doc of hianyosak) {
    // Az eredeti létrehozóból építjük fel az egyetlen (eredeti) szerkesztőt.
    // A letrehozo hiánya / null = törölt e-ember → eemberId: null (a felület „—"-t mutat).
    const eemberId = doc.letrehozo ?? null;
    const szerkesztok = [{ eemberId, allapot: 'Tamogatja', eredeti: true }];

    await Model.updateOne({ _id: doc._id }, { $set: { szerkesztok } });
    frissitett++;
  }

  console.log(`szerkesztokPotlas - ${nev} - VÉGE`, { frissitett });
  return frissitett;
}

// ===== FŐ FUTÁS =====
async function futtatas() {
  console.log('szerkesztokPotlas - KEZDÉS');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('szerkesztokPotlas - MongoDB kapcsolat él');

  const gondolat      = await egyKollekcio(Gondolat, 'Gondolat');
  const kategoria     = await egyKollekcio(Kategoria, 'Kategoria');
  const gondolatTipus = await egyKollekcio(GondolatTipus, 'GondolatTipus');

  console.log('szerkesztokPotlas - VÉGE', {
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
  console.error('szerkesztokPotlas - HIBA', hiba);
  process.exit(1);
});
