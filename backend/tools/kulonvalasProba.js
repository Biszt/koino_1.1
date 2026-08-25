// backend/tools/kulonvalasProba.js

// FEJLESZTŐI PRÓBA-ESZKÖZ: a KÜLÖNVÁLÁS motorjának mérése valódi adaton.
//
// Mire való? A különválás gépezete (services/kulonvalasService.js) még nincs bekötve a
// javaslat-lezárásba — előbb MEGMÉRJÜK, hogy tényleg azt csinálja-e, amit várunk.
// Ez ugyanaz a minta, mint a levélküldésnél (tools/emailProba.js): a motort a felület
// előtt, önmagában próbáljuk ki.
//
// ===== FUTTATÁS =====
//
// 1) FELMÉRÉS (nem módosít semmit) — kiírja a tartalom tudatpont-tulajdonosait:
//      docker exec koino-backend node tools/kulonvalasProba.js <tartalomId>
//
// 2) SZÉTVÁLASZTÁS — a felsorolt e-emberek különválnak:
//      docker exec koino-backend node tools/kulonvalasProba.js <tartalomId> <eemberId1,eemberId2> "Az új ág címe" [javaslatId]
//
// A javaslatId elhagyható; ilyenkor az eszköz egy PRÓBA-azonosítót használ, és a
// „Másik ág" hivatkozás egy nem létező javaslatra fog mutatni (dev-ben ez rendben van).
//
// ===== FIGYELEM =====
// Ez az eszköz VALÓDI adatot módosít abban az adatbázisban, amelyikhez csatlakozik.
// Éles adatbázison (koino-backend-prod) NE futtasd — a fejlesztői környezet való rá.
//
// ===== MIT MÉR? =====
// A szétválasztás ELŐTT és UTÁN is felveszi a rendszer állapotát, és összeveti:
//   - a rendszerben lévő ÖSSZES tudatpont (e-embereknél + entitásokon) — NEM változhat,
//     mert a tudatpont átkerül, nem duplázódik (1. döntés);
//   - a szülő hierarchikus összpontja — szintén NEM változhat, hiszen a pont a szülőn
//     belül vándorolt át az egyik gyerekről egy új testvérre;
//   - a két ág saját pontja — ezeknek össze kell adódniuk az eredeti értékre.

// ===== IMPORTOK =====
// A dotenv-et védetten hívjuk: a prod a .env.prod-ot env_file-ként injektálja
try { require('dotenv').config(); } catch (_) { /* prod: env_file adja a változókat */ }

const mongoose = require('mongoose');

const Tartalom = require('../models/tartalom');
const eEmber = require('../models/eember');
const TudatpontHozzarendeles = require('../models/tudatpontHozzarendeles');
const TudatpontAllokacio = require('../models/tudatpontAllokacio');
const HierarchikusTudatpontAllokacio = require('../models/hierarchikusTudatpontAllokacio');

const KulonvalasService = require('../services/kulonvalasService');

// ===================================
// A RENDSZER ÁLLAPOTÁNAK FELVÉTELE
// ===================================
// Azokat a számokat gyűjti össze, amiknek a szétválás UTÁN is stimmelniük kell.
// @param {string} forrasId - a szétváló tartalom azonosítója
// @param {string|null} szuloId - a szülője (ha van)
// @param {string|null} ujAgId - az új ág azonosítója (a szétválás után)
// @returns {Promise<Object>} a mért értékek
async function allapotFelvetele(forrasId, szuloId, ujAgId = null) {
  // Az e-embereknél SZABADON álló pontok összege
  const eemberOsszesites = await eEmber.aggregate([
    { $group: { _id: null, ossz: { $sum: '$tudatpontok' } } }
  ]);
  const eembereknelSzabad = eemberOsszesites[0]?.ossz ?? 0;

  // Az entitásokra KIOSZTOTT pontok összege
  const hozzarendelesOsszesites = await TudatpontHozzarendeles.aggregate([
    { $group: { _id: null, ossz: { $sum: '$tudatPontok' } } }
  ]);
  const entitasokonKiosztott = hozzarendelesOsszesites[0]?.ossz ?? 0;

  // A forrás (főág) saját pontja
  const forrasAllokacio = await TudatpontAllokacio.findOne({
    entitasId: forrasId, entitasTipus: 'Tartalom'
  });

  // Az új ág saját pontja (ha már létezik)
  const ujAgAllokacio = ujAgId
    ? await TudatpontAllokacio.findOne({ entitasId: ujAgId, entitasTipus: 'Tartalom' })
    : null;

  // A szülő hierarchikus összpontja (a részfa teljes súlya)
  const szuloHierarchikus = szuloId
    ? await HierarchikusTudatpontAllokacio.findOne({ entitasId: szuloId })
    : null;

  // A két ág HIERARCHIKUS összege (saját pont + az egész alattuk lévő részfa).
  // Ez méri a leszármazottak szétosztását: a két ág hierarchikus összegének együtt
  // ki kell adnia az eredeti ág hierarchikus összegét — se pont, se részfa nem veszhet el.
  const forrasHierarchikus = await HierarchikusTudatpontAllokacio.findOne({ entitasId: forrasId });
  const ujAgHierarchikus = ujAgId
    ? await HierarchikusTudatpontAllokacio.findOne({ entitasId: ujAgId })
    : null;

  return {
    eembereknelSzabad,
    entitasokonKiosztott,
    rendszerOsszesen: eembereknelSzabad + entitasokonKiosztott,
    foagSajatPont: forrasAllokacio?.osszesPont ?? 0,
    ujAgSajatPont: ujAgAllokacio?.osszesPont ?? 0,
    foagHierarchikusPont: forrasHierarchikus?.hierarchikusOsszesPont ?? 0,
    ujAgHierarchikusPont: ujAgHierarchikus?.hierarchikusOsszesPont ?? 0,
    szuloHierarchikusPont: szuloHierarchikus?.hierarchikusOsszesPont ?? null
  };
}

