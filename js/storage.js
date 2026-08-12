/**
 * Capa de persistencia: guarda la configuración en LocalStorage.
 *
 * Tiene dos partes bien separadas:
 *
 *   1. SANEADO (`sanitize`)
 *      Nada de lo que se lee de LocalStorage o de un archivo .json se considera
 *      confiable: el usuario puede editarlo desde las herramientas del navegador,
 *      otra pestaña del mismo dominio puede escribirlo, o el archivo puede venir
 *      de un tercero. Por eso cada campo se compara contra las listas de
 *      `config.js` y se descarta si no encaja. Importa sobre todo en los colores
 *      y las tipografías, porque acaban dentro de `style.setProperty()`: un valor
 *      sin revisar sería una inyección de CSS. Lo que no pasa la revisión no
 *      rompe la carga, simplemente se sustituye por el valor de fábrica.
 *
 *   2. ALMACÉN
 *      LocalStorage puede no existir (modo privado de Safari, cookies bloqueadas,
 *      algunos navegadores en file://) y puede quedarse sin espacio. Todas las
 *      llamadas van dentro de try/catch y, si el navegador no deja escribir, la
 *      configuración se mantiene en memoria durante la sesión en vez de tirar la
 *      aplicación.
 *
 * La foto NUNCA se guarda: es un data URI que puede pesar varios MB y llenaría
 * la cuota de un solo golpe. `PERSISTED_KEYS` es una lista blanca explícita.
 *
 * Expone: window.Amaranto.Storage
 */
