<DOCUMENT filename="script.js">
```javascript
// Cargar datos del catálogo (solo desde Catalogo.xml, con mejoras en parsing y manejo de errores)
let catalogo = [];
let resultadosFiltrados = []; // Cache para resultados de búsqueda (optimización paginación)
let paginaActual = 1;
const librosPorPagina = 10; // Para paginación en resultados

async function cargarCatalogo(reintentar = false) {
    const resultadosDiv = document.getElementById('resultados');
    if (!reintentar) {
        resultadosDiv.innerHTML = '<div id="loadingResults" class="loading">Cargando catálogo...</div>'; // Usa el div del index
    }try {
    const response = await fetch('Catalogo.xml');
    if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} - No se pudo cargar Catalogo.xml`);
    }
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Verificar si hay errores de parseo
    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('Error al parsear el XML. Verifica el formato del archivo.');
    }

    // Extraer libros (usando child elements; robusto contra elementos faltantes)
    const libros = xmlDoc.getElementsByTagName('Libro');
    if (libros.length === 0) {
        throw new Error('No se encontraron elementos <Libro> en el XML.');
    }

    catalogo = Array.from(libros).map((libro, index) => {
        const titulo = libro.getElementsByTagName('Titulo')[0]?.textContent?.trim() || `Libro sin título ${index + 1}`;
        const autor = libro.getElementsByTagName('Autor')[0]?.textContent?.trim() || 'Desconocido';
        const categoria = libro.getElementsByTagName('Descriptor')[0]?.textContent?.trim() || 'No disponible';
        const registro = libro.getElementsByTagName('Registro')[0]?.textContent?.trim() || 'No disponible';
        const isbn = libro.getElementsByTagName('ISBN')[0]?.textContent?.trim() || 'No disponible';
        const fechaEdicion = libro.getElementsByTagName('FechaEdicion')[0]?.textContent?.trim() || 'No disponible';
        // Si agregas <Estado> en XML, descomenta: const estado = libro.getElementsByTagName('Estado')[0]?.textContent?.trim() || 'disponible';
        
        return {
            titulo,
            autor,
            categoria,
            registro,
            isbn,
            fechaEdicion,
            disponible: true // Asumimos disponible; cambia a estado.toLowerCase() === 'disponible' si usas <Estado>
        };
    }).filter(libro => libro.titulo.length > 0 && libro.titulo !== 'Sin título'); // Filtrar inválidas mejorado
    
    console.log(`Catálogo cargado exitosamente: ${catalogo.length} libros.`);
    
    if (catalogo.length === 0) {
        resultadosDiv.innerHTML = '<p class="no-results">No se encontraron libros en el catálogo.</p>';
        return;
    }
    
    // Mostrar mensaje inicial y resetear búsqueda
    resultadosFiltrados = catalogo; // Inicial: todos los libros
    paginaActual = 1;
    mostrarResultados(catalogo);
} catch (error) {
    console.error('Error al cargar catálogo:', error);
    const errorHTML = `<p class="no-results">Error al cargar el catálogo: ${error.message}.</p>
                       <button onclick="cargarCatalogo(true)" style="background: #007bff; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Reintentar Carga</button>`;
    document.getElementById('loadingResults')?.style.display = 'none';
    resultadosDiv.innerHTML = errorHTML;
}}// Búsqueda de libros (con debounce para performance y paginación)
function buscarLibros() {
    if (!catalogo.length) {
        document.getElementById('resultados').innerHTML = '<p class="no-results">El catálogo aún no se ha cargado. Intenta de nuevo en unos segundos.</p>';
        return;
    }
    const query = document.getElementById('buscarInput').value.toLowerCase().trim();
    paginaActual = 1; // Reset paginaciónif (!query) {
    resultadosFiltrados = catalogo; // Todos si vacío
    mostrarResultados(catalogo);
    return;
}

