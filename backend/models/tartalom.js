// backend/models/tartalom.js

// ===== MONGOOSE IMPORTÁLÁSA =====
// Mongoose: MongoDB adatbázis kezelésére szolgáló library
const mongoose = require('mongoose');

// ===== TARTALOM SÉMA DEFINIÁLÁSA =====
// A Schema meghatározza a tartalom adatszerkezetét és validációs szabályokat
const tartalomSchema = new mongoose.Schema({

  // ----- CÍM MEZŐ -----
  // A tartalom címe (kötelező)
  cim: {
    type: String,           // Szöveges típus
    required: true,         // Kötelező mező
    trim: true              // Levágja a felesleges szóközöket elejéről és végéről
  },

  // ----- SZÖVEG MEZŐ -----
  // A tartalom szöveges tartalma (opcionális)
  szoveg: {
    type: String,           // Szöveges típus
    required: false,        // Nem kötelező mező
    default: '',            // Alapértelmezett érték: üres string
    trim: true              // Levágja a felesleges szóközöket
  },

  // ----- TARTALOM TÍPUS AZONOSÍTÓ -----
  // Referencia a TartalomTipus modellre (pl. poszt, komment, stb.)
  tartalomTipusId: {
    type: mongoose.Schema.Types.ObjectId,  // MongoDB ObjectId típus
    ref: 'TartalomTipus',                   // Referencia a TartalomTipus modellre
    required: false                         // Nem kötelező mező
  },

  // ----- KATEGÓRIA AZONOSÍTÓK (MAXIMUM 3) -----
  // Tömb, amely maximum 3 kategória referenciát tárolhat
  kategoriaIds: {
    type: [{                               // ObjectId tömb típus
      type: mongoose.Schema.Types.ObjectId, // Tömb elemek típusa: ObjectId
      ref: 'Kategoria'                     // Referencia a Kategoria modellre
    }],
    default: [],                           // Alapértelmezett: üres tömb
    validate: {                            // Egyéni validáció
      validator: function(kategoriak) {
        // 1. Maximum 3 kategória lehet
        if (kategoriak.length > 3) {
          return false;
        }
        
        // 2. Ellenőrizzük, hogy nincsenek duplikációk
        const egyediKategoriak = new Set(kategoriak.map(k => k.toString()));
        return egyediKategoriak.size === kategoriak.length;
      },
      message: 'Maximum 3 különböző kategória rendelhető egy tartalomhoz.'
    }
  },

  // ----- SZÜLŐ TARTALOM AZONOSÍTÓ ----- 
// MÓDOSÍTVA: Nem csak Tartalom lehet szülő, hanem Javaslat és Egyezmény is
szuloId: {
  type: mongoose.Schema.Types.ObjectId,  // MongoDB ObjectId típus - bármilyen entitás lehet
  default: null                          // Alapértelmezett: nincs szülő (főtartalom)
},

// ----- SZÜLŐ TÍPUSA ----- 
szuloTipus: {
  type: String,                                           // Szöveges típus
  enum: ['Tartalom', 'Javaslat', 'Egyezmeny'],           // Engedélyezett értékek
  default: null,                                          // Alapértelmezett: nincs szülő típus
  validate: {
    validator: function(value) {
      // Ha van szuloId, akkor szuloTipus kötelező
      if (this.szuloId && !value) {
        return false;
      }
      // Ha nincs szuloId, akkor szuloTipus nem lehet
      if (!this.szuloId && value) {
        return false;
      }
      return true;
    },
    
    message: 'A szuloId és szuloTipus mezők konzisztenciája sérült. Ha van szuloId, akkor szuloTipus is kötelező, és fordítva.'
  }
},


  // ----- LÉTREHOZÓ EMBER -----
  // Ki hozta létre ezt a tartalmat
  letrehozo: {
    type: mongoose.Schema.Types.ObjectId,  // MongoDB ObjectId típus
    ref: 'Ember',                    // Referencia a Ember modellre
    required: true                         // Kötelező mező
  },

  // ----- STÁTUSZ MEZŐ -----
  // A tartalom láthatósági állapota
  statusz: {
    type: String,                          // Szöveges típus
    enum: ['Lathato', 'Lathatatlan', 'Takart'],  // Engedélyezett értékek
    default: 'Lathato'                     // Alapértelmezett: látható
  },

  // ----- LÉTREHOZÁS DÁTUMA -----
  // Amikor a tartalom létrejött
  letrehozva: {
    type: Date,                            // Dátum típus
    default: Date.now                      // Alapértelmezett: jelenlegi időpont
  }

});

// ===== INDEXEK LÉTREHOZÁSA =====
// Az indexek gyorsítják az adatbázis lekérdezéseket

// Tartalom típus indexelése - gyors szűrés típus szerint
tartalomSchema.index({ tartalomTipusId: 1 });

// Szülő tartalom indexelése - gyors lekérdezés válaszok/kommentek esetén
tartalomSchema.index({ szuloId: 1 });

// Gyors keresés: "Egy javaslat alatti összes tartalom"
tartalomSchema.index({ szuloId: 1, szuloTipus: 1 });

// Gyors keresés: "Egy tartalom alatti látható tartalmak"
tartalomSchema.index({ szuloId: 1, statusz: 1 });

// Létrehozó indexelése - gyors keresés ember tartalmai alapján
tartalomSchema.index({ letrehozo: 1 });

// Kategória indexelése - gyors kategória szerinti szűrés (tömb elemek indexelése)
tartalomSchema.index({ kategoriaIds: 1 });

// Státusz indexelése - gyors szűrés láthatóság szerint
tartalomSchema.index({ statusz: 1 });

// ===== MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA =====
// A model a séma alapján létrehozott adatbázis kollekció
// 'Tartalom' = model neve, tartalomSchema = séma definíció
const Tartalom = mongoose.model('Tartalom', tartalomSchema);

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = Tartalom;