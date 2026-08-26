// backend/models/emailToken.js

// ===== MONGOOSE IMPORTÁLÁSA =====
const mongoose = require('mongoose');

// ===== E-MAIL TOKEN SÉMA =====
// Felelősség: a levélben kiküldött, egyszer használatos hivatkozások nyilvántartása.
// Két célra szolgál (a `tipus` mező különbözteti meg):
//   'megerosites'         — az e-mail cím igazolása (2. lépés)
//   'jelszoHelyreallitas' — elfelejtett jelszó (3. lépés)
//
// ===== A LEGFONTOSABB SZABÁLY: A TOKEN SOSEM TÁROLÓDIK NYERSEN =====
// Csak a token SHA-256 lenyomata kerül az adatbázisba. Aki megszerzi az adatbázist
// (vagy egy mentését), a lenyomatból NEM tudja visszaállítani a tokent, tehát nem tud
// vele fiókot átvenni. Ellenőrzéskor a beérkező tokent ugyanígy lenyomatoljuk, és a
// két lenyomatot vetjük össze. (Ugyanaz az elv, mint a jelszónál — csak ott bcrypt van,
// mert ott lassú hash kell a szótár-támadás ellen; itt a token 32 bájt VÉLETLEN, azt
// nem lehet kitalálni, ezért elég a gyors SHA-256.)
const emailTokenSchema = new mongoose.Schema({

  // ----- KIÉ A TOKEN -----
  eemberId: {
    reteg: 'helyi',  // H6
    type: mongoose.Schema.Types.ObjectId,
    ref: 'eEmber',
    required: true,
    index: true
  },

  // ----- MIRE SZÓL -----
  tipus: {
    reteg: 'helyi',  // H6
    type: String,
    enum: {
      values: ['megerosites', 'jelszoHelyreallitas'],
      message: 'Érvénytelen token-típus: {VALUE}'
    },
    required: true
  },

  // ----- A TOKEN LENYOMATA (SHA-256, hex) -----
  // Ezen keresünk a beváltáskor, ezért indexelt.
  tokenHash: {
    reteg: 'helyi',  // H6
    type: String,
    required: true,
    index: true
  },

  // ----- MELYIK CÍMRE KÜLDTÜK -----
  // KRITIKUS a megerősítésnél: az e-ember a levél kiküldése UTÁN is átírhatja a címét.
  // Ha a régi címre küldött hivatkozás igazolná az újat, azzal bárki „megerősíthetne"
  // egy olyan címet, amihez nem fér hozzá. Ezért beváltáskor összevetjük: a token
  // csak akkor érvényes, ha az e-ember MOSTANI címe ugyanez.
  email: {
    reteg: 'helyi', szemelyes: true,  // H6
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },

  // ----- MEDDIG ÉL -----
  // A MongoDB a lejárat után MAGÁTÓL törli a rekordot (TTL index, lásd lentebb),
  // így nem gyűlnek a felhasznált/elavult tokenek.
  lejarat: {
    reteg: 'helyi',  // H6
    type: Date,
    required: true
  },

  // ----- EGYSZER HASZNÁLATOS -----
  // Beváltás után true — a hivatkozás másodszor már nem működik (pl. ha a levél
  // idegen kézbe kerül azután, hogy az e-ember már használta).
  felhasznalva: {
    reteg: 'helyi',  // H6
    type: Boolean,
    default: false
  },

  letrehozva: {
    reteg: 'helyi',  // H6
    type: Date,
    default: Date.now
  }

});

// ===== TTL INDEX: A LEJÁRT TOKENEK AUTOMATIKUS TAKARÍTÁSA =====
// Az `expireAfterSeconds: 0` azt jelenti: a MongoDB akkor törli a dokumentumot, amikor
// a `lejarat` mezőben álló időpont elmúlt. Nem kell hozzá cron és takarító kód.
// (A MongoDB percenként fut rá, tehát a törlés nem másodpercre pontos — de a
// LEJÁRAT ellenőrzését amúgy is a kód végzi, ez csak a tárhely-takarítás.)
emailTokenSchema.index({ lejarat: 1 }, { expireAfterSeconds: 0 });

// ===== INDEX: EGY E-EMBER ADOTT TÍPUSÚ TOKENJEI =====
// Használat: új token kiadásakor a korábbiak érvénytelenítése.
emailTokenSchema.index({ eemberId: 1, tipus: 1 });
// ===== H6 — ADAT-OSZTÁLYOZÁS: ALAPÉRTELMEZETT RÉTEG =====
// A mezők a saját `reteg` opciójukban hordozzák a besorolásukat (lásd fentebb).
// A Mongoose által AUTOMATIKUSAN felvett mezőkre (_id, createdAt, updatedAt) viszont
// nem tudunk mező-opciót tenni — rájuk ez az alapértelmezés vonatkozik.
// A működésre nincs hatása: a Mongoose ezt az opciót megőrzi, de nem használja.
// Magyarázat és a teljes besorolás: docs/adat_osztalyozas.md (H6 híd-feladat).
emailTokenSchema.options.retegAlapertelmezes = 'helyi';

// ===== MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA =====
module.exports = mongoose.model('EmailToken', emailTokenSchema);
