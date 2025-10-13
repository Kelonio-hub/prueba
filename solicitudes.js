// solicitudes.js
class Solicitudes {
  constructor() {
    this.solicitudes = JSON.parse(localStorage.getItem('solicitudes')) || [];
  }

  crearSolicitud(usuario, titulo, autor, motivo) {
    const solicitud = {
      id: Date.now(),
      usuario,
      titulo: sanitizeInput(titulo),
      autor: sanitizeInput(autor),
      motivo: sanitizeInput(motivo),
      fecha: new Date().toISOString(),
      estado: 'pendiente'
    };
    this.solicitudes.push(solicitud);
    this.guardarSolicitudes();
    mostrarToast('Solicitud enviada', 'success');
    this.actualizarPuntos(usuario, 10);
  }

  mostrarSolicitudes(contenedorId, usuario = null) {
    const contenedor = document.getElementById(contenedorId);
    const solicitudesFiltradas = usuario ? this.solicitudes.filter(s => s.usuario === usuario) : this.solicitudes;
    let html = `
      <table>
        <tr><th>ID</th><th>Título</th><th>Autor</th><th>Motivo</th><th>Usuario</th><th>Fecha</th><th>Estado</th></tr>
    `;
    solicitudesFiltradas.forEach(s => {
      html += `
        <tr>
          <td>${s.id}</td>
          <td>${s.titulo}</td>
          <td>${s.autor}</td>
          <td>${s.motivo}</td>
          <td>${s.usuario}</td>
          <td>${new Date(s.fecha).toLocaleDateString()}</td>
          <td>${s.estado}</td>
        </tr>
      `;
    });
    html += '</table>';
    contenedor.innerHTML = html;
  }

  guardarSolicitudes() {
    localStorage.setItem('solicitudes', JSON.stringify(this.solicitudes));
  }

  actualizarPuntos(usuario, puntos) {
    let userProgress = JSON.parse(localStorage.getItem('userProgress')) || {};
    userProgress[usuario] = (userProgress[usuario] || 0) + puntos;
    localStorage.setItem('userProgress', JSON.stringify(userProgress));
  }
}

const solicitudes = new Solicitudes();