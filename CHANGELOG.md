# Changelog

### 0.6.15
Fix wrong visible pages calculations that would break on the edges of the PDF.

### 0.6.14
Improvements on selection changes, removing inconsistencies in active selections.

### 0.6.13
- Move SelectionChange listener back to document, since there are troubles with selectionchange listeners on divs.
- Change the default textSelectionColor value

### 0.6.12
Tighten boundaries of selection change event listeners

### 0.6.11
Improve custom text selection color handling

### 0.6.10
Move `PdfViewer` `selectionMap` from class property to state.

### 0.6.9
Keep better track of selected contents, to avoid calling the `onSelection` callback functions too often.

### 0.6.8
Wrap custom TextSelectionComponent and AreaSelectionComponent usages in React Fragments with appropriate `key` props
to help perform rerendering more efficiently.

### 0.6.7
- Change `textSelectionComponent`, `areaSelectionComponent` and `newAreaSelectionComponent` types to render functions.
This will allow external props to be plugged in more easily when necessary.
- Add generic types to all ...Selection... types. This allows supplemental fields to passed with the Selection
objects, which will still be correctly typed when they are passed back in e.g. the `TextSelection` component props.

### 0.6.6
Set `box-sizing` to `content-box` to ensure that box model calculations for page placeholders is done correctly.

### 0.6.5
Improved `pageYOffsets` calculations.

### 0.6.4
- Improved rerendering of `PdfViewer`. This allows functions to passed to `children`, instead of components,
without triggering a deep rerender at each update.
- Add mentions of memoization in the docs for `PdfViewer` props.

### 0.6.3
- Add page loading component, allow document loading prop to override default loading component shown.
- Add `onPageDimensions` prop to `PdfViewer` that receives the calculated page dimension data.

### 0.6.2
Have `PdfViewer` accept a React component as `children` that will receive the rendered PDF Document.
Default the PDF Document will be rendered.

### 0.6.1
Two fixes:
- `scale` and `overscanCount` were moved to `props` to make sure the PDF is rerendered correctly,
the page dimensions are now recalculated on `scale` update.
- The `underscanPages` calculation was broken, is now not broken.

### 0.6.0
Replace `react-window` virtualizer with custom implementation. The use of `react-window` imposed
a few limitations on the `PdfViewer`, such as constantly changing Document heights, very frequent
CSS updates for relatively expensive page renders, etc. While these properties might work for a
large range of applications and provide support for lots of different purposes, virtualization in
the case of this library could be simplified. By using page placeholders with the same dimensions
as the actual pages, the document dimensions do not update on scroll, allowing more overriding of
the Document render function (to come in a future update).

### 0.5.0
Add customizable components for text and area selections, update README

### 0.4.1
Update README, add CHANGELOG to repository

### 0.4.0
Virtualize pages with the `react-window` package. This helps tremendously with initial page load
for large PDF files.

### 0.3.1
- Update README

### 0.3.0
Replace PDF.JS viewer with React PDF. This gives more control over how individual pages are
rendered. Selection positions are now rendered using percentages instead of pixel values,
since pixel values could proof inaccurate after normalizing to the (0, 1) domain and
transforming the coordinates back to the current viewport.

### 0.2.0
First working version, including:
- PDF rendering with PDF.JS
- Text and rectangular selections
- Normalized positions provided in selections
