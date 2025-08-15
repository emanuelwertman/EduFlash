// js/router.js
const routes = {
  "/": { file: "static/pages/home.html", script: null },
  "/login": { file: "static/pages/login_signup.html", script: "static/js/login_signup.js" }, // e.g. "js/login.js"
  "/paths": { file: "static/pages/paths.html", script: "static/js/paths.js" },
  "/topics": { file: "static/pages/topic.html", script: "static/js/topic.js" },
  "/lessons": { file: "static/pages/lessons.html", script: "static/js/lessons.js" },
};

// Keep track of last page module <script> so we can remove it when navigating
let activePageScriptEl = null;

/** Normalize hash to a route key */
function getRouteFromHash() {
  // hash formats: "#/", "#/login", "" (default -> "/")
  const raw = location.hash.replace(/^#/, "");
  if (!raw || raw === "/") return "/";
  // ensure it starts with "/"
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  // Remove query parameters for route matching
  return withSlash.split('?')[0];
}

/** Update active state on nav links */
function setActiveNav(route) {
  document.querySelectorAll('[data-route]').forEach(a => {
    const href = a.getAttribute('href') || "";
    const target = href.replace(/^#/, "");
    const normalized = target.startsWith("/") ? target : `/${target}`;
    a.classList.toggle('active', normalized === route);
  });
}

/** Load route file and inject into #app */
async function render(route) {
  // Check for dynamic routes
  let cfg = routes[route] || null;
  let routeParams = {};
  
  // If exact route not found, check for dynamic routes
  if (!cfg && route.startsWith('/topics/')) {
    cfg = routes['/topics'];
    const pathId = route.split('/topics/')[1];
    routeParams.path = pathId;
  }

  setActiveNav(route);

  const app = document.getElementById("app");
  if (!cfg) {
    app.innerHTML = `<section class="container"><h1>404</h1><p>Page not found.</p></section>`;
    removeActivePageScript();
    return;
  }

  // Loading state
  app.innerHTML = `<div class="loading">Loading…</div>`;

  try {
    const res = await fetch(cfg.file, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const html = await res.text();
    app.innerHTML = html;

    // Optionally load per-page JS module if declared
    await loadPageScript(cfg.script);

    // Move focus for a11y
    const firstH1 = app.querySelector("h1, h2, [tabindex], a, button, input, textarea, select");
    (firstH1 || app).focus?.();
  } catch (err) {
    app.innerHTML = `<section class="container"><h1>Error</h1>
      <p>Could not load <code>${cfg.file}</code>.</p>
      <pre>${String(err)}</pre></section>`;
    removeActivePageScript();
  }
}

/** Load a page-specific ES module (if provided) and remove previous one */
async function loadPageScript(modulePath) {
  removeActivePageScript();
  if (!modulePath) return;

  // Dynamically add a <script type="module"> so it executes properly
  activePageScriptEl = document.createElement("script");
  activePageScriptEl.type = "module";
  activePageScriptEl.src = `${modulePath}?v=${Date.now()}`; // cache-bust in dev
  document.head.appendChild(activePageScriptEl);

  // Wait until it loads or errors
  await new Promise((resolve, reject) => {
    activePageScriptEl.addEventListener("load", resolve, { once: true });
    activePageScriptEl.addEventListener("error", () => reject(new Error(`Failed to load ${modulePath}`)), { once: true });
  });
}

function removeActivePageScript() {
  if (activePageScriptEl && activePageScriptEl.parentNode) {
    activePageScriptEl.parentNode.removeChild(activePageScriptEl);
    activePageScriptEl = null;
  }
}

// Listen for navigation
window.addEventListener("hashchange", () => render(getRouteFromHash()));
window.addEventListener("DOMContentLoaded", () => render(getRouteFromHash()));
