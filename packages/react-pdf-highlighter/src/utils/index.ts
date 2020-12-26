import {scaledToViewport, viewportToScaled} from "./coordinates";
import {
    getDocument,
    findOrCreateContainerLayer,
    getPageFromElement,
    getPageFromRange,
    getWindow,
    isHTMLCanvasElement,
} from "./dom";
import {getBoundingRect, getClientRects} from "./rects";

export {
    getBoundingRect,
    getClientRects,
    getDocument,
    findOrCreateContainerLayer,
    getWindow,
    getPageFromRange,
    isHTMLCanvasElement,
    getPageFromElement,
    scaledToViewport,
    viewportToScaled,
};
