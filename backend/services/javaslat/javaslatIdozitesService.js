// backend/services/javaslat/javaslatIdozitesService.js

// === IMPORTOK ===
// Repository importálása
const JavaslatRepository = require('../../repositories/javaslatRepository');

// Szolgáltatások importálása
const JavaslatVegrehajtasiService = require('./vegrehajtok/javaslatVegrehajtasiService');
const ErtekSzamitasService = require('../ertekSzamitasService'); // ÚJ IMPORT

// === JAVASLAT IDŐZÍTÉS SERVICE OSZTÁLY ===
// Ez az osztály felelős a javaslatok időzítési logikájáért
// Felelősség: Hatályba lépés, végrehajtás ellenőrzése
class JavaslatIdozitesService {

 // === SEGÉDFÜGGVÉNYEK ===

 // ----- ÉRINTETT TARTALMAK KÜSZÖBÉRTÉKEINEK LEKÉRÉSE -----
 /**
   * Érintett tartalmak küszöbértékeinek átlagolása
   * Csak "Tartalom" típusú entitásokat vesz figyelembe
   * Ha nincs tartalom az érintettek között, alapértelmezett értékeket ad vissza
   * @param {Array} erintettEntitasok - Érintett entitások tömbje
   * @returns {Promise<Object>} Átlagolt küszöbértékek
   */
 async erintettTartalmakKuszobertekenekLekerese(erintettEntitasok) {
   console.log('("=================================== erintettTartalmakKuszobertekenekLekerese', {
     osszesErintett: erintettEntitasok.length
   });

   // 1. LÉPÉS - Csak tartalom típusú entitásokat szűrjük ki
   const tartalmak = erintettEntitasok.filter(e => e.entitasTipus === 'Tartalom');
   console.log('Szűrt tartalmak száma:', tartalmak.length);

   // Ha nincs tartalom az érintettek között, alapértelmezett értékeket adunk vissza
   if (tartalmak.length === 0) {
     console.log('Nincs tartalom az érintettek között, alapértelmezett értékek visszaadása');
     return {
       aktualJavaslatElfogadasiKuszob: 51, // Alapértelmezett minimum
       aktualReszveteliAranyKuszob: 0 // Alapértelmezett 0% (nincs küszöb)
     };
   }

   // 2. LÉPÉS - Minden tartalom küszöbértékeinek lekérése
   let osszegErtekJavaslatKuszob = 0;
   let osszegReszveteliKuszob = 0;

   for (const tartalom of tartalmak) {

     console.log("erintettTartalmakKuszobertekenekLekerese >>>>>>>>>>>>>>>>>>>>>>>>>>>>>> ErtekSzamitasService.aktulisErtekekLekerese");
     
     const ertekek = await ErtekSzamitasService.aktulisErtekekLekerese(tartalom.entitasId);
     
     console.log('Tartalom értékei:', {
       tartalomId: tartalom.entitasId,
       javaslatElfogadasiKuszob: ertekek.javaslatElfogadasiKuszob,
       reszveteliAranyKuszob: ertekek.reszveteliAranyKuszob
     });

     osszegErtekJavaslatKuszob += ertekek.javaslatElfogadasiKuszob;
     osszegReszveteliKuszob += ertekek.reszveteliAranyKuszob;
   }

   // 3. LÉPÉS - Átlagolás és kerekítés
   const atlagErtekJavaslatKuszob = Math.round(osszegErtekJavaslatKuszob / tartalmak.length);
   const atlagReszveteliKuszob = Math.round(osszegReszveteliKuszob / tartalmak.length);

   console.log('("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< erintettTartalmakKuszobertekenekLekerese', {
     aktualJavaslatElfogadasiKuszob: atlagErtekJavaslatKuszob,
     aktualReszveteliAranyKuszob: atlagReszveteliKuszob
   });

   return {
     aktualJavaslatElfogadasiKuszob: atlagErtekJavaslatKuszob,
     aktualReszveteliAranyKuszob: atlagReszveteliKuszob
   };
 }

 // === HATÁLYBA LÉPÉSI IDŐ BEÁLLÍTÁSA ===
 /**
   * Hatályba lépési időpont kiszámítása és beállítása
   * A létrehozás dátumához hozzáadja a HI-t (hatályba lépési idő)
   * Automatikusan meghívja a végrehajtás ellenőrzést
   * @param {string} javaslatId - A javaslat ID-ja
   * @returns {Promise<Object>} A frissített javaslat
   * @throws {Error} Ha a javaslat nem található
   */
 async hatalybaLepesiIdoBeallitasa(javaslatId) {
   console.log('("=================================== hatalybaLepesiIdoBeallitasa', { javaslatId: javaslatId });

   // 1. LÉPÉS - JAVASLAT LEKÉRÉSE
   const javaslat = await JavaslatRepository.findById(javaslatId);
   if (!javaslat) {
     throw new Error('A javaslat nem található');
   }

   console.log("javaslat:::::::::::::", javaslat);
   

   // 2. LÉPÉS - HATÁLYBA LÉPÉSI IDŐPONT SZÁMÍTÁSA
   // Képlet: létrehozva + dontesiIdo * 1000 (milliszekundumra váltás)
   const letrehozvaTimestamp = javaslat.letrehozva.getTime();
   const hozzaadandoMp = javaslat.dontesiIdo;
   const hozzaadandoMs = hozzaadandoMp * 1000;
   const hatalybaLepesIdeje = new Date(letrehozvaTimestamp + hozzaadandoMs);

   // 3. LÉPÉS - REPOSITORY HÍVÁS - FRISSÍTÉS ADATBÁZISBAN
   const frissitettJavaslat = await JavaslatRepository.updateHatalybaLepesIdeje(
     javaslatId,
     hatalybaLepesIdeje
   );

   console.log('("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< hatalybaLepesiIdoBeallitasa, frissitettJavaslat:', frissitettJavaslat);
   return frissitettJavaslat;
 }

