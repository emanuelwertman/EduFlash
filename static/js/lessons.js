// Import CDN libraries via script tags in the HTML
// We'll add marked.js and KaTeX dynamically

let marked, katex;
let pathsData = null;
let lessonsData = [];
let filteredLessons = [];

function getCookie(name) {
  const cookieString = decodeURIComponent(document.cookie);
  const cookies = cookieString.split(';');
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(name + '=') === 0) {
      return cookie.substring(name.length + 1, cookie.length);
    }
  }
  return '';
}

// Initialize the lessons page
async function initializeLessons() {
  // Load external libraries
  await loadExternalLibraries();

  // Load paths data
  await loadPathsData();

  // Load lessons data (from localStorage for now, backend will be implemented later)
  loadLessonsData();

  // Configure marked options
  marked.setOptions({
    highlight: function (code, lang) {
      // Basic syntax highlighting would go here
      return code;
    },
    breaks: true,
    gfm: true
  });

  // Check if we're viewing a specific lesson
  const routeParams = window.routeParams || {};
  if (routeParams.lesson) {
    // Show specific lesson
    showSpecificLesson(routeParams.lesson);
  } else {
    // Show lessons grid view
    showLessonsGrid();
  }
}

// Show specific lesson view
function showSpecificLesson(lessonName) {
  // Find the lesson by name or ID
  const lesson = findLessonByName(lessonName);
  
  if (!lesson) {
    // If no specific lesson found, check if this is a topic ID and show all lessons for that topic
    const topicLessons = lessonsData.filter(l => l.topic.id === lessonName);
    if (topicLessons.length > 0) {
      showTopicLessons(lessonName, topicLessons);
      return;
    }
    
    showLessonNotFound(lessonName);
    return;
  }

  // Hide the normal lessons page elements
  hideMainLessonsView();
  
  // Create and show the lesson view
  createLessonView(lesson);
  
  // Update page title
  document.title = `${lesson.title} - EduFlash`;
}

// Show lessons for a specific topic
function showTopicLessons(topicId, topicLessons) {
  // Find topic info from paths data
  let topicInfo = null;
  if (pathsData) {
    pathsData.paths.forEach(path => {
      path.levels.forEach(level => {
        const topic = level.topics.find(t => t.id === topicId);
        if (topic) {
          topicInfo = {
            ...topic,
            pathName: path.name,
            levelName: level.name
          };
        }
      });
    });
  }

  // Hide main lessons view
  hideMainLessonsView();

  // Create topic lessons view
  const container = document.querySelector('.lessons-container');
  if (!container) return;

  const topicName = topicInfo ? topicInfo.name : topicId;
  const pathName = topicInfo ? topicInfo.pathName : 'Unknown';
  const levelName = topicInfo ? topicInfo.levelName : 'Unknown';

  container.innerHTML = `
    <div class="topic-lessons-view">
      <div class="topic-lessons-nav">
        <button class="back-btn" onclick="goBackToLessons()">
          <i class="fas fa-arrow-left"></i>
          Back to Lessons
        </button>
        <div class="topic-lessons-breadcrumb">
          <span>${pathName}</span>
          <span class="separator">•</span>
          <span>${levelName}</span>
        </div>
      </div>
      
      <div class="topic-lessons-header">
        <h1>Lessons for ${topicName}</h1>
        <p>Explore all available lessons for this topic</p>
      </div>
      
      <div class="topic-lessons-grid">
        ${topicLessons.map(lesson => `
          <div class="lesson-card" onclick="window.location.hash = '${generateLessonUrl(lesson)}'">
            <div class="lesson-header">
              <div class="lesson-badges">
                <span class="lesson-badge path">${lesson.pathName}</span>
                <span class="lesson-badge level">${lesson.levelName}</span>
              </div>
              <div class="lesson-status ${lesson.completed ? 'completed' : 'new'}">
                ${lesson.completed ? '✅' : '✨'}
              </div>
            </div>
            <h3 class="lesson-title">${lesson.title}</h3>
            <p class="lesson-preview">${lesson.preview}</p>
            <div class="lesson-footer">
              <div class="lesson-meta">
                <span><i class="fas fa-clock"></i> ${lesson.duration}</span>
                <span><i class="fas fa-calendar"></i> ${lesson.date}</span>
              </div>
              <button class="lesson-action" onclick="event.stopPropagation(); window.location.hash = '${generateLessonUrl(lesson)}'">
                ${lesson.completed ? 'Review' : 'Start'}
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Add styles
  addLessonViewStyles();
  
  // Update page title
  document.title = `${topicName} Lessons - EduFlash`;
}

