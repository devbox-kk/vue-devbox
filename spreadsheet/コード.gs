/**
 * curl -L -X POST "https://script.google.com/macros/s/AKfycbxEi-_3myF-FbnBP0h_JzWhUPaE3Cj4j987vcBnlpj-OWyNg1j5Dex205yQHSbCOOaK7A/exec" \
 *   -H "Content-Type: application/json" \
 *   -d '{"action": "add", "date_info": "20250818", "note_info": "テスト"}'
 */

/**
 * 指定したシートのデータを配列のオブジェクトとして取得
 */
function getSheetData(sheetName, includeUnderscoreColumns = false) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) throw new Error('シートが見つかりません: ' + sheetName);
  const rows = sheet.getDataRange().getValues();
  const keys = rows.shift();
  return rows.map(row => {
    const obj = {};
    row.forEach((item, i) => {
      if (!includeUnderscoreColumns && String(keys[i]).startsWith('_')) return;
      obj[String(keys[i])] = item;
    });
    return obj;
  });
}

/**
 * GETリクエストでデータを返す
 * すべてのシートのデータを取得し、JSON形式で返す
 */
function doGet(e) {
  const sheetNames = ["data"]
  const result = {};
  sheetNames.forEach(sheetName => {
    try {
      result[sheetName] = getSheetData(sheetName, true); // アンダースコアで始まる列も含める
    } catch (err) {
      result[sheetName] = { error: err.message };
    }
  });
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * POSTリクエストでデータを更新
 */
function doPost(e) {
  // シートの取得
  const sheet = SpreadsheetApp.getActive().getSheetByName('data');
  // シートが存在しない場合はエラーを投げる
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'シートが見つかりません' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  const data = JSON.parse(e.postData.contents);
  // パラメーターからアクションを取得
  const action = data.action;
  if (action === 'add') {
    try {
      // IDの生成(ハッシュ値を使用)
      const id = Utilities.getUuid();
      // パラメーターから日付情報を取得
      const date_info = data.date_info || null;
      // パラメーターから時間情報を取得
      const time_info = data.time_info || null;
      // パラメーターからメモ情報を取得
      const note_info = data.note_info || null;
      // 必要パラメーターが不足している場合はエラーを返す
      if (!date_info || !note_info) {
        return ContentService.createTextOutput(JSON.stringify({ result: "error", msg: "必要なパラメーターが不足しています" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      // 最終行の次の行にデータを追加
      if (time_info) {
        sheet.appendRow([id, date_info, time_info, note_info]);
      } else {
        sheet.appendRow([id, date_info, "", note_info]);
      }
      // 更新が成功した場合は成功レスポンスを返す
      return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      // エラーが発生した場合はエラーレスポンスを返す
      return ContentService.createTextOutput(JSON.stringify({ result: "error", msg: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } else if (action === 'update') {
    try {
      // パラメーターからIDを取得
      const id = data.id;
      // パラメーターから日付情報を取得
      const date_info = data.date_info;
      // パラメーターから時間情報を取得
      const time_info = data.time_info || null;
      // パラメーターからメモ情報を取得
      const note_info = data.note_info;
      // 必要なパラメーターが不足している場合はエラーを返す
      if (!id || !date_info || !note_info) {
        return ContentService.createTextOutput(JSON.stringify({ result: "error", msg: "必要なパラメーターが不足しています" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      // idの一致する行のデータを更新
      sheet.getDataRange().getValues().forEach((row, index) => {
        if (row[0] === id) { // 0列目がIDなので、一致する行を探す
          sheet.getRange(index + 1, 2).setValue(date_info); // 2列目に日付情報
          sheet.getRange(index + 1, 3).setValue(time_info); // 3列目に時間情報
          sheet.getRange(index + 1, 4).setValue(note_info); // 4列目にメモ情報
        }
      });
      // 更新が成功した場合は成功レスポンスを返す
      return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      // エラーが発生した場合はエラーレスポンスを返す
      return ContentService.createTextOutput(JSON.stringify({ result: "error", msg: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } else if (action === 'delete') {
    try {
            // パラメーターからIDを取得
      const id = data.id;
      // idの一致する行を削除
      sheet.getDataRange().getValues().forEach((row, index) => {
        if (row[0] === id) { // 0列目がIDなので、一致する行を探す
          sheet.deleteRow(index + 1);
        }
      });
      // 削除が成功した場合は成功レスポンスを返す
      return ContentService.createTextOutput(JSON.stringify({ result: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      // エラーが発生した場合はエラーレスポンスを返す
      return ContentService.createTextOutput(JSON.stringify({ result: "error", msg: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } else {
    // actionパラメーターが指定されていない。または想定外の場合はエラーレスポンス
    return ContentService.createTextOutput(JSON.stringify({ result: "error", msg: '不正なリクエスト: actionパラメーターが必要です' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}