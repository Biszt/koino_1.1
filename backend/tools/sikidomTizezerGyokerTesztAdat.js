// backend/tools/sikidomTizezerGyokerTesztAdat.js

// ===== SÍKIDOM TESZT-ADAT: TÍZEZER GYÖKÉR =====
//
// Felelősség: NAGYSÁGRENDDEL több gyökér-tartalmat létrehozni, mint a
// `sikidomSokGyokerTesztAdat.js` (az 300-ig megy) — a Síkidom nézet 2026-08-09-i
// modelljének éles próbájához.
//
// MIÉRT PONT TÍZEZER: ennyi testvér HELYÉT számolja ki előre a nézet egy szülő
// alatt (`SikidomModal.ELORETOLTES_DARAB`). Ez tehát a modell határa: itt derül ki,
// hogy a „bentről kifelé, egyszerre lerakva" modell tartja-e magát a legnagyobb
// készletnél is, és mennyi ideig tart a megnyitás.
//
// ===== A TUDATPONT-KORLÁT ÉS A MEGOLDÁSA =====
// A koino domain-szabálya szerint 0 tudatpontos entitás nem létezik, tehát 10 000
// tartalomhoz legalább 10 000 tudatpont kell. Egy e-embernek 10 000 tudatpontja
// van összesen (`eember.js` alapértelmezése), és a meglévőknek ennek nagy része már
// ki van osztva. Ezért ez a szerszám — és CSAK ez különbözteti meg a 300-astól —
// annyi „töltő" e-embert hoz létre, amennyi a kerethez kell, és szétosztja köztük a
// tartalmakat.
//
// A töltő e-emberek neve `tesztTolto1`, `tesztTolto2`, … a jelszavuk `jelszo123`
// (ugyanaz, mint a `docs/teszt.md` teszt-fiókjaié). Bejelentkezésre alkalmasak.
// Újrafuttatáskor a meglévőket használja, nem hoz létre újakat fölöslegesen.
//
// AZ ELOSZLÁS: minden tartalom kap 1 alap-pontot (ez a domain-minimum), a maradék
// keretet pedig Zipf-szerűen osztjuk szét (`C / sorszám`). Így a tényleges összeg
// SOSEM lépi túl a keretet — a 300-as szerszám ezt úgy oldotta meg, hogy a
// Zipf-értéket 1-re vágta felfelé, ami tízezer elemnél messze túllőne a kereten.
//
// CSAK FEJLESZTŐI KÖRNYEZETBEN futtatandó!
//
// Futtatás (a dev konténerben):
//   docker exec koino-backend node tools/sikidomTizezerGyokerTesztAdat.js proba
//   docker exec koino-backend node tools/sikidomTizezerGyokerTesztAdat.js
//   docker exec koino-backend node tools/sikidomTizezerGyokerTesztAdat.js 5000
//
// A `proba` paraméter: SZÁRAZ FUTÁS — kiírja, mit hozna létre (e-embereket is),
// de semmit nem ír az adatbázisba.
//
// Újrafuttatható: a már létező című gyökereket kihagyja.

const mongoose = require('mongoose');
require('dotenv').config();

const tartalomService = require('../services/tartalomService');
const jelszoHelper = require('../utils/jelszoHelper');
const Eember = require('../models/eember');
const Tartalom = require('../models/tartalom');

// ===== A CÍMEK ÖSSZETEVŐI =====
// Három tényező, hogy tízezer EGYEDI, olvasható magyar cím álljon elő:
//   20 jelző × 25 témakör × 25 helyszín = 12 500 kombináció.
// A helyszín forog leggyorsabban, így az egymás után létrejövő tartalmak
// témakörei is keverednek — a nézetben nem egy tömbben állnak a hasonlók.
const JELZOK = [
  'Helyi', 'Regionális', 'Országos', 'Városi', 'Falusi',
  'Közösségi', 'Fenntartható', 'Digitális', 'Önkéntes', 'Kísérleti',
  'Nyílt', 'Megújuló', 'Szomszédsági', 'Járási', 'Kistérségi',
  'Határmenti', 'Alföldi', 'Hegyvidéki', 'Folyóparti', 'Tanyasi'
];

const TEMAKOROK = [
  'energiaközösség', 'ivóvízhálózat', 'csatornarendszer', 'úthálózat', 'hídkarbantartás',
  'tömegközlekedés', 'kerékpárhálózat', 'zöldfelület', 'faültetés', 'talajvédelem',
  'árvízvédelem', 'aszálykezelés', 'szélenergia', 'napenergia', 'geotermia',
  'élelmiszerkör', 'piactér', 'gabonatárolás', 'hulladékudvar', 'komposztálás',
  'idősgondozás', 'gyermekfelügyelet', 'közbiztonság', 'tűzvédelem', 'katasztrófaterv'
];

