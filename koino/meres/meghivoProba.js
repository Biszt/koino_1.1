// koino/meres/meghivoProba.js — A MEGHÍVÓ SZÖVEGE ÉS A BIZONYÍTÉK önpróbája (D121, D122 — a meghívás a lapon)

// Mit bizonyít ez a lap?
//
// ⭐ Hogy a meghívó szöveg (D122) és a bizonyíték a döntés szerint jár:
//   · a meghívó visszaolvasva ugyanazt adja (a koinó, a készülék tábla-aláírója, a címek, az azonosító és a titok, a meghívott
//     neve, a lejárat, a kötelező profil-mezők), és egy üzenetben elfér;
//   · a beillesztett üzenet körülötte lévő szövege — a TELEPÍTŐ SOR is — nem zavar, és a tördelt sor is olvasható;
//   · ⛔ a hibás meghívóból semmi nem lesz (előtag, jelek, tartalom, a nevek, a címek, a titok, a név, a lejárat, a hossz) —
//     kimondott okkal; a régi alakú (D121, titok nélküli) meghívó a „kérj újat” okkal;
//   · a készítés a rossz címet és az ismétlést kihagyja, korlátosan; a meghívott neve kötelező;
//   · ⭐ a bizonyíték: a helyes titokkal készült elfogadható, és a koinóra, a SZEMÉLYRE és a HORGONYRA kötött — bármelyik más,
//     vagy más a titok: elutasítva (másra nem másolható át);
//   · ⭐ a WINDOWSOS sor (elágazás 232): ugyanaz a meghívó a végén; a héjak semmit nem bontanak ki belőle (az őr a rossz jelet,
//     a belső idézőjelet és a meghívó utáni idegen szöveget is megfogja); a telepítő ott van, ahol a sor keresi; a két .ps1
//     UTF-8 BOM-mal (a Windows PowerShell 5.1 nélküle ANSI-ként olvasná); és Windowson: a PowerShell hibátlanul értelmezi a
//     szkripteket, és a sor a cmd-ben ÉS a PowerShellben is egyetlen argumentumként adja át a meghívót a telepítőnek;
//   · ⭐⭐ D123 (PR7): a telepítő sor a már telepített programot FRISSÍTI — a windowsos sor friss gépen és frissítéskor az ÚJ
//     telepítőt, hálózat nélkül a meglévőt hívja (a régi letöltés maradékát nem); az új telepítő a régi mappából futó koinót
//     leállítja (a másikét nem), cserél (a régi a `koino_1.1-regi`-be), és a zárolt mappát és a git-tárat nem cseréli; a Termux-sor
//     a git-tel frissít (a nem követett adat marad; hálózat nélkül kimondja, és a meglévő indul), és a Termux-telepítő a futó régi
//     koinót leállítja (ahol van `pkill`).

import { randomBytes } from 'node:crypto';
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { execFile, spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  meghivoKeszitese, meghivoOlvasasa, meghivoE, telepitoSorMeghivoval, meghivoBizonyitek, bizonyitekEllenorzese, ujMeghivoJelei,
  windowsTelepitoSorMeghivoval, meghivoSzovegbol, windowsSorHibaja,
  MEGHIVO_ELOTAG, MEGHIVO_CIM_KORLAT, MEGHIVO_KORLAT, MEGHIVO_ELETTARTAM, TELEPITO_SOR, WINDOWS_TELEPITO_SOR, WINDOWS_TELEPITO_UT,
  TELEPITO_SOR_CSOMAGOK, WINDOWS_UJ_MAPPA
} from '../js/csere/meghivo.js';
import {
  meghivoRekesze, rekeszBejegyzes, rekeszBejegyzesbol, rekeszKeresesKoze, REKESZ_CIM_KORLAT,
  REKESZ_KOZ_ELSO_ORA, REKESZ_KOZ_ELSO_NAP, REKESZ_KOZ_UTANA
} from '../js/csere/meghivoRekesz.js';
import { bejegyzesEllenorzese, bencodeKodol, valtozoCel } from '../js/csere/dht.js';
import { probaGyujtemeny } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A MEGHÍVÓ SZÖVEGE ÉS A BIZONYÍTÉK (D121, D122)');

const K = '9FaeeJv2BY7MpvGA48dw2HPeE8IvHapGvU7NzXaCrTQ';
const T = '6YJn2U02Y3f6TiAoF9JBdCZyhK7BqP4Ye6bEIZDHLjU';
const CIMEK = [{ hoszt: '192.168.1.134', port: 7373 }, { hoszt: '31.46.248.159', port: 65205 }];
const azonosito = () => randomBytes(32).toString('base64url');
const LEJAR = Date.UTC(2026, 11, 2);
const jelek = ujMeghivoJelei();
const alap = () => ({ koino: K, alairo: T, cimek: CIMEK, azonosito: jelek.azonosito, titok: jelek.titok,
  meghivottNev: 'Kovács Anna', lejarat: LEJAR });
const nyersMeghivo = (j) => MEGHIVO_ELOTAG + Buffer.from(JSON.stringify(j), 'utf8').toString('base64url');
const jo = () => ({ k: K, t: T, c: [['192.168.1.134', 7373]], i: jelek.azonosito, s: jelek.titok, m: 'Kovács Anna', l: LEJAR });

// Rontás: a titok, a név, a lejárat vagy a profil-mezők kimaradnak a szövegből → bukik.
proba('⭐ a meghívó visszaolvasva ugyanazt adja — a koinó, a kulcs, a címek, az azonosító és a titok, a meghívott neve, a lejárat, a profil-mezők', () => {
  const sz = meghivoKeszitese({ ...alap(), profilMezok: ['nev', 'telepules'] });
  const r = meghivoOlvasasa(sz);
  return sz.startsWith(MEGHIVO_ELOTAG) && sz.length < 600 && /^[A-Za-z0-9_:-]+$/.test(sz) && meghivoE(sz)
    && r.meghivo?.koino === K && r.meghivo.alairo === T && r.meghivo.azonosito === jelek.azonosito
    && r.meghivo.titok === jelek.titok && r.meghivo.meghivottNev === 'Kovács Anna' && r.meghivo.lejarat === LEJAR
    && r.meghivo.profilMezok.join() === 'nev,telepules' && JSON.stringify(r.meghivo.cimek) === JSON.stringify(CIMEK)
    && MEGHIVO_ELETTARTAM === 30 * 24 * 3600 * 1000;
});

