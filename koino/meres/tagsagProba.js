// koino/meres/tagsagProba.js

// Felelősség: A TAGSÁG TISZTA SZÁMÍTÁSÁNAK próbája (D56, D59, D93 — `js/allapot/tagsag.js`), valódi aláírt eseményekkel.
//
// Amit mér: (1) az alapító (a létrehozó és a megnevezett alapító), a meghívott, a többszintű lánc; (2) ⭐ a LEGRÖVIDEBB
// lánc számít; (3) ⭐ a mélység-korlát (D = 64) — és a rövidítő meghívás; (4) a hiányzó láncszem „nem ellenőrizhető”,
// nem „nem tag” (D19); (5) az érvénytelen meghívás (más kulcsnak szól, önmagának, idegen horgony) nem számít, a kör nem
// szül tagságot; (6) ⭐ D93/5: a profil-feltétel; (7) ⭐ D93/2: a tagsági csomag — a lánca, a kapu-ellenőrzése, és hogy
// az index a csomagból ősök nélkül is tagságot számol.

import { probaGyujtemeny, ujEember } from './probaFuttato.js';
import {
  tagsagiIndex, horgonyTagsaga, szerzoTagsaga, tagsagiLanc, tagsagiCsomagEllenorzese, MELYSEG_KORLAT, TAGSAGI_CSOMAG
} from '../js/allapot/tagsag.js';

const { proba, futtatas } = probaGyujtemeny('A tagság tiszta számítása (D93)');

const KOINO = 'tagsag';
const LENYOMAT = (c) => c.repeat(43);

/** Egy koinó: az alapító és a létrehozás (opcionálisan alapító-listával és profil-mezőkkel). */
async function koino({ alapitok = [], profil } = {}) {
  const alapito = await ujEember(KOINO);
  const tarsak = [];
  for (let i = 0; i < alapitok; i++) tarsak.push(await ujEember(KOINO));
  const letrehozas = await alapito.tesz('KoinoLetrehozas', { nev: 'Próba', leiras: null,
    alapitok: tarsak.map((t) => t.szerzo), zart: true, ...(profil ? { profil } : {}) });
  return { alapito, letrehozas, tarsak, horgony: letrehozas.azonosito };
}

/** Egy belépő: a saját `Belepes`-e. */
async function belepo() {
  const ember = await ujEember(KOINO);
  const belepes = await ember.tesz('Belepes', {});
  return { ember, belepes, horgony: belepes.azonosito };
}

/** Meghívás: a meghívó (horgonyával) behívja a belépőt. */
async function meghiv(hivo, rola, tobb = {}) {
  return hivo.ember.tesz('Meghivas', { kit: tobb.kit ?? rola.ember.szerzo, sajatBelepes: tobb.sajatBelepes ?? hivo.horgony,
    ...(tobb.profil ? { profil: tobb.profil } : {}) }, undefined, { entitas: rola.horgony });
}

const hivoja = (k) => ({ ember: k.alapito, horgony: k.horgony });

proba('az alapító (a létrehozó és a megnevezett) 0. szinten tag; a meghívott 1., a meghívottja 2. szinten; a meghívás nélküli nem tag', async () => {
  const k = await koino({ alapitok: 1 });
  const masodikAlapito = await k.tarsak[0].tesz('Belepes', { alapitas: k.letrehozas.azonosito });
  const b = await belepo();
  const c = await belepo();
  const d = await belepo();
  const es = [k.letrehozas, masodikAlapito, b.belepes, c.belepes, d.belepes, await meghiv(hivoja(k), b), await meghiv(b, c)];
  const idx = tagsagiIndex(es);
  const r = (h) => horgonyTagsaga(idx, h);
  return r(k.horgony).igen && r(k.horgony).melyseg === 0 && r(masodikAlapito.azonosito).igen && r(masodikAlapito.azonosito).melyseg === 0
    && r(b.horgony).melyseg === 1 && r(c.horgony).melyseg === 2 && !r(d.horgony).igen && r(d.horgony).ellenorizheto
    && szerzoTagsaga(idx, c.ember.szerzo).igen && !szerzoTagsaga(idx, d.ember.szerzo).igen;
});

