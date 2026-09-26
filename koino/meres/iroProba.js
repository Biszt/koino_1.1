// koino/meres/iroProba.js

// Felelősség: bizonyítani, hogy AZ ÍRÓ (D70) azt teszi, amiért született — koinónként és
// készülékenként egyetlen folyamat fűz a tárhoz, és a saját láncunk nem ágazhat el két ablak miatt.
//
// ⭐ MIT KELL ITT BIZONYÍTANI:
//   · aki először ír, író lesz; a többi KLIENS, és az eseménye az írón át ér a fájlba;
//   · két tár egyszerre ír ugyanazzal a kulccsal — ELÁGAZÁS NÉLKÜL (⛔ és a próba nem vak: író
//     nélkül ugyanez a helyzet elágazást szül — ezt a próba maga is megköveteli);
//   · a saját elavult eseményt az író visszautasítja (`ELAVULT`), a kapott idegen elágazást viszont
//     BIZONYÍTÉKKÉNT elmenti (D19) — az író nem nyel el semmit, ami a hálózatról jön;
//   · ha az író lemond, a következő átveszi a szerepet.
//
// ⚠️ Egy folyamaton belül két tár-példány = két folyamat ugyanazon a táron (külön mutató, külön
// író-szerep). A valódi, több folyamatos bekötést a `parancssorProba.js` méri.
//
// Futtatás: node koino/meres/mind.js iro

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { probaGyujtemeny } from './probaFuttato.js';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { iroTarNyitasa } from '../js/tar/iro.js';
import { esemenyMentese, lancVege } from '../js/tar/esemenyTar.js';
import { esemenyLetrehozasa } from '../js/esemeny/esemeny.js';
import { koinoLetrehozasa, gondolatLetrehozasa } from '../js/muveletek.js';

const { proba, futtatas } = probaGyujtemeny('Az író próbája (D70)');

const KOINO = 'proba';

/** Egy eldobható mappa és egy kulcs — egy „készülék". */
async function keszulek() {
  const hely = await mkdtemp(join(tmpdir(), 'koino-iro-'));
  const kulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const szerzo = Buffer.from(await crypto.subtle.exportKey('raw', kulcspar.publicKey))
    .toString('base64url');
  return { hely, kulcspar, szerzo };
}

/** Egy tár a készüléken — íróval vagy anélkül (a rontás-oldalhoz). */
async function tarNyitas(k, iroval = true) {
  const belso = await esemenyTarNyitasa(KOINO, k.hely);
  return iroval ? iroTarNyitasa(belso, { mappa: join(k.hely, KOINO) }) : belso;
}

/** Hány sorszámon áll egynél több esemény — az elágazások száma. */
function elagazasok(esemenyek) {
  const szam = new Map();
  for (const e of esemenyek) {
    const kulcs = e.szerzo + '|' + e.sorszam;
    szam.set(kulcs, (szam.get(kulcs) ?? 0) + 1);
  }
  return [...szam.values()].filter((n) => n > 1).length;
}

/**
 * A verseny: két tár (két „ablak") egyszerre ír három-három gondolatot ugyanazzal a kulccsal.
 * @returns {Promise<{esemenyek: number, elagazasok: number}>}
 */
async function verseny(iroval) {
  const k = await keszulek();
  const a = await tarNyitas(k, iroval);
  const b = await tarNyitas(k, iroval);
  try {
    const ka = { koino: KOINO, kulcspar: k.kulcspar, szerzo: k.szerzo, tar: a };
    const kb = { ...ka, tar: b };
    await koinoLetrehozasa(ka, 'Verseny');
    await Promise.all([1, 2, 3].flatMap((i) => [
      gondolatLetrehozasa(ka, { cim: 'A' + i }),
      gondolatLetrehozasa(kb, { cim: 'B' + i })
    ]));
    await a.frissit();
    const mind = await a.betolt();
    return { esemenyek: mind.length, elagazasok: elagazasok(mind) };
  } finally {
    await a.zar?.();
    await b.zar?.();
    await rm(k.hely, { recursive: true, force: true });
  }
}

// ===================================
// 1. A SZEREP
// ===================================

proba('⭐ AKI ELŐSZÖR ÍR, AZ LESZ AZ ÍRÓ — a másik kliens, és az eseménye az írón át ér a fájlba',
  async () => {
    const k = await keszulek();
    const a = await tarNyitas(k);
    const b = await tarNyitas(k);
    try {
      const ka = { koino: KOINO, kulcspar: k.kulcspar, szerzo: k.szerzo, tar: a };
      await koinoLetrehozasa(ka, 'Szerep');                               // A ír először
      const g = await gondolatLetrehozasa({ ...ka, tar: b }, { cim: 'B-től' });   // B átad
      await a.frissit();
      return a.iroE() === true && b.iroE() === false
        && (await a.esemeny(g.azonosito))?.azonosito === g.azonosito    // az író mutatójában
        && (await b.esemeny(g.azonosito))?.azonosito === g.azonosito    // és a kliensében is
        && (await a.betolt()).length === 2;
    } finally {
      await a.zar(); await b.zar();
      await rm(k.hely, { recursive: true, force: true });
    }
  });

