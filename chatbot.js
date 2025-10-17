let catalogo = [];
let estadoChat = 'inicio';
let historialConsultas = [];
let preguntaActual = null;
let puntuacionTotal = 0;
let aciertosConsecutivos = 0;
let categoriaSeleccionada = '';
let autorSeleccionado = '';

const frasesBienvenida = [
    '¡Qué alegría verte! 😊 ¿Qué quieres explorar en nuestra biblioteca?',
    '¡Bienvenid@ a la Biblioteca Hipatia! 📚 ¿Cómo te ayudo hoy?',
    '¡Listo para sumergirte en el mundo de los libros? 😄 ¿Qué buscas?'
];

const frasesProcesando = [
    'Un momento, estoy buscando en los estantes... 📖',
    'Déjame consultar el catálogo... 🕵️‍♀️',
    'Buscando la mejor respuesta para ti... 🔍'
];

async function cargarCatalogo() {
    try {
        const response = await fetch('./Ejemplares.xml');
        if (!response.ok) throw new Error('No se pudo cargar Ejemplares.xml');
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
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
        if (catalogo.length === 0) throw new Error('El catálogo está vacío');
    } catch (error) {
        console.error('Error al cargar Ejemplares.xml:', error);
        window.showToast('No se pudo cargar el catálogo. Intenta de nuevo más tarde.', 'error');
    }
}

function agregarMensaje(texto, clase, opciones = []) {
    const chatMensajes = document.getElementById('chatMensajes');
    const mensajeDiv = document.createElement('div');
    mensajeDiv.className = `mensaje ${clase}`;
    let opcionesHTML = '';
    if (opciones.length > 0) {
        opcionesHTML = opciones.map(op => `
            <button class="chat-option-btn ${op.clase}" onclick="procesarOpcion('${op.accion}')" aria-label="${op.texto}">
                ${op.texto}
            </button>
        `).join('');
    }
    mensajeDiv.innerHTML = `${texto}${opcionesHTML ? '<br>' + opcionesHTML : ''}`;
    chatMensajes.appendChild(mensajeDiv);
    chatMensajes.scrollTop = chatMensajes.scrollHeight;
}

function enviarMensaje() {
    const chatInput = document.getElementById('chatInput');
    const mensaje = chatInput.value.trim();
    if (!mensaje) return;
    agregarMensaje(mensaje, 'user');
    historialConsultas.push({ tipo: 'texto', valor: mensaje });
    chatInput.value = '';
    procesarMensaje(mensaje);
}

