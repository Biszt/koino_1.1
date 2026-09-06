// backend/models/ertesitesiBeallitas.js

// A mongoose könyvtár importálása, ami a MongoDB-vel való kommunikációt kezeli
const mongoose = require('mongoose');

// Az engedélyezett értesítési típusok listája
// Ezeket konstansként tároljuk, hogy a kódban ne kelljen "kézzel" beírni a stringeket
const ERTESITES_TIPUSOK = [
  'ujJavaslat',          // Új javaslat érkezett az entitásra
  'javaslatElfogadas',   // Javaslat végrehajtódott 
  'javaslatElvetve',     // Javaslat nem lépett hatályba 
  'szavazatErkezett',    // Valaki szavazott egy javaslatra, amelyen az eEmbernek joga van szavazni
  'szavazasiHatarido',   // Szavazási határidő közeleg (pl. 24 órán belül lejár)
  'tudatpontValtozas',   // Tudatpont elmozdulás történt az entitáson
  'ujGyerekEntitas',     // Új gyerek entitás jött létre az entitás alatt
  'kuszobValtozas',      // Az entitás érvényes küszöbértékei (mediánjai) változtak (V2)
];

// Az engedélyezett entitás típusok listája
// Ezek azok az entitástípusok, amelyeken értesítési beállítást lehet elhelyezni
const ENTITAS_TIPUSOK = ['Gondolat', 'Kategoria', 'GondolatTipus', 'Javaslat', 'Egyezmeny' ];

// Az ErtesitesiBeallitas séma definiálása
// Ez írja le, hogy egy adatbázis rekord milyen mezőkből áll
const ertesitesiBeallitasSchema = new mongoose.Schema(
  {
    // Az eEmber azonosítója, akinek a beállítása ez
    eEmberId: {
      reteg: 'helyi',  // H6
      type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
      ref: 'eEmber',                        // Hivatkozás az eEmber kollekcióra
      required: [true, 'Az eEmber azonosítója kötelező'], // Kötelező mező, hibaüzenettel
    },

    // Annak az entitásnak az azonosítója, amelyre a beállítás vonatkozik
    entitasId: {
      reteg: 'helyi',  // H6
      type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
      required: [true, 'Az entitás azonosítója kötelező'], // Kötelező mező
      // Nincs 'ref', mert különböző típusú entitásokra mutathat (Gondolat, Kategoria stb.)
    },

    // Az entitás típusa – ez mondja meg, melyik kollekcióban kell keresni az entitasId-t
    entitasTipus: {
      reteg: 'helyi',  // H6
      type: String,
      enum: {
        values: ENTITAS_TIPUSOK,
        message: 'Érvénytelen entitás típus: {VALUE}', // Hibaüzenet érvénytelen értéknél
      },
      required: [true, 'Az entitás típusa kötelező'],
    },

    // A bekapcsolt értesítési típusok tömbje
    // Pl.: ['ujJavaslat', 'javaslatElfogadas'] – csak ezekről kap értesítést
    ertesitesTipusok: {
      reteg: 'helyi',  // H6
      type: [String],
      enum: {
        values: ERTESITES_TIPUSOK,
        message: 'Érvénytelen értesítési típus: {VALUE}',
      },
      default: [], // Alapból üres tömb – opt-in rendszer: semmit sem kap, amíg be nem kapcsolja
    },

    // Tudatpont-változási küszöbök – ekkora elmozdulástól értesít a 'tudatpontValtozas'.
    // NÉGY, egymástól független küszöb, "VAGY" logikával: bármelyik megadott (nem null)
    // küszöb teljesülése aktivál; a null mezőt figyelmen kívül hagyjuk. Ha mind null →
    // minden tudatpont-változásnál értesít (ha a típus be van kapcsolva).
    //   BÁZIS:   saját  = az entitás közvetlen (saját) tudatpontja
    //            ossz   = az entitás összes (hierarchikus, leszármazottakkal) tudatpontja
    //   MÉRTÉK:  Direkt = pontszám (abszolút elmozdulás), Szazalek = a bázis %-ában
    // (A tényleges kiértékelés az eseménybekötéskor készül; itt csak a beállítás tárolódik.)
    tudatpontKuszobok: {
      sajatDirekt:   { reteg: 'helyi', type: Number, min: [1, 'Legalább 1 pont'], default: null },
      sajatSzazalek: { reteg: 'helyi', type: Number, min: [1, 'Legalább 1%'], max: [100, 'Legfeljebb 100%'], default: null },
      osszDirekt:    { reteg: 'helyi', type: Number, min: [1, 'Legalább 1 pont'], default: null },
      osszSzazalek:  { reteg: 'helyi', type: Number, min: [1, 'Legalább 1%'], max: [100, 'Legfeljebb 100%'], default: null },
    },

    // TUDATPONT-TULAJDONOSSÁGI SZŰRŐ: ha true, az e-ember CSAK akkor kap értesítést,
    // ha PONTOSAN az esemény entitásán van saját tudatpontja (nem a felmenőin!).
    // KIVÉTEL: Egyezmeny entitáson történt eseményre a szűrő NEM vonatkozik, mert
    // egyezményre nem lehet tudatpontot tenni (tudatpontHozzarendeles enum) — ott
    // a szűrő bekapcsolva is átengedi az értesítést.
    tudatpontSzuro: {
      reteg: 'helyi',  // H6
      type: Boolean,
      default: false, // Alapból kikapcsolt — minden feliratkozott esemény jön
    },

    // Ha true, akkor ezen az entitáson (és leszármazottain) teljesen kikapcsol az értesítés
    // Ez lehetővé teszi, hogy egy ágat teljes csendbe lehessen állítani
    kikapcsolva: {
      reteg: 'helyi',  // H6
      type: Boolean,
      default: false, // Alapból nem kikapcsolt
    },
  },
  {
    // timestamps: true automatikusan hozzáadja a 'createdAt' és 'updatedAt' mezőket
    // Ezek pontosan megfelelnek a 'letrehozva' és 'frissitve' fogalmainknak
    timestamps: true,
  }
);

