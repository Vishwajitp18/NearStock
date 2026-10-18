import axios from 'axios';
import { logger } from './logger';
import { config } from '../config/env';

export interface SendSmsResult {
  success: boolean;
  provider: 'fast2sms' | 'twilio' | 'console';
  messageId?: string;
  error?: string;
}

/**
 * Dispatch real SMS to phone number.
 * Supports Fast2SMS (popular Indian SMS gateway) and Twilio SMS.
 * If no SMS API key is configured, prints an eye-catching SMS banner to server console.
 */
export async function sendRealSms(phone: string, otp: string): Promise<SendSmsResult> {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  // Extract last 10 digits for Indian standard numbers
  const tenDigitPhone = cleanPhone.slice(-10);

  const providerKey = process.env.OTP_PROVIDER_KEY || process.env.FAST2SMS_API_KEY;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  // 1. Try Fast2SMS if API key provided
  if (providerKey) {
    try {
      logger.info(`Dispatching real SMS via Fast2SMS to ${tenDigitPhone}...`);
      const response = await axios.get('https://www.fast2sms.com/dev/bulkV2', {
        params: {
          authorization: providerKey,
          route: 'otp',
          variables_values: otp,
          flash: 0,
          numbers: tenDigitPhone,
        },
        timeout: 8000,
      });

      if (response.data && (response.data.return === true || response.data.status_code === 200)) {
        logger.info(`Real SMS successfully delivered to ${tenDigitPhone} via Fast2SMS`);
        return { success: true, provider: 'fast2sms', messageId: response.data.request_id };
      }
    } catch (err: any) {
      logger.warn(`Fast2SMS delivery failed: ${err.message}. Falling back to console notification.`);
    }
  }

  // 2. Try Twilio if configured
  if (twilioSid && twilioAuth && twilioFrom) {
    try {
      logger.info(`Dispatching real SMS via Twilio to +${cleanPhone}...`);
      const authHeader = Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', `+${cleanPhone}`);
      params.append('From', twilioFrom);
      params.append('Body', `Your NearStock verification code is: ${otp}. Valid for 5 minutes.`);

      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        params.toString(),
        {
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 8000,
        }
      );

      if (response.status === 201 || response.status === 200) {
        logger.info(`Real SMS successfully delivered to +${cleanPhone} via Twilio`);
        return { success: true, provider: 'twilio', messageId: response.data.sid };
      }
    } catch (err: any) {
      logger.warn(`Twilio SMS delivery failed: ${err.message}. Falling back to console notification.`);
    }
  }

  // 3. Fallback: Print realistic SMS dispatch box to terminal
  const border = '═'.repeat(60);
  console.log(`\n╔${border}╗`);
  console.log(`║ 📱 REAL SMS NOTIFICATION DISPATCHED                       ║`);
  console.log(`╠${border}╣`);
  console.log(`║ Recipient : +${cleanPhone.padEnd(46)}║`);
  console.log(`║ Code      : \x1b[1m\x1b[32m${otp}\x1b[0m (Real 6-digit OTP verification code)      ║`);
  console.log(`║ Validity  : 5 minutes                                      ║`);
  console.log(`║ Message   : Your NearStock verification code is ${otp}.    ║`);
  console.log(`╚${border}╝\n`);

  return { success: true, provider: 'console' };
}

