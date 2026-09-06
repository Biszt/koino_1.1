// backend/models/gondolatErtekHisztogram.js

// ===================================
// MONGOOSE IMPORTÁLÁSA
// ===================================
// Mongoose - MongoDB adatbázis kezelésre szolgáló library
const mongoose = require('mongoose');

// ===================================
// TÁMOGATOTT ENTITÁSTÍPUSOK
// ===================================
// A hisztogram (érték-rendszer) ezekre az entitásokra működik.
const ENTITAS_TIPUSOK = ['Gondolat', 'Kategoria', 'GondolatTipus'];

// ===================================
// ENTITÁS ÉRTÉK HISZTOGRAM SÉMA DEFINÍCIÓJA
// ===================================
// Aggregált adatok tárolása - hány eember javasol adott értéket egy entitáshoz
// (gondolat / kategória / gondolattípus). Cache réteg a medián számításhoz.
const gondolatErtekHisztogramSchema = new mongoose.Schema({

  // ----- ENTITÁS AZONOSÍTÓ -----
  // Melyik entitáshoz tartoznak ezek az aggregált adatok
  entitasId: {
    reteg: 'szamitott',  // H6
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
    refPath: 'entitasTipus',               // Polimorf referencia
    required: true                         // Kötelező mező
  },

  // ----- ENTITÁS TÍPUSA -----
  // Meghatározza, melyik kollekcióra mutat az entitasId.
  entitasTipus: {
    reteg: 'szamitott',  // H6
    type: String,
    enum: ENTITAS_TIPUSOK,
    required: true,
    default: 'Gondolat'
  },

  // ----- ERTEK JAVASLAT ELFOGADÁSI KÜSZÖB HISZTOGRAM -----
  // Bucket-ek: hány eember javasol 51, 52, ..., 100-ot
  // Kulcs: a százalék érték (string), érték: eemberek száma (number)
  javaslatElfogadasiKuszobHisztogram: {
    reteg: 'szamitott',  // H6
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
  // Bucket-ek: hány eember javasol 0, 1, ..., 100-ot
  // Kulcs: a százalék érték (string), érték: eemberek száma (number)
  reszveteliAranyKuszobHisztogram: {
    reteg: 'szamitott',  // H6
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
  // Bucket-ek: hány eember javasol adott alsó határ értékeket
  // 515 bucket (0-315360000 mp) - időhezBucketKulcs() szerinti kulcsok
  // Kulcs: bucket kulcs (string), érték: eemberek száma (number)
  minimumDontesiIdoHisztogram: {
    reteg: 'szamitott',  // H6
    type: Map, // Map típus (kulcs-érték párok)
    of: Number, // Az értékek számok lesznek
    default: () => new Map() // Alapértelmezett: üres Map (bucket-ek dinamikusan jönnek létre)
  },

  // ----- MAXIMUM DÖNTÉSI IDŐ HISZTOGRAM -----
  // Bucket-ek: hány eember javasol adott felső határ értékeket
  // 515 bucket (0-315360000 mp) - időhezBucketKulcs() szerinti kulcsok
  // Kulcs: bucket kulcs (string), érték: eemberek száma (number)
  maximumDontesiIdoHisztogram: {
    reteg: 'szamitott',  // H6
    type: Map, // Map típus (kulcs-érték párok)
    of: Number, // Az értékek számok lesznek
    default: () => new Map() // Alapértelmezett: üres Map (bucket-ek dinamikusan jönnek létre)
  },

  // ----- AKTUÁLIS ERTEK JAVASLAT ELFOGADÁSI KÜSZÖB -----
  // Cache-elt medián érték - gyors lekéréshez
  // Ezt a hisztogramból számoljuk ki
  aktualJavaslatElfogadasiKuszob: {
    reteg: 'szamitott',  // H6
    type: Number, // Szám típus
    required: true, // Kötelező mező
    min: 51, // Minimum érték: 51
    max: 100 // Maximum érték: 100
  },

  // ----- AKTUÁLIS RÉSZVÉTELI ARÁNY KÜSZÖB -----
  // Cache-elt medián érték - gyors lekéréshez
  // Ezt a hisztogramból számoljuk ki
  aktualReszveteliAranyKuszob: {
    reteg: 'szamitott',  // H6
    type: Number, // Szám típus
    required: true, // Kötelező mező
    min: 0, // Minimum érték: 0
    max: 100 // Maximum érték: 100
  },

  // ----- AKTUÁLIS MINIMUM DÖNTÉSI IDŐ -----
  // Cache-elt medián érték - gyors lekéréshez
  // Ezt a hisztogramból számoljuk ki (másodpercben)
  aktualMinimumDontesiIdo: {
    reteg: 'szamitott',  // H6
    type: Number, // Szám típus
    required: true, // Kötelező mező
    default: 0, // Alapértelmezett: 0 mp
    min: 0 // Minimum érték: 0 mp
  },

  // ----- AKTUÁLIS MAXIMUM DÖNTÉSI IDŐ -----
  // Cache-elt medián érték - gyors lekéréshez
  // Ezt a hisztogramból számoljuk ki (másodpercben)
  aktualMaximumDontesiIdo: {
    reteg: 'szamitott',  // H6
    type: Number, // Szám típus
    required: true, // Kötelező mező
    default: 31536000, // Alapértelmezett: 31536000 mp (1 év)
    min: 0, // Minimum érték: 0 mp
    max: 315360000 // Maximum érték: 315360000 mp (10 év)
  },

  // ----- ÖSSZ ÉRTÉK JAVASLATOK SZÁMA -----
  // Hány eember adott összesen érték javaslatot
  osszesErtekJavaslat: {
    reteg: 'szamitott',  // H6
    type: Number, // Szám típus
    default: 0, // Alapértelmezett: 0
    min: 0 // Nem lehet negatív
  },

  // ----- UTOLSÓ FRISSÍTÉS DÁTUMA -----
  // Amikor utoljára frissítették ezt a hisztogramot
  utolsoFrissites: {
    reteg: 'szamitott',  // H6
    type: Date, // Dátum típus
    default: Date.now // Alapértelmezett: jelenlegi időpont
  }
});

// ===================================
// INDEXEK LÉTREHOZÁSA
// ===================================
// Egy entitáshoz csak EGY hisztogram tartozhat → egyedi compound index az
// (entitasId, entitasTipus) páron.
gondolatErtekHisztogramSchema.index(
  { entitasId: 1, entitasTipus: 1 },
  { unique: true }
);

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
gondolatErtekHisztogramSchema.methods.getBucket = function(hisztogramNev, ertek) {
  const hisztogram = this[hisztogramNev]; // Map lekérése
  return hisztogram.get(ertek.toString()) || 0; // Érték lekérése, vagy 0 ha nincs
};

// ----- BUCKET ÉRTÉK BEÁLLÍTÁSA -----
/**
 * Segédmetódus egy adott bucket értékének módosításához
 * @param {string} hisztogramNev - 'javaslatElfogadasiKuszobHisztogram' vagy 'reszveteliAranyKuszobHisztogram' stb.
 * @param {string} ertek - a százalék/érték (string)
 * @param {number} darabszam - hány eember (number)
 */
gondolatErtekHisztogramSchema.methods.setBucket = function(hisztogramNev, ertek, darabszam) {
  const hisztogram = this[hisztogramNev]; // Map lekérése
  hisztogram.set(ertek.toString(), darabszam); // Érték beállítása
};

// ----- BUCKET NÖVELÉSE -----
/**
 * Segédmetódus egy bucket értékének növeléséhez (+1)
 * @param {string} hisztogramNev - 'javaslatElfogadasiKuszobHisztogram' vagy 'reszveteliAranyKuszobHisztogram' stb.
 * @param {string} ertek - a százalék/érték (string)
 */
gondolatErtekHisztogramSchema.methods.novelBucket = function(hisztogramNev, ertek) {
  const jelenlegi = this.getBucket(hisztogramNev, ertek); // Jelenlegi érték
  this.setBucket(hisztogramNev, ertek, jelenlegi + 1); // +1
};

// ----- BUCKET CSÖKKENTÉSE -----
/**
 * Segédmetódus egy bucket értékének csökkentéséhez (-1)
 * @param {string} hisztogramNev - 'javaslatElfogadasiKuszobHisztogram' vagy 'reszveteliAranyKuszobHisztogram' stb.
 * @param {string} ertek - a százalék/érték (string)
 */
gondolatErtekHisztogramSchema.methods.csokkentBucket = function(hisztogramNev, ertek) {
  const jelenlegi = this.getBucket(hisztogramNev, ertek); // Jelenlegi érték
  // Csak akkor csökkentjük, ha nagyobb mint 0 (nem lehet negatív)
  if (jelenlegi > 0) {
    this.setBucket(hisztogramNev, ertek, jelenlegi - 1); // -1
  }
};
// ===== H6 — ADAT-OSZTÁLYOZÁS: ALAPÉRTELMEZETT RÉTEG =====
// A mezők a saját `reteg` opciójukban hordozzák a besorolásukat (lásd fentebb).
// A Mongoose által AUTOMATIKUSAN felvett mezőkre (_id, createdAt, updatedAt) viszont
// nem tudunk mező-opciót tenni — rájuk ez az alapértelmezés vonatkozik.
// A működésre nincs hatása: a Mongoose ezt az opciót megőrzi, de nem használja.
// Magyarázat és a teljes besorolás: docs/adat_osztalyozas.md (H6 híd-feladat).
gondolatErtekHisztogramSchema.options.retegAlapertelmezes = 'szamitott';

// ===================================
// MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA
// ===================================

// A model a séma alapján létrehozott adatbázis kollekció
// 'GondolatErtekHisztogram' = model neve, gondolatErtekHisztogramSchema = séma definíció
const GondolatErtekHisztogram = mongoose.model('GondolatErtekHisztogram', gondolatErtekHisztogramSchema);

// A támogatott típusokat is exportáljuk
GondolatErtekHisztogram.ENTITAS_TIPUSOK = ENTITAS_TIPUSOK;

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = GondolatErtekHisztogram;
