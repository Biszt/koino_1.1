// koino/meres/kerelemProba.js

// Felelősség: A KÉRELEM (D92/4–6 — `js/csere/kerelem.js`, és a menete a vonalon) próbája.
//
// Amit mér: (1) a kérdés alakja: csak az ismert fajta, azonosító alakú kulcs (a gyökér csak fejlécre), korlátos n és
// d; (2) ⭐ a FEJLÉCEK valódi aláírt eseményekkel: össz-pont szerint rendezve, a legjobb ág d szintig, a töredék is
// (a létrehozója a javaslat), és a kérdező a mintákkal ellenőrzi — a becsületes válasz átmegy; (3) ⛔ a hamisítások:
// más szülőjű tétel, átírt létrehozó, a gyökér összege ≠ a bemondott össz-pont, felfújt részfa-fa — tételenként
// kimondva; (4) a nem tartott entitás bemondott össz-ponttal, gyökér nélkül jön (`forras`); (5) a törzs
// lenyomatai.

import { probaGyujtemeny, ujEember } from './probaFuttato.js';
import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';
import { reszfaKarbantarto, OSSZPONT_FA, reszfaLevelei, osszPontokSzamitasa, gyerekJegyzek } from '../js/allapot/osszPont.js';
import { ujAllapotFa, allapotBeallitas, allapotGyokere } from '../js/esemeny/osszegzoFa.js';
import { GYOKER_KULCS } from '../js/csere/szeletEgyeztetes.js';
import { toredekAzonosito } from '../js/allapot/szabalyok.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSocket } from 'node:dgram';
import { parbeszed } from '../js/csere/vonal.js';
import { kezfogasUdpResen, udpKapcsolat, kerelemUdpResen, szeletUdpResen, valaszUdpResen } from '../js/csere/udpVonal.js';
import { esemenyTarNyitasa, fajlBlobTarolo, memoriaBlobTarolo } from '../js/tar/fajlTar.js';
import { esemenyMentese } from '../js/tar/esemenyTar.js';
import { readdir } from 'node:fs/promises';
import {
  kerelemFelvetele, lejartakKivetele, tarshozIllo, kerelemLezarasa, probalkozas, fuggoCelok, fuggoKopogtatok,
  nyilvantartasAlakja, ujNyilvantartas, FUGGO_KORLAT, FUGGO_ELEVULES, CEL_KORLAT
} from '../js/csere/fuggoKerelmek.js';
import {
  tovabbiUgras, UGRAS_MAX, valaszAlakja,
  kerelemAlakja, fejlecekValasza, mintaKeres, mintakValasza, fejlecekEllenorzese, torzsLenyomatai, FEJLEC_KORLAT,
  MELYSEG_KORLAT
} from '../js/csere/kerelem.js';

const { proba, futtatas } = probaGyujtemeny('A kérelem: az alapkérdések (D92/4–6)');

const AZ = 'A'.repeat(43);

// ===================================
// 1. A KÉRDÉS ALAKJA
// ===================================

proba('a kérdés alakja: ismert fajta, azonosító alakú kulcs; a gyökér csak fejlécre; n és d korlátos', () => {
  const jo = kerelemAlakja({ fajta: 'fejlecek', kulcs: AZ, n: 9999, d: 99 });
  return jo?.n === FEJLEC_KORLAT && jo.d === MELYSEG_KORLAT
    && kerelemAlakja({ fajta: 'fejlecek', kulcs: GYOKER_KULCS })?.n === 20
    && kerelemAlakja({ fajta: 'torzs', kulcs: GYOKER_KULCS }) === null
    && kerelemAlakja({ fajta: 'szelet', kulcs: 'x' }) === null
    && kerelemAlakja({ fajta: 'barmi', kulcs: AZ }) === null
    && kerelemAlakja(null) === null && kerelemAlakja({ fajta: 'szelet', kulcs: AZ, n: -3 })?.n === 20;
});

// ===================================
// 2. A FEJLÉCEK — VALÓDI ESEMÉNYEKKEL
// ===================================

/**
 * A fa: két legfelső gondolat (NAGY, KICSI); a NAGY alatt három gyerek (G1 > G2 > G3 össz-pont szerint), a G1 alatt
 * egy unoka; és egy egyesítési javaslat G2 + G3-ra (két töredék, a G2 és a G3 gyerekei).
 */
