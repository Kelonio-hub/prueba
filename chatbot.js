// Configuración de la API de Google Gemini (AI Studio)
const API_KEY = 'AIzaSyCls5FtXaTdzQfM5FarqmHSALeGmnIPcAg';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODELOS_A_PROBAR = [
    'gemini-2.5-flash',         // Prioridad, funcionó antes
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest'
];
let MODELO_FUNCIONAL = localStorage.getItem('gemini_modelo_funcional') || 'gemini-2.5-flash';
let historialMensajes = [];  // Almacena mensajes para contexto
const cacheRespuestas = JSON.parse(localStorage.getItem('hipatia_cache')) || {};  // Caché para sinopsis/reseñas

// Obtener elementos del DOM
const chatMensajes = document.getElementById('chatMensajes');
const chatInput = document.getElementById('chatInput');

// Función para agregar un mensaje al chat
function agregarMensaje(texto, esUsuario = false, esTemporal = false) {
    if (chatMensajes.children.length > 50) {
        chatMensajes.removeChild(chatMensajes.firstChild);
    }
    const mensajeDiv = document.createElement('div');
    mensajeDiv.className = `mensaje ${esUsuario ? 'user' : 'bot'}${esTemporal ? ' temporal' : ''}`;
    mensajeDiv.textContent = texto;
    chatMensajes.appendChild(mensajeDiv);
    chatMensajes.scrollTop = chatMensajes.scrollHeight;

    if (!esTemporal) {
        if (esUsuario) {
            historialMensajes.push({ role: 'user', content: texto });
        } else {
            historialMensajes.push({ role: 'assistant', content: texto });
        }
        if (historialMensajes.length > 6) {  // Máximo 3 turnos
            historialMensajes = historialMensajes.slice(-6);
        }
    }
    return mensajeDiv;
}

