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


/* =========================================
   LOGIN
========================================= */

window.entrar = async function(event) {

    event.preventDefault();

    const email =
        document.getElementById("email").value.trim();

    const senha =
        document.getElementById("password").value;

    mensagem.textContent = "Entrando...";

    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            senha
        );

    } catch (erro) {

        console.error(erro);

        mensagem.textContent =
            "E-mail ou senha incorretos.";

    }

};


/* =========================================
   CRIAR CONTA
========================================= */

window.criarConta = async function() {

    const email =
        document.getElementById("email").value.trim();

    const senha =
        document.getElementById("password").value;


    if (!email || !senha) {

        mensagem.textContent =
            "Preencha e-mail e senha.";

        return;

    }


    if (senha.length < 6) {

        mensagem.textContent =
            "A senha deve ter pelo menos 6 caracteres.";

        return;

    }


    mensagem.textContent =
        "Criando conta...";


    try {

        const credencial =
            await createUserWithEmailAndPassword(
                auth,
                email,
                senha
            );


        await setDoc(
            doc(
                db,
                "usuarios",
                credencial.user.uid
            ),
            {

                email,

                nome: "",

                nivelHSK: 3,

                professor: false,

                aluno: true,

                status: "aprovado",

                criadoEm: serverTimestamp()

            }
        );


        mensagem.textContent =
            "Conta criada com sucesso.";


    } catch (erro) {

        console.error(erro);


        if (
            erro.code ===
            "auth/email-already-in-use"
        ) {

            mensagem.textContent =
                "Este e-mail já possui uma conta.";

        }

        else if (
            erro.code ===
            "auth/invalid-email"
        ) {

            mensagem.textContent =
                "E-mail inválido.";

        }

        else {

            mensagem.textContent =
                "Não foi possível criar a conta.";

        }

    }

};


/* =========================================
   SAIR
========================================= */

window.sair = async function() {

    await signOut(auth);

};


/* =========================================
   TROCAR MÓDULO
========================================= */

window.alternarModo = function() {

    if (!dadosUsuarioAtual?.professor) {
        return;
    }


    modoAtual =
        modoAtual === "aluno"
            ? "professor"
            : "aluno";


    atualizarModo();

};


/* =========================================
   ABRIR SEÇÃO
========================================= */

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


/* =========================================
   CARREGAR ALUNOS
========================================= */

