/*
 * InstaDeck player: prezentace v prohlížeči. Bez závislostí.
 *
 * HTML je vykreslené v koncovém stavu (vše odkryté). Player skryje, co má přijít později,
 * a odkrývá to po krocích: vstup slidu, kroky na kliknutí, hero pohyby (čísla, grafy, osa),
 * přechody mezi slidy. Konfigurace (časování, easing, keyframes) přichází z domény a z pohybového
 * slovníku decku. Keyframes popisují jen cestu: vstup končí a odchod začíná v klidovém stavu ({}),
 * takže koncový stav HTML platí vždy.
 *
 * mountInstaDeck({ root, config, hash, autoplayMs, onFullscreen, controls }) připojí player k elementu,
 * který obsahuje .stage se slidy (samostatný deck.html: body, MCP App: kontejner v chatu).
 * Vrací { destroy } pro odpojení před novým vykreslením.
 */
/* exported mountInstaDeck */
function mountInstaDeck(opts) {
  "use strict";

  var root = opts.root;
  var cfg = opts.config;
  var stage = root.querySelector(".stage");
  var slides = Array.prototype.slice.call(root.querySelectorAll(".slide"));
  var hudCount = root.querySelector(".hud-count");
  var hudNotes = root.querySelector(".hud-notes");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cleanups = [];
  var timers = [];
  function on(target, type, fn) {
    target.addEventListener(type, fn);
    cleanups.push(function () {
      target.removeEventListener(type, fn);
    });
  }
  function later(fn, ms) {
    timers.push(setTimeout(fn, ms));
  }
  var index = 0;
  var step = 0;
  var counters = [];

  // --- Pomocné ---

  function all(root, sel) {
    return Array.prototype.slice.call(root.querySelectorAll(sel));
  }
  function stepOf(el) {
    return Number(el.getAttribute("data-step") || 0);
  }
  function maxStep(slide) {
    return all(slide, "[data-step]").reduce(function (m, el) {
      return Math.max(m, stepOf(el));
    }, 0);
  }
  function anim(el, keyframes, opts) {
    if (reduce) return null;
    return el.animate(keyframes, Object.assign({ fill: "backwards" }, opts));
  }
  function format(value, decimals) {
    return new Intl.NumberFormat(cfg.locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  }
  function easeOutExpo(t) {
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  /** Dokončí rozběhnuté animace (rychlé klikání nesmí nechat slide v mezistavu). */
  function settle() {
    root.getAnimations({ subtree: true }).forEach(function (a) {
      a.finish();
    });
    counters.forEach(function (c) {
      c.finish();
    });
    counters = [];
    slides.forEach(function (s) {
      s.classList.remove("is-leaving", "is-over");
    });
  }

  // --- Stav slidu ---

  /** Skryje elementy s krokem vyšším než `upTo`. upTo = -1 skryje i obsah vstupu slidu. */
  function setState(slide, upTo) {
    all(slide, "[data-step]").forEach(function (el) {
      el.classList.toggle("pending", stepOf(el) > upTo);
    });
    entranceUnits(slide).forEach(function (el) {
      el.classList.toggle("pending", upTo < 0);
    });
  }

  /** Bloky, které vstupují se slidem (krok 0), v pořadí čtení. */
  function entranceUnits(slide) {
    return all(slide, ".zone > .block, .bleed > .block").filter(function (el) {
      return !el.hasAttribute("data-step");
    });
  }

  // --- Hero pohyby ---

  function visible(el, root) {
    for (var n = el; n && n !== root.parentNode; n = n.parentNode) {
      if (n.classList && n.classList.contains("pending")) return false;
    }
    return true;
  }

  function runHero(revealed, delay) {
    var root = revealed.closest("[data-hero]") || revealed.querySelector("[data-hero]");
    if (!root || reduce) return;
    var kind = root.getAttribute("data-hero");
    var h = cfg.heroes[kind];
    var parts = all(revealed, "[data-part]").filter(function (p) {
      return visible(p, revealed) && root.contains(p);
    });
    if (revealed.hasAttribute("data-part")) parts.unshift(revealed);

    parts.forEach(function (p, i) {
      var part = p.getAttribute("data-part");
      if (part === "count") countUp(p, delay, h);
      else if (part === "bar") {
        var horizontal = !!p.closest(".chart-bar");
        anim(p, [{ transform: horizontal ? "scaleX(0)" : "scaleY(0)" }, { transform: "none" }], { duration: h.duration, delay: delay + i * 70, easing: h.easing });
      } else if (part === "line") {
        anim(p, [{ strokeDasharray: "1 1", strokeDashoffset: 1 }, { strokeDasharray: "1 1", strokeDashoffset: 0 }], { duration: h.duration, delay: delay, easing: h.easing });
      } else if (part === "dot") {
        var at = parseFloat(p.style.left) / 100;
        anim(p, [{ opacity: 0, transform: "scale(0)" }, { opacity: 1, transform: "scale(1)" }], { duration: 360, delay: delay + at * h.duration, easing: cfg.easings["out-expo"] });
      } else if (part === "seg") {
        var len = Number(p.getAttribute("data-len"));
        var c = 2 * Math.PI * Number(p.getAttribute("r"));
        anim(p, [{ strokeDasharray: "0 " + c }, { strokeDasharray: len + " " + (c - len) }], { duration: h.duration / 2, delay: delay + i * (h.duration / 4), easing: h.easing });
      } else if (part === "axis") {
        anim(p, [{ transform: "scaleX(0)" }, { transform: "none" }], { duration: h.duration, delay: delay, easing: h.easing });
      } else if (part === "milestone" && !p.hasAttribute("data-step")) {
        anim(p, [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: 480, delay: delay + 200 + i * (h.duration / parts.length), easing: cfg.easings["out-expo"] });
      }
    });
  }

  function countUp(el, delay, h) {
    var value = Number(el.getAttribute("data-value"));
    var decimals = Number(el.getAttribute("data-decimals"));
    var start = null;
    var done = false;
    el.textContent = format(0, decimals);
    var task = {
      finish: function () {
        done = true;
        el.textContent = format(value, decimals);
      },
    };
    counters.push(task);
    function frame(t) {
      if (done) return;
      if (start === null) start = t + delay;
      var k = Math.max(0, Math.min(1, (t - start) / h.duration));
      el.textContent = format(value * easeOutExpo(k), decimals);
      if (k < 1) requestAnimationFrame(frame);
      else task.finish();
    }
    requestAnimationFrame(frame);
  }

  // --- Odkrývání ---

  /** Vstup elementu: přepis zóny (data-entrance na zóně), jinak vstup slidu. */
  function entranceOf(el, slide) {
    var owner = el.closest("[data-entrance]");
    return cfg.entrances[(owner || slide).getAttribute("data-entrance")];
  }

  function reveal(slide, elements, baseDelay, skip) {
    var base = cfg.entrances[slide.getAttribute("data-entrance")];
    elements.forEach(function (el, i) {
      el.classList.remove("pending");
      if (skip && skip.indexOf(el) >= 0) return;
      var e = entranceOf(el, slide);
      var delay = baseDelay + i * base.stagger;
      if (e.duration && e.keyframes.length) anim(el, e.keyframes.concat([{}]), { duration: e.duration, delay: delay, easing: e.easing });
      runHero(el, delay + e.duration * 0.3);
    });
  }

  function stepElements(slide, n) {
    return all(slide, '[data-step="' + n + '"]');
  }

  // --- Přechody ---

  /**
   * Sdílené prvky (data-shared se stejným klíčem na obou slidech) přeletí z původního místa a velikosti
   * na nové (FLIP). Nadpis se škáluje podle velikosti písma, protože se jeho text znovu zalomí.
   */
  function glideShared(from, to, t) {
    if (reduce) return [];
    var scale = stage.getBoundingClientRect().width / 1920;
    var moved = [];
    all(to, "[data-shared]").forEach(function (b) {
      if (b.hasAttribute("data-step")) return;
      var key = b.getAttribute("data-shared");
      var a = all(from, "[data-shared]").filter(function (x) {
        return x.getAttribute("data-shared") === key;
      })[0];
      if (!a) return;
      var ra = a.getBoundingClientRect();
      var rb = b.getBoundingClientRect();
      var sx, sy;
      if (b.classList.contains("heading")) {
        sx = sy = parseFloat(getComputedStyle(a).fontSize) / parseFloat(getComputedStyle(b).fontSize);
      } else {
        sx = rb.width ? ra.width / rb.width : 1;
        sy = rb.height ? ra.height / rb.height : 1;
      }
      var dx = (ra.left - rb.left) / scale;
      var dy = (ra.top - rb.top) / scale;
      a.animate([{ opacity: 0 }, { opacity: 0 }], { duration: t.duration });
      b.style.transformOrigin = "0 0";
      b.animate([{ transform: "translate(" + dx + "px," + dy + "px) scale(" + sx + "," + sy + ")" }, { transform: "none" }], { duration: t.duration, easing: t.easing });
      moved.push(b);
    });
    return moved;
  }

  function go(to, forward) {
    if (to < 0 || to >= slides.length || to === index) return;
    settle();
    var from = slides[index];
    var next = slides[to];
    // Zpět vždy tichým prolnutím: přechod nese směr příběhu, cesta zpět ho neopakuje.
    var t = cfg.transitions[forward ? next.getAttribute("data-transition") : "fade"];

    setState(next, forward ? -1 : maxStep(next));
    from.classList.remove("is-active");
    from.classList.add("is-leaving");
    next.classList.add("is-active");

    var moved = [];
    var animate = !reduce && t.duration > 0;
    if (animate) {
      if (t.over === "enter") next.classList.add("is-over");
      if (t.exit.length) from.animate([{}].concat(t.exit), { duration: t.duration, easing: t.easing, fill: "forwards" });
      if (t.enter.length) next.animate(t.enter.concat([{}]), { duration: t.duration, easing: t.easing, fill: "backwards" });
      if (t.shared) moved = glideShared(from, next, t);
    }
    later(function () {
      from.classList.remove("is-leaving");
      next.classList.remove("is-over");
      from.getAnimations({ subtree: false }).forEach(function (a) {
        a.cancel();
      });
    }, animate ? t.duration : 0);

    index = to;
    step = forward ? 0 : maxStep(next);
    if (forward) reveal(next, entranceUnits(next), animate ? t.duration * cfg.contentDelay : 0, moved);
    sync();
  }

  function nextStep() {
    var slide = slides[index];
    if (step < maxStep(slide)) {
      settle();
      step += 1;
      reveal(slide, stepElements(slide, step), 0);
      sync();
    } else go(index + 1, true);
  }

  function prevStep() {
    var slide = slides[index];
    if (step > 0) {
      settle();
      stepElements(slide, step).forEach(function (el) {
        el.classList.add("pending");
      });
      step -= 1;
      sync();
    } else go(index - 1, false);
  }

  // --- Okno, ovládání ---

  function fit() {
    var s = Math.min(root.clientWidth / 1920, root.clientHeight / 1080);
    stage.style.setProperty("--scale", String(s));
    if (overview) scaleSnapshots(overview);
  }

  function sync() {
    if (opts.hash) history.replaceState(null, "", "#" + (index + 1));
    hudCount.textContent = index + 1 + " / " + slides.length + (maxStep(slides[index]) ? "  ·  step " + step + "/" + maxStep(slides[index]) : "");
    hudNotes.textContent = cfg.notes[index] || "";
    counter.textContent = index + 1 + " / " + slides.length;
    renderPresenter();
  }

  // autoplayMs posouvá prezentaci sama (stánek, ukázka na webu). Zastaví ji první zásah diváka.
  var autoplayMs = opts.autoplayMs || 0;
  var autoplay = null;
  function stopAutoplay() {
    if (autoplay) clearInterval(autoplay);
    autoplay = null;
  }
  if (autoplayMs >= 1500) {
    autoplay = setInterval(function () {
      if (index === slides.length - 1 && step === maxStep(slides[index])) go(0, true);
      else nextStep();
    }, autoplayMs);
  }

  // --- Ovládání: klávesy, lišta, přehled, okno řečníka, stahování ---
  // controls: { presenter, print, html, pptx } zapíná části, které daná stránka umí (v chatu bez okna a stahování).
  // onAsk({ index, slideId, text }): v chatu tlačítko Upravit slide, text jde modelu.

  var ui = opts.controls || {};

  function fullscreen() {
    if (opts.onFullscreen) return opts.onFullscreen();
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }
  function toggleNotes() {
    root.classList.toggle("show-notes");
  }

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target && e.target.closest && e.target.closest("textarea, input")) return;
    stopAutoplay();
    var k = e.key;
    if (overview) {
      if (k === "Escape" || k === "g" || k === "G") closeOverview();
      else return;
    } else if (k === "ArrowRight" || k === "ArrowDown" || k === "PageDown" || k === " " || k === "Enter") nextStep();
    else if (k === "ArrowLeft" || k === "ArrowUp" || k === "PageUp" || k === "Backspace") prevStep();
    else if (k === "Home") go(0, false);
    else if (k === "End") go(slides.length - 1, false);
    else if (k === "f" || k === "F") fullscreen();
    else if (k === "n" || k === "N") toggleNotes();
    else if (k === "g" || k === "G") openOverview();
    else if ((k === "p" || k === "P") && ui.presenter) openPresenter();
    else return;
    e.preventDefault();
  }
  on(window, "keydown", onKey);

  var ICONS = {
    prev: '<path d="M14.5 6l-6 6 6 6"/>',
    next: '<path d="M9.5 6l6 6-6 6"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
    notes: '<path d="M5 6.5h14M5 11.5h14M5 16.5h9"/>',
    presenter: '<rect x="3" y="5" width="12.5" height="9" rx="1"/><path d="M18.5 8.5H21v9.5h-9.5v-2.5"/>',
    full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 20h14"/>',
    edit: '<path d="M4.5 19.5l1-4L15 6l3 3-9.5 9.5z"/><path d="M13 8l3 3"/>',
  };
  function control(name, label, fn) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "ctl ctl-" + name;
    b.title = label;
    b.setAttribute("aria-label", label);
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + "</svg>";
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      stopAutoplay();
      fn();
    });
    return b;
  }
  function separator() {
    var i = document.createElement("i");
    i.className = "ctl-sep";
    return i;
  }

  function fileName(ext) {
    var base = (cfg.title || "deck")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return (base || "deck") + "." + ext;
  }
  function downloadHtml() {
    // Stejný soubor, který stránka načetla: samostatný, s assety uvnitř, funguje offline.
    fetch(location.href.split("#")[0])
      .then(function (r) {
        return r.blob();
      })
      .then(function (blob) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileName("html");
        document.body.appendChild(a);
        a.click();
        a.remove();
        later(function () {
          URL.revokeObjectURL(a.href);
        }, 1000);
      });
  }
  /** PowerPoint: tento prohlížeč změří slidy v koncovém stavu (snapshotInstaDeck), server složí soubor. */
  function downloadPptx() {
    // Zalomení textu závisí na písmu: snímek až po načtení písem decku.
    document.fonts.ready.then(snapshotAndPost);
  }
  function snapshotAndPost() {
    var host = document.createElement("div");
    host.className = "snap-export";
    slides.forEach(function (s) {
      host.appendChild(snapshot(s));
    });
    root.appendChild(host);
    var measured;
    try {
      measured = window.snapshotInstaDeck(host.querySelectorAll(".slide"));
    } finally {
      host.remove();
    }
    var url = location.pathname.replace(/\/$/, "") + "/deck.pptx";
    fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ revision: cfg.revision, slides: measured }) })
      .then(function (r) {
        if (!r.ok)
          return r.json().then(function (e) {
            throw new Error(e.error || "HTTP " + r.status);
          });
        return r.blob();
      })
      .then(function (blob) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileName("pptx");
        document.body.appendChild(a);
        a.click();
        a.remove();
        later(function () {
          URL.revokeObjectURL(a.href);
        }, 1000);
      })
      .catch(function (e) {
        window.alert("The PowerPoint file could not be created: " + e.message);
      });
  }
  var downloads = [];
  if (ui.print) downloads.push({ label: "PDF", hint: "Opens the print dialog, choose Save as PDF", run: function () { window.print(); } });
  var online = /^https?:$/.test(location.protocol);
  if (ui.pptx && online && window.snapshotInstaDeck) downloads.push({ label: "PowerPoint", hint: "Editable slides, native charts and speaker notes, without animations", run: downloadPptx });
  if (ui.html && online) downloads.push({ label: "HTML", hint: "One file with animations, works offline", run: downloadHtml });

  var bar = document.createElement("nav");
  bar.className = "controls";
  bar.setAttribute("aria-label", "Presentation controls");
  var counter = document.createElement("span");
  counter.className = "ctl-count";
  bar.appendChild(control("prev", "Previous (Left arrow)", prevStep));
  bar.appendChild(counter);
  bar.appendChild(control("next", "Next (Right arrow)", nextStep));
  bar.appendChild(separator());
  bar.appendChild(control("grid", "All slides (G)", openOverview));
  bar.appendChild(control("notes", "Speaker notes (N)", toggleNotes));
  if (ui.presenter) bar.appendChild(control("presenter", "Presenter view (P)", openPresenter));
  bar.appendChild(control("full", "Full screen (F)", fullscreen));
  if (opts.onAsk) bar.appendChild(control("edit", "Change this slide", openAsk));
  if (downloads.length) {
    var menu = document.createElement("div");
    menu.className = "ctl-menu";
    downloads.forEach(function (d) {
      var item = document.createElement("button");
      item.type = "button";
      item.innerHTML = "<b></b><span></span>";
      item.firstChild.textContent = d.label;
      item.lastChild.textContent = d.hint;
      item.addEventListener("click", function (e) {
        e.stopPropagation();
        bar.classList.remove("is-open");
        d.run();
      });
      menu.appendChild(item);
    });
    bar.appendChild(control("download", "Download", function () {
      bar.classList.toggle("is-open");
    }));
    bar.appendChild(menu);
  }
  root.appendChild(bar);

  var idle;
  function showControls() {
    root.classList.remove("cursor-hidden");
    root.classList.add("show-controls");
    clearTimeout(idle);
    idle = setTimeout(function hide() {
      if (bar.matches(":hover") || bar.classList.contains("is-open")) {
        idle = setTimeout(hide, 2200);
        return;
      }
      root.classList.add("cursor-hidden");
      root.classList.remove("show-controls");
    }, 2200);
  }
  on(root, "mousemove", showControls);

  /** Slide v koncovém stavu jako statická kopie (přehled, okno řečníka). Čísla s finální hodnotou. */
  function snapshot(slide) {
    var c = slide.cloneNode(true);
    c.removeAttribute("id");
    c.classList.remove("is-active", "is-leaving", "is-over");
    c.classList.add("is-snapshot");
    all(c, ".pending").forEach(function (el) {
      el.classList.remove("pending");
    });
    all(c, "[id]").forEach(function (el) {
      el.removeAttribute("id");
    });
    all(c, '[data-part="count"]').forEach(function (el) {
      el.textContent = format(Number(el.getAttribute("data-value")), Number(el.getAttribute("data-decimals")));
    });
    return c;
  }
  /** Kontejner 16:9 se zmenšeným slidem: měřítko podle skutečné šířky. */
  function scaleSnapshots(container) {
    all(container, ".snap").forEach(function (frame) {
      frame.style.setProperty("--snap-scale", String(frame.clientWidth / 1920));
    });
  }
  function snapFrame(slide, doc) {
    var frame = (doc || document).createElement("div");
    frame.className = "snap";
    frame.appendChild(snapshot(slide));
    return frame;
  }

  // Upravit slide z chatu: krátký formulář nad lištou, text jde modelu i s tím, o který slide jde.
  var ask = null;
  function openAsk() {
    if (ask) return ask.querySelector("textarea").focus();
    ask = document.createElement("form");
    ask.className = "ask";
    ask.innerHTML = '<label></label><textarea rows="2" placeholder="e.g. Make the headline shorter, use the revenue chart instead"></textarea><div class="ask-row"><button type="button" class="ask-cancel">Cancel</button><button type="submit">Send to Claude</button></div>';
    ask.querySelector("label").textContent = "What should change on slide " + (index + 1) + "?";
    ask.addEventListener("click", function (e) {
      e.stopPropagation();
    });
    ask.querySelector(".ask-cancel").addEventListener("click", closeAsk);
    ask.querySelector("textarea").addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAsk();
      else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        ask.requestSubmit();
      }
    });
    ask.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = ask.querySelector("textarea").value.trim();
      if (!text) return;
      opts.onAsk({ index: index, slideId: slides[index].getAttribute("data-slide-id"), text: text });
      closeAsk();
    });
    root.appendChild(ask);
    ask.querySelector("textarea").focus();
  }
  function closeAsk() {
    if (!ask) return;
    ask.remove();
    ask = null;
  }

  var overview = null;
  function openOverview() {
    if (overview) return;
    overview = document.createElement("div");
    overview.className = "overview";
    overview.setAttribute("role", "dialog");
    overview.setAttribute("aria-label", "All slides");
    var grid = document.createElement("div");
    grid.className = "overview-grid";
    slides.forEach(function (s, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "thumb" + (i === index ? " is-current" : "");
      b.setAttribute("aria-label", "Slide " + (i + 1));
      b.appendChild(snapFrame(s));
      var n = document.createElement("span");
      n.className = "thumb-n";
      n.textContent = String(i + 1);
      b.appendChild(n);
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        closeOverview();
        if (i !== index) go(i, i > index);
      });
      grid.appendChild(b);
    });
    overview.appendChild(grid);
    overview.addEventListener("click", function (e) {
      e.stopPropagation();
      if (e.target === overview || e.target === grid) closeOverview();
    });
    root.appendChild(overview);
    scaleSnapshots(overview);
    var current = overview.querySelector(".is-current");
    if (current) {
      current.scrollIntoView({ block: "nearest" });
      current.focus({ preventScroll: true });
    }
  }
  function closeOverview() {
    if (!overview) return;
    overview.remove();
    overview = null;
  }

  // Okno řečníka: poznámky, aktuální a další slide, časomíra. Stejný původ, ovládá ho tato stránka.
  var presenter = null;
  var presenterTimer = null;
  var presenterStart = 0;
  function escapeHtml(t) {
    return String(t).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function openPresenter() {
    if (presenter && !presenter.closed) {
      presenter.focus();
      return;
    }
    var w = window.open("", "instadeck-presenter", "width=1200,height=760");
    if (!w) return;
    presenter = w;
    var styles = all(document, "style, link[rel=stylesheet]")
      .map(function (n) {
        return n.outerHTML;
      })
      .join("");
    w.document.open();
    w.document.write(
      '<!doctype html><html lang="' +
        escapeHtml(document.documentElement.lang) +
        '"><head><meta charset="utf-8"><title>Presenter: ' +
        escapeHtml(cfg.title || "") +
        "</title>" +
        styles +
        '</head><body class="presenter"><header class="p-top"><span class="p-count"></span><span class="p-time">0:00</span></header>' +
        '<main class="p-main"><div class="p-now"></div><aside class="p-side"><div class="p-label">Next</div><div class="p-next"></div><div class="p-label">Notes</div><div class="p-notes"></div></aside></main></body></html>',
    );
    w.document.close();
    presenterStart = Date.now();
    w.addEventListener("keydown", onKey);
    w.addEventListener("resize", function () {
      scaleSnapshots(w.document.body);
    });
    clearInterval(presenterTimer);
    presenterTimer = setInterval(function () {
      if (!presenter || presenter.closed) return clearInterval(presenterTimer);
      var sec = Math.floor((Date.now() - presenterStart) / 1000);
      presenter.document.querySelector(".p-time").textContent = Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
    }, 1000);
    renderPresenter();
  }
  function renderPresenter() {
    if (!presenter || presenter.closed) return;
    var d = presenter.document;
    var now = d.querySelector(".p-now");
    var next = d.querySelector(".p-next");
    if (!now) return;
    now.replaceChildren(d.importNode(snapFrame(slides[index]), true));
    if (index + 1 < slides.length) next.replaceChildren(d.importNode(snapFrame(slides[index + 1]), true));
    else {
      next.replaceChildren();
      next.textContent = "End of deck";
    }
    d.querySelector(".p-notes").textContent = cfg.notes[index] || "";
    d.querySelector(".p-count").textContent = "Slide " + (index + 1) + " of " + slides.length + (maxStep(slides[index]) ? ", step " + step + " of " + maxStep(slides[index]) : "");
    scaleSnapshots(d.body);
  }

  on(root, "click", function (e) {
    if (e.target.closest(".hud, .controls, .overview, .ask")) return;
    bar.classList.remove("is-open");
    stopAutoplay();
    var box = root.getBoundingClientRect();
    if (e.clientX - box.left < box.width / 3) prevStep();
    else nextStep();
  });

  var touchX = null;
  on(root, "touchstart", function (e) {
    stopAutoplay();
    showControls();
    touchX = e.touches[0].clientX;
  });
  on(root, "touchend", function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) nextStep();
    else prevStep();
  });

  on(window, "resize", fit);
  var resize = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null;
  if (resize) resize.observe(root);
  // Tisk (Uložit jako PDF): všechny slidy v koncovém stavu, rozběhnuté animace a počítadla dokončit.
  on(window, "beforeprint", settle);

  // --- Start ---

  var destroyed = false;
  fit();
  var fromHash = opts.hash ? parseInt(location.hash.slice(1), 10) : 0;
  index = fromHash >= 1 && fromHash <= slides.length ? fromHash - 1 : 0;
  slides.forEach(function (s, i) {
    setState(s, i === index ? -1 : maxStep(s));
  });
  slides[index].classList.add("is-active");
  sync();
  document.fonts.ready.then(function () {
    if (!destroyed) reveal(slides[index], entranceUnits(slides[index]), 120);
  });

  return {
    destroy: function () {
      destroyed = true;
      stopAutoplay();
      clearTimeout(idle);
      clearInterval(presenterTimer);
      if (presenter && !presenter.closed) presenter.close();
      closeOverview();
      closeAsk();
      bar.remove();
      timers.forEach(clearTimeout);
      if (resize) resize.disconnect();
      cleanups.forEach(function (fn) {
        fn();
      });
      settle();
    },
  };
}
