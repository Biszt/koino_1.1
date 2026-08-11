// backend/tools/sikidomAgTesztAdat.js

// ===== SÍKIDOM TESZT-ADAT: KÉT PRÓBA-ÁG =====
//
// Felelősség: két, egymástól élesen különböző ágat építeni a Síkidom nézet
// próbájához — mindkettő SAJÁT gyökér-tartalom alá, hogy a meglévő 10 400
// gyökeret ne zavarja, és a böngészőben egyértelműen megtalálható legyen.
//
//   A) A TESTVÉR-MEZŐ — egy gyökér alatt 5 000 gyerek, VÁLTOZATOS pont-eloszlással.
//      Mire jó: a lapozás („további tartalmak" koppintás) itt látszik igazán. A mai
//      gyökér-szinten 10 405-ből 10 005 egypontos, csupa holtverseny — ott az új adag
//      a KÜLSŐ gyűrűbe kerül, és a kép közepén látszólag nem történik semmi (lásd
//      `fejlesztesi_terv.md`, „A lapozás KÉTFÉLE arca"). Zipf-eloszlású pontokkal
//      viszont az új adag KÖZÉPRE érkezik, ahogy a modell mondja.
//
//   B) A MÉLY LÁNC — egy másik gyökér alatt 50 szint, szintenként EGYETLEN gyerek.
//      Mire jó: a végtelen egymásba ágyazhatóság. Szintenként a terület a huszadára
//      csökken (`sikidomMeret.SZINT_OSZTO`), tehát a sugár √20 ≈ 4,47-szeresére —
//      50 szint alatt ez nagyjából 10^32-szeres nagyítás. Pontosan ez teszi próbára
//      a korlátlan nagyítást és a horgonyváltást.
//
// MIÉRT 1 PONT MINDEN LÁNCSZEMNEK. A gyerek látszó mérete a SAJÁT hierarchikus
// pontjának és a SZÜLŐJE hierarchikus pontjának arányából jön. A hierarchikus pont
// halmozott, tehát a szülőé tartalmazza a gyerekéit is. Ha minden láncszem 1 pontot
// kap, a d-edik szint pontja (mélység − d + 1), az arány pedig (n−1)/n — vagyis a
// lehető LEGKÖZELEBB az 1-hez. Több pontot adni a mélyebb szinteknek épp rontana:
// a fölöttük lévő arányt nyomná le. Az egy pont tehát nem takarékosság, hanem a
// legnagyobb elérhető láncszem-méret.
//
// A tartalmakat a rendes service-en át hozzuk létre (`tartalomLetrehozasa`), NEM
// közvetlen adatbázis-írással — így minden származtatott rekord (tudatpont-
// hozzárendelés, allokáció, hierarchikus allokáció, ős-lánc, érték-hisztogram)
// konzisztensen létrejön.
//
// CSAK FEJLESZTŐI KÖRNYEZETBEN futtatandó!
//
// Futtatás (a dev konténerben):
//   docker exec koino-backend node tools/sikidomAgTesztAdat.js proba
//   docker exec koino-backend node tools/sikidomAgTesztAdat.js
//   docker exec koino-backend node tools/sikidomAgTesztAdat.js 5000 50
//   (testvér-darab, lánc-mélység)
//
// A `proba` paraméter: SZÁRAZ FUTÁS — kiírja, mit hozna létre (e-embereket is),
// de semmit nem ír az adatbázisba.
//
// ÚJRAFUTTATHATÓ: a már létező című gyerekeket kihagyja, a láncban pedig a meglévő
// szinteken egyszerűen lejjebb lép — vagyis egy félbeszakadt futás folytatható.

const mongoose = require('mongoose');
require('dotenv').config();

const tartalomService = require('../services/tartalomService');
const jelszoHelper = require('../utils/jelszoHelper');
const Eember = require('../models/eember');
const Tartalom = require('../models/tartalom');
const HierarchikusAllokacio = require('../models/hierarchikusTudatpontAllokacio');

// ===== A KÉT ÁG GYÖKERE =====
// Beszédes, egyedi címek — a böngészőben a Keresésből azonnal megtalálhatók.
const MEZO_GYOKER_CIM = 'Ötezres testvér-mező (síkidom próba)';
const LANC_GYOKER_CIM = 'Ötven szintű mély lánc (síkidom próba)';

