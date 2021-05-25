import { get } from "https://cdn.jsdelivr.net/npm/idb-keyval@5/dist/esm/index.js";

get("counts").then(counts => {
  for (const count of counts) {
    document
      .getElementById("counts-list")
      .insertAdjacentHTML(
        "afterbegin",
        `<li><a href="/pot?id=${count.id}">${count.name}</li>`
      );
  }
});
