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
let csvPreparado = [];
let alunosPorEmail = new Map();

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
const studentsList = document.getElementById("studentsList");
const studentsMessage = document.getElementById("studentsMessage");
const csvImporter = document.getElementById("csvImporter");
const csvPreview = document.getElementById("csvPreview");
const csvMessage = document.getElementById("csvMessage");
const csvTotalRows = document.getElementById("csvTotalRows");
const csvNewRows = document.getElementById("csvNewRows");
const csvExistingRows = document.getElementById("csvExistingRows");
const csvInvalidRows = document.getElementById("csvInvalidRows");
const csvHeaders = document.getElementById("csvHeaders");
const csvImportButton = document.getElementById("csvImportButton");

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
        const credencial = await createUserWithEmailAndPassword(
            auth,
            email,
            senha
        );

        await setDoc(
            doc(db, "usuarios", credencial.user.uid),
            {
                email,
                emailNormalizado: normalizarEmail(email),
                nome: "",
                nivelHSK: 3,
                professor: false,
                aluno: true,
                status: "aprovado",
                alunoId: null,
                criadoEm: serverTimestamp()
            }
        );

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

    modoAtual =
        modoAtual === "aluno"
            ? "professor"
            : "aluno";

    atualizarModo();
};

window.abrirSecao = function(titulo) {
    studentDashboard.classList.add("hidden");
    teacherDashboard.classList.add("hidden");
    sectionPlaceholder.classList.remove("hidden");
    genericSection.classList.add("hidden");
    studentsSection.classList.add("hidden");

    if (
        titulo === "Alunos" &&
        modoAtual === "professor"
    ) {
        studentsSection.classList.remove("hidden");
        carregarAlunos();
        return;
    }

    genericSection.classList.remove("hidden");
    sectionTitle.textContent = titulo;
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
                usuariosPorEmail.set(
                    email,
                    {
                        uid: item.id,
                        ...dados
                    }
                );
            }
        });

        const alunos = alunosSnap.docs
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

        alunosPorEmail = new Map();

        for (const aluno of alunos) {
            const emailNormalizado = normalizarEmail(
                aluno.emailNormalizado ||
                aluno.email
            );

            if (emailNormalizado) {
                alunosPorEmail.set(
                    emailNormalizado,
                    aluno
                );
            }

            if (
                !aluno.uidUsuario &&
                emailNormalizado &&
                usuariosPorEmail.has(emailNormalizado)
            ) {
                const usuario =
                    usuariosPorEmail.get(emailNormalizado);

                await updateDoc(
                    doc(db, "alunos", aluno.id),
                    {
                        uidUsuario: usuario.uid,
                        statusConta: "vinculada",
                        atualizadoEm: serverTimestamp()
                    }
                );

                await updateDoc(
                    doc(db, "usuarios", usuario.uid),
                    {
                        alunoId: aluno.id,
                        nivelHSK: Number(
                            aluno.nivelHSK ||
                            usuario.nivelHSK ||
                            3
                        )
                    }
                );

                aluno.uidUsuario = usuario.uid;
                aluno.statusConta = "vinculada";
            }
        }

        if (alunos.length === 0) {
            studentsMessage.textContent =
                "Ainda não há fichas de alunos. Você já pode importar sua planilha em CSV.";
            return;
        }

        studentsMessage.textContent =
            `${alunos.length} aluno${alunos.length === 1 ? "" : "s"} no banco pedagógico.`;

        alunos.forEach(renderizarAluno);

    } catch (erro) {
        console.error(erro);

        studentsMessage.textContent =
            "Não foi possível carregar o banco de alunos.";
    }
};

