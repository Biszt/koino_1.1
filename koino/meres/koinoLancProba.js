// koino/meres/koinoLancProba.js — ⭐⭐ D118 (a költözés ②a): a gyermek születése és a születések lánca
//
// Azt bizonyítja, hogy egy koinó a szülőjére épülhet, és ezt bárki ellenőrizheti a két születésből: a gyermek születése a
// létrehozó tagsági bizonyítékát hozza a szülőben (KZ2), a zárt szülőnek csak zárt gyermeke lehet (D118/5), és a kapu a
// hamisat — a nem tag létrehozót, az átírt vagy idegen bizonyítékot — elveti. ⭐ A születések lánca a gyökértől jön: a
// beolvasztás a kapott születésekből és a tárból együtt követi, és a koinó őseinek születését (más koinó-névvel) is beveszi
// — ami nincs a láncon, az idegen marad.

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';
import { esemenyEllenorzese, esemenyLetrehozasa } from '../js/esemeny/esemeny.js';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { esemenyMentese } from '../js/tar/esemenyTar.js';
import { beolvasztas } from '../js/csere/csere.js';
import {
  gyermekSzuletesEllenorzese, szuloTagsagaEpitese, szuletesLanc, gyermekSzuleteseE, koinoNezete
} from '../js/allapot/koinoLanc.js';
import { egyeztetettEsemenyek, GYOKER_KULCS } from '../js/csere/szeletEgyeztetes.js';

const { proba, futtatas } = probaGyujtemeny('A gyermek születése és a születések lánca (D118 ②a)');

// ===== SEGÉDEK =====

/** Egy új alakú koinó (a neve a születése lenyomata) — az alapító utána a koinó nevén ír. */
async function ujKoino(alapito, { zart = true, nev = 'Szülő' } = {}) {
  alapito.koinotValt('');
  const sz = await alapito.tesz('KoinoLetrehozas', { nev, leiras: null, alapitok: [], zart });
  alapito.koinotValt(sz.azonosito);
  return sz;
}

/** A gyermek születése: `ki` írja alá, a szülő `P`, a bizonyíték `szuloTagsag`. */
async function gyermekSzuletes(ki, P, szuloTagsag, { zart = true, nev = 'Gyermek' } = {}) {
  const vissza = P;
  ki.koinotValt('');
  const e = await ki.tesz('KoinoLetrehozas', { nev, leiras: null, alapitok: [], zart, szulo: P, szuloTagsag });
  ki.koinotValt(vissza);
  return e;
}

async function ujTar(koino) {
  return esemenyTarNyitasa(koino, await mkdtemp(join(tmpdir(), 'koino-koinolanc-')));
}

/** A tagság a szülőben: belép, az alapító meghívja. */
async function meghivott(alapito, sz) {
  const tag = await ujEember(sz.azonosito);
  const be = await tag.tesz('Belepes', {});
  const m = await alapito.tesz('Meghivas', { kit: tag.szerzo, sajatBelepes: sz.azonosito }, undefined, { entitas: be.azonosito });
  return { tag, be, m };
}

// ===================================
// 1. A KAPU — a szülő születésével együtt
// ===================================

proba('⭐⭐ D118 (②a): az alapító gyermeke a kapun — a szülő születése nélkül nem (de nem végleg), vele igen', async () => {
  const alapito = await ujEember('');
  const sz = await ujKoino(alapito);
  const gy = await gyermekSzuletes(alapito, sz.azonosito, { horgony: sz.azonosito, lanc: [] });
  const tar = await ujTar(gy.azonosito);
  const elotte = await esemenyMentese(tar, gy);
  if (elotte.mentve || !elotte.hianyzik || !/szülő születése még nincs meg/.test(elotte.ok)) return false;
  return (await esemenyMentese(tar, sz)).mentve === true && (await esemenyMentese(tar, gy)).mentve === true
    && gyermekSzuleteseE(gy) && !gyermekSzuleteseE(sz);
});

