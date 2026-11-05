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
// ⭐⭐ ÉS A BELÉPÉS ÚTJA (M7 — a belépő megtalálása, Csaba, 2026-11-04: *„a meghívott felületén értesítse a meghívottat, hogy a
// készüléke, éppen próbálja fel venni az első kapcsolatot, és jelezhetné a probálkozásokat is.”*): amíg a belépő nem tag, a
// feljegyzés azt is mondja, hol tart az első kapcsolat — elfogadta a meghívót (`belepesKezdete` — a lap), bejelentkezett a
// hálózaton (`belepesJelentkezese` — az őrjárat címjegyzék-köre), hányszor kopogott a meghívó készülékére (`belepesKopogasa` —
// az őrjárat köre), megvan-e a kapcsolat (`belepesKapcsolata` — a munka), és tag lett-e (`belepesTagsaga` — a háztartás).
// A lap ebből rajzolja a sávját (`belepesKepe`); a szöveg a laptól függetlenül igaz — a lépéseket a program jegyzi.
//
// ⛔ Helyi feljegyzés, nem esemény: nem terjed, semmit nem dönt el (3. szabály); ha elvész vagy sérült, a lap annyit mond,
// hogy nem tudja. A mérete állandó (egy kör, egy csere, egy belépés) — a koinó méretétől nem függ (9. szabály).
//
// Hálózatot nem importál. Használja: `koino.js` (az őrjárat köre, a munka, a felület `/api/csere-allapot` útvonala).

/** Ha az őrjárat ennyivel a két ablaknyi idő után sem jelentkezett, nem fut (leállították, vagy a készülék alszik). */
export const ORJARAT_TARTALEK = 2 * 60 * 1000;

/** ⭐ M7: ha a belépő ennyi ideje keresi az első kapcsolatot, a lap egy segítő mondatot is mond (mi kell hozzá). */
export const BELEPES_SEGITSEG = 30 * 60 * 1000;
/** ⭐ M7: a „bent vagy” ennyi ideig látszik a lapon a tagság után (aztán a sáv eltűnik). */
export const BELEPES_KESZ_LATSZIK = 5 * 60 * 1000;
/** ⭐ M7: a lejárt (és tagsággal nem zárult) meghívó híre ennyi ideig látszik a lejárat után. */
export const BELEPES_LEJART_LATSZIK = 7 * 24 * 3600 * 1000;

