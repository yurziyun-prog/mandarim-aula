import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    collection,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

let dadosUsuarioAtual = null;
let modoAtual = "aluno";

let alunosCarregados = [];
let alunosFiltrados = [];
let indiceEditorAtual = -1;

let mensalidadesEditor = [];
let frequenciaEditor = [];

let csvPreparado = [];
let csvAtualizacaoPreparado = [];

const DATA_INICIO_ESTATISTICAS_FREQUENCIA = "2026-09-06";

const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");
const mensagem = document.getElementById("loginMessage");
const userInfo = document.getElementById("userInfo");

const modeButton = document.getElementById("modeButton");
const moduleIndicator = document.getElementById("moduleIndicator");
const moduleName = document.getElementById("moduleName");

const welcomeTitle = document.getElementById("welcomeTitle");
const modeDescription = document.getElementById("modeDescription");

const studentDashboard = document.getElementById("studentDashboard");
const teacherDashboard = document.getElementById("teacherDashboard");
const sectionPlaceholder = document.getElementById("sectionPlaceholder");
const sectionTitle = document.getElementById("sectionTitle");

const genericSection = document.getElementById("genericSection");
const studentsSection = document.getElementById("studentsSection");

const studentsDatabaseView = document.getElementById("studentsDatabaseView");
const studentsList = document.getElementById("studentsList");
const studentsMessage = document.getElementById("studentsMessage");

const studentSearch = document.getElementById("studentSearch");
const studentStatusFilter = document.getElementById("studentStatusFilter");

const studentEditor = document.getElementById("studentEditor");
const studentEditorTitle = document.getElementById("studentEditorTitle");
const studentEditorPosition = document.getElementById("studentEditorPosition");
const studentEditorId = document.getElementById("studentEditorId");
const studentEditorMessage = document.getElementById("studentEditorMessage");

const studentId = document.getElementById("studentId");
const studentName = document.getElementById("studentName");
const studentEmail = document.getElementById("studentEmail");
const studentHSK = document.getElementById("studentHSK");
const studentActive = document.getElementById("studentActive");
const studentAccountStatus = document.getElementById("studentAccountStatus");
const studentUID = document.getElementById("studentUID");

const studentFirstPaymentMonth = document.getElementById("studentFirstPaymentMonth");
const studentLastPaidMonth = document.getElementById("studentLastPaidMonth");
const studentPaidCount = document.getElementById("studentPaidCount");
const studentPendingCount = document.getElementById("studentPendingCount");
const studentPaymentDay = document.getElementById("studentPaymentDay");

const paymentPaidTotal = document.getElementById("paymentPaidTotal");
const paymentPendingTotal = document.getElementById("paymentPendingTotal");
const paymentFirstMonth = document.getElementById("paymentFirstMonth");
const paymentLastPaidMonth = document.getElementById("paymentLastPaidMonth");
const studentPaymentsList = document.getElementById("studentPaymentsList");

const attendancePresentTotal = document.getElementById("attendancePresentTotal");
const attendanceAbsentTotal = document.getElementById("attendanceAbsentTotal");
const attendanceExcusedTotal = document.getElementById("attendanceExcusedTotal");
const studentAttendanceList = document.getElementById("studentAttendanceList");

const studentCurrentExercise = document.getElementById("studentCurrentExercise");
const studentNotes = document.getElementById("studentNotes");
const studentImportedFields = document.getElementById("studentImportedFields");

const csvImporter = document.getElementById("csvImporter");
const csvPreview = document.getElementById("csvPreview");
const csvMessage = document.getElementById("csvMessage");
const csvTotalRows = document.getElementById("csvTotalRows");
const csvNewRows = document.getElementById("csvNewRows");
const csvExistingRows = document.getElementById("csvExistingRows");
const csvInvalidRows = document.getElementById("csvInvalidRows");
const csvHeaders = document.getElementById("csvHeaders");
const csvImportButton = document.getElementById("csvImportButton");

const csvUpdatePanel = document.getElementById("csvUpdatePanel");
const csvUpdatePreview = document.getElementById("csvUpdatePreview");
const csvUpdateMessage = document.getElementById("csvUpdateMessage");
const csvUpdateTotal = document.getElementById("csvUpdateTotal");
const csvUpdateMatches = document.getElementById("csvUpdateMatches");
const csvUpdateMissing = document.getElementById("csvUpdateMissing");
const csvUpdateHeaders = document.getElementById("csvUpdateHeaders");
const csvUpdateButton = document.getElementById("csvUpdateButton");

window.entrar = async function(event) {
    event.preventDefault();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("password").value;
    mensagem.textContent = "Entrando...";

    try {
        await signInWithEmailAndPassword(auth, email, senha);
    } catch (erro) {
        console.error(erro);
        mensagem.textContent = "E-mail ou senha incorretos.";
    }
};

window.criarConta = async function() {
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("password").value;

    if (!email || !senha) {
        mensagem.textContent = "Preencha e-mail e senha.";
        return;
    }

    if (senha.length < 6) {
        mensagem.textContent = "A senha deve ter pelo menos 6 caracteres.";
        return;
    }

    mensagem.textContent = "Criando conta...";

    try {
        const credencial = await createUserWithEmailAndPassword(auth, email, senha);

        await setDoc(doc(db, "usuarios", credencial.user.uid), {
            email,
            emailNormalizado: normalizarEmail(email),
            nome: "",
            nivelHSK: 3,
            professor: false,
            aluno: true,
            status: "aprovado",
            alunoId: null,
            criadoEm: serverTimestamp()
        });

        mensagem.textContent = "Conta criada com sucesso.";
    } catch (erro) {
        console.error(erro);

        if (erro.code === "auth/email-already-in-use") {
            mensagem.textContent = "Este e-mail já possui uma conta.";
        } else if (erro.code === "auth/invalid-email") {
            mensagem.textContent = "E-mail inválido.";
        } else {
            mensagem.textContent = "Não foi possível criar a conta.";
        }
    }
};

window.sair = async function() {
    await signOut(auth);
};

window.alternarModo = function() {
    if (!dadosUsuarioAtual?.professor) return;

    modoAtual = modoAtual === "aluno" ? "professor" : "aluno";
    atualizarModo();
};

window.abrirSecao = function(titulo) {
    studentDashboard.classList.add("hidden");
    teacherDashboard.classList.add("hidden");
    sectionPlaceholder.classList.remove("hidden");

    genericSection.classList.add("hidden");
    studentsSection.classList.add("hidden");

    if (titulo === "Alunos" && modoAtual === "professor") {
        studentsSection.classList.remove("hidden");
        studentsDatabaseView.classList.remove("hidden");
        studentEditor.classList.add("hidden");
        carregarAlunos();
        return;
    }

    genericSection.classList.remove("hidden");
    sectionTitle.textContent = titulo;
};

window.voltarAoPainel = function() {
    sectionPlaceholder.classList.add("hidden");
    mostrarPainelAtual();
};

window.carregarAlunos = async function() {
    if (!dadosUsuarioAtual?.professor) return;

    studentsMessage.textContent = "Carregando alunos...";
    studentsList.innerHTML = "";

    try {
        const [alunosSnap, usuariosSnap] = await Promise.all([
            getDocs(collection(db, "alunos")),
            getDocs(collection(db, "usuarios"))
        ]);

        const usuariosPorEmail = new Map();

        usuariosSnap.docs.forEach(item => {
            const dados = item.data();
            const email = normalizarEmail(dados.email);

            if (email && dados.aluno === true) {
                usuariosPorEmail.set(email, {
                    uid: item.id,
                    ...dados
                });
            }
        });

        alunosCarregados = alunosSnap.docs
            .map(item => ({
                id: item.id,
                ...item.data()
            }))
            .sort((a, b) =>
                (a.nome || a.email || "").localeCompare(
                    b.nome || b.email || "",
                    "pt-BR"
                )
            );

        for (const aluno of alunosCarregados) {
            const email = normalizarEmail(aluno.emailNormalizado || aluno.email);

            if (!aluno.uidUsuario && email && usuariosPorEmail.has(email)) {
                const usuario = usuariosPorEmail.get(email);

                await updateDoc(doc(db, "alunos", aluno.id), {
                    uidUsuario: usuario.uid,
                    statusConta: "vinculada",
                    atualizadoEm: serverTimestamp()
                });

                await updateDoc(doc(db, "usuarios", usuario.uid), {
                    alunoId: aluno.id,
                    nivelHSK: Number(aluno.nivelHSK || usuario.nivelHSK || 3)
                });

                aluno.uidUsuario = usuario.uid;
                aluno.statusConta = "vinculada";
            }
        }

        alunosFiltrados = [...alunosCarregados];
        renderizarTabelaAlunos();

        studentsMessage.textContent =
            alunosCarregados.length
                ? `${alunosCarregados.length} aluno${alunosCarregados.length === 1 ? "" : "s"} no banco.`
                : "Ainda não há alunos cadastrados.";
    } catch (erro) {
        console.error(erro);
        studentsMessage.textContent = "Não foi possível carregar o banco de alunos.";
    }
};

