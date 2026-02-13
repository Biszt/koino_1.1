// backend/models/tudatpontHozzarendeles.js

// ===== MONGOOSE IMPORTÁLÁSA =====
// Mongoose: MongoDB adatbázis kezelésére szolgáló library
const mongoose = require('mongoose');

// ===== TUDATPONT HOZZÁRENDELÉS SÉMA DEFINIÁLÁSA =====
// Ez a séma tárolja minden egyes ember-entitás pár tudatpont hozzárendelését
// Minden dokumentum egy ember hozzájárulását reprezentálja egy adott entitásra
const tudatpontHozzarendelesSchema = new mongoose.Schema({

  // ----- EMBER AZONOSÍTÓ -----
  // Ki rendelte hozzá a tudatpontokat
  emberId: { 
    type: mongoose.Schema.Types.ObjectId,  // MongoDB ObjectId típus
    ref: 'Ember',                     // Referencia a Ember modellre
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
  // Hány tudatpontot rendelt hozzá a ember erre az entitásra
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

// Compound unique index - egy ember-entitás pár csak egyszer fordulhat elő
// Ez biztosítja, hogy egy ember egy entitásra csak egyszer adhat pontot
// (de azt módosíthatja)
tudatpontHozzarendelesSchema.index(
  { emberId: 1, entitasId: 1, entitasTipus: 1 }, 
  { unique: true }
);

// Entitás index - egy entitás összes hozzájárulójának lekérdezéséhez
// Használat: "Kik adtak pontot erre a tartalomra?"
tudatpontHozzarendelesSchema.index({ 
  entitasId: 1, 
  entitasTipus: 1 
});

// Ember történet index - ember hozzájárulásainak időrendben
// Használat: "Mire adott pontokat ez a ember?" (legfrissebb először)
tudatpontHozzarendelesSchema.index({ 
  emberId: 1, 
  frissitve: -1 
});

// Ember + tudatpontok index - szűrés nem 0 értékekre
// Használat: "Milyen entitásokon van aktív tudatpontja a embernak?"
tudatpontHozzarendelesSchema.index({ 
  emberId: 1, 
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
