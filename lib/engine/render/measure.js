/*
 * Měření přetečení v prohlížeči: mřížka slidu nebo zóna je větší než místo, které má.
 * Běží v headless Chromiu (lokální server) i v MCP App v chatu (hostovaný konektor).
 * Hodnoty jsou v pixelech slidu 1920x1080, i když je slide zobrazený zmenšený.
 * Měří koncový stav: volat před připojením playeru (animace by posouvaly obdélníky).
 */
/* exported measureInstaDeck */
function measureInstaDeck(root) {
  "use strict";
  var out = [];
  var slides = Array.prototype.slice.call(root.querySelectorAll(".slide"));
  slides.forEach(function (slide) {
    var slideId = slide.getAttribute("data-slide-id");
    var scale = slide.getBoundingClientRect().width / 1920 || 1;
    var grid = slide.querySelector(".grid");
    var gridRect = grid.getBoundingClientRect();
    var found = false;
    Array.prototype.slice.call(grid.querySelectorAll(".zone")).forEach(function (zone) {
      var r = zone.getBoundingClientRect();
      var below = Math.round((r.bottom - gridRect.bottom) / scale);
      // Sjednocení obdélníků všech potomků: zachytí přetečení i nahoru (zóny zarovnané dolů).
      // Inline elementy (zvýraznění) mají obdélník podle metrik písma, ne podle řádku: neměří se.
      var top = r.top;
      var bottom = r.bottom;
      var left = r.left;
      var right = r.right;
      Array.prototype.slice.call(zone.querySelectorAll("*")).forEach(function (k) {
        if (getComputedStyle(k).display === "inline") return;
        var b = k.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) return;
        top = Math.min(top, b.top);
        bottom = Math.max(bottom, b.bottom);
        left = Math.min(left, b.left);
        right = Math.max(right, b.right);
      });
      var dy = Math.round((bottom - top - r.height) / scale);
      var dx = Math.round((right - left - r.width) / scale);
      var name = zone.getAttribute("data-zone");
      if (below > 1) out.push({ slideId: slideId, zone: name, px: below, axis: "y" });
      else if (dy > 1) out.push({ slideId: slideId, zone: name, px: dy, axis: "y" });
      if (dx > 1) out.push({ slideId: slideId, zone: name, px: dx, axis: "x" });
      if (below > 1 || dy > 1 || dx > 1) found = true;
    });
    var gy = Math.round(grid.scrollHeight - grid.clientHeight);
    if (gy > 1 && !found) out.push({ slideId: slideId, px: gy, axis: "y" });
  });
  return out;
}

/*
 * Měření pohybu: každý použitý vstup a přechod se přehraje na sondě (pozastavená animace, vzorky
 * v čase) a z vypočteného stylu se odečte, co pohyb opravdu dělá: dráha, měřítko, rotace, rozmazání,
 * překmit za klidový stav a kolik pohybu zbývá v polovině času. Hodnocení dělá engine (motionFindings).
 * Funguje s jakýmikoli keyframes, i s vlastním slovníkem decku.
 */
