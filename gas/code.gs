/**
 * Badminton Group Management - Backend (Google Apps Script)
 */

const SHEET_NAMES = {
  RESPONSES: "Responses",
  SESSIONS: "Sessions",
  PAYMENTS: "Payments",
  SCHEDULED: "Scheduled"
};

function doGet(e) {
  const action = e.parameter.action;
  const result = { success: false };

  try {
    switch (action) {
      case "getScheduled":
        result.data = getScheduledSessions(e.parameter.offset || 0);
        result.success = true;
        break;
      case "getSessionDetails":
        result.data = getSessionDetails(e.parameter.sessionId);
        result.success = true;
        break;
      case "getToday":
        result.data = getAttendanceBySessionId(e.parameter.sessionId);
        result.success = true;
        break;
      case "getTracker":
        result.data = getPaymentTracker();
        result.success = true;
        break;
      case "getHistory":
        result.data = getSessionHistory();
        result.success = true;
        break;
      default:
        result.error = "Invalid action";
    }
  } catch (error) {
    result.error = error.toString();
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const action = params.action;
  const result = { success: false };

  try {
    switch (action) {
      case "createSession":
        result.data = createScheduledSession(params.date, params.time);
        result.success = true;
        break;
      case "poll":
        result.success = handlePoll(params.name, params.status, params.sessionId);
        break;
      case "addExtraPlayers":
        result.success = addExtraPlayers(params.names, params.sessionId);
        break;
      case "removePlayers":
        result.success = removePlayers(params.names, params.sessionId);
        break;
      case "syncSession":
        result.success = syncSession(params.sessionData);
        break;
      case "markPaid":
        result.success = markPaid(params.name, params.paid, params.sessionId);
        break;
      default:
        result.error = "Invalid action";
    }
  } catch (error) {
    result.error = error.toString();
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- Helper Functions ---

function getDateStringByOffset(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + parseInt(offset));
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  
  // Ensure headers exist and are correct
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
  if (headers[0] === "") {
    if (name === SHEET_NAMES.RESPONSES) sheet.appendRow(["Date", "Name", "Status", "Timestamp", "SessionID"]);
    if (name === SHEET_NAMES.SESSIONS) sheet.appendRow(["Date", "CourtCharge", "ShuttleCharge", "ExpectedCount", "FinalCount", "Total", "PerHead", "QRLink", "Timestamp", "SessionID"]);
    if (name === SHEET_NAMES.PAYMENTS) sheet.appendRow(["Date", "Name", "Amount", "Paid", "Timestamp", "SessionID"]);
    if (name === SHEET_NAMES.SCHEDULED) sheet.appendRow(["SessionID", "Date", "Time", "CreatedAt"]);
  } else {
    // Check if SessionID column needs to be added to existing sheets
    if (name === SHEET_NAMES.RESPONSES && headers.length < 5) sheet.getRange(1, 5).setValue("SessionID");
    if (name === SHEET_NAMES.SESSIONS && headers.length < 10) sheet.getRange(1, 10).setValue("SessionID");
    if (name === SHEET_NAMES.PAYMENTS && headers.length < 6) sheet.getRange(1, 6).setValue("SessionID");
  }
  
  return sheet;
}

// --- Action Handlers ---

function createScheduledSession(date, time) {
  const sheet = getSheet(SHEET_NAMES.SCHEDULED);
  const sessionId = "S" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmss") + Math.floor(Math.random() * 1000);
  sheet.appendRow([sessionId, date, time, new Date()]);
  return sessionId;
}

function getScheduledSessions(offset = 0) {
  const sheet = getSheet(SHEET_NAMES.SCHEDULED);
  const sessionSheet = getSheet(SHEET_NAMES.SESSIONS);
  const data = sheet.getDataRange().getValues();
  const sessionData = sessionSheet.getDataRange().getValues();
  const billedSessionIds = sessionData.map(row => row[9]); // SessionID is col 10
  
  const targetDate = getDateStringByOffset(offset);
  const sessions = [];

  for (let i = 1; i < data.length; i++) {
    const sid = data[i][0];
    const rowDate = Utilities.formatDate(new Date(data[i][1]), Session.getScriptTimeZone(), "yyyy-MM-dd");
    
    // Only show sessions for the target date that HAVEN'T been billed yet
    if (rowDate === targetDate && !billedSessionIds.includes(sid)) {
      sessions.push({
        id: sid,
        date: rowDate,
        time: data[i][2]
      });
    }
  }
  return sessions;
}

function getSessionDetails(sessionId) {
  const sheet = getSheet(SHEET_NAMES.SCHEDULED);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === sessionId) {
      return {
        id: data[i][0],
        date: Utilities.formatDate(new Date(data[i][1]), Session.getScriptTimeZone(), "yyyy-MM-dd"),
        time: data[i][2]
      };
    }
  }
  return null;
}

function handlePoll(name, status, sessionId) {
  const sheet = getSheet(SHEET_NAMES.RESPONSES);
  const session = getSessionDetails(sessionId);
  if (!session) return false;
  
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][4] === sessionId && data[i][1].toString().toLowerCase() === name.toLowerCase()) {
      sheet.deleteRow(i + 1);
    }
  }

  if (status.toUpperCase() === "YES") {
    sheet.appendRow([session.date, name, "YES", new Date(), sessionId]);
  }
  return true;
}

