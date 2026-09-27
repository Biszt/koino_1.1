// koino/meres/ellentmondasProba.js

// Felelősség: AZ ELLENTMONDÁS BIZONYÍTÉKÁNAK próbája (D79, D80, D81 — `js/allapot/ellentmondas.js`, a
// kapu, a szabály-réteg és a bejelentés).
//
// Amit mér:
//   · ⛔⛔ A GARANCIA: becsületes láncon EGYETLEN vád sem megy át — egyik fajta sem, semelyik ponton,
//     akkor sem, ha a láncban egy elvetett (régi alakú) pont-esemény is van;
//   · a három csalás (bemondás · folytonosság · negatív levél) bizonyítéka átmegy, a vádpont a helyes —
//     ⭐ D81 óta a vádolt SAJÁT aláírt eseményeiből (a negatív levélnél + a levél bizonyítéka);
//   · a hamis vád a KAPUN elbukik (átírt esemény, más vádolt, rossz vádpont, lánc-gyökér nélküli
//     esemény, nem szomszédos események, nem pont-esemény, negatív pont, koholt levél-bizonyíték…);
//   · a bejelentés a vádolt AZONOSSÁG-SZELETÉBE kerül (alapítónál a koino-létrehozás, másnál a belépés);
//   · a szabály-réteg a vádponttól a vádolt pont-eseményeit kihagyja — előtte nem, és mást nem érint;
//     ⭐ és D81 óta a hazug bemondás MAGA is elbukik, hézagos láncnál is (bizonyíték-esemény nélkül).
//
// Futtatás: node koino/meres/mind.js ellentmondas

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { probaGyujtemeny } from './probaFuttato.js';
import { esemenyTarNyitasa, fajlBlobTarolo, lancTarolo } from '../js/tar/fajlTar.js';
import { sajatLancEsemenyei, esemenyMentese, koinoEsemenyei } from '../js/tar/esemenyTar.js';
import { esemenyLetrehozasa } from '../js/esemeny/esemeny.js';
import {
  koinoLetrehozasa, gondolatLetrehozasa, tudatpontRendezese, belepes, ellentmondasBejelentese
} from '../js/muveletek.js';
import {
  lancAllapotaLancbol, lancGyokerKetGyokerbol, lancUjEsemenyhez, KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ
} from '../js/allapot/lancGyoker.js';
import { ellentmondasEllenorzese } from '../js/allapot/ellentmondas.js';
import {
  allapotBizonyitek, allapotLista, ujAllapotFa, allapotBeallitas, allapotGyokere
} from '../js/esemeny/osszegzoFa.js';
import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';

const { proba, futtatas } = probaGyujtemeny('Az ellentmondás bizonyítéka (D79, D80, D81)');

const KOINO = 'ellentmondas-proba';

async function ujKulcs() {
  const kulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const szerzo = Buffer.from(await crypto.subtle.exportKey('raw', kulcspar.publicKey)).toString('base64url');
  return { kulcspar, szerzo };
}

/** Egy tár (egy „készülék") és rajta egy e-ember környezete. */
async function ujKornyezet(tar = null, mappa = null) {
  mappa ??= await mkdtemp(join(tmpdir(), 'koino-ellentmondas-'));
  tar ??= await esemenyTarNyitasa(KOINO, mappa);
  const { kulcspar, szerzo } = await ujKulcs();
  return { koino: KOINO, kulcspar, szerzo, tar, darabTar: fajlBlobTarolo(KOINO, mappa),
    lancTarolo: lancTarolo(KOINO, mappa + '-' + szerzo.slice(0, 6)) };
}

/** Egy becsületes élet: gondolatok, pontok, átrendezés, visszavétel. */
async function elet(k, alapit = true) {
  if (alapit) await koinoLetrehozasa(k, 'Ellentmondás próba');
  const g1 = await gondolatLetrehozasa(k, { cim: 'Első' });
  const g2 = await gondolatLetrehozasa(k, { cim: 'Második' });
  await tudatpontRendezese(k, g1.azonosito, 30);
  await tudatpontRendezese(k, g2.azonosito, 20);
  await tudatpontRendezese(k, g1.azonosito, 45);
  await tudatpontRendezese(k, g2.azonosito, 0);
  return { g1, g2 };
}

