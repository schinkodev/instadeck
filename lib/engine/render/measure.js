/*
 * Overflow measurement in the browser: the slide grid or a zone is larger than the space it has.
 * Runs in headless Chromium (local server) and in the MCP App in the chat (hosted connector).
 * Values are in pixels of the 1920x1080 slide, even when the slide is shown scaled down.
 * Measures the final state: call it before the player mounts (animation would move the rectangles).
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
      // Union of the rectangles of all descendants: catches overflow upwards too (zones aligned to the bottom).
      // Inline elements (highlights) have a rectangle by font metrics, not by line: they are not measured.
      var top = r.top;
      var bottom = r.bottom;
      var left = r.left;
      var right = r.right;
      var spill = 0;
      Array.prototype.slice.call(zone.querySelectorAll("*")).forEach(function (k) {
        var cs = getComputedStyle(k);
        if (cs.display === "inline") return;
        var b = k.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) return;
        top = Math.min(top, b.top);
        bottom = Math.max(bottom, b.bottom);
        left = Math.min(left, b.left);
        right = Math.max(right, b.right);
        // Text that does not wrap (a large number) runs out of its box sideways without growing the box.
        if (cs.whiteSpace === "nowrap" && cs.overflowX === "visible") spill = Math.max(spill, k.scrollWidth - k.clientWidth);
      });
      var dy = Math.round((bottom - top - r.height) / scale);
      var dx = Math.max(Math.round((right - left - r.width) / scale), spill);
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
 * Motion measurement: every used entrance and transition plays on a probe (paused animation, samples
 * over time) and the computed style shows what the motion really does: travel, scale, rotation, blur,
 * overshoot past the resting state and how much motion remains at half time. For every transition it also measures how
 * long the text of both slides is legible at once. The engine does the scoring (motionFindings).
 * Works with any keyframes, including the deck's own vocabulary. Returns { samples, overlaps }.
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
    var clip = (cs.clipPath.match(/-?[\d.]+/g) || []).map(Number);
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

  /**
   * Computed states of the probe at SAMPLES + 1 evenly spaced times. Keyframes carry their own easing (offsets are
   * positions in time, engine/motion.ts), so the effect itself runs linear, exactly as the player plays it.
   */
  function statesOf(keyframes, duration) {
    var anim = probe.animate(keyframes, { duration: duration, easing: "linear", fill: "both" });
    anim.pause();
    var list = [];
    for (var i = 0; i <= SAMPLES; i++) {
      anim.currentTime = (duration * i) / SAMPLES;
      list.push(state());
    }
    anim.cancel();
    return list;
  }

  /** states: sampled with statesOf. far: the sample farthest from rest (the first for entrance and enter, the last for exit). */
  function summarize(name, part, states, duration, enters) {
    var out = { name: name, part: part, travelPx: 0, scale: 0, blurPx: 0, rotateDeg: 0, overshoot: false, remainingAtHalf: 0, activeMs: 0 };
    if (!states) return out;
    // A clip is judged by how far it is from its own rest (an open inset or circle), not from zero.
    var restClip = (enters ? states[SAMPLES] : states[0]).clip;
    states = states.map(function (st) {
      var away = 0;
      for (var i = 0; i < Math.max(st.clip.length, restClip.length); i++) away += Math.abs((st.clip[i] || 0) - (restClip[i] || 0));
      return Object.assign({}, st, { clip: away });
    });
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
      // Overshoot: motion past the resting state against the direction the element comes from (or leaves to).
      if (farLen > 0 && (st.x * far.x + st.y * far.y) / farLen < -2) out.overshoot = true;
      if (Math.abs(far.sx) > 0.001 && st.sx * far.sx < 0 && Math.abs(st.sx) > 0.005) out.overshoot = true;
    });
    out.travelPx = Math.round(max.t);
    out.scale = Math.round(max.s * 1000) / 1000;
    out.blurPx = Math.round(max.blur * 10) / 10;
    out.rotateDeg = Math.round(max.r * 10) / 10;
    if (enters) {
      // Distance from rest: the largest of the components, each relative to its maximum. Components below the noise
      // threshold (matrix rounding during rotation) do not count.
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
      // The time the element really moves, from its first change to its rest. A delayed start (a fade through that
      // waits for the old slide) is a pause, not a speed up, so the easing is judged at half of this time. The
      // active time itself is reported too: a motion that holds and then snaps into place reads as a jump.
      var d0 = dist(states[0]);
      var from = 0;
      while (from < SAMPLES && dist(states[from + 1]) >= d0 - 0.001) from += 1;
      var to = SAMPLES;
      while (to > from && dist(states[to - 1]) <= 0.001) to -= 1;
      out.remainingAtHalf = d0 > 0 ? Math.round((dist(states[Math.round((from + to) / 2)]) / d0) * 100) / 100 : 0;
      out.activeMs = d0 > 0 ? Math.round((duration * (to - from)) / SAMPLES) : 0;
    }
    return out;
  }

  /*
   * Two slides legible at once: during a transition the top slide (opaque background) covers the one below in
   * proportion to its opacity, so at a time t the top text shows at its opacity and the bottom text at what the
   * top lets through. Both texts read when both are at least OVERLAP_VISIBLE and the slides still cover the
   * same place. The result is how long that lasts, in ms.
   */
  var OVERLAP_VISIBLE = 0.2;
  function overlapMs(t, enter, exit) {
    var rest = { x: 0, y: 0, o: 0 };
    var both = 0;
    for (var i = 0; i <= SAMPLES; i++) {
      var inc = enter ? enter[i] : rest;
      var out = exit ? exit[i] : rest;
      var top = t.over === "enter" ? inc : out;
      var bottom = t.over === "enter" ? out : inc;
      var topVisible = 1 - top.o;
      var bottomVisible = (1 - topVisible) * (1 - bottom.o);
      var shared = Math.max(0, 1 - Math.abs(inc.x - out.x) / 1920) * Math.max(0, 1 - Math.abs(inc.y - out.y) / 1080);
      if (Math.min(topVisible, bottomVisible) >= OVERLAP_VISIBLE && shared >= 0.5) both += 1;
    }
    return Math.round((t.duration * both) / (SAMPLES + 1));
  }

  var samples = [];
  var overlaps = [];
  try {
    Object.keys(config.measure.usage.entrances).forEach(function (name) {
      var e = config.entrances[name];
      if (!e) return;
      var st = e.duration && e.frames.length ? statesOf(e.frames, e.duration) : null;
      samples.push(summarize(name, "entrance", st, e.duration, true));
    });
    Object.keys(config.measure.usage.transitions).forEach(function (name) {
      var t = config.transitions[name];
      if (!t || !t.duration) return;
      // The same frames the player plays (built by the engine, engine/motion.ts).
      var enter = t.enter.length ? statesOf(t.enter, t.duration) : null;
      var exit = t.exit.length ? statesOf(t.exit, t.duration) : null;
      if (enter) samples.push(summarize(name, "enter", enter, t.duration, true));
      if (exit) samples.push(summarize(name, "exit", exit, t.duration, false));
      overlaps.push({ name: name, overlapMs: overlapMs(t, enter, exit) });
    });
  } finally {
    root.removeChild(host);
  }
  return { samples: samples, overlaps: overlaps };
}

