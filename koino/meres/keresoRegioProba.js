// koino/meres/keresoRegioProba.js

// Felelősség: bizonyítani, hogy a KERESŐ-RÉGIÓ a cserében (D107 L2 (A) — a kereső-réteg ③b) működik: a régió tartói a
// valódi cserén (UDP-rés, titkosítva) a KÖZÖS régiójukat egyeztetik (a NYITÁS `kd` jele, a legsekélyebb közös eltérő régió),
// csak a KÜLÖNBSÉG utazik (`BEJEGYZES`), és a csere után mindketten ugyanazt tartják; ha a régiók egyeznek, a csere a
// nyitásnál véget ér; a nem közös régió nem utazik; ⛔ a fogadó a közös régión kívül eső és a hamis bejegyzést nem veszi fel
// (a kapun); a kereső-tár a tartós tárat nem érinti (L1).
//
// Futtatás: node koino/meres/mind.js keresoregio

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSocket } from 'node:dgram';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { koinoEsemenyei } from '../js/tar/esemenyTar.js';
import { csereUdpResen } from '../js/csere/udpVonal.js';
import { ujTablaKulcs, nyilvanosResz } from '../js/csere/tablaKulcs.js';
import { kezfogasAlairasa } from '../js/csere/titkositas.js';
import { keresoTarNyitasa, bejegyzesBefogadasa, bejegyzesekEpitese, bejegyzesAzonositoja } from '../js/tar/keresoTar.js';
import { sajatKeresoRegioi, bejegyzesHelye, regiobaEsik } from '../js/csere/keresoReteg.js';
import { MEGUJITAS_ELETTARTAM } from '../js/tar/keresoMegujitas.js';

const { proba, futtatas } = probaGyujtemeny('A kereső-régió a cserében (D107 L2 — a kereső-réteg ③b)');

const KOINO = 'proba';
const mappak = [];
const ujMappa = async () => { const m = await mkdtemp(join(tmpdir(), 'koino-keresoregio-')); mappak.push(m); return m; };

async function udpParos() {
  const egyik = createSocket({ type: 'udp4' });
  const masik = createSocket({ type: 'udp4' });
  await new Promise((t) => egyik.bind(0, '127.0.0.1', t));
  await new Promise((t) => masik.bind(0, '127.0.0.1', t));
  return { egyik, masik, egyikPort: egyik.address().port, masikPort: masik.address().port,
    bezar() { egyik.close(); masik.close(); } };
}

const alairoja = (t) => nyilvanosResz(t).alairo;
const regioja = (t, m) => sajatKeresoRegioi(alairoja(t), m, 1)[0];

/** Két tábla-kulcs, amelyeknek a kereső-régiója az `m` mélységen egyezik. */
async function kulcsPar(m) {
  const a = await ujTablaKulcs();
  for (let i = 0; i < 2000; i++) {
    const b = await ujTablaKulcs();
    if (regioja(a, m) === regioja(b, m)) return [a, b];
  }
  throw new Error('nem találtam megfelelő kulcspárt');
}

/** `n` gondolat két-két tulajdonossal — minden bejegyzésük (a cím minden kulcsa alatt). */
async function bejegyzesek(n, elotag) {
  const ki = [];
  for (let i = 0; i < n; i++) {
    const a = await ujEember(KOINO);
    const b = await ujEember(KOINO);
    const szuletes = await a.tesz('GondolatLetrehozas', { cim: elotag + ' park ' + i + ' tér', meret: 10 });
    const pontEsemenyek = [
      await a.tesz('TudatpontRendezes', { entitas: szuletes.azonosito, pont: 20 }),
      await b.tesz('TudatpontRendezes', { entitas: szuletes.azonosito, pont: 10 })
    ];
    ki.push(...bejegyzesekEpitese({ szuletes, pontEsemenyek }));
  }
  return ki;
}

async function keresoTarral(lista, beallitas = {}) {
  const t = await keresoTarNyitasa(KOINO, await ujMappa(), beallitas);
  for (const b of lista) await bejegyzesBefogadasa(t, b);
  return t;
}

const helye = (b) => bejegyzesHelye(b.k, b.g, b.s);

