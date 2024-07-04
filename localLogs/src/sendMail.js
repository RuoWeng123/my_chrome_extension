import nodemailer from 'nodemailer';
import path from 'node:path'
import fs from 'node:fs/promises'
import {fileURLToPath} from "url";
import {dirname} from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const sendEmail = async (filePath, subject, text) =>{
  const emailConfigPath = path.join(__dirname, '../config/emailConfig.json');
  const emailConfigContent = await fs.readFile(emailConfigPath, 'utf-8');
  let emailConfig = JSON.parse(emailConfigContent);
  const {fromConfig, toList, isSendError} = emailConfig;
  if(!isSendError){
    return;
  }
  const attachments = [
    {path: filePath}
  ];
  try{
    const transporter = nodemailer.createTransport({
      host: fromConfig.host,
      port: fromConfig.port,
      secure: fromConfig.secure,
      auth:fromConfig.auth
    })
    let info = await transporter.sendMail({
      from: fromConfig.auth.user,
      to: toList.join(','),
      subject,
      text,
      attachments,
    })
    console.log('发送成功',info.messageId)
  }catch (e) {
    console.error('send email error', e);
  }
}
// sendEmail('D:\\cmict_code\\my_chrome_extension\\localLogs\\output\\output_httpLogs_2024-06-19.xlsx', '自巡检错误日志', '这是2024-06-19的自巡检错误日志，请查收')
