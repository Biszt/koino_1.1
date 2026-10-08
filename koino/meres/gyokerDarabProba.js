// koino/meres/gyokerDarabProba.js

// Felelősség: bizonyítani, hogy a GYÖKÉR DARABJAI (D95/4 — `cimjegyzek.js`, `szeletEgyeztetes.js`, a vonal) működnek: a
// darab kulcsa felismerhető és visszafejthető; a mélység becslése a saját darabból ugyanaz, mint a teljes tudásból; a
// valódi cserén (UDP-rés, titkosítva) a KÖZÖS darab születései átjönnek, a nem közösé nem, és ha csak nem közös darab
// tér el, a csere az első szint nélkül véget ér (a „nincs újdonság” nem drágul); a saját legfelső szintű születésem a
// csak küldő úton eljut a darab tartójához; a zárt koinó nem tagja nem kap a gyökérből (és a csere nem csúszik el).
//
// Futtatás: node koino/meres/mind.js gyokerdarab

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSocket } from 'node:dgram';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { esemenyMentese } from '../js/tar/esemenyTar.js';
import { csereUdpResen } from '../js/csere/udpVonal.js';
import { ujTablaKulcs, nyilvanosResz } from '../js/csere/tablaKulcs.js';
import { kezfogasAlairasa } from '../js/csere/titkositas.js';
import { egyeztetettEsemenyek, ervenyesKulcs, GYOKER_KULCS } from '../js/csere/szeletEgyeztetes.js';
import {
  gyokerDarabKulcsa, gyokerDarabBol, gyokerDarabja, darabbaEsik, gyokerMelysegBecslese, sajatGyokerDarabjai
} from '../js/csere/cimjegyzek.js';
import { sajatKuldo, kuldoFogado } from '../js/allapot/osszegzoTartas.js';

const { proba, futtatas } = probaGyujtemeny('A gyökér darabjai a cserében (D95/4)');

const KOINO = 'proba';
const mappak = [];
const ujMappa = async () => { const m = await mkdtemp(join(tmpdir(), 'koino-gydarab-')); mappak.push(m); return m; };

async function udpParos() {
  const egyik = createSocket({ type: 'udp4' });
  const masik = createSocket({ type: 'udp4' });
  await new Promise((t) => egyik.bind(0, '127.0.0.1', t));
  await new Promise((t) => masik.bind(0, '127.0.0.1', t));
  return { egyik, masik, egyikPort: egyik.address().port, masikPort: masik.address().port,
    bezar() { egyik.close(); masik.close(); } };
}

const alairoja = (t) => nyilvanosResz(t).alairo;
const darabja = (t, m) => sajatGyokerDarabjai(alairoja(t), m, 1)[0];
const esik = (e, m, d) => darabbaEsik(gyokerDarabja(e.azonosito, 16), m, d);

/** Két tábla-kulcs, amelyeknek a darabja az `m` mélységen EGYEZIK (`egyezo`) vagy a sekélyebb szinten is ELTÉR. */
async function kulcsPar(m, egyezo) {
  const a = await ujTablaKulcs();
  for (let i = 0; i < 2000; i++) {
    const b = await ujTablaKulcs();
    const jo = egyezo ? darabja(a, m) === darabja(b, m) : darabja(a, Math.max(m - 1, 0)) !== darabja(b, Math.max(m - 1, 0));
    if (jo) return [a, b];
  }
  throw new Error('nem találtam megfelelő kulcspárt');
}

/** Egy alapító legfelső szintű gondolatai (születések) — a tárakba a hívó teszi. */
async function szuletesek(n) {
  const f = await ujEember(KOINO);
  const letrehozas = await f.tesz('KoinoLetrehozas', { nev: 'Gyökér', leiras: null, alapitok: [], zart: false });
  const g = [];
  for (let i = 0; i < n; i++) g.push(await f.tesz('GondolatLetrehozas', { cim: 'G' + i, meret: 10 }));
  return { f, letrehozas, g };
}

async function tar(esemenyek) {
  const t = await esemenyTarNyitasa(KOINO, await ujMappa());
  for (const e of esemenyek) await esemenyMentese(t, e);
  return t;
}

