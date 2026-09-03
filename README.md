# pfefferminzia

Read-only command-line access to the inboxes available through an AgentMail API key.

The GitHub repository had no commits or files when cloned, so this minimal client was
bootstrapped from the official AgentMail documentation.

## Setup

```bash
cp .env.example .env
# Add AGENTMAIL_API_KEY to .env
uv run python read_inbox.py
```

Read at most three messages from one inbox:

```bash
uv run python read_inbox.py --inbox agent@example.com --limit 3
```

The command only calls AgentMail's list endpoints; it does not send, delete, or modify
messages.
