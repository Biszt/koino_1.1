// backend/tools/sikidomTesztAdat.js

// ===== SÍKIDOM TESZT-ADAT: GYÖKÉR TARTALMAK LÉTREHOZÁSA =====
//
// Felelősség: a Síkidom nézet böngészős próbájához elegendő gyökér-tartalmat
// létrehozni, ELTÉRŐ tudatpontokkal — hogy látszódjon a méret-arány (a síkidom
// TERÜLETE arányos a tudatponttal) és a spirális elrendezés.
//
// FONTOS: a tartalmakat a rendes service-en át hozzuk létre
// (`tartalomService.tartalomLetrehozasa`), NEM közvetlen adatbázis-írással.
// Így minden származtatott rekord (tudatpont-hozzárendelés, allokáció,
// hierarchikus allokáció, ős-lánc) is konzisztensen létrejön.
//
// CSAK FEJLESZTŐI KÖRNYEZETBEN futtatandó!
//
// Futtatás (a dev konténerben):
//   docker exec koino-backend node tools/sikidomTesztAdat.js
//   docker exec koino-backend node tools/sikidomTesztAdat.js 5      → csak 5 db
//   docker exec koino-backend node tools/sikidomTesztAdat.js 30 tesztEmber4
//
// A létrehozott tartalmak azonosítása (ha törölni kell): a szkript a végén
// kiírja az ID-ket, és mindegyik címe szerepel a lenti CIMEK listában.

const mongoose = require('mongoose');
require('dotenv').config();

const tartalomService = require('../services/tartalomService');
const Eember = require('../models/eember');
const Tartalom = require('../models/tartalom');

// ===== A LÉTREHOZANDÓ TARTALMAK =====
// Cím + kezdő tudatpont, CSÖKKENŐ sorrendben, 900-tól 1-ig.
//
// Miért ez az eloszlás: mivel a síkidom TERÜLETE arányos a ponttal, az átmérő a
// pont NÉGYZETGYÖKÉVEL nő — a 900-as és az 1-es átmérőjének aránya 30-szoros.
// A sűrű, fokozatos létra (a szomszédos értékek csak pár százalékkal térnek el)
// azért fontos, mert így a nagyításkor SORRA bukkannak elő az újabb síkidomok,
// és a középső üres kör mérete nagyjából állandó marad a képernyőn — ugyanaz a
// hatás, mint a sikidomTeszt.html-ben.
//
// A 100 elem TÖBB, mint a lapméret (60) → a nézetnek LAPOZNIA kell, tehát a
// fenntartott mag mechanizmusa is éles adaton próbálódik ki.
//
// Összesen ~13 460 pont, de a szkript csak a hiányzókat hozza létre, és a
// tudatpont-keretet előre ellenőrzi.
const TARTALMAK = [
  ['Közösségi döntéshozatal',            900],
  ['Alkotmány',                          810],
  ['Oktatás és tudásmegosztás',          720],
  ['Választási rendszer',                660],
  ['Egészségügy',                        600],
  ['Szociális ellátás',                  560],
  ['Lakhatás',                           520],
  ['Vízbiztonság',                       485],
  ['Közlekedés',                         450],
  ['Városfejlesztés',                    425],
  ['Környezetvédelem',                   400],
  ['Vidékfejlesztés',                    380],
  ['Élelmiszer-ellátás',                 360],
  ['Megújuló energia',                   340],
  ['Energia',                            320],
  ['Közösségi közlekedés',               305],
  ['Munka és megélhetés',                290],
  ['Szakképzés',                         275],
  ['Igazságszolgáltatás',                260],
  ['Felsőoktatás',                       247],
  ['Digitális szuverenitás',             235],
  ['Alapellátás',                        222],
  ['Gyermekvállalás és család',          210],
  ['Mentőszolgálat',                     200],
  ['Idősgondozás',                       190],
  ['Bérlakás-program',                   180],
  ['Kultúra és művészet',                170],
  ['Építésügy',                          162],
  ['Tudomány és kutatás',                155],
  ['Föld és termőterület',               147],
  ['Vízgazdálkodás',                     140],
  ['Vetőmag és biodiverzitás',           132],
  ['Hulladékkezelés',                    125],
  ['Halgazdálkodás',                     120],
  ['Közbiztonság',                       115],
  ['Méhészet',                           110],
  ['Sport és mozgás',                    105],
  ['Levegőminőség',                      100],
  ['Mentálhigiéné',                       95],
  ['Zajvédelem',                          90],
  ['Nyilvánosság és sajtó',               85],
  ['Közterek',                            80],
  ['Helyi közösségek',                    75],
  ['Játszóterek',                         71],
  ['Adórendszer',                         68],
  ['Könyvtárak',                          64],
  ['Nyugdíj',                             60],
  ['Múzeumok',                            56],
  ['Állatvédelem',                        52],
  ['Színház',                             48],
  ['Erdőgazdálkodás',                     45],
  ['Filmművészet',                        41],
  ['Épített örökség',                     38],
  ['Kortárs zene',                        34],
  ['Csillagászat',                        30],
  ['Néptánc',                             26],
  ['Népzene',                             22],
  ['Kézművesség',                         18],
  ['Gombászat',                           15],
  ['Térképészet',                         14],
  ['Meteorológia',                        14],
  ['Geológia',                            13],
  ['Régészet',                            13],
  ['Nyelvjárások',                        12],
  ['Helytörténet',                        12],
  ['Csillagos ég védelme',                11],
  ['Barlangkutatás',                      11],
  ['Madárvédelem',                        10],
  ['Vadgazdálkodás',                      10],
  ['Gyógynövények',                        9],
  ['Konyhakert',                           9],
  ['Komposztálás',                         8],
  ['Esővízgyűjtés',                        8],
  ['Kerékpárutak',                         7],
  ['Gyalogos zónák',                       7],
  ['Közösségi kertek',                     6],
  ['Cserebere-körök',                      6],
  ['Javító műhelyek',                      5],
  ['Eszközkölcsönző',                      5],
  ['Idősklubok',                           4],
  ['Ifjúsági klubok',                      4],
  ['Önkéntesség',                          3],
  ['Adománygyűjtés',                       3],
  ['Katasztrófavédelem',                   2],
  ['Elsősegély-oktatás',                   2],
  ['Sakk',                                 1],
  ['Asztalitenisz',                        1],
  ['Futókörök',                            1],
  ['Úszásoktatás',                         1],
  ['Természetjárás',                       1],
  ['Horgászat',                            1],
  ['Csillagászati megfigyelés',            1],
  ['Amatőr rádiózás',                      1],
  ['Modellezés',                           1],
  ['Origami',                              1],
  ['Fotózás',                              1],
  ['Kalligráfia',                          1],
  ['Bélyeggyűjtés',                        1],
  ['Ásványgyűjtés',                        1],
  ['Gombahatározás',                       1]
];