/*
 * Composition measurement: how far content reaches in the grid (balance and passive white space), the size ratio
 * of heading to text, the size of the figure (a call to action or a hero number) against the heading, and zones whose
 * content shares no edge or center line with any other zone. The engine does the scoring (layoutFindings).
 * Measures the final state, like overflow.
 */
/* exported measureLayoutInstaDeck */
function measureLayoutInstaDeck(root) {
  "use strict";
  var BODY_TEXT = ".text, .bullets li, .card-text, .stat-label, .timeline-text, .person-bio, .block-table td";
  var ALIGN_TOLERANCE = 6;
  // Blocks whose frame is the figure (a chart, an image, a table, a timeline): their box is their visual extent.
  var FRAMES = ".block-chart, .block-image, .block-logo, .block-logos, .block-table, .block-timeline, .block-team, .block-cards, .block-comparison";

  /** Paints something itself: a fill, an image, a border or media. Stretched wrappers paint nothing and do not count. */
  function paints(el, cs) {
    if (/^(IMG|SVG|CANVAS|VIDEO)$/i.test(el.tagName)) return true;
    if (cs.backgroundImage !== "none") return true;
    if (!/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) return true;
    return ["Top", "Right", "Bottom", "Left"].some(function (side) {
      return cs["border" + side + "Style"] !== "none" && parseFloat(cs["border" + side + "Width"]) > 0;
    });
  }

  /** Zones whose content shares no left, right, top, bottom or center line with another zone (grid, Müller-Brockmann). */
  function unaligned(boxes, scale) {
    var zones = Object.keys(boxes).map(function (name) {
      var b = boxes[name];
      return { name: name, x: [b.left / scale, b.right / scale, (b.left + b.right) / 2 / scale], y: [b.top / scale, b.bottom / scale, (b.top + b.bottom) / 2 / scale] };
    });
    if (zones.length < 2) return [];
    var near = function (a, b) {
      return a.some(function (u) {
        return b.some(function (v) {
          return Math.abs(u - v) <= ALIGN_TOLERANCE;
        });
      });
    };
    return zones
      .filter(function (z) {
        return !zones.some(function (o) {
          return o !== z && (near(z.x, o.x) || near(z.y, o.y));
        });
      })
      .map(function (z) {
        return z.name;
      });
  }

  /*
   * Text over a background image (figure and ground): the image is drawn small on a canvas the way the browser crops it
   * (cover with the focal point), the overlay of the slide color is blended on it and every text element is compared with the
   * pixels under it. The worst tenth of the pixels counts, so a bright patch behind one word is not averaged away.
   * Returns the contrast now and the smallest overlay at which all text is legible, or null when the image cannot be read
   * (an image from another origin taints the canvas) or the slide has no background image.
   */
  var BACKDROP_W = 96;
  var BACKDROP_H = 54;
  function channel(v) {
    v = v / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  function lum(r, g, b) {
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }
  function parseRgba(c) {
    var m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c || "");
    return m ? { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: m[4] === undefined ? 1 : Number(m[4]) } : null;
  }
  function backdrop(slide, scale) {
    var img = slide.querySelector(".bg-image img");
    var cover = slide.querySelector(".bg-overlay");
    if (!img || !cover) return null;
    if (!img.naturalWidth) return { unreadable: true };
    try {
      var canvas = document.createElement("canvas");
      canvas.width = BACKDROP_W;
      canvas.height = BACKDROP_H;
      var ctx = canvas.getContext("2d", { willReadFrequently: true });
      var pos = (img.style.objectPosition || "50% 50%").split(" ").map(function (v) {
        return parseFloat(v) / 100;
      });
      var k = Math.max(BACKDROP_W / img.naturalWidth, BACKDROP_H / img.naturalHeight);
      var sw = BACKDROP_W / k;
      var sh = BACKDROP_H / k;
      ctx.drawImage(img, (img.naturalWidth - sw) * pos[0], (img.naturalHeight - sh) * pos[1], sw, sh, 0, 0, BACKDROP_W, BACKDROP_H);
      var data = ctx.getImageData(0, 0, BACKDROP_W, BACKDROP_H).data;
      var over = parseRgba(getComputedStyle(cover).backgroundColor);
      if (!over) return null;
      var sr = slide.getBoundingClientRect();
      var texts = [];
      Array.prototype.slice.call(slide.querySelectorAll(".grid *")).forEach(function (el) {
        var own = Array.prototype.some.call(el.childNodes, function (n) {
          return n.nodeType === 3 && n.textContent.trim();
        });
        if (!own || getComputedStyle(el).display === "inline") return;
        var range = document.createRange();
        range.selectNodeContents(el);
        var r = range.getBoundingClientRect();
        var cs = getComputedStyle(el);
        var ink = parseRgba(cs.color);
        if (!ink || r.width <= 0 || r.height <= 0) return;
        // Text on a surface of its own (a card, a table cell, a column) does not stand on the image.
        for (var up = el; up && up !== slide; up = up.parentElement) {
          var surface = parseRgba(getComputedStyle(up).backgroundColor);
          if (surface && surface.a >= 0.95) return;
        }
        var px = parseFloat(cs.fontSize) / scale;
        texts.push({
          x0: Math.max(0, Math.floor(((r.left - sr.left) / scale / 1920) * BACKDROP_W)),
          x1: Math.min(BACKDROP_W, Math.ceil(((r.right - sr.left) / scale / 1920) * BACKDROP_W)),
          y0: Math.max(0, Math.floor(((r.top - sr.top) / scale / 1080) * BACKDROP_H)),
          y1: Math.min(BACKDROP_H, Math.ceil(((r.bottom - sr.top) / scale / 1080) * BACKDROP_H)),
          lum: lum(ink.r, ink.g, ink.b),
          required: px >= 40 ? 3 : 4.5,
        });
      });
      if (!texts.length) return null;
      var worstAt = function (alpha) {
        var worst = Infinity;
        var required = 4.5;
        texts.forEach(function (t) {
          var ratios = [];
          for (var y = t.y0; y < t.y1; y++) {
            for (var x = t.x0; x < t.x1; x++) {
              var i = (y * BACKDROP_W + x) * 4;
              var l = lum(data[i] * (1 - alpha) + over.r * alpha, data[i + 1] * (1 - alpha) + over.g * alpha, data[i + 2] * (1 - alpha) + over.b * alpha);
              ratios.push((Math.max(l, t.lum) + 0.05) / (Math.min(l, t.lum) + 0.05) / t.required);
            }
          }
          if (!ratios.length) return;
          ratios.sort(function (a, b) {
            return a - b;
          });
          var tenth = ratios[Math.floor(ratios.length * 0.1)];
          if (tenth < worst) {
            worst = tenth;
            required = t.required;
          }
        });
        return { ratio: worst, required: required };
      };
      var now = worstAt(over.a);
      var needed = null;
      for (var a = 0; a <= 0.95001; a += 0.05) {
        if (worstAt(a).ratio >= 1) {
          needed = Math.round(a * 100) / 100;
          break;
        }
      }
      return { overlay: Math.round(over.a * 100) / 100, contrast: Math.round(now.ratio * now.required * 10) / 10, required: now.required, needed: needed };
    } catch {
      // A canvas tainted by an image from another origin refuses to give its pixels.
      return { unreadable: true };
    }
  }

  return Array.prototype.slice.call(root.querySelectorAll(".slide")).map(function (slide) {
    var scale = slide.getBoundingClientRect().width / 1920 || 1;
    var grid = slide.querySelector(".grid");
    var g = grid.getBoundingClientRect();
    var bottom = g.top;
    var headingPx = 0;
    var bodyPx = 0;
    // Where the content of each zone really is. Blocks stretch to the zone width, so horizontally it is the rendered text
    // and the painted areas. Blocks do not stretch in height, so vertically it is the box of a block with text (the text
    // glyphs sit half a leading inside it) and the painted areas.
    var boxes = {};
    var grow = function (zone, x, y) {
      if (!zone || x.right - x.left <= 0 || y.bottom - y.top <= 0) return;
      var name = zone.getAttribute("data-zone");
      var b = boxes[name];
      boxes[name] = b
        ? { left: Math.min(b.left, x.left), top: Math.min(b.top, y.top), right: Math.max(b.right, x.right), bottom: Math.max(b.bottom, y.bottom) }
        : { left: x.left, top: y.top, right: x.right, bottom: y.bottom };
    };
    Array.prototype.slice.call(grid.querySelectorAll(".zone *")).forEach(function (el) {
      var cs = getComputedStyle(el);
      if (cs.display === "inline") return;
      var r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      var zone = el.closest(".zone");
      bottom = Math.max(bottom, r.bottom);
      if (paints(el, cs) || el.matches(FRAMES)) grow(zone, r, r);
      // A line of text: a block with text whose children are all inline (a number with its affixes, a highlight).
      var line =
        el.textContent.trim() &&
        !Array.prototype.some.call(el.children, function (c) {
          return getComputedStyle(c).display !== "inline";
        });
      if (line) {
        var range = document.createRange();
        range.selectNodeContents(el);
        grow(zone, range.getBoundingClientRect(), r);
      }
      var hasText = Array.prototype.some.call(el.childNodes, function (n) {
        return n.nodeType === 3 && n.textContent.trim();
      });
      if (!hasText) return;
      var px = parseFloat(cs.fontSize) / scale;
      if (el.classList.contains("heading")) headingPx = Math.max(headingPx, px);
      // Numbers, names and card titles are in the heading font on purpose and are not compared with the heading.
      else if (el.closest(BODY_TEXT)) bodyPx = Math.max(bodyPx, px);
    });
    // The figure of the slide (a hero number, the ask) is measured on its own: it must clearly win or clearly yield to the
    // heading. Its text often sits in inline spans (affixes, highlights), so the font size is read from the block.
    var figurePx = 0;
    Array.prototype.slice.call(grid.querySelectorAll("[data-figure] .stat-value, [data-figure] .cta-text")).forEach(function (el) {
      figurePx = Math.max(figurePx, parseFloat(getComputedStyle(el).fontSize) / scale);
    });
    var layout = (slide.className.match(/layout-([a-z-]+)/) || [])[1] || "";
    return {
      slideId: slide.getAttribute("data-slide-id"),
      layout: layout,
      fill: g.height > 0 ? Math.round(((bottom - g.top) / g.height) * 100) / 100 : 1,
      headingPx: Math.round(headingPx),
      bodyPx: Math.round(bodyPx),
      figurePx: Math.round(figurePx),
      unaligned: unaligned(boxes, scale),
      backdrop: backdrop(slide, scale) || undefined,
    };
  });
}

