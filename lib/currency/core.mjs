/**
 * Server-side view of the currency rules. The canonical file lives under
 * src/assets/js/ so the build copies the very same bytes to the browser, and
 * the page and the API can never disagree about a currency or a rate.
 */
export * from '../../src/assets/js/currency-core.js';
