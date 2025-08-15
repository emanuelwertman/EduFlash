// Import CDN libraries via script tags in the HTML
// We'll add marked.js and KaTeX dynamically

let marked, katex;

// Initialize the markdown editor
async function initializeEditor() {
  // Load external libraries
  await loadExternalLibraries();
  
  const editor = document.getElementById('markdownEditor');
  const preview = document.getElementById('previewContent');
  const saveBtn = document.getElementById('saveBtn');
  const previewToggle = document.getElementById('previewToggle');
  const helpBtn = document.getElementById('helpBtn');
  const aiBtn = document.getElementById('aiBtn');
  
  if (!editor || !preview) {
    console.error('Editor elements not found');
    return;
  }

  // Configure marked options
  marked.setOptions({
    highlight: function(code, lang) {
      // Basic syntax highlighting would go here
      return code;
    },
    breaks: true,
    gfm: true
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
      console.error('Error updating preview:', error);
      preview.innerHTML = `<div style="color: red; padding: 20px;">
        <h3>Preview Error</h3>
        <p>There was an error rendering the preview:</p>
        <pre>${error.message}</pre>
      </div>`;
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
    const mathBlocks = element.querySelectorAll('.math-block');
    mathBlocks.forEach(block => {
      try {
        const math = block.textContent;
        katex.render(math, block, {
          displayMode: true,
          throwOnError: false
        });
      } catch (e) {
        block.innerHTML = `<span style="color: red;">Math Error: ${e.message}</span>`;
      }
    });
    
    // Render inline math
    const mathInlines = element.querySelectorAll('.math-inline');
    mathInlines.forEach(inline => {
      try {
        const math = inline.textContent;
        katex.render(math, inline, {
          displayMode: false,
          throwOnError: false
        });
      } catch (e) {
        inline.innerHTML = `<span style="color: red;">Math Error: ${e.message}</span>`;
      }
    });
  }

  // Event listeners
  editor.addEventListener('input', updatePreview);
  editor.addEventListener('scroll', syncScroll);
  
  // Save functionality
  saveBtn.addEventListener('click', saveGuide);
  
  // Preview toggle for mobile
  previewToggle.addEventListener('click', togglePreview);
  
  // Help button functionality
  helpBtn.addEventListener('click', openMarkdownHelp);
  
  // AI button functionality (placeholder)
  aiBtn.addEventListener('click', handleAIAssistant);
  
  // Initial preview update
  updatePreview();
}

// Load external libraries
async function loadExternalLibraries() {
  // Load marked.js
  if (!window.marked) {
    await loadScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js');
    marked = window.marked;
  } else {
    marked = window.marked;
  }
  
  // Load KaTeX
  if (!window.katex) {
    // Load KaTeX CSS
    const katexCSS = document.createElement('link');
    katexCSS.rel = 'stylesheet';
    katexCSS.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
    document.head.appendChild(katexCSS);
    
    // Load KaTeX JS
    await loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js');
    katex = window.katex;
  } else {
    katex = window.katex;
  }
}

// Helper function to load external scripts
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Sync scrolling between editor and preview
function syncScroll() {
  const editor = document.getElementById('markdownEditor');
  const preview = document.getElementById('previewContent');
  
  if (!editor || !preview) return;
  
  const scrollPercentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
  const previewScrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight);
  preview.scrollTop = previewScrollTop;
}

// Save guide functionality
function saveGuide() {
  const editor = document.getElementById('markdownEditor');
  const content = editor.value;
  
  if (!content.trim()) {
    alert('Please add some content before saving.');
    return;
  }
  
  // For now, just save to localStorage
  // In a real app, this would send to a server
  const guide = {
    id: Date.now(),
    title: extractTitle(content) || 'Untitled Guide',
    content: content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Get existing guides
  const guides = JSON.parse(localStorage.getItem('eduflash_guides') || '[]');
  guides.push(guide);
  localStorage.setItem('eduflash_guides', JSON.stringify(guides));
  
  alert(`Guide "${guide.title}" saved successfully!`);
}

// Extract title from markdown content
function extractTitle(content) {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return trimmed.substring(2).trim();
    }
  }
  return null;
}

// Toggle preview for mobile
function togglePreview() {
  const editor = document.querySelector('.editor-panel');
  const preview = document.querySelector('.preview-panel');
  
  if (window.innerWidth <= 768) {
    editor.classList.toggle('hide-mobile');
    preview.classList.toggle('show-mobile');
  }
}

// Handle window resize
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    document.querySelector('.editor-panel').classList.remove('hide-mobile');
    document.querySelector('.preview-panel').classList.remove('show-mobile');
  }
});

// Auto-resize textarea
function autoResize() {
  const editor = document.getElementById('markdownEditor');
  if (editor) {
    editor.style.height = 'auto';
    editor.style.height = editor.scrollHeight + 'px';
  }
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl+S or Cmd+S to save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveGuide();
  }
  
  // Ctrl+/ or Cmd+/ to toggle preview on mobile
  if ((e.ctrlKey || e.metaKey) && e.key === '/') {
    e.preventDefault();
    if (window.innerWidth <= 768) {
      togglePreview();
    }
  }
  
  // F1 for help
  if (e.key === 'F1') {
    e.preventDefault();
    openMarkdownHelp();
  }
});

// Open markdown help in new tab
function openMarkdownHelp() {
  window.open('https://www.markdownguide.org/basic-syntax/', '_blank');
}

// AI Assistant placeholder function
function handleAIAssistant() {
  alert('AI Assistant feature coming soon! This will help you write and improve your guides with AI assistance.');
}

// Initialize when the page loads
initializeEditor().catch(error => {
  console.error('Failed to initialize editor:', error);
  document.getElementById('previewContent').innerHTML = `
    <div style="color: red; padding: 20px;">
      <h3>Initialization Error</h3>
      <p>Failed to load the markdown editor. Please refresh the page.</p>
      <pre>${error.message}</pre>
    </div>
  `;
});
