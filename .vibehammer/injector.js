(function() {
  'use strict';

  const PARENT_ORIGIN = window.location.ancestorOrigins?.[0] || '*';
  let selectionTimeout;
  let lastSelection = null;

  function captureSelection() {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim().length === 0) {
      // Clear selection if nothing is selected
      if (lastSelection) {
        window.parent.postMessage({
          type: 'VIBEHAMMER_SELECTION_CLEARED'
        }, PARENT_ORIGIN);
        lastSelection = null;
      }
      return;
    }

    const selectedText = selection.toString().trim();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Get element context
    const container = range.commonAncestorContainer;
    const element = container.nodeType === 3
      ? container.parentElement
      : container;

    // Try to find file/line information from data attributes
    let file = null;
    let line = null;
    let currentElement = element;

    // Traverse up the DOM to find data-vibehammer-file attribute
    while (currentElement && currentElement !== document.body) {
      if (currentElement.hasAttribute && currentElement.hasAttribute('data-vibehammer-file')) {
        file = currentElement.getAttribute('data-vibehammer-file');
        line = currentElement.getAttribute('data-vibehammer-line');
        break;
      }
      currentElement = currentElement.parentElement;
    }

    const context = {
      selectedText,
      html: element?.outerHTML?.substring(0, 500), // Limit size
      tagName: element?.tagName,
      className: element?.className,
      id: element?.id,
      textContent: element?.textContent?.substring(0, 200),
      xpath: getXPath(element),
      file: file,
      line: line ? parseInt(line, 10) : null,
      rect: {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
        width: rect.width,
        height: rect.height
      },
      url: window.location.href,
      timestamp: Date.now()
    };

    lastSelection = context;

    window.parent.postMessage({
      type: 'VIBEHAMMER_SELECTION',
      data: context
    }, PARENT_ORIGIN);
  }

  function getXPath(element) {
    if (!element) return '';
    if (element.id) return `//*[@id="${element.id}"]`;

    const paths = [];
    for (; element && element.nodeType === 1; element = element.parentNode) {
      let index = 0;
      for (let sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
          index++;
        }
      }
      const tagName = element.tagName.toLowerCase();
      const pathIndex = index ? `[${index + 1}]` : '';
      paths.unshift(`${tagName}${pathIndex}`);
    }
    return paths.length ? `/${paths.join('/')}` : '';
  }

  // Listen for mouseup to detect selection
  document.addEventListener('mouseup', () => {
    clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(captureSelection, 150);
  });

  // Listen for selection changes
  document.addEventListener('selectionchange', () => {
    clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(captureSelection, 150);
  });

  // Notify parent that injector is ready
  window.parent.postMessage({
    type: 'VIBEHAMMER_READY',
    data: { url: window.location.href }
  }, PARENT_ORIGIN);
})();
