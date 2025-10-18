let catalogo = [];
let searchResults = [];
let searchQuery = '';
let currentPageSearch = 1;
let toastCount = 0;
let respuestasPendientes = {};
let mensajeActualId = 0;
let historialMensajes = [];
let cacheRespuestas = JSON.parse(localStorage.getItem('hipatia_cache')) || {};

const API_KEY = 'AIzaSyCls5FtXaTdzQfM5FarqmHSALeGmnIPcAg';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
const MODELO = 'gemini-2.5-flash';

function sanitizeHTML(str) {
    return DOMPurify.sanitize(str);
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.bottom = `${20 + (toastCount * 60)}px`;
    toast.style.zIndex = 10000 + toastCount;
    toast.textContent = message;
    document.body.appendChild(toast);
    toastCount++;
    setTimeout(() => {
        toast.remove();
        toastCount--;
    }, 3000);
}

function toggleTheme() {
    const body = document.body;
    const newTheme = body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.body.setAttribute('data-theme', savedTheme);
}

function cerrarModal() {
    document.getElementById('searchModal').style.display = 'none';
    document.getElementById('buscarInput').focus();
    document.getElementById('modalSearchInput').value = '';
}

async function cargarCatalogo() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const cacheVersion = 'catalog-v1';
        const cachedCatalogo = localStorage.getItem('catalogo');
        const cachedVersion = localStorage.getItem('catalogoVersion');
        if (cachedCatalogo && cachedVersion === cacheVersion) {
            catalogo = JSON.parse(cachedCatalogo);
            actualizarSugerenciasBusqueda();
            return;
        }
        const response = await fetch('./Ejemplares.xml', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        if (xmlDoc.getElementsByTagName('parsererror').length > 0) throw new Error('Error al parsear XML.');
        const libros = {};
        Array.from(xmlDoc.getElementsByTagName('Libro')).forEach(libro => {
            const idDocumento = libro.getAttribute('id_documento') || '';
            const descriptor = libro.getElementsByTagName('Descriptor')[0];
            const rawCategoria = descriptor ? descriptor.textContent : 'No disponible';
            const categoriaMap = {
                'narrativa': 'Narrativa',
                'poesia': 'Poesía',
                'poesía': 'Poesía',
                'teatro': 'Teatro',
                'literatura inglesa': 'Literatura inglesa',
                'enciclopedias': 'Enciclopedias',
                'comic': 'Cómic',
                'cómic': 'Cómic',
                'deportes': 'Deportes'
            };
            libros[idDocumento] = {
                titulo: libro.getElementsByTagName('Titulo')[0]?.textContent || 'Sin título',
                autor: libro.getElementsByTagName('Autor')[0]?.textContent || 'Desconocido',
                categoria: categoriaMap[rawCategoria.toLowerCase()] || rawCategoria,
                fechaEdicion: libro.getElementsByTagName('FechaEdicion')[0]?.textContent || 'No disponible'
            };
        });
        const librosAgrupados = {};
        Array.from(xmlDoc.getElementsByTagName('Ejemplar')).forEach(ejemplar => {
            const idRegistro = ejemplar.getAttribute('IdRegistro') || '';
            const libro = libros[idRegistro] || {};
            let signatura1 = ejemplar.getAttribute('Signatura1') || '';
            const signaturaMap = {
                'Narrativa': 'N',
                'Poesía': 'P',
                'Teatro': 'T',
                'Literatura inglesa': 'LI',
                'Enciclopedias': 'E',
                'Cómic': 'C',
                'Deportes': 'D'
            };
            signatura1 = signaturaMap[libro.categoria] || signatura1 || '';
            const signatura = `${signatura1}-${ejemplar.getAttribute('Signatura2') || ''}-${ejemplar.getAttribute('Signatura3') || ''}`.trim();
            if (!librosAgrupados[idRegistro]) {
                librosAgrupados[idRegistro] = {
                    titulo: libro.titulo || 'Sin título',
                    autor: libro.autor || 'Desconocido',
                    categoria: libro.categoria || 'No disponible',
                    fechaEdicion: libro.fechaEdicion || 'No disponible',
                    signatura: signatura || 'No disponible',
                    isbn: ejemplar.getAttribute('ISBN') || 'No disponible',
                    fecha: ejemplar.getAttribute('Fecha') || 'No disponible',
                    copiasTotales: 0,
                    copiasDisponibles: 0,
                    idRegistro: idRegistro
                };
            }
            librosAgrupados[idRegistro].copiasTotales += 1;
            if (ejemplar.getAttribute('Estado') === '0') {
                librosAgrupados[idRegistro].copiasDisponibles += 1;
            }
        });
        catalogo = Object.values(librosAgrupados);
        localStorage.setItem('catalogo', JSON.stringify(catalogo));
        localStorage.setItem('catalogoVersion', cacheVersion);
        actualizarSugerenciasBusqueda();
    } catch (error) {
        console.error('Error al cargar:', error);
        catalogo = [];
        showToast('Catálogo en Mantenimiento, discupe las molestias.', 'error');
    }
}

