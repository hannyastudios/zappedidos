/* ===================================================================
   ZapPedidos — agendamento de barbearia
   -------------------------------------------------------------------
   Sem servidor e sem banco: a grade de dias e horários é montada aqui
   no navegador, a partir do horário de funcionamento em window.ZAP.

   Por isso a página NÃO sabe o que já foi marcado — e não finge que
   sabe. O texto diz, e a mensagem diz de novo, que o horário só fica
   combinado quando o barbeiro responder. É ele quem confirma ou
   oferece o horário mais perto que estiver livre.

   Para passar a esconder horários já vendidos, é só um endereço que
   devolva as horas ocupadas do dia; o resto da página não muda.
   =================================================================== */
(function (global) {
  "use strict";

  var cfg = global.ZAP || {};
  var $ = function (id) { return document.getElementById(id); };

  var SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  var SEMANA_INTEIRA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  var MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  var estado = { corte: null, extras: [], quimica: [], dia: null, hora: null };

  /* ---------------------------------------------------------------
     Horas
     --------------------------------------------------------------- */
  function emMinutos(hhmm) {
    var p = String(hhmm).split(":");
    return Number(p[0]) * 60 + Number(p[1] || 0);
  }
  function emTexto(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }

  /* todas as horas que a barbearia atende, fora do almoço */
  function horasDoDia() {
    var ini = emMinutos(cfg.abre || "09:00");
    var fim = emMinutos(cfg.fecha || "19:00");
    var passo = cfg.passo || 30;
    var almocoIni = cfg.almoco ? emMinutos(cfg.almoco[0]) : null;
    var almocoFim = cfg.almoco ? emMinutos(cfg.almoco[1]) : null;

    var lista = [];
    for (var m = ini; m < fim; m += passo) {
      if (almocoIni !== null && m >= almocoIni && m < almocoFim) continue;
      lista.push(m);
    }
    return lista;
  }

  /* dias abertos, a partir de hoje */
  function proximosDias() {
    var fechado = cfg.fechado || [];
    var quantos = cfg.dias || 14;
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    var lista = [];
    for (var i = 0; i < quantos; i++) {
      var d = new Date(hoje);
      d.setDate(hoje.getDate() + i);
      if (fechado.indexOf(d.getDay()) !== -1) continue;
      lista.push(d);
    }
    return lista;
  }

  function chaveDoDia(d) {
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function diaPorChave(chave) {
    var todos = proximosDias();
    for (var i = 0; i < todos.length; i++) if (chaveDoDia(todos[i]) === chave) return todos[i];
    return null;
  }

  /* ---------------------------------------------------------------
     Monta as listas de serviço
     --------------------------------------------------------------- */
  function botao(rotulo, grupo, marcado) {
    return '<button type="button" class="opcao" data-grupo="' + grupo + '" data-valor="'
      + rotulo.replace(/"/g, "&quot;") + '" aria-pressed="' + (marcado ? "true" : "false")
      + '">' + rotulo + "</button>";
  }

  function montarServicos() {
    $("lista-corte").innerHTML = (cfg.corte || []).map(function (c) {
      return botao(c, "corte", false);
    }).join("");
    $("lista-extras").innerHTML = (cfg.extras || []).map(function (c) {
      return botao(c, "extras", false);
    }).join("");
    $("lista-quimica").innerHTML = (cfg.quimica || []).map(function (c) {
      return botao(c, "quimica", false);
    }).join("");
  }

  /* ---------------------------------------------------------------
     Monta a tira de dias
     --------------------------------------------------------------- */
  function montarDias() {
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);

    $("dias").innerHTML = proximosDias().map(function (d) {
      var chave = chaveDoDia(d);
      var ehHoje = d.getTime() === hoje.getTime();
      return '<button type="button" class="dia" data-dia="' + chave + '"'
        + ' aria-pressed="' + (estado.dia === chave ? "true" : "false") + '">'
        + '<span class="semana">' + (ehHoje ? "hoje" : SEMANA[d.getDay()]) + "</span>"
        + '<span class="numero">' + d.getDate() + "</span>"
        + '<span class="mes">' + MES[d.getMonth()] + "</span>"
        + "</button>";
    }).join("");
  }

  /* ---------------------------------------------------------------
     Monta a grade de horários do dia escolhido
     --------------------------------------------------------------- */
  function montarHorarios() {
    var caixa = $("horarios");

    if (!estado.dia) {
      caixa.innerHTML = '<p class="sem-horario">Escolha um dia para ver os horários.</p>';
      return;
    }

    var d = diaPorChave(estado.dia);
    if (!d) { estado.dia = null; estado.hora = null; montarDias(); return montarHorarios(); }

    var agora = new Date();
    var ehHoje = d.toDateString() === agora.toDateString();
    var minutosAgora = agora.getHours() * 60 + agora.getMinutes();

    var manha = [], tarde = [];
    horasDoDia().forEach(function (m) {
      /* no dia de hoje, horário que já passou não entra */
      if (ehHoje && m <= minutosAgora + 30) return;
      (m < 12 * 60 ? manha : tarde).push(m);
    });

    if (!manha.length && !tarde.length) {
      caixa.innerHTML = '<p class="sem-horario">Nesse dia não sobrou horário. Tente o dia seguinte.</p>';
      if (estado.hora) { estado.hora = null; }
      return;
    }

    var html = "";
    if (manha.length) {
      html += '<p class="turno">Manhã</p>' + manha.map(celulaHora).join("");
    }
    if (tarde.length) {
      html += '<p class="turno">Tarde</p>' + tarde.map(celulaHora).join("");
    }
    caixa.innerHTML = html;
  }

  function celulaHora(m) {
    var t = emTexto(m);
    return '<button type="button" class="hora" data-hora="' + t + '" aria-pressed="'
      + (estado.hora === t ? "true" : "false") + '">' + t + "</button>";
  }

  /* ---------------------------------------------------------------
     Resumo
     --------------------------------------------------------------- */
  function servicosEscolhidos() {
    var lista = [];
    if (estado.corte && estado.corte !== "Não vou cortar") lista.push("Corte: " + estado.corte);
    estado.extras.forEach(function (e) { lista.push(e); });
    estado.quimica.forEach(function (q) { lista.push(q); });
    return lista;
  }

  function quandoPorExtenso() {
    if (!estado.dia || !estado.hora) return null;
    var d = diaPorChave(estado.dia);
    if (!d) return null;
    return SEMANA_INTEIRA[d.getDay()] + ", " + d.getDate() + " de " + MES[d.getMonth()]
      + ", às " + estado.hora;
  }

  function atualizarResumo() {
    var alvo = $("resumo-servicos");
    var lista = servicosEscolhidos();
    if (lista.length) {
      alvo.classList.remove("vazio");
      alvo.innerHTML = "<ul>" + lista.map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ul>";
    } else {
      alvo.classList.add("vazio");
      alvo.textContent = "Nada escolhido ainda";
    }

    var quando = $("resumo-quando");
    var texto = quandoPorExtenso();
    if (texto) {
      quando.classList.remove("vazio");
      quando.innerHTML = '<span class="quando">' + texto + "</span>";
    } else {
      quando.classList.add("vazio");
      quando.textContent = "Nenhum horário escolhido";
    }
  }

  function marcarGrupo(grupo) {
    document.querySelectorAll('.opcao[data-grupo="' + grupo + '"]').forEach(function (b) {
      var v = b.dataset.valor;
      var ligado = grupo === "corte" ? estado.corte === v : estado[grupo].indexOf(v) !== -1;
      b.setAttribute("aria-pressed", ligado ? "true" : "false");
    });
  }

  /* ---------------------------------------------------------------
     Eventos — a página não rola sozinha em momento nenhum
     --------------------------------------------------------------- */
  document.addEventListener("click", function (e) {
    var opcao = e.target.closest(".opcao");
    if (opcao) {
      var g = opcao.dataset.grupo, v = opcao.dataset.valor;
      if (g === "corte") {
        estado.corte = estado.corte === v ? null : v;   /* clicar de novo desmarca */
      } else {
        var i = estado[g].indexOf(v);
        if (i === -1) estado[g].push(v); else estado[g].splice(i, 1);
      }
      marcarGrupo(g);
      atualizarResumo();
      return;
    }

    var dia = e.target.closest(".dia");
    if (dia) {
      estado.dia = dia.dataset.dia;
      estado.hora = null;
      montarDias();
      montarHorarios();
      atualizarResumo();
      return;
    }

    var hora = e.target.closest(".hora");
    if (hora) {
      estado.hora = hora.dataset.hora;
      document.querySelectorAll(".hora").forEach(function (b) {
        b.setAttribute("aria-pressed", b.dataset.hora === estado.hora ? "true" : "false");
      });
      atualizarResumo();
    }
  });

  /* ---------------------------------------------------------------
     Envio
     --------------------------------------------------------------- */
  $("forma").addEventListener("submit", function (e) {
    e.preventDefault();
    var erro = $("erro");
    var nome = $("nome").value.trim();
    var lista = servicosEscolhidos();

    if (!estado.corte && !lista.length) {
      erro.textContent = "Escolha pelo menos uma coisa que você vai fazer.";
      return;
    }
    if (!estado.dia || !estado.hora) {
      erro.textContent = "Escolha o dia e o horário.";
      return;
    }
    if (!nome) {
      erro.textContent = "Escreva seu nome para o barbeiro saber quem é.";
      $("nome").focus();
      return;
    }
    erro.textContent = "";

    var recado = $("recado").value.trim();
    var linhas = [];

    if (cfg.demo) linhas.push("[DEMO] Agendamento de teste pelo site do ZapPedidos");
    linhas.push("*NOVO AGENDAMENTO* - " + (cfg.loja || "Barbearia"), "");
    linhas.push("*Cliente:* " + nome);
    linhas.push("*Dia:* " + quandoPorExtenso());
    linhas.push("", "*Vai fazer:*");

    if (lista.length) {
      lista.forEach(function (s) { linhas.push("• " + s); });
    } else {
      linhas.push("• " + estado.corte);
    }

    if (recado) linhas.push("", "*Observação:*", recado);
    linhas.push("", "Pode confirmar esse horário?");

    var url = "https://wa.me/" + cfg.whatsapp + "?text=" + encodeURIComponent(linhas.join("\n"));

    /* se o navegador bloquear a janela nova, navega na própria aba */
    var janela = global.open(url, "_blank", "noopener");
    if (!janela) global.location.href = url;
  });

  /* mede a faixa de demonstração para nada ficar escondido atrás dela */
  function medirAviso() {
    var aviso = document.querySelector(".aviso-demo");
    if (!aviso) return;
    document.documentElement.style.setProperty("--altura-aviso", aviso.offsetHeight + "px");
  }
  global.addEventListener("resize", medirAviso);

  /* ---- início ---- */
  montarServicos();
  montarDias();
  montarHorarios();
  atualizarResumo();
  medirAviso();

  global.ZapBarbearia = { estado: estado, horasDoDia: horasDoDia, proximosDias: proximosDias };
})(window);
