// koino/meres/tarsEmlekezetProba.js

// Felelősség: bizonyítani, hogy a TÁRSANKÉNTI EMLÉKEZET (D98/1 — `csere/tarsEmlekezet.js`, a tár állása és a vonal) működik:
// a változott kulcsok a tár vége óta pontosak (a szelet, a bejelentési helyek, a gyökér, a koinó születése, a maradék),
// tömörítés után és túl sok változásnál nincs lista; a U osztályozása és a kívüli lenyomat pontos, a hibás üzenet
// elbukik; és a valódi cserén (UDP-rés, titkosítva) a második csere után a változott szelet AZ ELSŐ SZINT NÉLKÜL átjön
// (mindkét irányból), a hazug (hiányos) lista után is minden megérkezik (a rendes első szint fut), és a maradék (ahol az
// egyik fél nem vesz részt) nem rontja el a következő cserét.
//
// Futtatás: node koino/meres/mind.js tarsemlekezet

import { mkdir, rm, writeFile, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSocket } from 'node:dgram';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';
import { esemenyTarNyitasa, emlekezetTarolo } from '../js/tar/fajlTar.js';
import { esemenyMentese } from '../js/tar/esemenyTar.js';
import { csereUdpResen } from '../js/csere/udpVonal.js';
import { ujTablaKulcs, nyilvanosResz } from '../js/csere/tablaKulcs.js';
import { kezfogasAlairasa } from '../js/csere/titkositas.js';
import { memoriaHalmazTar } from '../js/csere/kozosHalmaz.js';
import { GYOKER_KULCS, KOINO_SZULETES_KULCS } from '../js/csere/szeletEgyeztetes.js';
import {
  valtozottKulcsok, emlekezetFeljegyzes, uOsztalyozasa, kivulLenyomat, uParjai, parokAlakja, valtozottAlakja,
  memoriaEmlekezetTar, VALTOZOTT_KORLAT, EMLEKEZET_TARS_KORLAT
} from '../js/csere/tarsEmlekezet.js';

const { proba, futtatas } = probaGyujtemeny('A társankénti emlékezet (D98/1)');

const KOINO = 'proba';
const mappak = [];
const ujMappa = async () => { const m = await mkdtemp(join(tmpdir(), 'koino-emlekezet-')); mappak.push(m); return m; };

async function tarIrasa(esemenyek) {
  const hely = await ujMappa();
  await mkdir(join(hely, KOINO), { recursive: true });
  await writeFile(join(hely, KOINO, 'esemenyek.jsonl'), esemenyek.map((e) => JSON.stringify(e)).join('\n') + (esemenyek.length ? '\n' : ''));
  return esemenyTarNyitasa(KOINO, hely);
}

// ===================================
// 1. A SZÁMÍTÁS
// ===================================

proba('⭐ a változott kulcsok a feljegyzés óta: a szelet, a bejelentési helye (a gyökér is), a koinó születése és a maradék', async () => {
  const sz = await ujEember(KOINO);
  const szuletes = await sz.tesz('KoinoLetrehozas', { nev: 'P' });
  const g1 = await sz.tesz('GondolatLetrehozas', { cim: 'G1', meret: 10 });
  const tar = await tarIrasa([g1]);
  const f = emlekezetFeljegyzes(tar, [g1.azonosito]);
  const ures = valtozottKulcsok(tar, f, { szuletes: szuletes.azonosito });
  const g2 = await sz.tesz('GondolatLetrehozas', { cim: 'G2', meret: 10, szulo: g1.azonosito });
  const g3 = await sz.tesz('GondolatLetrehozas', { cim: 'G3', meret: 10 });
  for (const e of [g2, g3, szuletes]) await esemenyMentese(tar, e);
  const v = valtozottKulcsok(tar, f, { szuletes: szuletes.azonosito });
  const vart = [g1.azonosito, g2.azonosito, g3.azonosito, GYOKER_KULCS, KOINO_SZULETES_KULCS, szuletes.azonosito].sort();
  // a szűrő a változottakra hat, a maradékra nem
  const szurt = valtozottKulcsok(tar, f, { szuletes: szuletes.azonosito, szuro: (k) => k === g2.azonosito });
  return JSON.stringify(ures) === JSON.stringify([g1.azonosito]) && JSON.stringify(v) === JSON.stringify(vart)
    && JSON.stringify(szurt) === JSON.stringify([g1.azonosito, g2.azonosito, KOINO_SZULETES_KULCS].sort());
});

proba('⛔ nincs lista: feljegyzés nélkül, más generációnál, ha a tár rövidebb, túl sok eseménynél vagy kulcsnál, túl nagy maradéknál', async () => {
  const sz = await ujEember(KOINO);
  const tar = await tarIrasa([]);
  const f = emlekezetFeljegyzes(tar, []);
  const sok = [];
  for (let i = 0; i < VALTOZOTT_KORLAT + 1; i++) sok.push(await sz.tesz('GondolatLetrehozas', { cim: 'S' + i, meret: 10 }));
  for (const e of sok) await esemenyMentese(tar, e);
  const nagyMaradek = emlekezetFeljegyzes(tar, sok.map((e) => e.azonosito));
  return valtozottKulcsok(tar, null) === null
    && valtozottKulcsok(tar, { ...f, g: f.g + 1 }) === null
    && valtozottKulcsok(tar, { ...f, n: tar.allas().n + 1 }) === null
    && valtozottKulcsok(tar, f) === null                                   // 257 kulcs > a korlát
    && valtozottKulcsok(tar, emlekezetFeljegyzes(tar, [])).length === 0
    && nagyMaradek === null;
});

