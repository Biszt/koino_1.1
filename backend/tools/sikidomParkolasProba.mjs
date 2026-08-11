// backend/tools/sikidomParkolasProba.mjs

// ===== A PARKOLÁS MÉRŐPRÓBÁJA =====
//
// Felelősség: böngésző nélkül bebizonyítani, hogy a mélység szerinti ős-söprés
// (`SikidomModal._osSopres`) NEM VÁLTOZTATJA MEG a helyeket.
//
// MIÉRT EZ A LEGFONTOSABB ELLENŐRZÉS
// A `_visszaszedes` szigorúan a kanonikus sorrend VÉGÉRŐL enged el — az „összefüggő
// farok" szabálya azért kötelező, mert a szint LÁTSZIK, és ha a sorrend közepéből
// vennénk el, a maradék fele új helyre kerülne (mérve: 599/1199 síkidom mozdult el).
//
// Az ős-söprés viszont a sorrend KÖZEPÉBŐL is elenged: egy parkolt szinten CSAK a
// gerinc-gyerek marad. Ezt egyetlen dolog teszi megengedhetővé:
//
//   a parkolt szint NEM LÁTSZIK és NEM PAKOLÓDIK, amíg parkol,
//   visszafelé jövet pedig EGYBEN kapja vissza a teljes készletét.
//
// Ez a próba pontosan ezt az ígéretet méri: teljes készlet → helyek feljegyezve →
// parkolás (mindent elengedünk a gerinc-gyereken kívül) → kiparkolás (egyben
// vissza) → újrapakolás → a helyek ÖSSZEVETÉSE.
//
// Ha a pakolás determinisztikus a teljes készletből, a két helyzet BITRE azonos.
// Ha nem az, ez a próba azonnal megbukik — és akkor az ős-söprés nem engedhető ki.
//
// Futtatás:  node backend/tools/sikidomParkolasProba.mjs

// --- IMPORTÁLÁSOK ---
import { pakolas, pakolasiSorrend } from '../../frontend/js/utils/sikidomPakolas.js';

// A pakoló bőségesen naplóz — itt elnyomjuk
const eredetiLog = console.log;
console.log = () => {};
const naplo = (...ertekek) => eredetiLog(ertekek.join(' '));

const hibak = [];
let allitasDb = 0;
function allitas(rendben, cimke, reszlet = '') {
  allitasDb++;
  if (!rendben) hibak.push(`${cimke}${reszlet ? ' — ' + reszlet : ''}`);
  naplo(`  ${rendben ? '✔' : '✘'} ${cimke}${reszlet ? '  (' + reszlet + ')' : ''}`);
}

// ===== TESZT-KÉSZLET ELŐÁLLÍTÁSA =====
// Determinisztikus ál-véletlen, hogy a próba megismételhető legyen.
function veletlenGyar(mag) {
  let allapot = mag;
  return () => {
    allapot = (allapot * 1664525 + 1013904223) % 4294967296;
    return allapot / 4294967296;
  };
}

// @param {number} darab
// @param {string} eloszlas - 'valtozatos' | 'holtverseny' | 'vegyes'
function keszlet(darab, eloszlas, mag = 12345) {
  const vel = veletlenGyar(mag);
  const elemek = [];
  for (let i = 0; i < darab; i++) {
    let sugar;
    if (eloszlas === 'holtverseny') sugar = 0.01;                    // MIND azonos
    else if (eloszlas === 'vegyes') sugar = (i % 3 === 0) ? 0.01 : 0.004 + vel() * 0.02;
    else sugar = 0.004 + vel() * 0.03;                               // változatos
    elemek.push({
      id: `e${String(i).padStart(5, '0')}`,
      sugar,
      // a holtverseny-döntőhöz: minden elemnek saját létrehozási ideje
      letrehozva: new Date(1700000000000 + i * 1000).toISOString()
    });
  }
  return elemek;
}

// A helyek összevetése: BITRE azonos-e minden kör helye?
function helyekOsszevetese(a, b) {
  const terkepA = new Map(a.map(h => [h.id, h]));
  let hianyzik = 0, elmozdult = 0, legnagyobbElteres = 0;

  for (const h of b) {
    const parja = terkepA.get(h.id);
    if (!parja) { hianyzik++; continue; }
    const d = Math.hypot(h.x - parja.x, h.y - parja.y);
    if (d !== 0) {
      elmozdult++;
      if (d > legnagyobbElteres) legnagyobbElteres = d;
    }
  }
  return { hianyzik, elmozdult, legnagyobbElteres, darabA: a.length, darabB: b.length };
}

