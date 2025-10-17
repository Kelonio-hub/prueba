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
let historialMensajes = [];  // Almacena mensajes para mantener contexto

// Obtener elementos del DOM
const chatMensajes = document.getElementById('chatMensajes');
const chatInput = document.getElementById('chatInput');

// Función para agregar un mensaje al chat
function agregarMensaje(texto, esUsuario = false) {
    if (chatMensajes.children.length > 50) {
        chatMensajes.removeChild(chatMensajes.firstChild);
    }
    const mensajeDiv = document.createElement('div');
    mensajeDiv.className = `mensaje ${esUsuario ? 'user' : 'bot'}`;
    mensajeDiv.textContent = texto;
    chatMensajes.appendChild(mensajeDiv);
    chatMensajes.scrollTop = chatMensajes.scrollHeight;

    // Guardar en historial (máximo 5 turnos para no sobrecargar)
    if (esUsuario) {
        historialMensajes.push({ role: 'user', content: texto });
    } else {
        historialMensajes.push({ role: 'assistant', content: texto });
    }
    if (historialMensajes.length > 10) {
        historialMensajes = historialMensajes.slice(-10);  // Últimos 5 turnos
    }
}

// Función para sanitizar entrada del usuario (evitar XSS)
function sanitizeInput(str) {
    if (!str) return '';
    return DOMPurify ? DOMPurify.sanitize(str) : str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
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
        return 'No encontré libros que coincidan con tu búsqueda. ¿Puedes proporcionar más detalles?';
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
            maxOutputTokens: 300
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
    if (!mensaje || mensaje.length === 0) {
        showToast('Por favor, escribe un mensaje válido.', 'warning');
        return;
    }

    // Agregar mensaje del usuario al chat
    agregarMensaje(mensaje, true);
    chatInput.value = '';

    // Buscar en el catálogo localmente primero
    const resultadosCatalogo = buscarEnCatalogo(mensaje);
    let contexto = '';
    if (resultadosCatalogo.length > 0) {
        contexto = `Resultados del catálogo de la Biblioteca Hipatia:\n${formatearResultados(resultadosCatalogo)}\n\n`;
    } else if (!catalogo.length) {
        contexto = 'El catálogo no está disponible (modo sin conexión). Puedo darte recomendaciones generales.\n\n';
    }

    // Preparar el prompt del sistema
    const systemPrompt = `Eres Hipat-IA, la bibliotecaria virtual de la Biblioteca Hipatia del IES Carpe Diem. 
Tu rol es asistir con consultas sobre libros, recomendaciones y sinopsis. Responde en español, con un tono amigable, dinámico y profesional, sin repetir presentaciones como "Hola, soy Hipat-IA". Usa el contexto del catálogo y el historial de la conversación para dar respuestas relevantes y fluidas.

**Contexto del catálogo**:
${contexto}

**Historial de la conversación**:
${historialMensajes.map(msg => `${msg.role === 'user' ? 'Usuario' : 'Hipat-IA'}: ${msg.content}`).join('\n')}

**Instrucciones**:
- Si el usuario pide un libro específico, usa el catálogo proporcionado o da una sinopsis si no está en el catálogo.
- Si pide una recomendación general (e.g., "un libro de narrativa"), sugiere un libro popular del catálogo o uno conocido (e.g., "Cien años de soledad" para narrativa, "Veinte poemas de amor" para poesía) sin pedir muchos detalles. Solo solicita aclaraciones si la consulta es muy vaga.
- Mantén respuestas concisas (máx. 150 palabras), usando listas o párrafos claros.
- Termina con una pregunta breve para continuar la conversación, como "¿Te interesa otro género?" o "¿Quieres más detalles?".
`;

    // Preparar el contents con historial y nuevo mensaje
    const contents = [
        {
            parts: [{ text: systemPrompt }]
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
            showToast('Ningún modelo de Gemini está disponible. Usando modo fallback.', 'error');
            respuesta = contexto.includes('no está disponible') ? 
                'No puedo conectar con la IA ahora, pero te recomiendo "El Quijote" de Cervantes para narrativa clásica. ¿Te interesa otro género?' : 
                'Lo siento, no pude conectar con la IA. ¿Puedes describir qué libro buscas?';
        }
    } else {
        console.log(`Usando modelo guardado: ${MODELO_FUNCIONAL}`);
        respuesta = await probarModelo(MODELO_FUNCIONAL, contents);
        if (!respuesta) {
            console.warn(`Modelo guardado ${MODELO_FUNCIONAL} falló, buscando nuevo modelo...`);
            localStorage.removeItem('gemini_modelo_funcional');
            MODELO_FUNCIONAL = null;
            return enviarMensaje();  // Reintenta con nuevo modelo
        }
    }

    // Agregar respuesta del bot al chat
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
    agregarMensaje('¡Hola! Soy Hipat-IA, tu bibliotecaria virtual. ¿Buscas un libro, una recomendación o una sinopsis?');
});