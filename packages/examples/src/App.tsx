import React, { useState } from "react";
import { NormalizedSelection, PdfViewer } from "react-pdf-selection";
import { pdfs } from "./example-pdfs";
import { SelectionTooltip } from "./SelectionTooltip";

import "./App.css";

const App = () => {
    const [pdfIdx, setPdfIdx] = useState(0);
    const [selection, setSelection] = useState<NormalizedSelection>();
    const toggleUrl = () => setPdfIdx(pdfIdx > 0 ? 0 : 1);

    const setAndLogSelection = (highlightTip?: NormalizedSelection) => {
        console.log(highlightTip);
        setSelection(highlightTip);
    };

    return (
        <div className="app-container">
            <div className="wrapper">
                <div className="pdf-viewer">
                    <PdfViewer
                        url={pdfs[pdfIdx].url}
                        selections={pdfs[pdfIdx].selections}
                        enableAreaSelection={(event) => event.altKey}
                        onTextSelection={setAndLogSelection}
                        onAreaSelection={setAndLogSelection}
                    >
                        {/*<div className="pdfViewer__highlight-tip-container">*/}
                        {/*    {selection && <SelectionTooltip selection={selection} />}*/}
                        {/*</div>*/}
                    </PdfViewer>
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            zIndex: 99,
                        }}
                    >
                        <button onClick={() => toggleUrl()}>Switch document</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
