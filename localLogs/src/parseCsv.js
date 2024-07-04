/* 获取csv文件数据 */
import fs from 'fs';
import csv from 'csv-parser';
import pkg from 'exceljs';
import path from 'path';
export const parseCSV = async (filePath) => {
  const results = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

export const parseXLXS = async (filePath) => {
  const { Workbook } = pkg;
  const workbook = new Workbook();
  const className = getFileNameWithoutExtension(filePath);
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet(1);
  let rows = [];
  // 遍历工作表中的每一行
  worksheet.eachRow((row, rowNumber) => {
    if(rowNumber !== 1){
      rows.push({
        'className': className,
        'cardName': row.values[1],
        'boidList': JSON.parse(row.values[2]),
        'fileName': row.values[3]
      })
    }
  });
  return rows;
}

export const parseBoidNameXLXS = async (filePath) => {
  const { Workbook } = pkg;
  const workbook = new Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet(1);
  let boidNameMap = new Map();
  // 遍历工作表中的每一行
  worksheet.eachRow((row, rowNumber) => {
    if(rowNumber !== 1){
      boidNameMap.set(row.values[1], row.values[2]);
    }
  });
  return boidNameMap;
}

const getFileNameWithoutExtension = (filePath) => {
  // 获取文件名，包括扩展名
  const baseName = path.basename(filePath);
  // 分割文件名和扩展名
  const nameParts = baseName.split('.');
  // 删除扩展名部分
  nameParts.pop();
  // 返回文件名，不包括扩展名
  return nameParts.join('.');
}
