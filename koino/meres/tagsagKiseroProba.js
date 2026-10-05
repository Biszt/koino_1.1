// koino/meres/tagsagKiseroProba.js

// Felelősség: bizonyítani, hogy a TAGSÁGI KÍSÉRŐK (D95/2 — `allapot/tagsagKisero.js` és a vonal tagsági köre) a valódi
// cserén (UDP-rés, titkosítva) működnek: B a szerzők azonosság-szeletét NEM egyezteti (a szigorú (b) alatt nem vállalja),
// mégis megtudja C tagságát — a csere végén C tagsági csomagját (vagy ha nincs, a láncát) kéri A-tól, és utána C pontja
// SZÁMÍT nála (D93/1). És hogy a szelet-egyezésnél is lemegy, ha függő kérdése van; hogy csak a kért szerző csomagját
// veszi át; és hogy a függő jegyzék korlátos és lejár.
//
// Futtatás: node koino/meres/mind.js tagsagkisero

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSocket } from 'node:dgram';

import { probaGyujtemeny, ujEember, tagokkal } from './probaFuttato.js';
import { esemenyTarNyitasa, tagsagFuggoTarolo } from '../js/tar/fajlTar.js';
import { esemenyMentese, koinoEsemenyei } from '../js/tar/esemenyTar.js';
import { csereUdpResen } from '../js/csere/udpVonal.js';
import { beolvasztas } from '../js/csere/csere.js';
import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';
import { tagsagiIndex, tagsagiLanc, TAGSAGI_CSOMAG } from '../js/allapot/tagsag.js';
import { tagsagKerdo, tagsagiKiserok, FUGGO_PROBA } from '../js/allapot/tagsagKisero.js';

const { proba, futtatas } = probaGyujtemeny('A tagsági kísérők a cserében (D95/2)');

const KOINO = 'proba';
const mappak = [];
const ujMappa = async () => { const m = await mkdtemp(join(tmpdir(), 'koino-kisero-')); mappak.push(m); return m; };

async function udpParos() {
  const egyik = createSocket({ type: 'udp4' });
  const masik = createSocket({ type: 'udp4' });
  await new Promise((t) => egyik.bind(0, '127.0.0.1', t));
  await new Promise((t) => masik.bind(0, '127.0.0.1', t));
  return { egyik, masik, egyikPort: egyik.address().port, masikPort: masik.address().port,
    bezar() { egyik.close(); masik.close(); } };
}

/**
 * A világ: az alapító gondolata (G), rajta B és C pontja; mindenki tag (az alapító hívta meg őket). A mindent tart (és ha
 * `csomaggal`, C tagsági csomagját is); B a koinó születését, G-t (C pontja nélkül, ha `bNalCPont` hamis) és a saját
 * azonosság-szeletét — C (és X) belépését NEM. `bNalMind`: B a többit is tudja (G minden pontját és a meghívásokat — ezek az
 * alapító azonosság-szeletébe is bejelentődnek), csak a belépéseket nem: a szeletek így egyeznek.
 */
