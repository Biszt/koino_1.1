// koino/js/tar/iro.js

// Felelősség: AZ ÍRÓ (D70, 2026-09-26) — koinónként és készülékenként EGYETLEN folyamat fűz a tárhoz.
//
// ===== ⛔⛔ MIÉRT KELL =====
//
// Egy készüléken több folyamat ír ugyanabba a tárba: a futó őrjárat (a kapott eseményeket és a
// saját felszabadítását), a második ablak kézi parancsa, a felület. Mindegyik a SAJÁT
// mutatójából számolja a lánc végét — és ha kettő ugyanarra a sorszámra ír, az ELÁGAZÁS: az
// állapot-számítás az egyiket tartja meg (D19), a MÁSIK TETTÜNK CSENDBEN ELVÉSZ, és az
// ellentmondás mindenkinél látszik. Mérve (43. mérés után): húsz egyszerre induló kézi paranccsal
// a régi program háromból egyszer elágazott. A `frissit()` ezt ritkította — Csaba szerint az
// ideiglenes: *„szerkezeti tisztaság fontosabb, mint a munka spórolás."*
//
// ===== ⭐ A SZERKEZET =====
//
// ⭐ EGY FOLYAMAT FŰZ A FÁJLHOZ: AZ ÍRÓ. Aki nem író, az a kész, aláírt eseményt ÁTADJA neki egy
// csak a gépen belül élő csatornán, és az író a SAJÁT kapuján (`esemenyMentese`, 3. szabály)
// engedi be. *A lánc vége így egyetlen helyen dől el: ott, ahol a lánc készül.*
//
// ⭐⭐ A CSATORNA MAGA A ZÁR. Egy név alatt egyszerre csak egy folyamat hallgathat (mérve,
// Windows: a második `EADDRINUSE`-t kap), és a folyamat halálával a név felszabadul. Nincs
// előre kinevezett író és nincs külön jelzőfájl: **az író az, aki a csatornán hallgat.** Aki írni
// akar, előbb kopog; ha senki nem felel, ő lesz az író.
//
// ⚠️ WINDOWSON a névvel ellátott cső (`\\.\pipe\…`) a halállal el is tűnik. MÁSHOL (Android,
// Linux) fájl-foglalat: egy összeomlás után a fájl ott marad — a következő író eltakarítja. ⛔ Ott
// ezért az író MINDEN hozzáfűzés előtt megnézi, hogy a csatorna tényleg ŐT éri-e el (egy
// eltakarított, „árva" író különben másodikként írna); ha nem, lemond, és kliens lesz.
//
// ⭐ AZ ÍRÓ NEM ÍR ALÁ SENKI HELYETT. Csak kész, aláírt eseményt fogad, és ugyanazon a kapun
// engedi át, mint a hálózatról érkezőt — ezért a csatornához nem kell jelszó: aki rajta beszél,
// ugyanannyit tehet, mint egy társ a hálózaton (3. szabály).
//
// ⛔⛔ AZ ÍRÓ SORBAN DOLGOZIK. A „lánc végére kerül-e?" ellenőrzés és a hozzáfűzés egy lépés: két
// kérés közé nem férhet be egy harmadik. A SAJÁT új eseményt (`ujSajat`) csak a lánc végére
// engedi; ha a küldő elavult lánc-végből számolt, a válasz „ELAVULT", és a küldő frissít, újra
// aláír, újra küld (`muveletek.js`). *Elágazás így nem ritka lesz, hanem lehetetlen.*
//
// ⚠️ AMIT NEM CSINÁL: nem olvas helyettünk (mindenki a saját mutatójából olvas, `frissit()`-tel),
// és nem vonatkozik két készülékre ugyanazzal a kulccsal (D19 — az a hálózat dolga).
//
// Használja: koino.js (a fő tár és a felület koinónkénti tárai).

import { createServer, connect } from 'node:net';
import { createHash, randomBytes } from 'node:crypto';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { rm } from 'node:fs/promises';

import { esemenyMentese, lancVege } from './esemenyTar.js';

// Egy kérés legfeljebb ennyi ideig vár az íróra. ⚠️ Az író sorban dolgozik: egy nagy csere
// közben a kérés sorra vár — ezért nem pár ezredmásodperc.
const KERES_IDO = 15000;

// ⭐ Az önellenőrzés rövid: a saját csatornánk felel rá, sor nélkül.
const ONELLENORZES_IDO = 2000;

// Ennyiszer próbáljuk elérni az írót vagy átvenni a szerepét, mielőtt feladjuk. ⚠️ Nem a
// verseny szokásos esete (az egy-két kör): ez a végső szelep, hogy semmi ne várjon örökre.
const PROBAK = 50;

