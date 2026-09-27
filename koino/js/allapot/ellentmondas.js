// koino/js/allapot/ellentmondas.js

// Felelősség: AZ ELLENTMONDÁS BIZONYÍTÉKA (D79, D80 — az A pillér 3. lépésének helyi fele): a szerző
// SAJÁT aláírt állításai, amelyek ellentmondanak egymásnak — önmagát igazoló alakban.
//
// ===== ⭐ MIT BIZONYÍT, ÉS MIBŐL =====
//
// A D78 óta minden új esemény `lancGyoker`-e a szerző ESEMÉNY ELŐTTI két gyökere, és (D81) a
// pont-esemény magával hozza az entitása régi értékének bizonyítékát. ⭐ A bizonyíték tehát szinte
// csak a szerző SAJÁT aláírt eseményeiből áll — a bejelentő semmit nem tesz hozzá, amit el kellene
// hinni (egyedül a negatív levél bizonyítékát, a teljes listából — az is a gyökérhez köt). Három fajta
// (mind a kiosztásról — a keret, D79):
//
//   · BEMONDÁS — egy pont-esemény bemondott összege (`kiosztva`) nem jön ki a saját aláírt előző
//     állapotából (a gyökér összege − az entitás régi értéke + az új pont);
//   · FOLYTONOSSÁG — a pont-esemény utáni helyes állapot (a SZERZŐ SAJÁT szabálya szerint: amit
//     elvet, az nem változtat) nem az, amit a közvetlenül következő eseménye aláírt;
//   · NEGATÍV LEVÉL — az aláírt kiosztás-fában egy nem pozitív levél (a D78 pontosítása: az útba eső
//     ellenőrzés ezt nem látja, a teljes lista igen — és a lista egy levele már bizonyíték).
//
// ⭐ A VÁDPONT: a sorszám, ahonnan a szerző pont-eseményei nem számítanak (D79): a hazug pont-esemény,
// a hamis gyökeret aláíró következő esemény, illetve a negatív levelet elkötő esemény.
//
// ⛔⛔ A LEGFONTOSABB GARANCIA: BECSÜLETES LÁNCRA NEM ÁLLÍTHATÓ ÖSSZE VÁD. Ehhez a bizonyíték ugyanazt
// az ítéletet használja, amivel a szerző a saját gyökerét számolja (`pontEsemenyMerlege`, a
// `lancGyoker.js` állás-lépése) — ha a kettő akár egy ponton eltérne, egy becsületes szerzőt is el
// lehetne ítélni. Próba őrzi: becsületes láncon egyetlen vád sem megy át az ellenőrzésen.
//
// ⚠️ A kettős lánc (napló-alapú) bizonyítéka NINCS itt: az elágazás ma szándékosan nem büntet (D80).
//
// Használják: tar/esemenyTar.js (a kapu: az `Ellentmondas` esemény tartalma), a próbák; (a hálózati
// részben) az automatikus ellenőrző, ami a szerzőtől kapott előképből építi a bizonyítékot.

import { esemenyEllenorzese, lancElokepAlakja } from '../esemeny/esemeny.js';
import {
  allapotBizonyitekEllenorzese, allapotValtozasa, osszegzesAlakja
} from '../esemeny/osszegzoFa.js';
import { KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ } from './lancGyoker.js';
import { pontEsemenyMerlege } from './szabalyok.js';

export const ELLENTMONDAS_FAJTAK = Object.freeze(['bemondas', 'folytonossag', 'negativ']);

const nem = (ok) => ({ rendben: false, ok });

// ===================================
// AZ ÉPÍTŐKÖVEK
// ===================================

/** A szerző egy aláírt eseménye — ép-e, az övé-e, ebből a koinóból-e? */
async function szerzoEsemenye(e, kit, koino) {
  if (!e || typeof e !== 'object' || e.szerzo !== kit || e.koino !== koino) return false;
  return (await esemenyEllenorzese(e)).rendben === true;
}

/**
 * Az esemény ELŐKÉPE — a saját, aláírt lánc-gyökere (D81: maga a két gyökér), ha jól formált.
 *
 * ⛔⛔ AZ ELŐKÉP SZÁMAI CSAK A GYÖKÉRHEZ ILLŐ BIZONYÍTÉK UTÁN SZÁMÍTANAK. Az összeget (`o`) sehol nem
 * használjuk úgy, hogy egy bizonyíték előbb ne illesztette volna a gyökérhez (`pontHatasa`), két
 * gyökér egyezését pedig a lenyomatuk dönti el. *(2026-09-27: amíg az előképet a BEJELENTŐ adta, egy
 * korábbi változat a teljes összegzést vetette össze — egy becsületes szerző helyes előképét egy
 * felfújt összeggel beadva a vád átment volna. A D81 óta az előkép az aláírt eseményben van, de az
 * elv marad.)*
 */
function elokepe(e) {
  return e && lancElokepAlakja(e.lancGyoker, e.sorszam) ? e.lancGyoker : null;
}

/**
 * Egy pont-esemény hatása a SZERZŐ SAJÁT szabálya szerint — az előző állapotból és az entitás régi
 * értékének bizonyítékából. ⭐ Ugyanaz az ítélet (`pontEsemenyMerlege`, hézagtalan láncként), amit a
 * szerző a saját gyökerénél használ: csak az entitás régi értéke és az összeg kell hozzá.
 * @returns {Promise<null|{regi: number, osszeg: number, merleg: Object}>} null, ha a bizonyíték hibás
 */