// A gyökerek SAJÁT pontja. Szándékosan 1: a gyökér hierarchikus pontja így
// gyakorlatilag a gyerekeié, tehát az első gyerek arányát nem nyomja le.
const GYOKER_SAJAT_PONT = 1;

// ===== ALAPÉRTELMEZETT MÉRETEK =====
const ALAP_TESTVER_DARAB = 5000;
const ALAP_LANC_MELYSEG = 50;

// Minden láncszem ennyi pontot kap (lásd a fejléc indoklását)
const LANCSZEM_PONT = 1;

// A testvér-mező pont-kerete a darabszám ennyiszerese. A darabszám maga a
// domain-minimum (fejenként 1 pont); a fölötte lévő rész az, amiből a Zipf-eloszlás
// VÁLTOZATOSSÁGOT csinál. Kétszeres keretnél a legerősebb testvér ~550 pontot kap,
// a leggyengébb 1-et — nagyjából 24-szeres sugár-különbség, ami bőven látszik.
const MEZO_KERET_SZORZO = 2;

// A Zipf-eloszlás kitevője: 1,0 = klasszikus Zipf (hosszú farok)
const ZIPF_KITEVO = 1.0;

// Egy e-ember tudatpontjának ekkora hányadáig megyünk el, hogy maradjon mozgástér
// a kézi próbálgatásra (javaslat-tétel, tudatpont-módosítás a nézetből)
const KERET_ARANY = 0.9;

// A töltő e-emberek neve és jelszava (ugyanaz a készlet, mint a tízezres szerszámé)
const TOLTO_NEV_ELOTAG = 'tesztTolto';
const TOLTO_JELSZO = 'jelszo123';

// ===== A CÍMEK ÖSSZETEVŐI =====
// 20 jelző × 25 témakör × 25 helyszín = 12 500 kombináció. A helyszín forog
// leggyorsabban, így az egymás után létrejövő tartalmak témakörei keverednek.
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

// ===== CÍMEK ELŐÁLLÍTÁSA =====
// @param {number} darab - hány cím kell
// @returns {Array<string>}
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

// ===== A PONTOK SZÉTOSZTÁSA (Zipf) =====
// Minden testvér kap 1 alap-pontot (domain-minimum), a maradékot Zipf-szerint
// osztjuk. Így a végösszeg BIZTOSAN nem lépi túl a keretet.
//
// @param {number} darab - hány testvér
// @param {number} keret - a teljes rendelkezésre álló tudatpont
// @returns {Array<number>} testvérenkénti pontszám, csökkenő sorrendben
function pontokSzetosztasa(darab, keret) {
  console.log('sikidomAgTesztAdat.pontokSzetosztasa - KEZDÉS', { darab, keret });

  const maradek = Math.max(0, keret - darab);      // az alap-pontok után marad ennyi

  let sulyOsszeg = 0;
  for (let i = 1; i <= darab; i++) sulyOsszeg += 1 / Math.pow(i, ZIPF_KITEVO);

  const C = maradek / sulyOsszeg;

  // Lefelé kerekítve osztunk, hogy biztosan beleférjünk a keretbe
  const pontok = [];
  for (let i = 0; i < darab; i++) {
    pontok.push(1 + Math.floor(C / Math.pow(i + 1, ZIPF_KITEVO)));
  }

  const osszeg = pontok.reduce((s, p) => s + p, 0);

  console.log('sikidomAgTesztAdat.pontokSzetosztasa - VÉGE', {
    darab, legnagyobb: pontok[0], legkisebb: pontok[pontok.length - 1], osszeg, keret
  });

  return pontok;
}