/**
 * Egy saját eseményt ír alá a lánc végére — a HELYES lánc-gyökérrel (vagy a megadottal), és pont-
 * eseménynél a helyes bizonyítékkal (D81) — a hívó adja az adatot (akár hazugat).
 */
async function kezzelAlair(k, tipus, adat, beallitas = {}) {
  const lanc = await sajatLancEsemenyei(k.tar, k.szerzo);
  const utolso = lanc[lanc.length - 1];
  const sorszam = utolso.sorszam + 1;
  // ⚠️ A bizonyíték nem pont-eseményhez is kérhető (`bizonyitekKulcs` — az álcázott esemény próbájához),
  // és megadható készen (`bizonyitek` — a hamis fából, a csaló előképéhez).
  const pontE = beallitas.bizonyitekKulcs ?? (tipus === 'TudatpontRendezes' ? adat.entitas : null);
  const helyes = await lancUjEsemenyhez(k.tar, KOINO, k.szerzo, sorszam, null, pontE);
  const lancGyoker = beallitas.lancGyoker ?? helyes.lancGyoker;
  const bizonyitek = beallitas.bizonyitek ?? helyes.bizonyitek;
  const e = await esemenyLetrehozasa({ koino: KOINO, tipus, adat: pontE ? { ...adat, bizonyitek } : adat,
    entitas: beallitas.entitas ?? null, entitasSorszam: 50 + sorszam, elozo: utolso.azonosito, sorszam, lancGyoker }, k.kulcspar);
  const m = await esemenyMentese(k.tar, e);
  if (!m.mentve) throw new Error('nem menthető: ' + m.ok);
  return e;
}

/** A szerző IGAZ kiosztás-fája az i-edik (0-tól számolt) eseménye előtt (a negatív levél próbáihoz). */
async function igazFa(lanc, i) {
  return (await lancAllapotaLancbol(lanc.slice(0, i))).kiosztasFa;
}

/** Egy csaló láncán egy hazug bemondás — a bizonyíték és a hamisítások alapja. */
async function hazugBemondas() {
  const k = await ujKornyezet();
  const { g1 } = await elet(k);
  const hazug = await kezzelAlair(k, 'TudatpontRendezes',
    { entitas: g1.azonosito, pont: 60, szerep: 'aktiv', kiosztva: 10 }, { entitas: g1.azonosito });
  return { k, g1, hazug, adat: { kit: k.szerzo, fajta: 'bemondas', vadpont: hazug.sorszam, esemeny: hazug } };
}

// ===================================
// 1. ⛔⛔ A GARANCIA — becsületes láncra nem állítható össze vád
// ===================================

proba('⛔⛔ A GARANCIA: BECSÜLETES LÁNCON EGYETLEN VÁD SEM MEGY ÁT — egyik fajta sem, semelyik ponton (egy elvetett pont-eseménnyel is)', async () => {
  const k = await ujKornyezet();
  const { g1 } = await elet(k);
  // ⚠️ Egy ELVETETT pont-esemény is kerül a láncba (bemondott összeg nélkül — a régi alak): a szerző
  // szabálya szerint nem változtat — a bizonyíték-ellenőrzésnek ugyanígy kell látnia.
  await kezzelAlair(k, 'TudatpontRendezes', { entitas: g1.azonosito, pont: 99, szerep: 'aktiv' }, { entitas: g1.azonosito });
  await tudatpontRendezese(k, g1.azonosito, 12);
  await gondolatLetrehozasa(k, { cim: 'Utána' });
  const lanc = await sajatLancEsemenyei(k.tar, k.szerzo);

  let probalt = 0;
  const atment = [];
  const vad = async (adat) => {
    probalt++;
    if ((await ellentmondasEllenorzese(adat, KOINO)).rendben) atment.push(adat.fajta + '@' + adat.vadpont);
  };
  for (let i = 0; i < lanc.length; i++) {
    const e = lanc[i];
    if (e.tipus === 'TudatpontRendezes') {
      for (const vadpont of [e.sorszam, e.sorszam + 1]) await vad({ kit: k.szerzo, fajta: 'bemondas', vadpont, esemeny: e });
    }
    const fa = await igazFa(lanc, i);
    for (const level of allapotLista(fa)) {
      await vad({ kit: k.szerzo, fajta: 'negativ', vadpont: e.sorszam, esemeny: e, kulcs: level.kulcs,
        bizonyitek: await allapotBizonyitek(fa, level.kulcs) });
    }
    if (i + 1 < lanc.length) {
      await vad({ kit: k.szerzo, fajta: 'folytonossag', vadpont: e.sorszam + 1, esemeny: e, kovetkezo: lanc[i + 1] });
    }
  }
  if (atment.length) console.log('    (becsületes láncon átment vád: ' + atment.join(', ') + ')');
  return atment.length === 0 && probalt >= 20;
});

