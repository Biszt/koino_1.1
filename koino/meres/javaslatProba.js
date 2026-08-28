// koino/meres/javaslatProba.js — a döntéshozatal önpróbája (Szakasz 1 / 6. lépés)
//
// Azt bizonyítja, hogy a javaslat sorsa — és vele az egyezmény — kiszámítható az aláírt
// eseményekből. Senki nem „mondja ki" az eredményt: ugyanabból a halmazból mindenki
// ugyanarra jut (D17).

import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';
import { javaslatokSzamitasa, sajatSzavazat, ALAP_KUSZOBOK } from '../js/allapot/javaslatSzamitas.js';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A döntéshozatal próbája');

const KOINO = 'proba';
const NAP = 86400 * 1000;

// ===== SEGÉD: EGY TELJES ESET FELÉPÍTÉSE =====
//
// Létrehoz egy tartalmat, ráteszi a tudatpontokat, indít egy javaslatot, és leadja a
// megadott szavazatokat. Visszaadja az eseményeket és a kulcs-azonosítókat.
async function esetFelepitese({ szavazatok, kuszobok, szerepek = {}, kezdet = Date.UTC(2026, 0, 1) }) {
  const emberek = [];
  const esemenyek = [];

  // Annyi e-ember, ahány szavazat + a létrehozó
  const letrehozo = await ujEember();
  emberek.push(letrehozo);

  const tartalom = await letrehozo.tesz('TartalomLetrehozas',
    { cim: 'A vitatott tartalom', meret: 500 }, kezdet);
  esemenyek.push(tartalom);

  esemenyek.push(await letrehozo.tesz('TudatpontRendezes',
    { entitas: tartalom.azonosito, pont: 100, szerep: szerepek.letrehozo ?? 'aktiv' }, kezdet));

  if (kuszobok) {
    esemenyek.push(await letrehozo.tesz('ErtekJavaslat',
      { entitas: tartalom.azonosito, ertekek: kuszobok }, kezdet));
  }

  // A szavazók: mindegyik kap tudatpontot az entitáson (így aktív tulajdonos)
  const szavazok = [];
  for (let i = 0; i < szavazatok.length; i++) {
    const ember = await ujEember();
    emberek.push(ember);
    szavazok.push(ember);
    esemenyek.push(await ember.tesz('TudatpontRendezes',
      { entitas: tartalom.azonosito, pont: 10, szerep: 'aktiv' }, kezdet));
  }

  // A javaslat
  const javaslat = await letrehozo.tesz('Javaslat', {
    fajta: 'szerkesztesi',
    erintett: tartalom.azonosito,
    muvelet: 'Modositas',
    valtozas: { cim: 'A javított cím' },
    indoklas: 'Pontosabb így.'
  }, kezdet + 1000);
  esemenyek.push(javaslat);

  // A szavazatok
  for (let i = 0; i < szavazatok.length; i++) {
    esemenyek.push(await szavazok[i].tesz('Szavazat',
      { javaslat: javaslat.azonosito, szavazat: szavazatok[i] }, kezdet + 2000));
  }

  return { esemenyek, tartalom, javaslat, letrehozo, szavazok, kezdet };
}

/** Segéd: kiszámolja a javaslat állapotát egy adott időpontban. */
function javaslatAllapot(eset, most) {
  const allapot = allapotSzamitasa(eset.esemenyek);
  // Az ELÁGAZÁS-MENTESÍTETT eseményekkel számolunk — ahogy a koino.js is.
  const javaslatok = javaslatokSzamitasa(allapot.szamitok, allapot, most);
  return javaslatok.get(eset.javaslat.azonosito);
}

// ===== A DÖNTÉS =====

proba('A döntési idő letelte ELŐTT: folyamatban', async () => {
  const eset = await esetFelepitese({ szavazatok: ['Tamogat', 'Tamogat', 'Tamogat'] });
  const j = javaslatAllapot(eset, eset.kezdet + 1000);
  return j.statusz === 'folyamatban';
});

proba('Egyöntetű támogatás → ELFOGADVA, és megszületik az egyezmény', async () => {
  const eset = await esetFelepitese({ szavazatok: ['Tamogat', 'Tamogat', 'Tamogat'] });
  const j = javaslatAllapot(eset, eset.kezdet + 10 * NAP);
  return j.statusz === 'elfogadva' && j.egyezmeny !== null;
});