proba('⭐ a LEGRÖVIDEBB lánc számít — két meghívás közül a közelebbi tagé', async () => {
  const k = await koino();
  const lanc = [];
  let elozo = hivoja(k);
  const es = [k.letrehozas];
  for (let i = 0; i < 4; i++) { const b = await belepo(); es.push(b.belepes, await meghiv(elozo, b)); lanc.push(b); elozo = b; }
  const x = await belepo();
  es.push(x.belepes, await meghiv(lanc[3], x), await meghiv(lanc[0], x));   // 5. szintről ÉS 2. szintről
  const r = horgonyTagsaga(tagsagiIndex(es), x.horgony);
  return r.igen && r.melyseg === 2;
});

proba('⭐ a mélység-korlát: a 64. szint tag, a 65. nem — egy közelebbi tag (ingyenes) meghívása rövidít', async () => {
  const k = await koino();
  const es = [k.letrehozas];
  let elozo = hivoja(k);
  const lanc = [];
  for (let i = 0; i < MELYSEG_KORLAT + 1; i++) { const b = await belepo(); es.push(b.belepes, await meghiv(elozo, b)); lanc.push(b); elozo = b; }
  const idx = tagsagiIndex(es);
  const utolso = lanc[MELYSEG_KORLAT];        // a 65. szinten
  const tulMely = horgonyTagsaga(idx, utolso.horgony);
  const rovid = await meghiv(lanc[1], utolso); // a 2. szintű tag is behívja
  const r2 = horgonyTagsaga(tagsagiIndex([...es, rovid]), utolso.horgony);
  return horgonyTagsaga(idx, lanc[MELYSEG_KORLAT - 1].horgony).melyseg === MELYSEG_KORLAT
    && !tulMely.igen && tulMely.ellenorizheto && r2.igen && r2.melyseg === 3;
});

proba('a hiányzó láncszem NEM ELLENŐRIZHETŐ (D19) — nem „nem tag”', async () => {
  const k = await koino();
  const b = await belepo();
  const c = await belepo();
  const es = [k.letrehozas, c.belepes, await meghiv(hivoja(k), b), await meghiv(b, c)];   // B belépése hiányzik
  const r = horgonyTagsaga(tagsagiIndex(es), c.horgony);
  return !r.igen && r.ellenorizheto === false && /nem ellenőrizhető/.test(r.ok);
});

proba('⛔ az érvénytelen meghívás nem számít (más kulcsnak szól · önmagának · idegen horgonnyal) — és a kör nem szül tagságot', async () => {
  const k = await koino();
  const b = await belepo();
  const c = await belepo();
  const idegen = await belepo();
  const es1 = [k.letrehozas, b.belepes, await meghiv(hivoja(k), b, { kit: idegen.ember.szerzo })];
  const es2 = [k.letrehozas, b.belepes, await b.ember.tesz('Meghivas', { kit: b.ember.szerzo, sajatBelepes: b.horgony }, undefined, { entitas: b.horgony })];
  const es3 = [k.letrehozas, b.belepes, idegen.belepes, await meghiv(hivoja(k), idegen),
    await b.ember.tesz('Meghivas', { kit: c.ember.szerzo, sajatBelepes: idegen.horgony }, undefined, { entitas: c.horgony }), c.belepes];
  const kor = [k.letrehozas, b.belepes, c.belepes, await meghiv(b, c), await meghiv(c, b)];
  return !horgonyTagsaga(tagsagiIndex(es1), b.horgony).igen && !horgonyTagsaga(tagsagiIndex(es2), b.horgony).igen
    && !horgonyTagsaga(tagsagiIndex(es3), c.horgony).igen
    && !horgonyTagsaga(tagsagiIndex(kor), b.horgony).igen && !horgonyTagsaga(tagsagiIndex(kor), c.horgony).igen;
});

