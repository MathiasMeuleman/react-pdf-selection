import { normalizeBoundingRect, viewportBoundingRect, viewportPosition } from "./coordinates";
import { getDocument, findOrCreateContainerLayer, getPageFromElement, getPageFromRange, getWindow } from "./dom";
import { getAreaAsPNG } from "./image";
import { getBoundingRect, getClientRects } from "./rects";

export {
    getBoundingRect,
    getClientRects,
    getDocument,
    getAreaAsPNG,
    findOrCreateContainerLayer,
    getWindow,
    getPageFromRange,
    getPageFromElement,
    normalizeBoundingRect,
    viewportBoundingRect,
    viewportPosition,
};