/** A csere: a valódi szeletekben senki nem vesz részt — csak a kereső-régiókban. */
async function csere(tarA, tarB, tA, tB, { kA, kB, mA = 0, mB = 0, a = {}, b = {} } = {}) {
  const oldal = (t, kt, m) => ({ tablaKulcs: nyilvanosResz(t), tablaAlairo: (atirat) => kezfogasAlairasa(t, atirat),
    reszvesz: () => false, ...(kt ? { keresoTar: kt, keresoMelyseg: m } : {}) });
  const p = await udpParos();
  try {
    const [ra, rb] = await Promise.all([
      csereUdpResen(p.egyik, '127.0.0.1', p.masikPort, tarA, KOINO, { ...oldal(tA, kA, mA), ...a }),
      csereUdpResen(p.masik, '127.0.0.1', p.egyikPort, tarB, KOINO, { ...oldal(tB, kB, mB), ...b })
    ]);
    return { a: ra, b: rb };
  } finally { p.bezar(); }
}

// ===================================
// 1. A KÖZÖS RÉGIÓ EGYEZTETÉSE
// ===================================

// Rontás: a NYITÁS `kd` jele nélkül (vagy a régió kulcsa nem kerül az eltérők közé) → semmi nem utazik → bukik.
proba('⭐⭐ a közös régió bejegyzései a cserében mindkét irányban átjönnek — a csere után ugyanazt tartják, a tartós tár érintetlen', async () => {
  const [tA, tB] = [await ujTablaKulcs(), await ujTablaKulcs()];
  const ra = await bejegyzesek(2, 'Alma');
  const rb = await bejegyzesek(2, 'Körte');
  const kA = await keresoTarral(ra);
  const kB = await keresoTarral(rb);
  const tarA = await esemenyTarNyitasa(KOINO, await ujMappa());
  const tarB = await esemenyTarNyitasa(KOINO, await ujMappa());
  const r = await csere(tarA, tarB, tA, tB, { kA, kB });
  const hA = kA.regioHalmaza(0, 0n);
  const hB = kB.regioHalmaza(0, 0n);
  const mind = new Set([...ra, ...rb].map(bejegyzesAzonositoja));
  return hA.length === mind.size && hA.join() === hB.join() && hA.every((x) => mind.has(x))
    && r.a.ujBejegyzesek === rb.length && r.b.ujBejegyzesek === ra.length
    && (await koinoEsemenyei(tarA, KOINO)).length === 0 && (await koinoEsemenyei(tarB, KOINO)).length === 0;
});

// ⭐ A „nincs újdonság” nem drágul. Rontás: az egyező régió is az eltérők közé kerül → egyeztető üzenet megy → bukik.
proba('⭐ ha a közös régió egyezik, a csere a NYITÁSNÁL véget ér (nincs egyeztető üzenet)', async () => {
  const [tA, tB] = [await ujTablaKulcs(), await ujTablaKulcs()];
  const ra = await bejegyzesek(2, 'Szilva');
  const kA = await keresoTarral(ra);
  const kB = await keresoTarral(ra);
  const r = await csere(await esemenyTarNyitasa(KOINO, await ujMappa()), await esemenyTarNyitasa(KOINO, await ujMappa()),
    tA, tB, { kA, kB });
  return r.a.egyeztetoUzenetek === 0 && r.b.egyeztetoUzenetek === 0 && !r.a.ujBejegyzesek && !r.b.ujBejegyzesek;
});

// ⭐ Csak a KÜLÖNBSÉG utazik. Rontás: az átadás a teljes régiót küldi → a már meglévő is utazik → bukik.
proba('⭐ csak a különbség utazik: a közös régió nagy részét mindketten tartják, egy bejegyzés hiányzik — egy megy át', async () => {
  const [tA, tB] = [await ujTablaKulcs(), await ujTablaKulcs()];
  const kozos = await bejegyzesek(3, 'Barack');
  const [plusz] = await bejegyzesek(1, 'Dió');
  const kA = await keresoTarral([...kozos, plusz]);
  const kB = await keresoTarral(kozos);
  const r = await csere(await esemenyTarNyitasa(KOINO, await ujMappa()), await esemenyTarNyitasa(KOINO, await ujMappa()),
    tA, tB, { kA, kB });
  return r.b.ujBejegyzesek === 1 && r.a.kuldottBejegyzesek === 1 && kB.bejegyzes(bejegyzesAzonositoja(plusz)) !== null;
});

// ===================================
// 2. A RÉGIÓ HATÁRA
// ===================================

