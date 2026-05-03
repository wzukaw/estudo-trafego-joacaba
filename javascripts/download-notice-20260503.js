(function () {
  var DIRECT_DOWNLOAD_FILES = {
    "Ponto_02_contagem_12h.zip": true,
    "Ponto_08_contagem_12h.zip": true
  };

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
      return new URL("../assets/xlsx_protegidos/" + encodeURIComponent(fileName), window.location.href).href;
    } catch (error) {
      return "../assets/xlsx_protegidos/" + fileName;
    }
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
        "<p>Este arquivo ZIP \u00e9 protegido por senha e criptografia. O acesso ao conte\u00fado depende da senha informada separadamente pelo respons\u00e1vel pelo estudo.</p>",
        "<p>As contagens de fluxo dos Pontos 02 e 08 s\u00e3o os \u00fanicos arquivos auxiliares disponibilizados para download direto neste naveg\u00e1vel, por se tratarem de bases da Prefeitura de Joa\u00e7aba associadas a contrato com a empresa 4mob.</p>"
      ].join("");
    } else {
      body.innerHTML = [
        "<p>Este arquivo t\u00e9cnico auxiliar foi cedido e/ou utilizado exclusivamente para o desenvolvimento deste estudo e permanece de propriedade da <strong>Arco Design</strong>.</p>",
        "<p>Esse uso n\u00e3o implica cess\u00e3o de direitos, autoriza\u00e7\u00e3o de publica\u00e7\u00e3o, redistribui\u00e7\u00e3o, reprodu\u00e7\u00e3o ou disponibiliza\u00e7\u00e3o p\u00fablica dos arquivos auxiliares.</p>",
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
    if (!isProtectedZipLink(link) && !isDownloadNoticePageLink(link)) return;
    if (link.classList.contains("download-notice__download")) return;
    event.preventDefault();
    event.stopPropagation();
    openModal(link);
  }

  if (document.documentElement.dataset.downloadNoticeReady !== "true") {
    document.documentElement.dataset.downloadNoticeReady = "true";
    document.addEventListener("click", handleClick, true);
  }
})();
