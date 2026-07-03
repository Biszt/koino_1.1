// backend/models/tudatpontHozzarendeles.js

// ===== MONGOOSE IMPORTÁLÁSA =====
// Mongoose: MongoDB adatbázis kezelésére szolgáló library
const mongoose = require('mongoose');

// ===== TUDATPONT HOZZÁRENDELÉS SÉMA DEFINIÁLÁSA =====
// Ez a séma tárolja minden egyes eember-entitás pár tudatpont hozzárendelését
// Minden dokumentum egy eember hozzájárulását reprezentálja egy adott entitásra
const tudatpontHozzarendelesSchema = new mongoose.Schema({

  // ----- EMBER AZONOSÍTÓ -----
  // Ki rendelte hozzá a tudatpontokat
  eemberId: { 
    type: mongoose.Schema.Types.ObjectId,  // MongoDB ObjectId típus
    ref: 'eEmber',                     // Referencia a eEmber modellre
    required: true,                         // Kötelező mező
    index: true                             // Indexelve gyors kereséshez
  },

  // ----- ENTITÁS AZONOSÍTÓ -----
  // Melyik entitásra (tartalom/kategória/típus/javaslat) rendelte hozzá a pontokat
  entitasId: { 
    type: mongoose.Schema.Types.ObjectId,  // MongoDB ObjectId típus
    required: true,                         // Kötelező mező
    index: true                             // Indexelve gyors kereséshez
  },

  // ----- ENTITÁS TÍPUS -----
  // Milyen típusú az entitás
  entitasTipus: { 
    type: String,                          // Szöveges típus
    required: true,                        // Kötelező mező
    enum: ['Tartalom', 'Kategoria', 'TartalomTipus', 'Javaslat'],  // Engedélyezett értékek
    trim: true                             // Levágja a felesleges szóközöket
  },

  // ----- TUDATPONTOK MENNYISÉGE -----
  // Hány tudatpontot rendelt hozzá a eember erre az entitásra
  // 0 érték = visszavonta a hozzárendelést
  tudatPontok: { 
    type: Number,                          // Szám típus
    required: true,                        // Kötelező mező
    default: 0,                            // Alapértelmezett érték: 0
    min: 0                                 // Minimum érték: nem lehet negatív
  },

  // ----- LÉTREHOZÁS DÁTUMA -----
  // Amikor először hozzárendelte a tudatpontokat
  letrehozva: { 
    type: Date,                            // Dátum típus
    default: Date.now                      // Alapértelmezett: jelenlegi időpont
  },

  // ----- FRISSÍTÉS DÁTUMA -----
  // Amikor utoljára módosította a hozzárendelést
  frissitve: { 
    type: Date,                            // Dátum típus
    default: Date.now                      // Alapértelmezett: jelenlegi időpont
  }

});

// ===== INDEXEK LÉTREHOZÁSA =====
// Az indexek gyorsítják az adatbázis lekérdezéseket

// Compound unique index - egy eember-entitás pár csak egyszer fordulhat elő
// Ez biztosítja, hogy egy eember egy entitásra csak egyszer adhat pontot
// (de azt módosíthatja)
tudatpontHozzarendelesSchema.index(
  { eemberId: 1, entitasId: 1, entitasTipus: 1 }, 
  { unique: true }
);

// Entitás index - egy entitás összes hozzájárulójának lekérdezéséhez
// Használat: "Kik adtak pontot erre a tartalomra?"
tudatpontHozzarendelesSchema.index({ 
  entitasId: 1, 
  entitasTipus: 1 
});

// eEmber történet index - eember hozzájárulásainak időrendben
// Használat: "Mire adott pontokat ez a eember?" (legfrissebb először)
tudatpontHozzarendelesSchema.index({ 
  eemberId: 1, 
  frissitve: -1 
});

// eEmber + tudatpontok index - szűrés nem 0 értékekre
// Használat: "Milyen entitásokon van aktív tudatpontja a eembernak?"
tudatpontHozzarendelesSchema.index({ 
  eemberId: 1, 
  tudatPontok: 1 
});

// ===== MIDDLEWARE - PRE SAVE =====
// Minden mentés előtt frissítjük a frissitve mezőt
tudatpontHozzarendelesSchema.pre('save', function(next) {
  // Ha a dokumentum módosult (nem új), frissítjük a dátumot
  if (!this.isNew) {
    this.frissitve = Date.now();
  }
  next();
});

// ===== VIRTUÁLIS MEZŐK (opcionális) =====
// Hasznos kiegészítő mezők, amelyek nem tárolódnak az adatbázisban

// Visszaadja, hogy aktív-e a hozzárendelés (0-nál több pont van-e rajta)
tudatpontHozzarendelesSchema.virtual('aktiv').get(function() {
  return this.tudatPontok > 0;
});

// ===== MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA =====
// A model a séma alapján létrehozott adatbázis kollekció
// 'TudatpontHozzarendeles' = model neve (egyes szám!)
const TudatpontHozzarendeles = mongoose.model('TudatpontHozzarendeles', tudatpontHozzarendelesSchema);

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = TudatpontHozzarendeles;
