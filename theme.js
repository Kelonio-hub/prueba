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