// backend/jobs/emailOsszefoglaloCronJob.js

// ===================================
// SZÜKSÉGES MODULOK IMPORTÁLÁSA
// ===================================

// node-cron - időzített feladatok kezelésére (ugyanaz, mint a javaslat-cronnál)
const cron = require('node-cron');

const emailErtesitesService = require('../services/emailErtesitesService');

// ===================================
// E-MAIL ÖSSZEFOGLALÓ CRON JOB
// ===================================
//
// Felelősség: azoknak, akik ÖSSZEFOGLALÓ módban kérnek e-mailes értesítést, időnként
// kiküldeni egy levelet az azóta keletkezett értesítéseikkel.
//
// ===== MIÉRT 10 PERCENKÉNT FUT, HA AZ IDŐKÖZ ÓRÁKBAN VAN? =====
// Az időköz e-emberenként MÁS lehet (1–168 óra). Ha mindenkinek külön ütemezést
// hoznánk létre, az ütemezéseket karban kellene tartani minden beállítás-változáskor.
// Helyette a cron SŰRŰN fut, és minden futáskor megnézi, kinél telt le a SAJÁT időköze
// (lásd emailErtesitesService.osszefoglalokKuldese). Így egyetlen ütemezés kiszolgál
// bármilyen időközt, és a beállítás azonnal érvényes.
//
// A 10 perc a pontosság és a fölösleges futások közti egyensúly: egy 1 órás időközt
// legfeljebb 10 perc csúszással szolgál ki, egy napit pedig bőven pontosan.
// Kiküldetlen értesítés nélkül a futás nem csinál semmit (üres összefoglalót sosem
// küldünk), tehát a gyakori ébredés olcsó.
// ===================================

class EmailOsszefoglaloCronJob {

  // ===================================
  // CRON JOB INDÍTÁSA
  // ===================================
  start() {
    console.log('🕒 E-mail összefoglaló CRON job indítása...');

    // Cron minta: '*/10 * * * *' = minden 10. percben
    cron.schedule('*/10 * * * *', async () => {
      try {
        const eredmeny = await emailErtesitesService.osszefoglalokKuldese();

        // Csak akkor írunk a naplóba, ha TÖRTÉNT is valami — különben 10 percenként
        // zajt termelnénk a naplóba (a javaslat-cron amúgy is percenként ír).
        if (eredmeny.kuldott > 0) {
          console.log('📬 E-mail összefoglalók kiküldve', {
            cimzettek: eredmeny.kuldott,
            ertesitesek: eredmeny.ertesitesek,
            idopont: new Date().toLocaleString('hu-HU')
          });
        }

      } catch (error) {
        // A hiba nem állíthatja meg az ütemezést — a következő futás újra próbálja
        console.error('❌ Hiba az e-mail összefoglalók küldése során:', error);
      }
    });

    console.log('✓ E-mail összefoglaló CRON job sikeresen elindítva (futás: 10 percenként)');
  }

  // ===================================
  // MANUÁLIS FUTTATÁS (TESZTELÉSHEZ)
  // ===================================
  // Használat a konténerből:
  //   docker exec koino-backend node -e "require('./jobs/emailOsszefoglaloCronJob').runManual()"
  // (Az ütemezést nem várja meg — azonnal lefuttatja az esedékes összefoglalókat.)
  async runManual() {
    console.log('🔧 Manuális e-mail összefoglaló futtatás...');
    try {
      const eredmeny = await emailErtesitesService.osszefoglalokKuldese();
      console.log('✓ Manuális futtatás befejezve', eredmeny);
      return { siker: true, eredmeny };
    } catch (error) {
      console.error('❌ Hiba a manuális futtatás során:', error);
      return { siker: false, hiba: error.message };
    }
  }
}

// ===================================
// EXPORTÁLÁS
// ===================================
module.exports = new EmailOsszefoglaloCronJob();