proba('⭐ a U osztályozása (egyező kiesik · mindkettőnél · csak nálam · csak nála) és a kívüli lenyomat (a U-n kívül számít)', async () => {
  const a = 'A'.repeat(43), b = 'B'.repeat(43), c = 'C'.repeat(43), d = 'D'.repeat(43), x = 'x'.repeat(43), y = 'y'.repeat(43);
  const l = uOsztalyozasa([a, b, c, d], [x, x, '', y], [x, y, x, '']);
  const parok1 = [a + ':' + x, b + ':' + x, c + ':' + x];
  const parok2 = [a + ':' + x, b + ':' + y, c + ':' + x];
  const U = new Set([b]);
  return JSON.stringify(l) === JSON.stringify({ mindketten: [b], nalam: [d], nalad: [c] })
    && await kivulLenyomat(parok1, U) === await kivulLenyomat(parok2, U)
    && await kivulLenyomat(parok1, new Set()) !== await kivulLenyomat(parok2, new Set())
    && JSON.stringify(uParjai(parok1, [b, d])) === JSON.stringify([x, '']);
});

proba('⛔ a hibás üzenet elbukik (megnevezett hibával): rossz kulcs, túl hosszú lista, elcsúszott vagy hibás párok', () => {
  const bukik = (f) => { try { f(); return false; } catch (h) { return h.kod === 'HIBAS-EGYEZTETES'; } };
  const k = 'k'.repeat(43);
  return valtozottAlakja(null) === null && JSON.stringify(valtozottAlakja([k, k])) === JSON.stringify([k])
    && bukik(() => valtozottAlakja(['rossz']))
    && bukik(() => valtozottAlakja(new Array(VALTOZOTT_KORLAT + 1).fill(k)))
    && bukik(() => parokAlakja({ kv: 'a'.repeat(22), l: [k] }, 2))
    && bukik(() => parokAlakja({ kv: 'a'.repeat(21), l: [k] }, 1))
    && bukik(() => parokAlakja({ kv: 'a'.repeat(22), l: ['rossz'] }, 1))
    && parokAlakja({ kv: 'a'.repeat(22), l: [k, ''] }, 2).l.length === 2;
});

proba('⭐ a tároló: a memóriás a legrégebbit ejti; a fájlos csak változáskor ír, és a társ alatt olvasható vissza', async () => {
  const m = memoriaEmlekezetTar();
  for (let i = 0; i <= EMLEKEZET_TARS_KORLAT; i++) await m.ir('t' + i, { n: i, g: 0, r: [] });
  const hely = await ujMappa();
  const ft = emlekezetTarolo(KOINO, hely);
  await ft.ir('T', { n: 5, g: 0, r: [] });
  const elso = (await readFile(ft.fajl, 'utf8'));
  await new Promise((t) => setTimeout(t, 5));
  await ft.ir('T', { n: 5, g: 0, r: [] });                   // ugyanaz → nem ír (az időbélyeg nem változik)
  const masodik = (await readFile(ft.fajl, 'utf8'));
  await ft.ir('T', { n: 7, g: 0, r: [] });
  return (await m.olvas('t0')) === null && (await m.olvas('t1')).n === 1 && elso === masodik
    && (await ft.olvas('T')).n === 7 && (await ft.olvas('U')) === null;
});

// ===================================
// 2. A CSERE — a valódi párbeszéd a gépen belüli UDP-résen
// ===================================

async function udpParos() {
  const egyik = createSocket({ type: 'udp4' });
  const masik = createSocket({ type: 'udp4' });
  await new Promise((t) => egyik.bind(0, '127.0.0.1', t));
  await new Promise((t) => masik.bind(0, '127.0.0.1', t));
  return { egyik, masik, egyikPort: egyik.address().port, masikPort: masik.address().port,
    bezar() { egyik.close(); masik.close(); } };
}

/** Két tár, n közös gondolattal; mindkét fél ugyanazt vállalja (közös halmaz), és emlékezettel (ha `emlekezet`). */
async function vilag(n) {
  const szerzo = await ujEember(KOINO);
  const kozosek = [];
  for (let i = 0; i < n; i++) kozosek.push(await szerzo.tesz('GondolatLetrehozas', { cim: 'K' + i, meret: 10 }));
  return {
    szerzo, kozosek, tarA: await tarIrasa(kozosek), tarB: await tarIrasa(kozosek),
    p: new Set(kozosek.map((e) => e.azonosito)),
    tA: await ujTablaKulcs(), tB: await ujTablaKulcs(), hA: memoriaHalmazTar(), hB: memoriaHalmazTar(),
    eA: memoriaEmlekezetTar(), eB: memoriaEmlekezetTar()
  };
}