function renderizarAluno(aluno) {
    const card = document.createElement("article");
    card.className = "student-row";

    const nome =
        aluno.nome?.trim() ||
        "Aluno sem nome";

    const email =
        aluno.email?.trim() ||
        "Sem e-mail";

    const vinculado =
        Boolean(aluno.uidUsuario);

    card.innerHTML = `
        <div class="student-main">

            <div class="student-avatar">
                ${escaparHTML(
                    nome.charAt(0).toUpperCase() || "学"
                )}
            </div>

            <div>
                <strong>
                    ${escaparHTML(nome)}
                </strong>

                <span>
                    ${escaparHTML(email)}
                </span>

                <div class="student-account-badge ${vinculado ? "linked" : "unlinked"}">
                    ${vinculado ? "Conta vinculada" : "Sem conta vinculada"}
                </div>
            </div>

        </div>

        <div class="student-controls">

            <label>
                <span>Nível</span>

                <select data-role="nivel">
                    ${[1, 2, 3, 4, 5, 6]
                        .map(
                            n => `
                                <option
                                    value="${n}"
                                    ${Number(aluno.nivelHSK) === n ? "selected" : ""}
                                >
                                    HSK ${n}
                                </option>
                            `
                        )
                        .join("")
                    }
                </select>
            </label>

            <label>
                <span>Situação</span>

                <select data-role="ativo">

                    <option
                        value="true"
                        ${aluno.ativo !== false ? "selected" : ""}
                    >
                        Ativo
                    </option>

                    <option
                        value="false"
                        ${aluno.ativo === false ? "selected" : ""}
                    >
                        Inativo
                    </option>

                </select>
            </label>

            <button
                type="button"
                class="save-student-button"
            >
                Salvar
            </button>

        </div>
    `;

    card
        .querySelector(".save-student-button")
        .addEventListener(
            "click",
            async () => {

                const botao =
                    card.querySelector(
                        ".save-student-button"
                    );

                const nivelHSK =
                    Number(
                        card.querySelector(
                            '[data-role="nivel"]'
                        ).value
                    );

                const ativo =
                    card.querySelector(
                        '[data-role="ativo"]'
                    ).value === "true";

                botao.disabled = true;
                botao.textContent = "Salvando...";

                try {
                    await updateDoc(
                        doc(
                            db,
                            "alunos",
                            aluno.id
                        ),
                        {
                            nivelHSK,
                            ativo,
                            atualizadoEm: serverTimestamp()
                        }
                    );

                    if (aluno.uidUsuario) {
                        await updateDoc(
                            doc(
                                db,
                                "usuarios",
                                aluno.uidUsuario
                            ),
                            {
                                nivelHSK
                            }
                        );
                    }

                    botao.textContent = "Salvo ✓";

                    setTimeout(
                        () => {
                            botao.textContent = "Salvar";
                            botao.disabled = false;
                        },
                        1200
                    );

                } catch (erro) {
                    console.error(erro);

                    botao.textContent = "Erro";

                    setTimeout(
                        () => {
                            botao.textContent = "Salvar";
                            botao.disabled = false;
                        },
                        1600
                    );
                }
            }
        );

    studentsList.appendChild(card);
}

window.alternarImportadorCSV = function() {
    csvImporter.classList.toggle("hidden");
    csvMessage.textContent = "";
};

