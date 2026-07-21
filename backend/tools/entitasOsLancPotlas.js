// backend/tools/entitasOsLancPotlas.js

// MIGRÁCIÓ: az osLanc mező feltöltése a tudatpont-allokációkban
// (skálázható részfa-szűréshez — 15. terv-pont, 3a + 3c lépés, 2026-07-21).
// KÉT kollekciót kezel:
//   1. hierarchikusTudatpontAllokacio — itt van a szülő-infó (szuloId), innen ÉPÜL a lánc:
//      minden allokációhoz az entitás ős-lánca ÖNMAGÁVAL kezdve, a gyökérig.
//   2. tudatpontAllokacio — nincs szülő-infója, ezért ide a hierarchikusból TÜKRÖZZÜK
//      ugyanazt az osLanc-ot (entitasId+entitasTipus párosítással), hogy a saját-pont
//      rendezés is skálázhatóan szűrhessen ágra.
// Így egy ág ÖSSZES eleme egyetlen indexelt lekérdezéssel megkapható:
// { 'osLanc.entitasId': agazatId } — mindkét kollekcióban.
//
// Futtatás (Docker dev): docker exec koino-backend node tools/entitasOsLancPotlas.js
// Többször is futtatható — a hierarchikus oldalon alapból CSAK a hiányos (üres osLanc-ú)
// rekordokhoz nyúl (a --mind kapcsolóval MINDET újraépíti); a tudatpont-tükrözés mindig
// a hierarchikus AKTUÁLIS láncát írja át (idempotens).
//
// MEGJEGYZÉS (skálázás): a bejárás allokációnként felfelé lépeget (naiv), ami a
// jelenlegi méretnél bőven elég. Több millió entitásnál érdemes bottom-up, szintenkénti
// (a szülő osLanc-jából származtatott) feltöltésre cserélni — de a lekérdezési oldal
// (az indexelt osLanc-szűrés) már skálázható, csak ez az egyszeri feltöltés naiv.

require('dotenv').config();
const mongoose = require('mongoose');
const HierarchikusTudatpontAllokacio = require('../models/hierarchikusTudatpontAllokacio');
const TudatpontAllokacio = require('../models/tudatpontAllokacio');
// A lánc-felépítés KANONIKUS logikája a karbantartó service-ben él (DRY) — a migráció
// ugyanazt használja, mint az éles létrehozás/áthelyezés karbantartás.
const osLancKarbantartoService = require('../services/osLancKarbantartoService');

// ===== FŐ FUTÁS =====
async function futtatas() {
  const mind = process.argv.includes('--mind');
  console.log('entitasOsLancPotlas - KEZDÉS', { mind });

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('entitasOsLancPotlas - MongoDB kapcsolat él');

  // Alapból csak a hiányos (nincs osLanc vagy üres) rekordok; --mind esetén az összes
  const szuro = mind
    ? {}
    : { $or: [{ osLanc: { $exists: false } }, { osLanc: { $size: 0 } }] };

  const sorok = await HierarchikusTudatpontAllokacio.find(szuro)
    .select('entitasId entitasTipus')
    .lean();

  console.log('entitasOsLancPotlas - feldolgozandó allokációk:', sorok.length);

  let frissitett = 0;
  for (const sor of sorok) {
    const lanc = await osLancKarbantartoService.osLancFelepitese(sor.entitasId, sor.entitasTipus);
    await HierarchikusTudatpontAllokacio.updateOne(
      { _id: sor._id },
      { $set: { osLanc: lanc } }
    );
    frissitett++;
  }

  console.log('entitasOsLancPotlas - hierarchikus VÉGE', { frissitett });

  // ===== TÜKRÖZÉS A TUDATPONT-ALLOKÁCIÓRA (3c) =====
  // A saját-pont rendezés ágazat-szűréséhez a tudatpontAllokacio-nak IS kell az osLanc.
  // A szülő-infó csak a hierarchikusban van, ezért onnan tükrözzük (entitasId+tipus match).
  // Mindig a hierarchikus AKTUÁLIS láncát írjuk át — idempotens.
  const hierMind = await HierarchikusTudatpontAllokacio.find({})
    .select('entitasId entitasTipus osLanc')
    .lean();

  let tudatpontFrissitett = 0;
  for (const h of hierMind) {
    const eredmeny = await TudatpontAllokacio.updateOne(
      { entitasId: h.entitasId, entitasTipus: h.entitasTipus },
      { $set: { osLanc: h.osLanc ?? [] } }
    );
    if (eredmeny.matchedCount > 0) tudatpontFrissitett++;
  }

  console.log('entitasOsLancPotlas - tudatpont tükrözés VÉGE', {
    tudatpontFrissitett,
    hierarchikusOsszes: hierMind.length
  });

  console.log('entitasOsLancPotlas - VÉGE', { frissitett, tudatpontFrissitett });

  await mongoose.disconnect();
  process.exit(0);
}

// Hibakezelés: a hiba kiírása után nem-nulla kilépési kód
futtatas().catch((hiba) => {
  console.error('entitasOsLancPotlas - HIBA', hiba);
  process.exit(1);
});
