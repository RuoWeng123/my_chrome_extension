import {fileURLToPath} from 'url';
import {dirname} from 'path';
import path from 'path';
import fs from 'node:fs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
function getDataCycleField (list){
  let dataCycleField = null;
  let item = list[0];
  if(!item){
    return null;
  }
  if(item.hasOwnProperty('rksj')){
    dataCycleField = 'rksj';
  }
  if(item.hasOwnProperty('state_date')){
    dataCycleField = 'state_date';
  }
  if(item.hasOwnProperty('last_update_time')){
    dataCycleField = 'last_update_time';
  }
  return dataCycleField;

}
export const writeBoidConfig = (logList) =>{
  let logListFormat = logList.map(log =>{
    return [
      log.boid,
      {
        "user": `${log.special}_${log.cardName}_${log.boidName}`,
        "zero": null,
        "range": {
          "field": null,
          "min": 0,
          "max": 100
        },
        "continue": {
          "field": null,
          "timeDimension": 'month'
        },
        "dataCycle": {
          "field": getDataCycleField(log.resultData),
          "reportCycle": 'D'
        }
      }
    ]
  })
  let boidConfig = new Map(logListFormat);
  let outputFilePath = path.join(__dirname, '../config/boidConfig.json');
  fs.writeFileSync(outputFilePath, JSON.stringify([...boidConfig], null, 2));
}




// let readFileJson = fs.readFileSync(outputFilePath);
// let readBoidConfig = new Map(JSON.parse(readFileJson));
// console.log(readBoidConfig.get('boid1'));
