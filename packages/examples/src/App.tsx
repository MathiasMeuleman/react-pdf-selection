import React, {ReactElement} from "react";
import {
    BoundingRect,
    Content,
    PdfLoader,
    PdfViewer,
    Scaled,
    ScaledPosition,
    ViewportHighlight,
} from "react-pdf-annotator";

function App() {

    const highlightTransform = (
        highlight: ViewportHighlight,
        index: number,
        setTip: (
            highlight: ViewportHighlight,
            callback: (highlight: ViewportHighlight) => ReactElement,
        ) => void,
        hideTip: () => void,
        viewportToScaled: (rect: BoundingRect) => Scaled,
        screenshot: (position: BoundingRect) => string,
        isScrolledTo: boolean,
    ) => {
        console.log(highlight, index, setTip, hideTip, viewportToScaled, screenshot, isScrolledTo);
        return <React.Fragment key={index}></React.Fragment>;
    };

    const onSelectionFinished = (
        position: ScaledPosition,
        content: Content,
        hideTipAndSelection: () => void,
        transformSelection: () => void,
    ) => {
        console.log(position, content, hideTipAndSelection, transformSelection);
        return undefined;
    };

    return (
        <div
            style={{
                width: "100vw",
                height: "100vh",
                position: "relative",
                textAlign: "center",
            }}
        >
            <PdfLoader url={"https://arxiv.org/pdf/1708.08021.pdf"} beforeLoad={<h1>Loading...</h1>}>
                {(pdfDocument) => (
                    <PdfViewer
                        enableAreaSelection={(event: MouseEvent) => event.altKey}
                        pdfDocument={pdfDocument}
                        scrollRef={scrollTo => {
                            console.log(scrollTo);
                        }}
                        onScrollChange={() => {
                            console.log("Scroll changed");
                        }}
                        highlightTransform={highlightTransform}
                        // onSelectionFinished={onSelectionFinished}
                        highlights={[]}
                    />
                )}
            </PdfLoader>
        </div>
    );
}

export default App;
