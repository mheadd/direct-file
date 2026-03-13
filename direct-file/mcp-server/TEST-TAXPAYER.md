# Test Taxpayer Data

> Ready-to-use test data for exercising the MCP server prototype through Claude Desktop or another MCP client. Copy and paste values as needed during the conversational tax filing workflow.

## Primary Filer

| Field | Value |
|:------|:------|
| First Name | Maria |
| Middle Initial | T |
| Last Name | Santos |
| Date of Birth | March 15, 1988 |
| SSN | 321-54-6789 |
| Phone | 202-555-0147 |
| Email | maria.santos@example.com |

### Address

| Field | Value |
|:------|:------|
| Street Address | 742 Evergreen Terrace |
| City | Springfield |
| State | IL |
| ZIP Code | 62704 |

## Filing Status

**Single** (no spouse, no dependents)

## W-2 Wage and Tax Statement

### Employer

| Field | Value |
|:------|:------|
| Employer Name | Acme Corporation |
| Employer EIN | 12-3456789 |

### Wages and Withholding

| Box | Description | Amount |
|:----|:------------|:-------|
| 1 | Wages, tips, other compensation | 58250.00 |
| 2 | Federal income tax withheld | 7450.00 |
| 3 | Social Security wages | 58250.00 |
| 4 | Social Security tax withheld | 3611.50 |
| 5 | Medicare wages and tips | 58250.00 |
| 6 | Medicare tax withheld | 844.63 |

### State Information (W-2 boxes 15–17)

| Field | Value |
|:------|:------|
| State | IL |
| State ID | 123-456-789 |
| State wages | 58250.00 |
| State tax withheld | 2854.25 |

## Bank Account (for refund direct deposit)

| Field | Value |
|:------|:------|
| Account Type | Checking |
| Routing Number | 071000013 |
| Account Number | 123456789 |

---

## Alternate Test Scenario: Married Filing Jointly

Use this data instead of (or in addition to) the single filer above to test a joint return with a dependent.

### Primary Filer

| Field | Value |
|:------|:------|
| First Name | James |
| Middle Initial | R |
| Last Name | Wilson |
| Date of Birth | July 22, 1985 |
| SSN | 451-23-6780 |
| Phone | 312-555-0198 |
| Email | james.wilson@example.com |

### Spouse

| Field | Value |
|:------|:------|
| First Name | Elena |
| Middle Initial | M |
| Last Name | Wilson |
| Date of Birth | November 3, 1987 |
| SSN | 452-87-6543 |

### Address (shared)

| Field | Value |
|:------|:------|
| Street Address | 1600 Oak Boulevard |
| City | Chicago |
| State | IL |
| ZIP Code | 60614-2301 |

### Filing Status

**Married Filing Jointly**

### Dependent

| Field | Value |
|:------|:------|
| First Name | Sofia |
| Last Name | Wilson |
| Date of Birth | April 10, 2018 |
| SSN | 453-12-9876 |
| Relationship | Daughter |
| Months Lived in Home | 12 |

### W-2 #1 — Primary Filer (James)

| Field | Value |
|:------|:------|
| Employer Name | Midwest Industries |
| Employer EIN | 36-7654321 |

| Box | Description | Amount |
|:----|:------------|:-------|
| 1 | Wages, tips, other compensation | 72500.00 |
| 2 | Federal income tax withheld | 9800.00 |
| 3 | Social Security wages | 72500.00 |
| 4 | Social Security tax withheld | 4495.00 |
| 5 | Medicare wages and tips | 72500.00 |
| 6 | Medicare tax withheld | 1051.25 |

### W-2 #2 — Spouse (Elena)

| Field | Value |
|:------|:------|
| Employer Name | Lakeside Medical Group |
| Employer EIN | 36-9876543 |

| Box | Description | Amount |
|:----|:------------|:-------|
| 1 | Wages, tips, other compensation | 45800.00 |
| 2 | Federal income tax withheld | 5200.00 |
| 3 | Social Security wages | 45800.00 |
| 4 | Social Security tax withheld | 2839.60 |
| 5 | Medicare wages and tips | 45800.00 |
| 6 | Medicare tax withheld | 664.10 |

### Bank Account (for refund direct deposit)

| Field | Value |
|:------|:------|
| Account Type | Savings |
| Routing Number | 071000013 |
| Account Number | 987654321 |

---

## Notes

- All data is fictional. Names, SSNs, EINs, and addresses are fabricated for testing purposes.
- SSNs follow valid formatting rules (area code ≠ 000 or 666, all segments are digits).
- Phone numbers use the 555 exchange, which is reserved for fictional use.
- The routing number (071000013) is a real Chase Bank routing number format but is used here only for structural validity in testing.
- W-2 amounts are internally consistent (e.g., Social Security tax = 6.2% of SS wages, Medicare tax = 1.45% of Medicare wages).
- The single filer scenario is simpler and good for a first test. The MFJ scenario exercises more of the interview flow (spouse, dependents, multiple W-2s).