// ===== TÖLTŐ E-EMBEREK BIZTOSÍTÁSA =====
// Annyi e-embert hozunk létre (vagy használunk újra), amennyi a kerethez kell.
// SZÁNDÉKOSAN a modellen át, nem a regisztrációs service-en: az meghívó-kódot
// kérhet (`meghivasSzuksegesE`), ami teszt-adat előállításánál csak akadály.
//
// @param {number} szuksegesPont - ennyi tudatpontot kell összeszedni
// @param {boolean} szarazFutas - ne írjon az adatbázisba
// @returns {Promise<Array<{id, nev, szabad}>>} keretek, csökkenő szabad pont szerint
async function toltoEemberekBiztositasa(szuksegesPont, szarazFutas) {
  console.log('sikidomAgTesztAdat.toltoEemberekBiztositasa - KEZDÉS', { szuksegesPont });

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

  console.log('sikidomAgTesztAdat.toltoEemberekBiztositasa', {
    meglevoKeret, szuksegesPont, hianyzik, letrehozandoEember: ujDarab
  });

  if (ujDarab > 0) {
    // A már foglalt neveket EGYSZER kérdezzük le, és a sorszámot mindkét ágon
    // (valódi és száraz futás) ugyanúgy léptetjük — így a próba-kiírás azt a nevet
    // mutatja, ami tényleg létrejönne, nem egy már létezőt.
    const foglaltNevek = new Set(megLevok.map(e => e.eemberNev));
    const hash = szarazFutas ? null : await jelszoHelper.hashJelszo(TOLTO_JELSZO);

    let sorszam = 1;

    for (let i = 1; i <= ujDarab; i++) {
      while (foglaltNevek.has(`${TOLTO_NEV_ELOTAG}${sorszam}`)) sorszam++;

      const nev = `${TOLTO_NEV_ELOTAG}${sorszam}`;
      foglaltNevek.add(nev);

      if (szarazFutas) {
        keretek.push({ id: null, nev: `${nev} (LÉTREHOZANDÓ)`, szabad: ujKeret });
      } else {
        const uj = await Eember.create({
          eemberNev: nev,
          email: `${nev.toLowerCase()}@teszt.hu`,
          jelszo: hash,
          nev: 'Teszt Töltő',
          lokacio: { orszag: 'Magyarország', regio: 'Komárom-Esztergom', telepules: 'Tatabánya' }
        });

        keretek.push({ id: uj._id, nev, szabad: ujKeret });
        console.log(`  új töltő e-ember: ${nev} (${ujKeret} pont kerete)`);
      }

      meglevoKeret += ujKeret;
    }
  }

  // A NAGYOK előre: a legerősebb tartalmakat a legnagyobb keretű e-ember hozza,
  // így nem akad el a szétosztás egy apró maradékon
  keretek.sort((a, b) => b.szabad - a.szabad);

  console.log('sikidomAgTesztAdat.toltoEemberekBiztositasa - VÉGE',
    { eemberDarab: keretek.length, osszKeret: meglevoKeret });

  return keretek;
}

// ===== KERET-FOGLALÓ =====
// Egyetlen közös foglaló mindkét ágnak: megkeresi az első e-embert, akinek még
// van ennyi szabad pontja, és levonja tőle. Így a két ág nem lép egymás keretére.
//
// @param {Array} keretek - a `toltoEemberekBiztositasa` listája (helyben módosul)
// @param {number} pont - ennyi kell
// @returns {Object|null} a választott e-ember, vagy null, ha nincs elég
function keretFoglalas(keretek, pont) {
  for (const e of keretek) {
    if (e.szabad >= pont) {
      e.szabad -= pont;
      return e;
    }
  }
  return null;
}

// ===== GYÖKÉR BIZTOSÍTÁSA =====
// Megkeresi vagy létrehozza az ág gyökér-tartalmát.
//
// @returns {Promise<{id: string, uj: boolean}>}
async function gyokerBiztositasa(cim, keretek, szarazFutas) {
  console.log('sikidomAgTesztAdat.gyokerBiztositasa - KEZDÉS', { cim });

  const mar = await Tartalom.findOne({ cim, szuloId: null }).select('_id').lean();
  if (mar) {
    console.log('sikidomAgTesztAdat.gyokerBiztositasa - VÉGE (már létezik)', { id: mar._id.toString() });
    return { id: mar._id.toString(), uj: false };
  }

  const eember = keretFoglalas(keretek, GYOKER_SAJAT_PONT);
  if (!eember) throw new Error(`Nincs szabad tudatpont a gyökérhez: ${cim}`);

  if (szarazFutas) {
    console.log('sikidomAgTesztAdat.gyokerBiztositasa - VÉGE (száraz futás)', { cim });
    return { id: null, uj: true };
  }

  const uj = await tartalomService.tartalomLetrehozasa(
    { cim, szoveg: `${cim} — a Síkidom nézet próbájához létrehozott gyökér-tartalom.` },
    eember.id.toString(),
    GYOKER_SAJAT_PONT
  );

  console.log('sikidomAgTesztAdat.gyokerBiztositasa - VÉGE (létrehozva)', { id: uj._id.toString() });
  return { id: uj._id.toString(), uj: true };
}

