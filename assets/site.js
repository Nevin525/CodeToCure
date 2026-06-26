(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* nav scroll state */
  var nav = document.getElementById("nav");
  function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 24); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* mobile menu */
  var burger = document.getElementById("burger");
  var overlay = document.getElementById("overlay");
  function toggle(open) {
    overlay.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  }
  burger.addEventListener("click", function () { toggle(!overlay.classList.contains("open")); });
  overlay.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { toggle(false); }); });

  /* reveal on scroll */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal").forEach(function (el) {
    if (reduce) { el.classList.add("in"); } else { io.observe(el); }
  });

  /* ---- signature gene strip: two straight strands with the variant base pair ---- */
  var BASES = ["A", "T", "C", "G"];
  var COMP = { A: "T", T: "A", C: "G", G: "C" };
  function randBase() { return BASES[Math.floor(Math.random() * 4)]; }
  var strip = document.getElementById("strip");
  var callout = document.getElementById("callout");

  // fixed signature sequence (the variant base pair sits at the center)
  var TOP_SEQ = ["A", "T", "A", "G", "T", "G", "C", "A", "T", "G", "C", "A", "G", "A", "C", "A", "T", "T", "G", "A", "C", "T", "G", "A", "C"];
  var BOT_SEQ = ["T", "A", "T", "C", "A", "C", "G", "T", "A", "C", "G", "T", "C", "T", "G", "T", "A", "A", "C", "T", "G", "A", "C", "T", "G"];

  var SEQ_MID = Math.floor(BOT_SEQ.length / 2); // index of the variant pair in the full sequence

  function buildStrip() {
    strip.innerHTML = "";
    var w = window.innerWidth;
    // how many pairs to show on each side of the variant (fits the viewport)
    var half = w < 480 ? 6 : (w < 760 ? 9 : SEQ_MID);
    if (half > SEQ_MID) half = SEQ_MID;
    var start = SEQ_MID - half;
    var count = half * 2 + 1;
    var center = half;
    var cols = [];
    for (var k = 0; k < count; k++) {
      var i = start + k;
      var top = document.createElement("span");
      var rung = document.createElement("span");
      var bot = document.createElement("span");
      top.className = "b top"; rung.className = "rung"; bot.className = "b bottom";
      if (k === center) {
        bot.textContent = BOT_SEQ[i]; bot.classList.add("mut"); bot.id = "mutBase";
        top.textContent = TOP_SEQ[i]; top.classList.add("mut"); top.id = "mutTop";
        rung.classList.add("mut");
      } else {
        bot.textContent = BOT_SEQ[i];
        top.textContent = TOP_SEQ[i];
      }
      strip.appendChild(top); strip.appendChild(rung); strip.appendChild(bot);
      cols.push({ top: top, bot: bot });
    }
    return { cols: cols, center: center };
  }

  function litCol(c) {
    if (c.top && !c.top.classList.contains("mut")) c.top.classList.add("lit");
    if (c.bot && !c.bot.classList.contains("mut")) c.bot.classList.add("lit");
  }

  function animateStrip(data) {
    var cols = data.cols, center = data.center;
    if (reduce) { cols.forEach(litCol); callout.classList.add("show"); return; }
    var order = [];
    for (var d = 1; d <= center; d++) { order.push(center - d); order.push(center + d); }
    order.forEach(function (idx, nn) {
      setTimeout(function () { if (cols[idx]) litCol(cols[idx]); }, 200 + nn * 55);
    });
    var doneAt = 200 + order.length * 55;
    var mb = document.getElementById("mutBase"), mt = document.getElementById("mutTop");
    var shuffle = setInterval(function () { var r = randBase(); mb.textContent = r; mt.textContent = COMP[r]; }, 70);
    setTimeout(function () {
      clearInterval(shuffle);
      mb.textContent = "C"; mt.textContent = "G";
      mb.classList.add("locked", "burst");
      callout.classList.add("show");
      setTimeout(function () { mb.classList.remove("burst"); }, 650);
    }, doneAt + 300);
  }

  if (strip) {
    var data = buildStrip();
    var played = false;
    function cleanup() { window.removeEventListener("scroll", onScrollCheck); if (sio) sio.disconnect(); }
    function play() { if (played) return; played = true; animateStrip(data); cleanup(); }
    function inView() { var r = strip.getBoundingClientRect(); var vh = window.innerHeight || 800; return r.top < vh * 0.9 && r.bottom > 0; }
    function onScrollCheck() { if (!played && inView()) play(); }
    // IntersectionObserver can miss a very fast scroll, so back it with a scroll check
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) play(); });
    }, { threshold: 0.2, rootMargin: "0px 0px -10% 0px" });
    sio.observe(strip);
    window.addEventListener("scroll", onScrollCheck, { passive: true });
    onScrollCheck(); // already in view on load (deep link / short viewport)
    var rt;
    window.addEventListener("resize", function () {
      if (played) return;
      clearTimeout(rt);
      rt = setTimeout(function () { data = buildStrip(); }, 200);
    });
  }

  /* ---- EEG trace ----
     Honest, simplified illustration:
       - a low-amplitude NORMAL background rhythm,
       - interrupted by a high-amplitude rhythmic SEIZURE BURST (the ictal event),
       - then returning to baseline,
       - plus a dashed line over the burst showing the calmer rhythm gene-targeted
         therapy AIMS to preserve (labelled as a goal, not a claim). */
  var eeg = document.getElementById("eeg");
  if (eeg) {
    var W = 520, H = 160, mid = H / 2, bStart = 200, bEnd = 340;
    // low-amplitude background rhythm (mixed slow + faster components)
    function calm(x) { return mid + Math.sin(x / 8) * 4 + Math.sin(x / 19) * 6; }
    // high-amplitude rhythmic ictal discharge; envelope rises and falls so it
    // joins the baseline smoothly at both ends (no false discontinuity)
    function burst(x) {
      var t = (x - bStart) / (bEnd - bStart);          // 0..1 across the burst
      var env = Math.sin(t * Math.PI);                 // 0 at edges, 1 in middle
      var sharp = Math.sin(x / 3) + 0.5 * Math.sin(x / 1.3); // spiky waveform
      return mid + sharp * 38 * env;
    }
    // the rhythm therapy aims to preserve: the SAME calm baseline carried across
    // the burst window, so it meets the normal rhythm seamlessly at both ends
    function goal(x) { return calm(x); }
    function seg(fn, x0, x1) {
      var d = "", x;
      for (x = x0; x <= x1; x += 2) d += (x === x0 ? "M" : "L") + x + " " + fn(x).toFixed(1) + " ";
      return d;
    }
    var nav1 = seg(calm, 0, bStart), bzn = seg(burst, bStart, bEnd), nav2 = seg(calm, bEnd, W), gl = seg(goal, bStart, bEnd);
    eeg.innerHTML =
      '<rect x="' + bStart + '" y="12" width="' + (bEnd - bStart) + '" height="' + (H - 24) + '" fill="#efeafa" rx="8"/>' +
      '<path class="draw d1" pathLength="100" d="' + nav1 + '" fill="none" stroke="#b7a9dd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path class="draw d2" pathLength="100" d="' + bzn + '" fill="none" stroke="#562b97" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path class="draw d3" pathLength="100" d="' + nav2 + '" fill="none" stroke="#b7a9dd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path class="treat" d="' + gl + '" fill="none" stroke="#0095a9" stroke-width="2" stroke-dasharray="5 6" stroke-linecap="round" stroke-linejoin="round"/>';
    // play the draw animation when it scrolls into view
    if (reduce) { eeg.classList.add("go"); }
    else {
      var eio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { eeg.classList.add("go"); eio.disconnect(); } });
      }, { threshold: 0.4 });
      eio.observe(eeg);
    }
  }

  /* ---- signup (presentational) ---- */
  var form = document.getElementById("subscribe");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("email");
      if (!email.value || email.value.indexOf("@") < 1) { email.focus(); return; }
      document.getElementById("ok").classList.add("show");
      form.querySelector(".field").style.display = "none";
      form.querySelector(".formnote").style.display = "none";
    });
  }

  /* ---- accessibility widget ---- */
  var root = document.documentElement;
  var KEY = "c2c_a11y_v1";
  var toggles = { line: "a11y-line", letter: "a11y-letter", links: "a11y-links", contrast: "a11y-contrast", noanim: "a11y-noanim", dyslexia: "a11y-dyslexia", cursor: "a11y-cursor" };
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { state = {}; }
  var fab = document.getElementById("a11yFab");
  var panel = document.getElementById("a11yPanel");
  if (fab && panel) {
    var save = function () { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };
    var dysLoaded = false;
    var loadDys = function () { if (dysLoaded) return; dysLoaded = true; var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap"; document.head.appendChild(l); };
    var applyText = function (n) { root.classList.remove("a11y-text1", "a11y-text2"); if (n === 1) root.classList.add("a11y-text1"); else if (n === 2) root.classList.add("a11y-text2"); };
    var updateUI = function () {
      panel.querySelectorAll("[data-opt]").forEach(function (b) {
        var k = b.getAttribute("data-opt"), on = k === "text" ? (state.text || 0) > 0 : !!state[k];
        b.setAttribute("aria-pressed", on ? "true" : "false");
        var s = b.querySelector(".state");
        if (s) s.textContent = k === "text" ? ["Off", "Large", "Larger"][state.text || 0] : (on ? "On" : "Off");
      });
    };
    var apply = function () {
      Object.keys(toggles).forEach(function (k) { root.classList.toggle(toggles[k], !!state[k]); });
      applyText(state.text || 0);
      if (state.dyslexia) loadDys();
      updateUI();
    };
    panel.addEventListener("click", function (e) {
      var b = e.target.closest("[data-opt]"); if (!b) return;
      var k = b.getAttribute("data-opt");
      if (k === "text") { state.text = ((state.text || 0) + 1) % 3; applyText(state.text); }
      else { state[k] = !state[k]; root.classList.toggle(toggles[k], !!state[k]); if (k === "dyslexia" && state[k]) loadDys(); }
      save(); updateUI();
    });
    document.getElementById("a11yReset").addEventListener("click", function () {
      state = {}; Object.keys(toggles).forEach(function (k) { root.classList.remove(toggles[k]); }); applyText(0); save(); updateUI();
    });
    var openPanel = function (o) { panel.classList.toggle("open", o); fab.setAttribute("aria-expanded", o ? "true" : "false"); };
    fab.addEventListener("click", function () { openPanel(!panel.classList.contains("open")); });
    document.getElementById("a11yClose").addEventListener("click", function () { openPanel(false); fab.focus(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && panel.classList.contains("open")) { openPanel(false); fab.focus(); } });
    document.addEventListener("click", function (e) { if (panel.classList.contains("open") && !panel.contains(e.target) && !fab.contains(e.target)) openPanel(false); });
    apply();
  }
})();
