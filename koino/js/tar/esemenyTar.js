// koino/js/tar/esemenyTar.js

// Felelősség: az aláírt események megőrzése a készüléken, és a SAJÁT LÁNC kezelése.
//
// KÉT SZABÁLY, AMI SOHA NEM SÉRÜLHET:
//   1. ELLENŐRIZETLEN ESEMÉNY NEM KERÜL A TÁRBA. Minden mentés előtt ellenőrizzük az
//      aláírást és az azonosítót — akkor is, ha „a sajátunk". Így a tár tartalma
//      önmagában bizonyíték, és soha nem kell utólag megbízni benne.
//   2. AZ ESEMÉNYEKET NEM MÓDOSÍTJUK ÉS NEM TÖRÖLJÜK. Egy esemény megtörtént; ami
//      „változik", az egy ÚJABB esemény a láncban (a szavazat módosítása is új esemény).
//
// A SAJÁT LÁNC: minden e-ember eseményei egymásra mutatnak (`elozo`), és sorszámozva
// vannak. Ez adja a D17 „saját lánc-következetesség"-ét — és ezért lepleződik le itt,
// MENTÉSKOR, ha valaki két különböző eseményt írt alá ugyanarról a pontról.
//
// Használják: fo.js és a következő lépésben az állapot-réteg.

import { TAR, adatbazisMegnyitasa, olvasas, iras } from './adatbazis.js';
import { esemenyEllenorzese, elagazasE } from '../esemeny/esemeny.js';

// ===================================
// ESEMÉNY MENTÉSE
// ===================================

/**
 * Elment egy eseményt — ellenőrzés után.
 *
 * @param {Object} esemeny
 * @returns {Promise<{mentve: boolean, ok?: string, elagazas?: Object}>}
 *   mentve=false + ok      → elutasítva (érvénytelen)
 *   mentve=true + elagazas → elmentve, DE ellentmondás derült ki (lásd lentebb)
 */
export async function esemenyMentese(esemeny) {
  console.log('esemenyMentese - KEZDÉS', { azonosito: esemeny?.azonosito, tipus: esemeny?.tipus });

  // ----- 1. ELLENŐRZÉS -----
  const ellenorzes = await esemenyEllenorzese(esemeny);
  if (!ellenorzes.rendben) {
    console.log('esemenyMentese - VÉGE (ELUTASÍTVA)', { ok: ellenorzes.ok });
    return { mentve: false, ok: ellenorzes.ok };
  }

  // ----- 2. MÁR MEGVAN? -----
  // Az azonosító a tartalom lenyomata, tehát ha már megvan, akkor BÁJTRA ugyanaz.
  // Ezért az ismételt mentés nem hiba, hanem semmit-nem-csinálás. (Ez teszi majd a
  // hálózati összefésülést triviálissá a Szakasz 2-ben.)
  const meglevo = await olvasas(TAR.ESEMENYEK, esemeny.azonosito);
  if (meglevo) {
    console.log('esemenyMentese - VÉGE (már megvolt)');
    return { mentve: true, marMegvolt: true };
  }

  // ----- 3. ELÁGAZÁS-KERESÉS: a kettős cselekvés leleplezése -----
  // Van-e MÁS eseményem ugyanattól a szerzőtől, ugyanazzal a sorszámmal?
  const azonosSorszamuak = await sorszamSzerint(esemeny.szerzo, esemeny.sorszam);
  const utkozo = azonosSorszamuak.find((meglevoEsemeny) => elagazasE(meglevoEsemeny, esemeny));

  // ----- 4. MENTÉS -----
  // Az elágazást is elmentjük! A két esemény EGYÜTT a bizonyíték (D17/D19) — ha az
  // egyiket eldobnánk, épp a bizonyítékot dobnánk el.
  await iras(TAR.ESEMENYEK, esemeny);

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
 * @param {string} azonosito
 * @returns {Promise<Object|undefined>}
 */
export async function esemenyLekerese(azonosito) {
  return olvasas(TAR.ESEMENYEK, azonosito);
}

/**
 * Egy szerző adott sorszámú eseményei.
 * (Rendes esetben legfeljebb egy — ha több, az elágazás.)
 * @param {string} szerzo - a nyilvános kulcs szöveges alakja
 * @param {number} sorszam
 * @returns {Promise<Array<Object>>}
 */
export async function sorszamSzerint(szerzo, sorszam) {
  const db = await adatbazisMegnyitasa();
  return new Promise((kesz, hiba) => {
    const index = db.transaction(TAR.ESEMENYEK, 'readonly')
      .objectStore(TAR.ESEMENYEK)
      .index('szerzoSorszam');
    const keres = index.getAll(IDBKeyRange.only([szerzo, sorszam]));
    keres.onsuccess = () => kesz(keres.result || []);
    keres.onerror = () => hiba(keres.error);
  });
}

/**
 * Egy szerző ÖSSZES eseménye, sorszám szerint növekvő sorrendben.
 * @param {string} szerzo
 * @returns {Promise<Array<Object>>}
 */
export async function sajatLancEsemenyei(szerzo) {
  const db = await adatbazisMegnyitasa();
  return new Promise((kesz, hiba) => {
    const index = db.transaction(TAR.ESEMENYEK, 'readonly')
      .objectStore(TAR.ESEMENYEK)
      .index('szerzoSorszam');
    // A [szerzo, 0] és [szerzo, végtelen] közötti tartomány = ennek a szerzőnek minden
    // eseménye; az összetett index miatt eleve sorszám szerint jön.
    const tartomany = IDBKeyRange.bound([szerzo, 0], [szerzo, Infinity]);
    const keres = index.getAll(tartomany);
    keres.onsuccess = () => kesz(keres.result || []);
    keres.onerror = () => hiba(keres.error);
  });
}

/**
 * Egy koino összes eseménye (az állapotszámításhoz).
 * @param {string} koino
 * @returns {Promise<Array<Object>>}
 */
export async function koinoEsemenyei(koino) {
  const db = await adatbazisMegnyitasa();
  return new Promise((kesz, hiba) => {
    const keres = db.transaction(TAR.ESEMENYEK, 'readonly')
      .objectStore(TAR.ESEMENYEK)
      .index('koino')
      .getAll(IDBKeyRange.only(koino));
    keres.onsuccess = () => kesz(keres.result || []);
    keres.onerror = () => hiba(keres.error);
  });
}

// ===================================
// A SAJÁT LÁNC VÉGE — a következő esemény helye
// ===================================

/**
 * Megmondja, hova fűzzük a következő saját eseményt.
 *
 * @param {string} szerzo
 * @returns {Promise<{elozo: string|null, sorszam: number}>}
 */
export async function lancVege(szerzo) {
  console.log('lancVege - KEZDÉS', { szerzo: szerzo.slice(0, 8) + '…' });

  const esemenyek = await sajatLancEsemenyei(szerzo);
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
 * @param {string} szerzo
 * @returns {Promise<{ep: boolean, hosszu: number, hezagok: Array<number>, elagazasok: Array<number>, szakadasok: Array<number>}>}
 */
export async function lancEllenorzese(szerzo) {
  console.log('lancEllenorzese - KEZDÉS', { szerzo: szerzo.slice(0, 8) + '…' });

  const esemenyek = await sajatLancEsemenyei(szerzo);
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