async function vilag() {
  const emberek = [];
  for (let i = 0; i < 3; i++) emberek.push(await ujEember('proba'));
  const [anna, bela, cili] = emberek;
  const es = [];
  const g = async (ki, cim, szulo = null) => { const e = await ki.tesz('GondolatLetrehozas', { cim, meret: 10, ...(szulo ? { szulo } : {}) }); es.push(e); return e.azonosito; };
  const pont = async (ki, entitas, p) => es.push(await ki.tesz('TudatpontRendezes', { entitas, pont: p }));
  const nagy = await g(anna, 'NAGY');
  const kicsi = await g(bela, 'KICSI');
  const g1 = await g(anna, 'ELSO', nagy);
  const g2 = await g(anna, 'MASIK', nagy);
  const g3 = await g(bela, 'HARMADIK', nagy);
  const unoka = await g(cili, 'UNOKA', g1);
  await pont(anna, nagy, 10); await pont(bela, nagy, 5); await pont(bela, kicsi, 3);
  await pont(anna, g1, 8); await pont(cili, g1, 6); await pont(anna, g2, 4); await pont(bela, g3, 2);
  await pont(cili, unoka, 7);
  // Az egyesítési javaslat (két érintett → két töredék); a javaslattevőnek pontja kell mindkettőn.
  await pont(bela, g2, 1);
  const j = await bela.tesz('Javaslat', { fajta: 'szerkesztesi', indoklas: null,
    erintettek: [{ entitas: g2, muvelet: 'Egyesites', valtozas: { cim: 'EGY' } }, { entitas: g3, muvelet: 'Egyesites', valtozas: null }] });
  es.push(j);
  // A töredékek csak pontjukkal léteznek (D14) — a javaslattevő kezdő pontja (D85).
  await pont(bela, toredekAzonosito(j.azonosito, g2), 1);
  await pont(bela, toredekAzonosito(j.azonosito, g3), 1);
  const allapot = await allapotSzamitasa(es);
  const terkep = new Map(es.map((e) => [e.azonosito, e]));
  return { allapot, terkep, nagy, kicsi, g1, g2, g3, unoka, j: j.azonosito, es };
}

const olvaso = (terkep) => async (az) => terkep.get(az) ?? null;

proba('⭐⭐ a gyökér fejlécei össz-pont szerint, a legjobb ág d = 2 szintig — és a kérdező mintákkal ellenőrzi', async () => {
  const v = await vilag();
  const { valasz, fak } = await fejlecekValasza({ allapot: v.allapot, kulcs: GYOKER_KULCS, n: 10, d: 2,
    karbantarto: reszfaKarbantarto(), esemenyOlvas: olvaso(v.terkep) });
  const kert = mintaKeres(valasz);
  const { mintak, esemenyek } = await mintakValasza({ fak, kert, esemenyOlvas: olvaso(v.terkep) });
  const e = await fejlecekEllenorzese({ valasz, kert, mintak, esemenyek });
  const sorrend = valasz.lista.map((t) => t.az);
  // A NAGY ág: 15 + G1 (14 + unoka 7) + G2 (5 + a töredéke 1) + G3 (2 + a töredéke 1) = 45.
  return sorrend[0] === v.nagy && sorrend[1] === v.kicsi && valasz.lista[0].osszPont === 45
    && valasz.ag?.kulcs === v.nagy && valasz.ag.lista[0].az === v.g1 && valasz.ag.ag?.kulcs === v.g1
    && valasz.ag.ag.lista[0].az === v.unoka
    && e.hibas === 0 && e.ellenorzott >= 2 && e.tetelek.get(v.nagy).mintazott === true;
});

proba('⭐ a TÖREDÉK is fejléc (a létrehozója a javaslat, a szülője a saját érintettje) — és átmegy az ellenőrzésen', async () => {
  const v = await vilag();
  const toredek = [...v.allapot.entitasok.values()].find((e) => e.toredek && e.szulo === v.g2);
  const { valasz } = await fejlecekValasza({ allapot: v.allapot, kulcs: v.g2, n: 10, d: 0,
    karbantarto: reszfaKarbantarto(), esemenyOlvas: olvaso(v.terkep) });
  const e = await fejlecekEllenorzese({ valasz, kert: {}, mintak: {}, esemenyek: [] });
  const t = valasz.lista.find((x) => x.az === toredek?.azonosito);
  // ⚠️ A helyén van: nem „felkerült” (különben a felkerülés menekülőútja elfedné a hibás szülő-levezetést).
  return !!toredek && !!t && t.letrehozo.azonosito === v.j && e.tetelek.get(toredek.azonosito)?.rendben === true
    && t.felkerult === undefined && e.tetelek.get(toredek.azonosito).felkerult === undefined;
});

