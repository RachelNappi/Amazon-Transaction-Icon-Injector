# Changelog

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
