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


// Get the topic from the URL
function getTopicFromURL() {
 const hash = window.location.hash;
 const topicMatch = hash.match(/^#\/lessons\/(.+)$/);
 return topicMatch ? decodeURIComponent(topicMatch[1]) : null;
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

   alert(response);


   if (!response.ok) {
     throw new Error(`HTTP error! status: ${response.status}`);
   }


   const results = await response.json();
   return results;
 } catch (error) {
   console.error('Error searching lessons by topic:', error);
   throw error;
 }
}


// Fetch lesson content by hash (filename)
async function fetchLessonContentByHash(hash) {
 try {
   const response = await fetch(`/static/pages/${hash}`, {
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
  
   // Take the first result (most relevant lesson for this topic)
   const [hash, owner, likes, dislikes, reports, views, lessonTopic, title] = searchResults[0];
  
   // Fetch lesson content
   const content = await fetchLessonContentByHash(hash);
  
   // Create lesson data object
   lessonData = {
     hash: hash,
     title: title || 'Untitled Lesson',
     topic: lessonTopic || topic,
     owner: owner || 'Anonymous',
     likes: likes || 0,
     dislikes: dislikes || 0,
     views: views || 0,
     content: content
   };
  
   // Show the lesson
   showLessonContent(lessonData);
  
 } catch (error) {
   console.error('Error loading lesson for topic:', error);
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
 document.getElementById('lessonPath').textContent = `Topic: ${lesson.topic}`;


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


 // Update lesson metadata
 document.getElementById('progressText').textContent = `${lesson.views} views`;
 document.getElementById('progressFill').style.width = '100%';


 // Store lesson data for interactions
 window.currentLessonData = {
   hash: lesson.hash,
   likes: lesson.likes || 0,
   dislikes: lesson.dislikes || 0,
   views: lesson.views || 0,
   owner: lesson.owner,
   topic: lesson.topic
 };


 // Setup lesson interaction buttons
 setupLessonInteractions();
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


// Handle back button
function setupBackButton() {
 const backBtn = document.getElementById('backBtn');
 backBtn.textContent = '← Back to Topics';
 backBtn.addEventListener('click', () => {
   // Navigate back to the topics page - you may need to adjust this based on your routing
   window.location.href = '#/topics';
 });
}


// Handle create lesson button
function setupCreateLessonButton() {
 const createBtn = document.getElementById('createLessonBtn');
 createBtn.addEventListener('click', () => {
   window.location.href = '#/create';
 });
}


// Handle back to topics button in error state
function setupBackToTopicsButton() {
 const backToTopicsBtn = document.getElementById('backToTopicsBtn');
 if (backToTopicsBtn) {
   backToTopicsBtn.textContent = '← Back to Topics';
   backToTopicsBtn.addEventListener('click', () => {
     window.location.href = '#/topics';
   });
 }
}


// Initialize the lessons page
async function initializeLessonsPage() {
 try {
   // Load external libraries first
   await loadExternalLibraries();


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



