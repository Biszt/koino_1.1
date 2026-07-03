// backend/middlewares/uploadMiddleware.js

// ===================================
// MULTER IMPORTÁLÁSA
// ===================================
// Multer: fájlfeltöltés kezelésére szolgáló Express middleware
const multer = require('multer');

// ===================================
// PATH IMPORTÁLÁSA
// ===================================
// Path: Node.js beépített könyvtár, fájlútvonalak kezeléséhez
const path = require('path');

// ===================================
// IKON TÁROLÁSI KONFIGURÁCIÓ
// ===================================
// Csak ikonok számára: backend/uploads/icons/ mappa
const ikonStorage = multer.diskStorage({

  // ----- CÉLMAPPA -----
  destination: function (req, file, cb) {
    console.log('uploadMiddleware.ikonStorage - destination - KEZDÉS', { originalname: file.originalname });
    cb(null, 'uploads/icons/'); // Ikonok célmappája
    console.log('uploadMiddleware.ikonStorage - destination - VÉGE', { cel: 'uploads/icons/' });
  },

  // ----- FÁJLNÉV -----
  // Formátum: ikon-[időbélyeg]-[véletlenszám].[kiterjesztés]
  filename: function (req, file, cb) {
    console.log('uploadMiddleware.ikonStorage - filename - KEZDÉS', { originalname: file.originalname });
    const kiterjesztes = path.extname(file.originalname); // Kiterjesztés kiolvasása
    const egyediFajlnev = 'ikon-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + kiterjesztes;
    console.log('uploadMiddleware.ikonStorage - filename - VÉGE', { egyediFajlnev });
    cb(null, egyediFajlnev);
  }

});

// ===================================
// SZÖVEGSZERKESZTŐ KÉP TÁROLÁSI KONFIGURÁCIÓ
// ===================================
// A SzovegSzerkeszto komponensből feltöltött képek: backend/uploads/kepek/ mappa
const szovegKepStorage = multer.diskStorage({

  // ----- CÉLMAPPA -----
  destination: function (req, file, cb) {
    console.log('uploadMiddleware.szovegKepStorage - destination - KEZDÉS', { originalname: file.originalname });
    cb(null, 'uploads/kepek/'); // Szövegszerkesztő képek célmappája
    console.log('uploadMiddleware.szovegKepStorage - destination - VÉGE', { cel: 'uploads/kepek/' });
  },

  // ----- FÁJLNÉV -----
  // Formátum: kep-[időbélyeg]-[véletlenszám].[kiterjesztés]
  filename: function (req, file, cb) {
    console.log('uploadMiddleware.szovegKepStorage - filename - KEZDÉS', { originalname: file.originalname });
    const kiterjesztes = path.extname(file.originalname); // Kiterjesztés kiolvasása
    const egyediFajlnev = 'kep-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + kiterjesztes;
    console.log('uploadMiddleware.szovegKepStorage - filename - VÉGE', { egyediFajlnev });
    cb(null, egyediFajlnev);
  }

});

// ===================================
// SZÖVEGSZERKESZTŐ FÁJL TÁROLÁSI KONFIGURÁCIÓ
// ===================================
// A SzovegSzerkeszto komponensből feltöltött általános fájlok: backend/uploads/fajlok/ mappa
const szovegFajlStorage = multer.diskStorage({

  // ----- CÉLMAPPA -----
  destination: function (req, file, cb) {
    console.log('uploadMiddleware.szovegFajlStorage - destination - KEZDÉS', { originalname: file.originalname });
    cb(null, 'uploads/fajlok/'); // Általános fájlok célmappája
    console.log('uploadMiddleware.szovegFajlStorage - destination - VÉGE', { cel: 'uploads/fajlok/' });
  },

  // ----- FÁJLNÉV -----
  // Formátum: fajl-[időbélyeg]-[véletlenszám].[kiterjesztés]
  // Az eredeti fájlnevet megőrizzük a névben, hogy felismerhető maradjon
  filename: function (req, file, cb) {
    console.log('uploadMiddleware.szovegFajlStorage - filename - KEZDÉS', { originalname: file.originalname });
    const kiterjesztes = path.extname(file.originalname); // Kiterjesztés kiolvasása
    const alapnev = path.basename(file.originalname, kiterjesztes) // Kiterjesztés nélküli név
      .replace(/[^a-zA-Z0-9]/g, '_') // Speciális karakterek cseréje aláhúzásra (biztonság)
      .substring(0, 40); // Maximum 40 karakter az alapnévből
    const egyediFajlnev = 'fajl-' + alapnev + '-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + kiterjesztes;
    console.log('uploadMiddleware.szovegFajlStorage - filename - VÉGE', { egyediFajlnev });
    cb(null, egyediFajlnev);
  }

});

// ===================================
// FÁJLTÍPUS SZŰRŐK
// ===================================