proba('⛔ D118/5: a ZÁRT szülőnek csak zárt gyermeke lehet — a nyílt szülőnek nyílt is', async () => {
  const alapito = await ujEember('');
  const zart = await ujKoino(alapito, { zart: true });
  const nyiltGy = await gyermekSzuletes(alapito, zart.azonosito, { horgony: zart.azonosito, lanc: [] }, { zart: false });
  const z = await gyermekSzuletesEllenorzese(nyiltGy, zart);
  const masik = await ujEember('');
  const nyilt = await ujKoino(masik, { zart: false });
  const nyiltGy2 = await gyermekSzuletes(masik, nyilt.azonosito, { horgony: nyilt.azonosito, lanc: [] }, { zart: false });
  return !z.rendben && /zárt szülőnek csak zárt gyermeke/.test(z.ok)
    && (await gyermekSzuletesEllenorzese(nyiltGy2, nyilt)).rendben === true;
});

// ===================================
// 2. KZ2 — a létrehozó a szülő tagja
// ===================================

proba('⭐⭐ KZ2: a meghívott TAG gyermeke a kapun — a bizonyíték a szülő eseményeiből épül (a szülő születése nélkül)', async () => {
  const alapito = await ujEember('');
  const sz = await ujKoino(alapito);
  const { tag, be, m } = await meghivott(alapito, sz);
  const bizonyitek = szuloTagsagaEpitese([sz, be, m], sz.azonosito, be.azonosito);
  if (!bizonyitek || bizonyitek.lanc.some((e) => e.tipus === 'KoinoLetrehozas') || bizonyitek.lanc.length !== 2) return false;
  const gy = await gyermekSzuletes(tag, sz.azonosito, bizonyitek);
  const r = await gyermekSzuletesEllenorzese(gy, sz);
  return r.rendben === true && r.melyseg === 1;
});

proba('⛔ KZ2: aki csak BELÉPETT (senki nem hívta meg), az nem hozhat létre gyermeket — se az építő, se a kapu nem engedi', async () => {
  const alapito = await ujEember('');
  const sz = await ujKoino(alapito);
  const idegen = await ujEember(sz.azonosito);
  const be = await idegen.tesz('Belepes', {});
  const epito = szuloTagsagaEpitese([sz, be], sz.azonosito, be.azonosito);
  const gy = await gyermekSzuletes(idegen, sz.azonosito, { horgony: be.azonosito, lanc: [be] });
  const r = await gyermekSzuletesEllenorzese(gy, sz);
  return epito === null && !r.rendben && /nem tagja a szülőnek/.test(r.ok);
});

proba('⛔ KZ2: a HAMIS bizonyíték elbukik — átírt esemény, más horgonya, a szülő születése vagy egy idegen koinó eseménye a láncban',
  async () => {
    const alapito = await ujEember('');
    const sz = await ujKoino(alapito);
    const { tag, be, m } = await meghivott(alapito, sz);
    const jo = szuloTagsagaEpitese([sz, be, m], sz.azonosito, be.azonosito);
    // (a) átírt esemény: a meghívás adata más, az aláírás a régi
    const atirt = { ...m, adat: { ...m.adat, kit: alapito.szerzo } };
    const a = await gyermekSzuletesEllenorzese(await gyermekSzuletes(tag, sz.azonosito, { horgony: be.azonosito, lanc: [be, atirt] }), sz);
    // (b) a TAG bizonyítéka egy idegen létrehozóval
    const nemTag = await ujEember(sz.azonosito);
    const b = await gyermekSzuletesEllenorzese(await gyermekSzuletes(nemTag, sz.azonosito, jo), sz);
    // (c) a szülő születése a láncban
    const c = await gyermekSzuletesEllenorzese(await gyermekSzuletes(tag, sz.azonosito, { ...jo, lanc: [...jo.lanc, sz] }), sz);
    // (d) egy másik koinó eseménye
    const masAlapito = await ujEember('');
    const mas = await ujKoino(masAlapito, { nev: 'Más' });
    const masBe = await (await ujEember(mas.azonosito)).tesz('Belepes', {});
    const d = await gyermekSzuletesEllenorzese(await gyermekSzuletes(tag, sz.azonosito, { ...jo, lanc: [...jo.lanc, masBe] }), sz);
    // ⚠️ A jó bizonyíték ugyanígy átmegy (különben egy mindent elvető kapu is zöld lenne).
    const ok = (await gyermekSzuletesEllenorzese(await gyermekSzuletes(tag, sz.azonosito, jo), sz)).rendben;
    return ok === true && !a.rendben && /nem hiteles/.test(a.ok) && !b.rendben && /horgonya nem a létrehozóé/.test(b.ok)
      && !c.rendben && /idegen esemény/.test(c.ok) && !d.rendben && /idegen esemény/.test(d.ok);
  });

