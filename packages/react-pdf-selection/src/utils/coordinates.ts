import {
    BoundingRect,
    BoundingRectWithCSSProperties,
    NormalizedPosition,
    Position,
    PositionWithCSSProperties,
} from "../types";

export type Dimensions = {
    width: number;
    height: number;
};

export const normalizeBoundingRect = (rect: BoundingRect, { width, height }: Dimensions): BoundingRect => {
    return {
        left: (rect.left * 100) / width,
        top: (rect.top * 100) / height,
        right: (rect.right * 100) / width,
        bottom: (rect.bottom * 100) / height,
    };
};

export const normalizePosition = (position: Position, dimensions: Dimensions): NormalizedPosition => {
    return {
        absolute: {
            boundingRect: position.boundingRect,
            rects: position.rects,
        },
        normalized: {
            boundingRect: normalizeBoundingRect(position.boundingRect, dimensions),
            rects: position.rects.map((rect) => normalizeBoundingRect(rect, dimensions)),
        },
        pageNumber: position.pageNumber,
    };
};

export const getBoundingRectWithCSSProperties = (
    rect: BoundingRect,
    { width, height }: Dimensions,
): BoundingRectWithCSSProperties => ({
    left: `${rect.left}%`,
    top: `${rect.top}%`,
    width: ((rect.right - rect.left) * width) / 100,
    height: ((rect.bottom - rect.top) * height) / 100,
});

export const getPositionWithCSSProperties = (
    position: Position,
    dimensions: Dimensions,
): PositionWithCSSProperties => ({
    ...position,
    boundingRect: getBoundingRectWithCSSProperties(position.boundingRect, dimensions),
    rects: position.rects.map((rect) => getBoundingRectWithCSSProperties(rect, dimensions)),
});

export const getAbsoluteBoundingRectWithCSSProperties = (rect: BoundingRect): BoundingRectWithCSSProperties => ({
    left: rect.left,
    top: rect.top,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top,
});
