export const THEME_STORAGE_KEY = "theme";

/**
 * Se ejecuta en <head> antes de pintar la página, para que no haya un "flash"
 * del tema equivocado al cargar. Vive fuera del componente cliente porque el
 * layout (Server Component) necesita el texto, no una referencia de cliente.
 */
export const themeScript = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