/* exported measureMotionInstaDeck */
function measureMotionInstaDeck(root, config) {
  "use strict";
  var SAMPLES = 40;
  var host = document.createElement("div");
  host.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none";
  var probe = document.createElement("div");
  probe.style.cssText = "position:absolute;left:0;top:0;width:800px;height:400px";
  host.appendChild(probe);
  root.appendChild(host);

  function state() {
    var cs = getComputedStyle(probe);
    var m = new DOMMatrix(cs.transform === "none" ? undefined : cs.transform);
    var blur = /blur\(([\d.]+)px\)/.exec(cs.filter);
    var clip = (cs.clipPath.match(/-?[\d.]+/g) || []).reduce(function (a, n) {
      return a + Math.abs(Number(n));
    }, 0);
    return {
      x: m.m41,
      y: m.m42,
      s: Math.max(Math.abs(Math.hypot(m.m11, m.m12) - 1), Math.abs(Math.hypot(m.m21, m.m22) - 1)),
      sx: Math.hypot(m.m11, m.m12) - 1,
      r: Math.abs((Math.atan2(m.m12, m.m11) * 180) / Math.PI),
      blur: blur ? Number(blur[1]) : 0,
      o: 1 - Number(cs.opacity),
      clip: clip,
    };
  }

  /** keyframes: celé pole včetně klidového stavu ({}). far: index vzorku nejdál od klidu (0 vstup, poslední odchod). */
  function sample(name, part, keyframes, duration, easing, enters) {
    var out = { name: name, part: part, travelPx: 0, scale: 0, blurPx: 0, rotateDeg: 0, overshoot: false, remainingAtHalf: 0 };
    if (!duration || keyframes.length < 2) return out;
    var anim = probe.animate(keyframes, { duration: duration, easing: easing, fill: "both" });
    anim.pause();
    var states = [];
    for (var i = 0; i <= SAMPLES; i++) {
      anim.currentTime = (duration * i) / SAMPLES;
      states.push(state());
    }
    anim.cancel();
    var far = enters ? states[0] : states[SAMPLES];
    var farLen = Math.hypot(far.x, far.y);
    var max = { t: 0, s: 0, r: 0, blur: 0, o: 0, clip: 0 };
    states.forEach(function (st) {
      var t = Math.hypot(st.x, st.y);
      max.t = Math.max(max.t, t);
      max.s = Math.max(max.s, st.s);
      max.r = Math.max(max.r, st.r);
      max.blur = Math.max(max.blur, st.blur);
      max.o = Math.max(max.o, st.o);
      max.clip = Math.max(max.clip, st.clip);
      // Překmit: pohyb za klidový stav proti směru, ze kterého prvek přichází (nebo kam odchází).
      if (farLen > 0 && (st.x * far.x + st.y * far.y) / farLen < -2) out.overshoot = true;
      if (Math.abs(far.sx) > 0.001 && st.sx * far.sx < 0 && Math.abs(st.sx) > 0.005) out.overshoot = true;
    });
    out.travelPx = Math.round(max.t);
    out.scale = Math.round(max.s * 1000) / 1000;
    out.blurPx = Math.round(max.blur * 10) / 10;
    out.rotateDeg = Math.round(max.r * 10) / 10;
    if (enters) {
      // Vzdálenost od klidu: největší ze složek, každá vztažená ke svému maximu. Složky pod prahem
      // šumu (zaokrouhlení matice při rotaci) se nepočítají.
      var rel = function (v, m, floor) {
        return m > floor ? v / m : 0;
      };
      var dist = function (st) {
        return Math.max(
          rel(Math.hypot(st.x, st.y), max.t, 0.5),
          rel(st.s, max.s, 0.001),
          rel(st.r, max.r, 0.1),
          rel(st.blur, max.blur, 0.1),
          rel(st.o, max.o, 0.01),
          rel(st.clip, max.clip, 0.5),
        );
      };
      var d0 = dist(states[0]);
      out.remainingAtHalf = d0 > 0 ? Math.round((dist(states[SAMPLES / 2]) / d0) * 100) / 100 : 0;
    }
    return out;
  }

  var out = [];
  try {
    Object.keys(config.measure.usage.entrances).forEach(function (name) {
      var e = config.entrances[name];
      if (e) out.push(sample(name, "entrance", e.keyframes.concat([{}]), e.duration, e.easing, true));
    });
    Object.keys(config.measure.usage.transitions).forEach(function (name) {
      var t = config.transitions[name];
      if (!t) return;
      if (t.enter.length) out.push(sample(name, "enter", t.enter.concat([{}]), t.duration, t.easing, true));
      if (t.exit.length) out.push(sample(name, "exit", [{}].concat(t.exit), t.duration, t.easing, false));
    });
  } finally {
    root.removeChild(host);
  }
  return out;
}

/*
 * Měření kompozice: kam až obsah sahá v mřížce (rovnováha a pasivní bílé místo) a poměr velikosti
 * nadpisu k textu. Hodnocení dělá engine (layoutFindings). Měří koncový stav, jako přetečení.
 */
/* exported measureLayoutInstaDeck */
function measureLayoutInstaDeck(root) {
  "use strict";
  var BODY_TEXT = ".text, .bullets li, .card-text, .stat-label, .timeline-text, .person-bio, .block-table td, .cta-text";
  return Array.prototype.slice.call(root.querySelectorAll(".slide")).map(function (slide) {
    var scale = slide.getBoundingClientRect().width / 1920 || 1;
    var grid = slide.querySelector(".grid");
    var g = grid.getBoundingClientRect();
    var bottom = g.top;
    var headingPx = 0;
    var bodyPx = 0;
    Array.prototype.slice.call(grid.querySelectorAll(".zone *")).forEach(function (el) {
      var cs = getComputedStyle(el);
      if (cs.display === "inline") return;
      var r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      bottom = Math.max(bottom, r.bottom);
      var hasText = Array.prototype.some.call(el.childNodes, function (n) {
        return n.nodeType === 3 && n.textContent.trim();
      });
      if (!hasText) return;
      var px = parseFloat(cs.fontSize) / scale;
      if (el.classList.contains("heading")) headingPx = Math.max(headingPx, px);
      // Text pod nadpisem včetně výzvy k akci (nadpis závěru ji musí převyšovat). Čísla, jména a titulky
      // karet jsou záměrně v písmu nadpisů a s nadpisem se nesrovnávají.
      else if (el.closest(BODY_TEXT)) bodyPx = Math.max(bodyPx, px);
    });
    var layout = (slide.className.match(/layout-([a-z-]+)/) || [])[1] || "";
    return {
      slideId: slide.getAttribute("data-slide-id"),
      layout: layout,
      fill: g.height > 0 ? Math.round(((bottom - g.top) / g.height) * 100) / 100 : 1,
      headingPx: Math.round(headingPx),
      bodyPx: Math.round(bodyPx),
    };
  });
}

