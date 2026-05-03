(function () {
  function isProtectedZipLink(link) {
    if (!link || !link.getAttribute) return false;
    var href = link.getAttribute("href") || "";
    return href.indexOf("assets/xlsx_protegidos/") !== -1 && /\.zip(?:$|[?#])/.test(href);
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

  function absoluteHref(href) {
    try {
      return new URL(href, window.location.href).href;
    } catch (error) {
      return href;
    }
  }

  function ensureModal() {
    var existing = document.querySelector(".download-notice");
    if (existing) return existing;

    var modal = document.createElement("div");
    modal.className = "download-notice";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = [
      '<div class="download-notice__panel" role="dialog" aria-modal="true" aria-labelledby="download-notice-title">',
      '  <button class="download-notice__close" type="button" aria-label="Fechar aviso">×</button>',
      '  <h2 id="download-notice-title">Aviso sobre o arquivo</h2>',
      '  <p class="download-notice__file"></p>',
      '  <p>Este arquivo ZIP é protegido por senha e criptografia. O acesso ao conteúdo depende da senha informada separadamente pelo responsável pelo estudo.</p>',
      '  <p>Os únicos arquivos auxiliares disponibilizados para download direto neste navegável são as contagens de fluxo dos Pontos 02 e 08, associadas a bases da Prefeitura de Joaçaba produzidas no âmbito de contrato com a empresa 4mob.</p>',
      '  <p>Os demais arquivos técnicos auxiliares são de propriedade da Arco Design e devem ser solicitados formalmente pelo e-mail <a href="mailto:arco.wwz@gmail.com">arco.wwz@gmail.com</a>, podendo haver custo para disponibilização.</p>',
      '  <p class="download-notice__url"></p>',
      '  <div class="download-notice__actions">',
      '    <button class="download-notice__cancel" type="button">Cancelar</button>',
      '    <a class="download-notice__download md-button md-button--primary" href="#">Entendi, baixar arquivo</a>',
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

  function openModal(link) {
    var href = link.getAttribute("href");
    var fullHref = absoluteHref(href);
    var fileName = fileNameFromHref(href);
    var modal = ensureModal();

    modal.querySelector(".download-notice__file").innerHTML =
      '<strong>Arquivo solicitado:</strong> <code>' + fileName + "</code>";
    modal.querySelector(".download-notice__url").innerHTML =
      '<strong>Link do arquivo:</strong> <code>' + fullHref + "</code>";
    modal.querySelector(".download-notice__download").setAttribute("href", fullHref);

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("download-notice-open");
    modal.querySelector(".download-notice__cancel").focus();
  }

  function handleClick(event) {
    var link = event.target && event.target.closest ? event.target.closest("a") : null;
    if (!isProtectedZipLink(link)) return;
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
