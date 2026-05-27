import { J as attr_class, P as escape_html, G as attr, Y as head } from "../../chunks/renderer.js";
import "partysocket";
import { c as base } from "../../chunks/server.js";
import "../../chunks/url.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/root.js";
function SubtitleScreen($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let isConnected = false;
    let displayText = "";
    let selectedLanguage = "fr";
    let audioDescriptionEnabled = false;
    $$renderer2.push(`<div class="container svelte-dtdqkg"><div class="top-bar svelte-dtdqkg"><div class="status-bar svelte-dtdqkg"><div${attr_class("status-dot svelte-dtdqkg", void 0, { "connected": isConnected })}></div> <span class="status-text">${escape_html("Reconnexion...")}</span></div> <div class="menu-bar svelte-dtdqkg" aria-label="Language and audio menu"><button type="button"${attr_class("menu-item svelte-dtdqkg", void 0, { "active": selectedLanguage === "fr" })}${attr("aria-pressed", selectedLanguage === "fr")} aria-label="French subtitles"><img class="menu-flag svelte-dtdqkg"${attr("src", `${base}/fr.svg`)} alt="" aria-hidden="true"/></button> <button type="button"${attr_class("menu-item svelte-dtdqkg", void 0, { "active": selectedLanguage === "en" })}${attr("aria-pressed", selectedLanguage === "en")} aria-label="English subtitles"><img class="menu-flag svelte-dtdqkg"${attr("src", `${base}/en.svg`)} alt="" aria-hidden="true"/></button> <button type="button"${attr_class("menu-item svelte-dtdqkg", void 0, { "active": audioDescriptionEnabled })}${attr("aria-pressed", audioDescriptionEnabled)}><span class="menu-icon svelte-dtdqkg">🔊 AD</span></button></div></div> <div class="subtitle-viewport svelte-dtdqkg"><p class="subtitle-text svelte-dtdqkg">${escape_html(displayText)}</p></div></div>`);
  });
}
function _page($$renderer) {
  head("1uha8ag", $$renderer, ($$renderer2) => {
    $$renderer2.title(($$renderer3) => {
      $$renderer3.push(`<title>Outdoor Subtitles</title>`);
    });
  });
  SubtitleScreen($$renderer);
}
export {
  _page as default
};