// ===== A) ÁG: TESTVÉR-MEZŐ =====
// Egy gyökér alá `darab` gyerek, Zipf-eloszlású pontokkal.
//
// @returns {Promise<Object>} { letrejott, kihagyott, hibak }
async function mezoEpitese(gyokerId, darab, keretek, szarazFutas, naplo) {
  console.log('sikidomAgTesztAdat.mezoEpitese - KEZDÉS', { gyokerId, darab });

  const allapot = { letrejott: 0, kihagyott: 0, hibak: [] };

  const osszesCim = cimekEloallitasa(darab);

  // Egyetlen lekérdezéssel derítjük ki, mi van már meg — címenként az N+1
  // ötezernél percekbe kerülne
  const mar = gyokerId
    ? await Tartalom.find({ cim: { $in: osszesCim }, szuloId: gyokerId }).select('cim').lean()
    : [];
  const marHalmaz = new Set(mar.map(t => t.cim));
  allapot.kihagyott = marHalmaz.size;

  const cimek = osszesCim.filter(c => !marHalmaz.has(c));
  if (cimek.length === 0) {
    naplo('  A testvér-mező már teljes — nincs teendő.');
    console.log('sikidomAgTesztAdat.mezoEpitese - VÉGE (már teljes)');
    return allapot;
  }

  // A pontokat a TELJES darabszámra osztjuk, és a kihagyottak helyét is
  // elhasználjuk — így egy félbeszakadt futás folytatása ugyanazt az eloszlást adja
  const pontok = pontokSzetosztasa(darab, darab * MEZO_KERET_SZORZO);
  const parok = osszesCim
    .map((cim, i) => ({ cim, pont: pontok[i] }))
    .filter(p => !marHalmaz.has(p.cim));

  if (szarazFutas) {
    naplo(`  Létrehozandó: ${parok.length} gyerek, ${parok.reduce((s, p) => s + p.pont, 0)} tudatpontból`);
    naplo('  Az első 5:');
    parok.slice(0, 5).forEach(p => naplo(`    ${String(p.pont).padStart(5)} pont  ${p.cim}`));
    naplo('  Az utolsó 3:');
    parok.slice(-3).forEach(p => naplo(`    ${String(p.pont).padStart(5)} pont  ${p.cim}`));
    return allapot;
  }

  const kezdet = Date.now();

  for (let i = 0; i < parok.length; i++) {
    const { cim, pont } = parok[i];

    const eember = keretFoglalas(keretek, pont);
    if (!eember) {
      allapot.hibak.push({ cim, pont, uzenet: 'elfogyott a tudatpont-keret' });
      continue;
    }

    try {
      await tartalomService.tartalomLetrehozasa(
        {
          cim,
          szoveg: `${cim} — a Síkidom nézet ötezres testvér-próbájához létrehozott tartalom.`,
          szuloId: gyokerId,
          szuloTipus: 'Tartalom'
        },
        eember.id.toString(),
        pont
      );
      allapot.letrejott++;
    } catch (hiba) {
      // A foglalást visszaadjuk, ha a létrehozás elbukott
      eember.szabad += pont;
      allapot.hibak.push({ cim, pont, uzenet: hiba.message });
    }

    if ((i + 1) % 250 === 0) {
      const eltelt = (Date.now() - kezdet) / 1000;
      const hatra = Math.round(eltelt / (i + 1) * (parok.length - i - 1));
      naplo(`    … ${i + 1} / ${parok.length} · ${Math.round(eltelt)} s eltelt · ` +
        `kb. ${hatra} s hátra · ${allapot.hibak.length} hiba`);
    }
  }

  console.log('sikidomAgTesztAdat.mezoEpitese - VÉGE', allapot.letrejott);
  return allapot;
}

