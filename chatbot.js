// chatbot.js
let estadoChat = 'inicio';
let trivialPreguntaActual = null;
let puntuacion = localStorage.getItem('trivialPuntuacion') ? parseInt(localStorage.getItem('trivialPuntuacion')) : 0;
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
        if (!window.catalogo || window.catalogo.length === 0) {
            window.showToast('El catálogo no está disponible. Intenta de nuevo más tarde.', 'error');
            setTimeout(() => {
                input.disabled = false;
                input.focus();
            }, 1000);
            return;
        }

        // Procesar comandos libres
        if (estadoChat === 'inicio' && mensaje) {
            if (mensaje.includes('recomienda') || mensaje.includes('sugiere')) {
                manejarOpcion('recomendaciones');
                return;
            } else if (mensaje.includes('disponible') || mensaje.includes('hay copias')) {
                manejarOpcion('disponibilidad');
                return;
            } else if (mensaje.includes('trivial') || mensaje.includes('jugar')) {
                manejarOpcion('trivial');
                return;
            } else if (mensaje.includes('categoría') || mensaje.includes('categorías')) {
                manejarOpcion('categorias');
                return;
            } else if (mensaje.includes('buscar') || mensaje.includes('búsqueda')) {
                manejarOpcion('busqueda_avanzada');
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
                { texto: 'Disponibilidad de un libro', accion: 'disponibilidad' },
                { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                { texto: 'Explorar categorías literarias', accion: 'categorias' },
                { texto: 'Búsqueda avanzada', accion: 'busqueda_avanzada' },
                { texto: 'Reservar un libro', accion: 'reserva' },
                { texto: 'Solicitar un libro', accion: 'solicitud' },
                { texto: 'Ver historial de consultas', accion: 'historial' }
            ];
            setTimeout(() => {
                agregarMensaje(frasesBienvenida[Math.floor(Math.random() * frasesBienvenida.length)], 'bot', opciones);
                input.disabled = false;
                input.focus();
            }, 1000);
        } else if (estadoChat === 'disponibilidad') {
            agregarMensaje(frasesProcesando[Math.floor(Math.random() * frasesProcesando.length)], 'bot');
            const libro = window.catalogo.find(libro => libro.titulo.toLowerCase().includes(mensaje));
            const respuesta = libro
                ? `¡Encontré algo! 📖 *${libro.titulo}* tiene ${libro.copiasDisponibles} copias disponibles, Tejuelo: ${libro.signatura}.`
                : 'Lo siento, no encontré ese libro en el catálogo. 😔 ¿Quieres intentarlo con otro título?';
            historialConsultas.push(`Verificaste disponibilidad de: ${mensaje}`);
            historialConsultas = historialConsultas.slice(-10); // Limitar historial
            setTimeout(() => {
                agregarMensaje(respuesta, 'bot');
                estadoChat = 'inicio';
                agregarMensaje('¿Qué más quieres hacer?', 'bot', [
                    { texto: 'Libros recomendados', accion: 'recomendaciones' },
                    { texto: 'Disponibilidad de un libro', accion: 'disponibilidad' },
                    { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                    { texto: 'Explorar categorías literarias', accion: 'categorias' },
                    { texto: 'Búsqueda avanzada', accion: 'busqueda_avanzada' },
                    { texto: 'Reservar un libro', accion: 'reserva' },
                    { texto: 'Solicitar un libro', accion: 'solicitud' },
                    { texto: 'Ver historial de consultas', accion: 'historial' }
                ]);
                input.disabled = false;
                input.focus();
            }, 1000);
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
            const libro = window.catalogo.find(libro => libro.titulo.toLowerCase().includes(mensaje));
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
                        { texto: 'Disponibilidad de un libro', accion: 'disponibilidad' },
                        { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                        { texto: 'Explorar categorías literarias', accion: 'categorias' },
                        { texto: 'Búsqueda avanzada', accion: 'busqueda_avanzada' },
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
            const libro = window.catalogo.find(libro => libro.titulo.toLowerCase().includes(mensaje));
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
        } else if (estadoChat.startsWith('buscar_')) {
            agregarMensaje(frasesProcesando[Math.floor(Math.random() * frasesProcesando.length)], 'bot');
            const atributo = estadoChat.replace('buscar_', '');
            const resultados = window.catalogo.filter(libro =>
                libro[atributo].toLowerCase().includes(mensaje)
            );
            const respuesta = resultados.length > 0
                ? `¡Encontré ${resultados.length} libro(s)! 📚\n` +
                  resultados.slice(0, 3).map(libro =>
                      `- *${libro.titulo}* por ${libro.autor}, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}`
                  ).join('\n')
                : 'Lo siento, no encontré libros con ese criterio. 😔 ¿Quieres probar con otro término?';
            historialConsultas.push(`Búsqueda avanzada por ${atributo}: ${mensaje}`);
            historialConsultas = historialConsultas.slice(-10);
            setTimeout(() => {
                agregarMensaje(respuesta, 'bot');
                estadoChat = 'inicio';
                agregarMensaje('¿Qué más quieres hacer?', 'bot', [
                    { texto: 'Libros recomendados', accion: 'recomendaciones' },
                    { texto: 'Disponibilidad de un libro', accion: 'disponibilidad' },
                    { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                    { texto: 'Explorar categorías literarias', accion: 'categorias' },
                    { texto: 'Búsqueda avanzada', accion: 'busqueda_avanzada' },
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
        if (opcion === 'recomendaciones') {
            agregarMensaje(frasesProcesando[Math.floor(Math.random() * frasesProcesando.length)], 'bot');
            const resultados = window.catalogo.filter(libro => libro.copiasDisponibles > 0);
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
                    { texto: 'Disponibilidad de un libro', accion: 'disponibilidad' },
                    { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                    { texto: 'Explorar categorías literarias', accion: 'categorias' },
                    { texto: 'Búsqueda avanzada', accion: 'busqueda_avanzada' },
                    { texto: 'Reservar un libro', accion: 'reserva' },
                    { texto: 'Solicitar un libro', accion: 'solicitud' },
                    { texto: 'Ver historial de consultas', accion: 'historial' }
                ]);
                input.disabled = false;
                input.focus();
            }, 1000);
        } else if (opcion === 'disponibilidad') {
            estadoChat = 'disponibilidad';
            setTimeout(() => {
                agregarMensaje('Dime el título del libro que quieres consultar. 📖', 'bot');
                input.disabled = false;
                input.focus();
            }, 1000);
        } else if (opcion === 'trivial' || opcion === 'trivial_sí') {
            estadoChat = 'trivial';
            const nivel = puntuacion < 6 ? 'fácil' : puntuacion < 11 ? 'medio' : 'difícil';
            const tiposPregunta = nivel === 'fácil' ? ['autor', 'categoria'] : nivel === 'medio' ? ['autor', 'categoria', 'fecha'] : ['multiple'];
            const tipo = tiposPregunta[Math.floor(Math.random() * tiposPregunta.length)];
            const libro = window.catalogo[Math.floor(Math.random() * window.catalogo.length)];
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
                const categorias = [...new Set(window.catalogo.map(l => l.categoria))];
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
            const categorias = [...new Set(window.catalogo.map(libro => libro.categoria))];
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
            const libro = window.catalogo.find(libro => libro.categoria === categoria && libro.copiasDisponibles > 0);
            const respuesta = `${descripcion[categoria] || 'Una categoría llena de sorpresas.'} ` +
                (libro ? `Te recomiendo: *${libro.titulo}* por ${libro.autor}, Tejuelo: ${libro.signatura}, Disponibles: ${libro.copiasDisponibles}.` : 'No hay libros disponibles en esta categoría ahora. 😔');
            historialConsultas.push(`Exploraste categoría: ${categoria}`);
            historialConsultas = historialConsultas.slice(-10);
            setTimeout(() => {
                agregarMensaje(respuesta, 'bot');
                estadoChat = 'inicio';
                agregarMensaje('¿Qué más quieres hacer?', 'bot', [
                    { texto: 'Libros recomendados', accion: 'recomendaciones' },
                    { texto: 'Disponibilidad de un libro', accion: 'disponibilidad' },
                    { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                    { texto: 'Explorar categorías literarias', accion: 'categorias' },
                    { texto: 'Búsqueda avanzada', accion: 'busqueda_avanzada' },
                    { texto: 'Reservar un libro', accion: 'reserva' },
                    { texto: 'Solicitar un libro', accion: 'solicitud' },
                    { texto: 'Ver historial de consultas', accion: 'historial' }
                ]);
                input.disabled = false;
                input.focus();
            }, 1000);
        } else if (opcion === 'busqueda_avanzada') {
            estadoChat = 'busqueda_avanzada';
            setTimeout(() => {
                agregarMensaje('¿Por qué quieres buscar? 🔎', 'bot', [
                    { texto: 'Título', accion: 'buscar_titulo' },
                    { texto: 'Autor', accion: 'buscar_autor' },
                    { texto: 'ISBN', accion: 'buscar_isbn' },
                    { texto: 'Tejuelo', accion: 'buscar_tejuelo' }
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
                    { texto: 'Disponibilidad de un libro', accion: 'disponibilidad' },
                    { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                    { texto: 'Explorar categorías literarias', accion: 'categorias' },
                    { texto: 'Búsqueda avanzada', accion: 'busqueda_avanzada' },
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
                    { texto: 'Disponibilidad de un libro', accion: 'disponibilidad' },
                    { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                    { texto: 'Explorar categorías literarias', accion: 'categorias' },
                    { texto: 'Búsqueda avanzada', accion: 'busqueda_avanzada' },
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
                    { texto: 'Disponibilidad de un libro', accion: 'disponibilidad' },
                    { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                    { texto: 'Explorar categorías literarias', accion: 'categorias' },
                    { texto: 'Búsqueda avanzada', accion: 'busqueda_avanzada' },
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
                    { texto: 'Disponibilidad de un libro', accion: 'disponibilidad' },
                    { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                    { texto: 'Explorar categorías literarias', accion: 'categorias' },
                    { texto: 'Búsqueda avanzada', accion: 'busqueda_avanzada' },
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
        } else if (opcion === 'inicio') {
            estadoChat = 'inicio';
            setTimeout(() => {
                agregarMensaje('¿Qué más quieres hacer?', 'bot', [
                    { texto: 'Libros recomendados', accion: 'recomendaciones' },
                    { texto: 'Disponibilidad de un libro', accion: 'disponibilidad' },
                    { texto: 'Juguemos al trivial literario', accion: 'trivial' },
                    { texto: 'Explorar categorías literarias', accion: 'categorias' },
                    { texto: 'Búsqueda avanzada', accion: 'busqueda_avanzada' },
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