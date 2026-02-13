// backend/models/kategoria.js

// ===== MONGOOSE IMPORTÁLÁSA =====
// Mongoose: MongoDB adatbázis kezelésére szolgáló library
const mongoose = require('mongoose');

// ===== KATEGÓRIA SÉMA DEFINIÁLÁSA =====
// A Schema meghatározza a kategória adatszerkezetét és validációs szabályokat
const kategoriaSchema = new mongoose.Schema({

  // ----- NÉV MEZŐ -----
  // A kategória neve (kötelező, egyedi)
  nev: { 
    type: String,           // Szöveges típus
    required: true,         // Kötelező mező
    unique: true,           // Egyedi érték - nem lehet két azonos nevű kategória
    trim: true,             // Levágja a felesleges szóközöket elejéről és végéről
    minlength: 2,           // Minimum 2 karakter hosszú
    maxlength: 50           // Maximum 50 karakter hosszú
  },

  // ----- LEÍRÁS MEZŐ -----
  // A kategória részletes leírása (opcionális)
  leiras: { 
    type: String,           // Szöveges típus
    required: false,        // Nem kötelező mező
    default: '',            // Alapértelmezett érték: üres string
    trim: true,             // Levágja a felesleges szóközöket
    maxlength: 500          // Maximum 500 karakter hosszú
  },

  // ----- SZÍN MEZŐ -----
  // A kategória megjelenítési színe hexadecimális formátumban
  szin: { 
    type: String,           // Szöveges típus
    required: true,         // Kötelező mező
    trim: true,             // Levágja a felesleges szóközöket
    default: '#4a7c59',     // Alapértelmezett érték: erdőzöld szín
    match: /^#[0-9A-Fa-f]{6}$/  // Validáció: csak hexadecimális színkód (#RRGGBB formátum)
  },

  // ----- LÉTREHOZÓ EMBER -----
  // Ki hozta létre ezt a kategóriát
  letrehozo: { 
    type: mongoose.Schema.Types.ObjectId,  // MongoDB ObjectId típus
    ref: 'Ember',                     // Referencia a Ember modellre
    required: true                          // Kötelező mező
  },

  // ----- LÉTREHOZÁS DÁTUMA -----
  // Amikor a kategória létrejött
  letrehozva: { 
    type: Date,             // Dátum típus
    default: Date.now       // Alapértelmezett: jelenlegi időpont
  }

});

// ===== INDEXEK LÉTREHOZÁSA =====
// Az indexek gyorsítják az adatbázis lekérdezéseket

// Létrehozó indexelése - gyors keresés ember kategóriái alapján
kategoriaSchema.index({ letrehozo: 1 });

// Létrehozás dátuma indexelése - gyors időrendi rendezés
kategoriaSchema.index({ letrehozva: -1 });

// ===== MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA =====
// A model a séma alapján létrehozott adatbázis kollekció
// 'Kategoria' = model neve, kategoriaSchema = séma definíció
const Kategoria = mongoose.model('Kategoria', kategoriaSchema);

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = Kategoria;
