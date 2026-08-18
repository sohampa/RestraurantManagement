# Terraform Best Practices

This document captures practical Terraform best practices for building secure, maintainable, and predictable infrastructure.

## 1. Project and Module Structure

- Use a clear folder layout:
  - `environments/` for environment-specific root modules (`dev`, `staging`, `prod`)
  - `modules/` for reusable child modules
- Keep root modules thin; move reusable logic into versioned modules.
- Use one state file per environment/workload boundary to reduce blast radius.

## 2. State Management

- Always use a **remote backend** (for team use), never local state in shared workflows.
- Enable state locking to prevent concurrent writes.
- Protect state storage with encryption at rest and strict IAM policies.
- Never commit `terraform.tfstate` or backup files to Git.
- Use separate backends (or state keys) per environment.

## 3. Provider and Terraform Version Pinning

- Pin Terraform version in `required_version`.
- Pin provider versions in `required_providers` with explicit constraints.
- Upgrade providers intentionally and test in non-production first.

Example:

```hcl
terraform {
  required_version = ">= 1.7.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

## 4. Variables and Outputs

- Define every input variable with:
  - `description`
  - explicit `type`
  - sensible defaults only when truly optional
- Add validation rules for critical inputs.
- Mark secrets as `sensitive = true`.
- Expose minimal outputs; avoid leaking secret values.

## 5. Naming and Tagging Standards

- Use deterministic naming conventions for resources.
- Centralize common tags/labels (owner, environment, cost-center, app).
- Avoid random suffixes unless required by provider constraints.

## 6. Keep Code Declarative and Readable

- Prefer straightforward expressions over heavily nested dynamic logic.
- Use `locals` to simplify repeated expressions.
- Keep modules focused; each module should do one thing well.
- Add comments for non-obvious decisions, not obvious syntax.

## 7. Security Best Practices

- Follow least-privilege IAM principles for Terraform execution roles.
- Never hardcode credentials; use workload identity, role assumption, or secure CI secrets.
- Scan IaC for security misconfigurations in CI (e.g., tfsec/checkov).
- Treat secret management as external concern (Vault/Secrets Manager/etc.).

## 8. Planning and Applying Safely

- Run `terraform fmt -check`, `terraform validate`, and linting in CI.
- Review plans before apply; avoid blind auto-apply in production.
- Save plan artifacts (`terraform plan -out`) and apply only reviewed plans.
- Use targeted applies (`-target`) only for exceptional recovery scenarios.

## 9. Drift and Lifecycle Management

- Detect drift regularly with scheduled `terraform plan`.
- Import pre-existing resources explicitly before management.
- Use lifecycle rules (`prevent_destroy`) carefully for critical resources.
- Avoid frequent use of `ignore_changes`; document every exception.

## 10. Testing and Promotion

- Validate modules with automated tests where possible.
- Promote changes environment-by-environment (dev → staging → prod).
- Use pull requests and mandatory reviews for infrastructure code.

## 11. Team Workflow

- Standardize commands via Makefile or task runner.
- Use pre-commit hooks (`fmt`, lint, docs generation) for consistency.
- Keep module READMEs updated with inputs/outputs/examples.
- Generate docs automatically (e.g., terraform-docs) as part of CI.

## 12. Anti-Patterns to Avoid

- Large monolithic root modules spanning unrelated systems.
- Unpinned providers and Terraform versions.
- Manual console changes to managed resources without follow-up reconciliation.
- Storing secrets in `.tfvars` committed to source control.

## Quick Checklist

Before merging Terraform changes, verify:

- [ ] Formatting and validation pass
- [ ] Providers/Terraform versions are pinned
- [ ] Plan reviewed by a second engineer
- [ ] State backend/locking/encryption are configured
- [ ] Security scanning passed
- [ ] Module/docs updates included where relevant
