// koino/meres/ellentmondasProba.js

// Felelősség: AZ ELLENTMONDÁS BIZONYÍTÉKÁNAK próbája (D79, D80 — `js/allapot/ellentmondas.js`, a kapu,
// a szabály-réteg és a bejelentés).
//
// Amit mér:
//   · ⛔⛔ A GARANCIA: becsületes láncon EGYETLEN vád sem megy át — egyik fajta sem, semelyik ponton,
//     akkor sem, ha a láncban egy elvetett (régi alakú) pont-esemény is van;
//   · a három csalás (bemondás · folytonosság · negatív levél) bizonyítéka átmegy, a vádpont a helyes;
//   · a hamis vád a KAPUN elbukik (átírt esemény, más vádolt, rossz vádpont, nem illő előkép…);
//   · a bejelentés a vádolt AZONOSSÁG-SZELETÉBE kerül (alapítónál a koino-létrehozás, másnál a belépés);
//   · a szabály-réteg a vádponttól a vádolt pont-eseményeit kihagyja — előtte nem, és mást nem érint.
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
  lancAllapotaLancbol, lancGyokerKetGyokerbol, lancGyokerUjEsemenyhez, KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ
} from '../js/allapot/lancGyoker.js';
import { ellentmondasEllenorzese } from '../js/allapot/ellentmondas.js';
import {
  allapotBizonyitek, allapotLista, ujAllapotFa, allapotBeallitas, allapotGyokere
} from '../js/esemeny/osszegzoFa.js';
import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';

const { proba, futtatas } = probaGyujtemeny('Az ellentmondás bizonyítéka (D79, D80)');

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
  return { koino: KOINO, kulcspar, szerzo, tar, darabTar: fajlBlobTarolo(KOINO, mappa), lancTarolo: lancTarolo(KOINO, mappa + '-' + szerzo.slice(0, 6)) };
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

/** A szerző IGAZ állapota az i-edik (0-tól számolt) eseménye előtt — előkép és a kiosztás fája. */
async function igazAllapot(lanc, i) {
  const a = await lancAllapotaLancbol(lanc.slice(0, i));
  return { elotte: { naplo: a.naploGyoker, kiosztas: a.kiosztasGyoker }, fa: a.kiosztasFa };
}

/** Egy saját eseményt ír alá a lánc végére, a HELYES gyökérrel — a hívó adja az adatot (akár hazugat). */
async function kezzelAlair(k, tipus, adat, beallitas = {}) {
  const lanc = await sajatLancEsemenyei(k.tar, k.szerzo);
  const utolso = lanc[lanc.length - 1];
  const sorszam = utolso.sorszam + 1;
  const lancGyoker = beallitas.lancGyoker ?? await lancGyokerUjEsemenyhez(k.tar, KOINO, k.szerzo, sorszam);
  const e = await esemenyLetrehozasa({ koino: KOINO, tipus, adat, entitas: beallitas.entitas ?? null,
    entitasSorszam: 50 + sorszam, elozo: utolso.azonosito, sorszam, lancGyoker }, k.kulcspar);
  const m = await esemenyMentese(k.tar, e);
  if (!m.mentve) throw new Error('nem menthető: ' + m.ok);
  return e;
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
    const r = await ellentmondasEllenorzese(adat, KOINO);
    if (r.rendben) atment.push(adat.fajta + '@' + adat.vadpont);
  };
  for (let i = 0; i < lanc.length; i++) {
    const e = lanc[i];
    const { elotte, fa } = await igazAllapot(lanc, i);
    if (e.tipus === 'TudatpontRendezes') {
      const bizonyitek = await allapotBizonyitek(fa, e.adat.entitas);
      for (const vadpont of [e.sorszam, e.sorszam + 1]) {
        await vad({ kit: k.szerzo, fajta: 'bemondas', vadpont, esemeny: e, elotte, bizonyitek });
      }
    }
    for (const level of allapotLista(fa)) {
      await vad({ kit: k.szerzo, fajta: 'negativ', vadpont: e.sorszam, esemeny: e, elotte, kulcs: level.kulcs,
        bizonyitek: await allapotBizonyitek(fa, level.kulcs) });
    }
    if (i + 1 < lanc.length) {
      const kov = await igazAllapot(lanc, i + 1);
      const bizonyitek = e.tipus === 'TudatpontRendezes' ? await allapotBizonyitek(fa, e.adat.entitas) : null;
      await vad({ kit: k.szerzo, fajta: 'folytonossag', vadpont: e.sorszam + 1, esemeny: e, elotte, bizonyitek,
        kovetkezo: lanc[i + 1], kovetkezoElotte: kov.elotte });
    }
  }
  if (atment.length) console.log('    (becsületes láncon átment vád: ' + atment.join(', ') + ')');
  return atment.length === 0 && probalt >= 20;
});