// Egy kérés felső mérete — egy esemény néhány száz bájt, egy nagy gondolat pár tíz KB. ⛔ A
// csatornán bárki beszélhet a gépen: korlát nélkül egy kérés megtölthetné a memóriát.
const KERES_KORLAT = 4 * 1024 * 1024;

/**
 * A csatorna címe — a tár mappájából, determinisztikusan: minden folyamat ugyanazt számolja.
 *
 * ⚠️ Fájl-foglalatnál a rövid út számít (a rendszer ~100 bájtnál levágja), ezért nem a koinó
 * mappájában él, hanem az ideiglenes mappában, a mappa lenyomatával.
 *
 * @param {string} mappa - a koinó tárának mappája
 * @returns {string}
 */
export function csatornaCime(mappa) {
  const teljes = resolve(mappa);
  const nyom = createHash('sha256')
    .update(process.platform === 'win32' ? teljes.toLowerCase() : teljes)
    .digest('hex').slice(0, 24);
  if (process.platform === 'win32') return '\\\\.\\pipe\\koino-iro-' + nyom;
  return join(tmpdir(), 'koino-iro-' + nyom + '.sock');
}

/** Hiba, amit a hívó a kódja alapján kezel (`ELAVULT`, `ELUTASITVA`, `NEM-IRO`). */
function kodosHiba(kod, uzenet) {
  const hiba = new Error(uzenet);
  hiba.kod = kod;
  return hiba;
}

/**
 * Egy kérés az írónak: egy JSON-sor oda, egy JSON-sor vissza, aztán a kapcsolat zárul.
 *
 * ⭐ `setEncoding('utf8')`: a darabhatárra eső ékezet így nem törik ketté (a 2026-09-26-i
 * átnézés `kapu.js`-leckéje).
 */
function kerdez(cim, uzenet, ido = KERES_IDO) {
  return new Promise((kesz, hiba) => {
    const k = connect(cim);
    let puffer = '';
    let vege = false;
    const befejez = (fn, ertek) => {
      if (vege) return;
      vege = true;
      clearTimeout(ora);
      k.destroy();
      fn(ertek);
    };
    const ora = setTimeout(() => befejez(hiba,
      kodosHiba('IDOTULLEPES', 'az író nem felelt ' + ido + ' ms alatt')), ido);
    k.setEncoding('utf8');
    k.on('connect', () => k.write(JSON.stringify(uzenet) + '\n'));
    k.on('data', (darab) => {
      puffer += darab;
      const sorVege = puffer.indexOf('\n');
      if (sorVege < 0) return;
      try {
        befejez(kesz, JSON.parse(puffer.slice(0, sorVege)));
      } catch (h) {
        befejez(hiba, h);
      }
    });
    k.on('error', (h) => befejez(hiba, h));
    k.on('close', () => befejez(hiba, kodosHiba('LEZARVA', 'az író válasz nélkül zárt')));
  });
}

/** Ezek a hibák azt jelentik: most senki nem hallgat a csatornán (vagy épp meghalt). */
const nincsIroHiba = (h) => ['ENOENT', 'ECONNREFUSED', 'ECONNRESET', 'EPIPE', 'LEZARVA']
  .includes(h?.code ?? h?.kod);

const varj = (ms) => new Promise((kesz) => setTimeout(kesz, ms));

/**
 * A tárat az író-szerep mögé teszi.
 *
 * Az olvasó műveletek változatlanul a belső tárhoz mennek; a `hozzafuz()` viszont az íróhoz:
 * ha mi vagyunk az, sorban, ellenőrizve fűzünk; ha más, neki adjuk át; ha senki, mi leszünk.
 *
 * @param {Object} belso - a `fajlTar.esemenyTarNyitasa` tára
 * @param {Object} beallitas
 * @param {string} beallitas.mappa - a koinó tárának mappája (ebből lesz a csatorna címe)
 * @param {Function} [beallitas.jelez] - események a naplónak (D19)
 * @returns {Object} a tár, ugyanazzal a felülettel — plusz `iroE()` és `zar()`
 */
