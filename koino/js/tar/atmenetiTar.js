// koino/js/tar/atmenetiTar.js

// Felelősség: B/2 — AZ ÁTMENETI TÁR (D75): amit csak LÁTTAM — eldobható.
//
// ⭐ A két tár (D75): a TARTÓS tár (`fajlTar.js`) a vállalt (B/1 — `vallalas.js`), csak hozzáfűz, és a csere
// teljes jogú résztvevője vagyok benne; az ÁTMENETI tár a megnézett, lekért (a `hozd`, később a D kérelmének
// válasza) — ⭐ **eldobható**: ha kell a hely, a LEGRÉGEBBEN MEGNÉZETT szelet megy (SK11), és semmit nem ígér.
// A D14 csak a tartósra vonatkozik (`allapotSzamitas.js`: ami csak itt van, és a pontjait nem ismerjük, az
// nem tűnik el, hanem jelölve látszik).
//
// ⭐ UGYANAZ A KAPU: ugyanazt a három tár-műveletet adja, mint a tartós tár (`esemeny`, `sorszamSzerint`,
// `hozzafuz`), tehát az `esemenyMentese` (és a csere `beolvasztas`-a) VÁLTOZATLANUL ír bele — a lekért
// esemény ugyanazon az egyetlen kapun megy át (3. szabály), csak egy eldobható tárba.
//
// ===== AZ ALAK =====
//
// `<adat>/<koino>/atmeneti/`: szeletenként egy fájl (`<szelet-kulcs>.jsonl`, a gyökér `_gyoker.jsonl`),
// soronként egy esemény, és a `megnezett.json` (szelet → mikor néztem meg utoljára). ⚠️ Szeletenként külön
// fájl, mert az eldobás így egy fájl törlése — a 49. mérés ellenérve (100 000 eseménynél lassú a sok fájl)
// itt nem áll: a tár KORLÁTOS (`ATMENETI_KORLAT`).
//
// ⚠️ A megnézés HELYI feljegyzés, nem esemény, és nem terjed (a kiszolgálás elárulja, mit néztem meg — D75/3).
// ⚠️ Egy gyorsítótár: több folyamat is írhat bele, a sérült sort átlépjük (a tartósnál ez hiba volna).
//
// Használják: koino.js (a `hozd`, az állapot két tárból), a próbák.

