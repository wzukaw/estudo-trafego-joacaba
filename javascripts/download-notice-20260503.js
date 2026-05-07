(function () {
  var DIRECT_DOWNLOAD_FILES = {
    "Ponto_02_contagem_12h.zip": true,
    "Ponto_08_contagem_12h.zip": true
  };

  var SITE_BASE = (function () {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i -= 1) {
      var src = scripts[i].getAttribute("src") || "";
      if (src.indexOf("download-notice-20260503.js") !== -1) {
        try {
          return new URL("../", new URL(src, window.location.href)).href;
        } catch (error) {
          break;
        }
      }
    }
    try {
      return new URL("./", window.location.href).href;
    } catch (error) {
      return "./";
    }
  })();

  function textOf(link) {
    return (link && (link.textContent || "").trim()) || "";
  }

  function isProtectedZipLink(link) {
    if (!link || !link.getAttribute) return false;
    var href = link.getAttribute("href") || "";
    return href.indexOf("assets/xlsx_protegidos/") !== -1 && /\.zip(?:$|[?#])/.test(href);
  }

  function isDownloadNoticePageLink(link) {
    if (!link || !link.getAttribute) return false;
    var href = link.getAttribute("href") || "";
    var label = textOf(link);
    if (!/\.zip$/i.test(label)) return false;
    try {
      var url = new URL(href, window.location.href);
      return url.pathname.indexOf("/downloads/") !== -1;
    } catch (error) {
      return href.indexOf("downloads/") !== -1 || href.indexOf("/downloads/") !== -1;
    }
  }

  function fileNameFromHref(href) {
    try {
      var url = new URL(href, window.location.href);
      var parts = url.pathname.split("/");
      return decodeURIComponent(parts[parts.length - 1] || href);
    } catch (error) {
      return href.split("/").pop() || href;
    }
  }

  function fileNameFromLink(link) {
    var label = textOf(link);
    if (/\.zip$/i.test(label)) return label;
    return fileNameFromHref(link.getAttribute("href") || "");
  }

  function absoluteHref(href) {
    try {
      return new URL(href, window.location.href).href;
    } catch (error) {
      return href;
    }
  }

  function directZipHref(fileName) {
    try {
      return new URL("assets/xlsx_protegidos/" + encodeURIComponent(fileName), SITE_BASE).href;
    } catch (error) {
      return "../assets/xlsx_protegidos/" + fileName;
    }
  }

  function forceDownload(fileName) {
    var anchor = document.createElement("a");
    anchor.href = directZipHref(fileName);
    anchor.download = fileName;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    window.setTimeout(function () {
      if (anchor.parentNode) anchor.parentNode.removeChild(anchor);
    }, 0);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function ensureModal() {
    var existing = document.querySelector(".download-notice");
    if (existing) return existing;

    var modal = document.createElement("div");
    modal.className = "download-notice";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = [
      '<div class="download-notice__panel" role="dialog" aria-modal="true" aria-labelledby="download-notice-title">',
      '  <button class="download-notice__close" type="button" aria-label="Fechar aviso">\u00d7</button>',
      '  <h2 id="download-notice-title">Aviso sobre o arquivo</h2>',
      '  <p class="download-notice__file"></p>',
      '  <div class="download-notice__body"></div>',
      '  <p class="download-notice__url"></p>',
      '  <div class="download-notice__actions">',
      '    <button class="download-notice__cancel" type="button">Fechar</button>',
      '    <a class="download-notice__download md-button md-button--primary" href="#">Baixar arquivo</a>',
      '  </div>',
      '</div>'
    ].join("");

    document.body.appendChild(modal);

    modal.addEventListener("click", function (event) {
      if (
        event.target === modal ||
        event.target.classList.contains("download-notice__close") ||
        event.target.classList.contains("download-notice__cancel")
      ) {
        closeModal();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeModal();
    });

    return modal;
  }

  function closeModal() {
    var modal = document.querySelector(".download-notice");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("download-notice-open");
  }

  function setBody(modal, canDownload) {
    var body = modal.querySelector(".download-notice__body");
    if (canDownload) {
      body.innerHTML = [
        "<p>Este arquivo corresponde a uma das contagens de fluxo dos Pontos 02 e 08, disponibilizadas para download direto neste naveg\u00e1vel por se tratarem de bases da Prefeitura de Joa\u00e7aba associadas a contrato com a empresa contratada.</p>",
        "<p>O arquivo ZIP \u00e9 disponibilizado sem senha para confer\u00eancia vinculada ao estudo.</p>"
      ].join("");
    } else {
      body.innerHTML = [
        "<p>Este arquivo t\u00e9cnico auxiliar integra as bases de contagem e/ou c\u00e1lculo utilizadas na elabora\u00e7\u00e3o do estudo e permanece de propriedade da <strong>Arco Design</strong>.</p>",
        "<p>Os arquivos de contagem e c\u00e1lculos foram cedidos \u00e0 Prefeitura de Joa\u00e7aba exclusivamente para o desenvolvimento e confer\u00eancia deste trabalho, sem que isso implique cess\u00e3o p\u00fablica de direitos de uso da base de dados, transfer\u00eancia de titularidade, autoriza\u00e7\u00e3o de publica\u00e7\u00e3o, redistribui\u00e7\u00e3o, reprodu\u00e7\u00e3o ou disponibiliza\u00e7\u00e3o independente desses arquivos auxiliares.</p>",
        "<p>Caso haja interesse em obter acesso a este arquivo, a solicita\u00e7\u00e3o dever\u00e1 ser formalizada diretamente \u00e0 Arco Design pelo e-mail <a href=\"mailto:arco.wwz@gmail.com\">arco.wwz@gmail.com</a>, podendo haver custo para disponibiliza\u00e7\u00e3o, conforme avalia\u00e7\u00e3o da empresa.</p>"
      ].join("");
    }
  }

  function openModalForFile(fileName, href, canDownload) {
    var modal = ensureModal();
    var safeName = escapeHtml(fileName);
    var fullHref = canDownload ? directZipHref(fileName) : absoluteHref(href || "");

    modal.querySelector(".download-notice__file").innerHTML =
      "<strong>Arquivo solicitado:</strong> <code>" + safeName + "</code>";
    setBody(modal, canDownload);

    if (canDownload) {
      modal.querySelector(".download-notice__url").innerHTML =
        "<strong>Link do arquivo:</strong> <code>" + escapeHtml(fullHref) + "</code>";
      modal.querySelector(".download-notice__download").setAttribute("href", fullHref);
      modal.querySelector(".download-notice__download").style.display = "inline-flex";
    } else {
      modal.querySelector(".download-notice__url").innerHTML =
        "<strong>Arquivo pretendido:</strong> <code>" + safeName + "</code>";
      modal.querySelector(".download-notice__download").removeAttribute("href");
      modal.querySelector(".download-notice__download").style.display = "none";
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("download-notice-open");
    modal.querySelector(".download-notice__cancel").focus();
  }

  function openModal(link) {
    var fileName = fileNameFromLink(link);
    var href = link.getAttribute("href") || "";
    openModalForFile(fileName, href, !!DIRECT_DOWNLOAD_FILES[fileName]);
  }

  function handleClick(event) {
    var link = event.target && event.target.closest ? event.target.closest("a") : null;
    var isDirectZip = isProtectedZipLink(link);
    var isNoticePage = isDownloadNoticePageLink(link);
    if (!isDirectZip && !isNoticePage) return;
    if (link.classList.contains("download-notice__download")) return;

    var fileName = fileNameFromLink(link);
    if (DIRECT_DOWNLOAD_FILES[fileName]) {
      event.preventDefault();
      event.stopPropagation();
      forceDownload(fileName);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    openModal(link);
  }

  if (document.documentElement.dataset.downloadNoticeReady !== "true") {
    document.documentElement.dataset.downloadNoticeReady = "true";
    document.addEventListener("click", handleClick, true);
  }
})();
