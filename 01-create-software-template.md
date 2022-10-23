# Create Software Templates

Backstage allows you to have your own software template with scaffolding and all
the actions you'd like to take when a new service is created.

## Hello World

Backstage allows you to define software templates together with the code
scaffolding that will be used in the initial commit of the Git repo it creates.
We'll create a hello world template to get a taste of what it does and how.

We can have the templates as part of the Backstage app and when we run `yarn
build` they would be included. But in order to create and add them step by step,
we will create a Github repository for Backstage to pull the templates from.

Create a new repository in Github called and have a `templates` folder in it
with a new folder called `00-only-github`.
```bash
# We are in https://github.com/muvaf/cloud-native-heroku
mkdir -p templates/00-only-github
```

We'll create the following template object which just creates a repo and
bootstraps it with the content in `skeleton` folder.
```yaml
# Content of templates/00-only-github/skeleton/template.yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: hello-world-on-kubernetes
  title: Hello World on Kubernetes
spec:
  owner: muvaf/kubecon-na-2022
  type: service

  parameters:
    - title: Provide metadata
      required:
        - serviceName
        - owner
      properties:
        serviceName:
          title: Service Name
          type: string
          description: Unique name of the component
          ui:field: EntityNamePicker
        owner:
          title: Owner
          type: string
          description: Owner of the component
          ui:field: OwnerPicker
          ui:options:
            allowedKinds:
              - Group
    - title: Choose a location
      required:
        - repoUrl
      properties:
        repoUrl:
          title: Repository Location
          type: string
          ui:field: RepoUrlPicker
          ui:options:
            allowedHosts:
              - github.com

  steps:
    - id: fetch-base
      name: Fetch Base
      action: fetch:template
      input:
        url: ./skeleton
        values:
          serviceName: ${{ parameters.serviceName }}
          owner: ${{ parameters.owner }}
          githubRepositoryOrg: ${{ (parameters.repoUrl | parseRepoUrl).owner }}
          githubRepositoryName: ${{ (parameters.repoUrl | parseRepoUrl).repo }}

    - id: publish
      name: Publish
      action: publish:github
      input:
        allowedHosts: ['github.com']
        description: This is ${{ parameters.serviceName }}
        repoUrl: ${{ parameters.repoUrl }}
        repoVisibility: public
        defaultBranch: main
        protectDefaultBranch: false
        requireCodeOwnerReviews: false

    - id: register
      name: Register
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps.publish.output.repoContentsUrl }}
        catalogInfoPath: '/catalog-info.yaml'
```

In `skeleton` folder, we'll have our very simple hello world application.
```bash
mkdir -p templates/00-only-github/skeleton
```

A `server.js` and `package.json` is all we need for NodeJS to work. A 
`catalog-info.yaml` for Backstage to identify the application will be there.
```yaml
# Content of templates/00-only-github/skeleton/catalog-info.yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: ${{values.serviceName | dump}}
spec:
  type: service
  lifecycle: experimental
  owner: ${{values.owner | dump}}
```
Content of `templates/00-only-github/skeleton/package.json`
```json
{
    "name": "hello-world",
    "version": "1.0.0",
    "description": "Kubecon NA demo",
    "author": "First Last <first.last@example.com>",
    "main": "server.js",
    "scripts": {
      "start": "node server.js"
    },
    "dependencies": {
      "express": "^4.16.1"
    }
  }
```
Content of `server.js`
```javascript
'use strict';

const express = require('express');

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

// App
const app = express();
app.get('/', (req, res) => {
  res.send('Hello World! My name is ${{ values.serviceName }} and my owner is ${{ values.owner }}');
});

app.listen(PORT, HOST, () => {
  console.log(`Running on http://${HOST}:${PORT}`);
});
```

Now let's create a commit and push it to our Git repo.

Visit `http://127.0.0.1:7007/catalog-import` and supply the path of
`template.yaml` in your Git repo. For example:
```
https://github.com/muvaf/cloud-native-heroku/blob/main/templates/00-only-github/template.yaml
```

When you click `Create...` on the side bar now, you'll see that there is a new
template called `Bootstrap Nodejs Repo`. Go ahead and choose it to bootstrap a
new repo.

![Hello world template for Backstage](assets/only-github-instance-created.png)

Clone this new repository and give it a try!
```bash
git clone https://github.com/muvaf/muvaftesting.git
cd muvaftesting
```
```bash
npm install
```
```bash
npm start
```

If you see a page in http://127.0.0.1:8080 , congrats! 🎉

## Add Image and Helm Chart

In this template we will add image building capabilities and a Helm chart that
can be deployed to a cluster to deploy our application.

Copy the earlier template to make changes.
```bash
cp -a templates/00-only-github templates/01-image-chart
```