function procesarMensaje(mensaje) {
    const mensajeLower = mensaje.toLowerCase().trim();
    if (estadoChat === 'inicio') {
        const opciones = [
            { texto: '1. Recomendaciones 📚', accion: 'recomendaciones', clase: 'recomendaciones' },
            { texto: '2. Buscar un libro 🔍', accion: 'buscar', clase: 'buscar' },
            { texto: '3. Juguemos al trivial literario ❓', accion: 'trivial', clase: 'trivial' },
            { texto: '4. Explorar categorías literarias 📖', accion: 'categorias', clase: 'categorias' },
            { texto: '5. Reservar un libro ✅', accion: 'reserva', clase: 'reserva' },
            { texto: '6. Solicitar un libro 📝', accion: 'solicitud', clase: 'solicitud' },
            { texto: '7. Ver historial de consultas 🕒', accion: 'historial', clase: 'historial' },
            { texto: '8. Ver puntaje total 🌟', accion: 'ver_puntaje', clase: 'ver_puntaje' }
        ];
        if (['1', 'recomendaciones'].includes(mensajeLower)) {
            procesarOpcion('recomendaciones');
        } else if (['2', 'buscar'].includes(mensajeLower)) {
            procesarOpcion('buscar');
        } else if (['3', 'trivial'].includes(mensajeLower)) {
            procesarOpcion('trivial');
        } else if (['4', 'categorias'].includes(mensajeLower)) {
            procesarOpcion('categorias');
        } else if (['5', 'reservar'].includes(mensajeLower)) {
            procesarOpcion('reserva');
        } else if (['6', 'solicitar'].includes(mensajeLower)) {
            procesarOpcion('solicitud');
        } else if (['7', 'historial'].includes(mensajeLower)) {
            procesarOpcion('historial');
        } else if (['8', 'puntaje'].includes(mensajeLower)) {
            procesarOpcion('ver_puntaje');
        } else {
            const frase = frasesProcesando[Math.floor(Math.random() * frasesProcesando.length)];
            setTimeout(() => {
                agregarMensaje(`${frase} No entendí, por favor selecciona una opción:`, 'bot', opciones);
            }, 1000);
        }
    } else if (estadoChat === 'recomendaciones') {
        if (['1', 'generales'].includes(mensajeLower)) {
            procesarOpcion('recomendaciones_generales');
        } else if (['2', 'personalizadas'].includes(mensajeLower)) {
            procesarOpcion('recomendaciones_personalizadas');
        } else {
            agregarMensaje('Por favor, selecciona 1 para Generales o 2 para Personalizadas.', 'bot', [
                { texto: '1. Generales', accion: 'recomendaciones_generales', clase: 'recomendaciones_generales' },
                { texto: '2. Personalizadas', accion: 'recomendaciones_personalizadas', clase: 'recomendaciones_personalizadas' }
            ]);
        }
    } else if (estadoChat === 'recomendaciones_personalizadas') {
        if (['1', 'narrativa'].includes(mensajeLower)) {
            categoriaSeleccionada = 'Narrativa';
            procesarOpcion('recomendaciones_categoria');
        } else if (['2', 'poesía'].includes(mensajeLower)) {
            categoriaSeleccionada = 'Poesía';
            procesarOpcion('recomendaciones_categoria');
        } else if (['3', 'teatro'].includes(mensajeLower)) {
            categoriaSeleccionada = 'Teatro';
            procesarOpcion('recomendaciones_categoria');
        } else if (['4', 'cómic'].includes(mensajeLower)) {
            categoriaSeleccionada = 'Cómic';
            procesarOpcion('recomendaciones_categoria');
        } else if (['5', 'recientes'].includes(mensajeLower)) {
            procesarOpcion('recomendaciones_recientes');
        } else if (['6', 'autor'].includes(mensajeLower)) {
            procesarOpcion('recomendaciones_por_autor');
        } else {
            agregarMensaje('Por favor, selecciona una categoría válida (1-6).', 'bot', [
                { texto: '1. Narrativa', accion: 'recomendaciones_categoria', clase: 'recomendaciones_personalizadas' },
                { texto: '2. Poesía', accion: 'recomendaciones_categoria', clase: 'recomendaciones_personalizadas' },
                { texto: '3. Teatro', accion: 'recomendaciones_categoria', clase: 'recomendaciones_personalizadas' },
                { texto: '4. Cómic', accion: 'recomendaciones_categoria', clase: 'recomendaciones_personalizadas' },
                { texto: '5. Libros recientes', accion: 'recomendaciones_recientes', clase: 'recomendaciones_personalizadas' },
                { texto: '6. Por autor', accion: 'recomendaciones_por_autor', clase: 'recomendaciones_personalizadas' }
            ]);
        }
    } else if (estadoChat === 'recomendaciones_por_autor') {
        autorSeleccionado = mensaje;
        procesarOpcion('recomendaciones_autor');
    } else if (estadoChat === 'buscar') {
        procesarOpcion('buscar_confirmar', mensaje);
    } else if (estadoChat === 'reserva') {
        procesarOpcion('reserva_confirmar', mensaje);
    } else if (estadoChat === 'solicitud') {
        procesarOpcion('solicitud_confirmar', mensaje);
    } else if (estadoChat === 'trivial') {
        if (preguntaActual) {
            procesarRespuestaTrivial(mensaje);
        }
    }
}

