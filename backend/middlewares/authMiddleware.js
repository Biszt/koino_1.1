// backend/middlewares/authMiddleware.js

// JWT könyvtár importálása - token ellenőrzéshez
const jwt = require('jsonwebtoken');

// AUTH MIDDLEWARE - JWT TOKEN ELLENŐRZÉS
// Ez a middleware ellenőrzi, hogy érvényes JWT token van-e a kérésben
// Ha igen, a eember adatait hozzáadja a req.user objektumhoz

/**
 * JWT token ellenőrző middleware
 * @param {Object} req - Express request objektum
 * @param {Object} res - Express response objektum
 * @param {Function} next - Következő middleware
 */
const authMiddleware = (req, res, next) => {
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
const optionalAuthMiddleware = (req, res, next) => {
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
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = {
                id: decoded.id,
                eemberNev: decoded.eemberNev,
                tudatpontok: decoded.tudatpontok
            };
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