 // === JAVASLAT VÉGREHAJTÁS ELLENŐRZÉSE ===
   /**
    * Egyedi javaslat végrehajtás ellenőrzése
    * Ellenőrzi, hogy a javaslat teljesíti-e a küszöbértékeket
    * @param {ObjectId} javaslatId - Javaslat azonosítója
    * @returns {Promise<Object>} { elfogadva: boolean, ... }
    */
   async javaslatVegrehajtasEllenorzese(javaslatId) {
  console.log('=================================== javaslatVegrehajtasEllenorzese', { 
    javaslatId: javaslatId 
  });

  try {
    // 1. LÉPÉS - JAVASLAT LEKÉRÉSE
    console.log("javaslatVegrehajtasEllenorzese >>>>>>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.findById: ", {
      javaslatId: javaslatId
    });
    
    const javaslat = await JavaslatRepository.findById(javaslatId);
    if (!javaslat) {
      throw new Error('Javaslat nem található');
    }

    // 2. LÉPÉS - IDŐPONT ÉS STÁTUSZ ELLENŐRZÉS
    const most = new Date();
    const hatalybaLepett = javaslat.hatalybaLepesIdeje <= most;
    const aktiv = javaslat.statusz === 'Aktiv';

    console.log('Időpont és státusz ellenőrzés:', {
      hatalybaLepett,
      aktiv,
      hatalybaLepesIdeje: javaslat.hatalybaLepesIdeje,
      mostaniIdo: most
    });

    if (!hatalybaLepett || !aktiv) {
      console.log('Javaslat még nem léphet hatályba vagy nem aktív');
      return { 
        elfogadva: false, 
        ok: 'Még nem lépett hatályba vagy nem aktív' 
      };
    }

    // 3. LÉPÉS - KÜSZÖBÉRTÉKEK LEKÉRÉSE (MINDEN TÍPUSNÁL UGYANEZ)
    console.log("javaslatVegrehajtasEllenorzese >>>>>>>>>>>>>>>>>>>>>>>>>>> this.erintettTartalmakKuszobertekenekLekerese: ", {
      javaslatTipus: javaslat.javaslatTipus,
      erintettEntitasok: javaslat.erintettEntitasok
    });
    
    const kuszobok = await this.erintettTartalmakKuszobertekenekLekerese(javaslat.erintettEntitasok);

    // 4. LÉPÉS - KÜSZÖB ELLENŐRZÉS (UNIVERZÁLIS - MINDEN TÍPUSNÁL UGYANEZ)
    const kuszobTeljesul = 
      javaslat.tamogatotsagiArany >= kuszobok.aktualJavaslatElfogadasiKuszob &&
      javaslat.reszveteliArany >= kuszobok.aktualReszveteliAranyKuszob;

    console.log('Küszöbök ellenőrzése:', {
      javaslatTipus: javaslat.javaslatTipus,
      tamogatotsagiArany: javaslat.tamogatotsagiArany,
      aktualJavaslatElfogadasiKuszob: kuszobok.aktualJavaslatElfogadasiKuszob,  // ✅ kuszobok objektumból!
      tamogatottsagTeljesul: javaslat.tamogatotsagiArany >= kuszobok.aktualJavaslatElfogadasiKuszob,
      reszveteliArany: javaslat.reszveteliArany,
      aktualReszveteliAranyKuszob: kuszobok.aktualReszveteliAranyKuszob,  // ✅ kuszobok objektumból!
      reszvételTeljesul: javaslat.reszveteliArany >= kuszobok.aktualReszveteliAranyKuszob,
      kuszobTeljesul: kuszobTeljesul
    });

    let elfogadva = false;
    let ok = '';

    if (kuszobTeljesul) {
      elfogadva = true;
      ok = 'Küszöbök teljesülnek - végrehajtás';
      console.log(`✅ ${javaslat.javaslatTipus} - Küszöbök teljesülnek - javaslat végrehajtása`);
    } else {
      elfogadva = false;
      ok = 'Küszöbök nem teljesülnek - elvetés';
      console.log(`❌ ${javaslat.javaslatTipus} - Küszöbök nem teljesülnek - javaslat elvetése`);
    }

    // 5. LÉPÉS - STÁTUSZ FRISSÍTÉSE ÉS VÉGREHAJTÁS
    if (elfogadva) {
      // ELFOGADVA - Végrehajtás
      console.log("javaslatVegrehajtasEllenorzese >>>>>>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.updateStatusz: ", {
        javaslatId: javaslatId
      }, "Elfogadva");
      
      await JavaslatRepository.updateStatusz(javaslatId, 'Elfogadva');
      
      // Végrehajtó hívása
      console.log("javaslatVegrehajtasEllenorzese >>>>>>>>>>>>>>>>>>>>>>>>>>> JavaslatVegrehajtasiService.javaslatVegrehajtasa");
      await JavaslatVegrehajtasiService.javaslatVegrehajtasa(javaslat);
      
    } else {
      // ELVETVE
      console.log("javaslatVegrehajtasEllenorzese >>>>>>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.updateStatusz: ", {
        javaslatId: javaslatId
      }, "Elvetve");
      
      await JavaslatRepository.updateStatusz(javaslatId, 'Elvetve');
    }

    // 6. LÉPÉS - EREDMÉNY VISSZAADÁSA
    console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< javaslatVegrehajtasEllenorzese: ", {
      elfogadva,
      ok,
      javaslatId
    });
    
