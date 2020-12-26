export const getDocument = (elm: any): Document =>
    (elm || {}).ownerDocument || document;

export const getWindow = (elm: any): typeof window =>
    (getDocument(elm) || {}).defaultView || window;

export const isHTMLCanvasElement = (elm: any) =>
    elm instanceof HTMLCanvasElement ||
    elm instanceof getWindow(elm).HTMLCanvasElement;

export const getPageFromElement = (target: HTMLElement) => {
    const node = target.closest<HTMLElement>(".page");

    if (!node) return null;

    const number = Number(node.dataset.pageNumber);

    return { node, number };
};

export const getPageFromRange = (range: Range) => {
    const parentElement = range.startContainer.parentElement;

    if (!parentElement) return;

    return getPageFromElement(parentElement);
};

export const findOrCreateContainerLayer = (
    container: HTMLElement,
    className: string
) => {
    const doc = getDocument(container);
    let layer = container.querySelector(`.${className}`);

    if (!layer) {
        layer = doc.createElement("div");
        layer.className = className;
        container.appendChild(layer);
    }

    return layer;
};
