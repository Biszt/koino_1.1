// koino/js/tar/esemenyTar.js

// Felelősség: az aláírt események megőrzése, és a SAJÁT LÁNC kezelése.
//
// KÉT SZABÁLY, AMI SOHA NEM SÉRÜLHET:
//   1. ELLENŐRIZETLEN ESEMÉNY NEM KERÜL A TÁRBA. Minden mentés előtt ellenőrizzük az
//      aláírást és az azonosítót — akkor is, ha „a sajátunk". Így a tár tartalma
//      önmagában bizonyíték, és soha nem kell utólag megbízni benne.
//   2. AZ ESEMÉNYEKET NEM MÓDOSÍTJUK ÉS NEM TÖRÖLJÜK. Egy esemény megtörtént; ami
//      „változik", az egy ÚJABB esemény a láncban (a szavazat módosítása is új esemény).
//
// ⚠️ A TÁROLÓT KÍVÜLRŐL KAPJA (D29, 2026-08-28). Ez a fájl csak a LOGIKÁT tudja; hogy
// az adat fájlban, memóriában vagy máshol él, az a tároló dolga. Így a szabályok EGY
// példányban léteznek: ha később más tárolót teszünk alá, a lánc-kezelés nem másolódik
// és nem csúszhat szét. A tároló két műveletet ad: `betolt()` és `hozzafuz()`.
//
// A SAJÁT LÁNC: minden e-ember eseményei egymásra mutatnak (`elozo`), és sorszámozva
// vannak. Ez adja a D17 „saját lánc-következetesség"-ét — és ezért lepleződik le itt,
// MENTÉSKOR, ha valaki két különböző eseményt írt alá ugyanarról a pontról.
//
// Használják: muveletek.js és minden, ami eseményt olvas.

import { esemenyEllenorzese, elagazasE } from '../esemeny/esemeny.js';

// ===================================
// ESEMÉNY MENTÉSE
// ===================================

/**
 * Elment egy eseményt — ellenőrzés után.
 *
 * @param {Object} tar - a tároló (betolt/hozzafuz)
 * @param {Object} esemeny
 * @returns {Promise<{mentve: boolean, ok?: string, marMegvolt?: boolean, elagazas?: Object}>}
 *   mentve=false + ok      → elutasítva (érvénytelen)
 *   mentve=true + elagazas → elmentve, DE ellentmondás derült ki (lásd lentebb)
 */
export async function esemenyMentese(tar, esemeny) {
  console.log('esemenyMentese - KEZDÉS', { azonosito: esemeny?.azonosito, tipus: esemeny?.tipus });

  // ----- 1. ELLENŐRZÉS -----
  const ellenorzes = await esemenyEllenorzese(esemeny);
  if (!ellenorzes.rendben) {
    console.log('esemenyMentese - VÉGE (ELUTASÍTVA)', { ok: ellenorzes.ok });
    return { mentve: false, ok: ellenorzes.ok };
  }

  const meglevok = await tar.betolt();

  // ----- 2. MÁR MEGVAN? -----
  // Az azonosító a tartalom lenyomata, tehát ha már megvan, akkor BÁJTRA ugyanaz.
  // Ezért az ismételt mentés nem hiba, hanem semmit-nem-csinálás. (Ez teszi majd a
  // hálózati összefésülést triviálissá a Szakasz 2-ben.)
  if (meglevok.some((meglevo) => meglevo.azonosito === esemeny.azonosito)) {
    console.log('esemenyMentese - VÉGE (már megvolt)');
    return { mentve: true, marMegvolt: true };
  }

  // ----- 3. ELÁGAZÁS-KERESÉS: a kettős cselekvés leleplezése -----
  const utkozo = meglevok.find((meglevo) => elagazasE(meglevo, esemeny));

  // ----- 4. MENTÉS -----
  // Az elágazást is elmentjük! A két esemény EGYÜTT a bizonyíték (D17/D19) — ha az
  // egyiket eldobnánk, épp a bizonyítékot dobnánk el.
  await tar.hozzafuz(esemeny);

  if (utkozo) {
    console.warn('esemenyMentese - ELÁGAZÁS! Ugyanaz a szerző két eseményt írt alá ugyanarról a pontról', {
      szerzo: esemeny.szerzo,
      sorszam: esemeny.sorszam,
      egyik: utkozo.azonosito,
      masik: esemeny.azonosito
    });
    console.log('esemenyMentese - VÉGE (elmentve, de ELLENTMONDÁS)');
    return { mentve: true, elagazas: { egyik: utkozo, masik: esemeny } };
  }

  console.log('esemenyMentese - VÉGE (elmentve)');
  return { mentve: true };
}

// ===================================
// LEKÉRDEZÉSEK
// ===================================

/**
 * Egy esemény lekérése az azonosítója alapján.
 * @param {Object} tar
 * @param {string} azonosito
 * @returns {Promise<Object|undefined>}
 */
