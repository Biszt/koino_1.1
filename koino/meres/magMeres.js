// koino/meres/magMeres.js — ⭐ A SZÁMÍTÁS MAGJÁNAK STABILITÁSA (89. mérés, D123 — a program rétegei, PR1–PR3)
//
// Felelősség: a git-történeten végigmenve megméri, milyen gyakran változott a SZÁMÍTÁS MAGJA (a koinó képének és a kapunak az
// import-zárványa — `kodCsomag.js` `magJegyzeke`, ugyanaz a függvény, amit a program használ): commitonként a mag fájljai, a
// mérete és a neve (a jegyzék lenyomata); és ahol a név változott, változásonként fájlonként megnézi, hogy CSAK KOMMENT és
// szóköz változott-e (akkor a „más számítás” jelzés téves riasztás lenne), vagy kód. A kód-változásokat a commit tárgyával
// listázza — a kép tényleges változását (egy esemény-halmaz más képet ad-e) ez nem futtatja: a felső becslés.
//
// A kezdet: az a commit, amelyik a `ketReteg.js`-t (a koinó képe egy helyen) bevezette — előtte a kép a `koino.js`-ben állt össze,
// a mag-belépő nem létezett.
//
// Nem önpróba: számokat ad. Futtatás (a repó gyökeréből): node koino/meres/magMeres.js [kezdő-commit]
// Használja: a 89. mérés (eredmenyek.md).

import { execFileSync } from 'node:child_process';

import { magJegyzeke } from '../js/tar/kodCsomag.js';

const git = (args, kodolas = 'utf8') => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024, encoding: kodolas });

/** Egy fájl a commitból (a `koino/` alól), vagy null, ha nincs. */
function olvasoCommitbol(commit) {
  return async (ut) => {
    try { return execFileSync('git', ['show', commit + ':koino/' + ut], { maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }); }
    catch { return null; }
  };
}

