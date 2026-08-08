// backend/tools/sikidomPakolasProba.mjs

// ===== SÍKIDOM-PAKOLÁS MÉRŐPRÓBA =====
//
// Felelősség: böngésző nélkül bebizonyítani, hogy a Síkidom nézet befelé növő
// pakolása SOK testvérnél is hiánytalan. Ez váltja ki a korábban tervezett
// „sűrűség-söprést" — a modell ugyanis már nem becsül sűrűséget.
//
// MIÉRT KELL: a régi modell a még be nem töltött testvéreknek fenntartott magot
// a tudatpontból BECSÜLTE, egy feltételezett 0,45-ös pakolási sűrűséggel. A
// becslés csak TERÜLETTEL számolt, ezért túl optimista volt; a pakoló ilyenkor a
// magot felezve „javított", akár nullára, és onnantól minden további adag NÉMÁN
// elveszett. Mérés: 600 gyerekes próbán 60-as adagokkal csak 180 jelent meg.
//
// AZ ÚJ MODELL: a lyuk nem becslés, hanem a KÉPERNYŐHÖZ horgonyzott állandó
// (MAG_CEL_ATMERO képpont). Nagyítás után annyi várakozó síkidomot fűzünk befelé,
// amennyi elfér; ami nem fér, az a várólistán MARAD. Ez a próba azt ellenőrzi,
// hogy ebből tényleg hiánytalan kép jön ki.
//
// A próba a valódi geometria-modult hívja (frontend/js/utils/sikidomPakolas.js),
// és a SikidomModal._pakolasFolytatasa lépéssorát tükrözi.
//
// Futtatás:  node backend/tools/sikidomPakolasProba.mjs
//            node backend/tools/sikidomPakolasProba.mjs 600 1.3 200 24
//            (darab, zoom-szorzó, zoom-lépések, minimum képernyő-átmérő)
//
//            node backend/tools/sikidomPakolasProba.mjs 600 1.3 90 24 nincsmag
//            → ÜRES MAG NÉLKÜL (a legkisebb testvér a középpontba kerül).
//              Ez a `SikidomModal.URES_MAG = false` beállítás tükre.

// --- IMPORTÁLÁSOK ---
import { pakolas } from '../../frontend/js/utils/sikidomPakolas.js';
import { gyerekRelativSugar, SZINT_OSZTO } from '../../frontend/js/utils/sikidomMeret.js';

// ===== A NÉZET ÁLLANDÓI (a SikidomModal-lal egyezően) =====
const MIN_KEP_ATMERO = Number(process.argv[5]) || 24;
const MAG_CEL_ATMERO = 120;

// A 6. paraméter: `nincsmag` → üres mag nélkül futtatunk (a legkisebb testvér a
// középpontba kerül). Ez a `SikidomModal.URES_MAG` kapcsoló tükre.
const URES_MAG = String(process.argv[6] || '').toLowerCase() !== 'nincsmag';

// ===== A PRÓBA PARAMÉTEREI =====
const GYEREK_DARAB   = Number(process.argv[2]) || 600;
const ZOOM_SZORZO    = Number(process.argv[3]) || 1.3;
const KEZDO_KEPSUGAR = 400;      // a szülő képernyő-sugara az induláskor
const MAX_ZOOM_LEPES = Number(process.argv[4]) || 60;
const SZULO_PONT     = 1_000_000;

// A VALÓSÁGHŰ BETÖLTÉS: a nézet kérésenként legfeljebb ennyi testvért tölt le
// (SikidomModal.KERES_PLAFON), és egyszerre 3 kérés futhat. A várólistára tehát
// adagokban érkeznek az elemek, nem egyszerre több ezer. A próba ezt utánozza —
// enélkül irreálisan nagy pakolásokat mérnénk.
const KERES_PLAFON       = 150;
const EGYIDEJU_BETOLTES  = 3;

// A naplót elnyomjuk: a pakoló képkockánként logol, itt több ezerszer futna
console.log = () => {};
const naplo = (...ertekek) => process.stdout.write(ertekek.join(' ') + '\n');

// ===== TESZT-ADAT =====
// Zipf-eloszlás: néhány erős testvér, majd hosszú farok — ez a valósághű eset, és
// ez feszíti meg a modellt (a farok csak mély nagyításnál válik láthatóvá).
function tesztGyerekek(darab) {
  const sulyok = [];
  let osszSuly = 0;
  for (let i = 1; i <= darab; i++) {
    const s = 1 / Math.pow(i, 1.2);
    sulyok.push(s);
    osszSuly += s;
  }

  // A gyerekek együttes pontja a szülőének 90%-a (a szülőnek is van saját pontja)
  const oszthato = SZULO_PONT * 0.9;
  return sulyok.map((s, i) => ({
    id: `e${String(i + 1).padStart(4, '0')}`,
    pont: (s / osszSuly) * oszthato
  }));
}

