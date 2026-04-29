# Airport Codes CRUD

This service manages airport code records in an existing DynamoDB table.

## Structure

- `serverless.dev.yaml` for the dev deployment config
- `serverless-local.yaml` for local/offline config
- `handlers/` with one Lambda handler per route
- `services/airportCodeService.js` for DynamoDB and business logic
- `helper/` for response, validation, and trace helpers
- `lib/` for shared infrastructure helpers

## Routes

- `POST /airport-codes`
- `GET /airport-codes`
- `GET /airport-codes/{iataCode}`
- `PUT /airport-codes/{country}/{city}`
- `DELETE /airport-codes/{country}/{city}`

## Behavior

- Records are created with `status: "active"`
- Delete is a soft delete that updates `status` to `"inactive"`
- List, search, and get exclude inactive records
- Records without a `status` field are treated as active for backward compatibility

## Scripts

- `npm run dev` starts `serverless.dev.yaml`
- `npm run dev:local` starts `serverless-local.yaml`
- `npm run deploy:dev` deploys the dev config

## Environment

- `AWS_REGION`
- `AIRPORT_TABLE`
- `DYNAMODB_ENDPOINT` for local DynamoDB if needed

## Notes

- `iataCode` must be 3 uppercase letters
- The service uses the existing DynamoDB table and does not create a new one
