// Shared by the server layout and the client theme hook, so no "use client" here.
export const THEME_STORAGE_KEY = "signoff-theme"

/**
 * Runs in <head> before first paint (see app/layout.tsx), so a saved light theme
 * never flashes dark. Dark stays the default.
 */
export const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="light")document.documentElement.classList.remove("dark")}catch(e){}})()`