function procesarOpcion(opcion, parametro = '') {
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
    if (opcion === 'recomendaciones') {
        estadoChat = 'recomendaciones';
        setTimeout(() => {
            agregarMensaje('¿Qué tipo de recomendaciones quieres? 📚', 'bot', [
                { texto: '1. Generales', accion: 'recomendaciones_generales', clase: 'recomendaciones_generales' },
                { texto: '2. Personalizadas', accion: 'recomendaciones_personalizadas', clase: 'recomendaciones_personalizadas' }
            ]);
        }, 1000);
    } else if (opcion === 'recomendaciones_generales') {
        setTimeout(() => {
            const librosDisponibles = catalogo.filter(libro => libro.copiasDisponibles > 0);
            if (librosDisponibles.length === 0) {
                agregarMensaje('Lo siento, no hay libros disponibles en este momento. 😔', 'bot', opcionesInicio);
            } else {
                const librosAleatorios = librosDisponibles.sort(() => 0.5 - Math.random()).slice(0, 3);
                const mensaje = 'Aquí tienes algunas recomendaciones generales: 📚<br>' +
                    librosAleatorios.map(libro => `- <strong>${libro.titulo}</strong> por ${libro.autor}, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}`).join('<br>');
                agregarMensaje(mensaje, 'bot', opcionesInicio);
            }
            estadoChat = 'inicio';
        }, 1000);
    } else if (opcion === 'recomendaciones_personalizadas') {
        estadoChat = 'recomendaciones_personalizadas';
        setTimeout(() => {
            agregarMensaje('¿Qué tipo de libro te interesa? 📖', 'bot', [
                { texto: '1. Narrativa', accion: 'recomendaciones_categoria', clase: 'recomendaciones_personalizadas' },
                { texto: '2. Poesía', accion: 'recomendaciones_categoria', clase: 'recomendaciones_personalizadas' },
                { texto: '3. Teatro', accion: 'recomendaciones_categoria', clase: 'recomendaciones_personalizadas' },
                { texto: '4. Cómic', accion: 'recomendaciones_categoria', clase: 'recomendaciones_personalizadas' },
                { texto: '5. Libros recientes', accion: 'recomendaciones_recientes', clase: 'recomendaciones_personalizadas' },
                { texto: '6. Por autor', accion: 'recomendaciones_por_autor', clase: 'recomendaciones_personalizadas' }
            ]);
        }, 1000);
    } else if (opcion === 'recomendaciones_categoria') {
        setTimeout(() => {
            const librosCategoria = catalogo.filter(libro => libro.categoria === categoriaSeleccionada && libro.copiasDisponibles > 0);
            if (librosCategoria.length === 0) {
                agregarMensaje(`No hay libros disponibles en ${categoriaSeleccionada}. 😔`, 'bot', opcionesInicio);
            } else {
                const librosAleatorios = librosCategoria.sort(() => 0.5 - Math.random()).slice(0, 3);
                const mensaje = `¡Perfecto para los fans de ${categoriaSeleccionada}! 📖<br>` +
                    librosAleatorios.map(libro => `- <strong>${libro.titulo}</strong> por ${libro.autor}, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}`).join('<br>');
                agregarMensaje(mensaje, 'bot', opcionesInicio);
            }
            estadoChat = 'inicio';
            categoriaSeleccionada = '';
        }, 1000);
    } else if (opcion === 'recomendaciones_recientes') {
        setTimeout(() => {
            const librosRecientes = catalogo.filter(libro => {
                const año = parseInt(libro.fechaEdicion) || 0;
                return año >= new Date().getFullYear() - 5 && libro.copiasDisponibles > 0;
            });
            if (librosRecientes.length === 0) {
                agregarMensaje('No hay libros recientes disponibles. 😔', 'bot', opcionesInicio);
            } else {
                const librosAleatorios = librosRecientes.sort(() => 0.5 - Math.random()).slice(0, 3);
                const mensaje = '¡Lo más reciente en la biblioteca! 🆕<br>' +
                    librosAleatorios.map(libro => `- <strong>${libro.titulo}</strong> por ${libro.autor}, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}`).join('<br>');
                agregarMensaje(mensaje, 'bot', opcionesInicio);
            }
            estadoChat = 'inicio';
        }, 1000);
    } else if (opcion === 'recomendaciones_por_autor') {
        estadoChat = 'recomendaciones_por_autor';
        setTimeout(() => {
            agregarMensaje('Escribe el nombre del autor que te interesa: ✍️', 'bot');
        }, 1000);
    } else if (opcion === 'recomendaciones_autor') {
        setTimeout(() => {
            const librosAutor = catalogo.filter(libro => libro.autor.toLowerCase().includes(autorSeleccionado.toLowerCase()) && libro.copiasDisponibles > 0);
            if (librosAutor.length === 0) {
                agregarMensaje(`No hay libros disponibles de ${autorSeleccionado}. 😔`, 'bot', opcionesInicio);
            } else {
                const librosAleatorios = librosAutor.sort(() => 0.5 - Math.random()).slice(0, 3);
                const mensaje = `¡Libros de ${autorSeleccionado}! ✍️<br>` +
                    librosAleatorios.map(libro => `- <strong>${libro.titulo}</strong>, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}`).join('<br>');
                agregarMensaje(mensaje, 'bot', opcionesInicio);
            }
            estadoChat = 'inicio';
            autorSeleccionado = '';
        }, 1000);
    } else if (opcion === 'buscar') {
        estadoChat = 'buscar';
        setTimeout(() => {
            agregarMensaje('Escribe el título, autor, categoría, tejuelo o ISBN del libro que buscas: 🔍', 'bot');
        }, 1000);
    } else if (opcion === 'buscar_confirmar') {
        setTimeout(() => {
            const busqueda = parametro.toLowerCase();
            const resultados = catalogo.filter(libro =>
                libro.titulo.toLowerCase().includes(busqueda) ||
                libro.autor.toLowerCase().includes(busqueda) ||
                libro.categoria.toLowerCase().includes(busqueda) ||
                libro.signatura.toLowerCase().includes(busqueda) ||
                libro.isbn.toLowerCase().includes(busqueda)
            );
            if (resultados.length === 0) {
                agregarMensaje('No se encontraron libros con ese criterio. 😔 Intenta con otro término.', 'bot', opcionesInicio);
            } else {
                const mensaje = '¡Aquí están los resultados! 🔍<br>' +
                    resultados.map(libro => `- <strong>${libro.titulo}</strong> por ${libro.autor}, Categoría: ${libro.categoria}, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}`).join('<br>');
                agregarMensaje(mensaje, 'bot', opcionesInicio);
            }
            historialConsultas.push({ tipo: 'busqueda', valor: busqueda, resultados: resultados.length });
            estadoChat = 'inicio';
        }, 1000);
    } else if (opcion === 'reserva') {
        estadoChat = 'reserva';
        setTimeout(() => {
            agregarMensaje('Escribe el tejuelo del libro que deseas reservar: ✅', 'bot');
        }, 1000);
    } else if (opcion === 'reserva_confirmar') {
        setTimeout(() => {
            const tejuelo = parametro.trim();
            const libro = catalogo.find(l => l.signatura.toLowerCase() === tejuelo.toLowerCase());
            if (libro && libro.copiasDisponibles > 0) {
                agregarMensaje(`Abriendo el formulario de reserva para <strong>${libro.titulo}</strong>... ¡Prepárate para tu próxima lectura! ✅`, 'bot');
                window.open('// Reemplazar url', '_blank');
            } else {
                agregarMensaje('Lo siento, el tejuelo no es válido o no hay copias disponibles. 😔', 'bot', opcionesInicio);
            }
            historialConsultas.push({ tipo: 'reserva', valor: tejuelo });
            estadoChat = 'inicio';
        }, 1000);
    } else if (opcion === 'solicitud') {
        estadoChat = 'solicitud';
        setTimeout(() => {
            agregarMensaje('Escribe el título del libro que deseas solicitar: 📝', 'bot');
        }, 1000);
    } else if (opcion === 'solicitud_confirmar') {
        setTimeout(() => {
            agregarMensaje(`Abriendo el formulario de solicitud para <strong>${parametro}</strong>... ¡Gracias por tu sugerencia! 📝`, 'bot');
            window.open('// Reemplazar url', '_blank');
            historialConsultas.push({ tipo: 'solicitud', valor: parametro });
            estadoChat = 'inicio';
        }, 1000);
    } else if (opcion === 'categorias') {
        setTimeout(() => {
            const categorias = [...new Set(catalogo.map(libro => libro.categoria))].filter(cat => cat !== 'No disponible');
            if (categorias.length === 0) {
                agregarMensaje('No hay categorías disponibles en este momento. 😔', 'bot', opcionesInicio);
            } else {
                const mensaje = 'Explora estas categorías literarias: 📖<br>' + categorias.join(', ');
                agregarMensaje(mensaje, 'bot', opcionesInicio);
            }
            historialConsultas.push({ tipo: 'categorias', valor: categorias });
            estadoChat = 'inicio';
        }, 1000);
    } else if (opcion === 'historial') {
        setTimeout(() => {
            if (historialConsultas.length === 0) {
                agregarMensaje('No hay consultas previas. ¡Empieza explorando! 😊', 'bot', opcionesInicio);
            } else {
                const mensaje = 'Historial de consultas: 🕒<br>' +
                    historialConsultas.map((consulta, index) => {
                        if (consulta.tipo === 'busqueda') {
                            return `${index + 1}. Búsqueda: "${consulta.valor}" (${consulta.resultados} resultados)`;
                        } else if (consulta.tipo === 'reserva') {
                            return `${index + 1}. Reserva: Tejuelo "${consulta.valor}"`;
                        } else if (consulta.tipo === 'solicitud') {
                            return `${index + 1}. Solicitud: "${consulta.valor}"`;
                        } else if (consulta.tipo === 'categorias') {
                            return `${index + 1}. Categorías exploradas: ${consulta.valor.join(', ')}`;
                        } else {
                            return `${index + 1}. Mensaje: "${consulta.valor}"`;
                        }
                    }).join('<br>');
                agregarMensaje(mensaje, 'bot', opcionesInicio);
            }
            estadoChat = 'inicio';
        }, 1000);
    } else if (opcion === 'trivial') {
        estadoChat = 'trivial';
        setTimeout(() => {
            const librosDisponibles = catalogo.filter(libro => libro.copiasDisponibles > 0);
            if (librosDisponibles.length === 0) {
                agregarMensaje('No hay libros disponibles para el trivial. 😔', 'bot', opcionesInicio);
                estadoChat = 'inicio';
                return;
            }
            const libroAleatorio = librosDisponibles[Math.floor(Math.random() * librosDisponibles.length)];
            preguntaActual = {
                pregunta: `Pregunta fácil: ¿Quién escribió <strong>${libroAleatorio.titulo}</strong>? Escribe el nombre del autor.`,
                respuesta: libroAleatorio.autor
            };
            agregarMensaje(preguntaActual.pregunta, 'bot', [
                { texto: '1. Sí', accion: 'continuar_trivial', clase: 'trivial' },
                { texto: '2. No, mostrar puntuación', accion: 'ver_puntaje', clase: 'ver_puntaje' }
            ]);
        }, 1000);
    } else if (opcion === 'continuar_trivial') {
        estadoChat = 'trivial';
        setTimeout(() => {
            const librosDisponibles = catalogo.filter(libro => libro.copiasDisponibles > 0);
            const libroAleatorio = librosDisponibles[Math.floor(Math.random() * librosDisponibles.length)];
            preguntaActual = {
                pregunta: `Pregunta fácil: ¿Quién escribió <strong>${libroAleatorio.titulo}</strong>? Escribe el nombre del autor.`,
                respuesta: libroAleatorio.autor
            };
            agregarMensaje(preguntaActual.pregunta, 'bot', [
                { texto: '1. Sí', accion: 'continuar_trivial', clase: 'trivial' },
                { texto: '2. No, mostrar puntuación', accion: 'ver_puntaje', clase: 'ver_puntaje' }
            ]);
        }, 1000);
    } else if (opcion === 'ver_puntaje') {
        setTimeout(() => {
            agregarMensaje(`¡Eres un genio literario! 🌟 Tu puntaje total es: ${puntuacionTotal}.`, 'bot', opcionesInicio);
            estadoChat = 'inicio';
            preguntaActual = null;
        }, 1000);
    }
}