// ===== FŐ FOLYAMAT =====
async function futtatas() {
  const darab = parseInt(process.argv[2], 10) || TARTALMAK.length;
  const kertEemberNev = process.argv[3] || null;

  console.log('sikidomTesztAdat - KEZDÉS', { darab, kertEemberNev });

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB kapcsolat sikeres');

  // ----- 1. LÉPÉS: A LÉTREHOZÓ E-EMBER -----
  // Ha nincs megadva név, a legtöbb SZABAD tudatponttal rendelkezőt választjuk
  const eemberek = await Eember.find({}).select('eemberNev tudatpontok').lean();
  if (eemberek.length === 0) {
    console.error('HIBA: nincs egyetlen e-ember sem az adatbázisban');
    await mongoose.disconnect();
    process.exit(1);
  }

  const eember = kertEemberNev
    ? eemberek.find(e => e.eemberNev === kertEemberNev)
    : eemberek.sort((a, b) => (b.tudatpontok ?? 0) - (a.tudatpontok ?? 0))[0];

  if (!eember) {
    console.error('HIBA: nincs ilyen e-ember', { kertEemberNev });
    await mongoose.disconnect();
    process.exit(1);
  }

  // ----- 2. LÉPÉS: MI HIÁNYZIK MÉG, ÉS BELEFÉR-E A TUDATPONT-KERETBE? -----
  // A szkript ÚJRAFUTTATHATÓ: a már létező című gyökereket kihagyjuk, és a
  // keret-ellenőrzés is csak a ténylegesen létrehozandókkal számol.
  const lista = [];
  const kihagyott = [];

  for (const [cim, pont] of TARTALMAK.slice(0, darab)) {
    const mar = await Tartalom.findOne({ cim, szuloId: null }).select('_id').lean();
    if (mar) kihagyott.push({ cim, id: mar._id.toString() });
    else lista.push([cim, pont]);
  }

  const szuksegesPont = lista.reduce((osszeg, [, pont]) => osszeg + pont, 0);

  console.log('A létrehozó e-ember:', {
    eemberNev: eember.eemberNev,
    szabadTudatpont: eember.tudatpontok,
    szuksegesPont
  });

  if (szuksegesPont > (eember.tudatpontok ?? 0)) {
    console.error('HIBA: nincs elég szabad tudatpont', {
      szukseges: szuksegesPont, szabad: eember.tudatpontok
    });
    await mongoose.disconnect();
    process.exit(1);
  }

  // ----- 3. LÉPÉS: LÉTREHOZÁS EGYESÉVEL -----
  const letrejott = [];
  const hibak = [];

  for (const [cim, pont] of lista) {
    try {
      const tartalom = await tartalomService.tartalomLetrehozasa(
        { cim, szoveg: `${cim} — a Síkidom nézet próbájához létrehozott gyökér tartalom.` },
        eember._id.toString(),
        pont
      );
      letrejott.push({ cim, pont, id: tartalom?._id?.toString() ?? '(ismeretlen)' });
    } catch (hiba) {
      hibak.push({ cim, pont, uzenet: hiba.message });
    }
  }

  // ----- 4. LÉPÉS: ÖSSZEGZÉS -----
  console.log('');
  console.log('=================== EREDMÉNY ===================');
  console.log(`Létrejött: ${letrejott.length} / ${lista.length}` +
    (kihagyott.length ? `  (${kihagyott.length} már létezett, kihagyva)` : ''));
  for (const t of letrejott) {
    console.log(`  ${String(t.pont).padStart(4)} pont  ${t.id}  ${t.cim}`);
  }
  if (hibak.length) {
    console.log('');
    console.log(`HIBÁK (${hibak.length}):`);
    for (const h of hibak) console.log(`  ${h.cim}: ${h.uzenet}`);
  }

  const frissEember = await Eember.findById(eember._id).select('tudatpontok').lean();
  console.log('');
  console.log(`${eember.eemberNev} maradék szabad tudatpontja: ${frissEember?.tudatpontok}`);

  await mongoose.disconnect();
  console.log('sikidomTesztAdat - VÉGE');
  process.exit(hibak.length ? 1 : 0);
}

futtatas().catch(async (hiba) => {
  console.error('sikidomTesztAdat - VÉGZETES HIBA', hiba);
  try { await mongoose.disconnect(); } catch (e) { /* nem baj */ }
  process.exit(1);
});