window.carregarAlunos = async function() {

    if (!dadosUsuarioAtual?.professor) {
        return;
    }


    studentsMessage.textContent =
        "Carregando alunos...";


    studentsList.innerHTML = "";


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "usuarios"
                )
            );


        const alunos =
            snapshot.docs

                .map(
                    item => ({
                        uid: item.id,
                        ...item.data()
                    })
                )

                .filter(
                    item =>
                        item.aluno === true &&
                        item.professor !== true
                )

                .sort(
                    (a, b) =>
                        (
                            a.nome ||
                            a.email ||
                            ""
                        )
                        .localeCompare(
                            b.nome ||
                            b.email ||
                            ""
                        )
                );


        if (alunos.length === 0) {

            studentsMessage.textContent =
                "Ainda não há alunos cadastrados.";

            return;

        }


        studentsMessage.textContent =
            `${alunos.length} aluno${alunos.length === 1 ? "" : "s"} cadastrado${alunos.length === 1 ? "" : "s"}.`;


        alunos.forEach(aluno => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "student-row";


            const nome =
                aluno.nome?.trim() ||
                "Aluno sem nome";


            const status =
                aluno.status ||
                "aprovado";


            card.innerHTML = `
                <div class="student-main">

                    <div class="student-avatar">
                        ${nome.charAt(0).toUpperCase()}
                    </div>

                    <div>

                        <strong>
                            ${escaparHTML(nome)}
                        </strong>

                        <span>
                            ${escaparHTML(
                                aluno.email ||
                                "Sem e-mail"
                            )}
                        </span>

                    </div>

                </div>


                <div class="student-controls">

                    <label>

                        <span>
                            Nível
                        </span>

                        <select data-role="nivel">

                            ${[1, 2, 3, 4, 5, 6]
                                .map(
                                    n =>
                                    `
                                        <option
                                            value="${n}"
                                            ${
                                                Number(
                                                    aluno.nivelHSK
                                                ) === n
                                                    ? "selected"
                                                    : ""
                                            }
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

                        <span>
                            Acesso
                        </span>

                        <select data-role="status">

                            <option
                                value="aprovado"
                                ${
                                    status === "aprovado"
                                        ? "selected"
                                        : ""
                                }
                            >
                                Aprovado
                            </option>

                            <option
                                value="pendente"
                                ${
                                    status === "pendente"
                                        ? "selected"
                                        : ""
                                }
                            >
                                Pendente
                            </option>

                            <option
                                value="bloqueado"
                                ${
                                    status === "bloqueado"
                                        ? "selected"
                                        : ""
                                }
                            >
                                Bloqueado
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
                .querySelector(
                    ".save-student-button"
                )
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


                        const novoStatus =
                            card.querySelector(
                                '[data-role="status"]'
                            ).value;


                        botao.disabled = true;

                        botao.textContent =
                            "Salvando...";


                        try {

                            await updateDoc(
                                doc(
                                    db,
                                    "usuarios",
                                    aluno.uid
                                ),
                                {
                                    nivelHSK,
                                    status: novoStatus
                                }
                            );


                            botao.textContent =
                                "Salvo ✓";


                            setTimeout(
                                () => {

                                    botao.textContent =
                                        "Salvar";

                                    botao.disabled =
                                        false;

                                },
                                1200
                            );

                        } catch (erro) {

                            console.error(erro);


                            botao.textContent =
                                "Erro";


                            studentsMessage.textContent =
                                "Não foi possível alterar esse aluno. Verifique as regras do Firestore.";


                            setTimeout(
                                () => {

                                    botao.textContent =
                                        "Salvar";

                                    botao.disabled =
                                        false;

                                },
                                1600
                            );

                        }

                    }
                );


            studentsList.appendChild(
                card
            );

        });


    } catch (erro) {

        console.error(erro);


        studentsMessage.textContent =
            "Não foi possível carregar os alunos. Se a lista não abrir, ajustaremos as regras do Firestore na próxima etapa.";

    }

};


/* =========================================
   PROTEÇÃO DE TEXTO
========================================= */

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


/* =========================================
   VOLTAR AO PAINEL
========================================= */

window.voltarAoPainel = function() {

    sectionPlaceholder.classList.add(
        "hidden"
    );


    mostrarPainelAtual();

};


/* =========================================
   MOSTRAR PAINEL ATUAL
========================================= */

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

    }

    else {

        teacherDashboard.classList.add(
            "hidden"
        );


        studentDashboard.classList.remove(
            "hidden"
        );

    }

}


/* =========================================
   ATUALIZAR MÓDULO
========================================= */

function atualizarModo() {

    if (!dadosUsuarioAtual) {
        return;
    }


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

    }

    else {

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


/* =========================================
   ESTADO DA AUTENTICAÇÃO
========================================= */

onAuthStateChanged(
    auth,
    async (usuario) => {

        /* ---------------------------------
           DESCONECTADO
        --------------------------------- */

        if (!usuario) {

            dadosUsuarioAtual =
                null;


            modoAtual =
                "aluno";


            loginScreen.classList.remove(
                "hidden"
            );


            appScreen.classList.add(
                "hidden"
            );


            mensagem.textContent =
                "";


            return;

        }


        /* ---------------------------------
           CONECTADO
        --------------------------------- */

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


            /* CONTA BLOQUEADA */

            if (
                dados.status ===
                "bloqueado"
            ) {

                mensagem.textContent =
                    "Esta conta está bloqueada.";


                await signOut(auth);


                return;

            }


            /* CONTA PENDENTE */

            if (
                dados.status ===
                "pendente"
            ) {

                mensagem.textContent =
                    "Sua conta ainda aguarda aprovação.";


                await signOut(auth);


                return;

            }


            /* CONTA APROVADA */

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


            /* PROFESSOR */

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

            }

            /* SOMENTE ALUNO */

            else {

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
