const targetDiv = document.querySelector(".selector");

fetch("static/data/paths.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {    
    const pathContainer = document.createElement('div');
    pathContainer.className = 'path-container';
    
    data.paths.forEach(path => {
      console.log(path.name);
      
      const pathBox = document.createElement('div');
      pathBox.className = 'path-box';
      
      const pathTitle = document.createElement('h3');
      pathTitle.textContent = path.name;
      pathTitle.className = 'path-title';
      
      const levelCount = document.createElement('p');
      levelCount.textContent = `${path.levels.length} levels available`;
      levelCount.className = 'path-description';
      
      const topicCount = path.levels.reduce((total, level) => total + level.topics.length, 0);
      const topicElement = document.createElement('p');
      topicElement.textContent = `${topicCount} topics`;
      topicElement.className = 'path-stats';
      
      pathBox.appendChild(pathTitle);
      pathBox.appendChild(levelCount);
      pathBox.appendChild(topicElement);
      
      pathBox.addEventListener('click', () => {
        console.log(`Selected: ${path.name}`);
      });
      
      pathContainer.appendChild(pathBox);
    });
    
    // Add container to selector div
    targetDiv.appendChild(pathContainer);
  })
  .catch((error) => {
    console.error("Error loading JSON: ", error);
  });
