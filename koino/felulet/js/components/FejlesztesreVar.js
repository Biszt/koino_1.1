// frontend/js/components/FejlesztesreVar.js

// ===== IMPORTOK =====
import Modal from './modals/Modal.js';

// =============================================
// FEJLESZTÉSRE VÁR ÜZENET
// Felelősség:
// - Egységes „Fejlesztésre vár" modal megjelenítése azokhoz a menüpontokhoz,
//   amelyek szerepelnek a fejlesztési tervben (docs/fejlesztesi_terv.md),
//   de a funkciójuk még nem készült el
// - A szöveg és a megjelenés EGY helyen módosítható minden menühöz
//
// Használják: foOldal főmenüje és az összes kártya hamburger menüje
// (GondolatKartya, JavaslatKartya, KategoriaKartya, GondolatTipusKartya,
// EgyezmenyKartya)
// =============================================

// ===== MEGJELENÍTÉS =====
// A Modal alaposztályra épül, a Modal.megerosites() mintájára.
// @param {string} funkcioNev        - a menüpont/funkció neve (a modalban jelenik meg)
// @param {string} kontenerAzonosito - a modal konténer div ID-ja
//                                     (alapértelmezés: 'modal-kontener' – a foOldalForm.html-ben van)
// @returns {Promise<Modal>} a létrehozott modal példány
async function fejlesztesreVarMegjelenitese(funkcioNev, kontenerAzonosito = 'modal-kontener') {
  console.log('fejlesztesreVarMegjelenitese - KEZDÉS', { funkcioNev, kontenerAzonosito });

  const modal = new Modal(kontenerAzonosito, {
    cim:   '🚧 Fejlesztésre vár',
    meret: 'szuk',
    tartalom: `
      <div class="fejlesztesre-var">
        <p class="fejlesztesre-var__funkcio">${funkcioNev}</p>
        <p class="fejlesztesre-var__szoveg">
          Ez a funkció a fejlesztési terv része, de még nem készült el.
        </p>
      </div>
    `,
    gombok: [
      {
        felirat:   'Rendben',
        tipus:     'elsodleges',
        azonosito: 'fejlesztesre-var-rendben-gomb',
        akcio: () => modal.bezaras()
      }
    ]
  });

  // Azonnal inicializáljuk (async!) és megnyitjuk
  await modal.init();
  modal.megnyitas();

  console.log('fejlesztesreVarMegjelenitese - VÉGE', { funkcioNev });
  return modal;
}

// ===== EXPORTÁLÁS =====
export default fejlesztesreVarMegjelenitese;
