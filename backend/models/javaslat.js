// backend/models/javaslat.js

// ===================================
// MONGOOSE IMPORTÁLÁSA
// ===================================
// Mongoose - MongoDB adatbázis kezelésre szolgáló library
const mongoose = require('mongoose');

// ===================================
// JAVASLAT SCHEMA DEFINIÁLÁSA
// ===================================
// A Schema meghatározza a javaslat adatszerkezetét és validációs szabályokat
const javaslatSchema = new mongoose.Schema({

  // ===================================
  // ----- JAVASLAT TÍPUSA -----
  // ===================================
  javaslatTipus: {
    type: String, // Szöveges típus
    required: true, // Kötelező mező
    enum: ['Torles', 'Modositas', 'Egyesites', 'Athelyezes', 'Csomag'], // Engedélyezett értékek
    trim: true // Levágja a felesleges szóközöket
  },

  // ===================================
  // ----- ÉRINTETT ENTITÁSOK (TÖMB) -----
  // ===================================
  // Egy vagy több entitás, amelyekre a javaslat vonatkozik
  erintettEntitasok: { 
    type: [
      {
        // Entitás MongoDB ObjectId-ja
        entitasId: { 
          type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
          required: true // Kötelező mező
        },
        // Entitás típusa (melyik model/kollekció)
        entitasTipus: { 
          type: String, // Szöveges típus
          required: true, // Kötelező mező
          enum: ['Tartalom', 'Kategoria', 'TartalomTipus'], // Engedélyezett típusok
          trim: true
        },
        // Művelet típusa ezen az entitáson
        muvelet: {
          type: String, // Szöveges típus
          required: true, // Kötelező mező
          enum: ['Torles', 'Modositas', 'Egyesites', 'Athelyezes'], // Engedélyezett műveletek
          trim: true
        },
        // Módosítási adatok (ha Modositas vagy Athelyezes művelet)
        modositasAdatok: { 
          type: Object, // Objektum típus
          default: {} // Alapértelmezett: üres objektum
        }
      }
    ],
    // Validáció: legalább 1 érintett entitás kell
    validate: {
      validator: function(value) {
        return value && value.length > 0;
      },
      message: 'Legalább egy érintett entitás megadása kötelező'
    }
  },

  // ----- SZÜLŐ TARTALOM AZONOSÍTÓ ----- 
  // Melyik tartalom alatt jött létre ez a javaslat (KÖTELEZŐ!)
  szuloId: {
    type: mongoose.Schema.Types.ObjectId,  // MongoDB ObjectId típus
    ref: 'Tartalom',                       // Referencia a Tartalom modellre
    required: true,                        // KÖTELEZŐ mező - minden javaslat tartalom alatt van
    index: true                            // Index a gyors kereséshez
  },

  // ----- SZÜLŐ TÍPUSA ----- 
  // Fix érték: Javaslat mindig csak Tartalom alatt jöhet létre
  szuloTipus: {
    type: String,                          // Szöveges típus
    default: 'Tartalom',                   // Alapértelmezett: mindig 'Tartalom'
    enum: ['Tartalom']                     // Csak 'Tartalom' engedélyezett
  },

  // ----- EGYEZMÉNY TÁRHELY AZONOSÍTÓ -----
  // MÓDOSÍTOTT: Egyesítésnél null lehet, mert az új entitás még nem létezik
  // A végrehajtás után frissül a tényleges új entitás ID-jával
  egyezmenyTarhelyId: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
    ref: 'Tartalom', // Referencia a Tartalom modellre
    required: function() {
      // Egyesítésnél NEM kötelező, mert az új entitás még nem létezik
      return this.javaslatTipus !== 'Egyesites';
    },
    default: null, // Alapértelmezett null egyesítésnél
    index: true // Index a gyors kereséshez
  },


  // ===================================
  // ----- Egyesites SPECIÁLIS ADATOK -----
  // ===================================
  // Csak Egyesites típusú javaslat esetén használatos
  egyesitesAdatok: { 
    // Az új entitás típusa (ami létrejön az egyesítésből)
    ujEntitasTipus: {
      type: String, // Szöveges típus
      enum: ['Tartalom', 'Kategoria', 'TartalomTipus'], // Engedélyezett típusok
      required: function() {
        // Csak akkor kötelező, ha Egyesites típus
        return this.javaslatTipus === 'Egyesites';
      }
    },
    // Az új entitás adatai (mezők: nev, leiras, stb.)
    ujEntitasAdatok: { 
      type: Object, // Objektum típus
      required: function() {
        // Csak akkor kötelező, ha Egyesites típus
        return this.javaslatTipus === 'Egyesites';
      }
    },
    // Forrás entitások ID-i (amelyek egyesülnek)
    forrasEntitasok: [ // ✅ JAVÍTVA: camelCase (volt: forras_entitasok)
      {
        type: mongoose.Schema.Types.ObjectId // MongoDB ObjectId típus
      }
    ]
  },

  // ===================================
  // ----- LÉTREHOZÓ EMBER -----
  // ===================================
  letrehozo: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId típus
    ref: 'Ember', // Referencia a Ember modellre
    required: true // Kötelező mező
  },

  // ===================================
  // ----- INDOKLÁS -----
  // ===================================
  // Miért szükséges ez a javaslat
  indoklas: {
    type: String, // Szöveges típus
    required: true, // Kötelező mező
    trim: true, // Levágja a felesleges szóközöket
    minlength: [10, 'Az indoklás legalább 10 karakter hosszú legyen'], // Minimum hossz validáció
    maxlength: [2000, 'Az indoklás maximum 2000 karakter lehet'] // Maximum hossz validáció
  },

  // ===================================
  // ----- STÁTUSZ -----
  // ===================================
  // A javaslat jelenlegi állapota
  statusz: {
    type: String, // Szöveges típus
    enum: ['Aktiv', 'Elfogadva', 'Elvetve', 'Hiba'], // Engedélyezett értékek
    default: 'Aktiv' // Alapértelmezett: Aktiv
  },

  // ===================================
  // ----- LÉTREHOZÁS DÁTUMA -----
  // ===================================
  letrehozva: {
    type: Date, // Dátum típus
    default: Date.now // Alapértelmezett: jelenlegi időpont
  },

  // ===================================
  // ----- HATÁLYBA LÉPÉS IDEJE -----
  // ===================================
  // Mikor lép hatályba a javaslat (számított érték)
  hatalybaLepesIdeje: { 
    type: Date, // Dátum típus
    default: null // Alapértelmezett: nincs beállítva
  },

  // ===================================
  // ----- UTOLSÓ SZÁMÍTÁS IDŐPONTJA -----
  // ===================================
  // Mikor történt utoljára a BM, HI, stb. újraszámítása
  utolsoSzamitas: { // ✅ JAVÍTVA: camelCase (volt: utolsoSzamitas)
    type: Date, // Dátum típus
    default: Date.now // Alapértelmezett: jelenlegi időpont
  },

  // ----- ÉRTÉKEK ELAVULTAK JELZŐ -----
  // Jelzi, hogy a számított értékek elavultak-e (hisztogram vagy szavazat változás miatt)
  // A cron job vagy részletes lekérés fogja frissíteni
  ertekekElavultak: {
    type: Boolean,      // Boolean típus
    default: false      // Alapértelmezett: false (nem elavult)
  },


  // ===================================
  // ----- SZÁMÍTOTT ÉRTÉKEK (CACHE) -----
  // ===================================
  // Ezek az értékek minden szavazat után újraszámolódnak
  // Cache-elve vannak a gyorsabb lekérdezéshez

  // Érintett entitásokon lévő tudatpont tulajdonosok száma 
  // Egyesített halmaz - egyedi emberek
  entitasokTudatpontTulajdonosokSzama: {
    type: Number, // Számérték típus
    default: 0 // Alapértelmezett: 0
  },

  // Részvevő tudatpont tulajdonosok száma 
  // Akik mind a javaslaton, mind valamelyik érintett entitáson is vannak
  resztvevoTudatpontTulajdonosokSzama: {
    type: Number, // Számérték típus
    default: 0 // Alapértelmezett: 0
  },

  // Javaslat támogatóinak száma 
  javaslatTamogatoinakSzama: {
    type: Number, // Számérték típus
    default: 0 // Alapértelmezett: 0
  },

  // Javaslat ellenzőinek száma 
  javaslatEllenzoinekSzama: {
    type: Number, // Számérték típus
    default: 0 // Alapértelmezett: 0
  },

  // JAVASLAT TARTÓZKODÓINAK SZÁMA 
  javaslatTartozkodoinakSzama: {
    type: Number,           // Szám típus
    default: 0,             // Alapértelmezett: 0 tartózkodó
    min: 0                  // Minimum érték: nem lehet negatív
  },

  // Részvételi arány - százalékban (RA)
  // RA = resztvevoTudatpontTulajdonosokSzama / entitasokTudatpontTulajdonosokSzama * 100
  reszveteliArany: {
    type: Number, // Számérték típus
    default: 0, // Alapértelmezett: 0
    min: 0, // Minimum érték: 0
    max: 100 // Maximum érték: 100
  },

  // Támogatottsági arány - százalékban 
  // TA = javaslatTamogatoinakSzama / resztvevoTudatpontTulajdonosokSzama * 100
  tamogatotsagiArany: {
    type: Number, // Számérték típus
    default: 0, // Alapértelmezett: 0
    min: 0, // Minimum érték: 0
    max: 100 // Maximum érték: 100
  },

  // Ellenzői arány - százalékban 
  // EA = javaslatEllenzoinekSzama / resztvevoTudatpontTulajdonosokSzama * 100
  ellenzoiArany: {
    type: Number, // Számérték típus
    default: 0, // Alapértelmezett: 0
    min: 0, // Minimum érték: 0
    max: 100 // Maximum érték: 100
  },

  // Bizonyossági mutató (BM)
  // BM = (((TA vagy EA - 50) * 2) + RA) / 2
  bizonyossagiMutato: {
    type: Number, // Számérték típus
    default: 0, // Alapértelmezett: 0
    min: 0, // Minimum érték: 0
    max: 100 // Maximum érték: 100
  },

  // Hatályba lépési idő másodpercben (HI)
  // HI = 31_536_000 * (1 - BM/100)^5
  dontesiIdo: {
    type: Number, // Számérték típus (másodperc)
    default: 31536000 // Alapértelmezett: 1 év (maximum)
  }

});

