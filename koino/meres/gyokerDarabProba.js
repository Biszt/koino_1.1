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
import { createHash, randomBytes } from 'node:crypto';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { esemenyMentese } from '../js/tar/esemenyTar.js';
import { csereUdpResen } from '../js/csere/udpVonal.js';
import { ujTablaKulcs, nyilvanosResz } from '../js/csere/tablaKulcs.js';
import { kezfogasAlairasa } from '../js/csere/titkositas.js';
import { egyeztetettEsemenyek, ervenyesKulcs, GYOKER_KULCS } from '../js/csere/szeletEgyeztetes.js';
import {
  gyokerDarabKulcsa, gyokerDarabBol, gyokerDarabja, darabbaEsik, gyokerMelysegBecslese, sajatGyokerDarabjai,
  gyokerLenyomata, gyokerDarabKulcsai, gyokerMelysege, gyokerJelSzovege, gyokerJelOlvasasa, GYOKER_MAX_MELYSEG
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
const esik = (e, m, d) => darabbaEsik(gyokerLenyomata(e.azonosito), m, d);

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
  return k.length === 43 && ervenyesKulcs(k) && v?.melyseg === 5 && v?.darab === 29n && k !== GYOKER_KULCS
    && gyokerDarabBol(GYOKER_KULCS) === null && gyokerDarabBol('A'.repeat(43)) === null
    && gyokerDarabBol(k.slice(0, 41) + 'zz') === null                    // érvénytelen farok
    && gyokerDarabBol('0'.repeat(34) + 'g' + '02' + '0004' + '00') === null; // a darab ≥ 2^mélység
});

