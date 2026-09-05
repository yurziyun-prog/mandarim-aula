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
            nome: "",
            nivelHSK: 3,
            professor: false,
            aluno: true,
            status: "aprovado",
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
    sectionTitle.textContent = titulo;
};

window.voltarAoPainel = function() {
    sectionPlaceholder.classList.add("hidden");
    mostrarPainelAtual();
};

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
        modeDescription.textContent = "Planejamento, alunos, avaliações e conteúdo.";
    } else {
        moduleName.textContent = "Aluno";
        welcomeTitle.textContent = dadosUsuarioAtual.nome
            ? `你好，${dadosUsuarioAtual.nome}`
            : "你好！";
        modeDescription.textContent = `Área do aluno · HSK ${dadosUsuarioAtual.nivelHSK || 1}`;
    }
    mostrarPainelAtual();
}

onAuthStateChanged(auth, async (usuario) => {
    if (!usuario) {
        dadosUsuarioAtual = null;
        modoAtual = "aluno";
        loginScreen.classList.remove("hidden");
        appScreen.classList.add("hidden");
        mensagem.textContent = "";
        return;
    }
    try {
        const referencia = doc(db, "usuarios", usuario.uid);
        const snap = await getDoc(referencia);
        if (!snap.exists()) {
            mensagem.textContent = "Perfil do usuário não encontrado.";
            await signOut(auth);
            return;
        }
        const dados = snap.data();
        if (dados.status === "bloqueado") {
            mensagem.textContent = "Esta conta está bloqueada.";
            await signOut(auth);
            return;
        }
        if (dados.status === "pendente") {
            mensagem.textContent = "Sua conta ainda aguarda aprovação.";
            await signOut(auth);
            return;
        }
        dadosUsuarioAtual = dados;
        modoAtual = "aluno";
        loginScreen.classList.add("hidden");
        appScreen.classList.remove("hidden");
        userInfo.textContent = `${dados.email} · HSK ${dados.nivelHSK}`;
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
        mensagem.textContent = "Erro ao carregar o perfil.";
    }
});
