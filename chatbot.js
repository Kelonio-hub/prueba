// chatbot.js
let estadoChat = 'inicio';
let trivialPreguntaActual = null;
let puntuacion = localStorage.getItem('trivialPuntuacion') ? parseInt(localStorage.getItem('trivialPuntuacion')) : 0;
let historialConsultas = [];
let catalogo = [];

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

// Cargar y parsear Ejemplares.xml
async function cargarCatalogo() {
    try {
        const response = await fetch('./Ejemplares.xml');
        if (!response.ok) throw new Error('No se pudo cargar Ejemplares.xml');
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
        const libros = xmlDoc.getElementsByTagName('libro');
        catalogo = Array.from(libros).map(libro => ({
            titulo: libro.getElementsByTagName('titulo')[0]?.textContent || '',
            autor: libro.getElementsByTagName('autor')[0]?.textContent || '',
            categoria: libro.getElementsByTagName('categoria')[0]?.textContent || '',
            isbn: libro.getElementsByTagName('isbn')[0]?.textContent || '',
            signatura: libro.getElementsByTagName('signatura')[0]?.textContent || '',
            fechaEdicion: libro.getElementsByTagName('fechaEdicion')[0]?.textContent || '',
            copiasDisponibles: parseInt(libro.getElementsByTagName('copiasDisponibles')[0]?.textContent) || 0
        }));
        if (catalogo.length === 0) throw new Error('El catálogo está vacío');
    } catch (error) {
        console.error('Error al cargar Ejemplares.xml:', error);
        window.showToast('No se pudo cargar el catálogo. Intenta de nuevo más tarde.', 'error');
    }
}

// Cargar catálogo al iniciar
cargarCatalogo();

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
            btn.className = `chat-option-btn ${opcion.accion}`;
            btn.textContent = `${index + 1}. ${opcion.texto}`;
            btn.setAttribute('aria-label', `Opción ${opcion.texto}`);
            btn.onclick = () => manejarOpcion(opcion.accion || (index + 1));
            opcionesDiv.appendChild(btn);
        });
        div.appendChild(opcionesDiv);
    }

    requestAnimationFrame(() => {
        div.scrollTop = div.scrollHeight;
    });
}

