// backend/models/hierarchikusTudatpontAllokacio.js

// MONGOOSE IMPORTÁLÁSA
const mongoose = require('mongoose');

// HIERARCHIKUS TUDATPONT ALLOKÁCIÓ SÉMA DEFINÍCIÓJA
const hierarchikusTudatpontAllokaciSchema = new mongoose.Schema({

  // ----- ENTITÁS AZONOSÍTÓ -----
  entitasId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },

  // ----- ENTITÁS TÍPUSA -----
  entitasTipus: {
    type: String,
    required: true,
    enum: ['Tartalom', 'Kategoria', 'TartalomTipus', 'Javaslat', 'Egyezmeny'],
    trim: true
  },

  // ----- SZÜLŐ AZONOSÍTÓ -----
  // Melyik entitás a közvetlen szülője ennek az entitásnak
  // Null érték esetén ez egy gyökér entitás (nincs szülője)
  szuloId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },

  // ----- SZÜLŐ TÍPUSA -----
  // Meghatározza, hogy a szuloId melyik kollekciára mutat
  // Null, ha ez egy gyökér entitás
  szuloTipus: {
    type: String,
    enum: ['Tartalom', 'Kategoria', 'TartalomTipus', 'Javaslat', 'Egyezmeny', null],
    default: null
  },

  // ----- HIERARCHIKUS ÖSSZPONTSZÁM -----
  // Saját pont + összes leszármazott hierarchikus pontja
  hierarchikusOsszesPont: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },

  // ----- HIERARCHIKUS HOZZÁJÁRULÓK SZÁMA -----
  // Egyedi eemberek száma, akik ebben az ágban hozzájárultak
  // VÁLTOZÁS: ÚJ MEZŐ - hierarchikusFrissitesService számítja
  hierarchikusHozzajarulokSzama: {
    type: Number,
    default: 0,
    min: 0
  },

  // ----- HIERARCHIA SZINT -----
  // 0 = levél entitás (nincs gyereke)
  // 1 = egy szinttel feljebb (0. szint szülője)
  // 2 = két szinttel feljebb, stb.
  // VÁLTOZÁS: ÚJ MEZŐ - findElavultHierarchikusAllokaciok() szűr rá
  hierarchiaSzint: {
    type: Number,
    default: 0,
    min: 0
  },

  // ----- HIERARCHIKUS ADATOK ELAVULTAK-E -----
  // true: a CRON job-nak újra kell számítania ezt az entitást
  // false: az adatok frissek, nem kell újraszámítani
  // VÁLTOZÁS: ÚJ MEZŐ - CRON job és frissítés logika használja
  hierarchikusAdatokElavultak: {
    type: Boolean,
    default: true  // Alapból elavult - első létrehozáskor mindig számítsuk ki
  },

  // ----- HIERARCHIKUS ADATOK UTOLSÓ FRISSÍTÉSE -----
  // Mikor számította utoljára a CRON job a hierarchikus adatokat
  // VÁLTOZÁS: ÚJ MEZŐ - hierarchikusFrissitesService állítja be
  hierarchikusAdatokUtolsoFrissites: {
    type: Date,
    default: null  // Null = még soha nem lett újraszámítva
  },

  // ----- LÉTREHOZÁS DÁTUMA -----
  letrehozva: {
    type: Date,
    default: Date.now
  },

  // ----- FRISSÍTÉS DÁTUMA -----
  frissitve: {
    type: Date,
    default: Date.now
  }
});

// ===== INDEXEK =====

// Compound unique index - egy entitáshoz csak egy hierarchikus allokáció tartozhat
hierarchikusTudatpontAllokaciSchema.index(
  { entitasId: 1, entitasTipus: 1 },
  { unique: true }
);

// EntitasTipus index - gyors szűrés típus szerint
hierarchikusTudatpontAllokaciSchema.index({ entitasTipus: 1 });

// HierarchikusOsszesPont index - gyors rendezés pont szerint
hierarchikusTudatpontAllokaciSchema.index({ hierarchikusOsszesPont: -1 });

// SzuloId index - gyors keresés szülő alapján (kártyastóc összeállításhoz)
hierarchikusTudatpontAllokaciSchema.index({ szuloId: 1 });

// SzuloId + hierarchikusOsszesPont compound index
// Bogár logikához: adott szülő gyerekei pont szerint rendezve
hierarchikusTudatpontAllokaciSchema.index({ szuloId: 1, hierarchikusOsszesPont: -1 });

// VÁLTOZÁS: ÚJ INDEX - CRON job lekérdezés gyorsításához
// findElavultHierarchikusAllokaciok() erre a két mezőre szűr egyszerre
hierarchikusTudatpontAllokaciSchema.index(
  { hierarchiaSzint: 1, hierarchikusAdatokElavultak: 1 }
);

// ===== PRE-SAVE MIDDLEWARE =====
hierarchikusTudatpontAllokaciSchema.pre('save', function(next) {
  this.frissitve = new Date();
  next();
});

// ===== MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA =====
const HierarchikusTudatpontAllokacio = mongoose.model(
  'HierarchikusTudatpontAllokacio',
  hierarchikusTudatpontAllokaciSchema
);

module.exports = HierarchikusTudatpontAllokacio;