// backend/services/osLancKarbantartoService.js

// Felelősség: az entitások osLanc (ős-lánc) mezőjének KARBANTARTÁSA a két
// allokáció-kollekcióban (hierarchikus + tudatpont), a skálázható részfa-szűréshez
// (15. terv-pont, 3b lépés, 2026-07-21). Az osLanc = az entitás teljes szülő-lánca a
// gyökérig, ÖNMAGÁVAL kezdve. A láncot MINDIG a szuloId-láncból építjük újra (nem a
// szülő osLanc-jából származtatva) — így a művelet sorrendtől független és mindig helyes.
//
// Használják:
//   - tudatpontService — új entitás első allokációjakor: entitasOsLancFrissitese()
//   - athelyezesiVegrehajto — áthelyezés után: reszfaOsLancUjraepitese()
//   - tools/entitasOsLancPotlas — a migrációs tool ugyanezt az osLancFelepitese-t hívja
//
// MEGJEGYZÉS (skálázás): a lánc-felépítés allokációnként felfelé lépeget (naiv). A
// LEKÉRDEZÉSI oldal (indexelt osLanc-szűrés) skálázható; ez a karbantartás egy-egy
// entitásra fut (létrehozás) vagy egy részfára (áthelyezés — ritka művelet).

const HierarchikusTudatpontAllokacio = require('../models/hierarchikusTudatpontAllokacio');
const TudatpontAllokacio = require('../models/tudatpontAllokacio');

const MAX_MELYSEG = 200; // kör-védelem (hibás adatnál se fusson végtelenbe)

class OsLancKarbantartoService {

  // ----- EGY ENTITÁS ŐS-LÁNCÁNAK FELÉPÍTÉSE -----
  // A hierarchikus kollekcióból, felfelé lépegetve a szuloId-láncon.
  // Eredmény: [ {entitasId, entitasTipus}(saját), {szülő}, ..., {gyökér} ].
  // @param {string|ObjectId} entitasId
  // @param {string} entitasTipus
  // @returns {Promise<Array>} az ős-lánc (önmagával kezdve)
  async osLancFelepitese(entitasId, entitasTipus) {
    const lanc = [];
    let aktId = entitasId;
    let aktTipus = entitasTipus;
    let lepes = 0;

    while (aktId && aktTipus && lepes < MAX_MELYSEG) {
      lanc.push({ entitasId: aktId, entitasTipus: aktTipus });

      const sor = await HierarchikusTudatpontAllokacio.findOne({
        entitasId: aktId,
        entitasTipus: aktTipus
      }).select('szuloId szuloTipus').lean();

      // Gyökér (nincs szülő) → megállunk
      if (!sor || !sor.szuloId || !sor.szuloTipus) break;

      aktId = sor.szuloId;
      aktTipus = sor.szuloTipus;
      lepes++;
    }

    return lanc;
  }

  // ----- EGY ENTITÁS osLanc-JÁNAK FRISSÍTÉSE MINDKÉT KOLLEKCIÓBAN -----
  // Új entitás létrehozásakor hívjuk, a self hierarchikus allokáció létrejötte után.
  // @param {string|ObjectId} entitasId
  // @param {string} entitasTipus
  async entitasOsLancFrissitese(entitasId, entitasTipus) {
    console.log('osLancKarbantartoService.entitasOsLancFrissitese - KEZDÉS', { entitasId, entitasTipus });

    const lanc = await this.osLancFelepitese(entitasId, entitasTipus);

    // Mindkét allokáció-kollekcióba ugyanaz a lánc (a tudatpont-tábla tükrözi a hierarchikust)
    await Promise.all([
      HierarchikusTudatpontAllokacio.updateOne({ entitasId, entitasTipus }, { $set: { osLanc: lanc } }),
      TudatpontAllokacio.updateOne({ entitasId, entitasTipus }, { $set: { osLanc: lanc } })
    ]);

    console.log('osLancKarbantartoService.entitasOsLancFrissitese - VÉGE', { entitasId, lancHossz: lanc.length });
  }

  // ----- RÉSZFA osLanc ÚJRAÉPÍTÉSE (ÁTHELYEZÉS UTÁN) -----
  // Az áthelyezett entitás ÉS minden leszármazottja osLanc-ját újraépíti. A részfát a
  // RÉGI osLanc alapján gyűjti ({ 'osLanc.entitasId': entitasId }) — ez az áthelyezés
  // után is megtalálja a leszármazottakat, amíg a régi láncuk még tartalmazza az
  // entitást. Utána mindegyikre a szuloId-láncból (már az ÚJ szülővel) újraépít, ezért
  // az elemek feldolgozási sorrendje közömbös.
  // @param {string|ObjectId} entitasId - az áthelyezett (részfa-gyökér) entitás
  // @param {string} entitasTipus
  async reszfaOsLancUjraepitese(entitasId, entitasTipus) {
    console.log('osLancKarbantartoService.reszfaOsLancUjraepitese - KEZDÉS', { entitasId, entitasTipus });

    const reszfa = await HierarchikusTudatpontAllokacio.find({ 'osLanc.entitasId': entitasId })
      .select('entitasId entitasTipus')
      .lean();

    console.log('osLancKarbantartoService.reszfaOsLancUjraepitese - részfa mérete', { darab: reszfa.length });

    for (const elem of reszfa) {
      await this.entitasOsLancFrissitese(elem.entitasId, elem.entitasTipus);
    }

    console.log('osLancKarbantartoService.reszfaOsLancUjraepitese - VÉGE', { entitasId, frissitett: reszfa.length });
  }
}

module.exports = new OsLancKarbantartoService();
