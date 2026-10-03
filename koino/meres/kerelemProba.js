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
import {
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

export default futtatas;
