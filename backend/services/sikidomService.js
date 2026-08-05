// backend/services/sikidomService.js

// ===== SÍKIDOM SERVICE =====
// Felelősség: a Síkidom nézet backend-adatai.
//
// A betöltés KÜSZÖB-VEZÉRELT, NEM lapozó. A nézetben egy síkidom akkor látszik,
// ha a képernyőn mért átmérője elér egy minimumot; ebből a méret-képlet
// megfordításával a kliens pontosan kiszámolja, MEKKORA TUDATPONT kell hozzá:
//
//   pontKüszöb = 20 × szülőPont × ( minimumÁtmérő / (2 × szülőKépernyőSugár) )²
//
// Így nem „a következő 60"-at kérjük, hanem „mindent, ami eléri ezt a küszöböt".
// Nagyításkor a küszöb folyamatosan süllyed, és mindig pontosan azok az entitások
// érkeznek, amelyek épp láthatóvá váltak — nincs önkényes lap-határ, és nem
// keletkezik törés a betöltött adagok között.
//
// A KURZOR (kurzorPont + kurzorId) mondja meg, meddig jutottunk. A rendezés
// döntője az `_id`, ezért a kurzor is arra épül — így azonos pontszámú testvérek
// sem maradnak ki és nem is duplázódnak.
//
// Használja: sikidomController.

// --- IMPORTÁLÁSOK ---
const hierarchikusAllokaciRepository = require('../repositories/hierarchikusTudatpontAllokaciRepository');
const { entitasCimekFeltoltese } = require('./ertesitesService');

// Biztonsági darab-plafon EGY kérésre. NEM ez az elsődleges szabály (azt a küszöb
// adja) — csak azért van, hogy egy szélsőségesen alacsony küszöb se robbantson.
const MAX_DARAB = 300;

// --- SÍKIDOM SERVICE OSZTÁLY ---
class SikidomService {

// ----- GYEREKEK EGY TUDATPONT-KÜSZÖB FÖLÖTT -----
/**
* Egy szülő azon gyerekei, amelyek elérik a megadott tudatpont-küszöböt,
* pont szerint csökkenő sorrendben.
*
* @param {string|null} szuloId - a szülő azonosítója; null/üres → a GYÖKEREK
* @param {number} minPont - a kliens által számolt tudatpont-küszöb
* @param {number|null} kurzorPont - meddig jutottunk (a legutóbbi sor pontja)
* @param {string|null} kurzorId - meddig jutottunk (a legutóbbi sor `_id`-ja)
* @param {number} darab - biztonsági darab-plafon
* @returns {Promise<Object>} { gyerekek, osszesGyerekPont, kurzor, vanTovabb }
*/
async gyerekekLekerese(szuloId = null, minPont = 0, kurzorPont = null, kurzorId = null, darab = MAX_DARAB) {
  console.log('SikidomService.gyerekekLekerese - KEZDÉS', {
    szuloId, minPont, kurzorPont, kurzorId, darab
  });

  const plafon = Math.max(1, Math.min(darab, MAX_DARAB));
  const kuszob = Math.max(0, minPont);

  // EGGYEL többet kérünk: ha megjön a plusz egy, akkor a küszöb fölött van még
  // több, mint amennyi a plafonba fér (a kliens ilyenkor újra kér, kurzorral).
  const sorok = await hierarchikusAllokaciRepository.findGyerekekKuszobFolott(
    szuloId ?? null, kuszob, kurzorPont, kurzorId, plafon + 1
  );

  const vanTovabb = sorok.length > plafon;
  const adag = vanTovabb ? sorok.slice(0, plafon) : sorok;

  // Az ÖSSZES gyerek együttes pontja — ebből számolja a kliens az üres mag
  // PONTOS méretét (összes − a már betöltöttek = ami még hátravan).
  const osszesGyerekPont = await hierarchikusAllokaciRepository.gyerekekOsszPontja(szuloId ?? null);

  if (adag.length === 0) {
    console.log('SikidomService.gyerekekLekerese - VÉGE (a küszöb fölött nincs több)');
    return { gyerekek: [], osszesGyerekPont, kurzor: null, vanTovabb: false };
  }

  // Kinek van SAJÁT gyereke? Egyetlen lekérdezéssel az egész adagra (nincs N+1)
  const gyerekesIdk = await hierarchikusAllokaciRepository.melyikSzulonekVanGyereke(
    adag.map(sor => sor.entitasId)
  );
  const gyerekesHalmaz = new Set(gyerekesIdk.map(id => id.toString()));

  // Címek feltöltése (típusonként EGY csoportos lekérdezés). A cím-nélküli
  // típusoknál (Javaslat, Egyezmény) az entitasCim null marad.
  const cimmel = await entitasCimekFeltoltese(adag);

  const gyerekek = cimmel.map(sor => ({
    entitasId: sor.entitasId,
    entitasTipus: sor.entitasTipus,
    cim: sor.entitasCim ?? null,
    hierarchikusOsszesPont: sor.hierarchikusOsszesPont ?? 0,
    vanGyereke: gyerekesHalmaz.has(sor.entitasId.toString())
  }));

  // A kurzor a KÖVETKEZŐ kéréshez: az utolsó visszaadott sor helye a rendezésben
  const utolso = adag[adag.length - 1];
  const kurzor = {
    pont: utolso.hierarchikusOsszesPont ?? 0,
    id: utolso._id.toString()
  };

  console.log('SikidomService.gyerekekLekerese - VÉGE', {
    visszaadottDarab: gyerekek.length,
    osszesGyerekPont,
    vanTovabb
  });

  return { gyerekek, osszesGyerekPont, kurzor, vanTovabb };
}

}

// --- EXPORTÁLÁS - SINGLETON példány ---
module.exports = new SikidomService();