const HELYSZINEK = [
  'Alsóvár', 'Bükkalja', 'Csermely', 'Dombhát', 'Erdőszél',
  'Fenyveshát', 'Gyöngyöspart', 'Halastó', 'Iszkatanya', 'Jegenyés',
  'Kőhalom', 'Lápospart', 'Mezővég', 'Nádasdomb', 'Ó-major',
  'Pusztaszer', 'Rétköz', 'Sóskút', 'Tölgyfalva', 'Újtelep',
  'Vadaskert', 'Zsombékos', 'Árpádhalom', 'Égeres', 'Őrhegy'
];

// A Zipf-eloszlás kitevője: 1,0 = klasszikus Zipf (hosszú farok)
const ZIPF_KITEVO = 1.0;

// Egy e-ember tudatpontjának ekkora hányadáig megyünk el, hogy maradjon mozgástér
// a kézi próbálgatásra (javaslat-tétel, tudatpont-módosítás a nézetből)
const KERET_ARANY = 0.9;

// A töltő e-emberek neve és jelszava
const TOLTO_NEV_ELOTAG = 'tesztTolto';
const TOLTO_JELSZO = 'jelszo123';

// ===== CÍMEK ELŐÁLLÍTÁSA =====
function cimekEloallitasa(darab) {
  const cimek = [];
  for (let i = 0; i < darab; i++) {
    const helyszin = HELYSZINEK[i % HELYSZINEK.length];
    const temakor = TEMAKOROK[Math.floor(i / HELYSZINEK.length) % TEMAKOROK.length];
    const jelzo = JELZOK[Math.floor(i / (HELYSZINEK.length * TEMAKOROK.length)) % JELZOK.length];
    cimek.push(`${jelzo} ${temakor} — ${helyszin}`);
  }
  return cimek;
}

// ===== A PONTOK SZÉTOSZTÁSA =====
// Minden tartalom kap 1 alap-pontot (domain-minimum), a maradékot Zipf-szerint
// osztjuk. Így a végösszeg BIZTOSAN nem lépi túl a keretet.
//
// @param {Array<string>} cimek
// @param {number} keret - a teljes rendelkezésre álló tudatpont
// @returns {Array<[string, number]>}
function pontokSzetosztasa(cimek, keret) {
  console.log('sikidomTizezerGyokerTesztAdat.pontokSzetosztasa - KEZDÉS',
    { darab: cimek.length, keret });

  const darab = cimek.length;
  const maradek = Math.max(0, keret - darab);      // az alap-pontok után marad ennyi

  let sulyOsszeg = 0;
  for (let i = 1; i <= darab; i++) sulyOsszeg += 1 / Math.pow(i, ZIPF_KITEVO);

  const C = maradek / sulyOsszeg;

  // Első menet: lefelé kerekítve osztunk, hogy biztosan beleférjünk
  let kiosztott = 0;
  const lista = cimek.map((cim, index) => {
    const extra = Math.floor(C / Math.pow(index + 1, ZIPF_KITEVO));
    kiosztott += extra;
    return [cim, 1 + extra];
  });

  console.log('sikidomTizezerGyokerTesztAdat.pontokSzetosztasa - VÉGE', {
    darab, legnagyobb: lista[0]?.[1], legkisebb: lista[lista.length - 1]?.[1],
    osszPont: darab + kiosztott, keret
  });

  return lista;
}