/*
 * Snímek slidů pro export (PPTX): co prohlížeč opravdu vykreslil, v pixelech slidu 1920x1080.
 * Prohlížeč je layout engine, server z toho jen skládá soubor. Slidy musí být v koncovém stavu
 * (statické HTML, nebo kopie slidů bez skrytých kroků).
 *   box    plocha s výplní nebo rámečkem (karty, sloupce, tečky osy)
 *   line   jedna strana rámečku (linky mezi odrážkami, osa)
 *   text   textový blok s běhy (písmo, velikost, barva, tučnost) včetně ::before a ::after, počet řádků
 *   image  obrázek podle assetu, oříznutí
 *   chart, table  místo bloku, obsah doplní server z decku (nativní graf a tabulka)
 *   scrim  ochranný přechod přes obrázek na celý slide
 */
/* exported snapshotInstaDeck */
function snapshotInstaDeck(slideList) {
  "use strict";
  function hex(c) {
    var m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c || "");
    if (!m) return null;
    var a = m[4] === undefined ? 1 : Number(m[4]);
    if (a === 0) return null;
    var h = [m[1], m[2], m[3]]
      .map(function (v) {
        return ("0" + Math.round(Number(v)).toString(16)).slice(-2);
      })
      .join("")
      .toUpperCase();
    return { color: h, alpha: Math.round(a * 100) / 100 };
  }
  function family(f) {
    return f.split(",")[0].trim().replace(/^["']|["']$/g, "");
  }
  function runStyle(cs) {
    var c = hex(cs.color);
    return {
      font: family(cs.fontFamily),
      size: Math.round(parseFloat(cs.fontSize) * 10) / 10,
      color: c ? c.color : "000000",
      bold: Number(cs.fontWeight) >= 600,
      italic: cs.fontStyle === "italic",
      spacing: cs.letterSpacing === "normal" ? 0 : Math.round(parseFloat(cs.letterSpacing) * 100) / 100,
      upper: cs.textTransform === "uppercase",
    };
  }
  function pseudo(el, which) {
    var ps = getComputedStyle(el, which);
    var c = ps.content;
    if (!c || c === "none" || c === "normal") return null;
    var text = c.replace(/^["']|["']$/g, "");
    return text ? Object.assign({ text: text }, runStyle(ps)) : null;
  }
  function visible(el, cs) {
    return cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) > 0;
  }
  function hasText(el) {
    return Array.prototype.some.call(el.childNodes, function (n) {
      return n.nodeType === 3 && n.textContent.trim();
    });
  }
  function inlineOnly(el) {
    return Array.prototype.every.call(el.childNodes, function (n) {
      return n.nodeType === 3 || (n.nodeType === 1 && getComputedStyle(n).display.indexOf("inline") === 0 && inlineOnly(n));
    });
  }
  function runs(el, out) {
    Array.prototype.forEach.call(el.childNodes, function (n) {
      if (n.nodeType === 3) {
        if (n.textContent) out.push(Object.assign({ text: n.textContent.replace(/\s+/g, " ") }, runStyle(getComputedStyle(n.parentNode))));
      } else if (n.nodeType === 1) runs(n, out);
    });
    return out;
  }

  return Array.prototype.map.call(slideList, function (slide) {
    var base = slide.getBoundingClientRect();
    var k = base.width / 1920 || 1;
    var items = [];
    function rect(el) {
      var r = el.getBoundingClientRect();
      return { x: Math.round(((r.left - base.left) / k) * 10) / 10, y: Math.round(((r.top - base.top) / k) * 10) / 10, w: Math.round((r.width / k) * 10) / 10, h: Math.round((r.height / k) * 10) / 10 };
    }
    function zoneOf(el) {
      var z = el.closest("[data-zone]");
      return z ? z.getAttribute("data-zone") : el.closest(".bleed") ? "image" : "";
    }
    function box(el, cs, r) {
      var fill = hex(cs.backgroundColor);
      var radius = parseFloat(cs.borderTopLeftRadius) || 0;
      var sides = ["Top", "Right", "Bottom", "Left"].map(function (s) {
        var w = parseFloat(cs["border" + s + "Width"]) || 0;
        return { side: s, w: cs["border" + s + "Style"] === "none" ? 0 : w, c: hex(cs["border" + s + "Color"]) };
      });
      var all4 = sides.every(function (s) {
        return s.w > 0 && s.c && s.w === sides[0].w && s.c.color === sides[0].c.color;
      });
      if (fill || all4) {
        var item = Object.assign({ kind: "box", radius: Math.min(radius, Math.min(r.w, r.h) / 2), ellipse: radius >= Math.min(r.w, r.h) / 2 - 0.5 && r.w > 0 }, r);
        if (fill) item.fill = fill;
        if (all4) item.line = { color: sides[0].c.color, alpha: sides[0].c.alpha, width: sides[0].w };
        items.push(item);
      }
      if (!all4) {
        sides.forEach(function (s) {
          if (!s.w || !s.c) return;
          var y = s.side === "Bottom" ? r.y + r.h - s.w / 2 : r.y + s.w / 2;
          var x = s.side === "Right" ? r.x + r.w - s.w / 2 : r.x + s.w / 2;
          if (s.side === "Top" || s.side === "Bottom") items.push({ kind: "line", x1: r.x, y1: y, x2: r.x + r.w, y2: y, color: s.c.color, width: s.w });
          else items.push({ kind: "line", x1: x, y1: r.y, x2: x, y2: r.y + r.h, color: s.c.color, width: s.w });
        });
      }
    }
    function walk(el) {
      var cs = getComputedStyle(el);
      if (!visible(el, cs)) return;
      var r = rect(el);
      if (r.w <= 0 || r.h <= 0) return;
      if (el.classList.contains("scrim")) return items.push(Object.assign({ kind: "scrim" }, r));
      if (el.classList.contains("chart") && el.closest(".block-chart")) return items.push(Object.assign({ kind: "chart", zone: zoneOf(el) }, r));
      if (el.tagName === "TABLE") return items.push(Object.assign({ kind: "table", zone: zoneOf(el) }, r));
      if (el.tagName === "IMG") {
        var frame = el.parentNode;
        return items.push(
          Object.assign({ kind: "image", asset: el.getAttribute("data-asset") || "", nw: el.naturalWidth, nh: el.naturalHeight, fit: cs.objectFit === "cover" ? "cover" : "contain", radius: parseFloat(getComputedStyle(frame).borderTopLeftRadius) || 0, grayscale: cs.filter.indexOf("grayscale") >= 0 }, r),
        );
      }
      if (el.tagName === "svg" || el.tagName === "SVG" || el.classList.contains("series-legend")) return;
      if (el !== slide) box(el, cs, r);
      if (hasText(el) || (el.childNodes.length && inlineOnly(el) && el.textContent.trim())) {
        var list = [];
        var before = pseudo(el, "::before");
        if (before) list.push(before);
        runs(el, list);
        var after = pseudo(el, "::after");
        if (after) list.push(after);
        var lh = parseFloat(cs.lineHeight);
        lh = isNaN(lh) ? Math.round(parseFloat(cs.fontSize) * 1.2) : Math.round(lh * 10) / 10;
        // Poloha podle skutečného textu (flex ho může centrovat), šířka pro zalomení podle bloku.
        var range = document.createRange();
        range.selectNodeContents(el);
        var t = range.getBoundingClientRect();
        var tx = Math.round(((t.left - base.left) / k) * 10) / 10;
        var lines = Math.max(1, Math.round(t.height / k / lh));
        items.push({
          kind: "text",
          x: tx,
          y: Math.round(((t.top - base.top) / k) * 10) / 10,
          w: Math.round((lines > 1 ? r.x + r.w - tx : t.width / k) * 10) / 10,
          h: Math.round((t.height / k) * 10) / 10,
          lines: lines,
          align: cs.textAlign === "center" ? "center" : cs.textAlign === "right" || cs.textAlign === "end" ? "right" : "left",
          lineHeight: lh,
          runs: list,
        });
        return;
      }
      Array.prototype.forEach.call(el.children, walk);
    }
    var bg = hex(getComputedStyle(slide).backgroundColor);
    walk(slide);
    return { slideId: slide.getAttribute("data-slide-id"), background: bg ? bg.color : "FFFFFF", items: items };
  });
}