function renderizarTabelaAlunos() {
    studentsList.innerHTML = "";

    if (alunosFiltrados.length === 0) {
        const linha = document.createElement("tr");
        linha.innerHTML = `<td colspan="8">Nenhum aluno encontrado.</td>`;
        studentsList.appendChild(linha);
        return;
    }

    alunosFiltrados.forEach(aluno => {
        const linha = document.createElement("tr");

        const nome = aluno.nome?.trim() || "Aluno sem nome";
        const email = aluno.email?.trim() || "Sem e-mail";
        const vinculado = Boolean(aluno.uidUsuario);
        const ativo = aluno.ativo !== false;

        const resumoMensalidades = calcularResumoMensalidadesAluno(aluno);
        const resumoFrequencia = calcularResumoFrequencia(obterFrequenciaAluno(aluno));

        const exercicio =
            obterValorAluno(
                aluno,
                "exercicioAtual",
                ["exercicio_atual", "exercício atual"]
            ) || "—";

        linha.innerHTML = `
            <td>
                <span class="student-table-name">${escaparHTML(nome)}</span>
                <span class="student-table-email">${escaparHTML(email)}</span>
            </td>

            <td>HSK ${Number(aluno.nivelHSK || 3)}</td>

            <td>
                <span class="student-account-badge ${vinculado ? "linked" : "unlinked"}">
                    ${vinculado ? "Vinculada" : "Sem conta"}
                </span>
            </td>

            <td>
                ${resumoMensalidades.pagas} pagas · ${resumoMensalidades.pendentes} pendentes
            </td>

            <td>
                <span class="attendance-counts-badge">
                    ${resumoFrequencia.presencas} P ·
                    ${resumoFrequencia.faltas} F ·
                    ${resumoFrequencia.justificadas} J
                </span>
            </td>

            <td class="student-table-exercise">
                ${escaparHTML(exercicio)}
            </td>

            <td>
                <span class="student-status-badge ${ativo ? "active" : "inactive"}">
                    ${ativo ? "Ativo" : "Inativo"}
                </span>
            </td>

            <td>
                <div class="table-actions">
                    <button
                        type="button"
                        class="table-edit-button"
                        data-student-id="${aluno.id}"
                    >
                        ✏️ Editar
                    </button>
                </div>
            </td>
        `;

        linha.querySelector(".table-edit-button")
            .addEventListener("click", () => abrirFichaAluno(aluno.id));

        studentsList.appendChild(linha);
    });
}

window.filtrarListaAlunos = function() {
    const busca = normalizarTexto(studentSearch.value);
    const filtro = studentStatusFilter.value;

    alunosFiltrados = alunosCarregados.filter(aluno => {
        const texto = normalizarTexto(
            [
                aluno.nome,
                aluno.email,
                `HSK ${aluno.nivelHSK}`,
                obterValorAluno(aluno, "exercicioAtual", ["exercicio_atual"])
            ]
            .filter(Boolean)
            .join(" ")
        );

        const atendeBusca = !busca || texto.includes(busca);
        let atendeFiltro = true;

        if (filtro === "ativos") atendeFiltro = aluno.ativo !== false;
        if (filtro === "inativos") atendeFiltro = aluno.ativo === false;
        if (filtro === "vinculados") atendeFiltro = Boolean(aluno.uidUsuario);
        if (filtro === "sem_conta") atendeFiltro = !aluno.uidUsuario;

        return atendeBusca && atendeFiltro;
    });

    renderizarTabelaAlunos();
};

window.abrirNovaFichaAluno = function() {
    indiceEditorAtual = -1;
    limparFormularioAluno();

    studentId.value = "";
    studentEditorTitle.textContent = "Novo aluno";
    studentEditorPosition.textContent = "Novo registro";
    studentEditorId.textContent = "ID: será criado ao salvar";
    studentAccountStatus.value = "sem_conta";
    studentUID.value = "";
    studentHSK.value = "3";
    studentActive.value = "true";

    mensalidadesEditor = [];
    frequenciaEditor = [];

    renderizarMensalidades();
    renderizarFrequencia();

    studentsDatabaseView.classList.add("hidden");
    studentEditor.classList.remove("hidden");
    studentEditorMessage.textContent = "";
};

window.abrirFichaAluno = function(alunoId) {
    const aluno = alunosCarregados.find(item => item.id === alunoId);

    if (!aluno) {
        studentsMessage.textContent = "Aluno não encontrado.";
        return;
    }

    indiceEditorAtual = alunosFiltrados.findIndex(item => item.id === alunoId);

    preencherFormularioAluno(aluno);

    studentsDatabaseView.classList.add("hidden");
    studentEditor.classList.remove("hidden");
};

function preencherFormularioAluno(aluno) {
    studentId.value = aluno.id;
    studentEditorTitle.textContent = aluno.nome?.trim() || "Editar aluno";
    studentEditorId.textContent = `ID: ${aluno.id}`;

    atualizarPosicaoEditor();

    studentName.value = aluno.nome || "";
    studentEmail.value = aluno.email || "";
    studentHSK.value = String(Number(aluno.nivelHSK || 3));
    studentActive.value = aluno.ativo === false ? "false" : "true";

    studentAccountStatus.value =
        aluno.uidUsuario ? "vinculada" : (aluno.statusConta || "sem_conta");

    studentUID.value = aluno.uidUsuario || "";

    studentPaymentDay.value =
        obterValorAluno(
            aluno,
            "diaPagamentoReferencia",
            ["dia_pagamento_referencia"]
        ) ?? "";

    studentCurrentExercise.value =
        obterValorAluno(
            aluno,
            "exercicioAtual",
            ["exercicio_atual"]
        ) || "";

    studentNotes.value =
        obterValorAluno(
            aluno,
            "observacoes",
            ["observações"]
        ) || "";

    mensalidadesEditor = obterMensalidadesAluno(aluno);
    renderizarMensalidades();

    frequenciaEditor = obterFrequenciaAluno(aluno);
    renderizarFrequencia();

    renderizarCamposImportados(aluno.dadosImportados || {});
    studentEditorMessage.textContent = "";
}

/* =========================
   MENSALIDADES
========================= */

function obterMensalidadesAluno(aluno) {
    if (Array.isArray(aluno.mensalidades) && aluno.mensalidades.length > 0) {
        return aluno.mensalidades
            .map(item => ({
                id: item.id || gerarIdLocal("mens"),
                competencia: item.competencia || "",
                status: normalizarStatusMensalidade(item.status),
                valor: item.valor ?? "",
                dataPagamento: item.dataPagamento || "",
                observacao: item.observacao || ""
            }))
            .sort(ordenarMensalidades);
    }

    const pagasAntigas = Number(
        obterValorAluno(
            aluno,
            "mensalidadesPagas",
            ["mensalidades_pagas"]
        ) || 0
    );

    const ultimoMesAntigo =
        obterValorAluno(
            aluno,
            "ultimoMesPago",
            ["ultimo_mes_pago"]
        );

    const primeiroMesAntigo =
        obterValorAluno(
            aluno,
            "primeiroMesRegistrado",
            ["primeiro_mes_registrado"]
        );

    const pareceRegistroInicial =
        pagasAntigas >= 3 ||
        ultimoMesAntigo === "2026-07" ||
        primeiroMesAntigo === "2026-05";

    if (pareceRegistroInicial) {
        return [
            criarMensalidade("2026-05", "paga"),
            criarMensalidade("2026-06", "paga"),
            criarMensalidade("2026-07", "paga"),
            criarMensalidade("2026-08", "pendente"),
            criarMensalidade("2026-09", "pendente")
        ];
    }

    return [];
}