// ===== B) ÁG: MÉLY LÁNC =====
// Egy gyökér alá `melyseg` szint, szintenként EGYETLEN gyerek — a következő
// szint mindig az előző gyerekébe kerül.
//
// @returns {Promise<Object>} { letrejott, kihagyott, hibak, legmelyebbId }
async function lancEpitese(gyokerId, melyseg, keretek, szarazFutas, naplo) {
  console.log('sikidomAgTesztAdat.lancEpitese - KEZDÉS', { gyokerId, melyseg });

  const allapot = { letrejott: 0, kihagyott: 0, hibak: [], legmelyebbId: gyokerId };

  if (szarazFutas) {
    naplo(`  Létrehozandó: ${melyseg} szint, szintenként 1 gyerek, ` +
      `${LANCSZEM_PONT} ponttal (összesen ${melyseg * LANCSZEM_PONT} tudatpont)`);
    return allapot;
  }

  let szuloId = gyokerId;

  for (let szint = 1; szint <= melyseg; szint++) {
    const cim = `${szint}. szint — mély lánc`;

    // Már létezik? Akkor csak lelépünk bele (folytatható futás)
    const mar = await Tartalom.findOne({ cim, szuloId }).select('_id').lean();
    if (mar) {
      szuloId = mar._id.toString();
      allapot.kihagyott++;
      allapot.legmelyebbId = szuloId;
      continue;
    }

    const eember = keretFoglalas(keretek, LANCSZEM_PONT);
    if (!eember) {
      allapot.hibak.push({ cim, pont: LANCSZEM_PONT, uzenet: 'elfogyott a tudatpont-keret' });
      break;
    }

    try {
      const uj = await tartalomService.tartalomLetrehozasa(
        {
          cim,
          szoveg: `${cim} — a Síkidom nézet MÉLYSÉGI próbájához létrehozott láncszem ` +
                  `(${szint} / ${melyseg}).`,
          szuloId,
          szuloTipus: 'Tartalom'
        },
        eember.id.toString(),
        LANCSZEM_PONT
      );

      szuloId = uj._id.toString();
      allapot.legmelyebbId = szuloId;
      allapot.letrejott++;
    } catch (hiba) {
      eember.szabad += LANCSZEM_PONT;
      allapot.hibak.push({ cim, pont: LANCSZEM_PONT, uzenet: hiba.message });
      // A lánc nem folytatható a hiányzó szem alatt
      break;
    }

    if (szint % 10 === 0) naplo(`    … ${szint} / ${melyseg} szint`);
  }

  console.log('sikidomAgTesztAdat.lancEpitese - VÉGE', allapot.letrejott);
  return allapot;
}