(function (global) {
  "use strict";

  var Amaranto = (global.Amaranto = global.Amaranto || {});
  var CFG = Amaranto.CONFIG;

  /** Clave con espacio de nombres, para no chocar con nada más del dominio. */
  var STORAGE_KEY = "amaranto.generador.estado";

  /**
   * Versión del formato guardado. Si se sube, lo almacenado con una versión
   * distinta se descarta y se vuelve a los valores de fábrica; así un cambio
   * de estructura no deja al usuario con un estado a medias.
   */
  var SCHEMA_VERSION = 5;

  /** Tope de tamaño (~256 KB). La configuración real ronda los 4 KB. */
  var MAX_BYTES = 256 * 1024;

  /** Único conjunto de claves que se llega a escribir en disco. */
  var PERSISTED_KEYS = ["tpl", "size", "hd", "colors", "logo", "fonts", "overlay", "texts", "rows"];

  /** Espera entre el último cambio y el guardado automático. */
  var AUTOSAVE_DELAY = 400;

  var HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
  /* Caracteres de control invisibles; se conservan el salto de línea y el tabulador. */
  var CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

  /* ================================================================
   * 1. SANEADO
   * ================================================================ */

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  /** Cadena recortada a `max` y sin caracteres de control. `null` si no era cadena. */
  function safeString(value, max) {
    if (typeof value !== "string") return null;
    return value.replace(CONTROL_CHARS, "").slice(0, max);
  }

  /** Número finito acotado a [min, max]. Devuelve `fallback` si no es utilizable. */
  function safeNumber(value, min, max, fallback, step) {
    var n = typeof value === "number" ? value : parseFloat(value);
    if (!isFinite(n)) return fallback;
    n = step ? Math.round(n / step) * step : Math.round(n);
    return Math.min(max, Math.max(min, n));
  }

  function safeBool(value, fallback) {
    return typeof value === "boolean" ? value : fallback;
  }

  /** Devuelve `value` sólo si está en la lista permitida. */
  function safeEnum(value, allowed, fallback) {
    return allowed.indexOf(value) !== -1 ? value : fallback;
  }

  /** Color hexadecimal #RRGGBB. Se valida estricto: acaba en una variable CSS. */
  function safeColor(value, fallback) {
    return typeof value === "string" && HEX_COLOR.test(value) ? value : fallback;
  }

  /**
   * Convierte datos de origen desconocido en un estado válido y completo.
   * Nunca lanza y siempre devuelve un objeto usable por la aplicación.
   */
  function sanitize(raw) {
    var out = CFG.defState();
    if (!isPlainObject(raw)) return out;

    out.tpl = safeEnum(raw.tpl, CFG.TPL_KEYS, out.tpl);
    out.size = safeEnum(raw.size, CFG.SIZE_KEYS, out.size);
    out.hd = safeBool(raw.hd, out.hd);

    /* colores: sólo las claves conocidas y sólo #RRGGBB */
    if (isPlainObject(raw.colors)) {
      CFG.COLOR_KEYS.forEach(function (key) {
        out.colors[key] = safeColor(raw.colors[key], out.colors[key]);
      });
    }

    /* logotipo */
    if (isPlainObject(raw.logo)) {
      out.logo.variant = safeEnum(raw.logo.variant, CFG.LOGO_VARIANTS, out.logo.variant);
      out.logo.color = safeColor(raw.logo.color, out.logo.color);
      out.logo.scale = safeNumber(raw.logo.scale, CFG.RANGES.logoScale.min, CFG.RANGES.logoScale.max, out.logo.scale);
      out.logo.plate = safeBool(raw.logo.plate, out.logo.plate);
    }

    /* tipografías: la familia debe estar en la lista que carga Google Fonts */
    if (isPlainObject(raw.fonts)) {
      CFG.FONT_ROLES.forEach(function (roleName) {
        var incoming = raw.fonts[roleName];
        if (!isPlainObject(incoming)) return;
        var target = out.fonts[roleName];
        target.fam = safeEnum(incoming.fam, CFG.FONTS, target.fam);
        target.w = safeNumber(incoming.w, CFG.RANGES.fontWeight.min, CFG.RANGES.fontWeight.max, target.w, CFG.RANGES.fontWeight.step);
        target.s = safeNumber(incoming.s, CFG.RANGES.fontSize.min, CFG.RANGES.fontSize.max, target.s);
        target.t = safeNumber(incoming.t, CFG.RANGES.fontTrack.min, CFG.RANGES.fontTrack.max, target.t);
        target.up = safeBool(incoming.up, target.up);
      });
    }

    /* capa oscura */
    if (isPlainObject(raw.overlay)) {
      out.overlay.on = safeBool(raw.overlay.on, out.overlay.on);
      out.overlay.op = safeNumber(raw.overlay.op, CFG.RANGES.overlayOp.min, CFG.RANGES.overlayOp.max, out.overlay.op);
      out.overlay.mode = safeEnum(raw.overlay.mode, CFG.OVERLAY_MODES, out.overlay.mode);
    }

    /* textos: sólo las claves conocidas, con tope de longitud */
    if (isPlainObject(raw.texts)) {
      CFG.TEXT_KEYS.forEach(function (key) {
        var value = safeString(raw.texts[key], CFG.LIMITS.text);
        if (value !== null) out.texts[key] = value;
      });
    }

    /* renglones del menú: se acepta una lista vacía (el usuario pudo borrarlos todos) */
    if (Array.isArray(raw.rows)) {
      out.rows = raw.rows
        .slice(0, CFG.LIMITS.rows)
        .filter(isPlainObject)
        .map(function (row) {
          return {
            n: safeString(row.n, CFG.LIMITS.rowName) || "",
            p: safeString(row.p, CFG.LIMITS.rowPrice) || ""
          };
        });
    }

    return out;
  }

  /* ================================================================
   * 2. ALMACÉN
   * ================================================================ */

  /** Copia sólo las claves de la lista blanca. Así la foto nunca se cuela. */
  function pickPersistable(state) {
    var out = {};
    PERSISTED_KEYS.forEach(function (key) {
      if (state[key] !== undefined) out[key] = state[key];
    });
    return out;
  }

  var available = null;      // resultado de la prueba de escritura (se calcula una vez)
  var memoryFallback = null; // copia en memoria cuando el navegador no deja escribir
  var lastBody = null;       // último estado serializado, para no reescribir lo mismo
  var lastSavedAt = null;
  var saveTimer = null;

  /**
   * Comprueba de verdad que se puede escribir. No basta con `"localStorage" in window`:
   * en modo privado el objeto existe pero `setItem` lanza.
   */
  function probe() {
    try {
      var probeKey = STORAGE_KEY + ".probe";
      global.localStorage.setItem(probeKey, "1");
      global.localStorage.removeItem(probeKey);
      return true;
    } catch (err) {
      return false;
    }
  }

  function store() {
    if (available === null) available = probe();
    return available ? global.localStorage : null;
  }

  /** `true` si lo guardado sobrevive al cierre de la pestaña. */
  function isPersistent() {
    return store() !== null;
  }

  function clear() {
    memoryFallback = null;
    lastBody = null;
    lastSavedAt = null;
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    var ls = store();
    if (!ls) return;
    try {
      ls.removeItem(STORAGE_KEY);
    } catch (err) {
      /* si ni siquiera se puede borrar, no hay nada más que hacer */
    }
  }

  /** Lee el sobre guardado y devuelve el estado en bruto, sin sanear. */
  function readRaw() {
    var text = null;
    try {
      var ls = store();
      text = ls ? ls.getItem(STORAGE_KEY) : memoryFallback;
    } catch (err) {
      text = memoryFallback;
    }
    if (typeof text !== "string" || !text) return null;

    /* Algo desmedido en nuestra clave sólo puede ser basura o manipulación. */
    if (text.length > MAX_BYTES) { clear(); return null; }

    var envelope;
    try {
      envelope = JSON.parse(text);
    } catch (err) {
      clear();               // JSON corrupto: se descarta para no fallar en cada carga
      return null;
    }
    if (!isPlainObject(envelope) || envelope.v !== SCHEMA_VERSION) {
      clear();               // versión distinta o formato inesperado
      return null;
    }
    lastSavedAt = typeof envelope.savedAt === "string" ? envelope.savedAt : null;
    return envelope.state;
  }

  /**
   * Devuelve un estado listo para usar: lo guardado si es válido, o los valores
   * de fábrica. Nunca lanza.
   */
  function load() {
    return sanitize(readRaw());
  }

  /** `true` si hay una configuración guardada en este navegador. */
  function hasSaved() {
    return readRaw() !== null;
  }

  /** Fecha ISO del último guardado, o `null`. */
  function savedAt() {
    if (lastSavedAt === null) readRaw();
    return lastSavedAt;
  }

  /**
   * Guarda ya, sin esperar. Devuelve `true` si quedó escrito en LocalStorage.
   * El estado se sanea antes de escribir, así que lo guardado siempre es válido.
   * Si nada cambió desde la última escritura no vuelve a tocar el disco.
   */
  function save(state) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }

    var body;
    try {
      body = JSON.stringify(pickPersistable(sanitize(state)));
    } catch (err) {
      return false;          // valores no serializables
    }
    if (body === lastBody) return available === true;
    if (body.length > MAX_BYTES) return false;

    var savedAtIso = new Date().toISOString();
    var payload = '{"v":' + SCHEMA_VERSION +
      ',"savedAt":' + JSON.stringify(savedAtIso) +
      ',"state":' + body + '}';

    memoryFallback = payload;
    lastSavedAt = savedAtIso;

    var ls = store();
    if (!ls) return false;

    try {
      ls.setItem(STORAGE_KEY, payload);
      lastBody = body;
      return true;
    } catch (err) {
      /* Sin espacio: se libera nuestra propia entrada y se intenta una vez más. */
      try {
        ls.removeItem(STORAGE_KEY);
        ls.setItem(STORAGE_KEY, payload);
        lastBody = body;
        return true;
      } catch (err2) {
        available = false;   // se sigue en memoria durante lo que queda de sesión
        lastBody = null;
        return false;
      }
    }
  }

  /**
   * Guardado automático con retardo: agrupa las ráfagas de cambios de un
   * deslizador o de la escritura en un texto en una sola escritura.
   */
  function scheduleSave(state) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      save(state);
    }, AUTOSAVE_DELAY);
  }

  /**
   * Escribe de inmediato al cerrar u ocultar la página. No mira si había un
   * guardado pendiente: se llama en el último momento útil y `save()` ya se
   * ahorra el trabajo cuando nada cambió.
   */
  function flush(state) {
    save(state);
  }

  Amaranto.Storage = {
    STORAGE_KEY: STORAGE_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    sanitize: sanitize,
    load: load,
    save: save,
    scheduleSave: scheduleSave,
    flush: flush,
    clear: clear,
    hasSaved: hasSaved,
    savedAt: savedAt,
    isPersistent: isPersistent
  };
})(window);