proba('⛔ a HAMIS tételek tételenként elbuknak: más szülőjű, átírt létrehozó, a gyökér összege ≠ össz-pont', async () => {
  const v = await vilag();
  const { valasz } = await fejlecekValasza({ allapot: v.allapot, kulcs: v.nagy, n: 10, d: 0,
    karbantarto: reszfaKarbantarto(), esemenyOlvas: olvaso(v.terkep) });
  const lista = valasz.lista.map((t) => ({ ...t }));
  // (1) egy idegen tétel: a KICSI (a gyökér gyereke) a NAGY alá csempészve
  const kicsi = v.terkep.get(v.kicsi);
  lista.push({ az: v.kicsi, letrehozo: kicsi, osszPont: 3, forras: 'szamolt', bizonytalan: 0, gyoker: null });
  // (2) átírt létrehozó (más cím — az azonosító már nem a lenyomata)
  lista[0] = { ...lista[0], letrehozo: { ...lista[0].letrehozo, adat: { ...lista[0].letrehozo.adat, cim: 'ÁTÍRT' } } };
  // (3) a gyökér összege nem a bemondott össz-pont (felfújt szám)
  lista[1] = { ...lista[1], osszPont: lista[1].osszPont + 100 };
  const e = await fejlecekEllenorzese({ valasz: { ...valasz, lista }, kert: {}, mintak: {}, esemenyek: [] });
  const ok = (az) => e.tetelek.get(az)?.ok ?? '';
  return /nem a kérdezett entitás gyereke/.test(ok(v.kicsi)) && /nem hiteles/.test(ok(lista[0].az))
    && /nem a bemondott össz-pont/.test(ok(lista[1].az)) && e.hibas === 3
    && [...e.tetelek.values()].filter((x) => x.rendben).length === lista.length - 3;
});

proba('⛔ a FELFÚJT részfa-fa (a tartó hamis leveleket tesz bele) a mintákon lebukik', async () => {
  const v = await vilag();
  const karb = reszfaKarbantarto();
  const { valasz, fak } = await fejlecekValasza({ allapot: v.allapot, kulcs: GYOKER_KULCS, n: 10, d: 0, karbantarto: karb,
    esemenyOlvas: olvaso(v.terkep) });
  // A csaló a NAGY fáját felfújja: a valódi levelek + egy hamis szerző (egy más entitásra szóló eseménnyel).
  const o = osszPontokSzamitasa(v.allapot.entitasok);
  const levelek = reszfaLevelei(v.nagy, v.allapot, o, gyerekJegyzek(v.allapot.entitasok));
  const fa = ujAllapotFa(OSSZPONT_FA, 1);
  for (const l of levelek) await allapotBeallitas(fa, l.kulcs, l.ertek, l.osszegek);
  const idegen = v.es.find((e) => e.tipus === 'TudatpontRendezes' && e.adat.entitas === v.kicsi);
  await allapotBeallitas(fa, 'p:' + idegen.szerzo, { e: idegen.azonosito }, [400]);
  const gyoker = await allapotGyokere(fa);
  fak.set(v.nagy, fa);
  const lista = valasz.lista.map((t) => (t.az === v.nagy ? { ...t, gyoker, osszPont: gyoker.o[0] } : t));
  const hamis = { ...valasz, lista };
  const kert = mintaKeres(hamis, { kivalasztott: v.nagy, minta: { kivalasztott: 32, testver: 0, testverDb: 0 } });
  const { mintak, esemenyek } = await mintakValasza({ fak, kert, esemenyOlvas: olvaso(v.terkep) });
  const e = await fejlecekEllenorzese({ valasz: hamis, kert, mintak, esemenyek });
  return e.tetelek.get(v.nagy)?.rendben === false && /mást mond/.test(e.tetelek.get(v.nagy).ok);
});

proba('a NEM TARTOTT entitás bemondott össz-ponttal, gyökér nélkül jön — és ezt kimondja (`forras`)', async () => {
  const v = await vilag();
  // A KICSI szeletét „nem tartjuk": a pontjai ismeretlenek, a bemondása 99.
  v.allapot.entitasok.get(v.kicsi).pontokIsmeretlenek = true;
  const { valasz } = await fejlecekValasza({ allapot: v.allapot, kulcs: GYOKER_KULCS, n: 10, d: 0,
    karbantarto: reszfaKarbantarto(), esemenyOlvas: olvaso(v.terkep), bemondasok: new Map([[v.kicsi, { osszPont: 99 }]]) });
  const t = valasz.lista.find((x) => x.az === v.kicsi);
  const e = await fejlecekEllenorzese({ valasz, kert: mintaKeres(valasz), mintak: {}, esemenyek: [] });
  return valasz.lista[0].az === v.kicsi && t.forras === 'bemondott' && t.gyoker === null && t.osszPont === 99
    && e.tetelek.get(v.kicsi).rendben === true && e.tetelek.get(v.kicsi).gyokerVan === false;
});

