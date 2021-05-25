import { update } from "https://cdn.jsdelivr.net/npm/idb-keyval@5/dist/esm/index.js";

document.querySelector("form").addEventListener("submit", e => {
  e.preventDefault();
  const id = randomId();
  const name = new FormData(e.target).get("name");
  update("counts", counts => [...(counts || []), { id, name }]);
  window.location = `/pot?id=${id}`;
});

// https://gist.github.com/gordonbrander/2230317
function randomId() {
  // Math.random should be unique because of its seeding algorithm.
  // Convert it to base 36 (numbers + letters), and grab the first 9 characters
  // after the decimal.
  return Math.random()
    .toString(36)
    .substr(2, 9);
}