async function pontHatasa(e, elotte, bizonyitek) {
  const entitas = e.adat?.entitas;
  if (typeof entitas !== 'string') return null;
  const b = await allapotBizonyitekEllenorzese(KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ, elotte.kiosztas, entitas, bizonyitek);
  if (!b.rendben) return null;
  const regi = b.van ? b.osszegek[0] : 0;
  const osszeg = elotte.kiosztas.o[0];
  return { regi, osszeg, merleg: pontEsemenyMerlege(e, { osszeg, pontok: new Map([[entitas, regi]]) }, true) };
}

/** A pont-esemény utáni kiosztás-gyökér a szerző szabálya szerint (amit elvet, az nem változtat). */
async function utanaKiosztas(e, elotte, bizonyitek) {
  if (e.tipus !== 'TudatpontRendezes') return elotte.kiosztas;
  const h = await pontHatasa(e, elotte, bizonyitek);
  if (!h) return null;
  if (h.merleg.elvetve) return elotte.kiosztas;
  const uj = h.merleg.pont > 0 ? { ertek: null, osszegek: [h.merleg.pont] } : null;
  const v = await allapotValtozasa(KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ, elotte.kiosztas, e.adat.entitas, bizonyitek, uj);
  return v.rendben ? v.gyoker : null;
}

// ===================================
// ⭐ AZ ELLENŐRZÉS — a kapu hívja
// ===================================

/**
 * Egy `Ellentmondas` esemény tartalmának ellenőrzése: tényleg a szerző saját, egymásnak ellentmondó
 * állításai-e — és melyik a vádpont.
 *
 * @param {Object} adat - { kit, fajta, vadpont, esemeny } · folytonosságnál + `kovetkezo` · negatív
 *   levélnél + `kulcs`, `bizonyitek` (a levél bizonyítéka az esemény kiosztás-gyökerében)
 * @param {string} koino - az `Ellentmondas` esemény koinója (a vádolt események is ebből valók)
 * @returns {Promise<{rendben: boolean, ok?: string, vadpont?: number}>}
 */
export async function ellentmondasEllenorzese(adat, koino) {
  if (!adat || typeof adat !== 'object' || typeof adat.kit !== 'string') return nem('hiányzik a vádolt (kit)');
  const { kit, fajta } = adat;
  if (!ELLENTMONDAS_FAJTAK.includes(fajta)) return nem('ismeretlen fajta: ' + fajta);
  const e = adat.esemeny;
  if (!await szerzoEsemenye(e, kit, koino)) return nem('a vádolt esemény nem a vádolt ép, aláírt eseménye');
  const elotte = elokepe(e);
  if (!elotte) return nem('a vádolt esemény nem hordozza a lánc-gyökerét');

  let vadpont;
  if (fajta === 'bemondas') {
    if (e.tipus !== 'TudatpontRendezes') return nem('a bemondás csak pont-eseményé lehet');
    const { pont, kiosztva } = e.adat ?? {};
    if (!Number.isSafeInteger(pont) || pont < 0 || !Number.isSafeInteger(kiosztva) || kiosztva < 0) {
      return nem('a pont-esemény alakja hibás (azt a szabály amúgy is elveti)');
    }
    const h = await pontHatasa(e, elotte, e.adat.bizonyitek);
    if (!h) return nem('a pont-esemény bizonyítéka nem az aláírt gyökérhez tartozik');
    if (kiosztva === h.osszeg - h.regi + pont) return nem('nincs ellentmondás: a bemondás kijön az előző állapotból');
    vadpont = e.sorszam;
  } else if (fajta === 'folytonossag') {
    const k = adat.kovetkezo;
    if (!await szerzoEsemenye(k, kit, koino)) return nem('a következő esemény nem a vádolt ép, aláírt eseménye');
    if (k.sorszam !== e.sorszam + 1 || k.elozo !== e.azonosito) return nem('a két esemény nem közvetlenül követi egymást');
    const kovetkezoElotte = elokepe(k);
    if (!kovetkezoElotte) return nem('a következő esemény nem hordozza a lánc-gyökerét');
    const vart = await utanaKiosztas(e, elotte, e.adat?.bizonyitek);
    if (!vart) return nem('a pont-esemény bizonyítéka nem az aláírt gyökérhez tartozik');
    // ⛔ A LENYOMAT dönt (lásd `elokepe`).
    if (vart.l === kovetkezoElotte.kiosztas.l) return nem('nincs ellentmondás: a következő esemény a helyes állapotot köti');
    vadpont = k.sorszam;
  } else {
    // negatív levél
    if (typeof adat.kulcs !== 'string') return nem('hiányzik a levél kulcsa');
    const b = await allapotBizonyitekEllenorzese(KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ, elotte.kiosztas, adat.kulcs, adat.bizonyitek);
    if (!b.rendben || !b.van) return nem('a levél bizonyítéka nem az aláírt gyökérhez tartozik');
    if (b.osszegek[0] > 0) return nem('nincs ellentmondás: a levél pozitív');
    vadpont = e.sorszam;
  }
  if (adat.vadpont !== vadpont) return nem('a bemondott vádpont (' + adat.vadpont + ') nem a bizonyított (' + vadpont + ')');
  return { rendben: true, vadpont };
}

// ⚠️ NINCS „KERESÉS A LÁNCBÓL" (2026-09-27, építés közben kivéve): a folytonosság bizonyítékához a
// szerző HAMIS előképe kell (a két gyökér, amit valójában elkötött) — a láncból csak az IGAZ állapot
// számolható, a hamis gyökérnek csak a lenyomata látszik. A hamis előképet csak a szerző adhatja ki,
// kérésre; ha nem adja ki: „nem ellenőrizhető" (D19). ⭐ A D81 óta viszont a szerző aláírt előképe
// az eseményében utazik — a folytonosság bizonyítéka két szomszédos eseményéből áll össze.
