const form = document.getElementById("addLinkForm");
const ul = document.querySelector("ul");

/*
  Load links from backend
*/
function loadLinks() {
  fetch("/links")
    .then(res => res.json())
    .then(data => {
      ul.innerHTML = "";

      if (data.length === 0) {
        ul.innerHTML = "<li>No active links right now</li>";
        return;
      }

      data.forEach(link => {
        const li = document.createElement("li");

        li.innerHTML = `
          <a href="/go/${link.id}" target="_blank">
            ${link.title}
          </a>
          <span>(${link.clicks})</span>
          <button class="delete-btn">x</button>
        `;

        // 🗑 delete handler
        li.querySelector(".delete-btn").addEventListener("click", () => {
          fetch(`/links/${link.id}`, {
            method: "DELETE"
          }).then(() => {
            loadLinks(); // refresh list
          });
        });

        ul.appendChild(li);
      });
    });
}


/*
  Add new link
*/
form.addEventListener("submit", e => {
  e.preventDefault();

  const title = document.getElementById("title").value;
  let url = document.getElementById("url").value;

  // Fix URL if protocol missing
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  fetch("/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, url })
  })
  .then(() => {
    form.reset();
    loadLinks();
  });
});

/*
  Load links when page opens
*/
loadLinks();
