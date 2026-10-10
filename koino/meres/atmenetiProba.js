// koino/meres/atmenetiProba.js

// Felelősség: B/1–B/2 próbái — a VÁLLALÁS (`vallalas.js`) és az ÁTMENETI TÁR (`atmenetiTar.js`, D75):
// ugyanazon a kapun ír bele minden, újranyitás után megmarad, a legrégebben megnézett megy elsőként, a két
// tár egy bemenetté áll össze, és a D14 csak a tartósra vonatkozik.
//
// Használják: meres/mind.js (az alap csoport).

import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { probaGyujtemeny, ujEember, tagokkal } from './probaFuttato.js';
import { atmenetiTarNyitasa, ketTarBemenete, ketTarNezet } from '../js/tar/atmenetiTar.js';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { esemenyMentese, koinoEsemenyei } from '../js/tar/esemenyTar.js';
import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';
import { vallalasSzamitasa } from '../js/allapot/vallalas.js';
import { toredekAzonosito } from '../js/allapot/szabalyok.js';

const { proba, futtatas } = probaGyujtemeny('A vállalás és az átmeneti tár (B/1–B/2, D75)');

const KOINO = 'proba';
const mappa = () => mkdtemp(join(tmpdir(), 'koino-atmeneti-'));

/** Három gondolat (három szelet), mindegyik egy születés-esemény. */
async function haromGondolat() {
  const anna = await ujEember(KOINO);
  const g = [];
  for (const cim of ['ELSO', 'MASODIK', 'HARMADIK']) g.push(await anna.tesz('GondolatLetrehozas', { cim, meret: 10 }));
  return { anna, g };
}

// ===================================
// 1. AZ ÁTMENETI TÁR
// ===================================

proba('⛔⛔ az átmeneti tárba is UGYANAZON a kapun megy minden — a hamisat elveti, a jót megtartja (újranyitás után is)', async () => {
  const hely = await mappa();
  const at = await atmenetiTarNyitasa(KOINO, hely);
  const { g } = await haromGondolat();
  const hamis = { ...g[1], adat: { ...g[1].adat, cim: 'ÁTÍRT' } };
  const jo = await esemenyMentese(at, g[0]);
  const rossz = await esemenyMentese(at, hamis);
  const ujra = await atmenetiTarNyitasa(KOINO, hely);
  const fajlok = (await readdir(join(hely, 'atmeneti'))).filter((f) => f.endsWith('.jsonl'));
  return jo.mentve === true && rossz.mentve === false
    && (await ujra.esemeny(g[0].azonosito))?.adat.cim === 'ELSO' && (await ujra.esemeny(g[1].azonosito)) === null
    && fajlok.length === 1 && fajlok[0] === g[0].azonosito + '.jsonl';
});

proba('⭐⭐ a korlát fölött a LEGRÉGEBBEN MEGNÉZETT szelet megy — a megnézés megvédi, a most írt soha nem esik ki', async () => {
  const hely = await mappa();
  let ora = 1000;
  const { g } = await haromGondolat();
  const egyBajt = Buffer.byteLength(JSON.stringify(g[0])) + 1;
  // Két szelet fér el, három nem.
  const at = await atmenetiTarNyitasa(KOINO, hely, { korlat: Math.floor(egyBajt * 2.5), most: () => ora });
  await esemenyMentese(at, g[0]); ora += 10;           // ELSO   @1000
  await esemenyMentese(at, g[1]); ora += 10;           // MASODIK @1010
  await at.megnezve(g[0].azonosito); ora += 10;        // ELSO megnézve @1020 → a MASODIK a legrégebbi
  await esemenyMentese(at, g[2]);                      // HARMADIK @1030 → a MASODIK megy
  const megvan = (i) => at.mind().some((e) => e.azonosito === g[i].azonosito);
  const ujra = await atmenetiTarNyitasa(KOINO, hely, { korlat: 1e9 });
  return megvan(0) && !megvan(1) && megvan(2) && at.szeletek().length === 2
    && ujra.mind().length === 2 && !ujra.mind().some((e) => e.azonosito === g[1].azonosito);
});

proba('⭐ a két tár EGY bemenet: a tartós mind, az átmenetiből ami a tartósban nincs — és a nézet is ugyanezt adja', async () => {
  const hely = await mappa();
  const tartos = await esemenyTarNyitasa(KOINO, hely);
  const at = await atmenetiTarNyitasa(KOINO, join(hely, KOINO));
  const { g } = await haromGondolat();
  await esemenyMentese(tartos, g[0]);
  await esemenyMentese(at, g[0]);                      // mindkettőben megvan
  await esemenyMentese(at, g[1]);                      // csak az átmenetiben
  const { esemenyek, csakAtmeneti } = await ketTarBemenete(tartos, at, KOINO);
  const nezet = ketTarNezet(tartos, at);
  const nezetbol = await koinoEsemenyei(nezet, KOINO);
  return esemenyek.length === 2 && csakAtmeneti.size === 1 && csakAtmeneti.has(g[1].azonosito)
    && nezetbol.length === 2 && nezet.csakAtmeneti().has(g[1].azonosito);
});

