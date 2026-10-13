// koino/meres/ertesitesProba.js

// Felelősség: ⭐⭐ AZ ÉRTESÍTÉS-RÉTEG próbái (D101 ⑥, M3/A — `js/allapot/ertesites.js`).
//
// A postafiók a készüléken számolódik, két pillanatkép különbségéből. A próbák a tiszta számítást mérik (kitalált
// entitásokkal — a hálózat és a tár nélkül): a beállítások öröklődését (a legközelebbi nyer, aztán a globális), hogy az
// első kép csak alapvonal, hogy a saját cselekvésem nem jelez, hogy a nem tartott entitás nem jelez (a szigorú (b) — M3/A),
// a nyolc fajtát, a tudatpont-szűrőt és -küszöböt, és a postafiók korlátait (darab, idő, lap, ág, olvasott). A bekötést
// (a felület útvonalai, a kártyák számlálója, két készülékkel) a `parancssorProba.js` méri.

import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { probaGyujtemeny } from './probaFuttato.js';
import {
  ERTESITES_TIPUSOK, POSTAFIOK_KORLAT, POSTAFIOK_ELETTARTAM, HATARIDO_ELORE,
  uresBeallitasok, beallitasokAlakja, beallitasMentese, globalisMentese, ervenyesBeallitas, tudatpontKuszobTeljesul,
  pillanatkep, ertesitesekSzamitasa, uresPostafiok, postafiokAlakja, postafiokBovitese, postafiokLapja,
  olvasottnakJelol, olvasatlanTerkep, keszulekErtesitesei, KESZULEK_AZONNAL_KORLAT
} from '../js/allapot/ertesites.js';
import { ertesitoParancsa, keszulekErtesitese } from '../js/felulet/eszkozErtesites.js';

const { proba, futtatas } = probaGyujtemeny('Az értesítés-réteg (D101 ⑥)');

const EN = 'en'.repeat(10);
const MAS = 'mas'.repeat(10);

/** Egy kitalált entitás: szülő, típus, szerző, pontok (szerző → pont), küszöbök. */
const ent = (azonosito, szulo, { tipus = 'Gondolat', szerzo = MAS, pontok = { [MAS]: 10 }, kuszobok = null, cim = azonosito } = {}) => {
  const hozzajarulok = new Map(Object.entries(pontok).map(([sz, p]) => [sz, { pont: p }]));
  const osszesPont = [...hozzajarulok.values()].reduce((s, x) => s + x.pont, 0);
  return [azonosito, { azonosito, szulo, tipus, szerzo, hozzajarulok, osszesPont, kuszobok, cim }];
};

/** Egy kép a kitalált világból (minden tartott, ha nincs más megadva; az ágazati pont = a saját, egyszerűség kedvéért). */
const kepe = (entitasok, { javaslatok = new Map(), tartott = () => true, szavazatok = new Map(), most = 1000 } = {}) =>
  pillanatkep({ entitasok, javaslatok, agazati: new Map([...entitasok].map(([az, e]) => [az, e.osszesPont])), tartott,
    en: EN, szavazatok, most });

const beallitva = (az, tipusok, tobb = {}) => beallitasMentese(uresBeallitasok(), az, { ertesitesTipusok: tipusok, ...tobb });

// ===================================
// 1. A BEÁLLÍTÁSOK
// ===================================

proba('⭐ a beállítás a felmenőkön öröklődik — a legközelebbi nyer, ha sehol nincs, a globális (és a forrása kimondva)', () => {
  const m = new Map([ent('R', null), ent('P', 'R'), ent('C', 'P')]);
  let b = beallitasMentese(uresBeallitasok(), 'R', { ertesitesTipusok: ['ujJavaslat'] });
  b = beallitasMentese(b, 'P', { ertesitesTipusok: ['ujGyerekEntitas', 'nincs-ilyen'] });
  b = globalisMentese(b, { ertesitesTipusok: ['kuszobValtozas'] });
  const c = ervenyesBeallitas(b, m, 'C');
  const p = ervenyesBeallitas(b, m, 'P');
  const r = ervenyesBeallitas(b, m, 'R');
  const arva = ervenyesBeallitas(b, new Map([ent('X', null)]), 'X');
  return c.forras === 'orokolt' && c.honnan === 'P' && c.ertesitesTipusok.join() === 'ujGyerekEntitas' && !c.vanSajat
    && p.forras === 'sajat' && p.vanSajat && p.beallitasId === 'P'
    && r.ertesitesTipusok.join() === 'ujJavaslat'
    && arva.forras === 'globalis' && arva.ertesitesTipusok.join() === 'kuszobValtozas';
});

