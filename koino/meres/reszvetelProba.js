// koino/meres/reszvetelProba.js

// Felelősség: a BEKAPCSOLÁS próbái (D96, D97 — a részvétel a vállalásból): a koinó születése mint esemény mindenkihez
// eljut (a szelete — az alapító állításaival — nem); a zárt koinó korlátozott útja a megengedett szeleteket a saját
// vállalástól függetlenül szolgálja ki (a meghívás így jut el a még nem taghoz); és aki meghívást kapott, de a saját
// tagsága nem bizonyítható, magát is megkérdezi (a meghívója összerakja a láncát).
//
// Futtatás: node koino/meres/mind.js reszvetel

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSocket } from 'node:dgram';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';
import { esemenyTarNyitasa, tagsagFuggoTarolo } from '../js/tar/fajlTar.js';
import { esemenyMentese } from '../js/tar/esemenyTar.js';
import { csereUdpResen } from '../js/csere/udpVonal.js';
import { beolvasztas } from '../js/csere/csere.js';
import { tagsagKerdo, tagsagiKiserok } from '../js/allapot/tagsagKisero.js';

const { proba, futtatas } = probaGyujtemeny('A bekapcsolás: a részvétel a vállalásból (D96, D97)');

const KOINO = 'proba';
const mappak = [];
const ujMappa = async () => { const m = await mkdtemp(join(tmpdir(), 'koino-reszvetel-')); mappak.push(m); return m; };

async function udpParos() {
  const egyik = createSocket({ type: 'udp4' });
  const masik = createSocket({ type: 'udp4' });
  await new Promise((t) => egyik.bind(0, '127.0.0.1', t));
  await new Promise((t) => masik.bind(0, '127.0.0.1', t));
  return { egyik, masik, egyikPort: egyik.address().port, masikPort: masik.address().port,
    bezar() { egyik.close(); masik.close(); } };
}

async function tar(esemenyek) {
  const t = await esemenyTarNyitasa(KOINO, await ujMappa());
  for (const e of esemenyek) await esemenyMentese(t, e);
  return t;
}

/** A világ: F alapító (meghívja A-t és C-t), A tag; B belépett, A meghívta (a meghívás B szeletében). */
async function vilag() {
  const f = await ujEember(KOINO), a = await ujEember(KOINO), b = await ujEember(KOINO), c = await ujEember(KOINO);
  const szuletes = await f.tesz('KoinoLetrehozas', { nev: 'Részvétel', leiras: null, alapitok: [], zart: true });
  const belepesA = await a.tesz('Belepes', {});
  const meghivasA = await f.tesz('Meghivas', { kit: a.szerzo, sajatBelepes: szuletes.azonosito }, undefined, { entitas: belepesA.azonosito });
  const belepesC = await c.tesz('Belepes', {});
  const meghivasC = await f.tesz('Meghivas', { kit: c.szerzo, sajatBelepes: szuletes.azonosito }, undefined, { entitas: belepesC.azonosito });
  const belepesB = await b.tesz('Belepes', {});
  const meghivasB = await a.tesz('Meghivas', { kit: b.szerzo, sajatBelepes: belepesA.azonosito }, undefined, { entitas: belepesB.azonosito });
  return { f, a, b, c, szuletes, belepesA, meghivasA, belepesC, meghivasC, belepesB, meghivasB };
}

async function csere(tarA, tarB, bA, bB) {
  const p = await udpParos();
  try {
    const [ra, rb] = await Promise.all([
      csereUdpResen(p.egyik, '127.0.0.1', p.masikPort, tarA, KOINO, bA),
      csereUdpResen(p.masik, '127.0.0.1', p.egyikPort, tarB, KOINO, bB)
    ]);
    return { a: ra, b: rb };
  } finally { p.bezar(); }
}

// ===================================
// ⭐ D96: A KOINÓ SZÜLETÉSE MINT ESEMÉNY
// ===================================

