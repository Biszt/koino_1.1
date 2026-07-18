// backend/services/meghivoService.js

// Felelősség: a meghívó-életciklus ÜZLETI LOGIKÁJA.
//   - meghívó létrehozása (kód-generálás + kötelező tanúsítás)
//   - saját meghívók listázása
//   - meghívó visszavonása (csak a kibocsátó, csak Aktiv állapotban)
//   - kód érvényesítése és felhasználása regisztrációkor
//   - a MEGHIVAS_KOTELEZO kapcsoló kiolvasása
// V1-DÖNTÉS (2026-07-18, Csaba): nincs darabszám-korlát és nincs lejárat;
// a tanúsítás v1-ben = maga a meghívás (1 tanúsító, a kibocsátó).
// Használják: meghivoController, eemberService (regisztráció).

// ===== IMPORTOK =====
const crypto = require('crypto');                                  // Véletlen kód generálásához
const MeghivoRepository = require('../repositories/meghivoRepository');

// ===== KÓD-GENERÁLÁS BEÁLLÍTÁSAI =====
// Olyan karakterkészlet, amiből kimaradnak az összetéveszthető jelek
// (0/O, 1/I/L), hogy a kódot szóban is át lehessen adni.
const KOD_KARAKTEREK = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const KOD_CSOPORT_HOSSZ = 4;   // Egy csoport hossza
const KOD_CSOPORT_DARAB = 3;   // Csoportok száma → XXXX-XXXX-XXXX

// ===== MEGHÍVÓ SERVICE OSZTÁLY =====
class MeghivoService {

  // ===== KAPCSOLÓ: KÖTELEZŐ-E A MEGHÍVÓ? =====
  // A backend/.env MEGHIVAS_KOTELEZO változója vezérli. Fejlesztés/tesztelés
  // alatt 'false' (nyílt regisztráció), élesben 'true' (meghívásos).
  // Minden hívásnál frissen olvassuk, így restart nélkül is követné a változást,
  // ha a process.env-et más állítaná — de a gyakorlatban restart kell.
  // @returns {boolean} true, ha a regisztrációhoz meghívó kód kell
  meghivasKotelezoE() {
    const ertek = (process.env.MEGHIVAS_KOTELEZO || 'false').toLowerCase();
    return ertek === 'true';
  }

  // ===== MEGHÍVÓ LÉTREHOZÁSA =====
  // ÜZLETI SZABÁLY: a kibocsátónak a létrehozáskor TANÚSÍTANIA kell, hogy a
  // meghívott valódi személy és tudtomása szerint még nem regisztrált (D1).
  // @param {string} kibocsatoEemberId - A bejelentkezett e-ember azonosítója
  // @param {boolean} tanusitva - A tanúsító nyilatkozat elfogadása
  // @returns {Promise} Létrehozott meghívó
  async meghivoLetrehozasa(kibocsatoEemberId, tanusitva) {
    console.log('MeghivoService.meghivoLetrehozasa - KEZDÉS', { kibocsatoEemberId, tanusitva });

    // === 1. LÉPÉS: TANÚSÍTÁS ELLENŐRZÉSE ===
    if (tanusitva !== true) {
      throw new Error('A meghívó létrehozásához tanúsítanod kell, hogy a meghívott valódi, még nem regisztrált személy');
    }

    // === 2. LÉPÉS: EGYEDI KÓD GENERÁLÁSA ===
    // Ütközés esetén (elméleti eset) újrapróbáljuk néhányszor
    let meghivo = null;
    for (let proba = 0; proba < 5 && !meghivo; proba++) {
      const kod = this._kodGeneralasa();
      try {
        // === 3. LÉPÉS: MENTÉS ===
        meghivo = await MeghivoRepository.create({
          kibocsatoEemberId,
          kod,
          tanusitva: true
        });
      } catch (hiba) {
        // 11000 = MongoDB duplikátum-kulcs hiba → új kóddal próbálkozunk
        if (hiba.code === 11000) {
          console.log('MeghivoService.meghivoLetrehozasa - kód-ütközés, újrapróbálás', { proba });
        } else {
          throw hiba;
        }
      }
    }

    if (!meghivo) {
      throw new Error('Nem sikerült egyedi meghívó kódot generálni — próbáld újra');
    }

    console.log('MeghivoService.meghivoLetrehozasa - VÉGE', { id: meghivo._id, kod: meghivo.kod });
    return meghivo;
  }

  // ===== SAJÁT MEGHÍVÓK LISTÁZÁSA =====
  // A „Meghívóim" modalhoz: a bejelentkezett e-ember összes meghívója.
  // @param {string} kibocsatoEemberId - A bejelentkezett e-ember azonosítója
  // @returns {Promise} Meghívók tömbje (felhasználó eemberNev-vel feloldva)
  async sajatMeghivokLekerese(kibocsatoEemberId) {
    console.log('MeghivoService.sajatMeghivokLekerese - KEZDÉS', { kibocsatoEemberId });

    const meghivok = await MeghivoRepository.findByKibocsato(kibocsatoEemberId);

    console.log('MeghivoService.sajatMeghivokLekerese - VÉGE', { darab: meghivok.length });
    return meghivok;
  }

