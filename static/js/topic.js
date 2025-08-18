let allPaths = [];
let currentPath = null;
let currentLevel = null;

function getPathFromURL() {
    const hash = window.location.hash;
    const pathMatch = hash.match(/^#\/topics\/(.+)$/);
    return pathMatch ? pathMatch[1] : null;
}

fetch("static/data/paths.json")
    .then((res) => res.json())
    .then((data) => {
        allPaths = data.paths;
        const pathId = getPathFromURL();
        
        if (pathId) {
            currentPath = allPaths.find(path => path.id === pathId);
            if (currentPath) {
                showLevels(currentPath);
            } else {
                showError("Path not found");
            }
        } else {
            showError("No path specified");
        }
    })
    .catch((error) => {
        console.error("Error loading JSON: ", error);
        showError("Error loading data");
    });

function showLevels(path) {
    currentPath = path;
    currentLevel = null;
    
    document.getElementById('topic-container').style.display = 'none';
    document.getElementById('level-container').style.display = 'grid';
    
    renderLevels(path.levels);
}

function showTopics(level) {
    currentLevel = level;
    
    document.getElementById('level-container').style.display = 'none';
    document.getElementById('topic-container').style.display = 'grid';
    
    renderTopics(level.topics);
}

function renderLevels(levels) {
    const container = document.getElementById('level-container');
    container.innerHTML = '';
    
    // Add back to paths button
    const backButton = document.createElement('button');
    backButton.className = 'back-to-levels';
    backButton.innerHTML = '← Back to Paths';
    backButton.onclick = () => window.location.hash = '#/paths';
    container.appendChild(backButton);
    
    const levelGrid = document.createElement('div');
    levelGrid.className = 'path-container';
    
    levels.forEach(level => {
        const levelBox = document.createElement('div');
        levelBox.className = 'path-box';
        levelBox.innerHTML = `
            <h3 class="path-title">${level.name}</h3>
            <p class="path-description">${level.topics.length} topics available</p>
            <p class="path-stats">Click to explore topics</p>
        `;
        
        levelBox.addEventListener('click', () => {
            showTopics(level);
        });
        
        levelGrid.appendChild(levelBox);
    });
    
    container.appendChild(levelGrid);
}

function renderTopics(topics) {
    const container = document.getElementById('topic-container');
    container.innerHTML = '';
    
    const backButton = document.createElement('button');
    backButton.className = 'back-to-levels';
    backButton.innerHTML = '← Back to Levels';
    backButton.onclick = () => showLevels(currentPath);
    container.appendChild(backButton);
    
    const searchSection = document.createElement('section');
    searchSection.className = 'search glass';
    searchSection.innerHTML = `
        <input type="text" placeholder="Search lessons" aria-label="Search">
        <button class="btn"><h1 id="plus">+</h1></button>
    `;
    container.appendChild(searchSection);
    
    const topicsGrid = document.createElement('div');
    topicsGrid.className = 'path-container';
    
    const renderFilteredTopics = (topicsToRender) => {
        topicsGrid.innerHTML = '';
        
        if (topicsToRender.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.innerHTML = '<p>No topics found matching your search.</p>';
            topicsGrid.appendChild(noResults);
            return;
        }
        
        topicsToRender.forEach(topic => {
            const topicBox = document.createElement('div');
            topicBox.className = 'path-box';
            topicBox.innerHTML = `
                <h3 class="path-title">${topic.name}</h3>
                <p class="path-description">${topic.hasCommunityLessons ? 'Community lessons available' : 'Standard lessons'}</p>
                <p class="path-stats">Click to start learning</p>
            `;
            
            topicBox.addEventListener('click', () => {
                console.log(`Selected topic: ${topic.name} (ID: ${topic.id})`);
                window.location.href = `#/lessons/${topic.name}`;
            });
            
            topicsGrid.appendChild(topicBox);
        });
    };
    
    renderFilteredTopics(topics);
    
    searchSection.querySelector('input').addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (!query) {
            renderFilteredTopics(topics);
            return;
        }
        
        const filteredTopics = topics.filter(topic => 
            topic.name.toLowerCase().includes(query.toLowerCase())
        );
        
        renderFilteredTopics(filteredTopics);
    });
    
    container.appendChild(topicsGrid);
}

function showError(message) {
    const container = document.getElementById('level-container');
    container.innerHTML = `
        <div class="error-message" style="text-align: center; padding: 2rem; color: var(--ink-dim);">
            <h3>${message}</h3>
            <p style="margin-top: 1rem;">
                <a href="#/paths" style="color: var(--accent);">← Back to Paths</a>
            </p>
        </div>
    `;
}
