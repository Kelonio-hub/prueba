function getPendingTasksCount() {
    let countReservas = 0;
    Object.keys(reservas).forEach(email => {
        countReservas += (reservas[email] || []).length;
    });
    let todosPrestamos = [];
    Object.keys(prestamos).forEach(email => {
        (prestamos[email] || []).forEach(p => todosPrestamos.push({email, ...p}));
    });
    let countRetrasados = todosPrestamos.filter(p => new Date() > new Date(p.fechaDevolucion) && !p.devuelto).length;
    return countReservas + countRetrasados;
}
function updateNotificationBadge() {
    if (emailSesion !== EMAIL_ADMIN) return;
    const count = getPendingTasksCount();
    const countElement = document.getElementById('notificationCount');
    if (count > 0) {
        countElement.textContent = count;
        countElement.style.display = 'inline-flex';
    } else {
        countElement.style.display = 'none';
    }
}
function mostrarHistorialAdmin() {
    document.getElementById('seccionIzquierda').style.display = 'none';
    document.getElementById('seccionDerecha').style.display = 'none';
    document.getElementById('adminHistorial').style.display = 'block';
    document.getElementById('btnSolicitudes').style.display = 'none';
    document.getElementById('btnReseñas').style.display = 'none';
    document.getElementById('btnLecturasPrestadas').style.display = 'none';
    updateNotificationBadge();
    showAdminTab('tareas');
}
function showAdminTab(tabId) {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));
    const activeTab = Array.from(tabs).find(tab => tab.onclick.toString().includes(tabId));
    if (activeTab) activeTab.classList.add('active');
    const contentDiv = document.getElementById('adminTabContent');
    if (tabId === 'tareas') {
        contentDiv.innerHTML = getTareasPendientes();
    } else if (tabId === 'historial') {
        contentDiv.innerHTML = getHistorialCompleto();
    } else if (tabId === 'correos') {
        contentDiv.innerHTML = getGestionCorreos();
        cargarApprovedEmails();
    } else if (tabId === 'solicitudes') {
        contentDiv.innerHTML = getSolicitudesLibros();
    }
}
function getTareasPendientes() {
    let tareas = '<h3>Tareas Pendientes</h3>';
    let todasReservas = [];
    Object.keys(reservas).forEach(email => {
        (reservas[email] || []).forEach(r => todasReservas.push({email, ...r}));
    });
    let todosPrestamos = [];
    Object.keys(prestamos).forEach(email => {
        (prestamos[email] || []).forEach(p => todosPrestamos.push({email, ...p}));
    });
    let retrasados = todosPrestamos.filter(p => new Date() > new Date(p.fechaDevolucion) && !p.devuelto);
    tareas += '<h4>Libros Reservados Pendientes de Recoger</h4>';
    tareas += `<div class="lista-libros">${todasReservas.map(r => `
        <div class="libro-perfil">
            <div class="franja franja-azul"></div>
            <div class="contenido-franja">
                <strong>${r.titulo}</strong> por ${r.email} (ID: ${r.idRegistro})<br>
                <span class="fecha">Reservado el: ${new Date(r.fechaReserva).toLocaleDateString('es-ES')}</span>
                <button class="btn-recoger" onclick="adminRecogerLibro('${r.email}', '${r.idRegistro}', '${r.titulo.replace(/'/g, "\\'")}')">Recoger</button>
                <button class="btn-anular" onclick="anularReserva('${r.email}', '${r.idRegistro}', '${r.titulo.replace(/'/g, "\\'")}')">Anular</button>
            </div>
        </div>
    `).join('') || '<p>No hay reservas pendientes.</p>'}</div>`;
    tareas += '<h4>Libros Retrasados</h4>';
    tareas += `<div class="lista-libros">${retrasados.map(p => `
        <div class="libro-perfil">
            <div class="franja franja-roja"></div>
            <div class="contenido-franja">
                <strong>${p.titulo}</strong> por ${p.email} (ID: ${p.idRegistro})<br>
                <span class="fecha">Prestado el: ${new Date(p.fechaPrestamo).toLocaleDateString('es-ES')}</span><br>
                <span class="fecha">Debería devolverse antes de: ${new Date(p.fechaDevolucion).toLocaleDateString('es-ES')}</span>
                <span class="retrasado">Retrasado</span>
                <button class="btn-devolver" onclick="adminDevolverLibro('${p.email}', '${p.idRegistro}', '${p.titulo.replace(/'/g, "\\'")}')">Marcar Devuelto</button>
            </div>
        </div>
    `).join('') || '<p>No hay libros retrasados.</p>'}</div>`;
    return tareas;
}
function getHistorialCompleto() {
    let historialHtml = '<h3>Historial Completo</h3>';
    let historial = [];
    Object.keys(reservas).forEach(email => {
        (reservas[email] || []).forEach(r => {
            historial.push({
                email,
                titulo: r.titulo,
                idRegistro: r.idRegistro,
                fechaReserva: r.fechaReserva || '',
                fechaPrestamo: '',
                fechaDevolucion: '',
                estado: 'Reservado'
            });
        });
    });
    Object.keys(prestamos).forEach(email => {
        (prestamos[email] || []).forEach(p => {
            historial.push({
                email,
                titulo: p.titulo,
                idRegistro: p.idRegistro,
                fechaReserva: p.fechaReserva || '',
                fechaPrestamo: p.fechaPrestamo || '',
                fechaDevolucion: p.fechaDevolucion || '',
                estado: p.devuelto ? 'Devuelto' : 'Prestado'
            });
        });
    });
    historial.sort((a, b) => {
        let valueA, valueB;
        switch (sortColumn) {
            case 'titulo':
                valueA = a.titulo.toLowerCase();
                valueB = b.titulo.toLowerCase();
                break;
            case 'email':
                valueA = a.email.toLowerCase();
                valueB = b.email.toLowerCase();
                break;
            case 'fechaReserva':
                valueA = a.fechaReserva || '9999-12-31';
                valueB = b.fechaReserva || '9999-12-31';
                break;
            case 'fechaPrestamo':
                valueA = a.fechaPrestamo || '9999-12-31';
                valueB = b.fechaPrestamo || '9999-12-31';
                break;
            case 'fechaDevolucion':
                valueA = a.fechaDevolucion || '9999-12-31';
                valueB = b.fechaDevolucion || '9999-12-31';
                break;
            case 'estado':
                valueA = a.estado.toLowerCase();
                valueB = b.estado.toLowerCase();
                break;
            default:
                valueA = a.idRegistro.toLowerCase();
                valueB = b.idRegistro.toLowerCase();
        }
        if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    const pageSize = 25;
    const totalPages = Math.ceil(historial.length / pageSize) || 1;
    const start = (currentPageHistorial - 1) * pageSize;
    const end = start + pageSize;
    const paginatedHistorial = historial.slice(start, end);
    const paginationHtml = `
        <div class="pagination">
            <button ${currentPageHistorial === 1 ? 'disabled' : ''} onclick="changePageHistorial(${currentPageHistorial - 1})">&lt;</button>
            <span>Página ${currentPageHistorial}/${totalPages}</span>
            <button ${currentPageHistorial === totalPages ? 'disabled' : ''} onclick="changePageHistorial(${currentPageHistorial + 1})">&gt;</button>
        </div>
    `;
    historialHtml += paginationHtml;
    historialHtml += `<table>
        <thead>
            <tr>
                <th onclick="ordenarHistorial('email')" class="sort-arrow ${sortColumn === 'email' ? sortDirection : ''}">Usuario</th>
                <th onclick="ordenarHistorial('titulo')" class="sort-arrow ${sortColumn === 'titulo' ? sortDirection : ''}">Título</th>
                <th onclick="ordenarHistorial('idRegistro')" class="sort-arrow ${sortColumn === 'idRegistro' ? sortDirection : ''}">ID Registro</th>
                <th onclick="ordenarHistorial('fechaReserva')" class="sort-arrow ${sortColumn === 'fechaReserva' ? sortDirection : ''}">Fecha Reserva</th>
                <th onclick="ordenarHistorial('fechaPrestamo')" class="sort-arrow ${sortColumn === 'fechaPrestamo' ? sortDirection : ''}">Fecha Préstamo</th>
                <th onclick="ordenarHistorial('fechaDevolucion')" class="sort-arrow ${sortColumn === 'fechaDevolucion' ? sortDirection : ''}">Fecha Devolución</th>
                <th onclick="ordenarHistorial('estado')" class="sort-arrow ${sortColumn === 'estado' ? sortDirection : ''}">Estado</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
            ${paginatedHistorial.length > 0 ? paginatedHistorial.map(item => {
                const retrasado = item.estado === 'Prestado' && item.fechaDevolucion && new Date() > new Date(item.fechaDevolucion);
                return `
                    <tr>
                        <td>${item.email}</td>
                        <td>${item.titulo}</td>
                        <td>${item.idRegistro}</td>
                        <td>${item.fechaReserva ? new Date(item.fechaReserva).toLocaleDateString('es-ES') : '-'}</td>
                        <td>${item.fechaPrestamo ? new Date(item.fechaPrestamo).toLocaleDateString('es-ES') : '-'}</td>
                        <td>${item.fechaDevolucion ? new Date(item.fechaDevolucion).toLocaleDateString('es-ES') : '-'}</td>
                        <td>${retrasado ? '<span class="retrasado">Retrasado</span>' : item.estado}</td>
                        <td>
                            ${item.estado === 'Reservado' ? `
                                <button class="btn-recoger" onclick="adminRecogerLibro('${item.email}', '${item.idRegistro}', '${item.titulo.replace(/'/g, "\\'")}')">Prestado</button>
                                <button class="btn-anular" onclick="anularReserva('${item.email}', '${item.idRegistro}', '${item.titulo.replace(/'/g, "\\'")}')">Anular</button>
                            ` : ''}
                            ${item.estado === 'Prestado' ? `
                                <button class="btn-devolver" onclick="adminDevolverLibro('${item.email}', '${item.idRegistro}', '${item.titulo.replace(/'/g, "\\'")}')">Devolver</button>
                            ` : ''}
                            <button onclick="exportarHistorial()">Exportar CSV 📥</button>
                        </td>
                    </tr>
                `;
            }).join('') : '<tr><td colspan="8">No hay registros.</td></tr>'}
        </tbody>
    </table>`;
    historialHtml += paginationHtml;
    // Estadísticas (sin cambios, pero con tema)
    const prestamosPorAnno = {};
    historial.forEach(item => {
        if (item.fechaPrestamo) {
            const date = new Date(item.fechaPrestamo);
            const anno = date.getFullYear();
            prestamosPorAnno[anno] = (prestamosPorAnno[anno] || 0) + 1;
        }
    });
    const sortedAnnos = Object.entries(prestamosPorAnno).sort((a, b) => b[1] - a[1]);
    historialHtml += '<h4>Estadísticas de Préstamos por Año</h4><ul>';
    sortedAnnos.forEach(([anno, count]) => {
        historialHtml += `<li>${anno}: ${count} préstamos</li>`;
    });
    historialHtml += '</ul>';
    const prestamosPorMes = {};
    historial.forEach(item => {
        if (item.fechaPrestamo) {
            const date = new Date(item.fechaPrestamo);
            const mes = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
            prestamosPorMes[mes] = (prestamosPorMes[mes] || 0) + 1;
        }
    });
    const sortedMeses = Object.entries(prestamosPorMes).sort((a, b) => b[1] - a[1]);
    historialHtml += '<h4>Estadísticas de Préstamos por Mes</h4><ul>';
    sortedMeses.forEach(([mes, count]) => {
        historialHtml += `<li>${mes}: ${count} préstamos</li>`;
    });
    historialHtml += '</ul>';
    historialHtml += getLibrosMasPrestados(historial);
    return historialHtml;
}
// Nueva: Exportar historial a CSV
function exportarHistorial() {
    const historial = []; // Lógica similar a getHistorialCompleto
    Object.keys(reservas).forEach(email => {
        (reservas[email] || []).forEach(r => {
            historial.push({
                email, titulo: r.titulo, idRegistro: r.idRegistro, fechaReserva: r.fechaReserva, fechaPrestamo: '', fechaDevolucion: '', estado: 'Reservado'
            });
        });
    });
    Object.keys(prestamos).forEach(email => {
        (prestamos[email] || []).forEach(p => {
            historial.push({
                email, titulo: p.titulo, idRegistro: p.idRegistro, fechaReserva: p.fechaReserva || '', fechaPrestamo: p.fechaPrestamo || '', fechaDevolucion: p.fechaDevolucion || '', estado: p.devuelto ? 'Devuelto' : 'Prestado'
            });
        });
    });
    const csv = 'Usuario,Título,ID Registro,Fecha Reserva,Fecha Préstamo,Fecha Devolución,Estado\n' + historial.map(h => `${h.email},"${h.titulo}",${h.idRegistro},"${h.fechaReserva}","${h.fechaPrestamo}","${h.fechaDevolucion}",${h.estado}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historial_biblioteca.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    showToast('Historial exportado como CSV.', 'success');
}
// Resto de funciones (sin cambios mayores, pero con showToast donde había alert)
function getLibrosMasPrestados(historial) {
    const conteo = {};
    historial.forEach(item => {
        if (item.fechaPrestamo) {
            conteo[item.titulo] = (conteo[item.titulo] || 0) + 1;
        }
    });
    const sorted = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 5);
    let html = '<h4>Libros Más Prestados</h4><ul>';
    sorted.forEach(([titulo, count]) => {
        html += `<li>${titulo}: ${count} veces</li>`;
    });
    html += '</ul>';
    return html;
}
function changePageHistorial(newPage) {
    currentPageHistorial = newPage;
    showAdminTab('historial');
}
function getGestionCorreos() {
    return `
        <h3>Gestión de Correos Aprobados</h3>
        <input type="email" id="newEmail" placeholder="Agregar correo manualmente">
        <button onclick="addEmail()">Agregar</button>
        <input type="file" id="emailFile" accept=".csv,.xlsx">
        <button onclick="importEmails()">Importar desde archivo</button>
        <button onclick="cargarApprovedEmailsFromGist(); setTimeout(cargarApprovedEmails, 500);">🔄 Cargar Lista Global (de Gist)</button>
        <button onclick="guardarApprovedEmailsToGist();">💾 Actualizar Global (a Gist)</button>
        <input type="text" id="emailSearch" placeholder="Buscar correo" oninput="filterEmails()">
        <button onclick="selectAllEmails()">Seleccionar todos</button>
        <button onclick="deselectAllEmails()">Deseleccionar todos</button>
        <button onclick="deleteSelectedEmails()">Eliminar Correos seleccionados</button>
        <div id="approvedEmailPaginationTop" class="pagination"></div>
        <table id="approvedEmailTable">
            <thead>
                <tr>
                    <th onclick="ordenarCorreos('email')" class="sort-arrow ${sortColumnEmails === 'email' ? sortDirectionEmails : ''}">Correo</th>
                    <th onclick="ordenarCorreos('prestados')" class="sort-arrow ${sortColumnEmails === 'prestados' ? sortDirectionEmails : ''}">Libros Prestados</th>
                    <th onclick="ordenarCorreos('reservas')" class="sort-arrow ${sortColumnEmails === 'reservas' ? sortDirectionEmails : ''}">En Reserva</th>
                    <th onclick="ordenarCorreos('porDevolver')" class="sort-arrow ${sortColumnEmails === 'porDevolver' ? sortDirectionEmails : ''}">Por Devolver</th>
                    <th onclick="ordenarCorreos('retrasados')" class="sort-arrow ${sortColumnEmails === 'retrasados' ? sortDirectionEmails : ''}">Retrasados</th>
                    <th onclick="ordenarCorreos('rango')" class="sort-arrow ${sortColumnEmails === 'rango' ? sortDirectionEmails : ''}">Rango Lector</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody id="approvedEmailList"></tbody>
        </table>
        <div id="approvedEmailPaginationBottom" class="pagination"></div>
    `;
}
function getSolicitudesLibros() {
    let solicitudesHtml = '<h3>Solicitudes de Libros</h3>';
    const pageSize = 25;
    const totalPages = Math.ceil(solicitudes.length / pageSize) || 1;
    const start = (currentPageSolicitudes - 1) * pageSize;
    const end = start + pageSize;
    const paginatedSolicitudes = solicitudes.slice(start, end);
    const paginationHtml = `
        <div class="pagination">
            <button ${currentPageSolicitudes === 1 ? 'disabled' : ''} onclick="changePageSolicitudes(${currentPageSolicitudes - 1})">&lt;</button>
            <span>Página ${currentPageSolicitudes}/${totalPages}</span>
            <button ${currentPageSolicitudes === totalPages ? 'disabled' : ''} onclick="changePageSolicitudes(${currentPageSolicitudes + 1})">&gt;</button>
        </div>
    `;
    solicitudesHtml += paginationHtml;
    solicitudesHtml += `<table>
        <thead>
            <tr>
                <th>Usuario</th>
                <th>Fecha</th>
                <th>Solicitud</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody>
            ${paginatedSolicitudes.map((s, index) => `
                <tr>
                    <td>${s.email}</td>
                    <td>${new Date(s.fecha).toLocaleDateString('es-ES')}</td>
                    <td>${s.texto}</td>
                    <td><button class="btn-anular" onclick="eliminarSolicitud(${start + index})">Eliminar</button></td>
                </tr>
            `).join('') || '<tr><td colspan="4">No hay solicitudes.</td></tr>'}
        </tbody>
    </table>`;
    solicitudesHtml += paginationHtml;
    // Reseñas en admin (actualizado con título y rating)
    solicitudesHtml += '<h3>Reseñas de Libros</h3>';
    const pageSizeReseñas = 25;
    const totalPagesReseñas = Math.ceil(reseñas.length / pageSizeReseñas) || 1;
    const startReseñas = (currentPageSolicitudes - 1) * pageSizeReseñas;
    const endReseñas = startReseñas + pageSizeReseñas;
    const paginatedReseñas = reseñas.slice(startReseñas, endReseñas);
    // Calcular promedios por libro
    const promediosPorLibro = {};
    paginatedReseñas.forEach(r => {
        if (!promediosPorLibro[r.titulo]) promediosPorLibro[r.titulo] = { sum: 0, count: 0 };
        promediosPorLibro[r.titulo].sum += r.rating || 0;
        promediosPorLibro[r.titulo].count += 1;
    });
    Object.keys(promediosPorLibro).forEach(titulo => {
        promediosPorLibro[titulo].avg = (promediosPorLibro[titulo].sum / promediosPorLibro[titulo].count).toFixed(1);
    });
    solicitudesHtml += `
        <table>
            <thead>
                <tr>
                    <th>Usuario</th>
                    <th>Libro</th>
                    <th>Rating</th>
                    <th>Promedio del Libro</th>
                    <th>Fecha</th>
                    <th>Reseña</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${paginatedReseñas.map((r, index) => `
                    <tr>
                        <td>${r.email}</td>
                        <td>${r.titulo}</td>
                        <td>${'★'.repeat(r.rating || 0)}</td>
                        <td>${promediosPorLibro[r.titulo]?.avg || 'N/A'}</td>
                        <td>${new Date(r.fecha).toLocaleDateString('es-ES')}</td>
                        <td>${r.texto}</td>
                        <td><button class="btn-anular" onclick="eliminarReseñaAdmin(${startReseñas + index})">Eliminar</button></td>
                    </tr>
                `).join('') || '<tr><td colspan="7">No hay reseñas.</td></tr>'}
            </tbody>
        </table>
    `;
    return solicitudesHtml;
}
function eliminarReseñaAdmin(index) {
    if (confirm('¿Estás seguro de eliminar esta reseña?')) {
        reseñas.splice(index, 1);
        guardarDatos();
        showAdminTab('solicitudes');
        updateNotificationBadge();
    }
}
function eliminarSolicitud(index) {
    if (confirm('¿Estás seguro de eliminar esta solicitud?')) {
        solicitudes.splice(index, 1);
        guardarDatos();
        showAdminTab('solicitudes');
        updateNotificationBadge();
    }
}
function changePageSolicitudes(newPage) {
    currentPageSolicitudes = newPage;
    showAdminTab('solicitudes');
}
function changePageEmails(newPage) {
    currentPageEmails = newPage;
    showAdminTab('correos');
}
function adminRecogerLibro(emailEstudiante, idRegistro, titulo) {
    const reservaIndex = (reservas[emailEstudiante] || []).findIndex(r => r.idRegistro === idRegistro);
    if (reservaIndex === -1) return;
    const reserva = reservas[emailEstudiante][reservaIndex];
    const fechaPrestamo = new Date().toISOString();
    const fechaDevolucion = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    if (!prestamos[emailEstudiante]) prestamos[emailEstudiante] = [];
    prestamos[emailEstudiante].push({idRegistro, fechaReserva: reserva.fechaReserva, fechaPrestamo, fechaDevolucion, titulo, devuelto: false, danado: false});
    reservas[emailEstudiante].splice(reservaIndex, 1);
    // Gamificación: +15 pts por recoger préstamo (unificado con reserva)
    aplicarPuntos(emailEstudiante, 15, 'Reserva y recogida completada');
    guardarDatos();
    const libro = catalogo.find(l => l.idRegistro === idRegistro);
    if (libro) libro.disponible = false;
    showToast(`Libro recogido para ${emailEstudiante}.`, 'success');
    updateNotificationBadge();
    showAdminTab('tareas');
    if (document.getElementById('searchModal').style.display === 'block') {
        buscarLibros();
    }
}
function adminDevolverLibro(emailEstudiante, idRegistro, titulo) {
    const prestamoIndex = (prestamos[emailEstudiante] || []).findIndex(p => p.idRegistro === idRegistro);
    if (prestamoIndex === -1) return;
    const prestamo = prestamos[emailEstudiante][prestamoIndex];
    const esATiempo = new Date() <= new Date(prestamo.fechaDevolucion);
    const danado = confirm('¿El libro se devuelve dañado o roto?'); // Prompt para admin
    if (danado) {
        prestamo.danado = true;
        aplicarPuntos(emailEstudiante, -20, 'Libro devuelto dañado');
        showToast(`Libro marcado como devuelto (dañado) para ${emailEstudiante}. (-20 pts por daño)`, 'warning');
    } else if (esATiempo) {
        aplicarPuntos(emailEstudiante, 10, 'Devolución a tiempo');
        showToast(`Libro marcado como devuelto a tiempo para ${emailEstudiante}. (+10 pts por puntualidad)`, 'success');
    } else {
        // Penalización por retraso ya aplicada en cargarPerfil()
        showToast(`Libro marcado como devuelto (retrasado) para ${emailEstudiante}.`, 'warning');
    }
    prestamo.devuelto = true;
    guardarDatos();
    const libro = catalogo.find(l => l.idRegistro === idRegistro);
    if (libro) libro.disponible = true;
    updateNotificationBadge();
    showAdminTab('tareas');
    if (document.getElementById('searchModal').style.display === 'block') {
        buscarLibros();
    }
}
function cargarApprovedEmails() {
    let emailsData = approvedEmails.map(email => {
        const totalPrestados = (prestamos[email] || []).length;
        const reservasCount = (reservas[email] || []).length;
        const porDevolver = (prestamos[email] || []).filter(p => !p.devuelto).length;
        const retrasados = (prestamos[email] || []).filter(p => !p.devuelto && new Date() > new Date(p.fechaDevolucion)).length;
        // Gamificación: Calcular rango lector
        const progreso = userProgress[email] || { puntos: 0 };
        const nivelData = calcularNivel(progreso.puntos);
        return {email, prestados: totalPrestados, reservas: reservasCount, porDevolver, retrasados, rango: nivelData.nombre};
    });
    const search = document.getElementById('emailSearch').value.toLowerCase().trim();
    if (search) {
        emailsData = emailsData.filter(data => data.email.toLowerCase().includes(search));
    }
    emailsData.sort((a, b) => {
        let valueA = a[sortColumnEmails];
        let valueB = b[sortColumnEmails];
        if (typeof valueA === 'string') valueA = valueA.toLowerCase();
        if (typeof valueB === 'string') valueB = valueB.toLowerCase();
        if (valueA < valueB) return sortDirectionEmails === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortDirectionEmails === 'asc' ? 1 : -1;
        return 0;
    });
    const pageSize = 25;
    const totalPages = Math.ceil(emailsData.length / pageSize) || 1;
    const start = (currentPageEmails - 1) * pageSize;
    const end = start + pageSize;
    const paginatedEmails = emailsData.slice(start, end);
    const paginationHtml = `
        <button ${currentPageEmails === 1 ? 'disabled' : ''} onclick="changePageEmails(${currentPageEmails - 1})">&lt;</button>
        <span>Página ${currentPageEmails}/${totalPages}</span>
        <button ${currentPageEmails === totalPages ? 'disabled' : ''} onclick="changePageEmails(${currentPageEmails + 1})">&gt;</button>
    `;
    document.getElementById('approvedEmailPaginationTop').innerHTML = paginationHtml;
    document.getElementById('approvedEmailPaginationBottom').innerHTML = paginationHtml;
    const listTbody = document.getElementById('approvedEmailList');
    listTbody.innerHTML = paginatedEmails.length > 0 ? paginatedEmails.map(data => `
        <tr>
            <td><input type="checkbox" value="${data.email}"> ${data.email}</td>
            <td>${data.prestados}</td>
            <td>${data.reservas}</td>
            <td>${data.porDevolver}</td>
            <td>${data.retrasados}</td>
            <td><span style="font-weight: bold; color: var(--btn-primary);">${data.rango}</span></td>
            <td><button onclick="deleteEmail('${data.email}')">Eliminar</button></td>
        </tr>
    `).join('') : '<tr><td colspan="7">No hay correos aprobados.</td></tr>';
    document.querySelectorAll('#approvedEmailTable th').forEach(th => {
        th.classList.remove('asc', 'desc');
        if (th.getAttribute('onclick').includes(sortColumnEmails)) {
            th.classList.add(sortDirectionEmails);
        }
    });
}
function addEmail() {
    const newEmail = document.getElementById('newEmail').value.trim();
    if (newEmail && newEmail.endsWith('@educa.madrid.org') && !approvedEmails.includes(newEmail)) {
        approvedEmails.push(newEmail);
        guardarDatos();
        cargarApprovedEmails();
        document.getElementById('newEmail').value = '';
        showToast('Correo agregado correctamente.', 'success');
    } else {
        showToast('Email inválido, ya agregado o no termina en @educa.madrid.org.', 'warning');
    }
}
function detectDelimiter(content) {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return ',';
    const firstLine = lines[0].trim();
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';
    console.log(`Delimitador detectado: ${delimiter} (comas: ${commaCount}, puntos y coma: ${semicolonCount})`);
    return delimiter;
}
function parseEmailsFromSheet(worksheet, rawContent = null) {
    let jsonData;
    try {
        jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: '' });
    } catch (e) {
        console.error('Error en parseo XLSX:', e);
        throw new Error('Error al parsear el archivo. Verifica el formato.');
    }
    if (jsonData.length === 0) return [];
    if (jsonData[0].length <= 1 && rawContent) {
        console.log('Detectado archivo con 1 columna. Usando parseo manual...');
        const delimiter = detectDelimiter(rawContent);
        const lines = rawContent.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
        jsonData = lines.slice(1).map(line => line.split(delimiter).map(cell => cell.trim().replace(/"/g, '')));
        console.log(`Parseo manual exitoso. Headers: ${headers.length}, filas: ${jsonData.length}`);
    }
    const headerRow = jsonData[0];
    const emailColIndex = headerRow.findIndex(header =>
        header && header.toString().toLowerCase().includes('correo') && header.toString().toLowerCase().includes('electronico')
    );
    if (emailColIndex === -1) {
        throw new Error('No se encontró la columna "Correo Electrónico" (o similar). Headers detectados: ' + headerRow.join(', '));
    }
    console.log(`Columna de email encontrada en índice: ${emailColIndex} ("${headerRow[emailColIndex]}")`);
    const emails = [];
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length <= emailColIndex) continue;
        const emailCell = row[emailColIndex].toString().trim();
        if (emailCell && emailCell.endsWith('@educa.madrid.org') && !emails.includes(emailCell)) {
            emails.push(emailCell);
        }
    }
    console.log(`Emails extraídos y filtrados: ${emails.length} únicos (de ${jsonData.length - 1} filas)`);
    return emails;
}
function importEmails() {
    const fileInput = document.getElementById('emailFile');
    const file = fileInput.files[0];
    if (!file) {
        showToast('Por favor, selecciona un archivo.', 'warning');
        return;
    }
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx'].includes(extension)) {
        showToast('Solo se aceptan archivos CSV o XLSX.', 'warning');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let workbook, worksheet, rawContent = null;
            if (extension === 'csv') {
                rawContent = e.target.result;
                const delimiter = detectDelimiter(rawContent);
                let csvContent = rawContent;
                if (delimiter === ';') {
                    csvContent = rawContent.replace(/;/g, ',');
                    console.log('Reemplazando ; por , para compatibilidad con XLSX.');
                }
                workbook = XLSX.read(csvContent, { type: 'string' });
            } else {
                const base64 = e.target.result.split(',')[1];
                workbook = XLSX.read(base64, { type: 'base64' });
            }
            const firstSheetName = workbook.SheetNames[0];
            worksheet = workbook.Sheets[firstSheetName];
            const emails = parseEmailsFromSheet(worksheet, extension === 'csv' ? rawContent : null);
            if (emails.length === 0) {
                showToast('No se encontraron correos válidos (@educa.madrid.org) en el archivo.', 'warning');
                return;
            }
            const nuevos = emails.filter(email => !approvedEmails.includes(email));
            if (nuevos.length === 0) {
                showToast('Todos los correos ya están en la lista aprobada.', 'warning');
                return;
            }
            approvedEmails.push(...nuevos);
            guardarDatos();
            cargarApprovedEmails();
            fileInput.value = '';
            showToast(`${nuevos.length} correos nuevos agregados correctamente. Total en lista: ${approvedEmails.length}`, 'success');
        } catch (error) {
            console.error('Error al procesar archivo:', error);
            showToast(`Error al procesar el archivo: ${error.message}\n\nConsejo: Asegúrate de que el CSV use comas (,) o punto y coma (;) como separadores, y que tenga la columna "Correo Electrónico".`, 'error');
        }
    };
    reader.onerror = function() {
        showToast('Error al leer el archivo. Intenta con otro formato o verifica el encoding (UTF-8).', 'error');
    };
    if (extension === 'csv') {
        reader.readAsText(file, 'UTF-8');
    } else {
        reader.readAsDataURL(file);
    }
}
function deleteEmail(email) {
    if (confirm('¿Está seguro que desea eliminar el correo seleccionado?')) {
        approvedEmails = approvedEmails.filter(e => e !== email);
        guardarDatos();
        cargarApprovedEmails();
        showToast('Correo eliminado.', 'success');
    }
}
function deleteSelectedEmails() {
    const checkboxes = document.querySelectorAll('#approvedEmailList input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
        showToast('No hay correos seleccionados.', 'warning');
        return;
    }
    if (confirm(`¿Está seguro que desea eliminar TODOS los correos seleccionados? (${checkboxes.length} correos)`)) {
        checkboxes.forEach(checkbox => {
            const email = checkbox.value;
            approvedEmails = approvedEmails.filter(e => e !== email);
        });
        guardarDatos();
        cargarApprovedEmails();
        showToast(`${checkboxes.length} correos eliminados.`, 'success');
    }
}
function selectAllEmails() {
    const checkboxes = document.querySelectorAll('#approvedEmailList input[type="checkbox"]');
    checkboxes.forEach(checkbox => checkbox.checked = true);
}
function deselectAllEmails() {
    const checkboxes = document.querySelectorAll('#approvedEmailList input[type="checkbox"]');
    checkboxes.forEach(checkbox => checkbox.checked = false);
}
function filterEmails() {
    currentPageEmails = 1;
    cargarApprovedEmails();
}
function ordenarCorreos(column) {
    if (sortColumnEmails === column) {
        sortDirectionEmails = sortDirectionEmails === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumnEmails = column;
        sortDirectionEmails = 'asc';
    }
    currentPageEmails = 1;
    cargarApprovedEmails();
}
function ordenarHistorial(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    currentPageHistorial = 1;
    showAdminTab('historial');
}