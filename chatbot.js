// chatbot.js - Versión corregida para el envío de mensajes y carga de Ejemplares.xml
let catalogo = [];
let estadoChat = 'inicio';
let trivialPreguntaActual = null;
let puntuacion = localStorage.getItem('trivialPuntuacion') ? parseInt(localStorage.getItem('trivialPuntuacion')) : 0;
let aciertosConsecutivos = localStorage.getItem('aciertosConsecutivos') ? parseInt(localStorage.getItem('aciertosConsecutivos')) : 0;
let historialConsultas = [];

const frasesBienvenida = [
    '¡Bienvenid@ a la Biblioteca Hipatia! 📚 ¿Cómo te ayudo hoy?',
    '¡Hola, amante de los libros! 📖 ¿Qué aventura literaria buscas?',
    '¡Qué alegría verte! 😊 ¿Qué quieres explorar en nuestra biblioteca?'
];
const frasesProcesando = [
    '¡Un momento, estoy buscando eso para ti! 🔍',
    'Dame un segundo, estoy revisando el catálogo... 📚',
    '¡Buscando en los estantes virtuales! 📖'
];

async function cargarCatalogo() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const cachedCatalogo = localStorage.getItem('catalogo');
        if (cachedCatalogo) {
            catalogo = JSON.parse(cachedCatalogo);
            return;
        }
        const response = await fetch('Ejemplares.xml', { signal: controller.signal });
        clearTimeout(timeoutId);
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
            const rawCategoria = libro.getElementsByTagName('Descriptor')[0]?.textContent || 'No disponible';
            const categoriaMap = {
                'narrativa': 'Narrativa',
                'poesia': 'Poesía',
                'poesía': 'Poesía',
                'teatro': 'Teatro',
                'literatura inglesa': 'Literatura inglesa',
                'otras materias': 'Otras Materias',
                'comic': 'Cómic',
                'cómic': 'Cómic'
            };
            const categoria = categoriaMap[rawCategoria.toLowerCase()] || rawCategoria;
            libros[idDocumento] = {
                titulo: libro.getElementsByTagName('Titulo')[0]?.textContent || 'Sin título',
                autor: libro.getElementsByTagName('Autor')[0]?.textContent || 'Desconocido',
                categoria: categoria,
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
                'Otras Materias': 'OM',
                'Cómic': 'C'
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
                    copiasDisponibles: 0,
                    idRegistro: idRegistro
                };
            }
            if (ejemplar.getAttribute('Estado') === '0') {
                librosAgrupados[idRegistro].copiasDisponibles += 1;
            }
        });
        catalogo = Object.values(librosAgrupados);
        localStorage.setItem('catalogo', JSON.stringify(catalogo));
        if (catalogo.length === 0) throw new Error('El catálogo está vacío');
    } catch (error) {
        console.error('Error al cargar Ejemplares.xml:', error);
        window.showToast('No se pudo cargar el catálogo. Intenta de nuevo más tarde.', 'error');
        catalogo = [];
    }
}

// Función enviarMensaje - Hacerla global para que coincida con onclick y onkeypress en HTML
window.enviarMensaje = async function() {
    const input = document.getElementById('chatInput');
    const mensaje = input.value.trim();
    if (!mensaje) return;
    agregarMensaje(mensaje, 'user');
    input.value = '';
    input.disabled = true;
    try {
        await procesarMensaje(mensaje);
    } catch (error) {
        agregarMensaje('¡Ups! Algo salió mal con Hipat-IA. 😔 Intenta de nuevo.', 'bot');
    }
    input.disabled = false;
    input.focus();
};

function agregarMensaje(texto, tipo, opciones = []) {
    const div = document.getElementById('chatMensajes');
    const p = document.createElement('p');
    p.className = `mensaje ${tipo}`;
    p.textContent = texto;
    div.appendChild(p);
    if (opciones.length > 0) {
        const opcionesDiv = document.createElement('div');
        opcionesDiv.style.margin = '10px 0';
        opciones.forEach((opcion, index) => {
            const btn = document.createElement('button');
            btn.className = `chat-option-btn ${opcion.clase}`;
            btn.textContent = `${index + 1}. ${opcion.texto}`;
            btn.onclick = () => manejarOpcion(opcion.accion);
            btn.setAttribute('aria-label', opcion.texto);
            opcionesDiv.appendChild(btn);
        });
        div.appendChild(opcionesDiv);
    }
    requestAnimationFrame(() => {
        div.scrollTop = div.scrollHeight;
    });
}

