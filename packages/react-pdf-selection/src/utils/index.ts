import { getAbsoluteBoundingRectWithCSSProperties, getBoundingRectWithCSSProperties, Dimensions } from "./coordinates";
import { getDocument, findOrCreateContainerLayer, getPageFromElement, getPageFromRange, getWindow } from "./dom";
import { getAreaAsPNG } from "./image";
import { getBoundingRect, getClientRects } from "./rects";
import { generateUuid } from "./uuid";

export type { Dimensions };

export {
    getAbsoluteBoundingRectWithCSSProperties,
    getBoundingRectWithCSSProperties,
    getBoundingRect,
    getClientRects,
    getDocument,
    getAreaAsPNG,
    findOrCreateContainerLayer,
    getWindow,
    getPageFromRange,
    getPageFromElement,
    generateUuid,
};
