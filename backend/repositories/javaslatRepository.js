// backend/repositories/javaslatRepository.js

// ===================================
// JAVASLAT MODEL IMPORTÁLÁSA
// ===================================
const Javaslat = require('../models/javaslat');

// ===================================
// JAVASLAT REPOSITORY OSZTÁLY
// ===================================
// Ez a réteg felelős a javaslat adatok adatbázis műveleteiért
class JavaslatRepository {

  // ===================================
  // ----- ÚJ JAVASLAT LÉTREHOZÁSA -----
  // ===================================
  /**
   * Új javaslat mentése az adatbázisba
   * @param {Object} javaslatAdatok - A javaslat adatai
   * @returns {Promise<Object>} A létrehozott javaslat objektum
   */
  async create(javaslatAdatok) {
    // Új javaslat példány létrehozása
    const ujJavaslat = new Javaslat(javaslatAdatok);
    
    // Mentés az adatbázisba
    const mentettJavaslat = await ujJavaslat.save();
    
    return mentettJavaslat;
  }

  // ===================================
  // ----- JAVASLAT KERESÉSE ID ALAPJÁN -----
  // ===================================
  /**
   * Egy javaslat lekérdezése ID alapján
   * @param {string} id - A javaslat MongoDB ObjectId-ja
   * @returns {Promise<Object|null>} A javaslat objektum vagy null ha nem található
   */
  async findById(id) {
    // Javaslat lekérése kapcsolódó adatokkal (populate)
    const javaslat = await Javaslat.findById(id)
      .populate('letrehozo', 'eemberNev'); // Létrehozó adatok betöltése
    
    return javaslat;
  }

  // ===================================
  // ----- JAVASLATOK LISTÁZÁSA SZŰRŐKKEL -----
  // ===================================
  /**
   * Javaslatok lekérdezése különböző szűrési feltételekkel
   * @param {Object} szurok - Szűrési feltételek objektum
   * @param {string} szurok.statusz - Szűrés státusz szerint
   * @param {string} szurok.javaslatTipus - Szűrés javaslat típus szerint
   * @param {string} szurok.letrehozo - Szűrés létrehozó szerint
   * @param {string} szurok.entitasId - Szűrés érintett entitás szerint
   * @param {string} szurok.entitasTipus - Szűrés érintett entitás típus szerint
   * @returns {Promise<Array>} Javaslatok tömb
   */
  async findAll(szurok = {}) {
    // MongoDB query objektum építése
    const query = {};
    
    // Státusz szerinti szűrés
    if (szurok.statusz) {
      query.statusz = szurok.statusz;
    }
    
    // Javaslat típus szerinti szűrés
    if (szurok.javaslatTipus) {
      query.javaslatTipus = szurok.javaslatTipus;
    }
    
    // Létrehozó szerinti szűrés
    if (szurok.letrehozo) {
      query.letrehozo = szurok.letrehozo;
    }
    
    // Érintett entitás ID szerinti szűrés
    if (szurok.entitasId) {
      query['erintettEntitasok.entitasId'] = szurok.entitasId;
    }
    
    // Érintett entitás típus szerinti szűrés
    if (szurok.entitasTipus) {
      query['erintettEntitasok.entitasTipus'] = szurok.entitasTipus;
    }
    
    // Javaslatok lekérése kapcsolódó adatokkal
    const javaslatok = await Javaslat.find(query)
      .sort({ letrehozva: -1 })                     // Legújabbak előre rendezés
      .populate('letrehozo', 'eemberNev'); // Létrehozó adatok
    
    return javaslatok;
  }

  // ===================================
  // ----- JAVASLAT FRISSÍTÉSE -----
  // ===================================
  /**
   * Egy javaslat módosítása ID alapján
   * @param {string} id - A javaslat MongoDB ObjectId-ja
   * @param {Object} frissitesek - A frissítendő mezők objektum
   * @returns {Promise<Object|null>} A frissített javaslat vagy null
   */
  async updateById(id, frissitesek) {
    // Javaslat frissítése és a frissített verzió visszaadása
    const frissitettJavaslat = await Javaslat.findByIdAndUpdate(
      id,
      { $set: frissitesek }, // $set operátor - csak a megadott mezőket frissíti
      { 
        new: true,            // Frissített dokumentumot ad vissza (nem a régit)
        runValidators: true   // Mongoose validációk futtatása
      }
    )
    .populate('letrehozo', 'eemberNev');
    
    return frissitettJavaslat;
  }

