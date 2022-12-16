import search from "./mu-search.js";
import { LitElement, html } from "./lit-core.min.js";
import { sourceDatasetsConverter } from "./attribute-converters.js";

customElements.define(
  "vocab-search-bar",
  class extends LitElement {
    static properties = {
      query: { reflect: true },
      sourceDatasets: {
        attribute: "source-datasets",
        reflect: true,
        converter: sourceDatasetsConverter,
      },
      searchEndpoint: { attribute: "search-endpoint" },
      languagesString: { attribute: "languages-string" },

      searchResults: { attribute: false, state: true },
      _isLoading: { state: true },
    };

    constructor() {
      super();
      this.query = null;
      this.sourceDatasets = [];
      this.searchResults = null;
      this.languageString = null;
      this._isLoading = false;
    }

    updated(changed) {
      if (changed.has("query")) {
        if (this.query === "") {
          return;
        }
        this._isLoading = true;
        this.retrieveResults().then((results) => {
          this._isLoading = false;
          this.searchResults = results;
          this.dispatchEvent(
            new CustomEvent("search-results-changed", {
              bubbles: true,
              detail: results,
            })
          );
        });
      }
    }

    render() {
      return html` <div>
        <input
          .value=${this.query}
          @change=${(event) => {
            this.query = event.target.value;
          }}
        />
        ${this._isLoading
          ? html`<p>Loading...</p>`
          : this.searchResults
          ? this.searchResults.length === 0
            ? html`<p>No results found.</p>`
            : this._renderSearchResults()
          : ""}
      </div>`;
    }

    _renderSearchResults() {
      return html`<table>
        <thead>
          <tr>
            <th>URI</th>
            <th>prefLabel</th>
          </tr>
        </thead>
        <tbody>
          ${this.searchResults.map((result) => this._renderRow(result))}
        </tbody>
      </table>`;
    }

    _renderRow({ uri, prefLabel }) {
      return html`<tr @click=${() => this._onRowClicked({ uri, prefLabel })}>
        <td><a href=${uri}>${uri}</a></td>
        <td>
          <ul>
            ${Object.entries(prefLabel).map(
              (x) => html`<li>${x[0]}: ${x[1]}</li>`
            )}
          </ul>
        </td>
      </tr>`;
    }

    _onRowClicked(data) {
      this.dispatchEvent(
        new CustomEvent("search-result-clicked", {
          bubbles: true,
          detail: data,
        })
      );
    }

    createFilter() {
      let filter = {};

      const languagesString = this.languagesString ?? "*";

      const queryKey = languagesString
        .split(",")
        .map((x) => `prefLabel.${x}`)
        .join(",");

      filter[queryKey] = this.query;

      if (this.sourceDatasets.length > 0) {
        filter[":terms:sourceDataset"] = this.sourceDatasets.join(",");
      }

      return filter;
    }

    async retrieveResults() {
      const page = 0;
      const size = 15;
      const sort = null; // By relevance
      const results = await search(
        "concepts",
        page,
        size,
        sort,
        this.createFilter(),
        (searchData) => {
          const entry = searchData.attributes;
          entry.id = searchData.id;
          return entry;
        },
        this.searchEndpoint
      );

      return results.content;
    }
  }
);
