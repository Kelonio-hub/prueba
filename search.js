// Autocompletado búsqueda
function actualizarSugerenciasBusqueda() {
    const datalist = document.getElementById('sugerenciasBusqueda');
    datalist.innerHTML = catalogo.map(libro => `
        <option value="${libro.titulo}">${libro.autor} - ${libro.categoria}</option>
    `).join('');
}
function buscarLibros() {
    if (!emailSesion) return;
    if (!catalogo.length) {
        showToast('Catálogo en mantenimiento. Intenta más tarde.', 'warning');
        return;
    }
    const query = document.getElementById('buscarInput').value.toLowerCase().trim();
    if (!query) {
        showToast('Por favor, introduce un término de búsqueda.', 'warning');
        return;
    }
    searchQuery = query;
    searchResults = catalogo.filter(libro =>
        libro.titulo.toLowerCase().includes(query) ||
        libro.autor.toLowerCase().includes(query) ||
        libro.categoria.toLowerCase().includes(query) ||
        libro.signatura.toLowerCase().includes(query) ||
        libro.isbn.toLowerCase().includes(query)
    );
    searchResults.sort((a, b) => (b.disponible ? 1 : 0) - (a.disponible ? 1 : 0));
    currentPageSearch = 1;
    if (searchResults.length > 0) {
        abrirModal();
        mostrarResultadosModal();
    } else {
        showToast('No se encontraron libros.', 'warning');
    }
}
function abrirModal() {
    document.getElementById('searchModal').style.display = 'block';
}
function cerrarModal() {
    document.getElementById('searchModal').style.display = 'none';
}
function mostrarResultadosModal() {
    const pageSize = 5;
    const totalPages = Math.ceil(searchResults.length / pageSize);
    const start = (currentPageSearch - 1) * pageSize;
    const end = start + pageSize;
    const paginatedResults = searchResults.slice(start, end);
    const conteoDiv = document.getElementById('conteoResultadosModal');
    const resultadosDiv = document.getElementById('resultadosModal');
    const paginationDiv = document.getElementById('searchPagination');
    const esAdmin = emailSesion === EMAIL_ADMIN;
    const textoConteo = `${searchResults.length} resultados para "${searchQuery}"`;
    conteoDiv.innerHTML = `<p>${textoConteo}</p>`;
    resultadosDiv.innerHTML = paginatedResults.map(libro => {
        const tejuelo = libro.signatura.replace(/\s+/g, '-');
        const colorFranja = libro.disponible ? 'franja-verde' : 'franja-roja';
        let estadoHtml = '';
        if (libro.disponible) {
            if (!esAdmin) {
                estadoHtml = `<button class="btn-reserva" onclick="reservarLibro('${libro.idRegistro}', '${libro.titulo.replace(/'/g, "\\'")}')">Reservar</button>`;
            } else {
                estadoHtml = 'Sí';
            }
        } else {
            let esReserva = false;
            let emailReserva = null;
            let emailPrestamo = null;
            Object.keys(reservas).some(email => {
                const r = reservas[email].find(rr => rr.idRegistro === libro.idRegistro);
                if (r) {
                    esReserva = true;
                    emailReserva = email;
                    return true;
                }
            });
            if (!esReserva) {
                Object.keys(prestamos).some(email => {
                    const p = prestamos[email].find(pp => pp.idRegistro === libro.idRegistro && !pp.devuelto);
                    if (p) {
                        emailPrestamo = email;
                        return true;
                    }
                });
            }
            if (esAdmin) {
                if (esReserva) {
                    estadoHtml = `<span class="estado-reservado">Reservado por ${emailReserva}</span> <button class="btn-recoger" onclick="adminRecogerLibro('${emailReserva}', '${libro.idRegistro}', '${libro.titulo.replace(/'/g, "\\'")}')">Recoger</button> <button class="btn-anular" onclick="anularReserva('${emailReserva}', '${libro.idRegistro}', '${libro.titulo.replace(/'/g, "\\'")}')">Anular</button>`;
                } else if (emailPrestamo) {
                    estadoHtml = `<span class="estado-no-disponible">Prestado a ${emailPrestamo}</span> <button class="btn-devolver" onclick="adminDevolverLibro('${emailPrestamo}', '${libro.idRegistro}', '${libro.titulo.replace(/'/g, "\\'")}')">Devolver</button>`;
                } else {
                    estadoHtml = '<span class="estado-no-disponible">No disponible</span>';
                }
            } else {
                estadoHtml = `<span class="estado-reservado">No disponible</span>`;
            }
        }
        return `
            <div class="libro-modal">
                <div class="franja ${colorFranja}"></div>
                <div class="contenido-modal">
                    <p><strong>Título:</strong> ${libro.titulo}</p>
                    <p><strong>Autor:</strong> ${libro.autor}</p>
                    <p><strong>Categoría:</strong> ${libro.categoria}</p>
                    <p><strong>Tejuelo:</strong> <span class="tejuelo">${tejuelo}</span></p>
                    <p><strong>Disponible:</strong> ${estadoHtml}</p>
                </div>
            </div>
        `;
    }).join('') || '<p>No hay libros en esta página.</p>';
    const paginationHtml = `
        <button ${currentPageSearch === 1 ? 'disabled' : ''} onclick="changePageSearch(${currentPageSearch - 1})">&lt;</button>
        <span>Página ${currentPageSearch}/${totalPages}</span>
        <button ${currentPageSearch === totalPages ? 'disabled' : ''} onclick="changePageSearch(${currentPageSearch + 1})">&gt;</button>
    `;
    paginationDiv.innerHTML = paginationHtml;
}
function changePageSearch(newPage) {
    currentPageSearch = newPage;
    mostrarResultadosModal();
}