Change the `metadata` of `template.yaml`
```yaml
metadata:
  name: hello-world-on-kubernetes
  title: Hello World on Kubernetes
```

Create a `Dockerfile` for our image.
```dockerfile
# Content of templates/00-only-github/skeleton/Dockerfile
FROM node:16-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY server.js .
CMD [ "node", "server.js" ]
```

Let's give it a try to make sure it's all tight.
```bash
docker build --tag hello:v0.1.0 .
```
```bash
docker run -p 8080:8080 hello:v0.1.0
```

If you see the page at http://127.0.0.1:8080, congrats! 🎉

Let's move on to adding a Helm chart.
```bash
mkdir -p templates/01-image-chart/skeleton/chart
```
It will have chart metadata and basic `Deployment` and `Service` definitions.
```bash
mkdir -p templates/01-image-chart/skeleton/chart/templates
```

As you will notice, we need to use `{% raw %}` to open and `{% endraw %}` to
close what Backstage shouldn't touch so that Helm templates are not considered.
```yaml
# Content of templates/01-image-chart/skeleton/chart/Chart.yaml
apiVersion: v2
name: ${{ values.githubRepositoryName }}-chart
description: A Helm chart for ${{ values.serviceName }} owned by ${{ values.owner }}
type: application
version: 0.1.0
appVersion: "1.16.0"
```
```yaml
# Content of templates/01-image-chart/skeleton/chart/values.yaml
image:
  # To be replaced in-place before publishing or installation.
  tag: "%%TAG%%"
```
```yaml
# Content of templates/01-image-chart/skeleton/chart/templates/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: hello-world
spec:
  selector:
    app: hello-world
  ports:
    - name: http
      port: 80
      targetPort: http
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-world
spec:
  replicas: 1
  selector:
    matchLabels:
      app: hello-world
  template:
    metadata:
      labels:
        app: hello-world
    spec:
      containers:
        - name: hello-world
          image: ghcr.io/${{ values.githubRepositoryOrg }}/${{ values.githubRepositoryName }}:{% raw %}{{ .Values.image.tag }}{% endraw %}
          ports:
            - name: http
```

Now we will add a `.github` folder that will contain Github Actions workflow
to build the image and Helm chart as OCI image, and then push both to Github
Container Registry (GHCR). 

Create the following file in `.github/workflows/ci.yaml`
```bash
mkdir -p templates/01-image-chart/.github/workflows
```
```yaml
# Content of templates/01-image-chart/skeleton/.github/workflows/ci.yaml
{% raw %}
name: Continuous Integration

on:
  push:
    branches: ['main']

jobs:
  ci:
    runs-on: ubuntu-20.04
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Setup QEMU
        uses: docker/setup-qemu-action@v1
        with:
          platforms: arm64

      - name: Setup Docker Buildx
        id: buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to Github Container Registry
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata (tags, labels) for Docker
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ghcr.io/${{ github.repository }}

      - name: Build and push Docker image
        id: build-push
        uses: docker/build-push-action@v3
        with:
          builder: ${{ steps.buildx.outputs.name }}
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          labels: ${{ steps.meta.outputs.labels }}
          platforms: linux/amd64,linux/arm64
      
      - name: Update the image tag in Helm chart
        env:
          IMAGE_TAG: ${{ github.sha }}
        run: sed -i "s|%%TAG%%|${IMAGE_TAG}|g" chart/values.yaml

      - name: Install Helm
        uses: azure/setup-helm@v3
        with:
          version: 'v3.10.0'

      - name: Publish Helm chart to GHCR
        env:
          IMAGE_BASE_URL: ghcr.io/${{ github.repository_owner }}
        run: |
          helm package chart --version 9.9.9
          helm push $(find . -iname '*-chart-9.9.9.tgz') oci://${IMAGE_BASE_URL}
{% endraw %}
```

Once all done, create a new commit and push it.

Add our new template to Backstage in http://127.0.0.1:7007/catalog-import
by providing the path to our new `template.yaml` file in Github.
```
https://github.com/muvaf/cloud-native-heroku/blob/main/templates/01-image-chart/template.yaml
```

Go back to creation page and try out our new software template. Once Backstage
is done, you should see a Github Action your repo running and it will result in
two container images pushed.

![Github packages example](assets/github-packages.png)

Well, let's give it a try!

Click on the chart package and get the full image path to install with Helm.
```bash
helm -n testing install helloworld oci://ghcr.io/muvaf/muvaf-kubecon-testing-chart --version 9.9.9 --create-namespace --wait
```
```bash
kubectl get pods -n testing
kubectl get services -n testing
```
```bash
kubectl port-forward --namespace=testing svc/hello-world 9090:80
```

