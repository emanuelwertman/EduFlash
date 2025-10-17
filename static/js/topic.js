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
    document.getElementById('level-container').style.display = 'block';
    
    renderLevelsWithDropdown(path);
}

function renderLevelsWithDropdown(path) {
    const container = document.getElementById('level-container');
    container.innerHTML = '';
    
    // Add back to paths button
    const backButton = document.createElement('button');
    backButton.className = 'back-to-levels';
    backButton.innerHTML = '← Back to Paths';
    backButton.onclick = () => window.location.hash = '#/paths';
    container.appendChild(backButton);
    
    // Add path title
    const pathHeader = document.createElement('div');
    pathHeader.className = 'path-header';
    pathHeader.innerHTML = `
        <h2 class="current-path-title">${path.name}</h2>
        <p class="current-path-subtitle">${path.levels.length} levels • ${path.levels.reduce((t, l) => t + l.topics.length, 0)} topics</p>
    `;
    container.appendChild(pathHeader);
    
    // Create levels container
    const levelsContainer = document.createElement('div');
    levelsContainer.className = 'levels-accordion-container';
    
    path.levels.forEach((level) => {
        const levelWrapper = document.createElement('div');
        levelWrapper.className = 'level-accordion-wrapper';
        
        const levelHeader = document.createElement('div');
        levelHeader.className = 'level-accordion-header';
        levelHeader.innerHTML = `
            <div class="level-header-content">
                <h3 class="level-name">${level.name}</h3>
                <span class="level-info">${level.topics.length} topics</span>
            </div>
            <span class="level-arrow">▼</span>
        `;
        
        const topicsContainer = document.createElement('div');
        topicsContainer.className = 'topics-accordion-container';
        
        level.topics.forEach((topic) => {
            const topicItem = document.createElement('a');
            topicItem.className = 'topic-accordion-item';
            topicItem.href = `#/lessons/${topic.name}`;
            topicItem.innerHTML = `
                <span class="topic-name">${topic.name}</span>
                ${topic.hasCommunityLessons ? '<span class="community-badge">Community</span>' : ''}
            `;
            topicsContainer.appendChild(topicItem);
        });
        
        levelHeader.addEventListener('click', () => {
            levelWrapper.classList.toggle('active');
        });
        
        levelWrapper.appendChild(levelHeader);
        levelWrapper.appendChild(topicsContainer);
        levelsContainer.appendChild(levelWrapper);
    });
    
    container.appendChild(levelsContainer);
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
