// Next emits its hydration chunks as `<script async>` tags in <head>, so a
// browser fetches and evaluates them while the first rows are still being laid
// out. The content is complete without them: everything a visitor reads is
// server-rendered, and the pre-paint script in layout.tsx already applies saved
// preferences before first paint. Loading the chunks after the page has painted
// hands the slow-network bandwidth of the first second to the HTML and the
// font instead, and keeps the script downloads out of the Largest Contentful
// Paint dependency chain that Lighthouse simulates. Hydration starts one frame
// after `load` rather than in parallel with parsing.
//
// The rewrite itself happens in nginx (docker/nginx.conf), which already
// buffers every response: `deferChunkScripts` is the same literal substitution
// so tests can mirror it, and `DEFERRED_CHUNK_SUB_FILTER` is what the nginx
// `sub_filter` directive must contain. Local `pnpm run start` and the e2e
// fixture serve the untouched HTML, where the loader finds nothing to do.

export const DEFERRED_CHUNK_ATTR = "data-pl-defer";

export const DEFERRED_CHUNK_SUB_FILTER = {
  search: '<script src="/_next/static/chunks/',
  replace: `<script type="text/plain" ${DEFERRED_CHUNK_ATTR} src="/_next/static/chunks/`,
} as const;

export function deferChunkScripts(html: string): string {
  return html.replaceAll(
    DEFERRED_CHUNK_SUB_FILTER.search,
    DEFERRED_CHUNK_SUB_FILTER.replace
  );
}

// Runs at the first idle moment after `load`: by then parsing is complete and
// any style, layout, and paint work queued on the main thread has drained, so
// the rows are on screen before a chunk download begins. The idle timeout
// guarantees hydration in background tabs, and the longer timer covers a
// `load` held up by a stalled subresource.
export const deferredChunksLoaderScript = `(function(){
var done=false;
function go(){
  if(done)return;done=true;
  document.querySelectorAll("script[${DEFERRED_CHUNK_ATTR}]").forEach(function(s){
    var n=document.createElement("script");
    for(var i=0;i<s.attributes.length;i++){var a=s.attributes[i];if(a.name!=="type"&&a.name!=="${DEFERRED_CHUNK_ATTR}")n.setAttribute(a.name,a.value);}
    s.replaceWith(n);
  });
}
function whenIdle(){
  if(typeof requestIdleCallback==="function")requestIdleCallback(go,{timeout:2000});
  else setTimeout(go,50);
}
if(document.readyState==="complete")whenIdle();else addEventListener("load",whenIdle);
setTimeout(go,4000);
})();`;