proba('⭐ a globális mentése az e-mail mezőt megtartja, ha nem küldik — és a hibás tárolt alak alapértékre esik', () => {
  const b = globalisMentese(uresBeallitasok(), { ertesitesTipusok: ['ujJavaslat'], emailErtesites: true, emailOrakoz: 999 });
  const b2 = globalisMentese(b, { ertesitesTipusok: [] });
  const hibas = beallitasokAlakja({ globalis: 'x', entitasok: [1, 2] });
  return b.globalis.emailErtesites === true && b.globalis.emailOrakoz === 168
    && b2.globalis.emailErtesites === true && b2.globalis.ertesitesTipusok.length === 0
    && hibas.globalis.ertesitesTipusok.length === 0 && Object.keys(hibas.entitasok).length === 0
    && ERTESITES_TIPUSOK.length === 8;
});

proba('⭐ a tudatpont-változás négy küszöbe: „VAGY”, és küszöb nélkül minden változás jelez', () => {
  const adat = { sajatValtozas: 5, osszValtozas: 5, sajatOssz: 50, osszOssz: 100 };
  return tudatpontKuszobTeljesul({}, adat) && tudatpontKuszobTeljesul({ sajatDirekt: 5 }, adat)
    && !tudatpontKuszobTeljesul({ sajatDirekt: 6 }, adat) && tudatpontKuszobTeljesul({ sajatDirekt: 6, sajatSzazalek: 10 }, adat)
    && !tudatpontKuszobTeljesul({ osszSzazalek: 6 }, adat);
});

// ===================================
// 2. AZ ÚJ ÉRTESÍTÉSEK — két kép különbségéből
// ===================================

proba('⭐⭐ az első kép csak alapvonal; az új gyerek (másé) jelez az örökölt beállítással — az enyém nem, és a nem tartott sem', () => {
  const b = beallitva('R', ['ujGyerekEntitas']);
  const m1 = new Map([ent('R', null), ent('P', 'R')]);
  const k1 = kepe(m1);
  const elso = ertesitesekSzamitasa(null, k1, { beallitasok: b, entitasok: m1, en: EN, most: 1000 });
  const m2 = new Map([...m1, ent('C', 'P'), ent('S', 'P', { szerzo: EN }), ent('J', 'R', { tipus: 'Javaslat' })]);
  const k2 = kepe(m2);
  const ujak = ertesitesekSzamitasa(k1, k2, { beallitasok: b, entitasok: m2, en: EN, most: 2000 });
  // a szigorú (b): ha P-t nem tartom, a gyereke nem jelez (csak most látom — nem „új”)
  const k1b = kepe(m1, { tartott: (az) => az !== 'P' });
  const k2b = kepe(m2, { tartott: (az) => az !== 'P' });
  const nemTartott = ertesitesekSzamitasa(k1b, k2b, { beallitasok: b, entitasok: m2, en: EN, most: 2000 });
  return elso.length === 0 && ujak.length === 1 && ujak[0].tipus === 'ujGyerekEntitas' && ujak[0].entitasId === 'P'
    && ujak[0].adatok.gyerekId === 'C' && ujak[0].osLanc.join() === 'P,R' && ujak[0].olvasva === false
    && typeof ujak[0]._id === 'string' && !Number.isNaN(Date.parse(ujak[0].createdAt))
    && nemTartott.length === 0;
});

