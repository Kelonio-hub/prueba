// main.js
// Funciones utilitarias
function sanitizeInput(input) {
  return input.replace(/[<>"]/g, '').replace(/'/g, "\\'");
}

function mostrarToast(mensaje, tipo) {
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.textContent = mensaje;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Cargar catálogo desde Ejemplares.xml
let catalogo = [];
async function cargarCatalogo() {
  try {
    const response = await fetch('Ejemplares.xml');
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
    catalogo = Array.from(xmlDoc.getElementsByTagName('libro')).map(libro => ({
      id: libro.getElementsByTagName('id')[0]?.textContent,
      titulo: libro.getElementsByTagName('titulo')[0]?.textContent,
      autor: libro.getElementsByTagName('autor')[0]?.textContent
    }));
    actualizarSugerencias();
  } catch (error) {
    mostrarToast('Error al cargar el catálogo', 'error');
    console.error(error);
  }
}

function actualizarSugerencias() {
  const datalist = document.getElementById('sugerencias');
  datalist.innerHTML = catalogo.map(libro => `<option value="${sanitizeInput(libro.titulo)}">`).join('');
}

// Mostrar resultados de búsqueda
function mostrarResultadosModal(termino) {
  const contenedor = document.getElementById('modal-buscar-contenido');
  const resultados = catalogo.filter(libro => libro.titulo.toLowerCase().includes(termino.toLowerCase()));
  let html = '<table><tr><th>Título</th><th>Autor</th><th>Acciones</th></tr>';
  resultados.forEach(libro => {
    html += `
      <tr>
        <td>${sanitizeInput(libro.titulo)}</td>
        <td>${sanitizeInput(libro.autor)}</td>
        <td><button onclick="reservas.crearReserva('${sanitizeInput(currentUser)}', '${libro.id}', '${sanitizeInput(libro.titulo)}')">Reservar</button></td>
      </tr>
    `;
  });
  html += '</table>';
  contenedor.innerHTML = html;
}

// Gamificación: Calcular nivel
function calcularNivel(puntos) {
  if (puntos >= 1000) return 'Maestro de la Biblioteca';
  if (puntos >= 500) return 'Lector Experto';
  if (puntos >= 200) return 'Lector Avanzado';
  return 'Lector Iniciado';
}

// Actualizar UI de usuario
function actualizarPerfil(usuario) {
  const userProgress = JSON.parse(localStorage.getItem('userProgress')) || {};
  const puntos = userProgress[usuario] || 0;
  document.getElementById('user-name').textContent = usuario;
  document.getElementById('user-points').textContent = puntos;
  document.getElementById('user-level').textContent = calcularNivel(puntos);
  document.getElementById('progress-fill').style.width = `${Math.min((puntos / 1000) * 100, 100)}%`;
}

// Manejo de login
let currentUser = null;
function manejarLogin() {
  const email = document.getElementById('email-input').value;
  if (!email.endsWith('@educa.madrid.org')) {
    mostrarToast('Correo debe ser @educa.madrid.org', 'error');
    return;
  }
  currentUser = email;
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('admin-section').style.display = email === 'admin@educa.madrid.org' ? 'block' : 'none';
  actualizarPerfil(email);
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  cargarCatalogo();

  // Splash screen
  setTimeout(() => {
    document.getElementById('splash-screen').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
  }, 3000);

  // Login
  document.getElementById('login-btn').addEventListener('click', manejarLogin);

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    currentUser = null;
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
  });

  // Tema
  document.getElementById('theme-toggle').addEventListener('click', () => {
    document.documentElement.setAttribute('data-theme', 
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  // Modales
  document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      closeBtn.closest('.modal').style.display = 'none';
    });
  });

  // Reservas
  document.getElementById('btn-reservas').addEventListener('click', () => {
    reservas.mostrarReservas('modal-reservas-contenido', currentUser);
    document.getElementById('modal-reservas').style.display = 'block';
  });

  document.getElementById('btn-admin-reservas').addEventListener('click', () => {
    reservas.mostrarReservas('modal-reservas-contenido');
    document.getElementById('modal-reservas').style.display = 'block';
  });

  // Solicitudes
  document.getElementById('btn-solicitudes').addEventListener('click', () => {
    solicitudes.mostrarSolicitudes('modal-solicitudes-contenido', currentUser);
    document.getElementById('modal-solicitudes').style.display = 'block';
  });

  document.getElementById('btn-admin-solicitudes').addEventListener('click', () => {
    solicitudes.mostrarSolicitudes('modal-solicitudes-contenido');
    document.getElementById('modal-solicitudes').style.display = 'block';
  });

  document.getElementById('solicitud-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const titulo = document.getElementById('solicitud-titulo').value;
    const autor = document.getElementById('solicitud-autor').value;
    const motivo = document.getElementById('solicitud-motivo').value;
    solicitudes.crearSolicitud(currentUser, titulo, autor, motivo);
    e.target.reset();
  });

  // Reseñas
  document.getElementById('btn-reseñas').addEventListener('click', () => {
    reseñas.mostrarReseñas('modal-reseñas-contenido');
    document.getElementById('modal-reseñas').style.display = 'block';
  });

  document.getElementById('btn-admin-reseñas').addEventListener('click', () => {
    reseñas.mostrarReseñas('modal-reseñas-contenido');
    document.getElementById('modal-reseñas').style.display = 'block';
  });

  document.getElementById('reseña-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const titulo = document.getElementById('reseña-titulo').value;
    const comentario = document.getElementById('reseña-comentario').value;
    const calificacion = parseInt(document.getElementById('reseña-calificacion').value);
    reseñas.crearReseña(currentUser, 'unknown', titulo, comentario, calificacion);
    e.target.reset();
  });

  // Búsqueda
  document.getElementById('btn-buscar').addEventListener('click', () => {
    document.getElementById('modal-buscar').style.display = 'block';
  });

  document.getElementById('buscar-input').addEventListener('input', (e) => {
    mostrarResultadosModal(e.target.value);
  });
});