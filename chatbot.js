// chatbot.js
async function enviarMensaje() {
    const input = document.getElementById('chatInput');
    const mensaje = input.value.trim();
    if (!mensaje) return;
    agregarMensaje(mensaje, 'user');
    input.value = '';
    input.disabled = true;
    try {
        const respuesta = 'Hola, ¿en qué te ayudo?';
        setTimeout(() => {
            agregarMensaje(respuesta, 'bot');
            input.disabled = false;
            input.focus();
        }, 1000);
    } catch (error) {
        agregarMensaje('Error al conectar con Hipat-IA. Intenta de nuevo.', 'bot');
        input.disabled = false;
        input.focus();
    }
}

function agregarMensaje(texto, tipo) {
    const div = document.getElementById('chatMensajes');
    const p = document.createElement('p');
    p.className = `mensaje ${tipo}`;
    p.textContent = texto;
    div.appendChild(p);
    requestAnimationFrame(() => {
        div.scrollTop = div.scrollHeight;
    });
}