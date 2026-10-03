// koino/meres/titkositasProba.js

// Felelősség: A CSERE TITKOSÍTÁSÁNAK próbái (D89/1, a ② — 2026-10-03): a kriptográfia (`titkositas.js`),
// és a VISELKEDÉS a résen — hogy a lehallgató tényleg nem lát semmit, hogy a tábla-kulcs csak aláírással
// számít, és hogy kézfogás nélkül nincs csere.
//
// Használják: meres/mind.js (a csere csoport).

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSocket } from 'node:dgram';

import { probaGyujtemeny } from './probaFuttato.js';
import {
  ujEgyszeriKulcs, kezfogasCsomag, kezfogasCsomagbol, munkamenetKulcsai, csomagTitkositasa,
  csomagKititkositasa, kezfogasAlairasa, kezfogasAlairasEllenorzese, TITKOS_JEL, KF_JEL
} from '../js/csere/titkositas.js';
import { ujTablaKulcs, nyilvanosResz } from '../js/csere/tablaKulcs.js';
import { csereUdpResen, udpKapcsolat } from '../js/csere/udpVonal.js';
import { parbeszed } from '../js/csere/vonal.js';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { koinoLetrehozasa, gondolatLetrehozasa } from '../js/muveletek.js';

const { proba, futtatas } = probaGyujtemeny('A csere titkosítása (D89/1)');

const KOINO = 'titkos-proba-koino';
const CIM = 'EZT-A-CIMET-SENKI-NEM-LATHATJA';

// ===================================
// 1. A KRIPTOGRÁFIA
// ===================================

proba('⭐ a két oldal ugyanazt a két irány-kulcsot és átiratot számolja — tükrösen', async () => {
  const a = ujEgyszeriKulcs(), b = ujEgyszeriKulcs();
  const ka = munkamenetKulcsai(a, kezfogasCsomagbol(kezfogasCsomag(b.nyilvanos)));
  const kb = munkamenetKulcsai(b, a.nyilvanos);
  return ka.kuldo.equals(kb.fogado) && ka.fogado.equals(kb.kuldo) && ka.atirat.equals(kb.atirat)
    && !ka.kuldo.equals(ka.fogado) && kezfogasCsomag(a.nyilvanos).length === 33;
});

proba('⛔⛔ a csomag: oda-vissza megy; az átírt bájt, a rossz kulcs, a csonka csomag NULL — nem kivétel', async () => {
  const a = ujEgyszeriKulcs(), b = ujEgyszeriKulcs();
  const ka = munkamenetKulcsai(a, b.nyilvanos), kb = munkamenetKulcsai(b, a.nyilvanos);
  const nyilt = Buffer.from('{"sz":7,"a":"' + CIM + '"}');
  const cs = csomagTitkositasa(ka.kuldo, 200, nyilt);       // 200: kétbájtos számláló
  const ki = csomagKititkositasa(kb.fogado, cs);
  const atirt = Buffer.from(cs); atirt[atirt.length - 20] ^= 1;
  return ki?.szamlalo === 200 && ki.nyilt.equals(nyilt) && cs[0] === TITKOS_JEL
    && !cs.includes(Buffer.from(CIM))
    && csomagKititkositasa(kb.fogado, atirt) === null
    && csomagKititkositasa(kb.kuldo, cs) === null                // a másik irány kulcsa
    && csomagKititkositasa(kb.fogado, cs.subarray(0, 10)) === null
    && csomagKititkositasa(kb.fogado, Buffer.from(nyilt)) === null;   // nyílt JSON nem jut át
});

proba('⛔ a kis rendű (csupa nulla) és a visszamondott saját kulcsot elutasítja', async () => {
  const a = ujEgyszeriKulcs();
  const dob = (f) => { try { f(); return false; } catch { return true; } };
  return dob(() => munkamenetKulcsai(a, Buffer.alloc(32))) && dob(() => munkamenetKulcsai(a, a.nyilvanos))
    && dob(() => munkamenetKulcsai(a, Buffer.alloc(31, 1))) && kezfogasCsomagbol(Buffer.from([KF_JEL, 1])) === null;
});

proba('⭐ a kézfogás aláírása csak a SAJÁT átiratára és a SAJÁT kulcsával igaz', async () => {
  const t1 = await ujTablaKulcs(), t2 = await ujTablaKulcs();
  const a = ujEgyszeriKulcs(), b = ujEgyszeriKulcs(), c = ujEgyszeriKulcs();
  const atirat = munkamenetKulcsai(a, b.nyilvanos).atirat;
  const mas = munkamenetKulcsai(a, c.nyilvanos).atirat;
  const al = kezfogasAlairasa(t1, atirat);
  return kezfogasAlairasEllenorzese(t1.alairoNyilvanos, atirat, al)
    && !kezfogasAlairasEllenorzese(t1.alairoNyilvanos, mas, al)
    && !kezfogasAlairasEllenorzese(t2.alairoNyilvanos, atirat, al)
    && !kezfogasAlairasEllenorzese(t1.alairoNyilvanos, atirat, 'nem-alairas');
});

// ===================================
// 2. A RÉSEN — viselkedés
// ===================================

