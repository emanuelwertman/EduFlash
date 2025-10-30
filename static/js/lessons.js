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
 text = text.substring(1, text.length - 1)

 let arr = [];

 text = text.split(/,(.*)/s);
 arr.push(text[0]);
 text = text[1];

 text = text.split(/,(.*)/s);
 arr.push(text[0]);
 text = text[1];

 text = text.split(/,(.*)/s);
 arr.push(parseInt(text[0]));
 text = text[1];

 text = text.split(/,(.*)/s);
 arr.push(parseInt(text[0]));
 text = text[1];

 text = text.split(/,(.*)/s);
 arr.push(parseInt(text[0]));
 text = text[1];

 text = text.split(/,(.*)/s);
 arr.push(parseInt(text[0]));
 text = text[1];

 text = text.split("\",\"");
 arr.push(JSON.parse(text[0].substring(1, text[0].length).replaceAll("'", "\"")));
 arr.push(text[1].substring(0, text[1].length - 1));

 return arr;
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
     const [hash, owner, likes, dislikes, reports, views, lessonTopic, title] = searchResults[0];
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
       const [hash, owner, likes, dislikes, reports, views, lessonTopic, title] = result;
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
     views: 0,
     rating: 0,
     reports: 0
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
         views: data.views || 0,
         rating: data.rating || 0,
         reports: data.reports || 0
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
     views: metrics.views,
     rating: metrics.rating,
     reports: metrics.reports
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
 
 // Update like and dislike counts in the UI
 const likeCountElement = document.getElementById('likeCount');
 const dislikeCountElement = document.getElementById('dislikeCount');
 
 if (likeCountElement) {
   likeCountElement.textContent = lesson.likes || 0;
 }
 
 if (dislikeCountElement) {
   dislikeCountElement.textContent = lesson.dislikes || 0;
 }
 
 // Update new stats: views, rating, reports
 const viewCountElement = document.getElementById('viewCount');
 const ratingValueElement = document.getElementById('ratingValue');
 const reportCountElement = document.getElementById('reportCount');
 
 if (viewCountElement) {
   viewCountElement.textContent = lesson.views || 0;
 }
 
 if (ratingValueElement) {
   const rating = Number(lesson.rating) || 0;
   ratingValueElement.textContent = rating.toFixed(1);
 }
 
 if (reportCountElement) {
   reportCountElement.textContent = lesson.reports || 0;
 }
 
 // Setup share button
 setupShareButton();
 
 // Setup like and dislike buttons
 setupLikeDislikeButtons();
 
 // Setup navigation buttons
 setupNavigationButtons();
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
  
  if (likeBtn && lessonData) {
    // Check if user has already liked this lesson
    const userLikes = JSON.parse(localStorage.getItem('userLikes') || '{}');
    const userDislikes = JSON.parse(localStorage.getItem('userDislikes') || '{}');
    
    // Set the active state based on local storage
    if (userLikes[lessonData.hash]) {
      likeBtn.classList.add('active');
    } else {
      likeBtn.classList.remove('active');
    }
    
    if (userDislikes[lessonData.hash]) {
      dislikeBtn.classList.add('active');
    } else {
      dislikeBtn.classList.remove('active');
    }
    
    // Remove old event listeners by cloning the buttons
    const newLikeBtn = likeBtn.cloneNode(true);
    likeBtn.parentNode.replaceChild(newLikeBtn, likeBtn);
    newLikeBtn.addEventListener('click', handleLikeClick);
  }
  
  if (dislikeBtn && lessonData) {
    const newDislikeBtn = dislikeBtn.cloneNode(true);
    dislikeBtn.parentNode.replaceChild(newDislikeBtn, dislikeBtn);
    newDislikeBtn.addEventListener('click', handleDislikeClick);
  }
}

