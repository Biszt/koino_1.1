// frontend/js/components/kartya/TartalomKartya.js

// --- IMPORTOK ---
import Kartya from './Kartya.js';
import TartalomModal from '../modals/TartalomModal.js';
import JavaslatModal from '../modals/JavaslatModal.js';
import FajlBlokk from '../szovegSzerkeszto/blokkok/FajlBlokk.js';
import LinkBlokk from '../szovegSzerkeszto/blokkok/LinkBlokk.js';
import EntitasHivatkozasBlokk from '../szovegSzerkeszto/blokkok/EntitasHivatkozasBlokk.js';
import { sanitizeRichText } from '../../utils/sanitizeHelper.js';

// --- TARTALOM KÁRTYA OSZTÁLY ---
// Felelőssége:
// 1. Örökli a Kartya.js teljes váz logikáját
// 2. Feltölti a fejlécet: cím, ikonok, tudatpontok
// 3. Feltölti a body-t: rich text blokkok renderelése
// 4. Megadja a hamburger menü opcióit
class TartalomKartya extends Kartya {

  // ----- KONSTRUKTOR -----
  constructor(entitas, kivalasztott, onKivalasztas, token, modalKontenerAzon, onUjratoltes, onHamburgerMegnyitas) {
    console.log('TartalomKartya.constructor - KEZDÉS', {
      entitasId: entitas?.entitasId,
      cim:       entitas?.adatok?.cim,
      vanToken:  !!token,
      modalKontenerAzon
    });

    super(entitas, kivalasztott, onKivalasztas, (entitas) => this._hamburgerOpciok(entitas), onHamburgerMegnyitas);

    this.token             = token;
    this.modalKontenerAzon = modalKontenerAzon;
    this.onUjratoltes      = onUjratoltes;

    console.log('TartalomKartya.constructor - VÉGE', { entitasId: entitas?.entitasId });
  }

