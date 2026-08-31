export const CSV_MAX_BYTES = 2 * 1024 * 1024;
export const CSV_MAX_DATA_ROWS = 5000;

export type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function parseCsv(text: string): ParsedCsv {
  if (utf8ByteLength(text) > CSV_MAX_BYTES) {
    throw new Error("CSV import must be 2 MiB or smaller");
  }

  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;
  let justClosedQuote = false;
  let endedWithRecordTerminator = false;

  const finishField = () => {
    record.push(field);
    field = "";
    justClosedQuote = false;
  };

  const finishRecord = () => {
    finishField();
    records.push(record);
    record = [];
    endedWithRecordTerminator = true;
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          justClosedQuote = true;
        }
      } else {
        field += char;
      }
      endedWithRecordTerminator = false;
      continue;
    }

    if (char === '"') {
      if (field.length !== 0 || justClosedQuote) {
        throw new Error("Malformed CSV: unexpected quote in unquoted field");
      }
      inQuotes = true;
      endedWithRecordTerminator = false;
      continue;
    }

    if (justClosedQuote && char !== "," && char !== "\r" && char !== "\n") {
      throw new Error("Malformed CSV: unexpected characters after quoted field");
    }

    if (char === ",") {
      finishField();
      endedWithRecordTerminator = false;
      continue;
    }

    if (char === "\r" || char === "\n") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      finishRecord();
      continue;
    }

    field += char;
    endedWithRecordTerminator = false;
  }

  if (inQuotes) {
    throw new Error("Malformed CSV: unterminated quoted field");
  }

  if (!endedWithRecordTerminator || field.length > 0 || record.length > 0) {
    finishField();
    records.push(record);
  }

  if (records.length === 0 || (records.length === 1 && records[0].length === 1 && records[0][0] === "")) {
    throw new Error("CSV import requires a header row");
  }

  const [rawHeaders, ...rows] = records;
  const headers = [...rawHeaders];
  if (headers[0]?.startsWith("\uFEFF")) headers[0] = headers[0].slice(1);

  if (rows.length > CSV_MAX_DATA_ROWS) {
    throw new Error("CSV import cannot contain more than 5,000 data rows");
  }

  return { headers, rows };
}