// ===================================
// 2. A HÁROM CSALÁS — a vádolt saját aláírt eseményeiből
// ===================================

proba('⭐⭐ A HAZUG BEMONDÁS bizonyítéka átmegy — EGYETLEN esemény a bizonyíték (D81)', async () => {
  const { adat, hazug } = await hazugBemondas();
  const r = await ellentmondasEllenorzese(adat, KOINO);
  return r.rendben && r.vadpont === hazug.sorszam;
});

proba('⭐⭐ A HAMIS FOLYTONOSSÁG bizonyítéka átmegy — a következő esemény úgy tesz, mintha a pont nem történt volna meg (két esemény)', async () => {
  const k = await ujKornyezet();
  const { g1 } = await elet(k);
  const pont = await tudatpontRendezese(k, g1.azonosito, 70);
  const lanc = await sajatLancEsemenyei(k.tar, k.szerzo);
  // A csaló a következő eseményben a napló igaz gyökerét, de a pont ELŐTTI kiosztást köti el.
  const igaz = await lancAllapotaLancbol(lanc);
  const hamis = lancGyokerKetGyokerbol(igaz.naploGyoker, pont.lancGyoker.kiosztas);
  const kov = await kezzelAlair(k, 'GondolatLetrehozas', { cim: 'Hamis gyökérrel' }, { lancGyoker: hamis });
  const r = await ellentmondasEllenorzese({ kit: k.szerzo, fajta: 'folytonossag', vadpont: kov.sorszam,
    esemeny: pont, kovetkezo: kov }, KOINO);
  return r.rendben && r.vadpont === kov.sorszam;
});

proba('⭐⭐ A NEGATÍV LEVÉL bizonyítéka átmegy — a rejtett −5000 egy nem létező entitáson', async () => {
  const k = await ujKornyezet();
  await elet(k);
  const lanc = await sajatLancEsemenyei(k.tar, k.szerzo);
  const igaz = await lancAllapotaLancbol(lanc);
  // A csaló fája: az igaz kiosztás + egy −5000-es levél.
  const csaloFa = ujAllapotFa(KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ);
  for (const l of allapotLista(igaz.kiosztasFa)) await allapotBeallitas(csaloFa, l.kulcs, null, l.osszegek);
  await allapotBeallitas(csaloFa, 'nem-letezo-entitas', null, [-5000]);
  const e = await kezzelAlair(k, 'GondolatLetrehozas', { cim: 'Negatív levéllel' },
    { lancGyoker: lancGyokerKetGyokerbol(igaz.naploGyoker, await allapotGyokere(csaloFa)) });
  const r = await ellentmondasEllenorzese({ kit: k.szerzo, fajta: 'negativ', vadpont: e.sorszam, esemeny: e,
    kulcs: 'nem-letezo-entitas', bizonyitek: await allapotBizonyitek(csaloFa, 'nem-letezo-entitas') }, KOINO);
  return r.rendben && r.vadpont === e.sorszam;
});

// ===================================
// 3. A HAMIS VÁD — a kapun
// ===================================