proba('a FELKERÜLT gyerek (a szülőjét a D14 elfelejtette) a nagyszülő fejlécei közt jön, és ezt kimondja', async () => {
  const anna = await ujEember('proba');
  const a = await anna.tesz('GondolatLetrehozas', { cim: 'NAGYSZULO', meret: 10 });
  const b = await anna.tesz('GondolatLetrehozas', { cim: 'ELFELEJTETT', meret: 10, szulo: a.azonosito });
  const c = await anna.tesz('GondolatLetrehozas', { cim: 'UNOKA', meret: 10, szulo: b.azonosito });
  const es = [a, b, c, await anna.tesz('TudatpontRendezes', { entitas: a.azonosito, pont: 5 }),
    await anna.tesz('TudatpontRendezes', { entitas: c.azonosito, pont: 3 })];
  const allapot = await allapotSzamitasa(es);
  const terkep = new Map(es.map((e) => [e.azonosito, e]));
  const { valasz } = await fejlecekValasza({ allapot, kulcs: a.azonosito, n: 10, d: 0, karbantarto: reszfaKarbantarto(),
    esemenyOlvas: olvaso(terkep) });
  const e = await fejlecekEllenorzese({ valasz, kert: {}, mintak: {}, esemenyek: [] });
  const t = valasz.lista.find((x) => x.az === c.azonosito);
  return !allapot.entitasok.has(b.azonosito) && t?.felkerult === true
    && e.tetelek.get(c.azonosito)?.rendben === true && e.tetelek.get(c.azonosito)?.felkerult === true;
});

// ===================================
// 3. A TÖRZS
// ===================================

proba('a törzs lenyomatai: a szöveg-darab, a szövegben és az ikonban hivatkozott fájlok — korlátosan', async () => {
  const L = (c) => c.repeat(43);
  const ent = { ikon: '/api/fajl/' + L('I'), szoveg: [{ tipus: 'kep', url: '/api/fajl/' + L('K') }, { tipus: 'szoveg', tartalom: 'x' }] };
  const hiv = { szoveg: { lenyomat: L('D'), bajt: 10 } };
  const a = await torzsLenyomatai(ent);
  const b = await torzsLenyomatai(hiv);
  return a.includes(L('I')) && a.includes(L('K')) && a.length === 2 && b.length === 1 && b[0] === L('D');
});

// ===================================
// 4. ⭐⭐ A MENET A VÉDETT RÉSEN (`KERELEM` → `FEJLECEK` → `MINTAKEREK` → `MINTAK`; `TORZS` → fájlok)
// ===================================

async function udpPar() {
  const egyik = createSocket({ type: 'udp4', reuseAddr: true });
  const masik = createSocket({ type: 'udp4', reuseAddr: true });
  await new Promise((t) => egyik.bind(0, '127.0.0.1', t));
  await new Promise((t) => masik.bind(0, '127.0.0.1', t));
  return { egyik, masik, egyikPort: egyik.address().port, masikPort: masik.address().port,
    bezar: () => { egyik.close(); masik.close(); } };
}

/** A tartó a résen: kézfogás, aztán a `parbeszed` a kapott kiszolgálóval. */
async function tartoResen(halo, port, tar, beallitas) {
  const v = await kezfogasUdpResen(halo, '127.0.0.1', port);
  try {
    return await parbeszed(udpKapcsolat(v, '127.0.0.1', port), tar, 'proba', beallitas);
  } finally {
    v.zar();
  }
}

/** A tartó kiszolgálója egy világból — ahogy a `koino.js` is összerakja (a vállalás kívülről). */
function kiszolgaloVilagbol(v, { vallalom = () => true, blob = null } = {}) {
  const karbantarto = reszfaKarbantarto();
  return {
    async fejlecek(k) {
      const { valasz, fak } = await fejlecekValasza({ allapot: v.allapot, kulcs: k.kulcs, n: k.n, d: k.d, karbantarto,
        esemenyOlvas: olvaso(v.terkep) });
      return { valasz, mintak: (kert, megvan) => mintakValasza({ fak, kert, megvan, esemenyOlvas: olvaso(v.terkep) }) };
    },
    async torzs(k) {
      if (!vallalom(k.kulcs)) return [];
      const ent = v.allapot.entitasok.get(k.kulcs);
      const ki = [];
      for (const l of await torzsLenyomatai(ent, blob ? (x) => blob.olvas(x) : null)) if (await blob?.van(l)) ki.push(l);
      return ki;
    }
  };
}

