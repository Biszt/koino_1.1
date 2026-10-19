// koino/meres/korUtemMeres.js

// Felelősség: A 80. MÉRÉS — A KOPOGÁS ÜTEME (41., 45. — „a kopogás saját üteme”): hány percforduló marad ki egy valódi
// őrjárat körében, és mi viszi el? A rés csak EGYIDEJŰ kopogásra nyílik (36/d), tehát két készülék akkor talál egymásra, ha
// mindkettő a percfordulón kopog — a kör viszont a kopogás után sorban végzi a táblát (a néma kötések keresése, az új cím
// kiírása — DHT-művelet) és a házimunkát, és ha ez túlnyúlik a következő percfordulón, az az ablak kimarad.
//
// A beállítás (ideiglenes adatmappa, a valódi `koino-adat` érintetlen): egy friss készülék egy koinóval, két NÉMA kötéssel
// (valódi tábla-kulcs, halott cím — a tábláról keresi őket a VALÓDI DHT-n) és három halott induló címmel (nem routolható —
// a kopogás az ablakig próbál). `orjarat 1`, `PERC` percig. A kör kezdetét a `csere.json` mondja meg (az őrjárat a kör elején
// írja); a percfordulók közül azt számoljuk kimaradtnak, amelyik után 5 mp-en belül nem indult kör.
//
// `--friss`: az egyik néma kötés két perce hallgat el (mint egy hálózatváltás után) — a kör ilyenkor minden ablakban a
// tábláról keresi (`tablanKeresendok`: az első négy ablakban mindig), nem csak a visszalépő ütemben.
//
// ⚠️ NEM ÖNPRÓBA (számokat ad; a valódi DHT-t használja — hálózat kell).
//   node koino/meres/korUtemMeres.js [perc] [port] [--friss]      (`KOINO_UTEM_JS`: egy másik koino.js — pl. a régi változat)

import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { kotesTarolo } from '../js/tar/fajlTar.js';
import { talalkozasFeljegyzese } from '../js/csere/kotesek.js';
import { ujTablaKulcs, nyilvanosResz } from '../js/csere/tablaKulcs.js';

const kiir = (s) => process.stdout.write(s + '\n');
console.log = () => {};
const ervek = process.argv.slice(2).filter((x) => !x.startsWith('--'));
const FRISS = process.argv.includes('--friss');
const PERC = Number(ervek[0] ?? 8);
const PORT = Number(ervek[1] ?? 7781);
const KOINO_JS = process.env.KOINO_UTEM_JS ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'koino.js');

const hely = await mkdtemp(join(tmpdir(), 'koino-utem-'));
const env = { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '' };
const fut = (...ervek) => new Promise((teljesit) => {
  const p = spawn(process.execPath, [KOINO_JS, ...ervek], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let ki = '';
  p.stdout.on('data', (d) => { ki += d; });
  p.stderr.on('data', (d) => { ki += d; });
  p.on('close', () => teljesit(ki));
});

kiir('80. MÉRÉS — A KOPOGÁS ÜTEME (egy valódi őrjárat, ' + PERC + ' perc, a valódi DHT-n'
  + (FRISS ? ', egy frissen elnémult kötéssel' : '') + (process.env.KOINO_UTEM_JS ? ' — ' + process.env.KOINO_UTEM_JS : '') + ')\n');
await fut('koino', 'Ütem');
// Két néma kötés: valódi tábla-kulcs, halott cím (a kör a tábláról keresi őket).
const kotesek = kotesTarolo(hely);
let jegyzek = [];
for (const [i, cim] of ['10.255.255.21', '10.255.255.22'].entries()) {
  const k = nyilvanosResz(await ujTablaKulcs());
  const regen = FRISS && i === 0 ? Date.now() - 2 * 60 * 1000 - 3000 : Date.now() - (3 + i) * 3600 * 1000;
  jegyzek = talalkozasFeljegyzese(jegyzek, k, { hoszt: cim, port: 7373 }, regen);
  jegyzek = talalkozasFeljegyzese(jegyzek, k, { hoszt: cim, port: 7373 }, regen + 1000);
  jegyzek = talalkozasFeljegyzese(jegyzek, k, { hoszt: cim, port: 7373 }, regen + 2000);
}
await kotesek.ir(jegyzek);
for (const cim of ['10.255.255.1', '10.255.255.2', '10.255.255.3']) await fut('tars', cim, '7373');

const sorok = [];
const korKezdetek = [];
let utolsoKezdet = null;
const orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '1', String(PORT)], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let puffer = '';
const sorFeldolgozas = (d) => {
  puffer += d;
  const darabok = puffer.split('\n');
  puffer = darabok.pop();
  for (const s of darabok) {
    const tiszta = s.replace(/\x1b\[[0-9;]*m/g, '').trim();
    if (tiszta) sorok.push({ ido: Date.now(), sor: tiszta });
  }
};
orjarat.stdout.on('data', sorFeldolgozas);
orjarat.stderr.on('data', sorFeldolgozas);

const indulas = Date.now();
const csereFajl = join(hely, 'sajat', 'csere.json');
while (Date.now() - indulas < PERC * 60 * 1000) {
  try {
    const a = JSON.parse(await readFile(csereFajl, 'utf8'));
    const k = a?.kor?.kezdet;
    if (Number.isFinite(k) && k !== utolsoKezdet) { utolsoKezdet = k; korKezdetek.push(k); }
  } catch { /* még nincs */ }
  await new Promise((t) => setTimeout(t, 250));
}
orjarat.kill();
await new Promise((t) => setTimeout(t, 1000));

// ===== A KIÉRTÉKELÉS =====
const perc = 60 * 1000;
const elsoForduló = Math.ceil((korKezdetek[0] ?? indulas) / perc) * perc;
const fordulok = [];
for (let t = elsoForduló; t < indulas + PERC * perc - 5000; t += perc) fordulok.push(t);
const kimaradt = fordulok.filter((t) => !korKezdetek.some((k) => k >= t - 1000 && k <= t + 5000));
const hms = (t) => new Date(t).toTimeString().slice(0, 8);
kiir('A körök kezdete: ' + korKezdetek.map(hms).join(' · '));
kiir('A percfordulók: ' + fordulok.length + ' · kimaradt: ' + kimaradt.length
  + (kimaradt.length ? ' (' + kimaradt.map(hms).join(', ') + ')' : ''));
kiir('');
kiir('Az őrjárat naplója (a fogadás ideje):');
for (const s of sorok) {
  if (/kopog|tábl|táblán|címjegyzék|kiírtam|kör|társ|DHT|rés/i.test(s.sor)) kiir('  ' + hms(s.ido) + '  ' + s.sor.slice(0, 150));
}
await rm(hely, { recursive: true, force: true });
