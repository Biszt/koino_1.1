// frontend/js/components/szovegSzerkeszto/blokkok/KepBlokk.js

// =============================================
// KÉP BLOKK
// Felelősség:
// - Képblokk DOM elemének létrehozása
// - Törlő gomb kezelése
// =============================================

class KepBlokk {

    // =============================================
    // KONSTRUKTOR
    // =============================================
    // @param {Object} blokk - A blokk adatobjektum (BlokkListából)
    // @param {Object} callbacks - Esemény visszahívók
    // @param {Function} callbacks.onTorles - Törlő gombra kattintáskor (blokkId)
    constructor(blokk, callbacks = {}) {
    console.log('KepBlokk.constructor - KEZDÉS', { blokk });

    this.blokk = blokk;
    this.onTorles = callbacks.onTorles || null;
    // Fókusz callback — a SzovegSzerkeszto _blokkFokuszba()-ját hívja
    this.onFokusz = callbacks.onFokusz || null;

    this.elem = null;

    console.log('KepBlokk.constructor - VÉGE');
}

    // =============================================
    // DOM ELEM LÉTREHOZÁSA
    // =============================================
    // Létrehozza a teljes képblokk struktúrát
    // (wrapper + törlő gomb + kép)
    // @returns {HTMLElement} A képblokk wrapper eleme
    letrehozas() {
    console.log('KepBlokk.letrehozas - KEZDÉS', { blokkId: this.blokk.id });

    // Fő wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'kep-blokk blokk-wrapper';
    wrapper.dataset.blokkId = this.blokk.id;
    wrapper.dataset.tipus = 'kep';

    // Fókuszálhatóvá tesszük, hogy kattintásra aktív blokk legyen
    wrapper.tabIndex = 0;

    // Kattintáskor és fókuszkor jelezzük a szülőnek, hogy ez az aktív blokk
    wrapper.addEventListener('focus', () => {
        if (this.onFokusz) this.onFokusz(this.blokk.id);
    });
    wrapper.addEventListener('click', () => {
        wrapper.focus();
    });

    // Kép elem
    const kepElem = this._kepElemLetrehozasa();

    // Összerakjuk
    wrapper.appendChild(kepElem);

    this.elem = wrapper;

    console.log('KepBlokk.letrehozas - VÉGE', { blokkId: this.blokk.id });
    return wrapper;
}

// =============================================
// KÉP BEÁLLÍTÁSA (feltöltés után hívódik)
// =============================================
// Frissíti a blokk adatait és a DOM img elemét.
// A SzovegSzerkeszto _kepBlokkHozzaadasa() hívja.
// @param {string} url - A feltöltött kép elérési útja
// @param {string} alt - A kép alternatív szövege
kepBeallitasa(url, alt) {
    console.log('KepBlokk.kepBeallitasa - KEZDÉS', { url, alt });

    // Belső adatmodell frissítése
    this.blokk.url = url;
    this.blokk.alt = alt || '';

    // DOM frissítése: az img src és alt cseréje
    if (this.elem) {
        const kepElem = this.elem.querySelector('.kep-blokk__kep');
        if (kepElem) {
            kepElem.src = url;
            kepElem.alt = alt || '';
        }
    }

    console.log('KepBlokk.kepBeallitasa - VÉGE', { url, alt });
}

    // =============================================
    // PRIVÁT - KÉP ELEM
    // =============================================
    // @returns {HTMLElement} Az img elem
    _kepElemLetrehozasa() {
        const kepElem = document.createElement('img');
        kepElem.className = 'kep-blokk__kep';
        kepElem.src = this.blokk.url;
        kepElem.alt = this.blokk.alt || '';
        kepElem.loading = 'lazy';
        kepElem.width = 800;   // Akadálymentesség: megadjuk a méretet
        kepElem.height = 600;  // (a CSS felülírja object-fit miatt)
        return kepElem;
    }

}

// =============================================
// EXPORTÁLÁS
// =============================================
export default KepBlokk;