let allPaths = [];
let currentTopic = null;
let lessonData = null;
let userInteractions = {
  liked: false,
  disliked: false,
  reported: false
};

// Get session cookie for authentication
function getSessionCookie() {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'session' && value && value !== 'undefined') {
      return value;
    }
  }
  return null;
}

// Get the lesson name from the URL
function getLessonFromURL() {
  const hash = window.location.hash;
  const lessonMatch = hash.match(/^#\/lessons\/(.+)$/);
  return lessonMatch ? lessonMatch[1] : null;
}

// Find topic information by ID
function findTopicById(topicId) {
  for (const path of allPaths) {
    for (const level of path.levels) {
      for (const topic of level.topics) {
        if (topic.id === topicId) {
          return {
            topic,
            level,
            path,
            breadcrumb: `${path.name} > ${level.name} > ${topic.name}`
          };
        }
      }
    }
  }
  return null;
}

// Load external libraries for markdown and LaTeX rendering
async function loadExternalLibraries() {
  return new Promise((resolve) => {
    // Check if libraries are already loaded
    if (window.marked && window.katex && window.renderMathInElement) {
      resolve();
      return;
    }

    // Wait for all scripts to load
    const checkLibraries = setInterval(() => {
      if (window.marked && window.katex && window.renderMathInElement) {
        clearInterval(checkLibraries);
        
        // Configure marked options
        marked.setOptions({
          highlight: function (code, lang) {
            return code; // Basic syntax highlighting placeholder
          },
          breaks: true,
          gfm: true
        });
        
        resolve();
      }
    }, 100);
  });
}

// Process LaTeX math expressions in HTML
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
  if (!window.katex) return;

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

// Render markdown content with LaTeX support
function renderMarkdownContent(markdownText) {
  try {
    // First convert markdown to HTML
    let html = marked.parse(markdownText);
    
    // Then process LaTeX math
    html = processLatexMath(html);
    
    return html;
  } catch (error) {
    console.error('Error rendering markdown:', error);
    return `<div style="color: red; padding: 20px;">
      <h3>Rendering Error</h3>
      <p>There was an error rendering this lesson:</p>
      <pre>${error.message}</pre>
    </div>`;
  }
}

// Fetch lesson content from backend
async function fetchLessonContent(topicId) {
  try {
    const response = await fetch(`/api/lessons/${topicId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include' // Include cookies for authentication
    });

    if (response.status === 404) {
      return null; // Lesson not found
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching lesson:', error);
    
    // For development/demo purposes, return mock data if the backend isn't available
    if (error.message.includes('Failed to fetch') || error.message.includes('404')) {
      return getMockLesson(topicId);
    }
    
    throw error;
  }
}

// Like/dislike functionality
async function toggleLike() {
  if (!lessonData || !lessonData.hash) return;
  
  const sessionToken = getSessionCookie();
  if (!sessionToken) {
    alert('Please log in to like this lesson.');
    return;
  }

  try {
    const response = await fetch('/api/lesson/like', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hash: lessonData.hash,
        action: userInteractions.liked ? 'unlike' : 'like'
      }),
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      userInteractions.liked = !userInteractions.liked;
      
      // If user liked, remove dislike if present
      if (userInteractions.liked && userInteractions.disliked) {
        userInteractions.disliked = false;
        document.getElementById('dislikeBtn').classList.remove('active');
      }
      
      updateLikeDislikeButtons();
      updateLessonStats(data);
    }
  } catch (error) {
    console.error('Error liking lesson:', error);
    // Show mock feedback for development
    userInteractions.liked = !userInteractions.liked;
    updateLikeDislikeButtons();
    showNotification(userInteractions.liked ? 'Lesson liked!' : 'Like removed', 'success');
  }
}

async function toggleDislike() {
  if (!lessonData || !lessonData.hash) return;
  
  const sessionToken = getSessionCookie();
  if (!sessionToken) {
    alert('Please log in to dislike this lesson.');
    return;
  }

  try {
    const response = await fetch('/api/lesson/dislike', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hash: lessonData.hash,
        action: userInteractions.disliked ? 'undislike' : 'dislike'
      }),
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      userInteractions.disliked = !userInteractions.disliked;
      
      // If user disliked, remove like if present
      if (userInteractions.disliked && userInteractions.liked) {
        userInteractions.liked = false;
        document.getElementById('likeBtn').classList.remove('active');
      }
      
      updateLikeDislikeButtons();
      updateLessonStats(data);
    }
  } catch (error) {
    console.error('Error disliking lesson:', error);
    // Show mock feedback for development
    userInteractions.disliked = !userInteractions.disliked;
    updateLikeDislikeButtons();
    showNotification(userInteractions.disliked ? 'Lesson disliked' : 'Dislike removed', 'info');
  }
}

// Report lesson functionality
async function reportLesson(reason, comment) {
  if (!lessonData || !lessonData.hash) return;
  
  const sessionToken = getSessionCookie();
  if (!sessionToken) {
    alert('Please log in to report this lesson.');
    return;
  }

  try {
    const response = await fetch('/api/lesson/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hash: lessonData.hash,
        reason: reason,
        comment: comment
      }),
      credentials: 'include'
    });

    if (response.ok) {
      userInteractions.reported = true;
      showNotification('Thank you for your report. We will review the content.', 'success');
      document.getElementById('reportBtn').disabled = true;
      document.getElementById('reportBtn').innerHTML = '<i class="fas fa-check"></i>';
    }
  } catch (error) {
    console.error('Error reporting lesson:', error);
    // Show mock feedback for development
    userInteractions.reported = true;
    showNotification('Report submitted successfully (demo mode)', 'success');
    document.getElementById('reportBtn').disabled = true;
  }
}

// Fetch related lessons
async function fetchRelatedLessons(currentTopicId) {
  try {
    const response = await fetch(`/api/lessons/related/${currentTopicId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      return data.lessons || [];
    }
  } catch (error) {
    console.error('Error fetching related lessons:', error);
  }
  
  // Return mock related lessons for development
  return getMockRelatedLessons(currentTopicId);
}

function getMockRelatedLessons(currentTopicId) {
  const mockRelated = {
    'addition': [
      { id: 'subtraction', title: 'Subtraction Basics', views: 150 },
      { id: 'multiplication', title: 'Multiplication Tables', views: 200 }
    ],
    'algebra': [
      { id: 'pre-calculus', title: 'Pre-calculus Fundamentals', views: 180 },
      { id: 'calculus', title: 'Introduction to Calculus', views: 220 }
    ]
  };
  
  return mockRelated[currentTopicId] || [];
}

// Mock lesson data for development/testing
function getMockLesson(topicId) {
  const mockLessons = {
    'addition': {
      title: 'Addition Basics',
      hash: 'mock_hash_add123',
      likes: 15,
      dislikes: 2,
      views: 150,
      owner: 'teacher_alice',
      topic: 'addition',
      content: `# Addition Basics

## What is Addition?

Addition is one of the four basic arithmetic operations. It combines two or more numbers to find their **total** or **sum**.

### Mathematical Notation

When we add numbers, we use the plus sign (+):

$$a + b = c$$

Where:
- $a$ and $b$ are the **addends**
- $c$ is the **sum**

## Examples

### Simple Addition
$3 + 2 = 5$

### Adding Multiple Numbers
$1 + 2 + 3 + 4 = 10$

### Real-World Example
If you have 3 apples and someone gives you 2 more apples, you now have:
$3 + 2 = 5$ apples

## Practice Problems

Try solving these:
1. $5 + 3 = ?$
2. $7 + 1 = ?$
3. $2 + 4 + 1 = ?$

*Answers: 8, 8, 7*

## Next Steps

Once you master basic addition, you can move on to:
- Adding larger numbers
- Addition with carrying
- Adding decimals and fractions`
    },
    'algebra': {
      title: 'Introduction to Algebra',
      hash: 'mock_hash_alg456',
      likes: 28,
      dislikes: 3,
      views: 320,
      owner: 'prof_mathematics',
      topic: 'algebra',
      content: `# Introduction to Algebra

## What is Algebra?

Algebra is a branch of mathematics that uses **variables** (letters) to represent unknown numbers and studies the relationships between quantities.

### Variables and Expressions

A **variable** is a symbol (usually a letter) that represents an unknown number:
- $x$, $y$, $z$ are common variables
- $a$, $b$, $c$ are often used for constants

An **algebraic expression** combines variables, numbers, and operations:
$$2x + 3$$
$$x^2 - 4x + 1$$

### Equations

An **equation** states that two expressions are equal:
$$x + 5 = 12$$
$$2x - 3 = 7$$

## Solving Linear Equations

To solve for $x$ in $x + 5 = 12$:

1. Subtract 5 from both sides:
   $$x + 5 - 5 = 12 - 5$$
   $$x = 7$$

2. Check: $7 + 5 = 12$ ✓

### Another Example

Solve $2x - 3 = 7$:

1. Add 3 to both sides:
   $$2x - 3 + 3 = 7 + 3$$
   $$2x = 10$$

2. Divide both sides by 2:
   $$\\frac{2x}{2} = \\frac{10}{2}$$
   $$x = 5$$

3. Check: $2(5) - 3 = 10 - 3 = 7$ ✓

## Key Principles

1. **Balance**: What you do to one side, do to the other
2. **Inverse operations**: Use opposite operations to isolate the variable
3. **Order of operations**: Follow PEMDAS/BODMAS

## Practice

Try solving these equations:
1. $x + 8 = 15$
2. $3x = 21$
3. $x - 4 = 9$

*Answers: x = 7, x = 7, x = 13*`
    }
  };

  // Return mock lesson if available, otherwise null
  return mockLessons[topicId] || null;
}

// Show loading state
function showLoading() {
  document.getElementById('loadingState').style.display = 'block';
  document.getElementById('errorState').style.display = 'none';
  document.getElementById('lessonContent').style.display = 'none';
}

// Show error state
function showError() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('errorState').style.display = 'block';
  document.getElementById('lessonContent').style.display = 'none';
}

// Show lesson content
function showLessonContent(lesson) {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('errorState').style.display = 'none';
  document.getElementById('lessonContent').style.display = 'block';

  // Update lesson title
  document.getElementById('lessonTitle').textContent = lesson.title;

  // Update lesson stats
  document.getElementById('viewCount').textContent = lesson.views || 0;
  document.getElementById('authorName').textContent = lesson.owner || 'Unknown';
  document.getElementById('likeCount').textContent = lesson.likes || 0;
  document.getElementById('dislikeCount').textContent = lesson.dislikes || 0;

  // Render the lesson content
  const renderedContent = document.getElementById('renderedContent');
  const html = renderMarkdownContent(lesson.content);
  renderedContent.innerHTML = html;

  // Render math equations
  renderMathInElement(renderedContent);

  // Update lesson metadata if available
  if (lesson.views !== undefined) {
    document.getElementById('progressText').textContent = `${lesson.views} views`;
  } else {
    document.getElementById('progressText').textContent = 'Lesson Complete';
  }
  document.getElementById('progressFill').style.width = '100%';

  // Store lesson data for potential future features (likes, etc.)
  window.currentLessonData = {
    hash: lesson.hash,
    likes: lesson.likes || 0,
    dislikes: lesson.dislikes || 0,
    views: lesson.views || 0,
    owner: lesson.owner,
    topic: lesson.topic
  };

  // Load related lessons
  loadRelatedLessons(lesson.topic);

  // Setup lesson interaction buttons
  setupLessonInteractions();
}

// Update lesson stats after user interaction
function updateLessonStats(newStats) {
  if (newStats.likes !== undefined) {
    document.getElementById('likeCount').textContent = newStats.likes;
    window.currentLessonData.likes = newStats.likes;
  }
  if (newStats.dislikes !== undefined) {
    document.getElementById('dislikeCount').textContent = newStats.dislikes;
    window.currentLessonData.dislikes = newStats.dislikes;
  }
  if (newStats.views !== undefined) {
    document.getElementById('viewCount').textContent = newStats.views;
    window.currentLessonData.views = newStats.views;
  }
}

// Update like/dislike button states
function updateLikeDislikeButtons() {
  const likeBtn = document.getElementById('likeBtn');
  const dislikeBtn = document.getElementById('dislikeBtn');
  
  likeBtn.classList.toggle('active', userInteractions.liked);
  dislikeBtn.classList.toggle('active', userInteractions.disliked);
}

// Load and display related lessons
async function loadRelatedLessons(topicId) {
  try {
    const relatedLessons = await fetchRelatedLessons(topicId);
    if (relatedLessons && relatedLessons.length > 0) {
      displayRelatedLessons(relatedLessons);
    }
  } catch (error) {
    console.error('Error loading related lessons:', error);
  }
}

// Display related lessons
function displayRelatedLessons(lessons) {
  const relatedSection = document.getElementById('relatedLessons');
  const relatedList = document.getElementById('relatedLessonsList');
  
  relatedList.innerHTML = '';
  
  lessons.forEach(lesson => {
    const lessonCard = document.createElement('div');
    lessonCard.className = 'related-lesson-card';
    lessonCard.innerHTML = `
      <h4>${lesson.title}</h4>
      <div class="lesson-meta">
        <span><i class="fas fa-eye"></i> ${lesson.views} views</span>
      </div>
    `;
    
    lessonCard.addEventListener('click', () => {
      window.location.href = `#/lessons/${lesson.id}`;
    });
    
    relatedList.appendChild(lessonCard);
  });
  
  relatedSection.style.display = 'block';
}

// Setup lesson interaction buttons
function setupLessonInteractions() {
  // Like button
  document.getElementById('likeBtn').addEventListener('click', toggleLike);
  
  // Dislike button
  document.getElementById('dislikeBtn').addEventListener('click', toggleDislike);
  
  // Report button
  document.getElementById('reportBtn').addEventListener('click', () => {
    if (!userInteractions.reported) {
      showReportModal();
    }
  });
  
  // Share button
  document.getElementById('shareBtn').addEventListener('click', showShareModal);
}

// Show notification
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

  document.body.appendChild(notification);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

// Show report modal
function showReportModal() {
  document.getElementById('reportModal').style.display = 'flex';
  
  // Setup report modal events
  document.getElementById('closeReportModal').addEventListener('click', closeReportModal);
  document.getElementById('cancelReport').addEventListener('click', closeReportModal);
  document.getElementById('submitReport').addEventListener('click', submitReport);
}

// Close report modal
function closeReportModal() {
  document.getElementById('reportModal').style.display = 'none';
  // Reset form
  document.querySelectorAll('input[name="reportReason"]').forEach(radio => radio.checked = false);
  document.getElementById('reportComment').value = '';
}

// Submit report
function submitReport() {
  const selectedReason = document.querySelector('input[name="reportReason"]:checked');
  if (!selectedReason) {
    alert('Please select a reason for reporting.');
    return;
  }
  
  const reason = selectedReason.value;
  const comment = document.getElementById('reportComment').value;
  
  reportLesson(reason, comment);
  closeReportModal();
}

// Show share modal
function showShareModal() {
  const currentUrl = window.location.href;
  document.getElementById('shareLink').value = currentUrl;
  document.getElementById('shareModal').style.display = 'flex';
  
  // Setup share modal events
  document.getElementById('closeShareModal').addEventListener('click', closeShareModal);
  document.getElementById('copyLinkBtn').addEventListener('click', copyShareLink);
  
  // Social sharing buttons
  document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const platform = e.currentTarget.dataset.platform;
      shareOnSocialMedia(platform, currentUrl, lessonData.title);
    });
  });
}

