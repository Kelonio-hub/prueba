// Configuración de la API de Google Gemini (AI Studio) - Con prueba automática de modelos
const API_KEY = 'AIzaSyCls5FtXaTdzQfM5FarqmHSALeGmnIPcAg';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODELOS_A_PROBAR = [
    'gemini-2.5-flash',         // Rápido y estable (2025)
    'gemini-2.5-pro',           // Potente
    'gemini-2.0-flash',         // Estable y multimodal
    'gemini-1.5-flash-latest',  // Legacy rápido
    'gemini-1.5-pro-latest'     // Legacy potente
];
let MODELO_FUNCIONAL = localStorage.getItem('gemini_modelo_funcional');  // Caché del modelo que funciona

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
}

// Función para sanitizar entrada del usuario (evitar XSS)
function sanitizeInput(str) {
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
async function probarModelo(modelo, promptCompleto) {
    const url = `${BASE_URL}/${modelo}:generateContent?key=${API_KEY}`;
    const requestBody = {
        contents: [
            {
                parts: [
                    {
                        text: promptCompleto
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300
        }
    };

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

// Función para enviar mensaje a la API de Gemini (con prueba automática si es necesario)
async function enviarMensaje() {
    const mensaje = sanitizeInput(chatInput.value.trim());
    if (!mensaje) {
        showToast('Por favor, escribe un mensaje.', 'warning');
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
        contexto = 'El catálogo de la biblioteca no está disponible actualmente (modo sin conexión). Te puedo dar recomendaciones generales.\n\n';
    }

    // Preparar el prompt base
    const systemPrompt = `Eres Hipat-IA, la bibliotecaria virtual de la Biblioteca Hipatia del IES Carpe Diem. 
    Tu rol es asistir a los usuarios con consultas sobre libros, recomendaciones, sinopsis, y el catálogo de la biblioteca. 
    Responde de manera amigable, precisa y en español, usando un tono profesional pero accesible.
    Si el usuario pregunta por libros específicos, utiliza la información del catálogo proporcionada. 
    Si no hay información suficiente o el catálogo no está disponible, ofrece una respuesta general o pide más detalles.
    No generes contenido que no esté relacionado con la biblioteca o los libros.

    **Contexto del catálogo**:
    ${contexto}

    **Instrucciones**:
    - Si el mensaje está relacionado con el catálogo, usa los resultados proporcionados.
    - Si es una pregunta general sobre libros o recomendaciones, responde con información útil y relevante.
    - Mantén las respuestas concisas (máximo 200 palabras).
    - Usa un formato claro, con listas o párrafos según corresponda.
    - Finaliza con una pregunta para mantener la conversación, como "¿Qué más puedo ayudarte a encontrar?".

    **Mensaje del usuario**:
    ${mensaje}`;

    // Si no hay modelo funcional guardado, prueba todos los modelos secuencialmente
    let respuesta = null;
    if (!MODELO_FUNCIONAL) {
        showToast('Probando modelos de Gemini para encontrar uno funcional...', 'warning');
        for (const modelo of MODELOS_A_PROBAR) {
            console.log(`Probando modelo: ${modelo}`);
            respuesta = await probarModelo(modelo, systemPrompt);
            if (respuesta) {
                showToast(`¡Modelo ${modelo} funciona! Usándolo de ahora en adelante.`, 'success');
                break;
            }
        }
        if (!respuesta) {
            showToast('Ningún modelo de Gemini está disponible. Usando modo fallback.', 'error');
            respuesta = 'Lo siento, no pude conectar con la IA en este momento. ¿Puedes describir qué libro buscas? Te ayudo manualmente.';
        }
    } else {
        // Usa el modelo guardado
        console.log(`Usando modelo guardado: ${MODELO_FUNCIONAL}`);
        respuesta = await probarModelo(MODELO_FUNCIONAL, systemPrompt);
        if (!respuesta) {
            // Si falla el guardado, borra y prueba de nuevo
            localStorage.removeItem('gemini_modelo_funcional');
            MODELO_FUNCIONAL = null;
            return enviarMensaje();  // Reintenta automáticamente
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