// reseñas.js
class Reseñas {
  constructor() {
    this.reseñas = JSON.parse(localStorage.getItem('reseñas')) || [];
  }

  crearReseña(usuario, libroId, titulo, comentario, calificacion) {
    if (calificacion < 1 || calificacion > 5) {
      mostrarToast('La calificación debe estar entre 1 y 5', 'error');
      return false;
    }
    const reseña = {
      id: Date.now(),
      usuario,
      libroId,
      titulo: sanitizeInput(titulo),
      comentario: sanitizeInput(comentario),
      calificacion,
      fecha: new Date().toISOString()
    };
    this.reseñas.push(reseña);
    this.guardarReseñas();
    mostrarToast('Reseña enviada', 'success');
    this.actualizarPuntos(usuario, 20);
    return true;
  }

  mostrarReseñas(contenedorId, libroId = null) {
    const contenedor = document.getElementById(contenedorId);
    const reseñasFiltradas = libroId ? this.reseñas.filter(r => r.libroId === libroId) : this.reseñas;
    let html = '<div class="reseñas-lista">';
    reseñasFiltradas.forEach(r => {
      html += `
        <div class="reseña">
          <h3>${r.titulo}</h3>
          <p>Por: ${r.usuario} - ${new Date(r.fecha).toLocaleDateString()}</p>
          <p>Calificación: ${'★'.repeat(r.calificacion)}${'☆'.repeat(5 - r.calificacion)}</p>
          <p>${r.comentario}</p>
        </div>
      `;
    });
    html += '</div>';
    contenedor.innerHTML = html;
  }

  guardarReseñas() {
    localStorage.setItem('reseñas', JSON.stringify(this.reseñas));
  }

  actualizarPuntos(usuario, puntos) {
    let userProgress = JSON.parse(localStorage.getItem('userProgress')) || {};
    userProgress[usuario] = (userProgress[usuario] || 0) + puntos;
    localStorage.setItem('userProgress', JSON.stringify(userProgress));
  }
}

const reseñas = new Reseñas();