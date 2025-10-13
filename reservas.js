class Reservas {
    constructor() {
        this.reservas = JSON.parse(localStorage.getItem('reservas')) || [];
    }

    crearReserva(usuario, libroId, titulo) {
        if (this.reservas.filter(r => r.usuario === usuario && r.estado === 'pendiente').length >= 3) {
            showToast('Límite de 3 reservas pendientes alcanzado', 'error');
            return false;
        }
        if (this.reservas.some(r => r.usuario === usuario && r.libroId === libroId && r.estado === 'pendiente')) {
            showToast('Ya tienes una reserva pendiente para este libro', 'error');
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
        showToast('Reserva creada con éxito', 'success');
        this.actualizarPuntos(usuario, 'reserva', 15);
        return true;
    }

    cancelarReserva(id, usuario) {
        const reserva = this.reservas.find(r => r.id === id);
        if (reserva && reserva.usuario === usuario) {
            this.reservas = this.reservas.filter(r => r.id !== id);
            this.guardarReservas();
            showToast('Reserva cancelada', 'info');
        } else {
            showToast('No puedes cancelar esta reserva', 'error');
        }
    }

    aprobarReserva(id) {
        const reserva = this.reservas.find(r => r.id === id);
        if (reserva) {
            reserva.estado = 'aprobada';
            this.guardarReservas();
            showToast('Reserva aprobada', 'success');
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
            const isAdmin = emailSesion === EMAIL_ADMIN;
            html += `
                <tr>
                    <td>${r.id}</td>
                    <td>${sanitizeInput(r.titulo)}</td>
                    <td>${sanitizeInput(r.usuario)}</td>
                    <td>${new Date(r.fecha).toLocaleDateString()}</td>
                    <td>${r.estado}</td>
                    <td>
                        ${r.estado === 'pendiente' && isAdmin ? `<button onclick="reservas.aprobarReserva(${r.id})">Aprobar</button>` : ''}
                        ${r.estado === 'pendiente' && (isAdmin || r.usuario === usuario) ? `<button onclick="reservas.cancelarReserva(${r.id}, '${r.usuario}')">Cancelar</button>` : ''}
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

    actualizarPuntos(usuario, accion, puntos) {
        if (!userProgress[usuario]) {
            userProgress[usuario] = { puntos: 0, nivel: 1, acciones: [], penalizacionesAplicadas: {} };
        }
        userProgress[usuario].puntos += puntos;
        userProgress[usuario].acciones.push({ accion, puntos, fecha: new Date().toISOString() });
        userProgress[usuario].nivel = Math.floor(userProgress[usuario].puntos / 100) + 1;
        localStorage.setItem('userProgress', JSON.stringify(userProgress));
    }
}

const reservas = new Reservas();