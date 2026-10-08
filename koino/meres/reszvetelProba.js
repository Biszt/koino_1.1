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
import { rajKorAllapot, valtozottFeljegyzese, rajKorCeljai, VALTOZOTT_KORLAT } from '../js/csere/rajKor.js';

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

// ===================================
// ⭐⭐ D97/2: A RAJ A KÖRBEN
// ===================================

/** Egy raj-jegyzék: szeletenként a megadott tartók (127.0.0.1, port = a tartó száma). */
const jegyzekBol = (szeletek) => Object.entries(szeletek).flatMap(([s, tartok]) =>
  tartok.map((t, i) => ({ entitas: s, hoszt: '127.0.0.1', port: 9000 + t, mikor: Date.now() - i, alairo: String(t).padStart(43, 'a') })));

proba('⭐⭐ D97/2: a VÁLTOZOTT szelet tartói jönnek előbb — sorban, változásonként mindegyik egyszer; körönként legfeljebb R', () => {
  const jegyzek = jegyzekBol({ X: [1, 2, 3, 4, 5], Y: [6, 7] });
  const a = rajKorAllapot();
  valtozottFeljegyzese(a, ['X']);
  const k1 = rajKorCeljai(a, { szeletek: ['X', 'Y'], jegyzek, R: 2 });
  const k2 = rajKorCeljai(a, { szeletek: ['X', 'Y'], jegyzek, R: 2 });
  const k3 = rajKorCeljai(a, { szeletek: ['X', 'Y'], jegyzek, R: 2 });
  const portok = (k) => k.map((c) => c.port - 9000);
  // X öt tartója 2 + 2 + 1 körben; a harmadik körben a maradék hely a forgatásé.
  return k1.length === 2 && k1.every((c) => c.ok === 'valtozott') && k2.every((c) => c.ok === 'valtozott')
    && new Set([...portok(k1), ...portok(k2), portok(k3)[0]]).size === 5 && k3[0].ok === 'valtozott' && k3[1]?.ok === 'forgas'
    && !a.valtozott.has('X');
});

proba('⭐ a FORGATÁS a vállalt szeleteimen körbe jár, szeletenként a tartók sorban — idővel mindenki sorra kerül; önmagamat kihagyja', () => {
  const jegyzek = jegyzekBol({ X: [1, 2], Y: [3, 4], Z: [5, 99] });
  const a = rajKorAllapot();
  const lattam = new Set();
  for (let i = 0; i < 6; i++) {
    for (const c of rajKorCeljai(a, { szeletek: ['X', 'Y', 'Z'], jegyzek, R: 2, kizart: (c) => c.port === 9099 })) lattam.add(c.port - 9000);
  }
  return [1, 2, 3, 4, 5].every((t) => lattam.has(t)) && !lattam.has(99);
});

proba('⭐ a változott szeletek száma korlátos (a legrégebbi esik ki), és az újra változott elölről kezdi a tartókat', () => {
  const a = rajKorAllapot();
  for (let i = 0; i < VALTOZOTT_KORLAT + 10; i++) valtozottFeljegyzese(a, ['s' + i]);
  const jegyzek = jegyzekBol({ X: [1, 2, 3] });
  const b = rajKorAllapot();
  valtozottFeljegyzese(b, ['X']);
  rajKorCeljai(b, { szeletek: [], jegyzek, R: 2 });
  valtozottFeljegyzese(b, ['X']);                      // új változás: elölről
  const k = rajKorCeljai(b, { szeletek: [], jegyzek, R: 1 });
  return a.valtozott.size === VALTOZOTT_KORLAT && !a.valtozott.has('s0') && k[0]?.port === 9001;
});

export default async function () {
  const eredmeny = await futtatas();
  for (const m of mappak) await rm(m, { recursive: true, force: true });
  return eredmeny;
}
