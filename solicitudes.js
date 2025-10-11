function abrirModalSolicitudes() {
    document.getElementById('solicitudesModal').style.display = 'block';
    cargarMisSolicitudes();
    inicializarContadorSolicitudes();
}
function cerrarModalSolicitudes() {
    document.getElementById('solicitudesModal').style.display = 'none';
}
function cargarMisSolicitudes() {
    const misSolicitudes = solicitudes.filter(s => s.email === emailSesion);
    const div = document.getElementById('misSolicitudesEnviadas');
    div.innerHTML = `<h4>Mis Solicitudes Enviadas (${misSolicitudes.length})</h4><div class="lista-libros">${misSolicitudes.map(s => `
        <div class="item-enviado">
            <strong>Enviada el: ${new Date(s.fecha).toLocaleDateString('es-ES')}</strong><br>
            <p>${s.texto}</p>
            <button class="btn-anular" onclick="eliminarSolicitudUsuario('${s.fecha}')">Eliminar</button>
        </div>
    `).join('') || '<p>No has enviado solicitudes aún.</p>'}</div>`;
}
function inicializarContadorSolicitudes() {
    const textarea = document.getElementById('solicitudTextarea');
    textarea.value = '';
    const palabras = 0;
    document.getElementById('contador').textContent = `${palabras}/500 palabras`;
    textarea.addEventListener('input', function() {
        const texto = this.value;
        const palabras = texto.trim() === '' ? 0 : texto.trim().split(/\s+/).length;
        document.getElementById('contador').textContent = `${palabras}/500 palabras`;
        if (palabras > 500) {
            this.style.borderColor = 'var(--danger)';
        } else {
            this.style.borderColor = 'var(--border-color)';
        }
    });
}
function enviarSolicitud() {
    const textarea = document.getElementById('solicitudTextarea');
    const texto = textarea.value.trim();
    if (texto === '') {
        showToast('Por favor, escribe tu solicitud antes de enviar.', 'warning');
        return;
    }
    const palabras = texto.split(/\s+/).length;
    if (palabras > 500) {
        showToast('La solicitud excede el límite de 500 palabras. Por favor, acórtala.', 'warning');
        return;
    }
    const fecha = new Date().toISOString();
    solicitudes.push({email: emailSesion, texto, fecha});
    // Gamificación: +10 pts por solicitud
    aplicarPuntos(emailSesion, 10, 'Solicitud enviada');
    guardarDatos();
    textarea.value = '';
    document.getElementById('contador').textContent = '0/500 palabras';
    showToast('¡Solicitud enviada exitosamente! La biblioteca revisará tu petición. (+10 pts)', 'success');
    updateNotificationBadge();
    cargarMisSolicitudes();
}
function eliminarSolicitudUsuario(fechaSolicitud) {
    if (confirm('¿Estás seguro de eliminar esta solicitud?')) {
        solicitudes = solicitudes.filter(s => !(s.email === emailSesion && s.fecha === fechaSolicitud));
        guardarDatos();
        showToast('Solicitud eliminada.', 'success');
        cargarMisSolicitudes();
        updateNotificationBadge();
    }
}