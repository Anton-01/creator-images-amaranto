/**
 * Generador de imágenes · Amaranto Morelia — lógica de la aplicación.
 *
 * Orden de secciones:
 *   1. Estado y utilidades
 *   2. Persistencia (LocalStorage)
 *   3. Logotipos
 *   4. Plantillas y dibujado del lienzo
 *   5. Foto: arrastre, pellizco y encuadre
 *   6. Controles del panel
 *   7. Guardar / cargar configuración
 *   8. Hoja de edición para móvil
 *   9. Ajuste de vista
 *  10. Exportar (descarga y WhatsApp)
 *  11. Arranque
 *
 * Depende de: logos.js, config.js, storage.js (en ese orden) y de html2canvas.
 */
(function (global) {
  "use strict";

  var Amaranto = global.Amaranto || {};
  var CFG = Amaranto.CONFIG;
  var Storage = Amaranto.Storage;
  var LOGOS = Amaranto.LOGOS;

  var SIZES = CFG.SIZES;
  var TPL = CFG.TPL;
  var TPLNAME = CFG.TPLNAME;
  var COLORS = CFG.COLORS;
  var PALETTES = CFG.PALETTES;
  var FONTS = CFG.FONTS;
  var LABELS = CFG.LABELS;
  var LONG = CFG.LONG;
  var LOGO_AR = CFG.LOGO_AR;
  var LOGO_BASE = CFG.LOGO_BASE;

  /* ================================================================
   * 1. ESTADO Y UTILIDADES
   * ================================================================ */

  function $(id) { return document.getElementById(id); }

  /** Configuración actual: lo guardado en este navegador o los valores de fábrica. */
  var S = Storage.load();

  /** La foto vive aparte del estado: nunca se guarda ni se exporta al .json. */
  var photo = { url: null, natW: 0, natH: 0, zoom: 1, x: 0, y: 0 };

  var role = "display";  // pestaña activa dentro de "Fuentes"
  var preview = 1;       // escala a la que se muestra el lienzo

  var card = $("card");
  var frame = $("frame");
  var hold = $("hold");

  function isMobile() { return global.matchMedia("(max-width:900px)").matches; }
  var MOBILE = isMobile();
  document.body.classList.toggle("mobile", MOBILE);

  /* ================================================================
   * 2. PERSISTENCIA
   * ================================================================ */

  var cfgStatus = $("cfgStatus");

  function formatWhen(iso) {
    var d = iso ? new Date(iso) : new Date();
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }) +
      " · " + d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  }

  /** Mensaje bajo los botones de la pestaña "Guardar". */
  function setStatus(text, kind) {
    if (!cfgStatus) return;
    cfgStatus.textContent = text;
    cfgStatus.className = "hint" + (kind ? " " + kind : "");
  }

  /** Guardado automático: se agrupa para no escribir en cada tecla. */
  function persistSoon() { Storage.scheduleSave(S); }

  /** Guardado inmediato. Devuelve `true` si quedó en LocalStorage. */
  function persistNow() { return Storage.save(S); }

  /**
   * Los cambios se guardan solos. En vez de llamar a `persistSoon()` en cada
   * manejador (y arriesgarse a olvidar uno), se escucha en fase de captura: así
   * llegan también los eventos de los controles que `render()` vuelve a crear y
   * los del texto editable dentro del lienzo.
   */
  function wireAutoSave() {
    ["input", "change"].forEach(function (type) {
      document.addEventListener(type, persistSoon, true);
    });
    /* Los chips y los botones de renglón cambian el estado sin disparar `input`. */
    document.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest("button")) persistSoon();
    }, true);

    /* Al cerrar u ocultar la pestaña se escribe lo que quedara pendiente. */
    global.addEventListener("pagehide", function () { Storage.flush(S); });
    global.addEventListener("beforeunload", function () { Storage.flush(S); });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") Storage.flush(S);
      else refreshDateIfStale();
    });
  }

  /** Mensaje inicial: dice si se recuperó algo y si el navegador permite guardar. */
  function reportInitialStorage() {
    if (!Storage.isPersistent()) {
      setStatus("Este navegador no permite guardar (modo privado o cookies bloqueadas). " +
        "Tus cambios durarán sólo mientras la página siga abierta: descarga el archivo para no perderlos.", "warn");
      return;
    }
    if (Storage.hasSaved()) {
      setStatus("Se recuperó tu configuración guardada en este navegador · " + formatWhen(Storage.savedAt()), "ok");
    } else {
      setStatus("Tus cambios se guardan solos en este navegador.");
    }
  }

  /* ================================================================
   * 3. LOGOTIPOS
   * ================================================================ */

  var IMGS = {};
  var tintCache = {};
  var pendingLogos = 0;

  function preloadLogos() {
    ["word", "mark"].forEach(function (k) {
      var im = new Image();
      pendingLogos++;
      im.onload = im.onerror = function () { if (--pendingLogos === 0) paintLogos(); };
      im.src = LOGOS[k];
      IMGS[k] = im;
    });
  }

  /** Recolorea el logotipo dibujándolo en un canvas y rellenando con `source-in`. */
  function tint(v, color) {
    var key = v + "|" + color;
    if (tintCache[key]) return tintCache[key];
    var im = IMGS[v];
    if (!im || !im.naturalWidth) return null;
    var c = document.createElement("canvas");
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    var x = c.getContext("2d");
    x.drawImage(im, 0, 0);
    x.globalCompositeOperation = "source-in";
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    return (tintCache[key] = c.toDataURL("image/png"));
  }

  function logoVariant() {
    return S.logo.variant === "auto" ? LOGO_BASE[S.tpl].v : S.logo.variant;
  }

  function paintLogos() {
    var v = logoVariant();
    card.querySelectorAll("[data-logo]").forEach(function (el) {
      if (v === "none") { el.style.display = "none"; return; }
      el.style.display = "block";
      var u = parseFloat(getComputedStyle(card).getPropertyValue("--u")) || 1;
      var h = LOGO_BASE[S.tpl].h * (S.logo.scale / 100) * u;
      var pad = S.logo.plate ? h * 0.16 : 0;
      el.className = "logo " + (S.logo.plate ? "plate " : "") + v;
      el.style.height = (h + pad * 2) + "px";
      el.style.width = (h * LOGO_AR[v] + pad * 2) + "px";
      el.style.padding = pad + "px";
      el.style.backgroundSize = "calc(100% - " + (pad * 2) + "px) calc(100% - " + (pad * 2) + "px)";
      var d = tint(v, S.logo.color);
      if (d) el.style.backgroundImage = 'url("' + d + '")';
    });
  }

  /* ================================================================
   * 4. PLANTILLAS Y DIBUJADO DEL LIENZO
   * ================================================================ */

  function tplHTML(t) {
    var ed = ' contenteditable="true" spellcheck="false"';

    if (t === "menu") return "" +
      '<div class="mHead"><div class="logo" data-logo></div>' +
        '<div class="seal"><div class="k bdy" data-f="sealK"' + ed + '></div><div class="d prc" data-f="sealDay"' + ed + '></div><div class="n bdy" data-f="sealDate"' + ed + '></div></div></div>' +
      '<div class="hero photoSlot"><div class="ph">Toca aquí para subir tu foto</div><div class="veil"></div>' +
        '<div class="cap"><div class="eb bdy" data-f="heroEb"' + ed + '></div><div class="nm dsp" data-f="heroName"' + ed + '></div></div></div>' +
      '<div class="rule"><span class="bdy" data-f="ruleLabel"' + ed + '></span><i></i></div>' +
      '<div class="rows" id="rowsBox"></div>' +
      '<div class="incl bdy" data-f="incl"' + ed + '></div>' +
      '<div class="cta"><div class="l bdy"><span data-f="ctaA"' + ed + '></span><b data-f="ctaB"' + ed + '></b></div><div class="tel prc" data-f="tel"' + ed + '></div></div>' +
      '<div class="mFoot bdy"><b data-f="addr"' + ed + '></b><br><span data-f="hours"' + ed + '></span></div>';

    if (t === "dest") return "" +
      '<div class="bg photoSlot"><div class="ph">Toca aquí para subir tu foto</div><div class="veil"></div></div>' +
      '<div class="aTop"><div class="logo" data-logo></div><div class="badge bdy" data-f="badge"' + ed + '></div></div>' +
      '<div class="aBody onDark"><div class="aEb bdy" data-f="aEb"' + ed + '></div>' +
        '<div class="aTitle dsp" data-f="aTitle"' + ed + '></div><div class="aScript" data-f="aScript"' + ed + '></div>' +
        '<div class="aVal bdy" data-f="aVal"' + ed + '></div><div class="aPr">' +
        '<div class="pc"><div class="sz bdy" data-f="sz1"' + ed + '></div><div class="vl prc" data-f="vl1"' + ed + '></div><div class="nt bdy" data-f="nt1"' + ed + '></div></div>' +
        '<div class="pc main"><div class="sz bdy" data-f="sz2"' + ed + '></div><div class="vl prc" data-f="vl2"' + ed + '></div><div class="nt bdy" data-f="nt2"' + ed + '></div></div></div></div>' +
      '<div class="aBar"><div class="w bdy"><span data-f="waLabel"' + ed + '></span><b data-f="tel"' + ed + '></b></div><div class="ad bdy" data-f="addr"' + ed + '></div></div>';

    if (t === "humor") return "" +
      '<div class="hBrand"><div class="logo" data-logo></div></div>' +
      '<div class="hJoke dsp" data-f="joke"' + ed + '></div>' +
      '<div class="hPhoto photoSlot"><div class="ph">Toca aquí para subir tu foto</div><div class="veil"></div></div>' +
      '<div class="hBridge"><span class="bdy" data-f="bridge"' + ed + '></span><b data-f="tel"' + ed + '></b></div>' +
      '<div class="hFoot bdy" data-f="addr"' + ed + '></div>';

    return "" +
      '<div class="bg photoSlot"><div class="ph">Toca aquí para subir tu foto</div><div class="veil"></div></div>' +
      '<div class="aTop"><div class="logo" data-logo></div><div class="badge bdy" data-f="badge"' + ed + '></div></div>' +
      '<div class="pBody onDark"><div class="pEb bdy" data-f="pEb"' + ed + '></div><div class="pTtl dsp" data-f="pTtl"' + ed + '></div>' +
        '<div class="pSub bdy" data-f="pSub"' + ed + '></div><div><span class="pBen" data-f="pBen"' + ed + '></span></div>' +
        '<div class="pTerms bdy" data-f="pTerms"' + ed + '></div></div>' +
      '<div class="pBar"><div class="w bdy"><span data-f="waLabel"' + ed + '></span><b data-f="tel"' + ed + '></b></div><div class="ad bdy" data-f="addr"' + ed + '></div></div>';
  }

  function render() {
    var sz = SIZES[S.size];
    card.className = "card " + S.tpl;
    card.style.width = sz.w + "px";
    card.style.height = sz.h + "px";
    card.style.setProperty("--u", (sz.w / 540).toFixed(4));
    card.innerHTML = tplHTML(S.tpl);
    applyColors();
    applyFonts();
    card.querySelectorAll("[data-f]").forEach(function (el) {
      el.textContent = S.texts[el.dataset.f] !== undefined ? S.texts[el.dataset.f] : "";
    });
    if (S.tpl === "menu") renderRows();
    $("grpRows").style.display = S.tpl === "menu" ? "" : "none";
    bindEditable();
    buildTextPane();
    if (MOBILE) {
      card.querySelectorAll("[data-f],[data-row]").forEach(function (el) {
        el.setAttribute("contenteditable", "false");
      });
    }
    $("stageNote").textContent = TPLNAME[S.tpl] + " · " + SIZES[S.size].label.split(" · ")[0] +
      (MOBILE ? " · toca un texto para editarlo" : "");
    requestAnimationFrame(function () { paintLogos(); initSlots(); applyOverlay(); fit(); fitSeal(); });
  }

  function renderRows() {
    var box = $("rowsBox");
    if (!box) return;
    box.innerHTML = "";
    S.rows.forEach(function (r, i) {
      var d = document.createElement("div");
      d.className = "rw";
      d.innerHTML = '<span class="n dsp" data-row="' + i + '" data-part="n" contenteditable="true" spellcheck="false"></span><i></i>' +
        '<span class="p prc" data-row="' + i + '" data-part="p" contenteditable="true" spellcheck="false"></span>';
      d.querySelector(".n").textContent = r.n;
      d.querySelector(".p").textContent = r.p;
      d.querySelector(".n").addEventListener("input", function () { S.rows[i].n = this.textContent; syncRowInputs(); });
      d.querySelector(".p").addEventListener("input", function () { S.rows[i].p = this.textContent; syncRowInputs(); });
      box.appendChild(d);
    });
    buildRowsEditor();
  }

  function buildRowsEditor() {
    var box = $("rowsEd");
    if (!box) return;
    box.innerHTML = "";
    S.rows.forEach(function (r, i) {
      var d = document.createElement("div");
      d.className = "rowEd";
      d.innerHTML = '<div class="top"><span class="num">Platillo ' + (i + 1) + '</span><div class="btns">' +
        '<button type="button" data-a="up" aria-label="Subir platillo ' + (i + 1) + '">↑</button>' +
        '<button type="button" data-a="down" aria-label="Bajar platillo ' + (i + 1) + '">↓</button>' +
        '<button type="button" class="del" data-a="del" aria-label="Quitar platillo ' + (i + 1) + '">✕</button></div></div>' +
        '<div class="fields"><input type="text" aria-label="Nombre del platillo ' + (i + 1) + '">' +
        '<input type="text" aria-label="Precio del platillo ' + (i + 1) + '"></div>';
      var fs = d.querySelector(".fields"), a = fs.children[0], b = fs.children[1];
      a.value = r.n;
      b.value = r.p;
      a.oninput = function () { S.rows[i].n = this.value; refreshRowText(i); };
      b.oninput = function () { S.rows[i].p = this.value; refreshRowText(i); };
      var bu = d.querySelector("[data-a=up]"), bd = d.querySelector("[data-a=down]");
      bu.disabled = (i === 0);
      bd.disabled = (i === S.rows.length - 1);
      bu.onclick = function () { var t = S.rows[i - 1]; S.rows[i - 1] = S.rows[i]; S.rows[i] = t; renderRows(); };
      bd.onclick = function () { var t = S.rows[i + 1]; S.rows[i + 1] = S.rows[i]; S.rows[i] = t; renderRows(); };
      d.querySelector("[data-a=del]").onclick = function () { S.rows.splice(i, 1); renderRows(); };
      box.appendChild(d);
    });
  }

  function refreshRowText(i) {
    var rows = card.querySelectorAll(".rw");
    if (rows[i]) {
      rows[i].querySelector(".n").textContent = S.rows[i].n;
      rows[i].querySelector(".p").textContent = S.rows[i].p;
    }
  }

  function syncRowInputs() {
    var box = $("rowsEd");
    if (!box) return;
    [].forEach.call(box.children, function (d, i) {
      if (S.rows[i]) { d.children[0].value = S.rows[i].n; d.children[1].value = S.rows[i].p; }
    });
  }

  function bindEditable() {
    card.querySelectorAll("[data-f][contenteditable=true]").forEach(function (el) {
      el.addEventListener("input", function () {
        S.texts[el.dataset.f] = el.textContent;
        var inp = document.querySelector('#txtList [data-tf="' + el.dataset.f + '"]');
        if (inp && inp.value !== el.textContent) inp.value = el.textContent;
      });
    });
  }

  /** Reconstruye la pestaña "Textos" a partir de los campos que tenga la plantilla. */
  function buildTextPane() {
    var box = $("txtList");
    box.innerHTML = "";
    var seen = {};
    card.querySelectorAll("[data-f]").forEach(function (el) {
      var k = el.dataset.f;
      if (seen[k]) return;
      seen[k] = 1;
      var d = document.createElement("div");
      d.className = "f";
      var lab = document.createElement("label");
      lab.textContent = LABELS[k] || k;
      var inp = LONG[k] ? document.createElement("textarea") : document.createElement("input");
      if (!LONG[k]) inp.type = "text";
      inp.value = S.texts[k] || "";
      inp.setAttribute("data-tf", k);
      inp.addEventListener("input", function () {
        S.texts[k] = this.value;
        card.querySelectorAll('[data-f="' + k + '"]').forEach(function (t) { t.textContent = inp.value; });
      });
      d.appendChild(lab);
      d.appendChild(inp);
      box.appendChild(d);
    });
  }

  /* ---------- recorte del texto dentro del sello ---------- */

  /**
   * El sello es un círculo de tamaño fijo. A la altura de cada renglón el hueco
   * no es el diámetro sino la cuerda del círculo, 2·√(R² − dy²), donde `dy` es la
   * distancia del renglón al centro. Si el texto no cabe se corta por la última
   * letra que entra: ni se agranda el círculo ni se achica la letra.
   */
  var SEAL_LINES = ["k", "d", "n"];
  /**
   * Holgura, como fracción del radio. Con 0 el texto cabría pero pegado al borde
   * ("DOMINGO" toca el círculo por los dos lados y se ve apretado), así que se
   * reserva un poco de aire antes de dar por buena una letra.
   */
  var SEAL_INSET = 0.06;

  /*
   * Se mide sobre un <canvas> y no sobre el DOM porque lo que importa es la
   * TINTA de las letras, no su avance. El avance incluye el hueco lateral de la
   * primera y la última letra, y contarlo recortaba palabras que sí caben
   * ("Domingo" mide 73.3 px de avance pero sólo 72.7 px de tinta).
   * De paso el canvas da el alto real de la tinta, más ajustado que la caja del
   * renglón, que reserva sitio para tildes y colas aunque no las haya.
   */
  var inkCtx = null;
  var inkSpacing = 0;       // letter-spacing en px
  var inkNativeSpacing = false;
  var inkCase = "none";     // text-transform, que el canvas no aplica solo

  /** Ajusta el canvas de medición a la tipografía exacta del renglón. */
  function setupInk(el) {
    if (inkCtx === null) {
      var c = document.createElement("canvas");
      inkCtx = (c.getContext && c.getContext("2d")) || false;
    }
    if (!inkCtx) return false;

    var cs = getComputedStyle(el);
    inkCtx.font = [cs.fontStyle, cs.fontWeight, cs.fontSize, cs.fontFamily].join(" ");
    var ls = parseFloat(cs.letterSpacing);
    inkSpacing = isFinite(ls) ? ls : 0;
    inkNativeSpacing = ("letterSpacing" in inkCtx);
    if (inkNativeSpacing) inkCtx.letterSpacing = inkSpacing + "px";
    inkCase = cs.textTransform;
    return true;
  }

  function inkText(text) {
    if (inkCase === "uppercase") return text.toUpperCase();
    if (inkCase === "lowercase") return text.toLowerCase();
    return text;
  }

  /** Ancho de la tinta del texto. */
  function inkWidth(text) {
    if (!text) return 0;
    var t = inkText(text);
    var m = inkCtx.measureText(t);
    var w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    if (!isFinite(w)) w = m.width;
    /* Si el navegador no aplica letter-spacing en el canvas, se suma a mano:
       separa n−1 huecos, el de después de la última letra no ocupa tinta. */
    if (!inkNativeSpacing && inkSpacing) w += inkSpacing * Math.max(0, t.length - 1);
    return w;
  }

  /** Borde superior e inferior de la tinta dentro de la caja del renglón. */
  function inkVertical(el, text) {
    var box = el.offsetHeight;
    var m = inkCtx.measureText(inkText(text) || "M");
    if (typeof m.actualBoundingBoxAscent !== "number" ||
        typeof m.fontBoundingBoxAscent !== "number" || !isFinite(m.fontBoundingBoxAscent)) {
      return { top: 0, bottom: box };   // sin métricas: se usa la caja entera
    }
    var halfLeading = (box - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2;
    var baseline = halfLeading + m.fontBoundingBoxAscent;
    return { top: baseline - m.actualBoundingBoxAscent, bottom: baseline + m.actualBoundingBoxDescent };
  }

  /**
   * ¿Cabe `text` en el círculo? La esquina de la tinta más lejana al centro es la
   * que manda: a esa altura el hueco es la cuerda 2·√(R² − dy²), no el diámetro.
   */
  function fitsInCircle(text, el, lineTop, R, cy) {
    var v = inkVertical(el, text);
    var dy = Math.max(Math.abs(lineTop + v.top - cy), Math.abs(lineTop + v.bottom - cy));
    if (dy >= R) return false;
    return inkWidth(text) <= 2 * Math.sqrt(R * R - dy * dy) - R * SEAL_INSET;
  }

  /** Recorta `full` a lo que quepa en el círculo y lo escribe en el elemento. */
  function clipToCircle(sealEl, el, full) {
    var R = sealEl.offsetWidth / 2;
    if (!R || !el.offsetHeight || !setupInk(el)) { el.textContent = full; return; }

    var cy = sealEl.offsetHeight / 2;
    var lineTop = el.offsetTop;
    if (fitsInCircle(full, el, lineTop, R, cy)) { el.textContent = full; return; }

    /* Búsqueda binaria del corte más largo que entra. */
    var lo = 0, hi = full.length;
    while (lo < hi) {
      var mid = Math.ceil((lo + hi) / 2);
      if (fitsInCircle(full.slice(0, mid), el, lineTop, R, cy)) lo = mid; else hi = mid - 1;
    }
    el.textContent = full.slice(0, lo).replace(/\s+$/, "");
  }

  /** Reajusta los tres renglones del sello. Salta el que se esté editando. */
  function fitSeal() {
    card.querySelectorAll(".seal").forEach(function (sealEl) {
      SEAL_LINES.forEach(function (cls) {
        var el = sealEl.querySelector("." + cls);
        if (!el || el === document.activeElement) return;
        var key = el.dataset.f;
        var full = (key && S.texts[key] !== undefined) ? S.texts[key] : el.textContent;
        clipToCircle(sealEl, el, full);
      });
    });
  }

  var fitQueued = false;
  /** Agrupa varias peticiones de reajuste en un solo cuadro. */
  function scheduleSealFit() {
    if (fitQueued) return;
    fitQueued = true;
    requestAnimationFrame(function () { fitQueued = false; fitSeal(); });
  }

  function wireSealFit() {
    /* Cualquier cambio de texto puede afectar al sello. Si el renglón se está
       escribiendo directamente sobre la imagen no se toca, para no mover el
       cursor de sitio: se recorta al salir del campo. */
    document.addEventListener("input", function (e) {
      if (e.target && e.target.closest && e.target.closest(".seal")) return;
      scheduleSealFit();
    }, true);
    document.addEventListener("focusout", function (e) {
      if (e.target && e.target.closest && e.target.closest(".seal")) scheduleSealFit();
    }, true);
  }

  /* ---------- día y fecha automáticos ---------- */

  var autoDateStamp = null;

  /** Pone en el estado el día y la fecha en curso, pisando lo que hubiera guardado. */
  function applyTodayToState() {
    Object.keys(CFG.AUTO_DATE_FIELDS).forEach(function (key) {
      S.texts[key] = CFG.AUTO_DATE_FIELDS[key]();
    });
    autoDateStamp = CFG.dayStamp();
  }

  /** Vuelca esos campos al lienzo y al panel de textos, ya recortados. */
  function paintDateFields() {
    Object.keys(CFG.AUTO_DATE_FIELDS).forEach(function (key) {
      card.querySelectorAll('[data-f="' + key + '"]').forEach(function (t) { t.textContent = S.texts[key]; });
      var inp = document.querySelector('#txtList [data-tf="' + key + '"]');
      if (inp) inp.value = S.texts[key];
    });
    fitSeal();
  }

  /** Si la página se quedó abierta y ya cambió el día, se pone al corriente sola. */
  function refreshDateIfStale() {
    if (autoDateStamp === CFG.dayStamp()) return;
    applyTodayToState();
    paintDateFields();
    persistSoon();
  }

  function applyColors() {
    for (var k in S.colors) card.style.setProperty("--" + k, S.colors[k]);
  }

  function applyFonts() {
    CFG.FONT_ROLES.forEach(function (r) {
      var f = S.fonts[r];
      card.style.setProperty("--f-" + r, '"' + f.fam + '", Georgia, sans-serif');
      card.style.setProperty("--w-" + r, f.w);
      card.style.setProperty("--s-" + r, (f.s / 100).toFixed(3));
      card.style.setProperty("--t-" + r, (f.t / 1000) + "em");
      card.style.setProperty("--u-" + r, f.up ? "uppercase" : "none");
    });
    scheduleSealFit();   // otra tipografía ocupa otro ancho
  }

  function applyOverlay() {
    var o = S.overlay, a = o.on ? o.op / 100 : 0, bg = "none";
    if (a > 0) {
      if (o.mode === "flat") bg = "linear-gradient(rgba(0,0,0," + a + "),rgba(0,0,0," + a + "))";
      else if (o.mode === "bottom") bg = "linear-gradient(to top, rgba(0,0,0," + a + ") 0%, rgba(0,0,0," + (a * 0.72).toFixed(3) + ") 26%, rgba(0,0,0,0) 68%)";
      else if (o.mode === "top") bg = "linear-gradient(to bottom, rgba(0,0,0," + a + ") 0%, rgba(0,0,0," + (a * 0.72).toFixed(3) + ") 26%, rgba(0,0,0,0) 68%)";
      else if (o.mode === "both") bg = "linear-gradient(to top, rgba(0,0,0," + a + ") 0%, rgba(0,0,0,0) 45%), linear-gradient(to bottom, rgba(0,0,0," + (a * 0.8).toFixed(3) + ") 0%, rgba(0,0,0,0) 40%)";
      else bg = "radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, rgba(0,0,0," + a + ") 100%)";
    }
    card.querySelectorAll(".veil").forEach(function (v) { v.style.background = bg; });
  }

  /* ================================================================
   * 5. FOTO: ARRASTRE, PELLIZCO Y ENCUADRE
   * ================================================================ */

  function slot() { return card.querySelector(".photoSlot"); }

  function initSlots() {
    var el = slot();
    if (!el) return;
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("click", function (e) {
      if (!photo.url && !e.target.closest("[data-f],[data-row],button")) pickImage();
    });
    if (photo.url) { centerIfNeeded(el); paint(el); }
    else el.classList.remove("has");
  }

  function coverScale(el) {
    return Math.max(el.clientWidth / photo.natW, el.clientHeight / photo.natH);
  }

  function centerIfNeeded(el) {
    var s = coverScale(el) * photo.zoom;
    photo.x = (el.clientWidth - photo.natW * s) / 2;
    photo.y = (el.clientHeight - photo.natH * s) / 2;
  }

  function clampP(el) {
    var s = coverScale(el) * photo.zoom;
    photo.x = Math.min(0, Math.max(el.clientWidth - photo.natW * s, photo.x));
    photo.y = Math.min(0, Math.max(el.clientHeight - photo.natH * s, photo.y));
  }

  function paint(el) {
    if (!photo.url) { el.style.backgroundImage = "none"; el.classList.remove("has"); return; }
    clampP(el);
    var s = coverScale(el) * photo.zoom;
    el.classList.add("has");
    el.style.backgroundImage = 'url("' + photo.url + '")';
    el.style.backgroundSize = (photo.natW * s) + "px " + (photo.natH * s) + "px";
    el.style.backgroundPosition = photo.x + "px " + photo.y + "px";
    syncPhotoUI(el);
  }

  function syncPhotoUI(el) {
    var s = coverScale(el) * photo.zoom;
    var rx = photo.natW * s - el.clientWidth;
    var ry = photo.natH * s - el.clientHeight;
    $("px").value = rx > 1 ? Math.round((-photo.x / rx) * 100) : 50;
    $("py").value = ry > 1 ? Math.round((-photo.y / ry) * 100) : 50;
    $("zoom").value = Math.round(photo.zoom * 100);
    $("zoomVal").textContent = Math.round(photo.zoom * 100) + "%";
  }

  var pts = {}, nPts = 0, pan = null, pinch = null, slotEl = null;

  function onDown(e) {
    if (!photo.url) return;
    if (e.target.closest("[data-f],[data-row],button")) return;
    slotEl = e.currentTarget;
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    nPts++;
    if (slotEl.setPointerCapture) slotEl.setPointerCapture(e.pointerId);
    if (nPts === 1) {
      pan = { sx: e.clientX, sy: e.clientY, ox: photo.x, oy: photo.y };
      pinch = null;
      slotEl.classList.add("dragging");
    } else if (nPts === 2) {
      pan = null;
      pinch = startPinch();
    }
    e.preventDefault();
  }

  function pairs() {
    var a = [];
    for (var k in pts) a.push(pts[k]);
    return a;
  }

  function startPinch() {
    var p = pairs();
    if (p.length < 2) return null;
    var dx = p[0].x - p[1].x, dy = p[0].y - p[1].y;
    return { d: Math.hypot(dx, dy) || 1, z: photo.zoom };
  }

  function onMove(e) {
    if (!(e.pointerId in pts)) return;
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (pinch && nPts >= 2) {
      var p = pairs();
      if (p.length < 2) return;
      var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1;
      setZoom(pinch.z * (d / pinch.d));
    } else if (pan && nPts === 1) {
      photo.x = pan.ox + (e.clientX - pan.sx) / preview;
      photo.y = pan.oy + (e.clientY - pan.sy) / preview;
      paint(slotEl);
    }
  }

  function endPointer(e) {
    if (!(e.pointerId in pts)) return;
    delete pts[e.pointerId];
    nPts = Math.max(0, nPts - 1);
    if (nPts < 2) pinch = null;
    if (nPts === 0) {
      pan = null;
      if (slotEl) slotEl.classList.remove("dragging");
    } else {
      var p = pairs()[0];
      if (p) pan = { sx: p.x, sy: p.y, ox: photo.x, oy: photo.y };
    }
  }

  function onWheel(e) {
    if (!photo.url) return;
    e.preventDefault();
    setZoom(photo.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
  }

  /** Acerca o aleja manteniendo fijo el centro visible. */
  function setZoom(z) {
    var el = slot();
    if (!el || !photo.url) return;
    z = Math.min(CFG.RANGES.zoom.max, Math.max(CFG.RANGES.zoom.min, z));
    var W = el.clientWidth, H = el.clientHeight, c = coverScale(el);
    var oS = c * photo.zoom, nS = c * z;
    var cx = (W / 2 - photo.x) / oS, cy = (H / 2 - photo.y) / oS;
    photo.zoom = z;
    photo.x = W / 2 - cx * nS;
    photo.y = H / 2 - cy * nS;
    paint(el);
  }

  var fileImg;
  function pickImage() { fileImg.value = ""; fileImg.click(); }

  function wirePhotoControls() {
    fileImg = $("fileImg");
    $("upBtn").onclick = pickImage;

    fileImg.addEventListener("change", function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function (ev) {
        var im = new Image();
        im.onload = function () {
          photo.url = ev.target.result;
          photo.natW = im.naturalWidth;
          photo.natH = im.naturalHeight;
          photo.zoom = 1;
          var el = slot();
          centerIfNeeded(el);
          paint(el);
        };
        im.src = ev.target.result;
      };
      r.readAsDataURL(f);
    });

    $("zoom").oninput = function () { setZoom(this.value / 100); };
    $("px").oninput = function () {
      var el = slot();
      if (!photo.url) return;
      var s = coverScale(el) * photo.zoom;
      photo.x = -(photo.natW * s - el.clientWidth) * (this.value / 100);
      paint(el);
    };
    $("py").oninput = function () {
      var el = slot();
      if (!photo.url) return;
      var s = coverScale(el) * photo.zoom;
      photo.y = -(photo.natH * s - el.clientHeight) * (this.value / 100);
      paint(el);
    };
    $("reFit").onclick = function () {
      var el = slot();
      if (!photo.url) return;
      photo.zoom = 1;
      centerIfNeeded(el);
      paint(el);
    };

    document.addEventListener("pointermove", onMove, { passive: false });
    document.addEventListener("pointerup", endPointer);
    document.addEventListener("pointercancel", endPointer);

    $("ovOn").onchange = function () { S.overlay.on = this.checked; applyOverlay(); };
    $("ovOp").oninput = function () { S.overlay.op = +this.value; $("ovVal").textContent = this.value + "%"; applyOverlay(); };
    $("ovMode").onchange = function () { S.overlay.mode = this.value; applyOverlay(); };
  }

  /* ================================================================
   * 6. CONTROLES DEL PANEL
   * ================================================================ */

  var tplChips, sizeSel, famSel, colorList;

  function wireLogoControls() {
    $("logoVar").onchange = function () { S.logo.variant = this.value; render(); };
    $("logoCol").oninput = function () { S.logo.color = this.value; paintLogos(); };
    $("logoSz").oninput = function () { S.logo.scale = +this.value; $("logoSzVal").textContent = this.value + "%"; paintLogos(); };
    $("logoPlate").onchange = function () { S.logo.plate = this.checked; paintLogos(); };

    var lq = $("logoQuick");
    CFG.LOGO_QUICK.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "chipb";
      b.type = "button";
      b.textContent = c[0];
      b.onclick = function () { S.logo.color = c[1]; $("logoCol").value = c[1]; paintLogos(); };
      lq.appendChild(b);
    });
  }

  function wireFormatControls() {
    tplChips = $("tplChips");
    TPL.forEach(function (t) {
      var b = document.createElement("button");
      b.className = "chipb";
      b.type = "button";
      b.textContent = t[1];
      b.setAttribute("aria-pressed", S.tpl === t[0]);
      b.onclick = function () {
        S.tpl = t[0];
        [].forEach.call(tplChips.children, function (c) { c.setAttribute("aria-pressed", false); });
        b.setAttribute("aria-pressed", true);
        render();
      };
      tplChips.appendChild(b);
    });

    sizeSel = $("sizeSel");
    CFG.SIZE_KEYS.forEach(function (k) {
      var o = document.createElement("option");
      o.value = k;
      o.textContent = SIZES[k].label;
      sizeSel.appendChild(o);
    });
    sizeSel.onchange = function () { S.size = this.value; sizeTip(); render(); };

    $("addRow").onclick = function () { S.rows.push({ n: "Nuevo guiso", p: "$95" }); renderRows(); };
    $("hd").onchange = function () { S.hd = this.checked; };
  }

  function sizeTip() { $("sizeTip").textContent = SIZES[S.size].tip; }

  function wireFontControls() {
    famSel = $("fFam");
    FONTS.forEach(function (f) {
      var o = document.createElement("option");
      o.value = f;
      o.textContent = f;
      famSel.appendChild(o);
    });

    document.querySelectorAll("#roleTabs .ptab").forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll("#roleTabs .ptab").forEach(function (x) { x.setAttribute("aria-selected", false); });
        b.setAttribute("aria-selected", true);
        role = b.dataset.r;
        loadRole();
      };
    });

    famSel.onchange = function () { S.fonts[role].fam = this.value; applyFonts(); };
    $("fW").oninput = function () { S.fonts[role].w = +this.value; $("fwVal").textContent = this.value; applyFonts(); };
    $("fS").oninput = function () { S.fonts[role].s = +this.value; $("fsVal").textContent = this.value + "%"; applyFonts(); };
    $("fT").oninput = function () { S.fonts[role].t = +this.value; $("ftVal").textContent = this.value; applyFonts(); };
    $("fU").onchange = function () { S.fonts[role].up = this.checked; applyFonts(); };
  }

  /** Vuelca en los controles de "Fuentes" los valores del rol activo. */
  function loadRole() {
    var f = S.fonts[role];
    famSel.value = f.fam;
    $("fW").value = f.w; $("fwVal").textContent = f.w;
    $("fS").value = f.s; $("fsVal").textContent = f.s + "%";
    $("fT").value = f.t; $("ftVal").textContent = f.t;
    $("fU").checked = f.up;
  }

  function wireColorControls() {
    colorList = $("colorList");
    COLORS.forEach(function (c) {
      var d = document.createElement("div");
      d.className = "f";
      d.innerHTML = "<label>" + c[1] + '</label><input type="color" data-c="' + c[0] + '">';
      colorList.appendChild(d);
    });
    colorList.addEventListener("input", function (e) {
      if (!e.target.dataset.c) return;
      S.colors[e.target.dataset.c] = e.target.value;
      applyColors();
    });

    var pc = $("palChips");
    Object.keys(PALETTES).forEach(function (n) {
      var b = document.createElement("button");
      b.className = "chipb";
      b.type = "button";
      b.textContent = n;
      b.onclick = function () { S.colors = CFG.clone(PALETTES[n]); applyColors(); syncColors(); };
      pc.appendChild(b);
    });
  }

  function syncColors() {
    colorList.querySelectorAll("input[data-c]").forEach(function (i) { i.value = S.colors[i.dataset.c]; });
  }

  /**
   * Pone todos los controles del panel al día con `S`.
   * Se usa al arrancar, al cargar un archivo y al restablecer, para no repetir
   * la misma lista de asignaciones en tres sitios.
   */
  function syncControlsFromState() {
    sizeSel.value = S.size;
    [].forEach.call(tplChips.children, function (chip, i) {
      chip.setAttribute("aria-pressed", TPL[i][0] === S.tpl);
    });
    $("hd").checked = S.hd;

    $("ovOn").checked = S.overlay.on;
    $("ovOp").value = S.overlay.op;
    $("ovVal").textContent = S.overlay.op + "%";
    $("ovMode").value = S.overlay.mode;

    $("logoVar").value = S.logo.variant;
    $("logoCol").value = S.logo.color;
    $("logoSz").value = S.logo.scale;
    $("logoSzVal").textContent = S.logo.scale + "%";
    $("logoPlate").checked = S.logo.plate;

    syncColors();
    loadRole();
    sizeTip();
  }

  /* ================================================================
   * 7. GUARDAR / CARGAR CONFIGURACIÓN
   * ================================================================ */

  function dlBlob(name, blob) {
    var a = document.createElement("a");
    a.download = name;
    a.href = URL.createObjectURL(blob);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
  }

  /** Lo que se escribe en el archivo .json (mismo contenido que se persiste). */
  function exportableConfig() {
    return {
      v: Storage.SCHEMA_VERSION,
      tpl: S.tpl, size: S.size, hd: S.hd,
      colors: S.colors, logo: S.logo, fonts: S.fonts,
      overlay: S.overlay, texts: S.texts, rows: S.rows
    };
  }

  /** Mensaje común tras guardar en el navegador. */
  function reportSaved(prefix) {
    if (persistNow()) {
      setStatus(prefix + " y guardada en este navegador · " + formatWhen(), "ok");
    } else {
      setStatus(prefix + ", pero este navegador no permite guardarla. Conserva el archivo .json.", "warn");
    }
  }

  function wireConfigControls() {
    $("cfgSave").onclick = function () {
      dlBlob("estilos-amaranto.json",
        new Blob([JSON.stringify(exportableConfig(), null, 2)], { type: "application/json" }));
      reportSaved("Configuración descargada");
    };

    var fileCfg = $("fileCfg");
    $("cfgLoad").onclick = function () { fileCfg.value = ""; fileCfg.click(); };

    fileCfg.addEventListener("change", function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function (e) {
        var parsed;
        try {
          parsed = JSON.parse(e.target.result);
        } catch (err) {
          setStatus("Ese archivo no es una configuración válida de Amaranto.", "warn");
          alert("Ese archivo no es una configuración válida de Amaranto.");
          return;
        }
        /* Mismo saneado que para LocalStorage: lo que no encaje vuelve al valor de fábrica. */
        S = Storage.sanitize(parsed);
        syncControlsFromState();
        render();
        reportSaved("Configuración cargada");
      };
      r.onerror = function () {
        setStatus("No se pudo leer el archivo.", "warn");
      };
      r.readAsText(f);
    });

    $("cfgReset").onclick = function () {
      if (Storage.hasSaved() &&
          !confirm("Esto borra la configuración guardada en este navegador y vuelve a los valores de Amaranto. ¿Continuar?")) {
        return;
      }
      Storage.clear();
      S = CFG.defState();
      syncControlsFromState();
      render();
      setStatus("Se borró la configuración guardada. Estás en los valores de Amaranto.");
    };
  }

  /* ================================================================
   * 8. HOJA DE EDICIÓN PARA MÓVIL
   * ================================================================ */

  var sheet, sheetBox, sheetInput, sheetTitle, sheetCtx = null;

  function openSheet(title, value, long, ctx) {
    sheetCtx = ctx;
    sheetTitle.textContent = title;
    sheetInput.value = value;
    sheetInput.rows = long ? 4 : 2;
    sheet.hidden = false;
    document.body.classList.add("sheetOpen");
    global.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(function () {
      sheetInput.focus();
      try { sheetInput.setSelectionRange(value.length, value.length); } catch (e) { /* sin selección */ }
    }, 60);
  }

  function closeSheet() {
    sheet.hidden = true;
    document.body.classList.remove("sheetOpen");
    sheetCtx = null;
    sheetInput.blur();
  }

  function applySheet(v) {
    if (!sheetCtx) return;
    if (sheetCtx.t === "f") {
      S.texts[sheetCtx.k] = v;
      card.querySelectorAll('[data-f="' + sheetCtx.k + '"]').forEach(function (t) { t.textContent = v; });
      var inp = document.querySelector('#txtList [data-tf="' + sheetCtx.k + '"]');
      if (inp) inp.value = v;
    } else {
      if (!S.rows[sheetCtx.i]) return;
      S.rows[sheetCtx.i][sheetCtx.part] = v;
      refreshRowText(sheetCtx.i);
      syncRowInputs();
    }
  }

  function wireSheet() {
    sheet = $("sheet");
    sheetBox = $("sheetBox");
    sheetInput = $("sheetInput");
    sheetTitle = $("sheetTitle");

    sheetInput.addEventListener("input", function () { applySheet(this.value); });
    $("sheetOk").onclick = closeSheet;
    $("sheetClose").onclick = closeSheet;
    $("sheetUndo").onclick = function () {
      if (!sheetCtx) return;
      sheetInput.value = sheetCtx.orig;
      applySheet(sheetCtx.orig);
      sheetInput.focus();
    };
    sheet.addEventListener("click", function (e) { if (e.target === sheet) closeSheet(); });
    sheetBox.addEventListener("click", function (e) { e.stopPropagation(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !sheet.hidden) closeSheet(); });

    /* El teclado del móvil encoge la ventana visible: se sube la hoja para que no quede tapada. */
    if (global.visualViewport) {
      var vvFix = function () {
        if (sheet.hidden) { sheetBox.style.transform = ""; return; }
        var vv = global.visualViewport;
        var off = Math.max(0, Math.round(global.innerHeight - vv.height - vv.offsetTop));
        sheetBox.style.transform = off ? "translateY(-" + off + "px)" : "";
      };
      global.visualViewport.addEventListener("resize", vvFix);
      global.visualViewport.addEventListener("scroll", vvFix);
    }

    card.addEventListener("click", function (e) {
      if (!MOBILE) return;
      var r = e.target.closest("[data-row]");
      if (r) {
        var i = +r.dataset.row, part = r.dataset.part;
        if (!S.rows[i]) return;
        e.stopPropagation();
        openSheet(part === "n" ? ("Platillo " + (i + 1)) : ("Precio " + (i + 1)),
          S.rows[i][part], false, { t: "r", i: i, part: part, orig: S.rows[i][part] });
        return;
      }
      var f = e.target.closest("[data-f]");
      if (f) {
        var k = f.dataset.f;
        e.stopPropagation();
        openSheet(LABELS[k] || k, S.texts[k] || "", !!LONG[k], { t: "f", k: k, orig: S.texts[k] || "" });
      }
    }, true);
  }

  /* ================================================================
   * 9. AJUSTE DE VISTA
   * ================================================================ */

  function wirePanelTabs() {
    document.querySelectorAll(".ptabs [data-p]").forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll(".ptabs [data-p]").forEach(function (x) { x.setAttribute("aria-selected", false); });
        b.setAttribute("aria-selected", true);
        document.querySelectorAll(".pane").forEach(function (p) { p.classList.remove("on"); });
        $("pane-" + b.dataset.p).classList.add("on");
        b.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      };
    });
  }

  var vhProbe, tabsBar, leftCol;

  /** Alto de referencia estable: en móvil `innerHeight` cambia al aparecer la barra del navegador. */
  function refHeight() {
    var p = vhProbe ? vhProbe.offsetHeight : 0;
    return p > 200 ? p : global.innerHeight;
  }

  /** Escala el lienzo para que quepa en el espacio disponible. */
  function fit() {
    var sz = SIZES[S.size];
    var appW = document.querySelector(".app").clientWidth || 320;
    var m = isMobile();
    var availW = m ? (global.innerWidth || appW) * 0.99 : Math.max(240, Math.min(560, appW - 360));
    var availH = m ? Math.max(240, refHeight() * 0.62) : Math.max(300, global.innerHeight - 140);
    preview = Math.min(1, availW / sz.w, availH / sz.h);
    frame.style.width = sz.w + "px";
    frame.style.height = sz.h + "px";
    frame.style.transform = "scale(" + preview + ")";
    hold.style.width = Math.round(sz.w * preview) + "px";
    hold.style.height = Math.round(sz.h * preview) + "px";
    if (tabsBar) tabsBar.style.top = m ? (leftCol.offsetHeight + "px") : "";
  }

  function wireViewport() {
    vhProbe = $("vhProbe");
    tabsBar = document.querySelector(".right > .ptabs");
    leftCol = document.querySelector(".left");

    var rt;
    global.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var m = isMobile();
        if (m !== MOBILE) {
          MOBILE = m;
          document.body.classList.toggle("mobile", MOBILE);
          if (!MOBILE) closeSheet();
          render();
          return;
        }
        fit();
        paintLogos();
        var el = slot();
        if (el && photo.url) { centerIfNeeded(el); paint(el); }
      }, 120);
    });

    global.addEventListener("orientationchange", function () {
      setTimeout(function () {
        fit();
        paintLogos();
        var el = slot();
        if (el && photo.url) { centerIfNeeded(el); paint(el); }
      }, 350);
    });
  }

  /* ================================================================
   * 10. EXPORTAR
   * ================================================================ */

  function fileName() {
    return "amaranto-" + S.tpl + "-" + S.size + "-" + new Date().toISOString().slice(0, 10) + ".png";
  }

  function caption() {
    var sz = SIZES[S.size], k = (S.hd ? 2 : 1);
    var w = Math.round(sz.out * k);
    var h = Math.round(sz.out * k * sz.h / sz.w);
    return "Amaranto Morelia — " + TPLNAME[S.tpl] + "\n" +
      "Formato: " + SIZES[S.size].label + "\n" +
      "Medidas: " + w + " × " + h + " px" + (S.hd ? " (HD)" : "") + "\n" +
      "Fecha: " + new Date().toLocaleDateString("es-MX") + "\n" +
      "Enviado desde " + CFG.WA_FROM;
  }

  /** Dibuja el lienzo a tamaño real y devuelve una promesa con el PNG. */
  function renderBlob() {
    var sz = SIZES[S.size], k = (S.hd ? 2 : 1), prev = frame.style.transform;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    document.body.classList.add("exporting");
    frame.style.transform = "scale(1)";
    var restore = function () {
      frame.style.transform = prev;
      document.body.classList.remove("exporting");
      fit();
    };
    return html2canvas(card, { scale: sz.out * k / sz.w, backgroundColor: null, useCORS: true, logging: false })
      .then(function (cv) { return new Promise(function (res) { cv.toBlob(res, "image/png"); }); })
      .then(function (b) { restore(); return b; }, function (e) { restore(); throw e; });
  }

  /** Deshabilita los botones mientras se genera la imagen. */
  function busy(btns, fn) {
    var lbls = btns.map(function (b) {
      var l = b.textContent;
      b.textContent = "Preparando…";
      b.disabled = true;
      return l;
    });
    return fn()
      .catch(function () {
        alert("No se pudo generar la imagen. Si estás en HD, prueba desactivándolo, o toma una captura de pantalla.");
      })
      .then(function () {
        btns.forEach(function (b, i) { b.textContent = lbls[i]; b.disabled = false; });
      });
  }

  function waFallback(bl, fn, txt) {
    dlBlob(fn, bl);
    global.open("https://wa.me/" + CFG.WA_TO + "?text=" + encodeURIComponent(txt), "_blank");
    alert("Tu navegador no permite adjuntar la imagen automáticamente.\n\n" +
      "Ya se descargó la imagen y se abrió el chat de WhatsApp con el texto listo: " +
      "solo adjunta el archivo descargado y elige la calidad HD.");
  }

  function wireExport() {
    var dlBtn = $("dl"), waBtn = $("wa");

    dlBtn.onclick = function () {
      persistNow();          // la imagen que se descarga queda guardada tal cual
      busy([dlBtn], function () {
        return renderBlob().then(function (bl) { dlBlob(fileName(), bl); });
      });
    };

    waBtn.onclick = function () {
      persistNow();
      busy([waBtn], function () {
        return renderBlob().then(function (bl) {
          var txt = caption(), fn = fileName(), file = null;
          try { file = new File([bl], fn, { type: "image/png" }); } catch (e) { /* navegador sin File() */ }
          if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
            return navigator.share({ files: [file], text: txt, title: "Amaranto Morelia" })
              .catch(function (err) {
                if (err && err.name === "AbortError") return;
                waFallback(bl, fn, txt);
              });
          }
          waFallback(bl, fn, txt);
        });
      });
    };

    /* Pegar en un campo editable inserta texto plano, sin el formato de origen. */
    document.addEventListener("paste", function (e) {
      if (!e.target.isContentEditable) return;
      e.preventDefault();
      document.execCommand("insertText", false, (e.clipboardData || global.clipboardData).getData("text/plain"));
    });
  }

  /* ================================================================
   * 11. ARRANQUE
   * ================================================================ */

  function init() {
    preloadLogos();

    wireFormatControls();
    wirePhotoControls();
    wireLogoControls();
    wireFontControls();
    wireColorControls();
    wireConfigControls();
    wireSheet();
    wirePanelTabs();
    wireViewport();
    wireExport();
    wireSealFit();

    /* El día y la fecha mandan sobre lo guardado: siempre son los de hoy. */
    applyTodayToState();

    syncControlsFromState();
    render();

    wireAutoSave();
    reportInitialStorage();

    /* Al terminar de cargar las fuentes cambian las medidas: se reajusta. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        fit();
        paintLogos();
        fitSeal();
        var el = slot();
        if (el && photo.url) paint(el);
      });
    }
  }

  init();
})(window);
