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