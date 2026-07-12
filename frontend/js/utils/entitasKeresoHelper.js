// frontend/js/utils/entitasKeresoHelper.js

// ===== IMPORTOK =====
import { apiGet } from './apiHelper.js';

// =============================================
// ENTITÁS KERESŐ HELPER
// Felelősség:
// - Közös, cím/név alapú entitás-keresés a backend GET /api/kereses végponton.
// - Nyers 24 karakteres ObjectId ellenőrzése típusonként (fallback, ha a felhasználó
//   ID-t ír a keresőszöveg helyett).
//
// Használják: EntitasKeresoMezo komponens (JavaslatModal mezői) és a szövegszerkesztő
// EntitasHivatkozasPanel-je. A DOM különbözik, az adat-lekérés közös (DRY).
// =============================================

// MongoDB ObjectId minta: pontosan 24 hexadecimális karakter
export const OBJECTID_MINTA = /^[0-9a-fA-F]{24}$/;

// Entitás típus → API útvonal és válaszmező megfeleltetés (nyers ID ellenőrzéshez).
// CSAK a három cím-viselő típus — a keresés is ezekre terjed ki.
const TIPUS_KONFIGURACIO = {
  Tartalom:      { utvonal: 'tartalom',      valaszMezo: 'tartalom',      cimMezo: 'cim' },
  Kategoria:     { utvonal: 'kategoria',     valaszMezo: 'kategoria',     cimMezo: 'nev' },
  TartalomTipus: { utvonal: 'tartalomTipus', valaszMezo: 'tartalomTipus', cimMezo: 'nev' },
};

// =============================================
// CÍM/NÉV ALAPÚ KERESÉS
// =============================================
// @param {string} kifejezes - A keresett cím/név-részlet
// @param {Array<string>} tipusok - Melyik típusokon keressen (pl. ['Tartalom'])
// @param {string} token - JWT token
// @returns {Promise<Array>} [{ entitasId, entitasTipus, cim }] (hiba esetén üres tömb)
export async function entitasKereses(kifejezes, tipusok, token) {
  console.log('entitasKeresoHelper.entitasKereses - KEZDÉS', { kifejezes, tipusok });

  const tisztitott = (kifejezes ?? '').trim();
  if (!tisztitott) {
    console.log('entitasKeresoHelper.entitasKereses - VÉGE (üres)');
    return [];
  }

  // Query paraméterek összeállítása (a szöveget URL-kódoljuk)
  const params = new URLSearchParams();
  params.set('q', tisztitott);
  if (Array.isArray(tipusok) && tipusok.length > 0) {
    params.set('tipusok', tipusok.join(','));
  }

  try {
    const valasz = await apiGet(`kereses?${params.toString()}`, token);
    const talalatok = valasz?.talalatok ?? [];
    console.log('entitasKeresoHelper.entitasKereses - VÉGE', { talalatok: talalatok.length });
    return talalatok;
  } catch (hiba) {
    // Keresési hiba nem kritikus — üres listát adunk vissza, a hívó nem törik meg
    console.log('entitasKeresoHelper.entitasKereses - VÉGE (hiba)', { hiba: hiba.message });
    return [];
  }
}

// =============================================
// NYERS ID ELLENŐRZÉSE (FALLBACK)
// =============================================
// A beírt 24-hex ObjectId-t sorban megpróbálja az engedélyezett típusok
// végpontjain — az első találat nyer. (A régi IdEllenorzoMezo logikája kiszervezve.)
// @param {string} id - 24 hexadecimális karakteres azonosító
// @param {Array<string>} tipusok - Engedélyezett entitás típusok
// @param {string} token - JWT token
// @returns {Promise<Object|null>} { entitasId, entitasTipus, cim } vagy null
export async function entitasEllenorzes(id, tipusok, token) {
  console.log('entitasKeresoHelper.entitasEllenorzes - KEZDÉS', { id, tipusok });

  const tipusLista = (Array.isArray(tipusok) && tipusok.length > 0)
    ? tipusok
    : Object.keys(TIPUS_KONFIGURACIO);

  for (const tipus of tipusLista) {
    const konfiguracio = TIPUS_KONFIGURACIO[tipus];
    if (!konfiguracio) continue;

    try {
      const valasz = await apiGet(`${konfiguracio.utvonal}/${id}`, token);
      const entitasAdat = valasz?.[konfiguracio.valaszMezo];
      if (entitasAdat) {
        const cim = entitasAdat[konfiguracio.cimMezo]
          ?? entitasAdat.cim
          ?? entitasAdat.nev
          ?? '(cím nélkül)';

        const eredmeny = { entitasId: id, entitasTipus: tipus, cim };
        console.log('entitasKeresoHelper.entitasEllenorzes - VÉGE (találat)', eredmeny);
        return eredmeny;
      }
    } catch (hiba) {
      // 404 vagy más hiba ennél a típusnál — próbáljuk a következőt
      console.log('entitasKeresoHelper.entitasEllenorzes - nincs találat ennél a típusnál', {
        tipus, hiba: hiba.message
      });
    }
  }

  console.log('entitasKeresoHelper.entitasEllenorzes - VÉGE (nincs találat)', { id });
  return null;
}

// =============================================
// TÍPUS FELIRAT (megjelenítéshez)
// =============================================
// A találati listában és a megerősítő sorban emberi olvasható típusnevet mutatunk.
// @param {string} tipus - 'Tartalom' | 'Kategoria' | 'TartalomTipus' | egyéb
// @returns {string} Megjelenítendő felirat
export function tipusFelirat(tipus) {
  const feliratok = {
    Tartalom:      'Tartalom',
    Kategoria:     'Kategória',
    TartalomTipus: 'Tartalomtípus',
    Egyezmeny:     'Egyezmény',
    Javaslat:      'Javaslat',
  };
  return feliratok[tipus] ?? tipus;
}
