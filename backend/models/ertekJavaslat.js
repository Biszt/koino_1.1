// backend/models/ertekJavaslat.js

// ===================================
// MONGOOSE IMPORTÁLÁSA
// ===================================
// Mongoose - MongoDB adatbázis kezelésre szolgáló library
const mongoose = require('mongoose');

// ===================================
// ÉRTÉK ERTEK JAVASLAT SÉMA DEFINÍCIÓJA
// ===================================
// Egyéni eemberi érték javaslatok tárolása egy tartalom küszöbértékeihez
const ertekJavaslatSchema = new mongoose.Schema({

  // ----- TARTALOM AZONOSÍTÓ -----
  // Melyik tartalomhoz tartozik ez az érték javaslat
  tartalomId: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
    ref: 'Tartalom', // Referencia a Tartalom modellre
    required: true // Kötelező mező
    // Index: lásd ertekJavaslatSchema.index({ tartalomId: 1 }) lejjebb
  },

  // ----- EMBER AZONOSÍTÓ -----
  // Ki adta ezt az érték javaslatot
  eemberId: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
    ref: 'eEmber', // Referencia a eEmber modellre
    required: true // Kötelező mező
    // Index: lásd ertekJavaslatSchema.index({ eemberId: 1 }) lejjebb
  },

  // -----ÉRTÉK ERTEK JAVASLAT ELFOGADÁSI KÜSZÖB-----
  // eEmber által javasolt érték (51-100)
  javaslatElfogadasiKuszob: {
    type: Number, // Szám típus
    required: true, // Kötelező mező
    min: 51, // Minimum érték: 51
    max: 100, // Maximum érték: 100
    validate: {
      validator: Number.isInteger, // Ellenőrzi, hogy egész szám-e
      message: 'Az érték javaslat elfogadási küszöbnek egész számnak kell lennie'
    }
  },

  // ----- RÉSZVÉTELI ARÁNY KÜSZÖB ERTEK JAVASLAT -----
  // eEmber által javasolt érték (0-100)
  reszveteliAranyKuszob: {
    type: Number, // Szám típus
    required: true, // Kötelező mező
    min: 0, // Minimum érték: 0
    max: 100, // Maximum érték: 100
    validate: {
      validator: Number.isInteger, // Ellenőrzi, hogy egész szám-e
      message: 'A részvételi arány küszöbnek egész számnak kell lennie'
    }
  },

  // ----- MINIMUM DÖNTÉSI IDŐ ERTEK JAVASLAT -----
  // eEmber által javasolt alsó határ másodpercben (0-31536000)
  minimumDontesiIdo: {
    type: Number, // Szám típus
    required: true, // Kötelező mező
    default: 0, // Alapértelmezett: 0 mp (azonnali végrehajtás lehetséges)
    min: 0, // Minimum érték: 0 mp
    validate: {
      validator: Number.isInteger, // Ellenőrzi, hogy egész szám-e
      message: 'A minimum döntési időnek egész számnak kell lennie'
    }
  },

  // ----- MAXIMUM DÖNTÉSI IDŐ ERTEK JAVASLAT -----
  // eEmber által javasolt felső határ másodpercben (0-315360000)
  maximumDontesiIdo: {
    type: Number, // Szám típus
    required: true, // Kötelező mező
    default: 31536000, // Alapértelmezett: 31536000 mp (1 év)
    min: 0, // Minimum érték: 0 mp
    max: 315360000, // Maximum érték: 315360000 mp (10 év)
    validate: {
      validator: Number.isInteger, // Ellenőrzi, hogy egész szám-e
      message: 'A maximum döntési időnek egész számnak kell lennie'
    }
  },

  // ----- LÉTREHOZÁS DÁTUMA -----
  // Amikor az érték javaslat először létrejött
  letrehozva: {
    type: Date, // Dátum típus
    default: Date.now // Alapértelmezett: jelenlegi időpont
  },

  // ----- MÓDOSÍTÁS DÁTUMA -----
  // Amikor a eember utoljára módosította az érték javaslatát
  modositva: {
    type: Date, // Dátum típus
    default: Date.now // Alapértelmezett: jelenlegi időpont
  }
});

// ===================================
// INDEXEK LÉTREHOZÁSA
// ===================================

// Compound index - egy eember csak egyszer javasolhat egy tartalomhoz
// Ez biztosítja, hogy ne legyen duplikált rekord
ertekJavaslatSchema.index(
  { tartalomId: 1, eemberId: 1 },
  { unique: true } // Egyedi constraint
);

// TartalomId index - gyors lekérdezés egy tartalom összes érték javaslatához
ertekJavaslatSchema.index({ tartalomId: 1 });

// eEmberId index - gyors lekérdezés egy eember összes érték javaslatához
ertekJavaslatSchema.index({ eemberId: 1 });

// ===================================
// PRE-SAVE HOOK
// ===================================

// Módosítás dátumának automatikus frissítése mentés előtt
ertekJavaslatSchema.pre('save', function(next) {
  // Ha ez egy módosítás (nem új dokumentum)
  if (!this.isNew) {
    this.modositva = new Date(); // Frissítjük a módosítás dátumát
  }
  next(); // Továbblépés a mentéshez
});

// ===================================
// MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA
// ===================================

// A model a séma alapján létrehozott adatbázis kollekció
// 'ErtekJavaslat' = model neve, ertekJavaslatSchema = séma definíció
const ErtekJavaslat = mongoose.model('ErtekJavaslat', ertekJavaslatSchema);

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = ErtekJavaslat;