// ===================================
// 2. A HÁROM CSALÁS
// ===================================

proba('⭐⭐ A HAZUG BEMONDÁS bizonyítéka átmegy — a vádpont a hazug pont-esemény', async () => {
  const k = await ujKornyezet();
  const { g1 } = await elet(k);
  const hazug = await kezzelAlair(k, 'TudatpontRendezes',
    { entitas: g1.azonosito, pont: 60, szerep: 'aktiv', kiosztva: 10 }, { entitas: g1.azonosito });
  const lanc = await sajatLancEsemenyei(k.tar, k.szerzo);
  const { elotte, fa } = await igazAllapot(lanc, hazug.sorszam - 1);
  const adat = { kit: k.szerzo, fajta: 'bemondas', vadpont: hazug.sorszam, esemeny: hazug, elotte,
    bizonyitek: await allapotBizonyitek(fa, g1.azonosito) };
  const r = await ellentmondasEllenorzese(adat, KOINO);
  return r.rendben && r.vadpont === hazug.sorszam;
});

proba('⭐⭐ A HAMIS FOLYTONOSSÁG bizonyítéka átmegy — a következő esemény úgy tesz, mintha a pont nem történt volna meg', async () => {
  const k = await ujKornyezet();
  const { g1 } = await elet(k);
  const pont = await tudatpontRendezese(k, g1.azonosito, 70);
  let lanc = await sajatLancEsemenyei(k.tar, k.szerzo);
  const elotte = await igazAllapot(lanc, pont.sorszam - 1);
  // A csaló a következő eseményben a napló igaz gyökerét, de a pont ELŐTTI kiosztást köti el.
  const igazKov = await igazAllapot([...lanc, { sorszam: pont.sorszam + 1 }], pont.sorszam);
  const hamisElokep = { naplo: igazKov.elotte.naplo, kiosztas: elotte.elotte.kiosztas };
  const kov = await kezzelAlair(k, 'GondolatLetrehozas', { cim: 'Hamis gyökérrel' },
    { lancGyoker: await lancGyokerKetGyokerbol(hamisElokep.naplo, hamisElokep.kiosztas) });
  lanc = await sajatLancEsemenyei(k.tar, k.szerzo);
  const adat = { kit: k.szerzo, fajta: 'folytonossag', vadpont: kov.sorszam, esemeny: pont, elotte: elotte.elotte,
    bizonyitek: await allapotBizonyitek(elotte.fa, g1.azonosito), kovetkezo: kov, kovetkezoElotte: hamisElokep };
  const r = await ellentmondasEllenorzese(adat, KOINO);
  return r.rendben && r.vadpont === kov.sorszam;
});

proba('⭐⭐ A NEGATÍV LEVÉL bizonyítéka átmegy — a rejtett −5000 egy nem létező entitáson', async () => {
  const k = await ujKornyezet();
  await elet(k);
  const lanc = await sajatLancEsemenyei(k.tar, k.szerzo);
  const igaz = await igazAllapot([...lanc, { sorszam: lanc.length + 1 }], lanc.length);
  // A csaló fája: az igaz kiosztás + egy −5000-es levél.
  const csaloFa = ujAllapotFa(KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ);
  for (const l of allapotLista(igaz.fa)) await allapotBeallitas(csaloFa, l.kulcs, null, l.osszegek);
  await allapotBeallitas(csaloFa, 'nem-letezo-entitas', null, [-5000]);
  const elotte = { naplo: igaz.elotte.naplo, kiosztas: await allapotGyokere(csaloFa) };
  const e = await kezzelAlair(k, 'GondolatLetrehozas', { cim: 'Negatív levéllel' },
    { lancGyoker: await lancGyokerKetGyokerbol(elotte.naplo, elotte.kiosztas) });
  const adat = { kit: k.szerzo, fajta: 'negativ', vadpont: e.sorszam, esemeny: e, elotte, kulcs: 'nem-letezo-entitas',
    bizonyitek: await allapotBizonyitek(csaloFa, 'nem-letezo-entitas') };
  const r = await ellentmondasEllenorzese(adat, KOINO);
  return r.rendben && r.vadpont === e.sorszam;
});

// ===================================
// 3. A HAMIS VÁD — a kapun
// ===================================

/** Egy csaló láncán egy ÉP bizonyíték (a hazug bemondás) — a hamisítások alapja. */
async function epBizonyitek() {
  const k = await ujKornyezet();
  const { g1 } = await elet(k);
  const hazug = await kezzelAlair(k, 'TudatpontRendezes',
    { entitas: g1.azonosito, pont: 60, szerep: 'aktiv', kiosztva: 10 }, { entitas: g1.azonosito });
  const lanc = await sajatLancEsemenyei(k.tar, k.szerzo);
  const { elotte, fa } = await igazAllapot(lanc, hazug.sorszam - 1);
  return { k, g1, hazug, lanc, adat: { kit: k.szerzo, fajta: 'bemondas', vadpont: hazug.sorszam, esemeny: hazug, elotte,
    bizonyitek: await allapotBizonyitek(fa, g1.azonosito) } };
}

proba('⛔⛔ A HAMIS VÁD A KAPUN ELBUKIK — átírt esemény, más vádolt, rossz vádpont, nem illő előkép, becsületes lánc HAMIS SZÁMMAL, nem szomszédos események, nem pont-esemény, negatív pont', async () => {
  const { k, g1, adat, lanc } = await epBizonyitek();
  const bejelento = await ujKornyezet(k.tar);
  const masik = await ujKulcs();
  const becsuletesPont = lanc.find((e) => e.tipus === 'TudatpontRendezes');
  const bp = await igazAllapot(lanc, becsuletesPont.sorszam - 1);
  const bpUtan = await igazAllapot(lanc, becsuletesPont.sorszam);
  // ⛔ A becsületes lánc, de a bejelentő a (lenyomattal kötött) előkép ÖSSZEGÉT felfújja.
  const felfujt = (x) => ({ ...x, kiosztas: { ...x.kiosztas, o: [x.kiosztas.o[0] + 1000] } });
  // Két NEM szomszédos becsületes esemény: a köztük lévő pont-esemény miatt az állapot jogosan más.
  const pontok = lanc.filter((e) => e.tipus === 'TudatpontRendezes');
  const [p1, p2] = pontok;
  const p1a = await igazAllapot(lanc, p1.sorszam - 1);
  const p2utan = await igazAllapot(lanc, p2.sorszam);
  // Egy NEM pont-esemény, aminek az adata pont-eseménynek látszik — és egy negatív pontú.
  const alcazott = await kezzelAlair(k, 'GondolatLetrehozas', { cim: 'Álcázott', entitas: g1.azonosito, pont: 60, kiosztva: 10 });
  const negativ = await kezzelAlair(k, 'TudatpontRendezes', { entitas: g1.azonosito, pont: -5, szerep: 'aktiv', kiosztva: 10 },
    { entitas: g1.azonosito });
  const lanc2 = await sajatLancEsemenyei(k.tar, k.szerzo);
  const aa = await igazAllapot(lanc2, alcazott.sorszam - 1);
  const na = await igazAllapot(lanc2, negativ.sorszam - 1);
  const esetek = [
    ['becsületes bemondás, felfújt összeg az előképben', { kit: k.szerzo, fajta: 'bemondas', vadpont: becsuletesPont.sorszam,
      esemeny: becsuletesPont, elotte: felfujt(bp.elotte), bizonyitek: await allapotBizonyitek(bp.fa, becsuletesPont.adat.entitas) }],
    ['becsületes folytonosság, felfújt összeg a következő előképben', { kit: k.szerzo, fajta: 'folytonossag',
      vadpont: becsuletesPont.sorszam + 1, esemeny: becsuletesPont, elotte: bp.elotte,
      bizonyitek: await allapotBizonyitek(bp.fa, becsuletesPont.adat.entitas),
      kovetkezo: lanc[becsuletesPont.sorszam], kovetkezoElotte: felfujt(bpUtan.elotte) }],
    ['nem szomszédos események', { kit: k.szerzo, fajta: 'folytonossag', vadpont: p2.sorszam + 1, esemeny: p1,
      elotte: p1a.elotte, bizonyitek: await allapotBizonyitek(p1a.fa, p1.adat.entitas),
      kovetkezo: lanc[p2.sorszam], kovetkezoElotte: p2utan.elotte }],
    ['nem pont-esemény bemondásként', { kit: k.szerzo, fajta: 'bemondas', vadpont: alcazott.sorszam, esemeny: alcazott,
      elotte: aa.elotte, bizonyitek: await allapotBizonyitek(aa.fa, g1.azonosito) }],
    ['negatív pont bemondásként', { kit: k.szerzo, fajta: 'bemondas', vadpont: negativ.sorszam, esemeny: negativ,
      elotte: na.elotte, bizonyitek: await allapotBizonyitek(na.fa, g1.azonosito) }],
    // ⛔⛔ A KOHOLT ELŐKÉP: a bejelentő egy SAJÁT fát rak össze (az igaz + egy kitalált levél), hozzá illő
    // bizonyítékkal — és ezzel „bizonyítaná", hogy a becsületes bemondás hazug. Csak az állítja meg,
    // hogy az előkép nem illik a pont-esemény ALÁÍRT lánc-gyökeréhez. *(A rontás-próba derítette ki,
    // hogy ezt az őrt egyetlen eset sem mérte.)*
    ['koholt előkép (saját fa, hozzá illő bizonyítékkal)', await (async () => {
      const koholt = ujAllapotFa(KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ);
      for (const l of allapotLista(bp.fa)) await allapotBeallitas(koholt, l.kulcs, null, l.osszegek);
      await allapotBeallitas(koholt, 'kitalalt-entitas', null, [7]);
      return { kit: k.szerzo, fajta: 'bemondas', vadpont: becsuletesPont.sorszam, esemeny: becsuletesPont,
        elotte: { naplo: bp.elotte.naplo, kiosztas: await allapotGyokere(koholt) },
        bizonyitek: await allapotBizonyitek(koholt, becsuletesPont.adat.entitas) };
    })()],
    ['átírt vádolt esemény', { ...adat, esemeny: { ...adat.esemeny, adat: { ...adat.esemeny.adat, kiosztva: 11 } } }],
    ['más a vádolt', { ...adat, kit: masik.szerzo }],
    ['rossz vádpont', { ...adat, vadpont: adat.vadpont - 1 }],
    ['nem illő előkép', { ...adat, elotte: { ...adat.elotte, kiosztas: bp.elotte.kiosztas } }],
    ['becsületes pont-esemény', { kit: k.szerzo, fajta: 'bemondas', vadpont: becsuletesPont.sorszam, esemeny: becsuletesPont,
      elotte: bp.elotte, bizonyitek: await allapotBizonyitek(bp.fa, becsuletesPont.adat.entitas) }],
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
  const { k, adat } = await epBizonyitek();
  const bejelento = await ujKornyezet(k.tar);
  const vad = await ellentmondasBejelentese(bejelento, adat);
  const alapitas = (await sajatLancEsemenyei(k.tar, k.szerzo)).find((e) => e.tipus === 'KoinoLetrehozas');
  // Egy belépett tag csal.
  const tag = await ujKornyezet(k.tar);
  const horgony = await belepes(tag);
  const { g1 } = await elet(tag, false);
  const hazug = await kezzelAlair(tag, 'TudatpontRendezes',
    { entitas: g1.azonosito, pont: 60, szerep: 'aktiv', kiosztva: 10 }, { entitas: g1.azonosito });
  const lanc = await sajatLancEsemenyei(tag.tar, tag.szerzo);
  const { elotte, fa } = await igazAllapot(lanc, hazug.sorszam - 1);
  const tagVad = await ellentmondasBejelentese(bejelento, { kit: tag.szerzo, fajta: 'bemondas', vadpont: hazug.sorszam,
    esemeny: hazug, elotte, bizonyitek: await allapotBizonyitek(fa, g1.azonosito) });
  // Egy vádolt, akinek NINCS horgonya nálunk (egy másik tárban él).
  const idegen = await epBizonyitek();
  let megnevezte = false;
  try { await ellentmondasBejelentese(bejelento, idegen.adat); } catch (h) { megnevezte = h.message.includes('azonosság-szelete'); }
  return vad.entitas === alapitas.azonosito && tagVad.entitas === horgony.azonosito && megnevezte;
});

proba('⭐⭐⭐ A SZABÁLY-RÉTEG A VÁDPONTTÓL KIHAGYJA A PONTJAIT — előtte számítanak, és mást nem érint', async () => {
  const { k, g1, hazug } = await epBizonyitek();
  // A csaló a hazugság UTÁN még tesz pontot (a művelet-réteg a saját szabálya szerint számol tovább).
  const utana = await tudatpontRendezese(k, g1.azonosito, 5);
  // Egy másik e-ember is tesz pontot ugyanarra a gondolatra.
  const masik = await ujKornyezet(k.tar);
  await tudatpontRendezese(masik, g1.azonosito, 8);

  const elotte = allapotSzamitasa(await koinoEsemenyei(k.tar, KOINO));
  const lanc = await sajatLancEsemenyei(k.tar, k.szerzo);
  const { elotte: e0, fa } = await igazAllapot(lanc, hazug.sorszam - 1);
  await ellentmondasBejelentese(masik, { kit: k.szerzo, fajta: 'bemondas', vadpont: hazug.sorszam, esemeny: hazug,
    elotte: e0, bizonyitek: await allapotBizonyitek(fa, g1.azonosito) });
  const utanaAllapot = allapotSzamitasa(await koinoEsemenyei(k.tar, KOINO));

  const pontja = (a, szerzo) => a.entitasok.get(g1.azonosito)?.hozzajarulok.get(szerzo)?.pont ?? 0;
  const kihagyva = new Set(utanaAllapot.kivetelek.filter((x) => String(x.ok).includes('D80')).map((x) => x.azonosito ?? x.esemeny?.azonosito));
  // ⭐⭐ A SZELETELT VILÁG: ha a csaló láncában HÉZAG van (egy korábbi eseménye nincs nálunk), a D42 a
  // hazug bemondást csak JELZI (nem ellenőrizhető) — a pontja számít. A bizonyíték ott is kihagyja:
  // ez a vádpont „≥"-e (a hazug esemény maga is kiesik), és ez a bizonyíték valódi haszna.
  const hezagos = (await koinoEsemenyei(k.tar, KOINO)).filter((e) => !(e.szerzo === k.szerzo && e.sorszam === 3));   // a g2 születése hiányzik: hézag
  const hezagElott = allapotSzamitasa(hezagos.filter((e) => e.tipus !== 'Ellentmondas'));
  const hezagUtan = allapotSzamitasa(hezagos);
  return pontja(elotte, k.szerzo) === 5                    // a bizonyíték előtt: a hazugság után tett 5 számít
    && pontja(utanaAllapot, k.szerzo) === 45                // utána: a vádpont előtti állás (45) marad
    && pontja(utanaAllapot, masik.szerzo) === 8             // a másik e-embert nem érinti
    && kihagyva.has(utana.azonosito)
    && !hezagElott.kivetelek.some((x) => x.azonosito === hazug.azonosito)   // hézaggal a D42 nem veti el
    && hezagUtan.kivetelek.some((x) => x.azonosito === hazug.azonosito && String(x.ok).includes('D80'))
    && pontja(hezagUtan, k.szerzo) === 45;                  // a bizonyítékkal a vádpont előtti 45 marad
});

export default futtatas;