// ===== EGY TELJES BEJÁRÁS (a SikidomModal._ujrapakolas tükre) =====
function bejaras(gyerekek) {
  const meg = [...gyerekek];              // amit a backend még nem küldött el
  const varolista = [];                   // amit már letöltöttünk, de nem raktunk le
  let lerakottak = [];                    // { id, x, y, sugar, kor }
  let magSugarRel = Infinity;
  let kepSugar = KEZDO_KEPSUGAR;
  let ujrapakolasok = 0;
  let legdragabb = 0;

  const lepesek = [];

  // STABILITÁS-NAPLÓ: minden síkidom helye a LERAKÁS pillanatában. A futás végén
  // ehhez hasonlítunk — ha bármelyik elmozdult volna, az a nézet fő hibája
  // (Csaba tünete 2026-08-08: „nehéz ráközelíteni egy szélső síkidomra, mert
  // mindig elugrál, kb. kergetni kell").
  const elsoHelyek = new Map();

  for (let kor = 1; kor <= MAX_ZOOM_LEPES; kor++) {
    // Egy zoom-lépésre ennyi érkezhet a backendtől (csökkenő pont szerint)
    varolista.push(...meg.splice(0, KERES_PLAFON * EGYIDEJU_BETOLTES));

    const celMag = (MAG_CEL_ATMERO / 2) / kepSugar;
    let lepesMs = 0;

    // (a) A MÁR LERAKOTTAK HELYBEN MARADNAK — mind KÖRNYEZET (akadály), egyik
    //     sem pakolandó. Ez a 2026-08-08-i modell lényege: a nézet csak akkor
    //     stabil, ha egy lerakott síkidom SOHA többé nem mozdul.
    const allok = lerakottak.map(l => ({ id: l.id, x: l.x, y: l.y, sugar: l.sugar }));

    // (b) A várólistáról azok, akik ezen a nagyításon már látszanának
    const ujak = [];
    for (const v of varolista) {
      const sugar = gyerekRelativSugar(v.pont, SZULO_PONT);
      if (2 * kepSugar * sugar < MIN_KEP_ATMERO) continue;
      ujak.push({ id: v.id, sugar });
    }

    // (c) A LERAKÁS. Nem kell külön „csak a mag körüli gyűrűbe" megkötés: a pakoló
    //     HORGONY-SORRENDJE magától ezt adja — előbb a MAG PEREMÉT próbálja, csak
    //     utána a munkafrontot és a pót-horgonyokat. Mérve (600 testvér): a kicsik
    //     így is végig belül maradnak, 11 egymásba fűzött gyűrűben.
    //
    //     Egy kikényszerített gyűrű-szűrés viszont ÉHEZTET: kipróbálva 600-ból csak
    //     99 került le, a többi végleg a várólistán ragadt, mert a mag képpontban
    //     állandó (tehát adat-térben zsugorodik), a testvérek mérete viszont fix —
    //     a gyűrű előbb-utóbb mindenkinél túl vékony lett.
    const magSugar = URES_MAG ? celMag : 0;

    if (ujak.length > 0) {
      const t0 = process.hrtime.bigint();
      const e = pakolas(ujak, { magSugar, kornyezet: allok });
      lepesMs = Number(process.hrtime.bigint() - t0) / 1e6;
      legdragabb = Math.max(legdragabb, lepesMs);
      ujrapakolasok++;

      const lerakottIdk = new Set();
      for (const h of e.helyek) {
        lerakottIdk.add(h.id);
        lerakottak.push({ ...h, kor });
        elsoHelyek.set(h.id, { x: h.x, y: h.y });
      }

      for (let i = varolista.length - 1; i >= 0; i--) {
        if (lerakottIdk.has(varolista[i].id)) varolista.splice(i, 1);
      }
      magSugarRel = meretek(lerakottak).magSugarRel;
    }

    lepesek.push({
      kor,
      ms: lepesMs,
      kepSugar: Math.round(kepSugar),
      lerakott: lerakottak.length,
      varolistan: varolista.length,
      lyukKepAtmero: Number.isFinite(magSugarRel)
        ? Math.round(magSugarRel * kepSugar * 2)
        : Infinity
    });

    if (varolista.length === 0 && meg.length === 0) break;
    kepSugar *= ZOOM_SZORZO;
  }

  return { lerakottak, varolista: [...varolista, ...meg], lepesek, ujrapakolasok, legdragabb, elsoHelyek };
}

