// koino/meres/koinoVerzioProba.js — ⭐⭐ D119 (①a): a koino-verzió és a kód-csomag
//
// Azt bizonyítja, hogy (1) a kód-csomag egy verzióra minden készüléken ugyanazt a nevet adja: a szöveges fájlok sorvége nem
// számít (a Windows-munkakönyvtár CRLF-je), a bináris bájtra marad, az adat-mappa nem a program része, a jegyzék rendezett,
// és a fájl-tárba és vissza ugyanaz; a kívülről jött jegyzéket csak az egy alakjában fogadjuk el; (2) a futó program
// kód-csomagja a program fájljait viszi, a sorvég nélküli tartalmukkal; (3) a koino-verzió a kapun: a beágyazott gyermek-
// születés a szülő születésével ellenőrizve (a hiányzó szülő nem végleges elutasítás), és a kapu elveti az átírt születést, a
// más szerzőjét, a nem tagét, a más koinó gyermekéét, a kódjától eltérő programot és a nem legfelső szintűt; a születés
// `program`-ja csak új alakban és hivatkozás alakban; (4) a képben a koino-verzió entitás, a gyermekével és a kódjával;
// (5) ⭐ Csaba döntése („(A) Nem költözik”): a kártyára tett pont a szülő ügye — a gyermek születése elhagyja (`elhagy`),
// és a gyermek képében a testvér kártyája nem él (szellemként sem), a létrehozó többi hozott pontja igen; (6) ⭐ ①b: a kártya
// kódja igény (a jegyzék, és ha megvan, a fájljai — a kártya vállalása a kódjára is vállalás), és a törzse a teljes
// kód-csomag (64-nél több fájl), a nem kártya törzse a régi 64-ig.

import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';
import { alakiHiba, KOINO_VERZIO } from '../js/esemeny/esemeny.js';
import { bajtLenyomat } from '../js/esemeny/kanonikusAlak.js';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { esemenyMentese } from '../js/tar/esemenyTar.js';
import { koinoKepe } from '../js/allapot/ketReteg.js';
import { teljesSzabalyok } from '../js/esemeny/koinoSzabalyok.js';
import { kodCsomagKeszitese, kodCsomagTarolasa, kodJegyzekAlakja, kodJegyzekOlvasasa, programFajljai, KOD_FAJTA }
  from '../js/tar/kodCsomag.js';
import { fajlIgenyek } from '../js/allapot/fajlIgeny.js';
import { torzsLenyomatai, TORZS_KORLAT } from '../js/csere/kerelem.js';

const { proba, futtatas } = probaGyujtemeny('A koino-verzió és a kód-csomag (D119 ①a)');

const NAP = 86400 * 1000;
const T0 = Date.UTC(2026, 0, 1);
const VAGAS = T0 + 10 * NAP;
const PROGRAM = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Egy fájl-tár a memóriában (a `fajlBlobTarolo` két művelete). */
function memoriaBlob() {
  const m = new Map();
  return {
    m,
    async ir(b) { const lenyomat = await bajtLenyomat(b); m.set(lenyomat, b); return { lenyomat }; },
    async olvas(l) { return m.get(l) ?? null; }
  };
}

// ===================================
// 1. A KÓD-CSOMAG
// ===================================

