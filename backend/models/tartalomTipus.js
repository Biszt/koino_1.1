// backend/models/tartalomTipus.js

// ===== MONGOOSE IMPORTÁLÁSA =====
// Mongoose: MongoDB adatbázis kezelésére szolgáló library
const mongoose = require('mongoose');

// ===== TARTALOM TÍPUS SÉMA DEFINIÁLÁSA =====
// A Schema meghatározza a tartalom típus adatszerkezetét és validációs szabályokat
// Pl. poszt, komment, esemény, kérdés, stb.
const tartalomTipusSchema = new mongoose.Schema({

  // ----- NÉV MEZŐ -----
  // A tartalom típus neve (kötelező)
  nev: { 
    type: String,           // Szöveges típus
    required: true,         // Kötelező mező
    trim: true,             // Levágja a felesleges szóközöket elejéről és végéről
    minlength: 2,           // Minimum 2 karakter hosszú
    maxlength: 50           // Maximum 50 karakter hosszú
  },

  // ----- LEÍRÁS MEZŐ -----
  // A tartalom típus részletes leírása (opcionális)
  leiras: { 
    type: String,           // Szöveges típus
    required: false,        // Nem kötelező mező
    default: '',            // Alapértelmezett érték: üres string
    trim: true,             // Levágja a felesleges szóközöket
    maxlength: 500          // Maximum 500 karakter hosszú
  },

  // ----- IKON ÚTVONAL MEZŐ -----
  // A feltöltött ikon fájl elérési útvonala (kötelező)
  // Pl: '/uploads/icons/icon-1234567890-987654321.png'
  ikon: { 
    type: String,           // Szöveges típus
    required: true,         // Kötelező mező - minden típusnak kell legyen ikonja
    trim: true              // Levágja a felesleges szóközöket
  },

  // ----- LÉTREHOZÓ EMBER -----
  // Ki hozta létre ezt a tartalom típust
  letrehozo: { 
    type: mongoose.Schema.Types.ObjectId,  // MongoDB ObjectId típus
    ref: 'Ember',                     // Referencia a Ember modellre
    required: true                          // Kötelező mező
  },

  // ----- LÉTREHOZÁS DÁTUMA -----
  // Amikor a tartalom típus létrejött
  letrehozva: { 
    type: Date,             // Dátum típus
    default: Date.now       // Alapértelmezett: jelenlegi időpont
  }

});

// ===== INDEXEK LÉTREHOZÁSA =====
// Az indexek gyorsítják az adatbázis lekérdezéseket

// Név indexelése - gyors név szerinti keresés és egyediség ellenőrzés
tartalomTipusSchema.index({ nev: 1 });

// Létrehozó indexelése - gyors keresés ember típusai alapján
tartalomTipusSchema.index({ letrehozo: 1 });

// Létrehozás dátuma indexelése - időrendi rendezéshez
tartalomTipusSchema.index({ letrehozva: -1 });

// ===== MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA =====
// A model a séma alapján létrehozott adatbázis kollekció
// 'TartalomTipus' = model neve, tartalomTipusSchema = séma definíció
const TartalomTipus = mongoose.model('TartalomTipus', tartalomTipusSchema);

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = TartalomTipus;
