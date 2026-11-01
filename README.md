# SHOP.CO

Public storefront: https://kanzapro71.github.io/website-modular/

## Enable Gemini support

Deploy the backend from this repository using Render:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/KANZAPRO71/website-modular)

In Render, enter a **new** Gemini API key as `GEMINI_API_KEY` when prompted. Do not put API keys in this repository or chat.

The storefront expects the backend at `wss://shopco-gemini-orchestrator.onrender.com`. If Render assigns a different service URL, update the GitHub Actions repository variable `NEXT_PUBLIC_DUPLEX_WS_URL` to that URL (with the `wss://` scheme), then rerun the **Deploy SHOP.CO to GitHub Pages** workflow.
