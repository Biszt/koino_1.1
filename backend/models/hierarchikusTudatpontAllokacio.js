// backend/models/hierarchikusTudatpontAllokacio.js

// MONGOOSE IMPORTÁLÁSA
// Mongoose - MongoDB adatbázis kezelésre szolgáló library
const mongoose = require('mongoose');

// HIERARCHIKUS TUDATPONT ALLOKÁCIÓ SÉMA DEFINÍCIÓJA
// Ez a séma tárolja az entitások összesített (saját + leszármazottak) tudatpontjait
const hierarchikusTudatpontAllokaciSchema = new mongoose.Schema({
  // ----- ENTITÁS AZONOSÍTÓ -----
  // Melyik entitásra vonatkozik ez a hierarchikus allokáció
  entitasId: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
    required: true, // Kötelező mező
    index: true // Indexelve a gyors kereséshez
  },

  // ----- ENTITÁS TÍPUSA -----
  // Milyen típusú entitás ez (Tartalom, Kategória, stb.)
  entitasTipus: {
    type: String, // Szöveges típus
    required: true, // Kötelező mező
    enum: ['Tartalom', 'Kategoria', 'TartalomTipus', 'Javaslat', 'Egyezmeny'], // Engedélyezett típusok
    trim: true // Levágja a felesleges szóközöket
  },

  // ----- HIERARCHIKUS ÖSSZPONTSZÁM -----
  // Az entitás saját tudatpontjai + minden leszármazottjának tudatpontjai
  // Cache-elt érték - real-time frissül minden tudatpont változásnál
  hierarchikusOsszesPont: {
    type: Number, // Számérték típus
    required: true, // Kötelező mező
    default: 0, // Alapértelmezett érték 0
    min: 0 // Nem lehet negatív
  },

  // ----- LÉTREHOZÁS DÁTUMA -----
  // Amikor először létrejött ez a rekord
  letrehozva: {
    type: Date, // Dátum típus
    default: Date.now // Alapértelmezett: jelenlegi időpont
  },

  // ----- FRISSÍTÉS DÁTUMA -----
  // Amikor utoljára frissítettük ezt a rekordot
  frissitve: {
    type: Date, // Dátum típus
    default: Date.now // Alapértelmezett: jelenlegi időpont
  }
});

// INDEXEK LÉTREHOZÁSA
// Compound unique index - egy entitáshoz csak egy hierarchikus allokáció tartozhat
// Ez biztosítja, hogy ne legyen duplikáció
hierarchikusTudatpontAllokaciSchema.index(
  { entitasId: 1, entitasTipus: 1 }, 
  { unique: true } // Egyedi constraint
);

// EntitasTipus index - gyors szűrés típus szerint
hierarchikusTudatpontAllokaciSchema.index({ entitasTipus: 1 });

// HierarchikusOsszesPont index - gyors rendezés pont szerint
hierarchikusTudatpontAllokaciSchema.index({ hierarchikusOsszesPont: -1 }); // Csökkenő sorrend

// PRE-SAVE MIDDLEWARE
// Automatikusan frissíti a frissitve mezőt mentés előtt
hierarchikusTudatpontAllokaciSchema.pre('save', function(next) {
  // Frissítjük a módosítás dátumát
  this.frissitve = new Date();
  // Továbblépés a mentéshez
  next();
});

// MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA
// A model a séma alapján létrehozott adatbázis kollekció
const HierarchikusTudatpontAllokacio = mongoose.model(
  'HierarchikusTudatpontAllokacio', 
  hierarchikusTudatpontAllokaciSchema
);

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = HierarchikusTudatpontAllokacio;
