# Onboarding: how to contribute to InstaDeck

For collaborators who are learning to build with Claude Code. Claude Code helps you with everything described here, just tell it what you want.

## How it works

- Only the owner of the repo pushes to `main`. You work in a **fork** (your own copy of the repo) and send changes as a **pull request** (PR). The owner reviews and merges it.
- Every PR has to pass **CI** (typecheck, lint, tests and a secrets check). Red CI means it is not merged yet.
- Deploying to instadeck.app, publishing to npm and `v*` tags are done only by the owner.

## First setup

1. Open the repo on GitHub and click **Fork**.
2. Clone your fork and install the dependencies:

   ```bash
   git clone git@github.com:<your-name>/instadeck.git
   cd instadeck
   npm install
   ```

3. Turn on the protection against committing keys and passwords (once):

   ```bash
   brew install gitleaks
   git config core.hooksPath .githooks
   ```

4. Start Claude Code in the repo folder. It reads `CLAUDE.md` and follows the rules of the project.

## Every change

1. Tell Claude what you want to do. New work always gets a new branch (`git switch -c change-name`).
2. Before the PR, let Claude run `npm run typecheck`, `npm run lint` and `npm test`. Everything must be green.
3. Push the branch to your fork and open a PR against `main` of the original repo. Fill in the template.
4. When CI or the review sends something back, fix it on the same branch, the PR updates itself.

## What not to do

- Do not push to the original repo and do not run the Deploy or Release workflows.
- Keys, passwords, `.env` files and personal data never belong in the repo. If it happens, tell the owner right away.
- Do not deploy or publish anything (AWS, npm, GitHub Pages, DNS). Only the owner gives that go.
- Do not use an em dash (the long dash) in any text. A test checks it.
- Write everything in English: code, comments and docs.

## When you are not sure

Ask Claude, or write to the owner. Asking is fine.
