// koino/felulet/js/components/modals/ErtekJavaslatModal.js

// ⏸️ HELYŐRZŐ — a valódi modal a Szakasz 5.5-ben jön át a prototípusból.
//
// ⭐ Amiért külön fájl, és nem a kártyák import-sorát írtuk át: így a kártya-osztályok
// **bájtra ugyanazok**, mint a prototípusban — és amikor ez a nézet elkészül, elég EZT a
// fájlt kicserélni. A kártyákhoz nem kell hozzányúlni.

import { helyorzoModal } from './helyorzoModal.js';

const ErtekJavaslatModal = helyorzoModal('Érték javaslat');

export default ErtekJavaslatModal;
export { ErtekJavaslatModal };