// koino/meres/felajanlasProba.js — A FELAJÁNLÁS TISZTA SZÁMÍTÁSAINAK önpróbája (D107 L4 — a kereső-réteg ④c)

// Mit bizonyít ez a lap?
//
// ⭐ Hogy a felajánló jó címre visz, és nem ismétel feleslegesen:
//   · a bejegyzések régiónként csoportosulnak (a hely régiója a felajánló mélységén);
//   · ⭐ a kimondott osztódás (K7) után a bejegyzés a mélyebb darab helyére kerül — a lánc (s → s' → s'') követhető;
//   · ami már fel lett ajánlva, nem megy újra — ami változott (új mélység, új megújítás), az igen;
//   · ⭐ a megújítás újrahasznosul, amíg érvényes a mai csomagra és nem esedékes (különben minden kör új aláírás, új
//     azonosító, újra-felajánlás) — a csomag változásakor és a soros napján új kell;
//   · a jegyzék a hibás tételt eldobja.

import {
  regioCsoportok, felajanlasHelye, osztodasokFeljegyzese, osztodasKulcsa, felajanlandok, felajanlottakFeljegyzese,
  megujitasUjrahasznalhato, megujitasFeljegyzese, felajanlasJegyzekAlakja, uresFelajanlasJegyzek, regiobaEsoBejegyzes
} from '../js/csere/felajanlas.js';
import { bejegyzesekEpitese, bejegyzesAzonositoja } from '../js/tar/keresoTar.js';
import { megujitasKeszitese, sorosRend, csomagTulajdonosai } from '../js/tar/keresoMegujitas.js';
import { bejegyzesHelye, keresoRegioBol, regiobaEsik } from '../js/csere/keresoReteg.js';
import { probaGyujtemeny, ujEember } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A FELAJÁNLÁS (D107 L4 — a kereső-réteg ④c)');

const KOINO = 'felajanlas-proba';
const NAP = 24 * 3600 * 1000;

async function gondolat(cim) {
  const a = await ujEember(KOINO);
  const b = await ujEember(KOINO);
  const szuletes = await a.tesz('GondolatLetrehozas', { cim, meret: 10 });
  const pontEsemenyek = [
    await a.tesz('TudatpontRendezes', { entitas: szuletes.azonosito, pont: 30 }),
    await b.tesz('TudatpontRendezes', { entitas: szuletes.azonosito, pont: 20 })
  ];
  return { a, b, szuletes, pontEsemenyek, bejegyzesek: bejegyzesekEpitese({ szuletes, pontEsemenyek }) };
}

// Rontás: a csoport kulcsa nem a hely régiója → egy bejegyzés rossz csoportba → bukik.
proba('⭐ a bejegyzések régiónként csoportosulnak — a 0. mélységen egy csoport, mélyebben a hely régiója szerint', async () => {
  const g = await gondolat('Közös park a faluban tavasszal');
  const nulla = regioCsoportok(g.bejegyzesek, 0);
  const harom = regioCsoportok(g.bejegyzesek, 3);
  const mind = [...harom.values()].flatMap((c) => c.bejegyzesek);
  const jo = [...harom.entries()].every(([kulcs, c]) => {
    const r = keresoRegioBol(kulcs);
    return r.melyseg === 3 && c.bejegyzesek.every((b) => regiobaEsik(bejegyzesHelye(b.k, b.g, b.s), 3, r.darab));
  });
  return nulla.size === 1 && [...nulla.values()][0].bejegyzesek.length === g.bejegyzesek.length && mind.length === g.bejegyzesek.length
    && jo && harom.size > 1;
});

// ⭐ K7. Rontás: az osztódás nem számít (vagy nem lánc) → a régi helyre megy → bukik.
proba('⭐⭐ a kimondott osztódás után a bejegyzés a mélyebb darab helyére kerül — és a lánc (0 → 2 → 5) követhető', async () => {
  const g = await gondolat('Közös park');
  const b = g.bejegyzesek[0];
  let j = osztodasokFeljegyzese(uresFelajanlasJegyzek(), [{ k: b.k, s: 2 }], [b]);
  const elso = felajanlasHelye(b, j.osztodasok);
  const b2 = { ...b, s: 2 };
  j = osztodasokFeljegyzese(j, [{ k: b.k, s: 5 }], [b2]);
  const masodik = felajanlasHelye(b, j.osztodasok);
  const cs = regioCsoportok([b], 0, j.osztodasok);
  const atirt = [...cs.values()][0].bejegyzesek[0];
  // egy MÁSIK fiók nem osztódott
  const masik = g.bejegyzesek.find((x) => x.k !== b.k);
  return elso.s === 2 && masodik.s === 5 && masodik.hely === bejegyzesHelye(b.k, b.g, 5) && atirt.s === 5
    && bejegyzesAzonositoja(atirt) !== bejegyzesAzonositoja(b) && felajanlasHelye(masik, j.osztodasok).s === 0
    && (osztodasKulcsa(b.k, 0, b.g) in j.osztodasok);
});

