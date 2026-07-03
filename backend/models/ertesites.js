// backend/models/Ertesites.js

// A mongoose könyvtár importálása, ami a MongoDB-vel való kommunikációt kezeli
const mongoose = require('mongoose');

// Az engedélyezett értesítési típusok – ugyanaz a lista, mint az ErtesitesiBeallitas modellben
// Fontos, hogy ez a két lista mindig szinkronban legyen egymással
const ERTESITES_TIPUSOK = [
  'ujJavaslat',          // Új javaslat érkezett az entitásra
  'javaslatElfogadas',   // Javaslat végrehajtódott
  'javaslatElvetve',     // Javaslat nem lépett hatályba
  'szavazatErkezett',    // Valaki szavazott egy javaslatra
  'szavazasiHatarido',   // Szavazási határidő közeleg
  'tudatpontValtozas',   // Tudatpont elmozdulás történt az entitáson
  'ujGyerekEntitas',     // Új gyerek entitás jött létre az entitás alatt
];

// Az engedélyezett entitás típusok – szintén azonos az ErtesitesiBeallitas modellel
const ENTITAS_TIPUSOK = ['Tartalom', 'Kategoria', 'TartalomTipus', 'Javaslat', 'Egyezmeny'];

// Az Ertesites séma definiálása
// Minden rekord egy konkrét, már kiküldött értesítést jelent egy adott eEmbernek
const ertesitesSchema = new mongoose.Schema(
  {
    // Az eEmber azonosítója, akinek ez az értesítés szól
    eEmberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'eEmber',
      required: [true, 'Az eEmber azonosítója kötelező'],
    },

    // Az értesítés típusa – megmondja, mi történt
    tipus: {
      type: String,
      enum: {
        values: ERTESITES_TIPUSOK,
        message: 'Érvénytelen értesítési típus: {VALUE}',
      },
      required: [true, 'Az értesítés típusa kötelező'],
    },

    // Annak az entitásnak az azonosítója, amelyen az esemény történt
    entitasId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Az entitás azonosítója kötelező'],
      // Nincs 'ref', mert különböző típusú entitásokra mutathat
    },

    // Az entitás típusa – megmondja, melyik kollekcióban keressük az entitasId-t
    entitasTipus: {
      type: String,
      enum: {
        values: ENTITAS_TIPUSOK,
        message: 'Érvénytelen entitás típus: {VALUE}',
      },
      required: [true, 'Az entitás típusa kötelező'],
    },

    // Esemény-specifikus adatok szabad formátumban
    // Pl. ujJavaslat esetén: { javaslatId: ObjectId, javaslatTipus: 'modositas' }
    // Pl. tudatpontValtozas esetén: { regiErtek: 5, ujErtek: 8, valtozas: 3 }
    // Pl. javaslatElfogadas esetén: { javaslatId: ObjectId }
    // Mixed típus: bármilyen objektumot tárolhat, nincs séma-kötöttsége
    adatok: {
      type: mongoose.Schema.Types.Mixed,
      default: {}, // Alapból üres objektum
    },

    // Olvasott állapot – false: olvasatlan (piros pont), true: már látta az eEmber
    olvasva: {
      type: Boolean,
      default: false, // Minden új értesítés olvasatlanként jön létre
    },

    // Az olvasás időpontja – null amíg nem olvasta el
    olvasvaIdopont: {
      type: Date,
      default: null,
    },
  },
  {
    // timestamps: true automatikusan kezeli a createdAt és updatedAt mezőket
    // createdAt = az értesítés kiküldésének időpontja
    timestamps: true,
  }
);

// INDEX 1: Egy eEmber olvasatlan értesítéseinek gyors lekéréséhez
// Ez a leggyakoribb lekérdezés: "hány olvasatlan értesítésem van?"
ertesitesSchema.index({ eEmberId: 1, olvasva: 1 });

// INDEX 2: Egy eEmber összes értesítése időrendben (postafiók nézet)
// A -1 a createdAt-nél csökkenő sorrendet jelent (legújabb elöl)
ertesitesSchema.index({ eEmberId: 1, createdAt: -1 });

// INDEX 3: Egy konkrét entitáshoz kapcsolódó összes értesítés lekéréséhez
// Pl. ha törölni kell egy entitást, és az összes kapcsolódó értesítést is törölni kell
ertesitesSchema.index({ entitasId: 1, entitasTipus: 1 });

// A modell exportálása
// Az első paraméter ('Ertesites') lesz a MongoDB kollekció neve (kisbetűsítve: ertesites)
module.exports = mongoose.model('Ertesites', ertesitesSchema);