function criarMensalidade(competencia = "", status = "pendente") {
    return {
        id: gerarIdLocal("mens"),
        competencia,
        status,
        valor: "",
        dataPagamento: "",
        observacao: ""
    };
}

window.adicionarMensalidade = function() {
    mensalidadesEditor.push(
        criarMensalidade(
            descobrirProximoMes(),
            "pendente"
        )
    );

    mensalidadesEditor.sort(ordenarMensalidades);
    renderizarMensalidades();
};

function descobrirProximoMes() {
    const competencias = mensalidadesEditor
        .map(item => item.competencia)
        .filter(item => /^\d{4}-\d{2}$/.test(item))
        .sort();

    if (competencias.length === 0) {
        const hoje = new Date();
        return (
            hoje.getFullYear() +
            "-" +
            String(hoje.getMonth() + 1).padStart(2, "0")
        );
    }

    const ultimo = competencias[competencias.length - 1];
    const [ano, mes] = ultimo.split("-").map(Number);
    const data = new Date(ano, mes, 1);

    return (
        data.getFullYear() +
        "-" +
        String(data.getMonth() + 1).padStart(2, "0")
    );
}

function renderizarMensalidades() {
    studentPaymentsList.innerHTML = "";
    mensalidadesEditor.sort(ordenarMensalidades);

    if (mensalidadesEditor.length === 0) {
        studentPaymentsList.innerHTML = `
            <tr class="payment-empty-row">
                <td colspan="6">Nenhuma mensalidade registrada.</td>
            </tr>
        `;
        atualizarResumoMensalidades();
        return;
    }

    mensalidadesEditor.forEach(mensalidade => {
        const linha = document.createElement("tr");

        linha.className =
            mensalidade.status === "paga"
                ? "payment-row-paid"
                : "payment-row-pending";

        linha.innerHTML = `
            <td>
                <input
                    type="month"
                    value="${escaparAtributo(mensalidade.competencia)}"
                    data-payment-field="competencia"
                >
            </td>

            <td>
                <select data-payment-field="status">
                    <option value="paga" ${mensalidade.status === "paga" ? "selected" : ""}>Paga</option>
                    <option value="pendente" ${mensalidade.status === "pendente" ? "selected" : ""}>Pendente</option>
                </select>
            </td>

            <td>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value="${escaparAtributo(mensalidade.valor)}"
                    data-payment-field="valor"
                >
            </td>

            <td>
                <input
                    type="date"
                    value="${escaparAtributo(mensalidade.dataPagamento)}"
                    data-payment-field="dataPagamento"
                >
            </td>

            <td>
                <input
                    type="text"
                    class="payment-note-input"
                    placeholder="Observação"
                    value="${escaparAtributo(mensalidade.observacao)}"
                    data-payment-field="observacao"
                >
            </td>

            <td>
                <button type="button" class="payment-remove-button">Remover</button>
            </td>
        `;

        linha.querySelectorAll("[data-payment-field]").forEach(campo => {
            campo.addEventListener("change", () => {
                atualizarMensalidadeLocal(
                    mensalidade.id,
                    campo.dataset.paymentField,
                    campo.value
                );
            });

            campo.addEventListener("input", () => {
                atualizarMensalidadeLocal(
                    mensalidade.id,
                    campo.dataset.paymentField,
                    campo.value,
                    false
                );
            });
        });

        linha.querySelector(".payment-remove-button")
            .addEventListener("click", () => removerMensalidade(mensalidade.id));

        studentPaymentsList.appendChild(linha);
    });

    atualizarResumoMensalidades();
}

function atualizarMensalidadeLocal(id, campo, valor, rerenderizar = true) {
    const mensalidade = mensalidadesEditor.find(item => item.id === id);
    if (!mensalidade) return;

    if (campo === "status") {
        mensalidade.status = normalizarStatusMensalidade(valor);
    } else if (campo === "valor") {
        mensalidade.valor = valor;
    } else {
        mensalidade[campo] = valor;
    }

    if (campo === "status" && mensalidade.status === "pendente") {
        mensalidade.dataPagamento = "";
    }

    if (rerenderizar && (campo === "status" || campo === "competencia")) {
        renderizarMensalidades();
    } else {
        atualizarResumoMensalidades();
    }
}

function removerMensalidade(id) {
    mensalidadesEditor = mensalidadesEditor.filter(item => item.id !== id);
    renderizarMensalidades();
}

function atualizarResumoMensalidades() {
    const resumo = calcularResumoMensalidades(mensalidadesEditor);

    paymentPaidTotal.textContent = resumo.pagas;
    paymentPendingTotal.textContent = resumo.pendentes;

    paymentFirstMonth.textContent =
        resumo.primeiroMes
            ? formatarCompetencia(resumo.primeiroMes)
            : "—";

    paymentLastPaidMonth.textContent =
        resumo.ultimoMesPago
            ? formatarCompetencia(resumo.ultimoMesPago)
            : "—";

    studentFirstPaymentMonth.value = resumo.primeiroMes || "";
    studentLastPaidMonth.value = resumo.ultimoMesPago || "";
    studentPaidCount.value = resumo.pagas;
    studentPendingCount.value = resumo.pendentes;
}

function calcularResumoMensalidades(mensalidades) {
    const lista = Array.isArray(mensalidades) ? mensalidades : [];

    const validas = lista.filter(item =>
        /^\d{4}-\d{2}$/.test(item.competencia || "")
    );

    const pagas = lista.filter(item => item.status === "paga").length;
    const pendentes = lista.filter(item => item.status === "pendente").length;

    const competencias = validas
        .map(item => item.competencia)
        .sort();

    const competenciasPagas = validas
        .filter(item => item.status === "paga")
        .map(item => item.competencia)
        .sort();

    return {
        pagas,
        pendentes,
        primeiroMes: competencias[0] || "",
        ultimoMesPago:
            competenciasPagas[competenciasPagas.length - 1] || ""
    };
}

function calcularResumoMensalidadesAluno(aluno) {
    if (Array.isArray(aluno.mensalidades) && aluno.mensalidades.length > 0) {
        return calcularResumoMensalidades(aluno.mensalidades);
    }

    return {
        pagas: Number(
            obterValorAluno(
                aluno,
                "mensalidadesPagas",
                ["mensalidades_pagas"]
            ) || 0
        ),

        pendentes: Number(
            obterValorAluno(
                aluno,
                "mensalidadesPendentes",
                ["mensalidades_pendentes"]
            ) || 0
        ),

        primeiroMes:
            obterValorAluno(
                aluno,
                "primeiroMesRegistrado",
                ["primeiro_mes_registrado"]
            ) || "",

        ultimoMesPago:
            obterValorAluno(
                aluno,
                "ultimoMesPago",
                ["ultimo_mes_pago"]
            ) || ""
    };
}

/* =========================
   FREQUÊNCIA
========================= */

function obterFrequenciaAluno(aluno) {
    if (Array.isArray(aluno.frequencia) && aluno.frequencia.length > 0) {
        return aluno.frequencia
            .map(item => ({
                id: item.id || gerarIdLocal("freq"),
                data: item.data || "",
                status: normalizarStatusFrequencia(item.status),
                conteudo: item.conteudo || "",
                observacao: item.observacao || "",
                contaEstatistica:
                    item.contaEstatistica !== undefined
                        ? Boolean(item.contaEstatistica)
                        : (
                            item.data
                                ? item.data >= DATA_INICIO_ESTATISTICAS_FREQUENCIA
                                : true
                        )
            }))
            .sort(ordenarFrequencia);
    }

    /*
      Migração inicial:
      todos os sábados de 2026 até 05/09/2026
      são registrados como presença, mas NÃO entram
      nas estatísticas, conforme combinado.
    */
    return gerarHistoricoSabados2026();
}

