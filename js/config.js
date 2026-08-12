/**
 * Configuración y valores por defecto del generador.
 *
 * Aquí vive todo lo que describe *qué* puede contener una configuración:
 * plantillas, tamaños, paletas, tipografías, textos y renglones iniciales.
 * No toca el DOM ni guarda nada; sólo son datos.
 *
 * Estas listas son además la fuente de verdad que usa `storage.js` para validar:
 * cualquier valor que llegue de LocalStorage o de un archivo .json se compara
 * contra ellas y se descarta si no encaja.
 *
 * Expone: window.Amaranto.CONFIG
 */
(function (global) {
  "use strict";

  var Amaranto = (global.Amaranto = global.Amaranto || {});

  /* ---------- marca y contacto ---------- */
  var WA_TO = "524438878865";
  var WA_FROM = "+52 443 325 4083";

  /* ---------- logotipo ---------- */
  var LOGO_AR = { word: 900 / 169, mark: 620 / 619 };
  var LOGO_BASE = {
    menu: { v: "word", h: 30 },
    humor: { v: "word", h: 26 },
    dest: { v: "mark", h: 64 },
    promo: { v: "mark", h: 60 }
  };
  var LOGO_VARIANTS = ["auto", "word", "mark", "none"];
  var LOGO_QUICK = [
    ["Dorado", "#B08A50"],
    ["Crema", "#F6EBD2"],
    ["Café", "#33241A"],
    ["Blanco", "#FFFFFF"],
    ["Amaranto", "#8E1F3C"]
  ];

  /* ---------- tipografías ---------- */
  var FONTS = [
    "Fraunces", "Playfair Display", "DM Serif Display", "Lora", "Libre Baskerville",
    "Archivo", "Archivo Black", "Anton", "Bebas Neue", "Oswald",
    "Poppins", "Montserrat", "Nunito", "Caveat", "Pacifico"
  ];
  var FONT_ROLES = ["display", "body", "price"];

  /* ---------- tamaños de salida ---------- */
  var SIZES = {
    sq: { label: "Cuadrado 1080×1080 · publicación FB e IG", w: 540, h: 540, out: 1080, tip: "El que mejor se ve en el muro de Facebook y en el feed de Instagram. Ideal para memes." },
    v45: { label: "Vertical 1080×1350 · feed de Instagram", w: 540, h: 675, out: 1080, tip: "Ocupa más pantalla en Instagram. El mejor para el menú del día." },
    story: { label: "Vertical 1080×1920 · historia, estado de WhatsApp, TikTok", w: 432, h: 768, out: 1080, tip: "Sirve igual para historia de Instagram y Facebook, estado de WhatsApp y portada de TikTok." },
    cover: { label: "Portada de Facebook 1640×856", w: 546, h: 285, out: 1640, tip: "La imagen de arriba de tu página. Deja el texto al centro: en celular se recortan las orillas." }
  };

  /* ---------- plantillas ---------- */
  var TPL = [
    ["menu", "Menú del día"],
    ["dest", "Platillo destacado"],
    ["humor", "Meme / humor"],
    ["promo", "Promoción"]
  ];
  var TPLNAME = { menu: "Menú del día", dest: "Platillo destacado", humor: "Meme / humor", promo: "Promoción" };

  /* ---------- capa oscura sobre la foto ---------- */
  var OVERLAY_MODES = ["bottom", "top", "both", "flat", "vig"];

  /* ---------- colores ---------- */
  var COLORS = [
    ["c-bg", "Fondo"],
    ["c-tx", "Texto"],
    ["c-acc", "Acento (precios y barra)"],
    ["c-accTx", "Texto sobre el acento"],
    ["c-brand", "Marca / dorado"],
    ["c-badge", "Sello del día"],
    ["c-badgeTx", "Texto del sello"],
    ["c-band", "Franja suave"]
  ];
  var PALETTES = {
    "Amaranto clásico": { "c-bg": "#F6EBD2", "c-tx": "#33241A", "c-acc": "#8E1F3C", "c-accTx": "#FFFFFF", "c-brand": "#B08A50", "c-badge": "#5E7A46", "c-badgeTx": "#F6EBD2", "c-band": "#EADCBB" },
    "Verde fonda": { "c-bg": "#DDEBBF", "c-tx": "#2C3A1C", "c-acc": "#8E1F3C", "c-accTx": "#FFFFFF", "c-brand": "#8A6B2E", "c-badge": "#4A6136", "c-badgeTx": "#F3F7E6", "c-band": "#CBDCA6" },
    "Barro oscuro": { "c-bg": "#241A14", "c-tx": "#F2E5CE", "c-acc": "#C8873A", "c-accTx": "#241A14", "c-brand": "#C8873A", "c-badge": "#7C9B5A", "c-badgeTx": "#1C150F", "c-band": "#34261C" },
    "Papel limpio": { "c-bg": "#FFFFFF", "c-tx": "#20211F", "c-acc": "#8E1F3C", "c-accTx": "#FFFFFF", "c-brand": "#B08A50", "c-badge": "#20211F", "c-badgeTx": "#FFFFFF", "c-band": "#F1EDE4" },
    "Mole y maíz": { "c-bg": "#F3D9A4", "c-tx": "#3B1F14", "c-acc": "#6B2412", "c-accTx": "#F8E9C6", "c-brand": "#8A4A22", "c-badge": "#3B1F14", "c-badgeTx": "#F3D9A4", "c-band": "#E7C787" }
  };

  /* ---------- textos ---------- */
  var DEF_TEXTS = {
    sealK: "Guiso de", sealDay: "Martes", sealDate: "11 ago",
    heroEb: "Hoy en la olla", heroName: "Chuleta ahumada en chile pasilla", ruleLabel: "Guisos del día",
    incl: "Incluye, a elegir: arroz rojo, frijoles refritos o sopa fría. También ½ litro de arroz o frijol $25 y galleta de chocolate $40.",
    ctaA: "Pide y te lo dejamos", ctaB: "listo y calientito", tel: "443 887 8865",
    addr: "Artilleros del 47 #1000, Chapultepec Sur, Morelia",
    hours: "Almuerzos y comidas · Los guisos cambian a diario y se acaban",
    badge: "Solo hoy · hasta agotar",
    aEb: "Guiso del día", aTitle: "Pozole", aScript: "tradicional",
    aVal: "Con carne de cerdo deshebrada, maíz cacahuazintle y chile tostado en comal. Se hace en olla desde la mañana.",
    sz1: "½ litro", vl1: "$55", nt1: "1 persona", sz2: "1 litro", vl2: "$95", nt2: "rinde para 2",
    waLabel: "Pide por WhatsApp",
    joke: "Viernes de dejar todo para el lunes",
    bridge: "Todo menos la comida. Guiso del día $95, pide antes de la 1:00.",
    pEb: "Solo esta semana", pTtl: "El 5º come gratis",
    pSub: "Junta a 4 compañeros y pide de una sola vez a tu oficina.",
    pBen: "Envío gratis + galletas", pTerms: "Pedidos de 5 comidas o más a la misma dirección. Ordena antes de la 1:00 p.m."
  };
  var LABELS = {
    sealK: "Etiqueta del sello", sealDay: "Día", sealDate: "Fecha", heroEb: "Antetítulo sobre la foto",
    heroName: "Nombre del guiso en la foto", ruleLabel: "Título de la lista", incl: "Franja de guarniciones",
    ctaA: "Llamado, línea 1", ctaB: "Llamado, línea 2", tel: "Teléfono", addr: "Dirección", hours: "Horario / nota final",
    badge: "Sello superior", aEb: "Antetítulo", aTitle: "Título grande", aScript: "Subtítulo en cursiva", aVal: "Descripción del platillo",
    sz1: "Presentación 1", vl1: "Precio 1", nt1: "Nota 1", sz2: "Presentación 2", vl2: "Precio 2", nt2: "Nota 2",
    waLabel: "Texto arriba del teléfono", joke: "El chiste", bridge: "Puente a la comida",
    pEb: "Antetítulo", pTtl: "Título de la promoción", pSub: "Explicación", pBen: "Beneficio destacado", pTerms: "Condiciones"
  };
  /** Campos que se editan con <textarea> en vez de <input>. */
  var LONG = { incl: 1, aVal: 1, addr: 1, hours: 1, joke: 1, bridge: 1, pSub: 1, pTerms: 1 };

  var DEF_ROWS = [
    { n: "Chuleta ahumada en chile pasilla", p: "$95" },
    { n: "Pollo con papas en chile verde", p: "$95" },
    { n: "Pechuga empanizada o a la plancha", p: "$95" },
    { n: "Corundas (4) con chile y carne", p: "$75" },
    { n: "Enmoladas (3 piezas)", p: "$75" },
    { n: "Tacos de guisado (3 piezas)", p: "$55" }
  ];

  /**
   * Límites de cada valor numérico. `storage.js` recorta a este rango
   * cualquier número que venga de fuera, y los controles del panel usan
   * los mismos mínimos y máximos.
   */
  var RANGES = {
    logoScale: { min: 50, max: 200 },
    overlayOp: { min: 0, max: 95 },
    fontWeight: { min: 100, max: 900, step: 100 },
    fontSize: { min: 60, max: 170 },
    fontTrack: { min: -40, max: 300 },
    zoom: { min: 1, max: 4 }
  };

  /** Topes defensivos para el contenido de texto que llega de fuera. */
  var LIMITS = {
    text: 600,      // caracteres por campo de texto
    rowName: 160,   // caracteres del nombre de un platillo
    rowPrice: 40,   // caracteres del precio
    rows: 40        // número máximo de renglones
  };

  /** Copia profunda de datos planos (objetos, arreglos, cadenas, números). */
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  /** Estado inicial: los valores "de fábrica" de Amaranto. */
  function defState() {
    return {
      tpl: "menu",
      size: "v45",
      hd: false,
      colors: clone(PALETTES["Amaranto clásico"]),
      logo: { variant: "auto", color: "#B08A50", scale: 100, plate: false },
      fonts: {
        display: { fam: "Fraunces", w: 700, s: 100, t: 0, up: false },
        body: { fam: "Archivo", w: 500, s: 100, t: 0, up: false },
        price: { fam: "Archivo", w: 900, s: 100, t: 0, up: false }
      },
      overlay: { on: true, op: 55, mode: "bottom" },
      texts: clone(DEF_TEXTS),
      rows: clone(DEF_ROWS)
    };
  }

  Amaranto.CONFIG = {
    WA_TO: WA_TO,
    WA_FROM: WA_FROM,
    LOGO_AR: LOGO_AR,
    LOGO_BASE: LOGO_BASE,
    LOGO_VARIANTS: LOGO_VARIANTS,
    LOGO_QUICK: LOGO_QUICK,
    FONTS: FONTS,
    FONT_ROLES: FONT_ROLES,
    SIZES: SIZES,
    SIZE_KEYS: Object.keys(SIZES),
    TPL: TPL,
    TPL_KEYS: TPL.map(function (t) { return t[0]; }),
    TPLNAME: TPLNAME,
    OVERLAY_MODES: OVERLAY_MODES,
    COLORS: COLORS,
    COLOR_KEYS: COLORS.map(function (c) { return c[0]; }),
    PALETTES: PALETTES,
    DEF_TEXTS: DEF_TEXTS,
    TEXT_KEYS: Object.keys(DEF_TEXTS),
    LABELS: LABELS,
    LONG: LONG,
    DEF_ROWS: DEF_ROWS,
    RANGES: RANGES,
    LIMITS: LIMITS,
    clone: clone,
    defState: defState
  };
})(window);
