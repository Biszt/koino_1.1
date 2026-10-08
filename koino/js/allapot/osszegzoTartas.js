// koino/js/allapot/osszegzoTartas.js

// Felelősség: D95/1, D95/3 — a két fokú vállalás és a csak küldő részvétel SZEREPEI a cserében. A vonal (`vonal.js`) a
// beállításain át hívja őket, és semmit nem tud a koinóról; ez a modul sem nyit hálózatot (1. szabály).
//
//   · az ÖSSZEGZŐ tartó (a nagy szeletet csak összegezve tartja): megnevezi a szeleteit a legutóbb ellenőrzött gyökérrel és
//     időponttal, a kapott gyökérre és lezárási összegzésekre MAGA sorsol mintát, ellenőriz, és tárol (`osszegzoKerdo`);
//   · a TELJES tartó (a szeletet egészében tartja): felel — az új gyökér (a D92/5 részfa-fája), és az azóta lezárt döntések
//     összegzései; a mintákra csak olyan összegzésnél, amit maga is BÁJTRA ugyanígy számol (`teljesTarto`);
//   · a KÜLDŐ (ahol saját eseményem van, de a szeletet nem egyeztetem): felajánlja a saját eseményei azonosítóit
//     (`sajatKuldo`); a FOGADÓ (aki a szeletet tartja) a hiányzókat kéri (`kuldoFogado`).
//
// Használják: koino.js (a csere beállításai), a próbák.

import {
  osszPontokSzamitasa, reszfaLevelei, reszfaGyokere, mintaHelyek, fejlecMintai, fejlecEllenorzese
} from './osszPont.js';
import {
  LEZARASI_OSSZEGZES, LEZARASI_MINTA, lezarasiOsszegzesAlakja, lezarasiOsszegzesEpitese, lezarasiMintaHelyek,
  lezarasiMintakValasza, lezarasiOsszegzesEllenorzese
} from './lezarasiOsszegzes.js';
import { esemenyEllenorzese } from '../esemeny/esemeny.js';
import { kanonikusBajtok } from '../esemeny/kanonikusAlak.js';

/** A szelet összegzésére ennyi mintát kér az összegző (a 62. mérés: k = 8-cal 5–21 KB). */
export const OSSZEGZES_MINTA = 8;
/** Egy válaszban szeletenként legfeljebb ennyi lezárási összegzés (a többi a következő cserén). */
export const LEZARAS_VALASZ_KORLAT = 16;
/** Egy kérdésben legfeljebb ennyi szelet és összegzés (a társ kérése felülről korlátos). */
const KERDES_KORLAT = 64;
/** A küldő szeletenként legfeljebb ennyi saját eseményt ajánl fel (a legutóbbiakat). */
const SAJAT_KORLAT = 64;

const azonosKanonikus = (a, b) => Buffer.from(kanonikusBajtok(a)).equals(Buffer.from(kanonikusBajtok(b)));

// ===================================
// AZ ÖSSZEGZŐ TARTÓ
// ===================================

/**
 * @param {Object} b
 * @param {{olvas: Function, ir: Function}} b.tarolo - `osszegzesTarolo` ({ szeletek, lezarasok })
 * @param {Function} b.szeletek - async () → az összegezve tartott szeletek kulcsai
 * @param {Function} [b.tagE] - async (szerző) → true | false | null (a minták szerzőinek tagsága)
 * @param {Function} [b.esemenyMentes] - async (esemény) — a javaslat és az összegzés kísérőként a tárba
 */