function gerarHistoricoSabados2026() {
    const inicio = new Date(2026, 0, 1);
    const fim = new Date(2026, 8, 5);

    const registros = [];
    const data = new Date(inicio);

    while (data.getDay() !== 6) {
        data.setDate(data.getDate() + 1);
    }

    while (data <= fim) {
        registros.push({
            id: gerarIdLocal("freq"),
            data: formatarDataISO(data),
            status: "presente",
            conteudo: "",
            observacao: "Registro histórico anterior ao início das estatísticas.",
            contaEstatistica: false
        });

        data.setDate(data.getDate() + 7);
    }

    return registros;
}

function criarRegistroFrequencia(
    data = "",
    status = "presente",
    contaEstatistica = true
) {
    return {
        id: gerarIdLocal("freq"),
        data,
        status,
        conteudo: "",
        observacao: "",
        contaEstatistica
    };
}

window.adicionarRegistroFrequencia = function() {
    const proximaData = descobrirProximoSabadoFrequencia();

    frequenciaEditor.push(
        criarRegistroFrequencia(
            proximaData,
            "presente",
            proximaData >= DATA_INICIO_ESTATISTICAS_FREQUENCIA
        )
    );

    frequenciaEditor.sort(ordenarFrequencia);
    renderizarFrequencia();
};

function descobrirProximoSabadoFrequencia() {
    const datas = frequenciaEditor
        .map(item => item.data)
        .filter(item => /^\d{4}-\d{2}-\d{2}$/.test(item))
        .sort();

    let base;

    if (datas.length) {
        base = new Date(datas[datas.length - 1] + "T12:00:00");
        base.setDate(base.getDate() + 1);
    } else {
        base = new Date(2026, 8, 6);
    }

    while (base.getDay() !== 6) {
        base.setDate(base.getDate() + 1);
    }

    return formatarDataISO(base);
}

function renderizarFrequencia() {
    studentAttendanceList.innerHTML = "";
    frequenciaEditor.sort(ordenarFrequencia);

    if (frequenciaEditor.length === 0) {
        studentAttendanceList.innerHTML = `
            <tr class="attendance-empty-row">
                <td colspan="6">Nenhuma aula registrada.</td>
            </tr>
        `;

        atualizarResumoFrequencia();
        return;
    }

    frequenciaEditor.forEach(registro => {
        const linha = document.createElement("tr");

        linha.className =
            registro.status === "presente"
                ? "attendance-row-present"
                : (
                    registro.status === "justificada"
                        ? "attendance-row-excused"
                        : "attendance-row-absent"
                );

        if (!registro.contaEstatistica) {
            linha.classList.add("attendance-row-legacy");
        }

        linha.innerHTML = `
            <td>
                <input
                    type="date"
                    value="${escaparAtributo(registro.data)}"
                    data-attendance-field="data"
                >
            </td>

            <td>
                <select data-attendance-field="status">
                    <option value="presente" ${registro.status === "presente" ? "selected" : ""}>
                        Presente
                    </option>
                    <option value="falta" ${registro.status === "falta" ? "selected" : ""}>
                        Falta
                    </option>
                    <option value="justificada" ${registro.status === "justificada" ? "selected" : ""}>
                        Falta justificada
                    </option>
                </select>
            </td>

            <td>
                <input
                    type="text"
                    class="attendance-content-input"
                    placeholder="Conteúdo / aula"
                    value="${escaparAtributo(registro.conteudo)}"
                    data-attendance-field="conteudo"
                >
            </td>

            <td>
                <input
                    type="text"
                    class="attendance-note-input"
                    placeholder="Observação"
                    value="${escaparAtributo(registro.observacao)}"
                    data-attendance-field="observacao"
                >
            </td>

            <td>
                <select data-attendance-field="contaEstatistica">
                    <option value="true" ${registro.contaEstatistica ? "selected" : ""}>Sim</option>
                    <option value="false" ${!registro.contaEstatistica ? "selected" : ""}>Não</option>
                </select>
            </td>

            <td>
                <button type="button" class="attendance-remove-button">
                    Remover
                </button>
            </td>
        `;

        linha.querySelectorAll("[data-attendance-field]")
            .forEach(campo => {
                campo.addEventListener("change", () => {
                    atualizarFrequenciaLocal(
                        registro.id,
                        campo.dataset.attendanceField,
                        campo.value
                    );
                });

                campo.addEventListener("input", () => {
                    atualizarFrequenciaLocal(
                        registro.id,
                        campo.dataset.attendanceField,
                        campo.value,
                        false
                    );
                });
            });

        linha.querySelector(".attendance-remove-button")
            .addEventListener("click", () => removerRegistroFrequencia(registro.id));

        studentAttendanceList.appendChild(linha);
    });

    atualizarResumoFrequencia();
}

function atualizarFrequenciaLocal(id, campo, valor, rerenderizar = true) {
    const registro = frequenciaEditor.find(item => item.id === id);
    if (!registro) return;

    if (campo === "status") {
        registro.status = normalizarStatusFrequencia(valor);
    } else if (campo === "contaEstatistica") {
        registro.contaEstatistica = valor === "true";
    } else {
        registro[campo] = valor;
    }

    if (campo === "data" && registro.data) {
        registro.contaEstatistica =
            registro.data >= DATA_INICIO_ESTATISTICAS_FREQUENCIA;
    }

    if (
        rerenderizar &&
        (
            campo === "status" ||
            campo === "data" ||
            campo === "contaEstatistica"
        )
    ) {
        renderizarFrequencia();
    } else {
        atualizarResumoFrequencia();
    }
}

function removerRegistroFrequencia(id) {
    frequenciaEditor = frequenciaEditor.filter(item => item.id !== id);
    renderizarFrequencia();
}

function atualizarResumoFrequencia() {
    const resumo = calcularResumoFrequencia(frequenciaEditor);

    attendancePresentTotal.textContent = resumo.presencas;
    attendanceAbsentTotal.textContent = resumo.faltas;
    attendanceExcusedTotal.textContent = resumo.justificadas;
}

function calcularResumoFrequencia(lista) {
    const validas = (Array.isArray(lista) ? lista : [])
        .filter(item => item.contaEstatistica === true);

    return {
        presencas:
            validas.filter(item => item.status === "presente").length,

        faltas:
            validas.filter(item => item.status === "falta").length,

        justificadas:
            validas.filter(item => item.status === "justificada").length
    };
}

/* =========================
   CAMPOS IMPORTADOS
========================= */

function renderizarCamposImportados(dadosImportados) {
    studentImportedFields.innerHTML = "";

    const camposIgnorados = new Set([
        "nome",
        "email",
        "nivel hsk",
        "nivel_hsk",
        "hsk",
        "ativo",
        "primeiro mes registrado",
        "primeiro_mes_registrado",
        "ultimo mes pago",
        "ultimo_mes_pago",
        "mensalidades pagas",
        "mensalidades_pagas",
        "mensalidades pendentes",
        "mensalidades_pendentes",
        "dia pagamento referencia",
        "dia_pagamento_referencia",
        "exercicio atual",
        "exercicio_atual",
        "observacoes",
        "observações"
    ]);

    const entradas = Object.entries(dadosImportados || {})
        .filter(([chave]) =>
            !camposIgnorados.has(
                normalizarCabecalho(chave)
            )
        );

    if (entradas.length === 0) {
        studentImportedFields.innerHTML = `
            <p class="field-help">
                Nenhum campo adicional importado.
            </p>
        `;
        return;
    }

    entradas.forEach(([chave, valor]) => {
        const linha = document.createElement("label");
        linha.className = "imported-field-row";

        linha.innerHTML = `
            <span>${escaparHTML(chave)}</span>
            <input
                type="text"
                data-imported-key="${escaparAtributo(chave)}"
                value="${escaparAtributo(valor ?? "")}"
            >
        `;

        studentImportedFields.appendChild(linha);
    });
}

