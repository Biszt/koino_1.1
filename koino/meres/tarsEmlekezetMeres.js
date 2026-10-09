// koino/meres/tarsEmlekezetMeres.js

// Felelősség: A 70. MÉRÉS — mennyit ér a TÁRSANKÉNTI EMLÉKEZET (az F pillér, a ⑧ átvizsgálása, 2026-10-09)?
//
// A kérdés: a szigorú (b) alatt, a közös halmaz (D97/1) után a „nincs újdonság” csere ~1,3 KB, és egyetlen egyeztető üzenet
// nélkül zárul (68.). De mi a helyzet, ha a közös szeletek közül NÉHÁNY megváltozott? Akkor a nyitó lenyomat eltér, és a
// párbeszéd a két szintű tartomány-egyeztetéssel keresi meg, melyik szelet tér el (az első szint a szelet-jelek fölött,
// log16 lépésben), aztán a szeleten belül. Az F terve: ha társanként megjegyezzük, mit mondtunk utoljára, a kör csak a
// változottakról szólhatna (az első szint elmarad). Ez a mérés azt adja meg, MENNYI az első szint ára — vagyis a felső
// határát annak, amit az F megspórolhat —, a közös szeletek számától és a változások számától függően.
//
// Két tár, n közös szelet (mindkettő mindet vállalja, a közös halmaz már ismert); a B tárba v közös szeletbe egy-egy új
// esemény kerül. A valódi párbeszéd (`csereUdpResen`) a gépen belüli UDP-résen, titkosítva.
//
// ⚠️ EZ NEM ÖNPRÓBA (számokat ad), és nem kerül a `mind.js`-be.
//   node koino/meres/tarsEmlekezetMeres.js [n1 n2 ...]     → alapból 50 200 1000 5000

import { kiir } from './naplo.js';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSocket } from 'node:dgram';

import { ujEember } from './probaFuttato.js';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { csereUdpResen } from '../js/csere/udpVonal.js';
import { ujTablaKulcs, nyilvanosResz } from '../js/csere/tablaKulcs.js';
import { kezfogasAlairasa } from '../js/csere/titkositas.js';
import { memoriaHalmazTar } from '../js/csere/kozosHalmaz.js';

const KOINO = 'tarsemlekezetmeres';
const VALTOZASOK = [0, 1, 5, 20];

async function udpParos() {
  const egyik = createSocket({ type: 'udp4' });
  const masik = createSocket({ type: 'udp4' });
  await new Promise((t) => egyik.bind(0, '127.0.0.1', t));
  await new Promise((t) => masik.bind(0, '127.0.0.1', t));
  return { egyik, masik, egyikPort: egyik.address().port, masikPort: masik.address().port,
    bezar() { egyik.close(); masik.close(); } };
}

async function csere(tarA, tarB, reszvesz, kz) {
  const p = await udpParos();
  const kezdet = Date.now();
  const meres = new Map();                                 // üzenet-típus → nyílt bájt (mindkét fél küldése)
  const oldal = (k) => ({ reszvesz, tablaKulcs: nyilvanosResz(k.t), tablaAlairo: (x) => kezfogasAlairasa(k.t, x),
    reszvetelHalmaz: async () => k.p, halmazTar: k.h, uzenetMeres: meres });
  try {
    const [a, b] = await Promise.all([
      csereUdpResen(p.egyik, '127.0.0.1', p.masikPort, tarA, KOINO, oldal(kz.a)),
      csereUdpResen(p.masik, '127.0.0.1', p.egyikPort, tarB, KOINO, oldal(kz.b))
    ]);
    return { bajt: a.bajtKuldott + a.bajtKapott, ms: Date.now() - kezdet,
      uzenetek: a.egyeztetoUzenetek + b.egyeztetoUzenetek, meres };
  } finally {
    p.bezar();
  }
}

const kb = (b) => (b < 1024 ? b + ' B' : (b / 1024).toFixed(1) + ' KB');