function actualizarSugerenciasBusqueda() {
    document.getElementById('sugerenciasBusqueda').innerHTML = catalogo.map(libro => `
        <option value="${libro.titulo}">${libro.autor} - ${libro.categoria} (${libro.copiasDisponibles} disponibles)</option>
    `).join('');
}

function normalizarTexto(texto) {
    if (!texto) return '';
    const acentos = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U' };
    return texto
        .replace(/[áéíóúÁÉÍÓÚ]/g, match => acentos[match] || match)
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function buscarLibros(query, exactMatch = false) {
    if (!catalogo.length || !query) return [];
    const lowerQuery = normalizarTexto(query);
    if (exactMatch) return catalogo.filter(libro => normalizarTexto(libro.titulo) === lowerQuery);
    return catalogo
        .filter(libro =>
            normalizarTexto(libro.titulo).includes(lowerQuery) ||
            normalizarTexto(libro.autor).includes(lowerQuery) ||
            normalizarTexto(libro.categoria).includes(lowerQuery) ||
            normalizarTexto(libro.signatura).includes(lowerQuery) ||
            normalizarTexto(libro.isbn).includes(lowerQuery)
        )
        .sort((a, b) => b.copiasDisponibles - a.copiasDisponibles);
}

function realizarBusqueda(query, inputId) {
    if (!catalogo.length) {
        showToast('Catálogo en Mantenimiento, discupe las molestias.', 'warning');
        return;
    }
    if (!query) {
        showToast('Por favor, introduce un término de búsqueda.', 'warning');
        return;
    }
    searchQuery = query;
    searchResults = buscarLibros(query);
    currentPageSearch = 1;
    abrirModal();
    mostrarResultadosModal();
    document.getElementById(inputId).value = query;
}

function mostrarResultadosBusqueda() {
    realizarBusqueda(document.getElementById('buscarInput').value.trim(), 'modalSearchInput');
}

function buscarEnModal() {
    realizarBusqueda(document.getElementById('modalSearchInput').value.trim(), 'modalSearchInput');
}

function abrirModal() {
    const modal = document.getElementById('searchModal');
    modal.style.display = 'block';
    document.getElementById('modalSearchInput').focus();
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
    const textoConteo = searchResults.length > 0
        ? `${searchResults.length} resultados para "${sanitizeHTML(searchQuery)}". El color del Tejuelo indica su estantería`
        : `No se encontraron resultados para "${sanitizeHTML(searchQuery)}".`;
    conteoDiv.innerHTML = `<p>${textoConteo}</p>`;
    resultadosDiv.innerHTML = paginatedResults.map(libro => `
        <div class="libro-modal" role="region" aria-label="Resultado de búsqueda para ${libro.titulo}">
            <div class="contenido-modal">
                <p><strong>Título:</strong> ${libro.titulo}</p>
                <p><strong>Autor:</strong> ${libro.autor}</p>
                <p><strong>Categoría:</strong> ${libro.categoria}</p>
                <p><strong>Tejuelo:</strong> <span class="tejuelo" data-categoria="${libro.categoria.toLowerCase()}">${libro.signatura}</span></p>
                <p><strong>Ejemplares Disponibles:</strong> ${libro.copiasDisponibles}</p>
            </div>
        </div>
    `).join('') || '<p>No se encontraron libros en esta página.</p>';
    paginationDiv.innerHTML = `
        <button ${currentPageSearch === 1 ? 'disabled' : ''} onclick="changePageSearch(${currentPageSearch - 1})" aria-label="Página anterior">&lt;</button>
        ${Array.from({ length: totalPages }, (_, i) => `
            <button ${currentPageSearch === i + 1 ? 'disabled aria-current="page"' : ''} onclick="changePageSearch(${i + 1})" aria-label="Ir a página ${i + 1}">${i + 1}</button>
        `).join('')}
        <button ${currentPageSearch === totalPages ? 'disabled' : ''} onclick="changePageSearch(${currentPageSearch + 1})" aria-label="Página siguiente">&gt;</button>
    `;
}

function changePageSearch(newPage) {
    currentPageSearch = newPage;
    mostrarResultadosModal();
}

async function consultarAPI(mensaje, intencion, contexto) {
    const systemPrompt = `Eres Hipat-IA, una bibliotecaria virtual entusiasta del IES Carpe Diem. 
Respondes en español con un tono cálido, dinámico y profesional, como una amiga conocedora de libros. Nunca repitas "Hola, soy Hipat-IA". Usa el catálogo y el contexto para respuestas relevantes.

**Contexto del catálogo**:
${contexto}

**Instrucciones**:
- **Sinopsis** (e.g., "sinopsis de un libro"): Da un resumen completo de 400-700 palabras, usando el catálogo si está disponible o conocimiento general. Termina en una oración completa con punto.
- **Resumen** (e.g., "resumen de un libro"): Da un resumen completo de 400-700 palabras, estructurado para ser claro y conciso, usando el catálogo si está disponible o conocimiento general. Termina en una oración completa con punto.
- **Reseña** (e.g., "reseña de un libro"): Ofrece una opinión crítica de 400-700 palabras, destacando importancia y características. Termina en una oración completa con punto.
- **General** (e.g., cualquier otra consulta): Responde en 400-700 palabras con información relevante, clara y completa. Termina en una oración completa con punto.
- **Reservas** (e.g., "cómo reservar un libro"): Indica que se puede reservar un libro usando el botón **Reserva de Libros**. Incluye una ]

[RESERVA] al final de la respuesta.
- **Solicitar un libro** (e.g., "quiero proponer un libro nuevo"): Indica que se puede proponer un nuevo libro usando el botón **Solicitud de Libros Nuevos**. Incluye una señal [SOLICITUD] al final de la respuesta.
- Usa emojis (📖, ✨) para un toque amigable.
- Termina con una pregunta breve, como "¿Otro libro?" o "¿Más detalles?".
`;
    const contents = [
        { parts: [{ text: systemPrompt }], role: 'model' },
        { parts: [{ text: mensaje }], role: 'user' }
    ];
    try {
        const response = await fetch(`${BASE_URL}${MODELO}:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        const contenido = data.candidates[0].content.parts.map(part => part.text).join(' ');
        return {
            texto: contenido,
            mostrarReservaBtn: contenido.includes('[RESERVA]'),
            mostrarSolicitudBtn: contenido.includes('[SOLICITUD]')
        };
    } catch (error) {
        showToast('No pude conectar con la API. Intenta de nuevo más tarde.', 'error');
        return { texto: 'No pude conectar, inténtalo más tarde. ¿Otro libro? 📖' };
    }
}

function extraerLibroDeConsulta(query) {
    const lowerQuery = normalizarTexto(query);
    const match = lowerQuery.match(/(?:de|sobre)\s+(.+)$/i);
    return match ? match[1].trim() : lowerQuery.replace(/(cuantos|ejemplares|copias|disponibles|libros)/gi, '').trim();
}

function abrirBuscadorLibro(libro) {
    searchQuery = libro;
    searchResults = buscarLibros(libro);
    currentPageSearch = 1;
    abrirModal();
    mostrarResultadosModal();
}

function dividirTexto(texto, tipo) {
    const maxLength = 500;
    const partes = [];
    let parteActual = '';
    let contadorPalabras = 0;
    const palabras = texto.split(' ');
    for (const palabra of palabras) {
        if (contadorPalabras + palabra.length > maxLength) {
            partes.push({ tipo, texto: parteActual.trim() });
            parteActual = palabra + ' ';
            contadorPalabras = palabra.length + 1;
        } else {
            parteActual += palabra + ' ';
            contadorPalabras += palabra.length + 1;
        }
    }
    if (parteActual.trim()) partes.push({ tipo, texto: parteActual.trim() });
    return partes.length > 0 ? partes : [{ tipo, texto }];
}

function mostrarSiguienteParte(mensajeId, parteActual) {
    const partes = respuestasPendientes[mensajeId];
    if (partes && parteActual <= partes.length) {
        const libroBuscado = partes[0].libroBuscado || null;
        const mostrarReservaBtn = partes[0].texto.includes('[RESERVA]');
        const mostrarSolicitudBtn = partes[0].texto.includes('[SOLICITUD]');
        agregarMensaje('', false, false, partes, mensajeId, parteActual, partes.length, libroBuscado, mostrarReservaBtn, mostrarSolicitudBtn);
    }
}

function agregarMensaje(texto, esUsuario = false, esTemporal = false, partes = null, mensajeId = null, parteActual = 1, totalPartes = 1, libroBuscado = null, mostrarReservaBtn = false, mostrarSolicitudBtn = false) {
    if (chatMensajes.children.length > 50) chatMensajes.removeChild(chatMensajes.firstChild);
    const mensajeDiv = document.createElement('div');
    mensajeDiv.className = `mensaje ${esUsuario ? 'user' : 'bot'}${esTemporal ? ' temporal' : ''}`;
    let mensajeTexto = esUsuario ? texto : texto;
    if (!esUsuario && !esTemporal && partes) {
        mensajeTexto = `**${partes[parteActual - 1].tipo.charAt(0).toUpperCase() + partes[parteActual - 1].tipo.slice(1)} (Parte ${parteActual}/${totalPartes})**:\n${partes[parteActual - 1].texto}`;
    }
    mensajeDiv.innerHTML = esUsuario ? sanitizeHTML(mensajeTexto) : marked.parse(sanitizeHTML(mensajeTexto));
    if (!esUsuario && !esTemporal) {
        if (partes && parteActual < totalPartes) {
            const proseguirBtn = document.createElement('button');
            proseguirBtn.className = 'btn proseguir-btn';
            proseguirBtn.textContent = 'Proseguir respuesta';
            proseguirBtn.setAttribute('aria-label', `Mostrar la parte ${parteActual + 1} de ${totalPartes} de la respuesta`);
            proseguirBtn.onclick = () => mostrarSiguienteParte(mensajeId, parteActual + 1);
            mensajeDiv.appendChild(proseguirBtn);
        }
        if (libroBuscado) {
            const buscarBtn = document.createElement('button');
            buscarBtn.className = 'btn buscar-btn';
            buscarBtn.textContent = 'Abrir ventana de búsqueda';
            buscarBtn.setAttribute('aria-label', `Abrir ventana de búsqueda con resultados para ${libroBuscado}`);
            buscarBtn.onclick = () => abrirBuscadorLibro(libroBuscado);
            mensajeDiv.appendChild(buscarBtn);
        }
        if (mostrarReservaBtn) {
            const reservaBtn = document.createElement('button');
            reservaBtn.className = 'btn reserva-btn';
            reservaBtn.textContent = 'Reserva de Libros';
            reservaBtn.setAttribute('aria-label', `Abrir formulario de reserva de libros`);
            reservaBtn.onclick = () => window.open('ENLACE_POR_DETERMINAR', '_blank');
            mensajeDiv.appendChild(reservaBtn);
        }
        if (mostrarSolicitudBtn) {
            const solicitudBtn = document.createElement('button');
            solicitudBtn.className = 'btn solicitud-btn';
            solicitudBtn.textContent = 'Solicitud de Libros Nuevos';
            solicitudBtn.setAttribute('aria-label', `Abrir formulario de solicitud de libros nuevos`);
            solicitudBtn.onclick = () => window.open('ENLACE_POR_DETERMINAR', '_blank');
            mensajeDiv.appendChild(solicitudBtn);
        }
    }
    chatMensajes.appendChild(mensajeDiv);
    chatMensajes.scrollTop = chatMensajes.scrollHeight;
    if (!esTemporal) {
        historialMensajes.push({ role: esUsuario ? 'user' : 'assistant', content: texto });
        if (historialMensajes.length > 10) historialMensajes = historialMensajes.slice(-10);
    }
    return mensajeDiv;
}

function formatearResultados(resultados, libroBuscado) {
    if (!resultados.length) {
        return {
            texto: `No encontré "${libroBuscado}" en el catálogo. Usa el botón **Solicitud de Libros Nuevos** para proponerlo. ¿Quieres abrir la ventana de búsqueda para ver otras opciones? 📖`,
            mostrarSolicitudBtn: true,
            libroBuscado
        };
    }
    const libro = resultados[0];
    return {
        texto: `Hay ${libro.copiasTotales} ejemplares totales de "${libro.titulo}", de los cuales ${libro.copiasDisponibles} están disponibles. Usa el botón **Reserva de Libros** para reservarlo. ¿Quieres abrir la ventana de búsqueda para ver más detalles? 📖`,
        mostrarReservaBtn: true,
        libroBuscado
    };
}

function generarRecomendacion(intencion) {
    if (!catalogo.length) {
        return {
            texto: 'El catálogo no está disponible ahora mismo. Usa el botón **Solicitud de Libros Nuevos** para proponer un libro. ¿Otro género? 📖',
            libroBuscado: null,
            mostrarSolicitudBtn: true
        };
    }
    let librosFiltrados = catalogo;
    let descripcion = '';
    const categoriaMap = {
        recomendacion_fantasia: { categoria: 'narrativa', desc: 'una emocionante obra de narrativa, ideal para amantes de la fantasía y la aventura.' },
        recomendacion_poesia: { categoria: 'poesia', desc: 'un hermoso poemario que captura emociones profundas.' },
        recomendacion_narrativa: { categoria: 'narrativa', desc: 'una novela cautivadora que te sumergirá en una gran historia.' },
        recomendacion_teatro: { categoria: 'teatro', desc: 'una obra teatral fascinante, llena de diálogos y emociones.' },
        recomendacion_comic: { categoria: 'cómic', desc: 'un cómic vibrante con historias visuales emocionantes.' },
        recomendacion_literatura_inglesa: { categoria: 'literatura inglesa', desc: 'una obra en inglés que destaca por su riqueza literaria.' },
        recomendacion_deportes: { categoria: 'deportes', desc: 'un libro apasionante sobre deportes, perfecto para entusiastas.' }
    };
    if (categoriaMap[intencion]) {
        librosFiltrados = catalogo.filter(libro => normalizarTexto(libro.categoria) === categoriaMap[intencion].categoria);
        descripcion = categoriaMap[intencion].desc;
    } else {
        const categorias = ['Narrativa', 'Poesía', 'Teatro', 'Literatura inglesa', 'Enciclopedias', 'Cómic', 'Deportes'];
        const categoriaAleatoria = categorias[Math.floor(Math.random() * categorias.length)];
        librosFiltrados = catalogo.filter(libro => normalizarTexto(libro.categoria) === normalizarTexto(categoriaAleatoria));
        descripcion = `una obra destacada de ${categoriaAleatoria.toLowerCase()}, perfecta para explorar algo nuevo.`;
    }
    if (librosFiltrados.length === 0) {
        return {
            texto: `No encontré libros en esa categoría en el catálogo. Usa el botón **Solicitud de Libros Nuevos** para proponer uno. ¿Otro tipo de libro? 📖`,
            libroBuscado: null,
            mostrarSolicitudBtn: true
        };
    }
    const libro = librosFiltrados[Math.floor(Math.random() * librosFiltrados.length)];
    const texto = `Te recomiendo *${libro.titulo}* de ${libro.autor} (${libro.categoria}). Es ${descripcion} Hay ${libro.copiasTotales} ejemplares totales, de los cuales ${libro.copiasDisponibles} están disponibles. Usa el botón **Reserva de Libros** para reservarlo. ¿Quieres abrir la ventana de búsqueda para ver más detalles? 📖`;
    return {
        texto,
        libroBuscado: libro.titulo,
        mostrarReservaBtn: true
    };
}

const intenciones = {
    ejemplares: ['cuantos', 'ejemplares', 'copias', 'disponibles', 'libros'],
    sinopsis: ['sinopsis'],
    resumen: ['resumen'],
    reseña: ['reseña', 'critica', 'opinion'],
    recomendaciones: ['recomendaciones', 'recomiendame', 'recomiéndame', 'sugerencias'],
    recomendacion_fantasia: ['fantasia', 'aventura'],
    recomendacion_poesia: ['poesia', 'poema'],
    recomendacion_narrativa: ['narrativa', 'novela'],
    recomendacion_teatro: ['teatro'],
    recomendacion_comic: ['comic', 'cómic'],
    recomendacion_literatura_inglesa: ['literatura inglesa', 'libros en ingles', 'libros en inglés'],
    recomendacion_deportes: ['deportes'],
    reservas: ['reservar', 'reserva'],
    solicitar: ['solicitar', 'proponer', 'nuevo libro']
};

function detectarIntencion(query) {
    const lowerQuery = normalizarTexto(query);
    for (const [intencion, palabras] of Object.entries(intenciones)) {
        if (palabras.some(palabra => lowerQuery.includes(palabra))) return intencion;
    }
    return 'general';
}

async function enviarMensaje() {
    if (!catalogo) {
        showToast('El catálogo aún está cargando. Intenta de nuevo en un momento.', 'warning');
        return;
    }
    const mensaje = sanitizeHTML(document.getElementById('chatInput').value.trim());
    if (!mensaje) {
        showToast('Por favor, escribe un mensaje.', 'warning');
        return;
    }
    agregarMensaje(mensaje, true);
    document.getElementById('chatInput').value = '';
    const escribiendoDiv = agregarMensaje('Hipat-IA está buscando en la estantería... 📚', false, true);
    const intencion = detectarIntencion(mensaje);
    const cacheKey = `${intencion}_${normalizarTexto(mensaje)}`;
    const mensajeId = mensajeActualId++;

    if (intencion === 'ejemplares') {
        const libroBuscado = extraerLibroDeConsulta(mensaje);
        if (!libroBuscado) {
            escribiendoDiv.remove();
            const respuesta = 'No entendí el título del libro. ¿Puedes especificarlo, por ejemplo, "cuántos ejemplares hay de La Colmena"? 📖';
            agregarMensaje(respuesta);
            return;
        }
        const resultados = buscarLibros(libroBuscado, true);
        escribiendoDiv.remove();
        const { texto, mostrarReservaBtn, mostrarSolicitudBtn, libroBuscado: libro } = formatearResultados(resultados, libroBuscado);
        const partes = dividirTexto(texto, 'respuesta');
        respuestasPendientes[mensajeId] = partes;
        agregarMensaje('', false, false, partes, mensajeId, 1, partes.length, libro, mostrarReservaBtn, mostrarSolicitudBtn);
        cacheRespuestas[cacheKey] = texto;
        localStorage.setItem('hipatia_cache', JSON.stringify(cacheRespuestas));
        return;
    }

    if (['recomendaciones', 'recomendacion_fantasia', 'recomendacion_poesia', 'recomendacion_narrativa', 'recomendacion_teatro', 'recomendacion_comic', 'recomendacion_literatura_inglesa', 'recomendacion_deportes'].includes(intencion)) {
        escribiendoDiv.remove();
        const { texto, libroBuscado, mostrarReservaBtn, mostrarSolicitudBtn } = generarRecomendacion(intencion);
        const partes = dividirTexto(texto, 'recomendacion');
        respuestasPendientes[mensajeId] = partes;
        agregarMensaje('', false, false, partes, mensajeId, 1, partes.length, libroBuscado, mostrarReservaBtn, mostrarSolicitudBtn);
        cacheRespuestas[cacheKey] = texto;
        localStorage.setItem('hipatia_cache', JSON.stringify(cacheRespuestas));
        return;
    }

    if (intencion === 'reservas') {
        escribiendoDiv.remove();
        const texto = `Puedes reservar un libro usando el botón **Reserva de Libros**. ¿Quieres buscar un libro específico? 📖`;
        const partes = dividirTexto(texto, 'respuesta');
        respuestasPendientes[mensajeId] = partes;
        agregarMensaje('', false, false, partes, mensajeId, 1, partes.length, null, true, false);
        cacheRespuestas[cacheKey] = texto;
        localStorage.setItem('hipatia_cache', JSON.stringify(cacheRespuestas));
        return;
    }

    if (intencion === 'solicitar') {
        escribiendoDiv.remove();
        const texto = `Puedes proponer un libro nuevo usando el botón **Solicitud de Libros Nuevos**. ¿Qué libro te gustaría sugerir? 📖`;
        const partes = dividirTexto(texto,-workflow 'respuesta');
        respuestasPendientes[mensajeId] = partes;
        agregarMensaje('', false, false, partes, mensajeId, 1, partes.length, null, false, true);
        cacheRespuestas[cacheKey] = texto;
        localStorage.setItem('hipatia_cache', JSON.stringify(cacheRespuestas));
        return;
    }

    if (cacheRespuestas[cacheKey]) {
        escribiendoDiv.remove();
        const partes = dividirTexto(cacheRespuestas[cacheKey], intencion);
        respuestasPendientes[mensajeId] = partes;
        agregarMensaje('', false, false, partes, mensajeId, 1, partes.length, null, cacheRespuestas[cacheKey].includes('[RESERVA]'), cacheRespuestas[cacheKey].includes('[SOLICITUD]'));
        return;
    }

    const resultadosCatalogo = buscarLibros(mensaje);
    const contexto = resultadosCatalogo.length > 0
        ? `Resultados del catálogo de la Biblioteca Hipatia:\n${resultadosCatalogo.map((libro, index) => `
            - **Título**: ${libro.titulo}  
              **Autor**: ${libro.autor}  
              **Categoría**: ${libro.categoria}  
              **Tejuelo**: ${libro.signatura}  
              **Ejemplares totales**: ${libro.copiasTotales}  
              **Disponibles**: ${libro.copiasDisponibles}
        `).join('\n')}\n\n`
        : 'El catálogo no está disponible, pero puedo ofrecer sinopsis o recomendaciones generales. Usa el botón **Solicitud de Libros Nuevos** para proponer un libro.\n\n';
    const { texto, mostrarReservaBtn, mostrarSolicitudBtn } = await consultarAPI(mensaje, intencion, contexto);
    escribiendoDiv.remove();
    const partes = dividirTexto(texto, intencion);
    respuestasPendientes[mensajeId] = partes;
    agregarMensaje('', false, false, partes, mensajeId, 1, partes.length, null, mostrarReservaBtn, mostrarSolicitudBtn);
    cacheRespuestas[cacheKey] = texto;
    localStorage.setItem('hipatia_cache', JSON.stringify(cacheRespuestas));
}

async function initApp() {
    const MIN_SPLASH_DURATION = 2000;
    const startTime = Date.now();
    loadTheme();
    await cargarCatalogo();
    const elapsedTime = Date.now() - startTime;
    const remainingTime = MIN_SPLASH_DURATION - elapsedTime;
    if (remainingTime > 0) await new Promise(resolve => setTimeout(resolve, remainingTime));
    const splash = document.getElementById('splash');
    splash.classList.add('hidden');
    document.getElementById('app').style.display = 'block';
    document.getElementById('seccionDerecha').style.display = 'block';
    setTimeout(() => splash.remove(), 500);
    agregarMensaje('Libros, autores, sinopsis, resúmenes... Mi magia es poderosa, pregunta. 📖');
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('searchModal').style.display === 'block') {
            cerrarModal();
        }
    });
}

initApp();