function limparFormularioAluno() {
    studentId.value = "";
    studentName.value = "";
    studentEmail.value = "";
    studentHSK.value = "3";
    studentActive.value = "true";
    studentAccountStatus.value = "sem_conta";
    studentUID.value = "";

    studentFirstPaymentMonth.value = "";
    studentLastPaidMonth.value = "";
    studentPaidCount.value = "0";
    studentPendingCount.value = "0";
    studentPaymentDay.value = "";

    studentCurrentExercise.value = "";
    studentNotes.value = "";
    studentImportedFields.innerHTML = "";

    mensalidadesEditor = [];
    frequenciaEditor = [];

    renderizarMensalidades();
    renderizarFrequencia();

    studentEditorMessage.textContent = "";
}

window.salvarFichaAluno = async function() {
    return await salvarAlunoAtual();
};

async function salvarAlunoAtual() {
    if (!dadosUsuarioAtual?.professor) return false;

    const nome = studentName.value.trim();
    const email = studentEmail.value.trim();

    if (!nome) {
        studentEditorMessage.textContent = "Informe o nome do aluno.";
        studentName.focus();
        return false;
    }

    const idAtual = studentId.value.trim();
    const dadosImportados = coletarCamposImportados();

    const mensalidadesLimpas = mensalidadesEditor
        .filter(item => item.competencia)
        .map(item => ({
            id: item.id,
            competencia: item.competencia,
            status: normalizarStatusMensalidade(item.status),
            valor:
                item.valor === ""
                    ? null
                    : numeroOuNull(item.valor),
            dataPagamento:
                item.status === "paga"
                    ? (item.dataPagamento || "")
                    : "",
            observacao: item.observacao || ""
        }))
        .sort(ordenarMensalidades);

    const resumoMensalidades = calcularResumoMensalidades(mensalidadesLimpas);

    const frequenciaLimpa = frequenciaEditor
        .filter(item => item.data)
        .map(item => ({
            id: item.id,
            data: item.data,
            status: normalizarStatusFrequencia(item.status),
            conteudo: item.conteudo || "",
            observacao: item.observacao || "",
            contaEstatistica: Boolean(item.contaEstatistica)
        }))
        .sort(ordenarFrequencia);

    const resumoFrequencia = calcularResumoFrequencia(frequenciaLimpa);

    const dados = {
        nome,
        email,
        emailNormalizado: normalizarEmail(email),

        nivelHSK: Number(studentHSK.value || 3),
        ativo: studentActive.value === "true",

        mensalidades: mensalidadesLimpas,
        primeiroMesRegistrado: resumoMensalidades.primeiroMes,
        ultimoMesPago: resumoMensalidades.ultimoMesPago,
        mensalidadesPagas: resumoMensalidades.pagas,
        mensalidadesPendentes: resumoMensalidades.pendentes,

        diaPagamentoReferencia:
            studentPaymentDay.value
                ? Number(studentPaymentDay.value)
                : null,

        frequencia: frequenciaLimpa,

        frequenciaInicioEstatisticas:
            DATA_INICIO_ESTATISTICAS_FREQUENCIA,

        frequenciaPresencas:
            resumoFrequencia.presencas,

        frequenciaFaltas:
            resumoFrequencia.faltas,

        frequenciaJustificadas:
            resumoFrequencia.justificadas,

        exercicioAtual: studentCurrentExercise.value,
        observacoes: studentNotes.value,
        dadosImportados,

        atualizadoEm: serverTimestamp()
    };

    try {
        studentEditorMessage.textContent = "Salvando...";

        if (idAtual) {
            await updateDoc(
                doc(db, "alunos", idAtual),
                dados
            );

            const alunoLocal =
                alunosCarregados.find(item => item.id === idAtual);

            if (alunoLocal) {
                Object.assign(alunoLocal, dados);
            }

            if (alunoLocal?.uidUsuario) {
                await updateDoc(
                    doc(db, "usuarios", alunoLocal.uidUsuario),
                    { nivelHSK: dados.nivelHSK }
                );
            }

            mensalidadesEditor = mensalidadesLimpas.map(item => ({ ...item }));
            frequenciaEditor = frequenciaLimpa.map(item => ({ ...item }));

            renderizarMensalidades();
            renderizarFrequencia();

            studentEditorMessage.textContent = "Ficha salva. ✓";
        } else {
            const novaRef = doc(collection(db, "alunos"));

            await setDoc(
                novaRef,
                {
                    ...dados,
                    uidUsuario: null,
                    statusConta: "sem_conta",
                    origem: "manual",
                    criadoEm: serverTimestamp()
                }
            );

            studentId.value = novaRef.id;
            studentEditorId.textContent = `ID: ${novaRef.id}`;
            studentEditorMessage.textContent = "Novo aluno criado. ✓";

            await carregarAlunos();

            indiceEditorAtual =
                alunosFiltrados.findIndex(item => item.id === novaRef.id);

            const novoAluno =
                alunosCarregados.find(item => item.id === novaRef.id);

            if (novoAluno) {
                preencherFormularioAluno(novoAluno);
            }
        }

        return true;
    } catch (erro) {
        console.error(erro);
        studentEditorMessage.textContent = "Não foi possível salvar a ficha.";
        return false;
    }
}

window.salvarAlunoAnterior = async function() {
    const salvo = await salvarAlunoAtual();
    if (!salvo) return;

    if (indiceEditorAtual <= 0) {
        studentEditorMessage.textContent = "Este é o primeiro aluno da lista.";
        return;
    }

    indiceEditorAtual--;
    preencherFormularioAluno(alunosFiltrados[indiceEditorAtual]);
};

window.salvarAlunoProximo = async function() {
    const salvo = await salvarAlunoAtual();
    if (!salvo) return;

    if (
        indiceEditorAtual < 0 ||
        indiceEditorAtual >= alunosFiltrados.length - 1
    ) {
        studentEditorMessage.textContent = "Este é o último aluno da lista.";
        return;
    }

    indiceEditorAtual++;
    preencherFormularioAluno(alunosFiltrados[indiceEditorAtual]);
};

function atualizarPosicaoEditor() {
    if (indiceEditorAtual < 0 || alunosFiltrados.length === 0) {
        studentEditorPosition.textContent = "Novo registro";
        return;
    }

    studentEditorPosition.textContent =
        `${indiceEditorAtual + 1} / ${alunosFiltrados.length}`;
}

window.fecharFichaAluno = async function() {
    studentEditor.classList.add("hidden");
    studentsDatabaseView.classList.remove("hidden");
    await carregarAlunos();
};

/* =========================
   CSV
========================= */

window.alternarImportadorCSV = function() {
    csvImporter.classList.toggle("hidden");
    csvMessage.textContent = "";
};

window.lerCSVSelecionado = function(event) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    if (!window.Papa) {
        csvMessage.textContent = "O leitor de CSV não foi carregado.";
        return;
    }

    csvMessage.textContent = "Lendo arquivo...";
    csvPreview.classList.add("hidden");
    csvPreparado = [];

    window.Papa.parse(
        arquivo,
        {
            header: true,
            skipEmptyLines: "greedy",
            transformHeader: cabecalho => cabecalho.trim(),

            complete:
                resultado =>
                    prepararPreviewCSV(resultado),

            error:
                erro => {
                    console.error(erro);
                    csvMessage.textContent =
                        "Não foi possível ler o CSV.";
                }
        }
    );
};

