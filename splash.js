// Lógica para splash (timeout en initApp, pero separada para "splash")
function hideSplash() {
    const splash = document.getElementById('splash');
    splash.classList.add('hidden');
    setTimeout(function() { splash.remove(); }, 500);
}