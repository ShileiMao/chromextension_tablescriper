let lastClickPosition = { x: 0, y: 0 };

document.addEventListener('contextmenu', (event) => {
  lastClickPosition = { x: event.clientX, y: event.clientY };
  console.log(`Right click at (${event.clientX}, ${event.clientY})`);
});

function getTableElement(el) {
  while (el && el.tagName !== 'TABLE') {
    el = el.parentElement;
  }
  return el || null;
}

function getTableAtClickPosition(x, y) {
  return new Promise((resolve, reject) => {
    const elements = document.elementsFromPoint(x, y);
    const table = elements.map(el => getTableElement(el)).find(el => el !== null);
    if (table) {
      console.log("Table found");
      resolve(table);
    } else {
      console.log("No table found");
      reject("No table found at this location");
    }
  });
}

function scrapeTable(table) {
  console.log("Scraping table");
  const rows = Array.from(table.rows);
  const csvContent = rows.map(row => {
    const cells = Array.from(row.cells);
    return cells.map(cell => `"${cell.innerText}"`).join(",");
  }).join("\n");
  console.log("Table scraped");
  return csvContent;
}

function downloadCSV(content, filename) {
  console.log("Preparing to download CSV");
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  console.log("CSV download initiated via link");
}

function handlePagination(table) {
  console.log("Handling pagination");
  const nextPageLink = document.querySelector('a[rel="next"]');
  if (nextPageLink) {
    console.log("Next page link found, clicking");
    nextPageLink.click();
    setTimeout(() => {
      getTableAtClickPosition(table.getBoundingClientRect().x, table.getBoundingClientRect().y)
        .then(nextTable => {
          if (nextTable) {
            const nextCSV = scrapeTable(nextTable);
            downloadCSV(nextCSV, 'table_data.csv');
          } else {
            console.log("No additional table found on subsequent pages.");
          }
        }).catch(error => {
          console.error("Error handling pagination:", error);
        });
    }, 3000);
  } else {
    console.log("No pagination link found");
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`Received message: ${JSON.stringify(request)}`);
  if (request.action === "scrapeTable") {
    if (lastClickPosition.x === 0 && lastClickPosition.y === 0) {
      console.error("No click position recorded");
      sendResponse({ success: false, error: "No click position recorded" });
    } else {
      getTableAtClickPosition(lastClickPosition.x, lastClickPosition.y)
        .then(table => {
          if (!table) {
            console.log("No table found at clicked position");
            sendResponse({ success: false, error: "No table found" });
          } else {
            const csvContent = scrapeTable(table);
            downloadCSV(csvContent, 'table_data.csv');
            handlePagination(table);
            sendResponse({ success: true });
          }
        })
        .catch(error => {
          console.error("Error scraping table:", error);
          sendResponse({ success: false, error: error.message });
        });
    }
  }
  return true; // Keeps the messaging channel open for async sendResponse
});
