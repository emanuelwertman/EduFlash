// Import CDN libraries via script tags in the HTML
// We'll add marked.js and KaTeX dynamically

let marked, katex;
let pathsData = null;

function getCookie(name) {
  const cookieString = decodeURIComponent(document.cookie);
  const cookies = cookieString.split(";");
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === " ") {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(name + "=") === 0) {
      return cookie.substring(name.length + 1, cookie.length);
    }
  }
  return "";
}

const editorApp = {};

// Initialize the markdown editor
async function initializeEditor() {
  // Load external libraries
  await loadExternalLibraries();

  // Load paths data
  await loadPathsData();

  const editor = document.getElementById("markdownEditor");
  const preview = document.getElementById("previewContent");
  const saveBtn = document.getElementById("saveBtn");
  const previewToggle = document.getElementById("previewToggle");
  const helpBtn = document.getElementById("helpBtn");
  const aiBtn = document.getElementById("aiBtn");
  const titleInput = document.getElementById("guideTitle");
  const topicSelect = document.getElementById("guideTopic");

  if (!editor || !preview) {
    console.error("Editor elements not found");
    return;
  }

  // Populate topic dropdown
  populateTopicDropdown();

  // Configure marked options
  marked.setOptions({
    highlight: function (code, lang) {
      // Basic syntax highlighting would go here
      return code;
    },
    breaks: true,
    gfm: true,
  });

  // Update preview function
  function updatePreview() {
    const markdownText = editor.value;

    try {
      // First convert markdown to HTML
      let html = marked.parse(markdownText);

      // Then process LaTeX math
      html = processLatexMath(html);

      preview.innerHTML = html;

      // Render KaTeX math
      renderMathInElement(preview);
    } catch (error) {
      console.error("Error updating preview:", error);
      preview.innerHTML = `<div style="color: red; padding: 20px;">
        <h3>Preview Error</h3>
        <p>There was an error rendering the preview:</p>
        <pre>${error.message}</pre>
      </div>`;
    }
  }

  editorApp.updatePreview = updatePreview;

  editor.addEventListener("input", updatePreview);
  updatePreview();

  // Auto-update title when user starts typing in editor
  function autoUpdateTitle() {
    if (!titleInput.value.trim()) {
      const content = editor.value;
      const extractedTitle = extractTitle(content);
      if (extractedTitle) {
        titleInput.value = extractedTitle;
      }
    }
  }

  // Process LaTeX math expressions
  function processLatexMath(html) {
    // Handle block math ($$...$$)
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
      return `<div class="math-block">${math.trim()}</div>`;
    });

    // Handle inline math ($...$) - but not if it's already in a block
    html = html.replace(/\$([^$\n]+?)\$/g, (match, math) => {
      return `<span class="math-inline">${math.trim()}</span>`;
    });

    return html;
  }

  // Render math using KaTeX
  function renderMathInElement(element) {
    if (!katex) return;

    // Render block math
    const mathBlocks = element.querySelectorAll(".math-block");
    mathBlocks.forEach((block) => {
      try {
        const math = block.textContent;
        katex.render(math, block, {
          displayMode: true,
          throwOnError: false,
        });
      } catch (e) {
        block.innerHTML = `<span style="color: red;">Math Error: ${e.message}</span>`;
      }
    });

    // Render inline math
    const mathInlines = element.querySelectorAll(".math-inline");
    mathInlines.forEach((inline) => {
      try {
        const math = inline.textContent;
        katex.render(math, inline, {
          displayMode: false,
          throwOnError: false,
        });
      } catch (e) {
        inline.innerHTML = `<span style="color: red;">Math Error: ${e.message}</span>`;
      }
    });
  }

  // Event listeners
  editor.addEventListener("input", () => {
    updatePreview();
    autoUpdateTitle();
  });
  editor.addEventListener("scroll", syncScroll);

  // Save functionality
  saveBtn.addEventListener("click", saveGuide);

  // Preview toggle for mobile
  previewToggle.addEventListener("click", togglePreview);

  // Help button functionality
  helpBtn.addEventListener("click", openMarkdownHelp);

  // AI button functionality (placeholder)
  aiBtn.addEventListener("click", handleAIAssistant);

  // Title input validation
  titleInput.addEventListener("input", validateTitle);

  // Topic select validation
  topicSelect.addEventListener("change", validateTopic);

  // Initial preview update
  updatePreview();
}

