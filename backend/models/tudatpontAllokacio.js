// backend/models/tudatpontAllokacio.js

// ===== MONGOOSE IMPORTÁLÁSA =====
// Mongoose: MongoDB adatbázis kezelésére szolgáló library
const mongoose = require('mongoose');

// ===== TUDATPONT ALLOKÁCIÓ SÉMA DEFINIÁLÁSA =====
// Ez a séma tárolja, hogy egy entitásra (tartalom/kategória/típus/javaslat)
// összesen mennyi tudatpont van allokálva
const tudatpontAllokaciSchema = new mongoose.Schema({

  // ----- ENTITÁS AZONOSÍTÓ -----
  // Melyik entitásra vonatkozik az allokáció
  entitasId: { 
    type: mongoose.Schema.Types.ObjectId,  // MongoDB ObjectId típus
    required: true,                         // Kötelező mező
    index: true                             // Indexelve gyors kereséshez
  },

  // ----- ENTITÁS TÍPUS -----
  // Milyen típusú az entitás (tartalom, kategória, stb.)
  entitasTipus: { 
    type: String,                          // Szöveges típus
    required: true,                        // Kötelező mező
    enum: ['Tartalom', 'Kategoria', 'TartalomTipus', 'Javaslat'],  // Engedélyezett értékek
    trim: true                             // Levágja a felesleges szóközöket
  },

  // ----- ÖSSZES TUDATPONT -----
  // Az entitásra allokált összes tudatpont összege
  // Ez a denormalizált cache mező → gyors lekérdezéshez
  osszesPont: { 
    type: Number,                          // Szám típus
    required: true,                        // Kötelező mező
    default: 0,                            // Alapértelmezett érték: 0
    min: 0                                 // Minimum érték: nem lehet negatív
  },

  // ----- HOZZÁJÁRULÓK SZÁMA -----
  // Hány eember adott tudatpontot erre az entitásra
  hozzajarulokSzama: { 
    type: Number,                          // Szám típus
    required: true,                        // Kötelező mező
    default: 0,                            // Alapértelmezett érték: 0
    min: 0                                 // Minimum érték: nem lehet negatív
  },

  // ----- LÉTREHOZÁS DÁTUMA -----
  // Amikor először hozzárendeltek tudatpontot az entitáshoz
  letrehozva: { 
    type: Date,                            // Dátum típus
    default: Date.now                      // Alapértelmezett: jelenlegi időpont
  },

  // ----- FRISSÍTÉS DÁTUMA -----
  // Amikor utoljára módosították az allokációt
  frissitve: { 
    type: Date,                            // Dátum típus
    default: Date.now                      // Alapértelmezett: jelenlegi időpont
  }

});

// ===== INDEXEK LÉTREHOZÁSA =====
// Az indexek gyorsítják az adatbázis lekérdezéseket

// Compound unique index - egy entitáshoz csak egy allokáció tartozhat
// Ez biztosítja, hogy ne lehessen duplikált allokáció ugyanarra az entitásra
tudatpontAllokaciSchema.index(
  { entitasId: 1, entitasTipus: 1 }, 
  { unique: true }
);

// Összes pont indexelése - csökkenő sorrend
// Használat: "Top 100 legnépszerűbb tartalom" rangsorolás gyors lekérdezéséhez
tudatpontAllokaciSchema.index({ osszesPont: -1 });

// Entitás típus indexelése
// Használat: "Összes kategória allokációjának lekérése" típus szerinti szűréshez
tudatpontAllokaciSchema.index({ entitasTipus: 1 });

// ===== MIDDLEWARE - PRE SAVE =====
// Minden mentés előtt frissítjük a frissitve mezőt
tudatpontAllokaciSchema.pre('save', function(next) {
  // Ha a dokumentum módosult (nem új), frissítjük a dátumot
  if (!this.isNew) {
    this.frissitve = Date.now();
  }
  next();
});

// ===== MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA =====
// A model a séma alapján létrehozott adatbázis kollekció
// 'TudatpontAllokacio' = model neve, tudatpontAllokaciSchema = séma definíció
const TudatpontAllokacio = mongoose.model('TudatpontAllokacio', tudatpontAllokaciSchema);

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = TudatpontAllokacio;