window.lerCSVSelecionado = function(event) {
    const arquivo = event.target.files?.[0];

    if (!arquivo) return;

    if (!window.Papa) {
        csvMessage.textContent =
            "O leitor de CSV não foi carregado.";
        return;
    }

    csvMessage.textContent =
        "Lendo arquivo...";

    csvPreview.classList.add("hidden");
    csvPreparado = [];

    window.Papa.parse(
        arquivo,
        {
            header: true,
            skipEmptyLines: "greedy",

            transformHeader:
                cabecalho =>
                    cabecalho.trim(),

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

async function prepararPreviewCSV(resultado) {
    const linhas =
        Array.isArray(resultado.data)
            ? resultado.data
            : [];

    const cabecalhos =
        resultado.meta?.fields ||
        [];

    try {
        const snapshot =
            await getDocs(
                collection(
                    db,
                    "alunos"
                )
            );

        alunosPorEmail =
            new Map();

        snapshot.docs.forEach(
            item => {
                const dados =
                    item.data();

                const email =
                    normalizarEmail(
                        dados.emailNormalizado ||
                        dados.email
                    );

                if (email) {
                    alunosPorEmail.set(
                        email,
                        {
                            id: item.id,
                            ...dados
                        }
                    );
                }
            }
        );

    } catch (erro) {
        console.error(erro);

        csvMessage.textContent =
            "Não foi possível comparar o CSV com o banco atual.";

        return;
    }

    let novos = 0;
    let existentes = 0;
    let invalidos = 0;

    csvPreparado =
        linhas.map(
            (linha, indice) => {

                const nome =
                    obterCampo(
                        linha,
                        [
                            "nome",
                            "name",
                            "aluno",
                            "student",
                            "nome completo"
                        ]
                    );

                const email =
                    obterCampo(
                        linha,
                        [
                            "email",
                            "e-mail",
                            "e_mail",
                            "mail"
                        ]
                    );

                const hskBruto =
                    obterCampo(
                        linha,
                        [
                            "nivelhsk",
                            "nívelhsk",
                            "nivel hsk",
                            "nível hsk",
                            "hsk",
                            "nivel",
                            "nível"
                        ]
                    );

                const emailNormalizado =
                    normalizarEmail(email);

                const nivelHSK =
                    normalizarHSK(hskBruto);

                const valido =
                    Boolean(
                        nome ||
                        emailNormalizado
                    );

                const existente =
                    emailNormalizado
                        ? alunosPorEmail.has(
                            emailNormalizado
                        )
                        : false;

                if (!valido) {
                    invalidos++;
                } else if (existente) {
                    existentes++;
                } else {
                    novos++;
                }

                return {
                    indice,
                    valido,
                    existente,
                    nome:
                        nome?.trim() ||
                        "",
                    email:
                        email?.trim() ||
                        "",
                    emailNormalizado,
                    nivelHSK,
                    linhaOriginal:
                        linha
                };
            }
        );

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
            ? `Colunas encontradas: ${cabecalhos.join(" · ")}`
            : "Nenhum cabeçalho reconhecido.";

    csvImportButton.disabled =
        novos === 0;

    csvPreview.classList.remove(
        "hidden"
    );

    csvMessage.textContent =
        novos > 0
            ? "Prévia pronta. Registros com e-mail já existente serão preservados e não serão sobrescritos."
            : "Não há novos alunos válidos para importar.";
}

window.confirmarImportacaoCSV = async function() {
    if (!dadosUsuarioAtual?.professor) return;

    const novos =
        csvPreparado.filter(
            item =>
                item.valido &&
                !item.existente
        );

    if (novos.length === 0) {
        csvMessage.textContent =
            "Não há novos alunos para importar.";
        return;
    }

    csvImportButton.disabled = true;
    csvImportButton.textContent =
        "Importando...";

    csvMessage.textContent =
        `Importando ${novos.length} aluno${novos.length === 1 ? "" : "s"}...`;

    let importados = 0;
    let erros = 0;

    for (const item of novos) {
        try {
            const alunoRef =
                doc(
                    collection(
                        db,
                        "alunos"
                    )
                );

            await setDoc(
                alunoRef,
                {
                    nome:
                        item.nome,

                    email:
                        item.email,

                    emailNormalizado:
                        item.emailNormalizado,

                    nivelHSK:
                        item.nivelHSK,

                    uidUsuario:
                        null,

                    statusConta:
                        "sem_conta",

                    ativo:
                        true,

                    origem:
                        "csv",

                    dadosImportados:
                        limparObjeto(
                            item.linhaOriginal
                        ),

                    criadoEm:
                        serverTimestamp(),

                    atualizadoEm:
                        serverTimestamp()
                }
            );

            importados++;

        } catch (erro) {
            console.error(
                "Erro ao importar linha",
                item.indice + 2,
                erro
            );

            erros++;
        }
    }

    csvImportButton.textContent =
        "Importar novos alunos";

    csvImportButton.disabled =
        false;

    csvMessage.textContent =
        `${importados} aluno${importados === 1 ? "" : "s"} importado${importados === 1 ? "" : "s"}${erros ? ` · ${erros} erro${erros === 1 ? "" : "s"}` : ""}.`;

    await carregarAlunos();
};

window.limparImportadorCSV = function() {
    const input =
        document.getElementById(
            "csvFileInput"
        );

    if (input) {
        input.value = "";
    }

    csvPreparado = [];

    csvPreview.classList.add(
        "hidden"
    );

    csvMessage.textContent =
        "";
};

function obterCampo(linha, aliases) {
    const mapa =
        new Map();

    Object.keys(
        linha ||
        {}
    ).forEach(
        chave => {
            mapa.set(
                normalizarCabecalho(chave),
                linha[chave]
            );
        }
    );

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
            return String(valor);
        }
    }

    return "";
}

function normalizarCabecalho(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .replace(
            /[^a-z0-9]+/g,
            " "
        )
        .trim();
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
                .replace(
                    /[^0-9]/g,
                    ""
                )
        );

    return [1, 2, 3, 4, 5, 6]
        .includes(numero)
            ? numero
            : 3;
}