async function vilag({ csomaggal = true, bNalMind = false } = {}) {
  const alapito = await ujEember(KOINO);
  const b = await ujEember(KOINO);
  const c = await ujEember(KOINO);
  const x = await ujEember(KOINO);
  const letrehozas = await alapito.tesz('KoinoLetrehozas', { nev: 'Kísérő', leiras: null, alapitok: [], zart: true });
  const g = await alapito.tesz('GondolatLetrehozas', { cim: 'G', meret: 10 });
  const aPont = await alapito.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 10, szerep: 'aktiv' });
  const bPont = await b.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 4, szerep: 'aktiv' });
  const cPont = await c.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 6, szerep: 'aktiv' });
  const xPont = await x.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 2, szerep: 'aktiv' });
  const mind = await tagokkal([letrehozas, g, aPont, bPont, cPont, xPont]);
  const idx = tagsagiIndex(mind, KOINO);
  const horgonya = (ki) => mind.find((e) => e.tipus === 'Belepes' && e.szerzo === ki.szerzo).azonosito;
  const csomag = async (ki) => ki.tesz(TAGSAGI_CSOMAG, { lanc: tagsagiLanc(idx, horgonya(ki)) }, undefined,
    { entitas: horgonya(ki) });
  const cCsomag = await csomag(c);
  const xCsomag = await csomag(x);

  const tarA = await esemenyTarNyitasa(KOINO, await ujMappa());
  for (const e of [...mind, ...(csomaggal ? [cCsomag] : [])]) await esemenyMentese(tarA, e);
  const mappaB = await ujMappa();
  const tarB = await esemenyTarNyitasa(KOINO, mappaB);
  const bSajat = new Set([horgonya(b)]);
  const bNal = mind.filter((e) => e.tipus === 'KoinoLetrehozas' || e.azonosito === g.azonosito || e.azonosito === aPont.azonosito
    || e.azonosito === bPont.azonosito || bSajat.has(e.entitas ?? e.azonosito)
    || (bNalMind && (e.tipus === 'Meghivas' || e.azonosito === cPont.azonosito || e.azonosito === xPont.azonosito)));
  for (const e of bNal) await esemenyMentese(tarB, e);
  // B a szigorú (b) alatt csak ezekben vesz részt (a koinó születése, G, a saját azonosság-szelete).
  const bReszvesz = new Set([letrehozas.azonosito, g.azonosito, horgonya(b)]);
  return { tarA, tarB, mappaB, g, cPont, xCsomag, cCsomag, c, x, letrehozas, bReszvesz };
}

/** A csere: A felel (a válaszoló), B kérdez — B csak a vállalt szeletekben vesz részt. */
async function csere(v, { kerdez = true, jelez = true, aReszvesz = null } = {}) {
  const kerdo = tagsagKerdo({ tar: v.tarB, koino: KOINO, tarolo: tagsagFuggoTarolo(KOINO, v.mappaB),
    koinoSzuletes: async () => v.letrehozas, mentes: (lista) => beolvasztas(v.tarB, lista, KOINO) });
  const p = await udpParos();
  try {
    const [a, b] = await Promise.all([
      csereUdpResen(p.egyik, '127.0.0.1', p.masikPort, v.tarA, KOINO, {
        ...(aReszvesz ? { reszvesz: (k) => aReszvesz.has(k) } : {}),
        tagsagValasz: (szerzok) => tagsagiKiserok(v.tarA, KOINO, szerzok, { koinoSzuletes: v.letrehozas }) }),
      csereUdpResen(p.masik, '127.0.0.1', p.egyikPort, v.tarB, KOINO, {
        reszvesz: (k) => v.bReszvesz.has(k),
        ...(jelez ? { tagsagFuggo: () => kerdo.fuggoDarab() } : {}),
        ...(kerdez ? { tagsagKerdesek: (ujak) => kerdo.kerdesek(ujak),
          tagsagFogadas: (esemenyek, kert) => kerdo.fogadas(esemenyek, kert) } : {}) })
    ]);
    return { a, b, kerdo };
  } finally { p.bezar(); }
}

/** B nézete: C pontja függőben van-e, és G össz-pontja. */
async function bNezete(v) {
  const allapot = allapotSzamitasa(await koinoEsemenyei(v.tarB, KOINO));
  return { cFugg: allapot.tagsagFuggoben.some((k) => k.azonosito === v.cPont.azonosito),
    pont: allapot.entitasok.get(v.g.azonosito)?.osszesPont ?? 0 };
}

proba('⭐⭐ a csere végén B kéri C tagsági CSOMAGJÁT (az azonosság-szeletét nem egyezteti) — utána C pontja számít nála', async () => {
  const v = await vilag();
  const { b } = await csere(v);
  const n = await bNezete(v);
  const cBelepesB = (await koinoEsemenyei(v.tarB, KOINO)).some((e) => e.tipus === 'Belepes' && e.szerzo === v.c.szerzo);
  return b.tagsagEredmeny?.megtudott >= 1 && !n.cFugg && n.pont === 10 + 4 + 6 + 2
    && !!(await v.tarB.esemeny(v.cCsomag.azonosito)) && !cBelepesB;   // a csomag jött, nem a szelet
});