// Rontás: az olvasás csak a szöveg elejéről → a telepítő sorral és a körülvett üzenettel bukik; a szóköz-kihagyó második próba
// nélkül a tördelt bukik.
proba('⭐ a TELEPÍTŐ SOR a meghívóval egy szöveg, és a lap ebből is kiolvassa — a körülvett és a tördelt meghívó is olvasható', () => {
  const sz = meghivoKeszitese(alap());
  const sor = telepitoSorMeghivoval(sz);
  const torzs = sz.slice(MEGHIVO_ELOTAG.length);
  const tordelt = meghivoOlvasasa(MEGHIVO_ELOTAG + torzs.slice(0, 40) + '\n' + torzs.slice(40, 90) + '\r\n ' + torzs.slice(90));
  return sor.startsWith(TELEPITO_SOR + ' ') && sor.endsWith(sz)
    && meghivoOlvasasa(sor).meghivo?.titok === jelek.titok
    && meghivoOlvasasa('Szia! Ez a meghívóm: ' + sz + ' — köszi!\n').meghivo?.koino === K
    && meghivoOlvasasa(sz + '. Holnap találkozunk.').meghivo?.alairo === T
    && tordelt.meghivo?.koino === K && tordelt.meghivo.cimek.length === 2;
});

// Rontás: az alak-ellenőrzések bármelyike nélkül a megfelelő hibás meghívó „ép” lesz → bukik.
proba('⛔ a hibás meghívóból semmi nem lesz — előtag, jelek, tartalom, a nevek, a címek, a titok, a név, a lejárat, a hossz; a régi alakú: „kérj újat”', () => {
  const esetek = [
    K,                                                                                  // puszta név
    MEGHIVO_ELOTAG + '!!!!',                                                            // rossz jelek
    MEGHIVO_ELOTAG + Buffer.from('nem json').toString('base64url'),                     // nem JSON
    nyersMeghivo([1, 2, 3]),                                                            // nem objektum
    nyersMeghivo({ ...jo(), k: 'rovid' }),                                              // a koinó nem 43 jeles
    nyersMeghivo({ ...jo(), t: 'x'.repeat(42) }),                                       // a kulcs nem ép
    nyersMeghivo({ ...jo(), c: [['192.168.1.134', 70000]] }),                           // rossz port
    nyersMeghivo({ ...jo(), c: Array.from({ length: MEGHIVO_CIM_KORLAT + 1 }, (_, i) => ['10.0.0.' + i, 7373]) }), // túl sok
    nyersMeghivo({ ...jo(), i: 'rövid' }),                                              // rossz azonosító
    nyersMeghivo({ ...jo(), s: 'tul-rovid' }),                                          // rossz titok
    nyersMeghivo({ ...jo(), m: '   ' }),                                                // nincs név
    nyersMeghivo({ ...jo(), l: -5 }),                                                   // rossz lejárat
    nyersMeghivo({ ...jo(), p: ['Nev!'] }),                                             // rossz profil-mező
    nyersMeghivo({ ...jo(), m: 'x'.repeat(MEGHIVO_KORLAT) })                            // túl hosszú
  ];
  const eredmenyek = esetek.map((e) => meghivoOlvasasa(e));
  const rossz = eredmenyek.filter((r) => r.meghivo || typeof r.hiba !== 'string' || !r.hiba);
  const regi = meghivoOlvasasa('koino-meghivo:1:' + Buffer.from(JSON.stringify({ k: K, t: T, c: [] })).toString('base64url'));
  if (rossz.length) process.stderr.write('    (hibás meghívó elfogadva: ' + JSON.stringify(eredmenyek) + ')\n');
  return rossz.length === 0 && meghivoOlvasasa(nyersMeghivo(jo())).meghivo?.koino === K
    && /régi alakú/.test(regi.hiba ?? '') && meghivoOlvasasa(null).hiba && !meghivoE(K);
});

// Rontás: a készítés nem szűr → a rossz cím vagy az ismétlés a szövegbe kerül, és a beolvasás az egészet elveti → bukik.
proba('a készítés a rossz címet és az ismétlést kihagyja (legfeljebb 8); a meghívott neve kötelező; a rossz koinó és titok hiba', () => {
  const cimek = [...CIMEK, CIMEK[0], { hoszt: 'rossz cím', port: 1 }, { hoszt: '10.0.0.1', port: 0 },
    ...Array.from({ length: 12 }, (_, i) => ({ hoszt: '10.1.1.' + i, port: 7373 }))];
  const r = meghivoOlvasasa(meghivoKeszitese({ ...alap(), cimek }));
  let dobott = 0;
  for (const rossz of [{ koino: 'rossz' }, { alairo: '' }, { meghivottNev: '  ' }, { titok: 'x' }, { lejarat: 0 }]) {
    try { meghivoKeszitese({ ...alap(), ...rossz }); } catch { dobott++; }
  }
  return r.meghivo?.cimek.length === MEGHIVO_CIM_KORLAT && r.meghivo.cimek[0].hoszt === '192.168.1.134'
    && !r.meghivo.cimek.some((c) => c.hoszt === 'rossz cím' || c.port === 0) && dobott === 5;
});

// Rontás: a bizonyíték nem köti a személyt (vagy a horgonyt, a koinót) → egy másik belépőé is elfogadható → bukik; a titok nem
// számít → a rossz titokkal készült is elfogadható → bukik.
proba('⭐⭐ a bizonyíték: a helyes titokkal elfogadható; a koinóra, a SZEMÉLYRE és a HORGONYRA kötött — más, vagy más titok: elutasítva', () => {
  const kotes = { koino: K, szemely: azonosito(), horgony: azonosito() };
  const b = meghivoBizonyitek(jelek.titok, kotes);
  const masTitok = ujMeghivoJelei().titok;
  return bizonyitekEllenorzese(jelek.titok, b, kotes)
    && !bizonyitekEllenorzese(jelek.titok, b, { ...kotes, szemely: azonosito() })
    && !bizonyitekEllenorzese(jelek.titok, b, { ...kotes, horgony: azonosito() })
    && !bizonyitekEllenorzese(jelek.titok, b, { ...kotes, koino: T })
    && !bizonyitekEllenorzese(masTitok, b, kotes)
    && !bizonyitekEllenorzese(jelek.titok, meghivoBizonyitek(masTitok, kotes), kotes)
    && !bizonyitekEllenorzese(jelek.titok, 'rossz', kotes) && !bizonyitekEllenorzese(jelek.titok, b, { ...kotes, horgony: 'x' })
    && /^[A-Za-z0-9_-]{43}$/.test(b) && ujMeghivoJelei().azonosito !== jelek.azonosito;
});

