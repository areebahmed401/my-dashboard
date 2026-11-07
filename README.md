# My Dashboard

Personal work dashboard (Study, Job Search, German, Claude, Calendar). Vite + React + Tailwind, deployed to GitHub Pages.

## Claude queue

The Claude tab holds tasks for Claude. Tasks marked "Claude may run this unattended" are picked up by the weekday morning run (`dashboard:next-task` in batch mode).
- Only priority 1–2 tasks with a brief and acceptance criteria qualify, at most 2 per run.
- Each finished task ends in **Review** with a result line (for code, a PR link); tasks needing a decision end in **Blocked**.
- Only the user marks tasks as done.
