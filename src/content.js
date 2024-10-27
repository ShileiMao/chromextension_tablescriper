import axios from 'axios';

axios.get(document.location).then(data => {
  console.log("got data: " +data.data)
})

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

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log(`Received message: ${JSON.stringify(request)}`);
  if (request.action === "scrapeTable") {
    try {
      await DownloadData()
    } catch(error) {
      console.error(error)
      alert("Failed to download data: " + error)
    }
    /*
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
    */
  }
  return true; // Keeps the messaging channel open for async sendResponse
});


// download data
const compare = function (x, y) {
  var val1 = x;
  var val2 = y;
  if (!isNaN(Number(val1)) && !isNaN(Number(val2))) {
      val1 = Number(val1);
      val2 = Number(val2);
  }
  if (val1 < val2) {
      return -1;
  } else if (val1 > val2) {
      return 1;
  } else {
      return 0;
  }
};


async function setPreset() {
  const ssStr = await axios.get("https://elekta.axeda.com/drm/actions/home/user-preferences/show");
  console.log("got response from preset: " + ssStr.data)
  ssStr = ssStr.data.replace(/[\r\n]/g, "");
  ssStr = ssStr.replace(/ |\t/g, "");
  const ss_acsrf_req_idt = ssStr.match(/\"acsrf_req_idt\"value=\"(\S*)\"><tableclass/)[1];

  let s1 = "acsrf_req_idt=" + ss_acsrf_req_idt;
  s1 += "&timezone=Asia%2FShanghai";
  s1 += "&localeId=en_GB&notificationEncoding=UTF8&application=3&numRowsInLongTable=500&numRowsInShortTable=500";

  const data = new FormData();
  data.append('acsrf_req_idt', ss_acsrf_req_idt);
  //	data.append('timezone', 'Asia/Shanghai');
  data.append('localeId', 'en_GB');
  data.append('notificationEncoding', 'UTF8');
  data.append('numRowsInLongTable', '1000');
  data.append('numRowsInShortTable', '1000');
  data.append('application', '3');

  await axios.post("https://elekta.axeda.com/drm/actions/home/user-preferences/modify", {
    Headers: {
      "Content-Type": "application/x-www-form-urlencoded;"
    }
  })

  return "1";
}

async function DownloadData() {
  let myPages = 1;
  let strUr = "https://elekta.axeda.com/drm/actions/service/device/details/data/historical?table_name=historical_data_values&filter_preserve=true&page_num=";
  var a1 = 0;
  var myPagesQty = 0;
  let ssPreset = ""
  if (ssPreset == "") {
      ssPreset = await setPreset();
  }
  let response = ""
  try {
    response = await axios.get(strUr + myPages).data;
  } catch (e) {
      alert("Error while opening the website.");
      return;
  }
  const strData = [];
  response = response.replace(/[\r\n]/g, "");
  let str2 = response.replace(/ |\t/g, "");
  if (str2.match(RegExp(/username|password/))) {
      alert("No login in. Please login axeda and try.");
      return -2;
  }
  if (str2.match(RegExp(/Items 1/))) {
      alert("Error in webpage, please try later.");
      return -2;
  }

  let bb1 = response.split("Items 1 - ")[1];
  let bb2 = bb1.split(" ");
  myPagesQty = Math.ceil(bb2[2] / bb2[0]);
  bb1 = str2.split("toricalDataItemValues");
  bb1 = bb1[0].match(/Axeda:(\S*):His/);
  if (bb1.length > 0) {
      if (bb1[1] - 100000 > 0 && bb1[1] - 160000 < 0)
          var linacSN = bb1[1];
  }
  let str1 = response
  bb1 = str1.split("dhtml_levelTwoButtons_serviceRecentDevices");
  bb1 = bb1[2].split("\"");
  var linacOrg = (bb1[1].split("\:"))[1].replace(linacSN, "");
  while (linacOrg.slice(-1) == ' ' || linacOrg.slice(-1) == '-') {
      linacOrg = linacOrg.slice(0, -1);
  }
  a1 = 0;
  do {
      response = response.replace(/[\r\n]/g, "");
      response = response.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
      response = response.replace(/<a\b[^<]*(?:(?!<\/a>)<[^<]*)*<\/a>/gi, "");
      response = response.replace(/<option\b[^<]*(?:(?!<\/option>)<[^<]*)*<\/option>/gi, "");
      bb1 = response.split("<tr class");
      for (var i = 2; i < bb1.length; i++) {
          str1 = bb1[i].replace(/  /g, "");
          str1 = str1.replace(/<\/td><td width\=\"45\%\">|<\/td><td width\=\"20\%\">/g, "QAZWSX");
          str1 = str1.replace(/<td width\=\"20\%\">|CST<\/td><td/g, "QAZWSX");
          bb2 = str1.split("QAZWSX");
          var aa1 = pasreDateTime(bb2[3]);
          str1 = aa1 + "\t" + bb2[1] + "\t" + bb2[2] + "\t" + bb2[3];
          strData.push(str1);
          a1++;
      }
      myPages++;
      if (myPages > myPagesQty) break;
      const nextResponse = await axios(strUr + myPages);
      response = nextResponse.data;
  } while (1);
  if (a1 == 0 && linacSN != "8888") {
      alert("Done! NO DATA for " + linacSN + "\r\n");
  } else {
      strData.sort(compare);
      // getChart();
      const csvData = strData.join("\n")
      downloadCSV(csvData, "LinacData.csv")
      alert("Done!\r\n");
  }
  return
}