// A mag és a külső perem a lerakottakból
function meretek(lerakottak) {
  let mag = Infinity, kulso = 0;
  for (const l of lerakottak) {
    const t = Math.hypot(l.x, l.y);
    mag = Math.min(mag, t - l.sugar);
    kulso = Math.max(kulso, t + l.sugar);
  }
  return {
    magSugarRel: Number.isFinite(mag) ? Math.max(0, mag) : Infinity,
    kulsoSugar: kulso
  };
}

// ===== ELLENŐRZÉSEK =====
const hibak = [];
function allitas(rendben, cimke, reszlet = '') {
  naplo(`${rendben ? '  OK  ' : ' HIBA '} ${cimke}${reszlet ? ' — ' + reszlet : ''}`);
  if (!rendben) hibak.push(cimke);
}

// 1. NULLA ÁTFEDÉS
function atfedesEllenorzes(lerakottak) {
  let legrosszabb = 0;
  let parosDarab = 0;

  for (let i = 0; i < lerakottak.length; i++) {
    for (let j = i + 1; j < lerakottak.length; j++) {
      const a = lerakottak[i], b = lerakottak[j];
      const tavolsag = Math.hypot(a.x - b.x, a.y - b.y);
      const kellene = a.sugar + b.sugar;
      const atfedes = kellene - tavolsag;
      if (atfedes > 1e-9) {
        parosDarab++;
        legrosszabb = Math.max(legrosszabb, atfedes / kellene);
      }
    }
  }

  allitas(parosDarab === 0, 'Nulla átfedés',
    parosDarab === 0
      ? `${lerakottak.length} síkidom, ${(lerakottak.length * (lerakottak.length - 1) / 2).toLocaleString('hu')} pár ellenőrizve`
      : `${parosDarab} átfedő pár, a legrosszabb ${(legrosszabb * 100).toFixed(2)}%`);
}

// 2. EGYETLEN ENTITÁS SEM VÉSZ EL
function hianyEllenorzes(gyerekek, lerakottak, varolista) {
  const lerakottIdk = new Set(lerakottak.map(l => l.id));
  const varoIdk = new Set(varolista.map(v => v.id));
  const hianyzo = gyerekek.filter(g => !lerakottIdk.has(g.id) && !varoIdk.has(g.id));
  const duplikalt = lerakottak.length !== lerakottIdk.size;

  allitas(hianyzo.length === 0 && !duplikalt, 'Egyetlen entitás sem vész el',
    `${lerakottak.length} lerakva + ${varolista.length} várólistán = ${gyerekek.length}`);
}

// 3. BEÁGYAZÁS: minden a szülőn BELÜL
function beagyazasEllenorzes(lerakottak) {
  let legnagyobb = 0;
  for (const l of lerakottak) legnagyobb = Math.max(legnagyobb, Math.hypot(l.x, l.y) + l.sugar);
  allitas(legnagyobb <= 1 + 1e-9, 'Minden síkidom a szülőn belül',
    `a legkülső perem ${legnagyobb.toFixed(4)} (a szülő sugara 1)`);
}

// 4. AZ INVARIÁNS: későbbi (beljebbi) kör nem lehet nagyobb egy korábbinál
function monotoniaEllenorzes(lerakottak) {
  const korMax = new Map();
  const korMin = new Map();
  for (const l of lerakottak) {
    korMax.set(l.kor, Math.max(korMax.get(l.kor) ?? 0, l.sugar));
    korMin.set(l.kor, Math.min(korMin.get(l.kor) ?? Infinity, l.sugar));
  }

  const korok = [...korMax.keys()].sort((a, b) => a - b);
  let sertes = null;
  for (let i = 1; i < korok.length; i++) {
    const elozoMin = korMin.get(korok[i - 1]);
    const mostMax = korMax.get(korok[i]);
    if (mostMax > elozoMin + 1e-12) sertes = `${korok[i]}. kör`;
  }

  allitas(!sertes, 'Középtől kifelé monoton nő a méret',
    sertes ? `megsérül a ${sertes}-ben` : `${korok.length} egymásba fűzött gyűrű`);
}

// 5. A LYUK KÉPPONTBAN ÁLLANDÓ, AMÍG VAN VÁRAKOZÓ
function lyukEllenorzes(lepesek) {
  const relevans = lepesek.filter(l => l.varolistan > 0 && Number.isFinite(l.lyukKepAtmero));
  if (relevans.length === 0) { allitas(true, 'A lyuk képpontban állandó', 'nincs mérhető lépés'); return; }

  // MAG NÉLKÜL az elvárás a fordítottja: NE legyen lyuk — a legkisebb testvér a
  // középpontban ül, tehát a mért lyuk 0 (a legbelső kör belső széle a
  // középpontban van vagy azon túl).
  if (!URES_MAG) {
    const legnagyobbLyuk = Math.max(...relevans.map(l => l.lyukKepAtmero));
    allitas(legnagyobbLyuk === 0, 'Nincs középső lyuk (a legkisebb a középpontban ül)',
      `a legnagyobb mért lyuk ${legnagyobbLyuk} px`);
    return;
  }

  const ertekek = relevans.map(l => l.lyukKepAtmero);
  const min = Math.min(...ertekek), max = Math.max(...ertekek);
  const also = MAG_CEL_ATMERO * 0.8, felso = MAG_CEL_ATMERO * 1.2;

  allitas(min >= also && max <= felso, 'A lyuk képpontban állandó (cél ±20%)',
    `${min}–${max} px (cél ${MAG_CEL_ATMERO} px, tűrés ${Math.round(also)}–${Math.round(felso)})`);
}

