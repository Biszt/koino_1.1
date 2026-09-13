// koino/meres/fajlAtvitelProba.js — A BÁJTOK ÁTVITELE (5.7 / B)

// Mit bizonyít ez a lap?
//
// ⭐⭐ HOGY A MEGSZAKADT LETÖLTÉS FOLYTATHATÓ, ÉS SOHA NEM HAGY HÁTRA HAMIS FÁJLT.
// A részleges fájl **mérete maga az állapot** (abból következik, hol folytassuk), és a
// lezárás **újra lenyomatol** — ha a bájtok nem azt adják ki, eldobjuk az egészet.
//
// ⛔ ÉS HOGY A MUNKA SZÉTTERÜL: három egyidejű átvitel, **társanként legfeljebb egy** —
// enélkül egy lassú társ lefoglalná az egész készüléket (Csaba döntése).

import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { fajlBlobTarolo, FAJL_KORLAT } from '../js/tar/fajlTar.js';
import {
  kovetkezoKeres, szeletEllenorzes, atvitelTerv, SZELET_MERET, EGYIDEJU_ATVITEL
} from '../js/csere/fajlAtvitel.js';
import { bajtLenyomat } from '../js/esemeny/kanonikusAlak.js';

import { probaGyujtemeny } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A FÁJL-ÁTVITEL — szeletek és folytatás (5.7)');

const KOINO = 'proba';

async function ujTar() {
  const hely = await mkdtemp(join(tmpdir(), 'koino-atvitel-'));
  return { hely, tar: fajlBlobTarolo(KOINO, hely) };
}

const L = (n) => String(n).padStart(43, 'y');

// ===================================
// 1. ⭐ HOL TARTOK? — a méret maga az állapot
// ===================================

proba('⭐⭐ A RÉSZLEGES MÉRET mondja meg, hol folytassuk — nincs külön nyilvántartás',
  async () => {
    const elso = kovetkezoKeres(0);
    const masodik = kovetkezoKeres(SZELET_MERET);
    const kozepen = kovetkezoKeres(SZELET_MERET + 100);

    return elso.eltolas === 0 && elso.index === 0
      && masodik.eltolas === SZELET_MERET && masodik.index === 1
      // ⚠️ Egy félbeszakadt szelet után is pontosan onnan folytatjuk, ahol abbamaradt.
      && kozepen.eltolas === SZELET_MERET + 100;
  });

proba('⭐ A hiányzó/hibás méret 0-nak számít — nem esünk el rajta', async () => {
  return kovetkezoKeres(undefined).eltolas === 0
    && kovetkezoKeres(-5).eltolas === 0
    && kovetkezoKeres(null).eltolas === 0;
});

// ===================================
// 2. ⛔⛔ A SZELET-ELLENŐRZÉS — három támadás ellen
// ===================================

proba('⛔ ROSSZ ELTOLÁSRA érkezett szeletet nem fogadunk el', async () => {
  // ⚠️ Enélkül a fájl CSENDBEN romlana el: a bájtok rossz helyre kerülnének, és csak a
  // lezáráskor derülne ki — feleslegesen letöltve az egészet.
  const v = szeletEllenorzes(1000, 500, 100, FAJL_KORLAT);
  return v.rendben === false && /nem oda/.test(v.ok);
});

proba('⛔ TÚL NAGY szeletet nem fogadunk el — egy kérés nem hozhat végtelen adatot',
  async () => {
    const v = szeletEllenorzes(0, 0, SZELET_MERET + 1, FAJL_KORLAT);
    return v.rendben === false && /hossz/.test(v.ok);
  });

proba('⛔⛔ A FELSŐ MÉRETKORLÁTOT sem lehet átlépni — a lemezünket nem töltik meg',
  async () => {
    const v = szeletEllenorzes(FAJL_KORLAT - 10, FAJL_KORLAT - 10, 100, FAJL_KORLAT);
    return v.rendben === false && /korlát/.test(v.ok);
  });

proba('⭐ A jó szelet átmegy', async () => {
  return szeletEllenorzes(0, 0, SZELET_MERET, FAJL_KORLAT).rendben === true
    && szeletEllenorzes(100, 100, 50, FAJL_KORLAT).rendben === true;
});

// ===================================
// 3. ⭐⭐ A RÉSZLEGES FÁJL — folytatás és lezárás
// ===================================

proba('⭐⭐ SZELETENKÉNT összeáll, és a lezárás a VÉGLEGES nevére teszi', async () => {
  const { tar } = await ujTar();
  const teljes = new Uint8Array(1000).fill(3);
  const lenyomat = await bajtLenyomat(teljes);

  await tar.reszlegesHozzafuz(lenyomat, teljes.subarray(0, 400));
  const felutnal = await tar.reszlegesMeret(lenyomat);
  await tar.reszlegesHozzafuz(lenyomat, teljes.subarray(400));

  const lezaras = await tar.reszlegesLezaras(lenyomat);
  const vissza = await tar.olvas(lenyomat);

  return felutnal === 400 && lezaras.rendben === true
    && vissza !== null && Buffer.from(vissza).equals(Buffer.from(teljes))
    // ⭐ És a részleges már nincs sehol — a félkész és a kész két külön állapot.
    && (await tar.reszlegesMeret(lenyomat)) === 0;
});

