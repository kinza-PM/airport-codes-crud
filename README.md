# Airport Codes CRUD (Serverless)

This repo contains a serverless boilerplate for managing airport codes (IATA/ICAO) across bookings, routes, logistics, and other system workflows.

## Structure

- `serverless.yml` — Serverless Framework configuration
- `handlers/airportCodes.js` — Lambda handlers for CRUD endpoints
- `services/airportCodeService.js` — DynamoDB access and business logic
- `lib/dynamoClient.js` — DynamoDB client setup
- `utils/response.js` — HTTP response helpers
- `utils/validation.js` — Airport code validation helpers

## Endpoints

- `POST /airport-codes` — Create airport code metadata
- `GET /airport-codes` — List all airport codes
- `GET /airport-codes/{codeId}` — Get one airport code
- `PUT /airport-codes/{codeId}` — Update an airport code
- `DELETE /airport-codes/{codeId}` — Delete an airport code

## Local Development

### Prerequisites

- Node.js 16.x or later
- Docker and Docker Compose
- AWS CLI configured (for production deployment)

### Setup

1. Clone the repository and install dependencies

```bash
npm install
```

2. Set up environment variables

```bash
cp .env.example .env.local
# Edit .env.local with your settings (already configured for local development)
```

3. Start DynamoDB Local using Docker Compose

```bash
# Start DynamoDB Local
npm run db:start

# Check logs
npm run db:logs

# Stop when done
npm run db:stop
```

4. Create the DynamoDB table

```bash
npm run setup:table
```

5. Start the development server

```bash
npm run dev:local
```

The API will be available at `http://localhost:3000`

### Alternative: Manual Docker Setup

If you prefer to manage DynamoDB Local manually:

```bash
# Start DynamoDB Local
docker run -d -p 8000:8000 --name dynamodb-local amazon/dynamodb-local -jar DynamoDBLocal.jar -sharedDb -inMemory

# Stop when done
docker stop dynamodb-local && docker rm dynamodb-local
```
```

5. Install local DynamoDB (one-time setup for offline development)

```bash
npm run offline:install-dynamodb
```

## Production Deployment

1. Configure AWS credentials

```bash
aws configure
# Or set environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
```

2. Deploy to AWS

```bash
npm run deploy
```

3. The API will be available at the URL provided by Serverless Framework output

## Available Scripts

- `npm run dev:local` — Start local development server
- `npm run setup:table` — Create DynamoDB table locally
- `npm run db:start` — Start DynamoDB Local via Docker Compose
- `npm run db:stop` — Stop DynamoDB Local
- `npm run db:logs` — View DynamoDB Local logs
- `npm run deploy` — Deploy to AWS

## Environment Variables

- `AWS_REGION` — AWS region (default: `eu-west-1`)
- `AWS_ACCESS_KEY_ID` — AWS access key
- `AWS_SECRET_ACCESS_KEY` — AWS secret key
- `AIRPORT_TABLE` — DynamoDB table name
- `DYNAMODB_ENDPOINT` — DynamoDB endpoint (set for local development, e.g., `http://localhost:8000`)

## DynamoDB Table

The service creates a DynamoDB table named `${self:provider.environment.AIRPORT_TABLE}` with `codeId` as the primary key and an `AllCodesIndex` global secondary index for fast list queries.

## Notes

- Uses **AWS SDK v3** with Command-based API for optimal performance
- `iata` codes must be 3 uppercase letters
- `icao` codes must be 4 uppercase letters
- `codeId` is derived from `iata` or `icao`
