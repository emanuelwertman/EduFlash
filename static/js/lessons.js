let currentTopic = null;
let lessonData = null;


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


// Get the topic from the URL
function getTopicFromURL() {
 const hash = window.location.hash;
 const topicMatch = hash.match(/^#\/lessons\/(.+)$/);
 return topicMatch ? decodeURIComponent(topicMatch[1]) : null;
}

function parseQuery(text) {
 try {
   const originalText = text; // Save for debugging
   // Remove outer parentheses
   text = text.substring(1, text.length - 1);

   let arr = [];
   let parts = [];
   
   // Split by commas but be careful with commas inside JSON/strings
   // First, let's count how many top-level comma-separated parts we have
   let depth = 0;
   let currentPart = '';
   let inString = false;
   let stringChar = null;
   
   for (let i = 0; i < text.length; i++) {
     const char = text[i];
     const prevChar = i > 0 ? text[i-1] : null;
     
     if ((char === '"' || char === "'") && prevChar !== '\\') {
       if (!inString) {
         inString = true;
         stringChar = char;
       } else if (char === stringChar) {
         inString = false;
         stringChar = null;
       }
     }
     
     if (!inString) {
       if (char === '{' || char === '[') depth++;
       if (char === '}' || char === ']') depth--;
       
       if (char === ',' && depth === 0) {
         parts.push(currentPart.trim());
         currentPart = '';
         continue;
       }
     }
     
     currentPart += char;
   }
   
   if (currentPart) {
     parts.push(currentPart.trim());
   }
   
   console.log('Parts found:', parts.length, parts);
   
   // Now parse based on how many parts we have
   // Expected: hash, owner, likes, dislikes, reports, views, lessonTopic, title (8 parts)
   
   if (parts.length === 8) {
     // Full format: hash, owner, likes, dislikes, reports, views, lessonTopic, title
     arr.push(parts[0].replace(/^["']|["']$/g, '')); // hash
     arr.push(parts[1].replace(/^["']|["']$/g, '')); // owner
     arr.push(parseInt(parts[2])); // likes
     arr.push(parseInt(parts[3])); // dislikes
     // Skip parts[4] (reports) and parts[5] (views)
     const cleanedJson = parts[6].replace(/^["']|["']$/g, '').replaceAll("'", '"');
     arr.push(JSON.parse(cleanedJson)); // lessonTopic
     arr.push(parts[7].replace(/^["']|["']$/g, '')); // title
   } else if (parts.length === 4) {
     // Incomplete format: likes, dislikes, lessonTopic, title (missing hash, owner, reports, views)
     arr.push(''); // hash - empty
     arr.push(''); // owner - empty
     arr.push(parseInt(parts[0])); // likes
     arr.push(parseInt(parts[1])); // dislikes
     // No reports/views to skip
     const cleanedJson = parts[2].replace(/^["']|["']$/g, '').replaceAll("'", '"');
     arr.push(JSON.parse(cleanedJson)); // lessonTopic
     arr.push(parts[3].replace(/^["']|["']$/g, '')); // title
   } else if (parts.length === 5) {
     // Incomplete format: owner, likes, dislikes, lessonTopic, title (missing hash, reports, views)
     arr.push(''); // hash - empty
     arr.push(parts[0].replace(/^["']|["']$/g, '')); // owner
     arr.push(parseInt(parts[1])); // likes
     arr.push(parseInt(parts[2])); // dislikes
     // No reports/views to skip
     const cleanedJson = parts[3].replace(/^["']|["']$/g, '').replaceAll("'", '"');
     arr.push(JSON.parse(cleanedJson)); // lessonTopic
     arr.push(parts[4].replace(/^["']|["']$/g, '')); // title
   } else {
     console.warn('Unexpected number of parts:', parts.length, 'from:', originalText);
     // Return safe defaults
     return ['', '', 0, 0, {}, ''];
   }
   
   console.log('Parsed title:', arr[5], 'from original:', originalText);
   return arr;
 } catch (error) {
   console.error('Error parsing query:', error, 'Original text:', text);
   // Return a safe default structure
   return ['', '', 0, 0, {}, ''];
 }
}


// Search for lessons by topic using the backend API
async function searchLessonsByTopic(topic) {
 try {
   const searchData = {
     topic: topic
   };

   const response = await fetch('/api/search', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
     },
     body: JSON.stringify(searchData)
   });

   if (!response.ok) {
     throw new Error(`HTTP error! status: ${response.status}`);
   }

   let results = await response.json();
   for (let i = 0; i < results.length; i++) {
     results[i] = parseQuery(results[i][0]);
   }
   return results;
 } catch (error) {
   console.error('Error searching lessons by topic:', error);
   throw error;
 }
}


// Fetch lesson content by hash (filename)
async function fetchLessonContentByHash(hash) {
 try {
   const response = await fetch(`/pages/${hash}`, {
     method: 'GET',
     headers: {
       'Content-Type': 'text/plain',
     }
   });


   if (!response.ok) {
     throw new Error(`HTTP error! status: ${response.status}`);
   }


   const content = await response.text();
   return content;
 } catch (error) {
   console.error('Error fetching lesson content:', error);
   throw error;
 }
}


// Load lesson for the current topic
async function loadLessonForTopic(topic) {
 try {
   showLoading();
  
   // Search for lessons by topic
   const searchResults = await searchLessonsByTopic(topic);
  
   if (!searchResults || searchResults.length === 0) {
     showError();
     return;
   }

   console.log(searchResults);
  
   // Show lesson selection if multiple results
   if (searchResults.length > 1) {
     showLessonSelection(searchResults, topic);
   } else {
     // Load single lesson directly
     const [hash, owner, likes, dislikes, lessonTopic, title] = searchResults[0];
     await loadSingleLesson(hash, title || 'Untitled Lesson', lessonTopic || topic, owner || 'Anonymous');
   }
  
 } catch (error) {
   console.error('Error loading lesson for topic:', error);
   showError();
 }
}


// Show lesson selection interface
function showLessonSelection(searchResults, topic) {
 document.getElementById('loadingState').style.display = 'none';
 document.getElementById('errorState').style.display = 'none';
 document.getElementById('lessonContent').style.display = 'none';
 
 // Create lesson selection container if it doesn't exist
 let selectionContainer = document.getElementById('lessonSelection');
 if (!selectionContainer) {
   selectionContainer = document.createElement('div');
   selectionContainer.id = 'lessonSelection';
   selectionContainer.className = 'lesson-selection-container glass';
   document.querySelector('.lessons-container').appendChild(selectionContainer);
 }
 
 selectionContainer.style.display = 'block';
 selectionContainer.innerHTML = `
   <div class="selection-header">
     <h2>Choose a Lesson</h2>
     <p>We found ${searchResults.length} lessons for topic: <strong>${topic}</strong></p>
   </div>
   <div class="lesson-options">
     ${searchResults.map((result, index) => {
       const [hash, owner, likes, dislikes, lessonTopic, title] = result;
       return `
         <div class="lesson-option" data-index="${index}">
           <div class="lesson-option-content">
             <h3 class="lesson-option-title">${title || 'Untitled Lesson'}</h3>
             <p class="lesson-option-author">by ${owner || 'Anonymous'}</p>
           </div>
           <button class="select-lesson-btn" data-hash="${hash}" data-title="${title || 'Untitled Lesson'}" 
                   data-topic="${lessonTopic || topic}" data-owner="${owner || 'Anonymous'}">
             Select Lesson
           </button>
         </div>
       `;
     }).join('')}
   </div>
 `;
 
 // Add click handlers for lesson selection
 const selectButtons = selectionContainer.querySelectorAll('.select-lesson-btn');
 selectButtons.forEach(button => {
   button.addEventListener('click', async (e) => {
     const hash = e.target.dataset.hash;
     const title = e.target.dataset.title;
     const topic = e.target.dataset.topic;
     const owner = e.target.dataset.owner;
     
     selectionContainer.style.display = 'none';
     await loadSingleLesson(hash, title, topic, owner);
   });
 });
}


// Load a single lesson by hash
async function loadSingleLesson(hash, title, topic, owner) {
 try {
   showLoading();
   
   // Fetch lesson content
   const content = await fetchLessonContentByHash(hash);
   
   // Fetch metrics from the new API endpoint
   let metrics = {
     likes: 0,
     dislikes: 0,
     rating: 'N/A'
   };
   
   try {
     const metricsResponse = await fetch(`/api/metrics`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({ hash: hash })
     });
     
     if (metricsResponse.ok) {
       const data = await metricsResponse.json();
       metrics = {
         likes: data.likes || 0,
         dislikes: data.dislikes || 0,
         rating: data.rating || 'N/A'
       };
     }
   } catch (error) {
     console.error('Error fetching lesson metrics:', error);
     // Proceed anyway with default values
   }
   
   // Create lesson data object
   lessonData = {
     hash: hash,
     title: title,
     topic: topic,
     owner: owner,
     content: content,
     likes: metrics.likes,
     dislikes: metrics.dislikes,
     rating: metrics.rating
   };
   
   // Show the lesson
   showLessonContent(lessonData);
   
 } catch (error) {
   console.error('Error loading single lesson:', error);
   showError();
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


// Show loading state
function showLoading() {
 const loadingState = document.getElementById('loadingState');
 if (loadingState) loadingState.style.display = 'block';
 
 const errorState = document.getElementById('errorState');
 if (errorState) errorState.style.display = 'none';
 
 const lessonContent = document.getElementById('lessonContent');
 if (lessonContent) lessonContent.style.display = 'none';
}


// Show error state
function showError() {
 const loadingState = document.getElementById('loadingState');
 if (loadingState) loadingState.style.display = 'none';
 
 const errorState = document.getElementById('errorState');
 if (errorState) errorState.style.display = 'block';
 
 const lessonContent = document.getElementById('lessonContent');
 if (lessonContent) lessonContent.style.display = 'none';
}


// Show lesson content
function showLessonContent(lesson) {
 const loadingState = document.getElementById('loadingState');
 if (loadingState) loadingState.style.display = 'none';
 
 const errorState = document.getElementById('errorState');
 if (errorState) errorState.style.display = 'none';
 
 const lessonContent = document.getElementById('lessonContent');
 if (lessonContent) lessonContent.style.display = 'block';


 // Update lesson title (with null check)
 const lessonTitleElement = document.getElementById('lessonTitle');
 if (lessonTitleElement) {
   lessonTitleElement.textContent = lesson.title;
 }
 
 const lessonPathElement = document.getElementById('lessonPath');
 if (lessonPathElement) {
   lessonPathElement.textContent = `Topic: ${currentTopic || lesson.topic || 'Unknown'}`;
 }

 // Render the lesson content
 const renderedContent = document.getElementById('renderedContent');
 if (renderedContent) {
   const html = renderMarkdownContent(lesson.content);
   renderedContent.innerHTML = html;
   
   // Render math equations
   renderMathInElement(renderedContent);
 }
 
 // Update all stats in the UI
 updateStatsDisplay();
 
 // Setup share button
 setupShareButton();
 
 // Setup like and dislike buttons
 setupLikeDislikeButtons();
 
 // Setup navigation buttons
 setupNavigationButtons();
}


// Update all stats in the display
function updateStatsDisplay() {
  if (!lessonData) return;
  
  const likeCountElement = document.getElementById('likeCount');
  const dislikeCountElement = document.getElementById('dislikeCount');
  const ratingValueElement = document.getElementById('ratingValue');
  
  if (likeCountElement) {
    likeCountElement.textContent = lessonData.likes || 0;
  }
  
  if (dislikeCountElement) {
    dislikeCountElement.textContent = lessonData.dislikes || 0;
  }
  
  if (ratingValueElement) {
    ratingValueElement.textContent = lessonData.rating || 'N/A';
  }
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


// Show share modal
function showShareModal() {
 const currentUrl = window.location.href;
 const shareLink = document.getElementById('shareLink');
 if (shareLink) {
   shareLink.value = currentUrl;
 }
 
 const shareModal = document.getElementById('shareModal');
 if (shareModal) {
   shareModal.style.display = 'flex';
 }
 
 // Setup share modal events
 const closeShareModalBtn = document.getElementById('closeShareModal');
 if (closeShareModalBtn) {
   closeShareModalBtn.addEventListener('click', closeShareModal);
 }
 
 const copyLinkBtn = document.getElementById('copyLinkBtn');
 if (copyLinkBtn) {
   copyLinkBtn.addEventListener('click', copyShareLink);
 }
 
 // Social sharing buttons
 document.querySelectorAll('.social-btn').forEach(btn => {
   btn.addEventListener('click', (e) => {
     const platform = e.currentTarget.dataset.platform;
     shareOnSocialMedia(platform, currentUrl, lessonData ? lessonData.title : 'Lesson');
   });
 });
}


// Close share modal
function closeShareModal() {
 const shareModal = document.getElementById('shareModal');
 if (shareModal) {
   shareModal.style.display = 'none';
 }
}


// Copy share link
function copyShareLink() {
 const shareLink = document.getElementById('shareLink');
 if (shareLink) {
   shareLink.select();
   document.execCommand('copy');
   showNotification('Link copied to clipboard!', 'success');
 }
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


// Setup share button interaction
function setupShareButton() {
 const shareBtn = document.getElementById('shareBtn');
 if (shareBtn) {
   shareBtn.addEventListener('click', showShareModal);
 }
}

// Setup navigation buttons (prev/next lesson)
function setupNavigationButtons() {
  const prevBtn = document.getElementById('prevLessonBtn');
  const nextBtn = document.getElementById('nextLessonBtn');
  
  // For now, hide them as we don't have lesson sequence data
  // In the future, you can implement lesson navigation based on topic structure
  if (prevBtn) {
    prevBtn.style.display = 'none';
  }
  if (nextBtn) {
    nextBtn.style.display = 'none';
  }
}


// Handle back button
function setupBackButton() {
 const backBtn = document.getElementById('backBtn');
 if (backBtn) {
   backBtn.textContent = '← Back to Paths';
   backBtn.addEventListener('click', () => {
     // Navigate back to the topics page - you may need to adjust this based on your routing
     window.location.href = '#/paths';
   });
 }
}


// Handle create lesson button
function setupCreateLessonButton() {
 const createBtn = document.getElementById('createLessonBtn');
 if (createBtn) {
   createBtn.addEventListener('click', () => {
     window.location.href = '#/create';
   });
 }
}


// Handle back to topics button in error state
function setupBackToTopicsButton() {
 const backToTopicsBtn = document.getElementById('backToTopicsBtn');
 if (backToTopicsBtn) {
   backToTopicsBtn.textContent = '← Back to Paths';
   backToTopicsBtn.addEventListener('click', () => {
     window.location.href = '#/paths';
   });
 }
}


// Initialize the lessons page
async function initializeLessonsPage() {
 try {
   // Load external libraries first
   await loadExternalLibraries();

   // Setup button handlers first (before loading content)
   setupBackButton();
   setupCreateLessonButton();
   setupBackToTopicsButton();

   // Get topic from URL
   const topic = getTopicFromURL();
  
   if (!topic) {
     showError();
     return;
   }


   // Store the current topic
   currentTopic = topic;


   // Load lesson for this topic
  await loadLessonForTopic(topic);


 } catch (error) {
   console.error('Error initializing lessons page:', error);
   showError();
 }
}


// Set up like and dislike buttons
function setupLikeDislikeButtons() {
  const likeBtn = document.getElementById('likeBtn');
  const dislikeBtn = document.getElementById('dislikeBtn');
  
  if (!likeBtn || !dislikeBtn || !lessonData) return;
  
  // Remove any existing listeners by cloning
  const newLikeBtn = likeBtn.cloneNode(true);
  const newDislikeBtn = dislikeBtn.cloneNode(true);
  likeBtn.parentNode.replaceChild(newLikeBtn, likeBtn);
  dislikeBtn.parentNode.replaceChild(newDislikeBtn, dislikeBtn);
  
  // Check user's current interaction state
  const userLikes = JSON.parse(localStorage.getItem('userLikes') || '{}');
  const userDislikes = JSON.parse(localStorage.getItem('userDislikes') || '{}');
  
  if (userLikes[lessonData.hash]) {
    newLikeBtn.classList.add('active');
  }
  
  if (userDislikes[lessonData.hash]) {
    newDislikeBtn.classList.add('active');
  }
  
  // Add click handlers
  newLikeBtn.addEventListener('click', () => handleLikeClick());
  newDislikeBtn.addEventListener('click', () => handleDislikeClick());
}

// Handle like button click
async function handleLikeClick() {
  if (!lessonData || !lessonData.hash) return;
  
  const sessionCookie = getSessionCookie();
  if (!sessionCookie) {
    showNotification('Please log in to like this lesson.', 'error');
    return;
  }
  
  const likeBtn = document.getElementById('likeBtn');
  const dislikeBtn = document.getElementById('dislikeBtn');
  
  const userLikes = JSON.parse(localStorage.getItem('userLikes') || '{}');
  const userDislikes = JSON.parse(localStorage.getItem('userDislikes') || '{}');
  
  const wasLiked = userLikes[lessonData.hash];
  const wasDisliked = userDislikes[lessonData.hash];
  
  if (wasLiked) {
    // Unlike - just update UI locally (no server endpoint for unlike)
    delete userLikes[lessonData.hash];
    localStorage.setItem('userLikes', JSON.stringify(userLikes));
    likeBtn.classList.remove('active');
    showNotification('Like removed', 'info');
    return;
  }
  
  // Send like to server
  try {
    const response = await fetch('/api/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: sessionCookie, hash: lessonData.hash })
    });
    
    if (!response.ok) throw new Error('Failed to like');
    
    // Update local state - add like and remove any dislike
    userLikes[lessonData.hash] = true;
    if (wasDisliked) {
      delete userDislikes[lessonData.hash];
    }
    localStorage.setItem('userLikes', JSON.stringify(userLikes));
    localStorage.setItem('userDislikes', JSON.stringify(userDislikes));
    
    // Update UI
    likeBtn.classList.add('active');
    dislikeBtn.classList.remove('active');
    
    // Fetch fresh stats from server
    await fetchAndUpdateStats();
    
    showNotification('Lesson liked!', 'success');
  } catch (error) {
    console.error('Error liking:', error);
    showNotification('Could not like. Please try again.', 'error');
  }
}

// Handle dislike button click
async function handleDislikeClick() {
  if (!lessonData || !lessonData.hash) return;
  
  const sessionCookie = getSessionCookie();
  if (!sessionCookie) {
    showNotification('Please log in to dislike this lesson.', 'error');
    return;
  }
  
  const likeBtn = document.getElementById('likeBtn');
  const dislikeBtn = document.getElementById('dislikeBtn');
  
  const userLikes = JSON.parse(localStorage.getItem('userLikes') || '{}');
  const userDislikes = JSON.parse(localStorage.getItem('userDislikes') || '{}');
  
  const wasDisliked = userDislikes[lessonData.hash];
  const wasLiked = userLikes[lessonData.hash];
  
  if (wasDisliked) {
    // Remove dislike - just update UI locally
    delete userDislikes[lessonData.hash];
    localStorage.setItem('userDislikes', JSON.stringify(userDislikes));
    dislikeBtn.classList.remove('active');
    showNotification('Dislike removed', 'info');
    return;
  }
  
  // Send dislike to server
  try {
    const response = await fetch('/api/dislike', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: sessionCookie, hash: lessonData.hash })
    });
    
    if (!response.ok) throw new Error('Failed to dislike');
    
    // Update local state - add dislike and remove any like
    userDislikes[lessonData.hash] = true;
    if (wasLiked) {
      delete userLikes[lessonData.hash];
    }
    localStorage.setItem('userLikes', JSON.stringify(userLikes));
    localStorage.setItem('userDislikes', JSON.stringify(userDislikes));
    
    // Update UI
    dislikeBtn.classList.add('active');
    likeBtn.classList.remove('active');
    
    // Fetch fresh stats from server
    await fetchAndUpdateStats();
    
    showNotification('Feedback recorded', 'success');
  } catch (error) {
    console.error('Error disliking:', error);
    showNotification('Could not dislike. Please try again.', 'error');
  }
}

// Fetch fresh stats from server and update display
async function fetchAndUpdateStats() {
  if (!lessonData || !lessonData.hash) return;
  
  try {
    const response = await fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash: lessonData.hash })
    });
    
    if (!response.ok) throw new Error('Failed to fetch metrics');
    
    const metrics = await response.json();
    
    // Update lessonData
    lessonData.likes = metrics.likes || 0;
    lessonData.dislikes = metrics.dislikes || 0;
    lessonData.rating = metrics.rating || 'N/A';
    
    // Update display
    updateStatsDisplay();
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}

// Main initialization - call when page loads
initializeLessonsPage();



