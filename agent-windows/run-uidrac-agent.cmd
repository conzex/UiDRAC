@echo off
set UIDRAC_AGENT_CONSOLE_DIR=%~dp0console\public
cd /d "%~dp0"
node "%~dp0agent-bundle.cjs"