proba('Ellenző többség → ELVETVE, és NINCS egyezmény', async () => {
  const eset = await esetFelepitese({ szavazatok: ['Ellenez', 'Ellenez', 'Tamogat'] });
  const j = javaslatAllapot(eset, eset.kezdet + 10 * NAP);
  return j.statusz === 'elvetve' && j.egyezmeny === null;
});

// ===== A KÜSZÖB PONTOS HATÁRA — EGÉSZ ARITMETIKA =====

proba('A küszöb PONTOS határa átmegy (51 támogató / 100 szavazó, 51%-os küszöb)', async () => {
  const szavazatok = [...Array(51).fill('Tamogat'), ...Array(49).fill('Ellenez')];
  const eset = await esetFelepitese({ szavazatok, kuszobok: { elfogadasiKuszob: 51, reszveteliKuszob: 0, minimumDontesiIdo: 3600, maximumDontesiIdo: 7200 } });
  const j = javaslatAllapot(eset, eset.kezdet + 10 * NAP);
  return j.statusz === 'elfogadva' && j.tamogatottsagTeljesul === true;
});

proba('A küszöb ALATT egy hajszállal: ELVETVE (kerekítés nem menti meg)', async () => {
  // 509 támogató / 1000 szavazó = 50,9% — kerekítve 51% lenne, de a kereszt-szorzás
  // pontos: 509*100 = 50 900 < 51*1000 = 51 000
  const szavazatok = [...Array(509).fill('Tamogat'), ...Array(491).fill('Ellenez')];
  const eset = await esetFelepitese({ szavazatok, kuszobok: { elfogadasiKuszob: 51, reszveteliKuszob: 0, minimumDontesiIdo: 3600, maximumDontesiIdo: 7200 } });
  const j = javaslatAllapot(eset, eset.kezdet + 10 * NAP);
  // A megjelenített arány 509 ezrelék, ami 51%-nak LÁTSZANA kerekítve — a döntés mégis helyes
  return j.statusz === 'elvetve' && j.tamogatottsagEzrelek === 509;
});

// ===== RÉSZVÉTELI KÜSZÖB =====

proba('A részvételi küszöb alatt: ELVETVE (bár mindenki támogatta, aki szavazott)', async () => {
  // 10 aktív tulajdonos, de csak 2 szavaz → 20% részvétel, a küszöb 50%
  const eset = await esetFelepitese({
    szavazatok: ['Tamogat', 'Tamogat', null, null, null, null, null, null, null, null]
      .filter(Boolean),
    kuszobok: { elfogadasiKuszob: 51, reszveteliKuszob: 50, minimumDontesiIdo: 3600, maximumDontesiIdo: 7200 }
  });
  // Még 8 aktív tulajdonost adunk hozzá, akik NEM szavaznak
  for (let i = 0; i < 8; i++) {
    const ember = await ujEember();
    eset.esemenyek.push(await ember.tesz('TudatpontRendezes',
      { entitas: eset.tartalom.azonosito, pont: 5, szerep: 'aktiv' }, eset.kezdet));
  }
  const j = javaslatAllapot(eset, eset.kezdet + 10 * NAP);
  return j.statusz === 'elvetve' && j.reszvetelTeljesul === false;
});

proba('A PASSZÍV tulajdonos nem korlátozza a döntést', async () => {
  const eset = await esetFelepitese({
    szavazatok: ['Tamogat', 'Tamogat'],
    kuszobok: { elfogadasiKuszob: 51, reszveteliKuszob: 50, minimumDontesiIdo: 3600, maximumDontesiIdo: 7200 }
  });
  // Nyolc PASSZÍV tulajdonos — nekik nem kell szavazniuk ahhoz, hogy a döntés érvényes legyen
  for (let i = 0; i < 8; i++) {
    const ember = await ujEember();
    eset.esemenyek.push(await ember.tesz('TudatpontRendezes',
      { entitas: eset.tartalom.azonosito, pont: 5, szerep: 'passziv' }, eset.kezdet));
  }
  const j = javaslatAllapot(eset, eset.kezdet + 10 * NAP);
  // A nevező: a létrehozó (aktív) + 2 szavazó = 3 → a részvétel 2/3 = 66,7% > 50%
  return j.statusz === 'elfogadva' && j.nevezo === 3;
});

// ===== A SZAVAZAT MÓDOSÍTHATÓ =====