// ===================================
// 3. AZ ALAK
// ===================================

proba('⛔ D118 (②a): a szülő csak új alakú születésen állhat, a bizonyítékával — az alak a kapun (aláírás után is)', async () => {
  const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const alap = { tipus: 'KoinoLetrehozas', elozo: null, sorszam: 1 };
  const P = 'A'.repeat(43);
  const adat = (tobbi) => ({ nev: 'X', leiras: null, alapitok: [], zart: true, ...tobbi });
  const ell = async (leiras) => (await esemenyEllenorzese(await esemenyLetrehozasa(leiras, kp)));
  const regiAlak = await ell({ ...alap, koino: 'regi', adat: adat({ szulo: P, szuloTagsag: { horgony: P, lanc: [] } }) });
  const nemNev = await ell({ ...alap, koino: '', adat: adat({ szulo: 'rövid', szuloTagsag: { horgony: P, lanc: [] } }) });
  const nincsBizonyitek = await ell({ ...alap, koino: '', adat: adat({ szulo: P }) });
  const csakBizonyitek = await ell({ ...alap, koino: '', adat: adat({ szuloTagsag: { horgony: P, lanc: [] } }) });
  const jo = await ell({ ...alap, koino: '', adat: adat({ szulo: P, szuloTagsag: { horgony: P, lanc: [] } }) });
  return !regiAlak.rendben && /új alakú születés/.test(regiAlak.ok) && !nemNev.rendben && !nincsBizonyitek.rendben
    && /tagsági bizonyítékát/.test(nincsBizonyitek.ok) && !csakBizonyitek.rendben && /szülőt megnevező/.test(csakBizonyitek.ok)
    && jo.rendben === true;
});

// ===================================
// 4. A LÁNC ÉS A BEOLVASZTÁS
// ===================================

/** Három nemzedék ugyanattól az embertől: G → P → C. */
async function haromNemzedek() {
  const ember = await ujEember('');
  const G = await ujKoino(ember, { nev: 'Nagyszülő' });
  const P = await gyermekSzuletes(ember, G.azonosito, { horgony: G.azonosito, lanc: [] }, { nev: 'Szülő' });
  const C = await gyermekSzuletes(ember, P.azonosito, { horgony: P.azonosito, lanc: [] }, { nev: 'Gyermek' });
  return { ember, G, P, C };
}

proba('⭐ D118 (②a): a születések lánca a gyermektől a gyökérig — teljes, vagy kimondja, melyik hiányzik', async () => {
  const { G, P, C } = await haromNemzedek();
  const tar = await ujTar(C.azonosito);
  for (const e of [G, P, C]) if (!(await esemenyMentese(tar, e)).mentve) return false;
  const l = await szuletesLanc(tar, C.azonosito);
  const csonka = await szuletesLanc(await ujTar(C.azonosito), C.azonosito, new Map([[C.azonosito, C], [G.azonosito, G]]));
  return l.teljes && l.lanc.map((e) => e.azonosito).join() === [C, P, G].map((e) => e.azonosito).join()
    && !csonka.teljes && csonka.hianyzik === P.azonosito && csonka.lanc.length === 1;
});

