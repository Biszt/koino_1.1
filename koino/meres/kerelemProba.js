// koino/meres/kerelemProba.js

// Felelősség: A KÉRELEM (D92/4–6 — `js/csere/kerelem.js`, és a menete a vonalon) próbája.
//
// Amit mér: (1) a kérdés alakja: csak az ismert fajta, azonosító alakú kulcs (a gyökér csak fejlécre), korlátos n, a
// mélység (`m`) és a folytatás (`utan`); (2) ⭐ a FEJLÉCEK valódi aláírt eseményekkel: össz-pont szerint rendezve —
// D102 óta MÉLYEN a tartó maga jár be legjobb-először (a gyerekszámmal, a folytatással) —, a töredék is
// (a létrehozója a javaslat), és a kérdező a mintákkal ellenőrzi — a becsületes válasz átmegy; (3) ⛔ a hamisítások:
// más szülőjű tétel, átírt létrehozó, a gyökér összege ≠ a bemondott össz-pont, felfújt részfa-fa — tételenként
// kimondva; (4) a nem tartott entitás bemondott össz-ponttal, gyökér nélkül jön (`forras`); (5) a törzs
// lenyomatai.

import { probaGyujtemeny, ujEember, tagokkal } from './probaFuttato.js';
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
import { kezfogasUdpResen, udpKapcsolat, kerelemUdpResen, kerelemSorozatUdpResen, szeletUdpResen, valaszUdpResen } from '../js/csere/udpVonal.js';
import { esemenyTarNyitasa, fajlBlobTarolo, memoriaBlobTarolo } from '../js/tar/fajlTar.js';
import { esemenyMentese } from '../js/tar/esemenyTar.js';
import { readdir } from 'node:fs/promises';
import {
  kerelemFelvetele, lejartakKivetele, tarshozIllo, tarshozIllok, kerelemLezarasa, probalkozas, fuggoCelok, fuggoKopogtatok,
  nyilvantartasAlakja, ujNyilvantartas, FUGGO_KORLAT, FUGGO_ELEVULES, CEL_KORLAT
} from '../js/csere/fuggoKerelmek.js';
import {
  tovabbiUgras, UGRAS_MAX, valaszAlakja,
  kerelemAlakja, fejlecekValasza, fejlecKepe, mintaKeres, mintakValasza, fejlecekEllenorzese, torzsLenyomatai, FEJLEC_KORLAT,
  elobbJon, felajanlasValaszAlakja
} from '../js/csere/kerelem.js';
import { keresoRegioKulcsa } from '../js/csere/keresoReteg.js';
import { bejegyzesekEpitese } from '../js/tar/keresoTar.js';

const { proba, futtatas } = probaGyujtemeny('A kérelem: az alapkérdések (D92/4–6)');

const AZ = 'A'.repeat(43);

// ===================================
// 1. A KÉRDÉS ALAKJA
// ===================================

