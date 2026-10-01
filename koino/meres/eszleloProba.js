// koino/meres/eszleloProba.js

// Felelősség: AZ ÉSZLELŐ próbája (D82 sorrend ① — `js/allapot/eszlelo.js`, és a bejelentése:
// `muveletek.js` `ellentmondasokBejelentese`).
//
// Amit mér:
//   · ⛔⛔ becsületes tárban az észlelő SEMMIT nem talál (a garancia az automatikus bejelentésre is áll);
//   · a hazug bemondást és a hamis folytonosságot megtalálja — a folytonosságot BÁRMELYIK oldalról
//     (ha csak az előző, vagy csak a következő esemény az új);
//   · a bejelentés nem ismétli magát (a második kör „már be volt jelentve"), és akinek nincs nálunk
//     horgonya, arról nem jelent;
//   · ⭐⭐ D82: egy elágazásból három készülék mást-mást látott — a bizonyíték után UGYANAZT számolják.
//
// Futtatás: node koino/meres/mind.js eszlelo

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { probaGyujtemeny } from './probaFuttato.js';
import { esemenyTarNyitasa, fajlBlobTarolo, lancTarolo } from '../js/tar/fajlTar.js';
import { sajatLancEsemenyei, esemenyMentese, koinoEsemenyei } from '../js/tar/esemenyTar.js';
import { esemenyLetrehozasa } from '../js/esemeny/esemeny.js';
import {
  koinoLetrehozasa, gondolatLetrehozasa, tudatpontRendezese, ellentmondasokBejelentese
} from '../js/muveletek.js';
import { lancAllapotaLancbol, lancGyokerKetGyokerbol, lancUjEsemenyhez } from '../js/allapot/lancGyoker.js';
import { allapotBizonyitek, allapotGyokere } from '../js/esemeny/osszegzoFa.js';
import { ellentmondasokKeresese } from '../js/allapot/eszlelo.js';
import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';

const { proba, futtatas } = probaGyujtemeny('Az észlelő (D82 sorrend ①)');

const KOINO = 'eszlelo-proba';

async function ujKornyezet(tar = null) {
  const mappa = await mkdtemp(join(tmpdir(), 'koino-eszlelo-'));
  tar ??= await esemenyTarNyitasa(KOINO, mappa);
  const kulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const szerzo = Buffer.from(await crypto.subtle.exportKey('raw', kulcspar.publicKey)).toString('base64url');
  return { koino: KOINO, kulcspar, szerzo, tar, darabTar: fajlBlobTarolo(KOINO, mappa), lancTarolo: lancTarolo(KOINO, mappa) };
}

async function elet(k) {
  await koinoLetrehozasa(k, 'Észlelő próba');
  const g1 = await gondolatLetrehozasa(k, { cim: 'Első' });
  const g2 = await gondolatLetrehozasa(k, { cim: 'Második' });
  await tudatpontRendezese(k, g1.azonosito, 30);
  await tudatpontRendezese(k, g2.azonosito, 20);
  await tudatpontRendezese(k, g1.azonosito, 45);
  return { g1, g2 };
}

/** Egy saját eseményt ír alá a lánc végére (a helyes gyökérrel és bizonyítékkal, vagy a megadottal). */
async function kezzelAlair(k, tipus, adat, beallitas = {}) {
  const lanc = await sajatLancEsemenyei(k.tar, k.szerzo);
  const utolso = lanc[lanc.length - 1];
  const sorszam = utolso.sorszam + 1;
  const pontE = tipus === 'TudatpontRendezes' ? adat.entitas : null;
  const helyes = await lancUjEsemenyhez(k.tar, KOINO, k.szerzo, sorszam, null, pontE);
  const e = await esemenyLetrehozasa({ koino: KOINO, tipus,
    adat: pontE ? { ...adat, bizonyitek: beallitas.bizonyitek ?? helyes.bizonyitek } : adat,
    entitas: pontE, entitasSorszam: 50 + sorszam, elozo: utolso.azonosito, sorszam,
    lancGyoker: beallitas.lancGyoker ?? helyes.lancGyoker }, k.kulcspar);
  const m = await esemenyMentese(k.tar, e);
  if (!m.mentve) throw new Error('nem menthető: ' + m.ok);
  return e;
}

// ===================================

proba('⛔⛔ BECSÜLETES TÁRBAN AZ ÉSZLELŐ SEMMIT NEM TALÁL — a garancia az automatikus bejelentésre is áll', async () => {
  const k = await ujKornyezet();
  const { g1 } = await elet(k);
  // ⚠️ Egy elvetett (régi alakú, bemondás nélküli) pont-esemény is: a szerző szabálya szerint nem változtat.
  await kezzelAlair(k, 'TudatpontRendezes', { entitas: g1.azonosito, pont: 99, szerep: 'aktiv' });
  await tudatpontRendezese(k, g1.azonosito, 12);
  await gondolatLetrehozasa(k, { cim: 'Utána' });
  const masik = await ujKornyezet(k.tar);
  await tudatpontRendezese(masik, g1.azonosito, 8);
  const mind = await koinoEsemenyei(k.tar, KOINO);
  return (await ellentmondasokKeresese(k.tar, KOINO, mind)).length === 0 && mind.length >= 10;
});

