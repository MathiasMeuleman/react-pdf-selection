import {BoundingRect} from "../types";

const sort = (rects: Array<BoundingRect>) =>
    rects.sort((A, B) => {
        const top = A.top - B.top;

        if (top === 0) {
            return A.left - B.left;
        }

        return top;
    });

const overlaps = (A: BoundingRect, B: BoundingRect) => A.left <= B.left && B.left <= A.right;

const sameLine = (A: BoundingRect, B: BoundingRect, yMargin = 5) =>
    Math.abs(A.top - B.top) < yMargin && Math.abs(A.bottom - B.bottom) < yMargin;

const inside = (A: BoundingRect, B: BoundingRect) =>
    A.top > B.top && A.left > B.left && A.bottom < B.bottom && A.right < B.right;

const nextTo = (A: BoundingRect, B: BoundingRect, xMargin = 10) => {
    return A.left <= B.left && A.right <= B.right && B.left - A.right <= xMargin;
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

                if (overlaps(A, B) || nextTo(A, B)) {
                    A.right = Math.max(A.right, B.right);
                    A.bottom = Math.max(A.bottom, B.bottom);

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
    console.log(offset, containerEl);

    const rects = clientRects.map((rect) => {
        const top = rect.top + containerEl.scrollTop - offset.top;
        const left = rect.left + containerEl.scrollLeft - offset.left;
        return {
            top,
            left,
            right: left + rect.width,
            bottom: top + rect.height,
        };
    });

    return shouldOptimize ? optimizeClientRects(rects) : rects;
};

export const getBoundingRect = (clientRects: Array<BoundingRect>): BoundingRect => {
    return clientRects.reduce((res, rect) => {
        return {
            left: Math.min(res.left, rect.left),
            top: Math.min(res.top, rect.top),

            right: Math.max(res.right, rect.right),
            bottom: Math.max(res.bottom, rect.bottom),
        };
    }, clientRects[0]);
};