proba('⛔ a tagsági kör NÉLKÜL (rontás) C pontja függőben marad — a próba ezt a kört méri', async () => {
  const v = await vilag();
  await csere(v, { kerdez: false });
  const n = await bNezete(v);
  return n.cFugg && n.pont === 10 + 4;          // X pontja is függ (az ő tagságát sem kérdezte)
});

proba('⭐ ha a válaszolónak NINCS csomagja, a tagsági LÁNCOT küldi (amit bizonyítani tud) — és az is elég', async () => {
  const v = await vilag({ csomaggal: false });
  const { b } = await csere(v);
  const n = await bNezete(v);
  return b.tagsagEredmeny?.megtudott >= 1 && !n.cFugg && !(await v.tarB.esemeny(v.cCsomag.azonosito));
});

proba('⭐ EGYEZŐ szeleteknél is lemegy, ha B-nek függő kérdése van (a nyitás jele) — jel nélkül (rontás) nem', async () => {
  const futas = async (jelez) => {
    const v = await vilag({ bNalMind: true });
    // B már tudja C pontját, de a tagságát nem: a jegyzékébe kerül (a korábbi csere így hagyta).
    const kerdo0 = tagsagKerdo({ tar: v.tarB, koino: KOINO, tarolo: tagsagFuggoTarolo(KOINO, v.mappaB),
      koinoSzuletes: async () => v.letrehozas, mentes: (lista) => beolvasztas(v.tarB, lista, KOINO) });
    await kerdo0.kerdesek([v.cPont.azonosito]);
    // A is a szigorú (b) szerint vesz részt (C azonosság-szeletét ő sem egyezteti) — így a szeletek egyeznek.
    const { b } = await csere(v, { jelez, aReszvesz: v.bReszvesz });
    return { egyezett: b.elteroSzeletek === 0, cFugg: (await bNezete(v)).cFugg };
  };
  const vele = await futas(true);
  const nelkule = await futas(false);
  return vele.egyezett && !vele.cFugg && nelkule.egyezett && nelkule.cFugg;
});

proba('⛔ csak a KÉRT szerző csomagját veszi át — egy kéretlen (X) csomagja nem kerül a tárba', async () => {
  const v = await vilag();
  const kerdo = tagsagKerdo({ tar: v.tarB, koino: KOINO, tarolo: tagsagFuggoTarolo(KOINO, v.mappaB),
    koinoSzuletes: async () => v.letrehozas, mentes: (lista) => beolvasztas(v.tarB, lista, KOINO) });
  const r = await kerdo.fogadas([v.cCsomag, v.xCsomag], [v.c.szerzo]);
  return r.megtudott === 1 && !!(await v.tarB.esemeny(v.cCsomag.azonosito)) && !(await v.tarB.esemeny(v.xCsomag.azonosito));
});

proba('⭐ a függő jegyzék LEJÁR: a sokszor hiába kérdezett szerző kiesik, és a nyitás jele elmarad', async () => {
  const v = await vilag({ bNalMind: true });
  const tarolo = tagsagFuggoTarolo(KOINO, v.mappaB);
  const kerdo = tagsagKerdo({ tar: v.tarB, koino: KOINO, tarolo, koinoSzuletes: async () => v.letrehozas,
    mentes: (lista) => beolvasztas(v.tarB, lista, KOINO) });
  const elso = await kerdo.kerdesek([v.cPont.azonosito]);
  const egy = await kerdo.fuggoDarab();
  for (let i = 0; i < FUGGO_PROBA; i++) await kerdo.fogadas([], [v.c.szerzo]);   // senki nem tudja
  return elso.includes(v.c.szerzo) && egy === 1 && (await kerdo.fuggoDarab()) === 0;
});

export default async function () {
  const eredmeny = await futtatas();
  for (const m of mappak) await rm(m, { recursive: true, force: true });
  return eredmeny;
}