proba('⭐⭐ a FEJLÉCEK a védett résen: a kérő a gyökerek UTÁN kér mintát, és a válasz átmegy az ellenőrzésen', async () => {
  const v = await vilag();
  const p = await udpPar();
  const hely = await mkdtemp(join(tmpdir(), 'koino-kerelem-'));
  try {
    const tar = await esemenyTarNyitasa('proba', hely);
    const [, kapott] = await Promise.all([
      tartoResen(p.egyik, p.masikPort, tar, { kerelemKiszolgalo: kiszolgaloVilagbol(v) }),
      kerelemUdpResen(p.masik, '127.0.0.1', p.egyikPort, 'proba', { fajta: 'fejlecek', kulcs: GYOKER_KULCS, n: 10, d: 1 },
        { mintaValaszto: (valasz) => mintaKeres(valasz) })
    ]);
    const e = await fejlecekEllenorzese({ valasz: kapott.valasz, kert: kapott.kert, mintak: kapott.mintak,
      esemenyek: kapott.esemenyek });
    return kapott.kiszolgalta && kapott.valasz.lista[0].az === v.nagy && kapott.valasz.ag?.kulcs === v.nagy
      && e.hibas === 0 && e.ellenorzott >= 1 && kapott.esemenyek.length >= 1;
  } finally {
    p.bezar();
    await rm(hely, { recursive: true, force: true });
  }
});

/** Egy gondolat szöveg-darabbal: a darab a tartó fájl-tárában. */
async function szovegesVilag(hely) {
  const anna = await ujEember('proba');
  const blob = fajlBlobTarolo('proba', hely);
  const { lenyomat } = await blob.ir(new TextEncoder().encode(JSON.stringify('A GONDOLAT SZÖVEGE')));
  const g = await anna.tesz('GondolatLetrehozas', { cim: 'SZOVEGES', meret: 10, szoveg: { lenyomat, bajt: 20 } });
  const pont = await anna.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 5 });
  const allapot = await allapotSzamitasa([g, pont]);
  return { allapot, terkep: new Map([[g.azonosito, g], [pont.azonosito, pont]]), g: g.azonosito, lenyomat, blob };
}

proba('⭐⭐ a TÖRZS a védett résen: a vállaló a szöveg-darabot adja, és a kérő fájl-tárába bájtra azonosan megérkezik', async () => {
  const p = await udpPar();
  const gazdaHely = await mkdtemp(join(tmpdir(), 'koino-torzs-a-'));
  const keroHely = await mkdtemp(join(tmpdir(), 'koino-torzs-b-'));
  try {
    const v = await szovegesVilag(gazdaHely);
    const tar = await esemenyTarNyitasa('proba', gazdaHely);
    const keroBlob = fajlBlobTarolo('proba', keroHely);
    const [, kapott] = await Promise.all([
      tartoResen(p.egyik, p.masikPort, tar, { kerelemKiszolgalo: kiszolgaloVilagbol(v, { blob: v.blob }),
        fajlOlvas: (l) => v.blob.olvas(l) }),
      kerelemUdpResen(p.masik, '127.0.0.1', p.egyikPort, 'proba', { fajta: 'torzs', kulcs: v.g }, { blob: keroBlob })
    ]);
    const nala = await keroBlob.olvas(v.lenyomat);
    const eredeti = await v.blob.olvas(v.lenyomat);
    return kapott.lenyomatok.length === 1 && kapott.fajlok[0]?.kesz === true
      && nala && Buffer.from(nala).equals(Buffer.from(eredeti));
  } finally {
    p.bezar();
    await rm(gazdaHely, { recursive: true, force: true });
    await rm(keroHely, { recursive: true, force: true });
  }
});

