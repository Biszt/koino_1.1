// backend/services/szerkesztoService.js

// ===================================
// SZERKESZTŐ SZERVIZ
// ===================================
// Felelősség: egy entitás (tartalom / kategória / tartalomtípus) SZERKESZTŐ-listájának
//   karbantartása, miután egy MÓDOSÍTÁSI javaslatot elfogadtak és végrehajtottak.
//
// Használják: services/javaslat/vegrehajtok/modositasiVegrehajto.js
//   (és rajta keresztül a csomagVegrehajto Módosítás-ága is).
//
// Mit csinál pontosan egy elfogadott módosítás után?
//   1. A javaslattevő a szerkesztő-lista ÉLÉRE kerül (ő a „legutolsó szerkesztő" → zöld).
//      Ha már korábban is szerkesztő volt, akkor csak feljebb lép az élre.
//   2. MINDEN meglévő szerkesztő `allapot`-ja ÚJRASZÁMOLÓDIK a szerint, hogy erre a
//      most elfogadott módosításra hogyan szavaztak (támogat / ellenez / tartózkodik /
//      nem szavazott). Ebből lesz a nevük színe a Részletes adatokban.
//
// Fontos: az egyéni szavazatok az elfogadás/végrehajtás után NEM törlődnek, ezért
//   utólag is kiolvashatók (a szín innen jön).

// ===================================
// IMPORTOK
// ===================================
const Szavazat = require('../models/szavazat');                                  // Egyéni szavazatok kiolvasása
const TartalomRepository = require('../repositories/tartalomRepository');         // Tartalom betöltése/mentése
const KategoriaRepository = require('../repositories/kategoriaRepository');       // Kategória betöltése/mentése
const TartalomTipusRepository = require('../repositories/tartalomTipusRepository'); // Tartalomtípus betöltése/mentése

class SzerkesztoService {

  // ===================================
  // SEGÉD: A MEGFELELŐ REPOSITORY KIVÁLASZTÁSA
  // ===================================
  // Entitás-típus alapján visszaadja a hozzá tartozó repository-t (vagy null-t).
  _repository(entitasTipus) {
    switch (entitasTipus) {
      case 'Tartalom':      return TartalomRepository;
      case 'Kategoria':     return KategoriaRepository;
      case 'TartalomTipus': return TartalomTipusRepository;
      default:              return null;
    }
  }

  // ===================================
  // SEGÉD: SZAVAZAT-TÍPUS → SZERKESZTŐ-ÁLLAPOT
  // ===================================
  // A szavazat típusát a szerkesztő-elem `allapot` mezőjére képezi le.
  //   Tamogat     → Tamogatja  (zöld)
  //   Ellenez     → Ellenzi    (piros)
  //   Tartozkodik → Tartozkodik (fekete)
  //   (nincs szavazat) → NemSzavazott (fekete)
  _szavazatbolAllapot(szavazatTipus) {
    switch (szavazatTipus) {
      case 'Tamogat':     return 'Tamogatja';
      case 'Ellenez':     return 'Ellenzi';
      case 'Tartozkodik': return 'Tartozkodik';
      default:            return 'NemSzavazott';
    }
  }