// ===================================
// INDEXEK LÉTREHOZÁSA
// ===================================
// Az indexek gyorsítják az adatbázis lekérdezéseket

// Státusz indexelése - gyors szűrés státusz szerint (pl. Aktiv javaslatok)
javaslatSchema.index({ statusz: 1 });

// Létrehozó indexelése - gyors keresés ember javaslatai alapján
javaslatSchema.index({ letrehozo: 1 });

// Hatályba lépés ideje indexelése - Cron job-hoz szükséges
// Gyors keresés a hatályba lépendő javaslatok között
javaslatSchema.index({ hatalybaLepesIdeje: 1 });

// Érintett entitások indexelése - gyors keresés entitás szerint
// Compound index: entitasId + entitasTipus
javaslatSchema.index({
  'erintettEntitasok.entitasId': 1, // ✅ JAVÍTVA: camelCase
  'erintettEntitasok.entitasTipus': 1 // ✅ JAVÍTVA: camelCase
});

// Létrehozás dátuma indexelése - legújabb javaslatok rendezéséhez
javaslatSchema.index({ letrehozva: -1 });

// szuloId indexelése
// Gyors keresés: "Egy tartalom alatti összes javaslat"
javaslatSchema.index({ szuloId: 1 });

// Compound index: szuloId + statusz
// Gyors keresés: "Egy tartalom aktív javaslatai"
javaslatSchema.index({ szuloId: 1, statusz: 1 });

