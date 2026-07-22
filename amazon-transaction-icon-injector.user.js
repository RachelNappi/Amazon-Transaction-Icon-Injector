// ==UserScript==
// @name         Amazon Mobile Transactions Icon Injector
// @namespace    http://tampermonkey.net/
// @version      2.0
// @match        https://*.amazon.com/cpe/yourpayments/transactions*
// @grant        GM_xmlhttpRequest
// @connect      amazon.com
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    let lastUrl = window.location.href;

    function injectTransactionIcons() {
        // Core structural fix: If the URL changes via pagination, reset tracking flags
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            document.querySelectorAll('a[data-icons-loaded]').forEach(el => {
                el.removeAttribute('data-icons-loaded');
            });
            document.querySelectorAll('[data-amount-restyled]').forEach(el => {
                el.removeAttribute('data-amount-restyled');
            });
            document.querySelectorAll('[data-payment-tagged]').forEach(el => {
                el.removeAttribute('data-payment-tagged');
            });
        }

        const orderLinks = document.querySelectorAll('a[href*="orderID="]:not([data-icons-loaded]), a[href*="oid="]:not([data-icons-loaded])');
        if (orderLinks.length === 0) return;

        orderLinks.forEach(link => {
            const href = link.getAttribute('href');
            const match = href.match(/[?&](?:orderID|oid)=([^&]+)/);
            if (!match) return;

            const rowContainer = link.closest('.a-row');
            if (!rowContainer) return;

            // Immediately mark to prevent processing loops
            link.setAttribute('data-icons-loaded', 'true');

            const absoluteUrl = href.startsWith('http') ? href : window.location.origin + href;
            fetchOrderImages(absoluteUrl, rowContainer);
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
