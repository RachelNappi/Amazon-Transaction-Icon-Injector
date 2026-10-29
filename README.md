# Amazon-Transaction-Icon-Injector

Tool designed to ease budget reconciling via the Amazon transaction page.

A Tampermonkey userscript that improves the Amazon **Transactions** page
(`amazon.com/cpe/yourpayments/transactions`) on both desktop and mobile:

- **Product thumbnails** — fetches and displays small product images inline
  next to each order, so you don't have to click into every order to see
  what it was.
- **Bigger, repositioned transaction amounts** — the dollar amount for each
  transaction is moved above the payment method line and shown in a larger
  font, so it's easier to scan at a glance. *(Currently inactive — see
  [Notes](#notes).)*
- **Hide "Amazon Visa points" transactions** — a toggle button (placed just
  below the gift card balance link) lets you hide/show all transactions
  billed to Amazon Visa points, so you can focus on your actual card
  spending. Your choice is remembered across page loads. *(Currently
  inactive — see [Notes](#notes).)*

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser.
   **NOTE:** On mobile, Edge Canary is the primary option which allows user
   script installs. This code has only been tested on mobile with Edge
   Canary, both in desktop and mobile view.
2. Click this link to install the script:
   `https://raw.githubusercontent.com/<your-username>/<repo-name>/main/amazon-transactions-icon-injector.user.js`
   (Tampermonkey will detect the `.user.js` file and prompt you to install it.)
3. Visit your [Amazon transactions page](https://www.amazon.com/cpe/yourpayments/transactions) and confirm it's working.

## Updating

Tampermonkey checks the `@version` field in the script header against the
installed version and will offer to update automatically if you installed
via the raw GitHub URL above.

## Versions

- **v3.0** (current) — fixes product thumbnail injection after Amazon
  rewrote the transactions page's markup (Oct 2026). Amount repositioning
  and the Visa points toggle are temporarily inactive pending a matching
  rewrite (see Notes).
- **v2.0** — adds transaction amount repositioning/resizing, the Amazon
  Visa points hide/show toggle, and fixes product thumbnail injection on
  mobile view (previously desktop-only).
- **v1.0** — initial release: injects product thumbnails next to each order
  on the transactions page.

See [CHANGELOG.md](./CHANGELOG.md) for details.

## Notes

- This only works on Amazon's transactions page — it doesn't modify order
  history, order details, or any other Amazon page.
- Amazon rewrote the transactions page in October 2026 as a React/RN-web
  app, replacing the old HTML markup this script originally targeted.
  Product thumbnail injection was updated to work with the new page
  structure as of v3.0. The amount-repositioning and Visa-points-toggle
  features still target the old markup, so they currently do nothing
  (harmlessly — no errors, they just no-op) until they're rewritten for
  the new page.
- If Amazon changes the page's HTML structure again, parts of this script
  (icon fetching, row detection) may stop working until updated.

## License

MIT
