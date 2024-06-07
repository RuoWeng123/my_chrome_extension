import {fileURLToPath} from 'url';
import {dirname} from 'path';
import {parseCSV} from './parseCsv.js';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'node:fs';
import {readdir} from 'node:fs/promises';
import * as https from "node:https";
import dayjs from "dayjs";
import iconv from 'iconv-lite';
import {
  initConfig, checkDataIsFalse, checkDataIsArrayEmpty, checkDataHaveZero, checkDataIsNull,
  checkIsContinue, checkDataIsRange, checkDataNotArray
} from "./checkRule.js";
import {writeLog} from "./writeXLSX.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getHttpLogs() {
  const testDir = path.join(__dirname, '../input');
  const files = await readdir(testDir);
  const csvFiles = files.filter(file => file.startsWith('input_httpLogs_') && file.endsWith('.csv'));
  let httpLogs = [];
  for (const file of csvFiles) {
    const filePath = path.join(testDir, file);
    let currentHttpLogs = await parseCSV(filePath);
    httpLogs.push(...currentHttpLogs);
  }
  return httpLogs;
}

async function requestHttpLogs() {
  await initConfig();
  let httpLogs = await getHttpLogs();
  await removeFileByStartString('output_httpLogs_');
  let logList = [];
  for (let item of httpLogs) {
    item.body = JSON.parse(item.body.replace(/￥/g, ','))
    const httpRes = await fetchLog(item);
    logList.push({
      boid: httpRes.boid,
      body: item.body,
      pageTitle: item.tabTitle ? item.tabTitle : '未知',
      status: httpRes.status,
      message: httpRes.message,
      resultData: httpRes.resultData
    })
  }
  const fileNameXLSX = `output_httpLogs_${dayjs().format('YYYY-MM-DD')}.xlsx`;
  const filePathXLSX = path.join(__dirname, `../output/${fileNameXLSX}`);
  await writeLog(logList, filePathXLSX);
}

const removeFileByStartString = async (startString) => {
  const testDir = path.join(__dirname, '../output');
  const files = await readdir(testDir);
  const csvFiles = files.filter(file => file.startsWith(startString) && file.endsWith('.xlsx'));
  for (const file of csvFiles) {
    const filePath = path.join(testDir, file);
    fs.unlinkSync(filePath);
  }
}

const writeCSV = async (csvContent, filePath) => {
  return new Promise((resolve, reject) => {
    const gbkData = iconv.encode(csvContent, 'gbk');
    fs.writeFile(filePath, gbkData, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  })
}

const fetchLog = async (log) => {
  const agent = new https.Agent({
    rejectUnauthorized: false
  });
  const {body} = log;
  let res = await fetch('https://172.29.0.187:443/iocpublic/postbojson_fun', {
    method: 'POST',
    headers: {
      'X-HW-ID': '0cd6cb33-ed3b-4de6-9229-03a0817e3d42',
      'X-HW-APPKEY': '31ca93919ccd8f588e9a7e25f38695b3706b3835407994e583124110deb053e5',
      'Content-Type': 'application/json'
    },
    agent: agent,
    body: JSON.stringify(body)
  })
  const data = await res.json();
  const result = data.retJSON.result;
  if (!res || !data || !result) return {
    status: 'error',
    message: '接口请求失败',
    boid: log.body.boid,
    body: JSON.parse(log.body),
    resultData: {str: '接口请求失败'}
  }
  return checkResult(result);
}

const formatErrorLog = (status, message, result, body) =>{
  const {boid, data} = result;
  return {
    status,
    message,
    boid,
    body,
    resultData: data
  }
}
const checkResult = (result, body) => {
  const {boid, version, data} = result;
  
  if (!data.datarow0) {
    return formatErrorLog('error', 'data is error', result, body)
  }
  if (checkDataNotArray(data.datarow0)) {
    return formatErrorLog('error', 'data is not array', result, body)
  }
  if (checkDataIsArrayEmpty(data.datarow0)) {
    return formatErrorLog('error', 'data is array empty', result, body)
  }
  if (checkDataIsFalse(data.datarow0)) {
    return formatErrorLog('error', 'data is false', result, body)
  }
  if (checkDataIsNull(data.datarow0)) {
    return formatErrorLog('error', 'data is null', result, body)
  }
  if (checkDataHaveZero(data.datarow0, boid)) {
    return formatErrorLog('error', 'data have 0', result, body)
  }
  
  if (checkDataIsRange(data.datarow0, boid)) {
    return formatErrorLog('error', 'data is range', result, body)
  }
  if (checkIsContinue(data.datarow0, boid)) {
    return formatErrorLog('error', 'data is not continue', result, body)
  }
  
  return {
    status: 'success',
    message: 'fetch success',
    boid,
    body,
    version,
    resultData: data.datarow0
  }
}


export {requestHttpLogs}
