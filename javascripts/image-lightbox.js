(function () {
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

  function prepareImages() {
    document.querySelectorAll(".md-typeset img").forEach(function (image) {
      if (image.dataset.lightboxReady === "true") return;
      if (!image.getAttribute("src")) return;
      image.dataset.lightboxReady = "true";
      image.classList.add("image-lightbox-source");
      image.setAttribute("tabindex", "0");
      image.setAttribute("role", "button");
      image.setAttribute("title", "Clique para ampliar");

      image.addEventListener("click", function () {
        openLightbox(image);
      });

      image.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openLightbox(image);
        }
      });
    });
  }

  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(prepareImages);
  } else {
    document.addEventListener("DOMContentLoaded", prepareImages);
  }
})();
