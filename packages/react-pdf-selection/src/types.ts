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
export type Coords = {
    x: number;
    y: number;
};
export type TextSelectionType = {
    text: string;
    position: Position;
};
export type AreaSelectionType = {
    image: string;
    position: Position;
};
export type SelectionType = TextSelectionType | AreaSelectionType;
export type NormalizedTextSelection = {
    text: string;
    position: NormalizedPosition;
};
export type NormalizedAreaSelection = {
    image: string;
    position: NormalizedPosition;
};
export type NormalizedSelection = NormalizedTextSelection | NormalizedAreaSelection;
export type TextSelectionWithCSSProperties = {
    text: string;
    position: PositionWithCSSProperties;
}
export type AreaSelectionWithCSSProperties = {
    image: string;
    position: PositionWithCSSProperties;
}
export type SelectionWithCSSProperties = TextSelectionWithCSSProperties | AreaSelectionWithCSSProperties;
export const isAreaSelection = (selection: SelectionWithCSSProperties): selection is AreaSelectionWithCSSProperties =>
    "image" in selection;