// Show the normal lessons grid
function showLessonsGrid() {
  // Set up event listeners
  setupEventListeners();

  // Populate filters
  populateFilters();

  // Initial render
  renderLessons();

  // Update stats
  updateStats();

  // Hide loading state
  hideLoadingState();
  
  // Reset page title
  document.title = 'Lessons - EduFlash';
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

// Load paths data from JSON file
async function loadPathsData() {
  try {
    const response = await fetch('/static/data/paths.json');
    pathsData = await response.json();
  } catch (error) {
    console.error('Error loading paths data:', error);
    pathsData = { paths: [] };
  }
}

// Load lessons data (placeholder implementation)
function loadLessonsData() {
  // Get lessons from localStorage (created guides)
  const guides = JSON.parse(localStorage.getItem('eduflash_guides') || '[]');
  
  // Convert guides to lessons format
  lessonsData = guides.map((guide, index) => ({
    id: `lesson_${index}`,
    title: guide.title,
    content: guide.file,
    topic: guide.topic,
    pathId: guide.topic.pathId,
    pathName: guide.topic.pathName,
    levelId: guide.topic.levelId,
    levelName: guide.topic.levelName,
    topicName: guide.topic.name,
    preview: extractPreview(guide.file),
    duration: estimateReadingTime(guide.file),
    date: new Date().toLocaleDateString(),
    completed: false,
    isNew: true
  }));

  // Add some sample lessons if no guides exist
  if (lessonsData.length === 0) {
    lessonsData = [
      {
        id: 'sample_1',
        title: 'Introduction to Calculus',
        content: `# Introduction to Calculus

Calculus is a branch of mathematics that deals with rates of change and accumulation of quantities.

## What is a Derivative?

The derivative of a function measures how the function value changes as its input changes. Mathematically, the derivative of $f(x)$ at point $x = a$ is:

$$f'(a) = \\lim_{h \\to 0} \\frac{f(a+h) - f(a)}{h}$$

## Basic Rules

1. **Power Rule**: If $f(x) = x^n$, then $f'(x) = nx^{n-1}$
2. **Sum Rule**: $(f + g)' = f' + g'$
3. **Product Rule**: $(fg)' = f'g + fg'$

## Example

Let's find the derivative of $f(x) = 3x^2 + 2x + 1$:

$$f'(x) = 6x + 2$$

This tells us the slope of the tangent line at any point on the curve.

## Applications

Derivatives are used in:
- **Physics**: To calculate velocity and acceleration
- **Economics**: To find marginal cost and revenue
- **Engineering**: To optimize designs and processes

## Practice Problems

1. Find the derivative of $f(x) = 5x^3 - 2x + 7$
2. What is the slope of $y = x^2$ at the point $(3, 9)$?
3. If $s(t) = 16t^2$ represents position, what is the velocity at $t = 2$?

## Summary

Calculus provides powerful tools for understanding change and motion in the world around us.`,
        topic: { id: 'calculus', name: 'Calculus' },
        pathId: 'math',
        pathName: 'Math',
        levelId: 'advanced',
        levelName: 'Advanced',
        topicName: 'Calculus',
        preview: 'Calculus is a branch of mathematics that deals with rates of change and accumulation of quantities...',
        duration: '8 min read',
        date: new Date().toLocaleDateString(),
        completed: false,
        isNew: true
      },
      {
        id: 'sample_2',
        title: 'Newton\'s Laws of Motion',
        content: `# Newton's Laws of Motion

Sir Isaac Newton formulated three fundamental laws that describe the relationship between forces and motion.

## First Law (Law of Inertia)

An object at rest stays at rest, and an object in motion stays in motion at constant velocity, unless acted upon by an unbalanced force.

### Real-world Examples:
- A book sitting on a table stays there until someone moves it
- A hockey puck sliding on ice continues moving until friction stops it
- Passengers lurch forward when a car suddenly stops

## Second Law

The acceleration of an object is directly proportional to the net force acting on it and inversely proportional to its mass:

$$F = ma$$

Where:
- $F$ = net force (Newtons)
- $m$ = mass (kilograms)  
- $a$ = acceleration (m/s²)

### Example Calculation:
If a 10 kg object experiences a 50 N force:
$$a = \\frac{F}{m} = \\frac{50 \\text{ N}}{10 \\text{ kg}} = 5 \\text{ m/s}^2$$

## Third Law

For every action, there is an equal and opposite reaction.

$$F_{12} = -F_{21}$$

### Examples:
- When you walk, you push backward on the ground, and the ground pushes forward on you
- A rocket expels gas downward and is pushed upward
- When swimming, you push water backward to move forward

## Applications

These laws help us understand:
- Why we wear seatbelts in cars (First Law)
- How rockets work in space (Second and Third Laws)
- Why it's harder to push a heavy object (Second Law)
- How jets and helicopters fly (Third Law)

## Problem Solving

When solving Newton's Law problems:
1. Draw a free-body diagram
2. Identify all forces
3. Apply the appropriate law
4. Solve for the unknown

Try this: A 5 kg box is pushed with 20 N of force. If friction provides 5 N of resistance, what is the acceleration?`,
        topic: { id: 'physics', name: 'Physics' },
        pathId: 'science',
        pathName: 'Science',
        levelId: 'intermediate',
        levelName: 'Intermediate',
        topicName: 'Physics',
        preview: 'Sir Isaac Newton formulated three fundamental laws that describe the relationship between forces and motion...',
        duration: '6 min read',
        date: new Date().toLocaleDateString(),
        completed: true,
        isNew: false
      }
    ];
  }

  filteredLessons = [...lessonsData];
}

// Extract preview text from markdown content
function extractPreview(content) {
  // Remove markdown formatting and get first paragraph
  const plainText = content
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/\$(.*?)\$/g, '') // Remove inline math
    .replace(/\$\$(.*?)\$\$/g, '') // Remove block math
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .trim();

  // Get first 150 characters
  return plainText.length > 150 ? plainText.substring(0, 150) + '...' : plainText;
}