  // ===== MEGHÍVÓ VISSZAVONÁSA =====
  // ÜZLETI SZABÁLYOK: csak a saját meghívó vonható vissza, és csak amíg Aktiv
  // (felhasznált meghívót nem lehet visszacsinálni — a regisztráció megtörtént).
  // @param {string} meghivoId - A visszavonandó meghívó azonosítója
  // @param {string} kibocsatoEemberId - A bejelentkezett e-ember azonosítója
  // @returns {Promise} Frissített meghívó
  async meghivoVisszavonasa(meghivoId, kibocsatoEemberId) {
    console.log('MeghivoService.meghivoVisszavonasa - KEZDÉS', { meghivoId, kibocsatoEemberId });

    // === 1. LÉPÉS: MEGHÍVÓ LEKÉRÉSE ===
    const meghivo = await MeghivoRepository.findById(meghivoId);
    if (!meghivo) {
      throw new Error('A meghívó nem található');
    }

    // === 2. LÉPÉS: JOGOSULTSÁG — CSAK A KIBOCSÁTÓ ===
    if (String(meghivo.kibocsatoEemberId) !== String(kibocsatoEemberId)) {
      throw new Error('Csak a saját meghívódat vonhatod vissza');
    }

    // === 3. LÉPÉS: CSAK AKTÍV MEGHÍVÓ VONHATÓ VISSZA ===
    if (meghivo.statusz !== 'Aktiv') {
      throw new Error(`A meghívó nem vonható vissza (státusz: ${meghivo.statusz})`);
    }

    // === 4. LÉPÉS: STÁTUSZ ÁTÁLLÍTÁSA ÉS MENTÉS ===
    meghivo.statusz = 'Visszavont';
    const eredmeny = await MeghivoRepository.save(meghivo);

    console.log('MeghivoService.meghivoVisszavonasa - VÉGE', { id: eredmeny._id });
    return eredmeny;
  }

  // ===== KÓD ÉRVÉNYESÍTÉSE ÉS FELHASZNÁLÁSA (regisztrációkor) =====
  // Az eemberService hívja KÉT lépésben:
  //   1. kodErvenyesitese(kod) — a regisztráció ELEJÉN, mentés előtt
  //   2. kodFelhasznalasa(meghivo, ujEemberId) — a sikeres mentés UTÁN
  // Így érvénytelen kódnál el sem kezdjük a regisztrációt, de a kódot csak
  // akkor „költjük el", ha az e-ember tényleg létrejött.
  // @param {string} kod - A regisztráló által megadott meghívó kód
  // @returns {Promise} Az érvényes, Aktiv meghívó dokumentum
  async kodErvenyesitese(kod) {
    console.log('MeghivoService.kodErvenyesitese - KEZDÉS', { kod });

    if (!kod || !kod.trim()) {
      throw new Error('A regisztrációhoz meghívó kód szükséges');
    }

    const meghivo = await MeghivoRepository.findByKod(kod);
    if (!meghivo) {
      throw new Error('Érvénytelen meghívó kód');
    }
    if (meghivo.statusz !== 'Aktiv') {
      // Nem részletezzük, hogy felhasznált vagy visszavont — kifelé egységes üzenet
      throw new Error('Ez a meghívó kód már nem használható fel');
    }

    console.log('MeghivoService.kodErvenyesitese - VÉGE', { meghivoId: meghivo._id });
    return meghivo;
  }

  // @param {Object} meghivo - A kodErvenyesitese által visszaadott dokumentum
  // @param {string} ujEemberId - A frissen regisztrált e-ember azonosítója
  // @returns {Promise} Frissített meghívó
  async kodFelhasznalasa(meghivo, ujEemberId) {
    console.log('MeghivoService.kodFelhasznalasa - KEZDÉS', { meghivoId: meghivo._id, ujEemberId });

    meghivo.statusz = 'Felhasznalt';
    meghivo.felhasznalva = new Date();
    meghivo.felhasznaloEemberId = ujEemberId;
    const eredmeny = await MeghivoRepository.save(meghivo);

    console.log('MeghivoService.kodFelhasznalasa - VÉGE', { meghivoId: eredmeny._id });
    return eredmeny;
  }

  // ===== BELSŐ: VÉLETLEN KÓD GENERÁLÁSA =====
  // crypto.randomInt — kriptográfiailag erős véletlen; formátum: XXXX-XXXX-XXXX
  // @returns {string} Generált kód
  _kodGeneralasa() {
    const csoportok = [];
    for (let cs = 0; cs < KOD_CSOPORT_DARAB; cs++) {
      let csoport = '';
      for (let k = 0; k < KOD_CSOPORT_HOSSZ; k++) {
        csoport += KOD_KARAKTEREK[crypto.randomInt(KOD_KARAKTEREK.length)];
      }
      csoportok.push(csoport);
    }
    return csoportok.join('-');
  }

}

// ===== EXPORTÁLÁS =====
// Service osztály SINGLETON példány exportálása
module.exports = new MeghivoService();
