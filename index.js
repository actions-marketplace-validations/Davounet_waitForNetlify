const core = require('@actions/core')
const github = require('@actions/github')
const fetch = require('node-fetch')

/**
 * Waits for the targeted deploy to appear in netlify api
 * @param {string} siteId - The uuid of the netlify site
 * @param {string} sha - The sha hash of the commit
 * @param {string} [context] - The targeted context (production, branch-deploy or deploy-preview)
 * @returns {Object}  Returns the deploy object from the api
 */
async function waitForDeployCreated(siteId, sha, context) {
  core.info('Waiting for the deploy object to be created')
  const timeout = 60
  const delay = 5
  const retries = Math.floor(timeout / delay)

  const handler = async () => {
    const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
      headers: { Authorization: `Bearer ${process.env.NETLIFY_AUTH_TOKEN}` }
    })
    const deploys = await response.json()
    const deploy = deploys.find(d => d.commit_ref === sha && (!context || d.context === context))

    if (deploy) {
      core.info(`The deployment has been created and has id ${deploy.id}`)
      core.info(`The related url is ${deploy.deploy_ssl_url}`)
      core.info('')
      return deploy
    }
    core.warning('Deploy not available yet')
    throw new Error('deploy not available yet')
  }

  return delayedRetry(handler, delay * 1000, retries)
}

/**
 * Waits for the targeted deploy to be done
 * @param {string} siteId - The uuid of the netlify site
 * @param {string} deployId - The id of the netlify deploy object
 */
async function waitForDeployReady(siteId, deployId) {
  core.info(`Waiting for the deploy ${deployId} to finish`)
  const timeout = 60 * 15
  const delay = 15
  const retries = Math.floor(timeout / delay)

  const handler = async () => {
    const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys/${deployId}`, {
      headers: { Authorization: `Bearer ${process.env.NETLIFY_AUTH_TOKEN}` }
    })
    const deploy = await response.json()

    if (['ready', 'error'].includes(deploy.state)) {
      core.info('The deployment has finished')
      core.info('')
      return
    }
    core.warning('Deploy not finished yet')
    throw new Error('deploy still ongoing')
  }

  return delayedRetry(handler, delay * 1000, retries)
}

/**
 * Waits for the targeted url to be accessible
 * @param {string} url - The url of the netlify deploy
 */
async function waitForUrlAccessible(url) {
  core.info(`Waiting for the url ${url} to be accessible`)
  const timeout = 60
  const delay = 10
  const retries = Math.floor(timeout / delay)

  const handler = async () => await fetch(url)

  return delayedRetry(handler, delay * 1000, retries)
}

async function run() {
  try {
    const siteId = core.getInput('site_id')
    const context = core.getInput('context')
    const netlifyAuthToken = process.env.NETLIFY_AUTH_TOKEN
    const sha = github.context.eventName === 'pull_request' ? github.context.payload.pull_request.head.sha : github.context.sha

    if (!sha) return core.setFailed('The commit could not be determined from action context')
    if (!siteId) return core.setFailed('The `site_id` parameter is required and was not provided')
    if (!netlifyAuthToken) return core.setFailed('The `NETLIFY_AUTH_TOKEN` env variable is required and was not provided')

    const deploy = await waitForDeployCreated(siteId, sha, context)
    await waitForDeployReady(siteId, deploy.id)
    await waitForUrlAccessible(deploy.deploy_ssl_url)

    core.exportVariable('deploy_id', deploy.id)
    core.exportVariable('deploy_url', deploy.deploy_ssl_url)
  } catch (error) {
    core.setFailed(typeof error === 'string' ? error : error.message)
  }
}
run()

async function wait(duration) {
  return new Promise(resolve => setTimeout(resolve, duration))
}

async function delayedRetry(action, delay, retries) {
  try {
    const result = await action()
    return result
  } catch (error) {
    if (retries === 1) return Promise.reject(error)

    await wait(delay)
    return delayedRetry(action, delay, retries - 1)
  }
}
