import fs, {readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from "url";
import dayjs from "dayjs";
import {dirname} from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let boidConfig = {};
// get config from config dir boidConfig.json
const initConfig = async () => {
  try {
    const testDir = path.join(__dirname, '../config');
    const files = await readdir(testDir);
    const boidConfigFiles = files.filter(file => file.startsWith('boidConfig_') && file.endsWith('.json'));
    let boidConfigList = [];
    for (const file of boidConfigFiles) {
      const configPath = path.join(testDir, file);
      const configContent = await fs.readFile(configPath, 'utf-8');
      boidConfigList = boidConfigList.concat(JSON.parse(configContent));
    }
    boidConfig = new Map(boidConfigList)
  } catch (e) {
    boidConfig = {};
  }
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
  const config = boidConfig.get(boid);
  if (!config || !config.zero) {
    return false;
  }
  // 配置项是数组，需要对所有的数据进行检查
  if (Array.isArray(config.zero)) {
    for (let field of config.zero) {
      if (data.some(item => item[field] === '--')) {
        return {
          isError: true,
          field,
        };
      }
    }
    return false;
  } else {
    const isError = data.some(item => item[config.zero] === '--');
    if(isError){
      return {
        isError,
        field: config.zero
      };
    }else{
      return false;
    }
  }
}

// check data is range, this is need set field on config page
const checkDataIsRange = (data, boid) => {
  const config = boidConfig.get(boid);
  if (!config || !config.range || !config.range.field) {
    return false;
  }
  const {field, min, max} = config.range;
  if(Array.isArray(field)){
    for(let f of field){
      if(data.some(item => {
        let value = Number(item[f]);
        if (isNaN(value)) {
          return true;
        }
        if(max === null){
          return value < min;
        }else if(min === null){
          return value > max;
        }else{
          return value < min || value > max;
        }
      })){
        return {isError: true, field: f, min: min === null ? "无要求" : min, max: max === null ? "无要求" : max};
      }
    }
    return false;
  }else{
    let isRange = data.some(item => {
      let value = Number(item[field]);
      if (isNaN(value)) {
        return true;
      }
      if(max === null){
        return value < min;
      }else if(min === null){
        return value > max;
      }else{
        return value < min || value > max;
      }
    });
    if(isRange){
      return {isError: true, field, min: min === null ? "无要求" : min, max: max === null ? "无要求" : max};
    }else{
      return false;
    }
  }
}

// 检查日期连续性
const checkIsContinue = (data, boid) => {
  const config = boidConfig.get(boid);
  if (!config || !config.continue || !config.continue.field) {
    return false;
  }
  let {field, timeDimension} = config.continue;
  // todo 检查连续，例如month_val 是按照月维度检查连续；  timeDimension：'month'|'year'|'day'|'week'
  if(timeDimension.toLowerCase().startsWith('m')){
    timeDimension = 'month';
  } else if(timeDimension.toLowerCase().startsWith('y')){
    timeDimension = 'year';
  }else if(timeDimension.toLowerCase().startsWith('d')){
    timeDimension = 'day';
  }else if(timeDimension.toLowerCase().startsWith('w')){
    timeDimension = 'week';
  }else if(timeDimension.toLowerCase().startsWith('q')){
    timeDimension = 'quarter';
  }
  if(config.continue.hasOwnProperty('groupBy')){
    // todo 添加groupBy的支持
    return false;
  }
  // 将日期按照升序排序
  const sortedData = data.sort((a, b) => dayjs(a[field]).isAfter(dayjs(b[field])) ? 1 : -1);
  // 检查日期是否连续
  for (let i = 1; i < sortedData.length; i++) {
    const currentDate = dayjs(sortedData[i][field]);
    const previousDate = dayjs(sortedData[i - 1][field]);
    
    // 如果当前日期和前一个日期的差值大于1个月，则返回false
    if (currentDate.diff(previousDate, timeDimension) > 1) {
      return {
        isError: true,
        field,
        lastDate: sortedData[i - 1][field],
        nextDate: sortedData[i][field],
        timeDimension
      };
    }
  }
  return false;
}

// 检查数据是否没有按时填报，例如数据超过1个月没有更新，或者一个季度没有更新；则返回true
const checkIsNotOnTime = (data, boid) => {
  const config = boidConfig.get(boid);
  if (!config || !config.dataCycle || !config.dataCycle.field) {
    return false;
  }
  const {field, reportCycle} = config.dataCycle;
  // reportCycle: 'month'|'quarter'|'year'|'week'|'day'
  let diffDays = 2;
  if(reportCycle.toLowerCase().startsWith('d')){
    diffDays = 2;
  }else if(reportCycle.toLowerCase().startsWith('w')){
    diffDays = 8;
  }else if(reportCycle.toLowerCase().startsWith('m')){
    diffDays = 32;
  }else if(reportCycle.toLowerCase().startsWith('q')){
    diffDays = 93;
  }else if(reportCycle.toLowerCase().startsWith('y')){
    diffDays = 367;
  }
  // 将日期按照升序排序
  const sortedData = data.sort((a, b) => dayjs(a[field]).isAfter(dayjs(b[field])) ? 1 : -1);
  // 检查最后一个日期和当前日期的差值是否超过一个周期
  let lastDate = sortedData[sortedData.length - 1][field];
  
  if(lastDate.length === 4){
    lastDate = `${lastDate}-12-30`;
  }else if(diffDays === 32 && lastDate.length === 7 || lastDate.length === 6){
    // 替换 - / 为 ''
    lastDate = lastDate.replace(/[-/]/g, '');
    // 补充数据为每个月的最后一天
    lastDate = `${lastDate}${dayjs(lastDate).daysInMonth()}`;
  }
  lastDate = dayjs(lastDate);
  
  const minDate = dayjs().subtract(diffDays, 'day');
  // 当前值在最小值之后，说明数据正常，返回false；否则返回true
  const isError = lastDate.isBefore(minDate);
  return {
    isError,
    field,
    minDate: dayjs().subtract(diffDays-1, 'day').format('YYYY-MM-DD'),
    lastDate: lastDate.format('YYYY-MM-DD')
  };
}

const checkDataNoLastTime = (data) => {
  const isOk = data.some(item => {
    return (item.sj && item.sj !== '--') || (item.rksj && item.rksj !== '--') || (item.stat_date && item.stat_date !== '--') || (item.last_update_time && item.last_update_time !== '--');
  });
  // return !isOk;
  return false;
}

const checkDataIsRepeat = (data) => {
  // 采用set去重，如果不一样返回true
  const set = new Set();
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const key = Object.values(item).join('-');
    if (set.has(key)) {
      return true;
    }
    set.add(key);
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
  checkDataNotArray,
  checkDataNoLastTime,
  checkIsNotOnTime,
  checkDataIsRepeat,
}