proba('⭐⭐ D118 (②a): a beolvasztás a lánc születéseit akármilyen sorrendből a gyökértől veszi be — az idegen születést nem',
  async () => {
    const { G, P, C } = await haromNemzedek();
    const idegenAlapito = await ujEember('');
    const idegen = await ujKoino(idegenAlapito, { nev: 'Idegen' });
    const tar = await ujTar(C.azonosito);
    const r = await beolvasztas(tar, [C, idegen, G, P], C.azonosito);
    const tarban = (await tar.betolt()).map((e) => e.azonosito);
    // Hiányos lánc: a középső nélkül a gyermek a kapun akad el (nem végleg), a nagyszülő nincs a láncon — idegen.
    const tar2 = await ujTar(C.azonosito);
    const r2 = await beolvasztas(tar2, [C, G], C.azonosito);
    const r3 = await beolvasztas(tar2, [P, C, G], C.azonosito);
    return r.uj === 3 && r.idegen === 1 && tarban.join() === [G, P, C].map((e) => e.azonosito).join()
      && r2.uj === 0 && r2.idegen === 1 && r2.elutasitva.some((x) => x.azonosito === C.azonosito)
      && r3.uj === 3;
  });

// ===================================
// 5. ⭐⭐ ②b — A KAPU KOINÓ-SZABÁLYA: az ős vágás előtti eseményei a gyermekbe tartoznak
// ===================================
//
// Egy esemény a gyermeké, ha a gyermeké; vagy a lánc egy születése; vagy egy ős eseménye a vágása előtt — a nem költözőé
// az óra szerint (`ido` ≤ annak a nemzedéknek a születése, amelyik tőle örökölt), ⭐ a létrehozóé a LÁNC-PONT szerint (a
// sorszáma a gyermek születéséé alatt): az óra-csúszás így sem engedheti be a vágás utáni szülőbeli eseményét, ami a
// gyermekbeli folytatással egy sorszámot viselne.

/** Három nemzedék két szereplővel: az `ember` hozza létre mindet; a `tag` a P-ben ír a vágás előtt és után. */
async function nemzedekekTaggal() {
  const ember = await ujEember('');
  const kezdet = Date.UTC(2026, 0, 1);
  ember.koinotValt('');
  const G = await ember.tesz('KoinoLetrehozas', { nev: 'Nagyszülő', leiras: null, alapitok: [], zart: true }, kezdet);
  ember.koinotValt(G.azonosito);
  const gElotte = await ember.tesz('GondolatLetrehozas', { cim: 'G előtte', meret: 10 }, kezdet + 10);
  ember.koinotValt('');
  const P = await ember.tesz('KoinoLetrehozas', { nev: 'Szülő', leiras: null, alapitok: [], zart: true, szulo: G.azonosito,
    szuloTagsag: { horgony: G.azonosito, lanc: [] } }, kezdet + 100);
  ember.koinotValt(G.azonosito);
  const gUtana = await ember.tesz('GondolatLetrehozas', { cim: 'G utána', meret: 10 }, kezdet + 150);
  ember.koinotValt(P.azonosito);
  const tag = await ujEember(P.azonosito);
  const be = await tag.tesz('Belepes', {}, kezdet + 200);
  const m = await ember.tesz('Meghivas', { kit: tag.szerzo, sajatBelepes: P.azonosito }, kezdet + 210, { entitas: be.azonosito });
  const tElotte = await tag.tesz('GondolatLetrehozas', { cim: 'P előtte', meret: 10 }, kezdet + 300);
  const eElotte = await ember.tesz('GondolatLetrehozas', { cim: 'P a létrehozótól', meret: 10 }, kezdet + 310);
  ember.koinotValt('');
  const C = await ember.tesz('KoinoLetrehozas', { nev: 'Gyermek', leiras: null, alapitok: [], zart: true, szulo: P.azonosito,
    szuloTagsag: { horgony: P.azonosito, lanc: [] } }, kezdet + 400);
  ember.koinotValt(P.azonosito);
  const tUtana = await tag.tesz('GondolatLetrehozas', { cim: 'P utána', meret: 10 }, kezdet + 500);
  // ⛔ A létrehozó vágás UTÁNI szülőbeli eseménye — az órája szerint a vágás ELŐTT (csúszik): a szülőben ugyanarról a
  // pontról folytatja a láncát, mint a gyermek születése (azonos sorszám és `elozo` — `elagaztat`).
  const eUtanaCsuszo = await ember.elagaztat('GondolatLetrehozas', { cim: 'P a létrehozótól, utána', meret: 10 }, kezdet + 350);
  ember.koinotValt(C.azonosito);
  const cSajat = await ember.tesz('GondolatLetrehozas', { cim: 'C saját', meret: 10 }, kezdet + 600);
  return { G, P, C, gElotte, gUtana, be, m, tElotte, eElotte, tUtana, eUtanaCsuszo, cSajat };
}

