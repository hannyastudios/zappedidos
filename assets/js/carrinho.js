/* ===================================================================
   ZapPedidos — carrinho do cardápio
   -------------------------------------------------------------------
   A página define window.ZAP antes de carregar este arquivo:

   window.ZAP = {
     whatsapp: "5524992346329",   // número que recebe o pedido
     loja:     "Lanchonete Demo", // nome que aparece na mensagem
     demo:     true,              // true = prefixa a mensagem com [DEMO]
     tempo:    "45-60 min",       // deixe "" para não citar o tempo
     produtos: [ { id, nome, preco, img } ]
   };

   Cliente novo: copie o HTML, troque esse bloco e ponha demo: false.
   =================================================================== */
(function (global) {
  "use strict";

  var cfg = global.ZAP || {};
  var PRODUTOS = cfg.produtos || [];
  var carrinho = {};
  var pagamento = null;

  function $(id) { return document.getElementById(id); }

  /* dinheiro sempre no formato brasileiro: R$ 39,90 */
  function brl(v) {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function escapar(t) {
    return String(t).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---- vitrine ---- */
  function render() {
    $("produtos").innerHTML = PRODUTOS.map(function (p) {
      return '<article class="item-cardapio">'
        + '<img src="' + p.img + '" alt="' + escapar(p.nome) + '" loading="lazy" width="600" height="450">'
        + '<div class="item-corpo">'
        +   "<h3>" + escapar(p.nome) + "</h3>"
        +   '<p class="item-preco">' + brl(p.preco) + "</p>"
        +   '<button type="button" class="btn btn-linha" data-add="' + p.id + '">Adicionar</button>'
        + "</div></article>";
    }).join("");
  }

  function add(id, botao) {
    if (!carrinho[id]) {
      var p = PRODUTOS.find(function (x) { return x.id === id; });
      if (!p) return;
      carrinho[id] = { id: p.id, nome: p.nome, preco: p.preco, qtd: 0 };
    }
    carrinho[id].qtd++;
    atualizar();
    /* recebe o próprio botão: não depende de os ids serem sequenciais */
    piscar(botao || document.querySelector('[data-add="' + id + '"]'));
  }

  function remover(id) {
    if (!carrinho[id]) return;
    carrinho[id].qtd--;
    if (carrinho[id].qtd <= 0) delete carrinho[id];
    atualizar();
  }

  function piscar(botao) {
    if (!botao) return;
    botao.style.transform = "scale(.95)";
    setTimeout(function () { botao.style.transform = ""; }, 180);
  }

  function atualizar() {
    var total = 0, qtd = 0, html = "";

    Object.keys(carrinho).forEach(function (k) {
      var i = carrinho[k];
      total += i.preco * i.qtd;
      qtd += i.qtd;
      html += '<div class="linha-item"><div><strong>' + escapar(i.nome) + "</strong>"
        + '<div class="contador">'
        + '<button type="button" data-remove="' + i.id + '" aria-label="Tirar um ' + escapar(i.nome) + '">&minus;</button>'
        + "<span>" + i.qtd + "</span>"
        + '<button type="button" data-add="' + i.id + '" aria-label="Pôr mais um ' + escapar(i.nome) + '">+</button>'
        + '</div></div><span class="valor">' + brl(i.preco * i.qtd) + "</span></div>";
    });

    $("itens").innerHTML = html || '<p class="vazio-carrinho">Seu pedido ainda está vazio.<br>Escolha algo no cardápio.</p>';
    $("total").textContent = brl(total);
    $("cart-count").textContent = qtd;
    $("botao-carrinho").dataset.vazio = qtd ? "nao" : "sim";
  }

  function escolherPagamento(tipo) {
    pagamento = tipo;
    document.querySelectorAll(".pagamento").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.pagamento === tipo ? "true" : "false");
    });
    var troco = $("troco-container");
    troco.hidden = tipo !== "dinheiro";
    if (tipo !== "dinheiro") $("troco").value = "";
  }

  function abrir() {
    $("sidebar").classList.add("aberta");
    $("overlay").classList.add("aberta");
    document.body.style.overflow = "hidden";
  }

  function fechar() {
    $("sidebar").classList.remove("aberta");
    $("overlay").classList.remove("aberta");
    document.body.style.overflow = "";   /* devolve o valor da folha de estilo */
  }

  /* ---- a mensagem que chega no WhatsApp ---- */
  function montarMensagem(nome, endereco, troco) {
    var total = 0, linhas = [];

    if (cfg.demo) linhas.push("[DEMO] Pedido de teste pelo site do ZapPedidos");
    linhas.push("*NOVO PEDIDO* - " + (cfg.loja || "ZapPedidos"), "");
    linhas.push("*Cliente:* " + nome);
    linhas.push("*Endereço:* " + endereco);
    linhas.push("", "*ITENS*");

    Object.keys(carrinho).forEach(function (k) {
      var i = carrinho[k];
      total += i.preco * i.qtd;
      linhas.push("• " + i.qtd + "x " + i.nome + " - " + brl(i.preco * i.qtd));
    });

    var nomes = { dinheiro: "Dinheiro", cartao: "Cartão (crédito ou débito)", pix: "PIX" };
    linhas.push("", "*TOTAL: " + brl(total) + "*");
    linhas.push("*Pagamento:* " + nomes[pagamento]);
    if (pagamento === "dinheiro" && troco) linhas.push("*Troco para:* " + troco);
    if (pagamento === "pix") linhas.push("*Chave PIX:* enviamos aqui no chat");
    if (cfg.tempo) linhas.push("*Tempo estimado:* " + cfg.tempo);
    linhas.push("", "Obrigado pela preferência!");

    return linhas.join("\n");
  }

  function enviar() {
    var erro = $("erro-carrinho");
    var nome = $("nome").value.trim();
    var endereco = $("endereco").value.trim();
    var troco = $("troco").value.trim();

    if (!Object.keys(carrinho).length) { erro.textContent = "Escolha pelo menos um item do cardápio."; return; }
    if (!nome) { erro.textContent = "Escreva seu nome."; $("nome").focus(); return; }
    if (!endereco) { erro.textContent = "Escreva o endereço da entrega."; $("endereco").focus(); return; }
    if (!pagamento) { erro.textContent = "Escolha como você vai pagar."; return; }
    erro.textContent = "";

    var url = "https://wa.me/" + cfg.whatsapp + "?text="
      + encodeURIComponent(montarMensagem(nome, endereco, troco));

    /* se o navegador bloquear a janela nova, navega na própria aba.
       nada de avisar "pedido enviado" antes de o WhatsApp abrir. */
    var janela = global.open(url, "_blank", "noopener");
    if (!janela) global.location.href = url;
  }

  /* ---- liga tudo: um ouvinte só, sem onclick no HTML ---- */

  /* mede a faixa de demonstração para nada ficar escondido atrás dela */
  function medirAviso() {
    var aviso = document.querySelector(".aviso-demo");
    if (!aviso) return;
    document.documentElement.style.setProperty("--altura-aviso", aviso.offsetHeight + "px");
  }
  window.addEventListener("resize", medirAviso);

  function iniciar() {
    render();
    atualizar();
    medirAviso();

    document.addEventListener("click", function (e) {
      var alvo = e.target.closest("[data-add],[data-remove],[data-pagamento],[data-acao]");
      if (!alvo) return;
      if (alvo.hasAttribute("data-add"))            add(Number(alvo.dataset.add), alvo);
      else if (alvo.hasAttribute("data-remove"))    remover(Number(alvo.dataset.remove));
      else if (alvo.hasAttribute("data-pagamento")) escolherPagamento(alvo.dataset.pagamento);
      else if (alvo.dataset.acao === "abrir")       abrir();
      else if (alvo.dataset.acao === "fechar")      fechar();
      else if (alvo.dataset.acao === "enviar")      enviar();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") fechar();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();

  global.ZapCarrinho = { brl: brl, add: add, remover: remover };
})(window);
