import { CSSProperties } from "react";

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
export type TextSelectionType<D extends object = {}> = D & {
    text: string;
    position: Position;
    color?: CSSProperties["color"];
};

export type AreaSelectionType<D extends object = {}> = D & {
    image: string;
    position: Position;
};

export type SelectionType<D extends object = {}> = TextSelectionType<D> | AreaSelectionType<D>;

export type NormalizedTextSelection = {
    text: string;
    position: NormalizedPosition;
};

export type NormalizedAreaSelection = {
    image: string;
    position: NormalizedPosition;
};

export type NormalizedSelection = NormalizedTextSelection | NormalizedAreaSelection;

export type TextSelectionWithCSSProperties<D extends object = {}> = D & {
    text: string;
    position: PositionWithCSSProperties;
    color?: CSSProperties["color"];
};

export type AreaSelectionWithCSSProperties<D extends object = {}> = D & {
    image: string;
    position: PositionWithCSSProperties;
};

export type SelectionWithCSSProperties<D extends object = {}> =
    | TextSelectionWithCSSProperties<D>
    | AreaSelectionWithCSSProperties<D>;

export const isAreaSelection = <D extends object = {}>(
    selection: SelectionWithCSSProperties<D>,
): selection is AreaSelectionWithCSSProperties<D> => "image" in selection;
