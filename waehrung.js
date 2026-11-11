/*
 * Kilometerkompass – Währung und Entfernung für die Rechner.
 *
 * Wie in der App wird nichts umgerechnet; es ändern sich nur das Zeichen und
 * die Schreibweise. Mit Franken schreiben die Rechner schweizerisch
 * („CHF 1'234.50“, „45'000 km“, Punkt vor den Rappen).
 *
 * Welche Währungen es gibt und wie geschrieben wird, folgt der Sprache der
 * Seite (<html lang>), wie in der App (Locale.leasingtacho): Deutsch de-DE,
 * mit Franken de-CH; Französisch fr-FR, mit Franken fr-CH; Italienisch it-IT,
 * mit Franken it-CH; Spanisch immer es-ES. Die englische Seite ist für
 * Großbritannien und Irland und kennt Pfund (en-GB, „£1,234.50“) und Euro
 * (en-IE, „€1,234.50“), keine Franken.
 *
 * Voreingestellt: „?waehrung=chf“ oder „?waehrung=eur“ (auf Englisch
 * „?waehrung=gbp“ oder „?waehrung=eur“) in der Adresse, sonst Franken, wenn
 * der Browser auf die Schweiz oder Liechtenstein eingestellt ist, sonst Euro;
 * auf Englisch Euro, wenn der Browser auf Irland eingestellt ist, sonst Pfund.
 * Gespeichert wird nichts; gewechselt wird mit der Auswahl „Währung“, und die
 * Links zum anderen Rechner nehmen die Wahl der Franken mit.
 *
 * Auf der Seite:
 * - <select id="waehrung"> mit den Werten EUR und CHF (Englisch: GBP und EUR)
 * - <span class="waehrung">€</span> für jedes Währungszeichen
 * - data-chf="…" an Texten und data-chf-href="…" an Links mit eigener
 *   Schweizer Fassung; auf Englisch data-eur="…" und data-eur-href="…" für
 *   die irische Fassung. Im HTML steht die erste Währung (Euro bzw. Pfund).
 * - Platzhalter der Eingabefelder werden selbst umgeschrieben („0,12“ → „0.12“),
 *   eingetragene Beträge (inputmode="decimal") beim Wechsel ebenso. Auf
 *   Englisch stehen die Platzhalter schon englisch im HTML und bleiben, wie
 *   sie sind: Pfund und Euro schreiben dort gleich.
 *
 * Unten außerdem `Entfernung`: Kilometer oder Meilen.
 */

/**
 * Zeigt an Texten und Links mit eigener Fassung (data-chf, data-eur, data-km
 * bzw. data-chf-href …) die Fassung `name`, wenn `aktiv`, sonst die aus dem
 * HTML. Die wird dafür beim ersten Aufruf unter `ablage` abgelegt (data-eur,
 * data-gbp bzw. data-mi, an Links data-eur-href …).
 */
function fassungenZeigen(name, aktiv, ablage) {
  "use strict";
  var href = name + "Href";
  var ablageHref = ablage + "Href";
  document.querySelectorAll("[data-" + name + "]").forEach(function (e) {
    if (e.dataset[ablage] === undefined) e.dataset[ablage] = e.textContent;
    e.textContent = aktiv ? e.dataset[name] : e.dataset[ablage];
  });
  document.querySelectorAll("[data-" + name + "-href]").forEach(function (e) {
    if (e.dataset[ablageHref] === undefined) e.dataset[ablageHref] = e.getAttribute("href");
    e.setAttribute("href", aktiv ? e.dataset[href] : e.dataset[ablageHref]);
  });
}