async function procesarMensaje(mensaje) {
    const mensajeLower = mensaje.toLowerCase().trim();
    if (catalogo.length === 0) {
        await cargarCatalogo();
        if (catalogo.length === 0) {
            agregarMensaje('El catálogo no está disponible. Intenta de nuevo más tarde. 😔', 'bot');
            return;
        }
    }
    const opcionesInicio = [
        { texto: 'Recomendaciones 📚', accion: 'recomendaciones', clase: 'recomendaciones' },
        { texto: 'Buscar un libro 🔍', accion: 'buscar', clase: 'buscar' },
        { texto: 'Juguemos al trivial literario ❓', accion: 'trivial', clase: 'trivial' },
        { texto: 'Explorar categorías literarias 📖', accion: 'categorias', clase: 'categorias' },
        { texto: 'Reservar un libro ✅', accion: 'reserva', clase: 'reserva' },
        { texto: 'Solicitar un libro 📝', accion: 'solicitud', clase: 'solicitud' },
        { texto: 'Ver historial de consultas 🕒', accion: 'historial', clase: 'historial' },
        { texto: 'Ver puntaje total 🌟', accion: 'ver_puntaje', clase: 'ver_puntaje' }
    ];
    if (estadoChat === 'inicio') {
        if (mensajeLower === 'hola' || mensajeLower === 'hi' || mensajeLower === 'hello') {
            agregarMensaje(frasesBienvenida[Math.floor(Math.random() * frasesBienvenida.length)], 'bot', opcionesInicio);
            return;
        }
        if (mensajeLower.includes('recomienda') || mensajeLower.includes('sugiere')) {
            manejarOpcion('recomendaciones');
            return;
        } else if (mensajeLower.includes('buscar') || mensajeLower.includes('disponible')) {
            manejarOpcion('buscar');
            return;
        } else if (mensajeLower.includes('trivial') || mensajeLower.includes('jugar')) {
            manejarOpcion('trivial');
            return;
        } else if (mensajeLower.includes('categoría') || mensajeLower.includes('categorías')) {
            manejarOpcion('categorias');
            return;
        } else if (mensajeLower.includes('reservar')) {
            manejarOpcion('reserva');
            return;
        } else if (mensajeLower.includes('solicitar')) {
            manejarOpcion('solicitud');
            return;
        } else if (mensajeLower.includes('historial')) {
            manejarOpcion('historial');
            return;
        } else if (mensajeLower.includes('puntaje') || mensajeLower.includes('puntuación')) {
            manejarOpcion('ver_puntaje');
            return;
        }
        agregarMensaje('¡Hola! Para empezar, elige una opción o escribe un comando como "buscar libro" o "recomendaciones".', 'bot', opcionesInicio);
        return;
    }
    // Lógica para otros estados (buscar, reserva, solicitud, trivial, etc.) - similar a la anterior
    if (estadoChat === 'buscar') {
        const resultados = catalogo.filter(libro =>
            libro.titulo.toLowerCase().includes(mensajeLower) ||
            libro.autor.toLowerCase().includes(mensajeLower) ||
            libro.categoria.toLowerCase().includes(mensajeLower) ||
            libro.signatura.toLowerCase().includes(mensajeLower) ||
            libro.isbn.toLowerCase().includes(mensajeLower)
        );
        let respuesta = resultados.length > 0
            ? `¡Encontré ${resultados.length} libro(s)! 📚\n` + resultados.slice(0, 3).map(libro => `- *${libro.titulo}* por ${libro.autor}, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}`).join('\n')
            : 'No se encontraron libros con ese criterio. 😔';
        agregarMensaje(respuesta, 'bot', opcionesInicio);
        estadoChat = 'inicio';
        return;
    }
    // Añadir lógica para otros estados (reserva, solicitud, trivial, etc.) según sea necesario - para brevidad, asumo que se implementa similarmente
    agregarMensaje('Mensaje procesado en estado ' + estadoChat, 'bot', opcionesInicio);
    estadoChat = 'inicio';
}

