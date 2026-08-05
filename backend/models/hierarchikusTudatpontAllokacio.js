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

  // ----- ŐS-LÁNC (SKÁLÁZHATÓ RÉSZFA-SZŰRÉSHEZ) -----
  // Az entitás teljes szülő-lánca a gyökérig, ÖNMAGÁVAL kezdve:
  //   [ {entitasId: saját}, {szülő}, {nagyszülő}, ..., {gyökér} ].
  // Cél: egy ág (részfa) ÖSSZES eleme EGYETLEN indexelt lekérdezéssel megkapható
  // ({ 'osLanc.entitasId': agazatId }) — több millió entitásnál is skálázik, BFS nélkül.
  // Ugyanaz a minta, mint az értesítések osLanc mezőjénél. Mivel a lánc önmagát is
  // tartalmazza, az ágazat-gyökér a saját részfájának is része (a csomópont + leszármazottai).
  // Feltöltés: tools/entitasOsLancPotlas.js (meglévő adat) + karbantartás létrehozáskor/áthelyezéskor.
  osLanc: {
    type: [{
      entitasId: { type: mongoose.Schema.Types.ObjectId },
      entitasTipus: { type: String }
    }],
    default: []
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

// SzuloId + hierarchikusOsszesPont + _id compound index
// Bogár logikához: adott szülő gyerekei pont szerint rendezve.
// A HARMADIK mező (_id) a Síkidom nézet LAPOZÁSA miatt kell: azonos pontszámú
// testvéreknél a sorrend csak akkor determinisztikus, ha van egyértelmű döntő.
// Enélkül két egymást követő lap-lekérdezés más sorrendet adhatna, és ugyanaz az
// entitás két lapon is megjelenhetne (vagy kimaradhatna). Mivel a döntő is az
// indexben van, a rendezés teljesen indexelt marad (nincs memóriabeli rendezés).
// Megjegyzés: ez az index a korábbi { szuloId, hierarchikusOsszesPont } párost
// magában foglalja (előtag), így az feleslegessé vált — az adatbázisból külön
// paranccsal dobható, de ártalmatlan.
hierarchikusTudatpontAllokaciSchema.index({ szuloId: 1, hierarchikusOsszesPont: -1, _id: 1 });

// VÁLTOZÁS: ÚJ INDEX - CRON job lekérdezés gyorsításához
// findElavultHierarchikusAllokaciok() erre a két mezőre szűr egyszerre
hierarchikusTudatpontAllokaciSchema.index(
  { hierarchiaSzint: 1, hierarchikusAdatokElavultak: 1 }
);

// ŐS-LÁNC + IDŐREND compound index (multikey az osLanc.entitasId-n)
// A Rendezés nézet ágazat-szűrt IDŐRENDI módja: { 'osLanc.entitasId': A } szűrő
// + letrehozva rendezés EGYETLEN indexelt lekérdezésben (skálázható részfa).
hierarchikusTudatpontAllokaciSchema.index({ 'osLanc.entitasId': 1, letrehozva: -1 });

// ŐS-LÁNC + ÁGAZATI (HIERARCHIKUS) PONT compound index
// A Rendezés nézet ágazat-szűrt „ágazati tudatpont" módja: { 'osLanc.entitasId': A }
// szűrő + hierarchikusOsszesPont rendezés egyetlen indexelt lekérdezésben.
hierarchikusTudatpontAllokaciSchema.index({ 'osLanc.entitasId': 1, hierarchikusOsszesPont: -1 });

// ŐS-LÁNC + _id compound index
// A Struktúra nézet ág-szűrt letöltése: { 'osLanc.entitasId': A } szűrő + _id szerinti
// kurzoros lapozás (sort: { _id: 1 }) EGYETLEN indexelt lekérdezésben — így egy
// milliós ág lapozott letöltése is teljesen indexelt marad (nincs in-memory sort).
hierarchikusTudatpontAllokaciSchema.index({ 'osLanc.entitasId': 1, _id: 1 });

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