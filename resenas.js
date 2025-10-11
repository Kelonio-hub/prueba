function abrirModalReseñas() {
    document.getElementById('reseñasModal').style.display = 'block';
    cargarMisReseñas();
    inicializarContadorReseñas();
    cargarLibrosParaReseñas(); // Nueva
    // Reset rating stars
    document.querySelectorAll('input[name="rating"]').forEach(radio => radio.checked = false);
}
function cerrarModalReseñas() {
    document.getElementById('reseñasModal').style.display = 'none';
}
function cargarMisReseñas() {
    const misReseñas = reseñas.filter(r => r.email === emailSesion);
    const div = document.getElementById('misReseñasEnviadas');
    div.innerHTML = `<h4>Mis Reseñas Enviadas (${misReseñas.length})</h4><div class="lista-libros">${misReseñas.map(r => `
        <div class="item-enviado">
            <strong>${r.titulo} - Enviada el: ${new Date(r.fecha).toLocaleDateString('es-ES')}</strong><br>
            <div class="rating-display">${'★'.repeat(r.rating || 0)}</div>
            <p>${r.texto}</p>
            <button class="btn-anular" onclick="eliminarReseña('${emailSesion}', '${r.fecha}')">Eliminar</button>
        </div>
    `).join('') || '<p>No has enviado reseñas aún.</p>'}</div>`;
}
function inicializarContadorReseñas() {
    const textarea = document.getElementById('reseñaTextarea');
    textarea.value = '';
    const palabras = 0;
    document.getElementById('contadorReseñas').textContent = `${palabras}/500 palabras`;
    textarea.addEventListener('input', function() {
        const texto = this.value;
        const palabras = texto.trim() === '' ? 0 : texto.trim().split(/\s+/).length;
        document.getElementById('contadorReseñas').textContent = `${palabras}/500 palabras`;
        if (palabras > 500) {
            this.style.borderColor = 'var(--danger)';
        } else {
            this.style.borderColor = 'var(--border-color)';
        }
    });
}
function enviarReseña() {
    const select = document.getElementById('libroReseñaSelect');
    const textarea = document.getElementById('reseñaTextarea');
    const ratingInput = document.querySelector('input[name="rating"]:checked');
    const idLibro = select.value;
    const texto = textarea.value.trim();
    const rating = ratingInput ? parseInt(ratingInput.value) : null;
    if (!idLibro) {
        showToast('Por favor, selecciona un libro para reseñar.', 'warning');
        return;
    }
    if (!rating) {
        showToast('Por favor, selecciona una valoración (1-5 estrellas).', 'warning');
        return;
    }
    if (texto === '') {
        showToast('Por favor, escribe tu reseña antes de enviar.', 'warning');
        return;
    }
    const palabras = texto.split(/\s+/).length;
    if (palabras > 500) {
        showToast('La reseña excede el límite de 500 palabras. Por favor, acórtala.', 'warning');
        return;
    }
    const fecha = new Date().toISOString();
    const libro = catalogo.find(l => l.idRegistro === idLibro);
    reseñas.push({email: emailSesion, texto, fecha, idRegistro: idLibro, titulo: libro ? libro.titulo : 'Desconocido', rating});
    // Gamificación: +20 pts por reseña (fijo, sin depender del rating)
    aplicarPuntos(emailSesion, 20, 'Reseña enviada');
    guardarDatos();
    select.value = '';
    textarea.value = '';
    document.getElementById('contadorReseñas').textContent = '0/500 palabras';
    document.querySelectorAll('input[name="rating"]').forEach(radio => radio.checked = false);
    showToast('¡Reseña enviada exitosamente! Gracias por compartir tu opinión. (+20 pts)', 'success');
    updateNotificationBadge();
    cargarMisReseñas();
}
function eliminarReseña(emailUsuario, fechaReseña) {
    if (confirm('¿Estás seguro de eliminar esta reseña?')) {
        reseñas = reseñas.filter(r => !(r.email === emailUsuario && r.fecha === fechaReseña));
        guardarDatos();
        showToast('Reseña eliminada.', 'success');
        cargarMisReseñas();
        updateNotificationBadge();
    }
}