  // ===================================
  // ----- STÁTUSZ FRISSÍTÉSE -----
  // ===================================
  /**
   * Egy javaslat státuszának módosítása
   * @param {string} id - A javaslat MongoDB ObjectId-ja
   * @param {string} ujStatusz - Az új státusz érték
   * @returns {Promise<Object|null>} A frissített javaslat vagy null
   */
  async updateStatusz(id, ujStatusz) {
    // Csak a státusz mezőt frissítjük
    const frissitettJavaslat = await Javaslat.findByIdAndUpdate(
      id,
      { 
        $set: { 
          statusz: ujStatusz 
        } 
      },
      { 
        new: true,
        runValidators: true
      }
    )
    .populate('letrehozo', 'eemberNev');
    
    return frissitettJavaslat;
  }

  // ===================================
  // ----- SZÁMÍTOTT ÉRTÉKEK FRISSÍTÉSE -----
  // ===================================
  /**
   * Egy javaslat számított értékeinek frissítése (RA, TA, BM, HI, stb.)
   * @param {string} id - A javaslat MongoDB ObjectId-ja
   * @param {Object} szamitottErtekek - A számított értékek objektuma
   * @returns {Promise<Object|null>} A frissített javaslat vagy null
   */
  async updateSzamitottErtekek(id, szamitottErtekek) {

    // Számított értékek + utolsoSzamitas frissítése
    const frissitettJavaslat = await Javaslat.findByIdAndUpdate(
      id,
      { 
        $set: {
          ...szamitottErtekek,                    // Számított értékek spread
          utolsoSzamitas: Date.now()             // Számítás időpontja
        }
      },
      { 
        new: true,
        runValidators: false // Számított értékeknél nem kell validáció
      }
    )
    .populate('letrehozo', 'eemberNev');
    
    return frissitettJavaslat;
  }

  // ===================================
  // ----- HATÁLYBA LÉPÉSI IDŐ FRISSÍTÉSE -----
  // ===================================
  /**
   * Egy javaslat hatályba lépési idejének beállítása
   * @param {string} id - A javaslat MongoDB ObjectId-ja
   * @param {Date} hatalybaLepesIdeje - A hatályba lépés dátuma
   * @returns {Promise<Object|null>} A frissített javaslat vagy null
   */
  async updateHatalybaLepesIdeje(id, hatalybaLepesIdeje) {
    // Hatályba lépési idő beállítása
    const frissitettJavaslat = await Javaslat.findByIdAndUpdate(
      id,
      { 
        $set: { 
          hatalybaLepesIdeje : hatalybaLepesIdeje 
        }
      },
      { 
        new: true,
        runValidators: false
      }
    )
    .populate('letrehozo', 'eemberNev');
    
    return frissitettJavaslat;
  }

  // ===================================
  // ----- JAVASLAT TorlesE -----
  // ===================================
  /**
   * Egy javaslat törlése ID alapján
   * @param {string} id - A javaslat MongoDB ObjectId-ja
   * @returns {Promise<Object|null>} A törölt javaslat vagy null
   */
  async deleteById(id) {
    // Javaslat törlése és a törölt dokumentum visszaadása
    const toroltJavaslat = await Javaslat.findByIdAndDelete(id);
    
    return toroltJavaslat;
  }

  // ===================================
  // ----- JAVASLATOK SZÁMLÁLÁSA -----
  // ===================================
  /**
   * Javaslatok megszámlálása (opcionális szűrőkkel)
   * @param {Object} szurok - Szűrési feltételek (opcionális)
   * @returns {Promise<number>} Javaslatok száma
   */
  async count(szurok = {}) {
    // MongoDB query objektum építése (ugyanaz, mint a findAll-nál)
    const query = {};
    
    if (szurok.statusz) {
      query.statusz = szurok.statusz;
    }
    
    if (szurok.javaslatTipus) {
      query.javaslatTipus = szurok.javaslatTipus;
    }
    
    if (szurok.letrehozo) {
      query.letrehozo = szurok.letrehozo;
    }
    
    if (szurok.entitasId) {
      query['erintettEntitasok.entitasId'] = szurok.entitasId;
    }
    
    if (szurok.entitasTipus) {
      query['erintettEntitasok.entitasTipus'] = szurok.entitasTipus;
    }
    
    // Javaslatok megszámlálása
    const darab = await Javaslat.countDocuments(query);
    
    return darab;
  }