/** Egy csere; a bájtok üzenet-típusonként (mindkét fél küldése). `pB`: B részvétele (null = a közös halmaz nélkül, minden). */
async function csere(v, { emlekezet = true, eB = v.eB, pA = v.p, pB = v.p, kozos = true } = {}) {
  const meres = new Map();
  const oldal = (t, p, h, e) => ({ tablaKulcs: nyilvanosResz(t), tablaAlairo: (x) => kezfogasAlairasa(t, x),
    reszvesz: p ? (k) => p.has(k) : () => true, uzenetMeres: meres,
    ...(kozos ? { reszvetelHalmaz: async () => p, halmazTar: h } : {}),
    ...(emlekezet ? { emlekezetTar: e } : {}) });
  const pr = await udpParos();
  try {
    const [ra, rb] = await Promise.all([
      csereUdpResen(pr.egyik, '127.0.0.1', pr.masikPort, v.tarA, KOINO, oldal(v.tA, pA, v.hA, v.eA)),
      csereUdpResen(pr.masik, '127.0.0.1', pr.egyikPort, v.tarB, KOINO, oldal(v.tB, pB, v.hB, eB))
    ]);
    return { a: ra, b: rb, meres, elsoSzint: meres.has('SZELETEK'), fUt: meres.has('VALTOZOTTPAROK') };
  } finally { pr.bezar(); }
}

proba('⭐⭐ a második csere után a változott szelet AZ ELSŐ SZINT NÉLKÜL jön át — mindkét irányból egyszerre; emlékezet nélkül (rontás) az első szint fut', async () => {
  const v = await vilag(300);
  await csere(v);
  await csere(v);
  const masik = await ujEember(KOINO);
  const aUj = await masik.tesz('TudatpontRendezes', { entitas: v.kozosek[10].azonosito, pont: 3 });
  const bUj = await masik.tesz('TudatpontRendezes', { entitas: v.kozosek[200].azonosito, pont: 4 });
  await esemenyMentese(v.tarA, aUj);
  await esemenyMentese(v.tarB, bUj);
  const r = await csere(v);
  const megjott = !!(await v.tarA.esemeny(bUj.azonosito)) && !!(await v.tarB.esemeny(aUj.azonosito));
  // rontás: ugyanez emlékezet nélkül (egy friss világban) — ott az első szint fut
  const w = await vilag(300);
  await csere(w, { emlekezet: false });
  await esemenyMentese(w.tarB, await masik.tesz('TudatpontRendezes', { entitas: w.kozosek[7].azonosito, pont: 2 }));
  const nelkul = await csere(w, { emlekezet: false });
  const ujra = await csere(v);
  return megjott && r.fUt && !r.elsoSzint && !r.meres.has('ELTERO') && nelkul.elsoSzint && !nelkul.fUt
    && ujra.a.egyeztetoUzenetek === 0;
});

proba('⛔⛔ a HAZUG (hiányos) lista nem árt: a kívüli lenyomat eltér, a rendes első szint fut, és minden megérkezik', async () => {
  const v = await vilag(200);
  await csere(v);
  await csere(v);
  const masik = await ujEember(KOINO);
  const bUj = await masik.tesz('TudatpontRendezes', { entitas: v.kozosek[50].azonosito, pont: 3 });
  await esemenyMentese(v.tarB, bUj);
  // B „elfelejti”, hogy változott: a feljegyzése a MOSTANI állásra mutat (a listája üres lesz)
  const hazug = { olvas: async () => ({ ...emlekezetFeljegyzes(v.tarB, []) }), ir: async () => {} };
  const r = await csere(v, { eB: hazug });
  return !!(await v.tarA.esemeny(bUj.azonosito)) && r.fUt && r.elsoSzint;
});

proba('⭐ a MARADÉK: ahol az egyik fél nem vesz részt, az a következő cserén is a listán van — a változott szelet ott is az első szint nélkül jön', async () => {
  // a közös halmaz nélkül: A mindenben részt vesz, B egy szeletben nem (az A-nál van) — a nyitó lenyomat sosem egyezik
  const v = await vilag(100);
  const x = await v.szerzo.tesz('GondolatLetrehozas', { cim: 'csak A', meret: 10 });
  await esemenyMentese(v.tarA, x);
  const pB = new Set(v.p);                                   // B: csak a közös 100 (x nem)
  await csere(v, { kozos: false, pA: null, pB });
  await csere(v, { kozos: false, pA: null, pB });
  const masik = await ujEember(KOINO);
  const aUj = await masik.tesz('TudatpontRendezes', { entitas: v.kozosek[9].azonosito, pont: 3 });
  await esemenyMentese(v.tarA, aUj);
  const r = await csere(v, { kozos: false, pA: null, pB });
  return !!(await v.tarB.esemeny(aUj.azonosito)) && !(await v.tarB.esemeny(x.azonosito)) && r.fUt && !r.elsoSzint;
});

export default async function () {
  const eredmeny = await futtatas();
  for (const m of mappak) await rm(m, { recursive: true, force: true });
  return eredmeny;
}
