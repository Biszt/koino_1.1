// backend/models/tartalomErtekHisztogram.js

// ===================================
// MONGOOSE IMPORTÁLÁSA
// ===================================
// Mongoose - MongoDB adatbázis kezelésre szolgáló library
const mongoose = require('mongoose');

// ===================================
// TARTALOM ÉRTÉK HISZTOGRAM SÉMA DEFINÍCIÓJA
// ===================================
// Aggregált adatok tárolása - hány ember javasol adott értéket
// Ez egy cache réteg, ami gyorsítja a medián számítást
const tartalomErtekHisztogramSchema = new mongoose.Schema({

  // ----- TARTALOM AZONOSÍTÓ -----
  // Melyik tartalomhoz tartoznak ezek az aggregált adatok
  tartalomId: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
    ref: 'Tartalom', // Referencia a Tartalom modellre
    required: true, // Kötelező mező
    unique: true, // Egy tartalomhoz csak egy hisztogram
    index: true // Indexelve a gyors kereséshez
  },

  // ----- ERTEK JAVASLAT ELFOGADÁSI KÜSZÖB HISZTOGRAM -----
  // Bucket-ek: hány ember javasol 51, 52, ..., 100-ot
  // Kulcs: a százalék érték (string), érték: emberek száma (number)
  javaslatElfogadasiKuszobHisztogram: {
    type: Map, // Map típus (kulcs-érték párok)
    of: Number, // Az értékek számok lesznek
    default: () => {
      // Alapértelmezett: üres Map
      const map = new Map();
      // Előre inicializáljuk az összes bucket-et 0-val (51-100)
      for (let i = 51; i <= 100; i++) {
        map.set(i.toString(), 0); // Kulcs: string, érték: 0
      }
      return map;
    }
  },

  // ----- RÉSZVÉTELI ARÁNY KÜSZÖB HISZTOGRAM -----
  // Bucket-ek: hány ember javasol 0, 1, ..., 100-ot
  // Kulcs: a százalék érték (string), érték: emberek száma (number)
  reszveteliAranyKuszobHisztogram: {
    type: Map, // Map típus (kulcs-érték párok)
    of: Number, // Az értékek számok lesznek
    default: () => {
      // Alapértelmezett: üres Map
      const map = new Map();
      // Előre inicializáljuk az összes bucket-et 0-val (0-100)
      for (let i = 0; i <= 100; i++) {
        map.set(i.toString(), 0); // Kulcs: string, érték: 0
      }
      return map;
    }
  },

  // ----- MINIMUM DÖNTÉSI IDŐ HISZTOGRAM -----
  // Bucket-ek: hány ember javasol adott alsó határ értékeket
  // 515 bucket (0-315360000 mp) - időhezBucketKulcs() szerinti kulcsok
  // Kulcs: bucket kulcs (string), érték: emberek száma (number)
  minimumDontesiIdoHisztogram: {
    type: Map, // Map típus (kulcs-érték párok)
    of: Number, // Az értékek számok lesznek
    default: () => new Map() // Alapértelmezett: üres Map (bucket-ek dinamikusan jönnek létre)
  },

  // ----- MAXIMUM DÖNTÉSI IDŐ HISZTOGRAM -----
  // Bucket-ek: hány ember javasol adott felső határ értékeket
  // 515 bucket (0-315360000 mp) - időhezBucketKulcs() szerinti kulcsok
  // Kulcs: bucket kulcs (string), érték: emberek száma (number)
  maximumDontesiIdoHisztogram: {
    type: Map, // Map típus (kulcs-érték párok)
    of: Number, // Az értékek számok lesznek
    default: () => new Map() // Alapértelmezett: üres Map (bucket-ek dinamikusan jönnek létre)
  },

  // ----- AKTUÁLIS ERTEK JAVASLAT ELFOGADÁSI KÜSZÖB -----
  // Cache-elt medián érték - gyors lekéréshez
  // Ezt a hisztogramból számoljuk ki
  aktualJavaslatElfogadasiKuszob: {
    type: Number, // Szám típus
    required: true, // Kötelező mező
    min: 51, // Minimum érték: 51
    max: 100 // Maximum érték: 100
  },

  // ----- AKTUÁLIS RÉSZVÉTELI ARÁNY KÜSZÖB -----
  // Cache-elt medián érték - gyors lekéréshez
  // Ezt a hisztogramból számoljuk ki
  aktualReszveteliAranyKuszob: {
    type: Number, // Szám típus
    required: true, // Kötelező mező
    min: 0, // Minimum érték: 0
    max: 100 // Maximum érték: 100
  },

  // ----- AKTUÁLIS MINIMUM DÖNTÉSI IDŐ -----
  // Cache-elt medián érték - gyors lekéréshez
  // Ezt a hisztogramból számoljuk ki (másodpercben)
  aktualMinimumDontesiIdo: {
    type: Number, // Szám típus
    required: true, // Kötelező mező
    default: 0, // Alapértelmezett: 0 mp
    min: 0 // Minimum érték: 0 mp
  },

  // ----- AKTUÁLIS MAXIMUM DÖNTÉSI IDŐ -----
  // Cache-elt medián érték - gyors lekéréshez
  // Ezt a hisztogramból számoljuk ki (másodpercben)
  aktualMaximumDontesiIdo: {
    type: Number, // Szám típus
    required: true, // Kötelező mező
    default: 31536000, // Alapértelmezett: 31536000 mp (1 év)
    min: 0, // Minimum érték: 0 mp
    max: 315360000 // Maximum érték: 315360000 mp (10 év)
  },

  // ----- ÖSSZ ÉRTÉK JAVASLATOK SZÁMA -----
  // Hány ember adott összesen érték javaslatot
  osszesErtekJavaslat: {
    type: Number, // Szám típus
    default: 0, // Alapértelmezett: 0
    min: 0 // Nem lehet negatív
  },

  // ----- UTOLSÓ FRISSÍTÉS DÁTUMA -----
  // Amikor utoljára frissítették ezt a hisztogramot
  utolsoFrissites: {
    type: Date, // Dátum típus
    default: Date.now // Alapértelmezett: jelenlegi időpont
  }
});

