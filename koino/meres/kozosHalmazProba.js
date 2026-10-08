// koino/meres/kozosHalmazProba.js

// Felelősség: bizonyítani, hogy a KÖZÖS HALMAZ (D97/1 — `csere/kozosHalmaz.js` és a vonal) működik: az ujjlenyomatok,
// a változatok, a napló és a változás pontosan számol (a hamis vagy elcsúszott változást elveti); és a valódi cserén
// (UDP-rés, titkosítva) — ha a két fél mást vállal — az első találkozás után a „nincs újdonság” csere a közös halmazon
// olcsó marad (a 68. mérés több tíz KB-ja helyett), a közös szelet változása átjön, a nem közösé nem, a halmaz
// bővülése csak a változással utazik, a „minden” részvételű fél a társ halmazának szeleteit megkapja, és a zárt koinó
// kapuja mellett a régi menet fut.
//
// Futtatás: node koino/meres/mind.js kozoshalmaz

import { mkdir, rm, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSocket } from 'node:dgram';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';
import { esemenyTarNyitasa, halmazTarolo } from '../js/tar/fajlTar.js';
import { readFile } from 'node:fs/promises';
import { esemenyMentese } from '../js/tar/esemenyTar.js';
import { csereUdpResen } from '../js/csere/udpVonal.js';
import { ujTablaKulcs, nyilvanosResz } from '../js/csere/tablaKulcs.js';
import { kezfogasAlairasa } from '../js/csere/titkositas.js';
import {
  ujjlenyomat, valtozat, naploFrissitese, valtozasBol, halmazUzenet, halmazAlkalmazasa, kozosSzuro, memoriaHalmazTar,
  NAPLO_KORLAT
} from '../js/csere/kozosHalmaz.js';

const { proba, futtatas } = probaGyujtemeny('A közös halmaz (D97/1)');

const KOINO = 'proba';
const mappak = [];
const ujMappa = async () => { const m = await mkdtemp(join(tmpdir(), 'koino-kozos-')); mappak.push(m); return m; };

async function udpParos() {
  const egyik = createSocket({ type: 'udp4' });
  const masik = createSocket({ type: 'udp4' });
  await new Promise((t) => egyik.bind(0, '127.0.0.1', t));
  await new Promise((t) => masik.bind(0, '127.0.0.1', t));
  return { egyik, masik, egyikPort: egyik.address().port, masikPort: masik.address().port,
    bezar() { egyik.close(); masik.close(); } };
}

// ===================================
// 1. A SZÁMÍTÁS
// ===================================

proba('⭐ az ujjlenyomat 8 jel és determinisztikus; a változat a rendezett listáé', () => {
  const u = ujjlenyomat('A'.repeat(43));
  return u.length === 8 && u === ujjlenyomat('A'.repeat(43)) && u !== ujjlenyomat('B'.repeat(43))
    && valtozat(['a', 'b']) === valtozat(['a', 'b']) && valtozat(['a', 'b']) !== valtozat(['b', 'a']);
});

proba('⭐⭐ a napló a változást bármelyik ismert régi változathoz kiszámolja — és a társ alkalmazva ugyanoda jut', () => {
  const k = (i) => String(i).padStart(43, 'k');
  let n = naploFrissitese(null, [k(1), k(2), k(3)]).naplo;
  const v1 = n.v;
  n = naploFrissitese(n, [k(1), k(2), k(3), k(4)]).naplo;
  n = naploFrissitese(n, [k(2), k(3), k(4), k(5)]).naplo;
  const tars = halmazAlkalmazasa(null, halmazUzenet(naploFrissitese(null, [k(1), k(2), k(3)]).naplo, null));
  const d = valtozasBol(n, v1);
  const uj = halmazAlkalmazasa(tars, halmazUzenet(n, v1));
  return tars?.v === v1 && d.plusz.length === 2 && d.minusz.length === 1 && uj?.v === n.v
    && uj.ujjak.join() === n.ujjak.join() && naploFrissitese(n, [k(5), k(4), k(3), k(2)]).valtozott === false;
});