// ===== EGY KÖR LEFUTTATÁSA =====
// @param {number} darab
// @param {string} eloszlas
// @param {number} magSugar - a pakolási lyuk (0 = nincs)
function proba(darab, eloszlas, magSugar) {
  const elemek = keszlet(darab, eloszlas);

  // --- 1. TELJES PAKOLÁS (ez a mérce) ---
  const elotte = pakolas(elemek, { magSugar });

  // --- 2. PARKOLÁS ---
  // A gerinc-gyerek az, amibe „belenagyítottunk": legyen a kanonikus sorrend
  // közepe táján — épp az az eset, amit a `_visszaszedes` sosem engedne meg.
  const rendezett = [...elemek].sort(pakolasiSorrend);
  const gerincGyerek = rendezett[Math.floor(rendezett.length / 2)];

  // A modal ezt teszi: gyerekIdk = [gerincGyerek], minden más a `visszaszedettek`-be
  const parkolt = elemek.filter(e => e.id !== gerincGyerek.id);
  const bentMaradt = elemek.filter(e => e.id === gerincGyerek.id);

  // --- 3. KIPARKOLÁS: EGYBEN vissza a várólistára, majd újrapakolás ---
  // A modal a `gyerekIdk` + `varolista` UNIÓJÁT pakolja — a sorrendet a pakoló adja.
  const visszaall = [...bentMaradt, ...parkolt];
  const utana = pakolas(visszaall, { magSugar });

  const o = helyekOsszevetese(elotte.helyek, utana.helyek);

  return { elotte, utana, o, gerincGyerek, parkoltDarab: parkolt.length };
}

// ===== A PRÓBÁK =====
naplo('');
naplo('===== A PARKOLÁS MÉRŐPRÓBÁJA =====');
naplo('  teljes pakolás → parkolás (a gerinc-gyereken kívül minden el) →');
naplo('  kiparkolás egyben → újrapakolás → a helyek összevetése');
naplo('');

const esetek = [
  { darab: 300,  eloszlas: 'valtozatos',  magSugar: 0,    nev: '300 változatos, mag nélkül' },
  { darab: 300,  eloszlas: 'valtozatos',  magSugar: 0.06, nev: '300 változatos, pakolási maggal' },
  { darab: 1200, eloszlas: 'vegyes',      magSugar: 0,    nev: '1200 vegyes (sok holtverseny)' },
  { darab: 1200, eloszlas: 'holtverseny', magSugar: 0,    nev: '1200 CSUPA azonos méretű' },
  { darab: 3000, eloszlas: 'valtozatos',  magSugar: 0.03, nev: '3000 változatos, maggal' }
];

for (const e of esetek) {
  const kezdet = Date.now();
  const { o, gerincGyerek, parkoltDarab } = proba(e.darab, e.eloszlas, e.magSugar);
  const ido = Date.now() - kezdet;

  naplo(`--- ${e.nev} ---`);
  naplo(`  parkolva: ${parkoltDarab} · gerinc-gyerek: ${gerincGyerek.id} · ${ido} ms`);
  naplo(`  lerakva előtte: ${o.darabA} · utána: ${o.darabB}`);

  allitas(o.darabA === o.darabB, 'ugyanannyi kör kerül le', `${o.darabA} vs ${o.darabB}`);
  allitas(o.hianyzik === 0, 'egyetlen kör sem tűnik el', `hiányzik: ${o.hianyzik}`);
  allitas(o.elmozdult === 0, 'EGYETLEN kör sem mozdul el',
    `elmozdult: ${o.elmozdult}, legnagyobb eltérés: ${o.legnagyobbElteres}`);
  naplo('');
}

// ===== ELLENPRÓBA: MI TÖRTÉNNE KIPARKOLÁS NÉLKÜL? =====
// Ez mutatja meg, MIÉRT kötelező a teljes visszaállítás pakolás előtt: ha a
// hiányos készletet pakolnánk, a kép szétesne.
naplo('===== ELLENPRÓBA: pakolás a HIÁNYOS készlettel (kiparkolás nélkül) =====');
{
  const elemek = keszlet(1200, 'vegyes');
  const elotte = pakolas(elemek, { magSugar: 0 });

  const rendezett = [...elemek].sort(pakolasiSorrend);
  const gerincGyerek = rendezett[Math.floor(rendezett.length / 2)];

  // CSAK a fele jön vissza — mintha adagolva engednénk vissza a parkolt szintet
  const fele = [gerincGyerek, ...elemek.filter(e => e.id !== gerincGyerek.id).slice(0, 600)];
  const hianyos = pakolas(fele, { magSugar: 0 });

  const o = helyekOsszevetese(elotte.helyek, hianyos.helyek);
  naplo(`  hiányos készlettel: ${o.elmozdult} kör mozdult el, ` +
    `a legnagyobb eltérés ${o.legnagyobbElteres.toFixed(4)}`);
  allitas(o.elmozdult > 0,
    'a hiányos készlet TÉNYLEG szétveri a helyeket (ezért kötelező az egyben visszaadás)',
    `elmozdult: ${o.elmozdult}`);
}

// ===== ÖSSZEGZÉS =====
naplo('');
naplo('=================== EREDMÉNY ===================');
if (hibak.length === 0) {
  naplo(`Mind a ${allitasDb} állítás áll — a parkolás nem mozdít el egyetlen síkidomot sem,`);
  naplo('feltéve, hogy a szintet EGYBEN kapja vissza a pakolás előtt.');
} else {
  naplo(`${hibak.length} ÁLLÍTÁS BUKOTT:`);
  for (const h of hibak) naplo(`  ✘ ${h}`);
}
naplo('');

process.exit(hibak.length ? 1 : 0);
