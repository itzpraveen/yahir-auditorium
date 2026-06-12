/* Yahir Auditorium — hero effects: WebGL water ripples, gold dust, magnetic buttons */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return;

  var hero = document.getElementById("hero");
  if (!hero) return;

  var heroVisible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
    }, { threshold: 0 }).observe(hero);
  }

  function running() {
    return heroVisible && !document.hidden;
  }

  /* ====================================================================
     1. Water ripple — WebGL shader over the hero image
     ==================================================================== */
  (function initRipple() {
    var canvas = document.getElementById("rippleCanvas");
    if (!canvas) return;
    var gl = canvas.getContext("webgl", { alpha: false, antialias: false })
          || canvas.getContext("experimental-webgl", { alpha: false, antialias: false });
    if (!gl) return; // keep the static CSS background as fallback

    var MAX_RIPPLES = 24;

    var vertSrc =
      "attribute vec2 a_pos;" +
      "void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }";

    var fragSrc =
      "precision mediump float;" +
      "uniform sampler2D u_tex;" +
      "uniform vec2 u_res;" +
      "uniform vec2 u_texRes;" +
      "uniform float u_zoom;" +
      "uniform vec4 u_ripples[" + MAX_RIPPLES + "];" + // x, y, age, amplitude
      "void main(){" +
      "  vec2 uv = gl_FragCoord.xy / u_res;" +
      "  uv.y = 1.0 - uv.y;" +
      "  float ca = u_res.x / u_res.y;" +
      "  float ta = u_texRes.x / u_texRes.y;" +
      "  vec2 disp = vec2(0.0);" +
      "  float light = 0.0;" +
      "  for (int i = 0; i < " + MAX_RIPPLES + "; i++) {" +
      "    float age = u_ripples[i].z;" +
      "    float amp = u_ripples[i].w;" +
      "    if (amp < 0.001) continue;" +
      "    vec2 d = uv - u_ripples[i].xy;" +
      "    d.x *= ca;" +
      "    float dist = length(d) + 1e-5;" +
      "    float radius = age * 0.23;" +
      "    float ring = exp(-pow((dist - radius) / 0.05, 2.0));" +
      "    float fade = exp(-age * 2.1) * amp;" +
      "    float wave = sin((dist - radius) * 44.0) * ring * fade;" +
      "    disp += (d / dist) * wave * 0.016;" +
      "    light += wave;" +
      "  }" +
      "  vec2 cuv = uv + disp;" +
      "  vec2 t = cuv - 0.5;" +
      "  if (ca > ta) { t.y *= ta / ca; } else { t.x *= ca / ta; }" +
      "  t /= u_zoom;" +
      "  vec2 tuv = t + vec2(0.5, 0.42);" +
      "  vec4 col = texture2D(u_tex, clamp(tuv, 0.0, 1.0));" +
      "  col.rgb *= 0.96;" + // match the slight desaturation of the CSS version
      "  col.rgb += light * vec3(1.0, 0.85, 0.55) * 0.22;" + // warm glint on the crest
      "  gl_FragColor = col;" +
      "}";

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      return s;
    }

    var vs = compile(gl.VERTEX_SHADER, vertSrc);
    var fs = compile(gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) return;

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    var quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(prog, "u_res");
    var uTexRes = gl.getUniformLocation(prog, "u_texRes");
    var uZoom = gl.getUniformLocation(prog, "u_zoom");
    var uRipples = gl.getUniformLocation(prog, "u_ripples[0]");

    var ripples = [];
    var rippleIndex = 0;
    var rippleData = new Float32Array(MAX_RIPPLES * 4);

    function addRipple(clientX, clientY, amp) {
      var rect = canvas.getBoundingClientRect();
      ripples[rippleIndex % MAX_RIPPLES] = {
        x: (clientX - rect.left) / rect.width,
        y: (clientY - rect.top) / rect.height,
        start: performance.now(),
        amp: amp
      };
      rippleIndex++;
    }

    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    function resize() {
      var w = Math.round(canvas.clientWidth * dpr);
      var h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    var img = new Image();
    img.onload = function () {
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.uniform2f(uTexRes, img.width, img.height);

      canvas.classList.add("is-active");
      var startTime = performance.now();
      var lastAmbient = startTime;
      var nextAmbientGap = 1600;

      function frame(now) {
        requestAnimationFrame(frame);
        if (!running()) return;
        resize();

        // ambient "raindrop" so the hero feels alive without interaction
        if (now - lastAmbient > nextAmbientGap) {
          lastAmbient = now;
          nextAmbientGap = 2000 + Math.random() * 2200;
          var rect = canvas.getBoundingClientRect();
          addRipple(
            rect.left + rect.width * (0.1 + Math.random() * 0.8),
            rect.top + rect.height * (0.15 + Math.random() * 0.7),
            0.45 + Math.random() * 0.3
          );
        }

        for (var i = 0; i < MAX_RIPPLES; i++) {
          var r = ripples[i];
          var o = i * 4;
          if (r) {
            var age = (now - r.start) / 1000;
            rippleData[o] = r.x;
            rippleData[o + 1] = r.y;
            rippleData[o + 2] = age;
            rippleData[o + 3] = age > 4 ? 0 : r.amp;
          } else {
            rippleData[o + 3] = 0;
          }
        }

        var elapsed = (now - startTime) / 1000;
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uZoom, 1 + 0.1 * Math.exp(-elapsed * 0.35)); // settle-in zoom
        gl.uniform4fv(uRipples, rippleData);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      requestAnimationFrame(frame);
    };
    img.src = "assets/img/pf_12.jpg";

    // pointer interaction: trail while moving, splash on press
    var lastMove = 0;
    hero.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      var now = performance.now();
      if (now - lastMove < 90) return;
      lastMove = now;
      addRipple(e.clientX, e.clientY, 0.3);
    }, { passive: true });

    hero.addEventListener("pointerdown", function (e) {
      addRipple(e.clientX, e.clientY, 1.0);
    }, { passive: true });
  })();

  /* ====================================================================
     2. Gold dust — drifting particles above the veil
     ==================================================================== */
  (function initParticles() {
    var canvas = document.getElementById("particleCanvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var particles = [];

    function resize() {
      var w = Math.round(canvas.clientWidth * dpr);
      var h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    function spawn(randomY) {
      return {
        x: Math.random() * canvas.width,
        y: randomY ? Math.random() * canvas.height : canvas.height + 10 * dpr,
        r: (0.6 + Math.random() * 1.4) * dpr,
        speed: (9 + Math.random() * 14) * dpr / 60,
        drift: 0.4 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.12 + Math.random() * 0.4
      };
    }

    resize();
    var count = Math.max(24, Math.min(70, Math.round(canvas.clientWidth / 22)));
    for (var i = 0; i < count; i++) particles.push(spawn(true));

    var t = 0;
    function frame() {
      requestAnimationFrame(frame);
      if (!running()) return;
      resize();
      t += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#eec46a";
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.y -= p.speed;
        p.x += Math.sin(t * p.drift + p.phase) * 0.18 * dpr;
        if (p.y < -12 * dpr) particles[i] = p = spawn(false);
        var twinkle = 0.65 + 0.35 * Math.sin(t * 2.2 + p.phase * 3.0);
        ctx.globalAlpha = p.alpha * twinkle;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(frame);
  })();

  /* ====================================================================
     3. Magnetic buttons — gentle pull toward the cursor
     ==================================================================== */
  (function initMagnetic() {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    var els = document.querySelectorAll(".hero-actions .btn, .header-cta, .cta-actions .btn");
    els.forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var rect = el.getBoundingClientRect();
        var dx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
        var dy = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
        el.style.transform = "translate(" + (dx * 7).toFixed(1) + "px, " + (dy * 5).toFixed(1) + "px)";
      });
      el.addEventListener("mouseleave", function () {
        el.style.transform = "";
      });
    });
  })();
})();
