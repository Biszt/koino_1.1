// koino/meres/csaladCsereMeres.js — ⭐ A CSALÁDI CSERE ÁRA (85. mérés, D119 ③ — az átvizsgálás M1-e)
//
// Felelősség: megméri, mennyibe kerül, hogy egy csere a CSALÁDOT cseréli (a nyitás a család többi koinóját is megnevezi, a
// közös koinók sorban jönnek, koinónként egy kézfogással). Két készülék (A és B) egy k koinós családban (a szülő és k − 1
// gyermek — A hozza létre őket koino-verzió kártyával, B a kézi úton kapja meg mindet), A postaládát futtat a szülőre, B
// kétszer cserél vele: az első hozza, ami hiányzik, a második a „nincs újdonság” családi csere (a mérce: a mai 1,2–1,7 KB
// koinónként — 43. mérés). Kiírja koinónként a csere bájtjait (a résen, titkosítva, a kézfogás nélkül) és az időt, és a
// nyitás `cs` jelének nyílt méretét k koinónál.
//
// Nem önpróba: számokat ad. Futtatás: node koino/meres/csaladCsereMeres.js [k ...]   (alapból 1 2 3 5)
// Használja: a 85. mérés (eredmenyek.md).

import { execFile, spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const KOINO_JS = new URL('../koino.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const PORT = 7881;

// ===== SEGÉDEK =====

/** Egy parancs külön folyamatban; a kimenetét adja (a hibáét is). */
function fut(hely, ervek, kornyezet = {}) {
  return new Promise((teljesul) => {
    execFile(process.execPath, [KOINO_JS, ...ervek],
      { env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '', ...kornyezet }, timeout: 120000 },
      (hiba, ki, hk) => teljesul((ki ?? '') + (hk ?? '') + (hiba && !ki ? String(hiba.message) : '')));
  });
}

const varj = (ms) => new Promise((t) => setTimeout(t, ms));
const nev = (kimenet) => (kimenet.match(/[A-Za-z0-9_-]{43}/g) ?? []).at(-1) ?? null;

/** A koinó neve a becenévből (a `becenevek.json`). */
async function koinoNeve(hely, becenev = 'sajat') {
  try { return JSON.parse(await readFile(join(hely, 'becenevek.json'), 'utf8'))?.[becenev] ?? null; } catch { return null; }
}

/** „12.3 KB” / „702 B” → bájt. */
function bajtokbol(s) {
  const m = String(s).match(/([\d.]+)\s*(KB|MB|B)\b/);
  if (!m) return null;
  return Math.round(Number(m[1]) * (m[2] === 'MB' ? 1048576 : m[2] === 'KB' ? 1024 : 1));
}

/** A csere kimenetéből: koinónként a csere bájtjai (a „csere a résen” sorok), az összeg és az idő. */
function cserebol(kimenet) {
  const koinonkent = [...kimenet.matchAll(/csere a résen [^\n]*\((\d+) kör, ([\d.]+ (?:KB|MB|B))\)/g)].map((m) => bajtokbol(m[2]));
  const vege = kimenet.match(/Csere kész — kaptam (\d+) új eseményt, küldtem (\d+) \((\d+) kör, (\d+) ms, ([\d.]+ (?:KB|MB|B))\)/);
  return { koinonkent, uj: vege ? Number(vege[1]) : null, kuldott: vege ? Number(vege[2]) : null,
    ms: vege ? Number(vege[4]) : null, osszes: vege ? bajtokbol(vege[5]) : null,
    csalad: /a család közös koinói is/.test(kimenet) };
}

// ===== EGY CSALÁD =====

async function csaladMerese(k) {
  const a = await mkdtemp(join(tmpdir(), 'koino-csalad-a-'));
  const b = await mkdtemp(join(tmpdir(), 'koino-csalad-b-'));
  let figyelo = null;
  try {
    await fut(a, ['koino', 'Mérés szülő', 'nyilt']);
    const P = await koinoNeve(a);
    // B taggá a szülőben (a belépése A-hoz, a meghívás vissza)
    await fut(b, ['csatlakoz', P]);
    const horgony = nev(await fut(b, ['belep']));
    await fut(b, ['kivisz', join(b, 'be.jsonl'), horgony]);
    await fut(a, ['behoz', join(b, 'be.jsonl')]);
    await fut(a, ['meghiv', horgony]);
    // k − 1 gyermek (koino-verzió kártyával), mind a szülő gyermeke
    const gyermekek = [];
    for (let i = 1; i < k; i++) {
      await fut(a, ['koinoverzio', 'Mérés gyermek ' + i, 'pont=1', 'becenev=g' + i]);
      gyermekek.push({ becenev: 'g' + i, nev: await koinoNeve(a, 'g' + i) });
    }
    // B a szülőt a kézi úton kapja meg (a kártyákkal), és minden gyermekbe BEKÖLTÖZIK (a valódi menet: a gyermek tagjai a
    // költözők — aki nem költözött, az a gyermekben semmit nem vállal, és a cseréje ott üres)
    await fut(b, ['gondolat', 'B a szülőben']);
    await fut(a, ['kivisz', join(a, 'p.jsonl')]);
    await fut(b, ['behoz', join(a, 'p.jsonl')]);
    for (const g of gyermekek) await fut(b, ['koltozes', g.nev]);
    // egy-egy új gondolat A-nál minden koinóban (az első csere ezt hozza)
    await fut(a, ['gondolat', 'Új a szülőben']);
    for (const g of gyermekek) await fut(a, ['gondolat', 'Új: ' + g.becenev], { KOINO_AZONOSITO: g.becenev });

    figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(PORT)],
      // ⚠️ nagy kiszolgálási keret: a mérés a cserét méri, nem a keretet (az a kód átvitelét óránként ~150 kérésnél megállítaná)
      { env: { ...process.env, KOINO_ADAT: a, KOINO_NAPLO: '', KOINO_KERET: '1000000000,100000' }, stdio: 'ignore' });
    await varj(3000);
    // ⚠️ A kártyák kódja (a nem vállaló is kéri — a fájl-igény minden látott entitásé) randevúnként legfeljebb 50 fájl: a
    // cseréket addig ismételjük, amíg egy se hoz semmit (se eseményt, se fájlt) — az az utolsó, a „nincs újdonság”.
    const kimenetek = [];
    let fajlBajt = 0;
    for (let i = 0; i < 12; i++) {
      const ki = await fut(b, ['csere', '127.0.0.1', String(PORT)]);
      kimenetek.push(ki);
      for (const m of ki.matchAll(/fájlok a résen: (\d+) megjött \(([\d.]+ (?:KB|MB|B))\)/g)) fajlBajt += bajtokbol(m[2]) ?? 0;
      const ures = cserebol(ki).uj === 0 && !/fájlok a résen: [1-9]/.test(ki);
      if (i > 0 && ures) break;
      await varj(500);
    }
    // A teljes kimenet (a vizsgálathoz): KOINO_MERES_KIMENET=1
    if (process.env.KOINO_MERES_KIMENET) console.log(kimenetek.join('\n-----\n'));
    const bKepe = await Promise.all([fut(b, []), ...gyermekek.map((g) => fut(b, [], { KOINO_AZONOSITO: g.nev }))]);
    const megjott = /Új a szülőben/.test(bKepe[0]) && gyermekek.every((g, i) => bKepe[i + 1].includes('Új: ' + g.becenev));
    return { k, elso: cserebol(kimenetek[0]), masodik: cserebol(kimenetek.at(-1)), cserek: kimenetek.length, fajlBajt, megjott };
  } finally {
    if (figyelo) figyelo.kill();
    await varj(500);
    for (const h of [a, b]) await rm(h, { recursive: true, force: true });
  }
}

