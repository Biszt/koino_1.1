// backend/services/javaslat/vegrehajtok/javaslatVegrehajtasiService.js

// =====================================================
// IMPORTOK
// =====================================================
// Végrehajtó stratégiák importálása
const TorlesiVegrehajto = require('./torlesiVegrehajto');
const ModositasiVegrehajto = require('./modositasiVegrehajto');
const EgyesitesiVegrehajto = require('./egyesitesiVegrehajto');
const AthelyezesiVegrehajto = require('./athelyezesiVegrehajto');
const CsomagVegrehajto = require('./csomagVegrehajto');

// HOZZÁADVA: Egyezmény szolgáltatás importálása
const EgyezmenyService = require('../../egyezmenyService');

// =====================================================
// JAVASLAT VÉGREHAJTÁSI SERVICE OSZTÁLY
// =====================================================
// Ez az osztály koordinálja a javaslatok végrehajtást
// Felelősség: Végrehajtó stratégia kiválasztása, egyezmény létrehozás koordinálás
class JavaslatVegrehajtasiService {

  // ----- JAVASLAT VÉGREHAJTÁSA -----
  /**
   * Javaslat végrehajtása típus szerint
   * Kiválasztja a megfelelő végrehajtót és meghívja
   * MÓDOSÍTVA: Egyezmény létrehozás hozzáadva
   * @param {Object} javaslat - A javaslat objektum
   * @returns {Promise<Object>} Végrehajtás eredménye
   * @throws {Error} Ha ismeretlen javaslat típus vagy végrehajtási hiba
   */
  async javaslatVegrehajtasa(javaslat) {
    // Log: metódus kezdete
    console.log('javaslatVegrehajtasa() - KEZDÉS', { 
      javaslatId: javaslat._id, 
      tipus: javaslat.javaslatTipus 
    });

    // 1. LÉPÉS - VALIDÁLÁS
    if (!javaslat) {
      throw new Error('A javaslat objektum megadása kötelező');
    }

    if (!javaslat.javaslatTipus) {
      throw new Error('A javaslat típusa nincs megadva');
    }

    // 2. LÉPÉS - VÉGREHAJTÓ STRATÉGIA KIVÁLASZTÁSA
    let vegrehajto = null;

    switch (javaslat.javaslatTipus) {
      case 'Torles':
        vegrehajto = TorlesiVegrehajto;
        break;
      case 'Modositas':
        vegrehajto = ModositasiVegrehajto;
        break;
      case 'Egyesites':
        vegrehajto = EgyesitesiVegrehajto;
        break;
      case 'Athelyezes':
        vegrehajto = AthelyezesiVegrehajto;
        break;
      case 'Csomag':
        vegrehajto = CsomagVegrehajto;
        break;
      default:
        throw new Error(`Ismeretlen javaslat típus: ${javaslat.javaslatTipus}`);
    }

    // 3. LÉPÉS - VÉGREHAJTÁS
    console.log('Végrehajtó kiválasztva:', javaslat.javaslatTipus);

    console.log("javaslatVegrehajtasa >>>>>>>>>>>>>>>>>>>>>>>>>", vegrehajto,".vegrehajtas",);
    
    const vegrehajatasEredmeny = await vegrehajto.vegrehajtas(javaslat);

    // 4. LÉPÉS - EGYEZMÉNY LÉTREHOZÁSA (ÚJ)
    console.log('Egyezmény létrehozása...');

    console.log("javaslatVegrehajtasa >>>>>>>>>>>>>>>>>>>>>>>>>> EgyezmenyService.egyezmenyLetrehozasa: ", {

    });
    
    const egyezmeny = await EgyezmenyService.egyezmenyLetrehozasa(
      javaslat,
      vegrehajatasEredmeny
    );

    console.log('Egyezmény létrehozva:', egyezmeny._id);

    // 5. LÉPÉS - TUDATPONTOK ÁTRENDEZÉSE JAVASLAT→EGYEZMÉNY (ÚJ)
    console.log('Tudatpontok átrendezése javaslat→egyezmény...');

    console.log("javaslatVegrehajtasa >>>>>>>>>>>>>>>>>>>>>>>>>>>> EgyezmenyService.tudatpontokAtrendezeseJavaslatrolEgyezmenyre");
    
    const tudatpontEredmeny = await EgyezmenyService.tudatpontokAtrendezeseJavaslatrolEgyezmenyre(
      javaslat._id.toString(),
      egyezmeny._id.toString()
    );

    console.log('Tudatpontok átrendezve:', {
      atkoltoztetettPontok: tudatpontEredmeny.tamogatok.atkoltoztetettPontok,
      visszaosztottPontok: tudatpontEredmeny.ellenzokEsTartozkodok.visszaosztottPontok
    });

    // 6. LÉPÉS - EREDMÉNY ÖSSZESÍTÉSE
    const eredmeny = {
      siker: true,
      javaslatId: javaslat._id,
      tipus: javaslat.javaslatTipus,
      vegrehajatasEredmeny: vegrehajatasEredmeny,
      egyezmeny: {
        id: egyezmeny._id,
        vegrehajtva: egyezmeny.vegrehajtva
      },
      tudatpontok: tudatpontEredmeny
    };

    // Log: metódus vége
    console.log("<<<<<<<<<<<<<<<<<<<<<<< javaslatVegrehajtasa: ", { 
      eredmeny: eredmeny
    });

    return eredmeny;
  }

}

// =====================================================
// EXPORTÁLÁS
// =====================================================
// Service osztály singleton példány exportálása
module.exports = new JavaslatVegrehajtasiService();