function prepararPreviewCSV(resultado) {
    const linhas =
        Array.isArray(resultado.data)
            ? resultado.data
            : [];

    const cabecalhos = resultado.meta?.fields || [];

    const emailsExistentes =
        new Set(
            alunosCarregados
                .map(item => normalizarEmail(item.email))
                .filter(Boolean)
        );

    let novos = 0;
    let existentes = 0;
    let invalidos = 0;

    csvPreparado =
        linhas.map((linha, indice) => {
            const nome =
                obterCampo(
                    linha,
                    ["nome", "name", "aluno", "student", "nome completo"]
                );

            const email =
                obterCampo(
                    linha,
                    ["email", "e-mail", "mail"]
                );

            const hskBruto =
                obterCampo(
                    linha,
                    ["nivel_hsk", "nivel hsk", "nível hsk", "hsk", "nivel", "nível"]
                );

            const emailNormalizado = normalizarEmail(email);
            const nivelHSK = normalizarHSK(hskBruto);
            const valido = Boolean(nome?.trim());
            const existente =
                emailNormalizado
                    ? emailsExistentes.has(emailNormalizado)
                    : false;

            if (!valido) invalidos++;
            else if (existente) existentes++;
            else novos++;

            return {
                indice,
                valido,
                existente,
                nome: nome?.trim() || "",
                email: email?.trim() || "",
                emailNormalizado,
                nivelHSK,
                linhaOriginal: linha
            };
        });

    csvTotalRows.textContent =
        `${linhas.length} linha${linhas.length === 1 ? "" : "s"}`;

    csvNewRows.textContent =
        `${novos} novo${novos === 1 ? "" : "s"}`;

    csvExistingRows.textContent =
        `${existentes} existente${existentes === 1 ? "" : "s"}`;

    csvInvalidRows.textContent =
        `${invalidos} inválido${invalidos === 1 ? "" : "s"}`;

    csvHeaders.textContent =
        cabecalhos.length
            ? `Colunas: ${cabecalhos.join(" · ")}`
            : "Nenhum cabeçalho encontrado.";

    csvImportButton.disabled = novos === 0;
    csvPreview.classList.remove("hidden");

    csvMessage.textContent =
        novos
            ? "Prévia pronta."
            : "Não há novos alunos válidos para importar.";
}

window.confirmarImportacaoCSV = async function() {
    if (!dadosUsuarioAtual?.professor) return;

    const novos =
        csvPreparado.filter(item => item.valido && !item.existente);

    if (novos.length === 0) {
        csvMessage.textContent = "Não há novos alunos para importar.";
        return;
    }

    csvImportButton.disabled = true;
    csvImportButton.textContent = "Importando...";

    let importados = 0;
    let erros = 0;

    for (const item of novos) {
        try {
            const ref = doc(collection(db, "alunos"));
            const linha = item.linhaOriginal;

            const historicoImportado =
                interpretarHistoricoCSV(linha);

            const resumoMensalidades =
                calcularResumoMensalidades(historicoImportado);

            const historicoFrequencia =
                gerarHistoricoSabados2026();

            const resumoFrequencia =
                calcularResumoFrequencia(historicoFrequencia);

            await setDoc(
                ref,
                {
                    nome: item.nome,
                    email: item.email,
                    emailNormalizado: item.emailNormalizado,
                    nivelHSK: item.nivelHSK,

                    ativo:
                        interpretarBooleano(
                            obterCampo(linha, ["ativo"]),
                            true
                        ),

                    mensalidades: historicoImportado,
                    primeiroMesRegistrado: resumoMensalidades.primeiroMes,
                    ultimoMesPago: resumoMensalidades.ultimoMesPago,
                    mensalidadesPagas: resumoMensalidades.pagas,
                    mensalidadesPendentes: resumoMensalidades.pendentes,

                    diaPagamentoReferencia:
                        numeroOuNull(
                            obterCampo(
                                linha,
                                ["dia_pagamento_referencia", "dia pagamento referencia"]
                            )
                        ),

                    frequencia: historicoFrequencia,
                    frequenciaInicioEstatisticas:
                        DATA_INICIO_ESTATISTICAS_FREQUENCIA,
                    frequenciaPresencas:
                        resumoFrequencia.presencas,
                    frequenciaFaltas:
                        resumoFrequencia.faltas,
                    frequenciaJustificadas:
                        resumoFrequencia.justificadas,

                    exercicioAtual:
                        obterCampo(
                            linha,
                            ["exercicio_atual", "exercício atual", "exercicio atual"]
                        ),

                    observacoes:
                        obterCampo(
                            linha,
                            ["observacoes", "observações"]
                        ),

                    uidUsuario: null,
                    statusConta: "sem_conta",
                    origem: "csv",
                    dadosImportados: limparObjeto(linha),

                    criadoEm: serverTimestamp(),
                    atualizadoEm: serverTimestamp()
                }
            );

            importados++;
        } catch (erro) {
            console.error(erro);
            erros++;
        }
    }

    csvImportButton.textContent = "Importar novos alunos";
    csvImportButton.disabled = false;

    csvMessage.textContent =
        `${importados} aluno${importados === 1 ? "" : "s"} importado${importados === 1 ? "" : "s"}${erros ? ` · ${erros} erro${erros === 1 ? "" : "s"}` : ""}.`;

    await carregarAlunos();
};

window.limparImportadorCSV = function() {
    const input = document.getElementById("csvFileInput");
    if (input) input.value = "";

    csvPreparado = [];
    csvPreview.classList.add("hidden");
    csvMessage.textContent = "";
};

window.abrirAtualizadorCSV = function() {
    csvUpdatePanel.classList.remove("hidden");
    csvUpdateMessage.textContent = "";
};

window.fecharAtualizadorCSV = function() {
    csvUpdatePanel.classList.add("hidden");
};

window.lerCSVAtualizacao = function(event) {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    if (!window.Papa) {
        csvUpdateMessage.textContent =
            "O leitor de CSV não foi carregado.";
        return;
    }

    csvUpdateMessage.textContent = "Lendo arquivo...";
    csvUpdatePreview.classList.add("hidden");
    csvAtualizacaoPreparado = [];

    window.Papa.parse(
        arquivo,
        {
            header: true,
            skipEmptyLines: "greedy",
            transformHeader: cabecalho => cabecalho.trim(),

            complete:
                resultado =>
                    prepararPreviewAtualizacaoCSV(resultado),

            error:
                erro => {
                    console.error(erro);
                    csvUpdateMessage.textContent =
                        "Não foi possível ler o CSV.";
                }
        }
    );
};

function prepararPreviewAtualizacaoCSV(resultado) {
    const linhas = resultado.data || [];
    const cabecalhos = resultado.meta?.fields || [];

    const porId =
        new Map(
            alunosCarregados.map(aluno => [aluno.id, aluno])
        );

    let encontrados = 0;
    let ausentes = 0;

    csvAtualizacaoPreparado =
        linhas.map(linha => {
            const id =
                obterCampo(
                    linha,
                    ["id", "aluno_id", "alunoid"]
                ).trim();

            const encontrado = porId.has(id);

            if (encontrado) encontrados++;
            else ausentes++;

            return {
                id,
                encontrado,
                linha
            };
        });

    csvUpdateTotal.textContent =
        `${linhas.length} linha${linhas.length === 1 ? "" : "s"}`;

    csvUpdateMatches.textContent =
        `${encontrados} encontrado${encontrados === 1 ? "" : "s"}`;

    csvUpdateMissing.textContent =
        `${ausentes} não encontrado${ausentes === 1 ? "" : "s"}`;

    csvUpdateHeaders.textContent =
        cabecalhos.length
            ? `Colunas: ${cabecalhos.join(" · ")}`
            : "";

    csvUpdateButton.disabled = encontrados === 0;
    csvUpdatePreview.classList.remove("hidden");

    csvUpdateMessage.textContent =
        encontrados
            ? "Prévia pronta."
            : "Nenhum ID do arquivo corresponde ao banco atual.";
}