import { mkdir, readdir, readFile, appendFile, writeFile, unlink, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { alakiHiba, szelet, azonositoAlaku, bejelentesHelyei } from '../esemeny/esemeny.js';
import { koinoEsemenyei } from './esemenyTar.js';

/** Az átmeneti tár mérete — kiinduló érték, készülékenként állítható (nem állapot-befolyásoló, D66). */
export const ATMENETI_KORLAT = 20 * 1024 * 1024;

const GYOKER_FAJL = '_gyoker';
const fajlNev = (kulcs) => (kulcs === '' ? GYOKER_FAJL : kulcs) + '.jsonl';
const kulcsFajlbol = (nev) => {
  const k = nev.replace(/\.jsonl$/, '');
  return k === GYOKER_FAJL ? '' : k;
};

/**
 * Az átmeneti tár megnyitása.
 *
 * @param {string} koino
 * @param {string} mappa - a koinó mappája (`<adat>/<koino>`) — az átmeneti tár ennek `atmeneti/` almappája
 * @param {Object} [beallitas] - `korlat` (bájt), `most` (óra, a próbáknak)
 */
export async function atmenetiTarNyitasa(koino, mappa, beallitas = {}) {
  const hely = join(mappa, 'atmeneti');
  const korlat = beallitas.korlat ?? ATMENETI_KORLAT;
  const most = beallitas.most ?? (() => Date.now());
  await mkdir(hely, { recursive: true });

  const esemenyek = new Map();      // azonosító → esemény
  const szeletek = new Map();       // kulcs → { azonositok: Set, bajt }
  const sorszamok = new Map();      // "szerző|sorszám" → [esemény]
  let megnezett = {};

  const felvesz = (e, sorBajt) => {
    if (esemenyek.has(e.azonosito)) return false;
    const k = szelet(e);
    esemenyek.set(e.azonosito, e);
    if (!szeletek.has(k)) szeletek.set(k, { azonositok: new Set(), bajt: 0 });
    const sz = szeletek.get(k);
    sz.azonositok.add(e.azonosito);
    sz.bajt += sorBajt;
    const sk = e.szerzo + '|' + e.sorszam;
    if (!sorszamok.has(sk)) sorszamok.set(sk, []);
    sorszamok.get(sk).push(e);
    return true;
  };

  // ----- A BETÖLTÉS: minden szelet-fájl; a sérült sort átlépjük (gyorsítótár) -----
  try { megnezett = JSON.parse(await readFile(join(hely, 'megnezett.json'), 'utf8')) ?? {}; } catch { megnezett = {}; }
  for (const nev of await readdir(hely)) {
    if (!nev.endsWith('.jsonl')) continue;
    const kulcs = kulcsFajlbol(nev);
    if (kulcs !== '' && !azonositoAlaku(kulcs)) continue;
    let szoveg;
    try { szoveg = await readFile(join(hely, nev), 'utf8'); } catch { continue; }
    for (const sor of szoveg.split('\n')) {
      if (!sor.trim()) continue;
      let e;
      try { e = JSON.parse(sor); } catch { continue; }
      if (alakiHiba(e) || e.koino !== koino || szelet(e) !== kulcs) continue;
      felvesz(e, Buffer.byteLength(sor, 'utf8') + 1);
    }
  }

  const osszBajt = () => [...szeletek.values()].reduce((s, sz) => s + sz.bajt, 0);
  const megnezettIras = async () => {
    const ideiglenes = join(hely, 'megnezett.json.' + process.pid + '.tmp');
    await writeFile(ideiglenes, JSON.stringify(megnezett));
    await rename(ideiglenes, join(hely, 'megnezett.json')).catch(() => {});
  };

  /** Egy szelet eldobása — a fájl törlése, a mutatók kitakarítása. */
  const elhagy = async (kulcs) => {
    const sz = szeletek.get(kulcs);
    if (!sz) return false;
    for (const az of sz.azonositok) {
      const e = esemenyek.get(az);
      esemenyek.delete(az);
      const sk = e.szerzo + '|' + e.sorszam;
      const lista = (sorszamok.get(sk) ?? []).filter((x) => x.azonosito !== az);
      if (lista.length) sorszamok.set(sk, lista); else sorszamok.delete(sk);
    }
    szeletek.delete(kulcs);
    delete megnezett[kulcs];
    await unlink(join(hely, fajlNev(kulcs))).catch(() => {});
    await megnezettIras();
    return true;
  };

  /** ⭐ A korlát fölött a LEGRÉGEBBEN MEGNÉZETT szelet megy (a most írt soha). */
  const helyetCsinal = async (vedett) => {
    const eldobottak = [];
    while (osszBajt() > korlat) {
      let legregebbi = null;
      for (const k of szeletek.keys()) {
        if (k === vedett) continue;
        if (legregebbi === null || (megnezett[k] ?? 0) < (megnezett[legregebbi] ?? 0)) legregebbi = k;
      }
      if (legregebbi === null) break;            // csak a védett maradt — az egymaga lehet nagyobb
      await elhagy(legregebbi);
      eldobottak.push(legregebbi);
    }
    return eldobottak;
  };

  return {
    atmeneti: true,
    hely,

    // ----- a kapu (`esemenyMentese`) három kérdése — ugyanaz a felület, mint a tartós táré -----
    async esemeny(azonosito) { return esemenyek.get(azonosito) ?? null; },
    async sorszamSzerint(szerzo, sorszam) { return [...(sorszamok.get(szerzo + '|' + sorszam) ?? [])]; },
    async hozzafuz(e) {
      const sor = JSON.stringify(e);
      if (!felvesz(e, Buffer.byteLength(sor, 'utf8') + 1)) return;
      const kulcs = szelet(e);
      await appendFile(join(hely, fajlNev(kulcs)), sor + '\n');
      // ⭐ Amit lekértünk, azt megnéztük — és a most írt szelet a korlát miatt nem eshet ki.
      megnezett[kulcs] = most();
      await helyetCsinal(kulcs);
      await megnezettIras();
    },

    // ----- az olvasás -----
    /** Minden esemény (a korlátos tár egésze). */
    mind() { return [...esemenyek.values()]; },
    /** A szeletek a méretükkel és a megnézés idejével. */
    szeletek() {
      return [...szeletek.entries()].map(([kulcs, sz]) => ({ kulcs, darab: sz.azonositok.size, bajt: sz.bajt,
        megnezve: megnezett[kulcs] ?? null }));
    },
    meret() { return osszBajt(); },

    // ----- a megnézés és az eldobás -----
    /** A szelet megnézése (a `hozd`, a felületen megnyitott kártya) — ettől marad tovább. */
    async megnezve(kulcs) {
      if (!szeletek.has(kulcs)) return false;
      megnezett[kulcs] = most();
      await megnezettIras();
      return true;
    },
    elhagy,
    helyetCsinal
  };
}

/**
 * ⭐ A SZÁMÍTÁS BEMENETE A KÉT TÁRBÓL: a tartós tár eseményei és az átmeneti tár azon eseményei, amik a
 * tartósban nincsenek meg. A `csakAtmeneti` (azonosítók) a D14 kivételéhez kell (`allapotSzamitas.js`).
 *
 * @returns {Promise<{esemenyek: Array<Object>, csakAtmeneti: Set<string>}>}
 */
export async function ketTarBemenete(tartos, atmeneti, koino) {
  const tartosak = await koinoEsemenyei(tartos, koino);
  if (!atmeneti) return { esemenyek: tartosak, csakAtmeneti: new Set() };
  const megvan = new Set(tartosak.map((e) => e.azonosito));
  const csak = atmeneti.mind().filter((e) => e.koino === koino && !megvan.has(e.azonosito));
  return { esemenyek: [...tartosak, ...csak], csakAtmeneti: new Set(csak.map((e) => e.azonosito)) };
}

/**
 * ⭐ A KÉT TÁR EGY NÉZETBEN — az olvasóknak (a felület paklija), akik `koinoEsemenyei`-vel kérdeznek. ⛔ Írni
 * NEM lehet rajta át (az a tartós táré, a saját láncunk írójáé).
 */
export function ketTarNezet(tartos, atmeneti) {
  let csak = new Set();
  return {
    async frissit() { await tartos.frissit?.(); },
    async betolt() {
      const t = await tartos.betolt();
      const megvan = new Set(t.map((e) => e.azonosito));
      const atm = atmeneti.mind().filter((e) => !megvan.has(e.azonosito));
      csak = new Set(atm.map((e) => e.azonosito));
      return [...t, ...atm];
    },
    /** A legutóbbi betöltésből: ami CSAK az átmeneti tárban van (a D14 kivételéhez — `allapotSzamitas.js`). */
    csakAtmeneti() { return csak; },
    async esemeny(az) { return (await tartos.esemeny(az)) ?? atmeneti.esemeny(az); },
    // ⭐ D93/6 (2026-10-04): a szelet és a hozzá bejelentett események MINDKÉT tárból (addig a szelet csak a tartósból
    // jött — a `hozd`-dal elhozott, nem vállalt szelet így a nézetben sem látszott). Az átmeneti tár korlátos, a
    // bejelentéseit végigolvasni olcsó.
    async szeletEsemenyei(s) {
      const t = await tartos.szeletEsemenyei(s);
      const megvan = new Set(t.map((e) => e.azonosito));
      return [...t, ...atmeneti.mind().filter((e) => szelet(e) === s && !megvan.has(e.azonosito))];
    },
    async bejelentesek(s) {
      const t = typeof tartos.bejelentesek === 'function' ? await tartos.bejelentesek(s) : [];
      const megvan = new Set(t.map((e) => e.azonosito));
      return [...t, ...atmeneti.mind().filter((e) => !megvan.has(e.azonosito) && bejelentesHelyei(e).includes(s))];
    },
    async hozzafuz() { throw new Error('a két tár nézetén át nem lehet írni (a tartós tár íróján át igen)'); }
  };
}