export function iroTarNyitasa(belso, { mappa, jelez = () => {} }) {
  const cim = csatornaCime(mappa);
  // ⭐ Az önellenőrzés jele: ezzel ismerjük fel, hogy a csatornán MI felelünk.
  const jel = randomBytes(12).toString('base64url');
  // Windowson a cső kizárólagos, tehát az önellenőrzés ott fölösleges kör.
  const onellenorzesKell = process.platform !== 'win32';

  let szerver = null;
  let iroVagyok = false;

  // ===== AZ ÍRÓ SORA: egyszerre egy hozzáfűzés =====
  let sor = Promise.resolve();
  const sorban = (munka) => {
    const eredmeny = sor.then(munka, munka);
    sor = eredmeny.catch(() => {});
    return eredmeny;
  };

  /** Tényleg minket ér el a csatorna? (Egy eltakarított, árva író itt veszi észre magát.) */
  async function onmagamE() {
    try {
      return (await kerdez(cim, { ki: true }, ONELLENORZES_IDO)).ki === jel;
    } catch {
      return false;
    }
  }

  function lemond(ok) {
    if (!iroVagyok && !szerver) return;
    iroVagyok = false;
    try { szerver?.close(); } catch { /* már zárva */ }
    szerver = null;
    jelez({ mi: 'IRO-LEMONDOTT', ok });
  }

  /**
   * ⛔⛔ AZ ÍRÓ HOZZÁFŰZÉSE — sorban, és a lánc végén.
   *
   * @param {Object} esemeny
   * @param {{ujSajat: boolean}} beallitas
   */
  function iroiHozzafuzes(esemeny, { ujSajat }) {
    return sorban(async () => {
      if (onellenorzesKell && !(await onmagamE())) {
        lemond('a csatornán már nem mi felelünk');
        throw kodosHiba('NEM-IRO', 'már nem mi vagyunk az író');
      }
      // Két kérés ugyanazzal az eseménnyel (pl. egy újraküldés) — a második semmit nem tesz.
      if (await belso.esemeny(esemeny.azonosito)) return;

      if (ujSajat) {
        // ⭐ A SAJÁT ÚJ ESEMÉNY CSAK A LÁNC VÉGÉRE: ez zárja ki az elágazást.
        const veg = await lancVege(belso, esemeny.szerzo);
        if (esemeny.sorszam !== veg.sorszam || (esemeny.elozo ?? null) !== veg.elozo) {
          throw kodosHiba('ELAVULT', 'elavult lánc-vég (a ' + esemeny.sorszam
            + '. helyre szánt esemény — a lánc vége most a ' + veg.sorszam + '. hely)');
        }
      }
      await belso.hozzafuz(esemeny);
    });
  }

  // ===== A CSATORNA (csak ha mi vagyunk az író) =====

  /** Egy kérés kiszolgálása. ⚠️ A `ki` kérdés NEM megy a sorba — az önellenőrzés a sorból jön. */
  async function kiszolgal(keres) {
    if (keres?.ki) return { ki: jel };
    if (keres?.mentsd && typeof keres.mentsd === 'object') {
      // ⭐ UGYANAZ A KAPU, mint a hálózatról érkezőé (3. szabály) — a hozzáfűzés pedig a sorban.
      const eredmeny = await esemenyMentese(tar, keres.mentsd, { ujSajat: keres.ujSajat === true });
      return { mentve: eredmeny.mentve, ok: eredmeny.ok, marMegvolt: eredmeny.marMegvolt,
        elagazas: Boolean(eredmeny.elagazas) };
    }
    return { mentve: false, ok: 'ismeretlen kérés' };
  }

  function szerverInditas() {
    return new Promise((kesz, hiba) => {
      const s = createServer((k) => {
        k.setEncoding('utf8');
        let puffer = '';
        let megvan = false;
        k.on('data', async (darab) => {
          if (megvan) return;
          puffer += darab;
          if (puffer.length > KERES_KORLAT) { megvan = true; k.destroy(); return; }
          const sorVege = puffer.indexOf('\n');
          if (sorVege < 0) return;
          megvan = true;
          let valasz;
          try {
            valasz = await kiszolgal(JSON.parse(puffer.slice(0, sorVege)));
          } catch (h) {
            valasz = { mentve: false, ok: h.message, elavult: h.kod === 'ELAVULT',
              nemIro: h.kod === 'NEM-IRO' };
          }
          k.end(JSON.stringify(valasz) + '\n');
        });
        k.on('error', () => { /* a kliens eltűnt — nincs kinek felelni */ });
      });
      s.once('error', hiba);
      s.listen(cim, () => {
        s.off('error', hiba);
        s.on('error', (h) => jelez({ mi: 'IRO-CSATORNA-HIBA', ok: h.message }));
        // ⛔ A CSATORNA NEM TARTJA ÉLETBEN A FOLYAMATOT (mérve: enélkül a kézi parancs, ha író
        // lett, soha nem lépett ki). Amíg a folyamat másért él — egy őrjárat, egy felület —,
        // kiszolgál; a kézi parancs a munkája végén kilép, és a név felszabadul.
        s.unref();
        kesz(s);
      });
    });
  }

  /**
   * Megpróbáljuk átvenni az író-szerepet. Csak akkor hívjuk, ha a csatornán senki nem felelt.
   * @returns {Promise<boolean>} igaz, ha mostantól mi vagyunk az író
   */
  async function szerepetVallal() {
    // ⚠️ Fájl-foglalatnál egy összeomlott író fájlja ott maradhat — senki nem hallgat rajta
    // (épp ezért jutottunk ide). Ha közben mégis valaki elindult, az önellenőrzése észreveszi.
    if (process.platform !== 'win32') await rm(cim, { force: true }).catch(() => {});
    try {
      szerver = await szerverInditas();
    } catch (h) {
      if (['EADDRINUSE', 'EACCES'].includes(h.code)) return false;   // valaki megelőzött
      throw h;
    }
    if (onellenorzesKell && !(await onmagamE())) {
      lemond('az átvétel után sem minket ért el a csatorna');
      return false;
    }
    iroVagyok = true;
    // ⭐ Amit az előző író írt, azt most látjuk utoljára „kívülről" — innentől csak mi írunk.
    await belso.frissit?.();
    jelez({ mi: 'IRO-LETTEM', cim });
    return true;
  }

  // ===== A TÁR — ugyanaz a felület, az írás az íróhoz megy =====

  const tar = {
    fajl: belso.fajl,
    betolt: () => belso.betolt(),
    esemeny: (azonosito) => belso.esemeny(azonosito),
    szerzoLanca: (szerzo) => belso.szerzoLanca(szerzo),
    szeletEsemenyei: (entitas) => belso.szeletEsemenyei(entitas),
    sorszamSzerint: (szerzo, sorszam) => belso.sorszamSzerint(szerzo, sorszam),
    frissit: () => belso.frissit?.() ?? 0,

    /**
     * Egy esemény a tárba — az írón át.
     *
     * @param {Object} esemeny
     * @param {{ujSajat?: boolean}} [beallitas] - `ujSajat`: a saját, most aláírt esemény —
     *   csak a lánc végére kerülhet (különben `ELAVULT` hiba, és a hívó újra próbál)
     */
    async hozzafuz(esemeny, beallitas = {}) {
      const ujSajat = beallitas.ujSajat === true;
      for (let proba = 0; proba < PROBAK; proba++) {
        if (iroVagyok) {
          try {
            return await iroiHozzafuzes(esemeny, { ujSajat });
          } catch (h) {
            if (h.kod !== 'NEM-IRO') throw h;   // lemondtunk: tovább a kliens útra
          }
        }

        let valasz;
        try {
          valasz = await kerdez(cim, { mentsd: esemeny, ujSajat });
        } catch (h) {
          if (!nincsIroHiba(h) && h.kod !== 'IDOTULLEPES') throw h;
          if (nincsIroHiba(h) && await szerepetVallal()) continue;   // mostantól mi írunk
          await varj(10 + proba * 10);
          continue;
        }

        if (valasz.nemIro) { await varj(10 + proba * 10); continue; }   // az író épp lemondott
        // ⭐ A saját eseményünk így a MI mutatónkba is bekerül — a következő lépés már látja.
        await belso.frissit?.();
        if (valasz.mentve) return;
        throw kodosHiba(valasz.elavult ? 'ELAVULT' : 'ELUTASITVA',
          'az író nem mentette: ' + valasz.ok);
      }
      throw new Error('az író nem érhető el, és a szerepét sem tudtuk átvenni ('
        + PROBAK + ' próba)');
    },

    /** Mi vagyunk-e most az író? (A naplónak és a próbáknak.) */
    iroE: () => iroVagyok,

    /**
     * ⭐ A HOSSZAN FUTÓ FOLYAMAT INDULÁSKOR JELENTKEZIK (őrjárat, `figyel`, felület — D70 / 3.):
     * ha most senki nem író, ő lesz, és a futása végéig az marad. Ha már van élő író (pl. egy
     * korábban indított felület), kliens marad — ez nem hiba, a szerep annál van, akinél van.
     *
     * @returns {Promise<boolean>} igaz, ha mostantól mi vagyunk az író
     */
    async iroLeszek() {
      if (iroVagyok) return true;
      try {
        await kerdez(cim, { ki: true }, ONELLENORZES_IDO);
        return false;                               // valaki felelt: ő az író
      } catch (h) {
        if (!nincsIroHiba(h)) return false;          // lassú, de élő író — maradunk kliens
      }
      return szerepetVallal();
    },

    /** A csatorna címe (a próbáknak). */
    csatorna: cim,

    /** Lemond az író-szerepről (a futás végén; a próbák között). */
    async zar() {
      await sor.catch(() => {});
      lemond('zárás');
    }
  };

  return tar;
}
