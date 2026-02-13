// backend/models/ember.js

// ===== MONGOOSE IMPORTÁLÁSA =====
// Mongoose: MongoDB adatbázis kezelésére szolgáló library
const mongoose = require('mongoose');

// ===== EMBER SÉMA DEFINIÁLÁSA =====
// A Schema meghatározza az adatszerkezetet és validációs szabályokat
const emberSchema = new mongoose.Schema({

  // ----- EMBERNÉV MEZŐ -----
  emberNev: { 
    type: String,           // Szöveges típus
    required: true,         // Kötelező mező 
    unique: true,           // Egyedi érték 
    trim: true,             // Levágja a felesleges szóközöket elejéről és végéről
    minlength: 3,           // Minimum 3 karakter hosszú
    maxlength: 30           // Maximum 30 karakter hosszú
  },

  // ----- EMAIL MEZŐ -----
  email: { 
    type: String,           // Szöveges típus
    required: true,         // Kötelező mező 
    unique: true,           // Egyedi érték 
    trim: true,             // Levágja a felesleges szóközöket
    lowercase: true         // Automatikusan kisbetűssé alakítja
  },

  // ----- JELSZÓ MEZŐ -----
  jelszo: { 
    type: String,           // Szöveges típus
    required: true,         // Kötelező mező 
    minlength: 6            // Minimum 6 karakter hosszú 
  },

  // ----- NÉV MEZŐ -----
  // A ember valódi neve 
  nev: { 
    type: String,           // Szöveges típus
    required: true,         // Kötelező mező
    trim: true              // Levágja a felesleges szóközöket
  },
  
  // ----- LOKÁCIÓ BEÁGYAZOTT OBJEKTUM -----
  // Földrajzi elhelyezkedés tárolása (3 szintű: ország/régió/település)
  lokacio: {
    orszag: {               // Ország mező
      type: String,         // Szöveges típus
      required: true        // Kötelező mező
    },
    regio: {                // Régió/megye mező
      type: String,         // Szöveges típus
      required: true        // Kötelező mező
    },
    telepules: {            // Település/város mező
      type: String,         // Szöveges típus
      required: true        // Kötelező mező
    }
  },

  // ----- TUDATPONTOK -----
  // A ember tudatpontjainak száma
  // Regisztrációkor minden ember 10.000 tudatpontot kap
  tudatpontok: {
    type: Number,           // Szám típus
    default: 10000,         // Alapértelmezett érték: 10.000 tudatpont
    min: 0                  // Minimum érték: nem lehet negatív
  },

  // ----- LÉTREHOZÁS DÁTUMA -----
  // Amikor a ember regisztrált
  letrehozva: { 
    type: Date,             // Dátum típus
    default: Date.now       // Alapértelmezett: jelenlegi időpont
  },

  // ----- UTOLSÓ BEJELENTKEZÉS -----
  // Amikor a ember utoljára bejelentkezett
  utolsoBejelentkezes: { 
    type: Date,             // Dátum típus
    default: null           // Alapértelmezett: null (még nem jelentkezett be)
  }

}); 

// ===== MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA =====
// A model a séma alapján létrehozott adatbázis kollekció
// 'Ember' = model neve, emberSchema = séma definíció
const Ember = mongoose.model('Ember', emberSchema);

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = Ember;
