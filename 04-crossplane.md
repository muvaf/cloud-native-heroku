# Add Infrastructure

In the earlier steps, we set up a template with the basic Heroku experience;
* Create repo to deploy immediately,
* Push commit to deploy directly,
* (extra) Run in our own cluster.

Many applications require infrastructure such as databases, buckets, caches, you
name it. We will use Crossplane claims in our Helm chart to request these
resources.

We will create our own Kubernetes API for a GCP `Bucket` that is encrypted so
that everyone using our software templates can use only the golden path defined
by the platform team to get their infrastructure. Everyone will use encrypted
bucket and they won't need to have cloud credentials to provision one.


Before doing all that, let's copy our software template from the earlier step.
```bash
cp -a templates/03-argocd templates/04-crossplane
```

Change the metadata of our template.
```yaml
# Change in templates/04-crossplane/template.yaml
metadata:
  name: hello-world-with-cloud
  title: Hello World using Cloud
```


First, define our new API.
```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xbuckets.kubecon.org
spec:
  group: kubecon.org
  names:
    kind: XBucket
    plural: xbuckets
  claimNames:
    kind: Bucket
    plural: buckets
  connectionSecretKeys:
    - s3Url
  versions:
  - name: v1alpha1
    served: true
    referenceable: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          status:
            type: object
            properties:
              serviceAccountName:
                type: string
```

Let's create a `Composition` to back that API.

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: encrypted.xbuckets.kubecon.org
  labels:
    provider: gcp
spec:
  writeConnectionSecretsToNamespace: heroku
  compositeTypeRef:
    apiVersion: kubecon.org/v1alpha1
    kind: XBuckets
  resources:
    - name: bucket
      base:
        apiVersion: storage.gcp.upbound.io/v1beta1
        kind: Bucket
        spec:
          forProvider:
            location: US
            storageClass: MULTI_REGIONAL
            forceDestroy: true
    - name: serviceaccount
      base:
        apiVersion: cloudplatform.gcp.upbound.io/v1beta1
        kind: ServiceAccount
        spec:
          forProvider: {}
      patches:
        - type: CombineFromComposite
          toFieldPath: spec.forProvider.description
          policy:
            fromFieldPath: Required
          combine:
            variables:
              - fromFieldPath: spec.claimRef.namespace
              - fromFieldPath: spec.claimRef.name
            strategy: string
            string:
              fmt: "%s/%s"
        - type: ToCompositeFieldPath
          fromFieldPath: metadata.annotations[crossplane.io/external-name]
          toFieldPath: status.serviceAccountName
          policy:
            fromFieldPath: Required
    - name: serviceaccountkey
      base:
        apiVersion: cloudplatform.gcp.upbound.io/v1beta1
        kind: ServiceAccountKey
        spec:
          forProvider:
            publicKeyType: TYPE_X509_PEM_FILE
            serviceAccountIdSelector:
              matchControllerRef: true
      connectionDetails:
        - name: creds
          fromConnectionSecretKey: private_key
    - name: add-sa-to-bucket
      base:
        apiVersion: storage.gcp.upbound.io/v1beta1
        kind: BucketIAMMember
        spec:
          forProvider:
            bucketSelector:
              matchControllerRef: true
            role: roles/storage.objectAdmin
      patches:
        - type: CombineFromComposite
          toFieldPath: spec.forProvider.member
          policy:
            fromFieldPath: Required
          combine:
            variables:
              - fromFieldPath: status.serviceAccountName
            strategy: string
            string:
              fmt: "serviceAccount:%s"
```