// ===== A KOMMENT NÉLKÜLI ALAK (csak a méréshez — a program a bájtokat köti) =====
// A JS-forrás kommentjei nélkül, a szóközöket összevonva: a szöveg-literálokat ('…', "…", `…`) és a reguláris kifejezéseket
// megtartja (a `/` akkor kezd regexet, ha előtte operátor, nyitó zárójel vagy semmi áll). Nem teljes JS-elemző — egy téves
// besorolás a „csak komment” oldalra billentene, ezért a mérés a kétes esetet KÓD-nak veszi (lent).
function kommentNelkul(forras) {
  let ki = '';
  let i = 0;
  let elozo = '';   // az utolsó nem szóköz jel (a regex felismeréséhez)
  const n = forras.length;
  while (i < n) {
    const c = forras[i];
    const d = forras[i + 1];
    if (c === '/' && d === '/') { while (i < n && forras[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { const v = forras.indexOf('*/', i + 2); i = v < 0 ? n : v + 2; ki += ' '; continue; }
    if (c === '\'' || c === '"' || c === '`') {
      let j = i + 1;
      while (j < n && forras[j] !== c) { if (forras[j] === '\\') j++; j++; }
      ki += forras.slice(i, j + 1); elozo = c; i = j + 1; continue;
    }
    if (c === '/' && (elozo === '' || '(,=:[!&|?{};+-*%<>~^'.includes(elozo) || /\breturn$/.test(ki.trimEnd()))) {
      let j = i + 1, osztaly = false;
      while (j < n && (forras[j] !== '/' || osztaly) && forras[j] !== '\n') {
        if (forras[j] === '\\') j++; else if (forras[j] === '[') osztaly = true; else if (forras[j] === ']') osztaly = false;
        j++;
      }
      ki += forras.slice(i, j + 1); elozo = '/'; i = j + 1; continue;
    }
    ki += c;
    if (!/\s/.test(c)) elozo = c;
    i++;
  }
  return ki.replace(/\s+/g, ' ').trim();
}

// ===== A MÉRÉS =====
const kezdo = process.argv[2] ?? git(['log', '--diff-filter=A', '--format=%H', '--', 'koino/js/allapot/ketReteg.js']).trim().split('\n').pop();
const commitok = git(['rev-list', '--reverse', kezdo + '^..HEAD', '--', 'koino']).trim().split('\n').filter(Boolean);
console.log('A MAG STABILITÁSA — ' + commitok.length + ' commit a koino/ alatt, ' + kezdo.slice(0, 7) + ' óta (a ketReteg.js bevezetése)');

let elozoMag = null;          // { nev, fajlok: Map(út → lenyomat), commit }
const valtozasok = [];        // { commit, targy, datum, fajlok: [{ ut, fajta: 'komment'|'kod'|'uj'|'kiesett' }] }
let erintett = 0;             // ahány commit a mag valamelyik fájlját érintette
for (const c of commitok) {
  // Csak ott számolunk újra, ahol a commit a mag valamelyik fájlját (vagy, az első körben, bármit) érintette: a zárvány csak a mag
  // fájljainak tartalmától függ.
  if (elozoMag) {
    const valtozott = git(['diff-tree', '--no-commit-id', '--name-only', '-r', c]).split('\n').filter(Boolean)
      .map((p) => p.replace(/^koino\//, ''));
    if (!valtozott.some((p) => elozoMag.fajlok.has(p))) continue;
    erintett++;
  }
  const m = await magJegyzeke(olvasoCommitbol(c));
  const fajlok = new Map(m.jegyzek.fajlok.map((f) => [f[0], f[1]]));
  if (elozoMag && m.hivatkozas.lenyomat !== elozoMag.nev) {
    const [targy, datum] = git(['show', '-s', '--format=%s%x00%ad', '--date=short', c]).trim().split('\0');
    const tetel = { commit: c.slice(0, 7), targy, datum, fajlok: [] };
    for (const [ut, l] of fajlok) {
      const regi = elozoMag.fajlok.get(ut);
      if (regi === undefined) { tetel.fajlok.push({ ut, fajta: 'uj' }); continue; }
      if (regi === l) continue;
      const a = (await olvasoCommitbol(elozoMag.commit)(ut)).toString('utf8');
      const b = (await olvasoCommitbol(c)(ut)).toString('utf8');
      tetel.fajlok.push({ ut, fajta: kommentNelkul(a) === kommentNelkul(b) ? 'komment' : 'kod' });
    }
    for (const ut of elozoMag.fajlok.keys()) if (!fajlok.has(ut)) tetel.fajlok.push({ ut, fajta: 'kiesett' });
    valtozasok.push(tetel);
  }
  if (!elozoMag) {
    const bajt = m.jegyzek.fajlok.reduce((s, f) => s + f[2], 0);
    console.log('  a kezdeti mag (' + c.slice(0, 7) + '): ' + fajlok.size + ' fájl, ' + (bajt / 1024).toFixed(1) + ' KB');
  }
  elozoMag = { nev: m.hivatkozas.lenyomat, fajlok, commit: c, meret: m.jegyzek.fajlok.reduce((s, f) => s + f[2], 0) };
}

const csakKomment = valtozasok.filter((v) => v.fajlok.every((f) => f.fajta === 'komment'));
console.log('  a mai mag: ' + elozoMag.fajlok.size + ' fájl, ' + (elozoMag.meret / 1024).toFixed(1) + ' KB — a neve ' + elozoMag.nev.slice(0, 12) + '…');
console.log('  a mag fájljait érintő commit: ' + erintett + ' · a mag neve változott: ' + valtozasok.length
  + ' (ebből csak komment / szóköz: ' + csakKomment.length + ')');
console.log('');
console.log('A VÁLTOZÁSOK (a mag neve):');
for (const v of valtozasok) {
  const jel = v.fajlok.every((f) => f.fajta === 'komment') ? 'komment' : 'KÓD   ';
  console.log('  ' + jel + ' ' + v.datum + ' ' + v.commit + ' ' + v.targy.slice(0, 90));
  console.log('           ' + v.fajlok.map((f) => f.ut.replace(/^js\//, '') + (f.fajta === 'kod' ? '' : ' (' + f.fajta + ')')).join(', '));
}
