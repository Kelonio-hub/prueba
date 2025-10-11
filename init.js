async function initApp() {
    // FIX: Cargar tema INMEDIATAMENTE para que splash herede data-theme y CSS vars
    loadTheme();
    await cargarDatos();
    const emailSesionGuardada = sessionStorage.getItem('emailSesion');
    if (emailSesionGuardada) {
        emailSesion = emailSesionGuardada;
        document.getElementById('adminBadge').style.display = 'none'; // Siempre oculto
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        if (emailSesion === EMAIL_ADMIN) {
            document.getElementById('seccionIzquierda').style.display = 'none';
            document.getElementById('seccionDerecha').style.display = 'none';
            document.getElementById('adminHistorial').style.display = 'block';
            document.getElementById('btnSolicitudes').style.display = 'none';
            document.getElementById('btnReseñas').style.display = 'none';
            document.getElementById('btnLecturasPrestadas').style.display = 'none';
            updateNotificationBadge();
            showAdminTab('tareas');
        } else {
            document.getElementById('seccionIzquierda').style.display = 'block';
            document.getElementById('seccionDerecha').style.display = 'block';
            document.getElementById('adminHistorial').style.display = 'none';
            document.getElementById('btnSolicitudes').style.display = 'inline-block';
            document.getElementById('btnReseñas').style.display = 'inline-block';
            document.getElementById('btnLecturasPrestadas').style.display = 'inline-block';
            inicializarProgreso(emailSesion); // Gamificación
            cargarPerfil();
        }
        cargarCatalogo();
    }
    // Nuevo: Event listener para cerrar modales con tecla ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            if (document.getElementById('searchModal').style.display === 'block') {
                cerrarModal();
            } else if (document.getElementById('solicitudesModal').style.display === 'block') {
                cerrarModalSolicitudes();
            } else if (document.getElementById('reseñasModal').style.display === 'block') {
                cerrarModalReseñas();
            } else if (document.getElementById('lecturasMasPrestadasModal').style.display === 'block') {
                cerrarModalLecturasPrestadas();
            } else if (document.getElementById('progresoModal').style.display === 'block') {
                cerrarModalProgreso();
            } else if (document.getElementById('colorModal').style.display === 'block') {
                closeColorModal();
            }
        }
    });
    setTimeout(hideSplash, 3000);
}
initApp();
window.onclick = function(event) {
    const searchModal = document.getElementById('searchModal');
    const solicitudesModal = document.getElementById('solicitudesModal');
    const reseñasModal = document.getElementById('reseñasModal');
    const lecturasPrestadasModal = document.getElementById('lecturasMasPrestadasModal');
    const progresoModal = document.getElementById('progresoModal');
    const colorModal = document.getElementById('colorModal');
    if (event.target === searchModal) {
        cerrarModal();
    } else if (event.target === solicitudesModal) {
        cerrarModalSolicitudes();
    } else if (event.target === reseñasModal) {
        cerrarModalReseñas();
    } else if (event.target === lecturasPrestadasModal) {
        cerrarModalLecturasPrestadas();
    } else if (event.target === progresoModal) {
        cerrarModalProgreso();
    } else if (event.target === colorModal) {
        closeColorModal();
    }
}