proba('⭐⭐ D119 (①a): a kód-csomag sorvég nélkül — CRLF-fel és LF-fel ugyanaz a név, a bináris bájtra marad, az adat-mappa kimarad, a fájl-tárba és vissza ugyanaz',
  async () => {
    const egyik = await mkdtemp(join(tmpdir(), 'koino-kod-'));
    const masik = await mkdtemp(join(tmpdir(), 'koino-kod-'));
    try {
      const kep = new Uint8Array([0x0d, 0x0a, 1, 2, 0x0d, 0x0a]);
      await mkdir(join(egyik, 'sub'));
      await mkdir(join(egyik, 'koino-adat'));
      await mkdir(join(egyik, 'adat-mappa'));
      await writeFile(join(egyik, 'a.js'), 'x\r\ny\r\n');
      await writeFile(join(egyik, 'sub', 'b.css'), 'q\n');
      await writeFile(join(egyik, 'kep.png'), kep);
      await writeFile(join(egyik, 'koino-adat', 'esemenyek.json'), '{}');
      await writeFile(join(egyik, 'adat-mappa', 'kulcs.json'), '{}');      // egy adat-mappa (kulcs.json-t tart)
      await writeFile(join(egyik, 'adat-mappa', 'x.js'), 'nem kód');
      await mkdir(join(masik, 'sub'));
      await writeFile(join(masik, 'a.js'), 'x\ny\n');
      await writeFile(join(masik, 'sub', 'b.css'), 'q\r\n');
      await writeFile(join(masik, 'kep.png'), kep);
      const e = await kodCsomagKeszitese(egyik);
      const m = await kodCsomagKeszitese(masik);
      const utak = e.jegyzek.fajlok.map((f) => f[0]).join();
      const kepMerete = e.jegyzek.fajlok.find((f) => f[0] === 'kep.png')?.[2];
      const blob = memoriaBlob();
      const h = await kodCsomagTarolasa(e, blob);
      const vissza = await kodJegyzekOlvasasa(h, (l) => blob.olvas(l));
      const aJs = blob.m.get(e.jegyzek.fajlok.find((f) => f[0] === 'a.js')[1]);
      const ok = e.hivatkozas.lenyomat === m.hivatkozas.lenyomat && utak === 'a.js,kep.png,sub/b.css' && kepMerete === 6
        && e.jegyzek.fajta === KOD_FAJTA && vissza?.fajta === KOD_FAJTA && JSON.stringify(vissza.fajlok) === JSON.stringify(e.jegyzek.fajlok)
        && new TextDecoder().decode(aJs) === 'x\ny\n' && blob.m.size === 4   // 3 fájl + a jegyzék
        && (await kodJegyzekOlvasasa({ lenyomat: h.lenyomat, bajt: h.bajt + 1 }, (l) => blob.olvas(l))) === null;
      if (!ok) process.stderr.write('    ' + JSON.stringify({ e: e.hivatkozas, m: m.hivatkozas, utak, kepMerete, n: blob.m.size }) + '\n');
      return ok;
    } finally {
      await rm(egyik, { recursive: true, force: true });
      await rm(masik, { recursive: true, force: true });
    }
  });

proba('⛔ D119 (①a): a kívülről jött jegyzék egy alakban — a rendezetlen, az ismétlődő, a `..`-os, az abszolút, a hibás lenyomatú és az idegen mezős elutasítva',
  async () => {
    const L = 'A'.repeat(43);
    const j = (fajlok, extra = {}) => ({ fajta: KOD_FAJTA, fajlok, ...extra });
    const jo = kodJegyzekAlakja(j([['a.js', L, 1], ['b/c.js', L, 2]]));
    const rosszak = [
      j([['b.js', L, 1], ['a.js', L, 1]]),          // rendezetlen
      j([['a.js', L, 1], ['a.js', L, 1]]),          // ismétlődő
      j([['../a.js', L, 1]]),                       // kilép a mappából
      j([['/a.js', L, 1]]),                         // abszolút
      j([['a\\b.js', L, 1]]),                       // nem `/` elválasztó
      j([['a.js', 'rövid', 1]]),                    // hibás lenyomat
      j([['a.js', L, -1]]),                         // negatív méret
      j([['a.js', L, 1]], { tobb: 1 }),             // idegen mező
      { fajta: 'mas', fajlok: [] }                  // más fajta
    ];
    return jo && rosszak.every((x) => !kodJegyzekAlakja(x));
  });