async function udpParos() {
  const egyik = createSocket({ type: 'udp4' });
  const masik = createSocket({ type: 'udp4' });
  await new Promise((t) => egyik.bind(0, '127.0.0.1', t));
  await new Promise((t) => masik.bind(0, '127.0.0.1', t));
  const csomagok = [];
  for (const s of [egyik, masik]) {
    const eredeti = s.send.bind(s);
    s.send = (adat, ...tobbi) => {
      csomagok.push(Buffer.isBuffer(adat) ? Buffer.from(adat) : Buffer.from(String(adat)));
      return eredeti(adat, ...tobbi);
    };
  }
  return { egyik, masik, egyikPort: egyik.address().port, masikPort: masik.address().port, csomagok,
    bezar() { egyik.close(); masik.close(); } };
}

async function tarGondolattal(cim) {
  const mappa = await mkdtemp(join(tmpdir(), 'koino-titkos-'));
  const tar = await esemenyTarNyitasa(KOINO, mappa);
  const kulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const szerzo = Buffer.from(await crypto.subtle.exportKey('raw', kulcspar.publicKey)).toString('base64url');
  const k = { koino: KOINO, kulcspar, szerzo, tar, lancTarolo: null };
  if (cim) {
    await koinoLetrehozasa(k, 'Titkos koinó');
    await gondolatLetrehozasa(k, { cim });
  }
  return tar;
}

/** A csere két oldala a saját tábla-kulcsával (és aláírójával). */
const oldal = (tabla, alairoTabla = tabla) => ({
  tablaKulcs: nyilvanosResz(tabla),
  tablaAlairo: (atirat) => kezfogasAlairasa(alairoTabla, atirat)
});

proba('⭐⭐⭐ A LEHALLGATÓ SEMMIT NEM LÁT: se a gondolat címét, se a koinót, se a tábla-kulcsot — és a csere megy', async () => {
  const p = await udpParos();
  const tA = await ujTablaKulcs(), tB = await ujTablaKulcs();
  try {
    const [a, b] = await Promise.all([
      csereUdpResen(p.egyik, '127.0.0.1', p.masikPort, await tarGondolattal(CIM), KOINO, oldal(tA)),
      csereUdpResen(p.masik, '127.0.0.1', p.egyikPort, await tarGondolattal(null), KOINO, oldal(tB))
    ]);
    const dron = Buffer.concat(p.csomagok);
    const latszik = [CIM, KOINO, tA.alairoNyilvanos, tB.alairoNyilvanos, tA.titkositoNyilvanos]
      .filter((x) => dron.includes(Buffer.from(x)));
    const jelek = new Set(p.csomagok.map((c) => c[0]));
    if (latszik.length) console.log('    (a dróton látszik: ' + latszik.join(', ') + ')');
    return latszik.length === 0 && b.uj >= 2
      && [...jelek].every((j) => j === TITKOS_JEL || j === KF_JEL)
      && p.csomagok.filter((c) => c[0] === KF_JEL).length >= 2
      // ⭐ és a tábla-kulcs hitelesítve érkezett mindkét oldalra
      && a.kapottTablaKulcs?.alairo === tB.alairoNyilvanos && b.kapottTablaKulcs?.alairo === tA.alairoNyilvanos;
  } finally { p.bezar(); }
});

proba('⛔⛔ A HAMISAN ALÁÍRT TÁBLA-KULCS NEM SZÁMÍT — aki más nevében jelentkezik, abból nincs kötés', async () => {
  const p = await udpParos();
  const tA = await ujTablaKulcs(), aldozat = await ujTablaKulcs(), tamado = await ujTablaKulcs();
  try {
    // B az ÁLDOZAT tábla-kulcsát mondja be, de a saját kulcsával ír alá (az áldozatéhoz nem fér hozzá).
    const [a] = await Promise.all([
      csereUdpResen(p.egyik, '127.0.0.1', p.masikPort, await tarGondolattal(CIM), KOINO, oldal(tA)),
      csereUdpResen(p.masik, '127.0.0.1', p.egyikPort, await tarGondolattal(null), KOINO, oldal(aldozat, tamado))
    ]);
    return a.kapottTablaKulcs === null;
  } finally { p.bezar(); }
});

proba('⛔⛔ KÉZFOGÁS NÉLKÜL NINCS CSERE — a nyílt párbeszédet folytató társsal megnevezett hibával áll le', async () => {
  const p = await udpParos();
  try {
    // A „régi" társ nyíltan beszél (a `parbeszed` közvetlenül a nyers résen) — nem fog kezet.
    const nyers = udpKapcsolat(p.masik, '127.0.0.1', p.egyikPort);
    nyers.setTimeout(2500, () => nyers.destroy(new Error('csend')));
    const regi = parbeszed(nyers, await tarGondolattal(null), KOINO).catch(() => null);
    let hiba = null;
    try {
      await csereUdpResen(p.egyik, '127.0.0.1', p.masikPort, await tarGondolattal(CIM), KOINO,
        { varakozasiIdo: 1500 });
    } catch (h) { hiba = h.message; }
    await regi;
    const nyiltCim = Buffer.concat(p.csomagok).includes(Buffer.from(CIM));
    return /nem fogott kezet/.test(hiba ?? '') && !nyiltCim;
  } finally { p.bezar(); }
});

export default futtatas;