export function osszegzoKerdo({ tarolo, szeletek, tagE = async () => null, esemenyMentes = async () => {} }) {
  return {
    /** A CIMEK `osz` listája: szeletenként a legutóbb ellenőrzött gyökér lenyomata és a lezárási időpont. */
    async lista() {
      const t = await tarolo.olvas();
      return (await szeletek()).slice(0, KERDES_KORLAT)
        .map((k) => ({ k, gy: t.szeletek[k]?.gyoker?.l ?? null, mikor: t.szeletek[k]?.mikor ?? 0 }));
    },

    /** A minta-helyek a kapott gyökerekre és összegzésekre — az ÖSSZEGZŐ sorsolja, a gyökér bemondása UTÁN. */
    async mintaKerdesek(valaszok) {
      const kerdesek = { szelet: {}, lezaras: {} };
      for (const v of valaszok.slice(0, KERDES_KORLAT)) {
        if (!v || typeof v.k !== 'string') continue;
        const o0 = v.fejlec?.gyoker?.o?.[0];
        if (Number.isSafeInteger(o0) && o0 > 0) kerdesek.szelet[v.k] = mintaHelyek(o0, OSSZEGZES_MINTA);
        for (const l of (Array.isArray(v.lezarasok) ? v.lezarasok : []).slice(0, LEZARAS_VALASZ_KORLAT)) {
          const o = l?.esemeny?.adat;
          if (l?.esemeny?.tipus !== LEZARASI_OSSZEGZES || !lezarasiOsszegzesAlakja(o) || o.entitas !== v.k) continue;
          kerdesek.lezaras[l.esemeny.azonosito] = lezarasiMintaHelyek(o, LEZARASI_MINTA);
        }
      }
      return kerdesek;
    },

    /** Az ellenőrzés és a tárolás. ⛔ Ami nem ellenőrizhető vagy elbukik, az nem kerül a tárolóba (és megnevezzük). */
    async fogadas(valaszok, kerdesek, mintak) {
      const t = await tarolo.olvas();
      const eredmeny = { szeletek: 0, lezarasok: 0, elvetve: [] };
      for (const v of valaszok.slice(0, KERDES_KORLAT)) {
        if (!v || typeof v.k !== 'string') continue;
        const helyek = kerdesek?.szelet?.[v.k];
        if (helyek && v.fejlec?.gyoker) {
          const m = mintak?.szelet?.[v.k];
          const esemenyek = new Map((Array.isArray(m?.esemenyek) ? m.esemenyek : []).map((e) => [e.azonosito, e]));
          const e = await fejlecEllenorzese({ azonosito: v.k, gyoker: v.fejlec.gyoker, helyek,
            mintak: Array.isArray(m?.mintak) ? m.mintak : [], esemenyek });
          if (e.rendben) {
            t.szeletek[v.k] = { ...(t.szeletek[v.k] ?? {}), gyoker: v.fejlec.gyoker, osszPont: v.fejlec.gyoker.o[0],
              darab: v.fejlec.gyoker.d, ellenorizve: Date.now() };
            eredmeny.szeletek++;
          } else eredmeny.elvetve.push({ k: v.k, mi: 'szelet', ok: e.ok });
        }
        for (const l of (Array.isArray(v.lezarasok) ? v.lezarasok : []).slice(0, LEZARAS_VALASZ_KORLAT)) {
          const lh = kerdesek?.lezaras?.[l?.esemeny?.azonosito];
          if (!lh) continue;
          const j = l.javaslat;
          if (!j || j.azonosito !== l.esemeny.adat.javaslat || !(await esemenyEllenorzese(j)).rendben
              || !(await esemenyEllenorzese(l.esemeny)).rendben) {
            eredmeny.elvetve.push({ k: v.k, mi: 'lezaras', ok: 'a javaslat vagy az összegzés nem hiteles' });
            continue;
          }
          const e = await lezarasiOsszegzesEllenorzese({ osszegzes: l.esemeny.adat, javaslatEsemeny: j, helyek: lh,
            mintak: mintak?.lezaras?.[l.esemeny.azonosito], tagE });
          if (!e.rendben) { eredmeny.elvetve.push({ k: v.k, mi: 'lezaras', ok: e.ok }); continue; }
          t.lezarasok[j.azonosito + '|' + v.k] = { esemeny: l.esemeny.azonosito, osszegzes: l.esemeny.adat, allas: e.allas,
            ellenorizve: Date.now() };
          t.szeletek[v.k] = { ...(t.szeletek[v.k] ?? {}), mikor: Math.max(t.szeletek[v.k]?.mikor ?? 0, l.esemeny.adat.lezaras) };
          await esemenyMentes(j);
          await esemenyMentes(l.esemeny);
          eredmeny.lezarasok++;
        }
      }
      await tarolo.ir(t);
      return eredmeny;
    }
  };
}

// ===================================
// A TELJES TARTÓ
// ===================================

