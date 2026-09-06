// backend/tools/sikidomMelysegTesztAdat.js

// ===== SÍKIDOM TESZT-ADAT: TÖBB SZINTŰ FA =====
//
// Felelősség: MÉLYSÉGET adni a fejlesztői adatbázisnak, hogy a Síkidom nézet
// drill-down (befelé nagyítás) esete egyáltalán próbálható legyen.
//
// MIÉRT KELL EZ (2026-08-06):
// A `sikidomTesztAdat.js` 105 GYÖKERET hoz létre, de alattuk semmit. Emiatt a
// nézet horgonya sosem lép be egy entitásba — mérve: a horgony szintje végig −1
// (a virtuális VILÁG) maradt. Vagyis hetekig CSAK a gyökér-szintet teszteltük,
// és a mélységben jelentkező hibák (pl. a mag kilökte a gyerekeket a szülőből)
// böngészőben ki sem derülhettek, csak konzol-naplóból.
//
// A FA ALAKJA. Minden szinten kevesebb, de arányosan kisebb pontú gyerek:
// a hierarchikus tudatpont-törvény szerint a gyerekek együttes pontja nem
// haladhatja meg a szülőét, a síkidom-modell pedig szintenként /20-as
// terület-csökkenéssel számol. Itt a szülő pontjának ~70%-át osztjuk szét a
// gyerekek között, Zipf-szerű eloszlásban — így lesz egy-két nagy és sok kicsi,
// pont mint az éles adatban.
//
// FONTOS: a gondolatokat a rendes service-en át hozzuk létre
// (`gondolatService.gondolatLetrehozasa`), NEM közvetlen adatbázis-írással —
// így minden származtatott rekord (tudatpont-hozzárendelés, allokáció,
// hierarchikus allokáció, ős-lánc) konzisztensen létrejön.
//
// CSAK FEJLESZTŐI KÖRNYEZETBEN futtatandó!
//
// Futtatás (a dev konténerben):
//   docker exec koino-backend node tools/sikidomMelysegTesztAdat.js
//   docker exec koino-backend node tools/sikidomMelysegTesztAdat.js 3 6
//   (mélység, gyerek/csomópont)
//
// A szkript ÚJRAFUTTATHATÓ: a már létező című gyerekeket kihagyja.

const mongoose = require('mongoose');
require('dotenv').config();

const gondolatService = require('../services/gondolatService');
const Eember = require('../models/eember');
const Gondolat = require('../models/gondolat');

// ===== PARAMÉTEREK =====
const MELYSEG = Number(process.argv[2]) || 3;      // hány szint a gyökér ALATT
const AGSZAM  = Number(process.argv[3]) || 5;      // hány gyerek csomópontonként

// A szülő pontjának ekkora hányadát osztjuk szét a gyerekek között
const PONT_HANYAD = 0.7;

// Melyik gyökér alá építkezünk (cím szerint)
const GYOKER_CIM = 'Közösségi döntéshozatal';

// ===== NÉV-TÖREDÉKEK =====
// Beszédes, egymástól jól megkülönböztethető címek — a böngészős próbán a
// feliratból lehet tudni, melyik szinten járunk.
const SZINT_NEVEK = [
  ['Alapelvek', 'Eljárásrend', 'Részvétel', 'Átláthatóság', 'Felelősség', 'Visszahívás', 'Fórumok', 'Kisebbségvédelem'],
  ['Kezdeményezés', 'Vita', 'Szavazás', 'Végrehajtás', 'Ellenőrzés', 'Módosítás', 'Fellebbezés', 'Archiválás'],
  ['Határidők', 'Küszöbök', 'Jegyzőkönyv', 'Nyilvántartás', 'Értesítés', 'Naptár', 'Sablonok', 'Statisztika'],
  ['Minta A', 'Minta B', 'Minta C', 'Minta D', 'Minta E', 'Minta F', 'Minta G', 'Minta H']
];

function gyerekNev(szint, index, szuloNev) {
  const keszlet = SZINT_NEVEK[Math.min(szint, SZINT_NEVEK.length - 1)];
  return `${keszlet[index % keszlet.length]} — ${szuloNev}`;
}

// A gyerekek pont-eloszlása: Zipf-szerű, csökkenő
function gyerekPontok(szuloPont, darab) {
  const sulyok = [];
  let ossz = 0;
  for (let i = 1; i <= darab; i++) { const s = 1 / Math.pow(i, 1.2); sulyok.push(s); ossz += s; }

  const oszthato = Math.floor(szuloPont * PONT_HANYAD);
  return sulyok.map(s => Math.max(1, Math.floor((s / ossz) * oszthato)));
}