// Load paths data from JSON file
async function loadPathsData() {
  try {
    const response = await fetch("/static/data/paths.json");
    pathsData = await response.json();
  } catch (error) {
    console.error("Error loading paths data:", error);
    pathsData = { paths: [] };
  }
}

// Populate topic dropdown with hierarchical structure
function populateTopicDropdown() {
  const topicSelect = document.getElementById("guideTopic");
  if (!topicSelect || !pathsData) return;

  // Clear existing options except the first one
  topicSelect.innerHTML = '<option value="">Select a topic...</option>';

  // Create hierarchical structure: Path > Level > Topics
  pathsData.paths.forEach((path) => {
    // Create optgroup for each path (subject area)
    const pathOptgroup = document.createElement("optgroup");
    pathOptgroup.label = `📚 ${path.name}`;

    path.levels.forEach((level) => {
      // Add level as a disabled option with visual hierarchy
      const levelOption = document.createElement("option");
      levelOption.disabled = true;
      levelOption.textContent = `   📋 ${level.name}`;
      levelOption.className = "level-header";
      pathOptgroup.appendChild(levelOption);

      // Add topics under this level
      level.topics.forEach((topic) => {
        const option = document.createElement("option");
        option.value = topic.id;
        option.textContent = `      • ${topic.name}`;
        option.className = "topic-item";
        option.dataset.pathId = path.id;
        option.dataset.levelId = level.id;
        option.dataset.pathName = path.name;
        option.dataset.levelName = level.name;
        option.dataset.topicName = topic.name;
        pathOptgroup.appendChild(option);
      });
    });

    topicSelect.appendChild(pathOptgroup);
  });
}

// Validate title input
function validateTitle() {
  const titleInput = document.getElementById("guideTitle");
  const title = titleInput.value.trim();

  if (title.length > 100) {
    titleInput.style.borderColor = "#ef4444";
    titleInput.title = "Title must be 100 characters or less";
  } else {
    titleInput.style.borderColor = "";
    titleInput.title = "";
  }
}

// Validate topic selection
function validateTopic() {
  const topicSelect = document.getElementById("guideTopic");
  const selectedValue = topicSelect.value;

  if (selectedValue) {
    topicSelect.style.borderColor = "";
    topicSelect.title = "";
  } else {
    topicSelect.style.borderColor = "";
    topicSelect.title = "";
  }
}

// Load external libraries
async function loadExternalLibraries() {
  // Load marked.js
  if (!window.marked) {
    await loadScript("https://cdn.jsdelivr.net/npm/marked/marked.min.js");
    marked = window.marked;
  } else {
    marked = window.marked;
  }

  // Load KaTeX
  if (!window.katex) {
    // Load KaTeX CSS
    const katexCSS = document.createElement("link");
    katexCSS.rel = "stylesheet";
    katexCSS.href =
      "https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css";
    document.head.appendChild(katexCSS);

    // Load KaTeX JS
    await loadScript(
      "https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"
    );
    katex = window.katex;
  } else {
    katex = window.katex;
  }
}

// Helper function to load external scripts
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Sync scrolling between editor and preview
function syncScroll() {
  const editor = document.getElementById("markdownEditor");
  const preview = document.getElementById("previewContent");

  if (!editor || !preview) return;

  const scrollPercentage =
    editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
  const previewScrollTop =
    scrollPercentage * (preview.scrollHeight - preview.clientHeight);
  preview.scrollTop = previewScrollTop;
}

