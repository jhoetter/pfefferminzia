// The checked-in React workspace preloads tariffs on every page. At Drill 8
// the server keeps denying that API; the browser sees an empty list instead
// of a misleading startup error for a view that is not yet available.
if (window.PFEFFERMINZIA_STAGE === 8) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const path = new URL(typeof input === "string" ? input : input.url, location.href).pathname;
    const method = (init?.method || (typeof input === "string" ? "GET" : input.method) || "GET").toUpperCase();
    if (method === "GET" && path === "/api/tariffs") {
      return Promise.resolve(new Response("[]", { headers: { "Content-Type": "application/json" } }));
    }
    return originalFetch(input, init);
  };
}