proba('⭐ a tudatpont-változás: mások pontja jelez (a küszöb szerint), az enyém nem; a tudatpont-szűrő csak ahol pontom van', () => {
  const m1 = new Map([ent('R', null, { pontok: { [MAS]: 10, [EN]: 4 } }), ent('Q', null, { pontok: { [MAS]: 10 } })]);
  const m2 = new Map([ent('R', null, { pontok: { [MAS]: 13, [EN]: 9 } }), ent('Q', null, { pontok: { [MAS]: 20 } })]);
  const k1 = kepe(m1);
  const k2 = kepe(m2);
  let b = beallitva('R', ['tudatpontValtozas']);
  b = beallitasMentese(b, 'Q', { ertesitesTipusok: ['tudatpontValtozas'], tudatpontSzuro: true });
  const ujak = ertesitesekSzamitasa(k1, k2, { beallitasok: b, entitasok: m2, en: EN, most: 2000 });
  const kuszobbel = ertesitesekSzamitasa(k1, k2, { beallitasok: beallitva('R', ['tudatpontValtozas'],
    { tudatpontKuszobok: { sajatDirekt: 4 } }), entitasok: m2, en: EN, most: 2000 });
  const r = ujak.find((t) => t.entitasId === 'R');
  // R: mások +3 (az én +5-öm nem számít); Q: a szűrő miatt nem (nincs pontom rajta); küszöb 4 → R sem
  return ujak.length === 1 && r?.adatok.sajatValtozas === 3 && r?.adatok.sajatOssz === 22 && kuszobbel.length === 0;
});

proba('⭐ a küszöbváltozás a modál alakjában (mezo, regi, uj) — és az új javaslat, a döntés, a határidő (egyszer), a szavazat', () => {
  const most = 10 * HATARIDO_ELORE;
  const m1 = new Map([ent('R', null, { kuszobok: { a: 1, b: 2 } })]);
  const m2 = new Map([ent('R', null, { kuszobok: { a: 1, b: 3 } })]);
  const b = beallitva('R', ['kuszobValtozas', 'ujJavaslat', 'javaslatElfogadas', 'szavazasiHatarido', 'szavazatErkezett']);
  const d = (statusz, lz, letrehozo = MAS) => ({ statusz, lezarasIdeje: lz, erintettek: [{ entitas: 'R' }], letrehozo, muvelet: 'Modositas' });
  const k1 = kepe(m1, { javaslatok: new Map([['J1', d('folyamatban', most + 2 * HATARIDO_ELORE)], ['J2', d('folyamatban', most - 1)]]),
    most: most - 1000 });
  const k2 = kepe(m2, { javaslatok: new Map([['J1', d('folyamatban', most + HATARIDO_ELORE / 2)], ['J2', d('elfogadva', most - 1)],
    ['J3', d('folyamatban', most + 3 * HATARIDO_ELORE)], ['J4', d('folyamatban', most + 3 * HATARIDO_ELORE, EN)]]),
    szavazatok: new Map([['J1', new Set([MAS, EN])]]), most });
  const ujak = ertesitesekSzamitasa(k1, k2, { beallitasok: b, entitasok: m2, en: EN, most });
  const tipusok = ujak.map((t) => t.tipus + (t.adatok.javaslatId ? ':' + t.adatok.javaslatId : '')).sort().join();
  const kv = ujak.find((t) => t.tipus === 'kuszobValtozas');
  // a határidő egyszer: a következő kép (ugyanakkor) már nem jelez újra
  const k3 = kepe(m2, { javaslatok: new Map([['J1', d('folyamatban', most + HATARIDO_ELORE / 2)]]), most: most + 1 });
  const ujra = ertesitesekSzamitasa(k2, k3, { beallitasok: b, entitasok: m2, en: EN, most: most + 1 });
  return tipusok === ['javaslatElfogadas:J2', 'kuszobValtozas', 'szavazasiHatarido:J1', 'szavazatErkezett:J1', 'ujJavaslat:J3'].join()
    && kv.adatok.valtozasok.length === 1 && kv.adatok.valtozasok[0].mezo === 'b' && kv.adatok.valtozasok[0].regi === 2
    && kv.adatok.valtozasok[0].uj === 3 && ujra.length === 0;
});