// ⭐ A ház (D100): a futó felület és az őrjárat két folyamat — az őrjárat hozza a kérelem válaszát az átmeneti tárba, a
// felület mutatja. Két példány ugyanazon a mappán: amit az egyik ír (új szelet, új sor egy meglévőbe), amit eldob, azt
// a másik a `frissit` után (a két tár nézetén át is) látja; a félbe írt sort pedig csak akkor veszi be, ha a sorvég is
// megérkezett. Rontás: a `frissit` nem olvas → a második példány a megnyitáskori állapotnál ragad.
proba('⭐ D100: amit egy MÁSIK folyamat írt az átmeneti tárba (vagy eldobott belőle), azt a `frissit` után látjuk — a félbe írt sort nem', async () => {
  const hely = await mappa();
  const tartos = await esemenyTarNyitasa(KOINO, hely);
  const iro = await atmenetiTarNyitasa(KOINO, join(hely, KOINO));
  const olvaso = await atmenetiTarNyitasa(KOINO, join(hely, KOINO));
  const { anna, g } = await haromGondolat();
  await esemenyMentese(iro, g[0]);
  const nezet = ketTarNezet(tartos, olvaso);
  const uj = (await koinoEsemenyei(nezet, KOINO)).some((e) => e.azonosito === g[0].azonosito);
  // Egy második esemény ugyanabba a szeletbe (új sor egy meglévő fájl végén) — és egy félbe írt sor egy harmadikba.
  const pont = await anna.tesz('TudatpontRendezes', { entitas: g[0].azonosito, pont: 5, kiosztva: 5 });
  await esemenyMentese(iro, pont);
  const { appendFile } = await import('node:fs/promises');
  const fel = JSON.stringify(g[2]);
  await appendFile(join(hely, KOINO, 'atmeneti', g[2].azonosito + '.jsonl'), fel.slice(0, 40));
  await esemenyMentese(iro, g[1]);
  await olvaso.frissit();
  const ujSor = !!(await olvaso.esemeny(pont.azonosito)) && !!(await olvaso.esemeny(g[1].azonosito));
  const felbeNem = (await olvaso.esemeny(g[2].azonosito)) === null;
  // A sor vége megérkezik — és az író eldobja az első szeletet.
  await appendFile(join(hely, KOINO, 'atmeneti', g[2].azonosito + '.jsonl'), fel.slice(40) + '\n');
  await iro.elhagy(g[0].azonosito);
  await olvaso.frissit();
  const egesz = (await olvaso.esemeny(g[2].azonosito))?.adat?.cim === 'HARMADIK';
  const eldobva = (await olvaso.esemeny(g[0].azonosito)) === null && (await olvaso.esemeny(pont.azonosito)) === null;
  const ki = { uj, ujSor, felbeNem, egesz, eldobva };
  if (!Object.values(ki).every(Boolean)) console.log('    (frissítés — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + ')');
  return Object.values(ki).every(Boolean);
});

// ===================================
// 2. A D14 CSAK A TARTÓSRA VONATKOZIK (D75/4)
// ===================================

proba('⭐⭐ D75/4: a csak az átmenetiből ismert, pont nélkül látott entitás NEM tűnik el — a tartósban igen (D14)', async () => {
  const { anna, g } = await haromGondolat();
  // (a) csak az átmenetiből, egyetlen pont-esemény sem → marad, jelölve
  const a = allapotSzamitasa(await tagokkal([g[0]]), { csakAtmeneti: new Set([g[0].azonosito]) });
  // (b) ugyanez a TARTÓSBÓL → a D14 elfelejti
  const b = allapotSzamitasa(await tagokkal([g[0]]));
  // (c) az átmenetiből, de a pont-eseményét látjuk (0-ra vették) → a 0 pont tudás: a D14 áll
  const pont = await anna.tesz('TudatpontRendezes', { entitas: g[0].azonosito, pont: 0, kiosztva: 0 });
  const c = allapotSzamitasa(await tagokkal([g[0], pont]), { csakAtmeneti: new Set([g[0].azonosito, pont.azonosito]) });
  return a.entitasok.get(g[0].azonosito)?.pontokIsmeretlenek === true
    && !b.entitasok.has(g[0].azonosito) && !c.entitasok.has(g[0].azonosito);
});

// ===================================
// 3. A VÁLLALÁS (B/1)
// ===================================

proba('⭐⭐ B/1: a vállalás a saját láncból — a pozitív pontú szeletek (a töredék is), az azonosságom, a koinó születése', async () => {
  const anna = await ujEember(KOINO);
  const g1 = await anna.tesz('GondolatLetrehozas', { cim: 'G1', meret: 10 });
  const g2 = await anna.tesz('GondolatLetrehozas', { cim: 'G2', meret: 10 });
  const belep = await anna.tesz('Belepes', {});
  const tor = toredekAzonosito('J'.repeat(43), g1.azonosito);
  const lanc = [g1, g2, belep,
    await anna.tesz('TudatpontRendezes', { entitas: g1.azonosito, pont: 10, kiosztva: 10 }),
    await anna.tesz('TudatpontRendezes', { entitas: g2.azonosito, pont: 5, kiosztva: 15 }),
    await anna.tesz('TudatpontRendezes', { entitas: tor, pont: 1, kiosztva: 16 }),
    await anna.tesz('TudatpontRendezes', { entitas: g2.azonosito, pont: 0, kiosztva: 11 })];   // visszavette
  const v = vallalasSzamitasa([...lanc].reverse(), { koinoSzuletes: 'K'.repeat(43) });
  return v.szeletek.has(g1.azonosito) && !v.szeletek.has(g2.azonosito) && v.szeletek.has(tor)
    && v.szeletek.has(belep.azonosito) && v.szeletek.has('K'.repeat(43)) && v.szeletek.size === 4
    && !v.szeletek.has('');                            // ⛔ a gyökér nem vállalás (D90)
});

export default futtatas;