// Estimate reading time
function estimateReadingTime(content) {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min read`;
}

// Set up event listeners
function setupEventListeners() {
  const pathFilter = document.getElementById('pathFilter');
  const levelFilter = document.getElementById('levelFilter');
  const searchFilter = document.getElementById('searchFilter');
  const clearSearch = document.getElementById('clearSearch');

  if (pathFilter) pathFilter.addEventListener('change', applyFilters);
  if (levelFilter) levelFilter.addEventListener('change', applyFilters);
  if (searchFilter) {
    searchFilter.addEventListener('input', applyFilters);
    searchFilter.addEventListener('keyup', (e) => {
      const clearBtn = document.getElementById('clearSearch');
      if (clearBtn) {
        clearBtn.style.display = e.target.value ? 'block' : 'none';
      }
    });
  }
  if (clearSearch) {
    clearSearch.addEventListener('click', () => {
      searchFilter.value = '';
      clearSearch.style.display = 'none';
      applyFilters();
    });
  }
}

// Populate filter dropdowns
function populateFilters() {
  if (!pathsData) return;

  const pathFilter = document.getElementById('pathFilter');
  const levelFilter = document.getElementById('levelFilter');

  if (pathFilter) {
    // Clear existing options except the first one
    pathFilter.innerHTML = '<option value="">All Subjects</option>';
    
    pathsData.paths.forEach(path => {
      const option = document.createElement('option');
      option.value = path.id;
      option.textContent = path.name;
      pathFilter.appendChild(option);
    });
  }

  if (levelFilter) {
    // Get unique levels from paths data
    const levels = new Set();
    pathsData.paths.forEach(path => {
      path.levels.forEach(level => {
        levels.add(JSON.stringify({ id: level.id, name: level.name }));
      });
    });

    levelFilter.innerHTML = '<option value="">All Levels</option>';
    
    Array.from(levels).forEach(levelJson => {
      const level = JSON.parse(levelJson);
      const option = document.createElement('option');
      option.value = level.id;
      option.textContent = level.name;
      levelFilter.appendChild(option);
    });
  }
}

// Apply filters
function applyFilters() {
  const pathFilter = document.getElementById('pathFilter');
  const levelFilter = document.getElementById('levelFilter');
  const searchFilter = document.getElementById('searchFilter');

  const selectedPath = pathFilter ? pathFilter.value : '';
  const selectedLevel = levelFilter ? levelFilter.value : '';
  const searchTerm = searchFilter ? searchFilter.value.toLowerCase() : '';

  filteredLessons = lessonsData.filter(lesson => {
    const matchesPath = !selectedPath || lesson.pathId === selectedPath;
    const matchesLevel = !selectedLevel || lesson.levelId === selectedLevel;
    const matchesSearch = !searchTerm || 
      lesson.title.toLowerCase().includes(searchTerm) ||
      lesson.topicName.toLowerCase().includes(searchTerm) ||
      lesson.preview.toLowerCase().includes(searchTerm);

    return matchesPath && matchesLevel && matchesSearch;
  });

  renderLessons();
}

// Clear all filters
function clearAllFilters() {
  const pathFilter = document.getElementById('pathFilter');
  const levelFilter = document.getElementById('levelFilter');
  const searchFilter = document.getElementById('searchFilter');
  const clearSearch = document.getElementById('clearSearch');

  if (pathFilter) pathFilter.value = '';
  if (levelFilter) levelFilter.value = '';
  if (searchFilter) searchFilter.value = '';
  if (clearSearch) clearSearch.style.display = 'none';

  applyFilters();
}

// Render lessons grid
function renderLessons() {
  const lessonsGrid = document.getElementById('lessonsGrid');
  const emptyState = document.getElementById('emptyState');

  if (!lessonsGrid || !emptyState) return;

  if (filteredLessons.length === 0) {
    lessonsGrid.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  lessonsGrid.style.display = 'grid';
  emptyState.style.display = 'none';

  lessonsGrid.innerHTML = filteredLessons.map(lesson => `
    <div class="lesson-card" onclick="window.location.hash = '${generateLessonUrl(lesson)}'">
      <div class="lesson-header">
        <div class="lesson-badges">
          <span class="lesson-badge path">${lesson.pathName}</span>
          <span class="lesson-badge level">${lesson.levelName}</span>
        </div>
        <div class="lesson-status ${lesson.completed ? 'completed' : 'new'}">
          ${lesson.completed ? '✅' : '✨'}
        </div>
      </div>
      <h3 class="lesson-title">${lesson.title}</h3>
      <div class="lesson-topic">${lesson.topicName}</div>
      <p class="lesson-preview">${lesson.preview}</p>
      <div class="lesson-footer">
        <div class="lesson-meta">
          <span><i class="fas fa-clock"></i> ${lesson.duration}</span>
          <span><i class="fas fa-calendar"></i> ${lesson.date}</span>
        </div>
        <button class="lesson-action" onclick="event.stopPropagation(); window.location.hash = '${generateLessonUrl(lesson)}'">
          ${lesson.completed ? 'Review' : 'Start'}
        </button>
      </div>
    </div>
  `).join('');
}

// Update stats
function updateStats() {
  const totalLessonsEl = document.getElementById('totalLessons');
  const totalTopicsEl = document.getElementById('totalTopics');
  const completedLessonsEl = document.getElementById('completedLessons');

  if (totalLessonsEl) {
    animateNumber(totalLessonsEl, lessonsData.length);
  }

  if (totalTopicsEl) {
    const uniqueTopics = new Set(lessonsData.map(lesson => lesson.topicName));
    animateNumber(totalTopicsEl, uniqueTopics.size);
  }

  if (completedLessonsEl) {
    const completed = lessonsData.filter(lesson => lesson.completed).length;
    animateNumber(completedLessonsEl, completed);
  }
}

// Animate number counting
function animateNumber(element, target) {
  const duration = 2000;
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = Math.floor(current);
  }, 16);
}

// Open lesson modal
function openLessonModal(lessonId) {
  const lesson = lessonsData.find(l => l.id === lessonId);
  if (!lesson) return;

  const modal = document.getElementById('lessonModal');
  const modalLessonPath = document.getElementById('modalLessonPath');
  const modalLessonLevel = document.getElementById('modalLessonLevel');
  const modalLessonTitle = document.getElementById('modalLessonTitle');
  const modalLessonDuration = document.getElementById('modalLessonDuration');
  const modalLessonTopic = document.getElementById('modalLessonTopic');
  const modalLessonDate = document.getElementById('modalLessonDate');
  const modalLessonContent = document.getElementById('modalLessonContent');

  if (modalLessonPath) modalLessonPath.textContent = lesson.pathName;
  if (modalLessonLevel) modalLessonLevel.textContent = lesson.levelName;
  if (modalLessonTitle) modalLessonTitle.textContent = lesson.title;
  if (modalLessonDuration) modalLessonDuration.textContent = lesson.duration;
  if (modalLessonTopic) modalLessonTopic.textContent = lesson.topicName;
  if (modalLessonDate) modalLessonDate.textContent = lesson.date;

  if (modalLessonContent) {
    try {
      // Convert markdown to HTML
      let html = marked.parse(lesson.content);

      // Process LaTeX math
      html = processLatexMath(html);

      modalLessonContent.innerHTML = html;

      // Render KaTeX math
      renderMathInElement(modalLessonContent);
    } catch (error) {
      console.error('Error rendering lesson content:', error);
      modalLessonContent.innerHTML = `<div style="color: red; padding: 20px;">
        <h3>Rendering Error</h3>
        <p>There was an error rendering the lesson content:</p>
        <pre>${error.message}</pre>
      </div>`;
    }
  }

  if (modal) {
    modal.style.display = 'flex';
    modal.dataset.lessonId = lessonId;
    document.body.style.overflow = 'hidden';
  }
}

// Close lesson modal
function closeLessonModal() {
  const modal = document.getElementById('lessonModal');
  if (modal) {
    modal.style.display = 'none';
    delete modal.dataset.lessonId;
    document.body.style.overflow = '';
  }
}

// Mark lesson as completed
function markAsCompleted() {
  const modal = document.getElementById('lessonModal');
  const lessonId = modal ? modal.dataset.lessonId : null;

  if (!lessonId) return;

  const lesson = lessonsData.find(l => l.id === lessonId);
  if (lesson) {
    lesson.completed = true;
    lesson.isNew = false;

    // Update localStorage if this is a guide
    if (lessonId.startsWith('lesson_')) {
      const guides = JSON.parse(localStorage.getItem('eduflash_guides') || '[]');
      const index = parseInt(lessonId.split('_')[1]);
      if (guides[index]) {
        guides[index].completed = true;
        localStorage.setItem('eduflash_guides', JSON.stringify(guides));
      }
    }

    // Re-render lessons and update stats
    renderLessons();
    updateStats();

    // Show notification
    showNotification('Lesson marked as completed! 🎉', 'success');

    // Close modal
    closeLessonModal();
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

// Show notification function
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(n => n.remove());

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span>${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;

  // Add notification styles if not already present
  if (!document.querySelector('#notification-styles')) {
    const styles = document.createElement('style');
    styles.id = 'notification-styles';
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
      notification.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

// Hide loading state
function hideLoadingState() {
  const loadingState = document.getElementById('loadingState');
  if (loadingState) {
    loadingState.style.display = 'none';
  }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
  const modal = document.getElementById('lessonModal');
  if (modal && e.target === modal) {
    closeLessonModal();
  }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLessonModal();
  }
});

// Initialize when the page loads
initializeLessons().catch(error => {
  console.error('Failed to initialize lessons page:', error);
  const loadingState = document.getElementById('loadingState');
  if (loadingState) {
    loadingState.innerHTML = `
      <div style="color: red; padding: 20px; text-align: center;">
        <h3>Initialization Error</h3>
        <p>Failed to load the lessons page. Please refresh the page.</p>
        <pre>${error.message}</pre>
      </div>
    `;
  }
});

// Helper functions for specific lesson view

// Find lesson by name or ID
function findLessonByName(lessonName) {
  // Try to find by exact ID first
  let lesson = lessonsData.find(l => l.id === lessonName);
  
  if (!lesson) {
    // Try to find by topic ID (for links from topics page)
    lesson = lessonsData.find(l => l.topic.id === lessonName);
  }
  
  if (!lesson) {
    // Try to find by title slug (convert title to URL-friendly format)
    lesson = lessonsData.find(l => createSlug(l.title) === lessonName);
  }
  
  if (!lesson) {
    // Try to find by partial title match
    lesson = lessonsData.find(l => l.title.toLowerCase().includes(lessonName.toLowerCase().replace(/-/g, ' ')));
  }
  
  return lesson;
}

// Create URL-friendly slug from title
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim('-'); // Remove leading/trailing hyphens
}

// Generate lesson URL
function generateLessonUrl(lesson) {
  const slug = createSlug(lesson.title);
  return `#/lessons/${slug}`;
}