  // ===================================
  // ----- ÉRINTETT ENTITÁS JAVASLATOK -----
  // ===================================
  /**
   * Egy adott entitásra vonatkozó javaslatok keresése
   * @param {string} entitasId - Az entitás MongoDB ObjectId-ja
   * @param {string} entitasTipus - Az entitás típusa ('Gondolat', 'Kategoria', stb.)
   * @returns {Promise<Array>} Javaslatok tömb
   */
  async findByErintettEntitas(entitasId, entitasTipus) {
    // Keresés: erintettEntitasok tömb tartalmazza az entitást
    const javaslatok = await Javaslat.find({
      'erintettEntitasok.entitasId': entitasId,
      'erintettEntitasok.entitasTipus': entitasTipus
    })
    .sort({ letrehozva: -1 })
    .populate('letrehozo', 'eemberNev');
    
    return javaslatok;
  }

  // ===================================
  // ----- Aktiv JAVASLATOK ENTITÁSRA -----
  // ===================================
  /**
   * Egy adott entitásra vonatkozó aktív javaslatok keresése
   * Ellenőrzéshez: lehet-e új javaslatot létrehozni
   * @param {string} entitasId - Az entitás MongoDB ObjectId-ja
   * @param {string} entitasTipus - Az entitás típusa
   * @returns {Promise<Array>} Aktív javaslatok tömb
   */
  async findAktivJavaslatokByEntitas(entitasId, entitasTipus) {
    // Keresés: Aktiv vagy Elfogadva státuszú javaslatok
    const javaslatok = await Javaslat.find({
      'erintettEntitasok.entitasId': entitasId,
      'erintettEntitasok.entitasTipus': entitasTipus,
      statusz: { $in: ['Aktiv', 'Elfogadva'] } // Aktiv vagy Elfogadva
    })
    .sort({ letrehozva: -1 })
    .populate('letrehozo', 'eemberNev');
    
    return javaslatok;
  }

  // ===================================
  // ----- HATÁLYBA LÉPENDŐ JAVASLATOK -----
  // ===================================
  /**
   * Hatályba lépendő javaslatok lekérése (Cron job-hoz)
   * Státusz: Aktiv és hatályba lépési idő <= most
   * @returns {Promise<Array>} Hatályba lépendő javaslatok tömb
   */
  async findHatalybaLependok() {
    // Jelenlegi időpont
    const most = new Date();
    
    // Keresés: Elfogadva státuszú, és lejárt a hatályba lépési idő
    const javaslatok = await Javaslat.find({
      statusz: 'Aktiv',
      hatalybaLepesIdeje : { $lte: most } // <= most
    })
    .sort({ hatalybaLepesIdeje : 1 }) // Legrégebbiek először
    .populate('letrehozo', 'eemberNev');
    
    return javaslatok;
  }

  // ===================================
  // ----- HATÁRIDŐ-ÉRTESÍTÉSRE VÁRÓ JAVASLATOK -----
  // ===================================
  /**
   * Aktív javaslatok, amelyeknek van hatályba lépési ideje, és még nem kaptak
   * „szavazási határidő közeleg" értesítést (Cron job-hoz — a közelség
   * kiértékelése a service dolga).
   * @returns {Promise<Array>} Javaslatok tömb
   */
  async findHataridoErtesitesreVarok() {
    const javaslatok = await Javaslat.find({
      statusz: 'Aktiv',
      hatalybaLepesIdeje: { $ne: null },
      hataridoErtesitesElkuldve: { $ne: true }
    });

    return javaslatok;
  }

  // ===================================
  // ----- HATÁRIDŐ-ÉRTESÍTÉS JELZŐ BEÁLLÍTÁSA -----
  // ===================================
  /**
   * A hataridoErtesitesElkuldve jelző true-ra állítása (duplikátum-védelem)
   * @param {string} javaslatId - A javaslat azonosítója
   * @returns {Promise<Object>} Frissített javaslat
   */
  async setHataridoErtesitesElkuldve(javaslatId) {
    return await Javaslat.findByIdAndUpdate(
      javaslatId,
      { hataridoErtesitesElkuldve: true },
      { new: true }
    );
  }