  // ----- FEJLÉC FELTÖLTÉSE -----
  // Változatlan – cím, típus ikon, kategória ikonok, tudatpontok
  _fejlecFeltoltese(fejlecTartalom) {
    console.log('TartalomKartya._fejlecFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    // --- CÍM ---
    const cimElem = document.createElement('span');
    cimElem.className   = 'tartalom-kartya__cim';
    cimElem.textContent = adatok.cim ?? '(cím nélkül)';
    fejlecTartalom.appendChild(cimElem);

    // --- TARTALOM TÍPUS IKON ---
    if (adatok.tartalomTipus?.ikon) {
      const ikonErtek = adatok.tartalomTipus.ikon;

      if (ikonErtek.startsWith('http://') || ikonErtek.startsWith('https://')) {
        const tipusIkonKep = document.createElement('img');
        tipusIkonKep.className = 'tartalom-kartya__tipus-ikon-kep';
        tipusIkonKep.src       = ikonErtek;
        tipusIkonKep.alt       = adatok.tartalomTipus.nev ?? '';
        tipusIkonKep.setAttribute('aria-hidden', 'true');
        tipusIkonKep.width  = 24;
        tipusIkonKep.height = 24;
        fejlecTartalom.appendChild(tipusIkonKep);
      } else {
        const tipusIkon = document.createElement('span');
        tipusIkon.className   = 'tartalom-kartya__tipus-ikon';
        tipusIkon.textContent = ikonErtek;
        tipusIkon.setAttribute('aria-label', adatok.tartalomTipus.nev ?? 'tartalom típus');
        tipusIkon.title = adatok.tartalomTipus.nev ?? '';
        fejlecTartalom.appendChild(tipusIkon);
      }
    }

    // --- KATEGÓRIA IKONOK ---
    if (adatok.kategoriak?.length > 0) {
      const kategoriaKontener = document.createElement('div');
      kategoriaKontener.className = 'tartalom-kartya__kategoriak';

      adatok.kategoriak.forEach((kategoria) => {
        if (kategoria?.ikon) {
          if (kategoria.ikon.startsWith('http://') || kategoria.ikon.startsWith('https://')) {
            const ikonKep = document.createElement('img');
            ikonKep.className = 'tartalom-kartya__kategoria-ikon-kep';
            ikonKep.src       = kategoria.ikon;
            ikonKep.alt       = kategoria.nev ?? '';
            ikonKep.setAttribute('aria-hidden', 'true');
            ikonKep.width  = 24;
            ikonKep.height = 24;
            kategoriaKontener.appendChild(ikonKep);
          } else {
            const kategoriaIkon = document.createElement('span');
            kategoriaIkon.className   = 'tartalom-kartya__kategoria-ikon';
            kategoriaIkon.textContent = kategoria.ikon;
            kategoriaIkon.setAttribute('aria-label', kategoria.nev ?? 'kategória');
            kategoriaIkon.title = kategoria.nev ?? '';
            kategoriaKontener.appendChild(kategoriaIkon);
          }
        }
      });

      fejlecTartalom.appendChild(kategoriaKontener);
    }

    // --- TUDATPONT SOR ---
    const tudatpontSor = document.createElement('div');
    tudatpontSor.className = 'tartalom-kartya__tudatpont-sor';

    const sajatTudatpontElem = document.createElement('span');
    sajatTudatpontElem.className = 'tartalom-kartya__tudatpont tartalom-kartya__tudatpont--sajat';
    sajatTudatpontElem.setAttribute('aria-label', 'Saját tudatpont');
    sajatTudatpontElem.textContent = `🌿🌟: ${(this.entitas.sajatTudatpont ?? 0).toLocaleString()}`;
    tudatpontSor.appendChild(sajatTudatpontElem);

    const hierarchikusTudatpontElem = document.createElement('span');
    hierarchikusTudatpontElem.className = 'tartalom-kartya__tudatpont tartalom-kartya__tudatpont--hierarchikus';
    hierarchikusTudatpontElem.setAttribute('aria-label', 'Hierarchikus tudatpont');
    hierarchikusTudatpontElem.textContent = `🌲🌟: ${(this.entitas.hierarchikusOsszesPont ?? 0).toLocaleString()}`;
    tudatpontSor.appendChild(hierarchikusTudatpontElem);

    fejlecTartalom.appendChild(tudatpontSor);

    console.log('TartalomKartya._fejlecFeltoltese - VÉGE', {
      entitasId: this.entitas?.entitasId,
      cim:       adatok.cim
    });
  }

  // ----- BODY FELTÖLTÉSE -----
  // =============================================
  // MÓDOSÍTVA - rich text blokkok renderelése
  // =============================================
  // A szöveg már nem sima string, hanem blokkok tömbje.
  // Minden blokkot a típusa alapján renderelünk.
  // @param {HTMLElement} body - A .pakli-kartya__body elem
  _bodyFeltoltese(body) {
    console.log('TartalomKartya._bodyFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    // =============================================
    // ÚJ - Blokkok tömbje vagy régi string formátum
    // =============================================
    const szoveg = adatok.szoveg ?? adatok.szovegMezo ?? null;

    // Ha nincs szöveg adat, üres body marad
    if (!szoveg) {
      console.log('TartalomKartya._bodyFeltoltese - VÉGE (nincs szöveg)');
      return;
    }

    // Ha a szöveg blokkok tömbje (új formátum), blokkokat renderelünk
    if (Array.isArray(szoveg)) {
      szoveg.forEach(blokk => this._blokkRenderelese(blokk, body));

    // Ha sima string (régi formátum, migráció előtti rekordok), bekezdésként jelenítjük meg
    } else if (typeof szoveg === 'string' && szoveg.trim()) {
      const szovegElem = document.createElement('p');
      szovegElem.className   = 'tartalom-kartya__szoveg';
      szovegElem.textContent = szoveg;
      body.appendChild(szovegElem);
    }

    console.log('TartalomKartya._bodyFeltoltese - VÉGE', {
      entitasId:    this.entitas?.entitasId,
      blokkokSzama: Array.isArray(szoveg) ? szoveg.length : 1
    });
  }

  // =============================================
  // ÚJ - BLOKK RENDERELÉSE TÍPUS ALAPJÁN
  // =============================================
  // Minden blokktípushoz a megfelelő megjelenítő elemet hozza létre.
  // A szerkesztő osztályoktól függetlenül, csak megjelenítésre optimalizálva.
  // @param {Object}      blokk - A renderelendő blokk adatobjektum
  // @param {HTMLElement} szulo - A szülő DOM elem, ahová beillesztjük
  _blokkRenderelese(blokk, szulo) {
    console.log('TartalomKartya._blokkRenderelese - KEZDÉS', {
      blokkId:   blokk?.id,
      blokkTipus: blokk?.tipus
    });

    switch (blokk.tipus) {

      // ------------------------------------------
      // SZÖVEG BLOKK
      // Formázás: félkövér, dőlt, méret CSS osztállyal
      // ------------------------------------------
      case 'szoveg': {
        if (!blokk.tartalom?.trim()) break; // Üres blokkot nem renderelünk

        const szovegElem = document.createElement('p');
        szovegElem.className = 'tartalom-kartya__szoveg-blokk';

        // Méret CSS osztály
        const meret = blokk.formatas?.meret || 'kozepes';
        szovegElem.classList.add(`tartalom-kartya__szoveg-blokk--${meret}`);

        // Félkövér
        if (blokk.formatas?.felkover) {
          szovegElem.style.fontWeight = '700';
        }

        // Dőlt
        if (blokk.formatas?.dolt) {
          szovegElem.style.fontStyle = 'italic';
        }

        // Tartalom – innerHTML-t használunk, mert a szerkesztő
        // HTML formázott tartalmat tárol (pl. <strong>, <em>)
        // sanitizeRichText szűri az engedélyezetlen tageket/attribútumokat (XSS védelem)
        szovegElem.innerHTML = sanitizeRichText(blokk.tartalom);

        szulo.appendChild(szovegElem);
        break;
      }

      // ------------------------------------------
      // KÉP BLOKK
      // Mobilon responsive, lazy load
      // ------------------------------------------
      case 'kep': {
        if (!blokk.url) break;

        const kepKontener = document.createElement('div');
        kepKontener.className = 'tartalom-kartya__kep-kontener';

        const kepElem = document.createElement('img');
        kepElem.className        = 'tartalom-kartya__kep';
        kepElem.src              = blokk.url;
        kepElem.alt              = blokk.alt || '';
        kepElem.loading          = 'lazy';   // Mobilon teljesítmény-optimalizáció
        kepElem.decoding         = 'async';
        // Méret CSS osztály a képen (kicsi/közepes/nagy)
        const kepMeret = blokk.meret || 'kozepes';
        kepElem.classList.add(`tartalom-kartya__kep--${kepMeret}`);

        kepKontener.appendChild(kepElem);
        szulo.appendChild(kepKontener);
        break;
      }

      // ------------------------------------------
      // FÁJL BLOKK
      // Letölthető link mobilon is
      // ------------------------------------------
      case 'fajl': {
        if (!blokk.url || !blokk.nev) break;

        // FajlBlokk osztályt csak megjelenítés módban példányosítjuk
        const fajlBlokk = new FajlBlokk(blokk, {}); // Törlő callback nélkül
        const domElem   = fajlBlokk.letrehozas();

        // Szerkesztő módban látható törlő gombot elrejtjük
        const torloGomb = domElem.querySelector('.blokk-torlo-gomb');
        if (torloGomb) torloGomb.style.display = 'none';

        szulo.appendChild(domElem);
        break;
      }

      // ------------------------------------------
      // LINK BLOKK
      // Külső URL megjelenítése
      // ------------------------------------------
      case 'link': {
        if (!blokk.url) break;

        const linkBlokk = new LinkBlokk(blokk, {}); // Törlő callback nélkül
        const domElem   = linkBlokk.letrehozas();

        // Törlő gomb elrejtése
        const torloGomb = domElem.querySelector('.blokk-torlo-gomb');
        if (torloGomb) torloGomb.style.display = 'none';

        szulo.appendChild(domElem);
        break;
      }

      // ------------------------------------------
      // ENTITÁS HIVATKOZÁS BLOKK
      // Koppintásra az adott entitás lesz kiválasztott
      // ------------------------------------------
      case 'entitasHivatkozas': {
        if (!blokk.entitasId) break;

        // EntitasHivatkozasBlokk megjelenítés módban példányosítva
        // onKoppintas: a Pakli.js window.aktivPakli-ján keresztül vált
        const entitasBlokk = new EntitasHivatkozasBlokk(blokk, {
          onKoppintas: (entitasId, entitasTipus) => {
            console.log('TartalomKartya - entitás hivatkozás koppintva', {
              entitasId,
              entitasTipus
            });
            // A Pakli.js window.aktivPakli-ban tárolja magát
            if (window.aktivPakli) {
              window.aktivPakli.entitasKivalasztasa(entitasId, entitasTipus);
            }
          }
        });

        // Megjelenítő módban törlő gomb nélkül
        const domElem = entitasBlokk.letrehozasMegjelenitesMod();
        szulo.appendChild(domElem);
        break;
      }

      default:
        console.warn('TartalomKartya._blokkRenderelese - Ismeretlen blokk típus:', blokk.tipus);
    }

    console.log('TartalomKartya._blokkRenderelese - VÉGE', {
      blokkId:    blokk?.id,
      blokkTipus: blokk?.tipus
    });
  }

  // ----- HAMBURGER MENÜ OPCIÓK -----
  // Változatlan
  _hamburgerOpciok(entitas) {
    console.log('TartalomKartya._hamburgerOpciok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const opciok = [
      {
        ikon:     '✏️',
        felirat:  'Új tartalom létrehozása ebből ágaztatva',
        akcio:    () => this._ujTartalomLetrehozasa(entitas)
      },
      {
        ikon:     '🌿',
        felirat:  'Javaslat létrehozása',
        akcio:    () => this._javaslatLetrehozasa(entitas)
      },
      {
        ikon:      '🌟',
        felirat:   'Tudatpont módosítás',
        elvalaszto: true,
        akcio:     () => {
          console.log('TartalomKartya - tudatpont módosítás', { entitasId: entitas?.entitasId });
        }
      },
      {
        ikon:      'ℹ️',
        felirat:   'Részletes adatok',
        elvalaszto: true,
        akcio:     () => {
          console.log('TartalomKartya - részletes adatok', { entitasId: entitas?.entitasId });
        }
      },
    ];

    console.log('TartalomKartya._hamburgerOpciok - VÉGE', {
      opciokSzama: opciok.length
    });

    return opciok;
  }

  // ----- ÚJ TARTALOM LÉTREHOZÁSA EBBŐL ÁGAZTATVA -----
  // Változatlan
  async _ujTartalomLetrehozasa(entitas) {
    console.log('TartalomKartya._ujTartalomLetrehozasa - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const tartalomModal = new TartalomModal(this.modalKontenerAzon, {
      mod: 'letrehozas',
      szuloAdatok: {
        szuloId:    entitas.entitasId,
        szuloTipus: 'Tartalom'
      },
      onSiker: (ujTartalom) => {
        console.log('TartalomKartya._ujTartalomLetrehozasa - onSiker KEZDÉS', {
          ujTartalomId: ujTartalom?._id,
          cim:          ujTartalom?.cim
        });
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
        console.log('TartalomKartya._ujTartalomLetrehozasa - onSiker VÉGE');
      }
    });

    await tartalomModal.init();
    tartalomModal.megnyitas();

    console.log('TartalomKartya._ujTartalomLetrehozasa - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- JAVASLAT LÉTREHOZÁSA -----
  // Változatlan
  async _javaslatLetrehozasa(entitas) {
    console.log('TartalomKartya._javaslatLetrehozasa - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const javaslatModal = new JavaslatModal(this.modalKontenerAzon, {
      entitasAdatok: {
        entitasId:    entitas.entitasId,
        entitasTipus: 'Tartalom',
        adatok:       entitas.adatok
      },
      szuloAdatok: {
        szuloId:    entitas.entitasId,
        szuloTipus: 'Tartalom'
      },
      onSiker: (ujJavaslat) => {
        console.log('TartalomKartya._javaslatLetrehozasa - onSiker KEZDÉS', {
          javaslatId: ujJavaslat?._id,
          tipus:      ujJavaslat?.javaslatTipus
        });
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
        console.log('TartalomKartya._javaslatLetrehozasa - onSiker VÉGE');
      }
    });

    await javaslatModal.init();
    javaslatModal.megnyitas();

    console.log('TartalomKartya._javaslatLetrehozasa - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

}

// --- EXPORTÁLÁS ---
export default TartalomKartya;