proba('A szavazat MÓDOSÍTHATÓ — az utolsó számít', async () => {
  const eset = await esetFelepitese({ szavazatok: ['Ellenez', 'Ellenez'] });
  // Az első szavazó meggondolja magát
  const meggondolo = eset.szavazok[0];
  eset.esemenyek.push(await meggondolo.tesz('Szavazat',
    { javaslat: eset.javaslat.azonosito, szavazat: 'Tamogat' }, eset.kezdet + 3000));

  const j = javaslatAllapot(eset, eset.kezdet + 10 * NAP);
  const sajat = sajatSzavazat(eset.esemenyek, eset.javaslat.azonosito, meggondolo.szerzo);
  return j.tamogatok === 1 && j.ellenzok === 1 && sajat === 'Tamogat';
});

// ===== BIZONYOSSÁGI MUTATÓ ÉS DÖNTÉSI IDŐ =====

proba('Egyöntetű + teljes részvétel → magas bizonyosság, RÖVID döntési idő', async () => {
  const eset = await esetFelepitese({
    szavazatok: ['Tamogat', 'Tamogat', 'Tamogat'],
    kuszobok: { elfogadasiKuszob: 51, reszveteliKuszob: 0, minimumDontesiIdo: 3600, maximumDontesiIdo: 604800 }
  });
  const j = javaslatAllapot(eset, eset.kezdet + 10 * NAP);
  // Egyértelműség 1000 ezrelék, részvétel 750 (3 szavazó / 4 aktív) → BM ≈ 875
  return j.bizonyossagiMutato > 800 && j.dontesiIdo < 100000;
});

proba('Döntetlen → alacsony bizonyosság, HOSSZÚ döntési idő', async () => {
  const eset = await esetFelepitese({
    szavazatok: ['Tamogat', 'Ellenez'],
    kuszobok: { elfogadasiKuszob: 51, reszveteliKuszob: 0, minimumDontesiIdo: 3600, maximumDontesiIdo: 604800 }
  });
  const j = javaslatAllapot(eset, eset.kezdet + 10 * NAP);
  // Egyértelműség 0 → a BM csak a részvételből jön, tehát a döntési idő közel a maximum
  return j.bizonyossagiMutato < 400 && j.dontesiIdo > 300000;
});

proba('A tartózkodás CSÖKKENTI az egyértelműséget (nem olvad bele egyik oldalba sem)', async () => {
  const egyontetu = await esetFelepitese({ szavazatok: ['Tamogat', 'Tamogat', 'Tamogat'] });
  const tartozkodos = await esetFelepitese({ szavazatok: ['Tamogat', 'Tamogat', 'Tartozkodik'] });

  const a = javaslatAllapot(egyontetu, egyontetu.kezdet + 10 * NAP);
  const b = javaslatAllapot(tartozkodos, tartozkodos.kezdet + 10 * NAP);
  return b.bizonyossagiMutato < a.bizonyossagiMutato;
});

// ===== AZ EGYEZMÉNY =====

proba('Az egyezmény hordozza a SZÜLETÉSE körülményeit (pillanatkép)', async () => {
  const eset = await esetFelepitese({ szavazatok: ['Tamogat', 'Tamogat', 'Ellenez'] });
  const j = javaslatAllapot(eset, eset.kezdet + 10 * NAP);
  const e = j.egyezmeny;
  return e.pillanatkep.tamogatok === 2
      && e.pillanatkep.ellenzok === 1
      && e.muvelet === 'Modositas'
      && typeof e.megszuletett === 'number';
});

// ===== A LEZÁRÁS IDŐRENDBEN (Csaba jóváhagyása, 2026-08-28) =====
//
// Ez a három próba 2026-08-28-ig BUKOTT volna. Mérve: egy elvetett javaslat egy
// utólagos szavazattól ELFOGADVA lett, majd egy továbbitól újra elvetve — vagyis az
// egyezmény megszületett, aztán megszűnt létezni.

/**
 * Segéd: új e-ember, aki adott IDŐBEN tesz tudatpontot az entitásra, és ugyanakkor
 * szavaz. Mindkét eseménye ugyanazt az időt viseli — így a késői érkezés mindkét
 * fajtát próbára teszi (a szavazat a számlálót, a tudatpont a nevezőt mozdítaná).
 */
async function kesoiSzavazo(eset, szavazat, ido) {
  const ember = await ujEember();
  eset.esemenyek.push(await ember.tesz('TudatpontRendezes',
    { entitas: eset.tartalom.azonosito, pont: 10, szerep: 'aktiv' }, ido));
  eset.esemenyek.push(await ember.tesz('Szavazat',
    { javaslat: eset.javaslat.azonosito, szavazat }, ido));
  return ember;
}

