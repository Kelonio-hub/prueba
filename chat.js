// Nueva función para limpiar chat
function limpiarChat() {
    if (confirm('¿Estás seguro de que quieres limpiar el chat?')) {
        document.getElementById('chatMensajes').innerHTML = '';
        showToast('Chat limpiado.', 'success');
    }
}
async function enviarMensaje() {
    if (!emailSesion) return;
    const input = document.getElementById('chatInput');
    const mensaje = input.value.trim();
    if (!mensaje) return;
    agregarMensaje(mensaje, 'user');
    input.value = '';
    let respuesta = '';
    const esAdmin = emailSesion === EMAIL_ADMIN;
    const mensajeLower = mensaje.toLowerCase();
    if (mensajeLower.includes('perfil') || mensajeLower.includes('mis libros')) {
        respuesta = esAdmin ? 'Como administrador, usa el botón ADMIN para ver el historial de reservas y préstamos.' : 'Ve a "Mi Perfil" para ver tus reservas y préstamos.';
    } else if (mensajeLower.includes('reservar')) {
        respuesta = 'Busca un libro disponible y haz clic en "Reservar". El administrador confirmará la recogida.';
    } else {
        respuesta = `Hola ${esAdmin ? '(Administrador)' : ''}, ¿en qué te ayudo? Prueba con "perfil" o "reservar".`;
    }
    setTimeout(() => agregarMensaje(respuesta, 'bot'), 1000);
}
function agregarMensaje(texto, tipo) {
    const div = document.getElementById('chatMensajes');
    const p = document.createElement('p');
    p.className = `mensaje ${tipo}`;
    p.textContent = texto;
    div.appendChild(p);
    div.scrollTop = div.scrollHeight;
}