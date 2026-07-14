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
];

// Az engedélyezett entitás típusok listája
// Ezek azok az entitástípusok, amelyeken értesítési beállítást lehet elhelyezni
const ENTITAS_TIPUSOK = ['Tartalom', 'Kategoria', 'TartalomTipus', 'Javaslat', 'Egyezmeny' ];

// Az ErtesitesiBeallitas séma definiálása
// Ez írja le, hogy egy adatbázis rekord milyen mezőkből áll
const ertesitesiBeallitasSchema = new mongoose.Schema(
  {
    // Az eEmber azonosítója, akinek a beállítása ez
    eEmberId: {
      type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
      ref: 'eEmber',                        // Hivatkozás az eEmber kollekcióra
      required: [true, 'Az eEmber azonosítója kötelező'], // Kötelező mező, hibaüzenettel
    },

    // Annak az entitásnak az azonosítója, amelyre a beállítás vonatkozik
    entitasId: {
      type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
      required: [true, 'Az entitás azonosítója kötelező'], // Kötelező mező
      // Nincs 'ref', mert különböző típusú entitásokra mutathat (Tartalom, Kategoria stb.)
    },

    // Az entitás típusa – ez mondja meg, melyik kollekcióban kell keresni az entitasId-t
    entitasTipus: {
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
      sajatDirekt:   { type: Number, min: [1, 'Legalább 1 pont'], default: null },
      sajatSzazalek: { type: Number, min: [1, 'Legalább 1%'], max: [100, 'Legfeljebb 100%'], default: null },
      osszDirekt:    { type: Number, min: [1, 'Legalább 1 pont'], default: null },
      osszSzazalek:  { type: Number, min: [1, 'Legalább 1%'], max: [100, 'Legfeljebb 100%'], default: null },
    },

    // Ha true, akkor ezen az entitáson (és leszármazottain) teljesen kikapcsol az értesítés
    // Ez lehetővé teszi, hogy egy ágat teljes csendbe lehessen állítani
    kikapcsolva: {
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

// A modell exportálása, hogy más fájlokból is importálható legyen
// Az első paraméter ('ErtesitesiBeallitas') lesz a MongoDB kollekció neve (kisbetűsítve: ertesitesibeallitas)
module.exports = mongoose.model('ErtesitesiBeallitas', ertesitesiBeallitasSchema);