// backend/services/terkepService.js

// ===== TÉRKÉP SERVICE =====
// Felelősség: a Térkép (teljes képernyős, interaktív fa-nézet) backend-adatai.
//   1. darabszamLekerese  — az entitások összdarabszáma (és ág-szűrésnél az ág
//      darabszáma) az ELŐZETES kijelzéshez ("N entitás — elkészíted?").
//   2. lapLekerese        — a teljes fa LAPOZOTT lekérése (kurzoros, _id szerint);
//      a fát a frontend építi fel a lapos sorokból. A lapozás adja a letöltési
//      folyamatjelzőt és a megszakíthatóságot (a kliens egyszerűen nem kér többet).
// Adatforrás: a hierarchikusTudatpontAllokacio kollekció — ebben MINDEN entitás
// (mind az 5 típus) benne van szülő-kapcsolattal és hierarchikus ponttal.
// Címek: az ertesitesService közös entitasCimekFeltoltese segédje (a 3 cím-viselő
// típusra; Javaslat/Egyezmény → null, a frontend típus-feliratot mutat).
// Használja: terkepController.

// --- IMPORTÁLÁSOK ---
const hierarchikusAllokaciRepository = require('../repositories/hierarchikusTudatpontAllokaciRepository');
const { entitasCimekFeltoltese } = require('./ertesitesService');

// Egy lap maximális mérete — ennél többet egy kérésre nem adunk
const MAX_LAP_MERET = 2000;

// Az ág-bejárás (BFS) biztonsági mélység-korlátja — hibás (körkörös) szülő-lánc
// esetén se fusson végtelen ciklusba
const MAX_BEJARASI_MELYSEG = 100;

// --- TÉRKÉP SERVICE OSZTÁLY ---
class TerkepService {

// ----- DARABSZÁM LEKÉRÉSE -----
/**
* Az entitások összdarabszáma, ág-szűrésnél az ág darabszáma is.
* Az ág darabszámát szintenkénti BFS-sel számoljuk: a gyökértől lefelé
* szintenként EGY-EGY csoportos ($in) lekérdezéssel gyűjtjük a gyerekeket —
* a bejárt dokumentumok száma összesen az ág mérete (nincs N+1).
* @param {string|null} agEntitasId - opcionális ág-gyökér entitás azonosítója
* @returns {Promise<Object>} { osszesDarab, agDarab } (agDarab csak ág-szűrésnél)
*/
async darabszamLekerese(agEntitasId = null) {
  console.log('TerkepService.darabszamLekerese - KEZDÉS', { agEntitasId });

  const osszesDarab = await hierarchikusAllokaciRepository.countOsszes();

  let agDarab = null;
  if (agEntitasId) {
    // BFS szintenként: az ág gyökere (1 db) + a szintenkénti gyerekek összege
    agDarab = 1;
    let aktualisSzint = [agEntitasId];
    let melyseg = 0;

    while (aktualisSzint.length > 0 && melyseg < MAX_BEJARASI_MELYSEG) {
      const kovetkezoSzint = await hierarchikusAllokaciRepository.findGyerekIdkBySzulok(aktualisSzint);
      agDarab += kovetkezoSzint.length;
      aktualisSzint = kovetkezoSzint;
      melyseg++;
    }

    if (melyseg >= MAX_BEJARASI_MELYSEG) {
      console.warn('TerkepService.darabszamLekerese - mélység-korlát elérve, az ág-darabszám csonka lehet');
    }
  }

  console.log('TerkepService.darabszamLekerese - VÉGE', { osszesDarab, agDarab });
  return { osszesDarab, agDarab };
}

// ----- LAP LEKÉRÉSE -----
/**
* A teljes fa egy lapja kurzoros lapozással, címekkel feltöltve.
* A sorok _id szerint növekvő sorrendben jönnek; a válasz kovetkezoKurzor
* mezője a lap utolsó sorának _id-ja (null, ha nincs több lap).
* @param {string|null} kurzorId - az előző lap utolsó sorának _id-ja (null = első lap)
* @param {number} lapMeret - kért lapméret (a MAX_LAP_MERET-re vágva)
* @returns {Promise<Object>} { sorok, kovetkezoKurzor }
*/
async lapLekerese(kurzorId = null, lapMeret = MAX_LAP_MERET) {
  console.log('TerkepService.lapLekerese - KEZDÉS', { kurzorId, lapMeret });

  const limit = Math.min(Math.max(1, lapMeret), MAX_LAP_MERET);
  const nyersSorok = await hierarchikusAllokaciRepository.findTerkepLap(kurzorId, limit);

  // Címek feltöltése típusonként EGY csoportos lekérdezéssel (közös segéd).
  // A segéd entitasCim mezőt tesz minden sorra (Javaslat/Egyezmény → null).
  const cimmelFeltoltott = await entitasCimekFeltoltese(nyersSorok);

  // Szűk válasz-sorok: csak amire a fa-rajzolásnak szüksége van
  const sorok = cimmelFeltoltott.map(sor => ({
    lapKurzor:              sor._id,
    entitasId:              sor.entitasId,
    entitasTipus:           sor.entitasTipus,
    szuloId:                sor.szuloId ?? null,
    hierarchikusOsszesPont: sor.hierarchikusOsszesPont ?? 0,
    letrehozva:             sor.letrehozva ?? null,
    cim:                    sor.entitasCim ?? null
  }));

  // Kurzor a következő laphoz: a lap utolsó sorának _id-ja.
  // Ha a lap NEM telt meg, biztosan nincs több sor → null.
  const kovetkezoKurzor = sorok.length === limit
    ? sorok[sorok.length - 1].lapKurzor
    : null;

  console.log('TerkepService.lapLekerese - VÉGE', {
    sorokSzama: sorok.length,
    vanKovetkezoLap: !!kovetkezoKurzor
  });

  return { sorok, kovetkezoKurzor };
}

}

// --- EXPORTÁLÁS - SINGLETON példány ---
module.exports = new TerkepService();
