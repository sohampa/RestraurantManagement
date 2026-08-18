# Git and GitHub Best Practices

This guide outlines practical standards for using Git and GitHub effectively in team environments.

## 1. Branching Strategy

- Keep `main` (or default branch) always deployable.
- Use short-lived feature branches:
  - `feature/<short-description>`
  - `fix/<short-description>`
  - `chore/<short-description>`
- Rebase or merge from default branch frequently to minimize divergence.

## 2. Commit Best Practices

- Make small, atomic commits with one logical change each.
- Write clear commit messages in imperative mood:
  - Good: `Add input validation for restaurant creation`
  - Avoid: `changes`, `fix stuff`
- Reference issue IDs when applicable.
- Never commit generated artifacts unless intentionally versioned.

### Recommended commit format

```text
<type>: <short summary>

<body (optional)>

<footer (optional)>
```

Common `type` values: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`.

## 3. Pull Request (PR) Standards

- Keep PRs focused and reasonably small.
- Include:
  - problem statement
  - approach/solution summary
  - testing evidence
  - screenshots or logs for UX/behavioral changes
- Link related issues (`Closes #123`) where relevant.
- Prefer draft PRs for early feedback.

## 4. Code Review Practices

- Review for correctness, readability, security, and maintainability.
- Be specific and constructive in feedback.
- Approve only when you understand impact and test coverage.
- Authors should respond to every review thread.

## 5. Syncing and Conflict Management

- Pull frequently from default branch.
- Prefer rebasing feature branches for linear history when team policy allows.
- Resolve conflicts locally; re-run tests after conflict resolution.
- Avoid force-push on shared branches unless coordinated.

## 6. Protected Branches and Policy Controls

Enable branch protections on default branch:

- Require pull request before merge
- Require status checks to pass
- Require at least one reviewer
- Require conversation resolution before merge
- Restrict direct pushes to protected branches

## 7. CI/CD Integration

- Run tests, lint, formatting, and security checks in CI on every PR.
- Block merges when required checks fail.
- Keep pipelines fast and deterministic.
- Cache dependencies carefully to reduce build time.

## 8. Release and Versioning

- Use semantic versioning where applicable.
- Tag releases (`vX.Y.Z`) from stable commits.
- Maintain release notes with user-impacting changes.
- Prefer automated changelog generation from PR labels/titles.

## 9. Security and Secrets Hygiene

- Never commit secrets, keys, tokens, or credentials.
- Use `.gitignore` and secret scanning tools.
- Rotate credentials immediately if leaked.
- Enable GitHub secret scanning and Dependabot alerts.

## 10. Repository Hygiene

- Keep README current (setup, run, test, deploy basics).
- Document architecture decisions and conventions.
- Archive or remove stale branches regularly.
- Keep issue labels and templates organized.

## 11. GitHub Collaboration Features

- Use issue templates for bugs/features.
- Use PR templates to standardize reviews.
- Use CODEOWNERS for ownership and reviewer routing.
- Use Discussions for open-ended design and support topics.

## 12. Practical Do/Don’t

### Do

- Commit early and often (with quality)
- Write tests with functional changes
- Keep PR discussions technical and respectful
- Automate repetitive quality checks

### Don’t

- Push directly to protected/default branches
- Mix refactors and behavior changes in one PR without need
- Merge failing PR checks
- Leave long-lived branches stale for weeks

## Quick Checklist

Before opening or merging a PR:

- [ ] Branch is up to date with default branch
- [ ] Commits are clean and meaningful
- [ ] Tests/lint/security checks pass
- [ ] PR description explains what and why
- [ ] Required reviewers approved
- [ ] No secrets or sensitive data included
