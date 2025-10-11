async function initApp() {
    console.log('Iniciando initApp...'); // Depuración
    try {
        loadTheme();
        console.log('Cargando datos...');
        await cargarDatos();
        console.log('Datos cargados');
        const emailSesionGuardada = sessionStorage.getItem('emailSesion');
        if (emailSesionGuardada) {
            emailSesion = emailSesionGuardada;
            document.getElementById('adminBadge').style.display = 'none';
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
                inicializarProgreso(emailSesion);
                cargarPerfil();
            }
            cargarCatalogo();
        } else {
            console.log('No hay sesión activa, mostrando loginSection');
            document.getElementById('loginSection').style.display = 'block';
            document.getElementById('app').style.display = 'none';
        }
    } catch (error) {
        console.error('Error en initApp:', error);
        showToast('Error al inicializar la aplicación', 'error');
        document.getElementById('loginSection').style.display = 'block'; // Mostrar login en caso de error
    }
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
};