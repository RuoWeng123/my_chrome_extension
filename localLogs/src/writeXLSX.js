import XLSX from 'xlsx-js-style';

function createWorkbookWithStyles(data) {
  const wb = XLSX.utils.book_new();
  const ws_data = data.map((row) => {
    return row.map((cell) => {
      return {v: cell.value, s: cell.style};
    });
  });
  
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return wb;
}

export const writeLog = async (data, filePath) => {
  let xlsxData = [
    [{value: 'boid', style: {}}, {value: 'body', style: {}}, {value: 'status', style: {}}, {
      value: 'message',
      style: {}
    }, {value: 'resultData', style: {}}],
  ];
  data.forEach(item => {
    let cellStyle = item.status === 'error' ? {
      fill: {fgColor: {rgb: 'FF0000'}},
      alignment: {wrapText: true, vertical: 'top'}
    } : {alignment: {wrapText: true, vertical: 'top'}};
    xlsxData.push([
      {value: item.boid, style: cellStyle},
      {value: item.body.replace(/"/g, '""'), style: cellStyle},
      {value: item.status, style: cellStyle},
      {value: item.message, style: cellStyle},
      {value: JSON.stringify(item.resultData).replace(/"/g, '""'), style: cellStyle},
    ]);
  })
  const wb = createWorkbookWithStyles(xlsxData);
  
  XLSX.writeFile(wb, filePath);
}
