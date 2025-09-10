# Technical Stack

> Last Updated: 2025-09-10
> Version: 1.0.0

## Application Framework

- **Framework:** Next.js
- **Version:** 14+

## Database

- **Primary Database:** AWS Amplify DataStore
- **GraphQL API:** AWS AppSync
- **Backend:** AWS DynamoDB

## JavaScript

- **Framework:** Next.js with App Router
- **Import Strategy:** Node.js modules

## CSS Framework

- **Framework:** Tailwind CSS
- **Version:** Latest stable
- **Design System:** Custom design system built on Tailwind

## UI Components

- **UI Component Library:** shadcn/ui (Radix UI primitives)
- **Fonts Provider:** Google Fonts
- **Icon Library:** Lucide React

## Backend & APIs

- **API Framework:** Next.js API Routes
- **Runtime:** Serverless functions
- **Authentication:** NextAuth.js
- **Auth Providers:** Email + Social providers (Google)

## Storage & Assets

- **File Storage:** AWS S3
- **Asset Hosting:** Integrated with deployment platform
- **Image Optimization:** Next.js Image component

## Communication

- **Email Service:** Resend
- **Real-time Updates:** Amplify events
- **Email Templates:** React Email

## Development & Deployment

- **Application Hosting:** AWS Amplify
- **Database Hosting:** AWS DynamoDB (managed by Amplify)
- **Deployment Solution:** AWS Amplify with automatic deployments
- **Code Repository:** GitHub
- **Package Manager:** pnpm

## Monitoring & Analytics

- **Error Tracking:** Sentry (optional)
- **Analytics:** AWS CloudWatch
- **Performance Monitoring:** Built-in Next.js analytics

## Security

- **CSRF Protection:** Built-in Next.js protection
- **Rate Limiting:** Upstash Redis (optional)
- **Environment Variables:** AWS Systems Manager Parameter Store