// ⭐ Csak a közös régió. Rontás: a fogadó szűrője kikapcsolva (vagy a régió helyett minden egyeztetődik) → bukik.
proba('⭐⭐ csak a KÖZÖS régió utazik: a két tartó az 1. mélységen egy darabban — a másik félbe eső bejegyzés nem jön át', async () => {
  const [tA, tB] = await kulcsPar(1);
  const d = regioja(tA, 1);
  const osszes = await bejegyzesek(6, 'Meggy');
  const bent = osszes.filter((b) => regiobaEsik(helye(b), 1, d));
  const kint = osszes.filter((b) => !regiobaEsik(helye(b), 1, d));
  if (!bent.length || !kint.length) throw new Error('a véletlen nem adott mindkét félbe bejegyzést');
  const kA = await keresoTarral([]);
  const kB = await keresoTarral(osszes);
  // mindketten a 2. mélységen: a régióik az 1., 2., 3. szinten — a legsekélyebb közös az 1. szinti darab
  await csere(await esemenyTarNyitasa(KOINO, await ujMappa()), await esemenyTarNyitasa(KOINO, await ujMappa()),
    tA, tB, { kA, kB, mA: 2, mB: 2 });
  return bent.every((b) => kA.bejegyzes(bejegyzesAzonositoja(b)) !== null)
    && kint.every((b) => kA.bejegyzes(bejegyzesAzonositoja(b)) === null);
});

// ⛔ A hazug társ: a régió halmazába a régión kívüli bejegyzést is beírja. Rontás: a fogadó a helyet nem nézi → bukik.
proba('⛔ a fogadó a közös régión KÍVÜL eső bejegyzést akkor sem veszi fel, ha a társ a régió halmazába tette', async () => {
  const [tA, tB] = await kulcsPar(1);
  const d = regioja(tA, 1);
  const osszes = await bejegyzesek(6, 'Eper');
  const kint = osszes.filter((b) => !regiobaEsik(helye(b), 1, d));
  if (!kint.length) throw new Error('a véletlen nem adott a másik félbe bejegyzést');
  const kA = await keresoTarral([]);
  const kB = await keresoTarral(osszes);
  // B hazudik: a régiója halmaza MINDENT tartalmaz
  const hazug = { ...kB, regioHalmaza: () => kB.regioHalmaza(0, 0n), regioBejegyzesei: () => kB.regioBejegyzesei(0, 0n) };
  await csere(await esemenyTarNyitasa(KOINO, await ujMappa()), await esemenyTarNyitasa(KOINO, await ujMappa()),
    tA, tB, { kA, kB: hazug, mA: 2, mB: 2 });
  return kint.every((b) => kA.bejegyzes(bejegyzesAzonositoja(b)) === null);
});

// ⛔ 3. szabály: a hamis bejegyzés a kapun elbukik. Rontás: a vonal a kaput kihagyva veszi fel → bukik.
proba('⛔ a hamis bejegyzés (átírt születés) a cserében is a kapun bukik — a fogadó nem veszi fel', async () => {
  const [tA, tB] = [await ujTablaKulcs(), await ujTablaKulcs()];
  const [jo] = await bejegyzesek(1, 'Ribizli');
  const szuletes = jo.esemenyek[0];
  const hamisSzuletes = { ...szuletes, adat: { ...szuletes.adat, cim: 'Hamis park tér' } };
  const hamis = { ...jo, k: 'e:hamis', esemenyek: [hamisSzuletes, ...jo.esemenyek.slice(1)] };
  const hamisId = bejegyzesAzonositoja(hamis);
  const kA = await keresoTarral([]);
  const kB = await keresoTarral([]);
  // B a hamisat hirdeti és adja (a tárába a kapu nem engedné — a hazug társ megkerüli)
  const hazug = { ...kB, regioHalmaza: () => [hamisId], regioBejegyzesei: () => [hamis], bejegyzes: (id) => (id === hamisId ? hamis : null),
    valtozat: () => 1 };
  const r = await csere(await esemenyTarNyitasa(KOINO, await ujMappa()), await esemenyTarNyitasa(KOINO, await ujMappa()),
    tA, tB, { kA, kB: hazug });
  return kA.darab() === 0 && !r.a.ujBejegyzesek;
});

