// reservas.js
class Reservas {
  constructor() {
    this.reservas = JSON.parse(localStorage.getItem('reservas')) || [];
  }

  crearReserva(usuario, libroId, titulo) {
    if (this.reservas.filter(r => r.usuario === usuario).length >= 3) {
      mostrarToast('Límite de 3 reservas alcanzado', 'error');
      return false;
    }
    const reserva = {
      id: Date.now(),
      usuario,
      libroId,
      titulo: sanitizeInput(titulo),
      fecha: new Date().toISOString(),
      estado: 'pendiente'
    };
    this.reservas.push(reserva);
    this.guardarReservas();
    mostrarToast('Reserva creada con éxito', 'success');
    this.actualizarPuntos(usuario, 15);
    return true;
  }

  cancelarReserva(id) {
    this.reservas = this.reservas.filter(r => r.id !== id);
    this.guardarReservas();
    mostrarToast('Reserva cancelada', 'info');
  }

  aprobarReserva(id) {
    const reserva = this.reservas.find(r => r.id === id);
    if (reserva) {
      reserva.estado = 'aprobada';
      this.guardarReservas();
      mostrarToast('Reserva aprobada', 'success');
    }
  }

  mostrarReservas(contenedorId, usuario = null) {
    const contenedor = document.getElementById(contenedorId);
    const reservasFiltradas = usuario ? this.reservas.filter(r => r.usuario === usuario) : this.reservas;
    let html = `
      <table>
        <tr><th>ID</th><th>Libro</th><th>Usuario</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr>
    `;
    reservasFiltradas.forEach(r => {
      html += `
        <tr>
          <td>${r.id}</td>
          <td>${sanitizeInput(r.titulo)}</td>
          <td>${sanitizeInput(r.usuario)}</td>
          <td>${new Date(r.fecha).toLocaleDateString()}</td>
          <td>${r.estado}</td>
          <td>
            ${r.estado === 'pendiente' && !usuario ? `<button onclick="reservas.aprobarReserva(${r.id})">Aprobar</button>` : ''}
            <button onclick="reservas.cancelarReserva(${r.id})">Cancelar</button>
          </td>
        </tr>
      `;
    });
    html += '</table>';
    contenedor.innerHTML = html;
  }

  guardarReservas() {
    localStorage.setItem('reservas', JSON.stringify(this.reservas));
  }

  actualizarPuntos(usuario, puntos) {
    let userProgress = JSON.parse(localStorage.getItem('userProgress')) || {};
    userProgress[usuario] = (userProgress[usuario] || 0) + puntos;
    localStorage.setItem('userProgress', JSON.stringify(userProgress));
  }
}

const reservas = new Reservas();