async function manejarOpcion(opcion) {
    if (catalogo.length === 0) {
        await cargarCatalogo();
        if (catalogo.length === 0) {
            agregarMensaje('El catálogo no está disponible. Intenta de nuevo más tarde. 😔', 'bot');
            return;
        }
    }
    const opcionesInicio = [
        { texto: 'Recomendaciones 📚', accion: 'recomendaciones', clase: 'recomendaciones' },
        { texto: 'Buscar un libro 🔍', accion: 'buscar', clase: 'buscar' },
        { texto: 'Juguemos al trivial literario ❓', accion: 'trivial', clase: 'trivial' },
        { texto: 'Explorar categorías literarias 📖', accion: 'categorias', clase: 'categorias' },
        { texto: 'Reservar un libro ✅', accion: 'reserva', clase: 'reserva' },
        { texto: 'Solicitar un libro 📝', accion: 'solicitud', clase: 'solicitud' },
        { texto: 'Ver historial de consultas 🕒', accion: 'historial', clase: 'historial' },
        { texto: 'Ver puntaje total 🌟', accion: 'ver_puntaje', clase: 'ver_puntaje' }
    ];
    if (opcion === 'recomendaciones') {
        estadoChat = 'recomendaciones';
        agregarMensaje('¿Qué tipo de recomendaciones quieres? 📚', 'bot', [
            { texto: 'Generales', accion: 'recomendaciones_generales', clase: 'recomendaciones_generales' },
            { texto: 'Personalizadas', accion: 'recomendaciones_personalizadas', clase: 'recomendaciones_personalizadas' }
        ]);
        return;
    }
    if (opcion === 'recomendaciones_generales') {
        const resultados = catalogo.filter(libro => libro.copiasDisponibles > 0);
        const seleccion = resultados.sort(() => 0.5 - Math.random()).slice(0, 2);
        const respuesta = seleccion.length > 0
            ? `Te recomiendo:\n` + seleccion.map(libro => `- *${libro.titulo}* por ${libro.autor}, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}`).join('\n')
            : 'No hay libros disponibles para recomendar. 😔';
        agregarMensaje(respuesta, 'bot', opcionesInicio);
        estadoChat = 'inicio';
        return;
    }
    if (opcion === 'recomendaciones_personalizadas') {
        estadoChat = 'recomendaciones_personalizadas';
        const categorias = [...new Set(catalogo.map(libro => libro.categoria))];
        const opciones = categorias.map(cat => ({ texto: cat, accion: 'recomendaciones_categoria_' + cat, clase: 'recomendaciones_personalizadas' }));
        agregarMensaje('Elige una categoría:', 'bot', opciones);
        return;
    }
    if (opcion.startsWith('recomendaciones_categoria_')) {
        const categoria = opcion.replace('recomendaciones_categoria_', '');
        const resultados = catalogo.filter(libro => libro.categoria === categoria && libro.copiasDisponibles > 0);
        const seleccion = resultados.sort(() => 0.5 - Math.random()).slice(0, 2);
        const respuesta = seleccion.length > 0
            ? `Te recomiendo:\n` + seleccion.map(libro => `- *${libro.titulo}* por ${libro.autor}, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}`).join('\n')
            : 'No hay libros disponibles en esta categoría. 😔';
        agregarMensaje(respuesta, 'bot', opcionesInicio);
        estadoChat = 'inicio';
        return;
    }
    if (opcion === 'buscar') {
        estadoChat = 'buscar';
        agregarMensaje('Escribe el término de búsqueda:', 'bot');
        return;
    }
    if (opcion === 'trivial') {
        estadoChat = 'trivial';
        const libro = catalogo[Math.floor(Math.random() * catalogo.length)];
        trivialPreguntaActual = { titulo: libro.titulo, autor: libro.autor };
        agregarMensaje(`¿Quién escribió *${libro.titulo}*? Escribe el autor.`, 'bot');
        return;
    }
    if (opcion === 'ver_puntaje') {
        agregarMensaje(`Tu puntaje total es: ${puntuacion}.`, 'bot', opcionesInicio);
        estadoChat = 'inicio';
        return;
    }
    // Añadir más casos según sea necesario...
    agregarMensaje('Opción procesada: ' + opcion, 'bot', opcionesInicio);
    estadoChat = 'inicio';
}

// Inicializar al cargar la página
window.addEventListener('load', async () => {
    await cargarCatalogo();
    const opcionesInicio = [
        { texto: 'Recomendaciones 📚', accion: 'recomendaciones', clase: 'recomendaciones' },
        { texto: 'Buscar un libro 🔍', accion: 'buscar', clase: 'buscar' },
        { texto: 'Juguemos al trivial literario ❓', accion: 'trivial', clase: 'trivial' },
        { texto: 'Explorar categorías literarias 📖', accion: 'categorias', clase: 'categorias' },
        { texto: 'Reservar un libro ✅', accion: 'reserva', clase: 'reserva' },
        { texto: 'Solicitar un libro 📝', accion: 'solicitud', clase: 'solicitud' },
        { texto: 'Ver historial de consultas 🕒', accion: 'historial', clase: 'historial' },
        { texto: 'Ver puntaje total 🌟', accion: 'ver_puntaje', clase: 'ver_puntaje' }
    ];
    agregarMensaje(frasesBienvenida[Math.floor(Math.random() * frasesBienvenida.length)], 'bot', opcionesInicio);
});