// Hide main lessons view elements
function hideMainLessonsView() {
  const elementsToHide = [
    'lessons-hero',
    'lessons-filters',
    'lessonsGrid',
    'emptyState',
    'loadingState'
  ];
  
  elementsToHide.forEach(id => {
    const element = document.getElementById(id) || document.querySelector(`.${id}`);
    if (element) {
      element.style.display = 'none';
    }
  });
}

// Create lesson view
function createLessonView(lesson) {
  const container = document.querySelector('.lessons-container');
  if (!container) return;

  // Create lesson view HTML
  const lessonViewHTML = `
    <div class="lesson-view" id="lessonView">
      <!-- Back Navigation -->
      <div class="lesson-nav">
        <button class="back-btn" onclick="goBackToLessons()">
          <i class="fas fa-arrow-left"></i>
          Back to Lessons
        </button>
        <div class="lesson-nav-meta">
          <span class="lesson-nav-path">${lesson.pathName}</span>
          <span class="lesson-nav-separator">•</span>
          <span class="lesson-nav-level">${lesson.levelName}</span>
        </div>
      </div>

      <!-- Lesson Header -->
      <div class="lesson-view-header">
        <div class="lesson-view-badges">
          <span class="lesson-badge path">${lesson.pathName}</span>
          <span class="lesson-badge level">${lesson.levelName}</span>
          <span class="lesson-badge topic">${lesson.topicName}</span>
        </div>
        <h1 class="lesson-view-title">${lesson.title}</h1>
        <div class="lesson-view-meta">
          <div class="meta-item">
            <i class="fas fa-clock"></i>
            <span>${lesson.duration}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-calendar"></i>
            <span>${lesson.date}</span>
          </div>
          <div class="meta-item">
            <i class="fas fa-tag"></i>
            <span>${lesson.topicName}</span>
          </div>
        </div>
      </div>

      <!-- Lesson Content -->
      <div class="lesson-view-content" id="lessonViewContent">
        <!-- Rendered markdown content will appear here -->
      </div>

      <!-- Lesson Footer -->
      <div class="lesson-view-footer">
        <button class="btn ghost" onclick="goBackToLessons()">
          <i class="fas fa-arrow-left"></i>
          Back to Lessons
        </button>
        <button class="btn accent" onclick="markCurrentLessonAsCompleted('${lesson.id}')">
          <i class="fas fa-check"></i>
          ${lesson.completed ? 'Completed' : 'Mark as Complete'}
        </button>
      </div>
    </div>
  `;

  // Add styles for lesson view if not present
  addLessonViewStyles();

  // Insert the lesson view
  container.innerHTML = lessonViewHTML;

  // Render the lesson content
  renderLessonContent(lesson);
}