If you see the usual page, congrats! 🎉

Clean up.
```bash
kubectl delete namespace testing
```

## Continuous Deployment with ArgoCD

We would like to deploy our application every time a new commit is pushed. We
will set up ArgoCD to deploy our Helm chart and enable auto-sync so that it
always refreshes when the digest of the chart image changes.

We need to inform ArgoCD about our Helm chart. We will do that by including a
step in our template that will create an ArgoCD `Application` object in our
cluster.

Copy the earlier template.
```bash
cp -a templates/01-image-chart templates/02-argo-deploy
```

Change the `metadata` of `template.yaml`
```yaml
metadata:
  name: hello-world-argocd
  title: Hello World with ArgoCD
```

At the time of writing, I couldn't find an action to be used to create
Kubernetes manifests. The built-in Kubernetes component is used for read-only
operations. So, we will have to write a [custom action][writing-custom-actions] 
to create an ArgoCD `Application` in the cluster that points to our Helm chart.
Since it may take too long, I wrote that custom action before the tutorial as an
NPM package that we can add to our backend package of Backstage app.

```
# From your Backstage root directory
yarn add --cwd packages/backend @muvaf/create-argocd-application
# To be able to keep using the built-in actions.
yarn add --cwd packages/backend @backstage/integration
```

We will need to register this new custom action in our backend package.
We'll initialize the built-in actions and just append ours.

The content of `packages/backend/src/plugins/scaffolder.ts` should look
like the following:
```typescript
// Content of packages/backend/src/plugins/scaffolder.ts
import { CatalogClient } from '@backstage/catalog-client';
import { createRouter, createBuiltinActions } from '@backstage/plugin-scaffolder-backend';
import { ScmIntegrations } from '@backstage/integration';
import { Router } from 'express';
import type { PluginEnvironment } from '../types';
import { createArgoCDHelmApplicationAction } from "@muvaf/create-argocd-application";

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const catalogClient = new CatalogClient({ discoveryApi: env.discovery });
  const integrations = ScmIntegrations.fromConfig(env.config);

  const builtInActions = createBuiltinActions({
    integrations,
    catalogClient,
    config: env.config,
    reader: env.reader,
  });

  const actions = [
      ...builtInActions,
    createArgoCDHelmApplicationAction()
  ]

  return await createRouter({
    actions,
    catalogClient,
    logger: env.logger,
    config: env.config,
    database: env.database,
    reader: env.reader,
    identity: env.identity,
  });
}
```

Let's give it a quick try!
```bash
yarn dev
```

Go to http://localhost:3000/create/actions and scroll down to the bottom to see
if your new custom action appears. If you see it, congrats! 🎉


Lastly, we need to give permissions to Backstage to create `Application` in our
namespace.
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: argocd-application-manager
  namespace: heroku
rules:
- apiGroups: ["argoproj.io"]
  resources: ["applications"]
  verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: backstage-argocd
  namespace: heroku
subjects:
- kind: ServiceAccount
  name: backstage
roleRef:
  kind: Role
  name: argocd-application-manager
  apiGroup: rbac.authorization.k8s.io
```

Since we made a code change, we'll need to re-build our app and deploy it to
cluster.
```bash
yarn build
yarn build-image --tag muvaf/backstage-demo:v0.1.0
kind load docker-image muvaf/backstage-demo:v0.1.0
```
```bash
kubectl -n heroku delete HEROKU_POD_NAME
```

Wait till it terminates successfully and the new one is in `Running` state. Then
forward the port again:
```
kubectl port-forward --namespace=heroku svc/backstage 7007:80
```

The custom action is there but it's not used by any template. We will edit our
template to contain a step that calls our custom action. Add the following right
before the last step:
```yaml
# Addition to templates/02-argo-deploy/template.yaml
    - id: argocd-create
      name: Create ArgoCD Application
      action: argocd:create-helm-application
      input:
        name: ${{ parameters.serviceName }}
        namespace: ${{ parameters.serviceName }}
        chart:
          name: ${{ (parameters.repoUrl | parseRepoUrl).repo }}
          repo: ghcr.io/${{ (parameters.repoUrl | parseRepoUrl).owner }}-chart
          version: 0.1.0
```

Commit your changes and add the path of your new `template.yaml` to our
Backstage app through `Register existing component` button.

Create a new service using our shiny new `Hello World with ArgoCD` template and
you'll see the following happening:
* Git repo created.
* Image and chart are pushed to GHCR.
* ArgoCD fetches the chart and deploys it to your cluster.
* Your application is accessible!

If all things above happened, congratulate yourself! 🎉


[writing-custom-actions]: https://backstage.io/docs/features/software-templates/writing-custom-actions

