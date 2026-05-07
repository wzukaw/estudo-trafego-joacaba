from __future__ import annotations

import html
import json
from pathlib import Path
from urllib.parse import quote

from openpyxl import load_workbook


REPO = Path(__file__).resolve().parents[1]

BASE_CONTRATOS = Path(
    r"M:\Drives compartilhados\Trânsito Joaçaba\DTTMU\LICITAÇÕES, COMPRAS E CONTRATO"
)
PROJETO_CENTRO = BASE_CONTRATOS / "Estudo de transito - Recalculo semafórico e alterações"
PROJETO_SANTA_TEREZA = BASE_CONTRATOS / "Estudo de transito - Bairro Santa Tereza"


def file_uri(path: Path) -> str:
    raw = str(path).replace("\\", "/")
    if raw.startswith("M:/"):
        return "file:///" + quote(raw, safe="/:")
    return path.as_uri()


def fmt_size(size: int) -> str:
    units = ["B", "KB", "MB", "GB"]
    value = float(size)
    for unit in units:
        if value < 1024 or unit == units[-1]:
            return f"{value:.1f} {unit}" if unit != "B" else f"{int(value)} B"
        value /= 1024
    return f"{size} B"


def scan_files(base: Path, *relative_roots: str) -> list[dict[str, str]]:
    files: list[dict[str, str]] = []
    for rel in relative_roots:
        root = base / rel
        if not root.exists():
            continue
        if root.is_file():
            candidates = [root]
        else:
            candidates = sorted(p for p in root.rglob("*") if p.is_file())
        for p in candidates:
            if p.name.startswith("~$") or p.suffix.lower() in {".dwl", ".dwl2", ".tmp"}:
                continue
            files.append(
                {
                    "name": p.name,
                    "path": str(p),
                    "href": file_uri(p),
                    "relative": str(p.relative_to(base)),
                    "size": fmt_size(p.stat().st_size),
                    "modified": p.stat().st_mtime,
                }
            )
    return files


def parse_counts() -> dict:
    workbook_path = PROJETO_CENTRO / "CONTAGENS_RESUMO_MOVIMENTO.xlsx"
    wb = load_workbook(workbook_path, data_only=True, read_only=True)
    ws = wb.active
    blocks: list[dict] = []
    current: dict | None = None

    for row_index, row in enumerate(ws.iter_rows(values_only=True), start=1):
        point, volume, origin, destination = row[4], row[5], row[6], row[7]
        if isinstance(point, str) and point.strip() and not isinstance(volume, (int, float)):
            if current:
                blocks.append(current)
            current = {"name": point.strip(), "startRow": row_index, "movements": []}
        elif current and isinstance(point, (int, float)) and isinstance(volume, (int, float)):
            current["movements"].append(
                {
                    "movement": int(point),
                    "volume": int(volume),
                    "origin": str(origin).strip() if origin else "",
                    "destination": str(destination).strip() if destination else "",
                }
            )

    if current:
        blocks.append(current)

    for block in blocks:
        block["total"] = sum(m["volume"] for m in block["movements"])
        block["movementCount"] = len(block["movements"])

    total = sum(b["total"] for b in blocks)
    movements = sum(b["movementCount"] for b in blocks)
    top_points = sorted(
        (
            {
                "name": b["name"],
                "total": b["total"],
                "movementCount": b["movementCount"],
            }
            for b in blocks
        ),
        key=lambda item: item["total"],
        reverse=True,
    )
    return {
        "source": str(workbook_path),
        "points": len(blocks),
        "movements": movements,
        "total": total,
        "topPoints": top_points[:10],
        "blocks": blocks,
    }


def link_rows(files: list[dict[str, str]], base: Path) -> str:
    rows = []
    for item in files:
        rows.append(
            "<tr>"
            f"<td><a href=\"{html.escape(item['href'])}\">{html.escape(item['name'])}</a></td>"
            f"<td>{html.escape(item['relative'])}</td>"
            f"<td>{html.escape(item['size'])}</td>"
            f"<td><button class=\"copy-path\" data-path=\"{html.escape(item['path'])}\">Copiar caminho</button></td>"
            "</tr>"
        )
    if not rows:
        rows.append('<tr><td colspan="4">Nenhum arquivo localizado nesta pasta.</td></tr>')
    return "\n".join(rows)


