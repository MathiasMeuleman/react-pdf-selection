import {BoundingRect, Position} from "../types";

export const normalizeBoundingRect = (rect: BoundingRect, { width, height }: { width: number; height: number }): BoundingRect => {
    return {
        left: rect.left / width,
        top: rect.top / height,
        width: rect.width / width,
        height: rect.height / height,
    };
};

export const viewportBoundingRect = (rect: BoundingRect, { width, height }: { width: number; height: number }): BoundingRect => {
    return {
        left: rect.left * width,
        top: rect.top * height,
        width: rect.width * width,
        height: rect.height * height,
    };
};

export const viewportPosition = (position: Position, viewport: {width: number; height: number }): Position => {
    const boundingRect = viewportBoundingRect(position.boundingRect, viewport);
    const rects = position.rects.map(rect => viewportBoundingRect(rect, viewport));
    return {
        ...position,
        boundingRect,
        rects,
    };
};