  // ===================================
  // ----- TÖBB ENTITÁS ÉRINTETTSÉGE -----
  // ===================================
  /**
   * Javaslatok keresése, amelyek több megadott entitást is érintenek
   * @param {Array<string>} entitasIds - Entitás ID-k tömbje
   * @param {Array<string>} entitasTipusok - Entitás típusok tömbje (opcionális)
   * @returns {Promise<Array>} Javaslatok tömb
   */
  async findByErintettEntitasok(entitasIds, entitasTipusok = []) {
    // Query feltétel építése
    const query = {
      'erintettEntitasok.entitasId': { $in: entitasIds } // Bármelyik ID
    };
    
    // Ha típusokat is megadtak, szűrés típusra is
    if (entitasTipusok.length > 0) {
      query['erintettEntitasok.entitasTipus'] = { $in: entitasTipusok };
    }
    
    // Keresés
    const javaslatok = await Javaslat.find(query)
      .sort({ letrehozva: -1 })
      .populate('letrehozo', 'eemberNev');
    
    return javaslatok;
  }

  // ===================================
  // ----- EMBER JAVASLATAI -----
  // ===================================
  /**
   * Egy eember által létrehozott javaslatok lekérése
   * @param {string} eemberId - A eember MongoDB ObjectId-ja
   * @param {number} limit - Maximum ennyi javaslat (opcionális)
   * @returns {Promise<Array>} Javaslatok tömb
   */
  async findByLetrehozo(eemberId, limit = null) {
    // Query
    let query = Javaslat.find({ letrehozo: eemberId })
      .sort({ letrehozva: -1 })
      .populate('letrehozo', 'eemberNev');
    
    // Ha van limit, alkalmazzuk
    if (limit) {
      query = query.limit(limit);
    }
    
    const javaslatok = await query;
    
    return javaslatok;
  }

  // A repository vége előtt, a EXPORTÁLÁS előtt:

  // ----- JAVASLATOK KERESÉSE ÉRINTETT ENTITÁS ALAPJÁN -----
  /**
   * Egy adott entitásra vonatkozó javaslatok keresése státusz szerint
   * @param {string} entitasId - Az entitás MongoDB ObjectId-ja
   * @param {string} entitasTipus - Az entitás típusa ('Gondolat', 'Kategoria', stb.)
   * @param {string} statusz - Javaslat státusz (alapértelmezett: 'Aktiv')
   * @returns {Promise<Array>} Javaslat ID-k tömbje
   */
  async findByErintettEntitas(entitasId, entitasTipus, statusz = 'Aktiv') {
    // MongoDB query - keresés az erintettEntitasok tömbben
    const javaslatok = await Javaslat.find({
      'erintettEntitasok.entitasId': entitasId,           // Entitás ID egyezés
      'erintettEntitasok.entitasTipus': entitasTipus,     // Entitás típus egyezés
      'statusz': statusz                                   // Státusz szűrés
    }).select('_id');  // Csak az ID-kat kérjük le (optimalizálás)

    // ID-k kinyerése a dokumentumokból
    return javaslatok.map(j => j._id);
  }

  // ----- TÖMEGES ELAVULT JELZŐ BEÁLLÍTÁSA -----
  /**
   * Több javaslat ertekekElavultak mezőjének tömeges frissítése
   * @param {Array<string>} javaslatIds - Javaslat ID-k tömbje
   * @param {boolean} ertek - Az új érték (alapértelmezett: true)
   * @returns {Promise<Object>} MongoDB update eredmény
   */
  async bulkSetErtekekElavultak(javaslatIds, ertek = true) {
    // MongoDB updateMany - tömeges frissítés egy lépésben
    const eredmeny = await Javaslat.updateMany(
      { _id: { $in: javaslatIds } },           // ID-k a tömbből
      { $set: { ertekekElavultak: ertek } }    // Mező beállítása
    );

    return eredmeny;
  }

  // ----- ELAVULT JAVASLATOK LEKÉRÉSE -----
  /**
   * Elavult javaslatok lekérése státusz szerint
   * Cron job használja a frissítéshez
   * @param {string} statusz - Javaslat státusz (alapértelmezett: 'Aktiv')
   * @returns {Promise<Array>} Javaslat ID-k tömbje
   */
  async findElavultJavaslatok(statusz = 'Aktiv') {
    // MongoDB query - elavult és aktív javaslatok
    const javaslatok = await Javaslat.find({
      ertekekElavultak: true,    // Elavult jelző be van állítva
      statusz: statusz           // Státusz szűrés
    }).select('_id');  // Csak az ID-kat kérjük le

    // ID-k kinyerése
    return javaslatok.map(j => j._id);
  }

