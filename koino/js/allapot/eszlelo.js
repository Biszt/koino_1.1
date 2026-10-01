// koino/js/allapot/eszlelo.js

// Felelősség: AZ ÉSZLELŐ (D82 sorrend ①) — a készülék MAGÁTÓL észreveszi, amit a nála lévő eseményekből
// be lehet bizonyítani egy szerző ellen (vagy, elágazásnál, róla), és kész bizonyítékot ad (az
// `Ellentmondas` esemény adatát). Hálózat és aláírás nélkül: a bejelentés a művelet-réteg dolga
// (`muveletek.js`, `ellentmondasokBejelentese`).
//
// ===== ⭐ MIT NÉZ, ÉS HOL =====
//
// A megadott eseményeket (jellemzően a MOST beérkezetteket) — és mindegyiknek csak a közvetlen
// szomszédait a szerző láncában: ugyanazt a sorszámot (elágazás), az előzőt és a következőt
// (folytonosság), és magát a pont-eseményt (bemondás). ⭐ Ezért olcsó: egy beérkezett esemény néhány
// célzott kérdés a tárhoz (`sorszamSzerint`), a koino méretétől függetlenül (a „végtelen" próbája).
//
// ⚠️ Amit NEM tud: a negatív levelet (a szerző teljes kiosztás-listája kell hozzá — a D79 szúrópróba) és
// a különböző sorszámon találkozó két ágat (a napló-bizonyíték) — mindkettő kérés, a D pillér után.
//
// ⛔⛔ CSAK A KAPUN IS ÁTMENŐ LELETET ADJA: minden jelöltet ugyanaz az ellenőrzés szűr
// (`ellentmondasEllenorzese`), amit a kapu is futtat — így a becsületes láncra adott garancia (nem
// állítható össze vád) az automatikus bejelentésre is áll.
//
// Használják: muveletek.js (a bejelentés), koino.js (a csere és a kézi út után, és az `ellenoriz`
// parancs), a próbák.

import { ellentmondasEllenorzese } from './ellentmondas.js';

/**
 * A megadott események körül bizonyítható ellentmondások — ellenőrizve, ismétlés nélkül.
 *
 * @param {Object} tar
 * @param {string} koino
 * @param {Array<Object>} esemenyek - a vizsgálandó események (pl. a most beérkezettek)
 * @returns {Promise<Array<Object>>} kész bizonyítékok (`Ellentmondas` adat)
 */
export async function ellentmondasokKeresese(tar, koino, esemenyek) {
  const talalt = new Map();                  // kulcs → adat (egy lelet egyszer)
  const probal = async (kulcs, adat) => {
    if (talalt.has(kulcs)) return;
    if ((await ellentmondasEllenorzese(adat, koino)).rendben) talalt.set(kulcs, adat);
  };
  const ott = async (szerzo, sorszam) => (await tar.sorszamSzerint(szerzo, sorszam)).filter((x) => x.koino === koino);

  for (const e of esemenyek) {
    if (!e || e.koino !== koino || e.tipus === 'Ellentmondas') continue;
    const kit = e.szerzo;
    const itt = await ott(kit, e.sorszam);

    // ----- ELÁGAZÁS (D82): ugyanarról a sorszámról több esemény — a kisebb azonosító nyer -----
    if (itt.length > 1) {
      const rendezett = [...itt].sort((a, b) => (a.azonosito < b.azonosito ? -1 : 1));
      for (const vesztes of rendezett.slice(1)) {
        await probal('elagazas|' + vesztes.azonosito,
          { kit, fajta: 'elagazas', vesztes: vesztes.azonosito, esemeny: rendezett[0], masik: vesztes });
      }
      continue;                              // elágazásnál a szomszédság nem egyértelmű
    }

    // ----- BEMONDÁS: a pont-esemény a saját bizonyítékával ellentmond önmagának (D81) -----
    if (e.tipus === 'TudatpontRendezes') {
      await probal('bemondas|' + e.azonosito, { kit, fajta: 'bemondas', vadpont: e.sorszam, esemeny: e });
    }

    // ----- FOLYTONOSSÁG: az előzővel és a következővel (ha egyértelmű és láncolt) -----
    if (e.sorszam > 1) {
      const elozo = await ott(kit, e.sorszam - 1);
      if (elozo.length === 1 && e.elozo === elozo[0].azonosito) {
        await probal('folytonossag|' + e.azonosito,
          { kit, fajta: 'folytonossag', vadpont: e.sorszam, esemeny: elozo[0], kovetkezo: e });
      }
    }
    const kovetkezo = await ott(kit, e.sorszam + 1);
    if (kovetkezo.length === 1 && kovetkezo[0].elozo === e.azonosito) {
      await probal('folytonossag|' + kovetkezo[0].azonosito,
        { kit, fajta: 'folytonossag', vadpont: kovetkezo[0].sorszam, esemeny: e, kovetkezo: kovetkezo[0] });
    }
  }
  return [...talalt.values()];
}