// Close share modal
function closeShareModal() {
  document.getElementById('shareModal').style.display = 'none';
}

// Copy share link
function copyShareLink() {
  const shareLink = document.getElementById('shareLink');
  shareLink.select();
  document.execCommand('copy');
  showNotification('Link copied to clipboard!', 'success');
}

// Share on social media
function shareOnSocialMedia(platform, url, title) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(`Check out this lesson: ${title}`);
  
  let shareUrl;
  switch (platform) {
    case 'twitter':
      shareUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
      break;
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
      break;
    case 'reddit':
      shareUrl = `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;
      break;
    default:
      return;
  }
  
  window.open(shareUrl, '_blank', 'width=600,height=400');
}

// Update breadcrumb navigation
function updateNavigation() {
  if (currentTopic) {
    document.getElementById('lessonPath').textContent = currentTopic.breadcrumb;
  }
}

// Handle back button
function setupBackButton() {
  const backBtn = document.getElementById('backBtn');
  backBtn.addEventListener('click', () => {
    if (currentTopic) {
      // Navigate back to the topics page for the current path
      window.location.href = `#/topics/${currentTopic.path.id}`;
    } else {
      // Fallback to paths page
      window.location.href = '#/paths';
    }
  });
}

// Handle create lesson button
function setupCreateLessonButton() {
  const createBtn = document.getElementById('createLessonBtn');
  createBtn.addEventListener('click', () => {
    // Navigate to create page with the current topic pre-selected
    if (currentTopic) {
      const pathName = currentTopic.path.name;
      const levelName = currentTopic.level.name;
      const topicName = currentTopic.topic.name;
      // Encode the topic information in the URL
      window.location.href = `#/create?path=${encodeURIComponent(pathName)}&level=${encodeURIComponent(levelName)}&topic=${encodeURIComponent(topicName)}`;
    } else {
      window.location.href = '#/create';
    }
  });
}

