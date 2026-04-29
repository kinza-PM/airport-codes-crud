import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const region = process.env.AWS_REGION || "eu-west-1";
const clientConfig = { region };

if (process.env.DYNAMODB_ENDPOINT) {
  clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "local",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "local",
    sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
  };
  console.info("DynamoDB using local endpoint:", process.env.DYNAMODB_ENDPOINT);
}

export const dynamoDb = new DynamoDBClient(clientConfig);

console.info("DynamoDB client configured:", {
  region: clientConfig.region,
  endpoint: clientConfig.endpoint || "AWS default",
  usingLocalEndpoint: Boolean(clientConfig.endpoint),
});