// Show lesson not found view
function showLessonNotFound(lessonName) {
  const container = document.querySelector('.lessons-container');
  if (!container) return;

  container.innerHTML = `
    <div class="lesson-not-found">
      <div class="not-found-content">
        <div class="not-found-icon">📚</div>
        <h1>Lesson Not Found</h1>
        <p>The lesson "${lessonName}" could not be found.</p>
        <div class="not-found-actions">
          <button class="btn accent" onclick="goBackToLessons()">
            <i class="fas fa-arrow-left"></i>
            Back to Lessons
          </button>
          <button class="btn ghost" onclick="window.location.hash = '#/'">
            <i class="fas fa-home"></i>
            Go Home
          </button>
        </div>
      </div>
    </div>
  `;

  // Add not found styles
  addLessonViewStyles();
}

// Render lesson content with markdown and LaTeX
function renderLessonContent(lesson) {
  const contentElement = document.getElementById('lessonViewContent');
  if (!contentElement) return;

  try {
    // Convert markdown to HTML
    let html = marked.parse(lesson.content);

    // Process LaTeX math
    html = processLatexMath(html);

    contentElement.innerHTML = html;

    // Render KaTeX math
    renderMathInElement(contentElement);
  } catch (error) {
    console.error('Error rendering lesson content:', error);
    contentElement.innerHTML = `<div style="color: red; padding: 20px;">
      <h3>Rendering Error</h3>
      <p>There was an error rendering the lesson content:</p>
      <pre>${error.message}</pre>
    </div>`;
  }
}