proba('⛔⛔ A HAMIS VÁD A KAPUN ELBUKIK — átírt esemény (előkép is), más vádolt, rossz vádpont, gyökér nélküli esemény, nem szomszédos, nem pont-esemény, negatív pont, koholt levél', async () => {
  const { k, g1, adat } = await hazugBemondas();
  const bejelento = await ujKornyezet(k.tar);
  const masik = await ujKulcs();
  let lanc = await sajatLancEsemenyei(k.tar, k.szerzo);
  const becsuletesPont = lanc.find((e) => e.tipus === 'TudatpontRendezes');
  const [p1, p2] = lanc.filter((e) => e.tipus === 'TudatpontRendezes');
  // Egy lánc-gyökér NÉLKÜLI (régi alakú) esemény; egy NEM pont-esemény pont-szerű adattal; egy negatív pontú.
  const gyokerNelkul = await kezzelAlair(k, 'GondolatLetrehozas', { cim: 'Régi alak' }, { lancGyoker: null });
  // ⚠️ Az álcázott esemény HELYES bizonyítékot is hoz — különben a hiányzó bizonyíték buktatná, és a
  // típus-ellenőrzést semmi nem mérné (a rontás-próba így derítette ki).
  const alcazott = await kezzelAlair(k, 'GondolatLetrehozas', { cim: 'Álcázott', entitas: g1.azonosito, pont: 60, kiosztva: 10 },
    { bizonyitekKulcs: g1.azonosito });
  const negativ = await kezzelAlair(k, 'TudatpontRendezes', { entitas: g1.azonosito, pont: -5, szerep: 'aktiv', kiosztva: 10 },
    { entitas: g1.azonosito });
  lanc = await sajatLancEsemenyei(k.tar, k.szerzo);
  // A koholt levél: a bejelentő SAJÁT fája egy negatív levéllel — a becsületes esemény gyökeréhez nem illik.
  const koholt = ujAllapotFa(KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ);
  for (const l of allapotLista(await igazFa(lanc, becsuletesPont.sorszam - 1))) await allapotBeallitas(koholt, l.kulcs, null, l.osszegek);
  await allapotBeallitas(koholt, 'kitalalt', null, [-7]);

  const esetek = [
    ['átírt vádolt esemény', { ...adat, esemeny: { ...adat.esemeny, adat: { ...adat.esemeny.adat, kiosztva: 11 } } }],
    ['a vádolt esemény előképe átírva (felfújt összeg)', { ...adat, esemeny: { ...adat.esemeny, lancGyoker: {
      ...adat.esemeny.lancGyoker, kiosztas: { ...adat.esemeny.lancGyoker.kiosztas, o: [adat.esemeny.lancGyoker.kiosztas.o[0] + 1000] } } } }],
    ['más a vádolt', { ...adat, kit: masik.szerzo }],
    ['rossz vádpont', { ...adat, vadpont: adat.vadpont - 1 }],
    ['becsületes pont-esemény', { kit: k.szerzo, fajta: 'bemondas', vadpont: becsuletesPont.sorszam, esemeny: becsuletesPont }],
    ['lánc-gyökér nélküli esemény', { kit: k.szerzo, fajta: 'negativ', vadpont: gyokerNelkul.sorszam, esemeny: gyokerNelkul,
      kulcs: 'kitalalt', bizonyitek: await allapotBizonyitek(koholt, 'kitalalt') }],
    ['nem szomszédos események', { kit: k.szerzo, fajta: 'folytonossag', vadpont: p2.sorszam + 1, esemeny: p1, kovetkezo: lanc[p2.sorszam] }],
    ['nem pont-esemény bemondásként', { kit: k.szerzo, fajta: 'bemondas', vadpont: alcazott.sorszam, esemeny: alcazott }],
    ['negatív pont bemondásként', { kit: k.szerzo, fajta: 'bemondas', vadpont: negativ.sorszam, esemeny: negativ }],
    ['koholt levél-bizonyíték', { kit: k.szerzo, fajta: 'negativ', vadpont: becsuletesPont.sorszam, esemeny: becsuletesPont,
      kulcs: 'kitalalt', bizonyitek: await allapotBizonyitek(koholt, 'kitalalt') }],
    ['ismeretlen fajta', { ...adat, fajta: 'gyanu' }]
  ];
  const atment = [];
  for (const [nev, hamis] of esetek) {
    const e = await esemenyLetrehozasa({ koino: KOINO, tipus: 'Ellentmondas', adat: hamis, elozo: null, sorszam: 1 },
      bejelento.kulcspar);
    if ((await esemenyMentese(k.tar, e)).mentve) atment.push(nev);
  }
  // Kontroll: az ÉP bizonyíték ugyanígy átmegy a kapun.
  const ep = await esemenyLetrehozasa({ koino: KOINO, tipus: 'Ellentmondas', adat, elozo: null, sorszam: 1 }, masik.kulcspar);
  if (atment.length) console.log('    (átment hamis vád: ' + atment.join(', ') + ')');
  return atment.length === 0 && (await esemenyMentese(k.tar, ep)).mentve === true;
});