// Función para sanitizar entrada del usuario
function sanitizeInput(str) {
    return str ? (DOMPurify ? DOMPurify.sanitize(str) : str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')) : 'Recomiéndame un libro';
}

// Función para detectar intención
function detectarIntencion(query) {
    const lowerQuery = query.toLowerCase().trim();
    if (lowerQuery.includes('sinopsis') || lowerQuery.includes('resumen')) return 'sinopsis';
    if (lowerQuery.includes('reseña') || lowerQuery.includes('crítica') || lowerQuery.includes('opinión')) return 'reseña';
    if (lowerQuery.includes('épico') || lowerQuery.includes('fantasía') || lowerQuery.includes('aventura')) return 'recomendacion_fantasia';
    if (lowerQuery.includes('corto') || lowerQuery.includes('breve')) return 'recomendacion_corta';
    if (lowerQuery.includes('poesía') || lowerQuery.includes('poema')) return 'recomendacion_poesia';
    if (lowerQuery.includes('narrativa') || lowerQuery.includes('novela')) return 'recomendacion_narrativa';
    return 'general';
}

// Función para buscar en el catálogo
function buscarEnCatalogo(query) {
    if (!catalogo || catalogo.length === 0) {
        return [];
    }
    const lowerQuery = query.toLowerCase().trim();
    return catalogo.filter(libro =>
        libro.titulo.toLowerCase().includes(lowerQuery) ||
        libro.autor.toLowerCase().includes(lowerQuery) ||
        libro.categoria.toLowerCase().includes(lowerQuery) ||
        libro.signatura.toLowerCase().includes(lowerQuery) ||
        libro.isbn.toLowerCase().includes(lowerQuery)
    ).slice(0, 3);
}

// Función para formatear resultados del catálogo
function formatearResultados(resultados) {
    if (!resultados.length) {
        return 'No encontré ese libro en el catálogo, pero puedo darte una sinopsis o recomendar algo similar. 📖';
    }
    return resultados.map(libro => `
        - **Título**: ${libro.titulo}
          **Autor**: ${libro.autor}
          **Categoría**: ${libro.categoria}
          **Tejuelo**: ${libro.signatura}
          **Disponibles**: ${libro.copiasDisponibles}
    `).join('\n');
}

// Función para probar un modelo específico
async function probarModelo(modelo, contents) {
    const url = `${BASE_URL}/${modelo}:generateContent?key=${API_KEY}`;
    const requestBody = {
        contents,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 120  // Respuestas más cortas y dinámicas
        }
    };

    console.log(`Enviando solicitud a ${modelo}:`, JSON.stringify(requestBody, null, 2));

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Error HTTP: ${response.status} - ${errorData.error?.message || 'Solicitud inválida'}`);
        }

        const data = await response.json();
        const respuesta = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text ? 
            data.candidates[0].content.parts[0].text.trim() : null;

        if (respuesta) {
            localStorage.setItem('gemini_modelo_funcional', modelo);
            MODELO_FUNCIONAL = modelo;
            return respuesta;
        }
        return null;
    } catch (error) {
        console.warn(`Modelo ${modelo} falló: ${error.message}`);
        return null;
    }
}

// Función para enviar mensaje a la API de Gemini
async function enviarMensaje() {
    const mensaje = sanitizeInput(chatInput.value.trim());
    // Agregar mensaje del usuario al chat
    agregarMensaje(mensaje, true);
    chatInput.value = '';

    // Indicador de escribiendo
    const escribiendoDiv = agregarMensaje('Hipat-IA está buscando en la estantería... 📚', false, true);

    // Detectar intención
    const intencion = detectarIntencion(mensaje);
    const esSinopsis = intencion === 'sinopsis';
    const esReseña = intencion === 'reseña';
    const esRecomendacion = intencion.includes('recomendacion');

    // Verificar caché para sinopsis/reseñas
    const cacheKey = `${intencion}_${mensaje.toLowerCase().replace(/\s+/g, '_')}`;
    if (cacheRespuestas[cacheKey]) {
        escribiendoDiv.remove();
        agregarMensaje(cacheRespuestas[cacheKey]);
        return;
    }

    // Buscar en el catálogo
    const resultadosCatalogo = buscarEnCatalogo(mensaje);
    let contexto = '';
    if (resultadosCatalogo.length > 0) {
        contexto = `Resultados del catálogo de la Biblioteca Hipatia:\n${formatearResultados(resultadosCatalogo)}\n\n`;
    } else if (!catalogo.length) {
        contexto = 'El catálogo no está disponible, pero puedo ofrecer sinopsis o recomendaciones generales. ✨\n\n';
    }

    // Resumen del historial si es largo
    const historialResumido = historialMensajes.length > 4 ? 
        `Resumen del historial: El usuario preguntó sobre ${historialMensajes.filter(m => m.role === 'user').map(m => m.content).join(', ')}. Continúa la conversación de forma natural.\n` : 
        historialMensajes.map(msg => `${msg.role === 'user' ? 'Usuario' : 'Hipat-IA'}: ${msg.content}`).join('\n');

    // Preparar el prompt del sistema
    const systemPrompt = `Eres Hipat-IA, una bibliotecaria virtual entusiasta del IES Carpe Diem. 
Responde en español con un tono cálido, dinámico y profesional, como una amiga conocedora de libros. Nunca repitas "Hola, soy Hipat-IA". Usa el catálogo y el historial para respuestas relevantes y naturales.

**Contexto del catálogo**:
${contexto}

**Historial de la conversación**:
${historialResumido}

**Instrucciones**:
- **Sinopsis** (e.g., "sinopsis celestina"): Da un resumen breve (80-120 palabras) del libro, usando el catálogo si está disponible o conocimiento general.
- **Reseña** (e.g., "reseña don quijote"): Ofrece una opinión crítica breve (80-120 palabras), destacando importancia y características.
- **Recomendaciones**:
  - Para géneros (e.g., "narrativa", "poesía", "épico"): Sugiere un libro del catálogo o un clásico (e.g., "Cien años de soledad" para narrativa, "Veinte poemas de amor" para poesía).
  - Para "corto": Recomienda libros <200 páginas (e.g., "El principito").
  - Para consultas vagas (e.g., "un libro"): Elige un libro popular al azar (rota entre narrativa, poesía, juvenil).
- Responde en 80-120 palabras, con listas o párrafos variados. Usa emojis (📖, ✨) para un toque amigable.
- Termina con una pregunta breve, como "¿Otro libro?" o "¿Más detalles?".
`;

    // Preparar el contents con historial y nuevo mensaje
    const contents = [
        {
            parts: [{ text: systemPrompt }],
            role: 'model'
        },
        ...historialMensajes.map(msg => ({
            parts: [{ text: msg.content }],
            role: msg.role === 'user' ? 'user' : 'model'
        })),
        {
            parts: [{ text: mensaje }],
            role: 'user'
        }
    ];

    let respuesta = null;
    if (!MODELO_FUNCIONAL || MODELO_FUNCIONAL === 'null') {
        showToast('Buscando un modelo de Gemini funcional...', 'warning');
        for (const modelo of MODELOS_A_PROBAR) {
            console.log(`Probando modelo: ${modelo}`);
            respuesta = await probarModelo(modelo, contents);
            if (respuesta) {
                showToast(`¡Modelo ${modelo} funciona! Usándolo de ahora en adelante.`, 'success');
                break;
            }
        }
        if (!respuesta) {
            escribiendoDiv.remove();
            respuesta = esSinopsis ? 'No pude conectar, pero "La Celestina" de Rojas es un drama trágico sobre amor y engaño. ¿Otro libro? 📖' :
                     esReseña ? 'Sin conexión, pero "Don Quijote" es una sátira genial de Cervantes. ¿Más detalles? ✨' :
                     'No pude conectar. Te recomiendo "El principito", una joya breve y profunda. ¿Otro género? 📖';
        }
    } else {
        console.log(`Usando modelo guardado: ${MODELO_FUNCIONAL}`);
        respuesta = await probarModelo(MODELO_FUNCIONAL, contents);
        if (!respuesta) {
            console.warn(`Modelo guardado ${MODELO_FUNCIONAL} falló, buscando nuevo modelo...`);
            localStorage.removeItem('gemini_modelo_funcional');
            MODELO_FUNCIONAL = null;
            escribiendoDiv.remove();
            return enviarMensaje();
        }
    }

    // Guardar en caché si es sinopsis o reseña
    if (esSinopsis || esReseña) {
        cacheRespuestas[cacheKey] = respuesta;
        localStorage.setItem('hipatia_cache', JSON.stringify(cacheRespuestas));
    }

    // Remover indicador de escribiendo y agregar respuesta
    escribiendoDiv.remove();
    agregarMensaje(respuesta);
}

// Manejar el evento de enviar mensaje (Enter)
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        enviarMensaje();
    }
});

// Inicializar el chat con un mensaje de bienvenida
document.addEventListener('DOMContentLoaded', () => {
    agregarMensaje('¡Hola! Soy Hipat-IA, tu bibliotecaria virtual. ¿Buscas un libro, una sinopsis o algo épico? 📖');
});

// Estilo para el indicador de escribiendo
const style = document.createElement('style');
style.textContent = `
    .mensaje.temporal {
        font-style: italic;
        color: #888;
        opacity: 0.7;
    }
`;
document.head.appendChild(style);