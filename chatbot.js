// Función para agregar un mensaje al chat
function agregarMensaje(texto, tipo) {
    const div = document.getElementById('chatMensajes');
    const p = document.createElement('p');
    p.className = `mensaje ${tipo}`;
    p.innerHTML = DOMPurify.sanitize(texto);
    div.appendChild(p);
    requestAnimationFrame(() => {
        div.scrollTop = div.scrollHeight;
    });
}

// Función para enviar un mensaje al chatbot
async function enviarMensaje() {
    const input = document.getElementById('chatInput');
    const mensaje = input.value.trim();
    if (!mensaje) return;
    agregarMensaje(mensaje, 'user');
    input.value = '';
    input.disabled = true;
    agregarMensaje('Procesando...', 'bot'); // Indicador de carga
    try {
        // Respuesta estática (puedes integrar una API real aquí)
        const respuesta = 'Hola, ¿en qué te ayudo?';
        setTimeout(() => {
            // Eliminar el mensaje de "Procesando..."
            const mensajes = document.getElementById('chatMensajes').getElementsByClassName('mensaje bot');
            if (mensajes.length > 0) mensajes[mensajes.length - 1].remove();
            agregarMensaje(respuesta, 'bot');
            input.disabled = false;
            input.focus();
        }, 1000);
    } catch (error) {
        // Eliminar el mensaje de "Procesando..."
        const mensajes = document.getElementById('chatMensajes').getElementsByClassName('mensaje bot');
        if (mensajes.length > 0) mensajes[mensajes.length - 1].remove();
        agregarMensaje('Error al conectar con Hipat-IA. Intenta de nuevo.', 'bot');
        input.disabled = false;
        input.focus();
    }
}

export { enviarMensaje, agregarMensaje };