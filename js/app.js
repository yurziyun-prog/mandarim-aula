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

const mensagem = document.getElementById("loginMessage");

window.entrar = async function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("password").value;

    mensagem.textContent = "Entrando...";

    try {
        const credencial = await signInWithEmailAndPassword(
            auth,
            email,
            senha
        );

        const referencia = doc(db, "usuarios", credencial.user.uid);
        const usuarioSnap = await getDoc(referencia);

        if (!usuarioSnap.exists()) {
            mensagem.textContent = "Perfil do usuário não encontrado.";
            await signOut(auth);
            return;
        }

        const dados = usuarioSnap.data();

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

        mensagem.textContent = "Login realizado com sucesso.";

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

        await setDoc(doc(db, "usuarios", credencial.user.uid), {
            email: email,
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

onAuthStateChanged(auth, (usuario) => {
    if (usuario) {
        console.log("Usuário conectado:", usuario.email);
    }
});
