import {fileURLToPath} from 'url';
import {dirname} from 'path';
import { parseCSV, parseXLXS, parseBoidNameXLXS } from './parseCsv.js'
import fetch from 'node-fetch';
import path from 'path';
import fs from 'node:fs';
import {readdir} from 'node:fs/promises';
import * as https from "node:https";
import dayjs from "dayjs";
import { sendEmail } from './sendMail.js';
import {
  initConfig, checkDataIsFalse, checkDataIsArrayEmpty, checkDataHaveZero, checkDataIsNull,
  checkIsContinue, checkDataIsRange, checkDataNotArray, checkDataNoLastTime, checkIsNotOnTime, checkDataIsRepeat
} from "./checkRule.js";
import {writeLog} from "./writeXLSX.js";
// todo 如果你需要写入boidConfig.json，取消下面的注释，要求input文件夹下面只有一个专题的数据
//import {writeBoidConfig} from "./writeBoidConfig.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let specialMap = [];
let boidNameMap = new Map();
const specialList = [
  '云网数安',
  '交通运行',
  '党群服务',
  '全市概况',
  '土地利用',
  '城市管理',
  '幸福民生',
  '政务服务',
  '生态环境',
  '经济运行',
];
// 这里的数据从 扩展程序中下载下来的。
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
// 获取各个专题的卡片与boid的对应关系，这里从scantoBoid 获取
async function getConfigOfBoidMap (){
  for (const special of specialList) {
    const configPath = path.join(__dirname, `../config/cardBoidMap/${special}.xlsx`);
    let tempSpecial =  await parseXLXS(configPath);
    tempSpecial.forEach(row =>{
      row.boidList.forEach(item =>{
        specialMap.push({
          special: row.className,
          cardName: row.cardName,
          boid: item,
          fileName: row.fileName,
        })
      })
    })
  }
}

async function getBoidNameMap(){
  const configPath = path.join(__dirname, `../config/boidNameMap.xlsx`);
  let tempMap =  await parseBoidNameXLXS(configPath);
  console.log('获取boidList成功,数据长度',tempMap.size)
  boidNameMap = tempMap;
}

// 循环专题，请求数据，每个专题最多请求50个数据
async function requestHttpLogs() {
  await getBoidNameMap();
  await getConfigOfBoidMap();
  await initConfig();
  let httpLogs = await getHttpLogs();
  console.log('前置准备完毕，开始处理接口')
  await removeFileByStartString('output_httpLogs_');
  let logList = [];
  for (let item of httpLogs) {
    item.body = JSON.parse(item.body.replace(/￥/g, ','))
    const httpRes = await fetchLog(item);
    const targetCard = specialMap.find(special => special.boid === httpRes.boid);
    const boidName = boidNameMap.get(httpRes.boid);
    logList.push({
      special: targetCard ? targetCard.special : '未知',
      cardName: targetCard ? targetCard.cardName : '未知',
      fileName: targetCard ? targetCard.fileName : '未知',
      boidName: boidName || '未知',
      boid: httpRes.boid,
      body: item.body,
      status: httpRes.status,
      message: httpRes.message,
      resultData: httpRes.resultData
    })
  }
  const fileNameXLSX = `output_httpLogs_${dayjs().format('YYYY-MM-DD')}.xlsx`;
  const filePathXLSX = path.join(__dirname, `../output/${fileNameXLSX}`);
  console.log('接口处理完毕，准备写入')
  await writeLog(logList, filePathXLSX);
  // await writeBoidConfig(logList);
  // 有错误的日志，发送邮件
  const errorLogs = logList.filter(item => item.status === 'error');
  if(errorLogs.length > 0){
    let errorFilePathXlsx = path.join(__dirname, `../output/error_${fileNameXLSX}`);
    await writeLog(errorLogs, errorFilePathXlsx);
    let timeout = setTimeout(async () => {
      await sendEmail(errorFilePathXlsx, '自巡检错误日志', `这是${dayjs().format('YYYY-MM-DD')}的自巡检错误日志，请查收`);
      clearTimeout(timeout);
    }, 1000);
  }
}
// 将之前output文件夹下的文件移动到backup文件夹下
const removeFileByStartString = async (startString) => {
  const testDir = path.join(__dirname, '../output');
  const backupDir = path.join(__dirname, '../backup');
  const files = await readdir(testDir);
  const excelFiles = files.filter(file => file.startsWith(startString) && file.endsWith('.xlsx'));
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)){
    fs.mkdirSync(backupDir);
  }
  
  for (const file of excelFiles) {
    const oldPath = path.join(testDir, file);
    const newPath = path.join(backupDir, file);
    fs.renameSync(oldPath, newPath);
  }
}