// ===================================
// 4. A BEJELENTÉS ÉS A KÖVETKEZMÉNY
// ===================================

proba('⭐⭐ A BEJELENTÉS A VÁDOLT AZONOSSÁG-SZELETÉBE KERÜL — alapítónál a koino-létrehozás, másnál a belépés; horgony nélkül megnevezett hiba', async () => {
  // Az alapító csal.
  const { k, adat } = await hazugBemondas();
  const bejelento = await ujKornyezet(k.tar);
  const vad = await ellentmondasBejelentese(bejelento, adat);
  const alapitas = (await sajatLancEsemenyei(k.tar, k.szerzo)).find((e) => e.tipus === 'KoinoLetrehozas');
  // Egy belépett tag csal.
  const tag = await ujKornyezet(k.tar);
  const horgony = await belepes(tag);
  const { g1 } = await elet(tag, false);
  const hazug = await kezzelAlair(tag, 'TudatpontRendezes',
    { entitas: g1.azonosito, pont: 60, szerep: 'aktiv', kiosztva: 10 }, { entitas: g1.azonosito });
  const tagVad = await ellentmondasBejelentese(bejelento, { kit: tag.szerzo, fajta: 'bemondas', vadpont: hazug.sorszam, esemeny: hazug });
  // Egy vádolt, akinek NINCS horgonya nálunk (egy másik tárban él).
  const idegen = await hazugBemondas();
  let megnevezte = false;
  try { await ellentmondasBejelentese(bejelento, idegen.adat); } catch (h) { megnevezte = h.message.includes('azonosság-szelete'); }
  return vad.entitas === alapitas.azonosito && tagVad.entitas === horgony.azonosito && megnevezte;
});

proba('⭐⭐⭐ A SZABÁLY-RÉTEG: a hazug bemondás MAGA is elbukik (D81, hézagnál is) — a bizonyítékkal a vádponttól minden pontja; mást nem érint', async () => {
  const { k, g1, hazug, adat } = await hazugBemondas();
  // A csaló a hazugság UTÁN még tesz pontot (a művelet-réteg a saját szabálya szerint számol tovább).
  const utana = await tudatpontRendezese(k, g1.azonosito, 5);
  // Egy másik e-ember is tesz pontot ugyanarra a gondolatra.
  const masik = await ujKornyezet(k.tar);
  await tudatpontRendezese(masik, g1.azonosito, 8);

  const pontja = (a, szerzo) => a.entitasok.get(g1.azonosito)?.hozzajarulok.get(szerzo)?.pont ?? 0;
  const kiesett = (a, e, jel) => a.kivetelek.some((x) => x.azonosito === e.azonosito && String(x.ok).includes(jel));
  const elotte = allapotSzamitasa(await koinoEsemenyei(k.tar, KOINO));
  await ellentmondasBejelentese(masik, adat);
  const utanaAllapot = allapotSzamitasa(await koinoEsemenyei(k.tar, KOINO));

  // ⭐⭐ A SZELETELT VILÁG: ha a csaló láncában HÉZAG van (egy korábbi eseménye nincs nálunk), a D42 a
  // hazug bemondást csak JELEZNÉ — ⭐ a D81 óta az esemény saját bizonyítéka ott is elveti.
  const hezagos = (await koinoEsemenyei(k.tar, KOINO)).filter((e) => !(e.szerzo === k.szerzo && e.sorszam === 3));
  const hezagElott = allapotSzamitasa(hezagos.filter((e) => e.tipus !== 'Ellentmondas'));
  const hezagUtan = allapotSzamitasa(hezagos);
  return pontja(elotte, k.szerzo) === 5                     // bizonyíték nélkül: a hazug kiesik (D81), a későbbi 5 számít
    && kiesett(elotte, hazug, 'D81')
    && pontja(utanaAllapot, k.szerzo) === 45                // a bizonyítékkal: a vádpont előtti állás (45) marad
    && kiesett(utanaAllapot, utana, 'D80')
    && pontja(utanaAllapot, masik.szerzo) === 8             // a másik e-embert nem érinti
    && kiesett(hezagElott, hazug, 'D81')                    // ⭐ hézaggal is bizonyítottan kiesik (a D42 csak jelzett volna)
    && kiesett(hezagUtan, utana, 'D80')
    && pontja(hezagUtan, k.szerzo) === 45;
});