// ===== TÖLTŐ E-EMBEREK BIZTOSÍTÁSA =====
// Annyi e-embert hozunk létre (vagy használunk újra), amennyi a kerethez kell.
// SZÁNDÉKOSAN a modellen át, nem a regisztrációs service-en: az meghívó-kódot
// kérhet (`meghivasSzuksegesE`), ami teszt-adat előállításánál csak akadály.
async function toltoEemberekBiztositasa(szuksegesPont, szarazFutas) {
  console.log('sikidomTizezerGyokerTesztAdat.toltoEemberekBiztositasa - KEZDÉS', { szuksegesPont });

  // 1. Ami már megvan: minden e-ember szabad tudatpontja
  const megLevok = await Eember.find({}).select('eemberNev tudatpontok').lean();
  const keretek = megLevok
    .map(e => ({ id: e._id, nev: e.eemberNev, szabad: Math.floor((e.tudatpontok ?? 0) * KERET_ARANY) }))
    .filter(e => e.szabad > 0)
    .sort((a, b) => b.szabad - a.szabad);

  let meglevoKeret = keretek.reduce((s, e) => s + e.szabad, 0);

  // 2. Hány ÚJ e-ember kell még? (fejenként 10 000 × KERET_ARANY)
  const ujKeret = Math.floor(10000 * KERET_ARANY);
  const hianyzik = Math.max(0, szuksegesPont - meglevoKeret);
  const ujDarab = Math.ceil(hianyzik / ujKeret);

  console.log('sikidomTizezerGyokerTesztAdat.toltoEemberekBiztositasa', {
    meglevoKeret, szuksegesPont, hianyzik, letrehozandoEember: ujDarab
  });

  if (ujDarab > 0 && !szarazFutas) {
    const hash = await jelszoHelper.hashJelszo(TOLTO_JELSZO);

    for (let i = 1; i <= ujDarab; i++) {
      // Szabad sorszámot keresünk (újrafuttatáskor ne ütközzön)
      let sorszam = i;
      while (await Eember.findOne({ eemberNev: `${TOLTO_NEV_ELOTAG}${sorszam}` }).select('_id').lean()) {
        sorszam++;
      }

      const nev = `${TOLTO_NEV_ELOTAG}${sorszam}`;
      const uj = await Eember.create({
        eemberNev: nev,
        email: `${nev.toLowerCase()}@teszt.hu`,
        jelszo: hash,
        nev: 'Teszt Töltő',
        lokacio: { orszag: 'Magyarország', regio: 'Komárom-Esztergom', telepules: 'Tatabánya' }
      });

      keretek.push({ id: uj._id, nev, szabad: ujKeret });
      meglevoKeret += ujKeret;
      console.log(`  új töltő e-ember: ${nev} (${ujKeret} pont kerete)`);
    }
  } else if (ujDarab > 0) {
    // Száraz futásnál csak jelezzük, mit hoznánk létre
    for (let i = 1; i <= ujDarab; i++) {
      keretek.push({ id: null, nev: `${TOLTO_NEV_ELOTAG}${i} (LÉTREHOZANDÓ)`, szabad: ujKeret });
      meglevoKeret += ujKeret;
    }
  }

  console.log('sikidomTizezerGyokerTesztAdat.toltoEemberekBiztositasa - VÉGE',
    { eemberDarab: keretek.length, osszKeret: meglevoKeret });

  return keretek;
}