  // ===================================
  // FŐ METÓDUS: SZERKESZTŐK FRISSÍTÉSE EGY ELFOGADOTT MÓDOSÍTÁS UTÁN
  // ===================================
  /**
   * @param {string} entitasTipus - 'Tartalom' | 'Kategoria' | 'TartalomTipus'
   * @param {string} entitasId    - a módosított entitás azonosítója
   * @param {Object} javaslat     - a végrehajtott (módosítási) javaslat objektum
   *                                 (tartalmazza: _id, letrehozo, esetleg eredetiToredekJavaslatok)
   */
  async szerkesztoketFrissit(entitasTipus, entitasId, javaslat) {
    console.log('szerkesztoService.szerkesztoketFrissit - KEZDÉS', {
      entitasTipus,
      entitasId: entitasId?.toString?.() ?? entitasId,
      javaslatId: (javaslat?._id ?? javaslat?.id)?.toString?.()
    });

    // ----- 1. LÉPÉS: A MEGFELELŐ REPOSITORY -----
    const repo = this._repository(entitasTipus);
    if (!repo) {
      console.log('szerkesztoService.szerkesztoketFrissit - ismeretlen entitás típus, kilépés', { entitasTipus });
      return;
    }

    // ----- 2. LÉPÉS: A JELENLEGI ENTITÁS + SZERKESZTŐK BETÖLTÉSE -----
    const entitas = await repo.findById(entitasId);
    if (!entitas) {
      console.log('szerkesztoService.szerkesztoketFrissit - az entitás nem található, kilépés', { entitasId });
      return;
    }
    const jelenlegiSzerkesztok = entitas.szerkesztok || [];

    // ----- 3. LÉPÉS: A JAVASLATTEVŐ AZONOSÍTÓJA -----
    // A javaslat.letrehozo lehet nyers ObjectId VAGY populate-olt objektum ({_id, ...}).
    // null = TÖRÖLT e-ember (őt is felvesszük „—" néven, a konvenció szerint).
    const javaslattevoId = (javaslat?.letrehozo && (javaslat.letrehozo._id ?? javaslat.letrehozo)) || null;
    const javaslattevoIdStr = javaslattevoId ? javaslattevoId.toString() : null;

    // ----- 4. LÉPÉS: A JAVASLATRA LEADOTT SZAVAZATOK BETÖLTÉSE -----
    // Töredékcsoport esetén a szavazatok több töredék-javaslaton oszlanak meg,
    // ezért MINDEN forrás-javaslat azonosítóra keresünk. Egyedi javaslatnál egyetlen id.
    let javaslatIdk = [];
    if (Array.isArray(javaslat?.eredetiToredekJavaslatok) && javaslat.eredetiToredekJavaslatok.length > 0) {
      javaslatIdk = javaslat.eredetiToredekJavaslatok
        .map(t => t?._id ?? t?.id)
        .filter(Boolean);
    } else {
      const egyId = javaslat?._id ?? javaslat?.id;
      if (egyId) javaslatIdk = [egyId];
    }

    // eemberId (string) → szavazatTipus térkép felépítése
    const szavazatTerkep = new Map();
    if (javaslatIdk.length > 0) {
      const szavazatok = await Szavazat.find({ javaslatId: { $in: javaslatIdk } }).lean();
      for (const sz of szavazatok) {
        if (sz.eemberId) szavazatTerkep.set(sz.eemberId.toString(), sz.szavazatTipus);
      }
    }
    console.log('szerkesztoService.szerkesztoketFrissit - szavazatok betöltve', {
      javaslatIdkSzama: javaslatIdk.length,
      szavazatokSzama: szavazatTerkep.size
    });

    // ----- 5. LÉPÉS: AZ ÚJ SZERKESZTŐ-LISTA FELÉPÍTÉSE -----
    // a) Végigmegyünk a meglévő szerkesztőkön:
    //    - a javaslattevőt KIVESSZÜK (majd a lista élére tesszük), de megjegyezzük,
    //      hogy ő volt-e az eredeti létrehozó;
    //    - a többiek állapotát ÚJRASZÁMOLJUK a mostani szavazatuk alapján.
    let javaslattevoEredeti = false;
    const tobbiSzerkeszto = [];

    for (const sz of jelenlegiSzerkesztok) {
      const id = (sz.eemberId && (sz.eemberId._id ?? sz.eemberId)) || null;
      const idStr = id ? id.toString() : null;

      // Ez a bejegyzés maga a javaslattevő?
      if (javaslattevoIdStr && idStr === javaslattevoIdStr) {
        javaslattevoEredeti = !!sz.eredeti; // megőrizzük az eredeti-jelölőt
        continue;                            // kihagyjuk, mert az élre kerül
      }

      // A többiek állapota = hogyan szavaztak ERRE a módosításra
      const allapot = idStr
        ? this._szavazatbolAllapot(szavazatTerkep.get(idStr))
        : 'NemSzavazott'; // törölt e-ember: nem tudjuk, feketén jelenik meg
      tobbiSzerkeszto.push({ eemberId: id, allapot, eredeti: !!sz.eredeti });
    }

    // b) A javaslattevő a lista ÉLÉRE kerül, zölden (a saját módosítását támogatja).
    //    Az eredeti-jelölőt megtartjuk (ha ő az eredeti létrehozó, az marad).
    const listaEle = { eemberId: javaslattevoId, allapot: 'Tamogatja', eredeti: javaslattevoEredeti };
    const ujSzerkesztok = [listaEle, ...tobbiSzerkeszto];

    // ----- 6. LÉPÉS: MENTÉS -----
    await repo.updateById(entitasId, { szerkesztok: ujSzerkesztok });

    console.log('szerkesztoService.szerkesztoketFrissit - VÉGE', {
      entitasId: entitasId?.toString?.() ?? entitasId,
      ujSzerkesztokSzama: ujSzerkesztok.length
    });
  }

}

// ===================================
// EXPORTÁLÁS
// ===================================
module.exports = new SzerkesztoService();
