// chatbot.js - Versión unificada y corregida
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
        const response = await fetch('./Ejemplares.xml', { signal: controller.signal });
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

// Hacer enviarMensaje global
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
        console.error('Error al procesar mensaje:', error);
        agregarMensaje('¡Ups! Algo salió mal con Hipat-IA. 😔 Intenta de nuevo.', 'bot');
    }
    input.disabled = false;
    input.focus();
};

function agregarMensaje(texto, tipo, opciones = []) {
    const div = document.getElementById('chatMensajes');
    const p = document.createElement('p');
    p.className = `mensaje ${tipo}`;
    p.innerHTML = texto.replace(/\n/g, '<br>'); // Soporte para saltos de línea
    div.appendChild(p);
    if (opciones.length > 0) {
        const opcionesDiv = document.createElement('div');
        opcionesDiv.style.margin = '10px 0';
        opciones.forEach((opcion, index) => {
            const btn = document.createElement('button');
            btn.className = `chat-option-btn ${opcion.clase}`;
            btn.textContent = opcion.texto; // Usar numeración del texto
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
    const opcionesInicio = [
        { texto: '1. Recomendaciones 📚', accion: 'recomendaciones', clase: 'recomendaciones' },
        { texto: '2. Buscar un libro 🔍', accion: 'buscar', clase: 'buscar' },
        { texto: '3. Juguemos al trivial literario ❓', accion: 'trivial', clase: 'trivial' },
        { texto: '4. Explorar categorías literarias 📖', accion: 'categorias', clase: 'categorias' },
        { texto: '5. Reservar un libro ✅', accion: 'reserva', clase: 'reserva' },
        { texto: '6. Solicitar un libro 📝', accion: 'solicitud', clase: 'solicitud' },
        { texto: '7. Ver historial de consultas 🕒', accion: 'historial', clase: 'historial' },
        { texto: '8. Ver puntaje total 🌟', accion: 'ver_puntaje', clase: 'ver_puntaje' }
    ];

    // Cargar catálogo si no está listo
    if (catalogo.length === 0) {
        await cargarCatalogo();
        if (catalogo.length === 0 && estadoChat !== 'inicio') {
            agregarMensaje('El catálogo no está disponible. Intenta de nuevo más tarde. 😔', 'bot', opcionesInicio);
            estadoChat = 'inicio';
            return;
        }
    }

    if (estadoChat === 'inicio') {
        if (mensajeLower === 'hola' || mensajeLower === 'hi' || mensajeLower === 'hello') {
            agregarMensaje(frasesBienvenida[Math.floor(Math.random() * frasesBienvenida.length)], 'bot', opcionesInicio);
            return;
        }
        if (mensajeLower.match(/^\d+$/) && parseInt(mensajeLower) >= 1 && parseInt(mensajeLower) <= 8) {
            const acciones = ['recomendaciones', 'buscar', 'trivial', 'categorias', 'reserva', 'solicitud', 'historial', 'ver_puntaje'];
            manejarOpcion(acciones[parseInt(mensajeLower) - 1]);
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
        agregarMensaje('¡Hola! Elige una opción (1-8) o escribe un comando como "buscar", "recomendaciones", etc.', 'bot', opcionesInicio);
        return;
    }

    if (estadoChat === 'recomendaciones') {
        if (mensajeLower === '1' || mensajeLower.includes('generales')) {
            manejarOpcion('recomendaciones_generales');
        } else if (mensajeLower === '2' || mensajeLower.includes('personalizadas')) {
            manejarOpcion('recomendaciones_personalizadas');
        } else {
            agregarMensaje('Por favor, elige 1 para Generales o 2 para Personalizadas.', 'bot', [
                { texto: '1. Generales', accion: 'recomendaciones_generales', clase: 'recomendaciones_generales' },
                { texto: '2. Personalizadas', accion: 'recomendaciones_personalizadas', clase: 'recomendaciones_personalizadas' }
            ]);
        }
        return;
    }

    if (estadoChat === 'recomendaciones_personalizadas') {
        const categorias = [...new Set(catalogo.map(libro => libro.categoria))];
        const opcionIndex = parseInt(mensajeLower) - 1;
        if (opcionIndex >= 0 && opcionIndex < categorias.length) {
            manejarOpcion(`recomendaciones_categoria_${categorias[opcionIndex]}`);
        } else if (mensajeLower === `${categorias.length + 1}` || mensajeLower.includes('recientes')) {
            manejarOpcion('recomendaciones_recientes');
        } else if (mensajeLower === `${categorias.length + 2}` || mensajeLower.includes('autor')) {
            manejarOpcion('recomendaciones_autor');
        } else {
            agregarMensaje('Elige una opción válida.', 'bot', [
                ...categorias.map((cat, i) => ({ texto: `${i + 1}. ${cat}`, accion: `recomendaciones_categoria_${cat}`, clase: 'recomendaciones_personalizadas' })),
                { texto: `${categorias.length + 1}. Libros recientes`, accion: 'recomendaciones_recientes', clase: 'recomendaciones_personalizadas' },
                { texto: `${categorias.length + 2}. Por autor`, accion: 'recomendaciones_autor', clase: 'recomendaciones_personalizadas' }
            ]);
        }
        return;
    }

    if (estadoChat === 'recomendaciones_autor') {
        historialConsultas.push(`Recomendaciones por autor: ${mensaje}`);
        historialConsultas = historialConsultas.slice(-10);
        const resultados = catalogo.filter(libro => libro.autor.toLowerCase().includes(mensajeLower) && libro.copiasDisponibles > 0);
        const respuesta = resultados.length > 0
            ? `Libros de ${mensaje}:\n` + resultados.slice(0, 3).map(libro => `- *${libro.titulo}* por ${libro.autor}, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}`).join('\n')
            : `No encontré libros disponibles de ${mensaje}. 😔`;
        setTimeout(() => {
            agregarMensaje(respuesta, 'bot', opcionesInicio);
            estadoChat = 'inicio';
        }, 1000);
        return;
    }

    if (estadoChat === 'buscar') {
        historialConsultas.push(`Búsqueda: ${mensaje}`);
        historialConsultas = historialConsultas.slice(-10);
        const resultados = catalogo.filter(libro =>
            libro.titulo.toLowerCase().includes(mensajeLower) ||
            libro.autor.toLowerCase().includes(mensajeLower) ||
            libro.categoria.toLowerCase().includes(mensajeLower) ||
            libro.signatura.toLowerCase().includes(mensajeLower) ||
            libro.isbn.toLowerCase().includes(mensajeLower)
        );
        const respuesta = resultados.length > 0
            ? `¡Encontré ${resultados.length} libro(s)! 📚\n` + resultados.slice(0, 3).map(libro => `- *${libro.titulo}* por ${libro.autor}, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}`).join('\n')
            : 'No se encontraron libros con ese criterio. 😔';
        setTimeout(() => {
            agregarMensaje(respuesta, 'bot', opcionesInicio);
            estadoChat = 'inicio';
        }, 1000);
        return;
    }

    if (estadoChat === 'reserva') {
        historialConsultas.push(`Reserva: ${mensaje}`);
        historialConsultas = historialConsultas.slice(-10);
        const libro = catalogo.find(libro => libro.signatura.toLowerCase().includes(mensajeLower) || libro.titulo.toLowerCase().includes(mensajeLower));
        if (libro && libro.copiasDisponibles > 0) {
            setTimeout(() => {
                agregarMensaje(`Abriendo formulario de reserva para *${libro.titulo}*... ✅`, 'bot', opcionesInicio);
                window.open('URL_DEL_FORMULARIO_DE_RESERVA', '_blank');
                estadoChat = 'inicio';
            }, 1000);
        } else {
            setTimeout(() => {
                agregarMensaje(libro ? 'Lo siento, no hay copias disponibles. 😔' : 'No encontré ese libro. 😔', 'bot', opcionesInicio);
                estadoChat = 'inicio';
            }, 1000);
        }
        return;
    }

    if (estadoChat === 'solicitud') {
        historialConsultas.push(`Solicitud: ${mensaje}`);
        historialConsultas = historialConsultas.slice(-10);
        const libro = catalogo.find(libro => libro.titulo.toLowerCase().includes(mensajeLower));
        if (libro) {
            setTimeout(() => {
                agregarMensaje(`*${libro.titulo}* ya está en el catálogo (Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}). ¿Quieres reservarlo?`, 'bot', [
                    { texto: 'Sí, reservar', accion: 'reserva', clase: 'reserva' },
                    { texto: 'No, volver al menú', accion: 'inicio', clase: 'inicio' }
                ]);
            }, 1000);
        } else {
            setTimeout(() => {
                agregarMensaje(`Abriendo formulario de solicitud para *${mensaje}*... 📝`, 'bot', opcionesInicio);
                window.open('URL_DEL_FORMULARIO_DE_SOLICITUD', '_blank');
                estadoChat = 'inicio';
            }, 1000);
        }
        return;
    }

    if (estadoChat === 'trivial') {
        if (!trivialPreguntaActual) return;
        historialConsultas.push(`Trivial: ¿Quién escribió *${trivialPreguntaActual.titulo}*? Respuesta: ${mensaje}`);
        historialConsultas = historialConsultas.slice(-10);
        const esCorrecta = mensajeLower.includes(trivialPreguntaActual.autor.toLowerCase());
        if (esCorrecta) {
            puntuacion += 5;
            aciertosConsecutivos++;
            let respuesta = `¡Correcto! +5 puntos. Puntuación: ${puntuacion}.`;
            if (aciertosConsecutivos >= 3) {
                puntuacion += 30;
                aciertosConsecutivos = 0;
                respuesta += `\n¡Increíble, tres aciertos seguidos! 🎉 +30 puntos extra. Puntuación: ${puntuacion}.`;
            }
            setTimeout(() => {
                agregarMensaje(respuesta, 'bot', [
                    { texto: 'Otra pregunta', accion: 'trivial', clase: 'trivial' },
                    { texto: 'Ver puntaje total', accion: 'ver_puntaje', clase: 'ver_puntaje' }
                ]);
                localStorage.setItem('trivialPuntuacion', puntuacion);
                localStorage.setItem('aciertosConsecutivos', aciertosConsecutivos);
            }, 1000);
        } else {
            aciertosConsecutivos = 0;
            setTimeout(() => {
                agregarMensaje(`¡Ups! La respuesta correcta era *${trivialPreguntaActual.autor}*. Puntuación: ${puntuacion}.`, 'bot', [
                    { texto: 'Otra pregunta', accion: 'trivial', clase: 'trivial' },
                    { texto: 'Ver puntaje total', accion: 'ver_puntaje', clase: 'ver_puntaje' }
                ]);
                localStorage.setItem('trivialPuntuacion', puntuacion);
                localStorage.setItem('aciertosConsecutivos', aciertosConsecutivos);
            }, 1000);
        }
        trivialPreguntaActual = null;
        return;
    }
}

async function manejarOpcion(opcion) {
    const opcionesInicio = [
        { texto: '1. Recomendaciones 📚', accion: 'recomendaciones', clase: 'recomendaciones' },
        { texto: '2. Buscar un libro 🔍', accion: 'buscar', clase: 'buscar' },
        { texto: '3. Juguemos al trivial literario ❓', accion: 'trivial', clase: 'trivial' },
        { texto: '4. Explorar categorías literarias 📖', accion: 'categorias', clase: 'categorias' },
        { texto: '5. Reservar un libro ✅', accion: 'reserva', clase: 'reserva' },
        { texto: '6. Solicitar un libro 📝', accion: 'solicitud', clase: 'solicitud' },
        { texto: '7. Ver historial de consultas 🕒', accion: 'historial', clase: 'historial' },
        { texto: '8. Ver puntaje total 🌟', accion: 'ver_puntaje', clase: 'ver_puntaje' }
    ];

    if (opcion === 'inicio') {
        estadoChat = 'inicio';
        setTimeout(() => {
            agregarMensaje('¿Qué quieres hacer?', 'bot', opcionesInicio);
        }, 1000);
        return;
    }

    if (catalogo.length === 0) {
        await cargarCatalogo();
        if (catalogo.length === 0) {
            agregarMensaje('El catálogo no está disponible. Intenta de nuevo más tarde. 😔', 'bot', opcionesInicio);
            return;
        }
    }

    if (opcion === 'recomendaciones') {
        estadoChat = 'recomendaciones';
        setTimeout(() => {
            agregarMensaje('¿Qué tipo de recomendaciones quieres? 📚', 'bot', [
                { texto: '1. Generales', accion: 'recomendaciones_generales', clase: 'recomendaciones_generales' },
                { texto: '2. Personalizadas', accion: 'recomendaciones_personalizadas', clase: 'recomendaciones_personalizadas' }
            ]);
        }, 1000);
        return;
    }

    if (opcion === 'recomendaciones_generales') {
        const resultados = catalogo.filter(libro => libro.copiasDisponibles > 0);
        const seleccion = resultados.sort(() => 0.5 - Math.random()).slice(0, 3);
        const respuesta = seleccion.length > 0
            ? `Te recomiendo:\n` + seleccion.map(libro => `- *${libro.titulo}* por ${libro.autor}, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}`).join('\n')
            : 'No hay libros disponibles para recomendar. 😔';
        historialConsultas.push(`Recomendaciones generales: ${seleccion.map(l => l.titulo).join(', ')}`);
        historialConsultas = historialConsultas.slice(-10);
        setTimeout(() => {
            agregarMensaje(respuesta, 'bot', opcionesInicio);
            estadoChat = 'inicio';
        }, 1000);
        return;
    }

    if (opcion === 'recomendaciones_personalizadas') {
        estadoChat = 'recomendaciones_personalizadas';
        const categorias = [...new Set(catalogo.map(libro => libro.categoria))];
        setTimeout(() => {
            agregarMensaje('Elige una categoría o tipo:', 'bot', [
                ...categorias.map((cat, i) => ({ texto: `${i + 1}. ${cat}`, accion: `recomendaciones_categoria_${cat}`, clase: 'recomendaciones_personalizadas' })),
                { texto: `${categorias.length + 1}. Libros recientes`, accion: 'recomendaciones_recientes', clase: 'recomendaciones_personalizadas' },
                { texto: `${categorias.length + 2}. Por autor`, accion: 'recomendaciones_autor', clase: 'recomendaciones_personalizadas' }
            ]);
        }, 1000);
        return;
    }

    if (opcion.startsWith('recomendaciones_categoria_')) {
        const categoria = opcion.replace('recomendaciones_categoria_', '');
        const resultados = catalogo.filter(libro => libro.categoria === categoria && libro.copiasDisponibles > 0);
        const seleccion = resultados.sort(() => 0.5 - Math.random()).slice(0, 3);
        const respuesta = seleccion.length > 0
            ? `Te recomiendo en ${categoria}:\n` + seleccion.map(libro => `- *${libro.titulo}* por ${libro.autor}, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}`).join('\n')
            : `No hay libros disponibles en ${categoria}. 😔`;
        historialConsultas.push(`Recomendaciones en ${categoria}: ${seleccion.map(l => l.titulo).join(', ')}`);
        historialConsultas = historialConsultas.slice(-10);
        setTimeout(() => {
            agregarMensaje(respuesta, 'bot', opcionesInicio);
            estadoChat = 'inicio';
        }, 1000);
        return;
    }

    if (opcion === 'recomendaciones_recientes') {
        const resultados = catalogo.filter(libro => parseInt(libro.fechaEdicion) >= new Date().getFullYear() - 5 && libro.copiasDisponibles > 0);
        const seleccion = resultados.sort(() => 0.5 - Math.random()).slice(0, 3);
        const respuesta = seleccion.length > 0
            ? `Libros recientes:\n` + seleccion.map(libro => `- *${libro.titulo}* por ${libro.autor}, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}`).join('\n')
            : 'No hay libros recientes disponibles. 😔';
        historialConsultas.push(`Recomendaciones recientes: ${seleccion.map(l => l.titulo).join(', ')}`);
        historialConsultas = historialConsultas.slice(-10);
        setTimeout(() => {
            agregarMensaje(respuesta, 'bot', opcionesInicio);
            estadoChat = 'inicio';
        }, 1000);
        return;
    }

    if (opcion === 'recomendaciones_autor') {
        estadoChat = 'recomendaciones_autor';
        setTimeout(() => {
            agregarMensaje('Dime el nombre del autor:', 'bot');
        }, 1000);
        return;
    }

    if (opcion === 'buscar') {
        estadoChat = 'buscar';
        setTimeout(() => {
            agregarMensaje('Escribe el título, autor, categoría, tejuelo o ISBN:', 'bot');
        }, 1000);
        return;
    }

    if (opcion === 'trivial') {
        estadoChat = 'trivial';
        const libro = catalogo[Math.floor(Math.random() * catalogo.length)];
        trivialPreguntaActual = { titulo: libro.titulo, autor: libro.autor };
        setTimeout(() => {
            agregarMensaje(`¿Quién escribió *${libro.titulo}*? Escribe el autor.`, 'bot');
        }, 1000);
        return;
    }

    if (opcion === 'categorias') {
        const categorias = [...new Set(catalogo.map(libro => libro.categoria))];
        const respuesta = categorias.length > 0
            ? `Categorías disponibles: ${categorias.join(', ')}`
            : 'No hay categorías disponibles. 😔';
        historialConsultas.push(`Exploración de categorías`);
        historialConsultas = historialConsultas.slice(-10);
        setTimeout(() => {
            agregarMensaje(respuesta, 'bot', opcionesInicio);
            estadoChat = 'inicio';
        }, 1000);
        return;
    }

    if (opcion === 'reserva') {
        estadoChat = 'reserva';
        setTimeout(() => {
            agregarMensaje('Escribe el tejuelo o título del libro a reservar:', 'bot');
        }, 1000);
        return;
    }

    if (opcion === 'solicitud') {
        estadoChat = 'solicitud';
        setTimeout(() => {
            agregarMensaje('Escribe el título del libro a solicitar:', 'bot');
        }, 1000);
        return;
    }

    if (opcion === 'historial') {
        const respuesta = historialConsultas.length > 0
            ? `Últimas consultas:\n` + historialConsultas.slice(-5).map((c, i) => `${i + 1}. ${c}`).join('\n')
            : 'No hay consultas recientes.';
        setTimeout(() => {
            agregarMensaje(respuesta, 'bot', opcionesInicio);
            estadoChat = 'inicio';
        }, 1000);
        return;
    }

    if (opcion === 'ver_puntaje') {
        const respuesta = puntuacion > 0
            ? `Tu puntaje total es: ${puntuacion} 🌟`
            : '¡Aún no tienes puntos! Juega al trivial para sumar. ❓';
        setTimeout(() => {
            agregarMensaje(respuesta, 'bot', opcionesInicio);
            estadoChat = 'inicio';
        }, 1000);
        return;
    }
}

// Inicializar al cargar la página
window.addEventListener('load', async () => {
    await cargarCatalogo();
    const opcionesInicio = [
        { texto: '1. Recomendaciones 📚', accion: 'recomendaciones', clase: 'recomendaciones' },
        { texto: '2. Buscar un libro 🔍', accion: 'buscar', clase: 'buscar' },
        { texto: '3. Juguemos al trivial literario ❓', accion: 'trivial', clase: 'trivial' },
        { texto: '4. Explorar categorías literarias 📖', accion: 'categorias', clase: 'categorias' },
        { texto: '5. Reservar un libro ✅', accion: 'reserva', clase: 'reserva' },
        { texto: '6. Solicitar un libro 📝', accion: 'solicitud', clase: 'solicitud' },
        { texto: '7. Ver historial de consultas 🕒', accion: 'historial', clase: 'historial' },
        { texto: '8. Ver puntaje total 🌟', accion: 'ver_puntaje', clase: 'ver_puntaje' }
    ];
    setTimeout(() => {
        agregarMensaje(frasesBienvenida[Math.floor(Math.random() * frasesBienvenida.length)], 'bot', opcionesInicio);
    }, 1000);
});