// ===== A FUTÁS =====

const kk = process.argv.slice(2).map(Number).filter((n) => Number.isInteger(n) && n >= 1);
const lista = kk.length ? kk : [1, 2, 3, 5];
const kb = (n) => (n == null ? '?' : (n / 1024).toFixed(1) + ' KB');

console.log('⭐ A CSALÁDI CSERE ÁRA (85. mérés) — két készülék, k koinós család, a postaláda a szülőre\n');
console.log('A nyitás „cs” jele (nyílt, a NYITAS-ban — mindkét irányban egyszer):');
const nev43 = 'x'.repeat(43);
for (const k of [1, 2, 5, 16, 64]) {
  const cs = JSON.stringify({ cs: Array.from({ length: k - 1 }, () => nev43) }).length - 2 + 1;   // + a vessző
  console.log('  k = ' + String(k).padStart(2) + ': ' + cs + ' B');
}
console.log('');
for (const k of lista) {
  const r = await csaladMerese(k);
  const sor = (x) => 'összesen ' + kb(x.osszes) + ' · koinónként ' + x.koinonkent.map(kb).join(' + ') + ' · '
    + x.ms + ' ms' + (x.uj != null ? ' · kaptam ' + x.uj + ', küldtem ' + x.kuldott : '') + (k > 1 && !x.csalad ? ' ⚠ család nélkül' : '');
  console.log('k = ' + k + ':' + (r.megjott ? '' : ' ⚠ nem minden új gondolat jött meg'));
  console.log('  az első csere:              ' + sor(r.elso));
  console.log('  a kód (a kártyák fájljai):  ' + kb(r.fajlBajt) + ' · ' + r.cserek + ' csere, amíg minden átért');
  console.log('  a „nincs újdonság” csere:   ' + sor(r.masodik));
}