proba('a kérdés alakja: ismert fajta, azonosító alakú kulcs; a gyökér csak fejlécre; n korlátos; a mélység és a folytatás (D102)', () => {
  const jo = kerelemAlakja({ fajta: 'fejlecek', kulcs: AZ, n: 9999, m: true, utan: { p: 7, az: AZ } });
  return jo?.n === FEJLEC_KORLAT && jo.m === true && jo.utan?.p === 7 && jo.utan.az === AZ
    && kerelemAlakja({ fajta: 'fejlecek', kulcs: AZ }).m === false && kerelemAlakja({ fajta: 'fejlecek', kulcs: AZ }).utan === undefined
    // ⛔ a rossz alakú folytatás nem „az eleje” — a kérdés hibás
    && kerelemAlakja({ fajta: 'fejlecek', kulcs: AZ, utan: { p: -1, az: AZ } }) === null
    && kerelemAlakja({ fajta: 'fejlecek', kulcs: AZ, utan: { p: 3, az: 'x' } }) === null
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
  const allapot = await allapotSzamitasa(await tagokkal(es));
  const terkep = new Map(es.map((e) => [e.azonosito, e]));
  return { allapot, terkep, nagy, kicsi, g1, g2, g3, unoka, j: j.azonosito, es };
}

const olvaso = (terkep) => async (az) => terkep.get(az) ?? null;

proba('⭐ a gyökér fejlécei EGY SZINTEN (m nélkül): a legfelső szintűek össz-pont szerint — és a kérdező mintákkal ellenőrzi', async () => {
  const v = await vilag();
  const { valasz, fak } = await fejlecekValasza({ allapot: v.allapot, kulcs: GYOKER_KULCS, n: 10,
    karbantarto: reszfaKarbantarto(), esemenyOlvas: olvaso(v.terkep) });
  const kert = mintaKeres(valasz);
  const { mintak, esemenyek } = await mintakValasza({ fak, kert, esemenyOlvas: olvaso(v.terkep) });
  const e = await fejlecekEllenorzese({ valasz, kert, mintak, esemenyek });
  const sorrend = valasz.lista.map((t) => t.az);
  // A NAGY ág: 15 + G1 (14 + unoka 7) + G2 (5 + a töredéke 1) + G3 (2 + a töredéke 1) = 45.
  return sorrend.join() === [v.nagy, v.kicsi].join() && valasz.lista[0].osszPont === 45 && valasz.teljes === true
    && valasz.lista.every((t) => t.sz === null) && valasz.lista[0].gy === 3
    && e.hibas === 0 && e.ellenorzott >= 2 && e.tetelek.get(v.nagy).mintazott === true;
});

proba('⭐⭐ D102 (J1): MÉLYEN a tartó maga jár be legjobb-először — egy lista össz-pont szerint, minden tétel a szülőjével', async () => {
  const v = await vilag();
  const { valasz, fak } = await fejlecekValasza({ allapot: v.allapot, kulcs: GYOKER_KULCS, n: 10, m: true,
    karbantarto: reszfaKarbantarto(), esemenyOlvas: olvaso(v.terkep) });
  const kert = mintaKeres(valasz);
  const { mintak, esemenyek } = await mintakValasza({ fak, kert, esemenyOlvas: olvaso(v.terkep) });
  const e = await fejlecekEllenorzese({ valasz, kert, mintak, esemenyek });
  const l = valasz.lista;
  const csokken = l.every((t, i) => i === 0 || elobbJon({ p: l[i - 1].osszPont, az: l[i - 1].az }, { p: t.osszPont, az: t.az }));
  // NAGY 45 → G1 21 → UNOKA 7 → G2 6 → … (a sorrend maga a legjobb-először bejárás)
  return l[0].az === v.nagy && l[1].az === v.g1 && l[1].sz === v.nagy && l[2].az === v.unoka && l[2].sz === v.g1
    && l[3].az === v.g2 && csokken && valasz.m === true && valasz.teljes === true && l.length === 8
    && e.hibas === 0 && e.tetelek.get(v.nagy).mintazott === true && Object.keys(kert)[0] === v.nagy;
});

proba('⭐⭐ D102: a FOLYTATÁS (`utan`) a sorrend következő elemeit adja — az első két oldal együtt az egész', async () => {
  const v = await vilag();
  const ker = (n, utan) => fejlecekValasza({ allapot: v.allapot, kulcs: GYOKER_KULCS, n, m: true, utan,
    karbantarto: reszfaKarbantarto(), esemenyOlvas: olvaso(v.terkep) });
  const egesz = (await ker(10)).valasz;
  const elso = (await ker(3)).valasz;
  const utolso = elso.lista.at(-1);
  const masodik = (await ker(10, { p: utolso.osszPont, az: utolso.az })).valasz;
  const azok = (v2) => v2.lista.map((t) => t.az);
  // ⚠️ a folytatás szülője egy KORÁBBI oldalon áll — a kérő a saját tudásából illeszti (`ismert`); aki nem ismeri, annak
  // ez nem ellenőrizhető hely (elbukik)
  const korabbiSzulo = masodik.lista.filter((t) => t.sz !== null && !azok(masodik).includes(t.sz)).length;
  const ismeri = await fejlecekEllenorzese({ valasz: masodik, kert: {}, mintak: {}, esemenyek: [],
    ismert: (az) => azok(elso).includes(az) });
  const nemIsmeri = await fejlecekEllenorzese({ valasz: masodik, kert: {}, mintak: {}, esemenyek: [] });
  return elso.teljes === false && masodik.teljes === true
    && [...azok(elso), ...azok(masodik)].join() === azok(egesz).join()
    // (aki nem ismeri a korábbi szülőt, annál ezek — és láncban a gyerekeik — buknak; a legfelső szintű átmegy)
    && korabbiSzulo > 0 && ismeri.hibas === 0 && nemIsmeri.hibas >= korabbiSzulo
    && nemIsmeri.tetelek.get(v.kicsi)?.rendben === true && nemIsmeri.tetelek.get(v.g2)?.rendben === false;
});

// ⭐⭐ D109 (KK1): a kiszolgáló a fejléc-válasz képét (az össz-pontok, a gyerek-jegyzék, a rendezett gyereklisták) EGYSZER
// számolja, és sok kérésen át újrahasznosítja — a válasz bájtra ugyanaz, mint a friss képpel. Mérjük: a gyökér mélyen, egy
// belső csomópont egy szinten, és a folytatás, egy közös képpel egymás után — mind egyezik a kép nélküli válasszal; a
// rendezett lista a második kérésnél ugyanaz a példány (nem számolódik újra). Rontás: a lusta összefésülés testvér-léptetése
// nélkül a mély és a folytatásos válasz megcsonkul (a fenti D102-próbák is buknak).
proba('⭐⭐ D109 (KK1): a gyorsítótárazott fejléc-kép ugyanazt a választ adja — sok kérésen át, folytatással is', async () => {
  const v = await vilag();
  const kep = fejlecKepe(v.allapot, osszPontokSzamitasa(v.allapot.entitasok, new Map(), () => true));
  const ker = async (kulcs, n, m, utan, k) => (await fejlecekValasza({ allapot: v.allapot, kulcs, n, m, utan,
    karbantarto: reszfaKarbantarto(), esemenyOlvas: olvaso(v.terkep), kep: k })).valasz;
  const egyezik = async (kulcs, n, m, utan) => JSON.stringify(await ker(kulcs, n, m, utan, kep))
    === JSON.stringify(await ker(kulcs, n, m, utan, null));
  const elso = await ker(GYOKER_KULCS, 3, true, null, kep);
  const utolso = elso.lista.at(-1);
  const gyokerLista = kep.rendezett(GYOKER_KULCS);
  const ki = {
    melyen: await egyezik(GYOKER_KULCS, 10, true, null),
    egySzint: await egyezik(v.nagy, 10, false, null),
    folytatas: await egyezik(GYOKER_KULCS, 10, true, { p: utolso.osszPont, az: utolso.az }),
    reszlet: await egyezik(GYOKER_KULCS, 2, true, null),
    ujrahasznos: kep.rendezett(GYOKER_KULCS) === gyokerLista && gyokerLista.length === 2
  };
  if (!Object.values(ki).every(Boolean)) console.log('    (KK1 — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + ')');
  return Object.values(ki).every(Boolean);
});

proba('⭐ D102 (J2): a GYEREKSZÁM csak a tartott csomópontra jár — és mélyen csak a tartott csomópont gyerekei jönnek', async () => {
  const v = await vilag();
  const { valasz } = await fejlecekValasza({ allapot: v.allapot, kulcs: GYOKER_KULCS, n: 10, m: true,
    tartott: (az) => az !== v.g1 && az !== GYOKER_KULCS,
    karbantarto: reszfaKarbantarto(), esemenyOlvas: olvaso(v.terkep) });
  const t = (az) => valasz.lista.find((x) => x.az === az);
  return t(v.nagy)?.gy === 3 && t(v.g1) && t(v.g1).gy === undefined && !t(v.unoka) && valasz.gy === undefined;
});

proba('⛔ D102: a HAMIS sorrend, az idegen szülő és a hibás gyerekszám tételenként elbukik', async () => {
  const v = await vilag();
  const { valasz } = await fejlecekValasza({ allapot: v.allapot, kulcs: GYOKER_KULCS, n: 10, m: true,
    karbantarto: reszfaKarbantarto(), esemenyOlvas: olvaso(v.terkep) });
  const l = valasz.lista.map((t) => ({ ...t }));
  // (1) a sorrend: a harmadik (UNOKA, 7) és a negyedik (G2, 6) felcserélve — az UNOKA a kisebb UTÁN jönne
  const csere = [...l];
  [csere[2], csere[3]] = [csere[3], csere[2]];
  // (2) hibás gyerekszám a G2-n (az eredeti sorrendben)
  const gyHiba = l.map((t) => (t.az === v.g2 ? { ...t, gy: -1 } : t));
  // (3) a gyerek előbb, mint a szülője: a G1 a NAGY elé kerül (a G1 szülője ekkor még nem ismert)
  const elore = [l[1], l[0], ...l.slice(2)];
  const e = await fejlecekEllenorzese({ valasz: { ...valasz, lista: csere }, kert: {}, mintak: {}, esemenyek: [] });
  const eGy = await fejlecekEllenorzese({ valasz: { ...valasz, lista: gyHiba }, kert: {}, mintak: {}, esemenyek: [] });
  const e3 = await fejlecekEllenorzese({ valasz: { ...valasz, lista: elore }, kert: {}, mintak: {}, esemenyek: [] });
  // (4) egy szinten (m nélkül) a mély tétel idegen: a szülője nem a kérdezett
  const e2 = await fejlecekEllenorzese({ valasz: { ...valasz, m: false }, kert: {}, mintak: {}, esemenyek: [] });
  const ok = (ee, az) => ee.tetelek.get(az)?.ok ?? '';
  return /sorrend nem csökkenő/.test(ok(e, v.unoka)) && /hibás gyerekszám/.test(ok(eGy, v.g2)) && eGy.hibas >= 1
    && e.tetelek.get(v.nagy)?.rendben === true && e.tetelek.get(v.g1)?.rendben === true
    && /nem a kérdezett entitás gyereke/.test(ok(e3, v.g1))
    && /nem a kérdezett entitás gyereke/.test(ok(e2, v.g1)) && e2.tetelek.get(v.nagy)?.rendben === true;
});

proba('⭐ a TÖREDÉK is fejléc (a létrehozója a javaslat, a szülője a saját érintettje) — és átmegy az ellenőrzésen', async () => {
  const v = await vilag();
  const toredek = [...v.allapot.entitasok.values()].find((e) => e.toredek && e.szulo === v.g2);
  const { valasz } = await fejlecekValasza({ allapot: v.allapot, kulcs: v.g2, n: 10,
    karbantarto: reszfaKarbantarto(), esemenyOlvas: olvaso(v.terkep) });
  const e = await fejlecekEllenorzese({ valasz, kert: {}, mintak: {}, esemenyek: [] });
  const t = valasz.lista.find((x) => x.az === toredek?.azonosito);
  // ⚠️ A helyén van: nem „felkerült” (különben a felkerülés menekülőútja elfedné a hibás szülő-levezetést).
  return !!toredek && !!t && t.letrehozo.azonosito === v.j && e.tetelek.get(toredek.azonosito)?.rendben === true
    && t.felkerult === undefined && e.tetelek.get(toredek.azonosito).felkerult === undefined;
});

proba('⛔ a HAMIS tételek tételenként elbuknak: más szülőjű, átírt létrehozó, a gyökér összege ≠ össz-pont', async () => {
  const v = await vilag();
  const { valasz } = await fejlecekValasza({ allapot: v.allapot, kulcs: v.nagy, n: 10,
    karbantarto: reszfaKarbantarto(), esemenyOlvas: olvaso(v.terkep) });
  const lista = valasz.lista.map((t) => ({ ...t }));
  // (1) egy idegen tétel: a KICSI (a gyökér gyereke) a NAGY alá csempészve
  const kicsi = v.terkep.get(v.kicsi);
  lista.push({ az: v.kicsi, sz: v.nagy, letrehozo: kicsi, osszPont: 3, forras: 'szamolt', bizonytalan: 0, gyoker: null });
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
  const { valasz, fak } = await fejlecekValasza({ allapot: v.allapot, kulcs: GYOKER_KULCS, n: 10, karbantarto: karb,
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
  const { valasz } = await fejlecekValasza({ allapot: v.allapot, kulcs: GYOKER_KULCS, n: 10,
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
  const allapot = await allapotSzamitasa(await tagokkal(es));
  const terkep = new Map(es.map((e) => [e.azonosito, e]));
  const { valasz } = await fejlecekValasza({ allapot, kulcs: a.azonosito, n: 10, karbantarto: reszfaKarbantarto(),
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
      const { valasz, fak } = await fejlecekValasza({ allapot: v.allapot, kulcs: k.kulcs, n: k.n, m: k.m, utan: k.utan, karbantarto,
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
      kerelemUdpResen(p.masik, '127.0.0.1', p.egyikPort, 'proba', { fajta: 'fejlecek', kulcs: GYOKER_KULCS, n: 10, m: true },
        { mintaValaszto: (valasz) => mintaKeres(valasz) })
    ]);
    const e = await fejlecekEllenorzese({ valasz: kapott.valasz, kert: kapott.kert, mintak: kapott.mintak,
      esemenyek: kapott.esemenyek });
    return kapott.kiszolgalta && kapott.valasz.lista[0].az === v.nagy && kapott.valasz.lista[1]?.sz === v.nagy
      && kapott.valasz.m === true
      && e.hibas === 0 && e.ellenorzott >= 1 && kapott.esemenyek.length >= 1;
  } finally {
    p.bezar();
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⭐⭐ D102 (J3): a KÉRELEM-SOROZAT a védett résen — három fejléc-kérelem EGY kapcsolaton, mind kiszolgálva és ellenőrizve', async () => {
  const v = await vilag();
  const p = await udpPar();
  const hely = await mkdtemp(join(tmpdir(), 'koino-kerelem-'));
  try {
    const tar = await esemenyTarNyitasa('proba', hely);
    const kerelmek = [
      { fajta: 'fejlecek', kulcs: GYOKER_KULCS, n: 10 },
      { fajta: 'fejlecek', kulcs: v.nagy, n: 10, m: true },
      { fajta: 'fejlecek', kulcs: v.g1, n: 10 }
    ];
    const [tarto, kapott] = await Promise.all([
      tartoResen(p.egyik, p.masikPort, tar, { kerelemKiszolgalo: kiszolgaloVilagbol(v) }),
      kerelemSorozatUdpResen(p.masik, '127.0.0.1', p.egyikPort, 'proba', kerelmek, { mintaValaszto: (valasz) => mintaKeres(valasz) })
    ]);
    const ellenorzesek = await Promise.all(kapott.map((r) => fejlecekEllenorzese({ valasz: r.valasz, kert: r.kert,
      mintak: r.mintak, esemenyek: r.esemenyek })));
    return kapott.length === 3 && kapott.every((r) => r.kiszolgalta) && tarto.kerelmekKiszolgalva?.length === 3
      && kapott[0].valasz.kulcs === GYOKER_KULCS && kapott[1].valasz.kulcs === v.nagy && kapott[1].valasz.m === true
      && kapott[2].valasz.lista[0]?.az === v.unoka && ellenorzesek.every((e) => e.hibas === 0);
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
  const allapot = await allapotSzamitasa(await tagokkal([g, pont]));
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

// ⭐ A kereső-réteg ⑦b: a kérdés függő kérelemként — egy régióban több kérdés is függhet, a kérdés is a kérelem része.
// Rontás: az azonosság a kérdést nem nézi → a két kérdés összeolvad → bukik; a kérdés alakja nincs ellenőrizve → a hibás
// is felvehető → bukik.
proba('⭐ ⑦b: a KÉRDÉS függő kérelemként — a kérdés a kérelem része (két kérdés egy régióban külön), a hibás kérdés nem vehető fel', () => {
  const regio = keresoRegioKulcsa(2, 1);
  const ker = (kerdes, k = 'p:park') => ({ k, s: 0, darab: '0', kerdes });
  let r = kerelemFelvetele(ujNyilvantartas(), { fajta: 'kereses', kulcs: regio, ker: ker('park'),
    celok: [{ hoszt: '10.0.0.1', port: 7373 }], kopogtatok: [{ fajta: 'kereso', kulcs: '2:1' }] }, 1000, 'k1');
  r = kerelemFelvetele(r.nyilvantartas, { fajta: 'kereses', kulcs: regio, ker: ker('park iskola'), celok: [] }, 1001, 'k2');
  const ketto = r.nyilvantartas.fuggo.length === 2;
  r = kerelemFelvetele(r.nyilvantartas, { fajta: 'kereses', kulcs: regio, ker: ker('park'),
    celok: [{ hoszt: '10.0.0.2', port: 7373 }] }, 1002, 'k3');
  const osszeolvadt = !r.uj && r.az === 'k1' && r.nyilvantartas.fuggo.length === 2
    && r.nyilvantartas.fuggo.find((x) => x.az === 'k1').celok.length === 2;
  // a lemezről olvasva is megvan a kérdés, és a lezárás a kész naplóba viszi
  const lemezrol = nyilvantartasAlakja(JSON.parse(JSON.stringify(r.nyilvantartas)));
  const lezarva = kerelemLezarasa(lemezrol, 'k1', 'megjött: 2 találat', 2000);
  const hibas = [ker(''), ker('park', 'park'), { k: 'p:park', s: 0, darab: 'xyz', kerdes: 'park' }, null].every((k) => {
    try { kerelemFelvetele(ujNyilvantartas(), { fajta: 'kereses', kulcs: regio, ker: k }, 1, 'h'); return false; } catch { return true; }
  });
  return ketto && osszeolvadt && lemezrol.fuggo.find((x) => x.az === 'k2')?.ker?.kerdes === 'park iskola'
    && lezarva.kesz.at(-1).ker?.kerdes === 'park' && lezarva.fuggo.length === 1 && hibas;
});

// ⭐ D112 ③ (F6): a felderítés kérése HÁTTÉR — egy társnál a lap (az előtér) kérései előbb mennek; ha az előtér is kéri, már
// nem háttér. Rontás: a háttér rangja nincs hátrébb → a régebbi háttér-kérés jön előbb → bukik.
proba('⭐ D112 ③: a háttér-kérés (a felderítésé) egy társnál az előtér után megy — és ha az előtér is kéri, már nem háttér', () => {
  const cel = [{ hoszt: '10.0.0.9', port: 7373 }];
  let ny = kerelemFelvetele(ujNyilvantartas(), { fajta: 'fejlecek', kulcs: K1, hatter: true, celok: cel }, 1, 'hatter').nyilvantartas;
  ny = kerelemFelvetele(ny, { fajta: 'fejlecek', kulcs: K2, celok: cel }, 2, 'eloter').nyilvantartas;
  const elso = tarshozIllo(ny, '10.0.0.9', 7373);
  const sor = tarshozIllok(ny, '10.0.0.9', 7373).map((x) => x.az);
  const lemezrol = nyilvantartasAlakja(JSON.parse(JSON.stringify(ny)));
  const felvett = kerelemFelvetele(ny, { fajta: 'fejlecek', kulcs: K1, celok: cel }, 3, 'x').nyilvantartas;
  return elso?.az === 'eloter' && sor.join() === 'eloter,hatter' && lemezrol.fuggo.find((x) => x.az === 'hatter')?.hatter === true
    && felvett.fuggo.find((x) => x.az === 'hatter')?.hatter === undefined;
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

proba('⭐ D102 (J4): egy társ azt a kérelmet viszi, amelyiknek a céllistáján ő áll a LEGELÖL; a már próbáltat kihagyja', () => {
  const T = { hoszt: '10.0.0.7', port: 7000 };
  const M = { hoszt: '10.0.0.8', port: 7000 };
  let ny = ujNyilvantartas();
  // a régebbi kérelemnél T csak a második cél, az újabbnál az első
  ny = kerelemFelvetele(ny, { fajta: 'fejlecek', kulcs: 'R'.repeat(43), celok: [M, T] }, 1000, 'regebbi-kerelem').nyilvantartas;
  ny = kerelemFelvetele(ny, { fajta: 'fejlecek', kulcs: 'S'.repeat(43), celok: [T, M] }, 2000, 'ujabb-kerelem').nyilvantartas;
  const elso = tarshozIllo(ny, T.hoszt, T.port);
  const kihagyva = tarshozIllo(ny, T.hoszt, T.port, (x) => x.az === 'ujabb-kerelem');
  const masik = tarshozIllo(ny, M.hoszt, M.port);
  return elso?.az === 'ujabb-kerelem' && kihagyva?.az === 'regebbi-kerelem' && masik?.az === 'regebbi-kerelem';
});

proba('⭐ D102 (J3): a társhoz illő SOROZAT — rang szerint, korlátosan, a kihagyottak nélkül', () => {
  const T = { hoszt: '10.0.0.7', port: 7000 };
  const M = { hoszt: '10.0.0.8', port: 7000 };
  let ny = ujNyilvantartas();
  for (let i = 0; i < 20; i++) {
    const kulcs = String.fromCharCode(65 + (i % 26)).repeat(42) + String.fromCharCode(97 + Math.floor(i / 26));
    ny = kerelemFelvetele(ny, { fajta: 'fejlecek', kulcs, celok: i % 2 ? [M, T] : [T, M] }, 1000 + i, 'k' + String(i).padStart(2, '0')).nyilvantartas;
  }
  const s = tarshozIllok(ny, T.hoszt, T.port, (x) => x.az === 'k00', 16);
  // előbb azok, ahol T az első cél (páros, a k00 kihagyva), aztán ahol a második — a régebbi előbb
  return s.length === 16 && s[0].az === 'k02' && s.slice(0, 9).every((x) => Number(x.az.slice(1)) % 2 === 0)
    && s[9].az === 'k01' && !s.some((x) => x.az === 'k00') && tarshozIllok(ny, '10.9.9.9', 1).length === 0;
});

proba('⭐ D102: a FOLYTATÁS külön kérelem (ugyanaz a kulcs, más `utan`) — és a mélység megmarad a nyilvántartásban', () => {
  const K = 'R'.repeat(43);
  let ny = ujNyilvantartas();
  ny = kerelemFelvetele(ny, { fajta: 'fejlecek', kulcs: K, m: true }, 1000, 'eleje-kerelem').nyilvantartas;
  ny = kerelemFelvetele(ny, { fajta: 'fejlecek', kulcs: K, m: true, utan: { p: 5, az: 'Z'.repeat(43) } }, 2000, 'folyt-kerelem').nyilvantartas;
  const ujra = kerelemFelvetele(ny, { fajta: 'fejlecek', kulcs: K, m: true }, 3000, 'harmadik');
  const alak = nyilvantartasAlakja(JSON.parse(JSON.stringify(ny)));
  return ny.fuggo.length === 2 && ujra.uj === false && alak.fuggo.every((x) => x.m === true)
    && alak.fuggo.find((x) => x.az === 'folyt-kerelem')?.utan?.p === 5 && FUGGO_KORLAT === 64;
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

// ===================================
// ⭐⭐ D107 L4 (④c): A FELAJÁNLÁS — az alak és a menet a résen
// ===================================

// Rontás: a felajánlás kulcsa bármi lehet → a sima azonosító is átmegy → bukik; nincs korlát → bukik.
proba('⭐ D107 L4: a felajánlás kulcsa egy kereső-régió (vagy a gyökér) — a teher korlátos, és nem adható tovább', () => {
  const r = keresoRegioKulcsa(3, 5);
  const jo = kerelemAlakja({ fajta: 'felajanlas', kulcs: r, bejegyzesek: new Array(100).fill({}), kiserok: [1, 2] });
  const gy = kerelemAlakja({ fajta: 'felajanlas', kulcs: GYOKER_KULCS });
  return jo?.fajta === 'felajanlas' && jo.bejegyzesek.length === 64 && jo.kiserok.length === 2 && gy?.kulcs === GYOKER_KULCS
    && kerelemAlakja({ fajta: 'felajanlas', kulcs: AZ }) === null
    && valaszAlakja({ az: 'abcdefgh12', fajta: 'felajanlas', kulcs: r }) === null
    && felajanlasValaszAlakja({ felvett: 3, osztodott: [{ k: 'p:park', s: 1 }, { k: 'x', s: -1 }] }).osztodott.length === 1;
});

// ⭐ A menet. Rontás: a vonal nem viszi a bejegyzéseket (vagy nem várja a választ) → a tartó 0-t lát, a kérő nem kap választ.
proba('⭐⭐ D107 L4: a FELAJÁNLÁS a védett résen — a tartó megkapja a bejegyzéseket és a kísérőket, a kérő a választ (az osztódással)', async () => {
  const p = await udpPar();
  const hely = await mkdtemp(join(tmpdir(), 'koino-kerelem-'));
  try {
    const tar = await esemenyTarNyitasa('proba', hely);
    const a = await ujEember('proba');
    const b = await ujEember('proba');
    const szuletes = await a.tesz('GondolatLetrehozas', { cim: 'Közös park', meret: 10 });
    const pontEsemenyek = [await a.tesz('TudatpontRendezes', { entitas: szuletes.azonosito, pont: 30 }),
      await b.tesz('TudatpontRendezes', { entitas: szuletes.azonosito, pont: 20 })];
    const bejegyzesek = bejegyzesekEpitese({ szuletes, pontEsemenyek });
    let kapott = null;
    const kiszolgalo = { async felajanlas(k) { kapott = k; return { felvett: k.bejegyzesek.length, osztodott: [{ k: 'p:park', s: 1 }] }; } };
    const [, r] = await Promise.all([
      tartoResen(p.egyik, p.masikPort, tar, { kerelemKiszolgalo: kiszolgalo }),
      kerelemUdpResen(p.masik, '127.0.0.1', p.egyikPort, 'proba',
        { fajta: 'felajanlas', kulcs: GYOKER_KULCS, bejegyzesek, kiserok: [szuletes] })
    ]);
    return kapott?.bejegyzesek.length === bejegyzesek.length && kapott.kiserok.length === 1 && r.kiszolgalta
      && r.felajanlas?.felvett === bejegyzesek.length && r.felajanlas.osztodott[0]?.k === 'p:park' && r.felajanlas.osztodott[0].s === 1;
  } finally {
    p.bezar();
    await rm(hely, { recursive: true, force: true });
  }
});

// ===================================
// ⭐⭐ A kereső-réteg ⑤: A KÉRDÉS — az alak és a menet a résen
// ===================================

// Rontás: a kérdés fiók-kulcsa / szövege nincs ellenőrizve → a hibás is átmegy → bukik.
proba('⭐ a kérdés alakja: a hely (fiók, mélység, darab) és a szöveg — a hibás fiók, a túl hosszú vagy üres kérdés nem kérdés', () => {
  const r = keresoRegioKulcsa(0, 0);
  const jo = kerelemAlakja({ fajta: 'kereses', kulcs: r, k: 'p:park', s: 2, darab: '3', kerdes: 'park', n: 999 });
  return jo?.k === 'p:park' && jo.s === 2 && jo.darab === '3' && jo.n === 50
    && kerelemAlakja({ fajta: 'kereses', kulcs: r, k: 'park', kerdes: 'park' }) === null
    && kerelemAlakja({ fajta: 'kereses', kulcs: r, k: 'p:park', kerdes: '' }) === null
    && kerelemAlakja({ fajta: 'kereses', kulcs: r, k: 'p:park', kerdes: 'x'.repeat(201) }) === null
    && kerelemAlakja({ fajta: 'kereses', kulcs: AZ, k: 'p:park', kerdes: 'park' }) === null;
});

// Rontás: a kérő nem viszi a helyet és a kérdést (vagy nem várja a választ) → a tartó nem kapja / a kérő nem kap választ → bukik.
proba('⭐⭐ a KÉRDÉS a védett résen — a tartó megkapja a helyet és a kérdést, a kérő a találatokat, a méretet és az osztódást', async () => {
  const p = await udpPar();
  const hely = await mkdtemp(join(tmpdir(), 'koino-kerelem-'));
  try {
    const tar = await esemenyTarNyitasa('proba', hely);
    let kapott = null;
    const kiszolgalo = { async kereses(k) { kapott = k; return { talalatok: [{ a: 1 }], kiserok: [], meret: 300, osztodott: 1 }; } };
    const [, r] = await Promise.all([
      tartoResen(p.egyik, p.masikPort, tar, { kerelemKiszolgalo: kiszolgalo }),
      kerelemUdpResen(p.masik, '127.0.0.1', p.egyikPort, 'proba',
        { fajta: 'kereses', kulcs: GYOKER_KULCS, k: 'p:park', s: 0, darab: '0', kerdes: 'park iskola' })
    ]);
    return kapott?.k === 'p:park' && kapott.kerdes === 'park iskola' && r.kiszolgalta && r.kereses?.talalatok.length === 1
      && r.kereses.meret === 300 && r.kereses.osztodott === 1;
  } finally {
    p.bezar();
    await rm(hely, { recursive: true, force: true });
  }
});

export default futtatas;
