// backend/models/szavazat.js

// ===================================
// MONGOOSE IMPORTÁLÁSA
// ===================================
// Mongoose - MongoDB adatbázis kezelésre szolgáló library
const mongoose = require('mongoose');

// ===================================
// SZAVAZAT SCHEMA DEFINIÁLÁSA
// ===================================
// A Schema meghatározza a szavazat adatszerkezetét és validációs szabályokat
const szavazatSchema = new mongoose.Schema({

  // ===================================
  // ----- EMBER AZONOSÍTÓ -----
  // ===================================
  // Ki adta le ezt a szavazatot
  eemberId: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
    ref: 'eEmber', // Referencia a eEmber modellre
    required: true // Kötelező mező
  },

  // ===================================
  // ----- JAVASLAT AZONOSÍTÓ -----
  // ===================================
  // Melyik javaslatra vonatkozik ez a szavazat
  javaslatId: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
    ref: 'Javaslat', // Referencia a Javaslat modellre
    required: true // Kötelező mező
  },

  // ----- SZAVAZAT TÍPUSA -----
  // A eember támogatja, ellenzi, vagy tartózkodik a javaslatot
  szavazatTipus: { 
    type: String,           // Szöveges típus
    required: true,         // Kötelező mező
    enum: ['Tamogat', 'Ellenez', 'Tartozkodik'], 
    trim: true              // Levágja a felesleges szóközöket
  },

  // ===================================
  // ----- LÉTREHOZÁS DÁTUMA -----
  // ===================================
  // Mikor adta le először a szavazatot
  letrehozva: {
    type: Date, // Dátum típus
    default: Date.now // Alapértelmezett: jelenlegi időpont
  },

  // ===================================
  // ----- Modositas DÁTUMA -----
  // ===================================
  // Mikor módosította utoljára a szavazatát
  // A eember bármikor meggondolhatja magát és átszavazhat
  modositva: {
    type: Date, // Dátum típus
    default: Date.now // Alapértelmezett: jelenlegi időpont
  }

});

// ===================================
// INDEXEK LÉTREHOZÁSA
// ===================================
// Az indexek gyorsítják az adatbázis lekérdezéseket

// Egyedi index: eember + javaslat kombináció
// Ez biztosítja, hogy egy eember csak EGYSZER szavazhat egy javaslatra
// Azonban MÓDOSÍTHATJA a szavazatát bármikor (UPDATE művelettel)
szavazatSchema.index(
  { 
    eemberId: 1, 
    javaslatId: 1 
  }, 
  { 
    unique: true // Egyedi index - nem lehet duplikáció
  }
);

// Javaslat indexelése - gyors szűrés javaslat szerint
// Szükséges: egy javaslat összes szavazatának gyors lekéréséhez
szavazatSchema.index({ javaslatId: 1 });

// eEmber indexelése - gyors szűrés eember szerint
// Szükséges: egy eember összes szavazatának lekéréséhez
szavazatSchema.index({ eemberId: 1 });

// Szavazat típus indexelése - gyors szűrés szavazat típus szerint
// Szükséges: gyors számlálás (hány Tamogat, hány Ellenez)
szavazatSchema.index({ szavazatTipus: 1 });

// Compound index: javaslat + szavazat típus
// Gyors lekérdezés: egy javaslat támogatóinak vagy ellenzőinek listája
szavazatSchema.index({ 
  javaslatId: 1, 
  szavazatTipus: 1 
});

// ===================================
// MONGOOSE MIDDLEWARE-EK
// ===================================

// ----- PRE SAVE MIDDLEWARE -----
// Futtatás előtt: szavazat mentése vagy módosítása
szavazatSchema.pre('save', function(next) {
  
  // Ha a dokumentum már létezik (módosítás), frissítjük a modositva mezőt
  if (!this.isNew) {
    // isNew = false, tehát már létező szavazat módosítása
    this.modositva = Date.now(); // Jelenlegi időpont beállítása
  }
  
  next(); // Folytatás a mentéssel
});

// ----- PRE UPDATE MIDDLEWARE -----
// Futtatás előtt: szavazat frissítése (findOneAndUpdate, updateOne, stb.)
szavazatSchema.pre('findOneAndUpdate', function(next) {
  
  // Automatikusan frissítjük a modositva mezőt minden UPDATE műveletkor
  this.set({ modositva: Date.now() });
  
  next(); // Folytatás a frissítéssel
});


