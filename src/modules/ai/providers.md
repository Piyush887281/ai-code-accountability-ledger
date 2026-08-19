# AI Provider Verification Record

**Provider**: Groq
**Account Tier**: Free/Paid API Access
**Primary Model**: `openai/gpt-oss-120b`
**Fallback Model**: `openai/gpt-oss-20b`

## Verification of Data Handling Terms

As per Blueprint Section 8, we must verify that the AI provider does not use our source code for training their models.

- **Source Checked**: Groq API Terms of Service & Privacy Policy (https://wow.groq.com/privacy-policy/)
- **Confirmed Terms**: Groq explicitly states that they do not use customer data (including inputs/outputs sent to the API) to train their models.
- **Verification Status**: PASSED

## Fallback Strategy

To ensure high availability without compounding costs or adding new trust boundaries, we are using a secondary model on the Groq platform (`openai/gpt-oss-20b`) as a fallback if the primary model (`openai/gpt-oss-120b`) experiences a timeout or rate limit.

This guarantees that both primary and fallback calls adhere to the exact same verified data handling policy.
