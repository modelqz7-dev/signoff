// Shared by the server layout and the client theme hook, so no "use client" here.
export const THEME_STORAGE_KEY = "signoff-theme"

/** The signed-in app's pages, which wear the home page's look (the `app` class, see globals.css). */
export const APP_PATHS = "^/(dashboard|board|orders|link|requests|plan|portal|clients|services|online)(/|$)"

/** Pages clients open from a link: light unless they picked dark themselves. */
export const CLIENT_PATHS = "^/(plan|portal|p|catalog|me)(/|$)|^/@"

/**
 * Runs in <head> before first paint (see app/layout.tsx), so a saved light theme
 * never flashes dark, and app pages get their look before they show. Dark stays the default,
 * except on the pages clients open, which start light.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||(!t&&new RegExp("${CLIENT_PATHS}").test(location.pathname)))document.documentElement.classList.remove("dark")}catch(e){}try{if(new RegExp("${APP_PATHS}").test(location.pathname))document.documentElement.classList.add("app")}catch(e){}})()`