proba('⭐⭐ A HAZUG BEMONDÁST MEGTALÁLJA, BEJELENTI — és másodszor nem ismétli', async () => {
  const k = await ujKornyezet();
  const { g1 } = await elet(k);
  const hazug = await kezzelAlair(k, 'TudatpontRendezes', { entitas: g1.azonosito, pont: 60, szerep: 'aktiv', kiosztva: 10 });
  const figyelo = await ujKornyezet(k.tar);
  const leletek = await ellentmondasokKeresese(k.tar, KOINO, [hazug]);
  const elso = await ellentmondasokBejelentese(figyelo, leletek);
  const masodszor = await ellentmondasokBejelentese(figyelo, await ellentmondasokKeresese(k.tar, KOINO, [hazug]));
  return leletek.length === 1 && leletek[0].fajta === 'bemondas' && leletek[0].vadpont === hazug.sorszam
    && elso.bejelentve === 1 && masodszor.bejelentve === 0 && masodszor.marVolt === 1;
});

proba('⭐⭐ A HAMIS FOLYTONOSSÁGOT BÁRMELYIK OLDALRÓL MEGTALÁLJA — ha csak az előző, vagy csak a következő az új', async () => {
  const k = await ujKornyezet();
  const { g1, g2 } = await elet(k);
  const pont = await tudatpontRendezese(k, g1.azonosito, 70);
  const lanc = await sajatLancEsemenyei(k.tar, k.szerzo);
  const elotte = await lancAllapotaLancbol(lanc.slice(0, pont.sorszam - 1));
  const igaz = await lancAllapotaLancbol(lanc);
  // A következő pont-esemény a pont ELŐTTI kiosztásra épít — önmagában hibátlan (45 − 0 + 30 = 75).
  const kov = await kezzelAlair(k, 'TudatpontRendezes', { entitas: g2.azonosito, pont: 30, szerep: 'aktiv', kiosztva: 75 }, {
    lancGyoker: lancGyokerKetGyokerbol(igaz.naploGyoker, await allapotGyokere(elotte.kiosztasFa)),
    bizonyitek: await allapotBizonyitek(elotte.kiosztasFa, g2.azonosito) });
  const csakKov = await ellentmondasokKeresese(k.tar, KOINO, [kov]);
  const csakPont = await ellentmondasokKeresese(k.tar, KOINO, [pont]);
  const egy = (l) => l.length === 1 && l[0].fajta === 'folytonossag' && l[0].vadpont === kov.sorszam;
  return egy(csakKov) && egy(csakPont);
});

proba('⛔ AKINEK NINCS NÁLUNK HORGONYA, ARRÓL NEM JELENT — csak számolja', async () => {
  const k = await ujKornyezet();
  const { g1 } = await elet(k);
  const hazug = await kezzelAlair(k, 'TudatpontRendezes', { entitas: g1.azonosito, pont: 60, szerep: 'aktiv', kiosztva: 10 });
  // Egy MÁSIK tár, amibe csak a hazug esemény került (a csaló horgonya nem).
  const masikTar = (await ujKornyezet()).tar;
  await esemenyMentese(masikTar, hazug);
  const figyelo = await ujKornyezet(masikTar);
  const b = await ellentmondasokBejelentese(figyelo, await ellentmondasokKeresese(masikTar, KOINO, [hazug]));
  return b.bejelentve === 0 && b.nincsHorgony === 1;
});

