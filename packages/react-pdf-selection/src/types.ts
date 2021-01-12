export type BoundingRect = {
    left: number;
    top: number;
    right: number;
    bottom: number;
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
