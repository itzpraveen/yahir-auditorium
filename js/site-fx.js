/* Yahir Auditorium — site-wide water ripple layer (gold rings on click + cursor trail) */
(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var canvas = document.createElement("canvas");
  canvas.className = "ripple-layer";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  }
  resize();
  window.addEventListener("resize", resize);

  var ripples = [];
  var idle = true; // skip drawing entirely once the canvas is clear

  function spawn(clientX, clientY, big) {
    ripples.push({
      x: clientX * dpr,
      y: clientY * dpr,
      start: performance.now(),
      max: (big ? 120 : 36) * dpr,
      rings: big ? 3 : 2,
      alpha: big ? 0.55 : 0.2,
      dur: big ? 1150 : 680
    });
    idle = false;
  }

  // splash on any click / tap
  document.addEventListener("pointerdown", function (e) {
    spawn(e.clientX, e.clientY, true);
  }, { passive: true });

  // faint trail while the mouse travels
  var lastX = -999, lastY = -999;
  document.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    var dx = e.clientX - lastX;
    var dy = e.clientY - lastY;
    if (dx * dx + dy * dy < 8100) return; // every ~90px of travel
    lastX = e.clientX;
    lastY = e.clientY;
    spawn(e.clientX, e.clientY, false);
  }, { passive: true });

  function easeOutCubic(p) {
    return 1 - Math.pow(1 - p, 3);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden || idle) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";

    for (var i = ripples.length - 1; i >= 0; i--) {
      var r = ripples[i];
      var base = (now - r.start) / r.dur;
      if (base > 1 + r.rings * 0.14) {
        ripples.splice(i, 1);
        continue;
      }
      for (var ring = 0; ring < r.rings; ring++) {
        var p = base - ring * 0.14;
        if (p <= 0 || p >= 1) continue;
        var radius = r.max * easeOutCubic(p);
        var alpha = r.alpha * (1 - p) * (1 - ring * 0.28);
        ctx.beginPath();
        ctx.strokeStyle = "rgba(238, 196, 106, " + alpha.toFixed(3) + ")";
        ctx.lineWidth = Math.max(0.5, (2.2 - 1.6 * p)) * dpr;
        ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (!ripples.length) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      idle = true;
    }
  }
  requestAnimationFrame(frame);
})();