resultadosFiltrados = catalogo.filter(libro => 
    libro.titulo.toLowerCase().includes(query) ||
    libro.autor.toLowerCase().includes(query) ||
    libro.categoria.toLowerCase().includes(query) ||
    libro.isbn.toLowerCase().includes(query) ||
    libro.registro.toLowerCase().includes(query)
);
mostrarResultados(resultadosFiltrados);}// Mostrar resultados con paginación (ahora en TABLA para consistencia con index.html)
function mostrarResultados(librosTotales) {
    const div = document.getElementById('resultados');
    document.getElementById('loadingResults')?.style.display = 'none'; // Oculta loadingconst inicio = (paginaActual - 1) * librosPorPagina;
const fin = inicio + librosPorPagina;
const librosPagina = librosTotales.slice(inicio, fin);
const totalPaginas = Math.ceil(librosTotales.length / librosPorPagina);

if (librosTotales.length === 0) {
    div.innerHTML = '<p class="no-results">No se encontraron libros.</p>';
    return;
}

// Sanitización básica: escapar HTML
const esc = (str) => String(str).replace(/[&<>"']/g, m => ({'&': '&', '<': '<', '>': '>', '"': '"', "'": '''})[m]);

let tableHTML = `
    <p>Mostrando ${Math.min(inicio + 1, librosTotales.length)}-${Math.min(fin, librosTotales.length)} de ${librosTotales.length} resultados.</p>
    <table class="resultados-table">
        <thead>
            <tr>
                <th>Título</th>
                <th>Autor</th>
                <th>Categoría</th>
                <th>Registro</th>
                <th>ISBN</th>
                <th>Fecha Edición</th>
                <th>Disponible</th>
            </tr>
        </thead>
        <tbody>
`;
librosPagina.forEach(libro => {
    const estadoClass = libro.disponible ? 'estado-disponible' : 'estado-no-disponible';
    tableHTML += `
        <tr>
            <td>${esc(libro.titulo)}</td>
            <td>${esc(libro.autor)}</td>
            <td>${esc(libro.categoria)}</td>
            <td>${esc(libro.registro)}</td>
            <td>${esc(libro.isbn)}</td>
            <td>${esc(libro.fechaEdicion)}</td>
            <td><span class="${estadoClass}">${libro.disponible ? 'Sí' : 'No'}</span></td>
        </tr>
    `;
});
tableHTML += '</tbody></table>';

// Controles de paginación
if (totalPaginas > 1) {
    let paginationHTML = '<div class="pagination">';
    if (paginaActual > 1) paginationHTML += `<button onclick="cambiarPagina(${paginaActual - 1})">Anterior</button>`;
    for (let i = 1; i <= totalPaginas; i++) {
        paginationHTML += `<button class="${i === paginaActual ? 'active' : ''}" onclick="cambiarPagina(${i})">${i}</button>`;
    }
    if (paginaActual < totalPaginas) paginationHTML += `<button onclick="cambiarPagina(${paginaActual + 1})">Siguiente</button>`;
    paginationHTML += '</div>';
    tableHTML += paginationHTML;
}

