# Illustrator Certificate Batch Export Guide

Use this when you already designed the certificate in Illustrator and need to generate many personalized PDFs.

## Recommended setup

1. Open your certificate template in Illustrator and save it as a `.ai` file.
2. Put the name in a separate text frame using the placeholder marker `{{NAME}}`.
3. Save the template as your working `.ai` file.
4. Prepare a CSV attendance file with a `NAME` column, or use your existing `Full Name` column. Add an `ID` or `Student ID` column if you want the PDFs named by ID.
5. Run the script in `illustrator-batch-export.jsx`.

## CSV example

```csv
ID,NAME,DEPARTMENT,DATE,AWARD
241408038,Abdullah Hossain,CSE,2026-07-23,Participation Certificate
242448038,Sadia Rahman,EEE,2026-07-23,Participation Certificate
```

## How the script behaves

- It reopens the saved Illustrator template for each data row.
- It replaces the `{{NAME}}` placeholder in the duplicated document.
- It exports one PDF per row.
- PDF files are named from `ID`, `Student ID`, `Student_ID`, `Roll`, or `Name` if present.
- If no ID-like field exists, it falls back to `row-1`, `row-2`, etc.

## Why this works better for complex designs

This approach does not require redesigning the certificate for every student. You keep the full layout, artwork, borders, signatures, and effects inside Illustrator, and only swap the text fields on export.

The template must be saved before running the script, because the script reopens the `.ai` file for each certificate export.

If your certificate only changes the student name, just keep that one text box linked to `{{NAME}}`. The rest of the design stays fixed.

Your current CSV format with `Student ID` and `Full Name` is already supported by the script, so you do not need to rename the columns.

## If you need more control

If your design needs different fonts or formatting for the name, keep that name field in its own text box. Illustrator will keep the frame styling while the script changes the text content.

If you want, the script can be extended later to:
- read from Excel instead of CSV
- export to a specific folder automatically
- add custom filename rules
- use different placeholder styles
