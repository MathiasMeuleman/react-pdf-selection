import { BoundingRect, NormalizedPosition, Position } from "../types";

type Viewport = {
    width: number;
    height: number;
    pageOffset: number;
};

export const relativizeBoundingRect = (rect: BoundingRect, { pageOffset }: Viewport): BoundingRect => {
    return {
        ...rect,
        top: rect.top - pageOffset,
    };
};

export const normalizeBoundingRect = (rect: BoundingRect, { width, height, pageOffset }: Viewport): BoundingRect => {
    return {
        left: rect.left / width,
        top: (rect.top - pageOffset) / height,
        width: rect.width / width,
        height: rect.height / height,
    };
};

export const normalizePosition = (position: Position, viewport: Viewport): NormalizedPosition => {
    return {
        absolute: {
            boundingRect: position.boundingRect,
            rects: position.rects,
        },
        relative: {
            boundingRect: relativizeBoundingRect(position.boundingRect, viewport),
            rects: position.rects.map((rect) => relativizeBoundingRect(rect, viewport)),
        },
        normalized: {
            boundingRect: normalizeBoundingRect(position.boundingRect, viewport),
            rects: position.rects.map((rect) => normalizeBoundingRect(rect, viewport)),
        },
        pageNumber: position.pageNumber,
    };
};

export const viewportBoundingRect = (rect: BoundingRect, { width, height, pageOffset }: Viewport): BoundingRect => {
    return {
        left: rect.left * width,
        top: rect.top * height + pageOffset,
        width: rect.width * width,
        height: rect.height * height,
    };
};

export const positionToViewport = (position: Position, viewport: Viewport): Position => {
    return {
        boundingRect: viewportBoundingRect(position.boundingRect, viewport),
        rects: position.rects.map((rect) => viewportBoundingRect(rect, viewport)),
        pageNumber: position.pageNumber,
    };
};

export const viewportPosition = (position: NormalizedPosition, viewport: Viewport): Position => {
    return {
        boundingRect: viewportBoundingRect(position.normalized.boundingRect, viewport),
        rects: position.normalized.rects.map((rect) => viewportBoundingRect(rect, viewport)),
        pageNumber: position.pageNumber,
    };
};