// Handle like button click
async function handleLikeClick() {
  if (!lessonData || !lessonData.hash) {
    showNotification('Cannot like this lesson right now.', 'error');
    return;
  }
  
  const sessionCookie = getSessionCookie();
  if (!sessionCookie) {
    showNotification('Please log in to like this lesson.', 'error');
    return;
  }
  
  const likeBtn = document.getElementById('likeBtn');
  const dislikeBtn = document.getElementById('dislikeBtn');
  const likeCountElement = document.getElementById('likeCount');
  const dislikeCountElement = document.getElementById('dislikeCount');
  
  // Get user interaction history from local storage
  const userLikes = JSON.parse(localStorage.getItem('userLikes') || '{}');
  const userDislikes = JSON.parse(localStorage.getItem('userDislikes') || '{}');
  
  // Toggle like state
  const wasLiked = userLikes[lessonData.hash];
  const wasDisliked = userDislikes[lessonData.hash];
  
  try {
    if (wasLiked) {
      // User is unliking
      delete userLikes[lessonData.hash];
      likeBtn.classList.remove('active');
      
      // Optimistically update UI
      lessonData.likes = Math.max(0, lessonData.likes - 1);
      if (likeCountElement) {
        likeCountElement.textContent = lessonData.likes;
      }
      
      showNotification('Like removed', 'info');
    } else {
      // User is liking
      const response = await fetch('/api/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: sessionCookie,
          hash: lessonData.hash
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      userLikes[lessonData.hash] = true;
      likeBtn.classList.add('active');
      
      // Optimistically update UI
      lessonData.likes = lessonData.likes + 1;
      if (likeCountElement) {
        likeCountElement.textContent = lessonData.likes;
      }
      
      // Remove dislike if exists
      if (wasDisliked) {
        delete userDislikes[lessonData.hash];
        dislikeBtn.classList.remove('active');
        
        lessonData.dislikes = Math.max(0, lessonData.dislikes - 1);
        if (dislikeCountElement) {
          dislikeCountElement.textContent = lessonData.dislikes;
        }
      }
      
      showNotification('Lesson liked!', 'success');
    }
    
    // Save to local storage
    localStorage.setItem('userLikes', JSON.stringify(userLikes));
    localStorage.setItem('userDislikes', JSON.stringify(userDislikes));
    
    // Update the like/dislike counts from server to ensure accuracy
    await updateLikeDislikeCounts();
  } catch (error) {
    console.error('Error updating like:', error);
    showNotification('Could not update like. Please try again.', 'error');
    // Revert optimistic update on error
    await updateLikeDislikeCounts();
  }
}

// Handle dislike button click
async function handleDislikeClick() {
  if (!lessonData || !lessonData.hash) {
    showNotification('Cannot dislike this lesson right now.', 'error');
    return;
  }
  
  const sessionCookie = getSessionCookie();
  if (!sessionCookie) {
    showNotification('Please log in to dislike this lesson.', 'error');
    return;
  }
  
  const likeBtn = document.getElementById('likeBtn');
  const dislikeBtn = document.getElementById('dislikeBtn');
  const likeCountElement = document.getElementById('likeCount');
  const dislikeCountElement = document.getElementById('dislikeCount');
  
  // Get user interaction history from local storage
  const userLikes = JSON.parse(localStorage.getItem('userLikes') || '{}');
  const userDislikes = JSON.parse(localStorage.getItem('userDislikes') || '{}');
  
  // Toggle dislike state
  const wasDisliked = userDislikes[lessonData.hash];
  const wasLiked = userLikes[lessonData.hash];
  
  try {
    if (wasDisliked) {
      // User is removing dislike
      delete userDislikes[lessonData.hash];
      dislikeBtn.classList.remove('active');
      
      // Optimistically update UI
      lessonData.dislikes = Math.max(0, lessonData.dislikes - 1);
      if (dislikeCountElement) {
        dislikeCountElement.textContent = lessonData.dislikes;
      }
      
      showNotification('Dislike removed', 'info');
    } else {
      // User is disliking
      const response = await fetch('/api/dislike', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: sessionCookie,
          hash: lessonData.hash
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      userDislikes[lessonData.hash] = true;
      dislikeBtn.classList.add('active');
      
      // Optimistically update UI
      lessonData.dislikes = lessonData.dislikes + 1;
      if (dislikeCountElement) {
        dislikeCountElement.textContent = lessonData.dislikes;
      }
      
      // Remove like if exists
      if (wasLiked) {
        delete userLikes[lessonData.hash];
        likeBtn.classList.remove('active');
        
        lessonData.likes = Math.max(0, lessonData.likes - 1);
        if (likeCountElement) {
          likeCountElement.textContent = lessonData.likes;
        }
      }
      
      showNotification('Feedback recorded', 'success');
    }
    
    // Save to local storage
    localStorage.setItem('userLikes', JSON.stringify(userLikes));
    localStorage.setItem('userDislikes', JSON.stringify(userDislikes));
    
    // Update the like/dislike counts from server to ensure accuracy
    await updateLikeDislikeCounts();
  } catch (error) {
    console.error('Error updating dislike:', error);
    showNotification('Could not update dislike. Please try again.', 'error');
    // Revert optimistic update on error
    await updateLikeDislikeCounts();
  }
}

// Fetch and update the like and dislike counts
async function updateLikeDislikeCounts() {
  if (!lessonData || !lessonData.hash) return;
  
  try {
    const response = await fetch(`/api/metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ hash: lessonData.hash })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const metrics = await response.json();
    
    // Update all metric displays
    const likeCountElement = document.getElementById('likeCount');
    const dislikeCountElement = document.getElementById('dislikeCount');
    const viewCountElement = document.getElementById('viewCount');
    const ratingValueElement = document.getElementById('ratingValue');
    const reportCountElement = document.getElementById('reportCount');
    
    if (likeCountElement && metrics.likes !== undefined) {
      likeCountElement.textContent = metrics.likes;
    }
    
    if (dislikeCountElement && metrics.dislikes !== undefined) {
      dislikeCountElement.textContent = metrics.dislikes;
    }
    
    if (viewCountElement && metrics.views !== undefined) {
      viewCountElement.textContent = metrics.views;
    }
    
    if (ratingValueElement && metrics.rating !== undefined) {
      ratingValueElement.textContent = (metrics.rating || 0).toFixed(1);
    }
    
    if (reportCountElement && metrics.reports !== undefined) {
      reportCountElement.textContent = metrics.reports;
    }
    
    // Update lessonData object
    lessonData.likes = metrics.likes || 0;
    lessonData.dislikes = metrics.dislikes || 0;
    lessonData.views = metrics.views || 0;
    lessonData.rating = metrics.rating || 0;
    lessonData.reports = metrics.reports || 0;
    
  } catch (error) {
    console.error('Error fetching metrics:', error);
    // Fallback to show placeholder counts if API fails
    const likeCountElement = document.getElementById('likeCount');
    const dislikeCountElement = document.getElementById('dislikeCount');
    
    if (likeCountElement) {
      likeCountElement.textContent = '0';
    }
    
    if (dislikeCountElement) {
      dislikeCountElement.textContent = '0';
    }
  }
}

// Main initialization - call when page loads
initializeLessonsPage();



