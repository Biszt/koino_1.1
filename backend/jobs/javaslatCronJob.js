// backend/jobs/javaslatCronJob.js

// ===================================
// SZÜKSÉGES MODULOK IMPORTÁLÁSA
// ===================================

// node-cron - Időzített feladatok kezelésére
const cron = require('node-cron');

// ===================================
// SERVICE IMPORTÁLÁSA
// ===================================

// ÚJ IMPORT - JavaslatIdozitesService használata
const JavaslatIdozitesService = require('../services/javaslat/javaslatIdozitesService');

// ===================================
// JAVASLAT CRON JOB OSZTÁLY
// ===================================

class JavaslatCronJob {

  // ===================================
  // CRON JOB INDÍTÁSA
  // ===================================
  
  /**
   * Elindítja az időzített feladatokat
   * Percenként:
   * 1. Frissíti az elavult javaslatok értékeit
   * 2. Ellenőrzi a hatályba lépést
   */
  start() {
    console.log('🕒 Javaslat CRON job indítása...');

    // ===================================
    // IDŐZÍTÉS: MINDEN PERCBEN ELLENŐRZÉS
    // ===================================
    
    // Cron minta: '*/1 * * * *' = minden percben
    // Alternatívák:
    // - '*/5 * * * *' = 5 percenként
    // - '0 * * * *' = óránként
    // - '0 0 * * *' = naponta éjfélkor
    
    cron.schedule('*/1 * * * *', async () => {
      try {
        console.log('⏰ Javaslat frissítés és végrehajtás ellenőrzés futtatása...', new Date().toLocaleString('hu-HU'));

        // === ÚJ LOGIKA ===
        // 1. LÉPÉS: Elavult javaslatok frissítése
        // 2. LÉPÉS: Hatályba lépendő javaslatok lekérése
        // 3. LÉPÉS: Végrehajtás ellenőrzése
        // Mindez EGY metódusban történik
        await JavaslatIdozitesService.tomegesVegrehajtasEllenorzes();

        console.log('✓ Javaslat végrehajtás ellenőrzés befejezve\n');

      } catch (error) {
        // Általános CRON job hiba
        console.error('❌ Hiba a javaslat CRON job futtatása során:', error);
      }
    });

    console.log('✓ Javaslat CRON job sikeresen elindítva (futás: percenként)');
  }

  // ===================================
  // MANUÁLIS FUTTATÁS (TESZTELÉSHEZ)
  // ===================================
  
  /**
   * Manuális ellenőrzés futtatása (teszteléshez)
   * Használat: JavaslatCronJob.runManual();
   */
  async runManual() {
    console.log('🔧 Manuális javaslat végrehajtás ellenőrzés...');
    
    try {
      // Teljes ellenőrzés futtatása
      const eredmeny = await JavaslatIdozitesService.tomegesVegrehajtasEllenorzes();
      
      console.log('✓ Manuális ellenőrzés befejezve');
      console.log('Eredmény:', eredmeny);
      
      return { 
        siker: true, 
        eredmeny: eredmeny 
      };

    } catch (error) {
      console.error('❌ Hiba a manuális ellenőrzés során:', error);
      return { 
        siker: false, 
        hiba: error.message 
      };
    }
  }
}

// ===================================
// EXPORTÁLÁS
// ===================================

// Singleton példány exportálása
module.exports = new JavaslatCronJob();
