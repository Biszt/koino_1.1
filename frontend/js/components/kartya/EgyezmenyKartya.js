// frontend/js/components/kartya/EgyezmenyKartya.js

// --- IMPORTOK ---
import Kartya from './Kartya.js';
import fejlesztesreVarMegjelenitese from '../FejlesztesreVar.js';
import TudatpontModal from '../modals/TudatpontModal.js';
import ReszletekModal from '../modals/ReszletekModal.js';
import TartalomModal from '../modals/TartalomModal.js';
import { javaslatMegnevezes } from '../../utils/javaslatMegnevezes.js';

// =============================================
// ÚJ - SzovegMezoMegjelenito importja
// =============================================
import SzovegMezoMegjelenito from '../szoveg/SzovegMezoMegjelenito.js';

// --- EGYEZMÉNY KÁRTYA OSZTÁLY ---
// Felelőssége:
// 1. Örökli a Kartya.js teljes váz logikáját (hamburger, koppintás, állapot)
// 2. Feltölti a fejlécet: javaslatTípus, támogatottsági arány, bizonyossági mutató
// 3. Feltölti a body-t (csak kiválasztott kártyán): részvételi arány + indoklás blokkok
// 4. Megadja a hamburger menü opcióit
class EgyezmenyKartya extends Kartya {

  // ----- KONSTRUKTOR -----
  // MÓDOSÍTVA: a többi kártyával azonos paraméterezés,
  // hogy a tudatpont modal innen is elérhető legyen (token + modal konténer)
  constructor(entitas, kivalasztott, onKivalasztas, token, modalKontenerAzon, onUjratoltes, onHamburgerMegnyitas) {
    console.log('EgyezmenyKartya.constructor - KEZDÉS', {
      entitasId:     entitas?.entitasId,
      javaslatTipus: entitas?.adatok?.javaslatTipus
    });

    super(entitas, kivalasztott, onKivalasztas, (entitas) => this._hamburgerOpciok(entitas), onHamburgerMegnyitas);

    // A tudatpont modalhoz szükséges adatok
    this.token             = token;
    this.modalKontenerAzon = modalKontenerAzon;
    this.onUjratoltes      = onUjratoltes;

    // =============================================
    // ÚJ - Megjelenítő példány referencia
    // =============================================
    this.szovegMezoMegjelenito = null;

    console.log('EgyezmenyKartya.constructor - VÉGE', { entitasId: entitas?.entitasId });
  }