proba('⛔ a változás rossz alapra, a hamisított lista és a régen elfelejtett változat — elvetve, illetve teljes lista', () => {
  const k = (i) => String(i).padStart(43, 'k');
  let n = naploFrissitese(null, [k(1)]).naplo;
  const v0 = n.v;
  for (let i = 2; i < NAPLO_KORLAT + 5; i++) n = naploFrissitese(n, [k(1), k(i)]).naplo;
  const masik = naploFrissitese(null, [k(9)]).naplo;
  const rosszAlap = halmazAlkalmazasa(masik, { v: n.v, alap: masik.v, plusz: [ujjlenyomat(k(3))], minusz: [] });
  const hamis = halmazAlkalmazasa(null, { v: n.v, teljes: [ujjlenyomat(k(77))] });
  return rosszAlap === null && hamis === null && valtozasBol(n, v0) === null && halmazUzenet(n, v0).teljes?.length === 2;
});

proba('⭐ a közös szűrő: két halmaz metszete; a „minden” fél a társ halmaza; két „minden” → nincs szűrő', () => {
  const a = new Set(['x'.repeat(43), 'y'.repeat(43)]);
  const b = ['y'.repeat(43), 'z'.repeat(43)].map(ujjlenyomat);
  const s = kozosSzuro(a, b);
  const w = kozosSzuro(null, b);
  return s('y'.repeat(43)) && !s('x'.repeat(43)) && !s('z'.repeat(43)) && w('z'.repeat(43)) && !w('x'.repeat(43))
    && kozosSzuro(null, null) === null;
});

// ===================================
// 2. A CSERE
// ===================================

/** Két tár: n szelet mindkettőnél, ebből `kozos` közös (egyező), a többi csak az egyiké. */
async function vilag(n, kozos) {
  const szerzo = await ujEember(KOINO);
  const uj = (c) => szerzo.tesz('GondolatLetrehozas', { cim: c, meret: 10 });
  const kozosek = [], csakA = [], csakB = [];
  for (let i = 0; i < kozos; i++) kozosek.push(await uj('K' + i));
  for (let i = 0; i < n - kozos; i++) { csakA.push(await uj('A' + i)); csakB.push(await uj('B' + i)); }
  const tarIrasa = async (esemenyek) => {
    const hely = await ujMappa();
    await mkdir(join(hely, KOINO), { recursive: true });
    await writeFile(join(hely, KOINO, 'esemenyek.jsonl'), esemenyek.map((e) => JSON.stringify(e)).join('\n') + '\n');
    return esemenyTarNyitasa(KOINO, hely);
  };
  return {
    szerzo, kozosek, csakA, csakB,
    tarA: await tarIrasa([...kozosek, ...csakA]), tarB: await tarIrasa([...kozosek, ...csakB]),
    pA: new Set([...kozosek, ...csakA].map((e) => e.azonosito)), pB: new Set([...kozosek, ...csakB].map((e) => e.azonosito)),
    tA: await ujTablaKulcs(), tB: await ujTablaKulcs(), hA: memoriaHalmazTar(), hB: memoriaHalmazTar()
  };
}

/** Egy csere a két fél között a saját részvételi halmazával (`null` = „minden”), és a halmaz-tárral (ha `kozos`). */
async function csere(v, { pA = v.pA, pB = v.pB, kozos = true, a = {} } = {}) {
  const oldal = (t, p, h) => ({ tablaKulcs: nyilvanosResz(t), tablaAlairo: (x) => kezfogasAlairasa(t, x),
    reszvesz: p ? (k) => p.has(k) : () => true,
    ...(kozos ? { reszvetelHalmaz: async () => p, halmazTar: h } : {}) });
  const pr = await udpParos();
  try {
    const [ra, rb] = await Promise.all([
      csereUdpResen(pr.egyik, '127.0.0.1', pr.masikPort, v.tarA, KOINO, { ...oldal(v.tA, pA, v.hA), ...a }),
      csereUdpResen(pr.masik, '127.0.0.1', pr.egyikPort, v.tarB, KOINO, oldal(v.tB, pB, v.hB))
    ]);
    return { a: ra, b: rb, bajt: ra.bajtKuldott + ra.bajtKapott, uzenetek: ra.egyeztetoUzenetek + rb.egyeztetoUzenetek };
  } finally { pr.bezar(); }
}

proba('⭐⭐ KÜLÖNBÖZŐ vállalás: az első találkozás után a „nincs újdonság” csere a közös halmazon olcsó — halmaz nélkül (rontás) drága', async () => {
  const v = await vilag(200, 100);
  const elso = await csere(v);
  const masodik = await csere(v);
  const halmazNelkul = await csere(v, { kozos: false });
  return masodik.uzenetek === 0 && masodik.bajt < 1500 && halmazNelkul.bajt > 20 * 1024
    && elso.bajt < halmazNelkul.bajt && v.hA.tarsak.size === 1 && v.hB.tarsak.size === 1;
});

