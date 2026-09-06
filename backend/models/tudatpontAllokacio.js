// backend/models/tudatpontAllokacio.js

// ===== MONGOOSE IMPORTÁLÁSA =====
// Mongoose: MongoDB adatbázis kezelésére szolgáló library
const mongoose = require('mongoose');

// ===== TUDATPONT ALLOKÁCIÓ SÉMA DEFINIÁLÁSA =====
// Ez a séma tárolja, hogy egy entitásra (gondolat/kategória/típus/javaslat/egyezmény)
// összesen mennyi tudatpont van allokálva
const tudatpontAllokaciSchema = new mongoose.Schema({

  // ----- ENTITÁS AZONOSÍTÓ -----
  // Melyik entitásra vonatkozik az allokáció
  entitasId: { 
    reteg: 'szamitott',  // H6
    type: mongoose.Schema.Types.ObjectId,  // MongoDB ObjectId típus
    required: true,                         // Kötelező mező
    index: true                             // Indexelve gyors kereséshez
  },

  // ----- ENTITÁS TÍPUS -----
  // Milyen típusú az entitás (gondolat, kategória, stb.)
  // Az 'Egyezmeny' 2026-08-25 óta szerepel itt — ugyanaz a hiány, mint a
  // tudatpontHozzarendeles-nél: a rendszer már írt ilyen sorokat, a séma nem tudott róluk.
  // A három tudatpont-modell enumja mostantól egységes.
  entitasTipus: {
    reteg: 'szamitott',  // H6
    type: String,                          // Szöveges típus
    required: true,                        // Kötelező mező
    enum: ['Gondolat', 'Kategoria', 'GondolatTipus', 'Javaslat', 'Egyezmeny'],  // Engedélyezett értékek
    trim: true                             // Levágja a felesleges szóközöket
  },

  // ----- ÖSSZES TUDATPONT -----
  // Az entitásra allokált összes tudatpont összege
  // Ez a denormalizált cache mező → gyors lekérdezéshez
  osszesPont: { 
    reteg: 'szamitott',  // H6
    type: Number,                          // Szám típus
    required: true,                        // Kötelező mező
    default: 0,                            // Alapértelmezett érték: 0
    min: 0                                 // Minimum érték: nem lehet negatív
  },

  // ----- HOZZÁJÁRULÓK SZÁMA -----
  // Hány eember adott tudatpontot erre az entitásra
  hozzajarulokSzama: { 
    reteg: 'szamitott',  // H6
    type: Number,                          // Szám típus
    required: true,                        // Kötelező mező
    default: 0,                            // Alapértelmezett érték: 0
    min: 0                                 // Minimum érték: nem lehet negatív
  },

  // ----- ŐS-LÁNC (SKÁLÁZHATÓ RÉSZFA-SZŰRÉSHEZ) -----
  // Az entitás teljes szülő-lánca a gyökérig, ÖNMAGÁVAL kezdve — UGYANAZ a lánc,
  // mint a hierarchikusTudatpontAllokacio.osLanc. A szülő-infó a hierarchikus
  // kollekcióban él; ide csak TÜKRÖZZÜK, hogy a saját-pont rendezés is skálázhatóan
  // szűrhessen ágra: { 'osLanc.entitasId': agazatId } szűrő + osszesPont rendezés
  // EGYETLEN indexelt lekérdezésben. Feltöltés/karbantartás közös (entitasOsLancPotlas).
  osLanc: {
    reteg: 'szamitott',  // H6
    type: [{
      entitasId: { type: mongoose.Schema.Types.ObjectId },
      entitasTipus: { type: String }
    }],
    default: []
  },

  // ----- LÉTREHOZÁS DÁTUMA -----
  // Amikor először hozzárendeltek tudatpontot az entitáshoz
  letrehozva: {
    reteg: 'szamitott',  // H6
    type: Date,                            // Dátum típus
    default: Date.now                      // Alapértelmezett: jelenlegi időpont
  },

  // ----- FRISSÍTÉS DÁTUMA -----
  // Amikor utoljára módosították az allokációt
  frissitve: { 
    reteg: 'szamitott',  // H6
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
// Használat: "Top 100 legnépszerűbb gondolat" rangsorolás gyors lekérdezéséhez
tudatpontAllokaciSchema.index({ osszesPont: -1 });

// Entitás típus indexelése
// Használat: "Összes kategória allokációjának lekérése" típus szerinti szűréshez
tudatpontAllokaciSchema.index({ entitasTipus: 1 });

// ŐS-LÁNC + SAJÁT ÖSSZPONT compound index (multikey az osLanc.entitasId-n)
// A Rendezés nézet ágazat-szűrt SAJÁT PONT módja: { 'osLanc.entitasId': A } szűrő
// + osszesPont rendezés EGYETLEN indexelt lekérdezésben (skálázható részfa).
tudatpontAllokaciSchema.index({ 'osLanc.entitasId': 1, osszesPont: -1 });

// ===== MIDDLEWARE - PRE SAVE =====
// Minden mentés előtt frissítjük a frissitve mezőt
tudatpontAllokaciSchema.pre('save', function(next) {
  // Ha a dokumentum módosult (nem új), frissítjük a dátumot
  if (!this.isNew) {
    this.frissitve = Date.now();
  }
  next();
});
// ===== H6 — ADAT-OSZTÁLYOZÁS: ALAPÉRTELMEZETT RÉTEG =====
// A mezők a saját `reteg` opciójukban hordozzák a besorolásukat (lásd fentebb).
// A Mongoose által AUTOMATIKUSAN felvett mezőkre (_id, createdAt, updatedAt) viszont
// nem tudunk mező-opciót tenni — rájuk ez az alapértelmezés vonatkozik.
// A működésre nincs hatása: a Mongoose ezt az opciót megőrzi, de nem használja.
// Magyarázat és a teljes besorolás: docs/adat_osztalyozas.md (H6 híd-feladat).
tudatpontAllokaciSchema.options.retegAlapertelmezes = 'szamitott';

// ===== MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA =====
// A model a séma alapján létrehozott adatbázis kollekció
// 'TudatpontAllokacio' = model neve, tudatpontAllokaciSchema = séma definíció
const TudatpontAllokacio = mongoose.model('TudatpontAllokacio', tudatpontAllokaciSchema);

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = TudatpontAllokacio;