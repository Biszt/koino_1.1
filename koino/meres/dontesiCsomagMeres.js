// koino/meres/dontesiCsomagMeres.js
// Felelősség: A DÖNTÉSI CSOMAG MÉRETE (55. mérés, D85 T3 (a2)) — előbb a mérés, aztán az építés.
//
// Mekkora egy több érintettes javaslat döntési bemenete, ha a G2-nek N tulajdonosa van? A csomag minden
// érintett szeletébe eljut — a csak-G1-tartó is ennyit kap. Valódi műveletekkel (aláírt események, valódi
// lánc-gyökér és bizonyítékok), egy közös táron:
//   · az alapító: két gondolat (G1, G2), pont mindkettőn, és hosszú döntési idő (a szkript szavazatai az
//     ablakba essenek);
//   · N tulajdonos: pont a G2-n (a felük a G1-en is), mindegyik EGYSZER ÁTRENDEZI a pontját (ez a válogatás
//     próbája: a felülírt régi nem kell), minden ötödik küszöböt is javasol;
//   · az alapító egyesítést javasol (G1 + G2), a tulajdonosok fele szavaz.
// ⚠️ A tulajdonosok kiosztása itt kicsi (1–3 entitás), tehát az eseményeik a legkisebbek: egy valódi,
// sok entitáson pontot tartó szavazó eseménye nagyobb (53–54. mérés: pont +~0,7 KB, szavazat +~1,5 KB).
//
// Futtatás: node koino/meres/dontesiCsomagMeres.js [N ...]   (alapból 10 100 1000)
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { koinoEsemenyei } from '../js/tar/esemenyTar.js';
import {
  koinoLetrehozasa, gondolatLetrehozasa, tudatpontRendezese, ertekJavaslat, javaslatLetrehozasa, szavazas
} from '../js/muveletek.js';
import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';
import { javaslatokSzamitasa } from '../js/allapot/javaslatSzamitas.js';
import { dontesBemenete, csomagokra, CSOMAG_BAJT_KORLAT } from '../js/allapot/dontesiCsomag.js';

const kiir = console.log;
console.log = () => {};
console.warn = () => {};
const KOINO = 'meres';
const bajt = (lista) => lista.reduce((s, e) => s + Buffer.byteLength(JSON.stringify(e), 'utf8'), 0);
const KB = (b) => (b / 1024).toFixed(1).replace('.', ',') + ' KB';
const HOSSZU = { elfogadasiKuszob: 51, reszveteliKuszob: 0, minimumDontesiIdo: 86400, maximumDontesiIdo: 604800 };

async function ujKornyezet(tar) {
  const kulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const szerzo = Buffer.from(await crypto.subtle.exportKey('raw', kulcspar.publicKey)).toString('base64url');
  return { koino: KOINO, kulcspar, szerzo, tar };
}

async function meres(n) {
  const mappa = await mkdtemp(join(tmpdir(), 'koino-csomag-'));
  try {
    const tar = await esemenyTarNyitasa(KOINO, mappa);
    const alapito = await ujKornyezet(tar);
    await koinoLetrehozasa(alapito, 'Csomag-mérés');
    const g1 = await gondolatLetrehozasa(alapito, { cim: 'G1' });
    const g2 = await gondolatLetrehozasa(alapito, { cim: 'G2' });
    for (const g of [g1, g2]) {
      await tudatpontRendezese(alapito, g.azonosito, 100);
      await ertekJavaslat(alapito, g.azonosito, HOSSZU);
    }
    const tulajdonosok = [];
    for (let i = 0; i < n; i++) {
      const k = await ujKornyezet(tar);
      await tudatpontRendezese(k, g2.azonosito, 10);
      if (i % 2 === 0) await tudatpontRendezese(k, g1.azonosito, 10);
      await tudatpontRendezese(k, g2.azonosito, 20);            // átrendezés: a régi felülíródik
      if (i % 5 === 0) await ertekJavaslat(k, g2.azonosito, HOSSZU);
      tulajdonosok.push(k);
    }
    const j = await javaslatLetrehozasa(alapito, { erintettek: [
      { entitas: g1.azonosito, muvelet: 'Egyesites', valtozas: { cim: 'EGYESÍTETT' } },
      { entitas: g2.azonosito, muvelet: 'Egyesites', valtozas: null }], pont: 10 });
    for (let i = 0; i < n; i += 2) await szavazas(tulajdonosok[i], j.azonosito, i % 4 === 0 ? 'Tamogat' : 'Ellenez');

    const esemenyek = await koinoEsemenyei(tar, KOINO);
    const allapot = allapotSzamitasa(esemenyek);
    const javaslatok = javaslatokSzamitasa(allapot.szamitok, allapot, Date.now() + 30 * 86400_000);
    const lezaras = javaslatok.get(j.azonosito).lezarasIdeje;
    const bemenet = dontesBemenete(allapot.szamitok, j, lezaras);
    // Válogatás nélkül: a javaslat, a szavazatai és az érintettek MINDEN pont- és küszöb-eseménye.
    const erintettek = new Set([g1.azonosito, g2.azonosito]);
    const minden = allapot.szamitok.filter((e) => e.azonosito === j.azonosito
      || (e.tipus === 'Szavazat' && e.adat.javaslat === j.azonosito)
      || ((e.tipus === 'TudatpontRendezes' || e.tipus === 'ErtekJavaslat') && erintettek.has(e.adat?.entitas)));
    return {
      n, esemeny: esemenyek.length, bemenet: bemenet.length, bajt: bajt(bemenet),
      minden: minden.length, mindenBajt: bajt(minden), csomag: csomagokra(bemenet).length
    };
  } finally {
    await rm(mappa, { recursive: true, force: true });
  }
}

const meretek = process.argv.slice(2).map(Number).filter((x) => Number.isInteger(x) && x > 0);
kiir('\n===== 55. MÉRÉS — A DÖNTÉSI CSOMAG MÉRETE (D85 T3, (a2)) =====\n');
kiir('Egyesítés (G1 + G2); a G2-nek N tulajdonosa van, a felük a G1-en is; mindegyik egyszer átrendezett;');
kiir('minden ötödik küszöböt javasolt; a felük szavazott. Csomag-korlát: ' + KB(CSOMAG_BAJT_KORLAT) + '.\n');
kiir('    N | a koino eseményei | a csomag (válogatva)     | válogatás nélkül          | csomag-esemény | tulajdonosonként');
for (const n of meretek.length ? meretek : [10, 100, 1000]) {
  const t0 = Date.now();
  const m = await meres(n);
  kiir(String(m.n).padStart(5) + ' | ' + String(m.esemeny).padStart(17) + ' | '
    + (m.bemenet + ' esemény, ' + KB(m.bajt)).padEnd(24) + ' | '
    + (m.minden + ' esemény, ' + KB(m.mindenBajt)).padEnd(25) + ' | ' + String(m.csomag).padStart(14) + ' | '
    + KB(m.bajt / m.n) + '   (' + ((Date.now() - t0) / 1000).toFixed(0) + ' s)');
}