    return {
      elfogadva,
      ok,
      javaslatId
    };

  } catch (error) {
    console.error('❌ Hiba a javaslat végrehajtás ellenőrzése során:', error);
    throw error;
  }
}


 // === HATÁLYBA LÉPENDŐ JAVASLATOK LEKÉRÉSE ===
 /**
   * Hatályba lépendő javaslatok lekérése - Cron job-hoz
   * Státusz: Elfogadva és hatályba lépési idő <= most
   * @returns {Promise<Array>} Hatályba lépendő javaslatok tömb
   */
 async hatalybaLependoJavaslatokLekerese() {
   console.log('("=================================== hatalybaLependoJavaslatokLekerese');
   
   // Repository hívás - hatályba lépendő javaslatok
   console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.findHatalybaLependok ");
   
   const javaslatok = await JavaslatRepository.findHatalybaLependok();
   
   console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< hatalybaLependoJavaslatokLekerese", {
     javaslatok: javaslatok
   });
   return javaslatok;
 }

 // === TÖMEGES VÉGREHAJTÁS ELLENŐRZÉS ===

 /**
   * Tömeges végrehajtás ellenőrzés - Cron job-hoz
   * Végignézi az összes hatályba lépendő javaslatot
   * ÚJ: Előtte frissíti az elavult javaslatokat
   * @returns {Promise<Object>} Végrehajtás statisztika
   */
 async tomegesVegrehajtasEllenorzes() {
   console.log('=================================== tomegesVegrehajtasEllenorzes::');

   // === 1. LÉPÉS: ELAVULT JAVASLATOK FRISSÍTÉSE ===
   // Mielőtt ellenőrizzük a hatályba lépést, frissítjük az elavult javaslatokat
   // Így biztosítjuk, hogy minden javaslat friss HI értékkel rendelkezik
   console.log('Elavult javaslatok frissítése...');
   
   const JavaslatService = require('./javaslatService');  // Circular import elkerülése

   console.log("tomegesVegrehajtasEllenorzes >>>>>>>>>>>>>>>>>>>>>>>>> JavaslatService.elavultJavaslatokFrissitese");
   
   const frissitesiEredmeny = await JavaslatService.elavultJavaslatokFrissitese();
   
   console.log('Frissítési eredmény:', frissitesiEredmeny);

   // === 2. LÉPÉS: HATÁLYBA LÉPENDŐ JAVASLATOK LEKÉRÉSE ===

   console.log("tomegesVegrehajtasEllenorzes >>>>>>>>>>>>>>>>>>>>>>>>>>> this.hatalybaLependoJavaslatokLekerese");
   
   const javaslatok = await this.hatalybaLependoJavaslatokLekerese();

   const eredmenyek = {
     osszesen: javaslatok.length,
     vegrehajtva: 0,
     elvetve: 0,
     hibak: []
   };

   // === 3. LÉPÉS: MINDEN JAVASLATON ITERÁLÁS ===
   // Minden javaslatot végigellenőrzünk
   for (const javaslat of javaslatok) {
     try {
       // Végrehajtás ellenőrzése
       const vegrehajtas = await this.javaslatVegrehajtasEllenorzese(javaslat._id);

       if (vegrehajtas) {
         eredmenyek.vegrehajtva++;
       }

     } catch (error) {
       // Hiba esetén rögzítjük, de folytatjuk a többi javaslattal
       eredmenyek.elvetve++;
       eredmenyek.hibak.push({
         javaslatId: javaslat._id,
         hiba: error.message
       });
     }
   }

   console.log('<<<<<<<<<<<<<<<<<<<<<<<< tomegesVegrehajtasEllenorzes=====Eredmény:', {
     eredmenyek: eredmenyek
   });
   return eredmenyek;
 }

}

// === EXPORTÁLÁS ===
// Service osztály singleton példány exportálása
module.exports = new JavaslatIdozitesService();