// ----- IKON SZŰRŐ -----
// Csak képfájlokat engedünk: png, jpg, jpeg, gif, svg, webp
const ikonSzuro = function (req, file, cb) {
  console.log('uploadMiddleware.ikonSzuro - KEZDÉS', { originalname: file.originalname, mimetype: file.mimetype });
  const engedélyezettTipusok = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'];
  if (engedélyezettTipusok.includes(file.mimetype)) {
    console.log('uploadMiddleware.ikonSzuro - VÉGE', { eredmeny: 'engedélyezett' });
    cb(null, true);
  } else {
    console.log('uploadMiddleware.ikonSzuro - VÉGE', { eredmeny: 'elutasítva' });
    cb(new Error('Csak képfájlok tölthetők fel ikonnak (png, jpg, jpeg, gif, svg, webp)'), false);
  }
};

// ----- SZÖVEGSZERKESZTŐ KÉP SZŰRŐ -----
// Csak képfájlokat engedünk: png, jpg, jpeg, gif, webp (svg nem, biztonsági okból)
const szovegKepSzuro = function (req, file, cb) {
  console.log('uploadMiddleware.szovegKepSzuro - KEZDÉS', { originalname: file.originalname, mimetype: file.mimetype });
  const engedélyezettTipusok = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp'];
  if (engedélyezettTipusok.includes(file.mimetype)) {
    console.log('uploadMiddleware.szovegKepSzuro - VÉGE', { eredmeny: 'engedélyezett' });
    cb(null, true);
  } else {
    console.log('uploadMiddleware.szovegKepSzuro - VÉGE', { eredmeny: 'elutasítva' });
    cb(new Error('Csak képfájlok tölthetők fel a szövegszerkesztőbe (png, jpg, jpeg, gif, webp)'), false);
  }
};

// ----- SZÖVEGSZERKESZTŐ ÁLTALÁNOS FÁJL SZŰRŐ -----
// Engedélyezett: pdf, doc, docx, xls, xlsx, txt, zip, mp3, mp4, stb.
// Tiltott: exe, bat, sh, php és más futtatható fájlok (biztonsági okból)
const szovegFajlSzuro = function (req, file, cb) {
  console.log('uploadMiddleware.szovegFajlSzuro - KEZDÉS', { originalname: file.originalname, mimetype: file.mimetype });

  // Tiltott kiterjesztések listája (futtatható fájlok)
  const tiltottKiterjesztesek = ['.exe', '.bat', '.sh', '.php', '.py', '.msi', '.cmd'];
  const kiterjesztes = path.extname(file.originalname).toLowerCase(); // Kiterjesztés kisbetűsen

  if (tiltottKiterjesztesek.includes(kiterjesztes)) { // Ha tiltott kiterjesztés
    console.log('uploadMiddleware.szovegFajlSzuro - VÉGE', { eredmeny: 'elutasítva', kiterjesztes });
    cb(new Error('Ez a fájltípus biztonsági okból nem tölthető fel: ' + kiterjesztes), false);
  } else {
    console.log('uploadMiddleware.szovegFajlSzuro - VÉGE', { eredmeny: 'engedélyezett', kiterjesztes });
    cb(null, true);
  }
};

// ===================================
// MULTER PÉLDÁNYOK LÉTREHOZÁSA
// ===================================

// ----- IKON FELTÖLTŐ -----
// Csak ikonokhoz, max 2 MB
const ikonUpload = multer({
  storage: ikonStorage,       // Ikon célmappa és névgeneráló
  fileFilter: ikonSzuro,      // Csak képek
  limits: {
    fileSize: 2 * 1024 * 1024 // 2 MB
  }
});

// ----- SZÖVEGSZERKESZTŐ KÉP FELTÖLTŐ -----
// Szövegbe ágyazott képekhez, max 5 MB
const szovegKepUpload = multer({
  storage: szovegKepStorage,  // Kép célmappa és névgeneráló
  fileFilter: szovegKepSzuro, // Csak képek (svg nélkül)
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  }
});

// ----- SZÖVEGSZERKESZTŐ FÁJL FELTÖLTŐ -----
// Szövegbe csatolt általános fájlokhoz, max 20 MB
const szovegFajlUpload = multer({
  storage: szovegFajlStorage, // Fájl célmappa és névgeneráló
  fileFilter: szovegFajlSzuro, // Tiltott kiterjesztések kiszűrése
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB
  }
});

// ===================================
// EXPORTÁLÁS
// ===================================
module.exports = {
  ikonFeltoltes: ikonUpload.single('ikon'),           // Egy ikon feltöltése (meglévő, változatlan)
  szovegKepFeltoltes: szovegKepUpload.single('kep'),  // Egy kép feltöltése a szövegszerkesztőből
  szovegFajlFeltoltes: szovegFajlUpload.single('fajl') // Egy fájl feltöltése a szövegszerkesztőből
};