var Waehrung = (function () {
  "use strict";

  var ZEICHEN = { EUR: "€", CHF: "CHF", GBP: "£" };

  /*
   * Je Sprache der Seite und Währung: das Format für Intl (`sprache`) und die
   * Schreibweise der Eingaben (`gruppe`, `dezimal`) für Platzhalter, Beispiel
   * und Wechsel der Währung. `vierstellig: false` schreibt vierstellige Zahlen
   * ohne Tausenderzeichen („2500“), wie Intl auf Italienisch und Spanisch.
   * Die erste Währung je Sprache ist die, die im HTML steht.
   */
  var SCHREIBWEISEN = {
    de: {
      EUR: { sprache: "de-DE", gruppe: ".", dezimal: "," },
      CHF: { sprache: "de-CH", gruppe: "'", dezimal: "." }
    },
    fr: {
      EUR: { sprache: "fr-FR", gruppe: " ", dezimal: "," },
      CHF: { sprache: "fr-CH", gruppe: " ", dezimal: "." }
    },
    it: {
      EUR: { sprache: "it-IT", gruppe: ".", dezimal: ",", vierstellig: false },
      CHF: { sprache: "it-CH", gruppe: "'", dezimal: ".", vierstellig: false }
    },
    es: {
      EUR: { sprache: "es-ES", gruppe: ".", dezimal: ",", vierstellig: false },
      CHF: { sprache: "es-ES", gruppe: ".", dezimal: ",", vierstellig: false }
    },
    en: {
      GBP: { sprache: "en-GB", gruppe: ",", dezimal: "." },
      EUR: { sprache: "en-IE", gruppe: ",", dezimal: "." }
    }
  };
  var RECHNER = /(^|\/)(rechner|angebotsvergleich|calculateur|calcolatore|calculadora)\.html/;

  var seitensprache = (document.documentElement.lang || "de").slice(0, 2).toLowerCase();
  if (!SCHREIBWEISEN[seitensprache]) seitensprache = "de";
  var englisch = seitensprache === "en";
  var waehrungen = Object.keys(SCHREIBWEISEN[seitensprache]);
  var code = voreinstellung();
  var beobachter = [];

  function schreibweise() {
    return SCHREIBWEISEN[seitensprache][code];
  }

  function voreinstellung() {
    var adresse = /[?&]waehrung=([a-z]{3})(&|$)/i.exec(window.location.search);
    if (adresse && waehrungen.indexOf(adresse[1].toUpperCase()) >= 0) return adresse[1].toUpperCase();
    var sprachen = navigator.languages || [navigator.language || ""];
    if (englisch) return sprachen.some(function (s) { return /-IE$/i.test(s); }) ? "EUR" : "GBP";
    return sprachen.some(function (s) { return /-(CH|LI)$/i.test(s); }) ? "CHF" : "EUR";
  }

  function format(optionen) {
    return new Intl.NumberFormat(schreibweise().sprache, optionen);
  }

  /** Cent, Rappen oder Pence als Betrag: „1.234,50 €“, „CHF 1'234.50“ oder „£1,234.50“. */
  function betrag(cent) {
    return format({ style: "currency", currency: code }).format(cent / 100);
  }

  /** Satz je Kilometer aus Zehntausendsteln, mit zwei bis vier Nachkommastellen. */
  function satz(zehntausendstel) {
    return format({ style: "currency", currency: code, minimumFractionDigits: 2, maximumFractionDigits: 4 })
      .format(zehntausendstel / 10000);
  }

  /** Eine Zahl wie „45.000“ bzw. „45'000“. */
  function zahl(wert, nachkommastellen) {
    return format({ maximumFractionDigits: nachkommastellen || 0 }).format(wert);
  }

  /**
   * Betrag in Zehntausendsteln aus einer Eingabe; null, wenn leer, NaN, wenn
   * keine Zahl. Ein Komma ist immer das Dezimalzeichen („0,12“, „1.234,5“).
   * Ohne Komma gilt mit Franken der Punkt als Dezimalzeichen („0.12“, „1'500“);
   * mit Euro gilt ein Punkt vor genau drei Ziffern als Tausenderpunkt („1.500“
   * sind 1.500 €), außer nach einer Null („0.125“). Spanisch schreibt auch
   * Franken mit Dezimalkomma und liest deshalb wie mit Euro.
   *
   * Englisch ist umgekehrt: Der Punkt ist das Dezimalzeichen, das Komma trennt
   * Tausender („1,500“, „1,234.50“). Ein Komma ohne Punkt, das nicht so
   * Tausender trennt, gilt als Dezimalkomma („0,12“, „0,125“).
   */
  function lesen(text) {
    var roh = text.replace(/[\s€'’]|CHF|Fr\./gi, "");
    if (englisch) roh = roh.replace(/£/g, "");
    if (roh === "") return null;
    if (englisch) {
      if (/^[1-9]\d{0,2}(,\d{3})+(\.\d*)?$/.test(roh)) {
        roh = roh.replace(/,/g, "");
      } else if (roh.indexOf(".") < 0) {
        roh = roh.replace(",", ".");
      }
    } else if (roh.indexOf(",") >= 0) {
      roh = roh.replace(/\./g, "").replace(",", ".");
    } else if (schreibweise().dezimal === "," && /^[1-9]\d{0,2}(\.\d{3})+$/.test(roh)) {
      roh = roh.replace(/\./g, "");
    }
    if (!/^\d*(\.\d*)?$/.test(roh) || roh === ".") return NaN;
    var teile = roh.split(".");
    var ganz = parseInt(teile[0] || "0", 10);
    var bruch = ((teile[1] || "") + "0000").slice(0, 4);
    return ganz * 10000 + parseInt(bruch, 10);
  }

  /**
   * Eine Eingabe in deutscher Schreibweise („45.000“, „0,12“) für die gewählte
   * Währung und die Sprache der Seite. Platzhalter in anderer Schreibweise
   * („45 000“) bleiben dabei, wie sie sind; nur Komma und Tausenderpunkt
   * zwischen Ziffern werden umgeschrieben. Auf Englisch tauschen Punkt und
   * Komma die Rollen, deshalb dort in einem Durchgang („45,000“, „0.12“).
   */
  function eingabe(deutsch) {
    var s = schreibweise();
    var text = deutsch;
    if (englisch) {
      return text.replace(/(\d)(?:\.(?=\d{3})|,(?=\d))/g, function (alles, ziffer) {
        return ziffer + (alles.charAt(1) === "." ? s.gruppe : s.dezimal);
      });
    }
    if (s.vierstellig === false) text = text.replace(/(^|[^\d.])(\d)\.(\d{3})(?![\d.])/g, "$1$2$3");
    if (s.gruppe === "." && s.dezimal === ",") return text;
    return text.replace(/(\d)\.(?=\d{3})/g, "$1" + s.gruppe).replace(/(\d),(\d)/g, "$1" + s.dezimal + "$2");
  }

  function seiteAnpassen() {
    var chf = code === "CHF";
    document.querySelectorAll(".waehrung").forEach(function (e) {
      e.textContent = ZEICHEN[code];
    });
    // Texte und Links mit eigener Fassung je weiterer Währung (data-chf bzw.
    // data-eur); die Fassung aus dem HTML wird unter der ersten abgelegt.
    waehrungen.slice(1).forEach(function (andere) {
      fassungenZeigen(andere.toLowerCase(), code === andere, waehrungen[0].toLowerCase());
    });
    if (!englisch) {
      document.querySelectorAll("input[placeholder]").forEach(function (e) {
        if (e.dataset.platzhalter === undefined) e.dataset.platzhalter = e.placeholder;
        e.placeholder = eingabe(e.dataset.platzhalter);
      });
    }
    document.querySelectorAll("a[href]").forEach(function (e) {
      var ziel = e.getAttribute("href").replace(/\?waehrung=\w+/, "");
      if (RECHNER.test(ziel)) e.setAttribute("href", chf ? ziel + "?waehrung=chf" : ziel);
    });
  }

  /** Ein Betrag aus Zehntausendsteln als schlichte Eingabe: „1500“, „0,12“ bzw. „0.12“. */
  function alsEingabe(zehntausendstel) {
    var ganz = Math.floor(zehntausendstel / 10000);
    var bruch = String(zehntausendstel % 10000 + 10000).slice(1).replace(/0+$/, "");
    return bruch ? ganz + schreibweise().dezimal + bruch : String(ganz);
  }

  function wechseln(neu) {
    if (waehrungen.indexOf(neu) < 0 || neu === code) return;
    // Eingetragene Beträge mit der alten Schreibweise lesen, damit aus „1.500 €“
    // nicht „1.50 Franken“ wird, und in der neuen wieder hinschreiben.
    var felder = document.querySelectorAll('input[inputmode="decimal"]');
    var werte = Array.prototype.map.call(felder, function (e) { return lesen(e.value); });
    code = neu;
    felder.forEach(function (e, i) {
      if (typeof werte[i] === "number" && !isNaN(werte[i])) e.value = alsEingabe(werte[i]);
    });
    seiteAnpassen();
    beobachter.forEach(function (aufruf) { aufruf(); });
  }

  var auswahl = document.getElementById("waehrung");
  if (auswahl) {
    auswahl.value = code;
    auswahl.addEventListener("change", function () { wechseln(auswahl.value); });
  }
  seiteAnpassen();

  return {
    get code() { return code; },
    /** Das Format für Intl, etwa „fr-CH“: nach Sprache der Seite und Währung. */
    get sprache() { return schreibweise().sprache; },
    betrag: betrag,
    satz: satz,
    zahl: zahl,
    lesen: lesen,
    eingabe: eingabe,
    /** Ruft `aufruf` nach jedem Wechsel der Währung auf. */
    beiWechsel: function (aufruf) { beobachter.push(aufruf); }
  };
})();

/*
 * Kilometer oder Meilen. Wählbar nur auf der englischen Seite, sonst immer
 * Kilometer.
 *
 * Wie in der App wird nichts umgerechnet: Die Zahlen stehen so im Vertrag,
 * es ändert sich nur das Zeichen dahinter („mi“ oder „km“).
 *
 * Voreingestellt: „?entfernung=mi“ oder „?entfernung=km“ in der Adresse, sonst
 * Kilometer mit Euro (Irland) und Meilen mit Pfund. Gespeichert wird nichts;
 * gewechselt wird mit der Auswahl „Distance“, unabhängig von der Währung.
 *
 * Auf der Seite:
 * - <select id="entfernung"> mit den Werten mi und km
 * - <span class="entfernung">mi</span> für jedes Zeichen der Einheit
 * - data-km="…" an Texten mit eigener Fassung für Kilometer („per km“); im
 *   HTML steht die Fassung für Meilen
 */
var Entfernung = (function () {
  "use strict";

  var sprache = (document.documentElement.lang || "de").slice(0, 2).toLowerCase();
  var englisch = sprache === "en";
  var code = voreinstellung();
  var beobachter = [];

  function voreinstellung() {
    if (!englisch) return "km";
    var adresse = /[?&]entfernung=(km|mi)(&|$)/i.exec(window.location.search);
    if (adresse) return adresse[1].toLowerCase();
    return Waehrung.code === "EUR" ? "km" : "mi";
  }

  function seiteAnpassen() {
    document.querySelectorAll(".entfernung").forEach(function (e) {
      e.textContent = code;
    });
    fassungenZeigen("km", code === "km", "mi");
  }

  var auswahl = document.getElementById("entfernung");
  if (englisch) {
    if (auswahl) {
      auswahl.value = code;
      auswahl.addEventListener("change", function () {
        if ((auswahl.value !== "km" && auswahl.value !== "mi") || auswahl.value === code) return;
        code = auswahl.value;
        seiteAnpassen();
        beobachter.forEach(function (aufruf) { aufruf(); });
      });
    }
    seiteAnpassen();
  }

  return {
    /** „km“ oder „mi“, zugleich das Zeichen hinter den Zahlen. */
    get code() { return code; },
    get zeichen() { return code; },
    /** Ruft `aufruf` nach jedem Wechsel der Einheit auf. */
    beiWechsel: function (aufruf) { beobachter.push(aufruf); }
  };
})();