// ===================================
// FŐ FUTÁS
// ===================================
async function futtatas() {
  console.log('kulonvalasProba - KEZDÉS');

  // ----- 1. LÉPÉS: PARAMÉTEREK KIOLVASÁSA -----
  // process.argv[0] = node, [1] = a script útvonala, [2]-től a valódi paraméterek
  const tartalomId    = process.argv[2];
  const kulonvalokNyers = process.argv[3];
  const ujCim         = process.argv[4];
  const javaslatId    = process.argv[5];

  if (!tartalomId) {
    console.log('');
    console.log('Használat:');
    console.log('  Felmérés:        node tools/kulonvalasProba.js <tartalomId>');
    console.log('  Szétválasztás:   node tools/kulonvalasProba.js <tartalomId> <eemberId1,eemberId2> "Új cím" [javaslatId]');
    console.log('');
    process.exit(1);
  }

  // ----- 2. LÉPÉS: KAPCSOLÓDÁS AZ ADATBÁZISHOZ -----
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('kulonvalasProba - adatbázis-kapcsolat rendben');

  // ----- 3. LÉPÉS: A TARTALOM ÉS A TULAJDONOSAI -----
  const tartalom = await Tartalom.findById(tartalomId);
  if (!tartalom) {
    console.error(`kulonvalasProba - HIBA: nincs ilyen tartalom: ${tartalomId}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const tulajdonosok = await TudatpontHozzarendeles.find({
    entitasId: tartalomId,
    entitasTipus: 'Tartalom',
    tudatPontok: { $gt: 0 }
  }).sort({ tudatPontok: -1 });

  console.log('');
  console.log('========== A TARTALOM ==========');
  console.log('  Cím:            ', tartalom.cim);
  console.log('  Azonosító:      ', tartalom._id.toString());
  console.log('  Szülő:          ', tartalom.szuloId ? `${tartalom.szuloId} (${tartalom.szuloTipus})` : 'nincs (gyökér)');
  console.log('  Korábbi szétválásai:', tartalom.kulonvalasok?.length ?? 0);
  console.log('');
  console.log('  TUDATPONT-TULAJDONOSOK:');
  for (const t of tulajdonosok) {
    const ember = await eEmber.findById(t.eemberId).select('eemberNev');
    console.log(`    ${t.eemberId.toString()}  ${String(t.tudatPontok).padStart(4)} pont   ${ember?.eemberNev ?? '(ismeretlen)'}`);
  }
  console.log('================================');
  console.log('');

  // ----- 4. LÉPÉS: CSAK FELMÉRÉS? -----
  if (!kulonvalokNyers || !ujCim) {
    console.log('kulonvalasProba - VÉGE: csak felmérés történt, semmi nem változott.');
    console.log('  Szétválasztáshoz add meg a különválók azonosítóit és az új ág címét.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // ----- 5. LÉPÉS: ÁLLAPOT A SZÉTVÁLASZTÁS ELŐTT -----
  const elotte = await allapotFelvetele(tartalomId, tartalom.szuloId, null);

  console.log('========== ÁLLAPOT ELŐTTE ==========');
  console.log('  E-embereknél szabad pont: ', elotte.eembereknelSzabad);
  console.log('  Entitásokon kiosztott:    ', elotte.entitasokonKiosztott);
  console.log('  RENDSZER ÖSSZESEN:        ', elotte.rendszerOsszesen);
  console.log('  A tartalom saját pontja:  ', elotte.foagSajatPont);
  console.log('  A tartalom hierarchikus p:', elotte.foagHierarchikusPont, '(a részfájával együtt)');
  console.log('  A szülő hierarchikus p.:  ', elotte.szuloHierarchikusPont ?? '(nincs szülő)');
  console.log('====================================');
  console.log('');

  // ----- 6. LÉPÉS: A SZÉTVÁLASZTÁS -----
  const kulonvalok = kulonvalokNyers.split(',').map((s) => s.trim()).filter(Boolean);

  // Ha nincs megadva javaslat, próba-azonosítót használunk (dev-ben ez elfogadható)
  const hasznaltJavaslatId = javaslatId || new mongoose.Types.ObjectId().toString();
  if (!javaslatId) {
    console.log('kulonvalasProba - FIGYELEM: nincs megadva javaslatId, PRÓBA-azonosítót használunk.');
    console.log('  A „Másik ág" hivatkozás egy nem létező javaslatra fog mutatni:', hasznaltJavaslatId);
    console.log('');
  }

  console.log('kulonvalasProba - szétválasztás indul...', { kulonvalok, ujCim });

  const eredmeny = await KulonvalasService.kulonvalasVegrehajtasa({
    forrasEntitasId: tartalomId,
    forrasEntitasTipus: 'Tartalom',
    kulonvaloEemberIdk: kulonvalok,
    ujAgAdatok: { cim: ujCim, szoveg: tartalom.szoveg },
    forrasJavaslatId: hasznaltJavaslatId,
    forrasEgyezmenyId: null
  });

  // ----- 7. LÉPÉS: ÁLLAPOT A SZÉTVÁLASZTÁS UTÁN -----
  const utana = await allapotFelvetele(tartalomId, tartalom.szuloId, eredmeny.kulonvaltAg.id);

  console.log('');
  console.log('========== ÁLLAPOT UTÁNA ==========');
  console.log('  E-embereknél szabad pont: ', utana.eembereknelSzabad);
  console.log('  Entitásokon kiosztott:    ', utana.entitasokonKiosztott);
  console.log('  RENDSZER ÖSSZESEN:        ', utana.rendszerOsszesen);
  console.log('  Főág saját pontja:        ', utana.foagSajatPont);
  console.log('  Különvált ág saját pontja:', utana.ujAgSajatPont);
  console.log('  Főág hierarchikus p.:     ', utana.foagHierarchikusPont);
  console.log('  Különvált ág hierarch. p.:', utana.ujAgHierarchikusPont);
  console.log('  A szülő hierarchikus p.:  ', utana.szuloHierarchikusPont ?? '(nincs szülő)');
  console.log('===================================');
  console.log('');

  // ----- 8. LÉPÉS: A MÉRÉS KIÉRTÉKELÉSE -----
  // Itt derül ki, hogy a motor tényleg csak ÁTRENDEZ-e, vagy közben pontot teremt/veszít.
  const ellenorzesek = [];

  ellenorzesek.push({
    nev: 'A rendszerben lévő összes tudatpont változatlan',
    rendben: elotte.rendszerOsszesen === utana.rendszerOsszesen,
    reszlet: `${elotte.rendszerOsszesen} → ${utana.rendszerOsszesen}`
  });

  ellenorzesek.push({
    nev: 'A két ág SAJÁT pontja kiadja az eredetit',
    rendben: (utana.foagSajatPont + utana.ujAgSajatPont) === elotte.foagSajatPont,
    reszlet: `${utana.foagSajatPont} + ${utana.ujAgSajatPont} = ${utana.foagSajatPont + utana.ujAgSajatPont} (eredeti: ${elotte.foagSajatPont})`
  });

  // Ez méri a LESZÁRMAZOTTAK szétosztását: a részfák súlya sem veszhet el és nem
  // duplázódhat, csak átrendeződik a két ág között.
  ellenorzesek.push({
    nev: 'A két ág HIERARCHIKUS pontja (részfástul) kiadja az eredetit',
    rendben: (utana.foagHierarchikusPont + utana.ujAgHierarchikusPont) === elotte.foagHierarchikusPont,
    reszlet: `${utana.foagHierarchikusPont} + ${utana.ujAgHierarchikusPont} = ${utana.foagHierarchikusPont + utana.ujAgHierarchikusPont} (eredeti: ${elotte.foagHierarchikusPont})`
  });

  if (elotte.szuloHierarchikusPont !== null) {
    ellenorzesek.push({
      nev: 'A szülő hierarchikus összpontja változatlan',
      rendben: elotte.szuloHierarchikusPont === utana.szuloHierarchikusPont,
      reszlet: `${elotte.szuloHierarchikusPont} → ${utana.szuloHierarchikusPont}`
    });
  }

  // A testvér-hivatkozások mindkét oldalon
  const foagFrissen = await Tartalom.findById(tartalomId);
  const ujAgFrissen = await Tartalom.findById(eredmeny.kulonvaltAg.id);

  const foagBejegyzes = (foagFrissen.kulonvalasok ?? []).find(
    (k) => k.testverId?.toString() === eredmeny.kulonvaltAg.id
  );
  const ujAgBejegyzes = (ujAgFrissen.kulonvalasok ?? []).find(
    (k) => k.testverId?.toString() === tartalomId
  );

  ellenorzesek.push({
    nev: 'A főág tudja, ki a testvére (agSzerep: foag)',
    rendben: !!foagBejegyzes && foagBejegyzes.agSzerep === 'foag',
    reszlet: foagBejegyzes ? `agSzerep: ${foagBejegyzes.agSzerep}` : 'NINCS bejegyzés'
  });

  ellenorzesek.push({
    nev: 'A különvált ág tudja, ki a testvére (agSzerep: kulonvalt)',
    rendben: !!ujAgBejegyzes && ujAgBejegyzes.agSzerep === 'kulonvalt',
    reszlet: ujAgBejegyzes ? `agSzerep: ${ujAgBejegyzes.agSzerep}` : 'NINCS bejegyzés'
  });

  ellenorzesek.push({
    nev: 'A két ág testvérként ugyanaz alá került',
    rendben: String(ujAgFrissen.szuloId ?? null) === String(foagFrissen.szuloId ?? null),
    reszlet: `főág szülője: ${foagFrissen.szuloId ?? 'nincs'} | új ág szülője: ${ujAgFrissen.szuloId ?? 'nincs'}`
  });

  console.log('========== A MÉRÉS EREDMÉNYE ==========');
  let mindenRendben = true;
  for (const e of ellenorzesek) {
    console.log(`  ${e.rendben ? 'RENDBEN ' : 'HIBA    '} ${e.nev}`);
    console.log(`            ${e.reszlet}`);
    if (!e.rendben) mindenRendben = false;
  }
  console.log('=======================================');
  console.log('');

  console.log('  Új (különvált) ág azonosítója:', eredmeny.kulonvaltAg.id);
  console.log('  Új ág címe:                   ', eredmeny.kulonvaltAg.cim);
  console.log('  Átvitt e-emberek száma:       ', eredmeny.atvittEmberekSzama);
  if (eredmeny.atvitelHibak.length > 0) {
    console.log('  ÁTVITELI HIBÁK:', JSON.stringify(eredmeny.atvitelHibak, null, 2));
    mindenRendben = false;
  }

  // ----- A LESZÁRMAZOTTAK SZÉTOSZTÁSA -----
  const lesz = eredmeny.leszarmazottak ?? {};
  console.log('');
  console.log('========== A LESZÁRMAZOTTAK ==========');
  console.log('  Bejárt leszármazottak:  ', lesz.leszarmazottakSzama ?? 0);
  console.log('  Maradt a főágon:        ', lesz.marad ?? 0, `(ebből árvaság miatt átkötve: ${lesz.maradtEsAtkotve ?? 0})`);
  console.log('  Átköltözött az új ágra: ', lesz.koltozott ?? 0);
  console.log('  Megkettőződött:         ', lesz.masolt ?? 0);
  if ((lesz.hibak ?? []).length > 0) {
    console.log('  HIBÁK:', JSON.stringify(lesz.hibak, null, 2));
    mindenRendben = false;
  }
  console.log('======================================');
  console.log('');

  await mongoose.disconnect();
  console.log('kulonvalasProba - VÉGE', { mindenRendben });
  process.exit(mindenRendben ? 0 : 1);
}

// Hibakezelés: a hiba kiírása után nem-nulla kilépési kód
futtatas().catch(async (hiba) => {
  console.error('kulonvalasProba - HIBA', hiba);
  try { await mongoose.disconnect(); } catch (_) { /* a kapcsolat már bontva lehet */ }
  process.exit(1);
});
