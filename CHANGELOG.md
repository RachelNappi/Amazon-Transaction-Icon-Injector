# Changelog

## v3.0 (script @version 3.0)
- Fixed: product thumbnail injection, which broke when Amazon rewrote the
  transactions page (Oct 2026) as a React/RN-web app. Transactions no
  longer sit in `.a-row`/`.a-column` markup with real `orderID=`/`oid=`
  links — each transaction is now an `<a data-testid="transaction-link">`
  whose `href` is just `"#"`. The script now reads the order number from
  the visible "Order #..." text instead, and rebuilds the order-details
  URL itself (`gp/css/summary/edit.html?orderID=<id>`) to fetch product
  images from, same as before.
- Known limitation: the amount-repositioning/resizing and the "Amazon Visa
  points" hide/show toggle (added in v2.0) still target the pre-October-2026
  markup and are currently no-ops on the live page — they don't error, they
  just don't do anything yet. Rewriting them for the new markup is pending.

## v2.0
- Added: transaction amount is moved above the payment method line and
  rendered in a larger font.
- Added: toggle button (inserted after the gift card balance link) to
  hide/show transactions billed to "Amazon Visa points". Preference persists
  via `localStorage`.
- Fixed: product thumbnail injection now works on mobile view. Mobile order
  links use a different URL parameter (`oid=`) than desktop (`orderID=`),
  which the original selector didn't match.

## v1.0
- Initial release.
- Injects small product thumbnail images next to each transaction on the
  Amazon transactions page by fetching each linked order's page and
  extracting product image URLs.
- Polls the page every 600ms to catch newly loaded or paginated
  transactions, resetting processed-row tracking on URL change.
