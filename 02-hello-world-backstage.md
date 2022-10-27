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

Create a new repository in Github called `kubecon-templates`. Clone and
initialize the repo with the given commands in the Github UI.


Create a new folder called `templates/02-hello-world`.
```bash
# We are in https://github.com/muvaf/cloud-native-heroku
mkdir -p templates/02-hello-world
```

We'll create the following template object which just creates a repo and
bootstraps it with the content in `skeleton` folder.
```yaml
# Content of templates/02-hello-world/template.yaml
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
mkdir -p templates/02-hello-world/skeleton
```

A `server.js` and `package.json` is all we need for NodeJS to work. A 
`catalog-info.yaml` for Backstage to identify the application will be there.
```yaml
# Content of templates/02-hello-world/skeleton/catalog-info.yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: ${{values.serviceName | dump}}
spec:
  type: service
  lifecycle: experimental
  owner: ${{values.owner | dump}}
```
Content of `templates/02-hello-world/skeleton/package.json`
```json
{
  "name": "hello-world",
  "version": "1.0.0",
  "description": "Kubecon NA demo",
  "author": "First Last <first.last@example.com>",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  }
}
```
Content of `templates/02-hello-world/skeleton/server.js`
```javascript
const http = require('http');
const port = process.env.PORT || 8080

const requestListener = function (req, res) {
  res.writeHead(200);
  res.end('Hello World! My name is ${{ values.serviceName }} and my owner is ${{ values.owner }}');
}

const server = http.createServer(requestListener);
server.listen(port);
```

Now let's create a commit and push it to our Git repo.

```bash
git init
git add .
git commit "initial-template"
git remote add origin git@github.com:muvaf/kubecon-templates.git
git branch -M main
git push -u origin main
```

Visit `http://127.0.0.1:7007/catalog-import` and supply the path of
`template.yaml` in your Git repo. For example:
```
https://github.com/muvaf/cloud-native-heroku/blob/main/templates/02-hello-world/template.yaml
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
npm start
```

If you see a page in http://127.0.0.1:8080 , congrats! 🎉
