// koino/js/csere/csereAllapot.js

// Felelősség: ⭐ A CSERE ÁLLAPOTA A LAPNAK — mikor cserélt utoljára a készülék, hozott-e újat, és mikor jön a következő kör.
//
// A lap alsó sávja ebből mondja ki a csere idejét, és ebből tudja, hogy újra kell-e rajzolnia: ha egy csere új eseményt
// hozott, a pakli csendben frissül (Csaba, 2026-10-15). ⚠️ A cserét nem a felület végzi, hanem az őrjárat — egy MÁSIK
// folyamat (D100: ami hosszan fut, azt egy másik hosszan futó folyamat látja). Ezért egy helyi feljegyzés köti össze őket
// (`<koino>/csere.json`, `fajlTar.js` `csereAllapotTarolo`):
//   · az ŐRJÁRAT a kör elején és végén beírja, hogy köröz-e épp, mikor jön a következő ablak, és mi lett a körből;
//   · a MUNKA (bármelyik folyamatban — az őrjárat, a postaláda, egy kézi csere) a sikeres csere után beírja az idejét és
//     a hozamát — a bekopogó társ cseréjét is, ami nem a mi körünkben történt.
//
// ⛔ Helyi feljegyzés, nem esemény: nem terjed, semmit nem dönt el (3. szabály); ha elvész vagy sérült, a lap annyit mond,
// hogy nem tudja. A mérete állandó (egy kör és egy csere) — a koinó méretétől nem függ (9. szabály).
//
// Hálózatot nem importál. Használja: `koino.js` (az őrjárat köre, a munka, a felület `/api/csere-allapot` útvonala).

/** Ha az őrjárat ennyivel a két ablaknyi idő után sem jelentkezett, nem fut (leállították, vagy a készülék alszik). */
export const ORJARAT_TARTALEK = 2 * 60 * 1000;

/** Üres feljegyzés: még nem futott őrjárat, és még nem volt csere. */
export function uresCsereAllapot() {
  return { kor: null, csere: null };
}

const idopont = (x) => (Number.isFinite(x) && x > 0 ? x : null);
const darab = (x) => (Number.isInteger(x) && x >= 0 ? x : null);

/**
 * A beolvasott feljegyzés ellenőrzött alakja — ami nem illik, az kiesik (egy sérült fájl nem törheti el a lapot).
 * @param {*} nyers
 * @returns {{kor: Object|null, csere: Object|null}}
 */
export function csereAllapotAlakja(nyers) {
  const a = uresCsereAllapot();
  const k = nyers?.kor;
  if (k && typeof k === 'object' && !Array.isArray(k)) {
    a.kor = {
      perc: Number.isFinite(k.perc) && k.perc > 0 ? k.perc : null,
      port: Number.isInteger(k.port) && k.port > 0 && k.port < 65536 ? k.port : null,
      fut: k.fut === true,
      kezdet: idopont(k.kezdet),
      vege: idopont(k.vege),
      kovetkezo: idopont(k.kovetkezo),
      frissitve: idopont(k.frissitve),
      sikeres: darab(k.sikeres),
      celok: darab(k.celok),
      uj: darab(k.uj)
    };
  }
  const c = nyers?.csere;
  if (c && typeof c === 'object' && !Array.isArray(c) && idopont(c.ido)) {
    a.csere = {
      ido: c.ido,
      uj: darab(c.uj) ?? 0,
      kuldott: darab(c.kuldott) ?? 0,
      ujIdo: idopont(c.ujIdo),
      ujOsszes: darab(c.ujOsszes) ?? 0
    };
  }
  return a;
}

/**
 * Az őrjárat kört kezd (a kopogás előtt).
 * @param {Object} a - a mostani feljegyzés
 * @param {{perc: number, port: number, most: number}} b
 */
export function korKezdete(a, { perc, port, most }) {
  return { ...a, kor: { ...(a.kor ?? {}), perc, port, fut: true, kezdet: most, frissitve: most } };
}

/**
 * Az őrjárat kört zárt (az alvás előtt): a kör eredménye és a következő ablak.
 * @param {Object} a
 * @param {{perc: number, port: number, kovetkezo: number, sikeres: number, celok: number, uj: number, most: number}} b
 */
export function korVege(a, { perc, port, kovetkezo, sikeres = 0, celok = 0, uj = 0, most }) {
  return { ...a, kor: { ...(a.kor ?? {}), perc, port, fut: false, vege: most, kovetkezo, frissitve: most, sikeres, celok, uj } };
}

/**
 * Egy sikeres csere (bármelyik irányból). Az `ujIdo` csak akkor lép, ha a csere új eseményt hozott — a lap ebből tudja,
 * hogy van-e mit újrarajzolnia.
 * @param {Object} a
 * @param {{uj: number, kuldott: number, most: number}} b
 */
export function csereFeljegyzese(a, { uj = 0, kuldott = 0, most }) {
  const regi = a.csere ?? { ujIdo: null, ujOsszes: 0 };
  return {
    ...a,
    csere: {
      ido: most,
      uj,
      kuldott,
      ujIdo: uj > 0 ? most : regi.ujIdo ?? null,
      ujOsszes: (regi.ujOsszes ?? 0) + (uj > 0 ? uj : 0)
    }
  };
}

/**
 * ⭐ Amit a lap kap: fut-e az őrjárat (a feljegyzés frissessége a kör üteméből), köröz-e épp, mikor jön a következő
 * ablak, mi lett az utolsó körből és az utolsó cseréből, és mikor hozott utoljára csere új eseményt.
 * @param {Object} a - a feljegyzés (`csereAllapotAlakja`)
 * @param {number} most
 */
export function csereAllapotKepe(a, most) {
  const k = a.kor;
  let orjarat = { fut: false, korFut: false, perc: null, kovetkezo: null, utolsoJel: null, utolsoKor: null };
  if (k?.frissitve && k.perc) {
    // A kör maga is eltarthat egy ablaknyit (a menetek az ablak végéig mehetnek), utána a tábla és a címjegyzék —
    // két ablak és a tartalék után biztosan nem fut.
    const fut = most - k.frissitve <= 2 * k.perc * 60 * 1000 + ORJARAT_TARTALEK;
    orjarat = {
      fut,
      korFut: fut && k.fut,
      perc: k.perc,
      kovetkezo: fut && !k.fut ? k.kovetkezo : null,
      utolsoJel: k.frissitve,
      utolsoKor: k.vege ? { ido: k.vege, sikeres: k.sikeres ?? 0, celok: k.celok ?? 0, uj: k.uj ?? 0 } : null
    };
  }
  return {
    orjarat,
    utolsoCsere: a.csere ? { ido: a.csere.ido, uj: a.csere.uj, kuldott: a.csere.kuldott } : null,
    utolsoUj: a.csere?.ujIdo ?? null,
    ujOsszes: a.csere?.ujOsszes ?? 0
  };
}
