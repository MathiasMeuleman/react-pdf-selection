import React, {useState} from "react";
import {AreaHighlightTip, PdfLoader, PdfViewer, TextHighlightTip} from "react-pdf-annotator";

import "./HighlightTip.css";

function App() {
    const urls = ["https://arxiv.org/pdf/1708.08021.pdf", "https://arxiv.org/pdf/1604.02480.pdf"];
    const [urlIdx, setUrlIdx] = useState(0);
    const [highlightTip, setHighlightTip] = useState<TextHighlightTip | AreaHighlightTip>();
    const toggleUrl = () => setUrlIdx(urlIdx > 0 ? 0 : 1);

    const renderHighlightTip = (highlightTip: TextHighlightTip | AreaHighlightTip) => (
        <div
            className="pdfViewer__highlight-tip"
            style={{
                top: highlightTip.position.pageOffset + highlightTip.position.boundingRect.top - 40,
            }}
        >Add highlight</div>
    );

    const setAndLogSelection = (highlightTip?: TextHighlightTip | AreaHighlightTip) => {
        console.log(highlightTip);
        setHighlightTip(highlightTip);
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
            <PdfLoader url={urls[urlIdx]} beforeLoad={<h1>Loading...</h1>}>
                {(pdfDocument) => (
                    <PdfViewer
                        pdfDocument={pdfDocument}
                        enableAreaSelection={event => event.altKey}
                        onTextSelection={setAndLogSelection}
                        onAreaSelection={setAndLogSelection}
                    >
                        <div className="pdfViewer__highlight-tip-container">
                            {highlightTip && renderHighlightTip(highlightTip)}
                        </div>
                    </PdfViewer>
                )}
            </PdfLoader>
            <div style={{
                position: "absolute",
                top: 0,
                right: 0,
                zIndex: 99,
            }}>
                <button onClick={() => toggleUrl()}>Switch document</button>
            </div>
        </div>
    );
}

export default App;
