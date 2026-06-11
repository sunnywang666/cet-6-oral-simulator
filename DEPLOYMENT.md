# Deployment

## Recommended Clean Flow

1. Confirm the app builds locally.

```bash
npm run build
```

2. Push the cleaned project to a new GitHub repository.

```bash
git remote set-url origin https://github.com/<owner>/<new-repo>.git
git push -u origin main
```

3. Choose one deployment target only.

- Static hosting: upload `dist/` after `npm run build`.
- Server hosting with Nginx: copy the contents of `dist/` into the Nginx web root.
- GitHub Pages subpath: set `VITE_BASE_PATH=/<repo-name>/` during build.

## Server Checklist

- Domain DNS points to the real server public IP.
- Ports `80` and `443` are open.
- Nginx serves the same directory that receives the built files.
- `index.html` references `/assets/...` for root-domain deployment.
- The deployed `assets/` directory contains the JS file referenced by `index.html`.

## Avoid

- Multiple workflows deploying to different places on the same push.
- Committing `dist.zip`, `*.base64`, generated upload command files, or temporary transfer scripts.
- Requiring API keys just to run `npm run build`.