async function tarIrasa(hely, esemenyek) {
  await mkdir(join(hely, KOINO), { recursive: true });
  await writeFile(join(hely, KOINO, 'esemenyek.jsonl'), esemenyek.map((e) => JSON.stringify(e)).join('\n') + '\n');
  return esemenyTarNyitasa(KOINO, hely);
}

async function egyMeret(n, szerzo, masodik) {
  const kozosek = [];
  for (let i = 0; i < n; i++) kozosek.push(await szerzo.tesz('GondolatLetrehozas', { cim: 'S' + i, meret: 10 }));
  const halmaz = new Set(kozosek.map((e) => e.azonosito));
  for (const v of VALTOZASOK) {
    const hely = join(tmpdir(), 'koino-tarsemlekezet-meres-' + n + '-' + v + '-' + Date.now());
    try {
      const tarA = await tarIrasa(join(hely, 'A'), kozosek);
      const tarB = await tarIrasa(join(hely, 'B'), kozosek);
      const kz = { a: { t: await ujTablaKulcs(), p: halmaz, h: memoriaHalmazTar() },
        b: { t: await ujTablaKulcs(), p: halmaz, h: memoriaHalmazTar() } };
      const reszvesz = (k) => halmaz.has(k);
      await csere(tarA, tarB, reszvesz, kz);                   // az első találkozás: a közös halmaz kicserélése
      await csere(tarA, tarB, reszvesz, kz);                   // bemelegítés (a gyorsítótárak)
      // v közös szeletbe egy-egy új esemény a B tárba (egy másik szerző pontja — a szelet halmaza változik)
      const lepes = Math.max(1, Math.floor(n / Math.max(1, v)));
      for (let i = 0; i < v; i++) {
        const cel = kozosek[(i * lepes) % n];
        await tarB.hozzafuz(await masodik.tesz('TudatpontRendezes', { entitas: cel.azonosito, pont: 1 }));
      }
      const r = await csere(tarA, tarB, reszvesz, kz);
      kiir('  n = ' + String(n).padStart(5) + ' · ' + String(v).padStart(2) + ' változott szelet: '
        + kb(r.bajt).padStart(8) + ' · ' + String(r.uzenetek).padStart(3) + ' egyeztető üzenet · ' + r.ms + ' ms');
      // ⭐ A bontás: az első szint (SZELETEK) — ezt spórolhatná meg az F —, a többi egyeztető, és maga az esemény.
      const m = r.meres;
      const resz = (...t) => t.reduce((x, k) => x + (m.get(k) ?? 0), 0);
      const elso = resz('SZELETEK');
      const esemeny = resz('ESEMENY');
      const tobbi = [...m.entries()].filter(([k]) => !['SZELETEK', 'ESEMENY'].includes(k))
        .sort((x, y) => y[1] - x[1]).map(([k, b]) => k + ' ' + kb(b)).join(', ');
      kiir('        nyíltan: első szint (SZELETEK) ' + kb(elso) + ' · az esemény(ek) ' + kb(esemeny) + ' · a többi: ' + tobbi);
    } finally {
      await rm(hely, { recursive: true, force: true });
    }
  }
}

async function fut() {
  const meretek = process.argv.slice(2).map(Number).filter((x) => x > 0);
  kiir('');
  kiir('A TÁRSANKÉNTI EMLÉKEZET FELSŐ HATÁRA (70.) — Node ' + process.version + ' · ' + process.platform);
  kiir('  (két készülék, n közös szelet, a közös halmaz már ismert; v közös szeletben egy-egy új esemény)');
  const szerzo = await ujEember(KOINO);
  const masodik = await ujEember(KOINO);
  for (const n of meretek.length ? meretek : [50, 200, 1000, 5000]) await egyMeret(n, szerzo, masodik);
  kiir('');
}

fut().catch((hiba) => {
  kiir('HIBA: ' + hiba.message);
  kiir(hiba.stack);
  process.exit(1);
});
