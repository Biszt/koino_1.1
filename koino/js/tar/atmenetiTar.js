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
// ⭐ A ház (D100): és amit MÁS folyamat írt bele (az őrjárat hozza a kérelem válaszát, a felület mutatja), azt a
// `frissit()` olvassa be — a `valtozat` jel-fájl mondja meg, hogy érdemes-e végignézni (különben egy olvasás).
//
// Használják: koino.js (a `hozd`, az állapot két tárból), a próbák.

import { mkdir, readdir, readFile, appendFile, writeFile, unlink, rename, stat, open } from 'node:fs/promises';
import { join } from 'node:path';
import { alakiHiba, szelet, azonositoAlaku, bejelentesHelyei } from '../esemeny/esemeny.js';
import { koinoEsemenyei } from './esemenyTar.js';

/** Az átmeneti tár mérete — kiinduló érték, készülékenként állítható (nem állapot-befolyásoló, D66). */
export const ATMENETI_KORLAT = 20 * 1024 * 1024;

const GYOKER_FAJL = '_gyoker';
// A változás jele: minden író a hozzáfűzés és az eldobás után átírja; az olvasó, ha mást lát, mint legutóbb, végignéz.
const VALTOZAT_FAJL = 'valtozat';
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
  const olvasva = new Map();        // fájlnév → ennyi bájtját olvastuk be (a `frissit` innen folytatja)
  let megnezett = {};
  let latottValtozat = null;        // a `valtozat` jel legutóbb látott tartalma
  let frissitesFut = null;

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

  /** Egy szelet-fájl sorai a `honnan`-adik bájttól — csak a teljes (sorvéggel lezárt) sorok; visszaadja, meddig ért. */
  const fajlOlvasasa = async (nev, honnan = 0) => {
    const kulcs = kulcsFajlbol(nev);
    if (kulcs !== '' && !azonositoAlaku(kulcs)) return honnan;
    let puffer;
    try {
      const f = await open(join(hely, nev), 'r');
      try {
        const { size } = await f.stat();
        if (size <= honnan) return honnan;
        puffer = Buffer.alloc(size - honnan);
        await f.read(puffer, 0, puffer.length, honnan);
      } finally { await f.close(); }
    } catch { return honnan; }
    // ⚠️ Egy másik folyamat épp írhat: a sorvég nélküli utolsó darabot a következő frissítés olvassa.
    const utolsoSorveg = puffer.lastIndexOf(0x0a);
    if (utolsoSorveg < 0) return honnan;
    for (const sor of puffer.subarray(0, utolsoSorveg).toString('utf8').split('\n')) {
      if (!sor.trim()) continue;
      let e;
      try { e = JSON.parse(sor); } catch { continue; }
      if (alakiHiba(e) || e.koino !== koino || szelet(e) !== kulcs) continue;
      felvesz(e, Buffer.byteLength(sor, 'utf8') + 1);
    }
    return honnan + utolsoSorveg + 1;
  };

  /** Egy szelet kivétele a memóriából (a fájlhoz nem nyúl — azt az `elhagy` vagy egy másik folyamat törli). */
  const kivesz = (kulcs) => {
    const sz = szeletek.get(kulcs);
    if (!sz) return;
    for (const az of sz.azonositok) {
      const e = esemenyek.get(az);
      esemenyek.delete(az);
      const sk = e.szerzo + '|' + e.sorszam;
      const lista = (sorszamok.get(sk) ?? []).filter((x) => x.azonosito !== az);
      if (lista.length) sorszamok.set(sk, lista); else sorszamok.delete(sk);
    }
    szeletek.delete(kulcs);
  };

  const valtozatJelzese = async () => {
    await writeFile(join(hely, VALTOZAT_FAJL), process.pid + ':' + Date.now() + ':' + Math.random()).catch(() => {});
  };

  // ----- A BETÖLTÉS: minden szelet-fájl; a sérült sort átlépjük (gyorsítótár) -----
  try { megnezett = JSON.parse(await readFile(join(hely, 'megnezett.json'), 'utf8')) ?? {}; } catch { megnezett = {}; }
  try { latottValtozat = await readFile(join(hely, VALTOZAT_FAJL), 'utf8'); } catch { latottValtozat = null; }
  for (const nev of await readdir(hely)) {
    if (!nev.endsWith('.jsonl')) continue;
    olvasva.set(nev, await fajlOlvasasa(nev, 0));
  }

  const osszBajt = () => [...szeletek.values()].reduce((s, sz) => s + sz.bajt, 0);
  const megnezettIras = async () => {
    const ideiglenes = join(hely, 'megnezett.json.' + process.pid + '.tmp');
    await writeFile(ideiglenes, JSON.stringify(megnezett));
    await rename(ideiglenes, join(hely, 'megnezett.json')).catch(() => {});
  };

  /** Egy szelet eldobása — a fájl törlése, a mutatók kitakarítása. */
  const elhagy = async (kulcs) => {
    if (!szeletek.has(kulcs)) return false;
    kivesz(kulcs);
    delete megnezett[kulcs];
    olvasva.delete(fajlNev(kulcs));
    await unlink(join(hely, fajlNev(kulcs))).catch(() => {});
    await megnezettIras();
    await valtozatJelzese();
    return true;
  };

  /**
   * ⭐ A ház (D100): amit MÁS folyamat írt az átmeneti tárba — az új sorok, az új szeletek, és ami közben kiesett.
   * Ha a `valtozat` jel ugyanaz, mint legutóbb, egyetlen olvasás az ára; ha más, a szelet-fájlok mérete szerint
   * folytatjuk (a tár korlátos — `ATMENETI_KORLAT` —, a végignézés is az).
   */
  const frissit = () => {
    frissitesFut ??= (async () => {
      let valtozat = null;
      try { valtozat = await readFile(join(hely, VALTOZAT_FAJL), 'utf8'); } catch { valtozat = null; }
      if (valtozat === latottValtozat) return;
      latottValtozat = valtozat;
      let nevek;
      try { nevek = new Set((await readdir(hely)).filter((n) => n.endsWith('.jsonl'))); } catch { return; }
      for (const nev of [...olvasva.keys()]) {
        if (!nevek.has(nev)) { kivesz(kulcsFajlbol(nev)); olvasva.delete(nev); }
      }
      for (const nev of nevek) {
        const eddig = olvasva.get(nev) ?? 0;
        let meret;
        try { meret = (await stat(join(hely, nev))).size; } catch { continue; }
        if (meret === eddig) continue;
        if (meret < eddig) { kivesz(kulcsFajlbol(nev)); olvasva.set(nev, await fajlOlvasasa(nev, 0)); }
        else olvasva.set(nev, await fajlOlvasasa(nev, eddig));
      }
      // A megnézés idejét is a lemezről (egy másik folyamat nézhetett meg valamit) — a későbbi nyer.
      try {
        const lemez = JSON.parse(await readFile(join(hely, 'megnezett.json'), 'utf8')) ?? {};
        for (const [k, ido] of Object.entries(lemez)) if (Number.isFinite(ido) && ido > (megnezett[k] ?? 0)) megnezett[k] = ido;
      } catch { /* gyorsítótár */ }
    })().finally(() => { frissitesFut = null; });
    return frissitesFut;
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
      const nev = fajlNev(kulcs);
      await appendFile(join(hely, nev), sor + '\n');
      olvasva.set(nev, (olvasva.get(nev) ?? 0) + Buffer.byteLength(sor, 'utf8') + 1);
      // ⭐ Amit lekértünk, azt megnéztük — és a most írt szelet a korlát miatt nem eshet ki.
      megnezett[kulcs] = most();
      await helyetCsinal(kulcs);
      await megnezettIras();
      await valtozatJelzese();
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
    helyetCsinal,
    frissit
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
  await atmeneti.frissit?.();
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
    // ⭐ A ház (D100): mindkét tár — az átmenetibe a futó felület mellett az őrjárat ír (a kérelmek válaszai).
    async frissit() { await tartos.frissit?.(); await atmeneti.frissit?.(); },
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
