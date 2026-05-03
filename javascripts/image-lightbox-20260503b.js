(function () {
  var touchStart = null;
  var touchMoved = false;
  var maxTapMove = 12;
  var maxTapTime = 650;

  function ensureLightbox() {
    var existing = document.querySelector(".image-lightbox");
    if (existing) return existing;

    var lightbox = document.createElement("div");
    lightbox.className = "image-lightbox";
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.innerHTML = [
      '<button class="image-lightbox__close" type="button" aria-label="Fechar imagem ampliada">×</button>',
      '<img class="image-lightbox__image" alt="">',
      '<div class="image-lightbox__caption"></div>'
    ].join("");

    document.body.appendChild(lightbox);

    lightbox.addEventListener("click", function (event) {
      if (
        event.target === lightbox ||
        event.target.classList.contains("image-lightbox__close") ||
        event.target.classList.contains("image-lightbox__image")
      ) {
        closeLightbox();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeLightbox();
    });

    return lightbox;
  }

  function closeLightbox() {
    var lightbox = document.querySelector(".image-lightbox");
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("image-lightbox-open");
  }

  function captionFor(image) {
    var next = image.nextElementSibling;
    if (next && next.classList.contains("legenda")) return next.textContent.trim();
    return image.getAttribute("alt") || "";
  }

  function openLightbox(image) {
    var lightbox = ensureLightbox();
    var lightboxImage = lightbox.querySelector(".image-lightbox__image");
    var caption = lightbox.querySelector(".image-lightbox__caption");
    var src = image.currentSrc || image.src;

    lightboxImage.src = src;
    lightboxImage.alt = image.alt || "";
    caption.textContent = captionFor(image);
    caption.hidden = !caption.textContent;

    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("image-lightbox-open");
  }

  function eventImage(event) {
    var image = imageFromEventTarget(event.target) || imageFromZoomLink(event.target);
    if (!image || !image.getAttribute("src")) return null;
    return image;
  }

  function handleOpenEvent(event) {
    var image = eventImage(event);
    if (!image) return;
    event.preventDefault();
    event.stopPropagation();
    openLightbox(image);
  }

  function rememberTouchStart(event) {
    if (!event.touches || event.touches.length !== 1) {
      touchStart = null;
      touchMoved = true;
      return;
    }

    var touch = event.touches[0];
    touchStart = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    touchMoved = false;
  }

  function rememberTouchMove(event) {
    if (!touchStart || !event.touches || event.touches.length !== 1) {
      touchMoved = true;
      return;
    }

    var touch = event.touches[0];
    if (
      Math.abs(touch.clientX - touchStart.x) > maxTapMove ||
      Math.abs(touch.clientY - touchStart.y) > maxTapMove
    ) {
      touchMoved = true;
    }
  }

  function handleTouchEnd(event) {
    if (!touchStart || touchMoved || Date.now() - touchStart.time > maxTapTime) {
      touchStart = null;
      return;
    }
    touchStart = null;
    handleOpenEvent(event);
  }

  function handlePointerUp(event) {
    if (event.pointerType === "touch") return;
    handleOpenEvent(event);
  }

  function imageFromEventTarget(target) {
    if (!target) return null;
    if (target.matches && target.matches(".md-typeset img")) return target;
    if (target.closest) return target.closest(".md-typeset img");
    return null;
  }

  function imageFromZoomLink(target) {
    if (!target || !target.closest) return null;
    var link = target.closest(".md-typeset a.image-zoom-link");
    return link ? link.querySelector("img") : null;
  }

  function enableDelegatedEvents() {
    if (document.documentElement.dataset.lightboxDelegated === "true") return;
    document.documentElement.dataset.lightboxDelegated = "true";

    document.addEventListener("click", handleOpenEvent, true);
    document.addEventListener("pointerup", handlePointerUp, true);
    document.addEventListener("touchstart", rememberTouchStart, { capture: true, passive: true });
    document.addEventListener("touchmove", rememberTouchMove, { capture: true, passive: true });
    document.addEventListener("touchend", handleTouchEnd, { capture: true, passive: false });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      handleOpenEvent(event);
    });
  }

  function prepareImages() {
    document.querySelectorAll(".md-typeset img").forEach(function (image) {
      if (image.dataset.lightboxReady === "true") return;
      if (!image.getAttribute("src")) return;
      image.dataset.lightboxReady = "true";
      image.classList.add("image-lightbox-source");
      image.setAttribute("tabindex", "0");
      image.setAttribute("role", "button");
      image.setAttribute("title", "Clique para ampliar");

    });
  }

  enableDelegatedEvents();

  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(prepareImages);
  } else {
    document.addEventListener("DOMContentLoaded", prepareImages);
  }
})();
