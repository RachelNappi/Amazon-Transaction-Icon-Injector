// ==UserScript==
// @name         Amazon Mobile Transactions Icon Injector (Complete)
// @namespace    http://tampermonkey.net/
// @version      3
// @match        https://*.amazon.com/cpe/yourpayments/transactions*
// @grant        GM_xmlhttpRequest
// @connect      amazon.com
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    let lastUrl = window.location.href;

    // Amazon rewrote this page (Oct 2026) as a React/RN-web app. Transactions
    // no longer live in `.a-row`/`.a-column` markup with real orderID/oid
    // links - each transaction is now an <a data-testid="transaction-link">
    // whose href is just "#". The order number is still present as plain
    // text though ("Order #111-5142457-4751412"), so we rebuild the order
    // details URL from that instead of reading it off a link.
    function injectTransactionIcons() {
        // Core structural fix: If the URL changes via pagination/navigation, reset tracking flags
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            document.querySelectorAll('[data-icons-loaded]').forEach(el => {
                el.removeAttribute('data-icons-loaded');
            });
            document.querySelectorAll('[data-amount-restyled]').forEach(el => {
                el.removeAttribute('data-amount-restyled');
            });
            document.querySelectorAll('[data-payment-tagged]').forEach(el => {
                el.removeAttribute('data-payment-tagged');
            });
        }

        const transactionLinks = document.querySelectorAll('a[data-testid="transaction-link"]:not([data-icons-loaded])');
        if (transactionLinks.length === 0) return;

        transactionLinks.forEach(link => {
            // Find the order number text within this transaction card
            const textNodes = link.querySelectorAll('[data-testid="text"]');
            let orderId = null;
            for (const node of textNodes) {
                const match = node.textContent.match(/Order #(\d{3}-\d{7}-\d{7})/);
                if (match) {
                    orderId = match[1];
                    break;
                }
            }
            if (!orderId) return;

            // Immediately mark to prevent processing loops
            link.setAttribute('data-icons-loaded', 'true');

            const contentWrapper = link.querySelector('[data-testid="transaction-link-content-wrapper-outline"]') || link;

            const absoluteUrl = `https://www.amazon.com/gp/css/summary/edit.html?orderID=${orderId}`;
            fetchOrderImages(absoluteUrl, contentWrapper);
        });
    }

    function fetchOrderImages(url, targetElement) {
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            onload: function(response) {
                if (response.status !== 200) return;

                const htmlText = response.responseText;
                const imgMatches = htmlText.match(/src="([^"]+\/images\/I\/[^"]+)"|data-src="([^"]+\/images\/I\/[^"]+)"/g);
                if (!imgMatches) return;

                const wrapper = document.createElement('div');
                wrapper.className = 'injected-icon-container';
                wrapper.style.cssText = 'display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; width: 100%; clear: both;';

                const seenImagesInRow = new Set();
                let validImgCount = 0;

                imgMatches.forEach(matchStr => {
                    let src = matchStr.match(/="([^"]+)"/)[1];
                    if (!src) return;

                    const lowerSrc = src.toLowerCase();

                    // Maintained precise 2.7 filters for thumbs-up/down assets
                    if (
                        lowerSrc.includes('clear.gif') ||
                        lowerSrc.includes('logo') ||
                        lowerSrc.includes('thumb') ||
                        lowerSrc.includes('01huzpigzyl') ||
                        lowerSrc.includes('01prr8wlrkl')
                    ) {
                        return;
                    }

                    const imgToken = src.split('/images/I/')[1]?.split('.')[0];
                    if (imgToken) {
                        if (seenImagesInRow.has(imgToken)) return;
                        seenImagesInRow.add(imgToken);
                    }

                    src = src.replace(/\._.+_\./, '._AC_SR90,90_.');

                    const thumb = document.createElement('img');
                    thumb.src = src;
                    thumb.style.cssText = 'width: 44px; height: 44px; object-fit: contain; border: 1px solid #d5d9d9; border-radius: 4px; background-color: #fff; padding: 2px;';

                    wrapper.appendChild(thumb);
                    validImgCount++;
                });

                if (validImgCount > 0) {
                    targetElement.appendChild(wrapper);
                }
            }
        });
    }

    // Moves the transaction amount above the payment method, left-aligned,
    // and bumps its font size. Targets the two-column row containing the
    // payment method name (a-span9) and the dollar amount (a-span3, right-aligned).
    // NOTE: this matched Amazon's PRE-October-2026 markup. The current page
    // no longer uses this structure, so this function is now a harmless
    // no-op (its selectors simply won't match anything). Left in place in
    // case Amazon reverts, or for future rework.
    function restyleTransactionAmounts() {
        const rows = document.querySelectorAll('.a-row:not([data-amount-restyled])');

        rows.forEach(row => {
            const cols = row.querySelectorAll(':scope > .a-column');
            if (cols.length !== 2) return;

            const paymentCol = cols[0];
            const amountCol = cols[1];

            const paymentSpan = paymentCol.querySelector('span.a-text-bold');
            const amountSpan = amountCol.querySelector('span.a-size-base-plus');
            if (!paymentSpan || !amountSpan) return;

            // Confirm the second column actually holds a dollar amount
            if (!/^[-+]?\$[\d,]+\.\d{2}$/.test(amountSpan.textContent.trim())) return;

            row.setAttribute('data-amount-restyled', 'true');

            // Stack the two columns vertically instead of side-by-side
            row.style.display = 'flex';
            row.style.flexDirection = 'column';

            // Move amount to the top, align left, full width
            amountCol.classList.remove('a-text-right', 'a-span-last');
            amountCol.style.order = '-1';
            amountCol.style.textAlign = 'left';
            amountCol.style.width = '100%';
            amountCol.style.marginBottom = '2px';

            // Increase the amount's font size
            amountSpan.style.fontSize = '20px';

            paymentCol.style.width = '100%';
        });
    }

    const HIDE_VISA_POINTS_KEY = 'apx-hide-visa-points-transactions';
    const HIDDEN_CLASS = 'apx-hidden-visa-points';

    function isHideEnabled() {
        return localStorage.getItem(HIDE_VISA_POINTS_KEY) === 'true';
    }

    function injectHiddenStyle() {
        if (document.getElementById('apx-hidden-visa-points-style')) return;
        const style = document.createElement('style');
        style.id = 'apx-hidden-visa-points-style';
        style.textContent = `.${HIDDEN_CLASS} { display: none !important; }`;
        document.head.appendChild(style);
    }

    // Tags each transaction's line-item container with the payment method
    // it was billed to, so it can be selectively hidden later.
    // NOTE: same PRE-October-2026-markup caveat as restyleTransactionAmounts()
    // above - currently a no-op on the live page.
    function tagPaymentMethods() {
        const rows = document.querySelectorAll('.a-row:not([data-payment-tagged])');

        rows.forEach(row => {
            const cols = row.querySelectorAll(':scope > .a-column');
            if (cols.length !== 2) return;

            const paymentSpan = cols[0].querySelector('span.a-text-bold');
            const amountSpan = cols[1].querySelector('span.a-size-base-plus');
            if (!paymentSpan || !amountSpan) return;
            if (!/^[-+]?\$[\d,]+\.\d{2}$/.test(amountSpan.textContent.trim())) return;

            row.setAttribute('data-payment-tagged', 'true');

            const container = row.closest('.apx-transactions-line-item-component-container');
            if (!container) return;

            container.setAttribute('data-payment-method', paymentSpan.textContent.trim());
        });
    }

    // Shows/hides all tagged "Amazon Visa points" containers based on toggle state
    function applyVisaPointsFilter() {
        const hide = isHideEnabled();
        document.querySelectorAll('[data-payment-method="Amazon Visa points"]').forEach(container => {
            container.classList.toggle(HIDDEN_CLASS, hide);
        });
    }

    // Inserts the toggle button right after the "view your gift card balance
    // and activity" row, if it hasn't been inserted already.
    // NOTE: same PRE-October-2026-markup caveat - currently a no-op since
    // Amazon no longer links directly to /gc/balance from this page.
    function insertToggleButton() {
        if (document.getElementById('apx-hide-visa-points-toggle')) return;

        const giftCardLink = document.querySelector('a[href*="/gc/balance"]');
        if (!giftCardLink) return;

        const anchorRow = giftCardLink.closest('.a-row') || giftCardLink.parentElement;
        if (!anchorRow || !anchorRow.parentElement) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'a-row a-spacing-medium';
        wrapper.style.cssText = 'margin-top: 10px;';

        const button = document.createElement('button');
        button.id = 'apx-hide-visa-points-toggle';
        button.type = 'button';
        button.style.cssText = 'padding: 8px 14px; border-radius: 8px; border: 1px solid #888; background-color: #f0f2f2; font-size: 14px; cursor: pointer;';

        function refreshLabel() {
            const hidden = isHideEnabled();
            button.textContent = hidden
                ? 'Show transactions billed to Amazon Visa points'
                : 'Hide transactions billed to Amazon Visa points';
        }

        button.addEventListener('click', () => {
            localStorage.setItem(HIDE_VISA_POINTS_KEY, (!isHideEnabled()).toString());
            refreshLabel();
            applyVisaPointsFilter();
        });

        refreshLabel();
        wrapper.appendChild(button);
        anchorRow.insertAdjacentElement('afterend', wrapper);
    }

    function runAll() {
        injectHiddenStyle();
        insertToggleButton();
        injectTransactionIcons();
        restyleTransactionAmounts();
        tagPaymentMethods();
        applyVisaPointsFilter();
    }

    // High-performance polling loop: Runs every 600ms to instantly catch
    // new transaction listings or pagination switches without using the heavy MutationObserver thread.
    setInterval(runAll, 600);

    // Run immediately on script ready
    setTimeout(runAll, 500);
})();