// ===== ⭐ A WINDOWSOS TELEPÍTŐ SOR (elágazás 232 — a terepi lelet: a Termux-sor a Windows parancssorában az első szónál megállt) =====

const KOINO_MAPPA = join(dirname(fileURLToPath(import.meta.url)), '..');
const WINDOWS_SZKRIPTEK = ['windows/telepit.ps1', 'windows/indit.ps1'];

// Rontás: a windowsos sor nem a meghívóval végződik, vagy egy `$`-t / `%`-ot / belső idézőjelet kap → bukik; az őr nem nézi a
// jeleket → a rossz sorok „épek” → bukik.
proba('⭐ a WINDOWSOS sor: ugyanaz a meghívó a végén, a lap kiolvassa, a tárolt sorból is előáll; és az őr megfogja, amit egy héj kibontana', () => {
  const sz = meghivoKeszitese(alap());
  const sor = windowsTelepitoSorMeghivoval(sz);
  const rosszak = [
    WINDOWS_TELEPITO_SOR.replace('cd ~;', 'cd $HOME;'), WINDOWS_TELEPITO_SOR.replace('cd ~;', 'cd %USERPROFILE%;'),
    WINDOWS_TELEPITO_SOR.replace('cd ~;', 'cd "~";'), WINDOWS_TELEPITO_SOR.replace('cd ~;', 'cd `~;'),
    WINDOWS_TELEPITO_SOR.replace('cd ~;', 'cd ~!;'), WINDOWS_TELEPITO_SOR + ' ' + sz + ' & del *', 'cmd /c ' + sz
  ];
  return sor.startsWith(WINDOWS_TELEPITO_SOR + ' ') && sor.endsWith(' ' + sz) && windowsSorHibaja(sor) === null
    && windowsSorHibaja(WINDOWS_TELEPITO_SOR) === null && meghivoOlvasasa(sor).meghivo?.titok === jelek.titok
    && meghivoSzovegbol(telepitoSorMeghivoval(sz)) === sz && meghivoSzovegbol(sor) === sz && meghivoSzovegbol('nincs') === null
    && rosszak.every((r) => windowsSorHibaja(r) !== null);
});

// Rontás: a sor máshol keresi a telepítőt (vagy a fájl hiányzik — a meglévő vagy a letöltött helyen); a .ps1 BOM nélkül kerül a
// tárba → bukik.
proba('⭐ a windowsos telepítő ott van, ahol a sor keresi (a meglévő és a letöltött helyen is); a két .ps1 UTF-8 BOM-mal (és van bennük magyar betű), a koino.cmd csak ASCII', () => {
  const utak = [...WINDOWS_TELEPITO_SOR.matchAll(/& \.\\(\S+?\\telepit\.ps1)/g)].map((m) => m[1].replace(/\\/g, '/'));
  const vizsgalt = WINDOWS_TELEPITO_SOR.match(/Test-Path (\S+?\\telepit\.ps1)/)?.[1]?.replace(/\\/g, '/');
  const bomos = WINDOWS_SZKRIPTEK.every((f) => {
    const b = readFileSync(join(KOINO_MAPPA, f));
    return b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF && /[^\x00-\x7F]/.test(b.subarray(3).toString('utf8'));
  });
  const cmd = readFileSync(join(KOINO_MAPPA, 'windows/koino.cmd'));
  return utak.length === 2 && utak[0] === WINDOWS_UJ_MAPPA + '/koino_1.1-main/koino/' + WINDOWS_TELEPITO_UT && vizsgalt === utak[0]
    && utak[1] === 'koino_1.1/koino/' + WINDOWS_TELEPITO_UT
    && WINDOWS_SZKRIPTEK.every((f) => existsSync(join(KOINO_MAPPA, f))) && bomos
    && cmd.every((x) => x < 0x80) && /indit\.ps1/.test(cmd.toString('latin1'));
});

const futtat = (fajl, ervek, beallitas = {}) => new Promise((teljesul) => {
  execFile(fajl, ervek, { timeout: 60000, windowsHide: true, ...beallitas },
    (hiba, ki, hibaKi) => teljesul({ kod: hiba ? (hiba.code ?? 1) : 0, ki: String(ki) + String(hibaKi) }));
});

// Rontás: egy szintaktikai hiba a szkriptben (pl. egy hiányzó zárójel) → bukik.
proba('⭐ (Windowson) a PowerShell hibátlanul értelmezi a két szkriptet és a sor parancsát', async () => {
  if (process.platform !== 'win32') { process.stdout.write('    (nem Windows — kihagyva)\n'); return true; }
  const ideiglenes = await mkdtemp(join(tmpdir(), 'koino-windows-'));
  try {
    const sor = windowsTelepitoSorMeghivoval(meghivoKeszitese(alap()));
    const parancsFajl = join(ideiglenes, 'parancs.ps1');
    await writeFile(parancsFajl, sor.slice(sor.indexOf('"') + 1, sor.lastIndexOf('"')) + sor.slice(sor.lastIndexOf('"') + 1));
    const fajlok = [...WINDOWS_SZKRIPTEK.map((f) => join(KOINO_MAPPA, f)), parancsFajl];
    const vizsga = "$h = 0; foreach ($f in $env:KOINO_PS_FAJLOK.Split('|')) { $e = $null; "
      + '[void][System.Management.Automation.Language.Parser]::ParseFile($f, [ref]$null, [ref]$e); '
      + "if ($e.Count) { Write-Output ($f + ': ' + $e[0].Message); $h++ } }; Write-Output ('HIBAK:' + $h)";
    const r = await futtat('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand',
      Buffer.from(vizsga, 'utf16le').toString('base64')], { env: { ...process.env, KOINO_PS_FAJLOK: fajlok.join('|') } });
    const ok = /HIBAK:0/.test(r.ki);
    if (!ok) process.stderr.write('    (PowerShell: ' + r.ki.slice(0, 600) + ')\n');
    return ok;
  } finally {
    await rm(ideiglenes, { recursive: true, force: true });
  }
});