async function enviarMensaje() {
    const input = document.getElementById('chatInput');
    const mensaje = input.value.trim().toLowerCase();
    if (!mensaje && estadoChat !== 'inicio') return;
    if (estadoChat !== 'inicio') {
        agregarMensaje(mensaje, 'user');
    }
    input.value = '';
    input.disabled = true;

    try {
        if (catalogo.length === 0) {
            await cargarCatalogo(); // Intentar recargar si el catálogo no está disponible
            if (catalogo.length === 0) {
                window.showToast('El catálogo no está disponible. Intenta de nuevo más tarde.', 'error');
                setTimeout(() => {
                    input.disabled = false;
                    input.focus();
                }, 1000);
                return;
            }
        }

        // Procesar comandos libres
        if (estadoChat === 'inicio' && mensaje) {
            if (mensaje.includes('recomienda') || mensaje.includes('sugiere')) {
                if (mensaje.includes('personalizada')) {
                    manejarOpcion('recomendaciones_personalizadas');
                } else {
                    manejarOpcion('recomendaciones');
                }
                return;
            } else if (mensaje.includes('buscar') || mensaje.includes('disponible') || mensaje.includes('hay copias')) {
                manejarOpcion('buscar');
                return;
            } else if (mensaje.includes('trivial') || mensaje.includes('jugar')) {
                manejarOpcion('trivial');
                return;
            } else if (mensaje.includes('categoría') || mensaje.includes('categorías')) {
                manejarOpcion('categorias');
                return;
            } else if (mensaje.includes('reservar')) {
                manejarOpcion('reserva');
                return;
            } else if (mensaje.includes('solicitar')) {
                manejarOpcion('solicitud');
                return;
            } else if (mensaje.includes('historial')) {
                manejarOpcion('historial');
                return;
            }
        }

        if (estadoChat === 'inicio') {
            const opciones = [
                { texto: 'Libros recomendados', accion: 'recomendaciones' },
                { texto: 'Recomendaciones personalizadas', accion: 'recomendaciones_personalizadas' },
                { texto: 'Buscar un libro', accion: 'buscar' },
                { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                { texto: 'Explorar categorías literarias', accion: 'categorias' },
                { texto: 'Reservar un libro', accion: 'reserva' },
                { texto: 'Solicitar un libro', accion: 'solicitud' },
                { texto: 'Ver historial de consultas', accion: 'historial' }
            ];
            setTimeout(() => {
                agregarMensaje(frasesBienvenida[Math.floor(Math.random() * frasesBienvenida.length)], 'bot', opciones);
                input.disabled = false;
                input.focus();
            }, 1000);
        } else if (estadoChat.startsWith('buscar_')) {
            agregarMensaje(frasesProcesando[Math.floor(Math.random() * frasesProcesando.length)], 'bot');
            const atributo = estadoChat.replace('buscar_', '');
            const resultados = catalogo.filter(libro =>
                libro[atributo].toLowerCase().includes(mensaje)
            );
            let respuesta;
            if (resultados.length > 0) {
                respuesta = `¡Encontré ${resultados.length} libro(s)! 📚\n` +
                    resultados.slice(0, 3).map(libro =>
                        `- *${libro.titulo}* por ${libro.autor}, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}`
                    ).join('\n');
                if (resultados[0].copiasDisponibles > 0) {
                    setTimeout(() => {
                        agregarMensaje(respuesta, 'bot', [
                            { texto: 'Reservar este libro', accion: 'reserva_confirmar' },
                            { texto: 'Volver al menú', accion: 'inicio' }
                        ]);
                        historialConsultas.push(`Búsqueda por ${atributo}: ${mensaje}`);
                        historialConsultas = historialConsultas.slice(-10);
                        input.disabled = false;
                        input.focus();
                    }, 1000);
                } else {
                    setTimeout(() => {
                        agregarMensaje(respuesta + '\nLo siento, no hay copias disponibles. 😔', 'bot');
                        estadoChat = 'inicio';
                        agregarMensaje('¿Qué más quieres hacer?', 'bot', [
                            { texto: 'Libros recomendados', accion: 'recomendaciones' },
                            { texto: 'Recomendaciones personalizadas', accion: 'recomendaciones_personalizadas' },
                            { texto: 'Buscar un libro', accion: 'buscar' },
                            { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                            { texto: 'Explorar categorías literarias', accion: 'categorias' },
                            { texto: 'Reservar un libro', accion: 'reserva' },
                            { texto: 'Solicitar un libro', accion: 'solicitud' },
                            { texto: 'Ver historial de consultas', accion: 'historial' }
                        ]);
                        historialConsultas.push(`Búsqueda por ${atributo}: ${mensaje}`);
                        historialConsultas = historialConsultas.slice(-10);
                        input.disabled = false;
                        input.focus();
                    }, 1000);
                }
            } else {
                respuesta = 'Lo siento, no encontré libros con ese criterio. 😔 ¿Quieres probar con otro término?';
                setTimeout(() => {
                    agregarMensaje(respuesta, 'bot');
                    estadoChat = 'inicio';
                    agregarMensaje('¿Qué más quieres hacer?', 'bot', [
                        { texto: 'Libros recomendados', accion: 'recomendaciones' },
                        { texto: 'Recomendaciones personalizadas', accion: 'recomendaciones_personalizadas' },
                        { texto: 'Buscar un libro', accion: 'buscar' },
                        { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                        { texto: 'Explorar categorías literarias', accion: 'categorias' },
                        { texto: 'Reservar un libro', accion: 'reserva' },
                        { texto: 'Solicitar un libro', accion: 'solicitud' },
                        { texto: 'Ver historial de consultas', accion: 'historial' }
                    ]);
                    historialConsultas.push(`Búsqueda por ${atributo}: ${mensaje}`);
                    historialConsultas = historialConsultas.slice(-10);
                    input.disabled = false;
                    input.focus();
                }, 1000);
            }
        } else if (estadoChat === 'trivial') {
            agregarMensaje(frasesProcesando[Math.floor(Math.random() * frasesProcesando.length)], 'bot');
            const { tipo, libro } = trivialPreguntaActual;
            let esCorrecta = false;
            let datoCurioso = '';
            if (tipo === 'autor') {
                esCorrecta = mensaje.toLowerCase().includes(libro.autor.toLowerCase());
                datoCurioso = `¿Sabías que ${libro.autor} es conocido por su estilo único?`;
            } else if (tipo === 'categoria') {
                esCorrecta = mensaje.toLowerCase().includes(libro.categoria.toLowerCase());
                datoCurioso = `La categoría ${libro.categoria} es perfecta para los amantes de la lectura creativa.`;
            } else if (tipo === 'fecha') {
                const añoUsuario = parseInt(mensaje);
                const añoReal = parseInt(libro.fechaEdicion);
                esCorrecta = añoUsuario >= añoReal - 5 && añoUsuario <= añoReal + 5;
                datoCurioso = `Este libro fue publicado en ${libro.fechaEdicion}. ¡Un clásico de su tiempo!`;
            }
            if (esCorrecta) puntuacion++;
            localStorage.setItem('trivialPuntuacion', puntuacion);
            const respuesta = esCorrecta
                ? `¡Genial, eres un crack literario! 📖 Puntuación: ${puntuacion}. ${datoCurioso}`
                : `¡Uy, casi! La respuesta correcta era ${tipo === 'autor' ? libro.autor : tipo === 'categoria' ? libro.categoria : libro.fechaEdicion}. ${datoCurioso} Puntuación: ${puntuacion}.`;
            historialConsultas.push(`Jugaste al trivial: ${tipo} de *${libro.titulo}*`);
            historialConsultas = historialConsultas.slice(-10);
            setTimeout(() => {
                agregarMensaje(respuesta, 'bot');
                agregarMensaje('¿Otra pregunta?', 'bot', [
                    { texto: 'Sí', accion: 'trivial_sí' },
                    { texto: 'No, mostrar puntuación', accion: 'trivial_fin' }
                ]);
                input.disabled = false;
                input.focus();
            }, 1000);
        } else if (estadoChat === 'reserva') {
            agregarMensaje(frasesProcesando[Math.floor(Math.random() * frasesProcesando.length)], 'bot');
            const libro = catalogo.find(libro => libro.titulo.toLowerCase().includes(mensaje));
            historialConsultas.push(`Intentaste reservar: ${mensaje}`);
            historialConsultas = historialConsultas.slice(-10);
            if (libro && libro.copiasDisponibles > 0) {
                setTimeout(() => {
                    agregarMensaje(`¡Buena elección! 📚 *${libro.titulo}* tiene ${libro.copiasDisponibles} copias disponibles. ¿Quieres reservarlo?`, 'bot', [
                        { texto: 'Sí, reservar', accion: 'reserva_confirmar' },
                        { texto: 'No, volver al menú', accion: 'inicio' }
                    ]);
                    input.disabled = false;
                    input.focus();
                }, 1000);
            } else {
                setTimeout(() => {
                    agregarMensaje(libro ? 'Lo siento, no hay copias disponibles. 😔 ¿Quieres intentar con otro libro?' : 'No encontré ese libro en el catálogo. 😔', 'bot');
                    estadoChat = 'inicio';
                    agregarMensaje('¿Qué más quieres hacer?', 'bot', [
                        { texto: 'Libros recomendados', accion: 'recomendaciones' },
                        { texto: 'Recomendaciones personalizadas', accion: 'recomendaciones_personalizadas' },
                        { texto: 'Buscar un libro', accion: 'buscar' },
                        { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                        { texto: 'Explorar categorías literarias', accion: 'categorias' },
                        { texto: 'Reservar un libro', accion: 'reserva' },
                        { texto: 'Solicitar un libro', accion: 'solicitud' },
                        { texto: 'Ver historial de consultas', accion: 'historial' }
                    ]);
                    input.disabled = false;
                    input.focus();
                }, 1000);
            }
        } else if (estadoChat === 'solicitud') {
            agregarMensaje(frasesProcesando[Math.floor(Math.random() * frasesProcesando.length)], 'bot');
            const libro = catalogo.find(libro => libro.titulo.toLowerCase().includes(mensaje));
            historialConsultas.push(`Solicitaste: ${mensaje}`);
            historialConsultas = historialConsultas.slice(-10);
            if (libro) {
                setTimeout(() => {
                    agregarMensaje(`¡Oye, *${libro.titulo}* ya está en nuestro catálogo! Tiene ${libro.copiasDisponibles} copias disponibles, Tejuelo: ${libro.signatura}. ¿Quieres reservarlo en lugar de solicitarlo?`, 'bot', [
                        { texto: 'Sí, reservar', accion: 'reserva_confirmar' },
                        { texto: 'No, volver al menú', accion: 'inicio' }
                    ]);
                    input.disabled = false;
                    input.focus();
                }, 1000);
            } else {
                setTimeout(() => {
                    agregarMensaje(`No encontré *${mensaje}* en nuestro catálogo. ¿Quieres sugerir que lo adquiramos?`, 'bot', [
                        { texto: 'Sí, abrir formulario de solicitud', accion: 'solicitud_confirmar' },
                        { texto: 'No, volver al menú', accion: 'inicio' }
                    ]);
                    input.disabled = false;
                    input.focus();
                }, 1000);
            }
        } else if (estadoChat === 'recomendaciones_personalizadas_autor') {
            agregarMensaje(frasesProcesando[Math.floor(Math.random() * frasesProcesando.length)], 'bot');
            const librosAutor = catalogo.filter(libro => libro.autor.toLowerCase().includes(mensaje) && libro.copiasDisponibles > 0);
            const respuesta = librosAutor.length > 0
                ? `¡Qué buen gusto! 📚 Aquí tienes recomendaciones de o similares a ${mensaje}:\n` +
                  librosAutor.slice(0, 2).map(libro => `- *${libro.titulo}* por ${libro.autor}, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}`).join('\n')
                : `No encontré libros disponibles de ${mensaje}. 😔 Prueba con otro autor.`;
            historialConsultas.push(`Recomendaciones personalizadas por autor: ${mensaje}`);
            historialConsultas = historialConsultas.slice(-10);
            setTimeout(() => {
                agregarMensaje(respuesta, 'bot');
                estadoChat = 'inicio';
                agregarMensaje('¿Qué más quieres hacer?', 'bot', [
                    { texto: 'Libros recomendados', accion: 'recomendaciones' },
                    { texto: 'Recomendaciones personalizadas', accion: 'recomendaciones_personalizadas' },
                    { texto: 'Buscar un libro', accion: 'buscar' },
                    { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                    { texto: 'Explorar categorías literarias', accion: 'categorias' },
                    { texto: 'Reservar un libro', accion: 'reserva' },
                    { texto: 'Solicitar un libro', accion: 'solicitud' },
                    { texto: 'Ver historial de consultas', accion: 'historial' }
                ]);
                input.disabled = false;
                input.focus();
            }, 1000);
        }
    } catch (error) {
        agregarMensaje('¡Ups! Algo salió mal con Hipat-IA. 😔 Intenta de nuevo.', 'bot');
        input.disabled = false;
        input.focus();
    }
}

function manejarOpcion(opcion) {
    const input = document.getElementById('chatInput');
    try {
        if (catalogo.length === 0) {
            agregarMensaje('El catálogo no está disponible. Intenta de nuevo más tarde. 😔', 'bot');
            input.disabled = false;
            input.focus();
            return;
        }

        if (opcion === 'recomendaciones') {
            agregarMensaje(frasesProcesando[Math.floor(Math.random() * frasesProcesando.length)], 'bot');
            const resultados = catalogo.filter(libro => libro.copiasDisponibles > 0);
            const seleccion = resultados.sort(() => 0.5 - Math.random()).slice(0, 2);
            const respuesta = seleccion.length > 0
                ? `¡Aquí tienes un par de joyas literarias! 📚\n` + seleccion.map(libro => `- *${libro.titulo}* por ${libro.autor}, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}`).join('\n')
                : 'Lo siento, no hay libros disponibles para recomendar ahora. 😔';
            historialConsultas.push(`Recomendaste: ${seleccion.map(libro => libro.titulo).join(', ')}`);
            historialConsultas = historialConsultas.slice(-10);
            setTimeout(() => {
                agregarMensaje(respuesta, 'bot');
                estadoChat = 'inicio';
                agregarMensaje('¿Qué más quieres hacer?', 'bot', [
                    { texto: 'Libros recomendados', accion: 'recomendaciones' },
                    { texto: 'Recomendaciones personalizadas', accion: 'recomendaciones_personalizadas' },
                    { texto: 'Buscar un libro', accion: 'buscar' },
                    { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                    { texto: 'Explorar categorías literarias', accion: 'categorias' },
                    { texto: 'Reservar un libro', accion: 'reserva' },
                    { texto: 'Solicitar un libro', accion: 'solicitud' },
                    { texto: 'Ver historial de consultas', accion: 'historial' }
                ]);
                input.disabled = false;
                input.focus();
            }, 1000);
        } else if (opcion === 'recomendaciones_personalizadas') {
            estadoChat = 'recomendaciones_personalizadas';
            const categorias = [...new Set(catalogo.map(libro => libro.categoria))];
            const opciones = [
                ...categorias.map(cat => ({ texto: cat, accion: `recomendar_categoria_${cat}` })),
                { texto: 'Libros recientes', accion: 'recomendar_recientes' },
                { texto: 'Por autor', accion: 'recomendar_autor' }
            ];
            setTimeout(() => {
                agregarMensaje('¿Qué tipo de libro te interesa? 📚', 'bot', opciones);
                input.disabled = false;
                input.focus();
            }, 1000);
        } else if (opcion.startsWith('recomendar_categoria_')) {
            agregarMensaje(frasesProcesando[Math.floor(Math.random() * frasesProcesando.length)], 'bot');
            const categoria = opcion.replace('recomendar_categoria_', '');
            const resultados = catalogo.filter(libro => libro.categoria === categoria && libro.copiasDisponibles > 0);
            const seleccion = resultados.sort(() => 0.5 - Math.random()).slice(0, 2);
            const respuesta = seleccion.length > 0
                ? `¡Perfecto para los fans de ${categoria}! 📖\n` + seleccion.map(libro => `- *${libro.titulo}* por ${libro.autor}, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}`).join('\n')
                : `No hay libros disponibles en ${categoria} ahora. 😔 Prueba otra categoría.`;
            historialConsultas.push(`Recomendaciones personalizadas por categoría: ${categoria}`);
            historialConsultas = historialConsultas.slice(-10);
            setTimeout(() => {
                agregarMensaje(respuesta, 'bot');
                estadoChat = 'inicio';
                agregarMensaje('¿Qué más quieres hacer?', 'bot', [
                    { texto: 'Libros recomendados', accion: 'recomendaciones' },
                    { texto: 'Recomendaciones personalizadas', accion: 'recomendaciones_personalizadas' },
                    { texto: 'Buscar un libro', accion: 'buscar' },
                    { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                    { texto: 'Explorar categorías literarias', accion: 'categorias' },
                    { texto: 'Reservar un libro', accion: 'reserva' },
                    { texto: 'Solicitar un libro', accion: 'solicitud' },
                    { texto: 'Ver historial de consultas', accion: 'historial' }
                ]);
                input.disabled = false;
                input.focus();
            }, 1000);
        } else if (opcion === 'recomendar_recientes') {
            agregarMensaje(frasesProcesando[Math.floor(Math.random() * frasesProcesando.length)], 'bot');
            const añoActual = 2025;
            const resultados = catalogo.filter(libro => parseInt(libro.fechaEdicion) >= añoActual - 5 && libro.copiasDisponibles > 0);
            const seleccion = resultados.sort(() => 0.5 - Math.random()).slice(0, 2);
            const respuesta = seleccion.length > 0
                ? `¡Aquí tienes lo más reciente! 📚\n` + seleccion.map(libro => `- *${libro.titulo}* por ${libro.autor}, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}`).join('\n')
                : 'No hay libros recientes disponibles ahora. 😔';
            historialConsultas.push(`Recomendaciones personalizadas: libros recientes`);
            historialConsultas = historialConsultas.slice(-10);
            setTimeout(() => {
                agregarMensaje(respuesta, 'bot');
                estadoChat = 'inicio';
                agregarMensaje('¿Qué más quieres hacer?', 'bot', [
                    { texto: 'Libros recomendados', accion: 'recomendaciones' },
                    { texto: 'Recomendaciones personalizadas', accion: 'recomendaciones_personalizadas' },
                    { texto: 'Buscar un libro', accion: 'buscar' },
                    { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                    { texto: 'Explorar categorías literarias', accion: 'categorias' },
                    { texto: 'Reservar un libro', accion: 'reserva' },
                    { texto: 'Solicitar un libro', accion: 'solicitud' },
                    { texto: 'Ver historial de consultas', accion: 'historial' }
                ]);
                input.disabled = false;
                input.focus();
            }, 1000);
        } else if (opcion === 'recomendar_autor') {
            estadoChat = 'recomendaciones_personalizadas_autor';
            setTimeout(() => {
                agregarMensaje('Dime el nombre de un autor que te guste. ✍️', 'bot');
                input.disabled = false;
                input.focus();
            }, 1000);
        } else if (opcion === 'buscar') {
            estadoChat = 'buscar';
            setTimeout(() => {
                agregarMensaje('¿Cómo quieres buscar? 🔎', 'bot', [
                    { texto: 'Título', accion: 'buscar_titulo' },
                    { texto: 'Autor', accion: 'buscar_autor' },
                    { texto: 'ISBN', accion: 'buscar_isbn' },
                    { texto: 'Tejuelo', accion: 'buscar_tejuelo' }
                ]);
                input.disabled = false;
                input.focus();
            }, 1000);
        } else if (opcion === 'trivial' || opcion === 'trivial_sí') {
            estadoChat = 'trivial';
            const nivel = puntuacion < 6 ? 'fácil' : puntuacion < 11 ? 'medio' : 'difícil';
            const tiposPregunta = nivel === 'fácil' ? ['autor', 'categoria'] : nivel === 'medio' ? ['autor', 'categoria', 'fecha'] : ['multiple'];
            const tipo = tiposPregunta[Math.floor(Math.random() * tiposPregunta.length)];
            const libro = catalogo[Math.floor(Math.random() * catalogo.length)];
            trivialPreguntaActual = { tipo, libro };
            let pregunta;
            let opciones = [];
            if (tipo === 'autor') {
                pregunta = `Pregunta ${nivel}: ¿Quién escribió *${libro.titulo}*? Escribe el nombre del autor.`;
            } else if (tipo === 'categoria') {
                pregunta = `Pregunta ${nivel}: ¿A qué categoría pertenece *${libro.titulo}*? Escribe la categoría.`;
            } else if (tipo === 'fecha') {
                pregunta = `Pregunta ${nivel}: ¿En qué año se publicó *${libro.titulo}*? Escribe el año (aproximado).`;
            } else if (tipo === 'multiple') {
                const categorias = [...new Set(catalogo.map(l => l.categoria))];
                const respuestasIncorrectas = categorias.filter(c => c !== libro.categoria).sort(() => 0.5 - Math.random()).slice(0, 2);
                const opcionesMultiple = [
                    { texto: libro.categoria, correcta: true },
                    { texto: respuestasIncorrectas[0], correcta: false },
                    { texto: respuestasIncorrectas[1], correcta: false }
                ].sort(() => 0.5 - Math.random());
                pregunta = `Pregunta ${nivel}: ¿Cuál de estos libros es de *${libro.categoria}*?`;
                opciones = opcionesMultiple.map((opt, i) => ({ texto: `${String.fromCharCode(65 + i)}) ${opt.texto}`, accion: `multiple_${opt.correcta}` }));
            }
            setTimeout(() => {
                agregarMensaje(pregunta, 'bot', opciones);
                input.disabled = tipo !== 'multiple';
                input.focus();
            }, 1000);
        } else if (opcion === 'categorias') {
            estadoChat = 'categorias';
            const categorias = [...new Set(catalogo.map(libro => libro.categoria))];
            const opcionesCategorias = categorias.map(cat => ({ texto: cat, accion: `categoria_${cat}` }));
            setTimeout(() => {
                agregarMensaje('Elige una categoría para explorar: 📖', 'bot', opcionesCategorias);
                input.disabled = false;
                input.focus();
            }, 1000);
        } else if (opcion.startsWith('categoria_')) {
            agregarMensaje(frasesProcesando[Math.floor(Math.random() * frasesProcesando.length)], 'bot');
            const categoria = opcion.replace('categoria_', '');
            const descripcion = {
                'Narrativa': 'La narrativa te lleva a mundos de historias épicas y personajes inolvidables. ¡Perfecta para soñar despierto! 📚',
                'Poesía': 'La poesía es pura emoción en versos. Ideal para sentir y reflexionar. ✍️',
                'Teatro': 'El teatro da vida a diálogos y escenas que brillan en el escenario. 🎭',
                'Cómic': 'Los cómics mezclan arte y narrativa para aventuras visuales. 🎨',
                'Literatura inglesa': 'Clásicos y modernos en inglés, desde Shakespeare hasta Rowling. 🇬🇧'
            };
            const libro = catalogo.find(libro => libro.categoria === categoria && libro.copiasDisponibles > 0);
            const respuesta = `${descripcion[categoria] || 'Una categoría llena de sorpresas.'} ` +
                (libro ? `Te recomiendo: *${libro.titulo}* por ${libro.autor}, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}.` : 'No hay libros disponibles en esta categoría ahora. 😔');
            historialConsultas.push(`Exploraste categoría: ${categoria}`);
            historialConsultas = historialConsultas.slice(-10);
            setTimeout(() => {
                agregarMensaje(respuesta, 'bot');
                estadoChat = 'inicio';
                agregarMensaje('¿Qué más quieres hacer?', 'bot', [
                    { texto: 'Libros recomendados', accion: 'recomendaciones' },
                    { texto: 'Recomendaciones personalizadas', accion: 'recomendaciones_personalizadas' },
                    { texto: 'Buscar un libro', accion: 'buscar' },
                    { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                    { texto: 'Explorar categorías literarias', accion: 'categorias' },
                    { texto: 'Reservar un libro', accion: 'reserva' },
                    { texto: 'Solicitar un libro', accion: 'solicitud' },
                    { texto: 'Ver historial de consultas', accion: 'historial' }
                ]);
                input.disabled = false;
                input.focus();
            }, 1000);
        } else if (opcion === 'reserva') {
            estadoChat = 'reserva';
            setTimeout(() => {
                agregarMensaje('Dime el título del libro que quieres reservar. 📚', 'bot');
                input.disabled = false;
                input.focus();
            }, 1000);
        } else if (opcion === 'solicitud') {
            estadoChat = 'solicitud';
            setTimeout(() => {
                agregarMensaje('Dime el título del libro que quieres solicitar. 📝', 'bot');
                input.disabled = false;
                input.focus();
            }, 1000);
        } else if (opcion === 'reserva_confirmar') {
            setTimeout(() => {
                agregarMensaje('Abriendo el formulario de reserva... ¡Prepárate para tu próxima lectura! ✅', 'bot');
                window.open('// Reemplazar url', '_blank');
                estadoChat = 'inicio';
                agregarMensaje('¿Qué más quieres hacer?', 'bot', [
                    { texto: 'Libros recomendados', accion: 'recomendaciones' },
                    { texto: 'Recomendaciones personalizadas', accion: 'recomendaciones_personalizadas' },
                    { texto: 'Buscar un libro', accion: 'buscar' },
                    { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                    { texto: 'Explorar categorías literarias', accion: 'categorias' },
                    { texto: 'Reservar un libro', accion: 'reserva' },
                    { texto: 'Solicitar un libro', accion: 'solicitud' },
                    { texto: 'Ver historial de consultas', accion: 'historial' }
                ]);
                input.disabled = false;
                input.focus();
            }, 1000);
        } else if (opcion === 'solicitud_confirmar') {
            setTimeout(() => {
                agregarMensaje('Abriendo el formulario de solicitud... ¡Gracias por tu sugerencia! 📝', 'bot');
                window.open('// Reemplazar url', '_blank');
                estadoChat = 'inicio';
                agregarMensaje('¿Qué más quieres hacer?', 'bot', [
                    { texto: 'Libros recomendados', accion: 'recomendaciones' },
                    { texto: 'Recomendaciones personalizadas', accion: 'recomendaciones_personalizadas' },
                    { texto: 'Buscar un libro', accion: 'buscar' },
                    { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                    { texto: 'Explorar categorías literarias', accion: 'categorias' },
                    { texto: 'Reservar un libro', accion: 'reserva' },
                    { texto: 'Solicitar un libro', accion: 'solicitud' },
                    { texto: 'Ver historial de consultas', accion: 'historial' }
                ]);
                input.disabled = false;
                input.focus();
            }, 1000);
        } else if (opcion === 'historial') {
            const respuesta = historialConsultas.length > 0
                ? `¡Aquí tienes tus últimas aventuras literarias! 🕒\n` + historialConsultas.slice(-3).map((consulta, i) => `${i + 1}. ${consulta}`).join('\n')
                : 'No tienes consultas recientes. ¡Empecemos una nueva aventura! 📚';
            setTimeout(() => {
                agregarMensaje(respuesta, 'bot');
                estadoChat = 'inicio';
                agregarMensaje('¿Qué más quieres hacer?', 'bot', [
                    { texto: 'Libros recomendados', accion: 'recomendaciones' },
                    { texto: 'Recomendaciones personalizadas', accion: 'recomendaciones_personalizadas' },
                    { texto: 'Buscar un libro', accion: 'buscar' },
                    { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                    { texto: 'Explorar categorías literarias', accion: 'categorias' },
                    { texto: 'Reservar un libro', accion: 'reserva' },
                    { texto: 'Solicitar un libro', accion: 'solicitud' },
                    { texto: 'Ver historial de consultas', accion: 'historial' }
                ]);
                input.disabled = false;
                input.focus();
            }, 1000);
        } else if (opcion === 'trivial_fin') {
            setTimeout(() => {
                agregarMensaje(`¡Fin del juego! Tu puntuación final es: ${puntuacion}. ¡Eres un genio literario! 📖`, 'bot');
                puntuacion = 0;
                localStorage.setItem('trivialPuntuacion', puntuacion);
                estadoChat = 'inicio';
                agregarMensaje('¿Qué más quieres hacer?', 'bot', [
                    { texto: 'Libros recomendados', accion: 'recomendaciones' },
                    { texto: 'Recomendaciones personalizadas', accion: 'recomendaciones_personalizadas' },
                    { texto: 'Buscar un libro', accion: 'buscar' },
                    { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                    { texto: 'Explorar categorías literarias', accion: 'categorias' },
                    { texto: 'Reservar un libro', accion: 'reserva' },
                    { texto: 'Solicitar un libro', accion: 'solicitud' },
                    { texto: 'Ver historial de consultas', accion: 'historial' }
                ]);
                input.disabled = false;
                input.focus();
            }, 1000);
        } else if (opcion.startsWith('multiple_')) {
            const esCorrecta = opcion === 'multiple_true';
            if (esCorrecta) puntuacion++;
            localStorage.setItem('trivialPuntuacion', puntuacion);
            const respuesta = esCorrecta
                ? `¡Correcto! La categoría era *${trivialPreguntaActual.libro.categoria}*. ¡Buen ojo! 📖 Puntuación: ${puntuacion}.`
                : `¡Ups! La categoría correcta era *${trivialPreguntaActual.libro.categoria}*. Puntuación: ${puntuacion}.`;
            historialConsultas.push(`Jugaste al trivial: categoría de *${trivialPreguntaActual.libro.titulo}*`);
            historialConsultas = historialConsultas.slice(-10);
            setTimeout(() => {
                agregarMensaje(respuesta, 'bot');
                agregarMensaje('¿Otra pregunta?', 'bot', [
                    { texto: 'Sí', accion: 'trivial_sí' },
                    { texto: 'No, mostrar puntuación', accion: 'trivial_fin' }
                ]);
                input.disabled = false;
                input.focus();
            }, 1000);
        }
    } catch (error) {
        agregarMensaje('¡Ups! Algo salió mal con Hipat-IA. 😔 Intenta de nuevo.', 'bot');
        input.disabled = false;
        input.focus();
    }
}