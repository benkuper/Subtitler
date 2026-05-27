import { G as attr, P as escape_html, Y as head } from "../../../chunks/renderer.js";
import "qrcode";
import "../../../chunks/url.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
function QrScreen($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let subtitleUrl = "";
    let qrPagePath = "";
    $$renderer2.push(`<div class="qr-container svelte-14qdn8d"><h1 class="qr-title svelte-14qdn8d">Scan for Live Subtitles</h1> <p class="qr-subtitle svelte-14qdn8d">Open this link on your phone:</p> `);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<p class="qr-loading svelte-14qdn8d">Generating QR code...</p>`);
    }
    $$renderer2.push(`<!--]--> <a class="qr-link svelte-14qdn8d"${attr("href", subtitleUrl)}>${escape_html(subtitleUrl)}</a> <p class="qr-note svelte-14qdn8d">This page is available at ${escape_html(qrPagePath)}</p></div>`);
  });
}
function _page($$renderer) {
  head("13t2k2w", $$renderer, ($$renderer2) => {
    $$renderer2.title(($$renderer3) => {
      $$renderer3.push(`<title>Outdoor Subtitles QR</title>`);
    });
  });
  QrScreen($$renderer);
}
export {
  _page as default
};