proba('⛔ a kikapcsolt beállítás és a be nem pipált fajta nem jelez — a beállítás nélküli sem (opt-in)', () => {
  const m1 = new Map([ent('R', null)]);
  const m2 = new Map([ent('R', null), ent('C', 'R')]);
  const k1 = kepe(m1);
  const k2 = kepe(m2);
  const ki = ertesitesekSzamitasa(k1, k2, { beallitasok: beallitva('R', ['ujGyerekEntitas'], { kikapcsolva: true }), entitasok: m2, en: EN, most: 2 });
  const masFajta = ertesitesekSzamitasa(k1, k2, { beallitasok: beallitva('R', ['ujJavaslat']), entitasok: m2, en: EN, most: 2 });
  const semmi = ertesitesekSzamitasa(k1, k2, { beallitasok: uresBeallitasok(), entitasok: m2, en: EN, most: 2 });
  return ki.length === 0 && masFajta.length === 0 && semmi.length === 0;
});

// ===================================
// 3. A POSTAFIÓK
// ===================================

proba('⭐ a postafiók korlátos (darab és idő), lapoz, ág-szűr, olvasottnak jelöl, és a kártyák számlálója az ős-láncból', () => {
  const most = 100 * 86400 * 1000;
  const t = (id, az, lanc, ido = most, olvasva = false) => ({ _id: id, tipus: 'ujJavaslat', entitasId: az, entitasTipus: 'Gondolat',
    osLanc: lanc, adatok: {}, createdAt: new Date(ido).toISOString(), olvasva, olvasvaIdopont: null });
  const sok = Array.from({ length: POSTAFIOK_KORLAT + 5 }, (_, i) => t('s' + i, 'Z', ['Z'], most - i));
  const bovitett = postafiokBovitese(uresPostafiok(), sok, null, most);
  const regi = postafiokBovitese(uresPostafiok(), [t('r', 'Z', ['Z'], most - POSTAFIOK_ELETTARTAM - 1)], null, most);
  const pf = postafiokAlakja({ tetelek: [t('a', 'C', ['C', 'P', 'R']), t('b', 'Q', ['Q']), t('c', 'P', ['P', 'R'], most, true),
    { _id: 'hibas' }], kep: null });
  const lap = postafiokLapja(pf, { lap: 1, lapMeret: 1 });
  const ag = postafiokLapja(pf, { agazat: 'P' });
  const szamlalo = olvasatlanTerkep(pf);
  const db = olvasottnakJelol(pf, { agazat: 'R' });
  return bovitett.tetelek.length === POSTAFIOK_KORLAT && bovitett.tetelek[0]._id === 's' + (POSTAFIOK_KORLAT + 4)
    && regi.tetelek.length === 0 && pf.tetelek.length === 3
    && lap.ertesitesek.length === 1 && lap.osszes === 3 && lap.olvasatlan === 2 && lap.lapokSzama === 3
    && ag.osszes === 2 && szamlalo.get('R') === 1 && szamlalo.get('P') === 1 && szamlalo.get('Q') === 1
    && db === 1 && olvasatlanTerkep(pf).get('R') === undefined;
});

// ===================================
// 4. ⭐ D103: A KÉSZÜLÉK SAJÁT ÉRTESÍTÉSE
// ===================================

proba('⭐ D103: mit jelez a készülék — kikapcsolva semmit (és nem gyűjt), azonnal legfeljebb öt + „és még”, összefoglaló az időköz után egyszer', () => {
  const t = (i, az = 'R') => ({ _id: 't' + i, tipus: 'ujGyerekEntitas', entitasId: az });
  const cime = (az) => (az === 'R' ? 'R figyelt' : null);
  const ki = keszulekErtesitesei([t(1)], { emailErtesites: false }, { utolso: 5, gyujto: 3 }, 100, cime);
  const azonnal = keszulekErtesitesei(Array.from({ length: 8 }, (_, i) => t(i)), { emailErtesites: true, emailMod: 'azonnal' }, null, 100, cime);
  const ora = 3600 * 1000;
  const g = { emailErtesites: true, emailMod: 'osszefoglalo', emailOrakoz: 2 };
  const elso = keszulekErtesitesei([t(1)], g, null, 10 * ora, cime);                        // az időköz innen indul
  const kozben = keszulekErtesitesei([t(2), t(3)], g, elso.kezbesites, 11 * ora, cime);     // még nem telt le
  const letelt = keszulekErtesitesei([], g, kozben.kezbesites, 12 * ora, cime);             // letelt: egy, a számmal
  const ures = keszulekErtesitesei([], g, letelt.kezbesites, 20 * ora, cime);               // nincs mit: semmi
  return ki.uzenetek.length === 0 && ki.kezbesites.gyujto === 0
    && azonnal.uzenetek.length === KESZULEK_AZONNAL_KORLAT + 1 && azonnal.uzenetek[0].cim === 'koino — Új gondolat jött létre'
    && azonnal.uzenetek[0].szoveg === 'R figyelt' && /és még 3/.test(azonnal.uzenetek.at(-1).szoveg) && azonnal.kezbesites.utolso === 100
    && elso.uzenetek.length === 0 && elso.kezbesites.utolso === 10 * ora && elso.kezbesites.gyujto === 1
    && kozben.uzenetek.length === 0 && kozben.kezbesites.gyujto === 3
    && letelt.uzenetek.length === 1 && /^3 új értesítés/.test(letelt.uzenetek[0].szoveg) && letelt.kezbesites.gyujto === 0
    && ures.uzenetek.length === 0;
});

