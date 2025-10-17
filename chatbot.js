/**
 * Adds a message to the chat interface.
 * @param {string} texto - The message text to display.
 * @param {string} tipo - The type of message ('user' or 'bot').
 */
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

/**
 * Sends a user message to the chatbot and displays a response.
 * Handles input validation, disables input during processing, and simulates a bot response.
 */
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