  // ----- FEJLÉC FELTÖLTÉSE -----
  // Változatlan
  _fejlecFeltoltese(cimSav, masodikSor) {
    console.log('EgyezmenyKartya._fejlecFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};
    // A második sorba (típus-specifikus) kerül a mutatók sora.
    // A közös tudatpont-sort (1. sor) a Kartya alaposztály már megépítette.
    const fejlecTartalom = masodikSor;

    // --- JELZŐ + TÍPUS (a felső sávba) ---
    const jelzoElem = document.createElement('span');
    jelzoElem.className   = 'egyezmeny-kartya__jelzo';
    jelzoElem.textContent = '🤝';
    jelzoElem.setAttribute('aria-hidden', 'true');
    cimSav.appendChild(jelzoElem);

    // Megnevezés – pl. „Módosítási egyezmény", csomagnál „Egyezmény csomag"
    const tipusElem = document.createElement('span');
    tipusElem.className   = 'egyezmeny-kartya__tipus';
    tipusElem.textContent = javaslatMegnevezes(adatok.javaslatTipus, 'egyezmény');
    cimSav.appendChild(tipusElem);

    // --- MUTATÓK (2. sor): a négy szavazati arány (Modell A – együtt 100%) + a döntés dátuma ---
    const mutatokSor = document.createElement('div');
    mutatokSor.className = 'egyezmeny-kartya__mutatok-sor';

    mutatokSor.appendChild(this._szazalekElem('👥', adatok.reszveteliArany,    'Részvételi arány'));
    mutatokSor.appendChild(this._szazalekElem('✅', adatok.tamogatotsagiArany, 'Támogatottsági arány'));
    mutatokSor.appendChild(this._szazalekElem('❌', adatok.ellenzoiArany,      'Ellenzői arány'));
    mutatokSor.appendChild(this._szazalekElem('➖', adatok.tartozkodoiArany,   'Tartózkodói arány'));

    // Döntés (végrehajtás) dátuma – csak ha van érvényes érték
    if (adatok.dontesDatum) {
      const datum = new Date(adatok.dontesDatum);
      if (!Number.isNaN(datum.getTime())) {
        const datumSzoveg = datum.toLocaleDateString('hu-HU');
        const datumElem = document.createElement('span');
        datumElem.className = 'pakli-kartya__ikon-elem';
        datumElem.setAttribute('aria-label', `Döntés dátuma: ${datumSzoveg}`);
        datumElem.title = 'Döntés dátuma';
        datumElem.textContent = `📅 ${datumSzoveg}`;
        mutatokSor.appendChild(datumElem);
      }
    }

    fejlecTartalom.appendChild(mutatokSor);

    console.log('EgyezmenyKartya._fejlecFeltoltese - VÉGE', {
      entitasId:     this.entitas?.entitasId,
      javaslatTipus: adatok.javaslatTipus
    });
  }

  // ----- BODY FELTÖLTÉSE -----
  // =============================================
  // MÓDOSÍTVA - indoklás blokk alapú renderelés
  // =============================================
  _bodyFeltoltese(body) {
    console.log('EgyezmenyKartya._bodyFeltoltese - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    const adatok = this.entitas.adatok ?? {};

    // --- RÉSZVÉTELI ARÁNY ---
    // Változatlan
    if (adatok.reszveteliArany !== null && adatok.reszveteliArany !== undefined) {
      const raKontener = document.createElement('div');
      raKontener.className = 'egyezmeny-kartya__reszletek-sor';

      const raCimke = document.createElement('span');
      raCimke.className   = 'egyezmeny-kartya__reszlet-cimke';
      raCimke.textContent = 'Részvételi arány:';

      const raErtek = document.createElement('span');
      raErtek.className   = 'egyezmeny-kartya__reszlet-ertek';
      raErtek.textContent = `👥 ${adatok.reszveteliArany}%`;

      raKontener.appendChild(raCimke);
      raKontener.appendChild(raErtek);
      body.appendChild(raKontener);
    }

    // --- INDOKLÁS ---
    // =============================================
    // ÚJ - textContent helyett SzovegMezoMegjelenito
    // =============================================
    // Az egyezmény indoklása a lezárt javaslat szövegmezőjének pillanatképe,
    // ezért ugyanolyan blokk alapú renderelés kell, mint a JavaslatKártyánál.
    if (adatok.szovegMezo) {
      // A formátum felismerését (blokk tömb, több oldalas objektum vagy
      // legacy string) a SzovegMezoMegjelenito végzi — nyersen adjuk át
      const blokkok = adatok.szovegMezo;

      const indoklasKontener = document.createElement('div');
      indoklasKontener.className = 'egyezmeny-kartya__indoklas-kontener';
      body.appendChild(indoklasKontener);

      this.szovegMezoMegjelenito = new SzovegMezoMegjelenito(indoklasKontener, {
        blokkok,
        onEntitasKivalasztas: (entitasId, entitasTipus) => {
          console.log('EgyezmenyKartya - entitás hivatkozás koppintva', {
            entitasId,
            entitasTipus
          });
          if (typeof this.onKivalasztas === 'function') {
            this.onKivalasztas(entitasId, entitasTipus);
          }
        }
      });
    }

    console.log('EgyezmenyKartya._bodyFeltoltese - VÉGE', {
      entitasId:          this.entitas?.entitasId,
      vanReszveteliArany: adatok.reszveteliArany !== null && adatok.reszveteliArany !== undefined,
      vanSzoveg:          !!adatok.szovegMezo
    });
  }

  // =============================================
  // ÚJ - MEGSEMMISÍTÉS
  // =============================================
  destroy() {
    console.log('EgyezmenyKartya.destroy - KEZDÉS', {
      entitasId: this.entitas?.entitasId
    });

    if (this.szovegMezoMegjelenito) {
      this.szovegMezoMegjelenito.destroy();
      this.szovegMezoMegjelenito = null;
    }

    super.destroy?.();

    console.log('EgyezmenyKartya.destroy - VÉGE', {
      entitasId: this.entitas?.entitasId
    });
  }

  // ----- ÚJ TARTALOM LÉTREHOZÁSA EBBŐL ÁGAZTATVA -----
  // A közös TartalomModal-t nyitja meg létrehozás módban, az egyezményt
  // szülőként átadva (szuloId + szuloTipus: 'Egyezmeny').
  async _ujTartalomLetrehozasa(entitas) {
    console.log('EgyezmenyKartya._ujTartalomLetrehozasa - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const tartalomModal = new TartalomModal(this.modalKontenerAzon, {
      mod: 'letrehozas',
      szuloAdatok: {
        szuloId:    entitas.entitasId,
        szuloTipus: 'Egyezmeny'
      },
      onSiker: () => {
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await tartalomModal.init();
    tartalomModal.megnyitas();

    console.log('EgyezmenyKartya._ujTartalomLetrehozasa - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- RÉSZLETES ADATOK -----
  // Megnyitja a közös ReszletekModal-t erre az egyezményre.
  // A modal maga kéri le a /reszletek adatokat és jeleníti meg őket.
  async _reszletesAdatok(entitas) {
    console.log('EgyezmenyKartya._reszletesAdatok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const reszletekModal = new ReszletekModal(this.modalKontenerAzon, {
      entitas,
      token: this.token,
      // Ha az indoklásban entitás-hivatkozásra koppintanak, a paklit oda navigáljuk
      onEntitasKivalasztas: (entitasId, entitasTipus) => {
        if (typeof this.onKivalasztas === 'function') {
          this.onKivalasztas(entitasId, entitasTipus);
        }
      }
    });

    await reszletekModal.init();
    await reszletekModal.megnyitas();

    console.log('EgyezmenyKartya._reszletesAdatok - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }

  // ----- HAMBURGER MENÜ OPCIÓK -----
  // Változatlan
  _hamburgerOpciok(entitas) {
    console.log('EgyezmenyKartya._hamburgerOpciok - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    // A 🚧 ikonú pontok a fejlesztési terv részei (docs/fejlesztesi_terv.md),
    // de még nem készültek el – kattintásra a közös FejlesztesreVar üzenet jelenik meg.
    // A korábbi „Előzmény megtekintése" pont a terv szerint törölve.
    const opciok = [
      {
        ikon:           '✏️',
        felirat:        'Új tartalom létrehozása ebből',
        // Ágaztatás ebből az entitásból → tudatpont kell rá
        tudatpontFuggo: true,
        tiltvaIndok:    'Ehhez tudatpont kell ezen az entitáson. Előbb rendelj hozzá tudatpontot.',
        akcio:          () => this._ujTartalomLetrehozasa(entitas)
      },
      {
        ikon:    '🚧',
        felirat: 'Javaslat létrehozása',
        akcio:   () => fejlesztesreVarMegjelenitese('Javaslat létrehozása')
      },
      {
        ikon:       '🌟',
        felirat:    'Tudatpont módosítás',
        elvalaszto: true,
        akcio:      () => this._tudatpontModositas(entitas)
      },
      {
        ikon:       '📄',
        felirat:    'Részletes adatok',
        elvalaszto: true,
        akcio:      () => this._reszletesAdatok(entitas)
      }
    ];

    console.log('EgyezmenyKartya._hamburgerOpciok - VÉGE', {
      opciokSzama: opciok.length
    });

    return opciok;
  }

  // ----- TUDATPONT MÓDOSÍTÁS -----
  // Megnyitja a TudatpontModal-t erre az egyezményre.
  async _tudatpontModositas(entitas) {
    console.log('EgyezmenyKartya._tudatpontModositas - KEZDÉS', {
      entitasId: entitas?.entitasId
    });

    const tudatpontModal = new TudatpontModal(this.modalKontenerAzon, {
      entitasAdatok: {
        entitasId:    entitas.entitasId,
        entitasTipus: entitas.entitasTipus ?? 'Egyezmeny',
        adatok:       entitas.adatok
      },
      onSiker: () => {
        if (typeof this.onUjratoltes === 'function') this.onUjratoltes();
      }
    });

    await tudatpontModal.init();
    await tudatpontModal.megnyitas();

    console.log('EgyezmenyKartya._tudatpontModositas - VÉGE', {
      entitasId: entitas?.entitasId
    });
  }
}

// --- EXPORTÁLÁS ---
export default EgyezmenyKartya;