// backend/models/eember.js

// ===== MONGOOSE IMPORTÁLÁSA =====
// Mongoose: MongoDB adatbázis kezelésére szolgáló library
const mongoose = require('mongoose');

// ===== EMBER SÉMA DEFINIÁLÁSA =====
// A Schema meghatározza az adatszerkezetet és validációs szabályokat
const eemberSchema = new mongoose.Schema({

// ----- EMBERNÉV MEZŐ -----
eemberNev: { 
  reteg: 'gondolat', szemelyes: true,  // H6
  type: String,       // Szöveges típus
  required: true,     // Kötelező mező 
  unique: true,       // Egyedi érték 
  trim: true,         // Levágja a felesleges szóközöket elejéről és végéről
  minlength: 3,       // Minimum 3 karakter hosszú
  maxlength: 30       // Maximum 30 karakter hosszú
},

// ----- EMAIL MEZŐ -----
// OPCIONÁLIS (adatvédelmi döntés): az e-ember maga dönti el, ad-e meg e-mailt.
// Az e-mailnek jelenleg NINCS önálló funkciója (nincs e-mail-küldés) — csak
// azonosításra/bejelentkezésre használható. Ezért nem kötelező, és aki nem ad meg,
// annál a mező HIÁNYZIK (nem üres string, nem null) → nem képződik funkció nélküli
// e-mail-jegyzék. Az egyediséget a séma alatti RÉSZLEGES egyedi index adja.
email: {
  reteg: 'helyi', szemelyes: true,  // H6
  type: String,        // Szöveges típus
  required: false,     // NEM kötelező — opcionális mező
  trim: true,          // Levágja a felesleges szóközöket
  lowercase: true,     // Automatikusan kisbetűssé alakítja
  default: undefined   // Ha nincs megadva, a mező hiányzik (nem null/üres)
},

// ----- AZ E-MAIL CÍM MEGERŐSÍTETTSÉGE -----
// false: a cím meg van adva, de NEM bizonyított, hogy az e-emberé.
// true : az e-ember rákattintott a címére küldött megerősítő hivatkozásra.
//
// MIÉRT KELL (2026-08-24): a cím puszta beírása nem bizonyít semmit — el lehet
// gépelni, és be lehet írni MÁSVALAKI címét is. Megerősítetlen címre küldeni
// egyszerre lenne kéretlen levél egy idegennek, ÉS fiók-átvételi kockázat
// (a jelszó-helyreállító hivatkozás idegen kezébe jutna).
// Ezért: megerősítetlen címre a koino SEMMIT nem küld — kivéve magát a megerősítő
// levelet. Ezt a szabályt az emailKuldoService.kuldesEemberNek() kényszeríti ki.
//
// FONTOS: ha az e-ember MEGVÁLTOZTATJA a címét, ez a mező VISSZAÁLL false-ra
// (lásd eemberService.profilModositasa) — az új címet újra igazolni kell.
// A meglévő e-emberek mind false-ról indulnak: visszamenőleg SENKI nem kap levelet.
emailMegerositve: {
  reteg: 'helyi',  // H6
  type: Boolean,
  default: false
},

// ----- TOKEN-VERZIÓ (A BEJELENTKEZÉSEK ÉRVÉNYTELENÍTÉSÉHEZ) -----
// A bejelentkezési token (JWT) szándékosan NEM jár le: az e-ember addig marad
// bejelentkezve, ameddig akar. Ennek viszont van egy csapdája: ha egy token
// illetéktelen kézbe kerül, a jelszó megváltoztatása ÖNMAGÁBAN nem lökné ki a
// támadót — a régi tokenje továbbra is érvényes maradna. A jelszó-helyreállítás
// enélkül félkarú lenne: „visszaszerzem a fiókom", de a betolakodó bent marad.
//
// Ezért minden kiadott token magában hordozza ezt a verziószámot (`tv` mező), és az
// authMiddleware minden kérésnél összeveti az ITT tárolt értékkel. Ha eltér, a token
// érvénytelen. A szám NŐ egyet:
//   - jelszóváltáskor (a beállításokban),
//   - jelszó-helyreállításkor (elfelejtett jelszó).
// Így e két művelet MINDEN korábbi bejelentkezést megszüntet, minden eszközön.
//
// A 0 alapérték fontos: a régi, még `tv` nélküli tokeneket 0-nak tekintjük, így a
// bevezetés NEM lökte ki a már bejelentkezett e-embereket.
tokenVerzio: {
  reteg: 'helyi',  // H6
  type: Number,
  default: 0
},

// ----- AZ UTOLSÓ ÖSSZEFOGLALÓ IDŐPONTJA -----
// ÜZEMI mező (nem beállítás): ebből tudja a küldő cron, kinél telt le az időköz.
// null = még sosem ment összefoglaló; ilyenkor a LEGRÉGEBBI kiküldetlen értesítés
// kora dönti el, esedékes-e — így a bekapcsolás után nem jön azonnal egy levél,
// és nem is kell külön „első" logika.
emailOsszefoglaloUtoljara: {
  reteg: 'helyi',  // H6
  type: Date,
  default: null
},

// ----- JELSZÓ MEZŐ -----
// FIGYELEM: itt a HASH-elt jelszó tárolódik (bcrypt, ~60 karakter), ezért ez a
// minlength gyakorlatilag mindig teljesül. A tényleges jelszó-erősség szabályt
// (min. 8 karakter + betű + szám) a jelszoHelper.validalJelszoErosseg érvényesíti.
jelszo: {
  reteg: 'helyi',  // H6
  type: String,       // Szöveges típus
  required: true,     // Kötelező mező
  minlength: 8        // Konzisztencia a jelszó-szabály minimumával
},

// ----- NÉV MEZŐ -----
// A eember valódi neve 
nev: { 
  reteg: 'gondolat', szemelyes: true,  // H6
  type: String,       // Szöveges típus
  required: true,     // Kötelező mező
  trim: true          // Levágja a felesleges szóközöket
},

// ----- LOKÁCIÓ BEÁGYAZOTT OBJEKTUM -----
// Földrajzi elhelyezkedés tárolása (3 szintű: ország/régió/település)
lokacio: {
  orszag: {           // Ország mező
    reteg: 'gondolat', szemelyes: true,  // H6
    type: String,     // Szöveges típus
    required: true    // Kötelező mező
  },
  regio: {            // Régió/megye mező
    reteg: 'gondolat', szemelyes: true,  // H6
    type: String,     // Szöveges típus
    required: true    // Kötelező mező
  },
  telepules: {        // Település/város mező
    reteg: 'gondolat', szemelyes: true,  // H6
    type: String,     // Szöveges típus
    required: true    // Kötelező mező
  }
},

// ----- TUDATPONTOK -----
// A eember tudatpontjainak száma
// Regisztrációkor minden eember 10.000 tudatpontot kap
tudatpontok: {
  reteg: 'szamitott',  // H6
  type: Number,       // Szám típus
  default: 10000,     // Alapértelmezett érték: 10.000 tudatpont
  min: 0             // Minimum érték: nem lehet negatív
},

// ----- MEGHÍVÓ E-EMBER -----
// Aki ezt az e-embert meghívta (a felhasznált meghívó kibocsátója).
// Ez a bizalmi gráf első éle — a Fázis 2 több-tanúsítós rendszere erre épül rá.
// null: a meghívás-kényszer bevezetése ELŐTT (nyílt regisztrációval) regisztrált,
// vagy kikapcsolt MEGHIVAS_KOTELEZO mellett (fejlesztői/teszt környezet).
meghivoEemberId: {
  reteg: 'mag',  // H6
  type: mongoose.Schema.Types.ObjectId,
  ref: 'eEmber',
  default: null
},

// ----- LÉTREHOZÁS DÁTUMA -----
// Amikor a eember regisztrált
letrehozva: {
  reteg: 'mag',  // H6
  type: Date,         // Dátum típus
  default: Date.now   // Alapértelmezett: jelenlegi időpont
},

// ----- UTOLSÓ BEJELENTKEZÉS -----
// Amikor a eember utoljára bejelentkezett
utolsoBejelentkezes: {
  reteg: 'helyi',  // H6
  type: Date,         // Dátum típus
  default: null       // Alapértelmezett: null (még nem jelentkezett be)
},

// ----- GLOBÁLIS ÉRTESÍTÉSI ALAPBEÁLLÍTÁS -----
// A fő menüs „Értesítési beállítások" tárolása: mely eseménytípusokról kér az
// e-ember ALAPBÓL értesítést. Ez a cascade LEGVÉGSŐ visszaesése – akkor érvényes,
// ha sem a csomóponton, sem a felmenőkön nincs saját beállítás (opt-in rendszer).
// Ugyanaz a 7 típus, mint az ErtesitesiBeallitas modellben (szinkronban tartandó).
ertesitesiAlapbeallitas: {
  ertesitesTipusok: {
    reteg: 'helyi',  // H6
    type: [String],
    enum: {
      values: [
        'ujJavaslat',
        'javaslatElfogadas',
        'javaslatElvetve',
        'szavazatErkezett',
        'szavazasiHatarido',
        'tudatpontValtozas',
        'ujGyerekEntitas',
        'kuszobValtozas',
      ],
      message: 'Érvénytelen értesítési típus: {VALUE}',
    },
    default: [],
  },
  // Tudatpont-változási küszöbök a globális szinten is (ugyanúgy, mint csomóponti beállításnál):
  // négy független küszöb (saját/össz bázis × direkt/százalék mérték), "VAGY" logikával.
  tudatpontKuszobok: {
    sajatDirekt:   { reteg: 'helyi', type: Number, min: 1, default: null },
    sajatSzazalek: { reteg: 'helyi', type: Number, min: 1, max: 100, default: null },
    osszDirekt:    { reteg: 'helyi', type: Number, min: 1, default: null },
    osszSzazalek:  { reteg: 'helyi', type: Number, min: 1, max: 100, default: null },
  },
  // TUDATPONT-TULAJDONOSSÁGI SZŰRŐ globális szinten: ha true, csak akkor jön értesítés,
  // ha az esemény entitásán van saját tudatpont (Egyezmeny-eseményre nem vonatkozik).
  // Ugyanaz a szabály, mint a csomóponti beállításban (ertesitesiBeallitas.tudatpontSzuro).
  // ----- E-MAILES ÉRTESÍTÉS (opt-in kapcsoló) -----
  // Ha true, az e-ember a felületi értesítéseket LEVÉLBEN is megkapja.
  //
  // ALAPBÓL FALSE, és ez szándékos: a koino magától soha nem küld levelet. Ez a
  // kapcsoló maga a kérés — amíg az e-ember be nem kapcsolja, semmi nem megy ki.
  // A meglévő e-emberek mind false-ról indulnak, tehát visszamenőleg senki nem kap
  // semmit (ők még az „e-mailt sosem küldünk rá" ígéret mellett adták meg a címüket).
  //
  // A bekapcsolás önmagában NEM elég: a levél-kapu megerősítetlen címre akkor sem küld
  // (lásd emailKuldoService.kuldesEemberNek + eember.emailMegerositve).
  //
  // Csak azokra a típusokra jön levél, amikre a felületi értesítés is jár — vagyis ez
  // nem egy külön feliratkozás-lista, hanem a MEGLÉVŐ értesítéseid KÉZBESÍTÉSI MÓDJA.
  emailErtesites: {
    reteg: 'helyi',  // H6
    type: Boolean,
    default: false,
  },

  // ----- A KÉZBESÍTÉS ÜTEME (Csaba döntése, 2026-08-24) -----
  // 'azonnal'      : minden értesítésről KÜLÖN levél, rögtön.
  // 'osszefoglalo' : időközönként EGY levél, benne az azóta keletkezett értesítések.
  //
  // Az alapérték az ÖSSZEFOGLALÓ, és ez tudatos: egy aktív e-ember naponta sok
  // értesítést kaphat (szavazat, tudatpont-változás, új javaslat…), és ha ezek mind
  // külön levélben mennének, az levél-özön lenne — az pedig leiratkozáshoz vagy
  // spam-jelöléshez vezet. Aki mindent azonnal akar, átállíthatja.
  emailMod: {
    reteg: 'helyi',  // H6
    type: String,
    enum: {
      values: ['azonnal', 'osszefoglalo'],
      message: 'Érvénytelen e-mail mód: {VALUE}',
    },
    default: 'osszefoglalo',
  },

  // ----- AZ ÖSSZEFOGLALÓ IDŐKÖZE ÓRÁBAN -----
  // Csak 'osszefoglalo' módban számít. Szabadon megadható 1 és 168 (= egy hét) között,
  // hogy mindenki a saját ritmusához igazíthassa — a felület gyorsválasztókat is kínál
  // (óránként / 6 óránként / naponta / hetente), de a szám bármi lehet a tartományban.
  emailOrakoz: {
    reteg: 'helyi',  // H6
    type: Number,
    min: [1, 'Legalább 1 óra'],
    max: [168, 'Legfeljebb 168 óra (egy hét)'],
    default: 24,
  },

  tudatpontSzuro: {
    reteg: 'helyi',  // H6
    type: Boolean,
    default: false,
  },
}

});

