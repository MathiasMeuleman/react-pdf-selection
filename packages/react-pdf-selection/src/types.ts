import {CSSProperties} from "react";

export type BoundingRect = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};

export type BoundingRectWithCSSProperties = {
    top: CSSProperties["top"];
    left: CSSProperties["left"];
    width: CSSProperties["width"];
    height: CSSProperties["height"];
};

export type SelectionRects = {
    boundingRect: BoundingRect;
    rects: Array<BoundingRect>;
};

export type Position = {
    pageNumber: number;
} & SelectionRects;

export type NormalizedPosition = {
    absolute: SelectionRects;
    normalized: SelectionRects;
    pageNumber: number;
};

export type PositionWithCSSProperties = {
    pageNumber: number;
    boundingRect: BoundingRectWithCSSProperties;
    rects: BoundingRectWithCSSProperties[];
};
