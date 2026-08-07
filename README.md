This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

run tests with - pnpm jest
watch test with - pnpm jest --watch
create documentation with - pnpm typedoc

# run dev
docker build command - docker build -t vowerp-frontend .

docker build \
  --build-arg NEXT_PUBLIC_BACKENDHOST=http://vowerp-backend:8000 \
  --build-arg NEXT_PUBLIC_API_BASE_URL=/api \
  --build-arg USE_NEXT_PROXY=true \
  -t vowerp-frontend .
run docker app command - docker run -p 3000:3000 dev

# run dev
docker build command - docker build -t main .
run docker app command - docker run -p 3001:3001 main


Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Automated Deployment with GitHub Actions

This project uses GitHub Actions to automate the deployment process for the 'main' and 'dev' branches. The following steps outline the automated deployment process:

1. When a new branch is merged to 'dev':
   - GitHub Actions will run tests and provide logs.
   - If all tests pass, the branch will be merged to 'dev'.
   - If any test fails, the merge will be stopped.
   - The deployment will be made to the dev container.

2. When 'dev' is merged to 'main':
   - GitHub Actions will run tests.
   - If tests fail, the merge will be stopped.
   - If all tests pass, the branch will be merged to 'main'.
   - The deployment will be made to the main container.

3. When a pull request is made from any feature branch to 'dev':
   - GitHub Actions will run tests.
   - If tests fail, the pull request will be stopped.
   - If all tests pass, the pull request will be merged to 'dev'.
   - The deployment will be made to the dev container.

4. When a pull request is made from 'dev' to 'main':
   - GitHub Actions will run tests.
   - If tests fail, the pull request will be stopped.
   - If all tests pass, the pull request will be merged to 'main'.
   - The deployment will be made to the main container.

The deployment process uses Docker containers and deploys to an AWS server. The IP address of the server should be provided in the GitHub Actions secrets.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


to run the project locally on docker first create a docker network:
command for the same is - docker network create vowerpnet
to check if docker network is created from before - docker network ls

docker run -d \
  --name vowerp-frontend \
  --network vowerpnet \
  --env-file .env \
  -p 3000:3000 \
  vowerp-frontend



docker stop vowerp-frontend
docker rm vowerp-frontend

# Remove old images
docker rmi vowerp-frontend

# Rebuild with clean cache
docker build --no-cache -t vowerp-frontend .

# Run with explicit environment variables
docker run -d \
  --name vowerp-frontend \
  --network vowerpnet \
  -p 3000:3000 \
  vowerp-frontend



docker build \
  --no-cache \
  --build-arg NEXT_PUBLIC_BACKENDHOST=http://vowerp-backend:8000 \
  --build-arg NEXT_PUBLIC_API_BASE_URL="/api" \

  --build-arg NEXT_PUBLIC_API_BASE_URL=/api \
  --build-arg USE_NEXT_PROXY=true \
  -t vowerp-frontend .


  docker run -d \
  --name vowerp-frontend \
  --network vowerpnet \

  -e NEXT_PUBLIC_API_BASE_URL="/api" \
  -e NEXT_PUBLIC_BACKENDHOST="http://vowerp-backend:8000" \

  -e NEXT_PUBLIC_API_BASE_URL=/api \
  -e NEXT_PUBLIC_BACKENDHOST=http://vowerp-backend:8000 \
  -e USE_NEXT_PROXY=true \
  -p 3000:3000 \
  vowerp-frontend

  developed by vow team
