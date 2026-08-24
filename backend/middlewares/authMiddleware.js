// backend/middlewares/authMiddleware.js

// JWT könyvtár importálása - token ellenőrzéshez
const jwt = require('jsonwebtoken');

// eEmber model - a token-verzió ellenőrzéséhez (lásd tokenVerzioErvenyes)
const eEmber = require('../models/eember');

// ===== TOKEN-VERZIÓ ELLENŐRZÉSE =====
// A koino tokenjei nem járnak le, ezért kell egy mód a visszavonásukra: minden token
// magában hordozza az e-ember `tokenVerzio` értékét (`tv`), és itt vetjük össze az
// adatbázisban tárolttal. Jelszóváltáskor / jelszó-helyreállításkor a tárolt szám nő
// egyet → az összes korábban kiadott token azonnal érvénytelen lesz, minden eszközön.
//
// A `?? 0` KÉT helyen is fontos:
//   - `decoded.tv ?? 0`: a mező bevezetése ELŐTT kiadott tokenekben nincs `tv`. Azokat
//     0-nak tekintjük, így a bevezetés nem lökte ki a bejelentkezett e-embereket.
//   - `eember.tokenVerzio ?? 0`: a régi e-ember-rekordokban sincs még ilyen mező.
//
// Egy indexelt _id-lekérdezés kérésenként — a koino terhelése mellett elhanyagolható.
// (Ha egyszer szűk keresztmetszet lenne, rövid életű gyorsítótár tehető elé — de azt
// MÉRÉS döntse el, ne feltételezés.)
// @param {Object} decoded - a dekódolt JWT payload
// @returns {Promise<boolean>} true, ha a token verziója érvényes
async function tokenVerzioErvenyes(decoded) {
  const eember = await eEmber.findById(decoded.id).select('tokenVerzio');

  // Ha az e-ember időközben törölte a fiókját, a tokenje sem érvényes többé
  if (!eember) return false;

  return (decoded.tv ?? 0) === (eember.tokenVerzio ?? 0);
}

// AUTH MIDDLEWARE - JWT TOKEN ELLENŐRZÉS
// Ez a middleware ellenőrzi, hogy érvényes JWT token van-e a kérésben
// Ha igen, a eember adatait hozzáadja a req.user objektumhoz

/**
 * JWT token ellenőrző middleware
 * @param {Object} req - Express request objektum
 * @param {Object} res - Express response objektum
 * @param {Function} next - Következő middleware
 */
const authMiddleware = async (req, res, next) => {
    try {
        // 1. LÉPÉS - Authorization header kiolvasása
        // Formátum: "Bearer <token>"
        const authHeader = req.headers.authorization;
        
        // 2. LÉPÉS - Ellenőrizzük, hogy van-e Authorization header
        if (!authHeader) {
            return res.status(401).json({ 
                success: false, 
                message: "Bejelentkezés szükséges - nincs token" 
            });
        }
        
        // 3. LÉPÉS - Token kinyerése a header-ből
        // Eltávolítjuk a "Bearer " előtagot
        const token = authHeader.split(' ')[1]; // "Bearer TOKEN" -> "TOKEN"
        
        // 4. LÉPÉS - Token ellenőrzése
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "Bejelentkezés szükséges - hibás token formátum" 
            });
        }
        
        // 5. LÉPÉS - Token dekódolása és validálása
        // A JWT_SECRET-tel ellenőrizzük, hogy érvényes-e a token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 5.b LÉPÉS - Token-verzió ellenőrzése (visszavonhatóság)
        // A tokenek nem járnak le, ezért ez az EGYETLEN mód érvényteleníteni őket:
        // jelszóváltás / jelszó-helyreállítás után a régi tokenek itt buknak el.
        if (!(await tokenVerzioErvenyes(decoded))) {
            console.log('authMiddleware - a token verziója elavult (jelszóváltás vagy helyreállítás történt)');
            return res.status(401).json({
                success: false,
                message: "A bejelentkezésed érvényét vesztette - jelentkezz be újra"
            });
        }

        // 6. LÉPÉS - eEmber adatok hozzáadása a request-hez
        // Így a következő middleware-ek és controllerek hozzáférhetnek
        req.user = {
            id: decoded.id,
            eemberNev: decoded.eemberNev,
            tudatpontok: decoded.tudatpontok
        };
        
        // 7. LÉPÉS - Továbbengedés a következő middleware-hez
        next();
        
    } catch (error) {
        // HIBAKEZELÉS - JWT dekódolási hiba
        console.error('JWT ellenőrzési hiba:', error);
        
        // Ha lejárt a token
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: "A token lejárt - jelentkezz be újra" 
            });
        }
        
        // Ha érvénytelen a token
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: "Érvénytelen token" 
            });
        }
        
        // Egyéb hibák
        return res.status(500).json({ 
            success: false, 
            message: "Szerver hiba a token ellenőrzése során" 
        });
    }
};

// OPCIONÁLIS AUTH MIDDLEWARE
// Ez a middleware nem kötelezi a bejelentkezést, de ha van token, akkor dekódolja
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        // 1. LÉPÉS - Authorization header kiolvasása
        const authHeader = req.headers.authorization;
        
        // 2. LÉPÉS - Ha nincs token, egyszerűen továbblépünk
        if (!authHeader) {
            req.user = null; // Nincs bejelentkezve
            return next();
        }
        
        // 3. LÉPÉS - Token kinyerése
        const token = authHeader.split(' ')[1];
        
        // 4. LÉPÉS - Ha van token, dekódoljuk
        // A token-verziót itt is ellenőrizzük: egy érvénytelenített token ne
        // számítson bejelentkezettnek a nyilvános végpontokon sem.
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (await tokenVerzioErvenyes(decoded)) {
                req.user = {
                    id: decoded.id,
                    eemberNev: decoded.eemberNev,
                    tudatpontok: decoded.tudatpontok
                };
            } else {
                // Elavult verziójú token → úgy kezeljük, mintha be sem lenne jelentkezve
                req.user = null;
            }
        } else {
            req.user = null;
        }
        
        // 5. LÉPÉS - Továbblépés
        next();
        
    } catch (error) {
        // Ha hibás a token, egyszerűen null-ra állítjuk
        req.user = null;
        next();
    }
};

// Middleware exportálása
module.exports = {
    authMiddleware,           // Kötelező bejelentkezés
    optionalAuthMiddleware    // Opcionális bejelentkezés
};