proba('⭐⭐⭐ D82: AZ ELÁGAZÁS — három készülék mást-mást látott, a bizonyíték után UGYANAZT számolja', async () => {
  // A csaló egy pontról két eseményt ír alá (két ág): az egyik g1-re tesz, a másik g2-re.
  const k = await ujKornyezet();
  const { g1, g2 } = await elet(k);
  const lanc = await sajatLancEsemenyei(k.tar, k.szerzo);
  const utolso = lanc[lanc.length - 1];
  const sorszam = utolso.sorszam + 1;
  const ag = async (entitas, pont, kiosztva) => {
    const h = await lancUjEsemenyhez(k.tar, KOINO, k.szerzo, sorszam, null, entitas);
    return esemenyLetrehozasa({ koino: KOINO, tipus: 'TudatpontRendezes', entitas, entitasSorszam: 90,
      adat: { entitas, pont, szerep: 'aktiv', kiosztva, bizonyitek: h.bizonyitek },
      elozo: utolso.azonosito, sorszam, lancGyoker: h.lancGyoker }, k.kulcspar);
  };
  const a = await ag(g1.azonosito, 50, 70);      // 45 → 50 (g2: 20): 70
  const b = await ag(g2.azonosito, 10, 55);      // 20 → 10 (g1: 45): 55
  const [nyertes, vesztes] = a.azonosito < b.azonosito ? [a, b] : [b, a];
  const alap = await koinoEsemenyei(k.tar, KOINO);

  // Három készülék: az egyik mindkét ágat látja, a másik csak a nyertest, a harmadik csak a vesztest.
  const keszulek = async (agak) => {
    const t = (await ujKornyezet()).tar;
    for (const e of [...alap, ...agak]) await esemenyMentese(t, e);
    return t;
  };
  const mindketto = await keszulek([a, b]);
  const csakNyertes = await keszulek([nyertes]);
  const csakVesztes = await keszulek([vesztes]);
  const pontjai = async (t) => {
    const s = allapotSzamitasa(await koinoEsemenyei(t, KOINO));
    return [g1, g2].map((g) => s.entitasok.get(g.azonosito)?.hozzajarulok.get(k.szerzo)?.pont ?? 0).join('/');
  };
  const elotte = [await pontjai(mindketto), await pontjai(csakNyertes), await pontjai(csakVesztes)];

  // A mindkettőt látó készülék észleli, és bejelenti — a bizonyíték eljut a másik kettőhöz is.
  const figyelo = await ujKornyezet(mindketto);
  const leletek = await ellentmondasokKeresese(mindketto, KOINO, [a, b]);
  const bej = await ellentmondasokBejelentese(figyelo, leletek);
  const vad = (await koinoEsemenyei(mindketto, KOINO)).find((e) => e.tipus === 'Ellentmondas');
  for (const t of [csakNyertes, csakVesztes]) await esemenyMentese(t, vad);
  const utana = [await pontjai(mindketto), await pontjai(csakNyertes), await pontjai(csakVesztes)];

  return leletek.length === 1 && leletek[0].fajta === 'elagazas' && leletek[0].vesztes === vesztes.azonosito
    && bej.bejelentve === 1
    && elotte[2] !== elotte[0]                                   // előtte: a csak-vesztes másképp számolt
    && utana[0] === utana[1] && utana[1] === utana[2]            // ⭐ utána: mind a három ugyanazt
    && utana[0] === elotte[0];                                   // …és pont azt, amit a mindkettőt látó
});

proba('⛔⛔ A HAMIS ELÁGAZÁS-BIZONYÍTÉK ELBUKIK — nem azonos sorszám, ugyanaz az esemény kétszer, rossz vesztes, idegen szerző', async () => {
  const k = await ujKornyezet();
  const { g1, g2 } = await elet(k);
  const lanc = await sajatLancEsemenyei(k.tar, k.szerzo);
  const utolso = lanc[lanc.length - 1];
  const ag = async (kp, szerzo, entitas) => {
    const h = await lancUjEsemenyhez(k.tar, KOINO, szerzo, utolso.sorszam + 1, null, entitas);
    return esemenyLetrehozasa({ koino: KOINO, tipus: 'TudatpontRendezes', entitas, entitasSorszam: 90,
      adat: { entitas, pont: 5, szerep: 'aktiv', kiosztva: 50, bizonyitek: h.bizonyitek },
      elozo: utolso.azonosito, sorszam: utolso.sorszam + 1, lancGyoker: h.lancGyoker }, kp);
  };
  const a = await ag(k.kulcspar, k.szerzo, g1.azonosito);
  const b = await ag(k.kulcspar, k.szerzo, g2.azonosito);
  const [ny, v] = a.azonosito < b.azonosito ? [a, b] : [b, a];
  const idegen = await ujKornyezet(k.tar);
  const idegenAg = await esemenyLetrehozasa({ koino: KOINO, tipus: 'GondolatLetrehozas', adat: { cim: 'x' },
    elozo: null, sorszam: ny.sorszam }, idegen.kulcspar);
  const { ellentmondasEllenorzese } = await import('../js/allapot/ellentmondas.js');
  const ell = async (adat) => (await ellentmondasEllenorzese(adat, KOINO)).rendben;
  const alap = { kit: k.szerzo, fajta: 'elagazas', esemeny: ny, masik: v, vesztes: v.azonosito };
  const esetek = [
    ['ép', await ell(alap), true],
    ['nem azonos sorszám', await ell({ ...alap, masik: utolso, vesztes: [ny.azonosito, utolso.azonosito].sort()[1] }), false],
    ['ugyanaz az esemény kétszer', await ell({ ...alap, masik: ny, vesztes: ny.azonosito }), false],
    ['rossz vesztes (a nyertes)', await ell({ ...alap, vesztes: ny.azonosito }), false],
    ['idegen szerző eseménye', await ell({ ...alap, masik: idegenAg, vesztes: [ny.azonosito, idegenAg.azonosito].sort()[1] }), false]
  ];
  const rossz = esetek.filter(([, kapott, vart]) => kapott !== vart).map(([nev]) => nev);
  if (rossz.length) console.log('    (rosszul ítélt esetek: ' + rossz.join(', ') + ')');
  return rossz.length === 0;
});

export default futtatas;