proba('⭐⭐ ②b: a koinó-szabály — az ős vágás előtti eseménye a gyermeké (a nem költözőé az óra, a létrehozóé a lánc-pont szerint), a vágás utáni nem',
  async () => {
    const n = await nemzedekekTaggal();
    const tar = await ujTar(n.C.azonosito);
    for (const e of [n.G, n.P, n.C]) if (!(await esemenyMentese(tar, e)).mentve) return false;
    const { tartozik } = await koinoNezete(tar, n.C.azonosito);
    const masAlapito = await ujEember('');
    const mas = await ujKoino(masAlapito, { nev: 'Más' });
    const masGondolat = await masAlapito.tesz('GondolatLetrehozas', { cim: 'Más', meret: 10 });
    const igen = [n.G, n.P, n.C, n.cSajat, n.gElotte, n.be, n.m, n.tElotte, n.eElotte];
    const nem = [n.gUtana, n.tUtana, n.eUtanaCsuszo, mas, masGondolat];
    // ⚠️ A csúszó esemény órája a vágás ELŐTT van — a lánc-pont nélkül átjutna (a próba így nem vak).
    if (!(n.eUtanaCsuszo.ido < n.C.ido) || n.eUtanaCsuszo.sorszam !== n.C.sorszam) return false;
    return igen.every((e) => tartozik(e) === true) && nem.every((e) => tartozik(e) === false);
  });

proba('⭐⭐ ②b: a beolvasztás a gyermek tárába a vágás előtti ős-eseményeket veszi be (a többi idegen), és a szelet halmaza ugyanezt mondja',
  async () => {
    const n = await nemzedekekTaggal();
    const tar = await ujTar(n.C.azonosito);
    const r = await beolvasztas(tar, [n.C, n.P, n.G, n.gElotte, n.gUtana, n.be, n.m, n.tElotte, n.eElotte, n.tUtana, n.eUtanaCsuszo,
      n.cSajat], n.C.azonosito);
    const tarban = new Set((await tar.betolt()).map((e) => e.azonosito));
    const vart = [n.G, n.P, n.C, n.gElotte, n.be, n.m, n.tElotte, n.eElotte, n.cSajat];
    // A szelet halmaza: a tag „P előtte” gondolatának szelete (a születése a saját szelete) — ⚠️ a halmaz szabálya a kapuéval
    // egyezik, különben két készülék minden cserében újraküldené, amit a másik elvet.
    const halmaz = (await egyeztetettEsemenyek(tar, n.C.azonosito, n.tElotte.azonosito)).map((e) => e.azonosito);
    const gyoker = (await egyeztetettEsemenyek(tar, n.C.azonosito, GYOKER_KULCS)).map((e) => e.azonosito);
    return r.uj === vart.length && r.idegen === 3 && vart.every((e) => tarban.has(e.azonosito))
      && !tarban.has(n.tUtana.azonosito) && !tarban.has(n.eUtanaCsuszo.azonosito)
      && halmaz.includes(n.tElotte.azonosito)
      && gyoker.includes(n.tElotte.azonosito) && gyoker.includes(n.cSajat.azonosito) && gyoker.includes(n.gElotte.azonosito);
  });

export default futtatas;