proba('⛔⛔ A MEGHAMISÍTOTT letöltés NEM kerül a végleges nevére — eldobjuk', async () => {
  const { tar } = await ujTar();
  const teljes = new Uint8Array(500).fill(9);
  const lenyomat = await bajtLenyomat(teljes);

  // ⚠️ A társ mást küldött, mint amit a lenyomat ígért — ez a valódi támadás.
  await tar.reszlegesHozzafuz(lenyomat, new Uint8Array(500).fill(1));

  const lezaras = await tar.reszlegesLezaras(lenyomat);
  return lezaras.rendben === false && /lenyomatot/.test(lezaras.ok)
    // ⛔ ÉS NEM HAGY HÁTRA SEMMIT: se végleges, se félkész.
    && (await tar.van(lenyomat)) === false
    && (await tar.reszlegesMeret(lenyomat)) === 0;
});

proba('⛔ A félkész fájl NEM számít „megvan"-nak — másnak sem ajánljuk fel', async () => {
  const { tar } = await ujTar();
  const teljes = new Uint8Array(1000).fill(5);
  const lenyomat = await bajtLenyomat(teljes);

  await tar.reszlegesHozzafuz(lenyomat, teljes.subarray(0, 400));

  // ⚠️ Enélkül a bulin felajánlanánk másnak valamit, ami még nincs készen.
  return (await tar.van(lenyomat)) === false
    && !(await tar.lista()).includes(lenyomat)
    && (await tar.reszlegesMeret(lenyomat)) === 400;
});

proba('⛔ A KORLÁT TÚLLÉPÉSEKOR eldobjuk az egészet', async () => {
  const { tar } = await ujTar();
  const lenyomat = L(1);
  try {
    await tar.reszlegesHozzafuz(lenyomat, new Uint8Array(FAJL_KORLAT + 1));
    return false;
  } catch (hiba) {
    return /határt/.test(hiba.message) && (await tar.reszlegesMeret(lenyomat)) === 0;
  }
});

// ===================================
// 4. ⭐ A MUNKA ELOSZTÁSA
// ===================================

const jegyzettel = (parok) => {
  const j = {};
  for (const [lenyomat, tarsak] of parok) {
    j[lenyomat] = { tarsak: Object.fromEntries(tarsak.map((t) => [t, 1])) };
  }
  return j;
};

proba('⛔⛔ TÁRSANKÉNT EGY ÁTVITEL — egy lassú társ nem foglalhatja le a készüléket',
  async () => {
    // Mindhárom fájl ugyanannál az egy társnál van meg.
    const jegyzet = jegyzettel([[L(1), ['a:1']], [L(2), ['a:1']], [L(3), ['a:1']]]);
    const terv = atvitelTerv(
      [{ lenyomat: L(1) }, { lenyomat: L(2) }, { lenyomat: L(3) }], jegyzet);

    // ⭐ Csak EGY indul el — a többi a következő körben, vagy mástól.
    return terv.length === 1 && terv[0].tars === 'a:1';
  });

proba('⭐ HÁROM társtól három átvitel indul — a munka szétterül', async () => {
  const jegyzet = jegyzettel([[L(1), ['a:1']], [L(2), ['b:1']], [L(3), ['c:1']]]);
  const terv = atvitelTerv(
    [{ lenyomat: L(1) }, { lenyomat: L(2) }, { lenyomat: L(3) }], jegyzet);
  return terv.length === 3 && new Set(terv.map((t) => t.tars)).size === 3;
});

proba('⛔ Az EGYIDEJŰ KORLÁT felül is zár', async () => {
  const parok = [];
  for (let i = 0; i < 10; i++) parok.push([L(i), ['t' + i + ':1']]);
  const sorrend = parok.map(([lenyomat]) => ({ lenyomat }));

  return atvitelTerv(sorrend, jegyzettel(parok)).length === EGYIDEJU_ATVITEL;
});

proba('⚠️ AKIRŐL NEM TUDJUK, KINÉL VAN MEG, azt kihagyjuk — nem kérdezünk vaktában',
  async () => {
    // ⭐ A hiány nem hiba: a következő buli megmondja (D19).
    const terv = atvitelTerv([{ lenyomat: L(1) }, { lenyomat: L(2) }],
      jegyzettel([[L(2), ['a:1']]]));
    return terv.length === 1 && terv[0].lenyomat === L(2);
  });

proba('⭐ A SORRENDET tiszteletben tartja (a ritkábbat/vállaltat előbb)', async () => {
  const jegyzet = jegyzettel([[L(1), ['a:1']], [L(2), ['b:1']]]);
  // A hívó már rendezett: L(2) az első.
  const terv = atvitelTerv([{ lenyomat: L(2) }, { lenyomat: L(1) }], jegyzet);
  return terv[0].lenyomat === L(2);
});

export default futtatas;

// Önállóan is futtatható: node koino/meres/fajlAtvitelProba.js
if (process.argv[1] && process.argv[1].endsWith('fajlAtvitelProba.js')) {
  futtatas().then((eredmeny) => process.exit(eredmeny.bukottak.length ? 1 : 0));
}