// ===== EGY ÁG FELÉPÍTÉSE (rekurzívan) =====
async function agEpites(szulo, szint, eemberId, allapot) {
  if (szint >= MELYSEG) return;

  const pontok = gyerekPontok(szulo.pont, AGSZAM);

  for (let i = 0; i < AGSZAM; i++) {
    const cim = gyerekNev(szint, i, szulo.cim);
    const pont = pontok[i];

    if (allapot.maradekPont < pont) {
      allapot.kifogyott = true;
      return;
    }

    // Már létezik? (újrafuttathatóság)
    const mar = await Gondolat.findOne({ cim, szuloId: szulo.id }).select('_id').lean();
    let gyerekId;

    if (mar) {
      gyerekId = mar._id.toString();
      allapot.kihagyott++;
    } else {
      try {
        const t = await gondolatService.gondolatLetrehozasa(
          {
            cim,
            szoveg: `${cim} — a Síkidom nézet MÉLYSÉGI próbájához létrehozott gondolat (${szint + 1}. szint).`,
            szuloId: szulo.id,
            szuloTipus: 'Gondolat'
          },
          eemberId,
          pont
        );
        gyerekId = t?._id?.toString();
        allapot.letrejott++;
        allapot.maradekPont -= pont;
        allapot.szintenkent[szint] = (allapot.szintenkent[szint] || 0) + 1;
      } catch (hiba) {
        allapot.hibak.push({ cim, pont, uzenet: hiba.message });
        continue;
      }
    }

    if (gyerekId) {
      await agEpites({ id: gyerekId, cim, pont }, szint + 1, eemberId, allapot);
      if (allapot.kifogyott) return;
    }
  }
}

// ===== FŐ FOLYAMAT =====
async function futtat() {
  console.log('');
  console.log('===== SÍKIDOM MÉLYSÉGI TESZT-ADAT =====');
  console.log({ MELYSEG, AGSZAM, GYOKER_CIM });

  await mongoose.connect(process.env.MONGODB_URI);

  // ----- A GYÖKÉR -----
  const gyoker = await Gondolat.findOne({ cim: GYOKER_CIM, szuloId: null })
    .select('_id cim').lean();

  if (!gyoker) {
    console.error(`HIBA: nincs ilyen gyökér gondolat: "${GYOKER_CIM}".`);
    console.error('Előbb futtasd: docker exec koino-backend node tools/sikidomTesztAdat.js');
    await mongoose.disconnect();
    process.exit(1);
  }

  // A gyökér hierarchikus pontja adja a kiinduló keretet
  const HierarchikusAllokacio = require('../models/hierarchikusTudatpontAllokacio');
  const allokacio = await HierarchikusAllokacio
    .findOne({ entitasId: gyoker._id }).select('hierarchikusOsszesPont').lean();
  const gyokerPont = allokacio?.hierarchikusOsszesPont ?? 900;

  // ----- A LÉTREHOZÓ E-EMBER: a legtöbb szabad tudatponttal -----
  const eemberek = await Eember.find({}).select('eemberNev tudatpontok').lean();
  const eember = eemberek.sort((a, b) => (b.tudatpontok ?? 0) - (a.tudatpontok ?? 0))[0];

  if (!eember) {
    console.error('HIBA: nincs egyetlen e-ember sem az adatbázisban');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('Kiindulás:', {
    gyoker: gyoker.cim,
    gyokerPont,
    eember: eember.eemberNev,
    szabadTudatpont: eember.tudatpontok
  });

  const allapot = {
    letrejott: 0, kihagyott: 0, hibak: [], szintenkent: {},
    maradekPont: eember.tudatpontok ?? 0, kifogyott: false
  };

  await agEpites(
    { id: gyoker._id.toString(), cim: gyoker.cim, pont: gyokerPont },
    0, eember._id.toString(), allapot
  );

  // ----- ÖSSZEGZÉS -----
  console.log('');
  console.log('=================== EREDMÉNY ===================');
  console.log(`Létrejött: ${allapot.letrejott}` +
    (allapot.kihagyott ? `  (${allapot.kihagyott} már létezett, kihagyva)` : ''));
  for (const szint of Object.keys(allapot.szintenkent).sort()) {
    console.log(`  ${Number(szint) + 1}. szint: ${allapot.szintenkent[szint]} db`);
  }
  if (allapot.kifogyott) {
    console.log('FIGYELEM: elfogyott a tudatpont-keret, a fa csonka maradt.');
  }
  if (allapot.hibak.length) {
    console.log('');
    console.log(`HIBÁK (${allapot.hibak.length}):`);
    for (const h of allapot.hibak.slice(0, 10)) console.log(`  ${h.cim}: ${h.uzenet}`);
  }

  const friss = await Eember.findById(eember._id).select('tudatpontok').lean();
  console.log('');
  console.log(`${eember.eemberNev} maradék szabad tudatpontja: ${friss?.tudatpontok}`);
  console.log('');

  await mongoose.disconnect();
}

futtat().catch(async (hiba) => {
  console.error('VÉGZETES HIBA:', hiba);
  try { await mongoose.disconnect(); } catch { /* nem baj */ }
  process.exit(1);
});