// ⭐ Akinek nincs kereső-tára (a régi program, vagy a hívó nem adja), annak a cseréje változatlan. Rontás: a jel nélküli
// társnál is régiót egyeztet → a csere elcsúszik (bukik a csere) → bukik.
proba('⭐ ha csak az egyik fél tart régiót, a csere nem csúszik el, és régió sem egyeztetődik', async () => {
  const [tA, tB] = [await ujTablaKulcs(), await ujTablaKulcs()];
  const kA = await keresoTarral(await bejegyzesek(1, 'Szeder'));
  const r = await csere(await esemenyTarNyitasa(KOINO, await ujMappa()), await esemenyTarNyitasa(KOINO, await ujMappa()),
    tA, tB, { kA, kB: null });
  return !r.a.ujBejegyzesek && !r.b.ujBejegyzesek && r.a.egyeztetoUzenetek === 0;
});

// ⛔ D107 L3 (④a): a „temető” a rajból sem jön vissza — ami a fogadónál (az ő órája szerint) lejárt, azt nem veszi fel, akkor
// sem, ha a társnál még él. Rontás: a lejárat-ellenőrzés kihagyva → A felveszi → bukik.
proba('⛔ a LEJÁRT bejegyzés a rajból sem jön vissza — a fogadó a saját órája szerint dönt', async () => {
  const [tA, tB] = [await ujTablaKulcs(), await ujTablaKulcs()];
  const kA = await keresoTarral([], { most: () => Date.now() + MEGUJITAS_ELETTARTAM + 60 * 1000 });
  const kB = await keresoTarral(await bejegyzesek(1, 'Körte'));
  const r = await csere(await esemenyTarNyitasa(KOINO, await ujMappa()), await esemenyTarNyitasa(KOINO, await ujMappa()),
    tA, tB, { kA, kB });
  return kB.darab() > 0 && kA.darab() === 0 && !r.a.ujBejegyzesek;
});

// ⭐⭐ D110: a vonal a társ bemondott mélységeit (a NYITÁS `gyd` és `kd` jelének első tagja) visszaadja — a hívó ebből
// tanul. Rontás: a vonal nem adja vissza → bukik.
proba('⭐⭐ D110: a csere visszaadja a társ bemondott mélységeit (a gyökér-darabé és a kereső-régióé) — a hívó ebből tanul', async () => {
  const [tA, tB] = [await ujTablaKulcs(), await ujTablaKulcs()];
  const kA = await keresoTarral([]);
  const kB = await keresoTarral([]);
  const r = await csere(await esemenyTarNyitasa(KOINO, await ujMappa()), await esemenyTarNyitasa(KOINO, await ujMappa()),
    tA, tB, { kA, kB, mA: 3, mB: 5, a: { gyokerMelyseg: 2 }, b: { gyokerMelyseg: 4 } });
  return r.a.tarsMelysegei?.k === 5 && r.a.tarsMelysegei?.g === 4 && r.b.tarsMelysegei?.k === 3 && r.b.tarsMelysegei?.g === 2;
});

// ⭐ D111 (K11): a tartó-tipp a bejegyzéssel együtt utazik a régió tartói közt — az IDEJÉVEL (a társ nem frissítheti fel).
// Rontás: a `BEJEGYZES` nem viszi a tippet (vagy a fogadó nem jegyzi) → B-nél nincs tipp → bukik.
proba('⭐ D111: a tartó-tipp a bejegyzéssel együtt átjön a régió tartójához — a régi idejével', async () => {
  const [tA, tB] = [await ujTablaKulcs(), await ujTablaKulcs()];
  const ra = await bejegyzesek(1, 'Alma');
  const kA = await keresoTarral(ra);
  const kB = await keresoTarral([]);
  const g = ra[0].g;
  const tipp = { a: 'T'.repeat(43), t: Date.now() - 60000 };
  await kA.tippFeljegyzese(g, [tipp]);
  await csere(await esemenyTarNyitasa(KOINO, await ujMappa()), await esemenyTarNyitasa(KOINO, await ujMappa()), tA, tB, { kA, kB });
  const nalaB = await kB.tippek(g);
  return kB.regioHalmaza(0, 0n).length === ra.length && nalaB.length === 1 && nalaB[0].a === tipp.a && nalaB[0].t === tipp.t;
});

export default async function () {
  const eredmeny = await futtatas();
  for (const m of mappak) await rm(m, { recursive: true, force: true });
  return eredmeny;
}