function limparObjeto(objeto) {
    const resultado = {};

    Object.entries(
        objeto ||
        {}
    ).forEach(
        ([chave, valor]) => {

            const chaveLimpa =
                chave.trim() ||
                "campo";

            resultado[chaveLimpa] =
                valor === undefined ||
                valor === null
                    ? ""
                    : String(valor);
        }
    );

    return resultado;
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

window.voltarAoPainel = function() {
    sectionPlaceholder.classList.add(
        "hidden"
    );

    mostrarPainelAtual();
};

function mostrarPainelAtual() {
    sectionPlaceholder.classList.add(
        "hidden"
    );

    if (
        modoAtual ===
        "professor"
    ) {
        studentDashboard.classList.add(
            "hidden"
        );

        teacherDashboard.classList.remove(
            "hidden"
        );
    } else {
        teacherDashboard.classList.add(
            "hidden"
        );

        studentDashboard.classList.remove(
            "hidden"
        );
    }
}

function atualizarModo() {
    if (!dadosUsuarioAtual) return;

    if (
        modoAtual ===
        "professor"
    ) {
        moduleName.textContent =
            "Professor";

        welcomeTitle.textContent =
            "Painel do Professor";

        modeDescription.textContent =
            "Planejamento, alunos, avaliações e conteúdo.";
    } else {
        moduleName.textContent =
            "Aluno";

        welcomeTitle.textContent =
            dadosUsuarioAtual.nome
                ? `你好，${dadosUsuarioAtual.nome}`
                : "你好！";

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

            loginScreen.classList.remove(
                "hidden"
            );

            appScreen.classList.add(
                "hidden"
            );

            mensagem.textContent = "";

            return;
        }

        try {
            const referencia =
                doc(
                    db,
                    "usuarios",
                    usuario.uid
                );

            const snap =
                await getDoc(
                    referencia
                );

            if (!snap.exists()) {
                mensagem.textContent =
                    "Perfil do usuário não encontrado.";

                await signOut(auth);

                return;
            }

            const dados =
                snap.data();

            if (
                dados.status ===
                "bloqueado"
            ) {
                mensagem.textContent =
                    "Esta conta está bloqueada.";

                await signOut(auth);

                return;
            }

            if (
                dados.status ===
                "pendente"
            ) {
                mensagem.textContent =
                    "Sua conta ainda aguarda aprovação.";

                await signOut(auth);

                return;
            }

            dadosUsuarioAtual =
                dados;

            modoAtual =
                "aluno";

            loginScreen.classList.add(
                "hidden"
            );

            appScreen.classList.remove(
                "hidden"
            );

            userInfo.textContent =
                `${dados.email} · HSK ${dados.nivelHSK}`;

            if (
                dados.professor ===
                true
            ) {
                modeButton.classList.remove(
                    "hidden"
                );

                moduleIndicator.classList.remove(
                    "hidden"
                );
            } else {
                modeButton.classList.add(
                    "hidden"
                );

                moduleIndicator.classList.add(
                    "hidden"
                );
            }

            atualizarModo();

        } catch (erro) {
            console.error(erro);

            mensagem.textContent =
                "Erro ao carregar o perfil.";
        }
    }
);
