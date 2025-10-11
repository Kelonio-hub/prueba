async function cargarCatalogo() {
    try {
        const response = await fetch('Ejemplares.xml');
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
            throw new Error('Error al parsear XML.');
        }
        const libros = {};
        Array.from(xmlDoc.getElementsByTagName('Libro')).forEach(libro => {
            const idDocumento = libro.getAttribute('id_documento');
            libros[idDocumento] = {
                titulo: libro.getElementsByTagName('Titulo')[0]?.textContent || 'Sin título',
                autor: libro.getElementsByTagName('Autor')[0]?.textContent || 'Desconocido',
                categoria: libro.getElementsByTagName('Descriptor')[0]?.textContent || 'No disponible',
                fechaEdicion: libro.getElementsByTagName('FechaEdicion')[0]?.textContent || 'No disponible'
            };
        });
        catalogo = Array.from(xmlDoc.getElementsByTagName('Ejemplar')).map(ejemplar => {
            const idRegistro = ejemplar.getAttribute('IdRegistro') || '';
            const libro = libros[idRegistro] || {};
            return {
                titulo: libro.titulo || 'Sin título',
                autor: libro.autor || 'Desconocido',
                categoria: libro.categoria || 'No disponible',
                fechaEdicion: libro.fechaEdicion || 'No disponible',
                signatura: `${ejemplar.getAttribute('Signatura1') || ''} ${ejemplar.getAttribute('Signatura2') || ''} ${ejemplar.getAttribute('Signatura3') || ''}`.trim(),
                isbn: ejemplar.getAttribute('ISBN') || 'No disponible',
                fecha: ejemplar.getAttribute('Fecha') || 'No disponible',
                disponible: ejemplar.getAttribute('Estado') === '0',
                idRegistro: idRegistro
            };
        });
        Object.values(reservas).flat().forEach(r => {
            const libro = catalogo.find(l => l.idRegistro === r.idRegistro);
            if (libro) libro.disponible = false;
        });
        Object.values(prestamos).flat().filter(p => !p.devuelto).forEach(p => {
            const libro = catalogo.find(l => l.idRegistro === p.idRegistro);
            if (libro) libro.disponible = false;
        });
        actualizarSugerenciasBusqueda();
    } catch (error) {
        console.error('Error al cargar:', error);
        catalogo = [];
        showToast('Catálogo en mantenimiento. Intenta más tarde.', 'warning');
    }
}