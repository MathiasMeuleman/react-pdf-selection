const getDocument = (elm: any): Document => (elm || {}).ownerDocument || document;

export const getWindow = (elm: any): typeof window => (getDocument(elm) || {}).defaultView || window;

export const getPageFromElement = (target: HTMLElement) => {
    const node = target.closest<HTMLElement>(".react-pdf__Page");

    if (!node) return null;

    const number = Number(node.dataset.pageNumber);

    return { node, number };
};

export const getPageFromRange = (range: Range) => {
    const parentElement = range.startContainer.parentElement;

    if (!parentElement) return;

    return getPageFromElement(parentElement);
};