// ===== RÉSZLEGES EGYEDI INDEX AZ E-MAILRE =====
// Az e-mail OPCIONÁLIS, de HA meg van adva, EGYEDI kell legyen (egy e-mail = egy fiók),
// hogy az e-maillel való bejelentkezés egyértelmű maradjon. A `partialFilterExpression`
// miatt az egyediség CSAK a string-típusú (ténylegesen megadott) e-mailekre vonatkozik —
// így tetszőlegesen sok e-ember lehet e-mail NÉLKÜL (a hiányzó mezők nem ütköznek).
eemberSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);

// ===== INDEX: GLOBÁLIS ÉRTESÍTÉS-FELIRATKOZÓK GYORS LEKÉRÉSÉHEZ =====
// Az értesítés-küldés címzett-feloldása lekéri, kik iratkoztak fel GLOBÁLISAN egy adott
// eseménytípusra (ertesitesiAlapbeallitas.ertesitesTipusok tartalmazza a típust). Index
// nélkül ez teljes kollekció-olvasás lenne minden eseménynél.
eemberSchema.index({ 'ertesitesiAlapbeallitas.ertesitesTipusok': 1 });
// ===== H6 — ADAT-OSZTÁLYOZÁS: ALAPÉRTELMEZETT RÉTEG =====
// A mezők a saját `reteg` opciójukban hordozzák a besorolásukat (lásd fentebb).
// A Mongoose által AUTOMATIKUSAN felvett mezőkre (_id, createdAt, updatedAt) viszont
// nem tudunk mező-opciót tenni — rájuk ez az alapértelmezés vonatkozik.
// A működésre nincs hatása: a Mongoose ezt az opciót megőrzi, de nem használja.
// Magyarázat és a teljes besorolás: docs/adat_osztalyozas.md (H6 híd-feladat).
eemberSchema.options.retegAlapertelmezes = 'mag';

// ===== MODEL LÉTREHOZÁSA ÉS EXPORTÁLÁSA =====
// A model a séma alapján létrehozott adatbázis kollekció
// 'eEmber' = model neve, eemberSchema = séma definíció
const eEmber = mongoose.model('eEmber', eemberSchema);

// Model exportálása, hogy más fájlokban is használható legyen
module.exports = eEmber;