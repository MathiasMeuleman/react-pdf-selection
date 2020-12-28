import {BoundingRect} from "../types";

export const getAreaAsPNG = (canvas: HTMLCanvasElement, position: BoundingRect): string => {
    const { left, top, width, height } = position;

    const newCanvas = canvas.ownerDocument.createElement("canvas");
    newCanvas.width = width;
    newCanvas.height = height;

    const newCanvasContext = newCanvas.getContext("2d");

    if (!newCanvasContext) {
        return "";
    }

    const dpr = window.devicePixelRatio;

    newCanvasContext.drawImage(
        canvas,
        left * dpr,
        top * dpr,
        width * dpr,
        height * dpr,
        0,
        0,
        width,
        height
    );

    return newCanvas.toDataURL("image/png");
};