// ===== FŐ FOLYAMAT =====
async function futtatas() {
  const darab = parseInt(process.argv[2], 10) || 10000;
  const szarazFutas = process.argv.includes('proba');

  console.log('sikidomTizezerGyokerTesztAdat - KEZDÉS', { darab, szarazFutas });

  const maxCim = JELZOK.length * TEMAKOROK.length * HELYSZINEK.length;
  if (darab > maxCim) {
    console.error('HIBA: ennyi egyedi cím nem áll elő', { kert: darab, elerheto: maxCim });
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB kapcsolat sikeres');

  // ----- 1. LÉPÉS: MELYIK CÍM HIÁNYZIK MÉG? (újrafuttathatóság) -----
  const osszesCim = cimekEloallitasa(darab);

  // Egyetlen lekérdezéssel, nem címenként (tízezernél az N+1 percekbe kerülne)
  const mar = await Tartalom.find({ cim: { $in: osszesCim }, szuloId: null })
    .select('cim').lean();
  const marHalmaz = new Set(mar.map(t => t.cim));
  const cimek = osszesCim.filter(c => !marHalmaz.has(c));

  console.log('', { kert: darab, marLetezik: marHalmaz.size, letrehozando: cimek.length });

  if (cimek.length === 0) {
    console.log('Minden cím létezik már — nincs teendő.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // ----- 2. LÉPÉS: E-EMBEREK ÉS KERET -----
  // Először a MINIMUMMAL számolunk (fejenként 1 pont), abból jön ki, hány e-ember
  // kell; a tényleges keretet aztán az ő összegük adja.
  const keretek = await toltoEemberekBiztositasa(cimek.length, szarazFutas);
  const osszKeret = keretek.reduce((s, e) => s + e.szabad, 0);

  if (osszKeret < cimek.length) {
    console.error('HIBA: még így sincs elég tudatpont', { osszKeret, kell: cimek.length });
    await mongoose.disconnect();
    process.exit(1);
  }

  // ----- 3. LÉPÉS: A PONTOK -----
  const lista = pontokSzetosztasa(cimek, osszKeret);
  const szuksegesPont = lista.reduce((s, [, p]) => s + p, 0);

  // ----- 4. LÉPÉS: KI MELYIKET HOZZA LÉTRE? -----
  // Sorban töltjük fel az e-embereket: amíg az elsőnek van kerete, ő hozza létre.
  // A NAGYOK kerülnek előre, tehát a legerősebb tartalmakat a legnagyobb keretű
  // e-ember hozza — így nem akad el a szétosztás.
  const hozzarendeles = [];
  let mutato = 0;
  let maradek = keretek[0]?.szabad ?? 0;

  for (const [cim, pont] of lista) {
    while (mutato < keretek.length && maradek < pont) {
      mutato++;
      maradek = keretek[mutato]?.szabad ?? 0;
    }
    if (mutato >= keretek.length) {
      console.error('HIBA: elfogyott a keret a szétosztás közben', { cim, pont });
      await mongoose.disconnect();
      process.exit(1);
    }
    hozzarendeles.push({ cim, pont, eember: keretek[mutato] });
    maradek -= pont;
  }

  // ----- SZÁRAZ FUTÁS: itt megállunk -----
  if (szarazFutas) {
    console.log('');
    console.log('=== SZÁRAZ FUTÁS — semmi nem került az adatbázisba ===');
    console.log(`Létrehozandó: ${lista.length} gyökér-tartalom, ${szuksegesPont} tudatpontból`);
    console.log(`E-emberek (${keretek.length}):`);
    for (const e of keretek) console.log(`  ${e.nev}: ${e.szabad} pont kerete`);
    console.log('Az első 10:');
    hozzarendeles.slice(0, 10).forEach(h =>
      console.log(`  ${String(h.pont).padStart(5)} pont  ${h.eember.nev.padEnd(24)}  ${h.cim}`));
    console.log('  …');
    console.log('Az utolsó 5:');
    hozzarendeles.slice(-5).forEach(h =>
      console.log(`  ${String(h.pont).padStart(5)} pont  ${h.eember.nev.padEnd(24)}  ${h.cim}`));
    await mongoose.disconnect();
    process.exit(0);
  }

  // ----- 5. LÉPÉS: LÉTREHOZÁS EGYESÉVEL, A SERVICE-EN ÁT -----
  // A service minden származtatott rekordot konzisztensen létrehoz (tudatpont-
  // hozzárendelés, allokáció, hierarchikus allokáció, ős-lánc). Ezért lassabb, de
  // ez az egyetlen helyes út.
  //
  // A service bőségesen naplóz; tízezer tartalomnál ez önmagában percekbe kerülne,
  // ezért a létrehozás idejére elnémítjuk.
  const eredetiLog = console.log;
  const naplo = (...e) => eredetiLog(...e);
  console.log = () => {};

  const kezdet = Date.now();
  let letrejott = 0;
  const hibak = [];

  for (let i = 0; i < hozzarendeles.length; i++) {
    const { cim, pont, eember } = hozzarendeles[i];
    try {
      await tartalomService.tartalomLetrehozasa(
        { cim, szoveg: `${cim} — a Síkidom nézet tízezres próbájához létrehozott tartalom.` },
        eember.id.toString(),
        pont
      );
      letrejott++;
    } catch (hiba) {
      hibak.push({ cim, pont, uzenet: hiba.message });
    }

    if ((i + 1) % 250 === 0) {
      const eltelt = (Date.now() - kezdet) / 1000;
      const hatra = Math.round(eltelt / (i + 1) * (hozzarendeles.length - i - 1));
      naplo(`  … ${i + 1} / ${hozzarendeles.length} · ${Math.round(eltelt)} s eltelt · ` +
        `kb. ${hatra} s hátra · ${hibak.length} hiba`);
    }
  }

  console.log = eredetiLog;

  // ----- 6. LÉPÉS: ÖSSZEGZÉS -----
  const gyokerDarab = await Tartalom.countDocuments({ szuloId: null });

  naplo('');
  naplo('=================== EREDMÉNY ===================');
  naplo(`Létrejött: ${letrejott} / ${hozzarendeles.length}` +
    (marHalmaz.size ? `  (${marHalmaz.size} már létezett, kihagyva)` : ''));
  naplo(`Időtartam: ${Math.round((Date.now() - kezdet) / 1000)} s`);
  naplo(`Gyökér tartalmak száma összesen: ${gyokerDarab}`);

  if (hibak.length) {
    naplo('');
    naplo(`HIBÁK (${hibak.length}):`);
    for (const h of hibak.slice(0, 10)) naplo(`  ${h.cim}: ${h.uzenet}`);
    if (hibak.length > 10) naplo(`  … és még ${hibak.length - 10}`);
  }

  await mongoose.disconnect();
  naplo('sikidomTizezerGyokerTesztAdat - VÉGE');
  process.exit(hibak.length ? 1 : 0);
}

futtatas().catch(async (hiba) => {
  console.error('sikidomTizezerGyokerTesztAdat - VÉGZETES HIBA', hiba);
  try { await mongoose.disconnect(); } catch (e) { /* nem baj */ }
  process.exit(1);
});