def counts_html(stats: dict) -> str:
    max_total = max(point["total"] for point in stats["topPoints"]) if stats["topPoints"] else 1
    bars = []
    for point in stats["topPoints"]:
        width = point["total"] / max_total * 100
        bars.append(
            '<div class="bar-row">'
            f'<span class="bar-label">{html.escape(point["name"])}</span>'
            '<span class="bar-track">'
            f'<span class="bar-fill" style="width:{width:.1f}%"></span>'
            "</span>"
            f'<strong>{point["total"]:,}</strong>'
            "</div>".replace(",", ".")
        )

    table_rows = []
    for block in stats["blocks"]:
        table_rows.append(
            "<tr>"
            f"<td>{html.escape(block['name'])}</td>"
            f"<td>{block['movementCount']}</td>"
            f"<td>{block['total']:,}</td>"
            "</tr>".replace(",", ".")
        )

    return f"""
    <section id="estatisticas" class="portal-section">
      <h2>Estatística especial das contagens</h2>
      <p>O quadro abaixo consolida o arquivo <strong>CONTAGENS_RESUMO_MOVIMENTO.xlsx</strong>, usando os movimentos numerados como base de soma. Essa leitura preserva o vínculo com as planilhas originais e evita incorporar os arquivos ao site, mantendo-os apenas como referência navegável.</p>
      <div class="metric-grid">
        <div class="metric"><span>Pontos ou interseções</span><strong>{stats['points']}</strong></div>
        <div class="metric"><span>Movimentos consolidados</span><strong>{stats['movements']}</strong></div>
        <div class="metric"><span>Volume total apurado</span><strong>{stats['total']:,}</strong></div>
      </div>
      <h3>Maiores volumes consolidados</h3>
      <div class="bar-list">{''.join(bars)}</div>
      <h3>Resumo por ponto</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Ponto</th><th>Movimentos</th><th>Volume</th></tr></thead>
          <tbody>{''.join(table_rows)}</tbody>
        </table>
      </div>
    </section>
    """.replace(",", ".")


def section(title: str, body: str, groups: list[tuple[str, str, list[dict[str, str]]]]) -> str:
    group_html = []
    for group_title, note, files in groups:
        group_html.append(
            f"""
            <section class="file-group">
              <h3>{html.escape(group_title)}</h3>
              <p>{html.escape(note)}</p>
              <div class="table-wrap">
                <table>
                  <thead><tr><th>Arquivo</th><th>Localização</th><th>Tamanho</th><th>Ação</th></tr></thead>
                  <tbody>{link_rows(files, PROJETO_CENTRO)}</tbody>
                </table>
              </div>
            </section>
            """
        )
    return f"""
    <section class="portal-section">
      <h2>{html.escape(title)}</h2>
      <p>{body}</p>
      {''.join(group_html)}
    </section>
    """