// 真实的请求数据逻辑
const fetchLog = async (log) => {
  const agent = new https.Agent({
    rejectUnauthorized: false
  });
  const {body} = log;
  console.log('-------', body.boid, '-------------------');
  let res = await fetch('https://172.29.0.187:443/iocpublic/postbojson_fun', {
    method: 'POST',
    headers: {
      'X-HW-ID': '*',
      'X-HW-APPKEY': '*',
      'Content-Type': 'application/json'
    },
    agent: agent,
    body: JSON.stringify(body)
  })
  const data = await res.json();
  const result = data.retJSON.result;
  if (!res || !data || !result || !result.data) return {
    status: 'error',
    message: '接口请求失败',
    boid: body.boid,
    body: body,
    resultData: {str: '接口请求失败'}
  }
  return checkResult(result);
}

// 检查完数据，格式化返回，给写入excel使用
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
  let interfaceData = data.datarow0;
  if(!interfaceData){
    interfaceData = data.datarow;
  }
  if (!interfaceData) {
    console.log('data not have datarow0', boid);
    return formatErrorLog('error', '接口返回数据null or false', result, body)
  }
  if (checkDataNotArray(interfaceData)) {
    return formatErrorLog('error', '数据格式不是数组', result, body)
  }
  if (checkDataIsArrayEmpty(interfaceData)) {
    return formatErrorLog('error', '数据返回为空数组', result, body)
  }
  if (checkDataIsFalse(interfaceData)) {
    return formatErrorLog('error', '数据返回为false', result, body)
  }
  if (checkDataIsNull(interfaceData)) {
    return formatErrorLog('error', '数据返回为null', result, body)
  }
  if (checkDataNoLastTime(interfaceData)) {
    return formatErrorLog('error', '数据没有更新时间', result, body)
  }
  if(checkDataIsRepeat(interfaceData)){
    return formatErrorLog('error', '数据有重复项', result, body)
  }
  const errResultHaveZero = checkDataHaveZero(interfaceData, boid);
  if (errResultHaveZero && errResultHaveZero.isError) {
    return formatErrorLog('error', `检查数据为--,命中属性：${errResultHaveZero.field}`, result, body)
  }
  const isRange = checkDataIsRange(interfaceData, boid);
  if (isRange && isRange.isError) {
    return formatErrorLog('error', `数据范围超限,检查字段${isRange.field},最小值${isRange.min},最大值${isRange.max}`, result, body)
  }
  const errResultIsNotContinue = checkIsContinue(interfaceData, boid);
  if (errResultIsNotContinue && errResultIsNotContinue.isError){
    return formatErrorLog('error', `数据不连续,检查字段${errResultIsNotContinue.field},时间跨度${errResultIsNotContinue.timeDimension},上一个数据${errResultIsNotContinue.lastDate},下一个数据${errResultIsNotContinue.nextDate}`, result, body)
  }
  const errResultIsNotOnTime = checkIsNotOnTime(interfaceData, boid);
  if (errResultIsNotOnTime && errResultIsNotOnTime.isError) {
    return formatErrorLog('error', `数据鲜活度不够,列表最新${errResultIsNotOnTime.lastDate},允许最远${errResultIsNotOnTime.minDate}`, result, body)
  }
  
  return {
    status: 'success',
    message: '接口成功',
    boid,
    body,
    version,
    resultData: interfaceData
  }
}


export {requestHttpLogs}
