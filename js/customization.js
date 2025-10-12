import { showToast, sanitizeInput } from './utils.js';

export function applyCustomColors(colors) {
    const root = document.documentElement;
    colors.fondo = sanitizeInput(colors.fondo || '#f5f5f5');
    colors.texto = sanitizeInput(colors.texto || '#333');
    colors.primario = sanitizeInput(colors.primario || '#007bff');

    root.style.setProperty('--color-fondo', colors.fondo);
    root.style.setProperty('--color-texto', colors.texto);
    root.style.setProperty('--color-primario', colors.primario);
    localStorage.setItem('customColors', JSON.stringify(colors));
}

export function initColorCustomization() {
    document.getElementById('colorForm').addEventListener('submit', e => {
        e.preventDefault();
        const colors = {
            fondo: document.getElementById('colorFondo').value,
            texto: document.getElementById('colorTexto').value,
            primario: document.getElementById('colorPrimario').value
        };
        applyCustomColors(colors);
        showToast('Colores aplicados', 'success');
    });

    // Actualizar vista previa en tiempo real
    document.querySelectorAll('#colorForm input[type="color"]').forEach(input => {
        input.addEventListener('input', () => {
            const colors = {
                fondo: document.getElementById('colorFondo').value,
                texto: document.getElementById('colorTexto').value,
                primario: document.getElementById('colorPrimario').value
            };
            applyCustomColors(colors);
        });
    });
}