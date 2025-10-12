import { showToast, toggleModal } from './utils.js';

export let catalogo = [];

export async function cargarCatalogo() {
    try {
        const response = await fetch('assets/Ejemplares.xml');
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const libros = xmlDoc.getElementsByTagName('ejemplar');
        catalogo = Array.from(libros).map(libro => ({
            isbn: libro.getElementsByTagName('isbn')[0]?.textContent || '',
            titulo: libro.getElementsByTagName('titulo')[0]?.textContent || '',
            autor: libro.getElementsByTagName('autor')[0]?.textContent || '',
            categoria: libro.getElementsByTagName('categoria')[0]?.textContent || '',
            disponible: libro.getElementsByTagName('disponible')[0]?.textContent === 'true'
        }));
        showToast('Catálogo cargado', 'success');
    } catch (error) {
        showToast('Error al cargar el catálogo', 'error');
    }
}

export function buscarLibros(query) {
    query = sanitizeInput(query.toLowerCase());
    const resultados = catalogo.filter(libro =>
        libro.titulo.toLowerCase().includes(query) ||
        libro.autor.toLowerCase().includes(query) ||
        libro.categoria.toLowerCase().includes(query) ||
        libro.isbn.includes(query)
    );

    const resultadosDiv = document.getElementById('resultadosBusqueda');
    resultadosDiv.innerHTML = resultados.map(libro => `
        <div>
            <h3>${libro.titulo}</h3>
            <p>Autor: ${libro.autor}</p>
            <p>Categoría: ${libro.categoria}</p>
            <p>ISBN: ${libro.isbn}</p>
            <p>Estado: ${libro.disponible ? 'Disponible' : 'No disponible'}</p>
        </div>
    `).join('');
    toggleModal('modalBusqueda', true);
}