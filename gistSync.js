const GIST_ID = 'c38b206411f10e44ed43e4ae37fb0b26';
const GIST_TOKEN = 'tu_token_aqui'; // ¡Mejorar seguridad: solo admin!

// Mostrar notificaciones (adaptado a tu app)
function showToast(mensaje, tipo) {
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.textContent = mensaje;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Obtener datos del Gist
async function obtenerDatosGist() {
  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!response.ok) throw new Error('Error al obtener Gist');
    const gist = await response.json();
    return JSON.parse(gist.files['datos.json'].content);
  } catch (error) {
    console.error('Error:', error);
    showToast('Error al conectar con el servidor', 'error');
    return null;
  }
}

// Guardar datos en el Gist (solo admin)
async function guardarDatosGist(datos) {
  try {
    const token = GIST_TOKEN || prompt('Token de GitHub (solo admin):');
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: {
          'datos.json': {
            content: JSON.stringify(datos, null, 2)
          }
        }
      })
    });
    if (response.ok) {
      showToast('Datos sincronizados', 'success');
      return true;
    }
    throw new Error('Error al guardar');
  } catch (error) {
    console.error('Error:', error);
    showToast('Error al sincronizar datos', 'error');
    return false;
  }
}

// Sincronizar al iniciar sesión
async function sincronizarAlIniciar(email) {
  const datosGist = await obtenerDatosGist();
  if (!datosGist || !datosGist.correos_aprobados.includes(email)) {
    showToast('Correo no autorizado', 'error');
    return false;
  }
  const datosUsuario = datosGist.usuarios[email] || {
    reservas: [],
    prestamos: [],
    puntos: 0,
    nivel: 'Lector Iniciado',
    reseñas: [],
    ultimaActualizacion: new Date().toISOString(),
    esAdmin: email === 'rafael.casais@educa.madrid.org'
  };
  if (!datosGist.usuarios[email]) {
    datosGist.usuarios[email] = datosUsuario;
    await guardarDatosGist(datosGist);
  }
  localStorage.setItem('bibliotecaDatos', JSON.stringify(datosUsuario));
  actualizarInterfaz();
  return true;
}

// Actualizar datos de un usuario
async function actualizarDatosUsuario(email, nuevosDatos) {
  const datosGist = await obtenerDatosGist();
  if (!datosGist.correos_aprobados.includes(email)) {
    showToast('Correo no autorizado', 'error');
    return false;
  }
  datosGist.usuarios[email] = {
    ...datosGist.usuarios[email],
    ...nuevosDatos,
    ultimaActualizacion: new Date().toISOString()
  };
  await guardarDatosGist(datosGist);
  localStorage.setItem('bibliotecaDatos', JSON.stringify(datosGist.usuarios[email]));
  actualizarInterfaz();
  return true;
}

// Ejemplo: Reservar un libro
async function reservarLibro(email, idLibro) {
  let datosUsuario = JSON.parse(localStorage.getItem('bibliotecaDatos')) || { reservas: [], puntos: 0, nivel: 'Lector Iniciado' };
  if (datosUsuario.reservas.length >= 3) {
    showToast('Límite de reservas alcanzado', 'warning');
    return false;
  }
  datosUsuario.reservas.push({ id_libro: idLibro, fecha: '2025-10-13' });
  datosUsuario.puntos += 15;
  if (datosUsuario.puntos >= 100) datosUsuario.nivel = 'Maestro de la Biblioteca';
  await actualizarDatosUsuario(email, datosUsuario);
  showToast('Libro reservado', 'success');
  return true;
}

// Ejemplo: Escribir una reseña
async function escribirReseña(email, idLibro, estrellas, texto) {
  let datosUsuario = JSON.parse(localStorage.getItem('bibliotecaDatos')) || { reseñas: [], puntos: 0, nivel: 'Lector Iniciado' };
  datosUsuario.reseñas.push({ id_libro: idLibro, estrellas, texto, fecha: '2025-10-13' });
  datosUsuario.puntos += 20;
  if (datosUsuario.puntos >= 100) datosUsuario.nivel = 'Maestro de la Biblioteca';
  await actualizarDatosUsuario(email, datosUsuario);
  showToast('Reseña enviada', 'success');
  return true;
}

// Función placeholder para actualizar la interfaz (adaptar a tu app)
function actualizarInterfaz() {
  console.log('Interfaz actualizada con datos de localStorage');
  // Aquí iría el código para actualizar la UI (perfil, reservas, etc.)
}