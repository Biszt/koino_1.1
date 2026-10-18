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
import { vallalasSzamitasa, KIFUTAS } from '../js/allapot/vallalas.js';
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

// ⭐⭐ D112 ② (F2): a RÖGZÍTÉS (a felderítés pillanatképe). Rontás: a böngészés kiszorítása a rögzítettet is nézi → a
// rögzített kiesik → bukik; a rögzítettek kerete nincs → a régebbi rögzítés nem megy → bukik; a feloldás nem adja vissza a
// kiszorításba → bukik; a rögzítés nem kerül a lemezre → az újranyitott tár nem látja → bukik.
proba('⭐⭐ D112 ②: a RÖGZÍTETT szelet a böngészés kiszorításából kimarad, saját kerete van (a régebbi rögzítés megy), a feloldás után visszakerül', async () => {
  const hely = await mappa();
  let ora = 1000;
  const anna = await ujEember(KOINO);
  const g = [];
  for (const cim of ['A1', 'A2', 'A3', 'A4']) g.push(await anna.tesz('GondolatLetrehozas', { cim, meret: 10 }));
  const egy = Buffer.byteLength(JSON.stringify(g[0])) + 1;
  // a böngészés kerete: 1 szelet; a rögzítetteké: 2 szelet
  const at = await atmenetiTarNyitasa(KOINO, hely, { korlat: Math.floor(egy * 1.5), rogzitettKorlat: Math.floor(egy * 2.5), most: () => ora });
  const megvan = (i) => at.mind().some((e) => e.azonosito === g[i].azonosito);
  await esemenyMentese(at, g[0]); ora += 10;                // A1 @1000
  await at.rogzites([g[0].azonosito], 'F1'); ora += 10;     // A1 rögzítve (F1 @1010)
  await esemenyMentese(at, g[1]); ora += 10;                // A2 szabad @1020
  await esemenyMentese(at, g[2]); ora += 10;                // A3 szabad @1030 → a böngészés kerete 1: A2 megy, A1 marad
  const bongeszes = megvan(0) && !megvan(1) && megvan(2);
  await at.rogzites([g[2].azonosito], 'F2'); ora += 10;     // A3 rögzítve (F2 @1040) — rögzített: A1, A3
  await esemenyMentese(at, g[3]); ora += 10;                // A4 szabad @1050
  await at.rogzites([g[3].azonosito], 'F2'); ora += 10;     // A4 rögzítve (F2 @1060) → 3 rögzített > 2,5: a legrégebbi (A1) megy
  const rogzitettKeret = !megvan(0) && megvan(2) && megvan(3) && at.rogzitesAllasa('F2').szeletek === 2;
  const ujra = await atmenetiTarNyitasa(KOINO, hely, { korlat: 1e9 });
  const lemezen = ujra.rogzitettKulcsok().has(g[2].azonosito) && ujra.rogzitettKulcsok().has(g[3].azonosito);
  await at.rogzitesFeloldasa('F2');                         // A3, A4 szabad → a böngészés kerete 1: a régebben megnézett (A3) megy
  const feloldva = at.rogzitettKulcsok().size === 0 && !megvan(2) && megvan(3);
  return bongeszes && rogzitettKeret && lemezen && feloldva;
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
  // (A visszavett szelet kifutását — D104 — a következő próba méri; itt a kifutás nélküli ítélet.)
  const v = vallalasSzamitasa([...lanc].reverse(), { koinoSzuletes: 'K'.repeat(43), kifutas: 0 });
  return v.szeletek.has(g1.azonosito) && !v.szeletek.has(g2.azonosito) && v.szeletek.has(tor)
    && v.szeletek.has(belep.azonosito) && v.szeletek.has('K'.repeat(43)) && v.szeletek.size === 4
    && !v.szeletek.has('');                            // ⛔ a gyökér nem vállalás (D90)
});

// ⭐⭐ D104 (Csaba, 2026-10-15): A KIFUTÁS — a pont levétele után még 24 óráig tartom a szeletet, hogy a többiek későbbi
// változásait (pl. az utolsó pont levételét egy egyezményről) is megkapjam. Az idő a saját eseményem `ido`-ja.
// Rontás: a kifutás nélkül a frissen visszavett szelet azonnal kiesik → bukik.
proba('⭐⭐ D104: a KIFUTÁS — a visszavett pontú szeletet még 24 óráig tartom; utána kiesik, és ami újra pontot kapott, nem kifutó', async () => {
  const anna = await ujEember(KOINO);
  const T = Date.UTC(2026, 9, 15, 17, 0, 0);
  const ORA = 3600 * 1000;
  const g1 = await anna.tesz('GondolatLetrehozas', { cim: 'G1', meret: 10 }, T);
  const g2 = await anna.tesz('GondolatLetrehozas', { cim: 'G2', meret: 10 }, T);
  const g3 = await anna.tesz('GondolatLetrehozas', { cim: 'G3', meret: 10 }, T);
  const lanc = [g1, g2, g3,
    await anna.tesz('TudatpontRendezes', { entitas: g1.azonosito, pont: 10, kiosztva: 10 }, T),
    await anna.tesz('TudatpontRendezes', { entitas: g2.azonosito, pont: 5, kiosztva: 15 }, T),
    await anna.tesz('TudatpontRendezes', { entitas: g1.azonosito, pont: 0, kiosztva: 5 }, T + ORA),       // g1 levéve
    await anna.tesz('TudatpontRendezes', { entitas: g1.azonosito, pont: 0, kiosztva: 5 }, T + 5 * ORA),   // újra 0: a kezdet marad
    await anna.tesz('TudatpontRendezes', { entitas: g2.azonosito, pont: 0, kiosztva: 0 }, T + 2 * ORA),   // g2 levéve…
    await anna.tesz('TudatpontRendezes', { entitas: g2.azonosito, pont: 3, kiosztva: 3 }, T + 3 * ORA),   // …és újra rajta
    await anna.tesz('TudatpontRendezes', { entitas: g3.azonosito, pont: 0, kiosztva: 3 }, T + 3 * ORA)];  // soha nem volt pozitív
  const kozben = vallalasSzamitasa(lanc, { most: T + 10 * ORA });
  const hatar = vallalasSzamitasa(lanc, { most: T + ORA + KIFUTAS });
  const elotte = vallalasSzamitasa(lanc, { most: T + ORA + KIFUTAS - 1 });
  const ki = {
    kozben: kozben.szeletek.has(g1.azonosito) && kozben.kifuto.get(g1.azonosito) === T + ORA + KIFUTAS,
    ujraPont: kozben.szeletek.has(g2.azonosito) && !kozben.kifuto.has(g2.azonosito),
    sosemPozitiv: !kozben.szeletek.has(g3.azonosito) && !kozben.kifuto.has(g3.azonosito),
    hatar: !hatar.szeletek.has(g1.azonosito) && hatar.kifuto.size === 0 && elotte.szeletek.has(g1.azonosito),
    napig: KIFUTAS === 24 * ORA
  };
  if (!Object.values(ki).every(Boolean)) console.log('    (kifutás — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + ')');
  return Object.values(ki).every(Boolean);
});

export default futtatas;