export async function esemenyLekerese(tar, azonosito) {
  const esemenyek = await tar.betolt();
  return esemenyek.find((e) => e.azonosito === azonosito);
}

/**
 * Egy szerző adott sorszámú eseményei.
 * (Rendes esetben legfeljebb egy — ha több, az elágazás.)
 * @param {Object} tar
 * @param {string} szerzo
 * @param {number} sorszam
 * @returns {Promise<Array<Object>>}
 */
export async function sorszamSzerint(tar, szerzo, sorszam) {
  const esemenyek = await tar.betolt();
  return esemenyek.filter((e) => e.szerzo === szerzo && e.sorszam === sorszam);
}

/**
 * Egy szerző ÖSSZES eseménye, sorszám szerint növekvő sorrendben.
 * @param {Object} tar
 * @param {string} szerzo
 * @returns {Promise<Array<Object>>}
 */
export async function sajatLancEsemenyei(tar, szerzo) {
  const esemenyek = await tar.betolt();
  return esemenyek
    .filter((e) => e.szerzo === szerzo)
    .sort((a, b) => a.sorszam - b.sorszam);
}

/**
 * Egy koino összes eseménye (az állapotszámításhoz).
 * @param {Object} tar
 * @param {string} koino
 * @returns {Promise<Array<Object>>}
 */
export async function koinoEsemenyei(tar, koino) {
  const esemenyek = await tar.betolt();
  return esemenyek.filter((e) => e.koino === koino);
}

// ===================================
// A SAJÁT LÁNC VÉGE — a következő esemény helye
// ===================================

/**
 * Megmondja, hova fűzzük a következő saját eseményt.
 *
 * @param {Object} tar
 * @param {string} szerzo
 * @returns {Promise<{elozo: string|null, sorszam: number}>}
 */
export async function lancVege(tar, szerzo) {
  console.log('lancVege - KEZDÉS', { szerzo: szerzo.slice(0, 8) + '…' });

  const esemenyek = await sajatLancEsemenyei(tar, szerzo);
  if (esemenyek.length === 0) {
    console.log('lancVege - VÉGE (üres lánc, ez lesz az első)');
    return { elozo: null, sorszam: 1 };
  }

  const utolso = esemenyek[esemenyek.length - 1];
  console.log('lancVege - VÉGE', { utolsoSorszam: utolso.sorszam });
  return { elozo: utolso.azonosito, sorszam: utolso.sorszam + 1 };
}

// ===================================
// A LÁNC ÉPSÉGÉNEK ELLENŐRZÉSE
// ===================================

/**
 * Végigjárja egy szerző láncát, és megnézi, ép-e.
 *
 * Három dolgot néz:
 *   - HÉZAG: hiányzik-e egy sorszám (ilyenkor nem tudunk mindent — ez a hálózaton
 *     természetes állapot lesz, nem hiba);
 *   - ELÁGAZÁS: ugyanarra a sorszámra több esemény (ez CSALÁS, és bizonyított);
 *   - SZAKADÁS: az `elozo` nem a tényleges előző eseményre mutat.
 *
 * @param {Object} tar
 * @param {string} szerzo
 * @returns {Promise<{ep: boolean, hosszu: number, hezagok: Array<number>, elagazasok: Array<number>, szakadasok: Array<number>}>}
 */
export async function lancEllenorzese(tar, szerzo) {
  console.log('lancEllenorzese - KEZDÉS', { szerzo: szerzo.slice(0, 8) + '…' });

  const esemenyek = await sajatLancEsemenyei(tar, szerzo);
  const hezagok = [];
  const elagazasok = [];
  const szakadasok = [];

  // Sorszám → események (rendesen egy, elágazásnál több)
  const sorszamonkent = new Map();
  for (const e of esemenyek) {
    if (!sorszamonkent.has(e.sorszam)) sorszamonkent.set(e.sorszam, []);
    sorszamonkent.get(e.sorszam).push(e);
  }

  const legnagyobb = esemenyek.length ? Math.max(...sorszamonkent.keys()) : 0;

  for (let sorszam = 1; sorszam <= legnagyobb; sorszam++) {
    const ittLevok = sorszamonkent.get(sorszam);

    if (!ittLevok) { hezagok.push(sorszam); continue; }
    if (ittLevok.length > 1) { elagazasok.push(sorszam); continue; }

    // Szakadás: az `elozo` a tényleges előző eseményre mutat-e?
    const e = ittLevok[0];
    const elozoek = sorszamonkent.get(sorszam - 1);
    if (sorszam === 1) {
      if (e.elozo !== null) szakadasok.push(sorszam);
    } else if (elozoek && elozoek.length === 1 && e.elozo !== elozoek[0].azonosito) {
      szakadasok.push(sorszam);
    }
  }

  const eredmeny = {
    ep: hezagok.length === 0 && elagazasok.length === 0 && szakadasok.length === 0,
    hosszu: legnagyobb,
    hezagok,
    elagazasok,
    szakadasok
  };

  console.log('lancEllenorzese - VÉGE', eredmeny);
  return eredmeny;
}