function procesarRespuestaTrivial(respuesta) {
    const respuestaCorrecta = preguntaActual.respuesta.toLowerCase();
    const respuestaUsuario = respuesta.toLowerCase().trim();
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
        if (respuestaUsuario === respuestaCorrecta) {
            aciertosConsecutivos++;
            puntuacionTotal += 5;
            let mensaje = `¡Genial, +5 puntos! 📖 Puntuación: ${puntuacionTotal}. ¿Sabías que ${preguntaActual.respuesta} es conocido por su estilo único?`;
            if (aciertosConsecutivos >= 3) {
                puntuacionTotal += 30;
                aciertosConsecutivos = 0;
                mensaje += `<br>¡Increíble, tres aciertos seguidos! 🎉 +30 puntos extra. Puntuación: ${puntuacionTotal}.`;
            }
            mensaje += '<br>¿Otra pregunta?';
            agregarMensaje(mensaje, 'bot', [
                { texto: '1. Sí', accion: 'continuar_trivial', clase: 'trivial' },
                { texto: '2. No, mostrar puntuación', accion: 'ver_puntaje', clase: 'ver_puntaje' }
            ]);
        } else {
            aciertosConsecutivos = 0;
            const mensaje = `¡Vaya, no es correcto! 😔 La respuesta era <strong>${preguntaActual.respuesta}</strong>. Puntuación: ${puntuacionTotal}.<br>¿Quieres intentarlo de nuevo?`;
            agregarMensaje(mensaje, 'bot', [
                { texto: '1. Sí', accion: 'continuar_trivial', clase: 'trivial' },
                { texto: '2. No, volver al inicio', accion: 'ver_puntaje', clase: 'ver_puntaje' }
            ]);
        }
        historialConsultas.push({ tipo: 'trivial', valor: `Pregunta: ${preguntaActual.pregunta}, Respuesta dada: ${respuesta}` });
    }, 1000);
}

window.onload = async () => {
    await cargarCatalogo();
    const frase = frasesBienvenida[Math.floor(Math.random() * frasesBienvenida.length)];
    setTimeout(() => {
        agregarMensaje(frase, 'bot', [
            { texto: '1. Recomendaciones 📚', accion: 'recomendaciones', clase: 'recomendaciones' },
            { texto: '2. Buscar un libro 🔍', accion: 'buscar', clase: 'buscar' },
            { texto: '3. Juguemos al trivial literario ❓', accion: 'trivial', clase: 'trivial' },
            { texto: '4. Explorar categorías literarias 📖', accion: 'categorias', clase: 'categorias' },
            { texto: '5. Reservar un libro ✅', accion: 'reserva', clase: 'reserva' },
            { texto: '6. Solicitar un libro 📝', accion: 'solicitud', clase: 'solicitud' },
            { texto: '7. Ver historial de consultas 🕒', accion: 'historial', clase: 'historial' },
            { texto: '8. Ver puntaje total 🌟', accion: 'ver_puntaje', clase: 'ver_puntaje' }
        ]);
    }, 1000);
};