// Save guide functionality
function saveGuide() {
  const editor = document.getElementById("markdownEditor");
  const titleInput = document.getElementById("guideTitle");
  const topicSelect = document.getElementById("guideTopic");

  const content = editor.value;
  const title = titleInput.value.trim();
  const selectedTopicId = topicSelect.value;

  if (!content.trim()) {
    showNotification("Please add some content before saving.", "error");
    return;
  }

  if (!title) {
    showNotification("Please enter a title for your guide.", "error");
    titleInput.focus();
    return;
  }

  if (!selectedTopicId) {
    showNotification("Please select a topic for your guide.", "error");
    topicSelect.focus();
    return;
  }

  // Get topic details from the selected option
  const selectedOption = topicSelect.options[topicSelect.selectedIndex];
  const pathData = {
    path: selectedOption.dataset.pathId,
    level: selectedOption.dataset.levelId,
    topic: selectedOption.dataset.topicName,
  };
  // Create guide object
  const guide = {
    token: getCookie("session"),
    title: title,
    file: content,
    topic: pathData,
  };
  const res = fetch("/api/makepage", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(guide),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  // Get existing guides
  const guides = JSON.parse(localStorage.getItem("eduflash_guides") || "[]");
  guides.push(guide);
  localStorage.setItem("eduflash_guides", JSON.stringify(guides));

  showNotification(
    `Guide "${guide.title}" saved successfully for topic "${topicData.name}"!`,
    "success"
  );
}

// Show notification function
function showNotification(message, type = "info") {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll(".notification");
  existingNotifications.forEach((n) => n.remove());

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span>${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;

  // Add notification styles if not already present
  if (!document.querySelector("#notification-styles")) {
    const styles = document.createElement("style");
    styles.id = "notification-styles";
    styles.textContent = `
      .notification {
        position: fixed;
        top: 100px;
        right: 24px;
        z-index: 10000;
        max-width: 400px;
        padding: 16px;
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        backdrop-filter: blur(20px);
        border: 2px solid;
        animation: slideIn 0.3s ease-out;
      }
      
      .notification-success {
        background: rgba(34, 197, 94, 0.1);
        border-color: rgba(34, 197, 94, 0.3);
        color: #15803d;
      }
      
      .notification-error {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.3);
        color: #dc2626;
      }
      
      .notification-info {
        background: rgba(59, 130, 246, 0.1);
        border-color: rgba(59, 130, 246, 0.3);
        color: #2563eb;
      }
      
      .notification-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      
      .notification-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity 0.2s;
      }
      
      .notification-close:hover {
        opacity: 1;
      }
      
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(styles);
  }

  document.body.appendChild(notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = "slideIn 0.3s ease-out reverse";
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

// Extract title from markdown content
function extractTitle(content) {
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      return trimmed.substring(2).trim();
    }
  }
  return null;
}

// Toggle preview for mobile
function togglePreview() {
  const editor = document.querySelector(".editor-panel");
  const preview = document.querySelector(".preview-panel");

  if (window.innerWidth <= 768) {
    editor.classList.toggle("hide-mobile");
    preview.classList.toggle("show-mobile");
  }
}

// Handle window resize
window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    document.querySelector(".editor-panel").classList.remove("hide-mobile");
    document.querySelector(".preview-panel").classList.remove("show-mobile");
  }
});

// Auto-resize textarea
function autoResize() {
  const editor = document.getElementById("markdownEditor");
  if (editor) {
    editor.style.height = "auto";
    editor.style.height = editor.scrollHeight + "px";
  }
}

// Add keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Ctrl+S or Cmd+S to save
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    saveGuide();
  }

  // Ctrl+/ or Cmd+/ to toggle preview on mobile
  if ((e.ctrlKey || e.metaKey) && e.key === "/") {
    e.preventDefault();
    if (window.innerWidth <= 768) {
      togglePreview();
    }
  }

  // F1 for help
  if (e.key === "F1") {
    e.preventDefault();
    openMarkdownHelp();
  }
});

// Open markdown help in new tab
function openMarkdownHelp() {
  const modal = document.createElement("div");
  modal.className = "help-modal";
  modal.innerHTML = `
    <div class="help-modal-content">
      <div class="help-modal-header">
        <h3>📝 Markdown Guide & Shortcuts</h3>
        <button class="help-modal-close" onclick="this.closest('.help-modal').remove()">×</button>
      </div>
      <div class="help-modal-body">
        <div class="help-sections">
          <div class="help-section">
            <h4>🚀 Keyboard Shortcuts</h4>
            <div class="shortcut-list">
              <div class="shortcut"><kbd>Ctrl + S</kbd> Save guide</div>
              <div class="shortcut"><kbd>Ctrl + /</kbd> Toggle preview (mobile)</div>
              <div class="shortcut"><kbd>F1</kbd> Show this help</div>
            </div>
          </div>
          
          <div class="help-section">
            <h4>📋 Markdown Syntax</h4>
            <div class="syntax-list">
              <div class="syntax-item">
                <code># Heading 1</code>
                <code>## Heading 2</code>
                <code>### Heading 3</code>
              </div>
              <div class="syntax-item">
                <code>**Bold text**</code>
                <code>*Italic text*</code>
                <code>\`Code\`</code>
              </div>
              <div class="syntax-item">
                <code>- List item</code>
                <code>1. Numbered item</code>
                <code>[Link](url)</code>
              </div>
            </div>
          </div>
          
          <div class="help-section">
            <h4>🧮 Math Formulas</h4>
            <div class="syntax-list">
              <div class="syntax-item">
                <code>$E = mc^2$</code> <span>Inline math</span>
              </div>
              <div class="syntax-item">
                <code>$$\\int_0^1 x dx$$</code> <span>Block math</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="help-footer">
          <a href="https://www.markdownguide.org/basic-syntax/" target="_blank" class="btn ghost">
            Full Markdown Guide
          </a>
        </div>
      </div>
    </div>
  `;

  // Add modal styles if not already present
  if (!document.querySelector("#help-modal-styles")) {
    const styles = document.createElement("style");
    styles.id = "help-modal-styles";
    styles.textContent = `
      .help-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease-out;
      }
      
      .help-modal-content {
        background: var(--glass);
        backdrop-filter: blur(20px);
        border: 2px solid var(--stroke);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow);
        width: 90%;
        max-width: 700px;
        max-height: 80vh;
        overflow-y: auto;
        animation: slideUp 0.3s ease-out;
      }
      
      .help-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px;
        border-bottom: 1px solid var(--stroke);
      }
      
      .help-modal-header h3 {
        margin: 0;
        color: var(--accent);
        font-size: 1.5rem;
        font-weight: 700;
      }
      
      .help-modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: var(--ink-dim);
        transition: color 0.2s;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
      }
      
      .help-modal-close:hover {
        color: var(--ink);
        background: var(--stroke);
      }
      
      .help-modal-body {
        padding: 24px;
      }
      
      .help-sections {
        display: grid;
        gap: 24px;
        margin-bottom: 24px;
      }
      
      .help-section h4 {
        margin: 0 0 12px 0;
        color: var(--ink);
        font-weight: 600;
        font-size: 1.1rem;
      }
      
      .shortcut-list {
        display: grid;
        gap: 8px;
      }
      
      .shortcut {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        font-size: 0.9rem;
      }
      
      .shortcut kbd {
        background: var(--charcoal);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.85rem;
        font-weight: 600;
        min-width: 80px;
        text-align: center;
      }
      
      .syntax-list {
        display: grid;
        gap: 8px;
      }
      
      .syntax-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        font-size: 0.9rem;
        flex-wrap: wrap;
      }
      
      .syntax-item code {
        background: var(--charcoal);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.85rem;
        font-family: 'JetBrains Mono', monospace;
      }
      
      .syntax-item span {
        color: var(--ink-dim);
        font-style: italic;
      }
      
      .help-footer {
        text-align: center;
        padding-top: 20px;
        border-top: 1px solid var(--stroke);
      }
    `;
    document.head.appendChild(styles);
  }

  document.body.appendChild(modal);

  // Close modal when clicking outside
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// AI Assistant placeholder function
function handleAIAssistant() {
  const modal = document.createElement("div");
  modal.className = "ai-modal";
  modal.innerHTML = `
    <div class="ai-modal-content">
      <div class="ai-modal-header">
        <h3>AI Guide Assistant</h3>
        <button class="ai-modal-close" onclick="this.closest('.ai-modal').remove()">×</button>
      </div>
      <div class="ai-modal-body">
        <div class="ai-welcome">
          <div class="ai-welcome-icon">✨</div>
          <h4>Welcome to AI-Powered Content Creation!</h4>
          <p>Your intelligent writing companion for educational content is being prepared with amazing features.</p>
        </div>
        
        <div class="ai-settings">
          <div class="input-box">
            <input type="text" id="topic" placeholder="Topic" required>
          </div>
          <div class="input-box">
            <input type="text" id="language" placeholder="Language" required>
          </div>
        </div>
        <button type="submit" class="btn" id="generate-btn">Generate</button>
      </div>
    </div>
  `;

  // Add modal styles if not already present
  if (!document.querySelector("#ai-modal-styles")) {
    const styles = document.createElement("style");
    styles.id = "ai-modal-styles";
    styles.textContent = `
      .ai-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease-out;
      }
      
      .ai-modal-content {
        background: var(--glass);
        backdrop-filter: blur(20px);
        border: 2px solid var(--stroke);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow);
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        animation: slideUp 0.3s ease-out;
      }
      
      .ai-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px;
        border-bottom: 1px solid var(--stroke);
      }
      
      .ai-modal-header h3 {
        margin: 0;
        color: var(--accent);
        font-size: 1.5rem;
        font-weight: 700;
      }
      
      .ai-modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: var(--ink-dim);
        transition: color 0.2s;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
      }
      
      .ai-modal-close:hover {
        color: var(--ink);
        background: var(--stroke);
      }
      
      .ai-modal-body {
        padding: 24px;
      }
      
      .ai-welcome {
        text-align: center;
        padding: 24px;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        border-radius: var(--radius);
        margin-bottom: 32px;
      }
      
      .ai-welcome-icon {
        font-size: 3rem;
        margin-bottom: 16px;
      }
      
      .ai-welcome h4 {
        margin: 0 0 12px 0;
        color: var(--accent);
        font-size: 1.5rem;
        font-weight: 700;
      }
      
      .ai-welcome p {
        margin: 0;
        color: var(--ink-dim);
        font-size: 1rem;
        line-height: 1.6;
      }
      
      .ai-settings {
        margin-bottom: 20px;
      }
      
      .input-box {
        margin-bottom: 16px;
      }
      
      .input-box input {
        width: 100%;
        padding: 12px;
        border: 2px solid var(--stroke);
        border-radius: var(--radius);
        background: var(--glass);
        color: var(--ink);
        font-size: 1rem;
      }
      
      .input-box input:focus {
        outline: none;
        border-color: var(--accent);
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(styles);
  }

  document.body.appendChild(modal);

  // Variables to store input values
  let topic = "";
  let lang = "";

  // Get references to the input elements
  const topicInput = modal.querySelector("#topic");
  const languageInput = modal.querySelector("#language");
  const generateBtn = modal.querySelector("#generate-btn");

  // Add event listeners to save input values to variables
  topicInput.addEventListener("input", (e) => {
    topic = e.target.value;
  });

  languageInput.addEventListener("input", (e) => {
    lang = e.target.value;
  });

  // Add click event listener to the generate button
  generateBtn.addEventListener("click", (e) => {
    e.preventDefault();

    // Update variables with current input values
    topic = topicInput.value;
    lang = languageInput.value;

    console.log("AI Topic:", topic);
    console.log("AI Language:", lang);

    document.querySelector(".boxes").style.display = "block";

    //replace this with the actual fetch url for the flask instance whatever that is
    fetch("https://eduflash.org/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: getCookie("session"), topic: topic, lang: lang }),
    })
      .then((response) => response.text())
      .then((data) => {
        // console.log(receivedTopic);
        const editor = document.getElementById("markdownEditor");

        editor.value = data;
        editorApp.updatePreview();
        console.log("populated");
        document.querySelector(".boxes").style.display = "none";
      })
      .catch((err) => console.error(err));
  });

  // Close modal when clicking outside
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Initialize when the page loads
initializeEditor().catch((error) => {
  console.error("Failed to initialize editor:", error);
  document.getElementById("previewContent").innerHTML = `
    <div style="color: red; padding: 20px;">
      <h3>Initialization Error</h3>
      <p>Failed to load the markdown editor. Please refresh the page.</p>
      <pre>${error.message}</pre>
    </div>
  `;
});
