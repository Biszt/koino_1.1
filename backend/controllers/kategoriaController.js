// backend/controllers/kategoriaController.js

const KategoriaService = require('../services/kategoriaService');

class KategoriaController {

  // =====================================
  // ----- ÚJ KATEGÓRIA LÉTREHOZÁSA -----
  // =====================================
  async kategoriaLetrehozasa(req, res) {
    console.log('KategoriaController.kategoriaLetrehozasa - KEZDÉS');
    try {
      // 1. LÉPÉS - eEmber ID kiolvasása JWT middleware-ből
      const eemberId = req.user?.id;

      if (!eemberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      // 2. LÉPÉS - Szöveges adatok kiolvasása request body-ból
      const adatok = req.body;

      // 3. LÉPÉS - Ikon URL összeállítása
      // req.file.path helyett teljes URL-t építünk, amit a böngésző közvetlenül használhat
      // req.protocol: "http" vagy "https"
      // req.get('host'): "localhost:3000"
      // req.file.filename: "ikon-1778191022759-408.png"
      // Eredmény: "http://localhost:3000/uploads/icons/ikon-1778191022759-408.png"
      if (req.file) {
        adatok.ikon = `${req.protocol}://${req.get('host')}/uploads/icons/${req.file.filename}`;
      }

      // 4. LÉPÉS - Inicialis tudatpont validálása
      const kezdoTudatpont = parseInt(adatok.kezdoTudatpont);

      if (!kezdoTudatpont) {
        return res.status(400).json({
          success: false,
          message: 'A kezdoTudatpont megadása kötelező'
        });
      }

      // 5. LÉPÉS - Service hívás
      // Az adatok objektum most már tartalmazza az ikon teljes URL-jét
      const ujKategoria = await KategoriaService.kategoriaLetrehozasa(
        adatok,
        eemberId,
        kezdoTudatpont
      );

      console.log('KategoriaController.kategoriaLetrehozasa - VÉGE', {
        kategoriaId: ujKategoria._id
      });

      // 6. LÉPÉS - Sikeres válasz
      res.status(201).json({
        success: true,
        message: 'Kategória sikeresen létrehozva',
        kategoria: ujKategoria
      });

    } catch (error) {
      console.error('KategoriaController.kategoriaLetrehozasa - HIBA', {
        hiba: error.message
      });
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // =====================================
  // ----- KATEGÓRIA MÓDOSÍTÁSA -----
  // =====================================
  async kategoriaModositasa(req, res) {
    console.log('KategoriaController.kategoriaModositasa - KEZDÉS');
    try {
      const kategoriaId = req.params.id;
      const eemberId = req.user?.id;

      if (!eemberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      const frissitesek = req.body;

      // Ha az eember új ikont töltött fel módosításkor,
      // teljes URL-ként mentjük el – ugyanaz a logika, mint létrehozásnál
      // Ha nem töltött fel új ikont, req.file undefined → a Service nem módosítja az ikont
      if (req.file) {
        frissitesek.ikon = `${req.protocol}://${req.get('host')}/uploads/icons/${req.file.filename}`;
      }

      const frissitettKategoria = await KategoriaService.kategoriaModositasa(
        kategoriaId,
        frissitesek,
        eemberId
      );

      console.log('KategoriaController.kategoriaModositasa - VÉGE', {
        kategoriaId: frissitettKategoria._id
      });

      res.status(200).json({
        success: true,
        message: 'Kategória sikeresen módosítva',
        kategoria: frissitettKategoria
      });

    } catch (error) {
      console.error('KategoriaController.kategoriaModositasa - HIBA', {
        hiba: error.message
      });

      if (error.message.includes('nem található')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message.includes('jogosultság')) {
        return res.status(403).json({ success: false, message: error.message });
      }
      if (error.message.includes('kötelező') || error.message.includes('létezik') || error.message.includes('formátum')) {
        return res.status(400).json({ success: false, message: error.message });
      }

      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a kategória módosítása során'
      });
    }
  }

  // =====================================
  // ----- KATEGÓRIA LEKÉRÉSE ID ALAPJÁN -----
  // =====================================
  async kategoriaLekerese(req, res) {
    console.log('KategoriaController.kategoriaLekerese - KEZDÉS');
    try {
      const kategoriaId = req.params.id;
      const kategoria = await KategoriaService.kategoriaLekerese(kategoriaId);

      console.log('KategoriaController.kategoriaLekerese - VÉGE', { kategoriaId });

      res.status(200).json({ success: true, kategoria });
    } catch (error) {
      console.error('KategoriaController.kategoriaLekerese - HIBA', { hiba: error.message });

      if (error.message.includes('nem található')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a kategória lekérése során'
      });
    }
  }

  // =====================================
  // ----- KATEGÓRIÁK LISTÁZÁSA -----
  // =====================================
  async kategoriakListazasa(req, res) {
    console.log('KategoriaController.kategoriakListazasa - KEZDÉS');
    try {
      const szurok = {
        letrehozo: req.query.letrehozo,
        nev:       req.query.nev
      };

      const kategoriak = await KategoriaService.kategoriaListazasa(szurok);

      console.log('KategoriaController.kategoriakListazasa - VÉGE', {
        kategoriakSzama: kategoriak.length
      });

      res.status(200).json({
        success: true,
        count: kategoriak.length,
        kategoriak
      });
    } catch (error) {
      console.error('KategoriaController.kategoriakListazasa - HIBA', { hiba: error.message });
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a kategóriák lekérése során'
      });
    }
  }

  // =====================================
  // ----- KATEGÓRIA RÉSZLETES ADATAI -----
  // =====================================
  async kategoriaReszleteinekLekerese(req, res) {
    console.log('KategoriaController.kategoriaReszleteinekLekerese - KEZDÉS');
    try {
      const kategoriaId = req.params.id;
      const eemberId = req.user?.id;

      if (!eemberId) {
        return res.status(401).json({ success: false, message: 'Bejelentkezés szükséges' });
      }

      const reszletek = await KategoriaService.kategoriaReszleteinekLekerese(
        kategoriaId,
        eemberId
      );

      console.log('KategoriaController.kategoriaReszleteinekLekerese - VÉGE', { kategoriaId });

      res.status(200).json({ success: true, data: reszletek });
    } catch (error) {
      console.error('KategoriaController.kategoriaReszleteinekLekerese - HIBA', {
        hiba: error.message
      });

      if (error.message.includes('nem található')) {
        return res.status(404).json({ success: false, message: error.message });
      }
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a kategória részleteinek lekérése során'
      });
    }
  }
}

module.exports = new KategoriaController();