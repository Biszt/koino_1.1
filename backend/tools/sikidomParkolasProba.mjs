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
// A tár-modul VALÓDI függvényei (2026-08-11 óta külön fájlban, DOM nélkül) — az
// utolsó szakasz ezeket futtatja, nem a szabályuk másolatát.
import { gerincLanc, osSopres, kiparkolas, visszahozatal, visszaszedes,
         reszfaTorlese, FOLYOSO_SZINT }
  from '../../frontend/js/utils/sikidomTar.js';

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

// ===== A VALÓDI TÁR-MODUL PRÓBÁJA (2026-08-11) =====
// A fenti próbák a SZABÁLYT mérik: a pakolás determinisztikus a teljes készletből.
// Onnantól viszont, hogy a tár-kezelés külön, DOM-független modulba került
// (`frontend/js/utils/sikidomTar.js`), magát a KÓDOT is meg tudjuk mérni — nem
// csak azt, amit másol.
//
// Ez a szakasz egy kicsi, kézzel épített csomópont-tárat állít elő, és a nézet
// négy tár-műveletét futtatja rajta: ős-söprés → visszahozatal-őrszem →
// kiparkolás → méret szerinti visszaszedés.
naplo('===== A VALÓDI TÁR-MODUL (sikidomTar.js) =====');
{
  // Egy csomópont a modal `_ujCsomopont`-jának mintájára, csak a tár-műveletekhez
  // szükséges mezőkkel
  function csomopont(id, szuloId, relR, extra = {}) {
    return {
      id, szuloId, relR, relX: 0, relY: 0,
      pont: extra.pont ?? 1, letrehozva: extra.letrehozva ?? null,
      entitasTipus: 'Tartalom', cim: id, vanGyereke: false,
      kategoriaIkonok: [], tipusIkon: null, javaslatTipus: null,
      gyerekIdk: [], varolista: [], visszaszedettek: [], varolistaRelTerulet: 0,
      helyezettIdk: new Set(), helyezettPont: 0,
      magSugarRel: Infinity, kulsoSugar: 0,
      betoltottGyerekPont: 0, betoltottKuszob: Infinity, mindenLetoltve: false,
      kurzorPont: null, kurzorId: null, parkolt: false, utoljaraLatva: 0
    };
  }

  // --- A TÁR: egy 10 szint mély gerinc, minden ősnek 4 testvér-gyerekkel ---
  const tar = new Map();
  const MELYSEG = 10;
  let elozoId = null;
  for (let szint = 0; szint < MELYSEG; szint++) {
    const id = `sz${szint}`;
    tar.set(id, csomopont(id, elozoId, 0.2));
    if (elozoId) tar.get(elozoId).gyerekIdk.push(id);
    // testvérek: a gerinc-gyereken kívül még négy, KÜLÖNBÖZŐ méretben
    for (let t = 0; t < 4; t++) {
      const tid = `sz${szint}t${t}`;
      const gy = csomopont(tid, id, 0.02 + t * 0.01);
      gy.relX = 0.3 + t * 0.1;
      tar.set(tid, gy);
      tar.get(id).gyerekIdk.push(tid);
      tar.get(id).helyezettIdk.add(tid);
      tar.get(id).helyezettPont += 1;
    }
    elozoId = id;
  }
  // a legmélyebb szint a horgony; a gerinc-gyerekek a lánc mentén állnak
  const horgony = `sz${MELYSEG - 1}`;
  const tarMeretElotte = tar.size;

  // --- 1. GERINC ---
  const gerinc = gerincLanc(tar, horgony);
  allitas(gerinc.length === MELYSEG, 'a gerinc a horgonytól a gyökérig tart',
    `${gerinc.length} szint`);
  allitas(gerinc[0] === horgony, 'a gerinc 0. eleme MAGA a horgony', gerinc[0]);
  allitas(gerincLanc(tar, horgony, 3).length === 3,
    'a korlát rövidre vágja a láncot (a söprés így nézi a folyosót)');

  // --- 2. ŐS-SÖPRÉS: a folyosón kívül minden testvér megy ---
  const sopresValtozott = osSopres(tar, horgony);
  allitas(sopresValtozott === true, 'az ős-söprés dolgozott');

  // a folyosón BELÜL (az első FOLYOSO_SZINT ős) érintetlen
  const folyosonBelul = tar.get(gerinc[FOLYOSO_SZINT - 1]);
  allitas(folyosonBelul.gyerekIdk.length === 5 && !folyosonBelul.parkolt,
    'a folyosón BELÜLI szint érintetlen', `${folyosonBelul.gyerekIdk.length} gyerek`);

  // a folyosón KÍVÜL csak a gerinc-gyerek maradt, és a szint parkol
  const folyosonKivul = tar.get(gerinc[FOLYOSO_SZINT]);
  allitas(folyosonKivul.gyerekIdk.length === 1,
    'a folyosón KÍVÜLI szinten CSAK a gerinc-gyerek maradt',
    `${folyosonKivul.gyerekIdk.length} gyerek`);
  allitas(folyosonKivul.gyerekIdk[0] === gerinc[FOLYOSO_SZINT - 1],
    'és épp a gerinc-gyerek az (rajta vezet a keret-lánc lefelé)');
  allitas(folyosonKivul.parkolt === true, 'a szint PARKOLTNAK van jelölve');
  allitas(folyosonKivul.visszaszedettek.length === 4,
    'az elengedettek ADATA megmaradt (nem kell újra letölteni)',
    `${folyosonKivul.visszaszedettek.length} db`);
  allitas(tar.size < tarMeretElotte, 'a tár TÉNYLEGESEN csökkent',
    `${tarMeretElotte} → ${tar.size}`);

  // --- 3. AZ ŐRSZEM: parkolt szintből ADAGOLVA tilos visszaadni ---
  allitas(visszahozatal(folyosonKivul, 1000, 800) === false,
    'PARKOLT szintből a visszahozatal nem ad vissza semmit (őrszem)');
  allitas(folyosonKivul.varolista.length === 0,
    'a parkolt szint várólistája érintetlen maradt');

  // --- 4. KIPARKOLÁS: a készlet EGYBEN jön vissza ---
  // (a horgonyt a folyosón kívüli szintre állítjuk, hogy visszakerüljön a folyosóba)
  const kiparkolasValtozott = kiparkolas(tar, folyosonKivul.id);
  allitas(kiparkolasValtozott === true, 'a kiparkolás dolgozott');
  allitas(folyosonKivul.parkolt === false, 'a parkolás jelzése megszűnt');
  allitas(folyosonKivul.varolista.length === 4,
    'a TELJES készlet egyben került a várólistára',
    `${folyosonKivul.varolista.length} db`);
  allitas(folyosonKivul.visszaszedettek.length === 0,
    'és a parkoló kiürült');
  allitas(folyosonKivul.varolistaRelTerulet > 0,
    'a várólista relatív területe újraszámolódott',
    folyosonKivul.varolistaRelTerulet.toFixed(5));

  // --- 5. MÉRET SZERINTI VISSZASZEDÉS: csak a sorrend VÉGÉRŐL ---
  {
    const kicsiTar = new Map();
    kicsiTar.set('szulo', csomopont('szulo', 'nagyszulo', 1));
    kicsiTar.set('nagyszulo', csomopont('nagyszulo', null, 1));
    const szulo = kicsiTar.get('szulo');
    // tíz testvér, NÖVEKVŐ mérettel; a horgony a legkisebbek egyike
    for (let i = 0; i < 10; i++) {
      const id = `g${i}`;
      const gy = csomopont(id, 'szulo', 0.02 + i * 0.05);
      kicsiTar.set(id, gy);
      szulo.gyerekIdk.push(id);
      szulo.helyezettIdk.add(id);
      szulo.helyezettPont += 1;
    }
    // a horgony a 2. legkisebb; a keret-számításhoz kell a relR
    const valt = visszaszedes({
      tar: kicsiTar, horgonyId: 'g1',
      nezet: { skala: 1000, eltolasX: 0, eltolasY: 0 },
      kepernyoMeret: 800
    });

    allitas(valt === true, 'a méret szerinti visszaszedés dolgozott');

    const maradtak = szulo.gyerekIdk.map(id => kicsiTar.get(id).relR);
    const elengedettek = szulo.visszaszedettek.map(v => v.relR);
    const legnagyobbMaradt = Math.max(...maradtak);
    const legkisebbElengedett = Math.min(...elengedettek);

    allitas(legkisebbElengedett > legnagyobbMaradt,
      'CSAK a sorrend VÉGÉRŐL engedett el (összefüggő farok)',
      `maradt ≤ ${legnagyobbMaradt.toFixed(2)} < elengedett ≥ ${legkisebbElengedett.toFixed(2)}`);
    allitas(szulo.gyerekIdk.includes('g1'),
      'a HORGONY sosem esik ki a visszaszedésnél');
    allitas(szulo.gyerekIdk.includes('g0'),
      'és a nála kisebb testvér sem');
    allitas(szulo.helyezettIdk.size === szulo.gyerekIdk.length,
      'a `helyezettIdk` együtt csökkent a gyerekekkel',
      `${szulo.helyezettIdk.size} vs ${szulo.gyerekIdk.length}`);
    allitas(Number.isFinite(szulo.magSugarRel),
      'a méretek újramérése lefutott (magSugarRel véges)');

    // a visszaszedettek CSÖKKENŐ méret szerint állnak: a legnagyobb jön vissza először
    const csokkeno = elengedettek.every((r, i) => i === 0 || elengedettek[i - 1] >= r);
    allitas(csokkeno, 'a visszaszedettek CSÖKKENŐ méret szerint állnak sorban');
  }

  // --- 6. RÉSZFA TÖRLÉSE ---
  {
    const t = new Map();
    t.set('a', csomopont('a', null, 1));
    t.set('b', csomopont('b', 'a', 0.2));
    t.set('c', csomopont('c', 'b', 0.05));
    t.get('a').gyerekIdk.push('b');
    t.get('b').gyerekIdk.push('c');
    t.get('a').magSugarRel = 0.5;

    const darab = reszfaTorlese(t, t.get('a'));
    allitas(darab === 2, 'a részfa MINDEN leszármazottja elengedődött', `${darab} db`);
    allitas(t.has('a') && !t.has('b') && !t.has('c'),
      'a csomópont maga MARAD, a részfája megy');
    allitas(t.get('a').gyerekIdk.length === 0 && t.get('a').magSugarRel === Infinity,
      'a szülő „még nem töltöttük be" állapotba állt vissza');
  }
  naplo('');
}

// ===== ÖSSZEGZÉS =====
naplo('');
naplo('=================== EREDMÉNY ===================');
if (hibak.length === 0) {
  naplo(`Mind a ${allitasDb} állítás áll — a parkolás nem mozdít el egyetlen síkidomot sem,`);
  naplo('feltéve, hogy a szintet EGYBEN kapja vissza a pakolás előtt.');
  naplo('A tár-modul (sikidomTar.js) VALÓDI függvényei is le vannak mérve.');
} else {
  naplo(`${hibak.length} ÁLLÍTÁS BUKOTT:`);
  for (const h of hibak) naplo(`  ✘ ${h}`);
}
naplo('');

process.exit(hibak.length ? 1 : 0);
