const fs = require("fs");
const csv = require("csv-parser");
const { format } = require("fast-csv");

function convertTimestamp(timestamp) {
  // Create a new Date object using the timestamp
  const date = new Date(timestamp);

  // Extract day, month, and year
  const day = date.getDate(); // Day of the month
  let month = date.getMonth() + 1; // Month is 0-indexed in JavaScript, so add 1
  month = month.toString.length === 1 ? "0" + month : month;
  const year = date.getFullYear(); // Year

  // Format the date in "day month year" format
  return `${day}.${month}.${year}`;
}

// Function to count occurrences based on a specified column
function countOccurrences(inputCsv, outputCsv, header, altHeader) {
  const counts = {};

  fs.createReadStream(inputCsv)
    .pipe(csv({ separator: ";" }))
    .on("data", (row) => {
      // Increment count for this value in the specified column
      let value = row[header];
      if (header === "Institution") {
        value = value.split(" - ")[0];
      }
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
        record[altHeader || header] = value;
        record["Anzahl"] = count;
        csvStream.write(record);
      }

      csvStream.end();
      console.log(`Counted occurrences of '${header}' written to ${outputCsv}`);
    });
}

countOccurrences(
  "./data/kerndatensaetze-raw.csv",
  "./data/kategorien.csv",
  "Kategorie"
);

countOccurrences("./data/kerndatensaetze-raw.csv", "./data/offen.csv", "Offen");

countOccurrences(
  "./data/kerndatensaetze-raw.csv",
  "./data/erstgespraech.csv",
  "Erstgespräch"
);

countOccurrences(
  "./data/kerndatensaetze-raw.csv",
  "./data/institutionen.csv",
  "Institution",
  "Institution"
);

function formatTableForViz() {
  let newCSV = [];
  fs.createReadStream("./data/kerndatensaetze-raw.csv")
    .pipe(csv({ separator: ";" }))
    .on("data", (row) => {
      const header = Object.keys(row);
      const rowEntries = {};
      header.forEach((h) => {
        if (h === "Titel") {
          if (row["Link"]) {
            rowEntries[
              "Title"
            ] = `<a style='text-decoration: underline; line-height: 1.4;color: #222' href='${row["Link"]}' target='_blank'>${row["Titel"]}</a>`;
          } else {
            rowEntries["Title"] = `${row["Titel"]}`;
          }
        }
        if (h === "Offen") {
          if (row["Hinweis"]) {
            rowEntries["Offen"] = row["Offen"];
            rowEntries[
              "Info"
            ] = `<span style="font-size: 25px;" title="${row["Hinweis"]}">&#9432;</span>`;
          } else {
            rowEntries["Offen"] = row["Offen"];
            rowEntries["Info"] = "";
          }
        } else if (h === "Link" || h === "Hinweis") {
          // nothing
        } else {
          rowEntries[h] = row[h];
        }
      });
      newCSV.push(rowEntries);
    })
    .on("end", () => {
      const writeStream = fs.createWriteStream(
        "./data/kerndatensaetze-chart.csv"
      );
      const csvStream = format({ headers: true });
      csvStream.pipe(writeStream);

      newCSV.forEach((r) => {
        // r["Institution&ast;"] = r["Institution"];
        // delete r["Institution"];
        csvStream.write({
          Offen: r["Offen"],
          "": r["Info"],
          Titel: r["Title"],
          Kategorie: r["Kategorie"],
          Beschreibung: r["Beschreibung"],
          "Institution&ast;": r["Institution"],
          Erstgespräch: r["Erstgespräch"],
        });
      });

      // console.log("newCSV", newCSV);

      // for (const [value, count] of Object.entries(newCSV)) {
      //   const record = {};
      //   record[header] = value;
      //   record["Anzahl"] = count;
      //   csvStream.write(record);
      // }

      csvStream.end();
      // console.log(`Counted occurrences of '${header}' written to ${outputCsv}`);
    });
}

formatTableForViz();

function makeMetaData(fileName, extraText) {
  const metaData = {
    annotate: {
      notes: "Stand: " + convertTimestamp(new Date()) + extraText,
    },
  };

  fs.writeFile(
    "./data/" + fileName + ".json",
    JSON.stringify(metaData),
    {
      encoding: "utf8",
    },
    (err) => {}
  );
}

makeMetaData("metaData");

const extraText =
  " | *Mit Institutionen sind Berliner Behörde, nachgelagerte Behörden oder landeseigene Unternehmen gemeint, bei denen die Kerndatensätze vermutet werden. Es kann vorkommen, dass die hier genannten Institutionen nicht selbst die datenerhebende Stelle sind und nur eine koordinierende Rolle einnehmen.";
makeMetaData("metaDataInst", extraText);
