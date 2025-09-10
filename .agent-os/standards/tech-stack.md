# Tech Stack

> Version: 1.0.0
> Last Updated: 2025-08-31

## Context

This file is part of the Agent OS standards system. These global tech stack defaults are referenced by all product codebases when initializing new projects. Individual projects may override these choices in their `.agent-os/product/tech-stack.md` file.

## Core Technologies

### Application Framework
- **Framework:** Next.js
- **Version:** 15.5.0+
- **Language:** Typescript

### Database
- **Primary:** Amplify & AppSync
- **Version:** Gen 2
- **ORM:** Amplify built in

## Frontend Stack

### JavaScript Framework
- **Framework:** React
- **Version:** Latest stable
- **Build Tool:** Vite

### Import Strategy
- **Strategy:** Node.js modules
- **Package Manager:** npm
- **Node Version:** 22 LTS

### CSS Framework
- **Framework:** TailwindCSS
- **Version:** 4.0+
- **PostCSS:** Yes

### UI Components
- **Library:** Instrumental Components
- **Version:** Latest
- **Installation:** Via development gems group

## Assets & Media

### Fonts
- **Provider:** Google Fonts
- **Loading Strategy:** Self-hosted for performance

### Icons
- **Library:** Lucide
- **Implementation:** React components

## Infrastructure

### Application Hosting
- **Platform:** AWS Amplify
- **Service:** App Platform / Droplets
- **Region:** eu-west-1


### Asset Storage
- **Provider:** Amazon S3
- **CDN:** CloudFront
- **Access:** Private with signed URLs

## Deployment

### CI/CD Pipeline
- **Platform:** GitHub Actions
- **Trigger:** Push to main/staging branches
- **Tests:** Run before deployment

### Environments
- **Production:** main branch
- **Staging:** staging branch
- **Review Apps:** PR-based (optional)
