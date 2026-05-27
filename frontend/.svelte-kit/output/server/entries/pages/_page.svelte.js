import { G as attr, J as attr_class, P as escape_html, Y as head } from "../../chunks/renderer.js";
import "partysocket";
import { c as base } from "../../chunks/server.js";
import "../../chunks/url.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/root.js";
function SubtitleScreen($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let isConnected = false;
    let renderedSubtitleText = "";
    let subtitleVisible = false;
    let selectedLanguage = "fr";
    let audioDescriptionEnabled = false;
    let relayHostLabel = "";
    let roomNameLabel = "";
    let isFullscreen = false;
    $$renderer2.push(`<div class="container svelte-dtdqkg"><img class="background-image svelte-dtdqkg"${attr("src", `${base}/bg.png`)} alt="" aria-hidden="true"/> <div class="top-bar svelte-dtdqkg"><div class="status-bar svelte-dtdqkg"><div${attr_class("status-dot svelte-dtdqkg", void 0, { "connected": isConnected })}></div> <span class="status-text">${escape_html("Reconnexion...")}</span> <span class="relay-label svelte-dtdqkg">${escape_html(relayHostLabel)}/${escape_html(roomNameLabel)}</span> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="menu-bar svelte-dtdqkg" aria-label="Language and audio menu"><button type="button"${attr_class("menu-item svelte-dtdqkg", void 0, { "active": selectedLanguage === "fr" })}${attr("aria-pressed", selectedLanguage === "fr")} aria-label="French subtitles"><img class="menu-flag svelte-dtdqkg"${attr("src", `${base}/fr.svg`)} alt="" aria-hidden="true"/></button> <button type="button"${attr_class("menu-item svelte-dtdqkg", void 0, { "active": selectedLanguage === "en" })}${attr("aria-pressed", selectedLanguage === "en")} aria-label="English subtitles"><img class="menu-flag svelte-dtdqkg"${attr("src", `${base}/en.svg`)} alt="" aria-hidden="true"/></button> <button type="button"${attr_class("menu-item svelte-dtdqkg", void 0, { "active": audioDescriptionEnabled })}${attr("aria-pressed", audioDescriptionEnabled)}><span class="menu-icon svelte-dtdqkg">🔊 AD</span></button> <button type="button"${attr_class("menu-item svelte-dtdqkg", void 0, { "active": isFullscreen })}${attr("aria-pressed", isFullscreen)}${attr("aria-label", "Enter fullscreen")}><svg class="menu-svg svelte-dtdqkg" viewBox="0 0 24 24" aria-hidden="true">`);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<path d="M3 8V5a2 2 0 0 1 2-2h3"></path><path d="M16 3h3a2 2 0 0 1 2 2v3"></path><path d="M21 16v3a2 2 0 0 1-2 2h-3"></path><path d="M8 21H5a2 2 0 0 1-2-2v-3"></path>`);
    }
    $$renderer2.push(`<!--]--></svg></button></div></div> <div class="subtitle-viewport svelte-dtdqkg"><p${attr_class("subtitle-text svelte-dtdqkg", void 0, { "visible": subtitleVisible })}>${escape_html(renderedSubtitleText)}</p></div> <img class="bottom-logo svelte-dtdqkg"${attr("src", `${base}/logo.png`)} alt="" aria-hidden="true"/></div>`);
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
