import {Dimensions, getAbsoluteBoundingRectWithCSSProperties, getBoundingRectWithCSSProperties} from "./coordinates";
import {getPageFromElement, getPageFromRange, getWindow} from "./dom";
import {getAreaAsPNG} from "./image";
import {getBoundingRect, getClientRects} from "./rects";
import {generateUuid} from "./uuid";

export type { Dimensions };

export {
    getAbsoluteBoundingRectWithCSSProperties,
    getBoundingRectWithCSSProperties,
    getBoundingRect,
    getClientRects,
    getAreaAsPNG,
    getWindow,
    getPageFromRange,
    getPageFromElement,
    generateUuid,
};
