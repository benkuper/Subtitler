import * as universal from '../entries/pages/_layout.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { universal };
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.CMpxo9FV.js","_app/immutable/chunks/CQYZu0vz.js","_app/immutable/chunks/dOeU2Dz2.js","_app/immutable/chunks/DZeF_nfd.js"];
export const stylesheets = ["_app/immutable/assets/0.CdfoMdhW.css"];
export const fonts = [];
