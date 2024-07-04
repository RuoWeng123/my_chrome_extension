import XLSX from 'xlsx-js-style';

function createWorkbookWithStyles(data) {
  const wb = XLSX.utils.book_new();
  const ws_data = data.map((row) => {
    return row.map((cell) => {
      return {v: cell.value, s: cell.style};
    });
  });
  
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  ws['!cols'] = [
    {wch: 15},
    {wch: 30},
    {wch: 20},
    {wch: 30},
    {wch: 40},
    {wch: 15},
    {wch: 100}
  ]
  
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return wb;
}

export const writeLog = async (data, filePath) => {
  let xlsxData = [
    [
      {value: '专题', style: {}},
      {value: '卡片', style: {}},
      {value: 'boid', style: {}},
      {value: 'boid定义', style: {}},
      {value: 'body', style: {}},
      {value: '错误原因', style: {}},
      {value: '接口返回', style: {}},
    ],
  ];
  data.forEach(item => {
    let cellStyle = item.status === 'error' ? {
      fill: {fgColor: {rgb: 'e1b5a4'}},
      alignment: {wrapText: true, vertical: 'top'}
    } : {alignment: {wrapText: true, vertical: 'top'}};
    xlsxData.push([
      {value: item.special, style: cellStyle},
      {value: item.cardName, style: cellStyle},
      {value: item.boid, style: cellStyle},
      {value: item.boidName, style: cellStyle},
      {value: JSON.stringify(item.body), style: cellStyle},
      {value: item.message, style: cellStyle},
      {value: JSON.stringify(item.resultData).substring(0, 8000), style: cellStyle},
    ]);
  })
  const wb = createWorkbookWithStyles(xlsxData);
  
  XLSX.writeFile(wb, filePath);
}
