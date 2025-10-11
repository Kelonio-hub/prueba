function inicializarProgreso(email) {
    if (!userProgress[email]) {
        userProgress[email] = { puntos: 0, nivel: 1, penalizacionesAplicadas: {} }; // penalizacionesAplicadas para flags de retrasos/daños
    }
    actualizarProgreso(email);
}
function calcularNivel(puntos) {
    for (let i = 0; i < niveles.length; i++) {
        if (puntos >= niveles[i].min && puntos <= niveles[i].max) {
            return { index: i + 1, ...niveles[i] };
        }
    }
    return niveles[niveles.length - 1]; // Nivel máximo
}
function actualizarProgreso(email) {
    if (!email || email === EMAIL_ADMIN) return;
    const progreso = userProgress[email];
    const { index: nivelIdx, nombre, icon } = calcularNivel(progreso.puntos);
    const nivelActual = document.getElementById('nivelBadge');
    const puntosDisplay = document.getElementById('puntosDisplay');
    const progressFill = document.getElementById('progressFill');
    nivelActual.textContent = `${nombre} ${icon}`;
    puntosDisplay.textContent = `${progreso.puntos} puntos`;
    // Progreso hacia siguiente nivel (por simplicidad, % basado en rango actual)
    const nivelActualData = niveles[nivelIdx - 1];
    const progresoSiguiente = Math.min(100, ((progreso.puntos - nivelActualData.min) / (nivelActualData.max - nivelActualData.min + 1)) * 100);
    progressFill.style.width = `${progresoSiguiente}%`;
    // Si subió de nivel, toast
    if (progreso.nivel < nivelIdx) {
        progreso.nivel = nivelIdx;
        showToast(`¡Felicidades! Subiste a ${nombre} ${icon} 🎉`, 'success');
    }
}
function aplicarPuntos(email, puntos, razon = '') {
    if (!email || email === EMAIL_ADMIN) return;
    const progreso = userProgress[email];
    progreso.puntos += puntos;
    if (puntos < 0) {
        progreso.penalizacionesAplicadas[Date.now()] = { razon, puntos }; // Log simple
    }
    guardarDatos();
    actualizarProgreso(email);
}
function abrirModalProgreso() {
    document.getElementById('progresoModal').style.display = 'block';
}
function cerrarModalProgreso() {
    document.getElementById('progresoModal').style.display = 'none';
}