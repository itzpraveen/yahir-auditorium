/* Yahir Auditorium — interactions */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Header: scrolled state + hide on scroll down ---------- */
  var header = document.getElementById("siteHeader");
  var lastY = window.scrollY;

  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 40);
    if (y > 600 && y > lastY + 6) {
      header.classList.add("is-hidden");
    } else if (y < lastY - 6 || y < 200) {
      header.classList.remove("is-hidden");
    }
    lastY = y;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var navToggle = document.getElementById("navToggle");
  var mobileMenu = document.getElementById("mobileMenu");

  function setMenu(open) {
    navToggle.classList.toggle("is-open", open);
    mobileMenu.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    mobileMenu.setAttribute("aria-hidden", String(!open));
    document.body.style.overflow = open ? "hidden" : "";
  }

  navToggle.addEventListener("click", function () {
    setMenu(!mobileMenu.classList.contains("is-open"));
  });

  mobileMenu.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () { setMenu(false); });
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  revealEls.forEach(function (el) {
    var delay = el.getAttribute("data-reveal-delay");
    if (delay) el.style.setProperty("--reveal-delay", delay + "ms");
  });

  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Animated counters ---------- */
  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (prefersReducedMotion) { el.textContent = target.toLocaleString("en-IN"); return; }
    var duration = 1800;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 4);
      el.textContent = Math.round(target * eased).toLocaleString("en-IN");
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { countObserver.observe(el); });
  } else {
    counters.forEach(animateCount);
  }

  /* ---------- Gallery filter ---------- */
  var filterBtns = document.querySelectorAll(".filter-btn");
  var galleryItems = Array.prototype.slice.call(document.querySelectorAll(".gallery-item"));

  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filterBtns.forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      var filter = btn.getAttribute("data-filter");

      galleryItems.forEach(function (item) {
        var show = filter === "all" || item.getAttribute("data-cat") === filter;
        if (show) {
          if (item.classList.contains("is-hidden")) {
            item.classList.remove("is-hidden");
            item.classList.add("is-entering");
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                item.classList.remove("is-entering");
              });
            });
          }
        } else {
          item.classList.add("is-hidden");
          item.classList.remove("is-entering");
        }
      });
    });
  });

  /* ---------- Lightbox ---------- */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightboxImg");
  var lightboxCaption = document.getElementById("lightboxCaption");
  var currentIndex = 0;

  function visibleItems() {
    return galleryItems.filter(function (item) {
      return !item.classList.contains("is-hidden");
    });
  }

  function openLightbox(item) {
    var items = visibleItems();
    currentIndex = items.indexOf(item);
    showLightboxItem(items, currentIndex);
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function showLightboxItem(items, index) {
    var item = items[(index + items.length) % items.length];
    currentIndex = items.indexOf(item);
    var img = item.querySelector("img");
    var caption = item.querySelector("figcaption");
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxCaption.textContent = caption ? caption.textContent : "";
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  galleryItems.forEach(function (item) {
    item.addEventListener("click", function () { openLightbox(item); });
  });

  lightbox.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
  lightbox.querySelector(".lightbox-prev").addEventListener("click", function (e) {
    e.stopPropagation();
    showLightboxItem(visibleItems(), currentIndex - 1);
  });
  lightbox.querySelector(".lightbox-next").addEventListener("click", function (e) {
    e.stopPropagation();
    showLightboxItem(visibleItems(), currentIndex + 1);
  });
  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", function (e) {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showLightboxItem(visibleItems(), currentIndex - 1);
    if (e.key === "ArrowRight") showLightboxItem(visibleItems(), currentIndex + 1);
  });

  /* ---------- Testimonial slider ---------- */
  var slider = document.getElementById("testiSlider");
  if (slider) {
    var items = slider.querySelectorAll(".testi-item");
    var dotsWrap = slider.querySelector(".testi-dots");
    var activeIndex = 0;
    var timer = null;

    items.forEach(function (_, i) {
      var dot = document.createElement("button");
      dot.className = "testi-dot" + (i === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", "Show testimonial " + (i + 1));
      dot.addEventListener("click", function () {
        goTo(i);
        restartTimer();
      });
      dotsWrap.appendChild(dot);
    });

    var dots = dotsWrap.querySelectorAll(".testi-dot");

    function goTo(i) {
      items[activeIndex].classList.remove("is-active");
      dots[activeIndex].classList.remove("is-active");
      activeIndex = (i + items.length) % items.length;
      items[activeIndex].classList.add("is-active");
      dots[activeIndex].classList.add("is-active");
    }

    function restartTimer() {
      if (prefersReducedMotion) return;
      clearInterval(timer);
      timer = setInterval(function () { goTo(activeIndex + 1); }, 5500);
    }
    restartTimer();
  }

  /* ---------- YouTube facade ---------- */
  var videoFrame = document.getElementById("videoFrame");
  if (videoFrame) {
    videoFrame.addEventListener("click", function () {
      var id = videoFrame.getAttribute("data-video-id");
      var iframe = document.createElement("iframe");
      iframe.src = "https://www.youtube.com/embed/" + id + "?autoplay=1&rel=0";
      iframe.title = "Yahir Auditorium video tour";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      videoFrame.innerHTML = "";
      videoFrame.appendChild(iframe);
      videoFrame.style.cursor = "default";
    }, { once: true });
  }

  /* ---------- Active nav link on scroll ---------- */
  var sections = document.querySelectorAll("main section[id]");
  var navLinks = document.querySelectorAll(".main-nav .nav-link");

  if ("IntersectionObserver" in window && navLinks.length) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        navLinks.forEach(function (link) {
          link.classList.toggle("is-active", link.getAttribute("href") === "#" + id);
        });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach(function (s) { sectionObserver.observe(s); });
  }
})();
