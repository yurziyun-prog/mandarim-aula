function entrar(event) {
    event.preventDefault();

    const mensagem = document.getElementById("loginMessage");

    mensagem.textContent =
        "Login ainda não conectado. Firebase será configurado na próxima etapa.";
}