proba('⛔ D84/1: aki NEM vállalja, az a törzset nem adja ki — üres lista, és semmi nem érkezik', async () => {
  const p = await udpPar();
  const gazdaHely = await mkdtemp(join(tmpdir(), 'koino-torzs-c-'));
  const keroHely = await mkdtemp(join(tmpdir(), 'koino-torzs-d-'));
  try {
    const v = await szovegesVilag(gazdaHely);
    const tar = await esemenyTarNyitasa('proba', gazdaHely);
    const keroBlob = fajlBlobTarolo('proba', keroHely);
    const [, kapott] = await Promise.all([
      tartoResen(p.egyik, p.masikPort, tar, { kerelemKiszolgalo: kiszolgaloVilagbol(v, { blob: v.blob, vallalom: () => false }),
        fajlOlvas: (l) => v.blob.olvas(l) }),
      kerelemUdpResen(p.masik, '127.0.0.1', p.egyikPort, 'proba', { fajta: 'torzs', kulcs: v.g }, { blob: keroBlob })
    ]);
    return kapott.kiszolgalta === true && kapott.lenyomatok.length === 0 && !(await keroBlob.van(v.lenyomat));
  } finally {
    p.bezar();
    await rm(gazdaHely, { recursive: true, force: true });
    await rm(keroHely, { recursive: true, force: true });
  }
});

proba('⛔ kiszolgáló nélkül a tartó KESZ-t mond — a kérő nem vár a tétlenségi óráig', async () => {
  const p = await udpPar();
  const hely = await mkdtemp(join(tmpdir(), 'koino-kerelem-x-'));
  try {
    const tar = await esemenyTarNyitasa('proba', hely);
    const kezdet = Date.now();
    const [, kapott] = await Promise.all([
      tartoResen(p.egyik, p.masikPort, tar, {}),
      kerelemUdpResen(p.masik, '127.0.0.1', p.egyikPort, 'proba', { fajta: 'fejlecek', kulcs: GYOKER_KULCS })
    ]);
    return kapott.kiszolgalta === false && Date.now() - kezdet < 5000;
  } finally {
    p.bezar();
    await rm(hely, { recursive: true, force: true });
  }
});

// ===================================
// 5. A FÜGGŐ KÉRELMEK (D92/1) — a cím nélküli kérés nyilvántartása
// ===================================

const K1 = 'B'.repeat(43), K2 = 'C'.repeat(43);
const SZ = 'D'.repeat(43);

proba('a függő kérelem felvétele — ugyanaz (fajta + kulcs) nem lesz kétszer: a célok és a kopogtatók összeolvadnak', () => {
  let r = kerelemFelvetele(ujNyilvantartas(), { fajta: 'fejlecek', kulcs: K1, celok: [{ hoszt: '10.0.0.1', port: 7373, alairo: SZ }],
    kopogtatok: [{ fajta: 'keszulek', kulcs: SZ }] }, 1000, 'k1');
  const elso = r;
  r = kerelemFelvetele(r.nyilvantartas, { fajta: 'fejlecek', kulcs: K1, celok: [{ hoszt: '10.0.0.1', port: 7373 },
    { hoszt: '10.0.0.2', port: 7373 }], kopogtatok: [{ fajta: 'gyoker', kulcs: '0:0' }] }, 2000, 'k2');
  const f = r.nyilvantartas.fuggo;
  return elso.uj && !r.uj && r.az === 'k1' && f.length === 1 && f[0].celok.length === 2 && f[0].celok[0].alairo === SZ
    && f[0].kopogtatok.length === 2 && fuggoCelok(r.nyilvantartas).length === 2 && fuggoKopogtatok(r.nyilvantartas).length === 2;
});

proba('a korlát fölött a legrégebbi függő kiesik — és a kész naplóban kimondja (`kiszorult`)', () => {
  let ny = ujNyilvantartas();
  for (let i = 0; i <= FUGGO_KORLAT; i++) {
    ny = kerelemFelvetele(ny, { fajta: 'szelet', kulcs: String(i).padStart(43, 'E'), celok: [] }, i, 'k' + i).nyilvantartas;
  }
  return ny.fuggo.length === FUGGO_KORLAT && ny.fuggo[0].az === 'k1' && ny.kesz.at(-1).az === 'k0'
    && ny.kesz.at(-1).eredmeny === 'kiszorult';
});

proba('a lejárt függő kérelem a kész naplóba kerül (`lejart`), a friss marad', () => {
  let ny = kerelemFelvetele(ujNyilvantartas(), { fajta: 'szelet', kulcs: K1 }, 0, 'regi').nyilvantartas;
  ny = kerelemFelvetele(ny, { fajta: 'szelet', kulcs: K2 }, FUGGO_ELEVULES, 'friss').nyilvantartas;
  ny = lejartakKivetele(ny, FUGGO_ELEVULES + 1);
  return ny.fuggo.length === 1 && ny.fuggo[0].az === 'friss' && ny.kesz.some((k) => k.az === 'regi' && k.eredmeny === 'lejart');
});