// ===== ⭐⭐ D123 (PR7): A TELEPÍTŐ SOR FRISSÍT IS =====

// A helyettes telepítő (Windows): felírja, honnan jött, hol fut, és mit kapott.
const helyettesTelepito = (forras) => "[IO.File]::WriteAllText((Join-Path (Get-Location).Path 'kapott.json'), (ConvertTo-Json -Compress "
  + "@{ forras = '" + forras + "'; hely = (Get-Location).Path; ervek = @($args) }))\r\n";
const kapottOlvasasa = async (otthon) => {
  try { return JSON.parse((await readFile(join(otthon, 'kapott.json'), 'utf8')).replace(/^﻿/, '')); } catch { return null; }
};
// A sor letöltő része — a próba ezt cseréli le (a hálózat helyett egy helyi zip, vagy egy biztosan elérhetetlen cím).
const LETOLTES = 'curl.exe -fL -o koino_1.1.zip https://github.com/Biszt/koino_1.1/archive/refs/heads/main.zip';
const torolve = (...utak) => Promise.all(utak.map((u) => rm(u, { recursive: true, force: true })));

// ⭐ A sor VISELKEDÉSE a két héjban, három esetben — egy ideiglenes „otthon”, a letöltés helyén egy helyi zip (benne egy helyettes
// ÚJ telepítő) vagy egy elérhetetlen cím; a meglévő program is egy helyettes telepítő. Rontás: (a) a blokk `@args` nélkül → a
// telepítő nem kapja a meghívót → bukik; (b) a sor nem távolítja el előbb a régi letöltés maradékát → hálózat nélkül a maradékot
// (vagy a régi zip-et) futtatja → bukik; (c) a választás fordítva → bukik; (d) a meghívó az idézőjelen belül, vagy egy héj által
// kibontott jel (`$`, `%`) → az átadott argumentum más → bukik.
proba('⭐⭐ (Windowson) PR7: a sor a cmd-ben ÉS a PowerShellben — friss gépen és frissítéskor az ÚJ telepítőt, hálózat nélkül a meglévőt hívja (a régi letöltés maradékát nem), a meghívót EGY argumentumként', async () => {
  if (process.platform !== 'win32') { process.stdout.write('    (nem Windows — kihagyva)\n'); return true; }
  const otthon = await mkdtemp(join(tmpdir(), 'koino-windows-otthon-'));
  try {
    // a „letöltött” csomag: koino_1.1-main\koino\windows\telepit.ps1 egy zip-ben (mint a GitHubé)
    const csomag = join(otthon, 'csomag');
    await mkdir(join(csomag, 'koino_1.1-main', 'koino', 'windows'), { recursive: true });
    await writeFile(join(csomag, 'koino_1.1-main', 'koino', ...WINDOWS_TELEPITO_UT.split('/')), helyettesTelepito('uj'));
    const z = await futtat('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', "Compress-Archive -Path '"
      + join(csomag, 'koino_1.1-main') + "' -DestinationPath '" + join(otthon, 'kesz.zip') + "'"]);
    if (!existsSync(join(otthon, 'kesz.zip'))) { process.stderr.write('    (a zip nem készült el: ' + z.ki.slice(0, 300) + ')\n'); return false; }
    const sz = meghivoKeszitese(alap());
    const sor = windowsTelepitoSorMeghivoval(sz);
    if (!sor.includes(LETOLTES)) { process.stderr.write('    (a sor letöltő része megváltozott — a próbát is igazítsd)\n'); return false; }
    const meglevo = async () => {
      await mkdir(join(otthon, 'koino_1.1', 'koino', 'windows'), { recursive: true });
      await writeFile(join(otthon, 'koino_1.1', 'koino', ...WINDOWS_TELEPITO_UT.split('/')), helyettesTelepito('regi'));
    };
    const esetek = [
      ['friss gépen', 'Copy-Item kesz.zip koino_1.1.zip', async () => {}, 'uj'],
      ['hálózat nélkül', 'curl.exe -fsL -o koino_1.1.zip http://127.0.0.1:9/', async () => {
        await meglevo();
        // egy korábbi letöltés maradéka: egy kicsomagolt mappa és egy zip — egyiket sem szabad használni
        await mkdir(join(otthon, WINDOWS_UJ_MAPPA, 'koino_1.1-main', 'koino', 'windows'), { recursive: true });
        await writeFile(join(otthon, WINDOWS_UJ_MAPPA, 'koino_1.1-main', 'koino', ...WINDOWS_TELEPITO_UT.split('/')), helyettesTelepito('maradek'));
        await writeFile(join(otthon, 'koino_1.1.zip'), await readFile(join(otthon, 'kesz.zip')));
      }, 'regi'],
      ['frissítéskor', 'Copy-Item kesz.zip koino_1.1.zip', meglevo, 'uj']
    ];
    const env = { ...process.env, USERPROFILE: otthon, HOMEDRIVE: '', HOMEPATH: '' };
    let mind = true;
    for (const [esetNev, letoltes, elokeszites, vart] of esetek) {
      const esetSor = sor.replace(LETOLTES, letoltes);
      for (const [nev, fajl, tartalom, inditas] of [
        ['cmd', 'sor.cmd', '@echo off\r\n' + esetSor + '\r\n', (f) => ['cmd.exe', ['/d', '/c', f]]],
        ['powershell', 'sor.ps1', esetSor + '\r\n', (f) => ['powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', f]]]
      ]) {
        await torolve(...['koino_1.1', WINDOWS_UJ_MAPPA, 'koino_1.1.zip', 'kapott.json'].map((f) => join(otthon, f)));
        await elokeszites();
        await writeFile(join(otthon, fajl), tartalom);
        const [exe, e] = inditas(join(otthon, fajl));
        const r = await futtat(exe, e, { env, cwd: tmpdir() });
        const kapott = await kapottOlvasasa(otthon);
        const ervekLista = [].concat(kapott?.ervek ?? []);
        const jo = kapott?.forras === vart && kapott.hely?.toLowerCase() === otthon.toLowerCase()
          && ervekLista.length === 1 && ervekLista[0] === sz && !existsSync(join(otthon, 'koino_1.1.zip'))
          && (vart === 'uj' || !existsSync(join(otthon, WINDOWS_UJ_MAPPA)));
        if (!jo) process.stderr.write('    (' + esetNev + ', ' + nev + ': ' + JSON.stringify(kapott) + ' | ' + r.ki.slice(0, 400) + ')\n');
        mind = mind && jo;
      }
    }
    return mind;
  } finally {
    await rm(otthon, { recursive: true, force: true });
  }
});

