import { BoundingRect } from "../types";

const sort = (rects: Array<BoundingRect>) =>
    rects.sort((A, B) => {
        const top = A.top - B.top;

        if (top === 0) {
            return A.left - B.left;
        }

        return top;
    });

const overlaps = (A: BoundingRect, B: BoundingRect) => A.left <= B.left && B.left <= A.left + A.width;

const sameLine = (A: BoundingRect, B: BoundingRect, yMargin = 5) =>
    Math.abs(A.top - B.top) < yMargin && Math.abs(A.height - B.height) < yMargin;

const inside = (A: BoundingRect, B: BoundingRect) =>
    A.top > B.top && A.left > B.left && A.top + A.height < B.top + B.height && A.left + A.width < B.left + B.width;

const nextTo = (A: BoundingRect, B: BoundingRect, xMargin = 10) => {
    const Aright = A.left + A.width;
    const Bright = B.left + B.width;

    return A.left <= B.left && Aright <= Bright && B.left - Aright <= xMargin;
};

const extendWidth = (A: BoundingRect, B: BoundingRect) => {
    // extend width of A to cover B
    A.width = Math.max(B.width - A.left + B.left, A.width);
};

const optimizeClientRects = (clientRects: Array<BoundingRect>): Array<BoundingRect> => {
    const rects = sort(clientRects);

    const toRemove = new Set();

    const firstPass = rects.filter((rect) => {
        return rects.every((otherRect) => {
            return !inside(rect, otherRect);
        });
    });

    let passCount = 0;

    while (passCount <= 2) {
        firstPass.forEach((A) => {
            firstPass.forEach((B) => {
                if (A === B || toRemove.has(A) || toRemove.has(B)) {
                    return;
                }

                if (!sameLine(A, B)) {
                    return;
                }

                if (overlaps(A, B)) {
                    extendWidth(A, B);
                    A.height = Math.max(A.height, B.height);

                    toRemove.add(B);
                }

                if (nextTo(A, B)) {
                    extendWidth(A, B);

                    toRemove.add(B);
                }
            });
        });
        passCount += 1;
    }

    return firstPass.filter((rect) => !toRemove.has(rect));
};

export const getClientRects = (
    range: Range,
    containerEl: HTMLElement,
    shouldOptimize: boolean = true,
): Array<BoundingRect> => {
    const clientRects = Array.from(range.getClientRects());

    const offset = containerEl.getBoundingClientRect();

    const rects = clientRects.map((rect) => {
        return {
            top: rect.top + containerEl.scrollTop - offset.top,
            left: rect.left + containerEl.scrollLeft - offset.left,
            width: rect.width,
            height: rect.height,
        };
    });

    return shouldOptimize ? optimizeClientRects(rects) : rects;
};

export const getBoundingRect = (clientRects: Array<BoundingRect>): BoundingRect => {
    const rects = Array.from(clientRects).map((rect) => {
        const { left, top, width, height } = rect;

        const X0 = left;
        const X1 = left + width;

        const Y0 = top;
        const Y1 = top + height;

        return { X0, X1, Y0, Y1 };
    });

    const optimal = rects.reduce((res, rect) => {
        return {
            X0: Math.min(res.X0, rect.X0),
            X1: Math.max(res.X1, rect.X1),

            Y0: Math.min(res.Y0, rect.Y0),
            Y1: Math.max(res.Y1, rect.Y1),
        };
    }, rects[0]);

    const { X0, X1, Y0, Y1 } = optimal;

    return {
        left: X0,
        top: Y0,
        width: X1 - X0,
        height: Y1 - Y0,
    };
};
