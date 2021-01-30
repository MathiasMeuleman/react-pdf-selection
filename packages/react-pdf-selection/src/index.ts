import { NewAreaSelection } from "./components/NewAreaSelection";
import { PdfViewer, PageDimensions } from "./components/PdfViewer";
import {
    AreaSelectionType,
    BoundingRect,
    BoundingRectWithCSSProperties,
    NormalizedAreaSelection,
    NormalizedPosition,
    NormalizedSelection,
    NormalizedTextSelection,
    Position,
    SelectionType,
    TextSelectionType,
    TextSelectionWithCSSProperties,
    AreaSelectionWithCSSProperties,
    SelectionWithCSSProperties,
} from "./types";

export type {
    PageDimensions,
    BoundingRect,
    BoundingRectWithCSSProperties,
    Position,
    NormalizedPosition,
    SelectionType,
    AreaSelectionType,
    TextSelectionType,
    NormalizedSelection,
    NormalizedAreaSelection,
    NormalizedTextSelection,
    SelectionWithCSSProperties,
    AreaSelectionWithCSSProperties,
    TextSelectionWithCSSProperties,
};
export { NewAreaSelection, PdfViewer };
