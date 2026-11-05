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
//     szkripteket, és a sor a cmd-ben ÉS a PowerShellben is egyetlen argumentumként adja át a meghívót a telepítőnek.

import { randomBytes } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  meghivoKeszitese, meghivoOlvasasa, meghivoE, telepitoSorMeghivoval, meghivoBizonyitek, bizonyitekEllenorzese, ujMeghivoJelei,
  windowsTelepitoSorMeghivoval, meghivoSzovegbol, windowsSorHibaja,
  MEGHIVO_ELOTAG, MEGHIVO_CIM_KORLAT, MEGHIVO_KORLAT, MEGHIVO_ELETTARTAM, TELEPITO_SOR, WINDOWS_TELEPITO_SOR, WINDOWS_TELEPITO_UT
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

// Rontás: a sor máshol keresi a telepítőt (vagy a fájl hiányzik); a .ps1 BOM nélkül kerül a tárba → bukik.
proba('⭐ a windowsos telepítő ott van, ahol a sor keresi; a két .ps1 UTF-8 BOM-mal (és van bennük magyar betű), a koino.cmd csak ASCII', () => {
  const ut = WINDOWS_TELEPITO_SOR.match(/& \.\\koino_1\.1\\koino\\(\S+?)"/)?.[1]?.replace(/\\/g, '/');
  const bomos = WINDOWS_SZKRIPTEK.every((f) => {
    const b = readFileSync(join(KOINO_MAPPA, f));
    return b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF && /[^\x00-\x7F]/.test(b.subarray(3).toString('utf8'));
  });
  const cmd = readFileSync(join(KOINO_MAPPA, 'windows/koino.cmd'));
  return ut === WINDOWS_TELEPITO_UT && WINDOWS_SZKRIPTEK.every((f) => existsSync(join(KOINO_MAPPA, f))) && bomos
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

// ⭐ A sor VISELKEDÉSE a két héjban: egy ideiglenes „otthon”, benne egy koino_1.1 (a letöltést a sor így kihagyja) egy
// helyettes telepítővel, ami felírja, hol fut és mit kapott. Rontás: a meghívó az idézőjelen belülre kerül, vagy a sor egy héj
// által kibontott jelet kap (`$`, `%`) → az átadott argumentum más, vagy a telepítő nem fut → bukik.
proba('⭐⭐ (Windowson) a sor a cmd-ben ÉS a PowerShellben is az otthonban futtatja a telepítőt, és a meghívót EGY argumentumként adja át', async () => {
  if (process.platform !== 'win32') { process.stdout.write('    (nem Windows — kihagyva)\n'); return true; }
  const otthon = await mkdtemp(join(tmpdir(), 'koino-windows-otthon-'));
  try {
    await mkdir(join(otthon, 'koino_1.1', 'koino', 'windows'), { recursive: true });
    await writeFile(join(otthon, 'koino_1.1', 'koino', ...WINDOWS_TELEPITO_UT.split('/')),
      "[IO.File]::WriteAllText((Join-Path (Get-Location).Path 'kapott.json'), (ConvertTo-Json -Compress @{ hely = (Get-Location).Path; "
      + 'ervek = @($args) }))\r\n');
    const sz = meghivoKeszitese(alap());
    const sor = windowsTelepitoSorMeghivoval(sz);
    const env = { ...process.env, USERPROFILE: otthon, HOMEDRIVE: '', HOMEPATH: '' };
    const eredmeny = {};
    for (const [nev, fajl, tartalom, inditas] of [
      ['cmd', 'sor.cmd', '@echo off\r\n' + sor + '\r\n', (f) => ['cmd.exe', ['/d', '/c', f]]],
      ['powershell', 'sor.ps1', sor + '\r\n', (f) => ['powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', f]]]
    ]) {
      await rm(join(otthon, 'kapott.json'), { force: true });
      await writeFile(join(otthon, fajl), tartalom);
      const [exe, e] = inditas(join(otthon, fajl));
      const r = await futtat(exe, e, { env, cwd: tmpdir() });
      let kapott = null;
      try { kapott = JSON.parse((await readFile(join(otthon, 'kapott.json'), 'utf8')).replace(/^﻿/, '')); } catch { /* nem futott */ }
      const ervekLista = [].concat(kapott?.ervek ?? []);
      eredmeny[nev] = kapott?.hely?.toLowerCase() === otthon.toLowerCase() && ervekLista.length === 1 && ervekLista[0] === sz;
      if (!eredmeny[nev]) process.stderr.write('    (' + nev + ': ' + JSON.stringify(kapott) + ' | ' + r.ki.slice(0, 400) + ')\n');
    }
    return eredmeny.cmd && eredmeny.powershell;
  } finally {
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
