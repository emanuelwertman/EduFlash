let allPaths = [];
let fuse;

fetch("static/data/paths.json")
  .then((res) => res.json())
  .then((data) => {
    allPaths = data.paths;

    fuse = new Fuse(allPaths, {
      includeScore: true,
      threshold: 0.2,
      minMatchCharLength: 2,
      keys: [
        { name: "name", weight: 0.5 },
        { name: "levels.topics.name", weight: 0.4 },
        { name: "levels.name", weight: 0.1 },
      ],
    });

    renderPaths(allPaths);
  })
  .catch((error) => {
    console.error("Error loading JSON: ", error);
  });

document.querySelector(".search input").addEventListener("input", (e) => {
  const query = e.target.value.trim();
  if (!query) {
    renderPaths(allPaths);
    return;
  }

  const results = fuse.search(query);

  const filteredResults = results
    .filter((result) => result.score <= 0.5)
    .map((r) => r.item);

  if (filteredResults.length === 0 && results.length > 0) {
    console.log(
      `Search "${query}" had ${results.length} results but all were filtered out due to poor scores`
    );
  }

  renderPaths(filteredResults);
});

document.querySelector(".search .btn").addEventListener("click", () => {
  console.log("Plus button clicked!");
});

function renderPaths(paths) {
  const targetDiv = document.querySelector(".selector");
  targetDiv.innerHTML = "";

  if (paths.length === 0) {
    const noResults = document.createElement("div");
    noResults.className = "no-results";
    noResults.innerHTML = "<p>No paths found matching your search.</p>";
    targetDiv.appendChild(noResults);
    return;
  }

  const pathContainer = document.createElement("div");
  pathContainer.className = "path-container";

  paths.forEach((path) => {
    const box = document.createElement("div");
    box.className = "path-box";
    box.innerHTML = `
      <h3 class="path-title">${path.name}</h3>
      <p class="path-description">${path.levels.length} levels available</p>
      <p class="path-stats">${path.levels.reduce(
        (t, l) => t + l.topics.length,
        0
      )} topics</p>
        `;

    box.addEventListener("click", () => {
      console.log(`Selected: ${path.name}`);
    });

    pathContainer.appendChild(box);
  });
  targetDiv.appendChild(pathContainer);
}