function getAttendanceBySessionId(sessionId) {
  const sheet = getSheet(SHEET_NAMES.RESPONSES);
  const data = sheet.getDataRange().getValues();
  const confirmed = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][4] === sessionId && data[i][2] === "YES") {
      confirmed.push(data[i][1]);
    }
  }
  return confirmed;
}

function addExtraPlayers(names, sessionId) {
  const sheet = getSheet(SHEET_NAMES.RESPONSES);
  const session = getSessionDetails(sessionId);
  if (!session) return false;
  names.forEach(name => {
    sheet.appendRow([session.date, name, "YES", new Date(), sessionId]);
  });
  return true;
}

function removePlayers(names, sessionId) {
  const sheet = getSheet(SHEET_NAMES.RESPONSES);
  const data = sheet.getDataRange().getValues();
  const lowerNames = names.map(n => n.toLowerCase());

  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][4] === sessionId && lowerNames.includes(data[i][1].toString().toLowerCase())) {
      sheet.deleteRow(i + 1);
    }
  }
  return true;
}

function syncSession(sessionData) {
  const sessionSheet = getSheet(SHEET_NAMES.SESSIONS);
  const paymentSheet = getSheet(SHEET_NAMES.PAYMENTS);
  const sessionId = sessionData.sessionId;
  const session = getSessionDetails(sessionId);
  if (!session) return false;
  
  const data = sessionSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][9] === sessionId) {
      sessionSheet.deleteRow(i + 1);
      const pSheet = getSheet(SHEET_NAMES.PAYMENTS);
      const pData = pSheet.getDataRange().getValues();
      for (let j = pData.length - 1; j >= 1; j--) {
        if (pData[j][5] === sessionId) {
          pSheet.deleteRow(j + 1);
        }
      }
      break; 
    }
  }

  sessionSheet.appendRow([
    session.date,
    sessionData.courtCharge,
    sessionData.shuttleCharge,
    sessionData.expectedCount,
    sessionData.finalCount,
    sessionData.total,
    sessionData.perHead,
    sessionData.qrLink || "",
    new Date(),
    sessionId
  ]);

  sessionData.players.forEach(name => {
    paymentSheet.appendRow([
      session.date,
      name,
      sessionData.perHead,
      false,
      new Date(),
      sessionId
    ]);
  });
  
  return true;
}

function getPaymentTracker() {
  const sessionSheet = getSheet(SHEET_NAMES.SESSIONS);
  const paymentSheet = getSheet(SHEET_NAMES.PAYMENTS);
  const schedSheet = getSheet(SHEET_NAMES.SCHEDULED);
  
  const billData = sessionSheet.getDataRange().getValues();
  const payData = paymentSheet.getDataRange().getValues();
  const schedData = schedSheet.getDataRange().getValues();
  
  const activeSessionIds = {};
  const now = new Date().getTime();
  const fortyEightHoursMs = 48 * 60 * 60 * 1000;

  for (let i = 1; i < billData.length; i++) {
    const billTime = new Date(billData[i][8]).getTime();
    if (now - billTime <= fortyEightHoursMs) {
      activeSessionIds[billData[i][9]] = { billTime: billTime };
    }
  }

  for (let i = 1; i < schedData.length; i++) {
    const sid = schedData[i][0];
    if (activeSessionIds[sid]) {
      activeSessionIds[sid].time = schedData[i][2];
      activeSessionIds[sid].date = Utilities.formatDate(new Date(schedData[i][1]), Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
  }

  const players = [];
  for (let i = 1; i < payData.length; i++) {
    const sid = payData[i][5];
    if (activeSessionIds[sid]) {
      players.push({
        date: activeSessionIds[sid].date,
        name: payData[i][1],
        amount: payData[i][2],
        paid: payData[i][3] === true || payData[i][3] === "TRUE",
        timestamp: payData[i][4],
        sessionTime: activeSessionIds[sid].time,
        sessionId: sid
      });
    }
  }
  return players;
}

function markPaid(name, paid, sessionId) {
  const sheet = getSheet(SHEET_NAMES.PAYMENTS);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][5] === sessionId && data[i][1].toString().toLowerCase() === name.toLowerCase()) {
      sheet.getRange(i + 1, 4).setValue(paid);
      return true;
    }
  }
  return false;
}

function getSessionHistory() {
  const sheet = getSheet(SHEET_NAMES.SESSIONS);
  const schedSheet = getSheet(SHEET_NAMES.SCHEDULED);
  const data = sheet.getDataRange().getValues();
  const schedData = schedSheet.getDataRange().getValues();
  
  const schedMap = {};
  for(let i=1; i<schedData.length; i++) {
    schedMap[schedData[i][0]] = schedData[i][2];
  }

  const history = [];
  for (let i = data.length - 1; i >= 1; i--) {
    const sid = data[i][9];
    history.push({
      date: Utilities.formatDate(new Date(data[i][0]), Session.getScriptTimeZone(), "yyyy-MM-dd"),
      court: data[i][1],
      shuttle: data[i][2],
      expected: data[i][3],
      final: data[i][4],
      total: data[i][5],
      perHead: data[i][6],
      timestamp: data[i][8],
      sessionTime: schedMap[sid] || "Unknown"
    });
  }
  return history;
}
