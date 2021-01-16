# Changelog

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
