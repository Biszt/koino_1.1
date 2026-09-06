// backend/tools/sikidomSokGyokerTesztAdat.js

// ===== SÍKIDOM TESZT-ADAT: SOK GYÖKÉR (alapból 300) =====
//
// Felelősség: NAGY számú gyökér-gondolatot létrehozni a Síkidom nézet
// próbájához — a `sikidomTesztAdat.js` 100 kézzel írt gondolatának KIEGÉSZÍTÉSE,
// nem helyettesítése.
//
// MIÉRT KELL: a 100 gyökér kevés ahhoz, hogy a nézet mai szabályai éles adaton
// próbálódjanak ki. Három dolgot csak sok testvérrel lehet látni:
//   - a MÉRET SZERINTI SOR + KÉPERNYŐ-KAPACITÁS ablaka (nagyításkor elöl belépnek
//     az apróbbak, a végéről leesnek a legnagyobbak, kicsinyítéskor fordítva);
//   - a LETÖLTÉS-FÉK (a várólista nem nőhet korlátlanul);
//   - a HORGONY-VÉDELEM (befelé nagyítva a horgony nem eshet ki a tárból).
//
// AZ ELOSZLÁS: Zipf-szerű hosszú farok, `pont(i) = C / i`. Ez a valósághoz is
// közelebb áll (kevés erős téma, sok apró), és pont ez a nehéz eset: a tömeg nem
// a néhány nagynál van, hanem a farokban — a nézet mérései is ezzel készültek.
//
// A CÍMEK generáltak (jelző × témakör), ezért determinisztikusak és ütközésmentesek.
//
// FONTOS: a gondolatokat a rendes service-en át hozzuk létre
// (`gondolatService.gondolatLetrehozasa`), NEM közvetlen adatbázis-írással — így
// minden származtatott rekord (tudatpont-hozzárendelés, allokáció, hierarchikus
// allokáció, ős-lánc) is konzisztensen létrejön.
//
// CSAK FEJLESZTŐI KÖRNYEZETBEN futtatandó!
//
// Futtatás (a dev konténerben):
//   docker exec koino-backend node tools/sikidomSokGyokerTesztAdat.js
//   docker exec koino-backend node tools/sikidomSokGyokerTesztAdat.js 50
//   docker exec koino-backend node tools/sikidomSokGyokerTesztAdat.js 300 tesztEmber4
//   docker exec koino-backend node tools/sikidomSokGyokerTesztAdat.js 300 tesztEmber5 proba
//
// A harmadik paraméter `proba`: SZÁRAZ FUTÁS — csak kiírja, mit hozna létre és
// mennyi tudatpontba kerülne, de semmit nem ír az adatbázisba.
//
// Újrafuttatható: a már létező című gyökereket kihagyja.

const mongoose = require('mongoose');
require('dotenv').config();

const gondolatService = require('../services/gondolatService');
const Eember = require('../models/eember');
const Gondolat = require('../models/gondolat');

// ===== A CÍMEK ÖSSZETEVŐI =====
// 10 jelző × 30 témakör = 300 egyedi, olvasható magyar cím. A témakörök
// szándékosan MÁSOK, mint a `sikidomTesztAdat.js` 100 címe — de a jelző miatt
// akkor sem ütköznének, ha egyeznének.
const JELZOK = [
  'Helyi', 'Regionális', 'Országos', 'Városi', 'Falusi',
  'Közösségi', 'Fenntartható', 'Digitális', 'Önkéntes', 'Kísérleti'
];

const TEMAKOROK = [
  'energiaközösség', 'ivóvízhálózat', 'csatornarendszer', 'úthálózat', 'hídkarbantartás',
  'tömegközlekedés', 'kerékpárhálózat', 'zöldfelület', 'faültetés', 'talajvédelem',
  'árvízvédelem', 'aszálykezelés', 'szélenergia', 'napenergia', 'geotermia',
  'élelmiszerkör', 'piactér', 'gabonatárolás', 'takarmányozás', 'gyümölcsészet',
  'iskolakert', 'tanműhely', 'felnőttképzés', 'nyelvoktatás', 'digitális írástudás',
  'gyermekfelügyelet', 'szomszédsegítés', 'hospice-ellátás', 'rehabilitáció', 'krízisellátás'
];