/**
 * @param {Object} b
 * @param {Function} b.teljesE - async (szelet) → egészében tartom-e
 * @param {Function} b.kep - async () → { allapot, szamitok, bemondasok } (a számító események és az állapot)
 * @param {Object} b.karbantarto - `reszfaKarbantarto`
 * @param {Function} b.esemenyOlvas - async (azonosító) → esemény
 * @param {Function} b.lezarasiEsemenyek - async (szelet) → a szelethez bejelentett `LezarasiOsszegzes` események
 * @param {Map} [b.epitoGyorsitotar] - összegzés-azonosító → az építő (a lezárás bemenete befagyott — egyszer épül)
 */
export function teljesTarto({ teljesE, kep, karbantarto, esemenyOlvas, lezarasiEsemenyek, epitoGyorsitotar = new Map() }) {
  const reszfa = async (k) => {
    const { allapot, bemondasok } = await kep();
    const fa = await karbantarto.fa(k, reszfaLevelei(k, allapot, osszPontokSzamitasa(allapot.entitasok, bemondasok)));
    return { fa, allapot };
  };
  return {
    /** A társ összegző szeleteire: az új gyökér (ha változott) és az azóta lezárt döntések összegzései a javaslatukkal. */
    async valasz(lista) {
      const ki = [];
      for (const x of lista.slice(0, KERDES_KORLAT)) {
        if (!(await teljesE(x.k))) continue;
        const { fa } = await reszfa(x.k);
        const gyoker = await reszfaGyokere(fa);
        const fejlec = gyoker.d > 0 && gyoker.l !== x.gy ? { gyoker } : null;
        const lezarasok = [];
        for (const e of (await lezarasiEsemenyek(x.k))) {
          if (lezarasok.length >= LEZARAS_VALASZ_KORLAT) break;
          if (!(e.adat?.lezaras > (Number.isSafeInteger(x.mikor) ? x.mikor : 0))) continue;
          const j = await esemenyOlvas(e.adat.javaslat);
          if (j) lezarasok.push({ esemeny: e, javaslat: j });
        }
        if (fejlec || lezarasok.length) ki.push({ k: x.k, fejlec, lezarasok });
      }
      return ki;
    },

    /** A minták. ⛔ Lezárási összegzésre csak akkor, ha a SAJÁT bemenetemből bájtra ugyanez jön ki. */
    async mintak(kerdesek) {
      const ki = { szelet: {}, lezaras: {} };
      for (const [k, helyek] of Object.entries(kerdesek?.szelet ?? {}).slice(0, KERDES_KORLAT)) {
        if (!(await teljesE(k))) continue;
        const { fa, allapot } = await reszfa(k);
        const mintak = await fejlecMintai(fa, helyek);
        const esemenyek = [];
        for (const m of mintak) {
          if (!m.kulcs.startsWith('p:')) continue;
          const az = allapot.pontEsemenyek?.get(m.kulcs.slice(2) + '|' + k);
          const e = az ? await esemenyOlvas(az) : null;
          if (e) esemenyek.push(e);
        }
        ki.szelet[k] = { mintak, esemenyek };
      }
      for (const [az, helyek] of Object.entries(kerdesek?.lezaras ?? {}).slice(0, KERDES_KORLAT)) {
        const e = await esemenyOlvas(az);
        if (e?.tipus !== LEZARASI_OSSZEGZES) continue;
        let epito = epitoGyorsitotar.get(az);
        if (!epito) {
          const j = await esemenyOlvas(e.adat.javaslat);
          if (!j) continue;
          const { szamitok } = await kep();
          const r = await lezarasiOsszegzesEpitese(szamitok, j, e.adat.entitas);
          if (!r || !azonosKanonikus(r.osszegzes, e.adat)) continue;
          epito = r.epito;
          epitoGyorsitotar.set(az, epito);
        }
        ki.lezaras[az] = await lezarasiMintakValasza(epito, helyek, esemenyOlvas);
      }
      return ki;
    }
  };
}

// ===================================
// A KÜLDŐ ÉS A FOGADÓ (D95/3)
// ===================================
//
// Ahol saját eseményem van, de a szeletet nem egyeztetem halmazként (nem vállalom — a meghívás a meghívott szeletében, a
// tanúsítás, az ellentmondás-bejelentés, a visszavont pontom —, vagy csak összegezve tartom), ott csak a SAJÁTJAIMAT
// ajánlom fel, és onnan semmit nem kérek. ⭐ A KÉZBESÍTÉS: amit egy tartó (aki a szeletet egészében tartja) átvett, vagy
// már megvolt nála, azt többé nem ajánlom fel (helyi jegyzék — `fajlTar.js` `kezbesitesTarolo`) — így a felajánlás csak
// az új eseményeimre utazik, a „nincs újdonság” csere nem drágul. ⚠️ Egy tartó elég: a tartók egymás közt egyeztetnek, és
// a saját eseményemet én magam is megtartom és kiszolgálom (D86/2). Ami `KULDES_ELETTARTAM`-nál régebbi, azt nem ajánlom
// fel (a kérelem útján továbbra is elérhető) — különben egy soha nem kézbesíthető esemény örökké utazna.

