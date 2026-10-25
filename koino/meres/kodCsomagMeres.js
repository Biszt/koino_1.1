// koino/meres/kodCsomagMeres.js — ⭐ A KÓD-CSOMAG MÉRETE (84. mérés, D119 — a koino-verzió kártya „Kód” füle)
//
// Felelősség: megméri, mekkora a program teljes kódja, ha a koino-verzió kártyára tartalom-címzett fájlokként kerül: a
// fájlok száma, a bájtjaik összege SORVÉG NÉLKÜL (a 6. szabály mércéje — ahogy a git tárolja és a telefon kicsekkolja),
// tömörítve fájlonként és egyben, a jegyzék (útvonal → lenyomat) mérete, a legnagyobb fájl (a fájl-korláthoz), és ha két
// commitot kap, a kettő közti KÜLÖNBSÉG (ennyi utazik egy új verzióval — a közös fájlok tartalom-címzetten egyszer).
//
// Nem önpróba: számokat ad. Futtatás (a repó gyökeréből): node koino/meres/kodCsomagMeres.js [régi-commit]
// Használja: a 84. mérés (eredmenyek.md).

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

/** A fájl tartalma sorvég (CR) nélkül, egy commitból vagy a munkakönyvtárból. */
function tartalom(utvonal, commit = null) {
  const nyers = commit
    ? execFileSync('git', ['show', commit + ':' + utvonal], { maxBuffer: 64 * 1024 * 1024 })
    : execFileSync('git', ['show', 'HEAD:' + utvonal], { maxBuffer: 64 * 1024 * 1024 });
  return Buffer.from(nyers.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
}

/** Egy commit jegyzéke: útvonal → { lenyomat, bajt }. */
function jegyzek(commit = null) {
  const lista = execFileSync('git', ['ls-tree', '-r', '--name-only', commit ?? 'HEAD', 'koino'], { encoding: 'utf8' })
    .split('\n').filter(Boolean);
  const ki = new Map();
  for (const p of lista) {
    const t = tartalom(p, commit);
    ki.set(p, { lenyomat: createHash('sha256').update(t).digest('base64url'), bajt: t.length, t });
  }
  return ki;
}

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
const most = jegyzek();
let ossz = 0, fajlonkent = 0, legnagyobb = [0, ''];
for (const [p, f] of most) {
  ossz += f.bajt;
  fajlonkent += gzipSync(f.t).length;
  if (f.bajt > legnagyobb[0]) legnagyobb = [f.bajt, p];
}
const egyben = gzipSync(Buffer.concat([...most.values()].map((f) => f.t))).length;
const jegyzekSzoveg = JSON.stringify(Object.fromEntries([...most].map(([p, f]) => [p, f.lenyomat])));
console.log('A KÓD-CSOMAG (HEAD, sorvég nélkül)');
console.log('  fájlok: ' + most.size + ' · összesen: ' + kb(ossz) + ' · fájlonként tömörítve: ' + kb(fajlonkent)
  + ' · egyben tömörítve: ' + kb(egyben));
console.log('  a jegyzék: ' + kb(jegyzekSzoveg.length) + ' (tömörítve ' + kb(gzipSync(jegyzekSzoveg).length) + ') · a legnagyobb fájl: '
  + kb(legnagyobb[0]) + ' (' + legnagyobb[1] + ')');

const regi = process.argv[2];
if (regi) {
  const r = jegyzek(regi);
  const regiLenyomatok = new Set([...r.values()].map((f) => f.lenyomat));
  let ujBajt = 0, ujDb = 0;
  for (const f of most.values()) if (!regiLenyomatok.has(f.lenyomat)) { ujBajt += f.bajt; ujDb++; }
  console.log('A KÜLÖNBSÉG ' + regi + ' óta: ' + ujDb + ' új vagy változott fájl, ' + kb(ujBajt)
    + ' — ennyi utazik egy új verzióval (a többi tartalom-címzetten már megvan)');
}
