# Netlify Deployment Guide

## Project Type
This is a static site (no bundler/build required).

## Option A: Deploy by GitHub repo (recommended)
1. Push this folder to GitHub.
2. Open https://app.netlify.com/ and click **Add new site** -> **Import an existing project**.
3. Connect GitHub and select this repository.
4. Build settings:
   - Build command: `echo 'Static site, no build step required'`
   - Publish directory: `.`
5. Click **Deploy site**.

## Option B: Drag-and-drop deploy
1. Ensure these files are in the root: `index.html`, `app.js`, `styles.css`, `netlify.toml`.
2. Zip the project root.
3. In Netlify dashboard, drag the zip/folder to deploy.

## Camera Permission Notes
- Browser camera works only on secure origin (Netlify uses HTTPS by default).
- After opening your site, allow camera access in browser prompt.
- If camera is blocked, check browser site permission settings and reload.