// ----- a valódi windowsos telepítő cseréje (KOINO_INDITAS=nem: csak frissít és leállít) -----

const VALODI_WINDOWS_TELEPITO = join(KOINO_MAPPA, 'windows', 'telepit.ps1');
const FUTO_PROGRAM = 'setInterval(() => {}, 1000);\n';
// A régi „koino” a saját mappájában áll (mint egy folyamat, ami a mappát fogja — mérve: amíg ott áll, a mappa nem nevezhető át):
// ha a telepítő a csere ELŐTT nem állítja le, a csere nem sikerül. (A csere utáni második kör a régi folyamatot amúgy is
// leállítaná — e nélkül a próba nem mérné a sorrendet; a rontás mutatta meg.)
const FUTO_ZAROLO = "process.chdir(require('path').dirname(process.argv[1])); setInterval(() => {}, 1000);\n";
const fut = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const leallt = (p) => p.exitCode !== null || p.signalCode !== null || !fut(p.pid);
const vart = (ms) => new Promise((t) => setTimeout(t, ms));

// Egy otthon: a meglévő program (egy helyettes telepítő, egy jel és egy „koino.js”), egy még régebbi generáció, és a letöltött
// új program (a VALÓDI telepítő, a lényeges fájlok helyettesei, egy jel); és egy másik mappa „koinója”.
async function frissitesOtthona(otthon, { git = false } = {}) {
  const regi = join(otthon, 'koino_1.1');
  await mkdir(join(regi, 'koino', 'windows'), { recursive: true });
  await writeFile(join(regi, 'koino', 'windows', 'telepit.ps1'), helyettesTelepito('regi'));
  await writeFile(join(regi, 'koino', 'koino.js'), FUTO_ZAROLO);
  await writeFile(join(regi, 'regi.txt'), 'régi');
  if (git) await mkdir(join(regi, '.git'));
  await mkdir(join(otthon, 'koino_1.1-regi'), { recursive: true });
  await writeFile(join(otthon, 'koino_1.1-regi', 'regebbi.txt'), 'még régebbi');
  const uj = join(otthon, WINDOWS_UJ_MAPPA, 'koino_1.1-main');
  for (const f of ['koino/js/esemeny/esemeny.js', 'koino/felulet/index.html', 'koino/windows/indit.ps1']) {
    await mkdir(dirname(join(uj, f)), { recursive: true });
    await writeFile(join(uj, f), '');
  }
  await writeFile(join(uj, 'koino', 'koino.js'), FUTO_PROGRAM);
  await writeFile(join(uj, 'koino', 'windows', 'telepit.ps1'), readFileSync(VALODI_WINDOWS_TELEPITO));
  await writeFile(join(uj, 'uj.txt'), 'új');
  await mkdir(join(otthon, 'mas', 'koino'), { recursive: true });
  await writeFile(join(otthon, 'mas', 'koino', 'koino.js'), FUTO_PROGRAM);
  return join(uj, 'koino', 'windows', 'telepit.ps1');
}

