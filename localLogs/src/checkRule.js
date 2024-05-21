import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from "url";
import dayjs from "dayjs";
import {dirname} from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let boidConfig = {};
// get config from config dir boidConfig.json
const initConfig = async () =>{
  const configPath = path.join(__dirname, '../config/boidConfig.json');
  const configContent = await fs.readFile(configPath, 'utf-8');
  boidConfig = JSON.parse(configContent);
}
// check data is false
const checkDataIsFalse = (data) => {
  return data === false;
}
// check data is null
const checkDataIsNull = (data) => {
  return data === null;
}
// check data is Array;
const checkDataNotArray = (data) => {
  return !Array.isArray(data)
}

// check data is Array and length === 0;
const checkDataIsArrayEmpty = (data) => {
  return Array.isArray(data) && data.length === 0;
}
// check data have 0
const checkDataHaveZero = (data, boid) => {
  const config = boidConfig[boid];
  if(!config || !config.zero){
    return false;
  }
  return data.some(item => item[config.zero] === 0 || item[config.zero] === '0');
}

// check data is range, this is need set field on config page
const checkDataIsRange = (data, boid) => {
  const config = boidConfig[boid];
  if(!config || !config.range){
    return false;
  }
  const {field, min, max} = config.range;
  return data.some(item => {
    let value = Number(item[field]);
    if(isNaN(value)){
      return true;
    }
    return value < min || value > max;
  });
}

// 检查日期连续性
const checkIsContinue = (data, boid) => {
  const config = boidConfig[boid];
  if(!config || !config.continue){
    return false;
  }
  const {field, timeDimension} = config.continue;
  // todo 检查连续，例如month_val 是按照月维度检查连续；  timeDimension：'month'|'year'|'day'|'week'
  // 将日期按照升序排序
  const sortedData = data.sort((a, b) => dayjs(a[field]).isAfter(dayjs(b[field])) ? 1 : -1);
  // 检查日期是否连续
  for (let i = 1; i < sortedData.length; i++) {
    const currentDate = dayjs(sortedData[i][field]);
    const previousDate = dayjs(sortedData[i - 1][field]);
    
    // 如果当前日期和前一个日期的差值大于1个月，则返回false
    if (currentDate.diff(previousDate, timeDimension) > 1) {
      return true;
    }
  }
  return false;
}

export {
  initConfig,
  checkDataIsFalse,
  checkDataIsNull,
  checkDataIsArrayEmpty,
  checkDataHaveZero,
  checkDataIsRange,
  checkIsContinue,
  checkDataNotArray
}