/** A csere: a valódi szeletekben senki nem vesz részt (a szigorú (b) helyett) — csak a gyökér-darabokban. */
async function csere(tarA, tarB, tA, tB, { mA = null, mB = null, a = {}, b = {} } = {}) {
  const oldal = (t, m) => ({ tablaKulcs: nyilvanosResz(t), tablaAlairo: (atirat) => kezfogasAlairasa(t, atirat),
    reszvesz: () => false, ...(m !== null ? { gyokerMelyseg: m } : {}) });
  const p = await udpParos();
  try {
    const [ra, rb] = await Promise.all([
      csereUdpResen(p.egyik, '127.0.0.1', p.masikPort, tarA, KOINO, { ...oldal(tA, mA), ...a }),
      csereUdpResen(p.masik, '127.0.0.1', p.egyikPort, tarB, KOINO, { ...oldal(tB, mB), ...b })
    ]);
    return { a: ra, b: rb };
  } finally { p.bezar(); }
}

// ===================================
// 1. A KULCS ÉS A BECSLÉS
// ===================================

proba('⭐ a darab kulcsa érvényes vonal-kulcs, visszafejthető, és nem azonos semmilyen azonosítóval vagy a gyökérrel', () => {
  const k = gyokerDarabKulcsa(5, 29);
  const v = gyokerDarabBol(k);
  return k.length === 43 && ervenyesKulcs(k) && v?.melyseg === 5 && v?.darab === 29 && k !== GYOKER_KULCS
    && gyokerDarabBol(GYOKER_KULCS) === null && gyokerDarabBol('A'.repeat(43)) === null
    && gyokerDarabBol(k.slice(0, 41) + 'zz') === null                    // érvénytelen farok
    && gyokerDarabBol('0'.repeat(34) + 'g' + '02' + '0004' + '00') === null; // a darab ≥ 2^mélység
});

proba('⭐⭐ a mélység BECSLÉSE a saját darabból ugyanaz, mint a teljes tudásból (a szigorú (b) alatt senki nem látja az egészet)', () => {
  const xs = [];
  for (let i = 0; i < 5000; i++) xs.push(gyokerDarabja('az' + i, 16));
  const sajat16 = gyokerDarabja('keszulek|x', 16);
  const teljes = gyokerMelysegBecslese(xs, sajat16);
  const resz = [3, 4, 5].map((s) => gyokerMelysegBecslese(xs.filter((x) => darabbaEsik(x, s, sajat16 >> (16 - s))), sajat16));
  return teljes.melyseg === 5 && resz.every((r) => r.melyseg === teljes.melyseg)
    && gyokerMelysegBecslese(xs.slice(0, 10), sajat16).melyseg === 0;
});

proba('⭐ a darab halmaza a gyökérhez bejelentett születések közül a darabba esők — más nem', async () => {
  const { letrehozas, g } = await szuletesek(30);
  const t = await tar([letrehozas, ...g]);
  const kulcs = gyokerDarabKulcsa(2, 1);
  const benne = (await egyeztetettEsemenyek(t, KOINO, kulcs)).map((e) => e.azonosito).sort();
  const vart = g.filter((e) => esik(e, 2, 1)).map((e) => e.azonosito).sort();
  return benne.length === vart.length && benne.every((x, i) => x === vart[i]);
});

// ===================================
// 2. A CSERE
// ===================================

proba('⭐⭐ KÖZÖS darab (a 0. mélység mindenkié): a születések átjönnek — darab nélkül (rontás) semmi', async () => {
  const { letrehozas, g } = await szuletesek(6);
  const [tA, tB] = await kulcsPar(0, true);
  const vele = async (mB) => {
    const tarA = await tar([letrehozas, ...g]);
    const tarB = await tar([letrehozas]);
    await csere(tarA, tarB, tA, tB, { mA: 0, mB });
    let n = 0;
    for (const e of g) if (await tarB.esemeny(e.azonosito)) n++;
    return n;
  };
  return (await vele(0)) === g.length && (await vele(null)) === 0;
});