proba('melyik függő szól a társhoz: a pontos cím előbb, aztán az azonos IP (portváltás); idegen címre semmi', () => {
  let ny = kerelemFelvetele(ujNyilvantartas(), { fajta: 'fejlecek', kulcs: K1, celok: [{ hoszt: '10.0.0.1', port: 1111 }] }, 1, 'a').nyilvantartas;
  ny = kerelemFelvetele(ny, { fajta: 'torzs', kulcs: K2, celok: [{ hoszt: '10.0.0.1', port: 2222 }] }, 2, 'b').nyilvantartas;
  return tarshozIllo(ny, '10.0.0.1', 2222)?.az === 'b' && tarshozIllo(ny, '10.0.0.1', 9999)?.az === 'a'
    && tarshozIllo(ny, '10.0.0.9', 1111) === null;
});

proba('a lezárás a kész naplóba teszi, a próbálkozás számol; a hibás bejegyzés és a hibás cél kiesik', () => {
  let ny = kerelemFelvetele(ujNyilvantartas(), { fajta: 'fejlecek', kulcs: K1, celok: [{ hoszt: '10.0.0.1', port: 1 }] }, 1, 'a').nyilvantartas;
  ny = probalkozas(ny, 'a');
  const probalt = ny.fuggo[0].probalt;
  ny = kerelemLezarasa(ny, 'a', 'megjött: 3 fejléc', 5);
  const rossz = nyilvantartasAlakja({ fuggo: [{ az: 'x', fajta: 'barmi', kulcs: K1 }, { az: 'y', fajta: 'szelet', kulcs: 'rovid' },
    { az: 'z', fajta: 'szelet', kulcs: K2, celok: [{ hoszt: '1.2.3.4', port: 0 }, { hoszt: '1.2.3.4', port: 5, alairo: 'nem' },
      ...Array.from({ length: 20 }, (_, i) => ({ hoszt: '9.9.9.' + i, port: 7 }))] }] });
  return probalt === 1 && ny.fuggo.length === 0 && ny.kesz[0].eredmeny === 'megjött: 3 fejléc'
    && rossz.fuggo.length === 1 && rossz.fuggo[0].az === 'z' && rossz.fuggo[0].celok.length === CEL_KORLAT
    && rossz.fuggo[0].celok[0].port === 5 && rossz.fuggo[0].celok[0].alairo === undefined;
});

// ===================================
// 6. ⭐⭐ A TOVÁBBADÁS (D92/1 (c), D92/2–3, D87) — a számláló, az átvétel, a visszaút, és a K2 építőkövei
// ===================================

proba('⭐ a Freenet-féle számláló: a maximumot kapó fele eséllyel csökkenti (így az első továbbító nem tudja, a kérdező-e)', () => {
  const lattuk = new Set();
  let x = 1;
  const v = () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 2 ** 32; };
  for (let i = 0; i < 200; i++) lattuk.add(tovabbiUgras(UGRAS_MAX, v));
  return lattuk.has(UGRAS_MAX) && lattuk.has(UGRAS_MAX - 1) && lattuk.size === 2
    && tovabbiUgras(2) === 1 && tovabbiUgras(1) === 0 && tovabbiUgras(0) === 0 && tovabbiUgras(-1) === 0;
});

proba('a továbbadható kérelem alakja: az azonosító és a számláló korlátos; a válasz alakja szűr', () => {
  const k = kerelemAlakja({ fajta: 'szelet', kulcs: AZ, az: 'abcdefgh12', htl: 99 });
  const nincs = kerelemAlakja({ fajta: 'szelet', kulcs: AZ, az: 'rövid', htl: 2 });
  const v = valaszAlakja({ az: 'abcdefgh12', fajta: 'torzs', kulcs: AZ,
    fajlok: [{ lenyomat: 'x', adat: 'AA' }, { lenyomat: 'B'.repeat(43), adat: 'AA' }] });
  return k.htl === UGRAS_MAX && k.az === 'abcdefgh12' && nincs.az === undefined && nincs.htl === undefined
    && v.fajlok.length === 1 && valaszAlakja({ az: 'abcdefgh12', fajta: 'barmi', kulcs: AZ }) === null;
});