/** A saját eseményeimet ennyi ideig ajánlom fel (a keletkezésüktől). */
export const KULDES_ELETTARTAM = 14 * 24 * 3600 * 1000;
/** A fogadó egy körben legfeljebb ennyit kér és ennyiről mondja, hogy megvan. */
const FOGADO_KORLAT = 256;

/**
 * @param {Object} b
 * @param {Object} b.tar
 * @param {string} b.koino
 * @param {string} b.szerzo - én
 * @param {Function} b.halmazkent - async (szelet) → igaz, ha a szeletet halmazként egyeztetem (ott nem kell felajánlani)
 * @param {Function} [b.kezbesitett] - async () → Set: a már kézbesített saját eseményeim azonosítói
 * @param {Function} [b.kulcsai] - (esemény) → mely kulcsok alatt ajánlható fel (alapból a szelete; D95/4: a legfelső szintű
 *   születés a gyökér-darabja alatt is)
 * @param {Function} [b.most]
 */
export function sajatKuldo({ tar, koino, szerzo, halmazkent, kezbesitett = async () => new Set(),
  kulcsai = (e) => [e.entitas ?? e.azonosito], most = () => Date.now() }) {
  return {
    /**
     * A CIMEK `kul` listája: szeletenként a még nem kézbesített, friss saját eseményeim azonosítói (a legújabb szeletek
     * előbb, szeletenként a legutóbbiak).
     * @param {Function} [szabad] - (szelet) → igaz, ha ennek a társnak felajánlható
     */
    async lista(szabad = () => true) {
      const kesz = await kezbesitett();
      const hatar = most() - KULDES_ELETTARTAM;
      const sajat = (await tar.szerzoLanca(szerzo))
        .filter((e) => e.koino === koino && !kesz.has(e.azonosito) && Number.isSafeInteger(e.ido) && e.ido >= hatar)
        .sort((a, b) => b.sorszam - a.sorszam);
      const szeletenkent = new Map();       // szelet → a felajánlott azonosítók
      const kihagyott = new Set();
      for (const e of sajat) {
        for (const k of kulcsai(e)) {
          if (kihagyott.has(k)) continue;
          let l = szeletenkent.get(k);
          if (!l) {
            if (szeletenkent.size >= KERDES_KORLAT || !szabad(k) || await halmazkent(k)) { kihagyott.add(k); continue; }
            l = [];
            szeletenkent.set(k, l);
          }
          if (l.length < SAJAT_KORLAT) l.push(e.azonosito);
        }
      }
      return [...szeletenkent].filter(([, l]) => l.length).map(([k, l]) => ({ k, sajat: l.reverse() }));
    }
  };
}

/**
 * @param {Object} b
 * @param {Object} b.tar
 * @param {Function} b.fogadhato - async (szelet) → átveszem-e (a szeletet egészében tartom)
 */
export function kuldoFogado({ tar, fogadhato }) {
  return {
    /**
     * A társ felajánlott saját eseményeiből — csak abból a szeletből, amit egészében tartok — a nálam hiányzókat kérem, és
     * megmondom, melyik van már meg (a társ így tudja, hogy kézbesült).
     * @returns {Promise<{kerem: Array<string>, megvan: Array<string>}>}
     */
    async kerem(oveKul) {
      const kerem = [], megvan = [];
      for (const x of oveKul.slice(0, KERDES_KORLAT)) {
        if (!(await fogadhato(x.k))) continue;
        for (const az of (Array.isArray(x.sajat) ? x.sajat : []).slice(0, SAJAT_KORLAT)) {
          if (typeof az !== 'string') continue;
          if (await tar.esemeny(az)) { if (megvan.length < FOGADO_KORLAT) megvan.push(az); }
          else if (kerem.length < FOGADO_KORLAT) kerem.push(az);
        }
      }
      return { kerem, megvan };
    }
  };
}
