function getAdminToken() {
    if (emailSesion !== EMAIL_ADMIN) return null;
    return prompt('Ingresa tu token GitHub para actualizar (solo admin):') || null;
}
async function cargarApprovedEmailsFromGist() {
    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`);
        if (!response.ok) throw new Error('Gist no encontrado o error API');
        const gist = await response.json();
        const content = gist.files[GIST_FILENAME]?.content;
        if (!content) throw new Error('Archivo JSON no encontrado');
        approvedEmails = JSON.parse(content);
        console.log(`Emails cargados de Gist: ${approvedEmails.length} total`);
        localStorage.setItem('approvedEmails', JSON.stringify(approvedEmails));
    } catch (error) {
        console.error('Error cargando Gist:', error);
        const local = localStorage.getItem('approvedEmails');
        approvedEmails = local ? JSON.parse(local) : [];
        showToast('Error al cargar lista global. Usando lista local.', 'warning');
    }
}
async function guardarApprovedEmailsToGist() {
    const token = getAdminToken();
    if (!token) return;
    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    [GIST_FILENAME]: { content: JSON.stringify(approvedEmails, null, 2) }
                }
            })
        });
        if (!response.ok) throw new Error('Error al actualizar Gist');
        console.log('Lista actualizada en Gist');
        showToast('¡Lista sincronizada globalmente!', 'success');
    } catch (error) {
        console.error('Error guardando Gist:', error);
        showToast('Falla al guardar. Verifica token e ID.', 'error');
    }
}
async function cargarDatos() {
    await cargarApprovedEmailsFromGist();
    const reservasGuardadas = localStorage.getItem('reservasBiblioteca');
    if (reservasGuardadas) reservas = JSON.parse(reservasGuardadas);
    const prestamosGuardados = localStorage.getItem('prestamosBiblioteca');
    if (prestamosGuardados) prestamos = JSON.parse(prestamosGuardados);
    const solicitudesGuardadas = localStorage.getItem('solicitudesBiblioteca');
    if (solicitudesGuardadas) solicitudes = JSON.parse(solicitudesGuardadas);
    const reseñasGuardadas = localStorage.getItem('reseñasBiblioteca');
    if (reseñasGuardadas) reseñas = JSON.parse(reseñasGuardadas);
    // Cargar colores personalizados
    const customSaved = localStorage.getItem('customColors');
    if (customSaved) {
        customColors = JSON.parse(customSaved);
        applyCustomColorsFromStorage();
    }
    // Gamificación: Cargar progreso
    const progressSaved = localStorage.getItem('progressBiblioteca');
    userProgress = progressSaved ? JSON.parse(progressSaved) : {};
}
function guardarDatos() {
    localStorage.setItem('reservasBiblioteca', JSON.stringify(reservas));
    localStorage.setItem('prestamosBiblioteca', JSON.stringify(prestamos));
    localStorage.setItem('solicitudesBiblioteca', JSON.stringify(solicitudes));
    localStorage.setItem('reseñasBiblioteca', JSON.stringify(reseñas));
    localStorage.setItem('approvedEmails', JSON.stringify(approvedEmails));
    // Guardar colores personalizados
    localStorage.setItem('customColors', JSON.stringify(customColors));
    // Gamificación: Guardar progreso
    localStorage.setItem('progressBiblioteca', JSON.stringify(userProgress));
}
async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    if (!email || !email.endsWith('@educa.madrid.org')) {
        showToast('Email inválido. Debe terminar en @educa.madrid.org', 'error');
        return;
    }
    await cargarApprovedEmailsFromGist();
    if (email !== EMAIL_ADMIN && !approvedEmails.includes(email)) {
        showToast('Email no aprobado por el administrador.', 'error');
        return;
    }
    emailSesion = email;
    sessionStorage.setItem('emailSesion', email);
    // Cambio: No mostrar badge para admin (ya está en modo admin directo)
    document.getElementById('adminBadge').style.display = 'none'; // Siempre oculto ahora
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    if (email === EMAIL_ADMIN) {
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
        inicializarProgreso(email); // Gamificación
        cargarPerfil();
    }
    cargarCatalogo();
    actualizarSugerenciasBusqueda();
}
function logout() {
    emailSesion = null;
    sessionStorage.removeItem('emailSesion');
    document.getElementById('app').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('loginEmail').value = '';
    document.getElementById('adminBadge').style.display = 'none';
    document.getElementById('adminHistorial').style.display = 'none';
    document.getElementById('seccionIzquierda').style.display = 'none';
    document.getElementById('seccionDerecha').style.display = 'none';
    document.getElementById('btnSolicitudes').style.display = 'none';
    document.getElementById('btnReseñas').style.display = 'none';
    document.getElementById('btnLecturasPrestadas').style.display = 'none';
    document.getElementById('adminTabContent').innerHTML = '';
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));
    cerrarModal();
    cerrarModalSolicitudes();
    cerrarModalReseñas();
    cerrarModalLecturasPrestadas();
    cerrarModalProgreso();
}