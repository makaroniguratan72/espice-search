class PagefindUI {
  constructor(options) {
    this.options = options;
    this.pagefind = new Pagefind({ basePath: options.basePath || "/pagefind" });
    this.element = document.querySelector(options.element);
  }

  async search(query) {
    let results = await this.pagefind.search(query);
    this.render(results);
  }

  render(results) {
    this.element.innerHTML = "";
    results.forEach(r => {
      let div = document.createElement("div");
      div.className = "pagefind-ui__result";
      div.innerHTML = `
        <div class="pagefind-ui__title">${r.title}</div>
        <div class="pagefind-ui__excerpt">${r.excerpt}</div>
      `;
      div.onclick = () => location.href = r.url;
      this.element.appendChild(div);
    });
  }
}