proba('⭐⭐ A HAMIS ELŐKÉPŰ PONT-ESEMÉNY — önmagában következetes, csak a folytonosság buktatja le; a vádpontja MAGA is kiesik (≥)', async () => {
  // A csaló egy pont után úgy tesz, mintha az meg sem történt volna: a KÖVETKEZŐ pont-eseményét a
  // pont ELŐTTI kiosztásra építi — és ahhoz képest a bemondása HIBÁTLAN. A saját bizonyítéka tehát
  // átmegy (D81), hézagos láncnál a D42 sem fogja meg; csak a két esemény együtt (a folytonosság).
  const k = await ujKornyezet();
  const { g1, g2 } = await elet(k);
  const pont = await tudatpontRendezese(k, g1.azonosito, 70);           // g1: 45 → 70
  const lanc = await sajatLancEsemenyei(k.tar, k.szerzo);
  const igaz = await lancAllapotaLancbol(lanc);
  const hamisFa = await igazFa(lanc, pont.sorszam - 1);                   // a pont ELŐTTI kiosztás (g1: 45)
  const kov = await kezzelAlair(k, 'TudatpontRendezes',
    { entitas: g2.azonosito, pont: 30, szerep: 'aktiv', kiosztva: 75 },   // 45 − 0 + 30: a hamis fához hibátlan
    { entitas: g2.azonosito, lancGyoker: lancGyokerKetGyokerbol(igaz.naploGyoker, await allapotGyokere(hamisFa)),
      bizonyitek: await allapotBizonyitek(hamisFa, g2.azonosito) });
  // Hézag a csaló láncában (a g2 születése hiányzik): a láncból számolt ellenőrzés nem ítélhet.
  const hezagos = async () => (await koinoEsemenyei(k.tar, KOINO)).filter((e) => !(e.szerzo === k.szerzo && e.sorszam === 3));
  const kiesett = (a, e, jel) => a.kivetelek.some((x) => x.azonosito === e.azonosito && String(x.ok).includes(jel));
  const elotte = allapotSzamitasa(await hezagos());
  const bejelento = await ujKornyezet(k.tar);
  await ellentmondasBejelentese(bejelento, { kit: k.szerzo, fajta: 'folytonossag', vadpont: kov.sorszam, esemeny: pont, kovetkezo: kov });
  const utana = allapotSzamitasa(await hezagos());
  return !elotte.kivetelek.some((x) => x.azonosito === kov.azonosito)   // bizonyíték nélkül: számít (önmagában hibátlan)
    && kiesett(utana, kov, 'D80');                                        // a bizonyítékkal: a vádpont MAGA is kiesik
});

proba('⭐⭐ A BECSÜLETES PONT-ESEMÉNY HÉZAGNÁL IS ELLENŐRZÖTT — a saját bizonyítéka igazolja, nem kap „nem ellenőrizhető" jelzést (D81)', async () => {
  // A csaló egy korábbi PONT-eseménye hiányzik nálunk (a 4.: g1 = 30) — a láncból számolt összeg így
  // eltér a bemondottól. D81 előtt ez „nem ellenőrizhető" jelzés lett volna; most az esemény saját
  // bizonyítéka igazolja, hogy a bemondás helyes (a hiba a MI lemaradásunk).
  const k = await ujKornyezet();
  const { g1 } = await elet(k);
  const hezagos = (await koinoEsemenyei(k.tar, KOINO)).filter((e) => !(e.szerzo === k.szerzo && e.sorszam === 4));
  const a = allapotSzamitasa(hezagos);
  const jelzett = a.nemEllenorizhetok.filter((x) => x.szerzo === k.szerzo && x.tipus === 'TudatpontRendezes');
  const kiesett = a.kivetelek.filter((x) => x.szerzo === k.szerzo && x.tipus === 'TudatpontRendezes');
  return jelzett.length === 0 && kiesett.length === 0
    && a.entitasok.get(g1.azonosito)?.hozzajarulok.get(k.szerzo)?.pont === 45;
});

export default futtatas;