// Handle back to topics button in error state
function setupBackToTopicsButton() {
  const backToTopicsBtn = document.getElementById('backToTopicsBtn');
  backToTopicsBtn.addEventListener('click', () => {
    if (currentTopic) {
      window.location.href = `#/topics/${currentTopic.path.id}`;
    } else {
      window.location.href = '#/paths';
    }
  });
}

// Initialize the lessons page
async function initializeLessonsPage() {
  try {
    // Load external libraries first
    await loadExternalLibraries();

    // Show loading state
    showLoading();

    // Load paths data
    const response = await fetch('/static/data/paths.json');
    const pathsData = await response.json();
    allPaths = pathsData.paths;

    // Get lesson ID from URL
    const lessonId = getLessonFromURL();
    if (!lessonId) {
      showError();
      return;
    }

    // Find topic information
    currentTopic = findTopicById(lessonId);
    if (!currentTopic) {
      showError();
      return;
    }

    // Update navigation
    updateNavigation();

    // Fetch lesson content
    lessonData = await fetchLessonContent(lessonId);
    
    if (!lessonData) {
      showError();
      return;
    }

    // Show the lesson
    showLessonContent(lessonData);

  } catch (error) {
    console.error('Error initializing lessons page:', error);
    showError();
  }
}

// Setup event listeners
function setupEventListeners() {
  setupBackButton();
  setupCreateLessonButton();
  setupBackToTopicsButton();
}

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initializeLessonsPage();
});

// Re-initialize when navigating to this page via router
if (window.routeParams) {
  setupEventListeners();
  initializeLessonsPage();
}