// ===== FŐ FOLYAMAT =====
async function futtatas() {
  // A `proba` bárhol állhat a paraméterek között, ezért kiszűrjük a számok elől
  const szarazFutas = process.argv.includes('proba');
  const szamok = process.argv.slice(2).filter(a => /^\d+$/.test(a)).map(Number);

  const testverDarab = szamok[0] || ALAP_TESTVER_DARAB;
  const lancMelyseg = szamok[1] || ALAP_LANC_MELYSEG;

  console.log('');
  console.log('===== SÍKIDOM TESZT-ADAT: KÉT PRÓBA-ÁG =====');
  console.log({ testverDarab, lancMelyseg, szarazFutas });

  const maxCim = JELZOK.length * TEMAKOROK.length * HELYSZINEK.length;
  if (testverDarab > maxCim) {
    console.error('HIBA: ennyi egyedi cím nem áll elő', { kert: testverDarab, elerheto: maxCim });
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB kapcsolat sikeres');

  // ----- 1. LÉPÉS: A TELJES PONT-IGÉNY -----
  // testvér-mező (keret) + lánc (szintenként 1) + a két gyökér saját pontja
  const szuksegesPont =
    testverDarab * MEZO_KERET_SZORZO +
    lancMelyseg * LANCSZEM_PONT +
    2 * GYOKER_SAJAT_PONT;

  const keretek = await toltoEemberekBiztositasa(szuksegesPont, szarazFutas);
  const osszKeret = keretek.reduce((s, e) => s + e.szabad, 0);

  if (osszKeret < szuksegesPont) {
    console.error('HIBA: még így sincs elég tudatpont', { osszKeret, kell: szuksegesPont });
    await mongoose.disconnect();
    process.exit(1);
  }

  // A service bőségesen naplóz; ötezer tartalomnál ez önmagában percekbe kerülne,
  // ezért az építés idejére elnémítjuk — a saját üzeneteink a `naplo`-n mennek ki.
  const eredetiLog = console.log;
  const naplo = (...e) => eredetiLog(...e);

  const kezdet = Date.now();

  // ----- 2. LÉPÉS: A) TESTVÉR-MEZŐ -----
  naplo('');
  naplo(`--- A) TESTVÉR-MEZŐ: "${MEZO_GYOKER_CIM}" ---`);
  const mezoGyoker = await gyokerBiztositasa(MEZO_GYOKER_CIM, keretek, szarazFutas);
  naplo(`  gyökér: ${mezoGyoker.uj ? 'létrehozva' : 'már létezett'}` +
    (mezoGyoker.id ? ` (${mezoGyoker.id})` : ''));

  console.log = () => {};
  const mezo = await mezoEpitese(mezoGyoker.id, testverDarab, keretek, szarazFutas, naplo);
  console.log = eredetiLog;

  // ----- 3. LÉPÉS: B) MÉLY LÁNC -----
  naplo('');
  naplo(`--- B) MÉLY LÁNC: "${LANC_GYOKER_CIM}" ---`);
  const lancGyoker = await gyokerBiztositasa(LANC_GYOKER_CIM, keretek, szarazFutas);
  naplo(`  gyökér: ${lancGyoker.uj ? 'létrehozva' : 'már létezett'}` +
    (lancGyoker.id ? ` (${lancGyoker.id})` : ''));

  console.log = () => {};
  const lanc = await lancEpitese(lancGyoker.id, lancMelyseg, keretek, szarazFutas, naplo);
  console.log = eredetiLog;

  // ----- 4. LÉPÉS: ÖSSZEGZÉS -----
  naplo('');
  naplo('=================== EREDMÉNY ===================');

  if (szarazFutas) {
    naplo('SZÁRAZ FUTÁS — semmi nem került az adatbázisba.');
    naplo(`Pont-igény összesen: ${szuksegesPont}, elérhető keret: ${osszKeret}`);
    naplo(`E-emberek (${keretek.length}):`);
    for (const e of keretek) naplo(`  ${e.nev}: ${e.szabad} pont kerete`);
    await mongoose.disconnect();
    process.exit(0);
  }

  naplo(`Időtartam: ${Math.round((Date.now() - kezdet) / 1000)} s`);
  naplo('');
  naplo(`A) testvér-mező: ${mezo.letrejott} létrejött` +
    (mezo.kihagyott ? `, ${mezo.kihagyott} már létezett` : '') +
    (mezo.hibak.length ? `, ${mezo.hibak.length} hiba` : ''));
  naplo(`B) mély lánc:    ${lanc.letrejott} létrejött` +
    (lanc.kihagyott ? `, ${lanc.kihagyott} már létezett` : '') +
    (lanc.hibak.length ? `, ${lanc.hibak.length} hiba` : ''));

  // A gyökerek hierarchikus pontja — ebből látszik, mekkora síkidomot kapnak
  for (const [nev, id] of [['A) mező', mezoGyoker.id], ['B) lánc', lancGyoker.id]]) {
    const a = await HierarchikusAllokacio.findOne({ entitasId: id })
      .select('hierarchikusOsszesPont').lean();
    naplo(`  ${nev} gyökér hierarchikus pontja: ${a?.hierarchikusOsszesPont ?? '?'}  (${id})`);
  }

  const gyokerDarab = await Tartalom.countDocuments({ szuloId: null });
  const osszDarab = await Tartalom.countDocuments({});
  naplo('');
  naplo(`Gyökér tartalmak: ${gyokerDarab} · összes tartalom: ${osszDarab}`);

  const hibak = [...mezo.hibak, ...lanc.hibak];
  if (hibak.length) {
    naplo('');
    naplo(`HIBÁK (${hibak.length}):`);
    for (const h of hibak.slice(0, 10)) naplo(`  ${h.cim}: ${h.uzenet}`);
    if (hibak.length > 10) naplo(`  … és még ${hibak.length - 10}`);
  }

  await mongoose.disconnect();
  naplo('');
  naplo('sikidomAgTesztAdat - VÉGE');
  process.exit(hibak.length ? 1 : 0);
}

futtatas().catch(async (hiba) => {
  console.error('sikidomAgTesztAdat - VÉGZETES HIBA', hiba);
  try { await mongoose.disconnect(); } catch (e) { /* nem baj */ }
  process.exit(1);
});