// EGYEDI INDEX: egy eEmbernek csak egy beállítása lehet egy adott entitáson
// Ez adatbázis szinten védi meg a duplikációt
// unique: true biztosítja, hogy nem lehet két azonos (eEmberId + entitasId + entitasTipus) kombináció
ertesitesiBeallitasSchema.index(
  { eEmberId: 1, entitasId: 1, entitasTipus: 1 },
  { unique: true }
);

// LEKÉRDEZŐ INDEX: egy entitás összes beállításának gyors lekéréséhez
// Pl. amikor egy esemény történik, és tudni kell, kik figyelik ezt az entitást
ertesitesiBeallitasSchema.index({ entitasId: 1, entitasTipus: 1 });
// ===== H6 — ADAT-OSZTÁLYOZÁS: ALAPÉRTELMEZETT RÉTEG =====
// A mezők a saját `reteg` opciójukban hordozzák a besorolásukat (lásd fentebb).
// A Mongoose által AUTOMATIKUSAN felvett mezőkre (_id, createdAt, updatedAt) viszont
// nem tudunk mező-opciót tenni — rájuk ez az alapértelmezés vonatkozik.
// A működésre nincs hatása: a Mongoose ezt az opciót megőrzi, de nem használja.
// Magyarázat és a teljes besorolás: docs/adat_osztalyozas.md (H6 híd-feladat).
ertesitesiBeallitasSchema.options.retegAlapertelmezes = 'helyi';

// A modell exportálása, hogy más fájlokból is importálható legyen
// Az első paraméter ('ErtesitesiBeallitas') lesz a MongoDB kollekció neve (kisbetűsítve: ertesitesibeallitas)
module.exports = mongoose.model('ErtesitesiBeallitas', ertesitesiBeallitasSchema);