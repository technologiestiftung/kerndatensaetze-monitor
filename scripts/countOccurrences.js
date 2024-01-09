const fs = require("fs");
const csv = require("csv-parser");
const { format } = require("fast-csv");

// Function to count occurrences based on a specified column
function countOccurrences(inputCsv, outputCsv, header) {
  const counts = {};

  fs.createReadStream(inputCsv)
    .pipe(csv())
    .on("data", (row) => {
      // Increment count for this value in the specified column
      const value = row[header];
      if (value) {
        counts[value] = (counts[value] || 0) + 1;
      }
    })
    .on("end", () => {
      // Writing counts to a new CSV file
      const writeStream = fs.createWriteStream(outputCsv);
      const csvStream = format({ headers: true });
      csvStream.pipe(writeStream);

      for (const [value, count] of Object.entries(counts)) {
        const record = {};
        record[header] = value;
        record["Count"] = count;
        csvStream.write(record);
      }

      csvStream.end();
      console.log(`Counted occurrences of '${header}' written to ${outputCsv}`);
    });
}

countOccurrences(
  "./data/kerndatensaetze.csv",
  "./data/kategorien.csv",
  "Kategorie"
);

countOccurrences("./data/kerndatensaetze.csv", "./data/offen.csv", "offen");