// Go back to lessons grid
function goBackToLessons() {
  window.location.hash = '#/lessons';
}

// Mark current lesson as completed
function markCurrentLessonAsCompleted(lessonId) {
  const lesson = lessonsData.find(l => l.id === lessonId);
  if (lesson) {
    lesson.completed = true;
    lesson.isNew = false;

    // Update localStorage if this is a guide
    if (lessonId.startsWith('lesson_')) {
      const guides = JSON.parse(localStorage.getItem('eduflash_guides') || '[]');
      const index = parseInt(lessonId.split('_')[1]);
      if (guides[index]) {
        guides[index].completed = true;
        localStorage.setItem('eduflash_guides', JSON.stringify(guides));
      }
    }

    // Update the button
    const completeBtn = document.querySelector('.lesson-view-footer .btn.accent');
    if (completeBtn) {
      completeBtn.innerHTML = '<i class="fas fa-check"></i> Completed';
      completeBtn.disabled = true;
      completeBtn.style.opacity = '0.7';
    }

    // Show notification
    showNotification('Lesson marked as completed! 🎉', 'success');
  }
}

// Add lesson view styles
function addLessonViewStyles() {
  if (document.querySelector('#lesson-view-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'lesson-view-styles';
  styles.textContent = `
    .lesson-view {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }

    .topic-lessons-view {
      padding: 24px;
    }

    .topic-lessons-nav,
    .lesson-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--stroke);
    }

    .topic-lessons-breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      color: var(--ink-dim);
    }

    .separator {
      color: var(--stroke);
    }

    .topic-lessons-header {
      text-align: center;
      margin-bottom: 48px;
    }

    .topic-lessons-header h1 {
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--ink);
      margin: 0 0 16px 0;
    }

    .topic-lessons-header p {
      color: var(--ink-dim);
      font-size: 1.1rem;
      margin: 0;
    }

    .topic-lessons-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }

    .back-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--glass);
      border: 2px solid var(--stroke);
      border-radius: var(--radius);
      color: var(--ink);
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: "Poppins", sans-serif;
      font-weight: 500;
    }

    .back-btn:hover {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }

    .lesson-nav-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      color: var(--ink-dim);
    }

    .lesson-nav-separator {
      color: var(--stroke);
    }

    .lesson-view-header {
      text-align: center;
      margin-bottom: 48px;
    }

    .lesson-view-badges {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .lesson-view-title {
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--ink);
      margin: 0 0 24px 0;
      line-height: 1.2;
    }

    .lesson-view-meta {
      display: flex;
      justify-content: center;
      gap: 24px;
      flex-wrap: wrap;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--ink-dim);
      font-size: 0.875rem;
    }

    .meta-item i {
      color: var(--accent);
    }

    .lesson-view-content {
      background: var(--glass);
      backdrop-filter: blur(20px);
      border: 2px solid var(--stroke);
      border-radius: var(--radius-lg);
      padding: 48px;
      margin-bottom: 32px;
      line-height: 1.8;
      font-size: 1rem;
    }

    .lesson-view-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 0;
      border-top: 1px solid var(--stroke);
    }

    .lesson-not-found {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      text-align: center;
    }

    .not-found-content {
      max-width: 400px;
    }

    .not-found-icon {
      font-size: 4rem;
      margin-bottom: 24px;
    }

    .lesson-not-found h1 {
      font-size: 2rem;
      color: var(--ink);
      margin: 0 0 16px 0;
    }

    .lesson-not-found p {
      color: var(--ink-dim);
      margin: 0 0 32px 0;
      font-size: 1.1rem;
    }

    .not-found-actions {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .lesson-view,
      .topic-lessons-view {
        padding: 16px;
      }

      .lesson-nav,
      .topic-lessons-nav {
        flex-direction: column;
        gap: 12px;
        align-items: flex-start;
      }

      .lesson-view-title {
        font-size: 2rem;
      }

      .topic-lessons-header h1 {
        font-size: 2rem;
      }

      .lesson-view-content {
        padding: 24px;
      }

      .lesson-view-footer {
        flex-direction: column;
        gap: 16px;
      }

      .lesson-view-meta {
        flex-direction: column;
        gap: 12px;
      }

      .not-found-actions {
        flex-direction: column;
      }

      .topic-lessons-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(styles);
}