/** Üres feljegyzés: még nem futott őrjárat, még nem volt csere, és nincs folyamatban belépés. */
export function uresCsereAllapot() {
  return { kor: null, csere: null, belepes: null };
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
      uj: darab(k.uj),
      kulso: kulsoCim(k.kulso)
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
  const b = nyers?.belepes;
  if (b && typeof b === 'object' && !Array.isArray(b) && idopont(b.elfogadva)) {
    const j = b.jelentkezes;
    a.belepes = {
      elfogadva: b.elfogadva,
      lejar: idopont(b.lejar),
      jelentkezes: j && typeof j === 'object' && !Array.isArray(j) && idopont(j.ido)
        ? { ido: j.ido, gepek: darab(j.gepek) ?? 0, kovetkezo: idopont(j.kovetkezo) } : null,
      kopogas: darab(b.kopogas) ?? 0,
      utolsoKopogas: idopont(b.utolsoKopogas),
      kapcsolat: idopont(b.kapcsolat),
      tag: idopont(b.tag)
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
 * @param {{perc: number, port: number, kovetkezo: number, sikeres: number, celok: number, uj: number, kulso?: Object, most: number}} b
 */
export function korVege(a, { perc, port, kovetkezo, sikeres = 0, celok = 0, uj = 0, kulso = null, most }) {
  return { ...a, kor: { ...(a.kor ?? {}), perc, port, fut: false, vege: most, kovetkezo, frissitve: most, sikeres, celok, uj,
    kulso: kulsoCim(kulso) ?? a.kor?.kulso ?? null } };
}

/**
 * ⭐ D121: a készülék nyilvános (a tükör szerint mért) címe — a meghívó szövegébe kerül (MH6: a belépő ezen kopog vissza a
 * meghívóra). Helyi feljegyzés; null, ha nem ép.
 */
function kulsoCim(k) {
  return k && typeof k === 'object' && typeof k.cim === 'string' && /^[A-Za-z0-9.:%_-]{1,64}$/.test(k.cim)
    && Number.isInteger(k.port) && k.port > 0 && k.port < 65536 ? { cim: k.cim, port: k.port } : null;
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

// ===================================
// ⭐⭐ M7 — A BELÉPÉS ÚTJA (a belépő lapjának sávja)
// ===================================

/** Folyamatban van-e a belépés (elfogadott, még nem tag, és a meghívó nem járt le) — a lépések csak ilyenkor számítanak. */
function belepesFolyik(b, most) {
  return !!b && !b.tag && !(b.lejar && most > b.lejar);
}

/**
 * ⭐ M7: a belépő elfogadta a meghívót (a lap vagy a `csatlakoz` parancs) — a belépés útja innen indul. Egy új meghívó
 * elölről kezdi (a régi lépések nem az övéi).
 * @param {Object} a
 * @param {{elfogadva: number, lejar: number|null, tag?: number|null}} b - `tag`: ha a készülék már tag (a régebben elfogadott
 *   meghívónál — a lap így nem mond „bent vagy”-ot egy régi tagnak)
 */
export function belepesKezdete(a, { elfogadva, lejar = null, tag = null }) {
  return { ...a, belepes: { elfogadva, lejar: idopont(lejar), jelentkezes: null, kopogas: 0, utolsoKopogas: null, kapcsolat: null,
    tag: idopont(tag) } };
}

/**
 * ⭐ M7: a belépő bejelentkezett a hálózaton (az őrjárat címjegyzék-köre a meghívó készülék-témáján jelentkezett): mikor, hány
 * gép tárolta, és mikor jön a következő.
 * @param {Object} a
 * @param {{gepek: number, kovetkezo: number|null, most: number}} b
 */
export function belepesJelentkezese(a, { gepek = 0, kovetkezo = null, most }) {
  if (!belepesFolyik(a.belepes, most)) return a;
  return { ...a, belepes: { ...a.belepes, jelentkezes: { ido: most, gepek: darab(gepek) ?? 0, kovetkezo: idopont(kovetkezo) } } };
}

/**
 * ⭐ M7: egy kör kopogott (volt célja — a belépőnél a meghívó címei a meghívóból), és a kapcsolat még nincs meg: egy próbálkozás.
 * @param {Object} a
 * @param {{celok: number, most: number}} b
 */
export function belepesKopogasa(a, { celok = 0, most }) {
  const b = a.belepes;
  if (!belepesFolyik(b, most) || b.kapcsolat || !(celok > 0)) return a;
  return { ...a, belepes: { ...b, kopogas: b.kopogas + 1, utolsoKopogas: most } };
}

/** ⭐ M7: megvan a kapcsolat a meghívó készülékével (az első — a későbbiek nem írják felül). */
export function belepesKapcsolata(a, { most }) {
  const b = a.belepes;
  if (!belepesFolyik(b, most) || b.kapcsolat) return a;
  return { ...a, belepes: { ...b, kapcsolat: most } };
}

/** ⭐ M7: a belépő tag lett (a meghívás megérkezett) — a belépés útja kész. Ha kapcsolat nem volt feljegyezve, ez az is. */
export function belepesTagsaga(a, { most }) {
  const b = a.belepes;
  if (!b || b.tag) return a;
  return { ...a, belepes: { ...b, tag: most, kapcsolat: b.kapcsolat ?? most } };
}

/**
 * ⭐ M7: a belépés képe a lapnak — null, ha nincs mit mutatni (nincs belépés, a „bent vagy” már régi, vagy a lejárt meghívó híre
 * elévült). Az `allapot` a legelőrébb tartó lépés: `tag` · `kapcsolat` · `kopog` · `jelentkezett` · `elfogadva` · `lejart`.
 * @param {Object|null} b - a feljegyzés `belepes` része
 * @param {number} most
 */
export function belepesKepe(b, most) {
  if (!b) return null;
  if (b.tag) {
    if (most - b.tag > BELEPES_KESZ_LATSZIK) return null;
  } else if (b.lejar && most > b.lejar && most - b.lejar > BELEPES_LEJART_LATSZIK) return null;
  const lejart = !b.tag && !!b.lejar && most > b.lejar;
  const allapot = b.tag ? 'tag' : lejart ? 'lejart' : b.kapcsolat ? 'kapcsolat' : b.kopogas > 0 ? 'kopog'
    : b.jelentkezes ? 'jelentkezett' : 'elfogadva';
  return {
    allapot,
    elfogadva: b.elfogadva,
    lejar: b.lejar,
    jelentkezes: b.jelentkezes ? { ...b.jelentkezes,
      // a „legközelebb” csak akkor igaz, ha még nem múlt el (különben az őrjárat nem fut, vagy a jelentkezés már nem él)
      kovetkezo: b.jelentkezes.kovetkezo && b.jelentkezes.kovetkezo > most ? b.jelentkezes.kovetkezo : null } : null,
    kopogas: { szam: b.kopogas, utolso: b.utolsoKopogas },
    kapcsolat: b.kapcsolat,
    tag: b.tag,
    segitseg: !b.tag && !lejart && !b.kapcsolat && most - b.elfogadva >= BELEPES_SEGITSEG
  };
}

/**
 * ⭐ Amit a lap kap: fut-e az őrjárat (a feljegyzés frissessége a kör üteméből), köröz-e épp, mikor jön a következő
 * ablak, mi lett az utolsó körből és az utolsó cseréből, mikor hozott utoljára csere új eseményt, és (M7) hol tart a belépés.
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
    ujOsszes: a.csere?.ujOsszes ?? 0,
    // ⭐ M7: a belépés útja (null, ha nincs mit mutatni)
    belepes: belepesKepe(a.belepes ?? null, most)
  };
}