proba('⭐ HA AZ ÍRÓ LEMOND, A KÖVETKEZŐ ÁTVESZI A SZEREPET', async () => {
  const k = await keszulek();
  const a = await tarNyitas(k);
  const b = await tarNyitas(k);
  try {
    const ka = { koino: KOINO, kulcspar: k.kulcspar, szerzo: k.szerzo, tar: a };
    await koinoLetrehozasa(ka, 'Átvétel');
    const voltIro = a.iroE();
    await a.zar();                                                          // a futás vége
    const g = await gondolatLetrehozasa({ ...ka, tar: b }, { cim: 'Az új írótól' });
    return voltIro === true && a.iroE() === false && b.iroE() === true
      && (await b.esemeny(g.azonosito))?.azonosito === g.azonosito
      && elagazasok(await b.betolt()) === 0;
  } finally {
    await a.zar(); await b.zar();
    await rm(k.hely, { recursive: true, force: true });
  }
});

// ===================================
// 2. ⛔⛔ AZ ELÁGAZÁS — a D70 lényege
// ===================================

proba('⛔⛔ KÉT ABLAK EGYSZERRE ÍR — ELÁGAZÁS NÉLKÜL, és minden esemény megvan (író nélkül elágazna)',
  async () => {
    // ⚠️ A PRÓBA NEM VAK: ugyanez a helyzet író NÉLKÜL elágazást szül (mérve: háromból háromszor).
    // Ha egyszer nem szülne, a próba nem mérne semmit — ezt is megköveteljük.
    const nelkule = await verseny(false);
    const vele = await verseny(true);
    return nelkule.elagazasok > 0
      && vele.elagazasok === 0
      && vele.esemenyek === 7;                // a koino + hat gondolat — egyik sem veszett el
  });

proba('⛔ A SAJÁT ELAVULT ESEMÉNYT AZ ÍRÓ VISSZAUTASÍTJA („ELAVULT") — nem ágazik el', async () => {
  const k = await keszulek();
  const a = await tarNyitas(k);
  const b = await tarNyitas(k);
  try {
    const ka = { koino: KOINO, kulcspar: k.kulcspar, szerzo: k.szerzo, tar: a };
    await koinoLetrehozasa(ka, 'Elavult');
    // B a lánc mostani végét látja — de mielőtt írna, A még egyet ír.
    await b.frissit();
    const regiVeg = await lancVege(b, k.szerzo);
    await gondolatLetrehozasa(ka, { cim: 'Közben A írt' });
    const elavult = await esemenyLetrehozasa({ koino: KOINO, tipus: 'GondolatLetrehozas',
      adat: { cim: 'B a régi végről', meret: 1 }, ...regiVeg }, k.kulcspar);
    let hibaKod = null;
    try {
      await esemenyMentese(b, elavult, { ujSajat: true });
    } catch (h) {
      hibaKod = h.kod;
    }
    await a.frissit();
    return hibaKod === 'ELAVULT'
      && !(await a.esemeny(elavult.azonosito))                            // nem került be
      && elagazasok(await a.betolt()) === 0;
  } finally {
    await a.zar(); await b.zar();
    await rm(k.hely, { recursive: true, force: true });
  }
});

proba('⭐ A KAPOTT IDEGEN ELÁGAZÁST AZ ÍRÓ BIZONYÍTÉKKÉNT ELMENTI (D19) — a kliens útján is', async () => {
  const k = await keszulek();
  const idegen = await keszulek();
  const a = await tarNyitas(k);
  const b = await tarNyitas(k);
  try {
    const ka = { koino: KOINO, kulcspar: k.kulcspar, szerzo: k.szerzo, tar: a };
    await koinoLetrehozasa(ka, 'Bizonyíték');                               // A az író
    // Egy IDEGEN szerző két különböző eseményt írt alá ugyanarról a pontról — a hálózatról jön.
    const egyik = await esemenyLetrehozasa({ koino: KOINO, tipus: 'GondolatLetrehozas',
      adat: { cim: 'Egyik', meret: 1 }, elozo: null, sorszam: 1 }, idegen.kulcspar);
    const masik = await esemenyLetrehozasa({ koino: KOINO, tipus: 'GondolatLetrehozas',
      adat: { cim: 'Másik', meret: 1 }, elozo: null, sorszam: 1 }, idegen.kulcspar);
    const e1 = await esemenyMentese(b, egyik);                            // B kliensként ad át
    const e2 = await esemenyMentese(b, masik);
    await a.frissit();
    return e1.mentve && e2.mentve
      && (await a.esemeny(egyik.azonosito)) && (await a.esemeny(masik.azonosito))
      && elagazasok(await a.betolt()) === 1;                              // az idegené — megőrizve
  } finally {
    await a.zar(); await b.zar();
    await rm(k.hely, { recursive: true, force: true });
    await rm(idegen.hely, { recursive: true, force: true });
  }
});

export default futtatas;