  /**
 * ----- JAVASLAT KERESÉSE SZÜLŐ ALAPJÁN -----
 * ÚJ FÜGGVÉNY: Egy gondolat alatti javaslatok lekérése
 * @param {string} szuloId - Szülő gondolat MongoDB ObjectId-ja
 * @param {string|null} statusz - Javaslat státusza (opcionális szűrés)
 * @returns {Promise<Array>} Javaslatok tömb
 */
async findBySzuloId(szuloId, statusz = null) {
  // Log metódus kezdete
  console.log('javaslatRepository.findBySzuloId - KEZDÉS', { 
    szuloId, 
    statusz 
  });
  
  // MongoDB query objektum építése
  const query = { szuloId: szuloId };
  
  // Státusz szűrés (opcionális)
  if (statusz) {
    query.statusz = statusz;
  }
  
  // Javaslatok lekérése kapcsolt adatokkal
  const javaslatok = await Javaslat.find(query)
    .populate('letrehozo', 'eemberNev')    // Létrehozó adatok
    .sort({ letrehozva: -1 });                       // Legújabbak előre
  
  // Log metódus vége
  console.log('javaslatRepository.findBySzuloId - VÉGE', { 
    javaslatok: javaslatok.length 
  });
  
  return javaslatok;
}

/**
 * ----- JAVASLAT SZÜLŐJÉNEK FRISSÍTÉSE -----
 * ÚJ FÜGGVÉNY: Törlési kaszkádhoz szükséges
 * Egy javaslat szülőjének módosítása
 * @param {string} javaslatId - Javaslat MongoDB ObjectId-ja
 * @param {string|null} ujSzuloId - Új szülő ObjectId-ja (lehet null)
 * @param {string|null} ujSzuloTipus - Új szülő típusa (lehet null)
 * @returns {Promise<Object|null>} Frissített javaslat vagy null
 */
async updateSzuloId(javaslatId, ujSzuloId, ujSzuloTipus) {
  // Log metódus kezdete
  console.log('javaslatRepository.updateSzuloId - KEZDÉS', { 
    javaslatId, 
    ujSzuloId, 
    ujSzuloTipus 
  });
  
  // Javaslat szülőjének frissítése
  const frissitettJavaslat = await Javaslat.findByIdAndUpdate(
    javaslatId,                                       // Keresési feltétel: ID
    { 
      $set: { 
        szuloId: ujSzuloId,                          // Új szülő ID
        szuloTipus: ujSzuloTipus                     // Új szülő típus
      } 
    },
    { new: true }                                    // Frissített dokumentumot ad vissza
  );
  
  // Log metódus vége
  console.log('javaslatRepository.updateSzuloId - VÉGE', { 
    frissitettJavaslat: !!frissitettJavaslat 
  });
  
  return frissitettJavaslat;
}

// ----- TÖREDÉKCSOPORT JAVASLATOK LEKÉRÉSE -----
// Egy töredékcsoport összes aktív javaslatának lekérése
// param: string toredekCsoportId - A töredékcsoport azonosítója
// returns: Promise<Array> - Az aktív töredékjavaslatok tömbje
async findByToredekCsoportId(toredekCsoportId) {
  // Log a metódus elejére az értékekkel
  console.log('findByToredekCsoportId - KEZDÉS', { toredekCsoportId });

  // Validáció - a töredékcsoport azonosítója kötelező
  if (!toredekCsoportId) {
    throw new Error('A töredékcsoport azonosítója kötelező');
  }

  // Lekérdezzük az összes Aktiv státuszú töredékjavaslatot ebből a csoportból
  const toredekek = await Javaslat
    .find({
      toredekCsoportId: toredekCsoportId, // Csak ebből a csoportból
      statusz: 'Aktiv',                   // Csak aktív javaslatok
    })
    .populate('letrehozo', 'eemberNev') // Létrehozó adatainak betöltése
    .lean(); // Egyszerű JavaScript objektumként adjuk vissza (gyorsabb)

  // Log a metódus végére az eredménnyel
  console.log('findByToredekCsoportId - VÉGE', {
    toredekCsoportId,
    talaltak: toredekek.length, // Hány töredéket találtunk
  });

  return toredekek; // Visszaadjuk a töredékek tömbjét
}

  // ----- ÖSSZES JAVASLAT SZÁMA -----
  // A platform-statisztika (alsó sáv) használja. Szűrés nélkül minden javaslatot számol.
  // @returns {Promise<number>}
  async countAll() {
    console.log('javaslatRepository.countAll - KEZDÉS');
    const szam = await Javaslat.countDocuments();
    console.log('javaslatRepository.countAll - VÉGE', { szam });
    return szam;
  }

}

// ===================================
// REPOSITORY EXPORTÁLÁSA
// ===================================
// Repository exportálása
module.exports = new JavaslatRepository();
