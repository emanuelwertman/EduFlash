const routes = {
  "/": { file: "static/pages/home.html", script: null },
  "/login": { file: "static/pages/login_signup.html", script: "static/js/login_signup.js" },
  "/paths": { file: "static/pages/paths.html", script: "static/js/paths.js", protected: false },
  "/topics": { file: "static/pages/topic.html", script: "static/js/topic.js", protected: false },
  "/lessons": { file: "static/pages/lessons.html", script: "static/js/lessons.js", protected: false },
  "/about": { file: "static/pages/about.html", script: "static/js/about.js" },
  "/profile": { file: "static/pages/profile.html", script: "static/js/profile.js", protected: false },
  "/create": { file: "static/pages/create.html", script: "static/js/create.js", protected: false },
};

let activePageScriptEl = null;

function isAuthenticated() {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'session' && value && value !== 'undefined') {
      return true;
    }
  }
  return false;
}

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

function updateAuthButtons() {
  const isLoggedIn = isAuthenticated();
  const authButtons = document.querySelectorAll('.ef-cta, .mobile-cta');
  
  authButtons.forEach(buttonContainer => {
    if (isLoggedIn) {
      buttonContainer.style.display = 'none';
    } else {
      buttonContainer.style.display = '';
    }
  });
}

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

  if (cfg && cfg.protected && !isAuthenticated()) {
    window.location.hash = '#/login';
    return;
  }

  setActiveNav(route);
  updateAuthButtons();

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
window.addEventListener("DOMContentLoaded", () => {
  render(getRouteFromHash());
  updateAuthButtons();
  initMobileMenu();
});

// Hamburger menu functionality
function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.ef-links');
  const navLinks = document.querySelectorAll('.ef-links a, .mobile-cta a');

  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
      document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu when clicking on nav links or CTA buttons
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
        document.body.style.overflow = '';
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
        document.body.style.overflow = '';
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('active')) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
        document.body.style.overflow = '';
      }
    });

    // Close menu on window resize to desktop size
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }
}
