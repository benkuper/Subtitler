export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "nexus/_app",
	assets: new Set(["audio.mp3","en.srt","en.svg","fr.srt","fr.svg"]),
	mimeTypes: {".mp3":"audio/mpeg",".svg":"image/svg+xml"},
	_: {
		client: {start:"_app/immutable/entry/start.CPrJFV9X.js",app:"_app/immutable/entry/app.DCAhOBX1.js",imports:["_app/immutable/entry/start.CPrJFV9X.js","_app/immutable/chunks/1YXCbITI.js","_app/immutable/chunks/dOeU2Dz2.js","_app/immutable/chunks/CJvOJxjW.js","_app/immutable/chunks/DvfvaIa_.js","_app/immutable/entry/app.DCAhOBX1.js","_app/immutable/chunks/dOeU2Dz2.js","_app/immutable/chunks/jNJEqFYZ.js","_app/immutable/chunks/CQYZu0vz.js","_app/immutable/chunks/DvfvaIa_.js","_app/immutable/chunks/DfxlhxRc.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
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