proba('⭐⭐ ATVESZEM a résen: aki nem tartja, de vállalja, átveszi — a kérő a kérdező címét nem küldi, csak az azonosítót', async () => {
  const p = await udpPar();
  const hely = await mkdtemp(join(tmpdir(), 'koino-atvesz-'));
  try {
    const tar = await esemenyTarNyitasa('proba', hely);
    let kapott = null;
    const kiszolgalo = { atvesz: async (k, honnan) => { kapott = { k, honnan }; return true; } };
    const [, r] = await Promise.all([
      tartoResen(p.egyik, p.masikPort, tar, { kerelemKiszolgalo: kiszolgalo }),
      szeletUdpResen(p.masik, '127.0.0.1', p.egyikPort, null, 'proba', AZ, { tovabb: { az: 'kerelem-0001', htl: 3 } })
    ]);
    return r.atvette === true && r.kapott === 0 && kapott?.k.az === 'kerelem-0001' && kapott.k.htl === 3
      && !('cim' in kapott.k) && kapott.honnan.port === p.masikPort;
  } finally {
    p.bezar();
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⭐⭐ a VALASZ visszaútja a résen: a fogadó a válasz alakját kapja, és KESZ zárja', async () => {
  const p = await udpPar();
  const hely = await mkdtemp(join(tmpdir(), 'koino-valasz-'));
  try {
    const tar = await esemenyTarNyitasa('proba', hely);
    let fogadott = null;
    await Promise.all([
      tartoResen(p.egyik, p.masikPort, tar, { valaszFogado: async (v) => { fogadott = v; return true; } }),
      valaszUdpResen(p.masik, '127.0.0.1', p.egyikPort, 'proba', { az: 'kerelem-0002', fajta: 'szelet', kulcs: AZ,
        esemenyek: [{ x: 1 }] })
    ]);
    return fogadott?.az === 'kerelem-0002' && fogadott.esemenyek.length === 1 && fogadott.fajta === 'szelet';
  } finally {
    p.bezar();
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⭐ K2: a TÁR NÉLKÜLI szelet-kérés (a továbbítóé) csak összegyűjti az eseményeket — semmit nem ment', async () => {
  const p = await udpPar();
  const hely = await mkdtemp(join(tmpdir(), 'koino-k2-'));
  try {
    const v = await szovegesVilag(hely);
    const tar = await esemenyTarNyitasa('proba', hely);
    for (const e of v.terkep.values()) await esemenyMentese(tar, e);
    const [, r] = await Promise.all([
      tartoResen(p.egyik, p.masikPort, tar, {}),
      szeletUdpResen(p.masik, '127.0.0.1', p.egyikPort, null, 'proba', v.g)
    ]);
    return r.kapott >= 2 && Array.isArray(r.esemenyek) && r.esemenyek.length === r.kapott && r.uj === 0;
  } finally {
    p.bezar();
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⭐ K2: a törzs a MEMÓRIABELI fájl-tárba jön (a továbbítóé) — bájtra azonosan, és a lemezre nem kerül', async () => {
  const p = await udpPar();
  const gazdaHely = await mkdtemp(join(tmpdir(), 'koino-k2-a-'));
  const uresHely = await mkdtemp(join(tmpdir(), 'koino-k2-b-'));
  try {
    const v = await szovegesVilag(gazdaHely);
    const tar = await esemenyTarNyitasa('proba', gazdaHely);
    const memoria = memoriaBlobTarolo();
    const [, kapott] = await Promise.all([
      tartoResen(p.egyik, p.masikPort, tar, { kerelemKiszolgalo: kiszolgaloVilagbol(v, { blob: v.blob }),
        fajlOlvas: (l) => v.blob.olvas(l) }),
      kerelemUdpResen(p.masik, '127.0.0.1', p.egyikPort, 'proba', { fajta: 'torzs', kulcs: v.g }, { blob: memoria })
    ]);
    const mind = memoria.mind();
    const eredeti = await v.blob.olvas(v.lenyomat);
    return kapott.fajlok[0]?.kesz === true && mind.length === 1 && mind[0].lenyomat === v.lenyomat
      && Buffer.from(mind[0].bajtok).equals(Buffer.from(eredeti)) && (await readdir(uresHely)).length === 0;
  } finally {
    p.bezar();
    await rm(gazdaHely, { recursive: true, force: true });
    await rm(uresHely, { recursive: true, force: true });
  }
});

proba('⛔ a memóriabeli fájl-tár is ellenőriz: a hamis bájt nem zárul le, és korlátos', async () => {
  const m = memoriaBlobTarolo(1000);
  await m.reszlegesIras('B'.repeat(43), 0, new Uint8Array([1, 2, 3]));
  const lezaras = await m.reszlegesLezaras('B'.repeat(43));
  let tele = false;
  try { await m.ir(new Uint8Array(2000)); } catch { tele = true; }
  return lezaras.rendben === false && lezaras.romlott === true && !(await m.van('B'.repeat(43))) && tele;
});

export default futtatas;
