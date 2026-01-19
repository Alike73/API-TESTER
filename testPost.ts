import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = process.env.BASE_URL;
const token = process.env.TOKEN;

if (!url) {
  console.error('BASE_URL is not defined in .env');
  process.exit(1);
}

// Test parameters
const requestsPerSecond = 50;
const durationInSeconds = 20;

const totalRequests = requestsPerSecond * durationInSeconds;
let sentRequestsCount = 0;
let completedRequestsCount = 0;

const resultsDir = path.join(__dirname, 'results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir);
}

const resultsFilePath = path.join(resultsDir, 'post_results.txt');
fs.writeFileSync(resultsFilePath, '');

const logAllResponses = false;

const logResponse = (requestNumber: number, status: string | number, responseBody: unknown, timeTaken: number) => {
  const logEntry = `Request ${requestNumber}\nStatus: ${status}\nResponse time: ${timeTaken}ms\nResponse body: ${JSON.stringify(responseBody)}\n\n`;
  fs.appendFileSync(resultsFilePath, logEntry);
};

const sendPostRequest = async (data: Record<string, unknown>, requestNumber: number) => {
  const startTime = Date.now();
  try {
    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const timeTaken = Date.now() - startTime;
    if (logAllResponses) {
      logResponse(requestNumber, response.status, response.data, timeTaken);
    }
  } catch (error: unknown) {
    const timeTaken = Date.now() - startTime;
    let status: string | number = 'Unknown error';
    let responseBody: unknown = 'Unknown error';

    if (axios.isAxiosError(error)) {
      status = error.response?.status ?? 'Unknown Axios error';
      responseBody = error.response?.data ?? error.message;
    } else if (error instanceof Error) {
      responseBody = error.message;
    }

    logResponse(requestNumber, status, responseBody, timeTaken);
  } finally {
    completedRequestsCount++;
    if (completedRequestsCount >= totalRequests) {
      const summary = `Test completed. Total sent: ${sentRequestsCount}, Completed: ${completedRequestsCount} POST-requests.\n`;
      fs.appendFileSync(resultsFilePath, summary);
      console.log(summary.trim());
    }
  }
};

type DataTemplateValue = string | number | boolean | null | (() => unknown) | DataTemplate | DataTemplateValue[];
interface DataTemplate {
  [key: string]: DataTemplateValue;
}

const generateData = (template: DataTemplateValue): unknown => {
  if (Array.isArray(template)) {
    return template.map(item => generateData(item));
  } else if (typeof template === 'function') {
    return template();
  } else if (typeof template === 'object' && template !== null) {
    const result: Record<string, unknown> = {};
    for (const key in template) {
      result[key] = generateData(template[key]);
    }
    return result;
  } else {
    return template;
  }
};

const startPostTest = () => {
  const dataTemplate: DataTemplate = {
    key1: 'value1',
    key2: 'value2',
    key3: () => Math.floor(Math.random() * 9) + 1
  };

  console.log(`Starting POST test: ${requestsPerSecond} RPS for ${durationInSeconds}s...`);
  const interval = setInterval(() => {
    for (let i = 0; i < requestsPerSecond; i++) {
      if (sentRequestsCount < totalRequests) {
        sentRequestsCount++;
        const requestData = generateData(dataTemplate) as Record<string, unknown>;
        sendPostRequest(requestData, sentRequestsCount);
      } else {
        clearInterval(interval);
        break;
      }
    }
  }, 1000);
};

startPostTest();