window.confirmarAtualizacaoCSV = async function() {
    if (!dadosUsuarioAtual?.professor) return;

    const atualizacoes =
        csvAtualizacaoPreparado.filter(item => item.encontrado);

    if (atualizacoes.length === 0) {
        csvUpdateMessage.textContent = "Não há registros para atualizar.";
        return;
    }

    csvUpdateButton.disabled = true;
    csvUpdateButton.textContent = "Atualizando...";

    let sucesso = 0;
    let erros = 0;

    for (const item of atualizacoes) {
        try {
            const alunoAtual =
                alunosCarregados.find(aluno => aluno.id === item.id);

            const dados =
                dadosAlunoAPartirDeCSV(item.linha, alunoAtual);

            await updateDoc(
                doc(db, "alunos", item.id),
                {
                    ...dados,
                    atualizadoEm: serverTimestamp()
                }
            );

            sucesso++;
        } catch (erro) {
            console.error(erro);
            erros++;
        }
    }

    csvUpdateButton.disabled = false;
    csvUpdateButton.textContent = "Atualizar registros";

    csvUpdateMessage.textContent =
        `${sucesso} registro${sucesso === 1 ? "" : "s"} atualizado${sucesso === 1 ? "" : "s"}${erros ? ` · ${erros} erro${erros === 1 ? "" : "s"}` : ""}.`;

    await carregarAlunos();
};

function dadosAlunoAPartirDeCSV(linha, atual) {
    const nome = obterCampo(linha, ["nome"]);
    const email = obterCampo(linha, ["email", "e-mail"]);
    const hsk =
        obterCampo(
            linha,
            ["nivel_hsk", "nivel hsk", "hsk"]
        );

    let mensalidades =
        Array.isArray(atual?.mensalidades)
            ? atual.mensalidades
            : [];

    const historicoCSV =
        obterCampo(
            linha,
            ["historico_mensalidades", "mensalidades_json"]
        );

    if (historicoCSV) {
        try {
            const parsed = JSON.parse(historicoCSV);
            if (Array.isArray(parsed)) mensalidades = parsed;
        } catch (erro) {
            console.warn(
                "Histórico de mensalidades inválido no CSV.",
                erro
            );
        }
    }

    let frequencia =
        Array.isArray(atual?.frequencia)
            ? atual.frequencia
            : gerarHistoricoSabados2026();

    const historicoFrequenciaCSV =
        obterCampo(
            linha,
            ["historico_frequencia", "frequencia_json"]
        );

    if (historicoFrequenciaCSV) {
        try {
            const parsed = JSON.parse(historicoFrequenciaCSV);
            if (Array.isArray(parsed)) frequencia = parsed;
        } catch (erro) {
            console.warn(
                "Histórico de frequência inválido no CSV.",
                erro
            );
        }
    }

    const resumoMensalidades =
        calcularResumoMensalidades(mensalidades);

    const resumoFrequencia =
        calcularResumoFrequencia(frequencia);

    return {
        nome:
            nome !== ""
                ? nome
                : (atual?.nome || ""),

        email:
            email !== ""
                ? email
                : (atual?.email || ""),

        emailNormalizado:
            normalizarEmail(
                email !== ""
                    ? email
                    : atual?.email
            ),

        nivelHSK:
            hsk !== ""
                ? normalizarHSK(hsk)
                : Number(atual?.nivelHSK || 3),

        ativo:
            obterCampo(linha, ["ativo"]) !== ""
                ? interpretarBooleano(
                    obterCampo(linha, ["ativo"]),
                    true
                )
                : (atual?.ativo !== false),

        mensalidades,

        primeiroMesRegistrado:
            resumoMensalidades.primeiroMes,

        ultimoMesPago:
            resumoMensalidades.ultimoMesPago,

        mensalidadesPagas:
            resumoMensalidades.pagas,

        mensalidadesPendentes:
            resumoMensalidades.pendentes,

        diaPagamentoReferencia:
            numeroNullableCSVouAtual(
                linha,
                ["dia_pagamento_referencia"],
                atual?.diaPagamentoReferencia
            ),

        frequencia,

        frequenciaInicioEstatisticas:
            DATA_INICIO_ESTATISTICAS_FREQUENCIA,

        frequenciaPresencas:
            resumoFrequencia.presencas,

        frequenciaFaltas:
            resumoFrequencia.faltas,

        frequenciaJustificadas:
            resumoFrequencia.justificadas,

        exercicioAtual:
            valorCSVouAtual(
                linha,
                ["exercicio_atual"],
                atual?.exercicioAtual
            ),

        observacoes:
            valorCSVouAtual(
                linha,
                ["observacoes", "observações"],
                atual?.observacoes
            ),

        dadosImportados: {
            ...(atual?.dadosImportados || {}),
            ...limparObjeto(linha)
        }
    };
}

window.limparAtualizadorCSV = function() {
    const input =
        document.getElementById("csvUpdateFileInput");

    if (input) input.value = "";

    csvAtualizacaoPreparado = [];
    csvUpdatePreview.classList.add("hidden");
    csvUpdateMessage.textContent = "";
};

