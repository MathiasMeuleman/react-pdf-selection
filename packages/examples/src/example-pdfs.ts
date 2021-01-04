import { SelectionType } from "react-pdf-selection";

export const pdfs: { url: string; selections: SelectionType[] }[] = [
    {
        url: "https://arxiv.org/pdf/1708.08021.pdf",
        selections: [
            {
                "text": " 1.2    Overview",
                "position": {
                    "boundingRect": {
                        "left": 0.11752693422379032,
                        "top": 0.4810394925107524,
                        "width": 0.13823655651461694,
                        "height": 0.016550522648083623
                    },
                    "rects": [
                        {
                            "left": 0.11752693422379032,
                            "top": 0.4810394925107524,
                            "width": 0.13823655651461694,
                            "height": 0.016550522648083623
                        }
                    ],
                    "pageNumber": 2
                }
            },
            {
                "image": "data:image/png;base64,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",
                "position": {
                    "boundingRect": {
                        "left": 0.15354838709677418,
                        "top": 0.22125435540069685,
                        "width": 0.13161290322580646,
                        "height": 0.047038327526132406
                    },
                    "rects": [
                        {
                            "left": 0.15354838709677418,
                            "top": 0.22125435540069685,
                            "width": 0.13161290322580646,
                            "height": 0.047038327526132406
                        }
                    ],
                    "pageNumber": 2
                }
            },
            {
                "text": " Theorem",
                "position": {
                    "boundingRect": {
                        "left": 0.13802151587701614,
                        "top": 0.15638791393319904,
                        "width": 0.0795268790952621,
                        "height": 0.016550522648083623
                    },
                    "rects": [
                        {
                            "left": 0.13802151587701614,
                            "top": 0.15638791393319904,
                            "width": 0.0795268790952621,
                            "height": 0.016550522648083623
                        }
                    ],
                    "pageNumber": 58
                }
            },
            {
                "image": "data:image/png;base64,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",
                "position": {
                    "boundingRect": {
                        "left": 0.13470873786407767,
                        "top": 0.18278688524590164,
                        "width": 0.15776699029126215,
                        "height": 0.04918032786885246
                    },
                    "rects": [
                        {
                            "left": 0.13470873786407767,
                            "top": 0.18278688524590164,
                            "width": 0.15776699029126215,
                            "height": 0.04918032786885246
                        }
                    ],
                    "pageNumber": 58
                }
            },
        ],
    },
    {
        url: "https://arxiv.org/pdf/1604.02480.pdf",
        selections: [],
    },
];