div.innerHTML = tableHTML;}function cambiarPagina(nuevaPagina) {
    paginaActual = nuevaPagina;
    mostrarResultados(resultadosFiltrados); // Usa cache – más rápido
}// Chatbot SIMULADO (mejorado: multiline con 
, más keywords)
async function enviarMensaje() {
    const input = document.getElementById('chatInput');
    const mensaje = input.value.trim();
    if (!mensaje) return;// Mostrar mensaje del usuario
agregarMensaje(mensaje, 'user');
input.value = '';

// Simulación de respuesta con uso avanzado de catálogo
let respuesta = '';
const mensajeLower = mensaje.toLowerCase();

// Búsqueda dinámica
if (mensajeLower.includes('buscar') || mensajeLower.includes('libro') || mensajeLower.includes('encuentra')) {
    const query = mensajeLower.replace(/buscar|libro|encuentra/gi, '').trim();
    const resultadosChat = catalogo.filter(libro => 
        libro.titulo.toLowerCase().includes(query) || 
        libro.autor.toLowerCase().includes(query) ||
        libro.categoria.toLowerCase().includes(query)
    );
    if (resultadosChat.length > 0) {
        respuesta = `¡Encontré ${resultadosChat.length} resultado(s):
`;
        resultadosChat.slice(0, 3).forEach(libro => {
            respuesta += `- "${libro.titulo}" de ${libro.autor} (${libro.categoria})
`;
        });
        if (resultadosChat.length > 3) respuesta += '... Usa el buscador para más detalles.';
    } else {
        respuesta = 'No encontré nada con esa búsqueda. Prueba con "narrativa", "Harry Potter" o un autor como "Rowling".';
    }
} 
// Conteo por categoría
else if (mensajeLower.includes('cuánt') || mensajeLower.includes('cuantos') || mensajeLower.includes('total')) {
    const total = catalogo.length;
    const narrativa = catalogo.filter(l => l.categoria.toLowerCase().includes('narrativa')).length;
    const comic = catalogo.filter(l => l.categoria.toLowerCase().includes('cómic') || l.categoria.toLowerCase().includes('comic')).length;
    respuesta = `En la Biblioteca Carpe Diem hay ${total} libros en total.

                 - Narrativa: ${narrativa}

                 - Cómics: ${comic}
¿Qué más quieres saber?`;
}
// Recomendación mejorada
else if (mensajeLower.includes('recomendación') || mensajeLower.includes('recomendar') || mensajeLower.includes('sugiere')) {
    let categoriaPref = 'narrativa'; // Default
    if (mensajeLower.includes('cómic') || mensajeLower.includes('comic')) categoriaPref = 'cómic';
    else if (mensajeLower.includes('poesía') || mensajeLower.includes('poesia')) categoriaPref = 'poesía';
    
    const recomendaciones = catalogo.filter(libro => 
        libro.categoria.toLowerCase().includes(categoriaPref)
    ).slice(0, 3);
    respuesta = `Te recomiendo estos de ${categoriaPref}:
`;
    if (recomendaciones.length > 0) {
        recomendaciones.forEach(libro => {
            respuesta += `- "${libro.titulo}" de ${libro.autor}
`;
        });
    } else {
        respuesta += 'No hay en esa categoría aún. Prueba "narrativa" o "cómic".';
    }
    respuesta += '
¿Te gusta? ¿Otro género?';
} 
// Disponibilidad
else if (mensajeLower.includes('disponible') || mensajeLower.includes('prestado')) {
    const disponibles = catalogo.filter(l => l.disponible).length;
    respuesta = `Actualmente, ${disponibles} de ${catalogo.length} libros están disponibles.
Busca por título para detalles específicos.`;
} 
// Bienvenida o genérico
else if (mensajeLower.includes('biblioteca') || mensajeLower.includes('hola')) {
    respuesta = '¡Hola! Soy el asistente de la Biblioteca Escolar Carpe Diem, Fuenlabrada.
¿Quieres buscar un libro, una recomendación o info del catálogo?';
} 
else {
    respuesta = `Entendido: "${mensaje}".
Prueba "buscar Rowling", "recomendar cómic", "cuántos narrativa" o "disponible". ¿Qué buscas?`;
}

// Delay para simular procesamiento
setTimeout(() => {
    agregarMensaje(respuesta, 'bot');
}, 1000);}function agregarMensaje(texto, tipo) {
    const div = document.getElementById('chatMensajes');
    const p = document.createElement('p');
    p.className = chat-message ${tipo === 'user' ? 'user-message' : 'bot-message'}; // Usa clases del index
    p.innerHTML = texto; // innerHTML para 
, pero texto ya sanitizado en respuestas
    div.appendChild(p);
    div.scrollTop = div.scrollHeight;
}// Inicializar todo al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    // Soporte para Enter
    const buscarInput = document.getElementById('buscarInput');
    const chatInput = document.getElementById('chatInput');buscarInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') buscarLibros();
});

chatInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') enviarMensaje();
});

// Debounce para búsqueda en tiempo real (live search)
let timeout;
buscarInput.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(buscarLibros, 300); // Espera 300ms tras tipear
});

// Cargar catálogo
cargarCatalogo();});