// A tudatpont-eloszlás meredeksége. 1 = klasszikus Zipf (a k-adik elem a
// legnagyobb 1/k-ad része). Nagyobb érték = meredekebb, kevesebb összpont.
const ZIPF_KITEVO = 1;

// ===== A CÍM- ÉS PONT-LISTA ELŐÁLLÍTÁSA =====
// A TÉMAKÖR forog gyorsan (elemenként), a JELZŐ lassan (30-anként) — a pontokat
// pedig a sorszám szerint osztjuk. Így minden témakörből jut egy nagy, egy közepes
// és több apró síkidom: a méretek nem egy témakör köré csoportosulnak.
//
// @param {number} darab - hány gondolat kell
// @param {number} keret - mennyi tudatpont áll rendelkezésre (ehhez skálázunk)
// @returns {Array<[string, number]>} [cím, kezdő tudatpont] párok
function listaEloallitasa(darab, keret) {
  console.log('sikidomSokGyokerTesztAdat.listaEloallitasa - KEZDÉS', { darab, keret });

  // 1. A címek: jelző × témakör, a témakör a gyorsabban forgó tényező
  const cimek = [];
  for (let i = 0; i < darab; i++) {
    const jelzo = JELZOK[Math.floor(i / TEMAKOROK.length) % JELZOK.length];
    const temakor = TEMAKOROK[i % TEMAKOROK.length];
    cimek.push(`${jelzo} ${temakor}`);
  }

  // 2. A Zipf-súlyok és a keretre skálázás.
  //    A `C` együtthatót úgy választjuk, hogy az ÖSSZEG épp beleférjen a keretbe.
  //    Minden gondolat legalább 1 pontot kap (0 tudatpontos entitás nem létezhet).
  let sulyOsszeg = 0;
  for (let i = 1; i <= darab; i++) sulyOsszeg += 1 / Math.pow(i, ZIPF_KITEVO);

  const C = keret / sulyOsszeg;

  const lista = cimek.map((cim, index) => {
    const pont = Math.max(1, Math.round(C / Math.pow(index + 1, ZIPF_KITEVO)));
    return [cim, pont];
  });

  const osszeg = lista.reduce((s, [, p]) => s + p, 0);
  console.log('sikidomSokGyokerTesztAdat.listaEloallitasa - VÉGE', {
    darab: lista.length,
    legnagyobb: lista[0]?.[1],
    legkisebb: lista[lista.length - 1]?.[1],
    osszPont: osszeg
  });

  return lista;
}