def build() -> None:
    stats = parse_counts()
    (REPO / "assets" / "contagens-resumo.json").write_text(
        json.dumps(stats, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    centro_groups = [
        (
            "Relatório técnico de contagem",
            "Versão R2 indicada como referência mais nova para a contagem do projeto central.",
            scan_files(PROJETO_CENTRO, r"ENTREGAS\CONTAGENS\02-Relatório\4MOB-2924-REL-JOAÇABA-R2.pdf"),
        ),
        (
            "Planilhas e PDFs de contagem",
            "Arquivos analíticos por ponto, mantidos como fonte de auditoria para os volumes e movimentos.",
            scan_files(
                PROJETO_CENTRO,
                "CONTAGENS_RESUMO_MOVIMENTO.xlsx",
                r"ENTREGAS\CONTAGENS\Contagem Volumétrica e Classificatória\02-Planilhas",
                r"ENTREGAS\CONTAGENS\Contagem Volumétrica e Classificatória\01-PDFs",
            ),
        ),
        (
            "Parametrização semafórica",
            "Material de parametrização usado para compatibilizar a operação semafórica às leituras de tráfego.",
            scan_files(PROJETO_CENTRO, r"ENTREGAS\PARAMETRIZAÇÃO SEMAFÓRICA"),
        ),
        (
            "Projetos de sinalização do centro",
            "Resultados gráficos dos estudos para a área central, incluindo pranchas em PDF e arquivos de projeto disponíveis.",
            scan_files(PROJETO_CENTRO, r"ENTREGAS\PROJETOS DE SINANILZAÇÃO CENTRO\PDF", r"ENTREGAS\PROJETOS DE SINANILZAÇÃO CENTRO\DWG"),
        ),
    ]

    santa_groups = [
        (
            "Peças de contratação e diretrizes",
            "Documentos administrativos e técnicos que delimitam o objeto, a contratação e as diretrizes do estudo.",
            scan_files(
                PROJETO_SANTA_TEREZA,
                "Diretrizes.pdf",
                "TERMO DE REFERÊNCIA.pdf",
                r"COMPRA",
                r"CONTRATO, EMPENHO E PAGAMENTO",
            ),
        ),
        (
            "Contagens de tráfego",
            "Planilhas e PDFs de contagem do estudo do Bairro Santa Tereza, mantidos como acervo de trabalho.",
            scan_files(PROJETO_SANTA_TEREZA, r"ENTREGAS\CONTAGENS"),
        ),
        (
            "Entregas técnicas e projetos",
            "Arquivos de estudo de acesso e documentos técnicos em andamento.",
            scan_files(PROJETO_SANTA_TEREZA, r"PAGAMENTO E MEDIÇÕES\Entrega estudos de acesso"),
        ),
        (
            "Aditivos, manifestações e levantamentos",
            "Registros complementares do andamento contratual, manifestações e bases topográficas ou de levantamento.",
            scan_files(PROJETO_SANTA_TEREZA, r"ADITIVOS", r"01 MP", r"LEVAMENTAMENTOS MUNICIPIO", r"Levantamento com drone - topografia prefeitura"),
        ),
    ]

    html_text = f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Portal navegável dos estudos de trânsito - Joaçaba</title>
  <link rel="icon" href="../assets/images/favicon.png">
  <link rel="stylesheet" href="../assets/stylesheets/main.484c7ddc.min.css">
  <link rel="stylesheet" href="../assets/stylesheets/palette.ab4e12ef.min.css">
  <link rel="stylesheet" href="../stylesheets/relatorio-20260503.css">
  <link rel="stylesheet" href="../stylesheets/portal-estudos.css">
</head>
<body class="portal-body">
  <header class="portal-header">
    <a href="../">Estudo de Tráfego - Joaçaba</a>
    <nav>
      <a href="#centro">Centro</a>
      <a href="#santa-tereza">Santa Tereza</a>
      <a href="#estatisticas">Contagens</a>
      <a href="#acervo">Acervo</a>
    </nav>
  </header>
  <main class="portal-main">
    <section class="portal-hero">
      <p class="eyebrow">Documento navegável</p>
      <h1>Estudos de trânsito, recálculo semafórico e acompanhamento do Bairro Santa Tereza</h1>
      <p>Este portal organiza, em uma única leitura, os materiais técnicos e administrativos dos dois estudos. A redação apresenta o contexto, o estágio de cada frente e os documentos de suporte; os arquivos permanecem preservados em seus diretórios originais e são referenciados apenas por links.</p>
      <div class="hero-actions">
        <a href="#centro">Projeto central</a>
        <a href="#santa-tereza">Bairro Santa Tereza</a>
        <a href="#estatisticas">Ver estatísticas</a>
      </div>
    </section>

    <section class="portal-section" id="contexto">
      <h2>Leitura geral</h2>
      <p>O conjunto documental reúne duas frentes complementares da política municipal de circulação. A primeira trata do recálculo semafórico, das contagens volumétricas e classificatórias e dos projetos de sinalização associados às áreas centrais de Joaçaba. A segunda registra o estudo de tráfego do Bairro Santa Tereza, ainda em andamento, com documentação de contratação, levantamentos, contagens e entregas técnicas parciais.</p>
      <p>A organização proposta separa evidências de entrada, relatórios, parametrizações e projetos resultantes. Essa estrutura facilita consulta pública, conferência interna e continuidade técnica, sem deslocar os arquivos originais do ambiente de trabalho do DTTMU.</p>
    </section>

    <div id="centro"></div>
    {section(
        "Projeto 1 - Recálculo semafórico e alterações na área central",
        "O estudo central consolida contagens, relatório técnico atualizado em R2, parametrização semafórica e projetos de sinalização. A leitura recomendada parte do relatório de contagem, passa pela página estatística e segue para a parametrização e os projetos de circulação/sinalização.",
        centro_groups,
    )}

    {counts_html(stats)}

    <div id="santa-tereza"></div>
    {section(
        "Projeto 2 - Estudo de trânsito do Bairro Santa Tereza",
        "O estudo do Bairro Santa Tereza está organizado como frente em andamento. Os arquivos demonstram a formação do processo, as diretrizes e contratações, as contagens realizadas e as entregas técnicas relacionadas aos acessos e levantamentos municipais.",
        santa_groups,
    )}

    <section class="portal-section" id="acervo">
      <h2>Critério de publicação</h2>
      <p>Os links apontam para os arquivos nas pastas de origem. Em ambiente externo ao Drive compartilhado, o caminho pode servir como referência de localização; em estações com acesso ao acervo municipal, o link local permite abrir o documento diretamente conforme as permissões do usuário.</p>
      <p>A manutenção deve preservar a lógica de fonte única: quando houver revisão de relatório, prancha ou planilha, recomenda-se atualizar o arquivo no diretório técnico e regenerar este portal, evitando anexos duplicados ou versões conflitantes.</p>
    </section>
  </main>
  <script>
    document.querySelectorAll(".copy-path").forEach((button) => {{
      button.addEventListener("click", async () => {{
        const path = button.dataset.path;
        try {{
          await navigator.clipboard.writeText(path);
          button.textContent = "Copiado";
          setTimeout(() => button.textContent = "Copiar caminho", 1400);
        }} catch (error) {{
          button.textContent = "Selecione o caminho";
        }}
      }});
    }});
  </script>
</body>
</html>
"""

    out_dir = REPO / "portal-estudos"
    out_dir.mkdir(exist_ok=True)
    (out_dir / "index.html").write_text(html_text, encoding="utf-8")


if __name__ == "__main__":
    build()