// ===================================
// INDEXEK LÉTREHOZÁSA
// ===================================

// TartalomId unique index - egy tartalomhoz csak egy hisztogram
tartalomErtekHisztogramSchema.index({ tartalomId: 1 }, { unique: true });

// ===================================
// HELPER METÓDUSOK
// ===================================

// ----- BUCKET ÉRTÉK LEKÉRÉSE -----
/**
 * Segédmetódus egy adott bucket értékének lekéréséhez
 * @param {string} hisztogramNev - 'javaslatElfogadasiKuszobHisztogram' vagy 'reszveteliAranyKuszobHisztogram' stb.
 * @param {string} ertek - a keresett érték (string)
 * @returns {number} A bucket értéke (vagy 0 ha nincs)
 */
tartalomErtekHisztogramSchema.methods.getBucket = function(hisztogramNev, ertek) {
  const hisztogram = this[hisztogramNev]; // Map lekérése
  return hisztogram.get(ertek.toString()) || 0; // Érték lekérése, vagy 0 ha nincs
};

// ----- BUCKET ÉRTÉK BEÁLLÍTÁSA -----
/**
 * Segédmetódus egy adott bucket értékének módosításához
 * @param {string} hisztogramNev - 'javaslatElfogadasiKuszobHisztogram' vagy 'reszveteliAranyKuszobHisztogram' stb.
 * @param {string} ertek - a százalék/érték (string)
 * @param {number} darabszam - hány ember (number)
 */
tartalomErtekHisztogramSchema.methods.setBucket = function(hisztogramNev, ertek, darabszam) {
  const hisztogram = this[hisztogramNev]; // Map lekérése
  hisztogram.set(ertek.toString(), darabszam); // Érték beállítása
};

// ----- BUCKET NÖVELÉSE -----
/**
 * Segédmetódus egy bucket értékének növeléséhez (+1)
 * @param {string} hisztogramNev - 'javaslatElfogadasiKuszobHisztogram' vagy 'reszveteliAranyKuszobHisztogram' stb.
 * @param {string} ertek - a százalék/érték (string)
 */
tartalomErtekHisztogramSchema.methods.novelBucket = function(hisztogramNev, ertek) {
  const jelenlegi = this.getBucket(hisztogramNev, ertek); // Jelenlegi érték
  this.setBucket(hisztogramNev, ertek, jelenlegi + 1); // +1
};

// ----- BUCKET CSÖKKENTÉSE -----
/**
 * Segédmetódus egy bucket értékének csökkentéséhez (-1)
 * @param {string} hisztogramNev - 'javaslatElfogadasiKuszobHisztogram' vagy 'reszveteliAranyKuszobHisztogram' stb.
 * @param {string} ertek - a százalék/érték (string)
 */
tartalomErtekHisztogramSchema.methods.csokkentBucket = function(hisztogramNev, ertek) {
  const jelenlegi = this.getBucket(hisztogramNev, ertek); // Jelenlegi érték
  // Csak akkor csökkentjük, ha nagyobb mint 0 (nem lehet negatív)
  if (jelenlegi > 0) {
    this.setBucket(hisztogramNev, ertek, jelenlegi - 1); // -1
  }
};

// ===================================
// MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA
// ===================================

// A model a séma alapján létrehozott adatbázis kollekció
// 'TartalomErtekHisztogram' = model neve, tartalomErtekHisztogramSchema = séma definíció
const TartalomErtekHisztogram = mongoose.model('TartalomErtekHisztogram', tartalomErtekHisztogramSchema);

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = TartalomErtekHisztogram;