proba('⭐ D103: a platform értesítője — Windows (a szöveg környezetben), Mac, Linux, Termux, a cserélhető (KOINO_ERTESITO), és ismeretlen platformon semmi', () => {
  const win = ertesitoParancsa('cím', 'szöveg"; Remove-Item x', { platform: 'win32', env: {} });
  const mac = ertesitoParancsa('c', 'sz', { platform: 'darwin', env: {} });
  const lin = ertesitoParancsa('c', 'sz', { platform: 'linux', env: {} });
  const termux = ertesitoParancsa('c', 'sz', { platform: 'linux', env: { PREFIX: '/data/data/com.termux/files/usr' } });
  const sajatJs = ertesitoParancsa('c', 'sz', { platform: 'win32', env: { KOINO_ERTESITO: '/x/kuld.mjs' }, node: '/bin/node' });
  const sajat = ertesitoParancsa('c', 'sz', { platform: 'linux', env: { KOINO_ERTESITO: 'ntfy-kuld' } });
  const hosszu = ertesitoParancsa('c'.repeat(500), 'a\nb\u0000c', { platform: 'linux', env: {} });
  return win.parancs === 'powershell.exe' && win.kornyezet.KOINO_ERTESITES_SZOVEG === 'szöveg"; Remove-Item x'
    && !win.ervek.join(' ').includes('Remove-Item') && mac.parancs === 'osascript' && mac.ervek.slice(-2).join() === 'c,sz'
    && lin.parancs === 'notify-send' && termux.parancs === 'termux-notification'
    && sajatJs.parancs === '/bin/node' && sajatJs.ervek.join() === '/x/kuld.mjs,c,sz' && sajat.parancs === 'ntfy-kuld'
    && hosszu.ervek[0].length === 80 && hosszu.ervek[1] === 'a b c'
    && ertesitoParancsa('c', 'sz', { platform: 'aix', env: {} }) === null;
});

proba('⭐ D103: a kiküldés a cserélhető értesítővel valóban lefut (egy próba-szkript fájlba írja) — és a hiányzó eszköz hibája visszajön, nem dob', async () => {
  const hely = await mkdtemp(join(tmpdir(), 'koino-ertesito-'));
  try {
    const naplo = join(hely, 'naplo.txt');
    const szkript = join(hely, 'kuld.mjs');
    await writeFile(szkript, "import { appendFileSync } from 'node:fs';\nappendFileSync(" + JSON.stringify(naplo)
      + ", process.argv[2] + '|' + process.argv[3] + '\\n');\n", 'utf8');
    const r = await keszulekErtesitese([{ cim: 'koino — Új gondolat jött létre', szoveg: 'R figyelt' }, { cim: 'k2', szoveg: 's2' }],
      { env: { ...process.env, KOINO_ERTESITO: szkript } });
    const sorok = (await readFile(naplo, 'utf8')).trim().split('\n');
    const hiany = await keszulekErtesitese([{ cim: 'c', szoveg: 'sz' }], { env: { KOINO_ERTESITO: 'nincs-ilyen-parancs-' + Date.now() } });
    return r.kuldve === 2 && r.hiba === null && sorok.join(';') === 'koino — Új gondolat jött létre|R figyelt;k2|s2'
      && hiany.kuldve === 0 && typeof hiany.hiba === 'string';
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

export default futtatas;