/*
 * Snapshot of slides for export (PPTX): what the browser really rendered, in pixels of the 1920x1080 slide.
 * The browser is the layout engine, the server only assembles the file from it. Slides must be in their final state
 * (static HTML, or a copy of the slides without hidden steps).
 *   box    an area with a fill or a border (cards, columns, timeline dots)
 *   line   one side of a border (rules between bullets, the axis)
 *   text   a text block with runs (font, size, color, weight) including ::before and ::after, line count
 *   image  an image by asset, crop
 *   chart, table  the place of the block, the server fills in the content from the deck (native chart and table)
 *   scrim  protective gradient over a full slide image
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

  /*
   * An icon as a PNG, drawn the way the browser draws its strokes (Path2D, round caps). PowerPoint reads an SVG, but
   * Keynote, Google Slides and LibreOffice use the picture that comes with it, and a library that wraps an SVG puts the
   * SVG text in that place. A real PNG works everywhere. 8 times the slide size of 24 units keeps it sharp when scaled up.
   */
  /* global Path2D */
  function rasterIcon(svg, color) {
    var size = 192;
    var canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext("2d");
    ctx.scale(size / 24, size / 24);
    ctx.strokeStyle = "#" + color;
    ctx.lineWidth = parseFloat(svg.getAttribute("stroke-width")) || 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    Array.prototype.forEach.call(svg.children, function (n) {
      var tag = n.tagName.toLowerCase();
      var a = function (name) {
        return parseFloat(n.getAttribute(name)) || 0;
      };
      var p = new Path2D();
      if (tag === "path") p = new Path2D(n.getAttribute("d"));
      else if (tag === "rect") p.roundRect(a("x"), a("y"), a("width"), a("height"), a("rx") || a("ry"));
      else if (tag === "circle") p.arc(a("cx"), a("cy"), a("r"), 0, Math.PI * 2);
      else if (tag === "ellipse") p.ellipse(a("cx"), a("cy"), a("rx"), a("ry"), 0, 0, Math.PI * 2);
      else if (tag === "line") {
        p.moveTo(a("x1"), a("y1"));
        p.lineTo(a("x2"), a("y2"));
      } else if (tag === "polyline" || tag === "polygon") {
        var pts = n.getAttribute("points").trim().split(/[\s,]+/).map(Number);
        for (var i = 0; i + 1 < pts.length; i += 2) (i === 0 ? p.moveTo : p.lineTo).call(p, pts[i], pts[i + 1]);
        if (tag === "polygon") p.closePath();
      } else throw new Error("Icon shape " + tag + " cannot be rasterized");
      ctx.stroke(p);
    });
    return canvas.toDataURL("image/png");
  }

  /** Focal point of a cover crop from object-position ("25% 50%"), 0 to 1. */
  function focal(cs, axis) {
    var v = parseFloat((cs.objectPosition || "50% 50%").split(" ")[axis]);
    return isNaN(v) ? 0.5 : Math.min(1, Math.max(0, v / 100));
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
          Object.assign({ kind: "image", asset: el.getAttribute("data-asset") || "", nw: el.naturalWidth, nh: el.naturalHeight, fit: cs.objectFit === "cover" ? "cover" : "contain", fx: focal(cs, 0), fy: focal(cs, 1), radius: parseFloat(getComputedStyle(frame).borderTopLeftRadius) || 0, grayscale: cs.filter.indexOf("grayscale") >= 0 }, r),
        );
      }
      if (el.getAttribute("data-icon")) {
        var ink = hex(cs.color);
        return items.push(Object.assign({ kind: "icon", name: el.getAttribute("data-icon"), png: rasterIcon(el, ink ? ink.color : "000000") }, r));
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
        // Position by the real text (flex may center it), width for wrapping by the block.
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
