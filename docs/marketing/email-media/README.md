# Email media (media.vault-it.co)

Images that e-mail signatures and templates load: the three animated footers (`*-footer.gif`, with a still `*-footer.png` of frame one) and `founder.jpg`.
They are built by `../founder-email/build.js` and served by a small Worker of their own, `vault-it-email-media`, so they stay up whatever happens to the site.

Deploy after a rebuild (Git Bash):

    cd ~/Projects/Vault-It/docs/marketing/email-media
    npx wrangler deploy

Mail clients cache images, so a changed footer can take a day to show everywhere. To force it, rename the file and the signatures that use it.
