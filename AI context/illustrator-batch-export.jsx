/*
 Illustrator batch certificate exporter
 -------------------------------------

 Workflow:
 1. Open your certificate template in Adobe Illustrator and save it as a .ai file.
 2. Put a name placeholder in the template, for example:
     {{NAME}}
 3. Run this script from File > Scripts > Other Script...
 4. Select a CSV attendance file with a NAME column.
 5. Choose an output folder.

 The script reopens the saved template for each data row,
 replaces placeholders in all text frames, and exports one PDF per row.

 Naming:
 - If the file has an ID or Student ID column, the PDF is named after it.
 - Otherwise, it falls back to the name column.
 - If neither exists, it uses row-1, row-2, etc.

 Notes:
 - This keeps your Illustrator design intact and works best when each
   variable is placed in its own text frame.
 - The original template document is not modified.
 - The template must already be saved, because Illustrator scripts cannot duplicate
     the document in this environment.
*/

#target illustrator

(function () {
    if (app.documents.length === 0) {
        alert('Open your certificate template in Illustrator before running this script.');
        return;
    }

    var sourceDoc = app.activeDocument;
    if (!sourceDoc.saved) {
        alert('Please save the Illustrator template as a .ai file before running this script.');
        return;
    }

    var templateFile = sourceDoc.fullName;
    var dataFile = File.openDialog('Select the attendance file (CSV)', '*.csv');
    if (!dataFile) return;

    var outputFolder = Folder.selectDialog('Select the folder where PDFs should be saved');
    if (!outputFolder) return;

    var rows = readTable(dataFile);
    if (!rows.length) {
        alert('The attendance file is empty.');
        return;
    }

    var headers = rows[0];
    if (!headers.length) {
        alert('The first row must contain column headers.');
        return;
    }

    var dataRows = [];
    for (var r = 1; r < rows.length; r++) {
        var row = rows[r];
        if (row.length && row.join('').replace(/\s+/g, '') !== '') {
            dataRows.push(row);
        }
    }

    if (!dataRows.length) {
        alert('No data rows were found after the header row.');
        return;
    }

    var report = [];
    var exportedCount = 0;

    for (var i = 0; i < dataRows.length; i++) {
        var record = rowToObject(headers, dataRows[i]);
        var values = normalizeRecord(record);
        var pdfName = buildFileName(values, i + 1);
        var pdfFile = new File(outputFolder.fsName + '/' + pdfName + '.pdf');

        var workingDoc = app.open(templateFile);
        replacePlaceholders(workingDoc, values);

        var pdfOptions = new PDFSaveOptions();
        pdfOptions.preserveEditability = false;
        pdfOptions.viewAfterSaving = false;
        pdfOptions.generateThumbnails = true;
        pdfOptions.acrobatLayers = false;

        try {
            workingDoc.saveAs(pdfFile, pdfOptions);
            report.push('Saved ' + pdfFile.name);
            exportedCount++;
        } catch (error) {
            report.push('Failed ' + pdfFile.name + ': ' + error);
        } finally {
            workingDoc.close(SaveOptions.DONOTSAVECHANGES);
        }
    }

    alert('Export finished.\n\nExported: ' + exportedCount + '\n\n' + report.join('\n'));

    function readTable(file) {
        var extension = getExtension(file.name);
        if (extension !== 'csv') {
            throw new Error('Please export the attendance file as CSV before running this script.');
        }

        return parseCSV(readFile(file));
    }

    function readFile(file) {
        if (!file.exists) {
            throw new Error('Could not find file: ' + file.fsName);
        }

        file.encoding = 'UTF-8';
        file.open('r');
        var text = file.read();
        file.close();
        return text;
    }

    function parseCSV(text) {
        var lines = [];
        var field = '';
        var row = [];
        var inQuotes = false;

        for (var i = 0; i < text.length; i++) {
            var ch = text.charAt(i);
            var next = i + 1 < text.length ? text.charAt(i + 1) : '';

            if (ch === '"') {
                if (inQuotes && next === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (ch === ',' && !inQuotes) {
                row.push(field);
                field = '';
                continue;
            }

            if ((ch === '\n' || ch === '\r') && !inQuotes) {
                if (ch === '\r' && next === '\n') {
                    i++;
                }
                row.push(field);
                field = '';
                if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
                    lines.push(row);
                }
                row = [];
                continue;
            }

            field += ch;
        }

        if (field !== '' || row.length) {
            row.push(field);
            if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
                lines.push(row);
            }
        }

        return lines;
    }

    function rowToObject(headers, values) {
        var result = {};
        for (var i = 0; i < headers.length; i++) {
            var key = trim(headers[i]);
            if (!key) continue;
            result[key] = typeof values[i] === 'undefined' ? '' : trim(values[i]);
        }
        return result;
    }

    function normalizeRecord(record) {
        var normalized = {};
        for (var key in record) {
            if (record.hasOwnProperty(key)) {
                normalized[key] = record[key];
                normalized[key.toUpperCase()] = record[key];
                normalized[key.toLowerCase()] = record[key];
            }
        }

        if (!normalized.NAME && normalized['FULL NAME']) {
            normalized.NAME = normalized['FULL NAME'];
        }
        if (!normalized.NAME && normalized['STUDENT NAME']) {
            normalized.NAME = normalized['STUDENT NAME'];
        }

        if (!normalized.ID && normalized['STUDENT ID']) {
            normalized.ID = normalized['STUDENT ID'];
        }
        if (!normalized.STUDENT_ID && normalized['STUDENT ID']) {
            normalized.STUDENT_ID = normalized['STUDENT ID'];
        }

        return normalized;
    }

    function buildFileName(values, index) {
        var candidate = lookup(values, ['ID', 'STUDENT ID', 'STUDENT_ID', 'ROLL', 'ROLL NO', 'ROLL_NUMBER']);
        if (!candidate) {
            candidate = lookup(values, ['NAME', 'STUDENT NAME', 'FULL NAME']);
        }
        if (!candidate) {
            candidate = 'row-' + index;
        }
        return sanitizeFileName(candidate);
    }

    function lookup(values, keys) {
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (typeof values[key] !== 'undefined' && values[key] !== '') return values[key];
            if (typeof values[key.toUpperCase()] !== 'undefined' && values[key.toUpperCase()] !== '') return values[key.toUpperCase()];
            if (typeof values[key.toLowerCase()] !== 'undefined' && values[key.toLowerCase()] !== '') return values[key.toLowerCase()];
        }
        return '';
    }

    function replacePlaceholders(doc, values) {
        var frames = doc.textFrames;
        for (var i = 0; i < frames.length; i++) {
            var frame = frames[i];
            var original = frame.contents;
            var updated = replaceAllPlaceholders(original, values);
            if (updated !== original) {
                frame.contents = updated;
            }
        }
    }

    function replaceAllPlaceholders(text, values) {
        var result = text;
        for (var key in values) {
            if (!values.hasOwnProperty(key)) continue;
            var value = values[key];
            if (value === null || typeof value === 'undefined') continue;

            var variants = [
                '{{' + key + '}}',
                '{{' + key.toUpperCase() + '}}',
                '{{' + key.toLowerCase() + '}}',
                '<<' + key + '>>',
                '<<' + key.toUpperCase() + '>>',
                '<<' + key.toLowerCase() + '>>',
                '[[' + key + ']]',
                '[[' + key.toUpperCase() + ']]',
                '[[' + key.toLowerCase() + ']]'
            ];

            for (var i = 0; i < variants.length; i++) {
                result = replaceText(result, variants[i], value);
            }
        }
        return result;
    }

    function replaceText(text, search, replacement) {
        var escaped = escapeRegExp(search);
        var matcher = new RegExp(escaped, 'g');
        return text.replace(matcher, replacement);
    }

    function escapeRegExp(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function sanitizeFileName(text) {
        return String(text)
            .replace(/[\\\/\:\*\?\"\<\>\|]/g, '_')
            .replace(/\s+/g, ' ')
            .replace(/^\s+|\s+$/g, '');
    }

    function trim(text) {
        return String(text).replace(/^\s+|\s+$/g, '');
    }

    function getExtension(name) {
        var parts = String(name).split('.');
        if (parts.length < 2) return '';
        return trim(parts[parts.length - 1]).toLowerCase();
    }
})();