proba('⭐⭐ D96: a koinó születése ESEMÉNYKÉNT eljut ahhoz, akinél hiányzik — a szelete (az alapító állításai) nem', async () => {
  const v = await vilag();
  // A mindent tud (az alapító meghívásai a születés szeletébe is bejelentődnek); B semmit, csak a saját belépését.
  const tarA = await tar([v.szuletes, v.belepesA, v.meghivasA, v.belepesC, v.meghivasC]);
  const tarB = await tar([v.belepesB]);
  // A szigorú (b): egyik fél sem vesz részt a születés szeletében (nem alapító), csak a sajátjában.
  const r = await csere(tarA, tarB, { reszvesz: (k) => k === v.belepesA.azonosito, koinoSzuletes: v.szuletes },
    { reszvesz: (k) => k === v.belepesB.azonosito });
  const vanSzuletes = !!(await tarB.esemeny(v.szuletes.azonosito));
  const vanAllitas = !!(await tarB.esemeny(v.meghivasC.azonosito));
  // Rontás: a születés átadója nélkül (a hívó nem adja meg) semmi nem jön.
  const tarB2 = await tar([v.belepesB]);
  await csere(tarA, tarB2, { reszvesz: (k) => k === v.belepesA.azonosito }, { reszvesz: (k) => k === v.belepesB.azonosito });
  return vanSzuletes && !vanAllitas && r.b.uj === 1 && !(await tarB2.esemeny(v.szuletes.azonosito));
});

proba('⛔ a koinó születésének kulcsán MÁS esemény (vagy más koinó létrehozása) nem jön át', async () => {
  const v = await vilag();
  const masik = await ujEember('masik');
  const idegen = await masik.tesz('KoinoLetrehozas', { nev: 'Idegen', leiras: null, alapitok: [], zart: true });
  const tarA = await tar([v.szuletes]);
  const tarB = await tar([]);
  // A hamis „születést” ad: egy másik koinóét (a vonal a saját koinója szerint szűr).
  await csere(tarA, tarB, { reszvesz: () => false, koinoSzuletes: idegen }, { reszvesz: () => false });
  return !(await tarB.esemeny(idegen.azonosito)) && !(await tarB.esemeny(v.szuletes.azonosito));
});

// ===================================
// ⭐ A ZÁRT KOINÓ KORLÁTOZOTT ÚTJA
// ===================================

proba('⭐⭐ zárt koinóban a tag a NEM TAG azonosság-szeletét a saját vállalásától függetlenül egyezteti — a meghívás eljut', async () => {
  const v = await vilag();
  const tarA = await tar([v.szuletes, v.belepesA, v.meghivasA, v.belepesB, v.meghivasB]);
  const tarB = await tar([v.belepesB]);
  // A csak a saját azonosság-szeletét vállalja (B-ét nem), és B-t korlátozza (még nem ismeri tagként).
  const r = await csere(tarA, tarB, { reszvesz: (k) => k === v.belepesA.azonosito, koinoSzuletes: v.szuletes,
    zartKapu: async () => ({ szabad: false, kell: false, ok: 'próba',
      szeletek: [v.szuletes.azonosito, v.belepesB.azonosito, v.belepesA.azonosito] }) },
  { reszvesz: (k) => k === v.belepesB.azonosito });
  return r.a.tarsKorlatozva && !!(await tarB.esemeny(v.meghivasB.azonosito)) && !!(await tarB.esemeny(v.szuletes.azonosito));
});

// ===================================
// ⭐ A SAJÁT TAGSÁG A KÍSÉRŐKBŐL
// ===================================

proba('⭐ aki meghívást kapott, de a saját tagsága nem bizonyítható, MAGÁT is kérdezi — a meghívója összerakja a láncát', async () => {
  const v = await vilag();
  const tarA = await tar([v.szuletes, v.belepesA, v.meghivasA, v.belepesB, v.meghivasB]);
  const tarB = await tar([v.szuletes, v.belepesB, v.meghivasB]);     // A belépése és meghívása nincs meg
  const mappaB = await ujMappa();
  const kerdo = tagsagKerdo({ tar: tarB, koino: KOINO, tarolo: tagsagFuggoTarolo(KOINO, mappaB),
    koinoSzuletes: async () => v.szuletes, mentes: (l) => beolvasztas(tarB, l, KOINO), sajatSzerzo: v.b.szerzo });
  const kert = await kerdo.kerdesek([]);
  const valasz = await tagsagiKiserok(tarA, KOINO, kert, { koinoSzuletes: v.szuletes });
  const r = await kerdo.fogadas(valasz, kert);
  // Rontás: a saját szerző nélkül nem kérdez semmit.
  const nelkule = await tagsagKerdo({ tar: await tar([v.szuletes, v.belepesB, v.meghivasB]), koino: KOINO,
    tarolo: tagsagFuggoTarolo(KOINO, await ujMappa()), koinoSzuletes: async () => v.szuletes,
    mentes: async () => ({ uj: 0, ujAzonositok: [] }) }).kerdesek([]);
  return kert.includes(v.b.szerzo) && r.megtudott === 1 && nelkule.length === 0;
});

export default async function () {
  const eredmeny = await futtatas();
  for (const m of mappak) await rm(m, { recursive: true, force: true });
  return eredmeny;
}