proba('⭐⭐ a MÉLY közös darab születései átjönnek, a darabon kívüliek nem — a második csere már az első szint nélkül véget ér', async () => {
  const m = 3;
  const { letrehozas, g } = await szuletesek(48);
  const [tA, tB] = await kulcsPar(m, true);
  const tarA = await tar([letrehozas, ...g]);
  const tarB = await tar([letrehozas]);
  const r1 = await csere(tarA, tarB, tA, tB, { mA: m, mB: m });
  // A közös darabok egymásba ágyazottak: a legsekélyebb közös szint (m − 1) a legbővebb.
  const kozosSekely = darabja(tA, m - 1) === darabja(tB, m - 1) ? m - 1 : m;
  const d = darabja(tA, kozosSekely);
  let bentJott = 0, kintJott = 0, bentOsszes = 0;
  for (const e of g) {
    const bent = esik(e, kozosSekely, d);
    if (bent) bentOsszes++;
    if (await tarB.esemeny(e.azonosito)) (bent ? bentJott++ : kintJott++);
  }
  const r2 = await csere(tarA, tarB, tA, tB, { mA: m, mB: m });
  return bentOsszes > 0 && bentJott === bentOsszes && kintJott === 0 && r1.b.uj === bentOsszes
    && r2.b.egyeztetoUzenetek === 0 && r2.b.elteroSzeletek === 0 && r2.b.uj === 0;
});

proba('⭐ NEM közös darab: semmi nem jön át, és a csere az első szint nélkül véget ér (a „nincs újdonság” nem drágul)', async () => {
  const m = 3;
  const { letrehozas, g } = await szuletesek(24);
  const [tA, tB] = await kulcsPar(m, false);
  const tarA = await tar([letrehozas, ...g]);
  const tarB = await tar([letrehozas]);
  const r = await csere(tarA, tarB, tA, tB, { mA: m, mB: m });
  let jott = 0;
  for (const e of g) if (await tarB.esemeny(e.azonosito)) jott++;
  return jott === 0 && r.b.egyeztetoUzenetek === 0 && r.b.elteroSzeletek === 0;
});

proba('⭐⭐ a SAJÁT legfelső szintű születésem a csak küldő úton eljut annak a darabnak a tartójához (ahol én nem vagyok tartó)', async () => {
  const m = 3;
  const [tA, tB] = await kulcsPar(m, false);
  const b = await ujEember(KOINO);
  // B születései közül egy, amelyik A darabjába esik (m-en), B-ébe nem.
  let x = null;
  for (let i = 0; i < 400 && !x; i++) {
    const e = await b.tesz('GondolatLetrehozas', { cim: 'B' + i, meret: 10 });
    if (esik(e, m, darabja(tA, m)) && !esik(e, m, darabja(tB, m))) x = e;
  }
  const tarA = await tar([]);
  const tarB = await tar([x]);
  const darabjai = (t) => new Set([m - 1, m, m + 1].map((mm) => gyokerDarabKulcsa(mm, darabja(t, mm))));
  const kulcsai = (e) => [e.entitas ?? e.azonosito, gyokerDarabKulcsa(m, gyokerDarabja(e.azonosito, m))];
  const kuldo = sajatKuldo({ tar: tarB, koino: KOINO, szerzo: b.szerzo, kulcsai,
    halmazkent: async (k) => (gyokerDarabBol(k) ? darabjai(tB).has(k) : true) });
  const fogado = kuldoFogado({ tar: tarA, fogadhato: async (k) => darabjai(tA).has(k) });
  const r = await csere(tarA, tarB, tA, tB, { mA: m, mB: m,
    a: { kuldoKerem: fogado.kerem }, b: { kuldoSzeletek: (szabad) => kuldo.lista(szabad) } });
  return !!(await tarA.esemeny(x.azonosito)) && r.b.kezbesitve.includes(x.azonosito);
});

proba('⛔ zárt koinóban a NEM TAGNAK nem jár a gyökér — a közös darab kimarad, és a csere nem csúszik el', async () => {
  const { letrehozas, g } = await szuletesek(6);
  const [tA, tB] = await kulcsPar(0, true);
  const tarA = await tar([letrehozas, ...g]);
  const tarB = await tar([letrehozas]);
  const r = await csere(tarA, tarB, tA, tB, { mA: 0, mB: 0,
    a: { zartKapu: async () => ({ szabad: false, kell: false, ok: 'próba', szeletek: [letrehozas.azonosito] }) } });
  let jott = 0;
  for (const e of g) if (await tarB.esemeny(e.azonosito)) jott++;
  return r.a.tarsKorlatozva && jott === 0;
});

export default async function () {
  const eredmeny = await futtatas();
  for (const m of mappak) await rm(m, { recursive: true, force: true });
  return eredmeny;
}