// Rontás: a felajánlottak nincsenek nyilvántartva → minden kör újra viszi → bukik.
proba('⭐ ami fel lett ajánlva, nem megy újra — ami változott (új mélység), az igen', async () => {
  const g = await gondolat('Közös park');
  let j = uresFelajanlasJegyzek();
  const elotte = felajanlandok(g.bejegyzesek, j).length;
  j = felajanlottakFeljegyzese(j, g.bejegyzesek);
  const utana = felajanlandok(g.bejegyzesek, j).length;
  const valtozott = felajanlandok([{ ...g.bejegyzesek[0], s: 1 }], j).length;
  return elotte === g.bejegyzesek.length && utana === 0 && valtozott === 1;
});

// ⭐ Rontás: a megújítás mindig új → minden kör új azonosító → bukik; mindig régi → a csomag változása után is → bukik.
proba('⭐⭐ a megújítás újrahasznosul, amíg érvényes a mai csomagra és nem esedékes — változáskor és a soros napján új kell', async () => {
  const g = await gondolat('Közös park');
  const esemenyek = g.bejegyzesek[0].esemenyek;
  const t = csomagTulajdonosai(esemenyek, g.szuletes.azonosito);
  const elso = sorosRend(g.szuletes.azonosito, t)[0];
  const ember = elso === g.a.szerzo ? g.a : g.b;
  const jwk = await crypto.subtle.exportKey('jwk', ember.kulcspar.privateKey);
  const T0 = Date.now();
  const regi = megujitasKeszitese(jwk, ember.szerzo, { koino: KOINO, g: g.szuletes.azonosito, esemenyek, ido: T0 });
  const alap = { koino: KOINO, g: g.szuletes.azonosito, esemenyek, szerzo: ember.szerzo, regi };
  const most = megujitasUjrahasznalhato({ ...alap, most: T0 + NAP }) === regi;
  const esedekes = megujitasUjrahasznalhato({ ...alap, most: T0 + 21 * NAP }) === null;
  const harmadik = await ujEember(KOINO);
  const ujPont = await harmadik.tesz('TudatpontRendezes', { entitas: g.szuletes.azonosito, pont: 90 });
  const masCsomag = megujitasUjrahasznalhato({ ...alap, esemenyek: [...esemenyek, ujPont], most: T0 + NAP }) === null;
  let j = megujitasFeljegyzese(uresFelajanlasJegyzek(), g.szuletes.azonosito, regi);
  return most && esedekes && masCsomag && megujitasUjrahasznalhato({ ...alap, regi: null }) === null
    && j.megujitasok[g.szuletes.azonosito].alairas === regi.alairas;
});

proba('A kiszolgáló szűrője: a bejegyzés helye a tartó régióinak valamelyikébe esik-e', async () => {
  const g = await gondolat('Közös park');
  const b = g.bejegyzesek[0];
  const h = bejegyzesHelye(b.k, b.g, b.s);
  const d1 = h >> 143n;
  return regiobaEsoBejegyzes(b, [{ melyseg: 0, darab: 0n }]) && regiobaEsoBejegyzes(b, [{ melyseg: 1, darab: d1 }])
    && !regiobaEsoBejegyzes(b, [{ melyseg: 1, darab: d1 ^ 1n }]);
});

// Rontás: a jegyzék alakja nem szűr → a hibás tétel bent marad → bukik.
proba('A jegyzék a hibás tételt eldobja (azonosító, mélység, megújítás alak)', () => {
  const j = felajanlasJegyzekAlakja({ ajanlott: { rossz: 1, ['A'.repeat(43)]: 5 }, osztodasok: { 'p:park#0:0': 3, x: -1, y: 999 },
    megujitasok: { ['B'.repeat(43)]: { szerzo: 's', ido: 1, alairas: 'a' }, rossz: {} } });
  return Object.keys(j.ajanlott).join() === 'A'.repeat(43) && Object.keys(j.osztodasok).join() === 'p:park#0:0'
    && Object.keys(j.megujitasok).join() === 'B'.repeat(43);
});

export default futtatas;