window.exportarAlunosCSV = function() {
    if (alunosCarregados.length === 0) {
        studentsMessage.textContent = "Não há alunos para exportar.";
        return;
    }

    if (!window.Papa) {
        studentsMessage.textContent =
            "O gerador de CSV não está disponível.";
        return;
    }

    const linhas =
        alunosCarregados.map(aluno => {
            const resumoMensalidades =
                calcularResumoMensalidadesAluno(aluno);

            const frequencia =
                obterFrequenciaAluno(aluno);

            const resumoFrequencia =
                calcularResumoFrequencia(frequencia);

            return {
                id: aluno.id,
                nome: aluno.nome || "",
                email: aluno.email || "",
                nivel_hsk: Number(aluno.nivelHSK || 3),
                ativo: aluno.ativo !== false ? "sim" : "não",

                status_conta:
                    aluno.uidUsuario
                        ? "vinculada"
                        : (aluno.statusConta || "sem_conta"),

                uid_usuario: aluno.uidUsuario || "",

                primeiro_mes_registrado:
                    resumoMensalidades.primeiroMes || "",

                ultimo_mes_pago:
                    resumoMensalidades.ultimoMesPago || "",

                mensalidades_pagas:
                    resumoMensalidades.pagas,

                mensalidades_pendentes:
                    resumoMensalidades.pendentes,

                dia_pagamento_referencia:
                    aluno.diaPagamentoReferencia ?? "",

                frequencia_inicio_estatisticas:
                    DATA_INICIO_ESTATISTICAS_FREQUENCIA,

                presencas:
                    resumoFrequencia.presencas,

                faltas:
                    resumoFrequencia.faltas,

                faltas_justificadas:
                    resumoFrequencia.justificadas,

                exercicio_atual:
                    aluno.exercicioAtual || "",

                observacoes:
                    aluno.observacoes || "",

                historico_mensalidades:
                    JSON.stringify(
                        Array.isArray(aluno.mensalidades)
                            ? aluno.mensalidades
                            : []
                    ),

                historico_frequencia:
                    JSON.stringify(frequencia)
            };
        });

    const csv =
        window.Papa.unparse(
            linhas,
            { delimiter: ";" }
        );

    const blob =
        new Blob(
            ["\uFEFF", csv],
            { type: "text/csv;charset=utf-8;" }
        );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download =
        `alunos-mandarim-${dataArquivo()}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
};

function interpretarHistoricoCSV(linha) {
    const historico =
        obterCampo(
            linha,
            ["historico_mensalidades", "mensalidades_json"]
        );

    if (historico) {
        try {
            const parsed = JSON.parse(historico);
            if (Array.isArray(parsed)) return parsed;
        } catch (erro) {
            console.warn(
                "Não foi possível interpretar o histórico.",
                erro
            );
        }
    }

    const julho =
        obterCampo(
            linha,
            ["mensalidade julho", "mensalidade_julho"]
        );

    if (
        normalizarTexto(julho).includes("conclu")
    ) {
        return [
            criarMensalidade("2026-05", "paga"),
            criarMensalidade("2026-06", "paga"),
            criarMensalidade("2026-07", "paga"),
            criarMensalidade("2026-08", "pendente"),
            criarMensalidade("2026-09", "pendente")
        ];
    }

    return [];
}

function coletarCamposImportados() {
    const resultado = {};

    studentImportedFields
        .querySelectorAll("[data-imported-key]")
        .forEach(input => {
            resultado[input.dataset.importedKey] = input.value;
        });

    return resultado;
}

function mostrarPainelAtual() {
    sectionPlaceholder.classList.add("hidden");

    if (modoAtual === "professor") {
        studentDashboard.classList.add("hidden");
        teacherDashboard.classList.remove("hidden");
    } else {
        teacherDashboard.classList.add("hidden");
        studentDashboard.classList.remove("hidden");
    }
}

function atualizarModo() {
    if (!dadosUsuarioAtual) return;

    if (modoAtual === "professor") {
        moduleName.textContent = "Professor";
        welcomeTitle.textContent = "Painel do Professor";
        modeDescription.textContent =
            "Planejamento, alunos, avaliações e conteúdo.";
    } else {
        moduleName.textContent = "Aluno";
        welcomeTitle.textContent =
            dadosUsuarioAtual.nome
                ? `你好，${dadosUsuarioAtual.nome}`
                : "你好!";

        modeDescription.textContent =
            `Área do aluno · HSK ${dadosUsuarioAtual.nivelHSK || 1}`;
    }

    mostrarPainelAtual();
}

onAuthStateChanged(
    auth,
    async usuario => {
        if (!usuario) {
            dadosUsuarioAtual = null;
            modoAtual = "aluno";

            loginScreen.classList.remove("hidden");
            appScreen.classList.add("hidden");
            mensagem.textContent = "";

            return;
        }

        try {
            const referencia =
                doc(db, "usuarios", usuario.uid);

            const snap =
                await getDoc(referencia);

            if (!snap.exists()) {
                mensagem.textContent =
                    "Perfil do usuário não encontrado.";

                await signOut(auth);
                return;
            }

            const dados = snap.data();

            if (dados.status === "bloqueado") {
                mensagem.textContent =
                    "Esta conta está bloqueada.";

                await signOut(auth);
                return;
            }

            if (dados.status === "pendente") {
                mensagem.textContent =
                    "Sua conta ainda aguarda aprovação.";

                await signOut(auth);
                return;
            }

            dadosUsuarioAtual = dados;
            modoAtual = "aluno";

            loginScreen.classList.add("hidden");
            appScreen.classList.remove("hidden");

            userInfo.textContent =
                `${dados.email} · HSK ${dados.nivelHSK}`;

            if (dados.professor === true) {
                modeButton.classList.remove("hidden");
                moduleIndicator.classList.remove("hidden");
            } else {
                modeButton.classList.add("hidden");
                moduleIndicator.classList.add("hidden");
            }

            atualizarModo();
        } catch (erro) {
            console.error(erro);
            mensagem.textContent =
                "Erro ao carregar o perfil.";
        }
    }
);

/* =========================
   AUXILIARES
========================= */

function obterValorAluno(
    aluno,
    campoCanonico,
    aliases = []
) {
    if (
        aluno?.[campoCanonico] !== undefined &&
        aluno?.[campoCanonico] !== null &&
        aluno?.[campoCanonico] !== ""
    ) {
        return aluno[campoCanonico];
    }

    const importados = aluno?.dadosImportados || {};

    for (const alias of aliases) {
        const chave =
            Object.keys(importados)
                .find(item =>
                    normalizarCabecalho(item) ===
                    normalizarCabecalho(alias)
                );

        if (chave) return importados[chave];
    }

    return "";
}

function obterCampo(linha, aliases) {
    const mapa = new Map();

    Object.keys(linha || {})
        .forEach(chave => {
            mapa.set(
                normalizarCabecalho(chave),
                linha[chave]
            );
        });

    for (const alias of aliases) {
        const valor =
            mapa.get(
                normalizarCabecalho(alias)
            );

        if (
            valor !== undefined &&
            valor !== null &&
            String(valor).trim() !== ""
        ) {
            return String(valor).trim();
        }
    }

    return "";
}

function normalizarCabecalho(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function normalizarTexto(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function normalizarEmail(valor) {
    return String(valor || "")
        .trim()
        .toLowerCase();
}

function normalizarHSK(valor) {
    const numero =
        Number(
            String(valor || "")
                .replace(/[^0-9]/g, "")
        );

    return [1, 2, 3, 4, 5, 6].includes(numero)
        ? numero
        : 3;
}

function normalizarStatusMensalidade(valor) {
    const texto = normalizarTexto(valor);

    if (
        texto === "paga" ||
        texto === "pago" ||
        texto === "concluida" ||
        texto === "concluido"
    ) {
        return "paga";
    }

    return "pendente";
}

function normalizarStatusFrequencia(valor) {
    const texto = normalizarTexto(valor);

    if (
        texto === "presente" ||
        texto === "presenca" ||
        texto === "presença"
    ) {
        return "presente";
    }

    if (
        texto === "justificada" ||
        texto === "falta justificada" ||
        texto === "justificado"
    ) {
        return "justificada";
    }

    return "falta";
}

function ordenarMensalidades(a, b) {
    return String(a.competencia || "")
        .localeCompare(
            String(b.competencia || "")
        );
}

function ordenarFrequencia(a, b) {
    return String(a.data || "")
        .localeCompare(
            String(b.data || "")
        );
}

function formatarCompetencia(competencia) {
    if (!/^\d{4}-\d{2}$/.test(competencia || "")) {
        return competencia || "—";
    }

    const [ano, mes] = competencia.split("-");

    const nomes = [
        "janeiro",
        "fevereiro",
        "março",
        "abril",
        "maio",
        "junho",
        "julho",
        "agosto",
        "setembro",
        "outubro",
        "novembro",
        "dezembro"
    ];

    return `${nomes[Number(mes) - 1]} de ${ano}`;
}

function gerarIdLocal(prefixo = "id") {
    if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
    ) {
        return window.crypto.randomUUID();
    }

    return (
        prefixo +
        "_" +
        Date.now() +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 10)
    );
}

function interpretarBooleano(valor, padrao = true) {
    const texto = normalizarTexto(valor).trim();

    if (!texto) return padrao;

    if (
        ["sim", "true", "1", "ativo", "yes"]
            .includes(texto)
    ) {
        return true;
    }

    if (
        ["nao", "false", "0", "inativo", "no"]
            .includes(texto)
    ) {
        return false;
    }

    return padrao;
}

function numeroOuNull(valor) {
    if (
        valor === "" ||
        valor === null ||
        valor === undefined
    ) {
        return null;
    }

    const numero =
        Number(
            String(valor).replace(",", ".")
        );

    return Number.isFinite(numero)
        ? numero
        : null;
}

function limparObjeto(objeto) {
    const resultado = {};

    Object.entries(objeto || {})
        .forEach(([chave, valor]) => {
            const chaveLimpa =
                String(chave).trim() || "campo";

            resultado[chaveLimpa] =
                valor === undefined || valor === null
                    ? ""
                    : String(valor);
        });

    return resultado;
}

function valorCSVouAtual(
    linha,
    aliases,
    atual
) {
    const valor =
        obterCampo(linha, aliases);

    return valor !== ""
        ? valor
        : (atual ?? "");
}

function numeroNullableCSVouAtual(
    linha,
    aliases,
    atual
) {
    const valor =
        obterCampo(linha, aliases);

    return valor !== ""
        ? numeroOuNull(valor)
        : (atual ?? null);
}

function formatarDataISO(data) {
    return (
        data.getFullYear() +
        "-" +
        String(data.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(data.getDate()).padStart(2, "0")
    );
}

function escaparHTML(valor) {
    return String(valor)
        .replace(
            /[&<>'"]/g,
            caractere => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#39;",
                '"': "&quot;"
            })[caractere]
        );
}

function escaparAtributo(valor) {
    return escaparHTML(
        String(valor ?? "")
    );
}

function dataArquivo() {
    const agora = new Date();

    const ano = agora.getFullYear();
    const mes =
        String(agora.getMonth() + 1)
            .padStart(2, "0");

    const dia =
        String(agora.getDate())
            .padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}
