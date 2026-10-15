/* ===================================================================
   ZapPedidos — orçamento de tatuagem
   Nenhuma imagem, nenhuma biblioteca: só o SVG da página.
   A tela NUNCA rola sozinha — o manequim acompanha a rolagem e a
   pessoa vê a prévia mudar enquanto mexe nas opções.

   O corpo é desenhado como uma silhueta lisa, sem divisões à vista.
   As partes existem só aqui embaixo, como retângulos, e servem para
   saber onde a pessoa clicou, realçar a área e recortar a tatuagem,
   que por isso nunca passa da pele.
   =================================================================== */
(function () {
  "use strict";

  /* número que recebe o orçamento (numa página de cliente real, troque aqui) */
  var WHATSAPP = "5524992346329";
  var DEMO = true;                 /* prefixa a mensagem com [DEMO] */
  var ESTUDIO = "Estúdio Demo";

  /* o corpo vai de y=12 a y=338 no desenho: 326 unidades para ~1,70 m */
  var UNIDADES_POR_CM = 1.9176;

  var PARTES = {
    frente: [
      { id: "cabeca",      rotulo: "Cabeça",              texto: "na cabeça",                   x: 84, y: 12, w: 32, h: 38 },
      { id: "rosto",       rotulo: "Rosto",               texto: "no rosto",                    x: 88, y: 20, w: 24, h: 24 },
      { id: "pescoco",     rotulo: "Pescoço",             texto: "no pescoço",                  x: 93, y: 50, w: 14, h: 12 },
      { id: "ombro",       rotulo: "Ombro",               texto: "no ombro",                    x: 70, y: 62, w: 22, h: 22 },
      { id: "peito",       rotulo: "Peito",               texto: "no peito",                    x: 76, y: 84, w: 48, h: 36 },
      { id: "barriga",     rotulo: "Barriga",             texto: "na barriga",                  x: 76, y: 120, w: 48, h: 36 },
      { id: "braco",       rotulo: "Braço",               texto: "no braço",                    x: 52, y: 66, w: 16, h: 66 },
      { id: "antebraco",   rotulo: "Antebraço",           texto: "no antebraço",                x: 52, y: 132, w: 16, h: 66 },
      { id: "mao",         rotulo: "Mão",                 texto: "na mão",                      x: 50, y: 198, w: 20, h: 22 },
      { id: "coxa",        rotulo: "Coxa",                texto: "na coxa",                     x: 76, y: 190, w: 19, h: 74 },
      { id: "canela",      rotulo: "Canela",              texto: "na canela",                   x: 79, y: 264, w: 14, h: 60 },
      { id: "pe",          rotulo: "Pé",                  texto: "no pé",                       x: 68, y: 324, w: 25, h: 14 }
    ],
    costas: [
      { id: "cabeca",      rotulo: "Cabeça",              texto: "na cabeça",                   x: 84, y: 12, w: 32, h: 38 },
      { id: "nuca",        rotulo: "Nuca",                texto: "na nuca",                     x: 93, y: 50, w: 14, h: 12 },
      { id: "ombro",       rotulo: "Ombro",               texto: "no ombro",                    x: 108, y: 62, w: 22, h: 22 },
      { id: "costas",      rotulo: "Costas",              texto: "nas costas",                  x: 76, y: 84, w: 48, h: 36 },
      { id: "lombar",      rotulo: "Lombar",              texto: "na lombar",                   x: 76, y: 120, w: 48, h: 36 },
      { id: "bumbum",      rotulo: "Bumbum",              texto: "no bumbum",                   x: 74, y: 156, w: 52, h: 34 },
      { id: "braco",       rotulo: "Braço",               texto: "no braço",                    x: 132, y: 66, w: 16, h: 66 },
      { id: "antebraco",   rotulo: "Antebraço",           texto: "no antebraço",                x: 132, y: 132, w: 16, h: 66 },
      { id: "mao",         rotulo: "Mão",                 texto: "na mão",                      x: 130, y: 198, w: 20, h: 22 },
      { id: "coxa",        rotulo: "Posterior da coxa",   texto: "na parte de trás da coxa",    x: 105, y: 190, w: 19, h: 74 },
      { id: "panturrilha", rotulo: "Panturrilha",         texto: "na panturrilha",              x: 107, y: 264, w: 14, h: 60 },
      { id: "calcanhar",   rotulo: "Calcanhar",           texto: "no calcanhar",                x: 107, y: 324, w: 25, h: 14 }
    ]
  };

  var ARTES = [
    { id: "rosa",    rotulo: "Floral" },
    { id: "caveira", rotulo: "Caveira" },
    { id: "tribal",  rotulo: "Tribal" },
    { id: "frase",   rotulo: "Escrita" }
  ];

  var ESTILOS = ["Fineline", "Blackwork", "Old school", "Realismo", "Pontilhismo", "Aquarela", "Tribal", "Lettering"];
  var CORES   = [{ id: "preto", rotulo: "Preto e cinza" }, { id: "colorida", rotulo: "Colorida" }];
  var TIPOS   = [{ id: "nova", rotulo: "Tatuagem nova" }, { id: "cobertura", rotulo: "Cobertura de uma antiga" }];

  var estado = {
    lado: "frente",
    parte: null,
    tamanho: 12,
    arte: "rosa",
    estilo: null,
    cor: "preto",
    tipo: "nova"
  };

  var $ = function (id) { return document.getElementById(id); };
  var svg = $("corpo");
  var vistas = { frente: $("regioes-frente"), costas: $("regioes-costas") };
  var tinta = $("tinta");
  var recorte = $("recorte-area");
  var destaque = $("destaque");

  function parteAtual() {
    if (!estado.parte) return null;
    var lista = PARTES[estado.lado];
    for (var i = 0; i < lista.length; i++) if (lista[i].id === estado.parte) return lista[i];
    return null;
  }

  /* ---------------------------------------------------------------
     Mede uma vez a caixa real de cada desenho. Sem isso, um desenho
     que não preenche a moldura sairia menor do que os centímetros
     escolhidos — a prévia mentiria o tamanho.
     --------------------------------------------------------------- */
  var caixas = {};
  function caixaDoDesenho(id) {
    if (caixas[id]) return caixas[id];
    var medida = document.createElementNS("http://www.w3.org/2000/svg", "use");
    medida.setAttribute("href", "#arte-" + id);
    tinta.appendChild(medida);
    var b;
    try { b = medida.getBBox(); } catch (e) { b = null; }
    medida.remove();
    caixas[id] = (b && b.width && b.height)
      ? { x: b.x, y: b.y, w: b.width, h: b.height }
      : { x: 0, y: 0, w: 100, h: 100 };
    return caixas[id];
  }

  function moldura(el, p) {
    el.setAttribute("x", p ? p.x : 0);
    el.setAttribute("y", p ? p.y : 0);
    el.setAttribute("width", p ? p.w : 0);
    el.setAttribute("height", p ? p.h : 0);
  }

  /* ---------------------------------------------------------------
     Desenha a tatuagem. Um nó só: mudar o tamanho mexe apenas num
     atributo transform, por isso responde na hora ao arrastar.
     O recorte é a própria parte do corpo: o que passa dela some,
     em vez de ficar boiando fora da pele.
     --------------------------------------------------------------- */
  function desenhar() {
    tinta.innerHTML = "";
    var p = parteAtual();

    moldura(recorte, p);
    moldura(destaque, p);
    if (!p) return;

    var c = caixaDoDesenho(estado.arte);
    /* o lado maior do desenho é que vale como "o tamanho da tatuagem" */
    var escala = (estado.tamanho * UNIDADES_POR_CM) / Math.max(c.w, c.h);
    var cx = c.x + c.w / 2, cy = c.y + c.h / 2;

    var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform",
      "translate(" + (p.x + p.w / 2) + " " + (p.y + p.h / 2) + ") scale(" + escala.toFixed(4) + ") " +
      "translate(" + (-cx).toFixed(2) + " " + (-cy).toFixed(2) + ")");

    var uso = document.createElementNS("http://www.w3.org/2000/svg", "use");
    uso.setAttribute("href", "#arte-" + estado.arte);
    g.appendChild(uso);
    tinta.appendChild(g);

    tinta.classList.toggle("colorida", estado.cor === "colorida");
  }

  function marcarRegioes() {
    svg.querySelectorAll(".regiao").forEach(function (el) {
      el.classList.toggle("escolhida", !!estado.parte && el.dataset.parte === estado.parte);
    });
  }

  /* ---------------------------------------------------------------
     A frase que se escreve sozinha
     --------------------------------------------------------------- */
  function escreverFrase() {
    var p = parteAtual();
    var frase = $("frase");
    var recado = $("recado");

    if (!p) {
      frase.innerHTML = '<span class="vazio">Toque numa parte do corpo para ver a tatuagem no tamanho real.</span>';
      recado.hidden = true;
      recado.textContent = "";
      return;
    }

    var tipo = estado.tipo === "cobertura" ? "Cobertura de uma tatuagem antiga" : "Tatuagem nova";
    var partes = [
      "<b>" + tipo + "</b>",
      "<b>" + p.texto + "</b>",
      "com cerca de <b>" + estado.tamanho + " cm</b>"
    ];
    if (estado.estilo) partes.push("estilo <b>" + estado.estilo + "</b>");
    partes.push("em <b>" + (estado.cor === "colorida" ? "cores" : "preto e cinza") + "</b>");
    frase.innerHTML = partes.join(", ") + ".";

    /* o desenho é recortado pela pele; quando sobra muito, explica o porquê */
    var menorLado = Math.min(p.w, p.h) / UNIDADES_POR_CM;
    if (estado.tamanho > menorLado * 1.25) {
      recado.hidden = false;
      recado.textContent = "Nesse tamanho a peça passa dos limites "
        + p.texto.replace(/^nas /, "das ").replace(/^na /, "da ").replace(/^no /, "do ")
        + " e aparece recortada. No corpo, o tatuador adapta o formato.";
    } else {
      recado.hidden = true;
      recado.textContent = "";
    }
  }

  function atualizar() {
    marcarRegioes();
    desenhar();
    escreverFrase();
    $("medida").textContent = estado.tamanho + " cm";
  }

  /* ---------------------------------------------------------------
     Listas de botões
     --------------------------------------------------------------- */
  function botao(rotulo, valor, grupo, marcado) {
    return '<button type="button" class="opcao" data-grupo="' + grupo + '" data-valor="' + valor
      + '" aria-pressed="' + (marcado ? "true" : "false") + '">' + rotulo + "</button>";
  }

  function montarPartes() {
    $("lista-partes").innerHTML = PARTES[estado.lado].map(function (p) {
      return botao(p.rotulo, p.id, "parte", p.id === estado.parte);
    }).join("");
  }

  function montarResto() {
    $("lista-artes").innerHTML = ARTES.map(function (a) {
      return botao(a.rotulo, a.id, "arte", a.id === estado.arte);
    }).join("");
    $("lista-estilos").innerHTML = ESTILOS.map(function (e) {
      return botao(e, e, "estilo", e === estado.estilo);
    }).join("");
    $("lista-cores").innerHTML = CORES.map(function (c) {
      return botao(c.rotulo, c.id, "cor", c.id === estado.cor);
    }).join("");
    $("lista-tipos").innerHTML = TIPOS.map(function (t) {
      return botao(t.rotulo, t.id, "tipo", t.id === estado.tipo);
    }).join("");
  }

  function marcarGrupo(grupo, valor) {
    document.querySelectorAll('.opcao[data-grupo="' + grupo + '"]').forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.valor === valor ? "true" : "false");
    });
  }

  /* ---------------------------------------------------------------
     Eventos — nenhum scrollIntoView em lugar nenhum
     --------------------------------------------------------------- */
  document.addEventListener("click", function (e) {
    var opcao = e.target.closest(".opcao");
    if (opcao) {
      estado[opcao.dataset.grupo] = opcao.dataset.valor;
      marcarGrupo(opcao.dataset.grupo, opcao.dataset.valor);
      atualizar();
      return;
    }

    var lado = e.target.closest("[data-lado]");
    if (lado) {
      estado.lado = lado.dataset.lado;
      document.querySelectorAll("[data-lado]").forEach(function (b) {
        b.setAttribute("aria-pressed", b.dataset.lado === estado.lado ? "true" : "false");
      });
      /* as vistas trocam por classe: o atributo hidden não vale dentro de SVG */
      vistas.frente.classList.toggle("ativa", estado.lado === "frente");
      vistas.costas.classList.toggle("ativa", estado.lado === "costas");

      if (estado.parte && !parteAtual()) estado.parte = null;
      montarPartes();
      atualizar();
      return;
    }

    var regiao = e.target.closest(".regiao");
    if (regiao) {
      estado.parte = regiao.dataset.parte;
      marcarGrupo("parte", estado.parte);
      atualizar();
    }
  });

  svg.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var regiao = e.target.closest(".regiao");
    if (!regiao) return;
    e.preventDefault();
    estado.parte = regiao.dataset.parte;
    marcarGrupo("parte", estado.parte);
    atualizar();
  });

  /* régua de tamanho: resposta imediata enquanto arrasta */
  var regua = $("tamanho");
  function lerRegua() {
    estado.tamanho = Number(regua.value);
    $("saida-tamanho").textContent = estado.tamanho + " cm";
    regua.style.setProperty("--preenchido",
      ((estado.tamanho - regua.min) / (regua.max - regua.min) * 100) + "%");
    atualizar();
  }
  regua.addEventListener("input", lerRegua);

  /* ---------------------------------------------------------------
     Envio
     --------------------------------------------------------------- */
  $("forma").addEventListener("submit", function (e) {
    e.preventDefault();
    var erro = $("erro");
    var nome = $("nome").value.trim();
    var p = parteAtual();

    if (!p) { erro.textContent = "Escolha em que parte do corpo vai a tatuagem."; return; }
    if (!nome) { erro.textContent = "Escreva seu nome para o estúdio saber com quem falar."; $("nome").focus(); return; }
    erro.textContent = "";

    /* tira os @ que a pessoa digitar, para não sair @@ */
    var insta = $("instagram").value.trim().replace(/^@+/, "");
    var ideia = $("ideia").value.trim();

    var linhas = [];
    if (DEMO) linhas.push("[DEMO] Orçamento de teste pelo site do ZapPedidos");
    linhas.push("*NOVO ORÇAMENTO* - " + ESTUDIO, "");
    linhas.push("*Cliente:* " + nome);
    if (insta) linhas.push("*Instagram:* @" + insta);
    linhas.push("");

    /* o lado só entra quando a mesma parte existe na frente e nas costas */
    var nosDois = PARTES.frente.some(function (o) { return o.id === p.id; })
               && PARTES.costas.some(function (o) { return o.id === p.id; });
    linhas.push("*Local:* " + p.rotulo + (nosDois ? (estado.lado === "costas" ? " (por trás)" : " (pela frente)") : ""));
    linhas.push("*Tamanho:* " + estado.tamanho + " cm");
    if (estado.estilo) linhas.push("*Estilo:* " + estado.estilo);
    linhas.push("*Cor:* " + (estado.cor === "colorida" ? "Colorida" : "Preto e cinza"));
    linhas.push("*Tipo:* " + (estado.tipo === "cobertura" ? "Cobertura de uma antiga" : "Tatuagem nova"));
    if (ideia) linhas.push("", "*A ideia:*", ideia);
    linhas.push("", "Aguardando o orçamento.");

    var url = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(linhas.join("\n"));

    /* se o navegador bloquear a janela nova, navega na própria aba */
    var janela = window.open(url, "_blank", "noopener");
    if (!janela) window.location.href = url;
  });

  /* mede a faixa de demonstração para nada ficar escondido atrás dela */
  function medirAviso() {
    var aviso = document.querySelector(".aviso-demo");
    if (!aviso) return;
    document.documentElement.style.setProperty("--altura-aviso", aviso.offsetHeight + "px");
  }
  window.addEventListener("resize", medirAviso);

  /* ---- início ---- */
  montarPartes();
  montarResto();
  lerRegua();
  medirAviso();
})();
