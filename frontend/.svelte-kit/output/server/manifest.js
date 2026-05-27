export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "nexus/_app",
	assets: new Set(["audio.mp3","bg.png","en.srt","en.svg","fr.srt","fr.svg","logo.png"]),
	mimeTypes: {".mp3":"audio/mpeg",".png":"image/png",".svg":"image/svg+xml"},
	_: {
		client: {start:"_app/immutable/entry/start.D2Mgh4jY.js",app:"_app/immutable/entry/app.B3O8RZXK.js",imports:["_app/immutable/entry/start.D2Mgh4jY.js","_app/immutable/chunks/aGCvydCs.js","_app/immutable/chunks/dOeU2Dz2.js","_app/immutable/chunks/uf0DF_Z8.js","_app/immutable/chunks/DvfvaIa_.js","_app/immutable/entry/app.B3O8RZXK.js","_app/immutable/chunks/dOeU2Dz2.js","_app/immutable/chunks/Bkuw5dDX.js","_app/immutable/chunks/CNOc_EWZ.js","_app/immutable/chunks/DvfvaIa_.js","_app/immutable/chunks/DfxlhxRc.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js'))
		],
		remotes: {
			
		},
		routes: [
			
		],
		prerendered_routes: new Set(["/nexus/","/nexus/qr"]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