proba('⭐ A HATÁRIDŐ UTÁN érkezett szavazat nem számít bele', async () => {
  // Szavazat nélkül a döntési idő a maximum (7 nap), tehát a 8. napi szavazat késői
  const eset = await esetFelepitese({ szavazatok: [] });
  await kesoiSzavazo(eset, 'Tamogat', eset.kezdet + 8 * NAP);

  const j = javaslatAllapot(eset, eset.kezdet + 10 * NAP);
  return j.statusz === 'elvetve'        // a szavazat nélküli lezárás marad
      && j.szavazok === 0               // a késői szavazat nem számít
      && j.kesoiSzavazatok === 1        // de LÁTSZIK (D19: bejelent, nem büntet)
      && j.egyezmeny === null;
});

proba('⭐ A lezárt ELFOGADÁS nem fordul vissza egy utólagos ellenszavazattól (és a hozzá tartozó tudatpont-rendezéstől sem)', async () => {
  // Két korai támogató → magas bizonyosság → rövid döntési idő → elfogadva
  const eset = await esetFelepitese({ szavazatok: ['Tamogat', 'Tamogat'] });
  const elfogadva = javaslatAllapot(eset, eset.kezdet + 10 * NAP);

  // Valaki a 9. napon ellenez — a döntés már lezárult
  await kesoiSzavazo(eset, 'Ellenez', eset.kezdet + 9 * NAP);
  const utana = javaslatAllapot(eset, eset.kezdet + 10 * NAP);

  return elfogadva.statusz === 'elfogadva'
      && utana.statusz === 'elfogadva'
      && utana.egyezmeny !== null
      && utana.lezarasIdeje === elfogadva.lezarasIdeje;   // a határidő sem mozdult
});

proba('A határidőn BELÜL érkezett szavazat viszont számít (és rövidíti a döntést)', async () => {
  const eset = await esetFelepitese({ szavazatok: [] });
  const nelkule = javaslatAllapot(eset, eset.kezdet + 10 * NAP);

  await kesoiSzavazo(eset, 'Tamogat', eset.kezdet + 1 * NAP);   // jóval a 7 napon belül
  const vele = javaslatAllapot(eset, eset.kezdet + 10 * NAP);

  return vele.szavazok === 1
      && vele.kesoiSzavazatok === 0
      && vele.statusz === 'elfogadva'
      && vele.dontesiIdo < nelkule.dontesiIdo;   // a bizonyosság rövidítette
});

proba('⭐ A lezárás UTÁN beadott ÉRTÉK JAVASLAT nem írja át a döntés szabályát', async () => {
  // A létrehozó tudatpontos tulajdonos, tehát az ő érték javaslata SZÁMÍTANA — de későn jön
  const eset = await esetFelepitese({ szavazatok: ['Tamogat', 'Tamogat'] });
  const elfogadva = javaslatAllapot(eset, eset.kezdet + 10 * NAP);

  // A 9. napon valaki 90%-os küszöböt és 30 napos maximumot javasol
  eset.esemenyek.push(await eset.letrehozo.tesz('ErtekJavaslat', {
    entitas: eset.tartalom.azonosito,
    ertekek: { elfogadasiKuszob: 90, reszveteliKuszob: 100,
               minimumDontesiIdo: 86400, maximumDontesiIdo: 30 * 86400 }
  }, eset.kezdet + 9 * NAP));

  const utana = javaslatAllapot(eset, eset.kezdet + 10 * NAP);
  return utana.statusz === 'elfogadva'
      && utana.egyezmeny !== null
      && utana.kuszobok.elfogadasiKuszob === elfogadva.kuszobok.elfogadasiKuszob
      && utana.lezarasIdeje === elfogadva.lezarasIdeje;
});

proba('A határidőn BELÜLI érték javaslat viszont érvényes (a küszöb a tulajdonosok mediánja)', async () => {
  const eset = await esetFelepitese({
    szavazatok: ['Tamogat', 'Ellenez'],
    kuszobok: { elfogadasiKuszob: 90, reszveteliKuszob: 0,
                minimumDontesiIdo: 3600, maximumDontesiIdo: 7200 }
  });
  const j = javaslatAllapot(eset, eset.kezdet + 10 * NAP);
  // 1 támogató / 2 szavazó = 50% < 90% → a magasabb küszöb tényleg érvényesült
  return j.kuszobok.elfogadasiKuszob === 90 && j.statusz === 'elvetve';
});

