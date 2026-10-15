/* ===================================================================
   ZapPedidos — página inicial
   1. monta os links de WhatsApp a partir do atributo data-zap
   2. faz a mensagem "chegar" na conversa do topo, uma vez só
   3. revela os blocos conforme a pessoa rola
   =================================================================== */
(function () {
  "use strict";

  /* número que recebe os contatos — trocar aqui muda a página inteira */
  var WHATSAPP = "5524992346329";

  var menosMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- 1. links ---- */
  document.querySelectorAll("[data-zap]").forEach(function (el) {
    el.href = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(el.dataset.zap);
    el.target = "_blank";
    el.rel = "noopener";
  });

  /* ---- 2. a mensagem chegando ---- */
  var digitando = document.getElementById("digitando");
  var balao = document.getElementById("balao");

  function mostrarBalao(animar) {
    if (digitando) digitando.remove();
    if (!balao) return;
    balao.hidden = false;
    if (animar) balao.classList.add("chega");
  }

  if (menosMovimento) {
    mostrarBalao(false);
  } else {
    setTimeout(function () { mostrarBalao(true); }, 1400);
  }

  /* ---- 3. revelar blocos ---- */
  var alvos = document.querySelectorAll(".surge");

  if (menosMovimento || !("IntersectionObserver" in window)) {
    alvos.forEach(function (el) { el.classList.add("visivel"); });
  } else {
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("visivel");
        observador.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    alvos.forEach(function (el) { observador.observe(el); });

    /* o que já está na tela ao abrir não espera pelo rolar */
    requestAnimationFrame(function () {
      alvos.forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("visivel");
      });
    });
  }

  /* ---- 4. planos de serviço: o que a pessoa marca vai junto na mensagem ---- */
  var LISTAS = [
    {
      caixa: "estilos",
      botao: "botao-tattoo",
      plano: "Tatuagem",
      rotulo: "Os estilos que eu tatuo",
      pendente: "Ainda vou te passar os estilos que eu tatuo",
      itens: ["Fineline", "Blackwork", "Old school", "Neo tradicional", "Realismo",
              "Pontilhismo", "Aquarela", "Tribal", "Geométrico", "Oriental",
              "Lettering", "Cobertura (cover-up)"]
    },
    {
      caixa: "servicos-barbearia",
      botao: "botao-barbearia",
      plano: "Barbearia",
      rotulo: "O que a minha barbearia faz",
      pendente: "Ainda vou te passar o que a minha barbearia faz",
      itens: ["Corte na máquina", "Tesoura e máquina", "Corte na tesoura", "Barba",
              "Sobrancelha", "Pezinho", "Hidratação", "Pintura",
              "Descoloração", "Platinado", "Luzes", "Relaxamento"]
    }
  ];

  LISTAS.forEach(function (lista, n) {
    var caixa = document.getElementById(lista.caixa);
    var botao = document.getElementById(lista.botao);
    if (!caixa || !botao) return;

    caixa.innerHTML = lista.itens.map(function (item, i) {
      var id = "marca-" + n + "-" + i;
      return '<label class="estilo"><input type="checkbox" value="' + item + '" id="' + id + '">'
        + '<span class="caixa" aria-hidden="true"></span>' + item + "</label>";
    }).join("");

    function montarLink() {
      var marcados = Array.prototype.map.call(
        caixa.querySelectorAll("input:checked"),
        function (i) { return i.value; }
      );
      var texto = "Olá! Quero o plano " + lista.plano + " do ZapPedidos.\n\n";
      texto += marcados.length
        ? lista.rotulo + ": " + marcados.join(", ") + "."
        : lista.pendente + ".";
      botao.href = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(texto);
    }

    caixa.addEventListener("change", montarLink);
    botao.target = "_blank";
    botao.rel = "noopener";
    montarLink();
  });

  var ano = document.getElementById("ano");
  if (ano) ano.textContent = new Date().getFullYear();
})();