proba('⭐ D119 (①a): a futó program kód-csomagja — a program fájljai (a koino.js is), sorvég nélkül, mind a fájl-korlát alatt',
  async () => {
    const utak = await programFajljai(PROGRAM);
    const cs = await kodCsomagKeszitese(PROGRAM);
    const koino = cs.jegyzek.fajlok.find((f) => f[0] === 'koino.js');
    const nyers = await readFile(join(PROGRAM, 'koino.js'));
    const sorvegNelkul = Buffer.from(nyers.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
    const ok = utak.length > 100 && !!koino && koino[1] === await bajtLenyomat(new Uint8Array(sorvegNelkul))
      && koino[2] === sorvegNelkul.length && cs.jegyzek.fajlok.some((f) => f[0] === 'meres/mind.js')
      && !cs.jegyzek.fajlok.some((f) => f[0].startsWith('koino-adat/')) && kodJegyzekAlakja(cs.jegyzek);
    if (!ok) process.stderr.write('    ' + JSON.stringify({ n: utak.length, koino }) + '\n');
    return ok;
  });

// ===================================
// 2. A KOINO-VERZIÓ A KAPUN
// ===================================

const KOD = { lenyomat: 'K'.repeat(43), bajt: 1234 };

/**
 * A szülő (A alapítja), a gyermek születése (A, a vágáskor, a programmal) és a koino-verzió a szülőben (A, a születéssel).
 * @param {Object} [b]
 */
async function verzio({ kod = KOD, szulo = undefined } = {}) {
  const A = await ujEember('');
  const P = await A.tesz('KoinoLetrehozas', { nev: 'Szülő', leiras: null, alapitok: [], zart: true,
    szabalyok: teljesSzabalyok() }, T0);
  A.koinotValt(P.azonosito);
  const G = await A.tesz('GondolatLetrehozas', { cim: 'Előtte', meret: 10 }, T0 + 100);
  const gp = await A.tesz('TudatpontRendezes', { entitas: G.azonosito, pont: 100 }, T0 + 101);
  A.koinotValt('');
  const K = await A.tesz('KoinoLetrehozas', { nev: 'Gyermek', leiras: null, alapitok: [], zart: true, szulo: P.azonosito,
    szuloTagsag: { horgony: P.azonosito, lanc: [] }, szabalyok: teljesSzabalyok(), program: { ...KOD } }, VAGAS);
  A.koinotValt(P.azonosito);
  const kvAdat = (sz, tobb = {}) => ({ tipus: KOINO_VERZIO, cim: sz.adat.nev, szoveg: null, szulo: null, gyermek: sz.azonosito,
    szuletes: sz, kod: { ...kod }, meret: 10, ...(szulo !== undefined ? { szulo } : {}), ...tobb });
  const kv = await A.tesz('GondolatLetrehozas', kvAdat(K), VAGAS + 10);
  return { A, P, G, gp, K, kv, kvAdat };
}

async function ujTar(koino) {
  return esemenyTarNyitasa(koino, await mkdtemp(join(tmpdir(), 'koino-verzio-')));
}

proba('⭐⭐ D119 (①a): a koino-verzió a kapun — a szülő születésével átmegy; nélküle nem (de nem végleg)', async () => {
  const s = await verzio();
  const ures = await ujTar(s.P.azonosito);
  const nincsSzulo = await esemenyMentese(ures, s.kv);
  if (!(await esemenyMentese(ures, s.P)).mentve) return false;
  const jo = await esemenyMentese(ures, s.kv);
  return !nincsSzulo.mentve && nincsSzulo.hianyzik === true && jo.mentve === true && alakiHiba(s.kv) === null;
});

proba('⛔ D119 (①a): a kapu elveti a hamis koino-verziót — átírt születés, más szerzője, nem tagé, más koinó gyermeke, más kód, nem legfelső szintű',
  async () => {
    const s = await verzio();
    const tar = await ujTar(s.P.azonosito);
    if (!(await esemenyMentese(tar, s.P)).mentve) return false;
    const mentes = async (e) => (await esemenyMentese(tar, e)).mentve;
    // (a) átírt születés: a név más (a kártya címe is) — a lenyomat nem stimmel
    const atirt = { ...s.K, adat: { ...s.K.adat, nev: 'Más' } };
    const a = await s.A.tesz('GondolatLetrehozas', s.kvAdat(atirt), VAGAS + 20);
    // (b) más szerzője: B a saját kártyájába ágyazza A gyermekét
    const B = await ujEember(s.P.azonosito);
    const b = await B.tesz('GondolatLetrehozas', s.kvAdat(s.K), VAGAS + 30);
    // (c) nem tagé: N gyermeke a szülőben, tagsági bizonyíték nélkül (a saját „horgonyára”)
    const N = await ujEember(s.P.azonosito);
    const nBe = await N.tesz('Belepes', {}, T0 + 5);   // belépett, de senki nem hívta meg — nem a szülő tagja
    N.koinotValt('');
    const nK = await N.tesz('KoinoLetrehozas', { nev: 'Idegen', leiras: null, alapitok: [], zart: true, szulo: s.P.azonosito,
      szuloTagsag: { horgony: nBe.azonosito, lanc: [] }, szabalyok: teljesSzabalyok(), program: { ...KOD } }, VAGAS);
    N.koinotValt(s.P.azonosito);
    const c = await N.tesz('GondolatLetrehozas', s.kvAdat(nK), VAGAS + 40);
    // (d) más koinó gyermeke: a kártya egy másik koinóban
    const M = await ujEember('');
    const mP = await M.tesz('KoinoLetrehozas', { nev: 'Másik', leiras: null, alapitok: [], zart: true, szabalyok: teljesSzabalyok() }, T0);
    s.A.koinotValt(mP.azonosito);
    const d = await s.A.tesz('GondolatLetrehozas', s.kvAdat(s.K), VAGAS + 50);
    s.A.koinotValt(s.P.azonosito);
    // (e) más kód, mint a születés programja
    const e = await s.A.tesz('GondolatLetrehozas', s.kvAdat(s.K, { kod: { lenyomat: 'M'.repeat(43), bajt: 1 } }), VAGAS + 60);
    // (f) nem legfelső szintű
    const f = await s.A.tesz('GondolatLetrehozas', s.kvAdat(s.K, { szulo: s.G.azonosito }), VAGAS + 70);
    // (g) a cím nem a gyermek neve
    const g = await s.A.tesz('GondolatLetrehozas', s.kvAdat(s.K, { cim: 'Más cím' }), VAGAS + 80);
    const eredmeny = { a: await mentes(a), b: await mentes(b), c: await mentes(c), d: alakiHiba(d) === null, e: await mentes(e),
      f: await mentes(f), g: await mentes(g), jo: await mentes(s.kv) };
    const ok = Object.entries(eredmeny).every(([k, v]) => (k === 'jo' ? v === true : v === false));
    if (!ok) process.stderr.write('    ' + JSON.stringify(eredmeny) + '\n');
    return ok;
  });

proba('⛔ D119 (①a): a születés programja — csak új alakban, és csak hivatkozás alakban', async () => {
  const A = await ujEember('regi');
  const regi = await A.tesz('KoinoLetrehozas', { nev: 'Régi', leiras: null, alapitok: [], zart: true,
    szabalyok: teljesSzabalyok(), program: { ...KOD } }, T0);
  const B = await ujEember('');
  const rossz = await B.tesz('KoinoLetrehozas', { nev: 'Új', leiras: null, alapitok: [], zart: true,
    szabalyok: teljesSzabalyok(), program: { lenyomat: 'rövid', bajt: 1 } }, T0);
  const C = await ujEember('');
  const jo = await C.tesz('KoinoLetrehozas', { nev: 'Új', leiras: null, alapitok: [], zart: true,
    szabalyok: teljesSzabalyok(), program: { ...KOD } }, T0);
  return /programja/.test(alakiHiba(regi) ?? '') && /programja/.test(alakiHiba(rossz) ?? '') && alakiHiba(jo) === null;
});

proba('⭐ D119 (①a): a képben a koino-verzió entitás — a gyermekével és a kódjával (a pont nélkül nincs — D14)', async () => {
  const s = await verzio();
  const pont = await s.A.tesz('TudatpontRendezes', { entitas: s.kv.azonosito, pont: 50 }, VAGAS + 20);
  const most = VAGAS + NAP;
  const vele = (await koinoKepe([s.P, s.G, s.gp, s.kv, pont], { koino: s.P.azonosito, most })).allapot.entitasok.get(s.kv.azonosito);
  const nelkule = (await koinoKepe([s.P, s.G, s.gp, s.kv], { koino: s.P.azonosito, most })).allapot.entitasok.has(s.kv.azonosito);
  return vele?.tipus === KOINO_VERZIO && vele.cim === 'Gyermek' && vele.koinoVerzio?.gyermek === s.K.azonosito
    && vele.koinoVerzio?.kod?.lenyomat === KOD.lenyomat && vele.szulo === null && nelkule === false;
});

// ===================================
// 3. A KÁRTYÁRA TETT PONT NEM KÖLTÖZIK (Csaba: „(A) Nem költözik”)
// ===================================

proba('⭐⭐ D119 (A): a koino-verzió kártyára tett pont nem költözik — a második gyermek születése elhagyja, a képében a testvér kártyája nem él; elhagyás nélkül élne',
  async () => {
    const s = await verzio();
    const kvPont = await s.A.tesz('TudatpontRendezes', { entitas: s.kv.azonosito, pont: 50 }, VAGAS + 20);
    s.A.koinotValt('');
    const masodik = (elhagy) => ({ nev: 'Második', leiras: null, alapitok: [], zart: true, szulo: s.P.azonosito,
      szuloTagsag: { horgony: s.P.azonosito, lanc: [] }, szabalyok: teljesSzabalyok(), program: { ...KOD },
      ...(elhagy ? { elhagy } : {}) });
    const K2 = await s.A.tesz('KoinoLetrehozas', masodik([s.kv.azonosito]), VAGAS + 30);
    const K2b = await s.A.elagaztat('KoinoLetrehozas', masodik(null), VAGAS + 30);   // ugyanarról a lánc-pontról
    const most = VAGAS + NAP;
    // ⚠️ A szigorú (b) alatt a nem tartott szelet a D14 kivétele (`nemTartott`) — az elhagyott pont látott tudás, így a kártya
    // szellemként sem marad (különben „a pontjai ismeretlenek” jellel élne).
    const kepe = async (K) => (await koinoKepe([s.P, s.G, s.gp, s.kv, kvPont, K], { koino: K.azonosito, most,
      nemTartott: (az) => az === s.kv.azonosito })).allapot.entitasok;
    const vele = await kepe(K2);
    const nelkule = await kepe(K2b);
    const ok = alakiHiba(K2) === null && !vele.has(s.kv.azonosito) && vele.get(s.G.azonosito)?.osszesPont === 100
      && nelkule.get(s.kv.azonosito)?.osszesPont === 50 && nelkule.get(s.G.azonosito)?.osszesPont === 100;
    if (!ok) process.stderr.write('    ' + JSON.stringify({ vele: [...vele.keys()].length, kvVele: vele.get(s.kv.azonosito)?.osszesPont,
      kvNelkule: nelkule.get(s.kv.azonosito)?.osszesPont, g: vele.get(s.G.azonosito)?.osszesPont }) + '\n');
    return ok;
  });

// ===================================
// 4. A KÁRTYA KÓDJA: IGÉNY ÉS TÖRZS (①b)
// ===================================

/** Egy kártya a képben (a fájl-igényhez és a törzshöz) — és egy n fájlos jegyzék a memóriában. */
async function kartyaKoddal(n) {
  const blob = memoriaBlob();
  const fajlok = [];
  for (let i = 0; i < n; i++) {
    const t = new TextEncoder().encode('fájl ' + i);
    const l = (await blob.ir(t)).lenyomat;
    fajlok.push(['f' + String(i).padStart(4, '0') + '.js', l, t.length]);
  }
  const jegyzekBajtok = new TextEncoder().encode(JSON.stringify({ fajlok, fajta: KOD_FAJTA }));
  const h = { lenyomat: (await blob.ir(jegyzekBajtok)).lenyomat, bajt: jegyzekBajtok.length };
  const kodOlvas = (x) => kodJegyzekOlvasasa(x, (l) => blob.olvas(l));
  const entitas = { azonosito: 'V'.repeat(43), tipus: KOINO_VERZIO, szoveg: null, koinoVerzio: { gyermek: 'G'.repeat(43), kod: h },
    hozzajarulok: new Map([['en', { pont: 10 }]]) };
  return { blob, fajlok, h, kodOlvas, entitas };
}

proba('⭐⭐ D119 (①b): a kártya kódja igény — a jegyzék, és ha megvan, a fájljai (a kártya vállalása a kódjára is vállalás)',
  async () => {
    const { fajlok, h, kodOlvas, entitas } = await kartyaKoddal(5);
    const allapot = { entitasok: new Map([[entitas.azonosito, entitas]]) };
    const nincs = () => false;
    const jegyzekNelkul = await fajlIgenyek(allapot, nincs, { szerzo: 'en' });
    const vele = await fajlIgenyek(allapot, nincs, { szerzo: 'en', kodOlvas });
    const lenyomatok = (r) => r.hianyzok.map((x) => x.lenyomat).sort().join();
    const vart = [h.lenyomat, ...fajlok.map((f) => f[1])].sort().join();
    return lenyomatok(jegyzekNelkul) === h.lenyomat && lenyomatok(vele) === vart && vele.hianyzok.every((x) => x.vallaltam)
      && vele.vallaltLenyomatok.size === fajlok.length + 1;
  });

proba('⭐⭐ D119 (①b): a kártya törzse a teljes kód-csomag (64-nél több fájl) — a jegyzék elöl; a nem kártya törzse a régi 64-ig',
  async () => {
    const { fajlok, h, kodOlvas, entitas, blob } = await kartyaKoddal(100);
    const t = await torzsLenyomatai(entitas, (l) => blob.olvas(l), kodOlvas);
    const kepek = Array.from({ length: 100 }, (_, i) => ({ tipus: 'kep', url: '/api/fajl/' + String(i).padStart(43, 'K') }));
    const gondolat = { azonosito: 'X'.repeat(43), tipus: 'Gondolat', szoveg: kepek, hozzajarulok: new Map() };
    const g = await torzsLenyomatai(gondolat, null, kodOlvas);
    return t.length === fajlok.length + 1 && t[0] === h.lenyomat && fajlok.every((f) => t.includes(f[1]))
      && g.length === TORZS_KORLAT;
  });

proba('⛔ D119 (A): az elhagyás csak a gyermek születésén, és csak entitás-azonosítók listájaként', async () => {
  const A = await ujEember('');
  const gyoker = await A.tesz('KoinoLetrehozas', { nev: 'Gyökér', leiras: null, alapitok: [], zart: true,
    szabalyok: teljesSzabalyok(), elhagy: ['E'.repeat(43)] }, T0);
  const s = await verzio();
  s.A.koinotValt('');
  const rossz = await s.A.tesz('KoinoLetrehozas', { nev: 'Rossz', leiras: null, alapitok: [], zart: true, szulo: s.P.azonosito,
    szuloTagsag: { horgony: s.P.azonosito, lanc: [] }, szabalyok: teljesSzabalyok(), elhagy: ['nem azonosító'] }, VAGAS + 30);
  return /elhagyott pont csak a gyermek születésén/.test(alakiHiba(gyoker) ?? '')
    && /entitás-azonosítók listája/.test(alakiHiba(rossz) ?? '');
});

export default futtatas;