const ujTelepitoFuttatasa = (otthon, telepito, sz) => futtat('powershell.exe',
  ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', telepito, sz], { env: { ...process.env, KOINO_INDITAS: 'nem' }, cwd: otthon });

// ⭐⭐ A csere: a futó régi koino leáll (a másik mappáé nem), a régi a `koino_1.1-regi`-be, az új a helyére, a letöltés mappája
// eltűnik, és a régi telepítő NEM fut. Rontás: (a) a leállítás kimarad → a régi „koino.js” tovább fut → bukik; (b) a leállítás
// mintája túl tág (csak `koino.js`) → a másik mappáé is leáll → bukik; (c) a régebbi generáció nem törlődik / a régi nem kerül
// a `-regi`-be → bukik.
proba('⭐⭐ (Windowson) PR7: a letöltött telepítő leállítja a régi mappából futó koinót (a másikét nem), cserél (a régi a koino_1.1-regi-be), és a helyén folytat', async () => {
  if (process.platform !== 'win32') { process.stdout.write('    (nem Windows — kihagyva)\n'); return true; }
  const otthon = realpathSync.native(await mkdtemp(join(tmpdir(), 'koino-csere-')));
  const folyamatok = [];
  try {
    const telepito = await frissitesOtthona(otthon);
    const a = spawn(process.execPath, [join(otthon, 'koino_1.1', 'koino', 'koino.js')], { cwd: tmpdir(), stdio: 'ignore', windowsHide: true });
    const b = spawn(process.execPath, [join(otthon, 'mas', 'koino', 'koino.js')], { cwd: tmpdir(), stdio: 'ignore', windowsHide: true });
    folyamatok.push(a, b);
    await vart(500);
    const sz = meghivoKeszitese(alap());
    const r = await ujTelepitoFuttatasa(otthon, telepito, sz);
    await vart(300);
    const jo = {
      kod: r.kod === 0, aLeallt: leallt(a), bFut: !leallt(b),
      ujAHelyen: existsSync(join(otthon, 'koino_1.1', 'uj.txt')) && !existsSync(join(otthon, 'koino_1.1', 'regi.txt')),
      regiMegvan: existsSync(join(otthon, 'koino_1.1-regi', 'regi.txt')) && !existsSync(join(otthon, 'koino_1.1-regi', 'regebbi.txt')),
      letoltesEltunt: !existsSync(join(otthon, WINDOWS_UJ_MAPPA)),
      regiTelepitoNemFutott: (await kapottOlvasasa(otthon)) === null,
      kimondja: /frissült/.test(r.ki) && /leállítottam/.test(r.ki)
    };
    const ok = Object.values(jo).every(Boolean);
    if (!ok) process.stderr.write('    (' + JSON.stringify(jo) + ' | ' + r.ki.slice(0, 600) + ')\n');
    return ok;
  } finally {
    for (const p of folyamatok) p.kill();
    await vart(200);
    await rm(otthon, { recursive: true, force: true });
  }
});

// ⭐ Ha a csere nem lehetséges, a régi marad, és a régi telepítő folytat (a meghívóval) — kimondva: (1) egy másik folyamat a régi
// mappában áll (mérve: amíg egy folyamat munkakönyvtára ott van, a mappa nem nevezhető át); (2) a meglévő egy git-tár. Rontás: (a)
// a git-őr kimarad → a git-tárat lecseréli → bukik; (b) a hibánál nem a meglévő telepítő folytat → bukik; (c) a letöltés mappája
// hiba után is megmarad → bukik.
proba('⭐ (Windowson) PR7: ha a régi mappát egy folyamat fogja, vagy git-tár, a telepítő nem cserél — a régi marad, a régi telepítő folytat a meghívóval, kimondva', async () => {
  if (process.platform !== 'win32') { process.stdout.write('    (nem Windows — kihagyva)\n'); return true; }
  const eredmeny = {};
  for (const [nev, git, minta] of [['zárolt', false, /nem frissült: a csere nem sikerült/], ['git-tár', true, /git-tár/]]) {
    const otthon = realpathSync.native(await mkdtemp(join(tmpdir(), 'koino-csere-')));
    const folyamatok = [];
    try {
      const telepito = await frissitesOtthona(otthon, { git });
      if (!git) {
        // egy folyamat, ami nem a koino (nem áll le), de a régi mappában áll
        folyamatok.push(spawn(process.execPath, ['-e', FUTO_PROGRAM], { cwd: join(otthon, 'koino_1.1'), stdio: 'ignore', windowsHide: true }));
        await vart(500);
      }
      const sz = meghivoKeszitese(alap());
      const r = await ujTelepitoFuttatasa(otthon, telepito, sz);
      const kapott = await kapottOlvasasa(otthon);
      const jo = {
        kod: r.kod === 0, regiTelepito: kapott?.forras === 'regi' && [].concat(kapott.ervek ?? []).join() === sz,
        regiMarad: existsSync(join(otthon, 'koino_1.1', 'regi.txt')) && !existsSync(join(otthon, 'koino_1.1', 'uj.txt')),
        letoltesEltunt: !existsSync(join(otthon, WINDOWS_UJ_MAPPA)),
        gitNemNyul: !git || (existsSync(join(otthon, 'koino_1.1', '.git')) && existsSync(join(otthon, 'koino_1.1-regi', 'regebbi.txt'))),
        kimondja: minta.test(r.ki) && /meglévő program indul/.test(r.ki)
      };
      eredmeny[nev] = Object.values(jo).every(Boolean);
      if (!eredmeny[nev]) process.stderr.write('    (' + nev + ': ' + JSON.stringify(jo) + ' | ' + r.ki.slice(0, 600) + ')\n');
    } finally {
      for (const p of folyamatok) p.kill();
      await vart(200);
      await rm(otthon, { recursive: true, force: true });
    }
  }
  return eredmeny['zárolt'] && eredmeny['git-tár'];
});

// ----- a Termux-sor: a git frissít (a próba a `pkg` nélkül futtatja, egy helyi „GitHub”-bal) -----

async function shKeresese() {
  if (process.platform !== 'win32') return 'sh';
  const r = await futtat('git', ['--exec-path']);
  const ut = r.kod === 0 ? r.ki.trim() : null;
  if (!ut) return null;
  for (const c of [join(ut, '..', '..', '..', 'bin', 'sh.exe'), join(ut, '..', '..', '..', 'usr', 'bin', 'sh.exe')]) {
    if (existsSync(c)) return c;
  }
  return null;
}

// ⭐⭐ Egy helyi forrás-tár (a GitHub helyett) két változattal: az A-n telepítve, a B a forrásban. Hálózat nélkül (a forrás címe nem
// él) a sor kimondja, hogy nem frissült, és a meglévő (A) telepítő fut; a forrással a B — a nem követett adat (`koino-adat`) marad.
// Rontás: (a) a régi sor (`[ -d ~/koino_1.1 ] || git clone …`) → a frissítés elmarad, az A fut → bukik; (b) a `|| echo …` kimarad →
// hálózat nélkül a telepítő el sem indul → bukik; (c) `git clean` is → az adat eltűnik → bukik.
proba('⭐⭐ PR7: a Termux-sor a már telepített programot FRISSÍTI (git) — a nem követett adat marad; hálózat nélkül kimondja, és a meglévő indul; a meghívó egy argumentum', async () => {
  const sh = await shKeresese();
  if (!sh || (await futtat('git', ['--version'])).kod !== 0) { process.stdout.write('    (nincs sh vagy git — kihagyva)\n'); return true; }
  const otthon = realpathSync.native(await mkdtemp(join(tmpdir(), 'koino-termux-')));
  try {
    const g = (cwd, ...e) => futtat('git', ['-c', 'user.name=proba', '-c', 'user.email=proba@koino.invalid', '-c', 'core.autocrlf=false',
      '-c', 'init.defaultBranch=main', ...e], { cwd });
    const forras = join(otthon, 'forras.git');
    const munka = join(otthon, 'munka');
    const telepitett = join(otthon, 'koino_1.1');
    const helyettes = (v) => "#!/bin/sh\nprintf '%s|%s|%s\\n' " + v + ' "$#" "$1" > "$HOME/kapott.txt"\n';
    const valtozat = async (v) => {
      await writeFile(join(munka, 'koino', 'termux', 'telepit.sh'), helyettes(v));
      await g(munka, 'add', '-A');
      await g(munka, 'commit', '-q', '-m', v);
      return g(munka, 'push', '-q', forras, 'HEAD:refs/heads/main');
    };
    await g(otthon, 'init', '-q', '--bare', forras);
    await g(otthon, 'init', '-q', munka);
    await mkdir(join(munka, 'koino', 'termux'), { recursive: true });
    await valtozat('A');
    const forrasCim = pathToFileURL(forras).href;
    await g(otthon, 'clone', '-q', forrasCim, telepitett);
    await g(telepitett, 'config', 'core.autocrlf', 'false');
    await mkdir(join(telepitett, 'koino-adat'), { recursive: true });
    await writeFile(join(telepitett, 'koino-adat', 'kulcs.json'), 'a kulcsom');
    await valtozat('B');
    const sz = meghivoKeszitese(alap());
    if (!TELEPITO_SOR.startsWith(TELEPITO_SOR_CSOMAGOK)) { process.stderr.write('    (a sor eleje megváltozott)\n'); return false; }
    const sor = TELEPITO_SOR.slice(TELEPITO_SOR_CSOMAGOK.length) + ' ' + sz;
    const futtatas = async () => {
      await rm(join(otthon, 'kapott.txt'), { force: true });
      const r = await futtat(sh, ['-c', sor], { env: { ...process.env, HOME: otthon }, cwd: tmpdir() });
      let k = null; try { k = (await readFile(join(otthon, 'kapott.txt'), 'utf8')).trim(); } catch { /* nem futott */ }
      return { r, k };
    };
    await g(telepitett, 'remote', 'set-url', 'origin', pathToFileURL(join(otthon, 'nincs.git')).href);
    const halozatNelkul = await futtatas();
    await g(telepitett, 'remote', 'set-url', 'origin', forrasCim);
    const frissitve = await futtatas();
    const adat = await readFile(join(telepitett, 'koino-adat', 'kulcs.json'), 'utf8').catch(() => null);
    const jo = {
      halozatNelkul: halozatNelkul.k === 'A|1|' + sz && /nem frissült/.test(halozatNelkul.r.ki),
      frissitve: frissitve.k === 'B|1|' + sz,
      adatMarad: adat === 'a kulcsom'
    };
    const ok = Object.values(jo).every(Boolean);
    if (!ok) process.stderr.write('    (' + JSON.stringify(jo) + ' | ' + halozatNelkul.r.ki.slice(0, 300) + ' | ' + frissitve.r.ki.slice(0, 300) + ')\n');
    return ok;
  } finally {
    await rm(otthon, { recursive: true, force: true });
  }
});

// ⭐ (Termuxon / Linuxon, ahol van `pkill`) a valódi telepit.sh leállítja az ebből a mappából futó régi koinót — a másik mappáét nem.
// Rontás: (a) a leállítás kimarad → a régi „koino.js” fut → bukik; (b) a minta túl tág → a másik is leáll → bukik.
proba('⭐ (Termuxon) PR7: a telepit.sh leállítja az ebből a mappából futó régi koinót (a másikét nem), és a `koino` parancsot felveszi', async () => {
  if (process.platform === 'win32' || !(await futtat('sh', ['-c', 'command -v pkill'])).ki.trim()) {
    process.stdout.write('    (nincs pkill — kihagyva; a telefonon fut)\n');
    return true;
  }
  const otthon = realpathSync.native(await mkdtemp(join(tmpdir(), 'koino-termux-')));
  const folyamatok = [];
  try {
    const konyvtar = join(otthon, 'koino_1.1', 'koino');
    await mkdir(join(konyvtar, 'termux'), { recursive: true });
    await writeFile(join(konyvtar, 'termux', 'telepit.sh'), readFileSync(join(KOINO_MAPPA, 'termux', 'telepit.sh')));
    await writeFile(join(konyvtar, 'koino.js'), FUTO_PROGRAM);
    await mkdir(join(otthon, 'mas', 'koino'), { recursive: true });
    await writeFile(join(otthon, 'mas', 'koino', 'koino.js'), FUTO_PROGRAM);
    await mkdir(join(otthon, 'prefix', 'bin'), { recursive: true });
    const a = spawn(process.execPath, [join(konyvtar, 'koino.js')], { stdio: 'ignore' });
    const b = spawn(process.execPath, [join(otthon, 'mas', 'koino', 'koino.js')], { stdio: 'ignore' });
    folyamatok.push(a, b);
    await vart(500);
    const r = await futtat('sh', [join(konyvtar, 'termux', 'telepit.sh')],
      { env: { ...process.env, PREFIX: join(otthon, 'prefix'), HOME: otthon, KOINO_INDITAS: 'nem' } });
    await vart(300);
    const jo = { kod: r.kod === 0, aLeallt: leallt(a), bFut: !leallt(b),
      parancs: existsSync(join(otthon, 'prefix', 'bin', 'koino')), kimondja: /leállítottam/.test(r.ki) };
    const ok = Object.values(jo).every(Boolean);
    if (!ok) process.stderr.write('    (' + JSON.stringify(jo) + ' | ' + r.ki.slice(0, 400) + ')\n');
    return ok;
  } finally {
    for (const p of folyamatok) p.kill();
    await vart(200);
    await rm(otthon, { recursive: true, force: true });
  }
});

// ⭐⭐ M8: A MEGHÍVÓ REKESZE (a belépő megtalálása — a 87. mérés lelete: a BEP 5 cetli elvész és hamisítódik, a BEP 44 megtalálható).
// A meghívó titkából mindkét fél ugyanazt a kulcspárt, sót és titkosító kulcsot számolja; a belépő ide írja ki a címeit, a meghívó
// innen olvassa. Rontás: (a) a só nem a titokból (fix) → két meghívó rekesze egy helyre esne → bukik; (b) a titkosító kulcs a
// kulcspár magjából (nem külön cimkével) → a „független” ág bukik; (c) az alak nincs ellenőrizve → az idegen alakú tartalom
// átmegy → bukik; (d) a címlista nincs korlátozva → bukik.
proba('⭐⭐ M8: a meghívó rekesze — a két fél ugyanazt számolja, más titokkal se megtalálni, se olvasni nem lehet, a bejegyzés aláírt', async () => {
  const titok = ujMeghivoJelei().titok;
  const masik = ujMeghivoJelei().titok;
  const alairo = randomBytes(32).toString('base64url');
  const cimek = [{ hoszt: '203.0.113.7', port: 41777 }, { hoszt: '192.168.1.5', port: 7373 }, { hoszt: '192.168.1.5', port: 7373 },
    { hoszt: 'rossz cím!', port: 1 }, { hoszt: '10.0.0.2', port: 70000 }, { hoszt: '10.0.0.3', port: 7373 }, { hoszt: '10.0.0.4', port: 7373 },
    { hoszt: '10.0.0.5', port: 7373 }, { hoszt: '10.0.0.6', port: 7373 }];
  const most = Date.UTC(2026, 10, 5, 12, 0, 0);
  const b = await rekeszBejegyzes(titok, { cimek, alairo, most });
  const r1 = await meghivoRekesze(titok);
  const r2 = await meghivoRekesze(titok);
  const rm = await meghivoRekesze(masik);
  const ki = await rekeszBejegyzesbol(titok, b.ertek);
  const kiMas = await rekeszBejegyzesbol(masik, b.ertek);
  // a sértett tartalom (egy bájt átírva) nem olvasható
  const nyers = Buffer.from(String(b.ertek), 'base64url');
  nyers[nyers.length - 1] ^= 1;
  const serult = await rekeszBejegyzesbol(titok, nyers.toString('base64url'));
  const celSajat = await valtozoCel(r1.kulcs, r1.so);
  const celMas = await valtozoCel(rm.kulcs, rm.so);
  const jo = {
    ugyanaz: Buffer.compare(r1.kulcs, r2.kulcs) === 0 && Buffer.compare(r1.so, r2.so) === 0 && Buffer.compare(r1.kulcs, Buffer.from(b.k)) === 0,
    aSoA20: r1.so.length === 20 && Buffer.compare(Buffer.from(b.salt), r1.so) === 0,
    masHely: Buffer.compare(rm.kulcs, r1.kulcs) !== 0 && Buffer.compare(rm.so, r1.so) !== 0 && Buffer.compare(celSajat, celMas) !== 0,
    alairva: await bejegyzesEllenorzese({ k: b.k, salt: b.salt, seq: b.seq, v: bencodeKodol(b.ertek), sig: b.sig }),
    seq: b.seq === Math.floor(most / 1000),
    olvashato: ki?.alairo === alairo && ki.mikor === most && ki.cimek.length === REKESZ_CIM_KORLAT
      && ki.cimek[0].hoszt === '203.0.113.7' && ki.cimek[1].hoszt === '192.168.1.5' && ki.cimek[2].hoszt === '10.0.0.3',
    masTitokkal: kiMas === null,
    serult: serult === null,
    // a tartalom nem nyílt: a cím a bejegyzés értékében nem olvasható
    rejtett: !String(b.ertek).includes('203.0.113.7') && !Buffer.from(String(b.ertek), 'base64url').toString('latin1').includes('203.0.113.7')
  };
  if (!Object.values(jo).every(Boolean)) console.log('    (ami bukott: ' + Object.keys(jo).filter((k) => !jo[k]).join(', ') + ')');
  return Object.values(jo).every(Boolean);
});

// ⭐ M8: a kívülről jött tartalom alakja — a rossz titok, az üres címlista, a rossz tábla-aláíró nem lesz bejegyzés; egy idegen alakú
// (de a titokkal titkosított) tartalom nem lesz cím. Rontás: az alak ellenőrzése nélkül az idegen alakú tartalom átmegy → bukik.
proba('⭐ M8: a rekesz alakja — rossz titok, üres címlista, rossz aláíró nem lesz bejegyzés; az idegen alakú tartalom nem cím', async () => {
  const titok = ujMeghivoJelei().titok;
  const alairo = randomBytes(32).toString('base64url');
  const dob = async (fn) => { try { await fn(); return false; } catch { return true; } };
  // egy idegen alakú tartalom ugyanazzal a kulccsal titkosítva (mintha egy régi vagy hamis program írta volna)
  const r = await meghivoRekesze(titok);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const zart = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, r.aes,
    new TextEncoder().encode(JSON.stringify({ a: 'valami-mas', c: [['10.0.0.1', 7373]], t: alairo, m: 1 })));
  const idegen = Buffer.concat([Buffer.from(iv), Buffer.from(zart)]).toString('base64url');
  const jo = {
    rosszTitok: await dob(() => rekeszBejegyzes('rövid', { cimek: [{ hoszt: '10.0.0.1', port: 1 }], alairo })),
    uresCimek: await dob(() => rekeszBejegyzes(titok, { cimek: [{ hoszt: 'rossz cím', port: 1 }], alairo })),
    rosszAlairo: await dob(() => rekeszBejegyzes(titok, { cimek: [{ hoszt: '10.0.0.1', port: 1 }], alairo: 'x' })),
    idegenAlak: (await rekeszBejegyzesbol(titok, idegen)) === null,
    szemet: (await rekeszBejegyzesbol(titok, 'nem base64 !!')) === null && (await rekeszBejegyzesbol(titok, '')) === null
  };
  if (!Object.values(jo).every(Boolean)) console.log('    (ami bukott: ' + Object.keys(jo).filter((k) => !jo[k]).join(', ') + ')');
  return Object.values(jo).every(Boolean);
});