// Compound index: szuloId + létrehozva
// Gyors keresés: "Egy tartalom legújabb javaslatai"
javaslatSchema.index({ szuloId: 1, letrehozva: -1 });

// ÚJ INDEX - egyezmenyTarhelyId indexelése 
// Gyors keresés: Melyik javaslatok egyezményei kerülnek egy adott tartalomba
javaslatSchema.index({ egyezmenyTarhelyId: 1 });


// ===================================
// MONGOOSE MIDDLEWARE-EK
// ===================================

// ----- PRE SAVE MIDDLEWARE -----
// Futtatás előtt: javaslat mentése
javaslatSchema.pre('save', function(next) {
  
  // ÚJ VALIDÁCIÓ - Szülő kötelező ellenőrzése
  if (!this.szuloId) {
    return next(new Error('A javaslat létrehozásához szülő tartalom megadása kötelező'));
  }
  
  // MEGLÉVŐ VALIDÁCIÓ - Egyesites típus validálása
  if (this.javaslatTipus === 'Egyesites') {
    // Ellenőrzés: legalább 2 érintett entitás kell
    if (this.erintettEntitasok.length < 2) {
      return next(new Error('Egyesites típushoz legalább 2 érintett entitás szükséges'));
    }
    
    // Ellenőrzés: minden érintett entitás azonos típusú legyen
    const elsoTipus = this.erintettEntitasok[0].entitasTipus;
    const osszesAzonosTipus = this.erintettEntitasok.every(
      (entitas) => entitas.entitasTipus === elsoTipus
    );
    
    if (!osszesAzonosTipus) {
      return next(new Error('Egyesites esetén minden érintett entitásnak azonos típusúnak kell lennie'));
    }
    
    // Ellenőrzés: egyesitesAdatok kitöltöttség
    if (!this.egyesitesAdatok || !this.egyesitesAdatok.ujEntitasAdatok) {
      return next(new Error('Egyesites esetén az egyesitesAdatok megadása kötelező'));
    }
  }
  
  // MEGLÉVŐ VALIDÁCIÓ - Csomag típus validálása
  if (this.javaslatTipus === 'Csomag') {
    // Ellenőrzés: legalább 2 művelet kell
    if (this.erintettEntitasok.length < 2) {
      return next(new Error('Csomag típushoz legalább 2 művelet szükséges'));
    }
    
    // Ellenőrzés: ne legyen Egyesites művelet (az külön Egyesites típus)
    const vanEgyesites = this.erintettEntitasok.some(
      (entitas) => entitas.muvelet === 'Egyesites'
    );
    
    if (vanEgyesites) {
      return next(new Error('Csomag típusban nem lehet Egyesites művelet, használd az Egyesites típust'));
    }
  }
  
  next(); // Folytatás a mentéssel
});


// ===================================
// MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA
// ===================================
// A model a schema alapján létrehozott adatbázis kollekció
const Javaslat = mongoose.model('Javaslat', javaslatSchema);

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = Javaslat;