proba('⭐⭐ a KÖZÖS szelet változása átjön, a csak az egyiknél lévőé nem (abban a másik nem vesz részt)', async () => {
  const v = await vilag(40, 20);
  await csere(v);
  const kozosValtozas = await v.szerzo.tesz('TudatpontRendezes', { entitas: v.kozosek[3].azonosito, pont: 5, szerep: 'aktiv' });
  const sajatValtozas = await v.szerzo.tesz('TudatpontRendezes', { entitas: v.csakA[2].azonosito, pont: 5, szerep: 'aktiv' });
  await esemenyMentese(v.tarA, kozosValtozas);
  await esemenyMentese(v.tarA, sajatValtozas);
  const r = await csere(v);
  return !!(await v.tarB.esemeny(kozosValtozas.azonosito)) && !(await v.tarB.esemeny(sajatValtozas.azonosito)) && r.b.uj === 1;
});

proba('⭐ a halmaz BŐVÜLÉSE csak a változással utazik (a teljes lista nélkül) — és az új közös szelet egyeztetődik', async () => {
  const v = await vilag(200, 100);
  await csere(v);
  // B is vállal egy szeletet, ami eddig csak A-nál volt (B-nél még nincs meg): a változás megy.
  const x = v.csakA[0], y = v.csakA[1];
  const pB1 = new Set([...v.pB, x.azonosito]);
  const valtozassal = await csere(v, { pB: pB1 });
  // Ugyanez még egyszer — de A elfelejtette B halmazát: a teljes lista megy (összevetésül).
  const pB2 = new Set([...pB1, y.azonosito]);
  v.hA.tarsak.clear();
  const teljessel = await csere(v, { pB: pB2 });
  const ujra = await csere(v, { pB: pB2 });
  return !!(await v.tarB.esemeny(x.azonosito)) && !!(await v.tarB.esemeny(y.azonosito))
    && teljessel.bajt > valtozassal.bajt + 1500 && ujra.uzenetek === 0 && ujra.bajt < 1500;
});

proba('⭐ a „MINDEN” részvételű fél a társ halmazának szeleteit megkapja — a többi szeletét a társ nem', async () => {
  const v = await vilag(30, 10);
  await csere(v, { pA: null });
  let aKapott = 0, bKapott = 0;
  for (const e of v.csakB) if (await v.tarA.esemeny(e.azonosito)) aKapott++;
  for (const e of v.csakA) if (await v.tarB.esemeny(e.azonosito)) bKapott++;
  const ujra = await csere(v, { pA: null });
  return aKapott === v.csakB.length && bKapott === 0 && ujra.uzenetek === 0;
});

proba('⭐ a FÁJL-alapú halmaz-tár (a koino.js-é) ugyanígy: a második csere olcsó, és a társ halmaza a lemezen van', async () => {
  const v = await vilag(100, 50);
  const mA = await ujMappa(), mB = await ujMappa();
  v.hA = halmazTarolo(KOINO, mA, naploFrissitese);
  v.hB = halmazTarolo(KOINO, mB, naploFrissitese);
  await csere(v);
  const masodik = await csere(v);
  const lemez = JSON.parse(await readFile(join(mA, KOINO, 'halmazok.json'), 'utf8'));
  return masodik.uzenetek === 0 && masodik.bajt < 1500 && Object.keys(lemez.tarsak).length === 1 && lemez.naplo?.v;
});

proba('⛔ zárt koinó (a kapu korlátoz): a régi menet fut, a nem tag NEM tudja meg a tag halmazát, és a csere nem csúszik el', async () => {
  const v = await vilag(20, 10);
  const r = await csere(v, { a: { zartKapu: async () => ({ szabad: false, kell: false, ok: 'próba', szeletek: [] }) } });
  return r.a.tarsKorlatozva === true && r.b.uj === 0 && v.hB.tarsak.size === 0 && v.hA.tarsak.size === 0;
});

export default async function () {
  const eredmeny = await futtatas();
  for (const m of mappak) await rm(m, { recursive: true, force: true });
  return eredmeny;
}
