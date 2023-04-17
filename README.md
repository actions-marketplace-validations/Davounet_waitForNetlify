# Wait for Netlify

Action waiting for production, branch deploy or deploy preview to be deployed on netlify.
Uses the [Netlify API](https://docs.netlify.com/api/get-started/) to check on deployment status.

## How it works

Using your site id and an authentication token, this action will poll the Netlify API until the build related to the commit is deployed.

- It first waits for the deploy object to be available in the netlify API
- It then waits for the deploy to be finished, either built or failed
- It then waits for the deployment url to be accessible

## Environment

### `NETLIFY_AUTH_TOKEN`

**Required** — A personal access token, you can generate one [here](https://app.netlify.com/user/applications#personal-access-tokens)

## Inputs

### `site_id`

**Required** The API id of the Netlify site, accessible through the `Site settings` button.

## Outputs

### `deploy_id`

The id of the netlify deploy

### `deploy_url`

The url of the netlify deploy

## Example Recipe

```yaml
steps:
  - name: Wait for Netlify Deploy
    uses: Davounet/waitForNetlify@1.0
    id: netlifyDeploy
    with:
      site_id: 'YOUR_SITE_ID'
    env:
      NETLIFY_TOKEN: ${{ secrets.NETLIFY_TOKEN }}
# You can then use the 2 outputs like this:
# ${{ steps.netlifyDeploy.outputs.deploy_id }}
# ${{ steps.netlifyDeploy.outputs.deploy_url }}
```