// ===================================
// STATIC METODUSOK
// ===================================

// ----- TARTÓZKODÓK SZÁMOLÁSA ----- 
/**
 * Megszámolja egy javaslat tartózkodóinak számát
 * @param {ObjectId} javaslatId - Javaslat azonosítója
 * @returns {Promise<Number>} Tartózkodók száma
 */
szavazatSchema.statics.tartozkodokSzama = async function(javaslatId) {
  // Megszámoljuk a Tartózkodik típusú szavazatokat
  const szam = await this.countDocuments({
    javaslatId: javaslatId,
    szavazatTipus: 'Tartozkodik'
  });
  
  return szam;
};

// ----- SZAVAZAT KERESÉSE VAGY LÉTREHOZÁSA -----
/**
 * Megkeresi a eember szavazatát egy javaslaton, vagy létrehozza ha nem létezik
 * @param {ObjectId} eemberId - eEmber azonosítója
 * @param {ObjectId} javaslatId - Javaslat azonosítója
 * @param {String} szavazatTipus - 'Tamogat' vagy 'Ellenez'
 * @returns {Promise<Object>} A szavazat objektum
 */
szavazatSchema.statics.keresVagyLetrehoz = async function(eemberId, javaslatId, szavazatTipus) {
  
  // Keresés: létezik-e már szavazat?
  let szavazat = await this.findOne({
    eemberId: eemberId,
    javaslatId: javaslatId
  });
  
  // Ha létezik: módosítás
  if (szavazat) {
    // Csak akkor módosítjuk, ha változott a szavazat
    if (szavazat.szavazatTipus !== szavazatTipus) {
      szavazat.szavazatTipus = szavazatTipus;
      szavazat.modositva = Date.now();
      await szavazat.save();
    }
  } 
  // Ha nem létezik: létrehozás
  else {
    szavazat = await this.create({
      eemberId: eemberId,
      javaslatId: javaslatId,
      szavazatTipus: szavazatTipus
    });
  }
  
  return szavazat;
};

// ----- TamogatÓK SZÁMLÁLÁSA -----
/**
 * Megszámolja egy javaslat támogatóinak számát
 * @param {ObjectId} javaslatId - Javaslat azonosítója
 * @returns {Promise<Number>} Támogatók száma
 */
szavazatSchema.statics.tamogatokSzama = async function(javaslatId) {
  
  const szam = await this.countDocuments({
    javaslatId: javaslatId,
    szavazatTipus: 'Tamogat'
  });
  
  return szam;
};

// ----- ELLENZŐK SZÁMLÁLÁSA -----
/**
 * Megszámolja egy javaslat ellenzőinek számát
 * @param {ObjectId} javaslatId - Javaslat azonosítója
 * @returns {Promise<Number>} Ellenzők száma
 */
szavazatSchema.statics.ellenzokSzama = async function(javaslatId) {
  
  const szam = await this.countDocuments({
    javaslatId: javaslatId,
    szavazatTipus: 'Ellenez'
  });
  
  return szam;
};

// ----- ÖSSZES SZAVAZÓ SZÁMLÁLÁSA -----
/**
 * Megszámolja egy javaslat összes szavazóját (Tamogat + Ellenez)
 * @param {ObjectId} javaslatId - Javaslat azonosítója
 * @returns {Promise<Number>} Összes szavazó száma
 */
szavazatSchema.statics.osszesSzavazoSzama = async function(javaslatId) {
  
  const szam = await this.countDocuments({
    javaslatId: javaslatId
  });
  
  return szam;
};

// ----- SZAVAZÓK LISTÁJA -----
/**
 * Lekéri egy javaslat összes szavazóját (eember ID-k)
 * @param {ObjectId} javaslatId - Javaslat azonosítója
 * @returns {Promise<Array>} eEmber ID-k tömbje
 */
szavazatSchema.statics.szavazokListaja = async function(javaslatId) {
  
  const szavazatok = await this.find({ javaslatId: javaslatId })
    .select('eemberId') // Csak a eember ID-t kérjük le
    .lean(); // Plain JavaScript objektum (gyorsabb)
  
  // eEmber ID-k kinyerése
  const eemberIds = szavazatok.map(sz => sz.eemberId);
  
  return eemberIds;
};

// ===================================
// MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA
// ===================================
// A model a schema alapján létrehozott adatbázis kollekció
const Szavazat = mongoose.model('Szavazat', szavazatSchema);

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = Szavazat;