proba('⭐ A lezárás UTÁNI passzív → aktív váltás nem nyitja újra a döntést', async () => {
  const eset = await esetFelepitese({ szavazatok: ['Tamogat', 'Tamogat'] });

  // Egy PASSZÍV figyelő (nem számít a nevezőbe), aki a 9. napon aktívvá válna —
  // ezzel megnőne a nevező, csökkenne a bizonyosság, és kitolódna a határidő
  const figyelo = await ujEember();
  eset.esemenyek.push(await figyelo.tesz('TudatpontRendezes',
    { entitas: eset.tartalom.azonosito, pont: 10, szerep: 'passziv' }, eset.kezdet));
  const elfogadva = javaslatAllapot(eset, eset.kezdet + 10 * NAP);

  eset.esemenyek.push(await figyelo.tesz('TudatpontRendezes',
    { entitas: eset.tartalom.azonosito, pont: 10, szerep: 'aktiv' }, eset.kezdet + 9 * NAP));
  const utana = javaslatAllapot(eset, eset.kezdet + 10 * NAP);

  return elfogadva.statusz === 'elfogadva'
      && utana.statusz === 'elfogadva'
      && utana.nevezo === elfogadva.nevezo
      && utana.lezarasIdeje === elfogadva.lezarasIdeje;
});

// ===== DETERMINIZMUS =====

proba('⭐ A szavazatok SORRENDJE nem számít', async () => {
  const eset = await esetFelepitese({ szavazatok: ['Tamogat', 'Ellenez', 'Tamogat', 'Tartozkodik'] });

  const eredeti = javaslatAllapot(eset, eset.kezdet + 10 * NAP);
  const kevert = { ...eset, esemenyek: [...eset.esemenyek].reverse() };
  const forditva = javaslatAllapot(kevert, eset.kezdet + 10 * NAP);

  return JSON.stringify(eredeti) === JSON.stringify(forditva);
});

proba('⭐ ELÁGAZÁS: a kettős szavazatból EGY számít, és mindkét sorrend UGYANAZT adja', async () => {
  // Ez a próba 2026-08-28-ig BUKOTT volna: a döntéshozatal a NYERS eseményeket kapta,
  // ezért a kettős szavazatnál azt vette figyelembe, amelyik előbb szerepelt a tömbben.
  // Mérve: „támogat, ellenez" sorrendnél ELFOGADVA, fordítva ELVETVE — vagyis két gép
  // ugyanabból a halmazból MÁS döntésre jutott. Most az elágazás-mentesített listával
  // számolunk (az azonosító szerint kisebb ág az érvényes).
  const eset = await esetFelepitese({ szavazatok: ['Tamogat'] });
  const kettosSzavazo = eset.szavazok[0];

  const masikAg = await kettosSzavazo.elagaztat('Szavazat',
    { javaslat: eset.javaslat.azonosito, szavazat: 'Ellenez' }, eset.kezdet + 2000);

  const egyik = javaslatAllapot(
    { ...eset, esemenyek: [...eset.esemenyek, masikAg] }, eset.kezdet + 10 * NAP);
  const masik = javaslatAllapot(
    { ...eset, esemenyek: [masikAg, ...eset.esemenyek] }, eset.kezdet + 10 * NAP);

  return JSON.stringify(egyik) === JSON.stringify(masik)   // a sorrend nem dönt
      && egyik.szavazok === 1;                             // a két ágból csak EGY számít
});

proba('Ugyanaz az eseményhalmaz MÁS időpontban: más státusz, azonos számok', async () => {
  const eset = await esetFelepitese({ szavazatok: ['Tamogat', 'Tamogat'] });
  const korai = javaslatAllapot(eset, eset.kezdet + 1000);
  const kesoi = javaslatAllapot(eset, eset.kezdet + 10 * NAP);
  return korai.statusz === 'folyamatban' && kesoi.statusz === 'elfogadva'
      && korai.tamogatok === kesoi.tamogatok
      && korai.bizonyossagiMutato === kesoi.bizonyossagiMutato;
});

// ===== ALAPÉRTELMEZÉS =====

proba('Érték javaslat nélkül az alapértelmezett küszöbök érvényesek', async () => {
  const eset = await esetFelepitese({ szavazatok: ['Tamogat'] });
  const j = javaslatAllapot(eset, eset.kezdet + 10 * NAP);
  return j.kuszobok.elfogadasiKuszob === ALAP_KUSZOBOK.elfogadasiKuszob;
});

export default futtatas;