// 6. DETERMINIZMUS
function determinizmusEllenorzes(gyerekek) {
  const ujjlenyomat = (lerakottak) => lerakottak
    .map(l => `${l.id}:${l.x.toFixed(12)}:${l.y.toFixed(12)}:${l.sugar.toFixed(12)}`)
    .join('|');

  const a = bejaras(gyerekek);
  const b = bejaras(gyerekek);
  allitas(ujjlenyomat(a.lerakottak) === ujjlenyomat(b.lerakottak),
    'Determinizmus (kétszer futtatva bitre azonos)');
}

// 7. STABILITÁS: EGY LERAKOTT SÍKIDOM SOHA NEM MOZDUL
// Ez a 2026-08-08-i modell fő ígérete. Ha megsérül, a nézetben az történik, amit
// Csaba jelzett: közelítéskor átrendeződik a kép, és egy szélső síkidomra
// gyakorlatilag lehetetlen ráközelíteni, mert elugrál.
function stabilitasEllenorzes(lerakottak, elsoHelyek) {
  let mozdult = 0;
  let legnagyobb = 0;

  for (const l of lerakottak) {
    const elso = elsoHelyek.get(l.id);
    if (!elso) continue;
    const eltolodas = Math.hypot(l.x - elso.x, l.y - elso.y);
    if (eltolodas > 0) { mozdult++; legnagyobb = Math.max(legnagyobb, eltolodas); }
  }

  allitas(mozdult === 0, 'Lerakás után egyetlen síkidom sem mozdul',
    mozdult === 0
      ? `${lerakottak.length} síkidom helye végig változatlan`
      : `${mozdult} elmozdult, a legnagyobb ${legnagyobb.toExponential(2)}`);
}

// ===== FUTTATÁS =====
naplo('');
naplo('===== SÍKIDOM-PAKOLÁS MÉRŐPRÓBA =====');
naplo(`Gyerekek: ${GYEREK_DARAB} · zoom-lépés: ×${ZOOM_SZORZO} · kezdő képernyő-sugár: ${KEZDO_KEPSUGAR} px`);
naplo(`Láthatósági küszöb: ${MIN_KEP_ATMERO} px átmérő · lyuk cél-átmérője: ${MAG_CEL_ATMERO} px`);
naplo('');

const gyerekek = tesztGyerekek(GYEREK_DARAB);
const kezdet = Date.now();
const { lerakottak, varolista, lepesek, ujrapakolasok, legdragabb, elsoHelyek } = bejaras(gyerekek);
const idotartam = Date.now() - kezdet;

naplo('--- NAGYÍTÁS-LÉPÉSEK ---');
naplo('  kör   képsugár   lerakva   várólistán   lyuk(px)   idő(ms)');
for (const l of lepesek) {
  naplo(`  ${String(l.kor).padStart(3)}   ${String(l.kepSugar).padStart(8)}   ${String(l.lerakott).padStart(7)}   ${String(l.varolistan).padStart(10)}   ${String(l.lyukKepAtmero).padStart(8)}   ${l.ms.toFixed(0).padStart(7)}`);
}
naplo('');

naplo('--- ELLENŐRZÉSEK ---');
atfedesEllenorzes(lerakottak);
hianyEllenorzes(gyerekek, lerakottak, varolista);
beagyazasEllenorzes(lerakottak);
monotoniaEllenorzes(lerakottak);
lyukEllenorzes(lepesek);
stabilitasEllenorzes(lerakottak, elsoHelyek);
determinizmusEllenorzes(gyerekek);
naplo('');

naplo(`Újrapakolás: ${ujrapakolasok}× · a legdrágább lépés: ${legdragabb.toFixed(0)} ms`);
naplo(`Futásidő (3 teljes bejárás): ${idotartam} ms + a determinizmus-próba`);
naplo(hibak.length === 0
  ? '===== MINDEN ELLENŐRZÉS RENDBEN ====='
  : `===== ${hibak.length} ELLENŐRZÉS MEGBUKOTT =====`);
naplo('');

process.exit(hibak.length === 0 ? 0 : 1);