// ===== FŐ FOLYAMAT =====
async function futtatas() {
  const darab = parseInt(process.argv[2], 10) || 300;
  const kertEemberNev = process.argv[3] && process.argv[3] !== 'proba' ? process.argv[3] : null;
  const szarazFutas = process.argv.includes('proba');

  console.log('sikidomSokGyokerTesztAdat - KEZDÉS', { darab, kertEemberNev, szarazFutas });

  if (darab > JELZOK.length * TEMAKOROK.length) {
    console.error('HIBA: ennyi egyedi cím nem áll elő', {
      kert: darab, elerheto: JELZOK.length * TEMAKOROK.length
    });
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB kapcsolat sikeres');

  // ----- 1. LÉPÉS: A LÉTREHOZÓ E-EMBER -----
  // Név nélkül a legtöbb SZABAD tudatponttal rendelkezőt választjuk
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

  // ----- 2. LÉPÉS: A KERET ÉS A LISTA -----
  // A szabad tudatpont 90%-áig megyünk el, hogy maradjon mozgástér a kézi
  // próbálgatásra (javaslat-tétel, tudatpont-módosítás a nézetből).
  const szabad = eember.tudatpontok ?? 0;
  const keret = Math.floor(szabad * 0.9);

  if (keret < darab) {
    console.error('HIBA: a szabad tudatpont ennyi gondolatra sem elég (fejenként 1 pont a minimum)', {
      eemberNev: eember.eemberNev, szabad, keret, darab
    });
    await mongoose.disconnect();
    process.exit(1);
  }

  const teljesLista = listaEloallitasa(darab, keret);

  // ----- 3. LÉPÉS: MI HIÁNYZIK MÉG? (újrafuttathatóság) -----
  const lista = [];
  const kihagyott = [];

  for (const [cim, pont] of teljesLista) {
    const mar = await Gondolat.findOne({ cim, szuloId: null }).select('_id').lean();
    if (mar) kihagyott.push(cim);
    else lista.push([cim, pont]);
  }

  const szuksegesPont = lista.reduce((osszeg, [, pont]) => osszeg + pont, 0);

  console.log('');
  console.log('A létrehozó e-ember:', {
    eemberNev: eember.eemberNev,
    szabadTudatpont: szabad,
    letrehozando: lista.length,
    marLetezik: kihagyott.length,
    szuksegesPont
  });

  if (szuksegesPont > szabad) {
    console.error('HIBA: nincs elég szabad tudatpont', { szukseges: szuksegesPont, szabad });
    await mongoose.disconnect();
    process.exit(1);
  }

  // ----- SZÁRAZ FUTÁS: itt megállunk -----
  if (szarazFutas) {
    console.log('');
    console.log('=== SZÁRAZ FUTÁS — semmi nem került az adatbázisba ===');
    console.log('Az első 10 és az utolsó 10 létrehozandó:');
    lista.slice(0, 10).forEach(([cim, pont]) => console.log(`  ${String(pont).padStart(4)} pont  ${cim}`));
    if (lista.length > 20) console.log('  …');
    lista.slice(-10).forEach(([cim, pont]) => console.log(`  ${String(pont).padStart(4)} pont  ${cim}`));
    await mongoose.disconnect();
    process.exit(0);
  }

  // ----- 4. LÉPÉS: LÉTREHOZÁS EGYESÉVEL -----
  // Egyesével, a service-en át: minden létrehozás frissíti a hierarchikus
  // allokációt is, ezért ez lassabb, de KONZISZTENS.
  const letrejott = [];
  const hibak = [];

  for (let i = 0; i < lista.length; i++) {
    const [cim, pont] = lista[i];
    try {
      const gondolat = await gondolatService.gondolatLetrehozasa(
        { cim, szoveg: `${cim} — a Síkidom nézet sok-gyökeres próbájához létrehozott gondolat.` },
        eember._id.toString(),
        pont
      );
      letrejott.push({ cim, pont, id: gondolat?._id?.toString() ?? '(ismeretlen)' });
    } catch (hiba) {
      hibak.push({ cim, pont, uzenet: hiba.message });
    }

    // Haladás-jelzés: 300 gondolatnál jó tudni, hogy halad
    if ((i + 1) % 25 === 0) {
      console.log(`  … ${i + 1} / ${lista.length} feldolgozva`);
    }
  }

  // ----- 5. LÉPÉS: ÖSSZEGZÉS -----
  console.log('');
  console.log('=================== EREDMÉNY ===================');
  console.log(`Létrejött: ${letrejott.length} / ${lista.length}` +
    (kihagyott.length ? `  (${kihagyott.length} már létezett, kihagyva)` : ''));

  if (letrejott.length) {
    console.log('A legnagyobb 5:');
    letrejott.slice(0, 5).forEach(t => console.log(`  ${String(t.pont).padStart(4)} pont  ${t.id}  ${t.cim}`));
    console.log('A legkisebb 5:');
    letrejott.slice(-5).forEach(t => console.log(`  ${String(t.pont).padStart(4)} pont  ${t.id}  ${t.cim}`));
  }

  if (hibak.length) {
    console.log('');
    console.log(`HIBÁK (${hibak.length}):`);
    for (const h of hibak.slice(0, 20)) console.log(`  ${h.cim}: ${h.uzenet}`);
    if (hibak.length > 20) console.log(`  … és még ${hibak.length - 20}`);
  }

  const gyokerDarab = await Gondolat.countDocuments({ szuloId: null });
  const frissEember = await Eember.findById(eember._id).select('tudatpontok').lean();

  console.log('');
  console.log(`Gyökér gondolatok száma összesen: ${gyokerDarab}`);
  console.log(`${eember.eemberNev} maradék szabad tudatpontja: ${frissEember?.tudatpontok}`);

  await mongoose.disconnect();
  console.log('sikidomSokGyokerTesztAdat - VÉGE');
  process.exit(hibak.length ? 1 : 0);
}

futtatas().catch(async (hiba) => {
  console.error('sikidomSokGyokerTesztAdat - VÉGZETES HIBA', hiba);
  try { await mongoose.disconnect(); } catch (e) { /* nem baj */ }
  process.exit(1);
});