// ⭐ M2 (B2 (b) — Csaba, 2026-11-04): a rekesz keresésének üteme a meghívó kora szerint lépcsőzve — az első órában 2, az első napban
// 5, utána 10 percenként. Rontás: a lépcső nélkül (mindig 10 perc) → bukik.
proba('⭐ M2: a rekesz keresésének üteme — az első órában 2, az első napban 5, utána 10 percenként', () => {
  const t0 = Date.UTC(2026, 10, 5, 12, 0, 0);
  const ora = 3600 * 1000;
  const jo = {
    elsoOra: rekeszKeresesKoze(t0, t0) === REKESZ_KOZ_ELSO_ORA && rekeszKeresesKoze(t0, t0 + ora - 1) === 2 * 60 * 1000,
    elsoNap: rekeszKeresesKoze(t0, t0 + ora) === REKESZ_KOZ_ELSO_NAP && rekeszKeresesKoze(t0, t0 + 24 * ora - 1) === 5 * 60 * 1000,
    utana: rekeszKeresesKoze(t0, t0 + 24 * ora) === REKESZ_KOZ_UTANA && rekeszKeresesKoze(t0, t0 + 29 * 24 * ora) === 10 * 60 * 1000,
    ismeretlen: rekeszKeresesKoze(undefined, t0) === REKESZ_KOZ_ELSO_ORA
  };
  if (!Object.values(jo).every(Boolean)) console.log('    (ami bukott: ' + Object.keys(jo).filter((k) => !jo[k]).join(', ') + ')');
  return Object.values(jo).every(Boolean);
});

export default futtatas;
