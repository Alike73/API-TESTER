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

const resultsFilePath = path.join(resultsDir, 'results.txt');
fs.writeFileSync(resultsFilePath, '');

// Flag for recording results: true - all, false - only errors
const logAllResponses = false;

interface QueryParams {
  [key: string]: string;
}

const queryParams: QueryParams[] = [
  { param1: 'value1', param2: 'valueA' },
  { param1: 'value2', param2: 'valueB' },
  { param1: 'value3', param2: 'valueC' },
];

const logResponse = (requestNumber: number, status: string | number, responseBody: unknown, timeTaken: number) => {
  const logEntry = `Request ${requestNumber}\nStatus: ${status}\nResponse time: ${timeTaken}ms\nResponse body: ${JSON.stringify(responseBody)}\n\n`;
  fs.appendFileSync(resultsFilePath, logEntry);
};

const sendRequest = async (params: QueryParams | null, requestNumber: number) => {
  const startTime = Date.now();
  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: params
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
      const summary = `Test completed. Total sent: ${sentRequestsCount}, Completed: ${completedRequestsCount}.\n`;
      fs.appendFileSync(resultsFilePath, summary);
      console.log(summary.trim());
    }
  }
};

const startTest = () => {
  console.log(`Starting GET test: ${requestsPerSecond} RPS for ${durationInSeconds}s...`);
  const interval = setInterval(() => {
    for (let i = 0; i < requestsPerSecond; i++) {
      if (sentRequestsCount < totalRequests) {
        sentRequestsCount++;
        const params = queryParams.length > 0 ? queryParams[sentRequestsCount % queryParams.length] : null;
        sendRequest(params, sentRequestsCount);
      } else {
        clearInterval(interval);
        break;
      }
    }
  }, 1000);
};

startTest();
