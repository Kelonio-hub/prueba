function abrirModalLecturasPrestadas() {
    document.getElementById('lecturasMasPrestadasModal').style.display = 'block';
    cargarLecturasMasPrestadas();
}
function cerrarModalLecturasPrestadas() {
    document.getElementById('lecturasMasPrestadasModal').style.display = 'none';
}
function cargarLecturasMasPrestadas() {
    let historial = [];
    Object.keys(reservas).forEach(email => {
        (reservas[email] || []).forEach(r => {
            historial.push({email, titulo: r.titulo, fechaPrestamo: ''});
        });
    });
    Object.keys(prestamos).forEach(email => {
        (prestamos[email] || []).forEach(p => {
            if (p.fechaPrestamo) { // Solo préstamos reales
                historial.push({email, titulo: p.titulo, fechaPrestamo: p.fechaPrestamo});
            }
        });
    });
    const conteo = {};
    historial.forEach(item => {
        if (item.fechaPrestamo) {
            conteo[item.titulo] = (conteo[item.titulo] || 0) + 1;
        }
    });
    const sorted = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const listaDiv = document.getElementById('listaLecturasPrestadas');
    if (sorted.length === 0) {
        listaDiv.innerHTML = '<p>No hay préstamos registrados aún.</p>';
        return;
    }
    // Encontrar detalles completos de cada libro (título -> objeto completo)
    const topLibros = sorted.map(([titulo, count]) => {
        const libro = catalogo.find(l => l.titulo === titulo);
        return { libro, count };
    }).filter(item => item.libro); // Solo si existe en catálogo

    listaDiv.innerHTML = `<ul>${topLibros.map(({libro, count}, index) => {
        const esAdmin = emailSesion === EMAIL_ADMIN;
        let botonReserva = '';
        if (!esAdmin && libro.disponible) {
            botonReserva = `<button class="btn-reserva" onclick="reservarLibro('${libro.idRegistro}', '${libro.titulo.replace(/'/g, "\\'")}')">Reservar 📖</button>`;
        } else if (!esAdmin) {
            botonReserva = '<span class="estado-no-disponible">No disponible</span>';
        } else {
            botonReserva = '<span class="estado-no-disponible">Admin: No reserva</span>';
        }
        return `
            <li class="lectura-prestada-item">
                <strong>${index + 1}. ${libro.titulo}</strong> por ${libro.autor}<br>
                <span>Prestado ${count} ${count === 1 ? 'vez' : 'veces'}</span><br>
                ${botonReserva}
            </li>
        `;
    }).join('')}</ul>`;
}