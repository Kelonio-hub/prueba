




        (function(){
            emailjs.init("YOUR_USER_ID");
        })();
    


        var gk_isXlsx = true;
        var gk_xlsxFileLookup = {};
        var gk_fileData = {};
        function filledCell(cell) {
            return cell !== '' && cell != null;
        }
        function loadFileData(filename) {
            if (gk_isXlsx && gk_xlsxFileLookup[filename]) {
                try {
                    var workbook = XLSX.read(gk_fileData[filename], { type: 'base64' });
                    var firstSheetName = workbook.SheetNames[0];
                    var worksheet = workbook.Sheets[firstSheetName];
                    var jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: '' });
                    var filteredData = jsonData.filter(row => row.some(filledCell));
                    var headerRowIndex = filteredData.findIndex((row, index) =>
                        row.filter(filledCell).length >= filteredData[index + 1]?.filter(filledCell).length
                    );
                    if (headerRowIndex === -1 || headerRowIndex > 25) {
                        headerRowIndex = 0;
                    }
                    var csv = XLSX.utils.aoa_to_sheet(filteredData.slice(headerRowIndex));
                    csv = XLSX.utils.sheet_to_csv(csv, { header: 1 });
                    return csv;
                } catch (e) {
                    console.error('Error al procesar archivo:', e);
                    return "";
                }
            }
            return gk_fileData[filename] || "";
        }
    


        let catalogo = [];
        let reservas = {};
        let prestamos = {};
        let solicitudes = [];
        let reseñas = []; // Ahora incluye idRegistro, titulo y rating
        let approvedEmails = [];
        let emailSesion = null;
        const EMAIL_ADMIN = 'rafael.casais@educa.madrid.org';
        const ANNO_ACTUAL = '2025';
        let sortColumn = 'fechaReserva';
        let sortDirection = 'desc';
        let sortColumnEmails = 'email';
        let sortDirectionEmails = 'asc';
        let currentPageHistorial = 1;
        let currentPageEmails = 1;
        let currentPageSolicitudes = 1;
        let currentPageSearch = 1;
        let searchResults = [];
        let searchQuery = '';
        // Config Gist
        const GIST_ID = '8b8017695492cf0a07215b7a5410072c';
        const GIST_FILENAME = 'approved-emails.json';
        // Nuevas variables para colores personalizados
        let customColors = {};
        const defaultColors = {
            'bg-primary': '#f4f4f4',
            'bg-secondary': '#ffffff',
            'text-primary': '#333333',
            'text-secondary': '#666666',
            'btn-primary': '#007bff',
            'border-color': '#dddddd',
            'btn-flotante-bg': '#ffffff',
            'btn-flotante-color': '#000000',
            'btn-flotante-hover-bg': '#f3f4f6',
            'bot-msg-color': '#333333'
        };
        // Gamificación: Progreso por usuario
        let userProgress = {};
        const niveles = [
            { nombre: 'Lector Iniciado', min: 0, max: 99, icon: '🔍' },
            { nombre: 'Lector Explorador', min: 100, max: 299, icon: '🗺️' },
            { nombre: 'Aventurero de Páginas', min: 300, max: 599, icon: '📖' },
            { nombre: 'Guardián de Historias', min: 600, max: 999, icon: '👑' },
            { nombre: 'Maestro de la Biblioteca', min: 1000, max: Infinity, icon: '🦉' }
        ];
        function getAdminToken() {
            if (emailSesion !== EMAIL_ADMIN) return null;
            return prompt('Ingresa tu token GitHub para actualizar (solo admin):') || null;
        }
        async function cargarApprovedEmailsFromGist() {
            try {
                const response = await fetch(`https://api.github.com/gists/${GIST_ID}`);
                if (!response.ok) throw new Error('Gist no encontrado o error API');
                const gist = await response.json();
                const content = gist.files[GIST_FILENAME]?.content;
                if (!content) throw new Error('Archivo JSON no encontrado');
                approvedEmails = JSON.parse(content);
                console.log(`Emails cargados de Gist: ${approvedEmails.length} total`);
                localStorage.setItem('approvedEmails', JSON.stringify(approvedEmails));
            } catch (error) {
                console.error('Error cargando Gist:', error);
                const local = localStorage.getItem('approvedEmails');
                approvedEmails = local ? JSON.parse(local) : [];
                showToast('Error al cargar lista global. Usando lista local.', 'warning');
            }
        }
        async function guardarApprovedEmailsToGist() {
            const token = getAdminToken();
            if (!token) return;
            try {
                const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `token ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        files: {
                            [GIST_FILENAME]: { content: JSON.stringify(approvedEmails, null, 2) }
                        }
                    })
                });
                if (!response.ok) throw new Error('Error al actualizar Gist');
                console.log('Lista actualizada en Gist');
                showToast('¡Lista sincronizada globalmente!', 'success');
            } catch (error) {
                console.error('Error guardando Gist:', error);
                showToast('Falla al guardar. Verifica token e ID.', 'error');
            }
        }
        async function cargarDatos() {
            await cargarApprovedEmailsFromGist();
            const reservasGuardadas = localStorage.getItem('reservasBiblioteca');
            if (reservasGuardadas) reservas = JSON.parse(reservasGuardadas);
            const prestamosGuardados = localStorage.getItem('prestamosBiblioteca');
            if (prestamosGuardados) prestamos = JSON.parse(prestamosGuardados);
            const solicitudesGuardadas = localStorage.getItem('solicitudesBiblioteca');
            if (solicitudesGuardadas) solicitudes = JSON.parse(solicitudesGuardadas);
            const reseñasGuardadas = localStorage.getItem('reseñasBiblioteca');
            if (reseñasGuardadas) reseñas = JSON.parse(reseñasGuardadas);
            // Cargar colores personalizados
            const customSaved = localStorage.getItem('customColors');
            if (customSaved) {
                customColors = JSON.parse(customSaved);
                applyCustomColorsFromStorage();
            }
            // Gamificación: Cargar progreso
            const progressSaved = localStorage.getItem('progressBiblioteca');
            userProgress = progressSaved ? JSON.parse(progressSaved) : {};
        }
        function guardarDatos() {
            localStorage.setItem('reservasBiblioteca', JSON.stringify(reservas));
            localStorage.setItem('prestamosBiblioteca', JSON.stringify(prestamos));
            localStorage.setItem('solicitudesBiblioteca', JSON.stringify(solicitudes));
            localStorage.setItem('reseñasBiblioteca', JSON.stringify(reseñas));
            localStorage.setItem('approvedEmails', JSON.stringify(approvedEmails));
            // Guardar colores personalizados
            localStorage.setItem('customColors', JSON.stringify(customColors));
            // Gamificación: Guardar progreso
            localStorage.setItem('progressBiblioteca', JSON.stringify(userProgress));
        }
        // Gamificación: Funciones
        function inicializarProgreso(email) {
            if (!userProgress[email]) {
                userProgress[email] = { puntos: 0, nivel: 1, penalizacionesAplicadas: {} }; // penalizacionesAplicadas para flags de retrasos/daños
            }
            actualizarProgreso(email);
        }
        function calcularNivel(puntos) {
            for (let i = 0; i < niveles.length; i++) {
                if (puntos >= niveles[i].min && puntos <= niveles[i].max) {
                    return { index: i + 1, ...niveles[i] };
                }
            }
            return niveles[niveles.length - 1]; // Nivel máximo
        }
        function actualizarProgreso(email) {
            if (!email || email === EMAIL_ADMIN) return;
            const progreso = userProgress[email];
            const { index: nivelIdx, nombre, icon } = calcularNivel(progreso.puntos);
            const nivelActual = document.getElementById('nivelBadge');
            const puntosDisplay = document.getElementById('puntosDisplay');
            const progressFill = document.getElementById('progressFill');
            nivelActual.textContent = `${nombre} ${icon}`;
            puntosDisplay.textContent = `${progreso.puntos} puntos`;
            // Progreso hacia siguiente nivel (por simplicidad, % basado en rango actual)
            const nivelActualData = niveles[nivelIdx - 1];
            const progresoSiguiente = Math.min(100, ((progreso.puntos - nivelActualData.min) / (nivelActualData.max - nivelActualData.min + 1)) * 100);
            progressFill.style.width = `${progresoSiguiente}%`;
            // Si subió de nivel, toast
            if (progreso.nivel < nivelIdx) {
                progreso.nivel = nivelIdx;
                showToast(`¡Felicidades! Subiste a ${nombre} ${icon} 🎉`, 'success');
            }
        }
        function aplicarPuntos(email, puntos, razon = '') {
            if (!email || email === EMAIL_ADMIN) return;
            const progreso = userProgress[email];
            progreso.puntos += puntos;
            if (puntos < 0) {
                progreso.penalizacionesAplicadas[Date.now()] = { razon, puntos }; // Log simple
            }
            guardarDatos();
            actualizarProgreso(email);
        }
        function abrirModalProgreso() {
            document.getElementById('progresoModal').style.display = 'block';
        }
        function cerrarModalProgreso() {
            document.getElementById('progresoModal').style.display = 'none';
        }
        // Toast notification function
        function showToast(message, type = 'success') {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.className = type;
            toast.style.display = 'block';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 3000);
        }
        // Theme toggle
        function toggleTheme() {
            const body = document.body;
            const currentTheme = body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            // Reaplicar colores personalizados al nuevo tema (overrides inline persisten)
            applyCustomColorsFromStorage();
        }
        // Load theme (ahora se llama inmediatamente para que splash herede)
        function loadTheme() {
            const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            document.body.setAttribute('data-theme', savedTheme);
        }
        // Funciones para personalización de colores
        function openColorModal() {
            const modal = document.getElementById('colorModal');
            // Cargar valores actuales computados en los inputs
            document.querySelectorAll('#colorModalContent input[type="color"]').forEach(input => {
                const varName = input.id;
                const computedValue = getComputedStyle(document.documentElement).getPropertyValue(`--${varName}`).trim();
                input.value = computedValue || defaultColors[varName];
            });
            // Agregar listeners para live preview
            document.querySelectorAll('#colorModalContent input[type="color"]').forEach(input => {
                input.addEventListener('input', function() {
                    const varName = this.id;
                    const value = this.value;
                    document.documentElement.style.setProperty(`--${varName}`, value);
                });
            });
            modal.style.display = 'block';
        }
        function closeColorModal() {
            document.getElementById('colorModal').style.display = 'none';
        }
        function saveCustomColors() {
            const inputs = document.querySelectorAll('#colorModalContent input[type="color"]');
            inputs.forEach(input => {
                const varName = input.id;
                const value = input.value;
                customColors[varName] = value;
            });
            guardarDatos();
            applyCustomColorsFromStorage();
            showToast('¡Colores personalizados guardados! 🌈', 'success');
            closeColorModal();
        }
        function applyCustomColorsFromStorage() {
            Object.entries(customColors).forEach(([varName, value]) => {
                document.documentElement.style.setProperty(`--${varName}`, value);
            });
        }
        function resetCustomColors() {
            if (confirm('¿Restablecer a los colores predeterminados del tema actual? Perderás tus personalizaciones.')) {
                // Remover todas las propiedades custom inline
                Object.keys(customColors).forEach(key => {
                    document.documentElement.style.removeProperty(`--${key}`);
                });
                customColors = {};
                guardarDatos();
                // Recargar valores en inputs con computados actuales (que ahora son defaults del tema)
                document.querySelectorAll('#colorModalContent input[type="color"]').forEach(input => {
                    const varName = input.id;
                    const computedValue = getComputedStyle(document.documentElement).getPropertyValue(`--${varName}`).trim();
                    input.value = computedValue || defaultColors[varName];
                });
                showToast('Colores restablecidos a predeterminados del tema.', 'warning');
            }
        }
        // Nueva función para limpiar chat
        function limpiarChat() {
            if (confirm('¿Estás seguro de que quieres limpiar el chat?')) {
                document.getElementById('chatMensajes').innerHTML = '';
                showToast('Chat limpiado.', 'success');
            }
        }
        function getPendingTasksCount() {
            let countReservas = 0;
            Object.keys(reservas).forEach(email => {
                countReservas += (reservas[email] || []).length;
            });
            let todosPrestamos = [];
            Object.keys(prestamos).forEach(email => {
                (prestamos[email] || []).forEach(p => todosPrestamos.push({email, ...p}));
            });
            let countRetrasados = todosPrestamos.filter(p => new Date() > new Date(p.fechaDevolucion) && !p.devuelto).length;
            return countReservas + countRetrasados;
        }
        function updateNotificationBadge() {
            if (emailSesion !== EMAIL_ADMIN) return;
            const count = getPendingTasksCount();
            const countElement = document.getElementById('notificationCount');
            if (count > 0) {
                countElement.textContent = count;
                countElement.style.display = 'inline-flex';
            } else {
                countElement.style.display = 'none';
            }
        }
        async function login() {
            const email = document.getElementById('loginEmail').value.trim();
            if (!email || !email.endsWith('@educa.madrid.org')) {
                showToast('Email inválido. Debe terminar en @educa.madrid.org', 'error');
                return;
            }
            await cargarApprovedEmailsFromGist();
            if (email !== EMAIL_ADMIN && !approvedEmails.includes(email)) {
                showToast('Email no aprobado por el administrador.', 'error');
                return;
            }
            emailSesion = email;
            sessionStorage.setItem('emailSesion', email);
            // Cambio: No mostrar badge para admin (ya está en modo admin directo)
            document.getElementById('adminBadge').style.display = 'none'; // Siempre oculto ahora
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('app').style.display = 'block';
            if (email === EMAIL_ADMIN) {
                document.getElementById('seccionIzquierda').style.display = 'none';
                document.getElementById('seccionDerecha').style.display = 'none';
                document.getElementById('adminHistorial').style.display = 'block';
                document.getElementById('btnSolicitudes').style.display = 'none';
                document.getElementById('btnReseñas').style.display = 'none';
                document.getElementById('btnLecturasPrestadas').style.display = 'none';
                updateNotificationBadge();
                showAdminTab('tareas');
            } else {
                document.getElementById('seccionIzquierda').style.display = 'block';
                document.getElementById('seccionDerecha').style.display = 'block';
                document.getElementById('adminHistorial').style.display = 'none';
                document.getElementById('btnSolicitudes').style.display = 'inline-block';
                document.getElementById('btnReseñas').style.display = 'inline-block';
                document.getElementById('btnLecturasPrestadas').style.display = 'inline-block';
                inicializarProgreso(email); // Gamificación
                cargarPerfil();
            }
            cargarCatalogo();
            actualizarSugerenciasBusqueda();
        }
        function logout() {
            emailSesion = null;
            sessionStorage.removeItem('emailSesion');
            document.getElementById('app').style.display = 'none';
            document.getElementById('loginSection').style.display = 'block';
            document.getElementById('loginEmail').value = '';
            document.getElementById('adminBadge').style.display = 'none';
            document.getElementById('adminHistorial').style.display = 'none';
            document.getElementById('seccionIzquierda').style.display = 'none';
            document.getElementById('seccionDerecha').style.display = 'none';
            document.getElementById('btnSolicitudes').style.display = 'none';
            document.getElementById('btnReseñas').style.display = 'none';
            document.getElementById('btnLecturasPrestadas').style.display = 'none';
            document.getElementById('adminTabContent').innerHTML = '';
            const tabs = document.querySelectorAll('.tab-btn');
            tabs.forEach(tab => tab.classList.remove('active'));
            cerrarModal();
            cerrarModalSolicitudes();
            cerrarModalReseñas();
            cerrarModalLecturasPrestadas();
            cerrarModalProgreso();
        }
        function cargarPerfil() {
            if (!emailSesion || emailSesion === EMAIL_ADMIN) return;
            const emailDisplay = document.getElementById('emailDisplay');
            emailDisplay.textContent = `Usuario: ${emailSesion}`;
            emailDisplay.style.display = 'block';
            const misReservasDiv = document.getElementById('misReservas');
            const misPrestamosDiv = document.getElementById('misPrestamos');
            const misReservas = reservas[emailSesion] || [];
            misReservasDiv.innerHTML = `<h3>Mis Reservas (${misReservas.length}/3)</h3><div class="lista-libros">${misReservas.map(r => `
                <div class="libro-perfil">
                    <div class="franja franja-azul"></div>
                    <div class="contenido-franja">
                        <strong>${r.titulo}</strong> (ID: ${r.idRegistro})<br>
                        <span class="fecha">Reservado el: ${new Date(r.fechaReserva).toLocaleDateString('es-ES')}</span>
                        <button class="btn-anular" onclick="anularReserva('${emailSesion}', '${r.idRegistro}', '${r.titulo.replace(/'/g, "\\'")}')">Anular reserva</button>
                    </div>
                </div>
            `).join('') || '<p>No tienes reservas.</p>'}</div>`;
            const misPrestamos = prestamos[emailSesion] || [];
            let retrasados = misPrestamos.filter(p => new Date() > new Date(p.fechaDevolucion) && !p.devuelto);
            // Gamificación: Aplicar penalizaciones por retraso si no se ha hecho
            retrasados.forEach(p => {
                const key = `retraso_${p.idRegistro}_${p.fechaPrestamo}`;
                if (!userProgress[emailSesion].penalizacionesAplicadas[key]) {
                    aplicarPuntos(emailSesion, -5, 'Retraso en devolución');
                    userProgress[emailSesion].penalizacionesAplicadas[key] = true;
                }
            });
            misPrestamosDiv.innerHTML = `<h3>Mis Préstamos</h3><div class="lista-libros">${misPrestamos.map(p => {
                const retrasado = new Date() > new Date(p.fechaDevolucion) && !p.devuelto;
                const colorFranja = retrasado ? 'franja-roja' : 'franja-azul';
                return `
                    <div class="libro-perfil">
                        <div class="franja ${colorFranja}"></div>
                        <div class="contenido-franja">
                            <strong>${p.titulo}</strong> (ID: ${p.idRegistro})<br>
                            <span class="fecha">Prestado el: ${new Date(p.fechaPrestamo).toLocaleDateString('es-ES')}</span><br>
                            <span class="fecha">Devolver antes de: ${new Date(p.fechaDevolucion).toLocaleDateString('es-ES')}</span>
                            ${retrasado ? '<span class="retrasado">Retrasado</span>' : ''}
                            ${p.danado ? '<span class="retrasado" style="background: rgba(139, 0, 139, 0.1);">Dañado</span>' : ''}
                        </div>
                    </div>
                `;
            }).join('') || '<p>No tienes préstamos.</p>'}</div>`;
            if (retrasados.length > 0) {
                setTimeout(() => enviarRecordatorioRetraso(retrasados), 1000);
            }
            cargarRecomendaciones();
            cargarLibrosParaReseñas();
        }
        // Nueva: Cargar recomendaciones personalizadas
        function cargarRecomendaciones() {
            const misPrestamos = prestamos[emailSesion] || [];
            const prestados = misPrestamos.filter(p => p.devuelto).map(p => p.titulo.toLowerCase());
            if (prestados.length === 0) {
                document.getElementById('listaRecomendaciones').innerHTML = '<p>No tienes lecturas completadas para recomendaciones.</p>';
                return;
            }
            const autoresLeidos = [...new Set(misPrestamos.filter(p => p.devuelto).map(p => {
                const libro = catalogo.find(l => l.idRegistro === p.idRegistro);
                return libro ? libro.autor.toLowerCase() : '';
            }))].filter(a => a);
            const categoriasLeidas = [...new Set(misPrestamos.filter(p => p.devuelto).map(p => {
                const libro = catalogo.find(l => l.idRegistro === p.idRegistro);
                return libro ? libro.categoria.toLowerCase() : '';
            }))].filter(c => c);
            const recomendaciones = catalogo.filter(libro => {
                const matchesAutor = autoresLeidos.some(a => libro.autor.toLowerCase().includes(a));
                const matchesCategoria = categoriasLeidas.some(c => libro.categoria.toLowerCase().includes(c));
                return (matchesAutor || matchesCategoria) && libro.disponible && !prestados.includes(libro.titulo.toLowerCase());
            }).slice(0, 5); // Top 5
            const listaDiv = document.getElementById('listaRecomendaciones');
            if (recomendaciones.length === 0) {
                listaDiv.innerHTML = '<p>No hay recomendaciones disponibles en este momento.</p>';
            } else {
                listaDiv.innerHTML = recomendaciones.map(libro => `
                    <div class="recomendacion">
                        <strong>${libro.titulo}</strong> por ${libro.autor}<br>
                        <span>Categoría: ${libro.categoria}</span><br>
                        <button class="btn-reserva" onclick="reservarLibro('${libro.idRegistro}', '${libro.titulo.replace(/'/g, "\\'")}')">Reservar 📖</button>
                    </div>
                `).join('');
            }
        }
        // Nueva: Cargar libros para reseñas
        function cargarLibrosParaReseñas() {
            const misPrestamos = prestamos[emailSesion] || [];
            const librosDevueltos = misPrestamos.filter(p => p.devuelto).map(p => {
                const libro = catalogo.find(l => l.idRegistro === p.idRegistro);
                return libro ? {id: p.idRegistro, titulo: p.titulo} : null;
            }).filter(Boolean);
            const select = document.getElementById('libroReseñaSelect');
            select.innerHTML = '<option value="">Elige un libro de tus préstamos</option>' + librosDevueltos.map(libro => `<option value="${libro.id}">${libro.titulo}</option>`).join('');
        }
        function abrirModalSolicitudes() {
            document.getElementById('solicitudesModal').style.display = 'block';
            cargarMisSolicitudes();
            inicializarContadorSolicitudes();
        }
        function cerrarModalSolicitudes() {
            document.getElementById('solicitudesModal').style.display = 'none';
        }
        function abrirModalReseñas() {
            document.getElementById('reseñasModal').style.display = 'block';
            cargarMisReseñas();
            inicializarContadorReseñas();
            cargarLibrosParaReseñas(); // Nueva
            // Reset rating stars
            document.querySelectorAll('input[name="rating"]').forEach(radio => radio.checked = false);
        }
        function cerrarModalReseñas() {
            document.getElementById('reseñasModal').style.display = 'none';
        }
        function cargarMisSolicitudes() {
            const misSolicitudes = solicitudes.filter(s => s.email === emailSesion);
            const div = document.getElementById('misSolicitudesEnviadas');
            div.innerHTML = `<h4>Mis Solicitudes Enviadas (${misSolicitudes.length})</h4><div class="lista-libros">${misSolicitudes.map(s => `
                <div class="item-enviado">
                    <strong>Enviada el: ${new Date(s.fecha).toLocaleDateString('es-ES')}</strong><br>
                    <p>${s.texto}</p>
                    <button class="btn-anular" onclick="eliminarSolicitudUsuario('${s.fecha}')">Eliminar</button>
                </div>
            `).join('') || '<p>No has enviado solicitudes aún.</p>'}</div>`;
        }
        function cargarMisReseñas() {
            const misReseñas = reseñas.filter(r => r.email === emailSesion);
            const div = document.getElementById('misReseñasEnviadas');
            div.innerHTML = `<h4>Mis Reseñas Enviadas (${misReseñas.length})</h4><div class="lista-libros">${misReseñas.map(r => `
                <div class="item-enviado">
                    <strong>${r.titulo} - Enviada el: ${new Date(r.fecha).toLocaleDateString('es-ES')}</strong><br>
                    <div class="rating-display">${'★'.repeat(r.rating || 0)}</div>
                    <p>${r.texto}</p>
                    <button class="btn-anular" onclick="eliminarReseña('${emailSesion}', '${r.fecha}')">Eliminar</button>
                </div>
            `).join('') || '<p>No has enviado reseñas aún.</p>'}</div>`;
        }
        function inicializarContadorSolicitudes() {
            const textarea = document.getElementById('solicitudTextarea');
            textarea.value = '';
            const palabras = 0;
            document.getElementById('contador').textContent = `${palabras}/500 palabras`;
            textarea.addEventListener('input', function() {
                const texto = this.value;
                const palabras = texto.trim() === '' ? 0 : texto.trim().split(/\s+/).length;
                document.getElementById('contador').textContent = `${palabras}/500 palabras`;
                if (palabras > 500) {
                    this.style.borderColor = 'var(--danger)';
                } else {
                    this.style.borderColor = 'var(--border-color)';
                }
            });
        }
        function inicializarContadorReseñas() {
            const textarea = document.getElementById('reseñaTextarea');
            textarea.value = '';
            const palabras = 0;
            document.getElementById('contadorReseñas').textContent = `${palabras}/500 palabras`;
            textarea.addEventListener('input', function() {
                const texto = this.value;
                const palabras = texto.trim() === '' ? 0 : texto.trim().split(/\s+/).length;
                document.getElementById('contadorReseñas').textContent = `${palabras}/500 palabras`;
                if (palabras > 500) {
                    this.style.borderColor = 'var(--danger)';
                } else {
                    this.style.borderColor = 'var(--border-color)';
                }
            });
        }
        function enviarSolicitud() {
            const textarea = document.getElementById('solicitudTextarea');
            const texto = textarea.value.trim();
            if (texto === '') {
                showToast('Por favor, escribe tu solicitud antes de enviar.', 'warning');
                return;
            }
            const palabras = texto.split(/\s+/).length;
            if (palabras > 500) {
                showToast('La solicitud excede el límite de 500 palabras. Por favor, acórtala.', 'warning');
                return;
            }
            const fecha = new Date().toISOString();
            solicitudes.push({email: emailSesion, texto, fecha});
            // Gamificación: +10 pts por solicitud
            aplicarPuntos(emailSesion, 10, 'Solicitud enviada');
            guardarDatos();
            textarea.value = '';
            document.getElementById('contador').textContent = '0/500 palabras';
            showToast('¡Solicitud enviada exitosamente! La biblioteca revisará tu petición. (+10 pts)', 'success');
            updateNotificationBadge();
            cargarMisSolicitudes();
        }
        function enviarReseña() {
            const select = document.getElementById('libroReseñaSelect');
            const textarea = document.getElementById('reseñaTextarea');
            const ratingInput = document.querySelector('input[name="rating"]:checked');
            const idLibro = select.value;
            const texto = textarea.value.trim();
            const rating = ratingInput ? parseInt(ratingInput.value) : null;
            if (!idLibro) {
                showToast('Por favor, selecciona un libro para reseñar.', 'warning');
                return;
            }
            if (!rating) {
                showToast('Por favor, selecciona una valoración (1-5 estrellas).', 'warning');
                return;
            }
            if (texto === '') {
                showToast('Por favor, escribe tu reseña antes de enviar.', 'warning');
                return;
            }
            const palabras = texto.split(/\s+/).length;
            if (palabras > 500) {
                showToast('La reseña excede el límite de 500 palabras. Por favor, acórtala.', 'warning');
                return;
            }
            const fecha = new Date().toISOString();
            const libro = catalogo.find(l => l.idRegistro === idLibro);
            reseñas.push({email: emailSesion, texto, fecha, idRegistro: idLibro, titulo: libro ? libro.titulo : 'Desconocido', rating});
            // Gamificación: +20 pts por reseña (fijo, sin depender del rating)
            aplicarPuntos(emailSesion, 20, 'Reseña enviada');
            guardarDatos();
            select.value = '';
            textarea.value = '';
            document.getElementById('contadorReseñas').textContent = '0/500 palabras';
            document.querySelectorAll('input[name="rating"]').forEach(radio => radio.checked = false);
            showToast('¡Reseña enviada exitosamente! Gracias por compartir tu opinión. (+20 pts)', 'success');
            updateNotificationBadge();
            cargarMisReseñas();
        }
        function eliminarSolicitudUsuario(fechaSolicitud) {
            if (confirm('¿Estás seguro de eliminar esta solicitud?')) {
                solicitudes = solicitudes.filter(s => !(s.email === emailSesion && s.fecha === fechaSolicitud));
                guardarDatos();
                showToast('Solicitud eliminada.', 'success');
                cargarMisSolicitudes();
                updateNotificationBadge();
            }
        }
        function eliminarReseña(emailUsuario, fechaReseña) {
            if (confirm('¿Estás seguro de eliminar esta reseña?')) {
                reseñas = reseñas.filter(r => !(r.email === emailUsuario && r.fecha === fechaReseña));
                guardarDatos();
                showToast('Reseña eliminada.', 'success');
                cargarMisReseñas();
                updateNotificationBadge();
            }
        }
        function abrirModalLecturasPrestadas() {
            document.getElementById('lecturasMasPrestadasModal').style.display = 'block';
            cargarLecturasMasPrestadas();
        }
        function cerrarModalLecturasPrestadas() {
            document.getElementById('lecturasMasPrestadasModal').style.display = 'none';
        }
        function cargarLecturasMasPrestadas() {
            let historial = [];
            Object.keys(reservas).forEach(email => {
                (reservas[email] || []).forEach(r => {
                    historial.push({email, titulo: r.titulo, fechaPrestamo: ''});
                });
            });
            Object.keys(prestamos).forEach(email => {
                (prestamos[email] || []).forEach(p => {
                    if (p.fechaPrestamo) { // Solo préstamos reales
                        historial.push({email, titulo: p.titulo, fechaPrestamo: p.fechaPrestamo});
                    }
                });
            });
            const conteo = {};
            historial.forEach(item => {
                if (item.fechaPrestamo) {
                    conteo[item.titulo] = (conteo[item.titulo] || 0) + 1;
                }
            });
            const sorted = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 10);
            const listaDiv = document.getElementById('listaLecturasPrestadas');
            if (sorted.length === 0) {
                listaDiv.innerHTML = '<p>No hay préstamos registrados aún.</p>';
                return;
            }
            // Encontrar detalles completos de cada libro (título -> objeto completo)
            const topLibros = sorted.map(([titulo, count]) => {
                const libro = catalogo.find(l => l.titulo === titulo);
                return { libro, count };
            }).filter(item => item.libro); // Solo si existe en catálogo

            listaDiv.innerHTML = `<ul>${topLibros.map(({libro, count}, index) => {
                const esAdmin = emailSesion === EMAIL_ADMIN;
                let botonReserva = '';
                if (!esAdmin && libro.disponible) {
                    botonReserva = `<button class="btn-reserva" onclick="reservarLibro('${libro.idRegistro}', '${libro.titulo.replace(/'/g, "\\'")}')">Reservar 📖</button>`;
                } else if (!esAdmin) {
                    botonReserva = '<span class="estado-no-disponible">No disponible</span>';
                } else {
                    botonReserva = '<span class="estado-no-disponible">Admin: No reserva</span>';
                }
                return `
                    <li class="lectura-prestada-item">
                        <strong>${index + 1}. ${libro.titulo}</strong> por ${libro.autor}<br>
                        <span>Prestado ${count} ${count === 1 ? 'vez' : 'veces'}</span><br>
                        ${botonReserva}
                    </li>
                `;
            }).join('')}</ul>`;
        }
        // Autocompletado búsqueda
        function actualizarSugerenciasBusqueda() {
            const datalist = document.getElementById('sugerenciasBusqueda');
            datalist.innerHTML = catalogo.map(libro => `
                <option value="${libro.titulo}">${libro.autor} - ${libro.categoria}</option>
            `).join('');
        }
        function mostrarHistorialAdmin() {
            document.getElementById('seccionIzquierda').style.display = 'none';
            document.getElementById('seccionDerecha').style.display = 'none';
            document.getElementById('adminHistorial').style.display = 'block';
            document.getElementById('btnSolicitudes').style.display = 'none';
            document.getElementById('btnReseñas').style.display = 'none';
            document.getElementById('btnLecturasPrestadas').style.display = 'none';
            updateNotificationBadge();
            showAdminTab('tareas');
        }
        function showAdminTab(tabId) {
            const tabs = document.querySelectorAll('.tab-btn');
            tabs.forEach(tab => tab.classList.remove('active'));
            const activeTab = Array.from(tabs).find(tab => tab.onclick.toString().includes(tabId));
            if (activeTab) activeTab.classList.add('active');
            const contentDiv = document.getElementById('adminTabContent');
            if (tabId === 'tareas') {
                contentDiv.innerHTML = getTareasPendientes();
            } else if (tabId === 'historial') {
                contentDiv.innerHTML = getHistorialCompleto();
            } else if (tabId === 'correos') {
                contentDiv.innerHTML = getGestionCorreos();
                cargarApprovedEmails();
            } else if (tabId === 'solicitudes') {
                contentDiv.innerHTML = getSolicitudesLibros();
            }
        }
        function getTareasPendientes() {
            let tareas = '<h3>Tareas Pendientes</h3>';
            let todasReservas = [];
            Object.keys(reservas).forEach(email => {
                (reservas[email] || []).forEach(r => todasReservas.push({email, ...r}));
            });
            let todosPrestamos = [];
            Object.keys(prestamos).forEach(email => {
                (prestamos[email] || []).forEach(p => todosPrestamos.push({email, ...p}));
            });
            let retrasados = todosPrestamos.filter(p => new Date() > new Date(p.fechaDevolucion) && !p.devuelto);
            tareas += '<h4>Libros Reservados Pendientes de Recoger</h4>';
            tareas += `<div class="lista-libros">${todasReservas.map(r => `
                <div class="libro-perfil">
                    <div class="franja franja-azul"></div>
                    <div class="contenido-franja">
                        <strong>${r.titulo}</strong> por ${r.email} (ID: ${r.idRegistro})<br>
                        <span class="fecha">Reservado el: ${new Date(r.fechaReserva).toLocaleDateString('es-ES')}</span>
                        <button class="btn-recoger" onclick="adminRecogerLibro('${r.email}', '${r.idRegistro}', '${r.titulo.replace(/'/g, "\\'")}')">Recoger</button>
                        <button class="btn-anular" onclick="anularReserva('${r.email}', '${r.idRegistro}', '${r.titulo.replace(/'/g, "\\'")}')">Anular</button>
                    </div>
                </div>
            `).join('') || '<p>No hay reservas pendientes.</p>'}</div>`;
            tareas += '<h4>Libros Retrasados</h4>';
            tareas += `<div class="lista-libros">${retrasados.map(p => `
                <div class="libro-perfil">
                    <div class="franja franja-roja"></div>
                    <div class="contenido-franja">
                        <strong>${p.titulo}</strong> por ${p.email} (ID: ${p.idRegistro})<br>
                        <span class="fecha">Prestado el: ${new Date(p.fechaPrestamo).toLocaleDateString('es-ES')}</span><br>
                        <span class="fecha">Debería devolverse antes de: ${new Date(p.fechaDevolucion).toLocaleDateString('es-ES')}</span>
                        <span class="retrasado">Retrasado</span>
                        <button class="btn-devolver" onclick="adminDevolverLibro('${p.email}', '${p.idRegistro}', '${p.titulo.replace(/'/g, "\\'")}')">Marcar Devuelto</button>
                    </div>
                </div>
            `).join('') || '<p>No hay libros retrasados.</p>'}</div>`;
            return tareas;
        }
        function getHistorialCompleto() {
            let historialHtml = '<h3>Historial Completo</h3>';
            let historial = [];
            Object.keys(reservas).forEach(email => {
                (reservas[email] || []).forEach(r => {
                    historial.push({
                        email,
                        titulo: r.titulo,
                        idRegistro: r.idRegistro,
                        fechaReserva: r.fechaReserva || '',
                        fechaPrestamo: '',
                        fechaDevolucion: '',
                        estado: 'Reservado'
                    });
                });
            });
            Object.keys(prestamos).forEach(email => {
                (prestamos[email] || []).forEach(p => {
                    historial.push({
                        email,
                        titulo: p.titulo,
                        idRegistro: p.idRegistro,
                        fechaReserva: p.fechaReserva || '',
                        fechaPrestamo: p.fechaPrestamo || '',
                        fechaDevolucion: p.fechaDevolucion || '',
                        estado: p.devuelto ? 'Devuelto' : 'Prestado'
                    });
                });
            });
            historial.sort((a, b) => {
                let valueA, valueB;
                switch (sortColumn) {
                    case 'titulo':
                        valueA = a.titulo.toLowerCase();
                        valueB = b.titulo.toLowerCase();
                        break;
                    case 'email':
                        valueA = a.email.toLowerCase();
                        valueB = b.email.toLowerCase();
                        break;
                    case 'fechaReserva':
                        valueA = a.fechaReserva || '9999-12-31';
                        valueB = b.fechaReserva || '9999-12-31';
                        break;
                    case 'fechaPrestamo':
                        valueA = a.fechaPrestamo || '9999-12-31';
                        valueB = b.fechaPrestamo || '9999-12-31';
                        break;
                    case 'fechaDevolucion':
                        valueA = a.fechaDevolucion || '9999-12-31';
                        valueB = b.fechaDevolucion || '9999-12-31';
                        break;
                    case 'estado':
                        valueA = a.estado.toLowerCase();
                        valueB = b.estado.toLowerCase();
                        break;
                    default:
                        valueA = a.idRegistro.toLowerCase();
                        valueB = b.idRegistro.toLowerCase();
                }
                if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
                if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
            const pageSize = 25;
            const totalPages = Math.ceil(historial.length / pageSize) || 1;
            const start = (currentPageHistorial - 1) * pageSize;
            const end = start + pageSize;
            const paginatedHistorial = historial.slice(start, end);
            const paginationHtml = `
                <div class="pagination">
                    <button ${currentPageHistorial === 1 ? 'disabled' : ''} onclick="changePageHistorial(${currentPageHistorial - 1})">&lt;</button>
                    <span>Página ${currentPageHistorial}/${totalPages}</span>
                    <button ${currentPageHistorial === totalPages ? 'disabled' : ''} onclick="changePageHistorial(${currentPageHistorial + 1})">&gt;</button>
                </div>
            `;
            historialHtml += paginationHtml;
            historialHtml += `<table>
                <thead>
                    <tr>
                        <th onclick="ordenarHistorial('email')" class="sort-arrow ${sortColumn === 'email' ? sortDirection : ''}">Usuario</th>
                        <th onclick="ordenarHistorial('titulo')" class="sort-arrow ${sortColumn === 'titulo' ? sortDirection : ''}">Título</th>
                        <th onclick="ordenarHistorial('idRegistro')" class="sort-arrow ${sortColumn === 'idRegistro' ? sortDirection : ''}">ID Registro</th>
                        <th onclick="ordenarHistorial('fechaReserva')" class="sort-arrow ${sortColumn === 'fechaReserva' ? sortDirection : ''}">Fecha Reserva</th>
                        <th onclick="ordenarHistorial('fechaPrestamo')" class="sort-arrow ${sortColumn === 'fechaPrestamo' ? sortDirection : ''}">Fecha Préstamo</th>
                        <th onclick="ordenarHistorial('fechaDevolucion')" class="sort-arrow ${sortColumn === 'fechaDevolucion' ? sortDirection : ''}">Fecha Devolución</th>
                        <th onclick="ordenarHistorial('estado')" class="sort-arrow ${sortColumn === 'estado' ? sortDirection : ''}">Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedHistorial.length > 0 ? paginatedHistorial.map(item => {
                        const retrasado = item.estado === 'Prestado' && item.fechaDevolucion && new Date() > new Date(item.fechaDevolucion);
                        return `
                            <tr>
                                <td>${item.email}</td>
                                <td>${item.titulo}</td>
                                <td>${item.idRegistro}</td>
                                <td>${item.fechaReserva ? new Date(item.fechaReserva).toLocaleDateString('es-ES') : '-'}</td>
                                <td>${item.fechaPrestamo ? new Date(item.fechaPrestamo).toLocaleDateString('es-ES') : '-'}</td>
                                <td>${item.fechaDevolucion ? new Date(item.fechaDevolucion).toLocaleDateString('es-ES') : '-'}</td>
                                <td>${retrasado ? '<span class="retrasado">Retrasado</span>' : item.estado}</td>
                                <td>
                                    ${item.estado === 'Reservado' ? `
                                        <button class="btn-recoger" onclick="adminRecogerLibro('${item.email}', '${item.idRegistro}', '${item.titulo.replace(/'/g, "\\'")}')">Prestado</button>
                                        <button class="btn-anular" onclick="anularReserva('${item.email}', '${item.idRegistro}', '${item.titulo.replace(/'/g, "\\'")}')">Anular</button>
                                    ` : ''}
                                    ${item.estado === 'Prestado' ? `
                                        <button class="btn-devolver" onclick="adminDevolverLibro('${item.email}', '${item.idRegistro}', '${item.titulo.replace(/'/g, "\\'")}')">Devolver</button>
                                    ` : ''}
                                    <button onclick="exportarHistorial()">Exportar CSV 📥</button>
                                </td>
                            </tr>
                        `;
                    }).join('') : '<tr><td colspan="8">No hay registros.</td></tr>'}
                </tbody>
            </table>`;
            historialHtml += paginationHtml;
            // Estadísticas (sin cambios, pero con tema)
            const prestamosPorAnno = {};
            historial.forEach(item => {
                if (item.fechaPrestamo) {
                    const date = new Date(item.fechaPrestamo);
                    const anno = date.getFullYear();
                    prestamosPorAnno[anno] = (prestamosPorAnno[anno] || 0) + 1;
                }
            });
            const sortedAnnos = Object.entries(prestamosPorAnno).sort((a, b) => b[1] - a[1]);
            historialHtml += '<h4>Estadísticas de Préstamos por Año</h4><ul>';
            sortedAnnos.forEach(([anno, count]) => {
                historialHtml += `<li>${anno}: ${count} préstamos</li>`;
            });
            historialHtml += '</ul>';
            const prestamosPorMes = {};
            historial.forEach(item => {
                if (item.fechaPrestamo) {
                    const date = new Date(item.fechaPrestamo);
                    const mes = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
                    prestamosPorMes[mes] = (prestamosPorMes[mes] || 0) + 1;
                }
            });
            const sortedMeses = Object.entries(prestamosPorMes).sort((a, b) => b[1] - a[1]);
            historialHtml += '<h4>Estadísticas de Préstamos por Mes</h4><ul>';
            sortedMeses.forEach(([mes, count]) => {
                historialHtml += `<li>${mes}: ${count} préstamos</li>`;
            });
            historialHtml += '</ul>';
            historialHtml += getLibrosMasPrestados(historial);
            return historialHtml;
        }
        // Nueva: Exportar historial a CSV
        function exportarHistorial() {
            const historial = []; // Lógica similar a getHistorialCompleto
            Object.keys(reservas).forEach(email => {
                (reservas[email] || []).forEach(r => {
                    historial.push({
                        email, titulo: r.titulo, idRegistro: r.idRegistro, fechaReserva: r.fechaReserva, fechaPrestamo: '', fechaDevolucion: '', estado: 'Reservado'
                    });
                });
            });
            Object.keys(prestamos).forEach(email => {
                (prestamos[email] || []).forEach(p => {
                    historial.push({
                        email, titulo: p.titulo, idRegistro: p.idRegistro, fechaReserva: p.fechaReserva || '', fechaPrestamo: p.fechaPrestamo || '', fechaDevolucion: p.fechaDevolucion || '', estado: p.devuelto ? 'Devuelto' : 'Prestado'
                    });
                });
            });
            const csv = 'Usuario,Título,ID Registro,Fecha Reserva,Fecha Préstamo,Fecha Devolución,Estado\n' + historial.map(h => `${h.email},"${h.titulo}",${h.idRegistro},"${h.fechaReserva}","${h.fechaPrestamo}","${h.fechaDevolucion}",${h.estado}`).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'historial_biblioteca.csv';
            a.click();
            window.URL.revokeObjectURL(url);
            showToast('Historial exportado como CSV.', 'success');
        }
        // Resto de funciones (sin cambios mayores, pero con showToast donde había alert)
        function getLibrosMasPrestados(historial) {
            const conteo = {};
            historial.forEach(item => {
                if (item.fechaPrestamo) {
                    conteo[item.titulo] = (conteo[item.titulo] || 0) + 1;
                }
            });
            const sorted = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 5);
            let html = '<h4>Libros Más Prestados</h4><ul>';
            sorted.forEach(([titulo, count]) => {
                html += `<li>${titulo}: ${count} veces</li>`;
            });
            html += '</ul>';
            return html;
        }
        function changePageHistorial(newPage) {
            currentPageHistorial = newPage;
            showAdminTab('historial');
        }
        function getGestionCorreos() {
            return `
                <h3>Gestión de Correos Aprobados</h3>
                <input type="email" id="newEmail" placeholder="Agregar correo manualmente">
                <button onclick="addEmail()">Agregar</button>
                <input type="file" id="emailFile" accept=".csv,.xlsx">
                <button onclick="importEmails()">Importar desde archivo</button>
                <button onclick="cargarApprovedEmailsFromGist(); setTimeout(cargarApprovedEmails, 500);">🔄 Cargar Lista Global (de Gist)</button>
                <button onclick="guardarApprovedEmailsToGist();">💾 Actualizar Global (a Gist)</button>
                <input type="text" id="emailSearch" placeholder="Buscar correo" oninput="filterEmails()">
                <button onclick="selectAllEmails()">Seleccionar todos</button>
                <button onclick="deselectAllEmails()">Deseleccionar todos</button>
                <button onclick="deleteSelectedEmails()">Eliminar Correos seleccionados</button>
                <div id="approvedEmailPaginationTop" class="pagination"></div>
                <table id="approvedEmailTable">
                    <thead>
                        <tr>
                            <th onclick="ordenarCorreos('email')" class="sort-arrow ${sortColumnEmails === 'email' ? sortDirectionEmails : ''}">Correo</th>
                            <th onclick="ordenarCorreos('prestados')" class="sort-arrow ${sortColumnEmails === 'prestados' ? sortDirectionEmails : ''}">Libros Prestados</th>
                            <th onclick="ordenarCorreos('reservas')" class="sort-arrow ${sortColumnEmails === 'reservas' ? sortDirectionEmails : ''}">En Reserva</th>
                            <th onclick="ordenarCorreos('porDevolver')" class="sort-arrow ${sortColumnEmails === 'porDevolver' ? sortDirectionEmails : ''}">Por Devolver</th>
                            <th onclick="ordenarCorreos('retrasados')" class="sort-arrow ${sortColumnEmails === 'retrasados' ? sortDirectionEmails : ''}">Retrasados</th>
                            <th onclick="ordenarCorreos('rango')" class="sort-arrow ${sortColumnEmails === 'rango' ? sortDirectionEmails : ''}">Rango Lector</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="approvedEmailList"></tbody>
                </table>
                <div id="approvedEmailPaginationBottom" class="pagination"></div>
            `;
        }
        function getSolicitudesLibros() {
            let solicitudesHtml = '<h3>Solicitudes de Libros</h3>';
            const pageSize = 25;
            const totalPages = Math.ceil(solicitudes.length / pageSize) || 1;
            const start = (currentPageSolicitudes - 1) * pageSize;
            const end = start + pageSize;
            const paginatedSolicitudes = solicitudes.slice(start, end);
            const paginationHtml = `
                <div class="pagination">
                    <button ${currentPageSolicitudes === 1 ? 'disabled' : ''} onclick="changePageSolicitudes(${currentPageSolicitudes - 1})">&lt;</button>
                    <span>Página ${currentPageSolicitudes}/${totalPages}</span>
                    <button ${currentPageSolicitudes === totalPages ? 'disabled' : ''} onclick="changePageSolicitudes(${currentPageSolicitudes + 1})">&gt;</button>
                </div>
            `;
            solicitudesHtml += paginationHtml;
            solicitudesHtml += `<table>
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Fecha</th>
                        <th>Solicitud</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedSolicitudes.map((s, index) => `
                        <tr>
                            <td>${s.email}</td>
                            <td>${new Date(s.fecha).toLocaleDateString('es-ES')}</td>
                            <td>${s.texto}</td>
                            <td><button class="btn-anular" onclick="eliminarSolicitud(${start + index})">Eliminar</button></td>
                        </tr>
                    `).join('') || '<tr><td colspan="4">No hay solicitudes.</td></tr>'}
                </tbody>
            </table>`;
            solicitudesHtml += paginationHtml;
            // Reseñas en admin (actualizado con título y rating)
            solicitudesHtml += '<h3>Reseñas de Libros</h3>';
            const pageSizeReseñas = 25;
            const totalPagesReseñas = Math.ceil(reseñas.length / pageSizeReseñas) || 1;
            const startReseñas = (currentPageSolicitudes - 1) * pageSizeReseñas;
            const endReseñas = startReseñas + pageSizeReseñas;
            const paginatedReseñas = reseñas.slice(startReseñas, endReseñas);
            // Calcular promedios por libro
            const promediosPorLibro = {};
            paginatedReseñas.forEach(r => {
                if (!promediosPorLibro[r.titulo]) promediosPorLibro[r.titulo] = { sum: 0, count: 0 };
                promediosPorLibro[r.titulo].sum += r.rating || 0;
                promediosPorLibro[r.titulo].count += 1;
            });
            Object.keys(promediosPorLibro).forEach(titulo => {
                promediosPorLibro[titulo].avg = (promediosPorLibro[titulo].sum / promediosPorLibro[titulo].count).toFixed(1);
            });
            solicitudesHtml += `
                <table>
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Libro</th>
                            <th>Rating</th>
                            <th>Promedio del Libro</th>
                            <th>Fecha</th>
                            <th>Reseña</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${paginatedReseñas.map((r, index) => `
                            <tr>
                                <td>${r.email}</td>
                                <td>${r.titulo}</td>
                                <td>${'★'.repeat(r.rating || 0)}</td>
                                <td>${promediosPorLibro[r.titulo]?.avg || 'N/A'}</td>
                                <td>${new Date(r.fecha).toLocaleDateString('es-ES')}</td>
                                <td>${r.texto}</td>
                                <td><button class="btn-anular" onclick="eliminarReseñaAdmin(${startReseñas + index})">Eliminar</button></td>
                            </tr>
                        `).join('') || '<tr><td colspan="7">No hay reseñas.</td></tr>'}
                    </tbody>
                </table>
            `;
            return solicitudesHtml;
        }
        function eliminarReseñaAdmin(index) {
            if (confirm('¿Estás seguro de eliminar esta reseña?')) {
                reseñas.splice(index, 1);
                guardarDatos();
                showAdminTab('solicitudes');
                updateNotificationBadge();
            }
        }
        function eliminarSolicitud(index) {
            if (confirm('¿Estás seguro de eliminar esta solicitud?')) {
                solicitudes.splice(index, 1);
                guardarDatos();
                showAdminTab('solicitudes');
                updateNotificationBadge();
            }
        }
        function changePageSolicitudes(newPage) {
            currentPageSolicitudes = newPage;
            showAdminTab('solicitudes');
        }
        function changePageEmails(newPage) {
            currentPageEmails = newPage;
            showAdminTab('correos');
        }
        function enviarRecordatorioRetraso(retrasados) {
            const mensajes = retrasados.map(p => `El libro "${p.titulo}" está retrasado. Por favor, devuélvelo cuanto antes.`).join('\n');
            const params = {
                to_email: emailSesion,
                subject: 'Recordatorio: Libros retrasados en devolución',
                message: `Hola,\n\n${mensajes}\n\nGracias por tu colaboración.\n\nBiblioteca Carpe Diem`
            };
            emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', params)
                .then(() => {
                    console.log('Recordatorio de retraso enviado al estudiante.');
                }, (error) => {
                    console.error('Error al enviar recordatorio:', error);
                    showToast('Error al enviar correo con EmailJS. Abriendo cliente de correo como alternativa.', 'error');
                    const subject = encodeURIComponent('Recordatorio: Libros retrasados en devolución');
                    const body = encodeURIComponent(`Hola,\n\n${mensajes}\n\nGracias por tu colaboración.\n\nBiblioteca Carpe Diem`);
                    window.location.href = `mailto:${emailSesion}?subject=${subject}&body=${body}`;
                });
        }
        function adminRecogerLibro(emailEstudiante, idRegistro, titulo) {
            const reservaIndex = (reservas[emailEstudiante] || []).findIndex(r => r.idRegistro === idRegistro);
            if (reservaIndex === -1) return;
            const reserva = reservas[emailEstudiante][reservaIndex];
            const fechaPrestamo = new Date().toISOString();
            const fechaDevolucion = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            if (!prestamos[emailEstudiante]) prestamos[emailEstudiante] = [];
            prestamos[emailEstudiante].push({idRegistro, fechaReserva: reserva.fechaReserva, fechaPrestamo, fechaDevolucion, titulo, devuelto: false, danado: false});
            reservas[emailEstudiante].splice(reservaIndex, 1);
            // Gamificación: +15 pts por recoger préstamo (unificado con reserva)
            aplicarPuntos(emailEstudiante, 15, 'Reserva y recogida completada');
            guardarDatos();
            const libro = catalogo.find(l => l.idRegistro === idRegistro);
            if (libro) libro.disponible = false;
            showToast(`Libro recogido para ${emailEstudiante}.`, 'success');
            updateNotificationBadge();
            showAdminTab('tareas');
            if (document.getElementById('searchModal').style.display === 'block') {
                buscarLibros();
            }
        }
        function adminDevolverLibro(emailEstudiante, idRegistro, titulo) {
            const prestamoIndex = (prestamos[emailEstudiante] || []).findIndex(p => p.idRegistro === idRegistro);
            if (prestamoIndex === -1) return;
            const prestamo = prestamos[emailEstudiante][prestamoIndex];
            const esATiempo = new Date() <= new Date(prestamo.fechaDevolucion);
            const danado = confirm('¿El libro se devuelve dañado o roto?'); // Prompt para admin
            if (danado) {
                prestamo.danado = true;
                aplicarPuntos(emailEstudiante, -20, 'Libro devuelto dañado');
                showToast(`Libro marcado como devuelto (dañado) para ${emailEstudiante}. (-20 pts por daño)`, 'warning');
            } else if (esATiempo) {
                aplicarPuntos(emailEstudiante, 10, 'Devolución a tiempo');
                showToast(`Libro marcado como devuelto a tiempo para ${emailEstudiante}. (+10 pts por puntualidad)`, 'success');
            } else {
                // Penalización por retraso ya aplicada en cargarPerfil()
                showToast(`Libro marcado como devuelto (retrasado) para ${emailEstudiante}.`, 'warning');
            }
            prestamo.devuelto = true;
            guardarDatos();
            const libro = catalogo.find(l => l.idRegistro === idRegistro);
            if (libro) libro.disponible = true;
            updateNotificationBadge();
            showAdminTab('tareas');
            if (document.getElementById('searchModal').style.display === 'block') {
                buscarLibros();
            }
        }
        function anularReserva(emailEstudiante, idRegistro, titulo) {
            const reservaIndex = (reservas[emailEstudiante] || []).findIndex(r => r.idRegistro === idRegistro);
            if (reservaIndex === -1) return;
            reservas[emailEstudiante].splice(reservaIndex, 1);
            guardarDatos();
            const libro = catalogo.find(l => l.idRegistro === idRegistro);
            if (libro) libro.disponible = true;
            showToast(`Reserva anulada para ${titulo}.`, 'warning');
            updateNotificationBadge();
            if (emailSesion === EMAIL_ADMIN) {
                showAdminTab('tareas');
            } else {
                cargarPerfil();
            }
            if (document.getElementById('searchModal').style.display === 'block') {
                buscarLibros();
            }
        }
        function cargarApprovedEmails() {
            let emailsData = approvedEmails.map(email => {
                const totalPrestados = (prestamos[email] || []).length;
                const reservasCount = (reservas[email] || []).length;
                const porDevolver = (prestamos[email] || []).filter(p => !p.devuelto).length;
                const retrasados = (prestamos[email] || []).filter(p => !p.devuelto && new Date() > new Date(p.fechaDevolucion)).length;
                // Gamificación: Calcular rango lector
                const progreso = userProgress[email] || { puntos: 0 };
                const nivelData = calcularNivel(progreso.puntos);
                return {email, prestados: totalPrestados, reservas: reservasCount, porDevolver, retrasados, rango: nivelData.nombre};
            });
            const search = document.getElementById('emailSearch').value.toLowerCase().trim();
            if (search) {
                emailsData = emailsData.filter(data => data.email.toLowerCase().includes(search));
            }
            emailsData.sort((a, b) => {
                let valueA = a[sortColumnEmails];
                let valueB = b[sortColumnEmails];
                if (typeof valueA === 'string') valueA = valueA.toLowerCase();
                if (typeof valueB === 'string') valueB = valueB.toLowerCase();
                if (valueA < valueB) return sortDirectionEmails === 'asc' ? -1 : 1;
                if (valueA > valueB) return sortDirectionEmails === 'asc' ? 1 : -1;
                return 0;
            });
            const pageSize = 25;
            const totalPages = Math.ceil(emailsData.length / pageSize) || 1;
            const start = (currentPageEmails - 1) * pageSize;
            const end = start + pageSize;
            const paginatedEmails = emailsData.slice(start, end);
            const paginationHtml = `
                <button ${currentPageEmails === 1 ? 'disabled' : ''} onclick="changePageEmails(${currentPageEmails - 1})">&lt;</button>
                <span>Página ${currentPageEmails}/${totalPages}</span>
                <button ${currentPageEmails === totalPages ? 'disabled' : ''} onclick="changePageEmails(${currentPageEmails + 1})">&gt;</button>
            `;
            document.getElementById('approvedEmailPaginationTop').innerHTML = paginationHtml;
            document.getElementById('approvedEmailPaginationBottom').innerHTML = paginationHtml;
            const listTbody = document.getElementById('approvedEmailList');
            listTbody.innerHTML = paginatedEmails.length > 0 ? paginatedEmails.map(data => `
                <tr>
                    <td><input type="checkbox" value="${data.email}"> ${data.email}</td>
                    <td>${data.prestados}</td>
                    <td>${data.reservas}</td>
                    <td>${data.porDevolver}</td>
                    <td>${data.retrasados}</td>
                    <td><span style="font-weight: bold; color: var(--btn-primary);">${data.rango}</span></td>
                    <td><button onclick="deleteEmail('${data.email}')">Eliminar</button></td>
                </tr>
            `).join('') : '<tr><td colspan="7">No hay correos aprobados.</td></tr>';
            document.querySelectorAll('#approvedEmailTable th').forEach(th => {
                th.classList.remove('asc', 'desc');
                if (th.getAttribute('onclick').includes(sortColumnEmails)) {
                    th.classList.add(sortDirectionEmails);
                }
            });
        }
        function addEmail() {
            const newEmail = document.getElementById('newEmail').value.trim();
            if (newEmail && newEmail.endsWith('@educa.madrid.org') && !approvedEmails.includes(newEmail)) {
                approvedEmails.push(newEmail);
                guardarDatos();
                cargarApprovedEmails();
                document.getElementById('newEmail').value = '';
                showToast('Correo agregado correctamente.', 'success');
            } else {
                showToast('Email inválido, ya agregado o no termina en @educa.madrid.org.', 'warning');
            }
        }
        function detectDelimiter(content) {
            const lines = content.split('\n').filter(line => line.trim());
            if (lines.length === 0) return ',';
            const firstLine = lines[0].trim();
            const commaCount = (firstLine.match(/,/g) || []).length;
            const semicolonCount = (firstLine.match(/;/g) || []).length;
            const delimiter = semicolonCount > commaCount ? ';' : ',';
            console.log(`Delimitador detectado: ${delimiter} (comas: ${commaCount}, puntos y coma: ${semicolonCount})`);
            return delimiter;
        }
        function parseEmailsFromSheet(worksheet, rawContent = null) {
            let jsonData;
            try {
                jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: '' });
            } catch (e) {
                console.error('Error en parseo XLSX:', e);
                throw new Error('Error al parsear el archivo. Verifica el formato.');
            }
            if (jsonData.length === 0) return [];
            if (jsonData[0].length <= 1 && rawContent) {
                console.log('Detectado archivo con 1 columna. Usando parseo manual...');
                const delimiter = detectDelimiter(rawContent);
                const lines = rawContent.split('\n').filter(line => line.trim());
                if (lines.length < 2) return [];
                const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
                jsonData = lines.slice(1).map(line => line.split(delimiter).map(cell => cell.trim().replace(/"/g, '')));
                console.log(`Parseo manual exitoso. Headers: ${headers.length}, filas: ${jsonData.length}`);
            }
            const headerRow = jsonData[0];
            const emailColIndex = headerRow.findIndex(header =>
                header && header.toString().toLowerCase().includes('correo') && header.toString().toLowerCase().includes('electronico')
            );
            if (emailColIndex === -1) {
                throw new Error('No se encontró la columna "Correo Electrónico" (o similar). Headers detectados: ' + headerRow.join(', '));
            }
            console.log(`Columna de email encontrada en índice: ${emailColIndex} ("${headerRow[emailColIndex]}")`);
            const emails = [];
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length <= emailColIndex) continue;
                const emailCell = row[emailColIndex].toString().trim();
                if (emailCell && emailCell.endsWith('@educa.madrid.org') && !emails.includes(emailCell)) {
                    emails.push(emailCell);
                }
            }
            console.log(`Emails extraídos y filtrados: ${emails.length} únicos (de ${jsonData.length - 1} filas)`);
            return emails;
        }
        function importEmails() {
            const fileInput = document.getElementById('emailFile');
            const file = fileInput.files[0];
            if (!file) {
                showToast('Por favor, selecciona un archivo.', 'warning');
                return;
            }
            const extension = file.name.split('.').pop().toLowerCase();
            if (!['csv', 'xlsx'].includes(extension)) {
                showToast('Solo se aceptan archivos CSV o XLSX.', 'warning');
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    let workbook, worksheet, rawContent = null;
                    if (extension === 'csv') {
                        rawContent = e.target.result;
                        const delimiter = detectDelimiter(rawContent);
                        let csvContent = rawContent;
                        if (delimiter === ';') {
                            csvContent = rawContent.replace(/;/g, ',');
                            console.log('Reemplazando ; por , para compatibilidad con XLSX.');
                        }
                        workbook = XLSX.read(csvContent, { type: 'string' });
                    } else {
                        const base64 = e.target.result.split(',')[1];
                        workbook = XLSX.read(base64, { type: 'base64' });
                    }
                    const firstSheetName = workbook.SheetNames[0];
                    worksheet = workbook.Sheets[firstSheetName];
                    const emails = parseEmailsFromSheet(worksheet, extension === 'csv' ? rawContent : null);
                    if (emails.length === 0) {
                        showToast('No se encontraron correos válidos (@educa.madrid.org) en el archivo.', 'warning');
                        return;
                    }
                    const nuevos = emails.filter(email => !approvedEmails.includes(email));
                    if (nuevos.length === 0) {
                        showToast('Todos los correos ya están en la lista aprobada.', 'warning');
                        return;
                    }
                    approvedEmails.push(...nuevos);
                    guardarDatos();
                    cargarApprovedEmails();
                    fileInput.value = '';
                    showToast(`${nuevos.length} correos nuevos agregados correctamente. Total en lista: ${approvedEmails.length}`, 'success');
                } catch (error) {
                    console.error('Error al procesar archivo:', error);
                    showToast(`Error al procesar el archivo: ${error.message}\n\nConsejo: Asegúrate de que el CSV use comas (,) o punto y coma (;) como separadores, y que tenga la columna "Correo Electrónico".`, 'error');
                }
            };
            reader.onerror = function() {
                showToast('Error al leer el archivo. Intenta con otro formato o verifica el encoding (UTF-8).', 'error');
            };
            if (extension === 'csv') {
                reader.readAsText(file, 'UTF-8');
            } else {
                reader.readAsDataURL(file);
            }
        }
        function deleteEmail(email) {
            if (confirm('¿Está seguro que desea eliminar el correo seleccionado?')) {
                approvedEmails = approvedEmails.filter(e => e !== email);
                guardarDatos();
                cargarApprovedEmails();
                showToast('Correo eliminado.', 'success');
            }
        }
        function deleteSelectedEmails() {
            const checkboxes = document.querySelectorAll('#approvedEmailList input[type="checkbox"]:checked');
            if (checkboxes.length === 0) {
                showToast('No hay correos seleccionados.', 'warning');
                return;
            }
            if (confirm(`¿Está seguro que desea eliminar TODOS los correos seleccionados? (${checkboxes.length} correos)`)) {
                checkboxes.forEach(checkbox => {
                    const email = checkbox.value;
                    approvedEmails = approvedEmails.filter(e => e !== email);
                });
                guardarDatos();
                cargarApprovedEmails();
                showToast(`${checkboxes.length} correos eliminados.`, 'success');
            }
        }
        function selectAllEmails() {
            const checkboxes = document.querySelectorAll('#approvedEmailList input[type="checkbox"]');
            checkboxes.forEach(checkbox => checkbox.checked = true);
        }
        function deselectAllEmails() {
            const checkboxes = document.querySelectorAll('#approvedEmailList input[type="checkbox"]');
            checkboxes.forEach(checkbox => checkbox.checked = false);
        }
        function filterEmails() {
            currentPageEmails = 1;
            cargarApprovedEmails();
        }
        function ordenarCorreos(column) {
            if (sortColumnEmails === column) {
                sortDirectionEmails = sortDirectionEmails === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumnEmails = column;
                sortDirectionEmails = 'asc';
            }
            currentPageEmails = 1;
            cargarApprovedEmails();
        }
        function ordenarHistorial(column) {
            if (sortColumn === column) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = column;
                sortDirection = 'asc';
            }
            currentPageHistorial = 1;
            showAdminTab('historial');
        }
        function reservarLibro(idRegistro, titulo) {
            if (!emailSesion || emailSesion === EMAIL_ADMIN) return;
            cargarDatos();
            if (!reservas[emailSesion]) reservas[emailSesion] = [];
            if (!prestamos[emailSesion]) prestamos[emailSesion] = [];
            const tieneRetrasados = prestamos[emailSesion].some(p => new Date() > new Date(p.fechaDevolucion) && !p.devuelto);
            if (tieneRetrasados) {
                showToast('No puedes reservar más libros hasta que devuelvas los libros retrasados.', 'warning');
                return;
            }
            if (reservas[emailSesion].length >= 3) {
                showToast('Solo puedes reservar un máximo de 3 libros.', 'warning');
                return;
            }
            const libro = catalogo.find(l => l.idRegistro === idRegistro);
            if (!libro || !libro.disponible) return;
            const fechaReserva = new Date().toISOString();
            reservas[emailSesion].push({idRegistro, fechaReserva, titulo});
            // Gamificación: No se otorgan puntos aquí (se unifican en recoger)
            libro.disponible = false;
            guardarDatos();
            showToast(`¡Reservado! Te quedan ${3 - reservas[emailSesion].length} reservas. Los puntos se otorgan al recoger el libro.`, 'success');
            updateNotificationBadge();
            cargarPerfil();
            if (document.getElementById('searchModal').style.display === 'block') {
                mostrarResultadosModal();
            }
        }
        async function cargarCatalogo() {
            try {
                const response = await fetch('Ejemplares.xml');
                if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
                const xmlText = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                    throw new Error('Error al parsear XML.');
                }
                const libros = {};
                Array.from(xmlDoc.getElementsByTagName('Libro')).forEach(libro => {
                    const idDocumento = libro.getAttribute('id_documento');
                    libros[idDocumento] = {
                        titulo: libro.getElementsByTagName('Titulo')[0]?.textContent || 'Sin título',
                        autor: libro.getElementsByTagName('Autor')[0]?.textContent || 'Desconocido',
                        categoria: libro.getElementsByTagName('Descriptor')[0]?.textContent || 'No disponible',
                        fechaEdicion: libro.getElementsByTagName('FechaEdicion')[0]?.textContent || 'No disponible'
                    };
                });
                catalogo = Array.from(xmlDoc.getElementsByTagName('Ejemplar')).map(ejemplar => {
                    const idRegistro = ejemplar.getAttribute('IdRegistro') || '';
                    const libro = libros[idRegistro] || {};
                    return {
                        titulo: libro.titulo || 'Sin título',
                        autor: libro.autor || 'Desconocido',
                        categoria: libro.categoria || 'No disponible',
                        fechaEdicion: libro.fechaEdicion || 'No disponible',
                        signatura: `${ejemplar.getAttribute('Signatura1') || ''} ${ejemplar.getAttribute('Signatura2') || ''} ${ejemplar.getAttribute('Signatura3') || ''}`.trim(),
                        isbn: ejemplar.getAttribute('ISBN') || 'No disponible',
                        fecha: ejemplar.getAttribute('Fecha') || 'No disponible',
                        disponible: ejemplar.getAttribute('Estado') === '0',
                        idRegistro: idRegistro
                    };
                });
                Object.values(reservas).flat().forEach(r => {
                    const libro = catalogo.find(l => l.idRegistro === r.idRegistro);
                    if (libro) libro.disponible = false;
                });
                Object.values(prestamos).flat().filter(p => !p.devuelto).forEach(p => {
                    const libro = catalogo.find(l => l.idRegistro === p.idRegistro);
                    if (libro) libro.disponible = false;
                });
                actualizarSugerenciasBusqueda();
            } catch (error) {
                console.error('Error al cargar:', error);
                catalogo = [];
                showToast('Catálogo en mantenimiento. Intenta más tarde.', 'warning');
            }
        }
        function buscarLibros() {
            if (!emailSesion) return;
            if (!catalogo.length) {
                showToast('Catálogo en mantenimiento. Intenta más tarde.', 'warning');
                return;
            }
            const query = document.getElementById('buscarInput').value.toLowerCase().trim();
            if (!query) {
                showToast('Por favor, introduce un término de búsqueda.', 'warning');
                return;
            }
            searchQuery = query;
            searchResults = catalogo.filter(libro =>
                libro.titulo.toLowerCase().includes(query) ||
                libro.autor.toLowerCase().includes(query) ||
                libro.categoria.toLowerCase().includes(query) ||
                libro.signatura.toLowerCase().includes(query) ||
                libro.isbn.toLowerCase().includes(query)
            );
            searchResults.sort((a, b) => (b.disponible ? 1 : 0) - (a.disponible ? 1 : 0));
            currentPageSearch = 1;
            if (searchResults.length > 0) {
                abrirModal();
                mostrarResultadosModal();
            } else {
                showToast('No se encontraron libros.', 'warning');
            }
        }
        function abrirModal() {
            document.getElementById('searchModal').style.display = 'block';
        }
        function cerrarModal() {
            document.getElementById('searchModal').style.display = 'none';
        }
        function mostrarResultadosModal() {
            const pageSize = 5;
            const totalPages = Math.ceil(searchResults.length / pageSize);
            const start = (currentPageSearch - 1) * pageSize;
            const end = start + pageSize;
            const paginatedResults = searchResults.slice(start, end);
            const conteoDiv = document.getElementById('conteoResultadosModal');
            const resultadosDiv = document.getElementById('resultadosModal');
            const paginationDiv = document.getElementById('searchPagination');
            const esAdmin = emailSesion === EMAIL_ADMIN;
            const textoConteo = `${searchResults.length} resultados para "${searchQuery}"`;
            conteoDiv.innerHTML = `<p>${textoConteo}</p>`;
            resultadosDiv.innerHTML = paginatedResults.map(libro => {
                const tejuelo = libro.signatura.replace(/\s+/g, '-');
                const colorFranja = libro.disponible ? 'franja-verde' : 'franja-roja';
                let estadoHtml = '';
                if (libro.disponible) {
                    if (!esAdmin) {
                        estadoHtml = `<button class="btn-reserva" onclick="reservarLibro('${libro.idRegistro}', '${libro.titulo.replace(/'/g, "\\'")}')">Reservar</button>`;
                    } else {
                        estadoHtml = 'Sí';
                    }
                } else {
                    let esReserva = false;
                    let emailReserva = null;
                    let emailPrestamo = null;
                    Object.keys(reservas).some(email => {
                        const r = reservas[email].find(rr => rr.idRegistro === libro.idRegistro);
                        if (r) {
                            esReserva = true;
                            emailReserva = email;
                            return true;
                        }
                    });
                    if (!esReserva) {
                        Object.keys(prestamos).some(email => {
                            const p = prestamos[email].find(pp => pp.idRegistro === libro.idRegistro && !pp.devuelto);
                            if (p) {
                                emailPrestamo = email;
                                return true;
                            }
                        });
                    }
                    if (esAdmin) {
                        if (esReserva) {
                            estadoHtml = `<span class="estado-reservado">Reservado por ${emailReserva}</span> <button class="btn-recoger" onclick="adminRecogerLibro('${emailReserva}', '${libro.idRegistro}', '${libro.titulo.replace(/'/g, "\\'")}')">Recoger</button> <button class="btn-anular" onclick="anularReserva('${emailReserva}', '${libro.idRegistro}', '${libro.titulo.replace(/'/g, "\\'")}')">Anular</button>`;
                        } else if (emailPrestamo) {
                            estadoHtml = `<span class="estado-no-disponible">Prestado a ${emailPrestamo}</span> <button class="btn-devolver" onclick="adminDevolverLibro('${emailPrestamo}', '${libro.idRegistro}', '${libro.titulo.replace(/'/g, "\\'")}')">Devolver</button>`;
                        } else {
                            estadoHtml = '<span class="estado-no-disponible">No disponible</span>';
                        }
                    } else {
                        estadoHtml = `<span class="estado-reservado">No disponible</span>`;
                    }
                }
                return `
                    <div class="libro-modal">
                        <div class="franja ${colorFranja}"></div>
                        <div class="contenido-modal">
                            <p><strong>Título:</strong> ${libro.titulo}</p>
                            <p><strong>Autor:</strong> ${libro.autor}</p>
                            <p><strong>Categoría:</strong> ${libro.categoria}</p>
                            <p><strong>Tejuelo:</strong> <span class="tejuelo">${tejuelo}</span></p>
                            <p><strong>Disponible:</strong> ${estadoHtml}</p>
                        </div>
                    </div>
                `;
            }).join('') || '<p>No hay libros en esta página.</p>';
            const paginationHtml = `
                <button ${currentPageSearch === 1 ? 'disabled' : ''} onclick="changePageSearch(${currentPageSearch - 1})">&lt;</button>
                <span>Página ${currentPageSearch}/${totalPages}</span>
                <button ${currentPageSearch === totalPages ? 'disabled' : ''} onclick="changePageSearch(${currentPageSearch + 1})">&gt;</button>
            `;
            paginationDiv.innerHTML = paginationHtml;
        }
        function changePageSearch(newPage) {
            currentPageSearch = newPage;
            mostrarResultadosModal();
        }
        window.onclick = function(event) {
            const searchModal = document.getElementById('searchModal');
            const solicitudesModal = document.getElementById('solicitudesModal');
            const reseñasModal = document.getElementById('reseñasModal');
            const lecturasPrestadasModal = document.getElementById('lecturasMasPrestadasModal');
            const progresoModal = document.getElementById('progresoModal');
            const colorModal = document.getElementById('colorModal');
            if (event.target === searchModal) {
                cerrarModal();
            } else if (event.target === solicitudesModal) {
                cerrarModalSolicitudes();
            } else if (event.target === reseñasModal) {
                cerrarModalReseñas();
            } else if (event.target === lecturasPrestadasModal) {
                cerrarModalLecturasPrestadas();
            } else if (event.target === progresoModal) {
                cerrarModalProgreso();
            } else if (event.target === colorModal) {
                closeColorModal();
            }
        }
        async function enviarMensaje() {
            if (!emailSesion) return;
            const input = document.getElementById('chatInput');
            const mensaje = input.value.trim();
            if (!mensaje) return;
            agregarMensaje(mensaje, 'user');
            input.value = '';
            let respuesta = '';
            const esAdmin = emailSesion === EMAIL_ADMIN;
            const mensajeLower = mensaje.toLowerCase();
            if (mensajeLower.includes('perfil') || mensajeLower.includes('mis libros')) {
                respuesta = esAdmin ? 'Como administrador, usa el botón ADMIN para ver el historial de reservas y préstamos.' : 'Ve a "Mi Perfil" para ver tus reservas y préstamos.';
            } else if (mensajeLower.includes('reservar')) {
                respuesta = 'Busca un libro disponible y haz clic en "Reservar". El administrador confirmará la recogida.';
            } else {
                respuesta = `Hola ${esAdmin ? '(Administrador)' : ''}, ¿en qué te ayudo? Prueba con "perfil" o "reservar".`;
            }
            setTimeout(() => agregarMensaje(respuesta, 'bot'), 1000);
        }
        function agregarMensaje(texto, tipo) {
            const div = document.getElementById('chatMensajes');
            const p = document.createElement('p');
            p.className = `mensaje ${tipo}`;
            p.textContent = texto;
            div.appendChild(p);
            div.scrollTop = div.scrollHeight;
        }
        async function initApp() {
            // FIX: Cargar tema INMEDIATAMENTE para que splash herede data-theme y CSS vars
            loadTheme();
            await cargarDatos();
            const emailSesionGuardada = sessionStorage.getItem('emailSesion');
            if (emailSesionGuardada) {
                emailSesion = emailSesionGuardada;
                document.getElementById('adminBadge').style.display = 'none'; // Siempre oculto
                document.getElementById('loginSection').style.display = 'none';
                document.getElementById('app').style.display = 'block';
                if (emailSesion === EMAIL_ADMIN) {
                    document.getElementById('seccionIzquierda').style.display = 'none';
                    document.getElementById('seccionDerecha').style.display = 'none';
                    document.getElementById('adminHistorial').style.display = 'block';
                    document.getElementById('btnSolicitudes').style.display = 'none';
                    document.getElementById('btnReseñas').style.display = 'none';
                    document.getElementById('btnLecturasPrestadas').style.display = 'none';
                    updateNotificationBadge();
                    showAdminTab('tareas');
                } else {
                    document.getElementById('seccionIzquierda').style.display = 'block';
                    document.getElementById('seccionDerecha').style.display = 'block';
                    document.getElementById('adminHistorial').style.display = 'none';
                    document.getElementById('btnSolicitudes').style.display = 'inline-block';
                    document.getElementById('btnReseñas').style.display = 'inline-block';
                    document.getElementById('btnLecturasPrestadas').style.display = 'inline-block';
                    inicializarProgreso(emailSesion); // Gamificación
                    cargarPerfil();
                }
                cargarCatalogo();
            }
            // Nuevo: Event listener para cerrar modales con tecla ESC
            document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape') {
                    if (document.getElementById('searchModal').style.display === 'block') {
                        cerrarModal();
                    } else if (document.getElementById('solicitudesModal').style.display === 'block') {
                        cerrarModalSolicitudes();
                    } else if (document.getElementById('reseñasModal').style.display === 'block') {
                        cerrarModalReseñas();
                    } else if (document.getElementById('lecturasMasPrestadasModal').style.display === 'block') {
                        cerrarModalLecturasPrestadas();
                    } else if (document.getElementById('progresoModal').style.display === 'block') {
                        cerrarModalProgreso();
                    } else if (document.getElementById('colorModal').style.display === 'block') {
                        closeColorModal();
                    }
                }
            });
            setTimeout(function() {
                const splash = document.getElementById('splash');
                splash.classList.add('hidden');
                setTimeout(function() { splash.remove(); }, 500);
            }, 3000);
        }
        initApp();
    