proba('⭐⭐ a mélység BECSLÉSE a saját darabból ugyanaz, mint a teljes tudásból (a szigorú (b) alatt senki nem látja az egészet)', () => {
  const xs = [];
  for (let i = 0; i < 5000; i++) xs.push(gyokerLenyomata('az' + i));
  const sajat = gyokerLenyomata('keszulek|x');
  const teljes = gyokerMelysegBecslese(xs, sajat);
  const resz = [3, 4, 5].map((s) => gyokerMelysegBecslese(
    xs.filter((x) => darabbaEsik(x, s, sajat >> BigInt(GYOKER_MAX_MELYSEG - s))), sajat));
  return teljes.melyseg === 5 && resz.every((r) => r.melyseg === teljes.melyseg)
    && gyokerMelysegBecslese(xs.slice(0, 10), sajat).melyseg === 0;
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
// ⭐⭐ D106: A DARAB-SZÁM A KOINÓ SAJÁT HATÁRÁIG (144 bit)
// ===================================
//
// A „végtelen” mércéje (D106): a darab-szám nem állhat meg a koinó saját határa (~2^128 entitás) előtt. A D106 előtt 16
// bites volt — ~16,8 millió legfelső szintű gondolat fölött a darab a koinóval nőtt volna. Rontás: `GYOKER_MAX_MELYSEG`
// = 16 → a kulcs 16 fölött nem készül, a becslés 16-nál megáll, a nyitás jele 16 fölött nem olvasható.

proba('⭐⭐ D106: a darab kulcsa 144 mélységig oda-vissza, egy darabnak egy kulcsa — és 16 mélységig bájtra a régi alak', () => {
  const ki = {};
  ki.odaVissza = [0, 1, 5, 16, 17, 20, 40, 100, 143, 144].every((m) => {
    const d = gyokerDarabja('x' + m, m);
    const k = gyokerDarabKulcsa(m, d);
    const v = gyokerDarabBol(k);
    return k.length === 43 && ervenyesKulcs(k) && v?.melyseg === m && v?.darab === d;
  });
  // A D106 előtti alak (16 bit, négy hexa jegy, 34 nulla): a mai kulcsok nem változnak.
  const regiDarab = (az, m) => (m === 0 ? 0
    : createHash('sha256').update('koino-gyoker-darab-1').update(az).digest().readUInt16BE(0) >> (16 - m));
  const regiKulcs = (m, d) => '0'.repeat(34) + 'g' + m.toString(16).padStart(2, '0') + d.toString(16).padStart(4, '0') + '00';
  ki.regiAlak = [0, 3, 9, 16].every((m) => gyokerDarabKulcsa(m, gyokerDarabja('r' + m, m)) === regiKulcs(m, regiDarab('r' + m, m)));
  // Egy darabnak egyetlen kulcsa: a jegyek száma a mélységé (a 20-as mélységen öt — négy jeggyel érvénytelen).
  ki.egyKulcs = gyokerDarabBol('0'.repeat(34) + 'g' + '14' + 'abcd' + '00') === null
    && gyokerDarabBol('0'.repeat(33) + 'g' + '14' + '0abcd' + '00')?.darab === 0xabcdn;
  let dobott = 0;
  try { gyokerDarabKulcsa(GYOKER_MAX_MELYSEG + 1, 0); } catch { dobott++; }
  try { gyokerDarabja('x', GYOKER_MAX_MELYSEG + 1); } catch { dobott++; }
  ki.hatar = dobott === 2 && gyokerDarabBol('00g' + '91' + '0'.repeat(36) + '00') === null;   // 145 > 144
  if (!Object.values(ki).every(Boolean)) console.log('    (D106 kulcs — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + ')');
  return Object.values(ki).every(Boolean);
});

proba('⭐⭐ D106: a darabok minden mélységen egymásba ágyazottak (a mélyebb a sekélyebb fele) — 144 bitig', () => {
  for (let i = 0; i < 20; i++) {
    const az = 'beagyazott' + i;
    const h = gyokerLenyomata(az);
    for (let m = 1; m <= GYOKER_MAX_MELYSEG; m++) {
      const d = gyokerDarabja(az, m);
      if ((d >> 1n) !== gyokerDarabja(az, m - 1) || !darabbaEsik(h, m, d) || darabbaEsik(h, m, d ^ 1n)) return false;
    }
  }
  return true;
});

proba('⭐⭐ D106: a mélység 16 fölé is megy — a sűrű saját darab 21-es mélységet ad (16 bittel 16 lett volna), és 16-on három szint', () => {
  const sajat = gyokerLenyomata('keszulek|melyseg');
  // 300 születés a készülék 20-as mélységű darabjában (a lenyomat első 20 bitje a sajátja, a többi véletlen).
  const also = BigInt(GYOKER_MAX_MELYSEG - 20);
  const xs = [];
  for (let i = 0; i < 300; i++) {
    const veletlen = BigInt('0x' + randomBytes(GYOKER_MAX_MELYSEG / 8).toString('hex')) & ((1n << also) - 1n);
    xs.push(((sajat >> also) << also) | veletlen);
  }
  const ki = {
    becsles: gyokerMelysegBecslese(xs, sajat).melyseg === 21,
    sapka: gyokerMelysege(1e60) === GYOKER_MAX_MELYSEG && gyokerMelysege(1e12) === 32,
    szintek: gyokerDarabKulcsai('a1', 16).length === 3 && gyokerDarabKulcsai('a1', GYOKER_MAX_MELYSEG).length === 2
      && gyokerDarabKulcsai('a1', 0).length === 2
  };
  if (!Object.values(ki).every(Boolean)) console.log('    (D106 mélység — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + ')');
  return Object.values(ki).every(Boolean);
});

proba('⭐ D106: a nyitás gyökér-jele (`gyd`) 144 mélységig olvasható, fölötte és hibás alakban nem', () => {
  const j = gyokerJelOlvasasa(gyokerJelSzovege(100, ['abc', null, 'X_-9']));
  return j?.melyseg === 100 && j.lenyomatok.length === 3 && j.lenyomatok[0] === 'abc' && j.lenyomatok[1] === null
    && j.lenyomatok[2] === 'X_-9' && gyokerJelOlvasasa('144:a')?.melyseg === 144 && gyokerJelOlvasasa('145:a') === null
    && gyokerJelOlvasasa('16:a:b:c')?.melyseg === 16 && gyokerJelOlvasasa('1000:a') === null
    && gyokerJelOlvasasa('5') === null && gyokerJelOlvasasa(null) === null && gyokerJelOlvasasa('5:a:b:c:d') === null;
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