proba('⭐ D93/5: ha a koinó profilt vár, a meghívás csak a profil lenyomatával érvényes, és a profilnak meg kell lennie', async () => {
  const k = await koino({ profil: ['nev', 'telepules'] });
  const b = await belepo();
  const profil = await b.ember.tesz('Profil', { lenyomat: LENYOMAT('P') }, undefined, { entitas: b.horgony });
  const nelkule = [k.letrehozas, b.belepes, profil, await meghiv(hivoja(k), b)];
  const profilNelkul = [k.letrehozas, b.belepes, await meghiv(hivoja(k), b, { profil: LENYOMAT('P') })];
  const jo = [k.letrehozas, b.belepes, profil, await meghiv(hivoja(k), b, { profil: LENYOMAT('P') })];
  const r1 = horgonyTagsaga(tagsagiIndex(nelkule), b.horgony);
  const r2 = horgonyTagsaga(tagsagiIndex(profilNelkul), b.horgony);
  return !r1.igen && r1.ellenorizheto && !r2.igen && r2.ellenorizheto === false && horgonyTagsaga(tagsagiIndex(jo), b.horgony).igen;
});

proba('⭐⭐ D93/2: a TAGSÁGI CSOMAG — a legrövidebb lánc, a kapun átmegy, és belőle az ősök nélkül is tagság számítható', async () => {
  const k = await koino({ profil: ['nev'] });
  const b = await belepo();
  const c = await belepo();
  const pb = await b.ember.tesz('Profil', { lenyomat: LENYOMAT('B') }, undefined, { entitas: b.horgony });
  const pc = await c.ember.tesz('Profil', { lenyomat: LENYOMAT('C') }, undefined, { entitas: c.horgony });
  const es = [k.letrehozas, b.belepes, c.belepes, pb, pc, await meghiv(hivoja(k), b, { profil: LENYOMAT('B') }),
    await meghiv(b, c, { profil: LENYOMAT('C') })];
  const lanc = tagsagiLanc(tagsagiIndex(es), c.horgony);
  const csomag = await c.ember.tesz(TAGSAGI_CSOMAG, { lanc }, undefined, { entitas: c.horgony });
  const ell = await tagsagiCsomagEllenorzese(csomag);
  // Csak a csomag és a C belépése — az ősök szeletei nélkül:
  const r = horgonyTagsaga(tagsagiIndex([csomag]), c.horgony);
  return lanc.length === 7 && ell.rendben && ell.melyseg === 2 && r.igen && r.melyseg === 2;
});

proba('⛔ a hamis tagsági csomag elbukik: átírt belső esemény · idegen azonosság-szeletbe írt · tagságot nem adó', async () => {
  const k = await koino();
  const b = await belepo();
  const c = await belepo();
  const es = [k.letrehozas, b.belepes, c.belepes, await meghiv(hivoja(k), b), await meghiv(b, c)];
  const lanc = tagsagiLanc(tagsagiIndex(es), c.horgony);
  const atirt = lanc.map((e) => (e.tipus === 'Meghivas' && e.szerzo === b.ember.szerzo
    ? { ...e, adat: { ...e.adat, sajatBelepes: k.horgony } } : e));
  const hamis1 = await c.ember.tesz(TAGSAGI_CSOMAG, { lanc: atirt }, undefined, { entitas: c.horgony });
  const hamis2 = await b.ember.tesz(TAGSAGI_CSOMAG, { lanc }, undefined, { entitas: c.horgony });        // B írná C szeletébe
  const d = await belepo();
  const hamis3 = await d.ember.tesz(TAGSAGI_CSOMAG, { lanc: [k.letrehozas, d.belepes] }, undefined, { entitas: d.horgony });
  const e1 = await tagsagiCsomagEllenorzese(hamis1);
  const e2 = await tagsagiCsomagEllenorzese(hamis2);
  const e3 = await tagsagiCsomagEllenorzese(hamis3);
  return !e1.rendben && /nem hiteles/.test(e1.ok) && !e2.rendben && /saját/.test(e2.ok) && !e3.rendben && /nem ad tagságot/.test(e3.ok);
});

export default futtatas;
