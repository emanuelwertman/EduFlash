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
    
    // Update header
    document.querySelector('#header').innerHTML = `Choose your <span id="contrast">${path.name}</span> level`;
    document.querySelector('.subtitle').textContent = `Select a ${path.name.toLowerCase()} level to explore topics`;
    
    // Hide topic container and show level container
    document.getElementById('topic-container').style.display = 'none';
    document.getElementById('level-container').style.display = 'grid';
    
    renderLevels(path.levels);
}

function showTopics(level) {
    currentLevel = level;
    
    // Update header
    document.querySelector('#header').innerHTML = `Choose your <span id="contrast">${level.name}</span> topic`;
    document.querySelector('.subtitle').textContent = `Select a ${level.name.toLowerCase()} topic in ${currentPath.name.toLowerCase()}`;
    
    // Hide level container and show topic container
    document.getElementById('level-container').style.display = 'none';
    document.getElementById('topic-container').style.display = 'grid';
    
    renderTopics(level.topics);
}

function renderLevels(levels) {
    const container = document.getElementById('level-container');
    container.innerHTML = '';
    
    // Create a path-container for consistent styling
    const levelGrid = document.createElement('div');
    levelGrid.className = 'path-container';
    
    levels.forEach(level => {
        const levelBox = document.createElement('div');
        levelBox.className = 'path-box'; // Reuse the same styling as paths
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
    
    // Add back button
    const backButton = document.createElement('button');
    backButton.className = 'back-to-levels';
    backButton.innerHTML = '← Back to Levels';
    backButton.onclick = () => showLevels(currentPath);
    container.appendChild(backButton);
    
    // Create topics grid
    const topicsGrid = document.createElement('div');
    topicsGrid.className = 'path-container'; // Reuse the same grid class as paths
    
    topics.forEach(topic => {
        const topicBox = document.createElement('div');
        topicBox.className = 'path-box'; // Reuse the same box style as paths
        topicBox.innerHTML = `
            <h3 class="path-title">${topic.name}</h3>
            <p class="path-description">${topic.hasCommunityLessons ? 'Community lessons available' : 'Standard lessons'}</p>
            <p class="path-stats">Click to start learning</p>
        `;
        
        topicBox.addEventListener('click', () => {
            console.log(`Selected topic: ${topic.name} (ID: ${topic.id})`);
            // TODO: Navigate to lesson page
        });
        
        topicsGrid.appendChild(topicBox);
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
